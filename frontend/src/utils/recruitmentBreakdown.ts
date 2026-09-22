import { VacancyRecord } from '../api/recruitments';
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
  /^(s\.?\s*no\.?|sl\.?\s*no\.?|sr\.?\s*no\.?|no\.?|#)$/i,
  /^(department|dept\.?|speciality|specialty|discipline|subject|name\s*of\s*(post|dept|department|speciality)?)$/i,
  /^(total|grand\s*total|total\s*(posts?|vacanc(y|ies))|sum)$/i,
  /^(ur|unreserved|gen|general|sc|st|obc|ews|pwd|pwbd|ph)$/i,
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
  'specialist',
  'medical officer',
  'consultant',
];

export function normalizeDeptKey(name: string): string {
  return String(name || '')
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
  const clean = header.trim();
  return RESERVED_COLUMN_PATTERNS.some((pattern) => pattern.test(clean));
}

function standardizePositionName(raw: string): string {
  const clean = raw.trim();
  if (/^assistant\s*prof(essor)?\.?$/i.test(clean) || /^asst\.?\s*prof(essor)?\.?$/i.test(clean)) {
    return 'Assistant Professor';
  }
  if (/^associate\s*prof(essor)?\.?$/i.test(clean) || /^assoc\.?\s*prof(essor)?\.?$/i.test(clean)) {
    return 'Associate Professor';
  }
  if (/^additional\s*prof(essor)?\.?$/i.test(clean) || /^addl\.?\s*prof(essor)?\.?$/i.test(clean)) {
    return 'Additional Professor';
  }
  if (/^professor\.?$/i.test(clean) || /^prof\.?$/i.test(clean)) {
    return 'Professor';
  }
  if (/^senior\s*resident\.?$/i.test(clean) || /^sr\.?$/i.test(clean)) {
    return 'Senior Resident';
  }
  if (/^junior\s*resident\.?$/i.test(clean) || /^jr\.?$/i.test(clean)) {
    return 'Junior Resident';
  }
  if (/^medical\s*officer\.?$/i.test(clean) || /^mo\.?$/i.test(clean)) {
    return 'Medical Officer';
  }
  return toCleanTitleCase(clean);
}

