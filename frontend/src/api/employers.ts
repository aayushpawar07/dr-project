import { authFetch } from './authFetch';

const API_BASE = (import.meta as any).env?.VITE_API_BASE || '/api';

export interface EmployerPayload {
  companyName: string;
  companyType: 'hospital' | 'consultancy' | 'hr';
  companyDescription?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

export interface EmployerResponse {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  companyName: string;
  companyType: 'hospital' | 'consultancy' | 'hr';
  companyDescription?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  isVerified: boolean;
  verificationStatus: 'pending' | 'approved' | 'rejected';
  employerStatus?: 'active' | 'discontinued';
  verificationNotes?: string;
  verifiedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface EmployerQuery {
  page?: number;
  size?: number;
  verificationStatus?: 'pending' | 'approved' | 'rejected';
  search?: string;
}

export async function fetchEmployers(params: EmployerQuery = {}, token: string) {
  const qs = new URLSearchParams();
  if (params.page !== undefined) qs.set('page', String(params.page));
  if (params.size !== undefined) qs.set('size', String(params.size));
  if (params.verificationStatus) qs.set('verificationStatus', params.verificationStatus);
  if (params.search) qs.set('search', params.search);

  const res = await authFetch(`${API_BASE}/employers?${qs.toString()}`, {
    cache: 'no-store',
    headers: {
      'Cache-Control': 'no-cache',
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error(`Failed to fetch employers (${res.status})`);
  return res.json();
}

export async function fetchEmployer(id: string, token: string): Promise<EmployerResponse> {
  // First try to fetch by employer ID
  let res = await authFetch(`${API_BASE}/employers/${id}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  // If not found, try to fetch by user ID
  if (res.status === 404) {
    res = await authFetch(`${API_BASE}/employers/user/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  }
  
  if (!res.ok) throw new Error(`Failed to fetch employer (${res.status})`);
  return res.json();
}

export async function updateEmployerVerificationStatus(
  id: string,
  status: 'pending' | 'approved' | 'rejected',
  token: string,
  notes?: string
): Promise<EmployerResponse> {
  const qs = new URLSearchParams();
  qs.set('status', status);
  if (notes) qs.set('notes', notes);

  const res = await authFetch(`${API_BASE}/employers/${id}/verification?${qs.toString()}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error(`Failed to update employer verification status (${res.status})`);
  return res.json();
}

export async function uploadEmployerDocument(id: string, document: File, token: string) {
  const formData = new FormData();
  formData.append('document', document);

  const res = await authFetch(`${API_BASE}/employers/${id}/documents`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });
  if (!res.ok) throw new Error(`Failed to upload document (${res.status})`);
  return res.json();
}

export async function createEmployer(
  data: { companyName?: string; companyType?: 'hospital' | 'consultancy' | 'hr' },
  token: string
): Promise<EmployerResponse> {
  const res = await authFetch(`${API_BASE}/employers/create`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to create employer (${res.status})`);
  return res.json();
}

export async function approveEmployer(
  id: string,
  token: string,
  notes?: string
): Promise<EmployerResponse> {
  const qs = new URLSearchParams();
  if (notes) qs.set('notes', notes);

  const res = await authFetch(`${API_BASE}/employers/${id}/approve?${qs.toString()}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error(`Failed to approve employer (${res.status})`);
  return res.json();
}

export async function rejectEmployer(
  id: string,
  token: string,
  notes?: string
): Promise<EmployerResponse> {
  const qs = new URLSearchParams();
  if (notes) qs.set('notes', notes);

  const res = await authFetch(`${API_BASE}/employers/${id}/reject?${qs.toString()}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error(`Failed to reject employer (${res.status})`);
  return res.json();
}

export async function discontinueEmployer(
  id: string,
  token: string
): Promise<EmployerResponse> {
  const res = await authFetch(`${API_BASE}/employers/${id}/discontinue`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error(`Failed to discontinue employer (${res.status})`);
  return res.json();
}

export async function continueEmployer(
  id: string,
  token: string
): Promise<EmployerResponse> {
  const res = await authFetch(`${API_BASE}/employers/${id}/continue`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error(`Failed to continue employer (${res.status})`);
  return res.json();
}
