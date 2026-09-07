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

    public static void sanitize(RecruitmentExtractionResult result) {
        if (result == null) return;
        if (result.getRecruitment() != null) {
            RecruitmentExtractionResult.RecruitmentData recruitment = result.getRecruitment();
            recruitment.setTitle(cleanName(recruitment.getTitle()));
            recruitment.setOrganisationName(cleanName(recruitment.getOrganisationName()));
            recruitment.setLocation(cleanName(recruitment.getLocation()));
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

        if (isRegulatoryDump(qualification)) {
            if (!hasText(vacancy.getOtherEligibilityRequirements())) {
                vacancy.setOtherEligibilityRequirements(qualification.trim());
            }
            vacancy.setQualification(null);
        } else {
            vacancy.setQualification(clip(qualification, 120));
        }

        if (isRegulatoryDump(experience) || sameText(experience, qualification) || sameText(experience, vacancy.getQualification())) {
            vacancy.setExperience(null);
        } else {
            vacancy.setExperience(clip(experience, 80));
        }

        vacancy.setPostName(cleanName(vacancy.getPostName()));
        vacancy.setDepartment(cleanName(vacancy.getDepartment()));
        vacancy.setSpeciality(cleanName(vacancy.getSpeciality()));
        vacancy.setSubSpeciality(cleanName(vacancy.getSubSpeciality()));
        vacancy.setSalary(shortSalary(vacancy.getSalary()));
        vacancy.setPayScale(clip(vacancy.getPayScale(), 80));
        vacancy.setPayLevel(clip(vacancy.getPayLevel(), 40));
        vacancy.setAgeLimit(clip(vacancy.getAgeLimit(), 80));
        vacancy.setJobType(cleanName(vacancy.getJobType()));
        vacancy.setLocation(cleanName(vacancy.getLocation()));
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
