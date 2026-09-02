package com.medexjob.service;

import com.medexjob.dto.recruitment.RecruitmentExtractionResult;
import com.medexjob.entity.Job;
import com.medexjob.entity.Recruitment;
import com.medexjob.entity.VacancyRecord;
import com.medexjob.repository.RecruitmentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDate;
import java.util.List;
import java.util.Locale;
import java.util.NoSuchElementException;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

@Service
public class BulkRecruitmentUploadService {
    private final BulkGeminiRecruitmentExtractionService extractionService;
    private final RecruitmentRepository recruitmentRepository;

    public BulkRecruitmentUploadService(
            BulkGeminiRecruitmentExtractionService extractionService,
            RecruitmentRepository recruitmentRepository
    ) {
        this.extractionService = extractionService;
        this.recruitmentRepository = recruitmentRepository;
    }

    @Transactional
    public UploadResult extractAndCreate(MultipartFile file, boolean forceCreate) throws IOException {
        RecruitmentExtractionService.ExtractionPayload payload = extractionService.extract(file);
        Recruitment recruitment = mapRecruitment(payload.result(), payload.fingerprint(), payload.sourceFileName());

        Optional<Recruitment> duplicate = findPossibleDuplicate(recruitment, payload.fingerprint());
        if (duplicate.isPresent() && !forceCreate) {
            Recruitment existing = recruitmentRepository.findByIdWithVacancies(duplicate.get().getId())
                    .orElseThrow(() -> new NoSuchElementException("Duplicate recruitment could not be loaded"));
            return new UploadResult(existing, true, false);
        }

        if (duplicate.isPresent()) {
            Recruitment existing = duplicate.get();
            recruitment.setDuplicateOf(existing.getId());
            recruitment.setRevisionNumber(Optional.ofNullable(existing.getRevisionNumber()).orElse(1) + 1);
        } else {
            recruitment.setRevisionNumber(1);
        }

        Recruitment saved = recruitmentRepository.save(recruitment);
        return new UploadResult(saved, duplicate.isPresent(), true);
    }

    private Recruitment mapRecruitment(RecruitmentExtractionResult result, String fingerprint, String fileName) {
        if (result == null || result.getRecruitment() == null) {
            throw new IllegalArgumentException("Gemini did not return recruitment metadata");
        }

        RecruitmentExtractionResult.RecruitmentData source = result.getRecruitment();
        Recruitment recruitment = new Recruitment();
        recruitment.setOrganisationName(nonBlank(source.getOrganisationName(), "Unknown Organisation"));
        recruitment.setTitle(nonBlank(source.getTitle(), "Recruitment Notification"));
        recruitment.setAdvertisementNumber(source.getAdvertisementNumber());
        recruitment.setRecruitmentYear(source.getRecruitmentYear() == null ? LocalDate.now().getYear() : source.getRecruitmentYear());
        recruitment.setSector(parseSector(source.getSector()));
        recruitment.setLocation(blankToNull(source.getLocation()));
        recruitment.setApplicationStartDate(asDate(source.getApplicationStartDate()));
        recruitment.setApplicationLastDate(asDate(source.getApplicationLastDate()));
        recruitment.setApplicationFee(blankToNull(source.getApplicationFee()));
        recruitment.setSelectionProcess(blankToNull(source.getSelectionProcess()));
        recruitment.setOfficialNotificationUrl(blankToNull(source.getOfficialNotificationUrl()));
        recruitment.setOfficialApplicationUrl(blankToNull(source.getOfficialApplicationUrl()));
        recruitment.setOfficialWebsite(blankToNull(source.getOfficialWebsite()));
        recruitment.setImportantInstructions(blankToNull(source.getImportantInstructions()));
        recruitment.setSourcePdfName(fileName);
        recruitment.setPdfFingerprint(fingerprint);
        recruitment.setExtractionMethod(result.getExtractionMethod());
        recruitment.setStatus(Recruitment.RecruitmentStatus.REVIEW);

        String suffix = fingerprint == null || fingerprint.length() < 8
                ? UUID.randomUUID().toString().substring(0, 8)
                : fingerprint.substring(0, 8);
        recruitment.setSlug(slug(recruitment.getTitle() + "-" + recruitment.getRecruitmentYear() + "-" + suffix));

        int rowIndex = 0;
        for (RecruitmentExtractionResult.VacancyData vacancy : Optional.ofNullable(result.getVacancies()).orElse(List.of())) {
            if (!hasText(vacancy.getPostName())) continue;
            if (vacancy.getNumberOfVacancies() == null || vacancy.getNumberOfVacancies() < 1) {
                throw new IllegalArgumentException(
                        "Gemini could not determine the vacancy count for '" + vacancy.getPostName() + "'. " +
                        "No default count was applied; review the PDF and retry."
                );
            }

            VacancyRecord row = new VacancyRecord();
            row.setPostName(vacancy.getPostName().trim());
            row.setDepartment(blankToNull(vacancy.getDepartment()));
            row.setSpeciality(blankToNull(vacancy.getSpeciality()));
            row.setSubSpeciality(blankToNull(vacancy.getSubSpeciality()));
            row.setNumberOfVacancies(vacancy.getNumberOfVacancies());
            row.setCategory(blankToNull(vacancy.getCategory()));
            row.setQualification(blankToNull(vacancy.getQualification()));
            row.setExperience(blankToNull(vacancy.getExperience()));
            row.setAgeLimit(blankToNull(vacancy.getAgeLimit()));
            row.setSalary(blankToNull(vacancy.getSalary()));
            row.setPayLevel(blankToNull(vacancy.getPayLevel()));
            row.setPayScale(blankToNull(vacancy.getPayScale()));
            row.setJobType(blankToNull(vacancy.getJobType()));
            row.setLocation(blankToNull(vacancy.getLocation()));
            row.setOtherEligibilityRequirements(blankToNull(vacancy.getOtherEligibilityRequirements()));
            row.setConfidenceScore(vacancy.getConfidenceScore() == null ? 0.0 : Math.max(0, Math.min(1, vacancy.getConfidenceScore())));
            row.setSourcePage(vacancy.getSourcePage());
            row.setStatus(VacancyRecord.VacancyStatus.NEEDS_REVIEW);
            row.setSlug(buildSlug(row, String.valueOf(++rowIndex)));
            recruitment.addVacancy(row);
        }

        if (recruitment.getVacancies().isEmpty()) {
            throw new IllegalArgumentException("Gemini did not extract any vacancy rows from this PDF");
        }

        int calculatedTotal = recruitment.getVacancies().stream()
                .map(VacancyRecord::getNumberOfVacancies)
                .filter(Objects::nonNull)
                .mapToInt(Integer::intValue)
                .sum();
        recruitment.setTotalVacancies(
                source.getTotalVacancies() != null && source.getTotalVacancies() > 0
                        ? source.getTotalVacancies()
                        : calculatedTotal
        );
        return recruitment;
    }

