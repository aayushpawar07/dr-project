package com.medexjob.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.medexjob.entity.Recruitment;
import com.medexjob.entity.VacancyRecord;
import com.medexjob.service.RecruitmentManagementService;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.*;

@RestController
@RequestMapping("/api/admin/recruitments")
public class AdminRecruitmentController {
    private final RecruitmentManagementService service;
    private final ObjectMapper objectMapper;

    public AdminRecruitmentController(RecruitmentManagementService service, ObjectMapper objectMapper) {
        this.service = service;
        this.objectMapper = objectMapper;
    }

    @PostMapping(value = "/extract", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> extract(
            @RequestPart("file") MultipartFile file,
            @RequestParam(value = "forceCreate", defaultValue = "false") boolean forceCreate
    ) {
        try {
            RecruitmentManagementService.UploadResult result = service.extractAndCreate(file, forceCreate);
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("duplicate", result.duplicate());
            body.put("created", result.created());
            body.put("message", result.duplicate() && !result.created()
                    ? "Possible duplicate recruitment found. Review the existing recruitment or upload again with forceCreate=true to create a revision."
                    : "PDF extraction complete. Review and approve the extracted vacancy rows before publishing.");
            body.put("recruitment", toResponse(result.recruitment(), true));
            return ResponseEntity.ok(body);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Unable to process recruitment PDF", "message", safeMessage(ex)));
        }
    }

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> list() {
        return ResponseEntity.ok(service.list().stream().map(r -> toResponse(r, false)).toList());
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> detail(@PathVariable UUID id) {
        try {
            return ResponseEntity.ok(toResponse(service.get(id), true));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.notFound().build();
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateRecruitment(@PathVariable UUID id, @RequestBody Map<String, Object> updates) {
        try {
            return ResponseEntity.ok(toResponse(service.updateRecruitment(id, updates), true));
        } catch (Exception ex) {
            return ResponseEntity.badRequest().body(Map.of("error", safeMessage(ex)));
        }
    }

    @PostMapping("/{id}/vacancies")
    public ResponseEntity<?> addVacancy(@PathVariable UUID id, @RequestBody Map<String, Object> values) {
        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(toVacancy(service.addVacancy(id, values)));
        } catch (Exception ex) {
            return ResponseEntity.badRequest().body(Map.of("error", safeMessage(ex)));
        }
    }

    @PutMapping("/{recruitmentId}/vacancies/{vacancyId}")
    public ResponseEntity<?> updateVacancy(
            @PathVariable UUID recruitmentId,
            @PathVariable UUID vacancyId,
            @RequestBody Map<String, Object> updates
    ) {
        try {
            return ResponseEntity.ok(toVacancy(service.updateVacancy(recruitmentId, vacancyId, updates)));
        } catch (Exception ex) {
            return ResponseEntity.badRequest().body(Map.of("error", safeMessage(ex)));
        }
    }

    @DeleteMapping("/{recruitmentId}/vacancies/{vacancyId}")
    public ResponseEntity<?> deleteVacancy(@PathVariable UUID recruitmentId, @PathVariable UUID vacancyId) {
        try {
            service.deleteVacancy(recruitmentId, vacancyId);
            return ResponseEntity.noContent().build();
        } catch (Exception ex) {
            return ResponseEntity.badRequest().body(Map.of("error", safeMessage(ex)));
        }
    }

    @PostMapping("/{recruitmentId}/vacancies/{vacancyId}/duplicate")
    public ResponseEntity<?> duplicateVacancy(@PathVariable UUID recruitmentId, @PathVariable UUID vacancyId) {
        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(toVacancy(service.duplicateVacancy(recruitmentId, vacancyId)));
        } catch (Exception ex) {
            return ResponseEntity.badRequest().body(Map.of("error", safeMessage(ex)));
        }
    }

    @PostMapping("/{id}/vacancies/bulk-update")
    public ResponseEntity<?> bulkUpdate(@PathVariable UUID id, @RequestBody BulkUpdateRequest request) {
        try {
            if (request.getIds() == null || request.getIds().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Select at least one vacancy"));
            }
            Map<String, Object> updates = request.getUpdates() == null ? Map.of() : request.getUpdates();
            List<Map<String, Object>> updated = service.bulkUpdate(id, request.getIds(), updates).stream().map(this::toVacancy).toList();
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("updatedCount", updated.size());
            body.put("vacancies", updated);
            body.put("recruitment", toResponse(service.get(id), true));
            return ResponseEntity.ok(body);
        } catch (Exception ex) {
            return ResponseEntity.badRequest().body(Map.of("error", safeMessage(ex)));
        }
    }

    @PostMapping("/{id}/vacancies/bulk-status")
    public ResponseEntity<?> bulkStatus(@PathVariable UUID id, @RequestBody BulkStatusRequest request) {
        try {
            if (request.getIds() == null || request.getIds().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Select at least one vacancy"));
            }
            if (request.getStatus() == null || request.getStatus().isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Status is required"));
            }
            VacancyRecord.VacancyStatus status = VacancyRecord.VacancyStatus.valueOf(request.getStatus().toUpperCase(Locale.ROOT));
            RecruitmentManagementService.BulkMutationResult result = service.bulkStatus(id, request.getIds(), status);
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("updatedCount", result.updatedCount());
            body.put("skippedPublished", result.skippedPublished());
            body.put("recruitment", toResponse(result.recruitment(), true));
            return ResponseEntity.ok(body);
        } catch (Exception ex) {
            return ResponseEntity.badRequest().body(Map.of("error", safeMessage(ex)));
        }
    }

    @PostMapping("/{id}/verify")
    public ResponseEntity<?> verify(@PathVariable UUID id, @RequestBody(required = false) Map<String, Object> body, Authentication auth) {
        try {
            String verifier = body == null ? null : Objects.toString(body.get("verifiedBy"), null);
            if ((verifier == null || verifier.isBlank()) && auth != null) verifier = auth.getName();
            return ResponseEntity.ok(toResponse(service.verify(id, verifier), true));
        } catch (Exception ex) {
            return ResponseEntity.badRequest().body(Map.of("error", safeMessage(ex)));
        }
    }

    @PostMapping("/{id}/publish-all")
    public ResponseEntity<?> publishAll(@PathVariable UUID id, Authentication auth) {
        try {
            String email = auth == null ? null : auth.getName();
            RecruitmentManagementService.PublishResult result = service.publishApproved(id, email);
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("publishedCount", result.publishedCount());
            body.put("failedCount", result.failedCount());
            body.put("failures", result.failures());
            body.put("vacancyTotalMatches", result.vacancyTotalMatches());
            body.put("recruitment", toResponse(result.recruitment(), true));
            if (result.failedCount() > 0) {
                body.put("message", result.publishedCount() + " published, " + result.failedCount() + " failed. Retry is safe and will not duplicate successful jobs.");
            }
            return ResponseEntity.ok(body);
        } catch (Exception ex) {
            return ResponseEntity.badRequest().body(Map.of("error", safeMessage(ex)));
        }
    }

    @GetMapping("/{id}/export")
    public ResponseEntity<?> export(@PathVariable UUID id, @RequestParam(defaultValue = "csv") String format) {
        try {
            Recruitment r = service.get(id);
            return switch (format.toLowerCase(Locale.ROOT)) {
                case "json" -> file(objectMapper.writerWithDefaultPrettyPrinter().writeValueAsBytes(toResponse(r, true)),
                        "application/json", "recruitment-" + id + ".json");
                case "xlsx", "excel" -> file(toExcel(r),
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "recruitment-" + id + ".xlsx");
                default -> file(toCsv(r).getBytes(StandardCharsets.UTF_8), "text/csv", "recruitment-" + id + ".csv");
            };
        } catch (Exception ex) {
            return ResponseEntity.badRequest().body(Map.of("error", safeMessage(ex)));
        }
    }

    private ResponseEntity<byte[]> file(byte[] bytes, String contentType, String filename) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType(contentType));
        headers.setContentDisposition(ContentDisposition.attachment().filename(filename).build());
        return new ResponseEntity<>(bytes, headers, HttpStatus.OK);
    }

