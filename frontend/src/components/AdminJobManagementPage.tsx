import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Mail,
  Phone,
  Video,
  ExternalLink,
  Calendar,
  Search,
  Building2,
  MapPin,
  Users,
  Wallet,
  ArrowRight,
  MoreVertical,
  Copy,
  Filter,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Briefcase,
  Award,
  GraduationCap,
  Sparkles,
} from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Label } from "./ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "./ui/dropdown-menu";
import { JobCategory, JobSector } from "../types";
import {
  fetchAdminJobs,
  deleteAdminJob,
  updateAdminJobStatus,
  publishAdminJob,
  createSampleJob,
} from "../api/jobs";
import {
  fetchApplications,
  updateApplicationStatus,
} from "../api/applications";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";
import "../styles/admin-job-management-premium.css";

// Interface for Job representation in Admin View
interface Job {
  id: string;
  employerId?: string;
  title: string;
  organization: string;
  sector: JobSector;
  category: JobCategory;
  jobRoles?: string[] | string;
  location: string;
  qualification: string;
  experience: string;
  numberOfPosts: number;
  salary: string;
  description: string;
  lastDate: string;
  postedDate: string;
  status: "active" | "closed" | "pending" | "draft";
  featured?: boolean;
  views: number;
  applications: number;
  pdfUrl?: string;
  applyLink?: string;
  officialWebsite?: string;
  contactEmail?: string;
  contactPhone?: string;
  requirements?: string;
  benefits?: string;
  speciality?: string;
  department?: string;
}

interface AdminJobManagementPageProps {
  onNavigate: (page: string, entityId?: string) => void;
}

