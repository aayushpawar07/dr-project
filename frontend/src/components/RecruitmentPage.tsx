import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  FileText,
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
  const [activePost, setActivePost] = useState('');
  const [selectedVacancyId, setSelectedVacancyId] = useState('');

  useEffect(() => {
    if (!recruitmentId) return;
    setLoading(true);
    fetchPublishedRecruitment(recruitmentId)
      .then((data) => {
        setRecruitment(data);
        setActivePost(data.vacancies?.[0]?.postName || '');
        setSelectedVacancyId(data.vacancies?.[0]?.id || '');
      })
      .catch(() => setRecruitment(null))
      .finally(() => setLoading(false));
  }, [recruitmentId]);

  const postGroups = useMemo(() => {
    const groups = new Map<string, VacancyRecord[]>();
    for (const vacancy of recruitment?.vacancies || []) {
      const items = groups.get(vacancy.postName) || [];
      items.push(vacancy);
      groups.set(vacancy.postName, items);
    }
    return [...groups.entries()].map(([name, vacancies]) => ({
      name,
      vacancies,
      total: vacancies.reduce((sum, vacancy) => sum + Number(vacancy.numberOfVacancies || 0), 0),
      departmentCount: new Set(vacancies.map((vacancy) => vacancy.department || vacancy.speciality).filter(Boolean)).size,
    }));
  }, [recruitment]);

  const visibleVacancies = useMemo(() => {
    if (!recruitment) return [];
    const q = query.trim().toLowerCase();
    return recruitment.vacancies.filter((vacancy) => {
      if (activePost && vacancy.postName !== activePost) return false;
      if (!q) return true;
      return [
        vacancy.department,
        vacancy.speciality,
        vacancy.subSpeciality,
        vacancy.qualification,
        vacancy.location,
        vacancy.category,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    });
  }, [recruitment, activePost, query]);

  useEffect(() => {
    if (!visibleVacancies.length) {
      setSelectedVacancyId('');
      return;
    }
    if (!visibleVacancies.some((vacancy) => vacancy.id === selectedVacancyId)) {
      setSelectedVacancyId(visibleVacancies[0].id);
    }
  }, [visibleVacancies, selectedVacancyId]);

  const selectedVacancy = useMemo(
    () => visibleVacancies.find((vacancy) => vacancy.id === selectedVacancyId) || visibleVacancies[0] || null,
    [visibleVacancies, selectedVacancyId],
  );

  const departments = useMemo(
    () => new Set((recruitment?.vacancies || []).map((vacancy) => vacancy.department || vacancy.speciality).filter(Boolean)).size,
    [recruitment],
  );

  if (loading) {
    return (
      <div className="flex min-h-[65vh] flex-col items-center justify-center gap-4 bg-slate-50">
        <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
        <div className="text-center">
          <p className="font-semibold text-slate-800">Loading recruitment</p>
          <p className="text-sm text-slate-500">Preparing department-wise vacancies…</p>
        </div>
      </div>
    );
  }

  if (!recruitment) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold">Recruitment not found</h1>
        <Button className="mt-4" onClick={() => navigate('/jobs')}>Browse Jobs</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f7fb]">
      <section className="border-b border-slate-200 bg-white">
        <div className="container mx-auto max-w-7xl px-4 py-6 md:py-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_310px] lg:items-start">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={recruitment.sector === 'government'
                  ? 'border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-50'
                  : 'border border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-50'}>
                  {recruitment.sector === 'government' ? 'Government' : 'Private'}
                </Badge>
                {recruitment.officialSourceVerified && (
                  <Badge className="border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                    <ShieldCheck className="mr-1 h-3.5 w-3.5" />Official Source
                  </Badge>
                )}
              </div>

              <div className="mt-4 flex gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-xl font-bold text-blue-700">
                  {initials(recruitment.organisationName)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <Building2 className="h-4 w-4 text-blue-600" />
                    <span className="truncate">{recruitment.organisationName}</span>
                  </div>
                  <h1 className="mt-1 text-2xl font-bold leading-tight text-slate-950 md:text-3xl">{recruitment.title}</h1>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-600">
                    {recruitment.location && <Meta icon={MapPin}>{recruitment.location}</Meta>}
                    {recruitment.advertisementNumber && <Meta icon={FileText}>Advt. No. {recruitment.advertisementNumber}</Meta>}
                    {recruitment.applicationLastDate && (
                      <Meta icon={CalendarDays} className="font-semibold text-rose-600">Apply by {formatDate(recruitment.applicationLastDate)}</Meta>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Metric icon={Users} value={recruitment.totalVacancies} label="Total Vacancies" />
                <Metric icon={BriefcaseBusiness} value={postGroups.length} label="Post Groups" />
                <Metric icon={Layers3} value={departments} label="Departments" />
                <Metric icon={CalendarDays} value={recruitment.applicationLastDate ? formatDate(recruitment.applicationLastDate) : 'See notice'} label="Last Date" />
              </div>
            </div>

            <Card className="border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm font-bold text-slate-950">Official actions</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">Always complete the final application through the official source.</p>
              <div className="mt-4 space-y-2">
                {recruitment.officialApplicationUrl && (
                  <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={() => openExternal(recruitment.officialApplicationUrl)}>
                    Apply on Official Website <ExternalLink className="ml-2 h-4 w-4" />
                  </Button>
                )}
                {recruitment.officialNotificationUrl && (
                  <Button className="w-full" variant="outline" onClick={() => openExternal(recruitment.officialNotificationUrl)}>
                    Official Notification <FileText className="ml-2 h-4 w-4" />
                  </Button>
                )}
                {recruitment.officialWebsite && (
                  <Button className="w-full" variant="ghost" onClick={() => openExternal(recruitment.officialWebsite)}>
                    Organisation Website <ExternalLink className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </div>
            </Card>
          </div>
        </div>
      </section>

      <div className="container mx-auto max-w-7xl px-4 py-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_330px]">
          <main className="min-w-0 space-y-5">
            <Card className="overflow-hidden border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="text-lg font-bold text-slate-950">Choose a post</h2>
                <p className="mt-1 text-sm text-slate-500">One notification can contain several post groups and departments.</p>
              </div>
              <div className="grid gap-2 p-3 sm:grid-cols-2 xl:grid-cols-3">
                {postGroups.map((group) => {
                  const active = group.name === activePost;
                  return (
                    <button
                      key={group.name}
                      type="button"
                      onClick={() => { setActivePost(group.name); setQuery(''); }}
                      className={`rounded-xl border p-4 text-left transition ${active
                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-100'
                        : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/40'}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-bold text-slate-950">{group.name}</p>
                          <p className="mt-1 text-sm text-slate-500">{group.departmentCount} department{group.departmentCount === 1 ? '' : 's'}</p>
                        </div>
                        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-blue-700 shadow-sm">{group.total}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </Card>

            <Card className="overflow-hidden border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-slate-950">Find your department</h2>
                    <p className="mt-1 text-sm text-slate-500">Select a department to instantly view its eligibility and vacancy details.</p>
                  </div>
                  <Badge className="w-fit bg-blue-50 text-blue-700 hover:bg-blue-50">{visibleVacancies.length} results</Badge>
                </div>
                <div className="relative mt-4">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search General Surgery, Radiology, Anaesthesiology…"
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div className="grid min-h-[470px] md:grid-cols-[280px_minmax(0,1fr)]">
                <div className="border-b border-slate-100 bg-slate-50/70 p-3 md:border-b-0 md:border-r">
                  <div className="max-h-[560px] space-y-2 overflow-y-auto pr-1">
                    {visibleVacancies.map((vacancy) => {
                      const active = vacancy.id === selectedVacancy?.id;
                      return (
                        <button
                          key={vacancy.id}
                          type="button"
                          onClick={() => setSelectedVacancyId(vacancy.id)}
                          className={`w-full rounded-xl border p-3 text-left transition ${active
                            ? 'border-blue-400 bg-white shadow-sm ring-2 ring-blue-100'
                            : 'border-transparent bg-transparent hover:border-slate-200 hover:bg-white'}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-slate-900">{vacancy.department || vacancy.speciality || vacancy.postName}</p>
                              <p className="mt-1 truncate text-xs text-slate-500">{vacancy.speciality || vacancy.postName}</p>
                            </div>
                            <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-bold ${active ? 'bg-blue-600 text-white' : 'bg-white text-blue-700'}`}>
                              {vacancy.numberOfVacancies}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                    {!visibleVacancies.length && <p className="p-5 text-center text-sm text-slate-500">No departments match your search.</p>}
                  </div>
                </div>

                <div className="min-w-0 p-5">
                  {selectedVacancy ? (
                    <VacancyDetail
                      vacancy={selectedVacancy}
                      recruitment={recruitment}
                      onViewJob={() => selectedVacancy.publishedJobId && navigate(`/job-detail/${selectedVacancy.publishedJobId}`)}
                    />
                  ) : (
                    <div className="flex h-full min-h-[360px] items-center justify-center text-center text-slate-500">
                      Select a department to view its details.
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </main>

          <aside className="space-y-4">
            <Card className="border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-20">
              <h3 className="font-bold text-slate-950">Recruitment overview</h3>
              <div className="mt-4 space-y-3">
                <Overview icon={Users} label="Total vacancies" value={String(recruitment.totalVacancies)} />
                <Overview icon={Layers3} label="Departments" value={String(departments)} />
                <Overview icon={BriefcaseBusiness} label="Post groups" value={String(postGroups.length)} />
                {recruitment.applicationStartDate && <Overview icon={CalendarDays} label="Application starts" value={formatDate(recruitment.applicationStartDate)} />}
                {recruitment.applicationLastDate && <Overview icon={CalendarDays} label="Last date" value={formatDate(recruitment.applicationLastDate)} />}
              </div>

              {(recruitment.applicationFee || recruitment.selectionProcess || recruitment.importantInstructions) && <div className="my-5 border-t border-slate-100" />}

              {recruitment.applicationFee && <MiniSection title="Application Fee" value={recruitment.applicationFee} />}
              {recruitment.selectionProcess && <MiniSection title="Selection Process" value={recruitment.selectionProcess} />}
              {recruitment.importantInstructions && <MiniSection title="Important Instructions" value={recruitment.importantInstructions} />}
            </Card>
          </aside>
        </div>
      </div>
    </div>
  );
}

function VacancyDetail({ vacancy, recruitment, onViewJob }: { vacancy: VacancyRecord; recruitment: Recruitment; onViewJob: () => void }) {
  const heading = vacancy.department || vacancy.speciality || vacancy.postName;
  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-50">{vacancy.postName}</Badge>
            <Badge variant="outline">{vacancy.numberOfVacancies} Vacanc{vacancy.numberOfVacancies === 1 ? 'y' : 'ies'}</Badge>
          </div>
          <h2 className="mt-3 text-2xl font-bold text-slate-950">{heading}</h2>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-600">
            {vacancy.speciality && vacancy.speciality !== heading && <span>Speciality: <strong>{vacancy.speciality}</strong></span>}
            {vacancy.location && <Meta icon={MapPin}>{vacancy.location}</Meta>}
            {vacancy.jobType && <span className="font-medium text-slate-700">{vacancy.jobType}</span>}
          </div>
        </div>
        {vacancy.publishedJobId && (
          <Button variant="outline" onClick={onViewJob}>Open Job Page <ExternalLink className="ml-2 h-4 w-4" /></Button>
        )}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <DetailCard icon={GraduationCap} title="Qualification" value={vacancy.qualification || 'See official notification'} />
        <DetailCard icon={Stethoscope} title="Experience" value={vacancy.experience || 'As per recruitment rules'} />
        <DetailCard icon={IndianRupee} title="Salary / Pay" value={vacancy.salary || vacancy.payScale || vacancy.payLevel || 'As per notification'} />
        <DetailCard icon={Users} title="Age Limit" value={vacancy.ageLimit || 'As per recruitment rules'} />
      </div>

      {vacancy.otherEligibilityRequirements && (
        <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50/60 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-amber-700">Other eligibility</p>
          <p className="mt-1 text-sm leading-6 text-slate-700">{vacancy.otherEligibilityRequirements}</p>
        </div>
      )}

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-bold text-slate-900">Selection process</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">{recruitment.selectionProcess || 'Refer to the official notification for the selection process.'}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-bold text-slate-900">Important dates</p>
          <div className="mt-2 space-y-2 text-sm text-slate-600">
            <div className="flex justify-between gap-3"><span>Start date</span><strong className="text-slate-800">{recruitment.applicationStartDate ? formatDate(recruitment.applicationStartDate) : 'Not mentioned'}</strong></div>
            <div className="flex justify-between gap-3"><span>Last date</span><strong className="text-rose-600">{recruitment.applicationLastDate ? formatDate(recruitment.applicationLastDate) : 'See notice'}</strong></div>
          </div>
        </div>
      </div>

      {recruitment.officialApplicationUrl && (
        <Button className="mt-5 w-full bg-blue-600 py-5 text-base hover:bg-blue-700" onClick={() => openExternal(recruitment.officialApplicationUrl)}>
          Apply for {heading} <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

function Metric({ icon: Icon, value, label }: { icon: any; value: string | number; label: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <Icon className="h-4 w-4 text-blue-600" />
      <div className="mt-2 text-lg font-bold text-slate-950">{value}</div>
      <div className="text-xs font-medium text-slate-500">{label}</div>
    </div>
  );
}

function DetailCard({ icon: Icon, title, value }: { icon: any; title: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
        <div className="rounded-lg bg-blue-50 p-1.5"><Icon className="h-4 w-4 text-blue-600" /></div>
        {title}
      </div>
      <p className="mt-3 text-sm font-semibold leading-6 text-slate-800">{value}</p>
    </div>
  );
}

function Overview({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-3">
      <div className="rounded-lg bg-white p-2"><Icon className="h-4 w-4 text-blue-600" /></div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="truncate text-sm font-bold text-slate-900">{value}</p>
      </div>
    </div>
  );
}

function MiniSection({ title, value }: { title: string; value: string }) {
  return (
    <div className="mb-4 last:mb-0">
      <div className="flex items-center gap-2 text-sm font-bold text-slate-900"><CheckCircle2 className="h-4 w-4 text-emerald-600" />{title}</div>
      <p className="mt-2 text-sm leading-6 text-slate-600">{value}</p>
    </div>
  );
}

function Meta({ icon: Icon, children, className = '' }: { icon: any; children: React.ReactNode; className?: string }) {
  return <span className={`inline-flex items-center gap-1.5 ${className}`}><Icon className="h-4 w-4" />{children}</span>;
}

function formatDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  if (year && month && day) {
    return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
    });
  }
  return value;
}

function initials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join('') || 'MJ';
}

function openExternal(url?: string) {
  if (url) window.open(url, '_blank', 'noopener,noreferrer');
}
