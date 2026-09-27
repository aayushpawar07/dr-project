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

    @OneToOne(fetch = FetchType.EAGER, optional = false)
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

    @Column(name = "profile_photo_url", length = 500)
    private String profilePhotoUrl;

    @Column(name = "medical_category", length = 100)
    private String medicalCategory;

    @Column(name = "current_organization", length = 200)
    private String currentOrganization;

    @Column(name = "preferred_job_role", length = 200)
    private String preferredJobRole;

    @Column(name = "skills", columnDefinition = "TEXT")
    private String skills;

    @Column(name = "registration_year", length = 20)
    private String registrationYear;

    @Column(name = "registration_state", length = 100)
    private String registrationState;

    @Column(name = "resume_url", length = 500)
    private String resumeUrl;

    @Column(name = "resume_file_name", length = 255)
    private String resumeFileName;

    @Column(name = "profile_summary", columnDefinition = "TEXT")
    private String profileSummary;

    @Column(name = "professional_category", length = 100)
    private String professionalCategory;

    @Column(name = "basic_qualification", length = 150)
    private String basicQualification;

    @Column(name = "highest_qualification", length = 150)
    private String highestQualification;

    @Column(name = "super_speciality", length = 150)
    private String superSpeciality;

    @Column(name = "fellowship", length = 150)
    private String fellowship;

    @Column(name = "experience_band", length = 50)
    private String experienceBand;

    @Column(name = "experience_months")
    private Integer experienceMonths;

    @Column(name = "preferred_job_roles", columnDefinition = "TEXT")
    private String preferredJobRoles;

    @Column(name = "preferred_sectors", length = 100)
    private String preferredSectors;

    @Column(name = "preferred_employment_types", length = 200)
    private String preferredEmploymentTypes;

    @Column(name = "location_preference_type", length = 50)
    private String locationPreferenceType;

    @Column(name = "preferred_states", columnDefinition = "TEXT")
    private String preferredStates;

    @Column(name = "preferred_cities", columnDefinition = "TEXT")
    private String preferredCities;

    @Column(name = "job_alert_settings", columnDefinition = "TEXT")
    private String jobAlertSettings;

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
    public String getProfilePhotoUrl() { return profilePhotoUrl; }
    public void setProfilePhotoUrl(String profilePhotoUrl) { this.profilePhotoUrl = clean(profilePhotoUrl); }
    public String getMedicalCategory() { return medicalCategory; }
    public void setMedicalCategory(String medicalCategory) { this.medicalCategory = clean(medicalCategory); }
    public String getCurrentOrganization() { return currentOrganization; }
    public void setCurrentOrganization(String currentOrganization) { this.currentOrganization = clean(currentOrganization); }
    public String getPreferredJobRole() { return preferredJobRole; }
    public void setPreferredJobRole(String preferredJobRole) { this.preferredJobRole = clean(preferredJobRole); }
    public String getSkills() { return skills; }
    public void setSkills(String skills) { this.skills = clean(skills); }
    public String getRegistrationYear() { return registrationYear; }
    public void setRegistrationYear(String registrationYear) { this.registrationYear = clean(registrationYear); }
    public String getRegistrationState() { return registrationState; }
    public void setRegistrationState(String registrationState) { this.registrationState = clean(registrationState); }
    public String getResumeUrl() { return resumeUrl; }
    public void setResumeUrl(String resumeUrl) { this.resumeUrl = clean(resumeUrl); }
    public String getResumeFileName() { return resumeFileName; }
    public void setResumeFileName(String resumeFileName) { this.resumeFileName = clean(resumeFileName); }

    public String getProfessionalCategory() { return professionalCategory; }
    public void setProfessionalCategory(String professionalCategory) { this.professionalCategory = clean(professionalCategory); }

    public String getBasicQualification() { return basicQualification; }
    public void setBasicQualification(String basicQualification) { this.basicQualification = clean(basicQualification); }

    public String getHighestQualification() { return highestQualification; }
    public void setHighestQualification(String highestQualification) { this.highestQualification = clean(highestQualification); }

    public String getSuperSpeciality() { return superSpeciality; }
    public void setSuperSpeciality(String superSpeciality) { this.superSpeciality = clean(superSpeciality); }

    public String getFellowship() { return fellowship; }
    public void setFellowship(String fellowship) { this.fellowship = clean(fellowship); }

    public String getExperienceBand() { return experienceBand; }
    public void setExperienceBand(String experienceBand) { this.experienceBand = clean(experienceBand); }

    public Integer getExperienceMonths() { return experienceMonths; }
    public void setExperienceMonths(Integer experienceMonths) { this.experienceMonths = experienceMonths; }

    public String getPreferredJobRoles() { return preferredJobRoles; }
    public void setPreferredJobRoles(String preferredJobRoles) { this.preferredJobRoles = clean(preferredJobRoles); }

    public String getPreferredSectors() { return preferredSectors; }
    public void setPreferredSectors(String preferredSectors) { this.preferredSectors = clean(preferredSectors); }

    public String getPreferredEmploymentTypes() { return preferredEmploymentTypes; }
    public void setPreferredEmploymentTypes(String preferredEmploymentTypes) { this.preferredEmploymentTypes = clean(preferredEmploymentTypes); }

    public String getLocationPreferenceType() { return locationPreferenceType; }
    public void setLocationPreferenceType(String locationPreferenceType) { this.locationPreferenceType = clean(locationPreferenceType); }

    public String getPreferredStates() { return preferredStates; }
    public void setPreferredStates(String preferredStates) { this.preferredStates = clean(preferredStates); }

    public String getPreferredCities() { return preferredCities; }
    public void setPreferredCities(String preferredCities) { this.preferredCities = clean(preferredCities); }

    public String getJobAlertSettings() { return jobAlertSettings; }
    public void setJobAlertSettings(String jobAlertSettings) { this.jobAlertSettings = clean(jobAlertSettings); }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }

    private String clean(String value) { return value == null ? null : value.trim(); }
}
