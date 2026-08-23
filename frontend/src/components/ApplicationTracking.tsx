// AI assisted development
import { useState, useEffect } from 'react';
import { Clock, CheckCircle, XCircle, Calendar, FileText, Eye, MessageSquare, Phone, Mail, MapPin, Loader2, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { useAuth } from '../contexts/AuthContext';
import { fetchApplications, updateApplicationStatus, ApplicationResponse } from '../api/applications';
import { fetchJob } from '../api/jobs';
import { ApplicationStatus } from '../types';

interface ApplicationTrackingProps {
  userRole: 'candidate' | 'employer';
  userId: string;
}

interface ApplicationWithJob extends ApplicationResponse {
  job?: {
    id: string;
    title: string;
    organization: string;
    location?: string;
  };
}

export function ApplicationTracking({ userRole, userId }: ApplicationTrackingProps) {
  const { token, user } = useAuth();
  const [applications, setApplications] = useState<ApplicationWithJob[]>([]);
  const [selectedApplication, setSelectedApplication] = useState<ApplicationWithJob | null>(null);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [isInterviewDialogOpen, setIsInterviewDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('all');

  // Fetch applications from API
  useEffect(() => {
    const loadApplications = async () => {
      if (!token) {
        setError('Authentication required. Please login again.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        // Determine query parameters based on user role
        const params: any = {
          page: 0,
          size: 100,
          sort: 'appliedDate,desc'
        };

        if (userRole === 'candidate') {
          // For candidates, fetch their own applications
          params.candidateId = userId || user?.id;
        } else if (userRole === 'employer') {
          // For employers, we might need to filter by jobId or fetch all
          // For now, we'll fetch all and filter on frontend if needed
        }

        const response = await fetchApplications(params, token);
        
        if (response && response.content) {
          // Fetch job details for each application
          const applicationsWithJobs = await Promise.all(
            response.content.map(async (app: ApplicationResponse) => {
              try {
                const job = await fetchJob(app.jobId);
                return {
                  ...app,
                  job: job ? {
                    id: job.id,
                    title: app.jobTitle || job.title,
                    organization: app.jobOrganization || job.organization,
                    location: job.location
                  } : {
                    id: app.jobId,
                    title: app.jobTitle,
                    organization: app.jobOrganization,
                    location: undefined
                  }
                };
              } catch (err) {
                // If job fetch fails, use data from application response
                return {
                  ...app,
                  job: {
                    id: app.jobId,
                    title: app.jobTitle,
                    organization: app.jobOrganization,
                    location: undefined
                  }
                };
              }
            })
          );
          
          setApplications(applicationsWithJobs);
        } else {
          setApplications([]);
        }
      } catch (err: any) {
        console.error('Error fetching applications:', err);
        setError(err.message || 'Failed to load applications. Please try again.');
        setApplications([]);
      } finally {
        setLoading(false);
      }
    };

    loadApplications();
  }, [token, userId, userRole, user?.id]);

  const handleUpdateStatus = async (applicationId: string, newStatus: ApplicationStatus, notes?: string) => {
    if (!token) {
      setError('Authentication required. Please login again.');
      return;
    }

    try {
      await updateApplicationStatus(applicationId, newStatus, token, notes);
      
      // Update local state
      setApplications(prev => 
        prev.map(app => 
          app.id === applicationId 
            ? { ...app, status: newStatus, notes: notes || app.notes }
            : app
        )
      );
    } catch (err: any) {
      console.error('Error updating application status:', err);
      setError(err.message || 'Failed to update application status. Please try again.');
      throw err;
    }
  };

  const handleScheduleInterview = async (applicationId: string, interviewDate: string, notes?: string) => {
    if (!token) {
      setError('Authentication required. Please login again.');
      return;
    }

    try {
      // Format interview date for API (ISO string)
      const interviewDateTime = new Date(interviewDate).toISOString();
      
      await updateApplicationStatus(applicationId, 'interview', token, notes, interviewDateTime);
      
      // Update local state
      setApplications(prev => 
        prev.map(app => 
          app.id === applicationId 
            ? { ...app, status: 'interview', interviewDate: interviewDateTime, notes: notes || app.notes }
            : app
        )
      );
    } catch (err: any) {
      console.error('Error scheduling interview:', err);
      setError(err.message || 'Failed to schedule interview. Please try again.');
      throw err;
    }
  };

  // Filter applications based on active tab
  const getFilteredApplications = () => {
    switch (activeTab) {
      case 'active':
        return applications.filter(app => ['applied', 'shortlisted'].includes(app.status));
      case 'interview':
        return applications.filter(app => app.status === 'interview');
      case 'completed':
        return applications.filter(app => ['selected', 'rejected'].includes(app.status));
      default:
        return applications;
    }
  };

  const filteredApplications = getFilteredApplications();

  // Render application card
  const renderApplicationCard = (application: ApplicationWithJob) => (
    <Card key={application.id} className="p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg text-gray-900">{application.job?.title || application.jobTitle}</h3>
            <Badge className={getStatusColor(application.status as ApplicationStatus)} variant="outline">
              {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
            </Badge>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-600 mb-4">
            <div className="flex items-center gap-2">
              <span className="font-medium">Organization:</span>
              <span>{application.job?.organization || application.jobOrganization}</span>
            </div>
            {application.job?.location && (
              <div className="flex items-center gap-2">
                <span className="font-medium">Location:</span>
                <span>{application.job.location}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="font-medium">Applied:</span>
              <span>{formatDate(application.appliedDate)}</span>
            </div>
            {application.interviewDate && (
              <div className="flex items-center gap-2">
                <span className="font-medium">Interview:</span>
                <span>{formatDateTime(application.interviewDate)}</span>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Application Progress</span>
              <span className="text-sm text-gray-600">{getStatusProgress(application.status as ApplicationStatus)}%</span>
            </div>
            <Progress value={getStatusProgress(application.status as ApplicationStatus)} className="h-2" />
          </div>

          {/* Status Steps */}
          <div className="flex items-center justify-between mb-4">
            {getStatusSteps(application.status as ApplicationStatus).map((step, index) => (
              <div key={step.key} className="flex items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                  step.completed 
                    ? 'bg-green-500 border-green-500 text-white' 
                    : 'bg-white border-gray-300 text-gray-400'
                }`}>
                  {step.completed ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <span className="text-xs font-medium">{index + 1}</span>
                  )}
                </div>
                <span className={`ml-2 text-xs ${
                  step.completed ? 'text-green-600 font-medium' : 'text-gray-500'
                }`}>
                  {step.label}
                </span>
                {index < getStatusSteps(application.status as ApplicationStatus).length - 1 && (
                  <div className={`w-8 h-0.5 mx-2 ${
                    getStatusSteps(application.status as ApplicationStatus)[index + 1].completed 
                      ? 'bg-green-500' 
                      : 'bg-gray-300'
                  }`} />
                )}
              </div>
            ))}
          </div>

          {application.notes && (
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <p className="text-sm text-gray-700">
                <span className="font-medium">Notes:</span> {application.notes}
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 ml-4">
          <Button variant="outline" size="sm">
            <Eye className="w-4 h-4 mr-1" />
            View Details
          </Button>
          
          {userRole === 'employer' && (
            <>
              <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setSelectedApplication(application)}
                  >
                    Update Status
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Update Application Status</DialogTitle>
                  </DialogHeader>
                  <StatusUpdateForm 
                    application={selectedApplication}
                    onUpdate={async (status, notes) => {
                      if (selectedApplication) {
                        try {
                          await handleUpdateStatus(selectedApplication.id, status, notes);
                          setIsStatusDialogOpen(false);
                        } catch (err) {
                          // Error already handled in handleUpdateStatus
                        }
                      }
                    }}
                    onCancel={() => setIsStatusDialogOpen(false)}
                  />
                </DialogContent>
              </Dialog>

              <Dialog open={isInterviewDialogOpen} onOpenChange={setIsInterviewDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setSelectedApplication(application)}
                  >
                    <Calendar className="w-4 h-4 mr-1" />
                    Schedule Interview
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Schedule Interview</DialogTitle>
                  </DialogHeader>
                  <InterviewSchedulingForm 
                    application={selectedApplication}
                    onSchedule={async (date, notes) => {
                      if (selectedApplication) {
                        try {
                          await handleScheduleInterview(selectedApplication.id, date, notes);
                          setIsInterviewDialogOpen(false);
                        } catch (err) {
                          // Error already handled in handleScheduleInterview
                        }
                      }
                    }}
                    onCancel={() => setIsInterviewDialogOpen(false)}
                  />
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>

      {/* Candidate Info (for employers) */}
      {userRole === 'employer' && (
        <div className="pt-4 border-t">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Candidate Information</h4>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-gray-400" />
              <span>{application.candidateEmail}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-gray-400" />
              <span>{application.candidatePhone}</span>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-400" />
              {application.resumeUrl && (
                <a 
                  href={application.resumeUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  View Resume
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </Card>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl text-gray-900 mb-2">
            {userRole === 'candidate' ? 'My Applications' : 'Application Management'}
          </h1>
          <p className="text-gray-600">
            {userRole === 'candidate' 
              ? 'Track the status of your job applications'
              : 'Manage and review candidate applications'
            }
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setError(null)}
              className="ml-auto"
            >
              Dismiss
            </Button>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <span className="ml-3 text-gray-600">Loading applications...</span>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList>
              <TabsTrigger value="all">All Applications</TabsTrigger>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="interview">Interviews</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-6">
              <div className="space-y-6">
                {filteredApplications.length === 0 ? (
                  <Card className="p-12">
                    <div className="text-center">
                      <p className="text-gray-500 text-lg">
                        {activeTab === 'all' 
                          ? 'No applications found.' 
                          : `No ${activeTab} applications found.`}
                      </p>
                    </div>
                  </Card>
                ) : (
                  filteredApplications.map((application) => renderApplicationCard(application))
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}

// Keep the helper functions outside the component
function getStatusIcon(status: ApplicationStatus) {
  switch (status) {
    case 'applied':
      return <Clock className="w-5 h-5 text-blue-500" />;
    case 'shortlisted':
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    case 'interview':
      return <Calendar className="w-5 h-5 text-purple-500" />;
    case 'rejected':
      return <XCircle className="w-5 h-5 text-red-500" />;
    case 'selected':
      return <CheckCircle className="w-5 h-5 text-green-600" />;
    default:
      return <Clock className="w-5 h-5 text-gray-500" />;
  }
}

function getStatusColor(status: ApplicationStatus) {
  switch (status) {
    case 'applied':
      return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'shortlisted':
      return 'bg-green-100 text-green-700 border-green-200';
    case 'interview':
      return 'bg-purple-100 text-purple-700 border-purple-200';
    case 'rejected':
      return 'bg-red-100 text-red-700 border-red-200';
    case 'selected':
      return 'bg-green-100 text-green-700 border-green-200';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200';
  }
}

function getStatusProgress(status: ApplicationStatus) {
  switch (status) {
    case 'applied':
      return 25;
    case 'shortlisted':
      return 50;
    case 'interview':
      return 75;
    case 'selected':
      return 100;
    case 'rejected':
      return 0;
    default:
      return 0;
  }
}

function getStatusSteps(status: ApplicationStatus) {
  const steps = [
    { key: 'applied', label: 'Applied', completed: true },
    { key: 'shortlisted', label: 'Shortlisted', completed: ['shortlisted', 'interview', 'selected'].includes(status) },
    { key: 'interview', label: 'Interview', completed: ['interview', 'selected'].includes(status) },
    { key: 'selected', label: 'Selected', completed: status === 'selected' }
  ];
  return steps;
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

function formatDateTime(dateString: string) {
  return new Date(dateString).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
interface StatusUpdateFormProps {
  application: ApplicationWithJob | null;
  onUpdate: (status: ApplicationStatus, notes?: string) => void;
  onCancel: () => void;
}

function StatusUpdateForm({ application, onUpdate, onCancel }: StatusUpdateFormProps) {
  const [status, setStatus] = useState<ApplicationStatus>(
    (application?.status as ApplicationStatus) || 'applied'
  );
  const [notes, setNotes] = useState(application?.notes || '');

  // Update form when application changes
  useEffect(() => {
    if (application) {
      setStatus((application.status as ApplicationStatus) || 'applied');
      setNotes(application.notes || '');
    }
  }, [application]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(status, notes);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="status">New Status</Label>
        <select
          id="status"
          value={status}
          onChange={(e) => setStatus(e.target.value as ApplicationStatus)}
          className="w-full mt-1 p-2 border border-gray-300 rounded-md"
        >
          <option value="applied">Applied</option>
          <option value="shortlisted">Shortlisted</option>
          <option value="interview">Interview</option>
          <option value="selected">Selected</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <div>
        <Label htmlFor="notes">Notes (Optional)</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="mt-1"
          rows={3}
          placeholder="Add any notes about this status update..."
        />
      </div>

      <div className="flex gap-3">
        <Button type="submit" className="flex-1">
          Update Status
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

interface InterviewSchedulingFormProps {
  application: ApplicationWithJob | null;
  onSchedule: (date: string, notes?: string) => void;
  onCancel: () => void;
}

function InterviewSchedulingForm({ application, onSchedule, onCancel }: InterviewSchedulingFormProps) {
  const [interviewDate, setInterviewDate] = useState('');
  const [interviewTime, setInterviewTime] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const dateTime = `${interviewDate}T${interviewTime}`;
    onSchedule(dateTime, notes);
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
            className="w-full mt-1 p-2 border border-gray-300 rounded-md"
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
            className="w-full mt-1 p-2 border border-gray-300 rounded-md"
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="notes">Interview Notes (Optional)</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="mt-1"
          rows={3}
          placeholder="Add any notes about the interview..."
        />
      </div>

      <div className="flex gap-3">
        <Button type="submit" className="flex-1">
          Schedule Interview
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}


