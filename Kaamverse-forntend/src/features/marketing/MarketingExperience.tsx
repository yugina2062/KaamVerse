import { useState, useRef, useEffect, type ReactNode } from 'react'
import { api } from '@/lib/api/client'
import type { ApiJob, ApiUser } from '@/lib/api/types'
import { UnifiedDetailPage } from '@/components/marketplace/UnifiedDetailPage'
import { useActionDialog } from '@/components/ui/ActionDialogs'
import { showToast } from '@/components/ui/SystemFeedback'

export type Page =
  | 'home' | 'about' | 'features' | 'ai-features' | 'trust-safety'
  | 'employment-types' | 'services-marketplace' | 'companies' | 'company-details'
  | 'jobs' | 'job-details' | 'freelance' | 'gigs' | 'services' | 'testimonials' | 'faq'
  | 'contact' | 'privacy' | 'terms' | 'help' | 'auth' | 'dashboard' | 'listing-details'

// ─── Data ────────────────────────────────────────────────────────────────────

type MarketingJob = {
  id: number
  title: string
  company: string
  location: string
  type: string
  salary: string
  tags: string[]
  trust: number
  urgent: boolean
  posted: string
  description?: string
  positions?: number
  applicationCount?: number
  expiresAt?: string | null
  schedule?: Record<string, string>
  shiftType?: ApiJob['shift_type']
  matchPercentage?: number | null
  saved?: boolean
  hasApplied?: boolean
}

const JOBS: MarketingJob[] = [
  { id: 1, title: 'Senior React Developer', company: 'Leapfrog Technology', location: 'Kathmandu', type: 'Part-time', salary: 'NPR 80,000–1,20,000', tags: ['React', 'TypeScript', 'Node.js'], trust: 98, urgent: false, posted: '2 days ago' },
  { id: 2, title: 'Digital Marketing Manager', company: 'Daraz Nepal', location: 'Lalitpur', type: 'Part-time', salary: 'NPR 40,000–60,000', tags: ['SEO', 'Social Media', 'Analytics'], trust: 96, urgent: true, posted: '1 day ago' },
  { id: 3, title: 'UI/UX Designer', company: 'eSewa Fonepay', location: 'Kathmandu', type: 'Part-time', salary: 'NPR 60,000–90,000', tags: ['Figma', 'Prototyping', 'Research'], trust: 97, urgent: false, posted: '3 days ago' },
  { id: 4, title: 'Data Scientist', company: 'F1Soft Group', location: 'Remote', type: 'Part-time', salary: 'NPR 1,00,000–1,50,000', tags: ['Python', 'ML', 'TensorFlow'], trust: 95, urgent: true, posted: '5 hours ago' },
  { id: 5, title: 'Content Writer', company: 'Ncell', location: 'Remote', type: 'Part-time', salary: 'NPR 25,000–35,000', tags: ['Content', 'Nepali', 'SEO'], trust: 94, urgent: false, posted: '1 week ago' },
  { id: 6, title: 'DevOps Engineer', company: 'CloudFactory', location: 'Kathmandu', type: 'Part-time', salary: 'NPR 90,000–1,30,000', tags: ['AWS', 'Docker', 'Kubernetes'], trust: 98, urgent: false, posted: '4 days ago' },
  { id: 7, title: 'Product Manager', company: 'Verisk Nepal', location: 'Kathmandu', type: 'Part-time', salary: 'NPR 1,20,000–1,80,000', tags: ['Product', 'Agile', 'Roadmap'], trust: 96, urgent: false, posted: '2 days ago' },
  { id: 8, title: 'Android Developer', company: 'WorldLink', location: 'Bhaktapur', type: 'Part-time', salary: 'NPR 70,000–1,00,000', tags: ['Android', 'Kotlin', 'Java'], trust: 94, urgent: true, posted: '6 hours ago' },
  { id: 9, title: 'Accountant', company: 'NMB Bank', location: 'Pokhara', type: 'Part-time', salary: 'NPR 30,000–45,000', tags: ['Accounting', 'Tally', 'Finance'], trust: 97, urgent: false, posted: '3 days ago' },
]

function mapApiJob(job: ApiJob): MarketingJob {
  const amount = (value: string | null) => value ? Number(value).toLocaleString('en-IN', { maximumFractionDigits: 0 }) : ''
  const minimum = amount(job.salary_min)
  const maximum = amount(job.salary_max)
  const salary = minimum && maximum ? `NPR ${minimum}–${maximum}` : minimum || maximum ? `NPR ${minimum || maximum}` : 'Negotiable'
  const typeLabels: Record<ApiJob['employment_type'], string> = {
    'part-time': 'Part-time',
    freelance: 'Freelance',
    gig: 'Gig',
    service: 'Service',
  }
  return {
    id: job.id,
    title: job.title,
    company: job.employer_details.name,
    location: job.location,
    type: typeLabels[job.employment_type],
    salary,
    tags: job.skills,
    trust: job.employer_details.trust_score,
    urgent: job.is_urgent,
    posted: new Date(job.created_at).toLocaleDateString(),
    description: job.description,
    positions: job.positions,
    applicationCount: job.application_count,
    expiresAt: job.expires_at,
    schedule: job.schedule,
    shiftType: job.shift_type,
    matchPercentage: job.match_percentage,
    saved: job.is_saved,
    hasApplied: job.has_applied,
  }
}

const SHIFT_RANGES: Record<string, [string, string] | null> = {
  morning: ['08:00', '12:00'],
  day: ['09:00', '17:00'],
  afternoon: ['12:00', '17:00'],
  evening: ['17:00', '21:00'],
  night: ['21:00', '23:59'],
  weekend: ['09:00', '17:00'],
  full: ['08:00', '17:00'],
  flexible: null,
}

function formatClock(value: string) {
  const [hours, minutes] = value.split(':').map(Number)
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return value
  return new Date(2000, 0, 1, hours, minutes).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function getJobTimeRanges(job: MarketingJob): Array<[string, string]> {
  const schedule = job.schedule || {}
  if (schedule.start && schedule.end) return [[schedule.start, schedule.end]]
  const ranges = Object.values(schedule).flatMap(value => {
    if (SHIFT_RANGES[value]) return [SHIFT_RANGES[value] as [string, string]]
    const match = value.match(/^(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})$/)
    return match ? [[match[1], match[2]] as [string, string]] : []
  })
  if (ranges.length) return ranges
  const fallback = job.shiftType ? SHIFT_RANGES[job.shiftType] : null
  return fallback ? [fallback] : []
}

function getJobScheduleLabel(job: MarketingJob) {
  const range = getJobTimeRanges(job)[0]
  if (range) return `${formatClock(range[0])} – ${formatClock(range[1])}`
  return job.shiftType ? `${job.shiftType[0].toUpperCase()}${job.shiftType.slice(1)} schedule` : 'Flexible schedule'
}

function postedAgo(posted: string) {
  if (/ago$/i.test(posted)) return posted
  const timestamp = new Date(posted).getTime()
  if (!Number.isFinite(timestamp)) return posted
  const hours = Math.max(1, Math.floor((Date.now() - timestamp) / 3600000))
  if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`
  const days = Math.floor(hours / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(':').map(Number)
  return hours * 60 + minutes
}

function matchesAvailability(job: MarketingJob, start: string, end: string) {
  if (!start || !end) return true
  const wantedStart = timeToMinutes(start)
  const wantedEnd = timeToMinutes(end)
  if (wantedEnd <= wantedStart) return true
  if (job.shiftType === 'flexible') return true
  const ranges = getJobTimeRanges(job)
  if (!ranges.length) return true
  return ranges.some(([jobStart, jobEnd]) => timeToMinutes(jobStart) <= wantedStart && timeToMinutes(jobEnd) >= wantedEnd)
}

const FREELANCERS = [
  { id: 1, name: 'Aarav Sharma', title: 'Full-Stack Developer', rating: 4.9, reviews: 127, rate: 'NPR 2,500/hr', skills: ['React', 'Python', 'AWS'], initials: 'AS', trust: 96, jobs: 203, color: '#2563EB', level: 4 },
  { id: 2, name: 'Priya Thapa', title: 'Brand & UI Designer', rating: 4.8, reviews: 89, rate: 'NPR 2,000/hr', skills: ['Figma', 'Branding', 'Illustration'], initials: 'PT', trust: 94, jobs: 156, color: '#7C3AED', level: 4 },
  { id: 3, name: 'Rohan Adhikari', title: 'SEO & Growth Specialist', rating: 4.7, reviews: 203, rate: 'NPR 1,500/hr', skills: ['SEO', 'Google Ads', 'Analytics'], initials: 'RA', trust: 91, jobs: 312, color: '#059669', level: 3 },
  { id: 4, name: 'Sita Gurung', title: 'Video Editor & Animator', rating: 4.9, reviews: 64, rate: 'NPR 3,000/hr', skills: ['Premiere Pro', 'After Effects', 'DaVinci'], initials: 'SG', trust: 98, jobs: 89, color: '#DC2626', level: 4 },
  { id: 5, name: 'Dipesh Maharjan', title: 'Mobile App Developer', rating: 4.8, reviews: 112, rate: 'NPR 2,200/hr', skills: ['Flutter', 'React Native', 'iOS'], initials: 'DM', trust: 93, jobs: 178, color: '#D97706', level: 3 },
  { id: 6, name: 'Sunita Rai', title: 'Content & Copywriter', rating: 4.6, reviews: 231, rate: 'NPR 1,200/hr', skills: ['Content', 'Copywriting', 'Nepali'], initials: 'SR', trust: 89, jobs: 387, color: '#0891B2', level: 3 },
]

const GIGS = [
  { id: 1, title: 'Food Delivery Rider', category: 'Delivery', pay: 'NPR 800–1,200/day', location: 'Kathmandu Valley', duration: 'Flexible hours', icon: '🛵', available: 23, urgent: true },
  { id: 2, title: 'Private Tutor – Maths', category: 'Education', pay: 'NPR 500–800/hr', location: 'Lalitpur', duration: '2 hrs/session', icon: '📚', available: 8, urgent: false },
  { id: 3, title: 'Event Photographer', category: 'Creative', pay: 'NPR 8,000–15,000/event', location: 'Kathmandu', duration: 'Per event', icon: '📸', available: 5, urgent: false },
  { id: 4, title: 'Home Cleaning', category: 'Services', pay: 'NPR 600–900/hr', location: 'Bhaktapur', duration: '3 hrs', icon: '🏠', available: 15, urgent: true },
  { id: 5, title: 'Grocery Delivery', category: 'Delivery', pay: 'NPR 400–600/trip', location: 'Pokhara', duration: '1–2 hrs', icon: '🛒', available: 11, urgent: false },
  { id: 6, title: 'IT Support Technician', category: 'Tech', pay: 'NPR 1,000–1,500/hr', location: 'Kathmandu', duration: 'As needed', icon: '💻', available: 7, urgent: false },
  { id: 7, title: 'Plumbing Service', category: 'Services', pay: 'NPR 500–800/hr', location: 'Kathmandu', duration: 'As needed', icon: '🔧', available: 9, urgent: true },
  { id: 8, title: 'Language Translator', category: 'Professional', pay: 'NPR 800–1,200/hr', location: 'Remote', duration: 'Flexible', icon: '🌐', available: 4, urgent: false },
]

const SERVICES = [
  { id: 1, title: 'Complete Website Development', provider: 'TechNova Studio', rating: 4.9, reviews: 87, price: 'From NPR 25,000', delivery: '7 days', category: 'Web Dev', tags: ['React', 'Next.js'] },
  { id: 2, title: 'Logo & Brand Identity', provider: 'Creative Minds Nepal', rating: 4.8, reviews: 134, price: 'From NPR 8,000', delivery: '3 days', category: 'Design', tags: ['Logo', 'Branding'] },
  { id: 3, title: 'Social Media Management', provider: 'Digital Growth Co.', rating: 4.7, reviews: 209, price: 'From NPR 15,000/mo', delivery: 'Ongoing', category: 'Marketing', tags: ['Instagram', 'Facebook'] },
  { id: 4, title: 'Mobile App Development', provider: 'AppCraft Nepal', rating: 4.9, reviews: 56, price: 'From NPR 80,000', delivery: '30 days', category: 'Mobile', tags: ['Flutter', 'React Native'] },
  { id: 5, title: 'SEO Optimization', provider: 'RankUp Digital', rating: 4.8, reviews: 178, price: 'From NPR 12,000/mo', delivery: 'Ongoing', category: 'Marketing', tags: ['SEO', 'Analytics'] },
  { id: 6, title: 'Video Production & Editing', provider: 'FrameWorks Studio', rating: 4.7, reviews: 92, price: 'From NPR 20,000', delivery: '5 days', category: 'Creative', tags: ['4K Video', 'Editing'] },
]

type MarketplaceSelection =
  | { kind: 'freelancer'; item: typeof FREELANCERS[number] }
  | { kind: 'gig'; item: typeof GIGS[number] }
  | { kind: 'service'; item: typeof SERVICES[number] }

function listingFromUrl(): MarketplaceSelection {
  const params = new URLSearchParams(window.location.search)
  const id = Number(params.get('listing'))
  const kind = params.get('kind')
  if (kind === 'gig') return { kind, item: GIGS.find(item => item.id === id) || GIGS[0] }
  if (kind === 'service') return { kind, item: SERVICES.find(item => item.id === id) || SERVICES[0] }
  return { kind: 'freelancer', item: FREELANCERS.find(item => item.id === id) || FREELANCERS[0] }
}

const COMPANIES = [
  { name: 'Leapfrog Technology', industry: 'Software', employees: '200+', openRoles: 12, trust: 98, tier: 'Platinum' },
  { name: 'eSewa Fonepay', industry: 'Fintech', employees: '500+', openRoles: 8, trust: 97, tier: 'Gold' },
  { name: 'Daraz Nepal', industry: 'E-commerce', employees: '1,000+', openRoles: 25, trust: 96, tier: 'Gold' },
  { name: 'Ncell', industry: 'Telecom', employees: '2,000+', openRoles: 6, trust: 99, tier: 'Platinum' },
  { name: 'CloudFactory', industry: 'AI / Data', employees: '1,500+', openRoles: 18, trust: 95, tier: 'Gold' },
  { name: 'F1Soft Group', industry: 'Fintech', employees: '300+', openRoles: 10, trust: 97, tier: 'Gold' },
  { name: 'Verisk Nepal', industry: 'Analytics', employees: '400+', openRoles: 7, trust: 96, tier: 'Silver' },
  { name: 'WorldLink', industry: 'ISP / Tech', employees: '600+', openRoles: 15, trust: 94, tier: 'Gold' },
]

const TESTIMONIALS = [
  { name: 'Bikash Rana', role: 'Software Engineer', company: 'Leapfrog Technology', text: "KaamVerse's AI matched me with my dream job in just 3 days. The Trust Score gave me confidence I was applying to a legitimate company. Best employment platform in Nepal!", rating: 5, initials: 'BR', color: '#2563EB' },
  { name: 'Anita Maharjan', role: 'Freelance Designer', company: 'Independent', text: "The verification eliminated fake clients entirely. I have earned over NPR 5 lakhs through KaamVerse in 6 months. The secure payment escrow is a game changer.", rating: 5, initials: 'AM', color: '#7C3AED' },
  { name: 'Suresh Pandey', role: 'HR Manager', company: 'Daraz Nepal', text: "We have hired 15 verified professionals through KaamVerse. The AI fraud detection saved us from 3 fake applications. Highly recommended for Nepali businesses.", rating: 5, initials: 'SP', color: '#059669' },
  { name: 'Kabita Shrestha', role: 'Gig Worker', company: 'Self-employed', text: "Finding part-time work was incredibly easy. The AI recommended gigs matching my schedule perfectly. I now earn NPR 35,000 extra per month!", rating: 5, initials: 'KS', color: '#DC2626' },
  { name: 'Dipesh Maharjan', role: 'Startup Founder', company: 'NepTech Solutions', text: "Posted our first job and received 47 verified applicants within 24 hours. Every candidate was background-checked. The quality is incredible.", rating: 5, initials: 'DM', color: '#0891B2' },
  { name: 'Sunita Rai', role: 'Service Provider', company: 'CreativeHub Nepal', text: "My graphic design business grew 300% after listing on KaamVerse. The platform credibility brings serious clients who always pay on time.", rating: 5, initials: 'SR', color: '#D97706' },
]

const FAQS = [
  { q: 'What is KaamVerse?', a: "KaamVerse is Nepal's first AI-powered employment ecosystem combining part-time jobs, freelance projects, on-demand gigs, and a services marketplace with advanced AI verification and fraud detection." },
  { q: 'How does the Trust Score work?', a: 'Our AI analyzes identity verification, work history, client reviews, payment behavior, and professional credentials to generate a Trust Score from 0–100 for every user and company on the platform.' },
  { q: 'How do I get verified?', a: 'Complete our multi-level verification: Email (Level 1), Phone and NID (Level 2), Professional credentials (Level 3), and Video interview (Level 4). Higher verification unlocks more opportunities and better rates.' },
  { q: 'Is KaamVerse free to use?', a: 'Job seekers can browse for free. We charge a small success fee (5–8%) only when you earn through the platform. Employers have flexible monthly subscription plans starting from NPR 2,999.' },
  { q: 'How does AI job matching work?', a: 'Our AI analyzes your skills, experience, preferences, location, and behavioral patterns to recommend the most relevant opportunities. It continuously learns and improves with each interaction.' },
  { q: 'Are payments secure?', a: 'All payments use our escrow system. Funds are held securely and released only when both parties confirm job completion. We support eSewa, Khalti, IME Pay, and bank transfers.' },
  { q: 'How does fraud detection work?', a: 'Our multi-layered AI fraud detection analyzes posting patterns, behavioral signals, document authenticity, and communication patterns to flag and block fraudulent listings in real time.' },
  { q: 'Can international clients hire from KaamVerse?', a: 'Yes! International clients can hire Nepali freelancers through KaamVerse. We support international payment methods and facilitate USD/EUR billing with NPR disbursement.' },
]

// ─── Utility Components ───────────────────────────────────────────────────────

function Stars({ n }: { n: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} className={`w-3.5 h-3.5 ${i < n ? 'text-amber-400' : 'text-slate-200 dark:text-slate-700'}`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  )
}

function TrustBadge({ score }: { score: number }) {
  const color = score >= 90 ? '#22C55E' : score >= 75 ? '#F59E0B' : '#EF4444'
  return (
    <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: color + '1a', color }}>
      <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: color }} />
      {score}
    </span>
  )
}

function VerifiedBadge({ level }: { level: number }) {
  const levels = [
    { label: 'Basic', color: '#64748B', bg: '#F1F5F9' },
    { label: 'Verified', color: '#2563EB', bg: '#EFF6FF' },
    { label: 'Pro', color: '#7C3AED', bg: '#F5F3FF' },
    { label: 'Elite', color: '#D97706', bg: '#FFFBEB' },
  ]
  const l = levels[Math.min(level - 1, 3)]
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full" style={{ color: l.color, backgroundColor: l.bg }}>
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
      Level {level} {l.label}
    </span>
  )
}

function SectionHead({ tag, title, sub, center = true }: { tag: string; title: string; sub: string; center?: boolean }) {
  return (
    <div className={`${center ? 'text-center max-w-2xl mx-auto' : 'max-w-xl'} mb-14`}>
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 mb-4 tracking-wide uppercase">{tag}</span>
      <h2 className="font-heading text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white leading-tight mb-4">{title}</h2>
      <p className="text-slate-500 dark:text-slate-400 text-lg leading-relaxed">{sub}</p>
    </div>
  )
}

function JobCard({ job, navigate, onApply, onSeeMore, onSave }: {
  job: MarketingJob
  navigate: (p: Page) => void
  onApply?: (job: MarketingJob) => void
  onSeeMore?: (job: MarketingJob) => void
  onSave?: (job: MarketingJob) => Promise<boolean>
}) {
  const [saved, setSaved] = useState(Boolean(job.saved))
  const initials = job.company.split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase()
  const logoColors = ['bg-sky-500', 'bg-blue-600', 'bg-orange-500', 'bg-violet-600', 'bg-emerald-600']
  const match = job.matchPercentage ?? job.trust
  const save = async () => {
    if (!onSave) return
    setSaved(await onSave(job))
  }
  return (
    <article className="bg-white dark:bg-slate-900 rounded-[22px] border border-blue-200 dark:border-blue-900 p-6 hover:shadow-lg hover:shadow-blue-100/70 dark:hover:shadow-none transition-all duration-200 flex flex-col min-h-[355px]">
      <div className="flex items-start gap-3">
        <div className={`w-14 h-14 rounded-[18px] ${logoColors[job.id % logoColors.length]} flex items-center justify-center font-heading font-extrabold text-white text-base shrink-0`}>
          {initials}
        </div>
        <div className="min-w-0 flex-1 pt-1">
          <h3 className="font-heading font-bold text-slate-950 dark:text-white text-base leading-tight">{job.title}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 truncate">{job.company} <span className="text-blue-500">✓</span></p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950 text-violet-700 dark:text-violet-300 text-xs font-extrabold">✣ {Math.round(match)}%</span>
          {onSave && <button onClick={save} aria-label={saved ? 'Remove saved job' : 'Save job'} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${saved ? 'text-blue-600 bg-blue-50 dark:bg-blue-950' : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950'}`}>{saved ? '★' : '♡'}</button>}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mt-5">
        <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold">{job.type}</span>
        {job.urgent && <span className="px-3 py-1 rounded-full border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 text-xs font-semibold">🔥 Urgent</span>}
        <span className="px-3 py-1 rounded-full border border-sky-200 dark:border-sky-900 bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 text-xs font-semibold">✓ Verified</span>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-3 mt-5 text-sm text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-2 min-w-0"><span className="text-slate-400">⌖</span><span className="truncate">{job.location}</span></span>
        <span className="flex items-center gap-2"><span className="text-slate-400">$</span><span>{job.salary}</span></span>
        <span className="flex items-center gap-2"><span className="text-slate-400">◷</span><span>{getJobScheduleLabel(job)}</span></span>
        <span className="flex items-center gap-2"><span className="text-slate-400">♧</span><span>{job.applicationCount ?? 0} {(job.applicationCount ?? 0) === 1 ? 'applicant' : 'applicants'}</span></span>
      </div>

      <div className="flex flex-wrap gap-2 mt-5">
        {job.tags.slice(0, 4).map(tag => <span key={tag} className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs">{tag}</span>)}
      </div>

      <div className="mt-auto pt-5 border-t border-slate-100 dark:border-slate-800 flex items-center gap-3">
        <span className="text-sm text-slate-400 mr-auto">{postedAgo(job.posted)}</span>
        {onApply && onSeeMore && (
          <>
            <button onClick={() => onSeeMore(job)} className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white hover:border-blue-300 text-sm font-semibold transition-colors">View</button>
            <button disabled={job.hasApplied} onClick={() => onApply(job)} className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-emerald-600 disabled:cursor-default text-white text-sm font-bold shadow-md shadow-blue-200 dark:shadow-none transition-colors">{job.hasApplied ? 'Applied' : 'Apply Now'}</button>
          </>
        )}
      </div>
    </article>
  )
}

