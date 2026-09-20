const API_BASE = (import.meta as any).env?.VITE_API_BASE || '/api';

export interface DirectoryUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'candidate' | 'employer' | 'admin';
  isActive: boolean;
  isVerified: boolean;
  createdAt?: string;

  // Candidate-specific
  qualification?: string;
  speciality?: string;
  currentCity?: string;
  state?: string;
  currentOrganization?: string;
  preferredJobRole?: string;
  resumeUrl?: string;
  resumeFileName?: string;
  profilePhotoUrl?: string;
  medicalCategory?: string;
  yearsExperience?: number;
  applicationsCount?: number;

  // Employer-specific
  companyName?: string;
  companyType?: string;
  verificationStatus?: string;
  city?: string;
  jobsCount?: number;
}

export interface ImpersonateResponse {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string;
    role: 'candidate' | 'employer' | 'admin';
  };
  message: string;
}

export async function fetchUserDirectory(
  params: { role?: string; search?: string } = {},
  token: string
): Promise<DirectoryUser[]> {
  const query = new URLSearchParams();
  if (params.role) query.set('role', params.role);
  if (params.search) query.set('search', params.search);

  const res = await fetch(`${API_BASE}/admin/users/directory?${query.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || data.error || 'Failed to fetch user directory');
  }

  return res.json();
}

export async function impersonateUser(userId: string, token: string): Promise<ImpersonateResponse> {
  const res = await fetch(`${API_BASE}/admin/users/impersonate/${userId}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || data.error || 'Failed to generate impersonation session');
  }

  return res.json();
}

export async function toggleUserStatus(userId: string, token: string): Promise<{ message: string; isActive: boolean }> {
  const res = await fetch(`${API_BASE}/admin/users/${userId}/toggle-status`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || data.error || 'Failed to toggle user status');
  }

  return res.json();
}

export async function fetchUserFullProfile(userId: string, token: string): Promise<any> {
  const res = await fetch(`${API_BASE}/admin/users/${userId}/full-profile`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || data.error || 'Failed to fetch user full profile');
  }

  return res.json();
}
