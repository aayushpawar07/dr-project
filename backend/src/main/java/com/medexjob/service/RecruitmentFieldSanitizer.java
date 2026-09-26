package com.medexjob.service;

import com.medexjob.dto.recruitment.RecruitmentExtractionResult;

import java.util.regex.Pattern;

/**
 * Keeps listing/card fields short and relevant. Gazette/NMC boilerplate belongs
 * in the job description, not under department, qualification, or experience.
 */
public final class RecruitmentFieldSanitizer {
    private static final Pattern REGULATORY = Pattern.compile(
            "(?i)(gazette of india|nmc norms|national medical commission|as per nmc|as per the nmc)"
    );
    private static final Pattern GENERIC_NOTICE = Pattern.compile(
            "(?i)^(as per (the )?(official )?(recruitment )?notification|as notified|see notification|as applicable)\\.?$"
    );
    private static final Pattern TRAILING_NORMS = Pattern.compile(
            "(?i)\\s*(as per nmc.*|published in the gazette.*)$"
    );

    private RecruitmentFieldSanitizer() {}

    public static boolean isNotMentioned(String value) {
        if (value == null || value.isBlank()) return true;
        String trimmed = value.trim().toLowerCase();
        return trimmed.equals("not mentioned") || trimmed.equals("not specified")
                || trimmed.equals("not available") || trimmed.equals("n/a")
                || trimmed.equals("na") || trimmed.equals("nil")
                || trimmed.equals("none") || trimmed.equals("null")
                || trimmed.equals("as per rules") || trimmed.equals("as per norms")
                || trimmed.equals("see notification") || trimmed.equals("as per notification");
    }

    public static void sanitize(RecruitmentExtractionResult result) {
        if (result == null) return;
        if (result.getRecruitment() != null) {
            RecruitmentExtractionResult.RecruitmentData recruitment = result.getRecruitment();
            recruitment.setTitle(cleanName(recruitment.getTitle()));
            recruitment.setOrganisationName(cleanName(recruitment.getOrganisationName()));
            recruitment.setLocation(isNotMentioned(recruitment.getLocation()) ? null : cleanName(recruitment.getLocation()));
            if (isNotMentioned(recruitment.getApplicationFee())) recruitment.setApplicationFee(null);
            if (isNotMentioned(recruitment.getSelectionProcess())) recruitment.setSelectionProcess(null);
            if (isNotMentioned(recruitment.getImportantInstructions())) recruitment.setImportantInstructions(null);
        }
        if (result.getVacancies() == null) return;
        for (RecruitmentExtractionResult.VacancyData vacancy : result.getVacancies()) {
            sanitizeVacancy(vacancy);
        }
    }

    public static void sanitizeVacancy(RecruitmentExtractionResult.VacancyData vacancy) {
        if (vacancy == null) return;
        String qualification = vacancy.getQualification();
        String experience = vacancy.getExperience();

        if (isNotMentioned(qualification)) {
            vacancy.setQualification(null);
        } else if (isRegulatoryDump(qualification)) {
            if (!hasText(vacancy.getOtherEligibilityRequirements())) {
                vacancy.setOtherEligibilityRequirements(qualification.trim());
            }
            vacancy.setQualification(null);
        } else {
            vacancy.setQualification(clip(qualification, 120));
        }

        if (isNotMentioned(experience) || isRegulatoryDump(experience) || sameText(experience, qualification) || sameText(experience, vacancy.getQualification())) {
            vacancy.setExperience(null);
        } else {
            vacancy.setExperience(clip(experience, 80));
        }

        vacancy.setPostName(cleanName(vacancy.getPostName()));
        vacancy.setDepartment(isNotMentioned(vacancy.getDepartment()) ? null : cleanName(vacancy.getDepartment()));
        vacancy.setSpeciality(isNotMentioned(vacancy.getSpeciality()) ? null : cleanName(vacancy.getSpeciality()));
        vacancy.setSubSpeciality(isNotMentioned(vacancy.getSubSpeciality()) ? null : cleanName(vacancy.getSubSpeciality()));
        vacancy.setCategory(isNotMentioned(vacancy.getCategory()) ? null : cleanName(vacancy.getCategory()));
        vacancy.setSalary(isNotMentioned(vacancy.getSalary()) ? null : shortSalary(vacancy.getSalary()));
        vacancy.setPayScale(isNotMentioned(vacancy.getPayScale()) ? null : clip(vacancy.getPayScale(), 80));
        vacancy.setPayLevel(isNotMentioned(vacancy.getPayLevel()) ? null : clip(vacancy.getPayLevel(), 40));
        vacancy.setAgeLimit(isNotMentioned(vacancy.getAgeLimit()) ? null : clip(vacancy.getAgeLimit(), 80));
        vacancy.setJobType(isNotMentioned(vacancy.getJobType()) ? null : cleanName(vacancy.getJobType()));
        vacancy.setLocation(isNotMentioned(vacancy.getLocation()) ? null : cleanName(vacancy.getLocation()));
        if (isNotMentioned(vacancy.getOtherEligibilityRequirements())) {
            vacancy.setOtherEligibilityRequirements(null);
        }
    }

    public static String cardValue(String value, String fallback) {
        if (!hasText(value) || isRegulatoryDump(value) || GENERIC_NOTICE.matcher(value.trim()).matches()) {
            return fallback;
        }
        return clip(value, 90);
    }

    public static String shortSalary(String salary) {
        if (!hasText(salary) || isRegulatoryDump(salary)) return null;
        String text = salary.trim();
        int paren = text.indexOf('(');
        if (paren > 18 && text.length() > 42) {
            text = text.substring(0, paren).trim();
        }
        return clip(text, 80);
    }

    public static boolean isRegulatoryDump(String value) {
        if (!hasText(value)) return false;
        String text = value.trim();
        if (REGULATORY.matcher(text).find()) return true;
        return text.length() > 160;
    }

    public static String cleanName(String value) {
        if (!hasText(value)) return null;
        String cleaned = TRAILING_NORMS.matcher(value.trim()).replaceAll("").trim();
        if (!hasText(cleaned) || isRegulatoryDump(cleaned)) return null;
        return clip(cleaned, 160);
    }

    private static boolean sameText(String left, String right) {
        return hasText(left) && hasText(right) && left.trim().equalsIgnoreCase(right.trim());
    }

    private static String clip(String value, int max) {
        if (!hasText(value)) return null;
        String text = value.trim().replaceAll("\\s+", " ");
        return text.length() <= max ? text : text.substring(0, max).trim();
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