function sortPositions(positions: string[]): string[] {
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
 * Handles composite values like "Professor, Associate Professor, Assistant Professor"
 */
function extractPositionsFromVacancies(vacancies?: VacancyRecord[]): string[] {
  if (!vacancies || vacancies.length === 0) return [];
  const found = new Set<string>();

  for (const v of vacancies) {
    const pName = (v.postName || '').trim();
    if (!pName) continue;

    // Check if composite (e.g. comma, slash, semicolon, or "&" separated)
    const parts = pName.split(/[,;/]|\band\b|&/i).map((s) => s.trim()).filter(Boolean);
    if (parts.length > 1) {
      for (const part of parts) {
        if (part.length >= 3 && !isReservedColumn(part)) {
          found.add(standardizePositionName(part));
        }
      }
    } else if (pName.length >= 3 && !isReservedColumn(pName)) {
      found.add(standardizePositionName(pName));
    }
  }

  return Array.from(found);
}

/**
 * Parses markdown / HTML breakdown tables and vacancy records to determine:
 * 1. availablePositions: dynamically discovered designations (Professor, Assistant Professor, etc.)
 * 2. breakdownMap: department -> per-position vacancy counts
 */
export function parseRecruitmentBreakdown(
  descriptionText?: string,
  vacancies?: VacancyRecord[]
): ParsedBreakdownResult {
  const breakdownMap = new Map<string, DepartmentBreakdown>();
  const positionsFromTable = new Set<string>();

  const rawText = descriptionText ? convertHtmlTablesToMarkdown(descriptionText) : '';

  if (rawText && rawText.includes('|')) {
    const lines = rawText.split(/\r?\n/).map((l) => l.trim());
    let currentTableRows: string[] = [];

    const processTable = (rows: string[]) => {
      if (rows.length < 2) return;
      const headerLine = rows[0];
      const headerCells = headerLine
        .split('|')
        .slice(1, -1)
        .map((c) => c.trim());

      let deptColIndex = -1;
      const posCols: Array<{ index: number; name: string }> = [];

      headerCells.forEach((cell, idx) => {
        if (/^(department|dept\.?|speciality|specialty|discipline|subject|name\s*of)/i.test(cell)) {
          if (deptColIndex === -1) deptColIndex = idx;
        } else if (!isReservedColumn(cell) && cell.length >= 2) {
          const stdName = standardizePositionName(cell);
          posCols.push({ index: idx, name: stdName });
          positionsFromTable.add(stdName);
        }
      });

      // If no explicit department column found, fallback to first non-serial column
      if (deptColIndex === -1 && posCols.length > 0) {
        for (let i = 0; i < headerCells.length; i++) {
          if (!/^(s\.?\s*no\.?|sl\.?\s*no\.?|sr\.?\s*no\.?|#)$/i.test(headerCells[i]) && !posCols.some((p) => p.index === i)) {
            deptColIndex = i;
            break;
          }
        }
      }

      if (deptColIndex === -1 || posCols.length === 0) {
        return;
      }

      // Process data rows
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (/^[|:\-\s]+$/.test(row)) continue; // delimiter row
        const cells = row.split('|').slice(1, -1).map((c) => c.trim());
        if (cells.length <= deptColIndex) continue;

        const rawDept = cells[deptColIndex];
        if (/^total\b|^grand\s*total\b/i.test(rawDept)) continue; // total row

        const cleanDept = rawDept
          .replace(/^[\d]+\.?\s*/, '') // remove "1. "
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
          const rawNum = cells[index] || '';
          const num = parseInt(rawNum.replace(/[^0-9]/g, ''), 10) || 0;
          existing.positions[name] = (existing.positions[name] || 0) + num;
        });

        const rowTotal = Object.values(existing.positions).reduce((sum, v) => sum + v, 0);
        existing.total = rowTotal;
        breakdownMap.set(normKey, existing);
      }
    };

    for (const line of lines) {
      if (line.startsWith('|') && line.endsWith('|')) {
        currentTableRows.push(line);
      } else {
        if (currentTableRows.length > 0) {
          processTable(currentTableRows);
          currentTableRows = [];
        }
      }
    }
    if (currentTableRows.length > 0) {
      processTable(currentTableRows);
    }
  }

  // Combine positions from table and from vacancy post names
  const positionsFromVacancies = extractPositionsFromVacancies(vacancies);
  const combined = new Set<string>();

  positionsFromTable.forEach((p) => combined.add(p));
  positionsFromVacancies.forEach((p) => combined.add(p));

  const sortedPositions = sortPositions(Array.from(combined));

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
  const key = normalizeDeptKey(departmentName);

  // 1. Direct match
  if (breakdownMap.has(key)) {
    return breakdownMap.get(key)!;
  }

  // 2. Contains match
  for (const [mapKey, item] of breakdownMap.entries()) {
    if (mapKey.includes(key) || key.includes(mapKey)) {
      return item;
    }
  }

  // 3. Known medical alias match
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
    const deptName = cleanExtractedName(vacancy.department || vacancy.speciality || vacancy.postName);
    const item = findDepartmentBreakdown(breakdownMap, deptName);
    if (item) {
      // Find count for selectedPosition in item.positions (case-insensitive)
      let count = 0;
      let posFound = false;
      const selNorm = selectedPosition.trim().toLowerCase();

      for (const [pos, c] of Object.entries(item.positions)) {
        if (pos.toLowerCase() === selNorm) {
          count = c;
          posFound = true;
          break;
        }
      }

      if (posFound) {
        return { matches: count > 0, count };
      }
      // If position was in table columns for other departments but this department had none:
      return { matches: false, count: 0 };
    }
  }

  // 2. Direct match on vacancy.postName
  const pName = (vacancy.postName || '').trim().toLowerCase();
  const selNorm = selectedPosition.trim().toLowerCase();

  if (pName === selNorm) {
    const c = Number(vacancy.numberOfVacancies || 0);
    return { matches: c > 0, count: c };
  }

  // 3. Check if postName contains the position
  if (pName.includes(selNorm)) {
    const c = Number(vacancy.numberOfVacancies || 0);
    return { matches: c > 0, count: c };
  }

  return { matches: false, count: 0 };
}
