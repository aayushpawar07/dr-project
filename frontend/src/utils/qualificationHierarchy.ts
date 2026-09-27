export interface CategoryOption {
  id: string;
  label: string;
  shortLabel: string;
  icon: string;
  description: string;
}

export const PROFESSIONAL_CATEGORIES: CategoryOption[] = [
  {
    id: 'Doctor',
    label: 'Doctor (Allopathy / Modern Medicine)',
    shortLabel: 'Doctor',
    icon: '👨‍⚕️',
    description: 'MBBS, MD, MS, DNB, DM, M.Ch, Fellowship & Medical Specialities',
  },
  {
    id: 'Dentist',
    label: 'Dentist (Dental Surgery)',
    shortLabel: 'Dentist',
    icon: '🦷',
    description: 'BDS, MDS, Dental Surgery & Dental Specialities',
  },
  {
    id: 'AYUSH',
    label: 'AYUSH Practitioner',
    shortLabel: 'AYUSH',
    icon: '🌿',
    description: 'Ayurveda (BAMS), Homeopathy (BHMS), Unani (BUMS), Siddha, Naturopathy',
  },
  {
    id: 'Nursing',
    label: 'Nursing & Midwifery',
    shortLabel: 'Nursing',
    icon: '👩‍⚕️',
    description: 'ANM, GNM, B.Sc Nursing, M.Sc Nursing, Critical Care & OT Nursing',
  },
  {
    id: 'Pharmacy',
    label: 'Pharmacy Professional',
    shortLabel: 'Pharmacy',
    icon: '💊',
    description: 'D.Pharm, B.Pharm, Pharm.D, M.Pharm, Clinical & Hospital Pharmacy',
  },
  {
    id: 'Paramedical',
    label: 'Paramedical / Allied Health',
    shortLabel: 'Paramedical',
    icon: '🧪',
    description: 'MLT, Radiology, OT, Dialysis, Cardiac Care, Optometry, Physiotherapy',
  },
  {
    id: 'Other',
    label: 'Other Healthcare Professional',
    shortLabel: 'Other Healthcare',
    icon: '🏥',
    description: 'Healthcare Administration, Public Health, Clinical Research & Dietetics',
  },
];

// BASIC QUALIFICATIONS PER CATEGORY
export const BASIC_QUALIFICATIONS: Record<string, string[]> = {
  Doctor: ['MBBS', 'Foreign Medical Graduate (FMG)', 'Other Basic Medical'],
  Dentist: ['BDS'],
  AYUSH: ['BAMS', 'BHMS', 'BUMS', 'BSMS', 'BNYS', 'Other AYUSH'],
  Nursing: [
    'ANM',
    'GNM',
    'B.Sc Nursing',
    'Post Basic B.Sc Nursing',
    'M.Sc Nursing',
    'Other Nursing Qualification',
  ],
  Pharmacy: ['D.Pharm', 'B.Pharm', 'Pharm.D', 'M.Pharm', 'Other Pharmacy Qualification'],
  Paramedical: [
    'DMLT / Lab Technician',
    'B.Sc MLT / BMLT',
    'Radiology Technician / Radiographer',
    'B.Sc Radiology / Medical Imaging',
    'OT Technician',
    'B.Sc Operation Theatre Technology',
    'Dialysis Technician',
    'B.Sc Dialysis Technology',
    'ECG Technician',
    'Cardiac Care Technician',
    'Anaesthesia Technician',
    'Emergency Medical Technician',
    'Respiratory Therapist',
    'Optometrist / Optometry',
    'Physiotherapist / BPT',
    'Occupational Therapist',
    'Audiologist / Speech Therapist',
    'Other Paramedical Qualification',
  ],
  Other: [
    'Healthcare Administration (MHA/BHA)',
    'Public Health (MPH)',
    'Clinical Research',
    'Mental Health & Psychology',
    'Nutrition & Dietetics',
    'Hospital Operations',
    'Other Healthcare Degree',
  ],
};

// HIGHEST QUALIFICATION OPTIONS PER CATEGORY
export const HIGHEST_QUALIFICATIONS: Record<string, string[]> = {
  Doctor: [
    'MBBS Only',
    'PG Diploma',
    'MD',
    'MS',
    'DNB',
    'DrNB',
    'DM',
    'M.Ch',
    'Fellowship',
    'Other',
  ],
  Dentist: ['BDS Only', 'MDS', 'Fellowship', 'Other'],
  AYUSH: ['No Higher Qualification', 'PG (MD/MS AYUSH)', 'Fellowship', 'Other'],
  Nursing: ['None / Basic Only', 'Speciality Certificate', 'M.Sc Nursing', 'Fellowship', 'Other'],
  Pharmacy: ['None / Basic Only', 'M.Pharm Speciality', 'Pharm.D (PB)', 'Other'],
  Paramedical: ["No Higher Qualification", "Diploma", "Bachelor's", "Master's", "Fellowship", "Other"],
  Other: ['Bachelor Degree', 'Master Degree', 'Post Graduate Diploma', 'Doctorate / PhD', 'Other'],
};

