package com.medexjob.repository;

import com.medexjob.entity.CandidateProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface CandidateProfileRepository extends JpaRepository<CandidateProfile, UUID> {
    Optional<CandidateProfile> findByCandidateId(UUID candidateId);

    @org.springframework.data.jpa.repository.Query("SELECT cp FROM CandidateProfile cp WHERE cp.candidate.id IN :candidateIds")
    java.util.List<CandidateProfile> findByCandidateIdIn(@org.springframework.data.repository.query.Param("candidateIds") java.util.Collection<UUID> candidateIds);
}
