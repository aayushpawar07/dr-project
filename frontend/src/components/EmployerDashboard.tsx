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
  Clock,
  CreditCard,
  Edit,
  Eye,
  FileText,
  Filter,
  Globe,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Mail,
  MapPin,
  Menu,
  Phone,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  UserCheck,
  Users,
  Video,
  ExternalLink,
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
import { fetchJobsByEmployer, createJob } from '../api/jobs';
import { getCurrentSubscription, SubscriptionResponse } from '../api/subscriptions';
import { fetchNotifications } from '../api/notifications';
import { searchCandidates, CandidateProfileData } from '../api/candidateProfiles';
import { openFileInViewer } from '../utils/fileUtils';
import '../styles/employer-dashboard.css';

interface EmployerDashboardProps {
  onNavigate: (page: string, entityId?: string) => void;
}

type DashboardSection = 'jobs' | 'applications' | 'candidates' | 'subscription' | 'notifications' | 'verification';
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

const SAMPLE_TEST_JOBS = [
  {
    title: 'Senior Consultant - Critical Care Medicine',
    sector: 'private' as const,
    category: 'specialist',
    location: 'Bhopal, Madhya Pradesh',
    qualification: 'MD/DNB in Anaesthesia or Critical Care Medicine (IDCCM)',
    experience: '3-6 years',
    experienceLevel: 'senior' as const,
    speciality: 'Critical Care',
    dutyType: 'full_time' as const,
    numberOfPosts: 2,
    salary: 'INR 2,20,000 - 3,00,000 per month',
    description: 'Lead our advanced 24-bed multidisciplinary ICU and ECMO team. Manage critical patient admissions, ventilator protocols, and bedside echocardiography.',
    lastDate: '2027-12-31',
    featured: true,
    status: 'active' as const,
  },
  {
    title: 'Emergency Medical Officer (Casualty)',
    sector: 'private' as const,
    category: 'medical officer',
    location: 'Bhopal, Madhya Pradesh',
    qualification: 'MBBS with valid MCI/State Council registration and ACLS/ATLS certification',
    experience: '1-3 years',
    experienceLevel: 'mid' as const,
    speciality: 'Emergency Medicine',
    dutyType: 'full_time' as const,
    numberOfPosts: 4,
    salary: 'INR 90,000 - 1,25,000 per month',
    description: 'Handle emergency room triage, primary trauma stabilization, resuscitation, and prompt referral coordination in our Level-1 trauma unit.',
    lastDate: '2027-12-31',
    featured: true,
    status: 'active' as const,
  },
  {
    title: 'Consultant Pediatrician & Neonatologist',
    sector: 'private' as const,
    category: 'specialist',
    location: 'Bhopal, Madhya Pradesh',
    qualification: 'MD/DNB in Pediatrics with NICU/PICU clinical exposure',
    experience: '2-5 years',
    experienceLevel: 'mid' as const,
    speciality: 'Pediatrics',
    dutyType: 'full_time' as const,
    numberOfPosts: 2,
    salary: 'INR 1,80,000 - 2,50,000 per month',
    description: 'Provide comprehensive neonatal intensive care, pediatric inpatient care, developmental screening, and parent counseling.',
    lastDate: '2027-12-31',
    featured: false,
    status: 'active' as const,
  },
  {
    title: 'ICU Staff Nurse (In-Charge)',
    sector: 'private' as const,
    category: 'paramedical',
    location: 'Bhopal, Madhya Pradesh',
    qualification: 'B.Sc Nursing / GNM with State Nursing Council Registration',
    experience: '2-4 years',
    experienceLevel: 'mid' as const,
    speciality: 'Critical Care Nursing',
    dutyType: 'full_time' as const,
    numberOfPosts: 6,
    salary: 'INR 40,000 - 60,000 per month',
    description: 'Supervise intensive care nursing stations, monitor patient hemodynamics, manage infusions, and ensure high infection control standards.',
    lastDate: '2027-12-31',
    featured: false,
    status: 'active' as const,
  },
];

