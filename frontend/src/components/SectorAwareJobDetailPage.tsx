import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  ArrowLeft, Briefcase, Building2, CalendarDays, ExternalLink, FileText,
  GraduationCap, IndianRupee, Loader2, MapPin, ShieldCheck, Users,
} from 'lucide-react';
import { fetchJob } from '../api/jobs';
import { JobDetailPage } from './JobDetailPage';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';

interface Props { onNavigate: (page: string, entityId?: string) => void; }

export function SectorAwareJobDetailPage({ onNavigate }: Props) {
  const { jobId } = useParams<{ jobId: string }>();
  const [job, setJob] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (!jobId) { setLoading(false); return; }
    setLoading(true);
    fetchJob(jobId).then((data) => { if (active) setJob(data); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [jobId]);

  if (loading) return <div className="flex min-h-[55vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
  if (!job) return <div className="container mx-auto px-4 py-16 text-center"><h1 className="text-2xl font-semibold">Job not found</h1><Button className="mt-4" onClick={() => onNavigate('jobs')}>Browse Jobs</Button></div>;

  // Keep the existing private application workflow untouched.
  if (String(job.sector || '').toLowerCase() !== 'government') {
    return <JobDetailPage onNavigate={onNavigate} />;
  }

  return <GovernmentJobDetail job={job} onNavigate={onNavigate} />;
}

function GovernmentJobDetail({ job, onNavigate }: { job: any; onNavigate: Props['onNavigate'] }) {
  const location = job.location || [job.city, job.state].filter(Boolean).join(', ');
  const notificationUrl = job.jobDocumentUrl || job.pdfUrl;
  const officialWebsite = extractOfficialWebsite(job.description) || job.officialWebsite;
  const applyLink = job.applyLink;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b bg-white">
        <div className="container mx-auto max-w-6xl px-4 py-7">
          <button className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-blue-700" onClick={() => onNavigate('govt-jobs')}><ArrowLeft className="h-4 w-4" />Government Jobs</button>
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap items-center gap-2"><Badge className="bg-blue-600 text-white hover:bg-blue-600">Government</Badge><Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700"><ShieldCheck className="mr-1 h-3.5 w-3.5" />Official-source application</Badge></div>
              <h1 className="text-3xl font-semibold leading-tight text-slate-950">{job.title}</h1>
              <div className="mt-3 flex items-center gap-2 text-slate-700"><Building2 className="h-5 w-5 text-blue-600" /><span className="font-medium">{job.organization || job.companyName || job.employer?.companyName}</span></div>
              <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-600">{location && <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" />{location}</span>}{job.lastDate && <span className="inline-flex items-center gap-1.5 font-medium text-rose-600"><CalendarDays className="h-4 w-4" />Apply by {formatDate(job.lastDate)}</span>}{job.numberOfPosts != null && <span className="inline-flex items-center gap-1.5"><Users className="h-4 w-4" />{job.numberOfPosts} posts</span>}</div>
            </div>
            <Card className="w-full border-blue-100 bg-blue-50/60 p-4 lg:w-[330px]"><p className="font-semibold text-blue-950">How to apply</p><p className="mt-1 text-sm leading-5 text-blue-900">Government recruitment may be online, offline, walk-in or direct. MedExJob does not collect the application for this post. Follow the official notification.</p></Card>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-6xl px-4 py-7">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_330px]">
          <main className="min-w-0 space-y-5">
            <Card className="p-5">
              <h2 className="text-lg font-semibold text-slate-950">Vacancy Details</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Detail icon={Briefcase} label="Post" value={job.title} />
                <Detail icon={Users} label="Vacancies" value={job.numberOfPosts != null ? String(job.numberOfPosts) : 'See notification'} />
                <Detail icon={GraduationCap} label="Qualification" value={job.qualification || 'See notification'} />
                <Detail icon={Briefcase} label="Experience" value={job.experience || 'As per notification'} />
                {job.salary && <Detail icon={IndianRupee} label="Salary / Pay" value={job.salary} />}
                {location && <Detail icon={MapPin} label="Location" value={location} />}
              </div>
            </Card>

            <Card className="p-5"><h2 className="text-lg font-semibold text-slate-950">Job Description</h2><div className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-700">{job.description || 'Refer to the official notification for complete eligibility and application instructions.'}</div></Card>

            {(notificationUrl || officialWebsite || applyLink) && <Card className="p-5"><h2 className="text-lg font-semibold text-slate-950">Official Sources</h2><p className="mt-1 text-sm text-slate-500">Use these links to verify the vacancy and application method.</p><div className="mt-4 grid gap-3 sm:grid-cols-2">{notificationUrl && <OfficialLink href={notificationUrl} icon={FileText} label="Notification PDF" />}{officialWebsite && <OfficialLink href={officialWebsite} icon={Building2} label="Official Website" />}{applyLink && <OfficialLink href={applyLink} icon={ExternalLink} label="Official Apply Link" primary />}</div>{!applyLink && <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">No online apply link is listed for this vacancy. Check the notification for offline, direct or walk-in instructions.</div>}</Card>}
          </main>

          <aside className="space-y-4">
            <Card className="p-5 lg:sticky lg:top-20"><h3 className="font-semibold text-slate-950">Official Application</h3><p className="mt-2 text-sm leading-6 text-slate-600">MedExJob provides job information only for this Government vacancy.</p><div className="mt-4 space-y-2">{applyLink && <Button className="w-full bg-blue-600 hover:bg-blue-700" asChild><a href={applyLink} target="_blank" rel="noopener noreferrer">Open Official Apply Link <ExternalLink className="ml-2 h-4 w-4" /></a></Button>}{notificationUrl && <Button className="w-full" variant="outline" asChild><a href={notificationUrl} target="_blank" rel="noopener noreferrer">View Notification <FileText className="ml-2 h-4 w-4" /></a></Button>}{officialWebsite && <Button className="w-full" variant="ghost" asChild><a href={officialWebsite} target="_blank" rel="noopener noreferrer">Official Website <ExternalLink className="ml-2 h-4 w-4" /></a></Button>}</div><div className="mt-5 border-t pt-4 text-xs leading-5 text-slate-500">Always verify dates, eligibility, fees and application mode in the official notification before applying.</div></Card>
          </aside>
        </div>
      </div>
    </div>
  );
}

function Detail({ icon: Icon, label, value }: { icon: any; label: string; value: string }) { return <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500"><Icon className="h-4 w-4 text-blue-600" />{label}</div><p className="mt-2 text-sm font-medium leading-6 text-slate-900">{value}</p></div>; }
function OfficialLink({ href, icon: Icon, label, primary = false }: { href: string; icon: any; label: string; primary?: boolean }) { return <a href={href} target="_blank" rel="noopener noreferrer" className={`flex items-center justify-between rounded-xl border p-4 text-sm font-semibold transition ${primary ? 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700' : 'border-slate-200 bg-white text-slate-800 hover:border-blue-300 hover:bg-blue-50'}`}><span className="flex items-center gap-2"><Icon className="h-4 w-4" />{label}</span><ExternalLink className="h-4 w-4" /></a>; }
function formatDate(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }
function extractOfficialWebsite(description?: string) { if (!description) return ''; const match = description.match(/Official Website:\s*(https?:\/\/\S+)/i); return match?.[1]?.replace(/[),.;]+$/, '') || ''; }
