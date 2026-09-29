import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, MapPin, BriefcaseBusiness, Loader2, X, ChevronDown } from 'lucide-react';
import { fetchJobSuggestions, fetchJobsMeta } from '../api/jobs';
import './SearchBar.css';

interface SearchBarProps {
  initialQuery?: string;
  initialLocation?: string;
  onSearch?: (query: string, location: string) => void;
  onLiveSearch?: (query: string, location: string) => void;
  showLabels?: boolean;
  compact?: boolean;
  sector?: 'government' | 'private';
}

function activeRoleFragment(value: string) {
  const parts = value.split(',');
  return (parts[parts.length - 1] || '').trim();
}

function replaceActiveRole(value: string, suggestion: string) {
  const parts = value.split(',');
  parts[parts.length - 1] = ` ${suggestion}`;
  return parts.map((part) => part.trim()).filter(Boolean).join(', ');
}

export interface StructuredLocationSuggestion {
  type: 'state' | 'city';
  value: string;
  name: string;
  count: number;
}

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chandigarh',
  'Chhattisgarh', 'Delhi', 'Goa', 'Gujarat', 'Haryana',
  'Himachal Pradesh', 'Jammu & Kashmir', 'Jharkhand', 'Karnataka', 'Kerala',
  'Ladakh', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya',
  'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 'Rajasthan',
  'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh',
  'Uttarakhand', 'West Bengal'
];

