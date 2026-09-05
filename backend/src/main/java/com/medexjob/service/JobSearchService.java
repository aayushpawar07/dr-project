package com.medexjob.service;

import com.medexjob.entity.Job;
import com.medexjob.repository.JobRepository;
import com.medexjob.repository.JobSpecifications;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * Centralised candidate-facing job search.
 *
 * Free-text search deliberately spans title, organisation, department,
 * speciality, qualification, description and location so a department query
 * can discover the parent recruitment card without creating duplicate-looking
 * cards for every department.
 */
@Service
public class JobSearchService {

    private static final Set<String> GLOBAL_LOCATION_TERMS = Set.of(
            "anywhere", "any location", "all locations", "any"
    );

    private static final Set<String> TITLE_STOPWORDS = Set.of(
            "a", "an", "and", "at", "for", "in", "of", "on", "the", "to", "with",
            "job", "jobs", "vacancy", "vacancies", "post", "posts"
    );

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
        String sanitizedSearch = sanitizeInput(searchQuery);
        Specification<Job> spec = JobSpecifications.buildSearchSpec(
                sanitizedSearch,
                sanitizeLocation(location),
                sector,
                category,
                experienceLevel,
                sanitizeInput(speciality),
                dutyType,
                status,
                featured
        );

        return withEmployerLoaded(jobRepository.findAll(spec, pageable));
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
        String sanitizedSearch = sanitizeInput(searchQuery);
        Specification<Job> spec = JobSpecifications.buildSearchSpec(
                sanitizedSearch,
                sanitizeLocation(location),
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

        return withEmployerLoaded(jobRepository.findAll(spec, pageable));
    }

    @Transactional(readOnly = true)
    public Page<Job> searchByTitle(String title, Job.JobStatus status, Pageable pageable) {
        Specification<Job> spec = Specification
                .where(titleMatchesAllTerms(sanitizeInput(title)))
                .and(JobSpecifications.hasStatus(status));
        return withEmployerLoaded(jobRepository.findAll(spec, pageable));
    }

    @Transactional(readOnly = true)
    public Page<Job> searchByCompany(String companyName, Job.JobStatus status, Pageable pageable) {
        Specification<Job> spec = Specification
                .where(JobSpecifications.companyNameContains(companyName))
                .and(JobSpecifications.hasStatus(status));
        return withEmployerLoaded(jobRepository.findAll(spec, pageable));
    }

    private Page<Job> withEmployerLoaded(Page<Job> page) {
        for (Job job : page.getContent()) {
            if (job.getEmployer() != null) {
                job.getEmployer().getCompanyName();
            }
        }
        return page;
    }

    private Specification<Job> titleMatchesAllTerms(String searchQuery) {
        if (searchQuery == null) {
            return (root, query, cb) -> cb.conjunction();
        }

        List<String> rawTokens = Arrays.stream(searchQuery.toLowerCase(Locale.ROOT).split("[^\\p{L}\\p{N}]+"))
                .map(String::trim)
                .filter(token -> !token.isBlank())
                .distinct()
                .toList();

        if (rawTokens.isEmpty()) {
            return (root, query, cb) -> cb.conjunction();
        }

        List<String> meaningfulTokens = rawTokens.size() == 1
                ? rawTokens
                : rawTokens.stream()
                        .filter(token -> !TITLE_STOPWORDS.contains(token))
                        .limit(12)
                        .toList();

        List<String> titleTokens = meaningfulTokens.isEmpty() ? rawTokens : meaningfulTokens;

        return (root, query, cb) -> cb.and(
                titleTokens.stream()
                        .map(token -> cb.like(
                                cb.lower(cb.coalesce(root.get("title"), "")),
                                "%" + token + "%"
                        ))
                        .toArray(jakarta.persistence.criteria.Predicate[]::new)
        );
    }

    private String sanitizeLocation(String input) {
        String value = sanitizeInput(input);
        if (value == null) return null;
        String normalized = value.toLowerCase(Locale.ROOT).replaceAll("\\s+", " ");
        return GLOBAL_LOCATION_TERMS.contains(normalized) ? null : value;
    }

    private String sanitizeInput(String input) {
        if (input == null) {
            return null;
        }
        String trimmed = input.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
