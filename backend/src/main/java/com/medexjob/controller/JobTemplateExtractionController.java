package com.medexjob.controller;

import com.medexjob.service.JobTemplateExtractionService;
import com.medexjob.service.RecruitmentExtractionService;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Extraction-only endpoint for the normal Job Template.
 *
 * Unlike the admin recruitment bulk uploader this endpoint does not persist a
 * Recruitment/VacancyRecord. It only reuses the existing PDF -> OCR -> AI /
 * deterministic extraction pipeline and returns values for form autofill.
 */
@RestController
@RequestMapping("/api/jobs")
public class JobTemplateExtractionController {

    private final JobTemplateExtractionService extractionService;

    public JobTemplateExtractionController(JobTemplateExtractionService extractionService) {
        this.extractionService = extractionService;
    }

    @PostMapping(value = "/template-extract", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> extract(@RequestPart("file") MultipartFile file) {
        try {
            RecruitmentExtractionService.ExtractionPayload payload = extractionService.extract(file);
            Map<String, Object> response = new LinkedHashMap<>();
            response.put("sourcePdfName", payload.sourceFileName());
            response.put("extractionMethod", payload.result().getExtractionMethod());
            response.put("recruitment", payload.result().getRecruitment());
            response.put("vacancies", payload.result().getVacancies());
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "error", "Unable to extract the job template from this PDF",
                    "message", safeMessage(ex)
            ));
        }
    }

    private String safeMessage(Exception ex) {
        String message = ex.getMessage();
        if (message == null || message.isBlank()) return ex.getClass().getSimpleName();
        return message.length() > 300 ? message.substring(0, 300) : message;
    }
}
