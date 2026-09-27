import { useEffect, useState, useRef } from 'react';
import {
  ArrowLeft,
  Award,
  Bell,
  Briefcase,
  Building2,
  Camera,
  CheckCircle2,
  Download,
  Edit3,
  ExternalLink,
  FileText,
  Globe,
  GraduationCap,
  Mail,
  MapPin,
  Phone,
  Save,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Stethoscope,
  Upload,
  User,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { fetchEmployer, updateEmployerProfile, EmployerResponse, EmployerProfileUpdatePayload } from '../api/employers';
import {
  CandidateProfileData,
  fetchMyCandidateProfile,
  updateMyCandidateProfile,
  uploadCandidatePhoto,
  uploadCandidateResume,
} from '../api/candidateProfiles';
import { CandidateQualificationStepper } from './CandidateQualificationStepper';
import '../styles/profile-page.css';

interface ProfilePageProps {
  onNavigate: (page: string) => void;
}

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Delhi', 'Goa', 'Gujarat',
  'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan',
  'Tamil Nadu', 'Telangana', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
];

const SPECIALITIES = [
  'Anaesthesiology', 'Cardiology', 'Critical Care', 'Dermatology', 'Emergency Medicine', 'ENT',
  'General Medicine', 'General Surgery', 'Obstetrics & Gynaecology', 'Orthopaedics', 'Paediatrics',
  'Psychiatry', 'Radiodiagnosis', 'Pulmonary Medicine', 'Public Health', 'Pathology', 'Microbiology', 'Other',
];

const MEDICAL_CATEGORIES = [
  'Modern Medicine / Allopathy (MBBS / MD / MS / DNB)',
  'Dental Surgery (BDS / MDS)',
  'AYUSH (Ayurveda, Yoga, Unani, Siddha, Homeopathy)',
  'Nursing & Midwifery (GNM / BSc / MSc Nursing)',
  'Pharmacy (B.Pharm / M.Pharm / Pharm.D)',
  'Paramedical & Technical (Lab, Radiology, OT, Dialysis)',
  'Allied Health Sciences (Physiotherapy, Optometry)',
  'Hospital & Healthcare Administration',
  'Public Health & Community Medicine',
  'Life Sciences & Clinical Research',
  'Mental Health & Clinical Psychology',
  'Nutrition & Dietetics',
  'Other Healthcare Domain',
];

const PREFERRED_ROLES = [
  'Medical Officer',
  'Junior Resident',
  'Senior Resident',
  'Specialist',
  'Consultant',
  'GDMO',
  'Assistant Professor / Faculty',
  'Associate Professor',
  'Professor',
  'Staff Nurse / Nursing Officer',
  'Pharmacist',
  'Lab Technician',
  'Radiographer',
  'Hospital Administrator',
  'Public Health Specialist',
];

function initials(value?: string) {
  return (
    (value || 'U')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'U'
  );
}