    private Optional<Recruitment> findPossibleDuplicate(Recruitment recruitment, String fingerprint) {
        Optional<Recruitment> duplicate = recruitmentRepository.findFirstByPdfFingerprintOrderByCreatedAtDesc(fingerprint);
        if (duplicate.isEmpty() && hasText(recruitment.getAdvertisementNumber())) {
            duplicate = recruitmentRepository.findFirstByAdvertisementNumberIgnoreCaseAndRecruitmentYearOrderByCreatedAtDesc(
                    recruitment.getAdvertisementNumber(), recruitment.getRecruitmentYear());
        }
        if (duplicate.isEmpty() && hasText(recruitment.getOrganisationName()) && hasText(recruitment.getTitle())) {
            duplicate = recruitmentRepository.findFirstByOrganisationNameIgnoreCaseAndTitleIgnoreCaseAndRecruitmentYearOrderByCreatedAtDesc(
                    recruitment.getOrganisationName(), recruitment.getTitle(), recruitment.getRecruitmentYear());
        }
        if (duplicate.isEmpty()
                && hasText(recruitment.getOrganisationName())
                && hasText(recruitment.getTitle())
                && recruitment.getApplicationLastDate() != null) {
            duplicate = recruitmentRepository.findFirstByOrganisationNameIgnoreCaseAndTitleIgnoreCaseAndApplicationLastDateOrderByCreatedAtDesc(
                    recruitment.getOrganisationName(), recruitment.getTitle(), recruitment.getApplicationLastDate());
        }
        return duplicate;
    }

    private Job.JobSector parseSector(String sector) {
        return sector != null && sector.equalsIgnoreCase("private") ? Job.JobSector.PRIVATE : Job.JobSector.GOVERNMENT;
    }

    private LocalDate asDate(String value) {
        if (!hasText(value)) return null;
        return LocalDate.parse(value.trim());
    }

    private String buildSlug(VacancyRecord vacancy, String suffix) {
        return slug(String.join("-", List.of(
                nonBlank(vacancy.getPostName(), "vacancy"),
                nonBlank(vacancy.getSpeciality(), nonBlank(vacancy.getDepartment(), "medical")),
                nonBlank(vacancy.getCategory(), "all"),
                suffix
        )));
    }

    private String slug(String value) {
        return Optional.ofNullable(value).orElse("")
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("(^-|-$)", "");
    }

    private String blankToNull(String value) {
        return hasText(value) ? value.trim() : null;
    }

    private String nonBlank(String value, String fallback) {
        return hasText(value) ? value.trim() : fallback;
    }

    private boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }

    public record UploadResult(Recruitment recruitment, boolean duplicate, boolean created) {}
}
