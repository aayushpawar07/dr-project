import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { extractPositionsFromText, sortPositions } from '../utils/recruitmentBreakdown';
import {
  ArrowRight,
  Briefcase,
  Building2,
  Calendar,
  Check,
  ChevronRight,
  Clock,
  ExternalLink,
  GraduationCap,
  HeartPulse,
  MapPin,
  Share2,
  ShieldCheck,
  Star,
  Stethoscope,
  Trash2,
  User,
  UserCheck,
  Users,
} from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Job } from '../types';
import { buildJobShareText, getJobShareUrl, shareTextWithoutUrl } from '../utils/shareContent';
import {
  formatCardQualification,
  formatCardExperience,
  formatCardSalary,
  isNotMentioned,
} from '../utils/extractedFieldDisplay';
import { cleanLocation } from '../utils/locationCleaner';
import { useAuth } from '../contexts/AuthContext';
import { deleteAdminJob, deleteJob } from '../api/jobs';
import { toast } from 'sonner';
import { resolveStandardCardTitle } from '../utils/jobGrouping';

interface JobCardProps {
  job: Job;
  onViewDetails: (jobId: string) => void;
  onSaveJob?: (jobId: string) => void;
  onDelete?: (jobId: string) => void;
  showAdminActions?: boolean;
  isSaved?: boolean;
  index?: number;
}

export type JobRoleCategory = 'JR' | 'SR' | 'FACULTY' | 'MO_GDMO' | 'CONSULTANT_SPECIALIST' | 'OTHER';

export interface CategoryTheme {
  type: JobRoleCategory;
  roleBadgeLabel: string;
  badgeClass: string;
  themeClass: string;
  iconBg: string;
  calendarColor: string;
  watermark: string;
  watermarkColor: string;
  Icon: any;
}

/**
 * Detects the specific role category and returns the exact color theme matching user requirements:
 * 🟥 JR (Junior Resident) -> Red
 * ⬛ SR (Senior Resident) -> Black / Dark Slate
 * 🟨 FACULTY -> Yellow / Amber / Gold
 * 🟩 MO/GDMO (Medical Officer / General Duty Medical Officer) -> Green / Emerald
 * 🟪 CONSULTANT / SPECIALIST -> Purple / Violet
 */
