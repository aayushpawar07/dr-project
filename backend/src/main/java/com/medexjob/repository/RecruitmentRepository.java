package com.medexjob.repository;

import com.medexjob.entity.Recruitment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface RecruitmentRepository extends JpaRepository<Recruitment, UUID> {
    Optional<Recruitment> findFirstByPdfFingerprintOrderByCreatedAtDesc(String pdfFingerprint);
    Optional<Recruitment> findFirstByAdvertisementNumberIgnoreCaseAndRecruitmentYearOrderByCreatedAtDesc(String advertisementNumber, Integer recruitmentYear);
    Optional<Recruitment> findFirstByOrganisationNameIgnoreCaseAndTitleIgnoreCaseAndRecruitmentYearOrderByCreatedAtDesc(
            String organisationName, String title, Integer recruitmentYear);
    Optional<Recruitment> findFirstByOrganisationNameIgnoreCaseAndTitleIgnoreCaseAndApplicationLastDateOrderByCreatedAtDesc(
            String organisationName, String title, LocalDate applicationLastDate);
    Optional<Recruitment> findBySlug(String slug);

    @Query("SELECT DISTINCT r FROM Recruitment r LEFT JOIN FETCH r.vacancies WHERE r.id = :id")
    Optional<Recruitment> findByIdWithVacancies(@Param("id") UUID id);

    @Query("SELECT DISTINCT r FROM Recruitment r LEFT JOIN FETCH r.vacancies WHERE r.slug = :slug")
    Optional<Recruitment> findBySlugWithVacancies(@Param("slug") String slug);
    List<Recruitment> findByStatusOrderByCreatedAtDesc(Recruitment.RecruitmentStatus status);
    List<Recruitment> findAllByOrderByCreatedAtDesc();
}
