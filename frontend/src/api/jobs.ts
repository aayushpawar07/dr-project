// AI assisted development
import apiClient from './apiClient';

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
  sort?: string; // e.g. 'createdAt,desc'
  status?: 'active' | 'closed' | 'pending' | 'draft';
}

export async function fetchJobs(params: JobsQuery = {}) {
  try {
    const requestParams = {
      ...params,
      search: params.search?.trim() || undefined,
      location: params.location?.trim() || undefined,
      page: params.page ?? 0,
      size: params.size ?? 20,
      sort: params.sort || 'createdAt,desc',
    };

    Object.keys(requestParams).forEach((key) => {
      if (requestParams[key as keyof typeof requestParams] === undefined) {
        delete requestParams[key as keyof typeof requestParams];
      }
    });

    const res = await apiClient.get('/jobs', { params: requestParams });
    const data = res.data;
    return {
      content: Array.isArray(data?.content) ? data.content : [],
      totalElements: Number(data?.totalElements || 0),
      totalPages: Number(data?.totalPages || 0),
      number: Number(data?.page ?? params.page ?? 0),
      size: Number(data?.size ?? params.size ?? 20),
    };
  } catch (err) {
    console.error('Fetch jobs error:', err);
    return {
      content: [],
      totalElements: 0,
      totalPages: 0,
      number: params.page ?? 0,
      size: params.size ?? 20,
    };
  }
}

export async function fetchJobSuggestions(
  query: string,
  sector?: 'government' | 'private',
  limit = 8,
): Promise<string[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  try {
    const res = await apiClient.get('/jobs/suggestions', {
      params: { q, sector, limit },
    });
    return Array.isArray(res.data) ? res.data : [];
  } catch (err) {
    console.error('Job suggestions error:', err);
    return [];
  }
}

export async function fetchJobsByEmployer(employerId: string, params: { status?: string; page?: number; size?: number } = {}) {
  try {
    const res = await apiClient.get(`/jobs/employer/${employerId}`, {
      params: {
        status: params.status || 'all',
        page: params.page ?? 0,
        size: params.size ?? 1000,
      },
    });
    const data = res.data;

    // Return empty array if no content
    if (!Array.isArray(data?.content) || data.content.length === 0) {
      return {
        content: [],
        totalElements: 0,
        totalPages: 0,
        number: params.page ?? 0,
        size: params.size ?? 1000,
      };
    }

    return data;
  } catch (err) {
    console.error('Error fetching jobs by employer:', err);
    // Return empty data on error
    return {
      content: [],
      totalElements: 0,
      totalPages: 0,
      number: params.page ?? 0,
      size: params.size ?? 1000,
    };
  }
}

export async function fetchJob(id: string) {
  try {
    const res = await apiClient.get(`/jobs/${id}`);
    return res.data;
  } catch {
    return null;
  }
}

export async function incrementJobView(id: string) {
  try {
    const res = await apiClient.post(`/jobs/${id}/view`);
    return res.data;
  } catch (error) {
    console.error('Error incrementing job view:', error);
    // Don't throw error, just log it - view increment is not critical
    return null;
  }
}

