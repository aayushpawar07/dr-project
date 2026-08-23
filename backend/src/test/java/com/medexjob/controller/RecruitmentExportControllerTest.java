package com.medexjob.controller;

import com.medexjob.entity.Job;
import com.medexjob.entity.Recruitment;
import com.medexjob.entity.VacancyRecord;
import com.medexjob.repository.RecruitmentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@ActiveProfiles("test")
@AutoConfigureMockMvc
@Transactional
class RecruitmentExportControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private RecruitmentRepository recruitmentRepository;

    private Recruitment recruitment;

    @BeforeEach
    void seed() {
        Recruitment r = new Recruitment();
        r.setOrganisationName("AIIMS Jodhpur");
        r.setTitle("Faculty Recruitment");
        r.setAdvertisementNumber("ADV-1");
        r.setRecruitmentYear(2026);
        r.setSector(Job.JobSector.GOVERNMENT);
        r.setLocation("Jodhpur, Rajasthan");
        r.setTotalVacancies(1);
        r.setPdfFingerprint("b".repeat(64));
        r.setSlug("export-test-recruitment");
        r.setExtractionMethod("HEURISTIC_PDF");
        r.setStatus(Recruitment.RecruitmentStatus.REVIEW);
        r.setOfficialSourceVerified(false);
        VacancyRecord v = new VacancyRecord();
        v.setPostName("=CMD|'/C calc'!A0");
        v.setDepartment("Cardiology");
        v.setSpeciality("Cardiology");
        v.setNumberOfVacancies(1);
        v.setCategory("UR");
        v.setQualification("+HYPERLINK(http://evil)");
        v.setLocation("Jodhpur, Rajasthan");
        v.setStatus(VacancyRecord.VacancyStatus.NEEDS_REVIEW);
        v.setConfidenceScore(0.9);
        v.setSlug("export-row");
        r.addVacancy(v);
        recruitment = recruitmentRepository.save(r);
    }

    @Test
    @WithMockUser(username = "admin@test.com", roles = "ADMIN")
    void exportCsvJsonAndXlsxAndNeutralizesFormulas() throws Exception {
        byte[] csv = mockMvc.perform(get("/api/admin/recruitments/{id}/export", recruitment.getId()).param("format", "csv"))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", org.hamcrest.Matchers.containsString("text/csv")))
                .andReturn().getResponse().getContentAsByteArray();
        String csvText = new String(csv);
        assertThat(csvText).contains("'=CMD");
        assertThat(csvText).doesNotContain("\n=CMD");

        mockMvc.perform(get("/api/admin/recruitments/{id}/export", recruitment.getId()).param("format", "json"))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", org.hamcrest.Matchers.containsString("application/json")));

        byte[] xlsx = mockMvc.perform(get("/api/admin/recruitments/{id}/export", recruitment.getId()).param("format", "xlsx"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsByteArray();
        assertThat(xlsx.length).isGreaterThan(100);
    }
}
