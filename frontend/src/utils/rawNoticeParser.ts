import { JobCategory } from '../types';
import { standardizePositionName } from './recruitmentBreakdown';

export const INDIAN_STATES = [
  'Andaman and Nicobar Islands',
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chandigarh',
  'Chhattisgarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jammu and Kashmir',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Ladakh',
  'Lakshadweep',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Puducherry',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
];

export const CITY_TO_STATE_MAP: Record<string, string> = {
  // Uttar Pradesh (All prominent districts & medical recruitment locations)
  'mahoba': 'Uttar Pradesh',
  'ambedkar nagar': 'Uttar Pradesh',
  'moradabad': 'Uttar Pradesh',
  'hathras': 'Uttar Pradesh',
  'aligarh': 'Uttar Pradesh',
  'ghaziabad': 'Uttar Pradesh',
  'gorakhpur': 'Uttar Pradesh',
  'varanasi': 'Uttar Pradesh',
  'lucknow': 'Uttar Pradesh',
  'kanpur': 'Uttar Pradesh',
  'kanpur nagar': 'Uttar Pradesh',
  'kanpur dehat': 'Uttar Pradesh',
  'agra': 'Uttar Pradesh',
  'meerut': 'Uttar Pradesh',
  'bareilly': 'Uttar Pradesh',
  'jhansi': 'Uttar Pradesh',
  'prayagraj': 'Uttar Pradesh',
  'allahabad': 'Uttar Pradesh',
  'noida': 'Uttar Pradesh',
  'greater noida': 'Uttar Pradesh',
  'ayodhya': 'Uttar Pradesh',
  'faizabad': 'Uttar Pradesh',
  'basti': 'Uttar Pradesh',
  'sultanpur': 'Uttar Pradesh',
  'mathura': 'Uttar Pradesh',
  'muzaffarnagar': 'Uttar Pradesh',
  'saharanpur': 'Uttar Pradesh',
  'firozabad': 'Uttar Pradesh',
  'mirzapur': 'Uttar Pradesh',
  'budaun': 'Uttar Pradesh',
  'rampur': 'Uttar Pradesh',
  'shahjahanpur': 'Uttar Pradesh',
  'farrukhabad': 'Uttar Pradesh',
  'hardoi': 'Uttar Pradesh',
  'sitapur': 'Uttar Pradesh',
  'lakhimpur': 'Uttar Pradesh',
  'lakhimpur kheri': 'Uttar Pradesh',
  'bahraich': 'Uttar Pradesh',
  'gonda': 'Uttar Pradesh',
  'barabanki': 'Uttar Pradesh',
  'unnao': 'Uttar Pradesh',
  'rae bareli': 'Uttar Pradesh',
  'raebareli': 'Uttar Pradesh',
  'amethi': 'Uttar Pradesh',
  'pratapgarh': 'Uttar Pradesh',
  'fatehpur': 'Uttar Pradesh',
  'kaushambi': 'Uttar Pradesh',
  'banda': 'Uttar Pradesh',
  'hamirpur': 'Uttar Pradesh',
  'chitrakoot': 'Uttar Pradesh',
  'jalaun': 'Uttar Pradesh',
  'orai': 'Uttar Pradesh',
  'lalitpur': 'Uttar Pradesh',
  'deoria': 'Uttar Pradesh',
  'kushinagar': 'Uttar Pradesh',
  'maharajganj': 'Uttar Pradesh',
  'azamgarh': 'Uttar Pradesh',
  'mau': 'Uttar Pradesh',
  'ballia': 'Uttar Pradesh',
  'jaunpur': 'Uttar Pradesh',
  'ghazipur': 'Uttar Pradesh',
  'chandauli': 'Uttar Pradesh',
  'sonbhadra': 'Uttar Pradesh',
  'bhadohi': 'Uttar Pradesh',
  'kasganj': 'Uttar Pradesh',
  'sambhal': 'Uttar Pradesh',
  'amroha': 'Uttar Pradesh',
  'bijnor': 'Uttar Pradesh',
  'shamli': 'Uttar Pradesh',
  'hapur': 'Uttar Pradesh',
  'baghpat': 'Uttar Pradesh',
  'mainpuri': 'Uttar Pradesh',
  'etawah': 'Uttar Pradesh',
  'kannauj': 'Uttar Pradesh',
  'auraiya': 'Uttar Pradesh',
  'etah': 'Uttar Pradesh',
  'pilibhit': 'Uttar Pradesh',
  'balrampur': 'Uttar Pradesh',
  'shravasti': 'Uttar Pradesh',
  'siddharthnagar': 'Uttar Pradesh',
  'sant kabir nagar': 'Uttar Pradesh',

  // Delhi & NCR
  'delhi': 'Delhi',
  'new delhi': 'Delhi',
  'gurugram': 'Haryana',
  'gurgaon': 'Haryana',
  'faridabad': 'Haryana',
  'panipat': 'Haryana',
  'sonipat': 'Haryana',
  'rohtak': 'Haryana',
  'karnal': 'Haryana',
  'ambala': 'Haryana',
  'hisar': 'Haryana',
  'panchkula': 'Haryana',

  // Bihar
  'patna': 'Bihar',
  'gaya': 'Bihar',
  'bhagalpur': 'Bihar',
  'muzaffarpur': 'Bihar',
  'darbhanga': 'Bihar',
  'purnia': 'Bihar',
  'bihar sharif': 'Bihar',
  'arrah': 'Bihar',
  'begusarai': 'Bihar',
  'katihar': 'Bihar',
  'munger': 'Bihar',
  'chhapra': 'Bihar',
  'bettiah': 'Bihar',

  // Madhya Pradesh
  'bhopal': 'Madhya Pradesh',
  'indore': 'Madhya Pradesh',
  'gwalior': 'Madhya Pradesh',
  'jabalpur': 'Madhya Pradesh',
  'ujjain': 'Madhya Pradesh',
  'sagar': 'Madhya Pradesh',
  'dewas': 'Madhya Pradesh',
  'satna': 'Madhya Pradesh',
  'ratlam': 'Madhya Pradesh',
  'rewa': 'Madhya Pradesh',
  'datia': 'Madhya Pradesh',
  'shivpuri': 'Madhya Pradesh',
  'vidisha': 'Madhya Pradesh',
  'chhindwara': 'Madhya Pradesh',
  'khandwa': 'Madhya Pradesh',

  // Rajasthan
  'jaipur': 'Rajasthan',
  'jodhpur': 'Rajasthan',
  'kota': 'Rajasthan',
  'bikaner': 'Rajasthan',
  'ajmer': 'Rajasthan',
  'udaipur': 'Rajasthan',
  'bhilwara': 'Rajasthan',
  'alwar': 'Rajasthan',
  'bharatpur': 'Rajasthan',
  'sikar': 'Rajasthan',
  'pali': 'Rajasthan',
  'sri ganganagar': 'Rajasthan',

  // Maharashtra
  'mumbai': 'Maharashtra',
  'pune': 'Maharashtra',
  'nagpur': 'Maharashtra',
  'thane': 'Maharashtra',
  'nashik': 'Maharashtra',
  'aurangabad': 'Maharashtra',
  'chhatrapati sambhajinagar': 'Maharashtra',
  'navi mumbai': 'Maharashtra',
  'solapur': 'Maharashtra',
  'kolhapur': 'Maharashtra',
  'amravati': 'Maharashtra',
  'nanded': 'Maharashtra',
  'sangli': 'Maharashtra',
  'jalgaon': 'Maharashtra',
  'akola': 'Maharashtra',
  'latur': 'Maharashtra',
  'dhule': 'Maharashtra',
  'ahmednagar': 'Maharashtra',

  // Karnataka
  'bengaluru': 'Karnataka',
  'bangalore': 'Karnataka',
  'mysuru': 'Karnataka',
  'mysore': 'Karnataka',
  'hubballi': 'Karnataka',
  'mangaluru': 'Karnataka',
  'mangalore': 'Karnataka',
  'belagavi': 'Karnataka',
  'belgaum': 'Karnataka',
  'kalaburagi': 'Karnataka',
  'gulbarga': 'Karnataka',
  'davanagere': 'Karnataka',
  'ballari': 'Karnataka',
  'bellary': 'Karnataka',
  'shivamogga': 'Karnataka',
  'shimoga': 'Karnataka',

  // Tamil Nadu
  'chennai': 'Tamil Nadu',
  'coimbatore': 'Tamil Nadu',
  'madurai': 'Tamil Nadu',
  'tiruchirappalli': 'Tamil Nadu',
  'trichy': 'Tamil Nadu',
  'salem': 'Tamil Nadu',
  'tirunelveli': 'Tamil Nadu',
  'tiruppur': 'Tamil Nadu',
  'erode': 'Tamil Nadu',
  'vellore': 'Tamil Nadu',
  'thoothukudi': 'Tamil Nadu',
  'thanjavur': 'Tamil Nadu',
  'nagercoil': 'Tamil Nadu',

  // Telangana
  'hyderabad': 'Telangana',
  'secunderabad': 'Telangana',
  'warangal': 'Telangana',
  'nizamabad': 'Telangana',
  'karimnagar': 'Telangana',
  'khammam': 'Telangana',

  // Andhra Pradesh
  'visakhapatnam': 'Andhra Pradesh',
  'vizag': 'Andhra Pradesh',
  'vijayawada': 'Andhra Pradesh',
  'guntur': 'Andhra Pradesh',
  'nellore': 'Andhra Pradesh',
  'kurnool': 'Andhra Pradesh',
  'kakinada': 'Andhra Pradesh',
  'rajahmundry': 'Andhra Pradesh',
  'tirupati': 'Andhra Pradesh',
  'kadapa': 'Andhra Pradesh',
  'anantapur': 'Andhra Pradesh',

  // West Bengal
  'kolkata': 'West Bengal',
  'howrah': 'West Bengal',
  'asansol': 'West Bengal',
  'siliguri': 'West Bengal',
  'durgapur': 'West Bengal',
  'bardhaman': 'West Bengal',
  'malda': 'West Bengal',
  'kharagpur': 'West Bengal',

  // Punjab
  'ludhiana': 'Punjab',
  'amritsar': 'Punjab',
  'jalandhar': 'Punjab',
  'patiala': 'Punjab',
  'bathinda': 'Punjab',
  'mohali': 'Punjab',

  // Uttarakhand
  'dehradun': 'Uttarakhand',
  'haridwar': 'Uttarakhand',
  'roorkee': 'Uttarakhand',
  'haldwani': 'Uttarakhand',
  'rishikesh': 'Uttarakhand',
  'rudrapur': 'Uttarakhand',
  'kashipur': 'Uttarakhand',
  'nainital': 'Uttarakhand',
  'almora': 'Uttarakhand',
  'srinagar garhwal': 'Uttarakhand',

  // Himachal Pradesh
  'shimla': 'Himachal Pradesh',
  'dharamshala': 'Himachal Pradesh',
  'solan': 'Himachal Pradesh',
  'mandi': 'Himachal Pradesh',
  'kullu': 'Himachal Pradesh',
  'kangra': 'Himachal Pradesh',

  // Chhattisgarh
  'raipur': 'Chhattisgarh',
  'bhilai': 'Chhattisgarh',
  'bilaspur': 'Chhattisgarh',
  'korba': 'Chhattisgarh',
  'durg': 'Chhattisgarh',

  // Jharkhand
  'ranchi': 'Jharkhand',
  'jamshedpur': 'Jharkhand',
  'dhanbad': 'Jharkhand',
  'bokaro': 'Jharkhand',
  'deoghar': 'Jharkhand',
  'hazaribagh': 'Jharkhand',

  // Odisha
  'bhubaneswar': 'Odisha',
  'cuttack': 'Odisha',
  'rourkela': 'Odisha',
  'berhampur': 'Odisha',
  'sambalpur': 'Odisha',
  'puri': 'Odisha',

  // Assam & North East
  'guwahati': 'Assam',
  'silchar': 'Assam',
  'dibrugarh': 'Assam',
  'jorhat': 'Assam',

  // Jammu & Kashmir
  'srinagar': 'Jammu and Kashmir',
  'jammu': 'Jammu and Kashmir',
  'anantnag': 'Jammu and Kashmir',
  'udhampur': 'Jammu and Kashmir',

  // Chandigarh & Goa
  'chandigarh': 'Chandigarh',
  'panaji': 'Goa',
  'margao': 'Goa',

  // Kerala
  'thiruvananthapuram': 'Kerala',
  'trivandrum': 'Kerala',
  'kochi': 'Kerala',
  'cochin': 'Kerala',
  'kozhikode': 'Kerala',
  'calicut': 'Kerala',
  'kollam': 'Kerala',
  'thrissur': 'Kerala',
  'kannur': 'Kerala',
  'alappuzha': 'Kerala',
  'kottayam': 'Kerala',
  'palakkad': 'Kerala',
};

