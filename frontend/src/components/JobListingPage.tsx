import { useEffect, useState, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Search, Loader2, Briefcase } from "lucide-react";
import { Button } from "./ui/button";
import { JobCard } from "./JobCard";
import { FilterSidebar, FilterOptions } from "./FilterSidebar";
import SearchBar from "./SearchBar";
import { fetchJobs, fetchJobsMeta } from "../api/jobs";
import { saveSearchHistory, trackSearch } from "../utils/searchUtils";

interface JobListingPageProps {
  onNavigate: (page: string, jobId?: string) => void;
  sector?: "government" | "private";
}

export function JobListingPage({ onNavigate, sector }: JobListingPageProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedJobOption, setSelectedJobOption] = useState("");
  const [filters, setFilters] = useState<FilterOptions>({
    categories: [],
    locations: [],
    featured: false,
  });
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

  // Track if this is the initial mount to prevent double fetching
  const isInitialMount = useRef(true);

  // Track the last search params to prevent duplicate API calls
  const lastSearchParams = useRef<string>("");

  // Read search query, location, and category from URL params on mount and when URL changes
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

    if (locationParam) {
      setFilters((prev) => ({
        ...prev,
        locations: [locationParam],
      }));
    } else {
      setFilters((prev) => ({
        ...prev,
        locations: [],
      }));
    }

    if (categoryParam) {
      setFilters((prev) => ({
        ...prev,
        categories: [categoryParam],
      }));
    }
  }, [location.search]);

  useEffect(() => {
    // load meta on mount
    (async () => {
      try {
        const meta = await fetchJobsMeta(sector);

        setMetaCategories(
          Array.isArray(meta?.categories) ? meta.categories : [],
        );
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
    // Fetch jobs when search selection or filters change
    const fetchJobsData = async () => {
      // Build params string to check for duplicates
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

      // Skip if params haven't changed (prevents duplicate calls)
      if (
        currentParams === lastSearchParams.current &&
        !isInitialMount.current
      ) {
        return;
      }

      lastSearchParams.current = currentParams;
      isInitialMount.current = false;

      setLoading(true);
      try {
        // Build search params - only include non-empty values
        const params: any = {
          status: "active",
          size: 50,
        };

        // Add search query if a selection was made
        if (selectedJobOption && selectedJobOption.length >= 1) {
          params.search = selectedJobOption;
        }

        // Add other filters - but DON'T add location when searching by job title/company
        // The job title/company search should not be restricted by location unless explicitly filtered
        if (sector) params.sector = sector;
        if (filters.categories[0]) params.category = filters.categories[0];
        // Only add location filter if explicitly set in sidebar AND no search query
        // OR if both are set (user wants to filter search results by location)
        if (filters.locations[0]) {
          params.location = filters.locations[0];
        }
        if (filters.featured) params.featured = true;
        if (filters.speciality) params.speciality = filters.speciality;
        if (filters.department) params.department = filters.department;
        if (filters.jobType) params.jobType = filters.jobType;
        if (filters.qualification) params.qualification = filters.qualification;
        if (filters.state) params.state = filters.state;
        if (filters.city) params.city = filters.city;

        const res = await fetchJobs(params);
        let content = res?.content || [];
        let totalCount = res?.totalElements || 0;

        // Normalize job data - ensure sector is always present
        const normalizedJobs = content.map((job: any) => ({
          ...job,
          sector: job.sector?.toLowerCase() || "private",
        }));

        setJobs(normalizedJobs);
        setTotal(totalCount);

        // Track search if there was a search query
        if (selectedJobOption) {
          setHasSearched(true);
          trackSearch(
            selectedJobOption,
            filters.locations[0] || "",
            totalCount,
          );
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

  const title =
    sector === "government"
      ? "Government Jobs"
      : sector === "private"
        ? "Private Jobs"
        : "All Jobs";

  // Build count label with search context
  const getCountLabel = () => {
    if (loading) return "Searching...";

    const count = total > 0 ? total : jobs.length;
    const jobWord = count === 1 ? "job" : "jobs";

    if (selectedJobOption && count > 0) {
      return `Found ${count} ${jobWord} for "${selectedJobOption}"`;
    } else if (selectedJobOption && count === 0) {
      return `No jobs found for "${selectedJobOption}"`;
    } else if (count > 0) {
      return `Showing ${count} ${jobWord}`;
    }
    return "No jobs available";
  };

  const countLabel = getCountLabel();

  // Debounced live search handler as user types in SearchBar
  const liveSearchTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const handleLiveSearch = useCallback(
    (query: string, locationVal?: string) => {
      if (liveSearchTimerRef.current) {
        clearTimeout(liveSearchTimerRef.current);
      }

      liveSearchTimerRef.current = setTimeout(() => {
        setSelectedJobOption(query);
        if (locationVal !== undefined) {
          setFilters((prev) => ({
            ...prev,
            locations: locationVal.trim() ? [locationVal.trim()] : [],
          }));
        }
        if (query.trim()) {
          setHasSearched(true);
        }

        // Update URL query string smoothly
        const params = new URLSearchParams(location.search);
        if (query.trim()) {
          params.set("search", query.trim());
        } else {
          params.delete("search");
        }
        if (locationVal !== undefined && locationVal.trim()) {
          params.set("location", locationVal.trim());
        } else if (locationVal !== undefined) {
          params.delete("location");
        }
        const newSearch = params.toString() ? `?${params.toString()}` : "";
        navigate(`${location.pathname}${newSearch}`, { replace: true });
      }, 250);
    },
    [location.search, location.pathname, navigate]
  );

  // Handle clearing search
  const handleClearSearch = () => {
    setSelectedJobOption("");
    setHasSearched(false);
    setFilters({ categories: [], locations: [], featured: false });
    navigate(sector === "government" ? "/govt-jobs" : sector === "private" ? "/private-jobs" : "/jobs");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl text-gray-900 mb-4">{title}</h1>

          {/* Job Search Bar */}
          <SearchBar
            initialQuery={selectedJobOption}
            initialLocation={filters.locations[0] || ""}
            compact={true}
            sector={sector}
            onLiveSearch={handleLiveSearch}
          />
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-4 gap-6">
          {/* Filters Sidebar */}
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

          {/* Job Listings */}
          <div className="md:col-span-3">
            <div className="mb-6">
              <p className="text-gray-600 font-medium">{countLabel}</p>
            </div>

            {(() => {
              return (
                <div className="grid md:grid-cols-2 gap-6">
                  {loading ? (
                    <div className="col-span-2 text-center py-16">
                      <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
                      <p className="text-gray-500 text-lg">Searching for jobs...</p>
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
                    <div className="col-span-2 text-center py-16 bg-white rounded-lg shadow-sm border">
                      <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        {hasSearched ? "No jobs found" : "Start your job search"}
                      </h3>
                      <p className="text-gray-500 mb-6 max-w-md mx-auto">
                        {hasSearched
                          ? `No jobs match "${selectedJobOption}". Try a broader title, speciality, qualification, hospital, or location.`
                          : "Search medical jobs by title, speciality, qualification, hospital, or location."}
                      </p>
                      <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        {hasSearched && (
                          <Button variant="outline" onClick={handleClearSearch}>
                            Clear Search
                          </Button>
                        )}
                        {(filters.categories.length > 0 ||
                          filters.locations.length > 0 ||
                          filters.featured) && (
                          <Button
                            variant="outline"
                            onClick={() =>
                              setFilters({
                                categories: [],
                                locations: [],
                                featured: false,
                              })
                            }
                          >
                            Clear Filters
                          </Button>
                        )}
                        {!hasSearched && (
                          <Button onClick={() => onNavigate("jobs")}>
                            Browse All Jobs
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
