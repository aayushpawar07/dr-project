// AI assisted development
import {
  AlertTriangle,
  ArrowLeft,
  Award,
  BarChart3,
  Bell,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle,
  ChevronRight,
  CreditCard,
  Edit,
  Eye,
  FileText,
  LayoutDashboard,
  LogOut,
  Mail,
  MapPin,
  Menu,
  Phone,
  Plus,
  RefreshCw,
  ShieldCheck,
  Star,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { fetchEmployer, EmployerResponse } from '../api/employers';
import {
  fetchApplications,
  updateApplicationStatus,
  ApplicationResponse,
  normalizeApplicationStatus,
  toInterviewDateTimeLocal,
} from '../api/applications';
import { fetchJobsByEmployer } from '../api/jobs';
import { getCurrentSubscription, SubscriptionResponse } from '../api/subscriptions';
import { fetchNotifications } from '../api/notifications';
import { openFileInViewer } from '../utils/fileUtils';
import '../styles/employer-dashboard.css';

interface EmployerDashboardProps {
  onNavigate: (page: string, entityId?: string) => void;
}

type DashboardSection = 'jobs' | 'applications' | 'subscription' | 'notifications' | 'verification';
type JobFilter = 'all' | 'active' | 'pending' | 'draft' | 'closed';
type ApplicationFilter = 'all' | 'new' | 'shortlisted' | 'interview' | 'selected' | 'rejected';

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
  if (!value) return 'ME';
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'ME';
  return parts.slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join('');
}

function getJobStatusClass(status?: string) {
  switch ((status || '').toLowerCase()) {
    case 'active':
      return 'dashboard-status dashboard-status--active';
    case 'pending':
      return 'dashboard-status dashboard-status--pending';
    case 'draft':
      return 'dashboard-status dashboard-status--draft';
    case 'closed':
      return 'dashboard-status dashboard-status--closed';
    default:
      return 'dashboard-status';
  }
}

