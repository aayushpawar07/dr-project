package com.medexjob.controller;

import com.medexjob.entity.Application;
import com.medexjob.entity.CandidateProfile;
import com.medexjob.entity.Job;
import com.medexjob.entity.User;
import com.medexjob.entity.Notification;
import com.medexjob.entity.Employer;
import org.springframework.data.domain.PageImpl;
import com.medexjob.repository.ApplicationRepository;
import com.medexjob.repository.JobRepository;
import com.medexjob.repository.UserRepository;
import com.medexjob.repository.NotificationRepository;
import com.medexjob.repository.EmployerRepository;
import com.medexjob.repository.ResumeRepository;
import com.medexjob.repository.CandidateProfileRepository;
import com.medexjob.service.FileUploadService;
import com.medexjob.service.NotificationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/applications")
public class ApplicationController {

    private static final Logger logger = LoggerFactory.getLogger(ApplicationController.class);
    
    private final ApplicationRepository applicationRepository;
    private final JobRepository jobRepository;
    private final UserRepository userRepository;
    private final NotificationRepository notificationRepository;
    private final NotificationService notificationService;
    private final EmployerRepository employerRepository;
    private final ResumeRepository resumeRepository;
    private final CandidateProfileRepository candidateProfileRepository;
    private final FileUploadService fileUploadService;
    private final Path uploadPath = Paths.get("uploads");

