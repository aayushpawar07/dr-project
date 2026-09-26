package com.medexjob.service;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.interactive.action.PDActionURI;
import org.apache.pdfbox.pdmodel.interactive.annotation.PDAnnotation;
import org.apache.pdfbox.pdmodel.interactive.annotation.PDAnnotationLink;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class PdfHyperlinkServiceTest {

    private PdfHyperlinkService service;

    @BeforeEach
    void setUp() {
        service = new PdfHyperlinkService();
        service.init();
    }

    @Test
    void testAddHyperlinkBannerAndLogo() throws IOException {
        // Create a blank 1-page PDF
        byte[] inputPdf;
        try (PDDocument doc = new PDDocument()) {
            doc.addPage(new PDPage(PDRectangle.A4));
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            doc.save(out);
            inputPdf = out.toByteArray();
        }

        // Stamp banner and logo
        byte[] stampedPdf = service.addHyperlinkBanner(inputPdf, "https://medexjob.com");
        assertNotNull(stampedPdf);
        assertTrue(stampedPdf.length > inputPdf.length, "Stamped PDF should include banner and logo");

        // Verify annotations in the stamped PDF
        try (PDDocument doc = Loader.loadPDF(stampedPdf)) {
            assertEquals(1, doc.getNumberOfPages());
            PDPage page = doc.getPage(0);
            List<PDAnnotation> annotations = page.getAnnotations();
            assertFalse(annotations.isEmpty(), "Page should contain hyperlink annotation");

            boolean foundMedexLink = false;
            for (PDAnnotation annot : annotations) {
                if (annot instanceof PDAnnotationLink link) {
                    if (link.getAction() instanceof PDActionURI uriAction) {
                        if ("https://medexjob.com".equals(uriAction.getURI())) {
                            foundMedexLink = true;
                            break;
                        }
                    }
                }
            }
            assertTrue(foundMedexLink, "Clickable annotation pointing to https://medexjob.com should be present");
        }
    }
}
