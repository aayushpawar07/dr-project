package com.medexjob.service;

import com.medexjob.entity.Employer;
import com.medexjob.entity.Job;
import com.medexjob.entity.Recruitment;
import com.medexjob.entity.VacancyRecord;
import com.medexjob.repository.JobRepository;
import com.medexjob.repository.RecruitmentRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Inserts one complete single government job, one complete single private job,
 * and one multi-department recruitment. Safe to run more than once.
 */
@Service
public class DemoJobShowcaseService {
    public static final String MULTI_FINGERPRINT = "demo-showcase-esic-sr-2026";
    public static final String SINGLE_GOVT_SLUG = "medical-officer-emergency-medicine-aiims-2026";
    public static final String SINGLE_PRIVATE_SLUG = "consultant-cardiologist-apollo-chennai-2026";
    public static final String MULTI_SLUG = "esic-faridabad-senior-resident-2026-showcase";

    private static final Logger logger = LoggerFactory.getLogger(DemoJobShowcaseService.class);
    private static final String NOTIFICATION_PDF = "https://dopt.gov.in/sites/default/files/FAQ_on_Reservation.pdf";

    private final JobRepository jobRepository;
    private final RecruitmentRepository recruitmentRepository;
    private final RecruitmentManagementService recruitmentManagementService;
    private final VacancyJobPublisher vacancyJobPublisher;

    public DemoJobShowcaseService(
            JobRepository jobRepository,
            RecruitmentRepository recruitmentRepository,
            RecruitmentManagementService recruitmentManagementService,
            VacancyJobPublisher vacancyJobPublisher
    ) {
        this.jobRepository = jobRepository;
        this.recruitmentRepository = recruitmentRepository;
        this.recruitmentManagementService = recruitmentManagementService;
        this.vacancyJobPublisher = vacancyJobPublisher;
    }

    @Transactional
    public Map<String, Object> publishShowcase() {
        List<Map<String, Object>> singles = new ArrayList<>();
        singles.add(publishSingleJob(governmentMedicalOfficer()));
        singles.add(publishSingleJob(privateCardiologist()));

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("singleJobs", singles);
        result.put("multiJob", publishMultiJobRecruitment());
        return result;
    }

    private Map<String, Object> publishSingleJob(SingleJobSpec spec) {
        Job existing = jobRepository.findBySlug(spec.slug()).orElse(null);
        if (existing != null && !existing.isDeleted()) {
            existing.setDescription(spec.description());
            jobRepository.save(existing);
            return jobSummary(existing, "updated");
        }

        Employer employer = vacancyJobPublisher.resolveOrCreateEmployer(spec.organisation());
        Job job = new Job();
        job.setEmployer(employer);
        job.setTitle(spec.title());
        job.setDescription(spec.description());
        job.setSector(spec.sector());
        job.setCategory(spec.category());
        job.setLocation(spec.location());
        job.setQualification(spec.qualification());
        job.setExperience(spec.experience());
        job.setExperienceLevel(spec.experienceLevel());
        job.setSpeciality(spec.speciality());
        job.setDepartment(spec.department());
        job.setJobType(spec.jobType());
        job.setDutyType(spec.dutyType());
        job.setNumberOfPosts(spec.posts());
        job.setSalaryRange(spec.salary());
        job.setRequirements(spec.requirements());
        job.setBenefits(spec.benefits());
        job.setLastDate(spec.lastDate());
        job.setContactEmail(spec.contactEmail());
        job.setContactPhone(spec.contactPhone());
        job.setPdfUrl(spec.pdfUrl());
        job.setApplyLink(spec.applyLink());
        job.setOfficialWebsite(spec.officialWebsite());
        job.setStatus(Job.JobStatus.ACTIVE);
        job.setIsFeatured(spec.featured());
        job.setViews(0);
        job.setApplicationsCount(0);
        job.setApprovedAt(LocalDateTime.now());
        job.setSlug(spec.slug());

        Job saved = jobRepository.save(job);
        logger.info("Seeded single job {} ({})", saved.getTitle(), saved.getId());
        return jobSummary(saved, "created");
    }

