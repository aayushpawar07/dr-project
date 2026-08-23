import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Building2, CalendarDays, ExternalLink, Loader2, MapPin, Search } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import { fetchPublishedRecruitment, Recruitment } from '../api/recruitments';

export function RecruitmentPage() {
  const { recruitmentId } = useParams<{ recruitmentId: string }>();
  const navigate = useNavigate();
  const [recruitment, setRecruitment] = useState<Recruitment | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [post, setPost] = useState('');
  const [department, setDepartment] = useState('');
  const [speciality, setSpeciality] = useState('');

  useEffect(() => {
    if (!recruitmentId) return;
    setLoading(true);
    fetchPublishedRecruitment(recruitmentId)
      .then(setRecruitment)
      .catch(() => setRecruitment(null))
      .finally(() => setLoading(false));
  }, [recruitmentId]);

  const posts = useMemo(
    () => Array.from(new Set((recruitment?.vacancies || []).map((v) => v.postName).filter((value): value is string => Boolean(value)))).sort(),
    [recruitment],
  );
  const departments = useMemo(
    () => Array.from(new Set((recruitment?.vacancies || []).map((v) => v.department).filter((value): value is string => Boolean(value)))).sort(),
    [recruitment],
  );
  const specialities = useMemo(
    () => Array.from(new Set((recruitment?.vacancies || []).map((v) => v.speciality).filter((value): value is string => Boolean(value)))).sort(),
    [recruitment],
  );

  const rows = useMemo(() => {
    if (!recruitment) return [];
    const q = query.trim().toLowerCase();
    return recruitment.vacancies.filter((v) => {
      if (post && v.postName !== post) return false;
      if (department && v.department !== department) return false;
      if (speciality && v.speciality !== speciality) return false;
      if (!q) return true;
      return [v.postName, v.department, v.speciality, v.subSpeciality, v.category, v.qualification, v.location]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    });
  }, [recruitment, query, post, department, speciality]);

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  if (!recruitment) return <div className="container mx-auto px-4 py-16 text-center"><h1 className="text-2xl font-semibold">Recruitment not found</h1><Button className="mt-4" onClick={() => navigate('/jobs')}>Browse Jobs</Button></div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Badge className={recruitment.sector === 'government' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}>{recruitment.sector === 'government' ? 'Government Recruitment' : 'Private Recruitment'}</Badge>
            {recruitment.officialSourceVerified && <Badge className="bg-green-100 text-green-800">Official Source Verified</Badge>}
          </div>
          <h1 className="text-3xl font-semibold text-gray-900 max-w-5xl">{recruitment.title}</h1>
          <div className="flex flex-wrap gap-x-6 gap-y-2 mt-4 text-gray-600">
            <span className="flex items-center gap-2"><Building2 className="w-4 h-4" />{recruitment.organisationName}</span>
            {recruitment.advertisementNumber && <span>Advt. No. {recruitment.advertisementNumber}</span>}
            {recruitment.location && <span className="flex items-center gap-2"><MapPin className="w-4 h-4" />{recruitment.location}</span>}
            {recruitment.applicationStartDate && <span className="flex items-center gap-2"><CalendarDays className="w-4 h-4" />Start: {new Date(recruitment.applicationStartDate).toLocaleDateString('en-IN')}</span>}
            {recruitment.applicationLastDate && <span className="flex items-center gap-2"><CalendarDays className="w-4 h-4" />Last date: {new Date(recruitment.applicationLastDate).toLocaleDateString('en-IN')}</span>}
          </div>
          <div className="mt-5 flex flex-wrap gap-3 items-center">
            <div className="text-2xl font-semibold text-blue-700">{recruitment.totalVacancies} Vacancies</div>
            {recruitment.officialWebsite && <Button variant="outline" onClick={() => window.open(recruitment.officialWebsite, '_blank', 'noopener,noreferrer')}>Organisation Website <ExternalLink className="w-4 h-4 ml-2" /></Button>}
            {recruitment.officialNotificationUrl && <Button variant="outline" onClick={() => window.open(recruitment.officialNotificationUrl, '_blank', 'noopener,noreferrer')}>Official Notification <ExternalLink className="w-4 h-4 ml-2" /></Button>}
            {recruitment.officialApplicationUrl && <Button onClick={() => window.open(recruitment.officialApplicationUrl, '_blank', 'noopener,noreferrer')}>Apply on Official Website <ExternalLink className="w-4 h-4 ml-2" /></Button>}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {(recruitment.applicationFee || recruitment.selectionProcess || recruitment.importantInstructions) && (
          <Card className="p-5 mb-6 space-y-3">
            {recruitment.applicationFee && <div><h3 className="font-semibold text-gray-900">Application Fee</h3><p className="text-gray-700 whitespace-pre-wrap">{recruitment.applicationFee}</p></div>}
            {recruitment.selectionProcess && <div><h3 className="font-semibold text-gray-900">Selection Process</h3><p className="text-gray-700 whitespace-pre-wrap">{recruitment.selectionProcess}</p></div>}
            {recruitment.importantInstructions && <div><h3 className="font-semibold text-gray-900">Important Instructions</h3><p className="text-gray-700 whitespace-pre-wrap">{recruitment.importantInstructions}</p></div>}
          </Card>
        )}
        <Card className="p-5 mb-6">
          <h2 className="font-semibold text-lg mb-4">Filter Vacancies</h2>
          <div className="grid md:grid-cols-4 gap-3">
            <div className="relative"><Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" /><input className="w-full h-10 border rounded-md pl-9 pr-3" placeholder="Search vacancy rows" value={query} onChange={(e) => setQuery(e.target.value)} /></div>
            <SelectFilter value={post} onChange={setPost} options={posts} placeholder="All Posts" />
            <SelectFilter value={department} onChange={setDepartment} options={departments} placeholder="All Departments" />
            <SelectFilter value={speciality} onChange={setSpeciality} options={specialities} placeholder="All Specialities" />
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="p-5 border-b flex items-center justify-between"><div><h2 className="text-xl font-semibold">Vacancy Details</h2><p className="text-sm text-gray-500">{rows.length} searchable vacancy record(s)</p></div></div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-sm">
              <thead className="bg-gray-50"><tr><th className="p-3 text-left">Post</th><th className="p-3 text-left">Department</th><th className="p-3 text-left">Speciality</th><th className="p-3 text-left">Sub-speciality</th><th className="p-3 text-left">Category</th><th className="p-3 text-left">Vacancies</th><th className="p-3 text-left">Qualification</th><th className="p-3 text-left">Action</th></tr></thead>
              <tbody>
                {rows.map((v) => <tr key={v.id} className="border-t"><td className="p-3 font-medium">{v.postName}</td><td className="p-3">{v.department || '-'}</td><td className="p-3">{v.speciality || '-'}</td><td className="p-3">{v.subSpeciality || '-'}</td><td className="p-3">{v.category || '-'}</td><td className="p-3 font-semibold">{v.numberOfVacancies}</td><td className="p-3 max-w-sm">{v.qualification || 'See official notification'}</td><td className="p-3">{v.publishedJobId && <Button size="sm" variant="outline" onClick={() => navigate(`/job-detail/${v.publishedJobId}`)}>View Job</Button>}</td></tr>)}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}

function SelectFilter({ value, onChange, options, placeholder }: { value: string; onChange: (value: string) => void; options: string[]; placeholder: string }) {
  return <select className="w-full h-10 border rounded-md px-3 bg-white" value={value} onChange={(e) => onChange(e.target.value)}><option value="">{placeholder}</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select>;
}
