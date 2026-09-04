import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  Briefcase,
  Calendar,
  Check,
  MapPin,
  Share2,
  Bookmark,
  BriefcaseIcon,
  GraduationCap,
  IndianRupee,
} from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Job } from '../types';
import { buildJobShareText, getJobShareUrl, shareTextWithoutUrl } from '../utils/shareContent';

interface JobCardProps {
  job: Job;
  onViewDetails: (jobId: string) => void;
  onSaveJob?: (jobId: string) => void;
  isSaved?: boolean;
}

function getOrganizationName(job: any): string {
  const direct =
    job.organization ||
    job.companyName ||
    job.employer?.companyName ||
    job.employerName ||
    job.recruitmentOrganisation ||
    job.organisationName;
  if (direct && typeof direct === 'string' && direct.trim().length > 0) {
    return direct.trim();
  }
  if (job.description && typeof job.description === 'string') {
    const firstLine = job.description.split('\n')[0].trim();
    if (firstLine && firstLine.length > 2) {
      const candidate = firstLine.replace(/\s+(recruitment|notification|vacancy|vacancies|posts?).*/i, '').trim();
      if (candidate.length > 3) return candidate;
    }
  }
  if (job.title && typeof job.title === 'string' && job.title.includes(' - ')) {
    const parts = job.title.split(' - ');
    if (parts[0] && parts[0].length > 4 && !parts[0].toLowerCase().includes('resident')) {
      return parts[0].trim();
    }
  }
  return job.sector === 'government' ? 'Government Medical Institute' : 'Medical Healthcare Hospital';
}

function getOrgInitials(name: string): string {
  if (/\bAIIMS\b/i.test(name)) return 'AIIMS';
  const words = name.replace(/\([^)]*\)/g, ' ').split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return words[0]?.slice(0, 3).toUpperCase() || 'MED';
}

