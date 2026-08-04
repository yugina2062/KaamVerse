import { createContext, useContext, useEffect, useRef, useState } from "react"
import { api, ApiError } from "@/lib/api/client"
import type { ApiApplication, ApiJob, ApiServiceListing, ApiUser, ApiVerification } from "@/lib/api/types"
import {
  PreferenceToggle,
  useActionDialog,
} from "@/components/ui/ActionDialogs"
import {
  ExactScheduleEditor,
  scheduleCovers,
  scheduleHasTimes,
  scheduleSummary,
  singleRangeSchedule,
  type ExactSchedule,
} from "@/components/ui/ExactScheduleEditor"
import { EmailPreferences } from "@/components/ui/SystemFeedback"
import { MessagesWorkspace } from "@/features/messaging/MessagesWorkspace"
import { UnifiedDetailPage } from "@/components/marketplace/UnifiedDetailPage"
import { SecurityCenter } from "@/components/settings/SecurityCenter"
import { DocumentVerificationPanel } from "@/components/settings/DocumentVerificationPanel"

type Section = "dashboard" | "find-work" | "applications" | "saved" | "messages" | "services" | "ai-hub" | "trust" | "settings"

type SeekerUserView = {
  name: string
  initials: string
  title: string
  location: string
  trustScore: number
  aiMatch: number
  resumeScore: number
  profileCompletion: number
  badge: string
  verificationLevel: number
}

const DEFAULT_SEEKER_USER: SeekerUserView = {
  name: "KaamVerse Seeker",
  initials: "KS",
  title: "Job Seeker",
  location: "Nepal",
  trustScore: 20,
  aiMatch: 0,
  resumeScore: 20,
  profileCompletion: 20,
  badge: "Basic Verified",
  verificationLevel: 1,
}

const SeekerUserContext = createContext<SeekerUserView>(DEFAULT_SEEKER_USER)
function useSeekerUser() {
  return useContext(SeekerUserContext)
}

function mapSeekerUser(user: ApiUser, recommendationCount = 0): SeekerUserView {
  const name = `${user.first_name} ${user.last_name}`.trim() || user.email
  const completion = user.seeker_profile?.profile_completion ?? 20
  return {
    name,
    initials: initials(name),
    title: user.seeker_profile?.headline || "Job Seeker",
    location: user.seeker_profile?.preferred_location || "Nepal",
    trustScore: user.trust_score,
    aiMatch: Math.min(99, Math.max(recommendationCount ? 55 + recommendationCount * 4 : completion, completion)),
    resumeScore: user.seeker_profile?.resume ? Math.max(completion, 72) : Math.max(20, completion - 10),
    profileCompletion: completion,
    badge: verificationBadge(user.verification_level),
    verificationLevel: user.verification_level,
  }
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function Ico({ d, cls = "w-5 h-5" }: { d: string; cls?: string }) {
  return (
    <svg
      className={cls}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  )
}

const IC = {
  home: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
  search: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  doc: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  bookmark: "M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z",
  briefcase: "M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2",
  chat: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",
  brain:
    "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z",
  shield:
    "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
  gear: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
  logout:
    "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1",
  filter:
    "M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z",
  grid: "M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z",
  list: "M4 6h16M4 10h16M4 14h16M4 18h16",
  x: "M6 18L18 6M6 6l12 12",
  check: "M5 13l4 4L19 7",
  send: "M12 19l9 2-9-18-9 18 9-2zm0 0v-8",
  paper:
    "M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13",
  mic: "M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z",
  video:
    "M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z",
  phone:
    "M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z",
  star: "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z",
  plus: "M12 4v16m8-8H4",
  eye: "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z",
  arrow: "M9 5l7 7-7 7",
  upload: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12",
  info: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  clock: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
  map: "M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z",
}

// ─── Shared Components ────────────────────────────────────────────────────────

function MatchRing({ pct, size = 44 }: { pct: number; size?: number }) {
  const color = pct >= 90 ? "#22C55E" : pct >= 75 ? "#2563EB" : "#F59E0B"
  const r = size / 2 - 4
  const circ = 2 * Math.PI * r
  return (
    <div
      className="relative inline-flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      <svg
        className="absolute inset-0"
        width={size}
        height={size}
        style={{ transform: "rotate(-90deg)" }}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#E2E8F0"
          strokeWidth={3.5}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={3.5}
          strokeDasharray={`${(pct / 100) * circ} ${circ}`}
          strokeLinecap="round"
        />
      </svg>
      <span
        className="relative z-10 font-bold leading-none"
        style={{ color, fontSize: size <= 44 ? 10 : 12 }}
      >
        {pct}%
      </span>
    </div>
  )
}

function TrustBadge({ level }: { level: string }) {
  const map: Record<string, string> = {
    "Basic Verified":
      "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300",
    "Identity Verified":
      "bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300",
    "Trusted Professional":
      "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300",
  }
  const dots: Record<string, string> = {
    "Basic Verified": "bg-slate-400",
    "Identity Verified": "bg-blue-500",
    "Trusted Professional": "bg-amber-500",
  }
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${map[level] || map["Basic Verified"]}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${dots[level] || "bg-slate-400"}`}
      />
      {level}
    </span>
  )
}

function ScoreBar({
  label,
  value,
  max = 100,
  color = "#2563EB",
}: {
  label: string
  value: number
  max?: number
  color?: string
}) {
  return (
    <div className="mb-2">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-600 dark:text-slate-400">{label}</span>
        <span className="font-semibold text-slate-900 dark:text-white">
          {value}/{max}
        </span>
      </div>
      <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${(value / max) * 100}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}

function Chip({
  label,
  active,
  onClick,
}: {
  label: string
  active?: boolean
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
        active
          ? "bg-blue-600 border-blue-600 text-white"
          : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 hover:border-blue-300"
      }`}
    >
      {label}
    </button>
  )
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const REC_JOBS = [
  {
    id: 1,
    title: "Senior React Developer",
    company: "Leapfrog Technology",
    initials: "LT",
    color: "#2563EB",
    location: "Kathmandu · 2.3km",
    salary: "NPR 80K–1.2L/mo",
    type: "Part-time",
    remote: "Hybrid",
    trust: 98,
    match: 96,
    urgent: false,
    posted: "2d ago",
    skills: ["React", "TypeScript", "Node.js"],
    schedule: "Mon–Fri  9AM–6PM",
    badge: "Trusted Professional",
    description:
      "We are looking for a Senior React Developer to lead frontend architecture and work on exciting client projects. You will mentor junior developers and collaborate closely with design and backend teams.",
    responsibilities: [
      "Architect and build scalable React applications",
      "Lead code reviews and engineering standards",
      "Mentor junior developers",
      "Collaborate with cross-functional teams",
    ],
    requirements: [
      "5+ years React experience",
      "TypeScript proficiency",
      "Experience with REST APIs",
      "Strong problem-solving skills",
    ],
    benefits: [
      "Health insurance",
      "Provident fund",
      "Annual bonus",
      "Flexible WFH policy",
    ],
  },
  {
    id: 2,
    title: "UI/UX Designer",
    company: "eSewa Fonepay",
    initials: "EF",
    color: "#4F46E5",
    location: "Lalitpur · 5.1km",
    salary: "NPR 60K–90K/mo",
    type: "Part-time",
    remote: "Onsite",
    trust: 97,
    match: 89,
    urgent: true,
    posted: "1d ago",
    skills: ["Figma", "Prototyping", "User Research"],
    schedule: "Mon–Fri  10AM–6PM",
    badge: "Identity Verified",
    description:
      "Join eSewa as a UI/UX Designer. Work on one of Nepal's most used fintech apps. Shape the experience for millions of users across Nepal.",
    responsibilities: [
      "Design mobile and web interfaces",
      "Conduct user research and testing",
      "Create wireframes and prototypes",
      "Collaborate with engineering",
    ],
    requirements: [
      "3+ years UI/UX experience",
      "Expert in Figma",
      "Strong portfolio",
      "Mobile design expertise",
    ],
    benefits: [
      "Festival bonus",
      "Medical insurance",
      "Team outings",
      "Learning budget",
    ],
  },
  {
    id: 3,
    title: "Digital Marketing Manager",
    company: "Daraz Nepal",
    initials: "DN",
    color: "#F97316",
    location: "Remote",
    salary: "NPR 50K–70K/mo",
    type: "Part-time",
    remote: "Remote",
    trust: 96,
    match: 83,
    urgent: false,
    posted: "3d ago",
    skills: ["SEO", "Google Ads", "Analytics"],
    schedule: "Mon/Wed/Fri  10AM–2PM",
    badge: "Identity Verified",
    description:
      "Lead our performance marketing campaigns at Daraz Nepal. Drive acquisition and retention through data-driven marketing strategies.",
    responsibilities: [
      "Manage paid advertising campaigns",
      "SEO strategy and execution",
      "Analytics and reporting",
      "Content strategy",
    ],
    requirements: [
      "4+ years digital marketing",
      "Google Ads certified",
      "Strong analytics skills",
      "E-commerce experience preferred",
    ],
    benefits: [
      "Performance bonus",
      "Remote work",
      "Flexible hours",
      "Equipment allowance",
    ],
  },
  {
    id: 4,
    title: "Python Data Scientist",
    company: "CloudFactory",
    initials: "CF",
    color: "#0891B2",
    location: "Kathmandu · 4km",
    salary: "NPR 1L–1.5L/mo",
    type: "Part-time",
    remote: "Hybrid",
    trust: 95,
    match: 79,
    urgent: true,
    posted: "5h ago",
    skills: ["Python", "Machine Learning", "TensorFlow"],
    schedule: "Mon–Fri  9AM–5PM",
    badge: "Trusted Professional",
    description:
      "CloudFactory is looking for a Data Scientist to work on AI annotation and data processing projects for international clients.",
    responsibilities: [
      "Develop and deploy ML models",
      "Maintain data pipelines",
      "Collaborate with international teams",
      "Model evaluation",
    ],
    requirements: [
      "3+ years Python",
      "ML/DL experience",
      "TensorFlow or PyTorch",
      "Statistical analysis",
    ],
    benefits: [
      "USD-linked salary",
      "Health insurance",
      "Conference budget",
      "Remote options",
    ],
  },
  {
    id: 5,
    title: "Node.js Backend Developer",
    company: "F1Soft Group",
    initials: "F1",
    color: "#059669",
    location: "Kathmandu · 3.2km",
    salary: "NPR 75K–1.1L/mo",
    type: "Part-time",
    remote: "Onsite",
    trust: 97,
    match: 91,
    urgent: false,
    posted: "4d ago",
    skills: ["Node.js", "PostgreSQL", "AWS"],
    schedule: "Sun–Thu  10AM–6PM",
    badge: "Identity Verified",
    description:
      "F1Soft Group needs a skilled Node.js developer to work on core payment infrastructure powering Nepal's leading digital payment systems.",
    responsibilities: [
      "Build and maintain REST APIs",
      "Database architecture and optimization",
      "Cloud infrastructure management",
      "Performance tuning",
    ],
    requirements: [
      "4+ years Node.js",
      "SQL and NoSQL databases",
      "AWS experience",
      "System design skills",
    ],
    benefits: [
      "ESOP options",
      "Health insurance",
      "Fuel allowance",
      "25 days annual leave",
    ],
  },
  {
    id: 6,
    title: "DevOps Engineer",
    company: "Verisk Nepal",
    initials: "VN",
    color: "#7C3AED",
    location: "Lalitpur · 8km",
    salary: "NPR 1.2L–1.8L/mo",
    type: "Part-time",
    remote: "Hybrid",
    trust: 96,
    match: 85,
    urgent: false,
    posted: "1w ago",
    skills: ["AWS", "Docker", "Kubernetes"],
    schedule: "Mon–Fri  9AM–5PM",
    badge: "Trusted Professional",
    description:
      "Verisk Nepal is seeking a DevOps Engineer to manage our cloud infrastructure and CI/CD pipelines for international analytics projects.",
    responsibilities: [
      "Manage AWS infrastructure",
      "CI/CD pipeline maintenance",
      "Container orchestration",
      "Security and compliance",
    ],
    requirements: [
      "3+ years DevOps",
      "AWS certified",
      "Docker and Kubernetes expertise",
      "Terraform experience",
    ],
    benefits: [
      "USD salary",
      "Internet allowance",
      "Annual performance bonus",
      "MacBook provided",
    ],
  },
]

const APPLICATIONS = [
  {
    id: 1,
    job: "Senior React Developer",
    company: "Leapfrog Technology",
    initials: "LT",
    color: "#2563EB",
    applied: "Mar 10",
    status: "interview",
    salary: "NPR 80K–1.2L",
    location: "Kathmandu",
    type: "Part-time",
    interviewDate: "Mar 20, 2:00 PM",
    interviewType: "Video Call",
  },
  {
    id: 2,
    job: "UI/UX Designer",
    company: "eSewa Fonepay",
    initials: "EF",
    color: "#4F46E5",
    applied: "Mar 8",
    status: "under-review",
    salary: "NPR 60K–90K",
    location: "Lalitpur",
    type: "Part-time",
    interviewDate: null,
    interviewType: null,
  },
  {
    id: 3,
    job: "Frontend Engineer",
    company: "Ncell",
    initials: "NC",
    color: "#DC2626",
    applied: "Mar 5",
    status: "active",
    salary: "NPR 90K–1.4L",
    location: "Kathmandu",
    type: "Part-time",
    interviewDate: null,
    interviewType: null,
  },
  {
    id: 4,
    job: "React Native Developer",
    company: "Khalti Digital",
    initials: "KD",
    color: "#8B5CF6",
    applied: "Feb 28",
    status: "rejected",
    salary: "NPR 70K–1L",
    location: "Kathmandu",
    type: "Part-time",
    interviewDate: null,
    interviewType: null,
  },
  {
    id: 5,
    job: "JavaScript Developer",
    company: "Cotiviti Nepal",
    initials: "CN",
    color: "#0284C7",
    applied: "Feb 20",
    status: "accepted",
    salary: "NPR 1L–1.5L",
    location: "Lalitpur",
    type: "Part-time",
    interviewDate: null,
    interviewType: null,
  },
]

type MatchBreakdown = {
  total: number; content_total: number; collaborative_total: number;
  skills: number; location: number; job_type: number;
  schedule: number; experience: number; similar_users: number;
  similar_user_count: number;
}
type UiJob = typeof REC_JOBS[number] & {
  shift?: ApiJob["shift_type"]
  salaryMin?: number
  salaryMax?: number
  verificationLevel?: number
  exactSchedule?: ExactSchedule
  applicationCount?: number
  matchBreakdown?: MatchBreakdown | null
}
type UiApplication = Omit<(typeof APPLICATIONS)[number], "status"> & {
  status:
    | "active"
    | "under-review"
    | "interview"
    | "accepted"
    | "rejected"
    | "withdrawn"
}

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0] || "")
      .join("")
      .toUpperCase() || "KV"
  )
}

