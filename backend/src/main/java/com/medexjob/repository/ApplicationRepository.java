package com.medexjob.repository;

import com.medexjob.entity.Application;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ApplicationRepository extends JpaRepository<Application, UUID> {

    // Find applications by job with eager loading
    @Query("SELECT DISTINCT a FROM Application a JOIN FETCH a.job j LEFT JOIN FETCH j.employer e WHERE a.job.id = :jobId")
    List<Application> findByJobIdWithDetails(@Param("jobId") UUID jobId);
    
    // Find applications by job (for pagination - use above method for full details)
    Page<Application> findByJobId(UUID jobId, Pageable pageable);

    // Find applications by candidate
    Page<Application> findByCandidateId(UUID candidateId, Pageable pageable);

    // Find applications by status
    Page<Application> findByStatus(Application.ApplicationStatus status, Pageable pageable);

    // Find applications by job and status with eager loading
    @Query("SELECT DISTINCT a FROM Application a JOIN FETCH a.job j LEFT JOIN FETCH j.employer e WHERE a.job.id = :jobId AND a.status = :status")
    List<Application> findByJobIdAndStatusWithDetails(@Param("jobId") UUID jobId, @Param("status") Application.ApplicationStatus status);
    
    // Find applications by job and status (for pagination)
    Page<Application> findByJobIdAndStatus(UUID jobId, Application.ApplicationStatus status, Pageable pageable);

    // Find applications by candidate and status
    Page<Application> findByCandidateIdAndStatus(UUID candidateId, Application.ApplicationStatus status, Pageable pageable);

    // Count applications by candidate
    long countByCandidateId(UUID candidateId);

    // Count applications by job
    long countByJobId(UUID jobId);

    // Count applications by status
    long countByStatus(Application.ApplicationStatus status);

    // Count applications by job and status
    long countByJobIdAndStatus(UUID jobId, Application.ApplicationStatus status);

    // Find applications with job details for admin view
    @Query("SELECT a FROM Application a JOIN FETCH a.job WHERE a.job.id = :jobId")
    List<Application> findByJobIdWithJobDetails(@Param("jobId") UUID jobId);

    // Search applications by candidate name or email
    @Query("SELECT a FROM Application a WHERE " +
           "LOWER(a.candidateName) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(a.candidateEmail) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    Page<Application> searchApplications(@Param("keyword") String keyword, Pageable pageable);

    // Check if candidate has already applied for a job (by candidateId)
    boolean existsByJobIdAndCandidateId(UUID jobId, UUID candidateId);

    // Check if candidate has already applied for a job (by email)
    boolean existsByJobIdAndCandidateEmail(UUID jobId, String candidateEmail);

    // Find application by job and candidateId
    Optional<Application> findByJobIdAndCandidateId(UUID jobId, UUID candidateId);

    // Find application by job and email
    Optional<Application> findByJobIdAndCandidateEmail(UUID jobId, String candidateEmail);

    // Find applications by date range
    @Query("SELECT a FROM Application a WHERE a.appliedDate >= :startDate AND a.appliedDate <= :endDate")
    Page<Application> findByAppliedDateBetween(@Param("startDate") java.time.LocalDateTime startDate, 
                                               @Param("endDate") java.time.LocalDateTime endDate, 
                                               Pageable pageable);

    // Find applications by employer (through jobs)
    @Query("SELECT DISTINCT a FROM Application a JOIN FETCH a.job j LEFT JOIN FETCH j.employer e WHERE e.user.id = :employerUserId")
    List<Application> findByEmployerUserIdWithDetails(@Param("employerUserId") UUID employerUserId);

    // Find applications by employer with date range
    @Query("SELECT a FROM Application a JOIN a.job j JOIN j.employer e WHERE e.user.id = :employerUserId " +
           "AND a.appliedDate >= :startDate AND a.appliedDate <= :endDate")
    Page<Application> findByEmployerUserIdAndDateRange(@Param("employerUserId") UUID employerUserId,
                                                         @Param("startDate") java.time.LocalDateTime startDate,
                                                         @Param("endDate") java.time.LocalDateTime endDate,
                                                         Pageable pageable);
}
