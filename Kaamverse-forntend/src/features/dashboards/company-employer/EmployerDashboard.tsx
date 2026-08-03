import { useEffect, useRef, useState } from "react"
import { api, ApiError } from "@/lib/api/client"
import type {
  ApiApplication,
  ApiJob,
  ApiSecurityOverview,
  ApiServiceListing,
  ApiTalent,
  JobPayload,
} from "@/lib/api/types"
import {
  PreferenceToggle,
  useActionDialog,
} from "@/components/ui/ActionDialogs"
import {
  ExactScheduleEditor,
  scheduleCovers,
  scheduleSummary,
  type ExactSchedule,
} from "@/components/ui/ExactScheduleEditor"
import { EmailPreferences } from "@/components/ui/SystemFeedback"
import { MessagesWorkspace } from "@/features/messaging/MessagesWorkspace"
import { UnifiedDetailPage } from "@/components/marketplace/UnifiedDetailPage"
import { SecurityCenter } from "@/components/settings/SecurityCenter"
import { DocumentVerificationPanel } from "@/components/settings/DocumentVerificationPanel"

type ESection = "dashboard" | "hiring" | "posts" | "services" | "messages" | "analytics" | "company" | "trust" | "settings"

// ─── Icons (shared pattern) ───────────────────────────────────────────────────

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
  briefcase:
    "M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
  doc: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
  shop: "M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z",
  chat: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",
  chart:
    "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
  building:
    "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
  star: "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z",
  gear: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
  logout:
    "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1",
  plus: "M12 4v16m8-8H4",
  x: "M6 18L18 6M6 6l12 12",
  check: "M5 13l4 4L19 7",
  search: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  video:
    "M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z",
  phone:
    "M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z",
  send: "M12 19l9 2-9-18-9 18 9-2zm0 0v-8",
  paper:
    "M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13",
  mic: "M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z",
  edit: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
  trash:
    "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16",
  users:
    "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z",
  brain:
    "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z",
  shield:
    "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
  lock: "M12 15v2m-6 4h12a2 2 0 002-2v-7a2 2 0 00-2-2H6a2 2 0 00-2 2v7a2 2 0 002 2zm10-11V7a4 4 0 00-8 0v3h8z",
  key: "M15 7a4 4 0 11-7.446 2.032L3 13.586V17h3v3h4l4.968-4.968A4 4 0 0115 7z",
  device:
    "M9.75 17 9 20l-1 1h8l-1-1-.75-3M3 13h18M5 4h14a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z",
  history: "M12 8v4l3 2m6-2a9 9 0 11-3-6.708M21 3v6h-6",
  eye: "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z",
  duplicate:
    "M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z",
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
        className="relative z-10 font-bold"
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

// ─── Mock Data ────────────────────────────────────────────────────────────────

const COMPANY = {
  name: "Leapfrog Technology",
  initials: "LT",
  color: "#2563EB",
  industry: "Software & Technology",
  trust: 98,
  badge: "Trusted Professional",
  employees: "200+",
  website: "leapfrogtechnology.com",
}

const CANDIDATES = [
  {
    id: 1,
    name: "Aarav Sharma",
    initials: "AS",
    color: "#2563EB",
    title: "Full-Stack Developer",
    trust: 96,
    match: 96,
    badge: "Trusted Professional",
    exp: "5 years",
    location: "Kathmandu",
    avail: "Immediately",
    skills: ["React", "TypeScript", "Node.js"],
    rating: 4.9,
    status: "interview",
  },
  {
    id: 2,
    name: "Priya Thapa",
    initials: "PT",
    color: "#7C3AED",
    title: "UI/UX Designer",
    trust: 94,
    match: 89,
    badge: "Identity Verified",
    exp: "3 years",
    location: "Lalitpur",
    avail: "Within 2 weeks",
    skills: ["Figma", "Prototyping", "Research"],
    rating: 4.8,
    status: "review",
  },
  {
    id: 3,
    name: "Rohan Adhikari",
    initials: "RA",
    color: "#059669",
    title: "React Developer",
    trust: 91,
    match: 85,
    badge: "Identity Verified",
    exp: "4 years",
    location: "Kathmandu",
    avail: "Within 1 month",
    skills: ["React", "Vue.js", "CSS"],
    rating: 4.7,
    status: "applied",
  },
  {
    id: 4,
    name: "Sita Gurung",
    initials: "SG",
    color: "#DC2626",
    title: "Backend Developer",
    trust: 98,
    match: 92,
    badge: "Trusted Professional",
    exp: "6 years",
    location: "Bhaktapur",
    avail: "Immediately",
    skills: ["Node.js", "Python", "AWS"],
    rating: 4.9,
    status: "selected",
  },
  {
    id: 5,
    name: "Dipesh Maharjan",
    initials: "DM",
    color: "#D97706",
    title: "Mobile Developer",
    trust: 93,
    match: 79,
    badge: "Identity Verified",
    exp: "3 years",
    location: "Kathmandu",
    avail: "Within 2 weeks",
    skills: ["Flutter", "React Native", "iOS"],
    rating: 4.8,
    status: "applied",
  },
].map((candidate, index) => ({
  ...candidate,
  availability: Object.fromEntries(
    ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map((day) => [
      day,
      index % 2 ? "10:00-18:00" : "09:00-17:00",
    ]),
  ) as ExactSchedule,
}))

const POSTS = [
  {
    id: 1,
    title: "Senior React Developer",
    type: "Part-Time Job",
    status: "Active",
    applicants: 28,
    views: 342,
    deadline: "Mar 30",
    trust: 80,
    verification: "Identity Verified",
    color: "#2563EB",
  },
  {
    id: 2,
    title: "Brand Designer Project",
    type: "Freelance Project",
    status: "Active",
    applicants: 14,
    views: 198,
    deadline: "Mar 25",
    trust: 70,
    verification: "Basic Verified",
    color: "#7C3AED",
  },
  {
    id: 3,
    title: "Home Delivery – Weekend",
    type: "On-Demand Gig",
    status: "Paused",
    applicants: 8,
    views: 87,
    deadline: "Apr 5",
    trust: 60,
    verification: "Basic Verified",
    color: "#F59E0B",
  },
  {
    id: 4,
    title: "SEO Content Writer",
    type: "Freelance Project",
    status: "Active",
    applicants: 22,
    views: 265,
    deadline: "Mar 28",
    trust: 75,
    verification: "Identity Verified",
    color: "#059669",
  },
]

const SERVICE_WORKERS = [
  {
    id: 1,
    name: "Aarav Sharma",
    initials: "AS",
    color: "#2563EB",
    profession: "Full-Stack Developer",
    trust: 96,
    rating: 4.9,
    reviews: 127,
    price: "NPR 2,500/hr",
    avail: "Weekdays",
    badge: "Trusted Professional",
    skills: ["React", "Node.js", "AWS"],
  },
  {
    id: 2,
    name: "Priya Thapa",
    initials: "PT",
    color: "#7C3AED",
    profession: "UI/UX Designer",
    trust: 94,
    rating: 4.8,
    reviews: 89,
    price: "NPR 2,000/hr",
    avail: "Mon–Fri",
    badge: "Identity Verified",
    skills: ["Figma", "Illustration", "Branding"],
  },
  {
    id: 3,
    name: "Sunita Rai",
    initials: "SR",
    color: "#0891B2",
    profession: "Content Writer",
    trust: 89,
    rating: 4.6,
    reviews: 231,
    price: "NPR 1,200/hr",
    avail: "Flexible",
    badge: "Identity Verified",
    skills: ["Copywriting", "SEO", "Nepali"],
  },
  {
    id: 4,
    name: "Dipesh Maharjan",
    initials: "DM",
    color: "#D97706",
    profession: "Mobile Developer",
    trust: 93,
    rating: 4.8,
    reviews: 112,
    price: "NPR 2,200/hr",
    avail: "Weekends",
    badge: "Identity Verified",
    skills: ["Flutter", "iOS", "Android"],
  },
  {
    id: 5,
    name: "Rohan Adhikari",
    initials: "RA",
    color: "#059669",
    profession: "Digital Marketer",
    trust: 91,
    rating: 4.7,
    reviews: 203,
    price: "NPR 1,500/hr",
    avail: "Flexible",
    badge: "Identity Verified",
    skills: ["SEO", "Google Ads", "Analytics"],
  },
  {
    id: 6,
    name: "Nisha Shakya",
    initials: "NS",
    color: "#DC2626",
    profession: "Graphic Designer",
    trust: 87,
    rating: 4.5,
    reviews: 156,
    price: "NPR 1,800/hr",
    avail: "Mon–Sat",
    badge: "Basic Verified",
    skills: ["Photoshop", "Illustrator", "Branding"],
  },
]

const CONVOS = [
  {
    id: 1,
    name: "Aarav Sharma",
    initials: "AS",
    color: "#2563EB",
    last: "Thank you! I'll send my portfolio shortly.",
    time: "5m",
    unread: 1,
    online: true,
  },
  {
    id: 2,
    name: "Priya Thapa",
    initials: "PT",
    color: "#7C3AED",
    last: "Looking forward to the interview!",
    time: "1h",
    unread: 0,
    online: true,
  },
  {
    id: 3,
    name: "Rohan Adhikari",
    initials: "RA",
    color: "#059669",
    last: "Can we reschedule to Friday?",
    time: "2h",
    unread: 2,
    online: false,
  },
]

const EMP_MSGS: Record<number, Array<{
  id: number
  text: string
  from: "me" | "them"
  time: string
}>> = {
  1: [
    {
      id: 1,
      text: "Hello Aarav! We reviewed your application for the Senior React Developer position.",
      from: "me",
      time: "10:00 AM",
    },
    {
      id: 2,
      text: "Thank you for considering my application! I'm very excited about this opportunity at Leapfrog.",
      from: "them",
      time: "10:05 AM",
    },
    {
      id: 3,
      text: "Your profile is an excellent match — 96% AI match score! Could you share your portfolio?",
      from: "me",
      time: "10:15 AM",
    },
    {
      id: 4,
      text: "Absolutely! I'll share my GitHub and recent project links. Thank you for reaching out.",
      from: "them",
      time: "10:20 AM",
    },
    {
      id: 5,
      text: "Thank you! I'll send my portfolio shortly.",
      from: "them",
      time: "5m ago",
    },
  ],
  2: [
    {
      id: 1,
      text: "Hi Priya! We'd like to invite you for an interview for the Brand Designer position.",
      from: "me",
      time: "9:00 AM",
    },
    {
      id: 2,
      text: "That's wonderful news! I'd love to come in for an interview.",
      from: "them",
      time: "9:30 AM",
    },
    {
      id: 3,
      text: "Great! Can you do a video call on Thursday at 2 PM?",
      from: "me",
      time: "9:35 AM",
    },
    {
      id: 4,
      text: "Looking forward to the interview!",
      from: "them",
      time: "1h ago",
    },
  ],
}

// ─── Dashboard Home ───────────────────────────────────────────────────────────

