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

function parseRawVacancyNotice(rawText: string): Partial<JobFormData> {
  const text = rawText.trim();
  const result: Partial<JobFormData> = {
    description: text,
  };

  // 1. Job Roles detection (Multi-role support)
  const detectedRoles: string[] = [];
  const roleKeywords: Array<{ role: JobCategory; regex: RegExp }> = [
    { role: 'Consultant', regex: /\b(consultant|sr\.\s*consultant)\b/i },
    { role: 'GDMO', regex: /\b(gdmo|general\s+duty\s+medical\s+officer)\b/i },
    { role: 'Senior Resident', regex: /\b(senior\s+resident|sr\b|sr\.)/i },
    { role: 'Junior Resident', regex: /\b(junior\s+resident|jr\b|jr\.)/i },
    { role: 'Medical Officer', regex: /\b(medical\s+officer|mo\b)/i },
    { role: 'Specialist', regex: /\b(specialist|super\s*specialist)\b/i },
    { role: 'Faculty', regex: /\b(faculty|professor|assoc\w*\s+professor|asst\w*\s+professor|assistant\s+professor|tutor|lecturer)\b/i },
    { role: 'Dental', regex: /\b(dental|dentist|bds|mds)\b/i },
    { role: 'AYUSH', regex: /\b(ayush|ayurved\w*|homeopath\w*|unani|siddha|bams|bhms)\b/i },
    { role: 'Nursing', regex: /\b(nurs\w*|staff\s*nurse|sister\s*tutor|gnm|b\.sc\s*nurs\w*)\b/i },
    { role: 'Pharmacy', regex: /\b(pharmac\w*|b\.pharm|d\.pharm)\b/i },
    { role: 'Paramedical', regex: /\b(paramedic\w*|lab\s*tech\w*|radiograph\w*|x-ray\s*tech\w*|ecg\s*tech\w*|ot\s*tech\w*)\b/i },
    { role: 'Allied Health', regex: /\b(allied\s*health|physiotherap\w*|occupational\s*therap\w*)\b/i },
    { role: 'Psychology & Mental Health', regex: /\b(psycholog\w*|psychiatr\w*|mental\s*health|counselor)\b/i },
    { role: 'Nutrition & Dietetics', regex: /\b(dieti\w*|nutrition\w*)\b/i },
    { role: 'Hospital Administration', regex: /\b(hospital\s*admin\w*|medical\s*superintendent|healthcare\s*admin\w*)\b/i },
    { role: 'Public Health', regex: /\b(public\s*health|epidemiolog\w*|mph\b)\b/i },
    { role: 'Life Science & Research', regex: /\b(life\s*science|research\s*officer|research\s*associate|jrf\b|srf\b)\b/i },
  ];

  for (const r of roleKeywords) {
    if (r.regex.test(text) && !detectedRoles.includes(r.role)) {
      detectedRoles.push(r.role);
    }
  }

  if (detectedRoles.length > 0) {
    result.jobRoles = detectedRoles;
    result.category = detectedRoles[0] as JobCategory;
  }

  // 2. Organization detection
  const orgMatch = text.match(/(?:at|in|by|for)\s+([A-Z][A-Za-z0-9&., ]{3,55}(?:Hospital|Institute|AIIMS|Medical College|Health Centre|Clinic|Healthcare|Infirmary|Trust|Foundation|Council|University|Directorate))/i)
    || text.match(/([A-Z][A-Za-z0-9&., ]{2,50}(?:Hospital|Medical College|AIIMS|PGIMER|ESIC|Health City|Heart Institute))/i);
  if (orgMatch) {
    result.organization = orgMatch[1].trim();
  }

  // 3. Post Title detection
  const titleMatch = text.match(/(?:post(?:s)?(?:\s+of|\s*[:-])|recruitment\s+(?:of|for)|walk-in(?:\s+interview)?\s+(?:for)?|applications\s+invited\s+for(?:\s+the\s+post\s+of)?)\s*[:\-]?\s*([A-Za-z0-9&/,\- ]{4,80})/i);
  if (titleMatch) {
    result.title = titleMatch[1].trim().split(/\n|\r/)[0].replace(/^(the\s+post\s+of\s+)/i, '');
  } else if (detectedRoles.length > 0) {
    result.title = detectedRoles.slice(0, 3).join(' / ');
  }

  // 4. Sector detection
  if (/government|govt\.|ministry|nhm|national health mission|aiims|esic|railway|psc|upsc|sams|state health/i.test(text)) {
    result.sector = 'government';
  } else {
    result.sector = 'private';
  }

  // 5. Location & State detection
  for (const state of INDIAN_STATES) {
    const reg = new RegExp(`\\b${state}\\b`, 'i');
    if (reg.test(text)) {
      result.state = state;
      const locMatch = text.match(new RegExp(`([A-Za-z]+)(?:\\s*,?\\s*${state})`, 'i'));
      result.location = locMatch ? locMatch[1].trim() : state;
      break;
    }
  }
  if (!result.location) {
    const cityKeywords = ['Delhi', 'Mumbai', 'Bengaluru', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad', 'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow', 'Kanpur', 'Nagpur', 'Indore', 'Bhopal', 'Patna', 'Vadodara', 'Ghaziabad', 'Ludhiana', 'Agra', 'Nashik', 'Faridabad', 'Meerut', 'Rajkot', 'Varanasi', 'Srinagar', 'Aurangabad', 'Dhanbad', 'Amritsar', 'Navi Mumbai', 'Allahabad', 'Prayagraj', 'Ranchi', 'Howrah', 'Coimbatore', 'Jabalpur', 'Gwalior', 'Vijayawada', 'Jodhpur', 'Madurai', 'Raipur', 'Kota', 'Guwahati', 'Chandigarh', 'Noida', 'Gorakhpur', 'Rishikesh', 'Dehradun', 'Bhubaneswar', 'Gurgaon', 'Gurugram'];
    for (const city of cityKeywords) {
      if (new RegExp(`\\b${city}\\b`, 'i').test(text)) {
        result.location = city;
        result.state = inferState(city) || '';
        break;
      }
    }
  }

  // 6. Qualification detection
  const qualMatches: string[] = [];
  const qualRegexes = [
    /\b(DM|MCh|DNB|MD|MS|MBBS|BDS|MDS|BAMS|BHMS|BUMS|BPT|MPT|B\.?Sc\s+Nursing|M\.?Sc\s+Nursing|GNM|ANM|B\.?Pharm|M\.?Pharm|Pharm\.?D|DMLT|BMLT)\b/gi
  ];
  for (const qr of qualRegexes) {
    const matches = text.match(qr);
    if (matches) {
      for (const m of matches) {
        const u = m.toUpperCase().replace(/\s+/g, ' ');
        if (!qualMatches.includes(u)) qualMatches.push(u);
      }
    }
  }
  if (qualMatches.length > 0) {
    result.qualification = qualMatches.join(' / ');
  }

  // 7. Experience detection
  const expMatch = text.match(/(?:experience|exp\.)\s*[:\-]?\s*([0-9]+(?:\s*-\s*[0-9]+)?\s*(?:years?|yrs?|months?))/i)
    || text.match(/([0-9]+\s*(?:to|-)\s*[0-9]+\s*(?:years?|yrs?)\s*(?:of\s*)?experience)/i)
    || text.match(/\b(freshers?\s*(?:can\s*apply|welcome)?)\b/i);
  if (expMatch) {
    result.experience = expMatch[1].trim();
  }

  // 8. Number of Posts detection
  const postCountMatch = text.match(/(?:no\.\s*of\s*(?:posts?|vacanc(?:y|ies))|total\s*(?:posts?|vacanc(?:y|ies))|vacanc(?:y|ies))\s*[:\-]?\s*([0-9]{1,4})/i)
    || text.match(/([0-9]{1,4})\s+(?:posts?|vacanc(?:y|ies))/i);
  if (postCountMatch) {
    const n = parseInt(postCountMatch[1], 10);
    if (!isNaN(n) && n > 0 && n < 100000) {
      result.numberOfPosts = n;
    }
  }

  // 9. Salary detection
  const salMatch = text.match(/(?:salary|pay\s*scale|remuneration|stipend|ctc|package)\s*[:\-]?\s*(₹?\s*[0-9]+(?:,[0-9]+)*(?:\s*-\s*₹?\s*[0-9]+(?:,[0-9]+)*)?(?:\s*(?:\/|\s*per\s*)(?:month|pm|annum|year|lpa))?)/i)
    || text.match(/(₹\s*[0-9]+(?:,[0-9]+)*(?:\s*-\s*₹?\s*[0-9]+(?:,[0-9]+)*)?)/)
    || text.match(/([0-9]+(?:[.,][0-9]+)?\s*(?:to|-)\s*[0-9]+(?:[.,][0-9]+)?\s*(?:lpa|lakhs?|lac))/i)
    || text.match(/(level\s*[- ]\s*[0-9]{1,2}(?:\s*as\s*per\s*7th\s*cpc)?)/i);
  if (salMatch) {
    result.salary = salMatch[1].trim();
  }

  // 10. Last date / Interview date detection
  const lastDateMatch = text.match(/(?:last\s*date(?:\s*for\s*(?:submission|application|apply))?|closing\s*date|apply\s*before|walk-in\s*interview\s*(?:on|date))\s*[:\-]?\s*([0-9]{1,2}[./-][0-9]{1,2}[./-][0-9]{2,4}|[0-9]{1,2}(?:st|nd|rd|th)?\s+(?:Jan\w*|Feb\w*|Mar\w*|Apr\w*|May|Jun\w*|Jul\w*|Aug\w*|Sep\w*|Oct\w*|Nov\w*|Dec\w*)\s*,?\s*[0-9]{4})/i);
  if (lastDateMatch) {
    const rawDate = lastDateMatch[1].trim();
    try {
      const dmy = rawDate.match(/^([0-9]{1,2})[./-]([0-9]{1,2})[./-]([0-9]{4})$/);
      if (dmy) {
        result.lastDate = `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
      } else {
        const parsed = new Date(rawDate);
        if (!isNaN(parsed.getTime())) {
          result.lastDate = parsed.toISOString().split('T')[0];
        }
      }
    } catch (_) {}
  }

  // 11. Contact Email & Phone
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) {
    result.contactEmail = emailMatch[0];
  }
  const phoneMatch = text.match(/(?:\+91[\s-]?)?[6-9][0-9]{9}/);
  if (phoneMatch) {
    result.contactPhone = phoneMatch[0];
  }

  // 12. External Apply Link
  const linkMatch = text.match(/https?:\/\/[^\s]+/);
  if (linkMatch) {
    result.applyLink = linkMatch[0];
  }

  return result;
}

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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const secondaryFileInputRef = useRef<HTMLInputElement>(null);

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
      // Preserve full raw description
      next.description = rawPastedNotice;
      populated.push('Full Description (Preserved)');

      return next;
    });

    setAutoFillStats(populated);
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
      jobRoles:
        formData.jobRoles && formData.jobRoles.length > 0
          ? formData.jobRoles
          : [formData.category],
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
              {/* Direct Paste Notice & Auto-Fill Feature */}
              <div className="mb-6 rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50/90 via-purple-50/60 to-blue-50/70 p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-xs">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Direct Paste Vacancy Notice &amp; Auto-Fill
                      </h3>
                      <p className="text-xs text-slate-600">
                        Paste full raw job circular text to automatically detect and populate fields.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPastePanelOpen(!pastePanelOpen)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 transition shadow-2xs cursor-pointer"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    {pastePanelOpen ? 'Hide Paste Box' : 'Paste Notice & Auto-Fill'}
                  </button>
                </div>

                {pastePanelOpen && (
                  <div className="mt-3 pt-3 border-t border-indigo-100/80 space-y-3">
                    <textarea
                      rows={6}
                      className="w-full text-xs font-mono p-3 bg-white rounded-xl border border-indigo-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800 shadow-inner"
                      placeholder="Paste raw advertisement / vacancy notice text here (e.g. from newspaper, WhatsApp group, PDF text, or hospital portal)..."
                      value={rawPastedNotice}
                      onChange={(e) => setRawPastedNotice(e.target.value)}
                    />

                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[11px] text-slate-500">
                        Format, spacing, and all line breaks will be preserved in Job Description.
                      </span>
                      <button
                        type="button"
                        disabled={!rawPastedNotice.trim()}
                        onClick={handleAutoFillFromText}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 disabled:opacity-50 transition shadow-sm cursor-pointer"
                      >
                        <Sparkles className="h-4 w-4" />
                        Detect &amp; Auto-Fill Fields
                      </button>
                    </div>

                    {autoFillStats && autoFillStats.length > 0 && (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <strong>Successfully Auto-Filled {autoFillStats.length} fields:</strong>{' '}
                          {autoFillStats.join(', ')}.
                          <div className="text-[11px] text-emerald-700 mt-0.5">
                            You can review and modify any field below before submitting.
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Simplified PDF Upload: Only for Government Jobs, completely omitted for Private */}
              {formData.sector === 'government' ? (
                <div className="mb-6 rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50/60 to-indigo-50/40 p-5 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900">
                            Government Official Vacancy PDF
                          </h3>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                            Govt Job Notice
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          Upload the official recruitment PDF notification to auto-extract details.
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
                        className="text-xs font-semibold text-rose-600 hover:text-rose-700 underline"
                      >
                        Remove PDF
                      </button>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-3 bg-white/90 p-4 rounded-xl border border-blue-100">
                    <div className="flex-1 w-full">
                      {formData.pdfFile ? (
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                          <span className="truncate">{formData.pdfFile.name}</span>
                          <span className="text-slate-400 font-normal shrink-0">
                            ({(formData.pdfFile.size / 1024 / 1024).toFixed(2)} MB)
                          </span>
                        </div>
                      ) : (
                        <div className="text-xs text-slate-500">
                          No PDF selected yet. Single clean PDF upload (Max 20 MB).
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                      <button
                        type="button"
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition cursor-pointer"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={extractingPdf}
                      >
                        {extractingPdf ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Extracting with AI…</span>
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4" />
                            <span>{formData.pdfFile ? 'Change PDF' : 'Upload PDF Notice'}</span>
                          </>
                        )}
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="application/pdf,.pdf"
                        className="hidden"
                        onChange={(e) => void handlePdf(e.target.files?.[0])}
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
              ) : null}

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
