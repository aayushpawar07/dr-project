import { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  DollarSign,
  Eye,
  FileText,
  GraduationCap,
  Loader2,
  MapPin,
  Save,
  Upload,
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Card } from "./ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { Alert, AlertDescription } from "./ui/alert";
import { JobCategory, JobSector } from "../types";
import { useAuth } from "../contexts/AuthContext";
import {
  getCurrentSubscription,
  SubscriptionResponse,
} from "../api/subscriptions";
import {
  extractJobTemplateFromPdf,
  JobTemplateExtractionResponse,
  JobTemplateVacancyExtraction,
} from "../api/jobTemplateExtraction";

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
  qualification: string;
  experience: string;
  experienceLevel: "entry" | "mid" | "senior" | "executive";
  speciality: string;
  dutyType: "full_time" | "part_time" | "contract";
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
}

const jobCategories: JobCategory[] = [
  "Medical Officer",
  "Junior Resident",
  "Senior Resident",
  "Specialist",
  "Faculty",
  "Dental",
  "AYUSH",
  "Nursing",
  "Paramedical",
  "Allied Health",
  "Pharmacy",
  "Psychology & Mental Health",
  "Nutrition & Dietetics",
  "Life Science & Research",
  "Hospital Administration",
  "Public Health",
];

const locations = [
  "New Delhi",
  "Mumbai",
  "Bangalore",
  "Chennai",
  "Kolkata",
  "Hyderabad",
  "Pune",
  "Jaipur",
  "Chandigarh",
  "Lucknow",
  "Ahmedabad",
  "Kochi",
  "Bhubaneswar",
  "Indore",
  "AIIMS Delhi",
  "AIIMS Bhopal",
  "AIIMS Jodhpur",
  "AIIMS Rishikesh",
  "PGIMER Chandigarh",
  "JIPMER Puducherry",
  "CMC Vellore",
  "NIMHANS Bangalore",
  "Remote",
  "Pan India",
  "Multiple Locations",
];

const trim = (value?: string | null) => value?.trim() || "";

function inferCategory(value?: string | null): JobCategory {
  const text = trim(value).toLowerCase();
  if (/junior resident/.test(text)) return "Junior Resident";
  if (/senior resident/.test(text)) return "Senior Resident";
  if (/medical officer|gdm[o]?/.test(text)) return "Medical Officer";
  if (/professor|faculty|lecturer|tutor/.test(text)) return "Faculty";
  if (/specialist|consultant/.test(text)) return "Specialist";
  if (/dental|dentist|bds|mds/.test(text)) return "Dental";
  if (/ayush|bams|bhms|unani|ayurveda/.test(text)) return "AYUSH";
  if (/nurs/.test(text)) return "Nursing";
  if (/pharmac/.test(text)) return "Pharmacy";
  if (/psych/.test(text)) return "Psychology & Mental Health";
  if (/nutrition|diet/.test(text)) return "Nutrition & Dietetics";
  if (/public health|epidemi/.test(text)) return "Public Health";
  if (/administration|administrator/.test(text)) return "Hospital Administration";
  if (/research|scientist|life science/.test(text)) return "Life Science & Research";
  if (/technician|technologist|paramedic/.test(text)) return "Paramedical";
  return "Medical Officer";
}

function inferDutyType(value?: string | null): JobFormData["dutyType"] {
  const text = trim(value).toLowerCase();
  if (/part[ -]?time/.test(text)) return "part_time";
  if (/contract|temporary|fixed term|tenure|walk[- ]?in/.test(text)) return "contract";
  return "full_time";
}