function getJobCategoryTheme(job: any): CategoryTheme {
  const textToScan = [
    job.category,
    ...(Array.isArray(job.jobRoles) ? job.jobRoles : [job.jobRoles]),
    job.title,
    job.displayTitle,
    job.department,
    job.speciality,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  // 1. 🟥 JR (Junior Resident)
  if (/\b(junior\s*resident|jr\b|jr\s*resident|junior\s*residency)\b/i.test(textToScan)) {
    return {
      type: 'JR',
      roleBadgeLabel: '🟥 JR',
      badgeClass: 'badge-role-jr',
      themeClass: 'theme-jr-red',
      iconBg: '#dc2626',
      calendarColor: '#dc2626',
      watermark: 'pulse',
      watermarkColor: '#fca5a5',
      Icon: UserCheck,
    };
  }

  // 2. ⬛ SR (Senior Resident)
  if (/\b(senior\s*resident|sr\b|sr\s*resident|senior\s*residency)\b/i.test(textToScan)) {
    return {
      type: 'SR',
      roleBadgeLabel: '⬛ SR',
      badgeClass: 'badge-role-sr',
      themeClass: 'theme-sr-black',
      iconBg: '#0f172a',
      calendarColor: '#334155',
      watermark: 'hospital',
      watermarkColor: '#94a3b8',
      Icon: Stethoscope,
    };
  }

  // 3. 🟨 FACULTY
  if (/\b(faculty|professor|associate\s*prof|assistant\s*prof|lecturer|tutor|dean|director|principal)\b/i.test(textToScan)) {
    return {
      type: 'FACULTY',
      roleBadgeLabel: '🟨 FACULTY',
      badgeClass: 'badge-role-faculty',
      themeClass: 'theme-faculty-yellow',
      iconBg: '#d97706',
      calendarColor: '#b45309',
      watermark: 'cross',
      watermarkColor: '#fde68a',
      Icon: GraduationCap,
    };
  }

  // 4. 🟩 MO / GDMO
  if (/\b(medical\s*officer|gdmo|general\s*duty|smo\b|cmo\b|rmo\b|casualty\s*medical|duty\s*doctor)\b/i.test(textToScan)) {
    return {
      type: 'MO_GDMO',
      roleBadgeLabel: '🟩 MO / GDMO',
      badgeClass: 'badge-role-mo',
      themeClass: 'theme-mo-green',
      iconBg: '#059669',
      calendarColor: '#059669',
      watermark: 'ambulance',
      watermarkColor: '#86efac',
      Icon: ShieldCheck,
    };
  }

  // 5. 🟪 CONSULTANT / SPECIALIST
  if (/\b(consultant|specialist|super\s*specialist|attending\s*consultant|intensivist|surgeon|physician)\b/i.test(textToScan)) {
    return {
      type: 'CONSULTANT_SPECIALIST',
      roleBadgeLabel: '🟪 SPECIALIST / CONSULTANT',
      badgeClass: 'badge-role-consultant',
      themeClass: 'theme-consultant-purple',
      iconBg: '#7c3aed',
      calendarColor: '#7c3aed',
      watermark: 'pulse',
      watermarkColor: '#c4b5fd',
      Icon: Briefcase,
    };
  }

  // 6. 🟦 PARAMEDICAL
  if (/\b(paramedical|nurse|nursing|technician|pharmacist|lab\s*tech|physiotherapist|radiographer)\b/i.test(textToScan)) {
    return {
      type: 'OTHER',
      roleBadgeLabel: '🟦 PARAMEDICAL',
      badgeClass: 'badge-role-paramedical',
      themeClass: 'theme-paramedical-cyan',
      iconBg: '#0891b2',
      calendarColor: '#0891b2',
      watermark: 'cross',
      watermarkColor: '#a5f3fc',
      Icon: HeartPulse,
    };
  }

  // 7. 🏢 Multiple Departments / Various Departments
  if (/\b(various\s*departments|multiple\s*departments|various\s*posts|multiple\s*roles)\b/i.test(textToScan) || job.recruitmentGrouped) {
    return {
      type: 'OTHER',
      roleBadgeLabel: '🏢 Multiple Departments',
      badgeClass: 'badge-role-multiple',
      themeClass: 'theme-multiple-indigo',
      iconBg: '#4f46e5',
      calendarColor: '#4f46e5',
      watermark: 'hospital',
      watermarkColor: '#c7d2fe',
      Icon: Building2,
    };
  }

  // Default / Other Healthcare roles
  const displayCat = job.category || 'Medical Staff';
  return {
    type: 'OTHER',
    roleBadgeLabel: displayCat,
    badgeClass: 'badge-role-default',
    themeClass: 'theme-blue',
    iconBg: '#1463ff',
    calendarColor: '#3b82f6',
    watermark: 'heart',
    watermarkColor: '#93c5fd',
    Icon: HeartPulse,
  };
}

/**
 * Returns color-coded style for individual role / category tags when clicked/expanded
 * Matches the exact color scheme from user image:
 * 🟩 MO / GDMO -> Green
 * 🟥 Junior Resident -> Red
 * ⬛ Senior Resident -> Black
 * 🟨 Faculty -> Yellow / Amber
 * 🟪 Specialist / Consultant & Clinical Departments -> Purple
 * 🟦 Paramedical -> Cyan / Teal
 * 🟦 Research / Survey -> Blue
 * 🟧 PG Counselling / Info -> Orange
 */
export function getRoleBadgeColorStyle(role: string): {
  bg: string;
  text: string;
  border: string;
  dotColor: string;
} {
  const r = role.toLowerCase().trim();

  // 1. 🟥 Junior Resident (JR)
  if (/\b(junior\s*resident|jr\b|jr\s*resident|junior\s*residency|house\s*job|house\s*physician|house\s*surgeon)\b/i.test(r)) {
    return {
      bg: '#fef2f2',
      text: '#dc2626',
      border: '#fca5a5',
      dotColor: '#ef4444',
    };
  }

  // 2. ⬛ Senior Resident (SR)
  if (/\b(senior\s*resident|sr\b|sr\s*resident|senior\s*residency)\b/i.test(r)) {
    return {
      bg: '#0f172a',
      text: '#ffffff',
      border: '#334155',
      dotColor: '#94a3b8',
    };
  }

  // 3. 🟨 Faculty / Professor
  if (/\b(faculty|professor|associate\s*prof|assistant\s*prof|lecturer|tutor|dean|director|principal)\b/i.test(r)) {
    return {
      bg: '#fef3c7',
      text: '#92400e',
      border: '#fcd34d',
      dotColor: '#f59e0b',
    };
  }

  // 4. 🟩 MO / GDMO
  if (/\b(medical\s*officer|gdmo|general\s*duty|smo\b|cmo\b|rmo\b|casualty|duty\s*doctor|fmo|imo|ayush|ayurved|homeopath|unani)\b/i.test(r)) {
    return {
      bg: '#ecfdf5',
      text: '#047857',
      border: '#6ee7b7',
      dotColor: '#10b981',
    };
  }

  // 5. 🟪 Consultant / Specialist & Clinical Departments
  if (/\b(consultant|specialist|super\s*specialist|intensivist|surgeon|physician|cardiolog|neurolog|nephrolog|oncolog|pediatric|radiolog|patholog|anesthes|anaesthes|gynecolog|obstetric|orthopedic|dermatolog|ent|ophthalmolog|psychiatr|dentist|dental|surgery|medicine|anatomy|physiology|biochemistry|microbiology|pharmacology)\b/i.test(r)) {
    return {
      bg: '#f5f3ff',
      text: '#6d28d9',
      border: '#c4b5fd',
      dotColor: '#8b5cf6',
    };
  }

  // 6. 🟦 Paramedical / Nursing / Tech
  if (/\b(paramedical|nurse|nursing|technician|pharmacist|lab|physiotherap|radiographer|optometrist|dietician|ecg)\b/i.test(r)) {
    return {
      bg: '#ecfeff',
      text: '#0e7490',
      border: '#67e8f9',
      dotColor: '#06b6d4',
    };
  }

  // 7. 🟦 Research / Survey
  if (/\b(research|survey|scientist|project|fellow|fellowship)\b/i.test(r)) {
    return {
      bg: '#eff6ff',
      text: '#1d4ed8',
      border: '#93c5fd',
      dotColor: '#3b82f6',
    };
  }

  // 8. 🟧 PG Counselling / Info
  if (/\b(counselling|counseling|pg\s*counselling|neet|admission|info)\b/i.test(r)) {
    return {
      bg: '#fff7ed',
      text: '#c2410c',
      border: '#fdba74',
      dotColor: '#f97316',
    };
  }

  // 9. Default
  return {
    bg: '#f8fafc',
    text: '#334155',
    border: '#cbd5e1',
    dotColor: '#64748b',
  };
}

export function JobCard({
  job,
  onViewDetails,
  onSaveJob,
  onDelete,
  showAdminActions,
  isSaved,
  index,
}: JobCardProps) {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const isAdmin = Boolean(isAuthenticated && user?.role === 'admin') || Boolean(showAdminActions);
  const [copied, setCopied] = useState(false);
  const [expandedRoles, setExpandedRoles] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const view = job as any;
  const sector = job.sector || 'private';
  const isGovernment = sector === 'government';
  const displayTitle = useMemo(() => resolveStandardCardTitle(job), [job]);
  const sourceRecruitmentId = view.sourceRecruitmentId;
  const grouped = Boolean(view.recruitmentGrouped && sourceRecruitmentId);

  const rawOrg = [
    job.organization,
    view.organisationName,
    view.organisation,
    view.companyName,
    view.employer?.companyName,
    view.employerName,
    view.hospitalName,
  ]
    .map((value) => String(value ?? '').trim())
    .find(Boolean) || '';

  const organizationName = /^(relative\s*clinic|referral\s*clinic|local\s*clinic|private\s*clinic|any\s*clinic)/i.test(rawOrg)
    ? 'Medical Institution'
    : rawOrg;

  const rawLocation = job.location || [view.city, view.state].filter(Boolean).join(', ');
  const fallbackCityState = [view.city, view.state].filter(Boolean).join(', ');
  const locationText = cleanLocation(rawLocation, organizationName, fallbackCityState);

  // Qualification and Experience formatting (matching details from share text)
  const qualRaw = String(job.qualification || view.qualification || '').trim();
  const qualificationText = !isNotMentioned(qualRaw)
    ? formatCardQualification(qualRaw) || qualRaw.slice(0, 45)
    : '';

  const expRaw = String(job.experience || view.experience || '').trim();
  const experienceText = !isNotMentioned(expRaw)
    ? formatCardExperience(expRaw) || expRaw.slice(0, 35)
    : '';

  const salaryText = formatCardSalary(job.salary || view.salaryRange);

  const displayOrganizationWithLocation = useMemo(() => {
    if (!organizationName) return '';
    if (!locationText) return organizationName;
    const orgLower = organizationName.toLowerCase();
    const locLower = locationText.toLowerCase();
    if (orgLower === locLower || orgLower.endsWith(locLower)) return organizationName;

    const locParts = locationText.split(',').map((p) => p.trim()).filter(Boolean);
    const missing = locParts.filter((p) => !orgLower.includes(p.toLowerCase()));
    if (missing.length > 0) {
      return `${organizationName}, ${missing.join(', ')}`;
    }
    return organizationName;
  }, [organizationName, locationText]);

  // Color-coded role theme
  const theme = useMemo(() => getJobCategoryTheme(job), [job]);

  const roleBadges = useMemo(() => {
    const roles: string[] = [];
    const seen = new Set<string>();

    const addRole = (role?: string | null) => {
      if (!role) return;
      const clean = String(role).trim();
      if (!clean || clean.toLowerCase() === 'all' || clean.toLowerCase() === 'multiple roles') return;
      const key = clean.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        roles.push(clean);
      }
    };

    if (Array.isArray(job.jobRoles) && job.jobRoles.length > 0) {
      job.jobRoles.forEach((r) => {
        if (typeof r === 'string') {
          r.split(/[/,]| and /i).forEach((part) => addRole(part));
        }
      });
    } else if (typeof (job as any).jobRoles === 'string' && (job as any).jobRoles.trim()) {
      (job as any).jobRoles.split(/[/,]| and /i).forEach((part: string) => addRole(part));
    }

    if (Array.isArray(view.postNames) && view.postNames.length > 0) {
      view.postNames.forEach((p: string) => {
        if (typeof p === 'string') {
          p.split(/[/,]| and /i).forEach((part) => {
            const trimmed = part.trim();
            if (trimmed.length >= 3 && !/recruitment|multiple|departments/i.test(trimmed)) {
              addRole(trimmed);
            }
          });
        }
      });
    }

    if (job.category) {
      job.category.split(/[/,]| and /i).forEach((part) => addRole(part));
    }

    const titleToScan = view.displayTitle || job.title || '';
    if (titleToScan) {
      const detected = extractPositionsFromText(titleToScan);
      detected.forEach((d) => addRole(d));
    }

    return sortPositions(roles);
  }, [job, view]);

  const openDetails = () => {
    // Save state in sessionStorage so Back button restores exact card & scroll position (Point 9)
    try {
      sessionStorage.setItem('medex_last_viewed_job_id', String(job.id));
      sessionStorage.setItem('medex_last_viewed_job_slug', String(job.slug || job.id));
      sessionStorage.setItem('medex_last_scroll_pos', String(window.scrollY));
    } catch {
      // sessionStorage might not be available
    }

    if (grouped && sourceRecruitmentId) {
      navigate(`/recruitment/${sourceRecruitmentId}`);
      return;
    }
    onViewDetails(job.slug || job.id);
  };

  const handleDeleteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDeleting) return;

    const jobTitle = displayTitle || job.title || 'this vacancy';
    const orgInfo = organizationName ? `\nOrganization: ${organizationName}` : '';
    const confirmMessage = `Are you sure you want to delete this vacancy?\n\n"${jobTitle}"${orgInfo}\n\nThis will permanently delete the vacancy from the platform.`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      setIsDeleting(true);
      try {
        await deleteAdminJob(job.id);
      } catch {
        await deleteJob(job.id);
      }
      toast.success('Vacancy deleted successfully!');
      onDelete?.(job.id);
    } catch (err: any) {
      console.error('Failed to delete vacancy:', err);
      const errMsg = err?.error || err?.message || 'Failed to delete vacancy';
      toast.error(`Error deleting vacancy: ${errMsg}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = grouped && sourceRecruitmentId
      ? `${window.location.origin}/recruitment/${sourceRecruitmentId}`
      : getJobShareUrl(job.id);
    const shareText = buildJobShareText(
      {
        id: job.id,
        title: displayTitle,
        organization: organizationName,
        location: locationText,
        sector,
        category: job.category,
        numberOfPosts: job.numberOfPosts,
        qualification: qualificationText || qualRaw,
        experience: experienceText || expRaw,
        salary: salaryText,
        lastDate: job.lastDate,
      },
      shareUrl,
    );
    const shareData = {
      title: displayTitle,
      text: shareTextWithoutUrl(shareText, shareUrl),
      url: shareUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // User cancelled
      }
    }

    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy job share content', err);
    }
  };

  return (
    <Card
      id={`job-card-${job.id}`}
      data-job-id={job.id}
      className={`medex-job-card ${theme.themeClass}`}
      onClick={openDetails}
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between', flex: 1 }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {/* Top Row: Squircle Category Icon on Left, Color-Coded Role & Sector Badges + Share on Right */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <div className="medex-card-icon-box" style={{ backgroundColor: theme.iconBg }}>
              <theme.Icon size={22} color="#ffffff" strokeWidth={2.2} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {/* Color-Coded Role Category Badge (Point 3) */}
              <span className={`medex-pill-badge ${theme.badgeClass}`}>
                {theme.roleBadgeLabel}
              </span>

              {/* Sector Badge */}
              {isGovernment ? (
                <span className="medex-pill-badge badge-gov">
                  <ShieldCheck size={14} color="#1d4ed8" />
                  Government
                </span>
              ) : (
                <span className="medex-pill-badge badge-private">
                  <User size={14} color="#047857" />
                  Private
                </span>
              )}

              {view.featured && (
                <span className="medex-pill-badge badge-featured">
                  <Star size={13} fill="#b45309" color="#b45309" />
                  Featured
                </span>
              )}

              <button
                type="button"
                title={copied ? 'Share Content Copied!' : 'Share Job'}
                className="medex-share-btn"
                onClick={handleShare}
              >
                {copied ? <Check size={14} color="#16a34a" /> : <Share2 size={14} />}
              </button>

              {isAdmin && (
                <button
                  type="button"
                  title="Delete Vacancy (Admin)"
                  className="medex-delete-btn"
                  onClick={handleDeleteClick}
                  disabled={isDeleting}
                >
                  <Trash2 size={14} color="#ef4444" />
                </button>
              )}
            </div>
          </div>

          {/* Job Title */}
          <div className="medex-card-title">
            {displayTitle}
          </div>

          {/* Hospital / Organization Name with Location */}
          {displayOrganizationWithLocation && (
            <div className="medex-card-hospital">
              <Building2 size={15} color="#ef4444" />
              <span title={displayOrganizationWithLocation}>
                {displayOrganizationWithLocation}
              </span>
            </div>
          )}

          {/* Metadata Row: Location | Posts | Qualification | Experience (Point 5) */}
          <div className="medex-card-meta-row">
            {locationText && (
              <span className="medex-meta-item location">
                <MapPin size={14} color="#3b82f6" />
                <span>{locationText}</span>
              </span>
            )}
            {job.numberOfPosts != null && (
              <span className="medex-meta-item posts">
                <Briefcase size={14} color="#7c3aed" />
                <span>{job.numberOfPosts} Post{Number(job.numberOfPosts) === 1 ? '' : 's'}</span>
              </span>
            )}
            {qualificationText && (
              <span className="medex-meta-item qualification" title={qualificationText}>
                <GraduationCap size={14} color="#0284c7" />
                <span className="font-semibold text-slate-700">{qualificationText}</span>
              </span>
            )}
            {experienceText && (
              <span className="medex-meta-item experience" title={experienceText}>
                <Clock size={14} color="#d97706" />
                <span className="font-semibold text-slate-700">{experienceText}</span>
              </span>
            )}
          </div>

          {/* Salary Pill Badge */}
          {salaryText && (
            <div>
              <span className="medex-salary-pill">
                <span className="medex-salary-icon">₹</span>
                <span>{salaryText}</span>
              </span>
            </div>
          )}
        </div>

        {/* Bottom Section: Date & Roles, Watermark, Action Button */}
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 'auto' }}>
          {/* Date & Expandable Categories */}
          <div className="medex-card-footer-info">
            {job.lastDate ? (
              <div className="medex-footer-date">
                <Calendar size={14} color={theme.calendarColor} />
                <span>Apply by {new Date(job.lastDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </div>
            ) : (
              <div style={{ color: '#94a3b8' }}>Open Vacancy</div>
            )}

            {roleBadges.length >= 2 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
                <span style={{ color: '#e2e8f0' }}>|</span>
                <button
                  type="button"
                  onClick={() => setExpandedRoles((prev) => !prev)}
                  className="medex-footer-roles-btn"
                >
                  <Users size={14} color="#1463ff" />
                  <span>Roles & Categories ({roleBadges.length})</span>
                  <ChevronRight
                    size={14}
                    color="#1463ff"
                    style={{
                      transform: expandedRoles ? 'rotate(90deg)' : 'none',
                      transition: 'transform 0.2s',
                    }}
                  />
                </button>
              </div>
            )}
          </div>

          {/* Expanded Role Badges */}
          {expandedRoles && roleBadges.length >= 2 && (
            <div
              style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}
              onClick={(e) => e.stopPropagation()}
            >
              {roleBadges.map((role) => {
                const badgeStyle = getRoleBadgeColorStyle(role);
                return (
                  <span
                    key={role}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '3px 10px',
                      borderRadius: '9999px',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      backgroundColor: badgeStyle.bg,
                      color: badgeStyle.text,
                      border: `1.5px solid ${badgeStyle.border}`,
                      boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: badgeStyle.dotColor,
                        flexShrink: 0,
                      }}
                    />
                    <span>{role}</span>
                  </span>
                );
              })}
            </div>
          )}

          {/* Action Row with Watermark Background & View Details / Apply Now Button */}
          <div className="medex-card-action-row">
            {/* Subtle Watermark Illustration */}
            <div className="medex-watermark-wrap">
              {theme.watermark === 'pulse' && (
                <svg width="72" height="30" viewBox="0 0 100 40" fill="none" stroke={theme.watermarkColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.65 }}>
                  <path d="M0 20 L25 20 L35 5 L45 35 L55 10 L65 25 L75 20 L100 20" />
                </svg>
              )}
              {theme.watermark === 'cross' && (
                <svg width="34" height="34" viewBox="0 0 48 48" fill={theme.watermarkColor} style={{ opacity: 0.65 }}>
                  <rect x="18" y="6" width="12" height="36" rx="3" />
                  <rect x="6" y="18" width="36" height="12" rx="3" />
                </svg>
              )}
              {theme.watermark === 'hospital' && (
                <svg width="36" height="36" viewBox="0 0 48 48" fill="none" stroke={theme.watermarkColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.65 }}>
                  <rect x="10" y="8" width="28" height="34" rx="3" />
                  <path d="M24 16v10M19 21h10M18 42v-6h12v6" />
                </svg>
              )}
              {theme.watermark === 'ambulance' && (
                <svg width="44" height="28" viewBox="0 0 56 36" fill="none" stroke={theme.watermarkColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.65 }}>
                  <path d="M4 10h30v20H4zM34 16h10l6 7v7H34z" />
                  <circle cx="14" cy="30" r="4" fill={theme.watermarkColor} />
                  <circle cx="42" cy="30" r="4" fill={theme.watermarkColor} />
                  <path d="M19 15v8M15 19h8" />
                </svg>
              )}
              {theme.watermark === 'heart' && (
                <svg width="34" height="34" viewBox="0 0 48 48" fill={theme.watermarkColor} style={{ opacity: 0.65 }}>
                  <path d="M24 40s-14-8.8-18-18c-3.6-8.2 2-16 10-16 5 0 8 4 8 4s3-4 8-4c8 0 13.6 7.8 10 16-4 9.2-18 18-18 18z" />
                </svg>
              )}
            </div>

            {/* Action Group: Admin Delete + View Details / Apply Now */}
            <div className="medex-card-action-group">
              {isAdmin && (
                <button
                  type="button"
                  onClick={handleDeleteClick}
                  disabled={isDeleting}
                  className="medex-card-delete-btn"
                  title="Delete Vacancy (Admin)"
                >
                  <Trash2 size={13.5} />
                  <span>{isDeleting ? 'Deleting...' : 'Delete'}</span>
                </button>
              )}

              {/* Right button: View Details / Apply Now */}
              <button
                type="button"
                onClick={openDetails}
                className="medex-action-btn"
              >
                {isGovernment ? 'View Details' : 'Apply Now'}
                <ArrowRight size={15} color="#ffffff" strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}