package com.medexjob.controller;

import com.medexjob.entity.Job;
import com.medexjob.entity.User;
import com.medexjob.repository.ApplicationRepository;
import com.medexjob.repository.EmployerRepository;
import com.medexjob.repository.JobRepository;
import com.medexjob.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Small public endpoints used by the homepage and production health checks.
 *
 * The existing analytics overview calculates growth, visitor and conversion
 * metrics in one request. The homepage only needs four counters, so keeping
 * these values separate prevents an unrelated analytics failure from making
 * the public site display 0 for every statistic.
 */
@RestController
@RequestMapping("/api/jobs")
public class PublicHomepageController {

    private final JobRepository jobRepository;
    private final EmployerRepository employerRepository;
    private final UserRepository userRepository;
    private final ApplicationRepository applicationRepository;

    public PublicHomepageController(
            JobRepository jobRepository,
            EmployerRepository employerRepository,
            UserRepository userRepository,
            ApplicationRepository applicationRepository
    ) {
        this.jobRepository = jobRepository;
        this.employerRepository = employerRepository;
        this.userRepository = userRepository;
        this.applicationRepository = applicationRepository;
    }

    @GetMapping("/home-summary")
    @Transactional(readOnly = true)
    public ResponseEntity<Map<String, Object>> homeSummary() {
        Map<String, Object> response = new LinkedHashMap<>();

        long activeJobs = jobRepository.findAll().stream()
                .filter(job -> job.getStatus() == Job.JobStatus.ACTIVE)
                .filter(job -> !job.isDeleted())
                .count();

        long activeCandidates = userRepository.countByRoleAndIsActiveTrue(User.UserRole.CANDIDATE);

        response.put("totalJobs", activeJobs);
        response.put("totalEmployers", employerRepository.count());
        response.put("totalUsers", activeCandidates);
        response.put("totalApplications", applicationRepository.count());

        return ResponseEntity.ok(response);
    }

    /**
     * Real API/database health endpoint. This performs an actual repository
     * query instead of only checking whether the Java process exists.
     */
    @GetMapping("/health")
    @Transactional(readOnly = true)
    public ResponseEntity<Map<String, Object>> health() {
        Map<String, Object> response = new LinkedHashMap<>();

        try {
            long totalJobs = jobRepository.count();
            long activeJobs = jobRepository.findAll().stream()
                    .filter(job -> job.getStatus() == Job.JobStatus.ACTIVE)
                    .filter(job -> !job.isDeleted())
                    .count();

            response.put("status", "UP");
            response.put("database", "UP");
            response.put("totalJobs", totalJobs);
            response.put("activeJobs", activeJobs);
            return ResponseEntity.ok(response);
        } catch (Exception exception) {
            response.put("status", "DOWN");
            response.put("database", "DOWN");
            response.put("error", exception.getClass().getSimpleName());
            return ResponseEntity.status(503).body(response);
        }
    }
}
