import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, MapPin, BriefcaseBusiness, Loader2, X } from 'lucide-react';
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
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [showJobDropdown, setShowJobDropdown] = useState(false);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const requestSeq = useRef(0);

  useEffect(() => setJobQuery(initialQuery || searchParams.get('search') || ''), [initialQuery, searchParams]);
  useEffect(() => setLocationQuery(initialLocation || searchParams.get('location') || ''), [initialLocation, searchParams]);
  useEffect(() => {
    fetchJobsMeta(sector).then((meta) => setLocations(meta.locations || [])).catch(() => setLocations([]));
  }, [sector]);
  useEffect(() => () => timerRef.current && clearTimeout(timerRef.current), []);

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
    setLocationSuggestions(q ? locations.filter((item) => item.toLowerCase().includes(q)).slice(0, 8) : []);
    setShowLocationDropdown(Boolean(q));
  }, [locations]);

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
    onLiveSearch?.(jobQuery, suggestion);
  };

  const containerClass = useMemo(() => `search-bar ${compact ? 'search-bar--compact' : ''}`.trim(), [compact]);

  return (
    <div className={containerClass}>
      <div className="search-bar__container">
        <div className="search-bar__field search-bar__field--job">
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

        <div className="search-bar__field search-bar__field--location">
          <div className="search-bar__field-inner">
            <div className="search-bar__icon"><MapPin size={20} /></div>
            <div className="search-bar__input-group">
              <input
                type="text"
                className="search-bar__input"
                placeholder="City or state (optional)"
                value={locationQuery}
                onChange={(event) => {
                  const value = event.target.value;
                  setLocationQuery(value);
                  requestLocationSuggestions(value);
                  onLiveSearch?.(jobQuery, value);
                }}
                onKeyDown={(event) => event.key === 'Enter' && submit()}
                autoComplete="off"
                aria-label="Search by city or state"
              />
            </div>
          </div>
          {showLocationDropdown && locationSuggestions.length > 0 && (
            <ul className="search-bar__dropdown" role="listbox">
              {locationSuggestions.map((suggestion) => (
                <li key={suggestion} className="search-bar__dropdown-item" onMouseDown={(event) => event.preventDefault()} onClick={() => chooseLocation(suggestion)} role="option">
                  <MapPin size={16} /><span>{suggestion}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <button className="search-bar__button" onClick={submit} type="button" aria-label="Search jobs">
          <Search size={18} />{!compact && <span>Search</span>}
        </button>
      </div>
    </div>
  );
};

export default SearchBar;
