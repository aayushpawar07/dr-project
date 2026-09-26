const REGULATORY = /gazette of india|nmc norms|national medical commission|as per nmc|as per the nmc/i;
const GENERIC_NOTICE = /^(as per (the )?(official )?(recruitment )?notification|as notified|see notification|as applicable)\.?$/i;
const TRAILING_NORMS = /\s*(as per nmc.*|published in the gazette.*)$/i;

function text(value: unknown) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

const NOT_MENTIONED_REGEX = /^(not\s*mentioned|not\s*specified|not\s*available|n\/?a|nil|none|--|-|null|undefined)$/i;

export function isNotMentioned(value: unknown): boolean {
  if (value == null) return true;
  const raw = text(value);
  if (!raw) return true;
  return NOT_MENTIONED_REGEX.test(raw);
}

export function isRegulatoryDump(value: unknown) {
  const raw = text(value);
  if (!raw) return false;
  return REGULATORY.test(raw) || raw.length > 160;
}

export function isGenericNotice(value: unknown) {
  return GENERIC_NOTICE.test(text(value));
}

export function cleanExtractedName(value: unknown) {
  const cleaned = text(value).replace(TRAILING_NORMS, '').trim();
  if (!cleaned || isRegulatoryDump(cleaned) || isNotMentioned(cleaned)) return '';
  return cleaned;
}

export function cardFieldText(value: unknown, fallback = '') {
  if (isNotMentioned(value)) return fallback;
  const raw = text(value);
  if (!raw || isRegulatoryDump(raw) || isGenericNotice(raw)) return fallback;
  return raw.length > 90 ? `${raw.slice(0, 87).trim()}...` : raw;
}

export function detailFieldText(...values: unknown[]) {
  for (const value of values) {
    if (isNotMentioned(value)) continue;
    const raw = text(value);
    if (raw && !isNotMentioned(raw)) return raw;
  }
  return '';
}

export function cardSalaryText(value: unknown) {
  if (isNotMentioned(value)) return '';
  const raw = text(value);
  if (!raw || isRegulatoryDump(raw)) return '';
  const paren = raw.indexOf('(');
  const short = paren > 18 && raw.length > 42 ? raw.slice(0, paren).trim() : raw;
  return short.length > 80 ? `${short.slice(0, 77).trim()}...` : short;
}

export function formatCardQualification(value: unknown): string {
  if (isNotMentioned(value)) return '';
  let raw = text(value)
    .replace(/^[*•\-\s]+/, '')
    .replace(/^[^:]*:\s*/, '')
    .trim();
  if (isNotMentioned(raw) || isRegulatoryDump(raw) || isGenericNotice(raw)) return '';

  const degrees = [
    'MBBS', 'MD', 'MS', 'DNB', 'DM', 'MCh', 'BDS', 'MDS',
    'B.Sc Nursing', 'BSc Nursing', 'GNM', 'ANM', 'B.Pharm', 'BPharm', 'M.Pharm', 'MPharm',
    'BAMS', 'BHMS', 'BUMS', 'Diploma', 'PhD', 'Fellowship'
  ];
  const matched: string[] = [];
  degrees.forEach((deg) => {
    const regex = new RegExp(`\\b${deg.replace('.', '\\.')}\\b`, 'i');
    if (regex.test(raw) && !matched.some((m) => m.toLowerCase() === deg.toLowerCase())) {
      matched.push(deg);
    }
  });
  if (matched.length > 0) {
    return matched.slice(0, 3).join(' / ');
  }

  raw = raw.replace(/\s+/g, ' ');
  return raw.length > 38 ? `${raw.slice(0, 35).trim()}...` : raw;
}