export function ProfilePage({ onNavigate }: ProfilePageProps) {
  const { user, token } = useAuth();
  const [employer, setEmployer] = useState<EmployerResponse | null>(null);
  const [candidate, setCandidate] = useState<CandidateProfileData>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showStepper, setShowStepper] = useState(false);
  const [isEditingEmployer, setIsEditingEmployer] = useState(false);
  const [employerForm, setEmployerForm] = useState<EmployerProfileUpdatePayload>({
    companyName: '',
    companyType: 'hospital',
    companyDescription: '',
    website: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    name: '',
    phone: '',
  });

  const photoInputRef = useRef<HTMLInputElement>(null);
  const resumeInputRef = useRef<HTMLInputElement>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);

  const handlePhotoUpload = async (file: File) => {
    if (!token) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file (JPG, PNG)');
      return;
    }
    setUploadingPhoto(true);
    try {
      const res = await uploadCandidatePhoto(file, token);
      setCandidate(res);
      toast.success('Profile photo updated successfully');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleResumeUpload = async (file: File) => {
    if (!token) return;
    setUploadingResume(true);
    try {
      const res = await uploadCandidateResume(file, token);
      setCandidate(res);
      toast.success('Resume / CV uploaded successfully');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to upload resume');
    } finally {
      setUploadingResume(false);
    }
  };

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!user || !token) return;
      setLoading(true);
      try {
        if (user.role === 'employer') {
          const data = await fetchEmployer(user.id, token);
          if (active) {
            setEmployer(data);
            setEmployerForm({
              companyName: data.companyName || '',
              companyType: data.companyType || 'hospital',
              companyDescription: data.companyDescription || '',
              website: data.website || '',
              address: data.address || '',
              city: data.city || '',
              state: data.state || '',
              pincode: data.pincode || '',
              name: data.userName || user?.name || '',
              phone: user?.phone || '',
            });
          }
        } else if (user.role === 'candidate') {
          const data = await fetchMyCandidateProfile(token);
          if (active) setCandidate(data);
        }
      } catch (error) {
        console.error('Profile load failed', error);
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [user?.id, user?.role, token]);

  if (!user) return null;
  const isEmployer = user.role === 'employer';
  const isCandidate = user.role === 'candidate';
  const displayName = isEmployer ? employer?.companyName || employerForm.companyName || user.name : user.name;

  const saveEmployer = async () => {
    if (!token || !employer?.id) {
      toast.error('Employer profile identifier not available');
      return;
    }
    if (!employerForm.companyName?.trim()) {
      toast.error('Company / Hospital Name is required');
      return;
    }

    setSaving(true);
    try {
      const updated = await updateEmployerProfile(employer.id, employerForm, token);
      setEmployer(updated);
      setIsEditingEmployer(false);
      toast.success('Employer profile updated successfully');
    } catch (error: any) {
      toast.error(error?.message || 'Unable to update employer profile');
    } finally {
      setSaving(false);
    }
  };

  const saveCandidate = async () => {
    if (!token) return;
    setSaving(true);
    try {
      const saved = await updateMyCandidateProfile(candidate, token);
      setCandidate(saved);
      toast.success('Medical profile saved');
    } catch (error: any) {
      toast.error(error?.message || 'Unable to save profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="profile-page">
      <div className="profile-shell">
        <button
          type="button"
          className="profile-back-btn"
          onClick={() => onNavigate('dashboard')}
        >
          <ArrowLeft />
          Back to Dashboard
        </button>

        <section className="profile-header-card">
          <div className="profile-header-main">
            <div className="relative group shrink-0">
              {isCandidate && candidate.profilePhotoUrl ? (
                <img
                  src={candidate.profilePhotoUrl}
                  alt={displayName}
                  className="w-18 h-18 rounded-2xl object-cover border-2 border-teal-500 shadow-md"
                />
              ) : (
                <div className="profile-avatar">{initials(displayName)}</div>
              )}
              {isCandidate && (
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-teal-600 text-white shadow-md hover:bg-teal-700 transition cursor-pointer"
                  title="Upload / Change Photo"
                >
                  <Camera className="h-3.5 w-3.5" />
                </button>
              )}
              <input
                ref={photoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handlePhotoUpload(file);
                }}
              />
            </div>

            <div className="profile-header-info">
              <div className="profile-header-title-row">
                <h1 className="profile-header-name">{displayName}</h1>
                {isEmployer && employer?.verificationStatus === 'approved' && (
                  <span className="profile-badge profile-badge--verified">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Verified Employer
                  </span>
                )}
                {isCandidate && candidate.profileComplete && (
                  <span className="profile-badge profile-badge--complete">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Medical Profile Complete
                  </span>
                )}
                <span className="profile-badge profile-badge--role">
                  {isEmployer ? 'Healthcare Employer' : 'Medical Professional'}
                </span>
              </div>
              <div className="profile-header-meta">
                <span className="profile-header-meta-item">
                  <Mail />
                  {user.email}
                </span>
                {(employerForm.phone || user.phone) && (
                  <span className="profile-header-meta-item">
                    <Phone />
                    {employerForm.phone || user.phone}
                  </span>
                )}
                {isCandidate && candidate.qualification && (
                  <span className="text-xs bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                    🎓 {candidate.qualification}
                  </span>
                )}
                {isCandidate && candidate.speciality && (
                  <span className="text-xs bg-teal-50 text-teal-700 font-semibold px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                    🩺 {candidate.speciality}
                  </span>
                )}
              </div>
            </div>
          </div>

          {isEmployer && (
            <div className="profile-header-actions">
              <button
                type="button"
                className={`profile-edit-toggle-btn ${isEditingEmployer ? 'is-active' : ''}`}
                onClick={() => {
                  if (isEditingEmployer) {
                    if (employer) {
                      setEmployerForm({
                        companyName: employer.companyName || '',
                        companyType: employer.companyType || 'hospital',
                        companyDescription: employer.companyDescription || '',
                        website: employer.website || '',
                        address: employer.address || '',
                        city: employer.city || '',
                        state: employer.state || '',
                        pincode: employer.pincode || '',
                        name: employer.userName || user?.name || '',
                        phone: user?.phone || '',
                      });
                    }
                    setIsEditingEmployer(false);
                  } else {
                    setIsEditingEmployer(true);
                  }
                }}
              >
                {isEditingEmployer ? (
                  <>
                    <X className="h-4 w-4" />
                    <span>Cancel Edit</span>
                  </>
                ) : (
                  <>
                    <Edit3 className="h-4 w-4" />
                    <span>Edit Profile</span>
                  </>
                )}
              </button>
            </div>
          )}
        </section>

        {loading ? (
          <div className="profile-section-card text-center text-slate-500 py-12">
            Loading profile…
          </div>
        ) : isCandidate ? (
          <div className="profile-body-grid">
            <main className="profile-main-column space-y-6">
              {/* Step-by-Step Qualification & Job Alert System Stepper */}
              {showStepper ? (
                <div className="mb-6">
                  <CandidateQualificationStepper
                    initialProfile={candidate}
                    token={token || ''}
                    onSaved={(updated) => {
                      setCandidate(updated);
                      setShowStepper(false);
                    }}
                    onCancel={() => setShowStepper(false)}
                  />
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Hero Career Progression Banner */}
                  <div className="candidate-hub-hero">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-blue-700 uppercase tracking-wider bg-blue-100/70 px-2.5 py-0.5 rounded-md flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5 text-blue-600" /> Medical Qualifications &amp; Alert System
                          </span>
                          <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Active &amp; Verified
                          </span>
                        </div>
                        <h3 className="candidate-hub-title mt-2">
                          {candidate.professionalCategory || candidate.medicalCategory || 'Doctor'} Career Progression
                        </h3>

                        {/* Step-wise path badges with vibrant colors & icons */}
                        <div className="flex items-center gap-2 flex-wrap mt-3">
                          <span className="path-pill path-pill--domain">
                            <Stethoscope className="w-3.5 h-3.5" />
                            {candidate.professionalCategory || candidate.medicalCategory || 'Doctor'}
                          </span>
                          {(candidate.basicQualification || candidate.qualification) && (
                            <>
                              <span className="text-slate-400 font-bold">→</span>
                              <span className="path-pill path-pill--basic">
                                <GraduationCap className="w-3.5 h-3.5" />
                                {candidate.basicQualification || (candidate.professionalCategory === 'Nursing' ? 'B.Sc Nursing' : 'MBBS')}
                              </span>
                            </>
                          )}
                          {candidate.highestQualification && candidate.highestQualification !== 'MBBS Only' && candidate.highestQualification !== 'BDS Only' && candidate.highestQualification !== 'None / Basic Only' && (
                            <>
                              <span className="text-slate-400 font-bold">→</span>
                              <span className="path-pill path-pill--highest">
                                <Award className="w-3.5 h-3.5" />
                                {candidate.highestQualification}
                              </span>
                            </>
                          )}
                          {candidate.speciality && (
                            <>
                              <span className="text-slate-400 font-bold">→</span>
                              <span className="path-pill path-pill--speciality">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                {candidate.speciality}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowStepper(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-md transition-all shrink-0 cursor-pointer"
                      >
                        <Edit3 className="w-4 h-4" />
                        Update via 8-Step System
                      </button>
                    </div>

                    {/* 4 Summary Metrics */}
                    <div className="candidate-hub-metrics">
                      <div className="candidate-metric-item">
                        <span className="candidate-metric-label">
                          <Briefcase className="w-3.5 h-3.5 text-blue-600" /> Experience
                        </span>
                        <strong className="candidate-metric-value">
                          {candidate.experienceBand || (candidate.yearsExperience != null ? `${candidate.yearsExperience} Years` : 'Fresher')}
                        </strong>
                      </div>
                      <div className="candidate-metric-item">
                        <span className="candidate-metric-label">
                          <Stethoscope className="w-3.5 h-3.5 text-indigo-600" /> Target Roles
                        </span>
                        <strong className="candidate-metric-value">
                          {Array.isArray(candidate.preferredJobRoles) && candidate.preferredJobRoles.length > 0
                            ? candidate.preferredJobRoles.slice(0, 2).join(', ')
                            : candidate.preferredJobRole || 'All Matching Roles'}
                        </strong>
                      </div>
                      <div className="candidate-metric-item">
                        <span className="candidate-metric-label">
                          <Building2 className="w-3.5 h-3.5 text-amber-600" /> Sectors
                        </span>
                        <strong className="candidate-metric-value">
                          {Array.isArray(candidate.preferredSectors) ? candidate.preferredSectors.map(s => s === 'both' ? 'Govt + Private' : s).join(', ') : 'Govt + Private'}
                        </strong>
                      </div>
                      <div className="candidate-metric-item">
                        <span className="candidate-metric-label">
                          <Bell className="w-3.5 h-3.5 text-emerald-600" /> Job Alerts
                        </span>
                        <strong className="candidate-metric-value text-emerald-700">
                          {candidate.jobAlertSettings?.enabled !== false ? 'Instant Alerts Active' : 'Disabled'}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* 2-Column Responsive Overview Grid */}
                  <div className="profile-overview-grid">
                    {/* CARD 1: Clinical Qualifications & Credentials */}
                    <div className="profile-card-modern">
                      <div className="profile-card-modern-header">
                        <div className="profile-card-modern-title-group">
                          <div className="profile-card-icon bg-blue-50 text-blue-600 border border-blue-100">
                            <GraduationCap className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="profile-card-title">Clinical Qualifications</h4>
                            <p className="profile-card-sub">Degrees and clinical domain</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowStepper(true)}
                          className="profile-card-action-btn shrink-0 whitespace-nowrap"
                        >
                          <Edit3 className="w-3.5 h-3.5 shrink-0" />
                          <span>Edit</span>
                        </button>
                      </div>

                      <div className="profile-detail-list">
                        <div className="profile-detail-row">
                          <span className="profile-detail-label">Professional Domain</span>
                          <span className="profile-detail-val">
                            <span className="profile-chip-tag profile-chip-tag--active">
                              {candidate.professionalCategory || candidate.medicalCategory || 'Doctor'}
                            </span>
                          </span>
                        </div>
                        <div className="profile-detail-row">
                          <span className="profile-detail-label">Foundational Degree</span>
                          <span className="profile-detail-val text-slate-800 font-bold">
                            {candidate.basicQualification || (candidate.professionalCategory === 'Nursing' ? 'B.Sc Nursing' : 'MBBS')}
                          </span>
                        </div>
                        <div className="profile-detail-row">
                          <span className="profile-detail-label">Highest Qualification</span>
                          <span className="profile-detail-val">
                            <span className="profile-chip-tag">
                              {candidate.highestQualification || candidate.qualification || 'Undergraduate'}
                            </span>
                          </span>
                        </div>
                        <div className="profile-detail-row">
                          <span className="profile-detail-label">Clinical Speciality</span>
                          <span className="profile-detail-val text-blue-700 font-bold">
                            {candidate.speciality || 'General Practice'}
                          </span>
                        </div>
                        {candidate.subSpeciality && (
                          <div className="profile-detail-row">
                            <span className="profile-detail-label">Sub-Speciality / Fellowship</span>
                            <span className="profile-detail-val text-slate-800">
                              {candidate.subSpeciality}
                            </span>
                          </div>
                        )}
                        <div className="profile-detail-row">
                          <span className="profile-detail-label">Current / Past Hospital</span>
                          <span className="profile-detail-val text-slate-700">
                            {candidate.currentOrganization || 'Not specified'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* CARD 2: Career & Location Preferences */}
                    <div className="profile-card-modern">
                      <div className="profile-card-modern-header">
                        <div className="profile-card-modern-title-group">
                          <div className="profile-card-icon bg-emerald-50 text-emerald-600 border border-emerald-100">
                            <MapPin className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="profile-card-title">Practice &amp; Location</h4>
                            <p className="profile-card-sub">Work locations and target roles</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowStepper(true)}
                          className="profile-card-action-btn shrink-0 whitespace-nowrap"
                        >
                          <Edit3 className="w-3.5 h-3.5 shrink-0" />
                          <span>Edit</span>
                        </button>
                      </div>

                      <div className="profile-detail-list">
                        <div className="profile-detail-row">
                          <span className="profile-detail-label">Practice Location</span>
                          <span className="profile-detail-val text-slate-900 font-bold">
                            {candidate.preferredLocation || [candidate.currentCity, candidate.state].filter(Boolean).join(', ') || (Array.isArray(candidate.preferredStates) && candidate.preferredStates.length > 0 ? candidate.preferredStates.join(', ') : 'Anywhere in India')}
                          </span>
                        </div>
                        <div className="profile-detail-row">
                          <span className="profile-detail-label">Sector Preference</span>
                          <span className="profile-detail-val">
                            <span className="profile-chip-tag profile-chip-tag--active">
                              {Array.isArray(candidate.preferredSectors) ? candidate.preferredSectors.map(s => s === 'both' ? 'Govt + Private' : s).join(', ') : 'Both Govt & Private'}
                            </span>
                          </span>
                        </div>
                        <div className="profile-detail-row">
                          <span className="profile-detail-label">Employment Type</span>
                          <span className="profile-detail-val text-slate-800">
                            {candidate.employmentPreference || (Array.isArray(candidate.preferredEmploymentTypes) ? candidate.preferredEmploymentTypes.join(', ') : 'Full Time')}
                          </span>
                        </div>
                        <div className="profile-detail-row">
                          <span className="profile-detail-label">Target Job Roles</span>
                          <span className="profile-detail-val">
                            <div className="flex flex-wrap gap-1 justify-end max-w-xs">
                              {Array.isArray(candidate.preferredJobRoles) && candidate.preferredJobRoles.length > 0 ? (
                                candidate.preferredJobRoles.map((role) => (
                                  <span key={role} className="profile-chip-tag">
                                    {role}
                                  </span>
                                ))
                              ) : (
                                <span className="profile-chip-tag">{candidate.preferredJobRole || 'All Matching Roles'}</span>
                              )}
                            </div>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* CARD 3: Job Alert Settings */}
                    <div className="profile-card-modern">
                      <div className="profile-card-modern-header">
                        <div className="profile-card-modern-title-group">
                          <div className="profile-card-icon bg-amber-50 text-amber-600 border border-amber-100">
                            <Bell className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="profile-card-title">Job Matching Alerts</h4>
                            <p className="profile-card-sub">Automated notifications for matching jobs</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowStepper(true)}
                          className="profile-card-action-btn shrink-0 whitespace-nowrap"
                        >
                          <Edit3 className="w-3.5 h-3.5 shrink-0" />
                          <span>Edit</span>
                        </button>
                      </div>

                      <div className="profile-detail-list">
                        <div className="profile-detail-row">
                          <span className="profile-detail-label">Alert Status</span>
                          <span className="profile-detail-val">
                            <span className="profile-chip-tag profile-chip-tag--active">
                              ✓ Active (Matching Engine Running)
                            </span>
                          </span>
                        </div>
                        <div className="profile-detail-row">
                          <span className="profile-detail-label">Website Dashboard</span>
                          <span className="profile-detail-val text-slate-800 font-semibold flex items-center gap-1.5">
                            <Bell className="w-3.5 h-3.5 text-blue-600" />
                            {candidate.jobAlertSettings?.channels?.website !== false ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                        <div className="profile-detail-row">
                          <span className="profile-detail-label">Email Notifications</span>
                          <span className="profile-detail-val text-slate-800 font-semibold flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-indigo-600" />
                            {candidate.jobAlertSettings?.channels?.email !== false ? user.email : 'Disabled'}
                          </span>
                        </div>
                        <div className="profile-detail-row">
                          <span className="profile-detail-label">WhatsApp Alerts</span>
                          <span className="profile-detail-val text-slate-800 font-semibold flex items-center gap-1.5">
                            <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                            {candidate.jobAlertSettings?.channels?.whatsapp !== false ? (user.phone || 'Configured') : 'Disabled'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* CARD 4: Professional Medical Registration */}
                    <div className="profile-card-modern">
                      <div className="profile-card-modern-header">
                        <div className="profile-card-modern-title-group">
                          <div className="profile-card-icon bg-indigo-50 text-indigo-600 border border-indigo-100">
                            <ShieldCheck className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="profile-card-title">Medical Council Registration</h4>
                            <p className="profile-card-sub">Official verification credentials</p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Registration Council</label>
                            <input
                              className="profile-input"
                              value={candidate.registrationCouncil || ''}
                              onChange={(e) => setCandidate({ ...candidate, registrationCouncil: e.target.value })}
                              placeholder="e.g. NMC / State Medical Council"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Registration Number</label>
                            <input
                              className="profile-input"
                              value={candidate.registrationNumber || ''}
                              onChange={(e) => setCandidate({ ...candidate, registrationNumber: e.target.value })}
                              placeholder="e.g. DMC/R/12345"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Registration State</label>
                            <input
                              className="profile-input"
                              value={candidate.registrationState || ''}
                              onChange={(e) => setCandidate({ ...candidate, registrationState: e.target.value })}
                              placeholder="e.g. Delhi / Maharashtra"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Registration Year</label>
                            <input
                              className="profile-input"
                              value={candidate.registrationYear || ''}
                              onChange={(e) => setCandidate({ ...candidate, registrationYear: e.target.value })}
                              placeholder="e.g. 2020"
                            />
                          </div>
                        </div>

                        <div className="pt-2 flex justify-end">
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => void saveCandidate()}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition cursor-pointer shadow-xs"
                          >
                            <Save className={`w-3.5 h-3.5 ${saving ? 'animate-spin' : ''}`} />
                            Save Registration
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* CARD 5: Clinical Skills & CV Summary */}
                    <div className="profile-card-modern">
                      <div className="profile-card-modern-header">
                        <div className="profile-card-modern-title-group">
                          <div className="profile-card-icon bg-violet-50 text-violet-600 border border-violet-100">
                            <Sparkles className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="profile-card-title">Skills &amp; Professional Bio</h4>
                            <p className="profile-card-sub">Clinical competencies and summary for CV</p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">Clinical Skills &amp; Competencies</label>
                          <input
                            className="profile-input"
                            value={candidate.skills || ''}
                            onChange={(e) => setCandidate({ ...candidate, skills: e.target.value })}
                            placeholder="e.g. ICU Management, Laparoscopy, Emergency Medicine, NABH"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">Professional / CV Summary</label>
                          <textarea
                            rows={3}
                            className="profile-textarea"
                            value={candidate.profileSummary || ''}
                            onChange={(e) => setCandidate({ ...candidate, profileSummary: e.target.value })}
                            placeholder="Brief overview of clinical expertise, case volume, procedures handled, hospital settings…"
                          />
                        </div>

                        <div className="pt-1 flex justify-end">
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => void saveCandidate()}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-600 text-white text-xs font-bold hover:bg-violet-700 transition cursor-pointer shadow-xs"
                          >
                            <Save className={`w-3.5 h-3.5 ${saving ? 'animate-spin' : ''}`} />
                            Save Bio &amp; Skills
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* CARD 6: Resume / CV Upload */}
                    <div className="profile-card-modern">
                      <div className="profile-card-modern-header">
                        <div className="profile-card-modern-title-group">
                          <div className="profile-card-icon bg-teal-50 text-teal-600 border border-teal-100">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="profile-card-title">Resume / CV Document</h4>
                            <p className="profile-card-sub">Directly accessible to hospital HR</p>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-xl border border-teal-100 bg-teal-50/40 p-3.5 space-y-3">
                        {candidate.resumeUrl ? (
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-lg border border-teal-200">
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-600 text-white shrink-0">
                                <FileText className="h-5 w-5" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-slate-800 truncate">
                                  {candidate.resumeFileName || 'Candidate_Resume.pdf'}
                                </div>
                                <div className="text-[11px] text-teal-700 font-medium">
                                  ✓ Resume actively uploaded and verified
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <a
                                href={candidate.resumeUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 transition shrink-0 whitespace-nowrap"
                              >
                                <Download className="h-3.5 w-3.5 shrink-0" />
                                <span>View / Download</span>
                              </a>
                              <button
                                type="button"
                                onClick={() => resumeInputRef.current?.click()}
                                disabled={uploadingResume}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 transition cursor-pointer shrink-0 whitespace-nowrap"
                              >
                                <Upload className="h-3.5 w-3.5 shrink-0" />
                                <span>{uploadingResume ? 'Uploading…' : 'Replace CV'}</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-lg border border-dashed border-teal-300 text-center sm:text-left">
                            <div className="min-w-0 flex-1 text-left">
                              <div className="text-xs font-bold text-slate-800">
                                No Resume / CV uploaded yet
                              </div>
                              <div className="text-[11px] text-slate-500">
                                Upload PDF, DOC, or DOCX (Max 10 MB) to increase recruiter response rate.
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => resumeInputRef.current?.click()}
                              disabled={uploadingResume}
                              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 text-white text-xs sm:text-sm font-bold hover:bg-teal-700 transition cursor-pointer shadow-sm shrink-0 whitespace-nowrap min-w-fit"
                            >
                              <Upload className="h-4 w-4 shrink-0" />
                              <span>{uploadingResume ? 'Uploading CV…' : 'Upload Resume / CV'}</span>
                            </button>
                          </div>
                        )}

                        <input
                          ref={resumeInputRef}
                          type="file"
                          accept="application/pdf,.doc,.docx"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) void handleResumeUpload(file);
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </main>

            <aside className="profile-aside-column">
              <div className="profile-info-card">
                <div className="profile-info-card-head">
                  <Sparkles />
                  <h3>Why complete this?</h3>
                </div>
                <ul className="profile-info-list">
                  <li className="profile-info-item">
                    <span className="profile-info-item-dot" />
                    <span>Employers see useful clinical context.</span>
                  </li>
                  <li className="profile-info-item">
                    <span className="profile-info-item-dot" />
                    <span>Admin can filter candidates by speciality, qualification and state.</span>
                  </li>
                  <li className="profile-info-item">
                    <span className="profile-info-item-dot" />
                    <span>Future job matching can use structured profile data.</span>
                  </li>
                </ul>
              </div>

              <div className="profile-account-card">
                <div className="profile-account-card-head">
                  <User />
                  <h3>Account Information</h3>
                </div>
                <div className="profile-account-list">
                  <Info label="Name" value={user.name} />
                  <Info label="Email" value={user.email} />
                  <Info label="Phone" value={user.phone} />
                  <Info label="Account Type" value={isCandidate ? 'Candidate' : user.role} />
                </div>
              </div>
            </aside>
          </div>
        ) : isEmployer ? (
          <div className="profile-body-grid">
            <main className="profile-main-column">
              {isEditingEmployer ? (
                <>
                  <ProfileSection
                    icon={Building2}
                    title="Company Information"
                    subtitle="Update your healthcare organization brand, legal entity, and category."
                    variant="blue"
                  >
                    <div className="profile-fields-grid">
                      <Field label="Company / Hospital Name *">
                        <input
                          className="profile-input"
                          value={employerForm.companyName || ''}
                          onChange={(e) => setEmployerForm({ ...employerForm, companyName: e.target.value })}
                          placeholder="e.g. Aimss Multi-Speciality Hospital"
                          required
                        />
                      </Field>
                      <Field label="Organization Type">
                        <select
                          className="profile-select"
                          value={employerForm.companyType || 'hospital'}
                          onChange={(e) => setEmployerForm({ ...employerForm, companyType: e.target.value as any })}
                        >
                          <option value="hospital">Hospital / Healthcare Facility</option>
                          <option value="consultancy">Healthcare Consultancy</option>
                          <option value="hr">HR & Medical Recruitment Agency</option>
                        </select>
                      </Field>
                      <Field label="Official Website">
                        <input
                          className="profile-input"
                          value={employerForm.website || ''}
                          onChange={(e) => setEmployerForm({ ...employerForm, website: e.target.value })}
                          placeholder="https://example-hospital.com"
                        />
                      </Field>
                    </div>
                    <div className="profile-field-full" style={{ marginTop: '16px' }}>
                      <Field label="About Organization / Facilities Overview">
                        <textarea
                          className="profile-textarea"
                          value={employerForm.companyDescription || ''}
                          onChange={(e) => setEmployerForm({ ...employerForm, companyDescription: e.target.value })}
                          placeholder="Describe your clinical infrastructure, bed count, super-specialities, ICU setup, and clinical vision…"
                          rows={4}
                        />
                      </Field>
                    </div>
                  </ProfileSection>

                  <ProfileSection
                    icon={MapPin}
                    title="Location & Campus Address"
                    subtitle="Physical facility address for doctors and applicants."
                    variant="teal"
                  >
                    <div className="profile-fields-grid">
                      <Field label="Campus / Street Address">
                        <input
                          className="profile-input"
                          value={employerForm.address || ''}
                          onChange={(e) => setEmployerForm({ ...employerForm, address: e.target.value })}
                          placeholder="Building, Plot, Area / Road"
                        />
                      </Field>
                      <Field label="City">
                        <input
                          className="profile-input"
                          value={employerForm.city || ''}
                          onChange={(e) => setEmployerForm({ ...employerForm, city: e.target.value })}
                          placeholder="e.g. Bhopal"
                        />
                      </Field>
                      <Field label="State">
                        <select
                          className="profile-select"
                          value={employerForm.state || ''}
                          onChange={(e) => setEmployerForm({ ...employerForm, state: e.target.value })}
                        >
                          <option value="">Select State</option>
                          {INDIAN_STATES.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Postal / PIN Code">
                        <input
                          className="profile-input"
                          value={employerForm.pincode || ''}
                          onChange={(e) => setEmployerForm({ ...employerForm, pincode: e.target.value })}
                          placeholder="e.g. 462001"
                          maxLength={10}
                        />
                      </Field>
                    </div>
                  </ProfileSection>

                  <ProfileSection
                    icon={User}
                    title="Primary Representative"
                    subtitle="Contact person details for recruitment and candidate inquiries."
                    variant="neutral"
                  >
                    <div className="profile-fields-grid">
                      <Field label="Contact Person Name">
                        <input
                          className="profile-input"
                          value={employerForm.name || ''}
                          onChange={(e) => setEmployerForm({ ...employerForm, name: e.target.value })}
                          placeholder="e.g. Aayush Paradkar"
                        />
                      </Field>
                      <Field label="Contact Phone Number">
                        <input
                          className="profile-input"
                          value={employerForm.phone || ''}
                          onChange={(e) => setEmployerForm({ ...employerForm, phone: e.target.value })}
                          placeholder="+91 98765 43210"
                        />
                      </Field>
                    </div>
                  </ProfileSection>

                  <div className="profile-actions-bar">
                    <button
                      type="button"
                      disabled={saving}
                      className="profile-save-btn"
                      onClick={() => void saveEmployer()}
                    >
                      <Save className={`h-4.5 w-4.5 ${saving ? 'animate-spin' : ''}`} />
                      {saving ? 'Saving Employer Profile…' : 'Save Profile Changes'}
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      className="profile-cancel-btn"
                      onClick={() => {
                        if (employer) {
                          setEmployerForm({
                            companyName: employer.companyName || '',
                            companyType: employer.companyType || 'hospital',
                            companyDescription: employer.companyDescription || '',
                            website: employer.website || '',
                            address: employer.address || '',
                            city: employer.city || '',
                            state: employer.state || '',
                            pincode: employer.pincode || '',
                            name: employer.userName || user?.name || '',
                            phone: user?.phone || '',
                          });
                        }
                        setIsEditingEmployer(false);
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <ProfileSection
                    icon={Building2}
                    title="Company Details"
                    subtitle="Employer identity and business details."
                    variant="blue"
                  >
                    <div className="profile-account-list">
                      <Info label="Company" value={employer?.companyName || employerForm.companyName} />
                      <Info label="Type" value={employer?.companyType ? employer.companyType.toUpperCase() : 'HOSPITAL'} />
                      <Info label="Website" value={employer?.website || employerForm.website} />
                      <Info label="Email" value={employer?.userEmail || user.email} />
                      {(employer?.companyDescription || employerForm.companyDescription) && (
                        <Info label="About" value={employer?.companyDescription || employerForm.companyDescription} />
                      )}
                    </div>
                  </ProfileSection>

                  <ProfileSection
                    icon={MapPin}
                    title="Location & Verification"
                    subtitle="Current company location and approval status."
                    variant="teal"
                  >
                    <div className="profile-account-list">
                      <Info label="Address" value={employer?.address || employerForm.address} />
                      <Info
                        label="City / State"
                        value={[employer?.city || employerForm.city, employer?.state || employerForm.state].filter(Boolean).join(', ')}
                      />
                      {(employer?.pincode || employerForm.pincode) && (
                        <Info label="PIN Code" value={employer?.pincode || employerForm.pincode} />
                      )}
                      <Info label="Verification" value={employer?.verificationStatus || 'approved'} />
                    </div>
                  </ProfileSection>

                  <div className="profile-actions-bar">
                    <button
                      type="button"
                      className="profile-save-btn profile-save-btn--edit"
                      onClick={() => setIsEditingEmployer(true)}
                    >
                      <Edit3 className="h-4.5 w-4.5" />
                      Edit Profile Details
                    </button>
                  </div>
                </>
              )}
            </main>

            <aside className="profile-aside-column">
              <div className="profile-account-card">
                <div className="profile-account-card-head">
                  <User />
                  <h3>Account Information</h3>
                </div>
                <div className="profile-account-list">
                  <Info label="Name" value={employerForm.name || employer?.userName || user.name} />
                  <Info label="Email" value={user.email} />
                  <Info label="Phone" value={employerForm.phone || user.phone} />
                  <Info label="Role" value="Healthcare Employer" />
                </div>
              </div>

              <div className="profile-info-card">
                <div className="profile-info-card-head">
                  <ShieldCheck className="text-blue-600" />
                  <h3>Employer Verification</h3>
                </div>
                <ul className="profile-info-list">
                  <li className="profile-info-item">
                    <span className="profile-info-item-dot" />
                    <span>Verified accounts receive a trust badge on medical job postings.</span>
                  </li>
                  <li className="profile-info-item">
                    <span className="profile-info-item-dot" />
                    <span>Candidates can review institution location, credentials, and website.</span>
                  </li>
                  <li className="profile-info-item">
                    <span className="profile-info-item-dot" />
                    <span>Click "Edit Profile Details" anytime to update institution data.</span>
                  </li>
                </ul>
              </div>
            </aside>
          </div>
        ) : (
          <div className="profile-section-card">
            <div className="profile-section-head">
              <div className="profile-icon-badge profile-icon-badge--neutral">
                <User />
              </div>
              <div className="profile-section-titles">
                <h2>Account Details</h2>
                <p>Your platform identity and role details.</p>
              </div>
            </div>
            <div className="profile-fields-grid">
              <Info label="Name" value={user.name} />
              <Info label="Email" value={user.email} />
              <Info label="Phone" value={user.phone} />
              <Info label="Role" value={user.role} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ProfileSection({
  icon: Icon,
  title,
  subtitle,
  variant = 'blue',
  children,
}: {
  icon: any;
  title: string;
  subtitle: string;
  variant?: 'teal' | 'indigo' | 'green' | 'blue' | 'neutral';
  children: any;
}) {
  const cardClass = `profile-section-card profile-section-card--${
    variant === 'teal'
      ? 'clinical'
      : variant === 'indigo'
      ? 'registration'
      : variant === 'green'
      ? 'location'
      : variant === 'blue'
      ? 'summary'
      : 'neutral'
  }`;
  const badgeClass = `profile-icon-badge profile-icon-badge--${variant}`;

  return (
    <section className={cardClass}>
      <div className="profile-section-head">
        <div className={badgeClass}>
          <Icon />
        </div>
        <div className="profile-section-titles">
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: any }) {
  return (
    <label className="profile-field">
      <span className="profile-field-label">{label}</span>
      {children}
    </label>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="profile-account-item">
      <span className="profile-account-label">{label}</span>
      <strong className="profile-account-value">{value || 'Not provided'}</strong>
    </div>
  );
}
