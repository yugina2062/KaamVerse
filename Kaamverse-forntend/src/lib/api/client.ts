import type {
  ApiApplication,
  ApiFraudReport,
  ApiJob,
  ApiConversation,
  ApiMessage,
  ApiNotification,
  ApiTalent,
  ApiServiceListing,
  ApiBooking,
  ApiAuditLog,
  ApiPlatformSetting,
  ApiUser,
  ApiVerification,
  ApiSecurityOverview,
  JobPayload,
  Paginated,
  RegisterPayload,
  UserUpdatePayload,
  UserRole,
} from './types'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api').replace(/\/$/, '')
const ACCESS_TOKEN_KEY = 'kaamverse.accessToken'
const REFRESH_TOKEN_KEY = 'kaamverse.refreshToken'

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

function storeTokens(access: string, refresh: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, access)
  localStorage.setItem(REFRESH_TOKEN_KEY, refresh)
}

export function clearSession() {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}

function errorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== 'object') return fallback
  const wrapped = payload as { error?: { detail?: unknown }; detail?: unknown }
  const detail = wrapped.error?.detail ?? wrapped.detail
  if (typeof detail === 'string') return detail
  if (detail && typeof detail === 'object') {
    const first = Object.values(detail as Record<string, unknown>)[0]
    if (Array.isArray(first) && typeof first[0] === 'string') return first[0]
    if (typeof first === 'string') return first
  }
  return fallback
}

function emitToast(kind: 'success' | 'error' | 'warning' | 'info', title: string, message = '') {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('kaamverse:toast', { detail: { kind, title, message } }))
}

let refreshInFlight: Promise<string | null> | null = null

