package com.medexjob.service;

import com.medexjob.entity.Application;
import com.medexjob.entity.CandidateProfile;
import com.medexjob.entity.Job;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class ApplicationEligibilityService {

    private static final Logger logger = LoggerFactory.getLogger(ApplicationEligibilityService.class);

    private static final Pattern YEARS_PATTERN = Pattern.compile("(\\d+)\\s*\\+?\\s*(?:to|-)?\\s*(\\d+)?\\s*(?:years?|yrs?|saal)?", Pattern.CASE_INSENSITIVE);
    private static final Pattern DIGIT_PATTERN = Pattern.compile("(\\d+)");

    private static final List<String> STANDARD_MEDICAL_QUALIFICATIONS = List.of(
            "MBBS", "MD", "MS", "DNB", "DM", "MCH", "DIPLOMA",
            "BDS", "MDS",
            "BAMS", "BHMS", "BUMS", "BNYS",
            "BSC NURSING", "MSC NURSING", "GNM", "ANM", "POST BASIC",
            "BPT", "MPT", "B.PHARM", "M.PHARM", "PHARM.D", "D.PHARM",
            "BMLT", "DMLT", "MLT", "PARAMEDICAL", "ALLIED HEALTH"
    );

    public static class JobCriteria {
        private UUID jobId;
        private String jobTitle;
        private List<String> requiredQualifications = new ArrayList<>();
        private String rawQualification;
        private String speciality;
        private Integer minExperienceYears;
        private String rawExperience;
        private String location;
        private boolean registrationRequired;

        public UUID getJobId() { return jobId; }
        public void setJobId(UUID jobId) { this.jobId = jobId; }
        public String getJobTitle() { return jobTitle; }
        public void setJobTitle(String jobTitle) { this.jobTitle = jobTitle; }
        public List<String> getRequiredQualifications() { return requiredQualifications; }
        public void setRequiredQualifications(List<String> requiredQualifications) { this.requiredQualifications = requiredQualifications; }
        public String getRawQualification() { return rawQualification; }
        public void setRawQualification(String rawQualification) { this.rawQualification = rawQualification; }
        public String getSpeciality() { return speciality; }
        public void setSpeciality(String speciality) { this.speciality = speciality; }
        public Integer getMinExperienceYears() { return minExperienceYears; }
        public void setMinExperienceYears(Integer minExperienceYears) { this.minExperienceYears = minExperienceYears; }
        public String getRawExperience() { return rawExperience; }
        public void setRawExperience(String rawExperience) { this.rawExperience = rawExperience; }
        public String getLocation() { return location; }
        public void setLocation(String location) { this.location = location; }
        public boolean isRegistrationRequired() { return registrationRequired; }
        public void setRegistrationRequired(boolean registrationRequired) { this.registrationRequired = registrationRequired; }
    }

    public static class CandidateEligibilityResult {
        private boolean eligible;
        private int score; // 0 to 100
        private List<String> matchingCriteria = new ArrayList<>();
        private List<String> unmetCriteria = new ArrayList<>();

        public boolean isEligible() { return eligible; }
        public void setEligible(boolean eligible) { this.eligible = eligible; }
        public int getScore() { return score; }
        public void setScore(int score) { this.score = score; }
        public List<String> getMatchingCriteria() { return matchingCriteria; }
        public void setMatchingCriteria(List<String> matchingCriteria) { this.matchingCriteria = matchingCriteria; }
        public List<String> getUnmetCriteria() { return unmetCriteria; }
        public void setUnmetCriteria(List<String> unmetCriteria) { this.unmetCriteria = unmetCriteria; }
    }

    /**
     * Parse and extract standardized eligibility criteria from a Job
     */
    public JobCriteria extractJobCriteria(Job job) {
        JobCriteria criteria = new JobCriteria();
        criteria.setJobId(job.getId());
        criteria.setJobTitle(job.getTitle());
        criteria.setRawQualification(job.getQualification());
        criteria.setRawExperience(job.getExperience());
        criteria.setSpeciality(job.getSpeciality() != null && !job.getSpeciality().isBlank() ? job.getSpeciality().trim() : null);
        criteria.setLocation(job.getLocation() != null && !job.getLocation().isBlank() ? job.getLocation().trim() : null);

        // 1. Parse qualifications
        if (job.getQualification() != null && !job.getQualification().isBlank()) {
            String qualText = job.getQualification().toUpperCase();
            for (String std : STANDARD_MEDICAL_QUALIFICATIONS) {
                if (qualText.contains(std)) {
                    criteria.getRequiredQualifications().add(std);
                }
            }
            if (criteria.getRequiredQualifications().isEmpty()) {
                // Split by comma / slash
                String[] parts = job.getQualification().split("[,/|;]");
                for (String p : parts) {
                    String trimmed = p.trim();
                    if (!trimmed.isEmpty()) criteria.getRequiredQualifications().add(trimmed);
                }
            }
        }

        // 2. Parse experience years
        Integer minExp = parseMinExperience(job.getExperience(), job.getExperienceLevel());
        criteria.setMinExperienceYears(minExp);

        // 3. Registration requirement: Doctor / Clinical categories require council registration
        boolean regReq = false;
        if (job.getCategory() != null) {
            String cat = job.getCategory().name();
            if (cat.contains("RESIDENT") || cat.contains("MEDICAL_OFFICER") || cat.contains("SPECIALIST")
                    || cat.contains("CONSULTANT") || cat.contains("GDMO") || cat.contains("DENTAL")
                    || cat.contains("AYUSH") || cat.contains("FACULTY")) {
                regReq = true;
            }
        }
        if (!regReq && job.getQualification() != null) {
            String q = job.getQualification().toUpperCase();
            if (q.contains("MBBS") || q.contains("MD") || q.contains("MS") || q.contains("DNB")
                    || q.contains("BDS") || q.contains("MDS") || q.contains("BAMS") || q.contains("BHMS")) {
                regReq = true;
            }
        }
        criteria.setRegistrationRequired(regReq);

        return criteria;
    }

    /**
     * Parse minimum experience in years from experience text and level
     */
    public Integer parseMinExperience(String expStr, Job.ExperienceLevel level) {
        if (expStr != null && !expStr.isBlank()) {
            String lower = expStr.toLowerCase().trim();
            if (lower.contains("fresher") || lower.equals("0") || lower.startsWith("0 ")) {
                return 0;
            }
            Matcher matcher = YEARS_PATTERN.matcher(expStr);
            if (matcher.find()) {
                try {
                    return Integer.parseInt(matcher.group(1));
                } catch (Exception ignored) {}
            }
            Matcher digitMatcher = DIGIT_PATTERN.matcher(expStr);
            if (digitMatcher.find()) {
                try {
                    return Integer.parseInt(digitMatcher.group(1));
                } catch (Exception ignored) {}
            }
        }
        if (level != null) {
            return switch (level) {
                case ENTRY -> 0;
                case MID -> 2;
                case SENIOR -> 5;
                case EXECUTIVE -> 8;
            };
        }
        return 0;
    }

    /**
     * Evaluate candidate eligibility against job requirements
     */
    public CandidateEligibilityResult evaluateEligibility(JobCriteria criteria, CandidateProfile profile, Application application) {
        CandidateEligibilityResult result = new CandidateEligibilityResult();
        int totalWeight = 0;
        int earnedWeight = 0;

        boolean qualPass = true;
        boolean specPass = true;
        boolean expPass = true;
        boolean regPass = true;

        // 1. Qualification Evaluation (Weight: 35)
        int qualWeight = 35;
        totalWeight += qualWeight;
        if (criteria.getRequiredQualifications().isEmpty()) {
            earnedWeight += qualWeight;
            if (profile != null && profile.getQualification() != null && !profile.getQualification().isBlank()) {
                result.getMatchingCriteria().add("Qualification: " + profile.getQualification());
            }
        } else {
            String candQual = profile != null && profile.getQualification() != null ? profile.getQualification().toUpperCase() : "";
            boolean matched = false;
            String matchedDegree = null;

            for (String req : criteria.getRequiredQualifications()) {
                if (candQual.contains(req.toUpperCase())) {
                    matched = true;
                    matchedDegree = req;
                    break;
                }
                // MBBS satisfied by MD/MS/DNB
                if ("MBBS".equalsIgnoreCase(req) && (candQual.contains("MD") || candQual.contains("MS") || candQual.contains("DNB"))) {
                    matched = true;
                    matchedDegree = "MD/MS/DNB (Includes MBBS)";
                    break;
                }
            }

            if (matched) {
                earnedWeight += qualWeight;
                result.getMatchingCriteria().add("Degree: " + (matchedDegree != null ? matchedDegree : profile.getQualification()) + " (Eligible)");
            } else {
                qualPass = false;
                String candDisplay = profile != null && profile.getQualification() != null && !profile.getQualification().isBlank()
                        ? profile.getQualification() : "Not specified";
                result.getUnmetCriteria().add("Qualification: " + candDisplay + " (Req: " + String.join(", ", criteria.getRequiredQualifications()) + ")");
            }
        }

        // 2. Speciality Evaluation (Weight: 25)
        int specWeight = 25;
        totalWeight += specWeight;
        if (criteria.getSpeciality() == null || criteria.getSpeciality().isBlank()) {
            earnedWeight += specWeight;
            if (profile != null && profile.getSpeciality() != null && !profile.getSpeciality().isBlank()) {
                result.getMatchingCriteria().add("Speciality: " + profile.getSpeciality());
            }
        } else {
            String jobSpec = criteria.getSpeciality().toLowerCase();
            String candSpec = profile != null && profile.getSpeciality() != null ? profile.getSpeciality().toLowerCase() : "";
            String candSubSpec = profile != null && profile.getSubSpeciality() != null ? profile.getSubSpeciality().toLowerCase() : "";

            if (candSpec.contains(jobSpec) || jobSpec.contains(candSpec) || (!candSubSpec.isEmpty() && candSubSpec.contains(jobSpec))) {
                earnedWeight += specWeight;
                result.getMatchingCriteria().add("Speciality: " + (profile != null ? profile.getSpeciality() : criteria.getSpeciality()) + " (Matched)");
            } else {
                specPass = false;
                String candDisplay = profile != null && profile.getSpeciality() != null && !profile.getSpeciality().isBlank()
                        ? profile.getSpeciality() : "Not specified";
                result.getUnmetCriteria().add("Speciality: " + candDisplay + " (Req: " + criteria.getSpeciality() + ")");
            }
        }

        // 3. Experience Evaluation (Weight: 20)
        int expWeight = 20;
        totalWeight += expWeight;
        int reqExp = criteria.getMinExperienceYears() != null ? criteria.getMinExperienceYears() : 0;
        Integer candExp = profile != null ? profile.getYearsExperience() : null;

        if (reqExp == 0) {
            earnedWeight += expWeight;
            if (candExp != null && candExp > 0) {
                result.getMatchingCriteria().add("Experience: " + candExp + " Yrs");
            }
        } else {
            if (candExp != null && candExp >= reqExp) {
                earnedWeight += expWeight;
                result.getMatchingCriteria().add("Experience: " + candExp + " Yrs (Req: " + reqExp + "+ yrs)");
            } else if (candExp != null && candExp > 0) {
                expPass = false;
                // Proportional score
                earnedWeight += (int) Math.round(((double) candExp / reqExp) * expWeight);
                result.getUnmetCriteria().add("Experience: " + candExp + " yr" + (candExp == 1 ? "" : "s") + " (Req: " + reqExp + "+ yrs)");
            } else {
                expPass = false;
                result.getUnmetCriteria().add("Experience: " + (candExp == null ? "Not specified" : "0 yrs") + " (Req: " + reqExp + "+ yrs)");
            }
        }

        // 4. Medical Council Registration (Weight: 15)
        int regWeight = 15;
        totalWeight += regWeight;
        String regNum = profile != null ? profile.getRegistrationNumber() : null;
        String regCouncil = profile != null ? profile.getRegistrationCouncil() : null;

        if (criteria.isRegistrationRequired()) {
            if (regNum != null && !regNum.isBlank()) {
                earnedWeight += regWeight;
                String councilDisplay = regCouncil != null && !regCouncil.isBlank() ? " (" + regCouncil + ")" : "";
                result.getMatchingCriteria().add("Reg: " + regNum + councilDisplay + " (Valid)");
            } else {
                regPass = false;
                result.getUnmetCriteria().add("Medical Registration: Not Provided");
            }
        } else {
            earnedWeight += regWeight;
            if (regNum != null && !regNum.isBlank()) {
                result.getMatchingCriteria().add("Reg: " + regNum);
            }
        }

        // 5. Location Compatibility (Weight: 5)
        int locWeight = 5;
        totalWeight += locWeight;
        if (criteria.getLocation() == null || criteria.getLocation().isBlank()) {
            earnedWeight += locWeight;
        } else {
            String jobLoc = criteria.getLocation().toLowerCase();
            String candCity = profile != null && profile.getCurrentCity() != null ? profile.getCurrentCity().toLowerCase() : "";
            String candState = profile != null && profile.getState() != null ? profile.getState().toLowerCase() : "";
            String candPref = profile != null && profile.getPreferredLocation() != null ? profile.getPreferredLocation().toLowerCase() : "";

            if (candCity.contains(jobLoc) || jobLoc.contains(candCity)
                    || candState.contains(jobLoc) || jobLoc.contains(candState)
                    || candPref.contains(jobLoc) || candPref.contains("any") || candPref.contains("all india")) {
                earnedWeight += locWeight;
                String matchedLoc = !candState.isEmpty() ? profile.getState() : profile != null ? profile.getCurrentCity() : "Location match";
                result.getMatchingCriteria().add("Location: " + matchedLoc + " (Matched)");
            } else {
                String locDisplay = profile != null && profile.getState() != null ? profile.getState() : (profile != null && profile.getCurrentCity() != null ? profile.getCurrentCity() : "Other");
                result.getUnmetCriteria().add("Location: " + locDisplay + " (Job: " + criteria.getLocation() + ")");
            }
        }

        // Compute final score and eligibility
        int finalScore = Math.min(100, Math.max(0, (int) Math.round(((double) earnedWeight / totalWeight) * 100)));
        result.setScore(finalScore);
        result.setEligible(qualPass && specPass && expPass && regPass);

        return result;
    }
}
