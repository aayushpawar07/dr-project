import { useEffect, useState, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Search, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { JobCard } from "./JobCard";
import { FilterSidebar, FilterOptions } from "./FilterSidebar";
import SearchBar from "./SearchBar";
import { fetchJobs, fetchJobsMeta } from "../api/jobs";
import { trackSearch } from "../utils/searchUtils";

interface JobListingPageProps {
  onNavigate: (page: string, jobId?: string) => void;
  sector?: "government" | "private";
}

export function JobListingPage({ onNavigate, sector }: JobListingPageProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedJobOption, setSelectedJobOption] = useState("");
  const [filters, setFilters] = useState<FilterOptions>({ categories: [], locations: [], featured: false });
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

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const searchParam = params.get("search");
    const locationParam = params.get("location");
    const categoryParam = params.get("category");

    if (searchParam) {
      setSelectedJobOption(searchParam);
      setHasSearched(true);
    } else {
      setSelectedJobOption("");
    }

    setFilters((prev) => ({
      ...prev,
      locations: locationParam ? [locationParam] : [],
      categories: categoryParam ? [categoryParam] : prev.categories,
    }));
  }, [location.search]);

  useEffect(() => {
    (async () => {
      try {
        const meta = await fetchJobsMeta(sector);
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
  }, [sector]);

  useEffect(() => {
    const fetchJobsData = async () => {
      const currentParams = JSON.stringify({
        search: selectedJobOption,
        sector,
        category: filters.categories[0],
        location: filters.locations[0],
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
        const params: any = { status: "active", size: 50 };
        if (selectedJobOption?.trim()) params.search = selectedJobOption.trim();
        if (sector) params.sector = sector;
        if (filters.categories[0]) params.category = filters.categories[0];
        if (filters.locations[0]) params.location = filters.locations[0];
        if (filters.featured) params.featured = true;
        if (filters.speciality) params.speciality = filters.speciality;
        if (filters.department) params.department = filters.department;
        if (filters.jobType) params.jobType = filters.jobType;
        if (filters.qualification) params.qualification = filters.qualification;
        if (filters.state) params.state = filters.state;
        if (filters.city) params.city = filters.city;

        let res = await fetchJobs(params);
        let content = res?.content || [];
        let totalCount = res?.totalElements || 0;

        const hasTextSearch = Boolean(selectedJobOption?.trim());
        const hasLocationSearch = Boolean(filters.locations[0]?.trim());

        // If a free-text keyword or entered location finds nothing, keep the user's
        // real structured filters (sector/category/speciality/etc.) and remove only
        // the unmatched text/location constraints. This guarantees users still see
        // live jobs from the portal instead of a dead-end empty state.
        if (content.length === 0 && (hasTextSearch || hasLocationSearch)) {
          const fallbackParams: any = { ...params };
          delete fallbackParams.search;
          delete fallbackParams.location;

          const fallback = await fetchJobs(fallbackParams);
          const fallbackContent = fallback?.content || [];

          if (fallbackContent.length > 0) {
            res = fallback;
            content = fallbackContent;
            totalCount = fallback?.totalElements || fallbackContent.length;
            setShowingFallback(true);
            setFallbackReason(
              hasTextSearch && hasLocationSearch
                ? `No exact jobs matched “${selectedJobOption}” in “${filters.locations[0]}”, so we’re showing available jobs that match your other filters.`
                : hasTextSearch
                  ? `No exact jobs matched “${selectedJobOption}”, so we’re showing currently available jobs instead.`
                  : `No jobs are currently listed in “${filters.locations[0]}”, so we’re showing available jobs from other locations.`
            );
          }
        }

        const normalizedJobs = content.map((job: any) => ({
          ...job,
          sector: job.sector?.toLowerCase() || "private",
        }));

        setJobs(normalizedJobs);
        setTotal(totalCount);

        if (selectedJobOption) {
          setHasSearched(true);
          trackSearch(selectedJobOption, filters.locations[0] || "", totalCount);
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
  }, [selectedJobOption, filters, sector]);

  const title = sector === "government" ? "Government Jobs" : sector === "private" ? "Private Jobs" : "All Jobs";

  const getCountLabel = () => {
    if (loading) return "Searching...";
    const count = total > 0 ? total : jobs.length;
    const jobWord = count === 1 ? "job" : "jobs";

    if (showingFallback && count > 0) return `Showing ${count} available ${jobWord}`;
    if (selectedJobOption && count > 0) return `Found ${count} ${jobWord} for “${selectedJobOption}”`;
    if (count > 0) return `Showing ${count} ${jobWord}`;
    return "No jobs available";
  };

  const liveSearchTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const handleLiveSearch = useCallback((query: string, locationVal?: string) => {
    if (liveSearchTimerRef.current) clearTimeout(liveSearchTimerRef.current);

    liveSearchTimerRef.current = setTimeout(() => {
      setSelectedJobOption(query);
      if (locationVal !== undefined) {
        setFilters((prev) => ({ ...prev, locations: locationVal.trim() ? [locationVal.trim()] : [] }));
      }
      if (query.trim()) setHasSearched(true);

      const params = new URLSearchParams(location.search);
      if (query.trim()) params.set("search", query.trim());
      else params.delete("search");
      if (locationVal !== undefined && locationVal.trim()) params.set("location", locationVal.trim());
      else if (locationVal !== undefined) params.delete("location");
      const newSearch = params.toString() ? `?${params.toString()}` : "";
      navigate(`${location.pathname}${newSearch}`, { replace: true });
    }, 250);
  }, [location.search, location.pathname, navigate]);

  const handleClearSearch = () => {
    setSelectedJobOption("");
    setHasSearched(false);
    setShowingFallback(false);
    setFallbackReason("");
    setFilters({ categories: [], locations: [], featured: false });
    navigate(sector === "government" ? "/govt-jobs" : sector === "private" ? "/private-jobs" : "/jobs");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-6 sm:py-8">
          <h1 className="text-2xl sm:text-3xl text-gray-900 mb-4">{title}</h1>
          <SearchBar
            initialQuery={selectedJobOption}
            initialLocation={filters.locations[0] || ""}
            compact={true}
            sector={sector}
            onLiveSearch={handleLiveSearch}
          />
        </div>
      </div>

      <div className="container mx-auto px-3 sm:px-4 py-5 sm:py-8">
        <div className="grid md:grid-cols-4 gap-4 sm:gap-6">
          <div className="md:col-span-1">
            <FilterSidebar
              onFilterChange={setFilters}
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

            <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
              {loading ? (
                <div className="sm:col-span-2 text-center py-14 sm:py-16">
                  <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 animate-spin text-blue-600 mx-auto mb-4" />
                  <p className="text-gray-500 text-base sm:text-lg">Searching for jobs...</p>
                </div>
              ) : jobs.length > 0 ? (
                jobs.map((job: any) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    onViewDetails={(jobId) => onNavigate("job-detail", job.slug || jobId)}
                  />
                ))
              ) : (
                <div className="sm:col-span-2 text-center py-12 sm:py-16 bg-white rounded-lg shadow-sm border px-4">
                  <Search className="w-14 h-14 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">No active jobs available</h3>
                  <p className="text-gray-500 mb-6 max-w-md mx-auto text-sm sm:text-base">
                    There are currently no active jobs matching the selected portal filters.
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
