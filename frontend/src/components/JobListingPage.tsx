import { useEffect, useState, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Search, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
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

  const targetTitles = [
    job?.displayTitle,
    job?.title,
    ...(Array.isArray(job?.postNames) ? job.postNames : []),
    job?.category,
    job?.speciality,
    job?.department,
  ]
    .filter(Boolean)
    .map((s) => String(s).toLowerCase());

  if (targetTitles.length === 0) return false;

  const groups = roleGroups(trimmedKeyword);
  return groups.some((tokens) =>
    targetTitles.some((target) => tokens.every((token) => target.includes(token)))
  );
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
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const resultsRef = useRef<HTMLDivElement>(null);
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
        const params: any = { status: "active", size: isMultiRole ? 200 : 150 };

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

        // Check if user is returning from a previously viewed card (Point 9)
        let targetPage = 1;
        try {
          const lastJobId = sessionStorage.getItem("medex_last_viewed_job_id");
          const lastSlug = sessionStorage.getItem("medex_last_viewed_job_slug");
          if (lastJobId || lastSlug) {
            const idx = normalizedJobs.findIndex((j: any) =>
              String(j.id) === lastJobId || (j.slug && (j.slug === lastSlug || j.slug === lastJobId))
            );
            if (idx !== -1) {
              targetPage = Math.floor(idx / pageSize) + 1;
            }
          }
        } catch {}

        setJobs(normalizedJobs);
        setTotal(normalizedJobs.length);
        setCurrentPage(targetPage);

        if (keyword) {
          setHasSearched(true);
          trackSearch(keyword, locationQuery || activeLocation, normalizedJobs.length);
        }
      } catch (error) {
        console.error("Error fetching jobs:", error);
        setJobs([]);
        setTotal(0);
        setCurrentPage(1);
      } finally {
        setLoading(false);
      }
    };

    fetchJobsData();
  }, [selectedJobOption, locationQuery, filters, effectiveSector]);

  // Point 9: Auto-scroll to exact job card when returning from View Details
  useEffect(() => {
    if (loading || jobs.length === 0) return;

    let targetJobId: string | null = null;
    let targetJobSlug: string | null = null;
    try {
      targetJobId = sessionStorage.getItem("medex_last_viewed_job_id");
      targetJobSlug = sessionStorage.getItem("medex_last_viewed_job_slug");
    } catch {}

    if (!targetJobId && !targetJobSlug) return;

    const targetIdx = jobs.findIndex(
      (j: any) =>
        String(j.id) === targetJobId ||
        (j.slug && (j.slug === targetJobSlug || j.slug === targetJobId))
    );

    if (targetIdx !== -1) {
      const requiredPage = Math.floor(targetIdx / pageSize) + 1;
      if (currentPage !== requiredPage) {
        setCurrentPage(requiredPage);
        return;
      }

      const actualJob = jobs[targetIdx];
      const elemId = `job-card-${actualJob.id}`;

      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        const cardElem = document.getElementById(elemId);
        if (cardElem) {
          clearInterval(interval);
          cardElem.scrollIntoView({ behavior: "smooth", block: "center" });
          cardElem.classList.add("ring-4", "ring-blue-500", "ring-offset-4", "transition-all", "duration-500");
          setTimeout(() => {
            cardElem.classList.remove("ring-4", "ring-blue-500", "ring-offset-4");
            try {
              sessionStorage.removeItem("medex_last_viewed_job_id");
              sessionStorage.removeItem("medex_last_viewed_job_slug");
              sessionStorage.removeItem("medex_last_scroll_pos");
            } catch {}
          }, 2500);
        } else if (attempts >= 12) {
          clearInterval(interval);
          try {
            const savedScroll = sessionStorage.getItem("medex_last_scroll_pos");
            if (savedScroll) {
              window.scrollTo({ top: Number(savedScroll), behavior: "smooth" });
            }
            sessionStorage.removeItem("medex_last_viewed_job_id");
            sessionStorage.removeItem("medex_last_viewed_job_slug");
            sessionStorage.removeItem("medex_last_scroll_pos");
          } catch {}
        }
      }, 100);

      return () => clearInterval(interval);
    }
  }, [jobs, loading, currentPage]);

  const title = sector === "government" ? "Government Jobs" : sector === "private" ? "Private Jobs" : "All Jobs";
  const totalPages = Math.max(1, Math.ceil(jobs.length / pageSize));
  const paginatedJobs = jobs.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleDeleteJob = useCallback((deletedJobId: string) => {
    setJobs((prev) => prev.filter((j: any) => j.id !== deletedJobId));
    setTotal((prev) => Math.max(0, prev - 1));
  }, []);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setCurrentPage(newPage);
    // Point 4: Immediately scroll smoothly to top so user never lands on dark footer
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("...");
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  const getCountLabel = () => {
    if (loading) return "Searching...";
    const count = total;
    const jobWord = count === 1 ? "job" : "jobs";
    const keyword = selectedJobOption.trim();
    const requestedLocation = locationQuery.trim() || filters.locations[0]?.trim() || "";
    const acrossAllLocations = showingFallback || isGlobalLocation(requestedLocation) || !requestedLocation;
    const pageSuffix = totalPages > 1 ? ` (Page ${currentPage} of ${totalPages})` : "";

    if (keyword && count > 0 && acrossAllLocations) return `Found ${count} ${jobWord} matching “${keyword}” across all locations${pageSuffix}`;
    if (keyword && count > 0 && requestedLocation) return `Found ${count} ${jobWord} matching “${keyword}” in “${requestedLocation}”${pageSuffix}`;
    if (count > 0 && acrossAllLocations) return `Showing ${count} ${jobWord} across all locations${pageSuffix}`;
    if (count > 0 && requestedLocation) return `Showing ${count} ${jobWord} in “${requestedLocation}”${pageSuffix}`;
    if (count > 0) return `Showing ${count} ${jobWord}${pageSuffix}`;
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
        <div className="job-listing-main-grid grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="job-listing-sidebar hidden lg:block lg:col-span-1">
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

          <div ref={resultsRef} className="job-listing-results col-span-1 lg:col-span-3 min-w-0">
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
              ) : paginatedJobs.length > 0 ? (
                paginatedJobs.map((job: any, index: number) => (
                  <div key={job.id} className="w-full max-w-[420px] h-full justify-self-center">
                    <JobCard
                      job={job}
                      index={(currentPage - 1) * pageSize + index}
                      onViewDetails={(jobId) => onNavigate("job-detail", job.slug || jobId)}
                      onDelete={handleDeleteJob}
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

            {/* Numbered Pagination Controls (Points 4 & 8) */}
            {totalPages > 1 && (
              <div className="mt-8 sm:mt-12 pt-6 border-t border-gray-200">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  {/* Status Indicator */}
                  <div className="text-xs sm:text-sm font-medium text-slate-500 order-2 sm:order-1">
                    Showing <span className="font-semibold text-slate-800">{(currentPage - 1) * pageSize + 1}</span> to{" "}
                    <span className="font-semibold text-slate-800">{Math.min(currentPage * pageSize, jobs.length)}</span> of{" "}
                    <span className="font-semibold text-slate-800">{jobs.length}</span> jobs (Page <span className="font-bold text-blue-600">{currentPage}</span> of {totalPages})
                  </div>

                  {/* Buttons */}
                  <div className="flex flex-wrap items-center justify-center gap-2 order-1 sm:order-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="rounded-xl px-3.5 py-2 text-xs sm:text-sm font-semibold flex items-center gap-1.5 border-gray-300 shadow-xs disabled:opacity-40 disabled:cursor-not-allowed hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 transition-all cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </Button>

                    <div className="flex items-center gap-1">
                      {getPageNumbers().map((p, idx) => {
                        if (p === "...") {
                          return (
                            <span key={`dots-${idx}`} className="px-2 text-gray-400 font-bold select-none text-xs">
                              ...
                            </span>
                          );
                        }
                        const pageNum = Number(p);
                        const isActive = pageNum === currentPage;
                        return (
                          <button
                            key={pageNum}
                            type="button"
                            onClick={() => handlePageChange(pageNum)}
                            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center cursor-pointer ${
                              isActive
                                ? "bg-blue-600 text-white shadow-md ring-2 ring-blue-600 ring-offset-1"
                                : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-100 hover:border-gray-300 shadow-2xs"
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="rounded-xl px-3.5 py-2 text-xs sm:text-sm font-semibold flex items-center gap-1.5 border-gray-300 shadow-xs disabled:opacity-40 disabled:cursor-not-allowed hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 transition-all cursor-pointer"
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}