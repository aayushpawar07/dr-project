// AI assisted development
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  Briefcase,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  CreditCard,
  Eye,
  FileText,
  Flag,
  LayoutDashboard,
  LogOut,
  Menu,
  Newspaper,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  UserRound,
  Users,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { fetchAdminJobs } from '../api/jobs';
import {
  approveEmployer,
  fetchEmployers,
  rejectEmployer,
  type EmployerResponse,
} from '../api/employers';
import {
  fetchApplications,
  type ApplicationResponse,
} from '../api/applications';
import {
  fetchFraudReports,
  getFraudReportStats,
  updateReportStatus,
  type FraudReportResponse,
  type FraudReportStats,
} from '../api/fraudReports';
import {
  fetchAnalyticsOverview,
  fetchRecentActivity,
  fetchVisitorStats,
} from '../api/analytics';
import {
  fetchNotifications,
  getUnreadCount,
} from '../api/notifications';
import { toast } from 'sonner';
import '../styles/admin-dashboard.css';

interface AdminDashboardProps {
  onNavigate: (page: string, entityId?: string) => void;
}

interface AnalyticsOverview {
  totalJobs?: number;
  totalApplications?: number;
  totalUsers?: number;
  totalEmployers?: number;
  totalViews?: number;
  conversionRate?: number;
  avgResponseDays?: number;
  jobsGrowth?: number;
  appsGrowth?: number;
  usersGrowth?: number;
  employersGrowth?: number;
  totalVisitors?: number;
  todayVisitors?: number;
}

interface AdminJob {
  id: string;
  title?: string;
  organization?: string;
  companyName?: string;
  category?: string;
  sector?: string;
  location?: string;
  status?: string;
  applications?: number;
  views?: number;
  createdAt?: string;
  postedDate?: string;
}

interface ActivityItem {
  type?: string;
  action?: string;
  user?: string;
  time?: string;
}

interface NotificationItem {
  id: string;
  message?: string;
  read?: boolean;
  createdAt?: string;
}

interface DashboardState {
  jobs: AdminJob[];
  totalJobsFromAdmin: number;
  applications: ApplicationResponse[];
  totalApplicationsFromApi: number;
  pendingEmployers: EmployerResponse[];
  pendingEmployerCount: number;
  approvedEmployerCount: number;
  totalEmployerCount: number;
  reports: FraudReportResponse[];
  reportStats: FraudReportStats | null;
  overview: AnalyticsOverview | null;
  activity: ActivityItem[];
  notifications: NotificationItem[];
  unreadCount: number;
  visitors: { totalVisitors: number; todayVisitors: number };
}

const EMPTY_DASHBOARD: DashboardState = {
  jobs: [],
  totalJobsFromAdmin: 0,
  applications: [],
  totalApplicationsFromApi: 0,
  pendingEmployers: [],
  pendingEmployerCount: 0,
  approvedEmployerCount: 0,
  totalEmployerCount: 0,
  reports: [],
  reportStats: null,
  overview: null,
  activity: [],
  notifications: [],
  unreadCount: 0,
  visitors: { totalVisitors: 0, todayVisitors: 0 },
};

function contentOf<T>(response: any): T[] {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.content)) return response.content;
  return [];
}

