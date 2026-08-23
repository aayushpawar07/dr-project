package com.medexjob.service;

import com.medexjob.dto.recruitment.RecruitmentExtractionResult;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.security.MessageDigest;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class RecruitmentExtractionService {
    private static final String[] POSTS = {"Professor", "Additional Professor", "Associate Professor", "Assistant Professor"};
    private static final String[] CATEGORIES = {"EWS", "UR", "OBC", "SC", "ST"};
    private static final Pattern NUMBER_BLOCK = Pattern.compile("((?:\\d+\\s+){20}\\d+)\\s*$");
    private static final Pattern ROW_PREFIX = Pattern.compile("^\\s*(\\d{1,2})\\s+(.+)$");

    private final RecruitmentAiExtractionClient aiClient;
    private final RecruitmentOcrService ocrService;

    public RecruitmentExtractionService(RecruitmentAiExtractionClient aiClient, RecruitmentOcrService ocrService) {
        this.aiClient = aiClient;
        this.ocrService = ocrService;
    }

    public ExtractionPayload extract(MultipartFile file) throws IOException {
        validatePdf(file);
        byte[] bytes = file.getBytes();
        if (bytes.length < 5 || bytes[0] != '%' || bytes[1] != 'P' || bytes[2] != 'D' || bytes[3] != 'F') {
            throw new IllegalArgumentException("File is not a valid PDF");
        }
        String fingerprint = sha256(bytes);

        try (PDDocument document = Loader.loadPDF(bytes)) {
            String nativeText = text(document, 1, document.getNumberOfPages());
            boolean nativeTextSparse = nonWhitespaceLength(nativeText) < 250;
            Optional<String> ocrText = nativeTextSparse ? ocrService.extract(document) : Optional.empty();
            String extractionText = ocrText.orElse(nativeText);
            boolean usedOcr = ocrText.isPresent();

            Optional<RecruitmentExtractionResult> ai = nonWhitespaceLength(extractionText) >= 50
                    ? aiClient.extract(extractionText)
                    : Optional.empty();
            RecruitmentExtractionResult result = ai.orElseGet(() -> heuristic(document, extractionText, usedOcr, nativeTextSparse));
            if (ai.isPresent()) {
                result.setExtractionMethod(usedOcr ? "AI_OCR" : "AI");
            } else if (usedOcr) {
                result.setExtractionMethod("OCR_HEURISTIC");
            } else if (nativeTextSparse) {
                result.setExtractionMethod("OCR_REQUIRED");
            } else if (result.getExtractionMethod() == null) {
                result.setExtractionMethod("HEURISTIC_PDF");
            }
            return new ExtractionPayload(result, fingerprint, file.getOriginalFilename());
        }
    }

    private RecruitmentExtractionResult heuristic(PDDocument document, String fullText, boolean usedOcr, boolean nativeTextSparse) {
        RecruitmentExtractionResult result = new RecruitmentExtractionResult();
        result.setExtractionMethod("HEURISTIC_PDF");
        RecruitmentExtractionResult.RecruitmentData recruitment = result.getRecruitment();

        String normalized = normalize(fullText);
        recruitment.setOrganisationName(extractOrganisation(fullText));
        recruitment.setAdvertisementNumber(group(fullText, "(?i)Advertisement\\s+No\\s*:\\s*(.+?)(?:\\s{2,}|\\n|Date\\s*:)", 1));
        recruitment.setTitle(extractSubject(fullText));
        recruitment.setOfficialWebsite(cleanUrl(group(fullText, "(?i)Website\\s*:\\s*(https?://\\S+)", 1)));
        recruitment.setSector(normalized.toLowerCase(Locale.ROOT).contains("government of india") || normalized.toLowerCase(Locale.ROOT).contains("govt. of india") ? "government" : "private");
        recruitment.setLocation(extractLocation(normalized));
        recruitment.setRecruitmentYear(extractYear(recruitment.getAdvertisementNumber(), normalized));
        recruitment.setApplicationLastDate(extractClosingDate(normalized));
        recruitment.setImportantInstructions(extractImportantInstructions(fullText));

        try {
            List<String> extractedPages = usedOcr ? splitOcrPages(fullText) : List.of();
            String page1 = usedOcr && !extractedPages.isEmpty() ? extractedPages.get(0) : text(document, 1, 1);
            parseVacancyMatrix(page1, result.getVacancies());
            if (document.getNumberOfPages() >= 2) {
                // The sub-speciality table uses multi-line cells. Content-stream order keeps
                // each logical row together better than visual-position sorting.
                String page2 = usedOcr && extractedPages.size() >= 2
                        ? extractedPages.get(1)
                        : text(document, 2, 2, false);
                enrichSubSpecialities(page2, result.getVacancies());
            }
        } catch (IOException ignored) {
            // Keep metadata-only result; admin review screen will surface missing rows.
        }

        int total = result.getVacancies().stream()
                .map(RecruitmentExtractionResult.VacancyData::getNumberOfVacancies)
                .filter(Objects::nonNull)
                .mapToInt(Integer::intValue)
                .sum();
        recruitment.setTotalVacancies(total > 0 ? total : extractTotalVacancies(normalized));
        return result;
    }

    private void parseVacancyMatrix(String pageText, List<RecruitmentExtractionResult.VacancyData> target) {
        for (String rawLine : pageText.split("\\R")) {
            String line = normalize(rawLine);
            Matcher prefix = ROW_PREFIX.matcher(line);
            if (!prefix.matches()) continue;

            String remainder = prefix.group(2);
            Matcher numbersMatcher = NUMBER_BLOCK.matcher(remainder);
            if (!numbersMatcher.find()) continue;

            String department = remainder.substring(0, numbersMatcher.start()).trim();
            String[] nums = numbersMatcher.group(1).trim().split("\\s+");
            if (department.isBlank() || nums.length != 21) continue;

            // The first 20 numbers are the 4 post x 5 category matrix; the
            // final number is the department total printed by the notification.
            // Reject malformed/OCR-corrupted rows instead of silently creating
            // incorrect vacancy records.
            int calculatedRowTotal = 0;
            for (int i = 0; i < POSTS.length * CATEGORIES.length; i++) {
                calculatedRowTotal += safeInt(nums[i]);
            }
            int declaredRowTotal = safeInt(nums[20]);
            if (declaredRowTotal <= 0 || calculatedRowTotal != declaredRowTotal) continue;

            for (int postIndex = 0; postIndex < POSTS.length; postIndex++) {
                for (int categoryIndex = 0; categoryIndex < CATEGORIES.length; categoryIndex++) {
                    int count = safeInt(nums[postIndex * 5 + categoryIndex]);
                    if (count <= 0) continue;
                    RecruitmentExtractionResult.VacancyData vacancy = new RecruitmentExtractionResult.VacancyData();
                    vacancy.setPostName(POSTS[postIndex]);
                    vacancy.setDepartment(department);
                    vacancy.setSpeciality(department);
                    vacancy.setNumberOfVacancies(count);
                    vacancy.setCategory(CATEGORIES[categoryIndex]);
                    vacancy.setJobType("Direct Recruitment");
                    vacancy.setConfidenceScore(0.94);
                    vacancy.setSourcePage(1);
                    target.add(vacancy);
                }
            }
        }
    }

    private void enrichSubSpecialities(String page2, List<RecruitmentExtractionResult.VacancyData> vacancies) {
        List<String> departments = vacancies.stream()
                .map(RecruitmentExtractionResult.VacancyData::getDepartment)
                .filter(Objects::nonNull)
                .distinct()
                .sorted(Comparator.comparingInt(String::length).reversed())
                .toList();

        List<String> rows = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        boolean inTable = false;
        int expectedRowNumber = 1;
        Pattern possibleRowStart = Pattern.compile("^(\\d{1,2})(?:\\s+.*)?$");
        for (String raw : page2.split("\\R")) {
            String line = normalizeDashes(normalize(raw));
            if (line.toLowerCase(Locale.ROOT).contains("sub-specialty reservation")) {
                inTable = true;
                continue;
            }
            if (!inTable || line.isBlank() || line.startsWith("Page ")) continue;

            Matcher rowStart = possibleRowStart.matcher(line);
            if (rowStart.matches() && safeInt(rowStart.group(1)) == expectedRowNumber) {
                if (!current.isEmpty()) rows.add(current.toString());
                current = new StringBuilder(line);
                expectedRowNumber++;
            } else if (!current.isEmpty()) {
                // Counts inside the "No. of Post" column can themselves be standalone
                // numbers, so only a sequential serial number starts a new row.
                current.append(' ').append(line);
            }
        }
        if (!current.isEmpty()) rows.add(current.toString());

        for (String row : rows) {
            applySubSpecialityRow(row, departments, vacancies);
        }
    }

    private void applySubSpecialityRow(String row, List<String> departments, List<RecruitmentExtractionResult.VacancyData> vacancies) {
        final String normalized = normalizeDashes(normalize(row))
                .replaceFirst("^\\d{1,2}\\s+", "");

        final String post = Arrays.stream(POSTS)
                .sorted(Comparator.comparingInt(String::length).reversed())
                .filter(p -> normalized.toLowerCase(Locale.ROOT).startsWith(p.toLowerCase(Locale.ROOT)))
                .findFirst()
                .orElse(null);
        if (post == null) return;

        final String remainderAfterPost = normalized.substring(post.length()).trim();

        final String department = departments.stream()
                .filter(d -> remainderAfterPost.toLowerCase(Locale.ROOT)
                        .startsWith(d.toLowerCase(Locale.ROOT)))
                .findFirst()
                .orElse(null);
        if (department == null) return;

        final String remainder = remainderAfterPost.substring(department.length()).trim();

        Matcher tail = Pattern.compile("(.+?)\\s+(\\d+)\\s+((?:EWS|UR|OBC|SC|ST)(?:-\\d+)?(?:\\s*,\\s*(?:EWS|UR|OBC|SC|ST)(?:-\\d+)?)*)$").matcher(remainder);
        if (!tail.find()) return;

        String speciality = tail.group(1).trim();
        int total = safeInt(tail.group(2));
        String categories = tail.group(3).replace(" ", "");
        Map<String, Integer> categoryCounts = parseCategoryCounts(categories, total);

        for (Map.Entry<String, Integer> entry : categoryCounts.entrySet()) {
            int subCount = entry.getValue();
            if (subCount <= 0) continue;
            RecruitmentExtractionResult.VacancyData base = vacancies.stream()
                    .filter(v -> equalsIgnoreCase(v.getPostName(), post))
                    .filter(v -> equalsIgnoreCase(v.getDepartment(), department))
                    .filter(v -> equalsIgnoreCase(v.getCategory(), entry.getKey()))
                    .filter(v -> v.getNumberOfVacancies() != null && v.getNumberOfVacancies() >= subCount)
                    .filter(v -> equalsIgnoreCase(v.getSpeciality(), department))
                    .findFirst().orElse(null);
            if (base == null) continue;

            if (base.getNumberOfVacancies() == subCount) {
                base.setSpeciality(speciality);
                base.setSubSpeciality(speciality);
                base.setConfidenceScore(0.96);
                base.setSourcePage(2);
            } else {
                base.setNumberOfVacancies(base.getNumberOfVacancies() - subCount);
                RecruitmentExtractionResult.VacancyData split = copyVacancy(base);
                split.setNumberOfVacancies(subCount);
                split.setSpeciality(speciality);
                split.setSubSpeciality(speciality);
                split.setConfidenceScore(0.96);
                split.setSourcePage(2);
                vacancies.add(split);
            }
        }
    }

    private RecruitmentExtractionResult.VacancyData copyVacancy(RecruitmentExtractionResult.VacancyData source) {
        RecruitmentExtractionResult.VacancyData v = new RecruitmentExtractionResult.VacancyData();
        v.setPostName(source.getPostName());
        v.setDepartment(source.getDepartment());
        v.setSpeciality(source.getSpeciality());
        v.setSubSpeciality(source.getSubSpeciality());
        v.setNumberOfVacancies(source.getNumberOfVacancies());
        v.setCategory(source.getCategory());
        v.setQualification(source.getQualification());
        v.setExperience(source.getExperience());
        v.setAgeLimit(source.getAgeLimit());
        v.setSalary(source.getSalary());
        v.setPayLevel(source.getPayLevel());
        v.setPayScale(source.getPayScale());
        v.setJobType(source.getJobType());
        v.setLocation(source.getLocation());
        v.setOtherEligibilityRequirements(source.getOtherEligibilityRequirements());
        v.setConfidenceScore(source.getConfidenceScore());
        v.setSourcePage(source.getSourcePage());
        return v;
    }

    private Map<String, Integer> parseCategoryCounts(String text, int total) {
        LinkedHashMap<String, Integer> counts = new LinkedHashMap<>();
        for (String part : text.split(",")) {
            Matcher m = Pattern.compile("(EWS|UR|OBC|SC|ST)(?:-(\\d+))?").matcher(part);
            if (m.matches()) counts.put(m.group(1), m.group(2) == null ? 1 : safeInt(m.group(2)));
        }
        if (counts.size() == 1 && counts.values().iterator().next() == 1 && total > 1 && !text.contains("-")) {
            String category = counts.keySet().iterator().next();
            counts.put(category, total);
        }
        return counts;
    }

    private List<String> splitOcrPages(String value) {
        if (value == null || value.isBlank()) return List.of();
        return Arrays.asList(value.split("\f", -1));
    }

    private int nonWhitespaceLength(String value) {
        return value == null ? 0 : value.replaceAll("\\s", "").length();
    }

    private String text(PDDocument document, int startPage, int endPage) throws IOException {
        return text(document, startPage, endPage, true);
    }

    private String text(PDDocument document, int startPage, int endPage, boolean sortByPosition) throws IOException {
        PDFTextStripper stripper = new PDFTextStripper();
        stripper.setSortByPosition(sortByPosition);
        stripper.setStartPage(startPage);
        stripper.setEndPage(endPage);
        return stripper.getText(document);
    }

    private void validatePdf(MultipartFile file) {
        if (file == null || file.isEmpty()) throw new IllegalArgumentException("PDF file is required");
        if (file.getSize() > 20L * 1024 * 1024) throw new IllegalArgumentException("PDF must be 20 MB or smaller");
        String name = Optional.ofNullable(file.getOriginalFilename()).orElse("").toLowerCase(Locale.ROOT);
        String type = Optional.ofNullable(file.getContentType()).orElse("");
        if (!name.endsWith(".pdf") && !type.equalsIgnoreCase("application/pdf")) {
            throw new IllegalArgumentException("Only PDF files are supported in the current bulk uploader");
        }
    }

    private String sha256(byte[] data) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(data);
            return HexFormat.of().formatHex(digest);
        } catch (Exception e) {
            throw new IllegalStateException("Unable to fingerprint PDF", e);
        }
    }

    private String extractOrganisation(String text) {
        String matched = group(text, "(?im)^\\s*(ALL INDIA INSTITUTE OF MEDICAL SCIENCES,\\s*JODHPUR)\\s*$", 1);
        if (matched != null) return titleCaseOrganisation(matched);
        String first = Arrays.stream(text.split("\\R")).map(String::trim).filter(s -> !s.isBlank()).findFirst().orElse("Unknown Organisation");
        return first.length() > 250 ? first.substring(0, 250) : first;
    }

    private String titleCaseOrganisation(String value) {
        if (value.equals(value.toUpperCase(Locale.ROOT))) {
            return Arrays.stream(value.toLowerCase(Locale.ROOT).split("\\s+"))
                    .map(w -> w.isBlank() ? w : Character.toUpperCase(w.charAt(0)) + w.substring(1))
                    .reduce((a, b) -> a + " " + b).orElse(value);
        }
        return value;
    }

    private String extractSubject(String text) {
        Matcher m = Pattern.compile("(?is)Subject\\s*:\\s*(.+?)(?=\\n\\s*(?:All India Institute|Online applications|Sr\\.))").matcher(text);
        if (m.find()) return normalize(m.group(1));
        return "Recruitment Notification";
    }

    private String extractLocation(String normalized) {
        Matcher m = Pattern.compile("(?i)Jodhpur\\s*\\(Rajasthan\\)").matcher(normalized);
        if (m.find()) return "Jodhpur, Rajasthan";
        if (normalized.toLowerCase(Locale.ROOT).contains("jodhpur")) return "Jodhpur, Rajasthan";
        return "India";
    }

    private Integer extractYear(String advertisement, String text) {
        String source = (advertisement == null ? "" : advertisement) + " " + text;
        Matcher m = Pattern.compile("\\b(20\\d{2})\\b").matcher(source);
        return m.find() ? safeInt(m.group(1)) : LocalDate.now().getYear();
    }

    private String extractClosingDate(String text) {
        Matcher m = Pattern.compile("(?i)closing date.*?(\\d{1,2}(?:st|nd|rd|th)?\\s+[A-Za-z]+,?\\s+20\\d{2})").matcher(text);
        if (!m.find()) return null;
        String raw = m.group(1).replaceAll("(?i)(\\d{1,2})(st|nd|rd|th)", "$1").replace(",", "").trim();
        for (String pattern : List.of("d MMMM yyyy", "dd MMMM yyyy")) {
            try { return LocalDate.parse(raw, DateTimeFormatter.ofPattern(pattern, Locale.ENGLISH)).toString(); }
            catch (DateTimeParseException ignored) { }
        }
        return null;
    }

    private String extractImportantInstructions(String text) {
        Matcher m = Pattern.compile("(?is)Note\\s*:\\s*-(.+?)(?=Qualification for the Posts|Page\\s+3)").matcher(text);
        if (m.find()) {
            String note = normalize(m.group(1));
            return note.length() > 5000 ? note.substring(0, 5000) : note;
        }
        return null;
    }

    private int extractTotalVacancies(String text) {
        Matcher m = Pattern.compile("(?i)TOTAL(?:\\s+\\d+){1,25}\\s+(\\d{2,4})").matcher(text);
        int last = 0;
        while (m.find()) last = safeInt(m.group(1));
        return last;
    }

    private String cleanUrl(String value) {
        return value == null ? null : value.replaceAll("[.,;]+$", "");
    }

    private String group(String input, String regex, int group) {
        Matcher m = Pattern.compile(regex).matcher(input);
        return m.find() ? normalize(m.group(group)) : null;
    }

    private String normalize(String value) {
        return value == null ? "" : value.replace('\u00A0', ' ').replaceAll("\\s+", " ").trim();
    }

    private String normalizeDashes(String value) {
        return value.replace('‐', '-').replace('–', '-').replace('—', '-').replace('‑', '-');
    }

    private int safeInt(String value) {
        try { return Integer.parseInt(value.trim()); } catch (Exception ignored) { return 0; }
    }

    private boolean equalsIgnoreCase(String a, String b) {
        return a != null && b != null && a.equalsIgnoreCase(b);
    }

    public record ExtractionPayload(RecruitmentExtractionResult result, String fingerprint, String sourceFileName) {}
}