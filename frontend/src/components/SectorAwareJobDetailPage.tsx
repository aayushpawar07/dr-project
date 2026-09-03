import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Briefcase,
  Building2,
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  FileText,
  GraduationCap,
  IndianRupee,
  Loader2,
  MapPin,
  Shield,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { fetchJob } from '../api/jobs';
import { JobDetailPage } from './JobDetailPage';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';

interface Props { onNavigate: (page: string, entityId?: string) => void; }

export function SectorAwareJobDetailPage({ onNavigate }: Props) {
  const { jobId } = useParams<{ jobId: string }>();
  const [job, setJob] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (!jobId) { setLoading(false); return; }
    setLoading(true);
    fetchJob(jobId)
      .then((data) => { if (active) setJob(data); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [jobId]);

  if (loading) {
    return <div className="flex min-h-[55vh] items-center justify-center"><Loader2 className="h-9 w-9 animate-spin text-blue-600" /></div>;
  }

  if (!job) {
    return <div className="container mx-auto px-4 py-16 text-center"><h1 className="text-2xl font-semibold">Job not found</h1><Button className="mt-4" onClick={() => onNavigate('jobs')}>Browse Jobs</Button></div>;
  }

  if (String(job.sector || '').toLowerCase() !== 'government') {
    return <JobDetailPage onNavigate={onNavigate} />;
  }

  return <GovernmentJobDetail job={job} onNavigate={onNavigate} />;
}

function GovernmentJobDetail({ job, onNavigate }: { job: any; onNavigate: Props['onNavigate'] }) {
  const location = job.location || [job.city, job.state].filter(Boolean).join(', ');
  const organization = job.organization || job.companyName || job.employer?.companyName || 'Government Organisation';
  const notificationUrl = job.jobDocumentUrl || job.pdfUrl;
  const officialWebsite = extractOfficialWebsite(job.description) || job.officialWebsite;
  const applyLink = job.applyLink;
  const daysLeft = job.lastDate
    ? Math.ceil((new Date(job.lastDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto max-w-7xl px-4 py-6 sm:py-8">
        <button
          className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-blue-700"
          onClick={() => onNavigate('govt-jobs')}
        >
          <ArrowLeft className="h-4 w-4" /> Government Jobs
        </button>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card className="overflow-hidden border-blue-100 shadow-sm">
              <div className="h-1.5 bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-500" />
              <div className="p-6 sm:p-7">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="bg-blue-600 text-white hover:bg-blue-600"><Shield className="mr-1 h-3.5 w-3.5" />Government</Badge>
                  <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700"><ShieldCheck className="mr-1 h-3.5 w-3.5" />Official Recruitment</Badge>
                  {job.category && <Badge variant="outline">{job.category}</Badge>}
                </div>

                <h1 className="mt-4 text-3xl font-semibold leading-tight text-gray-950 sm:text-4xl">{job.title}</h1>
                <div className="mt-3 flex items-center gap-2 text-lg font-medium text-gray-700">
                  <Building2 className="h-5 w-5 shrink-0 text-blue-600" />
                  <span>{organization}</span>
                </div>

                <div className="mt-5 flex flex-wrap gap-3 text-sm">
                  {location && <InfoPill icon={MapPin} text={location} />}
                  {job.numberOfPosts != null && <InfoPill icon={Users} text={`${job.numberOfPosts} Post${job.numberOfPosts === 1 ? '' : 's'}`} />}
                  {job.lastDate && <InfoPill icon={CalendarDays} text={`Apply by ${formatDate(job.lastDate)}`} danger={daysLeft != null && daysLeft <= 7} />}
                </div>
              </div>
            </Card>

            <Card className="p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-semibold text-gray-900">Job Details</h2>
                <span className="text-xs font-medium text-gray-500">Verify with official notice</span>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Detail icon={Briefcase} label="Post" value={job.title} tone="blue" />
                <Detail icon={Users} label="Number of Posts" value={job.numberOfPosts != null ? String(job.numberOfPosts) : 'See notification'} tone="violet" />
                <Detail icon={GraduationCap} label="Qualification" value={job.qualification || 'See notification'} tone="emerald" />
                <Detail icon={Briefcase} label="Experience" value={job.experience || 'As per notification'} tone="amber" />
                {job.salary && <Detail icon={IndianRupee} label="Salary / Pay" value={job.salary} tone="green" />}
                {location && <Detail icon={MapPin} label="Location" value={location} tone="blue" />}
              </div>
            </Card>

            <Card className="p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900">Job Description</h2>
              <Separator className="my-4" />
              <div className="whitespace-pre-wrap text-sm leading-7 text-gray-700">
                {job.description || 'Refer to the official notification for complete eligibility, selection process and application instructions.'}
              </div>
            </Card>

            <Card className="p-6 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600"><FileText className="h-5 w-5" /></div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Official Information</h2>
                  <p className="mt-1 text-sm text-gray-500">Official website, notification and online apply link are shown only when available.</p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {notificationUrl && <OfficialLink href={notificationUrl} icon={FileText} label="Notification PDF" />}
                {officialWebsite && <OfficialLink href={officialWebsite} icon={Building2} label="Official Website" />}
                {applyLink && <OfficialLink href={applyLink} icon={ExternalLink} label="Official Apply Link" primary />}
              </div>

              {!applyLink && (
                <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                  This vacancy does not show an online apply link. Check the official notification for offline, walk-in or direct application instructions.
                </div>
              )}
            </Card>
          </div>

          <aside className="space-y-6">
            <Card className="p-6 shadow-sm lg:sticky lg:top-20">
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                <div className="flex items-center gap-2 font-semibold text-blue-950"><ShieldCheck className="h-5 w-5 text-blue-600" />Government Application</div>
                <p className="mt-2 text-sm leading-6 text-blue-900">MedExJob does not collect the application for Government vacancies. Application method depends on the official notice.</p>
              </div>

              {daysLeft != null && daysLeft > 0 && (
                <div className={`mt-4 rounded-xl border p-4 ${daysLeft <= 7 ? 'border-red-200 bg-red-50 text-red-800' : 'border-green-200 bg-green-50 text-green-800'}`}>
                  <div className="flex items-center gap-2 font-semibold"><CalendarDays className="h-4 w-4" />{daysLeft} days remaining</div>
                </div>
              )}

              <div className="mt-5 space-y-3">
                {applyLink && <Button className="w-full bg-blue-600 hover:bg-blue-700" asChild><a href={applyLink} target="_blank" rel="noopener noreferrer">Official Apply Link <ExternalLink className="ml-2 h-4 w-4" /></a></Button>}
                {notificationUrl && <Button className="w-full" variant="outline" asChild><a href={notificationUrl} target="_blank" rel="noopener noreferrer">View Notification <FileText className="ml-2 h-4 w-4" /></a></Button>}
                {officialWebsite && <Button className="w-full" variant="outline" asChild><a href={officialWebsite} target="_blank" rel="noopener noreferrer">Official Website <ExternalLink className="ml-2 h-4 w-4" /></a></Button>}
              </div>

              <Separator className="my-5" />
              <div className="space-y-3 text-sm text-gray-600">
                <CheckLine text="Verify eligibility in the notification" />
                <CheckLine text="Confirm last date and application mode" />
                <CheckLine text="Use only the official link for payment/application" />
              </div>
            </Card>

            <Card className="p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900">About Organization</h3>
              <div className="mt-4 space-y-3 text-sm text-gray-700">
                <div className="flex items-start gap-2"><Building2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" /><span>{organization}</span></div>
                {location && <div className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" /><span>{location}</span></div>}
              </div>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  );
}

function InfoPill({ icon: Icon, text, danger = false }: { icon: any; text: string; danger?: boolean }) {
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-medium ${danger ? 'border-red-200 bg-red-50 text-red-700' : 'border-gray-200 bg-gray-50 text-gray-700'}`}><Icon className="h-4 w-4" />{text}</span>;
}

function Detail({ icon: Icon, label, value, tone }: { icon: any; label: string; value: string; tone: 'blue' | 'violet' | 'emerald' | 'amber' | 'green' }) {
  const classes = tone === 'violet' ? 'border-violet-200 bg-violet-50/60 text-violet-700' : tone === 'emerald' ? 'border-emerald-200 bg-emerald-50/60 text-emerald-700' : tone === 'amber' ? 'border-amber-200 bg-amber-50/60 text-amber-700' : tone === 'green' ? 'border-green-200 bg-green-50/60 text-green-700' : 'border-blue-200 bg-blue-50/60 text-blue-700';
  return <div className={`rounded-xl border p-4 ${classes}`}><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide"><Icon className="h-4 w-4" />{label}</div><p className="mt-2 text-sm font-medium leading-6 text-gray-900">{value}</p></div>;
}

function OfficialLink({ href, icon: Icon, label, primary = false }: { href: string; icon: any; label: string; primary?: boolean }) {
  return <a href={href} target="_blank" rel="noopener noreferrer" className={`flex items-center justify-between rounded-xl border p-4 text-sm font-semibold transition ${primary ? 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700' : 'border-gray-200 bg-white text-gray-800 hover:border-blue-300 hover:bg-blue-50'}`}><span className="flex items-center gap-2"><Icon className="h-4 w-4" />{label}</span><ExternalLink className="h-4 w-4" /></a>;
}

function CheckLine({ text }: { text: string }) {
  return <div className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /><span>{text}</span></div>;
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function extractOfficialWebsite(description?: string) {
  if (!description) return '';
  const match = description.match(/Official Website:\s*(https?:\/\/\S+)/i);
  return match?.[1]?.replace(/[),.;]+$/, '') || '';
}