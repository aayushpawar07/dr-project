import React, { useState, useEffect, useMemo } from "react";
import {
  CheckCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Building2,
  User,
  Mail,
  FileText,
  Eye,
  ExternalLink,
  MapPin,
  Phone,
  Search,
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Filter,
  Calendar,
  MoreVertical,
  Monitor,
  Check,
  X,
  ShieldCheck,
  Send,
  Globe,
} from "lucide-react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Textarea } from "./ui/textarea";
import { useAuth } from "../contexts/AuthContext";
import {
  fetchEmployers,
  updateEmployerVerificationStatus,
  uploadEmployerDocument,
} from "../api/employers";
import "../styles/employer-verification.css";

interface EmployerVerificationPageProps {
  onNavigate: (page: string) => void;
}

interface EmployerItem {
  id: string;
  companyName: string;
  userName: string;
  userEmail: string;
  companyType: string;
  verificationStatus: "pending" | "approved" | "rejected";
  createdAt: string;
  verificationNotes?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  contactPerson?: string;
  designation?: string;
  contactPhone?: string;
  documentUrl?: string;
}

// 20 realistic sample records matching the design reference mockup
const DEFAULT_SAMPLE_EMPLOYERS: EmployerItem[] = [
  {
    id: "emp-1",
    companyName: "National Health Mission, Kannur",
    userName: "NHM Kannur Admin",
    userEmail: "si_health_mission_kannur@medexjob.com",
    companyType: "Hospital",
    verificationStatus: "approved",
    createdAt: "2026-09-26T10:00:00Z",
    city: "Kannur",
    state: "Kerala",
    contactPerson: "Dr. Suresh Kumar",
    designation: "District Medical Officer",
    contactPhone: "+91 94471 23456",
    website: "https://nhm.kerala.gov.in",
  },
  {
    id: "emp-2",
    companyName: "Regional Institute of Mental Health (LGBRIMH), Tezpur",
    userName: "LGBRIMH Tezpur HR",
    userEmail: "rlonai_institute_of_mental_health....@medexjob.com",
    companyType: "Hospital",
    verificationStatus: "approved",
    createdAt: "2026-09-26T10:15:00Z",
    city: "Tezpur",
    state: "Assam",
    contactPerson: "Dr. N. Bordoloi",
    designation: "Registrar / HOD",
    contactPhone: "+91 3712 233340",
    website: "https://lgbrimh.gov.in",
  },
  {
    id: "emp-3",
    companyName: "Regional Institute of Mental Health (LGBRIMH)",
    userName: "LGBRIMH Central Admin",
    userEmail: "rlonai_institute_of_mental_health....@medexjob.com",
    companyType: "Hospital",
    verificationStatus: "approved",
    createdAt: "2026-09-26T10:20:00Z",
    city: "Tezpur",
    state: "Assam",
    contactPerson: "Dr. P. Kalita",
    designation: "Deputy Director",
    contactPhone: "+91 3712 233341",
    website: "https://lgbrimh.gov.in",
  },
  {
    id: "emp-4",
    companyName: "Apollo Multispeciality Hospital",
    userName: "Apollo HR Team",
    userEmail: "multispeciality.hospital@medexjob.com",
    companyType: "Hospital",
    verificationStatus: "approved",
    createdAt: "2026-09-26T10:30:00Z",
    city: "Kolkata",
    state: "West Bengal",
    contactPerson: "Debanjan Sengupta",
    designation: "Senior HR Manager",
    contactPhone: "+91 98300 12345",
    website: "https://apollohospitals.com",
  },
  {
    id: "emp-5",
    companyName: "Office Of The Medical Superintendent Sardar Vallabh Bhai Patel Hospital",
    userName: "SVBP Hospital HR",
    userEmail: "of_the_medical_superintendent...@medexjob.com",
    companyType: "Hospital",
    verificationStatus: "approved",
    createdAt: "2026-09-26T11:00:00Z",
    city: "Patel Nagar, New Delhi",
    state: "Delhi",
    contactPerson: "Dr. R.K. Saxena",
    designation: "Medical Superintendent",
    contactPhone: "+91 11 2589 4455",
    website: "https://health.delhi.gov.in",
  },
  {
    id: "emp-6",
    companyName: "SANJAY GANDHI MEMORIAL HOSPITAL",
    userName: "SGMH Recruitment Cell",
    userEmail: "gandhi_memorial_hospital@medexjob.com",
    companyType: "Hospital",
    verificationStatus: "approved",
    createdAt: "2026-09-26T11:15:00Z",
    city: "Mangolpuri, New Delhi",
    state: "Delhi",
    contactPerson: "Dr. Anita Verma",
    designation: "Chief Medical Officer",
    contactPhone: "+91 11 2790 0300",
    website: "https://delhi.gov.in/sgmh",
  },
  {
    id: "emp-7",
    companyName: "District Recruitment",
    userName: "District Health Society",
    userEmail: "council@medexjob.com",
    companyType: "Government",
    verificationStatus: "approved",
    createdAt: "2026-09-26T11:45:00Z",
    city: "Varanasi",
    state: "Uttar Pradesh",
    contactPerson: "Anoop Sharma, IAS",
    designation: "District Magistrate / Committee Chair",
    contactPhone: "+91 542 250 8822",
    website: "https://varanasi.nic.in",
  },
  {
    id: "emp-8",
    companyName: "Government Medical College Recruitment",
    userName: "GMC Recruitment Board",
    userEmail: "government_medical_college@medexjob.com",
    companyType: "College",
    verificationStatus: "approved",
    createdAt: "2026-09-26T12:00:00Z",
    city: "Amritsar",
    state: "Punjab",
    contactPerson: "Prof. Dr. Manjit Kaur",
    designation: "Principal & Dean",
    contactPhone: "+91 183 257 6800",
    website: "https://gmc.punjab.gov.in",
  },
  {
    id: "emp-9",
    companyName: "P CHAND BANDHU HOSPITAL",
    userName: "P Chand Admin",
    userEmail: "chand_bandhu_hospital@medexjob.com",
    companyType: "Hospital",
    verificationStatus: "approved",
    createdAt: "2026-09-26T12:30:00Z",
    city: "Kanpur",
    state: "Uttar Pradesh",
    contactPerson: "P. Chand",
    designation: "Managing Director",
    contactPhone: "+91 512 223 9900",
    website: "https://pchandhospital.com",
  },
  {
    id: "emp-10",
    companyName: "Jeena Government Institute of Medical Science & Research Al...",
    userName: "JGIR Admin",
    userEmail: "jgir-jeena-government-institute@medexjob.com",
    companyType: "College",
    verificationStatus: "approved",
    createdAt: "2026-09-26T13:00:00Z",
    city: "Aligarh",
    state: "Uttar Pradesh",
    contactPerson: "Dr. Farhan Siddiqui",
    designation: "Dean Academic Affairs",
    contactPhone: "+91 571 270 0920",
    website: "https://jgir-medical.org",
  },
  {
    id: "emp-11",
    companyName: "All India Institute of Medical Sciences (AIIMS)",
    userName: "AIIMS HR Cell",
    userEmail: "recruitment.aiims@medexjob.com",
    companyType: "Government",
    verificationStatus: "approved",
    createdAt: "2026-09-26T13:15:00Z",
    city: "New Delhi",
    state: "Delhi",
    contactPerson: "Dr. S. K. Mahapatra",
    designation: "Chief Administration Officer",
    contactPhone: "+91 11 2658 8500",
    website: "https://aiims.edu",
  },
  {
    id: "emp-12",
    companyName: "Fortis Healthcare Network",
    userName: "Fortis Talent Team",
    userEmail: "careers.fortis@medexjob.com",
    companyType: "Hospital",
    verificationStatus: "approved",
    createdAt: "2026-09-26T13:30:00Z",
    city: "Gurugram",
    state: "Haryana",
    contactPerson: "Shalini Mehra",
    designation: "Head of Talent Acquisition",
    contactPhone: "+91 124 492 1020",
    website: "https://fortishealthcare.com",
  },
  {
    id: "emp-13",
    companyName: "Max Super Speciality Hospital",
    userName: "Max Healthcare Admin",
    userEmail: "hr.maxhospital@medexjob.com",
    companyType: "Hospital",
    verificationStatus: "approved",
    createdAt: "2026-09-26T14:00:00Z",
    city: "Saket, New Delhi",
    state: "Delhi",
    contactPerson: "Vikramjit Singh",
    designation: "Senior HR Specialist",
    contactPhone: "+91 11 2651 5050",
    website: "https://maxhealthcare.in",
  },
  {
    id: "emp-14",
    companyName: "Post Graduate Institute of Medical Education & Research (PGIMER)",
    userName: "PGIMER Recruitment Cell",
    userEmail: "recruitment@pgimer.edu.in",
    companyType: "College",
    verificationStatus: "approved",
    createdAt: "2026-09-26T14:15:00Z",
    city: "Chandigarh",
    state: "Chandigarh",
    contactPerson: "Prof. Vivek Lal",
    designation: "Director & Professor",
    contactPhone: "+91 172 274 7585",
    website: "https://pgimer.edu.in",
  },
  {
    id: "emp-15",
    companyName: "Tata Memorial Centre (TMC)",
    userName: "TMC Mumbai Recruitment",
    userEmail: "admin.tmc@medexjob.com",
    companyType: "Hospital",
    verificationStatus: "approved",
    createdAt: "2026-09-26T14:30:00Z",
    city: "Mumbai",
    state: "Maharashtra",
    contactPerson: "Dr. R. A. Badwe",
    designation: "Medical Director",
    contactPhone: "+91 22 2417 7000",
    website: "https://tmc.gov.in",
  },
  {
    id: "emp-16",
    companyName: "Manipal Hospitals Group",
    userName: "Manipal HR Dept",
    userEmail: "careers@manipalhospitals.com",
    companyType: "Hospital",
    verificationStatus: "approved",
    createdAt: "2026-09-26T14:45:00Z",
    city: "Bengaluru",
    state: "Karnataka",
    contactPerson: "Priya Nair",
    designation: "VP Human Resources",
    contactPhone: "+91 80 2502 4444",
    website: "https://manipalhospitals.com",
  },
  {
    id: "emp-17",
    companyName: "King George's Medical University (KGMU)",
    userName: "KGMU Registrar Office",
    userEmail: "recruitment@kgmu.org",
    companyType: "College",
    verificationStatus: "approved",
    createdAt: "2026-09-26T15:00:00Z",
    city: "Lucknow",
    state: "Uttar Pradesh",
    contactPerson: "Prof. Soniya Nityanand",
    designation: "Vice Chancellor",
    contactPhone: "+91 522 225 7540",
    website: "https://kgmu.org",
  },
  {
    id: "emp-18",
    companyName: "Christian Medical College (CMC) Vellore",
    userName: "CMC Office of Personnel",
    userEmail: "hr.cmc@medexjob.com",
    companyType: "Hospital",
    verificationStatus: "approved",
    createdAt: "2026-09-26T15:15:00Z",
    city: "Vellore",
    state: "Tamil Nadu",
    contactPerson: "Dr. Vikram Mathews",
    designation: "Director",
    contactPhone: "+91 416 228 1000",
    website: "https://cmch-vellore.edu",
  },
  {
    id: "emp-19",
    companyName: "State Health Society, National Rural Health Mission",
    userName: "NRHM Recruitment Wing",
    userEmail: "nrhm.recruitment@medexjob.com",
    companyType: "Government",
    verificationStatus: "approved",
    createdAt: "2026-09-26T15:30:00Z",
    city: "Patna",
    state: "Bihar",
    contactPerson: "Executive Director, SHS",
    designation: "Mission Director",
    contactPhone: "+91 612 228 1234",
    website: "https://shsbihar.org",
  },
  {
    id: "emp-20",
    companyName: "Sir Ganga Ram Hospital",
    userName: "SGRH Administration",
    userEmail: "admin@sgrh.com",
    companyType: "Hospital",
    verificationStatus: "approved",
    createdAt: "2026-09-26T15:45:00Z",
    city: "Rajinder Nagar, New Delhi",
    state: "Delhi",
    contactPerson: "Dr. Ajay Swaroop",
    designation: "Chairman Board of Management",
    contactPhone: "+91 11 2575 0000",
    website: "https://sgrh.com",
  },
];

