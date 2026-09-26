import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Award,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  CloudUpload,
  Compass,
  DollarSign,
  ExternalLink,
  FileText,
  Folder,
  GraduationCap,
  Image as ImageIcon,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Save,
  ShieldCheck,
  Sparkles,
  Upload,
  User,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { JobCategory, JobSector } from '../types';
import { useAuth } from '../contexts/AuthContext';
import {
  extractJobTemplateFromPdf,
  JobTemplateExtractionResponse,
  JobTemplateVacancyExtraction,
} from '../api/jobTemplateExtraction';
import {
  createManualRecruitment,
  ManualRecruitmentPayload,
} from '../api/recruitments';
import { uploadNotificationPdf } from '../api/jobs';
import {
  buildStructuredJobDescription,
  cardFieldText,
  cardSalaryText,
  leftoverEligibilityNotes,
} from '../utils/extractedFieldDisplay';
import {
  parseRawVacancyNotice,
  ParsedDepartmentVacancy,
  ParsedNoticeResult,
} from '../utils/rawNoticeParser';
import '../styles/job-posting-template.css';
import { toast } from 'sonner';

interface JobPostingFormProps {
  onCancel: () => void;
  onSave: (jobData: JobFormData) => void;
  initialData?: Partial<JobFormData>;
}

interface JobFormData {
  title: string;
  organization: string;
  sector: JobSector;
  category: JobCategory;
  jobRoles?: string[];
  location: string;
  state: string;
  qualification: string;
  experience: string;
  experienceLevel: 'entry' | 'mid' | 'senior' | 'executive';
  speciality: string;
  dutyType: 'full_time' | 'part_time' | 'contract';
  numberOfPosts?: number;
  salary: string;
  description: string;
  lastDate: string;
  requirements: string;
  benefits: string;
  contactEmail: string;
  contactPhone: string;
  pdfUrl?: string;
  applyLink?: string;
  ageLimit?: string;
  selectionProcess?: string;
  pdfFile?: File;
  imageFile?: File;
  status?: string;
}

const jobCategories: JobCategory[] = [
  'Medical Officer',
  'Junior Resident',
  'Senior Resident',
  'Specialist',
  'Consultant',
  'GDMO',
  'Faculty',
  'Dental',
  'AYUSH',
  'Nursing',
  'Paramedical',
  'Allied Health',
  'Pharmacy',
  'Psychology & Mental Health',
  'Nutrition & Dietetics',
  'Life Science & Research',
  'Hospital Administration',
  'Public Health',
];

const INDIAN_STATES = [
  'Andaman and Nicobar Islands',
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chandigarh',
  'Chhattisgarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jammu and Kashmir',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Ladakh',
  'Lakshadweep',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Puducherry',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
];

const trim = (value?: string | null) => value?.trim() || '';

function inferCategory(value?: string | null): JobCategory {
  const t = trim(value).toLowerCase();
  if (/junior resident/.test(t)) return 'Junior Resident';
  if (/senior resident/.test(t)) return 'Senior Resident';
  if (/medical officer|gdm[o]?/.test(t)) return 'Medical Officer';
  if (/professor|faculty|lecturer|tutor/.test(t)) return 'Faculty';
  if (/specialist|consultant/.test(t)) return 'Specialist';
  if (/dental|dentist|bds|mds/.test(t)) return 'Dental';
  if (/ayush|bams|bhms|unani|ayurveda/.test(t)) return 'AYUSH';
  if (/nurs/.test(t)) return 'Nursing';
  if (/pharmac/.test(t)) return 'Pharmacy';
  if (/psych/.test(t)) return 'Psychology & Mental Health';
  if (/nutrition|diet/.test(t)) return 'Nutrition & Dietetics';
  if (/public health|epidemi/.test(t)) return 'Public Health';
  if (/administration|administrator/.test(t)) return 'Hospital Administration';
  if (/research|scientist|life science/.test(t)) return 'Life Science & Research';
  if (/technician|technologist|paramedic/.test(t)) return 'Paramedical';
  return 'Medical Officer';
}

function inferDutyType(value?: string | null): JobFormData['dutyType'] {
  const t = trim(value).toLowerCase();
  return /part[ -]?time/.test(t)
    ? 'part_time'
    : /contract|temporary|fixed term|tenure|walk[- ]?in/.test(t)
    ? 'contract'
    : 'full_time';
}

function inferState(location?: string | null) {
  const t = trim(location).toLowerCase();
  return INDIAN_STATES.find((state) => t.includes(state.toLowerCase())) || '';
}

function locationWithState(location: string, state: string) {
  const l = location.trim();
  const s = state.trim();
  return !s || l.toLowerCase().includes(s.toLowerCase()) ? l : l ? `${l}, ${s}` : s;
}

function formatExtractedDescription(
  extraction: JobTemplateExtractionResponse,
  vacancy?: JobTemplateVacancyExtraction
) {
  const r = extraction.recruitment || {};
  if (trim(r.jobDescription) && /JOB DETAILS/i.test(String(r.jobDescription))) {
    return String(r.jobDescription).trim();
  }
  return buildStructuredJobDescription({
    postName: trim(vacancy?.postName || r.title),
    organisationName: trim(r.organisationName),
    department: trim(vacancy?.department),
    speciality: trim(vacancy?.speciality),
    location: trim(vacancy?.location || r.location),
    numberOfPosts: vacancy?.numberOfVacancies,
    jobType: trim(vacancy?.jobType),
    qualification: trim(vacancy?.qualification),
    experience: trim(vacancy?.experience),
    ageLimit: trim(vacancy?.ageLimit),
    otherEligibility: trim(vacancy?.otherEligibilityRequirements),
    salary: trim(vacancy?.salary || vacancy?.payScale || vacancy?.payLevel),
    applicationStartDate: trim(r.applicationStartDate),
    applicationLastDate: trim(r.applicationLastDate),
    applicationFee: trim(r.applicationFee),
    selectionProcess: trim(r.selectionProcess),
    importantInstructions: trim(r.importantInstructions),
    extraNotes: leftoverEligibilityNotes(
      vacancy?.qualification,
      vacancy?.experience,
      vacancy?.otherEligibilityRequirements
    ),
  });
}

export type { ParsedDepartmentVacancy, ParsedNoticeResult };
export { parseRawVacancyNotice };


