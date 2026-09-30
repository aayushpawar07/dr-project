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
import { Button } from './ui/button';
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
    name: 'blue',
    borderClass: 'border-l-blue-500',
    iconBg: 'bg-blue-600',
    Icon: UserCheck,
    calendarColor: 'text-blue-500',
    watermark: 'pulse',
    watermarkColor: 'text-blue-400/25',
  },
  {
    name: 'purple',
    borderClass: 'border-l-purple-500',
    iconBg: 'bg-purple-600',
    Icon: Briefcase,
    calendarColor: 'text-purple-500',
    watermark: 'cross',
    watermarkColor: 'text-purple-400/25',
  },
  {
    name: 'emerald',
    borderClass: 'border-l-emerald-500',
    iconBg: 'bg-emerald-600',
    Icon: User,
    calendarColor: 'text-emerald-500',
    watermark: 'pulse',
    watermarkColor: 'text-emerald-400/25',
  },
  {
    name: 'emerald-stethoscope',
    borderClass: 'border-l-emerald-500',
    iconBg: 'bg-emerald-600',
    Icon: Stethoscope,
    calendarColor: 'text-emerald-500',
    watermark: 'hospital',
    watermarkColor: 'text-emerald-400/25',
  },
  {
    name: 'indigo-cross',
    borderClass: 'border-l-indigo-500',
    iconBg: 'bg-indigo-600',
    Icon: ShieldCheck,
    calendarColor: 'text-indigo-500',
    watermark: 'ambulance',
    watermarkColor: 'text-indigo-400/25',
  },
  {
    name: 'rose',
    borderClass: 'border-l-rose-500',
    iconBg: 'bg-rose-500',
    Icon: HeartPulse,
    calendarColor: 'text-rose-500',
    watermark: 'heart',
    watermarkColor: 'text-rose-400/25',
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
  const organizationName = [
    job.organization,
    view.organisationName,
    view.organisation,
    view.companyName,
    view.employer?.companyName,
    view.employerName,
    view.hospitalName,
  ].map((value) => String(value ?? '').trim()).find(Boolean) || '';
  const rawLocation = job.location || [view.city, view.state].filter(Boolean).join(', ');
  const fallbackCityState = [view.city, view.state].filter(Boolean).join(', ');
  const locationText = cleanLocation(rawLocation, organizationName, fallbackCityState);
  const qualificationText = formatCardQualification(job.qualification);
  const salaryText = formatCardSalary(job.salary || view.salaryRange);

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
    <Card className={`medex-job-card relative cursor-pointer overflow-hidden rounded-2xl md:rounded-3xl border border-gray-100 bg-white p-5 shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lg group h-full flex flex-col justify-between border-l-4 ${theme.borderClass}`}>
      <div className="flex flex-col h-full justify-between flex-1">
        <div className="flex flex-col">
          {/* Top Row: Squircle Category Icon on Left, Badges + Share on Right */}
          <div className="flex items-center justify-between gap-2">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${theme.iconBg}`}>
              <theme.Icon className="w-5 h-5 text-white" strokeWidth={2.2} />
            </div>

            <div className="flex items-center gap-1.5 ml-auto flex-wrap justify-end">
              {isGovernment ? (
                <span className="inline-flex items-center rounded-full bg-blue-50 text-blue-600 border border-blue-200/80 px-3 py-1 text-xs font-semibold">
                  Government
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-2.5 py-1 text-xs font-semibold">
                  <User className="w-3 h-3 text-emerald-600" />
                  Private
                </span>
              )}

              {view.featured && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200/80 px-2.5 py-1 text-xs font-semibold">
                  <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                  Featured
                </span>
              )}

              <Button
                variant="ghost"
                size="icon"
                title={copied ? 'Share Content Copied!' : 'Share Job'}
                className={`h-8 w-8 rounded-full border transition-all ${
                  copied
                    ? 'text-green-600 bg-green-50 border-green-200 shadow-sm'
                    : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50 border-gray-200 shadow-sm'
                }`}
                onClick={handleShare}
              >
                {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Share2 className="w-3.5 h-3.5" />}
              </Button>
            </div>
          </div>

          {/* Job Title */}
          <div className="mt-3.5">
            <h3
              className="text-base md:text-[17px] font-bold text-gray-900 leading-snug hover:text-blue-600 transition-colors cursor-pointer line-clamp-2"
              onClick={openDetails}
            >
              {displayTitle}
            </h3>

            {/* Hospital / Organization Name */}
            {organizationName && (
              <div className="flex items-center gap-1.5 mt-2 min-w-0">
                <Building2 className="w-4 h-4 shrink-0 text-red-500" />
                <span className="text-sm font-semibold text-red-500 truncate" title={organizationName}>
                  {organizationName}
                </span>
              </div>
            )}
          </div>

          {/* Metadata Row: Location | Posts | Qualification */}
          <div className="flex items-center gap-3.5 text-xs font-medium text-gray-600 mt-3 flex-wrap">
            {locationText && (
              <span className="inline-flex items-center gap-1 text-gray-700">
                <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span className="truncate">{locationText}</span>
              </span>
            )}
            {job.numberOfPosts != null && (
              <span className="inline-flex items-center gap-1 text-gray-700">
                <Briefcase className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                <span>{job.numberOfPosts} Posts</span>
              </span>
            )}
            {qualificationText && (
              <span className="inline-flex items-center gap-1 text-gray-700 truncate" title={qualificationText}>
                <GraduationCap className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span className="truncate">{qualificationText}</span>
              </span>
            )}
          </div>

          {/* Salary Pill Badge */}
          {salaryText && (
            <div className="mt-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50/90 border border-emerald-200/80 px-3 py-1 text-xs font-semibold text-emerald-800">
                <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] shrink-0 font-bold">
                  ₹
                </span>
                <span className="truncate">{salaryText}</span>
              </span>
            </div>
          )}
        </div>

        {/* Bottom Section: Date & Roles, Watermark, Action Button */}
        <div className="flex flex-col mt-auto">
          {/* Date & Expandable Categories */}
          <div className="flex items-center justify-between text-xs text-gray-500 mt-4 pt-3 border-t border-gray-100">
            {job.lastDate ? (
              <div className="flex items-center gap-1.5 text-gray-600 font-medium">
                <Calendar className={`w-3.5 h-3.5 ${theme.calendarColor}`} />
                <span>Apply by {new Date(job.lastDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </div>
            ) : (
              <div className="text-gray-400">Open Vacancy</div>
            )}

            {roleBadges.length >= 2 && (
              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <span className="text-gray-200">|</span>
                <button
                  type="button"
                  onClick={() => setExpandedRoles((prev) => !prev)}
                  className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium transition-colors cursor-pointer"
                >
                  <Users className="w-3.5 h-3.5 text-blue-600" />
                  <span>Roles & Categories ({roleBadges.length})</span>
                  <ChevronRight
                    className={`w-3.5 h-3.5 text-blue-600 transition-transform duration-200 ${
                      expandedRoles ? 'rotate-90' : ''
                    }`}
                  />
                </button>
              </div>
            )}
          </div>

          {/* Expanded Role Badges */}
          {expandedRoles && roleBadges.length >= 2 && (
            <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-gray-100" onClick={(e) => e.stopPropagation()}>
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
          <div className="relative mt-3 pt-1 flex items-center justify-between min-h-[44px]">
            {/* Subtle Watermark Illustration */}
            <div className="absolute left-0 bottom-0 pointer-events-none select-none">
              {theme.watermark === 'pulse' && (
                <svg className={`w-20 h-10 ${theme.watermarkColor}`} viewBox="0 0 100 40" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M0 20 L25 20 L35 5 L45 35 L55 10 L65 25 L75 20 L100 20" />
                </svg>
              )}
              {theme.watermark === 'cross' && (
                <svg className={`w-10 h-10 ${theme.watermarkColor}`} viewBox="0 0 48 48" fill="currentColor">
                  <path d="M18 6h12v12h12v12H30v12H18V30H6V18h12V6z" />
                </svg>
              )}
              {theme.watermark === 'hospital' && (
                <svg className={`w-11 h-11 ${theme.watermarkColor}`} viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <rect x="10" y="8" width="28" height="34" rx="2" />
                  <path d="M24 16v10M19 21h10M18 42v-6h12v6" />
                </svg>
              )}
              {theme.watermark === 'ambulance' && (
                <svg className={`w-14 h-9 ${theme.watermarkColor}`} viewBox="0 0 56 36" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 10h30v20H4zM34 16h10l6 7v7H34z" />
                  <circle cx="14" cy="30" r="4" fill="currentColor" />
                  <circle cx="42" cy="30" r="4" fill="currentColor" />
                  <path d="M19 15v8M15 19h8" />
                </svg>
              )}
              {theme.watermark === 'heart' && (
                <svg className={`w-10 h-10 ${theme.watermarkColor}`} viewBox="0 0 48 48" fill="currentColor">
                  <path d="M24 40s-14-8.8-18-18c-3.6-8.2 2-16 10-16 5 0 8 4 8 4s3-4 8-4c8 0 13.6 7.8 10 16-4 9.2-18 18-18 18z" />
                </svg>
              )}
            </div>

            {/* Right button: View Details / Apply Now */}
            <Button
              size="sm"
              onClick={openDetails}
              className="ml-auto inline-flex items-center gap-1.5 rounded-full text-white text-xs md:text-sm font-semibold px-5 py-2 shadow-sm hover:shadow-md transition-all shrink-0 bg-blue-600 hover:bg-blue-700"
            >
              {isGovernment ? 'View Details' : 'Apply Now'}
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}