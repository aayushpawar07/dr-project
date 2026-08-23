package com.medexjob.entity;

import jakarta.persistence.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "vacancy_records", indexes = {
        @Index(name = "idx_vacancy_recruitment", columnList = "recruitment_id"),
        @Index(name = "idx_vacancy_post", columnList = "post_name"),
        @Index(name = "idx_vacancy_department", columnList = "department"),
        @Index(name = "idx_vacancy_speciality", columnList = "speciality"),
        @Index(name = "idx_vacancy_status", columnList = "status")
})
@EntityListeners(AuditingEntityListener.class)
public class VacancyRecord {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "recruitment_id", nullable = false)
    private Recruitment recruitment;

    @Column(name = "post_name", nullable = false, length = 180)
    private String postName;

    @Column(name = "department", length = 220)
    private String department;

    @Column(name = "speciality", length = 220)
    private String speciality;

    @Column(name = "sub_speciality", length = 220)
    private String subSpeciality;

    @Column(name = "number_of_vacancies", nullable = false)
    private Integer numberOfVacancies = 1;

    @Column(name = "category", length = 100)
    private String category;

    @Column(name = "qualification", columnDefinition = "TEXT")
    private String qualification;

    @Column(name = "experience", columnDefinition = "TEXT")
    private String experience;

    @Column(name = "age_limit", length = 300)
    private String ageLimit;

    @Column(name = "salary", length = 300)
    private String salary;

    @Column(name = "pay_level", length = 150)
    private String payLevel;

    @Column(name = "pay_scale", length = 250)
    private String payScale;

    @Column(name = "job_type", length = 100)
    private String jobType;

    @Column(name = "location", length = 200)
    private String location;

    @Column(name = "other_eligibility", columnDefinition = "TEXT")
    private String otherEligibilityRequirements;

    @Column(name = "confidence_score")
    private Double confidenceScore;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private VacancyStatus status = VacancyStatus.NEEDS_REVIEW;

    @Column(name = "slug", length = 300)
    private String slug;

    @Column(name = "source_page")
    private Integer sourcePage;

    @Column(name = "published_job_id")
    private UUID publishedJobId;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public enum VacancyStatus {
        NEEDS_REVIEW, APPROVED, REJECTED, PUBLISHED
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public Recruitment getRecruitment() { return recruitment; }
    public void setRecruitment(Recruitment recruitment) { this.recruitment = recruitment; }
    public String getPostName() { return postName; }
    public void setPostName(String postName) { this.postName = postName; }
    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }
    public String getSpeciality() { return speciality; }
    public void setSpeciality(String speciality) { this.speciality = speciality; }
    public String getSubSpeciality() { return subSpeciality; }
    public void setSubSpeciality(String subSpeciality) { this.subSpeciality = subSpeciality; }
    public Integer getNumberOfVacancies() { return numberOfVacancies; }
    public void setNumberOfVacancies(Integer numberOfVacancies) { this.numberOfVacancies = numberOfVacancies; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public String getQualification() { return qualification; }
    public void setQualification(String qualification) { this.qualification = qualification; }
    public String getExperience() { return experience; }
    public void setExperience(String experience) { this.experience = experience; }
    public String getAgeLimit() { return ageLimit; }
    public void setAgeLimit(String ageLimit) { this.ageLimit = ageLimit; }
    public String getSalary() { return salary; }
    public void setSalary(String salary) { this.salary = salary; }
    public String getPayLevel() { return payLevel; }
    public void setPayLevel(String payLevel) { this.payLevel = payLevel; }
    public String getPayScale() { return payScale; }
    public void setPayScale(String payScale) { this.payScale = payScale; }
    public String getJobType() { return jobType; }
    public void setJobType(String jobType) { this.jobType = jobType; }
    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }
    public String getOtherEligibilityRequirements() { return otherEligibilityRequirements; }
    public void setOtherEligibilityRequirements(String otherEligibilityRequirements) { this.otherEligibilityRequirements = otherEligibilityRequirements; }
    public Double getConfidenceScore() { return confidenceScore; }
    public void setConfidenceScore(Double confidenceScore) { this.confidenceScore = confidenceScore; }
    public VacancyStatus getStatus() { return status; }
    public void setStatus(VacancyStatus status) { this.status = status; }
    public String getSlug() { return slug; }
    public void setSlug(String slug) { this.slug = slug; }
    public Integer getSourcePage() { return sourcePage; }
    public void setSourcePage(Integer sourcePage) { this.sourcePage = sourcePage; }
    public UUID getPublishedJobId() { return publishedJobId; }
    public void setPublishedJobId(UUID publishedJobId) { this.publishedJobId = publishedJobId; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