export function AdminJobManagementPage({
  onNavigate,
}: AdminJobManagementPageProps) {
  const { token } = useAuth();
  const navigate = useNavigate();

  // Primary data state
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [appLoading, setAppLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Active view switcher ('jobs' default, 'applications' tab)
  const [activeView, setActiveView] = useState<"jobs" | "applications">("jobs");

  // Jobs filtering & sorting state
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterSector, setFilterSector] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("latest");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Applications filtering & sorting state
  const [appSearchTerm, setAppSearchTerm] = useState("");
  const [appFilterStatus, setAppFilterStatus] = useState<string>("all");
  const [appSortBy, setAppSortBy] = useState<string>("latest");
  const [appCurrentPage, setAppCurrentPage] = useState(1);

  // Modals state
  const [previewJob, setPreviewJob] = useState<Job | null>(null);
  const [selectedAppForDetails, setSelectedAppForDetails] = useState<any | null>(null);
  const [interviewModalApp, setInterviewModalApp] = useState<any | null>(null);
  const [interviewDate, setInterviewDate] = useState("");
  const [interviewLink, setInterviewLink] = useState("");

  // Load all jobs for admin
  const loadJobs = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAdminJobs({
        size: 1000,
        sort: "createdAt,desc",
      });
      const allJobs: Job[] = (data?.content || []).map((job: any) => ({
        ...job,
        employerId: job.employerId,
        lastDate: job.lastDate,
        postedDate: job.postedDate || job.createdAt,
        organization: job.organization || job.companyName || "Medical Institution",
        numberOfPosts: job.numberOfPosts ?? 1,
        salary: job.salary || job.salaryRange || "",
      }));
      setJobs(allJobs);
    } catch (e: any) {
      setError(`Failed to fetch jobs: ${e.message || "Unknown error"}`);
      console.error("Error fetching jobs:", e);
    } finally {
      setLoading(false);
    }
  };

  // Load candidate applications
  const loadApplications = async () => {
    setAppLoading(true);
    try {
      if (!token) throw new Error("Authentication token not found.");
      const data = await fetchApplications(
        { size: 200, sort: "appliedDate,desc" },
        token
      );
      setApplications(data?.content || []);
    } catch (e: any) {
      console.error("Error fetching applications:", e);
    } finally {
      setAppLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
    loadApplications();
  }, []);

  // Reset pagination when job filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, filterSector, filterCategory, sortBy]);

  // Reset pagination when application filters change
  useEffect(() => {
    setAppCurrentPage(1);
  }, [appSearchTerm, appFilterStatus, appSortBy]);

  // Date formatting helper: DD/MM/YYYY
  const formatDateDMY = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return dateStr;
    }
  };

  // Helper: check if a job is closing soon (within 7 days)
  const isClosingSoon = (job: Job) => {
    if (job.status !== "active") return false;
    try {
      const last = new Date(job.lastDate).getTime();
      const now = Date.now();
      const diffDays = (last - now) / (1000 * 60 * 60 * 24);
      return diffDays >= 0 && diffDays <= 7;
    } catch {
      return false;
    }
  };

  // Helper: check if a job is closed or expired
  const isJobClosedOrExpired = (job: Job) => {
    if (job.status === "closed") return true;
    try {
      const last = new Date(job.lastDate).getTime();
      return last < Date.now() - 86400000;
    } catch {
      return false;
    }
  };

  // Duplicate detection for jobs
  const duplicateJobIds = useMemo(() => {
    const map = new Map<string, string[]>();
    jobs.forEach((j) => {
      const key = `${(j.title || "").trim().toLowerCase()}__${(j.organization || "").trim().toLowerCase()}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(j.id);
    });
    const dupeIds = new Set<string>();
    map.forEach((ids) => {
      if (ids.length > 1) {
        ids.forEach((id) => dupeIds.add(id));
      }
    });
    return dupeIds;
  }, [jobs]);

  // Metric counts for the 4 top summary cards (Jobs View)
  const summaryMetrics = useMemo(() => {
    const total = jobs.length;
    const active = jobs.filter(
      (j) => j.status === "active" && !isJobClosedOrExpired(j)
    ).length;
    const upcomingOrClosing = jobs.filter(
      (j) => isClosingSoon(j) || j.status === "pending"
    ).length;
    const closedOrExpired = jobs.filter((j) => isJobClosedOrExpired(j)).length;

    return {
      total,
      active,
      upcomingOrClosing,
      closedOrExpired,
    };
  }, [jobs]);

  // Metric counts for the 4 top summary cards (Applications View)
  const appSummaryMetrics = useMemo(() => {
    const total = applications.length;
    const shortlisted = applications.filter((a) => a.status === "shortlisted").length;
    const interviews = applications.filter(
      (a) => a.status === "interview" || a.interviewDate
    ).length;
    const selected = applications.filter(
      (a) => a.status === "selected" || a.status === "hired"
    ).length;

    return {
      total,
      shortlisted,
      interviews,
      selected,
    };
  }, [applications]);

  // Filtered and Sorted Jobs
  const filteredAndSortedJobs = useMemo(() => {
    return jobs
      .filter((job) => {
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const matchTitle = job.title?.toLowerCase().includes(q);
          const matchOrg = job.organization?.toLowerCase().includes(q);
          const matchLoc = job.location?.toLowerCase().includes(q);
          const matchCat = job.category?.toLowerCase().includes(q);
          const matchQual = job.qualification?.toLowerCase().includes(q);
          if (!matchTitle && !matchOrg && !matchLoc && !matchCat && !matchQual) {
            return false;
          }
        }

        if (filterStatus === "active") {
          if (job.status !== "active" || isJobClosedOrExpired(job)) return false;
        } else if (filterStatus === "closing_soon") {
          if (!isClosingSoon(job)) return false;
        } else if (filterStatus === "upcoming") {
          if (job.status !== "pending") return false;
        } else if (filterStatus === "closed") {
          if (!isJobClosedOrExpired(job)) return false;
        } else if (filterStatus === "draft") {
          if (job.status !== "draft") return false;
        }

        if (filterSector !== "all" && job.sector !== filterSector) {
          return false;
        }

        if (filterCategory !== "all" && job.category !== filterCategory) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "latest") {
          return new Date(b.postedDate).getTime() - new Date(a.postedDate).getTime();
        }
        if (sortBy === "closing_soon") {
          return new Date(a.lastDate).getTime() - new Date(b.lastDate).getTime();
        }
        if (sortBy === "posts_high") {
          return (b.numberOfPosts || 1) - (a.numberOfPosts || 1);
        }
        if (sortBy === "views") {
          return (b.views || 0) - (a.views || 0);
        }
        return 0;
      });
  }, [jobs, searchTerm, filterStatus, filterSector, filterCategory, sortBy]);

  // Paginated jobs slice
  const totalPages = Math.ceil(filteredAndSortedJobs.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedJobs = filteredAndSortedJobs.slice(
    startIndex,
    startIndex + pageSize
  );

  // Filtered and Sorted Applications
  const filteredAndSortedApplications = useMemo(() => {
    return applications
      .filter((app) => {
        if (appSearchTerm.trim()) {
          const q = appSearchTerm.toLowerCase();
          const matchName = app.candidateName?.toLowerCase().includes(q);
          const matchEmail = app.candidateEmail?.toLowerCase().includes(q);
          const matchPhone = app.candidatePhone?.toLowerCase().includes(q);
          const matchJob = app.jobTitle?.toLowerCase().includes(q);
          const matchOrg = app.jobOrganization?.toLowerCase().includes(q);
          const matchSpec = app.candidateSpeciality?.toLowerCase().includes(q);
          if (!matchName && !matchEmail && !matchPhone && !matchJob && !matchOrg && !matchSpec) {
            return false;
          }
        }

        if (appFilterStatus !== "all") {
          if (appFilterStatus === "pending") {
            if (app.status !== "pending" && app.status !== "applied") return false;
          } else if (appFilterStatus === "interview") {
            if (app.status !== "interview" && !app.interviewDate) return false;
          } else if (app.status !== appFilterStatus) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (appSortBy === "latest") {
          return new Date(b.appliedDate).getTime() - new Date(a.appliedDate).getTime();
        }
        if (appSortBy === "name_asc") {
          return (a.candidateName || "").localeCompare(b.candidateName || "");
        }
        if (appSortBy === "exp_high") {
          return (b.candidateYearsExperience || 0) - (a.candidateYearsExperience || 0);
        }
        return 0;
      });
  }, [applications, appSearchTerm, appFilterStatus, appSortBy]);

  // Paginated applications slice
  const appTotalPages = Math.ceil(filteredAndSortedApplications.length / pageSize) || 1;
  const appStartIndex = (appCurrentPage - 1) * pageSize;
  const paginatedApplications = filteredAndSortedApplications.slice(
    appStartIndex,
    appStartIndex + pageSize
  );

  // Helper to generate page numbers with ellipsis
  const getPageNumbers = (current: number, total: number) => {
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    if (current <= 4) {
      return [1, 2, 3, 4, 5, "...", total];
    }
    if (current >= total - 3) {
      return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
    }
    return [1, "...", current - 1, current, current + 1, "...", total];
  };

  // Job card accents
  const getCardAccentClass = (job: Job, index: number) => {
    if (isJobClosedOrExpired(job)) {
      return index % 2 === 0 ? "accent-orange" : "accent-red";
    }
    if (isClosingSoon(job)) {
      return "accent-orange";
    }
    if (job.status === "pending") {
      return "accent-blue";
    }
    if (job.status === "draft") {
      return "accent-gray";
    }
    const accents = ["accent-green", "accent-blue", "accent-purple"];
    return accents[index % accents.length];
  };

  // Application card accents
  const getAppAccentClass = (app: any) => {
    const status = (app.status || "").toLowerCase();
    if (status === "shortlisted") return "accent-green";
    if (status === "interview") return "accent-purple";
    if (status === "selected" || status === "hired") return "accent-green";
    if (status === "rejected") return "accent-red";
    return "accent-blue";
  };

  // Job status badge
  const renderStatusBadge = (job: Job) => {
    if (job.status === "draft") {
      return <span className="admin-jm-badge admin-jm-badge-draft">Draft</span>;
    }
    if (isJobClosedOrExpired(job)) {
      return <span className="admin-jm-badge admin-jm-badge-closed">Closed</span>;
    }
    if (isClosingSoon(job)) {
      return <span className="admin-jm-badge admin-jm-badge-closing">Closing Soon</span>;
    }
    if (job.status === "pending") {
      return <span className="admin-jm-badge admin-jm-badge-upcoming">Upcoming</span>;
    }
    return <span className="admin-jm-badge admin-jm-badge-active">Active</span>;
  };

  // Application status badge
  const renderAppStatusBadge = (app: any) => {
    const status = (app.status || "").toLowerCase();
    if (status === "shortlisted") {
      return <span className="admin-jm-badge admin-jm-badge-shortlisted">Shortlisted</span>;
    }
    if (status === "interview") {
      return <span className="admin-jm-badge admin-jm-badge-interview">Interview</span>;
    }
    if (status === "selected" || status === "hired") {
      return <span className="admin-jm-badge admin-jm-badge-selected">Selected</span>;
    }
    if (status === "rejected") {
      return <span className="admin-jm-badge admin-jm-badge-rejected">Rejected</span>;
    }
    return <span className="admin-jm-badge admin-jm-badge-upcoming">Applied</span>;
  };

  // Candidate avatar initials
  const getCandidateInitials = (name?: string) => {
    if (!name) return "MD";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Metadata Sub-row extractors for Job
  const getPostName = (job: Job) => {
    if (job.jobRoles) {
      if (Array.isArray(job.jobRoles) && job.jobRoles.length > 0) {
        return job.jobRoles[0];
      }
      if (typeof job.jobRoles === "string" && job.jobRoles.trim()) {
        return job.jobRoles.split(",")[0].trim();
      }
    }
    if (job.title.includes("(")) {
      return job.title.split("(")[0].trim();
    }
    return job.category || "Medical Officer";
  };

  const getPayLevel = (job: Job) => {
    const text = `${job.salary || ""} ${job.description || ""} ${job.requirements || ""}`.toLowerCase();
    const levelMatch = text.match(/level\s*\d+/i);
    if (levelMatch) return levelMatch[0].toUpperCase();
    if (text.includes("7th cpc")) return "7th CPC";
    if (text.includes("consolidated")) return "Consolidated";
    if (job.salary && (job.salary.includes("₹") || text.includes("per month") || text.includes("/-"))) {
      return "Consolidated";
    }
    return "As per rules";
  };

  const getAgeLimit = (job: Job) => {
    const text = `${job.requirements || ""} ${job.description || ""}`.toLowerCase();
    const ageMatch =
      text.match(/(\d{2}\s*-\s*\d{2}\s*years?)/i) ||
      text.match(/(up\s*to\s*\d{2}\s*years?)/i) ||
      text.match(/(max\s*\d{2}\s*years?)/i);
    if (ageMatch) return ageMatch[0];
    return "As per rules";
  };

  const getJobMode = (job: Job) => {
    const text = `${job.title} ${job.description || ""} ${job.requirements || ""}`.toLowerCase();
    if (text.includes("walk-in") || text.includes("walk in")) return "Walk-in";
    if (text.includes("online")) return "Online";
    return "Offline";
  };

  const getJobChips = (job: Job) => {
    const chips: string[] = [];
    if (job.category) chips.push(`#${job.category}`);
    if (job.department && job.department !== job.category) chips.push(`#${job.department}`);
    chips.push(job.sector === "government" ? "#Government" : "#Private");
    if (job.speciality) chips.push(`#${job.speciality}`);
    return chips.slice(0, 3);
  };

  // Handlers for Jobs
  const handleCreateNewJob = () => {
    onNavigate("admin-post-job");
  };

  const handleQuickAddSampleJob = async () => {
    if (!window.confirm("क्या आप एक Sample Job add करना चाहते हैं?")) return;

    setLoading(true);
    setError(null);
    try {
      if (!token) throw new Error("Authentication token not found.");
      await createSampleJob();
      toast.success("Sample job successfully added! 🎉");
      loadJobs();
    } catch (e: any) {
      const errorMsg = e.error || e.message || "Failed to create sample job";
      setError(`Failed to add sample job: ${errorMsg}`);
      toast.error(`Error: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEditJob = (job: Job) => {
    navigate(`/admin/jobs/edit/${job.id}`);
  };

  const handleViewDetails = (job: Job) => {
    onNavigate("job-detail", job.id);
  };

  const handleDeleteJob = async (jobId: string) => {
    if (!window.confirm("Are you sure you want to delete this job posting?")) return;

    try {
      if (!token) throw new Error("Authentication token not found.");
      await deleteAdminJob(jobId);
      setJobs((prev) => prev.filter((j) => j.id !== jobId));
      toast.success("Job deleted successfully!");
    } catch (e: any) {
      const errorMsg = e.error || e.message || "Failed to delete job";
      toast.error(`Error deleting job: ${errorMsg}`);
    }
  };

  const handleUpdateJobStatus = async (
    jobId: string,
    newStatus: Job["status"]
  ) => {
    try {
      if (!token) throw new Error("Authentication token not found.");
      await updateAdminJobStatus(jobId, newStatus);
      setJobs((prev) =>
        prev.map((j) => (j.id === jobId ? { ...j, status: newStatus } : j))
      );
      toast.success(`Job status changed to ${newStatus}!`);
    } catch (e: any) {
      const errorMsg = e.error || e.message || "Failed to update status";
      toast.error(`Error: ${errorMsg}`);
    }
  };

  const handlePublishJob = async (jobId: string) => {
    try {
      if (!token) throw new Error("Authentication token not found.");
      await publishAdminJob(jobId);
      setJobs((prev) =>
        prev.map((j) => (j.id === jobId ? { ...j, status: "active" } : j))
      );
      toast.success("Job published successfully!");
    } catch (e: any) {
      const errorMsg = e.error || e.message || "Failed to publish job";
      toast.error(`Error: ${errorMsg}`);
    }
  };

  const handleCopyJobLink = (jobId: string) => {
    const url = `${window.location.origin}/job-detail/${jobId}`;
    navigator.clipboard.writeText(url);
    toast.success("Job link copied to clipboard!");
  };

  // Handlers for Applications
  const handleUpdateAppStatus = async (
    appId: string,
    newStatus: string,
    dateToSave?: string | null,
    linkToSave?: string | null
  ) => {
    try {
      if (!token) throw new Error("Authentication token not found.");
      await updateApplicationStatus(
        appId,
        newStatus,
        token,
        undefined,
        dateToSave !== undefined ? dateToSave : undefined,
        linkToSave !== undefined ? linkToSave : undefined
      );
      toast.success(`Application status updated to ${newStatus}!`);
      loadApplications();
      setInterviewModalApp(null);
    } catch (e: any) {
      console.error("Error updating application status:", e);
      toast.error(`Error: ${e.message}`);
    }
  };

  const handleOpenInterviewModal = (app: any) => {
    setInterviewModalApp(app);
    setInterviewDate(app.interviewDate ? app.interviewDate.slice(0, 16) : "");
    setInterviewLink(app.interviewLink || "");
  };

  const handleSaveInterviewSchedule = async () => {
    if (!interviewModalApp) return;
    await handleUpdateAppStatus(
      interviewModalApp.id,
      "interview",
      interviewDate || null,
      interviewLink || null
    );
  };

  return (
    <div className="admin-jm-container">
      <div className="admin-jm-wrapper">
        {/* Top Header matching Image 2 */}
        <div className="admin-jm-header">
          <div className="admin-jm-header-left">
            <div className="admin-jm-header-icon-box">
              <Briefcase className="w-6 h-6" />
            </div>
            <div>
              <h1 className="admin-jm-header-title">Job Management</h1>
              <p className="admin-jm-header-subtitle">
                Manage jobs and applications on MedExJob.com
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* View Switcher: Toggle between Jobs and Applications */}
            <div className="inline-flex bg-slate-100 p-1 rounded-lg border border-slate-200/80">
              <button
                type="button"
                onClick={() => setActiveView("jobs")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  activeView === "jobs"
                    ? "bg-white text-blue-600 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Jobs ({jobs.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveView("applications");
                  loadApplications();
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  activeView === "applications"
                    ? "bg-white text-blue-600 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Applications ({applications.length})
              </button>
            </div>

            {/* Right Action Buttons */}
            <div className="admin-jm-header-actions">
              <button
                type="button"
                onClick={handleCreateNewJob}
                className="admin-jm-btn-primary"
              >
                <Plus className="w-4 h-4" />
                Create New Job
              </button>
              <button
                type="button"
                onClick={handleQuickAddSampleJob}
                disabled={loading}
                className="admin-jm-btn-secondary"
              >
                <Plus className="w-4 h-4" />
                Quick Add Sample
              </button>
            </div>
          </div>
        </div>

        {activeView === "jobs" ? (
          <>
            {/* 4 Summary Cards (Jobs) */}
            <div className="admin-jm-stats-grid">
              {/* Total Jobs */}
              <div
                className={`admin-jm-stat-card ${
                  filterStatus === "all" ? "active-filter" : ""
                }`}
                onClick={() => setFilterStatus("all")}
                title="Click to view all jobs"
              >
                <div className="admin-jm-stat-icon-wrapper admin-jm-stat-icon-blue">
                  <Briefcase className="w-6 h-6" />
                </div>
                <div className="admin-jm-stat-content">
                  <span className="admin-jm-stat-label">Total Jobs</span>
                  <span className="admin-jm-stat-value">
                    {summaryMetrics.total}
                  </span>
                </div>
              </div>

              {/* Active Jobs */}
              <div
                className={`admin-jm-stat-card ${
                  filterStatus === "active" ? "active-filter" : ""
                }`}
                onClick={() => setFilterStatus("active")}
                title="Click to filter Active jobs"
              >
                <div className="admin-jm-stat-icon-wrapper admin-jm-stat-icon-green">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <div className="admin-jm-stat-content">
                  <span className="admin-jm-stat-label">Active Jobs</span>
                  <span className="admin-jm-stat-value text-emerald-600">
                    {summaryMetrics.active}
                  </span>
                </div>
              </div>

              {/* Upcoming / Closing Soon */}
              <div
                className={`admin-jm-stat-card ${
                  filterStatus === "closing_soon" ? "active-filter" : ""
                }`}
                onClick={() => setFilterStatus("closing_soon")}
                title="Click to filter Upcoming & Closing Soon jobs"
              >
                <div className="admin-jm-stat-icon-wrapper admin-jm-stat-icon-orange">
                  <Clock className="w-6 h-6" />
                </div>
                <div className="admin-jm-stat-content">
                  <span className="admin-jm-stat-label">Upcoming / Closing Soon</span>
                  <span className="admin-jm-stat-value text-amber-600">
                    {summaryMetrics.upcomingOrClosing}
                  </span>
                </div>
              </div>

              {/* Expired / Closed */}
              <div
                className={`admin-jm-stat-card ${
                  filterStatus === "closed" ? "active-filter" : ""
                }`}
                onClick={() => setFilterStatus("closed")}
                title="Click to filter Expired / Closed jobs"
              >
                <div className="admin-jm-stat-icon-wrapper admin-jm-stat-icon-red">
                  <XCircle className="w-6 h-6" />
                </div>
                <div className="admin-jm-stat-content">
                  <span className="admin-jm-stat-label">Expired / Closed</span>
                  <span className="admin-jm-stat-value text-rose-600">
                    {summaryMetrics.closedOrExpired}
                  </span>
                </div>
              </div>
            </div>

            {/* Search & Unified Filter Bar (Jobs) */}
            <div className="admin-jm-filter-container">
              <div className="admin-jm-filter-row">
                {/* Search Input */}
                <div className="admin-jm-search-box">
                  <Search className="admin-jm-search-icon" />
                  <input
                    type="text"
                    placeholder="Search by title, organization, location..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="admin-jm-search-input"
                  />
                </div>

                {/* Dropdowns + Filter Button */}
                <div className="admin-jm-filter-selects">
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="admin-jm-select-trigger">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="closing_soon">Closing Soon</SelectItem>
                      <SelectItem value="upcoming">Upcoming</SelectItem>
                      <SelectItem value="closed">Closed / Expired</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={filterSector} onValueChange={setFilterSector}>
                    <SelectTrigger className="admin-jm-select-trigger">
                      <SelectValue placeholder="All Jobs" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Jobs</SelectItem>
                      <SelectItem value="government">Government Jobs</SelectItem>
                      <SelectItem value="private">Private Jobs</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={filterCategory}
                    onValueChange={setFilterCategory}
                  >
                    <SelectTrigger className="admin-jm-select-trigger">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="Junior Resident">Junior Resident</SelectItem>
                      <SelectItem value="Senior Resident">Senior Resident</SelectItem>
                      <SelectItem value="Medical Officer">Medical Officer</SelectItem>
                      <SelectItem value="Faculty">Faculty</SelectItem>
                      <SelectItem value="Specialist">Specialist</SelectItem>
                      <SelectItem value="Consultant">Consultant</SelectItem>
                      <SelectItem value="Dental">Dental</SelectItem>
                      <SelectItem value="AYUSH">AYUSH</SelectItem>
                      <SelectItem value="Nursing">Nursing</SelectItem>
                      <SelectItem value="Paramedical">Paramedical</SelectItem>
                    </SelectContent>
                  </Select>

                  <button
                    type="button"
                    onClick={loadJobs}
                    className="admin-jm-btn-filter"
                  >
                    <Filter className="w-4 h-4 mr-1" />
                    Filter
                  </button>

                  {(searchTerm ||
                    filterStatus !== "all" ||
                    filterSector !== "all" ||
                    filterCategory !== "all") && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchTerm("");
                        setFilterStatus("all");
                        setFilterSector("all");
                        setFilterCategory("all");
                      }}
                      className="text-xs font-semibold text-rose-600 hover:text-rose-800 underline px-2 py-1"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Meta Row: Count + Sort dropdown (Jobs) */}
            <div className="admin-jm-meta-bar">
              <div className="admin-jm-meta-count">
                Showing {filteredAndSortedJobs.length > 0 ? startIndex + 1 : 0} -{" "}
                {Math.min(startIndex + pageSize, filteredAndSortedJobs.length)} of{" "}
                {filteredAndSortedJobs.length} active jobs
              </div>

              <div className="admin-jm-meta-sort">
                <span>Sort by:</span>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[170px] h-8 text-xs font-medium bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="latest">Latest Posted</SelectItem>
                    <SelectItem value="closing_soon">Closing Soonest</SelectItem>
                    <SelectItem value="posts_high">Most Vacancies</SelectItem>
                    <SelectItem value="views">Most Views</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Loading Indicator */}
            {loading && (
              <div className="flex justify-center items-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                <span className="ml-3 text-base font-medium text-slate-700">
                  Loading jobs...
                </span>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                <div className="text-sm font-medium">{error}</div>
              </div>
            )}

            {/* Empty State */}
            {!loading && filteredAndSortedJobs.length === 0 && !error && (
              <div className="admin-jm-empty-card">
                <Eye className="admin-jm-empty-icon" />
                <h3 className="admin-jm-empty-title">No jobs found</h3>
                <p className="admin-jm-empty-subtitle">
                  {searchTerm ||
                  filterStatus !== "all" ||
                  filterSector !== "all" ||
                  filterCategory !== "all"
                    ? "Try adjusting your search criteria or resetting filters."
                    : "No jobs are currently available. Start by creating a new job posting."}
                </p>
                <button
                  type="button"
                  onClick={handleCreateNewJob}
                  className="admin-jm-btn-primary"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Create Your First Job
                </button>
              </div>
            )}

            {/* Job Cards List matching Image 2 */}
            {!loading && paginatedJobs.length > 0 && (
              <div className="admin-jm-card-list">
                {paginatedJobs.map((job, index) => {
                  const isClosed = isJobClosedOrExpired(job);
                  const isDupe = duplicateJobIds.has(job.id);
                  const accentClass = getCardAccentClass(job, startIndex + index);

                  return (
                    <div
                      key={job.id}
                      className={`admin-jm-card ${accentClass}`}
                    >
                      <div className="admin-jm-card-inner">
                        {/* Left Main Content */}
                        <div className="admin-jm-card-left">
                          {/* Row 1: Title + Badges */}
                          <div className="admin-jm-card-header">
                            <h3
                              onClick={() => handleViewDetails(job)}
                              className="admin-jm-card-title cursor-pointer"
                              title="Click to view details"
                            >
                              {job.title}
                            </h3>
                            {renderStatusBadge(job)}
                            {job.featured && (
                              <span className="admin-jm-badge admin-jm-badge-featured">
                                Featured
                              </span>
                            )}
                            {isDupe && (
                              <span
                                className="admin-jm-badge admin-jm-badge-dupe"
                                title="Duplicate job title and organization found"
                              >
                                Potential Duplicate
                              </span>
                            )}
                          </div>

                          {/* Row 2: Organization + Location */}
                          <div className="admin-jm-card-org-loc">
                            <div className="admin-jm-card-org">
                              <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                              <span>{job.organization}</span>
                            </div>
                            <div className="admin-jm-card-loc">
                              <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                              <span>{job.location}</span>
                            </div>
                          </div>

                          {/* Row 3: Metrics (Vacancies, Salary, Last Date) */}
                          <div className="admin-jm-card-metrics">
                            <div className="admin-jm-metric-item">
                              <Users className="w-4 h-4 text-slate-400 shrink-0" />
                              <span>
                                Vacancies: <strong>{job.numberOfPosts}</strong>
                              </span>
                            </div>
                            <div className="admin-jm-metric-item">
                              <Wallet className="w-4 h-4 text-slate-400 shrink-0" />
                              <span>
                                Salary:{" "}
                                <strong>
                                  {job.salary || "As per rules"}
                                </strong>
                              </span>
                            </div>
                            <div className="admin-jm-metric-item">
                              <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                              <span>
                                Last Date:{" "}
                                <strong>{formatDateDMY(job.lastDate)}</strong>
                              </span>
                            </div>
                          </div>

                          {/* Row 4: Subtle Sub-row box */}
                          <div className="admin-jm-card-meta-box">
                            <div className="admin-jm-meta-field">
                              <span>Post:</span>
                              <span className="value">{getPostName(job)}</span>
                            </div>
                            <div className="admin-jm-meta-field">
                              <span>Pay Level:</span>
                              <span className="value">{getPayLevel(job)}</span>
                            </div>
                            <div className="admin-jm-meta-field">
                              <span>Age:</span>
                              <span className="value">{getAgeLimit(job)}</span>
                            </div>
                            <div className="admin-jm-meta-field">
                              <span>Mode:</span>
                              <span className="value">{getJobMode(job)}</span>
                            </div>
                          </div>

                          {/* Row 5: Tags / Chips */}
                          <div className="admin-jm-card-tags">
                            {getJobChips(job).map((chip, cIdx) => (
                              <span key={cIdx} className="admin-jm-tag-chip">
                                {chip}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Right Action Column matching Image 2 */}
                        <div className="admin-jm-card-right">
                          <div className="admin-jm-card-posted">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>Posted: {formatDateDMY(job.postedDate)}</span>
                          </div>

                          {/* Primary View Details Button */}
                          <button
                            type="button"
                            onClick={() => handleViewDetails(job)}
                            className={`admin-jm-btn-view ${
                              isClosed ? "closed" : ""
                            }`}
                          >
                            View Details
                            <ArrowRight className="w-4 h-4" />
                          </button>

                          {/* Sub-actions: Edit button + 3-dot dropdown */}
                          <div className="admin-jm-card-subactions">
                            <button
                              type="button"
                              onClick={() => handleEditJob(job)}
                              className="admin-jm-btn-edit"
                              title="Edit Job Posting"
                            >
                              <Edit className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  type="button"
                                  className="admin-jm-btn-dots"
                                  title="More options"
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem
                                  onClick={() => setPreviewJob(job)}
                                  className="cursor-pointer"
                                >
                                  <Eye className="w-4 h-4 mr-2 text-slate-500" />
                                  Quick Preview
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                  onClick={() => handleCopyJobLink(job.id)}
                                  className="cursor-pointer"
                                >
                                  <Copy className="w-4 h-4 mr-2 text-slate-500" />
                                  Copy Public Link
                                </DropdownMenuItem>

                                {(job.status === "draft" ||
                                  job.status === "pending") && (
                                  <DropdownMenuItem
                                    onClick={() => handlePublishJob(job.id)}
                                    className="cursor-pointer text-emerald-600 focus:text-emerald-700 font-medium"
                                  >
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Publish Job
                                  </DropdownMenuItem>
                                )}

                                <DropdownMenuSeparator />

                                <div className="px-2 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                                  Change Status
                                </div>
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleUpdateJobStatus(job.id, "active")
                                  }
                                  className="cursor-pointer text-xs"
                                >
                                  Mark as Active
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleUpdateJobStatus(job.id, "closed")
                                  }
                                  className="cursor-pointer text-xs"
                                >
                                  Mark as Closed
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleUpdateJobStatus(job.id, "pending")
                                  }
                                  className="cursor-pointer text-xs"
                                >
                                  Mark as Pending
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleUpdateJobStatus(job.id, "draft")
                                  }
                                  className="cursor-pointer text-xs"
                                >
                                  Mark as Draft
                                </DropdownMenuItem>

                                <DropdownMenuSeparator />

                                <DropdownMenuItem
                                  onClick={() => handleDeleteJob(job.id)}
                                  className="cursor-pointer text-rose-600 focus:text-rose-700"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete Job
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Bottom Pagination Bar (Jobs) */}
            {!loading && filteredAndSortedJobs.length > 0 && (
              <div className="admin-jm-pagination">
                <div className="admin-jm-pagination-info">
                  Showing {startIndex + 1} -{" "}
                  {Math.min(startIndex + pageSize, filteredAndSortedJobs.length)}{" "}
                  of {filteredAndSortedJobs.length} jobs
                </div>

                <div className="admin-jm-pagination-controls">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="admin-jm-page-btn"
                    title="Previous page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {getPageNumbers(currentPage, totalPages).map((p, idx) => {
                    if (p === "...") {
                      return (
                        <span key={`ell-${idx}`} className="admin-jm-page-ellipsis">
                          ...
                        </span>
                      );
                    }
                    const pageNum = Number(p);
                    return (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => setCurrentPage(pageNum)}
                        className={`admin-jm-page-btn ${
                          currentPage === pageNum ? "active" : ""
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={currentPage === totalPages}
                    className="admin-jm-page-btn"
                    title="Next page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          /* ===================================================================
             Applications View (Redesigned with the same SaaS Card Layout & Color System)
             =================================================================== */
          <>
            {/* 4 Summary Cards (Applications) */}
            <div className="admin-jm-stats-grid">
              {/* Total Applications */}
              <div
                className={`admin-jm-stat-card ${
                  appFilterStatus === "all" ? "active-filter" : ""
                }`}
                onClick={() => setAppFilterStatus("all")}
                title="Click to view all applications"
              >
                <div className="admin-jm-stat-icon-wrapper admin-jm-stat-icon-blue">
                  <Users className="w-6 h-6" />
                </div>
                <div className="admin-jm-stat-content">
                  <span className="admin-jm-stat-label">Total Applications</span>
                  <span className="admin-jm-stat-value">
                    {appSummaryMetrics.total}
                  </span>
                </div>
              </div>

              {/* Shortlisted */}
              <div
                className={`admin-jm-stat-card ${
                  appFilterStatus === "shortlisted" ? "active-filter" : ""
                }`}
                onClick={() => setAppFilterStatus("shortlisted")}
                title="Click to filter Shortlisted candidates"
              >
                <div className="admin-jm-stat-icon-wrapper admin-jm-stat-icon-green">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <div className="admin-jm-stat-content">
                  <span className="admin-jm-stat-label">Shortlisted</span>
                  <span className="admin-jm-stat-value text-emerald-600">
                    {appSummaryMetrics.shortlisted}
                  </span>
                </div>
              </div>

              {/* Interviews Scheduled */}
              <div
                className={`admin-jm-stat-card ${
                  appFilterStatus === "interview" ? "active-filter" : ""
                }`}
                onClick={() => setAppFilterStatus("interview")}
                title="Click to filter Interviews Scheduled"
              >
                <div className="admin-jm-stat-icon-wrapper admin-jm-stat-icon-orange">
                  <Video className="w-6 h-6" />
                </div>
                <div className="admin-jm-stat-content">
                  <span className="admin-jm-stat-label">Interviews Scheduled</span>
                  <span className="admin-jm-stat-value text-amber-600">
                    {appSummaryMetrics.interviews}
                  </span>
                </div>
              </div>

              {/* Selected / Hired */}
              <div
                className={`admin-jm-stat-card ${
                  appFilterStatus === "selected" ? "active-filter" : ""
                }`}
                onClick={() => setAppFilterStatus("selected")}
                title="Click to filter Selected candidates"
              >
                <div className="admin-jm-stat-icon-wrapper admin-jm-stat-icon-green" style={{ background: "#16a34a" }}>
                  <Award className="w-6 h-6" />
                </div>
                <div className="admin-jm-stat-content">
                  <span className="admin-jm-stat-label">Selected / Hired</span>
                  <span className="admin-jm-stat-value text-green-600">
                    {appSummaryMetrics.selected}
                  </span>
                </div>
              </div>
            </div>

            {/* Search & Filter Bar (Applications) */}
            <div className="admin-jm-filter-container">
              <div className="admin-jm-filter-row">
                {/* Search Input */}
                <div className="admin-jm-search-box">
                  <Search className="admin-jm-search-icon" />
                  <input
                    type="text"
                    placeholder="Search by candidate name, email, phone, job title..."
                    value={appSearchTerm}
                    onChange={(e) => setAppSearchTerm(e.target.value)}
                    className="admin-jm-search-input"
                  />
                </div>

                {/* Dropdowns + Filter Button */}
                <div className="admin-jm-filter-selects">
                  <Select value={appFilterStatus} onValueChange={setAppFilterStatus}>
                    <SelectTrigger className="admin-jm-select-trigger">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="pending">Applied / Pending</SelectItem>
                      <SelectItem value="shortlisted">Shortlisted</SelectItem>
                      <SelectItem value="interview">Interview</SelectItem>
                      <SelectItem value="selected">Selected</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>

                  <button
                    type="button"
                    onClick={loadApplications}
                    className="admin-jm-btn-filter"
                  >
                    <Filter className="w-4 h-4 mr-1" />
                    Filter
                  </button>

                  {(appSearchTerm || appFilterStatus !== "all") && (
                    <button
                      type="button"
                      onClick={() => {
                        setAppSearchTerm("");
                        setAppFilterStatus("all");
                      }}
                      className="text-xs font-semibold text-rose-600 hover:text-rose-800 underline px-2 py-1"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Meta Row: Count + Sort dropdown (Applications) */}
            <div className="admin-jm-meta-bar">
              <div className="admin-jm-meta-count">
                Showing {filteredAndSortedApplications.length > 0 ? appStartIndex + 1 : 0} -{" "}
                {Math.min(
                  appStartIndex + pageSize,
                  filteredAndSortedApplications.length
                )}{" "}
                of {filteredAndSortedApplications.length} applications
              </div>

              <div className="admin-jm-meta-sort">
                <span>Sort by:</span>
                <Select value={appSortBy} onValueChange={setAppSortBy}>
                  <SelectTrigger className="w-[170px] h-8 text-xs font-medium bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="latest">Latest Applied</SelectItem>
                    <SelectItem value="name_asc">Candidate Name (A-Z)</SelectItem>
                    <SelectItem value="exp_high">Experience (High-Low)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Loading Indicator */}
            {appLoading && (
              <div className="flex justify-center items-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                <span className="ml-3 text-base font-medium text-slate-700">
                  Loading applications...
                </span>
              </div>
            )}

            {/* Empty State */}
            {!appLoading && filteredAndSortedApplications.length === 0 && (
              <div className="admin-jm-empty-card">
                <FileText className="admin-jm-empty-icon" />
                <h3 className="admin-jm-empty-title">No applications found</h3>
                <p className="admin-jm-empty-subtitle">
                  {appSearchTerm || appFilterStatus !== "all"
                    ? "Try adjusting your search query or status filter."
                    : "Candidate applications will appear here once candidates apply."}
                </p>
              </div>
            )}

            {/* Application Cards List (Matching Job Card Layout & Color System) */}
            {!appLoading && paginatedApplications.length > 0 && (
              <div className="admin-jm-card-list">
                {paginatedApplications.map((app) => {
                  const accentClass = getAppAccentClass(app);

                  return (
                    <div
                      key={app.id}
                      className={`admin-jm-card ${accentClass}`}
                    >
                      <div className="admin-jm-card-inner">
                        {/* Left Main Content */}
                        <div className="admin-jm-card-left">
                          {/* Row 1: Candidate Avatar + Name + Badges */}
                          <div className="admin-jm-card-header">
                            <div className="admin-jm-avatar">
                              {getCandidateInitials(app.candidateName)}
                            </div>
                            <h3
                              onClick={() => setSelectedAppForDetails(app)}
                              className="admin-jm-card-title cursor-pointer"
                              title="Click to view candidate details"
                            >
                              {app.candidateName}
                            </h3>
                            {renderAppStatusBadge(app)}

                            {app.interviewDate && (
                              <span className="admin-jm-badge admin-jm-badge-interview flex items-center gap-1">
                                <Video className="w-3 h-3 text-purple-600" />
                                <span>
                                  Interview:{" "}
                                  {new Date(app.interviewDate).toLocaleString([], {
                                    dateStyle: "short",
                                    timeStyle: "short",
                                  })}
                                </span>
                              </span>
                            )}
                          </div>

                          {/* Row 2: Target Job + Organization */}
                          <div className="admin-jm-card-org-loc">
                            <div className="admin-jm-card-org">
                              <Briefcase className="w-4 h-4 text-slate-400 shrink-0" />
                              <span>{app.jobTitle}</span>
                            </div>
                            <div className="admin-jm-card-loc">
                              <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                              <span>{app.jobOrganization}</span>
                            </div>
                            {app.candidateCity && (
                              <div className="admin-jm-card-loc">
                                <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                                <span>{app.candidateCity}</span>
                              </div>
                            )}
                          </div>

                          {/* Row 3: Contact & Applied Date Info */}
                          <div className="admin-jm-card-metrics">
                            <div className="admin-jm-metric-item">
                              <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                              <span>
                                Email: <strong>{app.candidateEmail}</strong>
                              </span>
                            </div>
                            <div className="admin-jm-metric-item">
                              <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                              <span>
                                Phone: <strong>{app.candidatePhone}</strong>
                              </span>
                            </div>
                            <div className="admin-jm-metric-item">
                              <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                              <span>
                                Applied:{" "}
                                <strong>{formatDateDMY(app.appliedDate)}</strong>
                              </span>
                            </div>
                          </div>

                          {/* Row 4: Subtle Sub-row box matching Job Card */}
                          <div className="admin-jm-card-meta-box">
                            <div className="admin-jm-meta-field">
                              <span>Qualification:</span>
                              <span className="value">
                                {app.candidateQualification || "MBBS / Graduate"}
                              </span>
                            </div>
                            <div className="admin-jm-meta-field">
                              <span>Experience:</span>
                              <span className="value">
                                {app.candidateYearsExperience !== undefined &&
                                app.candidateYearsExperience !== null
                                  ? `${app.candidateYearsExperience} Years`
                                  : "As per resume"}
                              </span>
                            </div>
                            <div className="admin-jm-meta-field">
                              <span>Speciality:</span>
                              <span className="value">
                                {app.candidateSpeciality || "General Medicine"}
                              </span>
                            </div>
                            <div className="admin-jm-meta-field">
                              <span>Interview Mode:</span>
                              <span className="value">
                                {app.interviewLink
                                  ? "Online (Video)"
                                  : app.interviewDate
                                  ? "Scheduled"
                                  : "Not Scheduled"}
                              </span>
                            </div>
                          </div>

                          {/* Row 5: Tags / Chips */}
                          <div className="admin-jm-card-tags">
                            <span className="admin-jm-tag-chip">
                              #{(app.status || "APPLIED").toUpperCase()}
                            </span>
                            {app.candidateSpeciality && (
                              <span className="admin-jm-tag-chip">
                                #{app.candidateSpeciality}
                              </span>
                            )}
                            {app.resumeUrl && (
                              <span className="admin-jm-tag-chip" style={{ color: "#047857", backgroundColor: "#ecfdf5", borderColor: "#a7f3d0" }}>
                                #Resume Attached
                              </span>
                            )}
                            {app.interviewLink && (
                              <span className="admin-jm-tag-chip" style={{ color: "#7e22ce", backgroundColor: "#f3e8ff", borderColor: "#e9d5ff" }}>
                                #Video Meeting Link
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Right Action Column matching Job Card */}
                        <div className="admin-jm-card-right">
                          <div className="admin-jm-card-posted">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>Applied: {formatDateDMY(app.appliedDate)}</span>
                          </div>

                          {/* Primary Action Button: View Resume or View Details */}
                          {app.resumeUrl ? (
                            <a
                              href={app.resumeUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="admin-jm-btn-view"
                            >
                              View Resume
                              <FileText className="w-4 h-4" />
                            </a>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setSelectedAppForDetails(app)}
                              className="admin-jm-btn-view"
                            >
                              View Details
                              <ArrowRight className="w-4 h-4" />
                            </button>
                          )}

                          {/* Sub-actions: Schedule Interview Button + 3-dot dropdown */}
                          <div className="admin-jm-card-subactions">
                            <button
                              type="button"
                              onClick={() => handleOpenInterviewModal(app)}
                              className="admin-jm-btn-edit"
                              title="Schedule or update interview"
                            >
                              <Video className="w-3.5 h-3.5 text-purple-600" />
                              <span>Schedule</span>
                            </button>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  type="button"
                                  className="admin-jm-btn-dots"
                                  title="Application options"
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-52">
                                <DropdownMenuItem
                                  onClick={() => setSelectedAppForDetails(app)}
                                  className="cursor-pointer"
                                >
                                  <Eye className="w-4 h-4 mr-2 text-slate-500" />
                                  View Candidate Profile
                                </DropdownMenuItem>

                                {app.resumeUrl && (
                                  <DropdownMenuItem asChild>
                                    <a
                                      href={app.resumeUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="cursor-pointer flex items-center"
                                    >
                                      <FileText className="w-4 h-4 mr-2 text-blue-600" />
                                      Open Resume PDF
                                    </a>
                                  </DropdownMenuItem>
                                )}

                                <DropdownMenuItem
                                  onClick={() => handleOpenInterviewModal(app)}
                                  className="cursor-pointer text-purple-600 focus:text-purple-700 font-medium"
                                >
                                  <Video className="w-4 h-4 mr-2" />
                                  Schedule / Edit Interview
                                </DropdownMenuItem>

                                <DropdownMenuSeparator />

                                <div className="px-2 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                                  Update Status
                                </div>
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleUpdateAppStatus(app.id, "applied")
                                  }
                                  className="cursor-pointer text-xs"
                                >
                                  Mark as Applied
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleUpdateAppStatus(app.id, "shortlisted")
                                  }
                                  className="cursor-pointer text-xs text-emerald-700 font-medium"
                                >
                                  Mark as Shortlisted
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleOpenInterviewModal(app)
                                  }
                                  className="cursor-pointer text-xs text-purple-700 font-medium"
                                >
                                  Schedule Interview
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleUpdateAppStatus(app.id, "selected")
                                  }
                                  className="cursor-pointer text-xs text-green-700 font-medium"
                                >
                                  Mark as Selected / Hired
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleUpdateAppStatus(app.id, "rejected")
                                  }
                                  className="cursor-pointer text-xs text-rose-600"
                                >
                                  Mark as Rejected
                                </DropdownMenuItem>

                                <DropdownMenuSeparator />

                                <DropdownMenuItem asChild>
                                  <a
                                    href={`mailto:${app.candidateEmail}`}
                                    className="cursor-pointer text-xs flex items-center"
                                  >
                                    <Mail className="w-3.5 h-3.5 mr-2 text-slate-500" />
                                    Email Candidate
                                  </a>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <a
                                    href={`tel:${app.candidatePhone}`}
                                    className="cursor-pointer text-xs flex items-center"
                                  >
                                    <Phone className="w-3.5 h-3.5 mr-2 text-slate-500" />
                                    Call Candidate
                                  </a>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Bottom Pagination Bar (Applications) */}
            {!appLoading && filteredAndSortedApplications.length > 0 && (
              <div className="admin-jm-pagination">
                <div className="admin-jm-pagination-info">
                  Showing {appStartIndex + 1} -{" "}
                  {Math.min(
                    appStartIndex + pageSize,
                    filteredAndSortedApplications.length
                  )}{" "}
                  of {filteredAndSortedApplications.length} applications
                </div>

                <div className="admin-jm-pagination-controls">
                  <button
                    type="button"
                    onClick={() => setAppCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={appCurrentPage === 1}
                    className="admin-jm-page-btn"
                    title="Previous page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {getPageNumbers(appCurrentPage, appTotalPages).map((p, idx) => {
                    if (p === "...") {
                      return (
                        <span key={`app-ell-${idx}`} className="admin-jm-page-ellipsis">
                          ...
                        </span>
                      );
                    }
                    const pageNum = Number(p);
                    return (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => setAppCurrentPage(pageNum)}
                        className={`admin-jm-page-btn ${
                          appCurrentPage === pageNum ? "active" : ""
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() =>
                      setAppCurrentPage((p) => Math.min(appTotalPages, p + 1))
                    }
                    disabled={appCurrentPage === appTotalPages}
                    className="admin-jm-page-btn"
                    title="Next page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ===================================================================
           Modals & Dialogs
           =================================================================== */}

        {/* Schedule / Edit Interview Dialog */}
        <Dialog
          open={!!interviewModalApp}
          onOpenChange={(open) => !open && setInterviewModalApp(null)}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Video className="w-5 h-5 text-purple-600" />
                Schedule Interview
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                {interviewModalApp && (
                  <>
                    Candidate: <strong>{interviewModalApp.candidateName}</strong> for{" "}
                    <strong>{interviewModalApp.jobTitle}</strong>
                  </>
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 my-2">
              <div>
                <Label htmlFor="dlgInterviewDate" className="text-xs font-semibold text-slate-700">
                  Interview Date & Time:
                </Label>
                <Input
                  id="dlgInterviewDate"
                  type="datetime-local"
                  value={interviewDate}
                  onChange={(e) => setInterviewDate(e.target.value)}
                  className="mt-1.5 text-sm bg-white"
                  required
                />
              </div>

              <div>
                <Label htmlFor="dlgInterviewLink" className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Video className="w-3.5 h-3.5 text-purple-600" />
                  Meeting Link (Google Meet / Zoom URL):
                </Label>
                <Input
                  id="dlgInterviewLink"
                  type="url"
                  placeholder="https://meet.google.com/xyz-abcd-efg"
                  value={interviewLink}
                  onChange={(e) => setInterviewLink(e.target.value)}
                  className="mt-1.5 text-sm bg-white"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Paste the online meeting link where the candidate will join.
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInterviewModalApp(null)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-purple-600 hover:bg-purple-700 text-white"
                onClick={handleSaveInterviewSchedule}
              >
                <Calendar className="w-3.5 h-3.5 mr-1" />
                Save Schedule
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Candidate Application Preview Dialog */}
        <Dialog
          open={!!selectedAppForDetails}
          onOpenChange={(open) => !open && setSelectedAppForDetails(null)}
        >
          <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
            {selectedAppForDetails && (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-2 mb-1">
                    {renderAppStatusBadge(selectedAppForDetails)}
                    <span className="text-xs text-slate-500 font-medium">
                      Applied: {formatDateDMY(selectedAppForDetails.appliedDate)}
                    </span>
                  </div>
                  <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <div className="admin-jm-avatar">
                      {getCandidateInitials(selectedAppForDetails.candidateName)}
                    </div>
                    <span>{selectedAppForDetails.candidateName}</span>
                  </DialogTitle>
                  <DialogDescription className="text-sm text-slate-600 flex items-center gap-2 mt-1">
                    <Briefcase className="w-4 h-4 text-slate-400" />
                    <span>{selectedAppForDetails.jobTitle}</span>
                    <span>•</span>
                    <Building2 className="w-4 h-4 text-slate-400" />
                    <span>{selectedAppForDetails.jobOrganization}</span>
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 my-3 text-sm">
                  {/* Contact Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                    <div>
                      <div className="text-xs text-slate-500">Email Address</div>
                      <a
                        href={`mailto:${selectedAppForDetails.candidateEmail}`}
                        className="font-semibold text-blue-600 hover:underline text-xs"
                      >
                        {selectedAppForDetails.candidateEmail}
                      </a>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Phone Number</div>
                      <a
                        href={`tel:${selectedAppForDetails.candidatePhone}`}
                        className="font-semibold text-slate-900 text-xs"
                      >
                        {selectedAppForDetails.candidatePhone}
                      </a>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Qualification</div>
                      <div className="font-semibold text-slate-900 text-xs">
                        {selectedAppForDetails.candidateQualification || "MBBS"}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Experience</div>
                      <div className="font-semibold text-slate-900 text-xs">
                        {selectedAppForDetails.candidateYearsExperience !== undefined &&
                        selectedAppForDetails.candidateYearsExperience !== null
                          ? `${selectedAppForDetails.candidateYearsExperience} Years`
                          : "As per resume"}
                      </div>
                    </div>
                  </div>

                  {/* Interview Status Box */}
                  {selectedAppForDetails.interviewDate && (
                    <div className="p-3.5 bg-purple-50/70 border border-purple-200 rounded-xl space-y-1.5">
                      <div className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                        <Video className="w-4 h-4 text-purple-600" />
                        Interview Scheduled
                      </div>
                      <div className="text-xs text-purple-800">
                        Date & Time:{" "}
                        <strong>
                          {new Date(
                            selectedAppForDetails.interviewDate
                          ).toLocaleString()}
                        </strong>
                      </div>
                      {selectedAppForDetails.interviewLink && (
                        <a
                          href={selectedAppForDetails.interviewLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline bg-white px-2.5 py-1 rounded border border-emerald-200 mt-1"
                        >
                          <Video className="w-3.5 h-3.5" />
                          <span>Join Video Meeting</span>
                          <ExternalLink className="w-3 h-3 ml-1" />
                        </a>
                      )}
                    </div>
                  )}

                  {/* Notes / Summary */}
                  {selectedAppForDetails.notes && (
                    <div>
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Candidate Notes
                      </h4>
                      <p className="text-slate-600 bg-white p-3 rounded-lg border border-slate-200 text-xs leading-relaxed">
                        {selectedAppForDetails.notes}
                      </p>
                    </div>
                  )}

                  {/* Resume Button */}
                  {selectedAppForDetails.resumeUrl && (
                    <div className="pt-2">
                      <a
                        href={selectedAppForDetails.resumeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-3.5 py-2 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        <FileText className="w-4 h-4" />
                        <span>Open Full Resume / CV</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        handleOpenInterviewModal(selectedAppForDetails);
                        setSelectedAppForDetails(null);
                      }}
                      className="text-xs"
                    >
                      <Video className="w-3.5 h-3.5 mr-1 text-purple-600" />
                      Schedule Interview
                    </Button>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedAppForDetails(null)}
                  >
                    Close
                  </Button>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Job Quick Preview Dialog */}
        <Dialog open={!!previewJob} onOpenChange={(open) => !open && setPreviewJob(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            {previewJob && (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-2 mb-1">
                    {renderStatusBadge(previewJob)}
                    <span className="text-xs text-slate-500 font-medium">
                      Posted: {formatDateDMY(previewJob.postedDate)}
                    </span>
                  </div>
                  <DialogTitle className="text-xl font-bold text-slate-900">
                    {previewJob.title}
                  </DialogTitle>
                  <DialogDescription className="text-sm text-slate-600 flex items-center gap-2 mt-1">
                    <Building2 className="w-4 h-4 text-slate-400" />
                    <span>{previewJob.organization}</span>
                    <span>•</span>
                    <MapPin className="w-4 h-4 text-slate-400" />
                    <span>{previewJob.location}</span>
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 my-3 text-sm">
                  {/* Key Metrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                    <div>
                      <div className="text-xs text-slate-500">Vacancies</div>
                      <div className="font-semibold text-slate-900">
                        {previewJob.numberOfPosts} Posts
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Salary</div>
                      <div className="font-semibold text-slate-900">
                        {previewJob.salary || "As per rules"}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Last Date</div>
                      <div className="font-semibold text-slate-900">
                        {formatDateDMY(previewJob.lastDate)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Sector</div>
                      <div className="font-semibold text-slate-900 capitalize">
                        {previewJob.sector}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Category</div>
                      <div className="font-semibold text-slate-900">
                        {previewJob.category}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Experience</div>
                      <div className="font-semibold text-slate-900">
                        {previewJob.experience || "Not specified"}
                      </div>
                    </div>
                  </div>

                  {/* Qualification */}
                  {previewJob.qualification && (
                    <div>
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Qualification
                      </h4>
                      <p className="text-slate-600 bg-white p-3 rounded-lg border border-slate-200 text-xs leading-relaxed">
                        {previewJob.qualification}
                      </p>
                    </div>
                  )}

                  {/* Description */}
                  {previewJob.description && (
                    <div>
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Description
                      </h4>
                      <p className="text-slate-600 bg-white p-3 rounded-lg border border-slate-200 text-xs leading-relaxed max-h-48 overflow-y-auto whitespace-pre-line">
                        {previewJob.description}
                      </p>
                    </div>
                  )}

                  {/* Links */}
                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    {previewJob.pdfUrl && (
                      <a
                        href={previewJob.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-100"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        View PDF Notice
                      </a>
                    )}
                    {previewJob.applyLink && (
                      <a
                        href={previewJob.applyLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg hover:bg-emerald-100"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Official Apply Link
                      </a>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setPreviewJob(null);
                      handleEditJob(previewJob);
                    }}
                  >
                    <Edit className="w-3.5 h-3.5 mr-1" />
                    Edit Job
                  </Button>
                  <Button
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={() => {
                      setPreviewJob(null);
                      handleViewDetails(previewJob);
                    }}
                  >
                    View Live Page
                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