function statusLabel(status?: string) {
  const normalized = normalizeApplicationStatus(status);
  if (normalized === 'applied') return 'New';
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function getApplicationStatusClass(status?: string) {
  switch (normalizeApplicationStatus(status)) {
    case 'shortlisted':
      return 'dashboard-status dashboard-status--active';
    case 'interview':
      return 'dashboard-status dashboard-status--interview';
    case 'selected':
    case 'hired':
      return 'dashboard-status dashboard-status--selected';
    case 'rejected':
      return 'dashboard-status dashboard-status--rejected';
    case 'applied':
      return 'dashboard-status dashboard-status--pending';
    default:
      return 'dashboard-status';
  }
}

export function EmployerDashboard({ onNavigate }: EmployerDashboardProps) {
  const { user, token, logout } = useAuth();
  const [myJobs, setMyJobs] = useState<any[]>([]);
  const [myApplications, setMyApplications] = useState<ApplicationResponse[]>([]);
  const [employer, setEmployer] = useState<EmployerResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentSubscription, setCurrentSubscription] = useState<SubscriptionResponse | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [activeSection, setActiveSection] = useState<DashboardSection>('jobs');
  const [jobFilter, setJobFilter] = useState<JobFilter>('all');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [updatingApplicationId, setUpdatingApplicationId] = useState<string | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string>('all');
  const [applicationFilter, setApplicationFilter] = useState<ApplicationFilter>('all');
  const [interviewDraft, setInterviewDraft] = useState<{ application: ApplicationResponse; date: string } | null>(null);

  const fetchApplicationsForJobs = async (jobs: any[], authToken: string) => {
    if (jobs.length === 0) return [];

    const allApplications: ApplicationResponse[] = [];
    for (const job of jobs) {
      try {
        const appsResponse = await fetchApplications(
          {
            jobId: job.id,
            page: 0,
            size: 1000,
          },
          authToken,
        );

        const rows = Array.isArray(appsResponse?.content)
          ? appsResponse.content
          : Array.isArray(appsResponse)
            ? appsResponse
            : [];
        allApplications.push(
          ...rows.map((application: ApplicationResponse) => ({
            ...application,
            jobId: !application.jobId || application.jobId === 'N/A' ? job.id : application.jobId,
            jobTitle: !application.jobTitle || application.jobTitle === 'N/A' ? job.title : application.jobTitle,
            status: normalizeApplicationStatus(application.status),
          })),
        );
      } catch (applicationError) {
        console.error(`Failed to fetch applications for job ${job.id}:`, applicationError);
      }
    }
    return allApplications;
  };

  const loadDashboardData = async (showLoader = false) => {
    if (!user || !token) return;
    if (showLoader) setLoading(true);

    try {
      setError(null);
      const employerData = await fetchEmployer(user.id, token);
      setEmployer(employerData);

      const jobsResponse = await fetchJobsByEmployer(employerData.id, {
        status: 'all',
        page: 0,
        size: 1000,
      });
      const employerJobs = jobsResponse.content || [];
      setMyJobs(employerJobs);

      const applications = await fetchApplicationsForJobs(employerJobs, token);
      setMyApplications(applications);

      try {
        const subscription = await getCurrentSubscription(token);
        setCurrentSubscription(subscription);
      } catch (subscriptionError) {
        setCurrentSubscription(null);
      }

      try {
        const notificationsData = await fetchNotifications({ page: 0, size: 10 }, token);
        setNotifications(notificationsData.content || []);
      } catch (notificationError) {
        setNotifications([]);
      }
    } catch (dashboardError: any) {
      console.error('Failed to fetch employer data:', dashboardError);
      setError(dashboardError?.message || 'Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, token]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user && token) {
        loadDashboardData(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, token]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileNavOpen]);

  const verified = employer?.verificationStatus === 'approved';
  const totalApplicationsFromList = myApplications.length;
  const totalApplicationsFromJobs = myJobs.reduce((sum, job) => sum + (Number(job.applications) || 0), 0);
  const totalApplications = Math.max(totalApplicationsFromList, totalApplicationsFromJobs);
  const activeJobs = myJobs.filter((job) => job.status === 'active').length;
  const newApplicationCount = myApplications.filter((application) => normalizeApplicationStatus(application.status) === 'applied').length;
  const shortlistedCount = myApplications.filter((application) => normalizeApplicationStatus(application.status) === 'shortlisted').length;
  const interviewCount = myApplications.filter((application) => normalizeApplicationStatus(application.status) === 'interview').length;
  const filledPositionsCount = myApplications.filter(
    (application) => normalizeApplicationStatus(application.status) === 'selected',
  ).length;
  const unreadNotifications = notifications.filter((notification: any) => !notification.read).length;

  const jobsClosingSoon = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const sevenDaysFromNow = new Date(now);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    return myJobs.filter((job) => {
      if (job.status !== 'active' || !job.lastDate) return false;
      const lastDate = new Date(job.lastDate);
      if (Number.isNaN(lastDate.getTime())) return false;
      lastDate.setHours(0, 0, 0, 0);
      return lastDate >= now && lastDate <= sevenDaysFromNow;
    }).length;
  }, [myJobs]);

  const totalViews = myJobs.reduce((sum, job) => sum + (Number(job.views) || 0), 0);

  const filteredJobs = useMemo(() => {
    if (jobFilter === 'all') return myJobs;
    return myJobs.filter((job) => job.status === jobFilter);
  }, [jobFilter, myJobs]);

  const applicationsByJob = useMemo(() => {
    const grouped = new Map<string, ApplicationResponse[]>();
    myApplications.forEach((application) => {
      const jobId = application.jobId && application.jobId !== 'N/A'
        ? application.jobId
        : `unassigned-${application.id}`;
      if (!grouped.has(jobId)) grouped.set(jobId, []);
      grouped.get(jobId)!.push(application);
    });
    return Array.from(grouped.entries());
  }, [myApplications]);

  const visibleApplicationsByJob = useMemo(() => {
    const matchesFilter = (application: ApplicationResponse) => {
      const status = normalizeApplicationStatus(application.status);
      if (applicationFilter === 'all') return true;
      if (applicationFilter === 'new') return status === 'applied';
      return status === applicationFilter;
    };

    if (selectedJobId !== 'all') {
      const jobApplications = myApplications.filter((application) => application.jobId === selectedJobId && matchesFilter(application));
      return [[selectedJobId, jobApplications]] as Array<[string, ApplicationResponse[]]>;
    }

    return applicationsByJob
      .map(([jobId, applications]) => [jobId, applications.filter(matchesFilter)] as [string, ApplicationResponse[]])
      .filter(([, applications]) => applications.length > 0);
  }, [applicationFilter, applicationsByJob, myApplications, selectedJobId]);

  const openApplications = (filter: ApplicationFilter = 'all', jobId = 'all') => {
    setApplicationFilter(filter);
    setSelectedJobId(jobId);
    setActiveSection('applications');
    setMobileNavOpen(false);
  };

  const handleLogout = () => {
    logout();
    onNavigate('logout');
  };

  const handlePostJob = () => {
    setMobileNavOpen(false);
    if (!verified) {
      toast.error('Employer business verification is required before posting jobs.');
      onNavigate('verification');
      return;
    }
    if (currentSubscription?.status === 'active') {
      onNavigate('employer-post-job');
    } else {
      onNavigate('subscription');
    }
  };

  const openSection = (section: DashboardSection) => {
    setActiveSection(section);
    setMobileNavOpen(false);
  };

  const handleRefreshApplications = async () => {
    if (!user || !token || !employer || refreshing) return;
    setRefreshing(true);
    try {
      const jobsResponse = await fetchJobsByEmployer(employer.id, {
        status: 'all',
        page: 0,
        size: 1000,
      });
      const employerJobs = jobsResponse.content || [];
      setMyJobs(employerJobs);
      const applications = await fetchApplicationsForJobs(employerJobs, token);
      setMyApplications(applications);
      toast.success('Applications refreshed');
    } catch (refreshError) {
      console.error('Failed to refresh applications:', refreshError);
      toast.error('Unable to refresh applications');
    } finally {
      setRefreshing(false);
    }
  };

  const handleUpdateStatus = async (
    application: ApplicationResponse,
    newStatus: string,
    interviewDate?: string,
  ) => {
    if (!token) return;
    const status = normalizeApplicationStatus(newStatus);
    if (status === 'interview' && !interviewDate) {
      setInterviewDraft({ application, date: toInterviewDateTimeLocal() });
      return;
    }
    setUpdatingApplicationId(application.id);
    try {
      const updated = await updateApplicationStatus(
        application.id,
        status,
        token,
        undefined,
        interviewDate ? toInterviewDateTimeLocal(interviewDate) : undefined,
      );
      setMyApplications((previous) =>
        previous.map((item) =>
          item.id === application.id
            ? {
                ...item,
                ...updated,
                jobId: item.jobId,
                jobTitle: item.jobTitle,
                status: normalizeApplicationStatus(updated.status || status),
              }
            : item,
        ),
      );
      setInterviewDraft(null);
      toast.success(status === 'interview' ? 'Interview scheduled' : `Application marked ${statusLabel(status).toLowerCase()}`);
    } catch (err: any) {
      toast.error(err?.message || 'Unable to update application status.');
    } finally {
      setUpdatingApplicationId(null);
    }
  };

  if (loading) {
    return (
      <div className="employer-state employer-state--loading">
        <div className="employer-loader" aria-hidden="true" />
        <h2>Loading your dashboard</h2>
        <p>Fetching your jobs, applications and account details.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="employer-state employer-state--error">
        <div className="employer-state__icon employer-state__icon--error">
          <AlertTriangle size={30} />
        </div>
        <h2>Unable to load dashboard</h2>
        <p>{error}</p>
        <button className="dashboard-primary-button" onClick={() => loadDashboardData(true)}>
          Try Again
        </button>
      </div>
    );
  }

  if (!employer) {
    return (
      <div className="employer-state employer-state--loading">
        <div className="employer-loader" aria-hidden="true" />
        <h2>Loading employer profile</h2>
      </div>
    );
  }

  const navItems = [
    {
      label: 'Dashboard',
      icon: LayoutDashboard,
      active: activeSection === 'jobs',
      action: () => openSection('jobs'),
    },
    {
      label: 'Post a Job',
      icon: Plus,
      action: handlePostJob,
    },
    {
      label: 'My Jobs',
      icon: Briefcase,
      badge: myJobs.length,
      action: () => openSection('jobs'),
    },
    {
      label: 'Applications',
      icon: Users,
      badge: totalApplications,
      active: activeSection === 'applications' && applicationFilter === 'all',
      action: () => openApplications('all'),
    },
    {
      label: 'Shortlisted',
      icon: Star,
      badge: shortlistedCount,
      active: activeSection === 'applications' && applicationFilter === 'shortlisted',
      action: () => openApplications('shortlisted'),
    },
    {
      label: 'Interviews',
      icon: Calendar,
      badge: interviewCount,
      active: activeSection === 'applications' && applicationFilter === 'interview',
      action: () => openApplications('interview'),
    },
  ];

  const intelligenceNavItems = [
    {
      label: 'Analytics',
      icon: BarChart3,
      action: () => {
        setMobileNavOpen(false);
        onNavigate('analytics');
      },
    },
  ];

  const managementNavItems = [
    {
      label: 'Company Profile',
      icon: Building2,
      action: () => {
        setMobileNavOpen(false);
        onNavigate('profile');
      },
    },
    {
      label: 'Verification',
      icon: ShieldCheck,
      active: activeSection === 'verification',
      action: () => openSection('verification'),
    },
    {
      label: 'Plans & Billing',
      icon: CreditCard,
      active: activeSection === 'subscription',
      action: () => openSection('subscription'),
    },
    {
      label: 'Notifications',
      icon: Bell,
      badge: unreadNotifications,
      active: activeSection === 'notifications',
      action: () => openSection('notifications'),
    },
  ];

  const renderNavGroup = (items: typeof navItems) =>
    items.map((item) => {
      const Icon = item.icon;
      return (
        <button
          key={item.label}
          className={`employer-nav-item${item.active ? ' employer-nav-item--active' : ''}`}
          onClick={item.action}
          type="button"
        >
          <span className="employer-nav-item__label">
            <Icon size={17} />
            <span>{item.label}</span>
          </span>
          {typeof item.badge === 'number' && item.badge > 0 && (
            <span className="employer-nav-item__badge">{item.badge > 99 ? '99+' : item.badge}</span>
          )}
        </button>
      );
    });

  const sidebarContent = (
    <>
      <div className="employer-sidebar__brand">
        <div className="employer-sidebar__brand-mark">{getInitials(employer.companyName)}</div>
        <div>
          <strong>{employer.companyName || 'Employer'}</strong>
          <span>{employer.companyType || 'Employer'} account</span>
        </div>
      </div>

      <div className="employer-sidebar__scroll">
        <p className="employer-sidebar__section-title">Main</p>
        <nav className="employer-sidebar__nav">{renderNavGroup(navItems)}</nav>

        <p className="employer-sidebar__section-title">Intelligence</p>
        <nav className="employer-sidebar__nav">{renderNavGroup(intelligenceNavItems as typeof navItems)}</nav>

        <p className="employer-sidebar__section-title">Management</p>
        <nav className="employer-sidebar__nav">{renderNavGroup(managementNavItems as typeof navItems)}</nav>
      </div>

      <div className="employer-sidebar__profile">
        <div className="employer-avatar">{getInitials(employer.userName || employer.companyName)}</div>
        <div className="employer-sidebar__profile-copy">
          <strong>{employer.userName || employer.companyName}</strong>
          <span>{employer.userEmail}</span>
        </div>
        <button type="button" className="icon-button" onClick={handleLogout} aria-label="Logout" title="Logout">
          <LogOut size={17} />
        </button>
      </div>
    </>
  );

  const metricCards = [
    {
      label: 'Active Jobs',
      value: activeJobs,
      helper: `${myJobs.length} total job${myJobs.length === 1 ? '' : 's'}`,
      icon: Briefcase,
      tone: 'teal',
    },
    {
      label: 'Total Applications',
      value: totalApplications,
      helper: `${totalViews} total job view${totalViews === 1 ? '' : 's'}`,
      icon: Users,
      tone: 'blue',
    },
    {
      label: 'Shortlisted',
      value: shortlistedCount,
      helper: `${myApplications.length} applications loaded`,
      icon: Star,
      tone: 'purple',
    },
    {
      label: 'Interviews',
      value: interviewCount,
      helper: 'Based on application status',
      icon: Calendar,
      tone: 'indigo',
    },
    {
      label: 'Positions Filled',
      value: filledPositionsCount,
      helper: 'Selected candidates',
      icon: UserCheck,
      tone: 'green',
    },
    {
      label: 'Jobs Closing Soon',
      value: jobsClosingSoon,
      helper: 'Within the next 7 days',
      icon: AlertTriangle,
      tone: jobsClosingSoon > 0 ? 'amber' : 'slate',
    },
  ];

  const jobFilters: Array<{ value: JobFilter; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'active', label: 'Active' },
    { value: 'pending', label: 'Pending' },
    { value: 'draft', label: 'Draft' },
    { value: 'closed', label: 'Closed' },
  ];

  return (
    <div className="employer-dashboard">
      <div className="employer-dashboard__mobile-bar">
        <button
          type="button"
          className="icon-button"
          onClick={() => setMobileNavOpen(true)}
          aria-label="Open employer navigation"
        >
          <Menu size={20} />
        </button>
        <strong>Employer Dashboard</strong>
        <button
          type="button"
          className="icon-button icon-button--notification"
          onClick={() => openSection('notifications')}
          aria-label="Notifications"
        >
          <Bell size={19} />
          {unreadNotifications > 0 && <span>{unreadNotifications > 9 ? '9+' : unreadNotifications}</span>}
        </button>
      </div>

      {mobileNavOpen && (
        <div className="employer-mobile-nav" role="dialog" aria-modal="true" aria-label="Employer navigation">
          <button
            className="employer-mobile-nav__backdrop"
            onClick={() => setMobileNavOpen(false)}
            aria-label="Close employer navigation"
          />
          <aside className="employer-mobile-nav__panel">
            <div className="employer-mobile-nav__close-row">
              <span>Menu</span>
              <button className="icon-button" onClick={() => setMobileNavOpen(false)} aria-label="Close menu">
                <X size={20} />
              </button>
            </div>
            {sidebarContent}
          </aside>
        </div>
      )}

      <div className="employer-dashboard__shell">
        <aside className="employer-sidebar">{sidebarContent}</aside>

        <main className="employer-main">
          <div className="dashboard-page-header">
            <div className="dashboard-page-header__title">
              <button type="button" className="dashboard-back-link" onClick={() => onNavigate('home')}>
                <ArrowLeft size={16} />
                <span>Back</span>
              </button>
              <div>
                <h1>Employer Dashboard</h1>
                <p>Welcome back, {employer.userName || employer.companyName}.</p>
              </div>
            </div>
            <div className="dashboard-page-header__actions">
              <button
                type="button"
                className="icon-button icon-button--notification dashboard-desktop-notification"
                onClick={() => openSection('notifications')}
                aria-label="Notifications"
              >
                <Bell size={19} />
                {unreadNotifications > 0 && <span>{unreadNotifications > 9 ? '9+' : unreadNotifications}</span>}
              </button>
              <button type="button" className="dashboard-outline-button" onClick={handleLogout}>
                <LogOut size={16} />
                Logout
              </button>
            </div>
          </div>

          <section className={`employer-verification-card ${verified ? 'employer-verification-card--verified' : 'employer-verification-card--unverified'}`}>
            <div className="employer-verification-card__content">
              <div className="employer-verification-card__status">
                <ShieldCheck size={18} />
                <span>{verified ? 'Verified Employer' : 'Verification Required'}</span>
              </div>
              <div className="employer-verification-card__identity">
                <strong>{employer.companyName}</strong>
                <span>{employer.companyType}</span>
                {employer.city && <span>{employer.city}{employer.state ? `, ${employer.state}` : ''}</span>}
                <span className="employer-verification-card__email">{employer.userEmail}</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {verified
                  ? 'Candidates can see this account as a verified hospital or clinic. Job posting is unlocked.'
                  : 'Unverified accounts look like cheap listings. Complete business verification before posting, or applicants will treat this as a fraud risk.'}
              </p>
              <div className="employer-verification-card__buttons">
                {!verified && (
                  <button className="dashboard-primary-button dashboard-primary-button--small" type="button" onClick={() => onNavigate('verification')}>
                    Complete Verification
                  </button>
                )}
                <button className="dashboard-outline-button" type="button" onClick={() => onNavigate('profile')}>
                  <Edit size={15} />
                  Company Profile
                </button>
                <button className="dashboard-outline-button" type="button" onClick={() => onNavigate('analytics')}>
                  <BarChart3 size={15} />
                  View Analytics
                </button>
              </div>
            </div>
            <div className="employer-verification-card__plan" onClick={() => onNavigate('subscription')} style={{ cursor: 'pointer' }}>
              <span className={`plan-dot${currentSubscription?.status === 'active' ? ' plan-dot--active' : ''}`} />
              <div>
                <small>Plan</small>
                <strong>{currentSubscription?.status === 'active' ? currentSubscription.plan.name : 'No active subscription'}</strong>
              </div>
              <ChevronRight size={18} />
            </div>
          </section>

          <section className="dashboard-metrics" aria-label="Employer statistics">
            {metricCards.map((metric) => {
              const Icon = metric.icon;
              return (
                <article
                  className={`dashboard-metric dashboard-metric--${metric.tone} dashboard-metric--clickable`}
                  key={metric.label}
                  onClick={() => {
                    if (metric.label === 'Shortlisted') openApplications('shortlisted');
                    else if (metric.label === 'Interviews') openApplications('interview');
                    else if (metric.label === 'Total Applications') openApplications('all');
                    else if (metric.label === 'Positions Filled') openApplications('selected');
                    else openSection('jobs');
                  }}
                >
                  <div className="dashboard-metric__top">
                    <div className="dashboard-metric__icon"><Icon size={20} /></div>
                    <span>{metric.label}</span>
                  </div>
                  <strong>{metric.value}</strong>
                  <small>{metric.helper}</small>
                </article>
              );
            })}
          </section>

          <section className="dashboard-post-cta">
            <button
              className="dashboard-primary-button"
              type="button"
              onClick={handlePostJob}
              disabled={!verified || currentSubscription?.status !== 'active'}
              style={{
                opacity: (!verified || currentSubscription?.status !== 'active') ? 0.6 : 1,
                cursor: (!verified || currentSubscription?.status !== 'active') ? 'not-allowed' : 'pointer',
              }}
            >
              <Plus size={18} />
              {!verified ? 'Verify Account to Post Jobs' : currentSubscription?.status === 'active' ? 'Post a New Job' : 'Choose a Plan to Post Jobs'}
            </button>
            <div className="dashboard-post-cta__hint">
              <CheckCircle size={17} />
              <span>
                {!verified
                  ? 'Verification must be completed before posting'
                  : currentSubscription?.status === 'active'
                  ? `${currentSubscription.jobPostsUsed} of ${currentSubscription.jobPostsAllowed} job posts used`
                  : 'An active subscription is required before posting a job'}
              </span>
            </div>
          </section>

          <div className="dashboard-section-switcher" role="tablist" aria-label="Employer dashboard sections">
            <button className={activeSection === 'jobs' ? 'is-active' : ''} onClick={() => openSection('jobs')} type="button">
              <Briefcase size={16} /> My Jobs
            </button>
            <button className={activeSection === 'applications' ? 'is-active' : ''} onClick={() => openSection('applications')} type="button">
              <Users size={16} /> Applications
              {totalApplications > 0 && <span className="section-count">{totalApplications}</span>}
            </button>
            <button className={activeSection === 'subscription' ? 'is-active' : ''} onClick={() => openSection('subscription')} type="button">
              <Award size={16} /> Plans
            </button>
            <button className={activeSection === 'notifications' ? 'is-active' : ''} onClick={() => openSection('notifications')} type="button">
              <Bell size={16} /> Notifications
              {unreadNotifications > 0 && <span className="section-count">{unreadNotifications}</span>}
            </button>
          </div>

          {activeSection === 'jobs' && (
            <section className="dashboard-panel">
              <div className="dashboard-panel__heading">
                <div>
                  <div className="dashboard-panel__title-row">
                    <Briefcase size={19} />
                    <h2>My Jobs</h2>
                  </div>
                  <p>Manage your current and previous job postings.</p>
                </div>
                <button
                  className="dashboard-primary-button dashboard-primary-button--small"
                  type="button"
                  onClick={handlePostJob}
                  disabled={!verified}
                >
                  <Plus size={16} /> New Job
                </button>
              </div>

              <div className="job-filter-tabs" role="tablist" aria-label="Filter jobs by status">
                {jobFilters.map((filter) => {
                  const count = filter.value === 'all'
                    ? myJobs.length
                    : myJobs.filter((job) => job.status === filter.value).length;
                  return (
                    <button
                      key={filter.value}
                      type="button"
                      className={jobFilter === filter.value ? 'is-active' : ''}
                      onClick={() => setJobFilter(filter.value)}
                    >
                      {filter.label}
                      <span>{count}</span>
                    </button>
                  );
                })}
              </div>

              {filteredJobs.length === 0 ? (
                <div className="dashboard-empty-state">
                  <div className="dashboard-empty-state__icon"><Briefcase size={26} /></div>
                  <h3>No {jobFilter === 'all' ? '' : `${jobFilter} `}jobs found</h3>
                  <p>Your job postings will appear here as soon as they are available.</p>
                  <button className="dashboard-primary-button dashboard-primary-button--small" onClick={handlePostJob} type="button">
                    <Plus size={16} /> Post a Job
                  </button>
                </div>
              ) : (
                <div className="dashboard-job-list">
                  {filteredJobs.map((job) => (
                    <article className="dashboard-job-card" key={job.id}>
                      <div className="dashboard-job-card__main">
                        <div className="dashboard-job-card__title-row">
                          <div>
                            <h3>{job.title}</h3>
                            <div className="dashboard-job-card__meta">
                              {job.location && <span><MapPin size={14} />{job.location}</span>}
                              {job.numberOfPosts != null && <span><Users size={14} />{job.numberOfPosts} post{Number(job.numberOfPosts) === 1 ? '' : 's'}</span>}
                              {job.category && <span><Building2 size={14} />{job.category}</span>}
                            </div>
                          </div>
                          <span className={getJobStatusClass(job.status)}>{job.status || 'N/A'}</span>
                        </div>

                        <div className="dashboard-job-card__details">
                          <span><Calendar size={14} />Posted: {formatDate(job.postedDate || job.createdAt)}</span>
                          <span><Calendar size={14} />Last date: {formatDate(job.lastDate)}</span>
                          <span><Users size={14} />{Number(job.applications) || 0} applications</span>
                          <span><Eye size={14} />{Number(job.views) || 0} views</span>
                        </div>
                      </div>

                      <div className="dashboard-job-card__actions">
                        <button type="button" className="dashboard-job-card__cta" onClick={() => openApplications('all', job.id)} title="View applications for this job">
                          <Users size={16} /> <span>Applications</span>
                        </button>
                        <button type="button" onClick={() => onNavigate('edit-job', job.id)} title="Edit job">
                          <Edit size={16} /> <span>Edit</span>
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

          {activeSection === 'applications' && (
            <section className="dashboard-panel">
              <div className="dashboard-panel__heading">
                <div>
                  <div className="dashboard-panel__title-row">
                    <Users size={19} />
                    <h2>Applications</h2>
                  </div>
                  <p>Each job keeps its own inbox. Cardiologist applications stay on the Cardiologist post.</p>
                </div>
                <button
                  className="dashboard-outline-button"
                  type="button"
                  onClick={handleRefreshApplications}
                  disabled={refreshing}
                >
                  <RefreshCw size={16} className={refreshing ? 'spin-icon' : ''} />
                  {refreshing ? 'Refreshing' : 'Refresh'}
                </button>
              </div>

              <div className="application-summary-grid">
                <article className={applicationFilter === 'all' ? 'is-active' : ''} onClick={() => setApplicationFilter('all')}><Users size={18} /><span>Total</span><strong>{myApplications.length}</strong></article>
                <article className={applicationFilter === 'new' ? 'is-active' : ''} onClick={() => setApplicationFilter('new')}><UserPlus size={18} /><span>New</span><strong>{newApplicationCount}</strong></article>
                <article className={applicationFilter === 'shortlisted' ? 'is-active' : ''} onClick={() => setApplicationFilter('shortlisted')}><Star size={18} /><span>Shortlisted</span><strong>{shortlistedCount}</strong></article>
                <article className={applicationFilter === 'interview' ? 'is-active' : ''} onClick={() => setApplicationFilter('interview')}><Calendar size={18} /><span>Interviews</span><strong>{interviewCount}</strong></article>
              </div>

              <div className="application-job-pills" role="tablist" aria-label="Applications by job">
                <button type="button" className={selectedJobId === 'all' ? 'is-active' : ''} onClick={() => setSelectedJobId('all')}>
                  All jobs <span>{myApplications.length}</span>
                </button>
                {myJobs.map((job) => {
                  const count = myApplications.filter((application) => application.jobId === job.id).length;
                  return (
                    <button
                      key={job.id}
                      type="button"
                      className={selectedJobId === job.id ? 'is-active' : ''}
                      onClick={() => setSelectedJobId(job.id)}
                    >
                      {job.title || 'Untitled job'} <span>{count}</span>
                    </button>
                  );
                })}
              </div>

              {visibleApplicationsByJob.length === 0 ? (
                <div className="dashboard-empty-state">
                  <div className="dashboard-empty-state__icon"><Users size={26} /></div>
                  <h3>No applications in this view</h3>
                  <p>Switch job or status filter, or wait for candidates to apply to that specific post.</p>
                </div>
              ) : (
                <div className="application-job-groups">
                  {visibleApplicationsByJob.map(([jobId, applications]) => {
                    const job = myJobs.find((item) => item.id === jobId);
                    const jobTitle = job?.title || applications[0]?.jobTitle || 'Job';
                    return (
                      <section className="application-job-group" key={jobId}>
                        <div className="application-job-group__header">
                          <div>
                            <h3>{jobTitle}</h3>
                            <p>{applications.length} application{applications.length === 1 ? '' : 's'} for this post only</p>
                          </div>
                          {job?.status && <span className={getJobStatusClass(job.status)}>{job.status}</span>}
                        </div>

                        {applications.length === 0 ? (
                          <div className="dashboard-empty-state dashboard-empty-state--compact">
                            <h3>No applications for this job yet</h3>
                          </div>
                        ) : (
                        <div className="candidate-grid">
                          {applications.map((application) => {
                            const status = normalizeApplicationStatus(application.status);
                            const busy = updatingApplicationId === application.id;
                            return (
                            <article className="candidate-card" key={application.id}>
                              <div className="candidate-card__top">
                                <div className="candidate-avatar">{getInitials(application.candidateName)}</div>
                                <div className="candidate-card__identity">
                                  <h4>{application.candidateName || 'Candidate'}</h4>
                                  <span className={getApplicationStatusClass(status)}>{statusLabel(status)}</span>
                                </div>
                              </div>

                              <div className="candidate-card__profile">
                                <strong>{application.candidateSpeciality || 'Speciality not added'}</strong>
                                <span>
                                  {[application.candidateQualification, application.candidateYearsExperience != null ? `${application.candidateYearsExperience} yrs` : null]
                                    .filter(Boolean)
                                    .join(' · ') || 'Qualification not added'}
                                </span>
                                {(application.candidateRegistrationNumber || application.candidateCity || application.candidateState) && (
                                  <span>
                                    {[application.candidateRegistrationNumber, [application.candidateCity, application.candidateState].filter(Boolean).join(', ')]
                                      .filter(Boolean)
                                      .join(' · ')}
                                  </span>
                                )}
                              </div>

                              <div className="candidate-card__contact">
                                <a href={`mailto:${application.candidateEmail}`}><Mail size={14} />{application.candidateEmail}</a>
                                {application.candidatePhone && <a href={`tel:${application.candidatePhone}`}><Phone size={14} />{application.candidatePhone}</a>}
                                <span><Calendar size={14} />Applied {formatDate(application.appliedDate)}</span>
                                {application.interviewDate && <span><Calendar size={14} />Interview {formatDate(application.interviewDate)}</span>}
                              </div>

                              {application.notes && <p className="candidate-card__notes">{application.notes}</p>}

                              <div className="candidate-card__actions">
                                {application.resumeUrl ? (
                                  <button type="button" className="candidate-action candidate-action--resume" onClick={() => openFileInViewer(application.resumeUrl!)}>
                                    <FileText size={15} /> Resume
                                  </button>
                                ) : (
                                  <span className="candidate-card__no-resume">No resume</span>
                                )}
                                <button type="button" className={`candidate-action candidate-action--shortlist${status === 'shortlisted' ? ' is-current' : ''}`} disabled={busy} onClick={() => handleUpdateStatus(application, 'shortlisted')}>
                                  <Star size={14} /> Shortlist
                                </button>
                                <button type="button" className={`candidate-action candidate-action--interview${status === 'interview' ? ' is-current' : ''}`} disabled={busy} onClick={() => handleUpdateStatus(application, 'interview')}>
                                  <Calendar size={14} /> Interview
                                </button>
                                <button type="button" className={`candidate-action candidate-action--select${status === 'selected' ? ' is-current' : ''}`} disabled={busy} onClick={() => handleUpdateStatus(application, 'selected')}>
                                  <CheckCircle size={14} /> Select
                                </button>
                                <button type="button" className={`candidate-action candidate-action--reject${status === 'rejected' ? ' is-current' : ''}`} disabled={busy} onClick={() => handleUpdateStatus(application, 'rejected')}>
                                  <X size={14} /> Reject
                                </button>
                              </div>
                            </article>
                            );
                          })}
                        </div>
                        )}
                      </section>
                    );
                  })}
                </div>
              )}

              <div className="dashboard-panel__footer-action">
                <button className="dashboard-outline-button" type="button" onClick={() => onNavigate('employer-manage-applications')}>
                  Open Application Management <ChevronRight size={16} />
                </button>
              </div>
            </section>
          )}

          {activeSection === 'subscription' && (
            <section className="dashboard-panel dashboard-panel--centered">
              <div className="dashboard-feature-icon dashboard-feature-icon--purple"><Award size={28} /></div>
              {currentSubscription?.status === 'active' ? (
                <>
                  <h2>{currentSubscription.plan.name}</h2>
                  <p>Your subscription is active. Job-posting usage is shown below.</p>
                  <div className="subscription-usage">
                    <span>Job posts used</span>
                    <strong>{currentSubscription.jobPostsUsed} / {currentSubscription.jobPostsAllowed}</strong>
                  </div>
                  {currentSubscription.endDate && <small>Valid until {formatDate(currentSubscription.endDate)}</small>}
                </>
              ) : (
                <>
                  <h2>Choose a subscription plan</h2>
                  <p>An active plan is required to post jobs and use employer posting features.</p>
                </>
              )}
              <button className="dashboard-primary-button" type="button" onClick={() => onNavigate('subscription')}>
                View Plans
              </button>
            </section>
          )}

          {activeSection === 'notifications' && (
            <section className="dashboard-panel">
              <div className="dashboard-panel__heading">
                <div>
                  <div className="dashboard-panel__title-row"><Bell size={19} /><h2>Notifications</h2></div>
                  <p>Your latest employer account activity.</p>
                </div>
                <button className="dashboard-outline-button" type="button" onClick={() => onNavigate('notifications')}>View All</button>
              </div>

              {notifications.length === 0 ? (
                <div className="dashboard-empty-state">
                  <div className="dashboard-empty-state__icon"><Bell size={26} /></div>
                  <h3>No notifications</h3>
                  <p>New account and job activity will appear here.</p>
                </div>
              ) : (
                <div className="notification-list">
                  {notifications.slice(0, 8).map((notification: any) => (
                    <article className={`notification-item${notification.read ? '' : ' notification-item--unread'}`} key={notification.id}>
                      <div className="notification-item__dot" />
                      <div>
                        <p>{notification.message}</p>
                        <span>{formatDate(notification.createdAt)}</span>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

          {activeSection === 'verification' && (
            <section className="dashboard-panel dashboard-panel--centered">
              <div className={`dashboard-feature-icon ${verified ? 'dashboard-feature-icon--green' : 'dashboard-feature-icon--amber'}`}><ShieldCheck size={28} /></div>
              <h2>{verified ? 'Verified employer account' : 'Verification is required'}</h2>
              <p>
                Status: <strong>{employer.verificationStatus}</strong>.
                {verified
                  ? ' Candidates and admins can treat this hospital or clinic as a checked employer.'
                  : ' Anyone can post a ₹100 listing. Upload registration documents so candidates can see this is a real institution, not a fake recruiter.'}
              </p>
              {employer.verifiedAt && <small>Verified on {formatDate(employer.verifiedAt)}</small>}
              <button className="dashboard-primary-button" type="button" onClick={() => onNavigate('verification')}>
                {verified ? 'View Verification' : 'Start Verification'}
              </button>
            </section>
          )}
        </main>
      </div>

      {interviewDraft && (
        <div className="employer-modal" role="dialog" aria-modal="true" aria-label="Schedule interview">
          <button className="employer-modal__backdrop" type="button" onClick={() => setInterviewDraft(null)} aria-label="Close interview scheduler" />
          <div className="employer-modal__card">
            <h3>Schedule interview</h3>
            <p>
              {interviewDraft.application.candidateName} · {interviewDraft.application.jobTitle || 'this job'}
            </p>
            <label>
              <span>Interview date and time</span>
              <input
                type="datetime-local"
                value={interviewDraft.date}
                onChange={(event) => setInterviewDraft({ ...interviewDraft, date: event.target.value })}
              />
            </label>
            <div className="employer-modal__actions">
              <button type="button" className="dashboard-outline-button" onClick={() => setInterviewDraft(null)}>Cancel</button>
              <button
                type="button"
                className="dashboard-primary-button"
                disabled={!interviewDraft.date || updatingApplicationId === interviewDraft.application.id}
                onClick={() => handleUpdateStatus(interviewDraft.application, 'interview', interviewDraft.date)}
              >
                Confirm interview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
