import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  Loader2,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Mail,
  Phone,
} from "lucide-react";
import { Button, buttonVariants } from "./ui/button";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { JobPostingForm } from "./JobPostingForm"; // Re-using the existing form
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { JobCategory, JobSector } from "../types"; // Assuming these types are available
import { Label } from "./ui/label";
import {
  fetchAdminJobs,
  deleteAdminJob,
  updateAdminJob,
  updateAdminJobStatus,
  createAdminJob,
  createSampleJob,
  publishAdminJob,
  uploadJobDocument,
  uploadJobImage,
} from "../api/jobs";
import {
  fetchApplications,
  updateApplicationStatus,
} from "../api/applications";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";

// Define a Job type that matches the backend response (simplified for frontend)
interface Job {
  id: string;
  employerId: string; // Added for potential future use, e.g., linking to employer profile
  title: string;
  organization: string;
  sector: JobSector;
  category: JobCategory;
  location: string;
  qualification: string;
  experience: string;
  numberOfPosts: number;
  salary: string;
  description: string;
  lastDate: string;
  postedDate: string;
  status: "active" | "closed" | "pending" | "draft";
  featured: boolean;
  views: number;
  applications: number;
  pdfUrl?: string;
  applyLink?: string;
  contactEmail?: string;
  requirements?: string; // Added for editing
  benefits?: string; // Added for editing
  contactPhone?: string;
}

interface AdminJobManagementPageProps {
  onNavigate: (page: string) => void;
}

