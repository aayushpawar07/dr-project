const REGULATORY = /gazette of india|nmc norms|national medical commission|as per nmc|as per the nmc/i;
const GENERIC_NOTICE = /^(as per (the )?(official )?(recruitment )?notification|as notified|see notification|as applicable)\.?$/i;
const TRAILING_NORMS = /\s*(as per nmc.*|published in the gazette.*)$/i;

function text(value: unknown) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
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
  if (!cleaned || isRegulatoryDump(cleaned)) return '';
  return cleaned;
}

export function cardFieldText(value: unknown, fallback = '') {
  const raw = text(value);
  if (!raw || isRegulatoryDump(raw) || isGenericNotice(raw)) return fallback;
  return raw.length > 90 ? `${raw.slice(0, 87).trim()}...` : raw;
}

export function detailFieldText(...values: unknown[]) {
  for (const value of values) {
    const raw = text(value);
    if (raw) return raw;
  }
  return '';
}

export function cardSalaryText(value: unknown) {
  const raw = text(value);
  if (!raw || isRegulatoryDump(raw)) return '';
  const paren = raw.indexOf('(');
  const short = paren > 18 && raw.length > 42 ? raw.slice(0, paren).trim() : raw;
  return short.length > 80 ? `${short.slice(0, 77).trim()}...` : short;
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

const SECTION_MARKERS: Array<{ key: string; label: string; pattern: RegExp }> = [
  { key: 'details', label: 'Job Details', pattern: /^JOB DETAILS$/i },
  { key: 'eligibility', label: 'Eligibility', pattern: /^ELIGIBILITY(?:\s+CRITERIA)?$/i },
  { key: 'pay', label: 'Pay / Salary', pattern: /^PAY\s*\/\s*SALARY$/i },
  { key: 'application', label: 'Application Details', pattern: /^APPLICATION DETAILS$/i },
  { key: 'instructions', label: 'Important Instructions', pattern: /^IMPORTANT INSTRUCTIONS$/i },
  { key: 'notes', label: 'Important Notes', pattern: /^IMPORTANT NOTES$/i },
];

export function preserveMultiline(value: unknown) {
  return String(value ?? '').replace(/\r\n?/g, '\n').replace(/\u00a0/g, ' ').trim();
}

export function restoreStructuredDescription(raw: string) {
  return preserveMultiline(raw)
    .replace(
      /\s*(JOB DETAILS|ELIGIBILITY(?:\s+CRITERIA)?|PAY\s*\/\s*SALARY|APPLICATION DETAILS|IMPORTANT INSTRUCTIONS|IMPORTANT NOTES)\b/gi,
      '\n\n$1\n',
    )
    .replace(
      /\s+(Post|Organisation|Organization|Department|Speciality|Specialty|Location|Number of Posts|Job Type|Advertisement|Qualification|Experience|Age Limit|Application Start Date|Last Date to Apply|Application Fee|Selection Process)\s*:/gi,
      '\n$1:',
    )
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function isOrganisationLabel(label: string) {
  return /organisation|organization|hospital name/i.test(label.trim());
}

export type StructuredDescriptionSection = {
  key: string;
  label: string;
  rows: Array<{ label: string; value: string }>;
  paragraphs: string[];
};

export function parseStructuredJobDescription(raw: string): StructuredDescriptionSection[] {
  const restored = restoreStructuredDescription(raw);
  if (!restored) return [];

  const sections: StructuredDescriptionSection[] = [];
  let current: StructuredDescriptionSection = { key: 'details', label: 'Job Details', rows: [], paragraphs: [] };
  sections.push(current);

  for (const line of restored.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const marker = SECTION_MARKERS.find((item) => item.pattern.test(trimmed));
    if (marker) {
      if (current.key === 'details' && !current.rows.length && !current.paragraphs.length && marker.key === 'details') {
        current.label = marker.label;
        continue;
      }
      current = { key: marker.key, label: marker.label, rows: [], paragraphs: [] };
      sections.push(current);
      continue;
    }

    const colon = trimmed.indexOf(':');
    if (colon > 0 && colon <= 42 && trimmed.slice(colon + 1).trim()) {
      current.rows.push({
        label: trimmed.slice(0, colon).trim(),
        value: trimmed.slice(colon + 1).trim(),
      });
      continue;
    }

    current.paragraphs.push(trimmed);
  }

  return sections.filter((section) => section.rows.length > 0 || section.paragraphs.length > 0);
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
    input.postName && `Post: ${input.postName}`,
    input.organisationName && `Organisation: ${input.organisationName}`,
    input.department && `Department: ${input.department}`,
    input.speciality && `Speciality: ${input.speciality}`,
    input.location && `Location: ${input.location}`,
    input.numberOfPosts != null && input.numberOfPosts !== '' && `Number of Posts: ${input.numberOfPosts}`,
    input.jobType && `Job Type: ${input.jobType}`,
  ]);
  add('ELIGIBILITY', [
    input.qualification && `Qualification: ${input.qualification}`,
    input.experience && `Experience: ${input.experience}`,
    input.ageLimit && `Age Limit: ${input.ageLimit}`,
    input.otherEligibility,
    ...(input.extraNotes || []),
  ]);
  add('PAY / SALARY', [input.salary]);
  add('APPLICATION DETAILS', [
    input.applicationStartDate && `Application Start Date: ${input.applicationStartDate}`,
    input.applicationLastDate && `Last Date to Apply: ${input.applicationLastDate}`,
    input.applicationFee && `Application Fee: ${input.applicationFee}`,
    input.selectionProcess && `Selection Process: ${input.selectionProcess}`,
  ]);
  add('IMPORTANT INSTRUCTIONS', [input.importantInstructions]);
  return lines.join('\n').trim();
}

export function displayJobDescription(job: any, extras: string[] = []) {
  const raw = preserveMultiline(job?.description);
  const collapsed = raw.replace(/\s+/g, ' ').trim();
  if (/^JOB DETAILS/i.test(raw) || /^JOB DETAILS/i.test(collapsed)) {
    const restored = restoreStructuredDescription(raw);
    const notes = leftoverEligibilityNotes(job?.qualification, job?.experience, job?.requirements, ...extras);
    return notes.length ? `${restored}\n\nIMPORTANT INSTRUCTIONS\n\n${notes.join('\n')}` : restored;
  }
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
  }) || raw;
}