function formatExtractedDescription(
  extraction: JobTemplateExtractionResponse,
  vacancy?: JobTemplateVacancyExtraction,
) {
  const recruitment = extraction.recruitment || {};
  const location = trim(vacancy?.location) || trim(recruitment.location);
  const lines: string[] = [];

  const addSection = (title: string, content: string[]) => {
    const values = content.filter(Boolean);
    if (!values.length) return;
    if (lines.length) lines.push("");
    lines.push(title, "", ...values);
  };

  addSection("JOB DETAILS", [
    trim(vacancy?.postName || recruitment.title) && `Job Title: ${trim(vacancy?.postName || recruitment.title)}`,
    trim(recruitment.organisationName) && `Organization/Hospital Name: ${trim(recruitment.organisationName)}`,
    trim(recruitment.sector) && `Job Sector: ${trim(recruitment.sector)}`,
    trim(vacancy?.department) && `Department: ${trim(vacancy?.department)}`,
    trim(vacancy?.speciality) && `Speciality: ${trim(vacancy?.speciality)}`,
    location && `Location: ${location}`,
    vacancy?.numberOfVacancies != null && vacancy.numberOfVacancies > 0
      ? `Number of Posts: ${vacancy.numberOfVacancies}`
      : "",
    trim(vacancy?.salary || vacancy?.payScale || vacancy?.payLevel) &&
      `Salary: ${trim(vacancy?.salary || vacancy?.payScale || vacancy?.payLevel)}`,
    trim(vacancy?.jobType) && `Job Type: ${trim(vacancy?.jobType)}`,
  ]);

  addSection("ELIGIBILITY", [
    trim(vacancy?.qualification) && `Required Qualification: ${trim(vacancy?.qualification)}`,
    trim(vacancy?.experience) && `Experience Required: ${trim(vacancy?.experience)}`,
    trim(vacancy?.ageLimit) && `Age Limit: ${trim(vacancy?.ageLimit)}`,
    trim(vacancy?.otherEligibilityRequirements) && `- ${trim(vacancy?.otherEligibilityRequirements)}`,
  ]);

  addSection("APPLICATION PROCESS", [
    trim(recruitment.applicationStartDate) && `Application Start Date: ${trim(recruitment.applicationStartDate)}`,
    trim(recruitment.applicationLastDate) && `Last Date to Apply: ${trim(recruitment.applicationLastDate)}`,
    trim(recruitment.applicationFee) && `Application Fee: ${trim(recruitment.applicationFee)}`,
  ]);

  addSection("SELECTION PROCESS", [
    trim(recruitment.selectionProcess) && `- ${trim(recruitment.selectionProcess)}`,
  ]);

  addSection("IMPORTANT NOTES", [
    trim(recruitment.importantInstructions) && `- ${trim(recruitment.importantInstructions)}`,
  ]);

  addSection("CONTACT INFORMATION", [
    trim(recruitment.officialWebsite) && `Website: ${trim(recruitment.officialWebsite)}`,
  ]);

  return lines.join("\n").trim();
}

