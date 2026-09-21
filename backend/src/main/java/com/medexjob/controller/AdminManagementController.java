// AI assisted development
package com.medexjob.controller;

import com.medexjob.dto.CreateAdminRequest;
import com.medexjob.dto.UpdateAdminRequest;
import com.medexjob.dto.ResetAdminPasswordRequest;
import com.medexjob.dto.AdminUserResponse;
import com.medexjob.entity.User;
import com.medexjob.service.AdminManagementService;
import jakarta.validation.Valid;
import com.medexjob.entity.CandidateProfile;
import com.medexjob.entity.Employer;
import com.medexjob.repository.*;
import com.medexjob.security.JwtTokenProvider;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/admin/users")
@PreAuthorize("hasRole('ADMIN')")
public class AdminManagementController {

    @Autowired
    private AdminManagementService adminManagementService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EmployerRepository employerRepository;

    @Autowired
    private CandidateProfileRepository candidateProfileRepository;

    @Autowired
    private JobRepository jobRepository;

    @Autowired
    private ApplicationRepository applicationRepository;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    // ---------------- Get Full User Directory (Candidates, Employers, Admins) ----------------
    @GetMapping("/directory")
    public ResponseEntity<?> getUserDirectory(
            @RequestParam(value = "role", required = false) String role,
            @RequestParam(value = "search", required = false) String search
    ) {
        List<User> users = userRepository.findAll();
        List<Map<String, Object>> result = new ArrayList<>();

        for (User u : users) {
            String roleStr = u.getRole() != null ? u.getRole().name().toLowerCase() : "";
            if (role != null && !role.isBlank() && !role.equalsIgnoreCase("all") && !roleStr.equalsIgnoreCase(role.trim())) {
                continue;
            }

            if (search != null && !search.isBlank()) {
                String q = search.trim().toLowerCase(Locale.ROOT);
                String name = u.getName() != null ? u.getName().toLowerCase(Locale.ROOT) : "";
                String email = u.getEmail() != null ? u.getEmail().toLowerCase(Locale.ROOT) : "";
                String phone = u.getPhone() != null ? u.getPhone().toLowerCase(Locale.ROOT) : "";
                if (!name.contains(q) && !email.contains(q) && !phone.contains(q)) {
                    continue;
                }
            }

            Map<String, Object> map = new LinkedHashMap<>();
            map.put("id", u.getId().toString());
            map.put("name", u.getName());
            map.put("email", u.getEmail());
            map.put("phone", u.getPhone());
            map.put("role", roleStr);
            map.put("isActive", Boolean.TRUE.equals(u.getIsActive()));
            map.put("isVerified", Boolean.TRUE.equals(u.getIsVerified()));
            map.put("createdAt", u.getCreatedAt() != null ? u.getCreatedAt().toString() : null);

            if (u.getRole() == User.UserRole.CANDIDATE) {
                Optional<CandidateProfile> cpOpt = candidateProfileRepository.findByCandidateId(u.getId());
                if (cpOpt.isPresent()) {
                    CandidateProfile cp = cpOpt.get();
                    map.put("qualification", cp.getQualification());
                    map.put("speciality", cp.getSpeciality());
                    map.put("currentCity", cp.getCurrentCity());
                    map.put("state", cp.getState());
                    map.put("currentOrganization", cp.getCurrentOrganization());
                    map.put("preferredJobRole", cp.getPreferredJobRole());
                    map.put("resumeUrl", cp.getResumeUrl());
                    map.put("resumeFileName", cp.getResumeFileName());
                    map.put("profilePhotoUrl", cp.getProfilePhotoUrl());
                    map.put("medicalCategory", cp.getMedicalCategory());
                    map.put("yearsExperience", cp.getYearsExperience());
                }
                try {
                    map.put("applicationsCount", applicationRepository.countByCandidateId(u.getId()));
                } catch (Exception ignored) {
                    map.put("applicationsCount", 0);
                }
            } else if (u.getRole() == User.UserRole.EMPLOYER) {
                Optional<Employer> empOpt = employerRepository.findByUserId(u.getId());
                if (empOpt.isPresent()) {
                    Employer emp = empOpt.get();
                    map.put("companyName", emp.getCompanyName());
                    map.put("companyType", emp.getCompanyType() != null ? emp.getCompanyType().name().toLowerCase() : null);
                    map.put("verificationStatus", emp.getVerificationStatus() != null ? emp.getVerificationStatus().name().toLowerCase() : null);
                    map.put("city", emp.getCity());
                    map.put("state", emp.getState());
                    try {
                        map.put("jobsCount", jobRepository.countByEmployerId(emp.getId()));
                    } catch (Exception ignored) {
                        map.put("jobsCount", 0);
                    }
                }
            }

            result.add(map);
        }

        return ResponseEntity.ok(result);
    }

