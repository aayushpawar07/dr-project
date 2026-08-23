package com.medexjob.service;

import com.medexjob.entity.Job;
import com.medexjob.entity.Recruitment;
import com.medexjob.entity.VacancyRecord;
import com.medexjob.repository.JobRepository;
import com.medexjob.repository.RecruitmentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class RecruitmentWorkflowIntegrationTest {

    @Autowired
    private RecruitmentManagementService service;
    @Autowired
    private RecruitmentRepository recruitmentRepository;
    @Autowired
    private JobRepository jobRepository;
    @Autowired
    private JobSearchService jobSearchService;

    private Recruitment recruitment;

    @BeforeEach
    void seed() {
        recruitment = recruitmentRepository.save(buildRecruitment(40));
    }

    @Test
    void approveOneMultipleAndAllUpdatesPersistedStatuses() {
        List<UUID> ids = recruitment.getVacancies().stream().map(VacancyRecord::getId).toList();

        service.bulkStatus(recruitment.getId(), List.of(ids.get(0)), VacancyRecord.VacancyStatus.APPROVED);
        Recruitment afterOne = service.get(recruitment.getId());
        assertThat(count(afterOne, VacancyRecord.VacancyStatus.APPROVED)).isEqualTo(1);
        assertThat(count(afterOne, VacancyRecord.VacancyStatus.NEEDS_REVIEW)).isEqualTo(39);

        service.bulkStatus(recruitment.getId(), ids.subList(1, 5), VacancyRecord.VacancyStatus.APPROVED);
        Recruitment afterFive = service.get(recruitment.getId());
        assertThat(count(afterFive, VacancyRecord.VacancyStatus.APPROVED)).isEqualTo(5);
        assertThat(count(afterFive, VacancyRecord.VacancyStatus.NEEDS_REVIEW)).isEqualTo(35);

        service.bulkStatus(recruitment.getId(), ids, VacancyRecord.VacancyStatus.APPROVED);
        Recruitment afterAll = service.get(recruitment.getId());
        assertThat(count(afterAll, VacancyRecord.VacancyStatus.APPROVED)).isEqualTo(40);
        assertThat(count(afterAll, VacancyRecord.VacancyStatus.NEEDS_REVIEW)).isEqualTo(0);
        assertThat(count(afterAll, VacancyRecord.VacancyStatus.PUBLISHED)).isEqualTo(0);
    }

    @Test
    void rejectUpdatesSelectedRowsOnly() {
        List<UUID> ids = recruitment.getVacancies().stream().map(VacancyRecord::getId).toList();
        service.bulkStatus(recruitment.getId(), ids.subList(0, 3), VacancyRecord.VacancyStatus.REJECTED);
        Recruitment latest = service.get(recruitment.getId());
        assertThat(count(latest, VacancyRecord.VacancyStatus.REJECTED)).isEqualTo(3);
        assertThat(count(latest, VacancyRecord.VacancyStatus.NEEDS_REVIEW)).isEqualTo(37);
    }

    @Test
    void bulkEditUpdatesOnlySelectedRows() {
        List<UUID> ids = recruitment.getVacancies().stream().map(VacancyRecord::getId).toList();
        service.bulkUpdate(recruitment.getId(), ids.subList(0, 2), Map.of(
                "location", "Jaipur, Rajasthan",
                "qualification", "MD/MS/DNB",
                "salary", "Level 12",
                "jobType", "Direct Recruitment"
        ));
        Recruitment latest = service.get(recruitment.getId());
        assertThat(latest.getVacancies().stream().filter(v -> "Jaipur, Rajasthan".equals(v.getLocation())).count()).isEqualTo(2);
        assertThat(latest.getVacancies().stream().filter(v -> "Jodhpur, Rajasthan".equals(v.getLocation())).count()).isEqualTo(38);
    }

    @Test
    void governmentPublishRequiresVerificationThenCreatesJobsIdempotently() {
        List<UUID> ids = recruitment.getVacancies().stream().map(VacancyRecord::getId).toList();
        service.bulkStatus(recruitment.getId(), ids, VacancyRecord.VacancyStatus.APPROVED);

        assertThatThrownBy(() -> service.publishApproved(recruitment.getId(), null))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("official-source verification");

        service.updateRecruitment(recruitment.getId(), Map.of(
                "officialNotificationUrl", "https://www.aiimsjodhpur.edu.in/notification.pdf",
                "officialApplicationUrl", "https://www.aiimsjodhpur.edu.in/apply",
                "officialWebsite", "https://www.aiimsjodhpur.edu.in"
        ));
        service.verify(recruitment.getId(), "qa-admin");

        RecruitmentManagementService.PublishResult first = service.publishApproved(recruitment.getId(), null);
        assertThat(first.publishedCount()).isEqualTo(40);
        assertThat(count(first.recruitment(), VacancyRecord.VacancyStatus.PUBLISHED)).isEqualTo(40);
        assertThat(count(first.recruitment(), VacancyRecord.VacancyStatus.APPROVED)).isEqualTo(0);
        assertThat(first.recruitment().getVacancies()).allMatch(v -> v.getPublishedJobId() != null);

        long jobCount = jobRepository.count();
        RecruitmentManagementService.PublishResult second = service.publishApproved(recruitment.getId(), null);
        assertThat(second.publishedCount()).isEqualTo(0);
        assertThat(jobRepository.count()).isEqualTo(jobCount);

        var government = jobSearchService.searchJobsAdvanced(
                "Assistant Professor Cardiology", null, Job.JobSector.GOVERNMENT, null, null, null, null,
                Job.JobStatus.ACTIVE, null, PageRequest.of(0, 50));
        assertThat(government.getTotalElements()).isGreaterThan(0);
        assertThat(government.getContent()).allMatch(job -> job.getSector() == Job.JobSector.GOVERNMENT);

        var privateOnly = jobSearchService.searchJobsAdvanced(
                null, null, Job.JobSector.PRIVATE, null, null, null, null,
                Job.JobStatus.ACTIVE, null, PageRequest.of(0, 50));
        assertThat(privateOnly.getContent()).allMatch(job -> job.getSector() == Job.JobSector.PRIVATE);

        var surgery = jobSearchService.searchJobsAdvanced(
                "General Surgery Government Jobs", null, Job.JobSector.GOVERNMENT, null, null, null, null,
                Job.JobStatus.ACTIVE, null, PageRequest.of(0, 50));
        assertThat(surgery.getTotalElements()).isGreaterThan(0);
    }

    @Test
    void checkboxSelectionDoesNotApproveUntilBulkStatusIsCalled() {
        assertThat(count(service.get(recruitment.getId()), VacancyRecord.VacancyStatus.APPROVED)).isEqualTo(0);
        assertThat(count(service.get(recruitment.getId()), VacancyRecord.VacancyStatus.NEEDS_REVIEW)).isEqualTo(40);
    }

    private Recruitment buildRecruitment(int rows) {
        Recruitment r = new Recruitment();
        r.setOrganisationName("AIIMS Jodhpur");
        r.setTitle("Faculty Recruitment 2026");
        r.setAdvertisementNumber("Admn/Faculty/01/2026");
        r.setRecruitmentYear(2026);
        r.setSector(Job.JobSector.GOVERNMENT);
        r.setLocation("Jodhpur, Rajasthan");
        r.setTotalVacancies(rows);
        r.setApplicationLastDate(LocalDate.now().plusDays(20));
        r.setPdfFingerprint("a".repeat(64));
        r.setSlug("faculty-recruitment-2026-test");
        r.setExtractionMethod("HEURISTIC_PDF");
        r.setStatus(Recruitment.RecruitmentStatus.REVIEW);
        r.setOfficialSourceVerified(false);
        r.setRevisionNumber(1);
        String[] specialities = {"Anaesthesiology", "Cardiology", "Emergency Medicine", "General Surgery"};
        for (int i = 0; i < rows; i++) {
            VacancyRecord v = new VacancyRecord();
            v.setPostName(i % 2 == 0 ? "Assistant Professor" : "Associate Professor");
            v.setDepartment(specialities[i % specialities.length]);
            v.setSpeciality(specialities[i % specialities.length]);
            v.setSubSpeciality(specialities[i % specialities.length]);
            v.setNumberOfVacancies(1);
            v.setCategory(List.of("UR", "OBC", "SC", "ST", "EWS").get(i % 5));
            v.setQualification("MD/MS/DNB");
            v.setLocation("Jodhpur, Rajasthan");
            v.setJobType("Direct Recruitment");
            v.setConfidenceScore(0.94);
            v.setStatus(VacancyRecord.VacancyStatus.NEEDS_REVIEW);
            v.setSlug("vacancy-" + i);
            r.addVacancy(v);
        }
        return r;
    }

    private long count(Recruitment r, VacancyRecord.VacancyStatus status) {
        return r.getVacancies().stream().filter(v -> v.getStatus() == status).count();
    }

    @SuppressWarnings("unused")
    private List<Integer> range(int n) {
        return IntStream.range(0, n).boxed().toList();
    }
}
