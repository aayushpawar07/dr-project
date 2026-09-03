export type UserRole = 'admin' | 'employer' | 'candidate';

export type JobSector = 'government' | 'private';

export type JobCategory = 
  | 'Junior Resident' 
  | 'Senior Resident' 
  | 'Medical Officer' 
  | 'Faculty' 
  | 'Specialist' 
  | 'Dental'
  | 'AYUSH'
  | 'Nursing'
  | 'Paramedical'
  | 'Paramedical / Nursing'
  | 'Allied Health'
  | 'Allied Health Professionals' 
  | 'Pharmacy'
  | 'Psychology & Mental Health'
  | 'Nutrition & Dietetics'
  | 'Life Science & Research'
  | 'Hospital Administration'
  | 'Public Health';

export type ApplicationStatus = 'applied' | 'shortlisted' | 'interview' | 'rejected' | 'selected';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
}

export interface Candidate extends User {
  qualifications: string;
  experience: string;
  resumeUrl?: string;
  savedJobs: string[];
}

export interface Employer extends User {
  companyName: string;
  companyType: 'hospital' | 'consultancy' | 'hr';
  verified: boolean;
  subscriptionActive: boolean;
  subscriptionEndDate?: string;
}

export interface Job {
  id: string;
  title: string;
  organization: string;
  sector: JobSector;
  category: JobCategory;
  location: string;
  state?: string;
  qualification: string;
  experience: string;
  numberOfPosts: number;
  salary?: string;
  description: string;
  lastDate: string;
  postedDate: string;
  pdfUrl?: string;
  applyLink?: string;
  employerId?: string;
  status: 'active' | 'closed' | 'pending';
  slug?: string;
  speciality?: string;
  department?: string;
  sourceRecruitmentId?: string;
}

export interface Application {
  id: string;
  jobId: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  candidatePhone: string;
  resumeUrl: string;
  status: ApplicationStatus;
  appliedDate: string;
  interviewDate?: string;
  notes?: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'job_alert' | 'application_update' | 'interview_scheduled' | 'subscription';
  message: string;
  read: boolean;
  createdAt: string;
  relatedJobId?: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  duration: string;
  jobPostsAllowed: number;
  features: string[];
}