function EmpDashboardHome({
  setSection,
  dashboardStats,
}: {
  setSection: (s: ESection) => void
  dashboardStats: Record<string, string | number>
}) {
  const [reviewingCandidate, setReviewingCandidate] =
    useState<typeof CANDIDATES[number] | null>(null)
  const stats = [
    {
      label: "Active Jobs",
      value: String(dashboardStats.active_jobs ?? 0),
      icon: "💼",
      color: "#2563EB",
      trend: "Approved marketplace posts",
    },
    {
      label: "Applications",
      value: String(dashboardStats.applications ?? 0),
      icon: "📋",
      color: "#7C3AED",
      trend: "Received across your posts",
    },
    {
      label: "Interviews",
      value: String(dashboardStats.interviews ?? 0),
      icon: "📅",
      color: "#F59E0B",
      trend: "Candidates at interview stage",
    },
    {
      label: "Jobseekers Hired",
      value: String(dashboardStats.accepted_hires ?? 0),
      icon: "👥",
      color: "#059669",
      trend: "Accepted applications",
    },
    {
      label: "Trust Score",
      value: String(dashboardStats.trust_score ?? 0),
      icon: "🛡️",
      color: "#F59E0B",
      trend: "Live account trust score",
    },
    {
      label: "Company Verified",
      value: dashboardStats.verification_status === "approved" ? "✓" : "—",
      icon: "✅",
      color: "#22C55E",
      trend: String(dashboardStats.verification_status ?? "pending").replace(
        "-",
        " ",
      ),
    },
  ]

  const quickActions = [
    {
      icon: "💼",
      label: "Post Part-Time Job",
      color: "bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300",
      fn: () => setSection("posts"),
    },
    {
      icon: "💻",
      label: "Post Freelance Project",
      color:
        "bg-violet-50 dark:bg-violet-950 text-violet-700 dark:text-violet-300",
      fn: () => setSection("posts"),
    },
    {
      icon: "⚡",
      label: "Post On-Demand Gig",
      color: "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300",
      fn: () => setSection("posts"),
    },
    {
      icon: "🛍️",
      label: "Browse Services",
      color:
        "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300",
      fn: () => setSection("services"),
    },
    {
      icon: "🤖",
      label: "AI Worker Matches",
      color:
        "bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300",
      fn: () => setSection("hiring"),
    },
    {
      icon: "🏢",
      label: "Company Profile",
      color: "bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300",
      fn: () => setSection("company"),
    },
  ]

  if (reviewingCandidate)
    return (
      <UnifiedDetailPage
        backLabel="Back to Employer Dashboard"
        onBack={() => setReviewingCandidate(null)}
        icon={reviewingCandidate.initials}
        title={reviewingCandidate.name}
        subtitle={`${reviewingCandidate.title} · ${reviewingCandidate.location}`}
        verifiedLabel={reviewingCandidate.badge}
        score={reviewingCandidate.match}
        scoreTitle="Candidate Match Score"
        scoreMessage={`${reviewingCandidate.name}'s skills and verified profile align with your current hiring requirements.`}
        facts={[
          { label: "Location", value: reviewingCandidate.location, icon: "⌖" },
          { label: "Experience", value: reviewingCandidate.exp, icon: "◷" },
          {
            label: "Trust",
            value: `${reviewingCandidate.trust}/100`,
            icon: "✣",
          },
          {
            label: "Rating",
            value: `${reviewingCandidate.rating}/5`,
            icon: "★",
          },
        ]}
        tags={reviewingCandidate.skills}
        descriptionTitle="Candidate description"
        description={`${reviewingCandidate.name} is a verified KaamVerse jobseeker. Open the Hiring Workspace to review the live application, send a secure message, schedule an interview, or confirm hiring.`}
        sections={[
          {
            title: "Professional skills",
            items: reviewingCandidate.skills.map(
              (skill) => `Verified profile skill: ${skill}`,
            ),
            check: true,
          },
          {
            title: "Recommended next steps",
            items: [
              "Review the live application",
              "Discuss schedule in secure messages",
              "Schedule an interview",
              "Confirm hiring with the required confirmation dialog",
            ],
          },
        ]}
        primaryValue={`${reviewingCandidate.match}% match`}
        primaryMeta={reviewingCandidate.status}
        primaryLabel="Open Hiring Workspace"
        onPrimary={() => setSection("hiring")}
        onMessage={() => setSection("messages")}
        profileTitle="Jobseeker Profile"
        profileBody={`${reviewingCandidate.name} has a ${reviewingCandidate.trust}/100 trust score.`}
        reviewsSummary={`${reviewingCandidate.rating}/5 employer rating`}
        saveIcon="heart"
      />
    )

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Welcome */}
      <div className="bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 rounded-2xl p-6 mb-6 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/3" />
        <div className="relative z-10 flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center font-heading font-bold text-xl">
              {COMPANY.initials}
            </div>
            <div>
              <p className="text-blue-200 text-sm">
                Good morning · Employer Dashboard
              </p>
              <h1 className="font-heading text-2xl font-extrabold">
                {COMPANY.name}
              </h1>
              <TrustBadge level={COMPANY.badge} />
            </div>
          </div>
          <div className="bg-white/10 rounded-2xl px-5 py-3 flex items-center gap-3">
            <span className="text-2xl">🤖</span>
            <div className="text-sm">
              <p className="text-white font-semibold">AI Insight</p>
              <p className="text-blue-200 text-xs leading-snug">
                Workers available for evening shifts
                <br />
                receive{" "}
                <strong className="text-white">28% more responses</strong>.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
        {stats.map((s) => (
          <div
            key={s.label}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-4"
          >
            <div className="text-xl mb-2">{s.icon}</div>
            <div
              className="font-heading font-extrabold text-2xl text-slate-900 dark:text-white mb-0.5"
              style={{ color: s.color }}
            >
              {s.value}
            </div>
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {s.label}
            </p>
            <p className="text-xs text-slate-400">{s.trend}</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Recent Applications */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading font-bold text-slate-900 dark:text-white">
              Recent Applications
            </h2>
            <button
              onClick={() => setSection("hiring")}
              className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline"
            >
              View all →
            </button>
          </div>
          <div className="space-y-3">
            {CANDIDATES.slice(0, 4).map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm shrink-0"
                  style={{ backgroundColor: c.color }}
                >
                  {c.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                      {c.name}
                    </span>
                    <TrustBadge level={c.badge} />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {c.title} · {c.location}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <MatchRing pct={c.match} size={36} />
                  <button
                    onClick={() => setReviewingCandidate(c)}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors"
                  >
                    Review
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-5">
          {/* Upcoming Interviews */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5">
            <h2 className="font-heading font-bold text-slate-900 dark:text-white mb-3">
              Upcoming Interviews
            </h2>
            {[
              {
                name: "Aarav Sharma",
                date: "Mar 20 · 2:00 PM",
                type: "Video Call",
                color: "#2563EB",
                initials: "AS",
              },
              {
                name: "Sita Gurung",
                date: "Mar 21 · 10:00 AM",
                type: "Voice Call",
                color: "#DC2626",
                initials: "SG",
              },
            ].map((i) => (
              <div
                key={i.name}
                className="flex items-center gap-3 mb-3 last:mb-0"
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                  style={{ backgroundColor: i.color }}
                >
                  {i.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {i.name}
                  </p>
                  <p className="text-xs text-slate-400">
                    {i.date} · {i.type}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Verification Progress */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5">
            <h2 className="font-heading font-bold text-slate-900 dark:text-white mb-3">
              Verification Status
            </h2>
            {[
              { label: "Company Registration", done: true },
              { label: "PAN/VAT Document", done: true },
              { label: "Business Address", done: true },
              { label: "Company Website", done: true },
              { label: "LinkedIn Verification", done: false },
            ].map((v) => (
              <div
                key={v.label}
                className="flex items-center gap-2 mb-2 last:mb-0"
              >
                <div
                  className={`w-4 h-4 rounded-full flex items-center justify-center ${
                    v.done ? "bg-green-500" : "bg-slate-200 dark:bg-slate-700"
                  }`}
                >
                  {v.done && (
                    <svg
                      className="w-2.5 h-2.5 text-white"
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
                  )}
                </div>
                <span
                  className={`text-xs ${
                    v.done
                      ? "text-slate-700 dark:text-slate-300"
                      : "text-slate-400"
                  }`}
                >
                  {v.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Hiring Workspace ─────────────────────────────────────────────────────────

function HiringWorkspace({
  setSection,
}: {
  setSection: (section: ESection) => void
}) {
  const dialog = useActionDialog()
  const [tab, setTab] = useState("applications")
  const [showSchedule, setShowSchedule] = useState(false)
  const [scheduleCandidate, setScheduleCandidate] = useState<string>("")
  const [scheduleApplication, setScheduleApplication] = useState<number | null>(
    null,
  )
  const [interviewDate, setInterviewDate] = useState("")
  const [interviewTime, setInterviewTime] = useState("")
  const [interviewType, setInterviewType] = useState("Video")
  const [applications, setApplications] = useState<ApiApplication[]>([])
  const [workerSearch, setWorkerSearch] = useState("")
  const [wantedSchedule, setWantedSchedule] = useState<ExactSchedule>({})
  const [appliedWantedSchedule, setAppliedWantedSchedule] =
    useState<ExactSchedule>({})
  const [savingWantedSchedule, setSavingWantedSchedule] = useState(false)
  const [talent, setTalent] = useState<ApiTalent[]>([])
  const [savedTalentIds, setSavedTalentIds] = useState<number[]>([])

  const loadApplications = async () => {
    try {
      const response = await api.applications.list()
      setApplications(response.results)
    } catch (error) {
      await dialog.alert({
        title: "Unable to load applications",
        message:
          error instanceof ApiError ? error.message : "Please try again.",
        variant: "danger",
      })
    }
  }

  useEffect(() => {
    void loadApplications()
    api.talent
      .list()
      .then((page) => setTalent(page.results))
      .catch(() => setTalent([]))
    api.savedTalent
      .list()
      .then((page) =>
        setSavedTalentIds(page.results.map((item) => item.talent)),
      )
      .catch(() => setSavedTalentIds([]))
    api.auth
      .me()
      .then((user) => {
        const saved = user.employer_profile?.wanted_schedule || {}
        setWantedSchedule(saved)
        setAppliedWantedSchedule(saved)
      })
      .catch(() => undefined)
  }, [])

  const saveWantedSchedule = async () => {
    const invalidDay = Object.entries(wantedSchedule).find(([, value]) => {
      const [start = "", end = ""] = value.split("-")
      return !start || !end || start >= end
    })
    if (invalidDay) {
      await dialog.alert({
        title: "Check wanted time",
        message: `${invalidDay[0]} end time must be later than its start time.`,
        variant: "danger",
      })
      return
    }
    setSavingWantedSchedule(true)
    try {
      await api.auth.updateMe({
        employer_profile: { wanted_schedule: wantedSchedule },
      })
      setAppliedWantedSchedule({ ...wantedSchedule })
      await dialog.alert({
        title: "Wanted time applied",
        message: "Worker results now match the exact days and hours you need.",
        variant: "success",
      })
    } catch (error) {
      await dialog.alert({
        title: "Unable to save wanted time",
        message:
          error instanceof ApiError ? error.message : "Please try again.",
        variant: "danger",
      })
    } finally {
      setSavingWantedSchedule(false)
    }
  }

  const candidates = applications.map((application) => {
    const seeker = application.seeker_details
    const name =
      `${seeker.first_name} ${seeker.last_name}`.trim() || seeker.email
    const statusMap: Record<ApiApplication["status"], string> = {
      submitted: "applied",
      "under-review": "review",
      interview: "interview",
      accepted: "hired",
      rejected: "review",
      withdrawn: "review",
    }
    return {
      ...CANDIDATES[0],
      id: application.id,
      applicationId: application.id,
      userId: seeker.id,
      name,
      initials: name
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase(),
      title: seeker.seeker_profile?.headline || application.job_details.title,
      trust: seeker.trust_score,
      badge:
        seeker.verification_level >= 4
          ? "Trusted Professional"
          : seeker.verification_level >= 2
            ? "Identity Verified"
            : "Basic Verified",
      location: seeker.seeker_profile?.preferred_location || "Nepal",
      skills: seeker.seeker_profile?.skills || [],
      status: statusMap[application.status],
      match: application.job_details.match_percentage || 75,
      availability: (seeker.seeker_profile?.availability ||
        {}) as ExactSchedule,
      hiredAt: application.updated_at,
    }
  })

  const directoryWorkers = talent.map((worker, index) => ({
    ...CANDIDATES[0],
    id: worker.id,
    userId: worker.id,
    name: worker.name,
    initials: worker.name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0] || "")
      .join("")
      .toUpperCase(),
    color: ["#2563EB", "#7C3AED", "#059669", "#DC2626"][index % 4],
    title: worker.headline || "KaamVerse professional",
    trust: worker.trust_score,
    match: worker.match_percentage,
    badge:
      worker.verification_level >= 4
        ? "Trusted Professional"
        : worker.verification_level >= 2
          ? "Identity Verified"
          : "Basic Verified",
    exp: "Verified profile",
    location: worker.location || "Nepal",
    skills: worker.skills || [],
    rating: Math.max(3, Math.min(5, worker.trust_score / 20)),
    availability: worker.availability || {},
  }))
  const [selectedWorker, setSelectedWorker] =
    useState<typeof directoryWorkers[number] | null>(null)
  const [selectedCandidate, setSelectedCandidate] =
    useState<typeof candidates[number] | null>(null)

  const recommendedWorkers = directoryWorkers.filter((candidate) => {
    const query = workerSearch.trim().toLowerCase()
    if (
      query &&
      !candidate.name.toLowerCase().includes(query) &&
      !candidate.title.toLowerCase().includes(query) &&
      !candidate.skills.some((skill) => skill.toLowerCase().includes(query))
    )
      return false
    return scheduleCovers(candidate.availability, appliedWantedSchedule)
  })

  const inviteWorker = async (candidate: typeof directoryWorkers[number]) => {
    try {
      await api.conversations.create(
        candidate.userId,
        `Opportunity for ${candidate.title}`,
      )
      await dialog.alert({
        title: "Invitation ready",
        message: `A secure conversation with ${candidate.name} was created. Open Messages to send the role details.`,
        variant: "success",
      })
    } catch (error) {
      await dialog.alert({
        title: "Unable to invite worker",
        message:
          error instanceof ApiError ? error.message : "Please try again.",
        variant: "danger",
      })
    }
  }

  const toggleSavedTalent = async (userId: number) => {
    try {
      const result = await api.savedTalent.toggle(userId)
      setSavedTalentIds((current) =>
        result.saved
          ? Array.from(new Set([...current, userId]))
          : current.filter((id) => id !== userId),
      )
    } catch (error) {
      await dialog.alert({
        title: "Unable to update saved workers",
        message: error instanceof Error ? error.message : "Please try again.",
        variant: "danger",
      })
    }
  }

  const reportTalent = async (userId: number, name: string) => {
    const description = await dialog.prompt({
      title: `Report ${name}?`,
      message:
        "Describe the safety, identity, spam, or conduct concern for administrator review.",
      placeholder:
        "Include the relevant facts and avoid sensitive information.",
      confirmLabel: "Submit report",
    })
    if (!description?.trim()) return
    try {
      await api.fraudReports.create({
        reported_user: userId,
        reason: "other",
        description: description.trim(),
      })
      await dialog.alert({
        title: "Report submitted",
        message: "The Trust & Safety team can now review this report.",
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

  const updateCandidate = async (
    applicationId: number,
    status: ApiApplication["status"],
    notes = "",
  ) => {
    try {
      await api.applications.updateStatus(applicationId, status, notes)
      await loadApplications()
      await dialog.alert({
        title: "Application updated",
        message: `The candidate status is now ${status.replace("-", " ")}.`,
        variant: "success",
      })
      return true
    } catch (error) {
      await dialog.alert({
        title: "Unable to update application",
        message:
          error instanceof ApiError ? error.message : "Please try again.",
        variant: "danger",
      })
      return false
    }
  }

  const openCandidateMessage = async (candidate: typeof candidates[number]) => {
    try {
      await api.conversations.create(
        candidate.userId,
        `Application: ${candidate.title}`,
      )
      setSection("messages")
    } catch (error) {
      await dialog.alert({
        title: "Unable to open chat",
        message:
          error instanceof ApiError ? error.message : "Please try again.",
        variant: "danger",
      })
    }
  }

  const hireCandidate = async (candidate: typeof candidates[number]) => {
    const accepted = await dialog.confirm({
      title: `Hire ${candidate.name}?`,
      message: `This confirms ${candidate.name} for ${candidate.title}. The post closes automatically when every position is filled.`,
      confirmLabel: "Confirm hire",
      variant: "success",
    })
    if (accepted) {
      const hired = await updateCandidate(candidate.applicationId, "accepted")
      if (!hired) return
      setSelectedCandidate(null)
      setTab("hired")
    }
  }

  const reviewWorker = async (candidate: typeof candidates[number]) => {
    const ratingText = await dialog.prompt({
      title: `Review ${candidate.name}`,
      message: "Enter a rating from 1 to 5.",
      placeholder: "5",
      confirmLabel: "Continue",
    })
    if (!ratingText) return
    const rating = Number(ratingText)
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      await dialog.alert({
        title: "Invalid rating",
        message: "Rating must be a whole number from 1 to 5.",
        variant: "danger",
      })
      return
    }
    const feedback = await dialog.prompt({
      title: "Employer feedback",
      message: "Describe the worker’s performance professionally.",
      placeholder: "Reliable, communicative, and completed the agreed work...",
      confirmLabel: "Publish review",
    })
    if (!feedback?.trim()) return
    try {
      await api.workerReviews.create(
        candidate.userId,
        candidate.applicationId,
        rating,
        feedback.trim(),
      )
      await dialog.alert({
        title: "Review published",
        message: `${candidate.name} received your feedback and an email notification.`,
        variant: "success",
      })
    } catch (error) {
      await dialog.alert({
        title: "Unable to publish review",
        message:
          error instanceof ApiError ? error.message : "Please try again.",
        variant: "danger",
      })
    }
  }

  const scheduleInterview = async () => {
    if (!scheduleApplication || !interviewDate || !interviewTime) {
      await dialog.alert({
        title: "Choose interview time",
        message: "Select a date and time before scheduling the interview.",
        variant: "warning",
      })
      return
    }
    await updateCandidate(
      scheduleApplication,
      "interview",
      `${interviewType} interview: ${interviewDate} ${interviewTime}`,
    )
    setShowSchedule(false)
  }

  const statusConfig: Record<string, {
    label: string
    color: string
    bg: string
    step: number
  }> = {
    applied: {
      label: "Applied",
      color: "text-blue-600",
      bg: "bg-blue-50 dark:bg-blue-950",
      step: 0,
    },
    review: {
      label: "Under Review",
      color: "text-amber-600",
      bg: "bg-amber-50 dark:bg-amber-950",
      step: 1,
    },
    interview: {
      label: "Interview",
      color: "text-violet-600",
      bg: "bg-violet-50 dark:bg-violet-950",
      step: 2,
    },
    hired: {
      label: "Hired",
      color: "text-green-700",
      bg: "bg-green-50 dark:bg-green-950",
      step: 3,
    },
  }

  if (selectedCandidate)
    return (
      <UnifiedDetailPage
        initialSaved={savedTalentIds.includes(selectedCandidate.userId)}
        onSave={() => toggleSavedTalent(selectedCandidate.userId)}
        backLabel="Back to Hiring"
        onBack={() => setSelectedCandidate(null)}
        icon={selectedCandidate.initials}
        title={selectedCandidate.name}
        subtitle={`${selectedCandidate.title} · ${selectedCandidate.location}`}
        verifiedLabel={selectedCandidate.badge}
        score={selectedCandidate.match}
        scoreTitle="Candidate Match Score"
        scoreMessage={`${selectedCandidate.name}'s skills, availability, location, and verification align with this application.`}
        facts={[
          { label: "Location", value: selectedCandidate.location, icon: "⌖" },
          {
            label: "Trust score",
            value: `${selectedCandidate.trust}/100`,
            icon: "✣",
          },
          {
            label: "Application",
            value: statusConfig[selectedCandidate.status].label,
            icon: "✓",
          },
          {
            label: "Availability",
            value: scheduleSummary(selectedCandidate.availability),
            icon: "◷",
          },
        ]}
        tags={
          selectedCandidate.skills.length
            ? selectedCandidate.skills
            : ["Profile information pending"]
        }
        descriptionTitle="Candidate profile"
        description={`${selectedCandidate.name} applied for ${selectedCandidate.title}. Review the verified profile, skills, availability, and trust information before taking action.`}
        sections={[
          {
            title: "Verified capabilities",
            items: selectedCandidate.skills.length
              ? selectedCandidate.skills.map(
                  (skill) => `Experience and profile evidence for ${skill}`,
                )
              : ["Skills not provided"],
            check: true,
          },
          {
            title: "Application process",
            items: [
              "Review profile and application",
              "Use secure messages for questions",
              "Schedule an interview when appropriate",
              "Confirm the hire after agreement",
            ],
          },
          {
            title: "Employer feedback",
            items:
              selectedCandidate.status === "hired"
                ? ["This hired worker can receive verified employer feedback."]
                : ["Feedback becomes available after this candidate is hired."],
            check: true,
          },
        ]}
        primaryValue={`${selectedCandidate.match}% match`}
        primaryMeta={statusConfig[selectedCandidate.status].label}
        primaryLabel={
          selectedCandidate.status === "hired"
            ? "Review Worker"
            : "Hire Candidate"
        }
        onPrimary={() =>
          selectedCandidate.status === "hired"
            ? void reviewWorker(selectedCandidate)
            : void hireCandidate(selectedCandidate)
        }
        onMessage={() => void openCandidateMessage(selectedCandidate)}
        onReport={() =>
          void reportTalent(selectedCandidate.userId, selectedCandidate.name)
        }
        profileTitle="Full Profile"
        profileBody={`${selectedCandidate.name} has a ${selectedCandidate.trust}/100 trust score and ${selectedCandidate.skills.length} listed skills.`}
        reviewsSummary="Verified employer feedback appears after completed work."
        saveIcon="heart"
      />
    )

  if (selectedWorker)
    return (
      <UnifiedDetailPage
        initialSaved={savedTalentIds.includes(selectedWorker.userId)}
        onSave={() => toggleSavedTalent(selectedWorker.userId)}
        saveIcon="heart"
        backLabel="Back to Worker Search"
        onBack={() => setSelectedWorker(null)}
        icon={selectedWorker.initials}
        title={selectedWorker.name}
        subtitle={selectedWorker.title}
        verifiedLabel="Verified Professional"
        score={selectedWorker.match}
        scoreTitle="Talent Match Score"
        scoreMessage={`${selectedWorker.name}'s verified skills, location, trust score, and availability align with your worker requirements.`}
        facts={[
          { label: "Location", value: selectedWorker.location, icon: "⌖" },
          {
            label: "Rating",
            value: `${selectedWorker.rating.toFixed(1)} / 5`,
            icon: "★",
          },
          {
            label: "Availability",
            value: scheduleSummary(selectedWorker.availability),
            icon: "◷",
          },
          {
            label: "Trust score",
            value: `${selectedWorker.trust}%`,
            icon: "✣",
          },
        ]}
        tags={["Freelancer", "Verified", ...selectedWorker.skills]}
        descriptionTitle="About this professional"
        description={`${selectedWorker.name} is a verified KaamVerse professional available for flexible employer opportunities.`}
        sections={[
          {
            title: "Professional capabilities",
            items: selectedWorker.skills.length
              ? selectedWorker.skills.map(
                  (skill) => `Professional experience with ${skill}`,
                )
              : ["Verified professional profile"],
            check: true,
          },
          {
            title: "Hiring process",
            items: [
              "Send a secure invitation",
              "Discuss the role and exact schedule",
              "Review suitability and verification",
              "Record important communication in KaamVerse",
            ],
          },
          {
            title: "Employer protection",
            items: [
              "Verified identity and profile",
              "Trust-score visibility",
              "Persistent conversation history",
              "Reporting and administrator support",
            ],
            check: true,
            columns: true,
          },
        ]}
        primaryValue={`${selectedWorker.match}% match`}
        primaryMeta={scheduleSummary(selectedWorker.availability)}
        primaryLabel="Invite Worker"
        onPrimary={() => void inviteWorker(selectedWorker)}
        onMessage={() => void inviteWorker(selectedWorker)}
        onReport={() =>
          void reportTalent(selectedWorker.userId, selectedWorker.name)
        }
        profileTitle="Professional Profile"
        profileBody={`${selectedWorker.name} has a ${selectedWorker.trust}% trust score and a verified KaamVerse profile.`}
      />
    )

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-slate-900 dark:text-white mb-1">
            Hiring Workspace
          </h1>
          <p className="text-slate-400 text-sm">
            {candidates.length} candidates in pipeline
          </p>
        </div>
      </div>

      {/* Pipeline Visual */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 mb-5">
        <h2 className="font-heading font-bold text-slate-900 dark:text-white mb-3">
          Hiring Pipeline
        </h2>
        <div className="flex items-center gap-1 overflow-x-auto pb-2">
          {[
            [
              "Applied",
              String(
                candidates.filter((candidate) => candidate.status === "applied")
                  .length,
              ),
              "#2563EB",
            ],
            [
              "Under Review",
              String(
                candidates.filter((candidate) => candidate.status === "review")
                  .length,
              ),
              "#F59E0B",
            ],
            [
              "Interview",
              String(
                candidates.filter(
                  (candidate) => candidate.status === "interview",
                ).length,
              ),
              "#7C3AED",
            ],
            [
              "Hired",
              String(
                candidates.filter((candidate) => candidate.status === "hired")
                  .length,
              ),
              "#22C55E",
            ],
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
                <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
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
        {[
          { id: "applications", label: "Applications" },
          { id: "ai-workers", label: "🤖 AI Recommended" },
          { id: "saved", label: "Saved Workers" },
          { id: "safe-circle", label: "🛡️ Safe Circle" },
          { id: "interviews", label: "Interviews" },
          {
            id: "hired",
            label: `Hired History (${candidates.filter((candidate) => candidate.status === "hired").length})`,
          },
        ].map((t) => (
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

      {tab === "applications" && (
        <div className="space-y-4">
          {candidates
            .filter((candidate) => candidate.status !== "hired")
            .map((c) => {
              const st = statusConfig[c.status]
              return (
                <div
                  key={c.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5"
                >
                  <div className="flex items-start gap-4 flex-wrap">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-white shrink-0"
                      style={{ backgroundColor: c.color }}
                    >
                      {c.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap mb-1">
                        <h3 className="font-heading font-bold text-slate-900 dark:text-white">
                          {c.name}
                        </h3>
                        <TrustBadge level={c.badge} />
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-semibold ${st.bg} ${st.color}`}
                        >
                          {st.label}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
                        {c.title} · {c.exp} exp · {c.location} · Available:{" "}
                        {c.avail}
                      </p>
                      <div className="flex flex-wrap gap-1 mb-3">
                        {c.skills.map((s) => (
                          <span
                            key={s}
                            className="text-xs px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-medium"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">
                          Trust:{" "}
                          <strong className="text-amber-600">
                            {c.trust}/100
                          </strong>
                        </span>
                        <span className="text-slate-200 dark:text-slate-700">
                          ·
                        </span>
                        <span className="text-xs text-slate-400">
                          Rating:{" "}
                          <strong className="text-amber-500">
                            {c.rating}★
                          </strong>
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <MatchRing pct={c.match} size={48} />
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => void toggleSavedTalent(c.userId)}
                          aria-label={
                            savedTalentIds.includes(c.userId)
                              ? "Remove saved worker"
                              : "Save worker"
                          }
                          className={`px-3 py-1.5 border text-xs font-semibold rounded-lg ${
                            savedTalentIds.includes(c.userId)
                              ? "border-rose-300 bg-rose-50 text-rose-600"
                              : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                          }`}
                        >
                          {savedTalentIds.includes(c.userId)
                            ? "♥ Saved"
                            : "♡ Save"}
                        </button>
                        <button
                          onClick={() => void reportTalent(c.userId, c.name)}
                          className="px-3 py-1.5 border border-red-200 text-red-600 text-xs font-semibold rounded-lg"
                        >
                          Report
                        </button>
                        <button
                          onClick={() => setSelectedCandidate(c)}
                          className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 rounded-lg hover:border-blue-300 hover:text-blue-600 transition-colors"
                        >
                          Profile
                        </button>
                        <button
                          onClick={() => void openCandidateMessage(c)}
                          className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 rounded-lg hover:border-blue-300 hover:text-blue-600 transition-colors"
                        >
                          Message
                        </button>
                        <button
                          onClick={() => {
                            setScheduleCandidate(c.name)
                            setScheduleApplication(c.applicationId)
                            setShowSchedule(true)
                          }}
                          className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold rounded-lg transition-colors"
                        >
                          Interview
                        </button>
                        <button
                          onClick={() => void hireCandidate(c)}
                          className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg transition-colors"
                        >
                          Hire
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
        </div>
      )}

      {tab === "hired" && (
        <div className="space-y-4">
          {candidates
            .filter((candidate) => candidate.status === "hired")
            .map((candidate) => (
              <div
                key={candidate.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-emerald-200 dark:border-emerald-900 shadow-sm p-5"
              >
                <div className="flex items-start gap-4 flex-wrap">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-white shrink-0 bg-emerald-600">
                    {candidate.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-heading font-bold text-slate-900 dark:text-white">
                        {candidate.name}
                      </h3>
                      <TrustBadge level={candidate.badge} />
                      <span className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                        ✓ Hired
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      {candidate.title} · {candidate.location}
                    </p>
                    <p className="text-xs text-slate-400 mt-2">
                      Hired on{" "}
                      {new Date(candidate.hiredAt).toLocaleDateString()} · Trust{" "}
                      {candidate.trust}/100
                    </p>
                    <div className="flex flex-wrap gap-1 mt-3">
                      {candidate.skills.map((skill) => (
                        <span
                          key={skill}
                          className="text-xs px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setSelectedCandidate(candidate)}
                      className="px-3 py-2 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 rounded-xl hover:text-blue-600"
                    >
                      Profile
                    </button>
                    <button
                      onClick={() => void openCandidateMessage(candidate)}
                      className="px-3 py-2 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 rounded-xl hover:text-blue-600"
                    >
                      Message
                    </button>
                    <button
                      onClick={() => void reviewWorker(candidate)}
                      className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl"
                    >
                      Review Worker
                    </button>
                  </div>
                </div>
              </div>
            ))}
          {!candidates.some((candidate) => candidate.status === "hired") && (
            <div className="py-14 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
              <p className="font-bold text-slate-700 dark:text-slate-200">
                No hired workers yet
              </p>
              <p className="text-sm text-slate-400 mt-1">
                Confirmed hires will be stored here automatically.
              </p>
            </div>
          )}
        </div>
      )}

      {tab === "ai-workers" && (
        <div>
          {/* AI Hero */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-5 mb-5 text-white">
            <div className="flex items-center gap-4">
              <div className="text-4xl">🤖</div>
              <div className="flex-1">
                <h2 className="font-heading font-bold text-lg mb-1">
                  AI Recommended Workers
                </h2>
                <p className="text-blue-100 text-sm">
                  Top match: Aarav Sharma — 96% fit for your Senior React
                  Developer requirement based on skills, schedule, location and
                  trust score.
                </p>
              </div>
              <MatchRing pct={96} size={56} />
            </div>
          </div>

          {/* Why This Worker */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5 mb-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
                AS
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">
                  Aarav Sharma · 96% Match
                </h3>
                <p className="text-xs text-slate-400">AI Match Breakdown</p>
              </div>
            </div>
            {[
              ["Skill Match", "98%", "#22C55E"],
              ["Schedule Match", "95%", "#2563EB"],
              ["Location Match", "100%", "#22C55E"],
              ["Experience Match", "94%", "#22C55E"],
              ["Trust Score Match", "96%", "#F59E0B"],
            ].map(([k, v, c]) => (
              <div key={k} className="flex items-center gap-3 mb-2">
                <span className="text-xs text-slate-500 dark:text-slate-400 w-36 shrink-0">
                  {k}
                </span>
                <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full">
                  <div
                    className="h-1.5 rounded-full"
                    style={{ width: v, backgroundColor: c }}
                  />
                </div>
                <span className="text-xs font-bold" style={{ color: c }}>
                  {v}
                </span>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-[18rem_1fr] gap-5">
            <aside className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 h-fit">
              <input
                value={workerSearch}
                onChange={(event) => setWorkerSearch(event.target.value)}
                placeholder="Search workers or skills..."
                className="w-full px-3 py-2.5 mb-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500"
              />
              <ExactScheduleEditor
                value={wantedSchedule}
                onChange={setWantedSchedule}
                compact
                title="Worker Wanted Time"
              />
              <button
                disabled={savingWantedSchedule}
                onClick={saveWantedSchedule}
                className="w-full mt-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold"
              >
                {savingWantedSchedule ? "Saving..." : "Save & Apply Time"}
              </button>
            </aside>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              {recommendedWorkers.map((c) => (
                <article
                  key={c.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-blue-200 dark:border-blue-900 shadow-sm p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-white shrink-0"
                        style={{ backgroundColor: c.color }}
                      >
                        {c.initials}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-heading font-bold text-slate-950 dark:text-white leading-tight">
                          {c.name}
                        </h3>
                        <p className="text-sm text-slate-500 mt-1 truncate">
                          {c.title}
                        </p>
                      </div>
                    </div>
                    <span className="px-3 py-1.5 rounded-full border border-violet-200 bg-violet-50 dark:bg-violet-950 text-violet-700 dark:text-violet-300 text-sm font-bold shrink-0">
                      ✣ {c.match}%
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-4">
                    <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200">
                      {c.exp}
                    </span>
                    <span className="px-3 py-1 rounded-full border border-sky-200 bg-sky-50 dark:bg-sky-950 text-sky-700 text-xs font-semibold">
                      ✓ Verified
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-4 text-sm text-slate-500 dark:text-slate-400">
                    <span>⌖ {c.location}</span>
                    <span>★ {c.rating} rating</span>
                    <span className="col-span-2 truncate">
                      ◷ {scheduleSummary(c.availability)}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-4">
                    {c.skills.map((skill) => (
                      <span
                        key={skill}
                        className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => void toggleSavedTalent(c.userId)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-semibold ${
                        savedTalentIds.includes(c.userId)
                          ? "border-rose-300 bg-rose-50 text-rose-600"
                          : "border-slate-200 dark:border-slate-700 text-slate-600"
                      }`}
                    >
                      {savedTalentIds.includes(c.userId) ? "♥ Saved" : "♡ Save"}
                    </button>
                    <button
                      onClick={() => void reportTalent(c.userId, c.name)}
                      className="px-3 py-1.5 rounded-lg border border-red-200 text-red-600 text-xs font-semibold"
                    >
                      Report
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <TrustBadge level={c.badge} />
                    <button
                      onClick={() => setSelectedWorker(c)}
                      className="ml-auto px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold"
                    >
                      View
                    </button>
                    <button
                      onClick={() => void inviteWorker(c)}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold"
                    >
                      Invite
                    </button>
                  </div>
                </article>
              ))}
              {!recommendedWorkers.length && (
                <div className="xl:col-span-2 py-14 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                  <p className="font-semibold text-slate-700 dark:text-slate-200">
                    No workers cover the selected time.
                  </p>
                  <p className="text-sm text-slate-400 mt-1">
                    Change the wanted hours and apply the filter again.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === "saved" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {directoryWorkers
            .filter((worker) => savedTalentIds.includes(worker.userId))
            .map((worker) => (
              <div
                key={worker.userId}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-rose-200 dark:border-rose-900 shadow-sm p-4 flex items-center gap-4"
              >
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-white shrink-0"
                  style={{ backgroundColor: worker.color }}
                >
                  {worker.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {worker.name}
                  </p>
                  <p className="text-xs text-slate-400">
                    {worker.title} · Trust {worker.trust}/100
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => setSelectedWorker(worker)}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold"
                  >
                    View
                  </button>
                  <button
                    onClick={() => void toggleSavedTalent(worker.userId)}
                    className="px-3 py-1.5 rounded-lg border border-rose-200 text-rose-600 text-xs font-semibold"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          {!savedTalentIds.length && (
            <div className="md:col-span-2 py-12 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-sm text-slate-400">
              Saved workers will appear here.
            </div>
          )}
        </div>
      )}

      {tab === "safe-circle" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {CANDIDATES.map((c) => (
            <div
              key={c.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-4 flex items-center gap-4"
            >
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-white shrink-0"
                style={{ backgroundColor: c.color }}
              >
                {c.initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <span className="font-semibold text-slate-900 dark:text-white text-sm">
                    {c.name}
                  </span>
                  <TrustBadge level={c.badge} />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                  {c.title} · Rating: {c.rating}★
                </p>
                {tab === "safe-circle" && (
                  <p className="text-xs text-green-600 font-semibold">
                    ✓ 3 jobs completed together
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <button
                  data-action-dialog
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  Hire Again
                </button>
                <button
                  data-action-dialog
                  className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 rounded-lg"
                >
                  Message
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "interviews" && (
        <div className="space-y-4">
          {[
            {
              name: "Aarav Sharma",
              initials: "AS",
              color: "#2563EB",
              date: "Mar 20, 2025",
              time: "2:00 PM",
              type: "Video Call",
              status: "Upcoming",
              role: "Senior React Developer",
            },
            {
              name: "Sita Gurung",
              initials: "SG",
              color: "#DC2626",
              date: "Mar 21, 2025",
              time: "10:00 AM",
              type: "Voice Call",
              status: "Upcoming",
              role: "Backend Developer",
            },
            {
              name: "Priya Thapa",
              initials: "PT",
              color: "#7C3AED",
              date: "Mar 15, 2025",
              time: "3:00 PM",
              type: "Video Call",
              status: "Completed",
              role: "UI/UX Designer",
            },
          ].map((i) => (
            <div
              key={i.name}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5 flex items-center gap-4 flex-wrap"
            >
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-white shrink-0"
                style={{ backgroundColor: i.color }}
              >
                {i.initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap mb-0.5">
                  <h3 className="font-heading font-bold text-slate-900 dark:text-white">
                    {i.name}
                  </h3>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                      i.status === "Upcoming"
                        ? "bg-violet-50 dark:bg-violet-950 text-violet-700 dark:text-violet-300"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                    }`}
                  >
                    {i.status}
                  </span>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {i.role} · {i.date} at {i.time} · {i.type}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                {i.status === "Upcoming" && (
                  <>
                    <button
                      data-action-dialog
                      className="flex items-center gap-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-colors"
                    >
                      <Ico d={IC.video} cls="w-3.5 h-3.5" /> Join
                    </button>
                    <button
                      data-action-dialog
                      className="px-3 py-2 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 rounded-xl"
                    >
                      Notes
                    </button>
                    <button
                      data-action-dialog
                      className="px-3 py-2 border border-red-200 dark:border-red-900 text-xs font-semibold text-red-600 rounded-xl"
                    >
                      Cancel
                    </button>
                  </>
                )}
                {i.status === "Completed" && (
                  <button
                    data-action-dialog
                    className="px-3 py-2 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 rounded-xl"
                  >
                    View Notes
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Schedule Interview Modal */}
      {showSchedule && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-heading font-bold text-slate-900 dark:text-white">
                Schedule Interview
              </h2>
              <button
                onClick={() => setShowSchedule(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <Ico d={IC.x} cls="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
              with {scheduleCandidate}
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={interviewDate}
                  onChange={(event) => setInterviewDate(event.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Time
                </label>
                <input
                  type="time"
                  value={interviewTime}
                  onChange={(event) => setInterviewTime(event.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
                  Interview Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    ["💬", "Chat"],
                    ["📞", "Voice"],
                    ["🎥", "Video"],
                  ].map(([ic, lb]) => (
                    <button
                      onClick={() => setInterviewType(lb)}
                      key={lb}
                      className={`flex flex-col items-center gap-1 p-3 rounded-xl border hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors text-sm font-medium ${
                        interviewType === lb
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-950 text-blue-700"
                          : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      <span className="text-xl">{ic}</span>
                      {lb}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                placeholder="Interview notes (optional)"
                rows={2}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-400 resize-none"
              />
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setShowSchedule(false)}
                className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={scheduleInterview}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                Schedule Interview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Manage Posts ─────────────────────────────────────────────────────────────

function ManagePosts() {
  const dialog = useActionDialog()
  const postModalRef = useRef<HTMLDivElement>(null)
  const [tab, setTab] = useState("part-time")
  const [showCreate, setShowCreate] = useState(false)
  const [days, setDays] = useState<Record<string, string>>({})
  const [message, setMessage] = useState("")
  const [publishing, setPublishing] = useState(false)
  const [posts, setPosts] = useState<ApiJob[]>([])
  const [editingId, setEditingId] = useState<number | null>(null)
  const [newPost, setNewPost] = useState({
    title: "",
    category: "Technology",
    description: "",
    employmentType: "part-time" as JobPayload["employment_type"],
    salaryMin: "",
    salaryMax: "",
    workMode: "onsite" as JobPayload["work_mode"],
    urgent: false,
  })

  const loadPosts = async () => {
    try {
      const response = await api.jobs.mine()
      setPosts(response.results)
    } catch (error) {
      setMessage(
        error instanceof ApiError
          ? error.message
          : "Unable to load your posts.",
      )
    }
  }

  useEffect(() => {
    void loadPosts()
  }, [])

  useEffect(() => {
    if (!showCreate) return
    postModalRef.current?.scrollTo({ top: 0, behavior: "auto" })
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [showCreate])

  const publishPost = async () => {
    if (
      !newPost.title.trim() ||
      !newPost.category.trim() ||
      !newPost.description.trim()
    ) {
      setMessage("Add a job name, category, and description before publishing.")
      return
    }
    const invalidScheduleDay = Object.entries(days).find(([, value]) => {
      const match = value.match(/^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/)
      if (!match) return false
      return (
        Number(match[3]) * 60 + Number(match[4]) <=
        Number(match[1]) * 60 + Number(match[2])
      )
    })
    if (invalidScheduleDay) {
      setMessage(
        `${invalidScheduleDay[0]} end time must be later than its start time.`,
      )
      return
    }
    const accepted = await dialog.confirm({
      title: "Publish this job post?",
      message: `“${newPost.title}” will be submitted to the administrator for moderation.`,
      confirmLabel: "Publish post",
      variant: "info",
    })
    if (!accepted) return
    setPublishing(true)
    setMessage("")
    try {
      const firstStart = Object.values(days)
        .map((value) => value.match(/^(\d{1,2}):\d{2}/)?.[1])
        .find(Boolean)
      const startHour = firstStart ? Number(firstStart) : null
      const shiftType: JobPayload["shift_type"] =
        startHour === null
          ? "flexible"
          : startHour < 12
            ? "morning"
            : startHour < 17
              ? "day"
              : startHour < 21
                ? "evening"
                : "night"
      const payload: JobPayload = {
        title: newPost.title,
        category: newPost.category,
        description: newPost.description,
        employment_type: newPost.employmentType,
        work_mode: newPost.workMode,
        shift_type: shiftType,
        location: "Kathmandu",
        schedule: days,
        salary_min: newPost.salaryMin ? Number(newPost.salaryMin) : undefined,
        salary_max: newPost.salaryMax ? Number(newPost.salaryMax) : undefined,
        salary_period: "month",
        is_urgent: newPost.urgent,
      }
      if (editingId) await api.jobs.update(editingId, payload)
      else await api.jobs.create(payload)
      setMessage(
        editingId
          ? "Post updated and returned to the moderation queue."
          : "Post submitted successfully and is waiting for administrator approval.",
      )
      setNewPost({
        title: "",
        category: "Technology",
        description: "",
        employmentType: "part-time",
        salaryMin: "",
        salaryMax: "",
        workMode: "onsite",
        urgent: false,
      })
      setDays({})
      setEditingId(null)
      setShowCreate(false)
      await loadPosts()
      await dialog.alert({
        title: "Post submitted",
        message: "Your job post is waiting for administrator approval.",
        variant: "success",
      })
    } catch (error) {
      setMessage(
        error instanceof ApiError
          ? error.message
          : "Unable to publish the post.",
      )
    } finally {
      setPublishing(false)
    }
  }

  const saveDraft = async () => {
    localStorage.setItem(
      "kaamverse_employer_post_draft",
      JSON.stringify({ newPost, days }),
    )
    setShowCreate(false)
    await dialog.alert({
      title: "Draft saved",
      message: "The job post draft was saved on this device.",
      variant: "success",
    })
  }

  const editPost = (post: ApiJob) => {
    setEditingId(post.id)
    setNewPost({
      title: post.title,
      category: post.category || "General",
      description: post.description,
      employmentType: post.employment_type,
      salaryMin: post.salary_min || "",
      salaryMax: post.salary_max || "",
      workMode: post.work_mode,
      urgent: post.is_urgent,
    })
    setDays(
      Object.fromEntries(
        Object.entries(post.schedule || {}).map(([key, value]) => [
          key,
          String(value),
        ]),
      ),
    )
    setShowCreate(true)
  }

  const duplicatePost = (post: ApiJob) => {
    setEditingId(null)
    setNewPost({
      title: `${post.title} (Copy)`,
      category: post.category || "General",
      description: post.description,
      employmentType: post.employment_type,
      salaryMin: post.salary_min || "",
      salaryMax: post.salary_max || "",
      workMode: post.work_mode,
      urgent: post.is_urgent,
    })
    setDays(
      Object.fromEntries(
        Object.entries(post.schedule || {}).map(([key, value]) => [
          key,
          String(value),
        ]),
      ),
    )
    setShowCreate(true)
  }

  const togglePost = async (post: ApiJob) => {
    const accepted = await dialog.confirm({
      title:
        post.status === "closed" ? "Reopen this post?" : "Pause this post?",
      message:
        post.status === "closed"
          ? "The post will return to administrator moderation."
          : "The post will stop accepting applications.",
      confirmLabel: post.status === "closed" ? "Reopen" : "Pause",
      variant: "warning",
    })
    if (!accepted) return
    try {
      if (post.status === "closed") await api.jobs.reopen(post.id)
      else await api.jobs.close(post.id)
      await loadPosts()
    } catch (error) {
      await dialog.alert({
        title: "Unable to update post",
        message:
          error instanceof ApiError ? error.message : "Please try again.",
        variant: "danger",
      })
    }
  }

  const deletePost = async (post: ApiJob) => {
    const accepted = await dialog.confirm({
      title: "Delete this post permanently?",
      message: `“${post.title}” and its application history may be removed.`,
      confirmLabel: "Delete post",
      variant: "danger",
    })
    if (!accepted) return
    try {
      await api.jobs.remove(post.id)
      await loadPosts()
      await dialog.alert({
        title: "Post deleted",
        message: "The post was removed successfully.",
        variant: "success",
      })
    } catch (error) {
      await dialog.alert({
        title: "Unable to delete post",
        message:
          error instanceof ApiError ? error.message : "Please try again.",
        variant: "danger",
      })
    }
  }

  const selectedEmploymentType: JobPayload["employment_type"] =
    tab === "on-demand"
      ? "gig"
      : tab === "services"
        ? "service"
        : tab as JobPayload["employment_type"]
  const filteredPosts = posts.filter(
    (post) => post.employment_type === selectedEmploymentType,
  )
  const postingLabel =
    newPost.employmentType === "service"
      ? "Service"
      : newPost.employmentType === "freelance"
        ? "Project"
        : newPost.employmentType === "gig"
          ? "Gig"
          : "Job"

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-slate-900 dark:text-white mb-1">
            Manage Posts
          </h1>
          <p className="text-slate-400 text-sm">
            {posts.filter((post) => post.status === "approved").length} active
            posts across all categories
          </p>
        </div>
        <button
          onClick={() => {
            setEditingId(null)
            setNewPost({
              title: "",
              category: "Technology",
              description: "",
              employmentType: selectedEmploymentType,
              salaryMin: "",
              salaryMax: "",
              workMode: "onsite",
              urgent: false,
            })
            setDays({})
            setShowCreate(true)
          }}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors text-sm"
        >
          <Ico d={IC.plus} cls="w-4 h-4" /> Create New Post
        </button>
      </div>

      <div className="flex gap-2 mb-5">
        {[
          ["Part-Time Jobs", "part-time"],
          ["Freelance Projects", "freelance"],
          ["On-Demand Gigs", "on-demand"],
          ["Services", "services"],
        ].map(([t, id]) => {
          return (
            <button
              key={t}
              onClick={() => setTab(id)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                tab === id
                  ? "bg-blue-600 text-white"
                  : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
              }`}
            >
              {t}
            </button>
          )
        })}
      </div>

      <div className="space-y-4">
        {filteredPosts.map((p) => (
          <div
            key={p.id}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5"
          >
            <div className="flex items-start gap-4 flex-wrap">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shrink-0 text-sm bg-blue-600">
                {p.employment_type === "part-time"
                  ? "💼"
                  : p.employment_type === "freelance"
                    ? "💻"
                    : p.employment_type === "service"
                      ? "🛠️"
                      : "⚡"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap mb-1">
                  <h3 className="font-heading font-bold text-slate-900 dark:text-white">
                    {p.title}
                  </h3>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                      p.status === "approved"
                        ? "bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300"
                        : "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300"
                    }`}
                  >
                    {p.status.replace("-", " ")}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                  {p.employment_type} · {p.work_mode} · {p.location} · Created{" "}
                  {new Date(p.created_at).toLocaleDateString()}
                </p>
                <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <Ico d={IC.users} cls="w-3.5 h-3.5" /> {p.application_count}{" "}
                    applicants
                  </span>
                  <span className="flex items-center gap-1">
                    <Ico d={IC.eye} cls="w-3.5 h-3.5" />{" "}
                    {p.is_urgent ? "Priority listing" : "Standard listing"}
                  </span>
                </div>
              </div>
              <div className="flex gap-2 shrink-0 flex-wrap">
                <button
                  onClick={() => editPost(p)}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 rounded-xl hover:border-blue-300 hover:text-blue-600 transition-colors"
                >
                  <Ico d={IC.edit} cls="w-3.5 h-3.5" /> Edit
                </button>
                <button
                  onClick={() => duplicatePost(p)}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 rounded-xl hover:border-blue-300 hover:text-blue-600 transition-colors"
                >
                  <Ico d={IC.duplicate} cls="w-3.5 h-3.5" /> Duplicate
                </button>
                <button
                  onClick={() => togglePost(p)}
                  className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 rounded-xl hover:border-amber-300 hover:text-amber-600 transition-colors"
                >
                  {p.status === "closed" ? "Resume" : "Pause"}
                </button>
                <button
                  onClick={() => deletePost(p)}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-red-200 dark:border-red-900 text-xs font-semibold text-red-600 rounded-xl hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                >
                  <Ico d={IC.trash} cls="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Post Modal */}
      {showCreate && (
        <div
          ref={postModalRef}
          className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center p-4 overflow-y-auto overscroll-contain"
        >
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-2xl w-full max-w-2xl p-6 my-4">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-heading font-bold text-slate-900 dark:text-white">
                {editingId ? "Edit Post" : "Create New Post"}
              </h2>
              <button
                onClick={() => setShowCreate(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <Ico d={IC.x} cls="w-5 h-5" />
              </button>
            </div>

            {/* Type selector */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              {[
                ["💼", "Part-Time Job", "part-time"],
                ["💻", "Freelance Project", "freelance"],
                ["⚡", "On-Demand Gig", "gig"],
                ["🛠️", "Service", "service"],
              ].map(([ic, lb, value]) => (
                <button
                  key={lb}
                  onClick={() =>
                    setNewPost((previous) => ({
                      ...previous,
                      employmentType: value as JobPayload["employment_type"],
                    }))
                  }
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950 transition-all text-sm font-semibold text-slate-700 dark:text-slate-300 ${
                    newPost.employmentType === value
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                      : "border-slate-200 dark:border-slate-700"
                  }`}
                >
                  <span className="text-3xl">{ic}</span>
                  {lb}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="job-post-name"
                    className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1"
                  >
                    {postingLabel} Name *
                  </label>
                  <input
                    id="job-post-name"
                    name="job_name"
                    required
                    autoFocus
                    value={newPost.title}
                    onChange={(event) =>
                      setNewPost((previous) => ({
                        ...previous,
                        title: event.target.value,
                      }))
                    }
                    placeholder={
                      newPost.employmentType === "service"
                        ? "e.g. Website Design Service"
                        : "e.g. Part-Time React Developer"
                    }
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-400"
                  />
                </div>
                <div>
                  <label
                    htmlFor="job-post-category"
                    className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1"
                  >
                    {postingLabel} Category *
                  </label>
                  <select
                    id="job-post-category"
                    name="job_category"
                    required
                    value={newPost.category}
                    onChange={(event) =>
                      setNewPost((previous) => ({
                        ...previous,
                        category: event.target.value,
                      }))
                    }
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-400"
                  >
                    <option>Technology</option>
                    <option>Design</option>
                    <option>Marketing</option>
                    <option>Finance</option>
                    <option>Education</option>
                    <option>Home Services</option>
                    <option>Transportation</option>
                    <option>Creative</option>
                    <option>Other</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {postingLabel} Description *
                  </label>
                  <button
                    onClick={() =>
                      setNewPost((previous) => ({
                        ...previous,
                        description:
                          previous.description ||
                          `We are seeking a reliable ${previous.title || "professional"} to join our team. The successful candidate will collaborate with colleagues, deliver high-quality work, and communicate progress clearly.`,
                      }))
                    }
                    className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 font-semibold"
                  >
                    <Ico d={IC.brain} cls="w-3.5 h-3.5" /> AI Generate
                  </button>
                </div>
                <textarea
                  value={newPost.description}
                  onChange={(event) =>
                    setNewPost((previous) => ({
                      ...previous,
                      description: event.target.value,
                    }))
                  }
                  rows={4}
                  placeholder="Describe the role, responsibilities and requirements..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-400 resize-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Min Salary (NPR)
                  </label>
                  <input
                    value={newPost.salaryMin}
                    onChange={(event) =>
                      setNewPost((previous) => ({
                        ...previous,
                        salaryMin: event.target.value,
                      }))
                    }
                    type="number"
                    placeholder="40000"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Max Salary (NPR)
                  </label>
                  <input
                    value={newPost.salaryMax}
                    onChange={(event) =>
                      setNewPost((previous) => ({
                        ...previous,
                        salaryMax: event.target.value,
                      }))
                    }
                    type="number"
                    placeholder="80000"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Work Mode
                  </label>
                  <select
                    value={newPost.workMode}
                    onChange={(event) =>
                      setNewPost((previous) => ({
                        ...previous,
                        workMode: event.target.value as JobPayload["work_mode"],
                      }))
                    }
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-400"
                  >
                    <option value="onsite">Onsite</option>
                    <option value="remote">Remote</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                </div>
              </div>

              {/* Schedule */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Working Schedule
                  </label>
                  <span className="text-xs text-slate-400">
                    AI will match workers based on this schedule
                  </span>
                </div>
                <div className="space-y-2">
                  {[
                    "Monday",
                    "Tuesday",
                    "Wednesday",
                    "Thursday",
                    "Friday",
                    "Saturday",
                    "Sunday",
                  ].map((d) => {
                    const presets: Record<string, string> = {
                      morning: "08:00-12:00",
                      afternoon: "12:00-17:00",
                      evening: "17:00-21:00",
                      full: "08:00-17:00",
                      flexible: "09:00-17:00",
                    }
                    const value = presets[days[d]] || days[d] || ""
                    const [start = "09:00", end = "17:00"] = value.split("-")
                    const enabled = Boolean(value)
                    const toggleDay = () =>
                      setDays((previous) => {
                        const next = { ...previous }
                        if (enabled) delete next[d]
                        else next[d] = "09:00-17:00"
                        return next
                      })
                    return (
                      <div
                        key={d}
                        className={`grid grid-cols-[88px_1fr] sm:grid-cols-[88px_1fr_1fr] items-center gap-2 rounded-xl border p-2.5 ${
                          enabled
                            ? "border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/30"
                            : "border-slate-200 dark:border-slate-700"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={toggleDay}
                          className="flex items-center gap-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-300"
                        >
                          <span
                            className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] ${
                              enabled
                                ? "bg-blue-600 border-blue-600 text-white"
                                : "border-slate-300 dark:border-slate-600"
                            }`}
                          >
                            {enabled ? "✓" : ""}
                          </span>
                          {d}
                        </button>
                        <label className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                          <span>From</span>
                          <input
                            type="time"
                            disabled={!enabled}
                            value={start}
                            onChange={(event) =>
                              setDays((previous) => ({
                                ...previous,
                                [d]: `${event.target.value}-${end}`,
                              }))
                            }
                            className="min-w-0 w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white outline-none disabled:opacity-40"
                          />
                        </label>
                        <label className="col-start-2 sm:col-start-auto flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                          <span>To</span>
                          <input
                            type="time"
                            disabled={!enabled}
                            value={end}
                            onChange={(event) =>
                              setDays((previous) => ({
                                ...previous,
                                [d]: `${start}-${event.target.value}`,
                              }))
                            }
                            className="min-w-0 w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white outline-none disabled:opacity-40"
                          />
                        </label>
                      </div>
                    )
                  })}
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  Select a day, then enter any exact working time—for example,
                  1:00 PM to 2:00 PM.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    Min Trust Score
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    defaultValue={60}
                    className="w-full accent-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
                    Min Verification
                  </label>
                  <select className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-400">
                    <option>Any</option>
                    <option>Basic Verified</option>
                    <option>Identity Verified</option>
                    <option>Trusted Professional</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-950 rounded-xl border border-red-100 dark:border-red-900">
                <input
                  type="checkbox"
                  checked={newPost.urgent}
                  onChange={(event) =>
                    setNewPost((previous) => ({
                      ...previous,
                      urgent: event.target.checked,
                    }))
                  }
                  className="w-4 h-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
                />
                <div>
                  <p className="text-sm font-semibold text-red-800 dark:text-red-200">
                    🚨 Urgent Hiring
                  </p>
                  <p className="text-xs text-red-600 dark:text-red-400">
                    Mark as urgent — gets priority placement and notifications
                  </p>
                </div>
              </div>
            </div>

            {message && (
              <div className="mt-4 px-4 py-3 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-sm">
                {message}
              </div>
            )}
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 py-3 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={saveDraft}
                className="flex-1 py-3 border border-blue-200 dark:border-blue-800 text-sm font-semibold text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors"
              >
                Save Draft
              </button>
              <button
                disabled={publishing}
                onClick={publishPost}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                {publishing
                  ? "Publishing..."
                  : editingId
                    ? "Update Post"
                    : "Publish Post"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Browse Services ──────────────────────────────────────────────────────────

function BrowseServices({
  setSection,
}: {
  setSection: (section: ESection) => void
}) {
  const dialog = useActionDialog()
  const [search, setSearch] = useState("")
  const [cat, setCat] = useState("All")
  const [services, setServices] = useState<ApiServiceListing[]>([])
  const [savedProviderIds, setSavedProviderIds] = useState<number[]>([])
  const [selectedService, setSelectedService] =
    useState<ApiServiceListing | null>(null)
  useEffect(() => {
    api.services
      .list()
      .then((page) => setServices(page.results))
      .catch(() => setServices([]))
    api.savedTalent.list().then((page) => setSavedProviderIds(page.results.map((item) => item.talent))).catch(() => setSavedProviderIds([]))
  }, [])
  const categories = [
    "All",
    ...Array.from(new Set(services.map((service) => service.category))),
  ]
  const filteredServices = services.filter(
    (service) =>
      (cat === "All" || service.category === cat) &&
      (!search ||
        `${service.title} ${service.provider_name} ${service.description}`
          .toLowerCase()
          .includes(search.toLowerCase())),
  )
  const bookService = async (service: ApiServiceListing) => {
    const confirmed = await dialog.confirm({
      title: `Book ${service.title}?`,
      message: `You are requesting ${service.provider_name}'s service at NPR ${Number(service.price).toLocaleString()}/${service.price_unit}. You will choose the exact date and time next.`,
      confirmLabel: "Continue booking",
      variant: "info",
    })
    if (!confirmed) return
    const schedule = await dialog.prompt({
      title: `Book ${service.title}`,
      message: "Enter date and exact time as YYYY-MM-DD HH:MM-HH:MM.",
      placeholder: "2026-08-15 13:00-15:00",
      confirmLabel: "Request booking",
    })
    if (!schedule) return
    const match = schedule
      .trim()
      .match(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})-(\d{2}:\d{2})$/)
    if (!match || match[2] >= match[3]) {
      await dialog.alert({
        title: "Invalid booking time",
        message:
          "Use YYYY-MM-DD HH:MM-HH:MM with an end time later than the start.",
        variant: "danger",
      })
      return
    }
    await api.bookings.create({
      service: service.id,
      scheduled_date: match[1],
      start_time: match[2],
      end_time: match[3],
    })
    await dialog.alert({
      title: "Booking requested",
      message: `${service.provider_name} received the booking and email notification.`,
      variant: "success",
    })
  }

  const messageProvider = async (service: ApiServiceListing) => {
    try {
      await api.conversations.create(
        service.provider,
        `Service inquiry: ${service.title}`,
      )
      setSection("messages")
    } catch (error) {
      await dialog.alert({
        title: "Unable to open chat",
        message:
          error instanceof ApiError ? error.message : "Please try again.",
        variant: "danger",
      })
    }
  }

  const toggleProvider = async (providerId: number) => {
    try { const result = await api.savedTalent.toggle(providerId); setSavedProviderIds((current) => result.saved ? Array.from(new Set([...current, providerId])) : current.filter((id) => id !== providerId)) }
    catch (error) { await dialog.alert({ title: "Unable to update saved providers", message: error instanceof Error ? error.message : "Please try again.", variant: "danger" }) }
  }

  const reportProvider = async (service: ApiServiceListing) => {
    const description = await dialog.prompt({ title: `Report ${service.title}?`, message: "Describe misleading service content or a provider safety concern.", placeholder: "Explain the concern for the administrator.", confirmLabel: "Submit report" })
    if (!description?.trim()) return
    try { await api.fraudReports.create({ reported_user: service.provider, reason: "other", description: description.trim() }); await dialog.alert({ title: "Report submitted", message: "The Trust & Safety team can now review this provider.", variant: "success" }) }
    catch (error) { await dialog.alert({ title: "Report not submitted", message: error instanceof Error ? error.message : "Please try again.", variant: "danger" }) }
  }

  if (selectedService)
    return (
      <UnifiedDetailPage
        initialSaved={savedProviderIds.includes(selectedService.provider)}
        onSave={() => toggleProvider(selectedService.provider)}
        backLabel="Back to Services"
        onBack={() => setSelectedService(null)}
        icon={selectedService.provider_name
          .split(/\s+/)
          .slice(0, 2)
          .map((part) => part[0])
          .join("")
          .toUpperCase()}
        title={selectedService.title}
        subtitle={selectedService.provider_name}
        verifiedLabel="Verified Service Provider"
        score={selectedService.provider_trust_score}
        scoreTitle="Provider Trust Score"
        scoreMessage={`${selectedService.provider_name}'s verified profile, availability, and service history are available for your review before booking.`}
        facts={[
          {
            label: "Price",
            value: `NPR ${Number(selectedService.price).toLocaleString()}/${selectedService.price_unit}`,
            icon: "Rs",
          },
          { label: "Category", value: selectedService.category, icon: "◈" },
          {
            label: "Location",
            value: selectedService.location || "Nepal",
            icon: "⌖",
          },
          {
            label: "Availability",
            value: scheduleSummary(selectedService.availability),
            icon: "◷",
          },
        ]}
        tags={[
          selectedService.category,
          "Verified",
          selectedService.price_unit,
        ]}
        descriptionTitle="About this service"
        description={selectedService.description}
        sections={[
          {
            title: "Provider availability",
            items: [scheduleSummary(selectedService.availability)],
            check: true,
          },
          {
            title: "Booking process",
            items: [
              "Review this complete service description",
              "Confirm that you want to continue",
              "Choose an exact date and start/end time",
              "The provider receives an in-system and email notification",
            ],
          },
          {
            title: "KaamVerse protection",
            items: [
              "Secure message history",
              "Verified provider profile",
              "Booking status tracking",
              "Administrator reporting support",
            ],
            check: true,
            columns: true,
          },
        ]}
        primaryValue={`NPR ${Number(selectedService.price).toLocaleString()}`}
        primaryMeta={`per ${selectedService.price_unit}`}
        primaryLabel="Book Service"
        onPrimary={() => void bookService(selectedService)}
        onMessage={() => void messageProvider(selectedService)}
        onReport={() => void reportProvider(selectedService)}
        profileTitle="Provider Profile"
        profileBody={`${selectedService.provider_name} has a ${selectedService.provider_trust_score}/100 trust score.`}
        reviewsSummary="Verified booking feedback appears here."
        saveIcon="heart"
      />
    )

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="font-heading text-2xl font-extrabold text-slate-900 dark:text-white mb-1">
        Browse Services
      </h1>
      <p className="text-slate-400 text-sm mb-5">
        Find and book verified service providers
      </p>

      <div className="flex gap-3 mb-5">
        <div className="flex-1 relative">
          <Ico
            d={IC.search}
            cls="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by skill, name, or service..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-400"
          />
        </div>
      </div>

      <div className="flex gap-2 mb-5 overflow-x-auto pb-2">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
              cat === c
                ? "bg-blue-600 text-white"
                : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-blue-300"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredServices.map((service, index) => (
          <div
            key={service.id}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-blue-200 dark:border-blue-900 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 p-5"
          >
            <div className="flex items-start gap-3 mb-3">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-white shrink-0"
                style={{
                  backgroundColor: ["#2563EB", "#7C3AED", "#059669"][index % 3],
                }}
              >
                {service.provider_name
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((part) => part[0])
                  .join("")
                  .toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-heading font-bold text-slate-900 dark:text-white text-sm">
                  {service.provider_name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {service.title}
                </p>
                <TrustBadge
                  level={
                    service.provider_verification_level >= 4
                      ? "Trusted Professional"
                      : service.provider_verification_level >= 2
                        ? "Identity Verified"
                        : "Basic Verified"
                  }
                />
              </div>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 mb-3">
              {service.description}
            </p>
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-3">
              <span>{service.category}</span>
              <span className="font-bold text-slate-900 dark:text-white">
                NPR {Number(service.price).toLocaleString()}/
                {service.price_unit}
              </span>
            </div>
            <div className="flex items-center gap-1 text-xs text-slate-400 mb-4">
              <span>
                🛡️ Trust:{" "}
                <strong className="text-amber-600">
                  {service.provider_trust_score}
                </strong>
              </span>
              <span className="mx-1">·</span>
              <span className="truncate">
                📅 {scheduleSummary(service.availability)}
              </span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => void toggleProvider(service.provider)} className={`px-3 py-2 rounded-xl border text-xs font-semibold ${savedProviderIds.includes(service.provider) ? "border-rose-300 bg-rose-50 text-rose-600" : "border-slate-200 dark:border-slate-700 text-slate-600"}`}>{savedProviderIds.includes(service.provider) ? "♥" : "♡"}</button>
              <button onClick={() => void reportProvider(service)} className="px-3 py-2 rounded-xl border border-red-200 text-red-600 text-xs font-semibold">Report</button>
              <button
                onClick={() => setSelectedService(service)}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-colors"
              >
                Book Service
              </button>
              <button
                onClick={() => void messageProvider(service)}
                className="px-3 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold rounded-xl hover:border-blue-300 hover:text-blue-600 transition-colors"
              >
                <Ico d={IC.chat} cls="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
        {!filteredServices.length && (
          <div className="md:col-span-2 xl:col-span-3 py-12 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-sm text-slate-400">
            No active services match this search.
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Messages ─────────────────────────────────────────────────────────────────

function EmpMessages() {
  type EmployerChatMessage = {
    id: number
    text?: string
    from: "me" | "them"
    time: string
    sender?: string
    file?: { name: string; size: string; type: string }
    image?: boolean
  }
  const [active, setActive] = useState(1)
  const [newMsg, setNewMsg] = useState("")
  const [filter, setFilter] = useState<"All" | "Jobs" | "Unread" | "Group">(
    "All",
  )
  const [showInfo, setShowInfo] = useState(false)
  const [customMessages, setCustomMessages] =
    useState<Record<number, EmployerChatMessage[]>>({})
  const conv = CONVOS.find((c) => c.id === active)

  const filteredConvs = CONVOS.filter((c) =>
    filter === "Unread" ? c.unread > 0 : true,
  )

  /* Candidate info for right panel */
  const CINFO: Record<number, {
    title: string
    location: string
    skills: string[]
    trustScore: number
    jobTitle: string
    interview: { date: string; time: string } | null
    files: Array<{ name: string; size: string; type: string }>
    participants: string[]
  }> = {
    1: {
      title: "React Developer · 3 Years Exp.",
      location: "Kathmandu, Nepal",
      skills: ["React", "TypeScript", "Node.js"],
      trustScore: 92,
      jobTitle: "Senior React Developer",
      interview: { date: "Mar 20", time: "14:00 – 15:00 (1h)" },
      files: [
        { name: "resume_yugina_shrestha.pdf", size: "1.8 MB", type: "pdf" },
        { name: "portfolio_preview.jpg", size: "900 KB", type: "img" },
      ],
      participants: ["LT", "YS", "HR"],
    },
    2: {
      title: "UI/UX Designer · 2 Years Exp.",
      location: "Lalitpur, Nepal",
      skills: ["Figma", "Adobe XD", "CSS"],
      trustScore: 85,
      jobTitle: "Product Designer",
      interview: null,
      files: [{ name: "design_portfolio.pdf", size: "3.2 MB", type: "pdf" }],
      participants: ["LT", "RB"],
    },
    3: {
      title: "Backend Engineer · 4 Years Exp.",
      location: "Pokhara, Nepal",
      skills: ["Python", "Django", "PostgreSQL"],
      trustScore: 88,
      jobTitle: "Backend Engineer",
      interview: { date: "Mar 24", time: "10:00 – 11:00 (1h)" },
      files: [
        { name: "technical_assessment.pdf", size: "512 KB", type: "pdf" },
      ],
      participants: ["LT", "AK", "HR"],
    },
  }
  const cinfo = CINFO[active] || CINFO[1]

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

  const ENRICHED_EMP_MSGS: Record<number, EmployerChatMessage[]> = {
    1: [
      {
        id: 1,
        text: "Hi! We reviewed your application for the Senior React Developer position and we're impressed by your work. Are you available for a technical interview this Thursday?",
        from: "me",
        time: "13:45",
      },
      {
        id: 2,
        text: "Thank you so much for reaching out! Yes, I'm available Thursday. What time works best for your team?",
        from: "them",
        time: "14:02",
        sender: "Yugina Shrestha",
      },
      {
        id: 3,
        text: "2:00 PM works great. I've also attached your assessment brief so you can prepare. Looking forward to it!",
        from: "me",
        time: "14:10",
      },
      {
        id: 4,
        file: {
          name: "interview_brief_v2.pdf",
          size: "2.4 MB · PDF Document",
          type: "pdf",
        },
        from: "me",
        time: "14:10",
      },
      {
        id: 5,
        text: "Perfect, I'll review it now. Looking forward to our interview on Monday!",
        from: "them",
        time: "14:18",
        sender: "Yugina Shrestha",
      },
    ],
    2: [
      {
        id: 1,
        text: "Hello Riya! We saw your portfolio and love your design work. We have a Product Designer opening.",
        from: "me",
        time: "9:00",
      },
      {
        id: 2,
        text: "Can you share your portfolio? Especially any mobile UI work.",
        from: "me",
        time: "9:05",
      },
      {
        id: 3,
        file: {
          name: "design_portfolio.pdf",
          size: "3.2 MB · PDF Document",
          type: "pdf",
        },
        from: "them",
        time: "9:30",
        sender: "Riya Bajracharya",
      },
    ],
    3: [
      {
        id: 1,
        text: "Hi Arjun! Your backend profile caught our attention. We're looking for a Python/Django engineer.",
        from: "me",
        time: "10:00",
      },
      {
        id: 2,
        text: "Sounds interesting! What does the tech stack look like at Leapfrog for this role?",
        from: "them",
        time: "10:45",
        sender: "Arjun Karki",
      },
    ],
  }
  const enrichedMsgs: EmployerChatMessage[] = [
    ...(ENRICHED_EMP_MSGS[active] || []),
    ...(customMessages[active] || []),
  ]
  const sendMessage = () => {
    const text = newMsg.trim()
    if (!text) return
    setCustomMessages((current) => ({
      ...current,
      [active]: [
        ...(current[active] || []),
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

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Column 1: Conversation list ── */}
      <div className="w-72 shrink-0 flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800">
          <div className="relative">
            <Ico
              d={IC.search}
              cls="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              placeholder="Search candidates..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white outline-none placeholder:text-slate-400 border border-transparent focus:border-blue-300"
            />
          </div>
        </div>

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

        <div className="flex-1 overflow-y-auto">
          {filteredConvs.map((c) => (
            <button
              key={c.id}
              onClick={() => setActive(c.id)}
              className={`w-full flex items-center gap-3 px-4 py-3.5 border-b border-slate-50 dark:border-slate-800/60 text-left transition-colors relative ${
                active === c.id
                  ? "bg-blue-50 dark:bg-blue-950/40"
                  : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
              }`}
            >
              {active === c.id && (
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
                      active === c.id
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
                  data-action-dialog
                  aria-label="Call candidate"
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <Ico d={IC.phone} cls="w-4 h-4" />
                </button>
                <button
                  data-action-dialog
                  aria-label="Video call candidate"
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
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

            <div className="flex items-center gap-3 px-6 py-3 shrink-0">
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
              <span className="text-xs font-semibold text-slate-400 tracking-wider">
                TODAY
              </span>
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-2 space-y-4">
              {enrichedMsgs.map((m) => (
                <div
                  key={m.id}
                  className={`flex items-end gap-2.5 ${
                    m.from === "me" ? "flex-row-reverse" : "flex-row"
                  }`}
                >
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
                    {m.file && (
                      <div
                        className={`rounded-2xl border border-slate-200 dark:border-slate-700 p-3 flex items-center gap-3 shadow-sm w-64 ${
                          m.from === "me"
                            ? "bg-blue-50 dark:bg-blue-950 rounded-br-sm border-blue-100 dark:border-blue-900"
                            : "bg-white dark:bg-slate-800 rounded-bl-sm"
                        }`}
                      >
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
                          data-action-dialog
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
                    {m.image && (
                      <div className="rounded-2xl rounded-bl-sm overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm w-64 h-36 bg-gradient-to-br from-slate-800 via-blue-900 to-indigo-900 flex items-center justify-center">
                        <span className="text-white/40 text-xs">
                          Image preview
                        </span>
                      </div>
                    )}
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

            <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-4 pt-3 pb-2 shrink-0">
              <div className="flex items-center gap-2">
                <button
                  data-action-dialog
                  aria-label="Attach file"
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
                <button
                  data-action-dialog
                  aria-label="Add emoji"
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
                  data-action-dialog
                  aria-label="Record voice note"
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

      {/* ── Column 3: Candidate info panel ── */}
      <div
        className={`w-64 shrink-0 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-y-auto flex-col transition-all duration-300 ${
          showInfo ? "flex" : "hidden"
        }`}
      >
        {conv && (
          <>
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
                {cinfo.title} · {cinfo.location}
              </p>
              <div className="flex items-center justify-center gap-1.5 mb-4">
                <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full"
                    style={{ width: `${cinfo.trustScore}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-blue-600">
                  {cinfo.trustScore} Trust
                </span>
              </div>
              {/* Video / Voice */}
              <div className="flex gap-2">
                <button
                  data-action-dialog
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-colors"
                >
                  <Ico d={IC.video} cls="w-3.5 h-3.5" /> Video
                </button>
                <button
                  data-action-dialog
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition-colors"
                >
                  <Ico d={IC.phone} cls="w-3.5 h-3.5" /> Voice
                </button>
              </div>
            </div>

            {/* Applied for */}
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Applied For
              </p>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                {cinfo.jobTitle}
              </p>
            </div>

            {/* Upcoming interview */}
            {cinfo.interview && (
              <div className="p-4 border-b border-slate-100 dark:border-slate-800">
                <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                  Interview Schedule
                </h4>
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
                        {cinfo.interview.date} · {cinfo.interview.time}
                      </p>
                    </div>
                  </div>
                  <button
                    data-action-dialog
                    className="w-full py-1.5 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 text-xs font-semibold rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors"
                  >
                    Add to Google Calendar
                  </button>
                </div>
              </div>
            )}

            {/* Shared files */}
            {cinfo.files.length > 0 && (
              <div className="p-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Shared Files
                  </h4>
                  <button
                    data-action-dialog
                    className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                  >
                    View All
                  </button>
                </div>
                <div className="space-y-1.5">
                  {cinfo.files.map((f) => {
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

            {/* Focus Areas (skills) */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800">
              <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2.5">
                Focus Areas
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {cinfo.skills.map((s) => (
                  <span
                    key={s}
                    className="px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs font-semibold border border-blue-100 dark:border-blue-900"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>

            {/* Participants */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800">
              <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                Participants ({cinfo.participants.length})
              </h4>
              <div className="flex items-center">
                {cinfo.participants.map((p, i) => (
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
                      zIndex: cinfo.participants.length - i,
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
                data-action-dialog
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

// ─── Analytics ────────────────────────────────────────────────────────────────

function Analytics() {
  const months = ["Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"]
  const apps = [12, 19, 14, 28, 22, 31, 23]
  const hires = [2, 4, 3, 6, 5, 8, 6]
  const maxVal = Math.max(...apps)

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="font-heading text-2xl font-extrabold text-slate-900 dark:text-white mb-1">
        Analytics
      </h1>
      <p className="text-slate-400 text-sm mb-5">
        Hiring performance and insights
      </p>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          {
            label: "Total Applications",
            value: "149",
            trend: "+23%",
            icon: "📋",
            color: "#2563EB",
          },
          {
            label: "Hiring Success",
            value: "78%",
            trend: "+5%",
            icon: "✅",
            color: "#22C55E",
          },
          {
            label: "Avg Hiring Time",
            value: "6.2 days",
            trend: "-1.3d",
            icon: "⏱️",
            color: "#F59E0B",
          },
          {
            label: "Avg Trust Score",
            value: "93.4",
            trend: "+2.1",
            icon: "🛡️",
            color: "#7C3AED",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-4"
          >
            <div className="text-xl mb-2">{s.icon}</div>
            <div
              className="font-heading font-extrabold text-2xl mb-0.5"
              style={{ color: s.color }}
            >
              {s.value}
            </div>
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {s.label}
            </p>
            <p className="text-xs text-green-600 dark:text-green-400 font-medium">
              {s.trend} vs last month
            </p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5">
          <h2 className="font-heading font-bold text-slate-900 dark:text-white mb-5">
            Applications Trend
          </h2>
          <div className="flex items-end gap-2 h-32 mb-2">
            {months.map((m, i) => (
              <div key={m} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-t-lg bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-500 transition-colors cursor-pointer relative group"
                  style={{ height: `${(apps[i] / maxVal) * 100}%` }}
                >
                  <div className="absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:block bg-slate-900 text-white text-xs px-2 py-1 rounded-lg whitespace-nowrap z-10">
                    {apps[i]}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            {months.map((m) => (
              <div
                key={m}
                className="flex-1 text-center text-xs text-slate-400"
              >
                {m}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5">
          <h2 className="font-heading font-bold text-slate-900 dark:text-white mb-5">
            Hiring Funnel
          </h2>
          {[
            {
              stage: "Total Applications",
              count: 149,
              pct: 100,
              color: "#2563EB",
            },
            { stage: "Reviewed", count: 98, pct: 66, color: "#7C3AED" },
            { stage: "Interviewed", count: 31, pct: 21, color: "#F59E0B" },
            { stage: "Selected", count: 12, pct: 8, color: "#059669" },
            { stage: "Hired", count: 8, pct: 5, color: "#22C55E" },
          ].map((f) => (
            <div key={f.stage} className="mb-3">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-600 dark:text-slate-400">
                  {f.stage}
                </span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {f.count}
                </span>
              </div>
              <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full">
                <div
                  className="h-2 rounded-full transition-all duration-700"
                  style={{ width: `${f.pct}%`, backgroundColor: f.color }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5">
          <h2 className="font-heading font-bold text-slate-900 dark:text-white mb-4">
            Top Skills Requested
          </h2>
          {[
            ["React / TypeScript", 78],
            ["Python / ML", 45],
            ["UI/UX Design", 38],
            ["Node.js", 35],
            ["DevOps / AWS", 22],
          ].map(([sk, cnt]) => (
            <div key={sk} className="flex items-center gap-3 mb-3">
              <span className="text-xs text-slate-600 dark:text-slate-400 w-32 shrink-0">
                {sk}
              </span>
              <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full">
                <div
                  className="h-2 rounded-full bg-blue-500"
                  style={{ width: `${(cnt as number / 78) * 100}%` }}
                />
              </div>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 w-6 text-right">
                {cnt}
              </span>
            </div>
          ))}
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5">
          <h2 className="font-heading font-bold text-slate-900 dark:text-white mb-3">
            AI Insight
          </h2>
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-2xl p-4 border border-blue-100 dark:border-blue-900">
            <div className="text-3xl mb-2">🤖</div>
            <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
              AI Hiring Intelligence
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
              Workers with Trust Scores above 90 complete{" "}
              <strong>82% more jobs</strong> successfully. Your average accepted
              candidate score is 93.4 — well above platform average of 82.
            </p>
          </div>
          <div className="mt-4 bg-amber-50 dark:bg-amber-950 rounded-xl border border-amber-100 dark:border-amber-900 p-4">
            <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
              💡 <strong>Tip:</strong> Posting jobs with exact schedule
              requirements increases relevant applications by 34% and reduces
              time-to-hire by 28%.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Company Workspace ────────────────────────────────────────────────────────

function DocUpload({
  label,
  hint,
  accept = "image/*,.pdf",
}: {
  label: string
  hint?: string
  accept?: string
}) {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState("")
  const id = label.replace(/\s+/g, "-").toLowerCase()
  const upload = async (selected: File | null) => {
    if (!selected) return
    setFile(selected)
    setUploading(true)
    setMessage("")
    const documentType = /pan|vat/i.test(label)
      ? "pan_vat"
      : /bank/i.test(label)
        ? "bank"
        : /address/i.test(label)
          ? "address"
          : /hr/i.test(label)
            ? "hr_identity"
            : "company_registration"
    try {
      await api.verifications.submit(documentType, selected)
      setMessage("Uploaded and submitted for administrator review.")
    } catch (error) {
      setFile(null)
      setMessage(error instanceof Error ? error.message : "Upload failed.")
    } finally {
      setUploading(false)
    }
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
            {uploading ? "Uploading..." : file.name}
          </span>
          <button
            onClick={() => setFile(null)}
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
            onChange={(e) => void upload(e.target.files?.[0] || null)}
          />
        </label>
      )}
      {message && (
        <p
          className={`text-xs mt-1.5 ${
            file ? "text-green-600" : "text-red-600"
          }`}
        >
          {message}
        </p>
      )}
    </div>
  )
}

function CompanyWorkspace({
  initialTab = "profile",
}: {
  initialTab?: "profile" | "verification" | "reviews"
}) {
  const [tab, setTab] = useState(initialTab)
  useEffect(() => setTab(initialTab), [initialTab])
  const [activeDoc, setActiveDoc] =
    useState<"reg" | "pan" | "bank" | "address" | "hr" | null>(null)
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="font-heading text-2xl font-extrabold text-slate-900 dark:text-white mb-5">
        Company & Reviews
      </h1>
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {["profile", "verification", "reviews"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t as typeof tab)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold capitalize whitespace-nowrap transition-all ${
              tab === t
                ? "bg-blue-600 text-white"
                : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
            }`}
          >
            {t === "verification" ? "Verification & Trust" : t}
          </button>
        ))}
      </div>

      {tab === "profile" && (
        <div className="space-y-5">
          {/* Banner */}
          <div className="relative bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl h-32 flex items-end p-5">
            <div className="absolute bottom-0 left-5 translate-y-1/2 w-16 h-16 rounded-2xl bg-white border-4 border-white shadow-lg flex items-center justify-center font-heading font-bold text-blue-600 text-xl">
              {COMPANY.initials}
            </div>
            <button
              data-action-dialog
              className="ml-auto px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              Edit Banner
            </button>
          </div>

          <div className="pt-10 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5">
            <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
              <div>
                <h2 className="font-heading font-bold text-xl text-slate-900 dark:text-white">
                  {COMPANY.name}
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {COMPANY.industry} · {COMPANY.employees} employees ·{" "}
                  {COMPANY.website}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <TrustBadge level={COMPANY.badge} />
                  <span className="text-xs text-amber-600 font-semibold">
                    Trust Score: {COMPANY.trust}/100
                  </span>
                </div>
              </div>
              <button
                data-action-dialog
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300 rounded-xl hover:border-blue-300 hover:text-blue-600 transition-colors"
              >
                Edit Profile
              </button>
            </div>

            <div className="grid grid-cols-4 gap-4 mb-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              {[
                ["47", "Workers Hired"],
                ["156", "Total Posts"],
                ["98%", "Satisfaction"],
                ["4.8★", "Rating"],
              ].map(([v, l]) => (
                <div key={l} className="text-center">
                  <div className="font-heading font-extrabold text-xl text-blue-600">
                    {v}
                  </div>
                  <div className="text-xs text-slate-400">{l}</div>
                </div>
              ))}
            </div>

            <div className="space-y-4">
              {[
                [
                  "Company Description",
                  "Award-winning software development company from Nepal. Building digital products for global clients since 2011.",
                ],
                ["Address", "Thamel, Kathmandu, Bagmati Province, Nepal 44600"],
                ["Website", "leapfrogtechnology.com"],
                ["Industry", "Software & Technology"],
              ].map(([k, v]) => (
                <div key={k} className="grid grid-cols-3 gap-4">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 col-span-1">
                    {k}
                  </span>
                  <span className="text-sm text-slate-700 dark:text-slate-300 col-span-2">
                    {v}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "verification" && (
        <div className="space-y-5">
          {/* Trust score header */}
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-5 text-white">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-blue-200 text-sm mb-0.5">
                  Company Trust Score
                </p>
                <div className="flex items-end gap-2">
                  <span className="font-heading font-extrabold text-5xl">
                    {COMPANY.trust}
                  </span>
                  <span className="text-blue-200 pb-2">/ 100</span>
                </div>
              </div>
              <TrustBadge level={COMPANY.badge} />
            </div>
            <div className="w-full h-2 bg-white/20 rounded-full">
              <div
                className="h-2 bg-white rounded-full"
                style={{ width: `${COMPANY.trust}%` }}
              />
            </div>
          </div>

          {/* Verification status + levels */}
          <div className="grid sm:grid-cols-2 gap-5">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5">
              <h3 className="font-heading font-bold text-slate-900 dark:text-white text-sm mb-4">
                Verification Status
              </h3>
              <div className="space-y-3">
                {[
                  {
                    label: "Company Registration",
                    status: "Verified",
                    icon: "🏢",
                    color: "#22C55E",
                  },
                  {
                    label: "PAN / VAT Certificate",
                    status: "Verified",
                    icon: "📄",
                    color: "#22C55E",
                  },
                  {
                    label: "Bank Account",
                    status: "Verified",
                    icon: "🏦",
                    color: "#22C55E",
                  },
                  {
                    label: "Office Address Proof",
                    status: "Verified",
                    icon: "📍",
                    color: "#22C55E",
                  },
                  {
                    label: "HR Representative's NID",
                    status: "Pending",
                    icon: "🪪",
                    color: "#F59E0B",
                  },
                ].map((v) => (
                  <div key={v.label} className="flex items-center gap-3">
                    <span className="text-base shrink-0">{v.icon}</span>
                    <span className="flex-1 text-sm text-slate-700 dark:text-slate-300">
                      {v.label}
                    </span>
                    <span
                      className="text-xs font-semibold"
                      style={{ color: v.color }}
                    >
                      {v.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5">
              <h3 className="font-heading font-bold text-slate-900 dark:text-white text-sm mb-4">
                Verification Levels
              </h3>
              <div className="space-y-2.5">
                {[
                  {
                    dot: "bg-green-500",
                    label: "Level 1 — Basic Registered",
                    done: true,
                  },
                  {
                    dot: "bg-blue-500",
                    label: "Level 2 — Documents Verified",
                    done: true,
                  },
                  {
                    dot: "bg-purple-400",
                    label: "Level 3 — HR Identity Verified",
                    done: false,
                  },
                  {
                    dot: "bg-amber-400",
                    label: "Level 4 — Trusted Employer",
                    done: false,
                  },
                ].map((v) => (
                  <div
                    key={v.label}
                    className={`flex items-center gap-3 p-3 rounded-xl ${
                      v.done
                        ? "bg-green-50 dark:bg-green-950"
                        : "bg-slate-50 dark:bg-slate-800"
                    }`}
                  >
                    <span
                      className={`w-3 h-3 rounded-full shrink-0 ${
                        v.done ? v.dot : "bg-slate-300 dark:bg-slate-600"
                      }`}
                    />
                    <span
                      className={`text-sm flex-1 ${
                        v.done
                          ? "text-slate-700 dark:text-slate-200"
                          : "text-slate-400"
                      }`}
                    >
                      {v.label}
                    </span>
                    {v.done && (
                      <svg
                        className="w-4 h-4 text-green-600"
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

          {/* Document Uploads */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5">
            <h3 className="font-heading font-bold text-slate-900 dark:text-white text-sm mb-1">
              Document Upload
            </h3>
            <p className="text-xs text-slate-400 mb-5">
              Upload company and representative documents to improve trust
              score.
            </p>

            <div className="flex gap-2 mb-5 flex-wrap">
              {[
                {
                  id: "reg" as const,
                  label: "🏢 Company Registration",
                  status: "Verified",
                },
                {
                  id: "pan" as const,
                  label: "📄 PAN / VAT",
                  status: "Verified",
                },
                {
                  id: "bank" as const,
                  label: "🏦 Bank Verification",
                  status: "Verified",
                },
                {
                  id: "address" as const,
                  label: "📍 Address Proof",
                  status: "Verified",
                },
                {
                  id: "hr" as const,
                  label: "🪪 HR Representative NID",
                  status: "Pending",
                },
              ].map((d) => (
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

            {(activeDoc === "reg" ||
              activeDoc === "bank" ||
              activeDoc === "address") && (
              <div className="space-y-4">
                <DocUpload
                  label={
                    activeDoc === "reg"
                      ? "Company Registration Certificate"
                      : activeDoc === "bank"
                        ? "Bank Account Verification Letter"
                        : "Office Address Proof Document"
                  }
                  hint="Upload PDF or clear photo"
                  accept="image/*,.pdf"
                />
                <p className="text-xs text-slate-500">
                  Each selected file is uploaded securely and submitted
                  automatically.
                </p>
              </div>
            )}

            {activeDoc === "pan" && (
              <div className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      PAN Number *
                    </label>
                    <input
                      placeholder="Enter company PAN number"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      VAT Number{" "}
                      <span className="text-slate-400 font-normal">
                        (optional)
                      </span>
                    </label>
                    <input
                      placeholder="Enter VAT number if registered"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>
                <DocUpload
                  label="PAN Certificate Photo"
                  hint="Clear photo or scan of PAN certificate"
                  accept="image/*,.pdf"
                />
                <DocUpload
                  label="VAT Registration Document (optional)"
                  hint="PDF or photo of VAT registration"
                  accept="image/*,.pdf"
                />
                <p className="text-xs text-slate-500">
                  Each selected file is uploaded securely and submitted
                  automatically.
                </p>
              </div>
            )}

            {activeDoc === "hr" && (
              <div className="space-y-4">
                <div className="bg-amber-50 dark:bg-amber-950 border border-amber-100 dark:border-amber-900 rounded-xl p-3 text-xs text-amber-800 dark:text-amber-200">
                  <p className="font-semibold mb-1">
                    HR Representative Identity Verification
                  </p>
                  <p>
                    The authorised HR representative must submit their identity
                    document to complete Level 3 company verification.
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    HR Representative NID / Citizenship Number *
                  </label>
                  <input
                    placeholder="Enter NID or Citizenship number"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-all"
                  />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <DocUpload
                    label="NID / Citizenship — Front"
                    hint="Front photo of ID document"
                    accept="image/*"
                  />
                  <DocUpload
                    label="NID / Citizenship — Back"
                    hint="Back photo of ID document"
                    accept="image/*"
                  />
                </div>
                <p className="text-xs text-slate-500">
                  Each selected file is uploaded securely and submitted
                  automatically.
                </p>
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
          </div>
        </div>
      )}

      {tab === "reviews" && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-5">
              {[
                ["Overall", "4.8★"],
                ["Professionalism", "4.9★"],
                ["Communication", "4.7★"],
                ["Safety", "5.0★"],
                ["Payment", "4.8★"],
              ].map(([k, v]) => (
                <div key={k} className="text-center">
                  <div className="font-heading font-extrabold text-xl text-amber-500">
                    {v}
                  </div>
                  <div className="text-xs text-slate-400">{k}</div>
                </div>
              ))}
            </div>
            <div className="bg-blue-50 dark:bg-blue-950 rounded-xl p-4 border border-blue-100 dark:border-blue-900 mb-4">
              <p className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-1">
                🤖 AI Review Summary
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                Workers consistently praise professional communication, on-time
                payments, and safe working environment. Main improvement area:
                clearer task briefs at the start of projects.
              </p>
            </div>
          </div>
          {[
            {
              worker: "Aarav Sharma",
              initials: "AS",
              color: "#2563EB",
              rating: 5,
              text: "Excellent employer! Very professional, pays on time, and provides clear task requirements. Highly recommend.",
              date: "Mar 10, 2025",
            },
            {
              worker: "Priya Thapa",
              initials: "PT",
              color: "#7C3AED",
              rating: 5,
              text: "Great working environment. The team is collaborative and respectful. Would love to work again.",
              date: "Feb 28, 2025",
            },
          ].map((r) => (
            <div
              key={r.worker}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5"
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm shrink-0"
                  style={{ backgroundColor: r.color }}
                >
                  {r.initials}
                </div>
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white text-sm">
                    {r.worker}
                  </p>
                  <div className="flex">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span
                        key={i}
                        className={`text-xs ${
                          i < r.rating
                            ? "text-amber-500"
                            : "text-slate-200 dark:text-slate-700"
                        }`}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                </div>
                <span className="ml-auto text-xs text-slate-400">{r.date}</span>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {r.text}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Settings ─────────────────────────────────────────────────────────────────

function EmpSettings() {
  const dialog = useActionDialog()
  const [tab, setTab] = useState("account")
  const [account, setAccount] = useState({
    contactPerson: "",
    phone: "",
    website: "",
    address: "",
    city: "",
  })
  const [security, setSecurity] = useState<ApiSecurityOverview | null>(null)
  const [securityPanel, setSecurityPanel] =
    useState<"sessions" | "history" | null>(null)
  useEffect(() => {
    void api.auth
      .me()
      .then((user) =>
        setAccount({
          contactPerson: user.employer_profile?.contact_person || "",
          phone: user.phone || "",
          website: user.employer_profile?.website || "",
          address: user.employer_profile?.address || "",
          city: user.employer_profile?.city || "",
        }),
      )
      .catch(() => undefined)
  }, [])
  const loadSecurity = async () => {
    try {
      setSecurity(await api.auth.security())
    } catch (error) {
      await dialog.alert({
        title: "Security information unavailable",
        message: error instanceof Error ? error.message : "Please try again.",
        variant: "danger",
      })
    }
  }
  useEffect(() => {
    if (tab === "security") void loadSecurity()
  }, [tab])
  const saveAccount = async () => {
    try {
      await api.auth.updateMe({
        phone: account.phone || null,
        employer_profile: {
          contact_person: account.contactPerson,
          website: account.website,
          address: account.address,
          city: account.city,
        },
      })
      await dialog.alert({
        title: "Account saved",
        message: "Company contact details were updated in MySQL.",
        variant: "success",
      })
    } catch (error) {
      await dialog.alert({
        title: "Save failed",
        message:
          error instanceof Error ? error.message : "Could not update account.",
        variant: "danger",
      })
    }
  }
  const manageSecurity = async (title: string) => {
    if (title === "Change Password") {
      const current = await dialog.prompt({
        title: "Current password",
        message: "Enter your current password.",
        inputType: "password",
        confirmLabel: "Continue",
      })
      if (!current) return
      const next = await dialog.prompt({
        title: "New password",
        message:
          "Use at least eight characters with a strong mix of characters.",
        inputType: "password",
        confirmLabel: "Change password",
      })
      if (!next) return
      try {
        await api.auth.changePassword(current, next)
        await dialog.alert({
          title: "Password changed",
          message: "Your account password was updated successfully.",
          variant: "success",
        })
      } catch (error) {
        await dialog.alert({
          title: "Password not changed",
          message: error instanceof Error ? error.message : "Please try again.",
          variant: "danger",
        })
      }
      return
    }
    if (title === "Active Sessions") {
      setSecurityPanel("sessions")
      return
    }
    if (title === "Login History") {
      setSecurityPanel("history")
      return
    }
  }

  const toggleTwoFactor = async () => {
    if (security?.two_factor_enabled) {
      const password = await dialog.prompt({
        title: "Disable two-factor authentication?",
        message: "Enter your account password to confirm this security change.",
        inputType: "password",
        confirmLabel: "Disable 2FA",
      })
      if (!password) return
      try {
        await api.auth.disableTwoFactor(password)
        await loadSecurity()
        await dialog.alert({
          title: "Two-factor authentication disabled",
          message:
            "Future logins will no longer require an email security code.",
          variant: "warning",
        })
      } catch (error) {
        await dialog.alert({
          title: "Unable to disable 2FA",
          message: error instanceof Error ? error.message : "Please try again.",
          variant: "danger",
        })
      }
      return
    }
    try {
      await api.auth.sendTwoFactorCode()
      const code = await dialog.prompt({
        title: "Enable two-factor authentication",
        message: "Enter the six-digit security code sent to your email.",
        placeholder: "123456",
        confirmLabel: "Enable 2FA",
      })
      if (!code) return
      await api.auth.confirmTwoFactor(code.replace(/\D/g, "").slice(0, 6))
      await loadSecurity()
      await dialog.alert({
        title: "Two-factor authentication enabled",
        message:
          "Future logins now require a security code delivered to your verified email.",
        variant: "success",
      })
    } catch (error) {
      await dialog.alert({
        title: "Unable to enable 2FA",
        message: error instanceof Error ? error.message : "Please try again.",
        variant: "danger",
      })
    }
  }

  const revokeSession = async (sessionId: string) => {
    const accepted = await dialog.confirm({
      title: "Revoke this session?",
      message:
        "That browser or device will immediately lose API access and must sign in again.",
      confirmLabel: "Revoke session",
      variant: "danger",
    })
    if (!accepted) return
    await api.auth.revokeSession(sessionId)
    await loadSecurity()
  }

  const clearLoginHistory = async () => {
    const accepted = await dialog.confirm({
      title: "Delete login history?",
      message:
        "All stored login-history entries for this account will be permanently removed.",
      confirmLabel: "Delete history",
      variant: "danger",
    })
    if (!accepted) return
    await api.auth.clearLoginHistory()
    await loadSecurity()
  }
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="font-heading text-2xl font-extrabold text-slate-900 dark:text-white mb-5">
        Settings
      </h1>
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {[
          "account",
          "documents",
          "security",
          "notifications",
          "appearance",
        ].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold capitalize whitespace-nowrap transition-all ${
              tab === t
                ? "bg-blue-600 text-white"
                : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "account" && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 space-y-4">
          <h2 className="font-heading font-bold text-slate-900 dark:text-white mb-4">
            Account Settings
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {([
              ["Contact Person", "contactPerson"],
              ["Phone", "phone"],
              ["Website", "website"],
              ["Address", "address"],
              ["City", "city"],
            ] as const).map(([label, key]) => (
              <div key={key}>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  {label}
                </label>
                <input
                  value={account[key]}
                  onChange={(event) =>
                    setAccount((current) => ({
                      ...current,
                      [key]: event.target.value,
                    }))
                  }
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-400"
                />
              </div>
            ))}
          </div>
          <button
            onClick={saveAccount}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm transition-colors"
          >
            Save Changes
          </button>
        </div>
      )}

      {tab === "documents" && <DocumentVerificationPanel role="employer" />}

      {tab === "security" && <SecurityCenter />}

      {tab === "security-legacy" && (
        <div className="space-y-4">
          {[
            {
              title: "Change Password",
              desc: "Update your account password securely",
              icon: IC.key,
              action: () => void manageSecurity("Change Password"),
              label: "Manage",
            },
            {
              title: "Two-Factor Authentication",
              desc: security?.two_factor_enabled
                ? "Email security code is required at login"
                : "Add an extra verification step to every login",
              icon: IC.shield,
              action: () => void toggleTwoFactor(),
              label: security?.two_factor_enabled ? "Disable" : "Enable",
            },
            {
              title: "Active Sessions",
              desc: `${security?.sessions.length ?? 0} active browser or device session${
                security?.sessions.length === 1 ? "" : "s"
              }`,
              icon: IC.device,
              action: () => void manageSecurity("Active Sessions"),
              label: "Manage",
            },
            {
              title: "Login History",
              desc: `${security?.login_history.length ?? 0} recent successful login${
                security?.login_history.length === 1 ? "" : "s"
              }`,
              icon: IC.history,
              action: () => void manageSecurity("Login History"),
              label: "View",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 flex items-center justify-between gap-4 shadow-sm"
            >
              <div className="flex items-center gap-4 min-w-0">
                <span className="w-11 h-11 shrink-0 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-300 flex items-center justify-center">
                  <Ico d={item.icon} />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-900 dark:text-white">
                      {item.title}
                    </h3>
                    {item.title === "Two-Factor Authentication" && (
                      <span
                        className={`text-[10px] px-2 py-1 rounded-full font-bold ${
                          security?.two_factor_enabled
                            ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-700"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                        }`}
                      >
                        {security?.two_factor_enabled ? "Enabled" : "Disabled"}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-400 truncate">{item.desc}</p>
                </div>
              </div>
              <button
                onClick={item.action}
                className={`px-4 py-2 border text-sm font-semibold rounded-xl transition-colors ${
                  item.label === "Disable"
                    ? "border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950"
                    : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-blue-300 hover:text-blue-600"
                }`}
              >
                {item.label}
              </button>
            </div>
          ))}

          {securityPanel === "sessions" && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-blue-200 dark:border-blue-900 p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-heading font-bold text-slate-900 dark:text-white">
                    Active Sessions
                  </h3>
                  <p className="text-xs text-slate-400">
                    Revoke devices you no longer recognize.
                  </p>
                </div>
                <button
                  onClick={() => setSecurityPanel(null)}
                  className="w-8 h-8 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  ×
                </button>
              </div>
              <div className="space-y-3">
                {security?.sessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800"
                  >
                    <span className="w-9 h-9 rounded-lg bg-white dark:bg-slate-900 text-blue-600 flex items-center justify-center">
                      <Ico d={IC.device} cls="w-4 h-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                        {session.user_agent || "Unknown browser"}
                      </p>
                      <p className="text-xs text-slate-400">
                        {session.ip_address || "Local network"} · Last active{" "}
                        {new Date(session.last_seen_at).toLocaleString()}
                      </p>
                    </div>
                    {session.current ? (
                      <span className="text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold">
                        Current
                      </span>
                    ) : (
                      <button
                        onClick={() => void revokeSession(session.id)}
                        className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                ))}
                {!security?.sessions.length && (
                  <p className="text-sm text-slate-400 py-4 text-center">
                    No active sessions.
                  </p>
                )}
              </div>
            </div>
          )}

          {securityPanel === "history" && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-blue-200 dark:border-blue-900 p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-heading font-bold text-slate-900 dark:text-white">
                    Login History
                  </h3>
                  <p className="text-xs text-slate-400">
                    Recent authenticated access to this account.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => void clearLoginHistory()}
                    disabled={!security?.login_history.length}
                    className="px-3 py-1.5 rounded-lg border border-red-200 text-red-600 text-xs font-bold disabled:opacity-40"
                  >
                    Delete history
                  </button>
                  <button
                    onClick={() => setSecurityPanel(null)}
                    className="w-8 h-8 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    ×
                  </button>
                </div>
              </div>
              <div className="space-y-3">
                {security?.login_history.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800"
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                        {activity.user_agent || "Unknown browser"}
                      </p>
                      <p className="text-xs text-slate-400">
                        {activity.ip_address || "Local network"} ·{" "}
                        {new Date(activity.created_at).toLocaleString()}
                      </p>
                    </div>
                    <span className="text-xs text-emerald-600 font-bold">
                      Successful
                    </span>
                  </div>
                ))}
                {!security?.login_history.length && (
                  <p className="text-sm text-slate-400 py-4 text-center">
                    No login history stored.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {(tab === "notifications" || tab === "appearance") && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 space-y-4">
          {tab === "notifications" && <EmailPreferences />}
          {tab === "appearance" && (
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

function CompanyTrustCenter() {
  const [user, setUser] = useState<Awaited<ReturnType<typeof api.auth.me>> | null>(null)
  useEffect(() => { void api.auth.me().then(setUser).catch(() => undefined) }, [])
  const status = user?.employer_profile?.verification_status || "pending"
  return <div className="p-6 max-w-5xl mx-auto">
    <h1 className="font-heading text-2xl font-extrabold text-slate-900 dark:text-white">Company Trust Center</h1>
    <p className="mt-1 mb-6 text-sm text-slate-400">Verify that your organization exists and keep company documents current.</p>
    <div className="grid gap-4 sm:grid-cols-3 mb-6">
      <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 p-5 text-white"><p className="text-sm text-blue-100">Company trust score</p><p className="mt-2 text-4xl font-extrabold">{user?.trust_score ?? 0}<span className="text-base text-blue-200">/100</span></p></div>
      <div className="rounded-2xl border border-slate-100 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><p className="text-sm text-slate-400">Verification status</p><p className={`mt-3 font-bold capitalize ${status === 'approved' ? 'text-emerald-600' : status === 'rejected' ? 'text-red-600' : 'text-amber-600'}`}>{status}</p></div>
      <div className="rounded-2xl border border-slate-100 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><p className="text-sm text-slate-400">Verification level</p><p className="mt-3 font-bold text-slate-900 dark:text-white">Level {user?.verification_level ?? 1}</p></div>
    </div>
    <div className="mb-6 rounded-2xl border border-blue-100 bg-blue-50 p-5 dark:border-blue-900 dark:bg-blue-950/40"><h2 className="font-bold text-blue-900 dark:text-blue-100">Proof of company existence</h2><p className="mt-1 text-sm text-blue-700 dark:text-blue-300">Submit the company registration certificate, PAN/VAT certificate, business address proof, and authorized HR representative ID. Administrators review every file before company verification is approved.</p></div>
    <DocumentVerificationPanel role="employer" />
  </div>
}

const SIDEBAR: Array<{
  id: ESection
  label: string
  iconKey: keyof typeof IC
  badge?: number
}> = [
  { id: "dashboard", label: "Dashboard", iconKey: "home" },
  { id: "hiring", label: "Hiring", iconKey: "users" },
  { id: "posts", label: "Manage Posts", iconKey: "doc" },
  { id: "services", label: "Browse Services", iconKey: "shop" },
  { id: "messages", label: "Messages", iconKey: "chat" },
  { id: "analytics", label: "Analytics", iconKey: "chart" },
  { id: "company", label: "Company & Reviews", iconKey: "building" },
  { id: "trust", label: "Trust Center", iconKey: "shield" },
  { id: "settings", label: "Settings", iconKey: "gear" },
]

// ─── Main Export ──────────────────────────────────────────────────────────────

export function EmployerDashboard({ onLogout }: { onLogout: () => void }) {
  const [section, setSection] = useState<ESection>("dashboard")
  const [collapsed, setCollapsed] = useState(false)
  const [dashboardStats, setDashboardStats] =
    useState<Record<string, string | number>>({})
  useEffect(() => {
    const load = () =>
      api
        .dashboard()
        .then(setDashboardStats)
        .catch(() => undefined)
    void load()
    const timer = window.setInterval(() => {
      void load()
    }, 10000)
    return () => window.clearInterval(timer)
  }, [])
  const sidebarBadge = (item: typeof SIDEBAR[number]) =>
    item.id === "hiring"
      ? Number(dashboardStats.applications || 0)
      : item.id === "posts"
        ? Number(dashboardStats.jobs || 0)
        : item.id === "messages"
          ? Number(dashboardStats.unread_messages || 0)
          : item.badge

  return (
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
                Employer
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
            {SIDEBAR.map((item) => (
              <button
                key={item.id}
                onClick={() => setSection(item.id)}
                title={collapsed ? item.label : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
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
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
          >
            <Ico d={IC.logout} cls="w-5 h-5 shrink-0" />
            {!collapsed && <span className="text-sm font-medium">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 overflow-auto">
        {section === "dashboard" && (
          <EmpDashboardHome
            setSection={setSection}
            dashboardStats={dashboardStats}
          />
        )}
        {section === "hiring" && <HiringWorkspace setSection={setSection} />}
        {section === "posts" && <ManagePosts />}
        {section === "services" && <BrowseServices setSection={setSection} />}
        {section === "messages" && <MessagesWorkspace />}
        {section === "analytics" && <Analytics />}
        {section === "company" && <CompanyWorkspace initialTab="profile" />}
        {section === "trust" && <CompanyTrustCenter />}
        {section === "settings" && <EmpSettings />}
      </main>
    </div>
  )
}
