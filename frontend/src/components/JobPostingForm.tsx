import { useEffect, useState, useRef } from 'react';
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
  buildStructuredJobDescription,
  cardFieldText,
  cardSalaryText,
  leftoverEligibilityNotes,
} from '../utils/extractedFieldDisplay';
import '../styles/job-posting-template.css';

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
  pdfFile?: File;
  imageFile?: File;
  status?: string;
}

const jobCategories: JobCategory[] = [
  'Medical Officer',
  'Junior Resident',
  'Senior Resident',
  'Specialist',
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

const defaultData: JobFormData = {
  title: '',
  organization: '',
  sector: 'private',
  category: 'Medical Officer',
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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const secondaryFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!initialData) return;
    setFormData((p) => {
      const m = { ...p, ...initialData } as JobFormData;
      return {
        ...m,
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

  const handlePdf = async (file?: File) => {
    setField('pdfFile', file);
    setPdfError('');
    setPdfMessage('');
    setPdfExtraction(null);
    setSelectedVacancyIndex(0);
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setPdfError('Please select a PDF file.');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setPdfError('PDF must be 20 MB or smaller.');
      return;
    }

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

  const save = (status?: string) =>
    onSave({
      ...formData,
      sector: isEmployer ? 'private' : formData.sector,
      location: locationWithState(formData.location, formData.state),
      status,
    });

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
              {/* Top 3 Upload Cards */}
              <div className="jpf-upload-grid">
                {/* Card 1: Post & Organization Upload */}
                <div className="jpf-top-card">
                  <div className="jpf-top-card-header">
                    <div className="jpf-top-badge jpf-top-badge--purple">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="jpf-top-card-title">Post &amp; Organization *</div>
                      <div className="jpf-top-card-sub">
                        Upload the official notice and review the character details.
                      </div>
                    </div>
                  </div>

                  <div className="jpf-dropzone">
                    <CloudUpload className="jpf-dropzone-icon" />
                    <div className="jpf-dropzone-prompt">
                      {formData.pdfFile ? formData.pdfFile.name : 'Choose PDF / Image File'}
                    </div>
                    <div className="jpf-dropzone-limit">(Max 5 MB)</div>

                    <button
                      type="button"
                      className="jpf-btn-upload"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={extractingPdf}
                    >
                      {extractingPdf ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Extracting…
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4" />
                          {formData.pdfFile ? 'Change File' : 'Upload File'}
                        </>
                      )}
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="application/pdf,.pdf,image/png,image/jpeg"
                      className="hidden"
                      onChange={(e) => void handlePdf(e.target.files?.[0])}
                    />
                  </div>
                </div>

                {/* Card 2: Choose PDF / Vacancy Selector */}
                <div className="jpf-top-card">
                  <div className="jpf-top-card-header">
                    <div className="jpf-top-badge jpf-top-badge--orange">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="jpf-top-card-title">Choose PDF *</div>
                      <div className="jpf-top-card-sub">Select the file for your job notice</div>
                    </div>
                  </div>

                  <div>
                    {(pdfExtraction?.vacancies?.length || 0) > 1 ? (
                      <div>
                        <Label className="text-xs font-semibold text-slate-700 mb-1 block">
                          Extracted Vacancies
                        </Label>
                        <Select
                          value={String(selectedVacancyIndex)}
                          onValueChange={(val) =>
                            applyExtractedVacancy(pdfExtraction!, Number(val))
                          }
                        >
                          <SelectTrigger className="bg-white border-slate-200">
                            <SelectValue placeholder="Select vacancy" />
                          </SelectTrigger>
                          <SelectContent>
                            {pdfExtraction!.vacancies!.map((v, i) => (
                              <SelectItem key={`${v.postName}-${i}`} value={String(i)}>
                                {v.postName || `Vacancy ${i + 1}`}
                                {v.department ? ` — ${v.department}` : ''}
                                {v.numberOfVacancies ? ` (${v.numberOfVacancies})` : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <Select
                        value={formData.pdfFile?.name ? 'selected' : ''}
                        onValueChange={() => fileInputRef.current?.click()}
                      >
                        <SelectTrigger className="bg-white border-slate-200">
                          <SelectValue placeholder={formData.pdfFile?.name || 'Select PDF'} />
                        </SelectTrigger>
                        <SelectContent>
                          {formData.pdfFile && (
                            <SelectItem value="selected">{formData.pdfFile.name}</SelectItem>
                          )}
                          <SelectItem value="upload_new">+ Choose another PDF</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>

                {/* Card 3: Choose File */}
                <div className="jpf-top-card">
                  <div className="jpf-top-card-header">
                    <div className="jpf-top-badge jpf-top-badge--teal">
                      <Folder className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="jpf-top-card-title">Choose File *</div>
                      <div className="jpf-top-card-sub">
                        {formData.imageFile
                          ? formData.imageFile.name
                          : formData.pdfFile
                          ? formData.pdfFile.name
                          : 'No file selected'}
                      </div>
                    </div>
                  </div>

                  <div>
                    <button
                      type="button"
                      className="jpf-btn-choose-file"
                      onClick={() => secondaryFileInputRef.current?.click()}
                    >
                      <span className="truncate">
                        {formData.imageFile ? formData.imageFile.name : 'Choose File'}
                      </span>
                      <Upload className="h-4 w-4 text-slate-400 shrink-0 ml-2" />
                    </button>
                    <input
                      ref={secondaryFileInputRef}
                      type="file"
                      accept="image/*,application/pdf"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.type.startsWith('image/')) {
                            setField('imageFile', file);
                          } else {
                            void handlePdf(file);
                          }
                        }
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* PDF Feedback Messages */}
              {pdfMessage && (
                <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-xs font-semibold text-emerald-800">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{pdfMessage}</span>
                </div>
              )}
              {pdfError && (
                <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-xs font-semibold text-red-800">
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
                    placeholder="e.g. Senior Resident"
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
                    placeholder="e.g. AIIMS, Gorakhpur"
                  />
                </div>
              </div>

              {/* Row 3: Job Sector * & Job Role / Category * */}
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

                {/* Col 2: Job Role / Category * */}
                <div className="jpf-field-card">
                  <div className="jpf-field-header">
                    <div className="jpf-field-badge jpf-badge--purple">
                      <UserCheck className="h-4 w-4" />
                    </div>
                    <Label className="jpf-field-label">Job Role / Category *</Label>
                  </div>
                  <Select
                    value={formData.category}
                    onValueChange={(val: JobCategory) => setField('category', val)}
                  >
                    <SelectTrigger className="bg-white border-slate-200 h-[42px] rounded-lg">
                      <SelectValue placeholder="Select role / category" />
                    </SelectTrigger>
                    <SelectContent>
                      {jobCategories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                <div className="jpf-field-header">
                  <div className="jpf-field-badge jpf-badge--blue">
                    <FileText className="h-4 w-4" />
                  </div>
                  <Label className="jpf-field-label">Job Description *</Label>
                </div>
                <textarea
                  rows={10}
                  className="jpf-textarea"
                  value={formData.description}
                  onChange={(e) => setField('description', e.target.value)}
                  placeholder="Role overview, key responsibilities, qualifications, selection process, and application instructions..."
                />
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

          <div className="flex items-center gap-2">
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
                onClick={() => save()}
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>{initialData ? 'Update Job' : 'Post Job'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