const trim = (value?: string | null) => value?.trim() || '';

/**
 * Standardize Medical Officer variants into a single unified category.
 * Maps GDMO, Lady MO, Emergency MO, Casualty MO, Factory MO, AYUSH MO to 'Medical Officer'.
 */
export function inferCategory(value?: string | null): JobCategory {
  const t = trim(value).toLowerCase();
  if (
    /medical\s*officer|gdm[o]?|casualty\s*medical|emergency\s*medical|\bemo\b|\blmo\b|\bfmo\b|lady\s*medical|female\s*medical|factory\s*medical|ayush\s*medical|general\s*duty\s*medical/.test(
      t
    )
  ) {
    return 'Medical Officer';
  }
  if (/junior\s*resident|\bjr\b/.test(t)) return 'Junior Resident';
  if (/senior\s*resident|\bsr\b/.test(t)) return 'Senior Resident';
  if (/professor|faculty|lecturer|tutor|demonstrator/.test(t)) return 'Faculty';
  if (/specialist|super\s*specialist|consultant|general\s*physician|chest\s*physician|neuro\s*physician|psychiat/.test(t)) {
    return 'Specialist';
  }
  if (/dental|dentist|bds|mds/.test(t)) return 'Dental';
  if (/ayush|bams|bhms|unani|ayurveda|siddha|homeopath/.test(t)) return 'AYUSH';
  if (/nurs/.test(t)) return 'Nursing';
  // Pharmacy strictly requires actual pharmacy/pharmacist keywords and NOT pharmacology
  if (!/pharmacolog/i.test(t) && /\b(pharmacy|pharmacist|b\.?\s*pharm|d\.?\s*pharm|m\.?\s*pharm|pharm\.?\s*d|dispenser|druggist)\b/i.test(t)) {
    return 'Pharmacy';
  }
  // Psychology strictly requires psychologist/counsellor keywords and NOT psychiatry
  if (!/psychiatr/i.test(t) && /\b(psycholog\w*|mental\s*health|counselor|counsellor)\b/i.test(t)) {
    return 'Psychology & Mental Health';
  }
  if (/nutrition|diet/.test(t)) return 'Nutrition & Dietetics';
  if (/public health|epidemi/.test(t)) return 'Public Health';
  if (/administration|administrator/.test(t)) return 'Hospital Administration';
  if (/research|scientist|life science/.test(t)) return 'Life Science & Research';
  if (/technician|technologist|paramedic/.test(t)) return 'Paramedical';
  return 'Medical Officer';
}

