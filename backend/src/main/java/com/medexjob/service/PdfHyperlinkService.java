package com.medexjob.service;

import jakarta.annotation.PostConstruct;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.apache.pdfbox.pdmodel.interactive.action.PDActionURI;
import org.apache.pdfbox.pdmodel.interactive.annotation.PDAnnotationLink;
import org.apache.pdfbox.pdmodel.interactive.annotation.PDBorderStyleDictionary;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;

/**
 * Automatically stamps a professional header/footer branding banner with MedExJob logo and a clickable
 * hyperlink to MedExJob.com onto uploaded job notification PDFs.
 */
@Service
public class PdfHyperlinkService {
    private static final Logger log = LoggerFactory.getLogger(PdfHyperlinkService.class);
    private static final String DEFAULT_WEBSITE_URL = "https://medexjob.com";

    private byte[] logoBytes;

    @PostConstruct
    public void init() {
        try (InputStream is = getClass().getResourceAsStream("/medex-logo.png")) {
            if (is != null) {
                this.logoBytes = is.readAllBytes();
                log.info("MedExJob logo loaded successfully for PDF stamping ({} bytes).", logoBytes.length);
            } else {
                log.warn("medex-logo.png not found in classpath root.");
            }
        } catch (Exception e) {
            log.warn("Failed to load medex-logo.png from classpath: {}", e.getMessage());
        }
    }

