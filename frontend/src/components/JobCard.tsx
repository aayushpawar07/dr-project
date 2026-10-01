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
  GraduationCap,
  HeartPulse,
  MapPin,
  Share2,
  ShieldCheck,
  Star,
  Stethoscope,
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
  formatCardSalary,
} from '../utils/extractedFieldDisplay';
import { cleanLocation } from '../utils/locationCleaner';

interface JobCardProps {
  job: Job;
  onViewDetails: (jobId: string) => void;
  onSaveJob?: (jobId: string) => void;
  isSaved?: boolean;
  index?: number;
}

const CARD_THEMES = [
  {
    themeClass: 'theme-blue',
    iconBg: '#1463ff',
    Icon: UserCheck,
    calendarColor: '#3b82f6',
    watermark: 'pulse',
    watermarkColor: '#60a5fa',
  },
  {
    themeClass: 'theme-purple',
    iconBg: '#8b5cf6',
    Icon: Briefcase,
    calendarColor: '#8b5cf6',
    watermark: 'cross',
    watermarkColor: '#c4b5fd',
  },
  {
    themeClass: 'theme-emerald',
    iconBg: '#10b981',
    Icon: User,
    calendarColor: '#10b981',
    watermark: 'pulse',
    watermarkColor: '#86efac',
  },
  {
    themeClass: 'theme-emerald-stethoscope',
    iconBg: '#059669',
    Icon: Stethoscope,
    calendarColor: '#059669',
    watermark: 'hospital',
    watermarkColor: '#86efac',
  },
  {
    themeClass: 'theme-indigo',
    iconBg: '#6366f1',
    Icon: ShieldCheck,
    calendarColor: '#6366f1',
    watermark: 'ambulance',
    watermarkColor: '#a5b4fc',
  },
  {
    themeClass: 'theme-rose',
    iconBg: '#f43f5e',
    Icon: HeartPulse,
    calendarColor: '#f43f5e',
    watermark: 'heart',
    watermarkColor: '#fda4af',
  },
];

function getCardTheme(job: any, index?: number) {
  if (typeof index === 'number') {
    return CARD_THEMES[Math.abs(index) % CARD_THEMES.length];
  }
  const idStr = String(job.id || job.title || '');
  let hash = 0;
  for (let i = 0; i < idStr.length; i++) {
    hash = (hash * 31 + idStr.charCodeAt(i)) >>> 0;
  }
  return CARD_THEMES[hash % CARD_THEMES.length];
}

export function JobCard({ job, onViewDetails, onSaveJob, isSaved, index }: JobCardProps) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [expandedRoles, setExpandedRoles] = useState(false);
  const view = job as any;
  const sector = job.sector || 'private';
  const isGovernment = sector === 'government';
  const displayTitle = view.displayTitle || job.title;
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
  ].map((value) => String(value ?? '').trim()).find(Boolean) || '';

  const organizationName = /^(relative\s*clinic|referral\s*clinic|local\s*clinic|private\s*clinic|any\s*clinic)/i.test(rawOrg)
    ? 'Medical Institution'
    : rawOrg;

  const rawLocation = job.location || [view.city, view.state].filter(Boolean).join(', ');
  const fallbackCityState = [view.city, view.state].filter(Boolean).join(', ');
  const locationText = cleanLocation(rawLocation, organizationName, fallbackCityState);
  const qualificationText = formatCardQualification(job.qualification);
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

  const theme = useMemo(() => getCardTheme(job, index), [job, index]);

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
    if (grouped && sourceRecruitmentId) {
      navigate(`/recruitment/${sourceRecruitmentId}`);
      return;
    }
    onViewDetails(job.slug || job.id);
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
        qualification: qualificationText,
        experience: job.experience,
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
        // User cancelled or unsupported
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
    <Card className={`medex-job-card ${theme.themeClass}`} onClick={openDetails}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between', flex: 1 }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {/* Top Row: Squircle Category Icon on Left, Badges + Share on Right */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <div className="medex-card-icon-box" style={{ backgroundColor: theme.iconBg }}>
              <theme.Icon size={22} color="#ffffff" strokeWidth={2.2} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {isGovernment ? (
                <span className="medex-pill-badge badge-gov">
                  <ShieldCheck size={15} color="#1d4ed8" />
                  Government
                </span>
              ) : (
                <span className="medex-pill-badge badge-private">
                  <User size={15} color="#047857" />
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

          {/* Metadata Row: Location | Posts | Qualification */}
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
                <span>{job.numberOfPosts} Posts</span>
              </span>
            )}
            {qualificationText && (
              <span className="medex-meta-item qualification" title={qualificationText}>
                <GraduationCap size={14} color="#64748b" />
                <span>{qualificationText}</span>
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
              {roleBadges.map((role) => (
                <Badge
                  key={role}
                  variant="outline"
                  className="px-2.5 py-0.5 text-xs font-medium text-gray-700 border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  {role}
                </Badge>
              ))}
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
    </Card>
  );
}