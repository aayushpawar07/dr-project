package com.medexjob.service;

import com.medexjob.dto.recruitment.RecruitmentExtractionResult;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Optional;

/**
 * Gemini-only extraction path used by the admin bulk recruitment uploader.
 *
 * This intentionally does not invoke the legacy heuristic/table parser. The PDF
 * is converted to text (or OCR text for scanned documents) and the structured
 * result must come from the configured Gemini/OpenAI-compatible AI endpoint.
 */
@Service
public class BulkGeminiRecruitmentExtractionService {
    private static final int MIN_EXTRACTABLE_CHARS = 50;
    private static final int NATIVE_TEXT_SPARSE_THRESHOLD = 250;

    private final RecruitmentAiExtractionClient aiClient;
    private final RecruitmentOcrService ocrService;

    public BulkGeminiRecruitmentExtractionService(
            RecruitmentAiExtractionClient aiClient,
            RecruitmentOcrService ocrService
    ) {
        this.aiClient = aiClient;
        this.ocrService = ocrService;
    }

    public RecruitmentExtractionService.ExtractionPayload extract(MultipartFile file) throws IOException {
        validatePdf(file);
        byte[] bytes = file.getBytes();
        validatePdfSignature(bytes);
        String fingerprint = sha256(bytes);

        try (PDDocument document = Loader.loadPDF(bytes)) {
            String nativeText = extractText(document);
            boolean nativeTextSparse = nonWhitespaceLength(nativeText) < NATIVE_TEXT_SPARSE_THRESHOLD;
            Optional<String> ocrText = nativeTextSparse ? ocrService.extract(document) : Optional.empty();
            String extractionText = ocrText.orElse(nativeText);
            boolean usedOcr = ocrText.isPresent();

            if (nonWhitespaceLength(extractionText) < MIN_EXTRACTABLE_CHARS) {
                throw new IllegalArgumentException(
                        "Unable to read enough text from this PDF for Gemini extraction. " +
                        "Use a text-based PDF or enable OCR for scanned notifications."
                );
            }

            RecruitmentExtractionResult result = aiClient.extract(extractionText)
                    .orElseThrow(() -> new IllegalStateException(
                            "Gemini extraction failed or is not configured. Verify MEDEX_AI_ENABLED, " +
                            "MEDEX_AI_API_KEY, MEDEX_AI_CHAT_COMPLETIONS_URL and MEDEX_AI_MODEL, then retry."
                    ));

            if (result.getRecruitment() == null) {
                result.setRecruitment(new RecruitmentExtractionResult.RecruitmentData());
            }
            if (result.getVacancies() == null) {
                result.setVacancies(new java.util.ArrayList<>());
            }

            result.setExtractionMethod(usedOcr ? "GEMINI_OCR" : "GEMINI");
            return new RecruitmentExtractionService.ExtractionPayload(
                    result,
                    fingerprint,
                    file.getOriginalFilename()
            );
        }
    }

    private String extractText(PDDocument document) throws IOException {
        PDFTextStripper stripper = new PDFTextStripper();
        stripper.setSortByPosition(true);
        stripper.setStartPage(1);
        stripper.setEndPage(document.getNumberOfPages());
        return stripper.getText(document);
    }

    private void validatePdf(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("PDF file is required");
        }
        if (file.getSize() > 20L * 1024 * 1024) {
            throw new IllegalArgumentException("PDF must be 20 MB or smaller");
        }

        String name = Optional.ofNullable(file.getOriginalFilename())
                .orElse("")
                .toLowerCase(Locale.ROOT);
        String type = Optional.ofNullable(file.getContentType()).orElse("");
        if (!name.endsWith(".pdf") && !type.equalsIgnoreCase("application/pdf")) {
            throw new IllegalArgumentException("Only PDF files are supported in the bulk uploader");
        }
    }

    private void validatePdfSignature(byte[] bytes) {
        if (bytes.length < 5 || bytes[0] != '%' || bytes[1] != 'P' || bytes[2] != 'D' || bytes[3] != 'F') {
            throw new IllegalArgumentException("File is not a valid PDF");
        }
    }

    private int nonWhitespaceLength(String value) {
        return value == null ? 0 : value.replaceAll("\\s", "").length();
    }

    private String sha256(byte[] data) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(data);
            return HexFormat.of().formatHex(digest);
        } catch (Exception ex) {
            throw new IllegalStateException("Unable to fingerprint PDF", ex);
        }
    }
}
