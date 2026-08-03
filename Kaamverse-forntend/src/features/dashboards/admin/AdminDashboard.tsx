import { useEffect, useState } from 'react'
import { api, ApiError } from '@/lib/api/client'
import type { ApiAuditLog, ApiFraudReport, ApiJob, ApiPlatformSetting, ApiUser, ApiVerification } from '@/lib/api/types'
import { PreferenceToggle, useActionDialog } from '@/components/ui/ActionDialogs'
import { SecurityCenter } from '@/components/settings/SecurityCenter'

type ASection = 'dashboard' | 'users' | 'content' | 'trust' | 'reports' | 'analytics' | 'system' | 'settings'

// ─── Icons ────────────────────────────────────────────────────────────────────

function Ico({ d, cls = 'w-5 h-5' }: { d: string; cls?: string }) {
  return (
    <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  )
}

const IC = {
  home: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  users: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
  doc: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
  shield: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
  flag: 'M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9',
  chart: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  server: 'M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01',
  gear: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
  logout: 'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1',
  search: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
  check: 'M5 13l4 4L19 7',
  x: 'M6 18L18 6M6 6l12 12',
  eye: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z',
  trash: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
  edit: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
  ban: 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636',
  bell: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
  plus: 'M12 4v16m8-8H4',
  brain: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
  alert: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
  arrow: 'M13 7l5 5m0 0l-5 5m5-5H6',
  filter: 'M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z',
  download: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4',
}

function downloadCsv(filename: string, rows: Array<Array<string | number>>) {
  const csv = rows.map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const USERS = [
  { id: 1, name: 'Aarav Sharma', email: 'aarav@gmail.com', role: 'Jobseeker', trust: 96, badge: 'Trusted Professional', district: 'Kathmandu', joined: 'Jan 15, 2025', status: 'Active', rating: 4.9, initials: 'AS', color: '#2563EB', risk: 'Low' },
  { id: 2, name: 'Priya Thapa', email: 'priya@gmail.com', role: 'Jobseeker', trust: 94, badge: 'Identity Verified', district: 'Lalitpur', joined: 'Feb 3, 2025', status: 'Active', rating: 4.8, initials: 'PT', color: '#7C3AED', risk: 'Low' },
  { id: 3, name: 'Rohan Adhikari', email: 'rohan@gmail.com', role: 'Employer', trust: 91, badge: 'Identity Verified', district: 'Bhaktapur', joined: 'Jan 28, 2025', status: 'Suspended', rating: 3.2, initials: 'RA', color: '#DC2626', risk: 'High' },
  { id: 4, name: 'Sita Gurung', email: 'sita@gmail.com', role: 'Jobseeker', trust: 98, badge: 'Trusted Professional', district: 'Kathmandu', joined: 'Mar 1, 2025', status: 'Active', rating: 4.9, initials: 'SG', color: '#059669', risk: 'Low' },
  { id: 5, name: 'Dipesh Maharjan', email: 'dipesh@company.com', role: 'Company', trust: 88, badge: 'Basic Verified', district: 'Kathmandu', joined: 'Feb 20, 2025', status: 'Pending', rating: 4.1, initials: 'DM', color: '#D97706', risk: 'Medium' },
  { id: 6, name: 'Sunita Rai', email: 'sunita@gmail.com', role: 'Jobseeker', trust: 89, badge: 'Identity Verified', district: 'Pokhara', joined: 'Mar 5, 2025', status: 'Active', rating: 4.6, initials: 'SR', color: '#0891B2', risk: 'Low' },
  { id: 7, name: 'Bikash Khadka', email: 'bikash@firm.com', role: 'Employer', trust: 72, badge: 'Basic Verified', district: 'Chitwan', joined: 'Feb 10, 2025', status: 'Active', rating: 3.8, initials: 'BK', color: '#7C3AED', risk: 'Medium' },
  { id: 8, name: 'Anita Lama', email: 'anita@gmail.com', role: 'Jobseeker', trust: 85, badge: 'Identity Verified', district: 'Lalitpur', joined: 'Jan 5, 2025', status: 'Active', rating: 4.5, initials: 'AL', color: '#0891B2', risk: 'Low' },
]

const JOBS = [
  { id: 1, title: 'Senior React Developer', employer: 'Leapfrog Technology', category: 'Technology', applicants: 28, views: 342, status: 'Active', trust: 80, verification: 'Identity Verified', created: 'Mar 10, 2025' },
  { id: 2, title: 'Brand Designer', employer: 'Creative Hub', category: 'Design', applicants: 14, views: 198, status: 'Pending Review', trust: 70, verification: 'Basic Verified', created: 'Mar 12, 2025' },
  { id: 3, title: 'Home Delivery Rider', employer: 'Daraz Nepal', category: 'Delivery', applicants: 54, views: 620, status: 'Active', trust: 60, verification: 'Basic Verified', created: 'Mar 8, 2025' },
  { id: 4, title: 'Private Home Tutor', employer: 'EduNepal', category: 'Education', applicants: 11, views: 88, status: 'Flagged', trust: 90, verification: 'Identity Verified', created: 'Mar 11, 2025' },
]

const VERIFICATIONS = [
  { id: 1, name: 'Nisha Shakya', initials: 'NS', color: '#DC2626', doc: 'Citizenship Card', level: 'Identity Verification', submitted: '2h ago', aiScore: 94, status: 'Pending' },
  { id: 2, name: 'Karan Basnet', initials: 'KB', color: '#2563EB', doc: 'Passport', level: 'Identity Verification', submitted: '4h ago', aiScore: 88, status: 'Pending' },
  { id: 3, name: 'Maya Tamang', initials: 'MT', color: '#059669', doc: 'Professional Certificate', level: 'Professional Verification', submitted: '6h ago', aiScore: 76, status: 'Pending' },
  { id: 4, name: 'Raj Shrestha', initials: 'RS', color: '#D97706', doc: 'NID Front + Back', level: 'Identity Verification', submitted: '1d ago', aiScore: 91, status: 'Pending' },
]

const ALERTS = [
  { id: 1, type: 'Duplicate Account', user: 'Unknown User', severity: 'High', confidence: 96, reason: 'Same device fingerprint detected for 3 accounts created in 48 hours. IP: 192.168.1.45', action: 'Auto-blocked pending review' },
  { id: 2, type: 'Fake Documents', user: 'Rohan Adhikari', severity: 'Critical', confidence: 89, reason: 'Submitted citizenship document matches known fraudulent template pattern. Metadata inconsistencies found.', action: 'Flagged for manual review' },
  { id: 3, type: 'Spam Job Posting', user: 'Bikash Khadka', severity: 'Medium', confidence: 78, reason: 'Posted 12 identical job listings within 2 hours with different titles. Content similarity: 98%.', action: 'Auto-hidden, pending review' },
  { id: 4, type: 'Mass Applications', user: 'Anon Jobseeker #447', severity: 'Low', confidence: 72, reason: 'Applied to 67 jobs in 30 minutes without reading job descriptions (avg. time on page: 2s).', action: 'Rate-limited, notification sent' },
]

const REPORTS = [
  { id: 1, reporter: 'Sita Gurung', reported: 'Rohan Adhikari', type: 'Jobseeker', reason: 'Payment not received after job completion', status: 'Open', priority: 'High', aiSummary: 'Evidence strongly supports the claim. Chat logs confirm payment agreement.', date: 'Mar 10' },
  { id: 2, reporter: 'Priya Thapa', reported: 'Unknown Employer', type: 'Employer', reason: 'Misleading job description — actual work different from posting', status: 'Under Review', priority: 'Medium', aiSummary: 'Job description contains 4 material differences vs reported actual duties.', date: 'Mar 9' },
  { id: 3, reporter: 'Aarav Sharma', reported: 'Daraz Nepal Job Post', type: 'Job', reason: 'Suspicious requirements asking for personal banking details', status: 'Resolved', priority: 'Critical', aiSummary: 'Confirmed phishing attempt. Post removed. Employer account suspended.', date: 'Mar 7' },
]

const LOGS = [
  { id: 1, user: 'Admin Suresh', action: 'Approved Identity Verification', time: '2 min ago', ip: '192.168.1.1', device: 'Chrome / Mac', status: 'Success' },
  { id: 2, user: 'Admin Suresh', action: 'Suspended User: Rohan Adhikari', time: '15 min ago', ip: '192.168.1.1', device: 'Chrome / Mac', status: 'Success' },
  { id: 3, user: 'System (AI)', action: 'Auto-flagged: Duplicate Account Detected', time: '32 min ago', ip: 'System', device: 'AI Engine v2.1', status: 'Warning' },
  { id: 4, user: 'Admin Priya', action: 'Updated Trust Score Formula — Weight: Jobs Completed +5%', time: '1h ago', ip: '10.0.0.15', device: 'Firefox / Windows', status: 'Success' },
  { id: 5, user: 'System (AI)', action: 'Fraud Alert Raised: Fake Document Submission', time: '2h ago', ip: 'System', device: 'AI Engine v2.1', status: 'Critical' },
  { id: 6, user: 'Admin Suresh', action: 'Exported User Report (1,247 rows)', time: '3h ago', ip: '192.168.1.1', device: 'Chrome / Mac', status: 'Success' },
]

// ─── Shared components ────────────────────────────────────────────────────────

function TBadge({ level }: { level: string }) {
  const map: Record<string, string> = {
    'Basic Verified': 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
    'Identity Verified': 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300',
    'Trusted Professional': 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300',
  }
  const dots: Record<string, string> = {
    'Basic Verified': 'bg-slate-400', 'Identity Verified': 'bg-blue-500',
    'Trusted Professional': 'bg-amber-500',
  }
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${map[level] || map['Basic Verified']}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dots[level] || 'bg-slate-400'}`} />
      {level}
    </span>
  )
}

function StatusPill({ s }: { s: string }) {
  const map: Record<string, string> = {
    Active: 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300',
    Pending: 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300',
    'Pending Review': 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300',
    Suspended: 'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300',
    Flagged: 'bg-orange-50 dark:bg-orange-950 text-orange-700 dark:text-orange-300',
    Open: 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300',
    'Under Review': 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300',
    Resolved: 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300',
    Success: 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300',
    Warning: 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300',
    Critical: 'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300',
  }
  return <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${map[s] || 'bg-slate-100 dark:bg-slate-800 text-slate-600'}`}>{s}</span>
}

