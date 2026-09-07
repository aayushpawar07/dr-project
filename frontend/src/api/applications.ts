import { authFetch } from './authFetch';

const API_BASE = (import.meta as any).env?.VITE_API_BASE || '/api';

export interface ApplicationPayload {
  jobId: string;
  candidateName: string;
  candidateEmail: string;
  candidatePhone: string;
  token: string;
  resume?: File;
  notes?: string;
}

export interface ApplicationQuery {
  jobId?: string;
  candidateId?: string;
  status?: 'pending' | 'shortlisted' | 'interview' | 'hired' | 'rejected' | 'applied' | 'selected';
  search?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  size?: number;
  sort?: string;
}

export interface PostedByInfo {
  userId: string | null;
  name: string;
  email?: string;
  company: string;
}

export interface ApplicationResponse {
  id: string;
  jobId: string;
  jobTitle: string;
  jobOrganization: string;
  candidateId?: string;
  candidateName: string;
  candidateEmail: string;
  candidatePhone: string;
  resumeUrl?: string;
  status: 'pending' | 'shortlisted' | 'interview' | 'hired' | 'rejected' | 'applied' | 'selected';
  notes?: string;
  interviewDate?: string;
  appliedDate: string;
  postedBy?: PostedByInfo; // Only included for candidate requests
}

export async function applyForJob(payload: ApplicationPayload): Promise<ApplicationResponse> {
  const formData = new FormData();
  formData.append('jobId', payload.jobId);
  formData.append('candidateName', payload.candidateName);
  formData.append('candidateEmail', payload.candidateEmail);
  formData.append('candidatePhone', payload.candidatePhone);
  if (payload.resume) {
    formData.append('resume', payload.resume);
  }
  if (payload.notes) {
    formData.append('notes', payload.notes);
  }

  const res = await authFetch(`${API_BASE}/applications`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${payload.token}`,
    },
    body: formData,
  });
  if (!res.ok) throw new Error(`Failed to apply for job (${res.status})`);
  return res.json();
}

export async function fetchApplications(params: ApplicationQuery = {}, token: string) {
  const qs = new URLSearchParams();
  if (params.jobId) qs.set('jobId', params.jobId);
  if (params.candidateId) qs.set('candidateId', params.candidateId);
  if (params.status) {
    // Map UI status to backend status
    const statusMap: Record<string, string> = {
      'pending': 'applied',
      'hired': 'selected'
    };
    qs.set('status', statusMap[params.status] || params.status);
  }
  if (params.search) qs.set('search', params.search);
  if (params.startDate) qs.set('startDate', params.startDate);
  if (params.endDate) qs.set('endDate', params.endDate);
  qs.set('page', String(params.page ?? 0));
  qs.set('size', String(params.size ?? 20));
  qs.set('sort', params.sort || 'appliedDate,desc');

  const res = await authFetch(`${API_BASE}/applications?${qs.toString()}`, {
    cache: 'no-store',
    headers: {
      'Cache-Control': 'no-cache',
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    const errorMessage = res.status === 401 
      ? '401 Unauthorized - Authentication required' 
      : `Failed to fetch applications (${res.status})`;
    throw new Error(errorMessage);
  }
  return res.json();
}

export async function fetchApplicationsByEmployee(employeeId: string, params: ApplicationQuery = {}, token: string) {
  const qs = new URLSearchParams();
  if (params.status) {
    const statusMap: Record<string, string> = {
      'pending': 'applied',
      'hired': 'selected'
    };
    qs.set('status', statusMap[params.status] || params.status);
  }
  if (params.search) qs.set('search', params.search);
  if (params.startDate) qs.set('startDate', params.startDate);
  if (params.endDate) qs.set('endDate', params.endDate);
  qs.set('page', String(params.page ?? 0));
  qs.set('size', String(params.size ?? 20));
  qs.set('sort', params.sort || 'appliedDate,desc');

  const res = await authFetch(`${API_BASE}/applications/employee/${employeeId}?${qs.toString()}`, {
    cache: 'no-store',
    headers: {
      'Cache-Control': 'no-cache',
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error(`Failed to fetch employee applications (${res.status})`);
  return res.json();
}

export async function fetchApplicationsByCandidate(candidateId: string, params: ApplicationQuery = {}, token: string) {
  const qs = new URLSearchParams();
  if (params.status) {
    const statusMap: Record<string, string> = {
      'pending': 'applied',
      'hired': 'selected'
    };
    qs.set('status', statusMap[params.status] || params.status);
  }
  qs.set('page', String(params.page ?? 0));
  qs.set('size', String(params.size ?? 20));
  qs.set('sort', params.sort || 'appliedDate,desc');

  const res = await authFetch(`${API_BASE}/applications/candidate/${candidateId}?${qs.toString()}`, {
    cache: 'no-store',
    headers: {
      'Cache-Control': 'no-cache',
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error(`Failed to fetch candidate applications (${res.status})`);
  return res.json();
}

export async function updateApplicationStatus(id: string, status: string, token: string, notes?: string, interviewDate?: string | null) {
  // Map UI status to backend status
  const statusMap: Record<string, string> = {
    'pending': 'applied',
    'hired': 'selected'
  };
  const backendStatus = statusMap[status] || status;
  
  const payload: any = { status: backendStatus };
  if (notes) payload.notes = notes;
  if (interviewDate) payload.interviewDate = interviewDate;

  const res = await authFetch(`${API_BASE}/applications/${id}/status`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Failed to update application status (${res.status})`);
  return res.json();
}

export async function updateApplicationNotes(id: string, notes: string, token: string) {
  const res = await authFetch(`${API_BASE}/applications/${id}/notes`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ notes }),
  });
  if (!res.ok) throw new Error(`Failed to update application notes (${res.status})`);
  return res.json();
}

export async function updateApplicationResume(applicationId: string, file: File, token: string) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await authFetch(`${API_BASE}/applications/${applicationId}/resume`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Failed to update resume' }));
    throw new Error(error.error || `Failed to update resume (${res.status})`);
  }
  return res.json();
}

export async function deleteApplication(id: string) {
  const res = await authFetch(`${API_BASE}/applications/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok && res.status !== 204) throw new Error(`Failed to delete application (${res.status})`);
}
