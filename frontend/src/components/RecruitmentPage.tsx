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
import { Separator } from './ui/separator';
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
    () =>
      visibleVacancies.find((vacancy) => vacancy.id === selectedVacancyId) ||
      visibleVacancies[0] ||
      null,
    [visibleVacancies, selectedVacancyId],
  );

  const departments = useMemo(
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
      <div className="flex min-h-[65vh] flex-col items-center justify-center gap-4 bg-gray-50">
        <Loader2 className="h-9 w-9 animate-spin text-blue-600" />
        <div className="text-center">
          <p className="font-semibold text-gray-800">Loading recruitment</p>
          <p className="text-sm text-gray-500">Preparing department-wise vacancies…</p>
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

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
      <div className="container mx-auto px-3 py-5 sm:px-4 sm:py-8">
        <div className="grid gap-5 md:grid-cols-3 md:gap-6">
          <div className="space-y-5 md:col-span-2 md:space-y-6">
            <Card className="overflow-hidden border-gray-200">
              <div
                className={`h-1.5 w-full ${
                  isGovernment
                    ? 'bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600'
                    : 'bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-600'
                }`}
              />
              <div className="p-5 sm:p-6">
                <div className="space-y-4">
                  <div className="flex flex-wrap items-start gap-2.5">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide text-white shadow-sm ${
                        isGovernment ? 'bg-blue-600' : 'bg-emerald-600'
                      }`}
                    >
                      {isGovernment ? (
                        <Shield className="h-3.5 w-3.5" />
                      ) : (
                        <BriefcaseBusiness className="h-3.5 w-3.5" />
                      )}
                      {isGovernment ? 'Government' : 'Private'}
                    </span>

                    {recruitment.officialSourceVerified && (
                      <Badge
                        variant="outline"
                        className="border-emerald-200 bg-emerald-50 text-emerald-700"
                      >
                        <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                        Official Source
                      </Badge>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      className="ml-auto flex items-center gap-1 text-xs text-gray-600 hover:bg-blue-50 hover:text-blue-600"
                      onClick={handleShare}
                    >
                      <Share2 className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Share</span>
                    </Button>
                  </div>

                  <div>
                    <h1 className="mb-2 text-2xl font-semibold leading-tight text-gray-950 sm:text-3xl">
                      {recruitment.title}
                    </h1>
                    <div className="flex items-start gap-2 text-gray-700">
                      <Building2 className={`mt-0.5 h-5 w-5 shrink-0 ${isGovernment ? 'text-blue-600' : 'text-emerald-600'}`} />
                      <span className="text-base font-medium sm:text-lg">
                        {recruitment.organisationName}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 text-sm text-gray-500 sm:flex-row sm:flex-wrap sm:gap-x-5 sm:gap-y-2">
                    {recruitment.location && (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-4 w-4" />
                        <span>{recruitment.location}</span>
                      </div>
                    )}
                    {recruitment.advertisementNumber && (
                      <div className="flex items-center gap-1.5">
                        <FileText className="h-4 w-4" />
                        <span>Advt. No. {recruitment.advertisementNumber}</span>
                      </div>
                    )}
                    {recruitment.applicationLastDate && (
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-4 w-4" />
                        <span>Apply by {formatDate(recruitment.applicationLastDate)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-5 sm:p-6">
              <h2 className="mb-4 text-lg font-semibold text-gray-900 sm:text-xl">Recruitment Details</h2>
              <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
                <DetailTile icon={Users} label="Total Vacancies" value={String(recruitment.totalVacancies)} />
                <DetailTile icon={Briefcase} label="Post Groups" value={String(postGroups.length)} />
                <DetailTile icon={Layers3} label="Departments" value={String(departments)} />
                <DetailTile
                  icon={Calendar}
                  label="Last Date to Apply"
                  value={recruitment.applicationLastDate ? formatLongDate(recruitment.applicationLastDate) : 'See notification'}
                />
              </div>
            </Card>

            <Card className="p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 sm:text-xl">Post Groups</h2>
                  <p className="mt-1 text-sm text-gray-500">Choose a post to see its department-wise vacancies.</p>
                </div>
                <Badge variant="outline">{postGroups.length} groups</Badge>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {postGroups.map((group) => {
                  const active = group.name === activePost;
                  return (
                    <button
                      key={group.name}
                      type="button"
                      onClick={() => {
                        setActivePost(group.name);
                        setQuery('');
                      }}
                      className={`rounded-xl border p-4 text-left transition ${
                        active
                          ? isGovernment
                            ? 'border-blue-300 bg-blue-50 shadow-sm ring-2 ring-blue-100'
                            : 'border-emerald-300 bg-emerald-50 shadow-sm ring-2 ring-emerald-100'
                          : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900">{group.name}</p>
                          <p className="mt-1 text-xs text-gray-500">
                            {group.departmentCount} department{group.departmentCount === 1 ? '' : 's'}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            active
                              ? isGovernment
                                ? 'bg-blue-600 text-white'
                                : 'bg-emerald-600 text-white'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {group.total}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </Card>

            <Card className="overflow-hidden border-gray-200">
              <div className="border-b border-gray-200 p-5 sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 sm:text-xl">Department-wise Vacancies</h2>
                    <p className="mt-1 text-sm text-gray-500">Choose a department to open its full vacancy details.</p>
                  </div>
                  <Badge variant="outline">{visibleVacancies.length} results</Badge>
                </div>

                <div className="relative mt-4">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search department, speciality or qualification"
                    className="h-10 w-full rounded-md border border-gray-300 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div className="grid md:min-h-[540px] md:grid-cols-[285px_minmax(0,1fr)]">
                <div className="border-b border-gray-200 bg-gray-50/80 p-3 md:border-b-0 md:border-r">
                  <div className="flex gap-2 overflow-x-auto pb-1 md:block md:max-h-[660px] md:space-y-2 md:overflow-y-auto md:overflow-x-hidden md:pr-1">
                    {visibleVacancies.map((vacancy) => {
                      const active = vacancy.id === selectedVacancy?.id;
                      const department = vacancy.department || vacancy.speciality || vacancy.postName;
                      return (
                        <button
                          key={vacancy.id}
                          type="button"
                          onClick={() => setSelectedVacancyId(vacancy.id)}
                          className={`min-w-[210px] rounded-xl border p-3 text-left transition md:min-w-0 md:w-full ${
                            active
                              ? isGovernment
                                ? 'border-blue-300 bg-white shadow-sm ring-2 ring-blue-100'
                                : 'border-emerald-300 bg-white shadow-sm ring-2 ring-emerald-100'
                              : 'border-gray-200 bg-white/70 hover:bg-white'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-semibold text-gray-900">{department}</p>
                              <p className="mt-1 truncate text-xs text-gray-500">{vacancy.speciality || vacancy.postName}</p>
                            </div>
                            <span
                              className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold ${
                                active
                                  ? isGovernment
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-emerald-600 text-white'
                                  : 'bg-gray-100 text-blue-700'
                              }`}
                            >
                              {vacancy.numberOfVacancies}
                            </span>
                          </div>
                        </button>
                      );
                    })}

                    {!visibleVacancies.length && (
                      <p className="w-full p-5 text-center text-sm text-gray-500">No departments match your search.</p>
                    )}
                  </div>
                </div>

                <div className="min-w-0 bg-white p-4 sm:p-6">
                  {selectedVacancy ? (
                    <VacancyDetail
                      vacancy={selectedVacancy}
                      recruitment={recruitment}
                      isGovernment={isGovernment}
                      onViewJob={() =>
                        selectedVacancy.publishedJobId && navigate(`/job-detail/${selectedVacancy.publishedJobId}`)
                      }
                    />
                  ) : (
                    <div className="flex h-full min-h-[360px] items-center justify-center text-center text-gray-500">
                      Select a department to view its details.
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>

          <div className="space-y-5 md:col-span-1 md:space-y-6">
            <Card className="p-5 sm:p-6 md:sticky md:top-20">
              <div className="space-y-4">
                {daysLeft != null && daysLeft > 0 && (
                  <div
                    className={`rounded-md border px-4 py-3 text-sm ${
                      daysLeft <= 7
                        ? 'border-red-200 bg-red-50 text-red-700'
                        : 'border-blue-200 bg-blue-50 text-blue-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>{daysLeft <= 7 ? `Only ${daysLeft} days left to apply!` : `${daysLeft} days remaining`}</span>
                    </div>
                  </div>
                )}

                <Separator />

                <div className="space-y-3">
                  <p className="text-sm leading-6 text-gray-600">
                    {isGovernment
                      ? 'Government applications must follow the official notification and official application process.'
                      : 'Private vacancies can use the MedExJob application flow when a published job is available.'}
                  </p>

                  {recruitment.officialApplicationUrl && (
                    <Button
                      className={`w-full ${isGovernment ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                      onClick={() => openExternal(recruitment.officialApplicationUrl)}
                    >
                      Official Apply Link
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </Button>
                  )}

                  {recruitment.officialNotificationUrl && (
                    <Button className="w-full" variant="outline" onClick={() => openExternal(recruitment.officialNotificationUrl)}>
                      <FileText className="mr-2 h-4 w-4" />
                      View Notification
                    </Button>
                  )}

                  {recruitment.officialWebsite && (
                    <Button className="w-full" variant="outline" onClick={() => openExternal(recruitment.officialWebsite)}>
                      <Building2 className="mr-2 h-4 w-4" />
                      Official Website
                      <ExternalLink className="ml-auto h-4 w-4" />
                    </Button>
                  )}

                  <Button variant="outline" className="w-full text-blue-600" onClick={handleShare}>
                    <Share2 className="mr-2 h-4 w-4" />
                    Share Recruitment
                  </Button>
                </div>
              </div>
            </Card>

            <Card className="p-5 sm:p-6">
              <h3 className="mb-4 font-semibold text-gray-900">Recruitment Overview</h3>
              <div className="space-y-4">
                <SidebarRow icon={Users} label="Total vacancies" value={String(recruitment.totalVacancies)} />
                <SidebarRow icon={Layers3} label="Departments" value={String(departments)} />
                <SidebarRow icon={Briefcase} label="Post groups" value={String(postGroups.length)} />
                {recruitment.applicationStartDate && (
                  <SidebarRow icon={Calendar} label="Application starts" value={formatDate(recruitment.applicationStartDate)} />
                )}
                {recruitment.applicationLastDate && (
                  <SidebarRow icon={Calendar} label="Last date" value={formatDate(recruitment.applicationLastDate)} />
                )}
              </div>
            </Card>

            {(recruitment.applicationFee || recruitment.selectionProcess) && (
              <Card className="p-5 sm:p-6">
                {recruitment.applicationFee && <InfoSection title="Application Fee" value={recruitment.applicationFee} />}
                {recruitment.applicationFee && recruitment.selectionProcess && <Separator className="my-5" />}
                {recruitment.selectionProcess && <InfoSection title="Selection Process" value={recruitment.selectionProcess} />}
              </Card>
            )}

            {recruitment.importantInstructions && (
              <Card className="p-5 sm:p-6">
                <h3 className="mb-3 font-semibold text-gray-900">Important Instructions</h3>
                <p className="text-sm leading-6 text-gray-600">{recruitment.importantInstructions}</p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function VacancyDetail({
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
  const heading = vacancy.department || vacancy.speciality || vacancy.postName;
  const hasPublishedJob = Boolean(vacancy.publishedJobId);
  const hasOfficialApply = Boolean(recruitment.officialApplicationUrl);
  const accent = isGovernment ? 'blue' : 'emerald';
  const primaryLabel = isGovernment
    ? hasPublishedJob
      ? 'View Vacancy Details'
      : 'Official Apply Link'
    : hasPublishedJob
      ? 'View & Apply'
      : 'Official Apply Link';

  const runPrimaryAction = () => {
    if (hasPublishedJob) {
      onViewJob();
      return;
    }
    if (recruitment.officialApplicationUrl) openExternal(recruitment.officialApplicationUrl);
  };

  return (
    <div className="space-y-5 pb-20 md:pb-0">
      <div
        className={`relative overflow-hidden rounded-2xl border p-5 sm:p-6 ${
          isGovernment
            ? 'border-blue-200 bg-gradient-to-br from-blue-50 via-white to-indigo-50'
            : 'border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-teal-50'
        }`}
      >
        <div
          className={`absolute -right-12 -top-12 h-36 w-36 rounded-full opacity-30 blur-2xl ${
            isGovernment ? 'bg-blue-300' : 'bg-emerald-300'
          }`}
        />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              className={isGovernment ? 'bg-blue-600 hover:bg-blue-600' : 'bg-emerald-600 hover:bg-emerald-600'}
            >
              {vacancy.postName}
            </Badge>
            <Badge
              variant="outline"
              className={isGovernment ? 'border-blue-200 bg-white text-blue-700' : 'border-emerald-200 bg-white text-emerald-700'}
            >
              {vacancy.numberOfVacancies} Vacancies
            </Badge>
            {vacancy.category && <Badge variant="outline" className="bg-white">{vacancy.category}</Badge>}
          </div>

          <p className={`mt-4 text-xs font-semibold uppercase tracking-[0.18em] ${isGovernment ? 'text-blue-700' : 'text-emerald-700'}`}>
            {isGovernment ? 'Official department vacancy' : 'Private department vacancy'}
          </p>
          <h2 className="mt-1 text-2xl font-semibold leading-tight text-gray-950 sm:text-3xl">{heading}</h2>
          {vacancy.speciality && vacancy.speciality !== heading && (
            <p className="mt-1 text-sm font-medium text-gray-600">Speciality: {vacancy.speciality}</p>
          )}

          <div className="mt-4 flex flex-col gap-2 text-sm text-gray-600 sm:flex-row sm:flex-wrap sm:gap-x-5">
            {vacancy.location && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className={`h-4 w-4 ${isGovernment ? 'text-blue-600' : 'text-emerald-600'}`} />
                {vacancy.location}
              </span>
            )}
            {vacancy.jobType && (
              <span className="inline-flex items-center gap-1.5">
                <Briefcase className={`h-4 w-4 ${isGovernment ? 'text-blue-600' : 'text-emerald-600'}`} />
                {vacancy.jobType}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <VacancyInfoCard
          icon={GraduationCap}
          label="Qualification"
          value={vacancy.qualification || 'See notification'}
          isGovernment={isGovernment}
        />
        <VacancyInfoCard
          icon={Stethoscope}
          label="Experience"
          value={vacancy.experience || 'As per notification'}
          isGovernment={isGovernment}
        />
        <VacancyInfoCard
          icon={IndianRupee}
          label="Salary / Pay"
          value={vacancy.salary || vacancy.payScale || vacancy.payLevel || 'See notification'}
          isGovernment={isGovernment}
        />
        <VacancyInfoCard
          icon={Users}
          label="Age Limit"
          value={vacancy.ageLimit || 'As per applicable rules'}
          isGovernment={isGovernment}
        />
      </div>

      <div
        className={`rounded-xl border p-4 sm:p-5 ${
          isGovernment ? 'border-blue-100 bg-blue-50/50' : 'border-emerald-100 bg-emerald-50/50'
        }`}
      >
        <div className="flex items-start gap-3">
          <div className={`rounded-lg p-2 ${isGovernment ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
            {isGovernment ? <ShieldCheck className="h-5 w-5" /> : <BriefcaseBusiness className="h-5 w-5" />}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">
              {isGovernment ? 'Government application guidance' : 'Private application guidance'}
            </h3>
            <p className="mt-1 text-sm leading-6 text-gray-600">
              {isGovernment
                ? 'Verify eligibility and the application method in the official notification before applying. This vacancy may use online, offline, direct or walk-in recruitment.'
                : 'Open the published vacancy to review the full job and apply through MedExJob when the employer has enabled the internal application flow.'}
            </p>
          </div>
        </div>
      </div>

      {vacancy.otherEligibilityRequirements && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <GraduationCap className={`h-4 w-4 ${isGovernment ? 'text-blue-600' : 'text-emerald-600'}`} />
            <h3 className="font-semibold text-gray-900">Other Eligibility</h3>
          </div>
          <p className="mt-3 text-sm leading-6 text-gray-600">{vacancy.otherEligibilityRequirements}</p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {recruitment.selectionProcess && (
          <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <Users className={`h-4 w-4 ${isGovernment ? 'text-blue-600' : 'text-emerald-600'}`} />
              <h3 className="font-semibold text-gray-900">Selection Process</h3>
            </div>
            <p className="mt-3 text-sm leading-6 text-gray-600">{recruitment.selectionProcess}</p>
          </div>
        )}

        {(recruitment.applicationStartDate || recruitment.applicationLastDate) && (
          <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <Calendar className={`h-4 w-4 ${isGovernment ? 'text-blue-600' : 'text-emerald-600'}`} />
              <h3 className="font-semibold text-gray-900">Important Dates</h3>
            </div>
            <div className="mt-3 space-y-2.5 text-sm text-gray-700">
              {recruitment.applicationStartDate && (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-gray-500">Start date</span>
                  <strong>{formatDate(recruitment.applicationStartDate)}</strong>
                </div>
              )}
              {recruitment.applicationLastDate && (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-gray-500">Last date</span>
                  <strong className="text-rose-600">{formatDate(recruitment.applicationLastDate)}</strong>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {(hasPublishedJob || hasOfficialApply) && (
        <div className="hidden gap-3 border-t border-gray-200 pt-5 md:flex">
          {hasPublishedJob && (
            <Button
              className={`flex-1 ${isGovernment ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
              onClick={onViewJob}
            >
              {isGovernment ? 'View Vacancy Details' : 'View & Apply'}
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          )}
          {recruitment.officialApplicationUrl && (
            <Button
              variant={hasPublishedJob ? 'outline' : 'default'}
              className={hasPublishedJob ? 'flex-1' : `flex-1 ${isGovernment ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
              onClick={() => openExternal(recruitment.officialApplicationUrl)}
            >
              Official Apply Link
              <ExternalLink className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      {(hasPublishedJob || hasOfficialApply) && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 p-3 shadow-[0_-8px_30px_rgba(15,23,42,0.12)] backdrop-blur md:hidden">
          <div className="mx-auto flex max-w-lg items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs text-gray-500">{vacancy.postName}</p>
              <p className="truncate text-sm font-semibold text-gray-900">{heading}</p>
            </div>
            <Button
              className={`shrink-0 ${isGovernment ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
              onClick={runPrimaryAction}
            >
              {primaryLabel}
              {hasPublishedJob ? <ChevronRight className="ml-1 h-4 w-4" /> : <ExternalLink className="ml-1 h-4 w-4" />}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function VacancyInfoCard({
  icon: Icon,
  label,
  value,
  isGovernment,
}: {
  icon: any;
  label: string;
  value: string;
  isGovernment: boolean;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-gray-300 hover:shadow-md">
      <div className="flex items-start gap-3">
        <div className={`rounded-lg p-2.5 ${isGovernment ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
          <p className="mt-1.5 text-sm font-semibold leading-6 text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

function DetailTile({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-4">
      <div className="rounded-md bg-blue-50 p-2 text-blue-600">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
        <p className="mt-1 text-sm font-medium leading-6 text-gray-900">{value}</p>
      </div>
    </div>
  );
}

function SidebarRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-medium text-gray-900">{value}</p>
      </div>
    </div>
  );
}

function InfoSection({ title, value }: { title: string; value: string }) {
  return (
    <div>
      <h3 className="font-semibold text-gray-900">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-gray-600">{value}</p>
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

function formatLongDate(value: string) {
  const date = parseRecruitmentDate(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
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