    private String toCsv(Recruitment r) {
        StringBuilder out = new StringBuilder();
        out.append("Post,Department,Speciality,Sub-speciality,Category,Vacancies,Qualification,Experience,Salary,Status,Confidence\n");
        for (VacancyRecord v : r.getVacancies()) {
            out.append(csv(v.getPostName())).append(',').append(csv(v.getDepartment())).append(',')
                    .append(csv(v.getSpeciality())).append(',').append(csv(v.getSubSpeciality())).append(',')
                    .append(csv(v.getCategory())).append(',').append(v.getNumberOfVacancies()).append(',')
                    .append(csv(v.getQualification())).append(',').append(csv(v.getExperience())).append(',')
                    .append(csv(v.getSalary())).append(',').append(v.getStatus()).append(',')
                    .append(v.getConfidenceScore() == null ? "" : v.getConfidenceScore()).append('\n');
        }
        return out.toString();
    }

    private byte[] toExcel(Recruitment r) throws Exception {
        try (XSSFWorkbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Vacancies");
            String[] headers = {"Post", "Department", "Speciality", "Sub-speciality", "Category", "Vacancies", "Qualification", "Experience", "Salary", "Status", "Confidence"};
            Row header = sheet.createRow(0);
            for (int i = 0; i < headers.length; i++) header.createCell(i).setCellValue(headers[i]);
            int rowIndex = 1;
            for (VacancyRecord v : r.getVacancies()) {
                Row row = sheet.createRow(rowIndex++);
                row.createCell(0).setCellValue(excelSafe(v.getPostName())); row.createCell(1).setCellValue(excelSafe(v.getDepartment()));
                row.createCell(2).setCellValue(excelSafe(v.getSpeciality())); row.createCell(3).setCellValue(excelSafe(v.getSubSpeciality()));
                row.createCell(4).setCellValue(excelSafe(v.getCategory())); row.createCell(5).setCellValue(v.getNumberOfVacancies() == null ? 0 : v.getNumberOfVacancies());
                row.createCell(6).setCellValue(excelSafe(v.getQualification())); row.createCell(7).setCellValue(excelSafe(v.getExperience()));
                row.createCell(8).setCellValue(excelSafe(v.getSalary())); row.createCell(9).setCellValue(v.getStatus().name());
                row.createCell(10).setCellValue(v.getConfidenceScore() == null ? 0 : v.getConfidenceScore());
            }
            for (int i = 0; i < headers.length; i++) sheet.autoSizeColumn(i);
            workbook.write(out);
            return out.toByteArray();
        }
    }

