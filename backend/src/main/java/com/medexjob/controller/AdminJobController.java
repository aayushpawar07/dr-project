package com.medexjob.controller;

import com.medexjob.entity.Employer;
import com.medexjob.entity.Job;
import com.medexjob.entity.User;
import com.medexjob.repository.EmployerRepository;
import com.medexjob.repository.JobRepository;
import com.medexjob.repository.UserRepository;
import com.medexjob.service.JobSearchService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Admin-specific job management controller
 * Handles admin operations like creating, updating, publishing, and deleting jobs
 */
@RestController
@RequestMapping("/api/admin/jobs")
@PreAuthorize("hasRole('ADMIN')")
public class AdminJobController {

    private static final Logger logger = LoggerFactory.getLogger(AdminJobController.class);

    @Autowired
    private JobRepository jobRepository;

    @Autowired
    private EmployerRepository employerRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JobSearchService jobSearchService;

    /**
     * Get all jobs for admin (including all statuses: DRAFT, PENDING, ACTIVE, CLOSED)
     */
    @GetMapping
    public ResponseEntity<Map<String, Object>> getAllJobs(
            @RequestParam(value = "search", required = false) String search,
            @RequestParam(value = "status", required = false) String status,
            @RequestParam(value = "sector", required = false) String sector,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size,
            @RequestParam(value = "sort", defaultValue = "createdAt,desc") String sort) {
        
        try {
            logger.info("Admin fetching all jobs - search: {}, status: {}, sector: {}", search, status, sector);

            int safePage = Math.max(page, 0);
            int safeSize = Math.min(Math.max(size, 1), 100);

            Job.JobStatus statusFilter = null;
            if (status != null && !status.isBlank() && !status.equalsIgnoreCase("all")) {
                try {
                    statusFilter = Job.JobStatus.valueOf(status.trim().toUpperCase(Locale.ROOT));
                } catch (IllegalArgumentException ex) {
                    return ResponseEntity.badRequest().body(Map.of("error", "Invalid status filter."));
                }
            }

            Job.JobSector sectorFilter = null;
            if (sector != null && !sector.isBlank() && !sector.equalsIgnoreCase("all")) {
                sectorFilter = parseSectorFilter(sector);
                if (sectorFilter == null) {
                    return ResponseEntity.badRequest().body(Map.of("error", "Invalid sector. Use government, private, or all."));
                }
            }

            String[] sortParts = sort == null ? new String[0] : sort.split(",");
            String requestedField = sortParts.length > 0 ? sortParts[0] : "createdAt";
            String sortField = Set.of("createdAt", "title", "status", "location", "lastDate").contains(requestedField)
                    ? requestedField : "createdAt";
            Sort.Direction direction = sortParts.length > 1 && sortParts[1].equalsIgnoreCase("asc")
                    ? Sort.Direction.ASC : Sort.Direction.DESC;
            Pageable pageable = PageRequest.of(safePage, safeSize, Sort.by(direction, sortField));

            Page<Job> result = jobSearchService.searchJobsAdvanced(
                    search,
                    null,
                    sectorFilter,
                    null,
                    null,
                    null,
                    null,
                    statusFilter,
                    null,
                    pageable
            );

            Map<String, Object> response = new HashMap<>();
            response.put("content", result.getContent().stream().map(this::toResponse).collect(Collectors.toList()));
            response.put("page", result.getNumber());
            response.put("size", result.getSize());
            response.put("totalElements", result.getTotalElements());
            response.put("totalPages", result.getTotalPages());
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            logger.error("Error fetching admin jobs: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body(Map.of("error", "Failed to fetch jobs: " + e.getMessage()));
        }
    }

    /**
     * Get a specific job by ID
     */
    @GetMapping("/{id}")
    public ResponseEntity<?> getJobById(@PathVariable UUID id) {
        Optional<Job> jobOpt = jobRepository.findById(id);
        
        if (jobOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Map.of("error", "Job not found", "jobId", id.toString()));
        }
        
        Job job = jobOpt.get();
        
        if (job.isDeleted()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Map.of("error", "Job not found", "jobId", id.toString()));
        }
        
