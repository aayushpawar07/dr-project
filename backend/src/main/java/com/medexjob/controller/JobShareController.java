package com.medexjob.controller;

import com.medexjob.entity.Job;
import com.medexjob.entity.NewsUpdate;
import com.medexjob.repository.JobRepository;
import com.medexjob.repository.NewsUpdateRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

/**
 * Serves server-side HTML with OpenGraph / Twitter Card meta tags for job and news share URLs.
 *
 * Social crawlers do not execute the React app, so share URLs must expose their
 * metadata directly from the backend. Both /share and /api/share are supported;
 * /api/share works with the production Nginx proxy without an extra location rule.
 */
@RestController
@RequestMapping({"/share", "/api/share"})
public class JobShareController {

    private static final Logger logger = LoggerFactory.getLogger(JobShareController.class);

    private final JobRepository jobRepository;
    private final NewsUpdateRepository newsUpdateRepository;

    @Value("${file.base-url:http://localhost:8081}")
    private String baseUrl;

    private static final String DEFAULT_IMAGE = "https://medexjob.com/og-default.png";

    public JobShareController(JobRepository jobRepository, NewsUpdateRepository newsUpdateRepository) {
        this.jobRepository = jobRepository;
        this.newsUpdateRepository = newsUpdateRepository;
    }