function downloadTextFile(
  filename: string,
  content: string,
  type = "text/plain",
) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function formatSalary(job: ApiJob) {
  if (!job.salary_min && !job.salary_max) return "Salary negotiable"
  const minimum = job.salary_min
    ? `NPR ${Number(job.salary_min).toLocaleString()}`
    : ""
  const maximum = job.salary_max ? Number(job.salary_max).toLocaleString() : ""
  return maximum
    ? `${minimum}–${maximum}/${job.salary_period}`
    : `${minimum}/${job.salary_period}`
}

function verificationBadge(level: number) {
  return (
    [
      "Basic Verified",
      "Basic Verified",
      "Identity Verified",
      "Trusted Professional",
      "Trusted Professional",
    ][level] || "Basic Verified"
  )
}

function mapJob(job: ApiJob): UiJob {
  const company = job.employer_details.name
  const exactSchedule = job.schedule as ExactSchedule
  return {
    id: job.id,
    title: job.title,
    company,
    initials: initials(company),
    color: "#2563EB",
    location: job.location,
    salary: formatSalary(job),
    type:
      job.employment_type === "part-time"
        ? "Part-time"
        : job.employment_type === "gig"
          ? "On-demand Gig"
          : job.employment_type[0].toUpperCase() + job.employment_type.slice(1),
    remote: job.work_mode[0].toUpperCase() + job.work_mode.slice(1),
    trust: job.employer_details.trust_score,
    match: (job as unknown as Record<string, unknown>).recommendation_breakdown
      ? ((job as unknown as Record<string, unknown>).recommendation_breakdown as MatchBreakdown).total
      : job.match_percentage ?? 70,
    matchBreakdown: ((job as unknown as Record<string, unknown>).recommendation_breakdown as MatchBreakdown | undefined) ?? null,
    urgent: job.is_urgent,
    posted: new Date(job.created_at).toLocaleDateString(),
    skills: job.skills,
    schedule: scheduleHasTimes(exactSchedule)
      ? scheduleSummary(exactSchedule)
      : job.shift_type[0].toUpperCase() + job.shift_type.slice(1),
    shift: job.shift_type,
    exactSchedule,
    applicationCount: job.application_count,
    salaryMin: job.salary_min ? Number(job.salary_min) : undefined,
    salaryMax: job.salary_max ? Number(job.salary_max) : undefined,
    verificationLevel: job.employer_details.verification_level,
    badge: verificationBadge(job.employer_details.verification_level),
    description: job.description,
    responsibilities: [
      "Complete the responsibilities described in the verified job listing",
    ],
    requirements: job.skills.length
      ? job.skills.map((skill) => `${skill} proficiency`)
      : ["Relevant experience for this role"],
    benefits: [
      "Verified employer",
      "Schedule-based matching",
      "Secure in-app application tracking",
    ],
  }
}

function jobSchedule(job: UiJob): ExactSchedule {
  if (scheduleHasTimes(job.exactSchedule)) return job.exactSchedule || {}
  const fallback: Record<string, [string, string]> = {
    morning: ["06:00", "12:00"],
    day: ["09:00", "17:00"],
    evening: ["17:00", "22:00"],
    night: ["20:00", "23:59"],
    weekend: ["09:00", "17:00"],
    flexible: ["00:00", "23:59"],
  }
  const range = fallback[job.shift || "flexible"] || fallback.flexible
  return singleRangeSchedule(range[0], range[1])
}

function mapApplication(application: ApiApplication): UiApplication {
  const job = application.job_details
  const company = job.employer_details.name
  return {
    id: application.id,
    job: job.title,
    company,
    initials: initials(company),
    color: "#2563EB",
    applied: new Date(application.created_at).toLocaleDateString(),
    status: application.status === "submitted" ? "active" : application.status,
    salary: formatSalary(job),
    location: job.location,
    type: job.employment_type,
    interviewDate: null,
    interviewType: null,
  }
}

const CONVERSATIONS = [
  {
    id: 1,
    name: "HR, Leapfrog Technology",
    initials: "LT",
    color: "#2563EB",
    last: "Looking forward to our interview on Monday!",
    time: "2m ago",
    unread: 2,
    online: true,
  },
  {
    id: 2,
    name: "Nisha Shakya",
    initials: "NS",
    color: "#4F46E5",
    last: "Can you share your portfolio?",
    time: "1h ago",
    unread: 0,
    online: false,
  },
  {
    id: 3,
    name: "HR, F1Soft Group",
    initials: "F1",
    color: "#059669",
    last: "Thank you for applying! We'd like to...",
    time: "3h ago",
    unread: 1,
    online: true,
  },
  {
    id: 4,
    name: "Recruiter, Verisk Nepal",
    initials: "VN",
    color: "#7C3AED",
    last: "Your profile looks great for the role",
    time: "1d ago",
    unread: 0,
    online: false,
  },
]

const MESSAGES: Record<number, Array<{
  id: number
  text: string
  from: "me" | "them"
  time: string
}>> = {
  1: [
    {
      id: 1,
      text: "Hello Yugina! Thank you for applying for the Senior React Developer position.",
      from: "them",
      time: "10:00 AM",
    },
    {
      id: 2,
      text: "Hi! Thank you for reaching out. I'm very excited about this opportunity.",
      from: "me",
      time: "10:05 AM",
    },
    {
      id: 3,
      text: "Great! We reviewed your profile and you have a 96% match with our requirements.",
      from: "them",
      time: "10:10 AM",
    },
    {
      id: 4,
      text: "That's wonderful to hear! I'd love to learn more about the team and the projects.",
      from: "me",
      time: "10:15 AM",
    },
    {
      id: 5,
      text: "We'd like to schedule a video interview. Would Monday at 2:00 PM work for you?",
      from: "them",
      time: "10:20 AM",
    },
    {
      id: 6,
      text: "Monday at 2 PM works perfectly for me!",
      from: "me",
      time: "10:22 AM",
    },
    {
      id: 7,
      text: "Looking forward to our interview on Monday! We'll send you a Google Meet link shortly.",
      from: "them",
      time: "2m ago",
    },
  ],
  2: [
    {
      id: 1,
      text: "Hi Yugina! I saw your profile on KaamVerse. Impressive portfolio!",
      from: "them",
      time: "9:00 AM",
    },
    {
      id: 2,
      text: "Thank you so much! I'd love to hear about the opportunity.",
      from: "me",
      time: "9:30 AM",
    },
    {
      id: 3,
      text: "Can you share your portfolio? We have a UI role that might interest you.",
      from: "them",
      time: "1h ago",
    },
  ],
}

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
]

// ─── Dashboard Home ───────────────────────────────────────────────────────────

function DashboardHome({
  setSection,
  jobs,
  savedJobs,
  appliedJobs,
  onApply,
  onToggleSaved,
}: {
  setSection: (s: Section) => void
  jobs: UiJob[]
  savedJobs: number[]
  appliedJobs: number[]
  onApply: (jobId: number) => void
  onToggleSaved: (jobId: number) => void
}) {
  const USER = useSeekerUser()
  const dialog = useActionDialog()
  const [expandedJob, setExpandedJob] = useState<number | null>(null)
  const [selectedJob, setSelectedJob] = useState<UiJob | null>(null)

  const reportJob = async (job: UiJob) => {
    const description = await dialog.prompt({
      title: `Report ${job.title}?`,
      message:
        "Describe misleading content, fee requests, spam, harassment, or another safety concern.",
      placeholder: "Explain what happened for the administrator.",
      confirmLabel: "Submit report",
    })
    if (!description?.trim()) return
    try {
      await api.fraudReports.create({
        job: job.id,
        reason: "other",
        description: description.trim(),
      })
      await dialog.alert({
        title: "Report submitted",
        message: "The Trust & Safety team can now review this job.",
        variant: "success",
      })
    } catch (error) {
      await dialog.alert({
        title: "Report not submitted",
        message: error instanceof Error ? error.message : "Please try again.",
        variant: "danger",
      })
    }
  }

  if (selectedJob)
    return (
      <UnifiedDetailPage
        initialSaved={savedJobs.includes(selectedJob.id)}
        onSave={() => onToggleSaved(selectedJob.id)}
        saveIcon="heart"
        detailsTabLabel="Job Details"
        backLabel="Back to Dashboard"
        onBack={() => setSelectedJob(null)}
        icon={selectedJob.initials}
        title={selectedJob.title}
        subtitle={selectedJob.company}
        verifiedLabel="Verified Employer"
        score={selectedJob.match}
        scoreMessage="This opportunity matches your skills, location, preferred schedule, and availability."
        facts={[
          { label: "Salary", value: selectedJob.salary, icon: "💰" },
          { label: "Location", value: selectedJob.location, icon: "⌖" },
          { label: "Shift", value: selectedJob.schedule, icon: "◷" },
          {
            label: "Applicants",
            value: String(selectedJob.applicationCount ?? 0),
            icon: "♧",
          },
        ]}
        tags={[selectedJob.type, selectedJob.remote, ...selectedJob.skills]}
        descriptionTitle="About this role"
        description={selectedJob.description}
        sections={[
          {
            title: "Responsibilities",
            items: selectedJob.responsibilities,
            check: true,
          },
          { title: "Requirements", items: selectedJob.requirements },
          {
            title: "Benefits & Perks",
            items: selectedJob.benefits,
            check: true,
            columns: true,
          },
        ]}
        primaryValue={selectedJob.salary}
        primaryMeta={`${selectedJob.type} · ${selectedJob.schedule}`}
        primaryLabel={
          appliedJobs.includes(selectedJob.id) ? "Already Applied" : "Apply Now"
        }
        onPrimary={() => {
          if (!appliedJobs.includes(selectedJob.id)) onApply(selectedJob.id)
        }}
        onMessage={() => setSection("messages")}
        onReport={() => void reportJob(selectedJob)}
        profileTitle="Company"
        profileBody={`${selectedJob.company} is a verified KaamVerse employer with a ${selectedJob.trust}% trust score.`}
      />
    )

  const stats = [
    {
      label: "Trust Score",
      value: `${USER.trustScore}`,
      sub: "/100",
      color: "#F59E0B",
      bar: USER.trustScore,
      icon: "🛡️",
    },
    {
      label: "AI Match",
      value: `${USER.aiMatch}%`,
      sub: "",
      color: "#2563EB",
      bar: USER.aiMatch,
      icon: "🤖",
    },
    {
      label: "Resume Score",
      value: `${USER.resumeScore}`,
      sub: "/100",
      color: "#7C3AED",
      bar: USER.resumeScore,
      icon: "📄",
    },
    {
      label: "Profile",
      value: `${USER.profileCompletion}%`,
      sub: "",
      color: "#059669",
      bar: USER.profileCompletion,
      icon: "👤",
    },
    {
      label: "Verification",
      value: `Level ${USER.verificationLevel}`,
      sub: "",
      color: "#22C55E",
      bar: Math.min(100, USER.verificationLevel * 25),
      icon: "✅",
    },
  ]

  const quickActions = [
    {
      icon: "📤",
      label: "Upload Resume",
      color: "bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300",
      fn: () => setSection("settings"),
    },
    {
      icon: "🔍",
      label: "Find Work",
      color:
        "bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300",
      fn: () => setSection("find-work"),
    },
    {
      icon: "✏️",
      label: "Update Profile",
      color:
        "bg-violet-50 dark:bg-violet-950 text-violet-700 dark:text-violet-300",
      fn: () => setSection("settings"),
    },
    {
      icon: "🤖",
      label: "AI Resume Analysis",
      color:
        "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300",
      fn: () => setSection("ai-hub"),
    },
    {
      icon: "🎯",
      label: "AI Career Coach",
      color: "bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300",
      fn: () => setSection("ai-hub"),
    },
  ]

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Welcome */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 rounded-2xl p-6 mb-6 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/3" />
        <div className="relative z-10 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-blue-200 text-sm font-medium mb-1">
              Good morning
            </p>
            <h1 className="font-heading text-2xl font-extrabold mb-2">
              Namaste, {USER.name.split(" ")[0]} 👋
            </h1>
            <div className="flex items-center gap-2 bg-white/10 rounded-xl px-4 py-2.5 text-sm max-w-lg">
              <span className="text-lg">🤖</span>
              <span className="text-blue-100 leading-snug">
                You have{" "}
                <strong className="text-white">{jobs.length} recommended opportunities</strong>{" "}
                matching your skills and availability in{" "}
                {USER.location}. Your current match score is{" "}
                <strong className="text-white">{USER.aiMatch}%</strong>.
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <MatchRing pct={USER.aiMatch} size={64} />
              <p className="text-xs text-blue-200 mt-1 font-medium">AI Match</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center font-heading font-bold text-lg">
              {USER.initials}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        {stats.map((s) => (
          <div
            key={s.label}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-4"
          >
            <div className="text-xl mb-2">{s.icon}</div>
            <div className="flex items-end gap-0.5 mb-1">
              <span className="font-heading font-extrabold text-xl text-slate-900 dark:text-white">
                {s.value}
              </span>
              <span className="text-xs text-slate-400 mb-0.5">{s.sub}</span>
            </div>
            <p className="text-xs text-slate-400 mb-2">{s.label}</p>
            <div className="h-1 bg-slate-100 dark:bg-slate-800 rounded-full">
              <div
                className="h-1 rounded-full"
                style={{ width: `${s.bar}%`, backgroundColor: s.color }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5 mb-6">
        <h2 className="font-heading font-bold text-slate-900 dark:text-white mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {quickActions.map((a) => (
            <button
              key={a.label}
              onClick={a.fn}
              className="flex flex-col items-center gap-2 p-3 rounded-xl hover:scale-105 transition-transform"
            >
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${a.color}`}
              >
                {a.icon}
              </div>
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300 text-center leading-tight">
                {a.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* AI Recommended Jobs */}
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h2 className="font-heading font-bold text-slate-900 dark:text-white">
            AI Recommended For You
          </h2>
          <p className="text-sm text-slate-400">
            Based on your skills, location and availability
          </p>
        </div>
        <button
          onClick={() => setSection("find-work")}
          className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline"
        >
          View all →
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-3 items-start">
        {jobs.map((job) => (
          <div
            key={job.id}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
          >
            <div className="p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center font-heading font-bold text-white text-sm shrink-0"
                    style={{ backgroundColor: job.color }}
                  >
                    {job.initials}
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-slate-900 dark:text-white text-sm leading-tight">
                      {job.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {job.company}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <MatchRing pct={job.match} size={40} />
                  <button
                    type="button"
                    aria-label={
                      savedJobs.includes(job.id)
                        ? "Remove saved job"
                        : "Save job"
                    }
                    title={
                      savedJobs.includes(job.id)
                        ? "Remove saved job"
                        : "Save job"
                    }
                    onClick={() => onToggleSaved(job.id)}
                    className={`w-9 h-9 rounded-xl border flex items-center justify-center text-xl transition-colors ${
                      savedJobs.includes(job.id)
                        ? "border-rose-200 bg-rose-50 dark:bg-rose-950 text-rose-600"
                        : "border-slate-200 dark:border-slate-700 text-slate-400 hover:border-rose-200 hover:text-rose-500"
                    }`}
                  >
                    {savedJobs.includes(job.id) ? "♥" : "♡"}
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 mb-3">
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  {job.type}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  {job.remote}
                </span>
                {job.urgent && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 font-semibold">
                    Urgent
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-400 mb-3">
                <span className="flex items-center gap-1">
                  <Ico d={IC.map} cls="w-3 h-3" />
                  {job.location}
                </span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {job.salary}
                </span>
              </div>

              <div className="flex flex-wrap gap-1 mb-3">
                {job.skills.map((s) => (
                  <span
                    key={s}
                    className="text-xs px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-medium"
                  >
                    {s}
                  </span>
                ))}
              </div>

              <TrustBadge level={job.badge} />

              {expandedJob === job.id && (
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <p className="text-xs font-bold text-slate-900 dark:text-white mb-2">
                    {job.match}% Match Breakdown
                  </p>
                  {(job.matchBreakdown ? [
                    ["Skills Match", job.matchBreakdown.skills, 40] as const,
                    ["Location Match", job.matchBreakdown.location, 20] as const,
                    ["Job Type", job.matchBreakdown.job_type, 10] as const,
                    ["Schedule", job.matchBreakdown.schedule, 10] as const,
                    ["Experience", job.matchBreakdown.experience, 20] as const,
                    ["Similar Users", Math.round(job.matchBreakdown.similar_users * 0.4), 40] as const,
                  ] : [
                    ["Skills Match", Math.round(job.match * 0.4), 40] as const,
                    ["Location Match", Math.round(job.match * 0.2), 20] as const,
                    ["Job Type", Math.round(job.match * 0.1), 10] as const,
                    ["Schedule", Math.round(job.match * 0.1), 10] as const,
                    ["Experience", Math.round(job.match * 0.1), 20] as const,
                    ["Similar Users", Math.round(job.match * 0.1), 40] as const,
                  ]).map(([label, score, max]) => (
                    <div
                      key={label}
                      className="flex justify-between items-center mb-1.5"
                    >
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {label}
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1 bg-slate-100 dark:bg-slate-800 rounded-full">
                          <div
                            className="h-1 rounded-full bg-green-500"
                            style={{ width: `${max > 0 ? Math.round((score / max) * 100) : 0}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-green-600">
                          {score}/{max}
                        </span>
                      </div>
                    </div>
                  ))}
                  {job.matchBreakdown && job.matchBreakdown.similar_user_count > 0 && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 font-medium">
                      🤝 {job.matchBreakdown.similar_user_count} professional{job.matchBreakdown.similar_user_count === 1 ? "" : "s"} with similar interests also engaged with this role
                    </p>
                  )}
                </div>
              )}

              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setSelectedJob(job)}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-colors"
                >
                  View
                </button>
                <button
                  onClick={() =>
                    setExpandedJob(expandedJob === job.id ? null : job.id)
                  }
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:border-blue-300 hover:text-blue-600 transition-colors"
                >
                  Why?
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Find Work ────────────────────────────────────────────────────────────────

