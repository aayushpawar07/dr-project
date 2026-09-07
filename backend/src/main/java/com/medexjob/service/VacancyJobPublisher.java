package com.medexjob.service;

import com.medexjob.entity.Employer;
import com.medexjob.entity.Job;
import com.medexjob.entity.User;
import com.medexjob.repository.EmployerRepository;
import com.medexjob.repository.JobRepository;
import com.medexjob.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

/**
 * Publishes one candidate-facing job in its own transaction so a single
 * vacancy failure cannot roll back jobs that already succeeded.
 */
@Service
public class VacancyJobPublisher {
    private final JobRepository jobRepository;
    private final EmployerRepository employerRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public VacancyJobPublisher(
            JobRepository jobRepository,
            EmployerRepository employerRepository,
            UserRepository userRepository,
            PasswordEncoder passwordEncoder
    ) {
        this.jobRepository = jobRepository;
        this.employerRepository = employerRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Employer resolveOrCreateEmployer(String organisation) {
        String companyName = organisation != null && !organisation.trim().isEmpty() 
                ? organisation.trim() 
                : "MedExJob Recruitment";
        return employerRepository.findByCompanyName(companyName).orElseGet(() -> {
            String slug = slug(companyName);
            String emailSlug = slug.isBlank() ? UUID.randomUUID().toString().substring(0, 8) : slug;
            if (emailSlug.length() > 55) emailSlug = emailSlug.substring(0, 55);
            String email = "bulk+" + emailSlug + "@medexjob.com";
            User user = userRepository.findByEmail(email).orElseGet(() -> {
                User u = new User();
                u.setName(companyName + " Recruitment");
                u.setEmail(email);
                u.setPhone("0000000000");
                u.setRole(User.UserRole.EMPLOYER);
                u.setPasswordHash(passwordEncoder.encode(UUID.randomUUID().toString()));
                u.setIsVerified(true);
                return userRepository.saveAndFlush(u);
            });
            Employer e = new Employer();
            e.setUser(user);
            e.setCompanyName(companyName);
            e.setCompanyType(Employer.CompanyType.HOSPITAL);
            e.setIsVerified(true);
            e.setVerificationStatus(Employer.VerificationStatus.APPROVED);
            return employerRepository.saveAndFlush(e);
        });
    }

    private String slug(String value) {
        return Optional.ofNullable(value).orElse("").toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-").replaceAll("(^-|-$)", "");
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
