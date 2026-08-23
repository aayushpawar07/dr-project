package com.medexjob.service;

import com.medexjob.entity.Employer;
import com.medexjob.entity.Job;
import com.medexjob.entity.User;
import com.medexjob.repository.EmployerRepository;
import com.medexjob.repository.JobRepository;
import com.medexjob.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Publishes one candidate-facing job in its own transaction so a single
 * vacancy failure cannot roll back jobs that already succeeded.
 */
@Service
public class VacancyJobPublisher {
    private final JobRepository jobRepository;
    private final EmployerRepository employerRepository;
    private final UserRepository userRepository;

    public VacancyJobPublisher(
            JobRepository jobRepository,
            EmployerRepository employerRepository,
            UserRepository userRepository
    ) {
        this.jobRepository = jobRepository;
        this.employerRepository = employerRepository;
        this.userRepository = userRepository;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Job saveNew(Job job) {
        if (job.getEmployer() != null && job.getEmployer().getId() != null) {
            Employer employer = employerRepository.findById(job.getEmployer().getId())
                    .orElseThrow(() -> new IllegalStateException("Employer not found for published job"));
            job.setEmployer(employer);
        }
        if (job.getApprovedBy() != null && job.getApprovedBy().getId() != null) {
            User approver = userRepository.findById(job.getApprovedBy().getId()).orElse(null);
            job.setApprovedBy(approver);
        }
        return jobRepository.saveAndFlush(job);
    }
}
