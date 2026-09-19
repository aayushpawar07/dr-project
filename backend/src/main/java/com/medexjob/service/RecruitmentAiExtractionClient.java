package com.medexjob.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.medexjob.dto.recruitment.RecruitmentExtractionResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Optional AI extraction adapter using a configurable chat-completions compatible endpoint.
 * The standard extraction flow can fall back to deterministic PDF/table parsing.
 * Bulk upload enforces Gemini separately in BulkGeminiRecruitmentExtractionService.
 */
@Component
public class RecruitmentAiExtractionClient {
    private static final Logger log = LoggerFactory.getLogger(RecruitmentAiExtractionClient.class);
    private static final int MAX_TEXT_CHARS = 140_000;
    private static final int AI_CONNECT_TIMEOUT_MS = 10_000;
    private static final int AI_READ_TIMEOUT_MS = 120_000;

    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final boolean enabled;
    private final String endpoint;
    private final String apiKey;
    private final String model;
    private volatile String lastErrorMessage = "AI extraction has not run yet";

    public RecruitmentAiExtractionClient(
            RestClient.Builder builder,
            ObjectMapper objectMapper,
            @Value("${medex.ai.enabled:true}") boolean enabled,
            @Value("${medex.ai.chat-completions-url:}") String endpoint,
            @Value("${medex.ai.api-key:}") String apiKey,
            @Value("${medex.ai.model:}") String model
    ) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(AI_CONNECT_TIMEOUT_MS);
        requestFactory.setReadTimeout(AI_READ_TIMEOUT_MS);
        this.restClient = builder.requestFactory(requestFactory).build();
        this.objectMapper = objectMapper;
        this.enabled = enabled;
        this.endpoint = endpoint;
        this.apiKey = apiKey;
        this.model = model;
    }

    public String getLastErrorMessage() {
        return lastErrorMessage;
    }

    public boolean isConfigured() {
        String key = resolveApiKey();
        return enabled && !key.isBlank();
    }

    public String resolveApiKey() {
        return resolveApiKey(null);
    }

    public String resolveApiKey(String clientKey) {
        if (clientKey != null && !clientKey.isBlank()) {
            return clientKey.trim();
        }
        if (apiKey != null && !apiKey.isBlank()) {
            return apiKey.trim();
        }
        String envMedex = System.getenv("MEDEX_AI_API_KEY");
        if (envMedex != null && !envMedex.isBlank()) {
            return envMedex.trim();
        }
        String envGemini = System.getenv("GEMINI_API_KEY");
        if (envGemini != null && !envGemini.isBlank()) {
            return envGemini.trim();
        }
        String envGoogle = System.getenv("GOOGLE_API_KEY");
        if (envGoogle != null && !envGoogle.isBlank()) {
            return envGoogle.trim();
        }
        String prop = System.getProperty("medex.ai.api-key");
        if (prop != null && !prop.isBlank()) {
            return prop.trim();
        }
        return "";
    }

    public String resolveEndpoint(String effectiveKey) {
        String ep = (endpoint != null && !endpoint.isBlank()) ? endpoint.trim() : "";
        if (ep.isBlank()) {
            return "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
        }
        if (ep.contains("deepseek.com") && effectiveKey.startsWith("AIza")) {
            log.info("Detected Google Gemini API key; routing to Google Gemini chat-completions endpoint.");
            return "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
        }
        return ep;
    }

    public String resolveModel(String effectiveEndpoint) {
        String m = (model != null && !model.isBlank()) ? model.trim() : "";
        if (m.isBlank() || (effectiveEndpoint.contains("googleapis.com") && m.equalsIgnoreCase("deepseek-chat"))) {
            return "gemini-2.0-flash";
        }
        return m;
    }

    public Optional<RecruitmentExtractionResult> extract(String pdfText) {
        return extract(pdfText, null);
    }

    public Optional<RecruitmentExtractionResult> extract(String pdfText, String clientApiKey) {
        if (!enabled) {
            this.lastErrorMessage = "AI extraction is disabled (medex.ai.enabled=false)";
            return Optional.empty();
        }
        String effectiveKey = resolveApiKey(clientApiKey);
        if (effectiveKey.isBlank()) {
            this.lastErrorMessage = "AI API key is missing. Set MEDEX_AI_API_KEY, GEMINI_API_KEY, or GOOGLE_API_KEY, or provide it in the uploader.";
            log.warn(this.lastErrorMessage);
            return Optional.empty();
        }

        String targetEndpoint = resolveEndpoint(effectiveKey);
        String targetModel = resolveModel(targetEndpoint);
        boolean isGemini = targetEndpoint.contains("generativelanguage.googleapis.com");

        try {
            String text = pdfText.length() > MAX_TEXT_CHARS ? pdfText.substring(0, MAX_TEXT_CHARS) : pdfText;
            Map<String, Object> body = Map.of(
                    "model", targetModel,
                    "temperature", 0,
                    "response_format", Map.of("type", "json_object"),
                    "messages", List.of(
                            Map.of("role", "system", "content", systemPrompt()),
                            Map.of("role", "user", "content", "Recruitment notification text:\n\n" + text)
                    )
            );

            String callUri = targetEndpoint;
            if (isGemini && !callUri.contains("key=")) {
                callUri = callUri + (callUri.contains("?") ? "&" : "?") + "key=" + effectiveKey;
            }

            String raw = restClient.post()
                    .uri(callUri)
                    .contentType(MediaType.APPLICATION_JSON)
                    .headers(headers -> {
                        headers.setBearerAuth(effectiveKey);
                        if (isGemini) {
                            headers.set("x-goog-api-key", effectiveKey);
                        }
                    })
                    .body(body)
                    .retrieve()
                    .body(String.class);

            if (raw == null || raw.isBlank()) {
                this.lastErrorMessage = "AI provider returned empty response body";
                return Optional.empty();
            }

            JsonNode root = objectMapper.readTree(raw);
            String content = root.path("choices").path(0).path("message").path("content").asText();
            if (content.isBlank()) {
                this.lastErrorMessage = "AI provider returned empty content in choices[0].message.content";
                return Optional.empty();
            }

            return parseJsonResult(content, isGemini ? "GEMINI" : "AI");
        } catch (org.springframework.web.client.RestClientResponseException ex) {
            this.lastErrorMessage = "AI service returned HTTP " + ex.getStatusCode().value() + ": " + ex.getResponseBodyAsString();
            log.warn("AI recruitment extraction failed with HTTP response: {}", this.lastErrorMessage);
            return Optional.empty();
        } catch (Exception ex) {
            this.lastErrorMessage = "AI recruitment extraction error (" + ex.getClass().getSimpleName() + "): " + ex.getMessage();
            log.warn("AI recruitment extraction failed: {}", ex.getMessage());
            return Optional.empty();
        }
    }

    /**
     * Multimodal PDF extraction using Gemini's native generateContent API with inlineData.
     * This provides superior extraction for scanned PDFs, Hindi/bilingual documents,
     * legacy fonts (e.g. Kruti Dev), and complex multi-job tables.
     */
    public Optional<RecruitmentExtractionResult> extractFromPdf(byte[] pdfBytes, String fallbackText, String clientApiKey) {
        if (!enabled) {
            this.lastErrorMessage = "AI extraction is disabled (medex.ai.enabled=false)";
            return Optional.empty();
        }
        String effectiveKey = resolveApiKey(clientApiKey);
        if (effectiveKey.isBlank()) {
            this.lastErrorMessage = "Gemini API key is missing. Please configure GEMINI_API_KEY or enter your API key in the uploader.";
            log.warn(this.lastErrorMessage);
            return Optional.empty();
        }

        String targetEndpoint = resolveEndpoint(effectiveKey);
        String targetModel = resolveModel(targetEndpoint);
        boolean isGemini = targetEndpoint.contains("generativelanguage.googleapis.com");

        if (isGemini && pdfBytes != null && pdfBytes.length > 0 && pdfBytes.length <= 20 * 1024 * 1024) {
            try {
                String base64Pdf = java.util.Base64.getEncoder().encodeToString(pdfBytes);
                String geminiNativeUri = "https://generativelanguage.googleapis.com/v1beta/models/"
                        + targetModel + ":generateContent?key=" + effectiveKey;

                Map<String, Object> inlineData = Map.of(
                        "mimeType", "application/pdf",
                        "data", base64Pdf
                );
                Map<String, Object> pdfPart = Map.of("inlineData", inlineData);
                Map<String, Object> promptPart = Map.of(
                        "text", systemPrompt() + "\n\nPlease extract all recruitment and vacancy information from the attached PDF document. Return valid JSON only adhering strictly to the JSON schema."
                );

                Map<String, Object> body = Map.of(
                        "contents", List.of(
                                Map.of("parts", List.of(pdfPart, promptPart))
                        ),
                        "generationConfig", Map.of(
                                "responseMimeType", "application/json",
                                "temperature", 0.0
                        )
                );

                String raw = restClient.post()
                        .uri(geminiNativeUri)
                        .contentType(MediaType.APPLICATION_JSON)
                        .headers(headers -> headers.set("x-goog-api-key", effectiveKey))
                        .body(body)
                        .retrieve()
                        .body(String.class);

                if (raw != null && !raw.isBlank()) {
                    JsonNode root = objectMapper.readTree(raw);
                    JsonNode candidates = root.path("candidates");
                    if (candidates.isArray() && !candidates.isEmpty()) {
                        String text = candidates.get(0).path("content").path("parts").path(0).path("text").asText();
                        if (text != null && !text.isBlank()) {
                            return parseJsonResult(text, "GEMINI");
                        }
                    }
                }
                log.warn("Gemini native generateContent returned empty or unexpected response; attempting text-based fallback.");
            } catch (org.springframework.web.client.RestClientResponseException ex) {
                this.lastErrorMessage = "Gemini API HTTP " + ex.getStatusCode().value() + ": " + ex.getResponseBodyAsString();
                log.warn("Gemini multimodal PDF extraction failed: {}", this.lastErrorMessage);
            } catch (Exception ex) {
                this.lastErrorMessage = "Gemini multimodal extraction error (" + ex.getClass().getSimpleName() + "): " + ex.getMessage();
                log.warn("Gemini multimodal extraction failed: {}", ex.getMessage());
            }
        }

        // Fallback to text-based chat/completions endpoint if multimodal was not applicable or failed
        if (fallbackText != null && !fallbackText.isBlank()) {
            return extract(fallbackText, effectiveKey);
        }
        return Optional.empty();
    }

    private Optional<RecruitmentExtractionResult> parseJsonResult(String content, String method) {
        try {
            int jsonStart = content.indexOf('{');
            int jsonEnd = content.lastIndexOf('}');
            if (jsonStart >= 0 && jsonEnd > jsonStart) {
                content = content.substring(jsonStart, jsonEnd + 1);
            } else {
                content = content.replaceFirst("^```(?:json)?\\s*", "").replaceFirst("\\s*```$", "");
            }

            RecruitmentExtractionResult result = objectMapper.readValue(content, RecruitmentExtractionResult.class);
            RecruitmentFieldSanitizer.sanitize(result);
            result.setExtractionMethod(method);
            this.lastErrorMessage = null;
            return Optional.of(result);
        } catch (Exception ex) {
            this.lastErrorMessage = "Failed to parse AI JSON response: " + ex.getMessage();
            log.warn("JSON parsing error: {}", ex.getMessage());
            return Optional.empty();
        }
    }

    private String systemPrompt() {
        return """
                You extract structured medical recruitment data from official recruitment notifications.
                Return JSON only. Never invent, assume, or default missing values; use null instead.
                
                CRITICAL MULTI-JOB INSTRUCTION:
                If the notification lists multiple posts/jobs, multiple departments, or multiple vacancy rows (e.g. Senior Resident across different departments like Obs & Gynae, Surgery, Paediatrics; or distinct posts like GDMO, Medical Officer, Specialist, Manager), YOU MUST EXTRACT EVERY SINGLE JOB/POST AS A SEPARATE OBJECT in the "vacancies" array. Never combine different jobs or departments into one vacancy.
                
                CRITICAL BILINGUAL & HINDI INSTRUCTION:
                The document may be in English, Hindi, or bilingual. Understand common Indian recruitment terms:
                - "कार्यालय" = Office, "जिला स्वास्थ्य समिति" = District Health Society, "राष्ट्रीय स्वास्थ्य मिशन" = National Health Mission
                - "पदनाम" / "पद का नाम" = postName (translate/transliterate into standard English, e.g. "Medical Officer", "Senior Resident", "Specialist", "Manager")
                - "पदों की संख्या" = numberOfVacancies (extract the integer number, e.g. 03 -> 3)
                - "वांछित शैक्षिक योग्यता" / "योग्यता" = qualification (e.g. "MBBS", "MD/MS/DNB")
                - "नियत मानदेय" / "मानदेय" / "वेतन" = salary (e.g. "Rs. 1,00,000/- per month")
                - "आवेदन की अन्तिम तिथि" / "अन्तिम तिथि" = applicationLastDate (format: YYYY-MM-DD)
                - "साक्षात्कार" / "वाक इन इंटरव्यू" = selectionProcess ("Walk-in Interview")
                - "संविदा" = jobType ("Contractual")
                - "आयु सीमा" = ageLimit (e.g. "Below 45 years" or "Maximum 65 years")
                - "आरक्षण श्रेणी" / "श्रेणी" = category ("UR", "OBC", "SC", "ST", "EWS")
                - For organisationName, provide clean, readable English (e.g. "District Health Society, Hardoi (National Health Mission)", "MOIL Limited", "Sardar Vallabh Bhai Patel Hospital"). Do NOT copy phone numbers, fax, or garbled font glyphs into the organisation name.
                
                Required JSON shape:
                {
                  "recruitment": {
                    "organisationName": null, "title": null, "advertisementNumber": null,
                    "recruitmentYear": null, "sector": "government|private|null", "location": null,
                    "totalVacancies": null, "applicationStartDate": "YYYY-MM-DD|null",
                    "applicationLastDate": "YYYY-MM-DD|null", "applicationFee": null,
                    "selectionProcess": null, "officialNotificationUrl": null,
                    "officialApplicationUrl": null, "officialWebsite": null,
                    "importantInstructions": null, "jobDescription": null
                  },
                  "vacancies": [{
                    "postName": null, "department": null, "speciality": null, "subSpeciality": null,
                    "numberOfVacancies": null, "category": null, "qualification": null, "experience": null,
                    "ageLimit": null, "salary": null, "payLevel": null, "payScale": null,
                    "jobType": null, "location": null, "otherEligibilityRequirements": null,
                    "confidenceScore": 0.0, "sourcePage": null
                  }]
                }
                
                Card-field rules:
                - sector: must be "government" for any central/state government, PSU (like MOIL, SAIL, etc.), government hospital, AIIMS, NHM, district health society, or government authority. Use "private" ONLY for private companies or private hospitals.
                - qualification: degree/diploma only (e.g. "MD/MS/DNB", "MBBS"). 3-80 characters.
                - experience: years or specific requirement only (e.g. "1 year post internship in a hospital").
                - salary: pay figure, pay scale or pay level (e.g. "Rs. 1,00,000 per month" or "Rs. 50,000 - 1,60,000/-" or "Pay Matrix Level 11").
                - department, speciality, postName: the clean name only.
                - applicationFee: extract fee amount and category exemptions (e.g. "Rs. 590/- (Exempt for SC/ST/PwD)" or "Exempted / Nil / No Fee").
                - applicationLastDate: extract in YYYY-MM-DD format. If this is a Walk-in-Interview notice, set applicationLastDate to the last interview date.
                - officialWebsite, officialNotificationUrl, officialApplicationUrl: extract valid URLs (e.g. "https://www.moil.nic.in", "http://hardoi.nic.in", "https://health.delhi.gov.in"). Add https:// or http:// if missing.
                - Put NMC norms, long eligibility notes, and general conditions into importantInstructions and jobDescription only.
                
                Description rules:
                Generate recruitment.jobDescription using these section headings separated by blank lines:
                JOB DETAILS
                Post: ...
                Organisation: ...
                Department: ...
                Speciality: ...
                Location: ...
                Number of Posts: ...
                Job Type: ...
                Pay/Salary: ...

                ELIGIBILITY
                Qualification: ...
                Experience: ...
                Age Limit: ...

                APPLICATION PROCESS
                Mode of Application: ...
                Application Start Date: YYYY-MM-DD
                Last Date to Apply: YYYY-MM-DD
                Application Fee: ...

                SELECTION PROCESS
                - ...

                DOCUMENTS REQUIRED
                - ...

                IMPORTANT NOTES
                - ...

                CONTACT INFORMATION
                Email: ...
                Phone: ...
                Website: ...
                """;
    }
}
