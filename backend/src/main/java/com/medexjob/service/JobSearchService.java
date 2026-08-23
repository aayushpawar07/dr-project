package com.medexjob.service;

import com.medexjob.entity.Job;
import com.medexjob.repository.JobRepository;
import com.medexjob.repository.JobSpecifications;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Centralised dynamic job-search service. Structured filters are intentionally
 * applied in the same query as free-text search so sector/category constraints
 * cannot be lost when a user types a keyword.
 */
@Service
public class JobSearchService {

    private final JobRepository jobRepository;

    public JobSearchService(JobRepository jobRepository) {
        this.jobRepository = jobRepository;
    }

    @Transactional(readOnly = true)
    public Page<Job> searchJobsAdvanced(
            String searchQuery,
            String location,
            Job.JobSector sector,
            Job.JobCategory category,
            Job.ExperienceLevel experienceLevel,
            String speciality,
            Job.DutyType dutyType,
            Job.JobStatus status,
            Boolean featured,
            Pageable pageable
    ) {
        Specification<Job> spec = JobSpecifications.buildSearchSpec(
                sanitizeInput(searchQuery),
                sanitizeInput(location),
                sector,
                category,
                experienceLevel,
                sanitizeInput(speciality),
                dutyType,
                status,
                featured
        );
        return jobRepository.findAll(spec, pageable);
    }

    @Transactional(readOnly = true)
    public Page<Job> searchJobsAdvanced(
            String searchQuery,
            String location,
            Job.JobSector sector,
            Job.JobCategory category,
            Job.ExperienceLevel experienceLevel,
            String speciality,
            Job.DutyType dutyType,
            Job.JobStatus status,
            Boolean featured,
            String department,
            String qualification,
            String jobType,
            String state,
            String city,
            String salary,
            boolean openOnly,
            Pageable pageable
    ) {
        Specification<Job> spec = JobSpecifications.buildSearchSpec(
                sanitizeInput(searchQuery),
                sanitizeInput(location),
                sector,
                category,
                experienceLevel,
                sanitizeInput(speciality),
                dutyType,
                status,
                featured,
                sanitizeInput(department),
                sanitizeInput(qualification),
                sanitizeInput(jobType),
                sanitizeInput(state),
                sanitizeInput(city),
                sanitizeInput(salary),
                openOnly
        );
        return jobRepository.findAll(spec, pageable);
    }

    @Transactional(readOnly = true)
    public Page<Job> searchByTitle(String title, Job.JobStatus status, Pageable pageable) {
        Specification<Job> spec = Specification
                .where(JobSpecifications.titleContains(title))
                .and(JobSpecifications.hasStatus(status));
        return jobRepository.findAll(spec, pageable);
    }

    @Transactional(readOnly = true)
    public Page<Job> searchByCompany(String companyName, Job.JobStatus status, Pageable pageable) {
        Specification<Job> spec = Specification
                .where(JobSpecifications.companyNameContains(companyName))
                .and(JobSpecifications.hasStatus(status));
        return jobRepository.findAll(spec, pageable);
    }

    private String sanitizeInput(String input) {
        if (input == null) {
            return null;
        }
        String trimmed = input.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
