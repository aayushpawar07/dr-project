package com.medexjob.service;

import com.medexjob.entity.Job;
import com.medexjob.repository.JobRepository;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDate;

@Service
public class JobExpirationService {

    private static final Logger logger = LoggerFactory.getLogger(JobExpirationService.class);

    private final JobRepository jobRepository;

    public JobExpirationService(JobRepository jobRepository) {
        this.jobRepository = jobRepository;
    }

    /**
     * Run on application startup to ensure expired jobs are immediately transitioned.
     */
    @PostConstruct
    public void cleanupExpiredJobsOnStartup() {
        processExpiredJobs();
    }

    /**
     * Run daily at 00:05 (5 minutes past midnight) to close expired jobs.
     */
    @Scheduled(cron = "0 5 0 * * ?")
    public void scheduleDailyJobExpiration() {
        processExpiredJobs();
    }

    /**
     * Automatically update ACTIVE jobs with past lastDate to CLOSED.
     */
    public int processExpiredJobs() {
        try {
            LocalDate today = LocalDate.now();
            int closedCount = jobRepository.closeExpiredActiveJobs(Job.JobStatus.CLOSED, Job.JobStatus.ACTIVE, today);
            if (closedCount > 0) {
                logger.info("🕒 Auto-expired {} outdated jobs where lastDate < {}", closedCount, today);
            }
            return closedCount;
        } catch (Exception e) {
            logger.error("Error processing expired jobs: {}", e.getMessage(), e);
            return 0;
        }
    }
}
