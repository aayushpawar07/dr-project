import { useEffect, useState } from 'react';
import { ArrowLeft, Building2, CheckCircle2, GraduationCap, MapPin, Save, ShieldCheck, Stethoscope, User } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { fetchEmployer, EmployerResponse } from '../api/employers';
import { CandidateProfileData, fetchMyCandidateProfile, updateMyCandidateProfile } from '../api/candidateProfiles';

interface ProfilePageProps { onNavigate: (page: string) => void; }
const INDIAN_STATES = ['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Delhi','Goa','Gujarat','Haryana','Himachal Pradesh','Jammu and Kashmir','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Tamil Nadu','Telangana','Uttar Pradesh','Uttarakhand','West Bengal'];
const SPECIALITIES = ['Anaesthesiology','Cardiology','Critical Care','Dermatology','Emergency Medicine','ENT','General Medicine','General Surgery','Obstetrics & Gynaecology','Orthopaedics','Paediatrics','Psychiatry','Radiodiagnosis','Pulmonary Medicine','Public Health','Pathology','Microbiology','Other'];

function initials(value?: string) { return (value || 'U').trim().split(/\s+/).slice(0,2).map((part)=>part[0]?.toUpperCase()).join('') || 'U'; }

export function ProfilePage({ onNavigate }: ProfilePageProps) {
  const { user, token } = useAuth();
  const [employer, setEmployer] = useState<EmployerResponse | null>(null);
  const [candidate, setCandidate] = useState<CandidateProfileData>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!user || !token) return;
      setLoading(true);
      try {
        if (user.role === 'employer') {
          const data = await fetchEmployer(user.id, token);
          if (active) setEmployer(data);
        } else if (user.role === 'candidate') {
          const data = await fetchMyCandidateProfile(token);
          if (active) setCandidate(data);
        }
      } catch (error) { console.error('Profile load failed', error); }
      finally { if (active) setLoading(false); }
    };
    void load();
    return () => { active = false; };
  }, [user?.id, user?.role, token]);

  if (!user) return null;
  const isEmployer = user.role === 'employer';
  const isCandidate = user.role === 'candidate';
  const displayName = isEmployer ? employer?.companyName || user.name : user.name;

  const saveCandidate = async () => {
    if (!token) return;
    setSaving(true);
    try {
      const saved = await updateMyCandidateProfile(candidate, token);
      setCandidate(saved);
      toast.success('Medical profile saved');
    } catch (error: any) { toast.error(error?.message || 'Unable to save profile'); }
    finally { setSaving(false); }
  };

  return <div className="min-h-screen bg-slate-50"><div className="container mx-auto max-w-6xl px-4 py-8">
    <button className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-blue-700" onClick={()=>onNavigate('dashboard')}><ArrowLeft className="h-4 w-4"/>Back to Dashboard</button>
    <section className="mb-6 rounded-2xl border bg-white p-6 shadow-sm"><div className="flex flex-col gap-4 sm:flex-row sm:items-center"><div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-xl font-bold text-white">{initials(displayName)}</div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-semibold text-slate-950">{displayName}</h1>{isEmployer&&employer?.verificationStatus==='approved'&&<span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5"/>Verified Employer</span>}{isCandidate&&candidate.profileComplete&&<span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700"><CheckCircle2 className="h-3.5 w-3.5"/>Medical Profile Complete</span>}</div><p className="mt-1 text-sm text-slate-500">{user.email}</p></div></div></section>

    {loading?<div className="rounded-2xl border bg-white p-10 text-center text-slate-500">Loading profile…</div>:isCandidate?<div className="grid gap-5 lg:grid-cols-[1fr_320px]">
      <main className="space-y-5">
        <ProfileSection icon={Stethoscope} title="Clinical Profile" subtitle="Structured fields make your profile searchable by speciality and role."><div className="grid gap-4 md:grid-cols-2"><Field label="Primary Speciality"><select className="input" value={candidate.speciality||''} onChange={(e)=>setCandidate({...candidate,speciality:e.target.value})}><option value="">Select speciality</option>{SPECIALITIES.map((s)=><option key={s}>{s}</option>)}</select></Field><Field label="Sub-speciality"><input className="input" value={candidate.subSpeciality||''} onChange={(e)=>setCandidate({...candidate,subSpeciality:e.target.value})} placeholder="e.g. GI Surgery"/></Field><Field label="Highest Qualification"><input className="input" value={candidate.qualification||''} onChange={(e)=>setCandidate({...candidate,qualification:e.target.value})} placeholder="e.g. MS General Surgery"/></Field><Field label="Years of Experience"><input className="input" type="number" min="0" max="80" value={candidate.yearsExperience??''} onChange={(e)=>setCandidate({...candidate,yearsExperience:e.target.value?Number(e.target.value):null})}/></Field></div></ProfileSection>
        <ProfileSection icon={ShieldCheck} title="Professional Registration" subtitle="Helps employers verify professional context before shortlisting."><div className="grid gap-4 md:grid-cols-2"><Field label="Registration Council"><input className="input" value={candidate.registrationCouncil||''} onChange={(e)=>setCandidate({...candidate,registrationCouncil:e.target.value})} placeholder="e.g. Delhi Medical Council"/></Field><Field label="Registration Number"><input className="input" value={candidate.registrationNumber||''} onChange={(e)=>setCandidate({...candidate,registrationNumber:e.target.value})}/></Field></div></ProfileSection>
        <ProfileSection icon={MapPin} title="Location & Preference" subtitle="Used for location-based candidate segmentation and relevant opportunities."><div className="grid gap-4 md:grid-cols-2"><Field label="Current City"><input className="input" value={candidate.currentCity||''} onChange={(e)=>setCandidate({...candidate,currentCity:e.target.value})}/></Field><Field label="State"><select className="input" value={candidate.state||''} onChange={(e)=>setCandidate({...candidate,state:e.target.value})}><option value="">Select state</option>{INDIAN_STATES.map((s)=><option key={s}>{s}</option>)}</select></Field><Field label="Preferred Location"><input className="input" value={candidate.preferredLocation||''} onChange={(e)=>setCandidate({...candidate,preferredLocation:e.target.value})} placeholder="City / State / Anywhere"/></Field><Field label="Employment Preference"><select className="input" value={candidate.employmentPreference||''} onChange={(e)=>setCandidate({...candidate,employmentPreference:e.target.value})}><option value="">Select preference</option><option>Full Time</option><option>Part Time</option><option>Contract</option><option>Locum</option><option>Any</option></select></Field></div></ProfileSection>
        <ProfileSection icon={GraduationCap} title="Professional Summary" subtitle="A short employer-facing summary."><textarea className="input min-h-28 resize-y py-3" value={candidate.profileSummary||''} onChange={(e)=>setCandidate({...candidate,profileSummary:e.target.value})} placeholder="Clinical focus, key procedures, work setting and strengths…"/></ProfileSection>
        <button disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 font-semibold text-white hover:bg-blue-700 disabled:opacity-50" onClick={()=>void saveCandidate()}><Save className="h-4 w-4"/>{saving?'Saving…':'Save Medical Profile'}</button>
      </main>
      <aside className="space-y-4"><div className="rounded-2xl border border-blue-100 bg-blue-50 p-5"><h3 className="font-semibold text-blue-950">Why complete this?</h3><ul className="mt-3 space-y-2 text-sm text-blue-900"><li>• Employers see useful clinical context.</li><li>• Admin can filter candidates by speciality, qualification and state.</li><li>• Future job matching can use structured profile data.</li></ul></div><div className="rounded-2xl border bg-white p-5 shadow-sm"><h3 className="font-semibold">Account</h3><div className="mt-3 space-y-3 text-sm"><Info label="Name" value={user.name}/><Info label="Email" value={user.email}/><Info label="Phone" value={user.phone}/></div></div></aside>
    </div>:isEmployer?<div className="grid gap-5 md:grid-cols-2"><ProfileSection icon={Building2} title="Company Details" subtitle="Employer identity and business details."><div className="space-y-3 text-sm"><Info label="Company" value={employer?.companyName}/><Info label="Type" value={employer?.companyType}/><Info label="Website" value={employer?.website}/><Info label="Email" value={employer?.userEmail}/></div></ProfileSection><ProfileSection icon={MapPin} title="Location & Verification" subtitle="Current company location and approval status."><div className="space-y-3 text-sm"><Info label="Address" value={employer?.address}/><Info label="City / State" value={[employer?.city,employer?.state].filter(Boolean).join(', ')}/><Info label="Verification" value={employer?.verificationStatus}/></div></ProfileSection></div>:<div className="rounded-2xl border bg-white p-6"><h2 className="font-semibold">Account Details</h2><div className="mt-4 grid gap-3 sm:grid-cols-2"><Info label="Name" value={user.name}/><Info label="Email" value={user.email}/><Info label="Phone" value={user.phone}/><Info label="Role" value={user.role}/></div></div>}
  </div><style>{`.input{width:100%;height:42px;border:1px solid #dbe2ea;border-radius:8px;background:white;padding:0 12px;font-size:14px;outline:none}.input:focus{border-color:#60a5fa;box-shadow:0 0 0 3px #dbeafe}`}</style></div>;
}

function ProfileSection({icon:Icon,title,subtitle,children}:{icon:any;title:string;subtitle:string;children:any}){return <section className="rounded-2xl border bg-white p-5 shadow-sm"><div className="mb-5 flex items-start gap-3"><div className="rounded-xl bg-blue-50 p-2 text-blue-600"><Icon className="h-5 w-5"/></div><div><h2 className="font-semibold text-slate-950">{title}</h2><p className="mt-0.5 text-xs text-slate-500">{subtitle}</p></div></div>{children}</section>}
function Field({label,children}:{label:string;children:any}){return <label className="block"><span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>{children}</label>}
function Info({label,value}:{label:string;value?:string|null}){return <div><span className="block text-xs font-medium uppercase tracking-wide text-slate-400">{label}</span><strong className="mt-0.5 block font-medium text-slate-800">{value||'Not provided'}</strong></div>}
