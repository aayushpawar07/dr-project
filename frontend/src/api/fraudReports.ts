// AI assisted development
import { authFetch } from './authFetch';

const API_BASE = (import.meta as any).env?.VITE_API_BASE || '/api';

export interface FraudReportResponse {
  id: string;
  type: 'fake_job' | 'spam' | 'misleading_info' | 'fraudulent_employer' | 'other';
  jobId?: string;
  employerId?: string;
  reporterId: string;
  reporterName: string;
  reporterEmail: string;
  reason: string;
  description: string;
  status: 'pending' | 'under_review' | 'resolved' | 'dismissed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  adminNotes?: string;
  evidence?: string[];
  resolvedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface FraudReportPayload {
  type: 'fake_job' | 'spam' | 'misleading_info' | 'fraudulent_employer' | 'other';
  jobId?: string;
  employerId?: string;
  reason: string;
  description: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  evidence?: string[];
}

export interface FraudReportQuery {
  page?: number;
  size?: number;
  status?: string;
  priority?: string;
  type?: string;
}

export interface FraudReportStats {
  pending: number;
  underReview: number;
  resolved: number;
  dismissed: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export async function fetchFraudReports(params: FraudReportQuery = {}, token: string): Promise<{
  content: FraudReportResponse[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}> {
  const qs = new URLSearchParams();
  if (params.page !== undefined) qs.set('page', String(params.page));
  if (params.size !== undefined) qs.set('size', String(params.size));
  if (params.status) qs.set('status', params.status);
  if (params.priority) qs.set('priority', params.priority);
  if (params.type) qs.set('type', params.type);

  const res = await authFetch(`${API_BASE}/fraud-reports?${qs.toString()}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch fraud reports (${res.status})`);
  }

  return res.json();
}

export async function getFraudReport(id: string, token: string): Promise<FraudReportResponse> {
  const res = await authFetch(`${API_BASE}/fraud-reports/${id}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch fraud report (${res.status})`);
  }

  return res.json();
}

export async function createFraudReport(payload: FraudReportPayload, token: string): Promise<FraudReportResponse> {
  const res = await authFetch(`${API_BASE}/fraud-reports`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`Failed to create fraud report (${res.status})`);
  }

  return res.json();
}

export async function updateReportStatus(
  id: string,
  status: string,
  token: string,
  adminNotes?: string
): Promise<FraudReportResponse> {
  const payload: any = { status };
  if (adminNotes) payload.adminNotes = adminNotes;

  const res = await authFetch(`${API_BASE}/fraud-reports/${id}/status`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`Failed to update report status (${res.status})`);
  }

  return res.json();
}

export async function updateReportPriority(
  id: string,
  priority: string,
  token: string
): Promise<FraudReportResponse> {
  const res = await authFetch(`${API_BASE}/fraud-reports/${id}/priority`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ priority }),
  });

  if (!res.ok) {
    throw new Error(`Failed to update report priority (${res.status})`);
  }

  return res.json();
}

export async function deleteFraudReport(id: string, token: string): Promise<void> {
  const res = await authFetch(`${API_BASE}/fraud-reports/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to delete fraud report (${res.status})`);
  }
}

export async function getFraudReportStats(token: string): Promise<FraudReportStats> {
  const res = await authFetch(`${API_BASE}/fraud-reports/stats`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch fraud report stats (${res.status})`);
  }

  return res.json();
}

