import { VacancyRecord, Recruitment } from '../api/recruitments';
import { cleanExtractedName } from './extractedFieldDisplay';

export interface DepartmentBreakdown {
  department: string;
  positions: Record<string, number>;
  total: number;
}

export interface ParsedBreakdownResult {
  breakdownMap: Map<string, DepartmentBreakdown>;
  availablePositions: string[];
}

const RESERVED_COLUMN_PATTERNS = [
  /^(s\.?\s*no\.?|sl\.?\s*no\.?|sr\.?\s*no\.?|#|serial(\s*no\.?)?)$/i,
  /^(department|dept\.?|speciality|specialty|specialization|discipline|subject|branch|name\s*of\s*(post|dept|department|speciality)?)$/i,
  /^(total|grand\s*total|total\s*(posts?|vacanc(y|ies))|sum|posts?|vacanc(y|ies)|no\.?\s*of\s*(posts?|vacanc(y|ies))|number\s*of\s*(posts?|vacanc(y|ies)))$/i,
  /^(ur|unreserved|gen|general|sc|st|obc|ews|pwd|pwbd|ph|sebc|mbc|open|vjnt(\s*\([a-d]\))?|nt(\s*\([a-d]\))?|sbc)(\s*\([^)]*\))?$/i,
  /^(category|community|caste|social\s*category)(\s*(breakup|bifurcation|distribution|details?|break\s*down))?$/i,
  /^(remuneration|salary|pay|stipend|honorarium|ctc|package|scale|pay\s*scale|monthly(\s*remuneration|\s*salary)?|emoluments?)$/i,
  /^(place\s*of\s*posting|posting|location|station|unit|facility|hospital|centre|center)$/i,
  /^(qualification|eligibility|education|experience|exp\.?|age|age\s*limit|remarks?|notes?)$/i,
  /^(date(\s*of\s*(interview|walk[- ]?in|exam|test))?|interview(\s*date)?|walk[- ]?in(\s*date)?|time|reporting(\s*time)?|interview\s*time|venue|place(\s*(&|and)?\s*reporting\s*time)?|schedule)$/i,
];

const STANDARD_ACADEMIC_ORDER = [
  'professor',
  'additional professor',
  'associate professor',
  'assistant professor',
  'senior resident',
  'junior resident',
  'tutor',
  'demonstrator',
  'part time specialist',
  'full time specialist',
  'resident specialist',
  'pt/ft specialist',
  'specialist',
  'general physician',
  'chest physician',
  'neuro physician',
  'medical officer',
  'emergency medical officer',
  'lady medical officer',
  'female medical officer',
  'consultant',
  'pgmo',
  'gdmo',
];

export function stripCountSuffix(text: string): string {
  return String(text || '')
    .replace(/[-–—:]\s*\d+\s*(?:posts?|vacanc(?:y|ies))?\s*$/i, '')
    .replace(/\(\s*\d+\s*(?:posts?|vacanc(?:y|ies))?\s*\)\s*$/i, '')
    .trim();
}

export function getDeptTokens(name: string): string[] {
  const stripped = stripCountSuffix(name);
  return stripped
    .toLowerCase()
    .replace(/[&/\\(),:;.\-_–—[\]]/g, ' ')
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 3 && !['and', 'for', 'the', 'dept', 'department'].includes(w));
}

export function getSortedTokenKey(name: string): string {
  const tokens = getDeptTokens(name);
  tokens.sort();
  return tokens.join('');
}

