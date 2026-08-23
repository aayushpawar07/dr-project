import { MapPin, Briefcase, Calendar, Star, Building2, ArrowUpRight, Gift, Shield, BriefcaseIcon } from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Job } from '../types';

interface JobCardProps {
  job: Job;
  onViewDetails: (jobId: string) => void;
  onSaveJob?: (jobId: string) => void;
  isSaved?: boolean;
}

export function JobCard({ job, onViewDetails, onSaveJob, isSaved }: JobCardProps) {
  const sector = job.sector || 'private';
  const isGovernment = sector === 'government';
  const daysLeft = Math.ceil((new Date(job.lastDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  const locationText = job.location || [
    (job as any).city,
    (job as any).state
  ].filter(Boolean).join(', ');

  return (
    <Card className="relative cursor-pointer overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 md:p-6 shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-md group h-full flex flex-col">
      <div className="flex flex-col h-full justify-between gap-3 flex-1">
        <div className="flex flex-col gap-3">
          {/* Sector + Category + Featured badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white"
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
              <Badge variant="outline" className="px-3 py-1 text-xs font-medium text-gray-600 border-gray-300">
                {job.category}
              </Badge>
            )}

            {job.featured && (
              <Badge className="bg-yellow-50 text-yellow-700 border-yellow-200 px-3 py-1 text-xs font-medium" variant="outline">
                <Star className="w-3 h-3 mr-1 fill-yellow-500 text-yellow-500" />
                Featured
              </Badge>
            )}
          </div>

          {/* Title + Organization */}
          <div>
            <h3
              className="text-lg font-semibold text-gray-900 leading-snug hover:text-blue-700 transition-colors cursor-pointer line-clamp-2"
              onClick={() => onViewDetails(job.slug || job.id)}
            >
              {job.title}
            </h3>
            {job.organization && (
              <div className="flex items-center gap-1.5 mt-1 text-sm text-gray-500">
                <Building2 className="w-4 h-4 shrink-0" />
                <span className="truncate">{job.organization}</span>
              </div>
            )}
          </div>

          {/* Meta pills: Location, Posts, Apply by */}
          <div className="flex flex-wrap gap-2 text-sm">
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
            {job.lastDate && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-orange-700">
                <Calendar className="w-3.5 h-3.5" />
                Apply by {new Date(job.lastDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            )}
          </div>

          {/* Qualification */}
          {job.qualification && (
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-600">
                <Gift className="w-3.5 h-3.5 text-gray-400" />
                Qualification: {job.qualification}
              </span>
            </div>
          )}

          {/* Salary & Experience */}
          {(job.salary || job.experience) && (
            <div className="flex flex-wrap gap-2 text-sm">
              {job.salary && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-3 py-1.5 text-green-700 font-medium">
                  💰 {job.salary}
                </span>
              )}
              {job.experience && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-gray-600">
                  📊 Experience: {job.experience}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Footer pinned to bottom */}
        <div className="flex items-center justify-between border-t border-gray-100 pt-3 mt-auto">
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span>{job.views ?? 0} views</span>
            <span>{job.applications ?? 0} applications</span>
            {daysLeft > 0 && daysLeft <= 7 && (
              <Badge variant="destructive" className="text-[11px] px-1.5 py-0.5">
                {daysLeft}d left
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {onSaveJob && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-gray-400 hover:text-yellow-500"
                onClick={(e) => { e.stopPropagation(); onSaveJob(job.id); }}
              >
                <Star className={`w-4 h-4 ${isSaved ? 'fill-yellow-500 text-yellow-500' : ''}`} />
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => onViewDetails(job.slug || job.id)}
              className="inline-flex items-center gap-1.5 rounded-full text-white text-sm font-semibold px-5 py-2 shadow hover:shadow-md transition-all"
              style={{ background: 'linear-gradient(to right, #2563eb, #1d4ed8)' }}
            >
              View Details
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
