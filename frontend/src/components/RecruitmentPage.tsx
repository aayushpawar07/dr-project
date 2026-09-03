import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlarmClock,
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

const recruitmentLayoutCss = `
  .recruitment-approved-top {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 18px;
  }

  .recruitment-approved-summary {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 12px;
  }

  .recruitment-approved-explorer {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
  }

  .recruitment-approved-vacancy-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 12px;
  }

  .recruitment-approved-department-list {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 9px;
  }

  @media (min-width: 700px) {
    .recruitment-approved-top {
      grid-template-columns: minmax(0, 2.4fr) minmax(285px, 0.95fr);
      align-items: stretch;
    }

    .recruitment-approved-summary {
      grid-template-columns: repeat(5, minmax(0, 1fr));
    }

    .recruitment-approved-explorer {
      grid-template-columns: minmax(290px, 0.88fr) minmax(0, 1.75fr);
    }

    .recruitment-approved-vacancy-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (min-width: 1180px) {
    .recruitment-approved-vacancy-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }

  @media (max-width: 699px) {
    .recruitment-approved-department-list {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 470px) {
    .recruitment-approved-department-list {
      grid-template-columns: minmax(0, 1fr);
    }
  }
`;

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
      const rows = groups.get(vacancy.postName) || [];
      rows.push(vacancy);
      groups.set(vacancy.postName, rows);
    }

    return [...groups.entries()].map(([name, vacancies]) => ({
      name,
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
  const daysLeft = recruitment.applicationLastDate
    ? Math.ceil(
        (parseRecruitmentDate(recruitment.applicationLastDate).getTime() - Date.now()) /
          (1000 * 60 * 60 * 24),
      )
    : null;
  const primaryPost = activePost || postGroups[0]?.name || 'Multiple Posts';
  const applicationMode = recruitment.officialApplicationUrl ? 'Online' : 'As notified';

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
      // User cancelled the share action.
    }
  };

  const openSelectedJob = () => {
    if (selectedVacancy?.publishedJobId) {
      navigate(`/job-detail/${selectedVacancy.publishedJobId}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f9fc] pb-24 lg:pb-10">
      <style>{recruitmentLayoutCss}</style>

      <div className="mx-auto max-w-[1480px] px-3 py-5 sm:px-5 lg:px-7 lg:py-7">
        <div className="recruitment-approved-top">
          <RecruitmentHero recruitment={recruitment} isGovernment={isGovernment} />
          <ApplicationPanel
            recruitment={recruitment}
            isGovernment={isGovernment}
            daysLeft={daysLeft}
            onShare={handleShare}
          />
        </div>

        <Card className="mt-5 border-[#e2e8f0] bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)] sm:p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Recruitment Summary</h2>
          <div className="recruitment-approved-summary">
            <SummaryCard
              icon={Users}
              tone="blue"
              label="Total Vacancies"
              value={String(recruitment.totalVacancies)}
              helper={`Across ${departmentCount} departments`}
            />
            <SummaryCard
              icon={Building2}
              tone="green"
              label="Departments"
              value={String(departmentCount)}
              helper="Medical specialties"
            />
            <SummaryCard
              icon={BriefcaseBusiness}
              tone="purple"
              label="Job Role"
              value={primaryPost}
              helper={selectedVacancy?.jobType || 'Full Time'}
            />
            <SummaryCard
              icon={Calendar}
              tone="orange"
              label="Application Mode"
              value={applicationMode}
              helper={isGovernment ? 'Through official process' : 'Recruitment process'}
            />
            <SummaryCard
              icon={AlarmClock}
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

        <Card className="mt-5 overflow-hidden border-[#e2e8f0] bg-white shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
          <div className="recruitment-approved-explorer">
            <section className="border-b border-slate-200 bg-[#fbfcfe] p-4 sm:p-5 md:border-b-0 md:border-r">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-slate-950">Explore Departments</h2>
                <p className="mt-1 text-xs text-slate-500">Select a department to view full vacancy details.</p>
              </div>

              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_120px] md:grid-cols-1 xl:grid-cols-[minmax(0,1fr)_120px]">
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

              <div className="recruitment-approved-department-list mt-4 md:max-h-[690px] md:overflow-y-auto md:pr-1">
                {visibleVacancies.map((vacancy, index) => {
                  const selected = vacancy.id === selectedVacancy?.id;
                  const department = vacancy.department || vacancy.speciality || vacancy.postName;

                  return (
                    <button
                      key={vacancy.id}
                      type="button"
                      onClick={() => setSelectedVacancyId(vacancy.id)}
                      className={`group rounded-xl border bg-white p-3 text-left transition duration-200 ${
                        selected
                          ? isGovernment
                            ? 'border-blue-400 shadow-[0_5px_16px_rgba(37,99,235,0.12)] ring-2 ring-blue-100'
                            : 'border-emerald-400 shadow-[0_5px_16px_rgba(5,150,105,0.12)] ring-2 ring-emerald-100'
                          : 'border-slate-200 hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <DepartmentMark index={index} selected={selected} isGovernment={isGovernment} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-950">{department}</p>
                          <p className="mt-0.5 truncate text-xs text-slate-500">
                            {vacancy.qualification || vacancy.speciality || vacancy.postName}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-xs font-bold ${
                              selected
                                ? isGovernment
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-emerald-600 text-white'
                                : 'bg-blue-50 text-blue-700'
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
                  <div className="rounded-xl border border-dashed border-slate-300 bg-white p-7 text-center text-sm text-slate-500">
                    No departments match your search.
                  </div>
                )}
              </div>
            </section>

            <section className="min-w-0 bg-white p-4 sm:p-5 lg:p-6">
              {selectedVacancy ? (
                <VacancyDetailPanel
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
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 p-3 shadow-[0_-8px_24px_rgba(15,23,42,0.12)] backdrop-blur md:hidden">
          <div className="mx-auto flex max-w-3xl gap-2">
            {selectedVacancy.publishedJobId && (
              <Button variant="outline" className="flex-1" onClick={openSelectedJob}>
                {isGovernment ? 'View Details' : 'View & Apply'}
              </Button>
            )}
            {recruitment.officialApplicationUrl && (
              <Button
                className={`flex-1 ${
                  isGovernment ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'
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

function RecruitmentHero({ recruitment, isGovernment }: { recruitment: Recruitment; isGovernment: boolean }) {
  return (
    <Card
      className={`relative overflow-hidden border p-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)] sm:p-6 ${
        isGovernment
          ? 'border-blue-200 bg-gradient-to-br from-[#edf5ff] via-white to-[#f5f8ff]'
          : 'border-emerald-200 bg-gradient-to-br from-[#ecfdf5] via-white to-[#f0fdfa]'
      }`}
    >
      <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full border-[38px] border-white/60" />
      <div className="relative z-10">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold text-white shadow-sm ${
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
          <OrganisationSeal name={recruitment.organisationName} isGovernment={isGovernment} />

          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold leading-tight text-slate-950 sm:text-3xl lg:text-[32px]">
              {recruitment.title}
            </h1>
            <div className={`mt-2 flex items-start gap-2 text-base font-semibold ${isGovernment ? 'text-blue-700' : 'text-emerald-700'}`}>
              <Building2 className="mt-0.5 h-5 w-5 shrink-0" />
              <span>{recruitment.organisationName}</span>
            </div>

            <div className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-2 lg:grid-cols-3">
              {recruitment.location && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-slate-500" />
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
                  <Calendar className="h-4 w-4 text-slate-500" />
                  Apply by <strong className="text-red-600">{formatDate(recruitment.applicationLastDate)}</strong>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function ApplicationPanel({
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
    <Card className="border-red-100 bg-gradient-to-b from-[#fff5f5] to-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.05)] sm:p-5">
      {daysLeft != null && daysLeft > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-600">
          <AlarmClock className="mr-2 inline h-4 w-4" />
          {daysLeft <= 7 ? `Only ${daysLeft} days left to apply!` : `${daysLeft} days left to apply`}
        </div>
      )}

      <p className="mt-3 text-sm leading-6 text-slate-600">
        {isGovernment
          ? 'Do not miss this opportunity. Follow the official notification and application process.'
          : 'Review the vacancy details and continue through the available application route.'}
      </p>

      <div className="mt-3 space-y-2.5">
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
          <Button variant="outline" className="w-full bg-white" onClick={() => openExternal(recruitment.officialNotificationUrl)}>
            <FileText className="mr-2 h-4 w-4" />
            View Notification
          </Button>
        )}

        {recruitment.officialWebsite && (
          <Button variant="outline" className="w-full bg-white" onClick={() => openExternal(recruitment.officialWebsite)}>
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

function VacancyDetailPanel({
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
  const cards = [
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
            <Badge className="border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
              {vacancy.postName} Role
            </Badge>
            <Badge className="border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-50">
              Clinical Department
            </Badge>
            {vacancy.jobType && (
              <Badge className="border border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-50">
                {vacancy.jobType}
              </Badge>
            )}
          </div>

          <h2 className="mt-3 text-2xl font-bold text-slate-950 sm:text-3xl">{department}</h2>
          <p className="mt-1 text-sm font-medium text-slate-600">
            {vacancy.qualification || vacancy.speciality || vacancy.postName}
          </p>

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
          className={`flex min-w-[94px] flex-col items-center justify-center rounded-xl border px-4 py-3 ${
            isGovernment
              ? 'border-blue-200 bg-blue-50 text-blue-700'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700'
          }`}
        >
          <span className="text-3xl font-bold leading-none">{vacancy.numberOfVacancies}</span>
          <span className="mt-1 text-xs font-semibold">Vacancies</span>
        </div>
      </div>

      <div className="recruitment-approved-vacancy-grid mt-5">
        {cards.map((card) => (
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
              <DateBlock label="Notification / Verification" value={formatDate(recruitment.verificationDate)} />
            )}
            {recruitment.applicationStartDate && (
              <DateBlock label="Application Start Date" value={formatDate(recruitment.applicationStartDate)} />
            )}
            {recruitment.applicationLastDate && (
              <DateBlock label="Last Date to Apply" value={formatDate(recruitment.applicationLastDate)} />
            )}
          </div>
        </div>
      )}

      <div className="mt-5 hidden gap-3 border-t border-slate-200 pt-4 md:flex">
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

function SummaryCard({
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
    <div className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-white p-3.5 transition hover:-translate-y-0.5 hover:shadow-sm">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${styles[tone]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-slate-500">{label}</p>
        <p className="truncate text-base font-bold text-slate-950">{value}</p>
        <p className="truncate text-[11px] text-slate-500">{helper}</p>
      </div>
    </div>
  );
}

function OrganisationSeal({ name, isGovernment }: { name: string; isGovernment: boolean }) {
  const acronym = buildAcronym(name);

  return (
    <div
      className={`flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-[5px] bg-white shadow-md sm:h-28 sm:w-28 ${
        isGovernment ? 'border-[#f0c34d]' : 'border-emerald-200'
      }`}
    >
      <div
        className={`flex h-[78px] w-[78px] items-center justify-center rounded-full border text-center text-xs font-extrabold tracking-wide sm:h-[90px] sm:w-[90px] ${
          isGovernment
            ? 'border-blue-300 bg-gradient-to-br from-blue-700 to-blue-900 text-amber-200'
            : 'border-emerald-300 bg-gradient-to-br from-emerald-600 to-teal-700 text-white'
        }`}
      >
        {acronym}
      </div>
    </div>
  );
}

function DepartmentMark({
  index,
  selected,
  isGovernment,
}: {
  index: number;
  selected: boolean;
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
    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${selected ? selectedTone : tones[index % tones.length]}`}>
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
    <div className="rounded-xl border border-slate-200 bg-white p-4 transition duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-sm">
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

function DateBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/80 px-3 py-2 text-center shadow-sm">
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function buildAcronym(value: string) {
  const aiimsMatch = value.match(/\bAIIMS\b/i);
  if (aiimsMatch) return 'AIIMS';
  const words = value.replace(/\([^)]*\)/g, ' ').split(/\s+/).filter(Boolean);
  const acronym = words.slice(0, 3).map((word) => word[0]?.toUpperCase()).join('');
  return acronym || 'ORG';
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
