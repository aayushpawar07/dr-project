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
 * The application works without it by falling back to deterministic PDF/table parsing.
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
            log.warn("AI recruitment extraction failed; deterministic parser will be used: {}", ex.getMessage());
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
                - A vacancy row must remain individually searchable. Do not collapse unrelated post/department/speciality/category rows.
                - numberOfVacancies must come from the exact vacancy/row. If the row count is missing or ambiguous, return null, never 1.
                - vacancy.location must come from that vacancy/row when the notification gives a vacancy-specific location. Do not copy a location from another row.
                - recruitment.location is only a recruitment-wide location when the document clearly states one location applies to all vacancies; otherwise use null.
                - applicationLastDate must be the actual application closing/deadline date stated by the notification. Do not infer a date and do not reuse a date from an unrelated notice/row.
                - Do not convert interview dates, advertisement dates, document-verification dates, or reporting dates into applicationLastDate.
                - Confidence is 0.0-1.0. This is extraction only; publication/verification is performed by an administrator.
                """;
    }
}
