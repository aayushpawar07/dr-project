import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  BadgeIndianRupee,
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
        v.postName,
        v.department,
        v.speciality,
        v.subSpeciality,
        v.category,
        v.qualification,
        v.experience,
        v.ageLimit,
        v.salary,
        v.payLevel,
        v.payScale,
        v.jobType,
        v.location,
        v.otherEligibilityRequirements,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    });
  }, [recruitment, query, post, department]);

  if (loading) {
    return (
      <div className="flex min-h-[65vh] flex-col items-center justify-center gap-3 bg-slate-50">
        <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
        <p className="font-medium text-slate-500">Loading recruitment details…</p>
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

  const activeFilters = Boolean(post || department || query);

  return (
    <div className="min-h-screen bg-[#f6f8fb]">
      <section className="border-b border-slate-200 bg-white">
        <div className="container mx-auto max-w-7xl px-4 py-7 md:py-9">
          <div className="mb-4 flex flex-wrap items-center gap-2">
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

          <div className="grid gap-6 lg:grid-cols-[1fr_340px] lg:items-start">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Building2 className="h-4 w-4 text-blue-600" />
                {recruitment.organisationName}
              </div>
              <h1 className="mt-2 max-w-4xl text-3xl font-bold leading-tight text-slate-950 md:text-4xl">
                {recruitment.title}
              </h1>

              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600">
                {recruitment.location && (
                  <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" />{recruitment.location}</span>
                )}
                {recruitment.advertisementNumber && (
                  <span className="flex items-center gap-1.5"><FileText className="h-4 w-4" />Advt. No. {recruitment.advertisementNumber}</span>
                )}
                {recruitment.applicationLastDate && (
                  <span className="flex items-center gap-1.5 font-semibold text-rose-600">
                    <CalendarDays className="h-4 w-4" />Apply by {formatDate(recruitment.applicationLastDate)}
                  </span>
                )}
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
                <HeroMetric icon={Users} value={recruitment.totalVacancies} label="Total Vacancies" />
                <HeroMetric icon={BriefcaseBusiness} value={postGroups.length} label="Post Groups" />
                <HeroMetric icon={Layers3} value={departments.length} label="Departments" />
                <HeroMetric icon={CalendarDays} value={recruitment.applicationLastDate ? formatDate(recruitment.applicationLastDate) : 'See notice'} label="Last Date" />
              </div>
            </div>

            <Card className="border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-20">
              <p className="text-sm font-semibold text-slate-900">Official recruitment actions</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">Use the verified notification and official application link for final submission.</p>
              <div className="mt-4 space-y-2">
                {recruitment.officialApplicationUrl && (
                  <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={() => openExternal(recruitment.officialApplicationUrl)}>
                    Apply on Official Website <ExternalLink className="ml-2 h-4 w-4" />
                  </Button>
                )}
                {recruitment.officialNotificationUrl && (
                  <Button className="w-full" variant="outline" onClick={() => openExternal(recruitment.officialNotificationUrl)}>
                    View Official Notification <FileText className="ml-2 h-4 w-4" />
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

      <div className="container mx-auto max-w-7xl px-4 py-7">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <main className="min-w-0 space-y-6">
            {postGroups.length > 1 && (
              <Card className="overflow-hidden border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-5 py-4">
                  <h2 className="text-lg font-bold text-slate-950">Post Groups</h2>
                  <p className="mt-1 text-sm text-slate-500">Choose a post group to see its department-wise vacancies.</p>
                </div>
                <div className="divide-y divide-slate-100">
                  {postGroups.map((group) => (
                    <button
                      key={group.name}
                      type="button"
                      onClick={() => { setPost(group.name); setDepartment(''); }}
                      className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-blue-50/40"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-slate-900">{group.name}</span>
                          <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">{group.total} vacancies</Badge>
                        </div>
                        <p className="mt-1 truncate text-sm text-slate-500">
                          {group.departments.length
                            ? `${group.departments.slice(0, 5).join(' • ')}${group.departments.length > 5 ? ` • +${group.departments.length - 5} more` : ''}`
                            : 'Department details available inside'}
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
                    </button>
                  ))}
                </div>
              </Card>
            )}

            <Card className="border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-950">Find your department</h2>
                  <p className="mt-1 text-sm text-slate-500">Search by post, department, speciality or qualification.</p>
                </div>
                {activeFilters && (
                  <button
                    type="button"
                    className="text-sm font-semibold text-blue-700 hover:text-blue-800"
                    onClick={() => { setPost(''); setDepartment(''); setQuery(''); }}
                  >
                    Clear filters
                  </button>
                )}
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-[1.3fr_1fr_1fr]">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    placeholder="e.g. General Surgery"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
                <SelectFilter value={post} onChange={setPost} options={postGroups.map((group) => group.name)} placeholder="All Posts" />
                <SelectFilter value={department} onChange={setDepartment} options={departments} placeholder="All Departments" />
              </div>
            </Card>

            <Card className="overflow-hidden border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-950">Department-wise vacancies</h2>
                  <p className="mt-1 text-sm text-slate-500">{rows.length} matching vacancy record{rows.length === 1 ? '' : 's'}</p>
                </div>
                {post && <Badge className="w-fit bg-blue-50 text-blue-700 hover:bg-blue-50">{post}</Badge>}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[900px] text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-5 py-3 text-left">Department</th>
                      <th className="px-4 py-3 text-left">Speciality</th>
                      <th className="px-4 py-3 text-center">Vacancies</th>
                      <th className="px-4 py-3 text-left">Qualification</th>
                      <th className="px-4 py-3 text-left">Experience</th>
                      <th className="px-5 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((vacancy) => (
                      <tr key={vacancy.id} className="transition hover:bg-slate-50/70">
                        <td className="px-5 py-4">
                          <div className="font-semibold text-slate-900">{vacancy.department || vacancy.postName}</div>
                          <div className="mt-1 text-xs text-slate-500">{vacancy.postName}</div>
                        </td>
                        <td className="px-4 py-4 text-slate-700">{vacancy.speciality || '-'}</td>
                        <td className="px-4 py-4 text-center">
                          <span className="inline-flex min-w-9 items-center justify-center rounded-full bg-blue-50 px-2.5 py-1 font-bold text-blue-700">{vacancy.numberOfVacancies}</span>
                        </td>
                        <td className="max-w-[240px] px-4 py-4 text-slate-700">{vacancy.qualification || 'See notification'}</td>
                        <td className="max-w-[230px] px-4 py-4 text-slate-600">{shorten(vacancy.experience, 90) || 'As per notification'}</td>
                        <td className="px-5 py-4 text-right">
                          {vacancy.publishedJobId && (
                            <Button size="sm" variant="outline" onClick={() => navigate(`/job-detail/${vacancy.publishedJobId}`)}>
                              View Details <ChevronRight className="ml-1 h-4 w-4" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="divide-y divide-slate-100 md:hidden">
                {rows.map((vacancy) => (
                  <VacancyMobileCard
                    key={vacancy.id}
                    vacancy={vacancy}
                    onView={() => vacancy.publishedJobId && navigate(`/job-detail/${vacancy.publishedJobId}`)}
                  />
                ))}
              </div>

              {!rows.length && <div className="p-10 text-center text-slate-500">No vacancies match these filters.</div>}
            </Card>
          </main>

          <aside className="space-y-4">
            <Card className="border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-20">
              <h3 className="font-bold text-slate-950">Recruitment overview</h3>
              <div className="mt-4 space-y-3 text-sm">
                <OverviewRow icon={Users} label="Total vacancies" value={String(recruitment.totalVacancies)} />
                <OverviewRow icon={Layers3} label="Departments" value={String(departments.length)} />
                <OverviewRow icon={BriefcaseBusiness} label="Post groups" value={String(postGroups.length)} />
                {recruitment.applicationStartDate && <OverviewRow icon={CalendarDays} label="Starts" value={formatDate(recruitment.applicationStartDate)} />}
                {recruitment.applicationLastDate && <OverviewRow icon={CalendarDays} label="Last date" value={formatDate(recruitment.applicationLastDate)} />}
              </div>
            </Card>

            {recruitment.applicationFee && (
              <SideInfoCard icon={BadgeIndianRupee} title="Application Fee" text={recruitment.applicationFee} />
            )}
            {recruitment.selectionProcess && (
              <SideInfoCard icon={CheckCircle2} title="Selection Process" text={recruitment.selectionProcess} />
            )}
            {recruitment.importantInstructions && (
              <SideInfoCard icon={FileText} title="Important Instructions" text={recruitment.importantInstructions} />
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}

function HeroMetric({ icon: Icon, value, label }: { icon: any; value: string | number; label: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
      <Icon className="mb-2 h-5 w-5 text-blue-600" />
      <div className="text-xl font-bold text-slate-950">{value}</div>
      <div className="mt-0.5 text-xs font-medium text-slate-500">{label}</div>
    </div>
  );
}

function OverviewRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg bg-slate-50 p-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
      <div className="min-w-0">
        <div className="text-xs font-medium text-slate-500">{label}</div>
        <div className="mt-0.5 font-semibold text-slate-900">{value}</div>
      </div>
    </div>
  );
}

function SideInfoCard({ icon: Icon, title, text }: { icon: any; title: string; text: string }) {
  return (
    <Card className="border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 font-bold text-slate-950"><Icon className="h-4 w-4 text-blue-600" />{title}</div>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">{text}</p>
    </Card>
  );
}

function VacancyMobileCard({ vacancy, onView }: { vacancy: VacancyRecord; onView: () => void }) {
  return (
    <div className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-bold text-slate-950">{vacancy.department || vacancy.postName}</div>
          <div className="mt-1 text-sm font-medium text-blue-700">{vacancy.speciality || vacancy.postName}</div>
        </div>
        <Badge variant="outline">{vacancy.numberOfVacancies} vacancies</Badge>
      </div>
      <div className="mt-3 grid gap-2 text-sm">
        {vacancy.qualification && <MobileFact icon={GraduationCap} label="Qualification" value={vacancy.qualification} />}
        {vacancy.experience && <MobileFact icon={Stethoscope} label="Experience" value={vacancy.experience} />}
        {(vacancy.salary || vacancy.payScale || vacancy.payLevel) && <MobileFact icon={IndianRupee} label="Salary / Pay" value={vacancy.salary || vacancy.payScale || vacancy.payLevel || ''} />}
        {vacancy.location && <MobileFact icon={MapPin} label="Location" value={vacancy.location} />}
      </div>
      {vacancy.publishedJobId && <Button className="mt-4 w-full" variant="outline" onClick={onView}>View Vacancy Details</Button>}
    </div>
  );
}

function MobileFact({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500"><Icon className="h-3.5 w-3.5 text-blue-600" />{label}</div>
      <div className="mt-1 font-medium text-slate-800">{value}</div>
    </div>
  );
}

function SelectFilter({ value, onChange, options, placeholder }: { value: string; onChange: (value: string) => void; options: string[]; placeholder: string }) {
  return (
    <select
      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">{placeholder}</option>
      {options.map((option) => <option key={option} value={option}>{option}</option>)}
    </select>
  );
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

function shorten(value?: string, max = 100) {
  if (!value) return '';
  if (value.length <= max) return value;
  const cut = value.lastIndexOf(' ', max - 1);
  return `${value.slice(0, cut > 40 ? cut : max).trim()}…`;
}

function openExternal(url?: string) {
  if (url) window.open(url, '_blank', 'noopener,noreferrer');
}
