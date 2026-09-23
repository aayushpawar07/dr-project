import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Clock, CheckCircle, XCircle, Calendar, FileText, Eye, MessageSquare, 
  Phone, Mail, MapPin, Search, Filter, Users, Briefcase, MoreVertical, 
  Loader2, ArrowLeft, AlertCircle, Video, ExternalLink, Check, Sparkles, 
  ShieldCheck, GraduationCap, Stethoscope, SlidersHorizontal, RefreshCw, Award 
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
        return 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600';
      case 'shortlisted':
        return 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700';
      case 'interview':
        return 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700';
      case 'rejected':
        return 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700';
      case 'hired':
        return 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600';
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
      <div className={`p-3 rounded-lg border transition-all ${
        filters.eligibleOnly 
          ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700' 
          : 'bg-gray-50/80 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex-1 pr-2">
            <div className="text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              100% Eligible Only
            </div>
            <p className="text-[11px] text-gray-600 dark:text-gray-300 mt-0.5 leading-snug">
              Filter candidates meeting all qualifications &amp; experience
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant={filters.eligibleOnly ? "default" : "outline"}
            onClick={() => setFilters(prev => ({ ...prev, eligibleOnly: !prev.eligibleOnly }))}
            className={`h-7 px-2.5 text-xs font-bold flex-shrink-0 ${
              filters.eligibleOnly 
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                : 'border-emerald-400 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300'
            }`}
          >
            {filters.eligibleOnly ? 'Active' : 'Filter'}
          </Button>
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

  const renderApplicationCard = (application: ApplicationResponse) => {
    const isEligible = application.isEligible ?? false;
    const score = application.eligibilityScore ?? 0;
    const hasEvaluation = application.eligibilityScore != null || 
      (application.matchingCriteria && application.matchingCriteria.length > 0) || 
      (application.unmetCriteria && application.unmetCriteria.length > 0);

    // Color-coded eligibility variant
    let eligibilityVariant: 'eligible' | 'partial' | 'not-eligible' | 'default' = 'default';
    if (hasEvaluation) {
      if (isEligible || score === 100) {
        eligibilityVariant = 'eligible';
      } else if (score >= 50) {
        eligibilityVariant = 'partial';
      } else {
        eligibilityVariant = 'not-eligible';
      }
    }

    const borderClass = eligibilityVariant === 'eligible'
      ? 'medex-eligible border-l-4 border-l-emerald-500 hover:border-l-emerald-600 shadow-emerald-500/5'
      : eligibilityVariant === 'partial'
      ? 'medex-partial border-l-4 border-l-amber-500 hover:border-l-amber-600 shadow-amber-500/5'
      : eligibilityVariant === 'not-eligible'
      ? 'medex-not-eligible border-l-4 border-l-rose-400 hover:border-l-rose-500 shadow-rose-500/5'
      : 'medex-default border-l-4 border-l-blue-500 dark:border-l-blue-600 hover:border-l-blue-600 dark:hover:border-l-blue-500';

    return (
      <Card 
        key={application.id} 
        className={`group relative overflow-hidden bg-white dark:bg-gray-800 ${borderClass} hover:shadow-md transition-all duration-200 ease-out hover:-translate-y-0.5 flex flex-col medex-applicant-card h-full`}
        style={{
          borderRadius: '0.75rem',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.08), 0 1px 2px 0 rgba(0, 0, 0, 0.04)'
        }}
      >
        <div className="flex flex-col flex-1 medex-applicant-card-content h-full p-3 sm:p-3.5">
          {/* Top Row: Candidate Avatar, Name, Email, Status */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div 
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-xs text-white font-bold text-sm"
              >
                {application.candidateName?.charAt(0)?.toUpperCase() || 'A'}
              </div>
              <div className="min-w-0 flex-1">
                <h3 
                  className="font-bold text-gray-900 dark:text-gray-100 text-sm sm:text-[15px] truncate leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"
                  title={application.candidateName || 'Unknown Candidate'}
                >
                  {application.candidateName || 'Unknown Candidate'}
                </h3>
                <p 
                  className="text-xs text-gray-500 dark:text-gray-400 truncate flex items-center gap-1 mt-0.5"
                  title={application.candidateEmail}
                >
                  <Mail className="w-3 h-3 text-gray-400 flex-shrink-0" />
                  <span className="truncate">{application.candidateEmail}</span>
                </p>
                {(application.candidateQualification || application.candidateSpeciality) && (
                  <p 
                    className="text-[11px] font-semibold text-teal-700 dark:text-teal-400 truncate mt-0.5"
                    title={[application.candidateQualification, application.candidateSpeciality].filter(Boolean).join(' • ')}
                  >
                    {[application.candidateQualification, application.candidateSpeciality].filter(Boolean).join(' • ')}
                  </p>
                )}
              </div>
            </div>
            
            {/* Status Badge */}
            <Badge 
              className={`${getStatusColor(application.status)} flex-shrink-0 text-[11px] font-semibold px-2 py-0.5 leading-tight shadow-2xs`}
              variant="outline"
            >
              {getStatusLabel(application.status)}
            </Badge>
          </div>

          {/* Job Title Applied For */}
          <div className="flex items-center gap-1.5 text-xs sm:text-[13px] font-semibold text-gray-800 dark:text-gray-200 line-clamp-1 mb-2">
            <Briefcase className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <span className="truncate" title={application.jobTitle}>{application.jobTitle}</span>
          </div>

          {/* Compact Eligibility Match & Breakdown */}
          {hasEvaluation && (
            <div className={`mb-2 p-2 rounded-lg border text-xs ${
              eligibilityVariant === 'eligible'
                ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-800/50'
                : eligibilityVariant === 'partial'
                ? 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-800/50'
                : 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-200/80 dark:border-rose-800/50'
            }`}>
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                  <Sparkles className={`w-3.5 h-3.5 flex-shrink-0 ${
                    eligibilityVariant === 'eligible' ? 'text-emerald-600' : eligibilityVariant === 'partial' ? 'text-amber-600' : 'text-rose-500'
                  }`} />
                  Eligibility Match:
                </span>
                {eligibilityVariant === 'eligible' ? (
                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-700 font-bold inline-flex items-center gap-1 text-[11px] py-0.5 px-1.5 shadow-2xs">
                    <CheckCircle className="w-3 h-3 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                    100% Eligible
                  </Badge>
                ) : eligibilityVariant === 'partial' ? (
                  <Badge className="bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-700 font-bold inline-flex items-center gap-1 text-[11px] py-0.5 px-1.5 shadow-2xs">
                    <Sparkles className="w-3 h-3 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                    {score}% Match
                  </Badge>
                ) : (
                  <Badge className="bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-700 font-bold inline-flex items-center gap-1 text-[11px] py-0.5 px-1.5 shadow-2xs">
                    <XCircle className="w-3 h-3 text-rose-600 dark:text-rose-400 flex-shrink-0" />
                    {score > 0 ? `${score}% Match` : 'Not Eligible'}
                  </Badge>
                )}
              </div>

              {/* Compact Met & Unmet Criteria Badges */}
              {((application.matchingCriteria && application.matchingCriteria.length > 0) || (application.unmetCriteria && application.unmetCriteria.length > 0)) && (
                <div className="flex flex-wrap gap-1 pt-1 border-t border-slate-200/60 dark:border-gray-700/60">
                  {application.matchingCriteria?.map((item, idx) => (
                    <span key={`m-${idx}`} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] sm:text-[11px] font-medium bg-white dark:bg-gray-800 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 shadow-2xs">
                      <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                      <span className="truncate max-w-[170px]" title={item}>{item}</span>
                    </span>
                  ))}
                  {application.unmetCriteria?.map((item, idx) => (
                    <span key={`u-${idx}`} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] sm:text-[11px] font-medium bg-white dark:bg-gray-800 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-700 shadow-2xs">
                      <XCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-rose-500 flex-shrink-0" />
                      <span className="truncate max-w-[170px]" title={item}>{item}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Key Metadata (Organization, Location, Date, Reg) */}
          <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-xs text-gray-600 dark:text-gray-400 mb-2">
            {/* Organization */}
            {application.jobOrganization && (
              <div className="flex items-center gap-1.5 min-w-0" title={application.jobOrganization}>
                <Briefcase className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                <span className="truncate font-medium text-gray-700 dark:text-gray-300">
                  {application.jobOrganization}
                </span>
              </div>
            )}

            {/* Applied Date */}
            <div className="flex items-center gap-1.5 min-w-0" title={`Applied on ${formatDate(application.appliedDate)}`}>
              <Calendar className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 flex-shrink-0" />
              <span className="truncate text-gray-600 dark:text-gray-400">
                {formatDate(application.appliedDate)}
              </span>
            </div>

            {/* Candidate Location */}
            {(application.candidateCity || application.candidateState) && (
              <div className="flex items-center gap-1.5 min-w-0" title={[application.candidateCity, application.candidateState].filter(Boolean).join(', ')}>
                <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                <span className="truncate text-gray-600 dark:text-gray-400">
                  {[application.candidateCity, application.candidateState].filter(Boolean).join(', ')}
                </span>
              </div>
            )}

            {/* Medical Registration or Experience */}
            {application.candidateRegistrationNumber ? (
              <div className="flex items-center gap-1.5 min-w-0" title={`Reg: ${application.candidateRegistrationNumber}${application.candidateRegistrationCouncil ? ` (${application.candidateRegistrationCouncil})` : ''}`}>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                <span className="truncate font-semibold text-emerald-700 dark:text-emerald-300">
                  Reg: {application.candidateRegistrationNumber}
                </span>
              </div>
            ) : application.candidateYearsExperience != null ? (
              <div className="flex items-center gap-1.5 min-w-0" title={`${application.candidateYearsExperience} Years Experience`}>
                <Clock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                <span className="truncate text-gray-600 dark:text-gray-400 font-medium">
                  {application.candidateYearsExperience} yr{application.candidateYearsExperience === 1 ? '' : 's'} exp
                </span>
              </div>
            ) : null}
          </div>

          {/* Scheduled Interview Banner if any */}
          {application.interviewDate && (
            <div className="flex items-center gap-1.5 p-1.5 mb-2 bg-purple-50 dark:bg-purple-900/20 rounded border border-purple-200 dark:border-purple-800/60 text-xs">
              <Calendar className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 flex-shrink-0" />
              <span className="font-semibold text-purple-800 dark:text-purple-200 truncate" title={formatDateTime(application.interviewDate)}>
                Interview: {formatDateTime(application.interviewDate)}
              </span>
            </div>
          )}

          {/* Notes if any */}
          {application.notes && (
            <div className="p-1.5 mb-2 bg-amber-50/70 dark:bg-amber-900/20 rounded border border-amber-200/80 dark:border-amber-800/40 text-xs text-gray-700 dark:text-gray-300 line-clamp-1" title={application.notes}>
              <span className="font-semibold text-amber-800 dark:text-amber-300">Notes:</span> {application.notes}
            </div>
          )}

          {/* Streamlined Compact Progress & Status Flow */}
          <div className="mb-2.5 py-1.5 px-2 bg-slate-50 dark:bg-gray-800/60 rounded-md border border-slate-200/70 dark:border-gray-700/60">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-medium text-gray-600 dark:text-gray-400 text-[11px]">
                Stage: <span className="font-semibold text-gray-900 dark:text-gray-100">{getStatusLabel(application.status)}</span>
              </span>
              <span className="font-semibold text-blue-600 dark:text-blue-400 text-[11px]">
                {getStatusProgress(application.status)}%
              </span>
            </div>
            {/* 4-step segmented bar */}
            <div className="grid grid-cols-4 gap-1">
              {getStatusSteps(application.status).map((step) => (
                <div key={step.key} className="flex flex-col gap-0.5">
                  <div 
                    className={`h-1.5 rounded-full transition-colors ${
                      step.completed 
                        ? 'bg-blue-600 dark:bg-blue-500' 
                        : 'bg-gray-200 dark:bg-gray-700'
                    }`} 
                    title={`${step.label}: ${step.completed ? 'Completed' : 'Pending'}`}
                  />
                  <span className={`text-[10px] truncate text-center leading-tight ${
                    step.completed 
                      ? 'font-semibold text-blue-700 dark:text-blue-300' 
                      : 'text-gray-400 dark:text-gray-500'
                  }`}>
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons - Clean 2x2 Grid (All Viewports) */}
          <div 
            className="medex-applicant-footer grid grid-cols-2 gap-1.5 mt-auto pt-2 border-t border-gray-200 dark:border-gray-700"
            data-slot="applicant-footer"
          >
            {/* 1. View Details */}
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setSelectedApplication(application);
                setIsViewDialogOpen(true);
              }}
              className="medex-app-btn medex-app-btn-view w-full h-8 px-2 py-1 text-xs font-semibold inline-flex items-center justify-center min-w-0"
              title="View Details"
            >
              <Eye className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
              <span className="truncate">View</span>
            </Button>

            {/* 2. Update Status */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedApplication(application);
                setIsStatusDialogOpen(true);
              }}
              className="medex-app-btn medex-app-btn-status w-full h-8 px-2 py-1 text-xs font-semibold inline-flex items-center justify-center min-w-0"
              title="Update Status"
            >
              <CheckCircle className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
              <span className="truncate">Update Status</span>
            </Button>

            {/* 3. View Interview / Interview */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedApplication(application);
                setIsInterviewDialogOpen(true);
              }}
              className={`medex-app-btn medex-app-btn-interview w-full h-8 px-2 py-1 text-xs font-semibold inline-flex items-center justify-center min-w-0 ${
                application.interviewDate && !application.interviewLink
                  ? 'border-amber-400 bg-amber-50 text-amber-900 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-700'
                  : ''
              }`}
              title={
                application.interviewDate
                  ? (application.interviewLink ? 'Interview Details / Reschedule' : '+ Add Zoom / Meet Link')
                  : 'Schedule Interview'
              }
            >
              <Calendar className="w-3.5 h-3.5 mr-1 flex-shrink-0 text-purple-600 dark:text-purple-400" />
              <span className="truncate">
                {application.interviewDate
                  ? (application.interviewLink ? 'Interview' : '+ Meet Link')
                  : 'Interview'}
              </span>
            </Button>

            {/* 4. View Resume */}
            {application.resumeUrl ? (
              <Button 
                variant="default" 
                size="sm"
                onClick={() => openFileInViewer(application.resumeUrl!)}
                className="medex-app-btn medex-app-btn-resume medex-applicant-resume-button w-full h-8 px-2 py-1 text-xs font-semibold inline-flex items-center justify-center min-w-0 bg-green-600 hover:bg-green-700 text-white shadow-sm"
                title="View Resume"
              >
                <FileText className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
                <span className="truncate">View Resume</span>
              </Button>
            ) : (
              <div 
                className="medex-app-btn medex-applicant-no-resume w-full h-8 px-2 py-1 text-xs font-semibold inline-flex items-center justify-center min-w-0 rounded-lg text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50"
                title="No resume uploaded"
              >
                <AlertCircle className="w-3.5 h-3.5 mr-1 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                <span className="truncate">No Resume</span>
              </div>
            )}
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto 2xl:max-w-[1600px] xl:max-w-[1400px] px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
        {/* Header - Responsive */}
        <div className="mb-4 sm:mb-5">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
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
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-1.5 sm:mb-2">
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
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 items-start">
          {/* Desktop Sidebar Filters */}
          <aside className="hidden lg:block lg:w-64 xl:w-72 flex-shrink-0">
            <div className="sticky top-4">
              <Card className="p-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Filters</h3>
                <FilterPanel />
              </Card>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            {/* Job Eligibility & Recruitment Overview Banner */}
            {(selectedJob || eligibilitySummary) && (
              <Card className="mb-4 sm:mb-6 p-4 sm:p-5 border-l-4 border-l-teal-600 bg-gradient-to-r from-teal-50/80 via-emerald-50/40 to-white dark:from-teal-950/40 dark:via-emerald-950/20 dark:to-gray-800 shadow-xs rounded-xl">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-teal-800 dark:text-teal-300 bg-teal-100 dark:bg-teal-900/60 px-2 py-0.5 rounded">
                        {selectedJob ? 'Target Job Eligibility Criteria' : 'Applications Overview'}
                      </span>
                      {selectedJob?.organization && (
                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                          {selectedJob.organization}
                        </span>
                      )}
                    </div>
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 truncate">
                      {selectedJob?.title || eligibilitySummary?.jobTitle || 'All Candidates Across Jobs'}
                    </h2>

                    {/* Criteria Chips */}
                    <div className="flex items-center gap-1.5 flex-wrap mt-2">
                      {eligibilitySummary?.jobCriteria?.qualifications && eligibilitySummary.jobCriteria.qualifications.length > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                          <GraduationCap className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                          Req: {eligibilitySummary.jobCriteria.qualifications.join(' / ')}
                        </span>
                      )}
                      {eligibilitySummary?.jobCriteria?.speciality && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md bg-purple-50 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                          <Stethoscope className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />
                          {eligibilitySummary.jobCriteria.speciality}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        <Clock className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                        Min Exp: {eligibilitySummary?.jobCriteria?.minExperience ? `${eligibilitySummary.jobCriteria.minExperience}+ Years` : 'Fresher / Any'}
                      </span>
                      {eligibilitySummary?.jobCriteria?.registrationRequired && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                          State Reg Required
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Recruitment Metric Counters & 1-Click Toggle */}
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 flex-shrink-0">
                    <div className="bg-white/90 dark:bg-gray-800/90 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-center min-w-[70px]">
                      <div className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">Total Apps</div>
                      <div className="text-base font-bold text-gray-800 dark:text-gray-200">
                        {eligibilitySummary?.totalApplications ?? applications.length}
                      </div>
                    </div>

                    <div className={`px-3 py-1.5 rounded-lg border text-center min-w-[90px] transition-all ${
                      filters.eligibleOnly 
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm' 
                        : 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                    }`}>
                      <div className={`text-[11px] font-bold ${filters.eligibleOnly ? 'text-emerald-100' : 'text-emerald-700 dark:text-emerald-400'}`}>
                        🎯 Eligible
                      </div>
                      <div className="text-base font-extrabold">
                        {eligibilitySummary?.eligibleCount ?? applications.filter(a => a.isEligible).length}
                      </div>
                    </div>

                    <div className="bg-white/90 dark:bg-gray-800/90 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-center min-w-[70px]">
                      <div className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">Shortlisted</div>
                      <div className="text-base font-bold text-blue-600 dark:text-blue-400">
                        {eligibilitySummary?.shortlistedCount ?? applications.filter(a => a.status === 'shortlisted').length}
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant={filters.eligibleOnly ? "default" : "outline"}
                      onClick={() => setFilters(prev => ({ ...prev, eligibleOnly: !prev.eligibleOnly }))}
                      className={`h-9 px-3 text-xs sm:text-sm font-bold shadow-xs transition-all ${
                        filters.eligibleOnly 
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-transparent' 
                          : 'border-emerald-600 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                      }`}
                    >
                      {filters.eligibleOnly ? (
                        <>
                          <Check className="w-3.5 h-3.5 mr-1.5" />
                          Eligible Only Active
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                          Show Eligible ({eligibilitySummary?.eligibleCount ?? applications.filter(a => a.isEligible).length})
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            <Tabs defaultValue="all" className="w-full">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <TabsList className="inline-flex h-9 sm:h-10 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 p-1 text-gray-500 dark:text-gray-400">
                  <TabsTrigger 
                    value="all" 
                    className="text-xs sm:text-sm px-2 sm:px-4 data-[state=active]:bg-white data-[state=active]:text-gray-900 dark:data-[state=active]:bg-gray-700 dark:data-[state=active]:text-gray-100"
                  >
                    All <span className="hidden sm:inline">({filteredApplications.length})</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="active" 
                    className="text-xs sm:text-sm px-2 sm:px-4 data-[state=active]:bg-white data-[state=active]:text-gray-900 dark:data-[state=active]:bg-gray-700 dark:data-[state=active]:text-gray-100"
                  >
                    Active
                  </TabsTrigger>
                  <TabsTrigger 
                    value="interview" 
                    className="text-xs sm:text-sm px-2 sm:px-4 data-[state=active]:bg-white data-[state=active]:text-gray-900 dark:data-[state=active]:bg-gray-700 dark:data-[state=active]:text-gray-100"
                  >
                    Interviews
                  </TabsTrigger>
                  <TabsTrigger 
                    value="completed" 
                    className="text-xs sm:text-sm px-2 sm:px-4 data-[state=active]:bg-white data-[state=active]:text-gray-900 dark:data-[state=active]:bg-gray-700 dark:data-[state=active]:text-gray-100"
                  >
                    Completed
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="all" className="mt-4 sm:mt-6">
                {loading ? (
                  <div 
                    className="grid gap-4 md:gap-5 lg:gap-6"
                    style={{
                      gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))'
                    }}
                  >
                    {[...Array(3)].map((_, i) => (
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
                  <div 
                    className="grid gap-4 md:gap-5 lg:gap-6 medex-applicant-grid"
                    style={{
                      gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))'
                    }}
                  >
                    {filteredApplications.map(renderApplicationCard)}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="active" className="mt-4 sm:mt-6">
                {loading ? (
                  <div 
                    className="grid gap-4 md:gap-5 lg:gap-6"
                    style={{
                      gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))'
                    }}
                  >
                    {[...Array(3)].map((_, i) => (
                      <ApplicationSkeleton key={i} />
                    ))}
                  </div>
                ) : filteredApplications.filter(app => ['pending', 'applied', 'shortlisted'].includes(app.status)).length === 0 ? (
                  <Card className="p-8 sm:p-12 text-center">
                    <Briefcase className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">No active applications found.</p>
                  </Card>
                ) : (
                  <div 
                    className="grid gap-4 md:gap-5 lg:gap-6 medex-applicant-grid"
                    style={{
                      gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))'
                    }}
                  >
                    {filteredApplications
                      .filter(app => ['pending', 'applied', 'shortlisted'].includes(app.status))
                      .map(renderApplicationCard)}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="interview" className="mt-4 sm:mt-6">
                {loading ? (
                  <div 
                    className="grid gap-4 md:gap-5 lg:gap-6"
                    style={{
                      gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))'
                    }}
                  >
                    {[...Array(3)].map((_, i) => (
                      <ApplicationSkeleton key={i} />
                    ))}
                  </div>
                ) : filteredApplications.filter(app => app.status === 'interview').length === 0 ? (
                  <Card className="p-8 sm:p-12 text-center">
                    <Calendar className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">No interview scheduled applications found.</p>
                  </Card>
                ) : (
                  <div 
                    className="grid gap-4 md:gap-5 lg:gap-6 medex-applicant-grid"
                    style={{
                      gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))'
                    }}
                  >
                    {filteredApplications
                      .filter(app => app.status === 'interview')
                      .map(renderApplicationCard)}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="completed" className="mt-4 sm:mt-6">
                {loading ? (
                  <div 
                    className="grid gap-4 md:gap-5 lg:gap-6"
                    style={{
                      gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))'
                    }}
                  >
                    {[...Array(3)].map((_, i) => (
                      <ApplicationSkeleton key={i} />
                    ))}
                  </div>
                ) : filteredApplications.filter(app => ['hired', 'selected', 'rejected'].includes(app.status)).length === 0 ? (
                  <Card className="p-8 sm:p-12 text-center">
                    <CheckCircle className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">No completed applications found.</p>
                  </Card>
                ) : (
                  <div 
                    className="grid gap-4 md:gap-5 lg:gap-6 medex-applicant-grid"
                    style={{
                      gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))'
                    }}
                  >
                    {filteredApplications
                      .filter(app => ['hired', 'selected', 'rejected'].includes(app.status))
                      .map(renderApplicationCard)}
                  </div>
                )}
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