    private Map<String, Object> publishMultiJobRecruitment() {
        var existing = recruitmentRepository.findFirstByPdfFingerprintOrderByCreatedAtDesc(MULTI_FINGERPRINT);
        if (existing.isPresent()) {
            Recruitment current = recruitmentManagementService.get(existing.get().getId());
            current.setJobDescription(esicStructuredDescription());
            recruitmentRepository.save(current);
            if (current.getStatus() != Recruitment.RecruitmentStatus.PUBLISHED) {
                approveAndPublish(current.getId());
                current = recruitmentManagementService.get(current.getId());
            }
            return recruitmentSummary(current, "updated");
        }

        Recruitment recruitment = new Recruitment();
        recruitment.setOrganisationName("ESIC Medical College & Hospital, Faridabad");
        recruitment.setTitle("Senior Resident Recruitment 2026");
        recruitment.setAdvertisementNumber("ESIC/FBD/SR/09/2026");
        recruitment.setRecruitmentYear(2026);
        recruitment.setSector(Job.JobSector.GOVERNMENT);
        recruitment.setLocation("Faridabad, Haryana");
        recruitment.setApplicationStartDate(LocalDate.of(2026, 9, 10));
        recruitment.setApplicationLastDate(LocalDate.of(2026, 10, 15));
        recruitment.setApplicationFee("UR/OBC/EWS: Rs 500. SC/ST/PwBD/Female: Nil.");
        recruitment.setSelectionProcess("Document verification and walk-in interview. Merit follows the reservation roster.");
        recruitment.setOfficialNotificationUrl(NOTIFICATION_PDF);
        recruitment.setOfficialApplicationUrl("https://www.esic.gov.in/recruitments");
        recruitment.setOfficialWebsite("https://www.esic.gov.in");
        recruitment.setImportantInstructions(
                "Bring original registration, MBBS/MD/DNB mark sheets, caste/PwBD certificate if claimed, and one self-attested set. No TA/DA. Tenure follows ESIC Senior Resident rules. Keep NMC or State Medical Council registration valid for the full tenure."
        );
        recruitment.setJobDescription(esicStructuredDescription());
        recruitment.setSourcePdfName("esic-faridabad-sr-2026-showcase.pdf");
        recruitment.setPdfFingerprint(MULTI_FINGERPRINT);
        recruitment.setSlug(MULTI_SLUG);
        recruitment.setExtractionMethod("manual-showcase");
        recruitment.setStatus(Recruitment.RecruitmentStatus.REVIEW);
        recruitment.setRevisionNumber(1);
        recruitment.setTotalVacancies(22);

        Recruitment saved = recruitmentRepository.save(recruitment);

        addVacancy(saved.getId(), "Senior Resident", "General Medicine", "General Medicine", 8,
                "MD or DNB in General Medicine with valid NMC or State Medical Council registration",
                "Fresh MD/DNB eligible. Prior SR tenure preferred.",
                "45 years as on last date",
                "Rs 1,23,100/month + NPA",
                "Level-11",
                "Rs 67700-208700",
                "Must cover emergency and ICU duties on roster.");
        addVacancy(saved.getId(), "Senior Resident", "Paediatrics", "Paediatrics", 4,
                "MD or DNB in Paediatrics with valid medical registration",
                "0-3 years after PG. NICU exposure preferred.",
                "45 years as on last date",
                "Rs 1,23,100/month + NPA",
                "Level-11",
                "Rs 67700-208700",
                "Includes neonatal and paediatric emergency cover.");
        addVacancy(saved.getId(), "Senior Resident", "Orthopaedics", "Orthopaedics", 3,
                "MS or DNB in Orthopaedics with valid medical registration",
                "0-3 years after PG. Trauma OT experience preferred.",
                "45 years as on last date",
                "Rs 1,23,100/month + NPA",
                "Level-11",
                "Rs 67700-208700",
                "Trauma and emergency OT duty is compulsory.");
        addVacancy(saved.getId(), "Senior Resident", "Anaesthesiology", "Anaesthesiology", 5,
                "MD or DNB in Anaesthesiology with valid medical registration",
                "0-3 years after PG. ICU or OT experience preferred.",
                "45 years as on last date",
                "Rs 1,23,100/month + NPA",
                "Level-11",
                "Rs 67700-208700",
                "Covers OT, ICU, labour analgesia, and emergency calls.");
        addVacancy(saved.getId(), "Senior Resident", "Radiodiagnosis", "Radiodiagnosis", 2,
                "MD or DNB in Radiodiagnosis with valid medical registration",
                "0-3 years after PG. CT/MRI reporting preferred.",
                "45 years as on last date",
                "Rs 1,23,100/month + NPA",
                "Level-11",
                "Rs 67700-208700",
                "Includes emergency reporting and contrast procedures.");

        approveAndPublish(saved.getId());
        Recruitment published = recruitmentManagementService.get(saved.getId());
        logger.info("Seeded multi-job recruitment {} with {} vacancies", published.getId(), published.getVacancies().size());
        return recruitmentSummary(published, "created");
    }

