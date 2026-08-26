package com.medexjob.controller;

import com.medexjob.entity.Application;
import com.medexjob.entity.Job;
import com.medexjob.entity.VisitorLog;
import com.medexjob.repository.ApplicationRepository;
import com.medexjob.repository.EmployerRepository;
import com.medexjob.repository.JobRepository;
import com.medexjob.repository.UserRepository;
import com.medexjob.repository.VisitorLogRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/analytics")
public class AnalyticsController {

    private static final Logger logger = LoggerFactory.getLogger(AnalyticsController.class);

    private final JobRepository jobRepository;
    private final UserRepository userRepository;
    private final EmployerRepository employerRepository;
    private final ApplicationRepository applicationRepository;
    private final VisitorLogRepository visitorLogRepository;

    public AnalyticsController(JobRepository jobRepository, UserRepository userRepository,
                               EmployerRepository employerRepository, ApplicationRepository applicationRepository,
                               VisitorLogRepository visitorLogRepository) {
        this.jobRepository = jobRepository;
        this.userRepository = userRepository;
        this.employerRepository = employerRepository;
        this.applicationRepository = applicationRepository;
        this.visitorLogRepository = visitorLogRepository;
    }

    /**
     * Track a visitor. Called by the frontend on each route change.
     * Uses a browser-generated visitorToken (stored in localStorage) to identify unique visitors.
     * Upserts one row per (visitorToken, visitDate) — deduplicated per day.
     */
    @PostMapping("/track-visitor")
    @Transactional
    public ResponseEntity<Map<String, Object>> trackVisitor(
            @RequestBody Map<String, String> body,
            HttpServletRequest request) {
        try {
            String visitorToken = body.get("visitorToken");
            if (visitorToken == null || visitorToken.isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("error", "visitorToken is required"));
            }
            // Limit token length for safety
            if (visitorToken.length() > 64) {
                visitorToken = visitorToken.substring(0, 64);
            }

            LocalDate today = LocalDate.now();
            LocalDateTime now = LocalDateTime.now();

            // Upsert: find existing log for this token+date or create new one
            Optional<VisitorLog> existing = visitorLogRepository.findByVisitorTokenAndVisitDate(visitorToken, today);
            if (existing.isPresent()) {
                VisitorLog log = existing.get();
                log.setVisitCount(log.getVisitCount() + 1);
                log.setLastSeen(now);
                visitorLogRepository.save(log);
            } else {
                VisitorLog log = new VisitorLog();
                log.setVisitorToken(visitorToken);
                log.setVisitDate(today);
                log.setVisitCount(1);
                log.setFirstSeen(now);
                log.setLastSeen(now);
                // Best-effort IP extraction
                String ip = request.getHeader("X-Forwarded-For");
                if (ip == null || ip.isBlank()) ip = request.getRemoteAddr();
                if (ip != null && ip.length() > 64) ip = ip.substring(0, 64);
                log.setIpAddress(ip);
                String ua = request.getHeader("User-Agent");
                if (ua != null && ua.length() > 512) ua = ua.substring(0, 512);
                log.setUserAgent(ua);
                visitorLogRepository.save(log);
            }

            return ResponseEntity.ok(Map.of("status", "tracked"));
        } catch (Exception e) {
            logger.error("Error tracking visitor: {}", e.getMessage(), e);
            // Never fail the frontend for a tracking call
            return ResponseEntity.ok(Map.of("status", "error", "message", e.getMessage()));
        }
    }

    /**
     * Returns total unique visitors (all time) and today's unique visitors.
     */
    @GetMapping("/visitors")
    public ResponseEntity<Map<String, Object>> visitors() {
        long totalVisitors = visitorLogRepository.countDistinctVisitors();
        long todayVisitors = visitorLogRepository.countDistinctVisitorsByDate(LocalDate.now());
        Map<String, Object> resp = new HashMap<>();
        resp.put("totalVisitors", totalVisitors);
        resp.put("todayVisitors", todayVisitors);
        return ResponseEntity.ok(resp);
    }

    @GetMapping("/overview")
    @Transactional(readOnly = true)
    public ResponseEntity<Map<String, Object>> overview() {
        // Only count ACTIVE jobs for accurate statistics
        List<Job> allJobs = jobRepository.findAll().stream()
            .filter(j -> j.getStatus() == Job.JobStatus.ACTIVE)
            .collect(Collectors.toList());
        long totalJobs = allJobs.size();
        
        long totalUsers = userRepository.count();
        long totalEmployers = employerRepository.count();
        
        long totalApplications = allJobs.stream()
            .mapToLong(j -> Optional.ofNullable(j.getApplicationsCount()).orElse(0))
            .sum();
        
        // Calculate total views across all jobs
        long totalViews = allJobs.stream()
            .mapToLong(j -> Optional.ofNullable(j.getViews()).orElse(0))
            .sum();
        
        // Calculate overall conversion rate (applications / views * 100)
        double conversionRate = totalViews > 0 ? (totalApplications * 100.0 / totalViews) : 0.0;
        conversionRate = Math.round(conversionRate * 10.0) / 10.0; // Round to 1 decimal
        
        // Calculate average response time from applications
        // Response time = time between appliedDate and first status change (updatedAt)
        List<Application> allApplications = applicationRepository.findAll();
        double avgResponseDays = 0.0;
        if (!allApplications.isEmpty()) {
            long totalResponseHours = 0;
            int countWithResponse = 0;
            for (Application app : allApplications) {
                // Only count applications that have been processed (status changed from APPLIED)
                if (app.getStatus() != Application.ApplicationStatus.APPLIED && 
                    app.getAppliedDate() != null && app.getUpdatedAt() != null) {
                    long hours = ChronoUnit.HOURS.between(app.getAppliedDate(), app.getUpdatedAt());
                    if (hours >= 0) {
                        totalResponseHours += hours;
                        countWithResponse++;
                    }
                }
            }
            if (countWithResponse > 0) {
                avgResponseDays = (totalResponseHours / 24.0) / countWithResponse;
                avgResponseDays = Math.round(avgResponseDays * 10.0) / 10.0; // Round to 1 decimal
            }
        }
        
        // Calculate growth percentages (compare this month vs last month)
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime startOfThisMonth = now.withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0);
        LocalDateTime startOfLastMonth = startOfThisMonth.minusMonths(1);
        
        // Jobs growth (using createdAt)
        long jobsThisMonth = allJobs.stream()
            .filter(j -> j.getCreatedAt() != null && j.getCreatedAt().isAfter(startOfThisMonth))
            .count();
        long jobsLastMonth = allJobs.stream()
            .filter(j -> j.getCreatedAt() != null && 
                        j.getCreatedAt().isAfter(startOfLastMonth) && 
                        j.getCreatedAt().isBefore(startOfThisMonth))
            .count();
        double jobsGrowth = jobsLastMonth > 0 ? ((jobsThisMonth - jobsLastMonth) * 100.0 / jobsLastMonth) : (jobsThisMonth > 0 ? 100.0 : 0.0);
        jobsGrowth = Math.round(jobsGrowth * 10.0) / 10.0;
        
        // Applications growth
        long appsThisMonth = allApplications.stream()
            .filter(a -> a.getAppliedDate() != null && a.getAppliedDate().isAfter(startOfThisMonth))
            .count();
        long appsLastMonth = allApplications.stream()
            .filter(a -> a.getAppliedDate() != null && 
                        a.getAppliedDate().isAfter(startOfLastMonth) && 
                        a.getAppliedDate().isBefore(startOfThisMonth))
            .count();
        double appsGrowth = appsLastMonth > 0 ? ((appsThisMonth - appsLastMonth) * 100.0 / appsLastMonth) : (appsThisMonth > 0 ? 100.0 : 0.0);
        appsGrowth = Math.round(appsGrowth * 10.0) / 10.0;
        
        // Users growth (using createdAt from User entity)
        List<com.medexjob.entity.User> allUsers = userRepository.findAll();
        long usersThisMonth = allUsers.stream()
            .filter(u -> u.getCreatedAt() != null && u.getCreatedAt().isAfter(startOfThisMonth))
            .count();
        long usersLastMonth = allUsers.stream()
            .filter(u -> u.getCreatedAt() != null && 
                        u.getCreatedAt().isAfter(startOfLastMonth) && 
                        u.getCreatedAt().isBefore(startOfThisMonth))
            .count();
        double usersGrowth = usersLastMonth > 0 ? ((usersThisMonth - usersLastMonth) * 100.0 / usersLastMonth) : (usersThisMonth > 0 ? 100.0 : 0.0);
        usersGrowth = Math.round(usersGrowth * 10.0) / 10.0;
        
        // Employers growth
        List<com.medexjob.entity.Employer> allEmployersList = employerRepository.findAll();
        long employersThisMonth = allEmployersList.stream()
            .filter(e -> e.getCreatedAt() != null && e.getCreatedAt().isAfter(startOfThisMonth))
            .count();
        long employersLastMonth = allEmployersList.stream()
            .filter(e -> e.getCreatedAt() != null && 
                        e.getCreatedAt().isAfter(startOfLastMonth) && 
                        e.getCreatedAt().isBefore(startOfThisMonth))
            .count();
        double employersGrowth = employersLastMonth > 0 ? ((employersThisMonth - employersLastMonth) * 100.0 / employersLastMonth) : (employersThisMonth > 0 ? 100.0 : 0.0);
        employersGrowth = Math.round(employersGrowth * 10.0) / 10.0;
        
        // Visitor counts
        long totalVisitors = visitorLogRepository.countDistinctVisitors();
        long todayVisitors = visitorLogRepository.countDistinctVisitorsByDate(LocalDate.now());

        Map<String, Object> resp = new HashMap<>();
        resp.put("totalJobs", totalJobs);
        resp.put("totalApplications", totalApplications);
        resp.put("totalUsers", totalUsers);
        resp.put("totalEmployers", totalEmployers);
        resp.put("totalViews", totalViews);
        resp.put("conversionRate", conversionRate);
        resp.put("avgResponseDays", avgResponseDays);
        resp.put("jobsGrowth", jobsGrowth);
        resp.put("appsGrowth", appsGrowth);
        resp.put("usersGrowth", usersGrowth);
        resp.put("employersGrowth", employersGrowth);
        resp.put("totalVisitors", totalVisitors);
        resp.put("todayVisitors", todayVisitors);
        return ResponseEntity.ok(resp);
    }

    @GetMapping("/jobs-by-category")
    public ResponseEntity<List<Map<String, Object>>> jobsByCategory() {
        // Only count ACTIVE jobs
        List<Job> all = jobRepository.findAll().stream()
            .filter(j -> j.getStatus() == Job.JobStatus.ACTIVE)
            .collect(Collectors.toList());
        Map<String, long[]> agg = new HashMap<>(); // [0]=jobs, [1]=applications
        for (Job j : all) {
            String key = mapCategoryToLabel(j.getCategory());
            long[] arr = agg.computeIfAbsent(key, k -> new long[]{0, 0});
            arr[0] += 1;
            arr[1] += Optional.ofNullable(j.getApplicationsCount()).orElse(0);
        }
        List<Map<String, Object>> out = agg.entrySet().stream()
                .map(e -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("name", e.getKey());
                    m.put("value", e.getValue()[0]); // for Pie value
                    m.put("count", e.getValue()[0]);
                    return m;
                })
                .sorted(Comparator.comparing(m -> (String)m.get("name")))
                .collect(Collectors.toList());
        return ResponseEntity.ok(out);
    }

    @GetMapping("/jobs-by-location")
    public ResponseEntity<List<Map<String, Object>>> jobsByLocation() {
        // Only count ACTIVE jobs
        List<Job> all = jobRepository.findAll().stream()
            .filter(j -> j.getStatus() == Job.JobStatus.ACTIVE)
            .collect(Collectors.toList());
        Map<String, long[]> agg = new HashMap<>(); // [0]=jobs, [1]=applications
        for (Job j : all) {
            String key = Optional.ofNullable(j.getLocation()).orElse("Unknown");
            long[] arr = agg.computeIfAbsent(key, k -> new long[]{0, 0});
            arr[0] += 1;
            arr[1] += Optional.ofNullable(j.getApplicationsCount()).orElse(0);
        }
        List<Map<String, Object>> out = agg.entrySet().stream()
                .map(e -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("location", e.getKey());
                    m.put("jobs", e.getValue()[0]);
                    m.put("applications", e.getValue()[1]);
                    return m;
                })
                .sorted(Comparator.comparing(m -> ((String)m.get("location")).toLowerCase()))
                .collect(Collectors.toList());
        return ResponseEntity.ok(out);
    }

    @GetMapping("/top-jobs")
    public ResponseEntity<List<Map<String, Object>>> topJobs() {
        // Top by views
        List<Job> top = jobRepository.findTopViewedJobs(Job.JobStatus.ACTIVE, PageRequest.of(0, 5)).getContent();
        List<Map<String, Object>> out = top.stream().map(j -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("title", j.getTitle());
            m.put("views", j.getViews());
            m.put("applications", j.getApplicationsCount());
            // Simple derived conversion rate (applications/views * 100)
            double conv = j.getViews() > 0 ? (j.getApplicationsCount() * 100.0 / j.getViews()) : 0.0;
            m.put("conversion", Math.round(conv * 10.0) / 10.0);
            return m;
        }).collect(Collectors.toList());
        return ResponseEntity.ok(out);
    }

    @GetMapping("/recent-activity")
    @Transactional(readOnly = true)
    public ResponseEntity<List<Map<String, Object>>> recentActivity() {
        List<Map<String, Object>> activities = new ArrayList<>();
        LocalDateTime now = LocalDateTime.now();
        
        // Get recent applications (last 10)
        List<Application> recentApps = applicationRepository.findAll().stream()
            .filter(a -> a.getAppliedDate() != null)
            .sorted((a, b) -> b.getAppliedDate().compareTo(a.getAppliedDate()))
            .limit(5)
            .collect(Collectors.toList());
        
        for (Application app : recentApps) {
            Map<String, Object> activity = new LinkedHashMap<>();
            activity.put("type", "application");
            activity.put("action", "New application for " + (app.getJob() != null ? app.getJob().getTitle() : "Unknown Job"));
            activity.put("user", app.getCandidateName());
            activity.put("time", formatTimeAgo(app.getAppliedDate(), now));
            activity.put("timestamp", app.getAppliedDate().toString());
            activities.add(activity);
        }
        
        // Get recent jobs (last 5)
        List<Job> recentJobs = jobRepository.findAll().stream()
            .filter(j -> j.getCreatedAt() != null)
            .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
            .limit(5)
            .collect(Collectors.toList());
        
        for (Job job : recentJobs) {
            Map<String, Object> activity = new LinkedHashMap<>();
            activity.put("type", "job");
            activity.put("action", "New job posted: " + job.getTitle());
            String employerName = job.getEmployer() != null ? job.getEmployer().getCompanyName() : "Unknown";
            activity.put("user", employerName);
            activity.put("time", formatTimeAgo(job.getCreatedAt(), now));
            activity.put("timestamp", job.getCreatedAt().toString());
            activities.add(activity);
        }
        
        // Get recent user registrations (last 5)
        List<com.medexjob.entity.User> recentUsers = userRepository.findAll().stream()
            .filter(u -> u.getCreatedAt() != null)
            .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
            .limit(5)
            .collect(Collectors.toList());
        
        for (com.medexjob.entity.User user : recentUsers) {
            Map<String, Object> activity = new LinkedHashMap<>();
            activity.put("type", "user");
            activity.put("action", "New user registered: " + user.getName());
            activity.put("user", user.getEmail());
            activity.put("time", formatTimeAgo(user.getCreatedAt(), now));
            activity.put("timestamp", user.getCreatedAt().toString());
            activities.add(activity);
        }
        
        // Sort all activities by timestamp descending and limit to 10
        activities.sort((a, b) -> ((String) b.get("timestamp")).compareTo((String) a.get("timestamp")));
        List<Map<String, Object>> result = activities.stream().limit(10).collect(Collectors.toList());
        
        return ResponseEntity.ok(result);
    }
    
    @GetMapping("/user-trends")
    public ResponseEntity<List<Map<String, Object>>> userTrends() {
        // Get user registrations for the last 7 days
        LocalDate today = LocalDate.now();
        List<Map<String, Object>> trends = new ArrayList<>();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("MMM dd");
        
        List<com.medexjob.entity.User> allUsers = userRepository.findAll();
        
        for (int i = 6; i >= 0; i--) {
            LocalDate date = today.minusDays(i);
            LocalDateTime startOfDay = date.atStartOfDay();
            LocalDateTime endOfDay = date.plusDays(1).atStartOfDay();
            
            long usersOnDay = allUsers.stream()
                .filter(u -> u.getCreatedAt() != null && 
                            u.getCreatedAt().isAfter(startOfDay) && 
                            u.getCreatedAt().isBefore(endOfDay))
                .count();
            
            Map<String, Object> dayData = new LinkedHashMap<>();
            dayData.put("date", date.format(formatter));
            dayData.put("users", usersOnDay);
            trends.add(dayData);
        }
        
        return ResponseEntity.ok(trends);
    }
    
    private String formatTimeAgo(LocalDateTime dateTime, LocalDateTime now) {
        long minutes = ChronoUnit.MINUTES.between(dateTime, now);
        if (minutes < 1) return "Just now";
        if (minutes < 60) return minutes + " min ago";
        
        long hours = ChronoUnit.HOURS.between(dateTime, now);
        if (hours < 24) return hours + " hr ago";
        
        long days = ChronoUnit.DAYS.between(dateTime, now);
        if (days < 7) return days + " day" + (days > 1 ? "s" : "") + " ago";
        
        return dateTime.format(DateTimeFormatter.ofPattern("MMM dd"));
    }

    private String mapCategoryToLabel(Job.JobCategory c) {
        if (c == null) return "Unknown";
        return switch (c) {
            case JUNIOR_RESIDENT -> "Junior Resident";
            case SENIOR_RESIDENT -> "Senior Resident";
            case MEDICAL_OFFICER -> "Medical Officer";
            case FACULTY -> "Faculty";
            case SPECIALIST -> "Specialist";
            case DENTAL -> "Dental";
            case AYUSH -> "AYUSH";
            case NURSING -> "Nursing";
            case PARAMEDICAL -> "Paramedical";
            case PARAMEDICAL_NURSING -> "Paramedical / Nursing";
            case ALLIED_HEALTH -> "Allied Health";
            case PHARMACY -> "Pharmacy";
            case PSYCHOLOGY_MENTAL_HEALTH -> "Psychology & Mental Health";
            case NUTRITION_DIETETICS -> "Nutrition & Dietetics";
            case LIFE_SCIENCE_RESEARCH -> "Life Science & Research";
            case HOSPITAL_ADMINISTRATION -> "Hospital Administration";
            case PUBLIC_HEALTH -> "Public Health";
        };
    }
}
