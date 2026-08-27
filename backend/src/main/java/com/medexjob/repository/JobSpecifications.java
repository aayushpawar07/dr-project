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
 * Free-text search deliberately behaves like a relevance search rather than a
 * strict SQL filter. A multi-word query can match any meaningful token across
 * title, employer, speciality, department, qualification, description,
 * requirements, location and job type. Exact title phrases and title-token
 * matches are ranked first, while structured filters remain mandatory.
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
            if (!tokens.isEmpty()) {
                List<Predicate> allSearchMatches = new ArrayList<>();
                List<Predicate> titleTokenMatches = new ArrayList<>();

                // Phrase matches receive the strongest relevance rank, but are not
                // required. This prevents a query such as "Senior Medical Officer"
                // from hiding useful "Medical Officer" jobs just because "Senior"
                // is absent from the stored record.
                Predicate exactTitlePhrase = like(cb, root.get("title"), searchQuery);
                allSearchMatches.add(exactTitlePhrase);
                allSearchMatches.add(like(cb, employerJoin.get("companyName"), searchQuery));
                allSearchMatches.add(like(cb, root.get("speciality"), searchQuery));
                allSearchMatches.add(like(cb, root.get("department"), searchQuery));
                allSearchMatches.add(like(cb, root.get("qualification"), searchQuery));
                allSearchMatches.add(like(cb, root.get("location"), searchQuery));

                for (String token : tokens) {
                    Predicate titleMatch = like(cb, root.get("title"), token);
                    titleTokenMatches.add(titleMatch);

                    allSearchMatches.add(titleMatch);
                    allSearchMatches.add(like(cb, employerJoin.get("companyName"), token));
                    allSearchMatches.add(like(cb, root.get("description"), token));
                    allSearchMatches.add(like(cb, root.get("speciality"), token));
                    allSearchMatches.add(like(cb, root.get("department"), token));
                    allSearchMatches.add(like(cb, root.get("qualification"), token));
                    allSearchMatches.add(like(cb, root.get("requirements"), token));
                    allSearchMatches.add(like(cb, root.get("benefits"), token));
                    allSearchMatches.add(like(cb, root.get("location"), token));
                    allSearchMatches.add(like(cb, root.get("experience"), token));
                    allSearchMatches.add(like(cb, root.get("jobType"), token));

                    if (token.equals("government") || token.equals("govt") || token.equals("public")) {
                        allSearchMatches.add(cb.equal(root.get("sector"), Job.JobSector.GOVERNMENT));
                    } else if (token.equals("private") || token.equals("corporate")) {
                        allSearchMatches.add(cb.equal(root.get("sector"), Job.JobSector.PRIVATE));
                    }
                }

                // Elasticsearch-style broad relevance semantics: at least one
                // meaningful term must match somewhere, rather than requiring every
                // token to be present.
                predicates.add(cb.or(allSearchMatches.toArray(new Predicate[0])));

                Predicate anyTitleTokenMatch = cb.or(titleTokenMatches.toArray(new Predicate[0]));
                Expression<Integer> relevanceOrder = cb.<Integer>selectCase()
                        .when(exactTitlePhrase, 1)
                        .when(anyTitleTokenMatch, 2)
                        .otherwise(3);
                query.orderBy(cb.asc(relevanceOrder), cb.desc(root.get("createdAt")));
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

        // If a user typed a single keyword/letter, keep it so live search remains
        // responsive even for short medical abbreviations.
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
