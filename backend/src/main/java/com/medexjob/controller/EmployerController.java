package com.medexjob.controller;

import com.medexjob.entity.Employer;
import com.medexjob.entity.User;
import com.medexjob.repository.EmployerRepository;
import com.medexjob.repository.UserRepository;
import com.medexjob.service.NotificationService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import jakarta.persistence.EntityManager;
import org.hibernate.Hibernate;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.*;
import java.util.ArrayList;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/employers")
public class EmployerController {

    private final EmployerRepository employerRepository;
    private final UserRepository userRepository;
    private final EntityManager entityManager;
    private final NotificationService notificationService;
    private final Path uploadPath = Paths.get("uploads/verification");

    public EmployerController(EmployerRepository employerRepository, UserRepository userRepository,
            EntityManager entityManager, NotificationService notificationService) {
        this.employerRepository = employerRepository;
        this.userRepository = userRepository;
        this.entityManager = entityManager;
        this.notificationService = notificationService;
        try {
            Files.createDirectories(uploadPath);
        } catch (IOException e) {
            throw new RuntimeException("Could not create verification upload directory", e);
        }
    }

    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<Map<String, Object>> getEmployers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String verificationStatus,
            @RequestParam(required = false) String search) {
        try {
            List<Employer> allEmployers;
            if (verificationStatus != null) {
                Employer.VerificationStatus status = Employer.VerificationStatus
                        .valueOf(verificationStatus.toUpperCase());
                allEmployers = employerRepository.findByVerificationStatusList(status);
            } else {
                allEmployers = employerRepository.findAllEmployers();
            }

            // Sort by createdAt descending
            allEmployers.sort((a, b) -> {
                if (a.getCreatedAt() == null && b.getCreatedAt() == null)
                    return 0;
                if (a.getCreatedAt() == null)
                    return 1;
                if (b.getCreatedAt() == null)
                    return -1;
                return b.getCreatedAt().compareTo(a.getCreatedAt());
            });

            // Manual pagination
            int totalElements = allEmployers.size();
            int totalPages = (int) Math.ceil((double) totalElements / size);
            int start = page * size;
            int end = Math.min(start + size, totalElements);
            List<Employer> paginatedEmployers = start < totalElements ? allEmployers.subList(start, end)
                    : new ArrayList<>();

            // Eagerly load user for each employer by accessing it within transaction
            for (Employer emp : paginatedEmployers) {
                try {
                    // Initialize the user proxy if it's lazy loaded
                    Hibernate.initialize(emp.getUser());
                    if (emp.getUser() != null) {
                        // Access user properties to ensure they're loaded
                        emp.getUser().getName();
                        emp.getUser().getEmail();
                    }
                } catch (Exception e) {
                    // If user is not accessible, toResponse will handle it
                    System.err.println(
                            "Warning: Could not load user for employer " + emp.getId() + ": " + e.getMessage());
                }
            }

            // Map to response
            List<Map<String, Object>> employers = paginatedEmployers.stream()
                    .map(this::toResponse)
                    .collect(Collectors.toList());

            Map<String, Object> response = new HashMap<>();
            response.put("employers", employers);
            response.put("totalElements", totalElements);
            response.put("totalPages", totalPages);
            response.put("currentPage", page);
            response.put("size", size);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            System.err.println("Error fetching employers: " + e.getClass().getName());
            System.err.println("Message: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of(
                    "error", "Failed to fetch employers",
                    "message", e.getMessage() != null ? e.getMessage() : "Internal server error"));
        }
    }

    /**
     * Create or get employer for current user
     * POST /api/employers/create
     */
    @PostMapping("/create")
    public ResponseEntity<?> createEmployer(@RequestBody(required = false) Map<String, Object> request) {
        try {
            // Get authenticated user
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

            if (authentication == null || !authentication.isAuthenticated()) {
                return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
            }

            String email = authentication.getName();
            Optional<User> userOpt = userRepository.findByEmail(email);

            if (userOpt.isEmpty()) {
                return ResponseEntity.status(404).body(Map.of("error", "User not found"));
            }

            User user = userOpt.get();

            // Check if employer already exists
            Optional<Employer> existingEmployer = employerRepository.findByUserId(user.getId());
            if (existingEmployer.isPresent()) {
                return ResponseEntity.ok(toResponse(existingEmployer.get()));
            }

            // Create new employer
            Employer employer = new Employer();
            employer.setUser(user);
            String companyName = request != null && request.containsKey("companyName")
                    ? (String) request.get("companyName")
                    : user.getName() + " Company";
            employer.setCompanyName(companyName);

            String companyTypeStr = request != null && request.containsKey("companyType")
                    ? (String) request.get("companyType")
                    : "HOSPITAL";
            employer.setCompanyType(Employer.CompanyType.valueOf(companyTypeStr.toUpperCase()));
            employer.setIsVerified(false);
            employer.setVerificationStatus(Employer.VerificationStatus.PENDING);
            employer.setEmployerStatus(Employer.EmployerStatus.ACTIVE);

            employer = employerRepository.save(employer);
            return ResponseEntity.ok(toResponse(employer));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Failed to create employer: " + e.getMessage()));
        }
    }

    public synchronized Employer getOrCreateEmployerForUser(User user) {
        return employerRepository.findByUserId(user.getId()).orElseGet(() -> {
            Employer employer = new Employer();
            employer.setUser(user);
            String companyName = user.getName() != null && !user.getName().trim().isEmpty()
                    ? user.getName()
                    : "My Organization";
            employer.setCompanyName(companyName);
            employer.setCompanyType(Employer.CompanyType.HOSPITAL);
            employer.setIsVerified(false);
            employer.setVerificationStatus(Employer.VerificationStatus.PENDING);
            employer.setEmployerStatus(Employer.EmployerStatus.ACTIVE);
            return employerRepository.save(employer);
        });
    }

    /**
     * Get employer profile for current authenticated user
     * GET /api/employers/me
     */
    @GetMapping("/me")
    public ResponseEntity<?> getCurrentEmployer() {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication == null || !authentication.isAuthenticated()) {
                return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
            }

            String email = authentication.getName();
            Optional<User> userOpt = userRepository.findByEmail(email);
            if (userOpt.isEmpty()) {
                return ResponseEntity.status(404).body(Map.of("error", "User not found"));
            }

            User user = userOpt.get();
            Employer employer = getOrCreateEmployerForUser(user);
            return ResponseEntity.ok(toResponse(employer));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Failed to get employer: " + e.getMessage()));
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getEmployer(@PathVariable UUID id) {
        // First try to find by employer ID
        Optional<Employer> employerOpt = employerRepository.findById(id);

        // If not found, try to find by user ID
        if (employerOpt.isEmpty()) {
            employerOpt = employerRepository.findByUserId(id);
        }

        // If still not found, check if this ID is a User with EMPLOYER role
        if (employerOpt.isEmpty()) {
            Optional<User> userOpt = userRepository.findById(id);
            if (userOpt.isPresent() && userOpt.get().getRole() == User.UserRole.EMPLOYER) {
                return ResponseEntity.ok(toResponse(getOrCreateEmployerForUser(userOpt.get())));
            }
        }

        return employerOpt
                .map(employer -> ResponseEntity.ok(toResponse(employer)))
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Get employer by user ID
     * GET /api/employers/user/{userId}
     */
    @GetMapping("/user/{userId}")
    public ResponseEntity<?> getEmployerByUserId(@PathVariable UUID userId) {
        Optional<Employer> employerOpt = employerRepository.findByUserId(userId);
        if (employerOpt.isEmpty()) {
            Optional<User> userOpt = userRepository.findById(userId);
            if (userOpt.isPresent() && userOpt.get().getRole() == User.UserRole.EMPLOYER) {
                return ResponseEntity.ok(toResponse(getOrCreateEmployerForUser(userOpt.get())));
            }
        }
        return employerOpt
                .map(employer -> ResponseEntity.ok(toResponse(employer)))
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}/verification")
    @Transactional
    public ResponseEntity<?> updateVerificationStatus(
            @PathVariable UUID id,
            @RequestParam String status,
            @RequestParam(required = false) String notes) {
        try {
            System.out.println("=== Update Verification Status Called ===");
            System.out.println("Employer ID: " + id);
            System.out.println("Status: " + status);
            System.out.println("Notes: " + notes);

            // Validate input
            if (id == null) {
                return ResponseEntity.status(400).body(Map.of("error", "Employer ID is required"));
            }
            if (status == null || status.trim().isEmpty()) {
                return ResponseEntity.status(400).body(Map.of("error", "Status is required"));
            }

            // Try to find employer with user, fallback to regular find if query fails
            Optional<Employer> employerOpt = Optional.empty();
            try {
                employerOpt = employerRepository.findByIdWithUser(id);
            } catch (Exception e) {
                System.err.println("Warning: findByIdWithUser failed, trying regular findById: " + e.getMessage());
                // Fallback to regular findById
                employerOpt = employerRepository.findById(id);
                if (employerOpt.isPresent()) {
                    Employer emp = employerOpt.get();
                    // Manually initialize user if it exists
                    try {
                        if (emp.getUser() != null) {
                            Hibernate.initialize(emp.getUser());
                            emp.getUser().getId(); // Access to trigger loading
                        }
                    } catch (Exception initEx) {
                        System.err.println("Warning: Could not initialize user: " + initEx.getMessage());
                    }
                }
            }

            if (employerOpt.isEmpty()) {
                System.out.println("Employer not found with ID: " + id);
                return ResponseEntity.status(404).body(Map.of("error", "Employer not found"));
            }

            Employer employer = employerOpt.get();

            // Validate that employer has a user
            if (employer.getUser() == null) {
                System.err.println("Error: Employer " + id + " does not have an associated user");
                return ResponseEntity.status(400).body(Map.of(
                        "error", "Invalid employer data",
                        "message", "Employer does not have an associated user. Please contact support."));
            }

            System.out.println("Employer found: " + employer.getCompanyName());

            // Validate status
            Employer.VerificationStatus verificationStatus;
            try {
                verificationStatus = Employer.VerificationStatus.valueOf(status.toUpperCase());
                System.out.println("Verification status validated: " + verificationStatus);
            } catch (IllegalArgumentException e) {
                System.out.println("Invalid status: " + status);
                return ResponseEntity.status(400).body(Map.of(
                        "error", "Invalid verification status",
                        "message", "Status must be one of: PENDING, APPROVED, REJECTED"));
            }

            // Update verification status
            employer.setVerificationStatus(verificationStatus);

            if (verificationStatus == Employer.VerificationStatus.APPROVED) {
                employer.setIsVerified(true);
                employer.setVerifiedAt(LocalDateTime.now());
                System.out.println("Setting employer as approved and verified");
            } else if (verificationStatus == Employer.VerificationStatus.REJECTED) {
                employer.setIsVerified(false);
                System.out.println("Setting employer as rejected");
            } else if (verificationStatus == Employer.VerificationStatus.PENDING) {
                employer.setIsVerified(false);
                System.out.println("Setting employer as pending");
            }

            if (notes != null && !notes.trim().isEmpty()) {
                employer.setVerificationNotes(notes);
                System.out.println("Notes set: " + notes);
            }

            // Ensure user is loaded before saving
            if (employer.getUser() != null) {
                try {
                    Hibernate.initialize(employer.getUser());
                    // Access user properties to ensure they're loaded
                    employer.getUser().getName();
                    employer.getUser().getEmail();
                    System.out.println("User initialized before save: " + employer.getUser().getEmail());
                } catch (Exception e) {
                    System.err.println("Warning: Could not initialize user before save: " + e.getMessage());
                }
            }

            System.out.println("Saving employer...");
            Employer saved;
            try {
                saved = employerRepository.save(employer);
                System.out.println("Employer saved with ID: " + saved.getId());
            } catch (Exception saveEx) {
                System.err.println("ERROR: Failed to save employer: " + saveEx.getClass().getName());
                System.err.println("Error message: " + saveEx.getMessage());
                if (saveEx.getCause() != null) {
                    System.err.println("Cause: " + saveEx.getCause().getMessage());
                }
                saveEx.printStackTrace();
                throw new RuntimeException("Failed to save employer: " + saveEx.getMessage(), saveEx);
            }

            // Flush to ensure save is committed
            try {
                employerRepository.flush();
                System.out.println("Flushed to database");
            } catch (Exception flushEx) {
                System.err.println("ERROR: Flush failed: " + flushEx.getClass().getName());
                System.err.println("Error message: " + flushEx.getMessage());
                flushEx.printStackTrace();
                // Don't throw - the save might still be successful, but log the error
                System.err.println("Warning: Flush failed but continuing: " + flushEx.getMessage());
            }

            // Reload with user to ensure everything is properly loaded within transaction
            // Use fallback mechanism similar to initial load
            try {
                Optional<Employer> reloadedOpt = employerRepository.findByIdWithUser(saved.getId());
                if (reloadedOpt.isPresent()) {
                    saved = reloadedOpt.get();
                    System.out.println("Employer reloaded with user");
                }
            } catch (Exception reloadEx) {
                System.err.println("Warning: Reload with user failed, using saved employer: " + reloadEx.getMessage());
                // Continue with the saved employer - it should still have the user loaded
                try {
                    if (saved.getUser() != null) {
                        Hibernate.initialize(saved.getUser());
                        saved.getUser().getId(); // Access to trigger loading
                    }
                } catch (Exception initEx) {
                    System.err.println("Warning: Could not initialize user after reload: " + initEx.getMessage());
                }
            }

            // Notify employer about verification status change
            // This is done in a separate try-catch to ensure it doesn't fail the
            // transaction
            try {
                if (saved.getUser() != null && saved.getUser().getId() != null) {
                    UUID userId = saved.getUser().getId();
                    String companyName = saved.getCompanyName() != null ? saved.getCompanyName() : "Unknown Company";

                    // Use NotificationService to create notification
                    // Wrap in try-catch to ensure notification failure doesn't break the main flow
                    try {
                        notificationService.notifyEmployerVerification(
                                userId,
                                companyName,
                                verificationStatus.name(),
                                saved.getId());
                        System.out.println("Verification notification sent to employer");
                    } catch (Exception notifEx) {
                        // Log but don't fail - notification is not critical
                        System.err
                                .println("Warning: Failed to send verification notification: " + notifEx.getMessage());
                        notifEx.printStackTrace();
                    }
                } else {
                    System.err.println("Warning: Cannot send notification - user is null or user ID is null");
                }
            } catch (Exception e) {
                // Log but don't fail - notification is not critical
                System.err.println("Warning: Error in notification block: " + e.getMessage());
                e.printStackTrace();
            }

            // Notify admin about new verification request (if status is PENDING)
            if (verificationStatus == Employer.VerificationStatus.PENDING) {
                try {
                    String companyName = saved.getCompanyName() != null ? saved.getCompanyName() : "Unknown Company";
                    notificationService.notifyAdminPendingApproval(
                            "employer_verification",
                            String.format("New employer verification request from %s", companyName),
                            saved.getId());
                } catch (Exception e) {
                    // Log but don't fail - admin notification is not critical
                    System.err.println("Warning: Error creating admin notification: " + e.getMessage());
                    e.printStackTrace();
                }
            }

            // Ensure user is fully initialized within transaction BEFORE creating response
            User userForResponse = null;
            if (saved.getUser() != null) {
                try {
                    Hibernate.initialize(saved.getUser());
                    // Access all user properties to ensure they're loaded within transaction
                    UUID userId = saved.getUser().getId();
                    String userName = saved.getUser().getName();
                    String userEmail = saved.getUser().getEmail();
                    System.out.println("User fully initialized: " + userEmail);
                    // Store user reference to avoid lazy loading issues
                    userForResponse = saved.getUser();
                } catch (Exception e) {
                    System.err.println("Warning: Could not fully initialize user: " + e.getMessage());
                    e.printStackTrace();
                    // Try to get user from repository if direct access fails
                    try {
                        if (saved.getUser() != null && saved.getUser().getId() != null) {
                            Optional<User> userOpt = userRepository.findById(saved.getUser().getId());
                            if (userOpt.isPresent()) {
                                userForResponse = userOpt.get();
                                System.out.println("User loaded from repository as fallback");
                            }
                        }
                    } catch (Exception repoEx) {
                        System.err.println("Warning: Could not load user from repository: " + repoEx.getMessage());
                    }
                }
            }

            System.out.println("Creating response within transaction...");
            // Use the existing toResponse method which handles all edge cases safely
            Map<String, Object> response;
            try {
                // Ensure we're still in transaction when calling toResponse
                response = toResponse(saved);
                response.put("message", "Verification status updated successfully");
                System.out.println("Response created successfully using toResponse method");
            } catch (Exception responseEx) {
                System.err.println("Error creating response with toResponse: " + responseEx.getClass().getName() + " - "
                        + responseEx.getMessage());
                responseEx.printStackTrace();
                // Create minimal response as fallback - extract all data safely
                response = new LinkedHashMap<>();
                try {
                    response.put("id", saved.getId() != null ? saved.getId().toString() : "N/A");
                    response.put("verificationStatus",
                            saved.getVerificationStatus() != null ? saved.getVerificationStatus().name().toLowerCase()
                                    : "pending");
                    response.put("isVerified", saved.getIsVerified() != null ? saved.getIsVerified() : false);

                    // Safely add user data if available
                    if (userForResponse != null) {
                        try {
                            response.put("userId",
                                    userForResponse.getId() != null ? userForResponse.getId().toString() : "N/A");
                            response.put("userName",
                                    userForResponse.getName() != null ? userForResponse.getName() : "N/A");
                            response.put("userEmail",
                                    userForResponse.getEmail() != null ? userForResponse.getEmail() : "N/A");
                        } catch (Exception userEx) {
                            System.err.println(
                                    "Warning: Could not add user data to fallback response: " + userEx.getMessage());
                        }
                    }

                    response.put("companyName", saved.getCompanyName() != null ? saved.getCompanyName() : "N/A");
                    response.put("message", "Verification status updated successfully");
                } catch (Exception fallbackEx) {
                    System.err.println("Error creating fallback response: " + fallbackEx.getMessage());
                    // Absolute minimal response
                    response = Map.of(
                            "id", saved.getId() != null ? saved.getId().toString() : "unknown",
                            "verificationStatus", verificationStatus.name().toLowerCase(),
                            "isVerified", verificationStatus == Employer.VerificationStatus.APPROVED,
                            "message", "Verification status updated successfully");
                }
                System.out.println("Using fallback response");
            }

            System.out.println("Returning response...");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            // Log the full exception for debugging
            System.err.println("=== ERROR in updateVerificationStatus ===");
            System.err.println("Error class: " + e.getClass().getName());
            System.err.println("Error message: " + e.getMessage());
            if (e.getCause() != null) {
                System.err.println("Cause: " + e.getCause().getMessage());
                System.err.println("Cause class: " + e.getCause().getClass().getName());
            }
            System.err.println("Stack trace:");
            e.printStackTrace();

            return ResponseEntity.status(500).body(Map.of(
                    "error", "Failed to update verification status",
                    "message", e.getMessage() != null ? e.getMessage() : "Internal server error",
                    "errorType", e.getClass().getSimpleName()));
        }
    }

    @PostMapping("/{id}/documents")
    public ResponseEntity<?> uploadVerificationDocument(
            @PathVariable UUID id,
            @RequestParam("document") MultipartFile document) {
        return employerRepository.findById(id)
                .map(employer -> {
                    try {
                        String fileName = id + "_" + document.getOriginalFilename();
                        Path filePath = uploadPath.resolve(fileName);
                        Files.copy(document.getInputStream(), filePath);

                        // In a real implementation, you'd store document references in a separate table
                        // For now, we'll just acknowledge the upload

                        Map<String, Object> response = new HashMap<>();
                        response.put("message", "Document uploaded successfully");
                        response.put("fileName", fileName);
                        return ResponseEntity.ok(response);
                    } catch (IOException e) {
                        return ResponseEntity.internalServerError().build();
                    }
                })
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Create a safe response for verification status update
     * This method ensures all data is accessed within transaction
     */
    private Map<String, Object> createVerificationResponse(Employer employer) {
        Map<String, Object> response = new LinkedHashMap<>();

        try {
            response.put("id", employer.getId() != null ? employer.getId().toString() : "N/A");

            // Safely access user
            User user = null;
            try {
                user = employer.getUser();
            } catch (Exception e) {
                System.err.println("Error accessing user: " + e.getMessage());
            }

            if (user != null) {
                try {
                    response.put("userId", user.getId() != null ? user.getId().toString() : "N/A");
                    response.put("userName", user.getName() != null ? user.getName() : "N/A");
                    response.put("userEmail", user.getEmail() != null ? user.getEmail() : "N/A");
                } catch (Exception e) {
                    System.err.println("Error accessing user properties: " + e.getMessage());
                    response.put("userId", "N/A");
                    response.put("userName", "N/A");
                    response.put("userEmail", "N/A");
                }
            } else {
                response.put("userId", "N/A");
                response.put("userName", "N/A");
                response.put("userEmail", "N/A");
            }

            // Company info
            response.put("companyName", employer.getCompanyName() != null ? employer.getCompanyName() : "N/A");
            response.put("companyType",
                    employer.getCompanyType() != null ? employer.getCompanyType().name().toLowerCase() : "N/A");

            // Verification info
            response.put("isVerified", employer.getIsVerified() != null ? employer.getIsVerified() : false);
            response.put("verificationStatus",
                    employer.getVerificationStatus() != null ? employer.getVerificationStatus().name().toLowerCase()
                            : "pending");
            response.put("verificationNotes", employer.getVerificationNotes());
            response.put("verifiedAt", employer.getVerifiedAt() != null ? employer.getVerifiedAt().toString() : null);
            response.put("createdAt", employer.getCreatedAt() != null ? employer.getCreatedAt().toString() : null);
            response.put("updatedAt", employer.getUpdatedAt() != null ? employer.getUpdatedAt().toString() : null);

            response.put("message", "Verification status updated successfully");

        } catch (Exception e) {
            System.err.println("Error creating verification response: " + e.getMessage());
            e.printStackTrace();
            // Return minimal response
            response.put("id", employer.getId() != null ? employer.getId().toString() : "N/A");
            response.put("verificationStatus",
                    employer.getVerificationStatus() != null ? employer.getVerificationStatus().name().toLowerCase()
                            : "pending");
            response.put("isVerified", employer.getIsVerified() != null ? employer.getIsVerified() : false);
            response.put("message", "Verification status updated successfully");
        }

        return response;
    }

    private Map<String, Object> toResponse(Employer employer) {
        if (employer == null) {
            System.err.println("Warning: toResponse called with null employer");
            return Map.of("error", "Employer is null");
        }

        Map<String, Object> m = new LinkedHashMap<>();

        // Ensure user is initialized if it's a lazy proxy
        try {
            if (employer.getUser() != null) {
                Hibernate.initialize(employer.getUser());
            }
        } catch (Exception e) {
            System.err.println("Warning: Could not initialize user in toResponse: " + e.getMessage());
        }

        try {
            m.put("id", employer.getId() != null ? employer.getId().toString() : "N/A");
        } catch (Exception e) {
            System.err.println("Error getting employer ID: " + e.getMessage());
            m.put("id", "N/A");
        }

        // Safely access user - it should be eagerly loaded, but handle if not
        try {
            User user = null;
            try {
                user = employer.getUser();
            } catch (Exception getUserEx) {
                System.err.println("Error getting user object: " + getUserEx.getMessage());
                getUserEx.printStackTrace();
            }

            if (user != null) {
                try {
                    m.put("userId", user.getId() != null ? user.getId().toString() : "N/A");
                } catch (Exception e) {
                    System.err.println("Error getting userId: " + e.getMessage());
                    m.put("userId", "N/A");
                }
                try {
                    m.put("userName", user.getName() != null ? user.getName() : "N/A");
                } catch (Exception e) {
                    System.err.println("Error getting userName: " + e.getMessage());
                    m.put("userName", "N/A");
                }
                try {
                    m.put("userEmail", user.getEmail() != null ? user.getEmail() : "N/A");
                } catch (Exception e) {
                    System.err.println("Error getting userEmail: " + e.getMessage());
                    m.put("userEmail", "N/A");
                }
            } else {
                System.err.println("Warning: User is null for employer "
                        + (employer.getId() != null ? employer.getId().toString() : "unknown"));
                m.put("userId", "N/A");
                m.put("userName", "N/A");
                m.put("userEmail", "N/A");
            }
        } catch (Exception e) {
            // If user is not loaded, set default values
            System.err.println("Error accessing user for employer: " + e.getClass().getName() + " - " + e.getMessage());
            e.printStackTrace();
            m.put("userId", "N/A");
            m.put("userName", "N/A");
            m.put("userEmail", "N/A");
        }

        try {
            m.put("companyName", employer.getCompanyName() != null ? employer.getCompanyName() : "N/A");
        } catch (Exception e) {
            System.err.println("Error getting company name: " + e.getMessage());
            m.put("companyName", "N/A");
        }

        try {
            m.put("companyType",
                    employer.getCompanyType() != null ? employer.getCompanyType().name().toLowerCase() : "N/A");
        } catch (Exception e) {
            System.err.println("Error getting company type: " + e.getMessage());
            m.put("companyType", "N/A");
        }

        try {
            m.put("companyDescription", employer.getCompanyDescription());
            m.put("website", employer.getWebsite());
            m.put("address", employer.getAddress());
            m.put("city", employer.getCity());
            m.put("state", employer.getState());
            m.put("pincode", employer.getPincode());
        } catch (Exception e) {
            System.err.println("Error getting company details: " + e.getMessage());
        }

        try {
            m.put("isVerified", employer.getIsVerified() != null ? employer.getIsVerified() : false);
        } catch (Exception e) {
            System.err.println("Error getting isVerified: " + e.getMessage());
            m.put("isVerified", false);
        }

        try {
            m.put("verificationStatus",
                    employer.getVerificationStatus() != null ? employer.getVerificationStatus().name().toLowerCase()
                            : "pending");
        } catch (Exception e) {
            System.err.println("Error getting verification status: " + e.getMessage());
            m.put("verificationStatus", "pending");
        }

        try {
            m.put("verificationNotes", employer.getVerificationNotes());
            m.put("verifiedAt", employer.getVerifiedAt() != null ? employer.getVerifiedAt().toString() : null);
            m.put("createdAt", employer.getCreatedAt() != null ? employer.getCreatedAt().toString() : null);
            m.put("updatedAt", employer.getUpdatedAt() != null ? employer.getUpdatedAt().toString() : null);
        } catch (Exception e) {
            System.err.println("Error getting verification details: " + e.getMessage());
        }

        // Add employerStatus
        try {
            m.put("employerStatus",
                    employer.getEmployerStatus() != null ? employer.getEmployerStatus().name().toLowerCase() : "active");
        } catch (Exception e) {
            System.err.println("Error getting employer status: " + e.getMessage());
            m.put("employerStatus", "active");
        }

        return m;
    }

    /**
     * Approve an employer
     * PUT /api/employers/{id}/approve
     */
    @PutMapping("/{id}/approve")
    @Transactional
    public ResponseEntity<?> approveEmployer(@PathVariable UUID id, @RequestParam(required = false) String notes) {
        try {
            Optional<Employer> employerOpt = employerRepository.findById(id);
            if (employerOpt.isEmpty()) {
                return ResponseEntity.status(404).body(Map.of("error", "Employer not found"));
            }

            Employer employer = employerOpt.get();
            employer.setVerificationStatus(Employer.VerificationStatus.APPROVED);
            employer.setIsVerified(true);
            employer.setVerifiedAt(LocalDateTime.now());
            employer.setEmployerStatus(Employer.EmployerStatus.ACTIVE);
            if (notes != null && !notes.trim().isEmpty()) {
                employer.setVerificationNotes(notes);
            }

            Employer saved = employerRepository.save(employer);

            // Send notification
            try {
                if (saved.getUser() != null) {
                    notificationService.notifyEmployerVerification(
                            saved.getUser().getId(),
                            saved.getCompanyName(),
                            "APPROVED",
                            saved.getId());
                }
            } catch (Exception e) {
                System.err.println("Warning: Failed to send notification: " + e.getMessage());
            }

            return ResponseEntity.ok(toResponse(saved));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Failed to approve employer: " + e.getMessage()));
        }
    }

    /**
     * Reject an employer
     * PUT /api/employers/{id}/reject
     */
    @PutMapping("/{id}/reject")
    @Transactional
    public ResponseEntity<?> rejectEmployer(@PathVariable UUID id, @RequestParam(required = false) String notes) {
        try {
            Optional<Employer> employerOpt = employerRepository.findById(id);
            if (employerOpt.isEmpty()) {
                return ResponseEntity.status(404).body(Map.of("error", "Employer not found"));
            }

            Employer employer = employerOpt.get();
            employer.setVerificationStatus(Employer.VerificationStatus.REJECTED);
            employer.setIsVerified(false);
            if (notes != null && !notes.trim().isEmpty()) {
                employer.setVerificationNotes(notes);
            }

            Employer saved = employerRepository.save(employer);

            // Send notification
            try {
                if (saved.getUser() != null) {
                    notificationService.notifyEmployerVerification(
                            saved.getUser().getId(),
                            saved.getCompanyName(),
                            "REJECTED",
                            saved.getId());
                }
            } catch (Exception e) {
                System.err.println("Warning: Failed to send notification: " + e.getMessage());
            }

            return ResponseEntity.ok(toResponse(saved));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Failed to reject employer: " + e.getMessage()));
        }
    }

    /**
     * Discontinue an employer
     * PUT /api/employers/{id}/discontinue
     */
    @PutMapping("/{id}/discontinue")
    @Transactional
    public ResponseEntity<?> discontinueEmployer(@PathVariable UUID id) {
        try {
            Optional<Employer> employerOpt = employerRepository.findById(id);
            if (employerOpt.isEmpty()) {
                return ResponseEntity.status(404).body(Map.of("error", "Employer not found"));
            }

            Employer employer = employerOpt.get();
            
            // Only approved employers can be discontinued
            if (employer.getVerificationStatus() != Employer.VerificationStatus.APPROVED) {
                return ResponseEntity.status(400).body(Map.of("error", "Only approved employers can be discontinued"));
            }

            employer.setEmployerStatus(Employer.EmployerStatus.DISCONTINUED);
            Employer saved = employerRepository.save(employer);

            // Send notification
            try {
                if (saved.getUser() != null) {
                    notificationService.createNotification(
                            saved.getUser().getId(),
                            "Employer Account Discontinued",
                            "Your employer account for " + saved.getCompanyName() + " has been discontinued by admin.",
                            "employer_status",
                            saved.getId().toString());
                }
            } catch (Exception e) {
                System.err.println("Warning: Failed to send notification: " + e.getMessage());
            }

            return ResponseEntity.ok(toResponse(saved));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Failed to discontinue employer: " + e.getMessage()));
        }
    }

    /**
     * Continue/Reactivate an employer
     * PUT /api/employers/{id}/continue
     */
    @PutMapping("/{id}/continue")
    @Transactional
    public ResponseEntity<?> continueEmployer(@PathVariable UUID id) {
        try {
            Optional<Employer> employerOpt = employerRepository.findById(id);
            if (employerOpt.isEmpty()) {
                return ResponseEntity.status(404).body(Map.of("error", "Employer not found"));
            }

            Employer employer = employerOpt.get();
            
            // Only approved employers can be continued
            if (employer.getVerificationStatus() != Employer.VerificationStatus.APPROVED) {
                return ResponseEntity.status(400).body(Map.of("error", "Only approved employers can be reactivated"));
            }

            employer.setEmployerStatus(Employer.EmployerStatus.ACTIVE);
            Employer saved = employerRepository.save(employer);

            // Send notification
            try {
                if (saved.getUser() != null) {
                    notificationService.createNotification(
                            saved.getUser().getId(),
                            "Employer Account Reactivated",
                            "Your employer account for " + saved.getCompanyName() + " has been reactivated by admin.",
                            "employer_status",
                            saved.getId().toString());
                }
            } catch (Exception e) {
                System.err.println("Warning: Failed to send notification: " + e.getMessage());
            }

            return ResponseEntity.ok(toResponse(saved));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Failed to continue employer: " + e.getMessage()));
        }
    }
}
