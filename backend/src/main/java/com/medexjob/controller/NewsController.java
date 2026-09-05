// AI assisted development
package com.medexjob.controller;

import com.medexjob.entity.NewsUpdate;
import com.medexjob.repository.NewsUpdateRepository;
import com.medexjob.service.FileUploadService;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import jakarta.annotation.PostConstruct;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/news")
public class NewsController {

    private static final Logger logger = LoggerFactory.getLogger(NewsController.class);
    private final NewsUpdateRepository newsUpdateRepository;
    private final FileUploadService fileUploadService;

    public NewsController(NewsUpdateRepository newsUpdateRepository, FileUploadService fileUploadService) {
        this.newsUpdateRepository = newsUpdateRepository;
        this.fileUploadService = fileUploadService;
    }

    @PostConstruct
    public void seedData() {
        if (newsUpdateRepository.count() > 0) return;

        List<NewsUpdate> samples = Arrays.asList(
                new NewsUpdate("AIIMS Delhi opens senior resident positions in critical care", NewsUpdate.NewsType.GOVT, LocalDate.now().plusDays(5), true),
                new NewsUpdate("Fortis Bangalore hiring ICU nursing staff (night shift allowance)", NewsUpdate.NewsType.PRIVATE, LocalDate.now().plusDays(3), false),
                new NewsUpdate("NEET PG 2026 tentative schedule released", NewsUpdate.NewsType.EXAM, LocalDate.now().plusDays(12), true),
                new NewsUpdate("Rajasthan Health Services extends MO application deadline", NewsUpdate.NewsType.DEADLINE, LocalDate.now().plusDays(2), true),
                new NewsUpdate("Apollo Hospitals starts cardiology fellowship intake", NewsUpdate.NewsType.UPDATE, LocalDate.now().plusDays(7), false),
                new NewsUpdate("UP NHM announces 150 paramedical vacancies", NewsUpdate.NewsType.GOVT, LocalDate.now().plusDays(9), false),
                new NewsUpdate("Private multispecialty chain hiring 40 junior residents", NewsUpdate.NewsType.PRIVATE, LocalDate.now().plusDays(4), false),
                new NewsUpdate("AIIMS Rishikesh releases walk-in interview dates", NewsUpdate.NewsType.GOVT, LocalDate.now().plusDays(6), false),
                new NewsUpdate("JIPMER issues notice on document verification", NewsUpdate.NewsType.DEADLINE, LocalDate.now().plusDays(1), true),
                new NewsUpdate("NBEMS publishes exam city allocation FAQ", NewsUpdate.NewsType.EXAM, LocalDate.now().plusDays(8), false)
        );

        newsUpdateRepository.saveAll(samples);
    }

    @GetMapping("/pulse")
    public ResponseEntity<List<NewsUpdate>> getPulseUpdates() {
        List<NewsUpdate> updates = newsUpdateRepository.findTop10ByOrderByDateDescCreatedAtDesc();
        return ResponseEntity.ok(updates);
    }