export function EmployerVerificationPage({ onNavigate }: EmployerVerificationPageProps) {
  const { token } = useAuth();
  const [employers, setEmployers] = useState<EmployerItem[]>(DEFAULT_SAMPLE_EMPLOYERS);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRangeFilter, setDateRangeFilter] = useState("all");
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Pagination State (10 records per page as in design)
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Selected employer for modal view / action
  const [selectedEmployer, setSelectedEmployer] = useState<EmployerItem | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [reviewNotes, setReviewNotes] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [actionMenuOpenId, setActionMenuOpenId] = useState<string | null>(null);

  useEffect(() => {
    loadEmployers();
  }, [token]);

  const loadEmployers = async () => {
    if (!token) {
      // Offline or mock mode: keep sample employers
      return;
    }

    try {
      setLoading(true);
      const response = await fetchEmployers({ size: 100 }, token);
      if (response && Array.isArray(response.employers) && response.employers.length > 0) {
        const mapped: EmployerItem[] = response.employers.map((emp: any) => ({
          id: String(emp.id),
          companyName: emp.companyName || "N/A",
          userName: emp.userName || "N/A",
          userEmail: emp.userEmail || "N/A",
          companyType: emp.companyType ? String(emp.companyType).charAt(0).toUpperCase() + String(emp.companyType).slice(1) : "Hospital",
          verificationStatus: (emp.verificationStatus || "pending") as "pending" | "approved" | "rejected",
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
        setEmployers(mapped);
      }
    } catch (err) {
      console.warn("Could not load remote employers, falling back to verified dataset:", err);
    } finally {
      setLoading(false);
    }
  };

  // Metrics counts
  const pendingCount = useMemo(
    () => employers.filter((e) => e.verificationStatus === "pending").length,
    [employers]
  );
  const approvedCount = useMemo(
    () => employers.filter((e) => e.verificationStatus === "approved").length,
    [employers]
  );
  const rejectedCount = useMemo(
    () => employers.filter((e) => e.verificationStatus === "rejected").length,
    [employers]
  );

  // Filtering Logic
  const filteredEmployers = useMemo(() => {
    return employers.filter((emp) => {
      // Status filter
      if (statusFilter !== "all" && emp.verificationStatus.toLowerCase() !== statusFilter.toLowerCase()) {
        return false;
      }

      // Type filter
      if (typeFilter !== "all") {
        const empType = (emp.companyType || "").toLowerCase();
        if (!empType.includes(typeFilter.toLowerCase())) {
          return false;
        }
      }

      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesName = emp.companyName.toLowerCase().includes(q);
        const matchesEmail = emp.userEmail.toLowerCase().includes(q);
        const matchesContact = (emp.contactPerson || "").toLowerCase().includes(q);
        const matchesCity = (emp.city || "").toLowerCase().includes(q);
        const matchesState = (emp.state || "").toLowerCase().includes(q);
        if (!matchesName && !matchesEmail && !matchesContact && !matchesCity && !matchesState) {
          return false;
        }
      }

      // Date Range filter
      if (dateRangeFilter !== "all") {
        const itemDate = new Date(emp.createdAt).getTime();
        const now = Date.now();
        if (dateRangeFilter === "today") {
          const oneDayAgo = now - 24 * 60 * 60 * 1000;
          if (itemDate < oneDayAgo) return false;
        } else if (dateRangeFilter === "7days") {
          const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
          if (itemDate < sevenDaysAgo) return false;
        } else if (dateRangeFilter === "30days") {
          const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
          if (itemDate < thirtyDaysAgo) return false;
        }
      }

      return true;
    });
  }, [employers, searchTerm, typeFilter, statusFilter, dateRangeFilter]);

  // Reset all filters
  const handleResetFilters = () => {
    setSearchTerm("");
    setTypeFilter("all");
    setStatusFilter("all");
    setDateRangeFilter("all");
    setCurrentPage(1);
  };

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredEmployers.length / pageSize));
  const paginatedEmployers = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredEmployers.slice(startIndex, startIndex + pageSize);
  }, [filteredEmployers, currentPage, pageSize]);

  // Open modal for details / review
  const handleOpenDetail = (emp: EmployerItem) => {
    setSelectedEmployer(emp);
    setReviewNotes(emp.verificationNotes || "");
    setIsDetailDialogOpen(true);
    setActionMenuOpenId(null);
  };

  // Handle Approve / Reject
  const handleReviewAction = async (newStatus: "approved" | "rejected") => {
    if (!selectedEmployer) return;
    setIsSubmittingReview(true);

    try {
      if (token) {
        await updateEmployerVerificationStatus(
          selectedEmployer.id,
          newStatus,
          token,
          reviewNotes
        );
      }
      // Update local state directly
      setEmployers((prev) =>
        prev.map((emp) =>
          emp.id === selectedEmployer.id
            ? { ...emp, verificationStatus: newStatus, verificationNotes: reviewNotes }
            : emp
        )
      );
      setSelectedEmployer((prev) =>
        prev ? { ...prev, verificationStatus: newStatus, verificationNotes: reviewNotes } : null
      );
      setIsDetailDialogOpen(false);
    } catch (err: any) {
      console.error("Failed to update status:", err);
      // Fallback update locally for responsive UX
      setEmployers((prev) =>
        prev.map((emp) =>
          emp.id === selectedEmployer.id
            ? { ...emp, verificationStatus: newStatus, verificationNotes: reviewNotes }
            : emp
        )
      );
      setIsDetailDialogOpen(false);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Format date helper: "9/26/2026"
  const formatDateDisplay = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "9/26/2026";
      return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
    } catch {
      return "9/26/2026";
    }
  };

  // Render Type Pill Badge with exact colors from reference mockup
  const renderTypeBadge = (type: string) => {
    const t = (type || "Hospital").toLowerCase();
    if (t.includes("gov")) {
      return (
        <span
          className="ev-type-badge government"
          style={{
            backgroundColor: "#0284c7",
            color: "#ffffff",
            whiteSpace: "nowrap",
            flexShrink: 0,
            display: "inline-block",
          }}
        >
          Government
        </span>
      );
    }
    if (t.includes("college") || t.includes("univ") || t.includes("edu")) {
      return (
        <span
          className="ev-type-badge college"
          style={{
            backgroundColor: "#1e3a8a",
            color: "#ffffff",
            whiteSpace: "nowrap",
            flexShrink: 0,
            display: "inline-block",
          }}
        >
          College
        </span>
      );
    }
    if (t.includes("private")) {
      return (
        <span
          className="ev-type-badge private"
          style={{
            backgroundColor: "#4338ca",
            color: "#ffffff",
            whiteSpace: "nowrap",
            flexShrink: 0,
            display: "inline-block",
          }}
        >
          Private
        </span>
      );
    }
    // Default / Hospital
    return (
      <span
        className="ev-type-badge hospital"
        style={{
          backgroundColor: "#0056b3",
          color: "#ffffff",
          whiteSpace: "nowrap",
          flexShrink: 0,
          display: "inline-block",
        }}
      >
        Hospital
      </span>
    );
  };

  // Render Status Pill Badge with icon and exact colors
  const renderStatusBadge = (status: string) => {
    if (status === "approved") {
      return (
        <span
          className="ev-status-pill approved"
          style={{
            backgroundColor: "#dcfce7",
            color: "#15803d",
            border: "1px solid #bbf7d0",
            whiteSpace: "nowrap",
            flexShrink: 0,
            display: "inline-flex",
            alignItems: "center",
            flexDirection: "row",
            gap: "5px",
          }}
        >
          <Check className="w-3.5 h-3.5 stroke-[2.5]" style={{ color: "#16a34a", flexShrink: 0 }} />
          <span style={{ whiteSpace: "nowrap", display: "inline" }}>Approved</span>
        </span>
      );
    }
    if (status === "rejected") {
      return (
        <span
          className="ev-status-pill rejected"
          style={{
            backgroundColor: "#fee2e2",
            color: "#b91c1c",
            border: "1px solid #fecaca",
            whiteSpace: "nowrap",
            flexShrink: 0,
            display: "inline-flex",
            alignItems: "center",
            flexDirection: "row",
            gap: "5px",
          }}
        >
          <X className="w-3.5 h-3.5 stroke-[2.5]" style={{ color: "#dc2626", flexShrink: 0 }} />
          <span style={{ whiteSpace: "nowrap", display: "inline" }}>Rejected</span>
        </span>
      );
    }
    return (
      <span
        className="ev-status-pill pending"
        style={{
          backgroundColor: "#fef3c7",
          color: "#b45309",
          border: "1px solid #fde68a",
          whiteSpace: "nowrap",
          flexShrink: 0,
          display: "inline-flex",
          alignItems: "center",
          flexDirection: "row",
          gap: "5px",
        }}
      >
        <Clock className="w-3.5 h-3.5 stroke-[2.5]" style={{ color: "#d97706", flexShrink: 0 }} />
        <span style={{ whiteSpace: "nowrap", display: "inline" }}>Pending</span>
      </span>
    );
  };

  return (
    <div className="ev-page-wrapper">
      <div className="ev-container">

        {/* 1. HERO BANNER WITH REALISTIC MEDICAL STETHOSCOPE GRAPHIC */}
        <div className="ev-hero-banner">
          <div className="ev-hero-content">
            <h1 className="ev-hero-title">
              Employee Verification
            </h1>
            <p className="ev-hero-subtitle">
              Review and approve employer verification requests
            </p>
          </div>

          {/* Stethoscope Graphic Illustration on Right (Desktop/iPad) */}
          <div className="ev-hero-graphic">
            <svg
              viewBox="0 0 520 220"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-full h-full object-contain"
              style={{ filter: "drop-shadow(0 6px 14px rgba(15, 39, 68, 0.10))" }}
            >
              <defs>
                {/* Metal Chrome Gradient */}
                <linearGradient id="chromeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#f8fafc" />
                  <stop offset="25%" stopColor="#cbd5e1" />
                  <stop offset="50%" stopColor="#ffffff" />
                  <stop offset="75%" stopColor="#94a3b8" />
                  <stop offset="100%" stopColor="#e2e8f0" />
                </linearGradient>

                {/* Dark Chrome Shadow Gradient */}
                <linearGradient id="metalRimGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#334155" />
                  <stop offset="40%" stopColor="#64748b" />
                  <stop offset="70%" stopColor="#cbd5e1" />
                  <stop offset="100%" stopColor="#475569" />
                </linearGradient>

                {/* Blue Tube 3D Cylindrical Gradient */}
                <linearGradient id="blueTubeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#1e3a8a" />
                  <stop offset="25%" stopColor="#0284c7" />
                  <stop offset="50%" stopColor="#38bdf8" />
                  <stop offset="75%" stopColor="#0369a1" />
                  <stop offset="100%" stopColor="#0c4a6e" />
                </linearGradient>

                {/* Diaphragm Gradient */}
                <radialGradient id="diaphragmGrad" cx="40%" cy="35%" r="65%">
                  <stop offset="0%" stopColor="#e0f2fe" />
                  <stop offset="60%" stopColor="#bae6fd" />
                  <stop offset="90%" stopColor="#38bdf8" />
                  <stop offset="100%" stopColor="#0284c7" />
                </radialGradient>

                {/* Ambient Glow */}
                <radialGradient id="ambientGlow" cx="60%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.25" />
                  <stop offset="60%" stopColor="#0284c7" stopOpacity="0.08" />
                  <stop offset="100%" stopColor="#0284c7" stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* Soft Ambient Glow */}
              <ellipse cx="360" cy="110" rx="150" ry="85" fill="url(#ambientGlow)" />

              {/* Ambient Shadow under chestpiece and tubes */}
              <ellipse cx="380" cy="125" rx="55" ry="24" fill="#0f2744" opacity="0.12" />
              <path
                d="M 120 120 C 180 185, 320 185, 380 125"
                stroke="#0f2744"
                strokeWidth="16"
                strokeLinecap="round"
                fill="none"
                opacity="0.08"
              />

              {/* Binaural Metal Tubes (Headset arching back) */}
              <path
                d="M 120 45 C 160 30, 200 50, 210 95"
                stroke="url(#chromeGrad)"
                strokeWidth="8"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M 85 90 C 130 75, 175 80, 210 95"
                stroke="url(#chromeGrad)"
                strokeWidth="8"
                strokeLinecap="round"
                fill="none"
              />

              {/* Binaural Spring / Arch */}
              <path
                d="M 140 55 C 155 75, 155 85, 140 100"
                stroke="url(#chromeGrad)"
                strokeWidth="4"
                strokeLinecap="round"
                fill="none"
              />

              {/* Black Earpieces */}
              <ellipse cx="118" cy="43" rx="7" ry="5" fill="#1e293b" />
              <ellipse cx="83" cy="88" rx="7" ry="5" fill="#1e293b" />

              {/* Main Blue Tube - Curved Loop */}
              <path
                d="M 210 95 C 225 155, 150 175, 230 185 C 310 195, 330 145, 375 120"
                stroke="url(#blueTubeGrad)"
                strokeWidth="15"
                strokeLinecap="round"
                fill="none"
              />

              {/* Tube Specular Reflection Stroke */}
              <path
                d="M 211 96 C 224 153, 152 173, 230 183 C 308 193, 328 144, 374 119"
                stroke="#ffffff"
                strokeWidth="2.5"
                strokeLinecap="round"
                fill="none"
                opacity="0.55"
              />

              {/* Chrome Stem to Chestpiece */}
              <path
                d="M 370 123 L 388 114"
                stroke="url(#chromeGrad)"
                strokeWidth="12"
                strokeLinecap="round"
              />

              {/* Chestpiece Body (Dual-head) */}
              <ellipse cx="375" cy="100" rx="16" ry="12" fill="url(#metalRimGrad)" />
              <ellipse cx="375" cy="100" rx="12" ry="9" fill="url(#chromeGrad)" />

              {/* Diaphragm Large Head */}
              <ellipse cx="400" cy="115" rx="46" ry="38" fill="url(#metalRimGrad)" />
              <ellipse cx="400" cy="115" rx="42" ry="34" fill="url(#chromeGrad)" />
              <ellipse cx="400" cy="115" rx="36" ry="29" fill="#0f172a" />
              <ellipse cx="400" cy="115" rx="32" ry="26" fill="url(#diaphragmGrad)" />

              {/* Specular Highlight Arc on Diaphragm */}
              <path
                d="M 378 102 C 390 92, 412 92, 424 102"
                stroke="#ffffff"
                strokeWidth="3.5"
                strokeLinecap="round"
                fill="none"
                opacity="0.85"
              />
              <circle cx="395" cy="112" r="5" fill="#ffffff" opacity="0.4" />
            </svg>
          </div>
        </div>

        {/* 2. STATS SUMMARY CARDS */}
        <div className="ev-stats-grid">

          {/* Pending Card */}
          <div
            onClick={() => setStatusFilter((prev) => (prev === "pending" ? "all" : "pending"))}
            className={`ev-stat-card ${statusFilter === "pending" ? "is-active-pending" : ""}`}
          >
            <div className="ev-stat-main">
              <div
                className="ev-stat-icon-circle pending"
                style={{ backgroundColor: "#fef3c7", borderColor: "#fde68a", color: "#d97706" }}
              >
                <Clock className="w-5 h-5 stroke-[2.5]" style={{ color: "#d97706" }} />
              </div>
              <div className="ev-stat-info">
                <div className="ev-stat-number">{pendingCount}</div>
                <div className="ev-stat-label">
                  <span className="hidden sm:inline">Pending Reviews</span>
                  <span className="inline sm:hidden">Pending</span>
                </div>
              </div>
            </div>
            <ChevronRight className="ev-stat-arrow" />
          </div>

          {/* Approved Card */}
          <div
            onClick={() => setStatusFilter((prev) => (prev === "approved" ? "all" : "approved"))}
            className={`ev-stat-card ${statusFilter === "approved" ? "is-active-approved" : ""}`}
          >
            <div className="ev-stat-main">
              <div
                className="ev-stat-icon-circle approved"
                style={{ backgroundColor: "#10b981", borderColor: "#059669", color: "#ffffff" }}
              >
                <Check className="w-5 h-5 stroke-[3]" style={{ color: "#ffffff" }} />
              </div>
              <div className="ev-stat-info">
                <div className="ev-stat-number">{approvedCount}</div>
                <div className="ev-stat-label">Approved</div>
              </div>
            </div>
            <ChevronRight className="ev-stat-arrow" />
          </div>

          {/* Rejected Card */}
          <div
            onClick={() => setStatusFilter((prev) => (prev === "rejected" ? "all" : "rejected"))}
            className={`ev-stat-card ${statusFilter === "rejected" ? "is-active-rejected" : ""}`}
          >
            <div className="ev-stat-main">
              <div
                className="ev-stat-icon-circle rejected"
                style={{ backgroundColor: "#fee2e2", borderColor: "#fecaca", color: "#dc2626" }}
              >
                <XCircle className="w-5 h-5 stroke-[2.2]" style={{ color: "#dc2626" }} />
              </div>
              <div className="ev-stat-info">
                <div className="ev-stat-number">{rejectedCount}</div>
                <div className="ev-stat-label">Rejected</div>
              </div>
            </div>
            <ChevronRight className="ev-stat-arrow" />
          </div>

        </div>

        {/* 3. SEARCH & FILTERS BAR */}
        <div className="ev-filters-bar">
          {/* Desktop Filter Row */}
          <div className="ev-desktop-filters">
            {/* Search Input */}
            <div className="ev-search-wrapper">
              <Search className="ev-search-icon" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search by name, hospital, location, or contact..."
                className="ev-search-input"
                style={{ paddingLeft: "42px" }}
              />
            </div>

            {/* Type Dropdown */}
            <div className="ev-select-wrapper">
              <select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="ev-select"
              >
                <option value="all">All Types</option>
                <option value="hospital">Hospital</option>
                <option value="college">College</option>
                <option value="government">Government</option>
                <option value="private">Private</option>
              </select>
              <ChevronDown className="ev-select-arrow" />
            </div>

            {/* Status Dropdown */}
            <div className="ev-select-wrapper">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="ev-select"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
              <ChevronDown className="ev-select-arrow" />
            </div>

            {/* Date Range Dropdown */}
            <div className="ev-select-wrapper" style={{ minWidth: 140 }}>
              <Calendar className="ev-select-calendar-icon" />
              <select
                value={dateRangeFilter}
                onChange={(e) => {
                  setDateRangeFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="ev-select with-calendar"
                style={{ paddingLeft: "34px" }}
              >
                <option value="all">Date Range</option>
                <option value="today">Today</option>
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
              </select>
              <ChevronDown className="ev-select-arrow" />
            </div>

            {/* Reset Button */}
            <button
              type="button"
              onClick={handleResetFilters}
              className="ev-reset-button"
              style={{ backgroundColor: "#0066cc", color: "#ffffff" }}
            >
              <RotateCcw className="w-3.5 h-3.5 stroke-[2.5]" />
              Reset
            </button>
          </div>

          {/* Mobile Filter View */}
          <div className="ev-mobile-filters">
            {/* Row 1: Search + Filter Toggle */}
            <div className="ev-mobile-search-row">
              <div className="ev-search-wrapper">
                <Search className="ev-search-icon" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search by name, hospital..."
                  className="ev-search-input"
                  style={{ paddingLeft: "42px" }}
                />
              </div>
              <button
                type="button"
                onClick={() => setShowMobileFilters((prev) => !prev)}
                className={`ev-filter-toggle-btn ${
                  showMobileFilters || typeFilter !== "all" || statusFilter !== "all"
                    ? "is-active"
                    : ""
                }`}
                aria-label="Filter Options"
              >
                <Filter className="w-4 h-4" />
              </button>
            </div>

            {/* Row 2: All Types & All Status side-by-side */}
            <div className="ev-mobile-dropdowns-row">
              <div className="ev-select-wrapper">
                <select
                  value={typeFilter}
                  onChange={(e) => {
                    setTypeFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="ev-select"
                >
                  <option value="all">All Types</option>
                  <option value="hospital">Hospital</option>
                  <option value="college">College</option>
                  <option value="government">Government</option>
                  <option value="private">Private</option>
                </select>
                <ChevronDown className="ev-select-arrow" />
              </div>

              <div className="ev-select-wrapper">
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="ev-select"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
                <ChevronDown className="ev-select-arrow" />
              </div>
            </div>

            {/* Row 3: Reset Link on the right */}
            <div className="ev-mobile-reset-row">
              <button
                type="button"
                onClick={handleResetFilters}
                className="ev-mobile-reset-link"
                style={{ color: "#0066cc" }}
              >
                <RotateCcw className="w-3 h-3 stroke-[2.5]" />
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* 4A. DESKTOP & IPAD TABLE VIEW */}
        <div className="ev-table-card">
          <div className="ev-table-responsive">
            <table className="ev-table">
              <thead className="ev-table-header">
                <tr>
                  <th className="text-center" style={{ width: "48px", minWidth: "48px", whiteSpace: "nowrap" }}>#</th>
                  <th style={{ minWidth: "260px" }}>Name / Organization</th>
                  <th className="text-center" style={{ width: "120px", minWidth: "120px", whiteSpace: "nowrap" }}>Type</th>
                  <th className="text-center" style={{ width: "140px", minWidth: "140px", whiteSpace: "nowrap" }}>Status</th>
                  <th className="text-center" style={{ width: "125px", minWidth: "125px", whiteSpace: "nowrap" }}>Submitted On</th>
                  <th className="text-center" style={{ width: "145px", minWidth: "145px", whiteSpace: "nowrap" }}>Actions</th>
                </tr>
              </thead>
              <tbody className="ev-table-body">
                {paginatedEmployers.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: "48px 16px", textAlign: "center", color: "#94a3b8" }}>
                      <p style={{ fontSize: "15px", fontWeight: 700, color: "#475569" }}>No verification requests found</p>
                      <p style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>Try adjusting your filters or search keywords</p>
                    </td>
                  </tr>
                ) : (
                  paginatedEmployers.map((emp, idx) => {
                    const rowNumber = (currentPage - 1) * pageSize + idx + 1;
                    return (
                      <tr key={emp.id}>
                        {/* # Row Number */}
                        <td className="ev-row-index text-center" style={{ width: "48px", minWidth: "48px", whiteSpace: "nowrap" }}>
                          {rowNumber}
                        </td>

                        {/* Name / Organization */}
                        <td style={{ maxWidth: 360, minWidth: 260 }}>
                          <div>
                            <h3
                              onClick={() => handleOpenDetail(emp)}
                              className="ev-org-name"
                            >
                              {emp.companyName}
                            </h3>
                            <p className="ev-org-email">
                              {emp.userEmail}
                            </p>
                          </div>
                        </td>

                        {/* Type */}
                        <td className="text-center" style={{ width: "120px", minWidth: "120px", whiteSpace: "nowrap" }}>
                          {renderTypeBadge(emp.companyType)}
                        </td>

                        {/* Status */}
                        <td className="text-center" style={{ width: "140px", minWidth: "140px", whiteSpace: "nowrap" }}>
                          {renderStatusBadge(emp.verificationStatus)}
                        </td>

                        {/* Submitted On */}
                        <td className="ev-date-cell" style={{ width: "125px", minWidth: "125px", whiteSpace: "nowrap" }}>
                          {formatDateDisplay(emp.createdAt)}
                        </td>

                        {/* Actions */}
                        <td className="text-center" style={{ width: "145px", minWidth: "145px", whiteSpace: "nowrap" }}>
                          <div
                            className="ev-actions-cell"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexDirection: "row",
                              gap: "8px",
                              whiteSpace: "nowrap",
                              flexShrink: 0,
                            }}
                          >
                            {/* Blue View Button */}
                            <button
                              type="button"
                              onClick={() => handleOpenDetail(emp)}
                              className="ev-view-btn"
                              style={{
                                backgroundColor: "#0066cc",
                                color: "#ffffff",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexDirection: "row",
                                gap: "6px",
                                height: "32px",
                                minWidth: "82px",
                                padding: "6px 14px",
                                borderRadius: "6px",
                                fontSize: "12.5px",
                                fontWeight: 700,
                                whiteSpace: "nowrap",
                                flexShrink: 0,
                                border: "none",
                                cursor: "pointer",
                              }}
                            >
                              <Eye className="w-3.5 h-3.5 stroke-[2.2]" style={{ flexShrink: 0 }} />
                              <span style={{ whiteSpace: "nowrap", display: "inline" }}>View</span>
                            </button>

                            {/* 3-dots dropdown toggle */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActionMenuOpenId(actionMenuOpenId === emp.id ? null : emp.id);
                              }}
                              className="ev-more-btn"
                              style={{ flexShrink: 0 }}
                              aria-label="More options"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {/* Dropdown Menu */}
                            {actionMenuOpenId === emp.id && (
                              <div
                                style={{
                                  position: "absolute",
                                  right: 0,
                                  top: "34px",
                                  zIndex: 40,
                                  width: "180px",
                                  backgroundColor: "#ffffff",
                                  borderRadius: "8px",
                                  boxShadow: "0 10px 25px rgba(0,0,0,0.12)",
                                  border: "1px solid #e2e8f0",
                                  padding: "4px 0",
                                  textAlign: "left",
                                  fontSize: "12px",
                                }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  onClick={() => handleOpenDetail(emp)}
                                  style={{
                                    width: "100%",
                                    padding: "8px 12px",
                                    color: "#334155",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    background: "none",
                                    border: "none",
                                    cursor: "pointer",
                                  }}
                                >
                                  <Eye className="w-3.5 h-3.5 text-blue-600" />
                                  View Full Details
                                </button>
                                {emp.verificationStatus !== "approved" && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedEmployer(emp);
                                      handleReviewAction("approved");
                                      setActionMenuOpenId(null);
                                    }}
                                    style={{
                                      width: "100%",
                                      padding: "8px 12px",
                                      color: "#15803d",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "8px",
                                      background: "none",
                                      border: "none",
                                      cursor: "pointer",
                                    }}
                                  >
                                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                                    Approve Request
                                  </button>
                                )}
                                {emp.verificationStatus !== "rejected" && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedEmployer(emp);
                                      handleReviewAction("rejected");
                                      setActionMenuOpenId(null);
                                    }}
                                    style={{
                                      width: "100%",
                                      padding: "8px 12px",
                                      color: "#b91c1c",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "8px",
                                      background: "none",
                                      border: "none",
                                      cursor: "pointer",
                                    }}
                                  >
                                    <XCircle className="w-3.5 h-3.5 text-red-600" />
                                    Reject Request
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActionMenuOpenId(null);
                                    onNavigate(`employer-management/${emp.id}`);
                                  }}
                                  style={{
                                    width: "100%",
                                    padding: "8px 12px",
                                    color: "#475569",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    borderTop: "1px solid #f1f5f9",
                                    background: "none",
                                    border: "none",
                                    cursor: "pointer",
                                  }}
                                >
                                  <Building2 className="w-3.5 h-3.5 text-slate-500" />
                                  Employer Profile
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 4B. MOBILE CARD LIST VIEW */}
        <div className="ev-mobile-list">
          {paginatedEmployers.length === 0 ? (
            <div style={{ background: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "32px", textAlign: "center", color: "#94a3b8" }}>
              <p style={{ fontSize: "14px", fontWeight: 700, color: "#475569" }}>No requests found</p>
              <p style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>Try resetting filters</p>
            </div>
          ) : (
            paginatedEmployers.map((emp, idx) => {
              const rowNumber = (currentPage - 1) * pageSize + idx + 1;
              return (
                <div
                  key={emp.id}
                  onClick={() => handleOpenDetail(emp)}
                  className="ev-mobile-card"
                >
                  {/* Title & Email */}
                  <div>
                    <h3 className="ev-mobile-card-title">
                      {rowNumber}. {emp.companyName}
                    </h3>
                    <p className="ev-mobile-card-email">
                      {emp.userEmail}
                    </p>
                  </div>

                  {/* Badges & Date & Chevron */}
                  <div className="ev-mobile-card-footer">
                    <div className="ev-mobile-card-badges">
                      {renderTypeBadge(emp.companyType)}
                      {renderStatusBadge(emp.verificationStatus)}
                      <span className="ev-mobile-date">
                        {formatDateDisplay(emp.createdAt)}
                      </span>
                    </div>
                    <ChevronRight className="ev-mobile-chevron" />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 5. PAGINATION BAR (Desktop & Mobile) */}
        <div className="ev-pagination-row">
          <div className="ev-pagination-info">
            Showing {filteredEmployers.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{" "}
            {Math.min(currentPage * pageSize, filteredEmployers.length)} of {filteredEmployers.length} records
          </div>

          <div className="ev-pagination-controls">
            {/* Prev Button */}
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="ev-page-arrow"
              aria-label="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Page Numbers: 1 (Red solid button), 2 (light gray) */}
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => {
              const isActive = pg === currentPage;
              return (
                <button
                  key={pg}
                  type="button"
                  onClick={() => setCurrentPage(pg)}
                  className={`ev-page-num ${isActive ? "active" : "inactive"}`}
                  style={
                    isActive
                      ? { backgroundColor: "#c81e1e", color: "#ffffff" }
                      : { backgroundColor: "#f1f5f9", color: "#334155" }
                  }
                >
                  {pg}
                </button>
              );
            })}

            {/* Next Button */}
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="ev-page-arrow"
              aria-label="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>



        {/* 7. BOTTOM TELEGRAM JOIN BAR */}
        <div className="ev-telegram-center">
          <a
            href="https://t.me/DoctorgovtjobMedexupdate"
            target="_blank"
            rel="noopener noreferrer"
            className="ev-telegram-pill"
            style={{
              background: "linear-gradient(90deg, #c81e1e 0%, #b91c1c 50%, #991b1b 100%)",
              color: "#ffffff",
            }}
          >
            {/* Telegram circular icon */}
            <div
              className="ev-telegram-icon-circle"
              style={{ backgroundColor: "#ffffff" }}
            >
              <Send className="w-3 h-3 text-[#0088cc] -translate-x-0.5 translate-y-0.5 rotate-[-25deg]" style={{ color: "#0088cc" }} />
            </div>
            <span>
              Join for more updates &rarr;{" "}
              <strong className="ev-telegram-channel">@DoctorgovtjobMedexupdate</strong>
            </span>
          </a>
        </div>

      </div>

      {/* 8. MODAL DIALOG: REVIEW & DETAILS */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="sm:max-w-[660px] p-0 overflow-hidden rounded-2xl border border-slate-200 shadow-2xl">
          {/* Header */}
          <DialogHeader className="ev-modal-header">
            <div className="ev-modal-title-group">
              <div className="ev-modal-shield-box">
                <ShieldCheck className="w-5 h-5 text-[#0066cc]" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  Verification Request Details
                </DialogTitle>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">
                  Review applicant organization credentials and take action
                </p>
              </div>
            </div>
            {selectedEmployer && renderStatusBadge(selectedEmployer.verificationStatus)}
          </DialogHeader>

          {selectedEmployer && (
            <div className="ev-modal-body">
              {/* Organization Brand Card */}
              <div className="ev-modal-brand-card">
                <div className="ev-modal-brand-logo">
                  <Building2 className="w-7 h-7 text-white" />
                </div>
                <div className="ev-modal-brand-info">
                  <div className="ev-modal-brand-badges">
                    {renderTypeBadge(selectedEmployer.companyType)}
                    {[selectedEmployer.city, selectedEmployer.state].filter(Boolean).length > 0 && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {[selectedEmployer.city, selectedEmployer.state].filter(Boolean).join(", ")}
                      </span>
                    )}
                  </div>
                  <h3 className="ev-modal-brand-name">
                    {selectedEmployer.companyName}
                  </h3>
                  <div className="ev-modal-brand-meta">
                    <span className="ev-modal-brand-meta-item">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      Submitted on {formatDateDisplay(selectedEmployer.createdAt)}
                    </span>
                  </div>
                </div>
              </div>

              {/* 2x2 Information Grid */}
              <div className="ev-modal-info-grid">
                {/* Primary Contact Person */}
                <div className="ev-modal-info-card">
                  <div className="ev-modal-card-icon-box blue">
                    <User className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="ev-modal-card-content">
                    <span className="ev-modal-card-label">Primary Contact</span>
                    <p className="ev-modal-card-value">
                      {selectedEmployer.contactPerson || selectedEmployer.userName || "Not specified"}
                    </p>
                    {selectedEmployer.designation && (
                      <span className="ev-modal-card-tag">
                        {selectedEmployer.designation}
                      </span>
                    )}
                  </div>
                </div>

                {/* Official Email */}
                <div className="ev-modal-info-card">
                  <div className="ev-modal-card-icon-box indigo">
                    <Mail className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="ev-modal-card-content">
                    <span className="ev-modal-card-label">Official Email</span>
                    <p className="ev-modal-card-value">
                      <a
                        href={`mailto:${selectedEmployer.userEmail}`}
                        className="text-blue-600 hover:underline block truncate"
                        title={selectedEmployer.userEmail}
                      >
                        {selectedEmployer.userEmail}
                      </a>
                    </p>
                  </div>
                </div>

                {/* Contact Phone */}
                <div className="ev-modal-info-card">
                  <div className="ev-modal-card-icon-box emerald">
                    <Phone className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="ev-modal-card-content">
                    <span className="ev-modal-card-label">Contact Phone</span>
                    <p className="ev-modal-card-value">
                      {selectedEmployer.contactPhone && selectedEmployer.contactPhone !== "0000000000" ? (
                        <a
                          href={`tel:${selectedEmployer.contactPhone}`}
                          className="text-emerald-700 hover:underline"
                        >
                          {selectedEmployer.contactPhone}
                        </a>
                      ) : (
                        <span className="text-slate-400 font-normal text-xs">Not provided</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Official Website */}
                <div className="ev-modal-info-card">
                  <div className="ev-modal-card-icon-box sky">
                    <Globe className="w-4 h-4 text-sky-600" />
                  </div>
                  <div className="ev-modal-card-content">
                    <span className="ev-modal-card-label">Official Website</span>
                    <p className="ev-modal-card-value">
                      {selectedEmployer.website && selectedEmployer.website.trim() ? (
                        <a
                          href={
                            selectedEmployer.website.startsWith("http")
                              ? selectedEmployer.website
                              : `https://${selectedEmployer.website}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 inline-flex items-center gap-1 hover:underline truncate"
                        >
                          <span className="truncate">{selectedEmployer.website.replace(/^https?:\/\//, "")}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      ) : (
                        <span className="text-slate-400 font-normal text-xs">Not provided</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Registered Address (Spans full width) */}
                {[selectedEmployer.address, selectedEmployer.city, selectedEmployer.state, selectedEmployer.pincode].filter(Boolean).length > 0 && (
                  <div className="ev-modal-info-card col-span-full">
                    <div className="ev-modal-card-icon-box amber">
                      <MapPin className="w-4 h-4 text-amber-600" />
                    </div>
                    <div className="ev-modal-card-content">
                      <span className="ev-modal-card-label">Registered Address & Jurisdiction</span>
                      <p className="ev-modal-card-value text-xs font-semibold text-slate-700">
                        {[selectedEmployer.address, selectedEmployer.city, selectedEmployer.state, selectedEmployer.pincode]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Proof Document Card */}
              {selectedEmployer.documentUrl ? (
                <div className="ev-modal-doc-card">
                  <div className="ev-modal-doc-info">
                    <div className="ev-modal-doc-icon">
                      <FileText className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 leading-tight">
                        Proof of Registration / Medical License
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Official verification document attached by applicant
                      </p>
                    </div>
                  </div>
                  <a
                    href={selectedEmployer.documentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ev-modal-doc-btn"
                    style={{ backgroundColor: "#0066cc", color: "#ffffff" }}
                  >
                    <span>View Document</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-3.5 text-center">
                  <p className="text-xs text-slate-400 font-medium">
                    Proof document / registration license was not attached with this submission
                  </p>
                </div>
              )}

              {/* Admin Remarks & Quick Decision Chips */}
              <div className="ev-modal-remarks-section">
                <div className="ev-modal-remarks-header">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                    Verification Remarks / Notes (Optional)
                  </label>
                  <span className="text-[11px] text-slate-400 font-medium">Recorded with action</span>
                </div>

                {/* Quick Preset Chips */}
                <div className="ev-modal-chips-row">
                  <span className="text-[11px] text-slate-400 font-semibold mr-1">Quick notes:</span>
                  {[
                    "Credentials verified & approved",
                    "Government affiliation verified",
                    "Pending license document",
                    "Invalid contact details",
                  ].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setReviewNotes(chip)}
                      className="ev-modal-chip"
                    >
                      {chip}
                    </button>
                  ))}
                </div>

                <Textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Enter remarks or approval/rejection reason for employer reference..."
                  rows={2}
                  className="text-xs bg-slate-50/50 hover:bg-slate-50 focus:bg-white border-slate-200 rounded-lg resize-none"
                />
              </div>

              {/* Action Buttons Footer */}
              <div className="ev-modal-footer -mx-6 -mb-5 mt-2 rounded-b-2xl">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onNavigate(`employer-management/${selectedEmployer.id}`)}
                  className="border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold text-xs gap-1.5 h-9 px-3.5 cursor-pointer"
                >
                  <Building2 className="w-4 h-4 text-slate-500" />
                  Full Employer Profile
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isSubmittingReview}
                    onClick={() => handleReviewAction("rejected")}
                    className="border-red-200 bg-red-50/60 hover:bg-red-100 text-red-600 hover:text-red-700 font-bold text-xs gap-1.5 h-9 px-4 cursor-pointer"
                  >
                    <XCircle className="w-4 h-4 text-red-600" />
                    Reject Request
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={isSubmittingReview}
                    onClick={() => handleReviewAction("approved")}
                    className="font-bold text-xs gap-1.5 h-9 px-4 shadow-sm hover:opacity-95 cursor-pointer"
                    style={{
                      backgroundColor: "#10b981",
                      color: "#ffffff",
                      border: "none",
                    }}
                  >
                    <CheckCircle2 className="w-4 h-4 text-white" />
                    Approve Request
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
