package com.medexjob.service;

import com.medexjob.dto.recruitment.RecruitmentExtractionResult;
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
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class RecruitmentExtractionServiceTest {

    private RecruitmentAiExtractionClient disabledAiClient() {
        return new RecruitmentAiExtractionClient(
                org.springframework.web.client.RestClient.builder(),
                new com.fasterxml.jackson.databind.ObjectMapper(),
                false, "", "", ""
        ) {
            @Override
            public Optional<RecruitmentExtractionResult> extract(String pdfText) {
                return Optional.empty();
            }
        };
    }

    private RecruitmentOcrService disabledOcrService() {
        return new RecruitmentOcrService(false, "tesseract", "eng", 20, 180.0f, 30) {
            @Override
            public Optional<String> extract(PDDocument document) {
                return Optional.empty();
            }
        };
    }

    @Test
    void heuristicPdfExtractsFortyVacancyRecords() throws Exception {
        RecruitmentAiExtractionClient ai = disabledAiClient();
        RecruitmentOcrService ocr = disabledOcrService();
        RecruitmentExtractionService service = new RecruitmentExtractionService(ai, ocr);

        MockMultipartFile file = new MockMultipartFile(
                "file",
                "aiims-faculty.pdf",
                "application/pdf",
                facultyPdf()
        );

        RecruitmentExtractionService.ExtractionPayload payload = service.extract(file);
        RecruitmentExtractionResult result = payload.result();

        assertThat(result.getExtractionMethod()).isEqualTo("HEURISTIC_PDF");
        assertThat(result.getVacancies()).hasSize(40);
        int structured = result.getVacancies().stream()
                .mapToInt(v -> Optional.ofNullable(v.getNumberOfVacancies()).orElse(0))
                .sum();
        assertThat(structured).isEqualTo(40);
        assertThat(result.getRecruitment().getTotalVacancies()).isEqualTo(40);
        assertThat(result.getRecruitment().getSector()).isEqualTo("government");
        assertThat(result.getRecruitment().getOrganisationName()).containsIgnoringCase("All India Institute");
        assertThat(payload.fingerprint()).hasSize(64);
    }

    @Test
    void rejectsEmptyAndNonPdfUploads() {
        RecruitmentExtractionService service = new RecruitmentExtractionService(
                disabledAiClient(),
                disabledOcrService()
        );
        assertThatThrownBy(() -> service.extract(new MockMultipartFile("file", "x.pdf", "application/pdf", new byte[0])))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.extract(new MockMultipartFile("file", "note.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "hello".getBytes())))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.extract(new MockMultipartFile("file", "fake.pdf", "application/pdf", "not-a-pdf".getBytes())))
                .isInstanceOf(IllegalArgumentException.class);
    }

    private byte[] facultyPdf() throws Exception {
        String ones = "1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 20";
        String[] lines = {
                "ALL INDIA INSTITUTE OF MEDICAL SCIENCES, JODHPUR",
                "Advertisement No : Admn/Faculty/01/2026-27 Date : 01 January 2026",
                "Subject: Recruitment to Faculty Posts at AIIMS Jodhpur",
                "Government of India",
                "Website: https://www.aiimsjodhpur.edu.in",
                "Closing date of online application is 15 March 2026",
                "1 Anaesthesiology " + ones,
                "2 Cardiology " + ones
        };
        try (PDDocument document = new PDDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            PDPage page = new PDPage();
            document.addPage(page);
            try (PDPageContentStream cs = new PDPageContentStream(document, page)) {
                PDType1Font font = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
                float y = 750;
                for (String line : lines) {
                    cs.beginText();
                    cs.setFont(font, 9);
                    cs.newLineAtOffset(40, y);
                    cs.showText(line);
                    cs.endText();
                    y -= 16;
                }
            }
            document.save(out);
            return out.toByteArray();
        }
    }
}
