import React, { useState, useMemo, useEffect } from 'react';
import {
  CheckCircle,
  CheckCircle2,
  Stethoscope,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  Briefcase,
  GraduationCap,
  MapPin,
  Bell,
  Clock,
  Sparkles,
  Search,
  Building2,
  SlidersHorizontal,
  Mail,
  Smartphone,
  Save,
  Check,
  X,
  RotateCcw,
} from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
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
  ALERT_FREQUENCY_OPTIONS,
} from '../utils/qualificationHierarchy';

interface StepperProps {
  initialProfile: CandidateProfileData;
  token: string;
  onSaved: (updatedProfile: CandidateProfileData) => void;
  onCancel?: () => void;
  isModal?: boolean;
}

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
  const [alertFrequency, setAlertFrequency] = useState<'instant' | 'daily' | 'weekly'>(
    initialProfile.jobAlertSettings?.frequency || 'instant'
  );
  const [channelWebsite, setChannelWebsite] = useState(
    initialProfile.jobAlertSettings?.channels?.website ?? true
  );
  const [channelEmail, setChannelEmail] = useState(
    initialProfile.jobAlertSettings?.channels?.email ?? true
  );
  const [channelWhatsapp, setChannelWhatsapp] = useState(
    initialProfile.jobAlertSettings?.channels?.whatsapp ?? false
  );

  // Speciality search filter
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
    if (highestQualification === 'MBBS Only' || highestQualification === 'BDS Only' || highestQualification === 'No Higher Qualification') {
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

  // Total steps: 8 (or 7 if speciality is skipped)
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
      // If speciality is needed, go to step 4; otherwise skip directly to step 5 (Experience)
      if (needsSpecialityStep) {
        setCurrentStep(4);
      } else {
        setCurrentStep(5);
      }
      return;
    }

    if (currentStep === 4) {
      if (needsSpecialityStep && !speciality) {
        toast.error('Please select your primary clinical speciality');
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

      const payload: CandidateProfileData = {
        ...initialProfile,
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
          frequency: alertFrequency,
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
    <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden ${isModal ? 'p-0' : 'p-4 sm:p-7'}`}>

      {/* STEPPER TOP HEADER */}
      <div className="border-b border-slate-100 pb-5 mb-6">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">
              Step {currentStep} of 8
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
              {currentStep === 1 && 'What best describes your professional role?'}
              {currentStep === 2 && `Select your basic qualification in ${category}`}
              {currentStep === 3 && 'Select your highest / post-graduate qualification'}
              {currentStep === 4 && `Select your clinical speciality in ${highestQualification}`}
              {currentStep === 5 && 'Clinical Experience'}
              {currentStep === 6 && 'Target Job Roles'}
              {currentStep === 7 && 'Job Type & Preferred Location'}
              {currentStep === 8 && 'Review & Job Alert Preferences'}
            </h2>
          </div>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
          <div
            className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full transition-all duration-300 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Breadcrumb pills of selection */}
        <div className="flex items-center gap-1.5 flex-wrap mt-3 text-xs text-slate-500 font-medium">
          <span className="text-blue-600 font-bold">{category}</span>
          {basicQualification && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
              <span className="text-slate-700">{basicQualification}</span>
            </>
          )}
          {highestQualification && highestQualification !== 'MBBS Only' && highestQualification !== 'None / Basic Only' && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
              <span className="text-slate-700 font-semibold">{highestQualification}</span>
            </>
          )}
          {speciality && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
              <span className="text-teal-700 font-semibold bg-teal-50 px-2 py-0.5 rounded">
                {speciality}
              </span>
            </>
          )}
        </div>
      </div>

      {/* STEP CONTENT BODY */}
      <div className="min-h-[360px] pb-4">

        {/* STEP 1: PROFESSIONAL CATEGORY SELECTION CARDS */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Select your primary healthcare domain to customize your qualifications and relevant job matching:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {PROFESSIONAL_CATEGORIES.map((cat) => {
                const isSelected = category === cat.id;
                return (
                  <div
                    key={cat.id}
                    onClick={() => handleCategorySelect(cat.id)}
                    className={`relative p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/50 shadow-sm ring-2 ring-blue-500/20'
                        : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="text-3xl mb-2">{cat.icon}</div>
                      {isSelected && (
                        <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-base leading-tight">
                        {cat.label}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 leading-snug">
                        {cat.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 2: BASIC QUALIFICATION */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Select your foundational degree or qualification in <strong className="text-slate-900">{category}</strong>:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {(BASIC_QUALIFICATIONS[category] || []).map((qual) => {
                const isSelected = basicQualification === qual;
                return (
                  <div
                    key={qual}
                    onClick={() => setBasicQualification(qual)}
                    className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/60 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-100/60 text-blue-700 flex items-center justify-center font-bold text-sm">
                        🎓
                      </div>
                      <span className="font-bold text-slate-900 text-sm">{qual}</span>
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 stroke-[3]" />
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
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Select your highest qualification achieved or currently pursuing:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {(HIGHEST_QUALIFICATIONS[category] || []).map((hQual) => {
                const isSelected = highestQualification === hQual;
                return (
                  <div
                    key={hQual}
                    onClick={() => {
                      setHighestQualification(hQual);
                      setSpeciality('');
                    }}
                    className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/60 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-indigo-100/60 text-indigo-700 flex items-center justify-center font-bold text-sm">
                        ⭐
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 text-sm block">
                          {hQual}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {hQual === 'MBBS Only' || hQual === 'BDS Only' || hQual === 'No Higher Qualification'
                            ? 'Undergraduate / Primary degree'
                            : 'Post-Graduate / Specialist Degree'}
                        </span>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 4: SPECIALITY (CONDITIONAL) */}
        {currentStep === 4 && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <p className="text-sm text-slate-600">
                Choose your specific clinical speciality in <strong className="text-blue-700">{highestQualification}</strong>:
              </p>
              {/* Quick Search */}
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={specialitySearch}
                  onChange={(e) => setSpecialitySearch(e.target.value)}
                  placeholder="Search speciality..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-[380px] overflow-y-auto p-1">
              {filteredSpecialities.length === 0 ? (
                <div className="col-span-3 py-8 text-center text-slate-400">
                  <p className="text-sm font-semibold text-slate-600">No speciality matches &quot;{specialitySearch}&quot;</p>
                  <button
                    type="button"
                    onClick={() => setSpeciality(specialitySearch)}
                    className="text-xs text-blue-600 font-bold mt-2 hover:underline"
                  >
                    Use &quot;{specialitySearch}&quot; as custom speciality
                  </button>
                </div>
              ) : (
                filteredSpecialities.map((spec) => {
                  const isSelected = speciality === spec;
                  return (
                    <div
                      key={spec}
                      onClick={() => setSpeciality(spec)}
                      className={`p-3 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold shadow-xs'
                          : 'border-slate-200 text-slate-700 hover:bg-slate-50 font-medium'
                      }`}
                    >
                      <span className="text-xs sm:text-sm truncate">{spec}</span>
                      {isSelected && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                    </div>
                  );
                })
              )}
            </div>

            {/* Optional Super Speciality / Fellowship area */}
            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
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
              <div className="flex-1">
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

        {/* STEP 5: EXPERIENCE */}
        {currentStep === 5 && (
          <div className="space-y-5">
            <div>
              <p className="text-sm font-semibold text-slate-900 mb-2">
                1. Select your Experience Band:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {EXPERIENCE_BANDS.map((band) => {
                  const isSelected = experienceBand === band;
                  return (
                    <div
                      key={band}
                      onClick={() => setExperienceBand(band)}
                      className={`p-3 rounded-xl border-2 transition-all cursor-pointer text-center ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/70 text-blue-900 font-bold'
                          : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-xs sm:text-sm">{band}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <p className="text-sm font-semibold text-slate-900 mb-2">
                2. Exact Total Clinical Experience:
              </p>
              <div className="grid grid-cols-2 gap-4 max-w-sm">
                <div>
                  <label className="block text-xs text-slate-500 mb-1 font-medium">Years</label>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={experienceYears}
                    onChange={(e) => setExperienceYears(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="Years"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1 font-medium">Months</label>
                  <input
                    type="number"
                    min="0"
                    max="11"
                    value={experienceMonths}
                    onChange={(e) => setExperienceMonths(Math.min(11, Math.max(0, parseInt(e.target.value) || 0)))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="Months"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 6: JOB ROLES (CATEGORY-DEPENDENT) */}
        {currentStep === 6 && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Select the positions you are interested in applying for (multiple selections allowed):
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-[380px] overflow-y-auto p-1">
              {(CATEGORY_JOB_ROLES[category] || CATEGORY_JOB_ROLES.Doctor).map((role) => {
                const isSelected = preferredJobRoles.includes(role);
                return (
                  <div
                    key={role}
                    onClick={() => toggleRole(role)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/80 text-blue-900 font-bold'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50 font-medium'
                    }`}
                  >
                    <span className="text-xs sm:text-sm">{role}</span>
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 7: JOB TYPE & PREFERRED LOCATION */}
        {currentStep === 7 && (
          <div className="space-y-5">
            {/* Sector Preference */}
            <div>
              <p className="text-sm font-semibold text-slate-900 mb-2">
                1. Organization Sector Preference:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {SECTOR_OPTIONS.map((sec) => {
                  const isSelected = preferredSectors.includes(sec.id);
                  return (
                    <div
                      key={sec.id}
                      onClick={() => toggleSector(sec.id)}
                      className={`p-3 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/70 text-blue-900 font-bold'
                          : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-xs font-medium">{sec.label}</span>
                      {isSelected && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Employment Type */}
            <div className="pt-2 border-t border-slate-100">
              <p className="text-sm font-semibold text-slate-900 mb-2">
                2. Employment Type (Select all that apply):
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                {EMPLOYMENT_TYPES.map((emp) => {
                  const isSelected = preferredEmploymentTypes.includes(emp);
                  return (
                    <button
                      key={emp}
                      type="button"
                      onClick={() => toggleEmploymentType(emp)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
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
            </div>

            {/* Location Preference */}
            <div className="pt-2 border-t border-slate-100">
              <p className="text-sm font-semibold text-slate-900 mb-2">
                3. Work Location Preference:
              </p>
              <div className="grid grid-cols-3 gap-2.5 mb-3">
                <button
                  type="button"
                  onClick={() => setLocationPreferenceType('anywhere')}
                  className={`p-2.5 rounded-lg border text-xs font-semibold text-center transition-all ${
                    locationPreferenceType === 'anywhere'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Anywhere in India
                </button>
                <button
                  type="button"
                  onClick={() => setLocationPreferenceType('state')}
                  className={`p-2.5 rounded-lg border text-xs font-semibold text-center transition-all ${
                    locationPreferenceType === 'state'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Specific States
                </button>
                <button
                  type="button"
                  onClick={() => setLocationPreferenceType('city')}
                  className={`p-2.5 rounded-lg border text-xs font-semibold text-center transition-all ${
                    locationPreferenceType === 'city'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Specific Cities
                </button>
              </div>

              {locationPreferenceType === 'state' && (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={stateSearch}
                      onChange={(e) => setStateSearch(e.target.value)}
                      placeholder="Search state..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap max-h-36 overflow-y-auto p-1">
                    {filteredStates.map((st) => {
                      const isSelected = preferredStates.includes(st);
                      return (
                        <button
                          key={st}
                          type="button"
                          onClick={() => toggleState(st)}
                          className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                            isSelected
                              ? 'bg-blue-50 text-blue-700 border-blue-300 font-bold'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
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
          </div>
        )}

        {/* STEP 8: JOB ALERT PREFERENCES & FINAL REVIEW */}
        {currentStep === 8 && (
          <div className="space-y-5">
            {/* Structured Profile Summary Card */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-blue-800 uppercase tracking-wide flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> Structured Qualification Profile
                </span>
                <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                  Ready to Match
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block">Professional Category</span>
                  <strong className="text-slate-900 text-sm">{category}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Basic Qualification</span>
                  <strong className="text-slate-900 text-sm">{basicQualification}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Highest Qualification</span>
                  <strong className="text-slate-900 text-sm">{highestQualification || basicQualification}</strong>
                </div>
                {speciality && (
                  <div>
                    <span className="text-slate-500 block">Clinical Speciality</span>
                    <strong className="text-teal-700 text-sm">{speciality}</strong>
                  </div>
                )}
                <div>
                  <span className="text-slate-500 block">Clinical Experience</span>
                  <strong className="text-slate-900 text-sm">{experienceBand} ({experienceYears}y {experienceMonths}m)</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Target Job Roles</span>
                  <strong className="text-slate-900 text-sm line-clamp-1">
                    {preferredJobRoles.length > 0 ? preferredJobRoles.join(', ') : 'All Relevant'}
                  </strong>
                </div>
              </div>
            </div>

            {/* Alert Preferences */}
            <div>
              <h3 className="font-bold text-slate-900 text-sm mb-3">
                Job Alert Preferences:
              </h3>
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
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
                <span className="text-xs font-bold text-slate-700 block">
                  Notification Channels:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-800 font-medium">
                    <input
                      type="checkbox"
                      checked={channelWebsite}
                      onChange={(e) => setChannelWebsite(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <Bell className="w-3.5 h-3.5 text-blue-600" />
                    Website Notification
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-800 font-medium">
                    <input
                      type="checkbox"
                      checked={channelEmail}
                      onChange={(e) => setChannelEmail(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <Mail className="w-3.5 h-3.5 text-blue-600" />
                    Email Alerts
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-800 font-medium">
                    <input
                      type="checkbox"
                      checked={channelWhatsapp}
                      onChange={(e) => setChannelWhatsapp(e.target.checked)}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                    WhatsApp Alerts
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* STEPPER FOOTER BUTTONS */}
      <div className="flex items-center justify-between border-t border-slate-100 pt-5 mt-4">
        {currentStep > 1 ? (
          <Button
            type="button"
            variant="outline"
            onClick={handleBack}
            className="flex items-center gap-1.5 text-xs sm:text-sm"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </Button>
        ) : (
          <div />
        )}

        {currentStep < 8 ? (
          <Button
            type="button"
            onClick={handleNext}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-1.5 text-xs sm:text-sm px-5"
          >
            Continue <ChevronRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-2 text-xs sm:text-sm px-6 shadow-md"
          >
            {saving ? (
              'Saving Profile...'
            ) : (
              <>
                <Save className="w-4 h-4" /> Save & Activate Job Alerts
              </>
            )}
          </Button>
        )}
      </div>

    </div>
  );
}