    private void addVacancy(
            UUID recruitmentId,
            String postName,
            String department,
            String speciality,
            int posts,
            String qualification,
            String experience,
            String ageLimit,
            String salary,
            String payLevel,
            String payScale,
            String otherEligibility
    ) {
        Map<String, Object> values = new LinkedHashMap<>();
        values.put("postName", postName);
        values.put("department", department);
        values.put("speciality", speciality);
        values.put("numberOfVacancies", posts);
        values.put("category", "UR/OBC/SC/ST/EWS as per roster");
        values.put("qualification", qualification);
        values.put("experience", experience);
        values.put("ageLimit", ageLimit);
        values.put("salary", salary);
        values.put("payLevel", payLevel);
        values.put("payScale", payScale);
        values.put("jobType", "Tenure / Contract");
        values.put("location", "Faridabad, Haryana");
        values.put("otherEligibilityRequirements", otherEligibility);
        recruitmentManagementService.addVacancy(recruitmentId, values);
    }

    private void approveAndPublish(UUID recruitmentId) {
        Recruitment recruitment = recruitmentManagementService.get(recruitmentId);
        List<UUID> vacancyIds = recruitment.getVacancies().stream()
                .filter(v -> v.getStatus() != VacancyRecord.VacancyStatus.PUBLISHED)
                .map(VacancyRecord::getId)
                .toList();
        if (!vacancyIds.isEmpty()) {
            recruitmentManagementService.bulkStatus(recruitmentId, vacancyIds, VacancyRecord.VacancyStatus.APPROVED);
        }
        recruitmentManagementService.verify(recruitmentId, "showcase-seed");
        RecruitmentManagementService.PublishResult published = recruitmentManagementService.publishApproved(recruitmentId, null);
        if (published.failedCount() > 0) {
            throw new IllegalStateException("Multi-job publish failed: " + published.failures());
        }
    }

    private SingleJobSpec governmentMedicalOfficer() {
        return new SingleJobSpec(
                SINGLE_GOVT_SLUG,
                "Medical Officer - Emergency Medicine",
                "All India Institute of Medical Sciences, New Delhi",
                Job.JobSector.GOVERNMENT,
                Job.JobCategory.MEDICAL_OFFICER,
                "New Delhi",
                "MBBS with valid NMC or Delhi Medical Council registration",
                "2-5 years emergency duty",
                Job.ExperienceLevel.MID,
                "Emergency Medicine",
                "Emergency Medicine",
                "Full Time",
                Job.DutyType.FULL_TIME,
                12,
                "Rs 67,700-2,08,700 (Level-11)",
                governmentMedicalOfficerDescription(),
                "Valid medical registration, ACLS/BLS, fit for night emergency roster.",
                "Central pay, NPA as applicable, CCS leave, accommodation waitlist.",
                LocalDate.of(2026, 10, 20),
                "recruitment@aiims.edu",
                "01126588500",
                NOTIFICATION_PDF,
                "https://www.aiims.edu",
                "https://www.aiims.edu",
                true
        );
    }

    private SingleJobSpec privateCardiologist() {
        return new SingleJobSpec(
                SINGLE_PRIVATE_SLUG,
                "Consultant Cardiologist - Interventional Cardiology",
                "Apollo Hospitals, Chennai",
                Job.JobSector.PRIVATE,
                Job.JobCategory.SPECIALIST,
                "Chennai, Tamil Nadu",
                "DM or DNB Cardiology with valid TNMC registration",
                "5-8 years post-DM",
                Job.ExperienceLevel.SENIOR,
                "Cardiology",
                "Cardiology",
                "Full Time",
                Job.DutyType.FULL_TIME,
                2,
                "Rs 3,50,000-4,50,000 / month",
                privateCardiologistDescription(),
                "Independent coronary intervention competence and STEMI on-call cover.",
                "CTC, health insurance, procedure incentive, CME support.",
                LocalDate.of(2026, 11, 5),
                "careers.chennai@apollohospitals.com",
                "04428290200",
                NOTIFICATION_PDF,
                "https://www.apollohospitals.com/careers",
                "https://www.apollohospitals.com",
                true
        );
    }

    private String governmentMedicalOfficerDescription() {
        return """
                JOB DETAILS

                Post: Medical Officer - Emergency Medicine
                Organisation: All India Institute of Medical Sciences, New Delhi
                Department: Emergency Medicine
                Speciality: Emergency Medicine
                Location: New Delhi
                Number of Posts: 12
                Job Type: Full Time
                Pay/Salary: Level-11, Rs 67,700-2,08,700 plus NPA

                ELIGIBILITY

                Qualification: MBBS with valid NMC or Delhi Medical Council registration. MD Emergency Medicine preferred.
                Experience: 2-5 years of emergency, casualty, or critical-care duty after internship.
                Age Limit: 40 years as on the last date. Age relaxation as per Government of India rules.

                RESPONSIBILITIES

                - Cover emergency, casualty, and trauma resuscitation on roster
                - Attend night duty and disaster-response calls
                - Maintain clinical notes and handover

                APPLICATION PROCESS

                Mode of Application: Online
                Application Start Date: 2026-09-10
                Last Date to Apply: 2026-10-20
                Application Fee: UR/OBC/EWS Rs 1,000. SC/ST/PwBD/Women: Nil.

                SELECTION PROCESS

                - Online application
                - Document verification
                - Interview

                DOCUMENTS REQUIRED

                - MBBS/MD certificates
                - Valid medical registration
                - Category documents if claimed
                - Photo ID

                IMPORTANT NOTES

                - Apply only through the official AIIMS recruitment portal
                - Incomplete applications will be rejected
                - Official Website and Notification PDF are published separately on this listing

                CONTACT INFORMATION

                Email: recruitment@aiims.edu
                Phone: 01126588500""";
    }

