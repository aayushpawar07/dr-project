// AI assisted development
import {
  AlertCircle,
  ArrowLeft,
  Bell,
  Bookmark,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  Heart,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  User,
  Users,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { fetchApplications, ApplicationResponse } from '../api/applications';
import { fetchJobs } from '../api/jobs';
import { getSavedJobs, saveJob, unsaveJob } from '../api/savedJobs';
import { fetchNotifications } from '../api/notifications';
import { fetchJobAlerts, JobAlertResponse, updateJobAlert } from '../api/jobAlerts';
import { openFileInViewer } from '../utils/fileUtils';

interface CandidateDashboardProps {
  onNavigate: (page: string, jobId?: string) => void;
}

type CandidateSection =
  | 'overview'
  | 'saved'
  | 'applications'
  | 'alerts'
  | 'recommended'
  | 'closing'
  | 'notifications';

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

function getDaysRemaining(lastDate?: string) {
  if (!lastDate) return null;
  const end = new Date(lastDate);
  if (Number.isNaN(end.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return Math.ceil((end.getTime() - today.getTime()) / 86400000);
}

export function CandidateDashboard({ onNavigate }: CandidateDashboardProps) {
  const { user, logout, token } = useAuth();
  const location = useLocation();

  const [savedJobs, setSavedJobs] = useState<any[]>([]);
  const [applications, setApplications] = useState<ApplicationResponse[]>([]);
  const [recommendedJobs, setRecommendedJobs] = useState<any[]>([]);
  const [activeJobs, setActiveJobs] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [jobAlerts, setJobAlerts] = useState<JobAlertResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<CandidateSection>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ApplicationStatusFilter>('all');

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

    const activeJobsPromise = fetchJobs({ status: 'active', openOnly: true, page: 0, size: 100, sort: 'createdAt,desc' })
      .then((data) => (Array.isArray(data?.content) ? data.content : []))
      .catch((error) => {
        console.error('Failed to fetch active jobs:', error);
        return [] as any[];
      });

    const featuredPromise = fetchJobs({ featured: true, status: 'active', openOnly: true, page: 0, size: 8, sort: 'createdAt,desc' })
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

    const alertPromise = fetchJobAlerts({ page: 0, size: 100 }, token)
      .then((data) => (Array.isArray(data?.content) ? data.content : []))
      .catch((error) => {
        console.error('Failed to fetch job alerts:', error);
        return [] as JobAlertResponse[];
      });

    const [fetchedApplications, fetchedSavedJobs, fetchedActiveJobs, fetchedFeaturedJobs, fetchedNotifications, fetchedAlerts] =
      await Promise.all([
        applicationPromise,
        savedPromise,
        activeJobsPromise,
        featuredPromise,
        notificationPromise,
        alertPromise,
      ]);

    setApplications(fetchedApplications);
    setSavedJobs(fetchedSavedJobs);
    setActiveJobs(fetchedActiveJobs);
    setRecommendedJobs(fetchedFeaturedJobs.length > 0 ? fetchedFeaturedJobs : fetchedActiveJobs.slice(0, 8));
    setNotifications(fetchedNotifications);
    setJobAlerts(fetchedAlerts);
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

  const closingSoonJobs = useMemo(
    () =>
      activeJobs
        .filter((job) => {
          const days = getDaysRemaining(job.lastDate);
          return days !== null && days >= 0 && days <= 7;
        })
        .sort((a, b) => (getDaysRemaining(a.lastDate) ?? 999) - (getDaysRemaining(b.lastDate) ?? 999)),
    [activeJobs],
  );

  const filteredApplications = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return applications.filter((application) => {
      const matchesSearch =
        !term ||
        application.jobTitle?.toLowerCase().includes(term) ||
        application.jobOrganization?.toLowerCase().includes(term) ||
        application.postedBy?.name?.toLowerCase().includes(term) ||
        application.postedBy?.company?.toLowerCase().includes(term);
      const matchesStatus = statusFilter === 'all' || application.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [applications, searchTerm, statusFilter]);

  const interviewCount = applications.filter((application) => application.status === 'interview' || application.interviewDate).length;
  const shortlistedCount = applications.filter((application) => application.status === 'shortlisted').length;
  const selectedCount = applications.filter((application) => application.status === 'selected' || application.status === 'hired').length;
  const rejectedCount = applications.filter((application) => application.status === 'rejected').length;
  const underReviewCount = applications.filter((application) => application.status === 'applied' || application.status === 'pending').length;
  const activeAlertCount = jobAlerts.filter((alert) => alert.active).length;
  const unreadNotifications = notifications.filter((notification: any) => !notification.read).length;
  const hasResume = applications.some((application) => Boolean(application.resumeUrl));

  const profileCompletion = useMemo(() => {
    const checks = [Boolean(user?.name), Boolean(user?.email), user?.role === 'candidate', hasResume];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [hasResume, user]);

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

  const handleToggleAlert = async (alert: JobAlertResponse) => {
    if (!token) return;
    try {
      const updated = await updateJobAlert(alert.id, { active: !alert.active }, token);
      setJobAlerts((previous) => previous.map((item) => (item.id === alert.id ? updated : item)));
    } catch (error) {
      console.error('Failed to update job alert:', error);
    }
  };

  const latestResumeUrl = useMemo(
    () => applications.find((application) => application.resumeUrl)?.resumeUrl,
    [applications],
  );

  const stats = [
    { label: 'Saved Jobs', value: savedJobs.length, icon: Bookmark, tone: 'rose', action: () => openSection('saved') },
    { label: 'Applications', value: applications.length, icon: Briefcase, tone: 'teal', action: () => openSection('applications') },
    { label: 'Active Alerts', value: activeAlertCount, icon: Bell, tone: 'amber', action: () => openSection('alerts') },
    { label: 'Recommended', value: recommendedJobs.length, icon: Star, tone: 'blue', action: () => openSection('recommended') },
    { label: 'Closing Soon', value: closingSoonJobs.length, icon: Clock3, tone: 'orange', action: () => openSection('closing') },
    { label: 'Interviews', value: interviewCount, icon: Calendar, tone: 'purple', action: () => openSection('applications') },
  ];

  const renderJobCard = (job: any, mode: 'recommended' | 'closing' | 'saved' = 'recommended') => {
    const daysRemaining = getDaysRemaining(job.lastDate);
    const isSaved = savedJobs.some((saved) => saved.id === job.id);
    const isVerified = Boolean(job.isVerified || job.verified || job.employerVerified);

    return (
      <article className={`candidate-job-card${mode === 'closing' ? ' candidate-job-card--urgent' : ''}`} key={job.id}>
        <div className="candidate-job-card__head">
          <div>
            <div className="candidate-job-card__org">
              <Building2 size={16} />
              <span>{job.organization || 'Organisation not specified'}</span>
              {job.sector && <small>{job.sector}</small>}
            </div>
            <h3 onClick={() => onNavigate('job-detail', job.id)}>{job.title || 'Untitled Job'}</h3>
          </div>
          {mode === 'closing' && daysRemaining !== null && (
            <span className={`closing-pill${daysRemaining <= 2 ? ' closing-pill--danger' : ''}`}>
              {daysRemaining === 0 ? 'Closes today' : `${daysRemaining} day${daysRemaining === 1 ? '' : 's'} left`}
            </span>
          )}
        </div>

        <div className="candidate-job-card__meta">
          {job.location && <span><MapPin size={14} />{job.location}</span>}
          {job.salary && <span>{job.salary}</span>}
          {job.lastDate && mode !== 'closing' && <span><Clock3 size={14} />Closes {formatDate(job.lastDate)}</span>}
        </div>

        <div className="candidate-job-card__footer">
          <div className="candidate-job-card__signals">
            {isVerified && <span className="verified-signal"><ShieldCheck size={14} />Verified</span>}
            {job.featured && <span className="featured-signal"><Sparkles size={14} />Featured</span>}
          </div>
          <div className="candidate-job-card__actions">
            {mode === 'saved' ? (
              <button type="button" className="text-action text-action--danger" onClick={() => handleRemoveSavedJob(job.id)}>
                <Heart size={15} fill="currentColor" /> Remove
              </button>
            ) : (
              <button type="button" className="text-action" onClick={() => handleSaveJob(job)}>
                <Heart size={15} fill={isSaved ? 'currentColor' : 'none'} /> {isSaved ? 'Saved' : 'Save'}
              </button>
            )}
            <button type="button" className="candidate-primary-button candidate-primary-button--small" onClick={() => onNavigate('job-detail', job.id)}>
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
        { label: 'Job Alerts', icon: Bell, badge: activeAlertCount, active: activeSection === 'alerts', action: () => openSection('alerts') },
      ],
    },
    {
      label: 'Intelligence',
      items: [
        { label: 'Recommended Jobs', icon: Star, badge: recommendedJobs.length, active: activeSection === 'recommended', action: () => openSection('recommended') },
        { label: 'Closing Soon', icon: Clock3, badge: closingSoonJobs.length, active: activeSection === 'closing', action: () => openSection('closing') },
      ],
    },
    {
      label: 'Profile',
      items: [
        { label: 'My Profile', icon: User, action: () => { setMobileNavOpen(false); onNavigate('profile'); } },
        {
          label: 'My Resume',
          icon: FileText,
          action: () => {
            setMobileNavOpen(false);
            if (latestResumeUrl) openFileInViewer(latestResumeUrl);
            else onNavigate('profile');
          },
        },
      ],
    },
    {
      label: 'Account',
      items: [
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
        <p>Fetching your applications, saved jobs and alerts.</p>
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
              <p>Welcome back, {user?.name || 'Candidate'}.</p>
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
              <section className="candidate-greeting-card">
                <div>
                  <span className="candidate-eyebrow">Career dashboard</span>
                  <h2>Find the right healthcare opportunity for your next move.</h2>
                  <p>Your dashboard is built from your current applications, saved jobs, alerts and available jobs.</p>
                </div>
                <button type="button" className="candidate-primary-button" onClick={() => onNavigate('jobs')}>
                  <Search size={17} /> Find Jobs
                </button>
              </section>

              <section className="candidate-profile-card">
                <div className="candidate-profile-card__title">
                  <div className="candidate-user-avatar candidate-user-avatar--large">{getInitials(user?.name)}</div>
                  <div>
                    <strong>Profile readiness</strong>
                    <span>Based on your account details and resume activity</span>
                  </div>
                </div>
                <div className="candidate-profile-card__progress">
                  <div><span>Profile readiness</span><strong>{profileCompletion}%</strong></div>
                  <div className="candidate-progress"><span style={{ width: `${profileCompletion}%` }} /></div>
                </div>
                <button type="button" className="candidate-outline-button" onClick={() => onNavigate('profile')}>
                  <User size={16} /> View Profile
                </button>
              </section>

              <section className="candidate-stats-grid" aria-label="Candidate statistics">
                {stats.map((stat) => {
                  const Icon = stat.icon;
                  return (
                    <button type="button" className={`candidate-stat-card candidate-stat-card--${stat.tone}`} key={stat.label} onClick={stat.action}>
                      <span className="candidate-stat-card__icon"><Icon size={22} /></span>
                      <strong>{stat.value}</strong>
                      <span>{stat.label}</span>
                    </button>
                  );
                })}
              </section>

              <section className="candidate-discovery-banner">
                <div>
                  <span className="candidate-discovery-banner__icon"><Sparkles size={22} /></span>
                  <div>
                    <strong>Job Discovery</strong>
                    <p>
                      {recommendedJobs.length > 0
                        ? `${recommendedJobs.length} currently featured or recommended job${recommendedJobs.length === 1 ? '' : 's'} are available.`
                        : 'Browse the latest available healthcare jobs.'}
                    </p>
                  </div>
                </div>
                <button type="button" className="candidate-outline-button" onClick={() => openSection('recommended')}>
                  View Jobs <ChevronRight size={16} />
                </button>
              </section>

              <section className="candidate-dashboard-section">
                <div className="candidate-section-heading">
                  <div><Star size={20} /><h2>Recommended For You</h2></div>
                  <button type="button" onClick={() => openSection('recommended')}>See All <ChevronRight size={15} /></button>
                </div>
                {recommendedJobs.length === 0 ? (
                  <div className="candidate-empty"><Star size={28} /><h3>No recommendations yet</h3><p>New recommendations will appear when matching jobs are available.</p></div>
                ) : (
                  <div className="candidate-job-scroll">{recommendedJobs.slice(0, 5).map((job) => renderJobCard(job, 'recommended'))}</div>
                )}
              </section>

              <section className="candidate-dashboard-section">
                <div className="candidate-section-heading">
                  <div><Clock3 size={20} /><h2>Closing Soon</h2></div>
                  <button type="button" onClick={() => openSection('closing')}>View All <ChevronRight size={15} /></button>
                </div>
                {closingSoonJobs.length === 0 ? (
                  <div className="candidate-empty candidate-empty--compact"><Clock3 size={26} /><h3>No jobs closing in the next 7 days</h3></div>
                ) : (
                  <div className="candidate-job-scroll">{closingSoonJobs.slice(0, 5).map((job) => renderJobCard(job, 'closing'))}</div>
                )}
              </section>

              <section className="candidate-dashboard-section">
                <div className="candidate-section-heading">
                  <div><Briefcase size={20} /><h2>Application Tracker</h2></div>
                  <button type="button" onClick={() => openSection('applications')}>{applications.length} Applied</button>
                </div>
                <div className="candidate-tracker">
                  <div><span className="candidate-tracker__icon candidate-tracker__icon--done"><Bookmark size={15} /></span><strong>Saved</strong><em>{savedJobs.length}</em></div>
                  <ChevronRight size={16} />
                  <div><span className="candidate-tracker__icon candidate-tracker__icon--done"><CheckCircle2 size={15} /></span><strong>Applied</strong><em>{applications.length}</em></div>
                  <ChevronRight size={16} />
                  <div><span className="candidate-tracker__icon candidate-tracker__icon--active">{underReviewCount}</span><strong>Under Review</strong><em>{underReviewCount}</em></div>
                  <ChevronRight size={16} />
                  <div><span className="candidate-tracker__icon">{shortlistedCount}</span><strong>Shortlisted</strong><em>{shortlistedCount}</em></div>
                  <ChevronRight size={16} />
                  <div><span className="candidate-tracker__icon">{interviewCount}</span><strong>Interview</strong><em>{interviewCount}</em></div>
                  <ChevronRight size={16} />
                  <div><span className="candidate-tracker__icon candidate-tracker__icon--selected">{selectedCount}</span><strong>Selected</strong><em>{selectedCount}</em></div>
                  <ChevronRight size={16} />
                  <div><span className="candidate-tracker__icon candidate-tracker__icon--rejected">{rejectedCount}</span><strong>Rejected</strong><em>{rejectedCount}</em></div>
                </div>
              </section>

              <section className="candidate-dashboard-section">
                <div className="candidate-section-heading">
                  <div><Bell size={20} /><h2>Your Job Alerts</h2></div>
                  <button type="button" onClick={() => openSection('alerts')}>Manage Alerts</button>
                </div>
                {jobAlerts.length === 0 ? (
                  <div className="candidate-empty candidate-empty--compact"><Bell size={26} /><h3>No job alerts created</h3><p>Your alerts will appear here once they are available.</p></div>
                ) : (
                  <div className="candidate-alert-list">
                    {jobAlerts.slice(0, 3).map((alert) => (
                      <article className="candidate-alert-row" key={alert.id}>
                        <div>
                          <Bell size={18} />
                          <div><strong>{alert.name}</strong><span>{alert.frequency} · {alert.matches} match{alert.matches === 1 ? '' : 'es'}</span></div>
                        </div>
                        <button type="button" className={`candidate-toggle${alert.active ? ' is-on' : ''}`} onClick={() => handleToggleAlert(alert)} aria-label={`${alert.active ? 'Pause' : 'Activate'} ${alert.name}`}>
                          <span />
                        </button>
                      </article>
                    ))}
                  </div>
                )}
              </section>

              <section className="candidate-dashboard-section">
                <div className="candidate-section-heading">
                  <div><Bell size={20} /><h2>Recent Notifications</h2></div>
                  <button type="button" onClick={() => openSection('notifications')}>View All</button>
                </div>
                {notifications.length === 0 ? (
                  <div className="candidate-empty candidate-empty--compact"><Bell size={26} /><h3>No notifications yet</h3></div>
                ) : (
                  <div className="candidate-notification-list">
                    {notifications.slice(0, 4).map((notification: any) => (
                      <article key={notification.id} className={notification.read ? '' : 'is-unread'}>
                        <span><Bell size={16} /></span>
                        <div><p>{notification.message}</p><small>{formatDate(notification.createdAt)}</small></div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
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
                <div><Star size={21} /><div><h2>Recommended Jobs</h2><p>Current featured and recommended jobs available to you.</p></div></div>
                <button type="button" className="candidate-outline-button" onClick={() => onNavigate('jobs')}>Browse All Jobs</button>
              </div>
              {recommendedJobs.length === 0 ? (
                <div className="candidate-empty"><Star size={30} /><h3>No recommendations available</h3></div>
              ) : (
                <div className="candidate-grid-list">{recommendedJobs.map((job) => renderJobCard(job, 'recommended'))}</div>
              )}
            </section>
          )}

          {activeSection === 'closing' && (
            <section className="candidate-content-panel">
              <div className="candidate-content-panel__header">
                <div><Clock3 size={21} /><div><h2>Closing Soon</h2><p>Active jobs closing within the next 7 days.</p></div></div>
              </div>
              {closingSoonJobs.length === 0 ? (
                <div className="candidate-empty"><Clock3 size={30} /><h3>No urgent deadlines right now</h3></div>
              ) : (
                <div className="candidate-grid-list">{closingSoonJobs.map((job) => renderJobCard(job, 'closing'))}</div>
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
                <div className="candidate-application-list">
                  {filteredApplications.map((application) => (
                    <article key={application.id}>
                      <div className="candidate-application-list__head">
                        <div>
                          <span className={getStatusClass(application.status)}>{normalizeStatus(application.status)}</span>
                          <h3 onClick={() => onNavigate('job-detail', application.jobId)}>{application.jobTitle}</h3>
                          <p>{application.jobOrganization}</p>
                        </div>
                        <small>Applied {formatDate(application.appliedDate)}</small>
                      </div>

                      <div className="candidate-application-list__details">
                        {application.postedBy?.company && <span><Building2 size={14} />{application.postedBy.company}</span>}
                        {application.interviewDate && <span><Calendar size={14} />Interview {formatDate(application.interviewDate)}</span>}
                      </div>

                      <div className="candidate-application-list__actions">
                        {application.resumeUrl && <button type="button" className="candidate-outline-button" onClick={() => openFileInViewer(application.resumeUrl!)}><FileText size={15} />View Resume</button>}
                        <button type="button" className="candidate-primary-button candidate-primary-button--small" onClick={() => onNavigate('job-detail', application.jobId)}>View Job</button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

          {activeSection === 'alerts' && (
            <section className="candidate-content-panel">
              <div className="candidate-content-panel__header">
                <div><Bell size={21} /><div><h2>Job Alerts</h2><p>Alerts configured for your account.</p></div></div>
              </div>
              {jobAlerts.length === 0 ? (
                <div className="candidate-empty"><Bell size={30} /><h3>No job alerts found</h3><p>Job alerts created for your account will appear here.</p></div>
              ) : (
                <div className="candidate-alert-list candidate-alert-list--full">
                  {jobAlerts.map((alert) => (
                    <article className="candidate-alert-row" key={alert.id}>
                      <div>
                        <Bell size={19} />
                        <div>
                          <strong>{alert.name}</strong>
                          <span>
                            {[...alert.keywords, ...alert.locations, ...alert.categories, ...alert.sectors].filter(Boolean).join(' · ') || 'No criteria specified'}
                          </span>
                          <small>{alert.frequency} · {alert.matches} current match{alert.matches === 1 ? '' : 'es'}</small>
                        </div>
                      </div>
                      <button type="button" className={`candidate-toggle${alert.active ? ' is-on' : ''}`} onClick={() => handleToggleAlert(alert)} aria-label={`${alert.active ? 'Pause' : 'Activate'} ${alert.name}`}><span /></button>
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
                <div className="candidate-notification-list candidate-notification-list--full">
                  {notifications.map((notification: any) => (
                    <article key={notification.id} className={notification.read ? '' : 'is-unread'}>
                      <span><Bell size={17} /></span>
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
        <button type="button" onClick={() => onNavigate('jobs')}><Search size={20} /><span>Search</span></button>
        <button type="button" className={activeSection === 'saved' ? 'is-active' : ''} onClick={() => openSection('saved')}><Bookmark size={20} /><span>Saved</span>{savedJobs.length > 0 && <em>{savedJobs.length > 9 ? '9+' : savedJobs.length}</em>}</button>
        <button type="button" className={activeSection === 'applications' ? 'is-active' : ''} onClick={() => openSection('applications')}><Briefcase size={20} /><span>Apps</span>{applications.length > 0 && <em>{applications.length > 9 ? '9+' : applications.length}</em>}</button>
        <button type="button" onClick={() => onNavigate('profile')}><User size={20} /><span>Profile</span></button>
      </nav>
    </div>
  );
}
