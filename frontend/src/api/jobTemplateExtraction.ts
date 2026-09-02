import apiClient from './apiClient';

export interface JobTemplateRecruitmentExtraction {
  organisationName?: string | null;
  title?: string | null;
  advertisementNumber?: string | null;
  recruitmentYear?: number | null;
  sector?: 'government' | 'private' | null;
  location?: string | null;
  totalVacancies?: number | null;
  applicationStartDate?: string | null;
  applicationLastDate?: string | null;
  applicationFee?: string | null;
  selectionProcess?: string | null;
  officialNotificationUrl?: string | null;
  officialApplicationUrl?: string | null;
  officialWebsite?: string | null;
  importantInstructions?: string | null;
}

export interface JobTemplateVacancyExtraction {
  postName?: string | null;
  department?: string | null;
  speciality?: string | null;
  subSpeciality?: string | null;
  numberOfVacancies?: number | null;
  category?: string | null;
  qualification?: string | null;
  experience?: string | null;
  ageLimit?: string | null;
  salary?: string | null;
  payLevel?: string | null;
  payScale?: string | null;
  jobType?: string | null;
  location?: string | null;
  otherEligibilityRequirements?: string | null;
  confidenceScore?: number | null;
  sourcePage?: number | null;
}

export interface JobTemplateExtractionResponse {
  sourcePdfName?: string;
  extractionMethod?: string;
  recruitment?: JobTemplateRecruitmentExtraction;
  vacancies?: JobTemplateVacancyExtraction[];
}

export async function extractJobTemplateFromPdf(file: File): Promise<JobTemplateExtractionResponse> {
  const form = new FormData();
  form.append('file', file);

  const response = await apiClient.post('/jobs/template-extract', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return response.data as JobTemplateExtractionResponse;
}
