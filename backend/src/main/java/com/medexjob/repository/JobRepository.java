package com.medexjob.repository;

import com.medexjob.entity.Job;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface JobRepository extends JpaRepository<Job, UUID>, JpaSpecificationExecutor<Job> {
    
    // Find jobs by status
    Page<Job> findByStatus(Job.JobStatus status, Pageable pageable);
    
    // Find jobs by sector
    Page<Job> findBySector(Job.JobSector sector, Pageable pageable);
    
    // Find jobs by category
    Page<Job> findByCategory(Job.JobCategory category, Pageable pageable);
    
    // Find jobs by location
    Page<Job> findByLocationContainingIgnoreCase(String location, Pageable pageable);
    
    // Find featured jobs
    Page<Job> findByIsFeaturedTrueAndStatus(Job.JobStatus status, Pageable pageable);
    
    // Find jobs by employer
    List<Job> findByEmployerId(UUID employerId);

    Optional<Job> findFirstBySourceVacancyId(UUID sourceVacancyId);

    Optional<Job> findBySlug(String slug);

    @Query("SELECT j FROM Job j LEFT JOIN FETCH j.employer WHERE j.id = :id")
    Optional<Job> findByIdWithEmployer(@Param("id") UUID id);

    @Query("SELECT j FROM Job j LEFT JOIN FETCH j.employer WHERE j.slug = :slug")
    Optional<Job> findBySlugWithEmployer(@Param("slug") String slug);
    
    // Find active jobs
    Page<Job> findByStatusAndLastDateAfter(Job.JobStatus status, LocalDate date, Pageable pageable);
    
    // Enhanced search jobs - searches across multiple fields with partial matching
    // Searches in: title, description, qualification, speciality, requirements, benefits, location, experience, and employer company name
    // Case-insensitive LIKE search for partial matches (e.g., "doctor" matches "Senior Doctor")
    @Query("SELECT DISTINCT j FROM Job j LEFT JOIN j.employer e WHERE " +
           "(:status IS NULL OR j.status = :status) AND " +
           "(" +
           "LOWER(j.title) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(j.description) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(j.qualification) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(COALESCE(j.speciality, '')) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(COALESCE(j.requirements, '')) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(COALESCE(j.benefits, '')) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(COALESCE(j.location, '')) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(COALESCE(j.experience, '')) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(COALESCE(e.companyName, '')) LIKE LOWER(CONCAT('%', :keyword, '%'))" +
           ") " +
           "ORDER BY " +
           "CASE WHEN LOWER(j.title) LIKE LOWER(CONCAT('%', :keyword, '%')) THEN 1 ELSE 2 END, " +
           "CASE WHEN LOWER(COALESCE(e.companyName, '')) LIKE LOWER(CONCAT('%', :keyword, '%')) THEN 1 ELSE 2 END, " +
           "CASE WHEN LOWER(COALESCE(j.speciality, '')) LIKE LOWER(CONCAT('%', :keyword, '%')) THEN 1 ELSE 2 END, " +
           "j.createdAt DESC")
    Page<Job> searchJobs(@Param("keyword") String keyword, @Param("status") Job.JobStatus status, Pageable pageable);
    
    // Enhanced search jobs with location filter - searches across multiple fields with partial matching
    // Location uses partial matching (contains) for flexibility
    @Query("SELECT DISTINCT j FROM Job j LEFT JOIN j.employer e WHERE " +
           "(:status IS NULL OR j.status = :status) AND " +
           "(LOWER(COALESCE(j.location, '')) LIKE LOWER(CONCAT('%', :location, '%'))) AND " +
           "(" +
           "LOWER(j.title) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(j.description) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(j.qualification) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(COALESCE(j.speciality, '')) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(COALESCE(j.requirements, '')) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(COALESCE(j.benefits, '')) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(COALESCE(j.location, '')) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(COALESCE(j.experience, '')) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(COALESCE(e.companyName, '')) LIKE LOWER(CONCAT('%', :keyword, '%'))" +
           ") " +
           "ORDER BY " +
           "CASE WHEN LOWER(j.title) LIKE LOWER(CONCAT('%', :keyword, '%')) THEN 1 ELSE 2 END, " +
           "CASE WHEN LOWER(COALESCE(e.companyName, '')) LIKE LOWER(CONCAT('%', :keyword, '%')) THEN 1 ELSE 2 END, " +
           "CASE WHEN LOWER(COALESCE(j.speciality, '')) LIKE LOWER(CONCAT('%', :keyword, '%')) THEN 1 ELSE 2 END, " +
           "j.createdAt DESC")
    Page<Job> searchJobsWithLocation(@Param("keyword") String keyword, @Param("location") String location, @Param("status") Job.JobStatus status, Pageable pageable);
    
    // Find jobs by multiple criteria
    @Query("SELECT j FROM Job j WHERE " +
           "(:sector IS NULL OR j.sector = :sector) AND " +
           "(:category IS NULL OR j.category = :category) AND " +
           "(:location IS NULL OR LOWER(j.location) LIKE LOWER(CONCAT('%', :location, '%'))) AND " +
           "(:experienceLevel IS NULL OR j.experienceLevel = :experienceLevel) AND " +
           "(:speciality IS NULL OR LOWER(j.speciality) LIKE LOWER(CONCAT('%', :speciality, '%'))) AND " +
           "(:dutyType IS NULL OR j.dutyType = :dutyType) AND " +
           "(:status IS NULL OR j.status = :status)")
    Page<Job> findJobsByCriteria(@Param("sector") Job.JobSector sector,
                                 @Param("category") Job.JobCategory category,
                                 @Param("location") String location,
                                 @Param("experienceLevel") Job.ExperienceLevel experienceLevel,
                                 @Param("speciality") String speciality,
                                 @Param("dutyType") Job.DutyType dutyType,
                                 @Param("status") Job.JobStatus status,
                                 Pageable pageable);
    
    // Count jobs by status
    long countByStatus(Job.JobStatus status);
    
    // Count jobs by employer
    long countByEmployerId(UUID employerId);
    
    // Find jobs expiring soon
    @Query("SELECT j FROM Job j WHERE j.lastDate BETWEEN :startDate AND :endDate AND j.status = :status")
    List<Job> findJobsExpiringSoon(@Param("startDate") LocalDate startDate,
                                   @Param("endDate") LocalDate endDate,
                                   @Param("status") Job.JobStatus status);
    
    // Find top viewed jobs
    @Query("SELECT j FROM Job j WHERE j.status = :status ORDER BY j.views DESC")
    Page<Job> findTopViewedJobs(@Param("status") Job.JobStatus status, Pageable pageable);
    
    // Find jobs with most applications
    @Query("SELECT j FROM Job j WHERE j.status = :status ORDER BY j.applicationsCount DESC")
    Page<Job> findJobsWithMostApplications(@Param("status") Job.JobStatus status, Pageable pageable);

    // Candidate-facing filter metadata. Keep it aligned with public listings so
    // draft/deleted records and the opposite sector never leak into filter options.
    @Query("SELECT DISTINCT j.category FROM Job j " +
            "WHERE j.status = :status AND j.deletedAt IS NULL AND j.category IS NOT NULL " +
            "AND (:sector IS NULL OR j.sector = :sector)")
    List<Job.JobCategory> findDistinctCategoriesForPublic(
            @Param("status") Job.JobStatus status,
            @Param("sector") Job.JobSector sector);

    @Query("SELECT DISTINCT j.location FROM Job j " +
            "WHERE j.status = :status AND j.deletedAt IS NULL AND j.location IS NOT NULL AND j.location <> '' " +
            "AND (:sector IS NULL OR j.sector = :sector)")
    List<String> findDistinctLocationsForPublic(
            @Param("status") Job.JobStatus status,
            @Param("sector") Job.JobSector sector);

    @Query("SELECT DISTINCT j.speciality FROM Job j " +
            "WHERE j.status = :status AND j.deletedAt IS NULL AND j.speciality IS NOT NULL AND j.speciality <> '' " +
            "AND (:sector IS NULL OR j.sector = :sector)")
    List<String> findDistinctSpecialitiesForPublic(
            @Param("status") Job.JobStatus status,
            @Param("sector") Job.JobSector sector);

    @Query("SELECT DISTINCT j.department FROM Job j " +
            "WHERE j.status = :status AND j.deletedAt IS NULL AND j.department IS NOT NULL AND j.department <> '' " +
            "AND (:sector IS NULL OR j.sector = :sector)")
    List<String> findDistinctDepartmentsForPublic(
            @Param("status") Job.JobStatus status,
            @Param("sector") Job.JobSector sector);

    @Query("SELECT DISTINCT j.jobType FROM Job j " +
            "WHERE j.status = :status AND j.deletedAt IS NULL AND j.jobType IS NOT NULL AND j.jobType <> '' " +
            "AND (:sector IS NULL OR j.sector = :sector)")
    List<String> findDistinctJobTypesForPublic(
            @Param("status") Job.JobStatus status,
            @Param("sector") Job.JobSector sector);

    @Query("SELECT DISTINCT j.qualification FROM Job j " +
            "WHERE j.status = :status AND j.deletedAt IS NULL AND j.qualification IS NOT NULL AND j.qualification <> '' " +
            "AND (:sector IS NULL OR j.sector = :sector)")
    List<String> findDistinctQualificationsForPublic(
            @Param("status") Job.JobStatus status,
            @Param("sector") Job.JobSector sector);
    
    // Get all distinct job titles from active jobs (for dropdown)
    @Query("SELECT DISTINCT j.title FROM Job j WHERE j.status = :status AND j.title IS NOT NULL AND j.title <> '' ORDER BY j.title ASC")
    List<String> findDistinctTitlesByStatus(@Param("status") Job.JobStatus status);
    
    // Convenience method for active jobs
    default List<String> findAllDistinctTitles() {
        return findDistinctTitlesByStatus(Job.JobStatus.ACTIVE);
    }
    
    // Get all distinct company names from active jobs (for dropdown)
    @Query("SELECT DISTINCT e.companyName FROM Job j JOIN j.employer e WHERE j.status = :status AND e.companyName IS NOT NULL AND e.companyName <> '' ORDER BY e.companyName ASC")
    List<String> findDistinctCompanyNamesByStatus(@Param("status") Job.JobStatus status);
    
    // Convenience method for active jobs
    default List<String> findAllDistinctCompanyNames() {
        return findDistinctCompanyNamesByStatus(Job.JobStatus.ACTIVE);
    }
}
