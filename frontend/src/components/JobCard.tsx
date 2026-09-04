import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  Briefcase,
  Building2,
  Calendar,
  Check,
  MapPin,
  Share2,
  Shield,
  Star,
  BriefcaseIcon,
  Gift,
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
    <Card className="medex-job-card relative cursor-pointer overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 md:p-6 shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-md group h-full flex flex-col">
      <div className="flex flex-col h-full justify-between gap-3 flex-1">
        <div className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white shadow-sm"
                style={{
                  background: isGovernment
                    ? 'linear-gradient(to right, #3b82f6, #2563eb)'
                    : 'linear-gradient(to right, #10b981, #059669)',
                }}
              >
                {isGovernment ? <Shield className="w-3.5 h-3.5" /> : <BriefcaseIcon className="w-3.5 h-3.5" />}
                {isGovernment ? 'Government' : 'Private'}
              </span>

              {job.category && (
                <Badge variant="outline" className="px-3 py-1 text-xs font-medium text-gray-600 border-gray-300 bg-white">
                  {job.category}
                </Badge>
              )}

              {view.featured && (
                <Badge className="bg-yellow-50 text-yellow-700 border-yellow-200 px-3 py-1 text-xs font-medium" variant="outline">
                  <Star className="w-3 h-3 mr-1 fill-yellow-500 text-yellow-500" />
                  Featured
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                title={copied ? 'Share Content Copied!' : 'Share Job'}
                className={`h-8 w-8 rounded-full border transition-all ${
                  copied
                    ? 'text-green-600 bg-green-50 border-green-200 shadow-sm'
                    : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50 border-gray-200 shadow-sm'
                }`}
                onClick={handleShare}
              >
                {copied ? <Check className="w-4 h-4 text-green-600" /> : <Share2 className="w-4 h-4" />}
              </Button>
              {onSaveJob && (
                <Button
                  variant="ghost"
                  size="icon"
                  title={isSaved ? 'Saved' : 'Save Job'}
                  className={`h-8 w-8 rounded-full border transition-all ${
                    isSaved
                      ? 'text-yellow-600 bg-yellow-50 border-yellow-200 shadow-sm'
                      : 'text-gray-400 hover:text-yellow-500 hover:bg-yellow-50 border-gray-200 shadow-sm'
                  }`}
                  onClick={(e) => { e.stopPropagation(); onSaveJob(job.id); }}
                >
                  <Star className={`w-4 h-4 ${isSaved ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                </Button>
              )}
            </div>
          </div>

          <div>
            <h3
              className="text-lg font-semibold text-gray-900 leading-snug hover:text-blue-700 transition-colors cursor-pointer line-clamp-2"
              onClick={openDetails}
            >
              {displayTitle}
            </h3>
            {organizationName && (
              <div className="flex items-center gap-1.5 mt-1 text-sm text-gray-600">
                <Building2 className="w-4 h-4 shrink-0 text-blue-600" />
                <span className="font-medium text-gray-700 truncate">{organizationName}</span>
              </div>
            )}
          </div>

          <div className="flex flex-col items-start gap-2 text-sm">
            {locationText && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-blue-700">
                <MapPin className="w-3.5 h-3.5" />
                {locationText}
              </span>
            )}
            {job.numberOfPosts != null && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-purple-700">
                <Briefcase className="w-3.5 h-3.5" />
                {job.numberOfPosts} Post{job.numberOfPosts > 1 ? 's' : ''}
              </span>
            )}
          </div>

          {job.qualification && (
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-600">
                <Gift className="w-3.5 h-3.5 text-gray-400" />
                Qualification: {job.qualification}
              </span>
            </div>
          )}

          {(job.salary || job.experience) && (
            <div className="flex flex-wrap gap-2 text-sm">
              {job.salary && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-3 py-1.5 text-green-700 font-medium">
                  💰 {job.salary}
                </span>
              )}
              {job.experience && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-600">
                  📊 Experience: {job.experience}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-gray-100 pt-3 mt-auto gap-3">
          <div className="flex flex-col gap-1 text-xs text-gray-500 min-w-0">
            {job.lastDate && (
              <div className="flex items-center gap-1 text-orange-700 font-medium">
                <Calendar className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                <span>Apply by {new Date(job.lastDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-gray-400 flex-wrap">
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
            className="inline-flex items-center gap-1.5 rounded-full text-white text-sm font-semibold px-5 py-2 shadow hover:shadow-md transition-all shrink-0"
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