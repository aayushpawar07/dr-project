package com.medexjob.controller;

import com.medexjob.entity.CandidateProfile;
import com.medexjob.entity.User;
import com.medexjob.repository.CandidateProfileRepository;
import com.medexjob.repository.UserRepository;
import com.medexjob.service.FileUploadService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/candidate-profiles")
public class CandidateProfileController {
    private final CandidateProfileRepository repository;
    private final UserRepository userRepository;
    private final FileUploadService fileUploadService;

    public CandidateProfileController(CandidateProfileRepository repository, UserRepository userRepository, FileUploadService fileUploadService) {
        this.repository = repository;
        this.userRepository = userRepository;
        this.fileUploadService = fileUploadService;
    }

    @GetMapping("/me")
    public ResponseEntity<?> me() {
        Optional<User> user = currentUser();
        if (user.isEmpty()) return ResponseEntity.status(401).body(Map.of("error", "Authentication required"));
        if (user.get().getRole() != User.UserRole.CANDIDATE) return ResponseEntity.status(403).body(Map.of("error", "Candidate account required"));
        CandidateProfile profile = repository.findByCandidateId(user.get().getId()).orElseGet(() -> createEmpty(user.get()));
        return ResponseEntity.ok(toResponse(profile));
    }

    @PutMapping("/me")
    public ResponseEntity<?> updateMe(@RequestBody Map<String, Object> body) {
        Optional<User> user = currentUser();
        if (user.isEmpty()) return ResponseEntity.status(401).body(Map.of("error", "Authentication required"));
        if (user.get().getRole() != User.UserRole.CANDIDATE) return ResponseEntity.status(403).body(Map.of("error", "Candidate account required"));

        CandidateProfile profile = repository.findByCandidateId(user.get().getId()).orElseGet(() -> {
            CandidateProfile created = new CandidateProfile();
            created.setCandidate(user.get());
            return created;
        });
        profile.setSpeciality(string(body.get("speciality")));
        profile.setSubSpeciality(string(body.get("subSpeciality")));
        profile.setQualification(string(body.get("qualification")));
        profile.setYearsExperience(integer(body.get("yearsExperience")));
        profile.setRegistrationCouncil(string(body.get("registrationCouncil")));
        profile.setRegistrationNumber(string(body.get("registrationNumber")));
        profile.setCurrentCity(string(body.get("currentCity")));
        profile.setState(string(body.get("state")));
        profile.setPreferredLocation(string(body.get("preferredLocation")));
        profile.setEmploymentPreference(string(body.get("employmentPreference")));
        profile.setProfileSummary(string(body.get("profileSummary")));
        profile.setProfilePhotoUrl(string(body.get("profilePhotoUrl")));
        profile.setMedicalCategory(string(body.get("medicalCategory")));
        profile.setCurrentOrganization(string(body.get("currentOrganization")));
        profile.setPreferredJobRole(string(body.get("preferredJobRole")));
        profile.setSkills(string(body.get("skills")));
        profile.setRegistrationYear(string(body.get("registrationYear")));
        profile.setRegistrationState(string(body.get("registrationState")));
        profile.setResumeUrl(string(body.get("resumeUrl")));
        profile.setResumeFileName(string(body.get("resumeFileName")));

        // Structured step-by-step qualification fields
        String profCat = string(body.get("professionalCategory"));
        if (profCat != null && !profCat.isBlank()) {
            profile.setProfessionalCategory(profCat);
            if (profile.getMedicalCategory() == null || profile.getMedicalCategory().isBlank()) {
                profile.setMedicalCategory(profCat);
            }
        }
        String basicQual = string(body.get("basicQualification"));
        if (basicQual != null && !basicQual.isBlank()) {
            profile.setBasicQualification(basicQual);
        }
        String highestQual = string(body.get("highestQualification"));
        if (highestQual != null && !highestQual.isBlank()) {
            profile.setHighestQualification(highestQual);
            if (profile.getQualification() == null || profile.getQualification().isBlank()) {
                profile.setQualification(highestQual);
            }
        } else if (basicQual != null && !basicQual.isBlank() && (profile.getQualification() == null || profile.getQualification().isBlank())) {
            profile.setQualification(basicQual);
        }
        profile.setSuperSpeciality(string(body.get("superSpeciality")));
        profile.setFellowship(string(body.get("fellowship")));
        profile.setExperienceBand(string(body.get("experienceBand")));
        profile.setExperienceMonths(integer(body.get("experienceMonths")));
        profile.setPreferredJobRoles(jsonOrString(body.get("preferredJobRoles")));
        profile.setPreferredSectors(jsonOrString(body.get("preferredSectors")));
        profile.setPreferredEmploymentTypes(jsonOrString(body.get("preferredEmploymentTypes")));
        profile.setLocationPreferenceType(string(body.get("locationPreferenceType")));
        profile.setPreferredStates(jsonOrString(body.get("preferredStates")));
        profile.setPreferredCities(jsonOrString(body.get("preferredCities")));
        profile.setJobAlertSettings(jsonOrString(body.get("jobAlertSettings")));

        return ResponseEntity.ok(toResponse(repository.save(profile)));
    }

