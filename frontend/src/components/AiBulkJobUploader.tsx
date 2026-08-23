import { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Download,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Search,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import {
  Recruitment,
  VacancyRecord,
  addVacancy,
  bulkSetVacancyStatus,
  bulkUpdateVacancies,
  deleteVacancy,
  downloadRecruitmentExport,
  duplicateVacancy,
  extractRecruitment,
  fetchRecruitment,
  publishApprovedVacancies,
  updateRecruitment,
  updateVacancy,
  verifyRecruitment,
} from '../api/recruitments';

interface Props {
  onNavigate: (page: string) => void;
}

const emptyBulk = { location: '', qualification: '', salary: '', jobType: '' };

export function AiBulkJobUploader({ onNavigate }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [recruitment, setRecruitment] = useState<Recruitment | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState('');
  const [bulkFields, setBulkFields] = useState(emptyBulk);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const rows = useMemo(() => {
    if (!recruitment) return [];
    const q = filter.trim().toLowerCase();
    if (!q) return recruitment.vacancies || [];
    return (recruitment.vacancies || []).filter((v) =>
      [v.postName, v.department, v.speciality, v.subSpeciality, v.category, v.qualification, v.location]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q)),
    );
  }, [recruitment, filter]);

  const replaceRow = (row: VacancyRecord) => {
    setRecruitment((current) => current ? {
      ...current,
      vacancies: current.vacancies.map((v) => v.id === row.id ? row : v),
    } : current);
  };

  const reloadRecruitment = async (id: string) => {
    const latest = await fetchRecruitment(id);
    setRecruitment(latest);
    return latest;
  };

  const processFile = async (forceCreate = false) => {
    if (!file) {
      toast.error('Select a recruitment PDF first.');
      return;
    }
    setProcessing(true);
    try {
      const result = await extractRecruitment(file, forceCreate);
      setRecruitment(result.recruitment);
      setDuplicateWarning(result.duplicate && !result.created);
      setSelected(new Set());
      if (result.duplicate && !result.created) {
        toast.warning('Possible duplicate found. Existing recruitment loaded for review.');
      } else {
        toast.success('PDF extracted. Review every row before publishing.');
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.error || error?.message || 'PDF extraction failed.');
    } finally {
      setProcessing(false);
    }
  };

  const saveMaster = async () => {
    if (!recruitment) return;
    try {
      const saved = await updateRecruitment(recruitment.id, {
        organisationName: recruitment.organisationName,
        title: recruitment.title,
        advertisementNumber: recruitment.advertisementNumber,
        recruitmentYear: recruitment.recruitmentYear,
        sector: recruitment.sector,
        location: recruitment.location,
        applicationStartDate: recruitment.applicationStartDate,
        applicationLastDate: recruitment.applicationLastDate,
        applicationFee: recruitment.applicationFee,
        selectionProcess: recruitment.selectionProcess,
        officialNotificationUrl: recruitment.officialNotificationUrl,
        officialApplicationUrl: recruitment.officialApplicationUrl,
        officialWebsite: recruitment.officialWebsite,
        importantInstructions: recruitment.importantInstructions,
      });
      setRecruitment(saved);
      toast.success('Recruitment details saved.');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Unable to save recruitment.');
    }
  };

  const saveRow = async (row: VacancyRecord) => {
    if (!recruitment) return;
    setSavingId(row.id);
    try {
      const saved = await updateVacancy(recruitment.id, row.id, row);
      replaceRow(saved);
      toast.success('Vacancy updated.');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Unable to update vacancy.');
    } finally {
      setSavingId(null);
    }
  };

  const runBulkStatus = async (status: VacancyRecord['status']) => {
    if (!recruitment || selected.size === 0) {
      toast.error('Select at least one vacancy row.');
      return;
    }
    setActionLoading(status);
    try {
      const result = await bulkSetVacancyStatus(recruitment.id, [...selected], status);
      await reloadRecruitment(recruitment.id);
      toast.success(`${result.updatedCount} row(s) marked ${status.replace('_', ' ').toLowerCase()}.`);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Bulk status update failed.');
    } finally {
      setActionLoading(null);
    }
  };

  const runBulkEdit = async () => {
    if (!recruitment || selected.size === 0) {
      toast.error('Select at least one vacancy row.');
      return;
    }
    const updates = Object.fromEntries(Object.entries(bulkFields).filter(([, value]) => value.trim()));
    if (Object.keys(updates).length === 0) {
      toast.error('Enter at least one common field to apply.');
      return;
    }
    setActionLoading('bulk-edit');
    try {
      await bulkUpdateVacancies(recruitment.id, [...selected], updates);
      await reloadRecruitment(recruitment.id);
      setBulkFields(emptyBulk);
      toast.success(`Bulk-edited ${selected.size} row(s).`);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Bulk edit failed.');
    } finally {
      setActionLoading(null);
    }
  };

  const addBlankRow = async () => {
    if (!recruitment) return;
    try {
      const added = await addVacancy(recruitment.id, {
        postName: 'New Vacancy',
        department: '',
        speciality: '',
        numberOfVacancies: 1,
        status: 'NEEDS_REVIEW',
      });
      setRecruitment({ ...recruitment, vacancies: [...recruitment.vacancies, added] });
      toast.success('New review row added.');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Unable to add vacancy.');
    }
  };

  const removeRow = async (row: VacancyRecord) => {
    if (!recruitment || !window.confirm(`Delete ${row.postName} / ${row.speciality || row.department || 'vacancy'}?`)) return;
    try {
      await deleteVacancy(recruitment.id, row.id);
      setRecruitment({ ...recruitment, vacancies: recruitment.vacancies.filter((v) => v.id !== row.id) });
      setSelected((current) => {
        const next = new Set(current);
        next.delete(row.id);
        return next;
      });
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Unable to delete vacancy.');
    }
  };

  const duplicateRow = async (row: VacancyRecord) => {
    if (!recruitment) return;
    try {
      const copy = await duplicateVacancy(recruitment.id, row.id);
      setRecruitment({ ...recruitment, vacancies: [...recruitment.vacancies, copy] });
      toast.success('Vacancy duplicated for editing.');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Unable to duplicate vacancy.');
    }
  };

  const splitRow = async (row: VacancyRecord) => {
    if (!recruitment || row.numberOfVacancies <= 1) {
      toast.error('Only rows with more than one vacancy can be split.');
      return;
    }
    const raw = window.prompt(`How many vacancies should move to the new row? (1-${row.numberOfVacancies - 1})`, '1');
    if (!raw) return;
    const count = Number(raw);
    if (!Number.isInteger(count) || count < 1 || count >= row.numberOfVacancies) {
      toast.error('Enter a valid split count.');
      return;
    }
    try {
      const updated = await updateVacancy(recruitment.id, row.id, { numberOfVacancies: row.numberOfVacancies - count });
      const copy = await duplicateVacancy(recruitment.id, row.id);
      const split = await updateVacancy(recruitment.id, copy.id, { numberOfVacancies: count });
      setRecruitment({
        ...recruitment,
        vacancies: [...recruitment.vacancies.map((v) => v.id === row.id ? updated : v), split],
      });
      toast.success('Vacancy row split. Review both rows.');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Unable to split vacancy.');
    }
  };

  const mergeSelected = async () => {
    if (!recruitment || selected.size < 2) {
      toast.error('Select at least two compatible rows to merge.');
      return;
    }
    const candidates = recruitment.vacancies.filter((v) => selected.has(v.id));
    const first = candidates[0];
    const compatible = candidates.every((v) =>
      v.postName === first.postName &&
      (v.department || '') === (first.department || '') &&
      (v.speciality || '') === (first.speciality || '') &&
      (v.category || '') === (first.category || '') &&
      v.status !== 'PUBLISHED',
    );
    if (!compatible) {
      toast.error('Merge requires the same post, department, speciality and category, and unpublished rows.');
      return;
    }
    try {
      const total = candidates.reduce((sum, v) => sum + v.numberOfVacancies, 0);
      const merged = await updateVacancy(recruitment.id, first.id, { numberOfVacancies: total });
      for (const row of candidates.slice(1)) await deleteVacancy(recruitment.id, row.id);
      const deleted = new Set(candidates.slice(1).map((v) => v.id));
      setRecruitment({
        ...recruitment,
        vacancies: recruitment.vacancies.filter((v) => !deleted.has(v.id)).map((v) => v.id === merged.id ? merged : v),
      });
      setSelected(new Set([merged.id]));
      toast.success('Selected vacancy rows merged.');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Unable to merge vacancy rows.');
    }
  };

  const verify = async () => {
    if (!recruitment) return;
    setActionLoading('verify');
    try {
      await verifyRecruitment(recruitment.id);
      await reloadRecruitment(recruitment.id);
      toast.success('Official source verification recorded.');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Verification requirements are incomplete.');
    } finally {
      setActionLoading(null);
    }
  };

  const publish = async () => {
    if (!recruitment) return;
    if (!window.confirm('Publish all APPROVED vacancy rows? Published vacancies become active searchable jobs.')) return;
    setActionLoading('publish');
    try {
      const result = await publishApprovedVacancies(recruitment.id);
      await reloadRecruitment(recruitment.id);
      if (result.failedCount) {
        toast.error(`${result.publishedCount} published, ${result.failedCount} failed. Retry is safe.`);
      } else {
        toast.success(`${result.publishedCount} approved vacancy row(s) published.`);
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Publish failed.');
    } finally {
      setActionLoading(null);
    }
  };

  const copyAll = async () => {
    if (!recruitment) return;
    const text = [
      `RECRUITMENT: ${recruitment.title}`,
      `ORGANISATION: ${recruitment.organisationName}`,
      `TOTAL VACANCIES: ${recruitment.totalVacancies}`,
      '',
      ...recruitment.vacancies.map((v) => [
        `POST: ${v.postName}`,
        `DEPARTMENT: ${v.department || '-'}`,
        `SPECIALITY: ${v.speciality || '-'}`,
        `SUB-SPECIALITY: ${v.subSpeciality || '-'}`,
        `VACANCIES: ${v.numberOfVacancies}`,
        `CATEGORY: ${v.category || '-'}`,
        `STATUS: ${v.status}`,
        '',
      ].join('\n')),
    ].join('\n');
    await navigator.clipboard.writeText(text);
    toast.success('Structured recruitment data copied.');
  };

  const updateLocalRow = (id: string, key: keyof VacancyRecord, value: any) => {
    setRecruitment((current) => current ? {
      ...current,
      vacancies: current.vacancies.map((v) => v.id === id ? { ...v, [key]: value } : v),
    } : current);
  };

  const selectedCount = selected.size;
  const allVisibleSelected = rows.length > 0 && rows.every((v) => selected.has(v.id));
  const approved = recruitment?.vacancies.filter((v) => v.status === 'APPROVED').length || 0;
  const needsReview = recruitment?.vacancies.filter((v) => v.status === 'NEEDS_REVIEW').length || 0;
  const published = recruitment?.vacancies.filter((v) => v.status === 'PUBLISHED').length || 0;
  const structuredTotal = recruitment?.vacancies.reduce((sum, v) => sum + v.numberOfVacancies, 0) || 0;
  const vacancyTotalMatches = recruitment ? structuredTotal === recruitment.totalVacancies : true;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-[1600px]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-7 h-7 text-blue-600" />
              <h1 className="text-3xl font-semibold text-gray-900">AI Bulk Job Uploader</h1>
            </div>
            <p className="text-gray-600">Upload one recruitment PDF, review structured vacancy records, verify the official source, then publish approved rows in bulk.</p>
          </div>
          <Button variant="outline" onClick={() => onNavigate('dashboard/admin')}>Back to Admin</Button>
        </div>

        <Card className="p-6 mb-6">
          <div className="grid lg:grid-cols-[1fr_auto] gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Recruitment notification PDF</label>
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-5 bg-white cursor-pointer hover:border-blue-400"
                onClick={() => fileRef.current?.click()}
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
                <div className="flex items-center gap-3">
                  <Upload className="w-7 h-7 text-blue-600" />
                  <div>
                    <p className="font-medium text-gray-900">{file?.name || 'Choose a PDF notification'}</p>
                    <p className="text-sm text-gray-500">PDF only, maximum 20 MB. Extracted data is never auto-published.</p>
                  </div>
                </div>
              </div>
            </div>
            <Button onClick={() => processFile(false)} disabled={!file || processing} className="h-11 px-6">
              {processing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
              Extract Recruitment
            </Button>
          </div>
        </Card>

        {duplicateWarning && recruitment && (
          <div className="mb-6 border border-amber-300 bg-amber-50 rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-900">Possible duplicate recruitment found</p>
                <p className="text-sm text-amber-800">The existing recruitment was loaded. Use it, or deliberately create a revision so duplicate uploads are not created silently.</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => processFile(true)} disabled={processing}>
              <RefreshCw className="w-4 h-4 mr-2" />Create Revision
            </Button>
          </div>
        )}

        {recruitment?.extractionMethod === 'OCR_REQUIRED' && (
          <div className="mb-6 border border-amber-300 bg-amber-50 rounded-lg p-4 flex gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-amber-900">Scanned PDF detected — OCR is required</p>
              <p className="text-sm text-amber-800">Enable the configured OCR worker (MEDEX_OCR_ENABLED=true with Tesseract installed) and re-upload this notification. Do not approve an empty or partial extraction.</p>
            </div>
          </div>
        )}

        {recruitment && (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-6 gap-4 mb-4">
              <Stat label="Notification Total" value={recruitment.totalVacancies} />
              <Stat label="Structured Total" value={structuredTotal} tone={!vacancyTotalMatches ? 'amber' : 'gray'} />
              <Stat label="Vacancy Records" value={recruitment.vacancies.length} />
              <Stat label="Needs Review" value={needsReview} tone="amber" />
              <Stat label="Approved" value={approved} tone="green" />
              <Stat label="Published" value={published} tone="blue" />
            </div>
            {!vacancyTotalMatches && (
              <div className="mb-6 border border-amber-300 bg-amber-50 text-amber-900 rounded-lg p-3 flex gap-2 items-start">
                <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
                <span className="text-sm">The structured vacancy total does not match the notification total. Review missing, duplicated, or incorrectly split rows before approval.</span>
              </div>
            )}

            <Card className="p-6 mb-6">
              <div className="flex items-center justify-between gap-3 mb-5">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Master Recruitment</h2>
                  <p className="text-sm text-gray-500">Extraction method: {recruitment.extractionMethod || 'Unknown'} · Status: {recruitment.status}</p>
                </div>
                <Button onClick={saveMaster}><Save className="w-4 h-4 mr-2" />Save Details</Button>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Field label="Organisation" value={recruitment.organisationName} onChange={(value) => setRecruitment({ ...recruitment, organisationName: value })} />
                <Field label="Recruitment Title" value={recruitment.title} onChange={(value) => setRecruitment({ ...recruitment, title: value })} />
                <Field label="Advertisement No." value={recruitment.advertisementNumber || ''} onChange={(value) => setRecruitment({ ...recruitment, advertisementNumber: value })} />
                <Field label="Recruitment Year" type="number" value={recruitment.recruitmentYear || ''} onChange={(value) => setRecruitment({ ...recruitment, recruitmentYear: Number(value) || undefined })} />
                <Field label="Location" value={recruitment.location || ''} onChange={(value) => setRecruitment({ ...recruitment, location: value })} />
                <Field label="Start Date" type="date" value={recruitment.applicationStartDate || ''} onChange={(value) => setRecruitment({ ...recruitment, applicationStartDate: value })} />
                <Field label="Last Date" type="date" value={recruitment.applicationLastDate || ''} onChange={(value) => setRecruitment({ ...recruitment, applicationLastDate: value })} />
                <Field label="Application Fee" value={recruitment.applicationFee || ''} onChange={(value) => setRecruitment({ ...recruitment, applicationFee: value })} />
                <label className="block">
                  <span className="block text-sm font-medium text-gray-700 mb-1">Sector</span>
                  <select className="w-full h-10 rounded-md border border-gray-300 px-3 bg-white" value={recruitment.sector} onChange={(e) => setRecruitment({ ...recruitment, sector: e.target.value as Recruitment['sector'] })}>
                    <option value="government">Government</option>
                    <option value="private">Private</option>
                  </select>
                </label>
                <Field label="Official Notification URL" value={recruitment.officialNotificationUrl || ''} onChange={(value) => setRecruitment({ ...recruitment, officialNotificationUrl: value })} />
                <Field label="Official Application URL" value={recruitment.officialApplicationUrl || ''} onChange={(value) => setRecruitment({ ...recruitment, officialApplicationUrl: value })} />
                <Field label="Official Organisation Website" value={recruitment.officialWebsite || ''} onChange={(value) => setRecruitment({ ...recruitment, officialWebsite: value })} />
                <Field label="Selection Process" value={recruitment.selectionProcess || ''} onChange={(value) => setRecruitment({ ...recruitment, selectionProcess: value })} />
                <Field label="Important Instructions" value={recruitment.importantInstructions || ''} onChange={(value) => setRecruitment({ ...recruitment, importantInstructions: value })} />
              </div>
              <div className="flex flex-wrap gap-2 mt-5 items-center">
                <Button variant="outline" onClick={verify} disabled={recruitment.officialSourceVerified || actionLoading === 'verify'}>
                  {actionLoading === 'verify' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                  {recruitment.officialSourceVerified ? 'Official Source Verified' : 'Verify Official Source'}
                </Button>
                {recruitment.sector === 'government' && !recruitment.officialSourceVerified && (
                  <span className="text-sm text-amber-700">Government jobs cannot be published until official notification, application and organisation URLs are verified.</span>
                )}
              </div>
            </Card>

            <Card className="p-5 mb-6">
              <div className="flex flex-col xl:flex-row xl:items-end gap-3 justify-between">
                <div className="flex-1 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <Field label="Bulk Location" value={bulkFields.location} onChange={(value) => setBulkFields({ ...bulkFields, location: value })} />
                  <Field label="Bulk Qualification" value={bulkFields.qualification} onChange={(value) => setBulkFields({ ...bulkFields, qualification: value })} />
                  <Field label="Bulk Salary" value={bulkFields.salary} onChange={(value) => setBulkFields({ ...bulkFields, salary: value })} />
                  <Field label="Bulk Job Type" value={bulkFields.jobType} onChange={(value) => setBulkFields({ ...bulkFields, jobType: value })} />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={runBulkEdit} disabled={!selectedCount || !!actionLoading}>
                    {actionLoading === 'bulk-edit' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Apply Bulk Edit ({selectedCount})
                  </Button>
                  <Button variant="outline" onClick={() => runBulkStatus('APPROVED')} disabled={!selectedCount || !!actionLoading}>
                    {actionLoading === 'APPROVED' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Approve
                  </Button>
                  <Button variant="outline" onClick={() => runBulkStatus('REJECTED')} disabled={!selectedCount || !!actionLoading}>
                    {actionLoading === 'REJECTED' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Reject
                  </Button>
                  <Button variant="outline" onClick={mergeSelected} disabled={selectedCount < 2 || !!actionLoading}>Merge</Button>
                </div>
              </div>
            </Card>

            <Card className="overflow-hidden mb-6">
              <div className="p-5 border-b flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">AI Review Table</h2>
                  <p className="text-sm text-gray-500">Edit, add, duplicate, split, merge, approve or reject individual vacancy rows.</p>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                    <input className="h-10 border rounded-md pl-9 pr-3 w-64" placeholder="Filter vacancy rows" value={filter} onChange={(e) => setFilter(e.target.value)} />
                  </div>
                  <Button variant="outline" onClick={addBlankRow}><Plus className="w-4 h-4 mr-2" />Add Row</Button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[1500px] text-sm">
                  <thead className="bg-gray-50 text-gray-700">
                    <tr>
                      <th className="p-3 text-left w-10">
                        <input type="checkbox" checked={allVisibleSelected} onChange={(e) => {
                          const next = new Set(selected);
                          rows.forEach((v) => e.target.checked ? next.add(v.id) : next.delete(v.id));
                          setSelected(next);
                        }} />
                      </th>
                      <th className="p-3 text-left">Post</th><th className="p-3 text-left">Department</th><th className="p-3 text-left">Speciality</th>
                      <th className="p-3 text-left">Sub-speciality</th><th className="p-3 text-left w-24">Category</th><th className="p-3 text-left w-24">Vacancies</th>
                      <th className="p-3 text-left">Qualification</th><th className="p-3 text-left">Location</th><th className="p-3 text-left w-28">Confidence</th>
                      <th className="p-3 text-left w-32">Status</th><th className="p-3 text-left w-56">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.id} className="border-t align-top bg-white">
                        <td className="p-3"><input type="checkbox" checked={selected.has(row.id)} onChange={(e) => {
                          const next = new Set(selected); e.target.checked ? next.add(row.id) : next.delete(row.id); setSelected(next);
                        }} /></td>
                        <Editable value={row.postName} onChange={(value) => updateLocalRow(row.id, 'postName', value)} />
                        <Editable value={row.department || ''} onChange={(value) => updateLocalRow(row.id, 'department', value)} />
                        <Editable value={row.speciality || ''} onChange={(value) => updateLocalRow(row.id, 'speciality', value)} />
                        <Editable value={row.subSpeciality || ''} onChange={(value) => updateLocalRow(row.id, 'subSpeciality', value)} />
                        <Editable value={row.category || ''} onChange={(value) => updateLocalRow(row.id, 'category', value)} />
                        <td className="p-2"><input type="number" min={1} className="w-20 border rounded px-2 py-1.5" value={row.numberOfVacancies} onChange={(e) => updateLocalRow(row.id, 'numberOfVacancies', Number(e.target.value))} /></td>
                        <Editable value={row.qualification || ''} onChange={(value) => updateLocalRow(row.id, 'qualification', value)} wide />
                        <Editable value={row.location || ''} onChange={(value) => updateLocalRow(row.id, 'location', value)} />
                        <td className="p-3">
                          <Badge className={(row.confidenceScore || 0) >= 0.9 ? 'bg-green-100 text-green-800' : (row.confidenceScore || 0) >= 0.75 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}>
                            {Math.round((row.confidenceScore || 0) * 100)}%
                          </Badge>
                          {(row.confidenceScore || 0) < 0.8 && <div className="text-xs text-amber-700 mt-1">Needs review</div>}
                        </td>
                        <td className="p-3"><Badge variant="outline">{row.status.replace('_', ' ')}</Badge></td>
                        <td className="p-2">
                          <div className="flex flex-wrap gap-1">
                            <Button size="sm" variant="outline" onClick={() => saveRow(row)} disabled={savingId === row.id} title="Save row">
                              {savingId === row.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => duplicateRow(row)} title="Duplicate"><Copy className="w-3.5 h-3.5" /></Button>
                            <Button size="sm" variant="outline" onClick={() => splitRow(row)} title="Split">Split</Button>
                            <Button size="sm" variant="outline" onClick={() => removeRow(row)} title="Delete" disabled={row.status === 'PUBLISHED'}><Trash2 className="w-3.5 h-3.5" /></Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rows.length === 0 && <div className="py-12 text-center text-gray-500">No vacancy rows match the current filter.</div>}
              </div>
            </Card>

            <div className="flex flex-col xl:flex-row gap-3 justify-between items-start xl:items-center bg-white border rounded-lg p-4">
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={copyAll}><Copy className="w-4 h-4 mr-2" />Copy All</Button>
                {(['csv', 'xlsx', 'json'] as const).map((format) => (
                  <Button key={format} variant="outline" onClick={() => downloadRecruitmentExport(recruitment.id, format)}>
                    <Download className="w-4 h-4 mr-2" />{format.toUpperCase()}
                  </Button>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600">Only APPROVED rows are published. AI extraction itself never publishes.</span>
                <span title={publishDisabledReason(approved, recruitment)}>
                  <Button
                    onClick={publish}
                    disabled={approved === 0 || (recruitment.sector === 'government' && !recruitment.officialSourceVerified) || actionLoading === 'publish'}
                  >
                    {actionLoading === 'publish' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
                    Publish All Approved ({approved})
                  </Button>
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, tone = 'gray' }: { label: string; value: number; tone?: 'gray' | 'amber' | 'green' | 'blue' }) {
  const classes = tone === 'amber' ? 'border-amber-200 bg-amber-50' : tone === 'green' ? 'border-green-200 bg-green-50' : tone === 'blue' ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-white';
  return <Card className={`p-4 ${classes}`}><p className="text-sm text-gray-600">{label}</p><p className="text-2xl font-semibold text-gray-900 mt-1">{value}</p></Card>;
}

function publishDisabledReason(approved: number, recruitment: Recruitment) {
  if (approved === 0) return 'Approve at least one vacancy row before publishing.';
  if (recruitment.sector === 'government' && !recruitment.officialSourceVerified) {
    return 'Government recruitment cannot be published until official notification, application and organisation URLs are verified.';
  }
  return 'Publish all approved vacancy rows as candidate-facing jobs.';
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string | number; onChange: (value: string) => void; type?: string }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-gray-700 mb-1">{label}</span>
      <input type={type} className="w-full h-10 rounded-md border border-gray-300 px-3 bg-white" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function Editable({ value, onChange, wide = false }: { value: string; onChange: (value: string) => void; wide?: boolean }) {
  return <td className="p-2"><input className={`border rounded px-2 py-1.5 ${wide ? 'w-72' : 'w-44'}`} value={value} onChange={(e) => onChange(e.target.value)} /></td>;
}