const SearchBar: React.FC<SearchBarProps> = ({
  initialQuery = '',
  initialLocation = '',
  onSearch,
  onLiveSearch,
  compact = false,
  sector,
}) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [jobQuery, setJobQuery] = useState(initialQuery || searchParams.get('search') || '');
  const [locationQuery, setLocationQuery] = useState(initialLocation || searchParams.get('location') || '');
  const [jobSuggestions, setJobSuggestions] = useState<string[]>([]);
  const [locationSuggestions, setLocationSuggestions] = useState<StructuredLocationSuggestion[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [locationCounts, setLocationCounts] = useState<Record<string, number>>({});
  const [showAllCities, setShowAllCities] = useState(false);
  const [matchedStateForCities, setMatchedStateForCities] = useState<string>('');
  const [showJobDropdown, setShowJobDropdown] = useState(false);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const requestSeq = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => setJobQuery(initialQuery || searchParams.get('search') || ''), [initialQuery, searchParams]);
  useEffect(() => setLocationQuery(initialLocation || searchParams.get('location') || ''), [initialLocation, searchParams]);
  useEffect(() => {
    fetchJobsMeta(sector)
      .then((meta) => {
        setLocations(meta.locations || []);
        setLocationCounts(meta.locationCounts || {});
      })
      .catch(() => {
        setLocations([]);
        setLocationCounts({});
      });
  }, [sector]);
  useEffect(() => () => timerRef.current && clearTimeout(timerRef.current), []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowJobDropdown(false);
        setShowLocationDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const requestSuggestions = useCallback((value: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const fragment = activeRoleFragment(value);
    const seq = ++requestSeq.current;
    if (fragment.length < 2) {
      setJobSuggestions([]);
      setShowJobDropdown(false);
      setLoadingSuggestions(false);
      return;
    }
    setLoadingSuggestions(true);
    timerRef.current = setTimeout(async () => {
      const suggestions = await fetchJobSuggestions(fragment, sector, 8);
      if (seq !== requestSeq.current) return;
      setJobSuggestions(suggestions);
      setShowJobDropdown(suggestions.length > 0);
      setLoadingSuggestions(false);
    }, 220);
  }, [sector]);

  const requestLocationSuggestions = useCallback((value: string) => {
    const q = value.trim().toLowerCase();
    if (!q) {
      setLocationSuggestions([]);
      setShowLocationDropdown(false);
      setShowAllCities(false);
      setMatchedStateForCities('');
      return;
    }

    // 1. Identify matching states
    const matchedStates = INDIAN_STATES.filter((st) => st.toLowerCase().includes(q));

    // Also check if any database location contains this query as state
    const statesFromLocations = new Set<string>();
    locations.forEach((loc) => {
      const parts = loc.split(',');
      if (parts.length >= 2) {
        const st = parts[parts.length - 1].trim();
        if (st.toLowerCase().includes(q)) statesFromLocations.add(st);
      }
    });

    const candidateStates = Array.from(new Set([...matchedStates, ...statesFromLocations]));

    const stateSuggestions: StructuredLocationSuggestion[] = [];
    candidateStates.forEach((stateName) => {
      // Calculate total jobs in this state across all cities
      let stateJobCount = 0;
      locations.forEach((loc) => {
        if (loc.toLowerCase().includes(stateName.toLowerCase())) {
          stateJobCount += (locationCounts[loc] || 1);
        }
      });
      stateSuggestions.push({
        type: 'state',
        value: stateName,
        name: stateName,
        count: stateJobCount,
      });
    });

    // 2. Identify matching cities
    let targetCities: string[] = [];
    let stateForCities = '';

    if (candidateStates.length > 0) {
      const primaryState = candidateStates[0];
      stateForCities = primaryState;
      // All cities in this state
      targetCities = locations.filter((loc) => loc.toLowerCase().includes(primaryState.toLowerCase()));
      // Also include any other location matching q directly if not already included
      locations.forEach((loc) => {
        if (loc.toLowerCase().includes(q) && !targetCities.includes(loc)) {
          targetCities.push(loc);
        }
      });
    } else {
      // Query is city-specific (e.g. "Ajmer", "Bhopal", "South")
      targetCities = locations.filter((loc) => loc.toLowerCase().includes(q));
      // If any of these cities have a parent state, find that state to also offer state option
      targetCities.forEach((loc) => {
        const parts = loc.split(',');
        if (parts.length >= 2) {
          const parentState = parts[parts.length - 1].trim();
          if (parentState && !stateSuggestions.some((s) => s.value.toLowerCase() === parentState.toLowerCase())) {
            let parentStateCount = 0;
            locations.forEach((l) => {
              if (l.toLowerCase().includes(parentState.toLowerCase())) {
                parentStateCount += (locationCounts[l] || 1);
              }
            });
            stateSuggestions.push({
              type: 'state',
              value: parentState,
              name: parentState,
              count: parentStateCount,
            });
          }
        }
      });
    }

    // Sort cities by job count descending
    targetCities.sort((a, b) => {
      const cntA = locationCounts[a] || 1;
      const cntB = locationCounts[b] || 1;
      return cntB - cntA;
    });

    const citySuggestions: StructuredLocationSuggestion[] = targetCities.map((loc) => ({
      type: 'city',
      value: loc,
      name: loc,
      count: locationCounts[loc] || 1,
    }));

    // Put State first if query matched a state, or Cities first if query was a specific city
    let combined: StructuredLocationSuggestion[] = [];
    if (candidateStates.length > 0 && candidateStates.some(st => st.toLowerCase().startsWith(q) || q.includes(st.toLowerCase()))) {
      combined = [...stateSuggestions, ...citySuggestions];
    } else {
      combined = [...citySuggestions, ...stateSuggestions];
    }

    setMatchedStateForCities(stateForCities);
    setShowAllCities(false);
    setLocationSuggestions(combined);
    setShowLocationDropdown(combined.length > 0);
  }, [locations, locationCounts]);

  const submit = useCallback(() => {
    setShowJobDropdown(false);
    setShowLocationDropdown(false);
    const query = jobQuery.trim();
    const place = locationQuery.trim();
    if (onSearch) {
      onSearch(query, place);
      return;
    }
    const params = new URLSearchParams();
    if (query) params.set('search', query);
    if (place) params.set('location', place);
    const path = sector === 'government' ? '/govt-jobs' : sector === 'private' ? '/private-jobs' : '/jobs';
    navigate(`${path}${params.toString() ? `?${params}` : ''}`);
  }, [jobQuery, locationQuery, navigate, onSearch, sector]);

  const chooseJob = (suggestion: string) => {
    const next = replaceActiveRole(jobQuery, suggestion);
    setJobQuery(next);
    setJobSuggestions([]);
    setShowJobDropdown(false);
    onLiveSearch?.(next, locationQuery);
  };

  const chooseLocation = (suggestion: string) => {
    setLocationQuery(suggestion);
    setLocationSuggestions([]);
    setShowLocationDropdown(false);
    setShowAllCities(false);
    onLiveSearch?.(jobQuery, suggestion);
  };

  const isJobDropdownOpen = Boolean(showJobDropdown && jobSuggestions.length > 0);
  const containerClass = useMemo(
    () => `search-bar ${compact ? 'search-bar--compact' : ''} ${isJobDropdownOpen ? 'is-job-dropdown-open' : ''}`.trim(),
    [compact, isJobDropdownOpen]
  );

  // Separate state and city suggestions for rendering with limits
  const stateItems = locationSuggestions.filter((s) => s.type === 'state');
  const cityItems = locationSuggestions.filter((s) => s.type === 'city');
  const visibleCityItems = showAllCities ? cityItems : cityItems.slice(0, 5);
  const hasMoreCities = cityItems.length > 5;
  const displayedLocationSuggestions = [...stateItems, ...visibleCityItems];

  return (
    <div className={containerClass} ref={containerRef}>
      <div className={`search-bar__container ${isJobDropdownOpen ? 'search-bar__container--job-open' : ''}`}>
        <div className={`search-bar__field search-bar__field--job ${showJobDropdown && jobSuggestions.length > 0 ? 'search-bar__field--active' : ''}`}>
          <div className="search-bar__field-inner">
            <div className="search-bar__icon"><Search size={20} /></div>
            <div className="search-bar__input-group">
              <input
                type="text"
                className="search-bar__input"
                placeholder="Search roles — e.g. Junior Resident, Medical Officer"
                value={jobQuery}
                onChange={(event) => {
                  const value = event.target.value;
                  setJobQuery(value);
                  requestSuggestions(value);
                  onLiveSearch?.(value, locationQuery);
                }}
                onKeyDown={(event) => event.key === 'Enter' && submit()}
                onFocus={() => requestSuggestions(jobQuery)}
                autoComplete="off"
                aria-label="Search one or more job roles"
              />
            </div>
            {loadingSuggestions && <Loader2 className="h-4 w-4 animate-spin text-blue-600" />}
            {jobQuery && (
              <button type="button" className="mr-1 text-slate-400 hover:text-slate-700" aria-label="Clear job search" onClick={() => { setJobQuery(''); setJobSuggestions([]); onLiveSearch?.('', locationQuery); }}>
                <X size={16} />
              </button>
            )}
          </div>
          {showJobDropdown && jobSuggestions.length > 0 && (
            <ul className="search-bar__dropdown" role="listbox">
              {jobSuggestions.map((suggestion) => (
                <li key={suggestion} className="search-bar__dropdown-item" onMouseDown={(event) => event.preventDefault()} onClick={() => chooseJob(suggestion)} role="option">
                  <BriefcaseBusiness size={16} />
                  <span>{suggestion}</span>
                </li>
              ))}
              <li className="px-3 py-2 text-xs text-slate-500">Tip: separate multiple roles with commas.</li>
            </ul>
          )}
        </div>

        <div className="search-bar__divider" aria-hidden="true" />

        <div className={`search-bar__field search-bar__field--location ${showLocationDropdown && displayedLocationSuggestions.length > 0 ? 'search-bar__field--active' : ''}`}>
          <div className="search-bar__field-inner">
            <div className="search-bar__icon"><MapPin size={20} /></div>
            <div className="search-bar__input-group">
              <input
                type="text"
                className="search-bar__input"
                placeholder="State or City"
                value={locationQuery}
                onChange={(event) => {
                  const value = event.target.value;
                  setLocationQuery(value);
                  requestLocationSuggestions(value);
                  onLiveSearch?.(jobQuery, value);
                }}
                onKeyDown={(event) => event.key === 'Enter' && submit()}
                onFocus={() => {
                  if (locationQuery.trim()) {
                    requestLocationSuggestions(locationQuery);
                  }
                }}
                autoComplete="off"
                aria-label="State or City"
              />
            </div>
            {locationQuery ? (
              <button
                type="button"
                className="mr-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                aria-label="Clear location search"
                onClick={() => {
                  setLocationQuery('');
                  setLocationSuggestions([]);
                  setShowLocationDropdown(false);
                  setShowAllCities(false);
                  onLiveSearch?.(jobQuery, '');
                }}
              >
                <X size={16} />
              </button>
            ) : (
              <ChevronDown size={18} className="mr-1 text-slate-400 pointer-events-none shrink-0" />
            )}
          </div>
          {showLocationDropdown && displayedLocationSuggestions.length > 0 && (
            <ul className="search-bar__dropdown search-bar__dropdown--location" role="listbox">
              {displayedLocationSuggestions.map((item) => (
                <li
                  key={`${item.type}-${item.value}`}
                  className={`search-bar__dropdown-item search-bar__dropdown-item--${item.type}`}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => chooseLocation(item.value)}
                  role="option"
                >
                  <div className={`search-bar__loc-icon search-bar__loc-icon--${item.type}`}>
                    <MapPin size={item.type === 'state' ? 18 : 16} />
                  </div>
                  <div className="search-bar__loc-details">
                    <div className="search-bar__loc-line">
                      <span className="search-bar__loc-name">{item.name}</span>
                    </div>
                    <div className="search-bar__loc-sub">
                      <span className={`search-bar__loc-tag search-bar__loc-tag--${item.type}`}>
                        {item.type === 'state' ? 'State' : 'City'}
                      </span>
                      <span className="search-bar__loc-bullet">•</span>
                      <span className="search-bar__loc-count">
                        {item.count} {item.count === 1 ? 'Job' : 'Jobs'}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
              {hasMoreCities && !showAllCities && (
                <li className="search-bar__dropdown-more">
                  <button
                    type="button"
                    className="search-bar__more-btn"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => setShowAllCities(true)}
                  >
                    View all cities in {matchedStateForCities || 'this state'} ({cityItems.length}) →
                  </button>
                </li>
              )}
            </ul>
          )}
        </div>

        <button className="search-bar__button" onClick={submit} type="button" aria-label="Search jobs">
          <Search size={18} />{!compact && <span>Search Jobs</span>}
        </button>
      </div>
    </div>
  );
};

export default SearchBar;
