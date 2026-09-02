import apiClient from './apiClient';
import { beginAiExtractionFeedback, endAiExtractionFeedback } from '../utils/aiExtractionFeedback';

export interface VacancyRecord {
  id: string;
  postName: string;
  department?: string;
  speciality?: string;
  subSpeciality?: string;
  numberOfVacancies: number;
  category?: string;
  qualification?: string;
  experience?: string;
  ageLimit?: string;
  salary?: string;
  payLevel?: string;
  payScale?: string;
  jobType?: string;
  location?: string;
  otherEligibilityRequirements?: string;
  confidenceScore?: number;
  status: 'NEEDS_REVIEW' | 'APPROVED' | 'REJECTED' | 'PUBLISHED';
  slug?: string;
  sourcePage?: number;
  publishedJobId?: string;
}

export interface Recruitment {
  id: string;
  slug: string;
  organisationName: string;
  title: string;
  advertisementNumber?: string;
  recruitmentYear?: number;
  sector: 'government' | 'private';
  location?: string;
  totalVacancies: number;
  applicationStartDate?: string;
  applicationLastDate?: string;
  applicationFee?: string;
  selectionProcess?: string;
  officialNotificationUrl?: string;
  officialApplicationUrl?: string;
  officialWebsite?: string;
  importantInstructions?: string;
  sourcePdfName?: string;
  extractionMethod?: string;
  status: 'REVIEW' | 'VERIFIED' | 'PUBLISHED' | 'REJECTED';
  officialSourceVerified: boolean;
  verificationDate?: string;
  verifiedBy?: string;
  duplicateOf?: string;
  previousVersionId?: string;
  revisionNumber?: number;
  vacancies: VacancyRecord[];
  vacancyRecords?: number;
  structuredVacancyTotal?: number;
  vacancyTotalMatches?: boolean;
  approvedVacancies?: number;
  needsReview?: number;
  publishedVacancies?: number;
  rejectedVacancies?: number;
}

export async function extractRecruitment(file: File, forceCreate = false) {
  const form = new FormData();
  form.append('file', file);
  beginAiExtractionFeedback('Extracting recruitment with Gemini');
  try {
    const res = await apiClient.post('/admin/recruitments/gemini-extract', form, {
      params: { forceCreate },
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data as { duplicate: boolean; created: boolean; message: string; recruitment: Recruitment };
  } finally {
    endAiExtractionFeedback();
  }
}

export async function fetchRecruitment(id: string): Promise<Recruitment> {
  const res = await apiClient.get(`/admin/recruitments/${id}`);
  return res.data;
}

export async function updateRecruitment(id: string, updates: Partial<Recruitment>): Promise<Recruitment> {
  const res = await apiClient.put(`/admin/recruitments/${id}`, updates);
  return res.data;
}

export async function updateVacancy(recruitmentId: string, vacancyId: string, updates: Partial<VacancyRecord>): Promise<VacancyRecord> {
  const res = await apiClient.put(`/admin/recruitments/${recruitmentId}/vacancies/${vacancyId}`, updates);
  return res.data;
}

export async function addVacancy(recruitmentId: string, values: Partial<VacancyRecord>): Promise<VacancyRecord> {
  const res = await apiClient.post(`/admin/recruitments/${recruitmentId}/vacancies`, values);
  return res.data;
}

export async function deleteVacancy(recruitmentId: string, vacancyId: string) {
  await apiClient.delete(`/admin/recruitments/${recruitmentId}/vacancies/${vacancyId}`);
}

export async function duplicateVacancy(recruitmentId: string, vacancyId: string): Promise<VacancyRecord> {
  const res = await apiClient.post(`/admin/recruitments/${recruitmentId}/vacancies/${vacancyId}/duplicate`);
  return res.data;
}

export async function bulkUpdateVacancies(recruitmentId: string, ids: string[], updates: Partial<VacancyRecord>): Promise<VacancyRecord[]> {
  const res = await apiClient.post(`/admin/recruitments/${recruitmentId}/vacancies/bulk-update`, { ids, updates });
  if (Array.isArray(res.data)) return res.data;
  return Array.isArray(res.data?.vacancies) ? res.data.vacancies : [];
}

export async function bulkSetVacancyStatus(recruitmentId: string, ids: string[], status: VacancyRecord['status']): Promise<{ updatedCount: number; recruitment: Recruitment }> {
  const res = await apiClient.post(`/admin/recruitments/${recruitmentId}/vacancies/bulk-status`, { ids, status });
  if (Array.isArray(res.data)) {
    return { updatedCount: res.data.length, recruitment: await fetchRecruitment(recruitmentId) };
  }
  if (!res.data?.recruitment) {
    return { updatedCount: res.data?.updatedCount || 0, recruitment: await fetchRecruitment(recruitmentId) };
  }
  return res.data as { updatedCount: number; recruitment: Recruitment };
}

export async function verifyRecruitment(id: string): Promise<Recruitment> {
  const res = await apiClient.post(`/admin/recruitments/${id}/verify`, {});
  return res.data;
}

export async function publishApprovedVacancies(id: string) {
  const res = await apiClient.post(`/admin/recruitments/${id}/publish-all`);
  return res.data as {
    publishedCount: number;
    failedCount?: number;
    failures?: string[];
    vacancyTotalMatches?: boolean;
    message?: string;
    recruitment: Recruitment;
  };
}

export function recruitmentExportUrl(id: string, format: 'csv' | 'json' | 'xlsx') {
  const base = apiClient.defaults.baseURL || '';
  return `${base}/admin/recruitments/${id}/export?format=${format}`;
}

export async function downloadRecruitmentExport(id: string, format: 'csv' | 'json' | 'xlsx') {
  const res = await apiClient.get(`/admin/recruitments/${id}/export`, {
    params: { format },
    responseType: 'blob',
  });
  const blob = new Blob([res.data]);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `recruitment-${id}.${format}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function fetchPublishedRecruitment(id: string): Promise<Recruitment> {
  const res = await apiClient.get(`/recruitments/${id}`);
  return res.data;
}
