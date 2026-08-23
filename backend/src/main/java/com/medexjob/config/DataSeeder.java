package com.medexjob.config;

import com.medexjob.entity.Employer;
import com.medexjob.entity.Job;
import com.medexjob.entity.SubscriptionPlan;
import com.medexjob.entity.User;
import com.medexjob.repository.EmployerRepository;
import com.medexjob.repository.JobRepository;
import com.medexjob.repository.SubscriptionPlanRepository;
import com.medexjob.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.List;
import java.util.Locale;

@Component
@Profile({"default","dev"})
public class DataSeeder implements CommandLineRunner {

    @Value("${SEED_JOBS:false}")
    private boolean seedJobs;

    @Value("${SEED_EMPLOYER_NAME:Seeder Organization}")
    private String employerName;

    @Value("${SEED_EMPLOYER_TYPE:HOSPITAL}")
    private String employerType;

    @Value("${SEED_USER_NAME:Seeder Employer}")
    private String userName;

    @Value("${SEED_USER_EMAIL:employer.seeder@example.com}")
    private String userEmail;

    @Value("${SEED_USER_PHONE:9999999999}")
    private String userPhone;

    @Value("${SEED_USER_PASSWORD:}")
    private String userPassword;

    // Job 1 and Job 2 remain configurable for targeted local testing.
    @Value("${SEED_JOB1_TITLE:Apollo Medical Officer - Delhi}")
    private String job1Title;
    @Value("${SEED_JOB1_SECTOR:government}")
    private String job1Sector;
    @Value("${SEED_JOB1_CATEGORY:Medical Officer}")
    private String job1Category;
    @Value("${SEED_JOB1_LOCATION:New Delhi}")
    private String job1Location;
    @Value("${SEED_JOB1_QUALIFICATION:MBBS}")
    private String job1Qualification;
    @Value("${SEED_JOB1_EXPERIENCE:0-2 years}")
    private String job1Experience;
    @Value("${SEED_JOB1_POSTS:10}")
    private Integer job1Posts;
    @Value("${SEED_JOB1_SALARY:As per norms}")
    private String job1Salary;
    @Value("${SEED_JOB1_LAST_DATE:2027-03-31}")
    private String job1LastDate;
    @Value("${SEED_JOB1_DESCRIPTION:Official notification as per PDF}")
    private String job1Description;
    @Value("${SEED_JOB1_APPLY_LINK:}")
    private String job1ApplyLink;
    @Value("${SEED_JOB1_PDF_URL:}")
    private String job1PdfUrl;
    @Value("${SEED_JOB1_FEATURED:false}")
    private boolean job1Featured;

    // Job 2
    @Value("${SEED_JOB2_TITLE:Sunrise Specialist - Mumbai}")
    private String job2Title;
    @Value("${SEED_JOB2_SECTOR:private}")
    private String job2Sector;
    @Value("${SEED_JOB2_CATEGORY:Specialist}")
    private String job2Category;
    @Value("${SEED_JOB2_LOCATION:Hyderabad}")
    private String job2Location;
    @Value("${SEED_JOB2_QUALIFICATION:Relevant Degree}")
    private String job2Qualification;
    @Value("${SEED_JOB2_EXPERIENCE:2-5 years}")
    private String job2Experience;
    @Value("${SEED_JOB2_POSTS:2}")
    private Integer job2Posts;
    @Value("${SEED_JOB2_SALARY:Negotiable}")
    private String job2Salary;
    @Value("${SEED_JOB2_LAST_DATE:2027-04-15}")
    private String job2LastDate;
    @Value("${SEED_JOB2_DESCRIPTION:As per PDF}")
    private String job2Description;
    @Value("${SEED_JOB2_APPLY_LINK:}")
    private String job2ApplyLink;
    @Value("${SEED_JOB2_PDF_URL:}")
    private String job2PdfUrl;
    @Value("${SEED_JOB2_FEATURED:false}")
    private boolean job2Featured;

