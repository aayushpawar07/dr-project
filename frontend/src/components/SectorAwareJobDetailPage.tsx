import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Briefcase,
  BriefcaseIcon,
  Building2,
  Calendar,
  ExternalLink,
  FileText,
  GraduationCap,
  IndianRupee,
  Loader2,
  MapPin,
  Share2,
  Shield,
} from 'lucide-react';
import { fetchJob } from '../api/jobs';
import { JobDetailPage } from './JobDetailPage';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';

interface Props {
  onNavigate: (page: string, entityId?: string) => void;
}

export function SectorAwareJobDetailPage({ onNavigate }: Props) {
  const { jobId } = useParams<{ jobId: string }>();
  const [job, setJob] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (!jobId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    fetchJob(jobId)
      .then((data) => {
        if (active) setJob(data);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [jobId]);

  if (loading) {
    return (
      <div className="flex min-h-[55vh] items-center justify-center">
        <Loader2 className="h-9 w-9 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold">Job not found</h1>
        <Button className="mt-4" onClick={() => onNavigate('jobs')}>
          Browse Jobs
        </Button>
      </div>
    );
  }

  if (String(job.sector || '').toLowerCase() !== 'government') {
    return <JobDetailPage onNavigate={onNavigate} />;
  }

  return <GovernmentJobDetail job={job} onNavigate={onNavigate} />;
}

function GovernmentJobDetail({
  job,
  onNavigate,
}: {
  job: any;
  onNavigate: Props['onNavigate'];
}) {
  const locationText = job.location || [job.city, job.state].filter(Boolean).join(', ');
  const organization =
    job.organization ||
    job.companyName ||
    job.employer?.companyName ||
    job.employerName ||
    'Government Organisation';

  const notificationUrl = job.jobDocumentUrl || job.pdfUrl;
  const officialWebsite = extractOfficialWebsite(job.description) || job.officialWebsite;
  const applyLink = job.applyLink;
  const daysLeft = job.lastDate
    ? Math.ceil((new Date(job.lastDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const handleShare = async () => {
    const data = {
      title: job.title,
      text: `${job.title} - ${organization}`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(data);
      } else {
        await navigator.clipboard.writeText(window.location.href);
      }
    } catch {
      // User cancelled the native share sheet.
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 job-detail-page" data-sector="government">
      <div className="container mx-auto px-4 py-8">
        <div className="job-detail-grid grid gap-6 md:grid-cols-3">
          <div className="job-detail-main space-y-6 md:col-span-2">
            {/* Same visual hierarchy as the Private job header */}
            <Card className="p-6 job-detail-hero">
              <div className="space-y-4">
                <div className="flex flex-wrap items-start gap-3">
                  <span
                    className="inline-flex items-center gap-1.5 rounded-md px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-white shadow-md"
                    style={{
                      background: 'linear-gradient(to right, rgb(59 130 246), rgb(37 99 235))',
                    }}
                  >
                    <Shield className="h-3.5 w-3.5" />
                    Government
                  </span>

                  {job.category && <Badge variant="outline">{job.category}</Badge>}
                  <Badge
                    variant="outline"
                    className="border-emerald-200 bg-emerald-50 text-emerald-700"
                  >
                    Official Source
                  </Badge>

                  <div className="ml-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-1 text-xs text-gray-600 hover:bg-blue-50 hover:text-blue-600"
                      onClick={handleShare}
                    >
                      <Share2 className="h-3.5 w-3.5" />
                      Share
                    </Button>
                  </div>
                </div>

                <div>
                  <h1 className="mb-2 text-3xl text-gray-900">{job.title}</h1>
                  <div className="flex items-center gap-2 text-gray-700">
                    <Building2 className="h-5 w-5 shrink-0 text-blue-600" />
                    <span className="text-lg font-medium">{organization}</span>
                  </div>

                  {job.sourceRecruitmentId && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => onNavigate('recruitment', job.sourceRecruitmentId)}
                    >
                      View Full Recruitment
                    </Button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-5 text-sm text-gray-500">
                  {locationText && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-4 w-4" />
                      <span>{locationText}</span>
                    </div>
                  )}
                  {job.numberOfPosts != null && (
                    <div className="flex items-center gap-1.5">
                      <Briefcase className="h-4 w-4" />
                      <span>{job.numberOfPosts} post{job.numberOfPosts === 1 ? '' : 's'}</span>
                    </div>
                  )}
                  {job.postedDate && (
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4" />
                      <span>Posted {new Date(job.postedDate).toLocaleDateString('en-IN')}</span>
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* Same card/grid treatment as Private job details */}
            <Card className="p-6 job-detail-facts">
              <h2 className="mb-4 text-xl text-gray-900">Job Details</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <PrivateStyleDetail icon={MapPin} label="Location" value={locationText || 'See notification'} />
                <PrivateStyleDetail
                  icon={Briefcase}
                  label="Number of Posts"
                  value={job.numberOfPosts != null ? String(job.numberOfPosts) : 'See notification'}
                />
                <PrivateStyleDetail
                  icon={GraduationCap}
                  label="Qualification"
                  value={job.qualification || 'See notification'}
                />
                <PrivateStyleDetail
                  icon={BriefcaseIcon}
                  label="Experience"
                  value={job.experience || 'As per notification'}
                />
                {job.salary && (
                  <PrivateStyleDetail icon={IndianRupee} label="Salary" value={job.salary} />
                )}
                {job.lastDate && (
                  <PrivateStyleDetail
                    icon={Calendar}
                    label="Last Date to Apply"
                    value={formatLongDate(job.lastDate)}
                  />
                )}
              </div>
            </Card>

            <Card className="p-6 job-detail-description">
              <h2 className="mb-4 text-xl text-gray-900">Job Description</h2>
              <p className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                {job.description ||
                  'Refer to the official notification for complete eligibility, selection process and application instructions.'}
              </p>
            </Card>

            {(notificationUrl || officialWebsite || applyLink) && (
              <Card className="p-6 job-detail-docs">
                <h2 className="mb-4 text-xl text-gray-900">Official Documents</h2>
                <div className="space-y-3">
                  {notificationUrl && (
                    <DocumentButton href={notificationUrl} icon={FileText} label="View Official Notification PDF" />
                  )}
                  {officialWebsite && (
                    <DocumentButton href={officialWebsite} icon={Building2} label="Official Website" />
                  )}
                  {applyLink && (
                    <DocumentButton href={applyLink} icon={ExternalLink} label="Official Apply Link" />
                  )}
                </div>
              </Card>
            )}
          </div>

          {/* Same right-column composition as Private jobs */}
          <div className="job-detail-aside space-y-6 md:col-span-1">
            <Card className="p-6 md:sticky md:top-20 job-detail-apply">
              <div className="space-y-4">
                {daysLeft != null && daysLeft > 0 && (
                  <div
                    className={`rounded-md border px-4 py-3 text-sm ${
                      daysLeft <= 7
                        ? 'border-red-200 bg-red-50 text-red-700'
                        : 'border-blue-200 bg-blue-50 text-blue-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {daysLeft <= 7
                          ? `Only ${daysLeft} days left to apply!`
                          : `${daysLeft} days remaining`}
                      </span>
                    </div>
                  </div>
                )}

                <Separator />

                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    Government applications are submitted through the official process. MedExJob does not collect this application.
                  </p>

                  {applyLink ? (
                    <Button className="w-full bg-blue-600 hover:bg-blue-700" asChild>
                      <a href={applyLink} target="_blank" rel="noopener noreferrer">
                        Official Apply Link
                        <ExternalLink className="ml-2 h-4 w-4" />
                      </a>
                    </Button>
                  ) : (
                    <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-800">
                      Online application link is not listed. Check the official notification for offline, walk-in or direct application instructions.
                    </div>
                  )}

                  {notificationUrl && (
                    <Button variant="outline" className="w-full" asChild>
                      <a href={notificationUrl} target="_blank" rel="noopener noreferrer">
                        <FileText className="mr-2 h-4 w-4" />
                        View Notification
                      </a>
                    </Button>
                  )}

                  {officialWebsite && (
                    <Button variant="outline" className="w-full" asChild>
                      <a href={officialWebsite} target="_blank" rel="noopener noreferrer">
                        <Building2 className="mr-2 h-4 w-4" />
                        Official Website
                        <ExternalLink className="ml-auto h-4 w-4" />
                      </a>
                    </Button>
                  )}

                  <Button variant="outline" className="w-full text-blue-600" onClick={handleShare}>
                    <Share2 className="mr-2 h-4 w-4" />
                    Share Job
                  </Button>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="mb-4 font-semibold text-gray-900">About Organization</h3>
              <div className="space-y-3 text-sm text-gray-700">
                <div className="flex items-start gap-2">
                  <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                  <span>{organization}</span>
                </div>
                {locationText && (
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                    <span>{locationText}</span>
                  </div>
                )}
              </div>
            </Card>

            {notificationUrl && (
              <Card className="p-6">
                <h3 className="mb-4 flex items-center gap-2 font-semibold text-gray-900">
                  <FileText className="h-5 w-5" />
                  Job Documents
                </h3>
                <a
                  href={notificationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between rounded-md border border-gray-200 p-3 transition hover:border-blue-300 hover:bg-blue-50"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="rounded-md bg-blue-50 p-2 text-blue-600">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900">Official Notification</p>
                      <p className="text-xs text-gray-500">PDF Document</p>
                    </div>
                  </div>
                  <ExternalLink className="h-4 w-4 shrink-0 text-gray-500" />
                </a>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PrivateStyleDetail({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-4">
      <div className="rounded-md bg-blue-50 p-2 text-blue-600">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
        <p className="mt-1 text-sm font-medium leading-6 text-gray-900">{value}</p>
      </div>
    </div>
  );
}

function DocumentButton({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: any;
  label: string;
}) {
  return (
    <Button variant="outline" className="w-full justify-start" asChild>
      <a href={href} target="_blank" rel="noopener noreferrer">
        <Icon className="mr-2 h-4 w-4" />
        {label}
        <ExternalLink className="ml-auto h-4 w-4" />
      </a>
    </Button>
  );
}

function formatLongDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function extractOfficialWebsite(description?: string) {
  if (!description) return '';
  const match = description.match(/Official Website:\s*(https?:\/\/\S+)/i);
  return match?.[1]?.replace(/[),.;]+$/, '') || '';
}
