import { isGenericNotice, isRegulatoryDump } from './extractedFieldDisplay';

const SEARCH_STOPWORDS = new Set([
  'a', 'an', 'and', 'at', 'for', 'in', 'of', 'on', 'the', 'to', 'with',
  'job', 'jobs', 'vacancy', 'vacancies', 'post', 'posts', 'recruitment',
]);

function clean(value: unknown) {
  return String(value ?? '').trim();
}

function unique(values: unknown[]) {
  return [...new Set(values.map(clean).filter(Boolean))];
}

function basePostName(job: any) {
  const title = clean(job?.displayTitle || job?.title);
  const suffixes = unique([job?.speciality, job?.department]);
  for (const suffix of suffixes) {
    const marker = ` - ${suffix}`;
    if (title.toLowerCase().endsWith(marker.toLowerCase())) return title.slice(0, title.length - marker.length).trim();
  }
  return title;
}

function organisation(job: any) {
  return clean(
    job?.organization ||
    job?.organisationName ||
    job?.organisation ||
    job?.companyName ||
    job?.employer?.companyName ||
    job?.employerName ||
    job?.hospitalName,
  );
}

function searchTokens(query?: string) {
  if (!query?.trim()) return [];
  const raw = query.toLowerCase().split(/[^\p{L}\p{N}]+/u).map((token) => token.trim()).filter(Boolean);
  if (raw.length <= 1) return [...new Set(raw)];
  const meaningful = raw.filter((token) => !SEARCH_STOPWORDS.has(token));
  return [...new Set(meaningful.length ? meaningful : raw)].slice(0, 12);
}

function queryGroups(query?: string) {
  if (!query?.trim()) return [];
  return query.split(',').map((part) => searchTokens(part)).filter((tokens) => tokens.length > 0);
}

function searchTextFor(job: any) {
  return unique([
    job?.displayTitle, job?.title, organisation(job), job?.location, job?.state,
    job?.qualification, job?.experience, job?.salary, job?.salaryRange,
    job?.department, job?.speciality, job?.description,
    ...(job?.departments || []), ...(job?.specialities || []),
  ]).join(' ');
}

function matchesQuery(job: any, query?: string) {
  const groups = queryGroups(query);
  if (!groups.length) return true;
  const haystack = clean([
    job?.displayTitle,
    job?.title,
    ...(job?.postNames || []),
    ...(job?.departments || []),
    ...(job?.specialities || []),
    job?.department,
    job?.speciality,
    job?.category,
    organisation(job),
    job?.location,
  ].filter(Boolean).join(' ')).toLowerCase();
  // Comma-separated role groups are OR; words within each role are AND.
  return groups.some((tokens) => tokens.every((token) => haystack.includes(token)));
}

/**
 * Resolves standard card title according to user specifications:
 * Strictly 2 title types:
 * 1. Individual Cadre/Role:
 *    - Junior Resident (JR)
 *    - Senior Resident (SR)
 *    - Faculty
 *    - Medical Officer (MO / GDMO)
 *    - Consultant / Specialist
 *    - Paramedical Staff
 *    - Research / Survey
 * 2. Various Departments (Multiple Department):
 *    - Whenever there are multiple departments, multiple roles, or multiple posts.
 */