    @Autowired private UserRepository userRepository;
    @Autowired private EmployerRepository employerRepository;
    @Autowired private JobRepository jobRepository;
    @Autowired private SubscriptionPlanRepository subscriptionPlanRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        // Always seed subscription plans
        seedSubscriptionPlans();
        
        if (!seedJobs) return; // only run when explicitly enabled
        if (userPassword == null || userPassword.isBlank()) {
            throw new IllegalStateException("SEED_USER_PASSWORD must be set when SEED_JOBS=true");
        }

        // Create Employer User if not exists
        User user = userRepository.findAll().stream()
                .filter(u -> u.getEmail().equalsIgnoreCase(userEmail))
                .findFirst()
                .orElseGet(() -> {
                    User nu = new User();
                    nu.setName(userName);
                    nu.setEmail(userEmail);
                    nu.setPhone(userPhone);
                    nu.setRole(User.UserRole.EMPLOYER);
                    nu.setPasswordHash(passwordEncoder.encode(userPassword));
                    return userRepository.save(nu);
                });

        // Create Employer if not exists for this user
        Employer employer = employerRepository.findAll().stream()
                .filter(e -> e.getUser().getId().equals(user.getId()))
                .findFirst()
                .orElseGet(() -> {
                    Employer e = new Employer();
                    e.setUser(user);
                    e.setCompanyName(employerName);
                    e.setCompanyType(parseCompanyType(employerType));
                    e.setIsVerified(true);
                    e.setVerificationStatus(Employer.VerificationStatus.APPROVED);
                    return employerRepository.save(e);
                });

        List<JobSeed> jobs = List.of(
            new JobSeed(job1Title, job1Sector, job1Category, job1Location, job1Qualification,
                job1Experience, job1Posts, job1Salary, job1LastDate, job1Description, job1Featured,
                "Emergency Medicine", "FULL_TIME", "MID"),
            new JobSeed(job2Title, job2Sector, job2Category, job2Location, job2Qualification,
                job2Experience, job2Posts, job2Salary, job2LastDate, job2Description, job2Featured,
                "Cardiology", "FULL_TIME", "SENIOR"),
            new JobSeed("Junior Resident - Bengaluru", "private", "junior resident", "Bengaluru", "MBBS with internship completion",
                "0-2 years", 4, "INR 70,000 - 90,000 per month", "2027-05-01", "Resident doctor role in a multispecialty hospital with supervised clinical rotations.", false,
                "Internal Medicine", "FULL_TIME", "ENTRY"),
            new JobSeed("Senior Resident - Chennai", "government", "senior resident", "Chennai", "MD or DNB in Pediatrics",
                "2-5 years", 3, "INR 1,10,000 - 1,40,000 per month", "2027-05-15", "Senior resident position supporting pediatric inpatient and emergency services.", true,
                "Pediatrics", "CONTRACT", "SENIOR"),
            new JobSeed("Staff Nurse - Pune", "private", "paramedical", "Pune", "B.Sc Nursing or GNM with valid registration",
                "2-5 years", 8, "INR 45,000 - 65,000 per month", "2027-06-01", "Staff nurse position for critical care and patient education across rotating shifts.", false,
                "Critical Care", "FULL_TIME", "MID"),
            new JobSeed("AYUSH Medical Officer - Jaipur", "government", "ayush", "Jaipur", "BAMS with State Medical Council registration",
                "2-5 years", 2, "INR 75,000 - 95,000 per month", "2027-06-10", "AYUSH medical officer serving outpatient consultation and preventive health programs.", false,
                "Ayurveda", "FULL_TIME", "MID"),
            new JobSeed("Assistant Professor - Lucknow", "private", "faculty", "Lucknow", "MD/MS with teaching experience",
                "5-10 years", 1, "INR 1,50,000 - 2,00,000 per month", "2027-06-20", "Teaching faculty role combining medical education, clinical duties, and academic mentoring.", true,
                "Anatomy", "FULL_TIME", "SENIOR"),
            new JobSeed("Medical Officer - Kochi", "government", "medical officer", "Kochi", "MBBS and valid medical registration",
                "0-2 years", 5, "INR 80,000 - 1,00,000 per month", "2027-07-01", "Medical officer role providing primary care, screening, and referral services.", false,
                "Primary Care", "CONTRACT", "ENTRY"),
            new JobSeed("Radiology Specialist - Ahmedabad", "private", "specialist", "Ahmedabad", "MD/DNB Radiodiagnosis",
                "5-10 years", 1, "INR 2,00,000 - 2,75,000 per month", "2027-07-15", "Radiology specialist role covering reporting, imaging protocols, and multidisciplinary case review.", false,
                "Radiology", "FULL_TIME", "SENIOR"),
            new JobSeed("Clinical Pharmacist - Hyderabad", "private", "paramedical", "Hyderabad", "B.Pharm or Pharm.D with registration",
                "2-5 years", 2, "INR 55,000 - 80,000 per month", "2027-08-01", "Clinical pharmacist role supporting medication safety, counselling, and inpatient rounds.", false,
                "Clinical Pharmacy", "FULL_TIME", "MID")
        );

