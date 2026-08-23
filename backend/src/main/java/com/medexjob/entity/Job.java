package com.medexjob.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

@Entity
@Table(
  name = "jobs",
  indexes = {
    @Index(name = "idx_job_title", columnList = "title"),
    @Index(name = "idx_job_status", columnList = "status"),
    @Index(name = "idx_job_location", columnList = "location"),
    @Index(name = "idx_job_speciality", columnList = "speciality"),
    @Index(name = "idx_job_sector", columnList = "sector"),
    @Index(name = "idx_job_category", columnList = "category"),
    @Index(name = "idx_job_created_at", columnList = "created_at"),
    @Index(name = "idx_job_status_created", columnList = "status, created_at"),
    @Index(name = "idx_job_employer", columnList = "employer_id"),
    @Index(name = "idx_job_department", columnList = "department"),
    @Index(name = "idx_job_slug", columnList = "slug"),
    @Index(name = "idx_job_source_vacancy", columnList = "source_vacancy_id"),
  }
)
@EntityListeners(AuditingEntityListener.class)
public class Job {
  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "employer_id", nullable = false)
  private Employer employer;

  @NotBlank
  @Size(max = 200)
  @Column(name = "title", nullable = false)
  private String title;

  @NotBlank
  @Column(name = "description", columnDefinition = "TEXT", nullable = false)
  private String description;

  @Enumerated(EnumType.STRING)
  @Column(name = "sector", nullable = false)
  private JobSector sector;

  @Enumerated(EnumType.STRING)
  @Column(name = "category", nullable = false)
  private JobCategory category;

  @NotBlank
  @Size(max = 200)
  @Column(name = "location", nullable = false)
  private String location;

  @NotBlank
  @Column(name = "qualification", columnDefinition = "TEXT", nullable = false)
  private String qualification;

  @NotBlank
  @Size(max = 100)
  @Column(name = "experience", nullable = false)
  private String experience;

  @Enumerated(EnumType.STRING)
  @Column(name = "experience_level")
  private ExperienceLevel experienceLevel;

  @Column(name = "speciality")
  private String speciality;

  @Size(max = 220)
  @Column(name = "department")
  private String department;

  @Size(max = 100)
  @Column(name = "job_type")
  private String jobType;

  @Size(max = 320)
  @Column(name = "slug")
  private String slug;

  @Enumerated(EnumType.STRING)
  @Column(name = "duty_type")
  private DutyType dutyType;

  @Column(name = "number_of_posts", nullable = false)
  private Integer numberOfPosts = 1;

  @Size(max = 100)
  @Column(name = "salary_range")
  private String salaryRange;

  @Column(name = "requirements", columnDefinition = "TEXT")
  private String requirements;

  @Column(name = "benefits", columnDefinition = "TEXT")
  private String benefits;

  @NotNull
  @Column(name = "last_date", nullable = false)
  private LocalDate lastDate;

  @NotBlank
  @Email
  @Size(max = 100)
  @Column(name = "contact_email", nullable = false)
  private String contactEmail;

  @NotBlank
  @Size(max = 15)
  @Column(name = "contact_phone", nullable = false)
  private String contactPhone;

  @Size(max = 500)
  @Column(name = "pdf_url")
  private String pdfUrl;

  @Size(max = 500)
  @Column(name = "job_document_url")
  private String jobDocumentUrl;

  @Size(max = 500)
  @Column(name = "job_image_url")
  private String jobImageUrl;

  @Size(max = 500)
  @Column(name = "apply_link")
  private String applyLink;

  @Enumerated(EnumType.STRING)
  @Column(name = "status", nullable = false)
  private JobStatus status = JobStatus.PENDING;

  @Column(name = "is_featured", nullable = false)
  private Boolean isFeatured = false;

  @Column(name = "views", nullable = false)
  private Integer views = 0;

  @Column(name = "applications_count", nullable = false)
  private Integer applicationsCount = 0;

  @Column(name = "source_recruitment_id")
  private UUID sourceRecruitmentId;

  @Column(name = "source_vacancy_id")
  private UUID sourceVacancyId;

  @Column(name = "approved_at")
  private LocalDateTime approvedAt;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "approved_by")
  private User approvedBy;

  @CreatedDate
  @Column(name = "created_at", nullable = false, updatable = false)
  private LocalDateTime createdAt;

  @LastModifiedDate
  @Column(name = "updated_at")
  private LocalDateTime updatedAt;

  // Soft delete support
  @Column(name = "deleted_at")
  private LocalDateTime deletedAt;

  // Constructors
  public Job() {}

  public Job(
    Employer employer,
    String title,
    String description,
    JobSector sector,
    JobCategory category,
    String location,
    String qualification,
    String experience
  ) {
    this.employer = employer;
    this.title = title;
    this.description = description;
    this.sector = sector;
    this.category = category;
    this.location = location;
    this.qualification = qualification;
    this.experience = experience;
  }

  public Job(
    Employer employer,
    String title,
    String description,
    JobSector sector,
    JobCategory category,
    String location,
    String qualification,
    String experience,
    ExperienceLevel experienceLevel,
    String speciality,
    DutyType dutyType
  ) {
    this.employer = employer;
    this.title = title;
    this.description = description;
    this.sector = sector;
    this.category = category;
    this.location = location;
    this.qualification = qualification;
    this.experience = experience;
    this.experienceLevel = experienceLevel;
    this.speciality = speciality;
    this.dutyType = dutyType;
  }

  // Getters and Setters
  public UUID getId() {
    return id;
  }

  public void setId(UUID id) {
    this.id = id;
  }

  public Employer getEmployer() {
    return employer;
  }

  public void setEmployer(Employer employer) {
    this.employer = employer;
  }

  public String getTitle() {
    return title;
  }

  public void setTitle(String title) {
    this.title = title;
  }

  public String getDescription() {
    return description;
  }

  public void setDescription(String description) {
    this.description = description;
  }

  public JobSector getSector() {
    return sector;
  }

  public void setSector(JobSector sector) {
    this.sector = sector;
  }

  public JobCategory getCategory() {
    return category;
  }

  public void setCategory(JobCategory category) {
    this.category = category;
  }

  public String getLocation() {
    return location;
  }

  public void setLocation(String location) {
    this.location = location;
  }

  public String getQualification() {
    return qualification;
  }

  public void setQualification(String qualification) {
    this.qualification = qualification;
  }

  public String getExperience() {
    return experience;
  }

  public void setExperience(String experience) {
    this.experience = experience;
  }

  public ExperienceLevel getExperienceLevel() {
    return experienceLevel;
  }

  public void setExperienceLevel(ExperienceLevel experienceLevel) {
    this.experienceLevel = experienceLevel;
  }

  public String getSpeciality() {
    return speciality;
  }

  public void setSpeciality(String speciality) {
    this.speciality = speciality;
  }

  public String getDepartment() {
    return department;
  }

  public void setDepartment(String department) {
    this.department = department;
  }

  public String getJobType() {
    return jobType;
  }

  public void setJobType(String jobType) {
    this.jobType = jobType;
  }

  public String getSlug() {
    return slug;
  }

  public void setSlug(String slug) {
    this.slug = slug;
  }

  public DutyType getDutyType() {
    return dutyType;
  }

  public void setDutyType(DutyType dutyType) {
    this.dutyType = dutyType;
  }

  public Integer getNumberOfPosts() {
    return numberOfPosts;
  }

  public void setNumberOfPosts(Integer numberOfPosts) {
    this.numberOfPosts = numberOfPosts;
  }

  public String getSalaryRange() {
    return salaryRange;
  }

  public void setSalaryRange(String salaryRange) {
    this.salaryRange = salaryRange;
  }

  public String getRequirements() {
    return requirements;
  }

  public void setRequirements(String requirements) {
    this.requirements = requirements;
  }

  public String getBenefits() {
    return benefits;
  }

  public void setBenefits(String benefits) {
    this.benefits = benefits;
  }

  public LocalDate getLastDate() {
    return lastDate;
  }

  public void setLastDate(LocalDate lastDate) {
    this.lastDate = lastDate;
  }

  public String getContactEmail() {
    return contactEmail;
  }

  public void setContactEmail(String contactEmail) {
    this.contactEmail = contactEmail;
  }

  public String getContactPhone() {
    return contactPhone;
  }

  public void setContactPhone(String contactPhone) {
    this.contactPhone = contactPhone;
  }

  public String getPdfUrl() {
    return pdfUrl;
  }

  public void setPdfUrl(String pdfUrl) {
    this.pdfUrl = pdfUrl;
  }

  public String getJobDocumentUrl() {
    return jobDocumentUrl;
  }

  public void setJobDocumentUrl(String jobDocumentUrl) {
    this.jobDocumentUrl = jobDocumentUrl;
  }

  public String getJobImageUrl() {
    return jobImageUrl;
  }

  public void setJobImageUrl(String jobImageUrl) {
    this.jobImageUrl = jobImageUrl;
  }

  public String getApplyLink() {
    return applyLink;
  }

  public void setApplyLink(String applyLink) {
    this.applyLink = applyLink;
  }

  public JobStatus getStatus() {
    return status;
  }

  public void setStatus(JobStatus status) {
    this.status = status;
  }

  public Boolean getIsFeatured() {
    return isFeatured;
  }

  public void setIsFeatured(Boolean isFeatured) {
    this.isFeatured = isFeatured;
  }

  public Integer getViews() {
    return views;
  }

  public void setViews(Integer views) {
    this.views = views;
  }

  public Integer getApplicationsCount() {
    return applicationsCount;
  }

  public void setApplicationsCount(Integer applicationsCount) {
    this.applicationsCount = applicationsCount;
  }

  public UUID getSourceRecruitmentId() {
    return sourceRecruitmentId;
  }

  public void setSourceRecruitmentId(UUID sourceRecruitmentId) {
    this.sourceRecruitmentId = sourceRecruitmentId;
  }

  public UUID getSourceVacancyId() {
    return sourceVacancyId;
  }

  public void setSourceVacancyId(UUID sourceVacancyId) {
    this.sourceVacancyId = sourceVacancyId;
  }

  public LocalDateTime getApprovedAt() {
    return approvedAt;
  }

  public void setApprovedAt(LocalDateTime approvedAt) {
    this.approvedAt = approvedAt;
  }

  public User getApprovedBy() {
    return approvedBy;
  }

  public void setApprovedBy(User approvedBy) {
    this.approvedBy = approvedBy;
  }

  public LocalDateTime getCreatedAt() {
    return createdAt;
  }

  public void setCreatedAt(LocalDateTime createdAt) {
    this.createdAt = createdAt;
  }

  public LocalDateTime getUpdatedAt() {
    return updatedAt;
  }

  public void setUpdatedAt(LocalDateTime updatedAt) {
    this.updatedAt = updatedAt;
  }

  public LocalDateTime getDeletedAt() {
    return deletedAt;
  }

  public void setDeletedAt(LocalDateTime deletedAt) {
    this.deletedAt = deletedAt;
  }

  public boolean isDeleted() {
    return deletedAt != null;
  }

  // Enums
  public enum JobSector {
    GOVERNMENT,
    PRIVATE,
  }

  public enum JobCategory {
    JUNIOR_RESIDENT,
    SENIOR_RESIDENT,
    MEDICAL_OFFICER,
    FACULTY,
    SPECIALIST,
    DENTAL,
    AYUSH,
    NURSING,
    PARAMEDICAL,
    PARAMEDICAL_NURSING,
    ALLIED_HEALTH,
    PHARMACY,
    PSYCHOLOGY_MENTAL_HEALTH,
    NUTRITION_DIETETICS,
    LIFE_SCIENCE_RESEARCH,
    HOSPITAL_ADMINISTRATION,
    PUBLIC_HEALTH,
  }

  public enum JobStatus {
    ACTIVE,
    CLOSED,
    PENDING,
    DRAFT,
  }

  public enum ExperienceLevel {
    ENTRY,
    MID,
    SENIOR,
    EXECUTIVE,
  }

  public enum DutyType {
    FULL_TIME,
    PART_TIME,
    CONTRACT,
  }
}