    public ApplicationController(ApplicationRepository applicationRepository, JobRepository jobRepository, UserRepository userRepository, NotificationRepository notificationRepository, NotificationService notificationService, EmployerRepository employerRepository, ResumeRepository resumeRepository, CandidateProfileRepository candidateProfileRepository, FileUploadService fileUploadService) {
        this.applicationRepository = applicationRepository;
        this.jobRepository = jobRepository;
        this.userRepository = userRepository;
        this.notificationRepository = notificationRepository;
        this.notificationService = notificationService;
        this.employerRepository = employerRepository;
        this.resumeRepository = resumeRepository;
        this.candidateProfileRepository = candidateProfileRepository;
        this.fileUploadService = fileUploadService;
        try {
            Files.createDirectories(uploadPath);
        } catch (IOException e) {
            throw new RuntimeException("Could not create upload directory", e);
        }
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> apply(
            @RequestParam("jobId") UUID jobId,
            @RequestParam("candidateName") String candidateName,
            @RequestParam("candidateEmail") String candidateEmail,
            @RequestParam("candidatePhone") String candidatePhone,
            @RequestParam(value = "resume", required = false) MultipartFile resume,
            @RequestParam(value = "notes", required = false) String notes
    ) {
        return jobRepository.findById(jobId)
                .map(job -> {
                    try {
                        // Extract candidateId from authenticated user if available
                        UUID candidateIdSet = null;
                        try {
                            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
                            if (authentication != null && authentication.isAuthenticated()) {
                                String email = authentication.getName();
                                logger.info("🔐 Authenticated user email: {}", email);
                                Optional<User> userOpt = userRepository.findByEmail(email);
                                if (userOpt.isPresent()) {
                                    User user = userOpt.get();
                                    logger.info("👤 User found: {} (Role: {})", user.getId(), user.getRole());
                                    // Set candidateId if user is a candidate
                                    if (user.getRole() == User.UserRole.CANDIDATE) {
                                        candidateIdSet = user.getId();
                                        logger.info("✅ CandidateId set: {}", candidateIdSet);
                                    } else {
                                        logger.warn("⚠️ User is not a candidate, role: {}", user.getRole());
                                    }
                                } else {
                                    logger.warn("⚠️ User not found for email: {}", email);
                                }
                            } else {
                                logger.warn("⚠️ No authentication found in SecurityContext");
                            }
                        } catch (Exception e) {
                            logger.error("❌ Error extracting candidateId: {}", e.getMessage(), e);
                            // If authentication fails, continue without candidateId
                            // This allows applications from non-authenticated users (if needed)
                        }

                        // Check for duplicate application
                        boolean alreadyApplied = false;
                        String duplicateMessage = null;
                        
                        if (candidateIdSet != null) {
                            // Check by candidateId (for authenticated users)
                            alreadyApplied = applicationRepository.existsByJobIdAndCandidateId(jobId, candidateIdSet);
                            if (alreadyApplied) {
                                duplicateMessage = "You have already applied for this job.";
                                logger.warn("🚫 Duplicate application attempt: Candidate {} already applied for job {}", candidateIdSet, jobId);
                            }
                        } else {
                            // Check by email (for non-authenticated users or as fallback)
                            alreadyApplied = applicationRepository.existsByJobIdAndCandidateEmail(jobId, candidateEmail);
                            if (alreadyApplied) {
                                duplicateMessage = "An application with this email already exists for this job.";
                                logger.warn("🚫 Duplicate application attempt: Email {} already applied for job {}", candidateEmail, jobId);
                            }
                        }

                        if (alreadyApplied) {
                            Map<String, Object> error = new HashMap<>();
                            error.put("message", duplicateMessage);
                            error.put("status", "error");
                            error.put("errorCode", "DUPLICATE_APPLICATION");
                            logger.info("❌ Application rejected: {}", duplicateMessage);
                            return ResponseEntity.status(400).body(error);
                        }

                        Application application = new Application();
                        application.setJob(job);
                        application.setCandidateName(candidateName);
                        application.setCandidateEmail(candidateEmail);
                        application.setCandidatePhone(candidatePhone);
                        application.setNotes(notes);
                        application.setStatus(Application.ApplicationStatus.APPLIED);
                        if (candidateIdSet != null) {
                            application.setCandidateId(candidateIdSet);
                        }

                        // Handle resume upload - use FileUploadService for FTP/local storage
                        if (resume != null && !resume.isEmpty()) {
                            try {
                                String fileUrl = fileUploadService.uploadFile(resume);
                                application.setResumeUrl(fileUrl);
                                logger.info("Resume uploaded successfully: {}", fileUrl);
                            } catch (IOException e) {
                                logger.error("Failed to upload resume: {}", e.getMessage());
                                // Fallback to local storage if FTP fails
                                String fileName = UUID.randomUUID() + "_" + resume.getOriginalFilename();
                                Path filePath = uploadPath.resolve(fileName);
                                Files.copy(resume.getInputStream(), filePath);
                                application.setResumeUrl("/uploads/" + fileName);
                                logger.warn("Resume saved to local storage as fallback: /uploads/{}", fileName);
                            }
                        }

                        Application saved = applicationRepository.save(application);
                        logger.info("💾 Application saved with ID: {}, CandidateId: {}, JobId: {}", 
                            saved.getId(), saved.getCandidateId(), saved.getJob().getId());

                        // Update job applications count
                        job.setApplicationsCount(job.getApplicationsCount() + 1);
                        jobRepository.save(job);
                        logger.info("📊 Updated job applications count: {}", job.getApplicationsCount());

                        // Create notification for employer
                        try {
                            Employer employer = job.getEmployer();
                            if (employer != null && employer.getUser() != null) {
                                UUID employerUserId = employer.getUser().getId();
                                notificationService.notifyEmployerApplicationReceived(
                                    employerUserId,
                                    job.getTitle(),
                                    candidateName,
                                    candidateEmail,
                                    job.getId(),
                                    saved.getId()
                                );
                            } else {
                                logger.warn("⚠️ Could not create notification: Employer or User is null for job: {}", job.getId());
                            }
                        } catch (Exception e) {
                            logger.error("❌ Error creating notification for employer: {}", e.getMessage(), e);
                            // Don't fail the application submission if notification fails
                        }

                        // Create notification for candidate (application submission confirmation)
                        try {
                            if (candidateIdSet != null) {
                                notificationService.notifyCandidateApplicationSubmitted(
                                    candidateIdSet,
                                    job.getTitle(),
                                    job.getId(),
                                    saved.getId()
                                );
                            }
                        } catch (Exception e) {
                            logger.error("❌ Error creating notification for candidate: {}", e.getMessage(), e);
                            // Don't fail the application submission if notification fails
                        }

                        Map<String, Object> response = new HashMap<>();
                        response.put("id", saved.getId().toString());
                        response.put("candidateId", saved.getCandidateId() != null ? saved.getCandidateId().toString() : null);
                        response.put("message", "Application submitted successfully!");
                        response.put("status", "success");
                        logger.info("✅ Application response sent: {}", response);
                        return ResponseEntity.ok(response);

                    } catch (IOException e) {
                        Map<String, Object> error = new HashMap<>();
                        error.put("message", "Failed to upload resume");
                        error.put("status", "error");
                        return ResponseEntity.internalServerError().body(error);
                    }
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<Map<String, Object>> list(
            @RequestParam(value = "jobId", required = false) UUID jobId,
            @RequestParam(value = "candidateId", required = false) UUID candidateId,
            @RequestParam(value = "status", required = false) String status,
            @RequestParam(value = "search", required = false) String search,
            @RequestParam(value = "startDate", required = false) String startDate,
            @RequestParam(value = "endDate", required = false) String endDate,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size,
            @RequestParam(value = "sort", defaultValue = "appliedDate,desc") String sort
    ) {
        // Get current authenticated user
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        User currentUser = null;
        if (authentication != null && authentication.isAuthenticated()) {
            String email = authentication.getName();
            Optional<User> userOpt = userRepository.findByEmail(email);
            if (userOpt.isPresent()) {
                currentUser = userOpt.get();
            }
        }

        // Security validation: Candidates can only see their own applications
        if (currentUser != null && currentUser.getRole() == User.UserRole.CANDIDATE) {
            logger.info("🔍 Candidate requesting applications. Current user: {}, Requested candidateId: {}", 
                currentUser.getId(), candidateId);
            // If candidateId is provided, ensure it matches the current user's ID
            if (candidateId != null && !candidateId.equals(currentUser.getId())) {
                logger.warn("🚫 Unauthorized access attempt: Candidate {} tried to access applications for {}", 
                    currentUser.getId(), candidateId);
                Map<String, Object> error = new HashMap<>();
                error.put("message", "You can only view your own applications");
                error.put("status", "error");
                return ResponseEntity.status(403).body(error);
            }
            // If no candidateId provided, automatically use current user's ID
            if (candidateId == null && jobId == null) {
                candidateId = currentUser.getId();
                logger.info("✅ Auto-setting candidateId to current user: {}", candidateId);
            }
        }
        
        // Parse date range if provided
        LocalDateTime startDateTime = null;
        LocalDateTime endDateTime = null;
        if (startDate != null && !startDate.isBlank()) {
            try {
                startDateTime = LocalDateTime.parse(startDate);
            } catch (Exception e) {
                logger.warn("Invalid startDate format: {}", startDate);
            }
        }
        if (endDate != null && !endDate.isBlank()) {
            try {
                endDateTime = LocalDateTime.parse(endDate);
                // Set to end of day
                if (endDateTime != null) {
                    endDateTime = endDateTime.plusHours(23).plusMinutes(59).plusSeconds(59);
                }
            } catch (Exception e) {
                logger.warn("Invalid endDate format: {}", endDate);
            }
        }

        // Security validation: Employers can only see applications for their own jobs
        if (currentUser != null && currentUser.getRole() == User.UserRole.EMPLOYER) {
            // If no jobId specified, fetch all applications for employer's jobs
            if (jobId == null) {
                // Get employer's user ID and fetch all their jobs' applications
                Optional<Employer> employerOpt = employerRepository.findByUserId(currentUser.getId());
                if (employerOpt.isPresent()) {
                    Employer employer = employerOpt.get();
                    // Fetch applications for all jobs owned by this employer
                    List<Application> employerApplications = applicationRepository.findByEmployerUserIdWithDetails(currentUser.getId());
                    
                    // Create final copies for lambda
                    final LocalDateTime finalStartDateTime = startDateTime;
                    final LocalDateTime finalEndDateTime = endDateTime;
                    
                    // Apply filters
                    List<Application> filtered = employerApplications.stream()
                        .filter(app -> {
                            if (status != null) {
                                Application.ApplicationStatus appStatus = parseStatus(status);
                                if (app.getStatus() != appStatus) return false;
                            }
                            if (finalStartDateTime != null && app.getAppliedDate().isBefore(finalStartDateTime)) return false;
                            if (finalEndDateTime != null && app.getAppliedDate().isAfter(finalEndDateTime)) return false;
                            if (search != null && !search.isBlank()) {
                                String searchLower = search.toLowerCase();
                                if (!app.getCandidateName().toLowerCase().contains(searchLower) &&
                                    !app.getCandidateEmail().toLowerCase().contains(searchLower) &&
                                    (app.getJob() == null || !app.getJob().getTitle().toLowerCase().contains(searchLower))) {
                                    return false;
                                }
                            }
                            return true;
                        })
                        .collect(Collectors.toList());
                    
                    // Manual pagination
                    int totalElements = filtered.size();
                    int start = page * size;
                    int end = Math.min(start + size, totalElements);
                    List<Application> paginatedList = start < totalElements ? filtered.subList(start, end) : new ArrayList<>();
                    
                    String[] sortParts = sort.split(",");
                    Sort.Direction dir = (sortParts.length > 1 && sortParts[1].equalsIgnoreCase("asc")) ? Sort.Direction.ASC : Sort.Direction.DESC;
                    Pageable pageable = PageRequest.of(page, size, Sort.by(dir, sortParts[0]));
                    
                    Page<Application> result = new org.springframework.data.domain.PageImpl<>(paginatedList, pageable, totalElements);
                    
                    Map<String, Object> body = new HashMap<>();
                    body.put("content", result.getContent().stream().map(this::toResponse).collect(Collectors.toList()));
                    body.put("page", result.getNumber());
                    body.put("size", result.getSize());
                    body.put("totalElements", result.getTotalElements());
                    body.put("totalPages", result.getTotalPages());
                    return ResponseEntity.ok(body);
                }
            } else {
                // Verify that the employer owns this job
                Optional<Job> jobOpt = jobRepository.findById(jobId);
                if (jobOpt.isPresent()) {
                    Job job = jobOpt.get();
                    Employer employer = job.getEmployer();
                    if (employer == null || employer.getUser() == null || !employer.getUser().getId().equals(currentUser.getId())) {
                        logger.warn("🚫 Unauthorized access attempt: Employer {} tried to access applications for job {} (owned by different employer)", 
                            currentUser.getId(), jobId);
                        Map<String, Object> error = new HashMap<>();
                        error.put("message", "You can only view applications for your own jobs");
                        error.put("status", "error");
                        return ResponseEntity.status(403).body(error);
                    }
                    logger.info("✅ Employer {} authorized to view applications for job {}", currentUser.getId(), jobId);
                }
            }
        } else if (currentUser != null && currentUser.getRole() == User.UserRole.ADMIN) {
            // Admins can view all applications, no restriction needed
            logger.info("✅ Admin {} viewing applications", currentUser.getId());
        }

        String[] sortParts = sort.split(",");
        Sort.Direction dir = (sortParts.length > 1 && sortParts[1].equalsIgnoreCase("asc")) ? Sort.Direction.ASC : Sort.Direction.DESC;
        Pageable pageable = PageRequest.of(page, size, Sort.by(dir, sortParts[0]));

        Page<Application> result;
        List<Application> applicationsList = null;

        if (jobId != null) {
            logger.info("🔍 Fetching applications for jobId: {}", jobId);
            try {
                if (status != null) {
                    Application.ApplicationStatus appStatus = parseStatus(status);
                    // Use eager loading query to avoid LazyInitializationException
                    applicationsList = applicationRepository.findByJobIdAndStatusWithDetails(jobId, appStatus);
                    logger.info("📋 Found {} applications for job {} with status {}", applicationsList.size(), jobId, status);
                } else {
                    // Use eager loading query to avoid LazyInitializationException
                    applicationsList = applicationRepository.findByJobIdWithDetails(jobId);
                    logger.info("📋 Found {} applications for job {}", applicationsList.size(), jobId);
                }
                
                // Manual pagination for eager-loaded results
                int totalElements = applicationsList.size();
                int totalPages = (int) Math.ceil((double) totalElements / size);
                int start = page * size;
                int end = Math.min(start + size, totalElements);
                List<Application> paginatedList = start < totalElements ? applicationsList.subList(start, end) : new ArrayList<>();
                
                // Create a Page-like structure
                result = new org.springframework.data.domain.PageImpl<>(paginatedList, pageable, totalElements);
            } catch (Exception e) {
                logger.error("❌ Error fetching applications for job {}: {}", jobId, e.getMessage(), e);
                // Fallback to regular query if eager loading fails
                if (status != null) {
                    Application.ApplicationStatus appStatus = parseStatus(status);
                    result = applicationRepository.findByJobIdAndStatus(jobId, appStatus, pageable);
                } else {
                    result = applicationRepository.findByJobId(jobId, pageable);
                }
            }
        } else if (candidateId != null) {
            logger.info("🔍 Fetching applications for candidateId: {}", candidateId);
            if (status != null) {
                Application.ApplicationStatus appStatus = parseStatus(status);
                result = applicationRepository.findByCandidateIdAndStatus(candidateId, appStatus, pageable);
                logger.info("📋 Found {} applications for candidate {} with status {}", 
                    result.getTotalElements(), candidateId, status);
            } else {
                result = applicationRepository.findByCandidateId(candidateId, pageable);
                logger.info("📋 Found {} applications for candidate {}", 
                    result.getTotalElements(), candidateId);
            }
        } else if (status != null || startDateTime != null || endDateTime != null) {
            // Apply filters with date range
            Application.ApplicationStatus appStatus = status != null ? parseStatus(status) : null;
            
            if (startDateTime != null || endDateTime != null) {
                LocalDateTime effectiveStartDateTime = startDateTime;
                LocalDateTime effectiveEndDateTime = endDateTime;
                if (effectiveStartDateTime == null) effectiveStartDateTime = LocalDateTime.of(2000, 1, 1, 0, 0);
                if (effectiveEndDateTime == null) effectiveEndDateTime = LocalDateTime.now().plusYears(10);
                
                // Create final copies for lambda
                final LocalDateTime finalStartDateTime = effectiveStartDateTime;
                final LocalDateTime finalEndDateTime = effectiveEndDateTime;
                
                if (appStatus != null) {
                    // Filter by both status and date range
                    List<Application> allApps = applicationRepository.findByStatus(appStatus, PageRequest.of(0, 10000)).getContent();
                    List<Application> filtered = allApps.stream()
                        .filter(app -> !app.getAppliedDate().isBefore(finalStartDateTime) && !app.getAppliedDate().isAfter(finalEndDateTime))
                        .collect(Collectors.toList());
                    int totalElements = filtered.size();
                    int start = page * size;
                    int end = Math.min(start + size, totalElements);
                    List<Application> paginatedList = start < totalElements ? filtered.subList(start, end) : new ArrayList<>();
                    result = new org.springframework.data.domain.PageImpl<>(paginatedList, pageable, totalElements);
                } else {
                    result = applicationRepository.findByAppliedDateBetween(effectiveStartDateTime, effectiveEndDateTime, pageable);
                }
            } else {
                result = applicationRepository.findByStatus(appStatus, pageable);
            }
        } else if (search != null && !search.isBlank()) {
            result = applicationRepository.searchApplications(search.trim(), pageable);
        } else {
            result = applicationRepository.findAll(pageable);
        }
        
        // Apply date range filter to final result if not already applied
        if ((startDateTime != null || endDateTime != null) && (jobId != null || candidateId != null || search != null)) {
            // Create final copies for lambda
            final LocalDateTime finalStartDateTime = startDateTime;
            final LocalDateTime finalEndDateTime = endDateTime;
            
            List<Application> filtered = result.getContent().stream()
                .filter(app -> {
                    if (finalStartDateTime != null && app.getAppliedDate().isBefore(finalStartDateTime)) return false;
                    if (finalEndDateTime != null && app.getAppliedDate().isAfter(finalEndDateTime)) return false;
                    return true;
                })
                .collect(Collectors.toList());
            int totalElements = filtered.size();
            int start = page * size;
            int end = Math.min(start + size, totalElements);
            List<Application> paginatedList = start < totalElements ? filtered.subList(start, end) : new ArrayList<>();
            result = new org.springframework.data.domain.PageImpl<>(paginatedList, pageable, totalElements);
        }

        Map<String, Object> body = new HashMap<>();
        body.put("content", result.getContent().stream().map(this::toResponse).collect(Collectors.toList()));
        body.put("page", result.getNumber());
        body.put("size", result.getSize());
        body.put("totalElements", result.getTotalElements());
        body.put("totalPages", result.getTotalPages());
        return ResponseEntity.ok(body);
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<Map<String, Object>> updateStatus(
            @PathVariable("id") UUID id,
            @RequestBody Map<String, Object> request
    ) {
        return applicationRepository.findById(id)
                .map(application -> {
                    String statusStr = (String) request.get("status");
                    String notes = (String) request.get("notes");
                    String oldStatus = application.getStatus() != null ? application.getStatus().name() : null;

                    if (statusStr != null) {
                        Application.ApplicationStatus newStatus = parseStatus(statusStr);
                        application.setStatus(newStatus);
                    }

                    if (notes != null) {
                        application.setNotes(notes);
                    }

                    String interviewDateStr = request.get("interviewDate") instanceof String
                            ? ((String) request.get("interviewDate")).trim()
                            : null;
                    if ("interview".equalsIgnoreCase(statusStr)) {
                        if (interviewDateStr == null || interviewDateStr.isBlank()) {
                            Map<String, Object> error = new LinkedHashMap<>();
                            error.put("error", "Interview date and time are required.");
                            return ResponseEntity.badRequest().body(error);
                        }
                        try {
                            application.setInterviewDate(parseInterviewDateTime(interviewDateStr));
                        } catch (Exception e) {
                            logger.warn("Invalid interview date '{}': {}", interviewDateStr, e.getMessage());
                            Map<String, Object> error = new LinkedHashMap<>();
                            error.put("error", "Invalid interview date. Use YYYY-MM-DDTHH:mm.");
                            return ResponseEntity.badRequest().body(error);
                        }
                    }

                    Application saved = applicationRepository.save(application);

                    // Create notifications for candidate when status changes
                    try {
                        if (statusStr != null && saved.getCandidateId() != null) {
                            String jobTitle = saved.getJob() != null ? saved.getJob().getTitle() : "Job";
                            UUID jobId = saved.getJob() != null ? saved.getJob().getId() : null;

                            // If status is INTERVIEW, send interview notification
                            if ("interview".equalsIgnoreCase(statusStr)) {
                                notificationService.notifyCandidateInterviewScheduled(
                                    saved.getCandidateId(),
                                    jobTitle,
                                    interviewDateStr != null ? interviewDateStr : 
                                        (saved.getInterviewDate() != null ? saved.getInterviewDate().toString() : "TBD"),
                                    jobId,
                                    saved.getId()
                                );
                            } else {
                                // Send status update notification
                                notificationService.notifyCandidateApplicationStatus(
                                    saved.getCandidateId(),
                                    jobTitle,
                                    statusStr,
                                    jobId,
                                    saved.getId()
                                );
                            }
                        }
                    } catch (Exception e) {
                        logger.error("❌ Error creating notification for candidate on status update: {}", e.getMessage(), e);
                        // Don't fail the status update if notification fails
                    }

                    return ResponseEntity.ok(toResponse(saved));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}/notes")
    public ResponseEntity<Map<String, Object>> updateNotes(
            @PathVariable("id") UUID id,
            @RequestBody Map<String, Object> request
    ) {
        return applicationRepository.findById(id)
                .map(application -> {
                    String notes = (String) request.get("notes");
                    if (notes != null) {
                        application.setNotes(notes);
                    }
                    Application saved = applicationRepository.save(application);
                    return ResponseEntity.ok(toResponse(saved));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}/resume")
    public ResponseEntity<Map<String, Object>> updateApplicationResume(
            @PathVariable("id") UUID id,
            @RequestParam("file") MultipartFile file
    ) {
        // Get current authenticated user
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Authentication required");
            return ResponseEntity.status(401).body(error);
        }
        
        String email = authentication.getName();
        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty()) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "User not found");
            return ResponseEntity.status(404).body(error);
        }
        
        User currentUser = userOpt.get();
        
        return applicationRepository.findById(id)
                .map(application -> {
                    // Verify candidate owns this application
                    if (application.getCandidateId() == null || 
                        !application.getCandidateId().equals(currentUser.getId())) {
                        Map<String, Object> error = new HashMap<>();
                        error.put("error", "You can only update your own application resume");
                        return ResponseEntity.status(403).body(error);
                    }
                    
                    try {
                        // Upload new resume
                        String fileUrl = fileUploadService.uploadFile(file);
                        application.setResumeUrl(fileUrl);
                        Application saved = applicationRepository.save(application);
                        
                        logger.info("Resume updated for application {}: {}", id, fileUrl);
                        
                        Map<String, Object> response = new HashMap<>();
                        response.put("message", "Resume updated successfully");
                        response.put("resumeUrl", fileUrl);
                        response.put("applicationId", saved.getId().toString());
                        return ResponseEntity.ok(response);
                    } catch (IOException e) {
                        logger.error("Failed to upload resume: {}", e.getMessage());
                        Map<String, Object> error = new HashMap<>();
                        error.put("error", "Failed to upload resume: " + e.getMessage());
                        return ResponseEntity.status(500).body(error);
                    }
                })
                .orElseGet(() -> {
                    Map<String, Object> error = new HashMap<>();
                    error.put("error", "Application not found");
                    return ResponseEntity.status(404).body(error);
                });
    }

    @GetMapping("/employee/{employeeId}")
    @Transactional(readOnly = true)
    public ResponseEntity<Map<String, Object>> getApplicationsByEmployee(
            @PathVariable("employeeId") UUID employeeId,
            @RequestParam(value = "status", required = false) String status,
            @RequestParam(value = "search", required = false) String search,
            @RequestParam(value = "startDate", required = false) String startDate,
            @RequestParam(value = "endDate", required = false) String endDate,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size,
            @RequestParam(value = "sort", defaultValue = "appliedDate,desc") String sort
    ) {
        // Security: Verify the employee is accessing their own applications
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        User currentUser = null;
        if (authentication != null && authentication.isAuthenticated()) {
            String email = authentication.getName();
            Optional<User> userOpt = userRepository.findByEmail(email);
            if (userOpt.isPresent()) {
                currentUser = userOpt.get();
                // Verify employee can only access their own applications
                if (currentUser.getRole() == User.UserRole.EMPLOYER && !currentUser.getId().equals(employeeId)) {
                    Map<String, Object> error = new HashMap<>();
                    error.put("message", "You can only view applications for your own jobs");
                    error.put("status", "error");
                    return ResponseEntity.status(403).body(error);
                }
            }
        }

        // Parse date range
        LocalDateTime startDateTime = null;
        LocalDateTime endDateTime = null;
        if (startDate != null && !startDate.isBlank()) {
            try {
                startDateTime = LocalDateTime.parse(startDate);
            } catch (Exception e) {
                logger.warn("Invalid startDate format: {}", startDate);
            }
        }
        if (endDate != null && !endDate.isBlank()) {
            try {
                endDateTime = LocalDateTime.parse(endDate);
                if (endDateTime != null) {
                    endDateTime = endDateTime.plusHours(23).plusMinutes(59).plusSeconds(59);
                }
            } catch (Exception e) {
                logger.warn("Invalid endDate format: {}", endDate);
            }
        }

        // Get employer
        Optional<Employer> employerOpt = employerRepository.findByUserId(employeeId);
        if (!employerOpt.isPresent()) {
            Map<String, Object> error = new HashMap<>();
            error.put("message", "Employer not found");
            error.put("status", "error");
            return ResponseEntity.status(404).body(error);
        }

        // Fetch applications for employer's jobs
        List<Application> employerApplications = applicationRepository.findByEmployerUserIdWithDetails(employeeId);
        
        // Create final copies for lambda
        final LocalDateTime finalStartDateTime = startDateTime;
        final LocalDateTime finalEndDateTime = endDateTime;
        
        // Apply filters
        List<Application> filtered = employerApplications.stream()
            .filter(app -> {
                if (status != null) {
                    Application.ApplicationStatus appStatus = parseStatus(status);
                    if (app.getStatus() != appStatus) return false;
                }
                if (finalStartDateTime != null && app.getAppliedDate().isBefore(finalStartDateTime)) return false;
                if (finalEndDateTime != null && app.getAppliedDate().isAfter(finalEndDateTime)) return false;
                if (search != null && !search.isBlank()) {
                    String searchLower = search.toLowerCase();
                    if (!app.getCandidateName().toLowerCase().contains(searchLower) &&
                        !app.getCandidateEmail().toLowerCase().contains(searchLower) &&
                        (app.getJob() == null || !app.getJob().getTitle().toLowerCase().contains(searchLower))) {
                        return false;
                    }
                }
                return true;
            })
            .collect(Collectors.toList());
        
        // Manual pagination
        String[] sortParts = sort.split(",");
        Sort.Direction dir = (sortParts.length > 1 && sortParts[1].equalsIgnoreCase("asc")) ? Sort.Direction.ASC : Sort.Direction.DESC;
        Pageable pageable = PageRequest.of(page, size, Sort.by(dir, sortParts[0]));
        
        int totalElements = filtered.size();
        int start = page * size;
        int end = Math.min(start + size, totalElements);
        List<Application> paginatedList = start < totalElements ? filtered.subList(start, end) : new ArrayList<>();
        
        Page<Application> result = new org.springframework.data.domain.PageImpl<>(paginatedList, pageable, totalElements);
        
        Map<String, Object> body = new HashMap<>();
        // For candidate requests, include postedBy info
        boolean isCandidateRequest = currentUser != null && currentUser.getRole() == User.UserRole.CANDIDATE;
        body.put("content", result.getContent().stream()
            .map(app -> toResponse(app, isCandidateRequest))
            .collect(Collectors.toList()));
        body.put("page", result.getNumber());
        body.put("size", result.getSize());
        body.put("totalElements", result.getTotalElements());
        body.put("totalPages", result.getTotalPages());
        return ResponseEntity.ok(body);
    }

    @GetMapping("/candidate/{candidateId}")
    @Transactional(readOnly = true)
    public ResponseEntity<Map<String, Object>> getApplicationsByCandidate(
            @PathVariable("candidateId") UUID candidateId,
            @RequestParam(value = "status", required = false) String status,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size,
            @RequestParam(value = "sort", defaultValue = "appliedDate,desc") String sort
    ) {
        // Security: Verify the candidate is accessing their own applications
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        User currentUser = null;
        if (authentication != null && authentication.isAuthenticated()) {
            String email = authentication.getName();
            Optional<User> userOpt = userRepository.findByEmail(email);
            if (userOpt.isPresent()) {
                currentUser = userOpt.get();
                // Verify candidate can only access their own applications
                if (currentUser.getRole() == User.UserRole.CANDIDATE && !currentUser.getId().equals(candidateId)) {
                    Map<String, Object> error = new HashMap<>();
                    error.put("message", "You can only view your own applications");
                    error.put("status", "error");
                    return ResponseEntity.status(403).body(error);
                }
            }
        }

        String[] sortParts = sort.split(",");
        Sort.Direction dir = (sortParts.length > 1 && sortParts[1].equalsIgnoreCase("asc")) ? Sort.Direction.ASC : Sort.Direction.DESC;
        Pageable pageable = PageRequest.of(page, size, Sort.by(dir, sortParts[0]));

        Page<Application> result;
        if (status != null) {
            Application.ApplicationStatus appStatus = parseStatus(status);
            result = applicationRepository.findByCandidateIdAndStatus(candidateId, appStatus, pageable);
        } else {
            result = applicationRepository.findByCandidateId(candidateId, pageable);
        }

        Map<String, Object> body = new HashMap<>();
        // Always include postedBy info for candidate-specific endpoint
        body.put("content", result.getContent().stream()
            .map(app -> toResponse(app, true))
            .collect(Collectors.toList()));
        body.put("page", result.getNumber());
        body.put("size", result.getSize());
        body.put("totalElements", result.getTotalElements());
        body.put("totalPages", result.getTotalPages());
        return ResponseEntity.ok(body);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable("id") UUID id) {
        if (!applicationRepository.existsById(id)) return ResponseEntity.notFound().build();
        applicationRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    private LocalDateTime parseInterviewDateTime(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("Interview date is required");
        }
        String trimmed = value.trim();
        try {
            return LocalDateTime.parse(trimmed);
        } catch (Exception ignored) {
            // ISO-8601 with offset or Z, e.g. 2026-09-09T04:30:00.000Z
        }
        try {
            return OffsetDateTime.parse(trimmed).toLocalDateTime();
        } catch (Exception ignored) {
            // Instant / Zulu
        }
        return Instant.parse(trimmed).atZone(ZoneId.systemDefault()).toLocalDateTime();
    }

    private void attachCandidateProfile(Map<String, Object> response, UUID candidateId) {
        if (candidateId == null) return;
        try {
            Optional<CandidateProfile> profileOpt = candidateProfileRepository.findByCandidateId(candidateId);
            if (profileOpt.isEmpty()) return;
            CandidateProfile profile = profileOpt.get();
            response.put("candidateSpeciality", profile.getSpeciality());
            response.put("candidateSubSpeciality", profile.getSubSpeciality());
            response.put("candidateQualification", profile.getQualification());
            response.put("candidateYearsExperience", profile.getYearsExperience());
            response.put("candidateRegistrationCouncil", profile.getRegistrationCouncil());
            response.put("candidateRegistrationNumber", profile.getRegistrationNumber());
            response.put("candidateCity", profile.getCurrentCity());
            response.put("candidateState", profile.getState());
            response.put("candidateSummary", profile.getProfileSummary());
        } catch (Exception e) {
            logger.warn("Unable to attach candidate profile for {}: {}", candidateId, e.getMessage());
        }
    }

    private Application.ApplicationStatus parseStatus(String status) {
        if (status == null) return null;
        try {
            // Map UI status names to enum values
            String statusUpper = status.toUpperCase();
            if ("PENDING".equals(statusUpper)) {
                return Application.ApplicationStatus.APPLIED;
            } else if ("HIRED".equals(statusUpper)) {
                return Application.ApplicationStatus.SELECTED;
            }
            return Application.ApplicationStatus.valueOf(statusUpper);
        } catch (IllegalArgumentException e) {
            return Application.ApplicationStatus.APPLIED;
        }
    }

    private Map<String, Object> toResponse(Application app) {
        return toResponse(app, false);
    }

    private Map<String, Object> toResponse(Application app, boolean includePostedBy) {
        Map<String, Object> m = new LinkedHashMap<>();
        try {
            m.put("id", app.getId().toString());
            
            // Safely access job with null checks
            Job job = app.getJob();
            if (job != null) {
                m.put("jobId", job.getId().toString());
                m.put("jobTitle", job.getTitle() != null ? job.getTitle() : "N/A");
                
                // Safely access employer with null checks
                try {
                    Employer employer = job.getEmployer();
                    m.put("jobOrganization", employer != null && employer.getCompanyName() != null 
                        ? employer.getCompanyName() : "N/A");
                    
                    // Include postedBy info for candidate view
                    if (includePostedBy && employer != null) {
                        Map<String, Object> postedBy = new LinkedHashMap<>();
                        try {
                            User employerUser = employer.getUser();
                            if (employerUser != null) {
                                postedBy.put("userId", employerUser.getId().toString());
                                postedBy.put("name", employerUser.getName() != null ? employerUser.getName() : "N/A");
                                // Only include email if it's safe (optional)
                                // postedBy.put("email", employerUser.getEmail());
                                postedBy.put("company", employer.getCompanyName() != null ? employer.getCompanyName() : "N/A");
                            } else {
                                postedBy.put("userId", null);
                                postedBy.put("name", "N/A");
                                postedBy.put("company", employer.getCompanyName() != null ? employer.getCompanyName() : "N/A");
                            }
                        } catch (Exception e) {
                            logger.warn("⚠️ Error accessing employer user for job {}: {}", job.getId(), e.getMessage());
                            postedBy.put("userId", null);
                            postedBy.put("name", "N/A");
                            postedBy.put("company", employer.getCompanyName() != null ? employer.getCompanyName() : "N/A");
                        }
                        m.put("postedBy", postedBy);
                    }
                } catch (Exception e) {
                    logger.warn("⚠️ Error accessing employer for job {}: {}", job.getId(), e.getMessage());
                    m.put("jobOrganization", "N/A");
                    if (includePostedBy) {
                        Map<String, Object> postedBy = new LinkedHashMap<>();
                        postedBy.put("userId", null);
                        postedBy.put("name", "N/A");
                        postedBy.put("company", "N/A");
                        m.put("postedBy", postedBy);
                    }
                }
            } else {
                logger.warn("⚠️ Job is null for application {}", app.getId());
                m.put("jobId", "N/A");
                m.put("jobTitle", "N/A");
                m.put("jobOrganization", "N/A");
                if (includePostedBy) {
                    Map<String, Object> postedBy = new LinkedHashMap<>();
                    postedBy.put("userId", null);
                    postedBy.put("name", "N/A");
                    postedBy.put("company", "N/A");
                    m.put("postedBy", postedBy);
                }
            }
            
            m.put("candidateId", app.getCandidateId() != null ? app.getCandidateId().toString() : null);
            m.put("candidateName", app.getCandidateName() != null ? app.getCandidateName() : "N/A");
            m.put("candidateEmail", app.getCandidateEmail() != null ? app.getCandidateEmail() : "N/A");
            m.put("candidatePhone", app.getCandidatePhone() != null ? app.getCandidatePhone() : "N/A");
            attachCandidateProfile(m, app.getCandidateId());
            
            // Get resume URL - check both application resume and Resume entity
            String resumeUrl = app.getResumeUrl();
            // If no resume in application, check if candidate uploaded resume separately
            if ((resumeUrl == null || resumeUrl.isEmpty()) && app.getCandidateId() != null && job != null) {
                try {
                    Optional<com.medexjob.entity.Resume> resumeOpt = resumeRepository.findFirstByJobIdAndCandidateIdOrderByUploadedAtDesc(
                        job.getId(), app.getCandidateId());
                    if (resumeOpt.isPresent()) {
                        resumeUrl = resumeOpt.get().getFileUrl();
                        logger.debug("Found resume from Resume entity for candidate {} and job {}", 
                            app.getCandidateId(), job.getId());
                    }
                } catch (Exception e) {
                    logger.warn("Error fetching resume from Resume entity: {}", e.getMessage());
                }
            }
            m.put("resumeUrl", resumeUrl);
            
            // Map status for UI: APPLIED -> pending, SELECTED -> hired
            String statusStr = app.getStatus() != null ? app.getStatus().name().toLowerCase() : "applied";
            if ("applied".equals(statusStr)) {
                statusStr = "pending";
            } else if ("selected".equals(statusStr)) {
                statusStr = "hired";
            }
            m.put("status", statusStr);
            m.put("notes", app.getNotes());
            m.put("interviewDate", app.getInterviewDate() != null ? app.getInterviewDate().toString() : null);
            m.put("appliedDate", app.getAppliedDate() != null ? app.getAppliedDate().toString() : null);
        } catch (Exception e) {
            logger.error("❌ Error creating application response for application {}: {}", app.getId(), e.getMessage(), e);
            // Return minimal response on error
            m.put("id", app.getId().toString());
            m.put("error", "Failed to load application details");
        }
        return m;
    }
}
