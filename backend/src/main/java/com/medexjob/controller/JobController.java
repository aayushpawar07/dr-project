package com.medexjob.controller;

import com.medexjob.entity.Employer;
import com.medexjob.entity.User;
import com.medexjob.entity.Subscription;
import com.medexjob.repository.UserRepository;
import com.medexjob.entity.Job;
import com.medexjob.repository.JobRepository;
import com.medexjob.repository.EmployerRepository;
import com.medexjob.repository.SubscriptionRepository;
import com.medexjob.service.NotificationService;
import com.medexjob.service.JobSearchService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*; // Contains @CrossOrigin
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;

@RestController
@RequestMapping("/api/jobs")
public class JobController {

    private static final Logger logger = LoggerFactory.getLogger(JobController.class);
    
    private final JobRepository jobRepository;
    private final EmployerRepository employerRepository;
    private final UserRepository userRepository; // Inject UserRepository
    private final SubscriptionRepository subscriptionRepository;
    private final NotificationService notificationService;
    private final JobSearchService jobSearchService;
    private final PasswordEncoder passwordEncoder;
    private final com.medexjob.service.FileUploadService fileUploadService;

    public JobController(JobRepository jobRepository, EmployerRepository employerRepository, UserRepository userRepository, SubscriptionRepository subscriptionRepository, NotificationService notificationService, JobSearchService jobSearchService, PasswordEncoder passwordEncoder, com.medexjob.service.FileUploadService fileUploadService) {
        this.jobRepository = jobRepository;
        this.employerRepository = employerRepository;
        this.userRepository = userRepository;
        this.subscriptionRepository = subscriptionRepository;
        this.notificationService = notificationService;
        this.jobSearchService = jobSearchService;
        this.passwordEncoder = passwordEncoder;
        this.fileUploadService = fileUploadService;
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> list(
            @RequestParam(value = "search", required = false) String search,
            @RequestParam(value = "sector", required = false) String sector,
            @RequestParam(value = "category", required = false) String category,
            @RequestParam(value = "location", required = false) String location,
            @RequestParam(value = "experienceLevel", required = false) String experienceLevel,
            @RequestParam(value = "speciality", required = false) String speciality,
            @RequestParam(value = "dutyType", required = false) String dutyType,
            @RequestParam(value = "status", required = false) String status,
            @RequestParam(value = "featured", required = false) Boolean featured,
            @RequestParam(value = "department", required = false) String department,
            @RequestParam(value = "qualification", required = false) String qualification,
            @RequestParam(value = "jobType", required = false) String jobType,
            @RequestParam(value = "state", required = false) String state,
            @RequestParam(value = "city", required = false) String city,
            @RequestParam(value = "salary", required = false) String salary,
            @RequestParam(value = "openOnly", defaultValue = "false") boolean openOnly,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size,
            @RequestParam(value = "sort", defaultValue = "createdAt,desc") String sort
    ) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 100);
        String[] sortParts = sort.split(",");
        String sortField = isAllowedSortField(sortParts[0]) ? sortParts[0] : "createdAt";
        Sort.Direction direction = sortParts.length > 1 && sortParts[1].equalsIgnoreCase("asc")
                ? Sort.Direction.ASC : Sort.Direction.DESC;
        Pageable pageable = PageRequest.of(safePage, safeSize, Sort.by(direction, sortField));

        // Candidate-facing listings must never expose draft/pending/closed records.
        // Administrative status filtering is handled by /api/admin/jobs.
        Job.JobStatus statusFilter = Job.JobStatus.ACTIVE;

        Job.JobSector sectorFilter = hasText(sector) ? parseSector(sector) : null;
        if (hasText(sector) && sectorFilter == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid sector. Use government or private."));
        }
        Job.JobCategory categoryFilter = hasText(category) ? mapCategoryFromLabel(category) : null;
        Job.ExperienceLevel experienceFilter = hasText(experienceLevel) ? parseExperienceLevel(experienceLevel) : null;
        Job.DutyType dutyFilter = hasText(dutyType) ? parseDutyType(dutyType) : null;

        Page<Job> result = jobSearchService.searchJobsAdvanced(
                search,
                location,
                sectorFilter,
                categoryFilter,
                experienceFilter,
                speciality,
                dutyFilter,
                statusFilter,
                featured,
                department,
                qualification,
                jobType,
                state,
                city,
                salary,
                openOnly,
                pageable
        );

