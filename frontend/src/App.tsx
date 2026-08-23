// AI assisted development
import { useState, useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  useNavigate,
  useLocation,
  useParams,
} from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import {
  createJob,
  createAdminJob,
  uploadJobDocument,
  uploadJobImage,
} from "./api/jobs";

import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { HomePage } from "./components/HomePage";
import { AuthPage } from "./components/AuthPage";
import { JobListingPage } from "./components/JobListingPage";
import { JobDetailPage } from "./components/JobDetailPage";
import { CandidateDashboard } from "./components/CandidateDashboard";
import { EmployerDashboard } from "./components/EmployerDashboard";
import { AdminDashboard } from "./components/AdminDashboard";
import { ProfilePage } from "./components/ProfilePage";
import { AboutPage } from "./components/AboutPage";
import { FAQPage } from "./components/FAQPage";
import { PrivacyPolicyPage } from "./components/PrivacyPolicyPage";
import { TermsConditionsPage } from "./components/TermsConditionsPage";
import { RefundCancellationPage } from "./components/RefundCancellationPage";
import { ContactUsPage } from "./components/ContactUsPage";
import { AdminJobManagementPage } from "./components/AdminJobManagementPage";
import { JobPostingForm } from "./components/JobPostingForm";
import { AdminUsersPage } from "./components/AdminUsersPage";
import { EmployerVerificationPage } from "./components/EmployerVerificationPage";
import { EmployerManagementPage } from "./components/EmployerManagementPage";
import { AdminApplications } from "./components/AdminApplications";
import { AdminNewsManagementPage } from "./components/AdminNewsManagementPage";
import { AnalyticsDashboard } from "./components/AnalyticsDashboard";
import { NotificationCenter } from "./components/NotificationCenter";
import { SubscriptionPage } from "./components/SubscriptionPage";
import { EmployerVerification } from "./components/EmployerVerification";
import { NewsPage } from "./components/NewsPage";
import { NewsDetailPage } from "./components/NewsDetailPage";
import { ForgotPasswordPage } from "./components/ForgotPasswordPage";
import { AdminPricingManagement } from "./components/AdminPricingManagement";
import { PricingPage } from "./components/PricingPage";
import { EditJobPage } from "./components/EditJobPage";
import { AiBulkJobUploader } from "./components/AiBulkJobUploader";
import { RecruitmentPage } from "./components/RecruitmentPage";
import { Toaster } from "./components/ui/sonner";
import { toast } from "sonner";

