// AI assisted development
import {
  ArrowLeft,
  Bell,
  Bookmark,
  Briefcase,
  Building2,
  Calendar,
  ChevronRight,
  Clock,
  FileText,
  Heart,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  Search,
  Star,
  Stethoscope,
  User,
  X,
} from 'lucide-react';
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { fetchApplications, ApplicationResponse } from '../api/applications';
import { fetchJobs } from '../api/jobs';
import { getSavedJobs, saveJob, unsaveJob } from '../api/savedJobs';
import { fetchNotifications } from '../api/notifications';
import { fetchMyCandidateProfile, CandidateProfileData } from '../api/candidateProfiles';

interface CandidateDashboardProps {
  onNavigate: (page: string, jobId?: string) => void;
}

type CandidateSection = 'overview' | 'saved' | 'applications' | 'recommended' | 'notifications';
type ApplicationStatusFilter = 'all' | ApplicationResponse['status'];

function formatDate(value?: string) {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function getInitials(value?: string) {
  const parts = (value || 'User').trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join('') || 'U';
}

function normalizeStatus(status?: string) {
  if (!status) return 'Applied';
  if (status === 'applied' || status === 'pending') return 'Under Review';
  if (status === 'hired' || status === 'selected') return 'Selected';
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function greetingForNow() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/** Whole days from today to `value`. Negative once the date has passed. */
function daysUntil(value?: string): number | null {
  if (!value) return null;
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function closingLabel(days: number | null) {
  if (days === null) return null;
  if (days < 0) return 'Closed';
  if (days === 0) return 'Closes today';
  if (days === 1) return 'Closes tomorrow';
  return `Closes in ${days} days`;
}

function getStatusClass(status?: string) {
  switch (status) {
    case 'shortlisted':
      return 'candidate-status candidate-status--shortlisted';
    case 'interview':
      return 'candidate-status candidate-status--interview';
    case 'selected':
    case 'hired':
      return 'candidate-status candidate-status--selected';
    case 'rejected':
      return 'candidate-status candidate-status--rejected';
    default:
      return 'candidate-status candidate-status--review';
  }
}

export function CandidateDashboard({ onNavigate }: CandidateDashboardProps) {
  const { user, logout, token } = useAuth();
  const location = useLocation();

  const [savedJobs, setSavedJobs] = useState<any[]>([]);
  const [applications, setApplications] = useState<ApplicationResponse[]>([]);
  const [recommendedJobs, setRecommendedJobs] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<CandidateSection>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ApplicationStatusFilter>('all');
  const [profile, setProfile] = useState<CandidateProfileData | null>(null);

  const loadDashboardData = useCallback(async () => {
    if (!user || !token) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const applicationPromise = fetchApplications(
      { candidateId: user.id, page: 0, size: 100, sort: 'appliedDate,desc' },
      token,
    )
      .then((data) => (Array.isArray(data?.content) ? data.content : Array.isArray(data) ? data : []))
      .catch((error) => {
        console.error('Failed to fetch candidate applications:', error);
        return [] as ApplicationResponse[];
      });

    const savedPromise = getSavedJobs(token, 0, 100)
      .then((data) => (Array.isArray(data?.content) ? data.content : []))
      .catch((error) => {
        console.error('Failed to fetch saved jobs:', error);
        return [] as any[];
      });

    const featuredPromise = fetchJobs({
      featured: true,
      status: 'active',
      openOnly: true,
      page: 0,
      size: 8,
      sort: 'createdAt,desc',
    })
      .then((data) => (Array.isArray(data?.content) ? data.content : []))
      .catch((error) => {
        console.error('Failed to fetch featured jobs:', error);
        return [] as any[];
      });

    const notificationPromise = fetchNotifications({ page: 0, size: 12 }, token)
      .then((data) => (Array.isArray(data?.content) ? data.content : []))
      .catch((error) => {
        console.error('Failed to fetch notifications:', error);
        return [] as any[];
      });

    const profilePromise = fetchMyCandidateProfile(token)
      .catch((error) => {
        console.error('Failed to fetch candidate profile:', error);
        return null;
      });

    const [fetchedApplications, fetchedSavedJobs, fetchedFeaturedJobs, fetchedNotifications, fetchedProfile] = await Promise.all([
      applicationPromise,
      savedPromise,
      featuredPromise,
      notificationPromise,
      profilePromise,
    ]);

    setApplications(fetchedApplications);
    setSavedJobs(fetchedSavedJobs);
    setRecommendedJobs(fetchedFeaturedJobs);
    setNotifications(fetchedNotifications);
    setProfile(fetchedProfile);
    setLoading(false);
  }, [token, user]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData, location.pathname]);

  useEffect(() => {
    const handleFocus = () => loadDashboardData();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [loadDashboardData]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileNavOpen]);

  const filteredApplications = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return applications.filter((application) => {
      const matchesSearch =
        !term ||
        application.jobTitle?.toLowerCase().includes(term) ||
        application.jobOrganization?.toLowerCase().includes(term) ||
        application.postedBy?.name?.toLowerCase().includes(term) ||
        application.postedBy?.company?.toLowerCase().includes(term);
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'applied' && (application.status === 'applied' || application.status === 'pending')) ||
        ((statusFilter === 'selected' || statusFilter === 'hired') && (application.status === 'selected' || application.status === 'hired')) ||
        application.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [applications, searchTerm, statusFilter]);

  const profileFields = [
    profile?.speciality,
    profile?.qualification,
    profile?.yearsExperience != null,
    profile?.registrationNumber,
    profile?.currentCity || profile?.state,
    profile?.profileSummary,
  ];
  const profileFilled = profileFields.filter(Boolean).length;
  const profilePercent = Math.round((profileFilled / profileFields.length) * 100);

  const interviewCount = applications.filter((application) => application.status === 'interview' || application.interviewDate).length;
  const shortlistedCount = applications.filter((application) => application.status === 'shortlisted').length;
  const selectedCount = applications.filter((application) => application.status === 'selected' || application.status === 'hired').length;
  const reviewCount = applications.filter((application) => application.status === 'applied' || application.status === 'pending').length;
  const rejectedCount = applications.filter((application) => application.status === 'rejected').length;
  const unreadNotifications = notifications.filter((notification: any) => !notification.read).length;

  // Jobs the candidate can still act on, soonest deadline first. Drawn from the
  // jobs already loaded for this dashboard, so it needs no extra request.
  const closingSoonJobs = useMemo(() => {
    const seen = new Set<string>();
    return [...recommendedJobs, ...savedJobs]
      .filter((job) => {
        if (!job?.id || seen.has(job.id)) return false;
        const days = daysUntil(job.lastDate);
        if (days === null || days < 0 || days > 14) return false;
        seen.add(job.id);
        return true;
      })
      .sort((a, b) => (daysUntil(a.lastDate) ?? 0) - (daysUntil(b.lastDate) ?? 0))
      .slice(0, 8);
  }, [recommendedJobs, savedJobs]);

  const trackerSteps: Array<{ label: string; count: number; filter: ApplicationStatusFilter; tone?: string }> = [
    { label: 'Applied', count: applications.length, filter: 'all' },
    { label: 'Under Review', count: reviewCount, filter: 'applied' },
    { label: 'Shortlisted', count: shortlistedCount, filter: 'shortlisted' },
    { label: 'Interview', count: interviewCount, filter: 'interview' },
    { label: 'Selected', count: selectedCount, filter: 'selected' },
    { label: 'Rejected', count: rejectedCount, filter: 'rejected', tone: 'danger' },
  ];

  const handleLogout = () => {
    logout();
    onNavigate('logout');
  };

  const openSection = (section: CandidateSection) => {
    setActiveSection(section);
    setMobileNavOpen(false);
  };

  const handleRemoveSavedJob = async (jobId: string) => {
    if (!token) return;
    try {
      await unsaveJob(jobId, token);
      setSavedJobs((previous) => previous.filter((job) => job.id !== jobId));
    } catch (error) {
      console.error('Failed to remove saved job:', error);
    }
  };

  const handleSaveJob = async (job: any) => {
    if (!token || !job?.id) return;
    if (savedJobs.some((saved) => saved.id === job.id)) {
      openSection('saved');
      return;
    }

    try {
      await saveJob(job.id, token);
      const refreshed = await getSavedJobs(token, 0, 100);
      setSavedJobs(Array.isArray(refreshed?.content) ? refreshed.content : []);
    } catch (error) {
      console.error('Failed to save job:', error);
    }
  };

  const stats = [
    { label: 'Saved Jobs', value: savedJobs.length, icon: Bookmark, tone: 'blue', action: () => openSection('saved') },
    { label: 'Applications', value: applications.length, icon: Briefcase, tone: 'navy', action: () => openSection('applications') },
    { label: 'Interviews', value: interviewCount, icon: Calendar, tone: 'purple', action: () => openSection('applications') },
    { label: 'Shortlisted', value: shortlistedCount, icon: Star, tone: 'green', action: () => openSection('applications') },
    { label: 'Selected', value: selectedCount, icon: User, tone: 'sky', action: () => openSection('applications') },
    { label: 'Unread Alerts', value: unreadNotifications, icon: Bell, tone: 'amber', action: () => openSection('notifications') },
  ];

  const renderJobCard = (job: any, mode: 'recommended' | 'saved' = 'recommended') => {
    const isSaved = savedJobs.some((saved) => saved.id === job.id);
    const days = daysUntil(job.lastDate);
    const urgency = days === null || days > 7 ? '' : days <= 1 ? ' mx-jobcard--critical' : ' mx-jobcard--urgent';

    return (
      <article className={`mx-jobcard${urgency}`} key={job.id}>
        <div className="mx-jobcard__head">
          <span className="mx-jobcard__org">
            <Building2 size={15} />
            <span>{job.organization || 'Organisation not specified'}</span>
            {job.sector && <small>· {job.sector}</small>}
          </span>
          {job.featured && <span className="mx-tag mx-tag--featured"><Star size={12} /> Featured</span>}
        </div>

        <h3 className="mx-jobcard__title" onClick={() => onNavigate('job-detail', job.id)}>
          {job.title || 'Untitled Job'}
        </h3>

        <div className="mx-jobcard__meta">
          {job.location && <span><MapPin size={13} />{job.location}</span>}
          {job.salary && <span><Briefcase size={13} />{job.salary}</span>}
        </div>

        <div className="mx-jobcard__footer">
          {days !== null && (
            <span className={`mx-jobcard__closing${days <= 1 ? ' is-critical' : days <= 7 ? ' is-urgent' : ''}`}>
              <Clock size={13} />{closingLabel(days)}
            </span>
          )}
          <div className="mx-jobcard__actions">
            {mode === 'saved' ? (
              <button type="button" className="mx-linkbtn mx-linkbtn--danger" onClick={() => handleRemoveSavedJob(job.id)}>
                <Heart size={14} fill="currentColor" /> Remove
              </button>
            ) : (
              <button type="button" className="mx-linkbtn" onClick={() => handleSaveJob(job)}>
                <Heart size={14} fill={isSaved ? 'currentColor' : 'none'} /> {isSaved ? 'Saved' : 'Save'}
              </button>
            )}
            <button type="button" className="mx-btn mx-btn--sm" onClick={() => onNavigate('job-detail', job.id)}>
              View Job
            </button>
          </div>
        </div>
      </article>
    );
  };

  const navGroups = [
    {
      label: 'Main',
      items: [
        { label: 'Dashboard', icon: LayoutDashboard, active: activeSection === 'overview', action: () => openSection('overview') },
        { label: 'Find Jobs', icon: Search, action: () => { setMobileNavOpen(false); onNavigate('jobs'); } },
        { label: 'Saved Jobs', icon: Bookmark, badge: savedJobs.length, active: activeSection === 'saved', action: () => openSection('saved') },
        { label: 'My Applications', icon: Briefcase, badge: applications.length, active: activeSection === 'applications', action: () => openSection('applications') },
      ],
    },
    {
      label: 'Jobs',
      items: [
        { label: 'Recommended', icon: Star, badge: recommendedJobs.length, active: activeSection === 'recommended', action: () => openSection('recommended') },
      ],
    },
    {
      label: 'Account',
      items: [
        { label: 'My Profile', icon: User, action: () => { setMobileNavOpen(false); onNavigate('profile'); } },
        { label: 'Notifications', icon: Bell, badge: unreadNotifications, active: activeSection === 'notifications', action: () => openSection('notifications') },
      ],
    },
  ];

  const sidebarContent = (
    <>
      <div className="candidate-sidebar__brand">
        <div className="candidate-sidebar__brand-mark">M</div>
        <div>
          <strong>MedExJob</strong>
          <span>Healthcare careers</span>
        </div>
      </div>

      <div className="candidate-sidebar__scroll">
        {navGroups.map((group) => (
          <div className="candidate-sidebar__group" key={group.label}>
            <p>{group.label}</p>
            <nav>
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    type="button"
                    key={item.label}
                    onClick={item.action}
                    className={item.active ? 'is-active' : ''}
                  >
                    <span><Icon size={18} />{item.label}</span>
                    {typeof item.badge === 'number' && item.badge > 0 && <em>{item.badge > 99 ? '99+' : item.badge}</em>}
                  </button>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      <div className="candidate-sidebar__user">
        <div className="candidate-user-avatar">{getInitials(user?.name)}</div>
        <div>
          <strong>{user?.name || 'Candidate'}</strong>
          <span>{user?.email || 'Candidate account'}</span>
        </div>
        <button type="button" onClick={handleLogout} aria-label="Logout" title="Logout"><LogOut size={17} /></button>
      </div>
    </>
  );

  if (loading) {
    return (
      <div className="candidate-dashboard-state">
        <div className="candidate-dashboard-loader" />
        <h2>Loading your dashboard</h2>
        <p>Fetching your applications, saved jobs and notifications.</p>
      </div>
    );
  }

  return (
    <div className="candidate-dashboard">
      <div className="candidate-mobile-bar">
        <button type="button" onClick={() => setMobileNavOpen(true)} aria-label="Open dashboard menu"><Menu size={21} /></button>
        <strong>Candidate Dashboard</strong>
        <button type="button" onClick={() => openSection('notifications')} className="candidate-mobile-notification" aria-label="Notifications">
          <Bell size={20} />
          {unreadNotifications > 0 && <span>{unreadNotifications > 9 ? '9+' : unreadNotifications}</span>}
        </button>
      </div>

      {mobileNavOpen && (
        <div className="candidate-mobile-nav" role="dialog" aria-modal="true" aria-label="Candidate navigation">
          <button className="candidate-mobile-nav__backdrop" onClick={() => setMobileNavOpen(false)} aria-label="Close menu" />
          <aside className="candidate-mobile-nav__panel">
            <div className="candidate-mobile-nav__close">
              <strong>Menu</strong>
              <button type="button" onClick={() => setMobileNavOpen(false)} aria-label="Close menu"><X size={21} /></button>
            </div>
            {sidebarContent}
          </aside>
        </div>
      )}

      <div className="candidate-dashboard__shell">
        <aside className="candidate-sidebar">{sidebarContent}</aside>

        <main className="candidate-main">
          <div className="candidate-page-header">
            <div>
              <button type="button" className="candidate-back-link" onClick={() => onNavigate('home')}>
                <ArrowLeft size={16} /> Back
              </button>
              <h1>Dashboard</h1>
              <p>
                Welcome back, {user?.name || 'Candidate'}
                {profile?.speciality ? ` · ${profile.speciality}` : ''}.
              </p>
            </div>
            <div className="candidate-page-header__actions">
              <button type="button" className="candidate-icon-button" onClick={() => openSection('notifications')} aria-label="Notifications">
                <Bell size={20} />
                {unreadNotifications > 0 && <span>{unreadNotifications > 9 ? '9+' : unreadNotifications}</span>}
              </button>
              <button type="button" className="candidate-outline-button" onClick={handleLogout}><LogOut size={16} />Logout</button>
            </div>
          </div>

          {activeSection === 'overview' && (
            <>
              <section className="mx-greeting">
                <h2>{greetingForNow()}, {user?.name || 'Doctor'} 👋</h2>
                <p>Find the right healthcare opportunity for your career.</p>
              </section>

              <section className={`mx-profile ${profilePercent >= 70 ? 'is-ready' : 'is-incomplete'}`}>
                <div className="mx-profile__top">
                  <div className="mx-avatar mx-avatar--lg">{getInitials(user?.name)}</div>
                  <div className="mx-profile__identity">
                    <strong>{user?.name || 'Candidate'}</strong>
                    <span>{profile?.speciality || 'Speciality not added'}{profile?.subSpeciality ? ` · ${profile.subSpeciality}` : ''}</span>
                  </div>
                  <div className="mx-progress">
                    <div className="mx-progress__label">
                      <span>Profile Completion</span>
                      <em>{profilePercent}%</em>
                    </div>
                    <div
                      className="mx-progress__bar"
                      role="progressbar"
                      aria-valuenow={profilePercent}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <span style={{ width: `${profilePercent}%` }} />
                    </div>
                  </div>
                  <button type="button" className="mx-btn" onClick={() => onNavigate('profile')}>
                    <User size={16} /> {profilePercent >= 70 ? 'Edit Profile' : 'Complete Profile'}
                  </button>
                </div>

                <div className="mx-profile__grid">
                  <article><Stethoscope size={15} /><span>Qualification</span><strong>{profile?.qualification || 'Not added'}</strong></article>
                  <article><Briefcase size={15} /><span>Experience</span><strong>{profile?.yearsExperience != null ? `${profile.yearsExperience} years` : 'Not added'}</strong></article>
                  <article><User size={15} /><span>Registration</span><strong>{profile?.registrationNumber || 'Not added'}</strong></article>
                  <article><MapPin size={15} /><span>Location</span><strong>{[profile?.currentCity, profile?.state].filter(Boolean).join(', ') || 'Not added'}</strong></article>
                </div>

                {profile?.profileSummary && <p className="mx-profile__summary">{profile.profileSummary}</p>}
                {!profile?.speciality && (
                  <p className="mx-profile__hint">
                    Add speciality, qualification and registration so hospitals can shortlist you.
                  </p>
                )}
              </section>

              <section className="mx-stats" aria-label="Candidate statistics">
                {stats.map((stat) => {
                  const Icon = stat.icon;
                  return (
                    <button type="button" className={`mx-stat mx-stat--${stat.tone}`} key={stat.label} onClick={stat.action}>
                      <span className="mx-stat__icon"><Icon size={18} /></span>
                      <strong className="mx-stat__value">{stat.value}</strong>
                      <span className="mx-stat__label">{stat.label}</span>
                    </button>
                  );
                })}
              </section>

              <div className="mx-section-header">
                <h2><Star size={18} /> Recommended For You</h2>
                <button type="button" className="mx-seeall" onClick={() => openSection('recommended')}>
                  See All <ChevronRight size={14} />
                </button>
              </div>
              {recommendedJobs.length === 0 ? (
                <div className="mx-empty"><Star size={26} /><h3>No recommended jobs available</h3><p>Featured jobs from the portal will appear here when available.</p></div>
              ) : (
                <div className="mx-jobscroll">{recommendedJobs.slice(0, 6).map((job) => renderJobCard(job, 'recommended'))}</div>
              )}

              {closingSoonJobs.length > 0 && (
                <>
                  <div className="mx-section-header">
                    <h2 className="mx-section-header--warn"><Clock size={18} /> Closing Soon</h2>
                    <button type="button" className="mx-seeall" onClick={() => onNavigate('jobs')}>
                      View All <ChevronRight size={14} />
                    </button>
                  </div>
                  <div className="mx-jobscroll">{closingSoonJobs.map((job) => renderJobCard(job, 'recommended'))}</div>
                </>
              )}

              <div className="mx-section-header">
                <h2><Briefcase size={18} /> Application Tracker</h2>
                <button type="button" className="mx-seeall" onClick={() => openSection('applications')}>
                  {applications.length} Applied
                </button>
              </div>
              {applications.length === 0 ? (
                <div className="mx-empty"><Briefcase size={26} /><h3>No applications yet</h3><p>Applications submitted from MedExJob will appear here.</p></div>
              ) : (
                <div className="mx-tracker">
                  {trackerSteps.map((step, index) => (
                    <Fragment key={step.label}>
                      {index > 0 && <span className="mx-tracker__arrow" aria-hidden="true"><ChevronRight size={14} /></span>}
                      <button
                        type="button"
                        className={`mx-tracker__step${step.count > 0 ? ' is-filled' : ''}${step.tone ? ` mx-tracker__step--${step.tone}` : ''}`}
                        onClick={() => { setStatusFilter(step.filter); openSection('applications'); }}
                      >
                        <span className="mx-tracker__count">{step.count}</span>
                        <span className="mx-tracker__label">{step.label}</span>
                      </button>
                    </Fragment>
                  ))}
                </div>
              )}

              <div className="mx-section-header">
                <h2><FileText size={18} /> Recent Applications</h2>
                <button type="button" className="mx-seeall" onClick={() => openSection('applications')}>
                  View All <ChevronRight size={14} />
                </button>
              </div>
              {applications.length === 0 ? (
                <div className="mx-empty"><Briefcase size={26} /><h3>No applications yet</h3></div>
              ) : (
                <div className="mx-applist">
                  {applications.slice(0, 4).map((application) => (
                    <article key={application.id} onClick={() => onNavigate('job-detail', application.jobId)}>
                      <div>
                        <h3>{application.jobTitle}</h3>
                        <p>{application.jobOrganization}</p>
                      </div>
                      <div className="mx-applist__side">
                        <span className={getStatusClass(application.status)}>{normalizeStatus(application.status)}</span>
                        <small>Applied {formatDate(application.appliedDate)}</small>
                      </div>
                    </article>
                  ))}
                </div>
              )}

              <div className="mx-section-header">
                <h2><Bell size={18} /> Recent Notifications</h2>
                <button type="button" className="mx-seeall" onClick={() => openSection('notifications')}>
                  View All <ChevronRight size={14} />
                </button>
              </div>
              {notifications.length === 0 ? (
                <div className="mx-empty"><Bell size={26} /><h3>No notifications yet</h3></div>
              ) : (
                <div className="mx-notiflist">
                  {notifications.slice(0, 5).map((notification: any) => (
                    <article key={notification.id} className={notification.read ? '' : 'is-unread'}>
                      <span className="mx-notiflist__icon"><Bell size={15} /></span>
                      <div>
                        <p>{notification.message}</p>
                        <small>{formatDate(notification.createdAt)}</small>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </>
          )}

          {activeSection === 'saved' && (
            <section className="candidate-content-panel">
              <div className="candidate-content-panel__header">
                <div><Bookmark size={21} /><div><h2>Saved Jobs</h2><p>{savedJobs.length} saved job{savedJobs.length === 1 ? '' : 's'}</p></div></div>
                <button type="button" className="candidate-primary-button candidate-primary-button--small" onClick={() => onNavigate('jobs')}><Search size={16} />Find Jobs</button>
              </div>
              {savedJobs.length === 0 ? (
                <div className="candidate-empty"><Bookmark size={30} /><h3>No saved jobs yet</h3><p>Save jobs while browsing and they will appear here.</p></div>
              ) : (
                <div className="candidate-grid-list">{savedJobs.map((job) => renderJobCard(job, 'saved'))}</div>
              )}
            </section>
          )}

          {activeSection === 'recommended' && (
            <section className="candidate-content-panel">
              <div className="candidate-content-panel__header">
                <div><Star size={21} /><div><h2>Recommended Jobs</h2><p>Current featured jobs available on MedExJob.</p></div></div>
                <button type="button" className="candidate-outline-button" onClick={() => onNavigate('jobs')}>Browse All Jobs</button>
              </div>
              {recommendedJobs.length === 0 ? (
                <div className="candidate-empty"><Star size={30} /><h3>No recommendations available</h3></div>
              ) : (
                <div className="candidate-grid-list">{recommendedJobs.map((job) => renderJobCard(job, 'recommended'))}</div>
              )}
            </section>
          )}

          {activeSection === 'applications' && (
            <section className="candidate-content-panel">
              <div className="candidate-content-panel__header">
                <div><Briefcase size={21} /><div><h2>My Applications</h2><p>Track applications submitted from your account.</p></div></div>
              </div>

              <div className="candidate-application-filters">
                <label>
                  <span>Search applications</span>
                  <div><Search size={16} /><input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Job title or organisation" /></div>
                </label>
                <label>
                  <span>Status</span>
                  <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as ApplicationStatusFilter)}>
                    <option value="all">All statuses</option>
                    <option value="applied">Under Review</option>
                    <option value="shortlisted">Shortlisted</option>
                    <option value="interview">Interview</option>
                    <option value="selected">Selected</option>
                    <option value="hired">Hired</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </label>
              </div>

              {filteredApplications.length === 0 ? (
                <div className="candidate-empty"><Briefcase size={30} /><h3>{applications.length === 0 ? 'No applications yet' : 'No applications match your filters'}</h3>{applications.length === 0 && <button type="button" className="candidate-primary-button candidate-primary-button--small" onClick={() => onNavigate('jobs')}>Browse Jobs</button>}</div>
              ) : (
                <div className="mx-applist mx-applist--full">
                  {filteredApplications.map((application) => (
                    <article key={application.id}>
                      <div>
                        <h3>{application.jobTitle}</h3>
                        <p>{application.jobOrganization}</p>
                        <div className="mx-applist__meta">
                          {application.postedBy?.company && <span><Building2 size={13} />{application.postedBy.company}</span>}
                          {application.interviewDate && <span><Calendar size={13} />Interview {formatDate(application.interviewDate)}</span>}
                        </div>
                      </div>
                      <div className="mx-applist__side">
                        <span className={getStatusClass(application.status)}>{normalizeStatus(application.status)}</span>
                        <small>Applied {formatDate(application.appliedDate)}</small>
                        <button type="button" className="mx-btn mx-btn--sm" onClick={() => onNavigate('job-detail', application.jobId)}>View Job</button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

          {activeSection === 'notifications' && (
            <section className="candidate-content-panel">
              <div className="candidate-content-panel__header">
                <div><Bell size={21} /><div><h2>Notifications</h2><p>Your latest account and job activity.</p></div></div>
                <button type="button" className="candidate-outline-button" onClick={() => onNavigate('notifications')}>Open Notification Center</button>
              </div>
              {notifications.length === 0 ? (
                <div className="candidate-empty"><Bell size={30} /><h3>No notifications yet</h3></div>
              ) : (
                <div className="mx-notiflist">
                  {notifications.map((notification: any) => (
                    <article key={notification.id} className={notification.read ? '' : 'is-unread'}>
                      <span className="mx-notiflist__icon"><Bell size={15} /></span>
                      <div><p>{notification.message}</p><small>{formatDate(notification.createdAt)}</small></div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}
        </main>
      </div>

      <nav className="candidate-bottom-nav" aria-label="Candidate mobile navigation">
        <button type="button" className={activeSection === 'overview' ? 'is-active' : ''} onClick={() => openSection('overview')}><LayoutDashboard size={20} /><span>Home</span></button>
        <button type="button" onClick={() => onNavigate('jobs')}><Search size={20} /><span>Jobs</span></button>
        <button type="button" className={activeSection === 'saved' ? 'is-active' : ''} onClick={() => openSection('saved')}><Bookmark size={20} /><span>Saved</span>{savedJobs.length > 0 && <em>{savedJobs.length > 9 ? '9+' : savedJobs.length}</em>}</button>
        <button type="button" className={activeSection === 'applications' ? 'is-active' : ''} onClick={() => openSection('applications')}><Briefcase size={20} /><span>Apps</span>{applications.length > 0 && <em>{applications.length > 9 ? '9+' : applications.length}</em>}</button>
        <button type="button" onClick={() => onNavigate('profile')}><User size={20} /><span>Profile</span></button>
      </nav>
    </div>
  );
}