export function inferDutyType(value?: string | null): 'full_time' | 'part_time' | 'contract' {
  const t = trim(value).toLowerCase();
  return /part[ -]?time/.test(t)
    ? 'part_time'
    : /contract|temporary|fixed term|tenure|walk[- ]?in/.test(t)
    ? 'contract'
    : 'full_time';
}

/**
 * Identify Indian state from location string or full notice text.
 * Never leaves state blank when a known Indian district/city is mentioned.
 */
export function inferState(location?: string | null, fullNoticeText?: string | null): string {
  const loc = trim(location).toLowerCase();
  if (loc) {
    // 1. Direct state match
    const directState = INDIAN_STATES.find((s) => loc.includes(s.toLowerCase()));
    if (directState) return directState;

    // 2. City lookup in location string
    for (const [city, state] of Object.entries(CITY_TO_STATE_MAP)) {
      const reg = new RegExp(`\\b${city}\\b`, 'i');
      if (reg.test(loc)) {
        return state;
      }
    }
  }

  // 3. Fallback search across full notice text
  if (fullNoticeText) {
    const textLower = fullNoticeText.toLowerCase();
    for (const state of INDIAN_STATES) {
      if (new RegExp(`\\b${state.toLowerCase()}\\b`, 'i').test(textLower)) {
        return state;
      }
    }
    for (const [city, state] of Object.entries(CITY_TO_STATE_MAP)) {
      if (new RegExp(`\\b${city}\\b`, 'i').test(textLower)) {
        return state;
      }
    }
  }

  return '';
}

/**
 * Translates common Hindi circular phrases to English and converts Devanagari numerals.
 */
export function translateHindiToEnglish(text: string): string {
  if (!text) return '';

  let res = text;

  // Convert Devanagari numerals ०-९ to 0-9
  const devanagariDigits = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
  for (let i = 0; i < 10; i++) {
    res = res.replace(new RegExp(devanagariDigits[i], 'g'), String(i));
  }

  const translations: Array<[RegExp, string]> = [
    [/कार्यालय\s+मुख्य\s+चिकित्सा\s+अधिकारी/gi, 'Office of the Chief Medical Officer'],
    [/मुख्य\s+चिकित्सा\s+अधिकारी/gi, 'Chief Medical Officer'],
    [/जिला\s+स्वास्थ्य\s+समिति/gi, 'District Health Society'],
    [/राष्ट्रीय\s+स्वास्थ्य\s+मिशन/gi, 'National Health Mission'],
    [/राजकीय\s+मेडिकल\s+कॉलेज/gi, 'Government Medical College'],
    [/महिला\s+चिकित्सा\s+अधिकारी/gi, 'Female Medical Officer'],
    [/आपातकालीन\s+चिकित्सा\s+अधिकारी/gi, 'Emergency Medical Officer'],
    [/चिकित्सा\s+अधिकारी/gi, 'Medical Officer'],
    [/वरिष्ठ\s+रेजिडेंट/gi, 'Senior Resident'],
    [/कनिष्ठ\s+रेजिडेंट/gi, 'Junior Resident'],
    [/साक्षात्कार\s+की\s+तिथि|साक्षात्कार\s+तिथि/gi, 'Date of Interview'],
    [/वाक[- ]?इन\s+इंटरव्यू|साक्षात्कार/gi, 'Walk-in Interview'],
    [/आवेदन\s+की\s+अंतिम\s+तिथि|अंतिम\s+तिथि/gi, 'Last Date of Application'],
    [/प्रत्येक\s+बुधवार/gi, 'Every Wednesday'],
    [/प्रत्येक\s+कार्यदिवस/gi, 'Every Working Day'],
    [/पदों\s+की\s+संख्या|कुल\s+पद/gi, 'Total Posts'],
    [/मानदेय|वेतन/gi, 'Salary / Remuneration'],
    [/अनिवार्य\s+अर्हता|शैक्षणिक\s+अर्हता|योग्यता/gi, 'Educational Qualification'],
    [/आयु\s+सीमा/gi, 'Age Limit'],
    [/दस्तावेज\s+सत्यापन/gi, 'Document Verification'],
    [/संविदात्मक|संविदा/gi, 'Contractual'],
    [/चयन\s+प्रक्रिया/gi, 'Selection Process'],
    [/पंजीकरण/gi, 'Registration'],
    [/विस्तृत\s+विज्ञापन/gi, 'Detailed Circular'],
    [/नियम\s+एवं\s+शर्तें/gi, 'Terms and Conditions'],
  ];

  for (const [re, eng] of translations) {
    res = res.replace(re, eng);
  }

  return res;
}