        Map<String, Object> body = new HashMap<>();
        body.put("content", result.getContent().stream().map(this::toResponse).collect(Collectors.toList()));
        body.put("page", result.getNumber());
        body.put("size", result.getSize());
        body.put("totalElements", result.getTotalElements());
        body.put("totalPages", result.getTotalPages());
        return ResponseEntity.ok(body);
    }

    /**
     * Live type-ahead suggestions. Results are produced from the current ACTIVE
     * job dataset on every request and respect the requested Government/Private sector.
     */
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    @GetMapping("/suggestions")
    public ResponseEntity<List<String>> suggestions(
            @RequestParam("q") String query,
            @RequestParam(value = "sector", required = false) String sector,
            @RequestParam(value = "limit", defaultValue = "8") int limit
    ) {
        if (!hasText(query) || query.trim().isEmpty()) {
            return ResponseEntity.ok(Collections.emptyList());
        }

        int safeLimit = Math.min(Math.max(limit, 1), 20);
        Job.JobSector sectorFilter = hasText(sector) ? parseSector(sector) : null;
        if (hasText(sector) && sectorFilter == null) {
            return ResponseEntity.badRequest().body(Collections.<String>emptyList());
        }
        Page<Job> matches = jobSearchService.searchJobsAdvanced(
                query,
                null,
                sectorFilter,
                null,
                null,
                null,
                null,
                Job.JobStatus.ACTIVE,
                null,
                PageRequest.of(0, safeLimit)
        );

        LinkedHashSet<String> suggestions = new LinkedHashSet<>();
        String needle = query.trim().toLowerCase(Locale.ROOT);
        for (Job job : matches.getContent()) {
            addSuggestion(suggestions, job.getTitle(), needle, safeLimit);
            if (job.getEmployer() != null) {
                addSuggestion(suggestions, job.getEmployer().getCompanyName(), needle, safeLimit);
            }
            addSuggestion(suggestions, job.getSpeciality(), needle, safeLimit);
            addSuggestion(suggestions, job.getDepartment(), needle, safeLimit);
            addSuggestion(suggestions, job.getLocation(), needle, safeLimit);
            if (suggestions.size() >= safeLimit) {
                break;
            }
        }
        return ResponseEntity.ok(suggestions.stream().limit(safeLimit).toList());
    }

    // Get jobs by employer ID
    @GetMapping("/employer/{employerId}")
    public ResponseEntity<Map<String, Object>> getJobsByEmployer(
            @PathVariable UUID employerId,
            @RequestParam(value = "status", required = false) String status,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "1000") int size
    ) {
        try {
            // Parse status filter if provided - make it final for lambda
            final Job.JobStatus statusFilter = (status != null && !status.equalsIgnoreCase("all")) 
                ? parseStatus(status) : null;
            
            List<Job> allJobs = jobRepository.findByEmployerId(employerId);
            
            // If test account has no jobs yet, seed them on the fly
            if (allJobs.isEmpty()) {
                try {
                    Optional<Employer> empOpt = employerRepository.findById(employerId);
                    if (empOpt.isPresent()) {
                        Employer emp = empOpt.get();
                        String empEmail = emp.getUser() != null ? emp.getUser().getEmail() : "";
                        if ("cricketloverayush9999@gmail.com".equalsIgnoreCase(empEmail)) {
                            seedSampleJobsForEmployer(emp);
                            allJobs = jobRepository.findByEmployerId(employerId);
                        }
                    }
                } catch (Exception seedEx) {
                    logger.warn("Could not auto-seed sample jobs for test account: {}", seedEx.getMessage());
                }
            }
            
            // Filter by status if provided
            List<Job> filteredJobs = statusFilter != null 
                ? allJobs.stream()
                    .filter(job -> job.getStatus() == statusFilter)
                    .collect(Collectors.toList())
                : allJobs;
            
            // Manual pagination
            int totalElements = filteredJobs.size();
            int totalPages = (int) Math.ceil((double) totalElements / size);
            int start = page * size;
            int end = Math.min(start + size, totalElements);
            List<Job> paginatedJobs = start < totalElements ? filteredJobs.subList(start, end) : new ArrayList<>();
            
            Map<String, Object> body = new HashMap<>();
            body.put("content", paginatedJobs.stream().map(this::toResponse).collect(Collectors.toList()));
            body.put("page", page);
            body.put("size", size);
            body.put("totalElements", totalElements);
            body.put("totalPages", totalPages);
            return ResponseEntity.ok(body);
        } catch (Exception e) {
            logger.error("Error fetching jobs for employer: {}", employerId, e);
            return ResponseEntity.status(500).body(Map.of("error", "Failed to fetch jobs: " + e.getMessage()));
        }
    }

    // Candidate-facing filter metadata. The optional sector keeps Government
    // and Private pages segregated all the way down to category/location options.
    @GetMapping("/meta")
    public ResponseEntity<Map<String, Object>> meta(
            @RequestParam(value = "sector", required = false) String sector) {
        Job.JobSector sectorFilter = null;
        if (hasText(sector)) {
            sectorFilter = parseSector(sector);
            if (sectorFilter == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Invalid sector. Use government or private."));
            }
        }

        List<String> categories = jobRepository
                .findDistinctCategoriesForPublic(Job.JobStatus.ACTIVE, sectorFilter).stream()
                .map(this::mapCategoryToLabel)
                .filter(Objects::nonNull)
                .distinct()
                .sorted()
                .collect(Collectors.toList());

        List<String> locations = jobRepository
                .findDistinctLocationsForPublic(Job.JobStatus.ACTIVE, sectorFilter).stream()
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .distinct()
                .sorted()
                .collect(Collectors.toList());

        LinkedHashSet<String> states = new LinkedHashSet<>();
        LinkedHashSet<String> cities = new LinkedHashSet<>();
        for (String loc : locations) {
            String[] parts = loc.split(",");
            if (parts.length >= 2) {
                cities.add(parts[0].trim());
                states.add(parts[parts.length - 1].trim());
            } else if (!loc.isBlank()) {
                cities.add(loc);
            }
        }

        Map<String, Object> body = new HashMap<>();
        body.put("categories", categories);
        body.put("locations", locations);
        body.put("specialities", distinctStrings(jobRepository.findDistinctSpecialitiesForPublic(Job.JobStatus.ACTIVE, sectorFilter)));
        body.put("departments", distinctStrings(jobRepository.findDistinctDepartmentsForPublic(Job.JobStatus.ACTIVE, sectorFilter)));
        body.put("jobTypes", distinctStrings(jobRepository.findDistinctJobTypesForPublic(Job.JobStatus.ACTIVE, sectorFilter)));
        body.put("qualifications", distinctStrings(jobRepository.findDistinctQualificationsForPublic(Job.JobStatus.ACTIVE, sectorFilter)));
        body.put("states", states.stream().sorted().toList());
        body.put("cities", cities.stream().sorted().toList());
        return ResponseEntity.ok(body);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> detail(@PathVariable("id") String id) {
        // Public job detail is candidate-facing. Admins use /api/admin/jobs/{id}.
        return resolvePublicJob(id)
                .filter(j -> !j.isDeleted() && j.getStatus() == Job.JobStatus.ACTIVE)
                .map(j -> ResponseEntity.ok(toResponse(j)))
                .orElse(ResponseEntity.notFound().build());
    }

    // Increment view count when a candidate views a job
    @PostMapping("/{id}/view")
    public ResponseEntity<Map<String, Object>> incrementView(@PathVariable("id") UUID id) {
        try {
            Optional<Job> jobOpt = jobRepository.findById(id);
            if (jobOpt.isEmpty()) {
                return ResponseEntity.notFound().build();
            }
            
            Job job = jobOpt.get();
            
            // Only increment views for ACTIVE jobs
            if (job.getStatus() != Job.JobStatus.ACTIVE) {
                return ResponseEntity.ok(Map.of("message", "View not incremented for non-active job", "views", job.getViews()));
            }
            
            // Increment view count
            job.setViews(job.getViews() + 1);
            Job saved = jobRepository.save(job);
            
            logger.info("View count incremented for job: {} (new count: {})", id, saved.getViews());
            
            return ResponseEntity.ok(Map.of("message", "View count incremented", "views", saved.getViews()));
        } catch (Exception e) {
            logger.error("Error incrementing view count for job: {}", id, e);
            return ResponseEntity.status(500).body(Map.of("error", "Failed to increment view count: " + e.getMessage()));
        }
    }

    // Employer: Create Job (with subscription validation)
    @PostMapping
    public ResponseEntity<Map<String, Object>> create(@RequestBody JobRequest req) {
        try {
            logger.info("Job creation request received. Title: {}", req.title());
            
            // Get authenticated user
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication == null || !authentication.isAuthenticated()) {
                logger.warn("Unauthenticated job creation attempt");
                return ResponseEntity.status(401).body(Map.of("error", "Unauthorized. Please login to post jobs."));
            }

            String email = authentication.getName();
            logger.info("Authenticated user email: {}", email);
            
            Optional<User> userOpt = userRepository.findByEmail(email);
            if (userOpt.isEmpty()) {
                logger.warn("User not found for email: {}", email);
                return ResponseEntity.status(404).body(Map.of("error", "User not found"));
            }

            User user = userOpt.get();
            logger.info("User found: {} with role: {}", user.getEmail(), user.getRole());

            // Admin or exempt test account can bypass subscription check
            boolean isExemptTestAccount = "cricketloverayush9999@gmail.com".equalsIgnoreCase(user.getEmail());
            if (user.getRole() != User.UserRole.ADMIN) {
                // Check if user is EMPLOYER
                if (user.getRole() != User.UserRole.EMPLOYER) {
                    logger.warn("Non-employer user {} attempted to post job", user.getEmail());
                    return ResponseEntity.status(403).body(Map.of("error", "Only employers can post jobs. Please register as an employer."));
                }

                // Find employer for this user
                Optional<Employer> employerOpt = employerRepository.findByUserId(user.getId());
                Employer employer;
                
                if (employerOpt.isEmpty()) {
                    if (isExemptTestAccount) {
                        employer = new Employer();
                        employer.setUser(user);
                        employer.setCompanyName("Ayush Multi-Speciality Hospital & Research Center");
                        employer.setCompanyType(Employer.CompanyType.HOSPITAL);
                        employer.setIsVerified(true);
                        employer.setVerificationStatus(Employer.VerificationStatus.APPROVED);
                        employer.setVerifiedAt(LocalDateTime.now());
                        employer.setVerificationNotes("VIP testing employer account - pre-verified");
                        employer = employerRepository.save(employer);
                    } else {
                        // Check if user has active subscription - if yes, auto-create and verify employer
                        Optional<Subscription> subscriptionCheck = subscriptionRepository.findActiveSubscriptionByUser(user.getId(), LocalDate.now());
                        if (subscriptionCheck.isPresent() && subscriptionCheck.get().getStatus() == Subscription.SubscriptionStatus.ACTIVE) {
                            // Auto-create and verify employer since they have active subscription
                            logger.info("Auto-creating employer for user {} with active subscription", user.getEmail());
                            employer = new Employer();
                            employer.setUser(user);
                            employer.setCompanyName(user.getName() + " Company");
                            employer.setCompanyType(Employer.CompanyType.HOSPITAL);
                            employer.setIsVerified(true);
                            employer.setVerificationStatus(Employer.VerificationStatus.APPROVED);
                            employer.setVerifiedAt(LocalDateTime.now());
                            employer.setVerificationNotes("Auto-created and verified - has active subscription");
                            employer = employerRepository.save(employer);
                            logger.info("Auto-created and verified employer {} for user {}", employer.getId(), user.getEmail());
                        } else {
                            logger.warn("Employer profile not found for user: {} and no active subscription", user.getEmail());
                            return ResponseEntity.status(404).body(Map.of("error", "Employer profile not found. Please complete employer verification first."));
                        }
                    }
                } else {
                    employer = employerOpt.get();
                    if (isExemptTestAccount && (!employer.getIsVerified() || employer.getVerificationStatus() != Employer.VerificationStatus.APPROVED)) {
                        employer.setIsVerified(true);
                        employer.setVerificationStatus(Employer.VerificationStatus.APPROVED);
                        employer.setVerifiedAt(LocalDateTime.now());
                        employer = employerRepository.save(employer);
                    }
                    logger.info("Employer found: {} - Verified: {}, Status: {}", 
                        employer.getCompanyName(), employer.getIsVerified(), employer.getVerificationStatus());

                    // Check if employer is verified - if not, check if they have active subscription
                    if (!isExemptTestAccount && (!employer.getIsVerified() || employer.getVerificationStatus() != Employer.VerificationStatus.APPROVED)) {
                        // Check if user has active subscription - if yes, auto-verify
                        Optional<Subscription> subscriptionCheck = subscriptionRepository.findActiveSubscriptionByUser(user.getId(), LocalDate.now());
                        if (subscriptionCheck.isPresent() && subscriptionCheck.get().getStatus() == Subscription.SubscriptionStatus.ACTIVE) {
                            logger.info("Auto-verifying employer {} for user {} with active subscription", employer.getId(), user.getEmail());
                            employer.setIsVerified(true);
                            employer.setVerificationStatus(Employer.VerificationStatus.APPROVED);
                            employer.setVerifiedAt(LocalDateTime.now());
                            employer.setVerificationNotes("Auto-verified - has active subscription");
                            employer = employerRepository.save(employer);
                            logger.info("Auto-verified employer {} for user {}", employer.getId(), user.getEmail());
                        } else {
                            logger.warn("Employer {} is not verified and no active subscription. isVerified: {}, status: {}", 
                                employer.getId(), employer.getIsVerified(), employer.getVerificationStatus());
                            return ResponseEntity.status(403).body(Map.of("error", "Your employer account is not verified. Please complete verification first."));
                        }
                    }
                }

                // Check for active subscription (Bypassed for isExemptTestAccount)
                Optional<Subscription> subscriptionOpt = subscriptionRepository.findActiveSubscriptionByUser(user.getId(), LocalDate.now());
                Subscription subscription = subscriptionOpt.orElse(null);

                if (!isExemptTestAccount) {
                    if (subscription == null) {
                        logger.warn("No active subscription found for user: {}", user.getEmail());
                        return ResponseEntity.status(403).body(Map.of(
                            "error", "No active subscription found. Please purchase a subscription plan to post jobs.",
                            "redirectTo", "/subscription"
                        ));
                    }

                    logger.info("Subscription found: {} - Status: {}, Used: {}/{}, Plan: {}", 
                        subscription.getId(), subscription.getStatus(), 
                        subscription.getJobPostsUsed(), subscription.getPlan().getJobPostsAllowed(),
                        subscription.getPlan().getName());

                    // Check if subscription is active
                    if (subscription.getStatus() != Subscription.SubscriptionStatus.ACTIVE) {
                        logger.warn("Subscription {} is not active. Status: {}", subscription.getId(), subscription.getStatus());
                        return ResponseEntity.status(403).body(Map.of(
                            "error", "Your subscription is not active. Please renew your subscription.",
                            "redirectTo", "/subscription"
                        ));
                    }

                    // Check job posting limit
                    Integer jobPostsUsed = subscription.getJobPostsUsed();
                    Integer jobPostsAllowed = subscription.getPlan().getJobPostsAllowed();
                    logger.info("Job posting check: Used={}, Allowed={}", jobPostsUsed, jobPostsAllowed);

                    if (jobPostsUsed >= jobPostsAllowed) {
                        logger.warn("Job posting limit reached for user: {}. Used: {}/{}", 
                            user.getEmail(), jobPostsUsed, jobPostsAllowed);
                        return ResponseEntity.status(403).body(Map.of(
                            "error", String.format("You have reached your job posting limit (%d/%d). Please upgrade your plan to post more jobs.", jobPostsUsed, jobPostsAllowed),
                            "redirectTo", "/subscription",
                            "used", jobPostsUsed,
                            "allowed", jobPostsAllowed
                        ));
                    }
                }

                // Create job and associate with employer
                logger.info("All checks passed. Creating job for employer: {}", employer.getCompanyName());
                Job job = new Job();
                job.setEmployer(employer);
                applyRequestToJob(req, job, employer);
                
                // If employer is verified, automatically approve the job (set status to ACTIVE)
                // Otherwise, set to PENDING for admin approval
                Job.JobStatus initialStatus;
                if (employer.getIsVerified() && employer.getVerificationStatus() == Employer.VerificationStatus.APPROVED) {
                    job.setStatus(Job.JobStatus.ACTIVE);
                    job.setApprovedAt(LocalDateTime.now());
                    // Set approved by as the employer user (self-approved for verified employers)
                    job.setApprovedBy(user);
                    initialStatus = Job.JobStatus.ACTIVE;
                    logger.info("Job automatically approved (ACTIVE) for verified employer: {}", employer.getCompanyName());
                } else {
                    // This should not happen as we check verification above, but keeping as fallback
                    initialStatus = parseStatus(req.status() != null ? req.status() : "pending");
                    job.setStatus(initialStatus);
                    logger.warn("Job set to PENDING for unverified employer: {}", employer.getCompanyName());
                }
                
                job.setIsFeatured(Boolean.TRUE.equals(req.featured()));
                job.setViews(Optional.ofNullable(req.views()).orElse(0));
                job.setApplicationsCount(Optional.ofNullable(req.applications()).orElse(0));
                Job saved = jobRepository.save(job);
                logger.info("Job created successfully: {} for employer: {} with status: {}", 
                    saved.getId(), employer.getCompanyName(), saved.getStatus());

                // Notify employer about job status
                try {
                    if (employer.getUser() != null) {
                        notificationService.notifyEmployerJobStatus(
                            employer.getUser().getId(),
                            saved.getTitle(),
                            saved.getStatus().name(),
                            saved.getId()
                        );
                    }
                } catch (Exception e) {
                    logger.error("❌ Error creating job status notification: {}", e.getMessage(), e);
                }

                // Notify admin if job is pending approval
                if (initialStatus == Job.JobStatus.PENDING) {
                    try {
                        notificationService.notifyAdminPendingApproval(
                            "job_pending",
                            String.format("New job '%s' from %s is pending approval", saved.getTitle(), employer.getCompanyName()),
                            saved.getId()
                        );
                    } catch (Exception e) {
                        logger.error("❌ Error creating admin notification: {}", e.getMessage(), e);
                    }
                }

                // Increment job posts used if subscription exists
                if (subscription != null) {
                    int currentUsed = Optional.ofNullable(subscription.getJobPostsUsed()).orElse(0);
                    subscription.setJobPostsUsed(currentUsed + 1);
                    subscriptionRepository.save(subscription);
                    logger.info("Updated job posts used: {}", currentUsed + 1);
                }

                return ResponseEntity.ok(toResponse(saved));
            } else {
                // Admin can post jobs without subscription (for admin-posted jobs)
                Job job = new Job();
                applyRequestToJob(req, job, null);
                job.setStatus(parseStatus(req.status()));
                job.setIsFeatured(Boolean.TRUE.equals(req.featured()));
                job.setViews(Optional.ofNullable(req.views()).orElse(0));
                job.setApplicationsCount(Optional.ofNullable(req.applications()).orElse(0));
                Job saved = jobRepository.save(job);
                return ResponseEntity.ok(toResponse(saved));
            }
        } catch (Exception e) {
            logger.error("Error creating job", e);
            logger.error("Exception type: {}, Message: {}", e.getClass().getName(), e.getMessage());
            if (e.getCause() != null) {
                logger.error("Cause: {}", e.getCause().getMessage());
            }
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to create job: " + extractErrorMessage(e));
            return ResponseEntity.status(500).body(errorResponse);
        }
    }

    // Admin: Update Job
    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> update(@PathVariable("id") UUID id, @RequestBody JobRequest req) {
        logger.info("=== UPDATE JOB REQUEST ===");
        logger.info("Job ID: {}", id);
        logger.info("Request payload: title={}, sector={}, category={}, status={}", 
            req.title(), req.sector(), req.category(), req.status());
        
        try {
            Optional<Job> existingOpt = jobRepository.findById(id);
            if (existingOpt.isEmpty()) {
                logger.warn("Job not found with ID: {}", id);
                return ResponseEntity.notFound().build();
            }
            
            Job existing = existingOpt.get();
            Job.JobStatus oldStatus = existing.getStatus();
            
            // Get existing employer or resolve/create new one
            Employer employer = existing.getEmployer();
            if (employer == null) {
                employer = resolveOrCreateEmployer(req.organization(), req.type());
            }
            
            // Apply updates only for non-null fields (preserving existing values)
            applyRequestToJobForUpdate(req, existing, employer);
            
            // Handle admin-specific fields
            if (req.status() != null && !req.status().isBlank()) {
                existing.setStatus(parseStatus(req.status()));
            }
            if (req.featured() != null) existing.setIsFeatured(req.featured());
            if (req.views() != null) existing.setViews(req.views());
            if (req.applications() != null) existing.setApplicationsCount(req.applications());
            
            // If status changed to ACTIVE, set approval info
            if (existing.getStatus() == Job.JobStatus.ACTIVE && oldStatus != Job.JobStatus.ACTIVE) {
                existing.setApprovedAt(LocalDateTime.now());
                Authentication auth = SecurityContextHolder.getContext().getAuthentication();
                if (auth != null) {
                    Optional<User> adminUser = userRepository.findByEmail(auth.getName());
                    adminUser.ifPresent(existing::setApprovedBy);
                }
            }
            
            logger.info("Saving updated job: {}", existing.getTitle());
            Job saved = jobRepository.save(existing);
            logger.info("Job saved successfully with ID: {}", saved.getId());
            
            // Notify employer if status changed
            if (saved.getStatus() != oldStatus && employer != null && employer.getUser() != null) {
                try {
                    notificationService.notifyEmployerJobStatus(
                        employer.getUser().getId(),
                        saved.getTitle(),
                        saved.getStatus().name(),
                        saved.getId()
                    );
                } catch (Exception e) {
                    logger.error("Error creating job status notification: {}", e.getMessage(), e);
                }
            }
            
            return ResponseEntity.ok(toResponse(saved));
            
        } catch (Exception e) {
            logger.error("=== ERROR UPDATING JOB ===");
            logger.error("Job ID: {}", id);
            logger.error("Exception type: {}", e.getClass().getName());
            logger.error("Error message: {}", e.getMessage());
            logger.error("Full stack trace:", e);
            
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to update job: " + e.getMessage());
            errorResponse.put("type", e.getClass().getSimpleName());
            return ResponseEntity.status(500).body(errorResponse);
        }
    }

    // Admin: Delete Job
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable("id") UUID id) {
        if (!jobRepository.existsById(id)) return ResponseEntity.notFound().build();
        jobRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Upload job document (PDF only) for a specific job
     * POST /api/jobs/{id}/upload-document
     */
    @PostMapping("/{id}/upload-document")
    public ResponseEntity<Map<String, Object>> uploadJobDocument(
            @PathVariable("id") UUID id,
            @RequestParam("file") MultipartFile file) {
        try {
            logger.info("Uploading job document for job: {}", id);
            
            // Validate file type - only PDF allowed
            String contentType = file.getContentType();
            String originalFilename = file.getOriginalFilename();
            if (contentType == null || !contentType.equals("application/pdf")) {
                String extension = originalFilename != null && originalFilename.contains(".") 
                    ? originalFilename.substring(originalFilename.lastIndexOf(".") + 1).toLowerCase() 
                    : "";
                if (!extension.equals("pdf")) {
                    return ResponseEntity.badRequest().body(Map.of("error", "Only PDF files are allowed for job documents"));
                }
            }
            
            // Check if job exists
            Optional<Job> jobOpt = jobRepository.findById(id);
            if (jobOpt.isEmpty()) {
                return ResponseEntity.status(404).body(Map.of("error", "Job not found"));
            }
            
            Job job = jobOpt.get();
            
            // Upload file using existing FileUploadService
            String fileUrl = fileUploadService.uploadFile(file, "job-documents");
            logger.info("Job document uploaded successfully. URL: {}", fileUrl);
            
            // Update job with the document URL
            job.setJobDocumentUrl(fileUrl);
            jobRepository.save(job);
            
            return ResponseEntity.ok(Map.of(
                "message", "Document uploaded successfully",
                "jobDocumentUrl", fileUrl,
                "jobId", id.toString()
            ));
        } catch (Exception e) {
            logger.error("Error uploading job document: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body(Map.of("error", "Failed to upload document: " + e.getMessage()));
        }
    }

    /**
     * Upload job image (jpg, jpeg, png, webp only) for a specific job
     * POST /api/jobs/{id}/upload-image
     */
    @PostMapping("/{id}/upload-image")
    public ResponseEntity<Map<String, Object>> uploadJobImage(
            @PathVariable("id") UUID id,
            @RequestParam("file") MultipartFile file) {
        try {
            logger.info("Uploading job image for job: {}", id);
            
            // Validate file type - only images allowed
            String contentType = file.getContentType();
            String originalFilename = file.getOriginalFilename();
            List<String> allowedContentTypes = Arrays.asList("image/jpeg", "image/jpg", "image/png", "image/webp");
            List<String> allowedExtensions = Arrays.asList("jpg", "jpeg", "png", "webp");
            
            String extension = originalFilename != null && originalFilename.contains(".") 
                ? originalFilename.substring(originalFilename.lastIndexOf(".") + 1).toLowerCase() 
                : "";
            
            boolean isValidType = (contentType != null && allowedContentTypes.contains(contentType.toLowerCase())) 
                || allowedExtensions.contains(extension);
            
            if (!isValidType) {
                return ResponseEntity.badRequest().body(Map.of("error", "Only jpg, jpeg, png, webp images are allowed"));
            }
            
            // Check if job exists
            Optional<Job> jobOpt = jobRepository.findById(id);
            if (jobOpt.isEmpty()) {
                return ResponseEntity.status(404).body(Map.of("error", "Job not found"));
            }
            
            Job job = jobOpt.get();
            
            // Upload file using existing FileUploadService
            String fileUrl = fileUploadService.uploadFile(file, "job-images");
            logger.info("Job image uploaded successfully. URL: {}", fileUrl);
            
            // Update job with the image URL
            job.setJobImageUrl(fileUrl);
            jobRepository.save(job);
            
            return ResponseEntity.ok(Map.of(
                "message", "Image uploaded successfully",
                "jobImageUrl", fileUrl,
                "jobId", id.toString()
            ));
        } catch (Exception e) {
            logger.error("Error uploading job image: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body(Map.of("error", "Failed to upload image: " + e.getMessage()));
        }
    }

    // Helper: clip string to maximum length
    private String clip(String val, int maxLen) {
        if (val == null) return null;
        val = val.trim();
        return val.length() > maxLen ? val.substring(0, maxLen) : val;
    }

    private String extractErrorMessage(Exception e) {
        Throwable root = e;
        while (root.getCause() != null && root.getCause() != root) {
            root = root.getCause();
        }
        if (root instanceof ConstraintViolationException cve) {
            StringBuilder sb = new StringBuilder("Validation error: ");
            for (ConstraintViolation<?> cv : cve.getConstraintViolations()) {
                sb.append(cv.getPropertyPath()).append(" ").append(cv.getMessage()).append("; ");
            }
            return sb.toString();
        }
        return (root != null && root.getMessage() != null) ? root.getMessage() : e.getMessage();
    }

    // Helper: map request onto entity (for CREATE - sets all fields with defaults)
    private void applyRequestToJob(JobRequest req, Job job, Employer employer) {
        // If employer is provided (from authenticated user), use it; otherwise resolve/create
        if (employer != null) {
            job.setEmployer(employer);
        } else {
            // For admin-posted jobs, resolve or create employer
            Employer resolvedEmployer = resolveOrCreateEmployer(req.organization(), req.type());
            job.setEmployer(resolvedEmployer);
        }

        job.setTitle(clip(req.title(), 200));
        job.setDescription(Optional.ofNullable(req.description()).orElse(""));
        job.setSector(parseSectorWithDefault(req.sector()));
        job.setCategory(mapCategoryFromLabelWithDefault(Optional.ofNullable(req.category()).orElse("")));
        if (req.jobRoles() != null) {
            if (req.jobRoles() instanceof List<?> list) {
                String joined = list.stream().map(Object::toString).map(String::trim).filter(s -> !s.isEmpty()).collect(Collectors.joining(", "));
                job.setJobRoles(clip(joined, 1000));
                if (!list.isEmpty() && (req.category() == null || req.category().isBlank())) {
                    job.setCategory(mapCategoryFromLabelWithDefault(list.get(0).toString()));
                }
            } else {
                String str = req.jobRoles().toString().trim();
                job.setJobRoles(clip(str, 1000));
                if (req.category() == null || req.category().isBlank()) {
                    job.setCategory(mapCategoryFromLabelWithDefault(str.split(",")[0].trim()));
                }
            }
        } else if (req.category() != null && !req.category().isBlank()) {
            job.setJobRoles(clip(req.category(), 1000));
        }
        job.setLocation(clip(Optional.ofNullable(req.location()).orElse(""), 200));
        job.setQualification(Optional.ofNullable(req.qualification()).orElse(""));
        job.setExperience(clip(Optional.ofNullable(req.experience()).orElse(""), 100));
        job.setExperienceLevel(req.experienceLevel() != null ? parseExperienceLevel(req.experienceLevel()) : null);
        job.setSpeciality(clip(Optional.ofNullable(req.speciality()).orElse(""), 255));
        job.setDutyType(req.dutyType() != null ? parseDutyType(req.dutyType()) : null);
        job.setNumberOfPosts(Optional.ofNullable(req.numberOfPosts()).orElse(1));
        job.setSalaryRange(clip(req.salary(), 100));
        job.setPdfUrl(clip(req.pdfUrl(), 500));
        job.setJobDocumentUrl(clip(req.jobDocumentUrl(), 500));
        job.setJobImageUrl(clip(req.jobImageUrl(), 500));
        job.setApplyLink(clip(req.applyLink(), 500));
        job.setRequirements(req.requirements());
        job.setBenefits(req.benefits());
        // Handle lastDate - required field, default to 30 days from now if not provided
        if (req.lastDate() != null && !req.lastDate().isBlank()) {
            try { 
                job.setLastDate(java.time.LocalDate.parse(req.lastDate())); 
            } catch (Exception e) {
                job.setLastDate(java.time.LocalDate.now().plusDays(30));
            }
        } else {
            job.setLastDate(java.time.LocalDate.now().plusDays(30));
        }
        // Contact details - check for null AND blank strings, validate email format
        String email = req.contactEmail();
        if (email != null && !email.isBlank()) {
            email = email.split("[,;/]")[0].trim();
            if (email.length() <= 100 && email.matches("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+$")) {
                job.setContactEmail(email);
            } else {
                job.setContactEmail("noreply@medexjob.com");
            }
        } else {
            job.setContactEmail("noreply@medexjob.com");
        }
        String phone = req.contactPhone();
        if (phone != null && !phone.isBlank()) {
            phone = phone.split("[,/]")[0].trim().replaceAll("[^0-9+]", "");
            if (phone.isBlank()) phone = "0000000000";
            else if (phone.length() > 15) phone = phone.substring(0, 15);
            job.setContactPhone(phone);
        } else {
            job.setContactPhone("0000000000");
        }
    }

    // Helper: map request onto entity for UPDATE - preserves existing values when request fields are null/empty
    private void applyRequestToJobForUpdate(JobRequest req, Job job, Employer employer) {
        // Update employer only if organization changed
        if (req.organization() != null && !req.organization().isBlank()) {
            if (employer != null) {
                job.setEmployer(employer);
            } else {
                Employer resolvedEmployer = resolveOrCreateEmployer(req.organization(), req.type());
                job.setEmployer(resolvedEmployer);
            }
        }

        // Update only non-null/non-blank fields (preserve existing values)
        if (req.title() != null && !req.title().isBlank()) {
            job.setTitle(clip(req.title(), 200));
        }
        if (req.description() != null) {
            job.setDescription(req.description());
        }
        if (req.sector() != null && !req.sector().isBlank()) {
            Job.JobSector parsedSector = parseSector(req.sector());
            if (parsedSector != null) {
                job.setSector(parsedSector);
            }
        }
        if (req.category() != null && !req.category().isBlank()) {
            Job.JobCategory parsedCategory = mapCategoryFromLabel(req.category());
            if (parsedCategory != null) {
                job.setCategory(parsedCategory);
            }
        }
        if (req.jobRoles() != null) {
            if (req.jobRoles() instanceof List<?> list) {
                String joined = list.stream().map(Object::toString).map(String::trim).filter(s -> !s.isEmpty()).collect(Collectors.joining(", "));
                job.setJobRoles(clip(joined, 1000));
                if (!list.isEmpty() && (req.category() == null || req.category().isBlank())) {
                    Job.JobCategory parsed = mapCategoryFromLabel(list.get(0).toString());
                    if (parsed != null) job.setCategory(parsed);
                }
            } else {
                String str = req.jobRoles().toString().trim();
                job.setJobRoles(clip(str, 1000));
            }
        }
        if (req.location() != null && !req.location().isBlank()) {
            job.setLocation(clip(req.location(), 200));
        }
        if (req.qualification() != null) {
            job.setQualification(req.qualification());
        }
        if (req.experience() != null) {
            job.setExperience(clip(req.experience(), 100));
        }
        if (req.experienceLevel() != null && !req.experienceLevel().isBlank()) {
            job.setExperienceLevel(parseExperienceLevel(req.experienceLevel()));
        }
        if (req.speciality() != null) {
            job.setSpeciality(clip(req.speciality(), 255));
        }
        if (req.dutyType() != null && !req.dutyType().isBlank()) {
            job.setDutyType(parseDutyType(req.dutyType()));
        }
        if (req.numberOfPosts() != null) {
            job.setNumberOfPosts(req.numberOfPosts());
        }
        if (req.salary() != null) {
            job.setSalaryRange(clip(req.salary(), 100));
        }
        if (req.pdfUrl() != null) {
            job.setPdfUrl(clip(req.pdfUrl(), 500));
        }
        if (req.jobDocumentUrl() != null) {
            job.setJobDocumentUrl(clip(req.jobDocumentUrl(), 500));
        }
        if (req.jobImageUrl() != null) {
            job.setJobImageUrl(clip(req.jobImageUrl(), 500));
        }
        if (req.applyLink() != null) {
            job.setApplyLink(clip(req.applyLink(), 500));
        }
        if (req.requirements() != null) {
            job.setRequirements(req.requirements());
        }
        if (req.benefits() != null) {
            job.setBenefits(req.benefits());
        }
        // Handle lastDate - only update if provided
        if (req.lastDate() != null && !req.lastDate().isBlank()) {
            try { 
                job.setLastDate(java.time.LocalDate.parse(req.lastDate())); 
            } catch (Exception e) {
                logger.warn("Failed to parse lastDate: {}", req.lastDate());
            }
        }
        // Contact details - only update if provided and validate email format
        if (req.contactEmail() != null && !req.contactEmail().isBlank()) {
            String email = req.contactEmail().split("[,;/]")[0].trim();
            if (email.length() <= 100 && email.matches("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+$")) {
                job.setContactEmail(email);
            }
        }
        // Fix empty contactEmail from existing data
        if (job.getContactEmail() == null || job.getContactEmail().isBlank()) {
            job.setContactEmail("noreply@medexjob.com");
        }
        if (req.contactPhone() != null && !req.contactPhone().isBlank()) {
            String phone = req.contactPhone().split("[,/]")[0].trim().replaceAll("[^0-9+]", "");
            if (phone.length() > 15) phone = phone.substring(0, 15);
            job.setContactPhone(phone.isBlank() ? "0000000000" : phone);
        }
        // Fix empty contactPhone from existing data
        if (job.getContactPhone() == null || job.getContactPhone().isBlank()) {
            job.setContactPhone("0000000000");
        }
    }

    private Employer resolveOrCreateEmployer(String organization, String type) {
        String companyName = (organization != null && !organization.isBlank())
            ? organization.trim()
            : "MedExJob Admin Posted";
        if (companyName.length() > 200) {
            companyName = companyName.substring(0, 200);
        }

        // 1. Try to find an existing employer by company name
        Optional<Employer> existingEmployer = employerRepository.findByCompanyName(companyName);
        if (existingEmployer.isPresent()) {
            return existingEmployer.get();
        }

        // 2. Associate with a User (safe dummy user per organization)
        String sanitized = companyName.replaceAll("[^a-zA-Z0-9]", "_").toLowerCase();
        if (sanitized.length() > 50) {
            sanitized = sanitized.substring(0, 50);
        }
        if (sanitized.isBlank()) {
            sanitized = "org_" + UUID.randomUUID().toString().substring(0, 8);
        }
        String dummyEmail = "admin+" + sanitized + "@medexjob.com";

        Optional<User> existingUser = userRepository.findByEmail(dummyEmail);
        User employerUser;
        if (existingUser.isPresent()) {
            employerUser = existingUser.get();
            Optional<Employer> employerByUser = employerRepository.findByUserId(employerUser.getId());
            if (employerByUser.isPresent()) {
                return employerByUser.get();
            }
        } else {
            User dummyUser = new User();
            String userName = "Admin - " + companyName;
            dummyUser.setName(userName.length() > 100 ? userName.substring(0, 100) : userName);
            dummyUser.setEmail(dummyEmail);
            dummyUser.setPhone("0000000000");
            dummyUser.setRole(User.UserRole.EMPLOYER);
            dummyUser.setPasswordHash(passwordEncoder.encode("AdminCreated_" + System.currentTimeMillis()));
            dummyUser.setIsVerified(true);
            dummyUser.setIsActive(true);
            employerUser = userRepository.save(dummyUser);
        }

        Employer newEmployer = new Employer();
        newEmployer.setCompanyName(companyName);
        newEmployer.setCompanyType(parseCompanyType(type));
        newEmployer.setIsVerified(true);
        newEmployer.setVerificationStatus(Employer.VerificationStatus.APPROVED);
        newEmployer.setUser(employerUser);

        return employerRepository.save(newEmployer);
    }

    // === START OF REQUIRED HELPER METHOD PLACEHOLDERS ===

    // Placeholder: Assumes JobStatus enum exists and has a valueOf method
    private List<String> distinctStrings(List<String> values) {
        return values.stream()
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .distinct()
                .sorted()
                .collect(Collectors.toList());
    }

    private Optional<Job> resolvePublicJob(String idOrSlug) {
        try {
            return jobRepository.findByIdWithEmployer(UUID.fromString(idOrSlug));
        } catch (IllegalArgumentException ignored) {
            return jobRepository.findBySlugWithEmployer(idOrSlug);
        }
    }

    private boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }

    private boolean isAllowedSortField(String field) {
        return Set.of("createdAt", "lastDate", "title", "views", "applicationsCount").contains(field);
    }

    private void addSuggestion(Set<String> target, String value, String needle, int limit) {
        if (target.size() >= limit || !hasText(value)) {
            return;
        }
        if (value.toLowerCase(Locale.ROOT).contains(needle)) {
            target.add(value.trim());
        }
    }

    private Job.JobStatus parseStatus(String status) {
        if (status == null || status.isBlank()) {
            return Job.JobStatus.PENDING; // keep admin submissions hidden by default
        }
        try {
            return Job.JobStatus.valueOf(status.toUpperCase());
        } catch (IllegalArgumentException e) {
            return Job.JobStatus.PENDING; // fall back to pending on invalid input
        }
    }

    // Placeholder: Assumes JobSector enum exists and has a valueOf method
    private Job.JobSector parseSector(String sector) {
        if (sector == null || sector.isBlank()) return null;
        try {
            return Job.JobSector.valueOf(sector.toUpperCase());
        } catch (IllegalArgumentException e) {
            logger.warn("Unknown sector value: '{}', returning null", sector);
            return null;
        }
    }

    // Parse sector with default value - used for CREATE operations
    private Job.JobSector parseSectorWithDefault(String sector) {
        if (sector == null || sector.isBlank()) return Job.JobSector.PRIVATE;
        try {
            return Job.JobSector.valueOf(sector.toUpperCase());
        } catch (IllegalArgumentException e) {
            logger.warn("Unknown sector value: '{}', defaulting to PRIVATE", sector);
            return Job.JobSector.PRIVATE;
        }
    }

    // Placeholder: Assumes Employer.CompanyType enum exists and has a valueOf method
    private Employer.CompanyType parseCompanyType(String type) {
        if (type == null) return null;
        try {
            return Employer.CompanyType.valueOf(type.toUpperCase());
        } catch (IllegalArgumentException e) {
            return Employer.CompanyType.HOSPITAL; // Default or throw
        }
    }

    // Placeholder: Assumes Job.ExperienceLevel enum exists and has a valueOf method
    private Job.ExperienceLevel parseExperienceLevel(String experienceLevel) {
        if (experienceLevel == null) return null;
        try {
            return Job.ExperienceLevel.valueOf(experienceLevel.toUpperCase());
        } catch (IllegalArgumentException e) {
            return Job.ExperienceLevel.ENTRY; // Default
        }
    }

    // Placeholder: Assumes Job.DutyType enum exists and has a valueOf method
    private Job.DutyType parseDutyType(String dutyType) {
        if (dutyType == null) return null;
        try {
            return Job.DutyType.valueOf(dutyType.toUpperCase());
        } catch (IllegalArgumentException e) {
            return Job.DutyType.FULL_TIME; // Default
        }
    }

    // Placeholder: Assumes JobCategory enum exists - returns null for unknown
    private Job.JobCategory mapCategoryFromLabel(String label) {
        if (label == null || label.isBlank()) return null;
        return switch (label.toLowerCase().trim()) {
            case "junior resident", "junior_resident" -> Job.JobCategory.JUNIOR_RESIDENT;
            case "senior resident", "senior_resident" -> Job.JobCategory.SENIOR_RESIDENT;
            case "medical officer", "medical_officer", "doctor", "doctors" -> Job.JobCategory.MEDICAL_OFFICER;
            case "faculty", "professor", "assistant professor", "associate professor" -> Job.JobCategory.FACULTY;
            case "specialist" -> Job.JobCategory.SPECIALIST;
            case "consultant" -> Job.JobCategory.CONSULTANT;
            case "gdmo", "general duty medical officer" -> Job.JobCategory.GDMO;
            case "dental", "bds", "mds", "dentist" -> Job.JobCategory.DENTAL;
            case "ayush", "ayurveda", "homoeopathy", "unani", "siddha", "bams", "bhms", "bums" -> Job.JobCategory.AYUSH;
            case "nursing", "nurse", "staff nurse", "anm", "gnm", "b.sc nursing", "m.sc nursing" -> Job.JobCategory.NURSING;
            case "paramedical", "technician", "lab technician", "radiographer", "ot technician", "dialysis" -> Job.JobCategory.PARAMEDICAL;
            case "paramedical / nursing", "paramedical_nursing" -> Job.JobCategory.PARAMEDICAL_NURSING;
            case "allied health", "allied health professionals", "allied_health", "physiotherapy", "bpt", "mpt", "occupational therapy" -> Job.JobCategory.ALLIED_HEALTH;
            case "pharmacy", "pharmacist", "d.pharm", "b.pharm", "m.pharm", "pharm.d" -> Job.JobCategory.PHARMACY;
            case "psychology & mental health", "psychology", "mental health", "counsellor", "clinical psychologist" -> Job.JobCategory.PSYCHOLOGY_MENTAL_HEALTH;
            case "nutrition & dietetics", "nutrition", "dietetics", "dietitian", "nutritionist" -> Job.JobCategory.NUTRITION_DIETETICS;
            case "life science & research", "research", "life science", "clinical research" -> Job.JobCategory.LIFE_SCIENCE_RESEARCH;
            case "hospital administration", "administration", "hospital admin", "mha", "operations" -> Job.JobCategory.HOSPITAL_ADMINISTRATION;
            case "public health", "mph", "epidemiology", "health officer" -> Job.JobCategory.PUBLIC_HEALTH;
            default -> {
                logger.warn("Unknown category label: '{}', returning null", label);
                yield null;
            }
        };
    }

    // Map category with default - used for CREATE operations
    private Job.JobCategory mapCategoryFromLabelWithDefault(String label) {
        Job.JobCategory category = mapCategoryFromLabel(label);
        if (category == null) {
            logger.warn("Unknown category label: '{}', defaulting to MEDICAL_OFFICER", label);
            return Job.JobCategory.MEDICAL_OFFICER;
        }
        return category;
    }

    // === END OF REQUIRED HELPER METHOD PLACEHOLDERS ===

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record JobRequest(
        String title,
        String organization,
        String sector,
        String category,
        Object jobRoles,
        String department,
        String location,
        String qualification,
        String experience,
        String experienceLevel,
        String speciality,
        String dutyType,
        Integer numberOfPosts,
        String salary,
        String description,
        String lastDate,
        String requirements,
        String benefits,
        String pdfUrl,
        String jobDocumentUrl,
        String jobImageUrl,
        String applyLink,
        String status,
        Boolean featured,
        Integer views,
        Integer applications,
        String contactEmail,
        String contactPhone,
        String type
    ) {}

    private Map<String, Object> toResponse(Job j) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", j.getId().toString());
        m.put("title", j.getTitle());
        String organization = "";
        UUID employerId = null;
        try {
            Employer emp = j.getEmployer();
            if (emp != null) {
                organization = Optional.ofNullable(emp.getCompanyName()).orElse("");
                employerId = emp.getId();
            }
        } catch (Exception ignored) {}
        m.put("organization", organization);
        m.put("companyName", organization);
        m.put("organisationName", organization);
        m.put("employerId", employerId != null ? employerId.toString() : null);
        m.put("sector", j.getSector() == Job.JobSector.GOVERNMENT ? "government" : "private");
        m.put("category", mapCategoryToLabel(j.getCategory()));
        List<String> roles = new ArrayList<>();
        if (j.getJobRoles() != null && !j.getJobRoles().isBlank()) {
            for (String r : j.getJobRoles().split(",")) {
                String trimmed = r.trim();
                if (!trimmed.isEmpty() && !roles.contains(trimmed)) {
                    roles.add(trimmed);
                }
            }
        }
        if (roles.isEmpty() && j.getCategory() != null) {
            roles.add(mapCategoryToLabel(j.getCategory()));
        }
        m.put("jobRoles", roles);
        m.put("location", j.getLocation());
        m.put("qualification", j.getQualification());
        m.put("experience", j.getExperience());
        m.put("experienceLevel", j.getExperienceLevel() != null ? j.getExperienceLevel().name().toLowerCase() : null);
        m.put("speciality", j.getSpeciality());
        m.put("department", j.getDepartment());
        m.put("jobType", j.getJobType());
        m.put("slug", j.getSlug());
        m.put("dutyType", j.getDutyType() != null ? j.getDutyType().name().toLowerCase() : null);
        m.put("numberOfPosts", j.getNumberOfPosts());
        m.put("salary", j.getSalaryRange());
        m.put("description", j.getDescription());
        m.put("lastDate", j.getLastDate() != null ? j.getLastDate().toString() : null);
        m.put("postedDate", j.getCreatedAt() != null ? j.getCreatedAt().toString() : null);
        m.put("pdfUrl", j.getPdfUrl());
        m.put("jobDocumentUrl", j.getJobDocumentUrl());
        m.put("jobImageUrl", j.getJobImageUrl());
        m.put("applyLink", j.getApplyLink());
        m.put("officialWebsite", j.getOfficialWebsite());
        m.put("status", j.getStatus().name().toLowerCase());
        m.put("featured", Boolean.TRUE.equals(j.getIsFeatured()));
        m.put("views", j.getViews());
        m.put("applications", j.getApplicationsCount());
        m.put("sourceRecruitmentId", j.getSourceRecruitmentId() != null ? j.getSourceRecruitmentId().toString() : null);
        m.put("sourceVacancyId", j.getSourceVacancyId() != null ? j.getSourceVacancyId().toString() : null);
        return m;
    }

    private String mapCategoryToLabel(Job.JobCategory c) {
        if (c == null) return "";
        return switch (c) {
            case JUNIOR_RESIDENT -> "Junior Resident";
            case SENIOR_RESIDENT -> "Senior Resident";
            case MEDICAL_OFFICER -> "Medical Officer";
            case FACULTY -> "Faculty";
            case SPECIALIST -> "Specialist";
            case CONSULTANT -> "Consultant";
            case GDMO -> "GDMO";
            case DENTAL -> "Dental";
            case AYUSH -> "AYUSH";
            case NURSING -> "Nursing";
            case PARAMEDICAL -> "Paramedical";
            case PARAMEDICAL_NURSING -> "Paramedical / Nursing";
            case ALLIED_HEALTH -> "Allied Health";
            case PHARMACY -> "Pharmacy";
            case PSYCHOLOGY_MENTAL_HEALTH -> "Psychology & Mental Health";
            case NUTRITION_DIETETICS -> "Nutrition & Dietetics";
            case LIFE_SCIENCE_RESEARCH -> "Life Science & Research";
            case HOSPITAL_ADMINISTRATION -> "Hospital Administration";
            case PUBLIC_HEALTH -> "Public Health";
        };
    }

    private void seedSampleJobsForEmployer(Employer employer) {
        String contactEmail = employer.getUser() != null ? employer.getUser().getEmail() : "cricketloverayush9999@gmail.com";
        String contactPhone = employer.getUser() != null && employer.getUser().getPhone() != null ? employer.getUser().getPhone() : "+916265561446";

        List<Job> sampleList = List.of(
            createSampleJob(
                employer,
                "Senior Consultant - Critical Care Medicine",
                "Lead our advanced 24-bed multidisciplinary ICU and ECMO team. Manage critical patient admissions, ventilator protocols, and bedside echocardiography.",
                Job.JobCategory.SPECIALIST,
                "Bhopal, Madhya Pradesh",
                "MD/DNB in Anaesthesia or Critical Care Medicine (IDCCM)",
                "3-6 years",
                Job.ExperienceLevel.SENIOR,
                "Critical Care",
                2,
                "INR 2,20,000 - 3,00,000 per month",
                true,
                contactEmail,
                contactPhone
            ),
            createSampleJob(
                employer,
                "Emergency Medical Officer (Casualty)",
                "Handle emergency room triage, primary trauma stabilization, resuscitation, and prompt referral coordination in our Level-1 trauma unit.",
                Job.JobCategory.MEDICAL_OFFICER,
                "Bhopal, Madhya Pradesh",
                "MBBS with valid MCI/State Council registration and ACLS/ATLS certification",
                "1-3 years",
                Job.ExperienceLevel.MID,
                "Emergency Medicine",
                4,
                "INR 90,000 - 1,25,000 per month",
                true,
                contactEmail,
                contactPhone
            ),
            createSampleJob(
                employer,
                "Consultant Pediatrician & Neonatologist",
                "Provide comprehensive neonatal intensive care, pediatric inpatient care, developmental screening, and parent counseling.",
                Job.JobCategory.SPECIALIST,
                "Bhopal, Madhya Pradesh",
                "MD/DNB in Pediatrics with NICU/PICU clinical exposure",
                "2-5 years",
                Job.ExperienceLevel.MID,
                "Pediatrics",
                2,
                "INR 1,80,000 - 2,50,000 per month",
                false,
                contactEmail,
                contactPhone
            ),
            createSampleJob(
                employer,
                "ICU Staff Nurse (In-Charge)",
                "Supervise intensive care nursing stations, monitor patient hemodynamics, manage infusions, and ensure high infection control standards.",
                Job.JobCategory.PARAMEDICAL_NURSING,
                "Bhopal, Madhya Pradesh",
                "B.Sc Nursing / GNM with State Nursing Council Registration",
                "2-4 years",
                Job.ExperienceLevel.MID,
                "Critical Care Nursing",
                6,
                "INR 40,000 - 60,000 per month",
                false,
                contactEmail,
                contactPhone
            )
        );

        for (Job j : sampleList) {
            jobRepository.save(j);
        }
    }

    private Job createSampleJob(
            Employer employer,
            String title,
            String desc,
            Job.JobCategory category,
            String location,
            String qualification,
            String experience,
            Job.ExperienceLevel expLevel,
            String speciality,
            int posts,
            String salary,
            boolean featured,
            String email,
            String phone
    ) {
        Job job = new Job();
        job.setEmployer(employer);
        job.setTitle(title);
        job.setDescription(desc);
        job.setSector(Job.JobSector.PRIVATE);
        job.setCategory(category);
        job.setLocation(location);
        job.setQualification(qualification);
        job.setExperience(experience);
        job.setExperienceLevel(expLevel);
        job.setSpeciality(speciality);
        job.setDutyType(Job.DutyType.FULL_TIME);
        job.setNumberOfPosts(posts);
        job.setSalaryRange(salary);
        job.setRequirements("Valid registration, strong clinical communication, patient-first approach, and teamwork.");
        job.setBenefits("Health insurance, paid annual leave, professional development support, and accommodation assistance.");
        job.setLastDate(LocalDate.now().plusMonths(6));
        job.setContactEmail(email);
        job.setContactPhone(phone);
        job.setStatus(Job.JobStatus.ACTIVE);
        job.setIsFeatured(featured);
        return job;
    }
}