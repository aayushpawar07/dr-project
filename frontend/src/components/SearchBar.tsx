import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { fetchJobSuggestions, fetchJobsMeta } from "../api/jobs";
import "./SearchBar.css";

interface SearchBarProps {
  initialQuery?: string;
  initialLocation?: string;
  onSearch?: (query: string, location: string) => void;
  onLiveSearch?: (query: string, location: string) => void;
  showLabels?: boolean;
  compact?: boolean;
  sector?: "government" | "private";
}

const SearchIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.35-4.35" />
  </svg>
);

const LocationIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const BriefcaseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
  </svg>
);

const SearchBar: React.FC<SearchBarProps> = ({
  initialQuery = "",
  initialLocation = "",
  onSearch,
  onLiveSearch,
  showLabels = true,
  compact = false,
  sector,
}) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [jobQuery, setJobQuery] = useState(initialQuery || searchParams.get("search") || "");
  const [locationQuery, setLocationQuery] = useState(initialLocation || searchParams.get("location") || "");
  const [jobSuggestions, setJobSuggestions] = useState<string[]>([]);
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [showJobDropdown, setShowJobDropdown] = useState(false);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);
  const [activeJobIndex, setActiveJobIndex] = useState(-1);
  const [activeLocationIndex, setActiveLocationIndex] = useState(-1);
  const jobInputRef = useRef<HTMLInputElement>(null);
  const locationInputRef = useRef<HTMLInputElement>(null);
  const jobDropdownRef = useRef<HTMLUListElement>(null);
  const locationDropdownRef = useRef<HTMLUListElement>(null);
  const jobTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const jobRequestSeqRef = useRef(0);

  useEffect(() => {
    setJobQuery(initialQuery || searchParams.get("search") || "");
  }, [initialQuery, searchParams]);

  useEffect(() => {
    setLocationQuery(initialLocation || searchParams.get("location") || "");
  }, [initialLocation, searchParams]);

  useEffect(() => {
    fetchJobsMeta(sector).then((meta) => setLocations(meta.locations || [])).catch(() => setLocations([]));
  }, [sector]);

  useEffect(() => () => {
    if (jobTimerRef.current) clearTimeout(jobTimerRef.current);
    jobRequestSeqRef.current += 1;
  }, []);

  const requestJobSuggestions = useCallback((value: string) => {
    if (jobTimerRef.current) clearTimeout(jobTimerRef.current);
    const requestSeq = ++jobRequestSeqRef.current;
    const q = value.trim();
    if (q.length < 1) {
      setJobSuggestions([]);
      setShowJobDropdown(false);
      setIsLoadingJobs(false);
      return;
    }

    setIsLoadingJobs(true);
    jobTimerRef.current = setTimeout(async () => {
      const results = await fetchJobSuggestions(q, sector, 8);
      // Ignore an older response if the user typed again while it was in flight.
      if (requestSeq !== jobRequestSeqRef.current) return;
      setJobSuggestions(results);
      setShowJobDropdown(results.length > 0);
      setIsLoadingJobs(false);
    }, 250);
  }, [sector]);

  const requestLocationSuggestions = useCallback((value: string) => {
    const q = value.trim().toLowerCase();
    if (q.length < 1) {
      setLocationSuggestions([]);
      return;
    }
    setLocationSuggestions(locations.filter((item) => item.toLowerCase().includes(q)).slice(0, 8));
  }, [locations]);

  const handleSearch = useCallback(() => {
    setShowJobDropdown(false);
    setShowLocationDropdown(false);
    const q = jobQuery.trim();
    const loc = locationQuery.trim();

    if (onSearch) {
      onSearch(q, loc);
      return;
    }

    const params = new URLSearchParams();
    if (q) params.set("search", q);
    if (loc) params.set("location", loc);
    const path = sector === "government" ? "/govt-jobs" : sector === "private" ? "/private-jobs" : "/jobs";
    navigate(`${path}${params.toString() ? `?${params.toString()}` : ""}`);
  }, [jobQuery, locationQuery, onSearch, navigate, sector]);

  const selectJobSuggestion = useCallback((suggestion: string) => {
    setJobQuery(suggestion);
    setShowJobDropdown(false);
    setJobSuggestions([]);
    onLiveSearch?.(suggestion, locationQuery);
    locationInputRef.current?.focus();
  }, [locationQuery, onLiveSearch]);

  const selectLocationSuggestion = useCallback((suggestion: string) => {
    setLocationQuery(suggestion);
    setShowLocationDropdown(false);
    setLocationSuggestions([]);
    onLiveSearch?.(jobQuery, suggestion);
  }, [jobQuery, onLiveSearch]);

  const handleJobKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === "Enter") {
      event.preventDefault();
      if (activeJobIndex >= 0 && jobSuggestions[activeJobIndex]) {
        selectJobSuggestion(jobSuggestions[activeJobIndex]);
      } else {
        handleSearch();
      }
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveJobIndex((index) => Math.min(index + 1, jobSuggestions.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveJobIndex((index) => Math.max(index - 1, -1));
    } else if (event.key === "Escape") {
      setShowJobDropdown(false);
    }
  }, [activeJobIndex, jobSuggestions, handleSearch, selectJobSuggestion]);

  const handleLocationKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === "Enter") {
      event.preventDefault();
      if (activeLocationIndex >= 0 && locationSuggestions[activeLocationIndex]) {
        selectLocationSuggestion(locationSuggestions[activeLocationIndex]);
      } else {
        handleSearch();
      }
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveLocationIndex((index) => Math.min(index + 1, locationSuggestions.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveLocationIndex((index) => Math.max(index - 1, -1));
    } else if (event.key === "Escape") {
      setShowLocationDropdown(false);
    }
  }, [activeLocationIndex, locationSuggestions, handleSearch, selectLocationSuggestion]);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!jobDropdownRef.current?.contains(target) && !jobInputRef.current?.contains(target)) setShowJobDropdown(false);
      if (!locationDropdownRef.current?.contains(target) && !locationInputRef.current?.contains(target)) setShowLocationDropdown(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const highlightMatch = useCallback((text: string, query: string) => {
    if (query.trim().length < 1) return <span>{text}</span>;
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const parts = text.split(new RegExp(`(${escaped})`, "gi"));
    return <>{parts.map((part, index) => part.toLowerCase() === query.toLowerCase() ? <mark key={index}>{part}</mark> : <span key={index}>{part}</span>)}</>;
  }, []);

  const containerClass = useMemo(() => `search-bar ${compact ? "search-bar--compact" : ""}`.trim(), [compact]);

  return (
    <div className={containerClass}>
      <div className="search-bar__container">
        <div className="search-bar__field search-bar__field--job">
          <div className="search-bar__field-inner">
            <div className="search-bar__icon"><SearchIcon /></div>
            <div className="search-bar__input-group">
              {showLabels && <span className="search-bar__label">WHAT</span>}
              <input
                ref={jobInputRef}
                type="text"
                className="search-bar__input"
                placeholder="Job title, speciality, qualification, or hospital"
                value={jobQuery}
                onChange={(event) => {
                  const val = event.target.value;
                  setJobQuery(val);
                  setActiveJobIndex(-1);
                  requestJobSuggestions(val);
                  onLiveSearch?.(val, locationQuery);
                }}
                onKeyDown={handleJobKeyDown}
                onFocus={() => jobQuery.trim().length >= 1 && requestJobSuggestions(jobQuery)}
                autoComplete="off"
                aria-label="Search jobs"
                aria-expanded={showJobDropdown}
                aria-autocomplete="list"
              />
            </div>
            {isLoadingJobs && <div className="search-bar__spinner" aria-hidden="true" />}
          </div>
          {showJobDropdown && jobSuggestions.length > 0 && (
            <ul ref={jobDropdownRef} className="search-bar__dropdown" role="listbox">
              {jobSuggestions.map((suggestion, index) => (
                <li
                  key={`${suggestion}-${index}`}
                  className={`search-bar__dropdown-item ${index === activeJobIndex ? "search-bar__dropdown-item--active" : ""}`}
                  onClick={() => selectJobSuggestion(suggestion)}
                  onMouseEnter={() => setActiveJobIndex(index)}
                  role="option"
                  aria-selected={index === activeJobIndex}
                >
                  <BriefcaseIcon /><span>{highlightMatch(suggestion, jobQuery)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="search-bar__divider" aria-hidden="true" />

        <div className="search-bar__field search-bar__field--location">
          <div className="search-bar__field-inner">
            <div className="search-bar__icon"><LocationIcon /></div>
            <div className="search-bar__input-group">
              {showLabels && <span className="search-bar__label">WHERE</span>}
              <input
                ref={locationInputRef}
                type="text"
                className="search-bar__input"
                placeholder="City or state"
                value={locationQuery}
                onChange={(event) => {
                  const val = event.target.value;
                  setLocationQuery(val);
                  setActiveLocationIndex(-1);
                  requestLocationSuggestions(val);
                  setShowLocationDropdown(true);
                  onLiveSearch?.(jobQuery, val);
                }}
                onKeyDown={handleLocationKeyDown}
                onFocus={() => locationQuery.trim().length >= 1 && setShowLocationDropdown(true)}
                autoComplete="off"
                aria-label="Search location"
                aria-expanded={showLocationDropdown}
                aria-autocomplete="list"
              />
            </div>
          </div>
          {showLocationDropdown && locationSuggestions.length > 0 && (
            <ul ref={locationDropdownRef} className="search-bar__dropdown" role="listbox">
              {locationSuggestions.map((suggestion, index) => (
                <li
                  key={`${suggestion}-${index}`}
                  className={`search-bar__dropdown-item ${index === activeLocationIndex ? "search-bar__dropdown-item--active" : ""}`}
                  onClick={() => selectLocationSuggestion(suggestion)}
                  onMouseEnter={() => setActiveLocationIndex(index)}
                  role="option"
                  aria-selected={index === activeLocationIndex}
                >
                  <LocationIcon size={16} /><span>{highlightMatch(suggestion, locationQuery)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <button className="search-bar__button" onClick={handleSearch} type="button" aria-label="Search jobs">
          <SearchIcon />{!compact && <span>Search</span>}
        </button>
      </div>
    </div>
  );
};

export default SearchBar;