    private Map<String, Object> toResponse(Recruitment r, boolean includeVacancies) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", r.getId()); m.put("slug", r.getSlug()); m.put("organisationName", r.getOrganisationName()); m.put("title", r.getTitle());
        m.put("advertisementNumber", r.getAdvertisementNumber()); m.put("recruitmentYear", r.getRecruitmentYear());
        m.put("sector", r.getSector().name().toLowerCase(Locale.ROOT)); m.put("location", r.getLocation()); m.put("totalVacancies", r.getTotalVacancies());
        m.put("applicationStartDate", r.getApplicationStartDate()); m.put("applicationLastDate", r.getApplicationLastDate());
        m.put("applicationFee", r.getApplicationFee()); m.put("selectionProcess", r.getSelectionProcess());
        m.put("officialNotificationUrl", r.getOfficialNotificationUrl()); m.put("officialApplicationUrl", r.getOfficialApplicationUrl());
        m.put("officialWebsite", r.getOfficialWebsite()); m.put("importantInstructions", r.getImportantInstructions());
        m.put("sourcePdfName", r.getSourcePdfName()); m.put("extractionMethod", r.getExtractionMethod()); m.put("status", r.getStatus().name());
        m.put("officialSourceVerified", r.getOfficialSourceVerified()); m.put("verificationDate", r.getVerificationDate()); m.put("verifiedBy", r.getVerifiedBy());
        m.put("duplicateOf", r.getDuplicateOf()); m.put("previousVersionId", r.getDuplicateOf()); m.put("revisionNumber", r.getRevisionNumber());
        m.put("createdAt", r.getCreatedAt()); m.put("updatedAt", r.getUpdatedAt());
        if (includeVacancies) {
            List<Map<String, Object>> vacancies = r.getVacancies().stream().map(this::toVacancy).toList();
            int structuredVacancyTotal = r.getVacancies().stream()
                    .map(VacancyRecord::getNumberOfVacancies)
                    .filter(Objects::nonNull)
                    .mapToInt(Integer::intValue)
                    .sum();
            m.put("vacancies", vacancies);
            m.put("vacancyRecords", vacancies.size());
            m.put("structuredVacancyTotal", structuredVacancyTotal);
            m.put("vacancyTotalMatches", Objects.equals(r.getTotalVacancies(), structuredVacancyTotal));
            m.put("approvedVacancies", vacancies.stream().filter(v -> "APPROVED".equals(v.get("status"))).count());
            m.put("needsReview", vacancies.stream().filter(v -> "NEEDS_REVIEW".equals(v.get("status"))).count());
            m.put("publishedVacancies", vacancies.stream().filter(v -> "PUBLISHED".equals(v.get("status"))).count());
            m.put("rejectedVacancies", vacancies.stream().filter(v -> "REJECTED".equals(v.get("status"))).count());
        }
        return m;
    }

    private Map<String, Object> toVacancy(VacancyRecord v) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", v.getId()); m.put("postName", v.getPostName()); m.put("department", v.getDepartment()); m.put("speciality", v.getSpeciality());
        m.put("subSpeciality", v.getSubSpeciality()); m.put("numberOfVacancies", v.getNumberOfVacancies()); m.put("category", v.getCategory());
        m.put("qualification", v.getQualification()); m.put("experience", v.getExperience()); m.put("ageLimit", v.getAgeLimit()); m.put("salary", v.getSalary());
        m.put("payLevel", v.getPayLevel()); m.put("payScale", v.getPayScale()); m.put("jobType", v.getJobType()); m.put("location", v.getLocation());
        m.put("otherEligibilityRequirements", v.getOtherEligibilityRequirements()); m.put("confidenceScore", v.getConfidenceScore());
        m.put("status", v.getStatus().name()); m.put("slug", v.getSlug()); m.put("sourcePage", v.getSourcePage()); m.put("publishedJobId", v.getPublishedJobId());
        return m;
    }

    private String csv(String value) {
        return "\"" + excelSafe(value).replace("\"", "\"\"") + "\"";
    }
    private String excelSafe(String value) {
        String safe = n(value);
        // Prevent spreadsheet formula injection when an exported CSV/XLSX is opened
        // in Excel/LibreOffice. PDF/extracted text is untrusted input.
        if (!safe.isEmpty() && "=+-@\t\r".indexOf(safe.charAt(0)) >= 0) {
            safe = "'" + safe;
        }
        return safe;
    }
    private String n(String value) { return value == null ? "" : value; }
    private String safeMessage(Exception ex) { return ex.getMessage() == null ? ex.getClass().getSimpleName() : ex.getMessage(); }

    public static class BulkUpdateRequest {
        private List<UUID> ids;
        private Map<String, Object> updates;
        public List<UUID> getIds() { return ids; }
        public void setIds(List<UUID> ids) { this.ids = ids; }
        public Map<String, Object> getUpdates() { return updates; }
        public void setUpdates(Map<String, Object> updates) { this.updates = updates; }
    }

    public static class BulkStatusRequest {
        private List<UUID> ids;
        private String status;
        public List<UUID> getIds() { return ids; }
        public void setIds(List<UUID> ids) { this.ids = ids; }
        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }
    }
}