// SPECIALITIES BASED ON HIGHEST QUALIFICATION
export const QUALIFICATION_SPECIALITIES: Record<string, string[]> = {
  // DOCTOR MD
  MD: [
    'General Medicine',
    'Paediatrics',
    'Dermatology',
    'Psychiatry',
    'Anaesthesiology',
    'Radiodiagnosis',
    'Respiratory Medicine / Pulmonary Medicine',
    'Emergency Medicine',
    'Radiation Oncology',
    'Nuclear Medicine',
    'Pathology',
    'Microbiology',
    'Pharmacology',
    'Forensic Medicine',
    'Community Medicine',
    'Family Medicine',
    'Geriatric Medicine',
    'Palliative Medicine',
    'Transfusion Medicine',
    'Immunohematology & Blood Transfusion',
    'Other MD Speciality',
  ],

  // DOCTOR MS
  MS: [
    'General Surgery',
    'Orthopaedics',
    'ENT / Otorhinolaryngology',
    'Ophthalmology',
    'Obstetrics & Gynaecology',
    'Other MS Speciality',
  ],

  // DOCTOR DNB
  DNB: [
    'General Medicine',
    'General Surgery',
    'Paediatrics',
    'Orthopaedics',
    'ENT',
    'Ophthalmology',
    'Obstetrics & Gynaecology',
    'Anaesthesiology',
    'Radiodiagnosis',
    'Dermatology',
    'Psychiatry',
    'Respiratory Medicine',
    'Emergency Medicine',
    'Family Medicine',
    'Nuclear Medicine',
    'Radiation Oncology',
    'Pathology',
    'Other DNB Speciality',
  ],

  // DOCTOR DrNB (Super Speciality)
  DrNB: [
    'Cardiology',
    'Neurology',
    'Nephrology',
    'Medical Gastroenterology',
    'Endocrinology',
    'Medical Oncology',
    'Critical Care Medicine',
    'Paediatric Neurology',
    'Other DrNB Speciality',
  ],

  // DOCTOR PG Diploma
  'PG Diploma': [
    'DCH — Paediatrics',
    'DGO — Obstetrics & Gynaecology',
    'D.Ortho — Orthopaedics',
    'DLO — ENT',
    'DO — Ophthalmology',
    'DMRD — Radiodiagnosis',
    'DA — Anaesthesiology',
    'DDVL — Dermatology',
    'DPM — Psychiatry',
    'DTCD — Respiratory Medicine',
    'DCP — Pathology',
    'Other PG Diploma',
  ],

  // DOCTOR DM (Super Speciality)
  DM: [
    'Cardiology',
    'Neurology',
    'Gastroenterology',
    'Nephrology',
    'Endocrinology',
    'Medical Oncology',
    'Clinical Haematology',
    'Rheumatology',
    'Infectious Diseases',
    'Hepatology',
    'Critical Care Medicine',
    'Neonatology',
    'Other DM Speciality',
  ],

  // DOCTOR M.Ch (Super Speciality Surgical)
  'M.Ch': [
    'Neurosurgery',
    'Urology',
    'Paediatric Surgery',
    'Plastic Surgery',
    'Cardiothoracic & Vascular Surgery',
    'Surgical Oncology',
    'Vascular Surgery',
    'Other M.Ch Speciality',
  ],

  // FELLOWSHIP AREAS
  Fellowship: [
    'Critical Care',
    'Cardiology',
    'Emergency Medicine',
    'Diabetes',
    'Gastroenterology',
    'Oncology',
    'Neonatology',
    'Paediatrics',
    'Minimal Access Surgery',
    'Trauma',
    'Other Fellowship',
  ],

  // DENTIST MDS
  MDS: [
    'Oral & Maxillofacial Surgery',
    'Orthodontics',
    'Prosthodontics',
    'Conservative Dentistry & Endodontics',
    'Periodontology',
    'Paediatric Dentistry',
    'Oral Medicine & Radiology',
    'Oral Pathology',
    'Public Health Dentistry',
    'Other MDS Speciality',
  ],

  // NURSING SPECIALITIES
  NursingSpecialities: [
    'General Nursing',
    'Medical-Surgical Nursing',
    'Paediatric Nursing',
    'Obstetrics & Gynaecology',
    'ICU / Critical Care',
    'Community Health',
    'Mental Health',
    'Operation Theatre (OT) Nursing',
    'Other',
  ],

  // PHARMACY SPECIALITIES
  PharmacySpecialities: [
    'Clinical Pharmacy',
    'Hospital Pharmacy',
    'Pharmacology',
    'Pharmaceutics',
    'Pharmaceutical Analysis',
    'Pharmacovigilance',
    'Other',
  ],
};