    private String privateCardiologistDescription() {
        return """
                JOB DETAILS

                Post: Consultant Cardiologist - Interventional Cardiology
                Organisation: Apollo Hospitals, Chennai
                Department: Cardiology
                Speciality: Interventional Cardiology
                Location: Chennai, Tamil Nadu
                Number of Posts: 2
                Job Type: Full Time
                Pay/Salary: Rs 3,50,000-4,50,000 per month plus procedure incentive

                ELIGIBILITY

                Qualification: DM or DNB Cardiology with valid Tamil Nadu Medical Council registration.
                Experience: 5-8 years after super-speciality, with independent coronary intervention numbers.
                Age Limit: Preferably below 50 years.

                RESPONSIBILITIES

                - Manage STEMI calls and cardiac ICU
                - Perform independent coronary interventions
                - Attend multidisciplinary cardiac meetings

                APPLICATION PROCESS

                Mode of Application: Online through hospital careers
                Application Start Date: 2026-09-12
                Last Date to Apply: 2026-11-05
                Application Fee: No fee

                SELECTION PROCESS

                - CV shortlisting
                - Credentialing
                - Panel interview with Cardiac Sciences

                DOCUMENTS REQUIRED

                - Procedure logbook
                - Medical registration
                - Last 3 years experience letters

                IMPORTANT NOTES

                - Night STEMI cover is rostered
                - Official Website and careers link are published separately on this listing

                CONTACT INFORMATION

                Email: careers.chennai@apollohospitals.com
                Phone: 04428290200""";
    }

    private String esicStructuredDescription() {
        return """
                JOB DETAILS

                Post: Senior Resident
                Organisation: ESIC Medical College & Hospital, Faridabad
                Location: Faridabad, Haryana
                Number of Posts: 22
                Job Type: Tenure / Contract
                Advertisement: ESIC/FBD/SR/09/2026
                Pay/Salary: Level-11, Rs 1,23,100 per month plus NPA

                ELIGIBILITY

                Qualification: MD/MS/DNB in the concerned speciality with valid NMC or State Medical Council registration.
                Experience: Fresh postgraduates are eligible. Prior Senior Resident tenure is desirable.
                Age Limit: 45 years as on the last date, with government relaxation for reserved categories.

                RESPONSIBILITIES

                - Clinical work in the allotted department
                - Emergency and on-call cover as per roster

                APPLICATION PROCESS

                Mode of Application: Walk-in
                Application Start Date: 2026-09-10
                Last Date to Apply: 2026-10-15
                Application Fee: UR/OBC/EWS Rs 500. SC/ST/PwBD/Female: Nil.

                SELECTION PROCESS

                - Document verification
                - Walk-in interview

                DOCUMENTS REQUIRED

                - Original registration and MBBS/MD/DNB mark sheets
                - Caste/PwBD certificate if claimed
                - One self-attested document set

                IMPORTANT NOTES

                - No TA/DA is payable
                - Tenure follows ESIC Senior Resident rules
                - Official Website and Notification PDF are published separately on this listing

                CONTACT INFORMATION

                Email: Not specified in this listing""";
    }

    private Map<String, Object> jobSummary(Job job, String status) {
        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("status", status);
        summary.put("id", job.getId().toString());
        summary.put("title", job.getTitle());
        summary.put("slug", job.getSlug());
        return summary;
    }

    private Map<String, Object> recruitmentSummary(Recruitment recruitment, String status) {
        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("status", status);
        summary.put("id", recruitment.getId().toString());
        summary.put("title", recruitment.getTitle());
        summary.put("slug", recruitment.getSlug());
        summary.put("vacancyCount", recruitment.getVacancies() == null ? 0 : recruitment.getVacancies().size());
        return summary;
    }

    private record SingleJobSpec(
            String slug,
            String title,
            String organisation,
            Job.JobSector sector,
            Job.JobCategory category,
            String location,
            String qualification,
            String experience,
            Job.ExperienceLevel experienceLevel,
            String speciality,
            String department,
            String jobType,
            Job.DutyType dutyType,
            int posts,
            String salary,
            String description,
            String requirements,
            String benefits,
            LocalDate lastDate,
            String contactEmail,
            String contactPhone,
            String pdfUrl,
            String applyLink,
            String officialWebsite,
            boolean featured
    ) {}
}