export function normalizeDeptKey(name: string): string {
  const stripped = stripCountSuffix(name);
  return String(stripped || '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

export function toCleanTitleCase(text: string): string {
  const words = text
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .split(' ');
  return words
    .map((w) => {
      if (w === '&' || w === 'and' || w === 'of' || w === 'in' || w === 'for') return w;
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(' ');
}

function convertHtmlTablesToMarkdown(text: string): string {
  if (!/<table[\s>]/i.test(text) || !/<tr[\s>]/i.test(text)) return text;
  return text.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (_, tableContent) => {
    const rowMatches = tableContent.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);
    if (!rowMatches || rowMatches.length === 0) return '';
    const rows: string[] = [];
    rowMatches.forEach((rm: string, idx: number) => {
      const cellMatches = rm.match(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi);
      if (!cellMatches) return;
      const cells = cellMatches.map((c) => c.replace(/<[^>]+>/g, '').trim());
      rows.push(`| ${cells.join(' | ')} |`);
      if (idx === 0) {
        rows.push(`| ${cells.map(() => '---').join(' | ')} |`);
      }
    });
    return '\n\n' + rows.join('\n') + '\n\n';
  });
}

function isReservedColumn(header: string): boolean {
  const clean = header
    .replace(/[*_#`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Known doctor positions and abbreviations must NEVER be treated as reserved
  if (/^(sr|jr|mo|prof|tutor|faculty|specialist|emo|fmo|lmo|pgmo|gdmo)$/i.test(clean)) return false;
  if (
    /^(part[- ]?time\s*specialist|full[- ]?time\s*specialist|resident\s*specialist|pt\/ft\s*(contractual\s*)?specialist|senior\s*resident|junior\s*resident|assistant\s*professor|associate\s*professor|additional\s*professor|professor|medical\s*officer|general\s*physician|chest\s*physician|neuro\s*physician|female\s*medical\s*officer|lady\s*medical\s*officer|emergency\s*medical\s*officer|tutor|demonstrator|specialist|consultant|pgmo|gdmo)$/i.test(
      clean
    )
  ) {
    return false;
  }

  // Never allow category, date, time, interview, venue, remarks, salary, eligibility, etc.
  if (
    /\b(category|break[- ]?up|bifurcat(ion)?|distribut(ion)?|interview|walk[- ]?in|reporting|venue|schedule|date|dates|time|timing|timings|qualification|eligib(ility)?|experien(ce)?|remunerat(ion)?|salary|stipend|honorarium|emolument|pay|posting|station|location|remark|remarks|note|notes|criteria)\b/i.test(
      clean
    )
  ) {
    return true;
  }

  // Pure count / vacancy headers
  if (/^(total\s*)?(no\.?\s*of\s*)?(posts?|vacanc(y|ies)|seats?)(\s*\([^)]*\))?$/i.test(clean)) {
    return true;
  }

  return RESERVED_COLUMN_PATTERNS.some((pattern) => pattern.test(clean));
}

export const KNOWN_DESIGNATIONS: Array<{ regex: RegExp; name: string }> = [
  { regex: /(?<!assistant\s+|asst\.?\s*|associate\s+|assoc\.?\s*|additional\s+|addl\.?\s*)\bprof(essor)?\b/i, name: 'Professor' },
  { regex: /\b(associate|assoc\.?)\s*prof(essor)?\b/i, name: 'Associate Professor' },
  { regex: /\b(assistant|asst\.?)\s*prof(essor)?\b/i, name: 'Assistant Professor' },
  { regex: /\b(additional|addl\.?)\s*prof(essor)?\b/i, name: 'Additional Professor' },
  { regex: /\b(senior\s*resident|sr\.?\s*resident)\b|(?<![a-zA-Z0-9])sr(?![a-zA-Z0-9])/i, name: 'Senior Resident' },
  { regex: /\b(junior\s*resident|jr\.?\s*resident)\b|(?<![a-zA-Z0-9])jr(?![a-zA-Z0-9])/i, name: 'Junior Resident' },
  { regex: /\btutor\b/i, name: 'Tutor' },
  { regex: /\bdemonstrator\b/i, name: 'Demonstrator' },
  { regex: /\b(part[- ]?time\s*specialist|pts)\b/i, name: 'Part Time Specialist' },
  { regex: /\b(full[- ]?time\s*specialist|fts)\b/i, name: 'Full Time Specialist' },
  { regex: /\b(resident\s*specialist)\b/i, name: 'Resident Specialist' },
  { regex: /\b(pt\/ft\s*(contractual\s*)?specialist)\b/i, name: 'PT/FT Specialist' },
  { regex: /(?<!part[- ]?time\s+|full[- ]?time\s+|resident\s+|pt\/ft\s+)\bspecialist\b/i, name: 'Specialist' },
  { regex: /\b(female\s*medical\s*officer|fmo)\b/i, name: 'Female Medical Officer' },
  { regex: /\b(lady\s*medical\s*officer|lmo)\b/i, name: 'Lady Medical Officer' },
  { regex: /\bgeneral\s*physician\b/i, name: 'General Physician' },
  { regex: /\bchest\s*physician\b/i, name: 'Chest Physician' },
  { regex: /\bneuro\s*physician\b/i, name: 'Neuro Physician' },
  { regex: /\b(emergency\s*medical\s*officer|medical\s*officer\s*\(?emo\)?|emo)\b/i, name: 'Emergency Medical Officer' },
  { regex: /(?<!female\s+|lady\s+|emergency\s+|casualty\s+|dental\s+|chief\s+|ayush\s+)\b(medical\s*officer|mo)\b/i, name: 'Medical Officer' },
  { regex: /\bconsultant\b/i, name: 'Consultant' },
  { regex: /\bpgmo\b/i, name: 'PGMO' },
  { regex: /\bgdmo\b/i, name: 'GDMO' },
];

export function extractPositionsFromText(text?: string): string[] {
  if (!text) return [];
  const found = new Set<string>();
  for (const item of KNOWN_DESIGNATIONS) {
    if (item.regex.test(text)) {
      found.add(item.name);
    }
  }
  return Array.from(found);
}

export function standardizePositionName(raw: string): string {
  const clean = raw.trim();
  if (/^(female\s*medical\s*officer|fmo)$/i.test(clean)) {
    return 'Female Medical Officer';
  }
  if (/^(lady\s*medical\s*officer|lmo)$/i.test(clean)) {
    return 'Lady Medical Officer';
  }
  if (/^general\s*physician$/i.test(clean)) {
    return 'General Physician';
  }
  if (/^chest\s*physician$/i.test(clean)) {
    return 'Chest Physician';
  }
  if (/^neuro\s*physician$/i.test(clean)) {
    return 'Neuro Physician';
  }
  if (/^(emergency\s*medical\s*officer|medical\s*officer\s*\(?emo\)?|emo)$/i.test(clean)) {
    return 'Emergency Medical Officer';
  }
  if (/^(senior\s*resident|sr\.?\s*resident|sr\.?)$/i.test(clean)) {
    return 'Senior Resident';
  }
  if (/^(junior\s*resident|jr\.?\s*resident|jr\.?)$/i.test(clean)) {
    return 'Junior Resident';
  }
  if (/^(medical\s*officer|mo\.?|gdmo)$/i.test(clean)) {
    return 'Medical Officer';
  }
  if (/^(assistant\s*prof(essor)?\.?|asst\.?\s*prof(essor)?\.?)$/i.test(clean)) {
    return 'Assistant Professor';
  }
  if (/^(associate\s*prof(essor)?\.?|assoc\.?\s*prof(essor)?\.?)$/i.test(clean)) {
    return 'Associate Professor';
  }
  if (/^(additional\s*prof(essor)?\.?|addl\.?\s*prof(essor)?\.?)$/i.test(clean)) {
    return 'Additional Professor';
  }
  if (/^(professor\.?|prof\.?)$/i.test(clean)) {
    return 'Professor';
  }
  if (/^tutor\.?$/i.test(clean)) {
    return 'Tutor';
  }
  if (/^demonstrator\.?$/i.test(clean)) {
    return 'Demonstrator';
  }
  if (/^(part[- ]?time\s*specialist|pts)$/i.test(clean)) {
    return 'Part Time Specialist';
  }
  if (/^(full[- ]?time\s*specialist|fts)$/i.test(clean)) {
    return 'Full Time Specialist';
  }
  if (/^resident\s*specialist$/i.test(clean)) {
    return 'Resident Specialist';
  }
  if (/^pt\/ft\s*(contractual\s*)?specialist$/i.test(clean)) {
    return 'PT/FT Specialist';
  }
  if (/^pgmo$/i.test(clean)) {
    return 'PGMO';
  }
  if (/^gdmo$/i.test(clean)) {
    return 'GDMO';
  }
  if (/^specialist\.?$/i.test(clean)) {
    return 'Specialist';
  }
  if (/^consultant\.?$/i.test(clean)) {
    return 'Consultant';
  }
  const matched = extractPositionsFromText(clean);
  if (matched.length === 1) {
    return matched[0];
  }
  return toCleanTitleCase(clean);
}

export function sortPositions(positions: string[]): string[] {
  return [...positions].sort((a, b) => {
    const aLower = a.toLowerCase();
    const bLower = b.toLowerCase();
    const aIdx = STANDARD_ACADEMIC_ORDER.indexOf(aLower);
    const bIdx = STANDARD_ACADEMIC_ORDER.indexOf(bLower);
    if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
    if (aIdx !== -1) return -1;
    if (bIdx !== -1) return 1;
    return a.localeCompare(b);
  });
}

/**
 * Extracts distinct positions from vacancy post names
 * Handles composite values like "Senior Resident / Junior Resident"
 */
function extractPositionsFromVacancies(vacancies?: VacancyRecord[]): string[] {
  if (!vacancies || vacancies.length === 0) return [];
  const found = new Set<string>();

  for (const v of vacancies) {
    const pName = (v.postName || '').trim();
    if (!pName) continue;

    const fromKnown = extractPositionsFromText(pName);
    fromKnown.forEach((p) => found.add(p));

    const parts = pName.split(/[,;/]|\band\b|&/i).map((s) => s.trim()).filter(Boolean);
    if (parts.length > 1) {
      for (const part of parts) {
        if (part.length >= 2 && !isReservedColumn(part)) {
          found.add(standardizePositionName(part));
        }
      }
    } else if (pName.length >= 2 && !isReservedColumn(pName) && fromKnown.length === 0) {
      found.add(standardizePositionName(pName));
    }

    if (v.category) {
      const fromCat = extractPositionsFromText(v.category);
      fromCat.forEach((p) => found.add(p));
    }
  }

  return Array.from(found);
}

export function matchesPositionName(targetText: string, selectedPosition: string): boolean {
  if (!targetText || !selectedPosition) return false;
  const normText = targetText.toLowerCase();
  const normSel = selectedPosition.toLowerCase().trim();

  if (normText === normSel) return true;

  if (normSel === 'female medical officer') {
    return /\b(female\s*medical\s*officer|fmo)\b/i.test(normText);
  }

  if (normSel === 'lady medical officer') {
    return /\b(lady\s*medical\s*officer|lmo)\b/i.test(normText);
  }

  if (normSel === 'general physician') {
    return /\bgeneral\s*physician\b/i.test(normText);
  }

  if (normSel === 'chest physician') {
    return /\bchest\s*physician\b/i.test(normText);
  }

  if (normSel === 'neuro physician') {
    return /\bneuro\s*physician\b/i.test(normText);
  }

  if (normSel === 'emergency medical officer') {
    return /\b(emergency\s*medical\s*officer|medical\s*officer\s*\(?emo\)?|emo)\b/i.test(normText);
  }

  if (normSel === 'medical officer') {
    if (/(female|lady|emergency|casualty|dental|ayush)\s*medical\s*officer/i.test(normText)) {
      return false;
    }
    return /\b(medical\s*officer|mo|gdmo)\b/i.test(normText);
  }

  if (normSel === 'professor') {
    const profRegex = /(?<!assistant\s+|asst\.?\s*|associate\s+|assoc\.?\s*|additional\s+|addl\.?\s*)\bprof(essor)?\b/i;
    return profRegex.test(normText);
  }

  if (normSel === 'associate professor') {
    return /\b(associate|assoc\.?)\s*prof(essor)?\b/i.test(normText);
  }

  if (normSel === 'assistant professor') {
    return /\b(assistant|asst\.?)\s*prof(essor)?\b/i.test(normText);
  }

  if (normSel === 'additional professor') {
    return /\b(additional|addl\.?)\s*prof(essor)?\b/i.test(normText);
  }

  if (normSel === 'senior resident') {
    return /\b(senior\s*resident|sr\.?\s*resident)\b|(?<![a-zA-Z0-9])sr(?![a-zA-Z0-9])/i.test(normText);
  }

  if (normSel === 'junior resident') {
    return /\b(junior\s*resident|jr\.?\s*resident)\b|(?<![a-zA-Z0-9])jr(?![a-zA-Z0-9])/i.test(normText);
  }

  if (normSel === 'part time specialist') {
    return /\b(part[- ]?time\s*specialist|pts)\b/i.test(normText);
  }

  if (normSel === 'full time specialist') {
    return /\b(full[- ]?time\s*specialist|fts)\b/i.test(normText);
  }

  if (normSel === 'resident specialist') {
    return /\b(resident\s*specialist)\b/i.test(normText);
  }

  if (normSel === 'pt/ft specialist') {
    return /\b(pt\/ft\s*(contractual\s*)?specialist)\b/i.test(normText);
  }

  if (normSel === 'specialist') {
    if (/(part[- ]?time|full[- ]?time|resident|pt\/ft)\s*(contractual\s*)?specialist/i.test(normText)) {
      return false;
    }
    return /\bspecialist\b/i.test(normText);
  }

  if (normSel === 'pgmo') {
    return /\bpgmo\b/i.test(normText);
  }

  if (normSel === 'gdmo') {
    return /\bgdmo\b/i.test(normText);
  }

  const escaped = normSel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\b${escaped}\\b`, 'i').test(normText);
}

/**
 * Extracts a specific position's count from text like:
 * "Senior Resident: 4, Junior Resident: 3" or "SR: 4, JR: 3"
 */
export function extractPositionCountFromText(text: string, selectedPosition: string): number | null {
  if (!text || !selectedPosition) return null;
  const selLower = selectedPosition.toLowerCase().trim();

  const patterns: RegExp[] = [];
  if (selLower === 'senior resident') {
    patterns.push(/(?:senior\s*resident|sr\.?\s*resident|(?<!\w)sr(?!\w))\s*[:\-–—]?\s*(\d+)/i);
  } else if (selLower === 'junior resident') {
    patterns.push(/(?:junior\s*resident|jr\.?\s*resident|(?<!\w)jr(?!\w))\s*[:\-–—]?\s*(\d+)/i);
  } else if (selLower === 'female medical officer') {
    patterns.push(/(?:female\s*medical\s*officer|(?<!\w)fmo(?!\w))\s*[:\-–—]?\s*(\d+)/i);
  } else if (selLower === 'lady medical officer') {
    patterns.push(/(?:lady\s*medical\s*officer|(?<!\w)lmo(?!\w))\s*[:\-–—]?\s*(\d+)/i);
  } else if (selLower === 'general physician') {
    patterns.push(/(?:general\s*physician)\s*[:\-–—]?\s*(\d+)/i);
  } else if (selLower === 'chest physician') {
    patterns.push(/(?:chest\s*physician)\s*[:\-–—]?\s*(\d+)/i);
  } else if (selLower === 'neuro physician') {
    patterns.push(/(?:neuro\s*physician)\s*[:\-–—]?\s*(\d+)/i);
  } else if (selLower === 'emergency medical officer') {
    patterns.push(/(?:emergency\s*medical\s*officer|medical\s*officer\s*\(?emo\)?|(?<!\w)emo(?!\w))\s*[:\-–—]?\s*(\d+)/i);
  } else if (selLower === 'medical officer') {
    patterns.push(/(?<!female\s+|lady\s+|emergency\s+|casualty\s+|dental\s+)(?:medical\s*officer|(?<!\w)mo(?!\w))\s*[:\-–—]?\s*(\d+)/i);
  } else {
    const escaped = selLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    patterns.push(new RegExp(`${escaped}\\s*[:\\-–—]?\\s*(\\d+)`, 'i'));
  }

  for (const pat of patterns) {
    const m = text.match(pat);
    if (m) {
      return parseInt(m[1], 10);
    }
  }
  return null;
}

const splitLineToCells = (line: string): string[] => {
  let clean = line.trim();
  if (clean.includes('|')) {
    if (clean.startsWith('|')) clean = clean.slice(1);
    if (clean.endsWith('|')) clean = clean.slice(0, -1);
    return clean.split('|').map((c) => c.trim());
  }
  if (clean.includes('\t')) {
    return clean.split('\t').map((c) => c.trim()).filter(Boolean);
  }
  if (/\s{2,}/.test(clean)) {
    return clean.split(/\s{2,}/).map((c) => c.trim()).filter(Boolean);
  }
  return [];
};

/**
 * Parses markdown / HTML breakdown tables, vacancy records, and text lines to determine:
 * 1. availablePositions: dynamically discovered designations (Senior Resident, Junior Resident, etc.)
 * 2. breakdownMap: department -> per-position vacancy counts
 */
export function parseRecruitmentBreakdown(
  descriptionText?: string,
  vacancies?: VacancyRecord[],
  titleText?: string
): ParsedBreakdownResult {
  const breakdownMap = new Map<string, DepartmentBreakdown>();
  const positionsFound = new Set<string>();

  const rawText = descriptionText ? convertHtmlTablesToMarkdown(descriptionText) : '';

  // Pre-detect overall single cadre role if notice/title specifies one (e.g. "Senior Resident – 18 Posts" or "Senior Resident Recruitment")
  let defaultNoticeRole = '';
  if (titleText) {
    const fromTitle = extractPositionsFromText(titleText);
    if (fromTitle.length === 1) defaultNoticeRole = fromTitle[0];
  }
  if (!defaultNoticeRole && descriptionText) {
    const explicitRoleMatch = descriptionText.match(
      /(?:^|\n)\s*(?:#+\s*)?(?:(?:Post(?:\s*:\s*\d+)?|Role|Cadre)\s*[:\-–—*#•\s]*)?(Senior Resident|Junior Resident|Medical Officer|Professor|Associate Professor|Assistant Professor|Additional Professor|Tutor|Demonstrator|Part[- ]?Time Specialist|Resident Specialist|Full[- ]?Time Specialist|PT\/FT Specialist|PGMO|GDMO|Specialist|Consultant)\s*[:\-–—]\s*(?:\d+\s*posts?|\d+\s*vacanc(?:y|ies))/i
    );
    if (explicitRoleMatch) {
      defaultNoticeRole = standardizePositionName(explicitRoleMatch[1]);
    } else {
      const fromDesc = extractPositionsFromText(descriptionText);
      if (fromDesc.length === 1) defaultNoticeRole = fromDesc[0];
    }
  }
  if (!defaultNoticeRole && vacancies && vacancies.length > 0) {
    for (const v of vacancies) {
      const fromV = extractPositionsFromText(v.postName);
      if (fromV.length === 1) {
        defaultNoticeRole = fromV[0];
        break;
      }
    }
  }

  // 1. Process structured tables (Markdown, HTML, Tab-separated, Space-delimited)
  if (rawText) {
    const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

    // Group contiguous table lines
    const tableBlocks: string[][] = [];
    let currentBlock: string[] = [];

    for (const line of lines) {
      const isTableLine =
        line.includes('|') ||
        line.split('\t').length >= 3 ||
        line.split(/\s{2,}/).length >= 3;

      if (isTableLine) {
        currentBlock.push(line);
      } else {
        if (currentBlock.length >= 2) {
          tableBlocks.push(currentBlock);
        }
        currentBlock = [];
      }
    }
    if (currentBlock.length >= 2) {
      tableBlocks.push(currentBlock);
    }

    const processTableRows = (rows: string[]) => {
      if (rows.length < 2) return;
      const headerCells = splitLineToCells(rows[0]);
      if (headerCells.length < 2) return;

      // 1. Check if this is an Orientation B table (dedicated Post/Designation column AND Specialty/Department column)
      let postColIdx = -1;
      let deptColIndex = -1;
      let countColIdx = -1;

      headerCells.forEach((rawCell, idx) => {
        const cell = rawCell.replace(/[*_#`]/g, '').trim();
        if (/^(post|designation|name\s*of\s*post|cadre|role)$/i.test(cell)) {
          if (postColIdx === -1) postColIdx = idx;
        } else if (/^(department|dept\.?|speciality|specialty|specialization|discipline|subject|branch|name\s*of\s*(dept|department|speciality)?)$/i.test(cell)) {
          if (deptColIndex === -1) deptColIndex = idx;
        } else if (/^(total\s*)?(no\.?\s*of\s*)?(posts?|vacanc(y|ies)|seats?)(\s*\([^)]*\))?$/i.test(cell)) {
          if (countColIdx === -1) countColIdx = idx;
        }
      });

      if (postColIdx !== -1 && deptColIndex !== -1) {
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (/^[|:\-\s]+$/.test(row)) continue;
          const cells = splitLineToCells(row);
          if (cells.length <= Math.max(postColIdx, deptColIndex)) continue;

          const rawDept = cells[deptColIndex]?.replace(/[*#`]/g, '').trim();
          const rawPost = cells[postColIdx]?.replace(/[*#`]/g, '').trim();
          if (!rawDept || !rawPost) continue;

          // Skip total / summary rows
          if (/^(total|grand\s*total|all\s*specialt(y|ies)|all\s*departments?)\b/i.test(rawDept)) continue;
          if (/^(total|grand\s*total)\b/i.test(rawPost)) continue;

          const cleanDept = rawDept
            .replace(/^[\d]+\.?\s*/, '')
            .replace(/[*#]/g, '')
            .trim();
          if (!cleanDept || cleanDept.length < 2) continue;

          let count = 1;
          if (countColIdx !== -1 && cells.length > countColIdx) {
            const rawNum = (cells[countColIdx] || '').trim();
            const isTimeOrDate =
              /[:\/\-]/.test(rawNum) ||
              /\b(am|pm|hrs?|hours?)\b/i.test(rawNum) ||
              /\d{1,2}[./-]\d{1,2}[./-]\d{2,4}/.test(rawNum);
            if (!isTimeOrDate) {
              const digits = rawNum.replace(/[^0-9]/g, '');
              if (digits.length > 0 && digits.length <= 4) {
                const parsed = parseInt(digits, 10);
                if (parsed > 0 && parsed <= 500) {
                  count = parsed;
                }
              }
            }
          }

          const stdPost = standardizePositionName(rawPost);
          positionsFound.add(stdPost);

          const normKey = normalizeDeptKey(cleanDept);
          const existing = breakdownMap.get(normKey) || {
            department: cleanDept,
            positions: {},
            total: 0,
          };
          existing.positions[stdPost] = (existing.positions[stdPost] || 0) + count;
          existing.total = Object.values(existing.positions).reduce((sum, v) => sum + v, 0);
          breakdownMap.set(normKey, existing);
        }
        return;
      }

      // 2. Orientation A: Column-based position matrix (e.g. Department | Professor | Associate Professor | Total)
      const posCols: Array<{ index: number; name: string }> = [];

      headerCells.forEach((rawCell, idx) => {
        const cell = rawCell.replace(/[*_#`]/g, '').trim();
        if (/^(department|dept\.?|speciality|specialty|specialization|discipline|subject|branch|name\s*of\s*(dept|department|speciality)?)$/i.test(cell)) {
          if (deptColIndex === -1) deptColIndex = idx;
        } else if (!isReservedColumn(cell) && cell.length >= 2) {
          const stdName = standardizePositionName(cell);
          posCols.push({ index: idx, name: stdName });
          positionsFound.add(stdName);
        }
      });

      if (deptColIndex === -1 && posCols.length > 0) {
        for (let i = 0; i < headerCells.length; i++) {
          const c = headerCells[i].replace(/[*_#`]/g, '').trim();
          if (!isReservedColumn(c) && !posCols.some((p) => p.index === i)) {
            deptColIndex = i;
            break;
          }
        }
      }

      // 3. Orientation C: Single-Cadre Department Table (e.g. Department | No. of Posts | Category)
      if (deptColIndex !== -1 && posCols.length === 0 && countColIdx !== -1 && defaultNoticeRole) {
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (/^[|:\-\s]+$/.test(row)) continue;
          const cells = splitLineToCells(row);
          if (cells.length <= Math.max(deptColIndex, countColIdx)) continue;

          const rawDept = cells[deptColIndex]?.replace(/[*#`]/g, '').trim();
          if (!rawDept) continue;

          // Skip total / summary rows
          if (/^(total|grand\s*total|all\s*specialt(y|ies)|all\s*departments?)\b/i.test(rawDept)) continue;

          const cleanDept = rawDept
            .replace(/^[\d]+\.?\s*/, '')
            .replace(/[*#]/g, '')
            .trim();
          if (!cleanDept || cleanDept.length < 2) continue;

          let count = 1;
          const rawNum = (cells[countColIdx] || '').trim();
          const isTimeOrDate =
            /[:\/\-]/.test(rawNum) ||
            /\b(am|pm|hrs?|hours?)\b/i.test(rawNum) ||
            /\d{1,2}[./-]\d{1,2}[./-]\d{2,4}/.test(rawNum);
          if (!isTimeOrDate) {
            const digits = rawNum.replace(/[^0-9]/g, '');
            if (digits.length > 0 && digits.length <= 4) {
              const parsed = parseInt(digits, 10);
              if (parsed > 0 && parsed <= 500) {
                count = parsed;
              }
            }
          }

          positionsFound.add(defaultNoticeRole);
          const normKey = normalizeDeptKey(cleanDept);
          const existing = breakdownMap.get(normKey) || {
            department: cleanDept,
            positions: {},
            total: 0,
          };
          existing.positions[defaultNoticeRole] = (existing.positions[defaultNoticeRole] || 0) + count;
          existing.total = Object.values(existing.positions).reduce((sum, v) => sum + v, 0);
          breakdownMap.set(normKey, existing);
        }
        return;
      }

      // 4. Orientation D: Single-Cadre Reservation Matrix Table (e.g. Department | UR | OBC | SC | ST | EWS)
      const catCols: number[] = [];
      const reservationPattern = /^(ur|unreserved|gen|general|sc|st|obc|ews|pwd|pwbd|ph|vjnt(\s*\([a-d]\))?|nt(\s*\([a-d]\))?|sbc)(\s*\([^)]*\))?$/i;

      headerCells.forEach((rawCell, idx) => {
        const cell = rawCell.replace(/[*_#`]/g, '').trim();
        if (reservationPattern.test(cell)) {
          catCols.push(idx);
        }
      });

      if (deptColIndex !== -1 && posCols.length === 0 && catCols.length >= 2 && defaultNoticeRole) {
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (/^[|:\-\s]+$/.test(row)) continue;
          const cells = splitLineToCells(row);
          if (cells.length <= deptColIndex) continue;

          const rawDept = cells[deptColIndex]?.replace(/[*#`]/g, '').trim();
          if (!rawDept) continue;

          // Skip total / summary rows
          if (/^(total|grand\s*total|all\s*specialt(y|ies)|all\s*departments?)\b/i.test(rawDept)) continue;

          const cleanDept = rawDept
            .replace(/^[\d]+\.?\s*/, '')
            .replace(/[*#]/g, '')
            .trim();
          if (!cleanDept || cleanDept.length < 2) continue;

          let deptSum = 0;
          catCols.forEach((colIdx) => {
            if (cells.length > colIdx) {
              const rawVal = (cells[colIdx] || '').trim();
              if (!/[:\/\-]/.test(rawVal) && !/\b(am|pm)\b/i.test(rawVal)) {
                const digits = rawVal.replace(/[^0-9]/g, '');
                if (digits.length > 0 && digits.length <= 3) {
                  const n = parseInt(digits, 10);
                  if (n > 0 && n <= 200) deptSum += n;
                }
              }
            }
          });

          if (deptSum > 0) {
            positionsFound.add(defaultNoticeRole);
            const normKey = normalizeDeptKey(cleanDept);
            const existing = breakdownMap.get(normKey) || {
              department: cleanDept,
              positions: {},
              total: 0,
            };
            existing.positions[defaultNoticeRole] = (existing.positions[defaultNoticeRole] || 0) + deptSum;
            existing.total = Object.values(existing.positions).reduce((sum, v) => sum + v, 0);
            breakdownMap.set(normKey, existing);
          }
        }
        return;
      }

      if (deptColIndex === -1 || posCols.length === 0) return;

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (/^[|:\-\s]+$/.test(row)) continue;
        const cells = splitLineToCells(row);
        if (cells.length <= deptColIndex) continue;

        const rawDept = cells[deptColIndex]?.replace(/[*#`]/g, '').trim();
        if (!rawDept || /^(total|grand\s*total|all\s*specialt(y|ies)|all\s*departments?)\b/i.test(rawDept)) continue;

        const cleanDept = rawDept
          .replace(/^[\d]+\.?\s*/, '')
          .replace(/[*#]/g, '')
          .trim();
        if (!cleanDept || cleanDept.length < 2) continue;

        const normKey = normalizeDeptKey(cleanDept);
        const existing = breakdownMap.get(normKey) || {
          department: cleanDept,
          positions: {},
          total: 0,
        };

        posCols.forEach(({ index, name }) => {
          const rawNum = (cells[index] || '').trim();
          // Filter out time strings (10:30 AM, 2:00 PM), date strings (07.10.2026), colons, hyphens, or long strings
          if (
            /[:\/\-]/.test(rawNum) ||
            /\b(am|pm|hrs?|hours?)\b/i.test(rawNum) ||
            /\d{1,2}[./-]\d{1,2}[./-]\d{2,4}/.test(rawNum)
          ) {
            return;
          }
          const digits = rawNum.replace(/[^0-9]/g, '');
          if (digits.length === 0 || digits.length > 4) return;
          const num = parseInt(digits, 10) || 0;
          if (num > 500) return;
          existing.positions[name] = (existing.positions[name] || 0) + num;
        });

        existing.total = Object.values(existing.positions).reduce((sum, v) => sum + v, 0);
        breakdownMap.set(normKey, existing);
      }
    };

    tableBlocks.forEach(processTableRows);

    // 2. Line-by-line pattern detection (e.g. "Anesthesia: Senior Resident - 4, Junior Resident - 3" or "Anesthesia (SR: 4, JR: 3)")
    for (const line of lines) {
      if (line.includes('|')) continue;
      const deptMatch = line.match(/^[\d.*•\-\s]*([A-Za-z&/\s]{3,40}?)\s*[:\-–—(]\s*(?:(\d+)\s*(?:posts?|vacanc(?:y|ies))?\s*[,(])?\s*(.*)$/i);
      if (deptMatch) {
        const deptCandidate = deptMatch[1].trim();
        const rest = deptMatch[3] || '';
        const posMatches = [
          ...rest.matchAll(
            /(female\s*medical\s*officer|fmo|emergency\s*medical\s*officer|emo|senior\s*resident|junior\s*resident|\bsr\b|\bjr\b|professor|assistant\s*professor|associate\s*professor|tutor|demonstrator|part[- ]?time\s*specialist|resident\s*specialist|full[- ]?time\s*specialist|pt\/ft\s*specialist|specialist|pgmo|gdmo|medical\s*officer|consultant)\s*[:\-–—\s]?\s*(\d+)/gi
          ),
        ];
        if (posMatches.length > 0) {
          const normKey = normalizeDeptKey(deptCandidate);
          const existing = breakdownMap.get(normKey) || {
            department: deptCandidate,
            positions: {},
            total: 0,
          };
          for (const pm of posMatches) {
            const pName = standardizePositionName(pm[1]);
            const pCount = parseInt(pm[2], 10) || 0;
            existing.positions[pName] = (existing.positions[pName] || 0) + pCount;
            positionsFound.add(pName);
          }
          existing.total = Object.values(existing.positions).reduce((sum, v) => sum + v, 0);
          breakdownMap.set(normKey, existing);
        }
      }
    }

    // 3. Section-based parsing (e.g. "Senior Resident:\n1. Anesthesia - 4\n\nJunior Resident:\n1. Anesthesia - 3")
    let currentRoleSection = '';
    for (const line of lines) {
      const roleHeaderMatch = line.match(
        /^(?:#+\s*)?(?:Post\s*[:\-]\s*)?(Female\s*Medical\s*Officer|Emergency\s*Medical\s*Officer|Senior\s*Resident|Junior\s*Resident|Professor|Associate\s*Professor|Assistant\s*Professor|Additional\s*Professor|Tutor|Demonstrator|Part[- ]?Time\s*Specialist|Resident\s*Specialist|Full[- ]?Time\s*Specialist|PT\/FT\s*(?:Contractual\s*)?Specialist|Specialist|PGMO|GDMO|Medical\s*Officer|Consultant)\s*[:\-]?\s*(?:\(\d+\s*posts?\))?$/i
      );
      if (roleHeaderMatch) {
        currentRoleSection = standardizePositionName(roleHeaderMatch[1]);
        positionsFound.add(currentRoleSection);
        continue;
      }
      if (currentRoleSection) {
        const deptLineMatch = line.match(/^[-*•\d.)\s]*([A-Za-z&/\s]{3,40}?)\s*[:\-–—]\s*(\d+)\s*(?:posts?|vacanc(?:y|ies))?$/i);
        if (deptLineMatch) {
          const dName = deptLineMatch[1].trim();
          const dCount = parseInt(deptLineMatch[2], 10) || 0;
          if (dName.length >= 2 && dCount > 0) {
            const normKey = normalizeDeptKey(dName);
            const existing = breakdownMap.get(normKey) || {
              department: dName,
              positions: {},
              total: 0,
            };
            existing.positions[currentRoleSection] = (existing.positions[currentRoleSection] || 0) + dCount;
            existing.total = Object.values(existing.positions).reduce((sum, v) => sum + v, 0);
            breakdownMap.set(normKey, existing);
          }
        }
      }
    }
  }

  // 4. Extract breakdown directly from VacancyRecord objects (v.category, v.otherEligibilityRequirements)
  if (vacancies && vacancies.length > 0) {
    for (const v of vacancies) {
      const dName = v.department || v.speciality;
      if (!dName) continue;
      const normKey = normalizeDeptKey(dName);

      // Prevent double-counting: If this department was already parsed from the structured table (Step 1, 2, or 3),
      // do not add or duplicate from vacancy category strings!
      if (breakdownMap.has(normKey) && Object.keys(breakdownMap.get(normKey)!.positions).length > 0) {
        continue;
      }

      const toScan = [v.category, v.otherEligibilityRequirements, v.qualification, v.salary].filter(Boolean).join(' ');
      if (toScan) {
        const posMatches = [
          ...toScan.matchAll(
            /(female\s*medical\s*officer|fmo|emergency\s*medical\s*officer|emo|senior\s*resident|junior\s*resident|\bsr\b|\bjr\b|professor|assistant\s*professor|associate\s*professor|tutor|demonstrator|part[- ]?time\s*specialist|resident\s*specialist|full[- ]?time\s*specialist|pt\/ft\s*specialist|specialist|pgmo|gdmo|medical\s*officer|consultant)\s*[:\-–—\s]?\s*(\d+)/gi
          ),
        ];
        if (posMatches.length > 0) {
          const existing = breakdownMap.get(normKey) || {
            department: dName,
            positions: {},
            total: 0,
          };
          for (const pm of posMatches) {
            const pName = standardizePositionName(pm[1]);
            const pCount = parseInt(pm[2], 10) || 0;
            existing.positions[pName] = (existing.positions[pName] || 0) + pCount;
            positionsFound.add(pName);
          }
          existing.total = Object.values(existing.positions).reduce((sum, v) => sum + v, 0);
          breakdownMap.set(normKey, existing);
        }
      }

      // If vacancy has single specific postName
      const singleRole = extractPositionsFromText(v.postName);
      if (singleRole.length === 1) {
        const std = singleRole[0];
        positionsFound.add(std);
        const existing = breakdownMap.get(normKey) || {
          department: dName,
          positions: {},
          total: 0,
        };
        if (!existing.positions[std]) {
          existing.positions[std] = Number(v.numberOfVacancies || 0);
          existing.total = Object.values(existing.positions).reduce((sum, val) => sum + val, 0);
          breakdownMap.set(normKey, existing);
        }
      }
    }
  }

  // Combine positions from all sources
  const positionsFromVacancies = extractPositionsFromVacancies(vacancies);
  const positionsFromTitle = extractPositionsFromText(titleText);
  const positionsFromDesc = extractPositionsFromText(rawText?.slice(0, 2500));
  const combined = new Set<string>();

  positionsFound.forEach((p) => combined.add(p));
  positionsFromVacancies.forEach((p) => combined.add(p));
  positionsFromTitle.forEach((p) => combined.add(p));
  positionsFromDesc.forEach((p) => combined.add(p));

  let sortedPositions = sortPositions(Array.from(combined));

  if (sortedPositions.length === 0 && (vacancies?.length || 0) >= 2) {
    sortedPositions = ['Professor', 'Associate Professor', 'Assistant Professor'];
  }

  // Filter out any designation that has 0 vacancies across the entire breakdown
  if (sortedPositions.length > 0) {
    const activePositions = sortedPositions.filter((pos) => {
      let count = 0;
      if (breakdownMap.size > 0) {
        for (const bd of breakdownMap.values()) {
          for (const [pName, pCount] of Object.entries(bd.positions)) {
            if (standardizePositionName(pName).toLowerCase() === pos.toLowerCase()) {
              count += Number(pCount) || 0;
            }
          }
        }
      }
      if (count > 0) return true;
      if (vacancies && vacancies.length > 0) {
        return vacancies.some((v) => {
          const match = getVacancyPositionMatch(v, pos, breakdownMap);
          return match.matches && match.count > 0;
        });
      }
      return false;
    });

    sortedPositions = activePositions;
  }

  return {
    breakdownMap,
    availablePositions: sortedPositions,
  };
}

const ALIASES: Record<string, string[]> = {
  obsandgynae: ['obstetrics', 'gynaecology', 'gynecology', 'obsgynae', 'obg'],
  radiodiagnosis: ['radiology', 'radiodiagnosis', 'radio'],
  orthopaedics: ['orthopedics', 'orthopaedics', 'ortho'],
  paediatrics: ['pediatrics', 'paediatrics', 'paed', 'ped'],
  anaesthesia: ['anesthesiology', 'anaesthesiology', 'anaesthesia', 'anesthesia'],
  tbandchest: ['pulmonarymedicine', 'respiratorymedicine', 'chestmedicine', 'tbchest', 'pulmonary', 'chest'],
  generalmedicine: ['medicine', 'internalmedicine', 'generalmedicine'],
  generalsurgery: ['surgery', 'generalsurgery'],
};

export function findDepartmentBreakdown(
  breakdownMap: Map<string, DepartmentBreakdown>,
  departmentName: string
): DepartmentBreakdown | null {
  if (!departmentName || breakdownMap.size === 0) return null;
  const cleanName = stripCountSuffix(departmentName);
  const key = normalizeDeptKey(cleanName);

  // 1. Direct exact key match
  if (breakdownMap.has(key)) {
    return breakdownMap.get(key)!;
  }

  // 2. Token-set sorted exact match (handles inverted names e.g. "(Psychiatry) Clinical Psychology" vs "Clinical Psychology (Psychiatry)")
  const deptSortedKey = getSortedTokenKey(cleanName);
  if (deptSortedKey) {
    for (const item of breakdownMap.values()) {
      if (getSortedTokenKey(item.department) === deptSortedKey) {
        return item;
      }
    }
  }

  // 3. Multi-subspecialty matching & merging:
  // When the vacancy is a compound specialty (e.g. "Clinical Psychology (Psychiatry)")
  // and the breakdown map contains individual sub-specialties (e.g. "Psychiatry" and "Clinical Psychology"),
  // merge their positions into a combined breakdown!
  const deptTokens = getDeptTokens(cleanName);
  if (deptTokens.length > 1) {
    const subSpecialtyMatches: DepartmentBreakdown[] = [];
    for (const item of breakdownMap.values()) {
      const itemTokens = getDeptTokens(item.department);
      if (
        itemTokens.length > 0 &&
        itemTokens.length < deptTokens.length &&
        itemTokens.every((t) => deptTokens.includes(t))
      ) {
        subSpecialtyMatches.push(item);
      }
    }

    if (subSpecialtyMatches.length > 0) {
      if (subSpecialtyMatches.length === 1) {
        return subSpecialtyMatches[0];
      }
      const mergedPositions: Record<string, number> = {};
      let total = 0;
      for (const it of subSpecialtyMatches) {
        for (const [pos, count] of Object.entries(it.positions)) {
          mergedPositions[pos] = (mergedPositions[pos] || 0) + Number(count || 0);
          total += Number(count || 0);
        }
      }
      return {
        department: cleanName,
        positions: mergedPositions,
        total,
      };
    }
  }

  // 4. Bidirectional substring inclusion fallback
  for (const [mapKey, item] of breakdownMap.entries()) {
    if (mapKey.length >= 4 && key.length >= 4 && (mapKey.includes(key) || key.includes(mapKey))) {
      return item;
    }
  }

  // 5. Aliases
  for (const [aliasRoot, aliasList] of Object.entries(ALIASES)) {
    const matchesTarget = aliasList.some((a) => key.includes(a));
    if (matchesTarget) {
      for (const [mapKey, item] of breakdownMap.entries()) {
        if (mapKey.includes(aliasRoot) || aliasList.some((a) => mapKey.includes(a))) {
          return item;
        }
      }
    }
  }

  return null;
}

export function getVacancyPositionMatch(
  vacancy: VacancyRecord,
  selectedPosition: string,
  breakdownMap: Map<string, DepartmentBreakdown> | null
): { matches: boolean; count: number } {
  if (!selectedPosition || selectedPosition === 'All Positions') {
    return { matches: true, count: Number(vacancy.numberOfVacancies || 0) };
  }

  // 1. Table breakdown resolution
  if (breakdownMap && breakdownMap.size > 0) {
    const rawDept = vacancy.department || vacancy.speciality || vacancy.postName;
    const deptName = stripCountSuffix(cleanExtractedName(rawDept));
    const item = findDepartmentBreakdown(breakdownMap, deptName);
    if (item) {
      let count = 0;
      let posFound = false;
      const selNorm = selectedPosition.trim().toLowerCase();

      for (const [pos, c] of Object.entries(item.positions)) {
        if (pos.toLowerCase() === selNorm || matchesPositionName(pos, selectedPosition)) {
          count = c;
          posFound = true;
          break;
        }
      }

      if (posFound) {
        return { matches: count > 0, count };
      }
      return { matches: false, count: 0 };
    }
  }

  // 2. Direct count extraction from vacancy category / requirements
  const catText = [vacancy.category, vacancy.otherEligibilityRequirements, vacancy.qualification, vacancy.salary]
    .filter(Boolean)
    .join(' ');
  if (catText) {
    const directCount = extractPositionCountFromText(catText, selectedPosition);
    if (directCount !== null) {
      return { matches: directCount > 0, count: directCount };
    }
  }

  // 3. Single designation check on postName
  const pName = (vacancy.postName || '').trim();
  const designations = extractPositionsFromText(pName);

  if (designations.length === 1) {
    if (matchesPositionName(designations[0], selectedPosition)) {
      const c = Number(vacancy.numberOfVacancies || 0);
      return { matches: c > 0, count: c };
    }
    return { matches: false, count: 0 };
  }

  // 4. Composite postName (e.g. "Professor / Associate Professor / Assistant Professor" or "Senior Resident / Junior Resident")
  if (
    matchesPositionName(pName, selectedPosition) ||
    designations.some((d) => matchesPositionName(d, selectedPosition))
  ) {
    const c = Number(vacancy.numberOfVacancies || 0);
    return { matches: c > 0, count: c };
  }

  return { matches: false, count: 0 };
}

/**
 * Automatically augments a recruitment's vacancy records with departments discovered
 * in the parsed breakdown map (e.g. from the structured table or specialty vacancy list)
 * that may not have been explicitly created as separate database rows.
 * This guarantees multi-department explorer views work seamlessly even if the recruitment
 * was initially saved with only a partial or single department record.
 */
export function augmentRecruitmentWithBreakdown(
  recruitment: Recruitment | null,
  breakdownMap: Map<string, DepartmentBreakdown> | null
): Recruitment | null {
  if (!recruitment) return null;
  if (!breakdownMap || breakdownMap.size === 0) return recruitment;

  const existing = [...(recruitment.vacancies || [])];
  const coveredDepts = new Set<string>();

  for (const v of existing) {
    const d = v.department || v.speciality || v.postName;
    if (d) {
      coveredDepts.add(normalizeDeptKey(d));
    }
  }

  const templateVacancy = existing[0];
  let extraIndex = 0;
  let added = false;

  for (const [key, bd] of breakdownMap.entries()) {
    let alreadyCovered = coveredDepts.has(key);
    if (!alreadyCovered) {
      for (const covered of coveredDepts) {
        if (covered.includes(key) || key.includes(covered)) {
          alreadyCovered = true;
          break;
        }
      }
    }

    if (!alreadyCovered && bd.department && bd.total > 0) {
      extraIndex++;
      added = true;
      const newVac: VacancyRecord = {
        id: `${recruitment.id}-auto-dept-${extraIndex}`,
        postName: bd.department,
        department: bd.department,
        speciality: bd.department,
        numberOfVacancies: bd.total,
        category: templateVacancy?.category || 'Medical',
        qualification: templateVacancy?.qualification || 'As per official notification',
        experience: templateVacancy?.experience || 'As per official notification',
        salary: templateVacancy?.salary || 'As per official notification',
        ageLimit: templateVacancy?.ageLimit,
        location: templateVacancy?.location || recruitment.location,
        jobType: templateVacancy?.jobType || 'Full Time',
        status: 'PUBLISHED',
        publishedJobId: templateVacancy?.publishedJobId,
        lastDate: templateVacancy?.lastDate || recruitment.applicationLastDate,
      };
      existing.push(newVac);
      coveredDepts.add(key);
    }
  }

  if (!added) return recruitment;

  return {
    ...recruitment,
    vacancies: existing,
  };
}
