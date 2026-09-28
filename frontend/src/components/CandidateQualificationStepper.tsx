import React, { useState, useMemo } from 'react';
import {
  CheckCircle2,
  Stethoscope,
  ChevronRight,
  ChevronLeft,
  Briefcase,
  GraduationCap,
  MapPin,
  Bell,
  Sparkles,
  Search,
  Building2,
  Mail,
  Smartphone,
  Save,
  Check,
  X,
  HeartPulse,
  Pill,
  FlaskConical,
  Award,
  Globe,
  Landmark,
  ShieldCheck,
  Activity,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  CandidateProfileData,
  updateMyCandidateProfile,
} from '../api/candidateProfiles';
import {
  PROFESSIONAL_CATEGORIES,
  BASIC_QUALIFICATIONS,
  HIGHEST_QUALIFICATIONS,
  QUALIFICATION_SPECIALITIES,
  EXPERIENCE_BANDS,
  CATEGORY_JOB_ROLES,
  SECTOR_OPTIONS,
  EMPLOYMENT_TYPES,
  ALL_INDIAN_STATES,
  ALERT_TYPE_OPTIONS,
} from '../utils/qualificationHierarchy';
import '../styles/candidate-stepper.css';

interface StepperProps {
  initialProfile: CandidateProfileData;
  token: string;
  onSaved: (updatedProfile: CandidateProfileData) => void;
  onCancel?: () => void;
  isModal?: boolean;
}

// Icon mapping for professional categories
const CATEGORY_META: Record<string, { icon: React.ReactNode; bg: string; color: string; label: string }> = {
  Doctor: {
    icon: <Stethoscope className="w-5 h-5" />,
    bg: '#eff6ff',
    color: '#2563eb',
    label: 'Allopathy / Modern Medicine',
  },
  Dentist: {
    icon: <Activity className="w-5 h-5" />,
    bg: '#f0fdfa',
    color: '#0d9488',
    label: 'Dental Surgery & Specialities',
  },
  AYUSH: {
    icon: <Sparkles className="w-5 h-5" />,
    bg: '#f0fdf4',
    color: '#16a34a',
    label: 'Ayurveda, Homeopathy, Unani, Siddha',
  },
  Nursing: {
    icon: <HeartPulse className="w-5 h-5" />,
    bg: '#fff1f2',
    color: '#e11d48',
    label: 'Nursing & Midwifery Practice',
  },
  Pharmacy: {
    icon: <Pill className="w-5 h-5" />,
    bg: '#fffbeb',
    color: '#d97706',
    label: 'Clinical & Hospital Pharmacy',
  },
  Paramedical: {
    icon: <FlaskConical className="w-5 h-5" />,
    bg: '#f5f3ff',
    color: '#7c3aed',
    label: 'Allied Health Sciences & Diagnostics',
  },
  Other: {
    icon: <Building2 className="w-5 h-5" />,
    bg: '#f0f9ff',
    color: '#0284c7',
    label: 'Healthcare Administration & Research',
  },
};