export interface ParsedDepartmentVacancy {
  department: string;
  numberOfVacancies: number;
  category?: string;
  postName?: string;
}

export interface ParsedNoticeResult {
  title?: string;
  organization?: string;
  sector?: 'government' | 'private';
  jobRoles?: string[];
  category?: JobCategory;
  location?: string;
  state?: string;
  qualification?: string;
  experience?: string;
  numberOfPosts?: number;
  salary?: string;
  lastDate?: string;
  requirements?: string;
  benefits?: string;
  contactEmail?: string;
  contactPhone?: string;
  applyLink?: string;
  officialWebsite?: string;
  ageLimit?: string;
  selectionProcess?: string;
  description?: string;
  speciality?: string;
  departmentsList?: ParsedDepartmentVacancy[];
  isMultiDepartment?: boolean;
}

/**
 * Filter out junk/accidental match strings for organization names
 */
function isJunkOrganization(org: string): boolean {
  const o = org.trim().toLowerCase();
  return (
    /^(relative\s*clinic|referral\s*clinic|local\s*clinic|private\s*clinic|any\s*clinic|nearest\s*clinic|the\s*hospital|clinic|hospital)$/i.test(
      o
    ) ||
    o.length < 3 ||
    /^[\d\s.,\-#/]+$/.test(o)
  );
}

export function parseRawVacancyNotice(rawText: string): ParsedNoticeResult {
  const normalizedText = translateHindiToEnglish(rawText.trim());
  const lines = normalizedText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const result: ParsedNoticeResult = {
    description: '',
  };

  // ==========================================
  // 1. Organization & Location / State detection
  // ==========================================
  // Strip emojis and bullets from the first non-empty lines
  for (let i = 0; i < Math.min(lines.length, 5); i++) {
    const rawLine = lines[i];
    const cleanLine = rawLine
      .replace(/^(?:Post\s*[:\d]*\s*)?[🟩🟥⬛⬜🟧🟨🟪*#•\->\s]+/i, '')
      .replace(/^[🟩🟥⬛⬜🟧🟨🟪*#•\->\s]+/, '')
      .trim();

    // Check for explicit Organization: ...
    const orgKeyMatch = cleanLine.match(
      /^(?:Organization(?:\s*\/\s*Hospital\s*Name)?|Hospital(?:\s*Name)?|Institute(?:\s*Name)?|College(?:\s*Name)?|Employer(?:\s*Name)?|Authority)\s*[:\-]\s*(.+)$/i
    );
    if (orgKeyMatch) {
      result.organization = orgKeyMatch[1].trim();
      break;
    }

    // Check for prominent official headers (CMO, GMC, Railway, AIIMS, ESIC, ESIS, Hospital, Institute)
    if (
      /^(?:OFFICE OF THE CHIEF MEDICAL OFFICER|CHIEF MEDICAL OFFICER|MAHAMAYA RAJKIYA ALLOPATHIC MEDICAL COLLEGE|RAJKIYA ALLOPATHIC MEDICAL COLLEGE|GOVERNMENT MEDICAL COLLEGE|NORTHERN RAILWAY|SOUTHERN RAILWAY|WESTERN RAILWAY|EASTERN RAILWAY|CENTRAL RAILWAY|INDIAN RAILWAYS|DISTRICT HEALTH SOCIETY|DISTRICT HOSPITAL|CIVIL HOSPITAL|ALL INDIA INSTITUTE OF MEDICAL SCIENCES|AIIMS|ESIC|ESIS|MAHARASHTRA EMPLOYEES STATE INSURANCE|NATIONAL HEALTH MISSION|DIRECTORATE OF HEALTH)/i.test(
        cleanLine
      ) ||
      /\b(?:CHIEF MEDICAL OFFICER|MEDICAL COLLEGE|RAILWAY|DISTRICT HOSPITAL|AIIMS|ESIC|ESIS|HOSPITAL|INSTITUTE)\b/i.test(cleanLine)
    ) {
      // If line is not a post listing line (does not end with posts/vacancies)
      if (!/–|-|:|\b\d+\s*posts?\b/i.test(cleanLine) || cleanLine.includes('OFFICE') || cleanLine.includes('RAILWAY') || cleanLine.includes('COLLEGE') || cleanLine.includes('HOSPITAL')) {
        result.organization = cleanLine;
        break;
      }
    }
  }

  // Fallback organization regexes if not yet found
  if (!result.organization) {
    const orgMatch =
      normalizedText.match(/\b(AIIMS\s+[A-Za-z]+(?:\s*\([^)]+\))?)/i) ||
      normalizedText.match(/\b((?:AIIMS|ESIC|PGIMER|NIMHANS|JIPMER|SGPGI|BHU|AMU)\s+[A-Za-z]+)\b/i) ||
      normalizedText.match(/\b(All\s+India\s+Institute\s+of\s+Medical\s+Sciences(?:\s*,?\s*[A-Za-z]+)?)/i) ||
      normalizedText.match(/([A-Z][A-Za-z0-9&., ]{3,50}(?:Medical College|AIIMS|PGIMER|ESIC|Health City|Heart Institute))/i);

    if (orgMatch && !isJunkOrganization(orgMatch[1])) {
      result.organization = orgMatch[1].trim();
    }
  }

  // Clean junk organisation
  if (result.organization && isJunkOrganization(result.organization)) {
    result.organization = undefined;
  }

  // If organization has city like "OFFICE OF THE CHIEF MEDICAL OFFICER, MAHOBA"
  if (result.organization && result.organization.includes(',')) {
    const parts = result.organization.split(',').map((p) => p.trim());
    const possibleCity = parts[parts.length - 1];
    const matchedState = inferState(possibleCity);
    if (matchedState) {
      result.location = possibleCity;
      result.state = matchedState;
    }
  }

  // ==========================================
  // 2. State & City / Location detection
  // ==========================================
  const cityKeyMatch = normalizedText.match(
    /(?:^|\n)\s*(?:\*\s*)?(?:Location\s*(?:\(City\))?|City)\s*[:\-]\s*([^\n\r,]+)/i
  );
  const stateKeyMatch = normalizedText.match(/(?:^|\n)\s*(?:\*\s*)?State\s*[:\-]\s*([^\n\r]+)/i);

  if (cityKeyMatch) {
    result.location = cityKeyMatch[1].trim();
  }
  if (stateKeyMatch) {
    result.state = stateKeyMatch[1].trim();
  }

  // Infer location from known city dictionary if still missing
  if (!result.location) {
    for (const city of Object.keys(CITY_TO_STATE_MAP)) {
      const reg = new RegExp(`\\b${city}\\b`, 'i');
      if (reg.test(normalizedText)) {
        // Format to Title Case e.g. "Mahoba", "Ambedkar Nagar"
        result.location = city
          .split(' ')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');
        result.state = CITY_TO_STATE_MAP[city];
        break;
      }
    }
  }

  // Ensure State is mandatory & identified
  if (!result.state && result.location) {
    result.state = inferState(result.location, normalizedText);
  }
  if (!result.state) {
    result.state = inferState(undefined, normalizedText);
  }

  // ==========================================
  // 3. Post Items Detection (Line by line circular breakdown)
  // E.g.
  // Female Medical Officer – 1 Post
  // Medical Officer – 6 Posts
  // Emergency Medical Officer – 2 Posts
  // Senior Resident – 24 Posts
  // Junior Resident – 4Post
  // ==========================================
  const parsedVacancies: ParsedDepartmentVacancy[] = [];
  let totalPostsSum = 0;
  const detectedPostTitles: string[] = [];
  let currentCadreRole = '';

  // Pre-detect overall cadre role from explicit notice header, category, or title
  const explicitRoleMatch = normalizedText.match(/(?:^|\n)\s*(?:\*\s*)?(?:Role|Job\s*Role|Category|Cadre)\s*[:\-]\s*([^\n\r]+)/i);
  if (explicitRoleMatch) {
    const roleCandidate = standardizePositionName(explicitRoleMatch[1].trim());
    if (/^(Senior Resident|Junior Resident|Medical Officer|Professor|Associate Professor|Assistant Professor|Additional Professor|Tutor|Demonstrator|Specialist|Consultant|Part[- ]?Time Specialist|Resident Specialist|Full[- ]?Time Specialist|PT\/FT Specialist|PGMO|GDMO)$/i.test(roleCandidate)) {
      currentCadreRole = roleCandidate;
    }
  }
  if (!currentCadreRole) {
    if (/\bsenior\s+resident\b/i.test(normalizedText) && !/\b(junior\s+resident|professor|tutor)\b/i.test(normalizedText)) {
      currentCadreRole = 'Senior Resident';
    } else if (/\bjunior\s+resident\b/i.test(normalizedText) && !/\b(senior\s+resident|professor|tutor)\b/i.test(normalizedText)) {
      currentCadreRole = 'Junior Resident';
    } else if (/\bmedical\s+officer\b/i.test(normalizedText) && !/\b(resident|professor)\b/i.test(normalizedText)) {
      currentCadreRole = 'Medical Officer';
    }
  }

  const cadreSummaryList: Array<{ name: string; count: number }> = [];

  for (const rawLine of lines) {
    const cleanLine = rawLine.replace(/^[🟩🟥⬛⬜🟧🟨*#•\->\s]+/, '').trim();
    if (!cleanLine) continue;

    // Skip TOTAL POSTS / TOTAL VACANCIES lines from being parsed as departments!
    const totalLineMatch = cleanLine.match(/^(?:TOTAL\s*POSTS?|TOTAL\s*VACANC(?:Y|IES)|TOTAL\s*VACANT\s*POSTS?|GRAND\s*TOTAL|TOTAL)\s*[:\-–—=]\s*([0-9]{1,4})/i);
    if (totalLineMatch) {
      if (!result.numberOfPosts) {
        result.numberOfPosts = parseInt(totalLineMatch[1], 10);
      }
      continue;
    }

    // Skip header lines or meta lines
    if (/^(LAST DATE|DATE OF INTERVIEW|VENUE|WEBSITE|WALK-IN|SELECTION|AGE LIMIT|SALARY|PAY|EXPERIENCE|ELIGIBILITY|CONTRACT|IMPORTANT|DEPARTMENT BREAKDOWN|SPECIALTY-WISE|TITLE|ORGANIZATION|LOCATION|STATE|SECTOR)\b/i.test(cleanLine)) {
      continue;
    }

    // Check if line is a designation header e.g. "Professor:" or "Assistant Professor:"
    const cadreHeaderMatch = cleanLine.match(/^(Professor|Associate Professor|Assistant Professor|Additional Professor|Senior Resident|Junior Resident|Part[- ]?Time Specialist|Resident Specialist|Full[- ]?Time Specialist|PT\/FT Specialist|Super\s*Specialist|Full[- ]?Time\s*Super\s*Specialist|Part[- ]?Time\s*Super\s*Specialist|PGMO|GDMO|Tutor|Demonstrator|Medical Officer|Specialist|Consultant)\s*[:\-]?\s*$/i);
    if (cadreHeaderMatch) {
      currentCadreRole = standardizePositionName(cadreHeaderMatch[1]);
      continue;
    }

    // Strip trailing category tags like (GEN), (SC), (OBC: 1, EWS: 1), [EWS]
    const cleanLineWithoutTags = cleanLine
      .replace(/\s*(\([A-Za-z0-9\s:,\/–-]+\)|\[[A-Za-z0-9\s:,\/–-]+\])\s*$/, '')
      .trim();

    // Match "Post Title – X Posts" or "Post Title: X Vacancies" or "Junior Resident - 4Post"
    const postLineMatch =
      cleanLineWithoutTags.match(/^([A-Za-z0-9&/,\.\(\)\- ]+?)\s*[:\-–—=]\s*([0-9]{1,4})\s*(?:posts?|vacanc(?:y|ies))?\s*$/i) ||
      cleanLineWithoutTags.match(/^([A-Za-z0-9&/,\.\(\)\- ]+?)\s+([0-9]{1,4})\s*(?:posts?|vacanc(?:y|ies))\s*$/i);

    if (postLineMatch) {
      let pName = postLineMatch[1].trim();
      const count = parseInt(postLineMatch[2], 10);
      if (
        pName.length >= 2 &&
        !/^(last date|date of|website|contact|email|phone|interview|selection|salary|experience|venue|qualification|eligibility|title|organization|sector)/i.test(pName) &&
        !/^(total\s*posts?|total\s*vacanc(y|ies)|grand\s*total|total)$/i.test(pName) &&
        !isNaN(count) &&
        count > 0 &&
        count < 10000
      ) {
        const isCadreName = /^(professor|associate professor|assistant professor|additional professor|senior resident|junior resident|part[- ]?time\s*specialist|resident\s*specialist|full[- ]?time\s*specialist|pt\/ft\s*(contractual\s*)?specialist|super\s*specialist|full[- ]?time\s*super\s*specialist|part[- ]?time\s*super\s*specialist|specialist|pgmo|gdmo|medical officer|tutor|demonstrator|consultant)$/i.test(pName);
        if (isCadreName && !currentCadreRole) {
          cadreSummaryList.push({ name: pName, count });
        } else {
          // If formatted like "Forensic Medicine (Professor)" or "Professor - Forensic Medicine"
          let extractedRole = currentCadreRole;
          const roleInParen = pName.match(/\((Professor|Associate Professor|Assistant Professor|Senior Resident|Junior Resident|Part[- ]?Time Specialist|Full[- ]?Time Specialist|Resident Specialist|PT\/FT Specialist|Super\s*Specialist|Full[- ]?Time\s*Super\s*Specialist|Part[- ]?Time\s*Super\s*Specialist|Specialist|Consultant|PGMO|GDMO|Medical Officer|Tutor|Demonstrator)\)/i);
          if (roleInParen) {
            extractedRole = standardizePositionName(roleInParen[1]);
            pName = pName.replace(/\((Professor|Associate Professor|Assistant Professor|Senior Resident|Junior Resident|Part[- ]?Time Specialist|Full[- ]?Time Specialist|Resident Specialist|PT\/FT Specialist|Super\s*Specialist|Full[- ]?Time\s*Super\s*Specialist|Part[- ]?Time\s*Super\s*Specialist|Specialist|Consultant|PGMO|GDMO|Medical Officer|Tutor|Demonstrator)\)/i, '').trim();
          }

          totalPostsSum += count;
          detectedPostTitles.push(pName);
          parsedVacancies.push({
            department: pName,
            numberOfVacancies: count,
            postName: extractedRole || currentCadreRole || pName,
            category: inferCategory(extractedRole || currentCadreRole || pName),
          });
        }
      }
    }
  }

  // If specific department lines were not present, fall back to cadre summary lines
  if (parsedVacancies.length === 0 && cadreSummaryList.length > 0) {
    for (const c of cadreSummaryList) {
      totalPostsSum += c.count;
      detectedPostTitles.push(c.name);
      parsedVacancies.push({
        department: c.name,
        numberOfVacancies: c.count,
        postName: c.name,
        category: inferCategory(c.name),
      });
    }
  }

  if (parsedVacancies.length > 0) {
    result.departmentsList = parsedVacancies;
    result.isMultiDepartment = parsedVacancies.length >= 2;
    if (!result.numberOfPosts) {
      result.numberOfPosts = totalPostsSum;
    }

    // Map title from detected post titles
    if (!result.title) {
      result.title = detectedPostTitles.slice(0, 3).join(' / ');
    }

    // Standardize category: if any post is MO/GDMO/EMO/Lady MO, category = 'Medical Officer'
    const hasMO = detectedPostTitles.some((p) =>
      /medical officer|gdmo|emo|lmo|fmo|casualty|emergency|lady/i.test(p)
    );
    if (hasMO) {
      result.category = 'Medical Officer';
    } else {
      result.category = inferCategory(detectedPostTitles[0]);
    }
  }

  // ==========================================
  // 4. Sector detection
  // ==========================================
  const sectorKeyMatch = normalizedText.match(/(?:^|\n)\s*(?:\*\s*)?Job\s*Sector\s*[:\-]\s*([^\n\r]+)/i);
  if (sectorKeyMatch && /govt|government|admin|public/i.test(sectorKeyMatch[1])) {
    result.sector = 'government';
  } else if (
    /government|govt\.|ministry|nhm|national health mission|aiims|esic|railway|psc|upsc|sams|state health|chief medical officer|cmo office|rajkiya|gmc|district hospital/i.test(
      normalizedText
    )
  ) {
    result.sector = 'government';
  } else {
    result.sector = 'private';
  }

  // ==========================================
  // 5. Job Roles detection & Title Fallback
  // ==========================================
  const detectedRoles: string[] = [];
  const roleKeywords: Array<{ role: JobCategory; regex: RegExp }> = [
    {
      role: 'Medical Officer',
      regex: /\b(medical\s+officer|gdmo|general\s+duty\s+medical\s+officer|lady\s+medical\s+officer|female\s+medical\s+officer|emergency\s+medical\s+officer|casualty\s+medical\s+officer|factory\s+medical\s+officer|ayush\s+medical\s+officer|\bmo\b|\bemo\b|\blmo\b|\bfmo\b)\b/i,
    },
    { role: 'Senior Resident', regex: /\b(senior\s+resident|sr\b|sr\.)/i },
    { role: 'Junior Resident', regex: /\b(junior\s+resident|jr\b|jr\.)/i },
    {
      role: 'Specialist',
      regex: /\b(specialist|super\s*specialist|consultant|sr\.\s*consultant|general\s+physician|chest\s+physician|neuro\s+physician)\b/i,
    },
    { role: 'Faculty', regex: /\b(faculty|professor|assoc\w*\s+professor|asst\w*\s+professor|assistant\s+professor|tutor|lecturer)\b/i },
    { role: 'Dental', regex: /\b(dental|dentist|bds|mds)\b/i },
    { role: 'AYUSH', regex: /\b(ayush|ayurved\w*|homeopath\w*|unani|siddha|bams|bhms)\b/i },
    { role: 'Nursing', regex: /\b(nurs\w*|staff\s*nurse|sister\s*tutor|gnm|b\.sc\s*nurs\w*)\b/i },
    { role: 'Pharmacy', regex: /\b(pharmacy|pharmacist|b\.?\s*pharm|d\.?\s*pharm|m\.?\s*pharm|pharm\.?\s*d|dispenser|druggist)\b/i },
    { role: 'Paramedical', regex: /\b(paramedic\w*|lab\s*tech\w*|radiograph\w*|x-ray\s*tech\w*|ecg\s*tech\w*|ot\s*tech\w*)\b/i },
    { role: 'Allied Health', regex: /\b(allied\s*health|physiotherap\w*|occupational\s*therap\w*)\b/i },
    { role: 'Psychology & Mental Health', regex: /\b(psycholog\w*|clinical\s*psycholog\w*|mental\s*health|counselor|counsellor)\b/i },
    { role: 'Nutrition & Dietetics', regex: /\b(dieti\w*|nutrition\w*)\b/i },
    { role: 'Hospital Administration', regex: /\b(hospital\s*admin\w*|medical\s*superintendent|healthcare\s*admin\w*)\b/i },
    { role: 'Public Health', regex: /\b(public\s*health|epidemiolog\w*|mph\b)\b/i },
    { role: 'Life Science & Research', regex: /\b(life\s*science|research\s*officer|research\s*associate|jrf\b|srf\b)\b/i },
  ];

  const isFacultyOrResidency = /\b(faculty|professor|assoc\w*\s+prof|asst\w*\s+prof|assistant\s+professor|tutor|lecturer|senior\s+resident|junior\s+resident|sr\b|jr\b)\b/i.test(normalizedText);

  for (const r of roleKeywords) {
    // Prevent pharmacology from falsely tagging Pharmacy
    if (r.role === 'Pharmacy' && (/pharmacolog/i.test(normalizedText) || isFacultyOrResidency) && !/\b(pharmacist|b\.?\s*pharm|d\.?\s*pharm|m\.?\s*pharm|pharm\.?\s*d|dispenser)\b/i.test(normalizedText)) {
      continue;
    }
    // Prevent psychiatry from falsely tagging Psychology
    if (r.role === 'Psychology & Mental Health' && (/psychiatr/i.test(normalizedText) || isFacultyOrResidency) && !/\b(psycholog\w*|clinical\s*psycholog\w*|counselor|counsellor|mental\s*health)\b/i.test(normalizedText)) {
      continue;
    }
    if (r.regex.test(normalizedText) && !detectedRoles.includes(r.role)) {
      detectedRoles.push(r.role);
    }
  }

  if (detectedRoles.length > 0) {
    result.jobRoles = detectedRoles;
    if (!result.category) {
      result.category = detectedRoles[0] as JobCategory;
    }
    if (!result.title) {
      result.title = detectedRoles.slice(0, 3).join(' / ');
    }
  }

  // Explicit Category / Primary Role detection if present in raw notice
  const categoryKeyMatch = normalizedText.match(
    /(?:^|\n)\s*(?:\*\s*)?(?:Category|Primary\s*Category|Cadre)\s*[:\-]\s*([^\n\r]+)/i
  );
  if (categoryKeyMatch) {
    const parsedCat = inferCategory(categoryKeyMatch[1].trim());
    result.category = parsedCat;
  }

  // Explicit Post Title detection if present
  const titleKeyMatch = normalizedText.match(
    /(?:^|\n)\s*(?:\*\s*)?(?:Title|Job\s+Title|Post\s+Job\s+Title|Post\s+Name|Name\s+of\s+(?:the\s+)?Post|Designation|Position|Job\s+Role|Role|Post(?!\s+(?:No|Code|Count|Number|of\s+Vacanc)))\s*[:\-]\s*([^\n\r]+)/i
  );
  if (titleKeyMatch) {
    result.title = titleKeyMatch[1].trim();
  }

  // Explicit Speciality / Department detection if present
  const specKeyMatch = normalizedText.match(
    /(?:^|\n)\s*(?:\*\s*)?(?:Speciality|Specialty|Department)\s*[:\-]\s*([^\n\r]+)/i
  );
  if (specKeyMatch) {
    result.speciality = specKeyMatch[1].trim();
  }

  // ==========================================
  // 6. Selection Process & Interview Dates
  // ==========================================
  const interviewMatch =
    normalizedText.match(
      /(?:^|\n)\s*(?:\*\s*)?(?:Date\s+of\s+Interview|Interview\s+Date|Walk-in\s+Interview(?:\s+Date)?|Walk-in\s+Date|Walk-in)\s*[:\-]\s*([^\n\r]+)/i
    ) ||
    normalizedText.match(
      /(?:walk-in\s+interview\s+(?:on|is\s+scheduled\s+on|every))\s*[:\-]?\s*([0-9]{1,2}[./-][0-9]{1,2}[./-][0-9]{2,4}|Every\s+[A-Za-z]+|[0-9]{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]+\s*[0-9]{4})/i
    );

  if (interviewMatch) {
    const intInfo = interviewMatch[1].trim();
    result.selectionProcess = `Walk-in Interview Date: ${intInfo}. Selection is conducted via interview and document verification as per official norms.`;

    // If no explicit lastDate, format interview date as last date
    const dmy = intInfo.match(/^([0-9]{1,2})[./-]([0-9]{1,2})[./-]([0-9]{4})$/);
    if (dmy) {
      result.lastDate = `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
    }
  }

  const selMatch = normalizedText.match(
    /(?:^|\n)\s*(?:\*\s*)?(?:Selection(?:\s+Process)?|Selection\s+is\s+conducted\s+via)\s*[:\-]?\s*([^\n\r]+)/i
  );
  if (selMatch) {
    const selText = selMatch[1].trim();
    result.selectionProcess = result.selectionProcess
      ? `${result.selectionProcess} | ${selText}`
      : selText;
  }

  // ==========================================
  // 7. Last Date detection
  // ==========================================
  const lastDateKeyMatch = normalizedText.match(
    /(?:^|\n)\s*(?:\*\s*)?(?:Last\s*Date(?:\s*(?:to\s*Apply|for\s*submission|for\s*application))?|Closing\s*Date|Apply\s*Before)\s*[:\-]\s*([0-9]{4}-[0-9]{2}-[0-9]{2}|[0-9]{1,2}[./-][0-9]{1,2}[./-][0-9]{2,4})/i
  );
  if (lastDateKeyMatch) {
    const rawDate = lastDateKeyMatch[1].trim();
    const dmy = rawDate.match(/^([0-9]{1,2})[./-]([0-9]{1,2})[./-]([0-9]{4})$/);
    if (dmy) {
      result.lastDate = `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
    } else {
      result.lastDate = rawDate;
    }
  }

  // ==========================================
  // 8. Official Website / Apply Link
  // ==========================================
  const webMatch =
    normalizedText.match(/(?:^|\n)\s*(?:\*\s*)?(?:Website|Official\s*Website|Portal)\s*[:\-]\s*([^\s\n\r]+)/i) ||
    normalizedText.match(/((?:https?:\/\/|www\.)[a-zA-Z0-9\.\-]+(?:\.[a-zA-Z]{2,})[^\s\)]*)/i);

  if (webMatch) {
    let url = webMatch[1].trim().replace(/[),.;]+$/, '');
    if (!/^https?:\/\//i.test(url)) {
      url = `https://${url}`;
    }
    result.officialWebsite = url;
    result.applyLink = url;
  }

  // ==========================================
  // 9. Qualification & Experience detection
  // ==========================================
  const qualKeyMatch = normalizedText.match(/(?:^|\n)\s*(?:\*\s*)?Qualification\s*[:\-]\s*([^\n\r]+)/i);
  if (qualKeyMatch) {
    result.qualification = qualKeyMatch[1].trim();
  } else {
    const qualMatches: string[] = [];
    const qualRegexes = [
      /\b(DM|MCh|DNB|MD|MS|MBBS|BDS|MDS|BAMS|BHMS|BUMS|BPT|MPT|B\.?Sc\s+Nursing|M\.?Sc\s+Nursing|GNM|ANM|B\.?Pharm|M\.?Pharm|Pharm\.?D|DMLT|BMLT)\b/gi,
    ];
    for (const qr of qualRegexes) {
      const matches = normalizedText.match(qr);
      if (matches) {
        for (const m of matches) {
          const u = m.toUpperCase().replace(/\s+/g, ' ');
          if (!qualMatches.includes(u)) qualMatches.push(u);
        }
      }
    }
    if (qualMatches.length > 0) {
      result.qualification = qualMatches.join(' / ');
    }
  }

  const expKeyMatch = normalizedText.match(/(?:^|\n)\s*(?:\*\s*)?Experience(?:\s*Required)?\s*[:\-]\s*([^\n\r]+)/i);
  if (expKeyMatch) {
    result.experience = expKeyMatch[1].trim();
  }

  // ==========================================
  // 10. Salary detection
  // ==========================================
  const salKeyMatch = normalizedText.match(
    /(?:^|\n)\s*(?:\*\s*)?(?:Salary(?:\s*\/\s*Pay)?|Pay(?:\s*\/\s*Salary)?|Stipend|Remuneration|CTC|Package)\s*[:\-]\s*([^\n\r]+)/i
  );
  if (salKeyMatch) {
    result.salary = salKeyMatch[1].trim();
  }

  // ==========================================
  // 11. Structured Job Description (English Only)
  // Excludes interview dates so structure remains strictly Job duties & eligibility
  // ==========================================
  const orgDisplay = result.organization || 'Medical Institution';
  const locDisplay = [result.location, result.state].filter(Boolean).join(', ') || 'India';
  const roleDisplay = result.title || 'Medical Professional';
  const postCountDisplay = result.numberOfPosts ? `${result.numberOfPosts} Posts` : 'Multiple Posts';

  result.description = `JOB SUMMARY
Applications are invited for the recruitment of ${roleDisplay} (${postCountDisplay}) at ${orgDisplay}, located at ${locDisplay}.

VACANCY DETAILS
- Organization: ${orgDisplay}
- Position: ${roleDisplay}
- Total Vacancies: ${result.numberOfPosts || 1}
- Category: ${result.category || 'Medical Officer'}
- Location: ${locDisplay}
- Sector: ${result.sector === 'government' ? 'Government' : 'Private'}
${result.salary ? `- Pay/Salary: ${result.salary}\n` : ''}${result.qualification ? `- Minimum Qualification: ${result.qualification}\n` : ''}${result.experience ? `- Experience: ${result.experience}\n` : ''}
APPLICATION INSTRUCTIONS
Candidates meeting the required eligibility criteria are advised to review the official circular and appear as per the schedule with all original documents, credentials, and testimonials.`;

  if (result.title && result.title.length > 195) result.title = result.title.slice(0, 195);
  if (result.organization && result.organization.length > 195) result.organization = result.organization.slice(0, 195);
  if (result.location && result.location.length > 195) result.location = result.location.slice(0, 195);
  if (result.experience && result.experience.length > 95) result.experience = result.experience.slice(0, 95);
  if (result.salary && result.salary.length > 95) result.salary = result.salary.slice(0, 95);

  return result;
}