    @PostMapping("/me/photo")
    public ResponseEntity<?> uploadPhoto(@RequestParam("file") MultipartFile file) {
        Optional<User> user = currentUser();
        if (user.isEmpty()) return ResponseEntity.status(401).body(Map.of("error", "Authentication required"));
        if (user.get().getRole() != User.UserRole.CANDIDATE) return ResponseEntity.status(403).body(Map.of("error", "Candidate account required"));
        if (file.isEmpty()) return ResponseEntity.badRequest().body(Map.of("error", "No file uploaded"));

        try {
            String url = fileUploadService.uploadFile(file, "profile-photos");
            CandidateProfile profile = repository.findByCandidateId(user.get().getId()).orElseGet(() -> {
                CandidateProfile created = new CandidateProfile();
                created.setCandidate(user.get());
                return created;
            });
            profile.setProfilePhotoUrl(url);
            CandidateProfile saved = repository.save(profile);
            return ResponseEntity.ok(toResponse(saved));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Failed to upload photo: " + e.getMessage()));
        }
    }

    @PostMapping("/me/resume")
    public ResponseEntity<?> uploadResume(@RequestParam("file") MultipartFile file) {
        Optional<User> user = currentUser();
        if (user.isEmpty()) return ResponseEntity.status(401).body(Map.of("error", "Authentication required"));
        if (user.get().getRole() != User.UserRole.CANDIDATE) return ResponseEntity.status(403).body(Map.of("error", "Candidate account required"));
        if (file.isEmpty()) return ResponseEntity.badRequest().body(Map.of("error", "No file uploaded"));

        try {
            String url = fileUploadService.uploadFile(file, "resumes");
            CandidateProfile profile = repository.findByCandidateId(user.get().getId()).orElseGet(() -> {
                CandidateProfile created = new CandidateProfile();
                created.setCandidate(user.get());
                return created;
            });
            profile.setResumeUrl(url);
            profile.setResumeFileName(file.getOriginalFilename());
            CandidateProfile saved = repository.save(profile);
            return ResponseEntity.ok(toResponse(saved));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Failed to upload resume: " + e.getMessage()));
        }
    }

