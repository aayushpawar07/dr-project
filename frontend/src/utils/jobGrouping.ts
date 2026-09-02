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
    if (title.toLowerCase().endsWith(marker.toLowerCase())) {
      return title.slice(0, title.length - marker.length).trim();
    }
  }
  return title;
}

function organisation(job: any) {
  return clean(
    job?.organization ||
    job?.companyName ||
    job?.employer?.companyName ||
    job?.employerName,
  );
}

function searchTokens(query?: string) {
  if (!query?.trim()) return [];
  const raw = query
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .map((token) => token.trim())
    .filter(Boolean);
  if (raw.length <= 1) return [...new Set(raw)];
  const meaningful = raw.filter((token) => !SEARCH_STOPWORDS.has(token));
  return [...new Set(meaningful.length ? meaningful : raw)].slice(0, 12);
}

function searchTextFor(job: any) {
  return unique([
    job?.displayTitle,
    job?.title,
    organisation(job),
    job?.location,
    job?.qualification,
    job?.experience,
    job?.salary,
    job?.salaryRange,
    job?.department,
    job?.speciality,
    job?.description,
    ...(job?.departments || []),
    ...(job?.specialities || []),
  ]).join(' ');
}

function matchesQuery(job: any, query?: string) {
  const tokens = searchTokens(query);
  if (!tokens.length) return true;
  const haystack = clean(job?._groupSearchText || searchTextFor(job)).toLowerCase();
  return tokens.every((token) => haystack.includes(token));
}

export function groupRecruitmentJobs(jobs: any[], query?: string) {
  const groups = new Map<string, any[]>();
  const standalone: any[] = [];

  for (const job of Array.isArray(jobs) ? jobs : []) {
    if (!job?.sourceRecruitmentId) {
      const displayTitle = clean(job?.title);
      const enriched = { ...job, displayTitle };
      const searchText = searchTextFor(enriched);
      standalone.push({
        ...enriched,
        _groupSearchText: searchText,
        title: query?.trim() ? searchText : displayTitle,
      });
      continue;
    }

    const postName = basePostName(job) || clean(job?.title) || 'Vacancy';
    const key = `${job.sourceRecruitmentId}::${postName.toLowerCase()}`;
    const bucket = groups.get(key) || [];
    bucket.push({ ...job, _basePostName: postName });
    groups.set(key, bucket);
  }

  const grouped = [...groups.values()].map((items) => {
    const first = items[0];
    const displayTitle = first._basePostName || basePostName(first);

    // Department and speciality are separate concepts. Prefer the explicit
    // department name for display/counting, and only use speciality as a fallback
    // when a vacancy row genuinely has no department value.
    const departments = unique(items.map((item) => item.department || item.speciality));
    const specialities = unique(items.map((item) => item.speciality));
    const locations = unique(items.map((item) => item.location));
    const qualifications = unique(items.map((item) => item.qualification));
    const salaries = unique(items.map((item) => item.salary || item.salaryRange));
    const experiences = unique(items.map((item) => item.experience));
    const totalPosts = items.reduce((sum, item) => sum + Math.max(0, Number(item.numberOfPosts || 0)), 0);
    const org = organisation(first);
    const searchText = unique([
      displayTitle,
      org,
      ...departments,
      ...specialities,
      ...locations,
      ...qualifications,
      ...salaries,
      ...experiences,
      ...items.map((item) => item.description),
    ]).join(' ');

    return {
      ...first,
      displayTitle,
      title: query?.trim() ? searchText : displayTitle,
      organization: org || first.organization,
      // Any job published from a recruitment should open the recruitment-level
      // view, even when a search happens to return only one matching department.
      recruitmentGrouped: true,
      groupedVacancyRows: items.length,
      departments,
      specialities,
      departmentCount: departments.length,
      childJobIds: items.map((item) => item.id).filter(Boolean),
      numberOfPosts: totalPosts || first.numberOfPosts,
      location: locations.length > 1 ? 'Multiple Locations' : (locations[0] || first.location),
      qualification: qualifications.length > 1 ? 'Varies by department' : (qualifications[0] || first.qualification),
      salary: salaries.length > 1 ? 'Varies by department' : (salaries[0] || first.salary),
      experience: experiences.length > 1 ? 'Varies by department' : (experiences[0] || first.experience),
      _groupSearchText: searchText,
    };
  });

  return [...grouped, ...standalone]
    .filter((job) => matchesQuery(job, query))
    .sort((a, b) => {
      const ad = new Date(a.createdAt || a.postedDate || 0).getTime();
      const bd = new Date(b.createdAt || b.postedDate || 0).getTime();
      return bd - ad;
    });
}