export function EmployerDashboard({ onNavigate }: EmployerDashboardProps) {
  const { user, token, logout } = useAuth();
  const isTestAccount = user?.email?.toLowerCase() === 'cricketloverayush9999@gmail.com';
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
  const [appMinExpFilter, setAppMinExpFilter] = useState<string>('all');
  const [appQualFilter, setAppQualFilter] = useState<string>('');
  const [appSearchFilter, setAppSearchFilter] = useState<string>('');
  const [appEligibleOnly, setAppEligibleOnly] = useState<boolean>(false);
  const [seedingTestJobs, setSeedingTestJobs] = useState(false);
  const [interviewDraft, setInterviewDraft] = useState<{
    application: ApplicationResponse;
    date: string;
    link?: string;
    notes?: string;
  } | null>(null);

  // Candidate Talent Pool Search State
  const [candidatesList, setCandidatesList] = useState<CandidateProfileData[]>([]);
  const [candidatesTotal, setCandidatesTotal] = useState(0);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [candidateSearch, setCandidateSearch] = useState('');
  const [candidateQualification, setCandidateQualification] = useState('');
  const [candidateSpeciality, setCandidateSpeciality] = useState('');
  const [candidateJobRole, setCandidateJobRole] = useState('');
  const [candidateMinExp, setCandidateMinExp] = useState<number | undefined>(undefined);
  const [candidateState, setCandidateState] = useState('');
  const [candidateType, setCandidateType] = useState('');
  const [viewingCandidate, setViewingCandidate] = useState<CandidateProfileData | null>(null);

  const fetchCandidates = async () => {
    if (!token) return;
    setLoadingCandidates(true);
    try {
      const res = await searchCandidates(
        {
          search: candidateSearch || undefined,
          qualification: candidateQualification || undefined,
          speciality: candidateSpeciality || undefined,
          jobRole: candidateJobRole || undefined,
          minExperience: candidateMinExp,
          state: candidateState || undefined,
          candidateType: candidateType || undefined,
        },
        token,
      );
      setCandidatesList(res.candidates || []);
      setCandidatesTotal(res.total || 0);
    } catch (e: any) {
      console.error('Failed to load candidate talent pool:', e);
      toast.error(e?.message || 'Unable to load candidates');
    } finally {
      setLoadingCandidates(false);
    }
  };

  useEffect(() => {
    if (activeSection === 'candidates') {
      void fetchCandidates();
    }
  }, [activeSection]);

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

  const seedTestJobsNow = async (companyNameOverride?: string) => {
    if (seedingTestJobs) return;
    setSeedingTestJobs(true);
    const orgName = companyNameOverride || employer?.companyName || 'Aimss Multi-Speciality Hospital';
    toast.info('Generating sample medical jobs for your VIP account...');
    try {
      for (const sample of SAMPLE_TEST_JOBS) {
        try {
          await createJob({
            ...sample,
            organization: orgName,
            contactEmail: user?.email || 'cricketloverayush9999@gmail.com',
            contactPhone: user?.phone || '+916265561446',
          });
        } catch (jobErr) {
          console.warn('Sample job creation error:', jobErr);
        }
      }
      toast.success('4 sample clinical jobs added to your test dashboard!');
      await loadDashboardData(false);
    } catch (err: any) {
      toast.error('Unable to create test jobs: ' + (err?.message || 'Server error'));
    } finally {
      setSeedingTestJobs(false);
    }
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

      // If test account has 0 jobs, auto-seed on the fly once!
      if (isTestAccount && employerJobs.length === 0 && !sessionStorage.getItem('medex_seeded_' + user.id)) {
        sessionStorage.setItem('medex_seeded_' + user.id, '1');
        setTimeout(() => {
          void seedTestJobsNow(employerData.companyName);
        }, 150);
      }

      const applications = await fetchApplicationsForJobs(employerJobs, token);
      setMyApplications(applications);

      try {
        const subscription = await getCurrentSubscription(token);
        if (subscription) {
          setCurrentSubscription(subscription);
        } else if (isTestAccount) {
          setCurrentSubscription({
            id: 'vip-test-sub',
            userId: user.id,
            status: 'active',
            startDate: '2026-01-01',
            endDate: '2036-12-31',
            jobPostsUsed: 0,
            featuredPostsUsed: 0,
            autoRenew: true,
            plan: {
              id: 'vip-test-plan',
              name: 'VIP Testing Plan (Active)',
              price: 0,
              durationDays: 3650,
              jobPostsAllowed: 9999,
              featuredPostsAllowed: 9999,
              planType: 'enterprise'
            }
          } as any);
        } else {
          setCurrentSubscription(null);
        }
      } catch (subscriptionError) {
        if (isTestAccount) {
          setCurrentSubscription({
            id: 'vip-test-sub',
            userId: user.id,
            status: 'active',
            startDate: '2026-01-01',
            endDate: '2036-12-31',
            jobPostsUsed: 0,
            featuredPostsUsed: 0,
            autoRenew: true,
            plan: {
              id: 'vip-test-plan',
              name: 'VIP Testing Plan (Active)',
              price: 0,
              durationDays: 3650,
              jobPostsAllowed: 9999,
              featuredPostsAllowed: 9999,
              planType: 'enterprise'
            }
          } as any);
        } else {
          setCurrentSubscription(null);
        }
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
  const isAccountVerified = verified || isTestAccount;
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
  const rejectedCount = myApplications.filter(
    (application) => normalizeApplicationStatus(application.status) === 'rejected',
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

  // Per-job counts for the job rows. job.applications from the API can lag
  // behind, so the loaded applications win whenever they are higher.
  const jobStats = useMemo(() => {
    const map = new Map<string, { total: number; shortlisted: number }>();
    myApplications.forEach((application) => {
      const entry = map.get(application.jobId) || { total: 0, shortlisted: 0 };
      entry.total += 1;
      if (normalizeApplicationStatus(application.status) === 'shortlisted') entry.shortlisted += 1;
      map.set(application.jobId, entry);
    });
    return map;
  }, [myApplications]);

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
      // 1. Status Filter
      const status = normalizeApplicationStatus(application.status);
      if (applicationFilter !== 'all') {
        if (applicationFilter === 'new' && status !== 'applied') return false;
        if (applicationFilter !== 'new' && status !== applicationFilter) return false;
      }

      // 2. Minimum Experience Filter (> 2 years, etc.)
      if (appMinExpFilter !== 'all') {
        const requiredExp = Number(appMinExpFilter);
        const candExp = application.candidateYearsExperience ?? 0;
        if (candExp < requiredExp) return false;
      }

      // 3. Qualification / Domain Filter
      if (appQualFilter.trim()) {
        const term = appQualFilter.trim().toLowerCase();
        const qual = (application.candidateQualification || '').toLowerCase();
        const spec = (application.candidateSpeciality || '').toLowerCase();
        if (!qual.includes(term) && !spec.includes(term)) return false;
      }

      // 4. Candidate Search Keyword (name, email, phone, city, registration)
      if (appSearchFilter.trim()) {
        const term = appSearchFilter.trim().toLowerCase();
        const name = (application.candidateName || '').toLowerCase();
        const email = (application.candidateEmail || '').toLowerCase();
        const phone = (application.candidatePhone || '').toLowerCase();
        const city = (application.candidateCity || '').toLowerCase();
        const reg = (application.candidateRegistrationNumber || '').toLowerCase();
        if (!name.includes(term) && !email.includes(term) && !phone.includes(term) && !city.includes(term) && !reg.includes(term)) {
          return false;
        }
      }

      // 5. Eligible Only Filter
      if (appEligibleOnly && !application.isEligible) {
        return false;
      }

      return true;
    };

    if (selectedJobId !== 'all') {
      const jobApplications = myApplications.filter((application) => application.jobId === selectedJobId && matchesFilter(application));
      return [[selectedJobId, jobApplications]] as Array<[string, ApplicationResponse[]]>;
    }

    return applicationsByJob
      .map(([jobId, applications]) => [jobId, applications.filter(matchesFilter)] as [string, ApplicationResponse[]])
      .filter(([, applications]) => applications.length > 0);
  }, [applicationFilter, applicationsByJob, myApplications, selectedJobId, appMinExpFilter, appQualFilter, appSearchFilter, appEligibleOnly]);

  const totalFilteredApplications = useMemo(() => {
    return visibleApplicationsByJob.reduce((sum, [, apps]) => sum + apps.length, 0);
  }, [visibleApplicationsByJob]);

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
    if (!isAccountVerified) {
      toast.error('Employer business verification is required before posting jobs.');
      onNavigate('verification');
      return;
    }
    if (isTestAccount || currentSubscription?.status === 'active') {
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
    interviewLink?: string,
    interviewNotes?: string,
  ) => {
    if (!token) return;
    const status = normalizeApplicationStatus(newStatus);
    if (status === 'interview' && !interviewDate) {
      setInterviewDraft({
        application,
        date: application.interviewDate ? toInterviewDateTimeLocal(application.interviewDate) : toInterviewDateTimeLocal(),
        link: application.interviewLink || '',
        notes: application.interviewNotes || '',
      });
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
        interviewLink,
        interviewNotes,
      );
      setMyApplications((previous) =>
        previous.map((item) =>
          item.id === application.id
            ? {
                ...item,
                ...updated,
                jobId: item.jobId,
                jobTitle: item.jobTitle,
                interviewLink: interviewLink !== undefined ? interviewLink : item.interviewLink,
                interviewNotes: interviewNotes !== undefined ? interviewNotes : item.interviewNotes,
                status: normalizeApplicationStatus(updated.status || status),
              }
            : item,
        ),
      );
      setInterviewDraft(null);
      toast.success(status === 'interview' ? 'Interview scheduled & candidate notified' : `Application marked ${statusLabel(status).toLowerCase()}`);
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
    {
      label: 'Candidate Talent Pool',
      icon: UserCheck,
      badge: candidatesTotal > 0 ? candidatesTotal : undefined,
      active: activeSection === 'candidates',
      action: () => openSection('candidates'),
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
        <button
          type="button"
          className="icon-button employer-sidebar__logout"
          onClick={handleLogout}
          aria-label="Logout"
          title="Logout"
        >
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
      tone: 'amber',
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
          className="icon-button employer-mobile-toggle"
          onClick={() => setMobileNavOpen(true)}
          aria-label="Open employer navigation"
        >
          <Menu size={20} />
        </button>
        <strong>Employer Dashboard</strong>
        <button
          type="button"
          className="icon-button icon-button--notification employer-mobile-notification"
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

          <section className={`mx-banner ${verified ? 'mx-banner--ok' : 'mx-banner--warn'}`}>
            <div className="mx-banner__left">
              <span className={`mx-badge ${verified ? 'mx-badge--ok' : 'mx-badge--warn'}`}>
                <ShieldCheck size={15} />
                {verified ? 'Verified Employer' : 'Verification Required'}
              </span>
              <span className="mx-banner__detail">
                <strong>{employer.companyName}</strong>
                {employer.companyType ? ` · ${employer.companyType}` : ''}
                {employer.city ? ` · ${employer.city}${employer.state ? `, ${employer.state}` : ''}` : ''}
                {employer.userEmail ? ` · ${employer.userEmail}` : ''}
              </span>
              <p className="mx-banner__note">
                {verified
                  ? 'Candidates see this account as a verified hospital or clinic. Job posting is unlocked.'
                  : 'Unverified accounts look like cheap listings. Complete business verification before posting, or applicants will treat this as a fraud risk.'}
              </p>
            </div>
            <div className="mx-banner__right">
              {!isAccountVerified && (
                <button className="mx-btn mx-btn--sm" type="button" onClick={() => onNavigate('verification')}>
                  Complete Verification
                </button>
              )}
              <button className="mx-btn-outline" type="button" onClick={() => onNavigate('profile')}>
                <Edit size={14} /> Edit Profile
              </button>
              <button className="mx-btn-outline" type="button" onClick={() => onNavigate('analytics')}>
                <BarChart3 size={14} /> Analytics
              </button>
              <button className="mx-btn-outline" type="button" onClick={() => onNavigate('subscription')}>
                <CreditCard size={14} />
                {isTestAccount
                  ? 'VIP Testing Plan (Active)'
                  : currentSubscription?.status === 'active'
                  ? currentSubscription.plan.name
                  : 'No active plan'}
              </button>
              {isTestAccount && (
                <button
                  className="mx-btn mx-btn--sm bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5"
                  type="button"
                  disabled={seedingTestJobs}
                  onClick={() => void seedTestJobsNow()}
                >
                  <Sparkles size={14} className={seedingTestJobs ? 'animate-spin' : ''} />
                  {seedingTestJobs ? 'Adding Jobs…' : '⚡ Generate 4 Sample Jobs'}
                </button>
              )}
            </div>
          </section>

          <section className="mx-stats" aria-label="Employer statistics">
            {metricCards.map((metric) => {
              const Icon = metric.icon;
              return (
                <button
                  type="button"
                  className={`mx-stat mx-stat--${metric.tone}`}
                  key={metric.label}
                  onClick={() => {
                    if (metric.label === 'Shortlisted') openApplications('shortlisted');
                    else if (metric.label === 'Interviews') openApplications('interview');
                    else if (metric.label === 'Total Applications') openApplications('all');
                    else if (metric.label === 'Positions Filled') openApplications('selected');
                    else openSection('jobs');
                  }}
                >
                  <span className="mx-stat__icon"><Icon size={18} /></span>
                  <strong className="mx-stat__value">{metric.value}</strong>
                  <span className="mx-stat__label">{metric.label}</span>
                  <span className="mx-stat__change">{metric.helper}</span>
                </button>
              );
            })}
          </section>

          <section className="mx-postcta">
            <button
              className="mx-btn mx-btn--lg"
              type="button"
              onClick={handlePostJob}
              disabled={!isAccountVerified || (!isTestAccount && currentSubscription?.status !== 'active')}
            >
              <Plus size={18} />
              {isTestAccount || currentSubscription?.status === 'active'
                ? 'Post a New Job'
                : !isAccountVerified
                ? 'Verify Account to Post Jobs'
                : 'Choose a Plan to Post Jobs'}
            </button>
            <span className="mx-postcta__hint">
              <CheckCircle size={15} />
              {isTestAccount
                ? 'VIP testing account: Unlimited job postings unlocked'
                : !isAccountVerified
                ? 'Verification must be completed before posting'
                : currentSubscription?.status === 'active'
                ? `${currentSubscription.jobPostsUsed} of ${currentSubscription.jobPostsAllowed} job posts used`
                : 'An active subscription is required before posting a job'}
            </span>
          </section>

          <div className="mx-tabs mx-tabs--sections" role="tablist" aria-label="Employer dashboard sections">
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

              <div className="mx-tabs" role="tablist" aria-label="Filter jobs by status">
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
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', flexWrap: 'wrap', marginTop: '8px' }}>
                    <button className="dashboard-primary-button dashboard-primary-button--small" onClick={handlePostJob} type="button">
                      <Plus size={16} /> Post a Job
                    </button>
                    {isTestAccount && (
                      <button
                        className="dashboard-primary-button dashboard-primary-button--small"
                        style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)', color: '#ffffff' }}
                        type="button"
                        disabled={seedingTestJobs}
                        onClick={() => void seedTestJobsNow()}
                      >
                        <Sparkles size={16} className={seedingTestJobs ? 'animate-spin' : ''} />
                        {seedingTestJobs ? 'Generating Jobs…' : '⚡ Generate 4 Sample Jobs'}
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="mx-joblist">
                  {filteredJobs.map((job) => {
                    const stats = jobStats.get(job.id);
                    const applicationTotal = Math.max(stats?.total || 0, Number(job.applications) || 0);
                    const days = daysUntil(job.lastDate);
                    const expiring = job.status === 'active' && days !== null && days >= 0 && days <= 7;
                    return (
                      <article className={`mx-job${expiring ? ' mx-job--expiring' : job.status === 'active' ? ' mx-job--active' : ''}`} key={job.id}>
                        <div className="mx-job__info">
                          <h3>{job.title}</h3>
                          <div className="mx-job__meta">
                            {job.location && <span><MapPin size={13} />{job.location}</span>}
                            {job.numberOfPosts != null && (
                              <span><Users size={13} />{job.numberOfPosts} vacanc{Number(job.numberOfPosts) === 1 ? 'y' : 'ies'}</span>
                            )}
                            <span><Calendar size={13} />Posted {formatDate(job.postedDate || job.createdAt)}</span>
                            <span><Clock size={13} />Last date {formatDate(job.lastDate)}</span>
                            <span><Eye size={13} />{Number(job.views) || 0} views</span>
                          </div>
                        </div>

                        <div className="mx-job__status">
                          <span className={expiring ? 'dashboard-status dashboard-status--expiring' : getJobStatusClass(job.status)}>
                            {expiring ? (
                              <>
                                <Clock size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: '-1px' }} />
                                Expiring soon
                              </>
                            ) : job.status === 'active' ? (
                              <>
                                <CheckCircle size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: '-1px' }} />
                                Active
                              </>
                            ) : (
                              job.status || 'N/A'
                            )}
                          </span>
                          <button type="button" className="mx-job__count" onClick={() => openApplications('all', job.id)}>
                            {applicationTotal} Apps
                          </button>
                          <button type="button" className="mx-job__count" onClick={() => openApplications('shortlisted', job.id)}>
                            {stats?.shortlisted || 0} Shortlisted
                          </button>
                          <div className="mx-job__actions">
                            <button type="button" onClick={() => onNavigate('job-detail', job.id)} title="View job" aria-label="View job">
                              <Eye size={15} />
                            </button>
                            <button type="button" onClick={() => onNavigate('edit-job', job.id)} title="Edit job" aria-label="Edit job">
                              <Edit size={15} />
                            </button>
                            <button type="button" className="is-primary" onClick={() => openApplications('all', job.id)} title="View applications" aria-label="View applications">
                              <Users size={15} />
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
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

              <div className="mx-tabs" role="tablist" aria-label="Filter applications by status">
                {([
                  { value: 'all', label: 'All', count: myApplications.length },
                  { value: 'new', label: 'New', count: newApplicationCount },
                  { value: 'shortlisted', label: 'Shortlisted', count: shortlistedCount },
                  { value: 'interview', label: 'Interview', count: interviewCount },
                  { value: 'selected', label: 'Selected', count: filledPositionsCount },
                  { value: 'rejected', label: 'Rejected', count: rejectedCount },
                ] as Array<{ value: ApplicationFilter; label: string; count: number }>).map((tab) => (
                  <button
                    key={tab.value}
                    type="button"
                    className={applicationFilter === tab.value ? 'is-active' : ''}
                    onClick={() => setApplicationFilter(tab.value)}
                  >
                    {tab.label} <span>{tab.count}</span>
                  </button>
                ))}
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

              {/* Advanced Applicant Filter Bar */}
              <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                padding: '16px',
                margin: '16px 0 20px 0',
                boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Filter size={17} style={{ color: '#0d9488' }} />
                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>Filter Applicants by Job &amp; Experience</span>
                    <span style={{
                      fontSize: '11px',
                      background: '#ecfdf5',
                      color: '#065f46',
                      border: '1px solid #a7f3d0',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontWeight: 700
                    }}>
                      {totalFilteredApplications} Applicants Found
                    </span>
                    <button
                      type="button"
                      onClick={() => setAppEligibleOnly(prev => !prev)}
                      style={{
                        background: appEligibleOnly ? '#059669' : '#ecfdf5',
                        color: appEligibleOnly ? '#ffffff' : '#047857',
                        border: '1px solid #a7f3d0',
                        borderRadius: '6px',
                        padding: '4px 10px',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'all 0.15s'
                      }}
                    >
                      🎯 {appEligibleOnly ? 'Showing 100% Eligible Only' : 'Show 100% Eligible Only'}
                    </button>
                  </div>
                  {(selectedJobId !== 'all' || appMinExpFilter !== 'all' || appQualFilter || appSearchFilter || appEligibleOnly || applicationFilter !== 'all') && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedJobId('all');
                        setAppMinExpFilter('all');
                        setAppQualFilter('');
                        setAppSearchFilter('');
                        setAppEligibleOnly(false);
                        setApplicationFilter('all');
                      }}
                      style={{
                        background: '#fee2e2',
                        border: '1px solid #fca5a5',
                        borderRadius: '6px',
                        padding: '4px 10px',
                        color: '#b91c1c',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Reset All Filters
                    </button>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                  {/* 1. Job Dropdown */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                      Selected Job Post
                    </label>
                    <select
                      value={selectedJobId}
                      onChange={(e) => setSelectedJobId(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        border: selectedJobId !== 'all' ? '1px solid #0d9488' : '1px solid #cbd5e1',
                        fontSize: '12px',
                        color: '#0f172a',
                        background: '#fff',
                        fontWeight: selectedJobId !== 'all' ? 600 : 400
                      }}
                    >
                      <option value="all">All Jobs ({myApplications.length} total)</option>
                      {myJobs.map((j) => {
                        const count = myApplications.filter((a) => a.jobId === j.id).length;
                        return (
                          <option key={j.id} value={j.id}>
                            {j.title} ({count} applicants)
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* 2. Minimum Experience Filter (e.g. > 2 Years) */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                      Candidate Experience
                    </label>
                    <select
                      value={appMinExpFilter}
                      onChange={(e) => setAppMinExpFilter(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        border: appMinExpFilter !== 'all' ? '1px solid #059669' : '1px solid #cbd5e1',
                        fontSize: '12px',
                        color: appMinExpFilter !== 'all' ? '#047857' : '#0f172a',
                        background: appMinExpFilter !== 'all' ? '#ecfdf5' : '#fff',
                        fontWeight: appMinExpFilter !== 'all' ? 700 : 400
                      }}
                    >
                      <option value="all">Any Experience</option>
                      <option value="1">1+ Years Experience</option>
                      <option value="2">2+ Years Experience (&gt; 2 yrs)</option>
                      <option value="3">3+ Years Experience</option>
                      <option value="5">5+ Years Experience</option>
                      <option value="8">8+ Years Experience</option>
                      <option value="10">10+ Years Experience</option>
                    </select>
                  </div>

                  {/* 3. Qualification / Speciality */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                      Qualification / Speciality
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. MBBS, MD, MS, DNB..."
                      value={appQualFilter}
                      onChange={(e) => setAppQualFilter(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '12px',
                        color: '#0f172a',
                        background: '#fff'
                      }}
                    />
                  </div>

                  {/* 4. Candidate Search Keyword */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                      Search Candidate
                    </label>
                    <input
                      type="text"
                      placeholder="Name, email, phone, city..."
                      value={appSearchFilter}
                      onChange={(e) => setAppSearchFilter(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '12px',
                        color: '#0f172a',
                        background: '#fff'
                      }}
                    />
                  </div>
                </div>

                {/* Active Filter Pills */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '12px', paddingTop: '10px', borderTop: '1px dashed #e2e8f0' }}>
                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Active Filters:</span>
                  {selectedJobId !== 'all' && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '2px 8px', borderRadius: '9999px', fontWeight: 600 }}>
                      Job: {myJobs.find(j => j.id === selectedJobId)?.title?.slice(0, 22)}...
                      <button type="button" onClick={() => setSelectedJobId('all')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1d4ed8', padding: 0 }}>×</button>
                    </span>
                  )}
                  {appMinExpFilter !== 'all' && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '2px 8px', borderRadius: '9999px', fontWeight: 700 }}>
                      🎯 Min {appMinExpFilter}+ Yrs Experience
                      <button type="button" onClick={() => setAppMinExpFilter('all')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#047857', padding: 0 }}>×</button>
                    </span>
                  )}
                  {appQualFilter && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', background: '#f5f3ff', color: '#6d28d9', border: '1px solid #ddd6fe', padding: '2px 8px', borderRadius: '9999px', fontWeight: 600 }}>
                      Qual: {appQualFilter}
                      <button type="button" onClick={() => setAppQualFilter('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6d28d9', padding: 0 }}>×</button>
                    </span>
                  )}
                  {appSearchFilter && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', background: '#f8fafc', color: '#334155', border: '1px solid #cbd5e1', padding: '2px 8px', borderRadius: '9999px', fontWeight: 600 }}>
                      Keyword: "{appSearchFilter}"
                      <button type="button" onClick={() => setAppSearchFilter('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#334155', padding: 0 }}>×</button>
                    </span>
                  )}
                  {selectedJobId === 'all' && appMinExpFilter === 'all' && !appQualFilter && !appSearchFilter && (
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>Showing all candidates across all posted jobs</span>
                  )}
                </div>
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
                        <div className="mx-candidates">
                          {applications.map((application) => {
                            const status = normalizeApplicationStatus(application.status);
                            const busy = updatingApplicationId === application.id;
                            return (
                            <article className="mx-candidate" key={application.id}>
                              <div className="mx-candidate__head">
                                <div className="mx-avatar">{getInitials(application.candidateName)}</div>
                                <div className="mx-candidate__identity">
                                  <h4>{application.candidateName || 'Candidate'}</h4>
                                  <span>
                                    {[
                                      application.candidateQualification,
                                      application.candidateSpeciality,
                                    ].filter(Boolean).join(' | ') || 'Qualification not added'}
                                  </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  {application.isEligible ? (
                                    <span style={{
                                      background: '#ecfdf5',
                                      color: '#065f46',
                                      border: '1px solid #a7f3d0',
                                      padding: '2px 8px',
                                      borderRadius: '9999px',
                                      fontSize: '11px',
                                      fontWeight: 700,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '3px'
                                    }}>
                                      🎯 100% Eligible
                                    </span>
                                  ) : (application.eligibilityScore ?? 0) >= 60 ? (
                                    <span style={{
                                      background: '#fffbeb',
                                      color: '#b45309',
                                      border: '1px solid #fde68a',
                                      padding: '2px 8px',
                                      borderRadius: '9999px',
                                      fontSize: '11px',
                                      fontWeight: 700,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '3px'
                                    }}>
                                      ⚡ {application.eligibilityScore}% Match
                                    </span>
                                  ) : null}
                                  <span className={getApplicationStatusClass(status)}>{statusLabel(status)}</span>
                                </div>
                              </div>

                              <div className="mx-candidate__details">
                                <span>
                                  <MapPin size={13} />
                                  {[application.candidateCity, application.candidateState].filter(Boolean).join(', ') || 'Location not added'}
                                </span>
                                <span style={application.candidateYearsExperience != null && application.candidateYearsExperience >= 2 ? {
                                  background: '#ecfdf5',
                                  color: '#047857',
                                  border: '1px solid #a7f3d0',
                                  fontWeight: 700,
                                  borderRadius: '6px',
                                  padding: '2px 8px'
                                } : {}}>
                                  <Briefcase size={13} />
                                  {application.candidateYearsExperience != null
                                    ? `${application.candidateYearsExperience >= 2 ? '🎯 ' : ''}${application.candidateYearsExperience} year${application.candidateYearsExperience === 1 ? '' : 's'} exp`
                                    : 'Experience not added'}
                                </span>
                                <span className={application.candidateRegistrationNumber ? 'is-verified' : 'is-missing'}>
                                  {application.candidateRegistrationNumber ? <CheckCircle size={13} /> : <AlertTriangle size={13} />}
                                  {application.candidateRegistrationNumber
                                    ? `Reg. ${application.candidateRegistrationNumber}`
                                    : 'Registration not provided'}
                                </span>
                              </div>

                              {((application.matchingCriteria && application.matchingCriteria.length > 0) || (application.unmetCriteria && application.unmetCriteria.length > 0)) && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', margin: '4px 0 8px 0' }}>
                                  {application.matchingCriteria?.map((m, idx) => (
                                    <span key={`m-${idx}`} style={{ fontSize: '10px', fontWeight: 600, background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', borderRadius: '4px', padding: '1px 6px' }}>
                                      ✓ {m}
                                    </span>
                                  ))}
                                  {application.unmetCriteria?.map((u, idx) => (
                                    <span key={`u-${idx}`} style={{ fontSize: '10px', fontWeight: 600, background: '#fff1f2', color: '#9f1239', border: '1px solid #fecdd3', borderRadius: '4px', padding: '1px 6px' }}>
                                      ✗ {u}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {(application.candidateSpeciality || application.candidateSubSpeciality || application.candidateRegistrationCouncil) && (
                                <div className="mx-candidate__skills">
                                  {[
                                    application.candidateSpeciality,
                                    application.candidateSubSpeciality,
                                    application.candidateRegistrationCouncil,
                                  ]
                                    .filter(Boolean)
                                    .map((skill) => <span className="mx-skill" key={skill}>{skill}</span>)}
                                </div>
                              )}

                              <div className="mx-candidate__contact">
                                <a href={`mailto:${application.candidateEmail}`}><Mail size={13} />{application.candidateEmail}</a>
                                {application.candidatePhone && <a href={`tel:${application.candidatePhone}`}><Phone size={13} />{application.candidatePhone}</a>}
                                <span><Calendar size={13} />Applied {formatDate(application.appliedDate)}</span>
                                {application.interviewDate && (
                                  <span className="is-interview"><Calendar size={13} />Interview {formatDate(application.interviewDate)}</span>
                                )}
                              </div>

                              {application.notes && <p className="mx-candidate__notes">{application.notes}</p>}

                              {(application.interviewDate || status === 'interview') && (
                                <div className="mx-interview-badge">
                                  <div className="mx-interview-badge__row">
                                    <Calendar size={14} />
                                    <span>Scheduled: {application.interviewDate ? new Date(application.interviewDate).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Date TBD'}</span>
                                  </div>
                                  {application.interviewLink ? (
                                    <div className="mx-interview-badge__row">
                                      <Video size={14} />
                                      <a
                                        href={application.interviewLink.startsWith('http') ? application.interviewLink : `https://${application.interviewLink}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="mx-interview-badge__btn"
                                      >
                                        Join / Open Meeting Link <ExternalLink size={12} />
                                      </a>
                                    </div>
                                  ) : (
                                    <div className="mx-interview-badge__row mx-interview-badge__row--missing">
                                      <Video size={14} />
                                      <span>No Zoom / Google Meet link added yet</span>
                                    </div>
                                  )}
                                  {application.interviewNotes && (
                                    <div className="mx-interview-badge__notes">
                                      <strong>Instructions:</strong> {application.interviewNotes}
                                    </div>
                                  )}
                                  <button
                                    type="button"
                                    className="mx-interview-badge__edit-btn"
                                    onClick={() => handleUpdateStatus(application, 'interview')}
                                  >
                                    <Edit size={12} /> {application.interviewLink ? 'Reschedule or Edit Meeting Link' : '+ Add Zoom / Google Meet Link'}
                                  </button>
                                </div>
                              )}

                              <div className="mx-candidate__actions">
                                {application.resumeUrl ? (
                                  <button type="button" className="mx-action mx-action--resume" onClick={() => openFileInViewer(application.resumeUrl!)}>
                                    <FileText size={14} /> Resume
                                  </button>
                                ) : (
                                  <span className="mx-candidate__no-resume">No resume</span>
                                )}
                                <button type="button" className={`mx-action mx-action--shortlist${status === 'shortlisted' ? ' is-current' : ''}`} disabled={busy} onClick={() => handleUpdateStatus(application, 'shortlisted')}>
                                  <Star size={14} /> Shortlist
                                </button>
                                <button type="button" className={`mx-action mx-action--interview${status === 'interview' ? ' is-current' : ''}`} disabled={busy} onClick={() => handleUpdateStatus(application, 'interview')}>
                                  <Calendar size={14} /> {status === 'interview' ? (application.interviewLink ? 'Update Interview' : '+ Add Meet Link') : 'Interview'}
                                </button>
                                <button type="button" className={`mx-action mx-action--select${status === 'selected' ? ' is-current' : ''}`} disabled={busy} onClick={() => handleUpdateStatus(application, 'selected')}>
                                  <CheckCircle size={14} /> Select
                                </button>
                                <button type="button" className={`mx-action mx-action--reject${status === 'rejected' ? ' is-current' : ''}`} disabled={busy} onClick={() => handleUpdateStatus(application, 'rejected')}>
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
                <button className="mx-btn-outline" type="button" onClick={() => onNavigate('employer-manage-applications')}>
                  Open Application Management <ChevronRight size={16} />
                </button>
              </div>
            </section>
          )}

          {activeSection === 'candidates' && (
            <section className="dashboard-panel">
              {/* Clinical Header Banner */}
              <div style={{
                background: 'linear-gradient(135deg, #0a3350 0%, #0c577e 55%, #0d7f78 100%)',
                borderRadius: '16px',
                padding: '22px 24px',
                color: '#ffffff',
                marginBottom: '20px',
                boxShadow: '0 8px 24px rgba(10, 51, 80, 0.16)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.16)',
                    backdropFilter: 'blur(8px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                    flexShrink: 0
                  }}>
                    <UserCheck size={24} style={{ color: '#5eead4' }} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', color: '#ffffff' }}>
                      Candidate Talent Pool &amp; Medical CV Bank
                    </h2>
                    <p style={{ fontSize: '13px', margin: '4px 0 0 0', color: 'rgba(255, 255, 255, 0.82)' }}>
                      Search registered doctors, specialists, residents, and healthcare professionals across India.
                    </p>
                  </div>
                </div>
                <div style={{
                  background: 'rgba(255, 255, 255, 0.18)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  padding: '7px 15px',
                  borderRadius: '30px',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#ffffff',
                  backdropFilter: 'blur(6px)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <Star size={14} style={{ color: '#fef08a' }} />
                  {candidatesTotal} Verified Candidates Available
                </div>
              </div>

              {/* Advanced Candidate Filters Bar */}
              <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '18px',
                marginBottom: '22px',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Search size={16} style={{ color: '#0d9488' }} />
                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>Search &amp; Filter Candidate Profiles</span>
                  </div>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>
                    Instant clinical filtering by experience, qualification, domain &amp; state
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '12px', marginBottom: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                      Search Keyword / Doctor Name
                    </label>
                    <input
                      type="text"
                      placeholder="Doctor name, hospital, skills..."
                      value={candidateSearch}
                      onChange={(e) => setCandidateSearch(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && void fetchCandidates()}
                      style={{
                        width: '100%',
                        padding: '8px 11px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '12px',
                        color: '#0f172a',
                        background: '#fff'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                      Qualification
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. MBBS, MD, MS, DNB, BDS..."
                      value={candidateQualification}
                      onChange={(e) => setCandidateQualification(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 11px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '12px',
                        color: '#0f172a',
                        background: '#fff'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                      Speciality / Department
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Cardiology, Surgery, ICU..."
                      value={candidateSpeciality}
                      onChange={(e) => setCandidateSpeciality(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 11px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '12px',
                        color: '#0f172a',
                        background: '#fff'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                      Preferred Job Role
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Senior Resident, Consultant..."
                      value={candidateJobRole}
                      onChange={(e) => setCandidateJobRole(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 11px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '12px',
                        color: '#0f172a',
                        background: '#fff'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                      Min Experience
                    </label>
                    <select
                      value={candidateMinExp ?? ''}
                      onChange={(e) => setCandidateMinExp(e.target.value ? Number(e.target.value) : undefined)}
                      style={{
                        width: '100%',
                        padding: '8px 11px',
                        borderRadius: '8px',
                        border: candidateMinExp !== undefined ? '1px solid #059669' : '1px solid #cbd5e1',
                        fontSize: '12px',
                        color: candidateMinExp !== undefined ? '#047857' : '#0f172a',
                        background: candidateMinExp !== undefined ? '#ecfdf5' : '#fff',
                        fontWeight: candidateMinExp !== undefined ? 700 : 400
                      }}
                    >
                      <option value="">Any Experience</option>
                      <option value="1">1+ Years Experience</option>
                      <option value="2">2+ Years Experience (&gt; 2 yrs)</option>
                      <option value="3">3+ Years Experience</option>
                      <option value="5">5+ Years Experience</option>
                      <option value="8">8+ Years Experience</option>
                      <option value="10">10+ Years Experience</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                      State / Location
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Delhi, Maharashtra, MP..."
                      value={candidateState}
                      onChange={(e) => setCandidateState(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 11px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '12px',
                        color: '#0f172a',
                        background: '#fff'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                      Medical Domain
                    </label>
                    <select
                      value={candidateType}
                      onChange={(e) => setCandidateType(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 11px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '12px',
                        color: '#0f172a',
                        background: '#fff'
                      }}
                    >
                      <option value="">All Domains</option>
                      <option value="Modern Medicine">Allopathy / Modern Medicine</option>
                      <option value="Dental">Dental Surgery</option>
                      <option value="AYUSH">AYUSH (Ayurveda/Homeo)</option>
                      <option value="Nursing">Nursing Services</option>
                      <option value="Pharmacy">Pharmacy</option>
                      <option value="Paramedical">Paramedical &amp; Allied</option>
                      <option value="Administration">Hospital Administration</option>
                    </select>
                  </div>
                </div>

                {/* Filter Action Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setCandidateSearch('');
                      setCandidateQualification('');
                      setCandidateSpeciality('');
                      setCandidateJobRole('');
                      setCandidateMinExp(undefined);
                      setCandidateState('');
                      setCandidateType('');
                      setTimeout(() => void fetchCandidates(), 50);
                    }}
                    style={{
                      background: '#f1f5f9',
                      color: '#475569',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      padding: '9px 18px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Reset Filters
                  </button>

                  <button
                    type="button"
                    onClick={() => void fetchCandidates()}
                    disabled={loadingCandidates}
                    style={{
                      background: 'linear-gradient(135deg, #0f766e 0%, #0d9488 100%)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '9px 24px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 3px 10px rgba(13, 148, 136, 0.3)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Search size={14} />
                    {loadingCandidates ? 'Filtering Candidates…' : '🔍 Apply Filters'}
                  </button>
                </div>
              </div>

              {/* Candidates Grid */}
              {loadingCandidates ? (
                <div style={{ textAlign: 'center', padding: '48px 20px', color: '#64748b', fontSize: '14px' }}>
                  <RefreshCw size={22} className="spin-icon" style={{ margin: '0 auto 8px auto', color: '#0d9488' }} />
                  Searching medical candidate directory…
                </div>
              ) : candidatesList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 20px', background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                  <UserCheck size={36} style={{ color: '#94a3b8', margin: '0 auto 10px auto' }} />
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#1e293b' }}>No candidates match your search criteria</h3>
                  <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Try lowering minimum experience or clearing the search keyword.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                  {candidatesList.map((cand) => (
                    <div
                      key={cand.id || cand.candidateId || cand.email}
                      style={{
                        background: '#ffffff',
                        borderRadius: '16px',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 3px 14px rgba(15, 23, 42, 0.04)',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between'
                      }}
                    >
                      {/* Top Accent Line */}
                      <div style={{
                        height: '4px',
                        background: cand.yearsExperience && cand.yearsExperience >= 2
                          ? 'linear-gradient(90deg, #10b981 0%, #0d9488 100%)'
                          : 'linear-gradient(90deg, #0d9488 0%, #3b82f6 100%)'
                      }} />

                      <div style={{ padding: '16px 16px 12px 16px' }}>
                        {/* Avatar & Header */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
                          {cand.profilePhotoUrl ? (
                            <img
                              src={cand.profilePhotoUrl}
                              alt={cand.name || 'Candidate'}
                              style={{ width: '48px', height: '48px', borderRadius: '12px', objectFit: 'cover', border: '2px solid #0d9488', flexShrink: 0 }}
                            />
                          ) : (
                            <div style={{
                              width: '48px',
                              height: '48px',
                              borderRadius: '12px',
                              background: 'linear-gradient(135deg, #0d9488 0%, #1e3a8a 100%)',
                              color: '#ffffff',
                              fontWeight: 800,
                              fontSize: '16px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}>
                              {getInitials(cand.name || 'MD')}
                            </div>
                          )}

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                              <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {cand.name || 'Clinical Candidate'}
                              </h3>
                              {cand.yearsExperience != null && (
                                <span style={{
                                  fontSize: '11px',
                                  fontWeight: 800,
                                  padding: '2px 8px',
                                  borderRadius: '9999px',
                                  flexShrink: 0,
                                  background: cand.yearsExperience >= 2 ? '#ecfdf5' : '#f1f5f9',
                                  color: cand.yearsExperience >= 2 ? '#047857' : '#475569',
                                  border: cand.yearsExperience >= 2 ? '1px solid #a7f3d0' : '1px solid #cbd5e1'
                                }}>
                                  {cand.yearsExperience >= 2 ? '🎯 ' : ''}{cand.yearsExperience} yrs exp
                                </span>
                              )}
                            </div>

                            {/* Qualification & Speciality */}
                            <div style={{ fontSize: '12px', fontWeight: 700, color: '#0d9488', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {[cand.qualification, cand.speciality].filter(Boolean).join(' • ') || 'Healthcare Professional'}
                            </div>

                            {/* Current Hospital */}
                            {cand.currentOrganization && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                <Building2 size={12} style={{ flexShrink: 0, color: '#94a3b8' }} />
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cand.currentOrganization}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Location & Preferred Role Box */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(2, 1fr)',
                          gap: '8px',
                          background: '#f8fafc',
                          padding: '9px 11px',
                          borderRadius: '10px',
                          border: '1px solid #f1f5f9',
                          marginBottom: '10px'
                        }}>
                          <div>
                            <span style={{ display: 'block', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#94a3b8', fontWeight: 700 }}>
                              Location
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600, color: '#334155', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              <MapPin size={11} style={{ color: '#64748b', flexShrink: 0 }} />
                              {[cand.currentCity, cand.state].filter(Boolean).join(', ') || 'India'}
                            </span>
                          </div>
                          <div>
                            <span style={{ display: 'block', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#94a3b8', fontWeight: 700 }}>
                              Preferred Role
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600, color: '#334155', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              <Briefcase size={11} style={{ color: '#64748b', flexShrink: 0 }} />
                              {cand.preferredJobRole || 'Clinical Practice'}
                            </span>
                          </div>
                        </div>

                        {/* Skills Chips */}
                        {cand.skills && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
                            {cand.skills.split(',').slice(0, 4).map((s, idx) => (
                              <span key={idx} style={{
                                fontSize: '10px',
                                fontWeight: 600,
                                background: '#eff6ff',
                                color: '#1d4ed8',
                                border: '1px solid #dbeafe',
                                padding: '2px 6px',
                                borderRadius: '5px'
                              }}>
                                {s.trim()}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div style={{
                        padding: '10px 16px',
                        background: '#fafbfc',
                        borderTop: '1px solid #f1f5f9',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        {cand.resumeUrl ? (
                          <a
                            href={cand.resumeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              flex: 1,
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              padding: '8px 12px',
                              borderRadius: '8px',
                              background: '#059669',
                              color: '#ffffff',
                              fontSize: '12px',
                              fontWeight: 700,
                              textDecoration: 'none',
                              boxShadow: '0 2px 6px rgba(5, 150, 105, 0.25)',
                              cursor: 'pointer'
                            }}
                          >
                            <FileText size={13} /> View / Download CV
                          </a>
                        ) : (
                          <span style={{
                            flex: 1,
                            textAlign: 'center',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            background: '#f1f5f9',
                            color: '#94a3b8',
                            fontSize: '11px',
                            fontWeight: 600
                          }}>
                            No CV Uploaded
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => setViewingCandidate(cand)}
                          style={{
                            padding: '8px 12px',
                            borderRadius: '8px',
                            background: '#ffffff',
                            border: '1px solid #cbd5e1',
                            color: '#1e293b',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Eye size={13} /> Full Profile
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Full Candidate Modal */}
              {viewingCandidate && (
                <div
                  style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 99999,
                    backgroundColor: 'rgba(15, 23, 42, 0.65)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '16px'
                  }}
                  onClick={(e) => {
                    if (e.target === e.currentTarget) setViewingCandidate(null);
                  }}
                >
                  <div
                    style={{ maxHeight: '90vh' }}
                    className="w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
                  >
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                      <div className="flex items-center gap-3">
                        {viewingCandidate.profilePhotoUrl ? (
                          <img
                            src={viewingCandidate.profilePhotoUrl}
                            alt={viewingCandidate.name || 'Candidate'}
                            className="w-12 h-12 rounded-xl object-cover border border-teal-300"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-teal-100 text-teal-800 font-bold flex items-center justify-center">
                            {getInitials(viewingCandidate.name || 'Candidate')}
                          </div>
                        )}
                        <div>
                          <h3 className="text-base font-bold text-slate-900">{viewingCandidate.name || 'Candidate'}</h3>
                          <div className="text-xs text-teal-700 font-medium">
                            {[viewingCandidate.qualification, viewingCandidate.speciality].filter(Boolean).join(' • ') || 'Medical Professional'}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setViewingCandidate(null)}
                        className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition cursor-pointer"
                      >
                        <X size={18} />
                      </button>
                    </div>

                    <div className="p-5 overflow-y-auto space-y-4 text-xs">
                      <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl">
                        <div>
                          <span className="text-slate-400 block text-[10px]">Medical Domain</span>
                          <strong className="text-slate-800">{viewingCandidate.medicalCategory || 'Not specified'}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Clinical Experience</span>
                          <strong className="text-slate-800">{viewingCandidate.yearsExperience != null ? `${viewingCandidate.yearsExperience} Years` : 'Not specified'}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Current Organization</span>
                          <strong className="text-slate-800">{viewingCandidate.currentOrganization || 'Not specified'}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Preferred Job Role</span>
                          <strong className="text-slate-800">{viewingCandidate.preferredJobRole || 'Not specified'}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Location</span>
                          <strong className="text-slate-800">{[viewingCandidate.currentCity, viewingCandidate.state].filter(Boolean).join(', ') || 'Not specified'}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Preferred Location</span>
                          <strong className="text-slate-800">{viewingCandidate.preferredLocation || 'Anywhere'}</strong>
                        </div>
                      </div>

                      {/* Registration */}
                      <div className="border border-indigo-100 bg-indigo-50/40 p-3 rounded-xl space-y-1">
                        <div className="text-[11px] font-bold text-indigo-900 flex items-center gap-1.5">
                          <ShieldCheck size={14} className="text-indigo-600" /> Professional Registration Details
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-slate-700 pt-1">
                          <div>Council: <strong>{viewingCandidate.registrationCouncil || '—'}</strong></div>
                          <div>Reg Number: <strong>{viewingCandidate.registrationNumber || '—'}</strong></div>
                          <div>State: <strong>{viewingCandidate.registrationState || '—'}</strong></div>
                          <div>Year: <strong>{viewingCandidate.registrationYear || '—'}</strong></div>
                        </div>
                      </div>

                      {/* Skills */}
                      {viewingCandidate.skills && (
                        <div>
                          <span className="text-slate-400 block text-[10px] mb-1">Key Skills &amp; Procedures</span>
                          <div className="flex flex-wrap gap-1.5">
                            {viewingCandidate.skills.split(',').map((s, idx) => (
                              <span key={idx} className="bg-teal-50 text-teal-800 font-medium px-2 py-0.5 rounded-md text-[11px]">
                                {s.trim()}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Profile Summary */}
                      {viewingCandidate.profileSummary && (
                        <div>
                          <span className="text-slate-400 block text-[10px] mb-1">Summary / CV Intro</span>
                          <p className="bg-slate-50 p-3 rounded-xl text-slate-700 leading-relaxed font-sans">
                            {viewingCandidate.profileSummary}
                          </p>
                        </div>
                      )}

                      {/* Contact Details */}
                      <div className="border border-slate-200 p-3 rounded-xl space-y-2">
                        <div className="text-[11px] font-bold text-slate-800">Contact Candidate</div>
                        <div className="flex flex-wrap gap-4 text-xs text-slate-700">
                          {viewingCandidate.email && (
                            <a href={`mailto:${viewingCandidate.email}`} className="flex items-center gap-1 text-teal-700 font-medium hover:underline">
                              <Mail size={13} /> {viewingCandidate.email}
                            </a>
                          )}
                          {viewingCandidate.phone && (
                            <a href={`tel:${viewingCandidate.phone}`} className="flex items-center gap-1 text-teal-700 font-medium hover:underline">
                              <Phone size={13} /> {viewingCandidate.phone}
                            </a>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setViewingCandidate(null)}
                        className="text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                      >
                        Close
                      </button>
                      {viewingCandidate.resumeUrl && (
                        <a
                          href={viewingCandidate.resumeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 transition"
                        >
                          <Download size={14} /> Download CV / Resume
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}

          {activeSection === 'jobs' && (
            <section className="mx-company">
              <div className="mx-company__logo"><Building2 size={26} /></div>
              <div className="mx-company__info">
                <h3>
                  {employer.companyName}
                  {verified && <span className="mx-company__verified"><CheckCircle size={13} /> Verified</span>}
                </h3>
                <p>
                  {[employer.companyType, [employer.city, employer.state].filter(Boolean).join(', ')]
                    .filter(Boolean)
                    .join(' · ') || 'Company details not added'}
                </p>
                <p className="mx-company__contact">
                  <Mail size={13} />{employer.userEmail}
                  {employer.website && <><Globe size={13} />{employer.website}</>}
                </p>
              </div>
              <div className="mx-company__tags">
                <span>{myJobs.length} job{myJobs.length === 1 ? '' : 's'} posted</span>
                <span>{activeJobs} active</span>
                <span>{totalApplications} application{totalApplications === 1 ? '' : 's'}</span>
              </div>
              <button type="button" className="mx-btn-outline" onClick={() => onNavigate('profile')}>
                <Edit size={14} /> Edit Profile
              </button>
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
                <div className="mx-notiflist">
                  {notifications.slice(0, 8).map((notification: any) => (
                    <article className={notification.read ? '' : 'is-unread'} key={notification.id}>
                      <span className="mx-notiflist__icon"><Bell size={15} /></span>
                      <div>
                        <p>{notification.message}</p>
                        <small>{formatDate(notification.createdAt)}</small>
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
            <h3>Schedule Interview</h3>
            <p className="employer-modal__candidate-info">
              Candidate: <strong>{interviewDraft.application.candidateName}</strong> · Job: <strong>{interviewDraft.application.jobTitle || 'this job'}</strong>
            </p>
            <label className="employer-modal__field">
              <span>Interview Date & Time *</span>
              <input
                type="datetime-local"
                value={interviewDraft.date}
                onChange={(event) => setInterviewDraft({ ...interviewDraft, date: event.target.value })}
                required
              />
            </label>
            <label className="employer-modal__field">
              <span>Meeting Link (Google Meet / Zoom / Location)</span>
              <input
                type="text"
                placeholder="e.g. https://meet.google.com/xyz-abcd-efg or Zoom link"
                value={interviewDraft.link || ''}
                onChange={(event) => setInterviewDraft({ ...interviewDraft, link: event.target.value })}
              />
            </label>
            <label className="employer-modal__field">
              <span>Instructions / Notes for Candidate</span>
              <textarea
                placeholder="e.g. Please join 5 mins before time and keep your original certificates ready."
                value={interviewDraft.notes || ''}
                onChange={(event) => setInterviewDraft({ ...interviewDraft, notes: event.target.value })}
              />
            </label>
            <div className="employer-modal__actions">
              <button type="button" className="dashboard-outline-button" onClick={() => setInterviewDraft(null)}>Cancel</button>
              <button
                type="button"
                className="dashboard-primary-button"
                disabled={!interviewDraft.date || updatingApplicationId === interviewDraft.application.id}
                onClick={() => handleUpdateStatus(
                  interviewDraft.application,
                  'interview',
                  interviewDraft.date,
                  interviewDraft.link,
                  interviewDraft.notes
                )}
              >
                Confirm & Send Invite
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