    // ---------------- Impersonate User / View As ----------------
    @PostMapping("/impersonate/{userId}")
    public ResponseEntity<?> impersonateUser(@PathVariable UUID userId) {
        User target = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found with id: " + userId));

        // Ensure user is verified so they can immediately access their dashboard without 401s
        if (!Boolean.TRUE.equals(target.getIsVerified())) {
            target.setIsVerified(true);
            userRepository.save(target);
        }

        if (target.getRole() == User.UserRole.EMPLOYER) {
            employerRepository.findByUserId(target.getId()).ifPresent(emp -> {
                if (!Boolean.TRUE.equals(emp.getIsVerified()) || emp.getVerificationStatus() != Employer.VerificationStatus.APPROVED) {
                    emp.setIsVerified(true);
                    emp.setVerificationStatus(Employer.VerificationStatus.APPROVED);
                    employerRepository.save(emp);
                }
            });
        }

        String token = jwtTokenProvider.generateToken(target.getEmail());

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("token", token);
        Map<String, Object> userData = new LinkedHashMap<>();
        userData.put("id", target.getId().toString());
        userData.put("name", target.getName());
        userData.put("email", target.getEmail());
        userData.put("phone", target.getPhone());
        userData.put("role", target.getRole().name().toLowerCase());
        response.put("user", userData);
        response.put("message", "Impersonation session created for " + target.getName());
        return ResponseEntity.ok(response);
    }

    // ---------------- Toggle User Active Status ----------------
    @PutMapping("/{userId}/toggle-status")
    public ResponseEntity<?> toggleUserStatus(@PathVariable UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found with id: " + userId));

        boolean newStatus = !Boolean.TRUE.equals(user.getIsActive());
        user.setIsActive(newStatus);
        userRepository.save(user);

        return ResponseEntity.ok(Map.of(
                "message", "User status updated to " + (newStatus ? "Active" : "Inactive"),
                "isActive", newStatus
        ));
    }

