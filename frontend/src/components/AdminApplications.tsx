import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Clock, CheckCircle, XCircle, Calendar, FileText, Eye, MessageSquare, 
  Phone, Mail, MapPin, Search, Filter, Users, Briefcase, MoreVertical, 
  Loader2, ArrowLeft, AlertCircle, Video, ExternalLink, Check, Sparkles, 
  ShieldCheck, GraduationCap, Stethoscope, SlidersHorizontal, RefreshCw, Award,
  Building2, Plus, Star, Target, Rocket, Package, User, Bell, ChevronDown,
  ArrowUpDown, Grid2X2, List
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
        <Label htmlFor="search" className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Search Candidates</Label>
        <div className="relative mt-1.5">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            id="search"
            placeholder="Name, email, phone, city, skills..."
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            className="pl-9 text-xs sm:text-sm h-9"
          />
        </div>
      </div>

      {/* 2. Target Job Selector */}
      <div>
        <Label htmlFor="jobId" className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Target Job Post</Label>
        <Select 
          value={filters.jobId} 
          onValueChange={(value) => setFilters(prev => ({ ...prev, jobId: value }))}
        >
          <SelectTrigger className="mt-1.5 text-xs sm:text-sm h-9">
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

      {/* 3. Quick 1-Click Toggle: 100% Eligible Only */}
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
        className={`p-2.5 rounded-xl border transition-all cursor-pointer select-none ${
          filters.eligibleOnly 
            ? 'bg-blue-50/60 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 shadow-2xs' 
            : 'bg-white dark:bg-gray-800 border-slate-200 dark:border-gray-700 hover:border-slate-300'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
              <Target className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight">
                100% Eligible Only
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate leading-tight">
                Tap to show fully qualified
              </p>
            </div>
          </div>
          {/* Sleek Toggle switch indicator */}
          <div className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full transition-colors duration-200 ease-in-out ${
            filters.eligibleOnly ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'
          }`}>
            <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out my-auto mx-0.5 ${
              filters.eligibleOnly ? 'translate-x-4' : 'translate-x-0'
            }`} />
          </div>
        </div>
      </div>

      {/* 4. Medical Qualification */}
      <div>
        <Label htmlFor="qualification" className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Required Medical Degree</Label>
        <Select 
          value={filters.qualification} 
          onValueChange={(value) => setFilters(prev => ({ ...prev, qualification: value }))}
        >
          <SelectTrigger className="mt-1.5 text-xs sm:text-sm h-9">
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

      {/* 5. Speciality */}
      <div>
        <Label htmlFor="speciality" className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Medical Speciality</Label>
        <Input
          id="speciality"
          placeholder="e.g. Cardiology, Paediatrics..."
          value={filters.speciality}
          onChange={(e) => setFilters(prev => ({ ...prev, speciality: e.target.value }))}
          className="mt-1.5 text-xs sm:text-sm h-9"
        />
      </div>

      {/* 6. Clinical Experience */}
      <div>
        <Label htmlFor="minExp" className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Clinical Experience</Label>
        <Select 
          value={filters.minExp} 
          onValueChange={(value) => setFilters(prev => ({ ...prev, minExp: value }))}
        >
          <SelectTrigger className="mt-1.5 text-xs sm:text-sm h-9">
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

      {/* 7. State Medical Council Registration */}
      <div>
        <Label htmlFor="registrationStatus" className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">State Medical Registration</Label>
        <Select 
          value={filters.registrationStatus} 
          onValueChange={(value) => setFilters(prev => ({ ...prev, registrationStatus: value }))}
        >
          <SelectTrigger className="mt-1.5 text-xs sm:text-sm h-9">
            <SelectValue placeholder="All Candidates" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Candidates</SelectItem>
            <SelectItem value="registered">Registered Only (Has Valid Reg No)</SelectItem>
            <SelectItem value="unregistered">Unregistered / Reg Missing</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 8. Registration Council */}
      <div>
        <Label htmlFor="council" className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Medical Council / State</Label>
        <Input
          id="council"
          placeholder="e.g. Maharashtra Medical Council..."
          value={filters.council}
          onChange={(e) => setFilters(prev => ({ ...prev, council: e.target.value }))}
          className="mt-1.5 text-xs sm:text-sm h-9"
        />
      </div>

      {/* 9. Candidate State / City */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label htmlFor="state" className="text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">State</Label>
          <Input
            id="state"
            placeholder="e.g. Maharashtra"
            value={filters.state}
            onChange={(e) => setFilters(prev => ({ ...prev, state: e.target.value }))}
            className="mt-1 text-xs h-8"
          />
        </div>
        <div>
          <Label htmlFor="city" className="text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">City</Label>
          <Input
            id="city"
            placeholder="e.g. Mumbai"
            value={filters.city}
            onChange={(e) => setFilters(prev => ({ ...prev, city: e.target.value }))}
            className="mt-1 text-xs h-8"
          />
        </div>
      </div>

      {/* 10. Application Status */}
      <div>
        <Label htmlFor="status" className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Application Status</Label>
        <Select 
          value={filters.status} 
          onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
        >
          <SelectTrigger className="mt-1.5 text-xs sm:text-sm h-9">
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

      {/* 11. Sort By */}
      <div>
        <Label htmlFor="sortBy" className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Sort Order</Label>
        <Select 
          value={filters.sortBy} 
          onValueChange={(value) => setFilters(prev => ({ ...prev, sortBy: value }))}
        >
          <SelectTrigger className="mt-1.5 text-xs sm:text-sm h-9">
            <SelectValue placeholder="Sort Order" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="eligibility">🎯 Eligibility Match (Highest Score First)</SelectItem>
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
          className="flex-1 text-xs h-9"
        >
          Clear All
        </Button>
        <Button
          variant="default"
          onClick={() => {
            loadApplications();
            onClose?.();
          }}
          className="flex-1 text-xs h-9 bg-teal-600 hover:bg-teal-700 text-white font-bold"
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
    
    // Status color mapping matching MedExJob vibrant palette & mockup (media_1790125402255.png)
    // 100% Eligible: Emerald | Hired: Sky Blue | Interview: Royal Purple | Pending: Warm Amber | Rejected: Rose
    let cardThemeBorderClass = 'card-border-blue border-blue-200 hover:border-blue-400 bg-gradient-to-b from-blue-50/30 via-white to-white';
    let statusBadgeBg = 'bg-blue-50 text-blue-700 border-blue-200';
    let statusIcon = <User className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />;
    let progressColorClass = 'bg-blue-600';
    let avatarClass = 'avatar-blue';

    if (isEligible || score === 100) {
      cardThemeBorderClass = 'card-border-emerald border-emerald-300 hover:border-emerald-500 bg-gradient-to-b from-emerald-50/40 via-white to-white';
      statusBadgeBg = application.status === 'interview' 
        ? 'bg-purple-50 text-purple-700 border-purple-200' 
        : 'bg-emerald-50 text-emerald-700 border-emerald-200';
      statusIcon = application.status === 'interview' 
        ? <Clock className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" /> 
        : <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />;
      progressColorClass = application.status === 'interview' ? 'bg-[#7c3aed]' : 'bg-[#10b981]';
      avatarClass = 'avatar-emerald';
    } else if (application.status === 'hired') {
      cardThemeBorderClass = 'card-border-sky border-sky-300 hover:border-sky-500 bg-gradient-to-b from-sky-50/40 via-white to-white';
      statusBadgeBg = 'bg-sky-50 text-sky-700 border-sky-200';
      statusIcon = <Briefcase className="w-3.5 h-3.5 text-sky-600 flex-shrink-0" />;
      progressColorClass = 'bg-[#10b981]';
      avatarClass = 'avatar-blue';
    } else if (application.status === 'interview') {
      cardThemeBorderClass = 'card-border-purple border-purple-300 hover:border-purple-500 bg-gradient-to-b from-purple-50/40 via-white to-white';
      statusBadgeBg = 'bg-purple-50 text-purple-700 border-purple-200';
      statusIcon = <Clock className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />;
      progressColorClass = 'bg-[#7c3aed]';
      avatarClass = 'avatar-purple';
    } else if (application.status === 'pending' || (score >= 40 && score < 100)) {
      cardThemeBorderClass = 'card-border-amber border-amber-300 hover:border-amber-500 bg-gradient-to-b from-amber-50/40 via-white to-white';
      statusBadgeBg = 'bg-amber-50 text-amber-800 border-amber-200';
      statusIcon = <Clock className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />;
      progressColorClass = 'bg-[#f59e0b]';
      avatarClass = 'avatar-amber';
    } else if (application.status === 'rejected') {
      cardThemeBorderClass = 'card-border-rose border-rose-300 hover:border-rose-500 bg-gradient-to-b from-rose-50/40 via-white to-white';
      statusBadgeBg = 'bg-rose-50 text-rose-700 border-rose-200';
      statusIcon = <XCircle className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />;
      progressColorClass = 'bg-[#e11d48]';
      avatarClass = 'avatar-rose';
    }

    // Eligibility Match tier & list
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

    // Fallback if empty
    if (criteriaItems.length === 0) {
      if (application.candidateQualification) {
        criteriaItems.push({ text: `Degree: ${application.candidateQualification} (Eligible)`, met: true });
      }
      if (application.candidateSpeciality) {
        criteriaItems.push({ text: `Speciality: ${application.candidateSpeciality}`, met: true });
      }
      if (application.candidateYearsExperience != null) {
        criteriaItems.push({ text: `Experience: ${application.candidateYearsExperience} Yrs`, met: true });
      }
      if (application.candidateRegistrationNumber) {
        criteriaItems.push({ 
          text: `Reg: ${application.candidateRegistrationNumber}${application.candidateRegistrationCouncil ? ` (${application.candidateRegistrationCouncil})` : ''} (Valid)`, 
          met: true 
        });
      }
      if (application.candidateState || application.candidateCity) {
        criteriaItems.push({ 
          text: `Location: ${[application.candidateCity, application.candidateState].filter(Boolean).join(', ')} (Matched)`, 
          met: true 
        });
      }
    }

    const isHighTier = isEligible || score >= 80;
    const isMediumTier = !isHighTier && (score >= 40 || application.status === 'pending');
    const tierLabel = isHighTier ? 'High' : isMediumTier ? 'Medium' : 'Low';

    const isExpanded = !!expandedEligibility[application.id];
    const maxInitialCriteria = 4;
    const visibleCriteria = isExpanded ? criteriaItems : criteriaItems.slice(0, maxInitialCriteria);
    const hasMoreCriteria = criteriaItems.length > maxInitialCriteria;

    return (
      <div 
        key={application.id} 
        data-medex-applicant-enhanced="v2"
        className={`group relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xs hover:shadow-lg transition-all duration-200 flex flex-col medex-applicant-card h-full p-3.5 sm:p-4 text-slate-800 dark:text-slate-100 ${cardThemeBorderClass}`}
      >
        {/* Top Header Row: Status Badge on left + 100% Eligible or Status / Date on right */}
        <div className="flex items-center justify-between gap-1.5 mb-2.5">
          <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border whitespace-nowrap flex-shrink-0 shadow-2xs ${statusBadgeBg}`}>
            {statusIcon}
            <span className="whitespace-nowrap">{getStatusLabel(application.status)}</span>
          </div>
          {isHighTier ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100/90 border border-emerald-300 px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0 shadow-2xs">
              ★ {isEligible || score === 100 ? '100% Eligible' : `${score}% Match`}
            </span>
          ) : application.status === 'interview' ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 bg-purple-100/90 border border-purple-200 px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0 shadow-2xs">
              Interview
            </span>
          ) : application.status === 'hired' ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0 shadow-2xs">
              Hired
            </span>
          ) : (
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap flex-shrink-0">
              {formatDate(application.appliedDate)}
            </span>
          )}
        </div>

        {/* Profile Row: Avatar, Candidate Name, Email, Gender/Exp */}
        <div className="flex items-center gap-2.5 mb-2.5">
          <div className="medex-applicant-avatar-wrapper flex-shrink-0">
            <div 
              className={`medex-applicant-avatar ${avatarClass} rounded-full flex items-center justify-center font-bold text-sm shadow-sm`}
              style={{ width: '40px', height: '40px', minWidth: '40px', minHeight: '40px' }}
            >
              {application.candidateName?.charAt(0)?.toUpperCase() || 'A'}
            </div>
          </div>
          <div className="min-w-0 flex-1 overflow-hidden">
            <h3 
              className="font-bold text-slate-900 dark:text-slate-100 text-[14px] truncate leading-tight"
              title={application.candidateName || 'Unknown Candidate'}
            >
              {application.candidateName || 'Unknown Candidate'}
            </h3>
            <p 
              className="text-[11px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1 mt-0.5 min-w-0"
              title={application.candidateEmail}
            >
              <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <span className="truncate">{application.candidateEmail}</span>
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5 whitespace-nowrap">
              <span>♂ {application.candidateGender || 'M'}</span>
              <span>•</span>
              <span>{application.candidateYearsExperience != null ? `${application.candidateYearsExperience} Yrs Exp` : 'Fresher'}</span>
            </p>
          </div>
        </div>

        {/* Qualification & Applied Job Strip */}
        <div className="space-y-0.5 mb-2.5">
          <div 
            className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 truncate" 
            title={[application.candidateQualification, application.candidateSpeciality].filter(Boolean).join(' - ') || 'Medical Practitioner'}
          >
            <GraduationCap className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
            <span className="truncate">
              {[application.candidateQualification, application.candidateSpeciality].filter(Boolean).join(' - ') || 'Medical Practitioner'}
            </span>
          </div>

          <div 
            className="flex items-center gap-1.5 text-[11.5px] font-semibold text-blue-600 dark:text-blue-400 truncate" 
            title={application.jobTitle}
          >
            <Briefcase className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
            <span className="truncate">{application.jobTitle}</span>
          </div>
        </div>

        {/* Compact Eligibility Match Box */}
        <div className={`p-2.5 rounded-xl mb-2.5 text-xs transition-all border ${
          isHighTier 
            ? 'bg-emerald-50/70 border-emerald-200/90 dark:bg-emerald-950/20 dark:border-emerald-800/50' 
            : isMediumTier
            ? 'bg-amber-50/70 border-amber-200/90 dark:bg-amber-950/20 dark:border-amber-800/50'
            : 'bg-rose-50/70 border-rose-200/90 dark:bg-rose-950/20 dark:border-rose-800/50'
        }`}>
          <div className="flex items-center justify-between gap-1 mb-1.5">
            <span className="text-[11.5px] font-bold flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
              <Star className={`w-3.5 h-3.5 fill-current ${
                isHighTier ? 'text-emerald-600' : isMediumTier ? 'text-amber-500' : 'text-rose-500'
              }`} />
              Eligibility Match
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shadow-2xs ${
              isHighTier 
                ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                : isMediumTier
                ? 'bg-amber-100 text-amber-800 border-amber-300'
                : 'bg-rose-100 text-rose-800 border-rose-300'
            }`}>
              {tierLabel}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-x-2.5 gap-y-1 text-[11px]">
            {visibleCriteria.map((item, idx) => (
              <div 
                key={idx} 
                className="flex items-center gap-1 min-w-0"
                title={item.text}
              >
                <Check className={`w-3.5 h-3.5 flex-shrink-0 ${item.met ? 'text-emerald-600' : 'text-amber-500'}`} />
                <span className="text-slate-700 dark:text-slate-300 text-[11px] truncate font-medium">
                  {item.text}
                </span>
              </div>
            ))}
          </div>

          {hasMoreCriteria && (
            <div className="mt-1.5 pt-1.5 border-t border-slate-200/70 dark:border-gray-700/60 flex items-center justify-between">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleEligibility(application.id);
                }}
                className="text-[10.5px] font-bold text-blue-600 hover:text-blue-800 hover:underline transition-colors cursor-pointer"
              >
                {isExpanded ? 'Show less' : `+${criteriaItems.length - maxInitialCriteria} more details`}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedApplication(application);
                  setIsViewDialogOpen(true);
                }}
                className="text-[10.5px] font-medium text-slate-500 hover:text-slate-800 hover:underline transition-colors cursor-pointer"
              >
                View full
              </button>
            </div>
          )}
        </div>

        {/* Company, Location, Registration, Applied Date */}
        <div className="pt-2 border-t border-slate-200/80 dark:border-gray-700/70 mb-2.5 space-y-1.5 text-[11.5px]">
          <div className="grid grid-cols-2 gap-x-2">
            {/* Hospital */}
            <div className="flex items-center gap-1.5 min-w-0" title={application.jobOrganization || 'Organization'}>
              <Building2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                {application.jobOrganization || 'Organization'}
              </span>
            </div>
            {/* Location */}
            <div className="flex items-center gap-1.5 min-w-0" title={[application.candidateCity, application.candidateState].filter(Boolean).join(', ') || 'Not specified'}>
              <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <span className="text-slate-600 dark:text-slate-400 truncate">
                {[application.candidateCity, application.candidateState].filter(Boolean).join(', ') || 'Not specified'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-2">
            {/* Reg */}
            <div className="flex items-center gap-1.5 min-w-0" title={application.candidateRegistrationNumber ? `Reg: ${application.candidateRegistrationNumber}` : ''}>
              <ShieldCheck className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <span className="text-slate-600 dark:text-slate-400 truncate">
                {application.candidateRegistrationNumber ? `Reg: ${application.candidateRegistrationNumber}` : (application.candidateYearsExperience ? `${application.candidateYearsExperience} Yrs Exp` : 'Reg: Pending')}
              </span>
            </div>
            {/* Applied Date */}
            <div className="flex items-center gap-1.5 min-w-0" title={formatDate(application.appliedDate)}>
              <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <span className="text-slate-600 dark:text-slate-400 truncate">
                {formatDate(application.appliedDate)}
              </span>
            </div>
          </div>
        </div>

        {/* Scheduled Interview Banner */}
        {application.interviewDate && (
          <div 
            className="flex items-center gap-1.5 px-2.5 py-1 mb-2 bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/60 rounded-lg text-[11px] font-medium truncate"
            title={`Interview: ${formatDateTime(application.interviewDate)}`}
          >
            <Clock className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 flex-shrink-0" />
            <span className="truncate">
              Interview: {formatDateTime(application.interviewDate)}
            </span>
          </div>
        )}

        {/* Notes if any */}
        {application.notes && (
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-1.5 truncate" title={application.notes}>
            <span className="font-semibold text-slate-700 dark:text-slate-300">Notes:</span> {application.notes}
          </div>
        )}

        {/* Stage & Progress Bar */}
        <div className="mb-2.5">
          <div className="flex items-center justify-between text-[11.5px] mb-1">
            <span className="font-semibold text-slate-600 dark:text-slate-400">
              Stage: <span className="font-bold text-slate-900 dark:text-slate-100">{getStatusLabel(application.status)}</span>
            </span>
            <span className="font-bold text-slate-600 dark:text-slate-400 text-[11px]">
              {getStatusProgress(application.status)}%
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-300 ${progressColorClass}`} 
              style={{ width: `${getStatusProgress(application.status)}%` }} 
            />
          </div>
        </div>

        {/* Action Buttons (2x2 Grid, Bottom-Anchored) */}
        <div 
          className="medex-applicant-footer grid grid-cols-2 gap-1.5 mt-auto pt-2.5 border-t border-slate-200 dark:border-gray-700/60"
          data-slot="applicant-footer"
        >
          {/* 1. View */}
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              setSelectedApplication(application);
              setIsViewDialogOpen(true);
            }}
            className="medex-app-btn medex-app-btn-view w-full h-8 px-2 text-xs font-bold inline-flex items-center justify-center min-w-0 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg shadow-2xs"
            title="View Details"
          >
            <Eye className="w-3.5 h-3.5 mr-1 flex-shrink-0 text-slate-600" />
            <span className="truncate whitespace-nowrap">View</span>
          </Button>

          {/* 2. Update Status */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedApplication(application);
              setIsStatusDialogOpen(true);
            }}
            className="medex-app-btn medex-app-btn-status w-full h-8 px-2 text-xs font-bold inline-flex items-center justify-center min-w-0 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg shadow-2xs"
            title="Update Status"
          >
            <CheckCircle className="w-3.5 h-3.5 mr-1 flex-shrink-0 text-slate-600" />
            <span className="truncate whitespace-nowrap">Update Status</span>
          </Button>

          {/* 3. Interview / + Meet Link */}
          <Button
            variant="default"
            size="sm"
            onClick={() => {
              setSelectedApplication(application);
              setIsInterviewDialogOpen(true);
            }}
            className={`medex-app-btn medex-app-btn-interview w-full h-8 px-2 text-xs font-bold inline-flex items-center justify-center min-w-0 rounded-lg shadow-2xs text-white ${
              application.interviewDate && !application.interviewLink
                ? 'medex-btn-amber bg-[#f59e0b] hover:bg-[#d97706] border-transparent'
                : 'medex-btn-purple bg-[#7c3aed] hover:bg-[#6d28d9] border-transparent'
            }`}
            title={
              application.interviewDate
                ? (application.interviewLink ? 'Interview' : '+ Add Zoom / Meet Link')
                : 'Schedule Interview'
            }
          >
            {application.interviewDate && !application.interviewLink ? (
              <>
                <Plus className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
                <span className="truncate whitespace-nowrap">+ Meet Link</span>
              </>
            ) : (
              <>
                <Calendar className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
                <span className="truncate whitespace-nowrap">Interview</span>
              </>
            )}
          </Button>

          {/* 4. Resume */}
          {application.resumeUrl ? (
            <Button 
              variant="default" 
              size="sm"
              onClick={() => openFileInViewer(application.resumeUrl!)}
              className="medex-app-btn medex-app-btn-resume w-full h-8 px-2 text-xs font-bold inline-flex items-center justify-center min-w-0 bg-[#10b981] hover:bg-[#059669] text-white border-transparent rounded-lg shadow-2xs"
              title="View Resume"
            >
              <FileText className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
              <span className="truncate whitespace-nowrap">Resume</span>
            </Button>
          ) : (
            <div 
              className="medex-app-btn medex-app-no-resume w-full h-8 px-2 text-xs font-bold inline-flex items-center justify-center min-w-0 bg-[#fffbeb] hover:bg-[#fef3c7] text-[#d97706] border border-[#fde68a] rounded-lg cursor-default shadow-2xs"
              title="No resume uploaded"
            >
              <AlertCircle className="w-3.5 h-3.5 mr-1 flex-shrink-0 text-[#d97706]" />
              <span className="truncate whitespace-nowrap">No Resume</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderStatusGrid = (statuses: string[], emptyLabel: string, EmptyIcon: typeof Briefcase = Briefcase) => {
    const matchingApplications = filteredApplications.filter(application => statuses.includes(application.status));
    if (loading) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4.5 sm:gap-5 medex-applicant-grid">
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4.5 sm:gap-5 medex-applicant-grid">
        {matchingApplications.map(renderApplicationCard)}
      </div>
    );
  };

  return (
    <div className={`admin-applications-page view-${viewMode} min-h-screen bg-gray-50 dark:bg-gray-900`}>
      <div className="admin-applications-page__container container mx-auto 2xl:max-w-[1600px] xl:max-w-[1400px] px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
        {/* Header - Responsive */}
        <div className="admin-applications-page__header mb-4 sm:mb-5">
          <div className="admin-applications-page__topbar">
            <div className="admin-applications-page__brand">
              <span className="admin-applications-page__brand-icon"><Briefcase className="w-5 h-5" /></span>
              <div>
                <strong>Application Management</strong>
                <span>Review and manage all job applications across the platform</span>
              </div>
            </div>
            <div className="admin-applications-page__global-search">
              <Search className="w-4 h-4" />
              <input
                aria-label="Search candidates, job posts, skills, email"
                placeholder="Search candidates, job posts, skills, email..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              />
            </div>
            <div className="admin-applications-page__account">
              <button type="button" className="admin-applications-page__notification" aria-label="Notifications">
                <Bell className="w-5 h-5" />
                <span>3</span>
              </button>
              <span className="admin-applications-page__account-avatar">
                {(user?.name || 'A').charAt(0).toUpperCase()}
              </span>
              <div className="admin-applications-page__account-copy">
                <strong>{user?.name || 'Admin'}</strong>
                <span>Admin</span>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </div>
          </div>
          <div className="admin-applications-page__intro flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onNavigate(userRole === 'employer' ? 'dashboard/employer' : 'dashboard/admin')}
                  className="lg:hidden"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="flex-1 min-w-0">
                  <h1 className="flex items-center gap-2.5 text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-1.5 sm:mb-2">
                    <span className="admin-applications-page__title-icon"><Briefcase className="w-5 h-5 sm:w-6 sm:h-6" /></span>
                    Application Management
                  </h1>
                  <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                    {userRole === 'employer' || user?.role === 'EMPLOYER' 
                      ? 'Review and manage job applications from candidates for your posted jobs'
                      : 'Review and manage all job applications across the platform'}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Mobile Filter Button */}
              <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="lg:hidden">
                    <Filter className="w-4 h-4 mr-2" />
                    Filters
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[300px] sm:w-[400px]">
                  <SheetHeader>
                    <SheetTitle>Filters</SheetTitle>
                    <SheetDescription>
                      Filter applications by status, date, and more
                    </SheetDescription>
                  </SheetHeader>
                  <div className="mt-6">
                    <FilterPanel onClose={() => setIsFilterSheetOpen(false)} />
                  </div>
                </SheetContent>
              </Sheet>
              
              <Button 
                variant="outline" 
                onClick={() => onNavigate(userRole === 'employer' ? 'dashboard/employer' : 'dashboard/admin')}
                className="hidden lg:flex"
              >
                Back to Dashboard
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content Area - Responsive Grid Layout */}
        <div className="admin-applications-page__layout flex flex-col lg:flex-row gap-4 lg:gap-6 items-start">
          {/* Desktop Sidebar Filters */}
          <aside className="admin-applications-page__sidebar hidden lg:block lg:w-64 xl:w-72 flex-shrink-0">
            <div className="sticky top-4">
              <Card className="admin-applications-page__filter-card p-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4"><SlidersHorizontal className="w-4 h-4 text-blue-600" /> Filters</h3>
                <FilterPanel />
              </Card>
            </div>
          </aside>

          {/* Main Content */}
          <main className="admin-applications-page__main flex-1 min-w-0">
            {/* Job Eligibility & Recruitment Overview Banner */}
            <div className="admin-applications-page__overview mb-4 bg-white dark:bg-gray-800 border border-slate-200/90 dark:border-gray-700 rounded-2xl p-4 sm:p-5 shadow-xs">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800 mb-1.5">
                    <User className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>{selectedJob ? 'Target Job Eligibility Criteria' : 'Applications Overview'}</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 truncate">
                    {selectedJob?.title || eligibilitySummary?.jobTitle || 'All Candidates Across Jobs'}
                  </h2>

                  {/* Criteria Chips */}
                  <div className="flex items-center gap-2 flex-wrap mt-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md bg-blue-50/70 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-100 dark:border-blue-900/60">
                      <Clock className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                      Min. Exp: {eligibilitySummary?.jobCriteria?.minExperience ? `${eligibilitySummary.jobCriteria.minExperience}+ Years` : 'Fresher / Any'}
                    </span>
                    {eligibilitySummary?.jobCriteria?.qualifications && eligibilitySummary.jobCriteria.qualifications.length > 0 && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md bg-slate-50 text-slate-700 dark:bg-gray-700 dark:text-slate-300 border border-slate-200 dark:border-gray-600">
                        <GraduationCap className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
                        Req: {eligibilitySummary.jobCriteria.qualifications.join(' / ')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Recruitment Metric Counters & 1-Click Toggle */}
                <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 flex-shrink-0">
                  <div className="bg-white dark:bg-gray-800/90 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-gray-700 text-left min-w-[85px] shadow-2xs flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center flex-shrink-0">
                      <Target className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Total Apps</div>
                      <div className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-tight">
                        {eligibilitySummary?.totalApplications ?? applications.length}
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-800/90 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-gray-700 text-left min-w-[85px] shadow-2xs flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center flex-shrink-0">
                      <Rocket className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Eligible</div>
                      <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 leading-tight">
                        {eligibilitySummary?.eligibleCount ?? applications.filter(a => a.isEligible).length}
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-800/90 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-gray-700 text-left min-w-[85px] shadow-2xs flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center flex-shrink-0">
                      <Package className="w-4 h-4 text-purple-600" />
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Shortlisted</div>
                      <div className="text-lg font-bold text-purple-600 dark:text-purple-400 leading-tight">
                        {eligibilitySummary?.shortlistedCount ?? applications.filter(a => a.status === 'shortlisted').length}
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-800/90 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-gray-700 text-left min-w-[85px] shadow-2xs flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center flex-shrink-0">
                      <Clock className="w-4 h-4 text-amber-600" />
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Pending Review</div>
                      <div className="text-lg font-bold text-amber-600 dark:text-amber-400 leading-tight">
                        {applications.filter(a => ['pending', 'applied'].includes(a.status)).length}
                      </div>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant={filters.eligibleOnly ? "default" : "outline"}
                    onClick={() => setFilters(prev => ({ ...prev, eligibleOnly: !prev.eligibleOnly }))}
                    className={`h-10 px-3.5 text-xs font-bold transition-all rounded-xl ${
                      filters.eligibleOnly 
                        ? 'bg-blue-600 hover:bg-blue-700 text-white border-transparent' 
                        : 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30'
                    }`}
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 mr-1.5" />
                    Show Eligible ({eligibilitySummary?.eligibleCount ?? applications.filter(a => a.isEligible).length})
                  </Button>
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
                <div className="admin-applications-page__view-tools hidden sm:flex">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFilters(prev => ({
                      ...prev,
                      sortBy: prev.sortBy === 'eligibility' ? 'appliedDate' : 'eligibility'
                    }))}
                  >
                    <ArrowUpDown className="w-3.5 h-3.5 mr-1.5" />
                    Sort: {filters.sortBy === 'eligibility' ? 'Eligibility Match' : 'Applied Date'}
                    <ChevronDown className="w-3.5 h-3.5 ml-1" />
                  </Button>
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'outline'}
                    size="icon"
                    aria-label="Grid view"
                    onClick={() => setViewMode('grid')}
                  >
                    <Grid2X2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'outline'}
                    size="icon"
                    aria-label="List view"
                    onClick={() => setViewMode('list')}
                  >
                    <List className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <TabsContent value="all" className="mt-4 sm:mt-6">
                {loading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4.5 sm:gap-5">
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
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4.5 sm:gap-5 medex-applicant-grid">
                    {filteredApplications.map(renderApplicationCard)}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="active" className="mt-4 sm:mt-6">
                {loading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4.5 sm:gap-5">
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
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4.5 sm:gap-5 medex-applicant-grid">
                    {filteredApplications
                      .filter(app => ['pending', 'applied', 'shortlisted'].includes(app.status))
                      .map(renderApplicationCard)}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="interview" className="mt-4 sm:mt-6">
                {loading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4.5 sm:gap-5">
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
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4.5 sm:gap-5 medex-applicant-grid">
                    {filteredApplications
                      .filter(app => app.status === 'interview')
                      .map(renderApplicationCard)}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="completed" className="mt-4 sm:mt-6">
                {loading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4.5 sm:gap-5">
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
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4.5 sm:gap-5 medex-applicant-grid">
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
