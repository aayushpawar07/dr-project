import {
  MapPin,
  Briefcase,
  Calendar,
  Building2,
  GraduationCap,
  DollarSign,
  FileText,
  ExternalLink,
  Clock,
  Eye,
  User,
  Mail,
  Phone,
  Upload,
  Shield,
  BriefcaseIcon,
  Share2,
  Copy,
  Check,
  MessageCircle,
  Send,
  Edit,
} from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { Alert, AlertDescription } from "./ui/alert";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { useEffect, useState, useRef } from "react";
import { fetchJob, incrementJobView } from "../api/jobs";
import { useParams } from "react-router-dom";
import { applyForJob } from "../api/applications";
import { useAuth } from "../contexts/AuthContext";
import { saveJob, unsaveJob, checkIfJobIsSaved } from "../api/savedJobs";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { ResumeUploadSection } from "./ResumeUploadSection";

interface JobDetailPageProps {
  onNavigate: (page: string, entityId?: string) => void;
  showApplyDialog?: boolean;
}

export function JobDetailPage({
  onNavigate,
  showApplyDialog: initialShowApplyDialog = false,
}: JobDetailPageProps) {
  const { isAuthenticated, user, token } = useAuth();
  const [job, setJob] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showApplyDialog, setShowApplyDialog] = useState(
    initialShowApplyDialog,
  );
  const [isDialogOpening, setIsDialogOpening] = useState(false);
  const buttonClickTimeRef = useRef<number>(0);
  const dialogJustOpenedRef = useRef<boolean>(false);
  const viewIncrementedRef = useRef<string | null>(null);
  const [applicationForm, setApplicationForm] = useState({
    candidateName: "",
    candidateEmail: "",
    candidatePhone: "",
    resume: null as File | null,
    notes: "",
  });
  const [applying, setApplying] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [userApplication, setUserApplication] = useState<any>(null);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const locationText =
    job?.location || [job?.city, job?.state].filter(Boolean).join(", ");
  const { jobId } = useParams<{ jobId: string }>();

  const getShareUrl = () => {
    const jobIdentifier = job?.id || jobId;
    // Use the backend share endpoint so social crawlers receive OG meta tags.
    // The endpoint immediately redirects human browsers back to the SPA.
    return `${window.location.origin.replace(/:\d+$/, '')}/share/job/${jobIdentifier}`;
  };


  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(getShareUrl());
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch (err) {
      console.error("Failed to copy link", err);
    }
  };

  const handleNativeShare = async () => {
    if (!job) return;
    const shareUrl = getShareUrl();
    const shareData = {
      title: `${job.title} | MedExJob`,
      text: `Check out this medical job opening: ${job.title} at ${job.organization || 'MedExJob'}`,
      url: shareUrl,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {}
    }
    setShowShareDialog(true);
  };

  const shareToWhatsApp = () => {
    const text = encodeURIComponent(`*${job?.title}*\n${job?.organization ? job.organization + '\n' : ''}Apply here: ${getShareUrl()}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const shareToLinkedIn = () => {
    const url = encodeURIComponent(getShareUrl());
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, '_blank');
  };

  const shareToTwitter = () => {
    const text = encodeURIComponent(`Check out this job opportunity: ${job?.title} at ${job?.organization || 'MedExJob'}`);
    const url = encodeURIComponent(getShareUrl());
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
  };

  const shareToEmail = () => {
    const subject = encodeURIComponent(`Job Opportunity: ${job?.title}`);
    const body = encodeURIComponent(`Hi,\n\nI thought you might be interested in this job opening:\n\n${job?.title}\n${job?.organization || ''}\nLocation: ${locationText || ''}\n\nView details & apply: ${getShareUrl()}`);
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  // Debug: Track dialog state changes
  useEffect(() => {
    console.log("📊 showApplyDialog state changed:", showApplyDialog);
  }, [showApplyDialog]);

  useEffect(() => {
    (async () => {
      if (!jobId) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      // Reset view increment tracking when jobId changes
      if (viewIncrementedRef.current !== jobId) {
        viewIncrementedRef.current = null;
      }

      setLoading(true);
      try {
        const data = await fetchJob(jobId);
        setJob(data);
        setNotFound(false);

        // Increment view count when a candidate views the job
        // Only increment if user is a candidate or not logged in (public view)
        // And only once per jobId to avoid duplicate increments on re-renders
        if (
          data &&
          (!user || user?.role === "candidate") &&
          viewIncrementedRef.current !== jobId
        ) {
          try {
            const result = await incrementJobView(jobId);
            viewIncrementedRef.current = jobId;
            // Update the job state with incremented view count from API response
            if (result && result.views !== undefined) {
              setJob({ ...data, views: result.views });
            } else if (data.views !== undefined) {
              setJob({ ...data, views: (data.views || 0) + 1 });
            }
          } catch (error) {
            // Silently fail - view increment is not critical
            console.error("Failed to increment view count:", error);
          }
        }
      } catch (e) {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [jobId, user]);

  useEffect(() => {
    // Pre-fill form if user is logged in
    if (user) {
      setApplicationForm((prev) => ({
        ...prev,
        candidateName: user.name,
        candidateEmail: user.email,
      }));
    }
  }, [user, showApplyDialog]);

  // Check if job is saved when job loads
  useEffect(() => {
    const checkSavedStatus = async () => {
      if (jobId && isAuthenticated && token && user?.role === "candidate") {
        try {
          const saved = await checkIfJobIsSaved(jobId, token);
          setIsSaved(saved);
        } catch (error) {
          console.error("Error checking saved status:", error);
          setIsSaved(false);
        }
      }
    };
    checkSavedStatus();
  }, [jobId, isAuthenticated, token, user]);

  // Check if user has already applied for this job
  useEffect(() => {
    const checkApplicationStatus = async () => {
      // Always reset state first when jobId or user changes
      setHasApplied(false);
      setUserApplication(null);

      if (
        !jobId ||
        !isAuthenticated ||
        !token ||
        user?.role !== "candidate" ||
        !user?.id
      ) {
        setHasApplied(false);
        setUserApplication(null);
        return;
      }

      try {
        const { fetchApplications } = await import("../api/applications");
        // Fetch applications for this candidate (not filtering by jobId first to avoid backend issue)
        // Then filter on frontend to find if any application matches this jobId
        const response = await fetchApplications(
          {
            candidateId: user.id,
            page: 0,
            size: 100, // Get enough to check all user's applications
          },
          token,
        );

        console.log("📋 Application check response for candidate:", response);

        // Check if any application in the response matches this jobId
        let hasApplication = false;
        if (response?.content && Array.isArray(response.content)) {
          // Filter to find applications for this specific job
          const applicationsForThisJob = response.content.filter((app: any) => {
            const matches = app?.jobId === jobId;
            console.log("🔍 Checking application:", {
              appJobId: app?.jobId,
              currentJobId: jobId,
              matches,
            });
            return matches;
          });

          hasApplication = applicationsForThisJob.length > 0;
          console.log(
            "📋 Found",
            applicationsForThisJob.length,
            "application(s) for job",
            jobId,
          );

          // Store the application data if found
          if (hasApplication && applicationsForThisJob[0]) {
            setUserApplication(applicationsForThisJob[0]);
            console.log("📄 User application data:", applicationsForThisJob[0]);
          }
        }

        setHasApplied(hasApplication);
        console.log(
          "📋 Final application status for job",
          jobId,
          ":",
          hasApplication ? "Already applied" : "Not applied",
        );
      } catch (error: any) {
        console.error("Error checking application status:", error);
        // For any error, assume not applied to be safe
        setHasApplied(false);
      }
    };

    // Add a small delay to ensure state is reset before checking
    const timeoutId = setTimeout(() => {
      checkApplicationStatus();
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [jobId, isAuthenticated, token, user?.id, user?.role]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading job…</div>
      </div>
    );
  }

  if (notFound || !job) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl text-gray-900 mb-2">Job Not Found</h2>
          <p className="text-gray-600 mb-4">
            The job you're looking for doesn't exist.
          </p>
          <Button onClick={() => onNavigate("jobs")}>Browse All Jobs</Button>
        </div>
      </div>
    );
  }

  const isGovernment = job.sector === "government";
  const daysLeft = job.lastDate
    ? Math.ceil(
        (new Date(job.lastDate).getTime() - new Date().getTime()) /
          (1000 * 60 * 60 * 24),
      )
    : 0;

  const handleApplicationSubmit = async () => {
    if (!job || !token) {
      alert("Please login to apply for this job.");
      return;
    }

    // Validate required fields
    if (
      !applicationForm.candidateName ||
      !applicationForm.candidateEmail ||
      !applicationForm.candidatePhone
    ) {
      alert("Please fill in all required fields (Name, Email, Phone).");
      return;
    }

    setApplying(true);
    try {
      console.log("📝 Submitting application for job:", job.id);
      const response = await applyForJob({
        jobId: job.id,
        candidateName: applicationForm.candidateName,
        candidateEmail: applicationForm.candidateEmail,
        candidatePhone: applicationForm.candidatePhone,
        resume: applicationForm.resume || undefined,
        notes: applicationForm.notes || undefined,
        token: token,
      });

      console.log("✅ Application submitted successfully:", response);
      console.log("📋 Application ID:", response.id);
      console.log("👤 Candidate ID:", response.candidateId);

      // Mark as applied
      setHasApplied(true);

      // Close dialog and reset form
      setShowApplyDialog(false);
      setApplicationForm({
        candidateName: "",
        candidateEmail: "",
        candidatePhone: "",
        resume: null,
        notes: "",
      });

      // Show success message and redirect to dashboard
      alert("Application submitted successfully! Redirecting to dashboard...");

      // Increased delay to ensure backend has saved the application and database is updated
      setTimeout(() => {
        console.log("🔄 Redirecting to dashboard...");
        console.log("👤 Current user:", user);
        console.log("👤 User role:", user?.role);

        // Job applications are always from candidate accounts
        // Always redirect to candidate dashboard regardless of role check
        // This ensures user doesn't get redirected to wrong dashboard
        window.location.href = "/dashboard/candidate";
      }, 1000); // Increased delay to 1 second to ensure backend processing
    } catch (error: any) {
      console.error("❌ Application submission error:", error);

      // Check if it's a duplicate application error
      if (
        error?.message?.includes("already applied") ||
        error?.message?.includes("already exists") ||
        error?.errorCode === "DUPLICATE_APPLICATION"
      ) {
        alert("You have already applied for this job!");
        setHasApplied(true);
      } else {
        const errorMessage =
          error?.message || "Failed to submit application. Please try again.";
        alert(errorMessage);
      }
    } finally {
      setApplying(false);
    }
  };

  const handleSaveJob = async () => {
    if (!job || !token || !isAuthenticated) {
      alert("Please login as a candidate to save jobs");
      return;
    }

    if (user?.role !== "candidate") {
      alert("Only candidates can save jobs");
      return;
    }

    setSaving(true);
    try {
      if (isSaved) {
        await unsaveJob(job.id, token);
        setIsSaved(false);
        alert("Job removed from saved jobs");
      } else {
        await saveJob(job.id, token);
        setIsSaved(true);
        alert("Job saved successfully!");
      }
    } catch (error: any) {
      console.error("Save job error:", error);
      alert(error.message || "Failed to save job. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="md:col-span-2 space-y-6">
            {/* Job Header */}
            <Card className="p-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <span
                    className={`${
                      isGovernment
                        ? "!bg-gradient-to-r !from-blue-500 !to-blue-600 !text-white"
                        : "!bg-gradient-to-r !from-emerald-500 !to-emerald-600 !text-white"
                    } !border-0 shadow-md px-4 py-1.5 text-xs font-bold uppercase tracking-wide flex items-center gap-1.5 rounded-md inline-flex`}
                    style={{
                      background: isGovernment
                        ? "linear-gradient(to right, rgb(59 130 246), rgb(37 99 235))"
                        : "linear-gradient(to right, rgb(16 185 129), rgb(5 150 105))",
                      color: "white",
                    }}
                  >
                    {isGovernment ? (
                      <>
                        <Shield className="w-3.5 h-3.5" />
                        Government
                      </>
                    ) : (
                      <>
                        <BriefcaseIcon className="w-3.5 h-3.5" />
                        Private
                      </>
                    )}
                  </span>
                  <Badge variant="outline">{job.category}</Badge>
                  {job.featured && (
                    <Badge
                      className="bg-yellow-100 text-yellow-700 border-yellow-200"
                      variant="outline"
                    >
                      Featured
                    </Badge>
                  )}
                  <div className="ml-auto flex items-center gap-2">
                    {isAuthenticated && user && (user.role === "admin" || user.role === "employer") && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs flex items-center gap-1 text-amber-700 bg-amber-50 hover:bg-amber-100 border-amber-300"
                        onClick={() => onNavigate("edit-job", job.id || jobId)}
                      >
                        <Edit className="w-3.5 h-3.5" />
                        Edit Job
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs flex items-center gap-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 border-gray-300"
                      onClick={handleNativeShare}
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      Share
                    </Button>
                  </div>
                </div>

                <div>
                  <h1 className="text-3xl text-gray-900 mb-2">{job.title}</h1>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Building2 className="w-5 h-5" />
                    <span className="text-lg">{job.organization}</span>
                  </div>
                  {job.sourceRecruitmentId && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => onNavigate("recruitment", job.sourceRecruitmentId)}
                    >
                      View Full Recruitment
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-6 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <Eye className="w-4 h-4" />
                    <span>{job.views} views</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Briefcase className="w-4 h-4" />
                    <span>{job.applications} applications</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {job.postedDate && (
                      <span>
                        Posted{" "}
                        {new Date(job.postedDate).toLocaleDateString("en-IN")}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Card>

            {/* Job Details */}
            <Card className="p-6">
              <h2 className="text-xl text-gray-900 mb-4">Job Details</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Location</p>
                    <p className="text-gray-900">
                      {locationText || "Location"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Briefcase className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Number of Posts</p>
                    <p className="text-gray-900">{job.numberOfPosts}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <GraduationCap className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Qualification</p>
                    <p className="text-gray-900">{job.qualification}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Briefcase className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Experience</p>
                    <p className="text-gray-900">{job.experience}</p>
                  </div>
                </div>

                {job.salary && (
                  <div className="flex items-start gap-3">
                    <DollarSign className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Salary</p>
                      <p className="text-gray-900">{job.salary}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Last Date to Apply</p>
                    <p className="text-gray-900">
                      {new Date(job.lastDate).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Job Description */}
            <Card className="p-6">
              <h2 className="text-xl text-gray-900 mb-4">Job Description</h2>
              <p className="text-gray-700 leading-relaxed">{job.description}</p>
            </Card>

            {/* Government Job Additional Info */}
            {isGovernment && job.pdfUrl && (
              <Card className="p-6">
                <h2 className="text-xl text-gray-900 mb-4">
                  Official Documents
                </h2>
                <div className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    asChild
                  >
                    <a
                      href={job.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      View Official Notification PDF
                      <ExternalLink className="w-4 h-4 ml-auto" />
                    </a>
                  </Button>
                  <div className="mt-4">
                    <div className="text-sm text-gray-600 mb-2">
                      Inline Preview
                    </div>
                    <div className="border rounded overflow-hidden">
                      <object
                        data={job.pdfUrl}
                        type="application/pdf"
                        width="100%"
                        height="600px"
                      >
                        <iframe
                          src={job.pdfUrl}
                          title="PDF Preview"
                          width="100%"
                          height="600px"
                        />
                      </object>
                    </div>
                  </div>
                  {job.applyLink && (
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      asChild
                    >
                      <a
                        href={job.applyLink}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Official Apply Link
                        <ExternalLink className="w-4 h-4 ml-auto" />
                      </a>
                    </Button>
                  )}
                </div>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="md:col-span-1 space-y-6">
            {/* Apply Card */}
            <Card className="p-6 md:sticky md:top-20">
              <div className="space-y-4">
                {daysLeft > 0 && (
                  <Alert
                    className={
                      daysLeft <= 7
                        ? "border-red-200 bg-red-50"
                        : "border-blue-200 bg-blue-50"
                    }
                  >
                    <Calendar className="w-4 h-4" />
                    <AlertDescription>
                      {daysLeft <= 7 ? (
                        <span className="text-red-700">
                          Only {daysLeft} days left to apply!
                        </span>
                      ) : (
                        <span className="text-blue-700">
                          {daysLeft} days remaining
                        </span>
                      )}
                    </AlertDescription>
                  </Alert>
                )}

                <Separator />

                {isGovernment ? (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600">
                      Apply directly through our platform or visit the official
                      website.
                    </p>
                    {isAuthenticated ? (
                      <>
                        <Button
                          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                          disabled={
                            hasApplied ||
                            !isAuthenticated ||
                            user?.role !== "candidate"
                          }
                          onClick={(e) => {
                            if (hasApplied) {
                              e.preventDefault();
                              e.stopPropagation();
                              alert("You have already applied for this job!");
                              return;
                            }
                            e.preventDefault();
                            e.stopPropagation();
                            console.log(
                              "🔘 Apply Now button clicked (Government)",
                            );
                            // Record button click time IMMEDIATELY
                            const clickTime = Date.now();
                            buttonClickTimeRef.current = clickTime;

                            // Set opening flag SYNCHRONOUSLY before opening dialog
                            setIsDialogOpening(true);
                            dialogJustOpenedRef.current = true;

                            // Open dialog immediately
                            setShowApplyDialog(true);
                            console.log(
                              "✅ Dialog state set to true at",
                              clickTime,
                            );

                            // Reset opening flag after dialog animation completes (increased to 3000ms)
                            // Store timeout ID to prevent multiple resets
                            setTimeout(() => {
                              // Double check that enough time has passed
                              const timeSinceClick =
                                Date.now() - buttonClickTimeRef.current;
                              if (timeSinceClick >= 3000) {
                                setIsDialogOpening(false);
                                dialogJustOpenedRef.current = false;
                                console.log(
                                  "✅ Dialog opening flag reset after",
                                  timeSinceClick,
                                  "ms",
                                );
                              } else {
                                console.log(
                                  "⚠️ Skipping flag reset - only",
                                  timeSinceClick,
                                  "ms passed",
                                );
                              }
                            }, 3000);
                          }}
                        >
                          {hasApplied ? "Already Applied" : "Apply Now"}
                        </Button>
                        <Dialog
                          open={showApplyDialog}
                          modal={true}
                          onOpenChange={(open) => {
                            console.log(
                              "🔄 Dialog onOpenChange (Government):",
                              open,
                              "applying:",
                              applying,
                              "isDialogOpening:",
                              isDialogOpening,
                              "dialogJustOpened:",
                              dialogJustOpenedRef.current,
                            );

                            // If trying to close, check all conditions
                            if (!open) {
                              // Check if dialog was just opened
                              if (dialogJustOpenedRef.current) {
                                console.log(
                                  "🚫 Prevented close - dialog just opened",
                                );
                                // Force dialog to stay open
                                setShowApplyDialog(true);
                                return;
                              }

                              // Check timestamp - if button was clicked recently, prevent close (increased to 3000ms)
                              const timeSinceButtonClick =
                                Date.now() - buttonClickTimeRef.current;
                              if (timeSinceButtonClick < 3000) {
                                console.log(
                                  "🚫 Prevented close - button clicked recently (",
                                  timeSinceButtonClick,
                                  "ms ago)",
                                );
                                // Force dialog to stay open
                                setShowApplyDialog(true);
                                return;
                              }

                              // Check flags
                              if (applying || isDialogOpening) {
                                console.log(
                                  "🚫 Prevented close - dialog opening or applying",
                                );
                                // Force dialog to stay open
                                setShowApplyDialog(true);
                                return;
                              }

                              // All checks passed, allow closing
                              console.log("✅ Allowing dialog to close");
                            }

                            // Allow state change (for opening or when all checks pass)
                            setShowApplyDialog(open);
                          }}
                        >
                          <DialogContent
                            className="sm:max-w-[500px]"
                            onInteractOutside={(e) => {
                              const target = e.target as HTMLElement;
                              // Check if click is on the button that opened the dialog
                              if (
                                target.closest('button[class*="bg-green-600"]')
                              ) {
                                console.log(
                                  "🖱️ Click detected on Apply Now button, preventing close",
                                );
                                e.preventDefault();
                                return;
                              }

                              // Check if dialog was just opened
                              if (dialogJustOpenedRef.current) {
                                console.log(
                                  "🖱️ Click detected - dialog just opened, preventing close",
                                );
                                e.preventDefault();
                                return;
                              }

                              // Check if this event happened shortly after button click (increased window to 3000ms)
                              const timeSinceButtonClick =
                                Date.now() - buttonClickTimeRef.current;
                              if (timeSinceButtonClick < 3000) {
                                console.log(
                                  "🖱️ Click detected shortly after button click (",
                                  timeSinceButtonClick,
                                  "ms), preventing close",
                                );
                                e.preventDefault();
                                return;
                              }

                              console.log(
                                "🖱️ onInteractOutside triggered (Government), applying:",
                                applying,
                                "isDialogOpening:",
                                isDialogOpening,
                                "dialogJustOpened:",
                                dialogJustOpenedRef.current,
                              );
                              if (applying || isDialogOpening) {
                                e.preventDefault();
                                console.log(
                                  "🚫 Prevented close during application or opening",
                                );
                                return;
                              }
                            }}
                            onPointerDownOutside={(e) => {
                              const target = e.target as HTMLElement;
                              // Check if click is on the button that opened the dialog
                              if (
                                target.closest('button[class*="bg-green-600"]')
                              ) {
                                console.log(
                                  "🖱️ PointerDown detected on Apply Now button, preventing close",
                                );
                                e.preventDefault();
                                return;
                              }

                              // Check if dialog was just opened
                              if (dialogJustOpenedRef.current) {
                                console.log(
                                  "🖱️ PointerDown detected - dialog just opened, preventing close",
                                );
                                e.preventDefault();
                                return;
                              }

                              // Check if this event happened shortly after button click (increased window to 3000ms)
                              const timeSinceButtonClick =
                                Date.now() - buttonClickTimeRef.current;
                              if (timeSinceButtonClick < 3000) {
                                console.log(
                                  "🖱️ PointerDown detected shortly after button click (",
                                  timeSinceButtonClick,
                                  "ms), preventing close",
                                );
                                e.preventDefault();
                                return;
                              }

                              console.log(
                                "🖱️ onPointerDownOutside triggered (Government), applying:",
                                applying,
                                "isDialogOpening:",
                                isDialogOpening,
                                "dialogJustOpened:",
                                dialogJustOpenedRef.current,
                              );
                              if (applying || isDialogOpening) {
                                e.preventDefault();
                                console.log(
                                  "🚫 Prevented close during application or opening",
                                );
                                return;
                              }
                            }}
                            onEscapeKeyDown={(e) => {
                              console.log(
                                "⌨️ onEscapeKeyDown triggered (Government)",
                              );
                              if (applying || isDialogOpening) {
                                e.preventDefault();
                                console.log(
                                  "🚫 Prevented close during application or opening",
                                );
                              }
                            }}
                          >
                            <DialogHeader>
                              <DialogTitle>Apply for {job.title}</DialogTitle>
                              <DialogDescription>
                                Fill out the form below to submit your
                                application for this position.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label
                                  htmlFor="candidateName"
                                  className="text-sm font-medium text-gray-700 mb-1 block"
                                >
                                  Full Name *
                                </Label>
                                <Input
                                  id="candidateName"
                                  type="text"
                                  required
                                  value={applicationForm.candidateName}
                                  onChange={(e) =>
                                    setApplicationForm((prev) => ({
                                      ...prev,
                                      candidateName: e.target.value,
                                    }))
                                  }
                                  placeholder="Enter your full name"
                                  className="w-full focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                                />
                              </div>
                              <div>
                                <Label
                                  htmlFor="candidateEmail"
                                  className="text-sm font-medium text-gray-700 mb-1 block"
                                >
                                  Email Address *
                                </Label>
                                <Input
                                  id="candidateEmail"
                                  type="email"
                                  required
                                  value={applicationForm.candidateEmail}
                                  onChange={(e) =>
                                    setApplicationForm((prev) => ({
                                      ...prev,
                                      candidateEmail: e.target.value,
                                    }))
                                  }
                                  placeholder="Enter your email"
                                  className="w-full focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                                />
                              </div>
                              <div>
                                <Label
                                  htmlFor="candidatePhone"
                                  className="text-sm font-medium text-gray-700 mb-1 block"
                                >
                                  Phone Number *
                                </Label>
                                <Input
                                  id="candidatePhone"
                                  type="tel"
                                  required
                                  value={applicationForm.candidatePhone}
                                  onChange={(e) =>
                                    setApplicationForm((prev) => ({
                                      ...prev,
                                      candidatePhone: e.target.value,
                                    }))
                                  }
                                  placeholder="Enter your phone number"
                                  className="w-full focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                                />
                              </div>
                              <div>
                                <Label
                                  htmlFor="resume"
                                  className="text-sm font-medium text-gray-700 mb-1 block"
                                >
                                  Resume/CV
                                </Label>
                                <Input
                                  id="resume"
                                  type="file"
                                  accept=".pdf,.doc,.docx"
                                  onChange={(e) =>
                                    setApplicationForm((prev) => ({
                                      ...prev,
                                      resume: e.target.files?.[0] || null,
                                    }))
                                  }
                                  className="w-full focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all cursor-pointer"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                  Upload PDF, DOC, or DOCX (max 10MB)
                                </p>
                              </div>
                              <div>
                                <Label
                                  htmlFor="notes"
                                  className="text-sm font-medium text-gray-700 mb-1 block"
                                >
                                  Additional Notes
                                </Label>
                                <Textarea
                                  id="notes"
                                  value={applicationForm.notes}
                                  onChange={(e) =>
                                    setApplicationForm((prev) => ({
                                      ...prev,
                                      notes: e.target.value,
                                    }))
                                  }
                                  placeholder="Any additional information you'd like to share..."
                                  rows={3}
                                  className="w-full focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all resize-y"
                                />
                              </div>
                              <div className="flex gap-3 pt-4">
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    console.log("❌ Cancel button clicked");
                                    dialogJustOpenedRef.current = false;
                                    setShowApplyDialog(false);
                                  }}
                                  className="flex-1"
                                >
                                  Cancel
                                </Button>
                                <Button
                                  onClick={handleApplicationSubmit}
                                  disabled={
                                    applying ||
                                    !applicationForm.candidateName ||
                                    !applicationForm.candidateEmail ||
                                    !applicationForm.candidatePhone
                                  }
                                  className="flex-1 bg-green-600 hover:bg-green-700"
                                >
                                  {applying
                                    ? "Submitting..."
                                    : "Submit Application"}
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </>
                    ) : (
                      <div className="space-y-3">
                        <Button
                          className="w-full bg-green-600 hover:bg-green-700"
                          onClick={() => onNavigate("login")}
                        >
                          Login to Apply
                        </Button>
                        <p className="text-xs text-center text-gray-500">
                          Please login to submit your application.
                        </p>
                      </div>
                    )}
                    {job.applyLink && (
                      <Button variant="outline" className="w-full" asChild>
                        <a
                          href={job.applyLink}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Official Apply Link
                          <ExternalLink className="w-4 h-4 ml-auto" />
                        </a>
                      </Button>
                    )}
                    {job.pdfUrl && (
                      <Button variant="outline" className="w-full" asChild>
                        <a
                          href={job.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          View Notification
                        </a>
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600">
                      Apply directly through our platform. Your profile and
                      resume will be shared with the employer.
                    </p>
                    {isAuthenticated ? (
                      <>
                        <Button
                          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                          disabled={
                            hasApplied ||
                            !isAuthenticated ||
                            user?.role !== "candidate"
                          }
                          onClick={(e) => {
                            if (hasApplied) {
                              e.preventDefault();
                              e.stopPropagation();
                              alert("You have already applied for this job!");
                              return;
                            }
                            e.preventDefault();
                            e.stopPropagation();
                            console.log(
                              "🔘 Apply Now button clicked (Private)",
                            );
                            // Record button click time IMMEDIATELY
                            buttonClickTimeRef.current = Date.now();
                            // Set opening flag SYNCHRONOUSLY before opening dialog
                            setIsDialogOpening(true);
                            dialogJustOpenedRef.current = true;
                            // Open dialog
                            setShowApplyDialog(true);
                            // Reset opening flag after dialog animation completes (increased to 2000ms)
                            setTimeout(() => {
                              setIsDialogOpening(false);
                              dialogJustOpenedRef.current = false;
                              console.log("✅ Dialog opening flag reset");
                            }, 2000);
                          }}
                        >
                          {hasApplied ? "Already Applied" : "Apply Now"}
                        </Button>
                        <Dialog
                          open={showApplyDialog}
                          modal={true}
                          onOpenChange={(open) => {
                            console.log(
                              "🔄 Dialog onOpenChange (Private):",
                              open,
                              "applying:",
                              applying,
                              "isDialogOpening:",
                              isDialogOpening,
                              "dialogJustOpened:",
                              dialogJustOpenedRef.current,
                            );

                            // If trying to close, check all conditions
                            if (!open) {
                              // Check if dialog was just opened
                              if (dialogJustOpenedRef.current) {
                                console.log(
                                  "🚫 Prevented close - dialog just opened",
                                );
                                // Force dialog to stay open
                                setShowApplyDialog(true);
                                return;
                              }

                              // Check timestamp - if button was clicked recently, prevent close (increased to 3000ms)
                              const timeSinceButtonClick =
                                Date.now() - buttonClickTimeRef.current;
                              if (timeSinceButtonClick < 3000) {
                                console.log(
                                  "🚫 Prevented close - button clicked recently (",
                                  timeSinceButtonClick,
                                  "ms ago)",
                                );
                                // Force dialog to stay open
                                setShowApplyDialog(true);
                                return;
                              }

                              // Check flags
                              if (applying || isDialogOpening) {
                                console.log(
                                  "🚫 Prevented close - dialog opening or applying",
                                );
                                // Force dialog to stay open
                                setShowApplyDialog(true);
                                return;
                              }

                              // All checks passed, allow closing
                              console.log("✅ Allowing dialog to close");
                            }

                            // Allow state change (for opening or when all checks pass)
                            setShowApplyDialog(open);
                          }}
                        >
                          <DialogContent
                            className="sm:max-w-[500px]"
                            onInteractOutside={(e) => {
                              const target = e.target as HTMLElement;
                              // Check if click is on the button that opened the dialog
                              if (
                                target.closest('button[class*="bg-green-600"]')
                              ) {
                                console.log(
                                  "🖱️ Click detected on Apply Now button, preventing close",
                                );
                                e.preventDefault();
                                return;
                              }

                              // Check if dialog was just opened
                              if (dialogJustOpenedRef.current) {
                                console.log(
                                  "🖱️ Click detected - dialog just opened, preventing close",
                                );
                                e.preventDefault();
                                return;
                              }

                              // Check if this event happened shortly after button click (increased window to 3000ms)
                              const timeSinceButtonClick =
                                Date.now() - buttonClickTimeRef.current;
                              if (timeSinceButtonClick < 3000) {
                                console.log(
                                  "🖱️ Click detected shortly after button click (",
                                  timeSinceButtonClick,
                                  "ms), preventing close",
                                );
                                e.preventDefault();
                                return;
                              }

                              console.log(
                                "🖱️ onInteractOutside triggered, applying:",
                                applying,
                                "isDialogOpening:",
                                isDialogOpening,
                                "dialogJustOpened:",
                                dialogJustOpenedRef.current,
                              );
                              if (applying || isDialogOpening) {
                                e.preventDefault();
                                console.log(
                                  "🚫 Prevented close during application or opening",
                                );
                                return;
                              }
                            }}
                            onPointerDownOutside={(e) => {
                              const target = e.target as HTMLElement;
                              // Check if click is on the button that opened the dialog
                              if (
                                target.closest('button[class*="bg-green-600"]')
                              ) {
                                console.log(
                                  "🖱️ PointerDown detected on Apply Now button, preventing close",
                                );
                                e.preventDefault();
                                return;
                              }

                              // Check if dialog was just opened
                              if (dialogJustOpenedRef.current) {
                                console.log(
                                  "🖱️ PointerDown detected - dialog just opened, preventing close",
                                );
                                e.preventDefault();
                                return;
                              }

                              // Check if this event happened shortly after button click (increased window to 3000ms)
                              const timeSinceButtonClick =
                                Date.now() - buttonClickTimeRef.current;
                              if (timeSinceButtonClick < 3000) {
                                console.log(
                                  "🖱️ PointerDown detected shortly after button click (",
                                  timeSinceButtonClick,
                                  "ms), preventing close",
                                );
                                e.preventDefault();
                                return;
                              }

                              console.log(
                                "🖱️ onPointerDownOutside triggered, applying:",
                                applying,
                                "isDialogOpening:",
                                isDialogOpening,
                                "dialogJustOpened:",
                                dialogJustOpenedRef.current,
                              );
                              if (applying || isDialogOpening) {
                                e.preventDefault();
                                console.log(
                                  "🚫 Prevented close during application or opening",
                                );
                                return;
                              }
                            }}
                            onEscapeKeyDown={(e) => {
                              console.log("⌨️ onEscapeKeyDown triggered");
                              if (applying || isDialogOpening) {
                                e.preventDefault();
                                console.log(
                                  "🚫 Prevented close during application or opening",
                                );
                              }
                            }}
                          >
                            <DialogHeader>
                              <DialogTitle>Apply for {job.title}</DialogTitle>
                              <DialogDescription>
                                Fill out the form below to submit your
                                application for this position.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label
                                  htmlFor="candidateName"
                                  className="text-sm font-medium text-gray-700 mb-1 block"
                                >
                                  Full Name *
                                </Label>
                                <Input
                                  id="candidateName"
                                  type="text"
                                  required
                                  value={applicationForm.candidateName}
                                  onChange={(e) =>
                                    setApplicationForm((prev) => ({
                                      ...prev,
                                      candidateName: e.target.value,
                                    }))
                                  }
                                  placeholder="Enter your full name"
                                  className="w-full focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                                />
                              </div>
                              <div>
                                <Label
                                  htmlFor="candidateEmail"
                                  className="text-sm font-medium text-gray-700 mb-1 block"
                                >
                                  Email Address *
                                </Label>
                                <Input
                                  id="candidateEmail"
                                  type="email"
                                  required
                                  value={applicationForm.candidateEmail}
                                  onChange={(e) =>
                                    setApplicationForm((prev) => ({
                                      ...prev,
                                      candidateEmail: e.target.value,
                                    }))
                                  }
                                  placeholder="Enter your email"
                                  className="w-full focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                                />
                              </div>
                              <div>
                                <Label
                                  htmlFor="candidatePhone"
                                  className="text-sm font-medium text-gray-700 mb-1 block"
                                >
                                  Phone Number *
                                </Label>
                                <Input
                                  id="candidatePhone"
                                  type="tel"
                                  required
                                  value={applicationForm.candidatePhone}
                                  onChange={(e) =>
                                    setApplicationForm((prev) => ({
                                      ...prev,
                                      candidatePhone: e.target.value,
                                    }))
                                  }
                                  placeholder="Enter your phone number"
                                  className="w-full focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                                />
                              </div>
                              <div>
                                <Label
                                  htmlFor="resume"
                                  className="text-sm font-medium text-gray-700 mb-1 block"
                                >
                                  Resume/CV
                                </Label>
                                <Input
                                  id="resume"
                                  type="file"
                                  accept=".pdf,.doc,.docx"
                                  onChange={(e) =>
                                    setApplicationForm((prev) => ({
                                      ...prev,
                                      resume: e.target.files?.[0] || null,
                                    }))
                                  }
                                  className="w-full focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all cursor-pointer"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                  Upload PDF, DOC, or DOCX (max 10MB)
                                </p>
                              </div>
                              <div>
                                <Label
                                  htmlFor="notes"
                                  className="text-sm font-medium text-gray-700 mb-1 block"
                                >
                                  Additional Notes
                                </Label>
                                <Textarea
                                  id="notes"
                                  value={applicationForm.notes}
                                  onChange={(e) =>
                                    setApplicationForm((prev) => ({
                                      ...prev,
                                      notes: e.target.value,
                                    }))
                                  }
                                  placeholder="Any additional information you'd like to share..."
                                  rows={3}
                                  className="w-full focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all resize-y"
                                />
                              </div>
                              <div className="flex gap-3 pt-4">
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    console.log("❌ Cancel button clicked");
                                    dialogJustOpenedRef.current = false;
                                    setShowApplyDialog(false);
                                  }}
                                  className="flex-1"
                                >
                                  Cancel
                                </Button>
                                <Button
                                  onClick={handleApplicationSubmit}
                                  disabled={
                                    applying ||
                                    !applicationForm.candidateName ||
                                    !applicationForm.candidateEmail ||
                                    !applicationForm.candidatePhone
                                  }
                                  className="flex-1 bg-green-600 hover:bg-green-700"
                                >
                                  {applying
                                    ? "Submitting..."
                                    : "Submit Application"}
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </>
                    ) : (
                      <div className="space-y-3">
                        <Button
                          className="w-full bg-green-600 hover:bg-green-700"
                          onClick={() => onNavigate("login")}
                        >
                          Login to Apply
                        </Button>
                        <p className="text-xs text-center text-gray-500">
                          Please login to submit your application.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Only show save button for candidates when logged in */}
                {isAuthenticated && user?.role === "candidate" && (
                  <>
                    <Separator />
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={handleSaveJob}
                      disabled={saving}
                    >
                      {saving ? (
                        "Saving..."
                      ) : isSaved ? (
                        <>
                          <BookmarkCheck className="w-4 h-4 mr-2" />
                          Saved
                        </>
                      ) : (
                        <>
                          <Bookmark className="w-4 h-4 mr-2" />
                          Save Job
                        </>
                      )}
                    </Button>
                  </>
                )}

                {isAuthenticated && user && (user.role === "admin" || user.role === "employer") && (
                  <>
                    <Separator />
                    <Button
                      variant="outline"
                      className="w-full text-amber-700 bg-amber-50 hover:bg-amber-100 border-amber-300 font-medium"
                      onClick={() => onNavigate("edit-job", job.id || jobId)}
                    >
                      <Edit className="w-4 h-4 mr-2 text-amber-700" />
                      Edit This Job
                    </Button>
                  </>
                )}

                {/* Share Job button for all users (candidates, employers, admins, guests) */}
                <Separator />
                <Button
                  variant="outline"
                  className="w-full text-blue-600 border-blue-200 hover:bg-blue-50"
                  onClick={handleNativeShare}
                >
                  <Share2 className="w-4 h-4 mr-2 text-blue-600" />
                  Share Job
                </Button>
              </div>
            </Card>

            {/* Company Info */}
            <Card className="p-6">
              <h3 className="text-lg text-gray-900 mb-4">About Organization</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-gray-400" />
                  <span className="text-sm text-gray-700">
                    {job.organization}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-gray-400" />
                  <span className="text-sm text-gray-700">{job.location}</span>
                </div>
              </div>
            </Card>

            {/* Job Document Section - Direct PDF and Image attachments */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Job Documents
              </h3>
              {job.jobDocumentUrl || job.jobImageUrl ? (
                <div className="space-y-3">
                  {/* PDF Document */}
                  {job.jobDocumentUrl && (
                    <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <FileText className="w-5 h-5 text-blue-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            Job Description Document
                          </p>
                          <p className="text-xs text-gray-500">PDF Document</p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          window.open(job.jobDocumentUrl, "_blank")
                        }
                        className="ml-3 flex-shrink-0"
                      >
                        <ExternalLink className="w-4 h-4 mr-1" />
                        View
                      </Button>
                    </div>
                  )}
                  {/* Job Image */}
                  {job.jobImageUrl && (
                    <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <FileText className="w-5 h-5 text-green-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            Job Image
                          </p>
                          <p className="text-xs text-gray-500">Image File</p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(job.jobImageUrl, "_blank")}
                        className="ml-3 flex-shrink-0"
                      >
                        <ExternalLink className="w-4 h-4 mr-1" />
                        View
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  No documents available for this job.
                </p>
              )}
            </Card>

            {/* Resume Section - Only for candidates who have already applied */}
            {isAuthenticated &&
              user?.role === "candidate" &&
              jobId &&
              hasApplied && (
                <ResumeUploadSection
                  jobId={jobId}
                  applicationResumeUrl={userApplication?.resumeUrl}
                  applicationId={userApplication?.id}
                />
              )}
          </div>
        </div>

        {/* Share Dialog */}
        <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
          <DialogContent className="sm:max-w-[440px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl font-bold text-gray-900">
                <Share2 className="w-5 h-5 text-blue-600" />
                Share this Job
              </DialogTitle>
              <DialogDescription>
                Share this opportunity with colleagues, candidates, or on social platforms.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              {/* Direct Copy Input */}
              <div className="flex items-center space-x-2">
                <Input
                  readOnly
                  value={getShareUrl()}
                  className="flex-1 bg-gray-50 text-sm text-gray-700 select-all"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={handleCopyLink}
                  className={copiedLink ? "bg-green-600 hover:bg-green-700 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"}
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-4 h-4 mr-1" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-1" />
                      Copy Link
                    </>
                  )}
                </Button>
              </div>

              {/* Social Channels */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={shareToWhatsApp}
                  className="flex items-center justify-center gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50 h-11"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-600" />
                  WhatsApp
                </Button>

                <Button
                  variant="outline"
                  onClick={shareToLinkedIn}
                  className="flex items-center justify-center gap-2 border-blue-300 text-blue-700 hover:bg-blue-50 h-11"
                >
                  <Briefcase className="w-4 h-4 text-blue-600" />
                  LinkedIn
                </Button>

                <Button
                  variant="outline"
                  onClick={shareToTwitter}
                  className="flex items-center justify-center gap-2 border-slate-300 text-slate-700 hover:bg-slate-50 h-11"
                >
                  <Send className="w-4 h-4 text-slate-600" />
                  Twitter / X
                </Button>

                <Button
                  variant="outline"
                  onClick={shareToEmail}
                  className="flex items-center justify-center gap-2 border-purple-300 text-purple-700 hover:bg-purple-50 h-11"
                >
                  <Mail className="w-4 h-4 text-purple-600" />
                  Email
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
