import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Clock, CheckCircle, XCircle, Calendar, FileText, Eye, MessageSquare, 
  Phone, Mail, MapPin, Search, Filter, Users, Briefcase, MoreVertical, 
  Loader2, ArrowLeft, AlertCircle, Video, ExternalLink, Check, Sparkles, 
  ShieldCheck, GraduationCap, Stethoscope, SlidersHorizontal, RefreshCw, Award,
  Building2, Plus, Star, Target, Rocket, Package, User, Bell, ChevronDown,
  ArrowUpDown, Grid2X2, List, Edit, X, AlertTriangle, ChevronRight, TrendingUp
} from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from './ui/sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from './ui/dropdown-menu';
import { toast } from 'sonner';
import { fetchApplications, updateApplicationStatus, ApplicationResponse, JobEligibilitySummary } from '../api/applications';
import { useAuth } from '../contexts/AuthContext';
import { fetchJobsByEmployer, fetchAdminJobs, fetchJobs } from '../api/jobs';
import { fetchEmployer } from '../api/employers';
import { openFileInViewer } from '../utils/fileUtils';
import "../styles/admin-applications-premium.css";

interface AdminApplicationsProps {
  onNavigate: (page: string) => void;
  userRole?: 'admin' | 'employer'; // Allow component to work for both roles
}

