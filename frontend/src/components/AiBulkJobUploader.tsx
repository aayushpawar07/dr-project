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
      [
        v.postName, v.department, v.speciality, v.subSpeciality, v.category,
        v.qualification, v.experience, v.ageLimit, v.salary, v.payLevel,
        v.payScale, v.jobType, v.location, v.otherEligibilityRequirements,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q)),
    );
  }, [recruitment, filter]);

  const selectedCount = selected.size;
  const approved = recruitment?.vacancies.filter((v) => v.status === 'APPROVED').length || 0;
  const needsReview = recruitment?.vacancies.filter((v) => v.status === 'NEEDS_REVIEW').length || 0;
  const published = recruitment?.vacancies.filter((v) => v.status === 'PUBLISHED').length || 0;
  const structuredTotal = recruitment?.vacancies.reduce((sum, v) => sum + Number(v.numberOfVacancies || 0), 0) || 0;
  const vacancyTotalMatches = recruitment ? structuredTotal === recruitment.totalVacancies : true;

  const reloadRecruitment = async (id: string) => {
    const latest = await fetchRecruitment(id);
    setRecruitment(latest);
    return latest;
  };

  const updateLocalRow = (id: string, key: keyof VacancyRecord, value: any) => {
    setRecruitment((current) => current ? {
      ...current,
      vacancies: current.vacancies.map((v) => v.id === id ? { ...v, [key]: value } : v),
    } : current);
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
      toast.success(result.duplicate && !result.created
        ? 'Existing recruitment loaded for review.'
        : 'Gemini extraction complete. Review every vacancy before publishing.');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || error?.message || 'PDF extraction failed.');
    } finally {
      setProcessing(false);
    }
  };

  const saveMaster = async () => {
    if (!recruitment) return;
    setActionLoading('master');
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
    } finally {
      setActionLoading(null);
    }
  };

  const saveRow = async (row: VacancyRecord) => {
    if (!recruitment) return;
    setSavingId(row.id);
    try {
      const saved = await updateVacancy(recruitment.id, row.id, row);
      setRecruitment((current) => current ? {
        ...current,
        vacancies: current.vacancies.map((v) => v.id === saved.id ? saved : v),
      } : current);
      toast.success(`${row.postName} saved.`);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Unable to update vacancy.');
    } finally {
      setSavingId(null);
    }
  };

  const runBulkStatus = async (status: VacancyRecord['status']) => {
    if (!recruitment || selected.size === 0) {
      toast.error('Select at least one vacancy.');
      return;
    }
    setActionLoading(status);
    try {
      const result = await bulkSetVacancyStatus(recruitment.id, [...selected], status);
      await reloadRecruitment(recruitment.id);
      toast.success(`${result.updatedCount} vacancy row(s) updated.`);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Bulk status update failed.');
    } finally {
      setActionLoading(null);
    }
  };

  const runBulkEdit = async () => {
    if (!recruitment || selected.size === 0) {
      toast.error('Select at least one vacancy.');
      return;
    }
    const updates = Object.fromEntries(Object.entries(bulkFields).filter(([, value]) => value.trim()));
    if (!Object.keys(updates).length) {
      toast.error('Enter at least one manual override.');
      return;
    }
    setActionLoading('bulk-edit');
    try {
      await bulkUpdateVacancies(recruitment.id, [...selected], updates);
      await reloadRecruitment(recruitment.id);
      setBulkFields(emptyBulk);
      toast.success(`Manual overrides applied to ${selected.size} row(s).`);
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
        numberOfVacancies: 1,
        status: 'NEEDS_REVIEW',
      });
      setRecruitment({ ...recruitment, vacancies: [...recruitment.vacancies, added] });
      toast.success('Blank vacancy row added.');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Unable to add vacancy.');
    }
  };

  const duplicateRow = async (row: VacancyRecord) => {
    if (!recruitment) return;
    try {
      const copy = await duplicateVacancy(recruitment.id, row.id);
      setRecruitment({ ...recruitment, vacancies: [...recruitment.vacancies, copy] });
      toast.success('Vacancy duplicated.');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Unable to duplicate vacancy.');
    }
  };

  const removeRow = async (row: VacancyRecord) => {
    if (!recruitment || row.status === 'PUBLISHED') return;
    if (!window.confirm(`Delete ${row.postName}?`)) return;
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

  const splitRow = async (row: VacancyRecord) => {
    if (!recruitment || row.numberOfVacancies <= 1) {
      toast.error('Only rows with more than one vacancy can be split.');
      return;
    }
    const raw = window.prompt(`Move how many vacancies to a new row? (1-${row.numberOfVacancies - 1})`, '1');
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
      toast.success('Vacancy row split.');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Unable to split vacancy.');
    }
  };

  const mergeSelected = async () => {
    if (!recruitment || selected.size < 2) {
      toast.error('Select at least two compatible rows.');
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
      toast.error('Merge requires the same post, department, speciality and category.');
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
      toast.success('Selected rows merged.');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Unable to merge rows.');
    }
  };

  const verify = async () => {
    if (!recruitment) return;
    setActionLoading('verify');
    try {
      const saved = await verifyRecruitment(recruitment.id);
      setRecruitment(saved);
      toast.success('Official source verified.');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Verification requirements are incomplete.');
    } finally {
      setActionLoading(null);
    }
  };

  const publish = async () => {
    if (!recruitment || !approved) return;
    if (!window.confirm('Publish all APPROVED vacancy rows?')) return;
    setActionLoading('publish');
    try {
      const result = await publishApprovedVacancies(recruitment.id);
      await reloadRecruitment(recruitment.id);
      if (result.failedCount) toast.error(`${result.publishedCount} published, ${result.failedCount} failed.`);
      else toast.success(`${result.publishedCount} approved vacancy row(s) published.`);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Publish failed.');
    } finally {
      setActionLoading(null);
    }
  };

  const copyAll = async () => {
    if (!recruitment) return;
    const text = recruitment.vacancies.map((v) => [
      `Post: ${v.postName}`,
      `Department: ${v.department || '-'}`,
      `Speciality: ${v.speciality || '-'}`,
      `Vacancies: ${v.numberOfVacancies}`,
      `Qualification: ${v.qualification || '-'}`,
      `Experience: ${v.experience || '-'}`,
      `Salary: ${v.salary || '-'}`,
      `Job Type: ${v.jobType || '-'}`,
      `Location: ${v.location || '-'}`,
    ].join('\n')).join('\n\n');
    await navigator.clipboard.writeText(text);
    toast.success('Vacancy data copied.');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto max-w-[1500px] px-4 py-8">
        <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-7 w-7 text-blue-600" />
              <h1 className="text-3xl font-bold text-slate-950">AI Bulk Job Uploader</h1>
            </div>
            <p className="mt-1 text-slate-600">Gemini extracts the PDF. You review every field before anything is published.</p>
          </div>
          <Button variant="outline" onClick={() => onNavigate('dashboard/admin')}>Back to Admin</Button>
        </div>

        <Card className="mb-6 p-6">
          <div className="grid items-end gap-4 lg:grid-cols-[1fr_auto]">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Recruitment notification PDF</label>
              <button type="button" onClick={() => fileRef.current?.click()} className="w-full rounded-xl border-2 border-dashed border-blue-200 bg-blue-50/40 p-5 text-left transition hover:border-blue-400 hover:bg-blue-50">
                <input ref={fileRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                <div className="flex items-center gap-3">
                  <Upload className="h-7 w-7 text-blue-600" />
                  <div>
                    <p className="font-semibold text-slate-900">{file?.name || 'Choose a PDF notification'}</p>
                    <p className="text-sm text-slate-500">PDF only, maximum 20 MB. AI extraction never auto-publishes.</p>
                  </div>
                </div>
              </button>
            </div>
            <Button onClick={() => processFile(false)} disabled={!file || processing} className="h-11 bg-blue-600 px-6 hover:bg-blue-700">
              {processing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              {processing ? 'Extracting with Gemini…' : 'Extract Recruitment'}
            </Button>
          </div>
        </Card>

        {duplicateWarning && recruitment && (
          <div className="mb-6 flex flex-col justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 md:flex-row md:items-center">
            <div className="flex gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" />
              <div><p className="font-semibold text-amber-900">Possible duplicate recruitment found</p><p className="text-sm text-amber-800">The existing record is loaded. Create a revision only when the PDF is genuinely revised.</p></div>
            </div>
            <Button variant="outline" onClick={() => processFile(true)} disabled={processing}><RefreshCw className="mr-2 h-4 w-4" />Create Revision</Button>
          </div>
        )}

        {recruitment && (
          <>
            <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-5">
              <Stat label="Notification Total" value={recruitment.totalVacancies} />
              <Stat label="Structured Total" value={structuredTotal} tone={vacancyTotalMatches ? 'default' : 'warning'} />
              <Stat label="Needs Review" value={needsReview} tone="warning" />
              <Stat label="Approved" value={approved} tone="success" />
              <Stat label="Published" value={published} tone="info" />
            </div>

            {!vacancyTotalMatches && (
              <div className="mb-5 flex gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                <AlertTriangle className="h-5 w-5 shrink-0" />The structured vacancy total does not match the notification total. Review the rows before approval.
              </div>
            )}

            <Card className="mb-6 p-6">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-slate-950">Master Recruitment</h2>
                  <p className="text-sm text-slate-500">Extraction method: {recruitment.extractionMethod || 'Unknown'} · Status: {recruitment.status}</p>
                </div>
                <Button onClick={saveMaster} disabled={actionLoading === 'master'}>{actionLoading === 'master' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Save Details</Button>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Field label="Organisation" value={recruitment.organisationName} onChange={(value) => setRecruitment({ ...recruitment, organisationName: value })} />
                <Field label="Recruitment Title" value={recruitment.title} onChange={(value) => setRecruitment({ ...recruitment, title: value })} />
                <Field label="Advertisement No." value={recruitment.advertisementNumber || ''} onChange={(value) => setRecruitment({ ...recruitment, advertisementNumber: value })} />
                <Field label="Recruitment Year" type="number" value={recruitment.recruitmentYear || ''} onChange={(value) => setRecruitment({ ...recruitment, recruitmentYear: Number(value) || undefined })} />
                <Field label="Recruitment-wide Location" value={recruitment.location || ''} onChange={(value) => setRecruitment({ ...recruitment, location: value })} />
                <Field label="Application Start Date" type="date" value={recruitment.applicationStartDate || ''} onChange={(value) => setRecruitment({ ...recruitment, applicationStartDate: value })} />
                <Field label="Last Date" type="date" value={recruitment.applicationLastDate || ''} onChange={(value) => setRecruitment({ ...recruitment, applicationLastDate: value })} />
                <Field label="Application Fee" value={recruitment.applicationFee || ''} onChange={(value) => setRecruitment({ ...recruitment, applicationFee: value })} />
                <label className="block"><span className="mb-1 block text-sm font-medium text-slate-700">Sector</span><select className="h-10 w-full rounded-md border border-slate-300 bg-white px-3" value={recruitment.sector} onChange={(e) => setRecruitment({ ...recruitment, sector: e.target.value as Recruitment['sector'] })}><option value="government">Government</option><option value="private">Private</option></select></label>
                <Field label="Official Notification URL" value={recruitment.officialNotificationUrl || ''} onChange={(value) => setRecruitment({ ...recruitment, officialNotificationUrl: value })} />
                <Field label="Official Application URL" value={recruitment.officialApplicationUrl || ''} onChange={(value) => setRecruitment({ ...recruitment, officialApplicationUrl: value })} />
                <Field label="Organisation Website" value={recruitment.officialWebsite || ''} onChange={(value) => setRecruitment({ ...recruitment, officialWebsite: value })} />
                <Field label="Selection Process" value={recruitment.selectionProcess || ''} onChange={(value) => setRecruitment({ ...recruitment, selectionProcess: value })} />
                <Field label="Important Instructions" value={recruitment.importantInstructions || ''} onChange={(value) => setRecruitment({ ...recruitment, importantInstructions: value })} />
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <Button variant="outline" onClick={verify} disabled={recruitment.officialSourceVerified || actionLoading === 'verify'}>{actionLoading === 'verify' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}{recruitment.officialSourceVerified ? 'Official Source Verified' : 'Verify Official Source'}</Button>
                {recruitment.sector === 'government' && !recruitment.officialSourceVerified && <span className="text-sm text-amber-700">Government jobs require official source verification before publishing.</span>}
              </div>
            </Card>

            <Card className="mb-6 p-5">
              <div className="mb-3">
                <h2 className="font-bold text-slate-900">Bulk edit selected rows <span className="font-normal text-slate-500">(optional manual override)</span></h2>
                <p className="text-sm text-slate-500">These fields are not Gemini output. Use them only when you intentionally want to overwrite the same value across selected rows.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Location" value={bulkFields.location} onChange={(value) => setBulkFields({ ...bulkFields, location: value })} />
                <Field label="Qualification" value={bulkFields.qualification} onChange={(value) => setBulkFields({ ...bulkFields, qualification: value })} />
                <Field label="Salary" value={bulkFields.salary} onChange={(value) => setBulkFields({ ...bulkFields, salary: value })} />
                <Field label="Job Type" value={bulkFields.jobType} onChange={(value) => setBulkFields({ ...bulkFields, jobType: value })} />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="outline" onClick={runBulkEdit} disabled={!selectedCount || !!actionLoading}>Apply Override ({selectedCount})</Button>
                <Button variant="outline" onClick={() => runBulkStatus('APPROVED')} disabled={!selectedCount || !!actionLoading}>Approve ({selectedCount})</Button>
                <Button variant="outline" onClick={() => runBulkStatus('REJECTED')} disabled={!selectedCount || !!actionLoading}>Reject ({selectedCount})</Button>
                <Button variant="outline" onClick={mergeSelected} disabled={selectedCount < 2 || !!actionLoading}>Merge Compatible Rows</Button>
              </div>
            </Card>

            <Card className="mb-6 p-5">
              <div className="mb-5 flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
                <div><h2 className="text-xl font-bold text-slate-950">AI Vacancy Review</h2><p className="text-sm text-slate-500">All extracted vacancy fields are visible and editable below.</p></div>
                <div className="flex flex-wrap gap-2">
                  <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input className="h-10 w-64 rounded-md border pl-9 pr-3" placeholder="Filter extracted vacancies" value={filter} onChange={(e) => setFilter(e.target.value)} /></div>
                  <Button variant="outline" onClick={addBlankRow}><Plus className="mr-2 h-4 w-4" />Add Row</Button>
                </div>
              </div>

              <div className="space-y-4">
                {rows.map((row, index) => (
                  <VacancyEditor
                    key={row.id}
                    row={row}
                    index={index}
                    selected={selected.has(row.id)}
                    saving={savingId === row.id}
                    onSelect={(checked) => setSelected((current) => { const next = new Set(current); checked ? next.add(row.id) : next.delete(row.id); return next; })}
                    onChange={(key, value) => updateLocalRow(row.id, key, value)}
                    onSave={() => saveRow(row)}
                    onDuplicate={() => duplicateRow(row)}
                    onSplit={() => splitRow(row)}
                    onDelete={() => removeRow(row)}
                  />
                ))}
                {!rows.length && <div className="rounded-xl border border-dashed p-10 text-center text-slate-500">No vacancy rows match the current filter.</div>}
              </div>
            </Card>

            <div className="flex flex-col justify-between gap-3 rounded-xl border bg-white p-4 xl:flex-row xl:items-center">
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={copyAll}><Copy className="mr-2 h-4 w-4" />Copy All</Button>
                {(['csv', 'xlsx', 'json'] as const).map((format) => <Button key={format} variant="outline" onClick={() => downloadRecruitmentExport(recruitment.id, format)}><Download className="mr-2 h-4 w-4" />{format.toUpperCase()}</Button>)}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm text-slate-500">Only APPROVED rows are published. Gemini never publishes automatically.</span>
                <Button onClick={publish} disabled={!approved || (recruitment.sector === 'government' && !recruitment.officialSourceVerified) || actionLoading === 'publish'} className="bg-blue-600 hover:bg-blue-700">{actionLoading === 'publish' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}Publish All Approved ({approved})</Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function VacancyEditor({ row, index, selected, saving, onSelect, onChange, onSave, onDuplicate, onSplit, onDelete }: {
  row: VacancyRecord;
  index: number;
  selected: boolean;
  saving: boolean;
  onSelect: (checked: boolean) => void;
  onChange: (key: keyof VacancyRecord, value: any) => void;
  onSave: () => void;
  onDuplicate: () => void;
  onSplit: () => void;
  onDelete: () => void;
}) {
  const confidence = Math.round((row.confidenceScore || 0) * 100);
  return (
    <div className={`rounded-xl border p-4 transition ${selected ? 'border-blue-400 bg-blue-50/30' : 'border-slate-200 bg-white'}`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <input type="checkbox" checked={selected} onChange={(e) => onSelect(e.target.checked)} className="h-4 w-4" />
          <div><p className="font-bold text-slate-900">Vacancy {index + 1}: {row.postName || 'Untitled vacancy'}</p><p className="text-xs text-slate-500">Gemini confidence: {confidence}%</p></div>
          <Badge variant="outline" className={row.status === 'APPROVED' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : row.status === 'PUBLISHED' ? 'border-blue-200 bg-blue-50 text-blue-700' : row.status === 'REJECTED' ? 'border-red-200 bg-red-50 text-red-700' : 'border-amber-200 bg-amber-50 text-amber-700'}>{row.status.replace('_', ' ')}</Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={onSave} disabled={saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Save</Button>
          <Button size="sm" variant="outline" onClick={onDuplicate}><Copy className="mr-1 h-4 w-4" />Duplicate</Button>
          <Button size="sm" variant="outline" onClick={onSplit} disabled={row.numberOfVacancies <= 1}>Split</Button>
          <Button size="sm" variant="outline" onClick={onDelete} disabled={row.status === 'PUBLISHED'}><Trash2 className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Field label="Post" value={row.postName || ''} onChange={(value) => onChange('postName', value)} />
        <Field label="Department" value={row.department || ''} onChange={(value) => onChange('department', value)} />
        <Field label="Speciality" value={row.speciality || ''} onChange={(value) => onChange('speciality', value)} />
        <Field label="Sub-speciality" value={row.subSpeciality || ''} onChange={(value) => onChange('subSpeciality', value)} />
        <Field label="Category" value={row.category || ''} onChange={(value) => onChange('category', value)} />
        <Field label="Vacancies" type="number" value={row.numberOfVacancies || 1} onChange={(value) => onChange('numberOfVacancies', Math.max(1, Number(value) || 1))} />
        <Field label="Location" value={row.location || ''} onChange={(value) => onChange('location', value)} />
        <Field label="Job Type" value={row.jobType || ''} onChange={(value) => onChange('jobType', value)} />
        <Field label="Age Limit" value={row.ageLimit || ''} onChange={(value) => onChange('ageLimit', value)} />
        <Field label="Salary" value={row.salary || ''} onChange={(value) => onChange('salary', value)} />
        <Field label="Pay Level" value={row.payLevel || ''} onChange={(value) => onChange('payLevel', value)} />
        <Field label="Pay Scale" value={row.payScale || ''} onChange={(value) => onChange('payScale', value)} />
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        <AreaField label="Qualification" value={row.qualification || ''} onChange={(value) => onChange('qualification', value)} />
        <AreaField label="Experience" value={row.experience || ''} onChange={(value) => onChange('experience', value)} />
        <AreaField label="Other Eligibility / Requirements" value={row.otherEligibilityRequirements || ''} onChange={(value) => onChange('otherEligibilityRequirements', value)} />
      </div>
      {row.sourcePage != null && <p className="mt-3 text-xs text-slate-400">Source page: {row.sourcePage}</p>}
    </div>
  );
}

function Stat({ label, value, tone = 'default' }: { label: string; value: number; tone?: 'default' | 'warning' | 'success' | 'info' }) {
  const className = tone === 'warning' ? 'border-amber-200 bg-amber-50' : tone === 'success' ? 'border-emerald-200 bg-emerald-50' : tone === 'info' ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-white';
  return <Card className={`p-4 ${className}`}><p className="text-sm text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold text-slate-950">{value}</p></Card>;
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string | number; onChange: (value: string) => void; type?: string }) {
  return <label className="block"><span className="mb-1 block text-sm font-medium text-slate-700">{label}</span><input type={type} className="h-10 w-full rounded-md border border-slate-300 bg-white px-3" value={value ?? ''} onChange={(e) => onChange(e.target.value)} /></label>;
}

function AreaField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="block"><span className="mb-1 block text-sm font-medium text-slate-700">{label}</span><textarea className="min-h-24 w-full rounded-md border border-slate-300 bg-white p-3 text-sm" value={value} onChange={(e) => onChange(e.target.value)} /></label>;
}
