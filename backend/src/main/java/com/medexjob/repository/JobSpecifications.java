package com.medexjob.repository;

import com.medexjob.entity.Employer;
import com.medexjob.entity.Job;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * JPA Specifications for candidate-facing job search.
 *
 * Search terms are tokenised so a query such as "Assistant Professor Emergency
 * Medicine" can match across title, speciality, qualification, organisation and
 * description while every structured filter (including Government/Private) is
 * still enforced.
 */
public final class JobSpecifications {

    private static final Set<String> STOPWORDS = Set.of(
            "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "has", "he", "in", "is", "it",
            "its", "of", "on", "that", "the", "to", "was", "will", "with", "job", "jobs", "vacancy",
            "vacancies", "post", "posts", "recruitment", "notification", "official"
    );

    private JobSpecifications() {
    }

    public static Specification<Job> buildSearchSpec(
            String searchQuery,
            String location,
            Job.JobSector sector,
            Job.JobCategory category,
            Job.ExperienceLevel experienceLevel,
            String speciality,
            Job.DutyType dutyType,
            Job.JobStatus status,
            Boolean featured
    ) {
        return buildSearchSpec(searchQuery, location, sector, category, experienceLevel, speciality, dutyType,
                status, featured, null, null, null, null, null, null, false);
    }

    public static Specification<Job> buildSearchSpec(
            String searchQuery,
            String location,
            Job.JobSector sector,
            Job.JobCategory category,
            Job.ExperienceLevel experienceLevel,
            String speciality,
            Job.DutyType dutyType,
            Job.JobStatus status,
            Boolean featured,
            String department,
            String qualification,
            String jobType,
            String state,
            String city,
            String salary,
            boolean openOnly
    ) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            Join<Job, Employer> employerJoin = root.join("employer", JoinType.LEFT);