    @GetMapping("/admin/insights")
    public ResponseEntity<?> adminInsights(
            @RequestParam(value = "speciality", required = false) String speciality,
            @RequestParam(value = "qualification", required = false) String qualification,
            @RequestParam(value = "state", required = false) String state,
            @RequestParam(value = "search", required = false) String search
    ) {
        Optional<User> user = currentUser();
        if (user.isEmpty()) return ResponseEntity.status(401).body(Map.of("error", "Authentication required"));
        if (user.get().getRole() != User.UserRole.ADMIN) return ResponseEntity.status(403).body(Map.of("error", "Admin role required"));

        List<CandidateProfile> all = repository.findAll();
        List<CandidateProfile> filtered = all.stream().filter(profile -> {
            if (!contains(profile.getSpeciality(), speciality)) return false;
            if (!contains(profile.getQualification(), qualification)) return false;
            if (!contains(profile.getState(), state)) return false;
            if (search != null && !search.isBlank()) {
                String q = search.trim().toLowerCase(Locale.ROOT);
                User candidate = profile.getCandidate();
                String haystack = String.join(" ",
                        candidate != null ? safe(candidate.getName()) : "",
                        candidate != null ? safe(candidate.getEmail()) : "",
                        safe(profile.getSpeciality()), safe(profile.getSubSpeciality()), safe(profile.getQualification()),
                        safe(profile.getCurrentCity()), safe(profile.getState()), safe(profile.getPreferredLocation())
                ).toLowerCase(Locale.ROOT);
                if (!haystack.contains(q)) return false;
            }
            return true;
        }).toList();

        Map<String, Long> specialityCounts = count(all, CandidateProfile::getSpeciality);
        Map<String, Long> qualificationCounts = count(all, CandidateProfile::getQualification);
        Map<String, Long> stateCounts = count(all, CandidateProfile::getState);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("totalProfiles", all.size());
        response.put("filteredProfiles", filtered.size());
        response.put("specialityCounts", specialityCounts);
        response.put("qualificationCounts", qualificationCounts);
        response.put("stateCounts", stateCounts);
        response.put("profiles", filtered.stream().map(this::toResponse).toList());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/search")
    public ResponseEntity<?> searchCandidates(
            @RequestParam(value = "qualification", required = false) String qualification,
            @RequestParam(value = "speciality", required = false) String speciality,
            @RequestParam(value = "jobRole", required = false) String jobRole,
            @RequestParam(value = "minExperience", required = false) Integer minExperience,
            @RequestParam(value = "maxExperience", required = false) Integer maxExperience,
            @RequestParam(value = "state", required = false) String state,
            @RequestParam(value = "city", required = false) String city,
            @RequestParam(value = "preferredLocation", required = false) String preferredLocation,
            @RequestParam(value = "candidateType", required = false) String candidateType,
            @RequestParam(value = "search", required = false) String search
    ) {
        Optional<User> user = currentUser();
        if (user.isEmpty()) return ResponseEntity.status(401).body(Map.of("error", "Authentication required"));
        if (user.get().getRole() != User.UserRole.EMPLOYER && user.get().getRole() != User.UserRole.ADMIN) {
            return ResponseEntity.status(403).body(Map.of("error", "Employer or Admin access required"));
        }

        List<CandidateProfile> all = repository.findAll();
        List<CandidateProfile> filtered = all.stream().filter(profile -> {
            if (!contains(profile.getQualification(), qualification)) return false;
            if (!contains(profile.getSpeciality(), speciality)) return false;
            if (!contains(profile.getPreferredJobRole(), jobRole)) return false;
            if (!contains(profile.getState(), state)) return false;
            if (!contains(profile.getCurrentCity(), city)) return false;
            if (!contains(profile.getPreferredLocation(), preferredLocation)) return false;
            if (!contains(profile.getMedicalCategory(), candidateType)) return false;

            if (minExperience != null && (profile.getYearsExperience() == null || profile.getYearsExperience() < minExperience)) {
                return false;
            }
            if (maxExperience != null && (profile.getYearsExperience() != null && profile.getYearsExperience() > maxExperience)) {
                return false;
            }

            if (search != null && !search.isBlank()) {
                String q = search.trim().toLowerCase(Locale.ROOT);
                User candidate = profile.getCandidate();
                String haystack = String.join(" ",
                        candidate != null ? safe(candidate.getName()) : "",
                        candidate != null ? safe(candidate.getEmail()) : "",
                        candidate != null ? safe(candidate.getPhone()) : "",
                        safe(profile.getSpeciality()), safe(profile.getSubSpeciality()),
                        safe(profile.getQualification()), safe(profile.getCurrentOrganization()),
                        safe(profile.getPreferredJobRole()), safe(profile.getMedicalCategory()),
                        safe(profile.getSkills()), safe(profile.getCurrentCity()),
                        safe(profile.getState()), safe(profile.getPreferredLocation()),
                        safe(profile.getProfileSummary())
                ).toLowerCase(Locale.ROOT);
                if (!haystack.contains(q)) return false;
            }
            return true;
        }).toList();

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("total", filtered.size());
        response.put("candidates", filtered.stream().map(this::toResponse).toList());
        return ResponseEntity.ok(response);
    }

    private CandidateProfile createEmpty(User candidate) {
        CandidateProfile profile = new CandidateProfile();
        profile.setCandidate(candidate);
        return repository.save(profile);
    }

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private Map<String, Object> toResponse(CandidateProfile profile) {
        Map<String, Object> map = new LinkedHashMap<>();
        User candidate = profile.getCandidate();
        map.put("id", profile.getId());
        map.put("candidateId", candidate != null ? candidate.getId() : null);
        map.put("name", candidate != null ? candidate.getName() : null);
        map.put("email", candidate != null ? candidate.getEmail() : null);
        map.put("phone", candidate != null ? candidate.getPhone() : null);
        map.put("speciality", profile.getSpeciality());
        map.put("subSpeciality", profile.getSubSpeciality());
        map.put("qualification", profile.getQualification());
        map.put("yearsExperience", profile.getYearsExperience());
        map.put("registrationCouncil", profile.getRegistrationCouncil());
        map.put("registrationNumber", profile.getRegistrationNumber());
        map.put("currentCity", profile.getCurrentCity());
        map.put("state", profile.getState());
        map.put("preferredLocation", profile.getPreferredLocation());
        map.put("employmentPreference", profile.getEmploymentPreference());
        map.put("profileSummary", profile.getProfileSummary());
        map.put("profilePhotoUrl", profile.getProfilePhotoUrl());
        map.put("medicalCategory", profile.getMedicalCategory());
        map.put("currentOrganization", profile.getCurrentOrganization());
        map.put("preferredJobRole", profile.getPreferredJobRole());
        map.put("skills", profile.getSkills());
        map.put("registrationYear", profile.getRegistrationYear());
        map.put("registrationState", profile.getRegistrationState());
        map.put("resumeUrl", profile.getResumeUrl());
        map.put("resumeFileName", profile.getResumeFileName());

        // Structured step-by-step qualification & job alert fields
        map.put("professionalCategory", profile.getProfessionalCategory() != null ? profile.getProfessionalCategory() : profile.getMedicalCategory());
        map.put("basicQualification", profile.getBasicQualification());
        map.put("highestQualification", profile.getHighestQualification() != null ? profile.getHighestQualification() : profile.getQualification());
        map.put("superSpeciality", profile.getSuperSpeciality());
        map.put("fellowship", profile.getFellowship());
        map.put("experienceBand", profile.getExperienceBand());
        map.put("experienceMonths", profile.getExperienceMonths());
        map.put("preferredJobRoles", parseJsonOrString(profile.getPreferredJobRoles()));
        map.put("preferredSectors", parseJsonOrString(profile.getPreferredSectors()));
        map.put("preferredEmploymentTypes", parseJsonOrString(profile.getPreferredEmploymentTypes()));
        map.put("locationPreferenceType", profile.getLocationPreferenceType());
        map.put("preferredStates", parseJsonOrString(profile.getPreferredStates()));
        map.put("preferredCities", parseJsonOrString(profile.getPreferredCities()));
        map.put("jobAlertSettings", parseJsonOrString(profile.getJobAlertSettings()));

        boolean isComplete = (profile.getSpeciality() != null || profile.getHighestQualification() != null || profile.getQualification() != null)
                && (profile.getState() != null || profile.getCurrentCity() != null || profile.getPreferredLocation() != null);
        map.put("profileComplete", isComplete);
        map.put("updatedAt", profile.getUpdatedAt());
        return map;
    }

    private String jsonOrString(Object value) {
        if (value == null) return null;
        if (value instanceof String s) return s.trim();
        try {
            return OBJECT_MAPPER.writeValueAsString(value);
        } catch (Exception e) {
            return String.valueOf(value);
        }
    }

    private Object parseJsonOrString(String value) {
        if (value == null || value.isBlank()) return null;
        String trimmed = value.trim();
        if ((trimmed.startsWith("[") && trimmed.endsWith("]")) || (trimmed.startsWith("{") && trimmed.endsWith("}"))) {
            try {
                return OBJECT_MAPPER.readValue(trimmed, Object.class);
            } catch (Exception ignored) {
            }
        }
        return value;
    }

    private Map<String, Long> count(List<CandidateProfile> profiles, Function<CandidateProfile, String> getter) {
        return profiles.stream().map(getter).filter(value -> value != null && !value.isBlank())
                .collect(Collectors.groupingBy(value -> value.trim(), TreeMap::new, Collectors.counting()));
    }

    private Optional<User> currentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) return Optional.empty();
        return userRepository.findByEmail(auth.getName());
    }
    private String string(Object value) { return value == null ? null : String.valueOf(value).trim(); }
    private Integer integer(Object value) {
        if (value == null || String.valueOf(value).isBlank()) return null;
        try { return Integer.parseInt(String.valueOf(value)); } catch (NumberFormatException ignored) { return null; }
    }
    private boolean contains(String value, String filter) { return filter == null || filter.isBlank() || (value != null && value.toLowerCase(Locale.ROOT).contains(filter.trim().toLowerCase(Locale.ROOT))); }
    private String safe(String value) { return value == null ? "" : value; }
}
