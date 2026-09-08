const REGULATORY = /gazette of india|nmc norms|national medical commission|as per nmc|as per the nmc/i;
const GENERIC_NOTICE = /^(as per (the )?(official )?(recruitment )?notification|as notified|see notification|as applicable)\.?$/i;
const TRAILING_NORMS = /\s*(as per nmc.*|published in the gazette.*)$/i;
const USELESS_LOCATION = /^(multiple( locations?)?|anywhere|any location|all locations|n\/?a|na|tbd|various|pan india|pan-india)$/i;

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

export function isUselessLocation(value: unknown) {
  const raw = text(value);
  return !raw || USELESS_LOCATION.test(raw);
}

export function cardLocationText(...values: unknown[]) {
  for (const value of values) {
    const raw = text(value);
    if (raw && !isUselessLocation(raw) && !isRegulatoryDump(raw)) return raw;
  }
  return '';
}

export function locationFromOrganisation(value: unknown) {
  const parts = text(value).split(',').map((part) => part.trim()).filter(Boolean);
  if (parts.length < 2) return '';
  const last = parts[parts.length - 1];
  if (last.length < 3 || last.length > 40) return '';
  if (/limited|pvt|private|hospital|college|institute|university|trust/i.test(last)) return '';
  return isUselessLocation(last) ? '' : last;
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
  const raw = text(job?.description);
  if (/^JOB DETAILS/i.test(raw)) {
    const notes = leftoverEligibilityNotes(job?.qualification, job?.experience, job?.requirements, ...extras);
    return notes.length ? `${raw}\n\nIMPORTANT INSTRUCTIONS\n\n${notes.join('\n')}` : raw;
  }
  return buildStructuredJobDescription({
    postName: job?.displayTitle || job?.title,
    organisationName: job?.organization || job?.organisationName || job?.employer?.companyName,
    department: cleanExtractedName(job?.department),
    speciality: cleanExtractedName(job?.speciality),
    location: cardLocationText(job?.location, job?.city, job?.state, locationFromOrganisation(job?.organization || job?.organisationName)),
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