function LegacyFreelancerCard({ f, navigate }: { f: typeof FREELANCERS[0]; navigate: (p: Page) => void }) {
  return (
    <div
      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
      onClick={() => navigate('freelance')}
    >
      <div className="flex items-start gap-3 mb-4">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-heading font-bold text-white text-sm shrink-0" style={{ background: `linear-gradient(135deg, ${f.color}, ${f.color}bb)` }}>
          {f.initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <h3 className="font-heading font-semibold text-slate-900 dark:text-white text-sm">{f.name}</h3>
            <VerifiedBadge level={f.level} />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">{f.title}</p>
        </div>
        <TrustBadge score={f.trust} />
      </div>
      <div className="flex flex-wrap gap-1.5 mb-4">
        {f.skills.map(s => (
          <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">{s}</span>
        ))}
      </div>
      <div className="flex items-center gap-2 mb-4">
        <Stars n={Math.floor(f.rating)} />
        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{f.rating}</span>
        <span className="text-xs text-slate-400">({f.reviews} reviews)</span>
        <span className="ml-auto text-xs text-slate-400">{f.jobs} jobs</span>
      </div>
      <div className="flex items-center justify-between pt-3 border-t border-slate-50 dark:border-slate-800">
        <span className="text-sm font-bold text-slate-900 dark:text-white">{f.rate}</span>
        <button className="text-xs font-semibold px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors" onClick={e => { e.stopPropagation(); navigate('freelance') }}>
          Hire Now
        </button>
      </div>
    </div>
  )
}

function LegacyGigCard({ gig, navigate }: { gig: typeof GIGS[0]; navigate: (p: Page) => void }) {
  return (
    <div
      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
      onClick={() => navigate('gigs')}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-11 h-11 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-2xl">{gig.icon}</div>
        <div className="flex items-center gap-2">
          {gig.urgent && <span className="text-xs px-2 py-0.5 rounded-full bg-orange-50 dark:bg-orange-950 text-orange-600 dark:text-orange-400 font-semibold">Hot</span>}
          <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400 font-semibold">{gig.available} spots</span>
        </div>
      </div>
      <h3 className="font-heading font-semibold text-slate-900 dark:text-white text-sm mb-1">{gig.title}</h3>
      <span className="text-xs text-indigo-500 dark:text-indigo-400 font-medium mb-3 block">{gig.category}</span>
      <div className="space-y-1.5 text-xs text-slate-400 mb-3">
        <div>📍 {gig.location}</div>
        <div>🕐 {gig.duration}</div>
      </div>
      <div className="pt-3 border-t border-slate-50 dark:border-slate-800">
        <span className="text-sm font-bold text-slate-900 dark:text-white">{gig.pay}</span>
      </div>
    </div>
  )
}

function LegacyServiceCard({ svc, navigate }: { svc: typeof SERVICES[0]; navigate: (p: Page) => void }) {
  return (
    <div
      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
      onClick={() => navigate('services')}
    >
      <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-semibold mb-3">{svc.category}</span>
      <h3 className="font-heading font-semibold text-slate-900 dark:text-white text-sm mb-1">{svc.title}</h3>
      <p className="text-xs text-slate-400 mb-3">by {svc.provider}</p>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {svc.tags.map(t => (
          <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">{t}</span>
        ))}
      </div>
      <div className="flex items-center gap-2 mb-4">
        <Stars n={Math.floor(svc.rating)} />
        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{svc.rating}</span>
        <span className="text-xs text-slate-400">({svc.reviews})</span>
      </div>
      <div className="flex items-center justify-between pt-3 border-t border-slate-50 dark:border-slate-800">
        <div>
          <div className="text-xs text-slate-400 mb-0.5">Delivery: {svc.delivery}</div>
          <div className="text-sm font-bold text-slate-900 dark:text-white">{svc.price}</div>
        </div>
        <button className="text-xs font-semibold px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors" onClick={e => { e.stopPropagation(); navigate('services') }}>
          Order
        </button>
      </div>
    </div>
  )
}

function LegacyCompanyCard({ c, navigate }: { c: typeof COMPANIES[0]; navigate: (p: Page) => void }) {
  const tierColor: Record<string, string> = { Platinum: '#6B7280', Gold: '#D97706', Silver: '#94A3B8' }
  const initials = c.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2)
  return (
    <div
      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
      onClick={() => navigate('company-details')}
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center font-heading font-bold text-slate-600 dark:text-slate-300 shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-heading font-semibold text-slate-900 dark:text-white text-sm leading-tight">{c.name}</h3>
          <p className="text-xs text-slate-400">{c.industry}</p>
        </div>
        <TrustBadge score={c.trust} />
      </div>
      <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
        <span>👥 {c.employees} employees</span>
        <span className="font-semibold" style={{ color: tierColor[c.tier] }}>{c.tier}</span>
      </div>
      <div className="pt-3 border-t border-slate-50 dark:border-slate-800">
        <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">{c.openRoles} open positions →</span>
      </div>
    </div>
  )
}

function ExploreQuickView({ icon, title, subtitle, facts, tags, primaryLabel, onPrimary, onClose }: { icon: ReactNode; title: string; subtitle: string; facts: Array<[string, string]>; tags: string[]; primaryLabel: string; onPrimary: () => void; onClose: () => void }) {
  return <div className="fixed inset-0 z-[100] flex items-center justify-center p-4"><button onClick={onClose} aria-label="Close details" className="absolute inset-0 w-full h-full bg-slate-950/55 backdrop-blur-sm"/><section className="relative w-full max-w-lg rounded-[24px] bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-900 shadow-2xl p-6"><div className="flex items-start gap-4"><div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-xl font-bold shrink-0">{icon}</div><div className="flex-1 min-w-0"><h2 className="font-heading text-xl font-extrabold text-slate-950 dark:text-white">{title}</h2><p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{subtitle}</p></div><button onClick={onClose} aria-label="Close" className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-400">✕</button></div><div className="grid sm:grid-cols-2 gap-3 mt-6">{facts.map(([label, value]) => <div key={label} className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3"><p className="text-xs text-slate-400">{label}</p><p className="text-sm font-bold text-slate-900 dark:text-white mt-1">{value}</p></div>)}</div><div className="flex flex-wrap gap-2 mt-5">{tags.map(tag => <span key={tag} className="px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs font-semibold">{tag}</span>)}</div><div className="flex gap-3 mt-7"><button onClick={onClose} className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold">Close</button><button onClick={onPrimary} className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold">{primaryLabel}</button></div></section></div>
}

function FreelancerCard({ f, onPrimary, onView }: { f: typeof FREELANCERS[0]; onPrimary: () => void; onView: () => void }) {
  return <article className="bg-white dark:bg-slate-900 rounded-[22px] border border-blue-200 dark:border-blue-900 p-6 hover:shadow-lg hover:shadow-blue-100/70 dark:hover:shadow-none transition-all flex flex-col min-h-[330px]"><div className="flex items-start gap-3"><div className="w-14 h-14 rounded-[18px] flex items-center justify-center font-bold text-white shrink-0" style={{ background: f.color }}>{f.initials}</div><div className="flex-1 min-w-0"><h3 className="font-heading font-bold text-slate-950 dark:text-white">{f.name}</h3><p className="text-sm text-slate-500 mt-1">{f.title} <span className="text-blue-500">✓</span></p></div><span className="px-3 py-1.5 rounded-full border border-violet-200 bg-violet-50 text-violet-700 text-xs font-extrabold">✣ {f.trust}%</span></div><div className="flex gap-2 mt-5"><span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-semibold">Freelancer</span><span className="px-3 py-1 rounded-full border border-sky-200 bg-sky-50 text-sky-700 text-xs font-semibold">✓ Verified</span></div><div className="grid grid-cols-2 gap-3 mt-5 text-sm text-slate-500"><span>★ {f.rating} rating</span><span>☷ {f.reviews} reviews</span><span>✓ {f.jobs} jobs</span><span className="font-bold text-slate-900 dark:text-white">{f.rate}</span></div><div className="flex flex-wrap gap-2 mt-5">{f.skills.map(skill => <span key={skill} className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs">{skill}</span>)}</div><div className="mt-auto pt-5 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3"><button onClick={onView} className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold">View</button><button onClick={onPrimary} className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold">Hire Now</button></div></article>
}

function GigCard({ gig, onPrimary, onView }: { gig: typeof GIGS[0]; onPrimary: () => void; onView: () => void }) {
  return <article className="bg-white dark:bg-slate-900 rounded-[22px] border border-blue-200 dark:border-blue-900 p-6 hover:shadow-lg hover:shadow-blue-100/70 dark:hover:shadow-none transition-all flex flex-col min-h-[330px]"><div className="flex items-start gap-3"><div className="w-14 h-14 rounded-[18px] bg-amber-500 flex items-center justify-center text-2xl shrink-0">{gig.icon}</div><div className="flex-1"><h3 className="font-heading font-bold text-slate-950 dark:text-white">{gig.title}</h3><p className="text-sm text-slate-500 mt-1">{gig.category} <span className="text-blue-500">✓</span></p></div><span className="px-3 py-1.5 rounded-full border border-violet-200 bg-violet-50 text-violet-700 text-xs font-extrabold">✣ {90 + gig.id}%</span></div><div className="flex flex-wrap gap-2 mt-5"><span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-semibold">On-Demand</span>{gig.urgent && <span className="px-3 py-1 rounded-full border border-red-200 bg-red-50 text-red-600 text-xs font-semibold">🔥 Urgent</span>}<span className="px-3 py-1 rounded-full border border-sky-200 bg-sky-50 text-sky-700 text-xs font-semibold">✓ Verified</span></div><div className="grid grid-cols-2 gap-3 mt-5 text-sm text-slate-500"><span>⌖ {gig.location}</span><span className="font-bold text-slate-900 dark:text-white">{gig.pay}</span><span>◷ {gig.duration}</span><span>♧ {gig.available} spots</span></div><div className="mt-auto pt-5 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3"><button onClick={onView} className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold">View</button><button onClick={onPrimary} className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold">Apply Now</button></div></article>
}

function ServiceCard({ svc, onPrimary, onView }: { svc: typeof SERVICES[0]; onPrimary: () => void; onView: () => void }) {
  const initials = svc.provider.split(/\s+/).map(word => word[0]).join('').slice(0,2)
  return <article className="bg-white dark:bg-slate-900 rounded-[22px] border border-blue-200 dark:border-blue-900 p-6 hover:shadow-lg hover:shadow-blue-100/70 dark:hover:shadow-none transition-all flex flex-col min-h-[330px]"><div className="flex items-start gap-3"><div className="w-14 h-14 rounded-[18px] bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0">{initials}</div><div className="flex-1 min-w-0"><h3 className="font-heading font-bold text-slate-950 dark:text-white">{svc.title}</h3><p className="text-sm text-slate-500 mt-1">{svc.provider} <span className="text-blue-500">✓</span></p></div><span className="px-3 py-1.5 rounded-full border border-violet-200 bg-violet-50 text-violet-700 text-xs font-extrabold">★ {svc.rating}</span></div><div className="flex gap-2 mt-5"><span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-semibold">{svc.category}</span><span className="px-3 py-1 rounded-full border border-sky-200 bg-sky-50 text-sky-700 text-xs font-semibold">✓ Verified</span></div><div className="grid grid-cols-2 gap-3 mt-5 text-sm text-slate-500"><span>◷ {svc.delivery}</span><span>☷ {svc.reviews} reviews</span><span className="col-span-2 font-bold text-slate-900 dark:text-white">{svc.price}</span></div><div className="flex flex-wrap gap-2 mt-5">{svc.tags.map(tag => <span key={tag} className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs">{tag}</span>)}</div><div className="mt-auto pt-5 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3"><button onClick={onView} className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold">View</button><button onClick={onPrimary} className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold">Order Now</button></div></article>
}