function FindWork({
  jobs,
  savedJobs,
  appliedJobs,
  onApply,
  onToggleSaved,
  onMessage,
}: {
  jobs: UiJob[]
  savedJobs: number[]
  appliedJobs: number[]
  onApply: (jobId: number) => void
  onToggleSaved: (jobId: number) => void
  onMessage: () => void
}) {
  const dialog = useActionDialog()
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [search, setSearch] = useState("")
  const [showFilters, setShowFilters] = useState(true)
  const [drawerJob, setDrawerJob] = useState<UiJob | null>(null)
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [selectedRemote, setSelectedRemote] = useState<string[]>([])
  const [avail, setAvail] = useState<Record<string, string>>({})
  const [appliedAvailability, setAppliedAvailability] =
    useState<Record<string, string>>({})
  const [selectedShifts, setSelectedShifts] = useState<string[]>([])
  const [preferredFrom, setPreferredFrom] = useState("")
  const [preferredTo, setPreferredTo] = useState("")
  const [savingSchedule, setSavingSchedule] = useState(false)
  const [salaryMin, setSalaryMin] = useState("")
  const [salaryMax, setSalaryMax] = useState("")
  const [trustMinimum, setTrustMinimum] = useState(0)
  const [verificationMinimum, setVerificationMinimum] = useState(0)

  useEffect(() => {
    api.auth
      .me()
      .then((user) => {
        const saved = (user.seeker_profile?.availability || {}) as ExactSchedule
        setAvail(saved)
        setAppliedAvailability(saved)
      })
      .catch(() => undefined)
  }, [])

  const applyScheduleFilter = async () => {
    const invalidDay = Object.entries(avail).find(([, range]) => {
      const [start = "", end = ""] = String(range).split("-")
      return !start || !end || start >= end
    })
    if (invalidDay) {
      await dialog.alert({
        title: "Check your availability",
        message: `${invalidDay[0]} end time must be later than its start time.`,
        variant: "danger",
      })
      return
    }
    setSavingSchedule(true)
    try {
      await api.auth.updateMe({ seeker_profile: { availability: avail } })
      setAppliedAvailability({ ...avail })
      await dialog.alert({
        title: "Availability applied",
        message:
          "Your exact hours were saved and the job results now match that schedule.",
        variant: "success",
      })
    } catch (error) {
      await dialog.alert({
        title: "Unable to save availability",
        message:
          error instanceof ApiError ? error.message : "Please try again.",
        variant: "danger",
      })
    } finally {
      setSavingSchedule(false)
    }
  }

  const toggleType = (t: string) =>
    setSelectedTypes((p) =>
      p.includes(t) ? p.filter((x) => x !== t) : [...p, t],
    )
  const toggleRemote = (r: string) =>
    setSelectedRemote((p) =>
      p.includes(r) ? p.filter((x) => x !== r) : [...p, r],
    )
  const toggleShift = (shift: string) =>
    setSelectedShifts((current) =>
      current.includes(shift)
        ? current.filter((value) => value !== shift)
        : [...current, shift],
    )
  const shiftMatches = (jobShift: string, preferred: string) => {
    if (
      preferred === "all" ||
      preferred === "flexible" ||
      jobShift.includes("flexible")
    )
      return true
    if (preferred === "afternoon")
      return jobShift.includes("day") || jobShift.includes("afternoon")
    return jobShift.includes(preferred)
  }

  const filtered = jobs.filter((j) => {
    if (
      search &&
      !j.title.toLowerCase().includes(search.toLowerCase()) &&
      !j.company.toLowerCase().includes(search.toLowerCase())
    )
      return false
    if (
      selectedTypes.length &&
      !selectedTypes.some((type) =>
        j.type
          .toLowerCase()
          .includes(
            type
              .toLowerCase()
              .replace("on-demand", "on-demand")
              .replace("services", "service"),
          ),
      )
    )
      return false
    if (selectedRemote.length && !selectedRemote.includes(j.remote))
      return false
    const jobShift = (j.shift || j.schedule).toLowerCase()
    if (
      selectedShifts.length &&
      !selectedShifts.some((shift) => shiftMatches(jobShift, shift))
    )
      return false
    if (
      scheduleHasTimes(appliedAvailability) &&
      !scheduleCovers(appliedAvailability, jobSchedule(j))
    )
      return false
    if (
      preferredFrom &&
      preferredTo &&
      preferredFrom < preferredTo &&
      !scheduleCovers(
        singleRangeSchedule(preferredFrom, preferredTo),
        jobSchedule(j),
      )
    )
      return false
    if (salaryMin && (j.salaryMax ?? j.salaryMin ?? 0) < Number(salaryMin))
      return false
    if (
      salaryMax &&
      (j.salaryMin ?? j.salaryMax ?? Number.MAX_SAFE_INTEGER) >
        Number(salaryMax)
    )
      return false
    if (j.trust < trustMinimum) return false
    if ((j.verificationLevel ?? 0) < verificationMinimum) return false
    return true
  })

  const reportJob = async (job: UiJob) => {
    const description = await dialog.prompt({ title: `Report ${job.title}?`, message: "Describe misleading content, fee requests, spam, harassment, or another safety concern.", placeholder: "Explain what happened for the administrator.", confirmLabel: "Submit report" })
    if (!description?.trim()) return
    try {
      await api.fraudReports.create({ job: job.id, reason: "other", description: description.trim() })
      await dialog.alert({ title: "Report submitted", message: "The Trust & Safety team can now review this job.", variant: "success" })
    } catch (error) { await dialog.alert({ title: "Report not submitted", message: error instanceof Error ? error.message : "Please try again.", variant: "danger" }) }
  }

  if (drawerJob)
    return (
      <UnifiedDetailPage
        initialSaved={savedJobs.includes(drawerJob.id)}
        onSave={() => onToggleSaved(drawerJob.id)}
        saveIcon="heart"
        detailsTabLabel="Job Details"
        backLabel="Back to Jobs"
        onBack={() => setDrawerJob(null)}
        icon={drawerJob.initials}
        title={drawerJob.title}
        subtitle={drawerJob.company}
        verifiedLabel="Verified Employer"
        score={drawerJob.match}
        scoreMessage={`This opportunity matches your skills, preferred location, trust requirements, and available schedule.`}
        facts={[
          { label: "Salary", value: drawerJob.salary, icon: "💰" },
          { label: "Location", value: drawerJob.location, icon: "⌖" },
          { label: "Schedule", value: drawerJob.schedule, icon: "◷" },
          {
            label: "Applicants",
            value: String(drawerJob.applicationCount ?? 0),
            icon: "♧",
          },
        ]}
        tags={[drawerJob.type, drawerJob.remote, ...drawerJob.skills]}
        descriptionTitle="About this role"
        description={drawerJob.description}
        sections={[
          {
            title: "Responsibilities",
            items: drawerJob.responsibilities,
            check: true,
          },
          { title: "Requirements", items: drawerJob.requirements },
          {
            title: "Benefits & Perks",
            items: drawerJob.benefits,
            check: true,
            columns: true,
          },
        ]}
        primaryValue={drawerJob.salary}
        primaryMeta={`${drawerJob.type} · ${drawerJob.schedule}`}
        primaryLabel={
          appliedJobs.includes(drawerJob.id) ? "Already Applied" : "Apply Now"
        }
        onPrimary={() => {
          if (!appliedJobs.includes(drawerJob.id)) onApply(drawerJob.id)
        }}
        onMessage={onMessage}
        onReport={() => void reportJob(drawerJob)}
        profileTitle="Company"
        profileBody={`${drawerJob.company} is a verified KaamVerse employer with a ${drawerJob.trust}% trust score.`}
      />
    )

  return (
    <div className="flex h-full relative">
      {/* Filters Sidebar */}
      {showFilters && (
        <div className="w-72 shrink-0 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 overflow-y-auto p-5 h-full">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-heading font-bold text-slate-900 dark:text-white">
              Filters
            </h3>
            <button
              onClick={() => {
                setSelectedTypes([])
                setSelectedRemote([])
                setAvail({})
                setAppliedAvailability({})
                setSelectedShifts([])
                setPreferredFrom("")
                setPreferredTo("")
                setSalaryMin("")
                setSalaryMax("")
                setTrustMinimum(0)
                setVerificationMinimum(0)
              }}
              className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline"
            >
              Clear all
            </button>
          </div>

          <div className="mb-5">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wide">
              Job Type
            </p>
            {["Part-time", "Freelance", "On-Demand", "Services"].map((t) => (
              <label
                key={t}
                className="flex items-center gap-2 mb-2 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedTypes.includes(t)}
                  onChange={() => toggleType(t)}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  {t}
                </span>
              </label>
            ))}
          </div>

          <div className="mb-5">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wide">
              Work Type
            </p>
            {["Remote", "Hybrid", "Onsite"].map((r) => (
              <button
                key={r}
                onClick={() => toggleRemote(r)}
                className={`mr-2 mb-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  selectedRemote.includes(r)
                    ? "bg-blue-600 border-blue-600 text-white"
                    : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900"
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <div className="mb-5">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wide">
              Salary Range
            </p>
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                value={salaryMin}
                onChange={(event) => setSalaryMin(event.target.value)}
                placeholder="Min"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:border-blue-400"
              />
              <input
                type="number"
                min="0"
                value={salaryMax}
                onChange={(event) => setSalaryMax(event.target.value)}
                placeholder="Max"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:border-blue-400"
              />
            </div>
          </div>

          <div className="mb-5">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wide">
              Preferred Time / Shift
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                "morning",
                "day",
                "evening",
                "night",
                "weekend",
                "flexible",
              ].map((shift) => (
                <button
                  key={shift}
                  type="button"
                  onClick={() => toggleShift(shift)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border capitalize transition-all ${
                    selectedShifts.includes(shift)
                      ? "bg-blue-600 border-blue-600 text-white"
                      : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900"
                  }`}
                >
                  {shift}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <label className="text-[11px] text-slate-500">
                From
                <input
                  aria-label="Preferred time from"
                  type="time"
                  value={preferredFrom}
                  onChange={(event) => setPreferredFrom(event.target.value)}
                  className="mt-1 w-full px-2 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-200"
                />
              </label>
              <label className="text-[11px] text-slate-500">
                To
                <input
                  aria-label="Preferred time to"
                  type="time"
                  value={preferredTo}
                  onChange={(event) => setPreferredTo(event.target.value)}
                  className="mt-1 w-full px-2 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-200"
                />
              </label>
            </div>
            {preferredFrom && preferredTo && preferredFrom >= preferredTo && (
              <p className="text-[11px] text-red-500 mt-1">
                End time must be later than start time.
              </p>
            )}
          </div>

          <div className="mb-5">
            <ExactScheduleEditor
              value={avail}
              onChange={setAvail}
              compact
              title="My Availability Schedule"
            />
            <button
              disabled={savingSchedule}
              onClick={applyScheduleFilter}
              className="mt-3 w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-semibold rounded-xl transition-colors"
            >
              {savingSchedule ? "Saving..." : "Save & Apply Schedule"}
            </button>
          </div>

          <div className="mb-5">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wide">
              Min Trust Score
            </p>
            <input
              type="range"
              min={0}
              max={100}
              value={trustMinimum}
              onChange={(event) => setTrustMinimum(Number(event.target.value))}
              className="w-full accent-blue-600"
            />
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>{trustMinimum}+</span>
              <span>50</span>
              <span>100</span>
            </div>
          </div>

          <div className="mb-5">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wide">
              Verification Required
            </p>
            {[
              ["Any", 0],
              ["Basic Verified", 1],
              ["Identity Verified", 2],
              ["Trusted Professional", 4],
            ].map(([label, value]) => (
              <label
                key={String(label)}
                className="flex items-center gap-2 mb-2 cursor-pointer"
              >
                <input
                  type="radio"
                  name="verification"
                  checked={verificationMinimum === Number(value)}
                  onChange={() => setVerificationMinimum(Number(value))}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  {label}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Main Area */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Hero */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-5 mb-5 text-white">
          <div className="flex items-center gap-3">
            <div className="text-3xl">🤖</div>
            <div>
              <h2 className="font-heading font-bold text-lg">
                AI Found 8 Perfect Matches
              </h2>
              <p className="text-blue-100 text-sm">
                Based on your React skills, Kathmandu location and Mon–Fri
                availability schedule.
              </p>
            </div>
            <div className="ml-auto shrink-0">
              <MatchRing pct={94} size={56} />
            </div>
          </div>
        </div>

        {/* Search + controls */}
        <div className="flex gap-3 mb-5">
          <div className="flex-1 relative">
            <Ico
              d={IC.search}
              cls="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search jobs, companies, skills..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-400 transition-colors"
            />
          </div>
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-colors ${
              showFilters
                ? "bg-blue-600 border-blue-600 text-white"
                : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900"
            }`}
          >
            <Ico d={IC.filter} cls="w-4 h-4" /> Filters
          </button>
          <div className="flex border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
            {(["grid", "list"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setViewMode(m)}
                className={`px-3 py-2 transition-colors ${
                  viewMode === m
                    ? "bg-blue-600 text-white"
                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                <Ico d={m === "grid" ? IC.grid : IC.list} cls="w-4 h-4" />
              </button>
            ))}
          </div>
        </div>

        <p className="text-sm text-slate-400 mb-4">
          {filtered.length} opportunities found
        </p>

        {/* Job Cards */}
        <div
          className={
            viewMode === "grid"
              ? "grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-5"
              : "grid grid-cols-1 gap-4"
          }
        >
          {filtered.map((job) => (
            <div
              key={job.id}
              onClick={() => setDrawerJob(job)}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-blue-200 dark:border-blue-900 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center font-heading font-bold text-white shrink-0"
                    style={{ backgroundColor: job.color }}
                  >
                    {job.initials}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-heading font-bold text-slate-950 dark:text-white text-base leading-tight line-clamp-2">
                      {job.title}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 truncate">
                      {job.company}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="px-3 py-1.5 rounded-full border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950 text-violet-700 dark:text-violet-300 text-sm font-bold">
                    ✣ {job.match}%
                  </span>
                  <button
                    aria-label={
                      savedJobs.includes(job.id)
                        ? "Remove saved job"
                        : "Save job"
                    }
                    onClick={(event) => {
                      event.stopPropagation()
                      onToggleSaved(job.id)
                    }}
                    className={`text-xl leading-none ${
                      savedJobs.includes(job.id)
                        ? "text-blue-600"
                        : "text-slate-400 hover:text-blue-600"
                    }`}
                  >
                    {savedJobs.includes(job.id) ? "♥" : "♡"}
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold">
                  {job.type}
                </span>
                {job.urgent && (
                  <span className="px-3 py-1 rounded-full border border-red-200 bg-red-50 dark:bg-red-950 text-red-600 text-xs font-semibold">
                    🔥 Urgent
                  </span>
                )}
                <span className="px-3 py-1 rounded-full border border-sky-200 bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 text-xs font-semibold">
                  ✓ Verified
                </span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-4 text-sm text-slate-500 dark:text-slate-400">
                <span className="truncate">⌖ {job.location}</span>
                <span className="truncate">$ {job.salary}</span>
                <span className="truncate">◷ {job.schedule}</span>
                <span>♙ {job.applicationCount ?? 0} applicants</span>
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                {job.skills.slice(0, 4).map((skill) => (
                  <span
                    key={skill}
                    className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs"
                  >
                    {skill}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-3 mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
                <span className="text-sm text-slate-400 mr-auto">
                  {job.posted}
                </span>
                <button
                  onClick={(event) => {
                    event.stopPropagation()
                    setDrawerJob(job)
                  }}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold hover:border-blue-400 transition-colors"
                >
                  View
                </button>
                <button
                  disabled={appliedJobs.includes(job.id)}
                  onClick={(event) => {
                    event.stopPropagation()
                    onApply(job.id)
                  }}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-green-600 text-white font-semibold shadow-md shadow-blue-200 dark:shadow-none transition-colors"
                >
                  {appliedJobs.includes(job.id) ? "Applied" : "Apply Now"}
                </button>
              </div>
            </div>
          ))}
          {!filtered.length && (
            <div className="col-span-full py-16 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
              <p className="font-semibold text-slate-700 dark:text-slate-200">
                No opportunities match these exact times.
              </p>
              <p className="text-sm text-slate-400 mt-1">
                Adjust the time or weekly availability filters and try again.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Applications ─────────────────────────────────────────────────────────────

function Applications({
  applications,
  onWithdraw,
}: {
  applications: UiApplication[]
  onWithdraw: (applicationId: number) => void
}) {
  const [tab, setTab] = useState("all")
  const tabs = [
    { id: "all", label: "All", count: applications.length },
    {
      id: "active",
      label: "Active",
      count: applications.filter((item) => item.status === "active").length,
    },
    {
      id: "under-review",
      label: "Under Review",
      count: applications.filter((item) => item.status === "under-review")
        .length,
    },
    {
      id: "interview",
      label: "Interview",
      count: applications.filter((item) => item.status === "interview").length,
    },
    {
      id: "accepted",
      label: "Hired History",
      count: applications.filter((item) => item.status === "accepted").length,
    },
    {
      id: "rejected",
      label: "Rejected",
      count: applications.filter((item) => item.status === "rejected").length,
    },
    {
      id: "withdrawn",
      label: "Withdrawn",
      count: applications.filter((item) => item.status === "withdrawn").length,
    },
  ]

  const statusConfig: Record<string, {
    label: string
    color: string
    bg: string
  }> = {
    active: {
      label: "Applied",
      color: "text-blue-600",
      bg: "bg-blue-50 dark:bg-blue-950",
    },
    "under-review": {
      label: "Under Review",
      color: "text-amber-600",
      bg: "bg-amber-50 dark:bg-amber-950",
    },
    interview: {
      label: "Interview",
      color: "text-violet-600",
      bg: "bg-violet-50 dark:bg-violet-950",
    },
    accepted: {
      label: "Hired",
      color: "text-green-600",
      bg: "bg-green-50 dark:bg-green-950",
    },
    rejected: {
      label: "Rejected",
      color: "text-red-600",
      bg: "bg-red-50 dark:bg-red-950",
    },
    withdrawn: {
      label: "Withdrawn",
      color: "text-slate-600",
      bg: "bg-slate-100 dark:bg-slate-800",
    },
  }

  const filtered =
    tab === "all" ? applications : applications.filter((a) => a.status === tab)

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="font-heading text-2xl font-extrabold text-slate-900 dark:text-white mb-1">
        My Applications
      </h1>
      <p className="text-slate-400 text-sm mb-5">
        {applications.length} total applications
      </p>

      {/* Pipeline */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 mb-6">
        <h2 className="font-heading font-bold text-slate-900 dark:text-white mb-4">
          Application Pipeline
        </h2>
        <div className="flex items-center gap-1 overflow-x-auto pb-2">
          {[
            ["Applied", "1", "#2563EB"],
            ["Under Review", "1", "#F59E0B"],
            ["Interview", "1", "#7C3AED"],
            ["Selected", "0", "#0891B2"],
            ["Hired", "0", "#22C55E"],
          ].map(([step, count, color], i, arr) => (
            <div key={step} className="flex items-center gap-1 shrink-0">
              <div className="flex flex-col items-center">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-white mb-1"
                  style={{
                    backgroundColor: parseInt(count) > 0 ? color : "#CBD5E1",
                  }}
                >
                  {count}
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400 text-center whitespace-nowrap">
                  {step}
                </span>
              </div>
              {i < arr.length - 1 && (
                <div className="w-8 h-0.5 bg-slate-200 dark:bg-slate-700 mx-1 mb-4" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
              tab === t.id
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300"
            }`}
          >
            {t.label}
            <span
              className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                tab === t.id
                  ? "bg-white/20 text-white"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-500"
              }`}
            >
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Application Cards */}
      <div className="space-y-3">
        {filtered.map((app) => {
          const st = statusConfig[app.status] || statusConfig.active
          return (
            <div
              key={app.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5"
            >
              <div className="flex items-start gap-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center font-heading font-bold text-white shrink-0"
                  style={{ backgroundColor: app.color }}
                >
                  {app.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div>
                      <h3 className="font-heading font-bold text-slate-900 dark:text-white">
                        {app.job}
                      </h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {app.company} · {app.location} · {app.type}
                      </p>
                    </div>
                    <span
                      className={`text-xs px-3 py-1.5 rounded-full font-semibold ${st.bg} ${st.color}`}
                    >
                      {st.label}
                    </span>
                  </div>

                  {/* Timeline */}
                  <div className="flex items-center gap-1 mt-3 overflow-x-auto pb-1">
                    {[
                      "Applied",
                      "Under Review",
                      "Interview",
                      "Selected",
                      "Hired",
                    ].map((step, i) => {
                      const steps: Record<string, number> = {
                        active: 0,
                        "under-review": 1,
                        interview: 2,
                        accepted: 4,
                        rejected: 1,
                      }
                      const current = steps[app.status] ?? 0
                      const done = i <= current
                      return (
                        <div
                          key={step}
                          className="flex items-center gap-1 shrink-0"
                        >
                          <div className="flex flex-col items-center">
                            <div
                              className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                done
                                  ? "bg-blue-600 text-white"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                              }`}
                            >
                              {done ? (
                                <svg
                                  className="w-3 h-3"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={3}
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                              ) : (
                                <span className="text-xs">{i + 1}</span>
                              )}
                            </div>
                            <span className="text-xs text-slate-400 whitespace-nowrap mt-1">
                              {step}
                            </span>
                          </div>
                          {i < 4 && (
                            <div
                              className={`w-6 h-0.5 mb-4 ${
                                done && i < current
                                  ? "bg-blue-500"
                                  : "bg-slate-200 dark:bg-slate-700"
                              }`}
                            />
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {app.interviewDate && (
                    <div className="mt-3 flex items-center gap-2 bg-violet-50 dark:bg-violet-950 rounded-xl px-4 py-2.5">
                      <Ico d={IC.video} cls="w-4 h-4 text-violet-600" />
                      <span className="text-sm font-semibold text-violet-700 dark:text-violet-300">
                        Interview: {app.interviewDate} · {app.interviewType}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    <span className="text-xs text-slate-400">
                      Applied {app.applied}
                    </span>
                    <span className="text-slate-200 dark:text-slate-700">
                      ·
                    </span>
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {app.salary}
                    </span>
                    {["active", "under-review", "interview"].includes(app.status) && (
                      <button
                        onClick={() => onWithdraw(app.id)}
                        className="ml-auto px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 hover:border-red-300 hover:text-red-600"
                      >
                        Withdraw
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Messages ─────────────────────────────────────────────────────────────────

function Messages() {
  type ChatMessage = {
    id: number
    text?: string
    from: "me" | "them"
    time: string
    sender?: string
    file?: { name: string; size: string; type: string }
    image?: boolean
  }
  const dialog = useActionDialog()
  const [activeConv, setActiveConv] = useState(1)
  const [newMsg, setNewMsg] = useState("")
  const [conversationSearch, setConversationSearch] = useState("")
  const [customMessages, setCustomMessages] =
    useState<Record<number, ChatMessage[]>>({})
  const [filter, setFilter] = useState<"All" | "Jobs" | "Unread" | "Group">(
    "All",
  )
  const [showInfo, setShowInfo] = useState(false)
  const attachmentInput = useRef<HTMLInputElement>(null)
  const conv = CONVERSATIONS.find((c) => c.id === activeConv)
  const msgs = MESSAGES[activeConv] || []

  const filteredConvs = CONVERSATIONS.filter((c) => {
    if (filter === "Unread") return c.unread > 0
    if (filter === "Group") return c.id === 1 || c.id === 3
    if (filter === "Jobs") return c.id !== 2
    return (
      !conversationSearch ||
      c.name.toLowerCase().includes(conversationSearch.toLowerCase()) ||
      c.last.toLowerCase().includes(conversationSearch.toLowerCase())
    )
  })

  /* Right-panel info per conversation */
  const INFO: Record<number, {
    company: string
    role: string
    location: string
    verified: boolean
    topPct: string
    interview: { date: string; day: string; time: string } | null
    files: Array<{ name: string; size: string; type: string }>
    participants: string[]
    focusAreas: string[]
  }> = {
    1: {
      company: "Leapfrog Technology",
      role: "HR Director at Leapfrog Technology",
      location: "Kathmandu, Nepal",
      verified: true,
      topPct: "Top 1%",
      interview: { date: "Mar 20", day: "MON", time: "2:00 PM" },
      files: [
        { name: "Portfolio_Review.pdf", size: "4.2 MB", type: "pdf" },
        { name: "Company_Overview.docx", size: "1.8 MB", type: "doc" },
        { name: "Office_Location.png", size: "800 KB", type: "img" },
      ],
      participants: ["YS", "LT", "HR", "RK"],
      focusAreas: ["Product Design", "User Experience", "Nepal Tech Hub"],
    },
    2: {
      company: "Creative Studio",
      role: "Design Lead at Creative Studio",
      location: "Lalitpur, Nepal",
      verified: true,
      topPct: "Top 5%",
      interview: null,
      files: [{ name: "design_brief.pdf", size: "1.2 MB", type: "pdf" }],
      participants: ["YS", "NS"],
      focusAreas: ["UI Design", "Branding"],
    },
    3: {
      company: "F1Soft Group",
      role: "Tech Recruiter at F1Soft Group",
      location: "Kathmandu, Nepal",
      verified: true,
      topPct: "Top 2%",
      interview: { date: "Mar 22", day: "WED", time: "11:00 AM" },
      files: [{ name: "job_offer.pdf", size: "340 KB", type: "pdf" }],
      participants: ["YS", "F1", "HR"],
      focusAreas: ["Fintech", "Backend", "Nepal"],
    },
    4: {
      company: "Verisk Nepal",
      role: "Hiring Manager at Verisk Nepal",
      location: "Kathmandu, Nepal",
      verified: false,
      topPct: "Top 3%",
      interview: null,
      files: [],
      participants: ["YS", "VN"],
      focusAreas: ["Analytics", "Data Science"],
    },
  }
  const info = INFO[activeConv] || INFO[1]

  const fileIcon = (type: string) => {
    if (type === "pdf")
      return {
        bg: "bg-red-100 dark:bg-red-950",
        text: "text-red-600 dark:text-red-400",
        label: "PDF",
      }
    if (type === "img")
      return {
        bg: "bg-blue-100 dark:bg-blue-950",
        text: "text-blue-600 dark:text-blue-400",
        label: "IMG",
      }
    return {
      bg: "bg-green-100 dark:bg-green-950",
      text: "text-green-600 dark:text-green-400",
      label: "DOC",
    }
  }

  /* Enriched messages for conv 1 to show file + image attachments */
  const ENRICHED_MSGS: Record<number, ChatMessage[]> = {
    1: [
      {
        id: 1,
        text: "Hello Yugina! We've reviewed your profile and would like to invite you for a technical interview. Are you available this Thursday at 2:00 PM?",
        from: "them",
        time: "14:02",
        sender: "HR, Leapfrog",
      },
      {
        id: 2,
        text: "That sounds great! I've checked my calendar and 2:00 PM Thursday works perfectly for me. Should I prepare anything specific for the technical session?",
        from: "me",
        time: "14:15",
      },
      {
        id: 3,
        file: {
          name: "interview_brief_v2.pdf",
          size: "2.4 MB · PDF Document",
          type: "pdf",
        },
        text: "I've attached the brief. Please have a look at the system architecture section before our call.",
        from: "them",
        time: "14:18",
        sender: "HR, Leapfrog",
      },
      {
        id: 4,
        image: true,
        from: "them",
        time: "14:20",
        sender: "HR, Leapfrog",
      },
    ],
    2: [
      {
        id: 1,
        text: "Hi Yugina! I saw your profile on KaamVerse. Impressive portfolio!",
        from: "them",
        time: "9:00",
        sender: "Nisha Shakya",
      },
      {
        id: 2,
        text: "Thank you so much! I'd love to hear about the opportunity.",
        from: "me",
        time: "9:30",
      },
      {
        id: 3,
        text: "Can you share your portfolio link? We have a UI role that might interest you.",
        from: "them",
        time: "1h ago",
        sender: "Nisha Shakya",
      },
    ],
  }
  const enrichedMsgs: ChatMessage[] = [
    ...(ENRICHED_MSGS[activeConv] ||
      msgs.map((m) => ({ ...m, sender: conv?.name }))),
    ...(customMessages[activeConv] || []),
  ]

  const sendMessage = () => {
    const text = newMsg.trim()
    if (!text) return
    setCustomMessages((current) => ({
      ...current,
      [activeConv]: [
        ...(current[activeConv] || []),
        {
          id: Date.now(),
          text,
          from: "me",
          time: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ],
    }))
    setNewMsg("")
  }

  const attachFile = (file: File | undefined) => {
    if (!file) return
    setCustomMessages((current) => ({
      ...current,
      [activeConv]: [
        ...(current[activeConv] || []),
        {
          id: Date.now(),
          from: "me",
          time: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          file: {
            name: file.name,
            size: `${Math.max(1, Math.round(file.size / 1024))} KB`,
            type: file.type.includes("pdf")
              ? "pdf"
              : file.type.includes("image")
                ? "img"
                : "doc",
          },
        },
      ],
    }))
  }

  const startCall = (video: boolean) => {
    const room = `KaamVerse-${activeConv}-${new Date().toISOString().slice(0, 10)}`
    window.open(
      `https://meet.jit.si/${encodeURIComponent(room)}#config.startWithVideoMuted=${
        video ? "false" : "true"
      }`,
      "_blank",
      "noopener,noreferrer",
    )
  }

  const addInterviewToCalendar = () => {
    if (!info.interview) return
    const details = `KaamVerse interview with ${conv?.name || info.company}`
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent("KaamVerse Technical Interview")}&details=${encodeURIComponent(details)}`
    window.open(url, "_blank", "noopener,noreferrer")
  }

  const reportConversation = async () => {
    const accepted = await dialog.confirm({
      title: "Report this conversation?",
      message: `A fraud report about ${conv?.name || "this user"} will be submitted to KaamVerse administrators.`,
      confirmLabel: "Submit report",
      variant: "danger",
    })
    if (!accepted) return
    try {
      await api.fraudReports.create({
        reason: "other",
        description: `Reported conversation with ${conv?.name || "unknown user"} from the job-seeker messaging workspace.`,
      })
      await dialog.alert({
        title: "Report submitted",
        message: "The trust and safety team will review this conversation.",
        variant: "success",
      })
    } catch (error) {
      await dialog.alert({
        title: "Report failed",
        message:
          error instanceof ApiError ? error.message : "Please try again.",
        variant: "danger",
      })
    }
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Column 1: Conversation list ── */}
      <div className="w-72 shrink-0 flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        {/* Search */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800">
          <div className="relative">
            <Ico
              d={IC.search}
              cls="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={conversationSearch}
              onChange={(event) => setConversationSearch(event.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white outline-none placeholder:text-slate-400 border border-transparent focus:border-blue-300"
            />
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-slate-100 dark:border-slate-800">
          {(["All", "Jobs", "Unread", "Group"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                filter === f
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {filteredConvs.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveConv(c.id)}
              className={`w-full flex items-center gap-3 px-4 py-3.5 border-b border-slate-50 dark:border-slate-800/60 text-left transition-colors relative ${
                activeConv === c.id
                  ? "bg-blue-50 dark:bg-blue-950/40"
                  : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
              }`}
            >
              {activeConv === c.id && (
                <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-blue-600 rounded-r-full" />
              )}
              <div className="relative shrink-0">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm shadow-sm"
                  style={{ backgroundColor: c.color }}
                >
                  {c.initials}
                </div>
                {c.online && (
                  <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-white dark:border-slate-900" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-1 mb-0.5">
                  <span
                    className={`text-sm truncate ${
                      activeConv === c.id
                        ? "font-bold text-slate-900 dark:text-white"
                        : "font-semibold text-slate-800 dark:text-slate-100"
                    }`}
                  >
                    {c.name}
                  </span>
                  <span className="text-xs text-slate-400 shrink-0">
                    {c.time}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {c.last}
                </p>
              </div>
              {c.unread > 0 && (
                <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {c.unread}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Column 2: Chat window ── */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50 dark:bg-slate-950">
        {conv && (
          <>
            {/* Chat header */}
            <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-5 py-3.5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-sm"
                    style={{ backgroundColor: conv.color }}
                  >
                    {conv.initials}
                  </div>
                  {conv.online && (
                    <div className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-green-500 border-2 border-white dark:border-slate-900" />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-sm text-slate-900 dark:text-white leading-tight">
                    {conv.name}
                  </p>
                  <p
                    className={`text-xs ${
                      conv.online ? "text-green-500" : "text-slate-400"
                    }`}
                  >
                    {conv.online ? "Online now" : "Offline"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => startCall(false)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Voice call"
                >
                  <Ico d={IC.phone} cls="w-4 h-4" />
                </button>
                <button
                  onClick={() => startCall(true)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Video call"
                >
                  <Ico d={IC.video} cls="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowInfo((v) => !v)}
                  className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                    showInfo
                      ? "bg-blue-100 dark:bg-blue-950 text-blue-600"
                      : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 12h.01M12 12h.01M19 12h.01"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Date separator */}
            <div className="flex items-center gap-3 px-6 py-3 shrink-0">
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
              <span className="text-xs font-semibold text-slate-400 tracking-wider">
                TODAY
              </span>
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-2 space-y-4">
              {enrichedMsgs.map((m) => (
                <div
                  key={m.id}
                  className={`flex items-end gap-2.5 ${
                    m.from === "me" ? "flex-row-reverse" : "flex-row"
                  }`}
                >
                  {/* Avatar (only for received) */}
                  {m.from === "them" && (
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-white text-xs shrink-0 mb-1"
                      style={{ backgroundColor: conv.color }}
                    >
                      {conv.initials}
                    </div>
                  )}

                  <div
                    className={`flex flex-col gap-1 max-w-sm ${
                      m.from === "me" ? "items-end" : "items-start"
                    }`}
                  >
                    {/* File attachment */}
                    {m.file && (
                      <div className="bg-white dark:bg-slate-800 rounded-2xl rounded-bl-sm border border-slate-200 dark:border-slate-700 p-3 flex items-center gap-3 shadow-sm w-64">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${fileIcon(m.file.type).bg} ${fileIcon(m.file.type).text}`}
                        >
                          {fileIcon(m.file.type).label}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                            {m.file.name}
                          </p>
                          <p className="text-xs text-slate-400">
                            {m.file.size}
                          </p>
                        </div>
                        <button
                          onClick={() =>
                            downloadTextFile(
                              m.file!.name,
                              `KaamVerse shared-file placeholder for ${m.file!.name}`,
                            )
                          }
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors shrink-0"
                        >
                          <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                            />
                          </svg>
                        </button>
                      </div>
                    )}

                    {/* Inline image */}
                    {m.image && (
                      <div className="rounded-2xl rounded-bl-sm overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm w-64 h-36 bg-gradient-to-br from-blue-900 via-indigo-800 to-violet-900 flex items-center justify-center">
                        <span className="text-white/40 text-xs">
                          Screenshot attached
                        </span>
                      </div>
                    )}

                    {/* Text bubble */}
                    {m.text && (
                      <div
                        className={`px-4 py-2.5 rounded-2xl shadow-sm leading-relaxed text-sm ${
                          m.from === "me"
                            ? "bg-blue-600 text-white rounded-br-sm"
                            : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-bl-sm"
                        }`}
                      >
                        {m.text}
                      </div>
                    )}

                    {/* Timestamp + sender */}
                    <p className="text-xs text-slate-400 px-1">
                      {m.time}
                      {m.from === "them" && m.sender ? ` · ${m.sender}` : ""}
                      {m.from === "me" && (
                        <span className="ml-1 text-blue-400">✓✓</span>
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Input */}
            <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-4 pt-3 pb-2 shrink-0">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => attachmentInput.current?.click()}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                </button>
                <input
                  ref={attachmentInput}
                  type="file"
                  className="hidden"
                  onChange={(event) => {
                    attachFile(event.target.files?.[0])
                    event.target.value = ""
                  }}
                />
                <button
                  onClick={() => setNewMsg((message) => `${message} 🙂`)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M8 13s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" />
                  </svg>
                </button>
                <input
                  value={newMsg}
                  onChange={(e) => setNewMsg(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") sendMessage()
                  }}
                  placeholder={`Message ${conv.name}...`}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-400 transition-colors placeholder:text-slate-400"
                />
                <button
                  onClick={() =>
                    setNewMsg((message) => message || "Voice note recorded")
                  }
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <Ico d={IC.mic} cls="w-4 h-4" />
                </button>
                <button
                  onClick={sendMessage}
                  className="w-9 h-9 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center justify-center shadow-sm transition-colors shrink-0"
                >
                  <Ico d={IC.send} cls="w-4 h-4" />
                </button>
              </div>
              <p className="text-center text-xs text-slate-300 dark:text-slate-600 mt-2 tracking-widest uppercase">
                Press Enter to send
              </p>
            </div>
          </>
        )}
      </div>

      {/* ── Column 3: Info panel ── */}
      <div
        className={`w-64 shrink-0 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-y-auto flex-col transition-all duration-300 ${
          showInfo ? "flex" : "hidden"
        }`}
      >
        {conv && (
          <>
            {/* Contact info */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 text-center">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center font-bold text-white text-xl mx-auto mb-3 shadow-md"
                style={{ backgroundColor: conv.color }}
              >
                {conv.initials}
              </div>
              <h3 className="font-heading font-bold text-slate-900 dark:text-white text-sm leading-snug mb-0.5">
                {conv.name}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                {info.role}
              </p>
              {info.verified && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs font-semibold border border-blue-100 dark:border-blue-900 mb-3">
                  <svg
                    className="w-3 h-3"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Verified Employer
                </span>
              )}
              {/* Video / Voice call buttons */}
              <div className="flex gap-2 mt-1">
                <button
                  onClick={() => startCall(true)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-colors"
                >
                  <Ico d={IC.video} cls="w-3.5 h-3.5" /> Video
                </button>
                <button
                  onClick={() => startCall(false)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition-colors"
                >
                  <Ico d={IC.phone} cls="w-3.5 h-3.5" /> Voice
                </button>
              </div>
            </div>

            {/* Upcoming events */}
            {info.interview && (
              <div className="p-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Upcoming Events
                  </h4>
                  <svg
                    className="w-4 h-4 text-slate-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
                  <div className="flex items-start gap-2 mb-2">
                    <svg
                      className="w-4 h-4 text-blue-600 mt-0.5 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <rect x="3" y="4" width="18" height="18" rx="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    <div>
                      <p className="text-xs font-semibold text-slate-900 dark:text-white">
                        Technical Interview
                      </p>
                      <p className="text-xs text-slate-400">
                        {info.interview.date} · {info.interview.time}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={addInterviewToCalendar}
                    className="w-full py-1.5 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 text-xs font-semibold rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors"
                  >
                    Add to Google Calendar
                  </button>
                </div>
              </div>
            )}

            {/* Shared files */}
            {info.files.length > 0 && (
              <div className="p-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Shared Files
                  </h4>
                  <button
                    onClick={() => setShowInfo(true)}
                    className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                  >
                    View All
                  </button>
                </div>
                <div className="space-y-1.5">
                  {info.files.map((f) => {
                    const fi = fileIcon(f.type)
                    return (
                      <div
                        key={f.name}
                        className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${fi.bg} ${fi.text}`}
                        >
                          {fi.label}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                            {f.name}
                          </p>
                          <p className="text-xs text-slate-400">{f.size}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Focus Areas */}
            {info.focusAreas.length > 0 && (
              <div className="p-4 border-b border-slate-100 dark:border-slate-800">
                <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2.5">
                  Focus Areas
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {info.focusAreas.map((a) => (
                    <span
                      key={a}
                      className="px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs font-semibold border border-blue-100 dark:border-blue-900"
                    >
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Participants */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800">
              <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                Participants ({info.participants.length})
              </h4>
              <div className="flex items-center">
                {info.participants.map((p, i) => (
                  <div
                    key={p}
                    className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs border-2 border-white dark:border-slate-900 -ml-2 first:ml-0"
                    style={{
                      backgroundColor: [
                        "#2563EB",
                        "#7C3AED",
                        "#059669",
                        "#D97706",
                      ][i % 4],
                      zIndex: info.participants.length - i,
                    }}
                  >
                    {p}
                  </div>
                ))}
              </div>
            </div>

            {/* Report User */}
            <div className="p-4">
              <button
                onClick={reportConversation}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-500 transition-colors"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"
                  />
                </svg>
                Report User
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── AI Career Hub ────────────────────────────────────────────────────────────

function AICareerHub() {
  const USER = useSeekerUser()
  const dialog = useActionDialog()
  const [activeCard, setActiveCard] = useState<string | null>(null)

  const cards = [
    {
      id: "resume",
      icon: "📄",
      title: "AI Resume Analysis",
      score: 72,
      desc: "Your resume is strong but missing key quantified achievements. Add metrics to boost your score.",
      color: "#7C3AED",
      actions: ["Improve Resume", "Download Suggestions"],
    },
    {
      id: "coach",
      icon: "🎯",
      title: "AI Career Coach",
      score: null,
      desc: "Get personalized career guidance, salary negotiation tips, and next-step recommendations.",
      color: "#2563EB",
      actions: ["Start Session", "Ask a Question"],
    },
    {
      id: "skills",
      icon: "📊",
      title: "Skill Gap Analysis",
      score: 68,
      desc: "You're missing TypeScript advanced patterns and AWS cloud skills for Senior roles. 3 gaps identified.",
      color: "#F59E0B",
      actions: ["See Gap Report", "Find Courses"],
    },
    {
      id: "interview",
      icon: "🎤",
      title: "Mock Interview",
      score: null,
      desc: "Practice with AI-generated interview questions tailored for your target roles at Leapfrog, eSewa.",
      color: "#059669",
      actions: ["Start Mock Interview", "View Past Answers"],
    },
    {
      id: "certs",
      icon: "🏆",
      title: "Recommended Certifications",
      score: null,
      desc: "AWS Cloud Practitioner (+15 Trust Score), Meta React Developer, Google Analytics — 3 certifications recommended.",
      color: "#DC2626",
      actions: ["View Certifications", "Enroll Now"],
    },
    {
      id: "insights",
      icon: "💡",
      title: "Career Growth Insights",
      score: null,
      desc: "Senior Frontend Developers in Nepal earn 20% more with cloud certifications. Your next milestone: NPR 1.5L/mo.",
      color: "#0891B2",
      actions: ["View Insights", "Set Goal"],
    },
  ]

  const runAiAction = async (card: typeof cards[number], action: string) => {
    if (/download|report|past answers|insights/i.test(action)) {
      downloadTextFile(
        `kaamverse-${card.id}-report.txt`,
        `${card.title}\n\n${card.desc}\n\nRecommended next step: ${card.actions[0]}`,
      )
      return
    }
    if (/courses|certifications|enroll/i.test(action)) {
      window.open(
        `https://www.google.com/search?q=${encodeURIComponent(`${card.title} courses Nepal`)}`,
        "_blank",
        "noopener,noreferrer",
      )
      return
    }
    setActiveCard(card.id)
    await dialog.alert({
      title: `${card.title} started`,
      message: `${card.desc} Your result is saved in this career-hub session.`,
      variant: "success",
    })
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-extrabold text-slate-900 dark:text-white mb-1">
          AI Career Hub
        </h1>
        <p className="text-slate-400 text-sm">
          Guided career tools based on your KaamVerse profile (demo coaching cards)
        </p>
      </div>
      <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
        These AI cards are practice prompts. Trust score, applications, and job matches use your live account data.
      </div>

      {/* AI Summary Card */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-5 mb-6 text-white">
        <div className="flex items-start gap-4">
          <div className="text-4xl">🤖</div>
          <div>
            <h2 className="font-heading font-bold text-lg mb-1">
              AI Insight for {USER.name.split(" ")[0]}
            </h2>
            <p className="text-blue-100 text-sm leading-relaxed">
              You're <strong className="text-white">3 skills away</strong> from
              qualifying for Senior positions (NPR 1.5L+). Focus on TypeScript
              advanced patterns, AWS basics, and system design. Your current
              resume is likely to get shortlisted by{" "}
              <strong className="text-white">68% of employers</strong> in your
              target companies.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {cards.map((c) => (
          <div
            key={c.id}
            className={`bg-white dark:bg-slate-900 rounded-2xl border shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer ${
              activeCard === c.id
                ? "border-blue-300 dark:border-blue-700 ring-2 ring-blue-200 dark:ring-blue-900"
                : "border-slate-100 dark:border-slate-800"
            }`}
            onClick={() => setActiveCard(activeCard === c.id ? null : c.id)}
          >
            <div className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
                  style={{ backgroundColor: `${c.color}15` }}
                >
                  {c.icon}
                </div>
                {c.score !== null && (
                  <div className="text-right">
                    <div
                      className="font-heading font-extrabold text-2xl"
                      style={{ color: c.color }}
                    >
                      {c.score}
                    </div>
                    <div className="text-xs text-slate-400">/100</div>
                  </div>
                )}
              </div>
              <h3 className="font-heading font-bold text-slate-900 dark:text-white mb-2">
                {c.title}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                {c.desc}
              </p>
              {c.score !== null && (
                <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full mb-4">
                  <div
                    className="h-1.5 rounded-full"
                    style={{ width: `${c.score}%`, backgroundColor: c.color }}
                  />
                </div>
              )}
              <div className="flex gap-2">
                {c.actions.map((a, i) => (
                  <button
                    onClick={(event) => {
                      event.stopPropagation()
                      void runAiAction(c, a)
                    }}
                    key={a}
                    className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-colors ${
                      i === 0
                        ? "text-white"
                        : "border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300"
                    }`}
                    style={i === 0 ? { backgroundColor: c.color } : {}}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Document Upload Helper ───────────────────────────────────────────────────

function DocUpload({
  label,
  hint,
  accept = "image/*,.pdf",
  onFileChange,
}: {
  label: string
  hint?: string
  accept?: string
  onFileChange?: (file: File | null) => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const id = label.replace(/\s+/g, "-").toLowerCase()
  const updateFile = (nextFile: File | null) => {
    setFile(nextFile)
    onFileChange?.(nextFile)
  }
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5"
      >
        {label}
      </label>
      {file ? (
        <div className="flex items-center gap-2 p-2.5 rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950">
          <span className="text-green-600 text-lg">✅</span>
          <span className="flex-1 text-xs text-green-700 dark:text-green-300 truncate font-medium">
            {file.name}
          </span>
          <button
            type="button"
            onClick={() => updateFile(null)}
            className="text-xs text-slate-400 hover:text-red-500 transition-colors"
          >
            ✕
          </button>
        </div>
      ) : (
        <label
          htmlFor={id}
          className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-4 cursor-pointer hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-all"
        >
          <span className="text-2xl">📁</span>
          <span className="text-xs text-slate-500 dark:text-slate-400 text-center">
            {hint || "Click to upload"}
          </span>
          <input
            id={id}
            type="file"
            accept={accept}
            className="hidden"
            onChange={(e) => updateFile(e.target.files?.[0] || null)}
          />
        </label>
      )}
    </div>
  )
}

// ─── Trust Center ─────────────────────────────────────────────────────────────

function TrustCenter() {
  const USER = useSeekerUser()
  const [activeDoc, setActiveDoc] = useState<"nid" | "pan" | null>(null)
  const [documents, setDocuments] = useState<Record<string, File | null>>({})
  const [verificationMessage, setVerificationMessage] = useState("")
  const [submittingVerification, setSubmittingVerification] = useState(false)
  const [verificationRecords, setVerificationRecords] = useState<ApiVerification[]>([])

  const loadVerificationRecords = () => api.verifications.list().then((page) => setVerificationRecords(page.results)).catch(() => setVerificationRecords([]))
  useEffect(() => { void loadVerificationRecords() }, [])
  const documentStatus = (aliases: string[]) => {
    const record = verificationRecords.find((item) => aliases.includes(item.document_type))
    return record?.status === "approved" ? "Verified" : record?.status === "rejected" ? "Rejected" : record?.status === "pending" ? "Pending" : "Not uploaded"
  }

  const rememberDocument = (key: string, file: File | null) => {
    setDocuments((current) => ({ ...current, [key]: file }))
  }

  const submitDocuments = async (
    items: Array<[string, File | null | undefined]>,
  ) => {
    if (items.some(([, file]) => !file)) {
      setVerificationMessage(
        "Please select every required document before submitting.",
      )
      return
    }

    setSubmittingVerification(true)
    setVerificationMessage("")
    try {
      await Promise.all(
        items.map(([documentType, file]) =>
          api.verifications.submit(documentType, file!),
        ),
      )
      await loadVerificationRecords()
      setVerificationMessage(
        "Documents submitted securely. An administrator will review them shortly.",
      )
    } catch (error) {
      setVerificationMessage(
        error instanceof ApiError
          ? error.message
          : "Unable to submit the documents. Please try again.",
      )
    } finally {
      setSubmittingVerification(false)
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="font-heading text-2xl font-extrabold text-slate-900 dark:text-white mb-1">
        Trust Center
      </h1>
      <p className="text-slate-400 text-sm mb-6">
        Your verification, reputation and trust profile
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        {/* Trust Score */}
        <div className="lg:col-span-1 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl p-6 text-white text-center">
          <p className="text-amber-100 text-sm font-medium mb-2">
            Your Trust Score
          </p>
          <div className="font-heading font-extrabold text-6xl mb-1">
            {USER.trustScore}
          </div>
          <p className="text-amber-100 text-sm mb-4">out of 100</p>
          <div className="w-full h-2 bg-amber-300/30 rounded-full mb-4">
            <div
              className="h-2 bg-white rounded-full"
              style={{ width: `${USER.trustScore}%` }}
            />
          </div>
          <TrustBadge level={USER.badge} />
          <p className="text-amber-100 text-xs mt-3">
            Complete verification to reach Level 3
          </p>
        </div>

        {/* Score Breakdown */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5">
          <h2 className="font-heading font-bold text-slate-900 dark:text-white mb-4">
            Trust Score Breakdown
          </h2>
          <ScoreBar
            label="Identity Verification"
            value={20}
            max={25}
            color="#2563EB"
          />
          <ScoreBar label="Work History" value={15} max={20} color="#7C3AED" />
          <ScoreBar
            label="Profile Completeness"
            value={18}
            max={20}
            color="#059669"
          />
          <ScoreBar
            label="Reviews & Ratings"
            value={12}
            max={15}
            color="#F59E0B"
          />
          <ScoreBar label="Activity Score" value={8} max={10} color="#0891B2" />
          <ScoreBar label="Certifications" value={5} max={10} color="#DC2626" />
        </div>
      </div>

      {/* Verification Levels */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5 mb-5">
        <h2 className="font-heading font-bold text-slate-900 dark:text-white mb-4">
          Verification Levels
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              level: 1,
              label: "Basic Verified",
              desc: "Email & Phone",
              done: true,
              color: "#64748B",
              emoji: "🟢",
            },
            {
              level: 2,
              label: "Identity Verified",
              desc: "NID / Passport",
              done: true,
              color: "#2563EB",
              emoji: "🔵",
            },
            {
              level: 3,
              label: "Trusted Professional",
              desc: "Work History",
              done: false,
              color: "#F59E0B",
              emoji: "⭐",
            },
          ].map((v) => (
            <div
              key={v.level}
              className={`p-4 rounded-2xl border-2 text-center transition-all ${
                v.done
                  ? "border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950"
                  : "border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              }`}
            >
              <div className="text-3xl mb-2">{v.emoji}</div>
              <p
                className={`text-sm font-bold mb-1 ${
                  v.done ? "text-blue-900 dark:text-blue-100" : "text-slate-400"
                }`}
              >
                Level {v.level}
              </p>
              <p
                className={`text-xs font-semibold mb-1 ${
                  v.done ? "text-blue-700 dark:text-blue-300" : "text-slate-500"
                }`}
              >
                {v.label}
              </p>
              <p className="text-xs text-slate-400">{v.desc}</p>
              {v.done ? (
                <div className="mt-2 flex items-center justify-center gap-1 text-xs text-green-600 font-semibold">
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>{" "}
                  Verified
                </div>
              ) : (
                <button
                  onClick={() => setActiveDoc("nid")}
                  className="mt-2 w-full py-1 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Verify Now
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Document Verification Uploads */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5 mb-5">
        <h2 className="font-heading font-bold text-slate-900 dark:text-white mb-1">
          Document Verification
        </h2>
        <p className="text-xs text-slate-400 mb-5">
          Upload your identity documents to increase trust level and unlock
          higher-paying jobs.
        </p>

        <div className="flex gap-2 mb-5 flex-wrap">
          {[
            {
              id: "nid" as const,
              label: "🪪 NID / Citizenship",
              status: documentStatus(["citizenship", "nid", "nid_front", "nid_back", "passport"]),
            },
            { id: "pan" as const, label: "📄 PAN Card", status: "Pending" },
          ].map((d) => d.id === "pan" ? { ...d, status: documentStatus(["pan", "pan_vat"]) } : d).map((d) => (
            <button
              key={d.id}
              onClick={() => setActiveDoc(activeDoc === d.id ? null : d.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
                activeDoc === d.id
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300"
                  : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-blue-300"
              }`}
            >
              {d.label}
              <span
                className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                  d.status === "Verified"
                    ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
                    : "bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300"
                }`}
              >
                {d.status}
              </span>
            </button>
          ))}
        </div>

        {activeDoc === "nid" && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                NID / Citizenship Number *
              </label>
              <input
                placeholder="Enter your NID or Citizenship number"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-all"
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <DocUpload
                label="NID / Citizenship — Front Photo"
                hint="Clear photo of the front side"
                accept="image/*"
                onFileChange={(file) => rememberDocument("nid_front", file)}
              />
              <DocUpload
                label="NID / Citizenship — Back Photo"
                hint="Clear photo of the back side"
                accept="image/*"
                onFileChange={(file) => rememberDocument("nid_back", file)}
              />
            </div>
            <div className="bg-blue-50 dark:bg-blue-950 rounded-xl p-3 text-xs text-blue-700 dark:text-blue-300">
              <span className="font-semibold">Accepted:</span> Nepali
              Citizenship Certificate, National Identity Card, or Passport.
            </div>
            <button
              type="button"
              disabled={submittingVerification}
              onClick={() =>
                submitDocuments([
                  ["nid_front", documents.nid_front],
                  ["nid_back", documents.nid_back],
                ])
              }
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              {submittingVerification ? "Submitting…" : "Submit NID Documents"}
            </button>
          </div>
        )}

        {activeDoc === "pan" && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                PAN Number *
              </label>
              <input
                placeholder="Enter your PAN number"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-all"
              />
            </div>
            <DocUpload
              label="PAN Card Photo"
              hint="Upload a clear photo of your PAN card"
              accept="image/*"
              onFileChange={(file) => rememberDocument("pan", file)}
            />
            <button
              type="button"
              disabled={submittingVerification}
              onClick={() => submitDocuments([["pan", documents.pan]])}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              {submittingVerification ? "Submitting…" : "Submit PAN Document"}
            </button>
          </div>
        )}

        {!activeDoc && (
          <div className="text-center py-8 text-slate-400">
            <p className="text-3xl mb-2">📂</p>
            <p className="text-sm">
              Select a document type above to upload or review
            </p>
          </div>
        )}

        {verificationMessage && (
          <p className="mt-4 rounded-xl bg-blue-50 dark:bg-blue-950 px-4 py-3 text-xs font-medium text-blue-700 dark:text-blue-300">
            {verificationMessage}
          </p>
        )}
      </div>

      {/* Reputation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5">
          <h2 className="font-heading font-bold text-slate-900 dark:text-white mb-4">
            Reputation Stats
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              {
                label: "Jobs Completed",
                value: "24",
                icon: "💼",
                color: "#059669",
              },
              {
                label: "Completion Rate",
                value: "96%",
                icon: "✅",
                color: "#2563EB",
              },
              {
                label: "Avg Rating",
                value: "4.8★",
                icon: "⭐",
                color: "#F59E0B",
              },
              {
                label: "Response Time",
                value: "< 2hrs",
                icon: "⚡",
                color: "#7C3AED",
              },
            ].map((s) => (
              <div
                key={s.label}
                className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 text-center"
              >
                <div className="text-2xl mb-1">{s.icon}</div>
                <div
                  className="font-heading font-extrabold text-lg"
                  style={{ color: s.color }}
                >
                  {s.value}
                </div>
                <div className="text-xs text-slate-400">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5">
          <h2 className="font-heading font-bold text-slate-900 dark:text-white mb-4">
            Achievements
          </h2>
          <div className="space-y-3">
            {[
              {
                icon: "🌟",
                label: "Top Rated Professional",
                desc: "Maintained 4.8+ rating for 6 months",
                earned: true,
              },
              {
                icon: "⚡",
                label: "Quick Responder",
                desc: "Average response under 2 hours",
                earned: true,
              },
              {
                icon: "🛡️",
                label: "Zero Complaints",
                desc: "No complaints filed — ever",
                earned: true,
              },
              {
                icon: "🏆",
                label: "Expert Level",
                desc: "Complete 50+ jobs to unlock",
                earned: false,
              },
            ].map((a) => (
              <div
                key={a.label}
                className={`flex items-center gap-3 p-3 rounded-xl ${
                  a.earned
                    ? "bg-green-50 dark:bg-green-950"
                    : "bg-slate-50 dark:bg-slate-800 opacity-60"
                }`}
              >
                <span className="text-2xl">{a.icon}</span>
                <div>
                  <p
                    className={`text-sm font-semibold ${
                      a.earned
                        ? "text-green-800 dark:text-green-200"
                        : "text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    {a.label}
                  </p>
                  <p className="text-xs text-slate-400">{a.desc}</p>
                </div>
                {a.earned && (
                  <svg
                    className="w-4 h-4 text-green-600 ml-auto"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Saved ────────────────────────────────────────────────────────────────────

function Saved({
  jobs,
  onApply,
  appliedJobs,
}: {
  jobs: UiJob[]
  onApply: (jobId: number) => void
  appliedJobs: number[]
}) {
  const [tab, setTab] = useState("jobs")
  const tabs = ["Jobs", "Freelance", "Gigs", "Services", "Companies"]
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="font-heading text-2xl font-extrabold text-slate-900 dark:text-white mb-5">
        Saved
      </h1>
      <div className="flex gap-2 mb-5 overflow-x-auto pb-2">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t.toLowerCase())}
            className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
              tab === t.toLowerCase()
                ? "bg-blue-600 text-white"
                : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {jobs.slice(0, 4).map((job) => (
          <div
            key={job.id}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-4 flex items-center gap-4"
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center font-heading font-bold text-white text-sm shrink-0"
              style={{ backgroundColor: job.color }}
            >
              {job.initials}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-heading font-semibold text-slate-900 dark:text-white text-sm">
                {job.title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {job.company} · {job.salary}
              </p>
              <TrustBadge level={job.badge} />
            </div>
            <div className="flex flex-col items-end gap-2">
              <MatchRing pct={job.match} size={36} />
              <button
                disabled={appliedJobs.includes(job.id)}
                onClick={() => onApply(job.id)}
                className="text-xs font-semibold text-blue-600 disabled:text-slate-400 dark:text-blue-400 hover:underline"
              >
                {appliedJobs.includes(job.id) ? "Applied" : "Apply"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Settings ─────────────────────────────────────────────────────────────────

function Settings() {
  const USER = useSeekerUser()
  const dialog = useActionDialog()
  const [tab, setTab] = useState("profile")
  const [avail, setAvail] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [resumeUrl, setResumeUrl] = useState<string | null>(null)
  const [resumeName, setResumeName] = useState("")
  const [photoUrl, setPhotoUrl] = useState("")
  const resumeInput = useRef<HTMLInputElement>(null)
  const photoInput = useRef<HTMLInputElement>(null)
  const [profile, setProfile] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    location: "",
    jobTitle: "",
    bio: "",
  })
  const tabs = [
    { id: "profile", label: "Profile" },
    { id: "resume", label: "Resume" },
    { id: "availability", label: "Availability" },
    { id: "documents", label: "Documents" },
    { id: "security", label: "Security" },
    { id: "privacy", label: "Privacy" },
  ]

  useEffect(() => {
    api.auth
      .me()
      .then((user) => {
        setProfile({
          firstName: user.first_name,
          lastName: user.last_name,
          phone: user.phone || "",
          email: user.email,
          location: user.seeker_profile?.preferred_location || "",
          jobTitle: user.seeker_profile?.headline || "",
          bio: user.seeker_profile?.bio || "",
        })
        setAvail(
          (user.seeker_profile?.availability || {}) as Record<string, string>,
        )
        setResumeUrl(user.seeker_profile?.resume || null)
        setResumeName(user.seeker_profile?.resume?.split("/").pop() || "")
        setPhotoUrl(user.avatar || "")
      })
      .catch(() => undefined)
  }, [])

  const saveProfile = async () => {
    setSaving(true)
    try {
      await api.auth.updateMe({
        first_name: profile.firstName,
        last_name: profile.lastName,
        phone: profile.phone || null,
        seeker_profile: {
          preferred_location: profile.location,
          headline: profile.jobTitle,
          bio: profile.bio,
        },
      })
      await dialog.alert({
        title: "Profile saved",
        message: "Your job-seeker profile was updated in MySQL.",
        variant: "success",
      })
    } catch (error) {
      await dialog.alert({
        title: "Unable to save profile",
        message:
          error instanceof ApiError ? error.message : "Please try again.",
        variant: "danger",
      })
    } finally {
      setSaving(false)
    }
  }

  const saveAvailability = async () => {
    setSaving(true)
    try {
      await api.auth.updateMe({ seeker_profile: { availability: avail } })
      await dialog.alert({
        title: "Availability saved",
        message: "Job recommendations will now use your updated schedule.",
        variant: "success",
      })
    } catch (error) {
      await dialog.alert({
        title: "Unable to save availability",
        message:
          error instanceof ApiError ? error.message : "Please try again.",
        variant: "danger",
      })
    } finally {
      setSaving(false)
    }
  }

  const uploadResume = async (file: File | undefined) => {
    if (!file) return
    setSaving(true)
    try {
      const user = await api.auth.uploadResume(file)
      setResumeUrl(user.seeker_profile?.resume || null)
      setResumeName(file.name)
      await dialog.alert({
        title: "Resume uploaded",
        message:
          "Your new resume is stored securely and ready for applications.",
        variant: "success",
      })
    } catch (error) {
      await dialog.alert({
        title: "Resume upload failed",
        message:
          error instanceof ApiError ? error.message : "Please try again.",
        variant: "danger",
      })
    } finally {
      setSaving(false)
    }
  }

  const removeResume = async () => {
    const accepted = await dialog.confirm({
      title: "Remove your resume?",
      message:
        "Employers will no longer be able to access this resume from new applications.",
      confirmLabel: "Remove resume",
      variant: "danger",
    })
    if (!accepted) return
    await api.auth.removeResume()
    setResumeUrl(null)
    setResumeName("")
    await dialog.alert({
      title: "Resume removed",
      message: "The resume was removed from your profile.",
      variant: "success",
    })
  }

  const changePhoto = async (file: File | undefined) => {
    if (!file || !file.type.startsWith("image/")) return
    setSaving(true)
    try {
      const user = await api.auth.uploadAvatar(file)
      setPhotoUrl(user.avatar || "")
      await dialog.alert({
        title: "Profile photo updated",
        message: "Your photo is stored securely with your account.",
        variant: "success",
      })
    } catch (error) {
      await dialog.alert({
        title: "Photo upload failed",
        message: error instanceof Error ? error.message : "Please try again.",
        variant: "danger",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="font-heading text-2xl font-extrabold text-slate-900 dark:text-white mb-5">
        Settings
      </h1>
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
              tab === t.id
                ? "bg-blue-600 text-white"
                : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "profile" && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 space-y-5">
          <div className="flex items-center gap-5 pb-5 border-b border-slate-100 dark:border-slate-800">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center font-heading font-bold text-white text-2xl overflow-hidden">
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                USER.initials
              )}
            </div>
            <div>
              <h2 className="font-heading font-bold text-slate-900 dark:text-white">
                {USER.name}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {USER.title} · {USER.location}
              </p>
              <TrustBadge level={USER.badge} />
            </div>
            <input
              ref={photoInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                changePhoto(event.target.files?.[0])
                event.target.value = ""
              }}
            />
            <button
              onClick={() => photoInput.current?.click()}
              className="ml-auto px-4 py-2 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300 rounded-xl hover:border-blue-300 hover:text-blue-600 transition-colors"
            >
              Change Photo
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "First Name", key: "firstName" as const },
              { label: "Last Name", key: "lastName" as const },
              { label: "Phone", key: "phone" as const },
              { label: "Email", key: "email" as const, readOnly: true },
              { label: "Location", key: "location" as const },
              { label: "Job Title", key: "jobTitle" as const },
            ].map((field) => (
              <div key={field.key}>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  {field.label}
                </label>
                <input
                  value={profile[field.key]}
                  readOnly={field.readOnly}
                  onChange={(event) =>
                    setProfile((current) => ({
                      ...current,
                      [field.key]: event.target.value,
                    }))
                  }
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 read-only:bg-slate-50 dark:read-only:bg-slate-800 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-400"
                />
              </div>
            ))}
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Bio
            </label>
            <textarea
              rows={3}
              value={profile.bio}
              onChange={(event) =>
                setProfile((current) => ({
                  ...current,
                  bio: event.target.value,
                }))
              }
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-400 resize-none"
            />
          </div>
          <button
            disabled={saving}
            onClick={saveProfile}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors text-sm"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      )}

      {tab === "resume" && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-heading font-bold text-slate-900 dark:text-white">
                  Resume
                </h2>
                <p className="text-sm text-slate-400">
                  Score:{" "}
                  <strong className="text-violet-600">
                    {USER.resumeScore}/100
                  </strong>
                </p>
              </div>
              <input
                ref={resumeInput}
                type="file"
                accept=".pdf,.doc,.docx"
                className="hidden"
                onChange={(event) => {
                  void uploadResume(event.target.files?.[0])
                  event.target.value = ""
                }}
              />
              <button
                disabled={saving}
                onClick={() => resumeInput.current?.click()}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                <Ico d={IC.upload} cls="w-4 h-4" /> Upload New
              </button>
            </div>
            <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full mb-4">
              <div
                className="h-2 rounded-full bg-violet-500 transition-all"
                style={{ width: `${USER.resumeScore}%` }}
              />
            </div>
            <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-8 text-center">
              <div className="text-4xl mb-3">📄</div>
              <p className="font-semibold text-slate-700 dark:text-slate-300">
                {resumeName || "No resume uploaded"}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {resumeUrl
                  ? "Available to verified employers"
                  : "Upload a PDF, DOC, or DOCX file up to 8 MB"}
              </p>
              <div className="flex gap-2 justify-center mt-4">
                <button
                  disabled={!resumeUrl}
                  onClick={() =>
                    resumeUrl &&
                    window.open(resumeUrl, "_blank", "noopener,noreferrer")
                  }
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 disabled:opacity-40 text-sm font-semibold text-slate-600 dark:text-slate-300 rounded-xl hover:border-blue-300 transition-colors"
                >
                  Preview
                </button>
                <button
                  disabled={!resumeUrl}
                  onClick={removeResume}
                  className="px-4 py-2 border border-red-200 dark:border-red-900 disabled:opacity-40 text-sm font-semibold text-red-600 rounded-xl hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                >
                  Remove
                </button>
              </div>
            </div>
            <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-950 rounded-xl border border-amber-100 dark:border-amber-900">
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-200 mb-2">
                🤖 AI Suggestions to improve your resume:
              </p>
              <ul className="text-xs text-amber-700 dark:text-amber-300 space-y-1">
                <li>
                  • Add quantified achievements (e.g., "Reduced load time by
                  40%")
                </li>
                <li>• Include your GitHub profile link</li>
                <li>• Add TypeScript and AWS to your skills section</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {tab === "availability" && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6">
          <h2 className="font-heading font-bold text-slate-900 dark:text-white mb-2">
            Availability Calendar
          </h2>
          <p className="text-sm text-slate-400 mb-5">
            Set your exact available hours. The AI uses this to match you with
            perfectly scheduled opportunities.
          </p>
          <ExactScheduleEditor
            value={avail}
            onChange={setAvail}
            title="Your available days and hours"
          />
          <button
            disabled={saving}
            onClick={saveAvailability}
            className="mt-5 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors text-sm"
          >
            {saving ? "Saving..." : "Save Availability"}
          </button>
        </div>
      )}

      {tab === "documents" && <DocumentVerificationPanel role="seeker" />}

      {tab === "security" && <SecurityCenter />}

      {tab === "security-legacy" && (
        <div className="space-y-4">
          {[
            { title: "Change Password", desc: "Update your account password" },
            {
              title: "Two-Factor Authentication",
              desc: "2FA is enabled · Last used 2 days ago",
              badge: "Enabled",
            },
            {
              title: "Active Sessions",
              desc: "2 active sessions · Kathmandu, Nepal",
            },
            { title: "Login History", desc: "View recent login activity" },
          ].map((s) => (
            <div
              key={s.title}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 flex items-center justify-between gap-4"
            >
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">
                  {s.title}
                </h3>
                <p className="text-sm text-slate-400">{s.desc}</p>
              </div>
              {s.badge ? (
                <span className="text-xs px-3 py-1.5 rounded-full bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 font-semibold">
                  {s.badge}
                </span>
              ) : (
                <button
                  data-action-dialog
                  aria-label={s.title}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300 rounded-xl hover:border-blue-300 hover:text-blue-600 transition-colors"
                >
                  Manage
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === "privacy" && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 space-y-4">
          <h2 className="font-heading font-bold text-slate-900 dark:text-white">
            Email and notification preferences
          </h2>
          <EmailPreferences />
        </div>
      )}
    </div>
  )
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

const SIDEBAR_ITEMS: Array<{
  id: Section
  label: string
  iconKey: keyof typeof IC
  badge?: number | string
}> = [
  { id: "dashboard", label: "Dashboard", iconKey: "home" },
  { id: "find-work", label: "Find Work", iconKey: "search" },
  { id: "applications", label: "Applications", iconKey: "doc" },
  { id: "saved", label: "Saved", iconKey: "bookmark" },
  { id: "services", label: "My Services", iconKey: "briefcase" },
  { id: "messages", label: "Messages", iconKey: "chat" },
  { id: "ai-hub", label: "AI Career Hub", iconKey: "brain" },
  { id: "trust", label: "Trust Center", iconKey: "shield" },
  { id: "settings", label: "Settings", iconKey: "gear" },
]

function MyServices() {
  const dialog = useActionDialog()
  const [services, setServices] = useState<ApiServiceListing[]>([])
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title: "",
    category: "",
    description: "",
    location: "",
    price: "",
    price_unit: "hour",
  })

  const load = () =>
    api.services
      .mine()
      .then((page) => setServices(page.results))
      .catch(() => setServices([]))

  useEffect(() => {
    void load()
  }, [])

  const publish = async () => {
    if (!form.title.trim() || !form.category.trim() || !form.description.trim() || !form.price) {
      await dialog.alert({
        title: "Complete the service form",
        message: "Title, category, description, and price are required.",
        variant: "warning",
      })
      return
    }
    setSaving(true)
    try {
      await api.services.create({
        title: form.title.trim(),
        category: form.category.trim(),
        description: form.description.trim(),
        location: form.location.trim() || "Kathmandu",
        price: Number(form.price),
        price_unit: form.price_unit,
        status: "active",
      })
      setForm({ title: "", category: "", description: "", location: "", price: "", price_unit: "hour" })
      await load()
      await dialog.alert({
        title: "Service published",
        message: "Employers can now discover and book this listing.",
        variant: "success",
      })
    } catch (error) {
      await dialog.alert({
        title: "Unable to publish service",
        message: error instanceof ApiError ? error.message : "Please try again.",
        variant: "danger",
      })
    } finally {
      setSaving(false)
    }
  }

  const toggleStatus = async (service: ApiServiceListing) => {
    try {
      await api.services.update(service.id, {
        status: service.status === "active" ? "paused" : "active",
      })
      await load()
    } catch (error) {
      await dialog.alert({
        title: "Unable to update service",
        message: error instanceof ApiError ? error.message : "Please try again.",
        variant: "danger",
      })
    }
  }

  const removeService = async (service: ApiServiceListing) => {
    const accepted = await dialog.confirm({
      title: "Remove this service?",
      message: `“${service.title}” will be deleted permanently.`,
      confirmLabel: "Remove",
      variant: "danger",
    })
    if (!accepted) return
    try {
      await api.services.remove(service.id)
      await load()
    } catch (error) {
      await dialog.alert({
        title: "Unable to remove service",
        message: error instanceof ApiError ? error.message : "Please try again.",
        variant: "danger",
      })
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="font-heading text-2xl font-extrabold text-slate-900 dark:text-white mb-1">
        My Services
      </h1>
      <p className="text-slate-400 text-sm mb-5">
        Publish skills and gigs employers can book through KaamVerse.
      </p>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 mb-6 space-y-3">
        <h2 className="font-heading font-bold text-slate-900 dark:text-white">Publish a service</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Service title" className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-sm" />
          <input value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} placeholder="Category (e.g. Cleaning)" className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-sm" />
          <input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} placeholder="Location" className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-sm" />
          <div className="flex gap-2">
            <input value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} placeholder="Price" type="number" min="1" className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-sm" />
            <select value={form.price_unit} onChange={(e) => setForm((f) => ({ ...f, price_unit: e.target.value }))} className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-sm">
              <option value="hour">per hour</option>
              <option value="session">per session</option>
              <option value="day">per day</option>
              <option value="project">per project</option>
            </select>
          </div>
        </div>
        <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Describe what you offer" rows={3} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-sm" />
        <button disabled={saving} onClick={() => void publish()} className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold">
          {saving ? "Publishing..." : "Publish service"}
        </button>
      </div>

      <div className="space-y-3">
        {services.map((service) => (
          <div key={service.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 flex flex-wrap items-start gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h3 className="font-heading font-bold text-slate-900 dark:text-white">{service.title}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${service.status === "active" ? "bg-green-50 text-green-700 dark:bg-green-950" : "bg-slate-100 text-slate-600 dark:bg-slate-800"}`}>
                  {service.status}
                </span>
              </div>
              <p className="text-sm text-slate-500">{service.category} · NPR {Number(service.price).toLocaleString()}/{service.price_unit} · {service.location || "Nepal"}</p>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">{service.description}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => void toggleStatus(service)} className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold">
                {service.status === "active" ? "Pause" : "Activate"}
              </button>
              <button onClick={() => void removeService(service)} className="px-3 py-2 rounded-xl border border-red-200 text-red-600 text-xs font-semibold">
                Remove
              </button>
            </div>
          </div>
        ))}
        {!services.length && (
          <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 p-8 text-center text-sm text-slate-500">
            You have not published any services yet.
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export function JobSeekerDashboard({ onLogout }: { onLogout: () => void }) {
  const dialog = useActionDialog()
  const [section, setSection] = useState<Section>("dashboard")
  const [collapsed, setCollapsed] = useState(false)
  const [jobs, setJobs] = useState<UiJob[]>([])
  const [applications, setApplications] = useState<UiApplication[]>([])
  const [savedJobCards, setSavedJobCards] = useState<UiJob[]>([])
  const [savedJobs, setSavedJobs] = useState<number[]>([])
  const [appliedJobs, setAppliedJobs] = useState<number[]>([])
  const [seekerUser, setSeekerUser] = useState<SeekerUserView>(DEFAULT_SEEKER_USER)
  const [apiMessage, setApiMessage] = useState(
    "Loading your live KaamVerse data...",
  )
  const [dashboardStats, setDashboardStats] =
    useState<Record<string, string | number>>({})

  const loadLiveData = async () => {
    try {
      const [recommended, applicationPage, savedPage, stats, me] =
        await Promise.all([
          api.jobs.recommendations(),
          api.applications.list(),
          api.savedJobs.list(),
          api.dashboard(),
          api.auth.me(),
        ])
      setJobs(recommended.map(mapJob))
      setApplications(applicationPage.results.map(mapApplication))
      setAppliedJobs(
        applicationPage.results
          .filter((item) => item.status !== "withdrawn")
          .map((item) => item.job),
      )
      setSavedJobs(savedPage.results.map((item) => item.job))
      setSavedJobCards(
        savedPage.results.map((item) => mapJob(item.job_details)),
      )
      setDashboardStats(stats)
      setSeekerUser(mapSeekerUser(me, recommended.length))
      setApiMessage("")
    } catch (error) {
      setApiMessage(
        error instanceof ApiError
          ? error.message
          : "Unable to load live marketplace data.",
      )
    }
  }

  useEffect(() => {
    void loadLiveData()
    const timer = window.setInterval(() => {
      void api
        .dashboard()
        .then(setDashboardStats)
        .catch(() => undefined)
    }, 10000)
    return () => window.clearInterval(timer)
  }, [])

  const sidebarBadge = (item: typeof SIDEBAR_ITEMS[number]) => {
    if (item.id === "applications") return applications.length
    if (item.id === "saved") return savedJobs.length
    if (item.id === "find-work") return jobs.length || undefined
    if (item.id === "messages")
      return Number(dashboardStats.unread_messages || 0)
    return item.badge
  }

  const applyForJob = async (jobId: number) => {
    if (appliedJobs.includes(jobId)) return
    const job =
      jobs.find((item) => item.id === jobId) ??
      savedJobCards.find((item) => item.id === jobId)
    const accepted = await dialog.confirm({
      title: "Submit this application?",
      message: `Your KaamVerse profile will be sent${
        job ? ` for “${job.title}”` : ""
      }.`,
      confirmLabel: "Apply now",
      variant: "info",
    })
    if (!accepted) return
    try {
      await api.applications.create(jobId)
      setAppliedJobs((previous) => [...previous, jobId])
      const applicationPage = await api.applications.list()
      setApplications(applicationPage.results.map(mapApplication))
      setApiMessage("Application submitted successfully.")
      await dialog.alert({
        title: "Application submitted",
        message: "The employer can now review your profile and application.",
        variant: "success",
      })
    } catch (error) {
      setApiMessage(
        error instanceof ApiError
          ? error.message
          : "Unable to submit the application.",
      )
    }
  }

  const toggleSavedJob = async (jobId: number) => {
    try {
      const result = await api.savedJobs.toggle(jobId)
      setSavedJobs((previous) =>
        result.saved
          ? [...new Set([...previous, jobId])]
          : previous.filter((id) => id !== jobId),
      )
      const savedPage = await api.savedJobs.list()
      setSavedJobCards(
        savedPage.results.map((item) => mapJob(item.job_details)),
      )
      setApiMessage(
        result.saved ? "Job saved." : "Job removed from saved items.",
      )
    } catch (error) {
      setApiMessage(
        error instanceof ApiError
          ? error.message
          : "Unable to update saved jobs.",
      )
    }
  }

  const withdrawApplication = async (applicationId: number) => {
    const accepted = await dialog.confirm({
      title: "Withdraw this application?",
      message: "The employer will no longer see this application as active.",
      confirmLabel: "Withdraw",
      variant: "danger",
    })
    if (!accepted) return
    try {
      await api.applications.withdraw(applicationId)
      const applicationPage = await api.applications.list()
      setApplications(applicationPage.results.map(mapApplication))
      setAppliedJobs(
        applicationPage.results
          .filter((item) => item.status !== "withdrawn")
          .map((item) => item.job),
      )
      setApiMessage("Application withdrawn.")
    } catch (error) {
      setApiMessage(
        error instanceof ApiError
          ? error.message
          : "Unable to withdraw the application.",
      )
    }
  }

  return (
    <SeekerUserContext.Provider value={seekerUser}>
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Sidebar */}
      <aside
        className={`${
          collapsed ? "w-16" : "w-60"
        } shrink-0 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 sticky top-16 h-[calc(100vh-4rem)] flex flex-col transition-all duration-200 overflow-hidden z-30`}
      >
        <div className="flex-1 overflow-y-auto py-4">
          <div
            className={`px-3 mb-4 ${
              collapsed
                ? "flex justify-center"
                : "flex items-center justify-between"
            }`}
          >
            {!collapsed && (
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2">
                Job Seeker
              </p>
            )}
            <button
              onClick={() => setCollapsed((v) => !v)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d={
                    collapsed
                      ? "M13 5l7 7-7 7M5 5l7 7-7 7"
                      : "M11 19l-7-7 7-7m8 14l-7-7 7-7"
                  }
                />
              </svg>
            </button>
          </div>

          <nav className="px-3 space-y-0.5">
            {SIDEBAR_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => setSection(item.id)}
                title={collapsed ? item.label : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${
                  section === item.id
                    ? "bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Ico d={IC[item.iconKey]} cls="w-5 h-5 shrink-0" />
                {!collapsed && (
                  <>
                    <span className="flex-1 text-sm font-medium text-left">
                      {item.label}
                    </span>
                    {sidebarBadge(item) !== undefined && (
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                          section === item.id
                            ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                        }`}
                      >
                        {sidebarBadge(item)}
                      </span>
                    )}
                  </>
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-3 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors group"
          >
            <Ico d={IC.logout} cls="w-5 h-5 shrink-0" />
            {!collapsed && <span className="text-sm font-medium">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 overflow-auto">
        {apiMessage && (
          <div className="mx-6 mt-4 px-4 py-3 rounded-xl border border-blue-100 dark:border-blue-900 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-sm font-medium">
            {apiMessage}
          </div>
        )}
        {section === "dashboard" && (
          <DashboardHome
            setSection={setSection}
            jobs={jobs}
            savedJobs={savedJobs}
            appliedJobs={appliedJobs}
            onApply={applyForJob}
            onToggleSaved={toggleSavedJob}
          />
        )}
        {section === "find-work" && (
          <FindWork
            jobs={jobs}
            savedJobs={savedJobs}
            appliedJobs={appliedJobs}
            onApply={applyForJob}
            onToggleSaved={toggleSavedJob}
            onMessage={() => setSection("messages")}
          />
        )}
        {section === "applications" && (
          <Applications
            applications={applications}
            onWithdraw={withdrawApplication}
          />
        )}
        {section === "saved" && (
          <Saved
            jobs={savedJobCards}
            onApply={applyForJob}
            appliedJobs={appliedJobs}
          />
        )}
        {section === "services" && <MyServices />}
        {section === "messages" && <MessagesWorkspace />}
        {section === "ai-hub" && <AICareerHub />}
        {section === "trust" && <TrustCenter />}
        {section === "settings" && <Settings />}
      </main>
    </div>
    </SeekerUserContext.Provider>
  )
}
