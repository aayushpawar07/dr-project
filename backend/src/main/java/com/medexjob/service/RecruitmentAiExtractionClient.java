package com.medexjob.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.medexjob.dto.recruitment.RecruitmentExtractionResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
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

    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final boolean enabled;
    private final String endpoint;
    private final String apiKey;
    private final String model;

    public RecruitmentAiExtractionClient(
            RestClient.Builder builder,
            ObjectMapper objectMapper,
            @Value("${medex.ai.enabled:false}") boolean enabled,
            @Value("${medex.ai.chat-completions-url:}") String endpoint,
            @Value("${medex.ai.api-key:}") String apiKey,
            @Value("${medex.ai.model:}") String model
    ) {
        this.restClient = builder.build();
        this.objectMapper = objectMapper;
        this.enabled = enabled;
        this.endpoint = endpoint;
        this.apiKey = apiKey;
        this.model = model;
    }

    public Optional<RecruitmentExtractionResult> extract(String pdfText) {
        if (!enabled || endpoint.isBlank() || apiKey.isBlank() || model.isBlank()) {
            return Optional.empty();
        }
        try {
            String text = pdfText.length() > MAX_TEXT_CHARS ? pdfText.substring(0, MAX_TEXT_CHARS) : pdfText;
            Map<String, Object> body = Map.of(
                    "model", model,
                    "temperature", 0,
                    "response_format", Map.of("type", "json_object"),
                    "messages", List.of(
                            Map.of("role", "system", "content", systemPrompt()),
                            Map.of("role", "user", "content", "Recruitment notification text:\n\n" + text)
                    )
            );

            String raw = restClient.post()
                    .uri(endpoint)
                    .contentType(MediaType.APPLICATION_JSON)
                    .headers(headers -> headers.setBearerAuth(apiKey))
                    .body(body)
                    .retrieve()
                    .body(String.class);

            JsonNode root = objectMapper.readTree(raw);
            String content = root.path("choices").path(0).path("message").path("content").asText();
            if (content.isBlank()) {
                return Optional.empty();
            }
            content = content.replaceFirst("^```(?:json)?\\s*", "").replaceFirst("\\s*```$", "");
            RecruitmentExtractionResult result = objectMapper.readValue(content, RecruitmentExtractionResult.class);
            result.setExtractionMethod("AI");
            return Optional.of(result);
        } catch (Exception ex) {
            log.warn("AI recruitment extraction failed; deterministic parser will be used where allowed: {}", ex.getMessage());
            return Optional.empty();
        }
    }

    private String systemPrompt() {
        return """
                You extract structured medical recruitment data from official recruitment notifications.
                Return JSON only. Never invent, assume, copy from unrelated vacancies, or default missing values; use null instead.
                Preserve wording from the notification and keep values tied to the vacancy/row they belong to.
                Required JSON shape:
                {
                  "recruitment": {
                    "organisationName": null, "title": null, "advertisementNumber": null,
                    "recruitmentYear": null, "sector": "government|private|null", "location": null,
                    "totalVacancies": null, "applicationStartDate": "YYYY-MM-DD|null",
                    "applicationLastDate": "YYYY-MM-DD|null", "applicationFee": null,
                    "selectionProcess": null, "officialNotificationUrl": null,
                    "officialApplicationUrl": null, "officialWebsite": null, "importantInstructions": null
                  },
                  "vacancies": [{
                    "postName": null, "department": null, "speciality": null, "subSpeciality": null,
                    "numberOfVacancies": null, "category": null, "qualification": null, "experience": null,
                    "ageLimit": null, "salary": null, "payLevel": null, "payScale": null,
                    "jobType": null, "location": null, "otherEligibilityRequirements": null,
                    "confidenceScore": 0.0, "sourcePage": null
                  }]
                }
                Extraction rules:
                - Extract every genuine vacancy row/post from the notification. Do not merge unrelated rows.
                - Keep post, department, speciality, category, location and vacancy count associated with the exact row they came from.
                - numberOfVacancies must come from the exact vacancy/row. If missing or ambiguous, return null, never 1.
                - If a table has category-wise counts, keep category-wise rows separate when needed so totals stay accurate.
                - vacancy.location must come from that vacancy/row when the notification gives a vacancy-specific location. Do not copy a location from another row.
                - recruitment.location is only a recruitment-wide location when the document clearly states one location applies to all vacancies; otherwise use null.
                - applicationLastDate must be the actual application closing/deadline date. Never infer or manufacture a date.
                - Do not use advertisement dates, interview dates, reporting dates, exam dates, document-verification dates, or unrelated dates as applicationLastDate.
                - Extract qualification, experience, age limit, salary/pay scale, job type and eligibility only when supported by the notification.
                - Never fill missing fields from common knowledge, previous notices, examples, or another vacancy in the same PDF.
                - totalVacancies should reflect the notification total only when explicitly stated or safely sum-able from extracted vacancy rows.
                - confidenceScore is 0.0-1.0 and should be lower for ambiguous/OCR-damaged rows.
                - This is extraction only; an administrator reviews the result before publishing.
                """;
    }
}
