import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Building2,
  CalendarDays,
  ExternalLink,
  GraduationCap,
  IndianRupee,
  Layers3,
  Loader2,
  MapPin,
  Search,
  ShieldCheck,
  Stethoscope,
  Users,
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import { fetchPublishedRecruitment, Recruitment, VacancyRecord } from '../api/recruitments';

export function RecruitmentPage() {
  const { recruitmentId } = useParams<{ recruitmentId: string }>();
  const navigate = useNavigate();
  const [recruitment, setRecruitment] = useState<Recruitment | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [post, setPost] = useState('');
  const [department, setDepartment] = useState('');

  useEffect(() => {
    if (!recruitmentId) return;
    setLoading(true);
    fetchPublishedRecruitment(recruitmentId)
      .then(setRecruitment)
      .catch(() => setRecruitment(null))
      .finally(() => setLoading(false));
  }, [recruitmentId]);

  const postGroups = useMemo(() => {
    const groups = new Map<string, VacancyRecord[]>();
    for (const vacancy of recruitment?.vacancies || []) {
      const rows = groups.get(vacancy.postName) || [];
      rows.push(vacancy);
      groups.set(vacancy.postName, rows);
    }
    return [...groups.entries()].map(([name, vacancies]) => ({
      name,
      vacancies,
      total: vacancies.reduce((sum, vacancy) => sum + Number(vacancy.numberOfVacancies || 0), 0),
      departments: [...new Set(vacancies.map((vacancy) => vacancy.department || vacancy.speciality).filter(Boolean) as string[])],
    }));
  }, [recruitment]);

  const departments = useMemo(
    () => [...new Set((recruitment?.vacancies || []).map((v) => v.department || v.speciality).filter(Boolean) as string[])].sort(),
    [recruitment],
  );

  const rows = useMemo(() => {
    if (!recruitment) return [];
    const q = query.trim().toLowerCase();
    return recruitment.vacancies.filter((v) => {
      if (post && v.postName !== post) return false;
      if (department && v.department !== department && v.speciality !== department) return false;
      if (!q) return true;
      return [
        v.postName, v.department, v.speciality, v.subSpeciality, v.category,
        v.qualification, v.experience, v.ageLimit, v.salary, v.payLevel,
        v.payScale, v.jobType, v.location, v.otherEligibilityRequirements,
      ].filter(Boolean).some((value) => String(value).toLowerCase().includes(q));
    });
  }, [recruitment, query, post, department]);

  if (loading) {
    return <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3"><Loader2 className="h-9 w-9 animate-spin text-blue-600" /><p className="text-slate-500">Loading recruitment vacancies…</p></div>;
  }
  if (!recruitment) {
    return <div className="container mx-auto px-4 py-16 text-center"><h1 className="text-2xl font-semibold">Recruitment not found</h1><Button className="mt-4" onClick={() => navigate('/jobs')}>Browse Jobs</Button></div>;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <section className="border-b bg-white">
        <div className="container mx-auto max-w-7xl px-4 py-7">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge className={recruitment.sector === 'government' ? 'bg-blue-50 text-blue-700 hover:bg-blue-50' : 'bg-violet-50 text-violet-700 hover:bg-violet-50'}>
              {recruitment.sector === 'government' ? 'Government' : 'Private'}
            </Badge>
            {recruitment.officialSourceVerified && <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50"><ShieldCheck className="mr-1 h-3.5 w-3.5" />Official Source</Badge>}
          </div>

          <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-start">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700"><Building2 className="h-4 w-4 text-blue-600" />{recruitment.organisationName}</div>
              <h1 className="mt-2 max-w-4xl text-3xl font-bold leading-tight text-slate-950">{recruitment.title}</h1>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600">
                {recruitment.location && <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" />{recruitment.location}</span>}
                {recruitment.advertisementNumber && <span>Advertisement No. {recruitment.advertisementNumber}</span>}
                {recruitment.applicationLastDate && <span className="flex items-center gap-1.5 font-medium text-rose-600"><CalendarDays className="h-4 w-4" />Apply by {formatDate(recruitment.applicationLastDate)}</span>}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {recruitment.officialNotificationUrl && <Button variant="outline" onClick={() => openExternal(recruitment.officialNotificationUrl)}>Official Notification <ExternalLink className="ml-2 h-4 w-4" /></Button>}
              {recruitment.officialApplicationUrl && <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => openExternal(recruitment.officialApplicationUrl)}>Apply on Official Website <ExternalLink className="ml-2 h-4 w-4" /></Button>}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Summary icon={Users} value={recruitment.totalVacancies} label="Total Vacancies" />
            <Summary icon={Stethoscope} value={postGroups.length} label="Post Groups" />
            <Summary icon={Layers3} value={departments.length} label="Departments" />
            <Summary icon={CalendarDays} value={recruitment.applicationLastDate ? formatDate(recruitment.applicationLastDate) : 'See notice'} label="Last Date" />
          </div>
        </div>
      </section>

      <div className="container mx-auto max-w-7xl px-4 py-7">
        {postGroups.length > 1 && (
          <Card className="mb-6 p-5">
            <div className="mb-4"><h2 className="text-xl font-bold text-slate-950">Job Groups</h2><p className="text-sm text-slate-500">One official recruitment, organised by post type instead of duplicate listing cards.</p></div>
            <div className="grid gap-3 md:grid-cols-2">
              {postGroups.map((group) => (
                <button key={group.name} type="button" onClick={() => { setPost(group.name); setDepartment(''); }} className="rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-blue-300 hover:bg-blue-50/30">
                  <div className="flex items-center justify-between gap-3"><span className="font-bold text-slate-900">{group.name}</span><span className="font-bold text-blue-700">{group.total} vacancies</span></div>
                  <p className="mt-2 text-sm text-slate-500">{group.departments.length ? `${group.departments.slice(0, 4).join(' · ')}${group.departments.length > 4 ? ` · +${group.departments.length - 4} more` : ''}` : 'Department details in vacancy rows'}</p>
                </button>
              ))}
            </div>
          </Card>
        )}

        {(recruitment.applicationFee || recruitment.selectionProcess || recruitment.importantInstructions) && (
          <div className="mb-6 grid gap-4 md:grid-cols-3">
            {recruitment.applicationFee && <InfoCard title="Application Fee" text={recruitment.applicationFee} />}
            {recruitment.selectionProcess && <InfoCard title="Selection Process" text={recruitment.selectionProcess} />}
            {recruitment.importantInstructions && <InfoCard title="Important Instructions" text={recruitment.importantInstructions} />}
          </div>
        )}

        <Card className="mb-6 p-5">
          <div className="mb-4"><h2 className="text-xl font-bold text-slate-950">Find Your Department</h2><p className="text-sm text-slate-500">Search inside this recruitment by post, department, speciality or qualification.</p></div>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input className="h-10 w-full rounded-md border pl-9 pr-3" placeholder="e.g. General Surgery" value={query} onChange={(e) => setQuery(e.target.value)} /></div>
            <SelectFilter value={post} onChange={setPost} options={postGroups.map((group) => group.name)} placeholder="All Posts" />
            <SelectFilter value={department} onChange={setDepartment} options={departments} placeholder="All Departments" />
          </div>
          {(post || department || query) && <button type="button" className="mt-3 text-sm font-semibold text-blue-700" onClick={() => { setPost(''); setDepartment(''); setQuery(''); }}>Clear vacancy filters</button>}
        </Card>

        <div className="mb-3 flex items-end justify-between gap-3"><div><h2 className="text-xl font-bold text-slate-950">Department-wise Vacancies</h2><p className="text-sm text-slate-500">{rows.length} matching vacancy record{rows.length === 1 ? '' : 's'}</p></div></div>
        <div className="grid gap-4">
          {rows.map((vacancy) => <VacancyCard key={vacancy.id} vacancy={vacancy} onView={() => vacancy.publishedJobId && navigate(`/job-detail/${vacancy.publishedJobId}`)} />)}
          {!rows.length && <Card className="p-10 text-center text-slate-500">No vacancy rows match these filters.</Card>}
        </div>
      </div>
    </div>
  );
}

function VacancyCard({ vacancy, onView }: { vacancy: VacancyRecord; onView: () => void }) {
  return (
    <Card className="p-5">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2"><h3 className="text-lg font-bold text-slate-950">{vacancy.postName}{vacancy.department ? ` – ${vacancy.department}` : vacancy.speciality ? ` – ${vacancy.speciality}` : ''}</h3><Badge variant="outline">{vacancy.numberOfVacancies} Vacanc{vacancy.numberOfVacancies === 1 ? 'y' : 'ies'}</Badge></div>
          <div className="mt-2 flex flex-wrap gap-2 text-sm text-slate-600">
            {vacancy.speciality && <span>Speciality: <strong>{vacancy.speciality}</strong></span>}
            {vacancy.location && <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{vacancy.location}</span>}
            {vacancy.jobType && <span>{vacancy.jobType}</span>}
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {vacancy.qualification && <Detail icon={GraduationCap} label="Qualification" value={vacancy.qualification} />}
            {vacancy.experience && <Detail icon={Stethoscope} label="Experience" value={vacancy.experience} />}
            {(vacancy.salary || vacancy.payScale || vacancy.payLevel) && <Detail icon={IndianRupee} label="Salary / Pay" value={vacancy.salary || vacancy.payScale || vacancy.payLevel || ''} />}
            {vacancy.ageLimit && <Detail icon={Users} label="Age Limit" value={vacancy.ageLimit} />}
          </div>
          {vacancy.otherEligibilityRequirements && <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700"><strong>Other eligibility:</strong> {vacancy.otherEligibilityRequirements}</div>}
        </div>
        {vacancy.publishedJobId && <Button variant="outline" onClick={onView}>View Vacancy Details <ExternalLink className="ml-2 h-4 w-4" /></Button>}
      </div>
    </Card>
  );
}

function Summary({ icon: Icon, value, label }: { icon: any; value: string | number; label: string }) {
  return <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><Icon className="mb-2 h-5 w-5 text-blue-600" /><div className="text-xl font-bold text-slate-950">{value}</div><div className="text-xs font-medium text-slate-500">{label}</div></div>;
}

function Detail({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return <div className="rounded-lg border border-slate-200 bg-white p-3"><div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500"><Icon className="h-3.5 w-3.5 text-blue-600" />{label}</div><p className="text-sm font-medium text-slate-800">{value}</p></div>;
}

function InfoCard({ title, text }: { title: string; text: string }) {
  return <Card className="p-4"><h3 className="mb-1 font-bold text-slate-900">{title}</h3><p className="whitespace-pre-wrap text-sm text-slate-600">{text}</p></Card>;
}

function SelectFilter({ value, onChange, options, placeholder }: { value: string; onChange: (value: string) => void; options: string[]; placeholder: string }) {
  return <select className="h-10 w-full rounded-md border bg-white px-3" value={value} onChange={(e) => onChange(e.target.value)}><option value="">{placeholder}</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select>;
}

function formatDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  if (year && month && day) return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  return value;
}

function openExternal(url?: string) {
  if (url) window.open(url, '_blank', 'noopener,noreferrer');
}
