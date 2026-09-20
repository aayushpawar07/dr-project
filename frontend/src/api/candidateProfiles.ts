const API_BASE = (import.meta as any).env?.VITE_API_BASE || '/api';

export interface CandidateProfileData {
  id?: string;
  candidateId?: string;
  name?: string;
  email?: string;
  phone?: string;
  speciality?: string;
  subSpeciality?: string;
  qualification?: string;
  yearsExperience?: number | null;
  registrationCouncil?: string;
  registrationNumber?: string;
  currentCity?: string;
  state?: string;
  preferredLocation?: string;
  employmentPreference?: string;
  profileSummary?: string;
  profilePhotoUrl?: string;
  medicalCategory?: string;
  currentOrganization?: string;
  preferredJobRole?: string;
  skills?: string;
  registrationYear?: string;
  registrationState?: string;
  resumeUrl?: string;
  resumeFileName?: string;
  profileComplete?: boolean;
  updatedAt?: string;
}

export interface CandidateInsightsResponse {
  totalProfiles: number;
  filteredProfiles: number;
  specialityCounts: Record<string, number>;
  qualificationCounts: Record<string, number>;
  stateCounts: Record<string, number>;
  profiles: CandidateProfileData[];
}

export interface CandidateSearchParams {
  qualification?: string;
  speciality?: string;
  jobRole?: string;
  minExperience?: number;
  maxExperience?: number;
  state?: string;
  city?: string;
  preferredLocation?: string;
  candidateType?: string;
  search?: string;
}

export interface CandidateSearchResponse {
  total: number;
  candidates: CandidateProfileData[];
}

async function request<T>(url: string, token: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, ...(options.headers || {}) },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || body.message || `Request failed (${response.status})`);
  }
  return response.json();
}

export function fetchMyCandidateProfile(token: string) {
  return request<CandidateProfileData>('/candidate-profiles/me', token);
}

export function updateMyCandidateProfile(profile: CandidateProfileData, token: string) {
  return request<CandidateProfileData>('/candidate-profiles/me', token, { method: 'PUT', body: JSON.stringify(profile) });
}

export async function uploadCandidatePhoto(file: File, token: string): Promise<CandidateProfileData> {
  const formData = new FormData();
  formData.append('file', file);
  const response = await fetch(`${API_BASE}/candidate-profiles/me/photo`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || body.message || `Photo upload failed (${response.status})`);
  }
  return response.json();
}

export async function uploadCandidateResume(file: File, token: string): Promise<CandidateProfileData> {
  const formData = new FormData();
  formData.append('file', file);
  const response = await fetch(`${API_BASE}/candidate-profiles/me/resume`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || body.message || `Resume upload failed (${response.status})`);
  }
  return response.json();
}

export function searchCandidates(params: CandidateSearchParams, token: string) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim()) {
      query.set(key, String(value).trim());
    }
  });
  return request<CandidateSearchResponse>(`/candidate-profiles/search${query.toString() ? `?${query}` : ''}`, token);
}

export function fetchCandidateInsights(params: { speciality?: string; qualification?: string; state?: string; search?: string }, token: string) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => { if (value?.trim()) query.set(key, value.trim()); });
  return request<CandidateInsightsResponse>(`/candidate-profiles/admin/insights${query.toString() ? `?${query}` : ''}`, token);
}
