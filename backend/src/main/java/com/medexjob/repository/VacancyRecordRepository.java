package com.medexjob.repository;

import com.medexjob.entity.VacancyRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface VacancyRecordRepository extends JpaRepository<VacancyRecord, UUID> {
    List<VacancyRecord> findByRecruitmentIdOrderByCreatedAtAsc(UUID recruitmentId);
    long countByRecruitmentIdAndStatus(UUID recruitmentId, VacancyRecord.VacancyStatus status);
}