export function JobPostingForm({ onCancel, onSave, initialData }: JobPostingFormProps) {
  const { token } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [currentSubscription, setCurrentSubscription] = useState<SubscriptionResponse | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [showPasteBox, setShowPasteBox] = useState(false);
  const [extractingPdf, setExtractingPdf] = useState(false);
  const [pdfMessage, setPdfMessage] = useState("");
  const [pdfError, setPdfError] = useState("");
  const [pdfExtraction, setPdfExtraction] = useState<JobTemplateExtractionResponse | null>(null);
  const [selectedVacancyIndex, setSelectedVacancyIndex] = useState(0);
  const [descriptionGeneratedFromPdf, setDescriptionGeneratedFromPdf] = useState(false);

  const [formData, setFormData] = useState<JobFormData>({
    title: "",
    organization: "",
    sector: "private",
    category: "Medical Officer",
    location: "",
    qualification: "",
    experience: "",
    experienceLevel: "entry",
    speciality: "",
    dutyType: "full_time",
    numberOfPosts: undefined,
    salary: "",
    description: "",
    lastDate: "",
    requirements: "",
    benefits: "",
    contactEmail: "",
    contactPhone: "",
  });

  const totalSteps = 4;
  const progress = (currentStep / totalSteps) * 100;

  useEffect(() => {
    if (!token) return;
    getCurrentSubscription(token)
      .then(setCurrentSubscription)
      .catch((err) => console.warn("Could not fetch subscription:", err));
  }, [token]);

  useEffect(() => {
    if (initialData) setFormData((prev) => ({ ...prev, ...initialData }));
  }, [initialData]);

  const handleInputChange = (
    field: keyof JobFormData,
    value: string | number | File | undefined,
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (field === "description") setDescriptionGeneratedFromPdf(false);
  };

  const isStepValid = (step: number) => {
    switch (step) {
      case 1:
        return Boolean(formData.title.trim() && formData.organization.trim() && formData.location.trim());
      case 2:
        return true;
      case 3:
        return Boolean(formData.description.trim() && formData.lastDate);
      case 4:
        return true;
      default:
        return false;
    }
  };

  const applyExtractedVacancy = (
    extraction: JobTemplateExtractionResponse,
    index: number,
  ) => {
    const vacancies = Array.isArray(extraction.vacancies) ? extraction.vacancies : [];
    const vacancy = vacancies[index];
    const recruitment = extraction.recruitment || {};
    const extractedDescription = formatExtractedDescription(extraction, vacancy);
    const extractedLocation = trim(vacancy?.location) || trim(recruitment.location);
    const extractedTitle = trim(vacancy?.postName) || trim(recruitment.title);
    const extractedSalary = trim(vacancy?.salary || vacancy?.payScale || vacancy?.payLevel);
    const extractedPosts = vacancy?.numberOfVacancies != null && vacancy.numberOfVacancies > 0
      ? vacancy.numberOfVacancies
      : vacancies.length <= 1 && recruitment.totalVacancies != null && recruitment.totalVacancies > 0
        ? recruitment.totalVacancies
        : undefined;

    setSelectedVacancyIndex(index);
    setFormData((prev) => ({
      ...prev,
      title: extractedTitle || prev.title,
      organization: trim(recruitment.organisationName) || prev.organization,
      sector: recruitment.sector === "government" || recruitment.sector === "private"
        ? recruitment.sector
        : prev.sector,
      category: inferCategory(extractedTitle || vacancy?.department || prev.title),
      // Deliberately clear these two fields when the new PDF does not contain
      // them. Keeping an older value is more dangerous than asking for review.
      location: extractedLocation,
      lastDate: trim(recruitment.applicationLastDate),
      qualification: trim(vacancy?.qualification),
      experience: trim(vacancy?.experience),
      speciality: trim(vacancy?.speciality || vacancy?.department),
      dutyType: inferDutyType(vacancy?.jobType),
      numberOfPosts: extractedPosts,
      salary: extractedSalary,
      requirements: trim(vacancy?.otherEligibilityRequirements),
      applyLink: trim(recruitment.officialApplicationUrl || recruitment.officialWebsite) || prev.applyLink,
      description:
        extractedDescription && (!prev.description.trim() || descriptionGeneratedFromPdf)
          ? extractedDescription
          : prev.description,
    }));

    if (extractedDescription) setDescriptionGeneratedFromPdf(true);
  };

  const handlePdfSelection = async (file?: File) => {
    setFormData((prev) => ({ ...prev, pdfFile: file }));
    setPdfError("");
    setPdfMessage("");
    setPdfExtraction(null);
    setSelectedVacancyIndex(0);

    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setPdfError("Please select a PDF file.");
      return;
    }

    setExtractingPdf(true);
    try {
      const extraction = await extractJobTemplateFromPdf(file);
      setPdfExtraction(extraction);
      applyExtractedVacancy(extraction, 0);
      const vacancyCount = extraction.vacancies?.length || 0;
      setPdfMessage(
        vacancyCount > 1
          ? `PDF extracted successfully. ${vacancyCount} vacancy rows found — select the vacancy you want to post.`
          : `PDF extracted successfully using ${extraction.extractionMethod || "the configured extractor"}. Review the autofilled values before posting.`,
      );
    } catch (error: any) {
      console.error("PDF job-template extraction failed:", error);
      setPdfError(
        error?.response?.data?.error ||
          error?.response?.data?.message ||
          "We could not extract this PDF. You can still fill the template manually and attach the PDF.",
      );
    } finally {
      setExtractingPdf(false);
    }
  };

  const parsePastedJobText = (text: string) => {
    if (!text.trim()) return;

    const titleMatch = text.match(/(?:title|post|role|position|recruitment for|hiring)\s*:\s*([^\n\r.]+)/i);
    const orgMatch = text.match(/(?:hospital|organization|organisation|institute|college|employer|company)\s*:\s*([^\n\r.]+)/i);
    const locMatch = text.match(/(?:job\s+location|location|city|place|station)\s*:\s*([^\n\r.]+)/i);
    const qualMatch = text.match(/(?:qualification|eligibility|education)\s*:\s*([^\n\r.]+)/i);
    const expMatch = text.match(/(?:experience|required experience)\s*:\s*([^\n\r.]+)/i);
    const postMatch = text.match(/(?:posts|vacancies|no\. of posts|number of posts)\s*:\s*(\d+)/i) ||
      text.match(/(\d+)\s*(?:posts|vacancies|positions)/i);
    const salaryMatch = text.match(/(?:salary|pay|remuneration|stipend)\s*:\s*([^\n\r.]+)/i);
    const dateMatch = text.match(/(?:last date(?: to apply)?|closing date|application deadline)\s*:\s*(\d{4}-\d{2}-\d{2})/i);
    const detectedTitle = trim(titleMatch?.[1]) || text.trim().split("\n")[0]?.trim() || "";

    setFormData((prev) => ({
      ...prev,
      title: detectedTitle.length <= 200 ? detectedTitle : prev.title,
      organization: trim(orgMatch?.[1]) || prev.organization,
      location: trim(locMatch?.[1]) || prev.location,
      sector: /govt|government|aiims|pgimer|jipmer|railway|esic/i.test(text) ? "government" : prev.sector,
      category: inferCategory(detectedTitle || text),
      qualification: trim(qualMatch?.[1]) || prev.qualification,
      experience: trim(expMatch?.[1]) || prev.experience,
      salary: trim(salaryMatch?.[1]) || prev.salary,
      numberOfPosts: postMatch?.[1] ? Number(postMatch[1]) : prev.numberOfPosts,
      lastDate: trim(dateMatch?.[1]) || prev.lastDate,
      description: prev.description || text.trim(),
    }));
    setShowPasteBox(false);
  };

  const handleSubmit = () => onSave(formData);
  const handleSaveAsDraft = () => onSave({ ...formData, status: "draft" } as JobFormData);

  const renderPdfAutofill = () => (
    <Card className="border-blue-200 bg-blue-50/50 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-blue-100 p-2 text-blue-700">
            <Upload className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">PDF Auto-Fill with DeepSeek</p>
            <p className="mt-0.5 text-xs text-slate-600">
              Upload the official notification. Existing PDF/OCR/AI extraction will fill this template automatically.
            </p>
          </div>
        </div>
        <label className="inline-flex cursor-pointer items-center justify-center rounded-md border border-blue-200 bg-white px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50">
          {extractingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
          {extractingPdf ? "Extracting..." : formData.pdfFile ? "Change PDF" : "Upload PDF"}
          <input
            type="file"
            accept="application/pdf,.pdf"
            className="sr-only"
            disabled={extractingPdf}
            onChange={(event) => void handlePdfSelection(event.target.files?.[0])}
          />
        </label>
      </div>

      {formData.pdfFile && (
        <div className="mt-3 flex items-center gap-2 text-xs text-slate-600">
          <FileText className="h-3.5 w-3.5" />
          <span className="truncate">{formData.pdfFile.name}</span>
        </div>
      )}

      {pdfMessage && (
        <div className="mt-3 flex items-start gap-2 rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{pdfMessage}</span>
        </div>
      )}
      {pdfError && (
        <div className="mt-3 flex items-start gap-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{pdfError}</span>
        </div>
      )}

      {(pdfExtraction?.vacancies?.length || 0) > 1 && (
        <div className="mt-3">
          <Label className="text-xs">Vacancy to Autofill</Label>
          <Select
            value={String(selectedVacancyIndex)}
            onValueChange={(value) => applyExtractedVacancy(pdfExtraction!, Number(value))}
          >
            <SelectTrigger className="mt-1 bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pdfExtraction!.vacancies!.map((vacancy, index) => (
                <SelectItem key={`${vacancy.postName || "vacancy"}-${index}`} value={String(index)}>
                  {vacancy.postName || `Vacancy ${index + 1}`}
                  {vacancy.department ? ` — ${vacancy.department}` : ""}
                  {vacancy.numberOfVacancies ? ` (${vacancy.numberOfVacancies} posts)` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="mt-1 text-xs text-slate-500">
            Location and number of posts are mapped from this selected vacancy, not copied from another row.
          </p>
        </div>
      )}
    </Card>
  );

  const renderStep1 = () => (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Basic Job Information</h2>
          <p className="mt-1 text-sm text-gray-600">Start with the essential details. Fields marked * are required.</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => setShowPasteBox(!showPasteBox)}>
          {showPasteBox ? "Hide Text Auto-Fill" : "Paste AI / Raw Text"}
        </Button>
      </div>

      {renderPdfAutofill()}

      {showPasteBox && (
        <Card className="space-y-2 border-blue-200 bg-blue-50/40 p-3">
          <Label className="text-sm font-semibold text-blue-900">Paste AI / Raw Job Notice Text</Label>
          <Textarea
            rows={3}
            placeholder="Paste extracted notification text here..."
            value={pastedText}
            onChange={(event) => setPastedText(event.target.value)}
            className="bg-white text-sm"
          />
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => setShowPasteBox(false)}>Cancel</Button>
            <Button type="button" size="sm" onClick={() => parsePastedJobText(pastedText)}>Auto-Fill Fields</Button>
          </div>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <Label htmlFor="title">Job Title *</Label>
          <Input id="title" value={formData.title} onChange={(e) => handleInputChange("title", e.target.value)} placeholder="e.g., Senior Resident - Cardiology" className="mt-1" />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="organization">Organization/Hospital Name *</Label>
          <Input id="organization" value={formData.organization} onChange={(e) => handleInputChange("organization", e.target.value)} placeholder="e.g., AIIMS Kalyani" className="mt-1" />
        </div>
        <div>
          <Label>Job Sector *</Label>
          <Select value={formData.sector} onValueChange={(value: JobSector) => handleInputChange("sector", value)}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="private">Private</SelectItem><SelectItem value="government">Government</SelectItem></SelectContent>
          </Select>
        </div>
        <div>
          <Label>Job Category *</Label>
          <Select value={formData.category} onValueChange={(value: JobCategory) => handleInputChange("category", value)}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>{jobCategories.map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="location">Location *</Label>
          <Input id="location" list="locationSuggestions" value={formData.location} onChange={(e) => handleInputChange("location", e.target.value)} placeholder="Enter the actual vacancy location" className="mt-1" />
          <datalist id="locationSuggestions">{locations.map((location) => <option key={location} value={location} />)}</datalist>
          <p className="mt-1 text-xs text-gray-500">PDF autofill leaves this blank if the notification does not clearly state a location.</p>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Requirements & Details</h2>
        <p className="mt-1 text-sm text-gray-600">These details are optional and can be added when available in the vacancy.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2"><Label>Required Qualification</Label><Input value={formData.qualification} onChange={(e) => handleInputChange("qualification", e.target.value)} placeholder="e.g., MBBS, MD/DNB Medicine" className="mt-1" /></div>
        <div><Label>Experience Required</Label><Input value={formData.experience} onChange={(e) => handleInputChange("experience", e.target.value)} placeholder="e.g., Fresher / 2-5 years" className="mt-1" /></div>
        <div>
          <Label>Experience Level</Label>
          <Select value={formData.experienceLevel} onValueChange={(value: JobFormData["experienceLevel"]) => handleInputChange("experienceLevel", value)}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="entry">Entry Level</SelectItem><SelectItem value="mid">Mid Level</SelectItem><SelectItem value="senior">Senior Level</SelectItem><SelectItem value="executive">Executive Level</SelectItem></SelectContent>
          </Select>
        </div>
        <div><Label>Speciality</Label><Input value={formData.speciality} onChange={(e) => handleInputChange("speciality", e.target.value)} placeholder="e.g., Cardiology" className="mt-1" /></div>
        <div>
          <Label>Duty Type</Label>
          <Select value={formData.dutyType} onValueChange={(value: JobFormData["dutyType"]) => handleInputChange("dutyType", value)}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="full_time">Full Time</SelectItem><SelectItem value="part_time">Part Time</SelectItem><SelectItem value="contract">Contract</SelectItem></SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="numberOfPosts">Number of Posts</Label>
          <Input
            id="numberOfPosts"
            type="number"
            min="1"
            inputMode="numeric"
            placeholder="Enter number of posts"
            value={formData.numberOfPosts ?? ""}
            onChange={(event) => {
              const value = event.target.value;
              handleInputChange("numberOfPosts", value === "" ? undefined : Math.max(1, Number(value)));
            }}
            className="mt-1"
          />
          <p className="mt-1 text-xs text-gray-500">You can clear the field or enter any positive vacancy count.</p>
        </div>
        <div><Label>Salary Range</Label><Input value={formData.salary} onChange={(e) => handleInputChange("salary", e.target.value)} placeholder="e.g., ₹60,000 - ₹80,000/month" className="mt-1" /></div>
        <div className="md:col-span-2"><Label>Additional Requirements</Label><Textarea rows={3} value={formData.requirements} onChange={(e) => handleInputChange("requirements", e.target.value)} placeholder="Certifications, registration, age limit or other requirements..." className="mt-1" /></div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Job Description & Timeline</h2>
        <p className="mt-1 text-sm text-gray-600">Keep the structured description readable and compact.</p>
      </div>
      <div className="space-y-4">
        <div>
          <Label htmlFor="description">Job Description *</Label>
          <Textarea id="description" rows={5} value={formData.description} onChange={(e) => handleInputChange("description", e.target.value)} placeholder="Use the structured section format for the best job-detail presentation..." className="mt-1 leading-6" />
          <p className="mt-1 text-xs text-gray-500">PDF autofill generates only sections supported by the source; you can edit them before posting.</p>
        </div>
        <div><Label>Benefits & Perks</Label><Textarea rows={3} value={formData.benefits} onChange={(e) => handleInputChange("benefits", e.target.value)} placeholder="Optional benefits or perks..." className="mt-1" /></div>
        <div>
          <Label htmlFor="lastDate">Last Date to Apply *</Label>
          <Input id="lastDate" type="date" value={formData.lastDate} onChange={(e) => handleInputChange("lastDate", e.target.value)} className="mt-1" />
          <p className="mt-1 text-xs text-gray-500">This is never defaulted by PDF autofill. If extraction cannot identify the application deadline, review the notification and enter it manually.</p>
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Contact & Preview</h2>
        <p className="mt-1 text-sm text-gray-600">Contact details and media are optional.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div><Label>Contact Email</Label><Input type="email" value={formData.contactEmail} onChange={(e) => handleInputChange("contactEmail", e.target.value)} placeholder="hr@hospital.com" className="mt-1" /></div>
        <div><Label>Contact Phone</Label><Input type="tel" value={formData.contactPhone} onChange={(e) => handleInputChange("contactPhone", e.target.value)} placeholder="+91 98765 43210" className="mt-1" /></div>
        <div className="md:col-span-2">
          <Label>Official PDF Document</Label>
          <Input type="file" accept="application/pdf,.pdf" onChange={(e) => void handlePdfSelection(e.target.files?.[0])} className="mt-1" />
          <p className="mt-1 text-xs text-gray-500">The same PDF is used for autofill and attached to the created job.</p>
        </div>
        <div className="md:col-span-2"><Label>Upload Image</Label><Input type="file" accept="image/*" onChange={(e) => handleInputChange("imageFile", e.target.files?.[0])} className="mt-1" /></div>
      </div>

      <div className="pt-2">
        <h3 className="mb-2 text-sm font-semibold text-gray-900">Job Preview</h3>
        <Card className="border-dashed p-4">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2"><Badge variant="outline">{formData.sector === "government" ? "Government" : "Private"}</Badge><Badge variant="outline">{formData.category}</Badge></div>
            <div><h4 className="text-lg font-semibold text-gray-900">{formData.title || "Job Title"}</h4><p className="mt-0.5 flex items-center gap-1 text-sm text-gray-600"><Building2 className="h-4 w-4" />{formData.organization || "Organization Name"}</p></div>
            <div className="grid gap-2 text-sm text-gray-600 sm:grid-cols-2">
              <div className="flex items-center gap-2"><MapPin className="h-4 w-4" /><span>{formData.location || "Location"}</span></div>
              <div className="flex items-center gap-2"><Briefcase className="h-4 w-4" /><span>{formData.numberOfPosts ? `${formData.numberOfPosts} Post${formData.numberOfPosts === 1 ? "" : "s"}` : "Posts not specified"}</span></div>
              <div className="flex items-center gap-2"><GraduationCap className="h-4 w-4" /><span>{formData.qualification || "Qualification not specified"}</span></div>
              <div className="flex items-center gap-2"><Calendar className="h-4 w-4" /><span>Apply by: {formData.lastDate ? new Date(`${formData.lastDate}T00:00:00`).toLocaleDateString("en-IN") : "Date"}</span></div>
            </div>
            {formData.salary && <div className="flex items-center gap-2 text-sm text-gray-600"><DollarSign className="h-4 w-4" /><span>{formData.salary}</span></div>}
            {formData.description && <p className="line-clamp-3 whitespace-pre-line text-sm leading-5 text-gray-700">{formData.description}</p>}
          </div>
        </Card>
      </div>
    </div>
  );

  const renderCurrentStep = () => {
    if (currentStep === 1) return renderStep1();
    if (currentStep === 2) return renderStep2();
    if (currentStep === 3) return renderStep3();
    return renderStep4();
  };

  const postingLimitReached = Boolean(
    currentSubscription &&
      currentSubscription.status === "active" &&
      currentSubscription.jobPostsUsed >= currentSubscription.jobPostsAllowed,
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Post a New Job</h1>
            <p className="mt-1 text-sm text-gray-600">Upload a notification for autofill or complete the compact template manually.</p>
            {currentSubscription?.status === "active" && <p className="mt-1 text-xs text-blue-600">Job Posts Available: {currentSubscription.jobPostsAllowed - currentSubscription.jobPostsUsed} / {currentSubscription.jobPostsAllowed}</p>}
          </div>
          <Button variant="outline" size="sm" onClick={onCancel}><ArrowLeft className="mr-2 h-4 w-4" />Back to Dashboard</Button>
        </div>

        {postingLimitReached && (
          <Alert className="mb-4 border-red-200 bg-red-50"><AlertCircle className="h-4 w-4 text-red-600" /><AlertDescription className="text-red-800"><strong>Job Posting Limit Reached:</strong> Please upgrade your plan to post more jobs.</AlertDescription></Alert>
        )}

        <div className="mb-5">
          <div className="mb-1.5 flex items-center justify-between text-xs text-gray-600"><span>Step {currentStep} of {totalSteps}</span><span>{Math.round(progress)}% Complete</span></div>
          <Progress value={progress} className="h-1.5" />
        </div>

        <Card className="p-5 sm:p-6">{renderCurrentStep()}</Card>

        <div className="mt-5 flex flex-col-reverse justify-between gap-3 sm:flex-row sm:items-center">
          <Button variant="outline" onClick={() => setCurrentStep((step) => Math.max(1, step - 1))} disabled={currentStep === 1}><ArrowLeft className="mr-2 h-4 w-4" />Previous</Button>
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleSaveAsDraft}><Save className="mr-2 h-4 w-4" />Save as Draft</Button>
            {currentStep < totalSteps ? (
              <Button onClick={() => setCurrentStep((step) => Math.min(totalSteps, step + 1))} disabled={!isStepValid(currentStep)}>Next<ArrowRight className="ml-2 h-4 w-4" /></Button>
            ) : (
              <Button onClick={handleSubmit} disabled={!isStepValid(currentStep) || postingLimitReached} className="bg-green-600 hover:bg-green-700"><Eye className="mr-2 h-4 w-4" />Post Job</Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