        return ResponseEntity.ok(toResponse(job));
    }

    /**
     * Create a new job (admin can create without subscription)
     */
    @PostMapping
    public ResponseEntity<?> createJob(@RequestBody JobRequest req) {
        try {
            logger.info("Admin creating new job: {}", req.title());
            
            // Resolve or create employer
            Employer employer = resolveOrCreateEmployer(req.organization(), req.type());
            
            // Create new job
            Job job = new Job();
            applyRequestToJob(req, job, employer);
            
            // Set initial status (default to DRAFT or as specified)
            Job.JobStatus initialStatus = parseStatus(req.status());
            if (initialStatus == null) {
                initialStatus = Job.JobStatus.DRAFT;
            }
            job.setStatus(initialStatus);
            
            // Set featured flag
            job.setIsFeatured(req.featured() != null ? req.featured() : false);
            job.setViews(0);
            job.setApplicationsCount(0);
            
            Job saved = jobRepository.save(job);
            logger.info("Job created successfully with ID: {}", saved.getId());
            
            return ResponseEntity.status(HttpStatus.CREATED).body(toResponse(saved));
            
        } catch (Exception e) {
            logger.error("Error creating job: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of("error", "Failed to create job: " + e.getMessage()));
        }
    }

    /**
     * Update an existing job
     */
    @PutMapping("/{id}")
    public ResponseEntity<?> updateJob(@PathVariable UUID id, @RequestBody JobRequest req) {
        try {
            Optional<Job> jobOpt = jobRepository.findById(id);
            
            if (jobOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Job not found", "jobId", id.toString()));
            }
            
            Job job = jobOpt.get();
            
            if (job.isDeleted()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Job not found", "jobId", id.toString()));
            }
            
            // Update employer if organization changed
            if (req.organization() != null && !req.organization().isBlank()) {
                Employer employer = resolveOrCreateEmployer(req.organization(), req.type());
                job.setEmployer(employer);
            }
            
            // Apply updates
            applyRequestToJob(req, job, job.getEmployer());
            
            // Update status if provided
            if (req.status() != null && !req.status().isBlank()) {
                Job.JobStatus oldStatus = job.getStatus();
                Job.JobStatus newStatus = parseStatus(req.status());
                job.setStatus(newStatus);
                
                // Set approval info when publishing
                if (newStatus == Job.JobStatus.ACTIVE && oldStatus != Job.JobStatus.ACTIVE) {
                    job.setApprovedAt(LocalDateTime.now());
                    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
                    if (auth != null) {
                        Optional<User> adminUser = userRepository.findByEmail(auth.getName());
                        if (adminUser.isPresent()) {
                            job.setApprovedBy(adminUser.get());
                        }
                    }
                }
            }
            
            // Update featured flag
            if (req.featured() != null) {
                job.setIsFeatured(req.featured());
            }
            
            Job saved = jobRepository.save(job);
            logger.info("Job updated successfully: {}", saved.getId());
            
            return ResponseEntity.ok(toResponse(saved));
            
        } catch (Exception e) {
            logger.error("Error updating job: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of("error", "Failed to update job: " + e.getMessage()));
        }
    }

    /**
     * Update job status (DRAFT, ACTIVE, CLOSED, PENDING)
     */
    @PutMapping("/{id}/status")
    public ResponseEntity<?> updateJobStatus(@PathVariable UUID id, @RequestBody StatusRequest req) {
        try {
            Optional<Job> jobOpt = jobRepository.findById(id);
            
            if (jobOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Job not found", "jobId", id.toString()));
            }
            
            Job job = jobOpt.get();
            
            if (job.isDeleted()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Job not found", "jobId", id.toString()));
            }
            
            if (req.status() == null || req.status().isBlank()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Status is required"));
            }
            
            Job.JobStatus oldStatus = job.getStatus();
            Job.JobStatus newStatus = parseStatus(req.status());
            
            if (newStatus == null) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Invalid status. Valid values: DRAFT, ACTIVE, CLOSED, PENDING"));
            }
            
            job.setStatus(newStatus);
            
            // Set approval info when publishing
            if (newStatus == Job.JobStatus.ACTIVE && oldStatus != Job.JobStatus.ACTIVE) {
                job.setApprovedAt(LocalDateTime.now());
                Authentication auth = SecurityContextHolder.getContext().getAuthentication();
                if (auth != null) {
                    Optional<User> adminUser = userRepository.findByEmail(auth.getName());
                    if (adminUser.isPresent()) {
                        job.setApprovedBy(adminUser.get());
                    }
                }
            }
            
            Job saved = jobRepository.save(job);
            logger.info("Job status updated from {} to {} for job: {}", oldStatus, newStatus, id);
            
            Map<String, Object> response = new HashMap<>();
            response.put("message", "Job status updated successfully");
            response.put("job", toResponse(saved));
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            logger.error("Error updating job status: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of("error", "Failed to update job status: " + e.getMessage()));
        }
    }

    /**
     * Publish a job (change status from DRAFT/PENDING to ACTIVE)
     */
    @PutMapping("/{id}/publish")
    public ResponseEntity<?> publishJob(@PathVariable UUID id) {
        try {
            Optional<Job> jobOpt = jobRepository.findById(id);
            
            if (jobOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Job not found", "jobId", id.toString()));
            }
            
            Job job = jobOpt.get();
            
            if (job.isDeleted()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Job not found", "jobId", id.toString()));
            }
            
            // Check if job can be published
            if (job.getStatus() == Job.JobStatus.ACTIVE) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Job is already published/active"));
            }
            
            if (job.getStatus() == Job.JobStatus.CLOSED) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "Cannot publish a closed job. Please reopen it first."));
            }
            
            Job.JobStatus oldStatus = job.getStatus();
            job.setStatus(Job.JobStatus.ACTIVE);
            job.setApprovedAt(LocalDateTime.now());
            
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null) {
                Optional<User> adminUser = userRepository.findByEmail(auth.getName());
                if (adminUser.isPresent()) {
                    job.setApprovedBy(adminUser.get());
                }
            }
            
            Job saved = jobRepository.save(job);
            logger.info("Job published successfully: {} (status changed from {} to ACTIVE)", id, oldStatus);
            
            Map<String, Object> response = new HashMap<>();
            response.put("message", "Job published successfully and is now visible on the job board");
            response.put("job", toResponse(saved));
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            logger.error("Error publishing job: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of("error", "Failed to publish job: " + e.getMessage()));
        }
    }

    /**
     * Delete a job (soft delete)
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteJob(@PathVariable UUID id) {
        try {
            Optional<Job> jobOpt = jobRepository.findById(id);
            
            if (jobOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Job not found", "jobId", id.toString()));
            }
            
            Job job = jobOpt.get();
            
            if (job.isDeleted()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Job not found", "jobId", id.toString()));
            }
            
            // Soft delete - set deleted_at timestamp
            job.setDeletedAt(LocalDateTime.now());
            jobRepository.save(job);
            
            logger.info("Job soft deleted successfully: {}", id);
            
            Map<String, Object> response = new HashMap<>();
            response.put("message", "Job deleted successfully");
            response.put("jobId", id.toString());
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            logger.error("Error deleting job: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of("error", "Failed to delete job: " + e.getMessage()));
        }
    }

    /**
     * Create a sample job for testing
     */
    @PostMapping("/sample")
    public ResponseEntity<?> createSampleJob() {
        try {
            logger.info("Creating sample job");
            
            // Resolve or create employer for sample job
            Employer employer = resolveOrCreateEmployer("MedExJob Test Hospital", "hospital");
            
            // Create sample job
            Job job = new Job();
            job.setEmployer(employer);
            job.setTitle("Senior Medical Officer");
            job.setDescription("We are looking for experienced Senior Medical Officers to join our team. The candidate should have excellent clinical skills and a passion for patient care.");
            job.setSector(Job.JobSector.GOVERNMENT);
            job.setCategory(Job.JobCategory.MEDICAL_OFFICER);
            job.setLocation("New Delhi");
            job.setQualification("MBBS with MD/MS");
            job.setExperience("5+ years");
            job.setExperienceLevel(Job.ExperienceLevel.SENIOR);
            job.setSpeciality("General Medicine");
            job.setDutyType(Job.DutyType.FULL_TIME);
            job.setNumberOfPosts(10);
            job.setSalaryRange("₹80,000 - ₹1,20,000 per month");
            job.setRequirements("MBBS with MD/MS in relevant field, Valid medical license, 5+ years of clinical experience, Good communication skills");
            job.setBenefits("Health insurance, Provident Fund, Paid leaves, Professional development opportunities");
            job.setContactEmail("hr@medexjob.com");
            job.setContactPhone("+91-11-26588500");
            job.setStatus(Job.JobStatus.ACTIVE);
            job.setIsFeatured(true);
            job.setViews(0);
            job.setApplicationsCount(0);
            job.setLastDate(java.time.LocalDate.now().plusDays(30));
            
            Job saved = jobRepository.save(job);
            logger.info("Sample job created successfully with ID: {}", saved.getId());
            
            Map<String, Object> response = new HashMap<>();
            response.put("message", "Sample job created successfully");
            response.put("job", toResponse(saved));
            
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
            
        } catch (Exception e) {
            logger.error("Error creating sample job: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of("error", "Failed to create sample job: " + e.getMessage()));
        }
    }

    // Helper methods

    private void applyRequestToJob(JobRequest req, Job job, Employer employer) {
        if (employer != null) {
            job.setEmployer(employer);
        }

        // Required fields - set with defaults if not provided
        if (req.title() != null && !req.title().isBlank()) {
            job.setTitle(req.title());
        } else if (job.getTitle() == null) {
            job.setTitle("Untitled Job");
        }
        
        if (req.description() != null && !req.description().isBlank()) {
            job.setDescription(req.description());
        } else if (job.getDescription() == null) {
            job.setDescription("No description provided.");
        }
        
        if (req.sector() != null && !req.sector().isBlank()) {
            job.setSector(parseSector(req.sector()));
        } else if (job.getSector() == null) {
            job.setSector(Job.JobSector.PRIVATE);
        }
        
        if (req.category() != null && !req.category().isBlank()) {
            job.setCategory(mapCategoryFromLabel(req.category()));
        } else if (job.getCategory() == null) {
            job.setCategory(Job.JobCategory.MEDICAL_OFFICER);
        }
        
        if (req.location() != null && !req.location().isBlank()) {
            job.setLocation(req.location());
        } else if (job.getLocation() == null) {
            job.setLocation("India");
        }
        
        if (req.qualification() != null && !req.qualification().isBlank()) {
            job.setQualification(req.qualification());
        } else if (job.getQualification() == null) {
            job.setQualification("As per requirement");
        }
        
        if (req.experience() != null && !req.experience().isBlank()) {
            job.setExperience(req.experience());
        } else if (job.getExperience() == null) {
            job.setExperience("As per requirement");
        }
        
        if (req.experienceLevel() != null && !req.experienceLevel().isBlank()) {
            job.setExperienceLevel(parseExperienceLevel(req.experienceLevel()));
        }
        if (req.speciality() != null) {
            job.setSpeciality(req.speciality());
        }
        if (req.dutyType() != null && !req.dutyType().isBlank()) {
            job.setDutyType(parseDutyType(req.dutyType()));
        }
        if (req.numberOfPosts() != null) {
            job.setNumberOfPosts(req.numberOfPosts());
        } else if (job.getNumberOfPosts() == null) {
            job.setNumberOfPosts(1);
        }
        if (req.salary() != null) {
            job.setSalaryRange(req.salary());
        }
        if (req.requirements() != null) {
            job.setRequirements(req.requirements());
        }
        if (req.benefits() != null) {
            job.setBenefits(req.benefits());
        }
        if (req.lastDate() != null && !req.lastDate().isBlank()) {
            try {
                job.setLastDate(java.time.LocalDate.parse(req.lastDate()));
            } catch (Exception e) {
                job.setLastDate(java.time.LocalDate.now().plusDays(30));
            }
        } else if (job.getLastDate() == null) {
            job.setLastDate(java.time.LocalDate.now().plusDays(30));
        }
        if (req.contactEmail() != null && !req.contactEmail().isBlank()) {
            // Validate email format before setting
            String email = req.contactEmail().trim();
            if (email.matches("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+$")) {
                job.setContactEmail(email);
            } else {
                job.setContactEmail("noreply@medexjob.com");
            }
        } else if (job.getContactEmail() == null || job.getContactEmail().isBlank()) {
            job.setContactEmail("noreply@medexjob.com");
        }
        if (req.contactPhone() != null && !req.contactPhone().isBlank()) {
            job.setContactPhone(req.contactPhone().trim());
        } else if (job.getContactPhone() == null || job.getContactPhone().isBlank()) {
            job.setContactPhone("0000000000");
        }
        if (req.pdfUrl() != null) {
            job.setPdfUrl(req.pdfUrl());
        }
        if (req.jobDocumentUrl() != null) {
            job.setJobDocumentUrl(req.jobDocumentUrl());
        }
        if (req.jobImageUrl() != null) {
            job.setJobImageUrl(req.jobImageUrl());
        }
        if (req.applyLink() != null) {
            job.setApplyLink(req.applyLink());
        }
    }

    private Employer resolveOrCreateEmployer(String organization, String type) {
        String companyName = Optional.ofNullable(organization).orElse("MedExJob Admin Posted");

        // 1. Try to find an existing employer by company name
        Optional<Employer> existingEmployer = employerRepository.findByCompanyName(companyName);
        if (existingEmployer.isPresent()) {
            return existingEmployer.get();
        }

        // 2. If not found, create a new Employer
        Employer newEmployer = new Employer();
        newEmployer.setCompanyName(companyName);
        newEmployer.setCompanyType(parseCompanyType(type));
        newEmployer.setIsVerified(true);
        newEmployer.setVerificationStatus(Employer.VerificationStatus.APPROVED);

        // Associate with a User
        String dummyEmail = "admin+" + companyName.replaceAll("[^a-zA-Z0-9]", "_") + "@medexjob.com";
        User employerUser = userRepository.findByEmail(dummyEmail).orElseGet(() -> {
            User dummyUser = new User();
            dummyUser.setName("MedExJob Admin - " + companyName);
            dummyUser.setEmail(dummyEmail);
            dummyUser.setPhone("0000000000");
            dummyUser.setRole(User.UserRole.EMPLOYER);
            dummyUser.setPasswordHash(passwordEncoder.encode("AdminCreated_" + System.currentTimeMillis()));
            return userRepository.save(dummyUser);
        });
        newEmployer.setUser(employerUser);

        return employerRepository.save(newEmployer);
    }

    private Job.JobStatus parseStatus(String status) {
        if (status == null || status.isBlank()) return null;
        try {
            return Job.JobStatus.valueOf(status.toUpperCase());
        } catch (IllegalArgumentException e) {
            logger.warn("Unknown status value: '{}'", status);
            return null;
        }
    }

    private Job.JobSector parseSector(String sector) {
        if (sector == null || sector.isBlank()) return Job.JobSector.PRIVATE;
        try {
            return Job.JobSector.valueOf(sector.toUpperCase());
        } catch (IllegalArgumentException e) {
            return Job.JobSector.PRIVATE;
        }
    }

    private Job.JobSector parseSectorFilter(String sector) {
        if (sector == null || sector.isBlank() || sector.equalsIgnoreCase("all")) return null;
        try {
            return Job.JobSector.valueOf(sector.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            logger.warn("Unknown sector filter value: '{}'", sector);
            return null;
        }
    }

    private Employer.CompanyType parseCompanyType(String type) {
        if (type == null) return Employer.CompanyType.HOSPITAL;
        try {
            return Employer.CompanyType.valueOf(type.toUpperCase());
        } catch (IllegalArgumentException e) {
            return Employer.CompanyType.HOSPITAL;
        }
    }

    private Job.JobCategory mapCategoryFromLabel(String label) {
        if (label == null || label.isBlank()) return Job.JobCategory.MEDICAL_OFFICER;
        String lowerLabel = label.toLowerCase().trim();
        if (lowerLabel.equals("junior resident") || lowerLabel.equals("junior_resident")) {
            return Job.JobCategory.JUNIOR_RESIDENT;
        } else if (lowerLabel.equals("senior resident") || lowerLabel.equals("senior_resident")) {
            return Job.JobCategory.SENIOR_RESIDENT;
        } else if (lowerLabel.equals("medical officer") || lowerLabel.equals("medical_officer") || lowerLabel.equals("doctor") || lowerLabel.equals("doctors")) {
            return Job.JobCategory.MEDICAL_OFFICER;
        } else if (lowerLabel.equals("faculty") || lowerLabel.equals("professor")) {
            return Job.JobCategory.FACULTY;
        } else if (lowerLabel.equals("specialist") || lowerLabel.equals("consultant")) {
            return Job.JobCategory.SPECIALIST;
        } else if (lowerLabel.equals("dental") || lowerLabel.equals("bds") || lowerLabel.equals("mds")) {
            return Job.JobCategory.DENTAL;
        } else if (lowerLabel.equals("ayush") || lowerLabel.equals("ayurveda") || lowerLabel.equals("homoeopathy") || lowerLabel.equals("unani") || lowerLabel.equals("bams") || lowerLabel.equals("bhms")) {
            return Job.JobCategory.AYUSH;
        } else if (lowerLabel.equals("nursing") || lowerLabel.equals("nurse") || lowerLabel.equals("staff nurse") || lowerLabel.equals("gnm") || lowerLabel.equals("anm")) {
            return Job.JobCategory.NURSING;
        } else if (lowerLabel.equals("paramedical") || lowerLabel.equals("lab technician") || lowerLabel.equals("radiographer")) {
            return Job.JobCategory.PARAMEDICAL;
        } else if (lowerLabel.equals("paramedical / nursing") || lowerLabel.equals("paramedical_nursing")) {
            return Job.JobCategory.PARAMEDICAL_NURSING;
        } else if (lowerLabel.equals("allied health") || lowerLabel.equals("allied health professionals") || lowerLabel.equals("physiotherapy") || lowerLabel.equals("bpt")) {
            return Job.JobCategory.ALLIED_HEALTH;
        } else if (lowerLabel.equals("pharmacy") || lowerLabel.equals("pharmacist") || lowerLabel.equals("b.pharm") || lowerLabel.equals("d.pharm")) {
            return Job.JobCategory.PHARMACY;
        } else if (lowerLabel.equals("psychology & mental health") || lowerLabel.equals("psychology")) {
            return Job.JobCategory.PSYCHOLOGY_MENTAL_HEALTH;
        } else if (lowerLabel.equals("nutrition & dietetics") || lowerLabel.equals("dietetics") || lowerLabel.equals("nutritionist")) {
            return Job.JobCategory.NUTRITION_DIETETICS;
        } else if (lowerLabel.equals("life science & research") || lowerLabel.equals("research")) {
            return Job.JobCategory.LIFE_SCIENCE_RESEARCH;
        } else if (lowerLabel.equals("hospital administration") || lowerLabel.equals("administration") || lowerLabel.equals("mha")) {
            return Job.JobCategory.HOSPITAL_ADMINISTRATION;
        } else if (lowerLabel.equals("public health") || lowerLabel.equals("mph")) {
            return Job.JobCategory.PUBLIC_HEALTH;
        }
        return Job.JobCategory.MEDICAL_OFFICER;
    }

    private Job.ExperienceLevel parseExperienceLevel(String experienceLevel) {
        if (experienceLevel == null) return null;
        try {
            return Job.ExperienceLevel.valueOf(experienceLevel.toUpperCase());
        } catch (IllegalArgumentException e) {
            return Job.ExperienceLevel.ENTRY;
        }
    }

    private Job.DutyType parseDutyType(String dutyType) {
        if (dutyType == null) return null;
        try {
            return Job.DutyType.valueOf(dutyType.toUpperCase());
        } catch (IllegalArgumentException e) {
            return Job.DutyType.FULL_TIME;
        }
    }

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
        m.put("employerId", employerId != null ? employerId.toString() : null);
        m.put("sector", j.getSector() == Job.JobSector.GOVERNMENT ? "government" : "private");
        m.put("category", mapCategoryToLabel(j.getCategory()));
        m.put("location", j.getLocation());
        m.put("qualification", j.getQualification());
        m.put("experience", j.getExperience());
        m.put("experienceLevel", j.getExperienceLevel() != null ? j.getExperienceLevel().name().toLowerCase() : null);
        m.put("speciality", j.getSpeciality());
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
        m.put("requirements", j.getRequirements());
        m.put("benefits", j.getBenefits());
        m.put("contactEmail", j.getContactEmail());
        m.put("contactPhone", j.getContactPhone());
        m.put("status", j.getStatus().name().toLowerCase());
        m.put("featured", Boolean.TRUE.equals(j.getIsFeatured()));
        m.put("views", j.getViews());
        m.put("applications", j.getApplicationsCount());
        m.put("sourceRecruitmentId", j.getSourceRecruitmentId() != null ? j.getSourceRecruitmentId().toString() : null);
        m.put("sourceVacancyId", j.getSourceVacancyId() != null ? j.getSourceVacancyId().toString() : null);
        m.put("deleted", j.isDeleted());
        
        return m;
    }

    private String mapCategoryToLabel(Job.JobCategory c) {
        if (c == null) return "";
        switch (c) {
            case JUNIOR_RESIDENT: return "Junior Resident";
            case SENIOR_RESIDENT: return "Senior Resident";
            case MEDICAL_OFFICER: return "Medical Officer";
            case FACULTY: return "Faculty";
            case SPECIALIST: return "Specialist";
            case DENTAL: return "Dental";
            case AYUSH: return "AYUSH";
            case NURSING: return "Nursing";
            case PARAMEDICAL: return "Paramedical";
            case PARAMEDICAL_NURSING: return "Paramedical / Nursing";
            case ALLIED_HEALTH: return "Allied Health";
            case PHARMACY: return "Pharmacy";
            case PSYCHOLOGY_MENTAL_HEALTH: return "Psychology & Mental Health";
            case NUTRITION_DIETETICS: return "Nutrition & Dietetics";
            case LIFE_SCIENCE_RESEARCH: return "Life Science & Research";
            case HOSPITAL_ADMINISTRATION: return "Hospital Administration";
            case PUBLIC_HEALTH: return "Public Health";
            default: return "";
        }
    }

    // Request records
    private static class JobRequest {
        private String title;
        private String organization;
        private String sector;
        private String category;
        private String location;
        private String qualification;
        private String experience;
        private String experienceLevel;
        private String speciality;
        private String dutyType;
        private Integer numberOfPosts;
        private String salary;
        private String description;
        private String lastDate;
        private String requirements;
        private String benefits;
        private String pdfUrl;
        private String jobDocumentUrl;
        private String jobImageUrl;
        private String applyLink;
        private String status;
        private Boolean featured;
        private String contactEmail;
        private String contactPhone;
        private String type;
        
        // Getters (standard JavaBean style for Jackson)
        public String getTitle() { return title; }
        public String getOrganization() { return organization; }
        public String getSector() { return sector; }
        public String getCategory() { return category; }
        public String getLocation() { return location; }
        public String getQualification() { return qualification; }
        public String getExperience() { return experience; }
        public String getExperienceLevel() { return experienceLevel; }
        public String getSpeciality() { return speciality; }
        public String getDutyType() { return dutyType; }
        public Integer getNumberOfPosts() { return numberOfPosts; }
        public String getSalary() { return salary; }
        public String getDescription() { return description; }
        public String getLastDate() { return lastDate; }
        public String getRequirements() { return requirements; }
        public String getBenefits() { return benefits; }
        public String getPdfUrl() { return pdfUrl; }
        public String getJobDocumentUrl() { return jobDocumentUrl; }
        public String getJobImageUrl() { return jobImageUrl; }
        public String getApplyLink() { return applyLink; }
        public String getStatus() { return status; }
        public Boolean getFeatured() { return featured; }
        public String getContactEmail() { return contactEmail; }
        public String getContactPhone() { return contactPhone; }
        public String getType() { return type; }
        
        // Setters (required for Jackson deserialization)
        public void setTitle(String title) { this.title = title; }
        public void setOrganization(String organization) { this.organization = organization; }
        public void setSector(String sector) { this.sector = sector; }
        public void setCategory(String category) { this.category = category; }
        public void setLocation(String location) { this.location = location; }
        public void setQualification(String qualification) { this.qualification = qualification; }
        public void setExperience(String experience) { this.experience = experience; }
        public void setExperienceLevel(String experienceLevel) { this.experienceLevel = experienceLevel; }
        public void setSpeciality(String speciality) { this.speciality = speciality; }
        public void setDutyType(String dutyType) { this.dutyType = dutyType; }
        public void setNumberOfPosts(Integer numberOfPosts) { this.numberOfPosts = numberOfPosts; }
        public void setSalary(String salary) { this.salary = salary; }
        public void setDescription(String description) { this.description = description; }
        public void setLastDate(String lastDate) { this.lastDate = lastDate; }
        public void setRequirements(String requirements) { this.requirements = requirements; }
        public void setBenefits(String benefits) { this.benefits = benefits; }
        public void setPdfUrl(String pdfUrl) { this.pdfUrl = pdfUrl; }
        public void setJobDocumentUrl(String jobDocumentUrl) { this.jobDocumentUrl = jobDocumentUrl; }
        public void setJobImageUrl(String jobImageUrl) { this.jobImageUrl = jobImageUrl; }
        public void setApplyLink(String applyLink) { this.applyLink = applyLink; }
        public void setStatus(String status) { this.status = status; }
        public void setFeatured(Boolean featured) { this.featured = featured; }
        public void setContactEmail(String contactEmail) { this.contactEmail = contactEmail; }
        public void setContactPhone(String contactPhone) { this.contactPhone = contactPhone; }
        public void setType(String type) { this.type = type; }

        // Legacy accessor methods (for backward compatibility with existing code)
        public String title() { return title; }
        public String organization() { return organization; }
        public String sector() { return sector; }
        public String category() { return category; }
        public String location() { return location; }
        public String qualification() { return qualification; }
        public String experience() { return experience; }
        public String experienceLevel() { return experienceLevel; }
        public String speciality() { return speciality; }
        public String dutyType() { return dutyType; }
        public Integer numberOfPosts() { return numberOfPosts; }
        public String salary() { return salary; }
        public String description() { return description; }
        public String lastDate() { return lastDate; }
        public String requirements() { return requirements; }
        public String benefits() { return benefits; }
        public String pdfUrl() { return pdfUrl; }
        public String jobDocumentUrl() { return jobDocumentUrl; }
        public String jobImageUrl() { return jobImageUrl; }
        public String applyLink() { return applyLink; }
        public String status() { return status; }
        public Boolean featured() { return featured; }
        public String contactEmail() { return contactEmail; }
        public String contactPhone() { return contactPhone; }
        public String type() { return type; }
    }

    private static class StatusRequest {
        private String status;
        
        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }
        public String status() { return status; }
    }
}
