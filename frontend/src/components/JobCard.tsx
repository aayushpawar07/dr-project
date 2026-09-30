import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { extractPositionsFromText, sortPositions } from '../utils/recruitmentBreakdown';
import {
  ArrowUpRight,
  Briefcase,
  Building2,
  Calendar,
  Check,
  ChevronRight,
  MapPin,
  Share2,
  Shield,
  Star,
  BriefcaseIcon,
  Gift,
  User,
  Users,
} from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Job } from '../types';
import { buildJobShareText, getJobShareUrl, shareTextWithoutUrl } from '../utils/shareContent';
import {
  cardFieldText,
  cardSalaryText,
  formatCardQualification,
  formatCardExperience,
  formatCardSalary,
  isNotMentioned,
} from '../utils/extractedFieldDisplay';
import { cleanLocation } from '../utils/locationCleaner';

interface JobCardProps {
  job: Job;
  onViewDetails: (jobId: string) => void;
  onSaveJob?: (jobId: string) => void;
  isSaved?: boolean;
}

export function JobCard({ job, onViewDetails, onSaveJob, isSaved }: JobCardProps) {
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
  const experienceText = formatCardExperience(job.experience);
  const salaryText = formatCardSalary(job.salary || view.salaryRange);
  const isEmployerVerified = Boolean(view.employer?.isVerified || view.isEmployerVerified || view.employerVerified);
  const roleCount = Array.isArray(view.postNames) ? view.postNames.length : 0;
  const daysLeft = job.lastDate
    ? Math.ceil((new Date(job.lastDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

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

    // 1. From job.jobRoles
    if (Array.isArray(job.jobRoles) && job.jobRoles.length > 0) {
      job.jobRoles.forEach((r) => {
        if (typeof r === 'string') {
          r.split(/[/,]| and /i).forEach((part) => addRole(part));
        }
      });
    } else if (typeof (job as any).jobRoles === 'string' && (job as any).jobRoles.trim()) {
      (job as any).jobRoles.split(/[/,]| and /i).forEach((part: string) => addRole(part));
    }

    // 2. From view.postNames
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

    // 3. From job.category
    if (job.category) {
      job.category.split(/[/,]| and /i).forEach((part) => addRole(part));
    }

    // 4. From displayTitle or job.title
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
        experience: experienceText,
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
        // User cancelled or the device does not support this share target.
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
    <Card className="medex-job-card relative cursor-pointer overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 md:p-5 shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-md group h-full flex flex-col">
      <div className="flex flex-col h-full justify-between gap-2.5 flex-1">
        <div className="flex flex-col gap-2.5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] md:text-xs font-bold uppercase tracking-wide text-white shadow-2xs"
                style={{
                  background: isGovernment
                    ? 'linear-gradient(to right, #3b82f6, #2563eb)'
                    : 'linear-gradient(to right, #10b981, #059669)',
                }}
              >
                {isGovernment ? <Shield className="w-3.5 h-3.5" /> : <BriefcaseIcon className="w-3.5 h-3.5" />}
                {isGovernment ? 'Government' : 'Private'}
              </span>

              {roleBadges.length >= 2 ? (
                <div className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50/90 px-2 py-0.5 text-xs shadow-2xs">
                  <Users className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <div className="flex flex-col text-left leading-none">
                    <span className="font-bold text-blue-900 text-[11px]">Multiple Roles</span>
                    <span className="text-[10px] text-blue-600 font-medium">{roleBadges.length} Categories</span>
                  </div>
                </div>
              ) : roleBadges.length === 1 ? (
                <Badge
                  variant="outline"
                  className="px-2.5 py-0.5 text-xs font-medium text-gray-600 border-gray-300 bg-white"
                >
                  {roleBadges[0]}
                </Badge>
              ) : job.category ? (
                <Badge variant="outline" className="px-2.5 py-0.5 text-xs font-medium text-gray-600 border-gray-300 bg-white">
                  {job.category}
                </Badge>
              ) : null}

              {view.featured && (
                <Badge className="bg-yellow-50 text-yellow-700 border-yellow-200 px-2 py-0.5 text-xs font-medium" variant="outline">
                  <Star className="w-3 h-3 mr-1 fill-yellow-500 text-yellow-500" />
                  Featured
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                title={copied ? 'Share Content Copied!' : 'Share Job'}
                className={`h-7.5 w-7.5 rounded-full border transition-all ${
                  copied
                    ? 'text-green-600 bg-green-50 border-green-200 shadow-sm'
                    : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50 border-gray-200 shadow-sm'
                }`}
                onClick={handleShare}
              >
                {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Share2 className="w-3.5 h-3.5" />}
              </Button>
              {onSaveJob && (
                <Button
                  variant="ghost"
                  size="icon"
                  title={isSaved ? 'Saved' : 'Save Job'}
                  className={`h-7.5 w-7.5 rounded-full border transition-all ${
                    isSaved
                      ? 'text-yellow-600 bg-yellow-50 border-yellow-200 shadow-sm'
                      : 'text-gray-400 hover:text-yellow-500 hover:bg-yellow-50 border-gray-200 shadow-sm'
                  }`}
                  onClick={(e) => { e.stopPropagation(); onSaveJob(job.id); }}
                >
                  <Star className={`w-3.5 h-3.5 ${isSaved ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                </Button>
              )}
            </div>
          </div>

          <div>
            <h3
              className="text-base md:text-[17px] font-semibold text-gray-900 leading-snug hover:text-blue-700 transition-colors cursor-pointer line-clamp-2"
              onClick={openDetails}
            >
              {displayTitle}
            </h3>
            {organizationName && (
              <div className="flex items-center gap-1.5 mt-1 min-w-0">
                <Building2 className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                <div className="flex items-center gap-1.5 min-w-0 flex-wrap flex-1">
                  <span className="text-sm font-semibold text-red-600 break-words" title={organizationName}>
                    {organizationName}
                  </span>
                  {isEmployerVerified && (
                    <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800 text-[10px] font-bold px-1.5 py-0 inline-flex items-center gap-1 shrink-0">
                      <Check className="w-3 h-3 text-emerald-600 stroke-[3]" /> Verified Employer
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs md:text-sm flex-wrap text-gray-600">
            {locationText && (
              <span className="inline-flex items-center gap-1 text-blue-700 font-medium">
                <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="truncate">{locationText}</span>
              </span>
            )}
            {locationText && job.numberOfPosts != null && (
              <span className="text-gray-300">•</span>
            )}
            {job.numberOfPosts != null && (
              <span className="inline-flex items-center gap-1 text-purple-700 font-medium">
                <Briefcase className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                <span>{job.numberOfPosts} Post{job.numberOfPosts > 1 ? 's' : ''}</span>
              </span>
            )}
            {grouped && roleCount > 1 && roleBadges.length < 2 && (
              <>
                {(locationText || job.numberOfPosts != null) && <span className="text-gray-300">•</span>}
                <span className="inline-flex items-center gap-1 text-indigo-700 font-medium">
                  <Briefcase className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span>{roleCount} roles</span>
                </span>
              </>
            )}
          </div>

          {(qualificationText || experienceText) && (
            <div className="flex items-center gap-2 text-xs md:text-sm text-gray-600 flex-wrap">
              {qualificationText && (
                <span className="inline-flex items-center gap-1 truncate" title={qualificationText}>
                  <Gift className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span className="truncate">Qualification: {qualificationText}</span>
                </span>
              )}
              {qualificationText && experienceText && (
                <span className="text-gray-300">•</span>
              )}
              {experienceText && (
                <span className="inline-flex items-center gap-1 shrink-0 text-gray-600 font-medium">
                  <span>📊 Experience: {experienceText}</span>
                </span>
              )}
            </div>
          )}

          {salaryText && (
            <div className="flex items-center gap-1.5 text-xs md:text-sm font-semibold text-emerald-700">
              <span className="shrink-0 text-sm">💰</span>
              <span>{salaryText}</span>
            </div>
          )}

          {roleBadges.length >= 2 && (
            <div className="w-full pt-0.5" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setExpandedRoles((prev) => !prev)}
                className="group/btn inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-900 transition-colors py-0.5 px-1.5 -ml-1.5 rounded hover:bg-blue-50/80 border border-transparent hover:border-blue-100"
              >
                <Users className="w-3.5 h-3.5 text-blue-600" />
                <span>Roles & Categories ({roleBadges.length})</span>
                <ChevronRight
                  className={`w-3.5 h-3.5 text-blue-600 transition-transform duration-200 ${
                    expandedRoles ? 'rotate-90' : ''
                  }`}
                />
              </button>

              {expandedRoles && (
                <div className="flex flex-wrap gap-1.5 mt-1.5 pt-1.5 border-t border-gray-100">
                  {roleBadges.map((role) => (
                    <Badge
                      key={role}
                      variant="outline"
                      className="px-2 py-0.5 text-xs font-medium text-gray-700 border-gray-200 bg-gray-50/80 hover:bg-gray-100 transition-colors"
                    >
                      {role}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-gray-100 pt-2.5 mt-auto gap-2">
          <div className="flex flex-col gap-0.5 text-[11px] md:text-xs text-gray-500 min-w-0">
            {job.lastDate && (
              <div className="flex items-center gap-1 text-orange-700 font-medium">
                <Calendar className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                <span>Apply by {new Date(job.lastDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-gray-400 flex-wrap">
              <span>{view.views ?? 0} views</span>
              <span>•</span>
              <span>{view.applications ?? 0} applications</span>
              {daysLeft != null && daysLeft > 0 && daysLeft <= 7 && (
                <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                  {daysLeft}d left
                </Badge>
              )}
            </div>
          </div>
          <Button
            size="sm"
            onClick={openDetails}
            className="inline-flex items-center gap-1 rounded-full text-white text-xs md:text-sm font-semibold px-4 py-1.5 shadow hover:shadow-md transition-all shrink-0"
            style={{ background: 'linear-gradient(to right, #2563eb, #1d4ed8)' }}
          >
            {isGovernment ? 'View Details' : 'Apply Now'}
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </Card>
  );
}