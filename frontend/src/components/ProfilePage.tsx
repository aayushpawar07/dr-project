import { Building2, CheckCircle2, Mail, MapPin, ShieldCheck, User, Globe2, ArrowLeft } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { fetchEmployer, EmployerResponse } from '../api/employers';

interface ProfilePageProps {
  onNavigate: (page: string) => void;
}

function getInitials(value?: string) {
  const parts = (value || 'User').trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join('') || 'U';
}

function formatDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function ProfilePage({ onNavigate }: ProfilePageProps) {
  const { user, token } = useAuth();
  const [employer, setEmployer] = useState<EmployerResponse | null>(null);
  const [loadingEmployer, setLoadingEmployer] = useState(false);

  useEffect(() => {
    if (user?.role !== 'employer' || !token) {
      setEmployer(null);
      return;
    }

    let active = true;
    setLoadingEmployer(true);

    fetchEmployer(user.id, token)
      .then((data) => {
        if (active) setEmployer(data);
      })
      .catch((error) => {
        console.error('Failed to load employer profile:', error);
        if (active) setEmployer(null);
      })
      .finally(() => {
        if (active) setLoadingEmployer(false);
      });

    return () => {
      active = false;
    };
  }, [token, user]);

  const isEmployer = user?.role === 'employer';
  const displayName = isEmployer ? employer?.companyName || user?.name : user?.name;
  const displayEmail = isEmployer ? employer?.userEmail || user?.email : user?.email;
  const joinedDate = useMemo(() => formatDate(employer?.createdAt), [employer?.createdAt]);

  return (
    <div className="medex-profile-page">
      <div className="medex-profile-shell">
        <div className="medex-profile-header">
          <button type="button" className="medex-profile-back" onClick={() => onNavigate('dashboard')}>
            <ArrowLeft size={17} />
            Back to Dashboard
          </button>
          <div>
            <span className="medex-profile-eyebrow">MedExJob Account</span>
            <h1>{isEmployer ? 'Employer Profile' : 'My Profile'}</h1>
            <p>{isEmployer ? 'Company and account information linked to your employer profile.' : 'Your account information on MedExJob.'}</p>
          </div>
        </div>

        <section className="medex-profile-hero">
          <div className="medex-profile-avatar">{getInitials(displayName)}</div>
          <div className="medex-profile-hero__copy">
            <div className="medex-profile-title-row">
              <h2>{displayName || 'MedExJob User'}</h2>
              {isEmployer && employer?.verificationStatus === 'approved' && (
                <span className="medex-profile-verified"><CheckCircle2 size={15} /> Verified</span>
              )}
            </div>
            <p>{displayEmail || 'No email available'}</p>
            <div className="medex-profile-tags">
              <span>{isEmployer ? employer?.companyType || 'Employer' : 'Candidate'}</span>
              {isEmployer && employer?.employerStatus && <span>{employer.employerStatus}</span>}
            </div>
          </div>
        </section>

        {isEmployer ? (
          <>
            {loadingEmployer ? (
              <div className="medex-profile-loading">Loading employer details...</div>
            ) : (
              <div className="medex-profile-grid">
                <section className="medex-profile-card medex-profile-card--wide">
                  <div className="medex-profile-card__heading">
                    <Building2 size={20} />
                    <div><h3>Company Details</h3><p>Information currently stored for this employer account.</p></div>
                  </div>
                  <div className="medex-profile-fields">
                    {employer?.companyName && <div><span>Company Name</span><strong>{employer.companyName}</strong></div>}
                    {employer?.companyType && <div><span>Company Type</span><strong className="capitalize">{employer.companyType}</strong></div>}
                    {employer?.userName && <div><span>Account Name</span><strong>{employer.userName}</strong></div>}
                    {displayEmail && <div><span>Email</span><strong>{displayEmail}</strong></div>}
                    {employer?.website && <div><span>Website</span><a href={employer.website} target="_blank" rel="noreferrer"><Globe2 size={15} />{employer.website}</a></div>}
                    {joinedDate && <div><span>Member Since</span><strong>{joinedDate}</strong></div>}
                  </div>
                  {employer?.companyDescription && <p className="medex-profile-description">{employer.companyDescription}</p>}
                </section>

                <section className="medex-profile-card">
                  <div className="medex-profile-card__heading">
                    <MapPin size={20} />
                    <div><h3>Location</h3><p>Company address available on your profile.</p></div>
                  </div>
                  <div className="medex-profile-address">
                    {employer?.address || employer?.city || employer?.state || employer?.pincode ? (
                      <>
                        {employer.address && <strong>{employer.address}</strong>}
                        <span>{[employer.city, employer.state, employer.pincode].filter(Boolean).join(', ')}</span>
                      </>
                    ) : (
                      <span>No address information available.</span>
                    )}
                  </div>
                </section>

                <section className="medex-profile-card">
                  <div className="medex-profile-card__heading">
                    <ShieldCheck size={20} />
                    <div><h3>Verification</h3><p>Current employer verification status.</p></div>
                  </div>
                  <div className={`medex-profile-status medex-profile-status--${employer?.verificationStatus || 'pending'}`}>
                    <span>{employer?.verificationStatus || 'Pending'}</span>
                    {employer?.verifiedAt && <small>Verified {formatDate(employer.verifiedAt)}</small>}
                  </div>
                </section>
              </div>
            )}
          </>
        ) : (
          <div className="medex-profile-grid">
            <section className="medex-profile-card medex-profile-card--wide">
              <div className="medex-profile-card__heading">
                <User size={20} />
                <div><h3>Account Details</h3><p>Information currently available for your candidate account.</p></div>
              </div>
              <div className="medex-profile-fields">
                {user?.name && <div><span>Full Name</span><strong>{user.name}</strong></div>}
                {user?.email && <div><span>Email</span><strong>{user.email}</strong></div>}
                {user?.role && <div><span>Account Type</span><strong className="capitalize">{user.role}</strong></div>}
              </div>
            </section>

            <section className="medex-profile-card medex-profile-card--compact">
              <div className="medex-profile-card__heading">
                <Mail size={20} />
                <div><h3>Contact</h3><p>Your login email for MedExJob.</p></div>
              </div>
              <strong className="medex-profile-contact-value">{user?.email || 'No email available'}</strong>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
