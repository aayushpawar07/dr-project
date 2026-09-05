package com.medexjob.service;

import com.medexjob.dto.recruitment.RecruitmentExtractionResult;
import com.medexjob.entity.Employer;
import com.medexjob.entity.Job;
import com.medexjob.entity.Recruitment;
import com.medexjob.entity.User;
import com.medexjob.entity.VacancyRecord;
import com.medexjob.repository.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.URI;
import java.net.URISyntaxException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class RecruitmentManagementService {
    private static final org.slf4j.Logger logger = org.slf4j.LoggerFactory.getLogger(RecruitmentManagementService.class);
    private final RecruitmentExtractionService extractionService;
    private final RecruitmentRepository recruitmentRepository;
    private final VacancyRecordRepository vacancyRepository;
    private final JobRepository jobRepository;
    private final EmployerRepository employerRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final VacancyJobPublisher vacancyJobPublisher;
    private final boolean privateVerificationRequired;

    public RecruitmentManagementService(
            RecruitmentExtractionService extractionService,
            RecruitmentRepository recruitmentRepository,
            VacancyRecordRepository vacancyRepository,
            JobRepository jobRepository,
            EmployerRepository employerRepository,
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            VacancyJobPublisher vacancyJobPublisher,
            @Value("${medex.verification.private-required:false}") boolean privateVerificationRequired
    ) {
        this.extractionService = extractionService;
        this.recruitmentRepository = recruitmentRepository;
        this.vacancyRepository = vacancyRepository;
        this.jobRepository = jobRepository;
        this.employerRepository = employerRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.vacancyJobPublisher = vacancyJobPublisher;
        this.privateVerificationRequired = privateVerificationRequired;
    }

    @Transactional
    public UploadResult extractAndCreate(MultipartFile file, boolean forceCreate) throws IOException {
        RecruitmentExtractionService.ExtractionPayload payload = extractionService.extract(file);
        Recruitment recruitment = mapRecruitment(payload.result(), payload.fingerprint(), payload.sourceFileName());

        // Detect both byte-for-byte re-uploads and revised/corrigendum PDFs that keep
        // the same advertisement identity. The latter usually has a different hash.
        Optional<Recruitment> duplicate = findPossibleDuplicate(recruitment, payload.fingerprint());

        if (duplicate.isPresent() && !forceCreate) {
            Recruitment existing = recruitmentRepository.findByIdWithVacancies(duplicate.get().getId())
                    .orElseThrow(() -> new NoSuchElementException("Duplicate recruitment could not be loaded"));
            return new UploadResult(existing, true, false);
        }

        if (duplicate.isPresent()) {
            Recruitment existing = duplicate.get();
            recruitment.setDuplicateOf(existing.getId());
            recruitment.setRevisionNumber(Optional.ofNullable(existing.getRevisionNumber()).orElse(1) + 1);
        } else {
            recruitment.setRevisionNumber(1);
        }
        Recruitment saved = recruitmentRepository.save(recruitment);
        return new UploadResult(saved, duplicate.isPresent(), true);
    }

    @Transactional(readOnly = true)
    public List<Recruitment> list() {
        return recruitmentRepository.findAllByOrderByCreatedAtDesc();
    }

    @Transactional(readOnly = true)
    public Recruitment get(UUID id) {
        return recruitmentRepository.findByIdWithVacancies(id)
                .orElseThrow(() -> new NoSuchElementException("Recruitment not found"));
    }

    @Transactional
    public Recruitment updateRecruitment(UUID id, Map<String, Object> updates) {
        Recruitment r = get(id);
        setIfPresent(updates, "organisationName", value -> r.setOrganisationName(nonBlank(value, r.getOrganisationName())));
        setIfPresent(updates, "title", value -> r.setTitle(nonBlank(value, r.getTitle())));
        setIfPresent(updates, "advertisementNumber", r::setAdvertisementNumber);
        setIfPresent(updates, "location", r::setLocation);
        setIfPresent(updates, "applicationFee", r::setApplicationFee);
        setIfPresent(updates, "selectionProcess", r::setSelectionProcess);
        setIfPresent(updates, "officialNotificationUrl", r::setOfficialNotificationUrl);
        setIfPresent(updates, "officialApplicationUrl", r::setOfficialApplicationUrl);
        setIfPresent(updates, "officialWebsite", r::setOfficialWebsite);
        setIfPresent(updates, "importantInstructions", r::setImportantInstructions);
        if (updates.containsKey("recruitmentYear")) r.setRecruitmentYear(asInteger(updates.get("recruitmentYear")));
        if (updates.containsKey("totalVacancies")) r.setTotalVacancies(asInteger(updates.get("totalVacancies")));
        if (updates.containsKey("applicationStartDate")) r.setApplicationStartDate(asDate(updates.get("applicationStartDate")));
        if (updates.containsKey("applicationLastDate")) r.setApplicationLastDate(asDate(updates.get("applicationLastDate")));
        if (updates.containsKey("sector")) r.setSector(parseSector(String.valueOf(updates.get("sector"))));
        return recruitmentRepository.save(r);
    }

    @Transactional
    public VacancyRecord updateVacancy(UUID recruitmentId, UUID vacancyId, Map<String, Object> updates) {
        VacancyRecord v = getVacancy(recruitmentId, vacancyId);
        applyVacancyUpdates(v, updates);
        return vacancyRepository.save(v);
    }

    @Transactional
    public VacancyRecord addVacancy(UUID recruitmentId, Map<String, Object> values) {
        Recruitment r = get(recruitmentId);
        VacancyRecord v = new VacancyRecord();
        v.setRecruitment(r);
        v.setPostName(nonBlank(asString(values.get("postName")), "Vacancy"));
        v.setDepartment(asString(values.get("department")));
        v.setSpeciality(asString(values.get("speciality")));
        v.setNumberOfVacancies(Optional.ofNullable(asInteger(values.get("numberOfVacancies"))).orElse(1));
        v.setCategory(asString(values.get("category")));
        v.setConfidenceScore(1.0);
        v.setStatus(VacancyRecord.VacancyStatus.NEEDS_REVIEW);
        v.setSlug(buildSlug(v, UUID.randomUUID().toString().substring(0, 6)));
        applyVacancyUpdates(v, values);
        return vacancyRepository.save(v);
    }

    @Transactional
    public void deleteVacancy(UUID recruitmentId, UUID vacancyId) {
        VacancyRecord v = getVacancy(recruitmentId, vacancyId);
        if (v.getStatus() == VacancyRecord.VacancyStatus.PUBLISHED) {
            throw new IllegalStateException("Published vacancy cannot be deleted; close the published job instead");
        }
        vacancyRepository.delete(v);
    }

    @Transactional
    public VacancyRecord duplicateVacancy(UUID recruitmentId, UUID vacancyId) {
        VacancyRecord source = getVacancy(recruitmentId, vacancyId);
        VacancyRecord copy = copyVacancy(source);
        copy.setId(null);
        copy.setPublishedJobId(null);
        copy.setStatus(VacancyRecord.VacancyStatus.NEEDS_REVIEW);
        copy.setSlug(buildSlug(copy, UUID.randomUUID().toString().substring(0, 6)));
        return vacancyRepository.save(copy);
    }

    @Transactional
    public List<VacancyRecord> bulkUpdate(UUID recruitmentId, Collection<UUID> vacancyIds, Map<String, Object> updates) {
        if (vacancyIds == null || vacancyIds.isEmpty()) {
            throw new IllegalArgumentException("Select at least one vacancy");
        }
        if (updates == null || updates.isEmpty()) {
            throw new IllegalArgumentException("Provide at least one field to update");
        }
        List<VacancyRecord> rows = vacancyRepository.findAllById(vacancyIds).stream()
                .filter(v -> v.getRecruitment().getId().equals(recruitmentId))
                .collect(Collectors.toList());
        if (rows.isEmpty()) {
            throw new IllegalArgumentException("None of the selected vacancies belong to this recruitment");
        }
        rows.forEach(v -> applyVacancyUpdates(v, updates));
        return vacancyRepository.saveAll(rows);
    }

    @Transactional
    public BulkMutationResult bulkStatus(UUID recruitmentId, Collection<UUID> vacancyIds, VacancyRecord.VacancyStatus status) {
        if (vacancyIds == null || vacancyIds.isEmpty()) {
            throw new IllegalArgumentException("Select at least one vacancy");
        }
        if (status == VacancyRecord.VacancyStatus.PUBLISHED) {
            throw new IllegalArgumentException("Use publish-all to publish vacancies");
        }
        if (status != VacancyRecord.VacancyStatus.APPROVED
                && status != VacancyRecord.VacancyStatus.REJECTED
                && status != VacancyRecord.VacancyStatus.NEEDS_REVIEW) {
            throw new IllegalArgumentException("Unsupported vacancy status: " + status);
        }
        List<VacancyRecord> rows = vacancyRepository.findAllById(vacancyIds).stream()
                .filter(v -> v.getRecruitment().getId().equals(recruitmentId))
                .collect(Collectors.toList());
        if (rows.isEmpty()) {
            throw new IllegalArgumentException("None of the selected vacancies belong to this recruitment");
        }
        int updated = 0;
        int skippedPublished = 0;
        for (VacancyRecord v : rows) {
            if (v.getStatus() == VacancyRecord.VacancyStatus.PUBLISHED) {
                skippedPublished++;
                continue;
            }
            v.setStatus(status);
            updated++;
        }
        if (updated == 0) {
            throw new IllegalStateException("No unpublished vacancies were updated. Published rows cannot be approved or rejected here.");
        }
        vacancyRepository.saveAll(rows);
        vacancyRepository.flush();
        return new BulkMutationResult(updated, skippedPublished, get(recruitmentId));
    }

    @Transactional
    public Recruitment verify(UUID recruitmentId, String verifiedBy) {
        Recruitment r = get(recruitmentId);
        if (requiresOfficialVerification(r)) {
            boolean hasNotificationUrl = isHttpUrl(r.getOfficialNotificationUrl());
            boolean hasApplicationUrl = isHttpUrl(r.getOfficialApplicationUrl());
            boolean hasWebsite = isHttpUrl(r.getOfficialWebsite());

            if (!hasNotificationUrl && !hasApplicationUrl && !hasWebsite) {
                throw new IllegalStateException(
                        "Official source verification requires at least one valid official URL (Organisation Website, Official Notification URL, or Official Application URL)");
            }

            List<String> invalid = new ArrayList<>();
            if (hasText(r.getOfficialNotificationUrl()) && !isHttpUrl(r.getOfficialNotificationUrl())) invalid.add("officialNotificationUrl");
            if (hasText(r.getOfficialApplicationUrl()) && !isHttpUrl(r.getOfficialApplicationUrl())) invalid.add("officialApplicationUrl");
            if (hasText(r.getOfficialWebsite()) && !isHttpUrl(r.getOfficialWebsite())) invalid.add("officialWebsite");
            if (!invalid.isEmpty()) {
                throw new IllegalStateException(
                        "Invalid URL format (must start with http:// or https://) for: " + String.join(", ", invalid));
            }
        }
        r.setOfficialSourceVerified(true);
        r.setVerificationDate(LocalDate.now());
        r.setVerifiedBy(nonBlank(verifiedBy, "Admin"));
        r.setStatus(Recruitment.RecruitmentStatus.VERIFIED);
        return recruitmentRepository.save(r);
    }

    @Transactional
    public PublishResult publishApproved(UUID recruitmentId, String adminEmail) {
        Recruitment r = get(recruitmentId);
        if (requiresOfficialVerification(r) && !Boolean.TRUE.equals(r.getOfficialSourceVerified())) {
            throw new IllegalStateException("Government recruitment must pass official-source verification before publishing");
        }

        int structuredTotal = r.getVacancies().stream()
                .map(VacancyRecord::getNumberOfVacancies)
                .filter(Objects::nonNull)
                .mapToInt(Integer::intValue)
                .sum();
        boolean totalsMatch = Objects.equals(r.getTotalVacancies(), structuredTotal);

        List<VacancyRecord> approved = r.getVacancies().stream()
                .filter(v -> v.getStatus() == VacancyRecord.VacancyStatus.APPROVED)
                .toList();
        if (approved.isEmpty()) {
            return new PublishResult(0, 0, List.of(), totalsMatch, r);
        }

        Employer employer = resolveOrCreateEmployer(r.getOrganisationName());
        User approver = adminEmail == null ? null : userRepository.findByEmail(adminEmail).orElse(null);
        int published = 0;
        List<String> failures = new ArrayList<>();
        List<VacancyRecord> changed = new ArrayList<>();
        for (VacancyRecord v : approved) {
            try {
                Job saved = publishVacancyIdempotent(r, v, employer, approver);
                v.setPublishedJobId(saved.getId());
                v.setStatus(VacancyRecord.VacancyStatus.PUBLISHED);
                changed.add(v);
                published++;
            } catch (Exception ex) {
                logger.warn("Failed to publish vacancy {}: {}", v.getId(), ex.getMessage());
                failures.add((hasText(v.getPostName()) ? v.getPostName() : String.valueOf(v.getId())) + ": " + safeMessage(ex));
            }
        }
        if (!changed.isEmpty()) {
            vacancyRepository.saveAll(changed);
        }
        boolean anyPublished = r.getVacancies().stream().anyMatch(v -> v.getStatus() == VacancyRecord.VacancyStatus.PUBLISHED);
        if (anyPublished) {
            r.setStatus(Recruitment.RecruitmentStatus.PUBLISHED);
            recruitmentRepository.save(r);
        }
        return new PublishResult(published, failures.size(), failures, totalsMatch, get(recruitmentId));
    }

    private Recruitment mapRecruitment(RecruitmentExtractionResult result, String fingerprint, String fileName) {
        RecruitmentExtractionResult.RecruitmentData d = result.getRecruitment();
        Recruitment r = new Recruitment();
        r.setOrganisationName(nonBlank(d.getOrganisationName(), "Unknown Organisation"));
        r.setTitle(nonBlank(d.getTitle(), "Recruitment Notification"));
        r.setAdvertisementNumber(d.getAdvertisementNumber());
        r.setRecruitmentYear(d.getRecruitmentYear() == null ? LocalDate.now().getYear() : d.getRecruitmentYear());
        r.setSector(parseSector(d.getSector()));
        r.setLocation(nonBlank(d.getLocation(), "India"));
        r.setApplicationStartDate(asDate(d.getApplicationStartDate()));
        r.setApplicationLastDate(asDate(d.getApplicationLastDate()));
        r.setApplicationFee(d.getApplicationFee());
        r.setSelectionProcess(d.getSelectionProcess());
        r.setOfficialNotificationUrl(d.getOfficialNotificationUrl());
        r.setOfficialApplicationUrl(d.getOfficialApplicationUrl());
        r.setOfficialWebsite(d.getOfficialWebsite());
        r.setImportantInstructions(d.getImportantInstructions());
        r.setSourcePdfName(fileName);
        r.setPdfFingerprint(fingerprint);
        String slugSuffix = fingerprint == null || fingerprint.length() < 8 ? UUID.randomUUID().toString().substring(0, 8) : fingerprint.substring(0, 8);
        r.setSlug(slug(r.getTitle() + "-" + r.getRecruitmentYear() + "-" + slugSuffix));
        r.setExtractionMethod(result.getExtractionMethod());
        r.setStatus(Recruitment.RecruitmentStatus.REVIEW);

        int index = 0;
        for (RecruitmentExtractionResult.VacancyData source : Optional.ofNullable(result.getVacancies()).orElse(List.of())) {
            if (!hasText(source.getPostName())) continue;
            VacancyRecord v = new VacancyRecord();
            v.setPostName(source.getPostName().trim());
            v.setDepartment(source.getDepartment());
            v.setSpeciality(source.getSpeciality());
            v.setSubSpeciality(source.getSubSpeciality());
            v.setNumberOfVacancies(source.getNumberOfVacancies() == null || source.getNumberOfVacancies() < 1 ? 1 : source.getNumberOfVacancies());
            v.setCategory(source.getCategory());
            v.setQualification(source.getQualification());
            v.setExperience(source.getExperience());
            v.setAgeLimit(source.getAgeLimit());
            v.setSalary(source.getSalary());
            v.setPayLevel(source.getPayLevel());
            v.setPayScale(source.getPayScale());
            v.setJobType(source.getJobType());
            v.setLocation(nonBlank(source.getLocation(), r.getLocation()));
            v.setOtherEligibilityRequirements(source.getOtherEligibilityRequirements());
            v.setConfidenceScore(source.getConfidenceScore() == null ? 0.70 : Math.max(0, Math.min(1, source.getConfidenceScore())));
            v.setSourcePage(source.getSourcePage());
            v.setStatus(VacancyRecord.VacancyStatus.NEEDS_REVIEW);
            v.setSlug(buildSlug(v, String.valueOf(++index)));
            r.addVacancy(v);
        }

        int calculatedTotal = r.getVacancies().stream().mapToInt(VacancyRecord::getNumberOfVacancies).sum();
        r.setTotalVacancies(d.getTotalVacancies() != null && d.getTotalVacancies() > 0 ? d.getTotalVacancies() : calculatedTotal);
        return r;
    }

    private Job toJob(Recruitment r, VacancyRecord v, Employer employer, User approver) {
        Job job = new Job();
        job.setEmployer(employer);
        String speciality = hasText(v.getSpeciality()) ? v.getSpeciality() : v.getDepartment();
        job.setTitle(clip(v.getPostName() + (hasText(speciality) ? " - " + speciality : ""), 200));
        job.setDescription(buildDescription(r, v));
        job.setSector(r.getSector());
        job.setCategory(mapJobCategory(v.getPostName()));
        job.setLocation(clip(nonBlank(v.getLocation(), r.getLocation()), 200));
        job.setQualification(nonBlank(v.getQualification(), "As per official recruitment notification"));
        job.setExperience(clip(nonBlank(v.getExperience(), "As per official recruitment notification"), 100));
        job.setSpeciality(clip(speciality, 255));
        job.setDepartment(clip(v.getDepartment(), 220));
        job.setJobType(clip(nonBlank(v.getJobType(), "Full Time"), 100));
        job.setDutyType(mapDutyType(v.getJobType()));
        job.setNumberOfPosts(Math.max(1, v.getNumberOfVacancies()));
        job.setSalaryRange(clip(firstNonBlank(v.getSalary(), v.getPayScale(), v.getPayLevel()), 100));
        job.setRequirements(v.getOtherEligibilityRequirements());
        job.setLastDate(r.getApplicationLastDate() == null ? LocalDate.now().plusDays(30) : r.getApplicationLastDate());
        job.setContactEmail("jobs@medexjob.com");
        job.setContactPhone("0000000000");
        job.setPdfUrl(clip(firstNonBlank(r.getOfficialNotificationUrl(), r.getOfficialWebsite()), 500));
        job.setApplyLink(clip(firstNonBlank(r.getOfficialApplicationUrl(), r.getOfficialWebsite(), r.getOfficialNotificationUrl()), 500));
        job.setStatus(job.getLastDate().isBefore(LocalDate.now()) ? Job.JobStatus.CLOSED : Job.JobStatus.ACTIVE);
        job.setIsFeatured(false);
        job.setViews(0);
        job.setApplicationsCount(0);
        job.setSourceRecruitmentId(r.getId());
        job.setSourceVacancyId(v.getId());
        job.setSlug(uniqueJobSlug(v));
        job.setApprovedAt(LocalDateTime.now());
        job.setApprovedBy(approver);
        return job;
    }

    private String buildDescription(Recruitment r, VacancyRecord v) {
        List<String> lines = new ArrayList<>();
        lines.add(r.getTitle());
        if (hasText(v.getDepartment())) lines.add("Department: " + v.getDepartment());
        if (hasText(v.getSpeciality())) lines.add("Speciality: " + v.getSpeciality());
        if (hasText(v.getSubSpeciality()) && !Objects.equals(v.getSubSpeciality(), v.getSpeciality())) lines.add("Sub-speciality: " + v.getSubSpeciality());
        if (hasText(v.getCategory())) lines.add("Category: " + v.getCategory());
        lines.add("Vacancies: " + v.getNumberOfVacancies());
        if (hasText(r.getAdvertisementNumber())) lines.add("Advertisement: " + r.getAdvertisementNumber());
        return String.join("\n", lines);
    }

    private Employer resolveOrCreateEmployer(String organisation) {
        return vacancyJobPublisher.resolveOrCreateEmployer(organisation);
    }

    private VacancyRecord getVacancy(UUID recruitmentId, UUID vacancyId) {
        VacancyRecord v = vacancyRepository.findById(vacancyId)
                .orElseThrow(() -> new NoSuchElementException("Vacancy not found"));
        if (!v.getRecruitment().getId().equals(recruitmentId)) throw new NoSuchElementException("Vacancy not found in recruitment");
        return v;
    }

    private void applyVacancyUpdates(VacancyRecord v, Map<String, Object> updates) {
        setIfPresent(updates, "postName", value -> v.setPostName(nonBlank(value, v.getPostName())));
        setIfPresent(updates, "department", v::setDepartment);
        setIfPresent(updates, "speciality", v::setSpeciality);
        setIfPresent(updates, "subSpeciality", v::setSubSpeciality);
        setIfPresent(updates, "category", v::setCategory);
        setIfPresent(updates, "qualification", v::setQualification);
        setIfPresent(updates, "experience", v::setExperience);
        setIfPresent(updates, "ageLimit", v::setAgeLimit);
        setIfPresent(updates, "salary", v::setSalary);
        setIfPresent(updates, "payLevel", v::setPayLevel);
        setIfPresent(updates, "payScale", v::setPayScale);
        setIfPresent(updates, "jobType", v::setJobType);
        setIfPresent(updates, "location", v::setLocation);
        setIfPresent(updates, "otherEligibilityRequirements", v::setOtherEligibilityRequirements);
        if (updates.containsKey("numberOfVacancies")) {
            Integer count = asInteger(updates.get("numberOfVacancies"));
            if (count == null || count < 1) throw new IllegalArgumentException("numberOfVacancies must be at least 1");
            v.setNumberOfVacancies(count);
        }
        if (updates.containsKey("confidenceScore")) {
            Double score = asDouble(updates.get("confidenceScore"));
            if (score != null) v.setConfidenceScore(Math.max(0, Math.min(1, score)));
        }
    }

    private VacancyRecord copyVacancy(VacancyRecord s) {
        VacancyRecord v = new VacancyRecord();
        v.setRecruitment(s.getRecruitment());
        v.setPostName(s.getPostName()); v.setDepartment(s.getDepartment()); v.setSpeciality(s.getSpeciality());
        v.setSubSpeciality(s.getSubSpeciality()); v.setNumberOfVacancies(s.getNumberOfVacancies());
        v.setCategory(s.getCategory()); v.setQualification(s.getQualification()); v.setExperience(s.getExperience());
        v.setAgeLimit(s.getAgeLimit()); v.setSalary(s.getSalary()); v.setPayLevel(s.getPayLevel()); v.setPayScale(s.getPayScale());
        v.setJobType(s.getJobType()); v.setLocation(s.getLocation()); v.setOtherEligibilityRequirements(s.getOtherEligibilityRequirements());
        v.setConfidenceScore(s.getConfidenceScore()); v.setSourcePage(s.getSourcePage());
        return v;
    }

    private Job.JobCategory mapJobCategory(String postName) {
        String p = Optional.ofNullable(postName).orElse("").toLowerCase(Locale.ROOT);
        if (p.contains("dental") || p.contains("bds") || p.contains("mds") || p.contains("dentist")) return Job.JobCategory.DENTAL;
        if (p.contains("ayush") || p.contains("ayurved") || p.contains("homeopath") || p.contains("homoeopath") || p.contains("unani") || p.contains("siddha") || p.contains("bams") || p.contains("bhms")) return Job.JobCategory.AYUSH;
        if (p.contains("nurse") || p.contains("nursing") || p.contains("anm") || p.contains("gnm") || p.contains("sister")) return Job.JobCategory.NURSING;
        if (p.contains("pharm") || p.contains("druggist") || p.contains("dispenser")) return Job.JobCategory.PHARMACY;
        if (p.contains("physiotherap") || p.contains("occupational therap") || p.contains("audiolog") || p.contains("speech") || p.contains("prosthet") || p.contains("orthot") || p.contains("bpt") || p.contains("mpt")) return Job.JobCategory.ALLIED_HEALTH;
        if (p.contains("lab") || p.contains("radiolog") || p.contains("x-ray") || p.contains("xray") || p.contains("mri") || p.contains("ct scan") || p.contains("dialysis") || p.contains("ot tech") || p.contains("operation theatre") || p.contains("cardiac") || p.contains("blood bank") || p.contains("ophthalm") || p.contains("optometr") || p.contains("technician") || p.contains("paramedic") || p.contains("technical officer")) return Job.JobCategory.PARAMEDICAL;
        if (p.contains("psycholog") || p.contains("mental health") || p.contains("counsellor") || p.contains("counselor") || p.contains("psychiat")) return Job.JobCategory.PSYCHOLOGY_MENTAL_HEALTH;
        if (p.contains("diet") || p.contains("nutrition")) return Job.JobCategory.NUTRITION_DIETETICS;
        if (p.contains("research") || p.contains("scientist") || p.contains("genetic") || p.contains("clinical trial")) return Job.JobCategory.LIFE_SCIENCE_RESEARCH;
        if (p.contains("superintendent") || p.contains("administrator") || p.contains("mha") || p.contains("operations") || p.contains("executive officer")) return Job.JobCategory.HOSPITAL_ADMINISTRATION;
        if (p.contains("public health") || p.contains("epidemiol") || p.contains("health officer") || p.contains("mph")) return Job.JobCategory.PUBLIC_HEALTH;
        if (p.contains("junior resident") || p.contains(" jr ")) return Job.JobCategory.JUNIOR_RESIDENT;
        if (p.contains("senior resident") || p.contains(" sr ")) return Job.JobCategory.SENIOR_RESIDENT;
        if (p.contains("professor") || p.contains("faculty") || p.contains("tutor") || p.contains("lecturer") || p.contains("principal")) return Job.JobCategory.FACULTY;
        if (p.contains("specialist") || p.contains("consultant") || p.contains("surgeon") || p.contains("physician")) return Job.JobCategory.SPECIALIST;
        return Job.JobCategory.MEDICAL_OFFICER;
    }

    private Job.JobSector parseSector(String sector) {
        return sector != null && sector.equalsIgnoreCase("private") ? Job.JobSector.PRIVATE : Job.JobSector.GOVERNMENT;
    }

    private String buildSlug(VacancyRecord v, String suffix) {
        String value = String.join("-", List.of(
                nonBlank(v.getPostName(), "vacancy"),
                nonBlank(v.getSpeciality(), nonBlank(v.getDepartment(), "medical")),
                nonBlank(v.getCategory(), "all"),
                suffix
        ));
        return slug(value);
    }

    private String slug(String value) {
        return Optional.ofNullable(value).orElse("").toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-").replaceAll("(^-|-$)", "");
    }

    private void setIfPresent(Map<String, Object> updates, String key, java.util.function.Consumer<String> setter) {
        if (updates.containsKey(key)) setter.accept(asString(updates.get(key)));
    }

    private String asString(Object value) { return value == null ? null : String.valueOf(value).trim(); }
    private Integer asInteger(Object value) {
        if (value == null || String.valueOf(value).isBlank()) return null;
        if (value instanceof Number n) return n.intValue();
        return Integer.parseInt(String.valueOf(value));
    }
    private Double asDouble(Object value) {
        if (value == null || String.valueOf(value).isBlank()) return null;
        if (value instanceof Number n) return n.doubleValue();
        return Double.parseDouble(String.valueOf(value));
    }
    private LocalDate asDate(Object value) {
        if (value == null || String.valueOf(value).isBlank()) return null;
        return LocalDate.parse(String.valueOf(value));
    }
    private String nonBlank(String value, String fallback) { return hasText(value) ? value.trim() : fallback; }
    private boolean hasText(String value) { return value != null && !value.trim().isEmpty(); }
    private boolean isHttpUrl(String value) {
        if (!hasText(value)) return false;
        try {
            URI uri = new URI(value.trim());
            String scheme = uri.getScheme();
            return uri.getHost() != null && scheme != null
                    && (scheme.equalsIgnoreCase("http") || scheme.equalsIgnoreCase("https"));
        } catch (URISyntaxException ex) {
            return false;
        }
    }
    private String firstNonBlank(String... values) {
        return Arrays.stream(values).filter(this::hasText).findFirst().orElse(null);
    }

    public record UploadResult(Recruitment recruitment, boolean duplicate, boolean created) {}
    public record PublishResult(int publishedCount, int failedCount, List<String> failures, boolean vacancyTotalMatches, Recruitment recruitment) {}
    public record BulkMutationResult(int updatedCount, int skippedPublished, Recruitment recruitment) {}

    private Optional<Recruitment> findPossibleDuplicate(Recruitment recruitment, String fingerprint) {
        Optional<Recruitment> duplicate = recruitmentRepository
                .findFirstByPdfFingerprintOrderByCreatedAtDesc(fingerprint);
        if (duplicate.isEmpty() && hasText(recruitment.getAdvertisementNumber())) {
            duplicate = recruitmentRepository
                    .findFirstByAdvertisementNumberIgnoreCaseAndRecruitmentYearOrderByCreatedAtDesc(
                            recruitment.getAdvertisementNumber(), recruitment.getRecruitmentYear());
        }
        if (duplicate.isEmpty() && hasText(recruitment.getOrganisationName()) && hasText(recruitment.getTitle())) {
            duplicate = recruitmentRepository
                    .findFirstByOrganisationNameIgnoreCaseAndTitleIgnoreCaseAndRecruitmentYearOrderByCreatedAtDesc(
                            recruitment.getOrganisationName(), recruitment.getTitle(), recruitment.getRecruitmentYear());
        }
        if (duplicate.isEmpty() && hasText(recruitment.getOrganisationName()) && hasText(recruitment.getTitle())
                && recruitment.getApplicationLastDate() != null) {
            duplicate = recruitmentRepository
                    .findFirstByOrganisationNameIgnoreCaseAndTitleIgnoreCaseAndApplicationLastDateOrderByCreatedAtDesc(
                            recruitment.getOrganisationName(), recruitment.getTitle(), recruitment.getApplicationLastDate());
        }
        return duplicate;
    }

    private Job publishVacancyIdempotent(Recruitment r, VacancyRecord v, Employer employer, User approver) {
        if (v.getPublishedJobId() != null) {
            return jobRepository.findById(v.getPublishedJobId())
                    .orElseGet(() -> jobRepository.findFirstBySourceVacancyId(v.getId())
                            .orElseThrow(() -> new IllegalStateException("Published job id is missing")));
        }
        Optional<Job> existing = jobRepository.findFirstBySourceVacancyId(v.getId());
        if (existing.isPresent()) {
            return existing.get();
        }
        return vacancyJobPublisher.saveNew(toJob(r, v, employer, approver));
    }

    private boolean requiresOfficialVerification(Recruitment r) {
        if (r.getSector() == Job.JobSector.GOVERNMENT) return true;
        return r.getSector() == Job.JobSector.PRIVATE && privateVerificationRequired;
    }

    private Job.DutyType mapDutyType(String jobType) {
        String value = Optional.ofNullable(jobType).orElse("").toLowerCase(Locale.ROOT);
        if (value.contains("part")) return Job.DutyType.PART_TIME;
        if (value.contains("contract")) return Job.DutyType.CONTRACT;
        return Job.DutyType.FULL_TIME;
    }

    private String uniqueJobSlug(VacancyRecord v) {
        String suffix = v.getId() == null ? UUID.randomUUID().toString().substring(0, 8) : v.getId().toString().substring(0, 8);
        String value = slug(String.join("-", List.of(
                nonBlank(v.getPostName(), "job"),
                nonBlank(v.getSpeciality(), nonBlank(v.getDepartment(), "medical")),
                nonBlank(v.getCategory(), "all"),
                suffix
        )));
        if (value.length() > 320) value = value.substring(0, 320);
        return value;
    }

    private String clip(String value, int max) {
        if (value == null) return null;
        return value.length() <= max ? value : value.substring(0, max);
    }

    private String safeMessage(Exception ex) {
        return ex.getMessage() == null ? ex.getClass().getSimpleName() : ex.getMessage();
    }
}