            // Never expose soft-deleted jobs through public search.
            predicates.add(cb.isNull(root.get("deletedAt")));

            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (sector != null) {
                predicates.add(cb.equal(root.get("sector"), sector));
            }
            if (category != null) {
                predicates.add(cb.equal(root.get("category"), category));
            }
            if (experienceLevel != null) {
                predicates.add(cb.equal(root.get("experienceLevel"), experienceLevel));
            }
            if (dutyType != null) {
                predicates.add(cb.equal(root.get("dutyType"), dutyType));
            }
            if (featured != null) {
                predicates.add(cb.equal(root.get("isFeatured"), featured));
            }
            if (openOnly) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("lastDate"), LocalDate.now()));
            }

            if (hasText(location)) {
                predicates.add(like(cb, root.get("location"), location));
            }
            if (hasText(speciality)) {
                predicates.add(cb.or(
                        like(cb, root.get("speciality"), speciality),
                        like(cb, root.get("title"), speciality)
                ));
            }
            if (hasText(department)) {
                predicates.add(cb.or(
                        like(cb, root.get("department"), department),
                        like(cb, root.get("title"), department),
                        like(cb, root.get("description"), department)
                ));
            }
            if (hasText(qualification)) {
                predicates.add(like(cb, root.get("qualification"), qualification));
            }
            if (hasText(jobType)) {
                predicates.add(cb.or(
                        like(cb, root.get("jobType"), jobType),
                        like(cb, root.get("description"), jobType)
                ));
            }
            if (hasText(state)) {
                predicates.add(like(cb, root.get("location"), state));
            }
            if (hasText(city)) {
                predicates.add(like(cb, root.get("location"), city));
            }
            if (hasText(salary)) {
                predicates.add(like(cb, root.get("salaryRange"), salary));
            }

            List<String> tokens = tokenize(searchQuery);
            Predicate firstTokenTitleMatch = null;
            for (String token : tokens) {
                Predicate titleMatch = like(cb, root.get("title"), token);
                Predicate companyMatch = like(cb, employerJoin.get("companyName"), token);
                Predicate descriptionMatch = like(cb, root.get("description"), token);
                Predicate specialityMatch = like(cb, root.get("speciality"), token);
                Predicate departmentMatch = like(cb, root.get("department"), token);
                Predicate qualificationMatch = like(cb, root.get("qualification"), token);
                Predicate requirementsMatch = like(cb, root.get("requirements"), token);
                Predicate benefitsMatch = like(cb, root.get("benefits"), token);
                Predicate locationMatch = like(cb, root.get("location"), token);
                Predicate experienceMatch = like(cb, root.get("experience"), token);
                Predicate jobTypeMatch = like(cb, root.get("jobType"), token);

                List<Predicate> tokenPredicates = new ArrayList<>(List.of(
                        titleMatch, companyMatch, descriptionMatch, specialityMatch, departmentMatch,
                        qualificationMatch, requirementsMatch, benefitsMatch, locationMatch,
                        experienceMatch, jobTypeMatch
                ));
                if (token.equals("government") || token.equals("govt") || token.equals("public")) {
                    tokenPredicates.add(cb.equal(root.get("sector"), Job.JobSector.GOVERNMENT));
                } else if (token.equals("private") || token.equals("corporate")) {
                    tokenPredicates.add(cb.equal(root.get("sector"), Job.JobSector.PRIVATE));
                }

                predicates.add(cb.or(tokenPredicates.toArray(new Predicate[0])));

                if (firstTokenTitleMatch == null) {
                    firstTokenTitleMatch = titleMatch;
                }
            }

            // Apply a stable relevance hint without dropping caller-supplied filters.
            if (!tokens.isEmpty() && firstTokenTitleMatch != null) {
                Expression<Integer> titleOrder = cb.<Integer>selectCase()
                        .when(firstTokenTitleMatch, 1)
                        .otherwise(2);
                query.orderBy(cb.asc(titleOrder), cb.desc(root.get("createdAt")));
            }

            query.distinct(true);
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private static Predicate like(jakarta.persistence.criteria.CriteriaBuilder cb,
                                  jakarta.persistence.criteria.Expression<String> field,
                                  String value) {
        return cb.like(
                cb.lower(cb.coalesce(field, "")),
                "%" + value.trim().toLowerCase(Locale.ROOT) + "%"
        );
    }

    private static List<String> tokenize(String searchQuery) {
        if (!hasText(searchQuery)) {
            return List.of();
        }
        List<String> rawTokens = Arrays.stream(searchQuery.trim().split("\\s+"))
                .map(token -> token.trim().toLowerCase(Locale.ROOT))
                .filter(token -> !token.isBlank())
                .distinct()
                .toList();

        // If user typed a single keyword/letter (e.g. "a", "c", "in"), keep it so live keyword matching works
        if (rawTokens.size() == 1) {
            return rawTokens;
        }

        List<String> filtered = rawTokens.stream()
                .filter(token -> !STOPWORDS.contains(token))
                .limit(12)
                .toList();

        return filtered.isEmpty() ? rawTokens.stream().limit(12).toList() : filtered;
    }

    private static boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }

    public static Specification<Job> hasStatus(Job.JobStatus status) {
        return (root, query, cb) -> status == null ? cb.conjunction() : cb.equal(root.get("status"), status);
    }

    public static Specification<Job> titleContains(String title) {
        return (root, query, cb) -> hasText(title) ? like(cb, root.get("title"), title) : cb.conjunction();
    }

    public static Specification<Job> companyNameContains(String companyName) {
        return (root, query, cb) -> {
            if (!hasText(companyName)) {
                return cb.conjunction();
            }
            Join<Job, Employer> employerJoin = root.join("employer", JoinType.LEFT);
            return like(cb, employerJoin.get("companyName"), companyName);
        };
    }

    public static Specification<Job> locationContains(String location) {
        return (root, query, cb) -> hasText(location) ? like(cb, root.get("location"), location) : cb.conjunction();
    }
}
