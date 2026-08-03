import { useEffect, useState } from 'react'
import { api, ApiError } from '@/lib/api/client'
import type { ApiBooking, ApiJob, ApiServiceListing, ApiTalent, ApiUser } from '@/lib/api/types'
import { PreferenceToggle, useActionDialog } from '@/components/ui/ActionDialogs'
import { ExactScheduleEditor, scheduleCovers, scheduleSummary, type ExactSchedule } from '@/components/ui/ExactScheduleEditor'
import { EmailPreferences } from '@/components/ui/SystemFeedback'
import { MessagesWorkspace as ApiMessagesWorkspace } from '@/features/messaging/MessagesWorkspace'
import { UnifiedDetailPage } from '@/components/marketplace/UnifiedDetailPage'

// ─── Types ────────────────────────────────────────────────────────────────────

type ISection = 'dashboard' | 'hire' | 'posts' | 'messages' | 'trust' | 'profile' | 'settings'
type HireTab = 'freelancers' | 'services' | 'emergency' | 'nearby' | 'saved' | 'safe-circle'
type PostTab = 'freelance' | 'gigs' | 'emergency'
type BookingTab = 'upcoming' | 'ongoing' | 'completed' | 'cancelled'

// ─── Mock Data ────────────────────────────────────────────────────────────────

const FREELANCERS = [
  { id: 1, name: 'Aarav Sharma', title: 'Full-Stack Developer', rate: 'NPR 2,500/hr', rating: 4.9, reviews: 127, skills: ['React', 'Python', 'AWS'], trust: 96, level: 4, match: 97, available: true, initials: 'AS', color: '#2563EB', exp: '5 yrs' },
  { id: 2, name: 'Priya Thapa', title: 'Brand & UI Designer', rate: 'NPR 2,000/hr', rating: 4.8, reviews: 89, skills: ['Figma', 'Branding', 'Illustration'], trust: 94, level: 4, match: 91, available: true, initials: 'PT', color: '#7C3AED', exp: '4 yrs' },
  { id: 3, name: 'Rohan Adhikari', title: 'SEO & Growth', rate: 'NPR 1,500/hr', rating: 4.7, reviews: 203, skills: ['SEO', 'Google Ads', 'Analytics'], trust: 91, level: 3, match: 85, available: false, initials: 'RA', color: '#059669', exp: '6 yrs' },
  { id: 4, name: 'Sita Gurung', title: 'Video Editor', rate: 'NPR 3,000/hr', rating: 4.9, reviews: 64, skills: ['Premiere Pro', 'After Effects'], trust: 98, level: 4, match: 88, available: true, initials: 'SG', color: '#DC2626', exp: '7 yrs' },
  { id: 5, name: 'Dipesh Maharjan', title: 'Mobile Developer', rate: 'NPR 2,200/hr', rating: 4.8, reviews: 112, skills: ['Flutter', 'React Native'], trust: 93, level: 3, match: 79, available: true, initials: 'DM', color: '#D97706', exp: '3 yrs' },
  { id: 6, name: 'Sunita Rai', title: 'Content Writer', rate: 'NPR 1,200/hr', rating: 4.6, reviews: 231, skills: ['Content', 'Copywriting', 'Nepali'], trust: 89, level: 3, match: 74, available: true, initials: 'SR', color: '#0891B2', exp: '4 yrs' },
].map((worker, index) => ({
  ...worker,
  availability: Object.fromEntries(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => [day, index % 2 ? '10:00-18:00' : '08:00-16:00'])) as ExactSchedule,
}))

const SERVICES = [
  { id: 1, name: 'Raju Tamang', service: 'Home Tutor — Maths & Science', price: 'NPR 600/hr', rating: 4.9, reviews: 45, trust: 96, level: 3, available: true, category: 'Tutor', initials: 'RT', color: '#2563EB' },
  { id: 2, name: 'Mina Shrestha', service: 'House Cleaning', price: 'NPR 500/session', rating: 4.8, reviews: 78, trust: 94, level: 3, available: true, category: 'Cleaner', initials: 'MS', color: '#059669' },
  { id: 3, name: 'Bijay Karki', service: 'Electrician', price: 'NPR 800/hr', rating: 4.7, reviews: 93, trust: 95, level: 4, available: false, category: 'Electrician', initials: 'BK', color: '#D97706' },
  { id: 4, name: 'Anita Lama', service: 'Pet Care & Walking', price: 'NPR 400/hr', rating: 4.9, reviews: 32, trust: 97, level: 4, available: true, category: 'Pet Care', initials: 'AL', color: '#7C3AED' },
  { id: 5, name: 'Suresh Basnet', service: 'Home Cook — Nepali Cuisine', price: 'NPR 1,200/meal', rating: 4.8, reviews: 56, trust: 92, level: 3, available: true, category: 'Home Cook', initials: 'SB', color: '#DC2626' },
  { id: 6, name: 'Kabita Rana', service: 'Babysitter / Childcare', price: 'NPR 500/hr', rating: 4.9, reviews: 67, trust: 98, level: 4, available: true, category: 'Babysitter', initials: 'KR', color: '#0891B2' },
].map((worker, index) => ({
  ...worker,
  availability: Object.fromEntries(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => [day, index % 2 ? '12:00-20:00' : '07:00-15:00'])) as ExactSchedule,
}))

const NEARBY = [
  { id: 1, name: 'Ram Thapa', skill: 'Plumber', dist: '0.4 km', eta: '6 min', trust: 96, rating: 4.8, status: 'Available', initials: 'RT', color: '#2563EB' },
  { id: 2, name: 'Hira Karki', skill: 'Electrician', dist: '0.7 km', eta: '10 min', trust: 94, rating: 4.7, status: 'Available', initials: 'HK', color: '#059669' },
  { id: 3, name: 'Sanjay Magar', skill: 'Cleaner', dist: '1.1 km', eta: '14 min', trust: 91, rating: 4.6, status: 'Available', initials: 'SM', color: '#D97706' },
  { id: 4, name: 'Laxmi Tamang', skill: 'Babysitter', dist: '1.5 km', eta: '18 min', trust: 98, rating: 4.9, status: 'Busy', initials: 'LT', color: '#7C3AED' },
]

const SAVED = [
  { id: 1, name: 'Aarav Sharma', title: 'Full-Stack Developer', trust: 96, rating: 4.9, jobs: 18, initials: 'AS', color: '#2563EB' },
  { id: 2, name: 'Priya Thapa', title: 'Designer', trust: 94, rating: 4.8, jobs: 7, initials: 'PT', color: '#7C3AED' },
  { id: 3, name: 'Sunita Rai', title: 'Content Writer', trust: 89, rating: 4.6, jobs: 3, initials: 'SR', color: '#0891B2' },
]

const SAFE_CIRCLE = [
  { id: 1, name: 'Raju Tamang', title: 'Home Tutor', jobs: 12, rating: 4.9, response: '< 1h', trust: 96, fav: true, initials: 'RT', color: '#2563EB' },
  { id: 2, name: 'Mina Shrestha', title: 'Cleaner', jobs: 8, rating: 4.8, response: '< 30 min', trust: 94, fav: true, initials: 'MS', color: '#059669' },
  { id: 3, name: 'Bijay Karki', title: 'Electrician', jobs: 5, rating: 4.7, response: '< 2h', trust: 95, fav: false, initials: 'BK', color: '#D97706' },
]

const POSTS = [
  { id: 1, type: 'freelance', title: 'Build a React website for small business', budget: 'NPR 25,000', status: 'Active', applicants: 8, views: 124, deadline: 'Apr 10' },
  { id: 2, type: 'gig', title: 'House deep cleaning — 3BHK', budget: 'NPR 2,500', status: 'Active', applicants: 3, views: 45, deadline: 'Mar 28' },
  { id: 3, type: 'emergency', title: 'Urgent — plumbing repair needed', budget: 'NPR 1,500', status: 'Completed', applicants: 1, views: 12, deadline: 'Mar 20' },
  { id: 4, type: 'freelance', title: 'Logo design for home business', budget: 'NPR 8,000', status: 'Paused', applicants: 5, views: 67, deadline: 'Apr 5' },
]

const BOOKINGS = [
  { id: 1, worker: 'Raju Tamang', service: 'Home Tutor — Maths', date: 'Mar 25, 2025', time: '4:00 PM', duration: '2 hrs', status: 'Upcoming', trust: 96, initials: 'RT', color: '#2563EB' },
  { id: 2, worker: 'Mina Shrestha', service: 'House Cleaning', date: 'Mar 22, 2025', time: '10:00 AM', duration: '3 hrs', status: 'Ongoing', trust: 94, initials: 'MS', color: '#059669' },
  { id: 3, worker: 'Aarav Sharma', service: 'Website Development', date: 'Mar 15, 2025', time: '9:00 AM', duration: '5 hrs', status: 'Completed', trust: 96, initials: 'AS', color: '#2563EB' },
  { id: 4, worker: 'Bijay Karki', service: 'Electrical Work', date: 'Mar 10, 2025', time: '2:00 PM', duration: '2 hrs', status: 'Cancelled', trust: 95, initials: 'BK', color: '#D97706' },
]

const CONVERSATIONS = [
  { id: 1, name: 'Raju Tamang', last: 'See you tomorrow at 4 PM!', time: '2m ago', unread: 2, online: true, initials: 'RT', color: '#2563EB' },
  { id: 2, name: 'Mina Shrestha', last: "I'll bring all cleaning supplies", time: '1h ago', unread: 0, online: true, initials: 'MS', color: '#059669' },
  { id: 3, name: 'Aarav Sharma', last: 'The website is almost done', time: '3h ago', unread: 1, online: false, initials: 'AS', color: '#7C3AED' },
  { id: 4, name: 'Support', last: 'Your booking was confirmed', time: '1d ago', unread: 0, online: true, initials: 'KV', color: '#2563EB' },
]

// ─── Shared UI ────────────────────────────────────────────────────────────────

function TrustBadge({ score }: { score: number }) {
  const color = score >= 90 ? '#22C55E' : score >= 75 ? '#F59E0B' : '#EF4444'
  return (
    <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: color + '18', color }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
      {score}
    </span>
  )
}

function VerifiedBadge({ level }: { level: number }) {
  const levels = [
    { label: 'Basic', color: '#64748B' },
    { label: 'Verified', color: '#2563EB' },
    { label: 'Pro', color: '#7C3AED' },
    { label: 'Elite', color: '#D97706' },
  ]
  const l = levels[Math.min(level - 1, 3)]
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 rounded-full bg-white border" style={{ color: l.color, borderColor: l.color + '40' }}>
      ✓ Lv{level}
    </span>
  )
}