// Wrapper component to extract employerId from URL params
function EmployerManagementPageWrapper({
  onNavigate,
}: {
  onNavigate: (page: string) => void;
}) {
  const { employerId } = useParams<{ employerId: string }>();
  return (
    <EmployerManagementPage onNavigate={onNavigate} employerId={employerId} />
  );
}

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user, logout, token } = useAuth();
  const [currentPage, setCurrentPage] = useState(
    location.pathname.substring(1) || "home",
  );

  useEffect(() => {
    setCurrentPage(location.pathname.substring(1) || "home");
  }, [location]);

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [location.pathname]);

  const handleNavigate = (page: string, entityId?: string) => {
    // Scroll to top before navigation
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });

    if (page === "logout") {
      logout();
      navigate("/login");
      return;
    }
    // Handle dashboard navigation based on user role - ignore entityId for dashboard
    if (page === "dashboard") {
      if (!isAuthenticated || !user) {
        navigate("/login");
        return;
      }
      // Navigate to role-specific dashboard
      if (user.role === "admin") {
        navigate("/dashboard/admin");
      } else if (user.role === "employer") {
        navigate("/dashboard/employer");
      } else if (user.role === "candidate") {
        navigate("/dashboard/candidate");
      } else {
        navigate("/dashboard/candidate"); // Default fallback
      }
      return;
    }
    const path = entityId ? `/${page}/${entityId}` : `/${page}`;
    navigate(path);
  };

  const getDashboard = () => {
    if (!isAuthenticated || !user)
      return <AuthPage mode="login" onNavigate={handleNavigate} />;
    if (user.role === "admin")
      return <AdminDashboard onNavigate={handleNavigate} />;
    if (user.role === "employer")
      return <EmployerVerification onNavigate={handleNavigate} />; // Employers land on verification first
    return <CandidateDashboard onNavigate={handleNavigate} />;
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header
        currentPage={currentPage}
        onNavigate={handleNavigate}
        isAuthenticated={isAuthenticated}
        userRole={user?.role}
      />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage onNavigate={handleNavigate} />} />
          <Route
            path="/home"
            element={<HomePage onNavigate={handleNavigate} />}
          />
          <Route
            path="/login"
            element={<AuthPage mode="login" onNavigate={handleNavigate} />}
          />
          <Route
            path="/register"
            element={<AuthPage mode="register" onNavigate={handleNavigate} />}
          />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route
            path="/jobs"
            element={<JobListingPage onNavigate={handleNavigate} />}
          />
          <Route
            path="/govt-jobs"
            element={
              <JobListingPage onNavigate={handleNavigate} sector="government" />
            }
          />
          <Route
            path="/private-jobs"
            element={
              <JobListingPage onNavigate={handleNavigate} sector="private" />
            }
          />
          <Route
            path="/recruitment/:recruitmentId"
            element={<RecruitmentPage />}
          />
          <Route
            path="/news"
            element={<NewsPage onNavigate={handleNavigate} />}
          />
          <Route
            path="/news/:newsId"
            element={<NewsDetailPage onNavigate={handleNavigate} />}
          />
          <Route
            path="/job-detail/:jobId"
            element={<JobDetailPage onNavigate={handleNavigate} />}
          />
          <Route
            path="/about"
            element={<AboutPage onNavigate={handleNavigate} />}
          />
          <Route
            path="/pricing"
            element={<PricingPage onNavigate={handleNavigate} />}
          />
          <Route
            path="/faq"
            element={<FAQPage onNavigate={handleNavigate} />}
          />
          <Route
            path="/privacy-policy"
            element={<PrivacyPolicyPage onNavigate={handleNavigate} />}
          />
          <Route
            path="/terms-conditions"
            element={<TermsConditionsPage onNavigate={handleNavigate} />}
          />
          <Route
            path="/refund-cancellation"
            element={<RefundCancellationPage onNavigate={handleNavigate} />}
          />
          <Route
            path="/contact"
            element={<ContactUsPage onNavigate={handleNavigate} />}
          />
          <Route
            path="/subscription"
            element={<SubscriptionPage onNavigate={handleNavigate} />}
          />

          {/* Notifications Route */}
          <Route
            path="/notifications"
            element={
              isAuthenticated && user ? (
                <NotificationCenter
                  userId={user.id}
                  userRole={user.role as "admin" | "employer" | "candidate"}
                />
              ) : (
                <AuthPage mode="login" onNavigate={handleNavigate} />
              )
            }
          />

          {/* Authenticated Routes */}
          {isAuthenticated && user && (
            <>
              {/* Generic dashboard route, redirects based on role */}
              <Route path="/dashboard" element={getDashboard()} />

              {/* Role-specific dashboard routes */}
              <Route
                path="/dashboard/candidate"
                element={<CandidateDashboard onNavigate={handleNavigate} />}
              />
              <Route
                path="/dashboard/employer"
                element={<EmployerDashboard onNavigate={handleNavigate} />}
              />
              <Route
                path="/verification"
                element={<EmployerVerification onNavigate={handleNavigate} />}
              />

              {/* Employer Job Posting Route */}
              {user.role === "employer" && (
                <Route
                  path="/employer-post-job"
                  element={
                    <JobPostingForm
                      onCancel={() => handleNavigate("dashboard/employer")}
                      onSave={async (jobData: any) => {
                        try {
                          if (!token) {
                            toast.error(
                              "Authentication token not found. Please login again.",
                            );
                            return;
                          }
                          const payload = {
                            ...jobData,
                            status: "pending", // Jobs need admin approval
                            featured: false,
                            views: 0,
                            applications: 0,
                            type: "hospital",
                          };
                          const createdJob = await createJob(payload);
                          const jobId = createdJob?.id;

                          // Upload PDF document if provided
                          if (jobId && jobData.pdfFile) {
                            try {
                              await uploadJobDocument(jobId, jobData.pdfFile);
                              console.log("Job document uploaded successfully");
                            } catch (uploadError: any) {
                              console.error(
                                "Error uploading job document:",
                                uploadError,
                              );
                              // Don't fail the whole operation, just log the error
                            }
                          }

                          // Upload image if provided
                          if (jobId && jobData.imageFile) {
                            try {
                              await uploadJobImage(jobId, jobData.imageFile);
                              console.log("Job image uploaded successfully");
                            } catch (uploadError: any) {
                              console.error(
                                "Error uploading job image:",
                                uploadError,
                              );
                              // Don't fail the whole operation, just log the error
                            }
                          }

                          toast.success("Job created successfully!");
                          handleNavigate("dashboard/employer");
                        } catch (e: any) {
                          console.error("Error creating job:", e);
                          console.error("Error details:", {
                            message: e.message,
                            response: e.response?.data,
                            status: e.response?.status,
                          });
                          let errorMessage =
                            "Failed to create job. Please try again.";
                          if (e.response?.data?.error) {
                            errorMessage = e.response.data.error;
                            // If it's an authentication error, redirect to login
                            if (
                              e.response.status === 401 ||
                              e.response.status === 403
                            ) {
                              if (
                                errorMessage.includes("Unauthorized") ||
                                errorMessage.includes("login")
                              ) {
                                toast.error(
                                  "Your session has expired. Please login again.",
                                );
                                handleNavigate("logout");
                                return;
                              }
                            }
                          } else if (e.message) {
                            errorMessage = e.message;
                          }
                          toast.error(`Error creating job: ${errorMessage}`);
                        }
                      }}
                    />
                  }
                />
              )}

              {/* Admin Routes */}
              <Route
                path="/dashboard/admin"
                element={<AdminDashboard onNavigate={handleNavigate} />}
              />
              <Route
                path="/admin-jobs"
                element={<AdminJobManagementPage onNavigate={handleNavigate} />}
              />
              <Route
                path="/admin-ai-bulk-upload"
                element={<AiBulkJobUploader onNavigate={handleNavigate} />}
              />
              <Route
                path="/admin/jobs/edit/:jobId"
                element={<EditJobPage onNavigate={handleNavigate} />}
              />
              <Route
                path="/admin-news"
                element={
                  <AdminNewsManagementPage onNavigate={handleNavigate} />
                }
              />
              <Route
                path="/admin-pricing"
                element={<AdminPricingManagement onNavigate={handleNavigate} />}
              />
              <Route
                path="/admin-post-job"
                element={
                  <JobPostingForm
                    onCancel={() => handleNavigate("admin-jobs")}
                    onSave={async (jobData: any) => {
                      try {
                        if (!token) {
                          toast.error(
                            "Authentication token not found. Please login again.",
                          );
                          return;
                        }
                        const payload = {
                          ...jobData,
                          status: jobData.status || "active",
                          featured: jobData.featured || false,
                          views: jobData.views || 0,
                          applications: jobData.applications || 0,
                          type: "hospital",
                        };
                        // Use admin API for job creation (no subscription required)
                        const createdJob = await createAdminJob(payload);
                        const jobId = createdJob?.id;

                        // Upload PDF document if provided
                        if (jobId && jobData.pdfFile) {
                          try {
                            await uploadJobDocument(jobId, jobData.pdfFile);
                            console.log("Job document uploaded successfully");
                          } catch (uploadError: any) {
                            console.error(
                              "Error uploading job document:",
                              uploadError,
                            );
                          }
                        }

                        // Upload image if provided
                        if (jobId && jobData.imageFile) {
                          try {
                            await uploadJobImage(jobId, jobData.imageFile);
                            console.log("Job image uploaded successfully");
                          } catch (uploadError: any) {
                            console.error(
                              "Error uploading job image:",
                              uploadError,
                            );
                          }
                        }

                        toast.success("Job created successfully!");
                        handleNavigate("admin-jobs");
                      } catch (e: any) {
                        console.error("Error creating job:", e);
                        const errorMsg =
                          e?.error || e?.message || "Unknown error";
                        toast.error(`Error creating job: ${errorMsg}`);
                      }
                    }}
                  />
                }
              />
              <Route
                path="/profile"
                element={<ProfilePage onNavigate={handleNavigate} />}
              />
              <Route
                path="/admin-users"
                element={<AdminUsersPage onNavigate={handleNavigate} />}
              />
              <Route
                path="/admin-employer-verification"
                element={
                  <EmployerVerificationPage onNavigate={handleNavigate} />
                }
              />
              <Route
                path="/employer-management/:employerId"
                element={
                  <EmployerManagementPageWrapper onNavigate={handleNavigate} />
                }
              />
              <Route
                path="/admin-applications"
                element={
                  isAuthenticated && user && user.role === "admin" ? (
                    <AdminApplications
                      onNavigate={handleNavigate}
                      userRole="admin"
                    />
                  ) : (
                    <AuthPage mode="login" onNavigate={handleNavigate} />
                  )
                }
              />
              <Route
                path="/employer-manage-applications"
                element={
                  isAuthenticated &&
                  user &&
                  (user.role === "employer" || user.role === "admin") ? (
                    <AdminApplications
                      onNavigate={handleNavigate}
                      userRole="employer"
                    />
                  ) : (
                    <AuthPage mode="login" onNavigate={handleNavigate} />
                  )
                }
              />
              <Route
                path="/analytics"
                element={
                  <AnalyticsDashboard userRole={user.role} userId={user.id} />
                }
              />
            </>
          )}
        </Routes>
      </main>
      <Footer onNavigate={handleNavigate} />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
      <Toaster position="top-right" richColors />
    </BrowserRouter>
  );
}
