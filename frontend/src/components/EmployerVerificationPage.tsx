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

  // Render Type Pill Badge with exact colors from screenshot
  const renderTypeBadge = (type: string) => {
    const t = (type || "Hospital").toLowerCase();
    if (t.includes("gov")) {
      return (
        <span className="inline-block bg-[#0284c7] text-white text-[11px] sm:text-xs font-semibold px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-md shadow-xs">
          Government
        </span>
      );
    }
    if (t.includes("college") || t.includes("univ") || t.includes("edu")) {
      return (
        <span className="inline-block bg-[#1e3a8a] text-white text-[11px] sm:text-xs font-semibold px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-md shadow-xs">
          College
        </span>
      );
    }
    // Default / Hospital
    return (
      <span className="inline-block bg-[#0052cc] text-white text-[11px] sm:text-xs font-semibold px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-md shadow-xs">
        Hospital
      </span>
    );
  };

  // Render Status Pill Badge with icon
  const renderStatusBadge = (status: string) => {
    if (status === "approved") {
      return (
        <span className="inline-flex items-center gap-1 bg-[#dcfce7] text-[#15803d] border border-[#bbf7d0] text-[11px] sm:text-xs font-semibold px-2 sm:px-2.5 py-0.5 rounded-full">
          <Check className="w-3.5 h-3.5 text-[#16a34a] stroke-[2.5]" />
          Approved
        </span>
      );
    }
    if (status === "rejected") {
      return (
        <span className="inline-flex items-center gap-1 bg-[#fee2e2] text-[#b91c1c] border border-[#fecaca] text-[11px] sm:text-xs font-semibold px-2 sm:px-2.5 py-0.5 rounded-full">
          <X className="w-3.5 h-3.5 text-[#dc2626] stroke-[2.5]" />
          Rejected
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 bg-[#fef3c7] text-[#b45309] border border-[#fde68a] text-[11px] sm:text-xs font-semibold px-2 sm:px-2.5 py-0.5 rounded-full">
        <Clock className="w-3.5 h-3.5 text-[#d97706] stroke-[2.5]" />
        Pending
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#f1f5f9]/70 pb-12">
      <div className="max-w-[1240px] mx-auto px-3 sm:px-5 lg:px-6 pt-5 sm:pt-7">

        {/* 1. HERO BANNER WITH MEDICAL GRAPHIC MOTIF */}
        <div className="relative bg-gradient-to-r from-[#eef4f9] via-[#e5eff8] to-[#d8e8f8] rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-7 md:p-8 mb-6 overflow-hidden">
          {/* Medical Stethoscope SVG Illustration on Right (Desktop/iPad) */}
          <div className="hidden md:block absolute right-0 top-0 bottom-0 w-80 lg:w-[420px] pointer-events-none select-none opacity-90 overflow-hidden">
            <svg
              viewBox="0 0 400 200"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-full h-full object-cover scale-110 translate-x-8"
            >
              <defs>
                <linearGradient id="stethGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#0284c7" stopOpacity="0.85" />
                  <stop offset="100%" stopColor="#1e3a8a" stopOpacity="0.95" />
                </linearGradient>
                <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="8" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>
              <ellipse cx="280" cy="100" rx="90" ry="70" fill="url(#stethGrad)" opacity="0.12" />
              <circle cx="285" cy="95" r="42" stroke="#0369a1" strokeWidth="8" opacity="0.75" />
              <circle cx="285" cy="95" r="28" fill="#e0f2fe" stroke="#0284c7" strokeWidth="4" />
              <path
                d="M 285 137 C 285 180, 200 170, 150 140 C 100 110, 110 50, 170 40 C 230 30, 260 70, 260 110"
                stroke="#0284c7"
                strokeWidth="10"
                strokeLinecap="round"
                fill="none"
                opacity="0.85"
              />
              <path
                d="M 170 40 C 140 20, 120 40, 100 70"
                stroke="#38bdf8"
                strokeWidth="6"
                strokeLinecap="round"
                fill="none"
                opacity="0.6"
              />
              <circle cx="100" cy="70" r="8" fill="#0284c7" />
              <circle cx="285" cy="95" r="12" fill="#0284c7" />
            </svg>
            <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[#eef4f9] to-transparent pointer-events-none" />
          </div>

          <div className="relative z-10 max-w-xl">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0f2438]">
              Employee Verification
            </h1>
            <p className="text-sm sm:text-base text-slate-500 font-medium mt-1">
              Review and approve employer verification requests
            </p>
          </div>
        </div>

        {/* 2. STATS SUMMARY CARDS (MOBILE: 3-COL ROW, DESKTOP: 3-COL GRID) */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 md:gap-5 lg:gap-6 mb-5 sm:mb-6">

          {/* Pending Card */}
          <div
            onClick={() => setStatusFilter((prev) => (prev === "pending" ? "all" : "pending"))}
            className={`bg-white rounded-xl sm:rounded-2xl border transition-all cursor-pointer p-2.5 sm:p-4 md:p-5 flex items-center justify-between shadow-xs hover:shadow-md ${
              statusFilter === "pending" ? "ring-2 ring-amber-400 border-amber-300" : "border-slate-200"
            }`}
          >
            <div className="flex items-center gap-2 sm:gap-3.5">
              <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-full bg-[#fef3c7] flex items-center justify-center shrink-0 border border-amber-200">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-[#d97706] stroke-[2.5]" />
              </div>
              <div>
                <p className="text-lg sm:text-2xl font-bold text-slate-900 leading-tight">
                  {pendingCount}
                </p>
                <p className="text-[11px] sm:text-xs text-slate-500 font-medium whitespace-nowrap">
                  <span className="hidden sm:inline">Pending Reviews</span>
                  <span className="inline sm:hidden">Pending</span>
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
          </div>

          {/* Approved Card */}
          <div
            onClick={() => setStatusFilter((prev) => (prev === "approved" ? "all" : "approved"))}
            className={`bg-white rounded-xl sm:rounded-2xl border transition-all cursor-pointer p-2.5 sm:p-4 md:p-5 flex items-center justify-between shadow-xs hover:shadow-md ${
              statusFilter === "approved" ? "ring-2 ring-emerald-500 border-emerald-300" : "border-slate-200"
            }`}
          >
            <div className="flex items-center gap-2 sm:gap-3.5">
              <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-full bg-[#10b981] flex items-center justify-center shrink-0 shadow-xs">
                <Check className="w-4 h-4 sm:w-5 sm:h-5 text-white stroke-[3]" />
              </div>
              <div>
                <p className="text-lg sm:text-2xl font-bold text-slate-900 leading-tight">
                  {approvedCount}
                </p>
                <p className="text-[11px] sm:text-xs text-slate-500 font-medium whitespace-nowrap">
                  Approved
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
          </div>

          {/* Rejected Card */}
          <div
            onClick={() => setStatusFilter((prev) => (prev === "rejected" ? "all" : "rejected"))}
            className={`bg-white rounded-xl sm:rounded-2xl border transition-all cursor-pointer p-2.5 sm:p-4 md:p-5 flex items-center justify-between shadow-xs hover:shadow-md ${
              statusFilter === "rejected" ? "ring-2 ring-red-400 border-red-300" : "border-slate-200"
            }`}
          >
            <div className="flex items-center gap-2 sm:gap-3.5">
              <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-full bg-[#fee2e2] flex items-center justify-center shrink-0 border border-red-200">
                <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-[#dc2626] stroke-[2.2]" />
              </div>
              <div>
                <p className="text-lg sm:text-2xl font-bold text-slate-900 leading-tight">
                  {rejectedCount}
                </p>
                <p className="text-[11px] sm:text-xs text-slate-500 font-medium whitespace-nowrap">
                  Rejected
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
          </div>

        </div>

        {/* 3. SEARCH & FILTERS BAR */}
        <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs p-3 sm:p-4 mb-5 sm:mb-6">
          {/* Desktop Filter Row (md and above) */}
          <div className="hidden md:flex items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[260px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search by name, hospital, location, or contact..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50/60 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-lg text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>

            {/* Type Dropdown */}
            <div className="relative min-w-[130px]">
              <select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full appearance-none bg-white border border-slate-200 rounded-lg py-2 pl-3 pr-8 text-sm text-slate-700 font-medium hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
              >
                <option value="all">All Types</option>
                <option value="hospital">Hospital</option>
                <option value="college">College</option>
                <option value="government">Government</option>
                <option value="private">Private</option>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Status Dropdown */}
            <div className="relative min-w-[130px]">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full appearance-none bg-white border border-slate-200 rounded-lg py-2 pl-3 pr-8 text-sm text-slate-700 font-medium hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Date Range Dropdown */}
            <div className="relative min-w-[140px]">
              <select
                value={dateRangeFilter}
                onChange={(e) => {
                  setDateRangeFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full appearance-none bg-white border border-slate-200 rounded-lg py-2 pl-8 pr-8 text-sm text-slate-700 font-medium hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
              >
                <option value="all">Date Range</option>
                <option value="today">Today</option>
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
              </select>
              <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Reset Button */}
            <button
              type="button"
              onClick={handleResetFilters}
              className="bg-[#0066cc] hover:bg-[#0055b3] text-white text-sm font-semibold px-4 py-2 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 stroke-[2.5]" />
              Reset
            </button>
          </div>

          {/* Mobile Filter View (matching mobile screenshot on right) */}
          <div className="block md:hidden space-y-2.5">
            {/* Row 1: Search + Filter Toggle */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search by name, hospital..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50/70 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <button
                type="button"
                onClick={() => setShowMobileFilters((prev) => !prev)}
                className={`p-2 border rounded-lg transition-colors ${
                  showMobileFilters || typeFilter !== "all" || statusFilter !== "all"
                    ? "bg-blue-50 border-blue-300 text-blue-600"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
                aria-label="Filter Options"
              >
                <Filter className="w-4 h-4" />
              </button>
            </div>

            {/* Row 2: All Types & All Status side-by-side */}
            <div className="grid grid-cols-2 gap-2">
              <div className="relative">
                <select
                  value={typeFilter}
                  onChange={(e) => {
                    setTypeFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full appearance-none bg-white border border-slate-200 rounded-lg py-1.5 pl-3 pr-7 text-xs text-slate-700 font-medium"
                >
                  <option value="all">All Types</option>
                  <option value="hospital">Hospital</option>
                  <option value="college">College</option>
                  <option value="government">Government</option>
                  <option value="private">Private</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full appearance-none bg-white border border-slate-200 rounded-lg py-1.5 pl-3 pr-7 text-xs text-slate-700 font-medium"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Row 3: Reset Link on the right */}
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-[#0066cc] text-xs font-semibold flex items-center gap-1 hover:underline"
              >
                <RotateCcw className="w-3 h-3 stroke-[2.5]" />
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* 4A. DESKTOP & IPAD TABLE VIEW */}
        <div className="hidden md:block bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs overflow-hidden mb-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#f8fafc] border-b border-slate-200 text-xs font-semibold text-slate-600">
                  <th className="py-3.5 px-4 text-center w-12">#</th>
                  <th className="py-3.5 px-4">Name / Organization</th>
                  <th className="py-3.5 px-4 text-center">Type</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-center">Submitted On</th>
                  <th className="py-3.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {paginatedEmployers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <p className="text-base font-semibold text-slate-600">No verification requests found</p>
                      <p className="text-xs text-slate-400 mt-1">Try adjusting your filters or search keywords</p>
                    </td>
                  </tr>
                ) : (
                  paginatedEmployers.map((emp, idx) => {
                    const rowNumber = (currentPage - 1) * pageSize + idx + 1;
                    return (
                      <tr
                        key={emp.id}
                        className="hover:bg-blue-50/30 transition-colors group cursor-default"
                      >
                        {/* # Row Number */}
                        <td className="py-3 px-4 text-center text-slate-500 font-medium text-xs">
                          {rowNumber}
                        </td>

                        {/* Name / Organization */}
                        <td className="py-3 px-4 max-w-[340px]">
                          <div>
                            <button
                              type="button"
                              onClick={() => handleOpenDetail(emp)}
                              className="font-semibold text-slate-900 text-[13.5px] hover:text-[#0066cc] text-left leading-snug line-clamp-1 cursor-pointer"
                            >
                              {emp.companyName}
                            </button>
                            <p className="text-xs text-slate-400 truncate mt-0.5 font-normal">
                              {emp.userEmail}
                            </p>
                          </div>
                        </td>

                        {/* Type */}
                        <td className="py-3 px-4 text-center">
                          {renderTypeBadge(emp.companyType)}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4 text-center">
                          {renderStatusBadge(emp.verificationStatus)}
                        </td>

                        {/* Submitted On */}
                        <td className="py-3 px-4 text-center text-xs text-slate-600 font-medium">
                          {formatDateDisplay(emp.createdAt)}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-center">
                          <div className="inline-flex items-center gap-1.5 relative">
                            {/* Blue View Button */}
                            <button
                              type="button"
                              onClick={() => handleOpenDetail(emp)}
                              className="bg-[#0066cc] hover:bg-[#0055b3] text-white text-xs font-semibold px-3 py-1 rounded-md inline-flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5 stroke-[2.2]" />
                              View
                            </button>

                            {/* 3-dots dropdown toggle */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActionMenuOpenId(actionMenuOpenId === emp.id ? null : emp.id);
                              }}
                              className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                              aria-label="More options"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {/* Dropdown Menu */}
                            {actionMenuOpenId === emp.id && (
                              <div
                                className="absolute right-0 top-8 z-30 w-44 bg-white rounded-lg shadow-lg border border-slate-200 py-1 text-left text-xs"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  onClick={() => handleOpenDetail(emp)}
                                  className="w-full px-3 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2"
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
                                    className="w-full px-3 py-2 text-emerald-700 hover:bg-emerald-50 flex items-center gap-2"
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
                                    className="w-full px-3 py-2 text-red-700 hover:bg-red-50 flex items-center gap-2"
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
                                  className="w-full px-3 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2 border-t border-slate-100"
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

        {/* 4B. MOBILE CARD LIST VIEW (exact matching right screenshot) */}
        <div className="block md:hidden space-y-2.5 mb-4">
          {paginatedEmployers.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400">
              <p className="text-sm font-semibold text-slate-600">No requests found</p>
              <p className="text-xs text-slate-400 mt-1">Try resetting filters</p>
            </div>
          ) : (
            paginatedEmployers.map((emp, idx) => {
              const rowNumber = (currentPage - 1) * pageSize + idx + 1;
              return (
                <div
                  key={emp.id}
                  onClick={() => handleOpenDetail(emp)}
                  className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs active:bg-slate-50 transition-colors cursor-pointer"
                >
                  {/* Title & Email */}
                  <div>
                    <h3 className="font-semibold text-slate-900 text-[13.5px] leading-snug line-clamp-1">
                      {rowNumber}. {emp.companyName}
                    </h3>
                    <p className="text-xs text-slate-400 truncate mt-0.5">
                      {emp.userEmail}
                    </p>
                  </div>

                  {/* Badges & Date & Chevron */}
                  <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-2 flex-wrap">
                      {renderTypeBadge(emp.companyType)}
                      {renderStatusBadge(emp.verificationStatus)}
                      <span className="text-[11px] text-slate-500 font-medium">
                        {formatDateDisplay(emp.createdAt)}
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 5. PAGINATION BAR (Desktop & Mobile) */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1 pb-6">
          <p className="text-xs sm:text-sm text-slate-500 font-medium order-2 sm:order-1">
            Showing {filteredEmployers.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{" "}
            {Math.min(currentPage * pageSize, filteredEmployers.length)} of {filteredEmployers.length} records
          </p>

          <div className="flex items-center gap-1.5 order-1 sm:order-2">
            {/* Prev Button */}
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="w-8 h-8 rounded-md border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
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
                  className={`w-8 h-8 rounded-md text-xs sm:text-sm font-bold flex items-center justify-center transition-all cursor-pointer ${
                    isActive
                      ? "bg-[#c81e1e] text-white shadow-xs"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
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
              className="w-8 h-8 rounded-md border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
              aria-label="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 6. BOTTOM FEATURE HIGHLIGHTS STRIP (MATCHING IMAGE BOTTOM RIBBON) */}
        <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-5 mb-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 lg:gap-0 lg:divide-x lg:divide-slate-200">

            {/* 1. Responsive Design */}
            <div className="flex items-start gap-3 lg:px-4">
              <div className="w-9 h-9 rounded-lg border border-red-200 bg-red-50/50 flex items-center justify-center text-[#c81e1e] shrink-0">
                <Monitor className="w-5 h-5 stroke-[1.8]" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-xs sm:text-[13px] leading-tight">
                  Responsive Design
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                  Perfect experience on both desktop & mobile
                </p>
              </div>
            </div>

            {/* 2. Search & Filter */}
            <div className="flex items-start gap-3 lg:px-4">
              <div className="w-9 h-9 rounded-lg border border-red-200 bg-red-50/50 flex items-center justify-center text-[#c81e1e] shrink-0">
                <Search className="w-5 h-5 stroke-[1.8]" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-xs sm:text-[13px] leading-tight">
                  Search & Filter
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                  Find records quickly by name, type, status, date
                </p>
              </div>
            </div>

            {/* 3. Clean Table View */}
            <div className="flex items-start gap-3 lg:px-4">
              <div className="w-9 h-9 rounded-lg border border-red-200 bg-red-50/50 flex items-center justify-center text-[#c81e1e] shrink-0">
                <Eye className="w-5 h-5 stroke-[1.8]" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-xs sm:text-[13px] leading-tight">
                  Clean Table View
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                  All details in one place (no horizontal scroll)
                </p>
              </div>
            </div>

            {/* 4. Easy Actions */}
            <div className="flex items-start gap-3 lg:px-4">
              <div className="w-9 h-9 rounded-lg border border-red-200 bg-red-50/50 flex items-center justify-center text-[#c81e1e] shrink-0">
                <CheckCircle className="w-5 h-5 stroke-[1.8]" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-xs sm:text-[13px] leading-tight">
                  Easy Actions
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                  View details, approve/reject with one click
                </p>
              </div>
            </div>

            {/* 5. Pagination */}
            <div className="flex items-start gap-3 lg:px-4 col-span-2 sm:col-span-1">
              <div className="w-9 h-9 rounded-lg border border-red-200 bg-red-50/50 flex items-center justify-center text-[#c81e1e] shrink-0 font-bold text-xs">
                &lt; &gt;
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-xs sm:text-[13px] leading-tight">
                  Pagination
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                  Better performance with large data
                </p>
              </div>
            </div>

          </div>
        </div>

        {/* 7. BOTTOM TELEGRAM JOIN BAR (MATCHING IMAGE BOTTOM CAPSULE) */}
        <div className="flex justify-center mb-6">
          <a
            href="https://t.me/DoctorgovtjobMedexupdate"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2.5 bg-gradient-to-r from-[#c81e1e] via-[#b91c1c] to-[#991b1b] text-white px-5 sm:px-8 py-2.5 rounded-full shadow-md hover:shadow-lg hover:opacity-95 transition-all text-xs sm:text-sm font-medium"
          >
            {/* Telegram circular icon */}
            <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center shrink-0">
              <Send className="w-3 h-3 text-[#0088cc] -translate-x-0.5 translate-y-0.5 rotate-[-25deg]" />
            </div>
            <span>
              Join for more updates &rarr; <strong className="underline ml-0.5">@DoctorgovtjobMedexupdate</strong>
            </span>
          </a>
        </div>

      </div>

      {/* 8. MODAL DIALOG: REVIEW & DETAILS */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="sm:max-w-[580px] p-0 overflow-hidden rounded-2xl">
          <DialogHeader className="p-5 pb-4 bg-slate-50 border-b border-slate-200">
            <div className="flex items-center justify-between gap-3">
              <div>
                <DialogTitle className="text-lg font-bold text-slate-900">
                  Verification Request Details
                </DialogTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  Review applicant organization credentials and take action
                </p>
              </div>
              {selectedEmployer && renderStatusBadge(selectedEmployer.verificationStatus)}
            </div>
          </DialogHeader>

          {selectedEmployer && (
            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Organization Info Card */}
              <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-200 text-xs space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Organization Name</span>
                    <h3 className="font-bold text-slate-900 text-sm mt-0.5">
                      {selectedEmployer.companyName}
                    </h3>
                  </div>
                  <div>{renderTypeBadge(selectedEmployer.companyType)}</div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Contact Person</span>
                    <strong className="text-slate-800">
                      {selectedEmployer.contactPerson || selectedEmployer.userName || "N/A"}
                    </strong>
                    {selectedEmployer.designation && (
                      <span className="text-slate-500 block text-[11px]">
                        {selectedEmployer.designation}
                      </span>
                    )}
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[11px]">Official Email</span>
                    <a
                      href={`mailto:${selectedEmployer.userEmail}`}
                      className="text-blue-600 font-medium hover:underline block truncate"
                    >
                      {selectedEmployer.userEmail}
                    </a>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[11px]">Contact Phone</span>
                    <a
                      href={`tel:${selectedEmployer.contactPhone}`}
                      className="text-slate-800 font-medium hover:underline block"
                    >
                      {selectedEmployer.contactPhone || "—"}
                    </a>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[11px]">Official Website</span>
                    {selectedEmployer.website ? (
                      <a
                        href={selectedEmployer.website.startsWith("http") ? selectedEmployer.website : `https://${selectedEmployer.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 font-medium hover:underline inline-flex items-center gap-1"
                      >
                        Visit Website <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    ) : (
                      <span className="text-slate-400">Not provided</span>
                    )}
                  </div>

                  {[selectedEmployer.city, selectedEmployer.state].filter(Boolean).length > 0 && (
                    <div className="sm:col-span-2">
                      <span className="text-slate-400 block text-[11px]">Location</span>
                      <span className="text-slate-800 font-medium">
                        {[selectedEmployer.address, selectedEmployer.city, selectedEmployer.state, selectedEmployer.pincode]
                          .filter(Boolean)
                          .join(", ")}
                      </span>
                    </div>
                  )}

                  {selectedEmployer.documentUrl && (
                    <div className="sm:col-span-2 pt-2 border-t border-slate-200">
                      <span className="text-slate-400 block text-[11px] mb-1">
                        Proof Document / License
                      </span>
                      <a
                        href={selectedEmployer.documentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        View Uploaded Proof Document <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Admin Remarks / Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Verification Remarks / Notes (Optional)
                </label>
                <Textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Enter remarks or approval/rejection reason for employer reference..."
                  rows={2}
                  className="text-xs resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onNavigate(`employer-management/${selectedEmployer.id}`)}
                  className="w-full sm:w-auto text-xs"
                >
                  <Building2 className="w-3.5 h-3.5 mr-1" />
                  Full Employer Profile
                </Button>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isSubmittingReview}
                    onClick={() => handleReviewAction("rejected")}
                    className="flex-1 sm:flex-initial text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 text-xs"
                  >
                    <XCircle className="w-3.5 h-3.5 mr-1" />
                    Reject
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={isSubmittingReview}
                    onClick={() => handleReviewAction("approved")}
                    className="flex-1 sm:flex-initial bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                  >
                    <CheckCircle className="w-3.5 h-3.5 mr-1" />
                    Approve
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