export function AdminJobManagementPage({
  onNavigate,
}: AdminJobManagementPageProps) {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [searchTerm, setSearchTerm] = useState(""); // State for search input
  const [filterStatus, setFilterStatus] = useState<string>("all"); // 'all', 'active', 'pending', 'draft', 'closed'
  const [filterSector, setFilterSector] = useState<"all" | JobSector>("all");
  const [appLoading, setAppLoading] = useState(false);
  const [interviewDate, setInterviewDate] = useState("");
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);

  const loadJobs = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {
        search: searchTerm || undefined,
        size: 50,
        sort: "createdAt,desc",
      };
      if (filterStatus !== "all") params.status = filterStatus;
      if (filterSector !== "all") params.sector = filterSector;
      // Use admin API to fetch all jobs including drafts/pending
      const data = await fetchAdminJobs(params);
      const allJobs: Job[] = (data?.content || []).map((job: any) => ({
        ...job,
        employerId: job.employerId,
        lastDate: job.lastDate,
        postedDate: job.postedDate || job.createdAt,
        organization: job.organization || job.companyName,
      }));
      setJobs(allJobs);
    } catch (e: any) {
      setError(`Failed to fetch jobs: ${e.message || "Unknown error"}`);
      console.error("Error fetching jobs:", e);
    } finally {
      setLoading(false);
    }
  };

  const loadApplications = async () => {
    setAppLoading(true);
    try {
      if (!token) throw new Error("Authentication token not found.");
      const data = await fetchApplications(
        { size: 50, sort: "appliedDate,desc" },
        token,
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
  }, [filterStatus, filterSector, searchTerm]); // Re-fetch when filters or search term change

  const handleCreateNewJob = () => {
    onNavigate("admin-post-job");
  };

  const handleQuickAddSampleJob = async () => {
    if (!window.confirm("क्या आप एक sample job add करना चाहते हैं?")) return;

    setLoading(true);
    setError(null);
    try {
      if (!token) throw new Error("Authentication token not found.");

      // Use the admin API to create a sample job
      await createSampleJob();
      toast.success("Sample job successfully added! 🎉");
      loadJobs(); // Refresh the list
    } catch (e: any) {
      const errorMsg = e.error || e.message || "Failed to create sample job";
      setError(`Failed to add sample job: ${errorMsg}`);
      console.error("Error adding sample job:", e);
      toast.error(`Error: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEditJob = (job: Job) => {
    // Navigate to edit page with job ID
    navigate(`/admin/jobs/edit/${job.id}`);
  };

  const handleDeleteJob = async (jobId: string) => {
    if (!window.confirm("Are you sure you want to delete this job?")) return;

    try {
      if (!token) throw new Error("Authentication token not found.");
      await deleteAdminJob(jobId);
      setJobs((prev) => prev.filter((job) => job.id !== jobId));
      toast.success("Job deleted successfully!");
    } catch (e: any) {
      const errorMsg = e.error || e.message || "Failed to delete job";
      setError(`Failed to delete job: ${errorMsg}`);
      console.error("Error deleting job:", e);
      toast.error(`Error deleting job: ${errorMsg}`);
    }
  };

  const handleUpdateJobStatus = async (
    jobId: string,
    newStatus: Job["status"],
  ) => {
    if (
      !window.confirm(
        `Are you sure you want to change this job's status to ${newStatus}?`,
      )
    )
      return;

    try {
      if (!token) throw new Error("Authentication token not found.");
      // Use admin API for status updates
      await updateAdminJobStatus(jobId, newStatus);
      toast.success(`Job status updated to ${newStatus} successfully!`);
      loadJobs(); // Refresh the list to show updated status
    } catch (e: any) {
      const errorMsg = e.error || e.message || "Failed to update status";
      setError(`Failed to update job status: ${errorMsg}`);
      console.error("Error updating job status:", e);
      toast.error(`Error updating job status: ${errorMsg}`);
    }
  };

  const handlePublishJob = async (jobId: string) => {
    if (
      !window.confirm(
        "Are you sure you want to publish this job? It will become visible on the job board.",
      )
    )
      return;

    try {
      if (!token) throw new Error("Authentication token not found.");
      await publishAdminJob(jobId);
      toast.success(
        "Job published successfully! It's now visible on the job board.",
      );
      loadJobs(); // Refresh the list
    } catch (e: any) {
      const errorMsg = e.error || e.message || "Failed to publish job";
      setError(`Failed to publish job: ${errorMsg}`);
      console.error("Error publishing job:", e);
      toast.error(`Error publishing job: ${errorMsg}`);
    }
  };

  const handleUpdateAppStatus = async (appId: string, newStatus: string) => {
    if (!window.confirm(`Change status to ${newStatus}?`)) return;
    try {
      if (!token) throw new Error("Authentication token not found.");
      let finalInterviewDate = null;
      if (newStatus === "interview" && selectedAppId === appId) {
        finalInterviewDate = interviewDate;
      }
      await updateApplicationStatus(
        appId,
        newStatus,
        token,
        undefined,
        finalInterviewDate,
      );
      toast.success("Application status updated!");
      loadApplications();
      setSelectedAppId(null); // Reset selection
    } catch (e: any) {
      console.error("Error updating application status:", e);
      alert(`Error: ${e.message}`);
    }
  };

  const handleJobFormSave = async (jobData: any) => {
    setLoading(true);
    setError(null);
    try {
      const payload = {
        ...jobData,
        status: jobData.status || "pending", // keep new jobs hidden until approved
        featured: jobData.featured || false, // Admin can set featured, default to false
        views: jobData.views || 0,
        applications: jobData.applications || 0,
        type: "hospital", // Defaulting for now, ideally selected in form or derived
      };

      let savedJobId: string | null = null;

      if (editingJob) {
        if (!token) throw new Error("Authentication token not found.");
        // Use admin API for updating jobs
        await updateAdminJob(editingJob.id, payload);
        savedJobId = editingJob.id;
      } else {
        if (!token) throw new Error("Authentication token not found.");
        // Use admin API for creating jobs
        const createdJob = await createAdminJob(payload);
        savedJobId = createdJob?.id;
      }

      // Upload PDF document if provided
      if (savedJobId && jobData.pdfFile) {
        try {
          await uploadJobDocument(savedJobId, jobData.pdfFile);
          console.log("Job document uploaded successfully");
        } catch (uploadError: any) {
          console.error("Error uploading job document:", uploadError);
        }
      }

      // Upload image if provided
      if (savedJobId && jobData.imageFile) {
        try {
          await uploadJobImage(savedJobId, jobData.imageFile);
          console.log("Job image uploaded successfully");
        } catch (uploadError: any) {
          console.error("Error uploading job image:", uploadError);
        }
      }

      toast.success(`Job ${editingJob ? "updated" : "created"} successfully!`);
      loadJobs(); // Refresh the list after save
    } catch (e: any) {
      const errorMsg = e.error || e.message || "Failed to save job";
      setError(`Failed to save job: ${errorMsg}`);
      console.error("Error saving job:", e);
      alert(`Error saving job: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: Job["status"]) => {
    switch (status) {
      case "active":
        return (
          <Badge className="bg-green-100 text-green-700 border-green-200">
            Active
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">
            Pending
          </Badge>
        );
      case "draft":
        return (
          <Badge className="bg-blue-100 text-blue-700 border-blue-200">
            Draft
          </Badge>
        );
      case "closed":
        return (
          <Badge className="bg-red-100 text-red-700 border-red-200">
            Closed
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl text-gray-900 mb-2">Admin Management</h1>
            <p className="text-gray-600">
              Manage jobs and applications on MedExJob.com
            </p>
          </div>
          <Button variant="outline" onClick={() => onNavigate("home")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </div>

        <Tabs defaultValue="jobs" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="jobs">Job Management</TabsTrigger>
            <TabsTrigger value="applications" onClick={loadApplications}>
              Applications
            </TabsTrigger>
          </TabsList>

          <TabsContent value="jobs">
            {/* Controls */}
            <div className="flex flex-col md:flex-row gap-4 mb-8">
              <Input
                placeholder="Search by title, organization, location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterSector} onValueChange={(value) => setFilterSector(value as "all" | JobSector)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Job Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Jobs</SelectItem>
                  <SelectItem value="government">Government Jobs</SelectItem>
                  <SelectItem value="private">Private Jobs</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex flex-col gap-2">
                <Button
                  onClick={handleCreateNewJob}
                  className="bg-blue-600 hover:bg-blue-700 w-full justify-center"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Job
                </Button>
                <Button
                  onClick={handleQuickAddSampleJob}
                  variant="outline"
                  className="border-green-600 text-green-600 hover:bg-green-50 w-full justify-center"
                  disabled={loading}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Quick Add Sample Job
                </Button>
              </div>
            </div>

            {/* Job List */}
            {loading && (
              <div className="flex justify-center items-center py-10">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                <span className="ml-3 text-lg text-gray-700">
                  Loading jobs...
                </span>
              </div>
            )}

            {error && (
              <div
                className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4"
                role="alert"
              >
                <strong className="font-bold">Error!</strong>
                <span className="block sm:inline"> {error}</span>
              </div>
            )}

            {!loading && jobs.length === 0 && !error && (
              <Card className="p-12 text-center">
                <Eye className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg text-gray-900 mb-2">No jobs found</h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm || filterStatus !== "all" || filterSector !== "all"
                    ? "Try adjusting your search or filters."
                    : "Start by creating a new job posting."}
                </p>
                <Button onClick={handleCreateNewJob}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Job
                </Button>
              </Card>
            )}

            <div className="space-y-6">
              {jobs.map((job) => (
                <Card
                  key={job.id}
                  className="p-6 flex items-start justify-between hover:shadow-md transition-shadow duration-200"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-xl font-semibold text-gray-900">
                        {job.title}
                      </h3>
                      {getStatusBadge(job.status)}
                      {job.featured && (
                        <Badge className="bg-purple-100 text-purple-700 border-purple-200">
                          Featured
                        </Badge>
                      )}
                    </div>
                    <p className="text-gray-700 mb-1">
                      {job.organization} - {job.location}
                    </p>
                    <div className="flex flex-wrap gap-2 text-sm text-gray-600 mt-2">
                      <Badge variant="outline">{job.category}</Badge>
                      <span
                        className={`${
                          job.sector === "government"
                            ? "!bg-gradient-to-r !from-blue-500 !to-blue-600 !text-white"
                            : "!bg-gradient-to-r !from-emerald-500 !to-emerald-600 !text-white"
                        } !border-0 shadow-md px-3 py-1 text-xs font-semibold rounded-md inline-flex`}
                        style={{
                          background:
                            job.sector === "government"
                              ? "linear-gradient(to right, rgb(59 130 246), rgb(37 99 235))"
                              : "linear-gradient(to right, rgb(16 185 129), rgb(5 150 105))",
                          color: "white",
                        }}
                      >
                        {job.sector === "government" ? "Government" : "Private"}
                      </span>
                      <Badge variant="outline">Exp: {job.experience}</Badge>
                      <Badge variant="outline">
                        Posts: {job.numberOfPosts}
                      </Badge>
                      {job.salary && (
                        <Badge variant="outline">Salary: {job.salary}</Badge>
                      )}
                    </div>
                    {/* Admin-specific controls for status change */}
                    <div className="flex items-center gap-2 mt-3">
                      <Label
                        htmlFor={`status-${job.id}`}
                        className="text-sm text-gray-600"
                      >
                        Change Status:
                      </Label>
                      <Select
                        value={job.status}
                        onValueChange={(value: Job["status"]) =>
                          handleUpdateJobStatus(job.id, value)
                        }
                      >
                        <SelectTrigger className="w-[120px] h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="text-sm text-gray-500 mt-3">
                      <span>
                        Posted: {new Date(job.postedDate).toLocaleDateString()}
                      </span>
                      <span className="ml-4">
                        Last Date: {new Date(job.lastDate).toLocaleDateString()}
                      </span>
                      <span className="ml-4">Views: {job.views}</span>
                      <span className="ml-4">
                        Applications: {job.applications}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 ml-4">
                    {/* Publish button for draft/pending jobs */}
                    {(job.status === "draft" || job.status === "pending") && (
                      <Button
                        size="sm"
                        onClick={() => handlePublishJob(job.id)}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Publish
                      </Button>
                    )}
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditJob(job)}
                        title="Edit Job"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteJob(job.id)}
                        className="text-red-500 hover:text-red-700"
                        title="Delete Job"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="applications">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl text-gray-900">Applications</h2>
                {appLoading && <Loader2 className="w-6 h-6 animate-spin" />}
              </div>

              {applications.length > 0 ? (
                <div className="space-y-4">
                  {applications.map((app: any) => (
                    <Card key={app.id} className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {app.candidateName}
                            </h3>
                            <Badge variant="outline">{app.status}</Badge>
                            {app.interviewDate && (
                              <Badge className="bg-blue-100 text-blue-700">
                                Interview:{" "}
                                {new Date(app.interviewDate).toLocaleString()}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-3">
                            <Label
                              htmlFor={`app-status-${app.id}`}
                              className="text-sm text-gray-600"
                            >
                              Change Status:
                            </Label>
                            <Select
                              value={app.status}
                              onValueChange={(value) => {
                                if (value === "interview") {
                                  setSelectedAppId(app.id);
                                } else {
                                  handleUpdateAppStatus(app.id, value);
                                }
                              }}
                            >
                              <SelectTrigger className="w-[140px] h-8 text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="applied">Applied</SelectItem>
                                <SelectItem value="shortlisted">
                                  Shortlisted
                                </SelectItem>
                                <SelectItem value="interview">
                                  Interview
                                </SelectItem>
                                <SelectItem value="selected">
                                  Selected
                                </SelectItem>
                                <SelectItem value="rejected">
                                  Rejected
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <p className="text-gray-700 mb-1">
                            <strong>Job:</strong> {app.jobTitle} at{" "}
                            {app.jobOrganization}
                          </p>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <Mail className="w-4 h-4" />
                              <span>{app.candidateEmail}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Phone className="w-4 h-4" />
                              <span>{app.candidatePhone}</span>
                            </div>
                          </div>
                          {selectedAppId === app.id && (
                            <div className="mt-4 p-3 bg-gray-100 rounded-lg flex items-center gap-2">
                              <Label htmlFor="interviewDate">
                                Interview Date/Time:
                              </Label>
                              <Input
                                id="interviewDate"
                                type="datetime-local"
                                value={interviewDate}
                                onChange={(e) =>
                                  setInterviewDate(e.target.value)
                                }
                                className="w-auto"
                              />
                              <Button
                                size="sm"
                                onClick={() =>
                                  handleUpdateAppStatus(app.id, "interview")
                                }
                              >
                                Set Interview
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setSelectedAppId(null)}
                              >
                                Cancel
                              </Button>
                            </div>
                          )}

                          {app.resumeUrl && (
                            <div className="mt-3">
                              <Button variant="outline" size="sm" asChild>
                                <a
                                  href={app.resumeUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <FileText className="w-4 h-4 mr-2" />
                                  View Resume
                                </a>
                              </Button>
                            </div>
                          )}
                          <p className="text-xs text-gray-500 mt-2">
                            Applied on{" "}
                            {new Date(app.appliedDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="p-12 text-center">
                  <Eye className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg text-gray-900 mb-2">
                    No applications found
                  </h3>
                  <p className="text-gray-600">
                    Applications will appear here once candidates start applying
                    for jobs.
                  </p>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
