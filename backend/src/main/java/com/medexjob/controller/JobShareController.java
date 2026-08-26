package com.medexjob.controller;

import com.medexjob.entity.Job;
import com.medexjob.repository.JobRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

/**
 * Serves server-side HTML with OpenGraph / Twitter Card meta tags for job share URLs.
 *
 * Social media crawlers (WhatsApp, Facebook, LinkedIn, Twitter/X) do NOT execute
 * JavaScript, so the React SPA cannot inject OG tags dynamically. Instead, we serve
 * a thin server-rendered HTML page at /share/job/{id} that:
 *  1. Contains all OG + Twitter meta tags with real job data.
 *  2. Immediately redirects human browsers to the actual React job detail page.
 *
 * The frontend's share buttons must point to /share/job/{id} (this endpoint).
 */
@RestController
@RequestMapping("/share")
public class JobShareController {

    private static final Logger logger = LoggerFactory.getLogger(JobShareController.class);

    private final JobRepository jobRepository;

    /** Base URL for absolute links in OG tags. Defaults to https://medexjob.com in prod. */
    @Value("${file.base-url:http://localhost:8081}")
    private String baseUrl;

    /** Default OG image used when a job has no image. */
    private static final String DEFAULT_IMAGE = "https://medexjob.com/og-default.png";

    public JobShareController(JobRepository jobRepository) {
        this.jobRepository = jobRepository;
    }

    /**
     * GET /share/job/{id}
     * Returns server-rendered HTML with dynamic OpenGraph and Twitter Card meta tags.
     * Human browsers are immediately redirected to the SPA job detail page.
     */
    @GetMapping(value = "/job/{id}", produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> shareJob(@PathVariable("id") String id) {
        try {
            Optional<Job> optJob = jobRepository.findById(
                    java.util.UUID.fromString(id));

            if (optJob.isEmpty()) {
                return fallbackRedirect(id);
            }

            Job job = optJob.get();

            // Sanitize / build values
            String title   = escapeHtml(job.getTitle() != null ? job.getTitle() : "Medical Job on MedExJob");
            String org     = escapeHtml(job.getOrganization() != null ? job.getOrganization() : "");
            String loc     = escapeHtml(job.getLocation() != null ? job.getLocation() : "India");
            String desc    = buildDescription(job, org, loc);
            String image   = buildImageUrl(job);
            String pageUrl = baseUrl + "/job/" + id;

            String ogTitle = org.isEmpty() ? title : title + " – " + org;

            String html = buildHtml(ogTitle, desc, image, pageUrl, title);

            return ResponseEntity.ok()
                    .contentType(MediaType.TEXT_HTML)
                    .body(html);

        } catch (IllegalArgumentException e) {
            // id was not a valid UUID — just redirect
            logger.warn("Invalid UUID in share link: {}", id);
            return fallbackRedirect(id);
        } catch (Exception e) {
            logger.error("Error serving share page for job {}: {}", id, e.getMessage(), e);
            return fallbackRedirect(id);
        }
    }

    // ────────────────────────────────────────────────────────────────────────────
    // Helpers
    // ────────────────────────────────────────────────────────────────────────────

    private String buildDescription(Job job, String org, String loc) {
        StringBuilder sb = new StringBuilder();
        if (job.getCategory() != null) {
            sb.append(job.getCategory().toString().replace('_', ' ')).append(" position");
        } else {
            sb.append("Medical job opening");
        }
        if (!org.isEmpty()) sb.append(" at ").append(org);
        if (job.getNumberOfPosts() != null && job.getNumberOfPosts() > 0) {
            sb.append(". ").append(job.getNumberOfPosts()).append(" post(s)");
        }
        sb.append(" in ").append(loc).append(". Apply on MedExJob.com.");
        return escapeHtml(sb.toString());
    }

    private String buildImageUrl(Job job) {
        if (job.getJobImageUrl() != null && !job.getJobImageUrl().isBlank()) {
            String img = job.getJobImageUrl().trim();
            // If relative URL, make it absolute
            if (!img.startsWith("http")) {
                img = baseUrl + (img.startsWith("/") ? img : "/" + img);
            }
            return escapeHtml(img);
        }
        return DEFAULT_IMAGE;
    }

    private ResponseEntity<String> fallbackRedirect(String id) {
        String redirectUrl = baseUrl + "/job/" + id;
        String html = "<html><head><meta http-equiv='refresh' content='0;url=" +
                escapeHtml(redirectUrl) + "'></head><body></body></html>";
        return ResponseEntity.ok()
                .contentType(MediaType.TEXT_HTML)
                .body(html);
    }

    /**
     * Builds the complete server-rendered HTML page with OG + Twitter meta tags.
     */
    private String buildHtml(String ogTitle, String description, String image,
                             String pageUrl, String displayTitle) {
        return "<!DOCTYPE html>\n" +
               "<html lang=\"en\">\n" +
               "<head>\n" +
               "  <meta charset=\"UTF-8\" />\n" +
               "  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />\n" +
               "  <title>" + ogTitle + " | MedExJob.com</title>\n" +
               "\n" +
               "  <!-- Open Graph -->\n" +
               "  <meta property=\"og:type\"        content=\"website\" />\n" +
               "  <meta property=\"og:site_name\"   content=\"MedExJob.com\" />\n" +
               "  <meta property=\"og:url\"         content=\"" + escapeHtml(pageUrl) + "\" />\n" +
               "  <meta property=\"og:title\"       content=\"" + ogTitle + "\" />\n" +
               "  <meta property=\"og:description\" content=\"" + description + "\" />\n" +
               "  <meta property=\"og:image\"       content=\"" + image + "\" />\n" +
               "  <meta property=\"og:image:width\"  content=\"1200\" />\n" +
               "  <meta property=\"og:image:height\" content=\"630\" />\n" +
               "\n" +
               "  <!-- Twitter / X Card -->\n" +
               "  <meta name=\"twitter:card\"        content=\"summary_large_image\" />\n" +
               "  <meta name=\"twitter:site\"        content=\"@medexjob\" />\n" +
               "  <meta name=\"twitter:url\"         content=\"" + escapeHtml(pageUrl) + "\" />\n" +
               "  <meta name=\"twitter:title\"       content=\"" + ogTitle + "\" />\n" +
               "  <meta name=\"twitter:description\" content=\"" + description + "\" />\n" +
               "  <meta name=\"twitter:image\"       content=\"" + image + "\" />\n" +
               "\n" +
               "  <!-- SEO description -->\n" +
               "  <meta name=\"description\" content=\"" + description + "\" />\n" +
               "\n" +
               "  <!-- Redirect human browsers to the React SPA page immediately -->\n" +
               "  <script>window.location.replace('" + escapeJs(pageUrl) + "');</script>\n" +
               "</head>\n" +
               "<body>\n" +
               "  <p>Redirecting to <a href=\"" + escapeHtml(pageUrl) + "\">" +
               displayTitle + "</a>…</p>\n" +
               "</body>\n" +
               "</html>";
    }

    /** Escapes characters that are dangerous inside HTML attribute values. */
    private String escapeHtml(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }

    /** Escapes characters that are dangerous inside JS string literals. */
    private String escapeJs(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\")
                .replace("'", "\\'")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r");
    }
}
