package com.medexjob.service;

import com.medexjob.dto.recruitment.RecruitmentExtractionResult;
import com.medexjob.entity.Recruitment;
import com.medexjob.repository.RecruitmentRepository;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import java.io.ByteArrayOutputStream;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class BulkGeminiExtractionFallbackTest {

    @Test
    void fallsBackGracefullyWhenGeminiAiFailsOrUnconfigured() throws Exception {
        RecruitmentAiExtractionClient aiClient = new RecruitmentAiExtractionClient(
                org.springframework.web.client.RestClient.builder(),
                new com.fasterxml.jackson.databind.ObjectMapper(),
                true, "", "", ""
        ) {
            @Override
            public Optional<RecruitmentExtractionResult> extract(String text) {
                return Optional.empty(); // simulate missing key or network failure
            }
        };

        RecruitmentOcrService ocrService = new RecruitmentOcrService(false, "tesseract", "eng", 20, 180.0f, 30) {
            @Override
            public Optional<String> extract(PDDocument doc) {
                return Optional.empty();
            }
        };

        RecruitmentExtractionService heuristicService = new RecruitmentExtractionService(aiClient, ocrService);
        BulkGeminiRecruitmentExtractionService bulkExtractor = new BulkGeminiRecruitmentExtractionService(
                aiClient, ocrService, heuristicService
        );

        RecruitmentRepository repo = mock(RecruitmentRepository.class);
        when(repo.save(any(Recruitment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        BulkRecruitmentUploadService uploadService = new BulkRecruitmentUploadService(bulkExtractor, repo);

        MockMultipartFile file = new MockMultipartFile(
                "file",
                "general_recruitment.pdf",
                "application/pdf",
                samplePdf()
        );

        BulkRecruitmentUploadService.UploadResult result = uploadService.extractAndCreate(file, false);

        assertThat(result).isNotNull();
        Recruitment recruitment = result.recruitment();
        assertThat(recruitment.getExtractionMethod()).isEqualTo("PDF_TEXT");
        assertThat(recruitment.getVacancies()).isNotEmpty();
        assertThat(recruitment.getVacancies().get(0).getNumberOfVacancies()).isGreaterThanOrEqualTo(1);
        assertThat(recruitment.getVacancies().get(0).getStatus().name()).isEqualTo("NEEDS_REVIEW");
    }

    private byte[] samplePdf() throws Exception {
        try (PDDocument doc = new PDDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            PDPage page = new PDPage();
            doc.addPage(page);
            try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
                PDType1Font font = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
                cs.beginText();
                cs.setFont(font, 10);
                cs.newLineAtOffset(50, 700);
                cs.showText("GOVERNMENT MEDICAL COLLEGE & HOSPITAL");
                cs.newLineAtOffset(0, -18);
                cs.showText("Advertisement No: GMC/2026/05");
                cs.newLineAtOffset(0, -18);
                cs.showText("Subject: Recruitment Notice for Senior Resident and Medical Officer Posts");
                cs.newLineAtOffset(0, -18);
                cs.showText("Closing date for application is 25 December 2026");
                cs.newLineAtOffset(0, -18);
                cs.showText("Eligible candidates may apply online at https://gmch.gov.in");
                cs.endText();
            }
            doc.save(out);
            return out.toByteArray();
        }
    }
}
