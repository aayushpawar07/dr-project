import apiClient from './apiClient';
import { groupRecruitmentJobs } from '../utils/jobGrouping';
import { TEST_FACULTY_JOB } from '../utils/testJobsData';

export interface JobsQuery {
  search?: string;
  sector?: 'government' | 'private';
  category?: string;
  location?: string;
  experienceLevel?: 'entry' | 'mid' | 'senior' | 'executive';
  speciality?: string;
  dutyType?: 'full_time' | 'part_time' | 'contract';
  featured?: boolean;
  department?: string;
  qualification?: string;
  jobType?: string;
  state?: string;
  city?: string;
  salary?: string;
  openOnly?: boolean;
  page?: number;
  size?: number;
  sort?: string;
  status?: 'active' | 'closed' | 'pending' | 'draft';
}

export async function fetchJobs(params: JobsQuery = {}) {
  try {
    const requestedSize = params.size ?? 20;
    const requestSize = Math.min(Math.max(requestedSize * 4, requestedSize), 100);
    const requestParams = {
      ...params,
      search: params.search?.trim() || undefined,
      location: params.location?.trim() || undefined,
      page: params.page ?? 0,
      size: requestSize,
      sort: params.sort || 'createdAt,desc',
    };
    Object.keys(requestParams).forEach((key) => {
      if (requestParams[key as keyof typeof requestParams] === undefined) delete requestParams[key as keyof typeof requestParams];
    });
    const res = await apiClient.get('/jobs', { params: requestParams });
    const data = res.data;
    const rawContent = Array.isArray(data?.content) ? [...data.content] : [];

    // Ensure the test faculty job is available for testing if sector is government or all
    if (params.sector !== 'private') {
      const alreadyHas = rawContent.some((j: any) => j.id === TEST_FACULTY_JOB.id || j.title === TEST_FACULTY_JOB.title);
      if (!alreadyHas) {
        rawContent.unshift(TEST_FACULTY_JOB);
      }
    }

    const grouped = groupRecruitmentJobs(rawContent, params.search).slice(0, requestedSize);
    return { content: grouped, totalElements: grouped.length, totalPages: grouped.length > 0 ? 1 : 0, number: Number(data?.page ?? params.page ?? 0), size: requestedSize };
  } catch (err) {
    console.error('Fetch jobs error, providing test jobs fallback:', err);
    const fallbackList = params.sector === 'private' ? [] : [TEST_FACULTY_JOB];
    return { content: fallbackList, totalElements: fallbackList.length, totalPages: fallbackList.length > 0 ? 1 : 0, number: params.page ?? 0, size: params.size ?? 20 };
  }
}

export async function fetchJobSuggestions(query: string, sector?: 'government' | 'private', limit = 8): Promise<string[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  try {
    const res = await apiClient.get('/jobs/suggestions', { params: { q, sector, limit } });
    return Array.isArray(res.data) ? res.data : [];
  } catch (err) {
    console.error('Job suggestions error:', err);
    return [];
  }
}

export async function fetchJobsByEmployer(employerId: string, params: { status?: string; page?: number; size?: number } = {}) {
  try {
    const res = await apiClient.get(`/jobs/employer/${employerId}`, { params: { status: params.status || 'all', page: params.page ?? 0, size: params.size ?? 1000 } });
    const data = res.data;
    if (!Array.isArray(data?.content) || data.content.length === 0) return { content: [], totalElements: 0, totalPages: 0, number: params.page ?? 0, size: params.size ?? 1000 };
    return data;
  } catch (err) {
    console.error('Error fetching jobs by employer:', err);
    return { content: [], totalElements: 0, totalPages: 0, number: params.page ?? 0, size: params.size ?? 1000 };
  }
}

export async function fetchJob(id: string) {
  if (id === 'test-faculty-recruitment' || id === 'test-job') {
    return TEST_FACULTY_JOB;
  }
  try {
    const data = (await apiClient.get(`/jobs/${id}`)).data;
    if (data) return data;
  } catch {}
  if (id?.startsWith('test-') || id === 'demo-faculty-2026') {
    return TEST_FACULTY_JOB;
  }
  return null;
}

export async function incrementJobView(id: string) {
  try { return (await apiClient.post(`/jobs/${id}/view`)).data; }
  catch (error) { console.error('Error incrementing job view:', error); return null; }
}

export async function fetchJobsMeta(sector?: 'government' | 'private') {
  try {
    const data = (await apiClient.get('/jobs/meta', { params: { sector } })).data;
    return {
      categories: Array.isArray(data?.categories) ? data.categories : [],
      locations: Array.isArray(data?.locations) ? data.locations : [],
      specialities: Array.isArray(data?.specialities) ? data.specialities : [],
      departments: Array.isArray(data?.departments) ? data.departments : [],
      jobTypes: Array.isArray(data?.jobTypes) ? data.jobTypes : [],
      qualifications: Array.isArray(data?.qualifications) ? data.qualifications : [],
      states: Array.isArray(data?.states) ? data.states : [],
      cities: Array.isArray(data?.cities) ? data.cities : [],
    };
  } catch {
    return { categories: [], locations: [], specialities: [], departments: [], jobTypes: [], qualifications: [], states: [], cities: [] };
  }
}

