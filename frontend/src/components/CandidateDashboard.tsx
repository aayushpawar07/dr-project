// AI assisted development
import {
  ArrowLeft,
  Bell,
  Bookmark,
  Briefcase,
  Building2,
  Calendar,
  ChevronRight,
  Heart,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  Search,
  Star,
  User,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { fetchApplications, ApplicationResponse } from '../api/applications';
import { fetchJobs } from '../api/jobs';
import { getSavedJobs, saveJob, unsaveJob } from '../api/savedJobs';
import { fetchNotifications } from '../api/notifications';

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

    const [fetchedApplications, fetchedSavedJobs, fetchedFeaturedJobs, fetchedNotifications] = await Promise.all([
      applicationPromise,
      savedPromise,
      featuredPromise,
      notificationPromise,
    ]);

    setApplications(fetchedApplications);
    setSavedJobs(fetchedSavedJobs);
    setRecommendedJobs(fetchedFeaturedJobs);
    setNotifications(fetchedNotifications);
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
      const matchesStatus = statusFilter === 'all' || application.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [applications, searchTerm, statusFilter]);

  const interviewCount = applications.filter((application) => application.status === 'interview' || application.interviewDate).length;
  const shortlistedCount = applications.filter((application) => application.status === 'shortlisted').length;
  const selectedCount = applications.filter((application) => application.status === 'selected' || application.status === 'hired').length;
  const unreadNotifications = notifications.filter((notification: any) => !notification.read).length;

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

    return (
      <article className="candidate-job-card" key={job.id}>
        <div className="candidate-job-card__head">
          <div>
            <div className="candidate-job-card__org">
              <Building2 size={16} />
              <span>{job.organization || 'Organisation not specified'}</span>
              {job.sector && <small>{job.sector}</small>}
            </div>
            <h3 onClick={() => onNavigate('job-detail', job.id)}>{job.title || 'Untitled Job'}</h3>
          </div>
        </div>

        <div className="candidate-job-card__meta">
          {job.location && <span><MapPin size={14} />{job.location}</span>}
          {job.salary && <span>{job.salary}</span>}
          {job.lastDate && <span>Last date {formatDate(job.lastDate)}</span>}
        </div>

        <div className="candidate-job-card__footer">
          <div className="candidate-job-card__signals">
            {job.featured && <span className="featured-signal"><Star size={14} />Featured</span>}
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
                  <span className="candidate-eyebrow">MedExJob Dashboard</span>
                  <h2>Manage your job search from one place.</h2>
                  <p>Your dashboard uses your current applications, saved jobs, featured jobs and notifications.</p>
                </div>
                <button type="button" className="candidate-primary-button" onClick={() => onNavigate('jobs')}>
                  <Search size={17} /> Find Jobs
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

              <section className="candidate-dashboard-section">
                <div className="candidate-section-heading">
                  <div><Star size={20} /><h2>Recommended Jobs</h2></div>
                  <button type="button" onClick={() => openSection('recommended')}>See All <ChevronRight size={15} /></button>
                </div>
                {recommendedJobs.length === 0 ? (
                  <div className="candidate-empty"><Star size={28} /><h3>No recommended jobs available</h3><p>Featured jobs from the portal will appear here when available.</p></div>
                ) : (
                  <div className="candidate-job-scroll">{recommendedJobs.slice(0, 5).map((job) => renderJobCard(job, 'recommended'))}</div>
                )}
              </section>

              <section className="candidate-dashboard-section">
                <div className="candidate-section-heading">
                  <div><Briefcase size={20} /><h2>Recent Applications</h2></div>
                  <button type="button" onClick={() => openSection('applications')}>View All</button>
                </div>
                {applications.length === 0 ? (
                  <div className="candidate-empty candidate-empty--compact"><Briefcase size={26} /><h3>No applications yet</h3><p>Applications submitted from MedExJob will appear here.</p></div>
                ) : (
                  <div className="candidate-application-list candidate-application-list--preview">
                    {applications.slice(0, 4).map((application) => (
                      <article key={application.id}>
                        <div className="candidate-application-list__head">
                          <div>
                            <span className={getStatusClass(application.status)}>{normalizeStatus(application.status)}</span>
                            <h3 onClick={() => onNavigate('job-detail', application.jobId)}>{application.jobTitle}</h3>
                            <p>{application.jobOrganization}</p>
                          </div>
                          <small>Applied {formatDate(application.appliedDate)}</small>
                        </div>
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
                        <button type="button" className="candidate-primary-button candidate-primary-button--small" onClick={() => onNavigate('job-detail', application.jobId)}>View Job</button>
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
        <button type="button" onClick={() => onNavigate('jobs')}><Search size={20} /><span>Jobs</span></button>
        <button type="button" className={activeSection === 'saved' ? 'is-active' : ''} onClick={() => openSection('saved')}><Bookmark size={20} /><span>Saved</span>{savedJobs.length > 0 && <em>{savedJobs.length > 9 ? '9+' : savedJobs.length}</em>}</button>
        <button type="button" className={activeSection === 'applications' ? 'is-active' : ''} onClick={() => openSection('applications')}><Briefcase size={20} /><span>Apps</span>{applications.length > 0 && <em>{applications.length > 9 ? '9+' : applications.length}</em>}</button>
        <button type="button" onClick={() => onNavigate('profile')}><User size={20} /><span>Profile</span></button>
      </nav>
    </div>
  );
}