function Stars({ n }: { n: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <svg key={i} className={`w-3 h-3 ${i <= n ? 'text-amber-400' : 'text-slate-200'}`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  )
}

// ─── Create Post Modal ────────────────────────────────────────────────────────

function CreatePostModal({ onClose, onCreated }: { onClose: () => void; onCreated?: () => void }) {
  const dialog = useActionDialog()
  const [type, setType] = useState<'freelance' | 'gig' | 'emergency'>('freelance')
  const [step, setStep] = useState(1)
  const [posting, setPosting] = useState(false)
  const [f, setF] = useState({ title: '', desc: '', category: '', budget: '', location: '', date: '', start: '', end: '', skills: '', minTrust: '70', minLevel: '1', urgent: false })
  const set = (k: keyof typeof f, v: string | boolean) => setF(p => ({ ...p, [k]: v }))

  const postNow = async () => {
    if (!f.title.trim() || !f.desc.trim() || !f.category.trim()) {
      await dialog.alert({ title: 'Complete required fields', message: 'Add a title, description, and category before posting.', variant: 'warning' })
      return
    }
    if ((f.start && !f.end) || (!f.start && f.end) || (f.start && f.end && f.start >= f.end)) {
      await dialog.alert({ title: 'Check the wanted time', message: 'Choose both a start and end time, with the end later than the start.', variant: 'warning' })
      return
    }
    const accepted = await dialog.confirm({
      title: 'Publish this post?',
      message: `“${f.title}” will be sent to the administrator for approval.`,
      confirmLabel: 'Post now',
      variant: 'info',
    })
    if (!accepted) return
    setPosting(true)
    try {
      const budget = Number(f.budget.replace(/[^0-9.]/g, '')) || undefined
      await api.jobs.create({
        title: f.title.trim(),
        category: f.category.trim(),
        description: f.desc.trim(),
        employment_type: type === 'freelance' ? 'freelance' : 'gig',
        work_mode: 'onsite',
        shift_type: type === 'emergency' ? 'flexible' : 'day',
        location: f.location.trim() || 'Kathmandu',
        schedule: { date: f.date, start: f.start, end: f.end },
        skills: f.skills.split(',').map(skill => skill.trim()).filter(Boolean),
        salary_min: budget,
        salary_max: budget,
        salary_period: type === 'freelance' ? 'project' : 'day',
        is_urgent: f.urgent || type === 'emergency',
      })
      onCreated?.()
      onClose()
      await dialog.alert({ title: 'Post submitted', message: 'Your post is saved in MySQL and is waiting for administrator approval.', variant: 'success' })
    } catch (error) {
      await dialog.alert({ title: 'Unable to create post', message: error instanceof ApiError ? error.message : 'Please try again.', variant: 'danger' })
    } finally {
      setPosting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-6 py-4 flex items-center justify-between">
          <h2 className="font-heading font-bold text-slate-900 dark:text-white">Create New Post</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800">✕</button>
        </div>
        <div className="p-6">
          {/* Type selector */}
          <div className="grid grid-cols-3 gap-2 mb-5">
            {[
              { id: 'freelance' as const, icon: '💻', label: 'Freelance Project' },
              { id: 'gig' as const, icon: '📅', label: 'Scheduled Gig' },
              { id: 'emergency' as const, icon: '⚡', label: 'Emergency Gig' },
            ].map(t => (
              <button key={t.id} onClick={() => setType(t.id)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-xs font-semibold transition-all ${type === t.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-950 text-blue-700' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-blue-200'}`}>
                <span className="text-xl">{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Title *</label>
                <input value={f.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Home Tutor for Grade 8 Math"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 transition-all" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Description *</label>
                  <button onClick={() => set('desc', `We are looking for a reliable ${f.category || 'professional'} for ${f.title || 'this project'}. Please include relevant experience, availability, and your proposed approach.`)} className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline">🤖 AI Generate</button>
                </div>
                <textarea value={f.desc} onChange={e => set('desc', e.target.value)} rows={4} placeholder="Describe the work needed..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 resize-none transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Category *</label>
                  <select value={f.category} onChange={e => set('category', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-all">
                    <option value="">Select...</option>
                    {['Tutor', 'Cleaner', 'Electrician', 'Plumber', 'Developer', 'Designer', 'Babysitter', 'Pet Care', 'Driver', 'Home Cook', 'Marketing', 'Other'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Budget *</label>
                    <button onClick={() => set('budget', type === 'freelance' ? 'NPR 25,000' : 'NPR 2,500')} className="text-xs text-blue-600 dark:text-blue-400 font-semibold">🤖 Suggest</button>
                  </div>
                  <input value={f.budget} onChange={e => set('budget', e.target.value)} placeholder="NPR 2,000"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-all" />
                </div>
              </div>
              {type !== 'emergency' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Date</label>
                    <input type="date" value={f.date} onChange={e => set('date', e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Location</label>
                    <input value={f.location} onChange={e => set('location', e.target.value)} placeholder="Kathmandu, Thamel..."
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-all" />
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Wanted start time</label>
                  <input type="time" value={f.start} onChange={e => set('start', e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Wanted end time</label>
                  <input type="time" value={f.end} onChange={e => set('end', e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500" />
                </div>
              </div>
              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={f.urgent} onChange={e => set('urgent', e.target.checked)} className="w-4 h-4 rounded text-blue-600" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Mark as urgent</span>
                </label>
                <button onClick={() => setStep(2)} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors">Continue →</button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Required Skills</label>
                  <button onClick={() => set('skills', f.category ? `${f.category}, Communication, Reliability` : 'Communication, Reliability')} className="text-xs text-blue-600 dark:text-blue-400 font-semibold">🤖 Suggest Skills</button>
                </div>
                <input value={f.skills} onChange={e => set('skills', e.target.value)} placeholder="e.g. Maths, Teaching, Patience"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Min. Trust Score</label>
                  <input type="range" min="50" max="100" value={f.minTrust} onChange={e => set('minTrust', e.target.value)} className="w-full accent-blue-600" />
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-bold mt-0.5">{f.minTrust}+</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Min. Verification</label>
                  <select value={f.minLevel} onChange={e => set('minLevel', e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-all">
                    <option value="1">Level 1 — Basic</option>
                    <option value="2">Level 2 — Verified</option>
                    <option value="3">Level 3 — Professional</option>
                    <option value="4">Level 4 — Elite</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setStep(1)} className="px-4 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-semibold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">← Back</button>
                <button disabled={posting} onClick={postNow} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm">{posting ? 'Posting...' : 'Post Now 🎉'}</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function DashboardHome({ setSection, dashboardStats }: { setSection: (s: ISection) => void; dashboardStats: Record<string, string | number> }) {
  const [recommendationCount, setRecommendationCount] = useState(0)
  useEffect(() => {
    void api.talent.list().then(page => setRecommendationCount(page.results.length)).catch(() => setRecommendationCount(0))
  }, [])
  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header row */}
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="font-heading text-2xl font-bold text-slate-900 dark:text-white mb-0.5">
            Namaste, Yugina <span className="inline-block">👋</span>
          </h1>
          <p className="text-slate-400 text-sm">Need someone today? Let AI help you find trusted workers nearby.</p>
        </div>
        {/* AI Summary chip */}
        <div className="flex items-center gap-3 bg-indigo-50 dark:bg-indigo-950 border border-indigo-100 dark:border-indigo-900 rounded-2xl px-4 py-3 min-w-56">
          <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-lg shrink-0">✨</div>
          <div>
            <p className="text-xs font-bold text-indigo-700 dark:text-indigo-300">AI Summary</p>
            <p className="text-xs text-indigo-500 dark:text-indigo-400 leading-snug">Three trusted workers match your recent hiring needs.</p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {/* Active Freelance Projects */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950 flex items-center justify-center text-lg">💼</div>
            <span className="text-xs font-bold text-green-600 bg-green-50 dark:bg-green-950 px-2 py-0.5 rounded-full">+12%</span>
          </div>
          <p className="font-heading font-extrabold text-3xl text-slate-900 dark:text-white mb-0.5">{Number(dashboardStats.active_freelance_projects || 0)}</p>
          <p className="text-xs text-slate-400">Active Freelance Projects</p>
        </div>
        {/* Active Gigs */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950 flex items-center justify-center text-lg">⚡</div>
            <span className="text-xs font-bold text-amber-600 bg-amber-50 dark:bg-amber-950 px-2 py-0.5 rounded-full">Busy</span>
          </div>
          <p className="font-heading font-extrabold text-3xl text-slate-900 dark:text-white mb-0.5">{Number(dashboardStats.active_gigs || 0)}</p>
          <p className="text-xs text-slate-400">Active Gigs</p>
        </div>
        {/* Applications */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-950 flex items-center justify-center text-lg">📅</div>
          </div>
          <p className="font-heading font-extrabold text-3xl text-slate-900 dark:text-white mb-0.5">{Number(dashboardStats.applications || 0)}</p>
          <p className="text-xs text-slate-400">Applications Received</p>
        </div>
        {/* Unread Messages */}
        <div className="bg-blue-600 rounded-2xl p-4 text-white relative overflow-hidden">
          <div className="flex items-start justify-between mb-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-lg">🛡️</div>
            <span className="text-xs font-bold bg-white/20 px-2 py-0.5 rounded-full">Live</span>
          </div>
          <p className="font-heading font-extrabold text-3xl text-white mb-0.5">{Number(dashboardStats.unread_messages || 0)}</p>
          <p className="text-xs text-blue-200 uppercase tracking-wide font-semibold">Unread Messages</p>
        </div>
      </div>

      {/* Quick Actions + AI Insight */}
      <div className="grid lg:grid-cols-2 gap-5 mb-6">
        {/* Quick Actions */}
        <div>
          <h2 className="font-heading font-bold text-slate-900 dark:text-white mb-4 text-base">Quick Actions</h2>
          <div className="space-y-3">
            {/* Post Freelance Project */}
            <button onClick={() => setSection('posts')}
              className="w-full flex items-center gap-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl px-5 py-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-lg">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl shrink-0">＋</div>
              <div>
                <p className="font-semibold text-sm">Post Freelance Project</p>
                <p className="text-xs text-blue-200">For long-term specialized work</p>
              </div>
            </button>
            {/* Post Emergency Gig */}
            <button onClick={() => setSection('hire')}
              className="w-full flex items-center gap-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl px-5 py-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-lg">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl shrink-0">✳</div>
              <div>
                <p className="font-semibold text-sm">Post Emergency Gig</p>
                <p className="text-xs text-red-200">Find someone in 30 minutes</p>
              </div>
            </button>
            {/* Post Scheduled Gig */}
            <button onClick={() => setSection('posts')}
              className="w-full flex items-center gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-blue-300 text-slate-700 dark:text-slate-200 rounded-2xl px-5 py-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md">
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xl shrink-0">🕐</div>
              <div>
                <p className="font-semibold text-sm">Post Scheduled Gig</p>
                <p className="text-xs text-slate-400">Plan for tomorrow or later</p>
              </div>
            </button>
            {/* Browse & Hire row */}
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setSection('hire')}
                className="flex flex-col items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-blue-300 text-slate-700 dark:text-slate-200 rounded-2xl px-4 py-3 transition-all hover:-translate-y-0.5 hover:shadow-md">
                <span className="text-xl">🛠</span>
                <span className="text-xs font-semibold">Browse Services</span>
              </button>
              <button onClick={() => setSection('hire')}
                className="flex flex-col items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-blue-300 text-slate-700 dark:text-slate-200 rounded-2xl px-4 py-3 transition-all hover:-translate-y-0.5 hover:shadow-md">
                <span className="text-xl">👥</span>
                <span className="text-xs font-semibold">Hire Workers</span>
              </button>
            </div>
          </div>
        </div>

        {/* AI Insight + Recent Activities */}
        <div className="space-y-4">
          {/* AI Insight */}
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950 dark:to-purple-950 rounded-2xl border border-indigo-100 dark:border-indigo-900 p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center text-white text-lg shrink-0">🤖</div>
                <div>
                  <p className="font-bold text-slate-900 dark:text-white text-sm">AI Insight</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{recommendationCount ? `${recommendationCount} backend-ranked worker${recommendationCount === 1 ? '' : 's'} match your profile and wanted time.` : 'No matching verified workers are available yet.'}</p>
                </div>
              </div>
              <button data-action-dialog className="shrink-0 px-3 py-1.5 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-semibold rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-colors whitespace-nowrap">
                View Recommendations
              </button>
            </div>
          </div>

          {/* Recent Activities */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-bold text-slate-900 dark:text-white text-sm">Recent Activities</h3>
              <button data-action-dialog className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline">See all activity</button>
            </div>
            <div className="space-y-3">
              {/* Recent Application */}
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-base shrink-0">📋</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-900 dark:text-white">Recent Application</p>
                  <p className="text-xs text-slate-400">Kitchen Renovation · 12 new bids</p>
                </div>
                <span className="text-xs text-slate-400 shrink-0">2h ago</span>
              </div>
              {/* Upcoming Interview */}
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full overflow-hidden bg-purple-200 flex items-center justify-center text-sm font-bold text-purple-700 shrink-0">PS</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-900 dark:text-white">Upcoming Interview</p>
                  <p className="text-xs text-slate-400">Priya S. · Today at 4:30 PM</p>
                </div>
                <button data-action-dialog className="shrink-0 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors">Join Call</button>
              </div>
              {/* Booking Confirmed */}
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full overflow-hidden bg-teal-200 flex items-center justify-center text-sm font-bold text-teal-700 shrink-0">DL</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-900 dark:text-white">Booking Confirmed</p>
                  <p className="text-xs text-slate-400">Deepak L. · Cleaner · Sunday, 10 AM</p>
                </div>
                <span className="shrink-0 px-2 py-0.5 bg-green-600 text-white text-xs font-bold rounded-lg">CONFIRMED</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Home safety */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-6 flex flex-col items-center justify-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950 flex items-center justify-center text-3xl mb-4">🛡️</div>
          <h3 className="font-heading font-bold text-slate-900 dark:text-white text-base mb-2">Your Home is Safe</h3>
          <p className="text-xs text-slate-400 leading-relaxed mb-4">Review identity documents, trust scores, work history, and recorded communication before hiring.</p>
          <button onClick={() => setSection('trust')} className="px-4 py-2 text-xs font-bold text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors uppercase tracking-wide">
            Learn More
          </button>
      </div>
    </div>
  )
}

// ─── Hire Workers ─────────────────────────────────────────────────────────────

function HireWorkspace() {
  const dialog = useActionDialog()
  const [tab, setTab] = useState<HireTab>('freelancers')
  const [search, setSearch] = useState('')
  const [serviceCategory, setServiceCategory] = useState('All')
  const [emergencyPhase, setEmergencyPhase] = useState<'search' | 'tracking'>('search')
  const [hiredWorker, setHiredWorker] = useState<typeof NEARBY[0] | null>(null)
  const [trackStep, setTrackStep] = useState(0)
  const [wantedSchedule, setWantedSchedule] = useState<ExactSchedule>({})
  const [appliedWantedSchedule, setAppliedWantedSchedule] = useState<ExactSchedule>({})
  const [savingWantedSchedule, setSavingWantedSchedule] = useState(false)
  const [talent, setTalent] = useState<ApiTalent[]>([])
  const [serviceListings, setServiceListings] = useState<ApiServiceListing[]>([])
  const [savedTalentIds, setSavedTalentIds] = useState<number[]>([])
  const [safeCircleBookings, setSafeCircleBookings] = useState<ApiBooking[]>([])

  useEffect(() => {
    api.talent.list().then(page => setTalent(page.results)).catch(() => setTalent([]))
    api.services.list().then(page => setServiceListings(page.results)).catch(() => setServiceListings([]))
    api.savedTalent.list().then(page => setSavedTalentIds(page.results.map(item => item.talent))).catch(() => setSavedTalentIds([]))
    api.bookings.list().then(page => setSafeCircleBookings(page.results)).catch(() => setSafeCircleBookings([]))
    api.auth.me().then(user => {
      const saved = user.employer_profile?.wanted_schedule || {}
      setWantedSchedule(saved)
      setAppliedWantedSchedule(saved)
    }).catch(() => undefined)
  }, [])

  const toggleSavedTalent = async (userId: number) => {
    try {
      const result = await api.savedTalent.toggle(userId)
      setSavedTalentIds(current =>
        result.saved ? Array.from(new Set([...current, userId])) : current.filter(id => id !== userId),
      )
    } catch (error) {
      await dialog.alert({
        title: 'Unable to update saved workers',
        message: error instanceof Error ? error.message : 'Please try again.',
        variant: 'danger',
      })
    }
  }

  const reportWorker = async (userId: number, name: string) => {
    const description = await dialog.prompt({
      title: `Report ${name}?`,
      message: 'Describe the safety, identity, spam, or conduct concern for administrator review.',
      placeholder: 'Include the relevant facts and avoid sensitive information.',
      confirmLabel: 'Submit report',
    })
    if (!description?.trim()) return
    try {
      await api.fraudReports.create({
        reported_user: userId,
        reason: 'other',
        description: description.trim(),
      })
      await dialog.alert({
        title: 'Report submitted',
        message: 'The Trust & Safety team can now review this report.',
        variant: 'success',
      })
    } catch (error) {
      await dialog.alert({
        title: 'Report not submitted',
        message: error instanceof Error ? error.message : 'Please try again.',
        variant: 'danger',
      })
    }
  }

  const directoryFreelancers = talent.map((worker, index) => ({
    ...FREELANCERS[0], id: worker.id, userId: worker.id, name: worker.name,
    title: worker.headline || 'KaamVerse professional', rate: 'Discuss rate',
    rating: Math.max(3, Math.min(5, worker.trust_score / 20)), reviews: 0,
    skills: worker.skills || [], trust: worker.trust_score, level: Math.max(1, worker.verification_level),
    match: worker.match_percentage, available: Object.keys(worker.availability || {}).length > 0,
    initials: worker.name.split(/\s+/).slice(0, 2).map(part => part[0] || '').join('').toUpperCase(),
    color: ['#2563EB', '#7C3AED', '#059669', '#DC2626'][index % 4], exp: 'Verified profile', availability: worker.availability || {},
  }))
  const [selectedFreelancer, setSelectedFreelancer] = useState<typeof directoryFreelancers[number] | null>(null)

  const contactWorker = async (worker: typeof directoryFreelancers[number]) => {
    try {
      await api.conversations.create(worker.userId, `Hiring inquiry: ${worker.title}`)
      await dialog.alert({ title: 'Conversation created', message: `Open Messages to discuss the work, schedule and rate with ${worker.name}.`, variant: 'success' })
    } catch (error) {
      await dialog.alert({ title: 'Unable to contact worker', message: error instanceof ApiError ? error.message : 'Please try again.', variant: 'danger' })
    }
  }

  const directoryServices = serviceListings.map((service, index) => ({
    ...SERVICES[0], id: service.id, providerId: service.provider, name: service.provider_name,
    service: service.title, price: `NPR ${Number(service.price).toLocaleString()}/${service.price_unit}`,
    rating: Math.max(3, Math.min(5, service.provider_trust_score / 20)), reviews: 0,
    trust: service.provider_trust_score, level: Math.max(1, service.provider_verification_level),
    available: service.status === 'active', category: service.category,
    initials: service.provider_name.split(/\s+/).slice(0, 2).map(part => part[0] || '').join('').toUpperCase(),
    color: ['#2563EB', '#059669', '#D97706', '#7C3AED'][index % 4], availability: service.availability || {},
  }))

  const bookService = async (service: typeof directoryServices[number]) => {
    const schedule = await dialog.prompt({ title: `Book ${service.service}`, message: 'Enter date and exact time as YYYY-MM-DD HH:MM-HH:MM.', placeholder: '2026-08-15 13:00-15:00', confirmLabel: 'Request booking' })
    if (!schedule) return
    const match = schedule.trim().match(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})-(\d{2}:\d{2})$/)
    if (!match || match[2] >= match[3]) { await dialog.alert({ title: 'Invalid booking time', message: 'Use YYYY-MM-DD HH:MM-HH:MM and make sure the end time is later.', variant: 'danger' }); return }
    try { await api.bookings.create({ service: service.id, scheduled_date: match[1], start_time: match[2], end_time: match[3] }); await dialog.alert({ title: 'Booking requested', message: `${service.name} has received your booking request and an email notification.`, variant: 'success' }) }
    catch (error) { await dialog.alert({ title: 'Unable to book service', message: error instanceof ApiError ? error.message : 'Please try again.', variant: 'danger' }) }
  }

  const saveWantedSchedule = async () => {
    const invalidDay = Object.entries(wantedSchedule).find(([, value]) => {
      const [start = '', end = ''] = value.split('-')
      return !start || !end || start >= end
    })
    if (invalidDay) {
      await dialog.alert({ title: 'Check wanted time', message: `${invalidDay[0]} end time must be later than its start time.`, variant: 'danger' })
      return
    }
    setSavingWantedSchedule(true)
    try {
      await api.auth.updateMe({ employer_profile: { wanted_schedule: wantedSchedule } })
      setAppliedWantedSchedule({ ...wantedSchedule })
      await dialog.alert({ title: 'Wanted time applied', message: 'Worker results now match the exact days and hours you need.', variant: 'success' })
    } catch (error) {
      await dialog.alert({ title: 'Unable to save wanted time', message: error instanceof ApiError ? error.message : 'Please try again.', variant: 'danger' })
    } finally {
      setSavingWantedSchedule(false)
    }
  }

  const tabs: Array<{ id: HireTab; label: string; icon: string }> = [
    { id: 'freelancers', label: 'Freelancers', icon: '💻' },
    { id: 'services', label: 'Services', icon: '🛠' },
    { id: 'saved', label: 'Saved', icon: '❤️' },
    { id: 'safe-circle', label: 'Safe Circle', icon: '👥' },
  ]

  const TRACK_STEPS = ['Requested', 'Accepted', 'Worker On The Way', 'Arrived', 'Working', 'Completed']

  const handleHireNow = (worker: typeof NEARBY[0]) => {
    setHiredWorker(worker)
    setEmergencyPhase('tracking')
    setTrackStep(0)
  }

  if (selectedFreelancer) return <UnifiedDetailPage backLabel="Back to Freelancers" onBack={() => setSelectedFreelancer(null)} icon={selectedFreelancer.initials} title={selectedFreelancer.name} subtitle={selectedFreelancer.title} verifiedLabel="Verified Freelancer" score={selectedFreelancer.match} scoreTitle="Talent Match Score" scoreMessage={`${selectedFreelancer.name}'s skills, trust score, and available schedule align with your hiring preferences.`} facts={[{ label: 'Hourly rate', value: selectedFreelancer.rate, icon: '💰' }, { label: 'Rating', value: `${selectedFreelancer.rating.toFixed(1)} / 5`, icon: '★' }, { label: 'Availability', value: scheduleSummary(selectedFreelancer.availability), icon: '◷' }, { label: 'Trust score', value: `${selectedFreelancer.trust}%`, icon: '✣' }]} tags={['Freelancer', 'Verified', ...selectedFreelancer.skills]} descriptionTitle="About this professional" description={`${selectedFreelancer.name} is a verified ${selectedFreelancer.title.toLowerCase()} available for flexible work through KaamVerse.`} sections={[{ title: 'Professional capabilities', items: selectedFreelancer.skills.length ? selectedFreelancer.skills.map(skill => `Professional experience with ${skill}`) : ['Verified professional profile'], check: true }, { title: 'Hiring process', items: ['Start a secure conversation', 'Agree on the exact work and schedule', 'Confirm the rate and expected delivery', 'Keep important communication in KaamVerse'] }, { title: 'Hiring protection', items: ['Verified account information', 'Trust-score visibility', 'Recorded conversation history', 'Reporting and administrator support'], check: true, columns: true }]} primaryValue={selectedFreelancer.rate} primaryMeta={scheduleSummary(selectedFreelancer.availability)} primaryLabel="Hire Now" onPrimary={() => void contactWorker(selectedFreelancer)} onMessage={() => void contactWorker(selectedFreelancer)} onReport={() => void reportWorker(selectedFreelancer.userId, selectedFreelancer.name)} profileTitle="Professional Profile" profileBody={`${selectedFreelancer.name} has a ${selectedFreelancer.trust}% trust score and a verified profile.`} />

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="font-heading text-2xl font-extrabold text-slate-900 dark:text-white mb-1">Hire Workers</h1>
      <p className="text-slate-400 text-sm mb-5">Find trusted freelancers, book services, or hire instantly nearby.</p>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${tab === t.id ? 'bg-blue-600 text-white shadow-sm' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-blue-300'}`}>
            <span>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      {(tab === 'freelancers' || tab === 'services') && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 mb-5">
          <div className="flex items-start justify-between gap-4 mb-4"><div><h2 className="font-heading font-bold text-slate-900 dark:text-white">Worker Wanted Time</h2><p className="text-sm text-slate-400">Choose the exact days and hours when you need help.</p></div><button onClick={() => { setWantedSchedule({}); setAppliedWantedSchedule({}) }} className="text-xs font-semibold text-blue-600 hover:underline">Clear time</button></div>
          <ExactScheduleEditor value={wantedSchedule} onChange={setWantedSchedule} compact title="" />
          <button disabled={savingWantedSchedule} onClick={saveWantedSchedule} className="mt-4 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold">{savingWantedSchedule ? 'Saving...' : 'Save & Apply Wanted Time'}</button>
        </div>
      )}

      {/* Freelancers */}
      {tab === 'freelancers' && (
        <div>
          <div className="flex flex-wrap gap-3 mb-5">
            <div className="flex-1 min-w-52 relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by skill, name, or profession..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-all" />
            </div>
            <select className="px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 outline-none">
              <option>Any Budget</option><option>Under NPR 1,000/hr</option><option>NPR 1,000–2,000/hr</option><option>Over NPR 2,000/hr</option>
            </select>
            <select className="px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 outline-none">
              <option>Any Trust Score</option><option>90+</option><option>80+</option><option>70+</option>
            </select>
            <select className="px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 outline-none">
              <option>Any Availability</option><option>Available Now</option>
            </select>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {directoryFreelancers.filter(f => (!search || f.name.toLowerCase().includes(search.toLowerCase()) || f.title.toLowerCase().includes(search.toLowerCase()) || f.skills.some(s => s.toLowerCase().includes(search.toLowerCase()))) && scheduleCovers(f.availability, appliedWantedSchedule)).map(f => (
              <article key={f.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-blue-200 dark:border-blue-900 shadow-sm p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all">
                <div className="flex items-start justify-between gap-3"><div className="flex items-start gap-3 min-w-0"><div className="w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-white shrink-0" style={{ backgroundColor: f.color }}>{f.initials}</div><div className="min-w-0"><h3 className="font-heading font-bold text-slate-950 dark:text-white">{f.name}</h3><p className="text-sm text-slate-500 mt-1 truncate">{f.title}</p></div></div><span className="px-3 py-1.5 rounded-full border border-violet-200 bg-violet-50 dark:bg-violet-950 text-violet-700 dark:text-violet-300 text-sm font-bold shrink-0">✣ {f.match}%</span></div>
                <div className="flex flex-wrap gap-2 mt-4"><span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-semibold">{f.exp}</span><span className="px-3 py-1 rounded-full border border-sky-200 bg-sky-50 dark:bg-sky-950 text-sky-700 text-xs font-semibold">✓ Verified</span></div>
                <div className="grid grid-cols-2 gap-2 mt-4 text-sm text-slate-500"><span>★ {f.rating} ({f.reviews})</span><span>$ {f.rate}</span><span className="col-span-2 truncate">◷ {scheduleSummary(f.availability)}</span></div>
                <div className="flex flex-wrap gap-2 mt-4">{f.skills.map(skill => <span key={skill} className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300">{skill}</span>)}</div>
                  <div className="mt-4 flex gap-2">
                    <button onClick={() => void toggleSavedTalent(f.userId)} className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${savedTalentIds.includes(f.userId) ? "border-rose-300 bg-rose-50 text-rose-600" : "border-slate-200 dark:border-slate-700 text-slate-600"}`}>{savedTalentIds.includes(f.userId) ? "♥ Saved" : "♡ Save"}</button>
                    <button onClick={() => void reportWorker(f.userId, f.name)} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600">Report</button>
                  </div>
                <div className="flex items-center gap-2 mt-5 pt-4 border-t border-slate-100 dark:border-slate-800"><TrustBadge score={f.trust} /><button onClick={() => setSelectedFreelancer(f)} className="ml-auto px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold">View</button><button onClick={() => void contactWorker(f)} className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold">Hire Now</button></div>
              </article>
            ))}
          </div>
        </div>
      )}

      {/* Services */}
      {tab === 'services' && (
        <div>
          <div className="flex gap-2 mb-5 overflow-x-auto pb-2">
            {['All', ...Array.from(new Set(serviceListings.map(service => service.category)))].map(c => (
              <button onClick={() => setServiceCategory(c)} key={c} className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${c === serviceCategory ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-blue-300'}`}>{c}</button>
            ))}
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {directoryServices.filter(service => (serviceCategory === 'All' || service.category === serviceCategory) && scheduleCovers(service.availability, appliedWantedSchedule)).map(s => (
              <article key={s.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-blue-200 dark:border-blue-900 shadow-sm p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all">
                <div className="flex items-start justify-between gap-3"><div className="flex items-start gap-3 min-w-0"><div className="w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-white shrink-0" style={{ backgroundColor: s.color }}>{s.initials}</div><div className="min-w-0"><h3 className="font-heading font-bold text-slate-950 dark:text-white">{s.name}</h3><p className="text-sm text-slate-500 mt-1 line-clamp-2">{s.service}</p></div></div><TrustBadge score={s.trust} /></div>
                <div className="flex flex-wrap gap-2 mt-4"><span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-semibold">{s.category}</span><span className="px-3 py-1 rounded-full border border-sky-200 bg-sky-50 dark:bg-sky-950 text-sky-700 text-xs font-semibold">✓ Verified</span></div>
                <div className="grid grid-cols-2 gap-2 mt-4 text-sm text-slate-500"><span>★ {s.rating} ({s.reviews})</span><span>$ {s.price}</span><span className="col-span-2 truncate">◷ {scheduleSummary(s.availability)}</span></div>
                <div className="flex items-center gap-2 mt-5 pt-4 border-t border-slate-100 dark:border-slate-800"><VerifiedBadge level={s.level} /><button onClick={() => void api.conversations.create(s.providerId, `Service inquiry: ${s.service}`).then(() => dialog.alert({ title: 'Conversation created', message: 'Open Messages to contact the provider.', variant: 'success' }))} className="ml-auto px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold">Message</button><button onClick={() => void bookService(s)} className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold">Book Now</button></div>
              </article>
            ))}
          </div>
        </div>
      )}

      {/* Emergency Hire */}
      {tab === 'emergency' && (
        <div>
          {emergencyPhase === 'search' ? (
            <>
              <div className="bg-gradient-to-r from-red-600 to-orange-600 rounded-2xl p-5 text-white mb-5">
                <div className="flex items-center gap-4">
                  <div className="text-4xl">⚡</div>
                  <div>
                    <h2 className="font-heading font-bold text-lg mb-0.5">Emergency Hire</h2>
                    <p className="text-red-100 text-sm">Instantly find and hire verified nearby workers — like Uber for skilled help.</p>
                  </div>
                </div>
              </div>

              {/* Map placeholder */}
              <div className="relative bg-slate-100 dark:bg-slate-800 rounded-2xl overflow-hidden mb-5 border border-slate-200 dark:border-slate-700" style={{ height: 260 }}>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-5xl mb-2">🗺️</div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Nearby worker directory · 4 results</p>
                  </div>
                </div>
                {/* Worker pins on map */}
                {[{ top: '30%', left: '20%', n: 'RT' }, { top: '50%', left: '60%', n: 'HK' }, { top: '70%', left: '35%', n: 'SM' }, { top: '25%', left: '75%', n: 'LT' }].map((p, i) => (
                  <div key={i} className="absolute w-9 h-9 bg-blue-600 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white text-xs font-bold cursor-pointer hover:scale-110 transition-transform" style={{ top: p.top, left: p.left }}>
                    {p.n}
                  </div>
                ))}
                {/* You pin */}
                <div className="absolute bottom-6 right-6 flex flex-col items-center">
                  <div className="w-5 h-5 rounded-full bg-red-500 border-2 border-white shadow-md animate-pulse" />
                  <span className="text-xs bg-white text-slate-800 px-1.5 py-0.5 rounded-full shadow mt-0.5 font-semibold">You</span>
                </div>
              </div>

              {/* Nearby worker cards */}
              <div className="space-y-3">
                {NEARBY.map(w => (
                  <div key={w.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-4 flex items-center gap-4 flex-wrap">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-white shrink-0 relative" style={{ background: `linear-gradient(135deg, ${w.color}, ${w.color}aa)` }}>
                      {w.initials}
                      {w.status === 'Available' && <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <h3 className="font-heading font-bold text-slate-900 dark:text-white text-sm">{w.name}</h3>
                        <TrustBadge score={w.trust} />
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${w.status === 'Available' ? 'bg-green-50 dark:bg-green-950 text-green-700' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>{w.status}</span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{w.skill} · 📍 {w.dist} · 🕐 ETA {w.eta}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <Stars n={Math.floor(w.rating)} />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{w.rating}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button data-action-dialog className="px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold rounded-xl hover:border-blue-300 hover:text-blue-600 transition-colors">💬 Chat</button>
                      <button
                        disabled={w.status !== 'Available'}
                        onClick={() => handleHireNow(w)}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-xl transition-colors">
                        ⚡ Hire Now
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            /* Live Tracking */
            <div>
              <div className="flex items-center gap-3 mb-5">
                <button onClick={() => setEmergencyPhase('search')} className="flex items-center gap-1 text-slate-500 dark:text-slate-400 hover:text-blue-600 text-sm font-medium">← Back</button>
                <h2 className="font-heading font-bold text-slate-900 dark:text-white">Live Tracking</h2>
                <span className="flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 dark:bg-green-950 px-2 py-0.5 rounded-full"><span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" /> Live</span>
              </div>

              {hiredWorker && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5 mb-5">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-white text-lg shrink-0" style={{ background: `linear-gradient(135deg, ${hiredWorker.color}, ${hiredWorker.color}aa)` }}>{hiredWorker.initials}</div>
                    <div className="flex-1">
                      <h3 className="font-heading font-bold text-slate-900 dark:text-white">{hiredWorker.name}</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{hiredWorker.skill} · ETA: {hiredWorker.eta}</p>
                      <TrustBadge score={hiredWorker.trust} />
                    </div>
                    <div className="flex gap-2">
                      <button data-action-dialog className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950 flex items-center justify-center text-blue-600 text-lg">💬</button>
                      <button data-action-dialog className="w-9 h-9 rounded-xl bg-green-50 dark:bg-green-950 flex items-center justify-center text-green-600 text-lg">📞</button>
                      <button data-action-dialog className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-950 flex items-center justify-center text-red-600 text-sm font-bold">SOS</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Progress steps */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-6 mb-5">
                <div className="flex items-center justify-between relative">
                  <div className="absolute left-0 right-0 top-4 h-0.5 bg-slate-100 dark:bg-slate-800 mx-8 z-0" />
                  <div className="absolute left-0 right-0 top-4 h-0.5 mx-8 z-0 transition-all duration-700 bg-gradient-to-r from-blue-500 to-indigo-500" style={{ width: `${(trackStep / (TRACK_STEPS.length - 1)) * (100 - 16)}%`, marginLeft: '2rem' }} />
                  {TRACK_STEPS.map((step, i) => (
                    <div key={step} className="flex flex-col items-center gap-2 relative z-10">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-500 text-xs font-bold ${i <= trackStep ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-400'}`}>
                        {i < trackStep ? '✓' : i + 1}
                      </div>
                      <span className={`text-xs text-center font-medium hidden sm:block ${i <= trackStep ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`} style={{ maxWidth: 64 }}>{step}</span>
                    </div>
                  ))}
                </div>
                <p className="text-center text-sm font-semibold text-slate-900 dark:text-white mt-6">{TRACK_STEPS[trackStep]}</p>
              </div>

              {/* Trust & Safety reminder */}
              <div className="bg-amber-50 dark:bg-amber-950 rounded-2xl border border-amber-100 dark:border-amber-900 p-4 flex items-start gap-3">
                <span className="text-xl shrink-0">🛡️</span>
                <div>
                  <p className="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-0.5">Trust & Safety Reminder</p>
                  <p className="text-xs text-amber-700 dark:text-amber-300">Verify the worker's OTP or QR code upon arrival. Never share payment outside the KaamVerse platform.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Nearby Workers */}
      {tab === 'nearby' && (
        <div>
          <div className="relative bg-slate-100 dark:bg-slate-800 rounded-2xl overflow-hidden mb-5 border border-slate-200 dark:border-slate-700" style={{ height: 220 }}>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-5xl mb-2">🗺️</div>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Workers within 2 km</p>
              </div>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {NEARBY.map(w => (
              <div key={w.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-white shrink-0" style={{ background: `linear-gradient(135deg, ${w.color}, ${w.color}aa)` }}>{w.initials}</div>
                  <div className="flex-1">
                    <h3 className="font-heading font-bold text-slate-900 dark:text-white text-sm">{w.name}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{w.skill} · 📍 {w.dist} · ETA {w.eta}</p>
                  </div>
                  <TrustBadge score={w.trust} />
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <Stars n={Math.floor(w.rating)} /><span className="text-xs font-bold text-slate-700 dark:text-slate-300">{w.rating}</span>
                  <span className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded-full ${w.status === 'Available' ? 'bg-green-50 dark:bg-green-950 text-green-700' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>{w.status}</span>
                </div>
                <button data-action-dialog disabled={w.status !== 'Available'} className="w-full py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl transition-colors">Hire Now</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Saved Workers */}
      {tab === 'saved' && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {directoryFreelancers.filter(f => savedTalentIds.includes(f.userId)).map(w => (
            <div key={w.userId} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-white shrink-0" style={{ background: `linear-gradient(135deg, ${w.color}, ${w.color}bb)` }}>{w.initials}</div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-heading font-bold text-slate-900 dark:text-white text-sm">{w.name}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{w.title}</p>
                </div>
                <TrustBadge score={w.trust} />
              </div>
              <div className="flex items-center gap-2 mb-4">
                <Stars n={Math.floor(w.rating)} /><span className="text-xs font-bold text-slate-700 dark:text-slate-300">{w.rating.toFixed(1)}</span>
                <button onClick={() => void toggleSavedTalent(w.userId)} className="text-xs font-semibold text-rose-600 ml-auto">Remove</button>
              </div>
              <div className="flex gap-2">
                <button onClick={() => void contactWorker(w)} className="flex-1 py-2 text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl hover:border-blue-300 hover:text-blue-600 transition-colors">Message</button>
                <button onClick={() => void contactWorker(w)} className="flex-1 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors">Hire Again</button>
              </div>
            </div>
          ))}
          {!savedTalentIds.length && (
            <div className="col-span-full rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 p-8 text-center text-sm text-slate-500">
              Save freelancers from the Freelancers tab to build your shortlist.
            </div>
          )}
        </div>
      )}

      {/* Safe Circle */}
      {tab === 'safe-circle' && (() => {
        const circle = Array.from(
          safeCircleBookings
            .filter(booking => ['accepted', 'in-progress', 'completed'].includes(booking.status))
            .reduce((map, booking) => {
              const providerId = booking.service_details.provider
              const existing = map.get(providerId)
              if (!existing) {
                map.set(providerId, {
                  providerId,
                  name: booking.service_details.provider_name,
                  title: booking.service_details.title,
                  trust: booking.service_details.provider_trust_score,
                  jobs: 1,
                  rating: Math.max(3, Math.min(5, booking.service_details.provider_trust_score / 20)),
                  status: booking.status,
                })
              } else {
                existing.jobs += 1
              }
              return map
            }, new Map<number, { providerId: number; name: string; title: string; trust: number; jobs: number; rating: number; status: string }>())
            .values(),
        )
        return (
        <div>
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950 dark:to-teal-950 rounded-2xl border border-emerald-100 dark:border-emerald-900 p-4 mb-5 flex items-center gap-3">
            <span className="text-2xl">👥</span>
            <div>
              <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">Your Safe Circle</p>
              <p className="text-xs text-emerald-700 dark:text-emerald-300">Providers from your accepted and completed bookings.</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {circle.map(w => {
              const initials = w.name.split(/\s+/).slice(0, 2).map(part => part[0] || '').join('').toUpperCase() || 'KV'
              return (
              <div key={w.providerId} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-white shrink-0" style={{ background: 'linear-gradient(135deg, #059669, #0d9488)' }}>{initials}</div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-heading font-bold text-slate-900 dark:text-white text-sm">{w.name}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{w.title}</p>
                  </div>
                  <TrustBadge score={w.trust} />
                </div>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {[['Jobs', w.jobs], ['Rating', `${w.rating.toFixed(1)}★`], ['Status', w.status]].map(([k, v]) => (
                    <div key={String(k)} className="bg-slate-50 dark:bg-slate-800 rounded-xl p-2 text-center">
                      <p className="text-xs text-slate-400">{k}</p>
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{String(v)}</p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => void api.conversations.create(w.providerId, `Rehire: ${w.title}`).then(() => dialog.alert({ title: 'Conversation created', message: 'Open Messages to contact this provider.', variant: 'success' })).catch((error: unknown) => dialog.alert({ title: 'Unable to message', message: error instanceof Error ? error.message : 'Please try again.', variant: 'danger' }))} className="flex-1 py-2 text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl hover:border-blue-300 hover:text-blue-600 transition-colors">💬 Message</button>
                  <button onClick={() => void api.conversations.create(w.providerId, `Hire again: ${w.title}`).then(() => dialog.alert({ title: 'Ready to rehire', message: 'A conversation was opened so you can confirm the next booking.', variant: 'success' })).catch((error: unknown) => dialog.alert({ title: 'Unable to start hire', message: error instanceof Error ? error.message : 'Please try again.', variant: 'danger' }))} className="flex-1 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors">Hire Again</button>
                </div>
              </div>
              )
            })}
            {!circle.length && (
              <div className="col-span-full rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 p-8 text-center text-sm text-slate-500">
                Accepted and completed service bookings will appear here.
              </div>
            )}
          </div>
        </div>
        )
      })()}
    </div>
  )
}

// ─── My Posts ─────────────────────────────────────────────────────────────────

function MyPosts({ openModal }: { openModal: () => void }) {
  const dialog = useActionDialog()
  const [tab, setTab] = useState<PostTab>('freelance')
  const [posts, setPosts] = useState<typeof POSTS>([])

  const mapPost = (post: ApiJob): typeof POSTS[number] => ({
    id: post.id,
    type: post.is_urgent ? 'emergency' : post.employment_type === 'freelance' ? 'freelance' : 'gig',
    title: post.title,
    budget: post.salary_min ? `NPR ${Number(post.salary_min).toLocaleString()}` : 'Negotiable',
    status: post.status === 'closed' ? 'Paused' : post.status === 'approved' ? 'Active' : post.status === 'rejected' ? 'Completed' : 'Pending',
    applicants: post.application_count,
    views: 0,
    deadline: post.expires_at ? new Date(post.expires_at).toLocaleDateString() : 'Open',
  })
  const loadPosts = () => api.jobs.mine().then(data => setPosts(data.results.map(mapPost))).catch(error => dialog.alert({ title: 'Posts unavailable', message: error instanceof Error ? error.message : 'Could not load your posts.', variant: 'danger' }))
  useEffect(() => { void loadPosts() }, [])

  const editPost = async (post: typeof POSTS[number]) => {
    const title = await dialog.prompt({ title: 'Edit post title', message: 'Update the title for this post.', defaultValue: post.title, confirmLabel: 'Update' })
    if (!title || title === post.title) return
    try { await api.jobs.update(post.id, { title }); await loadPosts() }
    catch (error) { await dialog.alert({ title: 'Update failed', message: error instanceof Error ? error.message : 'Could not update post.', variant: 'danger' }) }
  }
  const togglePost = async (post: typeof POSTS[number]) => {
    try { post.status === 'Paused' ? await api.jobs.reopen(post.id) : await api.jobs.close(post.id); await loadPosts() }
    catch (error) { await dialog.alert({ title: 'Status update failed', message: error instanceof Error ? error.message : 'Could not update post.', variant: 'danger' }) }
  }
  const deletePost = async (post: typeof POSTS[number]) => {
    if (!await dialog.confirm({ title: 'Delete post', message: `Permanently delete “${post.title}”?`, confirmLabel: 'Delete', variant: 'danger' })) return
    try { await api.jobs.remove(post.id); await loadPosts() }
    catch (error) { await dialog.alert({ title: 'Delete failed', message: error instanceof Error ? error.message : 'Could not delete post.', variant: 'danger' }) }
  }

  const statusColor: Record<string, string> = {
    Active: 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300',
    Paused: 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300',
    Completed: 'bg-slate-100 dark:bg-slate-800 text-slate-500',
  }

  const filtered = posts.filter(p => {
    if (tab === 'freelance') return p.type === 'freelance'
    if (tab === 'gigs') return p.type === 'gig'
    return p.type === 'emergency'
  })

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-slate-900 dark:text-white mb-1">My Posts</h1>
          <p className="text-slate-400 text-sm">Manage your freelance projects, scheduled gigs, and emergency gigs.</p>
        </div>
        <button onClick={openModal} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm">
          + Create New Post
        </button>
      </div>

      <div className="flex gap-2 mb-5">
        {[{ id: 'freelance' as PostTab, label: 'Freelance Projects' }, { id: 'gigs' as PostTab, label: 'Scheduled Gigs' }, { id: 'emergency' as PostTab, label: 'Emergency Gigs' }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${tab === t.id ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
          <div className="text-5xl mb-3">📭</div>
          <p className="text-slate-500 dark:text-slate-400 font-medium mb-4">No posts yet</p>
          <button onClick={openModal} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors">Create First Post</button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(p => (
            <div key={p.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-heading font-bold text-slate-900 dark:text-white text-sm">{p.title}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${statusColor[p.status] || 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>{p.status}</span>
                  </div>
                  <div className="flex flex-wrap gap-4 text-xs text-slate-400">
                    <span>💰 {p.budget}</span>
                    <span>👤 {p.applicants} applicants</span>
                    <span>👁 {p.views} views</span>
                    <span>📅 Deadline: {p.deadline}</span>
                  </div>
                </div>
                <div className="flex gap-1.5 flex-wrap shrink-0">
                  <button onClick={() => editPost(p)} className="px-2.5 py-1.5 text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl hover:border-blue-300 hover:text-blue-600 transition-colors">Edit</button>
                  <button onClick={() => togglePost(p)} className="px-2.5 py-1.5 text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl hover:border-amber-300 hover:text-amber-600 transition-colors">{p.status === 'Paused' ? 'Resume' : 'Pause'}</button>
                  <button onClick={() => deletePost(p)} className="px-2.5 py-1.5 text-xs font-semibold border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-50 dark:hover:bg-red-950 transition-colors">Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Bookings ─────────────────────────────────────────────────────────────────

function BookingsWorkspace() {
  const dialog = useActionDialog()
  const [tab, setTab] = useState<BookingTab>('upcoming')
  const [bookings, setBookings] = useState<ApiBooking[]>([])
  const load = () => api.bookings.list().then(page => setBookings(page.results)).catch(() => setBookings([]))
  useEffect(() => { void load() }, [])
  const filtered = bookings.filter(booking => tab === 'upcoming' ? ['requested','accepted'].includes(booking.status) : tab === 'ongoing' ? booking.status === 'in-progress' : booking.status === tab)
  const cancel = async (booking: ApiBooking) => {
    const accepted = await dialog.confirm({ title: 'Cancel this booking?', message: `Cancel ${booking.service_details.title} on ${booking.scheduled_date}?`, confirmLabel: 'Cancel booking', variant: 'danger' })
    if (!accepted) return
    await api.bookings.updateStatus(booking.id, 'cancelled')
    await load()
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="font-heading text-2xl font-extrabold text-slate-900 dark:text-white mb-1">Bookings</h1>
      <p className="text-slate-400 text-sm mb-5">Track and manage all your service bookings.</p>

      <div className="flex gap-2 mb-5 overflow-x-auto pb-2">
        {(['upcoming', 'ongoing', 'completed', 'cancelled'] as BookingTab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold capitalize whitespace-nowrap transition-all ${tab === t ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}>
            {t}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
          <div className="text-5xl mb-3">📅</div>
          <p className="text-slate-500 dark:text-slate-400 font-medium">No {tab} bookings</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(booking => (
            <div key={booking.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-blue-200 dark:border-blue-900 shadow-sm p-5">
              <div className="flex items-start gap-4 flex-wrap">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-white bg-blue-600 shrink-0">{booking.service_details.provider_name.split(/\s+/).slice(0,2).map(part => part[0]).join('').toUpperCase()}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-heading font-bold text-slate-900 dark:text-white text-sm">{booking.service_details.provider_name}</h3>
                    <TrustBadge score={booking.service_details.provider_trust_score} />
                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 capitalize">{booking.status.replace('-', ' ')}</span>
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-300 mb-1">{booking.service_details.title}</p>
                  <div className="flex flex-wrap gap-4 text-xs text-slate-400">
                    <span>📅 {booking.scheduled_date}</span>
                    <span>🕐 {booking.start_time.slice(0,5)}–{booking.end_time.slice(0,5)}</span>
                    <span>💰 NPR {Number(booking.service_details.price).toLocaleString()}/{booking.service_details.price_unit}</span>
                  </div>
                </div>
                <div className="flex gap-1.5 flex-wrap shrink-0">
                  <button onClick={() => void api.conversations.create(booking.service_details.provider, `Booking: ${booking.service_details.title}`)} className="px-2.5 py-1.5 text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl hover:border-blue-300 hover:text-blue-600 transition-colors">💬 Message</button>
                  {['requested','accepted'].includes(booking.status) && <button onClick={() => void cancel(booking)} className="px-2.5 py-1.5 text-xs font-semibold border border-red-200 text-red-600 rounded-xl hover:bg-red-50 transition-colors">Cancel</button>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Messages ─────────────────────────────────────────────────────────────────

function MessagesWorkspace() {
  const [activeConv, setActiveConv] = useState(CONVERSATIONS[0])
  const [msg, setMsg] = useState('')
  const [showInfo, setShowInfo] = useState(false)
  const [sentMessages, setSentMessages] = useState<Record<number, Array<{ id: number; sender: 'me'; text: string; time: string }>>>({})

  const WORKER_INFO: Record<number, { role: string; trust: number; rating: number; jobs: number; skills: string[]; sharedFiles: Array<{ name: string; size: string; type: string }>; nextBooking: string | null }> = {
    1: { role: 'Home Tutor · Maths & Science', trust: 96, rating: 4.9, jobs: 12, skills: ['Maths', 'Science', 'Teaching'], sharedFiles: [{ name: 'lesson_plan.pdf', size: '1.2 MB', type: 'pdf' }, { name: 'grade8_notes.docx', size: '340 KB', type: 'doc' }], nextBooking: 'Mar 25 · 4:00 PM' },
    2: { role: 'House Cleaner', trust: 94, rating: 4.8, jobs: 8, skills: ['Cleaning', 'Organization'], sharedFiles: [{ name: 'service_checklist.pdf', size: '200 KB', type: 'pdf' }], nextBooking: 'Mar 22 · 10:00 AM' },
    3: { role: 'Full-Stack Developer', trust: 96, rating: 4.9, jobs: 18, skills: ['React', 'Python', 'AWS'], sharedFiles: [{ name: 'project_scope.pdf', size: '890 KB', type: 'pdf' }, { name: 'wireframes.png', size: '2.1 MB', type: 'img' }], nextBooking: null },
    4: { role: 'KaamVerse Support', trust: 100, rating: 5.0, jobs: 0, skills: ['Support', 'Safety'], sharedFiles: [], nextBooking: null },
  }
  const winfo = WORKER_INFO[activeConv.id] || WORKER_INFO[1]

  const fileIcon = (type: string) => {
    if (type === 'pdf') return { bg: 'bg-red-100 dark:bg-red-950', text: 'text-red-600 dark:text-red-400', label: 'PDF' }
    if (type === 'img') return { bg: 'bg-blue-100 dark:bg-blue-950', text: 'text-blue-600 dark:text-blue-400', label: 'IMG' }
    return { bg: 'bg-green-100 dark:bg-green-950', text: 'text-green-600 dark:text-green-400', label: 'DOC' }
  }

  const MOCK_MESSAGES = [
    { id: 1, sender: 'them', text: 'Hello! I saw your gig post for home tutoring.', time: '10:01 AM' },
    { id: 2, sender: 'me', text: 'Yes! Are you available this Saturday at 4 PM?', time: '10:03 AM' },
    { id: 3, sender: 'them', text: 'Absolutely! I teach Maths and Science up to Grade 12.', time: '10:04 AM' },
    { id: 4, sender: 'me', text: 'Perfect, my son is in Grade 8. What is your rate per hour?', time: '10:06 AM' },
    { id: 5, sender: 'them', text: 'NPR 600/hr for 2 hour sessions. I can come to your place.', time: '10:07 AM' },
    { id: 6, sender: 'me', text: "That sounds great! See you tomorrow at 4 PM!", time: '10:09 AM' },
    { id: 7, sender: 'them', text: 'See you tomorrow at 4 PM!', time: '10:10 AM' },
  ]
  const visibleMessages = [...MOCK_MESSAGES, ...(sentMessages[activeConv.id] || [])]
  const sendMessage = () => {
    const text = msg.trim()
    if (!text) return
    setSentMessages(current => ({ ...current, [activeConv.id]: [...(current[activeConv.id] || []), { id: Date.now(), sender: 'me', text, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }] }))
    setMsg('')
  }

  return (
    <div className="flex h-[calc(100vh-64px)] bg-white dark:bg-slate-900">
      {/* Conversation list */}
      <div className="w-72 border-r border-slate-100 dark:border-slate-800 flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="font-heading font-bold text-slate-900 dark:text-white text-sm mb-3">Messages</h2>
          <input placeholder="Search conversations..." className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-all" />
        </div>
        <div className="flex-1 overflow-y-auto">
          {CONVERSATIONS.map(c => (
            <button key={c.id} onClick={() => setActiveConv(c)}
              className={`w-full flex items-center gap-3 px-4 py-3.5 text-left border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${activeConv.id === c.id ? 'bg-blue-50 dark:bg-blue-950 border-l-2 border-l-blue-500' : ''}`}>
              <div className="relative shrink-0">
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-xs" style={{ backgroundColor: c.color }}>{c.initials}</div>
                {c.online && <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-white" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs font-semibold text-slate-900 dark:text-white">{c.name}</span>
                  <span className="text-xs text-slate-400">{c.time}</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{c.last}</p>
              </div>
              {c.unread > 0 && <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0">{c.unread}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Chat window */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-xs" style={{ backgroundColor: activeConv.color }}>{activeConv.initials}</div>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{activeConv.name}</p>
              <p className="text-xs text-green-600 dark:text-green-400">{activeConv.online ? 'Online' : 'Offline'}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {['📞', '📹'].map(ic => (
              <button data-action-dialog aria-label={ic === '📞' ? 'Call worker' : 'Video call worker'} key={ic} className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">{ic}</button>
            ))}
            <button onClick={() => setShowInfo(v => !v)} className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${showInfo ? 'bg-blue-100 dark:bg-blue-950 text-blue-600' : 'bg-slate-50 dark:bg-slate-800 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h.01M12 12h.01M19 12h.01" /></svg>
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {visibleMessages.map(m => (
            <div key={m.id} className={`flex ${m.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xs px-4 py-2.5 rounded-2xl text-sm ${m.sender === 'me' ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-bl-sm'}`}>
                <p className="leading-relaxed">{m.text}</p>
                <p className={`text-xs mt-1 ${m.sender === 'me' ? 'text-blue-200' : 'text-slate-400'}`}>{m.time}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-3">
          <div className="flex gap-1.5">
            {['📎', '🖼️', '🎤'].map(ic => (
              <button data-action-dialog aria-label={ic === '📎' ? 'Attach file' : ic === '🖼️' ? 'Attach image' : 'Record voice note'} key={ic} className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-sm">{ic}</button>
            ))}
          </div>
          <input value={msg} onChange={e => setMsg(e.target.value)} placeholder="Type a message..."
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-all"
            onKeyDown={e => e.key === 'Enter' && sendMessage()} />
          <button onClick={sendMessage} className="w-10 h-10 rounded-xl bg-blue-600 hover:bg-blue-700 flex items-center justify-center text-white transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
          </button>
        </div>
      </div>

      {/* ── Column 3: Info panel ── */}
      {showInfo && (
        <div className="w-64 shrink-0 border-l border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-y-auto flex flex-col">
          {/* Profile */}
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 text-center">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-white text-xl mx-auto mb-3 shadow-md" style={{ backgroundColor: activeConv.color }}>{activeConv.initials}</div>
            <h3 className="font-heading font-bold text-slate-900 dark:text-white text-sm leading-snug mb-0.5">{activeConv.name}</h3>
            <p className="text-xs text-slate-400 mb-1">{winfo.role}</p>
            <div className="flex items-center justify-center gap-2 mb-3">
              <span className={`flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full`} style={{ backgroundColor: '#22C55E18', color: '#22C55E' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />{winfo.trust} Trust
              </span>
              <span className="text-xs text-amber-500 font-bold">{winfo.rating}★</span>
            </div>
            {/* Video / Voice */}
            <div className="flex gap-2 justify-center">
              <button data-action-dialog className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" /></svg>
                Video
              </button>
              <button data-action-dialog className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                Voice
              </button>
            </div>
          </div>

          {/* Skills */}
          {winfo.skills.length > 0 && (
            <div className="p-4 border-b border-slate-100 dark:border-slate-800">
              <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Skills</h4>
              <div className="flex flex-wrap gap-1.5">
                {winfo.skills.map(s => <span key={s} className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs font-medium border border-blue-100 dark:border-blue-900">{s}</span>)}
              </div>
            </div>
          )}

          {/* Next Booking */}
          {winfo.nextBooking && (
            <div className="p-4 border-b border-slate-100 dark:border-slate-800">
              <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Upcoming Booking</h4>
              <div className="bg-blue-50 dark:bg-blue-950 rounded-xl p-3 flex items-center gap-2">
                <span className="text-lg">📅</span>
                <div>
                  <p className="text-xs font-semibold text-slate-900 dark:text-white">Service Booking</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{winfo.nextBooking}</p>
                </div>
              </div>
            </div>
          )}

          {/* Shared Files */}
          {winfo.sharedFiles.length > 0 && (
            <div className="p-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Shared Files</h4>
                <button data-action-dialog className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline">View All</button>
              </div>
              <div className="space-y-2">
                {winfo.sharedFiles.map(f => {
                  const fi = fileIcon(f.type)
                  return (
                    <div key={f.name} className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${fi.bg} ${fi.text}`}>{fi.label}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{f.name}</p>
                        <p className="text-xs text-slate-400">{f.size}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Jobs together */}
          {winfo.jobs > 0 && (
            <div className="p-4">
              <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">History</h4>
              <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 text-center">
                <p className="font-heading font-extrabold text-xl text-blue-600">{winfo.jobs}</p>
                <p className="text-xs text-slate-400">jobs completed together</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Document Upload Field ────────────────────────────────────────────────────

function DocUpload({ label, hint, accept = 'image/*,.pdf' }: { label: string; hint?: string; accept?: string }) {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const id = label.replace(/\s+/g, '-').toLowerCase()
  const upload = async (selected: File | null) => {
    if (!selected) return
    setFile(selected)
    setUploading(true)
    setMessage('')
    const documentType = /pan|vat/i.test(label) ? 'pan_vat' : 'identity'
    try {
      await api.verifications.submit(documentType, selected)
      setMessage('Uploaded and submitted for administrator review.')
    } catch (error) {
      setFile(null)
      setMessage(error instanceof Error ? error.message : 'Upload failed.')
    } finally {
      setUploading(false)
    }
  }
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">{label}</label>
      {file ? (
        <div className="flex items-center gap-2 p-2.5 rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950">
          <span className="text-green-600 text-lg">✅</span>
          <span className="flex-1 text-xs text-green-700 dark:text-green-300 truncate font-medium">{uploading ? 'Uploading...' : file.name}</span>
          <button onClick={() => setFile(null)} className="text-xs text-slate-400 hover:text-red-500 transition-colors">✕</button>
        </div>
      ) : (
        <label htmlFor={id} className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-4 cursor-pointer hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-all">
          <span className="text-2xl">📁</span>
          <span className="text-xs text-slate-500 dark:text-slate-400 text-center">{hint || 'Click to upload'}</span>
          <input id={id} type="file" accept={accept} className="hidden" onChange={e => void upload(e.target.files?.[0] || null)} />
        </label>
      )}
      {message && <p className={`text-xs mt-1.5 ${file ? 'text-green-600' : 'text-red-600'}`}>{message}</p>}
    </div>
  )
}

// ─── Trust Center ─────────────────────────────────────────────────────────────

function TrustCenter() {
  const [activeDoc, setActiveDoc] = useState<'nid' | 'pan' | 'face' | null>(null)

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="font-heading text-2xl font-extrabold text-slate-900 dark:text-white mb-1">Trust Center</h1>
      <p className="text-slate-400 text-sm mb-6">Your safety hub — verification, scores, and document uploads.</p>

      {/* Trust Score */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-blue-200 text-sm mb-0.5">Your Employer Trust Score</p>
            <div className="flex items-end gap-2">
              <span className="font-heading font-extrabold text-5xl">82</span>
              <span className="text-blue-200 pb-2">/ 100</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs bg-white/20 px-3 py-1.5 rounded-full font-semibold">Level 2 — Identity Verified</span>
            <p className="text-blue-200 text-xs mt-2">+5 this month</p>
          </div>
        </div>
        <div className="w-full h-2 bg-white/20 rounded-full mb-2">
          <div className="h-2 bg-white rounded-full transition-all duration-1000" style={{ width: '82%' }} />
        </div>
        <p className="text-blue-100 text-xs">Complete Face Verification (Level 3) to unlock premium workers</p>
      </div>

      {/* Status + Levels */}
      <div className="grid sm:grid-cols-2 gap-5 mb-5">
        {/* Verification Status */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5">
          <h3 className="font-heading font-bold text-slate-900 dark:text-white text-sm mb-4">Verification Status</h3>
          <div className="space-y-3">
            {[
              { label: 'Email', status: 'Verified', icon: '📧', color: '#22C55E' },
              { label: 'Phone', status: 'Verified', icon: '📱', color: '#22C55E' },
              { label: 'NID / Citizenship', status: 'Verified', icon: '🪪', color: '#22C55E' },
              { label: 'Face Verification', status: 'Pending', icon: '🤳', color: '#F59E0B' },
            ].map(v => (
              <div key={v.label} className="flex items-center gap-3">
                <span className="text-lg shrink-0">{v.icon}</span>
                <span className="flex-1 text-sm text-slate-700 dark:text-slate-300">{v.label}</span>
                <span className="text-xs font-semibold" style={{ color: v.color }}>{v.status}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Verification Levels */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5">
          <h3 className="font-heading font-bold text-slate-900 dark:text-white text-sm mb-4">Verification Levels</h3>
          <div className="space-y-2.5">
            {[
              { dot: 'bg-green-500', label: 'Level 1 — Basic Verified', done: true },
              { dot: 'bg-blue-500', label: 'Level 2 — Identity Verified', done: true },
              { dot: 'bg-purple-400', label: 'Level 3 — Face Verified', done: false },
              { dot: 'bg-amber-400', label: 'Level 4 — Trusted Employer', done: false },
            ].map(v => (
              <div key={v.label} className={`flex items-center gap-3 p-3 rounded-xl ${v.done ? 'bg-green-50 dark:bg-green-950' : 'bg-slate-50 dark:bg-slate-800'}`}>
                <span className={`w-3 h-3 rounded-full shrink-0 ${v.done ? v.dot : 'bg-slate-300 dark:bg-slate-600'}`} />
                <span className={`text-sm flex-1 ${v.done ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500'}`}>{v.label}</span>
                {v.done && <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Document Verification Uploads */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5 mb-5">
        <h3 className="font-heading font-bold text-slate-900 dark:text-white text-sm mb-1">Document Verification</h3>
        <p className="text-xs text-slate-400 mb-5">Upload your identity documents to increase your trust level and unlock premium features.</p>

        {/* Document selector tabs */}
        <div className="flex gap-2 mb-5 flex-wrap">
          {[
            { id: 'nid' as const, label: '🪪 NID / Citizenship', status: 'Verified' },
            { id: 'pan' as const, label: '📄 PAN / VAT Card', status: 'Pending' },
            { id: 'face' as const, label: '🤳 Face Verification', status: 'Pending' },
          ].map(d => (
            <button key={d.id} onClick={() => setActiveDoc(activeDoc === d.id ? null : d.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${activeDoc === d.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-blue-300'}`}>
              {d.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${d.status === 'Verified' ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' : 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300'}`}>{d.status}</span>
            </button>
          ))}
        </div>

        {/* NID / Citizenship */}
        {activeDoc === 'nid' && (
          <div className="space-y-4 animate-in">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">NID / Citizenship Number *</label>
              <input placeholder="Enter your NID or Citizenship number" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 transition-all" />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <DocUpload label="NID / Citizenship — Front Photo" hint="Clear photo of the front side" accept="image/*" />
              <DocUpload label="NID / Citizenship — Back Photo" hint="Clear photo of the back side" accept="image/*" />
            </div>
            <div className="bg-blue-50 dark:bg-blue-950 rounded-xl p-3 text-xs text-blue-700 dark:text-blue-300">
              <span className="font-semibold">Accepted documents:</span> Nepali Citizenship Certificate, National Identity Card, or Passport. Both front and back are required.
            </div>
            <p className="text-xs text-slate-500">Each selected file is uploaded securely and submitted automatically.</p>
          </div>
        )}

        {/* PAN / VAT */}
        {activeDoc === 'pan' && (
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">PAN Number</label>
                <input placeholder="Enter your PAN number" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-all" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">VAT Number <span className="text-slate-400 font-normal">(optional)</span></label>
                <input placeholder="Enter your VAT number if applicable" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-all" />
              </div>
            </div>
            <DocUpload label="PAN Card Photo" hint="Upload a clear photo of your PAN card" accept="image/*" />
            <DocUpload label="VAT Registration Document (optional)" hint="PDF or image of VAT registration" accept="image/*,.pdf" />
            <p className="text-xs text-slate-500">Each selected file is uploaded securely and submitted automatically.</p>
          </div>
        )}

        {/* Face Verification */}
        {activeDoc === 'face' && (
          <div className="space-y-4">
            <div className="bg-amber-50 dark:bg-amber-950 border border-amber-100 dark:border-amber-900 rounded-xl p-4 text-xs text-amber-800 dark:text-amber-200">
              <p className="font-semibold mb-1">Face Verification Requirements</p>
              <ul className="space-y-0.5 list-disc pl-4">
                <li>Take a clear selfie in good lighting — no hats, glasses, or masks</li>
                <li>Your face must match the photo on your NID/Citizenship document</li>
                <li>Photo must be recent — taken within the last 30 days</li>
              </ul>
            </div>
            <DocUpload label="Live Selfie Photo" hint="Upload a clear front-facing selfie photo" accept="image/*" />
            <DocUpload label="Selfie Holding NID / Passport" hint="Photo of you holding your identity document" accept="image/*" />
            <div className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
              <input type="checkbox" id="face-consent" className="w-4 h-4 rounded text-blue-600" />
              <label htmlFor="face-consent" className="text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                I consent to biometric face verification processing by KaamVerse as per the Privacy Policy.
              </label>
            </div>
            <p className="text-xs text-slate-500">Each selected file is uploaded securely and submitted automatically.</p>
          </div>
        )}

        {!activeDoc && (
          <div className="text-center py-8 text-slate-400">
            <p className="text-3xl mb-2">📂</p>
            <p className="text-sm">Select a document type above to upload or review</p>
          </div>
        )}
      </div>

      {/* Sensitive Hiring */}
      <div className="bg-amber-50 dark:bg-amber-950 rounded-2xl border border-amber-100 dark:border-amber-900 p-5 mb-5">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">⚠️</span>
          <div>
            <h3 className="font-heading font-bold text-amber-900 dark:text-amber-100 text-sm">Sensitive Hiring Requirements</h3>
            <p className="text-xs text-amber-700 dark:text-amber-300">For childcare, elderly care, and home access, workers must meet stricter standards.</p>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            { cat: '👶 Childcare', req: ['Identity Verified', 'Face Verified', 'OTP Handover'] },
            { cat: '🐾 Pet Care', req: ['Identity Verified', 'Professional Cert.'] },
            { cat: '👴 Elderly Care', req: ['Face Verified', 'Health Certificate'] },
            { cat: '🏠 Home Access', req: ['Identity Verified'] },
          ].map(c => (
            <div key={c.cat} className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-amber-100 dark:border-amber-900">
              <p className="text-xs font-bold text-slate-900 dark:text-white mb-1.5">{c.cat}</p>
              <div className="flex flex-wrap gap-1">
                {c.req.map(r => <span key={r} className="text-xs px-1.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">{r}</span>)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Emergency SOS */}
      <div className="bg-red-50 dark:bg-red-950 rounded-2xl border border-red-100 dark:border-red-900 p-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900 flex items-center justify-center text-2xl">🆘</div>
          <div className="flex-1">
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Profile ──────────────────────────────────────────────────────────────────

function ProfileWorkspace({ lang, setLang }: { lang: 'en'|'np'; setLang: (language: 'en'|'np') => void }) {
  const [tab, setTab] = useState('overview')

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="font-heading text-2xl font-extrabold text-slate-900 dark:text-white mb-1">Profile</h1>
      <p className="text-slate-400 text-sm mb-5">Manage your personal information, verification, and preferences.</p>

      <div className="flex gap-2 mb-5 overflow-x-auto pb-2">
        {['overview', 'verification', 'reviews', 'preferences'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold capitalize whitespace-nowrap transition-all ${tab === t ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-5">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5">
            <div className="flex items-center gap-4 mb-5">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center font-bold text-white text-xl">YS</div>
              <div>
                <h2 className="font-heading font-bold text-slate-900 dark:text-white text-lg">Yugina Sharma</h2>
                <p className="text-slate-400 text-sm">Individual Employer · Kathmandu</p>
                <div className="flex items-center gap-2 mt-1">
                  <TrustBadge score={82} />
                  <VerifiedBadge level={2} />
                </div>
              </div>
              <button data-action-dialog className="ml-auto px-3 py-2 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300 rounded-xl hover:border-blue-300 hover:text-blue-600 transition-colors">Edit</button>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {[['Email', 'yugina@example.com'], ['Phone', '+977-98XXXXXXXX'], ['Location', 'Thamel, Kathmandu'], ['Member since', 'January 2025']].map(([k, v]) => (
                <div key={k} className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
                  <p className="text-xs text-slate-400 mb-0.5">{k}</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{v}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'verification' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5 space-y-4">
          {[
            { label: 'Email Address', icon: '📧', status: 'Verified', action: null },
            { label: 'Phone Number', icon: '📱', status: 'Verified', action: null },
            { label: 'National ID', icon: '🪪', status: 'Verified', action: null },
            { label: 'Face Verification', icon: '🤳', status: 'Pending', action: 'Complete Now' },
          ].map(v => (
            <div key={v.label} className="flex items-center gap-3 py-2 border-b border-slate-50 dark:border-slate-800 last:border-0">
              <span className="text-lg shrink-0">{v.icon}</span>
              <span className="flex-1 text-sm font-medium text-slate-700 dark:text-slate-300">{v.label}</span>
              <span className={`text-xs font-semibold ${v.status === 'Verified' ? 'text-green-600' : v.status === 'Pending' ? 'text-amber-600' : 'text-slate-400'}`}>{v.status}</span>
              {v.action && <button data-action-dialog className="px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors">{v.action}</button>}
            </div>
          ))}
        </div>
      )}

      {tab === 'reviews' && (
        <div className="space-y-3">
          {[
            { worker: 'Raju Tamang', text: 'Yugina is very professional and prompt with payments. Would love to work again!', rating: 5, date: 'Mar 15', initials: 'RT', color: '#2563EB' },
            { worker: 'Mina Shrestha', text: 'Great employer. Clear instructions and very polite.', rating: 5, date: 'Mar 5', initials: 'MS', color: '#059669' },
          ].map((r, i) => (
            <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5">
              <div className="flex items-start gap-3 mb-2">
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm shrink-0" style={{ backgroundColor: r.color }}>{r.initials}</div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-heading font-semibold text-slate-900 dark:text-white text-sm">{r.worker}</span>
                    <Stars n={r.rating} />
                  </div>
                  <p className="text-xs text-slate-400">{r.date}</p>
                </div>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300 italic">&ldquo;{r.text}&rdquo;</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'preferences' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5 space-y-4">
          <div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Preferred Hiring Categories</p>
            <div className="flex flex-wrap gap-2">
              {['Tutor', 'Cleaner', 'Plumber', 'Driver'].map(c => (
                <span key={c} className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs font-semibold border border-blue-100 dark:border-blue-900">{c} ✕</span>
              ))}
              <button data-action-dialog className="px-3 py-1.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 text-slate-500 text-xs font-medium hover:border-blue-400 transition-colors">+ Add</button>
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Language</p>
            <div className="flex gap-2">
              {[['English', 'en'], ['नेपाली', 'np']].map(([label, value]) => (
                <button onClick={() => setLang(value as 'en'|'np')} key={value} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${lang === value ? 'bg-blue-600 text-white' : 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}>{label}</button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Settings ─────────────────────────────────────────────────────────────────

function SettingsWorkspace({ onLogout }: { onLogout: () => void }) {
  const dialog = useActionDialog()
  const [tab, setTab] = useState('account')
  const [user, setUser] = useState<ApiUser | null>(null)
  useEffect(() => { void api.auth.me().then(setUser).catch(() => undefined) }, [])

  const editAccount = async (field: string) => {
    if (!user) return
    if (field === 'Email Address') {
      await dialog.alert({ title: 'Email address', message: 'Contact an administrator to change the login email for a verified account.', variant: 'info' })
      return
    }
    const currentValue = field === 'Full Name' ? `${user.first_name} ${user.last_name}`.trim() : field === 'Phone Number' ? user.phone || '' : field === 'Location' ? user.employer_profile?.address || user.employer_profile?.city || '' : user.date_of_birth || ''
    const value = await dialog.prompt({ title: `Edit ${field}`, message: `Enter your ${field.toLowerCase()}.`, defaultValue: currentValue, confirmLabel: 'Save' })
    if (!value) return
    try {
      if (field === 'Full Name') {
        const [first_name, ...last] = value.split(/\s+/)
        setUser(await api.auth.updateMe({ first_name, last_name: last.join(' ') }))
      } else if (field === 'Phone Number') setUser(await api.auth.updateMe({ phone: value }))
      else if (field === 'Location') setUser(await api.auth.updateMe({ employer_profile: { address: value, city: value } }))
      else setUser(await api.auth.updateMe({ date_of_birth: value }))
      await dialog.alert({ title: `${field} saved`, message: 'Your account details were updated.', variant: 'success' })
    } catch (error) { await dialog.alert({ title: 'Update failed', message: error instanceof Error ? error.message : 'Could not update account.', variant: 'danger' }) }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="font-heading text-2xl font-extrabold text-slate-900 dark:text-white mb-1">Settings</h1>
      <p className="text-slate-400 text-sm mb-5">Manage your account security, notifications, and preferences.</p>

      <div className="flex gap-2 mb-5 overflow-x-auto pb-2">
        {['account', 'security', 'notifications', 'appearance', 'privacy'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold capitalize whitespace-nowrap transition-all ${tab === t ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'account' && (
        <div className="space-y-3">
          {['Full Name', 'Email Address', 'Phone Number', 'Date of Birth', 'Location'].map(f => (
            <div key={f} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 px-4 py-3 flex items-center justify-between">
              <p className="text-sm text-slate-700 dark:text-slate-300">{f}</p>
              <button onClick={() => editAccount(f)} className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">Edit</button>
            </div>
          ))}
          <button onClick={onLogout} className="w-full py-3 mt-4 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-sm font-semibold rounded-xl hover:bg-red-50 dark:hover:bg-red-950 transition-colors">
            Log Out
          </button>
        </div>
      )}

      {tab === 'security' && (
        <div className="space-y-3">
          {['Change Password', 'Two-Factor Authentication', 'Login History', 'Active Sessions'].map(f => (
            <div key={f} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 px-4 py-3 flex items-center justify-between">
              <p className="text-sm text-slate-700 dark:text-slate-300">{f}</p>
              <button data-action-dialog aria-label={f} className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">Manage</button>
            </div>
          ))}
        </div>
      )}

      {tab === 'notifications' && (
        <EmailPreferences compact />
      )}

      {(tab === 'appearance' || tab === 'privacy') && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-8 text-center">
          <div className="text-4xl mb-3">⚙️</div>
          <p className="text-slate-500 dark:text-slate-400 font-medium capitalize">{tab} settings</p>
          <p className="text-xs text-slate-400 mt-1">Options available here</p>
        </div>
      )}
    </div>
  )
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export function IndividualEmployerDashboard({ onLogout, lang, setLang }: { onLogout: () => void; lang: 'en'|'np'; setLang: (language: 'en'|'np') => void }) {
  const [section, setSection] = useState<ISection>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [postVersion, setPostVersion] = useState(0)
  const [dashboardStats, setDashboardStats] = useState<Record<string, string | number>>({})
  useEffect(() => {
    const load = () => api.dashboard().then(setDashboardStats).catch(() => undefined)
    void load()
    const timer = window.setInterval(() => { void load() }, 10000)
    return () => window.clearInterval(timer)
  }, [postVersion])

  const navItems: Array<{ id: ISection; icon: string; label: string; badge?: number }> = [
    { id: 'dashboard', icon: '🏠', label: 'Dashboard' },
    { id: 'hire', icon: '👥', label: 'Hire Workers' },
    { id: 'posts', icon: '📋', label: 'My Posts', badge: Number(dashboardStats.jobs || 0) },
    { id: 'messages', icon: '💬', label: 'Messages', badge: Number(dashboardStats.unread_messages || 0) },
    { id: 'trust', icon: '🛡️', label: 'Trust Center' },
    { id: 'profile', icon: '👤', label: 'Profile' },
    { id: 'settings', icon: '⚙️', label: 'Settings' },
  ]

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-56' : 'w-16'} shrink-0 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 flex flex-col transition-all duration-300 min-h-screen sticky top-16`}>
        <div className="flex items-center justify-between px-4 py-4 border-b border-slate-100 dark:border-slate-800">
          {sidebarOpen && (
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">Employer Workspace</p>
              <p className="text-xs text-slate-400 leading-tight">Managing Care Services</p>
            </div>
          )}
          <button onClick={() => setSidebarOpen(v => !v)} className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
        </div>

        <nav className="flex-1 py-3">
          {navItems.map(item => (
            <button key={item.id} onClick={() => setSection(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${section === item.id ? 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border-r-2 border-blue-600' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'}`}>
              <span className="text-lg shrink-0">{item.icon}</span>
              {sidebarOpen && <><span className="text-sm font-medium flex-1">{item.label}</span>{item.badge !== undefined && <span className="text-xs px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold">{item.badge}</span>}</>}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-slate-100 dark:border-slate-800">
          <button onClick={onLogout}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 transition-colors`}>
            <span className="text-lg shrink-0">🚪</span>
            {sidebarOpen && <span className="text-sm font-medium">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0">
        {section === 'dashboard' && <DashboardHome setSection={setSection} dashboardStats={dashboardStats} />}
        {section === 'hire' && <HireWorkspace />}
        {section === 'posts' && <MyPosts key={postVersion} openModal={() => setModalOpen(true)} />}
        {section === 'messages' && <ApiMessagesWorkspace />}
        {section === 'trust' && <TrustCenter />}
        {section === 'profile' && <ProfileWorkspace lang={lang} setLang={setLang} />}
        {section === 'settings' && <SettingsWorkspace onLogout={onLogout} />}
      </main>

      {/* Floating Action Button */}
      {section !== 'messages' && (
        <button onClick={() => setModalOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl shadow-xl shadow-blue-200 dark:shadow-none flex items-center justify-center text-2xl transition-all hover:scale-105 z-40">
          +
        </button>
      )}

      {modalOpen && <CreatePostModal onClose={() => setModalOpen(false)} onCreated={() => setPostVersion(value => value + 1)} />}
    </div>
  )
}