    // Get homepage news (only news marked to show on homepage)
    @GetMapping("/homepage")
    public ResponseEntity<List<Map<String, Object>>> getHomepageNews() {
        List<NewsUpdate> updates = newsUpdateRepository.findByShowOnHomepageTrueOrderByDateDescCreatedAtDesc();
        List<Map<String, Object>> response = updates.stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    // Get single news by ID (for full story page)
    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getNewsById(@PathVariable("id") UUID id) {
        return newsUpdateRepository.findById(id)
                .map(news -> ResponseEntity.ok(toResponse(news)))
                .orElse(ResponseEntity.notFound().build());
    }

    // Admin: Get all news updates
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<Map<String, Object>>> getAllNews() {
        try {
            List<NewsUpdate> updates = newsUpdateRepository.findAll(Sort.by(Sort.Direction.DESC, "date", "createdAt"));
            List<Map<String, Object>> response = updates.stream()
                    .map(this::toResponse)
                    .collect(Collectors.toList());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Error fetching all news", e);
            return ResponseEntity.ok(Collections.emptyList());
        }
    }

    // Admin: Create News
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> create(@RequestBody NewsRequest req) {
        try {
            logger.info("Creating news with title: {}", req.title());
            logger.debug("News request: title={}, type={}, date={}, breaking={}, showOnHomepage={}, fullStory length={}", 
                req.title(), req.type(), req.date(), req.breaking(), req.showOnHomepage(), 
                req.fullStory() != null ? req.fullStory().length() : 0);
            
            if (req.title() == null || req.title().trim().isEmpty()) {
                logger.warn("News creation failed: Title is empty");
                Map<String, Object> error = new HashMap<>();
                error.put("error", "Title is required");
                error.put("message", "Title cannot be empty");
                return ResponseEntity.badRequest().body(error);
            }
            
            NewsUpdate news = new NewsUpdate();
            news.setTitle(req.title().trim());
            news.setType(parseNewsType(req.type()));
            news.setDate(parseDate(req.date()));
            news.setBreaking(Optional.ofNullable(req.breaking()).orElse(false));
            if (req.fullStory() != null && !req.fullStory().trim().isEmpty()) {
                news.setFullStory(req.fullStory().trim());
            } else {
                news.setFullStory(null);
            }
            // Ensure showOnHomepage is always set (not null)
            Boolean showOnHomepageValue = Optional.ofNullable(req.showOnHomepage()).orElse(false);
            news.setShowOnHomepage(showOnHomepageValue);
            NewsUpdate saved = newsUpdateRepository.save(news);
            logger.info("News created successfully with ID: {}", saved.getId());
            return ResponseEntity.ok(toResponse(saved));
        } catch (Exception e) {
            logger.error("Error creating news: {}", e.getMessage(), e);
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Failed to create news");
            error.put("message", e.getMessage());
            return ResponseEntity.internalServerError().body(error);
        }
    }

    // Admin: Update News
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> update(@PathVariable("id") UUID id, @RequestBody NewsRequest req) {
        return newsUpdateRepository.findById(id)
                .map(existing -> {
                    if (req.title() != null) existing.setTitle(req.title());
                    if (req.type() != null) existing.setType(parseNewsType(req.type()));
                    if (req.date() != null) existing.setDate(parseDate(req.date()));
                    if (req.breaking() != null) existing.setBreaking(req.breaking());
                    if (req.fullStory() != null) existing.setFullStory(req.fullStory());
                    if (req.showOnHomepage() != null) existing.setShowOnHomepage(req.showOnHomepage());
                    NewsUpdate saved = newsUpdateRepository.save(existing);
                    return ResponseEntity.ok(toResponse(saved));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // Admin: Delete News
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable("id") UUID id) {
        if (!newsUpdateRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        newsUpdateRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // Admin: Upload News Image
    @PostMapping("/{id}/image")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> uploadNewsImage(
            @PathVariable("id") UUID id,
            @RequestParam("image") MultipartFile image) {
        try {
            logger.info("Uploading image for news ID: {}", id);
            
            Optional<NewsUpdate> newsOpt = newsUpdateRepository.findById(id);
            if (newsOpt.isEmpty()) {
                Map<String, Object> error = new HashMap<>();
                error.put("error", "News not found");
                return ResponseEntity.notFound().build();
            }
            
            NewsUpdate news = newsOpt.get();
            
            // Upload image using FileUploadService (uploads to Hostinger FTP in 'news' subfolder)
            String imageUrl = fileUploadService.uploadFile(image, "news");
            
            // Save image URL to news
            news.setImageUrl(imageUrl);
            NewsUpdate saved = newsUpdateRepository.save(news);
            
            logger.info("Image uploaded successfully for news ID: {}, URL: {}", id, imageUrl);
            
            return ResponseEntity.ok(toResponse(saved));
        } catch (Exception e) {
            logger.error("Error uploading news image: {}", e.getMessage(), e);
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Failed to upload image");
            error.put("message", e.getMessage());
            return ResponseEntity.internalServerError().body(error);
        }
    }

    private NewsUpdate.NewsType parseNewsType(String type) {
        if (type == null || type.isBlank()) {
            return NewsUpdate.NewsType.UPDATE;
        }
        try {
            return NewsUpdate.NewsType.valueOf(type.toUpperCase());
        } catch (IllegalArgumentException e) {
            return NewsUpdate.NewsType.UPDATE;
        }
    }

    private LocalDate parseDate(String dateStr) {
        if (dateStr == null || dateStr.isBlank()) {
            return LocalDate.now();
        }
        try {
            return LocalDate.parse(dateStr);
        } catch (Exception e) {
            return LocalDate.now();
        }
    }

    private Map<String, Object> toResponse(NewsUpdate news) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", news.getId() != null ? news.getId().toString() : "");
        map.put("title", news.getTitle() != null ? news.getTitle() : "");
        map.put("type", news.getType() != null ? news.getType().name() : "UPDATE");
        map.put("date", news.getDate() != null ? news.getDate().toString() : LocalDate.now().toString());
        map.put("breaking", news.isBreaking());
        if (news.getFullStory() != null) {
            map.put("fullStory", news.getFullStory());
        }
        map.put("showOnHomepage", news.isShowOnHomepage());
        if (news.getImageUrl() != null) {
            map.put("imageUrl", news.getImageUrl());
        }
        if (news.getCreatedAt() != null) {
            map.put("createdAt", news.getCreatedAt().toString());
        }
        return map;
    }

    private record NewsRequest(
            String title,
            String type,
            String date,
            Boolean breaking,
            String fullStory,
            Boolean showOnHomepage
    ) {}
}