export function JobCard({ job, onViewDetails, onSaveJob, isSaved }: JobCardProps) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const view = job as any;
  const sector = job.sector || 'private';
  const isGovernment = sector === 'government';
  const displayTitle = view.displayTitle || job.title;
  const sourceRecruitmentId = view.sourceRecruitmentId;
  const grouped = Boolean(view.recruitmentGrouped && sourceRecruitmentId);
  const locationText = job.location || [view.city, view.state].filter(Boolean).join(', ');
  const organizationName = getOrganizationName(view);
  const specialityText = view.speciality || (view.department && view.department !== displayTitle ? view.department : '');
  const logoUrl = view.employer?.logoUrl || view.logoUrl;

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
        ...job,
        title: displayTitle,
        organization: organizationName,
        location: locationText,
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
        // User cancelled share
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
    <Card className="medex-job-card relative cursor-pointer overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 md:p-6 shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-md group h-full flex flex-col justify-between">
      <div className="flex flex-col gap-3.5">
        {/* Top Header: Logo + Organization + Verified + Sector Badge + Share/Bookmark */}
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            {/* Seal / Logo Avatar */}
            <div
              className={`h-11 w-11 shrink-0 rounded-xl border-2 flex items-center justify-center font-bold text-xs shadow-sm overflow-hidden ${
                isGovernment
                  ? 'border-amber-300 bg-gradient-to-br from-blue-700 to-indigo-900 text-amber-200'
                  : 'border-emerald-200 bg-gradient-to-br from-emerald-600 to-teal-800 text-white'
              }`}
            >
              {logoUrl ? (
                <img src={logoUrl} alt={organizationName} className="h-full w-full object-contain p-1" />
              ) : (
                <span className="tracking-tight text-[11px] font-black">{getOrgInitials(organizationName)}</span>
              )}
            </div>

            {/* Organization Name & Badges */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h4
                  className="font-bold text-sm text-gray-900 leading-snug truncate max-w-[210px] sm:max-w-[280px]"
                  title={organizationName}
                >
                  {organizationName}
                </h4>
                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5 shrink-0">
                  <Check className="w-2.5 h-2.5 stroke-[3]" /> Verified
                </span>
              </div>

              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    isGovernment
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'bg-purple-50 text-purple-700 border border-purple-200'
                  }`}
                >
                  {isGovernment ? 'Government' : 'Private'}
                </span>
                {job.category && (
                  <span className="text-[11px] text-gray-500 truncate">• {job.category}</span>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons: Bookmark and Share */}
          <div className="flex items-center gap-1 shrink-0">
            {onSaveJob && (
              <Button
                variant="ghost"
                size="icon"
                title={isSaved ? 'Saved' : 'Save Job'}
                className={`h-8 w-8 rounded-full border transition-all ${
                  isSaved
                    ? 'text-yellow-600 bg-yellow-50 border-yellow-200 shadow-sm'
                    : 'text-gray-400 hover:text-yellow-500 hover:bg-yellow-50 border-gray-200'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  onSaveJob(job.id);
                }}
              >
                <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-yellow-500 text-yellow-500' : ''}`} />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              title={copied ? 'Link Copied!' : 'Share Job'}
              className={`h-8 w-8 rounded-full border transition-all ${
                copied
                  ? 'text-green-600 bg-green-50 border-green-200 shadow-sm'
                  : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50 border-gray-200'
              }`}
              onClick={handleShare}
            >
              {copied ? <Check className="w-4 h-4 text-green-600" /> : <Share2 className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Title + Speciality + Location */}
        <div>
          <h3
            className="text-lg font-bold text-gray-900 leading-snug hover:text-blue-600 transition-colors cursor-pointer line-clamp-2"
            onClick={openDetails}
          >
            {displayTitle}
          </h3>
          {specialityText && (
            <div className="text-sm font-semibold text-blue-600 mt-0.5 truncate">
              {specialityText}
            </div>
          )}
          {locationText && (
            <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-500">
              <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span className="truncate">{locationText}</span>
            </div>
          )}
        </div>

        {/* 4 Feature Pills in a clean 2x2 grid (matching Screenshot 2) */}
        <div className="grid grid-cols-2 gap-2 text-xs pt-1">
          {/* Vacancies */}
          <div className="flex items-center gap-1.5 rounded-lg border border-purple-100 bg-purple-50/70 px-2.5 py-1.5 text-purple-900 font-medium min-w-0">
            <Briefcase className="w-3.5 h-3.5 text-purple-600 shrink-0" />
            <span className="truncate">
              {job.numberOfPosts ? `${job.numberOfPosts} Vacanc${job.numberOfPosts > 1 ? 'ies' : 'y'}` : 'Multiple Posts'}
            </span>
          </div>

          {/* Qualification */}
          <div className="flex items-center gap-1.5 rounded-lg border border-emerald-100 bg-emerald-50/70 px-2.5 py-1.5 text-emerald-900 font-medium min-w-0">
            <GraduationCap className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="truncate" title={job.qualification || 'Medical Degree'}>
              {job.qualification || 'Medical Degree'}
            </span>
          </div>

          {/* Salary */}
          <div className="flex items-center gap-1.5 rounded-lg border border-amber-100 bg-amber-50/70 px-2.5 py-1.5 text-amber-950 font-medium min-w-0">
            <IndianRupee className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span className="truncate" title={job.salary || 'As per govt. rules'}>
              {job.salary || 'As per govt. rules'}
            </span>
          </div>

          {/* Experience */}
          <div className="flex items-center gap-1.5 rounded-lg border border-blue-100 bg-blue-50/70 px-2.5 py-1.5 text-blue-900 font-medium min-w-0">
            <BriefcaseIcon className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="truncate" title={job.experience || 'Experience as per requirement'}>
              {job.experience || 'Experience as per requirement'}
            </span>
          </div>
        </div>
      </div>

      {/* Footer: Apply by date, posted date, and View Details CTA */}
      <div className="flex items-center justify-between border-t border-gray-100 pt-3 mt-3.5 gap-2">
        <div className="flex flex-col gap-0.5 text-xs text-gray-500 min-w-0">
          {job.lastDate && (
            <div className="flex items-center gap-1 font-semibold text-gray-700">
              <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span className="truncate">
                Apply by{' '}
                <span className="text-red-600 font-bold">
                  {new Date(job.lastDate).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </span>
            </div>
          )}
          {job.postedDate && (
            <div className="text-[11px] text-gray-400 truncate">
              Posted {new Date(job.postedDate).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </div>
          )}
        </div>

        <Button
          size="sm"
          onClick={openDetails}
          className="inline-flex items-center gap-1.5 rounded-lg text-white text-xs sm:text-sm font-semibold px-4 py-2 shadow-sm hover:shadow-md transition-all shrink-0 bg-blue-600 hover:bg-blue-700"
        >
          {isGovernment ? 'View Details' : 'Apply Now'}
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </Card>
  );
}