// EXPERIENCE BANDS
export const EXPERIENCE_BANDS = [
  'Fresher',
  'Less than 1 Year',
  '1–2 Years',
  '2–3 Years',
  '3–5 Years',
  '5–10 Years',
  '10+ Years',
];

// CATEGORY-SPECIFIC JOB ROLES (Multi-select options)
export const CATEGORY_JOB_ROLES: Record<string, string[]> = {
  Doctor: [
    'Junior Resident',
    'Senior Resident',
    'Medical Officer',
    'GDMO',
    'Specialist',
    'Senior Specialist',
    'Consultant',
    'Faculty',
    'Assistant Professor',
    'Associate Professor',
    'Professor',
    'Demonstrator',
    'Research / Clinical Investigator',
    'Other',
  ],
  Dentist: [
    'Dental Surgeon',
    'Junior Resident (Dental)',
    'Senior Resident (Dental)',
    'Consultant Dentist',
    'Specialist Dental Surgeon',
    'Assistant Professor',
    'Associate Professor',
    'Professor',
    'Other',
  ],
  AYUSH: [
    'Ayush Medical Officer (AMO)',
    'Research Officer (Ayush)',
    'Senior Resident (Ayush)',
    'Consultant',
    'Assistant Professor',
    'Associate Professor',
    'Other',
  ],
  Nursing: [
    'Staff Nurse',
    'Nursing Officer',
    'Senior Nursing Officer',
    'Assistant Nursing Superintendent',
    'ICU Nurse Specialist',
    'Clinical Instructor',
    'Nursing Tutor',
    'Other',
  ],
  Pharmacy: [
    'Pharmacist',
    'Chief Pharmacist',
    'Clinical Pharmacist',
    'Hospital Pharmacist',
    'Drug Safety Associate',
    'Store In-charge / Pharmacy Officer',
    'Other',
  ],
  Paramedical: [
    'Technician',
    'Senior Technician',
    'Lab Technician',
    'Radiographer',
    'OT Technician',
    'Dialysis Technician',
    'ECG Technician',
    'Physiotherapist',
    'Cardiac Care Technologist',
    'Emergency Medical Technician',
    'Other',
  ],
  Other: [
    'Hospital Administrator',
    'Public Health Specialist',
    'Quality & Accreditation Manager',
    'Clinical Research Coordinator',
    'Medical Superintendent',
    'Other',
  ],
};

// JOB TYPE SECTORS
export const SECTOR_OPTIONS = [
  { id: 'government', label: 'Government Jobs (AIIMS, State Health, Central Govt)' },
  { id: 'private', label: 'Private Jobs (Corporate Hospitals, Private Medical Colleges)' },
  { id: 'both', label: 'Government + Private (Show both)' },
];

// EMPLOYMENT TYPES
export const EMPLOYMENT_TYPES = [
  'Full Time',
  'Part Time',
  'Contract',
  'Temporary',
  'Permanent',
  'Internship',
];

// INDIAN STATES LIST FOR PREFERRED LOCATION
export const ALL_INDIAN_STATES = [
  'All India / Anywhere',
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chandigarh',
  'Chhattisgarh',
  'Delhi NCR',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jammu & Kashmir',
  'Jharkhand',
  'Karnataka',
  'Kerala',
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

// JOB ALERT PREFERENCES
export const ALERT_TYPE_OPTIONS = [
  { id: 'government', label: 'Government Jobs Only' },
  { id: 'private', label: 'Private Jobs Only' },
  { id: 'both', label: 'Both Government & Private Jobs' },
];

export const ALERT_FREQUENCY_OPTIONS = [
  { id: 'instant', label: 'Instant Alerts', desc: 'Notify immediately when matching vacancy is published' },
  { id: 'daily', label: 'Daily Digest', desc: 'Summary of new jobs once per day' },
  { id: 'weekly', label: 'Weekly Summary', desc: 'Curated weekly list of top matched openings' },
];
