import { CandidateProfileData } from '../api/candidateProfiles';

export interface MatchResult {
  isMatch: boolean;
  score: number; // 0 to 100
  matchReasons: string[];
  qualifies: boolean;
}

/**
 * Intelligent Job Matching Engine
 * Matches candidate's structured qualifications, category, speciality, and experience
 * with job vacancies.
 */
export function matchCandidateToJob(candidate: CandidateProfileData, job: any): MatchResult {
  if (!candidate || !job) {
    return { isMatch: false, score: 0, matchReasons: [], qualifies: false };
  }

  const reasons: string[] = [];
  let score = 0;

  const jobTitle = String(job.title || '').toLowerCase();
  const jobDesc = String(job.description || '').toLowerCase();
  const jobRoles = Array.isArray(job.jobRoles)
    ? job.jobRoles.map((r: string) => String(r).toLowerCase())
    : [String(job.jobRole || '').toLowerCase()];
  const jobQualification = String(job.qualification || '').toLowerCase();
  const jobSector = String(job.sector || '').toLowerCase();
  const jobLocation = String(job.location || job.state || job.city || '').toLowerCase();

  const candidateCategory = String(candidate.professionalCategory || candidate.medicalCategory || '').toLowerCase();
  const candidateBasic = String(candidate.basicQualification || '').toLowerCase();
  const candidateHighest = String(candidate.highestQualification || candidate.qualification || '').toLowerCase();
  const candidateSpeciality = String(candidate.speciality || '').toLowerCase();
  const candidateSubSpec = String(candidate.subSpeciality || candidate.superSpeciality || '').toLowerCase();

  // 1. SPECIALITY MATCH (Highest Priority - 45 points)
  if (candidateSpeciality && candidateSpeciality !== 'other' && candidateSpeciality !== 'none') {
    const specKeywords = candidateSpeciality.split(/[\s/,&]+/).filter((w) => w.length > 3);
    const hasSpecMatch =
      jobTitle.includes(candidateSpeciality) ||
      jobDesc.includes(candidateSpeciality) ||
      specKeywords.some((kw) => jobTitle.includes(kw) || jobDesc.includes(kw));

    if (hasSpecMatch) {
      score += 45;
      reasons.push(`Speciality matched: ${candidate.speciality}`);
    }
  }

  // 2. QUALIFICATION MATCH (35 points)
  // Check MD, MS, DNB, MBBS, B.Sc Nursing, etc.
  const qualificationsToCheck = [candidateHighest, candidateBasic].filter(Boolean);
  let qualMatched = false;

  for (const qual of qualificationsToCheck) {
    if (qual === 'mbbs only' || qual === 'bds only') {
      const basicName = qual.replace(' only', '');
      if (jobTitle.includes(basicName) || jobQualification.includes(basicName) || jobDesc.includes(basicName)) {
        qualMatched = true;
        reasons.push(`Basic qualification matched: ${basicName.toUpperCase()}`);
        break;
      }
    } else if (qual) {
      const qClean = qual.toLowerCase();
      // Look for whole-word or acronym match e.g. "MD", "MS", "DNB", "MBBS"
      const regex = new RegExp(`\\b${qClean}\\b`, 'i');
      if (
        regex.test(jobTitle) ||
        regex.test(jobQualification) ||
        regex.test(jobDesc) ||
        jobTitle.includes(qClean) ||
        jobQualification.includes(qClean)
      ) {
        qualMatched = true;
        reasons.push(`Qualification matched: ${qual}`);
        break;
      }
    }
  }

  if (qualMatched) {
    score += 35;
  }

  // 3. TARGET JOB ROLE MATCH (15 points)
  const candidateRoles = (candidate.preferredJobRoles || [candidate.preferredJobRole]).filter(Boolean);
  let roleMatched = false;

  for (const role of candidateRoles) {
    const roleLower = String(role).toLowerCase();
    if (
      jobRoles.some((jr) => jr.includes(roleLower) || roleLower.includes(jr)) ||
      jobTitle.includes(roleLower)
    ) {
      roleMatched = true;
      reasons.push(`Role matched: ${role}`);
      break;
    }
  }

  if (roleMatched) {
    score += 15;
  }

  // 4. SECTOR / LOCATION BONUS (5 points)
  if (candidate.preferredSectors && candidate.preferredSectors.length > 0) {
    const wantsGovt = candidate.preferredSectors.some((s) => s.toLowerCase().includes('gov') || s.toLowerCase() === 'both');
    const wantsPrivate = candidate.preferredSectors.some((s) => s.toLowerCase().includes('priv') || s.toLowerCase() === 'both');

    if ((jobSector.includes('gov') && wantsGovt) || (jobSector.includes('priv') && wantsPrivate)) {
      score += 5;
    }
  }

  const qualifies = score >= 45 || (qualMatched && reasons.length > 0);
  const isMatch = score >= 35;

  return {
    isMatch,
    score: Math.min(100, score),
    matchReasons: reasons,
    qualifies,
  };
}
