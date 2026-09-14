import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  BarChart3,
  Building2,
  CheckCircle2,
  Clock,
  ExternalLink,
  Globe,
  Mail,
  MapPin,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  EmployerInsightsResponse,
  fetchEmployerInsights,
} from '../api/employers';
import '../styles/admin-insights.css';

interface Props {
  onNavigate: (page: string) => void;
}

const EMPTY_INSIGHTS: EmployerInsightsResponse = {
  totalEmployers: 0,
  filteredEmployers: 0,
  verifiedEmployers: 0,
  companyTypeCounts: {},
  verificationStatusCounts: {},
  stateCounts: {},
  employers: [],
};

function getEmployerInitials(name?: string): string {
  if (!name || !name.trim()) return 'MD';
  const clean = name.replace(/^(hospital|dr\.?|healthcare|clinic)\s+/i, '').trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return (parts[0]?.slice(0, 2) || 'HP').toUpperCase();
}

export function AdminEmployerInsights({ onNavigate }: Props) {
  const { token } = useAuth();
  const [data, setData] = useState<EmployerInsightsResponse>(EMPTY_INSIGHTS);
  const [filters, setFilters] = useState({
    companyType: '',
    verificationStatus: '',
    state: '',
    search: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetchEmployerInsights(filters, token);
      setData(res);
    } catch (e: any) {
      setError(e?.message || 'Unable to load employer insights');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 250);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, filters.companyType, filters.verificationStatus, filters.state, filters.search]);

  const topStates = useMemo(
    () => Object.entries(data.stateCounts || {}).sort((a, b) => b[1] - a[1]).slice(0, 8),
    [data.stateCounts],
  );

  const topTypes = useMemo(
    () => Object.entries(data.companyTypeCounts || {}).sort((a, b) => b[1] - a[1]),
    [data.companyTypeCounts],
  );

  const states = Object.keys(data.stateCounts || {}).sort();
  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <div className="insights-page">
      <div className="insights-shell">
        <button
          type="button"
          className="insights-back"
          onClick={() => onNavigate('dashboard/admin')}
        >
          <ArrowLeft size={16} /> Admin Dashboard
        </button>

        <header className="insights-header">
          <div>
            <span className="insights-eyebrow">
              <Building2 size={14} /> Healthcare Employer Intelligence
            </span>
            <h1>Healthcare Organization Segments</h1>
            <p>
              Interactive institutional analytics and employer directory by organization type,
              verification status, and geographic distribution.
            </p>
          </div>
          <button
            type="button"
            className={`insights-refresh${loading ? ' is-loading' : ''}`}
            onClick={() => void load()}
            disabled={loading}
          >
            <RefreshCw /> {loading ? 'Refreshing' : 'Refresh Data'}
          </button>
        </header>

        <section className="insights-metrics" aria-label="Employer profile metrics">
          <Metric
            icon={Building2}
            label="Total Employers"
            value={data.totalEmployers}
            tone="indigo"
            helper="Registered organizations"
          />
          <Metric
            icon={Search}
            label="Matching Filter"
            value={data.filteredEmployers}
            tone="emerald"
            helper="Active filtered pool"
          />
          <Metric
            icon={ShieldCheck}
            label="Verified Employers"
            value={data.verifiedEmployers}
            tone="blue"
            helper="Approved institutions"
          />
          <Metric
            icon={MapPin}
            label="States Covered"
            value={Object.keys(data.stateCounts || {}).length}
            tone="amber"
            helper="Geographic presence"
          />
        </section>

        <div className="insights-body">
          <main className="insights-main">
            <section className="insights-card insights-card--filters">
              <div className="insights-filters">
                <label className="insights-field">
                  <span>Search</span>
                  <div className="insights-field__control">
                    <Search />
                    <input
                      value={filters.search}
                      onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                      placeholder="Company, contact, city, state…"
                    />
                  </div>
                </label>

                <Filter
                  label="Institution Type"
                  anyLabel="All types"
                  value={filters.companyType}
                  options={['hospital', 'consultancy', 'hr']}
                  formatOption={(v) =>
                    v === 'hospital'
                      ? 'Hospital / Clinic'
                      : v === 'consultancy'
                        ? 'Consultancy'
                        : 'HR & Staffing'
                  }
                  onChange={(companyType) => setFilters({ ...filters, companyType })}
                />

                <Filter
                  label="Verification"
                  anyLabel="All statuses"
                  value={filters.verificationStatus}
                  options={['approved', 'pending', 'rejected']}
                  formatOption={(v) => v.toUpperCase()}
                  onChange={(verificationStatus) => setFilters({ ...filters, verificationStatus })}
                />

                <Filter
                  label="State"
                  anyLabel="All states"
                  value={filters.state}
                  options={states}
                  onChange={(state) => setFilters({ ...filters, state })}
                />

                {hasFilters && (
                  <button
                    type="button"
                    className="insights-filters__reset"
                    onClick={() =>
                      setFilters({ companyType: '', verificationStatus: '', state: '', search: '' })
                    }
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            </section>

            {error ? (
              <div className="insights-error">{error}</div>
            ) : (
              <section className="insights-card">
                <div className="insights-card__head">
                  <div>
                    <h2>
                      <Building2 /> Registered Organizations
                    </h2>
                    <p>
                      {data.filteredEmployers} organization
                      {data.filteredEmployers === 1 ? '' : 's'} matching active criteria
                    </p>
                  </div>
                </div>

                {loading ? (
                  <div className="insights-empty">
                    <RefreshCw className="insights-empty-spin" size={24} />
                    <span>Loading employer organizations…</span>
                  </div>
                ) : data.employers.length ? (
                  <div className="insights-profiles">
                    {data.employers.map((emp, index) => {
                      const locationText =
                        [emp.city, emp.state].filter(Boolean).join(', ') || 'Location not specified';
                      const initials = getEmployerInitials(emp.companyName);
                      const isVerified =
                        emp.isVerified || emp.verificationStatus === 'approved';
                      const isPending = emp.verificationStatus === 'pending';

                      return (
                        <article
                          className="insights-profile"
                          key={emp.id || index}
                        >
                          <div className="insights-profile__col insights-profile__candidate">
                            <div className="insights-avatar" aria-hidden="true">
                              {initials}
                            </div>
                            <div className="insights-profile__identity">
                              <h3 title={emp.companyName || 'Organization'}>
                                {emp.companyName || 'Healthcare Facility'}
                              </h3>
                              <p className="insights-profile__email" title={emp.userEmail}>
                                <Mail size={12} />
                                <span>{emp.userEmail || 'No email provided'}</span>
                              </p>
                              {emp.userName && (
                                <small className="text-slate-500 text-[11px] block mt-0.5">
                                  Contact: {emp.userName}
                                </small>
                              )}
                            </div>
                          </div>

                          <div className="insights-profile__col insights-profile__speciality">
                            <span className="insights-label">Organization Type</span>
                            <div className="insights-pill insights-pill--indigo">
                              <Building2 size={13} />
                              <strong title={emp.companyType || 'Hospital'}>
                                {emp.companyType
                                  ? emp.companyType.toUpperCase()
                                  : 'HOSPITAL'}
                              </strong>
                            </div>
                            {emp.website && (
                              <a
                                href={emp.website.startsWith('http') ? emp.website : `https://${emp.website}`}
                                target="_blank"
                                rel="noreferrer"
                                className="insights-subspec inline-flex items-center gap-1 text-blue-600 hover:underline"
                                title={emp.website}
                              >
                                <Globe size={10} />
                                <span>Visit Website</span>
                                <ExternalLink size={9} />
                              </a>
                            )}
                          </div>

                          <div className="insights-profile__col insights-profile__qualification">
                            <span className="insights-label">Verification Status</span>
                            <div
                              className={`insights-pill ${
                                isVerified
                                  ? 'insights-pill--emerald'
                                  : isPending
                                    ? 'insights-pill--slate'
                                    : 'insights-pill--rose'
                              }`}
                            >
                              {isVerified ? (
                                <CheckCircle2 size={13} />
                              ) : isPending ? (
                                <Clock size={13} />
                              ) : (
                                <ShieldAlert size={13} />
                              )}
                              <strong>
                                {isVerified
                                  ? 'Approved & Verified'
                                  : isPending
                                    ? 'Pending Review'
                                    : 'Rejected'}
                              </strong>
                            </div>
                            {emp.companyDescription && (
                              <small
                                className="insights-exp-badge truncate max-w-[200px]"
                                title={emp.companyDescription}
                              >
                                {emp.companyDescription}
                              </small>
                            )}
                          </div>

                          <div className="insights-profile__col insights-profile__location">
                            <span className="insights-label">Campus Location</span>
                            <div
                              className="insights-pill insights-pill--slate"
                              title={locationText}
                            >
                              <MapPin size={13} />
                              <span className="insights-profile__location-text">
                                {locationText}
                              </span>
                            </div>
                            {emp.address && (
                              <small className="text-slate-500 text-[11px] block mt-0.5 truncate max-w-[180px]">
                                {emp.address}
                              </small>
                            )}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <div className="insights-empty">
                    No employer organizations match this segment.
                  </div>
                )}
              </section>
            )}
          </main>

          <aside className="insights-aside">
            <section className="insights-card">
              <div className="insights-card__head">
                <h2>
                  <BarChart3 /> Top States
                </h2>
              </div>
              <div className="insights-cluster-list">
                {topStates.length ? (
                  topStates.map(([name, count], rank) => (
                    <button
                      key={name}
                      type="button"
                      className={`insights-cluster${filters.state === name ? ' is-active' : ''}`}
                      onClick={() =>
                        setFilters({ ...filters, state: filters.state === name ? '' : name })
                      }
                    >
                      <div className="insights-cluster__meta">
                        <span className="insights-cluster__rank">#{rank + 1}</span>
                        <span className="insights-cluster__name">{name}</span>
                      </div>
                      <strong className="insights-cluster__count">{count}</strong>
                    </button>
                  ))
                ) : (
                  <p className="insights-empty">
                    State distribution appears here as employers add company locations.
                  </p>
                )}
              </div>
            </section>

            <section className="insights-card">
              <div className="insights-card__head">
                <h2>
                  <Building2 /> Organization Types
                </h2>
              </div>
              <div className="insights-cluster-list">
                {topTypes.length ? (
                  topTypes.map(([type, count]) => (
                    <button
                      key={type}
                      type="button"
                      className={`insights-cluster${filters.companyType === type ? ' is-active' : ''}`}
                      onClick={() =>
                        setFilters({
                          ...filters,
                          companyType: filters.companyType === type ? '' : type,
                        })
                      }
                    >
                      <div className="insights-cluster__meta">
                        <span className="insights-cluster__name">
                          {type === 'hospital'
                            ? 'Hospital / Clinic'
                            : type === 'consultancy'
                              ? 'Healthcare Consultancy'
                              : 'HR Agency'}
                        </span>
                      </div>
                      <strong className="insights-cluster__count">{count}</strong>
                    </button>
                  ))
                ) : (
                  <p className="insights-empty">No types registered yet.</p>
                )}
              </div>
            </section>

            <section className="insights-note">
              <div className="insights-note__header">
                <ShieldCheck size={20} />
                <h3>Verified Healthcare Ecosystem</h3>
              </div>
              <p>
                Employer profiles undergo credential review to protect medical jobseekers.
                Approved healthcare institutions receive priority job search indexing.
              </p>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  tone,
  helper,
}: {
  icon: any;
  label: string;
  value: number;
  tone: 'indigo' | 'emerald' | 'blue' | 'amber';
  helper: string;
}) {
  return (
    <article className={`insights-metric insights-metric--${tone}`}>
      <div className="insights-metric__icon-wrap">
        <Icon size={20} />
      </div>
      <div className="insights-metric__body">
        <span className="insights-metric__label">{label}</span>
        <strong className="insights-metric__value">{value.toLocaleString()}</strong>
        <span className="insights-metric__helper">{helper}</span>
      </div>
    </article>
  );
}

function Filter({
  label,
  anyLabel,
  value,
  options,
  formatOption,
  onChange,
}: {
  label: string;
  anyLabel: string;
  value: string;
  options: string[];
  formatOption?: (opt: string) => string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="insights-field">
      <span>{label}</span>
      <div className="insights-field__control">
        <select value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">{anyLabel}</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {formatOption ? formatOption(opt) : opt}
            </option>
          ))}
        </select>
      </div>
    </label>
  );
}
