import { useEffect, useState, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Search, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { JobCard } from "./JobCard";
import { FilterSidebar, FilterOptions, emptyJobFilters } from "./FilterSidebar";
import SearchBar from "./SearchBar";
import { fetchJobs, fetchJobsMeta } from "../api/jobs";
import { trackSearch } from "../utils/searchUtils";

interface JobListingPageProps {
  onNavigate: (page: string, jobId?: string) => void;
  sector?: "government" | "private";
}

const GLOBAL_LOCATION_TERMS = new Set(["anywhere", "any location", "all locations", "any"]);
const TITLE_SEARCH_STOPWORDS = new Set([
  "a", "an", "and", "at", "for", "in", "of", "on", "the", "to", "with",
  "job", "jobs", "vacancy", "vacancies", "post", "posts",
]);

function normalizeLocation(value?: string) {
  return (value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function isGlobalLocation(value?: string) {
  return GLOBAL_LOCATION_TERMS.has(normalizeLocation(value));
}

function getTitleSearchTokens(value: string) {
  const tokens = value
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .map((token) => token.trim())
    .filter(Boolean);

  if (tokens.length <= 1) return [...new Set(tokens)];
  const meaningful = tokens.filter((token) => !TITLE_SEARCH_STOPWORDS.has(token));
  return [...new Set(meaningful.length > 0 ? meaningful : tokens)].slice(0, 12);
}

function roleGroups(value: string) {
  return value
    .split(",")
    .map((part) => getTitleSearchTokens(part.trim()))
    .filter((tokens) => tokens.length > 0);
}

function matchesWhatTitle(job: any, keyword: string) {
  const trimmedKeyword = keyword.trim();
  if (!trimmedKeyword) return true;

  const title = String(job?.title || job?.displayTitle || "").toLowerCase();
  if (!title) return false;

  const groups = roleGroups(trimmedKeyword);
  return groups.some((tokens) => tokens.every((token) => title.includes(token)));
}

function filterByWhatTitle(content: any[], keyword: string) {
  return keyword.trim() ? content.filter((job) => matchesWhatTitle(job, keyword)) : content;
}

export function JobListingPage({ onNavigate, sector }: JobListingPageProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedJobOption, setSelectedJobOption] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [filters, setFilters] = useState<FilterOptions>(emptyJobFilters());
  const [jobs, setJobs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [metaCategories, setMetaCategories] = useState<string[]>([]);
  const [metaLocations, setMetaLocations] = useState<string[]>([]);
  const [metaSpecialities, setMetaSpecialities] = useState<string[]>([]);
  const [metaDepartments, setMetaDepartments] = useState<string[]>([]);
  const [metaJobTypes, setMetaJobTypes] = useState<string[]>([]);
  const [metaQualifications, setMetaQualifications] = useState<string[]>([]);
  const [metaStates, setMetaStates] = useState<string[]>([]);
  const [metaCities, setMetaCities] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [showingFallback, setShowingFallback] = useState(false);
  const [fallbackReason, setFallbackReason] = useState("");

  const isInitialMount = useRef(true);
  const lastSearchParams = useRef<string>("");
  const effectiveSector = sector || (filters.sector || undefined);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const searchParam = params.get("search");
    const locationParam = params.get("location")?.trim() || "";
    const categoryParam = params.get("category");

    if (searchParam) {
      setSelectedJobOption(searchParam);
      setHasSearched(true);
    } else {
      setSelectedJobOption("");
    }

    setLocationQuery(locationParam);
    setFilters((prev) => ({
      ...prev,
      locations: locationParam && !isGlobalLocation(locationParam) ? [locationParam] : [],
      categories: categoryParam ? [categoryParam] : prev.categories,
    }));
  }, [location.search]);

  useEffect(() => {
    (async () => {
      try {
        const meta = await fetchJobsMeta(effectiveSector);
        setMetaCategories(Array.isArray(meta?.categories) ? meta.categories : []);
        setMetaLocations(Array.isArray(meta?.locations) ? meta.locations : []);
        setMetaSpecialities(Array.isArray(meta?.specialities) ? meta.specialities : []);
        setMetaDepartments(Array.isArray(meta?.departments) ? meta.departments : []);
        setMetaJobTypes(Array.isArray(meta?.jobTypes) ? meta.jobTypes : []);
        setMetaQualifications(Array.isArray(meta?.qualifications) ? meta.qualifications : []);
        setMetaStates(Array.isArray(meta?.states) ? meta.states : []);
        setMetaCities(Array.isArray(meta?.cities) ? meta.cities : []);
      } catch (err) {
        console.error("Error loading meta:", err);
      }
    })();
  }, [effectiveSector]);

  useEffect(() => {
    const fetchJobsData = async () => {
      const activeLocation = filters.locations[0]?.trim() || "";
      const currentParams = JSON.stringify({
        search: selectedJobOption,
        locationQuery,
        sector: effectiveSector,
        category: filters.categories[0],
        location: activeLocation,
        featured: filters.featured,
        speciality: filters.speciality,
        department: filters.department,
        jobType: filters.jobType,
        qualification: filters.qualification,
        state: filters.state,
        city: filters.city,
      });

      if (currentParams === lastSearchParams.current && !isInitialMount.current) return;
      lastSearchParams.current = currentParams;
      isInitialMount.current = false;

      setLoading(true);
      setShowingFallback(false);
      setFallbackReason("");

      try {
        const keyword = selectedJobOption.trim();
        const isMultiRole = keyword.includes(",");
        const params: any = { status: "active", size: isMultiRole ? 100 : 50 };

        // For comma-separated role searches, fetch a broader result set and apply OR matching locally.
        if (keyword && !isMultiRole) params.search = keyword;
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

        const initialResponse = await fetchJobs(params);
        const initialContent = Array.isArray(initialResponse?.content) ? initialResponse.content : [];
        let content = filterByWhatTitle(initialContent, keyword);

        if (content.length === 0 && activeLocation) {
          const fallbackParams: any = { ...params };
          delete fallbackParams.location;

          const fallback = await fetchJobs(fallbackParams);
          const fallbackContent = Array.isArray(fallback?.content) ? fallback.content : [];
          const titleMatchedFallback = filterByWhatTitle(fallbackContent, keyword);

          if (titleMatchedFallback.length > 0) {
            content = titleMatchedFallback;
            setShowingFallback(true);
            setFallbackReason(
              keyword
                ? `No matching jobs are currently listed in “${activeLocation}”. Showing matching roles from all available locations.`
                : `No jobs are currently listed in “${activeLocation}”. Showing available jobs from all locations.`
            );
          }
        }

        const normalizedJobs = content.map((job: any) => ({
          ...job,
          sector: job.sector?.toLowerCase() || "private",
        }));

        setJobs(normalizedJobs);
        setTotal(normalizedJobs.length);

        if (keyword) {
          setHasSearched(true);
          trackSearch(keyword, locationQuery || activeLocation, normalizedJobs.length);
        }
      } catch (error) {
        console.error("Error fetching jobs:", error);
        setJobs([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    };

    fetchJobsData();
  }, [selectedJobOption, locationQuery, filters, effectiveSector]);

  const title = sector === "government" ? "Government Jobs" : sector === "private" ? "Private Jobs" : "All Jobs";

  const getCountLabel = () => {
    if (loading) return "Searching...";
    const count = total;
    const jobWord = count === 1 ? "job" : "jobs";
    const keyword = selectedJobOption.trim();
    const requestedLocation = locationQuery.trim() || filters.locations[0]?.trim() || "";
    const acrossAllLocations = showingFallback || isGlobalLocation(requestedLocation) || !requestedLocation;

    if (keyword && count > 0 && acrossAllLocations) return `Found ${count} ${jobWord} matching “${keyword}” across all locations`;
    if (keyword && count > 0 && requestedLocation) return `Found ${count} ${jobWord} matching “${keyword}” in “${requestedLocation}”`;
    if (count > 0 && acrossAllLocations) return `Showing ${count} ${jobWord} across all locations`;
    if (count > 0) return `Showing ${count} ${jobWord}`;
    if (keyword) return `No job titles found matching “${keyword}”`;
    return "No jobs available";
  };

  const liveSearchTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const handleLiveSearch = useCallback((query: string, locationVal?: string) => {
    if (liveSearchTimerRef.current) clearTimeout(liveSearchTimerRef.current);

    liveSearchTimerRef.current = setTimeout(() => {
      const keyword = query.trim();
      setSelectedJobOption(query);

      if (locationVal !== undefined) {
        const rawLocation = locationVal.trim();
        setLocationQuery(rawLocation);
        setFilters((prev) => ({
          ...prev,
          locations: rawLocation && !isGlobalLocation(rawLocation) ? [rawLocation] : [],
        }));
      }

      if (keyword) setHasSearched(true);

      const params = new URLSearchParams(location.search);
      if (keyword) params.set("search", keyword);
      else params.delete("search");

      if (locationVal !== undefined && locationVal.trim()) params.set("location", locationVal.trim());
      else if (locationVal !== undefined) params.delete("location");

      const newSearch = params.toString() ? `?${params.toString()}` : "";
      navigate(`${location.pathname}${newSearch}`, { replace: true });
    }, 250);
  }, [location.search, location.pathname, navigate]);

  const handleClearSearch = () => {
    setSelectedJobOption("");
    setLocationQuery("");
    setHasSearched(false);
    setShowingFallback(false);
    setFallbackReason("");
    setFilters(emptyJobFilters());
    navigate(sector === "government" ? "/govt-jobs" : sector === "private" ? "/private-jobs" : "/jobs");
  };

  const keyword = selectedJobOption.trim();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-6 sm:py-8">
          <h1 className="text-2xl sm:text-3xl text-gray-900 mb-4">{title}</h1>
          <SearchBar
            initialQuery={selectedJobOption}
            initialLocation={locationQuery}
            compact={true}
            sector={effectiveSector}
            onLiveSearch={handleLiveSearch}
            showLabels={false}
          />
        </div>
      </div>

      <div className="container mx-auto px-3 sm:px-4 py-5 sm:py-8">
        <div className="grid md:grid-cols-4 gap-4 sm:gap-6">
          <div className="md:col-span-1">
            <FilterSidebar
              onFilterChange={setFilters}
              showSector={!sector}
              categories={metaCategories}
              locations={metaLocations}
              specialities={metaSpecialities}
              departments={metaDepartments}
              jobTypes={metaJobTypes}
              qualifications={metaQualifications}
              states={metaStates}
              cities={metaCities}
            />
          </div>

          <div className="md:col-span-3 min-w-0">
            <div className="mb-4 sm:mb-6">
              <p className="text-gray-700 font-medium text-sm sm:text-base">{getCountLabel()}</p>
              {showingFallback && fallbackReason && (
                <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-3 sm:px-4 py-3 text-xs sm:text-sm text-blue-800 leading-relaxed">
                  {fallbackReason}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 items-stretch">
              {loading ? (
                <div className="lg:col-span-2 xl:col-span-3 text-center py-14 sm:py-16">
                  <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 animate-spin text-blue-600 mx-auto mb-4" />
                  <p className="text-gray-500 text-base sm:text-lg">Searching for jobs...</p>
                </div>
              ) : jobs.length > 0 ? (
                jobs.map((job: any) => (
                  <div key={job.id} className="w-full max-w-[420px] h-full justify-self-center">
                    <JobCard
                      job={job}
                      onViewDetails={(jobId) => onNavigate("job-detail", job.slug || jobId)}
                    />
                  </div>
                ))
              ) : (
                <div className="lg:col-span-2 xl:col-span-3 text-center py-12 sm:py-16 bg-white rounded-lg shadow-sm border px-4">
                  <Search className="w-14 h-14 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
                    {hasSearched && keyword ? "No matching job titles found" : "No active jobs available"}
                  </h3>
                  <p className="text-gray-500 mb-6 max-w-md mx-auto text-sm sm:text-base">
                    {hasSearched && keyword
                      ? `There are currently no active job titles matching “${keyword}” with the selected filters.`
                      : "There are currently no active jobs matching the selected portal filters."}
                  </p>
                  <Button variant="outline" onClick={handleClearSearch}>Clear Search & Filters</Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}