export async function fetchJobsMeta(sector?: 'government' | 'private') {
  try {
    const res = await apiClient.get('/jobs/meta', { params: { sector } });
    const data = res.data;
    const categoriesArr = Array.isArray(data?.categories) ? data.categories : [];
    const locationsArr = Array.isArray(data?.locations) ? data.locations : [];
    return {
      categories: categoriesArr,
      locations: locationsArr,
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
  qualification: string;
  experience: string;
  experienceLevel?: 'entry' | 'mid' | 'senior' | 'executive';
  speciality?: string;
  dutyType?: 'full_time' | 'part_time' | 'contract';
  numberOfPosts?: number;
  salary?: string;
  description: string;
  lastDate: string; // yyyy-MM-dd
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

export async function createJob(payload: JobPayload) {
  // The token is now added automatically by the interceptor
  const res = await apiClient.post('/jobs', payload);
  return res.data;
}

export async function getJobById(id: string) {
  const res = await apiClient.get(`/jobs/${id}`);
  return res.data;
}

export async function updateJob(id: string, payload: Partial<JobPayload>) {
  const res = await apiClient.put(`/jobs/${id}`, payload);
  return res.data;
}

export async function deleteJob(id: string) {
  await apiClient.delete(`/jobs/${id}`);
}

/**
 * Upload job document (PDF) for a specific job
 * @param jobId The job ID to upload the document for
 * @param file The PDF file to upload
 * @returns The uploaded document URL
 */
export async function uploadJobDocument(jobId: string, file: File): Promise<{ jobDocumentUrl: string; jobId: string }> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await apiClient.post(`/jobs/${jobId}/upload-document`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return res.data;
}

/**
 * Upload job image (jpg, jpeg, png, webp) for a specific job
 * @param jobId The job ID to upload the image for
 * @param file The image file to upload
 * @returns The uploaded image URL
 */
export async function uploadJobImage(jobId: string, file: File): Promise<{ jobImageUrl: string; jobId: string }> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await apiClient.post(`/jobs/${jobId}/upload-image`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return res.data;
}

// ==================== ADMIN JOB API FUNCTIONS ====================

/**
 * Fetch all jobs for admin (including all statuses)
 */
export async function fetchAdminJobs(params: {
  search?: string;
  status?: string;
  sector?: 'government' | 'private';
  page?: number;
  size?: number;
  sort?: string;
} = {}) {
  try {
    const res = await apiClient.get('/admin/jobs', { params });
    return res.data;
  } catch (err: any) {
    console.error('Error fetching admin jobs:', err);
    throw err.response?.data || err;
  }
}

/**
 * Fetch a single job by ID for admin
 */
export async function fetchAdminJob(id: string) {
  try {
    const res = await apiClient.get(`/admin/jobs/${id}`);
    return res.data;
  } catch (err: any) {
    console.error('Error fetching admin job:', err);
    throw err.response?.data || err;
  }
}

/**
 * Create a new job as admin (without subscription requirement)
 */
export async function createAdminJob(payload: JobPayload) {
  try {
    const res = await apiClient.post('/admin/jobs', payload);
    return res.data;
  } catch (err: any) {
    console.error('Error creating admin job:', err);
    throw err.response?.data || err;
  }
}

/**
 * Update a job as admin
 */
export async function updateAdminJob(id: string, payload: Partial<JobPayload>) {
  try {
    const res = await apiClient.put(`/admin/jobs/${id}`, payload);
    return res.data;
  } catch (err: any) {
    console.error('Error updating admin job:', err);
    throw err.response?.data || err;
  }
}

/**
 * Update job status (DRAFT, ACTIVE, CLOSED, PENDING)
 */
export async function updateAdminJobStatus(id: string, status: string) {
  try {
    const res = await apiClient.put(`/admin/jobs/${id}/status`, { status });
    return res.data;
  } catch (err: any) {
    console.error('Error updating job status:', err);
    throw err.response?.data || err;
  }
}

/**
 * Publish a job (change status to ACTIVE)
 */
export async function publishAdminJob(id: string) {
  try {
    const res = await apiClient.put(`/admin/jobs/${id}/publish`);
    return res.data;
  } catch (err: any) {
    console.error('Error publishing job:', err);
    throw err.response?.data || err;
  }
}

/**
 * Delete a job (soft delete)
 */
export async function deleteAdminJob(id: string) {
  try {
    const res = await apiClient.delete(`/admin/jobs/${id}`);
    return res.data;
  } catch (err: any) {
    console.error('Error deleting job:', err);
    throw err.response?.data || err;
  }
}

/**
 * Create a sample job for testing
 */
export async function createSampleJob() {
  try {
    const res = await apiClient.post('/admin/jobs/sample');
    return res.data;
  } catch (err: any) {
    console.error('Error creating sample job:', err);
    throw err.response?.data || err;
  }
}
