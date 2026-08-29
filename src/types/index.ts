export type UserRole = 'WORKER' | 'EMPLOYER' | 'ADMIN'

export type VerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED'

export type ApplicationStatus =
  | 'APPLIED'
  | 'SHORTLISTED'
  | 'INTERVIEW'
  | 'HIRED'
  | 'REJECTED'

export interface Profile {
  id: string
  email: string
  role: UserRole
  full_name: string | null
  phone: string | null
  created_at: string
}

export interface WorkerProfile {
  id: string
  profile_id: string
  skills: string[] | null
  years_of_experience: number | null
  location: string | null
  availability: string | null
  expected_salary: number | null
  certifications: Certification[] | null
  verification_status: VerificationStatus
  trust_score: number
  rating: number
  rating_count: number
  created_at: string
  updated_at: string
}

export interface Certification {
  name: string
  issuer: string | null
  year: number | null
}

export interface CompanyProfile {
  id: string
  profile_id: string
  company_name: string | null
  description: string | null
  industry: string | null
  location: string | null
  website: string | null
  created_at: string
  updated_at: string
}

export interface Job {
  id: string
  employer_id: string
  title: string
  description: string | null
  required_skills: string[] | null
  location: string | null
  salary_min: number | null
  salary_max: number | null
  job_type: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Application {
  id: string
  job_id: string
  worker_id: string
  status: ApplicationStatus
  cover_note: string | null
  created_at: string
  updated_at: string
}

export interface Rating {
  id: string
  rater_id: string
  ratee_id: string
  application_id: string | null
  score: number
  review: string | null
  created_at: string
}