function CompanyCard({ c, navigate }: { c: typeof COMPANIES[0]; navigate: (p: Page) => void }) {
  const initials = c.name.split(' ').map((word: string) => word[0]).join('').slice(0,2)
  return <article className="bg-white dark:bg-slate-900 rounded-[22px] border border-blue-200 dark:border-blue-900 p-6 hover:shadow-lg hover:shadow-blue-100/70 dark:hover:shadow-none transition-all flex flex-col min-h-[300px]"><div className="flex items-start gap-3"><div className="w-14 h-14 rounded-[18px] bg-indigo-600 text-white flex items-center justify-center font-bold shrink-0">{initials}</div><div className="flex-1"><h3 className="font-heading font-bold text-slate-950 dark:text-white">{c.name}</h3><p className="text-sm text-slate-500 mt-1">{c.industry} <span className="text-blue-500">✓</span></p></div><span className="px-3 py-1.5 rounded-full border border-violet-200 bg-violet-50 text-violet-700 text-xs font-extrabold">✣ {c.trust}%</span></div><div className="flex gap-2 mt-5"><span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-semibold">{c.tier}</span><span className="px-3 py-1 rounded-full border border-sky-200 bg-sky-50 text-sky-700 text-xs font-semibold">✓ Verified</span></div><div className="grid grid-cols-2 gap-3 mt-5 text-sm text-slate-500"><span>♧ {c.employees} employees</span><span>☷ {c.openRoles} open roles</span><span>⌖ Nepal</span><span>◉ Actively hiring</span></div><div className="mt-auto pt-5 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3"><button onClick={() => navigate('company-details')} className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold">View</button><button onClick={() => navigate('jobs')} className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold">View Jobs</button></div></article>
}

// ─── Navbar ───────────────────────────────────────────────────────────────────