export function resolveStandardCardTitle(input: any): string {
  if (!input) return 'Medical Vacancy';
  const items = Array.isArray(input) ? input : [input];
  const first = items[0] || {};

  const departments = unique(items.flatMap((item) => [item.department, item.speciality])).filter(Boolean);
  const postNames = unique(items.map((item) => item._basePostName || basePostName(item))).filter(Boolean);

  const rawUserTitle = clean(first?.title || first?.displayTitle || '');
  const isLegacyConcat = /\+\s*\d+\s*more\s*posts/i.test(rawUserTitle);

  // Extract ONLY cadre / designation fields (never clinical department names)
  const cadreText = items
    .map((item) => `${item.title || ''} ${item.displayTitle || ''} ${item.category || ''} ${item._basePostName || ''} ${Array.isArray(item.jobRoles) ? item.jobRoles.join(' ') : (item.jobRoles || '')}`)
    .join(' ')
    .toLowerCase();

  // Detect individual cadres based strictly on designation / role keywords
  const hasJR = /\b(junior\s*resident|jr\b|jr\s*resident|junior\s*residency|house\s*job|house\s*physician|house\s*surgeon)\b/i.test(cadreText);
  const hasSR = /\b(senior\s*resident|sr\b|sr\s*resident|senior\s*residency)\b/i.test(cadreText);
  const hasFaculty = /\b(faculty|professor|associate\s*prof|assistant\s*prof|lecturer|tutor|dean|principal)\b/i.test(cadreText);
  const hasMO = /\b(medical\s*officer|gdmo|general\s*duty|smo\b|cmo\b|rmo\b|casualty\s*medical|duty\s*doctor|fmo|imo|ayush|ayurved|homeopath|unani)\b/i.test(cadreText);
  // Match explicit consultant/specialist posts only (not medical specialties like radiology or pathology)
  const hasConsultant = /\b(consultant|specialist|super\s*specialist|attending\s*consultant|intensivist)\b/i.test(cadreText);
  const hasParamedical = /\b(paramedical|nurse|nursing|technician|radiographer|optometrist|dietician|ecg)\b/i.test(cadreText) || (/\b(pharmacist|dispenser)\b/i.test(cadreText) && !/\bpharmacolog/i.test(cadreText));
  const hasResearch = /\b(research\s*scientist|research\s*fellow|project\s*fellow|research\s*associate|survey\s*officer)\b/i.test(cadreText);

  const detectedCadres: string[] = [];
  if (hasJR) detectedCadres.push('Junior Resident (JR)');
  if (hasSR) detectedCadres.push('Senior Resident (SR)');
  if (hasFaculty) detectedCadres.push('Faculty');
  if (hasMO) detectedCadres.push('Medical Officer (MO / GDMO)');
  if (hasConsultant) detectedCadres.push('Consultant / Specialist');
  if (hasParamedical) detectedCadres.push('Paramedical Staff');
  if (hasResearch) detectedCadres.push('Research / Survey');

  // 1. If exactly 1 cadre detected across the circular (e.g. all 618 posts in Odisha are Junior Resident, or Faculty in Basti):
  // It is an individual cadre recruitment! Do NOT call it "Various Departments"!
  if (detectedCadres.length === 1) {
    if (rawUserTitle && !isLegacyConcat && !/various\s*departments/i.test(rawUserTitle)) {
      const cleanUser = rawUserTitle.replace(/\s*-\s*(Northern\s*Railway|AIIMS|ESIC|Hospital|State\s*Cancer|Railway|Medical\s*College).*$/i, '').trim();
      if (cleanUser && !/^\d+\s*posts?$/i.test(cleanUser)) {
        if (/junior\s*resident/i.test(cleanUser)) return 'Junior Resident (JR)';
        if (/senior\s*resident/i.test(cleanUser)) return 'Senior Resident (SR)';
        if (/faculty|professor/i.test(cleanUser)) return 'Faculty';
        if (/medical\s*officer|gdmo/i.test(cleanUser)) return 'Medical Officer (MO / GDMO)';
        if (/consultant|specialist/i.test(cleanUser)) return 'Consultant / Specialist';
        return cleanUser;
      }
    }
    return detectedCadres[0];
  }

  // 2. If multiple distinct cadres exist (e.g. MO + Specialist + Paramedical) or legacy concatenation or explicit multiple departments:
  const allText = items
    .map((item) => `${item.title || ''} ${item.displayTitle || ''} ${item.category || ''} ${item._basePostName || ''} ${Array.isArray(item.jobRoles) ? item.jobRoles.join(' ') : (item.jobRoles || '')} ${item.department || ''} ${item.speciality || ''}`)
    .join(' ')
    .toLowerCase();
  const hasMultipleCadres = detectedCadres.length > 1;
  const hasMultipleKeywords = /\b(various\s*departments|multiple\s*departments|various\s*disciplines|multiple\s*disciplines|various\s*posts|multiple\s*roles)\b/i.test(allText);
  if (hasMultipleCadres || isLegacyConcat || hasMultipleKeywords) {
    return 'Various Departments (Multiple Department)';
  }

  // 3. If user provided a clean custom title:
  if (rawUserTitle && !isLegacyConcat && !/various\s*departments/i.test(rawUserTitle)) {
    const cleanUser = rawUserTitle.replace(/\s*-\s*(Northern\s*Railway|AIIMS|ESIC|Hospital|State\s*Cancer|Railway|Medical\s*College).*$/i, '').trim();
    if (cleanUser) return cleanUser;
  }

  // 4. If single distinct post name:
  if (postNames.length === 1 && postNames[0]) {
    return postNames[0];
  }

  // 5. Multiple departments fallback:
  if (departments.length > 1 || items.length > 1) {
    return 'Various Departments (Multiple Department)';
  }

  return clean(first?.title) || 'Medical Vacancy';
}