    @GetMapping(value = "/job/{id}", produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> shareJob(@PathVariable("id") String id) {
        try {
            Optional<Job> optJob = jobRepository.findById(java.util.UUID.fromString(id));
            if (optJob.isEmpty()) {
                return fallbackRedirect(id);
            }

            Job job = optJob.get();
            String title = escapeHtml(job.getTitle() != null ? job.getTitle() : "Medical Job on MedExJob");
            String org = escapeHtml((job.getEmployer() != null && job.getEmployer().getCompanyName() != null)
                    ? job.getEmployer().getCompanyName() : "");
            String loc = escapeHtml(job.getLocation() != null ? job.getLocation() : "India");
            String desc = buildDescription(job, org, loc);
            String image = buildImageUrl(job);
            String pageUrl = baseUrl + "/job/" + id;
            String ogTitle = org.isEmpty() ? title : title + " – " + org;

            return ResponseEntity.ok()
                    .contentType(MediaType.TEXT_HTML)
                    .body(buildHtml(ogTitle, desc, image, pageUrl, title));
        } catch (IllegalArgumentException e) {
            logger.warn("Invalid UUID in share link: {}", id);
            return fallbackRedirect(id);
        } catch (Exception e) {
            logger.error("Error serving share page for job {}: {}", id, e.getMessage(), e);
            return fallbackRedirect(id);
        }
    }

    /**
     * Dynamic, text-first news preview. The card always uses the real article
     * title/content. A preview image is emitted only when the article itself has
     * one; the generic MedExJob logo is never substituted for news.
     */
    @GetMapping(value = "/news/{id}", produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> shareNews(@PathVariable("id") String id) {
        try {
            Optional<NewsUpdate> optNews = newsUpdateRepository.findById(java.util.UUID.fromString(id));
            if (optNews.isEmpty()) {
                return fallbackNewsRedirect(id);
            }

            NewsUpdate news = optNews.get();
            String rawTitle = news.getTitle() != null && !news.getTitle().isBlank()
                    ? news.getTitle().trim()
                    : "Medical News on MedExJob";
            String rawDescription = buildNewsDescription(news, rawTitle);
            String image = buildNewsImageUrl(news);
            String pageUrl = baseUrl + "/news/" + id;

            return ResponseEntity.ok()
                    .contentType(MediaType.TEXT_HTML)
                    .body(buildNewsHtml(rawTitle, rawDescription, image, pageUrl));
        } catch (Exception e) {
            logger.error("Error serving share page for news {}: {}", id, e.getMessage(), e);
            return fallbackNewsRedirect(id);
        }
    }

    private String buildNewsDescription(NewsUpdate news, String fallbackTitle) {
        String plain = plainText(news.getFullStory());
        if (plain.isBlank()) {
            plain = fallbackTitle;
        }
        return truncate(plain, 260);
    }

    private String buildNewsImageUrl(NewsUpdate news) {
        if (news.getImageUrl() == null || news.getImageUrl().isBlank()) {
            return "";
        }
        String image = news.getImageUrl().trim();
        if (!image.startsWith("http://") && !image.startsWith("https://")) {
            image = baseUrl + (image.startsWith("/") ? image : "/" + image);
        }
        return image;
    }

    private String plainText(String html) {
        if (html == null || html.isBlank()) return "";
        return html
                .replaceAll("(?is)<script[^>]*>.*?</script>", " ")
                .replaceAll("(?is)<style[^>]*>.*?</style>", " ")
                .replaceAll("(?s)<[^>]+>", " ")
                .replace("&nbsp;", " ")
                .replace("&amp;", "&")
                .replace("&quot;", "\"")
                .replace("&#39;", "'")
                .replace("&lt;", "<")
                .replace("&gt;", ">")
                .replaceAll("\\s+", " ")
                .trim();
    }

    private String truncate(String text, int maxLength) {
        if (text == null) return "";
        String clean = text.trim();
        if (clean.length() <= maxLength) return clean;
        int cut = clean.lastIndexOf(' ', maxLength - 1);
        if (cut < maxLength / 2) cut = maxLength - 1;
        return clean.substring(0, cut).trim() + "…";
    }

    private String buildNewsHtml(String title, String description, String image, String pageUrl) {
        String safeTitle = escapeHtml(title);
        String safeDescription = escapeHtml(description);
        String safePageUrl = escapeHtml(pageUrl);
        StringBuilder head = new StringBuilder();

        head.append("<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n")
                .append("  <meta charset=\"UTF-8\" />\n")
                .append("  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />\n")
                .append("  <title>").append(safeTitle).append(" | MedExJob News</title>\n")
                .append("  <meta name=\"description\" content=\"").append(safeDescription).append("\" />\n")
                .append("  <link rel=\"canonical\" href=\"").append(safePageUrl).append("\" />\n")
                .append("  <meta property=\"og:type\" content=\"article\" />\n")
                .append("  <meta property=\"og:site_name\" content=\"MedExJob\" />\n")
                .append("  <meta property=\"og:url\" content=\"").append(safePageUrl).append("\" />\n")
                .append("  <meta property=\"og:title\" content=\"").append(safeTitle).append("\" />\n")
                .append("  <meta property=\"og:description\" content=\"").append(safeDescription).append("\" />\n");

        if (image != null && !image.isBlank()) {
            String safeImage = escapeHtml(image);
            head.append("  <meta property=\"og:image\" content=\"").append(safeImage).append("\" />\n")
                    .append("  <meta name=\"twitter:card\" content=\"summary_large_image\" />\n")
                    .append("  <meta name=\"twitter:image\" content=\"").append(safeImage).append("\" />\n");
        } else {
            head.append("  <meta name=\"twitter:card\" content=\"summary\" />\n");
        }

        head.append("  <meta name=\"twitter:title\" content=\"").append(safeTitle).append("\" />\n")
                .append("  <meta name=\"twitter:description\" content=\"").append(safeDescription).append("\" />\n")
                .append("  <script>window.location.replace('").append(escapeJs(pageUrl)).append("');</script>\n")
                .append("</head>\n<body>\n")
                .append("  <article><h1>").append(safeTitle).append("</h1><p>").append(safeDescription).append("</p></article>\n")
                .append("</body>\n</html>");

        return head.toString();
    }

    private ResponseEntity<String> fallbackNewsRedirect(String id) {
        String redirectUrl = baseUrl + "/news/" + id;
        String html = "<html><head><meta http-equiv='refresh' content='0;url=" +
                escapeHtml(redirectUrl) + "'></head><body></body></html>";
        return ResponseEntity.ok().contentType(MediaType.TEXT_HTML).body(html);
    }

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
        return ResponseEntity.ok().contentType(MediaType.TEXT_HTML).body(html);
    }

    private String buildHtml(String ogTitle, String description, String image,
                             String pageUrl, String displayTitle) {
        return "<!DOCTYPE html>\n" +
               "<html lang=\"en\">\n" +
               "<head>\n" +
               "  <meta charset=\"UTF-8\" />\n" +
               "  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />\n" +
               "  <title>" + ogTitle + " | MedExJob.com</title>\n" +
               "  <meta property=\"og:type\" content=\"website\" />\n" +
               "  <meta property=\"og:site_name\" content=\"MedExJob.com\" />\n" +
               "  <meta property=\"og:url\" content=\"" + escapeHtml(pageUrl) + "\" />\n" +
               "  <meta property=\"og:title\" content=\"" + ogTitle + "\" />\n" +
               "  <meta property=\"og:description\" content=\"" + description + "\" />\n" +
               "  <meta property=\"og:image\" content=\"" + image + "\" />\n" +
               "  <meta property=\"og:image:width\" content=\"1200\" />\n" +
               "  <meta property=\"og:image:height\" content=\"630\" />\n" +
               "  <meta name=\"twitter:card\" content=\"summary_large_image\" />\n" +
               "  <meta name=\"twitter:url\" content=\"" + escapeHtml(pageUrl) + "\" />\n" +
               "  <meta name=\"twitter:title\" content=\"" + ogTitle + "\" />\n" +
               "  <meta name=\"twitter:description\" content=\"" + description + "\" />\n" +
               "  <meta name=\"twitter:image\" content=\"" + image + "\" />\n" +
               "  <meta name=\"description\" content=\"" + description + "\" />\n" +
               "  <script>window.location.replace('" + escapeJs(pageUrl) + "');</script>\n" +
               "</head>\n" +
               "<body>\n" +
               "  <p>Redirecting to <a href=\"" + escapeHtml(pageUrl) + "\">" + displayTitle + "</a>…</p>\n" +
               "</body>\n" +
               "</html>";
    }

    private String escapeHtml(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }

    private String escapeJs(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\")
                .replace("'", "\\'")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r");
    }
}
