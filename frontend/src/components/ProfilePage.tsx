import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Edit3,
  Globe,
  GraduationCap,
  Mail,
  MapPin,
  Phone,
  Save,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  User,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { fetchEmployer, updateEmployerProfile, EmployerResponse, EmployerProfileUpdatePayload } from '../api/employers';
import { CandidateProfileData, fetchMyCandidateProfile, updateMyCandidateProfile } from '../api/candidateProfiles';
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
            <div className="profile-avatar">{initials(displayName)}</div>
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
            <main className="profile-main-column">
              <ProfileSection
                icon={Stethoscope}
                title="Clinical Profile"
                subtitle="Structured fields make your profile searchable by speciality and role."
                variant="teal"
              >
                <div className="profile-fields-grid">
                  <Field label="Primary Speciality">
                    <select
                      className="profile-select"
                      value={candidate.speciality || ''}
                      onChange={(e) => setCandidate({ ...candidate, speciality: e.target.value })}
                    >
                      <option value="">Select speciality</option>
                      {SPECIALITIES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Sub-speciality">
                    <input
                      className="profile-input"
                      value={candidate.subSpeciality || ''}
                      onChange={(e) => setCandidate({ ...candidate, subSpeciality: e.target.value })}
                      placeholder="e.g. GI Surgery"
                    />
                  </Field>
                  <Field label="Highest Qualification">
                    <input
                      className="profile-input"
                      value={candidate.qualification || ''}
                      onChange={(e) => setCandidate({ ...candidate, qualification: e.target.value })}
                      placeholder="e.g. MS General Surgery"
                    />
                  </Field>
                  <Field label="Years of Experience">
                    <input
                      className="profile-input"
                      type="number"
                      min="0"
                      max="80"
                      value={candidate.yearsExperience ?? ''}
                      onChange={(e) =>
                        setCandidate({
                          ...candidate,
                          yearsExperience: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                      placeholder="e.g. 5"
                    />
                  </Field>
                </div>
              </ProfileSection>

              <ProfileSection
                icon={ShieldCheck}
                title="Professional Registration"
                subtitle="Helps employers verify professional context before shortlisting."
                variant="indigo"
              >
                <div className="profile-fields-grid">
                  <Field label="Registration Council">
                    <input
                      className="profile-input"
                      value={candidate.registrationCouncil || ''}
                      onChange={(e) =>
                        setCandidate({ ...candidate, registrationCouncil: e.target.value })
                      }
                      placeholder="e.g. Delhi Medical Council"
                    />
                  </Field>
                  <Field label="Registration Number">
                    <input
                      className="profile-input"
                      value={candidate.registrationNumber || ''}
                      onChange={(e) =>
                        setCandidate({ ...candidate, registrationNumber: e.target.value })
                      }
                      placeholder="e.g. DMC/R/12345"
                    />
                  </Field>
                </div>
              </ProfileSection>

              <ProfileSection
                icon={MapPin}
                title="Location & Preference"
                subtitle="Used for location-based candidate segmentation and relevant opportunities."
                variant="green"
              >
                <div className="profile-fields-grid">
                  <Field label="Current City">
                    <input
                      className="profile-input"
                      value={candidate.currentCity || ''}
                      onChange={(e) => setCandidate({ ...candidate, currentCity: e.target.value })}
                      placeholder="e.g. New Delhi"
                    />
                  </Field>
                  <Field label="State">
                    <select
                      className="profile-select"
                      value={candidate.state || ''}
                      onChange={(e) => setCandidate({ ...candidate, state: e.target.value })}
                    >
                      <option value="">Select state</option>
                      {INDIAN_STATES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Preferred Location">
                    <input
                      className="profile-input"
                      value={candidate.preferredLocation || ''}
                      onChange={(e) =>
                        setCandidate({ ...candidate, preferredLocation: e.target.value })
                      }
                      placeholder="City / State / Anywhere"
                    />
                  </Field>
                  <Field label="Employment Preference">
                    <select
                      className="profile-select"
                      value={candidate.employmentPreference || ''}
                      onChange={(e) =>
                        setCandidate({ ...candidate, employmentPreference: e.target.value })
                      }
                    >
                      <option value="">Select preference</option>
                      <option value="Full Time">Full Time</option>
                      <option value="Part Time">Part Time</option>
                      <option value="Contract">Contract</option>
                      <option value="Locum">Locum</option>
                      <option value="Any">Any</option>
                    </select>
                  </Field>
                </div>
              </ProfileSection>

              <ProfileSection
                icon={GraduationCap}
                title="Professional Summary"
                subtitle="A short employer-facing summary."
                variant="blue"
              >
                <textarea
                  className="profile-textarea"
                  value={candidate.profileSummary || ''}
                  onChange={(e) => setCandidate({ ...candidate, profileSummary: e.target.value })}
                  placeholder="Clinical focus, key procedures, work setting and strengths…"
                />
              </ProfileSection>

              <div className="profile-actions-bar">
                <button
                  type="button"
                  disabled={saving}
                  className="profile-save-btn"
                  onClick={() => void saveCandidate()}
                >
                  <Save className={`h-4.5 w-4.5 ${saving ? 'animate-spin' : ''}`} />
                  {saving ? 'Saving Medical Profile…' : 'Save Medical Profile'}
                </button>
              </div>
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