export function groupRecruitmentJobs(jobs: any[], query?: string) {
  const groups = new Map<string, any[]>();
  const standalone: any[] = [];

  for (const job of Array.isArray(jobs) ? jobs : []) {
    if (!job?.sourceRecruitmentId) {
      const displayTitle = resolveStandardCardTitle(job);
      const enriched = { ...job, displayTitle, title: displayTitle };
      const searchText = searchTextFor(enriched);
      standalone.push({ ...enriched, _groupSearchText: searchText, title: displayTitle });
      continue;
    }

    const postName = basePostName(job) || clean(job?.title) || 'Vacancy';
    const key = String(job.sourceRecruitmentId);
    const bucket = groups.get(key) || [];
    bucket.push({ ...job, _basePostName: postName });
    groups.set(key, bucket);
  }

  const grouped = [...groups.values()].map((items) => {
    const first = items[0];
    const departments = unique(items.map((item) => item.department || item.speciality)).filter(Boolean);
    const postNames = unique(items.map((item) => item._basePostName || basePostName(item))).filter(Boolean);
    const displayTitle = resolveStandardCardTitle(items);
    const specialities = unique(items.map((item) => item.speciality));
    const locations = unique(items.map((item) => item.location));
    const states = unique(items.map((item) => item.state));
    const qualifications = unique(items.map((item) => item.qualification)).filter((value) => !isRegulatoryDump(value) && !isGenericNotice(value));
    const salaries = unique(items.map((item) => item.salary || item.salaryRange)).filter((value) => !isRegulatoryDump(value));
    const experiences = unique(items.map((item) => item.experience)).filter((value) => !isRegulatoryDump(value) && !isGenericNotice(value));
    const totalPosts = items.reduce((sum, item) => sum + Math.max(0, Number(item.numberOfPosts || 0)), 0);
    const org = organisation(first);
    const searchText = unique([
      displayTitle, org, ...postNames, ...departments, ...specialities, ...locations, ...states,
      ...qualifications, ...salaries, ...experiences, ...items.map((item) => item.description),
    ]).join(' ');

    const allRoles = unique(
      items.flatMap((item) => {
        const rList: string[] = [];
        if (Array.isArray(item.jobRoles)) {
          item.jobRoles.forEach((r: any) => {
            if (typeof r === 'string') {
              r.split(/[/,]| and /i).forEach((p) => {
                if (p.trim()) rList.push(p.trim());
              });
            }
          });
        } else if (typeof item.jobRoles === 'string') {
          item.jobRoles.split(/[/,]| and /i).forEach((p: string) => {
            if (p.trim()) rList.push(p.trim());
          });
        }
        if (item.category && item.category !== 'Multiple Roles') {
          item.category.split(/[/,]| and /i).forEach((p: string) => {
            if (p.trim()) rList.push(p.trim());
          });
        }
        return rList;
      })
    );

    const groupContextText = items
      .map((item) => `${item.title || ''} ${item.department || ''} ${item.speciality || ''} ${item.description || ''}`)
      .join(' ')
      .toLowerCase();

    const isFacultyGroup = items.some((item) =>
      /\b(faculty|professor|assoc\w*\s+prof|asst\w*\s+prof|assistant\s+professor|tutor|lecturer)\b/i.test(
        `${item.title || ''} ${item.category || ''} ${item.jobRoles || ''}`
      )
    );
    const hasPharmacology = /\bpharmacolog\w*\b/i.test(groupContextText);
    const hasRealPharmacy = /\b(pharmacist|b\.?\s*pharm|d\.?\s*pharm|m\.?\s*pharm|pharm\.?\s*d|dispenser)\b/i.test(groupContextText);
    const hasPsychiatry = /\bpsychiatr\w*\b/i.test(groupContextText);
    const hasRealPsychology = /\b(psycholog\w*|mental\s*health|counselor|counsellor)\b/i.test(groupContextText);

    const filteredRoles = allRoles.filter((r) => {
      const lower = r.toLowerCase().trim();
      if (isFacultyGroup) {
        if ((lower === 'pharmacy' || lower === 'pharmacist') && !hasRealPharmacy) return false;
        if ((lower.includes('psychology') || lower === 'psychology & mental health') && !hasRealPsychology) return false;
      }
      if ((lower === 'pharmacy' || lower === 'pharmacist') && (hasPharmacology && !hasRealPharmacy)) {
        return false;
      }
      if ((lower.includes('psychology') || lower === 'psychology & mental health') && (hasPsychiatry && !hasRealPsychology)) {
        return false;
      }
      return true;
    });

    return {
      ...first,
      displayTitle,
      title: displayTitle,
      organization: org || first.organization,
      recruitmentGrouped: true,
      groupedVacancyRows: items.length,
      postNames,
      jobRoles: filteredRoles.length > 0 ? filteredRoles : (first.jobRoles || (first.category ? [first.category] : undefined)),
      departments,
      specialities,
      departmentCount: departments.length,
      childJobIds: items.map((item) => item.id).filter(Boolean),
      numberOfPosts: totalPosts || first.numberOfPosts,
      location: locations.length > 1 ? 'Multiple Locations' : (locations[0] || first.location),
      state: states.length === 1 ? states[0] : first.state,
      qualification: qualifications.length > 1 ? 'Varies by post' : (qualifications[0] || first.qualification),
      salary: salaries.length > 1 ? 'Varies by post' : (salaries[0] || first.salary),
      experience: experiences.length > 1 ? 'Varies by post' : (experiences[0] || first.experience),
      category: unique(items.map((item) => item.category)).length === 1 ? first.category : 'Multiple Roles',
      _groupSearchText: searchText,
    };
  });

  return [...grouped, ...standalone]
    .filter((job) => matchesQuery(job, query))
    .sort((a, b) => new Date(b.createdAt || b.postedDate || 0).getTime() - new Date(a.createdAt || a.postedDate || 0).getTime());
}
