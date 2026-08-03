export type UserRole = 'seeker' | 'employer' | 'employer-individual' | 'admin'

export interface SeekerProfile {
  education: string
  headline: string
  bio: string
  skills: string[]
  preferred_job_types: string[]
  availability: Record<string, unknown>
  preferred_location: string
  resume: string | null
  profile_completion: number
}

export interface EmployerProfile {
  business_name: string
  registration_number: string
  pan_vat_number: string
  contact_person: string
  industry: string
  company_size: string
  website: string
  address: string
  city: string
  wanted_schedule: Record<string, string>
  verification_status: 'pending' | 'approved' | 'rejected'
  rejection_reason: string
  is_verified: boolean
}

export interface ApiUser {
  id: number
  email: string
  phone: string | null
  first_name: string
  last_name: string
  role: UserRole
  preferred_language: 'en' | 'np'
  trust_score: number
  verification_level: number
  is_email_verified: boolean
  is_phone_verified: boolean
  two_factor_enabled: boolean
  email_notifications: boolean
  email_job_alerts: boolean
  email_marketing: boolean
  date_of_birth: string | null
  avatar: string | null
  is_active: boolean
  created_at: string
  seeker_profile?: SeekerProfile
  employer_profile?: EmployerProfile
}

export interface ApiSecurityOverview {
  two_factor_enabled: boolean
  sessions: Array<{ id: string; ip_address: string | null; user_agent: string; created_at: string; last_seen_at: string; current: boolean }>
  login_history: Array<{ id: number; ip_address: string | null; user_agent: string; successful: boolean; created_at: string }>
}

export interface EmployerSummary {
  id: number
  name: string
  trust_score: number
  verification_level: number
  verification_status: string
}

export interface ApiJob {
  id: number
  employer: number
  employer_details: EmployerSummary
  title: string
  category: string
  description: string
  employment_type: 'part-time' | 'freelance' | 'gig' | 'service'
  work_mode: 'onsite' | 'remote' | 'hybrid'
  shift_type: 'morning' | 'day' | 'evening' | 'night' | 'weekend' | 'flexible'
  location: string
  schedule: Record<string, string>
  skills: string[]
  salary_min: string | null
  salary_max: string | null
  salary_period: string
  positions: number
  is_urgent: boolean
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'closed'
  rejection_reason: string
  expires_at: string | null
  application_count: number
  match_percentage: number | null
  is_saved: boolean
  has_applied: boolean
  created_at: string
  updated_at: string
}

export interface ApiApplication {
  id: number
  job: number
  job_details: ApiJob
  seeker: number
  seeker_details: ApiUser
  status: 'submitted' | 'under-review' | 'interview' | 'accepted' | 'rejected' | 'withdrawn'
  cover_letter: string
  employer_notes: string
  created_at: string
  updated_at: string
}

export interface ApiWorkerReview {
  id: number
  reviewer: number
  reviewer_name: string
  worker: number
  worker_details: ApiUser
  application: number
  rating: number
  feedback: string
  created_at: string
  updated_at: string
}

export interface ApiVerification {
  id: number
  user: number
  user_email: string
  document_type: string
  document: string
  status: 'pending' | 'approved' | 'rejected'
  notes: string
  reviewed_by: number | null
  reviewed_by_email?: string
  reviewed_at: string | null
  created_at: string
}

export interface ApiFraudReport {
  id: number
  reporter: number
  reporter_email: string
  reported_user: number | null
  job: number | null
  job_title?: string
  reason: string
  description: string
  status: 'open' | 'investigating' | 'resolved' | 'dismissed'
  resolution_notes: string
  assigned_to: number | null
  created_at: string
  updated_at: string
}

export interface Paginated<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export interface RegisterPayload {
  email: string
  password: string
  first_name: string
  last_name?: string
  phone?: string
  role: Exclude<UserRole, 'admin'>
  preferred_language?: 'en' | 'np'
  profile?: Record<string, unknown>
}

export interface UserUpdatePayload {
  first_name?: string
  last_name?: string
  phone?: string | null
  preferred_language?: 'en' | 'np'
  email_notifications?: boolean
  email_job_alerts?: boolean
  email_marketing?: boolean
  date_of_birth?: string | null
  seeker_profile?: Partial<SeekerProfile>
  employer_profile?: Partial<EmployerProfile>
}

export interface ApiNotification {
  id: number
  recipient: number
  category: string
  title: string
  message: string
  link: string
  is_read: boolean
  email_status: 'pending' | 'sent' | 'failed' | 'skipped'
  emailed_at: string | null
  email_error: string
  created_at: string
}

export interface ApiMessage {
  id: number
  conversation: number
  sender: number
  sender_name: string
  body: string
  attachment: string | null
  attachment_name: string
  is_read: boolean
  created_at: string
}

export interface ApiConversation {
  id: number
  participants: ApiUser[]
  job: number | null
  subject: string
  last_message: ApiMessage | null
  unread_count: number
  created_at: string
  updated_at: string
}

export interface ApiTalent {
  id: number
  name: string
  headline: string
  skills: string[]
  location: string
  availability: Record<string, string>
  trust_score: number
  verification_level: number
  match_percentage: number
}

export interface ApiSavedTalent {
  id: number
  employer: number
  talent: number
  talent_details: ApiTalent
  created_at: string
  updated_at: string
}

export interface ApiServiceListing {
  id: number
  provider: number
  provider_name: string
  provider_trust_score: number
  provider_verification_level: number
  title: string
  category: string
  description: string
  location: string
  price: string
  price_unit: string
  availability: Record<string, string>
  status: 'active' | 'paused'
  created_at: string
  updated_at: string
}

export interface ApiBooking {
  id: number
  service: number
  service_details: ApiServiceListing
  client: number
  scheduled_date: string
  start_time: string
  end_time: string
  notes: string
  status: 'requested' | 'accepted' | 'in-progress' | 'completed' | 'cancelled'
  created_at: string
  updated_at: string
}

export interface ApiAuditLog {
  id: number
  actor: number | null
  actor_email: string
  action: string
  method: string
  path: string
  status_code: number
  ip_address: string | null
  user_agent: string
  created_at: string
}

export interface ApiPlatformSetting {
  id: number
  key: string
  value: unknown
  description: string
  updated_by: number | null
  updated_by_email: string
  created_at: string
  updated_at: string
}

export interface JobPayload {
  title: string
  category?: string
  description: string
  employment_type: ApiJob['employment_type']
  work_mode: ApiJob['work_mode']
  shift_type: ApiJob['shift_type']
  location: string
  schedule?: Record<string, string>
  skills?: string[]
  salary_min?: number
  salary_max?: number
  salary_period?: string
  positions?: number
  is_urgent?: boolean
}
