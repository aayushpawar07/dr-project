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
        if (!enabled) {
            this.lastErrorMessage = "AI extraction is disabled (medex.ai.enabled=false)";
            return Optional.empty();
        }
        String effectiveKey = resolveApiKey();
        if (effectiveKey.isBlank()) {
            this.lastErrorMessage = "AI API key is missing. Set MEDEX_AI_API_KEY, GEMINI_API_KEY, or GOOGLE_API_KEY.";
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

            // Extract innermost JSON object cleanly
            int jsonStart = content.indexOf('{');
            int jsonEnd = content.lastIndexOf('}');
            if (jsonStart >= 0 && jsonEnd > jsonStart) {
                content = content.substring(jsonStart, jsonEnd + 1);
            } else {
                content = content.replaceFirst("^```(?:json)?\\s*", "").replaceFirst("\\s*```$", "");
            }

            RecruitmentExtractionResult result = objectMapper.readValue(content, RecruitmentExtractionResult.class);
            RecruitmentFieldSanitizer.sanitize(result);
            result.setExtractionMethod(isGemini ? "GEMINI" : "AI");
            this.lastErrorMessage = null;
            return Optional.of(result);
        } catch (org.springframework.web.client.RestClientResponseException ex) {
            this.lastErrorMessage = "AI service returned HTTP " + ex.getStatusCode().value() + ": " + ex.getResponseBodyAsString();
            log.warn("AI recruitment extraction failed with HTTP response: {}", this.lastErrorMessage);
            return Optional.empty();
        } catch (Exception ex) {
            this.lastErrorMessage = "AI recruitment extraction error (" + ex.getClass().getSimpleName() + "): " + ex.getMessage();
            log.warn("AI recruitment extraction failed; deterministic parser will be used where allowed: {}", ex.getMessage());
            return Optional.empty();
        }
    }

    private String systemPrompt() {
        return """
                You extract structured medical recruitment data from official recruitment notifications.
                Return JSON only. Never invent, assume, copy from unrelated vacancies, or default missing values; use null instead.
                Keep values tied to the vacancy/row they belong to.
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
                Card-field rules — these values appear on listing cards, so keep them short and relevant:
                - qualification: degree/diploma only (e.g. "MD/MS/DNB", "MBBS"). 3-80 characters. Never Gazette citations, NMC norms paragraphs, or "as per official notification".
                - experience: years or a specific requirement only (e.g. "3 years teaching"). If the PDF only has a generic NMC/gazette rule, use null.
                - salary: pay figure or pay level only (e.g. "Rs. 1,65,480 per month" or "Level-13"). Do not copy allowance paragraphs.
                - department, speciality, postName: the name only. Never append eligibility, gazette, or NMC text.
                - officialWebsite, officialNotificationUrl, officialApplicationUrl: extract any official website, notification link, or online application link found in the PDF. Normalize to start with https:// if possible.
                - Put NMC norms, Gazette of India wording, long eligibility notes, and common rules into importantInstructions and jobDescription only.
                Description rules — generate recruitment.jobDescription using exactly these section headings so the website can split them into tabs. Use a blank line between sections. Use "Label: Value" for facts. Use "- " bullets for lists. Do not use markdown tables, STEP 1/2/3, or long paragraphs. Do not invent facts that are not in THIS PDF. Omit a section only if the PDF has no information for it. Do not include website or PDF links:
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

                RESPONSIBILITIES
                - ...
                - ...

                APPLICATION PROCESS
                Mode of Application: ...
                Application Start Date: YYYY-MM-DD
                Last Date to Apply: YYYY-MM-DD
                Application Fee: ...

                SELECTION PROCESS
                - ...

                DOCUMENTS REQUIRED
                - ...
                - ...

                IMPORTANT NOTES
                - ...

                CONTACT INFORMATION
                Email: ...
                Phone: ...
                - jobDescription must be useful and specific from THIS PDF: not a one-line stub, not a dump of the whole notice.
                - For multi-post notices, write one shared description for the recruitment; vacancy-specific degree/pay stay in vacancy fields.
                Other extraction rules:
                - Extract every genuine vacancy row/post from the notification. Do not merge unrelated rows.
                - Keep post, department, speciality, category, location and vacancy count associated with the exact row they came from.
                - numberOfVacancies must come from the exact vacancy/row. If missing or ambiguous, return null, never 1.
                - If a table has category-wise counts, keep category-wise rows separate when needed so totals stay accurate.
                - vacancy.location must come from that vacancy/row when the notification gives a vacancy-specific location. Do not copy a location from another row.
                - recruitment.location is only a recruitment-wide location when the document clearly states one location applies to all vacancies; otherwise use null.
                - applicationLastDate must be the actual application closing/deadline date. Never infer or manufacture a date.
                - Do not use advertisement dates, interview dates, reporting dates, exam dates, document-verification dates, or unrelated dates as applicationLastDate.
                - Never fill missing fields from common knowledge, previous notices, examples, or another vacancy in the same PDF.
                - totalVacancies should reflect the notification total only when explicitly stated or safely sum-able from extracted vacancy rows.
                - confidenceScore is 0.0-1.0 and should be lower for ambiguous/OCR-damaged rows.
                - This is extraction only; an administrator reviews the result before publishing.
                """;
    }
}
