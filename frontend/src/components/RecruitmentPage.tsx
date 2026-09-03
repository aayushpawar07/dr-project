import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Briefcase,
  BriefcaseBusiness,
  Building2,
  Calendar,
  ChevronRight,
  ExternalLink,
  FileText,
  GraduationCap,
  IndianRupee,
  Layers3,
  Loader2,
  MapPin,
  Search,
  Share2,
  Shield,
  ShieldCheck,
  Stethoscope,
  Users,
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import {
  fetchPublishedRecruitment,
  Recruitment,
  VacancyRecord,
} from '../api/recruitments';

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
      total: vacancies.reduce(
        (sum, vacancy) => sum + Number(vacancy.numberOfVacancies || 0),
        0,
      ),
      departmentCount: new Set(
        vacancies
          .map((vacancy) => vacancy.department || vacancy.speciality)
          .filter(Boolean),
      ).size,
    }));
  }, [recruitment]);

  const visibleVacancies = useMemo(() => {
    if (!recruitment) return [];
    const normalizedQuery = query.trim().toLowerCase();

    return recruitment.vacancies.filter((vacancy) => {
      if (activePost && vacancy.postName !== activePost) return false;
      if (!normalizedQuery) return true;

      return [
        vacancy.department,
        vacancy.speciality,
        vacancy.subSpeciality,
        vacancy.qualification,
        vacancy.location,
        vacancy.category,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedQuery));
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
    () =>
      visibleVacancies.find((vacancy) => vacancy.id === selectedVacancyId) ||
      visibleVacancies[0] ||
      null,
    [visibleVacancies, selectedVacancyId],
  );

  const departmentCount = useMemo(
    () =>
      new Set(
        (recruitment?.vacancies || [])
          .map((vacancy) => vacancy.department || vacancy.speciality)
          .filter(Boolean),
      ).size,
    [recruitment],
  );

  if (loading) {
    return (
      <div className="flex min-h-[65vh] flex-col items-center justify-center gap-4 bg-slate-50">
        <Loader2 className="h-9 w-9 animate-spin text-blue-600" />
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
        <Button className="mt-4" onClick={() => navigate('/jobs')}>
          Browse Jobs
        </Button>
      </div>
    );
  }

  const isGovernment = recruitment.sector === 'government';
  const accent = isGovernment ? 'blue' : 'emerald';
  const applicationMode = recruitment.officialApplicationUrl ? 'Online' : 'As notified';
  const primaryPost = activePost || postGroups[0]?.name || 'Multiple Posts';
  const daysLeft = recruitment.applicationLastDate
    ? Math.ceil(
        (parseRecruitmentDate(recruitment.applicationLastDate).getTime() - Date.now()) /
          (1000 * 60 * 60 * 24),
      )
    : null;

  const handleShare = async () => {
    const shareData = {
      title: recruitment.title,
      text: `${recruitment.title} - ${recruitment.organisationName}`,
      url: window.location.href,
    };

    try {
      if (navigator.share) await navigator.share(shareData);
      else await navigator.clipboard.writeText(window.location.href);
    } catch {
      // User cancelled the native share sheet.
    }
  };

  const openSelectedJob = () => {
    if (selectedVacancy?.publishedJobId) {
      navigate(`/job-detail/${selectedVacancy.publishedJobId}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24 lg:pb-10">
      <div className="mx-auto max-w-[1480px] px-3 py-5 sm:px-5 lg:px-8 lg:py-7">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <RecruitmentHero
            recruitment={recruitment}
            isGovernment={isGovernment}
          />

          <ApplicationCard
            recruitment={recruitment}
            isGovernment={isGovernment}
            daysLeft={daysLeft}
            onShare={handleShare}
          />
        </div>

        <Card className="mt-5 border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <p className="mb-3 text-sm font-semibold text-slate-900">Recruitment Summary</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <SummaryTile
              icon={Users}
              tone="blue"
              label="Total Vacancies"
              value={String(recruitment.totalVacancies)}
              helper={`Across ${departmentCount} departments`}
            />
            <SummaryTile
              icon={Building2}
              tone="green"
              label="Departments"
              value={String(departmentCount)}
              helper="Medical specialities"
            />
            <SummaryTile
              icon={BriefcaseBusiness}
              tone="purple"
              label="Job Role"
              value={primaryPost}
              helper={selectedVacancy?.jobType || 'Multiple departments'}
            />
            <SummaryTile
              icon={Calendar}
              tone="orange"
              label="Application Mode"
              value={applicationMode}
              helper={isGovernment ? 'Official recruitment process' : 'Recruitment application'}
            />
            <SummaryTile
              icon={Calendar}
              tone="rose"
              label="Apply By"
              value={
                recruitment.applicationLastDate
                  ? formatDate(recruitment.applicationLastDate)
                  : 'See notification'
              }
              helper={daysLeft != null && daysLeft > 0 ? `${daysLeft} days remaining` : 'Check official dates'}
            />
          </div>
        </Card>

        <Card className="mt-5 overflow-hidden border-slate-200 bg-white shadow-sm">
          <div className="grid lg:grid-cols-[390px_minmax(0,1fr)]">
            <section className="border-b border-slate-200 bg-slate-50/70 lg:border-b-0 lg:border-r">
              <div className="border-b border-slate-200 bg-white p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-950">Explore Departments</h2>
                    <p className="mt-1 text-xs text-slate-500">Select a department to view its vacancy details.</p>
                  </div>
                  <Badge variant="outline" className="bg-white">
                    {visibleVacancies.length}
                  </Badge>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_130px] lg:grid-cols-1 xl:grid-cols-[minmax(0,1fr)_130px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Search department or speciality"
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  {postGroups.length > 1 ? (
                    <select
                      value={activePost}
                      onChange={(event) => {
                        setActivePost(event.target.value);
                        setQuery('');
                      }}
                      className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-blue-400"
                    >
                      {postGroups.map((group) => (
                        <option key={group.name} value={group.name}>
                          {group.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700">
                      All ({departmentCount})
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2 overflow-x-auto p-3 lg:block lg:max-h-[720px] lg:space-y-2 lg:overflow-y-auto lg:overflow-x-hidden lg:p-4">
                {visibleVacancies.map((vacancy, index) => {
                  const selected = vacancy.id === selectedVacancy?.id;
                  const department = vacancy.department || vacancy.speciality || vacancy.postName;
                  return (
                    <button
                      key={vacancy.id}
                      type="button"
                      onClick={() => setSelectedVacancyId(vacancy.id)}
                      className={`group min-w-[245px] rounded-xl border bg-white p-3 text-left transition lg:min-w-0 lg:w-full ${
                        selected
                          ? isGovernment
                            ? 'border-blue-400 shadow-sm ring-2 ring-blue-100'
                            : 'border-emerald-400 shadow-sm ring-2 ring-emerald-100'
                          : 'border-slate-200 hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <DepartmentIcon index={index} active={selected} isGovernment={isGovernment} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-900">{department}</p>
                          <p className="mt-0.5 truncate text-xs text-slate-500">{vacancy.speciality || vacancy.qualification || vacancy.postName}</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-xs font-semibold ${
                              selected
                                ? isGovernment
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-emerald-600 text-white'
                                : 'bg-slate-100 text-blue-700'
                            }`}
                          >
                            {vacancy.numberOfVacancies}
                          </span>
                          <ChevronRight className={`h-4 w-4 ${selected ? 'text-blue-600' : 'text-slate-300'}`} />
                        </div>
                      </div>
                    </button>
                  );
                })}

                {!visibleVacancies.length && (
                  <div className="w-full rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
                    No departments match your search.
                  </div>
                )}
              </div>
            </section>

            <section className="min-w-0 bg-white p-4 sm:p-5 lg:p-6">
              {selectedVacancy ? (
                <ApprovedVacancyDetail
                  vacancy={selectedVacancy}
                  recruitment={recruitment}
                  isGovernment={isGovernment}
                  onViewJob={openSelectedJob}
                />
              ) : (
                <div className="flex min-h-[480px] items-center justify-center text-center text-slate-500">
                  Select a department to view its vacancy details.
                </div>
              )}
            </section>
          </div>
        </Card>
      </div>

      {selectedVacancy && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 p-3 shadow-[0_-10px_30px_rgba(15,23,42,0.12)] backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-3xl gap-2">
            {selectedVacancy.publishedJobId && (
              <Button
                variant="outline"
                className="flex-1"
                onClick={openSelectedJob}
              >
                {isGovernment ? 'View Details' : 'View & Apply'}
              </Button>
            )}
            {recruitment.officialApplicationUrl && (
              <Button
                className={`flex-1 ${
                  isGovernment
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
                onClick={() => openExternal(recruitment.officialApplicationUrl)}
              >
                {isGovernment ? 'Official Apply' : 'Apply Now'}
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function RecruitmentHero({
  recruitment,
  isGovernment,
}: {
  recruitment: Recruitment;
  isGovernment: boolean;
}) {
  return (
    <Card
      className={`relative overflow-hidden border p-5 shadow-sm sm:p-6 lg:p-7 ${
        isGovernment
          ? 'border-blue-200 bg-gradient-to-br from-blue-50 via-white to-indigo-50'
          : 'border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-teal-50'
      }`}
    >
      <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full border-[34px] border-white/50" />
      <div className="relative">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-white shadow-sm ${
              isGovernment ? 'bg-blue-600' : 'bg-emerald-600'
            }`}
          >
            {isGovernment ? <Shield className="h-3.5 w-3.5" /> : <BriefcaseBusiness className="h-3.5 w-3.5" />}
            {isGovernment ? 'Government Recruitment' : 'Private Recruitment'}
          </span>

          {recruitment.officialSourceVerified && (
            <Badge className="border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
              <ShieldCheck className="mr-1 h-3.5 w-3.5" />
              Official Source
            </Badge>
          )}
        </div>

        <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-center">
          <div
            className={`flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-4 bg-white shadow-sm sm:h-28 sm:w-28 ${
              isGovernment ? 'border-blue-100 text-blue-700' : 'border-emerald-100 text-emerald-700'
            }`}
          >
            <Building2 className="h-11 w-11" />
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold leading-tight text-slate-950 sm:text-3xl lg:text-[34px]">
              {recruitment.title}
            </h1>
            <div className={`mt-2 flex items-start gap-2 text-base font-semibold ${isGovernment ? 'text-blue-700' : 'text-emerald-700'}`}>
              <Building2 className="mt-0.5 h-5 w-5 shrink-0" />
              <span>{recruitment.organisationName}</span>
            </div>

            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-600">
              {recruitment.location && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  {recruitment.location}
                </span>
              )}
              {recruitment.advertisementNumber && (
                <span>
                  <span className="text-slate-500">Advertisement No.</span>{' '}
                  <strong className="text-slate-900">{recruitment.advertisementNumber}</strong>
                </span>
              )}
              {recruitment.applicationLastDate && (
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  Apply by{' '}
                  <strong className="text-red-600">{formatDate(recruitment.applicationLastDate)}</strong>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function ApplicationCard({
  recruitment,
  isGovernment,
  daysLeft,
  onShare,
}: {
  recruitment: Recruitment;
  isGovernment: boolean;
  daysLeft: number | null;
  onShare: () => void;
}) {
  return (
    <Card className="border-red-100 bg-gradient-to-b from-red-50/80 to-white p-4 shadow-sm sm:p-5">
      {daysLeft != null && daysLeft > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-600">
          <Calendar className="mr-2 inline h-4 w-4" />
          {daysLeft <= 7 ? `Only ${daysLeft} days left to apply!` : `${daysLeft} days left to apply`}
        </div>
      )}

      <p className="mt-3 text-sm leading-6 text-slate-600">
        {isGovernment
          ? 'Follow the official notification and official application process for final submission.'
          : 'Review the vacancy details and continue through the available application route.'}
      </p>

      <div className="mt-3 space-y-2">
        {recruitment.officialApplicationUrl && (
          <Button
            className={`w-full ${
              isGovernment ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
            onClick={() => openExternal(recruitment.officialApplicationUrl)}
          >
            {isGovernment ? 'Official Apply Link' : 'Apply Now'}
            <ExternalLink className="ml-2 h-4 w-4" />
          </Button>
        )}

        {recruitment.officialNotificationUrl && (
          <Button
            variant="outline"
            className="w-full bg-white"
            onClick={() => openExternal(recruitment.officialNotificationUrl)}
          >
            <FileText className="mr-2 h-4 w-4" />
            View Notification
          </Button>
        )}

        {recruitment.officialWebsite && (
          <Button
            variant="outline"
            className="w-full bg-white"
            onClick={() => openExternal(recruitment.officialWebsite)}
          >
            <Building2 className="mr-2 h-4 w-4" />
            Official Website
            <ExternalLink className="ml-auto h-4 w-4" />
          </Button>
        )}

        <Button variant="outline" className="w-full bg-white text-blue-600" onClick={onShare}>
          <Share2 className="mr-2 h-4 w-4" />
          Share Recruitment
        </Button>
      </div>
    </Card>
  );
}

function ApprovedVacancyDetail({
  vacancy,
  recruitment,
  isGovernment,
  onViewJob,
}: {
  vacancy: VacancyRecord;
  recruitment: Recruitment;
  isGovernment: boolean;
  onViewJob: () => void;
}) {
  const department = vacancy.department || vacancy.speciality || vacancy.postName;
  const detailCards = [
    {
      icon: GraduationCap,
      label: 'Qualification',
      value: vacancy.qualification || 'See notification',
      tone: 'blue',
    },
    {
      icon: Stethoscope,
      label: 'Experience',
      value: vacancy.experience || 'As per notification',
      tone: 'indigo',
    },
    {
      icon: IndianRupee,
      label: 'Salary / Pay',
      value: vacancy.salary || vacancy.payScale || vacancy.payLevel || 'See notification',
      tone: 'green',
    },
    {
      icon: Users,
      label: 'Age Limit',
      value: vacancy.ageLimit || 'As per notification',
      tone: 'purple',
    },
    {
      icon: ShieldCheck,
      label: 'Other Eligibility',
      value: vacancy.otherEligibilityRequirements || 'See official notification',
      tone: 'orange',
    },
    {
      icon: Briefcase,
      label: 'Selection Process',
      value: recruitment.selectionProcess || 'As per notification',
      tone: 'violet',
    },
  ];

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                isGovernment ? 'bg-emerald-50 text-emerald-700' : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {vacancy.postName} Role
            </span>
            <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700">
              Clinical Department
            </span>
            {vacancy.jobType && (
              <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
                {vacancy.jobType}
              </span>
            )}
          </div>

          <h2 className="mt-3 text-2xl font-bold text-slate-950 sm:text-3xl">{department}</h2>
          <p className="mt-1 text-sm font-medium text-slate-600">{vacancy.qualification || vacancy.speciality || vacancy.postName}</p>

          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-500">
            {vacancy.location && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                {vacancy.location}
              </span>
            )}
            {vacancy.jobType && (
              <span className="inline-flex items-center gap-1.5">
                <Briefcase className="h-4 w-4" />
                {vacancy.jobType}
              </span>
            )}
          </div>
        </div>

        <div
          className={`flex h-16 min-w-20 flex-col items-center justify-center rounded-xl border px-4 ${
            isGovernment
              ? 'border-blue-200 bg-blue-50 text-blue-700'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700'
          }`}
        >
          <span className="text-2xl font-bold">{vacancy.numberOfVacancies}</span>
          <span className="text-[11px] font-semibold">Vacancies</span>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {detailCards.map((card) => (
          <VacancyInfoCard key={card.label} {...card} />
        ))}
      </div>

      {(recruitment.applicationStartDate || recruitment.applicationLastDate) && (
        <div
          className={`mt-4 rounded-xl border p-4 ${
            isGovernment ? 'border-blue-200 bg-blue-50/60' : 'border-emerald-200 bg-emerald-50/60'
          }`}
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Calendar className={`h-4 w-4 ${isGovernment ? 'text-blue-600' : 'text-emerald-600'}`} />
            Important Dates
          </div>
          <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {recruitment.verificationDate && (
              <DateCell label="Notification / Verification" value={formatDate(recruitment.verificationDate)} />
            )}
            {recruitment.applicationStartDate && (
              <DateCell label="Application Start Date" value={formatDate(recruitment.applicationStartDate)} />
            )}
            {recruitment.applicationLastDate && (
              <DateCell label="Last Date to Apply" value={formatDate(recruitment.applicationLastDate)} />
            )}
          </div>
        </div>
      )}

      <div className="mt-5 hidden gap-3 border-t border-slate-200 pt-4 lg:flex">
        {vacancy.publishedJobId && (
          <Button variant="outline" className="flex-1" onClick={onViewJob}>
            <Briefcase className="mr-2 h-4 w-4" />
            {isGovernment ? 'View Vacancy Details' : 'View & Apply'}
          </Button>
        )}

        {recruitment.officialApplicationUrl && (
          <Button
            className={`flex-1 ${
              isGovernment ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
            onClick={() => openExternal(recruitment.officialApplicationUrl)}
          >
            {isGovernment ? 'Official Apply Link' : 'Apply Now'}
            <ExternalLink className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

function SummaryTile({
  icon: Icon,
  tone,
  label,
  value,
  helper,
}: {
  icon: any;
  tone: 'blue' | 'green' | 'purple' | 'orange' | 'rose';
  label: string;
  value: string;
  helper: string;
}) {
  const styles = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-emerald-50 text-emerald-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
    rose: 'bg-rose-50 text-rose-600',
  };

  return (
    <div className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-white p-3.5">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${styles[tone]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="truncate text-base font-bold text-slate-950">{value}</p>
        <p className="truncate text-[11px] text-slate-500">{helper}</p>
      </div>
    </div>
  );
}

function DepartmentIcon({
  index,
  active,
  isGovernment,
}: {
  index: number;
  active: boolean;
  isGovernment: boolean;
}) {
  const tones = [
    'bg-blue-50 text-blue-600',
    'bg-indigo-50 text-indigo-600',
    'bg-emerald-50 text-emerald-600',
    'bg-orange-50 text-orange-600',
    'bg-purple-50 text-purple-600',
    'bg-rose-50 text-rose-600',
  ];
  const selectedTone = isGovernment ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600';

  return (
    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${active ? selectedTone : tones[index % tones.length]}`}>
      <Stethoscope className="h-5 w-5" />
    </div>
  );
}

function VacancyInfoCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: any;
  label: string;
  value: string;
  tone: string;
}) {
  const toneStyles: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    green: 'bg-emerald-50 text-emerald-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
    violet: 'bg-violet-50 text-violet-600',
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-blue-200 hover:shadow-sm">
      <div className="flex items-start gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${toneStyles[tone] || toneStyles.blue}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-700">{label}</p>
          <p className="mt-1 text-sm leading-5 text-slate-600">{value}</p>
        </div>
      </div>
    </div>
  );
}

function DateCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/70 px-3 py-2 text-center">
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function formatDate(value: string) {
  const date = parseRecruitmentDate(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function parseRecruitmentDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  if (year && month && day) return new Date(Date.UTC(year, month - 1, day));
  return new Date(value);
}

function openExternal(url?: string) {
  if (url) window.open(url, '_blank', 'noopener,noreferrer');
}
