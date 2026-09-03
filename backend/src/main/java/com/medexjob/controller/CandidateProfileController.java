package com.medexjob.controller;

import com.medexjob.entity.CandidateProfile;
import com.medexjob.entity.User;
import com.medexjob.repository.CandidateProfileRepository;
import com.medexjob.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/candidate-profiles")
public class CandidateProfileController {
    private final CandidateProfileRepository repository;
    private final UserRepository userRepository;

    public CandidateProfileController(CandidateProfileRepository repository, UserRepository userRepository) {
        this.repository = repository;
        this.userRepository = userRepository;
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
        return ResponseEntity.ok(toResponse(repository.save(profile)));
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

    private CandidateProfile createEmpty(User candidate) {
        CandidateProfile profile = new CandidateProfile();
        profile.setCandidate(candidate);
        return repository.save(profile);
    }

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
        map.put("profileComplete", profile.getSpeciality() != null && profile.getQualification() != null && profile.getState() != null);
        map.put("updatedAt", profile.getUpdatedAt());
        return map;
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