        jobs.forEach(job -> saveSeedJob(job, employer, user));
    }

        private void saveSeedJob(JobSeed seed, Employer employer, User user) {
        boolean exists = jobRepository.findByEmployerId(employer.getId()).stream()
            .anyMatch(job -> job.getTitle().equalsIgnoreCase(seed.title()));
        if (exists) return;

        Job job = new Job();
        job.setEmployer(employer);
        job.setTitle(seed.title());
        job.setDescription(seed.description());
        job.setSector(parseSector(seed.sector()));
        job.setCategory(parseCategory(seed.category()));
        job.setLocation(seed.location());
        job.setQualification(seed.qualification());
        job.setExperience(seed.experience());
        job.setExperienceLevel(Job.ExperienceLevel.valueOf(seed.experienceLevel()));
        job.setSpeciality(seed.speciality());
        job.setDutyType(Job.DutyType.valueOf(seed.dutyType()));
        job.setNumberOfPosts(seed.posts());
        job.setSalaryRange(seed.salary());
        job.setRequirements("Valid registration, strong communication, patient-first approach, and role-specific clinical competence.");
        job.setBenefits("Health insurance, professional development support, paid leave, and structured onboarding.");
        job.setLastDate(parseDate(seed.lastDate()));
        job.setContactEmail(user.getEmail());
        job.setContactPhone(user.getPhone());
        job.setStatus(Job.JobStatus.ACTIVE);
        job.setIsFeatured(seed.featured());
        jobRepository.save(job);
        }

        private record JobSeed(
            String title,
            String sector,
            String category,
            String location,
            String qualification,
            String experience,
            Integer posts,
            String salary,
            String lastDate,
            String description,
            boolean featured,
            String speciality,
            String dutyType,
            String experienceLevel
        ) {}

    private Employer.CompanyType parseCompanyType(String s) {
        String v = (s == null ? "" : s).trim().toUpperCase(Locale.ROOT);
        try {
            return Employer.CompanyType.valueOf(v);
        } catch (Exception e) {
            return Employer.CompanyType.HOSPITAL;
        }
    }

    private Job.JobSector parseSector(String s) {
        String v = (s == null ? "" : s).trim().toLowerCase(Locale.ROOT);
        if (v.equals("government")) return Job.JobSector.GOVERNMENT;
        return Job.JobSector.PRIVATE;
    }

    private Job.JobCategory parseCategory(String s) {
        if (s == null) return Job.JobCategory.SPECIALIST;
        String v = s.trim().toLowerCase(Locale.ROOT);
        return switch (v) {
            case "junior resident" -> Job.JobCategory.JUNIOR_RESIDENT;
            case "senior resident" -> Job.JobCategory.SENIOR_RESIDENT;
            case "medical officer" -> Job.JobCategory.MEDICAL_OFFICER;
            case "faculty" -> Job.JobCategory.FACULTY;
            case "specialist" -> Job.JobCategory.SPECIALIST;
            case "dental" -> Job.JobCategory.DENTAL;
            case "ayush" -> Job.JobCategory.AYUSH;
            case "nursing" -> Job.JobCategory.NURSING;
            case "paramedical" -> Job.JobCategory.PARAMEDICAL;
            case "paramedical / nursing" -> Job.JobCategory.PARAMEDICAL_NURSING;
            case "allied health", "allied health professionals" -> Job.JobCategory.ALLIED_HEALTH;
            case "pharmacy" -> Job.JobCategory.PHARMACY;
            case "psychology & mental health", "psychology" -> Job.JobCategory.PSYCHOLOGY_MENTAL_HEALTH;
            case "nutrition & dietetics", "nutrition" -> Job.JobCategory.NUTRITION_DIETETICS;
            case "life science & research", "research" -> Job.JobCategory.LIFE_SCIENCE_RESEARCH;
            case "hospital administration", "administration" -> Job.JobCategory.HOSPITAL_ADMINISTRATION;
            case "public health" -> Job.JobCategory.PUBLIC_HEALTH;
            default -> Job.JobCategory.SPECIALIST;
        };
    }

    private LocalDate parseDate(String s) {
        try {
            return LocalDate.parse(s);
        } catch (Exception e) {
            return LocalDate.now().plusDays(30);
        }
    }

    private String blankToNull(String s) {
        return (s == null || s.isBlank()) ? null : s;
    }

    private void seedSubscriptionPlans() {
        // Check if plans already exist
        if (subscriptionPlanRepository.count() > 0) {
            return; // Plans already seeded
        }

        // Plan 1: Basic - Per Post
        SubscriptionPlan plan1 = new SubscriptionPlan();
        plan1.setName("Basic Plan");
        java.math.BigDecimal price1 = new java.math.BigDecimal("999.00");
        plan1.setPrice(price1);
        plan1.setBasePrice(price1); // Initialize basePrice
        plan1.setFinalPrice(price1); // Initialize finalPrice
        plan1.setDuration("per post");
        plan1.setJobPostsAllowed(1);
        plan1.setFeatures("Access to verified medical professionals,Basic application management,Email notifications for new applications,24/7 customer support");
        plan1.setIsActive(true);
        plan1.setDisplayOrder(1);
        subscriptionPlanRepository.save(plan1);

        // Plan 2: Monthly Plan
        SubscriptionPlan plan2 = new SubscriptionPlan();
        plan2.setName("Monthly Plan");
        java.math.BigDecimal price2 = new java.math.BigDecimal("4999.00");
        plan2.setPrice(price2);
        plan2.setBasePrice(price2); // Initialize basePrice
        plan2.setFinalPrice(price2); // Initialize finalPrice
        plan2.setDuration("monthly");
        plan2.setJobPostsAllowed(10);
        plan2.setFeatures("Access to verified medical professionals,Basic application management,Email notifications for new applications,24/7 customer support,Priority approval,Advanced analytics");
        plan2.setIsActive(true);
        plan2.setDisplayOrder(2);
        subscriptionPlanRepository.save(plan2);

        // Plan 3: Yearly Plan
        SubscriptionPlan plan3 = new SubscriptionPlan();
        plan3.setName("Yearly Plan");
        java.math.BigDecimal price3 = new java.math.BigDecimal("49999.00");
        plan3.setPrice(price3);
        plan3.setBasePrice(price3); // Initialize basePrice
        plan3.setFinalPrice(price3); // Initialize finalPrice
        plan3.setDuration("yearly");
        plan3.setJobPostsAllowed(120);
        plan3.setFeatures("Access to verified medical professionals,Basic application management,Email notifications for new applications,24/7 customer support,Priority approval,Advanced analytics,Featured jobs,Dedicated support");
        plan3.setIsActive(true);
        plan3.setDisplayOrder(3);
        subscriptionPlanRepository.save(plan3);
    }
}
