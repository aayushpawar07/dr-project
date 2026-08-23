package com.medexjob.dto.recruitment;

import java.util.ArrayList;
import java.util.List;

/** Strict structured representation returned by the configured AI extractor. */
public class RecruitmentExtractionResult {
    private RecruitmentData recruitment = new RecruitmentData();
    private List<VacancyData> vacancies = new ArrayList<>();
    private String extractionMethod;

    public RecruitmentData getRecruitment() { return recruitment; }
    public void setRecruitment(RecruitmentData recruitment) { this.recruitment = recruitment; }
    public List<VacancyData> getVacancies() { return vacancies; }
    public void setVacancies(List<VacancyData> vacancies) { this.vacancies = vacancies; }
    public String getExtractionMethod() { return extractionMethod; }
    public void setExtractionMethod(String extractionMethod) { this.extractionMethod = extractionMethod; }

    public static class RecruitmentData {
        private String organisationName;
        private String title;
        private String advertisementNumber;
        private Integer recruitmentYear;
        private String sector;
        private String location;
        private Integer totalVacancies;
        private String applicationStartDate;
        private String applicationLastDate;
        private String applicationFee;
        private String selectionProcess;
        private String officialNotificationUrl;
        private String officialApplicationUrl;
        private String officialWebsite;
        private String importantInstructions;

        public String getOrganisationName() { return organisationName; }
        public void setOrganisationName(String organisationName) { this.organisationName = organisationName; }
        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }
        public String getAdvertisementNumber() { return advertisementNumber; }
        public void setAdvertisementNumber(String advertisementNumber) { this.advertisementNumber = advertisementNumber; }
        public Integer getRecruitmentYear() { return recruitmentYear; }
        public void setRecruitmentYear(Integer recruitmentYear) { this.recruitmentYear = recruitmentYear; }
        public String getSector() { return sector; }
        public void setSector(String sector) { this.sector = sector; }
        public String getLocation() { return location; }
        public void setLocation(String location) { this.location = location; }
        public Integer getTotalVacancies() { return totalVacancies; }
        public void setTotalVacancies(Integer totalVacancies) { this.totalVacancies = totalVacancies; }
        public String getApplicationStartDate() { return applicationStartDate; }
        public void setApplicationStartDate(String applicationStartDate) { this.applicationStartDate = applicationStartDate; }
        public String getApplicationLastDate() { return applicationLastDate; }
        public void setApplicationLastDate(String applicationLastDate) { this.applicationLastDate = applicationLastDate; }
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
    }

    public static class VacancyData {
        private String postName;
        private String department;
        private String speciality;
        private String subSpeciality;
        private Integer numberOfVacancies;
        private String category;
        private String qualification;
        private String experience;
        private String ageLimit;
        private String salary;
        private String payLevel;
        private String payScale;
        private String jobType;
        private String location;
        private String otherEligibilityRequirements;
        private Double confidenceScore;
        private Integer sourcePage;

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
        public Integer getSourcePage() { return sourcePage; }
        public void setSourcePage(Integer sourcePage) { this.sourcePage = sourcePage; }
    }
}
