import { useState, useEffect } from "react";
import {
  CheckCircle,
  XCircle,
  Clock,
  Building2,
  User,
  Mail,
  FileText,
  Eye,
  Upload,
  ExternalLink,
  MapPin,
  Phone,
} from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Input } from "./ui/input";
import { useAuth } from "../contexts/AuthContext";
import {
  fetchEmployers,
  updateEmployerVerificationStatus,
  uploadEmployerDocument,
} from "../api/employers";

interface EmployerVerificationPageProps {
  onNavigate: (page: string) => void;
}

interface EmployerRequest {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  website?: string;
  companyType: "private" | "government" | "ngo";
  verificationStatus: "pending" | "approved" | "rejected";
  submittedDate: string;
  documents: string[];
  notes?: string;
}

export function EmployerVerificationPage({
  onNavigate,
}: EmployerVerificationPageProps) {
  const { user, token } = useAuth();
  const [employers, setEmployers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployer, setSelectedEmployer] = useState<any | null>(null);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [reviewNotes, setReviewNotes] = useState("");
  const [reviewAction, setReviewAction] = useState<"approved" | "rejected">(
    "approved",
  );
  const [uploadingDocument, setUploadingDocument] = useState(false);

  useEffect(() => {
    loadEmployers();
  }, []);

  const loadEmployers = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetchEmployers({}, token);
      // Map backend response to frontend format
      const mappedEmployers = (response.employers || []).map((emp: any) => ({
        id: emp.id,
        companyName: emp.companyName || "N/A",
        userName: emp.userName || "N/A",
        userEmail: emp.userEmail || "N/A",
        companyType: emp.companyType || "hospital",
        verificationStatus: emp.verificationStatus || "pending",
        createdAt: emp.createdAt || new Date().toISOString(),
        verificationNotes: emp.verificationNotes || "",
        website: emp.website || "",
        address: emp.address || "",
        city: emp.city || "",
        state: emp.state || "",
        pincode: emp.pincode || "",
        contactPerson: emp.contactPerson || emp.userName || "N/A",
        designation: emp.designation || "",
        contactPhone: emp.contactPhone || "N/A",
        documentUrl: emp.documentUrl || "",
      }));
      setEmployers(mappedEmployers);
    } catch (error: any) {
      console.error("Failed to load employers:", error);
      // Show error but don't use mock data
      setEmployers([]);
      alert("Failed to load employers. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  };

  const handleReview = (employer: any, action: "approved" | "rejected") => {
    setSelectedEmployer(employer);
    setReviewAction(action);
    setReviewNotes("");
    setIsReviewDialogOpen(true);
  };

  const submitReview = async () => {
    if (!selectedEmployer || !token) return;

    try {
      await updateEmployerVerificationStatus(
        selectedEmployer.id,
        reviewAction,
        token,
        reviewNotes,
      );

      // Reload employers to get updated status
      await loadEmployers();

      setIsReviewDialogOpen(false);
      setSelectedEmployer(null);
      setReviewNotes("");
      const actionText = reviewAction === "approved" ? "approved" : "rejected";
      alert(`Employer verification ${actionText} successfully!`);
    } catch (error: any) {
      console.error("Failed to update verification status:", error);
      const actionText = reviewAction === "approved" ? "approve" : "reject";
      const errorMessage =
        error.message || "Unknown error occurred. Please try again.";
      alert(`Failed to ${actionText} employer: ${errorMessage}`);
      // Keep dialog open so user can try again
    }
  };

  const handleDocumentUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file || !selectedEmployer || !token) return;

    try {
      setUploadingDocument(true);
      await uploadEmployerDocument(selectedEmployer.id, file, token);
      // Could show success message here
    } catch (error) {
      console.error("Failed to upload document:", error);
    } finally {
      setUploadingDocument(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case "approved":
        return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
      case "rejected":
        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getCompanyTypeBadge = (type: string) => {
    switch (type) {
      case "private":
        return <Badge className="bg-blue-100 text-blue-800">Private</Badge>;
      case "government":
        return (
          <Badge className="bg-purple-100 text-purple-800">Government</Badge>
        );
      case "ngo":
        return <Badge className="bg-green-100 text-green-800">NGO</Badge>;
      default:
        return <Badge>{type}</Badge>;
    }
  };

  const pendingEmployers = employers.filter(
    (emp) => emp.verificationStatus === "pending",
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading employers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl text-gray-900 mb-2">
              Employer Verification
            </h1>
            <p className="text-gray-600">
              Review and approve employer verification requests
            </p>
          </div>
          <Button variant="outline" onClick={() => onNavigate("dashboard")}>
            Back to Dashboard
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center">
              <Clock className="w-8 h-8 text-yellow-600 mr-4" />
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {pendingEmployers.length}
                </p>
                <p className="text-gray-600">Pending Reviews</p>
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center">
              <CheckCircle className="w-8 h-8 text-green-600 mr-4" />
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {
                    employers.filter(
                      (emp) => emp.verificationStatus === "approved",
                    ).length
                  }
                </p>
                <p className="text-gray-600">Approved</p>
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center">
              <XCircle className="w-8 h-8 text-red-600 mr-4" />
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {
                    employers.filter(
                      (emp) => emp.verificationStatus === "rejected",
                    ).length
                  }
                </p>
                <p className="text-gray-600">Rejected</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Employers Table */}
        <Card>
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">
              Verification Requests
            </h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employers.map((employer) => (
                  <TableRow key={employer.id}>
                    <TableCell>
                      <div>
                        <p className="font-semibold text-slate-900">{employer.companyName}</p>
                        {employer.website && (
                          <a
                            href={employer.website.startsWith('http') ? employer.website : `https://${employer.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-0.5"
                          >
                            {employer.website} <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                        {[employer.city, employer.state].filter(Boolean).length > 0 && (
                          <span className="text-[11px] text-slate-400 block mt-0.5">
                            {[employer.city, employer.state].filter(Boolean).join(', ')}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-slate-800">
                          {employer.contactPerson}
                          {employer.designation ? (
                            <span className="text-xs font-normal text-slate-500"> ({employer.designation})</span>
                          ) : null}
                        </p>
                        <p className="text-xs text-slate-500">{employer.userEmail}</p>
                        {employer.contactPhone && employer.contactPhone !== 'N/A' && (
                          <p className="text-xs text-slate-600 font-mono mt-0.5">{employer.contactPhone}</p>
                        )}
                        {employer.documentUrl && (
                          <a
                            href={employer.documentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 underline mt-1"
                          >
                            <FileText className="w-3 h-3" /> View Proof Document <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getCompanyTypeBadge(employer.companyType)}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(employer.verificationStatus)}
                    </TableCell>
                    <TableCell>
                      {new Date(employer.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {employer.verificationStatus === "pending" ? (
                          // PENDING: Show Approve and Reject
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleReview(employer, "approved")}
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleReview(employer, "rejected")}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Reject
                            </Button>
                          </>
                        ) : employer.verificationStatus === "approved" ? (
                          // APPROVED: Show View button
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              onNavigate(`employer-management/${employer.id}`)
                            }
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* Review Dialog */}
        <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
          <DialogContent className="sm:max-w-[550px]">
            <DialogHeader>
              <DialogTitle>
                {reviewAction === "approved" ? "Approve" : "Reject"}{" "}
                Verification Request
              </DialogTitle>
            </DialogHeader>

            {selectedEmployer && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-400 block">Organisation:</span>
                    <strong className="text-slate-900">{selectedEmployer.companyName}</strong> ({selectedEmployer.companyType})
                  </div>
                  <div>
                    <span className="text-slate-400 block">Contact Person:</span>
                    <strong className="text-slate-900">{selectedEmployer.contactPerson}</strong>
                    {selectedEmployer.designation && ` — ${selectedEmployer.designation}`}
                  </div>
                  <div>
                    <span className="text-slate-400 block">Work Email:</span>
                    <span className="text-slate-900">{selectedEmployer.userEmail}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Mobile Phone:</span>
                    <span className="text-slate-900">{selectedEmployer.contactPhone || '—'}</span>
                  </div>
                  {[selectedEmployer.address, selectedEmployer.city, selectedEmployer.state, selectedEmployer.pincode].filter(Boolean).length > 0 && (
                    <div className="col-span-2">
                      <span className="text-slate-400 block">Official Address:</span>
                      <span className="text-slate-900">
                        {[selectedEmployer.address, selectedEmployer.city, selectedEmployer.state, selectedEmployer.pincode].filter(Boolean).join(', ')}
                      </span>
                    </div>
                  )}
                  {selectedEmployer.documentUrl && (
                    <div className="col-span-2 pt-1 border-t border-slate-200">
                      <span className="text-slate-400 block">Verification Proof Document:</span>
                      <a
                        href={selectedEmployer.documentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 font-bold text-blue-600 hover:text-blue-800 underline mt-0.5"
                      >
                        <FileText className="w-3.5 h-3.5" /> Open / Review Document <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <Label htmlFor="reviewNotes">Review Notes (Optional)</Label>
                <Textarea
                  id="reviewNotes"
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder={`Add any notes about this ${reviewAction} decision...`}
                  rows={3}
                />
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={submitReview}
                  className={`flex-1 ${
                    reviewAction === "approved"
                      ? "bg-green-600 hover:bg-green-700 text-white"
                      : "bg-red-600 hover:bg-red-700 text-white"
                  }`}
                >
                  Confirm {reviewAction === "approved" ? "Approval" : "Rejection"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsReviewDialogOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
