import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { JobPostingForm } from "./JobPostingForm";
import {
  getJobById,
  updateJob,
  uploadJobDocument,
  uploadJobImage,
} from "../api/jobs";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";

interface EditJobPageProps {
  onNavigate: (page: string) => void;
}

export function EditJobPage({ onNavigate }: EditJobPageProps) {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { token, user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobData, setJobData] = useState<any>(null);

  useEffect(() => {
    const fetchJob = async () => {
      if (!jobId) {
        setError("No job ID provided");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const data = await getJobById(jobId);

        // Transform backend response to match form data structure
        setJobData({
          title: data.title || "",
          organization: data.organization || "",
          sector: data.sector || "private",
          category: data.category || "Medical Officer",
          location: data.location || "",
          qualification: data.qualification || "",
          experience: data.experience || "",
          experienceLevel: data.experienceLevel || "entry",
          speciality: data.speciality || "",
          dutyType: data.dutyType || "full_time",
          numberOfPosts: data.numberOfPosts || 1,
          salary: data.salary || "",
          description: data.description || "",
          lastDate: data.lastDate || "",
          requirements: data.requirements || "",
          benefits: data.benefits || "",
          contactEmail: data.contactEmail || "",
          contactPhone: data.contactPhone || "",
          pdfUrl: data.pdfUrl || "",
          jobDocumentUrl: data.jobDocumentUrl || "",
          jobImageUrl: data.jobImageUrl || "",
          applyLink: data.applyLink || "",
          status: data.status || "pending",
          featured: data.featured || false,
          views: data.views || 0,
          applications: data.applications || 0,
        });
      } catch (e: any) {
        console.error("Error fetching job:", e);
        setError(
          e.response?.data?.error || e.message || "Failed to load job details",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchJob();
  }, [jobId]);

  const handleSave = async (formData: any) => {
    if (!jobId || !token) {
      toast.error("Authentication required. Please login again.");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        ...formData,
        status: formData.status || jobData?.status || "pending",
        featured: formData.featured ?? jobData?.featured ?? false,
        views: jobData?.views || 0,
        applications: jobData?.applications || 0,
        type: "hospital",
      };

      await updateJob(jobId, payload);

      // Upload PDF document if provided
      if (formData.pdfFile) {
        try {
          await uploadJobDocument(jobId, formData.pdfFile);
          console.log("Job document uploaded successfully");
        } catch (uploadError: any) {
          console.error("Error uploading job document:", uploadError);
        }
      }

      // Upload image if provided
      if (formData.imageFile) {
        try {
          await uploadJobImage(jobId, formData.imageFile);
          console.log("Job image uploaded successfully");
        } catch (uploadError: any) {
          console.error("Error uploading job image:", uploadError);
        }
      }

      toast.success("Job updated successfully!");

      // Navigate back to appropriate dashboard
      if (user?.role === "employer") {
        navigate("/dashboard/employer");
      } else {
        navigate("/admin-jobs");
      }
    } catch (e: any) {
      console.error("Error updating job:", e);
      const errorMessage =
        e.response?.data?.error || e.message || "Failed to update job";
      toast.error(`Error: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (user?.role === "employer") {
      navigate("/dashboard/employer");
    } else {
      navigate("/admin-jobs");
    }
  };

  // Check if user is admin or employer
  if (!user || (user.role !== "admin" && user.role !== "employer")) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="p-6 md:p-8 text-center max-w-md w-full">
          <h2 className="text-xl font-semibold text-red-600 mb-4">
            Access Denied
          </h2>
          <p className="text-gray-600 mb-4">
            You don't have permission to edit jobs. Please login with an admin or employer account.
          </p>
          <Button onClick={() => navigate("/login")} className="w-full">Login</Button>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading job details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <Button variant="outline" onClick={handleCancel} className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Jobs
          </Button>
          <Card className="p-8 text-center">
            <h2 className="text-xl font-semibold text-red-600 mb-4">
              Error Loading Job
            </h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={handleCancel}>Go Back</Button>
          </Card>
        </div>
      </div>
    );
  }

  if (!jobData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <Button variant="outline" onClick={handleCancel} className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Jobs
          </Button>
          <Card className="p-8 text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Job Not Found
            </h2>
            <p className="text-gray-600 mb-4">
              The job you're looking for doesn't exist or has been deleted.
            </p>
            <Button onClick={handleCancel}>Go Back</Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Edit Job</h1>
            <p className="text-gray-600">Update job posting: {jobData.title}</p>
          </div>
          <Button variant="outline" onClick={handleCancel}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Cancel
          </Button>
        </div>

        {/* Job Form with initial data */}
        <JobPostingForm
          onCancel={handleCancel}
          onSave={handleSave}
          initialData={jobData}
        />

        {saving && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="p-6 flex items-center gap-4">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              <span>Saving changes...</span>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