    /**
     * Stamped banner text, logo, and clickable URL annotation.
     */
    public byte[] addHyperlinkBanner(byte[] pdfBytes, String targetUrl) {
        if (pdfBytes == null || pdfBytes.length == 0) {
            return pdfBytes;
        }

        String effectiveUrl = (targetUrl != null && !targetUrl.isBlank()) ? targetUrl.trim() : DEFAULT_WEBSITE_URL;
        if (!effectiveUrl.startsWith("http://") && !effectiveUrl.startsWith("https://")) {
            effectiveUrl = "https://" + effectiveUrl;
        }

        try (PDDocument document = Loader.loadPDF(pdfBytes)) {
            if (document.isEncrypted()) {
                log.warn("Uploaded PDF is password-protected or encrypted; skipping hyperlink stamping.");
                return pdfBytes;
            }

            int pageCount = document.getNumberOfPages();
            if (pageCount == 0) {
                return pdfBytes;
            }

            PDImageXObject logoImage = null;
            if (logoBytes != null && logoBytes.length > 0) {
                try {
                    logoImage = PDImageXObject.createFromByteArray(document, logoBytes, "medex_logo");
                } catch (Exception e) {
                    log.warn("Could not create PDImageXObject from logo: {}", e.getMessage());
                }
            }

            PDType1Font boldFont = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
            PDType1Font regularFont = new PDType1Font(Standard14Fonts.FontName.HELVETICA);

            for (PDPage page : document.getPages()) {
                PDRectangle mediaBox = page.getMediaBox();
                if (mediaBox == null) continue;

                float width = mediaBox.getWidth();
                float bannerHeight = 24f;
                float bannerY = 8f; // Near the bottom edge
                float bannerX = 14f;
                float bannerWidth = Math.max(100f, width - 28f);

                // 1. Draw subtle banner background, logo and text
                try (PDPageContentStream cs = new PDPageContentStream(document, page, PDPageContentStream.AppendMode.APPEND, true, true)) {
                    // Soft light blue background bar (#eff6ff)
                    cs.setNonStrokingColor(0.941f, 0.969f, 1.0f);
                    cs.setStrokingColor(0.749f, 0.859f, 0.996f); // #bfdbfe
                    cs.setLineWidth(0.8f);
                    cs.addRect(bannerX, bannerY, bannerWidth, bannerHeight);
                    cs.fillAndStroke();

                    float currentX = bannerX + 8f;
                    float textY = bannerY + 7.5f;

                    // Draw Logo if available
                    if (logoImage != null) {
                        try {
                            float origW = logoImage.getWidth();
                            float origH = logoImage.getHeight();
                            float logoH = 18f;
                            float logoW = (origH > 0) ? (logoH * (origW / origH)) : 18f;
                            logoW = Math.min(logoW, 60f); // Keep in neat shape
                            float logoY = bannerY + (bannerHeight - logoH) / 2f;
                            cs.drawImage(logoImage, currentX, logoY, logoW, logoH);
                            currentX += logoW + 8f;
                        } catch (Exception logoDrawErr) {
                            log.debug("Logo draw skipped: {}", logoDrawErr.getMessage());
                        }
                    }

                    // Text: MedExJob Branding and Link (Notice: "Official" word removed)
                    String brandPrefix = "MedExJob.com";
                    String textMiddle = " — Medical Notification  |  View verified jobs at ";
                    String linkText = "https://medexjob.com";

                    float fontSize = 8.5f;

                    // Brand in bold blue (#1d4ed8)
                    cs.beginText();
                    cs.setFont(boldFont, fontSize);
                    cs.setNonStrokingColor(0.114f, 0.306f, 0.847f);
                    cs.newLineAtOffset(currentX, textY);
                    cs.showText(brandPrefix);
                    cs.endText();

                    float brandWidth = boldFont.getStringWidth(brandPrefix) / 1000f * fontSize;

                    // Middle text in dark gray (#334155)
                    cs.beginText();
                    cs.setFont(regularFont, fontSize);
                    cs.setNonStrokingColor(0.200f, 0.255f, 0.333f);
                    cs.newLineAtOffset(currentX + brandWidth, textY);
                    cs.showText(textMiddle);
                    cs.endText();

                    float middleWidth = regularFont.getStringWidth(textMiddle) / 1000f * fontSize;

                    // Link text in blue bold (#2563eb)
                    cs.beginText();
                    cs.setFont(boldFont, fontSize);
                    cs.setNonStrokingColor(0.145f, 0.388f, 0.922f);
                    cs.newLineAtOffset(currentX + brandWidth + middleWidth, textY);
                    cs.showText(linkText);
                    cs.endText();
                }

                // 2. Add clickable hyperlink annotation covering the banner
                PDRectangle linkRect = new PDRectangle(bannerX, bannerY, bannerWidth, bannerHeight);
                PDAnnotationLink link = new PDAnnotationLink();
                link.setRectangle(linkRect);

                PDActionURI uriAction = new PDActionURI();
                uriAction.setURI(effectiveUrl);
                link.setAction(uriAction);

                // Invisible border so the drawn background shows through cleanly
                PDBorderStyleDictionary border = new PDBorderStyleDictionary();
                border.setWidth(0);
                link.setBorderStyle(border);

                page.getAnnotations().add(link);
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            document.save(out);
            log.info("Successfully stamped MedExJob logo and hyperlink onto {} page(s) of uploaded PDF.", pageCount);
            return out.toByteArray();
        } catch (Exception ex) {
            log.warn("Failed to stamp hyperlink onto PDF: {}. Returning original PDF bytes.", ex.getMessage());
            return pdfBytes;
        }
    }

    /**
     * Stamped MultipartFile helper for Spring controller endpoints.
     */
    public MultipartFile stampMultipartFile(MultipartFile original, String targetUrl) {
        if (original == null || original.isEmpty()) {
            return original;
        }

        try {
            byte[] stamped = addHyperlinkBanner(original.getBytes(), targetUrl);
            return new StampedMultipartFile(original, stamped);
        } catch (IOException e) {
            log.warn("Could not read original multipart file bytes for PDF stamping: {}", e.getMessage());
            return original;
        }
    }

    public MultipartFile stampMultipartFile(MultipartFile original) {
        return stampMultipartFile(original, DEFAULT_WEBSITE_URL);
    }

    public byte[] stampMedExJobHyperlink(byte[] pdfBytes) {
        return addHyperlinkBanner(pdfBytes, DEFAULT_WEBSITE_URL);
    }

    /**
     * In-memory MultipartFile implementation wrapping stamped PDF bytes.
     */
    private static class StampedMultipartFile implements MultipartFile {
        private final MultipartFile delegate;
        private final byte[] content;

        public StampedMultipartFile(MultipartFile delegate, byte[] content) {
            this.delegate = delegate;
            this.content = content != null ? content : new byte[0];
        }

        @Override
        public String getName() {
            return delegate.getName();
        }

        @Override
        public String getOriginalFilename() {
            return delegate.getOriginalFilename();
        }

        @Override
        public String getContentType() {
            return "application/pdf";
        }

        @Override
        public boolean isEmpty() {
            return content.length == 0;
        }

        @Override
        public long getSize() {
            return content.length;
        }

        @Override
        public byte[] getBytes() {
            return content;
        }

        @Override
        public InputStream getInputStream() {
            return new ByteArrayInputStream(content);
        }

        @Override
        public void transferTo(File dest) throws IOException, IllegalStateException {
            java.nio.file.Files.write(dest.toPath(), content);
        }
    }
}