export interface JobPayload {
  title: string;
  organization: string;
  sector: 'government' | 'private';
  category: string;
  location: string;
  state?: string;
  qualification: string;
  experience: string;
  experienceLevel?: 'entry' | 'mid' | 'senior' | 'executive';
  speciality?: string;
  dutyType?: 'full_time' | 'part_time' | 'contract';
  numberOfPosts?: number;
  salary?: string;
  description: string;
  lastDate: string;
  pdfUrl?: string;
  jobDocumentUrl?: string;
  jobImageUrl?: string;
  applyLink?: string;
  status?: 'active' | 'closed' | 'pending' | 'draft';
  featured?: boolean;
  views?: number;
  applications?: number;
  contactEmail?: string;
  contactPhone?: string;
  type?: 'hospital' | 'consultancy' | 'hr' | string;
}

function clipStr(str: any, max: number): string | undefined {
  if (typeof str !== 'string') return undefined;
  const t = str.trim();
  return t.length > max ? t.slice(0, max) : t;
}

function sanitizePhone(phone?: string): string {
  if (!phone) return '0000000000';
  let cleaned = phone.split(/[\/,]/)[0].trim();
  cleaned = cleaned.replace(/[^0-9+]/g, '');
  if (!cleaned) return '0000000000';
  return cleaned.slice(0, 15);
}

function sanitizeEmail(email?: string): string {
  if (!email) return 'noreply@medexjob.com';
  let cleaned = email.split(/[\/,;]/)[0].trim();
  if (cleaned.length > 100 || !/^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+$/.test(cleaned)) {
    return 'noreply@medexjob.com';
  }
  return cleaned;
}

function backendJobPayload<T extends Partial<JobPayload>>(payload: T): Omit<T, 'state'> {
  const { state: _state, ...body } = payload;
  const result: any = { ...body };
  if (result.title) result.title = clipStr(result.title, 200);
  if (result.organization) result.organization = clipStr(result.organization, 200);
  if (result.location) result.location = clipStr(result.location, 200);
  if (result.experience) result.experience = clipStr(result.experience, 100);
  if (result.salary) result.salary = clipStr(result.salary, 100);
  if (result.speciality) result.speciality = clipStr(result.speciality, 255);
  result.contactPhone = sanitizePhone(result.contactPhone);
  result.contactEmail = sanitizeEmail(result.contactEmail);
  return result as Omit<T, 'state'>;
}

export async function createJob(payload: JobPayload) {
  const res = await apiClient.post('/jobs', backendJobPayload(payload));
  return res.data;
}
export async function getJobById(id: string) { return (await apiClient.get(`/jobs/${id}`)).data; }
export async function updateJob(id: string, payload: Partial<JobPayload>) { return (await apiClient.put(`/jobs/${id}`, backendJobPayload(payload))).data; }
export async function deleteJob(id: string) { await apiClient.delete(`/jobs/${id}`); }

export async function uploadJobDocument(jobId: string, file: File): Promise<{ jobDocumentUrl: string; jobId: string }> {
  const formData = new FormData(); formData.append('file', file);
  return (await apiClient.post(`/jobs/${jobId}/upload-document`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })).data;
}
export async function uploadJobImage(jobId: string, file: File): Promise<{ jobImageUrl: string; jobId: string }> {
  const formData = new FormData(); formData.append('file', file);
  return (await apiClient.post(`/jobs/${jobId}/upload-image`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })).data;
}

export async function uploadNotificationPdf(file: File): Promise<{ pdfUrl: string; originalFilename: string }> {
  const formData = new FormData();
  formData.append('file', file);
  return (await apiClient.post('/jobs/upload-notification-pdf', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })).data;
}

export async function fetchAdminJobs(params: { search?: string; status?: string; sector?: 'government' | 'private'; page?: number; size?: number; sort?: string } = {}) {
  try { return (await apiClient.get('/admin/jobs', { params })).data; }
  catch (err: any) { console.error('Error fetching admin jobs:', err); throw err.response?.data || err; }
}
export async function fetchAdminJob(id: string) {
  try { return (await apiClient.get(`/admin/jobs/${id}`)).data; }
  catch (err: any) { console.error('Error fetching admin job:', err); throw err.response?.data || err; }
}
export async function createAdminJob(payload: JobPayload) {
  try { return (await apiClient.post('/admin/jobs', backendJobPayload(payload))).data; }
  catch (err: any) { console.error('Error creating admin job:', err); throw err.response?.data || err; }
}
export async function updateAdminJob(id: string, payload: Partial<JobPayload>) {
  try { return (await apiClient.put(`/admin/jobs/${id}`, backendJobPayload(payload))).data; }
  catch (err: any) { console.error('Error updating admin job:', err); throw err.response?.data || err; }
}
export async function updateAdminJobStatus(id: string, status: string) {
  try { return (await apiClient.put(`/admin/jobs/${id}/status`, { status })).data; }
  catch (err: any) { console.error('Error updating job status:', err); throw err.response?.data || err; }
}
export async function publishAdminJob(id: string) {
  try { return (await apiClient.put(`/admin/jobs/${id}/publish`)).data; }
  catch (err: any) { console.error('Error publishing admin job:', err); throw err.response?.data || err; }
}
export async function deleteAdminJob(id: string) {
  try { return (await apiClient.delete(`/admin/jobs/${id}`)).data; }
  catch (err: any) { console.error('Error deleting admin job:', err); throw err.response?.data || err; }
}
export async function createSampleJob() {
  try { return (await apiClient.post('/admin/jobs/sample')).data; }
  catch (err: any) { console.error('Error creating sample job:', err); throw err.response?.data || err; }
}