function SeverityBadge({ s }: { s: string }) {
  const map: Record<string, string> = {
    Low: 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900',
    Medium: 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-100 dark:border-amber-900',
    High: 'bg-orange-50 dark:bg-orange-950 text-orange-700 dark:text-orange-300 border border-orange-100 dark:border-orange-900',
    Critical: 'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 border border-red-100 dark:border-red-900',
  }
  return <span className={`text-xs px-2 py-1 rounded-lg font-bold ${map[s] || ''}`}>{s}</span>
}

// ─── User Drawer ──────────────────────────────────────────────────────────────

function UserDrawer({ user, onClose }: { user: typeof USERS[0]; onClose: () => void }) {
  const [tab, setTab] = useState('overview')
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border-l border-slate-100 dark:border-slate-800 shadow-2xl overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 p-5 flex items-center justify-between z-10">
          <h2 className="font-heading font-bold text-slate-900 dark:text-white">User Profile</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800">
            <Ico d={IC.x} cls="w-4 h-4" />
          </button>
        </div>
        <div className="p-5">
          {/* Profile header */}
          <div className="flex items-center gap-4 mb-5">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-white text-lg" style={{ backgroundColor: user.color }}>{user.initials}</div>
            <div className="flex-1">
              <h3 className="font-heading font-bold text-slate-900 dark:text-white mb-1">{user.name}</h3>
              <div className="flex flex-wrap gap-1">
                <TBadge level={user.badge} />
                <StatusPill s={user.status} />
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${user.risk === 'Low' ? 'bg-green-50 dark:bg-green-950 text-green-700' : user.risk === 'Medium' ? 'bg-amber-50 dark:bg-amber-950 text-amber-700' : 'bg-red-50 dark:bg-red-950 text-red-700'}`}>
                  🤖 {user.risk} Risk
                </span>
              </div>
            </div>
            <div className="text-center shrink-0">
              <div className="font-heading font-extrabold text-2xl text-amber-500">{user.trust}</div>
              <div className="text-xs text-slate-400">Trust</div>
            </div>
          </div>

          {/* Info */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            {[['Email', user.email], ['Role', user.role], ['District', user.district], ['Joined', user.joined], ['Rating', `${user.rating}★`]].map(([k, v]) => (
              <div key={k} className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
                <p className="text-xs text-slate-400 mb-0.5">{k}</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{v}</p>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
            {['overview','activity','docs','warnings'].map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize whitespace-nowrap ${tab === t ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                {t}
              </button>
            ))}
          </div>

          {tab === 'overview' && (
            <div className="space-y-3">
              {[['Jobs Applied', '23'], ['Jobs Completed', '18'], ['Completion Rate', '78%'], ['Response Time', '< 1h'], ['Profile Views', '342']].map(([k, v]) => (
                <div key={k} className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
                  <span className="text-sm text-slate-500 dark:text-slate-400">{k}</span>
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">{v}</span>
                </div>
              ))}
            </div>
          )}

          {tab === 'activity' && (
            <div className="space-y-3">
              {[
                { action: 'Applied to Senior React Developer at Leapfrog', time: '2h ago', color: '#2563EB' },
                { action: 'Completed job: UI Design Sprint for eSewa', time: '1d ago', color: '#22C55E' },
                { action: 'Received 5-star review from Priya Thapa', time: '2d ago', color: '#F59E0B' },
                { action: 'Identity verification approved', time: '5d ago', color: '#059669' },
              ].map(a => (
                <div key={a.action} className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: a.color }} />
                  <div className="flex-1">
                    <p className="text-sm text-slate-700 dark:text-slate-300">{a.action}</p>
                    <p className="text-xs text-slate-400">{a.time}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'docs' && (
            <div className="space-y-3">
              {[['Citizenship Card (Front)', 'Verified', '#22C55E'], ['Citizenship Card (Back)', 'Verified', '#22C55E'], ['Profile Photo', 'Verified', '#22C55E'], ['Professional Certificate', 'Pending', '#F59E0B']].map(([doc, s, c]) => (
                <div key={doc} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                  <span className="text-sm text-slate-700 dark:text-slate-300">{doc}</span>
                  <span className="text-xs font-semibold" style={{ color: c }}>{s}</span>
                </div>
              ))}
            </div>
          )}

          {tab === 'warnings' && (
            <div className="space-y-3">
              {user.risk === 'High' ? (
                <div className="bg-red-50 dark:bg-red-950 rounded-xl p-4 border border-red-100 dark:border-red-900">
                  <p className="text-sm font-semibold text-red-800 dark:text-red-200 mb-1">⚠️ Fraud Warning — Active</p>
                  <p className="text-xs text-red-600 dark:text-red-400">Submitted potentially fraudulent document on Mar 8, 2025. Account under investigation.</p>
                </div>
              ) : (
                <p className="text-sm text-slate-400 text-center py-6">No warnings on record.</p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 mt-6">
            <button data-action-dialog className="flex-1 py-2.5 border border-amber-200 dark:border-amber-900 text-amber-700 dark:text-amber-300 text-sm font-semibold rounded-xl hover:bg-amber-50 dark:hover:bg-amber-950 transition-colors">
              Warn
            </button>
            <button data-action-dialog className="flex-1 py-2.5 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-sm font-semibold rounded-xl hover:bg-red-50 dark:hover:bg-red-950 transition-colors">
              Suspend
            </button>
            <button data-action-dialog className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-semibold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function AdminDashboardHome({ setSection }: { setSection: (s: ASection) => void }) {
  const kpis = [
    { label: 'Total Users', value: '12,847', icon: '👥', color: '#2563EB', trend: '+234 this week' },
    { label: 'Jobseekers', value: '9,204', icon: '👷', color: '#7C3AED', trend: '71.6% of users' },
    { label: 'Employers', value: '2,891', icon: '🏢', color: '#059669', trend: '+38 this week' },
    { label: 'Companies', value: '752', icon: '🏬', color: '#0891B2', trend: '+12 verified' },
    { label: 'Active Jobs', value: '3,412', icon: '💼', color: '#F59E0B', trend: '+87 today' },
    { label: 'Freelance', value: '1,203', icon: '💻', color: '#7C3AED', trend: '+23 today' },
    { label: 'On-Demand Gigs', value: '892', icon: '⚡', color: '#D97706', trend: '+41 today' },
    { label: 'Service Listings', value: '2,108', icon: '🛍️', color: '#0891B2', trend: '+19 today' },
    { label: 'Pending Verifications', value: '127', icon: '🪪', color: '#F59E0B', trend: '↑ 23 new today' },
    { label: 'Trust Alerts', value: '14', icon: '🚨', color: '#EF4444', trend: '4 critical' },
    { label: 'Reports', value: '38', icon: '⚑', color: '#DC2626', trend: '12 unresolved' },
    { label: 'Platform Health', value: '99.9%', icon: '✅', color: '#22C55E', trend: 'All systems go' },
  ]

  const months = ['Sep','Oct','Nov','Dec','Jan','Feb','Mar']
  const reg = [820, 1100, 950, 1400, 1250, 1820, 1640]
  const maxReg = Math.max(...reg)

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Welcome */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 rounded-2xl p-6 mb-6 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 0%, transparent 50%), radial-gradient(circle at 80% 20%, #2563EB 0%, transparent 50%)' }} />
        <div className="relative z-10 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-slate-400 text-sm mb-1">Admin Command Center · KaamVerse</p>
            <h1 className="font-heading text-2xl font-extrabold mb-1">Welcome back, Administrator.</h1>
            <p className="text-slate-300 text-sm">Platform is healthy. 14 trust alerts require attention.</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            {[
              { label: '🤖 AI Engine', status: 'Operational', color: '#22C55E' },
              { label: '🛡️ Fraud Detection', status: 'Active', color: '#22C55E' },
              { label: '📊 Analytics', status: 'Running', color: '#22C55E' },
            ].map(s => (
              <div key={s.label} className="bg-white/10 rounded-xl px-3 py-2">
                <p className="text-xs text-slate-300">{s.label}</p>
                <p className="text-xs font-bold" style={{ color: s.color }}>● {s.status}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 mb-6">
        {kpis.map(k => (
          <div key={k.label} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-4 hover:shadow-md transition-shadow">
            <div className="text-xl mb-2">{k.icon}</div>
            <div className="font-heading font-extrabold text-xl mb-0.5" style={{ color: k.color }}>{k.value}</div>
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 leading-tight">{k.label}</p>
            <p className="text-xs text-slate-400 leading-tight">{k.trend}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        {/* Registration Trend */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-heading font-bold text-slate-900 dark:text-white">Daily Registrations</h2>
            <span className="text-xs px-2.5 py-1 rounded-full bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 font-semibold">+18.3% vs last month</span>
          </div>
          <div className="flex items-end gap-2 h-32 mb-2">
            {months.map((m, i) => (
              <div key={m} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full rounded-t-lg relative group cursor-pointer hover:opacity-90 transition-opacity"
                  style={{ height: `${(reg[i]/maxReg)*100}%`, background: `linear-gradient(to top, #2563EB, #4F46E5)` }}>
                  <div className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:block bg-slate-900 text-white text-xs px-2 py-1 rounded-lg whitespace-nowrap z-10">{reg[i].toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            {months.map(m => <div key={m} className="flex-1 text-center text-xs text-slate-400">{m}</div>)}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5">
          <h2 className="font-heading font-bold text-slate-900 dark:text-white mb-4">Quick Actions</h2>
          <div className="space-y-2">
            {[
              { icon: '🪪', label: 'Review Verifications', badge: '127', fn: () => setSection('trust'), color: 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300' },
              { icon: '🚨', label: 'Trust Alerts', badge: '14', fn: () => setSection('trust'), color: 'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300' },
              { icon: '⚑', label: 'Open Reports', badge: '38', fn: () => setSection('reports'), color: 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300' },
              { icon: '👥', label: 'Manage Users', badge: '12,847', fn: () => setSection('users'), color: 'bg-violet-50 dark:bg-violet-950 text-violet-700 dark:text-violet-300' },
              { icon: '📊', label: 'View Analytics', badge: '', fn: () => setSection('analytics'), color: 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300' },
              { icon: '⚙️', label: 'System Health', badge: '', fn: () => setSection('system'), color: 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300' },
            ].map(a => (
              <button key={a.label} onClick={a.fn}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0 ${a.color.split(' ').slice(0, 2).join(' ')}`}>{a.icon}</div>
                <span className="flex-1 text-sm font-medium text-slate-700 dark:text-slate-300">{a.label}</span>
                {a.badge && <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{a.badge}</span>}
                <Ico d={IC.arrow} cls="w-4 h-4 text-slate-300 dark:text-slate-600" />
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recent Alerts */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading font-bold text-slate-900 dark:text-white">🤖 AI Fraud Alerts</h2>
            <button onClick={() => setSection('trust')} className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline">View all →</button>
          </div>
          {ALERTS.slice(0, 3).map(a => (
            <div key={a.id} className="flex items-start gap-3 mb-3 last:mb-0 p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${a.severity === 'Critical' ? 'bg-red-100 dark:bg-red-950 text-red-600' : a.severity === 'High' ? 'bg-orange-100 dark:bg-orange-950 text-orange-600' : 'bg-amber-100 dark:bg-amber-950 text-amber-600'}`}>
                <Ico d={IC.alert} cls="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">{a.type}</span>
                  <SeverityBadge s={a.severity} />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{a.reason.slice(0, 80)}...</p>
              </div>
            </div>
          ))}
        </div>

        {/* Recent Activity */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading font-bold text-slate-900 dark:text-white">Recent Activity</h2>
            <button onClick={() => setSection('system')} className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline">View logs →</button>
          </div>
          {LOGS.slice(0, 5).map(l => (
            <div key={l.id} className="flex items-center gap-3 mb-3 last:mb-0">
              <div className={`w-2 h-2 rounded-full shrink-0 ${l.status === 'Success' ? 'bg-green-500' : l.status === 'Warning' ? 'bg-amber-500' : 'bg-red-500'}`} />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-700 dark:text-slate-300 truncate">{l.action}</p>
                <p className="text-xs text-slate-400">{l.user} · {l.time}</p>
              </div>
              <StatusPill s={l.status} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Users Workspace ──────────────────────────────────────────────────────────

function UsersWorkspace() {
  const dialog = useActionDialog()
  const [tab, setTab] = useState('all')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<typeof USERS[0] | null>(null)
  const [users, setUsers] = useState<typeof USERS>([])

  const mapUser = (user: ApiUser): typeof USERS[number] => {
    const name = `${user.first_name} ${user.last_name}`.trim() || user.email.split('@')[0]
    const colors = ['#2563EB', '#7C3AED', '#059669', '#D97706', '#0891B2']
    return {
      id: user.id, name, email: user.email,
      role: user.role === 'seeker' ? 'Jobseeker' : user.role === 'admin' ? 'Admin' : user.role === 'employer' ? 'Company' : 'Employer',
      trust: user.trust_score,
      badge: user.verification_level >= 3 ? 'Trusted Professional' : user.verification_level >= 2 ? 'Identity Verified' : 'Basic Verified',
      district: user.employer_profile?.city || user.seeker_profile?.preferred_location || 'Not set',
      joined: new Date(user.created_at).toLocaleDateString(), status: user.is_active ? 'Active' : 'Suspended', rating: 0,
      initials: name.split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase(), color: colors[user.id % colors.length],
      risk: user.trust_score < 40 ? 'High' : user.trust_score < 70 ? 'Medium' : 'Low',
    }
  }

  const loadUsers = () => api.admin.users().then(data => setUsers(data.results.map(mapUser))).catch(error => dialog.alert({ title: 'Users unavailable', message: error instanceof Error ? error.message : 'Could not load users.', variant: 'danger' }))
  useEffect(() => { void loadUsers() }, [])

  const filtered = users.filter(u => {
    const matchesTab = tab === 'all' || (tab === 'workers' && u.role === 'Jobseeker') || (tab === 'employers' && u.role === 'Employer') || (tab === 'companies' && u.role === 'Company') || (tab === 'admins' && u.role === 'Admin')
    return matchesTab && (u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()))
  })

  const toggleSuspension = async (user: typeof USERS[number]) => {
    const suspending = user.status !== 'Suspended'
    if (!await dialog.confirm({ title: suspending ? 'Suspend user' : 'Activate user', message: `${suspending ? 'Suspend' : 'Activate'} ${user.name}?`, variant: suspending ? 'danger' : 'warning' })) return
    const reason = suspending ? await dialog.prompt({ title: 'Suspension reason', message: 'This reason will be emailed to the user and recorded in their notification history.', placeholder: 'Explain the policy or safety reason...', confirmLabel: 'Suspend account' }) : ''
    if (suspending && !reason) return
    try { suspending ? await api.admin.suspendUser(user.id, reason || '') : await api.admin.activateUser(user.id); await loadUsers() }
    catch (error) { await dialog.alert({ title: 'Action failed', message: error instanceof Error ? error.message : 'Could not update this user.', variant: 'danger' }) }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="font-heading text-2xl font-extrabold text-slate-900 dark:text-white mb-1">Users</h1>
      <p className="text-slate-400 text-sm mb-5">Manage all platform users, jobseekers, employers and companies.</p>

      <div className="flex gap-2 mb-5 flex-wrap">
        {['all','workers','employers','companies','admins'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold capitalize transition-all ${tab === t ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}>
            {t === 'workers' ? 'jobseekers' : t}
          </button>
        ))}
      </div>

      {/* Filters + Search */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-4 mb-4 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-48 relative">
          <Ico d={IC.search} cls="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-400" />
        </div>
        <select className="px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 outline-none">
          <option>All Verification</option><option>Basic Verified</option><option>Identity Verified</option><option>Trusted Professional</option>
        </select>
        <select className="px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 outline-none">
          <option>All Status</option><option>Active</option><option>Pending</option><option>Suspended</option>
        </select>
        <button onClick={() => downloadCsv('kaamverse-users.csv', [['Name','Email','Role','Trust','Status'], ...filtered.map(u => [u.name,u.email,u.role,u.trust,u.status])])} className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors">
          <Ico d={IC.download} cls="w-4 h-4" /> Export
        </button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                {['User','Role','Verification','Trust','Risk','District','Status','Actions'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 px-4 py-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id} className="border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs shrink-0" style={{ backgroundColor: u.color }}>{u.initials}</div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white whitespace-nowrap">{u.name}</p>
                        <p className="text-xs text-slate-400">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><span className="text-xs text-slate-600 dark:text-slate-400">{u.role}</span></td>
                  <td className="px-4 py-3"><TBadge level={u.badge} /></td>
                  <td className="px-4 py-3"><span className="text-sm font-bold text-amber-600">{u.trust}</span></td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${u.risk === 'Low' ? 'bg-green-50 dark:bg-green-950 text-green-700' : u.risk === 'Medium' ? 'bg-amber-50 dark:bg-amber-950 text-amber-700' : 'bg-red-50 dark:bg-red-950 text-red-700'}`}>{u.risk}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{u.district}</td>
                  <td className="px-4 py-3"><StatusPill s={u.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setSelected(u)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 rounded-lg transition-colors" title="View">
                        <Ico d={IC.eye} cls="w-4 h-4" />
                      </button>
                      <button onClick={() => dialog.alert({ title: 'Warning recorded', message: `A moderation warning has been recorded for ${u.name}.`, variant: 'warning' })} className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950 rounded-lg transition-colors" title="Warn">
                        <Ico d={IC.alert} cls="w-4 h-4" />
                      </button>
                      <button onClick={() => toggleSuspension(u)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg transition-colors" title={u.status === 'Suspended' ? 'Activate' : 'Suspend'}>
                        <Ico d={IC.ban} cls="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Showing {filtered.length} of {users.length} users</span>
          <div className="flex gap-1">
            {['← Prev','1','2','3','Next →'].map(p => (
              <button data-action-dialog key={p} className={`px-2.5 py-1 rounded-lg ${p === '1' ? 'bg-blue-600 text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>{p}</button>
            ))}
          </div>
        </div>
      </div>

      {selected && <UserDrawer user={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}

// ─── Content Workspace ────────────────────────────────────────────────────────

function ContentWorkspace() {
  const dialog = useActionDialog()
  const [tab, setTab] = useState('jobs')
  const [liveJobs, setLiveJobs] = useState<Array<typeof JOBS[number] & { employmentType: ApiJob['employment_type'] }>>([])
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [selectedJob, setSelectedJob] = useState<(typeof JOBS[number] & { employmentType: ApiJob['employment_type'] }) | null>(null)
  const [message, setMessage] = useState('Loading live moderation data...')

  const mapAdminJob = (job: ApiJob): typeof JOBS[number] & { employmentType: ApiJob['employment_type'] } => ({
    id: job.id,
    title: job.title,
    employer: job.employer_details.name,
    category: job.category || 'General',
    employmentType: job.employment_type,
    applicants: job.application_count,
    views: 0,
    status: job.status === 'pending' ? 'Pending Review' : job.status === 'approved' ? 'Active' : job.status,
    trust: job.employer_details.trust_score,
    verification: job.employer_details.verification_status,
    created: new Date(job.created_at).toLocaleDateString(),
  })

  const loadJobs = async () => {
    try {
      const [approved, pending] = await Promise.all([api.jobs.list(), api.jobs.moderationQueue()])
      setLiveJobs([...pending.results, ...approved.results].map(mapAdminJob))
      setMessage('')
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : 'Unable to load moderation data.')
    }
  }

  useEffect(() => {
    void loadJobs()
  }, [])

  const approveJob = async (jobId: number) => {
    const job = liveJobs.find(item => item.id === jobId)
    const accepted = await dialog.confirm({
      title: 'Approve this job?',
      message: `${job ? `“${job.title}”` : 'This job'} will immediately become visible to job seekers.`,
      confirmLabel: 'Approve job',
      variant: 'warning',
    })
    if (!accepted) return
    try {
      await api.jobs.moderate(jobId, 'approved')
      setMessage('Job approved and published successfully.')
      await loadJobs()
      await dialog.alert({ title: 'Job approved', message: 'The job is now published in the marketplace.', variant: 'success' })
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : 'Unable to approve this job.')
    }
  }
  const deleteJob = async (job: typeof liveJobs[number]) => {
    if (!await dialog.confirm({ title: 'Delete this content?', message: `Permanently delete “${job.title}”? This also removes it from the public site.`, confirmLabel: 'Delete content', variant: 'danger' })) return
    try {
      await api.jobs.remove(job.id)
      setSelectedJob(null)
      await loadJobs()
      await dialog.alert({ title: 'Content deleted', message: 'The listing was removed from the database and public site.', variant: 'success' })
    } catch (error) {
      await dialog.alert({ title: 'Delete failed', message: error instanceof Error ? error.message : 'Please try again.', variant: 'danger' })
    }
  }
  const visibleJobs = liveJobs.filter(job => {
    if (tab === 'jobs' && job.employmentType !== 'part-time') return false
    if (tab === 'freelance' && job.employmentType !== 'freelance') return false
    if (tab === 'gigs' && job.employmentType !== 'gig') return false
    return categoryFilter === 'all' || job.category === categoryFilter
  })
  const categories = [...new Set(liveJobs.map(job => job.category))].sort()

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-slate-900 dark:text-white mb-1">Content</h1>
          <p className="text-slate-400 text-sm">Manage all employment content, services, categories and skills.</p>
        </div>
        <button data-action-dialog className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm transition-colors">
          <Ico d={IC.plus} cls="w-4 h-4" /> Create Category
        </button>
      </div>

      <div className="flex gap-2 mb-5 overflow-x-auto pb-2">
        {['Part-Time Jobs','Freelance','On-Demand Gigs','Service Marketplace','Categories','Skills'].map((t, i) => {
          const id = ['jobs','freelance','gigs','services','categories','skills'][i]
          return (
            <button key={t} onClick={() => setTab(id)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${tab === id ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}>
              {t}
            </button>
          )
        })}
      </div>

      {message && <div className="mb-4 px-4 py-3 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-sm">{message}</div>}

      {(tab === 'jobs' || tab === 'freelance' || tab === 'gigs') && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3"><label className="text-xs font-semibold text-slate-500">Filter by category</label><select value={categoryFilter} onChange={event => setCategoryFilter(event.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"><option value="all">All categories</option>{categories.map(category => <option key={category}>{category}</option>)}</select><span className="ml-auto text-xs text-slate-400">{visibleJobs.length} items</span></div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                  {['Title','Employer','Category','Applicants','Status','Trust Req','Created','Actions'].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 px-4 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleJobs.map(j => (
                  <tr key={j.id} className="border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white whitespace-nowrap">{j.title}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{j.employer}</td>
                    <td className="px-4 py-3"><span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">{j.category}</span></td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{j.applicants}</td>
                    <td className="px-4 py-3"><StatusPill s={j.status} /></td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">{j.trust}/100</td>
                    <td className="px-4 py-3 text-xs text-slate-400">{j.created}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {j.status === 'Pending Review' && <button onClick={() => approveJob(j.id)} className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg transition-colors">Approve</button>}
                        {j.status === 'Flagged' && <button data-action-dialog className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg transition-colors">Review</button>}
                        <button onClick={() => setSelectedJob(j)} title="View" className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 rounded-lg transition-colors">
                          <Ico d={IC.eye} cls="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => void deleteJob(j)} title="Delete" className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg transition-colors">
                          <Ico d={IC.trash} cls="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {selectedJob && <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"><div className="w-full max-w-xl rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl"><div className="flex items-start justify-between gap-3"><div><p className="text-xs text-blue-600 font-bold uppercase">{selectedJob.category}</p><h2 className="font-heading text-xl font-extrabold mt-1">{selectedJob.title}</h2><p className="text-sm text-slate-500 mt-1">{selectedJob.employer}</p></div><button onClick={() => setSelectedJob(null)} className="text-slate-400 text-xl">×</button></div><div className="grid grid-cols-2 gap-3 mt-5 text-sm"><div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3"><span className="text-slate-400">Type</span><p className="font-bold capitalize">{selectedJob.employmentType}</p></div><div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3"><span className="text-slate-400">Status</span><p className="font-bold">{selectedJob.status}</p></div><div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3"><span className="text-slate-400">Applicants</span><p className="font-bold">{selectedJob.applicants}</p></div><div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3"><span className="text-slate-400">Employer trust</span><p className="font-bold">{selectedJob.trust}/100</p></div></div><div className="flex justify-end gap-2 mt-6"><button onClick={() => setSelectedJob(null)} className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold">Close</button><button onClick={() => void deleteJob(selectedJob)} className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold">Delete</button></div></div></div>}
        </div>
      )}

      {tab === 'categories' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[['💼','Technology','1,203 jobs'],['🎨','Design','456 jobs'],['📢','Marketing','389 jobs'],['📚','Education','234 jobs'],['🔧','Trades','567 jobs'],['🚗','Transportation','892 jobs'],['🏠','Home Services','1,104 jobs'],['📸','Creative','321 jobs']].map(([ic, name, count]) => (
            <div key={name} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950 flex items-center justify-center text-xl">{ic}</div>
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white text-sm">{name}</p>
                  <p className="text-xs text-slate-400">{count}</p>
                </div>
              </div>
              <div className="flex gap-1">
                <button data-action-dialog className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg"><Ico d={IC.edit} cls="w-3.5 h-3.5" /></button>
                <button data-action-dialog className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg"><Ico d={IC.trash} cls="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'skills' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading font-bold text-slate-900 dark:text-white">Skill Library</h2>
            <button data-action-dialog className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl"><Ico d={IC.plus} cls="w-3.5 h-3.5" /> Add Skill</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {['JavaScript','TypeScript','React','Vue.js','Node.js','Python','Django','Flutter','React Native','Android','iOS','UI/UX Design','Figma','Graphic Design','Digital Marketing','SEO','Google Ads','Content Writing','Copywriting','Data Analysis','Machine Learning','AWS','DevOps','Docker','Accounting','Teaching','Plumbing','Electrical','Cleaning','Driving'].map(s => (
              <div key={s} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium group">
                {s}
                <button data-action-dialog className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all">
                  <Ico d={IC.x} cls="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'services' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                  {['Jobseeker','Profession','Price','Trust','Rating','Status','Actions'].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {USERS.filter(u => u.role === 'Jobseeker').map(w => (
                  <tr key={w.id} className="border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs shrink-0" style={{ backgroundColor: w.color }}>{w.initials}</div>
                        <span className="text-sm font-semibold text-slate-900 dark:text-white">{w.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">Developer</td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">NPR 2,000/hr</td>
                    <td className="px-4 py-3 text-sm font-bold text-amber-600">{w.trust}</td>
                    <td className="px-4 py-3 text-sm text-amber-500">{w.rating}★</td>
                    <td className="px-4 py-3"><StatusPill s={w.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button data-action-dialog className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg"><Ico d={IC.eye} cls="w-3.5 h-3.5" /></button>
                        <button data-action-dialog className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg"><Ico d={IC.ban} cls="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Trust & Safety ───────────────────────────────────────────────────────────

function TrustSafety() {
  const dialog = useActionDialog()
  const [tab, setTab] = useState('queue')
  const [subTab, setSubTab] = useState('identity')
  const [verifications, setVerifications] = useState<Array<typeof VERIFICATIONS[number] & { documentUrl: string }>>([])
  const [monitoredUsers, setMonitoredUsers] = useState<Array<{ id: number; name: string; initials: string; color: string; badge: string; risk: string; trust: number; rating: number; status: string; role: string }>>([])
  const [fraudAlerts, setFraudAlerts] = useState<ApiFraudReport[]>([])
  const [dashboardStats, setDashboardStats] = useState<Record<string, string | number>>({})

  const loadVerifications = () => api.verifications.list().then(data => setVerifications(data.results.map((item: ApiVerification) => {
    const name = item.user_email.split('@')[0].replace(/[._-]/g, ' ')
    return { id: item.id, name, initials: name.split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase(), color: '#2563EB', doc: item.document_type.replace(/[_-]/g, ' '), level: item.document_type.toLowerCase().includes('professional') ? 'Professional Verification' : 'Identity Verification', submitted: new Date(item.created_at).toLocaleString(), aiScore: 90, status: item.status === 'pending' ? 'Pending' : item.status, documentUrl: item.document }
  }))).catch(error => dialog.alert({ title: 'Verification queue unavailable', message: error instanceof Error ? error.message : 'Could not load submissions.', variant: 'danger' }))

  useEffect(() => {
    void loadVerifications()
    api.admin.users().then(page => setMonitoredUsers(page.results.map((user, index) => {
      const name = `${user.first_name} ${user.last_name}`.trim() || user.email
      const risk = user.trust_score < 50 || !user.is_active ? 'High' : user.trust_score < 75 ? 'Medium' : 'Low'
      return {
        id: user.id,
        name,
        initials: name.split(/\s+/).slice(0, 2).map(part => part[0] || '').join('').toUpperCase() || 'KV',
        color: ['#2563EB', '#7C3AED', '#059669', '#DC2626'][index % 4],
        badge: user.verification_level >= 4 ? 'Trusted Professional' : user.verification_level >= 2 ? 'Identity Verified' : 'Basic Verified',
        risk,
        trust: user.trust_score,
        rating: Math.max(1, Math.min(5, user.trust_score / 20)),
        status: user.is_active ? 'Active' : 'Suspended',
        role: user.role,
      }
    }))).catch(() => setMonitoredUsers([]))
    api.fraudReports.list().then(page => setFraudAlerts(page.results)).catch(() => setFraudAlerts([]))
    api.dashboard().then(setDashboardStats).catch(() => undefined)
  }, [])

  const review = async (id: number, status: 'approved'|'rejected', notes = '') => {
    if (!await dialog.confirm({ title: status === 'approved' ? 'Approve verification' : 'Reject verification', message: notes || `This submission will be marked ${status}.`, variant: status === 'approved' ? 'success' : 'danger' })) return
    try { await api.verifications.review(id, status, notes); await loadVerifications() }
    catch (error) { await dialog.alert({ title: 'Review failed', message: error instanceof Error ? error.message : 'Could not review this submission.', variant: 'danger' }) }
  }

  const visibleVerifications = verifications.filter(v => subTab === 'professional' ? v.level.startsWith('Professional') : subTab === 'face' ? v.level.startsWith('Face') : v.level.startsWith('Identity'))

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="font-heading text-2xl font-extrabold text-slate-900 dark:text-white mb-1">Trust & Safety</h1>
      <p className="text-slate-400 text-sm mb-5">Verification queue, trust monitoring, AI fraud detection, and sensitive jobs.</p>

      <div className="flex gap-2 mb-5">
        {[['queue','Verification Queue'],['monitoring','Trust Monitoring'],['fraud','AI Fraud Detection'],['sensitive','Sensitive Jobs']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${tab === id ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'queue' && (
        <>
          <div className="flex gap-2 mb-5">
            {[['identity','Identity Review'],['professional','Professional Verification']].map(([id, label]) => (
              <button key={id} onClick={() => setSubTab(id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${subTab === id ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                {label}
              </button>
            ))}
          </div>
          <div className="space-y-4">
            {visibleVerifications.map(v => (
              <div key={v.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5">
                <div className="flex items-start gap-4 flex-wrap">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-white shrink-0" style={{ backgroundColor: v.color }}>{v.initials}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap mb-1">
                      <h3 className="font-heading font-bold text-slate-900 dark:text-white">{v.name}</h3>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-semibold">{v.level}</span>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Document: {v.doc} · Submitted: {v.submitted}</p>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-400">AI Confidence:</span>
                      <div className="w-32 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full">
                        <div className="h-1.5 rounded-full" style={{ width: `${v.aiScore}%`, backgroundColor: v.aiScore >= 90 ? '#22C55E' : v.aiScore >= 75 ? '#2563EB' : '#F59E0B' }} />
                      </div>
                      <span className="text-xs font-bold" style={{ color: v.aiScore >= 90 ? '#22C55E' : v.aiScore >= 75 ? '#2563EB' : '#F59E0B' }}>{v.aiScore}%</span>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0 flex-wrap">
                    <button onClick={() => window.open(v.documentUrl, '_blank', 'noopener,noreferrer')} className="px-3 py-2 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 rounded-xl hover:border-blue-300 hover:text-blue-600 transition-colors">
                      <Ico d={IC.eye} cls="w-3.5 h-3.5 inline mr-1" />Zoom Docs
                    </button>
                    <button onClick={() => review(v.id, 'rejected', 'Please upload a clearer or complete document.')} className="px-3 py-2 border border-amber-200 dark:border-amber-900 text-xs font-semibold text-amber-700 dark:text-amber-300 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-950 transition-colors">Request Changes</button>
                    <button onClick={() => review(v.id, 'rejected', 'The document did not pass manual verification.')} className="px-3 py-2 border border-red-200 dark:border-red-900 text-xs font-semibold text-red-700 dark:text-red-300 rounded-xl hover:bg-red-50 dark:hover:bg-red-950 transition-colors">Reject</button>
                    <button onClick={() => review(v.id, 'approved')} className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-xl transition-colors">✓ Approve</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'monitoring' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {monitoredUsers.map(u => (
            <div key={u.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-white" style={{ backgroundColor: u.color }}>{u.initials}</div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900 dark:text-white">{u.name}</h3>
                  <div className="flex items-center gap-2 flex-wrap mt-0.5">
                    <TBadge level={u.badge} />
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${u.risk === 'Low' ? 'bg-green-50 dark:bg-green-950 text-green-700' : u.risk === 'Medium' ? 'bg-amber-50 dark:bg-amber-950 text-amber-700' : 'bg-red-50 dark:bg-red-950 text-red-700'}`}>
                      Risk: {u.risk}
                    </span>
                  </div>
                </div>
                <div className="text-center shrink-0">
                  <div className="font-heading font-extrabold text-2xl text-amber-500">{u.trust}</div>
                  <div className="text-xs text-slate-400">Trust</div>
                </div>
              </div>
              <div className="space-y-2">
                {[['Role', u.role],['Rating', `${u.rating.toFixed(1)}★`],['Account', u.status],['Trust level', u.badge]].map(([k, v]) => (
                  <div key={k} className="flex justify-between text-xs">
                    <span className="text-slate-400">{k}</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300 capitalize">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {!monitoredUsers.length && (
            <div className="col-span-full rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 p-8 text-center text-sm text-slate-500">
              No users loaded for monitoring.
            </div>
          )}
        </div>
      )}

      {tab === 'fraud' && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-slate-900 to-blue-900 rounded-2xl p-5 text-white mb-5">
            <div className="flex items-center gap-4">
              <div className="text-4xl">🛡️</div>
              <div className="flex-1">
                <h2 className="font-heading font-bold text-lg mb-1">Fraud report queue</h2>
                <p className="text-slate-300 text-sm">
                  {Number(dashboardStats.open_fraud_reports || fraudAlerts.filter(r => r.status === 'open' || r.status === 'investigating').length)} open reports across {monitoredUsers.length} monitored accounts.
                </p>
              </div>
              <div className="text-right">
                <div className="font-heading font-extrabold text-3xl text-green-400">{fraudAlerts.length}</div>
                <div className="text-xs text-slate-400">Total reports</div>
              </div>
            </div>
          </div>
          {fraudAlerts.map(a => {
            const severity = a.status === 'open' ? 'High' : a.status === 'investigating' ? 'Medium' : 'Low'
            return (
            <div key={a.id} className={`bg-white dark:bg-slate-900 rounded-2xl border shadow-sm p-5 ${severity === 'High' ? 'border-orange-200 dark:border-orange-900' : 'border-slate-100 dark:border-slate-800'}`}>
              <div className="flex items-start gap-4 flex-wrap">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${severity === 'High' ? 'bg-orange-100 dark:bg-orange-950' : 'bg-blue-100 dark:bg-blue-950'}`}>
                  <Ico d={IC.alert} cls={`w-6 h-6 ${severity === 'High' ? 'text-orange-600' : 'text-amber-600'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap mb-1">
                    <h3 className="font-heading font-bold text-slate-900 dark:text-white capitalize">{a.reason.replace(/-/g, ' ')}</h3>
                    <SeverityBadge s={severity} />
                    <span className="text-xs text-slate-400">Status: <strong className="text-slate-700 dark:text-slate-300 capitalize">{a.status}</strong></span>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-1 leading-relaxed">{a.description}</p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Reporter: {a.reporter_email}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => void api.fraudReports.updateStatus(a.id, 'dismissed', 'Dismissed from fraud queue.').then(() => api.fraudReports.list().then(page => setFraudAlerts(page.results)))} className="px-3 py-2 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 rounded-xl hover:border-blue-300 hover:text-blue-600 transition-colors">Dismiss</button>
                  <button onClick={() => void api.fraudReports.updateStatus(a.id, 'investigating', 'Marked for investigation.').then(() => api.fraudReports.list().then(page => setFraudAlerts(page.results)))} className="px-3 py-2 border border-amber-200 dark:border-amber-900 text-xs font-semibold text-amber-700 dark:text-amber-300 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-950 transition-colors">Investigate</button>
                  <button disabled={!a.reported_user} onClick={async () => { if (a.reported_user && await dialog.confirm({ title: 'Suspend reported user', message: 'Suspend this account pending review?', variant: 'danger' })) { await api.admin.suspendUser(a.reported_user); await api.fraudReports.updateStatus(a.id, 'investigating', 'Reported user suspended.'); setFraudAlerts((await api.fraudReports.list()).results) } }} className="px-3 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white text-xs font-semibold rounded-xl transition-colors">Suspend</button>
                </div>
              </div>
            </div>
            )
          })}
          {!fraudAlerts.length && (
            <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 p-8 text-center text-sm text-slate-500">
              No fraud reports have been submitted yet.
            </div>
          )}
        </div>
      )}

      {tab === 'sensitive' && (
        <div className="space-y-4">
          <div className="bg-amber-50 dark:bg-amber-950 rounded-2xl border border-amber-100 dark:border-amber-900 p-5 mb-4">
            <div className="flex items-center gap-3">
              <div className="text-3xl">⚠️</div>
              <div>
                <h2 className="font-heading font-bold text-amber-900 dark:text-amber-100">Sensitive Job Categories</h2>
                <p className="text-sm text-amber-700 dark:text-amber-300">Jobs in these categories require enhanced verification. Jobseekers must meet stricter standards.</p>
              </div>
            </div>
          </div>
          {[
            { cat: '👶 Childcare', req: ['Identity Verified','Criminal Record Clear'], active: 24 },
            { cat: '🐾 Pet Care', req: ['Identity Verified','Professional Certification'], active: 37 },
            { cat: '👴 Elderly Care', req: ['Identity Verified','Health Certificate'], active: 18 },
            { cat: '🏠 Home Access', req: ['Identity Verified','Reference Check'], active: 56 },
          ].map(c => (
            <div key={c.cat} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5 flex items-center gap-4 flex-wrap">
              <div className="text-3xl shrink-0">{c.cat.split(' ')[0]}</div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2">{c.cat.slice(2)}</h3>
                <div className="flex flex-wrap gap-1">
                  {c.req.map(r => <span key={r} className="text-xs px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-medium">{r}</span>)}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-bold text-slate-900 dark:text-white">{c.active}</div>
                <div className="text-xs text-slate-400">active jobs</div>
              </div>
              <button data-action-dialog className="px-3 py-2 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 rounded-xl hover:border-blue-300 hover:text-blue-600 transition-colors shrink-0">Manage Rules</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Reports ──────────────────────────────────────────────────────────────────

function ReportsWorkspace() {
  const dialog = useActionDialog()
  const [tab, setTab] = useState('workers')
  const [reports, setReports] = useState<Array<typeof REPORTS[number] & { reportedUserId: number | null }>>([])

  const loadReports = () => api.fraudReports.list().then(data => setReports(data.results.map((item: ApiFraudReport) => ({
    id: item.id, reporter: item.reporter_email, reported: item.job_title || (item.reported_user ? `User #${item.reported_user}` : 'General platform report'),
    type: item.job ? 'Job' : item.reported_user ? 'Jobseeker' : 'System', reason: item.description || item.reason.replace(/_/g, ' '),
    status: item.status === 'open' ? 'Open' : item.status === 'investigating' ? 'Under Review' : item.status === 'resolved' ? 'Resolved' : 'Dismissed',
    priority: item.reason === 'fraud' || item.reason === 'payment' ? 'High' : 'Medium', aiSummary: item.resolution_notes || 'Awaiting administrator investigation.',
    date: new Date(item.created_at).toLocaleDateString(), reportedUserId: item.reported_user,
  })))).catch(error => dialog.alert({ title: 'Reports unavailable', message: error instanceof Error ? error.message : 'Could not load reports.', variant: 'danger' }))

  useEffect(() => { void loadReports() }, [])

  const setReportStatus = async (report: typeof reports[number], status: ApiFraudReport['status'], notes: string) => {
    const dangerous = status === 'dismissed'
    if (!await dialog.confirm({ title: `${status[0].toUpperCase()}${status.slice(1)} report`, message: notes, variant: dangerous ? 'danger' : 'warning' })) return
    try { await api.fraudReports.updateStatus(report.id, status, notes); await loadReports() }
    catch (error) { await dialog.alert({ title: 'Report update failed', message: error instanceof Error ? error.message : 'Could not update report.', variant: 'danger' }) }
  }

  const visibleReports = reports.filter(report => tab === 'system' ? report.type === 'System' : tab === 'jobs' ? report.type === 'Job' : tab === 'workers' ? report.type === 'Jobseeker' : true)
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="font-heading text-2xl font-extrabold text-slate-900 dark:text-white mb-1">Reports</h1>
      <p className="text-slate-400 text-sm mb-5">Review and resolve all platform complaints and reports.</p>

      <div className="flex gap-2 mb-5 overflow-x-auto pb-2">
        {['workers','employers','jobs','companies','system'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold capitalize whitespace-nowrap transition-all ${tab === t ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}>
            {t === 'workers' ? 'Jobseeker Reports' : t === 'employers' ? 'Employer Reports' : t === 'jobs' ? 'Job Reports' : t === 'companies' ? 'Company Reports' : 'System Reports'}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {visibleReports.map(r => (
          <div key={r.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5">
            <div className="flex items-start gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-3 flex-wrap mb-2">
                  <span className={`text-xs font-bold px-2 py-1 rounded-lg ${r.priority === 'Critical' ? 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300' : r.priority === 'High' ? 'bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300' : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'}`}>
                    {r.priority}
                  </span>
                  <StatusPill s={r.status} />
                  <span className="text-xs text-slate-400">{r.date}</span>
                </div>
                <h3 className="font-heading font-bold text-slate-900 dark:text-white mb-1">{r.reason}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Reporter: <strong className="text-slate-700 dark:text-slate-300">{r.reporter}</strong> → Reported: <strong className="text-slate-700 dark:text-slate-300">{r.reported}</strong></p>
                <div className="bg-blue-50 dark:bg-blue-950 rounded-xl p-3 border border-blue-100 dark:border-blue-900">
                  <p className="text-xs text-blue-800 dark:text-blue-200"><span className="font-semibold">🤖 AI Summary:</span> {r.aiSummary}</p>
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-4 flex-wrap">
              <button onClick={() => setReportStatus(r, 'resolved', 'Reviewed and resolved by administrator.')} className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-xl transition-colors">Resolve</button>
              <button onClick={() => setReportStatus(r, 'investigating', 'User warning requested; report remains under investigation.')} className="px-3 py-2 border border-amber-200 dark:border-amber-900 text-amber-700 dark:text-amber-300 text-xs font-semibold rounded-xl hover:bg-amber-50 dark:hover:bg-amber-950 transition-colors">Warn User</button>
              <button disabled={!r.reportedUserId} onClick={async () => { if (r.reportedUserId && await dialog.confirm({ title: 'Suspend reported user', message: `Suspend ${r.reported}?`, variant: 'danger' })) { await api.admin.suspendUser(r.reportedUserId); await setReportStatus(r, 'investigating', 'Reported user suspended pending investigation.') } }} className="px-3 py-2 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs font-semibold rounded-xl hover:bg-red-50 dark:hover:bg-red-950 transition-colors disabled:opacity-40">Suspend</button>
              <button onClick={() => setReportStatus(r, 'investigating', 'Escalated for detailed administrator investigation.')} className="px-3 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Escalate</button>
              <button onClick={() => setReportStatus(r, 'dismissed', 'Dismissed after administrator review.')} className="px-3 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Dismiss</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Analytics ────────────────────────────────────────────────────────────────

function AdminAnalytics() {
  const [stats, setStats] = useState<Record<string, string | number>>({})
  const [userCount, setUserCount] = useState(0)
  const [publicStats, setPublicStats] = useState({ verified_companies: 0, professionals: 0, active_jobs: 0, active_services: 0 })
  useEffect(() => {
    api.dashboard().then(setStats).catch(() => undefined)
    api.admin.users().then(page => setUserCount(page.count ?? page.results.length)).catch(() => setUserCount(0))
    api.publicStats().then(setPublicStats).catch(() => undefined)
  }, [])
  const months = ['Platform']
  const users = [Math.max(userCount, 1)]
  const maxU = Math.max(...users)

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="font-heading text-2xl font-extrabold text-slate-900 dark:text-white mb-1">Analytics</h1>
      <p className="text-slate-400 text-sm mb-5">Live KaamVerse platform totals from MySQL.</p>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Users', value: String(userCount), trend: 'Live count', color: '#2563EB', icon: '👥' },
          { label: 'Active Jobs', value: String(publicStats.active_jobs), trend: 'Approved listings', color: '#22C55E', icon: '💼' },
          { label: 'Professionals', value: String(publicStats.professionals), trend: 'Job seekers', color: '#F59E0B', icon: '🛡️' },
          { label: 'Open Fraud Reports', value: String(stats.open_fraud_reports || 0), trend: 'Needs review', color: '#EF4444', icon: '🚨' },
        ].map(s => (
          <div key={s.label} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-4">
            <div className="text-xl mb-2">{s.icon}</div>
            <div className="font-heading font-extrabold text-2xl mb-0.5" style={{ color: s.color }}>{s.value}</div>
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">{s.label}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{s.trend}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        {/* User Growth */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5">
          <h2 className="font-heading font-bold text-slate-900 dark:text-white mb-5">Platform User Growth</h2>
          <div className="flex items-end gap-2 h-32 mb-2">
            {months.map((m, i) => (
              <div key={m} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full rounded-t-lg relative group cursor-pointer"
                  style={{ height: `${(users[i]/maxU)*100}%`, background: 'linear-gradient(to top, #2563EB, #7C3AED)' }}>
                  <div className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:block bg-slate-900 text-white text-xs px-2 py-1 rounded-lg whitespace-nowrap z-10">{users[i].toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2">{months.map(m => <div key={m} className="flex-1 text-center text-xs text-slate-400">{m}</div>)}</div>
        </div>

        {/* Trust Score Distribution */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5">
          <h2 className="font-heading font-bold text-slate-900 dark:text-white mb-4">Trust Score Distribution</h2>
          {[['90–100 (Excellent)', 23, '#22C55E'], ['75–89 (Good)', 41, '#2563EB'], ['60–74 (Fair)', 22, '#F59E0B'], ['0–59 (Low)', 14, '#EF4444']].map(([label, pct, color]) => (
            <div key={label} className="mb-3">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-600 dark:text-slate-400">{label}</span>
                <span className="font-semibold text-slate-900 dark:text-white">{pct}%</span>
              </div>
              <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full">
                <div className="h-2 rounded-full" style={{ width: `${pct}%`, backgroundColor: color as string }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Top Categories */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5">
          <h2 className="font-heading font-bold text-slate-900 dark:text-white mb-4">Popular Categories</h2>
          {[['Technology', 1203, '#2563EB'], ['Home Services', 1104, '#059669'], ['Transportation', 892, '#D97706'], ['Trades', 567, '#7C3AED'], ['Design', 456, '#0891B2']].map(([name, count, color]) => (
            <div key={name} className="flex items-center gap-3 mb-3">
              <span className="text-xs text-slate-500 dark:text-slate-400 w-28 shrink-0">{name}</span>
              <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full">
                <div className="h-1.5 rounded-full" style={{ width: `${(count as number / 1203)*100}%`, backgroundColor: color as string }} />
              </div>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 w-10 text-right">{count}</span>
            </div>
          ))}
        </div>

        {/* Top Districts */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5">
          <h2 className="font-heading font-bold text-slate-900 dark:text-white mb-4">Top Districts</h2>
          {[['Kathmandu', 5842, '#2563EB'], ['Lalitpur', 2341, '#7C3AED'], ['Bhaktapur', 1203, '#059669'], ['Pokhara', 987, '#D97706'], ['Chitwan', 654, '#0891B2']].map(([name, count, color]) => (
            <div key={name} className="flex items-center gap-3 mb-3">
              <span className="text-xs text-slate-500 dark:text-slate-400 w-24 shrink-0">{name}</span>
              <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full">
                <div className="h-1.5 rounded-full" style={{ width: `${(count as number / 5842)*100}%`, backgroundColor: color as string }} />
              </div>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 w-12 text-right">{(count as number).toLocaleString()}</span>
            </div>
          ))}
        </div>

        {/* AI Insights */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5">
          <h2 className="font-heading font-bold text-slate-900 dark:text-white mb-4">🤖 AI Platform Insights</h2>
          {[
            { text: 'Trust scores increased 8% this month across all jobseeker profiles.', color: '#22C55E' },
            { text: 'Restaurant & food delivery jobs are trending — 32% more posts vs last month.', color: '#F59E0B' },
            { text: 'Evening shift jobs (5–9PM) receive 32% more applications on average.', color: '#2563EB' },
            { text: 'Jobseekers with Trust Score > 90 complete jobs at 82% higher success rate.', color: '#7C3AED' },
          ].map((ins, i) => (
            <div key={i} className="flex gap-3 mb-4 last:mb-0">
              <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: ins.color }} />
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{ins.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── System Workspace ─────────────────────────────────────────────────────────

function SystemWorkspace() {
  const dialog = useActionDialog()
  const [tab, setTab] = useState('logs')
  const [broadcast, setBroadcast] = useState({ audience: 'all' as 'all' | 'seekers' | 'employers' | 'company-employers' | 'individual-employers', category: 'information', title: '', message: '', send_email: true, is_marketing: false })
  const [sendingBroadcast, setSendingBroadcast] = useState(false)
  const [auditLogs, setAuditLogs] = useState<ApiAuditLog[]>([])
  const [platformSettings, setPlatformSettings] = useState<ApiPlatformSetting[]>([])
  useEffect(() => { api.admin.auditLogs().then(page => setAuditLogs(page.results)).catch(() => setAuditLogs([])); api.admin.platformSettings().then(page => setPlatformSettings(page.results)).catch(() => setPlatformSettings([])) }, [])
  const setFeature = async (key: string, enabled: boolean, description: string) => {
    const accepted = await dialog.confirm({ title: enabled ? `Enable ${description}?` : `Disable ${description}?`, message: enabled ? 'Non-administrator API access will be temporarily blocked. Administrators will remain able to manage and disable maintenance mode.' : 'Normal API access will be restored immediately for all active users.', confirmLabel: enabled ? 'Enable maintenance' : 'Restore access', variant: enabled ? 'warning' : 'success' })
    if (!accepted) throw new Error('Feature change cancelled.')
    const existing = platformSettings.find(setting => setting.key === key)
    const saved = existing ? await api.admin.updatePlatformSetting(key, { enabled }, description) : await api.admin.createPlatformSetting(key, { enabled }, description)
    setPlatformSettings(current => [...current.filter(setting => setting.key !== key), saved])
    await dialog.alert({ title: enabled ? 'Maintenance mode enabled' : 'Maintenance mode disabled', message: enabled ? 'Users are temporarily blocked while administrator access remains available.' : 'Normal user access has been restored.', variant: enabled ? 'warning' : 'success' })
  }
  const sendBroadcast = async () => {
    if (!broadcast.title.trim() || !broadcast.message.trim()) { await dialog.alert({ title: 'Complete the notification', message: 'A title and message are required.', variant: 'warning' }); return }
    const accepted = await dialog.confirm({ title: 'Send this notification?', message: `This will notify the selected ${broadcast.audience} audience${broadcast.send_email ? ' by email and in the app' : ' in the app'}.`, confirmLabel: 'Send notification', variant: 'warning' })
    if (!accepted) return
    setSendingBroadcast(true)
    try { await api.admin.broadcast(broadcast); setBroadcast(current => ({ ...current, title: '', message: '' })); await dialog.alert({ title: 'Notification sent', message: 'The broadcast was saved and delivered to eligible users.', variant: 'success' }) }
    catch (error) { await dialog.alert({ title: 'Notification failed', message: error instanceof ApiError ? error.message : 'Please try again.', variant: 'danger' }) }
    finally { setSendingBroadcast(false) }
  }
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="font-heading text-2xl font-extrabold text-slate-900 dark:text-white mb-1">System</h1>
      <p className="text-slate-400 text-sm mb-5">Logs, notifications, audit trail, and platform configuration.</p>

      <div className="flex gap-2 mb-5 overflow-x-auto pb-2">
        {[['logs','System Logs'],['audit','Audit Trail'],['notifications','Notifications'],['config','Configuration']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${tab === id ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}>
            {label}
          </button>
        ))}
      </div>

      {(tab === 'logs' || tab === 'audit') && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                  {['User','Action','Time','IP Address','Device','Status'].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 px-4 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {auditLogs.map(log => (
                  <tr key={log.id} className="border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white whitespace-nowrap">{log.actor_email || 'Anonymous'}</td>
                    <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400 max-w-xs">{log.action} · {log.path}</td>
                    <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</td>
                    <td className="px-4 py-3 text-xs text-slate-400 font-mono">{log.ip_address || 'Unknown'}</td>
                    <td className="px-4 py-3 text-xs text-slate-400 max-w-40 truncate">{log.user_agent || 'Unknown'}</td>
                    <td className="px-4 py-3"><StatusPill s={log.status_code < 400 ? 'Success' : 'Failed'} /></td>
                  </tr>
                ))}
                {!auditLogs.length && <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-400">No mutation audit records yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'notifications' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-4">
          <div><h2 className="font-heading font-bold text-slate-900 dark:text-white">Send user notification</h2><p className="text-sm text-slate-400 mt-1">Create in-app notices and optional emails for information, warnings, advertisements or platform updates.</p></div>
          <div className="grid sm:grid-cols-2 gap-4"><label className="text-xs font-semibold text-slate-500">Audience<select value={broadcast.audience} onChange={event => setBroadcast(current => ({ ...current, audience: event.target.value as typeof current.audience }))} className="mt-1 w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"><option value="all">All users</option><option value="seekers">Job seekers</option><option value="employers">All employers</option><option value="company-employers">Company employers</option><option value="individual-employers">Individual employers</option></select></label><label className="text-xs font-semibold text-slate-500">Category<select value={broadcast.category} onChange={event => setBroadcast(current => ({ ...current, category: event.target.value }))} className="mt-1 w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"><option value="information">Information</option><option value="warning">Warning</option><option value="security">Security</option><option value="advertisement">Advertisement</option><option value="platform-update">Platform update</option></select></label></div>
          <input value={broadcast.title} onChange={event => setBroadcast(current => ({ ...current, title: event.target.value }))} placeholder="Notification title" maxLength={180} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm" />
          <textarea value={broadcast.message} onChange={event => setBroadcast(current => ({ ...current, message: event.target.value }))} placeholder="Write the message users should receive..." rows={5} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm resize-none" />
          <div className="flex flex-wrap gap-5"><label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300"><input type="checkbox" checked={broadcast.send_email} onChange={event => setBroadcast(current => ({ ...current, send_email: event.target.checked }))} /> Send by email</label><label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300"><input type="checkbox" checked={broadcast.is_marketing} onChange={event => setBroadcast(current => ({ ...current, is_marketing: event.target.checked }))} /> Marketing/advertisement consent required</label></div>
          <button disabled={sendingBroadcast} onClick={sendBroadcast} className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold text-sm">{sendingBroadcast ? 'Sending...' : 'Send Notification'}</button>
        </div>
      )}

      {tab === 'config' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Feature Toggles */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5">
            <h2 className="font-heading font-bold text-slate-900 dark:text-white mb-4">Feature Toggles</h2>
            {[
              ['maintenance-mode','Maintenance Mode', false],
            ].map(([key, label, defaultValue]) => {
              const stored = platformSettings.find(setting => setting.key === key)?.value as { enabled?: boolean } | undefined
              return <div key={String(key)} className="flex items-center justify-between py-2.5 border-b border-slate-100 dark:border-slate-800 last:border-0">
                <span className="text-sm text-slate-700 dark:text-slate-300">{label}</span>
                <PreferenceToggle initial={stored?.enabled ?? Boolean(defaultValue)} label={String(label)} onChange={enabled => setFeature(String(key), enabled, String(label))} />
              </div>
            })}
          </div>

          {/* Trust Score Formula */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5">
            <h2 className="font-heading font-bold text-slate-900 dark:text-white mb-4">Trust Score Formula</h2>
            {[
              ['Identity Verification', 25], ['Jobs Completed', 20], ['Client Ratings', 20],
              ['Response Time', 10], ['Profile Completeness', 10], ['No Complaints', 10], ['Active Duration', 5],
            ].map(([k, v]) => (
              <div key={k} className="mb-3">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-600 dark:text-slate-400">{k}</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{v}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full">
                    <div className="h-2 rounded-full bg-blue-500" style={{ width: `${(v as number / 25)*100}%` }} />
                  </div>
                </div>
              </div>
            ))}
            <button data-action-dialog className="mt-4 w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors">Save Formula</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Settings ─────────────────────────────────────────────────────────────────

function AdminSettings() {
  const [tab, setTab] = useState('general')
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="font-heading text-2xl font-extrabold text-slate-900 dark:text-white mb-5">Settings</h1>
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {['general','security','roles','notifications','appearance'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold capitalize whitespace-nowrap transition-all ${tab === t ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}>
            {t === 'roles' ? 'Roles & Permissions' : t}
          </button>
        ))}
      </div>

      {tab === 'general' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 space-y-4">
          <h2 className="font-heading font-bold text-slate-900 dark:text-white mb-4">General Settings</h2>
          <div className="grid grid-cols-2 gap-4">
            {[['Platform Name','KaamVerse'],['Support Email','support@kaamverse.com'],['Admin Name','Suresh Pandey'],['Admin Email','admin@kaamverse.com']].map(([l, v]) => (
              <div key={l}>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">{l}</label>
                <input defaultValue={v} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-400" />
              </div>
            ))}
          </div>
          <button data-action-dialog className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm transition-colors">Save Changes</button>
        </div>
      )}

      {tab === 'security' && <SecurityCenter />}

      {tab === 'security-legacy' && (
        <div className="space-y-4">
          {[
            { title: 'Admin Password', desc: 'Last changed 15 days ago' },
            { title: 'Two-Factor Authentication', desc: '2FA active — Authenticator App', badge: 'Enabled' },
            { title: 'Active Sessions', desc: '1 active session · Kathmandu, Nepal' },
            { title: 'Login History', desc: 'Last login: 5 minutes ago from Chrome / Mac' },
          ].map(s => (
            <div key={s.title} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 flex items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">{s.title}</h3>
                <p className="text-sm text-slate-400">{s.desc}</p>
              </div>
              {s.badge ? (
                <span className="text-xs px-3 py-1.5 rounded-full bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 font-semibold">{s.badge}</span>
              ) : (
                <button data-action-dialog className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300 rounded-xl hover:border-blue-300 hover:text-blue-600 transition-colors">Manage</button>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'roles' && (
        <div className="space-y-4">
          {[
            { role: 'Super Admin', desc: 'Full access to all platform features', perms: ['All permissions'], color: '#7C3AED', count: 1 },
            { role: 'Moderator', desc: 'Manage users, content, and reports', perms: ['Users','Content','Reports'], color: '#2563EB', count: 3 },
            { role: 'Verification Officer', desc: 'Handle identity and document verification', perms: ['Trust & Safety','Verification Queue'], color: '#059669', count: 5 },
            { role: 'Support Officer', desc: 'Handle user support and reports', perms: ['Reports','User View'], color: '#D97706', count: 8 },
            { role: 'Analytics Manager', desc: 'View and export analytics data', perms: ['Analytics','Export'], color: '#0891B2', count: 2 },
          ].map(r => (
            <div key={r.role} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-sm" style={{ backgroundColor: r.color }}>{r.role.charAt(0)}</div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-semibold text-slate-900 dark:text-white">{r.role}</h3>
                    <span className="text-xs text-slate-400">{r.count} {r.count === 1 ? 'admin' : 'admins'}</span>
                  </div>
                  <p className="text-xs text-slate-400 mb-1">{r.desc}</p>
                  <div className="flex flex-wrap gap-1">
                    {r.perms.map(p => <span key={p} className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">{p}</span>)}
                  </div>
                </div>
              </div>
              <button data-action-dialog className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300 rounded-xl hover:border-blue-300 hover:text-blue-600 transition-colors">Edit Role</button>
            </div>
          ))}
        </div>
      )}

      {(tab === 'notifications' || tab === 'appearance') && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 space-y-4">
          {tab === 'notifications' && [
            ['New verification submitted', true], ['Trust alert triggered', true], ['Critical fraud detection', true],
            ['Report filed', true], ['System errors', true], ['Weekly platform report', false],
          ].map(([label, on]) => (
            <div key={String(label)} className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 last:border-0 last:pb-0">
              <span className="text-sm text-slate-700 dark:text-slate-300">{label}</span>
              <PreferenceToggle initial={Boolean(on)} label={String(label)} />
            </div>
          ))}
          {tab === 'appearance' && (
            <div className="text-sm text-slate-500 dark:text-slate-400 py-6 text-center">
              Appearance settings are controlled from the top navigation bar.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

const SIDEBAR_ITEMS: Array<{ id: ASection; label: string; iconKey: keyof typeof IC; badge?: number; color?: string }> = [
  { id: 'dashboard', label: 'Dashboard', iconKey: 'home' },
  { id: 'users', label: 'Users', iconKey: 'users', badge: 12847 },
  { id: 'content', label: 'Content', iconKey: 'doc', badge: 3 },
  { id: 'trust', label: 'Trust & Safety', iconKey: 'shield', badge: 127, color: 'text-amber-500' },
  { id: 'reports', label: 'Reports', iconKey: 'flag', badge: 38, color: 'text-red-500' },
  { id: 'analytics', label: 'Analytics', iconKey: 'chart' },
  { id: 'system', label: 'System', iconKey: 'server' },
  { id: 'settings', label: 'Settings', iconKey: 'gear' },
]

// ─── Main Export ──────────────────────────────────────────────────────────────

export function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const [section, setSection] = useState<ASection>('dashboard')
  const [collapsed, setCollapsed] = useState(false)
  const [search, setSearch] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [dashboardStats, setDashboardStats] = useState<Record<string, string | number>>({})
  useEffect(() => {
    const load = () => api.dashboard().then(setDashboardStats).catch(() => undefined)
    void load()
    const timer = window.setInterval(() => { void load() }, 10000)
    return () => window.clearInterval(timer)
  }, [])
  const sidebarBadge = (item: typeof SIDEBAR_ITEMS[number]) => item.id === 'users' ? Number(dashboardStats.users || 0) : item.id === 'content' ? Number(dashboardStats.pending_jobs || 0) : item.id === 'trust' ? Number(dashboardStats.pending_verifications || 0) : item.id === 'reports' ? Number(dashboardStats.open_fraud_reports || 0) : item.badge

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Sidebar */}
      <aside className={`${collapsed ? 'w-16' : 'w-60'} shrink-0 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 sticky top-16 h-[calc(100vh-4rem)] flex flex-col transition-all duration-200 overflow-hidden z-30`}>
        <div className="flex-1 overflow-y-auto py-4">
          {/* Admin badge */}
          {!collapsed && (
            <div className="mx-3 mb-4 px-3 py-2 bg-slate-900 dark:bg-slate-700 rounded-xl">
              <p className="text-xs text-slate-400">Signed in as</p>
              <p className="text-xs font-bold text-white">🔐 Super Admin</p>
            </div>
          )}

          <div className={`px-3 mb-2 ${collapsed ? 'flex justify-center' : 'flex items-center justify-between'}`}>
            {!collapsed && <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2">Admin Panel</p>}
            <button onClick={() => setCollapsed(v => !v)} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d={collapsed ? 'M13 5l7 7-7 7M5 5l7 7-7 7' : 'M11 19l-7-7 7-7m8 14l-7-7 7-7'} />
              </svg>
            </button>
          </div>

          <nav className="px-3 space-y-0.5">
            {SIDEBAR_ITEMS.map(item => (
              <button key={item.id} onClick={() => setSection(item.id)}
                title={collapsed ? item.label : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${section === item.id ? 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400' : `text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white ${item.color || ''}`}`}>
                <Ico d={IC[item.iconKey]} cls="w-5 h-5 shrink-0" />
                {!collapsed && (
                  <>
                    <span className="flex-1 text-sm font-medium text-left">{item.label}</span>
                    {sidebarBadge(item) !== undefined && (
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${section === item.id ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' : (item.id === 'trust' || item.id === 'reports') ? 'bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                        {Number(sidebarBadge(item)) > 999 ? `${(Number(sidebarBadge(item)) / 1000).toFixed(1)}k` : sidebarBadge(item)}
                      </span>
                    )}
                  </>
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-3 border-t border-slate-100 dark:border-slate-800">
          <button onClick={onLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors">
            <Ico d={IC.logout} cls="w-5 h-5 shrink-0" />
            {!collapsed && <span className="text-sm font-medium">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 overflow-auto">
        {/* Admin search bar */}
        {showSearch && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center pt-20 px-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-2xl">
              <div className="flex items-center gap-3 p-4 border-b border-slate-100 dark:border-slate-800">
                <Ico d={IC.search} cls="w-5 h-5 text-slate-400" />
                <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search users, jobs, companies, reports..." className="flex-1 text-sm text-slate-900 dark:text-white outline-none bg-transparent" />
                <button onClick={() => setShowSearch(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                  <Ico d={IC.x} cls="w-5 h-5" />
                </button>
              </div>
              {search && (
                <div className="p-4">
                  <p className="text-xs text-slate-400 mb-3">Results for "{search}"</p>
                  {USERS.filter(u => u.name.toLowerCase().includes(search.toLowerCase())).map(u => (
                    <button key={u.id} onClick={() => { setShowSearch(false); setSection('users') }}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs shrink-0" style={{ backgroundColor: u.color }}>{u.initials}</div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{u.name}</p>
                        <p className="text-xs text-slate-400">{u.role} · {u.email}</p>
                      </div>
                    </button>
                  ))}
                  {JOBS.filter(j => j.title.toLowerCase().includes(search.toLowerCase())).map(j => (
                    <button key={j.id} onClick={() => { setShowSearch(false); setSection('content') }}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left">
                      <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950 flex items-center justify-center text-lg shrink-0">💼</div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{j.title}</p>
                        <p className="text-xs text-slate-400">{j.employer} · {j.category}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {!search && (
                <div className="p-4 grid grid-cols-3 gap-2">
                  {[['👥','Users','users'],['💼','Jobs','content'],['🚨','Reports','reports'],['🪪','Verifications','trust'],['📊','Analytics','analytics'],['⚙️','System','system']].map(([ic, lb, sec]) => (
                    <button key={lb} onClick={() => { setShowSearch(false); setSection(sec as ASection) }}
                      className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                      <div className="text-2xl">{ic}</div>
                      <span className="text-xs text-slate-600 dark:text-slate-400">{lb}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {section === 'dashboard' && <AdminDashboardHome setSection={setSection} />}
        {section === 'users' && <UsersWorkspace />}
        {section === 'content' && <ContentWorkspace />}
        {section === 'trust' && <TrustSafety />}
        {section === 'reports' && <ReportsWorkspace />}
        {section === 'analytics' && <AdminAnalytics />}
        {section === 'system' && <SystemWorkspace />}
        {section === 'settings' && <AdminSettings />}
      </main>
    </div>
  )
}