export function formatCardExperience(value: unknown): string {
  if (isNotMentioned(value)) return '';
  let raw = text(value)
    .replace(/^[*•\-\s]+/, '')
    .replace(/^(experience|exp)\s*:\s*/i, '')
    .trim();
  if (isNotMentioned(raw) || isGenericNotice(raw)) return '';

  if (/fresher|no\s*experience|entry\s*level|freshers\s*welcome/i.test(raw)) {
    return 'Fresher';
  }

  const rangeMatch = raw.match(/(\d+)\s*(?:-|to)\s*(\d+)\s*(?:years?|yrs?)/i);
  if (rangeMatch) {
    return `${rangeMatch[1]}-${rangeMatch[2]} Years Exp`;
  }
  const plusMatch = raw.match(/(\d+)\+?\s*(?:years?|yrs?)/i);
  if (plusMatch) {
    return `${plusMatch[1]}+ Years Exp`;
  }
  const monthMatch = raw.match(/(\d+)\+?\s*(?:months?|mos?)/i);
  if (monthMatch) {
    return `${monthMatch[1]}+ Months Exp`;
  }

  raw = raw.replace(/^preferably\s*(experience\s*(in)?)?/i, '').trim();
  if (isNotMentioned(raw)) return '';
  return raw.length > 25 ? `${raw.slice(0, 22).trim()}...` : raw;
}

export function formatCardSalary(value: unknown): string {
  if (isNotMentioned(value)) return '';
  const raw = text(value);
  if (!raw || isRegulatoryDump(raw)) return '';

  const levelMatch = raw.match(/(?:Pay\s*Matrix\s*)?Level\s*(\d{1,2})/i);
  if (levelMatch) {
    return `Level ${levelMatch[1]} Pay Matrix`;
  }

  const rangeMatch = raw.match(/₹?\s*(\d[\d,]*)\s*(?:-|to)\s*₹?\s*(\d[\d,]*)/i);
  if (rangeMatch) {
    const num1 = parseInt(rangeMatch[1].replace(/,/g, ''), 10);
    const num2 = parseInt(rangeMatch[2].replace(/,/g, ''), 10);
    if (!isNaN(num1) && !isNaN(num2)) {
      const fmt = (n: number) => (n >= 100000 ? `₹${(n / 100000).toFixed(n % 100000 === 0 ? 0 : 1)}L` : `₹${Math.round(n / 1000)}K`);
      return `${fmt(num1)} – ${fmt(num2)}/mo`;
    }
  }

  const singleMatch = raw.match(/₹\s*(\d[\d,]{3,})/);
  if (singleMatch) {
    return `${singleMatch[0]}/month`;
  }

  return cardSalaryText(raw);
}

export function departmentSubtitle(vacancy: {
  department?: string | null;
  speciality?: string | null;
  postName?: string | null;
  qualification?: string | null;
}) {
  const name = cleanExtractedName(vacancy?.department || vacancy?.speciality || vacancy?.postName);
  const speciality = cleanExtractedName(vacancy?.speciality);
  const postName = cleanExtractedName(vacancy?.postName);
  if (speciality && speciality.toLowerCase() !== name.toLowerCase()) return speciality;
  if (postName && postName.toLowerCase() !== name.toLowerCase()) return postName;
  return '';
}

export function leftoverEligibilityNotes(...values: unknown[]) {
  return [...new Set(values.map(text).filter((value) => isRegulatoryDump(value)))];
}

export function preserveMultiline(value: unknown) {
  return String(value ?? '').replace(/\r\n?/g, '\n').replace(/\u00a0/g, ' ').trim();
}

