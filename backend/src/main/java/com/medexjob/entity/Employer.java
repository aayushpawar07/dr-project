package com.medexjob.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "employers", indexes = {
    @Index(name = "idx_employer_company_name", columnList = "company_name"),
    @Index(name = "idx_employer_user", columnList = "user_id"),
    @Index(name = "idx_employer_verification_status", columnList = "verification_status")
})
@EntityListeners(AuditingEntityListener.class)
public class Employer {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    
    @NotBlank
    @Size(max = 200)
    @Column(name = "company_name", nullable = false)
    private String companyName;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "company_type", nullable = false)
    private CompanyType companyType;
    
    @Column(name = "company_description", columnDefinition = "TEXT")
    private String companyDescription;
    
    @Size(max = 255)
    @Column(name = "website")
    private String website;
    
    @Size(max = 500)
    @Column(name = "address")
    private String address;
    
    @Size(max = 100)
    @Column(name = "city")
    private String city;
    
    @Size(max = 100)
    @Column(name = "state")
    private String state;
    
    @Size(max = 10)
    @Column(name = "pincode")
    private String pincode;

    @Size(max = 150)
    @Column(name = "contact_person")
    private String contactPerson;

    @Size(max = 100)
    @Column(name = "designation")
    private String designation;

    @Size(max = 500)
    @Column(name = "document_url")
    private String documentUrl;
    
    @Column(name = "is_verified", nullable = false)
    private Boolean isVerified = false;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "verification_status", nullable = false)
    private VerificationStatus verificationStatus = VerificationStatus.PENDING;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "employer_status")
    private EmployerStatus employerStatus = EmployerStatus.ACTIVE;
    
    @Column(name = "verification_notes", columnDefinition = "TEXT")
    private String verificationNotes;
    
    @Column(name = "verified_at")
    private LocalDateTime verifiedAt;
    
    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    // Constructors
    public Employer() {}
    
    public Employer(User user, String companyName, CompanyType companyType) {
        this.user = user;
        this.companyName = companyName;
        this.companyType = companyType;
    }
    
    // Getters and Setters
    public UUID getId() {
        return id;
    }
    
    public void setId(UUID id) {
        this.id = id;
    }
    
    public User getUser() {
        return user;
    }
    
    public void setUser(User user) {
        this.user = user;
    }
    
    public String getCompanyName() {
        return companyName;
    }
    
    public void setCompanyName(String companyName) {
        this.companyName = companyName;
    }
    
    public CompanyType getCompanyType() {
        return companyType;
    }
    
    public void setCompanyType(CompanyType companyType) {
        this.companyType = companyType;
    }
    
    public String getCompanyDescription() {
        return companyDescription;
    }
    
    public void setCompanyDescription(String companyDescription) {
        this.companyDescription = companyDescription;
    }
    
    public String getWebsite() {
        return website;
    }
    
    public void setWebsite(String website) {
        this.website = website;
    }
    
    public String getAddress() {
        return address;
    }
    
    public void setAddress(String address) {
        this.address = address;
    }
    
    public String getCity() {
        return city;
    }
    
    public void setCity(String city) {
        this.city = city;
    }
    
    public String getState() {
        return state;
    }
    
    public void setState(String state) {
        this.state = state;
    }
    
    public String getPincode() {
        return pincode;
    }
    
    public void setPincode(String pincode) {
        this.pincode = pincode;
    }

    public String getContactPerson() {
        return contactPerson;
    }

    public void setContactPerson(String contactPerson) {
        this.contactPerson = contactPerson;
    }

    public String getDesignation() {
        return designation;
    }

    public void setDesignation(String designation) {
        this.designation = designation;
    }

    public String getDocumentUrl() {
        return documentUrl;
    }

    public void setDocumentUrl(String documentUrl) {
        this.documentUrl = documentUrl;
    }
    
    public Boolean getIsVerified() {
        return isVerified;
    }
    
    public void setIsVerified(Boolean isVerified) {
        this.isVerified = isVerified;
    }
    
    public VerificationStatus getVerificationStatus() {
        return verificationStatus;
    }
    
    public void setVerificationStatus(VerificationStatus verificationStatus) {
        this.verificationStatus = verificationStatus;
    }
    
    public EmployerStatus getEmployerStatus() {
        return employerStatus;
    }
    
    public void setEmployerStatus(EmployerStatus employerStatus) {
        this.employerStatus = employerStatus;
    }
    
    public String getVerificationNotes() {
        return verificationNotes;
    }
    
    public void setVerificationNotes(String verificationNotes) {
        this.verificationNotes = verificationNotes;
    }
    
    public LocalDateTime getVerifiedAt() {
        return verifiedAt;
    }
    
    public void setVerifiedAt(LocalDateTime verifiedAt) {
        this.verifiedAt = verifiedAt;
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
    
    // Enums
    public enum CompanyType {
        HOSPITAL, CONSULTANCY, HR
    }
    
    public enum VerificationStatus {
        PENDING, APPROVED, REJECTED
    }
    
    public enum EmployerStatus {
        ACTIVE, DISCONTINUED
    }
}










