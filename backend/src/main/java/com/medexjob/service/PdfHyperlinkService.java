package com.medexjob.service;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.apache.pdfbox.pdmodel.graphics.color.PDColor;
import org.apache.pdfbox.pdmodel.graphics.color.PDDeviceRGB;
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
 * Automatically stamps a professional header/footer branding banner with a clickable
 * hyperlink to MedExJob.com onto uploaded job notification PDFs.
 */
@Service
public class PdfHyperlinkService {
    private static final Logger log = LoggerFactory.getLogger(PdfHyperlinkService.class);
    private static final String DEFAULT_WEBSITE_URL = "https://medexjob.com";

    /**
     * Stamped banner text and clickable URL annotation.
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

            PDType1Font boldFont = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
            PDType1Font regularFont = new PDType1Font(Standard14Fonts.FontName.HELVETICA);

            for (PDPage page : document.getPages()) {
                PDRectangle mediaBox = page.getMediaBox();
                if (mediaBox == null) continue;

                float width = mediaBox.getWidth();
                float bannerHeight = 22f;
                float bannerY = 8f; // Near the bottom edge
                float bannerX = 14f;
                float bannerWidth = Math.max(100f, width - 28f);

                // 1. Draw subtle banner background and text
                try (PDPageContentStream cs = new PDPageContentStream(document, page, PDPageContentStream.AppendMode.APPEND, true, true)) {
                    // Light blue background bar (#eff6ff)
                    cs.setNonStrokingColor(0.937f, 0.965f, 1.0f);
                    cs.setStrokingColor(0.749f, 0.859f, 0.996f); // #bfdbfe
                    cs.setLineWidth(0.8f);
                    cs.addRect(bannerX, bannerY, bannerWidth, bannerHeight);
                    cs.fillAndStroke();

                    // Text: MedExJob Branding and Link
                    String brandPrefix = "MedExJob.com";
                    String textMiddle = " — Official Medical Notification  |  View more verified jobs at ";
                    String linkText = "https://medexjob.com";

                    float fontSize = 8.5f;
                    float textY = bannerY + 6.5f;
                    float textX = bannerX + 12f;

                    // Brand in bold blue (#1d4ed8)
                    cs.beginText();
                    cs.setFont(boldFont, fontSize);
                    cs.setNonStrokingColor(0.114f, 0.306f, 0.847f);
                    cs.newLineAtOffset(textX, textY);
                    cs.showText(brandPrefix);
                    cs.endText();

                    float brandWidth = boldFont.getStringWidth(brandPrefix) / 1000f * fontSize;

                    // Middle text in dark gray (#334155)
                    cs.beginText();
                    cs.setFont(regularFont, fontSize);
                    cs.setNonStrokingColor(0.200f, 0.255f, 0.333f);
                    cs.newLineAtOffset(textX + brandWidth, textY);
                    cs.showText(textMiddle);
                    cs.endText();

                    float middleWidth = regularFont.getStringWidth(textMiddle) / 1000f * fontSize;

                    // Link text in blue bold (#2563eb)
                    cs.beginText();
                    cs.setFont(boldFont, fontSize);
                    cs.setNonStrokingColor(0.145f, 0.388f, 0.922f);
                    cs.newLineAtOffset(textX + brandWidth + middleWidth, textY);
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
            log.info("Successfully stamped MedExJob hyperlink onto {} page(s) of uploaded PDF.", pageCount);
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
            byte[] stampedBytes = addHyperlinkBanner(original.getBytes(), targetUrl);
            return new StampedMultipartFile(original, stampedBytes);
        } catch (IOException e) {
            log.error("Could not read original multipart file for stamping: {}", e.getMessage());
            return original;
        }
    }

    private static class StampedMultipartFile implements MultipartFile {
        private final MultipartFile original;
        private final byte[] content;

        StampedMultipartFile(MultipartFile original, byte[] content) {
            this.original = original;
            this.content = content;
        }

        @Override public String getName() { return original.getName(); }
        @Override public String getOriginalFilename() { return original.getOriginalFilename(); }
        @Override public String getContentType() { return "application/pdf"; }
        @Override public boolean isEmpty() { return content == null || content.length == 0; }
        @Override public long getSize() { return content != null ? content.length : 0; }
        @Override public byte[] getBytes() { return content; }
        @Override public InputStream getInputStream() { return new ByteArrayInputStream(content); }
        @Override
        public void transferTo(File dest) throws IOException, IllegalStateException {
            java.nio.file.Files.write(dest.toPath(), content);
        }
    }
}