export function CandidateQualificationStepper({
  initialProfile,
  token,
  onSaved,
  onCancel,
  isModal = false,
}: StepperProps) {
  // Stepper Current Step Index (1 to 8)
  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Form State
  const [category, setCategory] = useState<string>(
    initialProfile.professionalCategory || initialProfile.medicalCategory || 'Doctor'
  );
  const [basicQualification, setBasicQualification] = useState<string>(
    initialProfile.basicQualification || (category === 'Doctor' ? 'MBBS' : '')
  );
  const [highestQualification, setHighestQualification] = useState<string>(
    initialProfile.highestQualification || initialProfile.qualification || ''
  );
  const [speciality, setSpeciality] = useState<string>(
    initialProfile.speciality || ''
  );
  const [superSpeciality, setSuperSpeciality] = useState<string>(
    initialProfile.superSpeciality || initialProfile.subSpeciality || ''
  );
  const [fellowship, setFellowship] = useState<string>(
    initialProfile.fellowship || ''
  );

  // Experience
  const [experienceBand, setExperienceBand] = useState<string>(
    initialProfile.experienceBand || 'Fresher'
  );
  const [experienceYears, setExperienceYears] = useState<number>(
    initialProfile.yearsExperience ?? 0
  );
  const [experienceMonths, setExperienceMonths] = useState<number>(
    initialProfile.experienceMonths ?? 0
  );

  // Job Preferences
  const [preferredJobRoles, setPreferredJobRoles] = useState<string[]>(
    Array.isArray(initialProfile.preferredJobRoles)
      ? initialProfile.preferredJobRoles
      : initialProfile.preferredJobRole
      ? [initialProfile.preferredJobRole]
      : []
  );
  const [preferredSectors, setPreferredSectors] = useState<string[]>(
    Array.isArray(initialProfile.preferredSectors)
      ? initialProfile.preferredSectors
      : ['both']
  );
  const [preferredEmploymentTypes, setPreferredEmploymentTypes] = useState<string[]>(
    Array.isArray(initialProfile.preferredEmploymentTypes)
      ? initialProfile.preferredEmploymentTypes
      : ['Full Time']
  );

  // Location Preferences
  const [locationPreferenceType, setLocationPreferenceType] = useState<'anywhere' | 'state' | 'city'>(
    initialProfile.locationPreferenceType || 'anywhere'
  );
  const [preferredStates, setPreferredStates] = useState<string[]>(
    Array.isArray(initialProfile.preferredStates) ? initialProfile.preferredStates : []
  );
  const [preferredCitiesInput, setPreferredCitiesInput] = useState<string>(
    Array.isArray(initialProfile.preferredCities)
      ? initialProfile.preferredCities.join(', ')
      : initialProfile.currentCity || ''
  );

  // Job Alerts
  const [alertType, setAlertType] = useState<'government' | 'private' | 'both'>(
    initialProfile.jobAlertSettings?.alertType || 'both'
  );
  const [channelWebsite, setChannelWebsite] = useState(
    initialProfile.jobAlertSettings?.channels?.website ?? true
  );
  const [channelEmail, setChannelEmail] = useState(
    initialProfile.jobAlertSettings?.channels?.email ?? true
  );
  const [channelWhatsapp, setChannelWhatsapp] = useState(
    initialProfile.jobAlertSettings?.channels?.whatsapp ?? true
  );

  // Search filters
  const [specialitySearch, setSpecialitySearch] = useState('');
  const [stateSearch, setStateSearch] = useState('');

  // Auto-adapt basic qualification when category changes
  const handleCategorySelect = (selectedCat: string) => {
    setCategory(selectedCat);
    const basicList = BASIC_QUALIFICATIONS[selectedCat] || [];
    setBasicQualification(basicList[0] || '');
    setHighestQualification('');
    setSpeciality('');
    setSuperSpeciality('');
    setPreferredJobRoles([]);
  };

  // Determine if Step 4 (Speciality) is applicable
  const needsSpecialityStep = useMemo(() => {
    if (
      highestQualification === 'MBBS Only' ||
      highestQualification === 'BDS Only' ||
      highestQualification === 'No Higher Qualification'
    ) {
      return false;
    }
    if (category === 'Doctor') {
      return Boolean(
        highestQualification &&
          (QUALIFICATION_SPECIALITIES[highestQualification] || highestQualification === 'Fellowship')
      );
    }
    if (category === 'Dentist') {
      return highestQualification === 'MDS';
    }
    if (category === 'Nursing' || category === 'Pharmacy') {
      return true;
    }
    return false;
  }, [category, highestQualification]);

  // Available specialities for selected qualification
  const availableSpecialities = useMemo(() => {
    if (category === 'Doctor') {
      return QUALIFICATION_SPECIALITIES[highestQualification] || [];
    }
    if (category === 'Dentist' && highestQualification === 'MDS') {
      return QUALIFICATION_SPECIALITIES.MDS || [];
    }
    if (category === 'Nursing') {
      return QUALIFICATION_SPECIALITIES.NursingSpecialities || [];
    }
    if (category === 'Pharmacy') {
      return QUALIFICATION_SPECIALITIES.PharmacySpecialities || [];
    }
    return [];
  }, [category, highestQualification]);

  // Filtered specialities for search
  const filteredSpecialities = useMemo(() => {
    if (!specialitySearch.trim()) return availableSpecialities;
    const q = specialitySearch.toLowerCase();
    return availableSpecialities.filter((s) => s.toLowerCase().includes(q));
  }, [availableSpecialities, specialitySearch]);

  // Filtered states for location selection
  const filteredStates = useMemo(() => {
    if (!stateSearch.trim()) return ALL_INDIAN_STATES.slice(1);
    const q = stateSearch.toLowerCase();
    return ALL_INDIAN_STATES.slice(1).filter((s) => s.toLowerCase().includes(q));
  }, [stateSearch]);

  // Navigate to Next Step
  const handleNext = () => {
    if (currentStep === 1) {
      if (!category) {
        toast.error('Please select your professional category');
        return;
      }
      setCurrentStep(2);
      return;
    }

    if (currentStep === 2) {
      if (!basicQualification) {
        toast.error('Please select your basic qualification');
        return;
      }
      setCurrentStep(3);
      return;
    }

    if (currentStep === 3) {
      if (!highestQualification) {
        toast.error('Please select your qualification level');
        return;
      }
      if (needsSpecialityStep) {
        setCurrentStep(4);
      } else {
        setCurrentStep(5);
      }
      return;
    }

    if (currentStep === 4) {
      if (needsSpecialityStep && !speciality) {
        toast.error('Please select your clinical speciality');
        return;
      }
      setCurrentStep(5);
      return;
    }

    if (currentStep === 5) {
      setCurrentStep(6);
      return;
    }

    if (currentStep === 6) {
      if (preferredJobRoles.length === 0) {
        toast.error('Please select at least one preferred job role');
        return;
      }
      setCurrentStep(7);
      return;
    }

    if (currentStep === 7) {
      setCurrentStep(8);
      return;
    }
  };

  // Navigate to Previous Step
  const handleBack = () => {
    if (currentStep === 5 && !needsSpecialityStep) {
      setCurrentStep(3);
      return;
    }
    setCurrentStep((prev) => Math.max(1, prev - 1));
  };

  // Toggle Role Selection
  const toggleRole = (role: string) => {
    setPreferredJobRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  // Toggle Sector Selection
  const toggleSector = (secId: string) => {
    if (secId === 'both') {
      setPreferredSectors(['both']);
      return;
    }
    setPreferredSectors((prev) => {
      const filtered = prev.filter((s) => s !== 'both');
      if (filtered.includes(secId)) {
        const next = filtered.filter((s) => s !== secId);
        return next.length === 0 ? ['both'] : next;
      } else {
        return [...filtered, secId];
      }
    });
  };

  // Toggle Employment Type
  const toggleEmploymentType = (empType: string) => {
    setPreferredEmploymentTypes((prev) =>
      prev.includes(empType)
        ? prev.length > 1
          ? prev.filter((t) => t !== empType)
          : prev
        : [...prev, empType]
    );
  };

  // Toggle State Selection
  const toggleState = (st: string) => {
    setPreferredStates((prev) =>
      prev.includes(st) ? prev.filter((s) => s !== st) : [...prev, st]
    );
  };

  // Save Final Structured Profile
  const handleSave = async () => {
    setSaving(true);
    try {
      const parsedCities = preferredCitiesInput
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean);

      const resolvedState =
        initialProfile.state ||
        (locationPreferenceType === 'state' && preferredStates.length > 0 ? preferredStates[0] : undefined);
      const resolvedCity =
        initialProfile.currentCity ||
        (locationPreferenceType === 'city' && parsedCities.length > 0 ? parsedCities[0] : undefined);

      const payload: CandidateProfileData = {
        ...initialProfile,
        state: resolvedState,
        currentCity: resolvedCity,
        professionalCategory: category,
        medicalCategory: category,
        basicQualification: basicQualification,
        highestQualification: highestQualification || basicQualification,
        qualification: highestQualification || basicQualification,
        speciality: speciality || undefined,
        subSpeciality: superSpeciality || fellowship || undefined,
        superSpeciality: superSpeciality || undefined,
        fellowship: fellowship || undefined,
        experienceBand: experienceBand,
        experienceMonths: experienceMonths,
        yearsExperience: experienceYears,
        preferredJobRoles: preferredJobRoles,
        preferredJobRole: preferredJobRoles[0] || undefined,
        preferredSectors: preferredSectors,
        employmentPreference: preferredEmploymentTypes.join(', '),
        preferredEmploymentTypes: preferredEmploymentTypes,
        locationPreferenceType: locationPreferenceType,
        preferredStates: locationPreferenceType === 'state' ? preferredStates : [],
        preferredCities: locationPreferenceType === 'city' ? parsedCities : [],
        preferredLocation:
          locationPreferenceType === 'anywhere'
            ? 'Anywhere in India'
            : locationPreferenceType === 'state'
            ? preferredStates.join(', ')
            : parsedCities.join(', '),
        jobAlertSettings: {
          enabled: true,
          alertType: alertType,
          frequency: 'instant',
          channels: {
            website: channelWebsite,
            email: channelEmail,
            whatsapp: channelWhatsapp,
          },
        },
        profileComplete: true,
      };

      if (token) {
        const saved = await updateMyCandidateProfile(payload, token);
        toast.success('Medical Profile & Job Alert Preferences saved successfully!');
        onSaved(saved);
      } else {
        toast.success('Profile preferences updated!');
        onSaved(payload);
      }
    } catch (err: any) {
      console.error('Failed to save candidate profile:', err);
      toast.error(err.message || 'Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Step Progress Calculation
  const progressPercent = Math.round((currentStep / 8) * 100);

  return (
    <div className={`cqs-wrapper ${isModal ? 'cqs-modal-dialog' : ''}`}>
      {/* 1. STICKY HEADER */}
      <div className="cqs-header">
        <div className="cqs-header-top">
          <div>
            <div className="cqs-step-indicator">
              <span className="cqs-step-dot" />
              <span>Step {currentStep} of 8</span>
            </div>
            <h2 className="cqs-title">
              {currentStep === 1 && 'What best describes your professional role?'}
              {currentStep === 2 && `Select your foundational degree in ${category}`}
              {currentStep === 3 && 'Select your highest qualification level'}
              {currentStep === 4 && `Clinical speciality in ${highestQualification}`}
              {currentStep === 5 && 'Clinical Experience & Practice Background'}
              {currentStep === 6 && 'Target Job Roles for AI Matching'}
              {currentStep === 7 && 'Job Type & Preferred Practice Location'}
              {currentStep === 8 && 'Review & Job Alert Preferences'}
            </h2>
          </div>

          {/* EXACTLY ONE SLEEK CLOSE BUTTON */}
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="cqs-close-btn"
              aria-label="Close dialog"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Progress Bar */}
        <div className="cqs-progress-track">
          <div
            className="cqs-progress-fill"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Dynamic Breadcrumbs - only shows completed selections */}
        <div className="cqs-breadcrumbs">
          <button
            type="button"
            onClick={() => setCurrentStep(1)}
            className={`cqs-crumb ${currentStep === 1 ? 'is-current' : ''}`}
          >
            {category}
          </button>
          {currentStep > 1 && basicQualification && (
            <>
              <ChevronRight className="w-3 h-3 text-slate-300" />
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className={`cqs-crumb ${currentStep === 2 ? 'is-current' : ''}`}
              >
                {basicQualification}
              </button>
            </>
          )}
          {currentStep > 2 && highestQualification && highestQualification !== 'MBBS Only' && (
            <>
              <ChevronRight className="w-3 h-3 text-slate-300" />
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className={`cqs-crumb ${currentStep === 3 ? 'is-current' : ''}`}
              >
                {highestQualification}
              </button>
            </>
          )}
          {currentStep > 3 && speciality && (
            <>
              <ChevronRight className="w-3 h-3 text-slate-300" />
              <button
                type="button"
                onClick={() => setCurrentStep(4)}
                className={`cqs-crumb ${currentStep === 4 ? 'is-current' : ''}`}
              >
                {speciality}
              </button>
            </>
          )}
        </div>
      </div>

      {/* 2. SCROLLABLE BODY */}
      <div className="cqs-body">
        {/* STEP 1: PROFESSIONAL CATEGORY */}
        {currentStep === 1 && (
          <div>
            <p className="cqs-section-hint">
              Select your primary healthcare domain to customize qualification tiers and job alert matching:
            </p>
            <div className="cqs-category-grid">
              {PROFESSIONAL_CATEGORIES.map((cat) => {
                const isSelected = category === cat.id;
                const meta = CATEGORY_META[cat.id] || {
                  icon: <Stethoscope className="w-5 h-5" />,
                  bg: '#eff6ff',
                  color: '#2563eb',
                  label: cat.label,
                };
                return (
                  <div
                    key={cat.id}
                    onClick={() => handleCategorySelect(cat.id)}
                    className={`cqs-cat-card ${isSelected ? 'is-selected' : ''}`}
                  >
                    <div>
                      <div className="cqs-cat-header">
                        <div
                          className="cqs-cat-icon"
                          style={{ backgroundColor: meta.bg, color: meta.color }}
                        >
                          {meta.icon}
                        </div>
                        {isSelected && (
                          <div className="cqs-check-badge">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        )}
                      </div>
                      <h3 className="cqs-cat-label">{cat.label}</h3>
                    </div>
                    <p className="cqs-cat-desc">{cat.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 2: FOUNDATIONAL DEGREE */}
        {currentStep === 2 && (
          <div>
            <p className="cqs-section-hint">
              Select your foundational medical / healthcare qualification in <strong className="text-slate-900">{category}</strong>:
            </p>
            <div className="cqs-qual-grid">
              {(BASIC_QUALIFICATIONS[category] || []).map((qual) => {
                const isSelected = basicQualification === qual;
                return (
                  <div
                    key={qual}
                    onClick={() => setBasicQualification(qual)}
                    className={`cqs-qual-card ${isSelected ? 'is-selected' : ''}`}
                  >
                    <div className="cqs-qual-info">
                      <div className="cqs-qual-icon-badge">
                        <GraduationCap className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="cqs-qual-name">{qual}</span>
                        <span className="cqs-qual-sub">Foundational Degree</span>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="cqs-check-badge">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 3: HIGHEST / POST-GRADUATE QUALIFICATION */}
        {currentStep === 3 && (
          <div>
            <p className="cqs-section-hint">
              Select your highest qualification achieved or currently pursuing:
            </p>
            <div className="cqs-qual-grid">
              {(HIGHEST_QUALIFICATIONS[category] || []).map((hQual) => {
                const isSelected = highestQualification === hQual;
                const isUgOnly =
                  hQual === 'MBBS Only' ||
                  hQual === 'BDS Only' ||
                  hQual === 'No Higher Qualification' ||
                  hQual === 'None / Basic Only';
                return (
                  <div
                    key={hQual}
                    onClick={() => {
                      setHighestQualification(hQual);
                      setSpeciality('');
                    }}
                    className={`cqs-qual-card ${isSelected ? 'is-selected' : ''}`}
                  >
                    <div className="cqs-qual-info">
                      <div className="cqs-qual-icon-badge">
                        {isUgOnly ? (
                          <GraduationCap className="w-4 h-4" />
                        ) : (
                          <Award className="w-4 h-4 text-indigo-600" />
                        )}
                      </div>
                      <div>
                        <span className="cqs-qual-name">{hQual}</span>
                        <span className="cqs-qual-sub">
                          {isUgOnly ? 'Undergraduate Degree' : 'Specialist / Post-Graduate'}
                        </span>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="cqs-check-badge">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 4: CLINICAL SPECIALITY */}
        {currentStep === 4 && (
          <div>
            <p className="cqs-section-hint">
              Choose your clinical speciality in <strong className="text-blue-700">{highestQualification}</strong>:
            </p>

            <div className="cqs-search-bar">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                value={specialitySearch}
                onChange={(e) => setSpecialitySearch(e.target.value)}
                placeholder="Search speciality (e.g. General Medicine, Paediatrics, Cardiology)..."
                className="cqs-search-input"
              />
              {specialitySearch && (
                <button
                  type="button"
                  onClick={() => setSpecialitySearch('')}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="cqs-spec-grid">
              {filteredSpecialities.length === 0 ? (
                <div className="col-span-full py-8 text-center text-slate-400">
                  <p className="text-xs font-semibold text-slate-600">
                    No speciality matches &quot;{specialitySearch}&quot;
                  </p>
                  <button
                    type="button"
                    onClick={() => setSpeciality(specialitySearch)}
                    className="text-xs text-blue-600 font-bold mt-2 hover:underline cursor-pointer"
                  >
                    Select &quot;{specialitySearch}&quot; as custom speciality
                  </button>
                </div>
              ) : (
                filteredSpecialities.map((spec) => {
                  const isSelected = speciality === spec;
                  return (
                    <div
                      key={spec}
                      onClick={() => setSpeciality(spec)}
                      className={`cqs-spec-item ${isSelected ? 'is-selected' : ''}`}
                    >
                      <span className="truncate">{spec}</span>
                      {isSelected && <Check className="w-4 h-4 text-blue-600 shrink-0 ml-1" />}
                    </div>
                  );
                })
              )}
            </div>

            {/* Optional Super-Speciality & Fellowship Inputs */}
            <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Super Speciality / Sub-speciality (Optional)
                </label>
                <input
                  type="text"
                  value={superSpeciality}
                  onChange={(e) => setSuperSpeciality(e.target.value)}
                  placeholder="e.g. Surgical Oncology, Interventional Cardiology"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Fellowship / Additional Credentials (Optional)
                </label>
                <input
                  type="text"
                  value={fellowship}
                  onChange={(e) => setFellowship(e.target.value)}
                  placeholder="e.g. Minimal Access Surgery (FMAS), Critical Care"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: CLINICAL EXPERIENCE */}
        {currentStep === 5 && (
          <div>
            <p className="cqs-section-hint">
              Define your clinical experience level so employers and AI filters match you accurately:
            </p>

            <label className="block text-xs font-bold text-slate-900 mb-2">
              1. Experience Band
            </label>
            <div className="cqs-band-grid">
              {EXPERIENCE_BANDS.map((band) => {
                const isSelected = experienceBand === band;
                return (
                  <div
                    key={band}
                    onClick={() => setExperienceBand(band)}
                    className={`cqs-band-pill ${isSelected ? 'is-selected' : ''}`}
                  >
                    {band}
                  </div>
                );
              })}
            </div>

            <div className="cqs-exp-card mt-3">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-900">
                  2. Exact Total Clinical Experience
                </span>
                <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full">
                  Total: {experienceYears} Years {experienceMonths} Months
                </span>
              </div>
              <div className="cqs-exp-inputs">
                <div className="cqs-exp-field">
                  <label>Completed Years</label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={experienceYears}
                    onChange={(e) => setExperienceYears(Math.max(0, parseInt(e.target.value) || 0))}
                  />
                </div>
                <div className="cqs-exp-field">
                  <label>Additional Months</label>
                  <input
                    type="number"
                    min="0"
                    max="11"
                    value={experienceMonths}
                    onChange={(e) =>
                      setExperienceMonths(Math.min(11, Math.max(0, parseInt(e.target.value) || 0)))
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 6: TARGET JOB ROLES */}
        {currentStep === 6 && (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2 mb-2.5">
              <p className="cqs-section-hint mb-0 min-w-0 text-xs sm:text-sm">
                Select target positions for AI matching ({preferredJobRoles.length} selected):
              </p>
              <div className="flex items-center gap-2 text-xs shrink-0 self-end sm:self-auto whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => {
                    const allRoles = CATEGORY_JOB_ROLES[category] || CATEGORY_JOB_ROLES.Doctor;
                    setPreferredJobRoles(allRoles);
                  }}
                  className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 font-bold hover:bg-blue-100 transition cursor-pointer shrink-0 whitespace-nowrap"
                >
                  Select All
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={() => setPreferredJobRoles([])}
                  className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 font-semibold hover:bg-slate-200 transition cursor-pointer shrink-0 whitespace-nowrap"
                >
                  Clear All
                </button>
              </div>
            </div>

            <div className="cqs-roles-grid">
              {(CATEGORY_JOB_ROLES[category] || CATEGORY_JOB_ROLES.Doctor).map((role) => {
                const isSelected = preferredJobRoles.includes(role);
                return (
                  <div
                    key={role}
                    onClick={() => toggleRole(role)}
                    className={`cqs-role-card ${isSelected ? 'is-selected' : ''}`}
                  >
                    <span className="cqs-role-title">{role}</span>
                    <div className="cqs-checkbox-box">
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 7: SECTOR, EMPLOYMENT TYPE, & LOCATION */}
        {currentStep === 7 && (
          <div>
            <p className="cqs-section-hint">
              Configure sector preferences, work modes, and practice locations:
            </p>

            <label className="block text-xs font-bold text-slate-900 mb-2">
              1. Organization Sector
            </label>
            <div className="cqs-sector-grid">
              {SECTOR_OPTIONS.map((sec) => {
                const isSelected = preferredSectors.includes(sec.id);
                return (
                  <div
                    key={sec.id}
                    onClick={() => toggleSector(sec.id)}
                    className={`cqs-sector-pill ${isSelected ? 'is-selected' : ''}`}
                  >
                    <span className="cqs-sector-label">{sec.label}</span>
                    {isSelected && <Check className="w-4 h-4 text-blue-600" />}
                  </div>
                );
              })}
            </div>

            <label className="block text-xs font-bold text-slate-900 mt-4 mb-2">
              2. Employment Type
            </label>
            <div className="flex items-center gap-2 flex-wrap mb-4">
              {EMPLOYMENT_TYPES.map((emp) => {
                const isSelected = preferredEmploymentTypes.includes(emp);
                return (
                  <button
                    key={emp}
                    type="button"
                    onClick={() => toggleEmploymentType(emp)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {emp}
                  </button>
                );
              })}
            </div>

            <label className="block text-xs font-bold text-slate-900 mt-4 mb-2">
              3. Work Location Preference
            </label>
            <div className="cqs-loc-tabs">
              <button
                type="button"
                onClick={() => setLocationPreferenceType('anywhere')}
                className={`cqs-loc-tab ${locationPreferenceType === 'anywhere' ? 'is-active' : ''}`}
              >
                Anywhere in India (Pan-India)
              </button>
              <button
                type="button"
                onClick={() => setLocationPreferenceType('state')}
                className={`cqs-loc-tab ${locationPreferenceType === 'state' ? 'is-active' : ''}`}
              >
                By State ({preferredStates.length})
              </button>
              <button
                type="button"
                onClick={() => setLocationPreferenceType('city')}
                className={`cqs-loc-tab ${locationPreferenceType === 'city' ? 'is-active' : ''}`}
              >
                By City
              </button>
            </div>

            {locationPreferenceType === 'state' && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <input
                  type="text"
                  value={stateSearch}
                  onChange={(e) => setStateSearch(e.target.value)}
                  placeholder="Search Indian States / UTs..."
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg mb-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                  {filteredStates.map((st) => {
                    const isSelected = preferredStates.includes(st);
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => toggleState(st)}
                        className={`px-2 py-1 rounded-md text-xs font-medium border transition-colors ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600 font-bold'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {st} {isSelected && '✓'}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {locationPreferenceType === 'city' && (
              <div>
                <input
                  type="text"
                  value={preferredCitiesInput}
                  onChange={(e) => setPreferredCitiesInput(e.target.value)}
                  placeholder="Enter preferred cities separated by commas (e.g. New Delhi, Mumbai, Bengaluru)"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            )}
          </div>
        )}

        {/* STEP 8: REVIEW & JOB ALERTS */}
        {currentStep === 8 && (
          <div>
            <p className="cqs-section-hint">
              Review your structured clinical profile and activate instant job matching alerts:
            </p>

            {/* Profile Summary Card */}
            <div className="cqs-review-box">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900 uppercase tracking-wide">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Structured Qualification Profile
                </div>
                <span className="cqs-review-badge">
                  ✓ Ready for Matching
                </span>
              </div>

              <div className="cqs-review-meta-grid">
                <div className="cqs-review-item">
                  <label>Professional Domain</label>
                  <strong>{category}</strong>
                </div>
                <div className="cqs-review-item">
                  <label>Basic Degree</label>
                  <strong>{basicQualification}</strong>
                </div>
                <div className="cqs-review-item">
                  <label>Highest Qualification</label>
                  <strong>{highestQualification || basicQualification}</strong>
                </div>
                {speciality && (
                  <div className="cqs-review-item">
                    <label>Clinical Speciality</label>
                    <strong className="text-blue-700">{speciality}</strong>
                  </div>
                )}
                <div className="cqs-review-item">
                  <label>Clinical Experience</label>
                  <strong>{experienceBand} ({experienceYears}y {experienceMonths}m)</strong>
                </div>
                <div className="cqs-review-item">
                  <label>Target Roles</label>
                  <strong>
                    {preferredJobRoles.length > 0 ? preferredJobRoles.slice(0, 2).join(', ') : 'All Relevant'}
                  </strong>
                </div>
              </div>
            </div>

            {/* Job Alert Type Preferences */}
            <label className="block text-xs font-bold text-slate-900 mb-2">
              Job Alert Type Preference:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-4">
              {ALERT_TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setAlertType(opt.id as any)}
                  className={`p-3 rounded-xl border text-left text-xs transition-all ${
                    alertType === opt.id
                      ? 'border-blue-600 bg-blue-50 font-bold text-blue-900'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Notification Channels */}
            <label className="block text-xs font-bold text-slate-900 mb-2">
              Active Notification Channels:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div
                onClick={() => setChannelWebsite(!channelWebsite)}
                className={`cqs-channel-card ${channelWebsite ? 'is-active' : ''}`}
              >
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-semibold text-slate-800">Website Alerts</span>
                </div>
                <input
                  type="checkbox"
                  checked={channelWebsite}
                  onChange={(e) => setChannelWebsite(e.target.checked)}
                  className="rounded text-blue-600"
                />
              </div>

              <div
                onClick={() => setChannelEmail(!channelEmail)}
                className={`cqs-channel-card ${channelEmail ? 'is-active' : ''}`}
              >
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-semibold text-slate-800">Email Alerts</span>
                </div>
                <input
                  type="checkbox"
                  checked={channelEmail}
                  onChange={(e) => setChannelEmail(e.target.checked)}
                  className="rounded text-indigo-600"
                />
              </div>

              <div
                onClick={() => setChannelWhatsapp(!channelWhatsapp)}
                className={`cqs-channel-card ${channelWhatsapp ? 'is-active' : ''}`}
              >
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-semibold text-slate-800">WhatsApp Alerts</span>
                </div>
                <input
                  type="checkbox"
                  checked={channelWhatsapp}
                  onChange={(e) => setChannelWhatsapp(e.target.checked)}
                  className="rounded text-emerald-600"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. STICKY FOOTER (ALWAYS VISIBLE ON MOBILE & LAPTOP) */}
      <div className="cqs-footer">
        {currentStep > 1 ? (
          <button
            type="button"
            onClick={handleBack}
            className="cqs-btn-back"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
        ) : (
          <div />
        )}

        {currentStep < 8 ? (
          <button
            type="button"
            onClick={handleNext}
            className="cqs-btn-continue"
          >
            Continue <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          /* HIGH-CONTRAST EMERALD SUBMIT BUTTON - BULLETPROOF STYLING */
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="cqs-btn-submit"
          >
            {saving ? (
              'Saving Profile...'
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" /> Save Profile & Activate Job Alerts
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