    // ---------------- Get Full Profile for Any User ----------------
    @GetMapping("/{userId}/full-profile")
    public ResponseEntity<?> getFullProfile(@PathVariable UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found with id: " + userId));

        Map<String, Object> profile = new LinkedHashMap<>();
        profile.put("user", Map.of(
                "id", user.getId().toString(),
                "name", user.getName(),
                "email", user.getEmail(),
                "phone", user.getPhone() != null ? user.getPhone() : "",
                "role", user.getRole().name().toLowerCase(),
                "isActive", Boolean.TRUE.equals(user.getIsActive()),
                "isVerified", Boolean.TRUE.equals(user.getIsVerified()),
                "createdAt", user.getCreatedAt() != null ? user.getCreatedAt().toString() : ""
        ));

        if (user.getRole() == User.UserRole.CANDIDATE) {
            candidateProfileRepository.findByCandidateId(user.getId()).ifPresent(cp -> {
                Map<String, Object> cpMap = new LinkedHashMap<>();
                cpMap.put("qualification", cp.getQualification());
                cpMap.put("speciality", cp.getSpeciality());
                cpMap.put("subSpeciality", cp.getSubSpeciality());
                cpMap.put("medicalCategory", cp.getMedicalCategory());
                cpMap.put("yearsExperience", cp.getYearsExperience());
                cpMap.put("currentOrganization", cp.getCurrentOrganization());
                cpMap.put("currentCity", cp.getCurrentCity());
                cpMap.put("state", cp.getState());
                cpMap.put("preferredJobRole", cp.getPreferredJobRole());
                cpMap.put("preferredLocation", cp.getPreferredLocation());
                cpMap.put("skills", cp.getSkills());
                cpMap.put("registrationCouncil", cp.getRegistrationCouncil());
                cpMap.put("registrationNumber", cp.getRegistrationNumber());
                cpMap.put("registrationYear", cp.getRegistrationYear());
                cpMap.put("registrationState", cp.getRegistrationState());
                cpMap.put("resumeUrl", cp.getResumeUrl());
                cpMap.put("resumeFileName", cp.getResumeFileName());
                cpMap.put("profilePhotoUrl", cp.getProfilePhotoUrl());
                cpMap.put("employmentPreference", cp.getEmploymentPreference());
                cpMap.put("profileSummary", cp.getProfileSummary());
                profile.put("candidateProfile", cpMap);
                profile.put("profile", cpMap);
            });
        } else if (user.getRole() == User.UserRole.EMPLOYER) {
            employerRepository.findByUserId(user.getId()).ifPresent(emp -> {
                Map<String, Object> empMap = new LinkedHashMap<>();
                empMap.put("id", emp.getId().toString());
                empMap.put("companyName", emp.getCompanyName());
                empMap.put("companyType", emp.getCompanyType() != null ? emp.getCompanyType().name().toLowerCase() : null);
                empMap.put("companyDescription", emp.getCompanyDescription());
                empMap.put("website", emp.getWebsite());
                empMap.put("address", emp.getAddress());
                empMap.put("city", emp.getCity());
                empMap.put("state", emp.getState());
                empMap.put("pincode", emp.getPincode());
                empMap.put("verificationStatus", emp.getVerificationStatus() != null ? emp.getVerificationStatus().name().toLowerCase() : null);
                empMap.put("isVerified", emp.getIsVerified());
                profile.put("employerProfile", empMap);
                profile.put("employer", empMap);
                profile.put("profile", empMap);
            });
        }

        return ResponseEntity.ok(profile);
    }

    // ---------------- Get All Admins ----------------
    @GetMapping
    public ResponseEntity<List<AdminUserResponse>> getAllAdmins() {
        List<User> admins = adminManagementService.getAllAdmins();
        List<AdminUserResponse> response = admins.stream()
                .map(AdminUserResponse::new)
                .toList();
        return ResponseEntity.ok(response);
    }

    // ---------------- Get Admin by ID ----------------
    @GetMapping("/{id}")
    public ResponseEntity<AdminUserResponse> getAdminById(@PathVariable UUID id) {
        User admin = adminManagementService.getAdminById(id);
        return ResponseEntity.ok(new AdminUserResponse(admin));
    }

    // ---------------- Create Admin ----------------
    @PostMapping
    public ResponseEntity<?> createAdmin(@Valid @RequestBody CreateAdminRequest request) {
        User admin = adminManagementService.createAdmin(request);
        Map<String, Object> response = new HashMap<>();
        response.put("message", "Admin created successfully");
        response.put("admin", new AdminUserResponse(admin));
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // ---------------- Update Admin ----------------
    @PutMapping("/{id}")
    public ResponseEntity<?> updateAdmin(@PathVariable UUID id, @Valid @RequestBody UpdateAdminRequest request) {
        User admin = adminManagementService.updateAdmin(id, request);
        Map<String, Object> response = new HashMap<>();
        response.put("message", "Admin updated successfully");
        response.put("admin", new AdminUserResponse(admin));
        return ResponseEntity.ok(response);
    }

    // ---------------- Reset Admin Password ----------------
    @PutMapping("/{id}/password")
    public ResponseEntity<?> resetAdminPassword(@PathVariable UUID id,
            @Valid @RequestBody ResetAdminPasswordRequest request) {
        adminManagementService.resetAdminPassword(id, request);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Admin password reset successfully");
        return ResponseEntity.ok(response);
    }

    // ---------------- Delete Admin ----------------
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteAdmin(@PathVariable UUID id) {
        adminManagementService.deleteAdmin(id);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Admin deleted successfully");
        return ResponseEntity.ok(response);
    }
}