function Navbar({ navigate, current, dark, setDark, lang, setLang, onLogin, onRegister, isAuth, userRole, onLogout, onSearch }: {
  navigate: (p: Page) => void
  current: Page
  dark: boolean
  setDark: (v: boolean) => void
  lang: 'en' | 'np'
  setLang: (v: 'en' | 'np') => void
  onLogin: () => void
  onRegister: () => void
  isAuth?: boolean
  userRole?: 'seeker' | 'employer' | 'employer-individual' | 'admin' | null
  onLogout?: () => void
  onSearch?: (query: string) => void
}) {
  const [exploreOpen, setExploreOpen] = useState(false)
  const [featuresOpen, setFeaturesOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [headerUser, setHeaderUser] = useState<ApiUser | null>(null)
  const [headerSearch, setHeaderSearch] = useState('')
  const dropRef = useRef<HTMLDivElement>(null)
  const featRef = useRef<HTMLDivElement>(null)

  const submitHeaderSearch = () => {
    const query = headerSearch.trim()
    onSearch?.(query)
    setMobileOpen(false)
  }

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setExploreOpen(false)
      if (featRef.current && !featRef.current.contains(e.target as Node)) setFeaturesOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (!isAuth) {
      setHeaderUser(null)
      return
    }
    api.auth.me().then(setHeaderUser).catch(() => setHeaderUser(null))
  }, [isAuth])

  const headerName = headerUser
    ? (headerUser.role === 'employer' || headerUser.role === 'employer-individual'
      ? headerUser.employer_profile?.business_name || `${headerUser.first_name} ${headerUser.last_name}`.trim() || headerUser.email.split('@')[0]
      : `${headerUser.first_name} ${headerUser.last_name}`.trim() || headerUser.email.split('@')[0])
    : userRole === 'admin' ? 'Administrator' : userRole === 'seeker' ? 'Yugina' : 'Employer'
  const headerInitials = headerName.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase()

  const navBtn = (label: string, page: Page) => (
    <button
      key={page}
      onClick={() => { navigate(page); setMobileOpen(false) }}
      className={`text-sm font-medium transition-colors ${current === page ? 'text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400'}`}
    >
      {label}
    </button>
  )

  const exploreLinks: Array<[string, string, string, Page]> = [
    ['🏆', 'Featured Jobs', 'Verified part-time opportunities', 'jobs'],
    ['💻', 'Freelance Projects', 'Flexible project-based work', 'freelance'],
    ['⚡', 'On-Demand Gigs', 'Quick work with exact schedules', 'gigs'],
    ['🛠', 'Services Marketplace', 'Hire trusted professionals', 'services-marketplace'],
    ['🔍', 'Browse Services', 'Discover verified services', 'services'],
    ['🏢', 'Companies', 'Explore verified employers', 'companies'],
  ]

  const featuresLinks: Array<[string, string, Page]> = [
    ['✨', 'All Features', 'features'],
    ['🤖', 'AI Features', 'ai-features'],
    ['🛡️', 'Trust & Safety', 'trust-safety'],
  ]

  return (
    <nav className="sticky top-0 z-50 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <button onClick={() => navigate('home')} className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-sm">
              <span className="text-white font-heading font-bold text-sm">K</span>
            </div>
            <span className="font-heading font-bold text-slate-900 dark:text-white">KaamVerse</span>
          </button>

          {isAuth ? (
            <form
              onSubmit={e => { e.preventDefault(); submitHeaderSearch() }}
              className="hidden md:flex flex-1 max-w-xl mx-6"
            >
              <label className="relative block w-full">
                <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
                <input
                  value={headerSearch}
                  onChange={e => setHeaderSearch(e.target.value)}
                  placeholder="Search jobs, gigs, freelance, services..."
                  className="w-full pl-10 pr-24 py-2.5 text-sm rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none placeholder:text-slate-400 dark:text-white focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 focus:border-blue-300"
                />
                <button
                  type="submit"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Search
                </button>
              </label>
            </form>
          ) : (
            <div className="hidden md:flex items-center gap-7">
              {navBtn('Home', 'home')}
              {/* Explore dropdown */}
              <div className="relative" ref={dropRef}>
                <button
                  onClick={() => { setExploreOpen(v => !v); setFeaturesOpen(false) }}
                  className={`flex items-center gap-1 text-sm font-medium transition-colors ${exploreOpen ? 'text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400'}`}
                >
                  Explore
                  <svg className={`w-4 h-4 transition-transform duration-200 ${exploreOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {exploreOpen && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-80 bg-white dark:bg-slate-900 rounded-[22px] shadow-2xl border border-blue-100 dark:border-blue-900 p-2.5 z-50">
                    <div className="px-3 pt-2 pb-2"><p className="text-xs font-extrabold uppercase tracking-wider text-blue-600">Explore KaamVerse</p></div>
                    {exploreLinks.map(([icon, label, description, page], index) => (
                      <button
                        key={page + label}
                        onClick={() => { navigate(page); setExploreOpen(false) }}
                        className="w-full flex items-center gap-3 p-3 rounded-xl text-left hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors group"
                      >
                        <span className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${['bg-amber-50','bg-violet-50','bg-orange-50','bg-emerald-50','bg-sky-50','bg-indigo-50'][index]}`}>{icon}</span><span className="min-w-0"><span className="block text-sm font-bold text-slate-800 dark:text-slate-100 group-hover:text-blue-600">{label}</span><span className="block text-xs text-slate-400 mt-0.5">{description}</span></span><span className="ml-auto text-slate-300 group-hover:text-blue-500">›</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {navBtn('About', 'about')}
              {/* Features dropdown */}
              <div className="relative" ref={featRef}>
                <button
                  onClick={() => { setFeaturesOpen(v => !v); setExploreOpen(false) }}
                  className={`flex items-center gap-1 text-sm font-medium transition-colors ${featuresOpen || current === 'features' || current === 'ai-features' || current === 'trust-safety' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400'}`}
                >
                  Features
                  <svg className={`w-4 h-4 transition-transform duration-200 ${featuresOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {featuresOpen && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-52 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 py-2 z-50">
                    {featuresLinks.map(([icon, label, page]) => (
                      <button
                        key={page + label}
                        onClick={() => { navigate(page); setFeaturesOpen(false) }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      >
                        <span className="text-base">{icon}</span>{label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {navBtn('Contact', 'contact')}
            </div>
          )}

          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={() => setDark(!dark)}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {dark
                ? <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
                : <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
              }
            </button>
            <button
              onClick={() => setLang(lang === 'en' ? 'np' : 'en')}
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors"
              title={lang === 'en' ? 'Switch to Nepali' : 'Switch to English'}
              aria-label={lang === 'en' ? 'Switch language to Nepali' : 'Switch language to English'}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><circle cx="12" cy="12" r="9"/><path strokeLinecap="round" d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/></svg>
            </button>
            {isAuth ? (
              <div className="flex items-center gap-2">
                <button onClick={() => window.dispatchEvent(new Event('kaamverse:notifications-open'))} title="Open notifications" className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
                </button>
                <button onClick={() => navigate('dashboard')} className="flex items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" title="Open your profile workspace">
                  <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-[10px] shadow-sm">{headerInitials}</span>
                  <span className="w-20 truncate text-xs font-bold text-slate-700 dark:text-slate-200">{headerName}</span>
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={onLogin}
                  className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors px-2"
                >
                  Log in
                </button>
                <button
                  onClick={onRegister}
                  className="px-4 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors shadow-sm"
                >
                  Get Started
                </button>
              </>
            )}
          </div>

          <button className="md:hidden p-2 text-slate-600 dark:text-slate-400" onClick={() => setMobileOpen(v => !v)}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d={mobileOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} />
            </svg>
          </button>
        </div>

        {mobileOpen && (
          <div className="md:hidden py-4 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-3">
            {isAuth ? (
              <>
                <form onSubmit={e => { e.preventDefault(); submitHeaderSearch() }} className="flex gap-2">
                  <label className="relative block flex-1">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
                    <input
                      value={headerSearch}
                      onChange={e => setHeaderSearch(e.target.value)}
                      placeholder="Search jobs, gigs, services..."
                      className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none placeholder:text-slate-400 dark:text-white"
                    />
                  </label>
                  <button type="submit" className="px-4 py-2.5 text-sm font-semibold bg-blue-600 text-white rounded-xl">Search</button>
                </form>
                <button onClick={() => { navigate('dashboard'); setMobileOpen(false) }} className="w-full py-2.5 text-sm font-semibold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl">
                  Open profile
                </button>
              </>
            ) : (
              <>
                {[['Home', 'home'], ['About', 'about'], ['Features', 'features'], ['Jobs', 'jobs'], ['Freelance', 'freelance'], ['Gigs', 'gigs'], ['Companies', 'companies'], ['Contact', 'contact']].map(([label, page]) => (
                  <button key={page} onClick={() => { navigate(page as Page); setMobileOpen(false) }} className="text-left text-sm font-medium text-slate-700 dark:text-slate-300 py-1">{label}</button>
                ))}
                <div className="flex gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button onClick={() => { onLogin(); setMobileOpen(false) }} className="flex-1 py-2.5 text-sm font-semibold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl">Log in</button>
                  <button onClick={() => { onRegister(); setMobileOpen(false) }} className="flex-1 py-2.5 text-sm font-semibold bg-blue-600 text-white rounded-xl">Get Started</button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer({ navigate, verifiedCompanies }: { navigate: (p: Page) => void; verifiedCompanies: number }) {
  const col = (title: string, links: Array<[string, Page]>) => (
    <div>
      <h4 className="font-heading font-semibold text-white text-sm mb-5">{title}</h4>
      <ul className="space-y-3">
        {links.map(([label, page]) => (
          <li key={label}>
            <button onClick={() => navigate(page)} className="text-sm text-slate-400 hover:text-white transition-colors text-left">{label}</button>
          </li>
        ))}
      </ul>
    </div>
  )

  return (
    <footer className="bg-slate-950 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 pb-12 border-b border-slate-800">
          <div className="col-span-2 md:col-span-1">
            <button onClick={() => navigate('home')} className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
                <span className="text-white font-heading font-bold text-sm">K</span>
              </div>
              <span className="font-heading font-bold text-white">KaamVerse</span>
            </button>
            <p className="text-sm text-slate-400 leading-relaxed mb-5">Nepal's AI-Powered Trusted Employment Ecosystem</p>
            <div className="flex items-center gap-1.5 mb-5">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-slate-400">{verifiedCompanies} verified {verifiedCompanies === 1 ? 'company' : 'companies'}</span>
            </div>
          </div>
          {col('Platform', [['Find Jobs', 'jobs'], ['Freelance Projects', 'freelance'], ['On-Demand Gigs', 'gigs'], ['Services Marketplace', 'services-marketplace'], ['Browse Services', 'services']])}
          {col('Features', [['AI Features', 'ai-features'], ['Trust & Safety', 'trust-safety'], ['Employment Types', 'employment-types'], ['Verification', 'trust-safety'], ['Fraud Detection', 'ai-features']])}
          {col('Company', [['About Us', 'about'], ['All Features', 'features'], ['Companies', 'companies'], ['Testimonials', 'testimonials'], ['Contact', 'contact']])}
          {col('Support', [['Help Center', 'help'], ['FAQ', 'faq'], ['Privacy Policy', 'privacy'], ['Terms & Conditions', 'terms']])}
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8">
          <p className="text-xs text-slate-500">© {new Date().getFullYear()} KaamVerse Pvt. Ltd. All rights reserved. Made with ♥ in Nepal 🇳🇵</p>
          <div className="flex gap-5">
            <button onClick={() => navigate('privacy')} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">Privacy</button>
            <button onClick={() => navigate('terms')} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">Terms</button>
            <button onClick={() => navigate('help')} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">Help</button>
          </div>
        </div>
      </div>
    </footer>
  )
}

// ─── Home Page ────────────────────────────────────────────────────────────────

function HomePage({ navigate, jobs, onJobSearch, onSelectJob, onApply, onSave, onRequireLogin, onCreateAccount, onSelectListing }: {
  navigate: (p: Page) => void
  jobs: MarketingJob[]
  onJobSearch: (query: string, type: string, location: string) => void
  onSelectJob: (job: MarketingJob) => void
  onApply: (job: MarketingJob) => void
  onSave: (job: MarketingJob) => Promise<boolean>
  onRequireLogin: () => void
  onCreateAccount: () => void
  onSelectListing: (selection: MarketplaceSelection, backPage: Page) => void
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchType, setSearchType] = useState('jobs')
  const [searchLocation, setSearchLocation] = useState('')
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const handleSearch = () => {
    if (searchType === 'freelance') navigate('freelance')
    else if (searchType === 'gigs') navigate('gigs')
    else if (searchType === 'services') navigate('services')
    else onJobSearch(searchQuery, searchType, searchLocation)
  }

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 pt-20 pb-28">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-blue-100 dark:bg-blue-950 opacity-60 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-indigo-100 dark:bg-indigo-950 opacity-60 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-blue-50 dark:bg-blue-950 opacity-40 blur-3xl" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 dark:bg-blue-950 border border-blue-100 dark:border-blue-900 text-blue-700 dark:text-blue-400 text-sm font-semibold mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
              Nepal's #1 AI-Powered Employment Platform
              <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full font-bold">New</span>
            </div>
            <h1 className="font-heading text-5xl sm:text-6xl lg:text-7xl font-extrabold text-slate-900 dark:text-white leading-tight tracking-tight mb-6">
              Find Work.
              <span className="block bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Build Trust.
              </span>
              Grow Together.
            </h1>
            <p className="text-xl text-slate-500 dark:text-slate-400 leading-relaxed mb-10 max-w-2xl mx-auto">
              Part-time jobs, freelance projects, on-demand gigs, and services marketplace — all powered by AI and secured by Nepal's most trusted verification system.
            </p>

            {/* Four-category marketplace search */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl p-2.5 mb-8 max-w-3xl mx-auto">
              <div className="grid grid-cols-4 gap-1.5 p-1 rounded-xl bg-slate-50 dark:bg-slate-800/70">
                {([['jobs', '💼', 'Part-Time'], ['gigs', '⚡', 'Gigs'], ['freelance', '💻', 'Freelance'], ['services', '🛠', 'Services']] as const).map(([value, icon, label]) => (
                  <button key={value} onClick={() => setSearchType(value)} className={`px-2 py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all ${searchType === value ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-300 shadow-sm ring-1 ring-blue-100 dark:ring-blue-900' : 'text-slate-500 dark:text-slate-300 hover:text-blue-600'}`}><span className="mr-1 hidden sm:inline">{icon}</span>{label}</button>
                ))}
              </div>
              <div className="grid sm:grid-cols-[minmax(0,1fr)_10rem_auto] gap-2 mt-2">
                <label className="relative block">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
                  <input className="w-full pl-10 pr-4 py-3 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 outline-none placeholder:text-slate-400 dark:text-white focus:ring-2 focus:ring-blue-200" placeholder="Waiter, tutor, receptionist, cashier..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} />
                </label>
                <label className="relative block">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M12 21s6-4.35 6-11a6 6 0 1 0-12 0c0 6.65 6 11 6 11Z"/><circle cx="12" cy="10" r="2"/></svg>
                  <select value={searchLocation} onChange={e => setSearchLocation(e.target.value)} className="w-full appearance-none pl-9 pr-7 py-3 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 outline-none cursor-pointer"><option value="">All Nepal</option><option>Kathmandu</option><option>Lalitpur</option><option>Bhaktapur</option><option>Pokhara</option><option>Remote</option></select>
                </label>
                <button onClick={handleSearch} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition-colors shrink-0 flex items-center justify-center gap-2"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>Search</button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-slate-400 mb-10">
              <span>Popular:</span>
              {['React Developer', 'Graphic Designer', 'Food Delivery', 'Content Writer', 'Flutter'].map(t => (
                <button key={t} onClick={() => onJobSearch(t, 'all', '')} className="px-3 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-blue-300 hover:text-blue-600 transition-colors text-xs font-medium">
                  {t}
                </button>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button onClick={onRequireLogin} className="px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-blue-200 dark:shadow-none text-sm">
                Find Jobs — Free
              </button>
              <button onClick={onCreateAccount} className="px-8 py-3.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-blue-300 hover:text-blue-600 font-semibold rounded-xl transition-colors text-sm">
                Get Started for Free →
              </button>
            </div>
          </div>

          {/* Floating Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-16 max-w-3xl mx-auto">
            {[
              { label: 'Verified Professionals', value: '125K+', icon: '👥' },
              { label: 'Verified Companies', value: '4,200+', icon: '🏢' },
              { label: 'Monthly Job Posts', value: '18.5K+', icon: '📋' },
              { label: 'Success Rate', value: '94.2%', icon: '✅' },
            ].map(s => (
              <div key={s.label} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 text-center shadow-sm">
                <div className="text-2xl mb-1">{s.icon}</div>
                <div className="font-heading font-bold text-2xl text-slate-900 dark:text-white mb-0.5">{s.value}</div>
                <div className="text-xs text-slate-400 font-medium">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Employment Types */}
      <section className="py-20 bg-white dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <SectionHead tag="How It Works" title="One Platform, Four Ways to Work" sub="Whether you want a stable job, freelance freedom, quick gigs, or to offer services — KaamVerse has you covered." />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: 'Part-Time Jobs', desc: 'Flexible employment with verified companies. Find roles that fit your schedule and lifestyle.', icon: '💼', color: '#2563EB', bg: 'from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900', page: 'jobs' as Page, count: '12,400+ jobs' },
              { title: 'Freelance Projects', desc: 'Work on exciting projects globally. Build your portfolio with verified international clients.', icon: '💻', color: '#7C3AED', bg: 'from-violet-50 to-violet-100 dark:from-violet-950 dark:to-violet-900', page: 'freelance' as Page, count: '8,200+ projects' },
              { title: 'On-Demand Gigs', desc: 'Instant work opportunities. Delivery, tutoring, events, and more — start earning today.', icon: '⚡', color: '#F59E0B', bg: 'from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900', page: 'gigs' as Page, count: '5,600+ gigs' },
              { title: 'Services Marketplace', desc: 'Offer your professional services or hire verified experts for any business need.', icon: '🛍️', color: '#059669', bg: 'from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900', page: 'services-marketplace' as Page, count: '3,800+ services' },
            ].map(e => (
              <button
                key={e.title}
                onClick={() => navigate(e.page)}
                className={`bg-gradient-to-br ${e.bg} rounded-2xl p-6 text-left hover:shadow-lg hover:-translate-y-1 transition-all duration-200 group border border-transparent hover:border-slate-200 dark:hover:border-slate-700`}
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-4 bg-white dark:bg-slate-900 shadow-sm">
                  {e.icon}
                </div>
                <h3 className="font-heading font-bold text-slate-900 dark:text-white text-lg mb-2 group-hover:text-blue-600 transition-colors">{e.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-4">{e.desc}</p>
                <span className="text-xs font-semibold" style={{ color: e.color }}>{e.count} →</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* AI Features */}
      <section className="py-20 bg-slate-50 dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <SectionHead tag="AI-Powered" title="Intelligent Matching That Actually Works" sub="Our AI doesn't just filter — it understands context, skills, and goals to make perfect matches in seconds." />
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: '🎯', title: 'Smart Job Matching', desc: 'Our AI analyzes 50+ signals including skills, experience, work style, and location preferences to surface the most relevant opportunities — not just keyword matches.', color: '#2563EB' },
              { icon: '🛡️', title: 'Real-Time Fraud Detection', desc: 'Multi-layer AI monitors every listing and profile 24/7. Behavioral analysis, document verification, and pattern detection block scams before they reach you.', color: '#DC2626' },
              { icon: '🔮', title: 'Personalized Recommendations', desc: 'The more you use KaamVerse, the smarter it gets. Your AI assistant learns your preferences and proactively surfaces opportunities before they get competitive.', color: '#7C3AED' },
              { icon: '📊', title: 'Trust Score Intelligence', desc: 'Dynamic Trust Scores update in real time based on performance, reviews, and verification. Know instantly who you can trust before engaging.', color: '#059669' },
              { icon: '🌐', title: 'AI-Powered Translations', desc: 'Communicate seamlessly between Nepali and English. Our AI translates job descriptions, messages, and contracts with context-aware precision.', color: '#0891B2' },
              { icon: '💡', title: 'Career Path AI', desc: 'Get personalized career guidance, skill recommendations, and salary benchmarks powered by Nepal market data and global employment trends.', color: '#D97706' },
            ].map(f => (
              <div key={f.title} className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-100 dark:border-slate-700 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-4" style={{ backgroundColor: f.color + '18' }}>
                  {f.icon}
                </div>
                <h3 className="font-heading font-bold text-slate-900 dark:text-white mb-3">{f.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <button onClick={() => navigate('ai-features')} className="px-6 py-3 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 font-semibold rounded-xl hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors text-sm">
              Explore All AI Features →
            </button>
          </div>
        </div>
      </section>

      {/* Trust & Safety */}
      <section className="py-20 bg-white dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-green-50 dark:bg-green-950 text-green-600 dark:text-green-400 mb-5 tracking-wide uppercase">Trust & Safety</span>
              <h2 className="font-heading text-4xl font-bold text-slate-900 dark:text-white mb-5 leading-tight">Nepal's Most Trusted Employment Platform</h2>
              <p className="text-slate-500 dark:text-slate-400 text-lg leading-relaxed mb-8">
                Every job post, freelancer, and company goes through our rigorous multi-level verification. Our AI fraud detection system has blocked over 12,000 fake listings to date.
              </p>
              <div className="space-y-4 mb-8">
                {[
                  { label: 'Multi-Level ID Verification', desc: 'NID, passport, and document verification' },
                  { label: 'AI Fraud Detection', desc: '99.2% accuracy in blocking fake listings' },
                  { label: 'Secure Escrow Payments', desc: 'Funds released only on job completion' },
                  { label: 'Background Checks', desc: 'Criminal record and reference verification' },
                ].map(i => (
                  <div key={i.label} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center shrink-0 mt-0.5">
                      <svg className="w-3.5 h-3.5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-white">{i.label}</div>
                      <div className="text-xs text-slate-400">{i.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={() => navigate('trust-safety')} className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-colors text-sm">
                Learn About Trust & Safety →
              </button>
            </div>

            {/* Verification Levels */}
            <div className="space-y-4">
              <h3 className="font-heading font-bold text-slate-900 dark:text-white mb-6">Verification Levels</h3>
              {[
                { level: 1, name: 'Basic', color: '#64748B', bg: 'bg-slate-50 dark:bg-slate-900', border: 'border-slate-200 dark:border-slate-800', items: ['Email verified', 'Profile completed', 'Phone confirmed'], unlock: 'Access to basic job listings' },
                { level: 2, name: 'Verified', color: '#2563EB', bg: 'bg-blue-50 dark:bg-blue-950', border: 'border-blue-200 dark:border-blue-900', items: ['NID / Passport verified', 'Address confirmed', 'Bank account linked'], unlock: 'Full job access + payment features' },
                { level: 3, name: 'Professional', color: '#7C3AED', bg: 'bg-violet-50 dark:bg-violet-950', border: 'border-violet-200 dark:border-violet-900', items: ['Professional credentials', 'Reference checks', 'Portfolio reviewed'], unlock: 'Premium listings + priority matching' },
                { level: 4, name: 'Elite', color: '#D97706', bg: 'bg-amber-50 dark:bg-amber-950', border: 'border-amber-200 dark:border-amber-900', items: ['Video interview', 'Background check', 'Expert panel review'], unlock: 'Top placements + highest trust badge' },
              ].map(v => (
                <div key={v.level} className={`${v.bg} ${v.border} border rounded-2xl p-5`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center font-heading font-bold text-sm text-white" style={{ backgroundColor: v.color }}>
                        {v.level}
                      </div>
                      <span className="font-heading font-bold text-slate-900 dark:text-white">Level {v.level} – {v.name}</span>
                    </div>
                    <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {v.items.map(i => (
                      <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">{i}</span>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Unlocks: {v.unlock}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Featured Jobs */}
      <section className="py-20 bg-slate-50 dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-end justify-between mb-12">
            <SectionHead tag="Featured Jobs" title="Top Verified Job Openings" sub="Handpicked opportunities at Nepal's most trusted companies." center={false} />
            <button onClick={() => navigate('jobs')} className="hidden sm:block text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline shrink-0 mb-14">View all jobs →</button>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {jobs.slice(0, 6).map(j => <JobCard key={j.id} job={j} navigate={navigate} onApply={onApply} onSeeMore={onSelectJob} onSave={onSave} />)}
          </div>
          <div className="text-center mt-8">
            <button onClick={() => navigate('jobs')} className="px-6 py-3 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl hover:border-blue-300 hover:text-blue-600 transition-colors text-sm">
              Browse All 12,400+ Jobs →
            </button>
          </div>
        </div>
      </section>

      {/* Featured Freelancers */}
      <section className="py-20 bg-white dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-end justify-between mb-12">
            <SectionHead tag="Top Freelancers" title="Hire Nepal's Best Verified Talent" sub="Elite freelancers with proven track records and Trust Score 90+." center={false} />
            <button onClick={() => navigate('freelance')} className="hidden sm:block text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline shrink-0 mb-14">View all →</button>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FREELANCERS.map(f => <FreelancerCard key={f.id} f={f} onPrimary={onRequireLogin} onView={() => onSelectListing({ kind: 'freelancer', item: f }, 'home')} />)}
          </div>
        </div>
      </section>

      {/* Gigs */}
      <section className="py-20 bg-slate-50 dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-end justify-between mb-12">
            <SectionHead tag="On-Demand Gigs" title="Instant Work. Start Today." sub="Flexible gig opportunities across Kathmandu Valley and beyond." center={false} />
            <button onClick={() => navigate('gigs')} className="hidden sm:block text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline shrink-0 mb-14">View all gigs →</button>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {GIGS.slice(0, 4).map(g => <GigCard key={g.id} gig={g} onPrimary={onRequireLogin} onView={() => onSelectListing({ kind: 'gig', item: g }, 'home')} />)}
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="py-20 bg-white dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-end justify-between mb-12">
            <SectionHead tag="Services Marketplace" title="Professional Services on Demand" sub="Hire verified experts or offer your professional services to thousands of clients." center={false} />
            <button onClick={() => navigate('services')} className="hidden sm:block text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline shrink-0 mb-14">View all services →</button>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {SERVICES.slice(0, 6).map(s => <ServiceCard key={s.id} svc={s} onPrimary={onRequireLogin} onView={() => onSelectListing({ kind: 'service', item: s }, 'home')} />)}
          </div>
        </div>
      </section>

      {/* Verified Companies */}
      <section className="py-20 bg-slate-50 dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <SectionHead tag="Verified Companies" title="Nepal's Most Trusted Employers" sub="Every company on KaamVerse is background-checked, legally verified, and continuously monitored." />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
            {COMPANIES.map(c => <CompanyCard key={c.name} c={c} navigate={navigate} />)}
          </div>
          <div className="text-center">
            <button onClick={() => navigate('companies')} className="px-6 py-3 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl hover:border-blue-300 hover:text-blue-600 transition-colors text-sm">
              View All 4,200+ Companies →
            </button>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-white dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <SectionHead tag="Testimonials" title="Loved by Nepal's Workforce" sub="Real stories from professionals, freelancers, and businesses who transformed their careers with KaamVerse." />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {TESTIMONIALS.map(t => (
              <div key={t.name} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
                <div className="flex items-center gap-1 mb-4">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <svg key={i} className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mb-5 italic">&ldquo;{t.text}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-heading font-bold text-sm shrink-0" style={{ backgroundColor: t.color }}>
                    {t.initials}
                  </div>
                  <div>
                    <div className="font-heading font-semibold text-slate-900 dark:text-white text-sm">{t.name}</div>
                    <div className="text-xs text-slate-400">{t.role} · {t.company}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <button onClick={() => navigate('testimonials')} className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline">Read all testimonials →</button>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-slate-50 dark:bg-slate-900">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <SectionHead tag="FAQ" title="Frequently Asked Questions" sub="Everything you need to know about KaamVerse." />
          <div className="space-y-3">
            {FAQS.slice(0, 6).map((f, i) => (
              <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
                <button
                  className="w-full flex items-center justify-between px-6 py-5 text-left"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span className="font-heading font-semibold text-slate-900 dark:text-white text-sm">{f.q}</span>
                  <svg className={`w-5 h-5 text-slate-400 transition-transform duration-200 shrink-0 ml-4 ${openFaq === i ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-5">
                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{f.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <button onClick={() => navigate('faq')} className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline">View all FAQs →</button>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-gradient-to-br from-blue-600 to-indigo-700 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-white opacity-5 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-white opacity-5 blur-3xl" />
        </div>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center relative">
          <h2 className="font-heading text-4xl sm:text-5xl font-bold text-white mb-5">Ready to Transform Your Career?</h2>
          <p className="text-blue-100 text-lg leading-relaxed mb-8">Join 125,000+ professionals already using Nepal's most trusted employment platform.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={() => navigate('jobs')} className="px-8 py-4 bg-white text-blue-600 font-bold rounded-xl hover:bg-blue-50 transition-colors shadow-lg text-sm">
              Find Jobs for Free
            </button>
            <button onClick={() => navigate('contact')} className="px-8 py-4 border-2 border-white/40 text-white font-semibold rounded-xl hover:bg-white/10 transition-colors text-sm">
              Get Started →
            </button>
          </div>
          <p className="text-blue-200 text-xs mt-5">No credit card required. Free forever for job seekers.</p>
        </div>
      </section>
    </div>
  )
}

// ─── About Page ───────────────────────────────────────────────────────────────

function AboutPage({ navigate }: { navigate: (p: Page) => void }) {
  return (
    <div>
      <section className="py-20 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-950 dark:to-indigo-950">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <span className="inline-block text-xs font-semibold px-3 py-1.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 mb-5 uppercase tracking-wide">About KaamVerse</span>
          <h1 className="font-heading text-5xl font-extrabold text-slate-900 dark:text-white mb-6">Nepal's Employment Revolution Starts Here</h1>
          <p className="text-xl text-slate-500 dark:text-slate-400 leading-relaxed">We built KaamVerse because Nepal's workforce deserved better — a platform that uses AI not just to match jobs, but to build genuine trust between workers and employers.</p>
        </div>
      </section>

      <section className="py-20 bg-white dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="font-heading text-3xl font-bold text-slate-900 dark:text-white mb-5">Our Story</h2>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed mb-4">KaamVerse was founded in 2022 by a team of engineers and social entrepreneurs who saw Nepal's job market struggling with fraud, mistrust, and inefficiency. Traditional job portals were failing workers and employers alike.</p>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed mb-4">We combined cutting-edge AI with Nepal's first comprehensive trust verification system to create an ecosystem where talent and opportunity can meet safely and efficiently.</p>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed mb-8">Today, we serve 125,000+ professionals and 4,200+ verified companies across Nepal, with operations expanding to Bhutan and Sri Lanka.</p>
              <button onClick={() => navigate('contact')} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors text-sm">
                Get Started Today →
              </button>
            </div>
            <div className="grid grid-cols-2 gap-5">
              {[
                { label: 'Founded', value: '2022', sub: 'Kathmandu, Nepal' },
                { label: 'Team Size', value: '80+', sub: 'Engineers & experts' },
                { label: 'Raised', value: 'NPR 2Cr+', sub: 'Seed funding' },
                { label: 'Impact', value: '125K+', sub: 'Careers transformed' },
              ].map(s => (
                <div key={s.label} className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-6 border border-slate-100 dark:border-slate-800">
                  <div className="font-heading font-extrabold text-3xl text-blue-600 mb-1">{s.value}</div>
                  <div className="font-heading font-semibold text-slate-900 dark:text-white text-sm mb-1">{s.label}</div>
                  <div className="text-xs text-slate-400">{s.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-slate-50 dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <SectionHead tag="Our Team" title="Built by People Who Care" sub="A diverse team of engineers, designers, and employment specialists united by one mission." />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { name: 'Arjun Thapa', role: 'CEO & Co-founder', bg: '#2563EB', initials: 'AT' },
              { name: 'Mira Shrestha', role: 'CTO & Co-founder', bg: '#7C3AED', initials: 'MS' },
              { name: 'Suraj Karki', role: 'Head of AI', bg: '#059669', initials: 'SK' },
              { name: 'Priya Rana', role: 'Head of Trust & Safety', bg: '#D97706', initials: 'PR' },
            ].map(m => (
              <div key={m.name} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6 text-center hover:shadow-lg transition-shadow">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-heading font-bold text-xl mx-auto mb-4" style={{ backgroundColor: m.bg }}>
                  {m.initials}
                </div>
                <h3 className="font-heading font-bold text-slate-900 dark:text-white mb-1">{m.name}</h3>
                <p className="text-sm text-slate-400">{m.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-slate-50 dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <SectionHead tag="Testimonials" title="Loved by Nepal's Workforce" sub="Real stories from professionals, freelancers, gig workers, and businesses who transformed their careers." />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
            {TESTIMONIALS.map(t => (
              <div key={t.name} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6 shadow-sm hover:shadow-lg transition-shadow">
                <div className="flex items-center gap-1 mb-4">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <svg key={i} className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mb-6 italic">&ldquo;{t.text}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-heading font-bold text-sm shrink-0" style={{ backgroundColor: t.color }}>{t.initials}</div>
                  <div>
                    <div className="font-heading font-semibold text-slate-900 dark:text-white text-sm">{t.name}</div>
                    <div className="text-xs text-slate-400">{t.role} · {t.company}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <AboutFAQ navigate={navigate} />

      <section className="py-16 bg-gradient-to-br from-blue-600 to-indigo-700">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="font-heading text-3xl font-bold text-white mb-4">Join the KaamVerse Mission</h2>
          <p className="text-blue-100 mb-8">Help us build Nepal's future of work.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={() => navigate('jobs')} className="px-6 py-3 bg-white text-blue-600 font-bold rounded-xl hover:bg-blue-50 transition-colors text-sm">Find Jobs</button>
            <button onClick={() => navigate('contact')} className="px-6 py-3 border-2 border-white/40 text-white font-semibold rounded-xl hover:bg-white/10 transition-colors text-sm">Get Started</button>
          </div>
        </div>
      </section>
    </div>
  )
}

function AboutFAQ({ navigate }: { navigate: (p: Page) => void }) {
  const [open, setOpen] = useState<number | null>(null)
  return (
    <section className="py-20 bg-white dark:bg-slate-950">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <SectionHead tag="FAQ" title="Frequently Asked Questions" sub="Everything you need to know about KaamVerse." />
        <div className="space-y-3 mb-12">
          {FAQS.map((f, i) => (
            <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
              <button className="w-full flex items-center justify-between px-6 py-5 text-left" onClick={() => setOpen(open === i ? null : i)}>
                <span className="font-heading font-semibold text-slate-900 dark:text-white text-sm pr-4">{f.q}</span>
                <svg className={`w-5 h-5 text-slate-400 transition-transform duration-200 shrink-0 ${open === i ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {open === i && (
                <div className="px-6 pb-6">
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{f.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="bg-blue-50 dark:bg-blue-950 rounded-2xl p-8 text-center border border-blue-100 dark:border-blue-900">
          <h3 className="font-heading font-bold text-slate-900 dark:text-white mb-2">Still have questions?</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">Our support team is available 7 days a week.</p>
          <button onClick={() => navigate('contact')} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm transition-colors">Contact Support</button>
        </div>
      </div>
    </section>
  )
}

// ─── Features Page ────────────────────────────────────────────────────────────

function FeaturesPage({ navigate }: { navigate: (p: Page) => void }) {
  return (
    <div>
      <section className="py-20 bg-gradient-to-br from-blue-50 to-white dark:from-slate-950 dark:to-slate-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <span className="inline-block text-xs font-semibold px-3 py-1.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 mb-5 uppercase tracking-wide">Platform Features</span>
          <h1 className="font-heading text-5xl font-extrabold text-slate-900 dark:text-white mb-5">Everything You Need to Succeed</h1>
          <p className="text-xl text-slate-500 dark:text-slate-400 leading-relaxed">A complete employment ecosystem built for Nepal's modern workforce.</p>
        </div>
      </section>

      <section className="py-20 bg-white dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: '🤖', title: 'AI-Powered Matching', desc: 'Smart algorithms analyze 50+ signals to connect the right talent with the right opportunity — every time.', page: 'ai-features' as Page },
              { icon: '🛡️', title: 'Multi-Level Verification', desc: '4-tier verification system ensures every user and company is who they claim to be, eliminating fraud at the root.', page: 'trust-safety' as Page },
              { icon: '💰', title: 'Secure Escrow Payments', desc: 'Funds held safely in escrow and released only on job completion confirmation from both parties.', page: 'trust-safety' as Page },
              { icon: '📊', title: 'Dynamic Trust Scores', desc: 'Real-time Trust Scores updated based on performance, reviews, and behavior. Transparency you can rely on.', page: 'trust-safety' as Page },
              { icon: '🌏', title: 'Bilingual Platform', desc: 'Full Nepali and English language support with AI-powered contextual translation for all content.', page: 'features' as Page },
              { icon: '📱', title: 'Mobile-First Design', desc: 'Native iOS and Android apps with all features. Manage your career from anywhere in Nepal.', page: 'features' as Page },
              { icon: '🔔', title: 'Smart Notifications', desc: 'AI-powered alerts for new matches, job updates, payment confirmations, and market insights.', page: 'features' as Page },
              { icon: '📈', title: 'Career Analytics', desc: 'Detailed dashboards showing your profile performance, earnings trends, and market positioning.', page: 'features' as Page },
              { icon: '🤝', title: 'Dispute Resolution', desc: 'Dedicated team and AI-assisted process to fairly resolve any disputes between workers and employers.', page: 'trust-safety' as Page },
              { icon: '🎓', title: 'Skill Development', desc: 'Curated learning paths and certification programs to upskill and unlock higher-paying opportunities.', page: 'features' as Page },
              { icon: '🌐', title: 'International Clients', desc: 'Connect with global clients and receive payments in USD/EUR, disbursed in NPR through our platform.', page: 'features' as Page },
              { icon: '⚡', title: 'Instant Gig Matching', desc: 'On-demand matching for same-day gigs. Need work today? Get matched in under 60 seconds.', page: 'gigs' as Page },
            ].map(f => (
              <button
                key={f.title}
                onClick={() => navigate(f.page)}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 text-left hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 group"
              >
                <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950 flex items-center justify-center text-2xl mb-4">{f.icon}</div>
                <h3 className="font-heading font-bold text-slate-900 dark:text-white mb-2 group-hover:text-blue-600 transition-colors">{f.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{f.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-gradient-to-br from-blue-600 to-indigo-700">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="font-heading text-3xl font-bold text-white mb-4">Experience All Features Free</h2>
          <p className="text-blue-100 mb-8">Start your journey today — no credit card required.</p>
          <button onClick={() => navigate('contact')} className="px-8 py-4 bg-white text-blue-600 font-bold rounded-xl hover:bg-blue-50 transition-colors text-sm">
            Get Started Free →
          </button>
        </div>
      </section>
    </div>
  )
}

// ─── AI Features Page ─────────────────────────────────────────────────────────

function AIFeaturesPage({ navigate }: { navigate: (p: Page) => void }) {
  return (
    <div>
      <section className="py-20 bg-gradient-to-br from-indigo-50 via-white to-blue-50 dark:from-indigo-950 dark:via-slate-950 dark:to-slate-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <span className="inline-block text-xs font-semibold px-3 py-1.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 mb-5 uppercase tracking-wide">AI Features</span>
          <h1 className="font-heading text-5xl font-extrabold text-slate-900 dark:text-white mb-5">Powered by Advanced AI</h1>
          <p className="text-xl text-slate-500 dark:text-slate-400 leading-relaxed">Nepal's most sophisticated employment AI — built on years of local market data and cutting-edge machine learning.</p>
        </div>
      </section>

      <section className="py-20 bg-white dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="space-y-20">
            {[
              { icon: '🎯', title: 'Intelligent Job Matching Engine', color: '#2563EB', desc: 'Our matching AI goes far beyond keyword search. It understands skills in context, analyzes work history patterns, considers commute preferences, and even learns from your browsing behavior to surface opportunities you might never have found through traditional search.', points: ['50+ matching signals analyzed', 'Context-aware skill evaluation', 'Real-time market demand weighting', 'Personal preference learning'] },
              { icon: '🛡️', title: 'Multi-Layer Fraud Detection AI', color: '#DC2626', desc: 'Our fraud detection system operates 24/7 using behavioral analytics, document authenticity verification, posting pattern analysis, and network graph analysis to identify and block fraudulent activity before it reaches real users.', points: ['99.2% fraud detection accuracy', 'Real-time listing monitoring', 'Document authenticity verification', 'Behavioral anomaly detection'] },
              { icon: '📊', title: 'Dynamic Trust Score System', color: '#059669', desc: 'Trust Scores are calculated by our AI using weighted analysis of 30+ factors including verification level, work history, client reviews, payment behavior, response rate, and dispute history. Updated in real-time after every interaction.', points: ['30+ trust factors analyzed', 'Real-time score updates', 'Transparent scoring breakdown', 'Industry-specific benchmarks'] },
              { icon: '🔮', title: 'Predictive Career Intelligence', color: '#7C3AED', desc: 'Our AI analyzes Nepal job market trends, skill demand forecasts, and salary data to give you personalized career guidance. Know which skills to develop, when to apply for roles, and what salary to expect — months before others do.', points: ['Nepal market trend analysis', 'Salary prediction models', 'Skill demand forecasting', 'Personalized career roadmaps'] },
            ].map(f => (
              <div key={f.title} className="grid lg:grid-cols-2 gap-12 items-center">
                <div>
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mb-6" style={{ backgroundColor: f.color + '18' }}>
                    {f.icon}
                  </div>
                  <h2 className="font-heading text-3xl font-bold text-slate-900 dark:text-white mb-4">{f.title}</h2>
                  <p className="text-slate-500 dark:text-slate-400 leading-relaxed mb-6">{f.desc}</p>
                  <ul className="space-y-2">
                    {f.points.map(p => (
                      <li key={p} className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: f.color }}>
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                        </div>
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-3xl p-8 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-2xl" style={{ backgroundColor: f.color + '18' }}>{f.icon}</div>
                    <div>
                      <div className="font-heading font-bold text-slate-900 dark:text-white text-sm">KaamVerse AI</div>
                      <div className="text-xs text-slate-400">Active & Learning</div>
                    </div>
                    <div className="ml-auto flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-xs text-green-600 dark:text-green-400 font-medium">Online</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {f.points.map((p, i) => (
                      <div key={i} className="flex items-center justify-between bg-white dark:bg-slate-800 rounded-xl px-4 py-3 border border-slate-100 dark:border-slate-700">
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{p}</span>
                        <span className="text-xs font-bold" style={{ color: f.color }}>Active</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-gradient-to-br from-indigo-600 to-blue-700">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="font-heading text-3xl font-bold text-white mb-4">Experience AI-Powered Hiring</h2>
          <p className="text-indigo-100 mb-8">Let our AI find your perfect match today.</p>
          <button onClick={() => navigate('contact')} className="px-8 py-4 bg-white text-indigo-600 font-bold rounded-xl hover:bg-indigo-50 transition-colors text-sm">
            Get Started Free →
          </button>
        </div>
      </section>
    </div>
  )
}

// ─── Trust & Safety Page ──────────────────────────────────────────────────────

function TrustSafetyPage({ navigate }: { navigate: (p: Page) => void }) {
  return (
    <div>
      <section className="py-20 bg-gradient-to-br from-green-50 to-white dark:from-green-950 dark:to-slate-950">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <span className="inline-block text-xs font-semibold px-3 py-1.5 rounded-full bg-green-100 dark:bg-green-950 text-green-600 dark:text-green-400 mb-5 uppercase tracking-wide">Trust & Safety</span>
          <h1 className="font-heading text-5xl font-extrabold text-slate-900 dark:text-white mb-5">Your Safety Is Our Priority</h1>
          <p className="text-xl text-slate-500 dark:text-slate-400 leading-relaxed">Every interaction on KaamVerse is protected by Nepal's most comprehensive trust and safety framework.</p>
        </div>
      </section>

      <section className="py-20 bg-white dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-3 gap-8 mb-20">
            {[
              { icon: '🛡️', title: 'Fraud Prevention', value: '12,400+', desc: 'Fake listings blocked by our AI this year alone' },
              { icon: '✅', title: 'Verification Rate', value: '94.2%', desc: 'Of all active users have completed Level 2+ verification' },
              { icon: '💰', title: 'Payment Security', value: '100%', desc: 'Of platform payments processed through secure escrow' },
            ].map(s => (
              <div key={s.title} className="bg-green-50 dark:bg-green-950 rounded-2xl p-8 border border-green-100 dark:border-green-900 text-center">
                <div className="text-4xl mb-4">{s.icon}</div>
                <div className="font-heading font-extrabold text-4xl text-green-600 dark:text-green-400 mb-2">{s.value}</div>
                <div className="font-heading font-bold text-slate-900 dark:text-white mb-2">{s.title}</div>
                <p className="text-sm text-slate-500 dark:text-slate-400">{s.desc}</p>
              </div>
            ))}
          </div>

          <SectionHead tag="Verification Levels" title="Four Levels of Trust" sub="Our progressive verification system rewards authenticity with greater opportunity." />
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {[
              { level: 1, name: 'Basic', color: '#64748B', features: ['Email verified', 'Profile complete', 'Phone confirmed'], unlock: 'Basic job browsing' },
              { level: 2, name: 'Verified', color: '#2563EB', features: ['NID/Passport verified', 'Address confirmed', 'Bank account linked'], unlock: 'Full job access & payments' },
              { level: 3, name: 'Professional', color: '#7C3AED', features: ['Professional credentials', 'Reference checks', 'Portfolio reviewed'], unlock: 'Premium listings & AI priority' },
              { level: 4, name: 'Elite', color: '#D97706', features: ['Video interview', 'Background check', 'Expert panel approval'], unlock: 'Top trust badge & placement' },
            ].map(v => (
              <div key={v.level} className="bg-white dark:bg-slate-900 rounded-2xl border-2 p-6" style={{ borderColor: v.color + '40' }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-heading font-bold mb-4" style={{ backgroundColor: v.color }}>
                  {v.level}
                </div>
                <h3 className="font-heading font-bold text-slate-900 dark:text-white mb-1">Level {v.level}</h3>
                <p className="text-sm font-semibold mb-4" style={{ color: v.color }}>{v.name}</p>
                <ul className="space-y-2 mb-4">
                  {v.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                      <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20" style={{ color: v.color }}><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                  <p className="text-xs text-slate-400">{v.unlock}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center">
            <button onClick={() => navigate('contact')} className="px-8 py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-colors text-sm">
              Start Verification →
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}

// ─── Employment Types Page ────────────────────────────────────────────────────

function EmploymentTypesPage({ navigate }: { navigate: (p: Page) => void }) {
  return (
    <div>
      <section className="py-20 bg-gradient-to-br from-blue-50 to-white dark:from-slate-950 dark:to-slate-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <span className="inline-block text-xs font-semibold px-3 py-1.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 mb-5 uppercase tracking-wide">Employment Types</span>
          <h1 className="font-heading text-5xl font-extrabold text-slate-900 dark:text-white mb-5">Work on Your Own Terms</h1>
          <p className="text-xl text-slate-500 dark:text-slate-400 leading-relaxed">KaamVerse supports every type of work arrangement — from traditional employment to the gig economy.</p>
        </div>
      </section>
      <section className="py-20 bg-white dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="space-y-16">
            {[
              { icon: '💼', title: 'Part-Time Jobs', color: '#2563EB', desc: "Flexible employment with Nepal's most trusted companies. Find verified roles that match your skills, location, and available schedule.", features: ['Verified employers only', 'Salary transparency guaranteed', 'Exact schedules included', 'Direct application tracking'], stats: '12,400+ active jobs', page: 'jobs' as Page, label: 'Browse Jobs' },
              { icon: '💻', title: 'Freelance Projects', color: '#7C3AED', desc: 'Work on exciting projects from Nepal and globally. Build your portfolio, set your rates, and work with verified international and local clients on your schedule.', features: ['Secure milestone payments', 'Global client access', 'Portfolio showcase tools', 'Professional contracts'], stats: '8,200+ active projects', page: 'freelance' as Page, label: 'Find Projects' },
              { icon: '⚡', title: 'On-Demand Gigs', color: '#F59E0B', desc: 'Instant work opportunities for immediate income. Delivery, tutoring, photography, home services, IT support — start earning today with zero waiting.', features: ['Same-day payment available', 'Flexible scheduling', 'Location-based matching', 'Insurance coverage available'], stats: '5,600+ available gigs', page: 'gigs' as Page, label: 'Browse Gigs' },
              { icon: '🛍️', title: 'Services Marketplace', color: '#059669', desc: 'Offer your professional services as packages or hire verified experts for any business need. Web development, design, marketing, translation, and much more.', features: ['Package-based pricing', 'Delivery time guarantees', 'Revision policies', 'Quality assurance'], stats: '3,800+ listed services', page: 'services' as Page, label: 'Explore Services' },
            ].map(t => (
              <div key={t.title} className="grid lg:grid-cols-2 gap-12 items-center">
                <div>
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mb-6" style={{ backgroundColor: t.color + '18' }}>{t.icon}</div>
                  <h2 className="font-heading text-3xl font-bold text-slate-900 dark:text-white mb-3">{t.title}</h2>
                  <p className="text-slate-500 dark:text-slate-400 leading-relaxed mb-6">{t.desc}</p>
                  <ul className="space-y-2 mb-6">
                    {t.features.map(f => (
                      <li key={f} className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                        <span className="w-4 h-4 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: t.color }}>
                          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                        </span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <div className="flex items-center gap-4">
                    <button onClick={() => navigate(t.page)} className="px-6 py-3 text-white font-semibold rounded-xl text-sm transition-colors" style={{ backgroundColor: t.color }}>
                      {t.label} →
                    </button>
                    <span className="text-sm font-semibold" style={{ color: t.color }}>{t.stats}</span>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-3xl p-8 border border-slate-200 dark:border-slate-700">
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-100 dark:border-slate-700 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg" style={{ backgroundColor: t.color + '18' }}>{t.icon}</div>
                        <div className="flex-1">
                          <div className="h-3 bg-slate-200 dark:bg-slate-600 rounded-full mb-1.5" style={{ width: `${60 + i * 15}%` }} />
                          <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full" style={{ width: `${40 + i * 10}%` }} />
                        </div>
                        <TrustBadge score={90 + i * 3} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

// ─── Services Marketplace Page ────────────────────────────────────────────────

function ServicesMarketplacePage({ navigate, onRequireLogin, onSelectListing }: { navigate: (p: Page) => void; onRequireLogin: () => void; onSelectListing: (selection: MarketplaceSelection, backPage: Page) => void }) {
  return (
    <div>
      <section className="py-20 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950 dark:to-slate-950">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <span className="inline-block text-xs font-semibold px-3 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 mb-5 uppercase tracking-wide">Services Marketplace</span>
          <h1 className="font-heading text-5xl font-extrabold text-slate-900 dark:text-white mb-5">Nepal's Professional Services Hub</h1>
          <p className="text-xl text-slate-500 dark:text-slate-400 leading-relaxed mb-8">Hire verified experts or offer your professional services to thousands of businesses across Nepal and the world.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={() => navigate('services')} className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-colors text-sm">Browse Services</button>
            <button onClick={() => navigate('contact')} className="px-6 py-3 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 font-semibold rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-950 transition-colors text-sm">List Your Services</button>
          </div>
        </div>
      </section>
      <section className="py-20 bg-white dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <SectionHead tag="Categories" title="Every Service You Need" sub="From web development to translation — verified providers for every business need." />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-16">
            {[
              { label: 'Web Development', icon: '💻', count: 420 },
              { label: 'Design & Branding', icon: '🎨', count: 380 },
              { label: 'Digital Marketing', icon: '📈', count: 290 },
              { label: 'Mobile Development', icon: '📱', count: 215 },
              { label: 'Content Writing', icon: '✍️', count: 340 },
              { label: 'Video Production', icon: '🎬', count: 180 },
              { label: 'Translation', icon: '🌐', count: 160 },
              { label: 'Accounting & Finance', icon: '💰', count: 210 },
            ].map(c => (
              <button key={c.label} onClick={() => navigate('services')} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 text-center hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
                <div className="text-3xl mb-3">{c.icon}</div>
                <div className="font-heading font-semibold text-slate-900 dark:text-white text-sm mb-1">{c.label}</div>
                <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">{c.count}+ providers</div>
              </button>
            ))}
          </div>
          <SectionHead tag="Featured" title="Top Rated Services" sub="Quality-guaranteed services from Nepal's most trusted providers." />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {SERVICES.map(s => <ServiceCard key={s.id} svc={s} onPrimary={onRequireLogin} onView={() => onSelectListing({ kind: 'service', item: s }, 'services-marketplace')} />)}
          </div>
        </div>
      </section>
    </div>
  )
}

// ─── Companies Page ───────────────────────────────────────────────────────────

function CompaniesPage({ navigate }: { navigate: (p: Page) => void }) {
  const [filter, setFilter] = useState('All')
  const industries = ['All', 'Software', 'Fintech', 'E-commerce', 'Telecom', 'AI / Data']
  const filtered = filter === 'All' ? COMPANIES : COMPANIES.filter(c => c.industry === filter)

  return (
    <div>
      <section className="py-20 bg-gradient-to-br from-blue-50 to-white dark:from-slate-950 dark:to-slate-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <span className="inline-block text-xs font-semibold px-3 py-1.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 mb-5 uppercase tracking-wide">Verified Companies</span>
          <h1 className="font-heading text-5xl font-extrabold text-slate-900 dark:text-white mb-5">Nepal's Most Trusted Employers</h1>
          <p className="text-xl text-slate-500 dark:text-slate-400 leading-relaxed mb-8">4,200+ verified companies actively hiring. Every company is background-checked, legally verified, and continuously monitored.</p>
        </div>
      </section>
      <section className="py-20 bg-white dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-wrap gap-2 mb-10">
            {industries.map(i => (
              <button
                key={i}
                onClick={() => setFilter(i)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${filter === i ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-blue-50 hover:text-blue-600'}`}
              >
                {i}
              </button>
            ))}
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map(c => <CompanyCard key={c.name} c={c} navigate={navigate} />)}
          </div>
        </div>
      </section>
    </div>
  )
}

// ─── Company Details Page ─────────────────────────────────────────────────────

function CompanyDetailsPage({ navigate }: { navigate: (p: Page) => void }) {
  const company = COMPANIES[0]
  return <UnifiedDetailPage
    backLabel="Back to Companies"
    onBack={() => navigate('companies')}
    icon={company.name.split(/\s+/).map(word => word[0]).join('').slice(0, 2)}
    title={company.name}
    subtitle={`${company.industry} · Kathmandu, Nepal`}
    verifiedLabel="Verified Employer"
    score={company.trust}
    scoreTitle="Employer Trust Score"
    scoreMessage="Identity, business registration, hiring history, and platform conduct contribute to this verified employer score."
    facts={[{ label: 'Company Size', value: `${company.employees} employees`, icon: '♧' }, { label: 'Open Roles', value: `${company.openRoles} positions`, icon: '▣' }, { label: 'Founded', value: '2012', icon: '◷' }, { label: 'Headquarters', value: 'Kathmandu, Nepal', icon: '⌖' }]}
    tags={[company.industry, company.tier, 'Platinum Employer', 'Actively Hiring']}
    descriptionTitle="About the company"
    description="Leapfrog Technology builds world-class products for clients across North America, Europe, and Asia. Its Nepal team is known for engineering excellence, professional development, and a people-first culture."
    sections={[{ title: 'Why work here', items: ['Verified and transparent hiring process', 'Global projects from Nepal', 'Structured learning and career growth', 'Professional and inclusive work environment'], check: true }, { title: 'Current opportunities', items: JOBS.slice(0, 3).map(job => `${job.title} — ${job.type} — ${job.salary}`) }, { title: 'Employer protections', items: ['Business registration verified', 'Platform activity monitored', 'Secure in-app applications and messages'], check: true, columns: true }]}
    primaryValue={`${company.openRoles} open roles`}
    primaryMeta="Verified opportunities on KaamVerse"
    primaryLabel="View Open Roles"
    onPrimary={() => navigate('jobs')}
    onMessage={() => navigate('contact')}
    onReport={() => navigate('trust-safety')}
    profileTitle="Company"
    profileBody="With offices in Kathmandu and international markets, this employer offers local professionals opportunities to contribute to global products while building careers in Nepal."
  />
}

// ─── Jobs Page ────────────────────────────────────────────────────────────────

function JobsPage({ navigate, jobs, isAuth, searchQuery, searchLocation, onSearchChange, onSelectJob, onApply, onSave }: {
  navigate: (p: Page) => void
  jobs: MarketingJob[]
  isAuth?: boolean
  searchQuery: string
  searchLocation: string
  onSearchChange: (query: string, location: string) => void
  onSelectJob: (job: MarketingJob) => void
  onApply: (job: MarketingJob) => void
  onSave: (job: MarketingJob) => Promise<boolean>
}) {
  const [filter, setFilter] = useState('All')
  const [availableFrom, setAvailableFrom] = useState('')
  const [availableUntil, setAvailableUntil] = useState('')
  const types = ['All', 'Part-time', 'Remote']
  const aiRecommended = jobs.filter(j => j.trust >= 90).slice(0, 3)
  const popular = jobs.filter(j => j.urgent).concat(jobs.filter(j => !j.urgent)).slice(0, 6)
  const typeFiltered = filter === 'All'
    ? (searchQuery.trim() || searchLocation.trim() ? jobs : popular)
    : filter === 'Remote'
      ? jobs.filter(j => j.location.toLowerCase().includes('remote'))
      : jobs.filter(j => j.type === filter)
  const query = searchQuery.trim().toLowerCase()
  const location = searchLocation.trim().toLowerCase()
  const displayedJobs = typeFiltered.filter(job => {
    const searchable = `${job.title} ${job.company} ${job.type} ${job.location} ${job.tags.join(' ')}`.toLowerCase()
    return (!query || searchable.includes(query))
      && (!location || job.location.toLowerCase().includes(location))
      && matchesAvailability(job, availableFrom, availableUntil)
  })
  const invalidTimeRange = Boolean(availableFrom && availableUntil && timeToMinutes(availableUntil) <= timeToMinutes(availableFrom))

  return (
    <div>
      <section className="py-14 bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <h1 className="font-heading text-3xl font-extrabold mb-2">Part-Time Jobs in Nepal</h1>
          <p className="text-blue-100 text-sm mb-6">Flexible work that fits your schedule</p>
          <div className="grid sm:grid-cols-[1fr_220px_auto] gap-2 bg-white/10 p-2 rounded-2xl backdrop-blur-sm">
            <input value={searchQuery} onChange={event => onSearchChange(event.target.value, searchLocation)} placeholder="Job title, skills, or company" className="px-4 py-3 rounded-xl bg-white text-slate-900 text-sm outline-none placeholder:text-slate-400" />
            <input value={searchLocation} onChange={event => onSearchChange(searchQuery, event.target.value)} placeholder="Location" className="px-4 py-3 rounded-xl bg-white text-slate-900 text-sm outline-none placeholder:text-slate-400" />
            <button onClick={() => onSearchChange(searchQuery, searchLocation)} className="px-6 py-3 rounded-xl bg-slate-950 hover:bg-slate-900 text-white text-sm font-bold">Search Jobs</button>
          </div>
          <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3 rounded-2xl bg-white/10 border border-white/15 p-3">
            <div className="sm:mr-auto">
              <p className="text-sm font-bold">Your available time</p>
              <p className="text-xs text-blue-100">Enter any time range, for example 1:00 PM–2:00 PM.</p>
            </div>
            <label className="flex items-center gap-2 text-xs font-semibold"><span>From</span><input type="time" value={availableFrom} onChange={event => setAvailableFrom(event.target.value)} className="px-3 py-2 rounded-xl bg-white text-slate-900 outline-none" /></label>
            <label className="flex items-center gap-2 text-xs font-semibold"><span>To</span><input type="time" value={availableUntil} onChange={event => setAvailableUntil(event.target.value)} className="px-3 py-2 rounded-xl bg-white text-slate-900 outline-none" /></label>
            {(availableFrom || availableUntil) && <button onClick={() => { setAvailableFrom(''); setAvailableUntil('') }} className="px-3 py-2 rounded-xl border border-white/30 text-xs font-bold hover:bg-white/10">Clear</button>}
          </div>
          {invalidTimeRange && <p className="text-xs text-amber-200 mt-2">End time must be later than start time.</p>}
        </div>
      </section>

      {/* AI Recommended — only for logged-in users */}
      {isAuth && (
        <section className="py-10 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950 dark:to-blue-950 border-b border-indigo-100 dark:border-indigo-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center text-white text-lg shadow-sm">🤖</div>
              <div>
                <h2 className="font-heading font-bold text-slate-900 dark:text-white">AI Recommended for You</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Personalized matches based on your profile and skills</p>
              </div>
              <span className="ml-auto text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300">97% match avg</span>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {aiRecommended.map(j => (
                <div key={'ai-' + j.id} className="relative">
                  <div className="absolute -top-2 left-4 z-10">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-600 text-white shadow-sm">🤖 AI Match</span>
                  </div>
                  <JobCard job={j} navigate={navigate} onApply={onApply} onSeeMore={onSelectJob} onSave={onSave} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Popular Jobs — always visible */}
      <section className="py-12 bg-white dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <span className="text-xl">🔥</span>
              <div>
                <h2 className="font-heading font-bold text-slate-900 dark:text-white">Popular Jobs</h2>
                <p className="text-xs text-slate-400">Trending now across Nepal</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {types.map(t => (
                <button key={t} onClick={() => setFilter(t)} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${filter === t ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-blue-50 hover:text-blue-600'}`}>{t}</button>
              ))}
            </div>
          </div>

          {!isAuth && (
            <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-2xl border border-blue-100 dark:border-blue-900 px-5 py-4 flex items-center gap-4">
              <span className="text-2xl">🤖</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Get AI-powered job recommendations</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Sign in to see jobs personalized to your skills, location, and salary expectations.</p>
              </div>
              <button onClick={() => navigate('auth')} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl whitespace-nowrap transition-colors">Sign In Free</button>
            </div>
          )}

          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{displayedJobs.length} matching jobs found</p>
          {displayedJobs.length ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {displayedJobs.map(j => <JobCard key={j.id} job={j} navigate={navigate} onApply={onApply} onSeeMore={onSelectJob} onSave={onSave} />)}
            </div>
          ) : (
            <div className="py-16 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
              <div className="text-4xl mb-3">🔎</div>
              <h3 className="font-heading font-bold text-slate-900 dark:text-white">No matching jobs found</h3>
              <p className="text-sm text-slate-400 mt-1">Try another title, skill, company, or location.</p>
            </div>
          )}
          <div className="text-center mt-10">
            <button onClick={() => navigate('contact')} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors text-sm">Post a Job — Get Started</button>
          </div>
        </div>
      </section>
    </div>
  )
}

function JobDetailsPage({ job, navigate, isAuth, onApply, onLogin }: {
  job: MarketingJob
  navigate: (page: Page) => void
  isAuth: boolean
  onApply: (job: MarketingJob) => void
  onLogin: () => void
}) {
  const [tab, setTab] = useState<'details'|'company'|'reviews'>('details')
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)
  const [alertEmail, setAlertEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)
  const [reported, setReported] = useState(false)
  const initials = job.company.split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase()
  const applicants = job.applicationCount ?? 8 + job.id * 3
  const match = Math.min(98, 88 + job.trust % 10)
  const shift = getJobScheduleLabel(job)
  const deadline = new Date(job.expiresAt || Date.now() + (10 + job.id) * 86400000).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
  const copyLink = async () => {
    const url = `${window.location.origin}/?page=job-details&job=${job.id}`
    await navigator.clipboard?.writeText(url)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }
  const saveJob = () => {
    if (!isAuth) { onLogin(); return }
    setSaved(value => !value)
  }

  return (
    <div className="bg-slate-50 dark:bg-slate-950 min-h-screen">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <button onClick={() => navigate('jobs')} className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600 mb-5">← Back to Jobs</button>
        <div className="grid lg:grid-cols-[1fr_300px] gap-5 items-start">
          <div className="space-y-4">
            <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
              <div className="flex items-start gap-4 flex-wrap">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white font-extrabold flex items-center justify-center shrink-0">{initials}</div>
                <div className="flex-1 min-w-0">
                  <h1 className="font-heading text-2xl font-extrabold text-slate-900 dark:text-white">{job.title}</h1>
                  <div className="flex items-center gap-2 flex-wrap mt-1 text-sm text-slate-500">
                    <span className="font-semibold">{job.company}</span><span>•</span><span className="text-green-600 font-semibold">✓ Verified Employer</span>
                  </div>
                </div>
                <button onClick={saveJob} aria-label="Save job" className={`w-10 h-10 rounded-xl border flex items-center justify-center ${saved ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-slate-200 dark:border-slate-700 text-slate-500'}`}>{saved ? '★' : '☆'}</button>
                <button onClick={copyLink} aria-label="Share job" className="w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 flex items-center justify-center">{copied ? '✓' : '↗'}</button>
              </div>
              <div className="grid sm:grid-cols-4 gap-3 mt-6">
                {[
                  ['Salary', job.salary, '💰'], ['Location', job.location, '📍'], ['Shift', shift, '🕐'], ['Applicants', `${applicants} applied`, '👥'],
                ].map(([label, value, icon]) => (
                  <div key={label} className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3">
                    <p className="text-xs text-slate-400 mb-1">{icon} {label}</p><p className="text-xs font-bold text-slate-800 dark:text-slate-100">{value}</p>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                {[...job.tags, job.type, shift, 'Verified'].map(tag => <span key={tag} className="px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-300 text-xs font-semibold">{tag}</span>)}
              </div>
            </section>

            <section className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-5 flex gap-4 items-center">
              <div className="w-16 h-16 rounded-full border-4 border-white/25 bg-white/15 flex items-center justify-center text-xl font-extrabold shrink-0">{match}%</div>
              <div><h2 className="font-heading font-bold">✨ AI Match Score</h2><p className="text-sm text-blue-100 mt-1">Strong match because your skills, preferred location, and availability align with this verified opportunity.</p></div>
            </section>

            <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="grid grid-cols-3 border-b border-slate-200 dark:border-slate-800">
                {([['details','Job Details'],['company','Company'],['reviews',`Reviews (${3 + job.id})`]] as const).map(([id, label]) => (
                  <button key={id} onClick={() => setTab(id)} className={`py-4 text-sm font-bold border-b-2 ${tab === id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'}`}>{label}</button>
                ))}
              </div>
              {tab === 'details' && (
                <div className="p-6 space-y-6 text-sm text-slate-600 dark:text-slate-300 leading-7">
                  <div><h2 className="font-heading font-bold text-slate-900 dark:text-white mb-2">About this role</h2><p>{job.description || `${job.company} is looking for a reliable ${job.title} to join its growing team. You will collaborate with experienced colleagues, deliver high-quality work, and communicate progress clearly.`}</p><p className="mt-3">This is a strong opportunity for professionals who want flexible work with a verified employer and transparent expectations.</p></div>
                  <DetailList title="Responsibilities" items={[`Complete assigned ${job.title.toLowerCase()} responsibilities`, 'Communicate progress and blockers clearly', 'Coordinate with internal teams and stakeholders', 'Maintain accurate records and meet agreed deadlines', 'Follow company safety and quality standards']} check />
                  <DetailList title="Requirements" items={[`Relevant experience as a ${job.title}`, `Working knowledge of ${job.tags.join(', ')}`, 'Reliable, punctual, and professional attitude', `Available for the ${shift.toLowerCase()}`, 'Good written and verbal communication']} />
                  <DetailList title="Benefits & Perks" items={['Competitive salary and transparent payment', 'Professional working environment', 'Certificate of experience', 'Learning and growth opportunities', 'Possibility of long-term employment', 'Verified employer protection']} check columns />
                </div>
              )}
              {tab === 'company' && <div className="p-6"><h2 className="font-heading font-bold text-slate-900 dark:text-white mb-2">About {job.company}</h2><p className="text-sm leading-7 text-slate-600 dark:text-slate-300">{job.company} is a verified KaamVerse employer with a {job.trust}% Trust Score. Its identity and contact information have been reviewed by the platform.</p></div>}
              {tab === 'reviews' && <div className="p-6 space-y-3">{['Professional and responsive hiring team.','Clear job requirements and timely communication.','A trustworthy employer with a good working environment.'].map((review, index) => <div key={review} className="rounded-xl bg-slate-50 dark:bg-slate-800 p-4"><div className="text-amber-500 mb-1">★★★★★</div><p className="text-sm text-slate-600 dark:text-slate-300">{review}</p><p className="text-xs text-slate-400 mt-2">Verified worker #{index + 1}</p></div>)}</div>}
            </section>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-24">
            <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 text-center">
              <p className="font-heading text-2xl font-extrabold text-emerald-600">{job.salary}</p><p className="text-xs text-slate-400 mb-5">per month · {job.type}</p>
              <button disabled={job.hasApplied} onClick={() => onApply(job)} className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-emerald-600 disabled:cursor-default text-white font-bold text-sm shadow-lg shadow-blue-200 dark:shadow-none">{job.hasApplied ? 'Application Submitted' : 'Apply Now'}</button>
              {!isAuth && <p className="text-xs text-amber-600 mt-2">Login is required before applying.</p>}
              <div className="grid grid-cols-2 gap-2 mt-3"><button onClick={saveJob} className="py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold">{saved ? '★ Saved' : '☆ Save'}</button><button onClick={copyLink} className="py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold">{copied ? '✓ Copied' : '↗ Share'}</button></div>
              <div className="border-t border-slate-100 dark:border-slate-800 mt-5 pt-4 space-y-2 text-xs"><div className="flex justify-between"><span className="text-slate-400">Application deadline</span><strong>{deadline}</strong></div><div className="flex justify-between"><span className="text-slate-400">Open positions</span><strong>{job.positions ?? 1 + job.id % 3}</strong></div><div className="flex justify-between"><span className="text-slate-400">Total applicants</span><strong>{applicants}</strong></div></div>
            </section>
            <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5"><h3 className="font-heading font-bold text-sm mb-3">Have questions?</h3><button onClick={() => isAuth ? navigate('dashboard') : onLogin()} className="w-full py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-blue-600 text-xs font-bold">💬 Message HR</button><p className="text-center text-xs text-slate-400 mt-2">Contact visible after application review</p></section>
            <button onClick={() => isAuth ? setReported(true) : onLogin()} className="w-full text-xs text-slate-400 hover:text-red-500">{reported ? '✓ Report received' : '⚑ Report this job listing'}</button>
          </aside>
        </div>
      </main>
      <section className="bg-slate-950 text-white mt-8"><div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col md:flex-row md:items-center gap-5"><div className="flex-1"><h2 className="font-heading font-bold">Get job alerts delivered to you</h2><p className="text-xs text-slate-400 mt-1">Be the first to know about new jobs matching your skills in Nepal.</p></div><div className="flex gap-2"><input value={alertEmail} onChange={event => setAlertEmail(event.target.value)} placeholder="Enter your email" className="w-56 px-4 py-2.5 rounded-xl bg-slate-800 text-white text-xs outline-none"/><button onClick={() => alertEmail.includes('@') && setSubscribed(true)} className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold">{subscribed ? 'Subscribed ✓' : 'Subscribe →'}</button></div></div></section>
    </div>
  )
}

function DetailList({ title, items, check = false, columns = false }: { title: string; items: string[]; check?: boolean; columns?: boolean }) {
  return <div><h2 className="font-heading font-bold text-slate-900 dark:text-white mb-2">{title}</h2><ul className={columns ? 'grid sm:grid-cols-2 gap-x-6' : ''}>{items.map(item => <li key={item} className="flex gap-2"><span className={check ? 'text-emerald-500' : 'text-blue-500'}>{check ? '⊙' : '›'}</span><span>{item}</span></li>)}</ul></div>
}

function MarketplaceListingDetail({ selection, onBack, onPrimary }: { selection: MarketplaceSelection; onBack: () => void; onPrimary: () => void }) {
  if (selection.kind === 'freelancer') {
    const freelancer = selection.item
    return <UnifiedDetailPage backLabel="Back to Freelancers" onBack={onBack} icon={freelancer.initials} title={freelancer.name} subtitle={freelancer.title} verifiedLabel="Verified Freelancer" score={freelancer.trust} scoreTitle="Talent Match Score" scoreMessage={`${freelancer.name}'s verified skills, experience, rating, and work history make this a strong professional match.`} facts={[{ label: 'Rating', value: `${freelancer.rating} / 5`, icon: '★' }, { label: 'Reviews', value: String(freelancer.reviews), icon: '☷' }, { label: 'Completed jobs', value: String(freelancer.jobs), icon: '✓' }, { label: 'Trust score', value: `${freelancer.trust}%`, icon: '✣' }]} tags={['Freelancer', 'Verified', ...freelancer.skills]} descriptionTitle="About this professional" description={`${freelancer.name} is a verified ${freelancer.title.toLowerCase()} available for flexible projects through KaamVerse. Their identity, profile information, and professional skills have been reviewed.`} sections={[{ title: 'Core capabilities', items: freelancer.skills.map(skill => `Professional experience with ${skill}`), check: true }, { title: 'What you can expect', items: ['Clear project communication and progress updates', 'Agreed delivery schedule and scope', 'Work managed through a verified KaamVerse account', 'Secure conversation history and reporting support'] }, { title: 'Hiring benefits', items: ['Verified professional profile', 'Transparent hourly pricing', 'Documented work history', 'Access to KaamVerse safety support'], check: true, columns: true }]} primaryValue={freelancer.rate} primaryMeta="verified hourly rate" primaryLabel="Hire Now" onPrimary={onPrimary} onMessage={onPrimary} onReport={onPrimary} profileTitle="Professional Profile" profileBody={`${freelancer.name} has completed ${freelancer.jobs} jobs and maintains a ${freelancer.rating} rating from ${freelancer.reviews} reviews.`} reviewsSummary={`${freelancer.rating} average rating from ${freelancer.reviews} verified reviews.`} />
  }
  if (selection.kind === 'gig') {
    const gig = selection.item
    const score = Math.min(99, 90 + gig.id)
    return <UnifiedDetailPage backLabel="Back to Gigs" onBack={onBack} icon={gig.icon} title={gig.title} subtitle={gig.category} verifiedLabel="Verified Gig" score={score} scoreTitle="Opportunity Match Score" scoreMessage={`This verified on-demand opportunity offers ${gig.duration.toLowerCase()} work in ${gig.location}.`} facts={[{ label: 'Payment', value: gig.pay, icon: '💰' }, { label: 'Location', value: gig.location, icon: '⌖' }, { label: 'Schedule', value: gig.duration, icon: '◷' }, { label: 'Open spots', value: String(gig.available), icon: '♧' }]} tags={['On-Demand', gig.category, 'Verified', gig.urgent ? 'Urgent' : 'Available']} descriptionTitle="About this gig" description={`${gig.title} is a verified on-demand opportunity posted for workers who need flexible, clearly scheduled work.`} sections={[{ title: 'Responsibilities', items: [`Complete assigned ${gig.category.toLowerCase()} tasks safely`, 'Confirm availability before accepting work', 'Communicate progress and delays clearly', 'Follow the agreed time and location'], check: true }, { title: 'Requirements', items: ['A completed KaamVerse profile', 'Availability for the stated schedule', 'Reliable and professional conduct', 'Required equipment or transport for the task'] }, { title: 'Safety and support', items: ['Verified account communication', 'Clear payment terms', 'Report and support access', 'Recorded application activity'], check: true, columns: true }]} primaryValue={gig.pay} primaryMeta={gig.duration} primaryLabel="Apply Now" onPrimary={onPrimary} onMessage={onPrimary} onReport={onPrimary} profileTitle="Gig Information" profileBody={`${gig.available} positions are currently available in ${gig.location}.`} />
  }
  const service = selection.item
  const initials = service.provider.split(/\s+/).map(word => word[0]).join('').slice(0, 2)
  const score = Math.round(service.rating * 20)
  return <UnifiedDetailPage backLabel="Back to Services" onBack={onBack} icon={initials} title={service.title} subtitle={`by ${service.provider}`} verifiedLabel="Verified Service" score={score} scoreTitle="Service Quality Score" scoreMessage={`${service.provider}'s rating, delivery record, and verified service profile indicate a strong quality match.`} facts={[{ label: 'Starting price', value: service.price, icon: '💰' }, { label: 'Delivery', value: service.delivery, icon: '◷' }, { label: 'Rating', value: `${service.rating} / 5`, icon: '★' }, { label: 'Reviews', value: String(service.reviews), icon: '☷' }]} tags={[service.category, 'Verified', ...service.tags]} descriptionTitle="About this service" description={`${service.title} is delivered by ${service.provider}, a verified KaamVerse service provider. Requirements, milestones, and delivery expectations can be agreed through a recorded conversation.`} sections={[{ title: 'Service includes', items: service.tags.map(tag => `${tag} planning and professional delivery`), check: true }, { title: 'How ordering works', items: ['Describe your requirements and preferred schedule', 'Confirm the scope, delivery date, and price', 'Keep project communication inside KaamVerse', 'Review the completed service'] }, { title: 'Client protection', items: ['Verified provider profile', 'Transparent starting price', 'Recorded conversation and booking', 'Reporting and support access'], check: true, columns: true }]} primaryValue={service.price} primaryMeta={`delivery in ${service.delivery}`} primaryLabel="Order Now" onPrimary={onPrimary} onMessage={onPrimary} onReport={onPrimary} profileTitle="Service Provider" profileBody={`${service.provider} maintains a ${service.rating} rating across ${service.reviews} verified service reviews.`} reviewsSummary={`${service.rating} average rating from ${service.reviews} verified reviews.`} />
}

// ─── Freelance Page ───────────────────────────────────────────────────────────

function FreelancePage({ navigate, onRequireLogin, onSelectListing }: { navigate: (p: Page) => void; onRequireLogin: () => void; onSelectListing: (selection: MarketplaceSelection, backPage: Page) => void }) {
  return (
    <div>
      <section className="py-16 bg-gradient-to-br from-violet-50 to-white dark:from-violet-950 dark:to-slate-950">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h1 className="font-heading text-4xl font-extrabold text-slate-900 dark:text-white mb-4">Featured Freelance Projects</h1>
          <p className="text-lg text-slate-500 dark:text-slate-400 mb-8">Hire Nepal's top verified freelancers — or find your next project</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={() => navigate('contact')} className="px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-xl text-sm">Post a Project</button>
            <button onClick={() => navigate('contact')} className="px-6 py-3 border border-violet-200 dark:border-violet-800 text-violet-600 dark:text-violet-400 font-semibold rounded-xl hover:bg-violet-50 dark:hover:bg-violet-950 text-sm">Get Started as a Freelancer</button>
          </div>
        </div>
      </section>
      <section className="py-16 bg-white dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <h2 className="font-heading text-2xl font-bold text-slate-900 dark:text-white mb-8">Top Verified Freelancers</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FREELANCERS.map(f => <FreelancerCard key={f.id} f={f} onPrimary={onRequireLogin} onView={() => onSelectListing({ kind: 'freelancer', item: f }, 'freelance')} />)}
          </div>
        </div>
      </section>
    </div>
  )
}

// ─── Gigs Page ────────────────────────────────────────────────────────────────

function GigsPage({ navigate, onRequireLogin, onSelectListing }: { navigate: (p: Page) => void; onRequireLogin: () => void; onSelectListing: (selection: MarketplaceSelection, backPage: Page) => void }) {
  const [filter, setFilter] = useState('All')
  const cats = ['All', 'Delivery', 'Education', 'Creative', 'Services', 'Tech']
  const filtered = filter === 'All' ? GIGS : GIGS.filter(g => g.category === filter)

  return (
    <div>
      <section className="py-16 bg-gradient-to-br from-amber-50 to-white dark:from-amber-950 dark:to-slate-950">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h1 className="font-heading text-4xl font-extrabold text-slate-900 dark:text-white mb-4">On-Demand Gigs</h1>
          <p className="text-lg text-slate-500 dark:text-slate-400">Instant work opportunities. Start earning today.</p>
        </div>
      </section>
      <section className="py-12 bg-white dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-wrap gap-2 mb-8">
            {cats.map(c => (
              <button key={c} onClick={() => setFilter(c)} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${filter === c ? 'bg-amber-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-amber-50 hover:text-amber-600'}`}>{c}</button>
            ))}
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map(g => <GigCard key={g.id} gig={g} onPrimary={onRequireLogin} onView={() => onSelectListing({ kind: 'gig', item: g }, 'gigs')} />)}
          </div>
          <div className="text-center mt-10">
            <button onClick={() => navigate('contact')} className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl text-sm">Post a Gig — Get Started</button>
          </div>
        </div>
      </section>
    </div>
  )
}

// ─── Services Page ────────────────────────────────────────────────────────────

function ServicesPage({ navigate, onRequireLogin, onSelectListing }: { navigate: (p: Page) => void; onRequireLogin: () => void; onSelectListing: (selection: MarketplaceSelection, backPage: Page) => void }) {
  return (
    <div>
      <section className="py-16 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950 dark:to-slate-950">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h1 className="font-heading text-4xl font-extrabold text-slate-900 dark:text-white mb-4">Featured Services</h1>
          <p className="text-lg text-slate-500 dark:text-slate-400">Professional services from Nepal's most verified providers</p>
        </div>
      </section>
      <section className="py-12 bg-white dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {SERVICES.map(s => <ServiceCard key={s.id} svc={s} onPrimary={onRequireLogin} onView={() => onSelectListing({ kind: 'service', item: s }, 'services')} />)}
          </div>
          <div className="text-center mt-10">
            <button onClick={() => navigate('contact')} className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm">List Your Service — Get Started</button>
          </div>
        </div>
      </section>
    </div>
  )
}

// ─── Testimonials Page ────────────────────────────────────────────────────────

function TestimonialsPage({ navigate }: { navigate: (p: Page) => void }) {
  return (
    <div>
      <section className="py-20 bg-gradient-to-br from-blue-50 to-white dark:from-slate-950 dark:to-slate-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <span className="inline-block text-xs font-semibold px-3 py-1.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 mb-5 uppercase tracking-wide">Testimonials</span>
          <h1 className="font-heading text-5xl font-extrabold text-slate-900 dark:text-white mb-5">Loved by Nepal's Workforce</h1>
          <p className="text-xl text-slate-500 dark:text-slate-400 leading-relaxed">Real stories from professionals, freelancers, gig workers, and businesses who transformed their careers with KaamVerse.</p>
        </div>
      </section>
      <section className="py-20 bg-white dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
            {TESTIMONIALS.map(t => (
              <div key={t.name} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm hover:shadow-lg transition-shadow">
                <div className="flex items-center gap-1 mb-4">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <svg key={i} className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mb-6 italic">&ldquo;{t.text}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-heading font-bold text-sm shrink-0" style={{ backgroundColor: t.color }}>
                    {t.initials}
                  </div>
                  <div>
                    <div className="font-heading font-semibold text-slate-900 dark:text-white text-sm">{t.name}</div>
                    <div className="text-xs text-slate-400">{t.role} · {t.company}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-12 text-center">
            <h2 className="font-heading text-3xl font-bold text-white mb-4">Share Your KaamVerse Story</h2>
            <p className="text-blue-100 mb-8">Help others by sharing how KaamVerse transformed your career.</p>
            <button onClick={() => navigate('contact')} className="px-8 py-4 bg-white text-blue-600 font-bold rounded-xl hover:bg-blue-50 transition-colors text-sm">
              Get Started & Share Your Story →
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}

// ─── FAQ Page ─────────────────────────────────────────────────────────────────

function FAQPage({ navigate }: { navigate: (p: Page) => void }) {
  const [open, setOpen] = useState<number | null>(null)

  return (
    <div>
      <section className="py-20 bg-gradient-to-br from-blue-50 to-white dark:from-slate-950 dark:to-slate-900">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <span className="inline-block text-xs font-semibold px-3 py-1.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 mb-5 uppercase tracking-wide">FAQ</span>
          <h1 className="font-heading text-5xl font-extrabold text-slate-900 dark:text-white mb-5">Frequently Asked Questions</h1>
          <p className="text-xl text-slate-500 dark:text-slate-400">Everything you need to know about KaamVerse.</p>
        </div>
      </section>
      <section className="py-20 bg-white dark:bg-slate-950">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="space-y-3 mb-12">
            {FAQS.map((f, i) => (
              <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
                <button className="w-full flex items-center justify-between px-6 py-5 text-left" onClick={() => setOpen(open === i ? null : i)}>
                  <span className="font-heading font-semibold text-slate-900 dark:text-white text-sm pr-4">{f.q}</span>
                  <svg className={`w-5 h-5 text-slate-400 transition-transform duration-200 shrink-0 ${open === i ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {open === i && (
                  <div className="px-6 pb-6">
                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{f.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="bg-blue-50 dark:bg-blue-950 rounded-2xl p-8 text-center border border-blue-100 dark:border-blue-900">
            <h3 className="font-heading font-bold text-slate-900 dark:text-white mb-2">Still have questions?</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">Our support team is available 7 days a week to help you.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button onClick={() => navigate('contact')} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm transition-colors">Contact Support</button>
              <button onClick={() => navigate('help')} className="px-5 py-2.5 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 font-semibold rounded-xl text-sm hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors">Visit Help Center</button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

// ─── Contact Page ─────────────────────────────────────────────────────────────

function ContactPage({ navigate: _navigate }: { navigate: (p: Page) => void }) {
  const [form, setForm] = useState({ name: '', email: '', type: 'general', message: '' })
  const [sent, setSent] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSent(true)
  }

  return (
    <div>
      <section className="py-20 bg-gradient-to-br from-blue-50 to-white dark:from-slate-950 dark:to-slate-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h1 className="font-heading text-5xl font-extrabold text-slate-900 dark:text-white mb-5">Get in Touch</h1>
          <p className="text-xl text-slate-500 dark:text-slate-400">Ready to start your journey on KaamVerse? Our team is here to help.</p>
        </div>
      </section>
      <section className="py-20 bg-white dark:bg-slate-950">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-16">
            <div>
              <h2 className="font-heading text-2xl font-bold text-slate-900 dark:text-white mb-6">Send Us a Message</h2>
              {sent ? (
                <div className="bg-green-50 dark:bg-green-950 rounded-2xl border border-green-200 dark:border-green-900 p-8 text-center">
                  <div className="text-4xl mb-4">✅</div>
                  <h3 className="font-heading font-bold text-green-800 dark:text-green-200 text-xl mb-2">Message Sent!</h3>
                  <p className="text-green-700 dark:text-green-300 text-sm">Our team will get back to you within 24 hours.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Full Name</label>
                      <input
                        type="text"
                        required
                        value={form.name}
                        onChange={e => setForm({ ...form, name: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        placeholder="Aarav Sharma"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Email Address</label>
                      <input
                        type="email"
                        required
                        value={form.email}
                        onChange={e => setForm({ ...form, email: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        placeholder="you@example.com"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">I am a...</label>
                    <select
                      value={form.type}
                      onChange={e => setForm({ ...form, type: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                      <option value="general">Job Seeker</option>
                      <option value="employer">Employer / Company</option>
                      <option value="freelancer">Freelancer</option>
                      <option value="gig">Gig Worker</option>
                      <option value="service">Service Provider</option>
                      <option value="media">Media / Press</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Message</label>
                    <textarea
                      required
                      rows={5}
                      value={form.message}
                      onChange={e => setForm({ ...form, message: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                      placeholder="Tell us how we can help you..."
                    />
                  </div>
                  <button type="submit" className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors text-sm">
                    Send Message →
                  </button>
                </form>
              )}
            </div>

            <div>
              <h2 className="font-heading text-2xl font-bold text-slate-900 dark:text-white mb-6">Other Ways to Reach Us</h2>
              <div className="space-y-5">
                {[
                  { icon: '📧', title: 'Email Support', value: 'hello@kaamverse.com.np', sub: 'Response within 24 hours' },
                  { icon: '📞', title: 'Phone Support', value: '+977-1-4567890', sub: 'Mon–Fri, 9am–6pm NST' },
                  { icon: '💬', title: 'Live Chat', value: 'Available on platform', sub: 'Mon–Sat, 8am–8pm NST' },
                  { icon: '📍', title: 'Office Address', value: 'Thamel, Kathmandu 44600', sub: 'Nepal' },
                ].map(c => (
                  <div key={c.title} className="flex items-start gap-4 bg-slate-50 dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800">
                    <div className="text-2xl shrink-0">{c.icon}</div>
                    <div>
                      <div className="font-heading font-semibold text-slate-900 dark:text-white text-sm mb-0.5">{c.title}</div>
                      <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">{c.value}</div>
                      <div className="text-xs text-slate-400">{c.sub}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white">
                <h3 className="font-heading font-bold text-xl mb-2">Ready to Get Started?</h3>
                <p className="text-blue-100 text-sm leading-relaxed mb-4">Join 125,000+ professionals on Nepal's most trusted employment platform.</p>
                <div className="flex gap-3">
                  <div className="flex items-center gap-1 text-xs text-blue-200">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                    Free to start
                  </div>
                  <div className="flex items-center gap-1 text-xs text-blue-200">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                    AI-powered matching
                  </div>
                  <div className="flex items-center gap-1 text-xs text-blue-200">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                    100% verified
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

// ─── Privacy Policy ───────────────────────────────────────────────────────────

function PrivacyPage({ navigate }: { navigate: (p: Page) => void }) {
  return (
    <div>
      <section className="py-16 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <h1 className="font-heading text-4xl font-extrabold text-slate-900 dark:text-white mb-3">Privacy Policy</h1>
          <p className="text-slate-500 dark:text-slate-400">Last updated: January 1, 2024</p>
        </div>
      </section>
      <section className="py-16 bg-white dark:bg-slate-950">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="prose prose-slate max-w-none">
            {[
              { title: '1. Information We Collect', body: 'We collect information you provide directly to us, such as when you create an account, apply for jobs, or communicate with other users. This includes name, email address, phone number, national ID details, work history, and payment information. We also collect information automatically when you use our platform, including usage data, device information, and location data.' },
              { title: '2. How We Use Your Information', body: 'We use the information we collect to provide, maintain, and improve our services; process transactions; verify your identity; match you with relevant jobs and opportunities; detect and prevent fraud; send you notifications and updates; and comply with legal obligations.' },
              { title: '3. Trust Score and Verification Data', body: 'Your Trust Score is calculated using aggregated data from your platform activity, verification status, work history, and reviews. This data is used solely to provide trust signals to other users and improve platform safety. Detailed underlying data is not shared with third parties except as required by law.' },
              { title: '4. Information Sharing', body: 'We do not sell your personal information. We share your information with employers, clients, or service providers as necessary to facilitate connections you initiate, with verification partners to confirm your identity and credentials, with payment processors to handle transactions, and with law enforcement when required by applicable law.' },
              { title: '5. Data Security', body: 'We implement industry-standard security measures including AES-256 encryption for data at rest, TLS 1.3 for data in transit, regular security audits, and access controls. However, no method of transmission over the Internet is 100% secure.' },
              { title: '6. Your Rights', body: 'Under Nepal\'s Privacy Act and applicable data protection laws, you have the right to access, correct, or delete your personal information. You may also request a copy of your data, object to certain processing, or withdraw consent for optional data uses. Contact us at privacy@kaamverse.com.np to exercise these rights.' },
            ].map(s => (
              <div key={s.title} className="mb-8">
                <h2 className="font-heading text-xl font-bold text-slate-900 dark:text-white mb-3">{s.title}</h2>
                <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-sm">{s.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 p-5 bg-blue-50 dark:bg-blue-950 rounded-2xl border border-blue-100 dark:border-blue-900">
            <p className="text-sm text-blue-700 dark:text-blue-300">Questions about our privacy practices? <button onClick={() => navigate('contact')} className="font-semibold underline">Contact our Privacy Team</button></p>
          </div>
        </div>
      </section>
    </div>
  )
}

// ─── Terms & Conditions ───────────────────────────────────────────────────────

function TermsPage({ navigate }: { navigate: (p: Page) => void }) {
  return (
    <div>
      <section className="py-16 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <h1 className="font-heading text-4xl font-extrabold text-slate-900 dark:text-white mb-3">Terms & Conditions</h1>
          <p className="text-slate-500 dark:text-slate-400">Last updated: January 1, 2024</p>
        </div>
      </section>
      <section className="py-16 bg-white dark:bg-slate-950">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="space-y-8">
            {[
              { title: '1. Acceptance of Terms', body: 'By accessing or using KaamVerse, you agree to be bound by these Terms and Conditions and our Privacy Policy. If you do not agree to these terms, please do not use our platform.' },
              { title: '2. Platform Usage', body: 'KaamVerse provides a marketplace connecting job seekers, freelancers, gig workers, and service providers with employers and clients. You may use our platform only for lawful purposes and in accordance with these terms.' },
              { title: '3. Account Verification', body: 'Users are required to provide accurate information during registration and verification. KaamVerse reserves the right to suspend or terminate accounts found to contain false or misleading information.' },
              { title: '4. Payment Terms', body: 'All payments are processed through our secure escrow system. Platform fees of 5–8% apply to successful transactions. Employers may subscribe to premium plans for additional features. Refunds are processed according to our Refund Policy.' },
              { title: '5. Trust Score and Reviews', body: 'Trust Scores are calculated algorithmically based on platform activity. Reviews must be honest and based on genuine experiences. False or misleading reviews are prohibited and may result in account suspension.' },
              { title: '6. Prohibited Activities', body: 'Users may not post fraudulent job listings, impersonate others, engage in harassment, attempt to circumvent our payment system, scrape platform data, or violate any applicable laws. Violations may result in immediate account termination.' },
              { title: '7. Limitation of Liability', body: 'KaamVerse acts as a marketplace and is not responsible for the actions of users, employers, or clients. We do not guarantee job outcomes or payment from third parties. Our liability is limited to the fees paid to us in the preceding 3 months.' },
            ].map(s => (
              <div key={s.title}>
                <h2 className="font-heading text-xl font-bold text-slate-900 dark:text-white mb-3">{s.title}</h2>
                <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-sm">{s.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 p-5 bg-blue-50 dark:bg-blue-950 rounded-2xl border border-blue-100 dark:border-blue-900">
            <p className="text-sm text-blue-700 dark:text-blue-300">Questions about our terms? <button onClick={() => navigate('contact')} className="font-semibold underline">Contact our Legal Team</button></p>
          </div>
        </div>
      </section>
    </div>
  )
}

// ─── Help Center ──────────────────────────────────────────────────────────────

function HelpPage({ navigate }: { navigate: (p: Page) => void }) {
  const [search, setSearch] = useState('')

  const articles = [
    { category: 'Getting Started', icon: '🚀', items: ['How to create your account', 'Setting up your profile', 'Understanding Trust Scores', 'Getting verified'] },
    { category: 'Finding Work', icon: '🔍', items: ['How AI matching works', 'Applying to jobs', 'Working with freelance clients', 'Finding gigs near you'] },
    { category: 'Payments & Escrow', icon: '💰', items: ['How escrow works', 'Withdrawing earnings', 'Payment methods', 'Refund policy'] },
    { category: 'Safety & Trust', icon: '🛡️', items: ['Reporting fraud', 'Verification process', 'Dispute resolution', 'Account security'] },
    { category: 'For Employers', icon: '🏢', items: ['Posting a job', 'Company verification', 'Subscription plans', 'Managing applications'] },
    { category: 'Account & Settings', icon: '⚙️', items: ['Profile settings', 'Notification preferences', 'Privacy controls', 'Deleting your account'] },
  ]

  return (
    <div>
      <section className="py-20 bg-gradient-to-br from-blue-600 to-indigo-700">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h1 className="font-heading text-4xl font-extrabold text-white mb-4">How can we help you?</h1>
          <p className="text-blue-100 mb-8">Search our help center or browse articles below</p>
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search for help articles..."
              className="w-full px-6 py-4 rounded-2xl text-slate-900 placeholder:text-slate-400 text-sm outline-none focus:ring-2 focus:ring-blue-400 shadow-xl"
            />
            <button onClick={() => search.trim() && navigate('faq')} className="absolute right-3 top-1/2 -translate-y-1/2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold">
              Search
            </button>
          </div>
        </div>
      </section>
      <section className="py-20 bg-white dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
            {articles.map(a => (
              <div key={a.category} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 hover:shadow-lg transition-shadow">
                <div className="text-3xl mb-3">{a.icon}</div>
                <h3 className="font-heading font-bold text-slate-900 dark:text-white mb-4">{a.category}</h3>
                <ul className="space-y-2">
                  {a.items.map(item => (
                    <li key={item}>
                      <button onClick={() => navigate('faq')} className="text-sm text-blue-600 dark:text-blue-400 hover:underline text-left">{item}</button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="bg-slate-50 dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-100 dark:border-slate-800">
            <h2 className="font-heading text-2xl font-bold text-slate-900 dark:text-white mb-3">Still need help?</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-6">Our support team is available 7 days a week</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button onClick={() => navigate('contact')} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm transition-colors">
                Contact Support
              </button>
              <button onClick={() => navigate('faq')} className="px-6 py-3 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-sm hover:border-blue-300 hover:text-blue-600 transition-colors">
                View FAQ
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

// ─── Main App ─────────────────────────────────────────────────────────────────

type UserRole = 'seeker' | 'employer' | 'employer-individual' | 'admin'

interface MarketingExperienceProps {
  page: Page
  navigate: (page: Page) => void
  dark: boolean
  setDark: (value: boolean) => void
  lang: 'en' | 'np'
  setLang: (value: 'en' | 'np') => void
  onLogin: () => void
  onRegister: () => void
  isAuth: boolean
  userRole: UserRole | null
  onLogout: () => void
  authenticatedWorkspace: ReactNode | null
}

export function MarketingExperience({
  page,
  navigate,
  dark,
  setDark,
  lang,
  setLang,
  onLogin,
  onRegister,
  isAuth,
  userRole,
  onLogout,
  authenticatedWorkspace,
}: MarketingExperienceProps) {
  const dialog = useActionDialog()
  const requestedJob = Number(new URLSearchParams(window.location.search).get('job'))
  const [selectedJob, setSelectedJob] = useState(() => JOBS.find(job => job.id === requestedJob) || JOBS[0])
  const [publicJobs, setPublicJobs] = useState<MarketingJob[]>(JOBS)
  const [publicSearch, setPublicSearch] = useState('')
  const [publicLocation, setPublicLocation] = useState('')
  const [publicStats, setPublicStats] = useState({ verified_companies: 0, professionals: 0, active_jobs: 0, active_services: 0 })
  const [selectedListing, setSelectedListing] = useState<MarketplaceSelection>(listingFromUrl)
  const [listingBackPage, setListingBackPage] = useState<Page>(() => (new URLSearchParams(window.location.search).get('back') as Page) || 'freelance')

  useEffect(() => {
    let active = true
    void api.jobs.list().then(response => {
      if (!active || !response.results.length) return
      const jobs = response.results.map(mapApiJob)
      setPublicJobs(jobs)
      if (page === 'job-details') setSelectedJob(jobs.find(job => job.id === requestedJob) || jobs[0])
    }).catch(() => undefined)
    return () => { active = false }
  }, [isAuth])

  useEffect(() => {
    void api.publicStats().then(setPublicStats).catch(() => undefined)
  }, [])

  const searchJobs = (query: string, _type: string, location: string) => {
    setPublicSearch(query)
    setPublicLocation(location)
    navigate('jobs')
  }
  const showJob = (job: MarketingJob) => {
    setSelectedJob(job)
    const url = new URL(window.location.href)
    url.searchParams.set('page', 'job-details')
    url.searchParams.set('job', String(job.id))
    window.history.replaceState({}, '', `${url.pathname}${url.search}`)
    navigate('job-details')
  }
  const applyForJob = async (job: MarketingJob) => {
    setSelectedJob(job)
    if (!isAuth) { onLogin(); return }
    if (userRole !== 'seeker') {
      await dialog.alert({
        title: 'Jobseeker account required',
        message: 'Only jobseeker accounts can submit job applications. You can still view and save this listing.',
        variant: 'warning',
      })
      return
    }
    if (job.hasApplied) {
      showToast('info', 'Already applied', `Your application for ${job.title} has already been submitted.`)
      return
    }
    const confirmed = await dialog.confirm({
      title: `Apply for ${job.title}?`,
      message: `Your KaamVerse profile and application will be shared with ${job.company}. You can track its status from your Applications page.`,
      confirmLabel: 'Submit application',
      variant: 'info',
    })
    if (!confirmed) return
    try {
      await api.applications.create(job.id)
      const updated = {
        ...job,
        hasApplied: true,
        applicationCount: (job.applicationCount ?? 0) + 1,
      }
      setSelectedJob(updated)
      setPublicJobs(current => current.map(item => item.id === job.id ? updated : item))
      showToast('success', 'Application submitted', `Your application for ${job.title} was sent to ${job.company}.`)
      window.dispatchEvent(new CustomEvent('kaamverse:notifications-refresh'))
    } catch (error) {
      showToast('error', 'Application not submitted', error instanceof Error ? error.message : 'Please try again.')
    }
  }
  const savePublicJob = async (job: MarketingJob) => {
    if (!isAuth) { onLogin(); return false }
    try {
      const result = await api.savedJobs.toggle(job.id)
      return result.saved
    } catch {
      return Boolean(job.saved)
    }
  }
  const openAuthenticatedMarketplace = () => isAuth ? navigate('dashboard') : onLogin()
  const showListing = (selection: MarketplaceSelection, backPage: Page) => {
    setSelectedListing(selection)
    setListingBackPage(backPage)
    const url = new URL(window.location.href)
    url.searchParams.set('page', 'listing-details')
    url.searchParams.set('kind', selection.kind)
    url.searchParams.set('listing', String(selection.item.id))
    url.searchParams.set('back', backPage)
    window.history.replaceState({}, '', `${url.pathname}${url.search}`)
    navigate('listing-details')
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-white transition-colors duration-300">
      <Navbar navigate={navigate} current={page} dark={dark} setDark={setDark} lang={lang} setLang={setLang}
        onLogin={onLogin} onRegister={onRegister} isAuth={isAuth} userRole={userRole} onLogout={onLogout}
        onSearch={query => searchJobs(query, 'all', '')} />
      {page === 'dashboard' && authenticatedWorkspace ? authenticatedWorkspace : (
        <>
          <main>
            {page === 'home' && <HomePage navigate={navigate} jobs={publicJobs} onJobSearch={searchJobs} onSelectJob={showJob} onApply={applyForJob} onSave={savePublicJob} onRequireLogin={onLogin} onCreateAccount={onRegister} onSelectListing={showListing} />}
            {page === 'about' && <AboutPage navigate={navigate} />}
            {page === 'features' && <FeaturesPage navigate={navigate} />}
            {page === 'ai-features' && <AIFeaturesPage navigate={navigate} />}
            {page === 'trust-safety' && <TrustSafetyPage navigate={navigate} />}
            {page === 'employment-types' && <EmploymentTypesPage navigate={navigate} />}
            {page === 'services-marketplace' && <ServicesMarketplacePage navigate={navigate} onRequireLogin={openAuthenticatedMarketplace} onSelectListing={showListing} />}
            {page === 'companies' && <CompaniesPage navigate={navigate} />}
            {page === 'company-details' && <CompanyDetailsPage navigate={navigate} />}
            {page === 'jobs' && <JobsPage navigate={navigate} jobs={publicJobs} isAuth={isAuth} searchQuery={publicSearch} searchLocation={publicLocation} onSearchChange={(query, location) => { setPublicSearch(query); setPublicLocation(location) }} onSelectJob={showJob} onApply={applyForJob} onSave={savePublicJob} />}
            {page === 'job-details' && <JobDetailsPage job={selectedJob} navigate={navigate} isAuth={isAuth} onApply={applyForJob} onLogin={onLogin} />}
            {page === 'freelance' && <FreelancePage navigate={navigate} onRequireLogin={openAuthenticatedMarketplace} onSelectListing={showListing} />}
            {page === 'gigs' && <GigsPage navigate={navigate} onRequireLogin={openAuthenticatedMarketplace} onSelectListing={showListing} />}
            {page === 'services' && <ServicesPage navigate={navigate} onRequireLogin={openAuthenticatedMarketplace} onSelectListing={showListing} />}
            {page === 'listing-details' && <MarketplaceListingDetail selection={selectedListing} onBack={() => navigate(listingBackPage)} onPrimary={openAuthenticatedMarketplace} />}
            {page === 'testimonials' && <TestimonialsPage navigate={navigate} />}
            {page === 'faq' && <FAQPage navigate={navigate} />}
            {page === 'contact' && <ContactPage navigate={navigate} />}
            {page === 'privacy' && <PrivacyPage navigate={navigate} />}
            {page === 'terms' && <TermsPage navigate={navigate} />}
            {page === 'help' && <HelpPage navigate={navigate} />}
          </main>
          {page !== 'job-details' && page !== 'listing-details' && <Footer navigate={navigate} verifiedCompanies={publicStats.verified_companies} />}
        </>
      )}
    </div>
  )
}
