import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Loader2, Search, SlidersHorizontal, X } from 'lucide-react';
import { Button } from './ui/button';
import { JobCard } from './JobCard';
import { FilterSidebar, FilterOptions, emptyJobFilters } from './FilterSidebar';
import SearchBar from './SearchBar';
import { fetchJobs, fetchJobsMeta } from '../api/jobs';
import { trackSearch } from '../utils/searchUtils';

interface JobListingPageProps {
  onNavigate: (page: string, jobId?: string) => void;
  sector?: 'government' | 'private';
}

const GLOBAL_LOCATION_TERMS = new Set(['anywhere', 'any location', 'all locations', 'any']);
const STOPWORDS = new Set(['a', 'an', 'and', 'at', 'for', 'in', 'of', 'on', 'the', 'to', 'with', 'job', 'jobs', 'vacancy', 'vacancies', 'post', 'posts']);

function normalizeLocation(value?: string) {
  return (value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function isGlobalLocation(value?: string) {
  return GLOBAL_LOCATION_TERMS.has(normalizeLocation(value));
}

function roleTokens(value: string) {
  const raw = value.toLowerCase().split(/[^\p{L}\p{N}]+/u).map((token) => token.trim()).filter(Boolean);
  const filtered = raw.length > 1 ? raw.filter((token) => !STOPWORDS.has(token)) : raw;
  return [...new Set(filtered.length ? filtered : raw)];
}

function roleGroups(value: string) {
  return value.split(',').map((part) => roleTokens(part)).filter((tokens) => tokens.length > 0);
}

function matchesRoleSearch(job: any, query: string) {
  const groups = roleGroups(query);
  if (!groups.length) return true;
  const searchable = String(job?.title || job?.displayTitle || '').toLowerCase();
  return groups.some((tokens) => tokens.every((token) => searchable.includes(token)));
}

export function JobListingPage({ onNavigate, sector }: JobListingPageProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const resultsRef = useRef<HTMLDivElement>(null);
  const liveSearchTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const [selectedJobOption, setSelectedJobOption] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [filters, setFilters] = useState<FilterOptions>(emptyJobFilters());
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [jobs, setJobs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [meta, setMeta] = useState<any>({ categories: [], locations: [], specialities: [], departments: [], jobTypes: [], qualifications: [], states: [], cities: [] });
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [showingFallback, setShowingFallback] = useState(false);
  const [fallbackReason, setFallbackReason] = useState('');

  const effectiveSector = sector || (filters.sector || undefined);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const searchParam = params.get('search') || '';
    const locationParam = params.get('location')?.trim() || '';
    const categoryParam = params.get('category') || '';
    setSelectedJobOption(searchParam);
    setLocationQuery(locationParam);
    setHasSearched(Boolean(searchParam));
    setFilters((prev) => ({
      ...prev,
      locations: locationParam && !isGlobalLocation(locationParam) ? [locationParam] : [],
      categories: categoryParam ? [categoryParam] : prev.categories,
    }));
  }, [location.search]);

  useEffect(() => {
    fetchJobsMeta(effectiveSector)
      .then((data) => setMeta(data || {}))
      .catch(() => setMeta({ categories: [], locations: [], specialities: [], departments: [], jobTypes: [], qualifications: [], states: [], cities: [] }));
  }, [effectiveSector]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setShowingFallback(false);
      setFallbackReason('');
      try {
        const keyword = selectedJobOption.trim();
        const activeLocation = filters.locations[0]?.trim() || '';
        const params: any = { status: 'active', size: 50 };
        if (keyword) params.search = keyword;
        if (effectiveSector) params.sector = effectiveSector;
        if (filters.categories[0]) params.category = filters.categories[0];
        if (activeLocation) params.location = activeLocation;
        if (filters.featured) params.featured = true;
        if (filters.speciality) params.speciality = filters.speciality;
        if (filters.department) params.department = filters.department;
        if (filters.jobType) params.jobType = filters.jobType;
        if (filters.qualification) params.qualification = filters.qualification;
        if (filters.state) params.state = filters.state;
        if (filters.city) params.city = filters.city;

        let response = await fetchJobs(params);
        let content = (Array.isArray(response?.content) ? response.content : []).filter((job: any) => matchesRoleSearch(job, keyword));

        if (content.length === 0 && activeLocation) {
          const fallbackParams = { ...params };
          delete fallbackParams.location;
          response = await fetchJobs(fallbackParams);
          const fallback = (Array.isArray(response?.content) ? response.content : []).filter((job: any) => matchesRoleSearch(job, keyword));
          if (fallback.length) {
            content = fallback;
            setShowingFallback(true);
            setFallbackReason(keyword
              ? `No matching jobs are listed in “${activeLocation}”. Showing matching roles from all locations.`
              : `No jobs are listed in “${activeLocation}”. Showing available jobs from all locations.`);
          }
        }

        if (!cancelled) {
          setJobs(content.map((job: any) => ({ ...job, sector: job.sector?.toLowerCase() || 'private' })));
          setTotal(content.length);
          if (keyword) {
            setHasSearched(true);
            trackSearch(keyword, locationQuery || activeLocation, content.length);
          }
        }
      } catch (error) {
        console.error('Error fetching jobs:', error);
        if (!cancelled) { setJobs([]); setTotal(0); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => { cancelled = true; };
  }, [selectedJobOption, locationQuery, filters, effectiveSector]);

  const handleLiveSearch = useCallback((query: string, locationValue?: string) => {
    if (liveSearchTimerRef.current) clearTimeout(liveSearchTimerRef.current);
    liveSearchTimerRef.current = setTimeout(() => {
      const keyword = query.trim();
      setSelectedJobOption(query);
      if (locationValue !== undefined) {
        const place = locationValue.trim();
        setLocationQuery(place);
        setFilters((prev) => ({ ...prev, locations: place && !isGlobalLocation(place) ? [place] : [] }));
      }
      if (keyword) setHasSearched(true);
      const params = new URLSearchParams(location.search);
      keyword ? params.set('search', keyword) : params.delete('search');
      if (locationValue !== undefined) locationValue.trim() ? params.set('location', locationValue.trim()) : params.delete('location');
      navigate(`${location.pathname}${params.toString() ? `?${params}` : ''}`, { replace: true });
    }, 250);
  }, [location.pathname, location.search, navigate]);

  const applyFilters = (next: FilterOptions) => {
    setFilters(next);
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setMobileFiltersOpen(false);
      window.setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    }
  };

  const clearAll = () => {
    setSelectedJobOption('');
    setLocationQuery('');
    setFilters(emptyJobFilters());
    setHasSearched(false);
    setShowingFallback(false);
    setFallbackReason('');
    navigate(sector === 'government' ? '/govt-jobs' : sector === 'private' ? '/private-jobs' : '/jobs');
  };

  const activeFilterCount = useMemo(() => [
    filters.sector, filters.state, filters.city, filters.speciality, filters.department,
    filters.jobType, filters.qualification, filters.featured ? 'featured' : '',
    ...filters.categories, ...filters.locations,
  ].filter(Boolean).length, [filters]);

  const title = sector === 'government' ? 'Government Jobs' : sector === 'private' ? 'Private Jobs' : 'All Jobs';
  const countLabel = loading ? 'Searching...' : total ? `${total} matching ${total === 1 ? 'job' : 'jobs'}` : 'No matching jobs';

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b bg-white">
        <div className="container mx-auto px-4 py-6 sm:py-8">
          <h1 className="mb-4 text-2xl font-semibold text-slate-900 sm:text-3xl">{title}</h1>
          <SearchBar initialQuery={selectedJobOption} initialLocation={locationQuery} compact sector={effectiveSector} onLiveSearch={handleLiveSearch} showLabels={false} />
        </div>
      </div>

      <div className="container mx-auto px-3 py-5 sm:px-4 sm:py-8">
        <div className="mb-4 flex items-center justify-between md:hidden">
          <Button variant="outline" onClick={() => setMobileFiltersOpen(true)} className="gap-2">
            <SlidersHorizontal className="h-4 w-4" /> Filters {activeFilterCount > 0 && <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs text-white">{activeFilterCount}</span>}
          </Button>
          {(activeFilterCount > 0 || selectedJobOption || locationQuery) && <Button variant="ghost" size="sm" onClick={clearAll}>Clear all</Button>}
        </div>

        {mobileFiltersOpen && (
          <div className="fixed inset-0 z-50 bg-black/35 md:hidden" onClick={() => setMobileFiltersOpen(false)}>
            <div className="absolute inset-y-0 left-0 w-[88%] max-w-sm overflow-y-auto bg-slate-50 p-3" onClick={(event) => event.stopPropagation()}>
              <div className="mb-3 flex items-center justify-between px-1">
                <strong>Filter jobs</strong>
                <Button variant="ghost" size="icon" onClick={() => setMobileFiltersOpen(false)}><X className="h-5 w-5" /></Button>
              </div>
              <FilterSidebar value={filters} onFilterChange={applyFilters} showSector={!sector} categories={meta.categories || []} locations={meta.locations || []} specialities={meta.specialities || []} departments={meta.departments || []} jobTypes={meta.jobTypes || []} qualifications={meta.qualifications || []} states={meta.states || []} cities={meta.cities || []} />
            </div>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-4">
          <aside className="hidden md:col-span-1 md:block">
            <FilterSidebar value={filters} onFilterChange={applyFilters} showSector={!sector} categories={meta.categories || []} locations={meta.locations || []} specialities={meta.specialities || []} departments={meta.departments || []} jobTypes={meta.jobTypes || []} qualifications={meta.qualifications || []} states={meta.states || []} cities={meta.cities || []} />
          </aside>

          <main ref={resultsRef} className="min-w-0 md:col-span-3">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-slate-700 sm:text-base">{countLabel}</p>
              {selectedJobOption.includes(',') && <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700">Multiple-role search</span>}
            </div>

            {showingFallback && fallbackReason && <div className="mb-5 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">{fallbackReason}</div>}

            <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2 xl:grid-cols-3 sm:gap-6">
              {loading ? (
                <div className="py-16 text-center lg:col-span-2 xl:col-span-3"><Loader2 className="mx-auto mb-4 h-11 w-11 animate-spin text-blue-600" /><p className="text-slate-500">Searching for jobs...</p></div>
              ) : jobs.length ? (
                jobs.map((job: any) => <div key={job.id} className="h-full w-full max-w-[420px] justify-self-center"><JobCard job={job} onViewDetails={(jobId) => onNavigate('job-detail', job.slug || jobId)} /></div>)
              ) : (
                <div className="rounded-xl border bg-white px-4 py-14 text-center shadow-sm lg:col-span-2 xl:col-span-3">
                  <Search className="mx-auto mb-4 h-14 w-14 text-slate-300" />
                  <h3 className="text-lg font-semibold text-slate-900">{hasSearched ? 'No matching jobs found' : 'No active jobs available'}</h3>
                  <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">Try another role, remove a filter, or search multiple roles separated by commas.</p>
                  <Button variant="outline" className="mt-5" onClick={clearAll}>Clear search & filters</Button>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
