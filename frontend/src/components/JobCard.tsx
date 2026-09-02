import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  Briefcase,
  Building2,
  Calendar,
  Check,
  Clock3,
  GraduationCap,
  IndianRupee,
  Layers3,
  MapPin,
  Share2,
  ShieldCheck,
  Star,
} from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Job } from '../types';
import { buildJobShareText, getJobShareUrl, shareTextWithoutUrl } from '../utils/shareContent';

interface JobCardProps {
  job: Job;
  onViewDetails: (jobId: string) => void;
  onSaveJob?: (jobId: string) => void;
  isSaved?: boolean;
}

export function JobCard({ job, onViewDetails, onSaveJob, isSaved }: JobCardProps) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const view = job as any;
  const sector = job.sector || 'private';
  const isGovernment = sector === 'government';
  const displayTitle = view.displayTitle || job.title;
  const sourceRecruitmentId = view.sourceRecruitmentId;
  const departments: string[] = Array.isArray(view.departments)
    ? view.departments.filter(Boolean)
    : [job.department, job.speciality].filter(Boolean) as string[];
  const uniqueDepartments = [...new Set(departments)];
  const grouped = Boolean(view.recruitmentGrouped && sourceRecruitmentId);
  const locationText = job.location || [view.city, view.state].filter(Boolean).join(', ');
  const organizationName =
    job.organization ||
    view.companyName ||
    view.employer?.companyName ||
    view.employerName ||
    '';
  const daysLeft = job.lastDate
    ? Math.ceil((new Date(job.lastDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

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
        // User cancelled or native sharing is unavailable.
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
    <Card className="medex-job-card relative h-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
      <div className="flex h-full flex-col p-5 md:p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge className={isGovernment
                ? 'border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-50'
                : 'border border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-50'}>
                {isGovernment ? 'Government' : 'Private'}
              </Badge>
              {grouped && (
                <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                  <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                  One Recruitment
                </Badge>
              )}
              {view.featured && (
                <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
                  <Star className="mr-1 h-3.5 w-3.5 fill-amber-400" />Featured
                </Badge>
              )}
            </div>
            {organizationName && (
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Building2 className="h-4 w-4 shrink-0 text-blue-600" />
                <span className="line-clamp-1">{organizationName}</span>
              </div>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full border border-slate-200" onClick={handleShare} title="Share">
              {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Share2 className="h-4 w-4 text-slate-500" />}
            </Button>
            {onSaveJob && (
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full border border-slate-200"
                onClick={(e) => { e.stopPropagation(); onSaveJob(job.id); }}
                title={isSaved ? 'Saved' : 'Save job'}
              >
                <Star className={`h-4 w-4 ${isSaved ? 'fill-amber-400 text-amber-500' : 'text-slate-400'}`} />
              </Button>
            )}
          </div>
        </div>

        <button type="button" onClick={openDetails} className="text-left">
          <h3 className="text-xl font-bold leading-snug text-slate-950 transition-colors hover:text-blue-700">
            {displayTitle}
          </h3>
          {grouped ? (
            <p className="mt-1 text-sm font-medium text-blue-700">Multiple departments in one recruitment</p>
          ) : job.speciality ? (
            <p className="mt-1 text-sm font-medium text-blue-700">{job.speciality}</p>
          ) : job.department ? (
            <p className="mt-1 text-sm font-medium text-blue-700">{job.department}</p>
          ) : null}
        </button>

        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
          {job.numberOfPosts != null && (
            <InfoPill icon={Briefcase} label={`${job.numberOfPosts} Vacanc${job.numberOfPosts === 1 ? 'y' : 'ies'}`} />
          )}
          {locationText && <InfoPill icon={MapPin} label={locationText} />}
          {job.qualification && <InfoPill icon={GraduationCap} label={job.qualification} />}
          {job.salary && <InfoPill icon={IndianRupee} label={job.salary} />}
          {job.experience && <InfoPill icon={Clock3} label={job.experience} />}
          {grouped && uniqueDepartments.length > 0 && (
            <InfoPill icon={Layers3} label={`${uniqueDepartments.length} Department${uniqueDepartments.length === 1 ? '' : 's'}`} />
          )}
        </div>

        {grouped && uniqueDepartments.length > 0 && (
          <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/60 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Departments</span>
              {uniqueDepartments.length > 4 && <span className="text-xs font-medium text-blue-700">+{uniqueDepartments.length - 4} more</span>}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {uniqueDepartments.slice(0, 4).map((department) => (
                <span key={department} className="rounded-full border border-blue-200 bg-white px-2.5 py-1 text-xs font-medium text-blue-800">
                  {department}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mt-auto flex items-end justify-between gap-3 border-t border-slate-100 pt-4">
          <div className="min-w-0 text-xs text-slate-500">
            {job.lastDate && (
              <div className="flex items-center gap-1.5 font-medium text-rose-600">
                <Calendar className="h-3.5 w-3.5 shrink-0" />
                <span>Apply by {new Date(job.lastDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </div>
            )}
            {daysLeft != null && daysLeft > 0 && daysLeft <= 7 && (
              <div className="mt-1 font-semibold text-amber-700">{daysLeft} day{daysLeft === 1 ? '' : 's'} left</div>
            )}
          </div>

          <Button onClick={openDetails} className="shrink-0 rounded-lg bg-blue-600 px-4 text-white hover:bg-blue-700">
            {grouped ? 'View All Vacancies' : 'View Details'}
            <ArrowUpRight className="ml-1.5 h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

function InfoPill({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700">
      <Icon className="h-4 w-4 shrink-0 text-blue-600" />
      <span className="line-clamp-2 min-w-0 text-xs font-medium sm:text-sm">{label}</span>
    </div>
  );
}
