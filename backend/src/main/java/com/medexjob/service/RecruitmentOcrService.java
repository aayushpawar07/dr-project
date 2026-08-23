package com.medexjob.service;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.ImageType;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Optional;
import java.util.concurrent.TimeUnit;

/**
 * Optional OCR fallback for image-only/scanned recruitment PDFs.
 *
 * It deliberately invokes the configured executable directly with ProcessBuilder
 * rather than through a shell, so uploaded filenames or OCR options cannot become
 * shell commands. OCR is disabled by default because the deployment host must have
 * Tesseract installed and operationally approved.
 */
@Component
public class RecruitmentOcrService {
    private static final Logger log = LoggerFactory.getLogger(RecruitmentOcrService.class);
    private static final int MAX_OCR_CHARS = 500_000;

    private final boolean enabled;
    private final String command;
    private final String language;
    private final int maxPages;
    private final float dpi;
    private final int pageTimeoutSeconds;

    public RecruitmentOcrService(
            @Value("${medex.ocr.enabled:false}") boolean enabled,
            @Value("${medex.ocr.command:tesseract}") String command,
            @Value("${medex.ocr.language:eng}") String language,
            @Value("${medex.ocr.max-pages:50}") int maxPages,
            @Value("${medex.ocr.dpi:180}") float dpi,
            @Value("${medex.ocr.page-timeout-seconds:30}") int pageTimeoutSeconds
    ) {
        this.enabled = enabled;
        this.command = command;
        this.language = language;
        this.maxPages = Math.max(1, Math.min(maxPages, 100));
        this.dpi = Math.max(120, Math.min(dpi, 300));
        this.pageTimeoutSeconds = Math.max(5, Math.min(pageTimeoutSeconds, 120));
    }

    public Optional<String> extract(PDDocument document) {
        if (!enabled || command == null || command.isBlank()) {
            return Optional.empty();
        }

        int pages = Math.min(document.getNumberOfPages(), maxPages);
        if (pages <= 0) {
            return Optional.empty();
        }

        PDFRenderer renderer = new PDFRenderer(document);
        StringBuilder allText = new StringBuilder();
        for (int pageIndex = 0; pageIndex < pages; pageIndex++) {
            if (allText.length() >= MAX_OCR_CHARS) {
                break;
            }
            try {
                String pageText = ocrPage(renderer, pageIndex);
                if (!pageText.isBlank()) {
                    int remaining = MAX_OCR_CHARS - allText.length();
                    allText.append(pageText, 0, Math.min(pageText.length(), remaining));
                }
                allText.append('\f');
            } catch (Exception ex) {
                log.warn("OCR failed on recruitment PDF page {}: {}", pageIndex + 1, ex.getMessage());
                return Optional.empty();
            }
        }

        String result = allText.toString();
        return result.replaceAll("\\s", "").isEmpty() ? Optional.empty() : Optional.of(result);
    }

    private String ocrPage(PDFRenderer renderer, int pageIndex) throws IOException, InterruptedException {
        Path imageFile = Files.createTempFile("medex-recruitment-ocr-", ".png");
        Path outputFile = Files.createTempFile("medex-recruitment-ocr-", ".txt");
        try {
            BufferedImage image = renderer.renderImageWithDPI(pageIndex, dpi, ImageType.GRAY);
            if (!ImageIO.write(image, "png", imageFile.toFile())) {
                throw new IOException("Unable to encode page image for OCR");
            }

            ProcessBuilder builder = new ProcessBuilder(
                    command,
                    imageFile.toAbsolutePath().toString(),
                    "stdout",
                    "-l", language,
                    "--psm", "6"
            );
            builder.redirectOutput(outputFile.toFile());
            builder.redirectError(ProcessBuilder.Redirect.DISCARD);
            Process process = builder.start();
            boolean completed = process.waitFor(pageTimeoutSeconds, TimeUnit.SECONDS);
            if (!completed) {
                process.destroyForcibly();
                throw new IOException("OCR page timed out");
            }
            if (process.exitValue() != 0) {
                throw new IOException("OCR executable returned exit code " + process.exitValue());
            }
            return Files.readString(outputFile, StandardCharsets.UTF_8);
        } finally {
            Files.deleteIfExists(imageFile);
            Files.deleteIfExists(outputFile);
        }
    }
}