function totalOf(response: any, fallback = 0): number {
  const parsed = Number(response?.totalElements);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatNumber(value: number | undefined | null) {
  return Number(value || 0).toLocaleString('en-IN');
}

function formatDateTime(value?: string) {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function normalizeStatus(status?: string) {
  return (status || 'unknown').toLowerCase().replace(/\s+/g, '_');
}

function companyTypeLabel(type?: string) {
  if (!type) return 'Employer';
  return type
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function AdminDashboard({ onNavigate }: AdminDashboardProps) {
  const { token, user, logout } = useAuth();
  const [data, setData] = useState<DashboardState>(EMPTY_DASHBOARD);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [employerActionId, setEmployerActionId] = useState<string | null>(null);
  const [reportActionId, setReportActionId] = useState<string | null>(null);

  const loadDashboard = useCallback(async (silent = false) => {
    if (!token) return;

    if (silent) setRefreshing(true);
    else setLoading(true);
    setError(null);

    const settled = await Promise.allSettled([
      fetchAnalyticsOverview(),
      fetchVisitorStats(),
      fetchRecentActivity(),
      fetchAdminJobs({ size: 1000, sort: 'createdAt,desc' }),
      fetchApplications({ size: 1000, sort: 'appliedDate,desc' }, token),
      fetchEmployers({ page: 0, size: 5, verificationStatus: 'pending' }, token),
      fetchEmployers({ page: 0, size: 1, verificationStatus: 'approved' }, token),
      fetchEmployers({ page: 0, size: 1 }, token),
      fetchFraudReports({ page: 0, size: 8 }, token),
      getFraudReportStats(token),
      fetchNotifications({ page: 0, size: 8 }, token),
      getUnreadCount(token),
    ]);

    const rejected = settled.filter((result) => result.status === 'rejected');
    if (rejected.length === settled.length) {
      setError('Unable to load admin dashboard data. Please verify the backend connection and try again.');
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const valueAt = (index: number) =>
      settled[index].status === 'fulfilled' ? (settled[index] as PromiseFulfilledResult<any>).value : null;

    const overview = (valueAt(0) || null) as AnalyticsOverview | null;
    const visitorsResult = valueAt(1);
    const activityResult = valueAt(2);
    const jobsResult = valueAt(3);
    const applicationsResult = valueAt(4);
    const pendingEmployersResult = valueAt(5);
    const approvedEmployersResult = valueAt(6);
    const allEmployersResult = valueAt(7);
    const reportsResult = valueAt(8);
    const reportStatsResult = valueAt(9);
    const notificationsResult = valueAt(10);
    const unreadResult = valueAt(11);

    setData({
      jobs: contentOf<AdminJob>(jobsResult),
      totalJobsFromAdmin: totalOf(jobsResult, contentOf<AdminJob>(jobsResult).length),
      applications: contentOf<ApplicationResponse>(applicationsResult),
      totalApplicationsFromApi: totalOf(
        applicationsResult,
        contentOf<ApplicationResponse>(applicationsResult).length,
      ),
      pendingEmployers: contentOf<EmployerResponse>(pendingEmployersResult),
      pendingEmployerCount: totalOf(
        pendingEmployersResult,
        contentOf<EmployerResponse>(pendingEmployersResult).length,
      ),
      approvedEmployerCount: totalOf(approvedEmployersResult),
      totalEmployerCount: totalOf(allEmployersResult),
      reports: contentOf<FraudReportResponse>(reportsResult),
      reportStats: reportStatsResult || null,
      overview,
      activity: Array.isArray(activityResult) ? activityResult : [],
      notifications: contentOf<NotificationItem>(notificationsResult),
      unreadCount: Number(unreadResult || 0),
      visitors:
        overview?.totalVisitors !== undefined
          ? {
              totalVisitors: Number(overview.totalVisitors || 0),
              todayVisitors: Number(overview.todayVisitors || 0),
            }
          : {
              totalVisitors: Number(visitorsResult?.totalVisitors || 0),
              todayVisitors: Number(visitorsResult?.todayVisitors || 0),
            },
    });

    if (rejected.length > 0) {
      setError(`${rejected.length} dashboard data source${rejected.length > 1 ? 's are' : ' is'} temporarily unavailable. Available sections are still shown.`);
    }

    setLoading(false);
    setRefreshing(false);
  }, [token]);

  useEffect(() => {
    loadDashboard(false);
  }, [loadDashboard]);

  useEffect(() => {
    if (!token) return;
    const interval = window.setInterval(() => loadDashboard(true), 30000);
    return () => window.clearInterval(interval);
  }, [token, loadDashboard]);

  const jobStatusCounts = useMemo(() => {
    return data.jobs.reduce<Record<string, number>>((acc, job) => {
      const key = normalizeStatus(job.status);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }, [data.jobs]);

  const applicationStatusCounts = useMemo(() => {
    return data.applications.reduce<Record<string, number>>((acc, application) => {
      const key = normalizeStatus(application.status);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }, [data.applications]);

  const unresolvedReports = useMemo(() => {
    if (data.reportStats) {
      return Number(data.reportStats.pending || 0) + Number(data.reportStats.underReview || 0);
    }
    return data.reports.filter((report) => !['resolved', 'dismissed'].includes(normalizeStatus(report.status))).length;
  }, [data.reportStats, data.reports]);

  const totalJobs = Number(data.overview?.totalJobs ?? data.totalJobsFromAdmin ?? data.jobs.length);
  const totalApplications = Number(
    data.overview?.totalApplications ?? data.totalApplicationsFromApi ?? data.applications.length,
  );
  const totalEmployers = Number(data.overview?.totalEmployers ?? data.totalEmployerCount);
  const totalUsers = Number(data.overview?.totalUsers || 0);
  const activeJobs = jobStatusCounts.active || 0;
  const pendingJobs = jobStatusCounts.pending || 0;
  const shortlistedApplications = applicationStatusCounts.shortlisted || 0;
  const interviews = applicationStatusCounts.interview || 0;
  const selectedApplications =
    (applicationStatusCounts.selected || 0) + (applicationStatusCounts.hired || 0);

  const stats = [
    {
      label: 'Total Users',
      value: totalUsers,
      icon: Users,
      trend: data.overview?.usersGrowth,
      action: () => onNavigate('admin-users'),
      subtext: 'Platform accounts',
    },
    {
      label: 'Employers',
      value: totalEmployers,
      icon: Building2,
      trend: data.overview?.employersGrowth,
      action: () => onNavigate('admin-employer-verification'),
      subtext: 'Registered employers',
    },
    {
      label: 'Verified Employers',
      value: data.approvedEmployerCount,
      icon: ShieldCheck,
      tone: 'success',
      action: () => onNavigate('admin-employer-verification'),
      subtext: 'Approved verification',
    },
    {
      label: 'Pending Verification',
      value: data.pendingEmployerCount,
      icon: ClipboardCheck,
      tone: 'warning',
      action: () => onNavigate('admin-employer-verification'),
      subtext: 'Needs review',
    },
    {
      label: 'Total Jobs',
      value: totalJobs,
      icon: Briefcase,
      trend: data.overview?.jobsGrowth,
      action: () => onNavigate('admin-jobs'),
      subtext: 'All job records',
    },
    {
      label: 'Active Jobs',
      value: activeJobs,
      icon: CheckCircle2,
      tone: 'success',
      action: () => onNavigate('admin-jobs'),
      subtext: 'Currently published',
    },
    {
      label: 'Pending Jobs',
      value: pendingJobs,
      icon: AlertTriangle,
      tone: 'warning',
      action: () => onNavigate('admin-jobs'),
      subtext: 'Awaiting review',
    },
    {
      label: 'Applications',
      value: totalApplications,
      icon: FileText,
      trend: data.overview?.appsGrowth,
      action: () => onNavigate('admin-applications'),
      subtext: 'Total submissions',
    },
    {
      label: 'Shortlisted',
      value: shortlistedApplications,
      icon: UserRound,
      tone: 'purple',
      action: () => onNavigate('admin-applications'),
      subtext: 'Candidate pipeline',
    },
    {
      label: 'Interviews',
      value: interviews,
      icon: CalendarDays,
      tone: 'purple',
      action: () => onNavigate('admin-applications'),
      subtext: 'Interview stage',
    },
    {
      label: 'Selected / Hired',
      value: selectedApplications,
      icon: CheckCircle2,
      tone: 'success',
      action: () => onNavigate('admin-applications'),
      subtext: 'Completed selections',
    },
    {
      label: 'Open Reports',
      value: unresolvedReports,
      icon: Flag,
      tone: 'danger',
      subtext: 'Pending investigation',
    },
    {
      label: 'Unread Alerts',
      value: data.unreadCount,
      icon: Bell,
      tone: data.unreadCount > 0 ? 'danger' : undefined,
      action: () => onNavigate('notifications'),
      subtext: 'Admin notifications',
    },
    {
      label: 'Total Visitors',
      value: data.visitors.totalVisitors,
      icon: Eye,
      action: () => onNavigate('analytics'),
      subtext: 'Unique visitors',
    },
    {
      label: "Today's Visitors",
      value: data.visitors.todayVisitors,
      icon: Activity,
      action: () => onNavigate('analytics'),
      subtext: 'Unique today',
    },
  ];

  const navGroups = [
    {
      label: 'Main',
      items: [
        { label: 'Dashboard', icon: LayoutDashboard, action: () => undefined, active: true },
        { label: 'Analytics', icon: BarChart3, action: () => onNavigate('analytics') },
      ],
    },
    {
      label: 'Jobs',
      items: [
        { label: 'All Jobs', icon: Briefcase, action: () => onNavigate('admin-jobs'), badge: totalJobs },
        { label: 'Pending Review', icon: ClipboardCheck, action: () => onNavigate('admin-jobs'), badge: pendingJobs, badgeTone: 'warning' },
        { label: 'AI Bulk Uploader', icon: Sparkles, action: () => onNavigate('admin-ai-bulk-upload') },
      ],
    },
    {
      label: 'People',
      items: [
        { label: 'Employer Verification', icon: ShieldCheck, action: () => onNavigate('admin-employer-verification'), badge: data.pendingEmployerCount, badgeTone: 'warning' },
        { label: 'Applications', icon: FileText, action: () => onNavigate('admin-applications'), badge: totalApplications },
        { label: 'Admin Staff', icon: Users, action: () => onNavigate('admin-users') },
      ],
    },
    {
      label: 'Management',
      items: [
        { label: 'News', icon: Newspaper, action: () => onNavigate('admin-news') },
        { label: 'Pricing', icon: CreditCard, action: () => onNavigate('admin-pricing') },
        { label: 'Notifications', icon: Bell, action: () => onNavigate('notifications'), badge: data.unreadCount },
        { label: 'Settings', icon: Settings, action: () => onNavigate('profile') },
      ],
    },
  ];

  const filteredJobs = useMemo(() => {
    const query = globalSearch.trim().toLowerCase();
    if (!query) return data.jobs.slice(0, 6);
    return data.jobs
      .filter((job) =>
        [job.title, job.organization, job.companyName, job.category, job.location, job.status]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query)),
      )
      .slice(0, 6);
  }, [data.jobs, globalSearch]);

  const filteredPendingEmployers = useMemo(() => {
    const query = globalSearch.trim().toLowerCase();
    if (!query) return data.pendingEmployers.slice(0, 4);
    return data.pendingEmployers
      .filter((employer) =>
        [employer.companyName, employer.userEmail, employer.city, employer.state, employer.companyType]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query)),
      )
      .slice(0, 4);
  }, [data.pendingEmployers, globalSearch]);

  const filteredReports = useMemo(() => {
    const query = globalSearch.trim().toLowerCase();
    if (!query) return data.reports.slice(0, 5);
    return data.reports
      .filter((report) =>
        [report.reason, report.type, report.reporterName, report.status, report.priority]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query)),
      )
      .slice(0, 5);
  }, [data.reports, globalSearch]);

  const handleEmployerDecision = async (employer: EmployerResponse, decision: 'approve' | 'reject') => {
    if (!token || employerActionId) return;
    const confirmation = window.confirm(
      `${decision === 'approve' ? 'Approve' : 'Reject'} verification for ${employer.companyName}?`,
    );
    if (!confirmation) return;

    setEmployerActionId(employer.id);
    try {
      if (decision === 'approve') await approveEmployer(employer.id, token);
      else await rejectEmployer(employer.id, token);
      toast.success(`${employer.companyName} ${decision === 'approve' ? 'approved' : 'rejected'} successfully.`);
      await loadDashboard(true);
    } catch (actionError: any) {
      toast.error(actionError?.message || `Unable to ${decision} employer.`);
    } finally {
      setEmployerActionId(null);
    }
  };

  const handleResolveReport = async (report: FraudReportResponse) => {
    if (!token || reportActionId) return;
    if (!window.confirm(`Mark report ${report.id} as resolved?`)) return;

    setReportActionId(report.id);
    try {
      await updateReportStatus(report.id, 'resolved', token);
      toast.success('Report marked as resolved.');
      await loadDashboard(true);
    } catch (actionError: any) {
      toast.error(actionError?.message || 'Unable to resolve report.');
    } finally {
      setReportActionId(null);
    }
  };

  const handleLogout = () => {
    logout();
    onNavigate('logout');
  };

  const closeSidebarAnd = (action: () => void) => {
    setSidebarOpen(false);
    action();
  };

  const activityIconFor = (type?: string) => {
    const normalized = normalizeStatus(type);
    if (normalized === 'job') return Briefcase;
    if (normalized === 'application') return FileText;
    if (normalized === 'user') return UserRound;
    return Activity;
  };

  if (loading) {
    return (
      <div className="admin-ui-shell" style={{ display: 'block' }}>
        <div className="admin-ui-loading">
          <div className="admin-ui-loading-card">
            <RefreshCw />
            <span>Loading live admin dashboard data...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-ui-shell">
      <div
        className={`admin-ui-overlay ${sidebarOpen ? 'is-open' : ''}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      <aside className={`admin-ui-sidebar ${sidebarOpen ? 'is-open' : ''}`}>
        <div className="admin-ui-brand">
          <div className="admin-ui-brand-mark">M</div>
          <div className="admin-ui-brand-copy">
            <div className="admin-ui-brand-name">MedExJob</div>
            <div className="admin-ui-brand-role">Super Admin</div>
          </div>
        </div>

        <nav className="admin-ui-nav" aria-label="Admin navigation">
          {navGroups.map((group) => (
            <div key={group.label}>
              <div className="admin-ui-nav-label">{group.label}</div>
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.label}
                    type="button"
                    className={`admin-ui-nav-button ${item.active ? 'is-active' : ''}`}
                    onClick={() => closeSidebarAnd(item.action)}
                  >
                    <Icon />
                    <span>{item.label}</span>
                    {typeof item.badge === 'number' && item.badge > 0 && (
                      <span className={`admin-ui-nav-badge ${item.badgeTone || ''}`}>
                        {item.badge > 999 ? '999+' : item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="admin-ui-sidebar-footer">
          <div className="admin-ui-user-card">
            <div className="admin-ui-user-avatar">
              {(user?.name || 'Admin')
                .split(' ')
                .filter(Boolean)
                .slice(0, 2)
                .map((part) => part[0]?.toUpperCase())
                .join('') || 'A'}
            </div>
            <div className="admin-ui-user-copy">
              <div className="admin-ui-user-name">{user?.name || 'Administrator'}</div>
              <div className="admin-ui-user-email">{user?.email || 'Admin account'}</div>
            </div>
            <button type="button" className="admin-ui-logout" onClick={handleLogout} title="Logout">
              <LogOut />
            </button>
          </div>
        </div>
      </aside>

      <main className="admin-ui-main">
        <header className="admin-ui-topbar">
          <div className="admin-ui-topbar-left">
            <button
              type="button"
              className="admin-ui-mobile-menu"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open admin navigation"
            >
              <Menu />
            </button>
            <div className="admin-ui-heading">
              <h1>Dashboard</h1>
              <p>Live platform overview and moderation workspace</p>
            </div>
          </div>

          <div className="admin-ui-topbar-right">
            <label className="admin-ui-search">
              <Search />
              <input
                type="search"
                value={globalSearch}
                onChange={(event) => setGlobalSearch(event.target.value)}
                placeholder="Search dashboard..."
                aria-label="Search dashboard data"
              />
            </label>
            <button
              type="button"
              className={`admin-ui-icon-button ${refreshing ? 'is-refreshing' : ''}`}
              onClick={() => loadDashboard(true)}
              disabled={refreshing}
              title="Refresh dashboard"
              aria-label="Refresh dashboard"
            >
              <RefreshCw />
            </button>
            <button
              type="button"
              className="admin-ui-icon-button"
              onClick={() => onNavigate('notifications')}
              title="Notifications"
              aria-label="Notifications"
            >
              <Bell />
              {data.unreadCount > 0 && (
                <span className="admin-ui-notification-dot">
                  {data.unreadCount > 99 ? '99+' : data.unreadCount}
                </span>
              )}
            </button>
          </div>
        </header>

        <div className="admin-ui-content">
          {error && (
            <div className="admin-ui-alert" role="status">
              <span>{error}</span>
              <button type="button" onClick={() => loadDashboard(true)}>Retry</button>
            </div>
          )}

          <div className="admin-ui-quick-actions">
            <button type="button" className="admin-ui-quick-button primary" onClick={() => onNavigate('admin-post-job')}>
              <Plus /> Add Job
            </button>
            <button type="button" className="admin-ui-quick-button" onClick={() => onNavigate('admin-jobs')}>
              <ClipboardCheck /> Review Jobs
            </button>
            <button type="button" className="admin-ui-quick-button success" onClick={() => onNavigate('admin-employer-verification')}>
              <ShieldCheck /> Verify Employers
            </button>
            <button type="button" className="admin-ui-quick-button" onClick={() => onNavigate('admin-applications')}>
              <FileText /> Applications
            </button>
            <button type="button" className="admin-ui-quick-button" onClick={() => onNavigate('admin-ai-bulk-upload')}>
              <Sparkles /> AI Bulk Upload
            </button>
            <button type="button" className="admin-ui-quick-button" onClick={() => onNavigate('analytics')}>
              <BarChart3 /> Analytics
            </button>
            <button type="button" className="admin-ui-quick-button" onClick={() => onNavigate('admin-users')}>
              <Users /> Admin Staff
            </button>
            <button type="button" className="admin-ui-quick-button" onClick={() => onNavigate('admin-pricing')}>
              <CreditCard /> Pricing
            </button>
          </div>

          <section aria-label="Platform statistics" className="admin-ui-stats-grid">
            {stats.map((stat) => {
              const Icon = stat.icon;
              const hasTrend = typeof stat.trend === 'number';
              return (
                <article
                  key={stat.label}
                  className={`admin-ui-stat-card ${stat.action ? 'is-clickable' : ''}`}
                  onClick={stat.action}
                  role={stat.action ? 'button' : undefined}
                  tabIndex={stat.action ? 0 : undefined}
                  onKeyDown={(event) => {
                    if (stat.action && (event.key === 'Enter' || event.key === ' ')) stat.action();
                  }}
                >
                  <div className="admin-ui-stat-top">
                    <span className={`admin-ui-stat-icon ${stat.tone || ''}`}><Icon /></span>
                    {hasTrend && (
                      <span className={`admin-ui-stat-trend ${(stat.trend || 0) < 0 ? 'down' : ''}`}>
                        {(stat.trend || 0) < 0 ? <TrendingDown /> : <TrendingUp />}
                        {(stat.trend || 0) > 0 ? '+' : ''}{stat.trend}%
                      </span>
                    )}
                  </div>
                  <div className="admin-ui-stat-value">{formatNumber(stat.value)}</div>
                  <div className="admin-ui-stat-label">{stat.label}</div>
                  <div className="admin-ui-stat-subtext">{stat.subtext}</div>
                </article>
              );
            })}
          </section>

          <section className="admin-ui-section">
            <div className="admin-ui-two-column">
              <div>
                <div className="admin-ui-section-header">
                  <div className="admin-ui-section-title-wrap">
                    <h2 className="admin-ui-section-title"><Activity /> Live Activity</h2>
                    <p className="admin-ui-section-subtitle">Backend analytics activity feed</p>
                  </div>
                  <button type="button" className="admin-ui-section-link" onClick={() => onNavigate('analytics')}>
                    Full analytics <ChevronRight />
                  </button>
                </div>
                <div className="admin-ui-panel">
                  <div className="admin-ui-panel-inner admin-ui-feed">
                    {data.activity.length > 0 ? data.activity.slice(0, 10).map((item, index) => {
                      const Icon = activityIconFor(item.type);
                      const tone = ['job', 'application', 'user'].includes(normalizeStatus(item.type))
                        ? normalizeStatus(item.type)
                        : 'other';
                      return (
                        <div className="admin-ui-feed-item" key={`${item.action || 'activity'}-${index}`}>
                          <div className={`admin-ui-feed-icon ${tone}`}><Icon /></div>
                          <div className="admin-ui-feed-copy">
                            <div className="admin-ui-feed-action">{item.action || 'Platform activity'}</div>
                            <div className="admin-ui-feed-user">{item.user || 'System'}</div>
                          </div>
                          <div className="admin-ui-feed-time">{item.time || ''}</div>
                        </div>
                      );
                    }) : (
                      <div className="admin-ui-empty">No recent activity returned by the analytics service.</div>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <div className="admin-ui-section-header">
                  <div className="admin-ui-section-title-wrap">
                    <h2 className="admin-ui-section-title"><Bell /> Recent Notifications</h2>
                    <p className="admin-ui-section-subtitle">{formatNumber(data.unreadCount)} unread</p>
                  </div>
                  <button type="button" className="admin-ui-section-link" onClick={() => onNavigate('notifications')}>
                    View all <ChevronRight />
                  </button>
                </div>
                <div className="admin-ui-panel">
                  <div className="admin-ui-panel-inner admin-ui-notification-list">
                    {data.notifications.length > 0 ? data.notifications.slice(0, 8).map((notification) => (
                      <div
                        key={notification.id}
                        className={`admin-ui-notification-item ${notification.read ? '' : 'unread'}`}
                      >
                        <div className="admin-ui-notification-message">
                          {notification.message || 'Notification'}
                        </div>
                        <div className="admin-ui-notification-time">
                          {formatDateTime(notification.createdAt)}
                        </div>
                      </div>
                    )) : (
                      <div className="admin-ui-empty">No admin notifications available.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="admin-ui-section">
            <div className="admin-ui-section-header">
              <div className="admin-ui-section-title-wrap">
                <h2 className="admin-ui-section-title"><ShieldCheck /> Verification Center</h2>
                <p className="admin-ui-section-subtitle">Real employer verification requests awaiting an admin decision</p>
              </div>
              <button type="button" className="admin-ui-section-link" onClick={() => onNavigate('admin-employer-verification')}>
                Manage verification <ChevronRight />
              </button>
            </div>

            {filteredPendingEmployers.length > 0 ? (
              <div className="admin-ui-verification-list">
                {filteredPendingEmployers.map((employer) => (
                  <article className="admin-ui-verify-card" key={employer.id}>
                    <div className="admin-ui-verify-main">
                      <div className="admin-ui-company-avatar"><Building2 /></div>
                      <div className="admin-ui-company-copy">
                        <div className="admin-ui-company-name">{employer.companyName}</div>
                        <div className="admin-ui-company-meta">
                          <span>{companyTypeLabel(employer.companyType)}</span>
                          {employer.city && <span>{employer.city}{employer.state ? `, ${employer.state}` : ''}</span>}
                          {employer.userEmail && <span>{employer.userEmail}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="admin-ui-verify-actions">
                      <span className={`admin-ui-status ${normalizeStatus(employer.verificationStatus)}`}>
                        {employer.verificationStatus}
                      </span>
                      <button
                        type="button"
                        className="admin-ui-mini-button"
                        onClick={() => onNavigate('employer-management', employer.id)}
                      >
                        <Eye /> View
                      </button>
                      <button
                        type="button"
                        className="admin-ui-mini-button approve"
                        disabled={employerActionId === employer.id}
                        onClick={() => handleEmployerDecision(employer, 'approve')}
                      >
                        <CheckCircle2 /> Approve
                      </button>
                      <button
                        type="button"
                        className="admin-ui-mini-button reject"
                        disabled={employerActionId === employer.id}
                        onClick={() => handleEmployerDecision(employer, 'reject')}
                      >
                        <XCircle /> Reject
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="admin-ui-panel"><div className="admin-ui-empty">No matching pending employer verification requests.</div></div>
            )}
          </section>

          <section className="admin-ui-section">
            <div className="admin-ui-section-header">
              <div className="admin-ui-section-title-wrap">
                <h2 className="admin-ui-section-title"><Briefcase /> Recent Jobs</h2>
                <p className="admin-ui-section-subtitle">Latest admin-visible jobs from the existing job API</p>
              </div>
              <button type="button" className="admin-ui-section-link" onClick={() => onNavigate('admin-jobs')}>
                Manage jobs <ChevronRight />
              </button>
            </div>

            <div className="admin-ui-table-panel">
              <div className="admin-ui-table-scroll">
                <table className="admin-ui-table">
                  <thead>
                    <tr>
                      <th>Job</th>
                      <th>Employer</th>
                      <th>Category</th>
                      <th>Applications</th>
                      <th>Views</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredJobs.length > 0 ? filteredJobs.map((job) => (
                      <tr key={job.id}>
                        <td>
                          <div className="admin-ui-table-primary">{job.title || 'Untitled job'}</div>
                          <div className="admin-ui-table-secondary">{job.location || 'Location not provided'}</div>
                        </td>
                        <td>{job.organization || job.companyName || 'Not provided'}</td>
                        <td>{job.category || job.sector || '—'}</td>
                        <td>{formatNumber(job.applications)}</td>
                        <td>{formatNumber(job.views)}</td>
                        <td><span className={`admin-ui-status ${normalizeStatus(job.status)}`}>{job.status || 'Unknown'}</span></td>
                        <td>
                          <div className="admin-ui-table-actions">
                            <button
                              type="button"
                              className="admin-ui-table-icon-btn"
                              title="View job"
                              onClick={() => onNavigate('job-detail', job.id)}
                            >
                              <Eye />
                            </button>
                            <button
                              type="button"
                              className="admin-ui-table-icon-btn"
                              title="Manage job"
                              onClick={() => onNavigate('admin-jobs')}
                            >
                              <Settings />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )) : (
                      <tr><td colSpan={7}><div className="admin-ui-empty">No matching jobs found.</div></td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="admin-ui-table-footer">
                <span>Showing {formatNumber(filteredJobs.length)} of {formatNumber(totalJobs)} jobs</span>
                <span>{globalSearch ? `Filtered by “${globalSearch}”` : 'Sorted by newest available data'}</span>
              </div>
            </div>
          </section>

          <section className="admin-ui-section">
            <div className="admin-ui-section-header">
              <div className="admin-ui-section-title-wrap">
                <h2 className="admin-ui-section-title"><Flag /> Fraud & Report Center</h2>
                <p className="admin-ui-section-subtitle">Live fraud reports and moderation state</p>
              </div>
              <span className={`admin-ui-status ${unresolvedReports > 0 ? 'high' : 'resolved'}`}>
                {formatNumber(unresolvedReports)} open
              </span>
            </div>

            <div className="admin-ui-table-panel">
              <div className="admin-ui-table-scroll">
                <table className="admin-ui-table">
                  <thead>
                    <tr>
                      <th>Report</th>
                      <th>Reporter</th>
                      <th>Reason</th>
                      <th>Priority</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReports.length > 0 ? filteredReports.map((report) => (
                      <tr key={report.id}>
                        <td>
                          <div className="admin-ui-table-primary">{report.id}</div>
                          <div className="admin-ui-table-secondary">{companyTypeLabel(report.type)}</div>
                        </td>
                        <td>{report.reporterName || 'Unknown'}</td>
                        <td>
                          <div className="admin-ui-table-primary">{report.reason || 'No reason provided'}</div>
                          <div className="admin-ui-table-secondary">{report.description || ''}</div>
                        </td>
                        <td><span className={`admin-ui-status ${normalizeStatus(report.priority)}`}>{report.priority}</span></td>
                        <td>{formatDateTime(report.createdAt)}</td>
                        <td><span className={`admin-ui-status ${normalizeStatus(report.status)}`}>{report.status.replace(/_/g, ' ')}</span></td>
                        <td>
                          <div className="admin-ui-table-actions">
                            {!['resolved', 'dismissed'].includes(normalizeStatus(report.status)) && (
                              <button
                                type="button"
                                className="admin-ui-mini-button approve"
                                disabled={reportActionId === report.id}
                                onClick={() => handleResolveReport(report)}
                              >
                                <CheckCircle2 /> Resolve
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )) : (
                      <tr><td colSpan={7}><div className="admin-ui-empty">No matching fraud reports found.</div></td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section className="admin-ui-section">
            <div className="admin-ui-section-header">
              <div className="admin-ui-section-title-wrap">
                <h2 className="admin-ui-section-title"><BarChart3 /> Analytics Overview</h2>
                <p className="admin-ui-section-subtitle">Metrics returned by the existing analytics endpoints</p>
              </div>
              <button type="button" className="admin-ui-section-link" onClick={() => onNavigate('analytics')}>
                Detailed analytics <ChevronRight />
              </button>
            </div>

            <div className="admin-ui-analytics-grid">
              <article className="admin-ui-analytics-card">
                <div className="admin-ui-analytics-label">Total Job Views</div>
                <div className="admin-ui-analytics-value">{formatNumber(data.overview?.totalViews)}</div>
                <div className="admin-ui-analytics-note">Across job analytics data</div>
              </article>
              <article className="admin-ui-analytics-card">
                <div className="admin-ui-analytics-label">Application Conversion</div>
                <div className="admin-ui-analytics-value">{Number(data.overview?.conversionRate || 0).toLocaleString('en-IN')}%</div>
                <div className="admin-ui-analytics-note">Backend-calculated conversion rate</div>
              </article>
              <article className="admin-ui-analytics-card">
                <div className="admin-ui-analytics-label">Average Response Time</div>
                <div className="admin-ui-analytics-value">
                  {Number(data.overview?.avgResponseDays || 0) > 0 ? `${Number(data.overview?.avgResponseDays).toLocaleString('en-IN')} days` : 'N/A'}
                </div>
                <div className="admin-ui-analytics-note">Based on processed application data</div>
              </article>
              <article className="admin-ui-analytics-card">
                <div className="admin-ui-analytics-label">Critical Reports</div>
                <div className="admin-ui-analytics-value">{formatNumber(data.reportStats?.critical)}</div>
                <div className="admin-ui-analytics-note">Critical priority fraud reports</div>
              </article>
            </div>
          </section>
        </div>
      </main>

      <nav className="admin-ui-bottom-nav" aria-label="Admin mobile navigation">
        <button type="button" className="admin-ui-bottom-item active" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <LayoutDashboard /><span>Dashboard</span>
        </button>
        <button type="button" className="admin-ui-bottom-item" onClick={() => onNavigate('admin-jobs')}>
          <Briefcase /><span>Jobs</span>
          {pendingJobs > 0 && <span className="admin-ui-bottom-badge">{pendingJobs > 99 ? '99+' : pendingJobs}</span>}
        </button>
        <button type="button" className="admin-ui-bottom-item" onClick={() => onNavigate('admin-employer-verification')}>
          <Building2 /><span>Employers</span>
          {data.pendingEmployerCount > 0 && <span className="admin-ui-bottom-badge">{data.pendingEmployerCount > 99 ? '99+' : data.pendingEmployerCount}</span>}
        </button>
        <button type="button" className="admin-ui-bottom-item" onClick={() => onNavigate('admin-applications')}>
          <FileText /><span>Apps</span>
        </button>
        <button type="button" className="admin-ui-bottom-item" onClick={() => onNavigate('notifications')}>
          <Bell /><span>Alerts</span>
          {data.unreadCount > 0 && <span className="admin-ui-bottom-badge">{data.unreadCount > 99 ? '99+' : data.unreadCount}</span>}
        </button>
      </nav>
    </div>
  );
}
