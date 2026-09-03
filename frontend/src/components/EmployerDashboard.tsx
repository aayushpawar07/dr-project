import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, BarChart3, Bell, Briefcase, Building2, Calendar, CheckCircle2, ChevronRight,
  Clock3, CreditCard, Edit, Eye, FileText, LogOut, Mail, MapPin, Phone, Plus, RefreshCw,
  ShieldCheck, Star, UserCheck, Users, XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { fetchEmployer, EmployerResponse } from '../api/employers';
import { fetchApplications, updateApplicationStatus, ApplicationResponse } from '../api/applications';
import { fetchJobsByEmployer } from '../api/jobs';
import { getCurrentSubscription, SubscriptionResponse } from '../api/subscriptions';
import { openFileInViewer } from '../utils/fileUtils';

interface EmployerDashboardProps { onNavigate: (page: string, entityId?: string) => void; }
type Section = 'jobs' | 'applications' | 'account';
type AppStatusFilter = 'all' | 'applied' | 'shortlisted' | 'interview' | 'selected' | 'rejected';

function formatDate(value?: string) {
  if (!value) return 'N/A';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'N/A' : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
function initials(value?: string) { return (value || 'ME').trim().split(/\s+/).slice(0,2).map((v)=>v[0]?.toUpperCase()).join('') || 'ME'; }
function statusTone(status?: string) {
  switch ((status || '').toLowerCase()) {
    case 'active': case 'selected': return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'shortlisted': return 'border-blue-200 bg-blue-50 text-blue-700';
    case 'interview': return 'border-violet-200 bg-violet-50 text-violet-700';
    case 'rejected': case 'closed': return 'border-rose-200 bg-rose-50 text-rose-700';
    case 'pending': case 'applied': return 'border-amber-200 bg-amber-50 text-amber-700';
    default: return 'border-slate-200 bg-slate-50 text-slate-600';
  }
}

export function EmployerDashboard({ onNavigate }: EmployerDashboardProps) {
  const { user, token, logout } = useAuth();
  const [employer, setEmployer] = useState<EmployerResponse | null>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [applications, setApplications] = useState<ApplicationResponse[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionResponse | null>(null);
  const [section, setSection] = useState<Section>('jobs');
  const [jobFilter, setJobFilter] = useState('all');
  const [applicationJobId, setApplicationJobId] = useState('all');
  const [applicationStatus, setApplicationStatus] = useState<AppStatusFilter>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingApplicationId, setUpdatingApplicationId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = async (showLoader = false) => {
    if (!user || !token) return;
    if (showLoader) setLoading(true);
    try {
      setError('');
      const employerData = await fetchEmployer(user.id, token);
      setEmployer(employerData);
      const jobResponse = await fetchJobsByEmployer(employerData.id, { status: 'all', page: 0, size: 1000 });
      const employerJobs = jobResponse.content || [];
      setJobs(employerJobs);

      const all: ApplicationResponse[] = [];
      for (const job of employerJobs) {
        try {
          const response = await fetchApplications({ jobId: job.id, page: 0, size: 1000 }, token);
          const content = Array.isArray(response?.content) ? response.content : Array.isArray(response) ? response : [];
          all.push(...content);
        } catch (applicationError) {
          console.error(`Applications failed for job ${job.id}`, applicationError);
        }
      }
      setApplications(all);
      try { setSubscription(await getCurrentSubscription(token)); } catch { setSubscription(null); }
    } catch (e: any) {
      console.error(e);
      setError(e?.message || 'Unable to load employer dashboard.');
    } finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { void load(true); }, [user?.id, token]);

  const filteredJobs = useMemo(() => jobFilter === 'all' ? jobs : jobs.filter((job) => job.status === jobFilter), [jobs, jobFilter]);
  const filteredApplications = useMemo(() => applications.filter((application) => {
    if (applicationJobId !== 'all' && application.jobId !== applicationJobId) return false;
    if (applicationStatus !== 'all' && application.status !== applicationStatus) return false;
    return true;
  }), [applications, applicationJobId, applicationStatus]);

  const groupedApplications = useMemo(() => {
    const map = new Map<string, ApplicationResponse[]>();
    filteredApplications.forEach((application) => {
      const bucket = map.get(application.jobId) || [];
      bucket.push(application);
      map.set(application.jobId, bucket);
    });
    return [...map.entries()];
  }, [filteredApplications]);

  const counts = useMemo(() => ({
    active: jobs.filter((j) => j.status === 'active').length,
    apps: applications.length,
    shortlisted: applications.filter((a) => a.status === 'shortlisted').length,
    interviews: applications.filter((a) => a.status === 'interview').length,
    selected: applications.filter((a) => a.status === 'selected').length,
    views: jobs.reduce((sum, job) => sum + (Number(job.views) || 0), 0),
  }), [jobs, applications]);

  const openApplicationsForJob = (jobId: string) => {
    setApplicationJobId(jobId);
    setApplicationStatus('all');
    setSection('applications');
  };

  const updateStatus = async (application: ApplicationResponse, status: string) => {
    if (!token) return;
    let interviewDate: string | undefined;
    if (status === 'interview') {
      const value = window.prompt('Interview date and time (YYYY-MM-DDTHH:mm)', new Date(Date.now() + 86400000).toISOString().slice(0,16));
      if (!value) return;
      interviewDate = value;
    }
    setUpdatingApplicationId(application.id);
    try {
      await updateApplicationStatus(application.id, status, token, undefined, interviewDate);
      toast.success(status === 'interview' ? 'Interview scheduled' : `Application marked ${status}`);
      await load(false);
    } catch (e: any) {
      toast.error(e?.message || 'Unable to update application status.');
    } finally { setUpdatingApplicationId(null); }
  };

  if (loading) return <div className="min-h-[60vh] bg-slate-50 flex items-center justify-center"><div className="text-center"><RefreshCw className="mx-auto h-9 w-9 animate-spin text-blue-600"/><p className="mt-3 text-slate-500">Loading employer workspace…</p></div></div>;
  if (error) return <div className="min-h-[60vh] bg-slate-50 flex items-center justify-center p-4"><div className="max-w-md rounded-2xl border border-rose-200 bg-white p-6 text-center shadow-sm"><AlertTriangle className="mx-auto h-9 w-9 text-rose-500"/><h2 className="mt-3 text-xl font-semibold">Unable to load dashboard</h2><p className="mt-2 text-sm text-slate-600">{error}</p><button className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-white" onClick={()=>void load(true)}>Try again</button></div></div>;
  if (!employer) return null;

  const verified = employer.verificationStatus === 'approved';

  return <div className="min-h-screen bg-slate-50">
    <div className="border-b bg-white"><div className="container mx-auto max-w-7xl px-4 py-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 font-bold text-white">{initials(employer.companyName)}</div><div><h1 className="text-2xl font-semibold text-slate-950">Employer Workspace</h1><p className="text-sm text-slate-500">{employer.companyName} · {employer.companyType}</p></div></div>
      <div className="flex flex-wrap gap-2"><button className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium" onClick={()=>onNavigate('profile')}><Building2 className="mr-2 inline h-4 w-4"/>Company Profile</button><button className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium" onClick={()=>onNavigate('analytics')}><BarChart3 className="mr-2 inline h-4 w-4"/>Analytics</button><button className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium" onClick={()=>{logout();onNavigate('logout')}}><LogOut className="mr-2 inline h-4 w-4"/>Logout</button></div>
    </div></div>

    <div className="container mx-auto max-w-7xl space-y-5 px-4 py-6">
      <section className={`rounded-2xl border p-4 ${verified?'border-emerald-200 bg-emerald-50':'border-amber-200 bg-amber-50'}`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex gap-3"><ShieldCheck className={`h-6 w-6 ${verified?'text-emerald-600':'text-amber-600'}`}/><div><h2 className="font-semibold text-slate-900">{verified?'Verified Employer':'Employer verification required'}</h2><p className="text-sm text-slate-600">{verified?'Job posting and applicant-management access are enabled.':'Paid subscription no longer bypasses verification. Complete business verification before posting.'}</p></div></div>{!verified&&<button className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white" onClick={()=>onNavigate('verification')}>Complete Verification</button>}</div>
      </section>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Metric icon={Briefcase} label="Active Jobs" value={counts.active} tone="blue"/><Metric icon={Users} label="Applications" value={counts.apps} tone="slate"/><Metric icon={Star} label="Shortlisted" value={counts.shortlisted} tone="violet"/><Metric icon={Calendar} label="Interviews" value={counts.interviews} tone="amber"/><Metric icon={UserCheck} label="Selected" value={counts.selected} tone="emerald"/><Metric icon={Eye} label="Job Views" value={counts.views} tone="slate"/>
      </section>

      <div className="flex flex-wrap gap-2 rounded-xl border bg-white p-2 shadow-sm">
        <Tab active={section==='jobs'} onClick={()=>setSection('jobs')} icon={Briefcase}>My Jobs</Tab>
        <Tab active={section==='applications'} onClick={()=>setSection('applications')} icon={Users}>Applications</Tab>
        <Tab active={section==='account'} onClick={()=>setSection('account')} icon={CreditCard}>Account</Tab>
        <button disabled={!verified||subscription?.status!=='active'} className="ml-auto rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300" onClick={()=>onNavigate(subscription?.status==='active'?'employer-post-job':'subscription')}><Plus className="mr-1 inline h-4 w-4"/>Post Private Job</button>
      </div>

      {section==='jobs'&&<section className="rounded-2xl border bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b p-5 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-lg font-semibold">My Jobs</h2><p className="text-sm text-slate-500">Every application stays attached to its exact job.</p></div><select className="h-10 rounded-lg border px-3 text-sm" value={jobFilter} onChange={(e)=>setJobFilter(e.target.value)}><option value="all">All statuses</option><option value="active">Active</option><option value="pending">Pending</option><option value="draft">Draft</option><option value="closed">Closed</option></select></div>
        <div className="divide-y">{filteredJobs.length?filteredJobs.map((job)=><article key={job.id} className="p-5 hover:bg-slate-50/70"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-slate-950">{job.title}</h3><span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${statusTone(job.status)}`}>{job.status}</span></div><div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-500">{job.location&&<span><MapPin className="mr-1 inline h-4 w-4"/>{job.location}</span>}<span><Users className="mr-1 inline h-4 w-4"/>{Number(job.applications)||0} applications</span><span><Eye className="mr-1 inline h-4 w-4"/>{Number(job.views)||0} views</span><span><Calendar className="mr-1 inline h-4 w-4"/>Closes {formatDate(job.lastDate)}</span></div></div><div className="flex flex-wrap gap-2"><button className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700" onClick={()=>openApplicationsForJob(job.id)}><Users className="mr-1 inline h-4 w-4"/>Applications</button><button className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium" onClick={()=>onNavigate('edit-job',job.id)}><Edit className="mr-1 inline h-4 w-4"/>Edit</button></div></div></article>):<Empty title="No jobs found" text="Post a verified private-sector vacancy to get started."/>}</div>
      </section>}

      {section==='applications'&&<section className="space-y-4">
        <div className="rounded-2xl border bg-white p-5 shadow-sm"><div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><h2 className="text-lg font-semibold">Applicant Pipeline</h2><p className="text-sm text-slate-500">Filter by job first so candidates from different posts never mix.</p></div><div className="grid gap-2 sm:grid-cols-2"><label className="text-xs font-semibold text-slate-600">Job<select className="mt-1 h-10 w-full min-w-[220px] rounded-lg border bg-white px-3 text-sm" value={applicationJobId} onChange={(e)=>setApplicationJobId(e.target.value)}><option value="all">All jobs (grouped separately)</option>{jobs.map((job)=><option key={job.id} value={job.id}>{job.title}</option>)}</select></label><label className="text-xs font-semibold text-slate-600">Status<select className="mt-1 h-10 w-full rounded-lg border bg-white px-3 text-sm" value={applicationStatus} onChange={(e)=>setApplicationStatus(e.target.value as AppStatusFilter)}><option value="all">All statuses</option><option value="applied">New / Applied</option><option value="shortlisted">Shortlisted</option><option value="interview">Interview</option><option value="selected">Selected</option><option value="rejected">Rejected</option></select></label></div></div><div className="mt-4 flex justify-end"><button disabled={refreshing} className="rounded-lg border px-3 py-2 text-sm" onClick={()=>{setRefreshing(true);void load(false)}}><RefreshCw className={`mr-1 inline h-4 w-4 ${refreshing?'animate-spin':''}`}/>Refresh</button></div></div>
        {groupedApplications.length?groupedApplications.map(([jobId,apps])=>{const job=jobs.find((item)=>item.id===jobId);return <section key={jobId} className="overflow-hidden rounded-2xl border bg-white shadow-sm"><div className="flex items-center justify-between border-b bg-slate-50 px-5 py-4"><div><h3 className="font-semibold text-slate-900">{job?.title||apps[0]?.jobTitle||'Job'}</h3><p className="text-xs text-slate-500">{apps.length} candidate{apps.length===1?'':'s'} in this job only</p></div><button className="text-sm font-semibold text-blue-700" onClick={()=>setApplicationJobId(jobId)}>Focus this job</button></div><div className="grid gap-4 p-4 lg:grid-cols-2">{apps.map((application)=><CandidateCard key={application.id} application={application} busy={updatingApplicationId===application.id} onStatus={(status)=>void updateStatus(application,status)}/>)}</div></section>}):<Empty title="No applications match these filters" text="Choose another job or application status."/>}
      </section>}

      {section==='account'&&<section className="grid gap-4 md:grid-cols-2"><div className="rounded-2xl border bg-white p-5 shadow-sm"><h2 className="font-semibold">Verification</h2><div className="mt-3 flex items-center gap-3"><ShieldCheck className={verified?'text-emerald-600':'text-amber-600'}/><div><p className="font-medium">{verified?'Approved':'Not approved'}</p><p className="text-sm text-slate-500">Status: {employer.verificationStatus}</p></div></div><button className="mt-4 rounded-lg border px-3 py-2 text-sm" onClick={()=>onNavigate('verification')}>Verification details</button></div><div className="rounded-2xl border bg-white p-5 shadow-sm"><h2 className="font-semibold">Subscription</h2><p className="mt-3 text-lg font-semibold text-blue-700">{subscription?.status==='active'?subscription.plan.name:'No active plan'}</p>{subscription?.status==='active'&&<p className="mt-1 text-sm text-slate-500">{subscription.jobPostsUsed} of {subscription.jobPostsAllowed} job posts used</p>}<button className="mt-4 rounded-lg border px-3 py-2 text-sm" onClick={()=>onNavigate('subscription')}>Manage plan</button></div></section>}
    </div>
  </div>;
}

function Metric({icon:Icon,label,value,tone}:{icon:any;label:string;value:number;tone:'blue'|'violet'|'amber'|'emerald'|'slate'}){const cls=tone==='blue'?'bg-blue-50 text-blue-700 border-blue-100':tone==='violet'?'bg-violet-50 text-violet-700 border-violet-100':tone==='amber'?'bg-amber-50 text-amber-700 border-amber-100':tone==='emerald'?'bg-emerald-50 text-emerald-700 border-emerald-100':'bg-slate-50 text-slate-700 border-slate-200';return <article className={`rounded-xl border p-4 ${cls}`}><Icon className="h-5 w-5"/><strong className="mt-3 block text-2xl">{value}</strong><span className="text-xs font-medium">{label}</span></article>}
function Tab({active,onClick,icon:Icon,children}:{active:boolean;onClick:()=>void;icon:any;children:any}){return <button className={`rounded-lg px-4 py-2 text-sm font-medium ${active?'bg-blue-600 text-white':'text-slate-600 hover:bg-slate-100'}`} onClick={onClick}><Icon className="mr-1 inline h-4 w-4"/>{children}</button>}
function Empty({title,text}:{title:string;text:string}){return <div className="rounded-2xl border bg-white p-10 text-center shadow-sm"><Users className="mx-auto h-8 w-8 text-slate-300"/><h3 className="mt-3 font-semibold">{title}</h3><p className="mt-1 text-sm text-slate-500">{text}</p></div>}
function CandidateCard({application,busy,onStatus}:{application:ApplicationResponse;busy:boolean;onStatus:(status:string)=>void}){return <article className="rounded-xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-700">{initials(application.candidateName)}</div><div className="min-w-0"><h4 className="font-semibold text-slate-900">{application.candidateName}</h4><span className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${statusTone(application.status)}`}>{application.status}</span></div></div><span className="text-xs text-slate-400">{formatDate(application.appliedDate)}</span></div><div className="mt-4 space-y-1 text-sm text-slate-600"><a className="block truncate hover:text-blue-700" href={`mailto:${application.candidateEmail}`}><Mail className="mr-1 inline h-4 w-4"/>{application.candidateEmail}</a>{application.candidatePhone&&<a className="block hover:text-blue-700" href={`tel:${application.candidatePhone}`}><Phone className="mr-1 inline h-4 w-4"/>{application.candidatePhone}</a>}</div>{application.resumeUrl&&<button className="mt-3 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium" onClick={()=>openFileInViewer(application.resumeUrl!)}><FileText className="mr-1 inline h-4 w-4"/>View Resume</button>}<div className="mt-4 grid grid-cols-2 gap-2 border-t pt-4 sm:grid-cols-4"><Action disabled={busy||application.status==='shortlisted'} icon={Star} label="Shortlist" cls="border-blue-200 text-blue-700 bg-blue-50" onClick={()=>onStatus('shortlisted')}/><Action disabled={busy||application.status==='interview'} icon={Calendar} label="Interview" cls="border-violet-200 text-violet-700 bg-violet-50" onClick={()=>onStatus('interview')}/><Action disabled={busy||application.status==='selected'} icon={CheckCircle2} label="Select" cls="border-emerald-200 text-emerald-700 bg-emerald-50" onClick={()=>onStatus('selected')}/><Action disabled={busy||application.status==='rejected'} icon={XCircle} label="Reject" cls="border-rose-200 text-rose-700 bg-rose-50" onClick={()=>onStatus('rejected')}/></div></article>}
function Action({disabled,icon:Icon,label,cls,onClick}:{disabled:boolean;icon:any;label:string;cls:string;onClick:()=>void}){return <button disabled={disabled} className={`rounded-lg border px-2 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40 ${cls}`} onClick={onClick}><Icon className="mr-1 inline h-3.5 w-3.5"/>{label}</button>}