export function restorePortalDescription(raw: string) {
  return preserveMultiline(raw)
    .replace(
      /\s*(JOB DETAILS|ELIGIBILITY(?:\s+CRITERIA)?|KEY RESPONSIBILITIES|RESPONSIBILITIES|APPLICATION PROCESS|APPLICATION DETAILS|SELECTION PROCESS|DOCUMENTS REQUIRED|IMPORTANT DOCUMENTS REQUIRED|IMPORTANT NOTES|IMPORTANT INSTRUCTIONS|CONTACT INFORMATION|PAY\s*\/\s*SALARY)\b/gi,
      '\n\n$1\n',
    )
    .replace(
      /\s+(Post|Organisation|Organization|Department|Speciality|Specialty|Location|Number of Posts|Job Type|Advertisement|Qualification|Experience|Age Limit|Pay\/Salary|Application Start Date|Last Date to Apply|Application Fee|Mode of Application|Selection Process)\s*:/gi,
      '\n$1:',
    )
    .replace(/\s+-\s+/g, '\n- ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function buildStructuredJobDescription(input: {
  postName?: string;
  organisationName?: string;
  department?: string;
  speciality?: string;
  location?: string;
  numberOfPosts?: number | string;
  jobType?: string;
  qualification?: string;
  experience?: string;
  ageLimit?: string;
  otherEligibility?: string;
  salary?: string;
  applicationStartDate?: string;
  applicationLastDate?: string;
  applicationFee?: string;
  selectionProcess?: string;
  importantInstructions?: string;
  extraNotes?: string[];
}) {
  const lines: string[] = [];
  const add = (heading: string, values: Array<string | false | '' | undefined | null>) => {
    const parts = values.map((value) => text(value)).filter(Boolean);
    if (!parts.length) return;
    if (lines.length) lines.push('');
    lines.push(heading, '', ...parts);
  };

  add('JOB DETAILS', [
    input.postName && !isNotMentioned(input.postName) && `Post: ${input.postName}`,
    input.organisationName && !isNotMentioned(input.organisationName) && `Organisation: ${input.organisationName}`,
    input.department && !isNotMentioned(input.department) && `Department: ${input.department}`,
    input.speciality && !isNotMentioned(input.speciality) && `Speciality: ${input.speciality}`,
    input.location && !isNotMentioned(input.location) && `Location: ${input.location}`,
    input.numberOfPosts != null && input.numberOfPosts !== '' && !isNotMentioned(input.numberOfPosts) && `Number of Posts: ${input.numberOfPosts}`,
    input.jobType && !isNotMentioned(input.jobType) && `Job Type: ${input.jobType}`,
    input.salary && !isNotMentioned(input.salary) && `Pay/Salary: ${input.salary}`,
  ]);
  add('ELIGIBILITY', [
    input.qualification && !isNotMentioned(input.qualification) && `Qualification: ${input.qualification}`,
    input.experience && !isNotMentioned(input.experience) && `Experience: ${input.experience}`,
    input.ageLimit && !isNotMentioned(input.ageLimit) && `Age Limit: ${input.ageLimit}`,
    input.otherEligibility && !isNotMentioned(input.otherEligibility) && input.otherEligibility,
    ...(input.extraNotes || []).filter((n) => !isNotMentioned(n)),
  ]);
  add('APPLICATION PROCESS', [
    input.applicationStartDate && !isNotMentioned(input.applicationStartDate) && `Application Start Date: ${input.applicationStartDate}`,
    input.applicationLastDate && !isNotMentioned(input.applicationLastDate) && `Last Date to Apply: ${input.applicationLastDate}`,
    input.applicationFee && !isNotMentioned(input.applicationFee) && `Application Fee: ${input.applicationFee}`,
  ]);
  add('SELECTION PROCESS', [input.selectionProcess && !isNotMentioned(input.selectionProcess) && input.selectionProcess]);
  add('IMPORTANT NOTES', [input.importantInstructions && !isNotMentioned(input.importantInstructions) && input.importantInstructions]);
  return lines.join('\n').trim();
}

export function displayJobDescription(job: any, extras: string[] = []) {
  const raw = preserveMultiline(job?.description);
  if (!raw || !raw.trim()) {
    return buildStructuredJobDescription({
      postName: job?.displayTitle || job?.title,
      organisationName: job?.organization || job?.organisationName || job?.employer?.companyName,
      department: cleanExtractedName(job?.department),
      speciality: cleanExtractedName(job?.speciality),
      location: job?.location,
      numberOfPosts: job?.numberOfPosts,
      jobType: job?.jobType,
      qualification: isRegulatoryDump(job?.qualification) ? job.qualification : cardFieldText(job?.qualification, job?.qualification),
      experience: isRegulatoryDump(job?.experience) ? job.experience : cardFieldText(job?.experience, job?.experience),
      salary: job?.salary || job?.salaryRange,
      applicationLastDate: job?.lastDate,
      selectionProcess: job?.selectionProcess,
      importantInstructions: job?.importantInstructions,
      extraNotes: leftoverEligibilityNotes(job?.qualification, job?.experience, job?.requirements, ...extras),
      otherEligibility: job?.requirements,
    });
  }

  const collapsed = raw.replace(/\s+/g, ' ').trim();
  if (/^JOB DETAILS/i.test(raw) || /^JOB DETAILS/i.test(collapsed)) {
    const restored = restorePortalDescription(raw);
    const notes = leftoverEligibilityNotes(job?.qualification, job?.experience, job?.requirements, ...extras);
    return notes.length ? `${restored}\n\nIMPORTANT NOTES\n\n${notes.join('\n')}` : restored;
  }

  // Preserve user-provided full multi-line description
  return raw;
}
