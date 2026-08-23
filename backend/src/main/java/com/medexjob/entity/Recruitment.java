package com.medexjob.entity;

import jakarta.persistence.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "recruitments", indexes = {
        @Index(name = "idx_recruitment_sector", columnList = "sector"),
        @Index(name = "idx_recruitment_status", columnList = "status"),
        @Index(name = "idx_recruitment_advertisement", columnList = "advertisement_number"),
        @Index(name = "idx_recruitment_fingerprint", columnList = "pdf_fingerprint"),
        @Index(name = "idx_recruitment_year", columnList = "recruitment_year")
})
@EntityListeners(AuditingEntityListener.class)
public class Recruitment {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "organisation_name", nullable = false, length = 250)
    private String organisationName;

    @Column(name = "title", nullable = false, length = 300)
    private String title;

    @Column(name = "advertisement_number", length = 150)
    private String advertisementNumber;

    @Column(name = "recruitment_year")
    private Integer recruitmentYear;

    @Enumerated(EnumType.STRING)
    @Column(name = "sector", nullable = false)
    private Job.JobSector sector = Job.JobSector.GOVERNMENT;

    @Column(name = "location", length = 200)
    private String location;

    @Column(name = "total_vacancies", nullable = false)
    private Integer totalVacancies = 0;

    @Column(name = "application_start_date")
    private LocalDate applicationStartDate;

    @Column(name = "application_last_date")
    private LocalDate applicationLastDate;

    @Column(name = "application_fee", columnDefinition = "TEXT")
    private String applicationFee;

    @Column(name = "selection_process", columnDefinition = "TEXT")
    private String selectionProcess;

    @Column(name = "official_notification_url", length = 1000)
    private String officialNotificationUrl;

    @Column(name = "official_application_url", length = 1000)
    private String officialApplicationUrl;

    @Column(name = "official_website", length = 1000)
    private String officialWebsite;

    @Column(name = "important_instructions", columnDefinition = "TEXT")
    private String importantInstructions;

    @Column(name = "source_pdf_name", length = 255)
    private String sourcePdfName;

    @Column(name = "pdf_fingerprint", nullable = false, length = 64)
    private String pdfFingerprint;

    @Column(name = "slug", nullable = false, length = 320)
    private String slug;

    @Column(name = "extraction_method", length = 50)
    private String extractionMethod;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private RecruitmentStatus status = RecruitmentStatus.REVIEW;

    @Column(name = "official_source_verified", nullable = false)
    private Boolean officialSourceVerified = false;

    @Column(name = "verification_date")
    private LocalDate verificationDate;

    @Column(name = "verified_by", length = 200)
    private String verifiedBy;

    @Column(name = "duplicate_of")
    private UUID duplicateOf;

    @Column(name = "revision_number")
    private Integer revisionNumber = 1;

    @OneToMany(mappedBy = "recruitment", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("createdAt ASC")
    private List<VacancyRecord> vacancies = new ArrayList<>();

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public enum RecruitmentStatus {
        REVIEW, VERIFIED, PUBLISHED, REJECTED
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getOrganisationName() { return organisationName; }
    public void setOrganisationName(String organisationName) { this.organisationName = organisationName; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getAdvertisementNumber() { return advertisementNumber; }
    public void setAdvertisementNumber(String advertisementNumber) { this.advertisementNumber = advertisementNumber; }
    public Integer getRecruitmentYear() { return recruitmentYear; }
    public void setRecruitmentYear(Integer recruitmentYear) { this.recruitmentYear = recruitmentYear; }
    public Job.JobSector getSector() { return sector; }
    public void setSector(Job.JobSector sector) { this.sector = sector; }
    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }
    public Integer getTotalVacancies() { return totalVacancies; }
    public void setTotalVacancies(Integer totalVacancies) { this.totalVacancies = totalVacancies; }
    public LocalDate getApplicationStartDate() { return applicationStartDate; }
    public void setApplicationStartDate(LocalDate applicationStartDate) { this.applicationStartDate = applicationStartDate; }
    public LocalDate getApplicationLastDate() { return applicationLastDate; }
    public void setApplicationLastDate(LocalDate applicationLastDate) { this.applicationLastDate = applicationLastDate; }
    public String getApplicationFee() { return applicationFee; }
    public void setApplicationFee(String applicationFee) { this.applicationFee = applicationFee; }
    public String getSelectionProcess() { return selectionProcess; }
    public void setSelectionProcess(String selectionProcess) { this.selectionProcess = selectionProcess; }
    public String getOfficialNotificationUrl() { return officialNotificationUrl; }
    public void setOfficialNotificationUrl(String officialNotificationUrl) { this.officialNotificationUrl = officialNotificationUrl; }
    public String getOfficialApplicationUrl() { return officialApplicationUrl; }
    public void setOfficialApplicationUrl(String officialApplicationUrl) { this.officialApplicationUrl = officialApplicationUrl; }
    public String getOfficialWebsite() { return officialWebsite; }
    public void setOfficialWebsite(String officialWebsite) { this.officialWebsite = officialWebsite; }
    public String getImportantInstructions() { return importantInstructions; }
    public void setImportantInstructions(String importantInstructions) { this.importantInstructions = importantInstructions; }
    public String getSourcePdfName() { return sourcePdfName; }
    public void setSourcePdfName(String sourcePdfName) { this.sourcePdfName = sourcePdfName; }
    public String getPdfFingerprint() { return pdfFingerprint; }
    public void setPdfFingerprint(String pdfFingerprint) { this.pdfFingerprint = pdfFingerprint; }
    public String getSlug() { return slug; }
    public void setSlug(String slug) { this.slug = slug; }
    public String getExtractionMethod() { return extractionMethod; }
    public void setExtractionMethod(String extractionMethod) { this.extractionMethod = extractionMethod; }
    public RecruitmentStatus getStatus() { return status; }
    public void setStatus(RecruitmentStatus status) { this.status = status; }
    public Boolean getOfficialSourceVerified() { return officialSourceVerified; }
    public void setOfficialSourceVerified(Boolean officialSourceVerified) { this.officialSourceVerified = officialSourceVerified; }
    public LocalDate getVerificationDate() { return verificationDate; }
    public void setVerificationDate(LocalDate verificationDate) { this.verificationDate = verificationDate; }
    public String getVerifiedBy() { return verifiedBy; }
    public void setVerifiedBy(String verifiedBy) { this.verifiedBy = verifiedBy; }
    public UUID getDuplicateOf() { return duplicateOf; }
    public void setDuplicateOf(UUID duplicateOf) { this.duplicateOf = duplicateOf; }
    public Integer getRevisionNumber() { return revisionNumber; }
    public void setRevisionNumber(Integer revisionNumber) { this.revisionNumber = revisionNumber == null || revisionNumber < 1 ? 1 : revisionNumber; }
    public List<VacancyRecord> getVacancies() { return vacancies; }
    public void setVacancies(List<VacancyRecord> vacancies) { this.vacancies = vacancies; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public void addVacancy(VacancyRecord vacancy) {
        vacancy.setRecruitment(this);
        vacancies.add(vacancy);
    }
}
