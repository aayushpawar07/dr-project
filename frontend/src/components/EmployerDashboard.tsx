// AI assisted development
import { 
  Plus, Briefcase, Users, Eye, CheckCircle, XCircle, Calendar, 
  ArrowLeft, Edit, Trash2, AlertTriangle, FileText, Mail, Phone,
  Award, BarChart3, Bell, UserCheck, UserPlus, RefreshCw, 
  TrendingUp, Clock, Star, MessageSquare, ExternalLink
} from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { fetchEmployer } from '../api/employers';
import { EmployerResponse } from '../api/employers';
import { Alert, AlertDescription } from './ui/alert';
import { fetchJobs } from '../api/jobs';
import { fetchApplications, ApplicationResponse } from '../api/applications';
import { getCurrentSubscription, SubscriptionResponse } from '../api/subscriptions';
import { fetchNotifications } from '../api/notifications';
import { openFileInViewer } from '../utils/fileUtils';

interface EmployerDashboardProps {
  onNavigate: (page: string) => void;
}

export function EmployerDashboard({ onNavigate }: EmployerDashboardProps) {
  const { user, token, logout } = useAuth();

  const handleLogout = () => {
    logout();
    onNavigate('logout');
  };
  const [myJobs, setMyJobs] = useState<any[]>([]);
  const [myApplications, setMyApplications] = useState<ApplicationResponse[]>([]);
  const [employer, setEmployer] = useState<EmployerResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentSubscription, setCurrentSubscription] = useState<SubscriptionResponse | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('jobs');

  const totalViews = myJobs.reduce((sum, job) => sum + (job.views || 0), 0);
  const totalApplicationsFromList = myApplications.length;
  const totalApplicationsFromJobs = myJobs.reduce((sum, job) => sum + (job.applications || 0), 0);
  const totalApplications = Math.max(totalApplicationsFromList, totalApplicationsFromJobs);

  useEffect(() => {
    if (myJobs.length > 0 || myApplications.length > 0) {
      console.log('📊 Application Count Debug:', {
        applicationsFromList: totalApplicationsFromList,
        applicationsFromJobs: totalApplicationsFromJobs,
        totalApplications,
        jobsCount: myJobs.length,
        applicationsCount: myApplications.length,
        jobs: myJobs.map(j => ({ id: j.id, title: j.title, applications: j.applications }))
      });
    }
  }, [myJobs, myApplications, totalApplicationsFromList, totalApplicationsFromJobs, totalApplications]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user || !token) return;

      try {
        let employerData;
        try {
          employerData = await fetchEmployer(user.id, token);
        } catch (err: any) {
          if (err.message?.includes('404')) {
            const { createEmployer } = await import('../api/employers');
            employerData = await createEmployer({}, token);
          } else {
            throw err;
          }
        }
        setEmployer(employerData);

        if (employerData.verificationStatus === 'pending') {
          onNavigate('verification');
          return;
        }

        const { fetchJobsByEmployer } = await import('../api/jobs');
        const jobsResponse = await fetchJobsByEmployer(employerData.id, {
          status: 'all',
          page: 0,
          size: 1000
        });
        const employerJobs = jobsResponse.content || [];

        console.log('Fetched employer jobs:', employerJobs.length, 'for employer:', employerData.id);
        setMyJobs(employerJobs);

        if (employerJobs.length > 0) {
          try {
            const jobIds = employerJobs.map((job: any) => job.id);
            console.log('📋 Fetching applications for jobs:', jobIds);
            const allApplications: ApplicationResponse[] = [];

            for (const jobId of jobIds) {
              try {
                console.log(`🔍 Fetching applications for job: ${jobId}`);
                const appsResponse = await fetchApplications({
                  jobId,
                  page: 0,
                  size: 1000
                }, token);
                console.log(`✅ Applications response for job ${jobId}:`, appsResponse);

                if (appsResponse && appsResponse.content && Array.isArray(appsResponse.content)) {
                  console.log(`📝 Found ${appsResponse.content.length} applications for job ${jobId}`);
                  allApplications.push(...appsResponse.content);
                } else if (Array.isArray(appsResponse)) {
                  console.log(`📝 Found ${appsResponse.length} applications (direct array) for job ${jobId}`);
                  allApplications.push(...appsResponse);
                } else {
                  console.warn(`⚠️ No applications found for job ${jobId}, response:`, appsResponse);
                }
              } catch (err) {
                console.error(`❌ Failed to fetch applications for job ${jobId}:`, err);
              }
            }

            console.log(`📊 Total applications fetched: ${allApplications.length}`);
            setMyApplications(allApplications);
          } catch (error) {
            console.error('❌ Failed to fetch applications:', error);
            setMyApplications([]);
          }
        } else {
          console.log('⚠️ No jobs found, setting applications to empty');
          setMyApplications([]);
        }

        try {
          const subscription = await getCurrentSubscription(token);
          setCurrentSubscription(subscription);
        } catch (err) {
          console.warn('Could not fetch subscription:', err);
          setCurrentSubscription(null);
        }

        try {
          const notificationsData = await fetchNotifications({ page: 0, size: 10 }, token);
          setNotifications(notificationsData.content || []);
          console.log('✅ Notifications fetched:', notificationsData.content?.length || 0);
        } catch (error) {
          console.error('Error fetching notifications:', error);
          setNotifications([]);
        }
      } catch (error: any) {
        console.error('Failed to fetch employer data:', error);
        setError(error?.message || 'Failed to load dashboard data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, token, onNavigate]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user && token) {
        const fetchData = async () => {
          try {
            const employerData = await fetchEmployer(user.id, token);
            setEmployer(employerData);

            const { fetchJobsByEmployer } = await import('../api/jobs');
            const jobsResponse = await fetchJobsByEmployer(employerData.id, {
              status: 'all',
              page: 0,
              size: 1000
            });
            const employerJobs = jobsResponse.content || [];
            setMyJobs(employerJobs);

            if (employerJobs.length > 0) {
              const jobIds = employerJobs.map((job: any) => job.id);
              const allApplications: ApplicationResponse[] = [];
              for (const jobId of jobIds) {
                try {
                  const appsResponse = await fetchApplications({
                    jobId,
                    page: 0,
                    size: 1000
                  }, token);
                  if (appsResponse && appsResponse.content && Array.isArray(appsResponse.content)) {
                    allApplications.push(...appsResponse.content);
                  } else if (Array.isArray(appsResponse)) {
                    allApplications.push(...appsResponse);
                  }
                } catch (err) {
                  console.error(`Failed to fetch applications for job ${jobId}:`, err);
                }
              }
              console.log(`🔄 Refreshed applications: ${allApplications.length} total`);
              setMyApplications(allApplications);
            }

            try {
              const notificationsData = await fetchNotifications({ page: 0, size: 10 }, token);
              setNotifications(notificationsData.content || []);
            } catch (error) {
              console.error('Error refreshing notifications:', error);
            }
          } catch (error) {
            console.error('Failed to refresh data:', error);
          }
        };
        fetchData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user, token]);

  const handleEditJob = (jobId: string) => {
    onNavigate('edit-job', jobId);
  };

  const handleCloseJob = (jobId: string) => {
    setMyJobs(prev => prev.map(job =>
      job.id === jobId ? { ...job, status: 'closed' as const } : job
    ));
  };

  const handleViewApplications = (jobId: string) => {
    alert(`Viewing applications for job ${jobId}`);
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-200px)] bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Briefcase className="w-8 h-8 text-blue-600 animate-pulse" />
            </div>
          </div>
          <p className="mt-6 text-gray-700 font-semibold text-lg">Loading your dashboard...</p>
          <p className="text-sm text-gray-400 mt-1">Please wait while we fetch your data</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[calc(100vh-200px)] bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-10 h-10 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Error Loading Dashboard</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button onClick={() => window.location.reload()} className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-300">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (!employer) {
    return (
      <div className="min-h-[calc(100vh-200px)] bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
          <p className="mt-6 text-gray-700 font-semibold">Loading employer data...</p>
        </div>
      </div>
    );
  }

  if (employer?.verificationStatus === 'pending') {
    return (
      <div className="min-h-[calc(100vh-200px)] bg-gradient-to-br from-yellow-50 via-white to-orange-50">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto text-center">
            <div className="w-24 h-24 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-12 h-12 text-yellow-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Verification Required</h1>
            <p className="text-gray-600 mb-8 text-lg">
              Your employer account needs to be verified before you can access the dashboard and post jobs.
              Please complete the verification process.
            </p>
            <Button onClick={() => onNavigate('verification')} className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-300 px-8 py-3 text-lg">
              Complete Verification
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-200px)] bg-gradient-to-br from-slate-50 via-white to-blue-50/40 pb-12">
      <div className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate('home')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100/80 transition-all duration-200 rounded-lg"
            >
              <ArrowLeft className="w-4 h-4" />
              Go Back
            </Button>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Bell className="w-5 h-5 text-gray-600 cursor-pointer hover:text-gray-900 transition-colors" />
                {notifications.filter((n: any) => !n.read).length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold shadow-lg">
                    {notifications.filter((n: any) => !n.read).length}
                  </span>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 hover:border-red-300 transition-all duration-200"
              >
                Logout
              </Button>
            </div>
          </div>
          
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <div className="flex items-center gap-4 mb-1">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
                  <Briefcase className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">{employer?.companyName || 'Employer Dashboard'}</h1>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-gray-500 text-sm">Manage your job postings and applications</span>
                    {employer?.verificationStatus === 'approved' && (
                      <Badge className="bg-green-100 text-green-700 border-green-200 px-2 py-0.5">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Verified
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <Button
              className={currentSubscription && currentSubscription.status === 'active'
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-200 hover:shadow-xl transition-all duration-300 px-6 py-2.5 rounded-xl"
                : "bg-gradient-to-r from-gray-500 to-gray-600 text-white cursor-not-allowed px-6 py-2.5 rounded-xl"}
              disabled={!currentSubscription || currentSubscription.status !== 'active'}
              onClick={() => {
                if (currentSubscription && currentSubscription.status === 'active') {
                  onNavigate('employer-post-job');
                } else {
                  onNavigate('subscription');
                }
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              {currentSubscription && currentSubscription.status === 'active'
                ? 'Post New Job'
                : 'Subscribe to Post Jobs'}
            </Button>
          </div>
        </div>

        {/* Alerts */}
        {employer?.verificationStatus === 'approved' && (
          <Alert className="mb-6 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 shadow-sm rounded-xl">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <AlertDescription className="text-green-800 font-medium">
              ✅ Your account is verified! You can now post jobs and access all employer features.
            </AlertDescription>
          </Alert>
        )}

        {currentSubscription && currentSubscription.status === 'active' ? (
          <Alert className="mb-6 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-sm rounded-xl">
            <CheckCircle className="w-4 h-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <span className="font-semibold">Active Subscription:</span> {currentSubscription.plan.name} —
              <span className="ml-2">
                <strong className="text-blue-900">{currentSubscription.jobPostsUsed}</strong> / <strong className="text-blue-900">{currentSubscription.jobPostsAllowed}</strong> posts used
              </span>
              {currentSubscription.endDate && (
                <span className="ml-2 text-sm text-blue-600">
                  📅 Valid until {new Date(currentSubscription.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              )}
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="mb-6 border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 shadow-sm rounded-xl">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <AlertDescription className="text-amber-800 flex items-center flex-wrap gap-3">
              <span>⚠️ To start posting jobs, you need to subscribe to a plan.</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigate('subscription')}
                className="border-amber-300 text-amber-700 hover:bg-amber-100 hover:border-amber-400 transition-all duration-200 rounded-lg"
              >
                View Plans
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
          <Card className="p-5 bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200 hover:shadow-xl transition-all duration-300 group rounded-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-blue-600 mb-1">Active Jobs</p>
                <p className="text-3xl font-bold text-gray-900">{myJobs.filter(j => j.status === 'active').length}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 group-hover:shadow-lg transition-all duration-300">
                <Briefcase className="w-6 h-6 text-white" />
              </div>
            </div>
          </Card>

          <Card className="p-5 bg-gradient-to-br from-green-50 to-green-100/50 border-green-200 hover:shadow-xl transition-all duration-300 group rounded-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-green-600 mb-1">Total Applications</p>
                <p className="text-3xl font-bold text-gray-900">{totalApplications}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 group-hover:shadow-lg transition-all duration-300">
                <Users className="w-6 h-6 text-white" />
              </div>
            </div>
          </Card>

          <Card className="p-5 bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200 hover:shadow-xl transition-all duration-300 group rounded-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-purple-600 mb-1">Total Views</p>
                <p className="text-3xl font-bold text-gray-900">{totalViews}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 group-hover:shadow-lg transition-all duration-300">
                <Eye className="w-6 h-6 text-white" />
              </div>
            </div>
          </Card>

          <Card className="p-5 bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200 hover:shadow-xl transition-all duration-300 group rounded-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-emerald-600 mb-1">Status</p>
                <p className="text-sm font-bold text-emerald-700 flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" />
                  Verified
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 group-hover:shadow-lg transition-all duration-300">
                <Award className="w-6 h-6 text-white" />
              </div>
            </div>
          </Card>
        </div>

        {/* Quick Action Cards */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <Card 
            className="p-5 bg-gradient-to-r from-purple-50 to-purple-100/50 border-2 border-purple-200 hover:border-purple-400 cursor-pointer transition-all duration-300 hover:shadow-xl group rounded-2xl"
            onClick={() => onNavigate('employer-manage-applications')}
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-md group-hover:scale-110 group-hover:shadow-lg transition-all duration-300">
                <UserCheck className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 mb-0.5">Manage Applications</h3>
                <p className="text-gray-600 text-sm">Review and manage candidate applications</p>
              </div>
              <div className="w-8 h-8 bg-purple-200 rounded-full flex items-center justify-center group-hover:bg-purple-300 transition-all duration-300">
                <ExternalLink className="w-4 h-4 text-purple-600" />
              </div>
            </div>
          </Card>

          <Card 
            className="p-5 bg-gradient-to-r from-blue-50 to-blue-100/50 border-2 border-blue-200 hover:border-blue-400 cursor-pointer transition-all duration-300 hover:shadow-xl group rounded-2xl"
            onClick={() => onNavigate('analytics')}
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-md group-hover:scale-110 group-hover:shadow-lg transition-all duration-300">
                <BarChart3 className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 mb-0.5">View Analytics</h3>
                <p className="text-gray-600 text-sm">Track performance and insights</p>
              </div>
              <div className="w-8 h-8 bg-blue-200 rounded-full flex items-center justify-center group-hover:bg-blue-300 transition-all duration-300">
                <ExternalLink className="w-4 h-4 text-blue-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-1.5 mb-6 overflow-x-auto">
            <TabsList className="inline-flex w-full md:w-auto gap-1">
              <TabsTrigger value="jobs" className="flex items-center gap-2 data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700 data-[state=active]:shadow-sm rounded-lg px-4 py-2 transition-all duration-200">
                <Briefcase className="w-4 h-4" />
                My Jobs
                <Badge variant="secondary" className="ml-1 bg-gray-100 text-gray-600">{myJobs.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="applications" className="flex items-center gap-2 data-[state=active]:bg-green-100 data-[state=active]:text-green-700 data-[state=active]:shadow-sm rounded-lg px-4 py-2 transition-all duration-200">
                <Users className="w-4 h-4" />
                Applications
                <Badge variant="secondary" className="ml-1 bg-gray-100 text-gray-600">{myApplications.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="subscription" className="flex items-center gap-2 data-[state=active]:bg-purple-100 data-[state=active]:text-purple-700 data-[state=active]:shadow-sm rounded-lg px-4 py-2 transition-all duration-200">
                <Award className="w-4 h-4" />
                Subscription
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center gap-2 data-[state=active]:bg-amber-100 data-[state=active]:text-amber-700 data-[state=active]:shadow-sm rounded-lg px-4 py-2 transition-all duration-200">
                <Bell className="w-4 h-4" />
                Notifications
                {notifications.filter((n: any) => !n.read).length > 0 && (
                  <Badge className="bg-red-500 text-white ml-1">
                    {notifications.filter((n: any) => !n.read).length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="verification" className="flex items-center gap-2 data-[state=active]:bg-emerald-100 data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm rounded-lg px-4 py-2 transition-all duration-200">
                <CheckCircle className="w-4 h-4" />
                Verification
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Jobs Tab */}
          <TabsContent value="jobs" className="mt-0">
            <Card className="border-0 shadow-lg rounded-2xl overflow-hidden">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Your Job Postings</h3>
                    <p className="text-sm text-gray-500 mt-1">Manage all your job listings in one place</p>
                  </div>
                  {currentSubscription && currentSubscription.status === 'active' && (
                    <Button 
                      onClick={() => onNavigate('employer-post-job')}
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all duration-300 rounded-xl"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      New Job
                    </Button>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-gradient-to-r from-gray-50 to-gray-100/50">
                      <TableRow>
                        <TableHead className="font-semibold text-gray-700">Job Title</TableHead>
                        <TableHead className="font-semibold text-gray-700">Category</TableHead>
                        <TableHead className="font-semibold text-gray-700 text-center">Applications</TableHead>
                        <TableHead className="font-semibold text-gray-700 text-center">Views</TableHead>
                        <TableHead className="font-semibold text-gray-700">Posted Date</TableHead>
                        <TableHead className="font-semibold text-gray-700">Status</TableHead>
                        <TableHead className="font-semibold text-gray-700 text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {myJobs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-16">
                            <div className="flex flex-col items-center">
                              <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                                <Briefcase className="w-10 h-10 text-gray-300" />
                              </div>
                              <p className="text-gray-500 font-semibold text-lg">No jobs posted yet</p>
                              <p className="text-sm text-gray-400 mt-1">Post your first job to start receiving applications</p>
                              {currentSubscription && currentSubscription.status === 'active' && (
                                <Button 
                                  onClick={() => onNavigate('employer-post-job')}
                                  variant="outline" 
                                  className="mt-4 border-blue-300 text-blue-600 hover:bg-blue-50 hover:border-blue-400 rounded-xl transition-all duration-200"
                                >
                                  <Plus className="w-4 h-4 mr-2" />
                                  Post Your First Job
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        myJobs.map((job) => (
                          <TableRow key={job.id} className="hover:bg-gray-50/70 transition-colors">
                            <TableCell>
                              <div>
                                <p className="font-semibold text-gray-900">{job.title}</p>
                                <p className="text-sm text-gray-500">{job.location}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="bg-gray-50 border-gray-200">
                                {job.category || 'N/A'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="font-semibold text-blue-600">{job.applications || 0}</span>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="font-semibold text-purple-600">{job.views || 0}</span>
                            </TableCell>
                            <TableCell className="text-sm text-gray-600">
                              {job.postedDate ? new Date(job.postedDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
                            </TableCell>
                            <TableCell>
                              <Badge className={
                                job.status === 'active' ? 'bg-green-100 text-green-700 border-green-200' :
                                job.status === 'pending' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                                'bg-gray-100 text-gray-700 border-gray-200'
                              } variant="outline">
                                {job.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-center gap-1">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-9 w-9 p-0 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                                  onClick={() => handleViewApplications(job.id)}
                                  title="View Applications"
                                >
                                  <Users className="w-4 h-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-9 w-9 p-0 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all duration-200"
                                  onClick={() => handleEditJob(job.id)}
                                  title="Edit Job"
                                >
                                  <Edit className="w-4 h-4 text-amber-600" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-9 w-9 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                                  onClick={() => handleCloseJob(job.id)}
                                  title="Close Job"
                                  disabled
                                >
                                  <XCircle className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Applications Tab */}
          <TabsContent value="applications" className="mt-0">
            <Card className="border-0 shadow-lg rounded-2xl overflow-hidden">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Job Applications</h3>
                    <p className="text-sm text-gray-500 mt-1">Review and manage applications for your posted jobs</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      if (!user || !token || !employer) return;
                      try {
                        console.log('🔄 Manually refreshing applications...');
                        const { fetchJobsByEmployer } = await import('../api/jobs');
                        const jobsResponse = await fetchJobsByEmployer(employer.id, {
                          status: 'all',
                          page: 0,
                          size: 1000
                        });
                        const employerJobs = jobsResponse.content || [];

                        if (employerJobs.length > 0) {
                          const jobIds = employerJobs.map((job: any) => job.id);
                          const allApplications: ApplicationResponse[] = [];

                          for (const jobId of jobIds) {
                            try {
                              const appsResponse = await fetchApplications({
                                jobId,
                                page: 0,
                                size: 1000
                              }, token);

                              if (appsResponse && appsResponse.content && Array.isArray(appsResponse.content)) {
                                allApplications.push(...appsResponse.content);
                              } else if (Array.isArray(appsResponse)) {
                                allApplications.push(...appsResponse);
                              }
                            } catch (err) {
                              console.error(`Failed to fetch applications for job ${jobId}:`, err);
                            }
                          }

                          console.log(`✅ Refreshed: ${allApplications.length} applications`);
                          setMyApplications(allApplications);
                          alert(`Applications refreshed! Found ${allApplications.length} applications.`);
                        } else {
                          setMyApplications([]);
                        }
                      } catch (error) {
                        console.error('Failed to refresh applications:', error);
                        alert('Failed to refresh applications. Please check console for details.');
                      }
                    }}
                    className="border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300 rounded-xl transition-all duration-200"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                  </Button>
                </div>
                
                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-blue-600 font-semibold mb-1">Total Applications</p>
                        <p className="text-2xl font-bold text-blue-900">{myApplications.length}</p>
                      </div>
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-sm">
                        <Users className="w-5 h-5 text-white" />
                      </div>
                    </div>
                  </Card>
                  <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100/50 border-green-200 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-green-600 font-semibold mb-1">New</p>
                        <p className="text-2xl font-bold text-green-900">
                          {myApplications.filter((app: ApplicationResponse) => app.status === 'applied').length}
                        </p>
                      </div>
                      <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-sm">
                        <UserPlus className="w-5 h-5 text-white" />
                      </div>
                    </div>
                  </Card>
                  <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-purple-600 font-semibold mb-1">Shortlisted</p>
                        <p className="text-2xl font-bold text-purple-900">
                          {myApplications.filter((app: ApplicationResponse) => app.status === 'shortlisted').length}
                        </p>
                      </div>
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-sm">
                        <Star className="w-5 h-5 text-white" />
                      </div>
                    </div>
                  </Card>
                  <Card className="p-4 bg-gradient-to-br from-orange-50 to-orange-100/50 border-orange-200 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-orange-600 font-semibold mb-1">Interviews</p>
                        <p className="text-2xl font-bold text-orange-900">
                          {myApplications.filter((app: ApplicationResponse) => app.status === 'interview').length}
                        </p>
                      </div>
                      <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-sm">
                        <Calendar className="w-5 h-5 text-white" />
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Applications Grouped by Job */}
                {loading ? (
                  <div className="text-center text-gray-500 py-8">Loading applications...</div>
                ) : myApplications.length === 0 ? (
                  <div className="text-center py-16 bg-gray-50/50 rounded-2xl">
                    <div className="flex flex-col items-center">
                      <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                        <Users className="w-10 h-10 text-gray-300" />
                      </div>
                      <p className="text-xl font-semibold text-gray-600 mb-2">No applications found</p>
                      {myJobs.length > 0 && (
                        <p className="text-sm text-gray-400">
                          You have {myJobs.length} job{myJobs.length > 1 ? 's' : ''} posted.
                          Applications will appear here when candidates apply.
                        </p>
                      )}
                      {myJobs.length === 0 && (
                        <p className="text-sm text-gray-400">
                          Post a job to start receiving applications.
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {(() => {
                      const applicationsByJob = new Map<string, ApplicationResponse[]>();
                      myApplications.forEach((app: ApplicationResponse) => {
                        const jobId = app.jobId || 'unknown';
                        if (!applicationsByJob.has(jobId)) {
                          applicationsByJob.set(jobId, []);
                        }
                        applicationsByJob.get(jobId)!.push(app);
                      });

                      return Array.from(applicationsByJob.entries()).map(([jobId, apps]) => {
                        const job = myJobs.find((j: any) => j.id === jobId);
                        const jobTitle = job?.title || apps[0]?.jobTitle || 'Unknown Job';
                        const newApps = apps.filter((app: ApplicationResponse) => app.status === 'applied').length;
                        
                        return (
                          <Card key={jobId} className="border-l-4 border-l-blue-500 overflow-hidden rounded-xl">
                            <div className="p-5">
                              <div className="flex items-center justify-between mb-5 pb-3 border-b border-gray-100">
                                <div>
                                  <h4 className="text-lg font-bold text-gray-900">{jobTitle}</h4>
                                  <div className="flex items-center gap-3 mt-1">
                                    <span className="text-sm text-gray-600">
                                      {apps.length} application{apps.length !== 1 ? 's' : ''}
                                    </span>
                                    {newApps > 0 && (
                                      <Badge className="bg-blue-500 text-white animate-pulse">
                                        {newApps} new
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                  {job?.status || 'N/A'}
                                </Badge>
                              </div>
                              
                              <div className="space-y-4">
                                {apps.map((application: ApplicationResponse) => (
                                  <div key={application.id} className="border-2 border-blue-100 rounded-xl p-5 bg-white hover:border-blue-300 hover:shadow-md transition-all duration-300">
                                    <div className="flex flex-col md:flex-row md:items-start gap-4">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-100">
                                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md flex-shrink-0">
                                            {application.candidateName?.charAt(0)?.toUpperCase() || 'A'}
                                          </div>
                                          <div className="flex-1">
                                            <h5 className="font-bold text-lg text-gray-900">{application.candidateName || 'Unknown Candidate'}</h5>
                                            <p className="text-sm text-gray-500">Candidate</p>
                                          </div>
                                          <Badge className={
                                            application.status === 'shortlisted' ? 'bg-green-100 text-green-700 border-green-200' :
                                            application.status === 'interview' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                                            application.status === 'rejected' ? 'bg-red-100 text-red-700 border-red-200' :
                                            application.status === 'selected' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                            'bg-gray-100 text-gray-700 border-gray-200'
                                          } variant="outline">
                                            {application.status}
                                          </Badge>
                                          {application.status === 'applied' && (
                                            <Badge className="bg-blue-500 text-white animate-pulse">
                                              New
                                            </Badge>
                                          )}
                                        </div>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                                          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                                            <Mail className="w-4 h-4 text-blue-500 flex-shrink-0" />
                                            <div className="min-w-0">
                                              <p className="text-xs text-gray-500">Email</p>
                                              <a 
                                                href={`mailto:${application.candidateEmail}`} 
                                                className="text-blue-600 hover:underline font-medium text-sm truncate block"
                                              >
                                                {application.candidateEmail}
                                              </a>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                                            <Phone className="w-4 h-4 text-green-500 flex-shrink-0" />
                                            <div className="min-w-0">
                                              <p className="text-xs text-gray-500">Phone</p>
                                              <a 
                                                href={`tel:${application.candidatePhone}`} 
                                                className="text-green-600 hover:underline font-medium text-sm truncate block"
                                              >
                                                {application.candidatePhone || 'N/A'}
                                              </a>
                                            </div>
                                          </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                                          <div>
                                            <span className="font-medium">Applied:</span> {application.appliedDate ? new Date(application.appliedDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
                                          </div>
                                        </div>
                                        
                                        {application.notes && (
                                          <div className="mt-2 text-sm text-gray-700 bg-yellow-50 p-3 rounded-xl border border-yellow-200">
                                            <span className="font-medium text-yellow-800">Application Notes:</span>
                                            <p className="mt-1 text-gray-700">{application.notes}</p>
                                          </div>
                                        )}
                                        
                                        <div className="mt-4">
                                          {application.resumeUrl ? (
                                            <Button 
                                              variant="default" 
                                              size="sm"
                                              onClick={() => openFileInViewer(application.resumeUrl!)}
                                              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-md hover:shadow-lg transition-all duration-300 rounded-xl"
                                            >
                                              <FileText className="w-4 h-4 mr-2" />
                                              View Resume
                                            </Button>
                                          ) : (
                                            <div className="text-sm text-orange-700 bg-orange-100 border border-orange-300 p-2 rounded-xl font-medium inline-block">
                                              ⚠️ No resume uploaded
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </Card>
                        );
                      });
                    })()}
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>

          {/* Subscription Tab */}
          <TabsContent value="subscription" className="mt-0">
            <Card className="border-0 shadow-lg rounded-2xl overflow-hidden">
              <div className="p-12 text-center">
                <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-purple-200">
                  <Award className="w-12 h-12 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">Choose Your Subscription Plan</h3>
                <p className="text-gray-600 max-w-md mx-auto mb-8">
                  Select a subscription plan to start posting jobs and access all employer features.
                </p>
                <Button onClick={() => onNavigate('subscription')} className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-lg shadow-purple-200 hover:shadow-xl transition-all duration-300 px-8 py-3 text-lg rounded-xl">
                  View Subscription Plans
                </Button>
              </div>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="mt-0">
            <Card className="border-0 shadow-lg rounded-2xl overflow-hidden">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Recent Notifications</h3>
                    <p className="text-sm text-gray-500 mt-1">Stay updated with the latest activities</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onNavigate('notifications')}
                    className="border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300 rounded-xl transition-all duration-200"
                  >
                    View All
                  </Button>
                </div>
                <div className="space-y-3">
                  {notifications.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Bell className="w-8 h-8 text-gray-300" />
                      </div>
                      <p className="text-gray-500">No notifications yet</p>
                    </div>
                  ) : (
                    notifications.slice(0, 5).map((notification) => (
                      <div key={notification.id} className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 hover:shadow-sm transition-all duration-200">
                        <p className="text-sm text-gray-900 mb-1">{notification.message}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(notification.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Verification Tab */}
          <TabsContent value="verification" className="mt-0">
            <Card className="border-0 shadow-lg rounded-2xl overflow-hidden">
              <div className="p-12 text-center">
                <div className="w-24 h-24 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-200">
                  <CheckCircle className="w-12 h-12 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">Employer Verification</h3>
                <p className="text-gray-600 max-w-md mx-auto mb-8">
                  Complete your verification to access all features and build trust with candidates.
                </p>
                <Button onClick={() => onNavigate('verification')} className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white shadow-lg shadow-emerald-200 hover:shadow-xl transition-all duration-300 px-8 py-3 text-lg rounded-xl">
                  Go to Verification
                </Button>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}