export function AdminApplications({ onNavigate, userRole }: AdminApplicationsProps) {
  const { token, user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [applications, setApplications] = useState<ApplicationResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingAppId, setUpdatingAppId] = useState<string | null>(null);
  const [selectedApplication, setSelectedApplication] = useState<ApplicationResponse | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [isInterviewDialogOpen, setIsInterviewDialogOpen] = useState(false);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [expandedEligibility, setExpandedEligibility] = useState<Record<string, boolean>>({});
  const [availableJobs, setAvailableJobs] = useState<{ id: string; title: string; organization?: string }[]>([]);
  const [eligibilitySummary, setEligibilitySummary] = useState<JobEligibilitySummary | null>(null);
  const [filters, setFilters] = useState({
    status: 'all',
    search: '',
    jobId: 'all',
    minExp: 'all',
    qualification: 'all',
    speciality: '',
    registrationStatus: 'all', // 'all', 'registered', 'unregistered'
    council: '',
    state: '',
    city: '',
    eligibleOnly: false,
    sortBy: 'eligibility', // 'eligibility' | 'appliedDate'
    startDate: '',
    endDate: ''
  });

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated || !user || !token) {
      navigate('/login');
      return;
    }
  }, [isAuthenticated, user, token, navigate]);

  useEffect(() => {
    async function loadJobsList() {
      if (!token || !isAuthenticated || !user) return;
      try {
        if ((userRole === 'employer' || user?.role === 'EMPLOYER') && user) {
          const emp = await fetchEmployer(user.id, token);
          const res = await fetchJobsByEmployer(emp.id, { status: 'all', size: 1000 });
          setAvailableJobs(res.content || []);
        } else {
          try {
            const res = await fetchAdminJobs({ size: 1000 });
            setAvailableJobs(res.content || []);
          } catch {
            const res = await fetchJobs({ size: 1000 });
            setAvailableJobs(res.content || []);
          }
        }
      } catch (e) {
        console.warn('Could not load jobs for dropdown filter', e);
      }
    }
    loadJobsList();
  }, [token, isAuthenticated, user, userRole]);

  useEffect(() => {
    if (isAuthenticated && user && token) {
      loadApplications();
    }
  }, [filters, token, userRole, user, isAuthenticated]);

  const loadApplications = async () => {
    if (!token || !isAuthenticated || !user) {
      navigate('/login');
      return;
    }

    setLoading(true);
    try {
      const params: any = {
        status: (filters.status && filters.status !== "all") ? filters.status : undefined,
        search: filters.search || undefined,
        jobId: (filters.jobId && filters.jobId !== "all") ? filters.jobId : undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
        qualification: (filters.qualification && filters.qualification !== "all") ? filters.qualification : undefined,
        speciality: filters.speciality || undefined,
        minExp: (filters.minExp && filters.minExp !== "all") ? Number(filters.minExp) : undefined,
        hasRegistration: filters.registrationStatus === 'registered' ? true : filters.registrationStatus === 'unregistered' ? false : undefined,
        registrationCouncil: filters.council || undefined,
        state: filters.state || undefined,
        city: filters.city || undefined,
        eligibleOnly: filters.eligibleOnly ? true : undefined,
        page: 0,
        size: 200,
        sort: filters.sortBy === 'eligibility' ? 'eligibility,desc' : 'appliedDate,desc'
      };

      const response = await fetchApplications(params, token);
      const apps = response.content || (Array.isArray(response) ? response : []);
      setApplications(apps);
      setEligibilitySummary(response.eligibilitySummary || null);
    } catch (error: any) {
      // Handle 401 errors - authentication failed
      if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
        logout();
        navigate('/login');
        return;
      }
      console.error('Failed to load applications:', error);
      toast.error('Failed to load applications', {
        description: error.message || 'Please refresh the page.'
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedJob = useMemo(() => {
    if (!filters.jobId || filters.jobId === 'all') return null;
    return availableJobs.find(j => j.id === filters.jobId) || null;
  }, [availableJobs, filters.jobId]);

  const getStatusIcon = (status: string) => {
    const normalizedStatus = status === 'applied' ? 'pending' : status === 'selected' ? 'hired' : status;
    switch (normalizedStatus) {
      case 'pending':
        return <Clock className="w-5 h-5 text-blue-500" />;
      case 'shortlisted':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'interview':
        return <Calendar className="w-5 h-5 text-purple-500" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'hired':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    const normalizedStatus = status === 'applied' ? 'pending' : status === 'selected' ? 'hired' : status;
    switch (normalizedStatus) {
      case 'pending':
        return 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700 font-bold';
      case 'shortlisted':
        return 'bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-700 font-bold';
      case 'interview':
        return 'bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-700 font-bold';
      case 'rejected':
        return 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-700 font-bold';
      case 'hired':
        return 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700 font-bold';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 font-semibold';
    }
  };

  const getStatusProgress = (status: string) => {
    const normalizedStatus = status === 'applied' ? 'pending' : status === 'selected' ? 'hired' : status;
    switch (normalizedStatus) {
      case 'pending':
        return 25;
      case 'shortlisted':
        return 50;
      case 'interview':
        return 75;
      case 'hired':
        return 100;
      case 'rejected':
        return 0;
      default:
        return 0;
    }
  };

  const getStatusSteps = (status: string) => {
    const normalizedStatus = status === 'applied' ? 'pending' : status === 'selected' ? 'hired' : status;
    const steps = [
      { key: 'pending', label: 'Pending', completed: ['pending', 'shortlisted', 'interview', 'hired'].includes(normalizedStatus) },
      { key: 'shortlisted', label: 'Shortlisted', completed: ['shortlisted', 'interview', 'hired'].includes(normalizedStatus) },
      { key: 'interview', label: 'Interview', completed: ['interview', 'hired'].includes(normalizedStatus) },
      { key: 'hired', label: 'Hired', completed: normalizedStatus === 'hired' }
    ];
    return steps;
  };

  const getStatusLabel = (status: string) => {
    const normalizedStatus = status === 'applied' ? 'pending' : status === 'selected' ? 'hired' : status;
    return normalizedStatus.charAt(0).toUpperCase() + normalizedStatus.slice(1);
  };

  const updateApplicationStatusHandler = async (
    applicationId: string,
    newStatus: string,
    notes?: string,
    interviewDate?: string,
    interviewLink?: string,
    interviewNotes?: string
  ) => {
    if (!token || !isAuthenticated) {
      navigate('/login');
      return;
    }

    try {
      await updateApplicationStatus(
        applicationId,
        newStatus,
        token,
        notes,
        interviewDate,
        interviewLink,
        interviewNotes
      );
      await loadApplications(); // Reload applications
      setIsStatusDialogOpen(false);
      setIsInterviewDialogOpen(false);
      
      // Show success toast
      const app = applications.find(a => a.id === applicationId);
      toast.success('Status Updated', {
        description: `Application status for ${app?.candidateName || 'candidate'} has been updated to ${getStatusLabel(newStatus)}.`,
      });
    } catch (error: any) {
      // Handle 401 errors - authentication failed
      if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
        logout();
        navigate('/login');
        return;
      }
      toast.error('Update Failed', {
        description: error.message || 'Failed to update application status. Please try again.',
      });
      console.error('Status update error:', error);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'AP';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const normalizeAppStatus = (status?: string) => {
    const s = (status || 'pending').toLowerCase();
    if (s === 'applied') return 'pending';
    if (s === 'selected') return 'hired';
    return s;
  };

  const getCandidateStatusClass = (status?: string) => {
    const norm = normalizeAppStatus(status);
    switch (norm) {
      case 'shortlisted':
        return 'dashboard-status dashboard-status--active';
      case 'interview':
        return 'dashboard-status dashboard-status--interview';
      case 'hired':
        return 'dashboard-status dashboard-status--selected';
      case 'rejected':
        return 'dashboard-status dashboard-status--rejected';
      case 'pending':
      default:
        return 'dashboard-status dashboard-status--pending';
    }
  };

  const handleQuickStatusUpdate = async (applicationId: string, status: string) => {
    setUpdatingAppId(applicationId);
    try {
      await updateApplicationStatusHandler(applicationId, status);
    } finally {
      setUpdatingAppId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredApplications = useMemo(() => {
    return applications.filter(app => {
      // 1. Status Filter
      if (filters.status && filters.status !== "all" && app.status !== filters.status) {
        return false;
      }
      // 2. Instant Eligible Only Toggle check
      if (filters.eligibleOnly && !app.isEligible) {
        return false;
      }
      return true;
    });
  }, [applications, filters.status, filters.eligibleOnly]);

  // Don't render if not authenticated
  if (!isAuthenticated || !user || !token) {
    return null;
  }

  // Skeleton Loader Component
  const ApplicationSkeleton = () => (
    <Card 
      className="border-l-4 border-l-gray-200 dark:border-l-gray-700 animate-pulse flex flex-col"
      style={{
        padding: 'clamp(0.75rem, 1.5vw, 1.25rem)',
        borderRadius: 'clamp(0.5rem, 0.8vw, 0.75rem)'
      }}
    >
      <div className="flex items-start justify-between mb-3" style={{ marginBottom: 'clamp(0.75rem, 1.2vw, 1rem)' }}>
        <div className="flex-1">
          <div 
            className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-200 dark:border-gray-700"
            style={{ 
              gap: 'clamp(0.5rem, 0.8vw, 0.75rem)',
              marginBottom: 'clamp(0.5rem, 0.8vw, 0.75rem)',
              paddingBottom: 'clamp(0.5rem, 0.8vw, 0.75rem)'
            }}
          >
            <div 
              className="bg-gray-200 dark:bg-gray-700 rounded-full"
              style={{
                width: 'clamp(2.5rem, 4vw, 3.5rem)',
                height: 'clamp(2.5rem, 4vw, 3.5rem)'
              }}
            />
            <div className="flex-1">
              <div 
                className="bg-gray-200 dark:bg-gray-700 rounded mb-1"
                style={{
                  height: 'clamp(1rem, 1.2vw, 1.125rem)',
                  width: '40%',
                  marginBottom: 'clamp(0.25rem, 0.4vw, 0.375rem)'
                }}
              />
              <div 
                className="bg-gray-200 dark:bg-gray-700 rounded"
                style={{
                  height: 'clamp(0.875rem, 1vw, 1rem)',
                  width: '60%'
                }}
              />
            </div>
            <div 
              className="bg-gray-200 dark:bg-gray-700 rounded"
              style={{
                height: 'clamp(1.25rem, 1.8vw, 1.5rem)',
                width: 'clamp(3rem, 5vw, 4rem)'
              }}
            />
          </div>
          <div 
            className="bg-gray-200 dark:bg-gray-700 rounded mb-3"
            style={{
              height: 'clamp(1rem, 1.2vw, 1.125rem)',
              width: '50%',
              marginBottom: 'clamp(0.75rem, 1.2vw, 1rem)'
            }}
          />
          <div 
            className="space-y-2 mb-3"
            style={{ 
              gap: 'clamp(0.5rem, 0.8vw, 0.625rem)',
              marginBottom: 'clamp(0.75rem, 1.2vw, 1rem)'
            }}
          >
            <div 
              className="bg-gray-200 dark:bg-gray-700 rounded"
              style={{ height: 'clamp(0.875rem, 1vw, 1rem)' }}
            />
            <div 
              className="bg-gray-200 dark:bg-gray-700 rounded"
              style={{ height: 'clamp(0.875rem, 1vw, 1rem)' }}
            />
          </div>
          <div 
            className="bg-gray-200 dark:bg-gray-700 rounded mb-3"
            style={{
              height: 'clamp(0.375rem, 0.5vw, 0.5rem)',
              marginBottom: 'clamp(0.75rem, 1.2vw, 1rem)'
            }}
          />
        </div>
      </div>
      <div 
        className="flex gap-2 pt-3 border-t border-gray-200 dark:border-gray-700"
        style={{
          gap: 'clamp(0.5rem, 0.8vw, 0.75rem)',
          paddingTop: 'clamp(0.75rem, 1.2vw, 1rem)'
        }}
      >
        <div 
          className="bg-gray-200 dark:bg-gray-700 rounded flex-1"
          style={{
            height: 'clamp(2.5rem, 3.5vw, 2.75rem)'
          }}
        />
        <div 
          className="bg-gray-200 dark:bg-gray-700 rounded flex-1"
          style={{
            height: 'clamp(2.5rem, 3.5vw, 2.75rem)'
          }}
        />
      </div>
    </Card>
  );

  // Filter Component (reusable for sidebar and drawer)
  const FilterPanel = ({ onClose }: { onClose?: () => void }) => (
    <div className="space-y-4">
      {/* 1. Search Keyword */}
      <div>
        <Label htmlFor="search" className="text-[11px] font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider">Search Candidates</Label>
        <div className="relative mt-1.5">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
          <Input
            id="search"
            placeholder="Name, email, phone, city, skills..."
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            style={{ paddingLeft: '2.5rem', paddingRight: filters.search ? '2rem' : '0.75rem' }}
            className="text-xs sm:text-sm h-10 border-slate-300 focus:border-[#0a6e79] focus:ring-[#0a6e79]/20 rounded-xl"
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => setFilters(prev => ({ ...prev, search: '' }))}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Target Job Selector */}
      <div>
        <Label htmlFor="jobId" className="text-[11px] font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider">Target Job Post</Label>
        <Select 
          value={filters.jobId} 
          onValueChange={(value) => setFilters(prev => ({ ...prev, jobId: value }))}
        >
          <SelectTrigger className="mt-1.5 text-xs sm:text-sm h-10 border-slate-300 focus:border-[#0a6e79] rounded-xl">
            <SelectValue placeholder="All Posted Jobs" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Posted Jobs ({availableJobs.length})</SelectItem>
            {availableJobs.map((j) => (
              <SelectItem key={j.id} value={j.id}>
                {j.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 3. Card 1: 100% Eligible Only with Switch (Exact match to Image 1 & 3) */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setFilters(prev => ({ ...prev, eligibleOnly: !prev.eligibleOnly }))}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setFilters(prev => ({ ...prev, eligibleOnly: !prev.eligibleOnly }));
          }
        }}
        className="p-3 rounded-2xl border border-blue-100 bg-[#eef5ff] dark:bg-blue-950/40 dark:border-blue-800 transition-all cursor-pointer select-none flex items-center justify-between shadow-2xs"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Target className="w-5 h-5 text-blue-600 flex-shrink-0" />
          <span className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-tight">
            100% Eligible Only
          </span>
        </div>
        {/* iOS-style toggle switch */}
        <div className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full transition-colors duration-200 ease-in-out ${
          filters.eligibleOnly ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'
        }`}>
          <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out my-auto mx-0.5 ${
            filters.eligibleOnly ? 'translate-x-4' : 'translate-x-0'
          }`} />
        </div>
      </div>

      {/* 4. Card 2: Filter strictly qualified candidates (Exact match to Image 1 & 3) */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setFilters(prev => ({ ...prev, eligibleOnly: !prev.eligibleOnly }))}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setFilters(prev => ({ ...prev, eligibleOnly: !prev.eligibleOnly }));
          }
        }}
        className="p-3 rounded-2xl border border-emerald-100 bg-[#ecfdf5] dark:bg-emerald-950/30 dark:border-emerald-800 transition-all cursor-pointer select-none flex items-center justify-between hover:bg-emerald-100/60 shadow-2xs"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Filter className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <div className="text-xs font-semibold text-emerald-900 dark:text-emerald-200 leading-tight">
            Filter strictly qualified candidates
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-emerald-600 flex-shrink-0" />
      </div>

      {/* 5. Medical Qualification */}
      <div>
        <Label htmlFor="qualification" className="text-[11px] font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider">Required Medical Degree</Label>
        <Select 
          value={filters.qualification} 
          onValueChange={(value) => setFilters(prev => ({ ...prev, qualification: value }))}
        >
          <SelectTrigger className="mt-1.5 text-xs sm:text-sm h-10 border-slate-200 focus:border-blue-500 rounded-xl">
            <SelectValue placeholder="All Qualifications" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Qualifications</SelectItem>
            <SelectItem value="MBBS">MBBS (Primary Medical)</SelectItem>
            <SelectItem value="MD">MD (Doctor of Medicine)</SelectItem>
            <SelectItem value="MS">MS (Master of Surgery)</SelectItem>
            <SelectItem value="DNB">DNB (Diplomate of National Board)</SelectItem>
            <SelectItem value="DM">DM / MCh (Super Speciality)</SelectItem>
            <SelectItem value="BDS">BDS / MDS (Dental Surgery)</SelectItem>
            <SelectItem value="BAMS">BAMS / BHMS (AYUSH)</SelectItem>
            <SelectItem value="Nursing">Nursing (B.Sc / GNM)</SelectItem>
            <SelectItem value="Allied">Allied Healthcare</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 6. Speciality */}
      <div>
        <Label htmlFor="speciality" className="text-[11px] font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider">Medical Speciality</Label>
        <Input
          id="speciality"
          placeholder="e.g. Cardiology, Paediatrics..."
          value={filters.speciality}
          onChange={(e) => setFilters(prev => ({ ...prev, speciality: e.target.value }))}
          className="mt-1.5 text-xs sm:text-sm h-10 border-slate-200 focus:border-blue-500 rounded-xl"
        />
      </div>

      {/* 7. Clinical Experience */}
      <div>
        <Label htmlFor="minExp" className="text-[11px] font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider">Clinical Experience</Label>
        <Select 
          value={filters.minExp} 
          onValueChange={(value) => setFilters(prev => ({ ...prev, minExp: value }))}
        >
          <SelectTrigger className="mt-1.5 text-xs sm:text-sm h-10 border-slate-200 focus:border-blue-500 rounded-xl">
            <SelectValue placeholder="Any Experience" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any Experience</SelectItem>
            <SelectItem value="1">1+ Years Clinical Experience</SelectItem>
            <SelectItem value="2">2+ Years Clinical Experience</SelectItem>
            <SelectItem value="3">3+ Years Clinical Experience</SelectItem>
            <SelectItem value="5">5+ Years (Specialist / Senior)</SelectItem>
            <SelectItem value="8">8+ Years Experience</SelectItem>
            <SelectItem value="10">10+ Years (Consultant / HOD)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 8. State Medical Council Registration */}
      <div>
        <Label htmlFor="registrationStatus" className="text-[11px] font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider">State Medical Registration</Label>
        <Select 
          value={filters.registrationStatus} 
          onValueChange={(value) => setFilters(prev => ({ ...prev, registrationStatus: value }))}
        >
          <SelectTrigger className="mt-1.5 text-xs sm:text-sm h-10 border-slate-200 focus:border-blue-500 rounded-xl">
            <SelectValue placeholder="All Candidates" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Candidates</SelectItem>
            <SelectItem value="registered">Registered Only (Has Valid Reg No)</SelectItem>
            <SelectItem value="unregistered">Unregistered / Reg Missing</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 9. Registration Council */}
      <div>
        <Label htmlFor="council" className="text-[11px] font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider">Medical Council / State</Label>
        <Input
          id="council"
          placeholder="e.g. Maharashtra Medical Council..."
          value={filters.council}
          onChange={(e) => setFilters(prev => ({ ...prev, council: e.target.value }))}
          className="mt-1.5 text-xs sm:text-sm h-10 border-slate-200 focus:border-blue-500 rounded-xl"
        />
      </div>

      {/* 10. Candidate State / City */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label htmlFor="state" className="text-[11px] font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider">State</Label>
          <Input
            id="state"
            placeholder="e.g. Maharashtra"
            value={filters.state}
            onChange={(e) => setFilters(prev => ({ ...prev, state: e.target.value }))}
            className="mt-1 text-xs h-9 border-slate-200 focus:border-blue-500 rounded-xl"
          />
        </div>
        <div>
          <Label htmlFor="city" className="text-[11px] font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider">City</Label>
          <Input
            id="city"
            placeholder="e.g. Mumbai"
            value={filters.city}
            onChange={(e) => setFilters(prev => ({ ...prev, city: e.target.value }))}
            className="mt-1 text-xs h-9 border-slate-200 focus:border-blue-500 rounded-xl"
          />
        </div>
      </div>

      {/* 11. Application Status */}
      <div>
        <Label htmlFor="status" className="text-[11px] font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider">Application Status</Label>
        <Select 
          value={filters.status} 
          onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
        >
          <SelectTrigger className="mt-1.5 text-xs sm:text-sm h-10 border-slate-200 focus:border-blue-500 rounded-xl">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="shortlisted">Shortlisted</SelectItem>
            <SelectItem value="interview">Interview</SelectItem>
            <SelectItem value="hired">Hired / Selected</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 12. Sort By */}
      <div>
        <Label htmlFor="sortBy" className="text-[11px] font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider">Sort Order</Label>
        <Select 
          value={filters.sortBy} 
          onValueChange={(value) => setFilters(prev => ({ ...prev, sortBy: value }))}
        >
          <SelectTrigger className="mt-1.5 text-xs sm:text-sm h-10 border-slate-200 focus:border-blue-500 rounded-xl">
            <SelectValue placeholder="Sort Order" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="eligibility">🎯 Eligibility Match (Highest Score)</SelectItem>
            <SelectItem value="appliedDate">📅 Applied Date (Newest First)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2 pt-2">
        <Button
          variant="outline"
          onClick={() => {
            setFilters({ 
              status: 'all', 
              search: '', 
              jobId: 'all', 
              minExp: 'all', 
              qualification: 'all', 
              speciality: '',
              registrationStatus: 'all',
              council: '',
              state: '',
              city: '',
              eligibleOnly: false,
              sortBy: 'eligibility',
              startDate: '', 
              endDate: '' 
            });
            onClose?.();
          }}
          className="flex-1 text-xs h-10 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-100"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1 text-slate-500" />
          Reset
        </Button>
        <Button
          variant="default"
          onClick={() => {
            loadApplications();
            onClose?.();
          }}
          className="flex-1 text-xs h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs"
        >
          Apply Filters
        </Button>
      </div>
    </div>
  );

  const toggleEligibility = (appId: string) => {
    setExpandedEligibility(prev => ({ ...prev, [appId]: !prev[appId] }));
  };

  const renderApplicationCard = (application: ApplicationResponse) => {
    const isEligible = application.isEligible ?? false;
    const score = application.eligibilityScore ?? 0;
    const status = normalizeAppStatus(application.status);
    const busy = updatingAppId === application.id;

    // Build criteria matching tags
    const criteriaItems: Array<{ text: string; met: boolean }> = [];
    if (application.matchingCriteria && application.matchingCriteria.length > 0) {
      application.matchingCriteria.forEach(item => {
        criteriaItems.push({ text: item, met: true });
      });
    }
    if (application.unmetCriteria && application.unmetCriteria.length > 0) {
      application.unmetCriteria.forEach(item => {
        criteriaItems.push({ text: item, met: false });
      });
    }

    if (criteriaItems.length === 0) {
      if (application.candidateQualification) {
        criteriaItems.push({ text: `Degree: ${application.candidateQualification}`, met: true });
      }
      if (application.candidateSpeciality) {
        criteriaItems.push({ text: `Speciality: ${application.candidateSpeciality}`, met: true });
      }
      if (application.candidateYearsExperience != null) {
        criteriaItems.push({ text: `Exp: ${application.candidateYearsExperience}+ yrs`, met: true });
      }
      if (application.candidateRegistrationNumber) {
        criteriaItems.push({ text: `Reg: Valid`, met: true });
      }
      if (application.candidateCity || application.candidateState) {
        criteriaItems.push({ text: `Location: ${[application.candidateCity, application.candidateState].filter(Boolean).join(', ')}`, met: true });
      }
    }

    const subtitleParts = [
      application.candidateQualification,
      application.candidateSpeciality,
      application.jobTitle ? `Post: ${application.jobTitle}` : undefined
    ].filter(Boolean);

    const skillsList = [
      application.candidateSpeciality,
      application.candidateSubSpeciality,
      application.candidateCity || application.candidateState,
      application.candidateRegistrationCouncil
    ].filter(Boolean) as string[];
    const uniqueSkills = Array.from(new Set(skillsList));

    return (
      <article className="mx-candidate" key={application.id}>
        {/* Top Header Row: Profile (Avatar + Identity) & Badges */}
        <div className="mx-candidate__head">
          <div className="mx-candidate__profile">
            <div className="mx-avatar">{getInitials(application.candidateName)}</div>
            <div className="mx-candidate__identity">
              <h4 title={application.candidateName || 'Candidate'}>
                {application.candidateName || 'Candidate'}
              </h4>
              <span
                className="mx-candidate__subinfo"
                title={subtitleParts.join(' | ') || 'Qualification not added'}
              >
                {subtitleParts.join(' | ') || 'Qualification not added'}
              </span>
            </div>
          </div>
          <div className="mx-candidate__badges">
            {isEligible || score === 100 ? (
              <span className="mx-candidate__badge-eligible">
                🎯 100% Eligible
              </span>
            ) : score >= 60 ? (
              <span className="mx-candidate__badge-match">
                ⚡ {score}% Match
              </span>
            ) : null}
            <span className={getCandidateStatusClass(status)}>
              {status.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Details Row: Location, Experience, Registration */}
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

        {/* Matching Criteria Badges */}
        {criteriaItems.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', margin: '2px 0 4px 0' }}>
            {criteriaItems.map((item, idx) => (
              <span 
                key={`crit-${idx}`} 
                style={{ 
                  fontSize: '11px', 
                  fontWeight: 650, 
                  background: item.met ? '#f0fdf4' : '#fff1f2', 
                  color: item.met ? '#166534' : '#9f1239', 
                  border: item.met ? '1px solid #bbf7d0' : '1px solid #fecdd3', 
                  borderRadius: '5px', 
                  padding: '2px 8px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                {item.met ? '✓' : '✗'} {item.text}
              </span>
            ))}
          </div>
        )}

        {/* Skills / Speciality tags */}
        {uniqueSkills.length > 0 && (
          <div className="mx-candidate__skills">
            {uniqueSkills.map((skill) => (
              <span className="mx-skill" key={skill}>{skill}</span>
            ))}
          </div>
        )}

        {/* Contact Info & Application / Interview Dates */}
        <div className="mx-candidate__contact">
          <a href={`mailto:${application.candidateEmail}`}><Mail size={13} />{application.candidateEmail}</a>
          {application.candidatePhone && <a href={`tel:${application.candidatePhone}`}><Phone size={13} />{application.candidatePhone}</a>}
          <span><Calendar size={13} />Applied {formatDate(application.appliedDate)}</span>
          {application.interviewDate && (
            <span className="is-interview"><Calendar size={13} />Interview {formatDate(application.interviewDate)}</span>
          )}
        </div>

        {/* Notes if any */}
        {application.notes && <p className="mx-candidate__notes">{application.notes}</p>}

        {/* Scheduled Interview Banner */}
        {(application.interviewDate || status === 'interview') && (
          <div className="mx-interview-badge">
            <div className="mx-interview-badge__row">
              <Calendar size={14} />
              <span>Scheduled: {application.interviewDate ? formatDateTime(application.interviewDate) : 'Date TBD'}</span>
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
              onClick={() => {
                setSelectedApplication(application);
                setIsInterviewDialogOpen(true);
              }}
            >
              <Edit size={12} /> {application.interviewLink ? 'Reschedule or Edit Meeting Link' : '+ Add Zoom / Google Meet Link'}
            </button>
          </div>
        )}

        {/* Action Buttons Row */}
        <div className="mx-candidate__actions">
          {application.resumeUrl ? (
            <button 
              type="button" 
              className="mx-action mx-action--resume" 
              onClick={() => openFileInViewer(application.resumeUrl!)}
              title="View Resume"
            >
              <FileText size={14} /> Resume
            </button>
          ) : (
            <span className="mx-candidate__no-resume">No resume</span>
          )}

          <button 
            type="button" 
            className="mx-action mx-action--resume" 
            onClick={() => {
              setSelectedApplication(application);
              setIsViewDialogOpen(true);
            }}
            title="View Details"
          >
            <Eye size={14} /> View Details
          </button>

          <button 
            type="button" 
            className={`mx-action mx-action--shortlist${status === 'shortlisted' ? ' is-current' : ''}`} 
            disabled={busy} 
            onClick={() => handleQuickStatusUpdate(application.id, 'shortlisted')}
            title="Shortlist Candidate"
          >
            <Star size={14} /> Shortlist
          </button>

          <button 
            type="button" 
            className={`mx-action mx-action--interview${status === 'interview' ? ' is-current' : ''}`} 
            disabled={busy} 
            onClick={() => {
              setSelectedApplication(application);
              setIsInterviewDialogOpen(true);
            }}
            title={application.interviewDate ? (application.interviewLink ? 'Update Interview' : '+ Add Meet Link') : 'Interview'}
          >
            <Calendar size={14} /> {status === 'interview' ? (application.interviewLink ? 'Update Interview' : '+ Add Meet Link') : 'Interview'}
          </button>

          <button 
            type="button" 
            className={`mx-action mx-action--select${status === 'hired' ? ' is-current' : ''}`} 
            disabled={busy} 
            onClick={() => handleQuickStatusUpdate(application.id, 'hired')}
            title="Select / Hire Candidate"
          >
            <CheckCircle size={14} /> Select
          </button>

          <button 
            type="button" 
            className={`mx-action mx-action--reject${status === 'rejected' ? ' is-current' : ''}`} 
            disabled={busy} 
            onClick={() => handleQuickStatusUpdate(application.id, 'rejected')}
            title="Reject Application"
          >
            <X size={14} /> Reject
          </button>
        </div>
      </article>
    );
  };

  const renderStatusGrid = (statuses: string[], emptyLabel: string, EmptyIcon: typeof Briefcase = Briefcase) => {
    const matchingApplications = filteredApplications.filter(application => statuses.includes(application.status));
    if (loading) {
      return (
        <div className={`mx-candidates ${viewMode === 'list' ? 'mx-candidates--list' : ''}`}>
          {[...Array(6)].map((_, i) => <ApplicationSkeleton key={i} />)}
        </div>
      );
    }
    if (matchingApplications.length === 0) {
      return (
        <Card className="admin-applications-empty p-8 sm:p-12 text-center">
          <EmptyIcon className="w-12 h-12 sm:w-16 sm:h-16 text-blue-200 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base">{emptyLabel}</p>
        </Card>
      );
    }
    return (
      <div className={`mx-candidates ${viewMode === 'list' ? 'mx-candidates--list' : ''}`}>
        {matchingApplications.map(renderApplicationCard)}
      </div>
    );
  };

  return (
    <div className={`admin-applications-page view-${viewMode} min-h-screen bg-gray-50 dark:bg-gray-900`}>
      <div className="admin-applications-page__container container mx-auto 2xl:max-w-[1600px] xl:max-w-[1400px] px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
        {/* Top Header matching Reference Image 2 */}
        <div 
          className="medex-app-header flex flex-col md:flex-row md:items-center md:justify-between gap-4"
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e8eff7',
            borderRadius: '1.25rem',
            padding: '1.1rem 1.6rem',
            boxShadow: '0 2px 12px rgba(15, 23, 42, 0.03)',
            marginBottom: '1.5rem'
          }}
        >
          {/* Left: Blue gradient icon + Title + Live Portal + Subtitle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: 0 }}>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onNavigate(userRole === 'employer' ? 'dashboard/employer' : 'dashboard/admin')}
              className="lg:hidden flex-shrink-0 text-slate-500 hover:text-slate-800 hover:bg-slate-100"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            {/* Vibrant Blue rounded squircle icon container */}
            <div 
              className="medex-app-header-brand-icon"
              style={{
                width: '3.1rem',
                height: '3.1rem',
                borderRadius: '0.95rem',
                background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                flexShrink: 0
              }}
            >
              <Briefcase style={{ width: '1.65rem', height: '1.65rem' }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                <h1 
                  className="medex-app-header-title"
                  style={{
                    fontSize: '1.35rem',
                    fontWeight: 800,
                    color: '#0f172a',
                    letterSpacing: '-0.02em',
                    lineHeight: 1.2
                  }}
                >
                  Application Management
                </h1>
                <span 
                  className="medex-app-live-portal-pill"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    padding: '0.2rem 0.65rem',
                    borderRadius: '9999px',
                    backgroundColor: '#ecfdf5',
                    border: '1px solid #a7f3d0',
                    color: '#059669',
                    fontSize: '0.75rem',
                    fontWeight: 600
                  }}
                >
                  <span 
                    className="medex-app-live-portal-dot"
                    style={{
                      width: '0.45rem',
                      height: '0.45rem',
                      borderRadius: '50%',
                      backgroundColor: '#10b981'
                    }} 
                  />
                  Live Portal
                </span>
              </div>
              <p 
                className="medex-app-header-subtitle"
                style={{
                  fontSize: '0.82rem',
                  color: '#64748b',
                  marginTop: '0.25rem'
                }}
              >
                Review candidates, verify qualifications, and manage applications for your posted jobs.
              </p>
            </div>
          </div>

          {/* Right: User Pill + Back to Dashboard Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }} className="self-end md:self-center">
            {/* Mobile Filter Sheet Trigger */}
            <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="lg:hidden rounded-xl border-slate-200">
                  <Filter className="w-4 h-4 mr-1.5 text-blue-600" />
                  Filters
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[320px] sm:w-[400px] overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Filter Candidates</SheetTitle>
                  <SheetDescription>
                    Narrow applications by criteria, eligibility, and job post
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-5">
                  <FilterPanel onClose={() => setIsFilterSheetOpen(false)} />
                </div>
              </SheetContent>
            </Sheet>

            {/* Account profile pill matching Reference Image 2 */}
            <div 
              className="medex-app-user-pill hidden sm:flex"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                padding: '0.45rem 0.9rem',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '0.85rem',
                color: '#1e293b'
              }}
            >
              <div style={{
                width: '1.85rem',
                height: '1.85rem',
                borderRadius: '50%',
                backgroundColor: '#e2e8f0',
                color: '#475569',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <User style={{ width: '1.05rem', height: '1.05rem' }} />
              </div>
              <div style={{ textAlign: 'left', lineHeight: 1.15 }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a' }}>{user?.name || 'Aayush Paradkar'}</div>
                <div style={{ fontSize: '0.68rem', color: '#94a3b8', textTransform: 'capitalize' }}>{userRole === 'admin' ? 'Administrator' : 'Employer'}</div>
              </div>
              <ChevronDown style={{ width: '0.85rem', height: '0.85rem', color: '#94a3b8', marginLeft: '0.2rem' }} />
            </div>

            {/* Back to Dashboard Button matching Reference Image 2 */}
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onNavigate(userRole === 'employer' ? 'dashboard/employer' : 'dashboard/admin')}
              className="medex-app-back-btn hidden lg:flex"
              style={{
                height: '2.5rem',
                padding: '0 1.1rem',
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '0.85rem',
                fontSize: '0.82rem',
                fontWeight: 600,
                color: '#1e293b',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <ArrowLeft style={{ width: '1rem', height: '1rem', color: '#475569' }} />
              Back to Dashboard
            </Button>
          </div>
        </div>

        {/* Main Content Area - Responsive Grid Layout */}
        <div className="admin-applications-page__layout flex flex-col lg:flex-row gap-4 lg:gap-6 items-start">
          {/* Desktop Sidebar Filters */}
          <aside className="admin-applications-page__sidebar hidden lg:block lg:w-64 xl:w-72 flex-shrink-0">
            <div className="sticky top-4">
              <Card className="medex-filter-card">
                <FilterPanel />
              </Card>
            </div>
          </aside>

          {/* Main Content */}
          <main className="admin-applications-page__main flex-1 min-w-0">
            {/* Job Eligibility & Recruitment Overview Banner matching Reference Image 2 */}
            <div 
              className="medex-overview-banner"
              style={{
                position: 'relative',
                backgroundColor: '#ffffff',
                border: '1px solid #e8eff7',
                borderRadius: '1.25rem',
                padding: '1.75rem 2rem',
                boxShadow: '0 2px 12px rgba(15, 23, 42, 0.03)',
                marginBottom: '1.5rem',
                overflow: 'hidden'
              }}
            >
              {/* Decorative graphic in top-right corner from Reference Image 2 */}
              <div 
                className="medex-overview-illustration hidden md:flex items-center justify-center"
                style={{
                  position: 'absolute',
                  top: '1.25rem',
                  right: '1.75rem',
                  width: '8.5rem',
                  height: '6.5rem',
                  pointerEvents: 'none',
                  userSelect: 'none'
                }}
              >
                <div style={{ position: 'relative', width: '7rem', height: '5.5rem' }}>
                  <div style={{
                    width: '6.5rem',
                    height: '5rem',
                    backgroundColor: 'rgba(255,255,255,0.95)',
                    border: '1.5px solid #dbeafe',
                    borderRadius: '1rem',
                    boxShadow: '0 4px 12px rgba(37,99,235,0.06)',
                    padding: '0.65rem',
                    transform: 'rotate(4deg)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <div style={{
                        width: '1.5rem',
                        height: '1.5rem',
                        borderRadius: '50%',
                        backgroundColor: '#dbeafe',
                        color: '#2563eb',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <User style={{ width: '0.9rem', height: '0.9rem' }} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        <div style={{ width: '2.5rem', height: '0.35rem', backgroundColor: '#bfdbfe', borderRadius: '9999px' }} />
                        <div style={{ width: '1.5rem', height: '0.3rem', backgroundColor: '#e2e8f0', borderRadius: '9999px' }} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <div style={{ width: '100%', height: '0.3rem', backgroundColor: '#f1f5f9', borderRadius: '9999px' }} />
                      <div style={{ width: '70%', height: '0.3rem', backgroundColor: '#f1f5f9', borderRadius: '9999px' }} />
                    </div>
                  </div>
                  <div style={{
                    position: 'absolute',
                    bottom: '-0.25rem',
                    right: '-0.25rem',
                    width: '1.85rem',
                    height: '1.85rem',
                    borderRadius: '50%',
                    backgroundColor: '#10b981',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 10px rgba(16,185,129,0.35)',
                    border: '2px solid #ffffff'
                  }}>
                    <Check style={{ width: '0.95rem', height: '0.95rem', strokeWidth: 3 }} />
                  </div>
                </div>
              </div>

              {/* Scope Badge */}
              <div style={{ marginBottom: '0.6rem' }}>
                <span 
                  className="medex-scope-badge"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    padding: '0.35rem 0.85rem',
                    borderRadius: '9999px',
                    backgroundColor: '#eff6ff',
                    border: '1px solid #dbeafe',
                    color: '#2563eb',
                    fontSize: '0.75rem',
                    fontWeight: 700
                  }}
                >
                  <Users style={{ width: '0.9rem', height: '0.9rem', color: '#2563eb', flexShrink: 0 }} />
                  <span>{selectedJob ? 'Target Job Active Filter' : 'All Candidates Overview'}</span>
                </span>
              </div>

              {/* Title */}
              <h2 
                className="medex-overview-title"
                style={{
                  fontSize: '1.55rem',
                  fontWeight: 850,
                  color: '#0f172a',
                  letterSpacing: '-0.025em',
                  marginBottom: '0.4rem',
                  lineHeight: 1.25
                }}
              >
                {selectedJob?.title || eligibilitySummary?.jobTitle || 'All Candidates Across Posted Jobs'}
              </h2>

              {/* Sub-chips: Min Exp & Qualifications */}
              <div 
                className="medex-overview-criteria"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.82rem',
                  color: '#64748b',
                  fontWeight: 500
                }}
              >
                <Clock style={{ width: '1rem', height: '1rem', color: '#64748b', flexShrink: 0 }} />
                <span>
                  Min Exp: <strong style={{ fontWeight: 700, color: '#1e293b' }}>{eligibilitySummary?.jobCriteria?.minExperience ? `${eligibilitySummary.jobCriteria.minExperience}+ Years` : 'Fresher / Any'}</strong>
                </span>
                {eligibilitySummary?.jobCriteria?.qualifications && eligibilitySummary.jobCriteria.qualifications.length > 0 && (
                  <>
                    <span style={{ color: '#cbd5e1' }}>•</span>
                    <GraduationCap style={{ width: '1rem', height: '1rem', color: '#64748b', flexShrink: 0 }} />
                    <span>
                      Req: <strong style={{ fontWeight: 700, color: '#1e293b' }}>{eligibilitySummary.jobCriteria.qualifications.join(' / ')}</strong>
                    </span>
                  </>
                )}
              </div>

              {/* 2x2 Metric Cards Grid (EXACT MATCH TO REFERENCE IMAGE 2) */}
              <div 
                className="medex-stat-grid"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                  gap: '1.15rem',
                  marginTop: '1.5rem'
                }}
              >
                {/* 1. Total Applications (Blue Accent) */}
                <div 
                  role="button"
                  tabIndex={0}
                  onClick={() => {}}
                  className="medex-stat-card medex-stat-card--blue"
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e8eff7',
                    borderLeft: '5px solid #2563eb',
                    borderRadius: '1.15rem',
                    padding: '1.25rem 1.4rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div 
                      className="medex-stat-icon-box medex-stat-icon-box--blue"
                      style={{
                        width: '3.25rem',
                        height: '3.25rem',
                        borderRadius: '0.95rem',
                        backgroundColor: '#eff6ff',
                        color: '#2563eb',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginRight: '1.1rem'
                      }}
                    >
                      <Users style={{ width: '1.55rem', height: '1.55rem' }} />
                    </div>
                    <div>
                      <div className="medex-stat-label" style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', marginBottom: '0.35rem', lineHeight: 1 }}>
                        Total Applications
                      </div>
                      <div className="medex-stat-value" style={{ fontSize: '1.85rem', fontWeight: 850, color: '#0f172a', lineHeight: 1, marginBottom: '0.35rem', letterSpacing: '-0.02em' }}>
                        {eligibilitySummary?.totalApplications ?? applications.length}
                      </div>
                      <div className="medex-stat-trend medex-stat-trend--green" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.76rem', fontWeight: 600, color: '#10b981', lineHeight: 1 }}>
                        <TrendingUp style={{ width: '0.9rem', height: '0.9rem' }} />
                        <span>+0 since last week</span>
                      </div>
                    </div>
                  </div>
                  <div 
                    className="medex-stat-chevron"
                    style={{
                      width: '2rem',
                      height: '2rem',
                      borderRadius: '50%',
                      backgroundColor: '#f8fafc',
                      color: '#94a3b8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    <ChevronRight style={{ width: '1rem', height: '1rem' }} />
                  </div>
                </div>

                {/* 2. 100% Eligible (Green Accent) */}
                <div 
                  role="button"
                  tabIndex={0}
                  onClick={() => setFilters(prev => ({ ...prev, eligibleOnly: !prev.eligibleOnly }))}
                  className="medex-stat-card medex-stat-card--green"
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e8eff7',
                    borderLeft: '5px solid #10b981',
                    borderRadius: '1.15rem',
                    padding: '1.25rem 1.4rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div 
                      className="medex-stat-icon-box medex-stat-icon-box--green"
                      style={{
                        width: '3.25rem',
                        height: '3.25rem',
                        borderRadius: '0.95rem',
                        backgroundColor: '#ecfdf5',
                        color: '#10b981',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginRight: '1.1rem'
                      }}
                    >
                      <CheckCircle style={{ width: '1.55rem', height: '1.55rem' }} />
                    </div>
                    <div>
                      <div className="medex-stat-label" style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', marginBottom: '0.35rem', lineHeight: 1 }}>
                        100% Eligible
                      </div>
                      <div className="medex-stat-value" style={{ fontSize: '1.85rem', fontWeight: 850, color: '#0f172a', lineHeight: 1, marginBottom: '0.35rem', letterSpacing: '-0.02em' }}>
                        {eligibilitySummary?.eligibleCount ?? applications.filter(a => a.isEligible).length}
                      </div>
                      <div className="medex-stat-trend medex-stat-trend--green" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.76rem', fontWeight: 600, color: '#10b981', lineHeight: 1 }}>
                        <TrendingUp style={{ width: '0.9rem', height: '0.9rem' }} />
                        <span>
                          {applications.length > 0
                            ? `${Math.round(((eligibilitySummary?.eligibleCount ?? applications.filter(a => a.isEligible).length) / (eligibilitySummary?.totalApplications ?? applications.length)) * 100)}% of total`
                            : '100% of total'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div 
                    className="medex-stat-chevron"
                    style={{
                      width: '2rem',
                      height: '2rem',
                      borderRadius: '50%',
                      backgroundColor: '#f8fafc',
                      color: '#94a3b8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    <ChevronRight style={{ width: '1rem', height: '1rem' }} />
                  </div>
                </div>

                {/* 3. Shortlisted (Purple Accent) */}
                <div 
                  role="button"
                  tabIndex={0}
                  onClick={() => {}}
                  className="medex-stat-card medex-stat-card--purple"
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e8eff7',
                    borderLeft: '5px solid #8b5cf6',
                    borderRadius: '1.15rem',
                    padding: '1.25rem 1.4rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div 
                      className="medex-stat-icon-box medex-stat-icon-box--purple"
                      style={{
                        width: '3.25rem',
                        height: '3.25rem',
                        borderRadius: '0.95rem',
                        backgroundColor: '#f5f3ff',
                        color: '#8b5cf6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginRight: '1.1rem'
                      }}
                    >
                      <Star style={{ width: '1.55rem', height: '1.55rem' }} />
                    </div>
                    <div>
                      <div className="medex-stat-label" style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', marginBottom: '0.35rem', lineHeight: 1 }}>
                        Shortlisted
                      </div>
                      <div className="medex-stat-value" style={{ fontSize: '1.85rem', fontWeight: 850, color: '#0f172a', lineHeight: 1, marginBottom: '0.35rem', letterSpacing: '-0.02em' }}>
                        {eligibilitySummary?.shortlistedCount ?? applications.filter(a => a.status === 'shortlisted').length}
                      </div>
                      <div className="medex-stat-trend medex-stat-trend--muted" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.76rem', fontWeight: 500, color: '#94a3b8', lineHeight: 1 }}>
                        <span>—</span>
                        <span>
                          {applications.length > 0
                            ? `${Math.round(((eligibilitySummary?.shortlistedCount ?? applications.filter(a => a.status === 'shortlisted').length) / (eligibilitySummary?.totalApplications ?? applications.length)) * 100)}% of total`
                            : '0% of total'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div 
                    className="medex-stat-chevron"
                    style={{
                      width: '2rem',
                      height: '2rem',
                      borderRadius: '50%',
                      backgroundColor: '#f8fafc',
                      color: '#94a3b8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    <ChevronRight style={{ width: '1rem', height: '1rem' }} />
                  </div>
                </div>

                {/* 4. Pending Review (Amber Accent) */}
                <div 
                  role="button"
                  tabIndex={0}
                  onClick={() => {}}
                  className="medex-stat-card medex-stat-card--amber"
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e8eff7',
                    borderLeft: '5px solid #f59e0b',
                    borderRadius: '1.15rem',
                    padding: '1.25rem 1.4rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div 
                      className="medex-stat-icon-box medex-stat-icon-box--amber"
                      style={{
                        width: '3.25rem',
                        height: '3.25rem',
                        borderRadius: '0.95rem',
                        backgroundColor: '#fffbeb',
                        color: '#f59e0b',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginRight: '1.1rem'
                      }}
                    >
                      <Clock style={{ width: '1.55rem', height: '1.55rem' }} />
                    </div>
                    <div>
                      <div className="medex-stat-label" style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', marginBottom: '0.35rem', lineHeight: 1 }}>
                        Pending Review
                      </div>
                      <div className="medex-stat-value" style={{ fontSize: '1.85rem', fontWeight: 850, color: '#0f172a', lineHeight: 1, marginBottom: '0.35rem', letterSpacing: '-0.02em' }}>
                        {applications.filter(a => ['pending', 'applied'].includes(a.status)).length}
                      </div>
                      <div className="medex-stat-trend medex-stat-trend--amber" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.76rem', fontWeight: 600, color: '#f59e0b', lineHeight: 1 }}>
                        <TrendingUp style={{ width: '0.9rem', height: '0.9rem' }} />
                        <span>
                          {applications.length > 0
                            ? `${Math.round((applications.filter(a => ['pending', 'applied'].includes(a.status)).length / (eligibilitySummary?.totalApplications ?? applications.length)) * 100)}% of total`
                            : '0% of total'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div 
                    className="medex-stat-chevron"
                    style={{
                      width: '2rem',
                      height: '2rem',
                      borderRadius: '50%',
                      backgroundColor: '#f8fafc',
                      color: '#94a3b8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    <ChevronRight style={{ width: '1rem', height: '1rem' }} />
                  </div>
                </div>
              </div>
            </div>

            <Tabs defaultValue="all" className="admin-applications-page__tabs w-full">
              <div className="admin-applications-page__tabs-toolbar flex items-center justify-between mb-4 sm:mb-6">
                <TabsList className="inline-flex h-9 sm:h-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-gray-800 p-1 text-slate-600 dark:text-gray-400 border border-slate-200 dark:border-gray-700">
                  <TabsTrigger 
                    value="all" 
                    className="text-xs sm:text-sm px-3 sm:px-4 rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white font-semibold transition-all"
                  >
                    <Users className="w-3.5 h-3.5 mr-1.5" /> All ({filteredApplications.length})
                  </TabsTrigger>
                  <TabsTrigger 
                    value="active" 
                    className="text-xs sm:text-sm px-3 sm:px-4 rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white font-semibold transition-all"
                  >
                    <Rocket className="w-3.5 h-3.5 mr-1.5" /> Active
                  </TabsTrigger>
                  <TabsTrigger 
                    value="interview" 
                    className="text-xs sm:text-sm px-3 sm:px-4 rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white font-semibold transition-all"
                  >
                    <Calendar className="w-3.5 h-3.5 mr-1.5" /> Interviews Completed
                  </TabsTrigger>
                  <TabsTrigger value="shortlisted" className="text-xs sm:text-sm px-3 sm:px-4 rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white font-semibold transition-all">
                    <Star className="w-3.5 h-3.5 mr-1.5" /> Shortlisted
                  </TabsTrigger>
                  <TabsTrigger value="hired" className="text-xs sm:text-sm px-3 sm:px-4 rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white font-semibold transition-all">
                    <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Hired
                  </TabsTrigger>
                  <TabsTrigger value="rejected" className="text-xs sm:text-sm px-3 sm:px-4 rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white font-semibold transition-all">
                    <XCircle className="w-3.5 h-3.5 mr-1.5" /> Rejected
                  </TabsTrigger>
                </TabsList>
                <div className="admin-applications-page__view-tools hidden sm:flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFilters(prev => ({
                      ...prev,
                      sortBy: prev.sortBy === 'eligibility' ? 'appliedDate' : 'eligibility'
                    }))}
                    className="h-10 text-xs font-semibold rounded-xl border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-100"
                  >
                    <ArrowUpDown className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                    Sort: {filters.sortBy === 'eligibility' ? 'Eligibility Match' : 'Applied Date'}
                    <ChevronDown className="w-3.5 h-3.5 ml-1 text-slate-400" />
                  </Button>
                  <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-gray-800 border border-slate-200 dark:border-gray-700">
                    <Button
                      variant={viewMode === 'grid' ? 'default' : 'ghost'}
                      size="icon"
                      aria-label="Grid view"
                      onClick={() => setViewMode('grid')}
                      className={`h-8 w-8 rounded-lg transition-all ${
                        viewMode === 'grid' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      <Grid2X2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant={viewMode === 'list' ? 'default' : 'ghost'}
                      size="icon"
                      aria-label="List view"
                      onClick={() => setViewMode('list')}
                      className={`h-8 w-8 rounded-lg transition-all ${
                        viewMode === 'list' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      <List className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <TabsContent value="all" className="mt-4 sm:mt-6">
                {loading ? (
                  <div className={`mx-candidates ${viewMode === 'list' ? 'mx-candidates--list' : ''}`}>
                    {[...Array(6)].map((_, i) => (
                      <ApplicationSkeleton key={i} />
                    ))}
                  </div>
                ) : filteredApplications.length === 0 ? (
                  <Card 
                    className="text-center p-8 sm:p-12"
                  >
                    <Briefcase className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base">
                      No applications found matching your criteria.
                    </p>
                  </Card>
                ) : (
                  <div className={`mx-candidates ${viewMode === 'list' ? 'mx-candidates--list' : ''}`}>
                    {filteredApplications.map(renderApplicationCard)}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="active" className="mt-4 sm:mt-6">
                {loading ? (
                  <div className={`mx-candidates ${viewMode === 'list' ? 'mx-candidates--list' : ''}`}>
                    {[...Array(6)].map((_, i) => (
                      <ApplicationSkeleton key={i} />
                    ))}
                  </div>
                ) : filteredApplications.filter(app => ['pending', 'applied', 'shortlisted'].includes(app.status)).length === 0 ? (
                  <Card className="p-8 sm:p-12 text-center">
                    <Briefcase className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">No active applications found.</p>
                  </Card>
                ) : (
                  <div className={`mx-candidates ${viewMode === 'list' ? 'mx-candidates--list' : ''}`}>
                    {filteredApplications
                      .filter(app => ['pending', 'applied', 'shortlisted'].includes(app.status))
                      .map(renderApplicationCard)}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="interview" className="mt-4 sm:mt-6">
                {loading ? (
                  <div className={`mx-candidates ${viewMode === 'list' ? 'mx-candidates--list' : ''}`}>
                    {[...Array(6)].map((_, i) => (
                      <ApplicationSkeleton key={i} />
                    ))}
                  </div>
                ) : filteredApplications.filter(app => app.status === 'interview').length === 0 ? (
                  <Card className="p-8 sm:p-12 text-center">
                    <Calendar className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">No interview scheduled applications found.</p>
                  </Card>
                ) : (
                  <div className={`mx-candidates ${viewMode === 'list' ? 'mx-candidates--list' : ''}`}>
                    {filteredApplications
                      .filter(app => app.status === 'interview')
                      .map(renderApplicationCard)}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="completed" className="mt-4 sm:mt-6">
                {loading ? (
                  <div className={`mx-candidates ${viewMode === 'list' ? 'mx-candidates--list' : ''}`}>
                    {[...Array(6)].map((_, i) => (
                      <ApplicationSkeleton key={i} />
                    ))}
                  </div>
                ) : filteredApplications.filter(app => ['hired', 'selected', 'rejected'].includes(app.status)).length === 0 ? (
                  <Card className="p-8 sm:p-12 text-center">
                    <CheckCircle className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">No completed applications found.</p>
                  </Card>
                ) : (
                  <div className={`mx-candidates ${viewMode === 'list' ? 'mx-candidates--list' : ''}`}>
                    {filteredApplications
                      .filter(app => ['hired', 'selected', 'rejected'].includes(app.status))
                      .map(renderApplicationCard)}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="shortlisted" className="mt-4 sm:mt-6">
                {renderStatusGrid(['shortlisted'], 'No shortlisted applications found.', Star)}
              </TabsContent>

              <TabsContent value="hired" className="mt-4 sm:mt-6">
                {renderStatusGrid(['hired', 'selected'], 'No hired applications found.', CheckCircle)}
              </TabsContent>

              <TabsContent value="rejected" className="mt-4 sm:mt-6">
                {renderStatusGrid(['rejected'], 'No rejected applications found.', XCircle)}
              </TabsContent>
            </Tabs>
          </main>
        </div>
      </div>

      {/* 1. Root View Details Dialog */}
      <Dialog 
        open={isViewDialogOpen && !!selectedApplication} 
        onOpenChange={(open) => {
          setIsViewDialogOpen(open);
          if (!open) setSelectedApplication(null);
        }}
      >
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedApplication && (
            <>
              <DialogHeader>
                <DialogTitle className="text-lg sm:text-xl">
                  Application Details - {selectedApplication.candidateName}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {/* Clinical Eligibility Assessment Card */}
                <div className={`p-4 rounded-xl border ${
                  selectedApplication.isEligible 
                    ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800' 
                    : (selectedApplication.eligibilityScore ?? 0) >= 60 
                    ? 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800' 
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
                }`}>
                  <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                    <h3 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 text-sm sm:text-base">
                      <Award className={`w-5 h-5 ${selectedApplication.isEligible ? 'text-emerald-600' : 'text-amber-600'}`} />
                      Eligibility &amp; Clinical Match Assessment
                    </h3>
                    {selectedApplication.isEligible ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-600 text-white shadow-xs">
                        <Check className="w-3.5 h-3.5" /> 100% Eligible Candidate
                      </span>
                    ) : (selectedApplication.eligibilityScore ?? 0) > 0 ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-600 text-white shadow-xs">
                        <AlertCircle className="w-3.5 h-3.5" /> {selectedApplication.eligibilityScore}% Match
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                        General Application
                      </span>
                    )}
                  </div>

                  {/* Medical Attributes Breakdown Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs sm:text-sm">
                    <div className="bg-white/90 dark:bg-gray-800/90 p-2.5 rounded-lg border border-gray-200/80 dark:border-gray-700">
                      <div className="font-semibold text-gray-500 dark:text-gray-400 text-xs">Medical Qualification</div>
                      <div className="font-bold text-gray-900 dark:text-gray-100 mt-0.5">
                        {selectedApplication.candidateQualification || 'Not Specified'}
                      </div>
                    </div>

                    <div className="bg-white/90 dark:bg-gray-800/90 p-2.5 rounded-lg border border-gray-200/80 dark:border-gray-700">
                      <div className="font-semibold text-gray-500 dark:text-gray-400 text-xs">Clinical Experience</div>
                      <div className="font-bold text-gray-900 dark:text-gray-100 mt-0.5">
                        {selectedApplication.candidateYearsExperience != null ? `${selectedApplication.candidateYearsExperience} Years` : 'Not Specified'}
                      </div>
                    </div>

                    <div className="bg-white/90 dark:bg-gray-800/90 p-2.5 rounded-lg border border-gray-200/80 dark:border-gray-700">
                      <div className="font-semibold text-gray-500 dark:text-gray-400 text-xs">Registration Number</div>
                      <div className="font-bold mt-0.5">
                        {selectedApplication.candidateRegistrationNumber ? (
                          <span className="text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                            <ShieldCheck className="w-4 h-4 text-emerald-600 inline" />
                            {selectedApplication.candidateRegistrationNumber}
                          </span>
                        ) : (
                          <span className="text-amber-600">No Registration Provided</span>
                        )}
                      </div>
                    </div>

                    <div className="bg-white/90 dark:bg-gray-800/90 p-2.5 rounded-lg border border-gray-200/80 dark:border-gray-700">
                      <div className="font-semibold text-gray-500 dark:text-gray-400 text-xs">Registration Council</div>
                      <div className="font-bold text-gray-900 dark:text-gray-100 mt-0.5">
                        {selectedApplication.candidateRegistrationCouncil || 'Not Specified'}
                      </div>
                    </div>
                  </div>

                  {/* Met vs Missing Criteria Tags */}
                  {((selectedApplication.matchingCriteria && selectedApplication.matchingCriteria.length > 0) || (selectedApplication.unmetCriteria && selectedApplication.unmetCriteria.length > 0)) && (
                    <div className="mt-3 pt-3 border-t border-gray-200/60 dark:border-gray-700/60 space-y-2">
                      {selectedApplication.matchingCriteria && selectedApplication.matchingCriteria.length > 0 && (
                        <div>
                          <div className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider mb-1">
                            Met Criteria:
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {selectedApplication.matchingCriteria.map((c, i) => (
                              <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300">
                                <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" /> {c}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {selectedApplication.unmetCriteria && selectedApplication.unmetCriteria.length > 0 && (
                        <div>
                          <div className="text-[11px] font-bold text-rose-800 dark:text-rose-300 uppercase tracking-wider mb-1">
                            Review Required / Unmet:
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {selectedApplication.unmetCriteria.map((c, i) => (
                              <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300">
                                <XCircle className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" /> {c}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Candidate Information */}
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2 text-sm sm:text-base">
                    <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                    Candidate Information
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Full Name</label>
                      <p className="text-sm sm:text-base text-gray-900 dark:text-gray-100 font-semibold break-words">
                        {selectedApplication.candidateName}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Email</label>
                      <p className="text-sm sm:text-base text-gray-900 dark:text-gray-100 flex items-center gap-2 break-all">
                        <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                        <a href={`mailto:${selectedApplication.candidateEmail}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                          {selectedApplication.candidateEmail}
                        </a>
                      </p>
                      <p className="text-sm sm:text-base text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                        <a href={`tel:${selectedApplication.candidatePhone}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                          {selectedApplication.candidatePhone || 'N/A'}
                        </a>
                      </p>
                    </div>
                    <div>
                      <label className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Applied Date</label>
                      <p className="text-sm sm:text-base text-gray-900 dark:text-gray-100">{formatDate(selectedApplication.appliedDate)}</p>
                    </div>
                  </div>
                </div>

                {/* Job Information */}
                <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2 text-sm sm:text-base">
                    <Briefcase className="w-4 h-4 sm:w-5 sm:h-5" />
                    Job Information
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Job Title</label>
                      <p className="text-sm sm:text-base text-gray-900 dark:text-gray-100 break-words">
                        {selectedApplication.jobTitle}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Organization</label>
                      <p className="text-sm sm:text-base text-gray-900 dark:text-gray-100 break-words">
                        {selectedApplication.jobOrganization}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Application Status</label>
                      <div className="mt-1">
                        <Badge className={getStatusColor(selectedApplication.status)} variant="outline">
                          {getStatusLabel(selectedApplication.status)}
                        </Badge>
                      </div>
                    </div>
                    {selectedApplication.interviewDate && (
                      <div className="sm:col-span-2 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                        <label className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Interview Scheduled</label>
                        <p className="text-sm sm:text-base text-gray-900 dark:text-gray-100 font-semibold break-words mt-0.5">
                          {formatDateTime(selectedApplication.interviewDate)}
                        </p>
                        {selectedApplication.interviewLink ? (
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <a
                              href={selectedApplication.interviewLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-md shadow-xs transition-colors"
                            >
                              <Video className="w-3.5 h-3.5" />
                              Join Meeting
                              <ExternalLink className="w-3 h-3" />
                            </a>
                            <span className="text-xs text-gray-600 dark:text-gray-400 break-all">
                              {selectedApplication.interviewLink}
                            </span>
                          </div>
                        ) : (
                          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                            No Zoom / Google Meet link attached yet.
                          </p>
                        )}
                        {selectedApplication.interviewNotes && (
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700">
                            <span className="font-semibold text-gray-700 dark:text-gray-300">Instructions:</span> {selectedApplication.interviewNotes}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Resume */}
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2 text-sm sm:text-base">
                    <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
                    Resume
                  </h3>
                  {selectedApplication.resumeUrl ? (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <Button 
                        variant="default" 
                        onClick={() => openFileInViewer(selectedApplication.resumeUrl!)}
                        className="w-full sm:w-auto"
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        View Resume
                      </Button>
                      <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 text-center sm:text-left">
                        Click to view or download the candidate's resume
                      </span>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600 dark:text-gray-400">No resume uploaded by candidate</p>
                  )}
                </div>

                {/* Notes */}
                {selectedApplication.notes && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 text-sm sm:text-base">Application Notes</h3>
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
                      {selectedApplication.notes}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* 2. Root Update Status Dialog */}
      <Dialog 
        open={isStatusDialogOpen && !!selectedApplication} 
        onOpenChange={(open) => {
          setIsStatusDialogOpen(open);
          if (!open) setSelectedApplication(null);
        }}
      >
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Update Application Status</DialogTitle>
          </DialogHeader>
          {selectedApplication && (
            <StatusUpdateForm
              key={selectedApplication.id}
              application={selectedApplication}
              onUpdate={(status, notes, interviewDate, interviewLink) => {
                if (selectedApplication) {
                  updateApplicationStatusHandler(
                    selectedApplication.id,
                    status,
                    notes,
                    interviewDate,
                    interviewLink,
                    notes
                  );
                }
              }}
              onCancel={() => {
                setIsStatusDialogOpen(false);
                setSelectedApplication(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* 3. Root Interview Scheduling Dialog */}
      <Dialog 
        open={isInterviewDialogOpen && !!selectedApplication} 
        onOpenChange={(open) => {
          setIsInterviewDialogOpen(open);
          if (!open) setSelectedApplication(null);
        }}
      >
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">
              {selectedApplication?.interviewDate ? 'Interview Details / Reschedule' : 'Schedule Interview'}
            </DialogTitle>
          </DialogHeader>
          {selectedApplication && (
            <InterviewSchedulingForm
              key={selectedApplication.id}
              application={selectedApplication}
              onSchedule={(date, notes, link) => {
                if (selectedApplication) {
                  updateApplicationStatusHandler(
                    selectedApplication.id,
                    'interview',
                    notes,
                    date,
                    link,
                    notes
                  );
                }
              }}
              onCancel={() => {
                setIsInterviewDialogOpen(false);
                setSelectedApplication(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface StatusUpdateFormProps {
  application: ApplicationResponse | null;
  onUpdate: (status: string, notes?: string, interviewDate?: string, interviewLink?: string) => void;
  onCancel: () => void;
}

function StatusUpdateForm({ application, onUpdate, onCancel }: StatusUpdateFormProps) {
  const [status, setStatus] = useState<string>(() => application?.status || 'pending');
  const [notes, setNotes] = useState(application?.notes || '');
  const [interviewDate, setInterviewDate] = useState(() => {
    if (application?.interviewDate) {
      const d = new Date(application.interviewDate);
      if (!isNaN(d.getTime())) {
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      }
    }
    return '';
  });
  const [interviewTime, setInterviewTime] = useState(() => {
    if (application?.interviewDate) {
      const d = new Date(application.interviewDate);
      if (!isNaN(d.getTime())) {
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
      }
    }
    return '10:00';
  });
  const [interviewLink, setInterviewLink] = useState(application?.interviewLink || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (status === 'interview') {
      const dateTime = `${interviewDate}T${interviewTime}`;
      onUpdate(status, notes, dateTime, interviewLink.trim());
    } else {
      onUpdate(status, notes);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="status">New Status</Label>
        <select
          id="status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-full mt-1 p-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-md text-sm"
        >
          <option value="pending">Pending</option>
          <option value="shortlisted">Shortlisted</option>
          <option value="interview">Interview</option>
          <option value="hired">Hired</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {status === 'interview' && (
        <div className="p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="statusInterviewDate" className="text-xs">Interview Date</Label>
              <input
                id="statusInterviewDate"
                type="date"
                value={interviewDate}
                onChange={(e) => setInterviewDate(e.target.value)}
                className="w-full mt-1 p-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-md text-sm"
                required
              />
            </div>
            <div>
              <Label htmlFor="statusInterviewTime" className="text-xs">Interview Time</Label>
              <input
                id="statusInterviewTime"
                type="time"
                value={interviewTime}
                onChange={(e) => setInterviewTime(e.target.value)}
                className="w-full mt-1 p-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-md text-sm"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="statusInterviewLink" className="flex items-center gap-1.5 text-xs">
              <Video className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span>Meeting Link (Google Meet / Zoom URL)</span>
            </Label>
            <Input
              id="statusInterviewLink"
              type="url"
              value={interviewLink}
              onChange={(e) => setInterviewLink(e.target.value)}
              className="mt-1 text-sm bg-white dark:bg-gray-800"
              placeholder="https://meet.google.com/xyz-abcd-efg or Zoom link"
            />
          </div>
        </div>
      )}

      <div>
        <Label htmlFor="notes">Notes (Optional)</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="mt-1 text-sm"
          rows={3}
          placeholder="Add any notes about this status update..."
        />
      </div>

      <div className="flex items-center gap-3 pt-3 mt-2 border-t border-gray-200 dark:border-gray-700">
        <Button 
          type="submit" 
          className="flex-1 font-semibold flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
          style={{
            backgroundColor: '#2563eb',
            color: '#ffffff',
            minHeight: '42px',
            border: 'none',
          }}
        >
          <CheckCircle className="w-4 h-4 text-white flex-shrink-0" />
          <span>Update Status</span>
        </Button>
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel}
          className="px-5 font-medium border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
          style={{ minHeight: '42px' }}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

interface InterviewSchedulingFormProps {
  application: ApplicationResponse | null;
  onSchedule: (date: string, notes?: string, link?: string) => void;
  onCancel: () => void;
}

function InterviewSchedulingForm({ application, onSchedule, onCancel }: InterviewSchedulingFormProps) {
  const [interviewDate, setInterviewDate] = useState(() => {
    if (application?.interviewDate) {
      const d = new Date(application.interviewDate);
      if (!isNaN(d.getTime())) {
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      }
    }
    return '';
  });
  const [interviewTime, setInterviewTime] = useState(() => {
    if (application?.interviewDate) {
      const d = new Date(application.interviewDate);
      if (!isNaN(d.getTime())) {
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
      }
    }
    return '10:00';
  });
  const [interviewLink, setInterviewLink] = useState(application?.interviewLink || '');
  const [notes, setNotes] = useState(application?.interviewNotes || application?.notes || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const dateTime = `${interviewDate}T${interviewTime}`;
    onSchedule(dateTime, notes, interviewLink.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="date">Interview Date</Label>
          <input
            id="date"
            type="date"
            value={interviewDate}
            onChange={(e) => setInterviewDate(e.target.value)}
            className="w-full mt-1 p-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md text-sm"
            required
          />
        </div>
        <div>
          <Label htmlFor="time">Interview Time</Label>
          <input
            id="time"
            type="time"
            value={interviewTime}
            onChange={(e) => setInterviewTime(e.target.value)}
            className="w-full mt-1 p-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md text-sm"
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="interviewLink" className="flex items-center gap-1.5">
          <Video className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
          <span>Meeting Link (Google Meet / Zoom URL)</span>
        </Label>
        <Input
          id="interviewLink"
          type="url"
          value={interviewLink}
          onChange={(e) => setInterviewLink(e.target.value)}
          className="mt-1 text-sm"
          placeholder="https://meet.google.com/xyz-abcd-efg or Zoom link"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          This link will be sent to the candidate in an alert and shown as a direct Join button.
        </p>
      </div>

      <div>
        <Label htmlFor="notes">Interview Instructions / Notes (Optional)</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="mt-1 text-sm"
          rows={3}
          placeholder="e.g. Round 1 Technical Interview. Please keep your camera on."
        />
      </div>

      <div className="flex items-center gap-3 pt-3 mt-2 border-t border-gray-200 dark:border-gray-700">
        <Button 
          type="submit" 
          className="flex-1 font-semibold flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
          style={{
            backgroundColor: '#7c3aed',
            color: '#ffffff',
            minHeight: '42px',
            border: 'none',
          }}
        >
          <CheckCircle className="w-4 h-4 text-white flex-shrink-0" />
          <span>{application?.interviewDate ? 'Save & Update Interview' : 'Schedule Interview'}</span>
        </Button>
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel}
          className="px-5 font-medium border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
          style={{ minHeight: '42px' }}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
