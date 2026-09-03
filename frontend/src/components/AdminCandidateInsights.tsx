import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BarChart3, GraduationCap, MapPin, RefreshCw, Search, Stethoscope, Users } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { CandidateInsightsResponse, fetchCandidateInsights } from '../api/candidateProfiles';

interface Props { onNavigate: (page: string) => void; }
const empty: CandidateInsightsResponse = { totalProfiles: 0, filteredProfiles: 0, specialityCounts: {}, qualificationCounts: {}, stateCounts: {}, profiles: [] };

export function AdminCandidateInsights({ onNavigate }: Props) {
  const { token } = useAuth();
  const [data, setData] = useState<CandidateInsightsResponse>(empty);
  const [filters, setFilters] = useState({ speciality: '', qualification: '', state: '', search: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    if (!token) return;
    setLoading(true); setError('');
    try { setData(await fetchCandidateInsights(filters, token)); }
    catch (e: any) { setError(e?.message || 'Unable to load candidate insights'); }
    finally { setLoading(false); }
  };

  useEffect(() => { const timer = window.setTimeout(() => void load(), 250); return () => window.clearTimeout(timer); }, [token, filters.speciality, filters.qualification, filters.state, filters.search]);

  const topSpecialities = useMemo(() => Object.entries(data.specialityCounts || {}).sort((a,b)=>b[1]-a[1]).slice(0,8), [data.specialityCounts]);
  const specialities = Object.keys(data.specialityCounts || {}).sort();
  const qualifications = Object.keys(data.qualificationCounts || {}).sort();
  const states = Object.keys(data.stateCounts || {}).sort();

  return <div className="min-h-screen bg-slate-50"><div className="container mx-auto max-w-7xl px-4 py-7">
    <button className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-600" onClick={()=>onNavigate('dashboard/admin')}><ArrowLeft className="h-4 w-4"/>Admin Dashboard</button>
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-semibold text-blue-700">Candidate Intelligence</p><h1 className="text-3xl font-semibold text-slate-950">Medical Profile Segments</h1><p className="mt-1 text-sm text-slate-500">Filter candidate profiles by clinical speciality, qualification and geography.</p></div><button className="rounded-lg border bg-white px-3 py-2 text-sm font-medium" onClick={()=>void load()}><RefreshCw className={`mr-1 inline h-4 w-4 ${loading?'animate-spin':''}`}/>Refresh</button></div>

    <section className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4"><Metric icon={Users} label="Medical Profiles" value={data.totalProfiles}/><Metric icon={Search} label="Matching Filter" value={data.filteredProfiles}/><Metric icon={Stethoscope} label="Specialities" value={Object.keys(data.specialityCounts||{}).length}/><Metric icon={MapPin} label="States" value={Object.keys(data.stateCounts||{}).length}/></section>

    <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_320px]">
      <main className="space-y-5">
        <section className="rounded-2xl border bg-white p-5 shadow-sm"><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"><label><span className="label">Search</span><div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400"/><input className="control pl-9" value={filters.search} onChange={(e)=>setFilters({...filters,search:e.target.value})} placeholder="Name, email, city…"/></div></label><Filter label="Speciality" value={filters.speciality} options={specialities} onChange={(speciality)=>setFilters({...filters,speciality})}/><Filter label="Qualification" value={filters.qualification} options={qualifications} onChange={(qualification)=>setFilters({...filters,qualification})}/><Filter label="State" value={filters.state} options={states} onChange={(state)=>setFilters({...filters,state})}/></div>{Object.values(filters).some(Boolean)&&<button className="mt-3 text-sm font-semibold text-blue-700" onClick={()=>setFilters({speciality:'',qualification:'',state:'',search:''})}>Clear filters</button>}</section>

        {error?<div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700">{error}</div>:<section className="overflow-hidden rounded-2xl border bg-white shadow-sm"><div className="border-b px-5 py-4"><h2 className="font-semibold">Candidate Profiles</h2><p className="text-xs text-slate-500">{data.filteredProfiles} profile{data.filteredProfiles===1?'':'s'} match the current segment.</p></div>{loading?<div className="p-12 text-center text-slate-500">Loading profiles…</div>:data.profiles.length?<div className="divide-y">{data.profiles.map((profile)=><article key={profile.candidateId} className="grid gap-4 p-5 md:grid-cols-[1.2fr_1fr_1fr_auto] md:items-center"><div><h3 className="font-semibold text-slate-900">{profile.name||'Candidate'}</h3><p className="text-sm text-slate-500">{profile.email}</p></div><div><span className="mini">Speciality</span><strong className="block text-sm">{profile.speciality||'Not provided'}</strong><span className="text-xs text-slate-500">{profile.subSpeciality||''}</span></div><div><span className="mini">Qualification / Experience</span><strong className="block text-sm">{profile.qualification||'Not provided'}</strong><span className="text-xs text-slate-500">{profile.yearsExperience!=null?`${profile.yearsExperience} years`:'Experience not provided'}</span></div><div className="text-sm text-slate-600"><MapPin className="mr-1 inline h-4 w-4"/>{[profile.currentCity,profile.state].filter(Boolean).join(', ')||'Location missing'}</div></article>)}</div>:<div className="p-12 text-center text-slate-500">No candidate profiles match this segment.</div>}</section>}
      </main>

      <aside className="space-y-4"><section className="rounded-2xl border bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-blue-600"/><h2 className="font-semibold">Top Specialities</h2></div><div className="mt-4 space-y-3">{topSpecialities.length?topSpecialities.map(([name,count])=><button key={name} className="flex w-full items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-left hover:bg-blue-50" onClick={()=>setFilters({...filters,speciality:name})}><span className="text-sm font-medium text-slate-700">{name}</span><strong className="rounded-full bg-blue-100 px-2 py-0.5 text-sm text-blue-700">{count}</strong></button>):<p className="text-sm text-slate-500">Profiles will appear after candidates complete their medical profile.</p>}</div></section><section className="rounded-2xl border border-violet-100 bg-violet-50 p-5"><GraduationCap className="h-5 w-5 text-violet-600"/><h3 className="mt-2 font-semibold text-violet-950">Structured, permissioned data</h3><p className="mt-2 text-sm leading-6 text-violet-900">Use these filters for legitimate recruiting, workforce planning and matching. Candidate contact details remain inside authenticated Admin access.</p></section></aside>
    </div>
  </div><style>{`.label{display:block;margin-bottom:6px;font-size:12px;font-weight:600;color:#475569}.control{height:40px;width:100%;border:1px solid #dbe2ea;border-radius:8px;background:white;padding-right:12px;font-size:14px}.mini{display:block;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;margin-bottom:2px}`}</style></div>;
}

function Metric({icon:Icon,label,value}:{icon:any;label:string;value:number}){return <div className="rounded-xl border bg-white p-4 shadow-sm"><Icon className="h-5 w-5 text-blue-600"/><strong className="mt-3 block text-2xl text-slate-950">{value}</strong><span className="text-xs font-medium text-slate-500">{label}</span></div>}
function Filter({label,value,options,onChange}:{label:string;value:string;options:string[];onChange:(value:string)=>void}){return <label><span className="label">{label}</span><select className="control px-3" value={value} onChange={(e)=>onChange(e.target.value)}><option value="">All {label}s</option>{options.map((option)=><option key={option} value={option}>{option}</option>)}</select></label>}
