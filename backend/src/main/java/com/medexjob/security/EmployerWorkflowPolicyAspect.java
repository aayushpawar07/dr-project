package com.medexjob.security;

import com.medexjob.entity.Application;
import com.medexjob.entity.Employer;
import com.medexjob.entity.Job;
import com.medexjob.entity.User;
import com.medexjob.repository.ApplicationRepository;
import com.medexjob.repository.EmployerRepository;
import com.medexjob.repository.JobRepository;
import com.medexjob.repository.UserRepository;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.lang.reflect.Method;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Cross-cutting policy for employer-owned writes.
 *
 * It intentionally runs before the legacy controller logic so an active paid
 * subscription can never be used as a substitute for employer verification.
 * It also protects application status changes from cross-employer access.
 */
@Aspect
@Component
public class EmployerWorkflowPolicyAspect {
    private final UserRepository userRepository;
    private final EmployerRepository employerRepository;
    private final JobRepository jobRepository;
    private final ApplicationRepository applicationRepository;

    public EmployerWorkflowPolicyAspect(
            UserRepository userRepository,
            EmployerRepository employerRepository,
            JobRepository jobRepository,
            ApplicationRepository applicationRepository
    ) {
        this.userRepository = userRepository;
        this.employerRepository = employerRepository;
        this.jobRepository = jobRepository;
        this.applicationRepository = applicationRepository;
    }

    @Around("execution(* com.medexjob.controller.JobController.create(..)) && args(request)")
    public Object protectEmployerJobCreate(ProceedingJoinPoint joinPoint, Object request) throws Throwable {
        Optional<User> current = currentUser();
        if (current.isEmpty() || current.get().getRole() != User.UserRole.EMPLOYER) {
            return joinPoint.proceed();
        }

        User user = current.get();
        Optional<Employer> employer = employerRepository.findByUserId(user.getId());
        if (employer.isEmpty() || !isApproved(employer.get())) {
            return ResponseEntity.status(403).body(Map.of(
                    "error", "Employer verification is required before posting jobs.",
                    "redirectTo", "/verification"
            ));
        }

        String requestedSector = readStringAccessor(request, "sector");
        if (requestedSector != null && !requestedSector.isBlank() && !requestedSector.equalsIgnoreCase("private")) {
            return ResponseEntity.status(403).body(Map.of(
                    "error", "Employer accounts can post Private jobs only. Government jobs are managed by Admin."
            ));
        }

        return joinPoint.proceed();
    }

    @Around("execution(* com.medexjob.controller.JobController.update(..)) && args(jobId,request)")
    public Object protectEmployerJobUpdate(ProceedingJoinPoint joinPoint, UUID jobId, Object request) throws Throwable {
        Optional<User> current = currentUser();
        if (current.isEmpty() || current.get().getRole() != User.UserRole.EMPLOYER) {
            return joinPoint.proceed();
        }

        Optional<Employer> employer = employerRepository.findByUserId(current.get().getId());
        Optional<Job> job = jobRepository.findById(jobId);
        if (employer.isEmpty() || !isApproved(employer.get())) {
            return ResponseEntity.status(403).body(Map.of("error", "Employer verification is required before editing jobs."));
        }
        if (job.isEmpty() || job.get().getEmployer() == null || !job.get().getEmployer().getId().equals(employer.get().getId())) {
            return ResponseEntity.status(403).body(Map.of("error", "You can only edit your own jobs."));
        }
        String requestedSector = readStringAccessor(request, "sector");
        if ((requestedSector != null && !requestedSector.isBlank() && !requestedSector.equalsIgnoreCase("private"))
                || job.get().getSector() != Job.JobSector.PRIVATE) {
            return ResponseEntity.status(403).body(Map.of("error", "Employer accounts can manage Private jobs only."));
        }
        return joinPoint.proceed();
    }

    @Around("execution(* com.medexjob.controller.ApplicationController.updateStatus(..)) && args(applicationId,request)")
    public Object protectApplicationStatus(ProceedingJoinPoint joinPoint, UUID applicationId, Map<String, Object> request) throws Throwable {
        Optional<User> current = currentUser();
        if (current.isEmpty()) {
            return ResponseEntity.status(401).body(Map.of("error", "Authentication required"));
        }
        if (current.get().getRole() == User.UserRole.ADMIN) {
            return joinPoint.proceed();
        }
        if (current.get().getRole() != User.UserRole.EMPLOYER) {
            return ResponseEntity.status(403).body(Map.of("error", "Only the owning employer or Admin can update application status."));
        }

        Optional<Employer> employer = employerRepository.findByUserId(current.get().getId());
        Optional<Application> application = applicationRepository.findById(applicationId);
        if (employer.isEmpty() || application.isEmpty() || application.get().getJob() == null) {
            return ResponseEntity.status(404).body(Map.of("error", "Application or employer profile not found."));
        }

        UUID jobId = application.get().getJob().getId();
        Optional<Job> job = jobRepository.findById(jobId);
        if (job.isEmpty() || job.get().getEmployer() == null || !job.get().getEmployer().getId().equals(employer.get().getId())) {
            return ResponseEntity.status(403).body(Map.of("error", "You can only update applications submitted to your own jobs."));
        }
        return joinPoint.proceed();
    }

    private boolean isApproved(Employer employer) {
        return Boolean.TRUE.equals(employer.getIsVerified())
                && employer.getVerificationStatus() == Employer.VerificationStatus.APPROVED;
    }

    private Optional<User> currentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated() || authentication.getName() == null) {
            return Optional.empty();
        }
        return userRepository.findByEmail(authentication.getName());
    }

    private String readStringAccessor(Object request, String accessorName) {
        if (request == null) return null;
        try {
            Method method = request.getClass().getDeclaredMethod(accessorName);
            method.setAccessible(true);
            Object value = method.invoke(request);
            return value == null ? null : String.valueOf(value);
        } catch (Exception ignored) {
            return null;
        }
    }
}
