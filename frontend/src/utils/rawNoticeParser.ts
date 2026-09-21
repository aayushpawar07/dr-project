import { JobCategory } from '../types';

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

const trim = (value?: string | null) => value?.trim() || '';

export function inferCategory(value?: string | null): JobCategory {
  const t = trim(value).toLowerCase();
  if (/junior resident/.test(t)) return 'Junior Resident';
  if (/senior resident/.test(t)) return 'Senior Resident';
  if (/medical officer|gdm[o]?/.test(t)) return 'Medical Officer';
  if (/professor|faculty|lecturer|tutor/.test(t)) return 'Faculty';
  if (/specialist|consultant/.test(t)) return 'Specialist';
  if (/dental|dentist|bds|mds/.test(t)) return 'Dental';
  if (/ayush|bams|bhms|unani|ayurveda/.test(t)) return 'AYUSH';
  if (/nurs/.test(t)) return 'Nursing';
  if (/pharmac/.test(t)) return 'Pharmacy';
  if (/psych/.test(t)) return 'Psychology & Mental Health';
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

export function inferState(location?: string | null): string {
  const t = trim(location).toLowerCase();
  return INDIAN_STATES.find((state) => t.includes(state.toLowerCase())) || '';
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
  ageLimit?: string;
  selectionProcess?: string;
  description?: string;
  speciality?: string;
  departmentsList?: ParsedDepartmentVacancy[];
  isMultiDepartment?: boolean;
}

export function parseRawVacancyNotice(rawText: string): ParsedNoticeResult {
  const text = rawText.trim();
  const result: ParsedNoticeResult = {
    description: text,
  };

  // 1. Post Title detection (Prioritize exact key match, never capture "Number of Posts")
  const titleKeyMatch = text.match(/(?:^|\n)\s*(?:\*\s*)?(?:Post\s+Job\s+Title|Job\s+Title|Post\s+Name|Name\s+of\s+(?:the\s+)?Post|Designation|Position|Job\s+Role|Role|Post(?!\s+(?:No|Code|Count|Number|of\s+Vacanc)))\s*[:\-]\s*([^\n\r]+)/i);
  if (titleKeyMatch) {
    result.title = titleKeyMatch[1].trim();
  }

  // 2. Organization detection
  const orgKeyMatch = text.match(/(?:^|\n)\s*(?:\*\s*)?(?:Organization(?:\s*\/\s*Hospital\s*Name)?|Hospital(?:\s*Name)?|Institute(?:\s*Name)?|College(?:\s*Name)?|Employer(?:\s*Name)?|Institution|Authority|Trust|Centre)\s*[:\-]\s*([^\n\r]+)/i);
  if (orgKeyMatch) {
    result.organization = orgKeyMatch[1].trim();
  } else {
    const orgMatch =
      text.match(/\b(AIIMS\s+[A-Za-z]+(?:\s*\([^)]+\))?)/i)
      || text.match(/\b((?:AIIMS|ESIC|PGIMER|NIMHANS|JIPMER|SGPGI|BHU|AMU)\s+[A-Za-z]+)\b/i)
      || text.match(/\b(All\s+India\s+Institute\s+of\s+Medical\s+Sciences(?:\s*,?\s*[A-Za-z]+)?)/i)
      || text.match(/(?:at|in|by|for)\s+([A-Z][A-Za-z0-9&., ]{3,55}(?:Hospital|Institute|AIIMS|Medical College|Health Centre|Clinic|Healthcare|Infirmary|Trust|Foundation|Council|University|Directorate))/i)
      || text.match(/([A-Z][A-Za-z0-9&., ]{2,50}(?:Hospital|Medical College|AIIMS|PGIMER|ESIC|Health City|Heart Institute))/i);
    if (orgMatch) {
      result.organization = orgMatch[1].trim();
    }
  }

  // 3. Sector detection
  const sectorKeyMatch = text.match(/(?:^|\n)\s*(?:\*\s*)?Job\s*Sector\s*[:\-]\s*([^\n\r]+)/i);
  if (sectorKeyMatch && /govt|government|admin|public/i.test(sectorKeyMatch[1])) {
    result.sector = 'government';
  } else if (/government|govt\.|ministry|nhm|national health mission|aiims|esic|railway|psc|upsc|sams|state health/i.test(text)) {
    result.sector = 'government';
  } else {
    result.sector = 'private';
  }

  // 4. Job Roles detection (Multi-role support)
  const detectedRoles: string[] = [];
  const roleKeywords: Array<{ role: JobCategory; regex: RegExp }> = [
    { role: 'Consultant', regex: /\b(consultant|sr\.\s*consultant)\b/i },
    { role: 'GDMO', regex: /\b(gdmo|general\s+duty\s+medical\s+officer)\b/i },
    { role: 'Senior Resident', regex: /\b(senior\s+resident|sr\b|sr\.)/i },
    { role: 'Junior Resident', regex: /\b(junior\s+resident|jr\b|jr\.)/i },
    { role: 'Medical Officer', regex: /\b(medical\s+officer|mo\b)/i },
    { role: 'Specialist', regex: /\b(specialist|super\s*specialist)\b/i },
    { role: 'Faculty', regex: /\b(faculty|professor|assoc\w*\s+professor|asst\w*\s+professor|assistant\s+professor|tutor|lecturer)\b/i },
    { role: 'Dental', regex: /\b(dental|dentist|bds|mds)\b/i },
    { role: 'AYUSH', regex: /\b(ayush|ayurved\w*|homeopath\w*|unani|siddha|bams|bhms)\b/i },
    { role: 'Nursing', regex: /\b(nurs\w*|staff\s*nurse|sister\s*tutor|gnm|b\.sc\s*nurs\w*)\b/i },
    { role: 'Pharmacy', regex: /\b(pharmac\w*|b\.pharm|d\.pharm)\b/i },
    { role: 'Paramedical', regex: /\b(paramedic\w*|lab\s*tech\w*|radiograph\w*|x-ray\s*tech\w*|ecg\s*tech\w*|ot\s*tech\w*)\b/i },
    { role: 'Allied Health', regex: /\b(allied\s*health|physiotherap\w*|occupational\s*therap\w*)\b/i },
    { role: 'Psychology & Mental Health', regex: /\b(psycholog\w*|psychiatr\w*|mental\s*health|counselor)\b/i },
    { role: 'Nutrition & Dietetics', regex: /\b(dieti\w*|nutrition\w*)\b/i },
    { role: 'Hospital Administration', regex: /\b(hospital\s*admin\w*|medical\s*superintendent|healthcare\s*admin\w*)\b/i },
    { role: 'Public Health', regex: /\b(public\s*health|epidemiolog\w*|mph\b)\b/i },
    { role: 'Life Science & Research', regex: /\b(life\s*science|research\s*officer|research\s*associate|jrf\b|srf\b)\b/i },
  ];

  for (const r of roleKeywords) {
    if (r.regex.test(text) && !detectedRoles.includes(r.role)) {
      detectedRoles.push(r.role);
    }
  }

  if (detectedRoles.length > 0) {
    result.jobRoles = detectedRoles;
    result.category = detectedRoles[0] as JobCategory;
    if (!result.title) {
      result.title = detectedRoles.slice(0, 3).join(' / ');
    }
  }

  // Fallback title detection if not yet found
  if (!result.title) {
    const titleMatch = text.match(/(?:(?:recruitment\s+(?:of|for)|walk-in(?:\s+interview)?\s+(?:for)?|applications\s+invited\s+for(?:\s+the\s+post\s+of)?)\s*[:\-]?\s*([A-Za-z0-9&/,\- ]{4,80}))/i);
    if (titleMatch) {
      result.title = titleMatch[1].trim().split(/\n|\r/)[0].replace(/^(the\s+post\s+of\s+)/i, '');
    }
  }

  // 5. Location & State detection
  const cityKeyMatch = text.match(/(?:^|\n)\s*(?:\*\s*)?(?:Location\s*(?:\(City\))?|City)\s*[:\-]\s*([^\n\r,]+)/i);
  const stateKeyMatch = text.match(/(?:^|\n)\s*(?:\*\s*)?State\s*[:\-]\s*([^\n\r]+)/i);

  if (cityKeyMatch) {
    result.location = cityKeyMatch[1].trim();
  }
  if (stateKeyMatch) {
    result.state = stateKeyMatch[1].trim();
  }

  if (!result.state) {
    for (const state of INDIAN_STATES) {
      const reg = new RegExp(`\\b${state}\\b`, 'i');
      if (reg.test(text)) {
        result.state = state;
        break;
      }
    }
  }

  if (!result.location) {
    const cityKeywords = ['Delhi', 'Mumbai', 'Bengaluru', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad', 'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow', 'Kanpur', 'Nagpur', 'Indore', 'Bhopal', 'Patna', 'Vadodara', 'Ghaziabad', 'Ludhiana', 'Agra', 'Nashik', 'Faridabad', 'Meerut', 'Rajkot', 'Varanasi', 'Srinagar', 'Aurangabad', 'Dhanbad', 'Amritsar', 'Navi Mumbai', 'Allahabad', 'Prayagraj', 'Ranchi', 'Howrah', 'Coimbatore', 'Jabalpur', 'Gwalior', 'Vijayawada', 'Jodhpur', 'Madurai', 'Raipur', 'Kota', 'Guwahati', 'Chandigarh', 'Noida', 'Gorakhpur', 'Rishikesh', 'Dehradun', 'Bhubaneswar', 'Gurgaon', 'Gurugram', 'Datia'];
    for (const city of cityKeywords) {
      if (new RegExp(`\\b${city}\\b`, 'i').test(text)) {
        result.location = city;
        if (!result.state) result.state = inferState(city) || '';
        break;
      }
    }
  }

  // 6. Qualification detection
  const qualKeyMatch = text.match(/(?:^|\n)\s*(?:\*\s*)?Qualification\s*[:\-]\s*([^\n\r]+)/i);
  if (qualKeyMatch) {
    result.qualification = qualKeyMatch[1].trim();
  } else {
    const qualMatches: string[] = [];
    const qualRegexes = [
      /\b(DM|MCh|DNB|MD|MS|MBBS|BDS|MDS|BAMS|BHMS|BUMS|BPT|MPT|B\.?Sc\s+Nursing|M\.?Sc\s+Nursing|GNM|ANM|B\.?Pharm|M\.?Pharm|Pharm\.?D|DMLT|BMLT)\b/gi
    ];
    for (const qr of qualRegexes) {
      const matches = text.match(qr);
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

  // 7. Experience detection
  const expKeyMatch = text.match(/(?:^|\n)\s*(?:\*\s*)?Experience(?:\s*Required)?\s*[:\-]\s*([^\n\r]+)/i);
  if (expKeyMatch) {
    result.experience = expKeyMatch[1].trim();
  } else {
    const expMatch = text.match(/(?:experience|exp\.)\s*[:\-]?\s*([0-9]+(?:\s*-\s*[0-9]+)?\s*(?:years?|yrs?|months?))/i)
      || text.match(/([0-9]+\s*(?:to|-)\s*[0-9]+\s*(?:years?|yrs?)\s*(?:of\s*)?experience)/i)
      || text.match(/\b(freshers?\s*(?:can\s*apply|welcome)?)\b/i);
    if (expMatch) {
      result.experience = expMatch[1].trim();
    }
  }

  // 8. Number of Posts detection
  const postCountMatch = text.match(/(?:^|\n)\s*(?:\*\s*)?(?:Number\s+of\s+Posts?|Total\s+(?:Posts?|Vacanc(?:y|ies))|Vacanc(?:y|ies))\s*[:\-]\s*([0-9]{1,4})/i)
    || text.match(/(?:no\.\s*of\s*(?:posts?|vacanc(?:y|ies))|total\s*(?:posts?|vacanc(?:y|ies)))\s*[:\-]?\s*([0-9]{1,4})/i)
    || text.match(/([0-9]{1,4})\s+(?:posts?|vacanc(?:y|ies))/i);
  if (postCountMatch) {
    const n = parseInt(postCountMatch[1], 10);
    if (!isNaN(n) && n > 0 && n < 100000) {
      result.numberOfPosts = n;
    }
  }

  // 9. Salary detection
  const salKeyMatch = text.match(/(?:^|\n)\s*(?:\*\s*)?(?:Salary(?:\s*\/\s*Pay)?|Pay(?:\s*\/\s*Salary)?|Stipend|Remuneration|CTC|Package)\s*[:\-]\s*([^\n\r]+)/i);
  if (salKeyMatch) {
    result.salary = salKeyMatch[1].trim();
  } else {
    const salMatch = text.match(/(?:salary|pay\s*scale|remuneration|stipend|ctc|package)\s*[:\-]?\s*(₹?\s*[0-9]+(?:,[0-9]+)*(?:\s*-\s*₹?\s*[0-9]+(?:,[0-9]+)*)?(?:\s*(?:\/|\s*per\s*)(?:month|pm|annum|year|lpa))?)/i)
      || text.match(/(₹\s*[0-9]+(?:,[0-9]+)*(?:\s*-\s*₹?\s*[0-9]+(?:,[0-9]+)*)?)/)
      || text.match(/([0-9]+(?:[.,][0-9]+)?\s*(?:to|-)\s*[0-9]+(?:[.,][0-9]+)?\s*(?:lpa|lakhs?|lac))/i)
      || text.match(/(level\s*[- ]\s*[0-9]{1,2}(?:\s*as\s*per\s*7th\s*cpc)?)/i);
    if (salMatch) {
      result.salary = salMatch[1].trim();
    }
  }

  // 10. Last date detection
  const lastDateKeyMatch = text.match(/(?:^|\n)\s*(?:\*\s*)?(?:Last\s*Date(?:\s*(?:to\s*Apply|for\s*submission|for\s*application))?|Closing\s*Date|Apply\s*Before)\s*[:\-]\s*([0-9]{4}-[0-9]{2}-[0-9]{2}|[0-9]{1,2}[./-][0-9]{1,2}[./-][0-9]{2,4})/i);
  if (lastDateKeyMatch) {
    const rawDate = lastDateKeyMatch[1].trim();
    const dmy = rawDate.match(/^([0-9]{1,2})[./-]([0-9]{1,2})[./-]([0-9]{4})$/);
    if (dmy) {
      result.lastDate = `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
    } else {
      result.lastDate = rawDate;
    }
  } else {
    const lastDateMatch = text.match(/(?:last\s*date(?:\s*for\s*(?:submission|application|apply))?|closing\s*date|apply\s*before|walk-in\s*interview\s*(?:on|date))\s*[:\-]?\s*([0-9]{1,2}[./-][0-9]{1,2}[./-][0-9]{2,4}|[0-9]{1,2}(?:st|nd|rd|th)?\s+(?:Jan\w*|Feb\w*|Mar\w*|Apr\w*|May|Jun\w*|Jul\w*|Aug\w*|Sep\w*|Oct\w*|Nov\w*|Dec\w*)\s*,?\s*[0-9]{4})/i);
    if (lastDateMatch) {
      const rawDate = lastDateMatch[1].trim();
      try {
        const dmy = rawDate.match(/^([0-9]{1,2})[./-]([0-9]{1,2})[./-]([0-9]{4})$/);
        if (dmy) {
          result.lastDate = `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
        } else {
          const parsed = new Date(rawDate);
          if (!isNaN(parsed.getTime())) {
            result.lastDate = parsed.toISOString().split('T')[0];
          }
        }
      } catch (_) {}
    }
  }

  // 11. Additional Eligibility Requirements & Benefits
  const reqMatch = text.match(/(?:^|\n)\s*(?:\*\s*)?(?:Additional\s+Eligibility\s*&?\s*Requirements?|Eligibility\s*&?\s*Requirements?|Requirements?)\s*[:\-]\s*([^\n\r]+)/i);
  if (reqMatch) {
    result.requirements = reqMatch[1].trim();
  }

  const ageMatch = text.match(/(?:^|\n)\s*(?:\*\s*)?(?:Age\s*Limit|Age)\s*[:\-]\s*([^\n\r]+)/i);
  if (ageMatch) {
    result.ageLimit = ageMatch[1].trim();
  }

  const benMatch = text.match(/(?:^|\n)\s*(?:\*\s*)?(?:Benefits?\s*&?\s*Perks?|Perks?)\s*[:\-]\s*([^\n\r]+)/i);
  if (benMatch) {
    result.benefits = benMatch[1].trim();
  }

  const selMatch = text.match(/(?:^|\n)\s*(?:\*\s*)?(?:Selection(?:\s+Process)?|Selection\s+is\s+conducted\s+via)\s*[:\-]?\s*([^\n\r]+)/i);
  if (selMatch) {
    result.selectionProcess = selMatch[1].trim();
  }

  // 12. Contact Email & Phone & Links
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) result.contactEmail = emailMatch[0];

  const phoneMatch = text.match(/(?:\+91[\s-]?)?[6-9][0-9]{9}/);
  if (phoneMatch) result.contactPhone = phoneMatch[0];

  const linkMatch = text.match(/https?:\/\/[^\s]+/);
  if (linkMatch) result.applyLink = linkMatch[0];

  // 13. Multi-Department & Breakdown Table Parsing
  const lines = text.split(/\r?\n/).map((l) => l.trim());
  const tableLines = lines.filter((l) => l.startsWith('|') && l.endsWith('|'));
  const depts: ParsedDepartmentVacancy[] = [];

  if (tableLines.length >= 3) {
    const rawHeaders = tableLines[0].split('|').slice(1, -1).map((h) => h.trim());
    const deptCol = rawHeaders.findIndex((h) => /dept|department|speciality|specialty|specialization|discipline|subject|branch|post\s*name|name\s*of\s*post/i.test(h));
    const totalCol = rawHeaders.findIndex((h) => /total|posts?|vacanc/i.test(h));
    let dColIdx = deptCol;
    if (dColIdx < 0) {
      dColIdx = rawHeaders.findIndex((h) => !/s\.?\s*no|sr\.?\s*no|sl\.?\s*no|serial|index|#|total|vacanc|posts?|ur|sc|st|obc|ews|gen/i.test(h));
      if (dColIdx < 0) dColIdx = 0;
    }
    const catCols = rawHeaders
      .map((h, i) => ({ name: h, idx: i }))
      .filter((c) => c.idx !== dColIdx && c.idx !== totalCol && /UR|ST|SC|OBC|EWS|GEN|PWD|PWBD|PH|SEBC|MBC|Unreserved|General|Open/i.test(c.name));

    for (let r = 1; r < tableLines.length; r++) {
      const row = tableLines[r];
      if (/^[|:\-\s]+$/.test(row)) continue;
      const cells = row.split('|').slice(1, -1).map((c) => c.trim());
      const dName = cells[dColIdx];
      if (!dName || /^(total|grand\s*total|sum)$/i.test(dName.trim())) continue;
      let count = totalCol >= 0 ? parseInt(cells[totalCol], 10) || 0 : 0;
      const catParts: string[] = [];
      let catSum = 0;
      for (const cat of catCols) {
        const val = cells[cat.idx];
        const num = parseInt(val, 10);
        if (!isNaN(num) && num > 0) {
          catParts.push(`${cat.name}: ${num}`);
          catSum += num;
        }
      }
      if (count === 0 && catSum > 0) count = catSum;
      if (count === 0) count = 1;

      depts.push({
        department: dName,
        numberOfVacancies: count,
        category: catParts.join(', '),
        postName: result.title,
      });
    }
  }

  // Fallback 1: Comma-separated departments under "Speciality / Department:"
  if (depts.length === 0) {
    const deptListMatch = text.match(/(?:^|\n)\s*(?:\*\s*)?(?:Speciality\s*\/\s*Department|Department\s*\/\s*Speciality|Department|Speciality|Specialty|Discipline|Subject)\s*[:\-]\s*([^\n\r]+)/i);
    if (deptListMatch) {
      const deptNames = deptListMatch[1]
        .split(/[,;/]/)
        .map((d) => d.trim())
        .filter((d) => d.length > 2);
      if (deptNames.length >= 2) {
        for (const dn of deptNames) {
          depts.push({
            department: dn,
            numberOfVacancies: 1,
            postName: result.title,
          });
        }
      }
    }
  }

  // Fallback 2: Bulleted or numbered department list under "Departments:" or "Specialities:"
  if (depts.length === 0) {
    const deptSectionMatch = text.match(/(?:^|\n)\s*(?:\*\s*)?(?:Departments?|Specialit(?:y|ies)|Disciplines?|Vacanc(?:y|ies)\s+Breakdown|Post\s+Details?)\s*[:\-]?\s*\n((?:[ \t]*[-*•0-9.)]\s*[^\n\r]+\n?)+)/i);
    if (deptSectionMatch) {
      const bulletLines = deptSectionMatch[1].split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      for (const bl of bulletLines) {
        const cleanLine = bl.replace(/^[-*•0-9.)\s]+/, '').trim();
        if (!cleanLine || cleanLine.length < 2) continue;
        const countMatch = cleanLine.match(/[:\-–—(]\s*([0-9]{1,3})\s*(?:posts?|vacanc(?:y|ies))?\)?$/i)
          || cleanLine.match(/\b([0-9]{1,3})\s*(?:posts?|vacanc(?:y|ies))\b/i);
        const count = countMatch ? parseInt(countMatch[1], 10) : 1;
        const dName = cleanLine.replace(/[:\-–—(]\s*[0-9]{1,3}\s*(?:posts?|vacanc(?:y|ies))?\)?$/i, '').trim();
        if (dName.length >= 2) {
          depts.push({
            department: dName,
            numberOfVacancies: count || 1,
            postName: result.title,
          });
        }
      }
    }
  }

  if (depts.length >= 2) {
    result.departmentsList = depts;
    result.isMultiDepartment = true;
    const totalCalculated = depts.reduce((sum, d) => sum + d.numberOfVacancies, 0);
    if (!result.numberOfPosts || result.numberOfPosts < totalCalculated) {
      result.numberOfPosts = totalCalculated;
    }
  }

  if (result.title && result.title.length > 195) result.title = result.title.slice(0, 195);
  if (result.organization && result.organization.length > 195) result.organization = result.organization.slice(0, 195);
  if (result.location && result.location.length > 195) result.location = result.location.slice(0, 195);
  if (result.experience && result.experience.length > 95) result.experience = result.experience.slice(0, 95);
  if (result.salary && result.salary.length > 95) result.salary = result.salary.slice(0, 95);
  if (result.speciality && result.speciality.length > 250) result.speciality = result.speciality.slice(0, 250);

  return result;
}
