package com.medexjob.repository;

import com.medexjob.entity.VisitorLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Optional;

@Repository
public interface VisitorLogRepository extends JpaRepository<VisitorLog, Long> {

    /** Find an existing log for a given token on a specific date (for deduplication) */
    Optional<VisitorLog> findByVisitorTokenAndVisitDate(String visitorToken, LocalDate visitDate);

    /** Count of distinct visitor tokens overall (total unique visitors) */
    @Query("SELECT COUNT(DISTINCT v.visitorToken) FROM VisitorLog v")
    long countDistinctVisitors();

    /** Count of distinct visitor tokens on a specific date (today's unique visitors) */
    @Query("SELECT COUNT(DISTINCT v.visitorToken) FROM VisitorLog v WHERE v.visitDate = :date")
    long countDistinctVisitorsByDate(@Param("date") LocalDate date);
}