const defaultData: JobFormData = {
  title: '',
  organization: '',
  sector: 'private',
  category: 'Medical Officer',
  jobRoles: ['Medical Officer'],
  location: '',
  state: '',
  qualification: '',
  experience: '',
  experienceLevel: 'entry',
  speciality: '',
  dutyType: 'full_time',
  numberOfPosts: undefined,
  salary: '',
  description: '',
  lastDate: '',
  requirements: '',
  benefits: '',
  contactEmail: '',
  contactPhone: '',
  applyLink: '',
};

export function JobPostingForm({ onCancel, onSave, initialData }: JobPostingFormProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEmployer = user?.role === 'employer';
  const isAdmin = user?.role === 'admin';

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<JobFormData>(defaultData);
  const [extractingPdf, setExtractingPdf] = useState(false);
  const [pdfMessage, setPdfMessage] = useState('');
  const [pdfError, setPdfError] = useState('');
  const [pdfExtraction, setPdfExtraction] = useState<JobTemplateExtractionResponse | null>(null);
  const [selectedVacancyIndex, setSelectedVacancyIndex] = useState(0);

  // Direct paste & auto-fill state
  const [pastePanelOpen, setPastePanelOpen] = useState(false);
  const [rawPastedNotice, setRawPastedNotice] = useState('');
  const [autoFillStats, setAutoFillStats] = useState<string[] | null>(null);
  const [detectedRecruitment, setDetectedRecruitment] = useState<{
    departments: ParsedDepartmentVacancy[];
    totalVacancies: number;
    title: string;
  } | null>(null);
  const [publishingRecruitment, setPublishingRecruitment] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const parserPdfInputRef = useRef<HTMLInputElement>(null);
  const aiFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!initialData) return;
    setFormData((p) => {
      const m = { ...p, ...initialData } as JobFormData;
      const initialRoles =
        initialData.jobRoles && initialData.jobRoles.length > 0
          ? initialData.jobRoles
          : initialData.category
          ? [initialData.category]
          : ['Medical Officer'];
      return {
        ...m,
        jobRoles: initialRoles,
        state: initialData.state || inferState(initialData.location),
        sector: isEmployer ? 'private' : m.sector || 'private',
      };
    });
  }, [initialData, isEmployer]);

  useEffect(() => {
    if (isEmployer && formData.sector !== 'private') {
      setFormData((p) => ({ ...p, sector: 'private' }));
    }
  }, [isEmployer, formData.sector]);

  const setField = <K extends keyof JobFormData>(field: K, value: JobFormData[K]) =>
    setFormData((p) => ({ ...p, [field]: value }));

  const toggleRole = (role: string) => {
    setFormData((p) => {
      const current = p.jobRoles || (p.category ? [p.category] : ['Medical Officer']);
      const exists = current.includes(role);
      let updated: string[];
      if (exists) {
        updated = current.filter((r) => r !== role);
        if (updated.length === 0) updated = [role];
      } else {
        updated = [...current, role];
      }
      return {
        ...p,
        jobRoles: updated,
        category: (updated[0] as JobCategory) || p.category,
      };
    });
  };

  const handlePublishMultiDepartmentRecruitment = async () => {
    let recData = detectedRecruitment;
    if (!recData || recData.departments.length === 0) {
      const parsed = parseRawVacancyNotice(formData.description || rawPastedNotice || '');
      if (parsed.isMultiDepartment && parsed.departmentsList && parsed.departmentsList.length >= 2) {
        recData = {
          departments: parsed.departmentsList,
          totalVacancies: parsed.numberOfPosts || parsed.departmentsList.reduce((s, d) => s + d.numberOfVacancies, 0),
          title: parsed.title || formData.title.trim() || 'Medical Staff Recruitment',
        };
      }
    }
    if (!recData || recData.departments.length === 0) return;
    setPublishingRecruitment(true);
    try {
      const rawTitle = formData.title.trim() || recData.title || 'Medical Staff';
      const cleanTitle = rawTitle.toLowerCase().includes('recruitment')
        ? rawTitle
        : `${rawTitle} Recruitment ${new Date().getFullYear()} - Multiple Departments`;

      let notificationPdfUrl: string | undefined = undefined;
      if (formData.pdfFile) {
        try {
          const uploaded = await uploadNotificationPdf(formData.pdfFile);
          notificationPdfUrl = uploaded?.pdfUrl;
        } catch (pdfErr) {
          console.warn('Failed to pre-upload PDF for multi-department recruitment:', pdfErr);
        }
      }

      const payload: ManualRecruitmentPayload = {
        organisationName: formData.organization.trim() || 'Medical Institution / Hospital',
        title: cleanTitle,
        sector: (formData.sector as 'government' | 'private') || 'government',
        location: formData.location ? (formData.state ? `${formData.location}, ${formData.state}` : formData.location) : 'India',
        totalVacancies: formData.numberOfPosts || recData.totalVacancies,
        applicationLastDate: formData.lastDate || undefined,
        qualification: formData.qualification || undefined,
        experience: formData.experience || undefined,
        ageLimit: formData.ageLimit || undefined,
        salary: formData.salary || undefined,
        jobType: formData.dutyType === 'full_time' ? 'Full Time' : formData.dutyType === 'part_time' ? 'Part Time' : 'Contract',
        jobDescription: rawPastedNotice || formData.description,
        importantInstructions: formData.requirements || undefined,
        selectionProcess: formData.selectionProcess || undefined,
        officialApplicationUrl: formData.applyLink || undefined,
        officialNotificationUrl: notificationPdfUrl || formData.applyLink || undefined,
        officialWebsite: formData.applyLink || undefined,
        publishImmediately: true,
        vacancies: recData.departments.map((d) => ({
          postName: d.postName || formData.title.trim() || recData?.title || 'Medical Officer / Resident',
          department: d.department,
          speciality: d.department,
          numberOfVacancies: d.numberOfVacancies || 1,
          category: d.category || undefined,
          qualification: formData.qualification || undefined,
          experience: formData.experience || undefined,
          ageLimit: formData.ageLimit || undefined,
          salary: formData.salary || undefined,
          location: formData.location || undefined,
          jobType: formData.dutyType === 'full_time' ? 'Full Time' : 'Contract',
          otherEligibilityRequirements: formData.requirements || undefined,
        })),
      };

      const created = await createManualRecruitment(payload);
      toast.success('Multi-department recruitment published successfully!');
      const targetId = created?.id || (created as any)?.slug;
      if (targetId) {
        navigate(`/recruitment/${targetId}`);
      }
    } catch (err: any) {
      console.error('Failed to publish multi-department recruitment:', err);
      toast.error(err?.response?.data?.error || err?.message || 'Failed to publish recruitment');
    } finally {
      setPublishingRecruitment(false);
    }
  };

  const handleAutoFillFromText = () => {
    if (!rawPastedNotice.trim()) return;
    const parsed = parseRawVacancyNotice(rawPastedNotice);
    const populated: string[] = [];

    setFormData((p) => {
      const next = { ...p };
      if (parsed.title) {
        next.title = parsed.title;
        populated.push('Title');
      }
      if (parsed.organization) {
        next.organization = parsed.organization;
        populated.push('Organization');
      }
      if (parsed.sector && !isEmployer) {
        next.sector = parsed.sector;
        populated.push('Sector');
      }
      if (parsed.jobRoles && parsed.jobRoles.length > 0) {
        next.jobRoles = parsed.jobRoles;
        next.category = parsed.category || (parsed.jobRoles[0] as JobCategory);
        populated.push(`Roles (${parsed.jobRoles.join(', ')})`);
      }
      if (parsed.location) {
        next.location = parsed.location;
        populated.push('Location');
      }
      if (parsed.state) {
        next.state = parsed.state;
        populated.push('State');
      }
      if (parsed.qualification) {
        next.qualification = parsed.qualification;
        populated.push('Qualification');
      }
      if (parsed.experience) {
        next.experience = parsed.experience;
        populated.push('Experience');
      }
      if (parsed.numberOfPosts) {
        next.numberOfPosts = parsed.numberOfPosts;
        populated.push('Posts');
      }
      if (parsed.salary) {
        next.salary = parsed.salary;
        populated.push('Salary');
      }
      if (parsed.lastDate) {
        next.lastDate = parsed.lastDate;
        populated.push('Last Date');
      }
      if (parsed.requirements) {
        next.requirements = parsed.requirements;
        populated.push('Requirements');
      }
      if (parsed.benefits) {
        next.benefits = parsed.benefits;
        populated.push('Benefits');
      }
      if (parsed.contactEmail) {
        next.contactEmail = parsed.contactEmail;
        populated.push('Email');
      }
      if (parsed.contactPhone) {
        next.contactPhone = parsed.contactPhone;
        populated.push('Phone');
      }
      if (parsed.applyLink) {
        next.applyLink = parsed.applyLink;
        populated.push('Apply Link');
      }
      if (parsed.ageLimit) {
        next.ageLimit = parsed.ageLimit;
        populated.push('Age Limit');
      }
      if (parsed.selectionProcess) {
        next.selectionProcess = parsed.selectionProcess;
        populated.push('Selection Process');
      }
      // Preserve full raw description
      next.description = rawPastedNotice;
      populated.push('Full Description (Preserved)');

      return next;
    });

    if (parsed.isMultiDepartment && parsed.departmentsList && parsed.departmentsList.length >= 2) {
      setDetectedRecruitment({
        departments: parsed.departmentsList,
        totalVacancies: parsed.numberOfPosts || parsed.departmentsList.reduce((s, d) => s + d.numberOfVacancies, 0),
        title: parsed.title || formData.title.trim() || 'Medical Recruitment',
      });
      populated.push(`✨ Multi-Department (${parsed.departmentsList.length} Specialties)`);
    } else {
      setDetectedRecruitment(null);
    }

    setAutoFillStats(populated);
    if (populated.length > 0) {
      toast.success(`Parsed notice & auto-filled ${populated.length} fields!`);
    } else {
      toast.info('Notice text loaded into description.');
    }
  };

  const stepValid =
    step === 1
      ? Boolean(formData.title.trim() && formData.organization.trim() && formData.location.trim() && formData.state.trim())
      : step === 3
      ? Boolean(formData.description.trim() && formData.lastDate)
      : true;

  const applyExtractedVacancy = (
    extraction: JobTemplateExtractionResponse,
    index: number
  ) => {
    const vacancies = extraction.vacancies || [];
    const v = vacancies[index];
    const r = extraction.recruitment || {};
    const location = trim(v?.location) || trim(r.location);
    const title = trim(v?.postName) || trim(r.title);
    const posts =
      v?.numberOfVacancies && v.numberOfVacancies > 0
        ? v.numberOfVacancies
        : vacancies.length <= 1 && r.totalVacancies && r.totalVacancies > 0
        ? r.totalVacancies
        : undefined;

    setSelectedVacancyIndex(index);
    setFormData((p) => ({
      ...p,
      title: title || p.title,
      organization: trim(r.organisationName) || p.organization,
      sector: isEmployer ? 'private' : r.sector === 'government' || r.sector === 'private' ? r.sector : p.sector,
      category: inferCategory(title || v?.department || p.title),
      location,
      state: inferState(location) || p.state,
      qualification: cardFieldText(v?.qualification),
      experience: cardFieldText(v?.experience),
      speciality: trim(v?.speciality || v?.department),
      dutyType: inferDutyType(v?.jobType),
      numberOfPosts: posts,
      salary: cardSalaryText(v?.salary || v?.payScale || v?.payLevel),
      lastDate: trim(r.applicationLastDate),
      requirements: trim(v?.otherEligibilityRequirements),
      applyLink: trim(r.officialApplicationUrl) || p.applyLink,
      description: formatExtractedDescription(extraction, v) || p.description,
    }));
  };

  const handleAttachPdfOnly = (file?: File) => {
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setPdfError('Please select a valid PDF file.');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setPdfError('PDF must be 20 MB or smaller.');
      return;
    }

    setField('pdfFile', file);
    setPdfError('');
    setPdfExtraction(null);
    setSelectedVacancyIndex(0);
    setPdfMessage(
      `PDF "${file.name}" attached successfully! Your parsed/entered job details are preserved. MedExJob logo & website hyperlink will be stamped automatically upon saving.`
    );
  };

  const handlePdf = async (file?: File) => {
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setPdfError('Please select a PDF file.');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setPdfError('PDF must be 20 MB or smaller.');
      return;
    }

    const hasExistingContent = formData.title.trim() || formData.organization.trim() || rawPastedNotice.trim();
    if (hasExistingContent) {
      const confirmOverwrite = window.confirm(
        'Extracting details from this PDF with AI will overwrite your currently entered / parsed fields.\n\nDo you want to proceed with AI Auto-Fill?\n\n(Click Cancel if you only want to attach the PDF without overwriting your fields).'
      );
      if (!confirmOverwrite) {
        handleAttachPdfOnly(file);
        return;
      }
    }

    setField('pdfFile', file);
    setPdfError('');
    setPdfMessage('');
    setPdfExtraction(null);
    setSelectedVacancyIndex(0);

    setExtractingPdf(true);
    try {
      const extraction = await extractJobTemplateFromPdf(file);
      setPdfExtraction(extraction);
      applyExtractedVacancy(extraction, 0);
      const count = extraction.vacancies?.length || 0;
      setPdfMessage(
        count > 1
          ? `${count} vacancy rows extracted with Gemini. Select the vacancy you want to post.`
          : 'Gemini extraction completed. Review the highlighted fields before saving.'
      );
    } catch (error: any) {
      setPdfError(
        error?.response?.data?.error ||
          error?.response?.data?.message ||
          'Unable to extract this PDF. You can still complete the form manually.'
      );
    } finally {
      setExtractingPdf(false);
    }
  };

  const save = async (status?: string) => {
    if (!status) {
      const parsedDesc = parseRawVacancyNotice(formData.description || rawPastedNotice || '');
      const hasMulti =
        (detectedRecruitment && detectedRecruitment.departments.length >= 2) ||
        (parsedDesc.isMultiDepartment && (parsedDesc.departmentsList?.length || 0) >= 2);
      if (hasMulti) {
        await handlePublishMultiDepartmentRecruitment();
        return;
      }
    }

    onSave({
      ...formData,
      sector: isEmployer ? 'private' : formData.sector,
      location: locationWithState(formData.location, formData.state),
      jobRoles:
        formData.jobRoles && formData.jobRoles.length > 0
          ? formData.jobRoles
          : [formData.category],
      status,
    });
  };

  const stepsList = [
    { num: 1, label: 'Post & Organization' },
    { num: 2, label: 'Eligibility & Salary' },
    { num: 3, label: 'Description & Dates' },
    { num: 4, label: 'Contact & Finish' },
  ];

  return (
    <div className="jpf-container">
      <div className="jpf-card">
        {/* Header matching Image 4 */}
        <div className="jpf-header">
          <div className="jpf-header-left">
            <div className="jpf-header-icon">
              <Briefcase className="h-6 w-6" />
            </div>
            <div>
              <h1 className="jpf-header-title">Post a Job / Organization</h1>
              <p className="jpf-header-subtitle">
                Fill in the details below to post a job and reach the right candidates.
              </p>
            </div>
          </div>

          <div className="jpf-verified-badge">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-white">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div>
              <div className="jpf-verified-text-title">Verified &amp; Trusted Platform</div>
              <div className="jpf-verified-text-sub">Connect with best talent</div>
            </div>
          </div>
        </div>

        {/* Steps Navigation */}
        <div className="jpf-steps-nav">
          {stepsList.map((s) => {
            const isActive = step === s.num;
            const isCompleted = step > s.num;
            return (
              <div
                key={s.num}
                className={`jpf-step-item ${isActive ? 'is-active' : ''} ${
                  isCompleted ? 'is-completed' : ''
                }`}
              >
                <span className="jpf-step-num">
                  {isCompleted ? '✓' : s.num}
                </span>
                <span>{s.label}</span>
              </div>
            );
          })}
        </div>

        {/* Form Body */}
        <div className="jpf-body">
          {/* STEP 1: Matching Image 4 */}
          {step === 1 && (
            <>
              {/* Direct Paste Notice & Auto-Fill Feature */}
              <div className="jpf-paste-box">
                <div className="jpf-paste-header">
                  <div className="flex items-center gap-2.5">
                    <div className="jpf-paste-icon">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 m-0">
                        Direct Paste Vacancy Notice &amp; Auto-Fill
                      </h3>
                      <p className="text-xs text-slate-600 m-0 mt-0.5">
                        Paste full raw job circular text to automatically detect and populate fields.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPastePanelOpen(!pastePanelOpen)}
                    className="jpf-paste-toggle-btn"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    {pastePanelOpen ? 'Hide Paste Box' : 'Paste Notice & Auto-Fill'}
                  </button>
                </div>

                {pastePanelOpen && (
                  <div className="mt-3 pt-3 border-t border-indigo-200/80 space-y-3">
                    <textarea
                      rows={7}
                      className="jpf-paste-textarea"
                      placeholder="Paste raw advertisement / vacancy notice text here (e.g. from newspaper, WhatsApp group, PDF text, or hospital portal)..."
                      value={rawPastedNotice}
                      onChange={(e) => setRawPastedNotice(e.target.value)}
                    />

                    <div className="jpf-paste-actions-row">
                      <div className="text-xs text-slate-600 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-indigo-600" />
                        <span>Click the button to parse Title, Roles, Location, Salary, Dates, etc. into the form.</span>
                      </div>
                      <button
                        type="button"
                        disabled={!rawPastedNotice.trim()}
                        onClick={handleAutoFillFromText}
                        className="jpf-paste-autofill-btn"
                        style={{
                          backgroundColor: rawPastedNotice.trim() ? '#4338ca' : '#94a3b8',
                          color: '#ffffff',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '12px 26px',
                          borderRadius: '12px',
                          fontWeight: 750,
                          fontSize: '0.92rem',
                          cursor: rawPastedNotice.trim() ? 'pointer' : 'not-allowed',
                          boxShadow: '0 4px 16px rgba(67, 56, 202, 0.4)',
                          border: 'none',
                        }}
                      >
                        <Sparkles className="h-4 w-4" />
                        <span>✨ Detect &amp; Auto-Fill Fields</span>
                      </button>
                    </div>

                    {autoFillStats && autoFillStats.length > 0 && (
                      <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-900 flex items-start gap-2 shadow-xs">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <strong>Successfully Auto-Filled {autoFillStats.length} fields:</strong>{' '}
                          {autoFillStats.join(', ')}.
                          <div className="text-[11px] text-emerald-800 mt-1">
                            You can review and modify any field below before continuing.
                          </div>
                        </div>
                      </div>
                    )}

                    {detectedRecruitment && (
                      <div className="p-4 rounded-xl border border-blue-300 bg-gradient-to-r from-blue-50 via-indigo-50 to-sky-50 shadow-sm space-y-3">
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-lg bg-blue-600 text-white shadow-xs">
                              <Building2 className="w-5 h-5" />
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-slate-900 m-0 flex items-center gap-2">
                                <span>🏛️ Multi-Department Recruitment Detected</span>
                                <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold border border-blue-200">
                                  {detectedRecruitment.departments.length} Specialties · {detectedRecruitment.totalVacancies} Total Posts
                                </span>
                              </h4>
                              <p className="text-xs text-slate-600 m-0 mt-0.5">
                                This notice contains a breakdown across multiple medical departments. Publishing will generate the interactive <strong>Multi-Department Recruitment Explorer</strong> (with department selector sidebar and details pane, exactly like AIIMS &amp; GMC notices).
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            disabled={publishingRecruitment}
                            onClick={handlePublishMultiDepartmentRecruitment}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 shadow-md transition-all cursor-pointer disabled:opacity-50"
                          >
                            {publishingRecruitment ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Publishing Recruitment...</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-4 h-4" />
                                <span>🚀 Publish Multi-Department Recruitment &amp; View</span>
                              </>
                            )}
                          </button>
                        </div>

                        <div className="flex flex-wrap gap-2 pt-1">
                          {detectedRecruitment.departments.map((d, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white border border-blue-200 text-slate-800 shadow-2xs"
                            >
                              <span className="font-bold text-blue-700">{d.department}</span>
                              <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-900 text-[11px] font-bold">
                                {d.numberOfVacancies} {d.numberOfVacancies === 1 ? 'post' : 'posts'}
                              </span>
                              {d.category && <span className="text-[10px] text-slate-500">({d.category})</span>}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Dedicated PDF Attachment Section for Parsed / Auto-Filled Notice */}
                    <div className="p-3.5 rounded-xl border border-indigo-200 bg-white/95 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 text-xs font-bold text-indigo-950">
                          <FileText className="h-4 w-4 text-indigo-600 shrink-0" />
                          <span>Attach PDF Notice for this Parsed Post</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                            ✓ Preserves Parsed Fields
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 m-0">
                          Upload the original PDF notice. Your parsed fields above will NOT be overwritten. MedExJob logo &amp; hyperlink are added automatically.
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                        {formData.pdfFile ? (
                          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg text-xs">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                            <span className="font-semibold text-emerald-800 truncate max-w-[150px]">
                              {formData.pdfFile.name}
                            </span>
                            <span className="text-slate-400 text-[10px] shrink-0">
                              ({(formData.pdfFile.size / 1024 / 1024).toFixed(2)} MB)
                            </span>
                            <button
                              type="button"
                              onClick={() => parserPdfInputRef.current?.click()}
                              className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold underline ml-1 cursor-pointer"
                            >
                              Change
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setField('pdfFile', undefined);
                                setPdfMessage('');
                              }}
                              className="text-[11px] text-rose-600 hover:text-rose-800 font-semibold underline cursor-pointer"
                            >
                              Remove
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => parserPdfInputRef.current?.click()}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition cursor-pointer"
                          >
                            <Upload className="h-3.5 w-3.5" />
                            <span>Attach Notification PDF</span>
                          </button>
                        )}
                        <input
                          ref={parserPdfInputRef}
                          type="file"
                          accept="application/pdf,.pdf"
                          className="hidden"
                          onChange={(e) => {
                            handleAttachPdfOnly(e.target.files?.[0]);
                            e.target.value = '';
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Manual PDF Upload: Available for all jobs (Government & Private) with Automatic Website Hyperlink & Logo */}
              <div className="mb-6 rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50/60 to-indigo-50/40 p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-900">
                          Job Notification PDF Document
                        </h3>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                          ✓ MedExJob Logo &amp; Link
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        Upload job notification PDF. MedExJob logo and website hyperlink are automatically stamped into the final PDF.
                      </p>
                    </div>
                  </div>

                  {formData.pdfFile && (
                    <button
                      type="button"
                      onClick={() => {
                        setField('pdfFile', undefined);
                        setPdfExtraction(null);
                        setPdfMessage('');
                      }}
                      className="text-xs font-semibold text-rose-600 hover:text-rose-700 underline cursor-pointer"
                    >
                      Remove PDF
                    </button>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 bg-white/90 p-4 rounded-xl border border-blue-100">
                  <div className="flex-1 w-full">
                    {formData.pdfFile ? (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                          <span className="truncate">{formData.pdfFile.name}</span>
                          <span className="text-slate-400 font-normal shrink-0">
                            ({(formData.pdfFile.size / 1024 / 1024).toFixed(2)} MB)
                          </span>
                        </div>
                        <div className="text-[11px] text-emerald-700 font-medium">
                          ✓ MedExJob logo &amp; clickable website hyperlink (https://medexjob.com) will be stamped automatically. Form fields remain preserved.
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500">
                        No PDF selected yet. Upload notification PDF (Max 20 MB). MedExJob logo &amp; clickable hyperlink banner will be added automatically to each page.
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0 w-full sm:w-auto">
                    {/* Primary Button: Attach PDF (Preserves all parsed/entered fields) */}
                    <button
                      type="button"
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition cursor-pointer"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-4 w-4" />
                      <span>{formData.pdfFile ? 'Change PDF' : 'Attach PDF (Keep Details)'}</span>
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="application/pdf,.pdf"
                      className="hidden"
                      onChange={(e) => {
                        handleAttachPdfOnly(e.target.files?.[0]);
                        e.target.value = '';
                      }}
                    />

                    {/* Secondary Button: Extract & Fill with AI */}
                    <button
                      type="button"
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition cursor-pointer"
                      onClick={() => aiFileInputRef.current?.click()}
                      disabled={extractingPdf}
                      title="Extract fields from PDF with Gemini AI (Note: populates empty form fields or asks before overwrite)"
                    >
                      {extractingPdf ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
                          <span>Extracting…</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                          <span>Extract &amp; Fill with AI</span>
                        </>
                      )}
                    </button>
                    <input
                      ref={aiFileInputRef}
                      type="file"
                      accept="application/pdf,.pdf"
                      className="hidden"
                      onChange={(e) => {
                        void handlePdf(e.target.files?.[0]);
                        e.target.value = '';
                      }}
                    />
                  </div>
                </div>

                {/* If multi-vacancy PDF extracted */}
                {(pdfExtraction?.vacancies?.length || 0) > 1 && (
                  <div className="mt-3 bg-white p-3 rounded-xl border border-slate-200">
                    <Label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                      Found {pdfExtraction!.vacancies!.length} vacancies in this PDF. Select vacancy to apply:
                    </Label>
                    <Select
                      value={String(selectedVacancyIndex)}
                      onValueChange={(val) =>
                        applyExtractedVacancy(pdfExtraction!, Number(val))
                      }
                    >
                      <SelectTrigger className="bg-white border-slate-200 h-9 text-xs">
                        <SelectValue placeholder="Select vacancy row" />
                      </SelectTrigger>
                      <SelectContent>
                        {pdfExtraction!.vacancies!.map((v, i) => (
                          <SelectItem key={`${v.postName}-${i}`} value={String(i)}>
                            {v.postName || `Vacancy ${i + 1}`}
                            {v.department ? ` — ${v.department}` : ''}
                            {v.numberOfVacancies ? ` (${v.numberOfVacancies} posts)` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* PDF Feedback Messages */}
              {pdfMessage && (
                <div className="mb-4 flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-xs font-semibold text-emerald-800">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{pdfMessage}</span>
                </div>
              )}
              {pdfError && (
                <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-xs font-semibold text-red-800">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                  <span>{pdfError}</span>
                </div>
              )}

              {/* Field 1: Post Job Title * */}
              <div className="jpf-field-card">
                <div className="jpf-field-header">
                  <div className="jpf-field-badge jpf-badge--blue">
                    <Users className="h-4 w-4" />
                  </div>
                  <Label className="jpf-field-label">Post Job Title *</Label>
                </div>
                <div className="jpf-input-wrap">
                  <Briefcase className="jpf-input-icon" />
                  <input
                    type="text"
                    className="jpf-input"
                    value={formData.title}
                    onChange={(e) => setField('title', e.target.value)}
                    placeholder="e.g. Senior Resident / Specialist Consultant"
                  />
                </div>
              </div>

              {/* Field 2: Organization / Hospital * */}
              <div className="jpf-field-card">
                <div className="jpf-field-header">
                  <div className="jpf-field-badge jpf-badge--red">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <Label className="jpf-field-label">Organization / Hospital *</Label>
                </div>
                <div className="jpf-input-wrap">
                  <Building2 className="jpf-input-icon" />
                  <input
                    type="text"
                    className="jpf-input"
                    value={formData.organization}
                    onChange={(e) => setField('organization', e.target.value)}
                    placeholder="e.g. AIIMS, Apollo Hospitals, Fortis Healthcare"
                  />
                </div>
              </div>

              {/* Row 3: Job Sector * & Job Role (Multi-Select) * */}
              <div className="jpf-field-row">
                {/* Col 1: Job Sector * */}
                <div className="jpf-field-card">
                  <div className="jpf-field-header">
                    <div className="jpf-field-badge jpf-badge--green">
                      <User className="h-4 w-4" />
                    </div>
                    <Label className="jpf-field-label">Job Sector *</Label>
                  </div>
                  <div className="jpf-radio-group">
                    <label className="jpf-radio-label">
                      <input
                        type="radio"
                        name="sector"
                        value="private"
                        checked={formData.sector === 'private'}
                        onChange={() => setField('sector', 'private')}
                        className="jpf-radio-input"
                      />
                      <span>Private</span>
                    </label>
                    <label
                      className={`jpf-radio-label ${
                        isEmployer ? 'opacity-60 cursor-not-allowed' : ''
                      }`}
                    >
                      <input
                        type="radio"
                        name="sector"
                        value="government"
                        checked={formData.sector === 'government'}
                        disabled={isEmployer}
                        onChange={() => !isEmployer && setField('sector', 'government')}
                        className="jpf-radio-input"
                      />
                      <span>Govt &amp; Admin only</span>
                    </label>
                  </div>
                </div>

                {/* Col 2: Job Role (Multi-Select) * */}
                <div className="jpf-field-card">
                  <div className="jpf-field-header justify-between">
                    <div className="flex items-center gap-2">
                      <div className="jpf-field-badge jpf-badge--purple">
                        <UserCheck className="h-4 w-4" />
                      </div>
                      <Label className="jpf-field-label">Job Roles (Multi-Select) *</Label>
                    </div>
                    <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                      {(formData.jobRoles || [formData.category]).length} selected
                    </span>
                  </div>

                  {/* Selected tags */}
                  <div className="flex flex-wrap gap-1.5 mb-2.5 min-h-[34px] p-2 bg-slate-50 rounded-lg border border-slate-200">
                    {(formData.jobRoles && formData.jobRoles.length > 0
                      ? formData.jobRoles
                      : [formData.category]
                    ).map((role) => (
                      <span
                        key={role}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200"
                      >
                        {role}
                        <button
                          type="button"
                          onClick={() => toggleRole(role)}
                          className="hover:text-rose-600 text-indigo-600 ml-0.5 font-bold cursor-pointer"
                          title="Remove role"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>

                  {/* Quick Toggle Role Pills */}
                  <div>
                    <div className="text-[11px] font-medium text-slate-500 mb-1.5">
                      Click to toggle roles:
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                      {jobCategories.map((cat) => {
                        const isSelected = (
                          formData.jobRoles || [formData.category]
                        ).includes(cat);
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => toggleRole(cat)}
                            className={`text-xs px-2.5 py-1 rounded-full border font-medium transition cursor-pointer ${
                              isSelected
                                ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                            }`}
                          >
                            {isSelected ? '✓ ' : '+ '}
                            {cat}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 4: Location * & State * */}
              <div className="jpf-field-row">
                {/* Col 1: Location * */}
                <div className="jpf-field-card">
                  <div className="jpf-field-header">
                    <div className="jpf-field-badge jpf-badge--blue">
                      <MapPin className="h-4 w-4" />
                    </div>
                    <Label className="jpf-field-label">Location *</Label>
                  </div>
                  <div className="jpf-input-wrap">
                    <MapPin className="jpf-input-icon" />
                    <input
                      type="text"
                      className="jpf-input"
                      value={formData.location}
                      onChange={(e) => {
                        setField('location', e.target.value);
                        if (!formData.state) {
                          const detected = inferState(e.target.value);
                          if (detected) setField('state', detected);
                        }
                      }}
                      placeholder="e.g. Gorakhpur"
                    />
                  </div>
                </div>

                {/* Col 2: State * */}
                <div className="jpf-field-card">
                  <div className="jpf-field-header">
                    <div className="jpf-field-badge jpf-badge--teal">
                      <Compass className="h-4 w-4" />
                    </div>
                    <Label className="jpf-field-label">State *</Label>
                  </div>
                  <Select
                    value={formData.state}
                    onValueChange={(val) => setField('state', val)}
                  >
                    <SelectTrigger className="bg-white border-slate-200 h-[42px] rounded-lg">
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      {INDIAN_STATES.map((st) => (
                        <SelectItem key={st} value={st}>
                          {st}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}

          {/* STEP 2: Eligibility & Vacancy Details */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="jpf-field-row">
                <div className="jpf-field-card">
                  <div className="jpf-field-header">
                    <div className="jpf-field-badge jpf-badge--purple">
                      <GraduationCap className="h-4 w-4" />
                    </div>
                    <Label className="jpf-field-label">Qualification *</Label>
                  </div>
                  <div className="jpf-input-wrap">
                    <input
                      type="text"
                      className="jpf-input jpf-input-noicon"
                      value={formData.qualification}
                      onChange={(e) => setField('qualification', e.target.value)}
                      placeholder="e.g. MD / MS / DNB / MBBS"
                    />
                  </div>
                </div>

                <div className="jpf-field-card">
                  <div className="jpf-field-header">
                    <div className="jpf-field-badge jpf-badge--purple">
                      <Briefcase className="h-4 w-4" />
                    </div>
                    <Label className="jpf-field-label">Experience</Label>
                  </div>
                  <div className="jpf-input-wrap">
                    <input
                      type="text"
                      className="jpf-input jpf-input-noicon"
                      value={formData.experience}
                      onChange={(e) => setField('experience', e.target.value)}
                      placeholder="e.g. 1-3 years / Freshers"
                    />
                  </div>
                </div>
              </div>

              <div className="jpf-field-row">
                <div className="jpf-field-card">
                  <div className="jpf-field-header">
                    <div className="jpf-field-badge jpf-badge--purple">
                      <Award className="h-4 w-4" />
                    </div>
                    <Label className="jpf-field-label">Experience Level</Label>
                  </div>
                  <Select
                    value={formData.experienceLevel}
                    onValueChange={(val: JobFormData['experienceLevel']) =>
                      setField('experienceLevel', val)
                    }
                  >
                    <SelectTrigger className="bg-white border-slate-200 h-[42px] rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="entry">Entry Level</SelectItem>
                      <SelectItem value="mid">Mid Level</SelectItem>
                      <SelectItem value="senior">Senior Level</SelectItem>
                      <SelectItem value="executive">Executive Level</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="jpf-field-card">
                  <div className="jpf-field-header">
                    <div className="jpf-field-badge jpf-badge--purple">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <Label className="jpf-field-label">Speciality / Department</Label>
                  </div>
                  <div className="jpf-input-wrap">
                    <input
                      type="text"
                      className="jpf-input jpf-input-noicon"
                      value={formData.speciality}
                      onChange={(e) => setField('speciality', e.target.value)}
                      placeholder="e.g. Cardiology / General Medicine"
                    />
                  </div>
                </div>
              </div>

              <div className="jpf-field-row">
                <div className="jpf-field-card">
                  <div className="jpf-field-header">
                    <div className="jpf-field-badge jpf-badge--blue">
                      <Clock className="h-4 w-4" />
                    </div>
                    <Label className="jpf-field-label">Employment Type</Label>
                  </div>
                  <Select
                    value={formData.dutyType}
                    onValueChange={(val: JobFormData['dutyType']) => setField('dutyType', val)}
                  >
                    <SelectTrigger className="bg-white border-slate-200 h-[42px] rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full_time">Full Time</SelectItem>
                      <SelectItem value="part_time">Part Time</SelectItem>
                      <SelectItem value="contract">Contract</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="jpf-field-row">
                  <div className="jpf-field-card">
                    <div className="jpf-field-header">
                      <div className="jpf-field-badge jpf-badge--green">
                        <Users className="h-4 w-4" />
                      </div>
                      <Label className="jpf-field-label">Number of Posts</Label>
                    </div>
                    <div className="jpf-input-wrap">
                      <input
                        type="number"
                        min="1"
                        className="jpf-input jpf-input-noicon"
                        value={formData.numberOfPosts ?? ''}
                        onChange={(e) =>
                          setField(
                            'numberOfPosts',
                            e.target.value ? Number(e.target.value) : undefined
                          )
                        }
                        placeholder="e.g. 10"
                      />
                    </div>
                  </div>

                  <div className="jpf-field-card">
                    <div className="jpf-field-header">
                      <div className="jpf-field-badge jpf-badge--amber">
                        <DollarSign className="h-4 w-4" />
                      </div>
                      <Label className="jpf-field-label">Salary / Pay</Label>
                    </div>
                    <div className="jpf-input-wrap">
                      <input
                        type="text"
                        className="jpf-input jpf-input-noicon"
                        value={formData.salary}
                        onChange={(e) => setField('salary', e.target.value)}
                        placeholder="e.g. 56000 or ₹12-15 LPA"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="jpf-field-card">
                <div className="jpf-field-header">
                  <div className="jpf-field-badge jpf-badge--purple">
                    <FileText className="h-4 w-4" />
                  </div>
                  <Label className="jpf-field-label">Additional Eligibility &amp; Requirements</Label>
                </div>
                <textarea
                  rows={3}
                  className="jpf-textarea"
                  value={formData.requirements}
                  onChange={(e) => setField('requirements', e.target.value)}
                  placeholder="Age limit, specific skills, certifications, registration requirements..."
                />
              </div>

              <div className="jpf-field-card">
                <div className="jpf-field-header">
                  <div className="jpf-field-badge jpf-badge--green">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <Label className="jpf-field-label">Benefits &amp; Perks</Label>
                </div>
                <textarea
                  rows={2}
                  className="jpf-textarea"
                  value={formData.benefits}
                  onChange={(e) => setField('benefits', e.target.value)}
                  placeholder="Accommodation, PF, health insurance, annual leave..."
                />
              </div>
            </div>
          )}

          {/* STEP 3: Job Description & Application */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="jpf-field-card">
                <div className="jpf-field-header justify-between">
                  <div className="flex items-center gap-2">
                    <div className="jpf-field-badge jpf-badge--blue">
                      <FileText className="h-4 w-4" />
                    </div>
                    <Label className="jpf-field-label">Job Description *</Label>
                  </div>
                  <span className="text-[11px] font-medium text-slate-500">
                    {formData.description.length} chars &bull;{' '}
                    {formData.description.trim()
                      ? formData.description.trim().split(/\s+/).length
                      : 0}{' '}
                    words (Unlimited, formatting preserved)
                  </span>
                </div>
                <textarea
                  rows={14}
                  className="jpf-textarea font-sans text-sm leading-relaxed"
                  value={formData.description}
                  onChange={(e) => setField('description', e.target.value)}
                  placeholder="Role overview, responsibilities, eligibility details, vacancies breakdown, selection process, and application instructions. 15-30+ lines supported with full line breaks and spacing preserved..."
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  Tip: Multiple paragraphs and line breaks are fully preserved on the live job details page.
                </p>
              </div>

              <div className="jpf-field-row">
                <div className="jpf-field-card">
                  <div className="jpf-field-header">
                    <div className="jpf-field-badge jpf-badge--rose">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <Label className="jpf-field-label">Last Date to Apply *</Label>
                  </div>
                  <div className="jpf-input-wrap">
                    <input
                      type="date"
                      className="jpf-input jpf-input-noicon"
                      value={formData.lastDate}
                      onChange={(e) => setField('lastDate', e.target.value)}
                    />
                  </div>
                </div>

                <div className="jpf-field-card">
                  <div className="jpf-field-header">
                    <div className="jpf-field-badge jpf-badge--blue">
                      <ExternalLink className="h-4 w-4" />
                    </div>
                    <Label className="jpf-field-label">
                      {formData.sector === 'government'
                        ? 'Official Apply Link (if online)'
                        : 'External Apply Link (optional)'}
                    </Label>
                  </div>
                  <div className="jpf-input-wrap">
                    <input
                      type="text"
                      className="jpf-input jpf-input-noicon"
                      value={formData.applyLink || ''}
                      onChange={(e) => setField('applyLink', e.target.value)}
                      placeholder="https://..."
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Contact & Finish */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="jpf-field-row">
                <div className="jpf-field-card">
                  <div className="jpf-field-header">
                    <div className="jpf-field-badge jpf-badge--green">
                      <Mail className="h-4 w-4" />
                    </div>
                    <Label className="jpf-field-label">Contact Email</Label>
                  </div>
                  <div className="jpf-input-wrap">
                    <input
                      type="email"
                      className="jpf-input jpf-input-noicon"
                      value={formData.contactEmail}
                      onChange={(e) => setField('contactEmail', e.target.value)}
                      placeholder="hr@hospital.com"
                    />
                  </div>
                </div>

                <div className="jpf-field-card">
                  <div className="jpf-field-header">
                    <div className="jpf-field-badge jpf-badge--green">
                      <Phone className="h-4 w-4" />
                    </div>
                    <Label className="jpf-field-label">Contact Phone</Label>
                  </div>
                  <div className="jpf-input-wrap">
                    <input
                      type="tel"
                      className="jpf-input jpf-input-noicon"
                      value={formData.contactPhone}
                      onChange={(e) => setField('contactPhone', e.target.value)}
                      placeholder="+91 98765 43210"
                    />
                  </div>
                </div>
              </div>

              <div className="jpf-field-card">
                <div className="jpf-field-header">
                  <div className="jpf-field-badge jpf-badge--blue">
                    <ImageIcon className="h-4 w-4" />
                  </div>
                  <Label className="jpf-field-label">Job / Hospital Image or Banner</Label>
                </div>
                <div className="jpf-input-wrap">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="p-2 text-sm text-slate-600"
                    onChange={(e) => setField('imageFile', e.target.files?.[0])}
                  />
                </div>
              </div>

              {/* Review card */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5">
                <h3 className="text-sm font-bold text-slate-900 mb-3">Job Posting Summary</h3>
                <div className="grid grid-cols-2 gap-3 text-xs text-slate-700 sm:grid-cols-4">
                  <div>
                    <span className="text-slate-400 block">Post Title</span>
                    <strong className="text-slate-900">{formData.title || '—'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Organization</span>
                    <strong className="text-slate-900">{formData.organization || '—'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Sector</span>
                    <strong className="text-slate-900">
                      {isEmployer ? 'Private' : formData.sector}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Location</span>
                    <strong className="text-slate-900">
                      {locationWithState(formData.location, formData.state) || '—'}
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions matching Image 4 */}
        <div className="jpf-footer">
          <div>
            <button type="button" className="jpf-btn-cancel" onClick={onCancel}>
              <X className="h-4 w-4" />
              Cancel
            </button>
            {step > 1 && (
              <button
                type="button"
                className="jpf-btn-back"
                onClick={() => setStep((v) => v - 1)}
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {detectedRecruitment && (
              <button
                type="button"
                disabled={publishingRecruitment}
                onClick={handlePublishMultiDepartmentRecruitment}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {publishingRecruitment ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Publishing Recruitment...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>🚀 Publish Multi-Department Recruitment ({detectedRecruitment.departments.length} Depts)</span>
                  </>
                )}
              </button>
            )}

            {step === 4 && (
              <button
                type="button"
                className="jpf-btn-cancel"
                onClick={() => save('draft')}
              >
                <Save className="h-4 w-4" />
                Save Draft
              </button>
            )}

            {step < 4 ? (
              <button
                type="button"
                className="jpf-btn-continue"
                disabled={!stepValid}
                onClick={() => setStep((v) => v + 1)}
              >
                <span>Continue</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                className="jpf-btn-submit"
                disabled={publishingRecruitment}
                onClick={() => save()}
              >
                {publishingRecruitment ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Publishing Recruitment...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>
                      {initialData
                        ? 'Update Job'
                        : (detectedRecruitment && detectedRecruitment.departments.length >= 2) ||
                          (parseRawVacancyNotice(formData.description || rawPastedNotice || '').departmentsList?.length || 0) >= 2
                        ? `🚀 Publish Recruitment (${
                            detectedRecruitment?.departments.length ||
                            parseRawVacancyNotice(formData.description || rawPastedNotice || '').departmentsList?.length
                          } Depts)`
                        : 'Post Job'}
                    </span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
