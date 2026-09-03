package com.medexjob.entity;

import jakarta.persistence.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "candidate_profiles", indexes = {
        @Index(name = "idx_candidate_profile_speciality", columnList = "speciality"),
        @Index(name = "idx_candidate_profile_state", columnList = "state"),
        @Index(name = "idx_candidate_profile_qualification", columnList = "qualification")
})
@EntityListeners(AuditingEntityListener.class)
public class CandidateProfile {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "candidate_id", nullable = false, unique = true)
    private User candidate;

    @Column(name = "speciality", length = 120)
    private String speciality;

    @Column(name = "sub_speciality", length = 120)
    private String subSpeciality;

    @Column(name = "qualification", length = 200)
    private String qualification;

    @Column(name = "years_experience")
    private Integer yearsExperience;

    @Column(name = "registration_council", length = 160)
    private String registrationCouncil;

    @Column(name = "registration_number", length = 100)
    private String registrationNumber;

    @Column(name = "current_city", length = 100)
    private String currentCity;

    @Column(name = "state", length = 100)
    private String state;

    @Column(name = "preferred_location", length = 160)
    private String preferredLocation;

    @Column(name = "employment_preference", length = 80)
    private String employmentPreference;

    @Column(name = "profile_summary", columnDefinition = "TEXT")
    private String profileSummary;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public UUID getId() { return id; }
    public User getCandidate() { return candidate; }
    public void setCandidate(User candidate) { this.candidate = candidate; }
    public String getSpeciality() { return speciality; }
    public void setSpeciality(String speciality) { this.speciality = clean(speciality); }
    public String getSubSpeciality() { return subSpeciality; }
    public void setSubSpeciality(String subSpeciality) { this.subSpeciality = clean(subSpeciality); }
    public String getQualification() { return qualification; }
    public void setQualification(String qualification) { this.qualification = clean(qualification); }
    public Integer getYearsExperience() { return yearsExperience; }
    public void setYearsExperience(Integer yearsExperience) { this.yearsExperience = yearsExperience == null ? null : Math.max(0, Math.min(yearsExperience, 80)); }
    public String getRegistrationCouncil() { return registrationCouncil; }
    public void setRegistrationCouncil(String registrationCouncil) { this.registrationCouncil = clean(registrationCouncil); }
    public String getRegistrationNumber() { return registrationNumber; }
    public void setRegistrationNumber(String registrationNumber) { this.registrationNumber = clean(registrationNumber); }
    public String getCurrentCity() { return currentCity; }
    public void setCurrentCity(String currentCity) { this.currentCity = clean(currentCity); }
    public String getState() { return state; }
    public void setState(String state) { this.state = clean(state); }
    public String getPreferredLocation() { return preferredLocation; }
    public void setPreferredLocation(String preferredLocation) { this.preferredLocation = clean(preferredLocation); }
    public String getEmploymentPreference() { return employmentPreference; }
    public void setEmploymentPreference(String employmentPreference) { this.employmentPreference = clean(employmentPreference); }
    public String getProfileSummary() { return profileSummary; }
    public void setProfileSummary(String profileSummary) { this.profileSummary = clean(profileSummary); }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }

    private String clean(String value) { return value == null ? null : value.trim(); }
}