async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight
  refreshInFlight = (async () => {
    const refresh = localStorage.getItem(REFRESH_TOKEN_KEY)
    if (!refresh) return null
    const response = await fetch(`${API_BASE_URL}/auth/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    })
    if (!response.ok) {
      clearSession()
      return null
    }
    const data = await response.json() as { access: string; refresh?: string }
    localStorage.setItem(ACCESS_TOKEN_KEY, data.access)
    if (data.refresh) localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh)
    return data.access
  })().finally(() => {
    refreshInFlight = null
  })
  return refreshInFlight
}

const PUBLIC_GET_PREFIXES = ['/jobs/', '/public-stats/', '/services/', '/health/']

function isPublicGet(path: string, method: string) {
  if (method !== 'GET') return false
  return PUBLIC_GET_PREFIXES.some((prefix) => path === prefix || path.startsWith(prefix))
}

async function request<T>(path: string, init: RequestInit = {}, retry = true, forceAnonymous = false): Promise<T> {
  const method = (init.method || 'GET').toUpperCase()
  const headers = new Headers(init.headers)
  if (!(init.body instanceof FormData)) headers.set('Content-Type', 'application/json')
  const access = forceAnonymous ? null : getAccessToken()
  if (access) headers.set('Authorization', `Bearer ${access}`)

  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers })
  } catch {
    throw new ApiError('Cannot reach the KaamVerse API. Make sure the Django server is running.', 0)
  }

  if (response.status === 401 && retry) {
    if (!forceAnonymous && localStorage.getItem(REFRESH_TOKEN_KEY)) {
      const renewed = await refreshAccessToken()
      if (renewed) return request<T>(path, init, false, false)
    }
    // Expired/invalid JWT must not block AllowAny public GETs.
    if (isPublicGet(path, method) && !forceAnonymous) {
      clearSession()
      return request<T>(path, init, false, true)
    }
  }

  if (response.status === 204) return undefined as T
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    const message = errorMessage(payload, `Request failed with status ${response.status}.`)
    if (response.status !== 401 && path !== '/applications/') emitToast(response.status >= 500 ? 'error' : 'warning', 'Request not completed', message)
    throw new ApiError(message, response.status, payload)
  }
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && path !== '/applications/') {
    const detail = payload && typeof payload === 'object' && 'detail' in payload && typeof (payload as { detail?: unknown }).detail === 'string' ? String((payload as { detail: string }).detail) : ''
    emitToast('success', method === 'DELETE' ? 'Removed successfully' : 'Changes saved', detail)
  }
  return payload as T
}

function queryString(params: Record<string, string | number | boolean | undefined>) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') query.set(key, String(value))
  })
  const value = query.toString()
  return value ? `?${value}` : ''
}

export const api = {
  auth: {
    async login(email: string, password: string, twoFactorCode = '') {
      const data = await request<{ access: string; refresh: string; user: ApiUser }>('/auth/token/', {
        method: 'POST',
        body: JSON.stringify({ email, password, two_factor_code: twoFactorCode }),
      })
      storeTokens(data.access, data.refresh)
      return data.user
    },
    async register(payload: RegisterPayload) {
      return request<ApiUser>('/auth/register/', { method: 'POST', body: JSON.stringify(payload) })
    },
    me: () => request<ApiUser>('/auth/me/'),
    updateMe: (payload: UserUpdatePayload) => request<ApiUser>('/auth/me/', { method: 'PATCH', body: JSON.stringify(payload) }),
    changePassword: (currentPassword: string, newPassword: string) => request<{ detail: string }>('/auth/me/password/', { method: 'POST', body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }) }),
    security: () => request<ApiSecurityOverview>('/auth/me/security/'),
    revokeSession: (sessionId: string) => request<void>(`/auth/me/security/sessions/${sessionId}/`, { method: 'DELETE' }),
    clearLoginHistory: () => request<{ deleted: number }>('/auth/me/security/login-history/', { method: 'DELETE' }),
    sendTwoFactorCode: () => request<{ detail: string }>('/auth/me/security/2fa/send/', { method: 'POST' }),
    confirmTwoFactor: (code: string) => request<{ two_factor_enabled: boolean }>('/auth/me/security/2fa/confirm/', { method: 'POST', body: JSON.stringify({ code }) }),
    disableTwoFactor: (password: string) => request<{ two_factor_enabled: boolean }>('/auth/me/security/2fa/disable/', { method: 'POST', body: JSON.stringify({ password }) }),
    requestPasswordReset: (email: string) => request<{ detail: string }>('/auth/password/reset/request/', { method: 'POST', body: JSON.stringify({ email }) }),
    confirmPasswordReset: (email: string, code: string, newPassword: string) => request<{ detail: string }>('/auth/password/reset/confirm/', { method: 'POST', body: JSON.stringify({ email, code, new_password: newPassword }) }),
    uploadResume: (resume: File) => {
      const form = new FormData()
      form.append('resume', resume)
      return request<ApiUser>('/auth/me/resume/', { method: 'POST', body: form })
    },
    uploadAvatar: (avatar: File) => {
      const form = new FormData()
      form.append('avatar', avatar)
      return request<ApiUser>('/auth/me/avatar/', { method: 'POST', body: form })
    },
    removeAvatar: () => request<void>('/auth/me/avatar/', { method: 'DELETE' }),
    removeResume: () => request<void>('/auth/me/resume/', { method: 'DELETE' }),
    sendEmailVerification: () => request<{ detail: string; expires_in?: number; retry_after?: number; verified?: boolean }>('/auth/verification/email/send/', { method: 'POST' }),
    confirmEmailVerification: (code: string) => request<{ verified: boolean }>('/auth/verification/email/confirm/', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),
    sendPhoneVerification: () => request<{ detail: string; development_code?: string }>('/auth/verification/phone/send/', { method: 'POST' }),
    confirmPhoneVerification: (code: string) => request<{ verified: boolean }>('/auth/verification/phone/confirm/', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),
    logout: clearSession,
    hasSession: () => Boolean(getAccessToken() || localStorage.getItem(REFRESH_TOKEN_KEY)),
  },
  jobs: {
    list: (params: Record<string, string | number | boolean | undefined> = {}) =>
      request<Paginated<ApiJob>>(`/jobs/${queryString(params)}`),
    recommendations: () => request<ApiJob[]>('/recommendations/'),
    mine: () => request<Paginated<ApiJob>>('/jobs/mine/'),
    create: (payload: JobPayload) => request<ApiJob>('/jobs/', { method: 'POST', body: JSON.stringify(payload) }),
    update: (id: number, payload: Partial<JobPayload>) => request<ApiJob>(`/jobs/${id}/`, { method: 'PATCH', body: JSON.stringify(payload) }),
    remove: (id: number) => request<void>(`/jobs/${id}/`, { method: 'DELETE' }),
    close: (id: number) => request<ApiJob>(`/jobs/${id}/close/`, { method: 'POST' }),
    reopen: (id: number) => request<ApiJob>(`/jobs/${id}/reopen/`, { method: 'POST' }),
    moderationQueue: () => request<Paginated<ApiJob>>('/jobs/moderation_queue/'),
    moderate: (id: number, decision: 'approved' | 'rejected', rejectionReason = '') =>
      request<ApiJob>(`/jobs/${id}/moderate/`, {
        method: 'POST',
        body: JSON.stringify({ status: decision, rejection_reason: rejectionReason }),
      }),
  },
  applications: {
    list: () => request<Paginated<ApiApplication>>('/applications/'),
    create: (jobId: number, coverLetter = '') =>
      request<ApiApplication>('/applications/', {
        method: 'POST',
        body: JSON.stringify({ job_id: jobId, cover_letter: coverLetter }),
      }),
    updateStatus: (id: number, status: ApiApplication['status'], employerNotes = '') =>
      request<ApiApplication>(`/applications/${id}/update_status/`, {
        method: 'POST',
        body: JSON.stringify({ status, employer_notes: employerNotes }),
      }),
    withdraw: (id: number) =>
      request<ApiApplication>(`/applications/${id}/withdraw/`, { method: 'POST' }),
  },
  workerReviews: {
    list: () => request<Paginated<import('./types').ApiWorkerReview>>('/worker-reviews/'),
    create: (worker: number, application: number, rating: number, feedback: string) =>
      request<import('./types').ApiWorkerReview>('/worker-reviews/', { method: 'POST', body: JSON.stringify({ worker, application, rating, feedback }) }),
  },
  savedJobs: {
    list: () => request<Paginated<{ id: number; job: number; job_details: ApiJob }>>('/saved-jobs/'),
    toggle: (jobId: number) => request<{ saved: boolean }>('/saved-jobs/toggle/', {
      method: 'POST',
      body: JSON.stringify({ job_id: jobId }),
    }),
  },
  savedTalent: {
    list: () => request<Paginated<import('./types').ApiSavedTalent>>('/saved-talent/'),
    toggle: (talentId: number) => request<{ saved: boolean }>('/saved-talent/toggle/', {
      method: 'POST',
      body: JSON.stringify({ talent_id: talentId }),
    }),
  },
  fraudReports: {
    create: (payload: { job?: number; reported_user?: number; reason: string; description: string }) =>
      request('/fraud-reports/', { method: 'POST', body: JSON.stringify(payload) }),
    list: () => request<Paginated<ApiFraudReport>>('/fraud-reports/'),
    updateStatus: (id: number, status: ApiFraudReport['status'], resolutionNotes = '') =>
      request<ApiFraudReport>(`/fraud-reports/${id}/update_status/`, {
        method: 'POST', body: JSON.stringify({ status, resolution_notes: resolutionNotes }),
      }),
  },
  verifications: {
    list: () => request<Paginated<ApiVerification>>('/auth/verifications/'),
    submit: (documentType: string, document: File) => {
      const form = new FormData()
      form.append('document_type', documentType)
      form.append('document', document)
      return request('/auth/verifications/', { method: 'POST', body: form })
    },
    review: (id: number, status: 'approved' | 'rejected', notes = '') =>
      request<ApiVerification>(`/auth/verifications/${id}/review/`, {
        method: 'POST', body: JSON.stringify({ status, notes }),
      }),
  },
  admin: {
    users: () => request<Paginated<ApiUser>>('/auth/users/'),
    suspendUser: (id: number, reason = '') => request<ApiUser>(`/auth/users/${id}/suspend/`, { method: 'POST', body: JSON.stringify({ reason }) }),
    activateUser: (id: number) => request<ApiUser>(`/auth/users/${id}/activate/`, { method: 'POST' }),
    broadcast: (payload: { audience: 'all' | 'seekers' | 'employers' | 'company-employers' | 'individual-employers'; category: string; title: string; message: string; link?: string; send_email: boolean; is_marketing: boolean }) =>
      request('/notification-broadcasts/', { method: 'POST', body: JSON.stringify(payload) }),
    auditLogs: () => request<Paginated<ApiAuditLog>>('/audit-logs/'),
    platformSettings: () => request<Paginated<ApiPlatformSetting>>('/platform-settings/'),
    updatePlatformSetting: (key: string, value: unknown, description = '') => request<ApiPlatformSetting>(`/platform-settings/${key}/`, { method: 'PUT', body: JSON.stringify({ key, value, description }) }),
    createPlatformSetting: (key: string, value: unknown, description = '') => request<ApiPlatformSetting>('/platform-settings/', { method: 'POST', body: JSON.stringify({ key, value, description }) }),
  },
  notifications: {
    list: () => request<Paginated<ApiNotification>>('/notifications/'),
    markRead: (id: number) => request<ApiNotification>(`/notifications/${id}/mark_read/`, { method: 'POST' }),
    markAllRead: () => request<{ updated: number }>('/notifications/mark_all_read/', { method: 'POST' }),
  },
  conversations: {
    list: () => request<Paginated<ApiConversation>>('/conversations/'),
    create: (participantId: number, subject = '', jobId?: number) => request<ApiConversation>('/conversations/', { method: 'POST', body: JSON.stringify({ participant_id: participantId, subject, job_id: jobId }) }),
    messages: (id: number) => request<ApiMessage[]>(`/conversations/${id}/messages/`),
    send: (id: number, body: string, attachment?: File | null) => {
      if (attachment) {
        const form = new FormData()
        form.append('body', body)
        form.append('attachment', attachment)
        return request<ApiMessage>(`/conversations/${id}/messages/`, { method: 'POST', body: form })
      }
      return request<ApiMessage>(`/conversations/${id}/messages/`, { method: 'POST', body: JSON.stringify({ body }) })
    },
  },
  talent: {
    list: (search = '') => request<Paginated<ApiTalent>>(`/talent/${queryString({ search })}`),
  },
  services: {
    list: (params: Record<string, string | number | boolean | undefined> = {}) => request<Paginated<ApiServiceListing>>(`/services/${queryString(params)}`),
    mine: () => request<Paginated<ApiServiceListing>>('/services/mine/'),
    create: (payload: {
      title: string
      category: string
      description: string
      location?: string
      price: number
      price_unit?: string
      availability?: Record<string, string>
      status?: ApiServiceListing['status']
    }) => request<ApiServiceListing>('/services/', { method: 'POST', body: JSON.stringify(payload) }),
    update: (id: number, payload: Partial<{
      title: string
      category: string
      description: string
      location: string
      price: number
      price_unit: string
      availability: Record<string, string>
      status: ApiServiceListing['status']
    }>) => request<ApiServiceListing>(`/services/${id}/`, { method: 'PATCH', body: JSON.stringify(payload) }),
    remove: (id: number) => request<void>(`/services/${id}/`, { method: 'DELETE' }),
  },
  bookings: {
    list: () => request<Paginated<ApiBooking>>('/bookings/'),
    create: (payload: { service: number; scheduled_date: string; start_time: string; end_time: string; notes?: string }) => request<ApiBooking>('/bookings/', { method: 'POST', body: JSON.stringify(payload) }),
    updateStatus: (id: number, status: ApiBooking['status']) => request<ApiBooking>(`/bookings/${id}/update_status/`, { method: 'POST', body: JSON.stringify({ status }) }),
  },
  userActions: {
    create: (label: string, detail = '', page = window.location.pathname + window.location.search) =>
      request('/user-actions/', { method: 'POST', body: JSON.stringify({ label, detail, page }) }),
  },
  publicStats: () => request<{ verified_companies: number; professionals: number; active_jobs: number; active_services: number }>('/public-stats/'),
  dashboard: () => request<Record<string, string | number>>('/dashboard/'),
}

export function normalizeRole(role: UserRole): UserRole {
  return role
}
