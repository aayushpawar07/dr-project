package com.medexjob.service;

import com.medexjob.dto.recruitment.RecruitmentExtractionResult;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Job-template adapter around the existing recruitment PDF extraction pipeline.
 *
 * The core RecruitmentExtractionService remains the single place that handles
 * PDF validation, native text/OCR and DeepSeek-compatible AI extraction. This
 * adapter only normalises fields needed by the single-job template and adds
 * generic fallbacks for documents where deterministic extraction is used.
 */
@Service
public class JobTemplateExtractionService {
    private static final Pattern LABELED_LOCATION = Pattern.compile(
            "(?im)^(?:job\\s+location|place\\s+of\\s+posting|posting\\s+location|location\\s+of\\s+(?:post|posting)|work\\s+location|station)\\s*[:\\-]\\s*([^\\r\\n]{2,160})$"
    );

    private static final Pattern LABELED_DEADLINE = Pattern.compile(
            "(?i)(?:last\\s+date(?:\\s+to\\s+apply|\\s+for\\s+(?:application|submission))?|closing\\s+date|application\\s+deadline|apply\\s+before|last\\s+date\\s+of\\s+application)\\s*[:\\-]?\\s*(?:is\\s+)?" +
                    "(\\d{1,2}(?:st|nd|rd|th)?[\\s./-]+(?:[A-Za-z]{3,9}|\\d{1,2})[\\s,./-]+20\\d{2}|20\\d{2}-\\d{1,2}-\\d{1,2})"
    );

    private final RecruitmentExtractionService extractionService;

    public JobTemplateExtractionService(RecruitmentExtractionService extractionService) {
        this.extractionService = extractionService;
    }

    public RecruitmentExtractionService.ExtractionPayload extract(MultipartFile file) throws IOException {
        RecruitmentExtractionService.ExtractionPayload payload = extractionService.extract(file);
        RecruitmentExtractionResult result = payload.result();
        if (result == null) return payload;

        String sourceText = extractText(file);
        boolean aiExtraction = Optional.ofNullable(result.getExtractionMethod())
                .map(method -> method.startsWith("AI"))
                .orElse(false);

        RecruitmentExtractionResult.RecruitmentData recruitment = result.getRecruitment();
        if (recruitment != null) {
            String explicitLocation = extractLocation(sourceText);
            if (!isBlank(explicitLocation) && (!aiExtraction || isGenericLocation(recruitment.getLocation()))) {
                recruitment.setLocation(explicitLocation);
            } else if (!aiExtraction && isGenericLocation(recruitment.getLocation())) {
                // The historical deterministic parser used "India" when it did
                // not know the real location. An empty value is safer because it
                // tells the template that manual review is required.
                recruitment.setLocation(null);
            }

            String explicitDeadline = extractDeadline(sourceText);
            if (!isBlank(explicitDeadline) && (!aiExtraction || isBlank(recruitment.getApplicationLastDate()))) {
                recruitment.setApplicationLastDate(explicitDeadline);
            }
        }

        List<RecruitmentExtractionResult.VacancyData> vacancies = result.getVacancies();
        if (vacancies != null) {
            for (RecruitmentExtractionResult.VacancyData vacancy : vacancies) {
                if (vacancy == null) continue;
                if (vacancy.getNumberOfVacancies() != null && vacancy.getNumberOfVacancies() <= 0) {
                    vacancy.setNumberOfVacancies(null);
                }
                // Do not manufacture per-vacancy locations. DeepSeek keeps a
                // vacancy-specific location when the source provides one; the UI
                // falls back to the recruitment location only when appropriate.
            }
        }

        return payload;
    }

    private String extractText(MultipartFile file) {
        try (PDDocument document = Loader.loadPDF(file.getBytes())) {
            PDFTextStripper stripper = new PDFTextStripper();
            stripper.setSortByPosition(true);
            return stripper.getText(document);
        } catch (Exception ignored) {
            return "";
        }
    }

    private String extractLocation(String text) {
        if (isBlank(text)) return null;
        Matcher matcher = LABELED_LOCATION.matcher(text);
        if (!matcher.find()) return null;

        String value = matcher.group(1)
                .replaceAll("\\s{2,}", " ")
                .replaceAll("(?i)\\s+(?:qualification|experience|salary|pay|vacanc(?:y|ies)|number\\s+of\\s+posts)\\s*[:\\-].*$", "")
                .trim();
        return value.isBlank() ? null : value;
    }

    private String extractDeadline(String text) {
        if (isBlank(text)) return null;
        Matcher matcher = LABELED_DEADLINE.matcher(text);
        while (matcher.find()) {
            String parsed = parseDate(matcher.group(1));
            if (parsed != null) return parsed;
        }
        return null;
    }

    private String parseDate(String value) {
        if (isBlank(value)) return null;
        String raw = value.trim()
                .replaceAll("(?i)(\\d{1,2})(st|nd|rd|th)", "$1")
                .replace(",", "")
                .replaceAll("\\s+", " ");

        List<String> patterns = List.of(
                "yyyy-M-d",
                "d/M/yyyy",
                "dd/MM/yyyy",
                "d-M-yyyy",
                "dd-MM-yyyy",
                "d.M.yyyy",
                "dd.MM.yyyy",
                "d MMM yyyy",
                "dd MMM yyyy",
                "d MMMM yyyy",
                "dd MMMM yyyy"
        );

        for (String pattern : patterns) {
            try {
                return LocalDate.parse(raw, DateTimeFormatter.ofPattern(pattern, Locale.ENGLISH)).toString();
            } catch (DateTimeParseException ignored) {
                // Try the next supported notification date format.
            }
        }
        return null;
    }

    private boolean isGenericLocation(String value) {
        if (isBlank(value)) return true;
        String normalized = value.trim().toLowerCase(Locale.ROOT);
        return normalized.equals("india")
                || normalized.equals("pan india")
                || normalized.equals("multiple locations")
                || normalized.equals("not specified")
                || normalized.equals("unknown");
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
