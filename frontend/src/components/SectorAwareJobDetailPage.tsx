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
  Sparkles,
} from 'lucide-react';
import { fetchJob } from '../api/jobs';
import { fetchPublishedRecruitment, Recruitment } from '../api/recruitments';
import { RecruitmentExplorerView } from './RecruitmentPage';
import { parseRawVacancyNotice } from '../utils/rawNoticeParser';
import { JobDetailPage } from './JobDetailPage';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { cardFieldText, cardSalaryText, displayJobDescription } from '../utils/extractedFieldDisplay';
import { cleanLocation } from '../utils/locationCleaner';
import { buildJobShareText, getJobShareUrl, shareTextWithoutUrl } from '../utils/shareContent';

interface Props {
  onNavigate: (page: string, entityId?: string) => void;
}

export function SectorAwareJobDetailPage({ onNavigate }: Props) {
  const { jobId } = useParams<{ jobId: string }>();
  const [job, setJob] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [recruitment, setRecruitment] = useState<Recruitment | null>(null);
  const [viewMode, setViewMode] = useState<'explorer' | 'standard'>('explorer');

  useEffect(() => {
    let active = true;
    if (!jobId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    fetchJob(jobId)
      .then((data) => {
        if (!active) return;
        setJob(data);

        if (data?.sourceRecruitmentId) {
          fetchPublishedRecruitment(data.sourceRecruitmentId)
            .then((rec) => {
              if (active && rec) {
                setRecruitment(rec);
                setViewMode('explorer');
              }
            })
            .catch(() => undefined);
          return;
        }

        // Check if notice has multi-department table or list
        const textToParse = [data?.description, data?.requirements].filter(Boolean).join('\n\n');
        const parsed = parseRawVacancyNotice(textToParse);
        let depts = parsed.departmentsList || [];

        // Fallback: check comma/slash-separated specialties in data.speciality
        if (depts.length < 2 && data?.speciality) {
          const specItems = data.speciality
            .split(/[,;/]/)
            .map((s: string) => s.trim())
            .filter((s: string) => s.length > 2 && !/^(all|general|various|allied)$/i.test(s));
          if (specItems.length >= 2) {
            depts = specItems.map((sp: string) => ({
              department: sp,
              numberOfVacancies: 1,
              postName: data.title,
            }));
          }
        }

        if (depts.length >= 2) {
          const org =
            data.organization ||
            data.companyName ||
            data.employer?.companyName ||
            data.employerName ||
            parsed.organization ||
            'Government Organisation';
          const loc = cleanLocation(data.location || [data.city, data.state].filter(Boolean).join(', '), org, '');
          const notificationUrl = data.jobDocumentUrl || data.pdfUrl || data.applyLink;
          const officialWeb = data.officialWebsite || extractOfficialWebsite(data.description);

          const synthesized: Recruitment = {
            id: String(data.id),
            slug: String(data.id),
            organisationName: org,
            title: data.title,
            sector: (String(data.sector || '').toLowerCase() === 'private' ? 'private' : 'government'),
            location: loc || 'India',
            totalVacancies: depts.reduce((s, d) => s + (d.numberOfVacancies || 1), 0) || data.numberOfPosts || 1,
            applicationLastDate: data.lastDate,
            officialApplicationUrl: data.applyLink || notificationUrl || officialWeb,
            officialNotificationUrl: notificationUrl,
            officialWebsite: officialWeb,
            selectionProcess: parsed.selectionProcess || 'Shortlisting, interview, document verification as per notification',
            importantInstructions: data.requirements,
            jobDescription: data.description,
            officialSourceVerified: true,
            status: 'PUBLISHED',
            vacancies: depts.map((d, index) => ({
              id: `${data.id}-dept-${index}`,
              postName: d.postName || data.title,
              department: d.department,
              speciality: d.department,
              numberOfVacancies: d.numberOfVacancies || 1,
              category: d.category,
              qualification: cardFieldText(data.qualification) || 'As per official notification',
              experience: cardFieldText(data.experience) || 'As per official notification',
              salary: cardSalaryText(data.salary) || 'As per official notification',
              ageLimit: data.ageLimit || 'As per official notification',
              otherEligibilityRequirements: data.requirements || 'As per official notification',
              location: loc,
              jobType: 'Full Time',
              status: 'PUBLISHED',
              publishedJobId: String(data.id),
              lastDate: data.lastDate,
            })),
          };

          setRecruitment(synthesized);
          setViewMode('explorer');
        }
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

  // If multi-department recruitment is detected (either synthesized or linked)
  if (recruitment && recruitment.vacancies && recruitment.vacancies.length >= 2) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-gray-200 px-4 py-2">
          <div className="container mx-auto flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">View Mode:</span>
              <div className="inline-flex rounded-lg bg-gray-100 p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode('explorer')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                    viewMode === 'explorer'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Department Explorer ({recruitment.vacancies.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('standard')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                    viewMode === 'standard'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Standard Notice View</span>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span>{recruitment.totalVacancies} Total Vacancies</span>
              <span>•</span>
              <span>{recruitment.vacancies.length} Specialties</span>
            </div>
          </div>
        </div>

        {viewMode === 'explorer' ? (
          <RecruitmentExplorerView
            recruitment={recruitment}
            applyByDateOverride={job.lastDate}
            onNavigate={onNavigate}
            onViewStandardDetail={() => setViewMode('standard')}
          />
        ) : String(job.sector || '').toLowerCase() === 'government' ? (
          <GovernmentJobDetail job={job} onNavigate={onNavigate} />
        ) : (
          <JobDetailPage onNavigate={onNavigate} />
        )}
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
  const organization =
    job.organization ||
    job.companyName ||
    job.employer?.companyName ||
    job.employerName ||
    'Government Organisation';
  const rawLocation = job.location || [job.city, job.state].filter(Boolean).join(', ');
  const fallbackCityState = [job.city, job.state].filter(Boolean).join(', ');
  const locationText = cleanLocation(rawLocation, organization, fallbackCityState);

  const notificationUrl = job.jobDocumentUrl || job.pdfUrl;
  const officialWebsite = extractOfficialWebsite(job.description) || job.officialWebsite;
  const daysLeft = job.lastDate
    ? Math.ceil((new Date(job.lastDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const handleShare = async () => {
    const shareUrl = getJobShareUrl(job.id);
    const shareText = buildJobShareText(
      {
        id: job.id,
        title: job.title,
        organization,
        location: locationText,
        sector: 'government',
        category: job.category,
        numberOfPosts: job.numberOfPosts,
        qualification: cardFieldText(job.qualification),
        experience: cardFieldText(job.experience),
        salary: cardSalaryText(job.salary),
        lastDate: job.lastDate,
      },
      shareUrl,
    );
    const shareData = {
      title: `${job.title} | MedExJob`,
      text: shareTextWithoutUrl(shareText, shareUrl),
      url: shareUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareText);
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

                  {Array.isArray(job.jobRoles) && job.jobRoles.length > 0 ? (
                    job.jobRoles.map((role: string, idx: number) => (
                      <Badge key={idx} variant="outline" className="border-teal-300 bg-teal-50 text-teal-800 font-medium">
                        {role}
                      </Badge>
                    ))
                  ) : job.category ? (
                    <Badge variant="outline">{job.category}</Badge>
                  ) : null}
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
                    <Building2 className="h-5 w-5 shrink-0 text-amber-700" />
                    <span className="medex-org-highlight rounded-md bg-amber-100 px-2.5 py-0.5 text-lg font-semibold text-amber-900">{organization}</span>
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
            <Card className="p-4 sm:p-6 job-detail-facts">
              <h2 className="mb-3 sm:mb-4 text-lg sm:text-xl font-bold text-gray-900">Job Details</h2>
              <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
                <PrivateStyleDetail icon={MapPin} label="Location" value={locationText || 'See notification'} />
                <PrivateStyleDetail
                  icon={Briefcase}
                  label="Number of Posts"
                  value={job.numberOfPosts != null ? String(job.numberOfPosts) : 'See notification'}
                />
                <PrivateStyleDetail
                  icon={GraduationCap}
                  label="Qualification"
                  value={cardFieldText(job.qualification, 'See job description')}
                  className="col-span-2"
                />
                <PrivateStyleDetail
                  icon={BriefcaseIcon}
                  label="Experience"
                  value={cardFieldText(job.experience, 'See job description')}
                />
                {cardSalaryText(job.salary) && (
                  <PrivateStyleDetail icon={IndianRupee} label="Salary" value={cardSalaryText(job.salary)} />
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

            <Card className="p-4 sm:p-6 job-detail-description">
              <h2 className="mb-3 sm:mb-4 text-lg sm:text-xl font-bold text-gray-900">Job Description</h2>
              <p className="whitespace-pre-wrap text-gray-700 leading-relaxed text-sm sm:text-base">
                {displayJobDescription(job) ||
                  'Refer to the official notification for complete eligibility, selection process and application instructions.'}
              </p>
            </Card>

          </div>

          {/* Same right-column composition as Private jobs */}
          <div className="job-detail-aside space-y-6 md:col-span-1">
            <Card className="p-4 sm:p-6 md:sticky md:top-20 job-detail-apply">
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

                  <Button variant="outline" className="w-full text-blue-600 hover:bg-blue-50" onClick={handleShare}>
                    <Share2 className="mr-2 h-4 w-4" />
                    Share Job
                  </Button>
                </div>
              </div>
            </Card>

            <Card className="p-6 job-detail-about-org medex-about-organization-card hidden lg:block">
              <h3 className="mb-4 font-semibold text-gray-900">About Organization</h3>
              <div className="space-y-3 text-sm text-gray-700">
                <div className="flex items-start gap-2">
                  <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                  <span className="medex-org-highlight">{organization}</span>
                </div>
                {locationText && (
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                    <span>{locationText}</span>
                  </div>
                )}
              </div>
            </Card>

            {(notificationUrl || officialWebsite) && (
              <Card className="p-6 job-detail-docs">
                <h3 className="mb-4 font-semibold text-gray-900">Official Documents</h3>
                <div className="space-y-3">
                  {notificationUrl && (
                    <OfficialLinkBox href={notificationUrl} icon={FileText} label="Notification PDF" tone="pdf" />
                  )}
                  {officialWebsite && (
                    <OfficialLinkBox href={officialWebsite} icon={Building2} label="Official Website" tone="website" />
                  )}
                </div>
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
  className = '',
}: {
  icon: any;
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={`flex items-start gap-2 sm:gap-3 rounded-lg border border-gray-200 bg-white p-2.5 sm:p-3.5 shadow-none ${className}`}>
      <div className="rounded-md bg-blue-50 p-1.5 sm:p-2 text-blue-600 shrink-0">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-gray-500">{label}</p>
        <p className="mt-0.5 text-xs sm:text-sm font-medium leading-tight sm:leading-snug text-gray-900 break-words">{value}</p>
      </div>
    </div>
  );
}

function OfficialLinkBox({
  href,
  icon: Icon,
  label,
  tone,
}: {
  href: string;
  icon: any;
  label: string;
  tone: 'pdf' | 'website';
}) {
  const styles = 'border-blue-300 bg-blue-50 text-blue-800 hover:bg-blue-100 hover:border-blue-400';
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center justify-between rounded-lg border px-3 py-3 text-sm font-semibold transition-colors ${styles}`}
    >
      <span className="inline-flex items-center gap-2">
        <Icon className="h-4 w-4 text-blue-600" />
        {label}
      </span>
      <ExternalLink className="h-4 w-4 text-blue-600" />
    </a>
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
