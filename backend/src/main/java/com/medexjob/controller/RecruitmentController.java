package com.medexjob.controller;

import com.medexjob.entity.Recruitment;
import com.medexjob.entity.VacancyRecord;
import com.medexjob.repository.RecruitmentRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/recruitments")
public class RecruitmentController {
    private final RecruitmentRepository repository;

    public RecruitmentController(RecruitmentRepository repository) {
        this.repository = repository;
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> byId(@PathVariable String id) {
        return resolve(id)
                .filter(r -> r.getStatus() == Recruitment.RecruitmentStatus.PUBLISHED)
                .map(r -> ResponseEntity.ok(toResponse(r)))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/slug/{slug}")
    public ResponseEntity<?> bySlug(@PathVariable String slug) {
        return repository.findBySlugWithVacancies(slug)
                .filter(r -> r.getStatus() == Recruitment.RecruitmentStatus.PUBLISHED)
                .map(r -> ResponseEntity.ok(toResponse(r)))
                .orElse(ResponseEntity.notFound().build());
    }

    private Optional<Recruitment> resolve(String idOrSlug) {
        try {
            return repository.findByIdWithVacancies(UUID.fromString(idOrSlug));
        } catch (IllegalArgumentException ignored) {
            return repository.findBySlugWithVacancies(idOrSlug);
        }
    }

    private Map<String, Object> toResponse(Recruitment r) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", r.getId()); m.put("slug", r.getSlug()); m.put("title", r.getTitle()); m.put("organisationName", r.getOrganisationName());
        m.put("advertisementNumber", r.getAdvertisementNumber()); m.put("recruitmentYear", r.getRecruitmentYear());
        m.put("sector", r.getSector().name().toLowerCase(Locale.ROOT));
        m.put("location", r.getLocation()); m.put("totalVacancies", r.getTotalVacancies());
        m.put("applicationStartDate", r.getApplicationStartDate()); m.put("applicationLastDate", r.getApplicationLastDate());
        m.put("applicationFee", r.getApplicationFee()); m.put("selectionProcess", r.getSelectionProcess());
        m.put("importantInstructions", r.getImportantInstructions());
        m.put("officialNotificationUrl", r.getOfficialNotificationUrl()); m.put("officialApplicationUrl", r.getOfficialApplicationUrl());
        m.put("officialWebsite", r.getOfficialWebsite()); m.put("officialSourceVerified", r.getOfficialSourceVerified());
        m.put("revisionNumber", r.getRevisionNumber()); m.put("previousVersionId", r.getDuplicateOf());
        m.put("vacancies", r.getVacancies().stream().filter(v -> v.getStatus() == VacancyRecord.VacancyStatus.PUBLISHED).map(this::vacancy).toList());
        return m;
    }

    private Map<String, Object> vacancy(VacancyRecord v) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", v.getId()); m.put("slug", v.getSlug()); m.put("postName", v.getPostName()); m.put("department", v.getDepartment());
        m.put("speciality", v.getSpeciality()); m.put("subSpeciality", v.getSubSpeciality()); m.put("numberOfVacancies", v.getNumberOfVacancies());
        m.put("category", v.getCategory()); m.put("qualification", v.getQualification()); m.put("experience", v.getExperience());
        m.put("ageLimit", v.getAgeLimit()); m.put("salary", v.getSalary()); m.put("payLevel", v.getPayLevel()); m.put("payScale", v.getPayScale());
        m.put("jobType", v.getJobType()); m.put("location", v.getLocation());
        m.put("otherEligibilityRequirements", v.getOtherEligibilityRequirements()); m.put("sourcePage", v.getSourcePage());
        m.put("publishedJobId", v.getPublishedJobId());
        return m;
    }
}
