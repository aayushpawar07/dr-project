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
import com.medexjob.service.ApplicationEligibilityService;
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
    private final ApplicationEligibilityService eligibilityService;
    private final Path uploadPath = Paths.get("uploads");

    public ApplicationController(ApplicationRepository applicationRepository, JobRepository jobRepository, UserRepository userRepository, NotificationRepository notificationRepository, NotificationService notificationService, EmployerRepository employerRepository, ResumeRepository resumeRepository, CandidateProfileRepository candidateProfileRepository, FileUploadService fileUploadService, ApplicationEligibilityService eligibilityService) {
        this.applicationRepository = applicationRepository;
        this.jobRepository = jobRepository;
        this.userRepository = userRepository;
        this.notificationRepository = notificationRepository;
        this.notificationService = notificationService;
        this.employerRepository = employerRepository;
        this.resumeRepository = resumeRepository;
        this.candidateProfileRepository = candidateProfileRepository;
        this.fileUploadService = fileUploadService;
        this.eligibilityService = eligibilityService;
        try {
            Files.createDirectories(uploadPath);
        } catch (IOException e) {
            throw new RuntimeException("Could not create upload directory", e);
        }
    }

    @PostMapping
    @Transactional
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
                        }

                        // Fallback: If no candidateId from security context, check if candidate email is a registered candidate
                        if (candidateIdSet == null && candidateEmail != null && !candidateEmail.isBlank()) {
                            try {
                                Optional<User> registeredCand = userRepository.findByEmail(candidateEmail.trim().toLowerCase());
                                if (registeredCand.isPresent()) {
                                    candidateIdSet = registeredCand.get().getId();
                                    logger.info("✅ Candidate matched by email: {}", candidateIdSet);
                                }
                            } catch (Exception ex) {
                                logger.warn("Could not lookup user by email {}: {}", candidateEmail, ex.getMessage());
                            }
                        }

                        // Check for duplicate application
                        boolean alreadyApplied = false;
                        String duplicateMessage = null;
                        
                        if (candidateIdSet != null) {
                            alreadyApplied = applicationRepository.existsByJobIdAndCandidateId(jobId, candidateIdSet);
                            if (alreadyApplied) {
                                duplicateMessage = "You have already applied for this job.";
                                logger.warn("🚫 Duplicate application attempt: Candidate {} already applied for job {}", candidateIdSet, jobId);
                            }
                        } else {
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
                        job.setApplicationsCount((job.getApplicationsCount() != null ? job.getApplicationsCount() : 0) + 1);
                        jobRepository.save(job);
                        logger.info("📊 Updated job applications count: {}", job.getApplicationsCount());

                        // Create notification for employer (reliably fetch employer user)
                        try {
                            UUID employerUserId = null;
                            if (job.getEmployer() != null) {
                                UUID employerId = job.getEmployer().getId();
                                Optional<Employer> empOpt = employerRepository.findByIdWithUser(employerId);
                                if (empOpt.isPresent() && empOpt.get().getUser() != null) {
                                    employerUserId = empOpt.get().getUser().getId();
                                }
                            }
                            if (employerUserId != null) {
                                notificationService.notifyEmployerApplicationReceived(
                                    employerUserId,
                                    job.getTitle(),
                                    candidateName,
                                    candidateEmail,
                                    job.getId(),
                                    saved.getId()
                                );
                                logger.info("🔔 Application notification triggered for employer user: {}", employerUserId);
                            } else {
                                logger.warn("⚠️ Could not find employer user ID for job: {}", job.getId());
                            }
                        } catch (Exception e) {
                            logger.error("❌ Error creating notification for employer: {}", e.getMessage(), e);
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
            @RequestParam(value = "qualification", required = false) String qualification,
            @RequestParam(value = "speciality", required = false) String speciality,
            @RequestParam(value = "minExp", required = false) Integer minExp,
            @RequestParam(value = "maxExp", required = false) Integer maxExp,
            @RequestParam(value = "hasRegistration", required = false) Boolean hasRegistration,
            @RequestParam(value = "registrationCouncil", required = false) String registrationCouncil,
            @RequestParam(value = "registrationState", required = false) String registrationState,
            @RequestParam(value = "state", required = false) String state,
            @RequestParam(value = "city", required = false) String city,
            @RequestParam(value = "skills", required = false) String skills,
            @RequestParam(value = "eligibleOnly", required = false) Boolean eligibleOnly,
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
            if (candidateId != null && !candidateId.equals(currentUser.getId())) {
                logger.warn("🚫 Unauthorized access attempt: Candidate {} tried to access applications for {}", 
                    currentUser.getId(), candidateId);
                Map<String, Object> error = new HashMap<>();
                error.put("message", "You can only view your own applications");
                error.put("status", "error");
                return ResponseEntity.status(403).body(error);
            }
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
                if (endDateTime != null) {
                    endDateTime = endDateTime.plusHours(23).plusMinutes(59).plusSeconds(59);
                }
            } catch (Exception e) {
                logger.warn("Invalid endDate format: {}", endDate);
            }
        }

        // Security validation: Employers can only see applications for their own jobs
        if (currentUser != null && currentUser.getRole() == User.UserRole.EMPLOYER) {
            if (jobId != null) {
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
        }

        List<Application> applicationsList;
        Job targetJob = null;
        ApplicationEligibilityService.JobCriteria targetJobCriteria = null;

        if (jobId != null) {
            Optional<Job> jOpt = jobRepository.findById(jobId);
            if (jOpt.isPresent()) {
                targetJob = jOpt.get();
                targetJobCriteria = eligibilityService.extractJobCriteria(targetJob);
            }
            if (status != null) {
                Application.ApplicationStatus appStatus = parseStatus(status);
                applicationsList = applicationRepository.findByJobIdAndStatusWithDetails(jobId, appStatus);
            } else {
                applicationsList = applicationRepository.findByJobIdWithDetails(jobId);
            }
        } else if (currentUser != null && currentUser.getRole() == User.UserRole.EMPLOYER) {
            applicationsList = applicationRepository.findByEmployerUserIdWithDetails(currentUser.getId());
        } else if (candidateId != null) {
            if (status != null) {
                Application.ApplicationStatus appStatus = parseStatus(status);
                applicationsList = applicationRepository.findByCandidateIdAndStatus(candidateId, appStatus, PageRequest.of(0, 1000)).getContent();
            } else {
                applicationsList = applicationRepository.findByCandidateId(candidateId, PageRequest.of(0, 1000)).getContent();
            }
        } else {
            // Admin viewing all applications
            applicationsList = applicationRepository.findAll();
        }

        // Batch load all candidate profiles for the applications to eliminate N+1 queries
        Set<UUID> candidateIds = applicationsList.stream()
                .map(Application::getCandidateId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        Map<UUID, CandidateProfile> profilesMap = candidateIds.isEmpty() ? Collections.emptyMap() :
                candidateProfileRepository.findByCandidateIdIn(candidateIds).stream()
                        .filter(p -> p.getCandidate() != null && p.getCandidate().getId() != null)
                        .collect(Collectors.toMap(p -> p.getCandidate().getId(), p -> p, (a, b) -> a));

        // Cache job criteria per job ID
        Map<UUID, ApplicationEligibilityService.JobCriteria> criteriaMapByJobId = new HashMap<>();
        if (targetJob != null && targetJobCriteria != null) {
            criteriaMapByJobId.put(targetJob.getId(), targetJobCriteria);
        }

        // Compute eligibility and summary counts for target job or overall
        int totalBeforeFilter = applicationsList.size();
        int totalEligibleCount = 0;
        int countShortlisted = 0;
        int countInterview = 0;
        int countSelected = 0;
        int countRejected = 0;

        Map<UUID, ApplicationEligibilityService.CandidateEligibilityResult> eligibilityMap = new HashMap<>();
        for (Application app : applicationsList) {
            CandidateProfile cp = app.getCandidateId() != null ? profilesMap.get(app.getCandidateId()) : null;
            Job appJob = app.getJob() != null ? app.getJob() : targetJob;
            ApplicationEligibilityService.JobCriteria jc = null;
            if (appJob != null) {
                jc = criteriaMapByJobId.computeIfAbsent(appJob.getId(), id -> eligibilityService.extractJobCriteria(appJob));
            }
            ApplicationEligibilityService.CandidateEligibilityResult el = eligibilityService.evaluateEligibility(jc, cp, app);
            eligibilityMap.put(app.getId(), el);

            if (el.isEligible()) totalEligibleCount++;
            if (app.getStatus() == Application.ApplicationStatus.SHORTLISTED) countShortlisted++;
            else if (app.getStatus() == Application.ApplicationStatus.INTERVIEW) countInterview++;
            else if (app.getStatus() == Application.ApplicationStatus.SELECTED) countSelected++;
            else if (app.getStatus() == Application.ApplicationStatus.REJECTED) countRejected++;
        }

        final LocalDateTime finalStartDateTime = startDateTime;
        final LocalDateTime finalEndDateTime = endDateTime;
        final Application.ApplicationStatus filterAppStatus = status != null ? parseStatus(status) : null;

        // Apply filters
        List<Application> filtered = applicationsList.stream()
                .filter(app -> {
                    // 1. Status Filter
                    if (filterAppStatus != null && app.getStatus() != filterAppStatus) {
                        return false;
                    }

                    // 2. Date Range Filter
                    if (finalStartDateTime != null && app.getAppliedDate().isBefore(finalStartDateTime)) {
                        return false;
                    }
                    if (finalEndDateTime != null && app.getAppliedDate().isAfter(finalEndDateTime)) {
                        return false;
                    }

                    CandidateProfile profile = app.getCandidateId() != null ? profilesMap.get(app.getCandidateId()) : null;
                    ApplicationEligibilityService.CandidateEligibilityResult el = eligibilityMap.get(app.getId());

                    // 3. Eligible Only Filter
                    if (Boolean.TRUE.equals(eligibleOnly)) {
                        if (el == null || !el.isEligible()) return false;
                    }

                    // 4. Qualification Filter
                    if (qualification != null && !qualification.isBlank()) {
                        String qFilter = qualification.trim().toLowerCase();
                        String candQual = profile != null && profile.getQualification() != null ? profile.getQualification().toLowerCase() : "";
                        if (!candQual.contains(qFilter)) return false;
                    }

                    // 5. Speciality Filter
                    if (speciality != null && !speciality.isBlank()) {
                        String sFilter = speciality.trim().toLowerCase();
                        String candSpec = profile != null && profile.getSpeciality() != null ? profile.getSpeciality().toLowerCase() : "";
                        String candSubSpec = profile != null && profile.getSubSpeciality() != null ? profile.getSubSpeciality().toLowerCase() : "";
                        if (!candSpec.contains(sFilter) && !candSubSpec.contains(sFilter)) return false;
                    }

                    // 6. Minimum Experience Filter
                    if (minExp != null) {
                        Integer exp = profile != null ? profile.getYearsExperience() : null;
                        if (exp == null || exp < minExp) return false;
                    }

                    // 7. Maximum Experience Filter
                    if (maxExp != null) {
                        Integer exp = profile != null ? profile.getYearsExperience() : null;
                        if (exp == null || exp > maxExp) return false;
                    }

                    // 8. Medical Registration Filter
                    if (Boolean.TRUE.equals(hasRegistration)) {
                        String regNum = profile != null ? profile.getRegistrationNumber() : null;
                        if (regNum == null || regNum.isBlank()) return false;
                    }

                    // 9. Registration Council Filter
                    if (registrationCouncil != null && !registrationCouncil.isBlank()) {
                        String rcFilter = registrationCouncil.trim().toLowerCase();
                        String candCouncil = profile != null && profile.getRegistrationCouncil() != null ? profile.getRegistrationCouncil().toLowerCase() : "";
                        if (!candCouncil.contains(rcFilter)) return false;
                    }

                    // 10. Registration State Filter
                    if (registrationState != null && !registrationState.isBlank()) {
                        String rsFilter = registrationState.trim().toLowerCase();
                        String candRegState = profile != null && profile.getRegistrationState() != null ? profile.getRegistrationState().toLowerCase() : "";
                        if (!candRegState.contains(rsFilter)) return false;
                    }

                    // 11. State / Location Filter
                    if (state != null && !state.isBlank()) {
                        String stFilter = state.trim().toLowerCase();
                        String candState = profile != null && profile.getState() != null ? profile.getState().toLowerCase() : "";
                        String candPref = profile != null && profile.getPreferredLocation() != null ? profile.getPreferredLocation().toLowerCase() : "";
                        if (!candState.contains(stFilter) && !candPref.contains(stFilter)) return false;
                    }

                    // 12. City Filter
                    if (city != null && !city.isBlank()) {
                        String cityFilter = city.trim().toLowerCase();
                        String candCity = profile != null && profile.getCurrentCity() != null ? profile.getCurrentCity().toLowerCase() : "";
                        if (!candCity.contains(cityFilter)) return false;
                    }

                    // 13. Skills Filter
                    if (skills != null && !skills.isBlank()) {
                        String skillFilter = skills.trim().toLowerCase();
                        String candSkills = profile != null && profile.getSkills() != null ? profile.getSkills().toLowerCase() : "";
                        if (!candSkills.contains(skillFilter)) return false;
                    }

                    // 14. Keyword Search
                    if (search != null && !search.isBlank()) {
                        String kw = search.trim().toLowerCase();
                        String name = app.getCandidateName() != null ? app.getCandidateName().toLowerCase() : "";
                        String candEmail = app.getCandidateEmail() != null ? app.getCandidateEmail().toLowerCase() : "";
                        String phone = app.getCandidatePhone() != null ? app.getCandidatePhone().toLowerCase() : "";
                        String candCity = profile != null && profile.getCurrentCity() != null ? profile.getCurrentCity().toLowerCase() : "";
                        String regNum = profile != null && profile.getRegistrationNumber() != null ? profile.getRegistrationNumber().toLowerCase() : "";
                        String jTitle = app.getJob() != null && app.getJob().getTitle() != null ? app.getJob().getTitle().toLowerCase() : "";
                        String org = app.getJob() != null && app.getJob().getEmployer() != null && app.getJob().getEmployer().getCompanyName() != null 
                                ? app.getJob().getEmployer().getCompanyName().toLowerCase() : "";

                        boolean matches = name.contains(kw) || candEmail.contains(kw) || phone.contains(kw) 
                                || candCity.contains(kw) || regNum.contains(kw) || jTitle.contains(kw) || org.contains(kw);
                        if (!matches) return false;
                    }

                    return true;
                })
                .collect(Collectors.toList());

        // Sorting
        String[] sortParts = sort.split(",");
        String sortField = sortParts[0];
        boolean asc = sortParts.length > 1 && sortParts[1].equalsIgnoreCase("asc");

        if ("eligibility".equalsIgnoreCase(sortField) || "score".equalsIgnoreCase(sortField)) {
            filtered.sort((a, b) -> {
                int scoreA = eligibilityMap.getOrDefault(a.getId(), new ApplicationEligibilityService.CandidateEligibilityResult()).getScore();
                int scoreB = eligibilityMap.getOrDefault(b.getId(), new ApplicationEligibilityService.CandidateEligibilityResult()).getScore();
                int cmp = Integer.compare(scoreB, scoreA);
                if (cmp != 0) return asc ? -cmp : cmp;
                return b.getAppliedDate().compareTo(a.getAppliedDate());
            });
        } else {
            filtered.sort((a, b) -> {
                if (a.getAppliedDate() == null && b.getAppliedDate() == null) return 0;
                if (a.getAppliedDate() == null) return 1;
                if (b.getAppliedDate() == null) return -1;
                return asc ? a.getAppliedDate().compareTo(b.getAppliedDate()) : b.getAppliedDate().compareTo(a.getAppliedDate());
            });
        }

        // Pagination
        int totalElements = filtered.size();
        int totalPages = (int) Math.ceil((double) totalElements / size);
        int start = page * size;
        int end = Math.min(start + size, totalElements);
        List<Application> paginatedList = start < totalElements ? filtered.subList(start, end) : new ArrayList<>();

        boolean isCandidateRequest = currentUser != null && currentUser.getRole() == User.UserRole.CANDIDATE;
        final Job finalTargetJob = targetJob;
        final ApplicationEligibilityService.JobCriteria finalTargetCriteria = targetJobCriteria;

        List<Map<String, Object>> content = new ArrayList<>();
        for (Application app : paginatedList) {
            CandidateProfile cp = app.getCandidateId() != null ? profilesMap.get(app.getCandidateId()) : null;
            Job appJob = app.getJob() != null ? app.getJob() : finalTargetJob;
            ApplicationEligibilityService.JobCriteria jc = finalTargetCriteria;
            if (jc == null && appJob != null) {
                final Job jobForCriteria = appJob;
                jc = criteriaMapByJobId.computeIfAbsent(appJob.getId(), id -> eligibilityService.extractJobCriteria(jobForCriteria));
            }
            content.add(toResponse(app, isCandidateRequest, cp, jc));
        }

        Map<String, Object> body = new HashMap<>();
        body.put("content", content);
        body.put("page", page);
        body.put("size", size);
        body.put("totalElements", totalElements);
        body.put("totalPages", totalPages);

        // Include eligibility summary in the response
        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("totalApplications", totalBeforeFilter);
        summary.put("eligibleCount", totalEligibleCount);
        summary.put("shortlistedCount", countShortlisted);
        summary.put("interviewCount", countInterview);
        summary.put("selectedCount", countSelected);
        summary.put("rejectedCount", countRejected);

        if (targetJob != null && targetJobCriteria != null) {
            Map<String, Object> criteriaInfo = new LinkedHashMap<>();
            criteriaInfo.put("qualifications", targetJobCriteria.getRequiredQualifications());
            criteriaInfo.put("rawQualification", targetJobCriteria.getRawQualification());
            criteriaInfo.put("speciality", targetJobCriteria.getSpeciality());
            criteriaInfo.put("minExperience", targetJobCriteria.getMinExperienceYears());
            criteriaInfo.put("rawExperience", targetJobCriteria.getRawExperience());
            criteriaInfo.put("location", targetJobCriteria.getLocation());
            criteriaInfo.put("registrationRequired", targetJobCriteria.isRegistrationRequired());
            summary.put("jobCriteria", criteriaInfo);
        }
        body.put("eligibilitySummary", summary);

        return ResponseEntity.ok(body);
    }

    @GetMapping("/job/{jobId}/eligibility-summary")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getJobEligibilitySummary(@PathVariable("jobId") UUID jobId) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        User currentUser = null;
        if (authentication != null && authentication.isAuthenticated()) {
            currentUser = userRepository.findByEmail(authentication.getName()).orElse(null);
        }

        Optional<Job> jobOpt = jobRepository.findById(jobId);
        if (jobOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Job job = jobOpt.get();

        if (currentUser != null && currentUser.getRole() == User.UserRole.EMPLOYER) {
            Employer employer = job.getEmployer();
            if (employer == null || employer.getUser() == null || !employer.getUser().getId().equals(currentUser.getId())) {
                return ResponseEntity.status(403).body(Map.of("error", "You can only view applications for your own jobs"));
            }
        } else if (currentUser != null && currentUser.getRole() == User.UserRole.CANDIDATE) {
            return ResponseEntity.status(403).body(Map.of("error", "Candidate cannot view job applicant summary"));
        }

        List<Application> apps = applicationRepository.findByJobIdWithDetails(jobId);
        Set<UUID> candidateIds = apps.stream()
                .map(Application::getCandidateId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        Map<UUID, CandidateProfile> profilesMap = candidateIds.isEmpty() ? Collections.emptyMap() :
                candidateProfileRepository.findByCandidateIdIn(candidateIds).stream()
                        .filter(p -> p.getCandidate() != null && p.getCandidate().getId() != null)
                        .collect(Collectors.toMap(p -> p.getCandidate().getId(), p -> p, (a, b) -> a));

        ApplicationEligibilityService.JobCriteria criteria = eligibilityService.extractJobCriteria(job);

        int eligibleCount = 0;
        int shortlistedCount = 0;
        int interviewCount = 0;
        int selectedCount = 0;
        int rejectedCount = 0;

        for (Application app : apps) {
            CandidateProfile profile = app.getCandidateId() != null ? profilesMap.get(app.getCandidateId()) : null;
            ApplicationEligibilityService.CandidateEligibilityResult res = eligibilityService.evaluateEligibility(criteria, profile, app);
            if (res.isEligible()) eligibleCount++;

            if (app.getStatus() == Application.ApplicationStatus.SHORTLISTED) shortlistedCount++;
            else if (app.getStatus() == Application.ApplicationStatus.INTERVIEW) interviewCount++;
            else if (app.getStatus() == Application.ApplicationStatus.SELECTED) selectedCount++;
            else if (app.getStatus() == Application.ApplicationStatus.REJECTED) rejectedCount++;
        }

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("jobId", jobId.toString());
        body.put("jobTitle", job.getTitle());
        body.put("totalApplications", apps.size());
        body.put("eligibleCount", eligibleCount);
        body.put("shortlistedCount", shortlistedCount);
        body.put("interviewCount", interviewCount);
        body.put("selectedCount", selectedCount);
        body.put("rejectedCount", rejectedCount);

        Map<String, Object> criteriaMap = new LinkedHashMap<>();
        criteriaMap.put("qualifications", criteria.getRequiredQualifications());
        criteriaMap.put("rawQualification", criteria.getRawQualification());
        criteriaMap.put("speciality", criteria.getSpeciality());
        criteriaMap.put("minExperience", criteria.getMinExperienceYears());
        criteriaMap.put("rawExperience", criteria.getRawExperience());
        criteriaMap.put("location", criteria.getLocation());
        criteriaMap.put("registrationRequired", criteria.isRegistrationRequired());
        body.put("jobCriteria", criteriaMap);

        return ResponseEntity.ok(body);
    }

    @PutMapping("/{id}/status")
    @Transactional
    public ResponseEntity<Map<String, Object>> updateStatus(
            @PathVariable("id") UUID id,
            @RequestBody Map<String, Object> request
    ) {
        return applicationRepository.findById(id)
                .map(application -> {
                    String statusStr = (String) request.get("status");
                    String notes = (String) request.get("notes");
                    String interviewLink = request.get("interviewLink") instanceof String
                            ? ((String) request.get("interviewLink")).trim()
                            : null;
                    String interviewNotes = request.get("interviewNotes") instanceof String
                            ? ((String) request.get("interviewNotes")).trim()
                            : null;
                    String oldStatus = application.getStatus() != null ? application.getStatus().name() : null;

                    if (statusStr != null) {
                        Application.ApplicationStatus newStatus = parseStatus(statusStr);
                        application.setStatus(newStatus);
                    }

                    if (notes != null) {
                        application.setNotes(notes);
                    }

                    if (interviewLink != null) {
                        application.setInterviewLink(interviewLink);
                    }

                    if (interviewNotes != null) {
                        application.setInterviewNotes(interviewNotes);
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
                        UUID targetCandidateId = saved.getCandidateId();
                        // If candidateId is missing on the record, look up registered candidate user by email
                        if (targetCandidateId == null && saved.getCandidateEmail() != null && !saved.getCandidateEmail().isBlank()) {
                            try {
                                Optional<User> candUser = userRepository.findByEmail(saved.getCandidateEmail().trim().toLowerCase());
                                if (candUser.isPresent()) {
                                    targetCandidateId = candUser.get().getId();
                                    saved.setCandidateId(targetCandidateId);
                                    applicationRepository.save(saved);
                                    logger.info("✅ Linked application to candidate user: {}", targetCandidateId);
                                }
                            } catch (Exception ex) {
                                logger.warn("Could not lookup candidate by email {}: {}", saved.getCandidateEmail(), ex.getMessage());
                            }
                        }

                        if (statusStr != null && targetCandidateId != null) {
                            String jobTitle = "Job";
                            UUID jobId = null;
                            if (saved.getJob() != null) {
                                jobTitle = saved.getJob().getTitle() != null ? saved.getJob().getTitle() : "Job";
                                jobId = saved.getJob().getId();
                            }

                            // If status is INTERVIEW, send interview notification with meeting link & notes
                            if ("interview".equalsIgnoreCase(statusStr)) {
                                notificationService.notifyCandidateInterviewScheduled(
                                    targetCandidateId,
                                    jobTitle,
                                    interviewDateStr != null ? interviewDateStr : 
                                        (saved.getInterviewDate() != null ? saved.getInterviewDate().toString() : "TBD"),
                                    saved.getInterviewLink(),
                                    saved.getInterviewNotes(),
                                    jobId,
                                    saved.getId()
                                );
                                logger.info("🔔 Interview scheduled notification dispatched for candidate: {}", targetCandidateId);

                                // Also notify employer if an admin or another user scheduled the interview
                                try {
                                    if (saved.getJob() != null && saved.getJob().getEmployer() != null) {
                                        UUID employerId = saved.getJob().getEmployer().getId();
                                        Optional<Employer> empOpt = employerRepository.findByIdWithUser(employerId);
                                        if (empOpt.isPresent() && empOpt.get().getUser() != null) {
                                            UUID employerUserId = empOpt.get().getUser().getId();
                                            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
                                            String actorEmail = auth != null ? auth.getName() : null;
                                            boolean isActorEmployer = actorEmail != null && empOpt.get().getUser().getEmail() != null
                                                    && actorEmail.equalsIgnoreCase(empOpt.get().getUser().getEmail());

                                            if (!isActorEmployer) {
                                                String dateDisplay = interviewDateStr != null ? interviewDateStr :
                                                        (saved.getInterviewDate() != null ? saved.getInterviewDate().toString() : "TBD");
                                                StringBuilder empMsg = new StringBuilder();
                                                empMsg.append(String.format("📅 Interview scheduled for '%s' (%s) on %s.",
                                                        saved.getCandidateName(), jobTitle, dateDisplay));
                                                if (saved.getInterviewLink() != null && !saved.getInterviewLink().isBlank()) {
                                                    empMsg.append(" Meeting link: ").append(saved.getInterviewLink().trim()).append(".");
                                                }
                                                String finalEmpMsg = empMsg.toString();
                                                if (finalEmpMsg.length() > 500) finalEmpMsg = finalEmpMsg.substring(0, 497) + "...";
                                                notificationService.createNotification(
                                                        employerUserId,
                                                        "Interview Scheduled by Admin",
                                                        finalEmpMsg,
                                                        "interview_scheduled",
                                                        saved.getId().toString()
                                                );
                                                logger.info("🔔 Interview notification sent to employer user: {}", employerUserId);
                                            }
                                        }
                                    }
                                } catch (Exception empEx) {
                                    logger.error("❌ Error creating interview notification for employer: {}", empEx.getMessage(), empEx);
                                }
                            } else {
                                // Send status update notification
                                notificationService.notifyCandidateApplicationStatus(
                                    targetCandidateId,
                                    jobTitle,
                                    statusStr,
                                    jobId,
                                    saved.getId()
                                );
                                logger.info("🔔 Application status update notification dispatched for candidate: {}", targetCandidateId);
                            }
                        } else {
                            logger.warn("⚠️ Cannot send notification: statusStr={}, targetCandidateId={}", statusStr, targetCandidateId);
                        }
                    } catch (Exception e) {
                        logger.error("❌ Error creating notification for candidate on status update: {}", e.getMessage(), e);
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

    private void attachCandidateProfile(Map<String, Object> response, CandidateProfile profile) {
        if (profile == null) return;
        try {
            response.put("candidateSpeciality", profile.getSpeciality());
            response.put("candidateSubSpeciality", profile.getSubSpeciality());
            response.put("candidateQualification", profile.getQualification());
            response.put("candidateYearsExperience", profile.getYearsExperience());
            response.put("candidateRegistrationCouncil", profile.getRegistrationCouncil());
            response.put("candidateRegistrationNumber", profile.getRegistrationNumber());
            response.put("candidateRegistrationState", profile.getRegistrationState());
            response.put("candidateRegistrationYear", profile.getRegistrationYear());
            response.put("candidateCity", profile.getCurrentCity());
            response.put("candidateState", profile.getState());
            response.put("candidatePreferredLocation", profile.getPreferredLocation());
            response.put("candidateSummary", profile.getProfileSummary());
            response.put("candidateSkills", profile.getSkills());
            response.put("candidateCurrentOrganization", profile.getCurrentOrganization());
            response.put("candidateMedicalCategory", profile.getMedicalCategory());
            response.put("candidateProfilePhotoUrl", profile.getProfilePhotoUrl());
        } catch (Exception e) {
            logger.warn("Unable to attach candidate profile: {}", e.getMessage());
        }
    }

    private void attachCandidateProfile(Map<String, Object> response, UUID candidateId) {
        if (candidateId == null) return;
        try {
            Optional<CandidateProfile> profileOpt = candidateProfileRepository.findByCandidateId(candidateId);
            profileOpt.ifPresent(profile -> attachCandidateProfile(response, profile));
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
        return toResponse(app, false, null, null);
    }

    private Map<String, Object> toResponse(Application app, boolean includePostedBy) {
        return toResponse(app, includePostedBy, null, null);
    }

    private Map<String, Object> toResponse(Application app, boolean includePostedBy, CandidateProfile profile, ApplicationEligibilityService.JobCriteria jobCriteria) {
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
            
            CandidateProfile effectiveProfile = profile;
            if (effectiveProfile == null && app.getCandidateId() != null) {
                effectiveProfile = candidateProfileRepository.findByCandidateId(app.getCandidateId()).orElse(null);
            }
            attachCandidateProfile(m, effectiveProfile);

            // Compute eligibility
            ApplicationEligibilityService.JobCriteria effectiveCriteria = jobCriteria;
            if (effectiveCriteria == null && job != null) {
                effectiveCriteria = eligibilityService.extractJobCriteria(job);
            }
            if (effectiveCriteria != null) {
                ApplicationEligibilityService.CandidateEligibilityResult el = eligibilityService.evaluateEligibility(effectiveCriteria, effectiveProfile, app);
                m.put("isEligible", el.isEligible());
                m.put("eligibilityScore", el.getScore());
                m.put("matchingCriteria", el.getMatchingCriteria());
                m.put("unmetCriteria", el.getUnmetCriteria());
            } else {
                m.put("isEligible", true);
                m.put("eligibilityScore", 100);
                m.put("matchingCriteria", Collections.emptyList());
                m.put("unmetCriteria", Collections.emptyList());
            }
            
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
            m.put("interviewLink", app.getInterviewLink());
            m.put("interviewNotes", app.getInterviewNotes());
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
