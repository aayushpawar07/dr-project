package com.medexjob.controller;

import com.medexjob.entity.Recruitment;
import com.medexjob.entity.VacancyRecord;
import com.medexjob.service.BulkRecruitmentUploadService;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;

@RestController
@RequestMapping("/api/admin/recruitments")
public class AdminBulkGeminiExtractionController {
    private final BulkRecruitmentUploadService uploadService;

    public AdminBulkGeminiExtractionController(BulkRecruitmentUploadService uploadService) {
        this.uploadService = uploadService;
    }

    @PostMapping(value = "/gemini-extract", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> extract(
            @RequestPart("file") MultipartFile file,
            @RequestParam(value = "forceCreate", defaultValue = "false") boolean forceCreate
    ) {
        try {
            BulkRecruitmentUploadService.UploadResult result = uploadService.extractAndCreate(file, forceCreate);
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("duplicate", result.duplicate());
            body.put("created", result.created());
            body.put("message", result.duplicate() && !result.created()
                    ? "Possible duplicate recruitment found. Existing recruitment loaded for review."
                    : "Gemini extraction complete. Review the extracted vacancy rows before publishing.");
            body.put("recruitment", toResponse(result.recruitment()));
            return ResponseEntity.ok(body);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", safeMessage(ex)));
        } catch (IllegalStateException ex) {
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(Map.of("error", safeMessage(ex)));
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "error", "Unable to process recruitment PDF with Gemini",
                    "message", safeMessage(ex)
            ));
        }
    }

    private Map<String, Object> toResponse(Recruitment recruitment) {
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("id", recruitment.getId());
        response.put("slug", recruitment.getSlug());
        response.put("organisationName", recruitment.getOrganisationName());
        response.put("title", recruitment.getTitle());
        response.put("advertisementNumber", recruitment.getAdvertisementNumber());
        response.put("recruitmentYear", recruitment.getRecruitmentYear());
        response.put("sector", recruitment.getSector().name().toLowerCase(Locale.ROOT));
        response.put("location", recruitment.getLocation());
        response.put("totalVacancies", recruitment.getTotalVacancies());
        response.put("applicationStartDate", recruitment.getApplicationStartDate());
        response.put("applicationLastDate", recruitment.getApplicationLastDate());
        response.put("applicationFee", recruitment.getApplicationFee());
        response.put("selectionProcess", recruitment.getSelectionProcess());
        response.put("officialNotificationUrl", recruitment.getOfficialNotificationUrl());
        response.put("officialApplicationUrl", recruitment.getOfficialApplicationUrl());
        response.put("officialWebsite", recruitment.getOfficialWebsite());
        response.put("importantInstructions", recruitment.getImportantInstructions());
        response.put("sourcePdfName", recruitment.getSourcePdfName());
        response.put("extractionMethod", recruitment.getExtractionMethod());
        response.put("status", recruitment.getStatus().name());
        response.put("officialSourceVerified", recruitment.getOfficialSourceVerified());
        response.put("verificationDate", recruitment.getVerificationDate());
        response.put("verifiedBy", recruitment.getVerifiedBy());
        response.put("duplicateOf", recruitment.getDuplicateOf());
        response.put("previousVersionId", recruitment.getDuplicateOf());
        response.put("revisionNumber", recruitment.getRevisionNumber());
        response.put("createdAt", recruitment.getCreatedAt());
        response.put("updatedAt", recruitment.getUpdatedAt());

        List<Map<String, Object>> vacancies = recruitment.getVacancies().stream().map(this::toVacancy).toList();
        int structuredTotal = recruitment.getVacancies().stream()
                .map(VacancyRecord::getNumberOfVacancies)
                .filter(Objects::nonNull)
                .mapToInt(Integer::intValue)
                .sum();
        response.put("vacancies", vacancies);
        response.put("vacancyRecords", vacancies.size());
        response.put("structuredVacancyTotal", structuredTotal);
        response.put("vacancyTotalMatches", Objects.equals(recruitment.getTotalVacancies(), structuredTotal));
        response.put("approvedVacancies", vacancies.stream().filter(v -> "APPROVED".equals(v.get("status"))).count());
        response.put("needsReview", vacancies.stream().filter(v -> "NEEDS_REVIEW".equals(v.get("status"))).count());
        response.put("publishedVacancies", vacancies.stream().filter(v -> "PUBLISHED".equals(v.get("status"))).count());
        response.put("rejectedVacancies", vacancies.stream().filter(v -> "REJECTED".equals(v.get("status"))).count());
        return response;
    }

    private Map<String, Object> toVacancy(VacancyRecord vacancy) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", vacancy.getId());
        row.put("postName", vacancy.getPostName());
        row.put("department", vacancy.getDepartment());
        row.put("speciality", vacancy.getSpeciality());
        row.put("subSpeciality", vacancy.getSubSpeciality());
        row.put("numberOfVacancies", vacancy.getNumberOfVacancies());
        row.put("category", vacancy.getCategory());
        row.put("qualification", vacancy.getQualification());
        row.put("experience", vacancy.getExperience());
        row.put("ageLimit", vacancy.getAgeLimit());
        row.put("salary", vacancy.getSalary());
        row.put("payLevel", vacancy.getPayLevel());
        row.put("payScale", vacancy.getPayScale());
        row.put("jobType", vacancy.getJobType());
        row.put("location", vacancy.getLocation());
        row.put("otherEligibilityRequirements", vacancy.getOtherEligibilityRequirements());
        row.put("confidenceScore", vacancy.getConfidenceScore());
        row.put("status", vacancy.getStatus().name());
        row.put("slug", vacancy.getSlug());
        row.put("sourcePage", vacancy.getSourcePage());
        row.put("publishedJobId", vacancy.getPublishedJobId());
        return row;
    }

    private String safeMessage(Exception ex) {
        String message = ex.getMessage();
        return message == null || message.isBlank() ? ex.getClass().getSimpleName() : message;
    }
}
