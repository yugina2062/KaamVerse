import { useState, useRef, useEffect } from 'react'
import { api, ApiError } from '@/lib/api/client'
import type { RegisterPayload, UserRole } from '@/lib/api/types'

// ─── Types ────────────────────────────────────────────────────────────────────

type AuthPage =
  | 'role-select' | 'login' | 'register-seeker' | 'register-employer-individual'
  | 'register-employer-company' | 'verify-email' | 'verify-otp' | 'google-auth'
  | 'forgot-password' | 'reset-password' | 'two-factor' | 'success'

type Role = 'seeker' | 'employer-individual' | 'employer-company' | 'admin'

export interface AuthFlowProps {
  onBackToHome: () => void
  onLoginSuccess?: (role: 'seeker' | 'employer' | 'employer-individual' | 'admin') => void
  dark: boolean
  lang: 'en' | 'np'
  setLang: (v: 'en' | 'np') => void
  initialPage?: AuthPage
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function pwStrength(pw: string): number {
  let s = 0
  if (pw.length >= 8) s++
  if (/[A-Z]/.test(pw)) s++
  if (/[0-9]/.test(pw)) s++
  if (/[^A-Za-z0-9]/.test(pw)) s++
  return s
}

const SKILLS = [
  'JavaScript','TypeScript','React','Vue.js','Node.js','Python','Django',
  'Flutter','React Native','Android','iOS','UI/UX Design','Figma','Graphic Design',
  'Digital Marketing','SEO','Google Ads','Social Media','Content Writing',
  'Copywriting','Translation','Data Analysis','Machine Learning','AWS',
  'DevOps','Docker','Project Management','Accounting','Finance','Sales','Teaching',
]

const EMP_TYPES = [
  { id: 'part-time', label: 'Part-Time Employment', icon: '⏱️' },
  { id: 'freelance', label: 'Freelance Projects', icon: '💻' },
  { id: 'gigs', label: 'On-Demand Gigs', icon: '⚡' },
  { id: 'services', label: 'Service Provider', icon: '🛍️' },
]

const INDUSTRIES = [
  'Software & Technology','Fintech & Banking','E-commerce & Retail',
  'Healthcare','Education','Manufacturing','Media & Entertainment',
  'Consulting','Real Estate','NGO / Non-profit','Government','Other',
]

// ─── Shared UI Components ─────────────────────────────────────────────────────

function PasswordStrengthBar({ password }: { password: string }) {
  const s = pwStrength(password)
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong']
  const colors = ['', '#EF4444', '#F59E0B', '#3B82F6', '#22C55E']
  if (!password) return null
  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-1">
        {[1,2,3,4].map(i => (
          <div key={i} className="flex-1 h-1.5 rounded-full transition-all duration-300"
            style={{ backgroundColor: i <= s ? colors[s] : '#E2E8F0' }} />
        ))}
      </div>
      <p className="text-xs font-semibold" style={{ color: colors[s] }}>{labels[s]} password</p>
    </div>
  )
}

function FInput({ label, type = 'text', placeholder, value, onChange, error, hint, required, prefix }: {
  label: string; type?: string; placeholder?: string; value: string
  onChange: (v: string) => void; error?: string; hint?: string; required?: boolean; prefix?: string
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <div className="relative flex items-center">
        {prefix && (
          <span className="absolute left-4 text-sm text-slate-400 font-medium select-none">{prefix}</span>
        )}
        <input
          type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          className={`w-full py-3 rounded-xl border text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 outline-none transition-all ${prefix ? 'pl-12 pr-4' : 'px-4'} ${error ? 'border-red-400 focus:ring-2 focus:ring-red-100 dark:focus:ring-red-900' : 'border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 focus:border-blue-500 dark:focus:border-blue-400'}`}
        />
      </div>
      {error && <p className="mt-1 text-xs text-red-500 flex items-center gap-1">⚠ {error}</p>}
      {hint && !error && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  )
}

function FSelect({ label, value, onChange, options, required }: {
  label: string; value: string; onChange: (v: string) => void; options: string[]; required?: boolean
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <select
        value={value} onChange={e => onChange(e.target.value)}
        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 focus:border-blue-500 transition-all"
      >
        <option value="">Select...</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}

function PwInput({ label, value, onChange, error, showStrength }: {
  label: string; value: string; onChange: (v: string) => void; error?: string; showStrength?: boolean
}) {
  const [show, setShow] = useState(false)
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
        {label}<span className="text-red-500 ml-0.5">*</span>
      </label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'} value={value} onChange={e => onChange(e.target.value)}
          placeholder="••••••••"
          className={`w-full px-4 py-3 pr-12 rounded-xl border text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 outline-none transition-all ${error ? 'border-red-400 focus:ring-2 focus:ring-red-100' : 'border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 focus:border-blue-500'}`}
        />
        <button type="button" onClick={() => setShow(v => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
          {show
            ? <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
            : <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
          }
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-red-500">⚠ {error}</p>}
      {showStrength && <PasswordStrengthBar password={value} />}
    </div>
  )
}

function OTPBox({ onComplete }: { onComplete: (code: string) => void }) {
  const [digits, setDigits] = useState(Array(6).fill(''))
  const refs = useRef<Array<HTMLInputElement | null>>(Array(6).fill(null))

  const handleChange = (i: number, val: string) => {
    if (!/^\d*$/.test(val)) return
    const next = [...digits]; next[i] = val.slice(-1); setDigits(next)
    if (val && i < 5) refs.current[i + 1]?.focus()
    if (next.every(d => d !== '') && val) onComplete(next.join(''))
  }
  const handleKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) refs.current[i - 1]?.focus()
  }
  const handlePaste = (e: React.ClipboardEvent) => {
    const p = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!p) return
    const next = [...digits]; p.split('').forEach((d, i) => { next[i] = d }); setDigits(next)
    refs.current[Math.min(p.length, 5)]?.focus()
    if (p.length === 6) onComplete(p)
    e.preventDefault()
  }

  return (
    <div className="flex gap-2.5 justify-center" onPaste={handlePaste}>
      {digits.map((d, i) => (
        <input key={i} ref={el => { refs.current[i] = el }}
          type="text" inputMode="numeric" maxLength={1} value={d}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKey(i, e)}
          className={`w-11 h-13 text-center text-xl font-bold border-2 rounded-xl outline-none transition-all duration-150 ${d ? 'border-blue-500 bg-blue-50 dark:bg-blue-950 dark:border-blue-400 text-blue-600 dark:text-blue-400' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white'} focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900`}
          style={{ height: '3.25rem' }}
        />
      ))}
    </div>
  )
}

function PrimaryBtn({ children, onClick, loading, disabled, type = 'button' }: {
  children: React.ReactNode; onClick?: () => void; loading?: boolean; disabled?: boolean; type?: 'button' | 'submit'
}) {
  return (
    <button type={type} onClick={onClick} disabled={loading || disabled}
      className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 text-sm shadow-sm">
      {loading && <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
      {children}
    </button>
  )
}

function GhostBtn({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="w-full py-3.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm">
      {children}
    </button>
  )
}

function GoogleBtn({ onClick }: { onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="w-full py-3.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm flex items-center justify-center gap-3">
      <svg className="w-5 h-5" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
      Continue with Google
    </button>
  )
}

function Divider() {
  return (
    <div className="flex items-center gap-3 my-5">
      <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
      <span className="text-xs text-slate-400 font-medium">or continue with email</span>
      <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
    </div>
  )
}

function TrustBadges() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-4 mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
      {[['🔒','256-bit SSL'],['🛡️','GDPR Safe'],['✅','NID Verified'],['🤖','AI Protected']].map(([ic, lb]) => (
        <div key={lb} className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
          <span>{ic}</span><span>{lb}</span>
        </div>
      ))}
    </div>
  )
}

function StepBar({ current, total, labels }: { current: number; total: number; labels: string[] }) {
  return (
    <div className="mb-7">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-slate-400">Step {current} of {total}</span>
        <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">{labels[current - 1]}</span>
      </div>
      <div className="flex gap-1.5">
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} className="flex-1 h-1 rounded-full transition-all duration-300"
            style={{ backgroundColor: i < current ? '#2563EB' : '#E2E8F0' }} />
        ))}
      </div>
    </div>
  )
}

function Alert({ type, msg }: { type: 'error' | 'success'; msg: string }) {
  return (
    <div className={`mb-4 px-4 py-3 rounded-xl text-sm flex items-center gap-2 border ${type === 'error' ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-900 text-red-600 dark:text-red-400' : 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-900 text-green-700 dark:text-green-400'}`}>
      {type === 'error' ? '⚠️' : '✅'} {msg}
    </div>
  )
}

// ─── Left Panel ───────────────────────────────────────────────────────────────

const LEFT_CONTENT: Record<AuthPage, { title: string; sub: string }> = {
  'role-select': { title: 'Join 125,000+ Professionals', sub: "Nepal's most trusted employment ecosystem — verified, AI-powered, and built for you." },
  'login': { title: 'Welcome Back', sub: 'Sign in securely to your KaamVerse account.' },
  'register-seeker': { title: 'Your Career Starts Here', sub: 'AI-powered matching finds your perfect opportunity.' },
  'register-employer-individual': { title: 'Hire with Confidence', sub: "Access Nepal's most verified talent pool." },
  'register-employer-company': { title: 'Scale Your Team', sub: 'Connect with 125,000+ verified professionals.' },
  'verify-email': { title: 'Securing Your Account', sub: 'Multi-layer verification protects your identity.' },
  'verify-otp': { title: 'Almost There', sub: 'One last step to verify your identity.' },
  'google-auth': { title: 'Secure Sign-In', sub: 'Fast, safe access with Google OAuth 2.0.' },
  'forgot-password': { title: 'Account Recovery', sub: "We'll get you back in safely and quickly." },
  'reset-password': { title: 'New Password', sub: 'Create a strong password to protect your account.' },
  'two-factor': { title: 'Maximum Security', sub: '2FA adds the strongest layer of protection.' },
  'success': { title: "You're All Set!", sub: 'Welcome to Nepal\'s trusted employment ecosystem.' },
}

function LeftPanel({ page }: { page: AuthPage }) {
  const c = LEFT_CONTENT[page]
  return (
    <div className="hidden lg:flex lg:w-5/12 xl:w-2/5 bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 flex-col justify-between p-10 relative overflow-hidden min-h-screen">
      {/* BG glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute bottom-0 -left-20 w-80 h-80 rounded-full bg-indigo-900/30 blur-3xl" />
      </div>

      {/* Top */}
      <div className="relative z-10">
        <div className="flex items-center gap-2.5 mb-12">
          <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <span className="text-white font-heading font-bold text-sm">K</span>
          </div>
          <span className="font-heading font-bold text-white text-lg tracking-tight">KaamVerse</span>
        </div>

        <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center mb-6">
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
          </svg>
        </div>

        <h2 className="font-heading text-2xl xl:text-3xl font-extrabold text-white leading-tight mb-3">{c.title}</h2>
        <p className="text-blue-100 text-sm leading-relaxed mb-8">{c.sub}</p>

        <div className="space-y-3">
          {[
            { icon: '🤖', label: 'AI-Powered Identity Verification' },
            { icon: '🛡️', label: 'Real-Time Fraud Detection' },
            { icon: '🔒', label: 'Bank-Grade 256-bit Encryption' },
            { icon: '✅', label: 'Multi-Level Trust Score System' },
          ].map(f => (
            <div key={f.label} className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3">
              <span className="text-lg">{f.icon}</span>
              <span className="text-white text-sm font-medium">{f.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom */}
      <div className="relative z-10">
        <div className="grid grid-cols-3 gap-2.5 mb-5">
          {[['125K+','Professionals'],['4.2K+','Companies'],['94%','Success']].map(([val, lbl]) => (
            <div key={lbl} className="bg-white/10 rounded-xl p-3 text-center backdrop-blur-sm">
              <div className="font-heading font-extrabold text-white text-lg leading-tight">{val}</div>
              <div className="text-blue-200 text-xs">{lbl}</div>
            </div>
          ))}
        </div>
        <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
          <div className="flex mb-2">
            {Array.from({length:5}).map((_,i)=><svg key={i} className="w-3.5 h-3.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>)}
          </div>
          <p className="text-blue-100 text-xs italic leading-relaxed mb-3">&ldquo;KaamVerse found me a job in 3 days with complete trust and transparency.&rdquo;</p>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-blue-400 flex items-center justify-center text-white text-xs font-bold">B</div>
            <div>
              <div className="text-white text-xs font-semibold">Bikash Rana</div>
              <div className="text-blue-200 text-xs">Senior Dev, Leapfrog Technology</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Auth Header (top of form area) ──────────────────────────────────────────

function AuthHeader({ onBackToHome, lang, setLang }: {
  onBackToHome: () => void; lang: 'en'|'np'; setLang: (v:'en'|'np')=>void
}) {
  return (
    <div className="flex items-center justify-between mb-8">
      <button onClick={onBackToHome}
        className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-sm font-medium group">
        <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Home
      </button>
      <div className="flex items-center gap-2">
        <div className="lg:hidden flex items-center gap-1.5">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
            <span className="text-white font-bold text-xs">K</span>
          </div>
          <span className="font-heading font-bold text-slate-900 dark:text-white text-sm">KaamVerse</span>
        </div>
        <button onClick={() => setLang(lang === 'en' ? 'np' : 'en')}
          title={lang === 'en' ? 'Switch to Nepali' : 'Switch to English'} aria-label={lang === 'en' ? 'Switch language to Nepali' : 'Switch language to English'}
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><circle cx="12" cy="12" r="9"/><path strokeLinecap="round" d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/></svg>
        </button>
      </div>
    </div>
  )
}

// ─── Role Select ──────────────────────────────────────────────────────────────

function RoleSelectPage({ nav, onBackToHome, lang, setLang, onAdminSelected }: {
  nav: (p: AuthPage) => void; onBackToHome: () => void; lang: 'en'|'np'; setLang: (v:'en'|'np')=>void; onAdminSelected: () => void
}) {
  const [selected, setSelected] = useState<Role | null>(null)

  const roles = [
    { id: 'seeker' as Role, icon: '👤', title: 'Job Seeker', desc: 'Find jobs, freelance projects, and gigs matching your skills', color: '#2563EB', ring: 'ring-blue-200 dark:ring-blue-800', bg: 'bg-blue-50 dark:bg-blue-950' },
    { id: 'employer-individual' as Role, icon: '🧑‍💼', title: 'Employer — Individual', desc: 'Hire verified freelancers and gig workers for your projects', color: '#7C3AED', ring: 'ring-violet-200 dark:ring-violet-800', bg: 'bg-violet-50 dark:bg-violet-950' },
    { id: 'employer-company' as Role, icon: '🏢', title: 'Employer — Company', desc: 'Post jobs and build your verified team at scale', color: '#059669', ring: 'ring-emerald-200 dark:ring-emerald-800', bg: 'bg-emerald-50 dark:bg-emerald-950' },
  ]

  return (
    <div>
      <AuthHeader onBackToHome={onBackToHome} lang={lang} setLang={setLang} />
      <div className="mb-7">
        <h1 className="font-heading text-2xl font-extrabold text-slate-900 dark:text-white mb-1.5">Who are you?</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm">Choose your role to get the right experience on KaamVerse.</p>
      </div>
      <div className="space-y-3 mb-6">
        {roles.map(r => (
          <button key={r.id} onClick={() => setSelected(r.id)}
            className={`w-full text-left rounded-2xl border-2 p-4 transition-all duration-200 ${selected === r.id ? `${r.bg} ring-2 ${r.ring} border-transparent` : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-900'}`}>
            <div className="flex items-center gap-4">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-2xl shrink-0 ${selected === r.id ? r.bg : 'bg-slate-100 dark:bg-slate-800'}`}>{r.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-heading font-bold text-slate-900 dark:text-white text-sm">{r.title}</h3>
                  <div className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-all ${selected === r.id ? 'border-transparent' : 'border-slate-300 dark:border-slate-600'}`}
                    style={selected === r.id ? { backgroundColor: r.color } : {}}>
                    {selected === r.id && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>}
                  </div>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">{r.desc}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
      <PrimaryBtn disabled={!selected} onClick={() => {
        if (selected === 'seeker') nav('register-seeker')
        else if (selected === 'employer-individual') nav('register-employer-individual')
        else if (selected === 'employer-company') nav('register-employer-company')
        else nav('login')
      }}>
        Continue →
      </PrimaryBtn>
      <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-5">
        Already have an account?{' '}
        <button onClick={() => nav('login')} className="text-blue-600 dark:text-blue-400 font-semibold hover:underline">Log in</button>
      </p>
      <TrustBadges />
    </div>
  )
}

// ─── Login ────────────────────────────────────────────────────────────────────

function LoginPage({ nav, onBackToHome, lang, setLang, onAuthenticated }: {
  nav: (p: AuthPage) => void; onBackToHome: () => void; lang: 'en'|'np'; setLang: (v:'en'|'np')=>void
  onAuthenticated: (role: UserRole) => void
}) {
  const [mode, setMode] = useState<'email'|'phone'>('email')
  const [id, setId] = useState('')
  const [pw, setPw] = useState('')
  const [remember, setRemember] = useState(false)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [needsTwoFactor, setNeedsTwoFactor] = useState(false)
  const [twoFactorCode, setTwoFactorCode] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id || !pw) { setErr('Please fill in all fields.'); return }
    setErr(''); setLoading(true)
    try {
      const user = await api.auth.login(id, pw, twoFactorCode)
      onAuthenticated(user.role)
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Unable to sign in. Please try again.'
      if (/two-factor/i.test(message)) setNeedsTwoFactor(true)
      setErr(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <AuthHeader onBackToHome={onBackToHome} lang={lang} setLang={setLang} />
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-extrabold text-slate-900 dark:text-white mb-1">Welcome back</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm">Sign in to your KaamVerse account</p>
      </div>

      <GoogleBtn onClick={() => nav('google-auth')} />
      <Divider />

      {/* Email / Phone toggle */}
      <div className="flex rounded-xl border border-slate-200 dark:border-slate-700 p-1 mb-5 bg-slate-50 dark:bg-slate-900">
        {(['email','phone'] as const).map(t => (
          <button key={t} onClick={() => { setMode(t); setId('') }}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${mode === t ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}>
            {t === 'email' ? '📧 Email' : '📱 Phone'}
          </button>
        ))}
      </div>

      {err && <Alert type="error" msg={err} />}

      <form onSubmit={submit} className="space-y-4">
        <FInput label={mode === 'email' ? 'Email Address' : 'Phone Number'}
          type={mode === 'email' ? 'email' : 'tel'}
          placeholder={mode === 'email' ? 'you@example.com' : '+977-98XXXXXXXX'}
          value={id} onChange={setId} required />
        <PwInput label="Password" value={pw} onChange={setPw} />
        {needsTwoFactor && <FInput label="Two-Factor Email Code" placeholder="Enter the 6-digit code" value={twoFactorCode} onChange={value => setTwoFactorCode(value.replace(/\D/g, '').slice(0, 6))} required />}

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
            <span className="text-sm text-slate-600 dark:text-slate-400">Remember me</span>
          </label>
          <button type="button" onClick={() => nav('forgot-password')}
            className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline">
            Forgot password?
          </button>
        </div>

        <PrimaryBtn type="submit" loading={loading}>{loading ? 'Signing in...' : 'Sign In'}</PrimaryBtn>
      </form>

      <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-5">
        New to KaamVerse?{' '}
        <button onClick={() => nav('role-select')} className="text-blue-600 dark:text-blue-400 font-semibold hover:underline">Create account</button>
      </p>
      <TrustBadges />
    </div>
  )
}

// ─── Register – Job Seeker (4 steps) ─────────────────────────────────────────

function RegisterSeekerPage({ nav, onBackToHome, lang, setLang, onDone }: {
  nav: (p: AuthPage) => void; onBackToHome: () => void; lang: 'en'|'np'; setLang: (v:'en'|'np')=>void
  onDone: (email: string, phone: string) => void
}) {
  const [step, setStep] = useState(1)
  const [f, setF] = useState({ firstName: '', lastName: '', email: '', phone: '', password: '', confirm: '' })
  const [skills, setSkills] = useState<string[]>([])
  const [empTypes, setEmpTypes] = useState<string[]>([])
  const [availability, setAvailability] = useState('')
  const [location, setLocation] = useState('')
  const [terms, setTerms] = useState(false)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  const set = (k: keyof typeof f, v: string) => setF(p => ({ ...p, [k]: v }))
  const STEPS = ['Personal Info', 'Skills', 'Preferences', 'Terms']

  const nextStep = () => {
    if (step === 1) {
      if (!f.firstName || !f.lastName || !f.email || !f.phone || !f.password) { setErr('Please fill all required fields.'); return }
      if (f.password !== f.confirm) { setErr('Passwords do not match.'); return }
      if (pwStrength(f.password) < 2) { setErr('Password is too weak. Add uppercase, numbers, or symbols.'); return }
    }
    if (step === 2 && skills.length === 0) { setErr('Please select at least one skill.'); return }
    if (step === 3 && !availability) { setErr('Please select your availability.'); return }
    setErr(''); setStep(s => s + 1)
  }

  const submit = async () => {
    if (!terms) { setErr('Please accept the terms to continue.'); return }
    setErr(''); setLoading(true)
    const payload: RegisterPayload = {
      email: f.email,
      password: f.password,
      first_name: f.firstName,
      last_name: f.lastName,
      phone: f.phone,
      role: 'seeker',
      preferred_language: lang,
      profile: {
        skills,
        preferred_job_types: empTypes,
        availability: { label: availability },
        preferred_location: location,
      },
    }
    try {
      await api.auth.register(payload)
      await api.auth.login(f.email, f.password)
      onDone(f.email, f.phone)
    } catch (error) {
      setErr(error instanceof ApiError ? error.message : 'Unable to create your account. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const toggleSkill = (s: string) => setSkills(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  const toggleType = (t: string) => setEmpTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])

  return (
    <div>
      <AuthHeader onBackToHome={onBackToHome} lang={lang} setLang={setLang} />
      <div className="mb-5">
        <h1 className="font-heading text-2xl font-extrabold text-slate-900 dark:text-white mb-1">Create Your Account</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm">Job Seeker — Join Nepal's most trusted employment platform</p>
      </div>

      <StepBar current={step} total={4} labels={STEPS} />
      {err && <Alert type="error" msg={err} />}

      {step === 1 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FInput label="First Name" placeholder="Aarav" value={f.firstName} onChange={v => set('firstName', v)} required />
            <FInput label="Last Name" placeholder="Sharma" value={f.lastName} onChange={v => set('lastName', v)} required />
          </div>
          <FInput label="Email Address" type="email" placeholder="you@example.com" value={f.email} onChange={v => set('email', v)} required />
          <FInput label="Phone Number" type="tel" placeholder="98XXXXXXXX" value={f.phone} onChange={v => set('phone', v)} prefix="+977" required />
          <PwInput label="Password" value={f.password} onChange={v => set('password', v)} showStrength />
          <PwInput label="Confirm Password" value={f.confirm} onChange={v => set('confirm', v)} error={f.confirm && f.password !== f.confirm ? "Passwords don't match" : undefined} />
          <PrimaryBtn onClick={nextStep}>Continue →</PrimaryBtn>
        </div>
      )}

      {step === 2 && (
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Select your skills <span className="text-blue-600 dark:text-blue-400 font-semibold">({skills.length} selected)</span></p>
          <div className="flex flex-wrap gap-2 mb-6 max-h-52 overflow-y-auto">
            {SKILLS.map(s => (
              <button key={s} onClick={() => toggleSkill(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${skills.includes(s) ? 'bg-blue-600 border-blue-600 text-white shadow-sm' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-blue-300 hover:text-blue-600 bg-white dark:bg-slate-900'}`}>
                {s}
              </button>
            ))}
          </div>
          <div className="flex gap-3">
            <GhostBtn onClick={() => setStep(1)}>← Back</GhostBtn>
            <PrimaryBtn onClick={nextStep}>Continue →</PrimaryBtn>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-5">
          <div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Employment Types <span className="text-slate-400 font-normal">(select all that apply)</span></p>
            <div className="space-y-2">
              {EMP_TYPES.map(t => (
                <button key={t.id} onClick={() => toggleType(t.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm transition-all ${empTypes.includes(t.id) ? 'border-blue-500 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300'}`}>
                  <span>{t.icon}</span>
                  <span className="font-medium">{t.label}</span>
                  {empTypes.includes(t.id) && <svg className="w-4 h-4 text-blue-600 ml-auto shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>}
                </button>
              ))}
            </div>
          </div>
          <FSelect label="Availability" value={availability} onChange={setAvailability}
            options={['Immediately','Within 2 weeks','Within 1 month','In 2–3 months','Just browsing']} required />
          <FInput label="Preferred Location" placeholder="Kathmandu, Remote..." value={location} onChange={setLocation} />
          <div className="flex gap-3">
            <GhostBtn onClick={() => setStep(2)}>← Back</GhostBtn>
            <PrimaryBtn onClick={nextStep}>Continue →</PrimaryBtn>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-5">
          <div className="bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4 max-h-40 overflow-y-auto text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            <p className="font-semibold text-slate-700 dark:text-slate-300 mb-2">Terms & Conditions Summary</p>
            <p className="mb-2">By creating an account, you agree to KaamVerse's Terms of Service and Privacy Policy. Your data is protected under Nepal's Privacy Act and processed with explicit consent only.</p>
            <p className="mb-2">You confirm that all information provided is accurate and complete. Providing false information may result in account suspension.</p>
            <p>KaamVerse uses AI-powered identity verification to ensure platform safety. Your Trust Score is calculated based on your activity, verifications, and reviews.</p>
          </div>
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={terms} onChange={e => setTerms(e.target.checked)}
              className="w-4 h-4 mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 shrink-0" />
            <span className="text-sm text-slate-600 dark:text-slate-400">
              I agree to the{' '}
              <span className="text-blue-600 dark:text-blue-400 font-semibold cursor-pointer hover:underline">Terms & Conditions</span>
              {' '}and{' '}
              <span className="text-blue-600 dark:text-blue-400 font-semibold cursor-pointer hover:underline">Privacy Policy</span>
            </span>
          </label>
          <div className="flex gap-3">
            <GhostBtn onClick={() => setStep(3)}>← Back</GhostBtn>
            <PrimaryBtn onClick={submit} loading={loading}>{loading ? 'Creating account...' : 'Create Account 🎉'}</PrimaryBtn>
          </div>
        </div>
      )}

      <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-5">
        Already have an account?{' '}
        <button onClick={() => nav('login')} className="text-blue-600 dark:text-blue-400 font-semibold hover:underline">Log in</button>
      </p>
      <TrustBadges />
    </div>
  )
}

// ─── Register – Employer Individual (2 steps) ─────────────────────────────────

function RegisterEmployerIndividualPage({ nav, onBackToHome, lang, setLang, onDone }: {
  nav: (p: AuthPage) => void; onBackToHome: () => void; lang: 'en'|'np'; setLang: (v:'en'|'np')=>void
  onDone: (email: string, phone: string) => void
}) {
  const [step, setStep] = useState(1)
  const [f, setF] = useState({ firstName: '', lastName: '', email: '', nid: '', dob: '', phone: '', address: '', city: '', password: '' })
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const set = (k: keyof typeof f, v: string) => setF(p => ({ ...p, [k]: v }))
  const STEPS = ['Identity', 'Contact']

  const nextStep = () => {
    if (!f.firstName || !f.lastName || !f.email || !f.nid || !f.password) { setErr('Please fill all required fields.'); return }
    setErr(''); setStep(2)
  }
  const submit = async () => {
    if (!f.phone || !f.address || !f.city) { setErr('Please fill all required fields.'); return }
    setErr(''); setLoading(true)
    try {
      await api.auth.register({
        email: f.email,
        password: f.password,
        first_name: f.firstName,
        last_name: f.lastName,
        phone: f.phone,
        role: 'employer-individual',
        preferred_language: lang,
        profile: {
          registration_number: f.nid,
          address: f.address,
          city: f.city,
        },
      })
      await api.auth.login(f.email, f.password)
      onDone(f.email, f.phone)
    } catch (error) {
      setErr(error instanceof ApiError ? error.message : 'Unable to create your account. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <AuthHeader onBackToHome={onBackToHome} lang={lang} setLang={setLang} />
      <div className="mb-5">
        <h1 className="font-heading text-2xl font-extrabold text-slate-900 dark:text-white mb-1">Employer — Individual</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm">Hire verified talent from Nepal's trusted platform</p>
      </div>
      <StepBar current={step} total={2} labels={STEPS} />
      {err && <Alert type="error" msg={err} />}

      {step === 1 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FInput label="First Name" placeholder="Suresh" value={f.firstName} onChange={v => set('firstName', v)} required />
            <FInput label="Last Name" placeholder="Pandey" value={f.lastName} onChange={v => set('lastName', v)} required />
          </div>
          <FInput label="Email Address" type="email" placeholder="you@example.com" value={f.email} onChange={v => set('email', v)} required />
          <FInput label="National ID / Passport No." placeholder="NID: 12345-XXXXX" value={f.nid} onChange={v => set('nid', v)} required hint="Used for identity verification — securely encrypted" />
          <FInput label="Date of Birth" type="date" value={f.dob} onChange={v => set('dob', v)} />
          <PwInput label="Password" value={f.password} onChange={v => set('password', v)} showStrength />
          <PrimaryBtn onClick={nextStep}>Continue →</PrimaryBtn>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <FInput label="Phone Number" type="tel" placeholder="98XXXXXXXX" value={f.phone} onChange={v => set('phone', v)} prefix="+977" required />
          <FInput label="Home / Office Address" placeholder="Thamel, Ward 26" value={f.address} onChange={v => set('address', v)} required />
          <FSelect label="City" value={f.city} onChange={v => set('city', v)}
            options={['Kathmandu','Lalitpur','Bhaktapur','Pokhara','Biratnagar','Birgunj','Butwal','Dharan','Other']} required />
          <div className="flex gap-3">
            <GhostBtn onClick={() => setStep(1)}>← Back</GhostBtn>
            <PrimaryBtn onClick={submit} loading={loading}>{loading ? 'Creating...' : 'Create Account'}</PrimaryBtn>
          </div>
        </div>
      )}

      <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-5">
        Already have an account?{' '}
        <button onClick={() => nav('login')} className="text-blue-600 dark:text-blue-400 font-semibold hover:underline">Log in</button>
      </p>
      <TrustBadges />
    </div>
  )
}

// ─── Register – Employer Company (3 steps) ────────────────────────────────────

function RegisterEmployerCompanyPage({ nav, onBackToHome, lang, setLang, onDone }: {
  nav: (p: AuthPage) => void; onBackToHome: () => void; lang: 'en'|'np'; setLang: (v:'en'|'np')=>void
  onDone: (email: string, phone: string) => void
}) {
  const [step, setStep] = useState(1)
  const [f, setF] = useState({
    companyName: '', regNo: '', panVat: '', email: '', contactPerson: '',
    website: '', industry: '', size: '',
    address: '', city: '', password: '', phone: '',
  })
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const [logoName, setLogoName] = useState('')
  const set = (k: keyof typeof f, v: string) => setF(p => ({ ...p, [k]: v }))
  const STEPS = ['Company Details', 'Online Presence', 'Address & Contact']

  const nextStep = () => {
    if (step === 1 && (!f.companyName || !f.regNo || !f.panVat || !f.email)) { setErr('Please fill all required fields.'); return }
    if (step === 2 && !f.industry) { setErr('Please select an industry.'); return }
    setErr(''); setStep(s => s + 1)
  }
  const submit = async () => {
    if (!f.address || !f.city || !f.phone || !f.password) { setErr('Please fill all required fields.'); return }
    setErr(''); setLoading(true)
    try {
      await api.auth.register({
        email: f.email,
        password: f.password,
        first_name: f.contactPerson || f.companyName,
        last_name: '',
        phone: f.phone,
        role: 'employer',
        preferred_language: lang,
        profile: {
          business_name: f.companyName,
          registration_number: f.regNo,
          pan_vat_number: f.panVat,
          contact_person: f.contactPerson,
          industry: f.industry,
          company_size: f.size,
          website: f.website,
          address: f.address,
          city: f.city,
        },
      })
      await api.auth.login(f.email, f.password)
      onDone(f.email, f.phone)
    } catch (error) {
      setErr(error instanceof ApiError ? error.message : 'Unable to register the company. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <AuthHeader onBackToHome={onBackToHome} lang={lang} setLang={setLang} />
      <div className="mb-5">
        <h1 className="font-heading text-2xl font-extrabold text-slate-900 dark:text-white mb-1">Employer — Company</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm">Register your company and start hiring verified talent</p>
      </div>
      <StepBar current={step} total={3} labels={STEPS} />
      {err && <Alert type="error" msg={err} />}

      {step === 1 && (
        <div className="space-y-4">
          <FInput label="Company Name" placeholder="Leapfrog Technology Pvt. Ltd." value={f.companyName} onChange={v => set('companyName', v)} required />
          <FInput label="Company Registration No." placeholder="123456/078/079" value={f.regNo} onChange={v => set('regNo', v)} required hint="Issued by the Office of Company Registrar, Nepal" />
          <FInput label="PAN / VAT Number" placeholder="123456789" value={f.panVat} onChange={v => set('panVat', v)} required />
          <FInput label="Official Email Address" type="email" placeholder="hr@company.com.np" value={f.email} onChange={v => set('email', v)} required />
          <FInput label="Contact Person Name" placeholder="Full name of authorized person" value={f.contactPerson} onChange={v => set('contactPerson', v)} />
          <PrimaryBtn onClick={nextStep}>Continue →</PrimaryBtn>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <FInput label="Company Website" type="url" placeholder="https://yourcompany.com.np" value={f.website} onChange={v => set('website', v)} />
          <FSelect label="Industry" value={f.industry} onChange={v => set('industry', v)} options={INDUSTRIES} required />
          <FSelect label="Company Size" value={f.size} onChange={v => set('size', v)}
            options={['1–10 employees','11–50 employees','51–200 employees','201–500 employees','500+ employees']} />
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Company Logo <span className="text-slate-400 font-normal">(optional)</span></label>
            <label className="flex items-center justify-center gap-3 w-full border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl py-6 cursor-pointer hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors">
              <input type="file" accept="image/*" className="hidden" onChange={e => setLogoName(e.target.files?.[0]?.name || '')} />
              <span className="text-2xl">{logoName ? '✅' : '📁'}</span>
              <span className="text-sm text-slate-500 dark:text-slate-400">{logoName || 'Upload logo (PNG, JPG — max 2MB)'}</span>
            </label>
          </div>
          <div className="flex gap-3">
            <GhostBtn onClick={() => setStep(1)}>← Back</GhostBtn>
            <PrimaryBtn onClick={nextStep}>Continue →</PrimaryBtn>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <FInput label="Business Address" placeholder="Street, Ward No." value={f.address} onChange={v => set('address', v)} required />
          <FSelect label="City" value={f.city} onChange={v => set('city', v)}
            options={['Kathmandu','Lalitpur','Bhaktapur','Pokhara','Biratnagar','Birgunj','Butwal','Dharan','Other']} required />
          <FInput label="Contact Phone" type="tel" placeholder="98XXXXXXXX" value={f.phone} onChange={v => set('phone', v)} prefix="+977" required />
          <PwInput label="Account Password" value={f.password} onChange={v => set('password', v)} showStrength />
          <div className="flex gap-3">
            <GhostBtn onClick={() => setStep(2)}>← Back</GhostBtn>
            <PrimaryBtn onClick={submit} loading={loading}>{loading ? 'Registering...' : 'Register Company'}</PrimaryBtn>
          </div>
        </div>
      )}

      <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-5">
        Already have an account?{' '}
        <button onClick={() => nav('login')} className="text-blue-600 dark:text-blue-400 font-semibold hover:underline">Log in</button>
      </p>
      <TrustBadges />
    </div>
  )
}

// ─── Verify Email ─────────────────────────────────────────────────────────────

function VerifyEmailPage({ nav, onBackToHome, lang, setLang, email }: {
  nav: (p: AuthPage) => void; onBackToHome: () => void; lang: 'en'|'np'; setLang: (v:'en'|'np')=>void; email: string
}) {
  const [resent, setResent] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  const resend = async () => {
    try {
      const response = await api.auth.sendEmailVerification()
      setResent(true)
      setCountdown(response.retry_after || 60)
      setErr('')
    } catch (error) {
      setErr(error instanceof ApiError ? error.message : 'Unable to resend the verification email.')
    }
  }

  const confirmEmail = async (code: string) => {
    setLoading(true)
    setErr('')
    try {
      await api.auth.confirmEmailVerification(code)
      nav('success')
    } catch (error) {
      setErr(error instanceof ApiError ? error.message : 'Unable to confirm your email.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (countdown <= 0) return
    const t = setInterval(() => setCountdown(c => c - 1), 1000)
    return () => clearInterval(t)
  }, [countdown])

  return (
    <div>
      <AuthHeader onBackToHome={onBackToHome} lang={lang} setLang={setLang} />
      <div className="text-center">
        <div className="w-20 h-20 rounded-2xl bg-blue-50 dark:bg-blue-950 flex items-center justify-center text-5xl mx-auto mb-6">📧</div>
        <h1 className="font-heading text-2xl font-extrabold text-slate-900 dark:text-white mb-3">Check your email</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-2">
          We sent a six-digit verification code to
        </p>
        <p className="font-semibold text-slate-900 dark:text-white text-sm mb-6">{email || 'your email address'}</p>

        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-100 dark:border-blue-900 rounded-2xl p-5 mb-7">
          <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">Enter the code from your inbox. It expires after 10 minutes.</p>
          <OTPBox onComplete={code => void confirmEmail(code)} />
        </div>

        {resent && <Alert type="success" msg="Verification email resent successfully!" />}
        {err && <Alert type="error" msg={err} />}

        {loading && <div className="mb-4 text-sm font-semibold text-blue-600">Confirming code...</div>}

        <div className="mt-4 text-center">
          {countdown > 0
            ? <p className="text-sm text-slate-400">Resend available in {countdown}s</p>
            : <button onClick={resend} className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                Didn't receive it? Resend email
              </button>
          }
        </div>
        <TrustBadges />
      </div>
    </div>
  )
}

// ─── Verify OTP ───────────────────────────────────────────────────────────────

function VerifyOTPPage({ nav, onBackToHome, lang, setLang, phone, developmentCode }: {
  nav: (p: AuthPage) => void; onBackToHome: () => void; lang: 'en'|'np'; setLang: (v:'en'|'np')=>void; phone: string
  developmentCode: string
}) {
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(30)
  const [localCode, setLocalCode] = useState(developmentCode)
  const [err, setErr] = useState('')

  useEffect(() => {
    if (countdown <= 0) return
    const t = setInterval(() => setCountdown(c => c - 1), 1000)
    return () => clearInterval(t)
  }, [countdown])

  const handleComplete = async (code: string) => {
    setLoading(true)
    setErr('')
    try {
      await api.auth.confirmPhoneVerification(code)
      setDone(true)
      nav('two-factor')
    } catch (error) {
      setErr(error instanceof ApiError ? error.message : 'Unable to verify the phone number.')
    } finally {
      setLoading(false)
    }
  }

  const resendPhoneCode = async () => {
    try {
      const response = await api.auth.sendPhoneVerification()
      setLocalCode(response.development_code || '')
      setCountdown(30)
      setErr('')
    } catch (error) {
      setErr(error instanceof ApiError ? error.message : 'Unable to resend the phone code.')
    }
  }

  return (
    <div>
      <AuthHeader onBackToHome={onBackToHome} lang={lang} setLang={setLang} />
      <div className="text-center">
        <div className="w-20 h-20 rounded-2xl bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-5xl mx-auto mb-6">📱</div>
        <h1 className="font-heading text-2xl font-extrabold text-slate-900 dark:text-white mb-2">Phone Verification</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-1">Enter the 6-digit code sent to</p>
        <p className="font-semibold text-slate-900 dark:text-white text-sm mb-7">{phone || '+977-98XXXXXXXX'}</p>

        <div className="mb-6">
          <OTPBox onComplete={handleComplete} />
        </div>

        {localCode && <div className="mb-4 px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-xs">Local development OTP: <strong>{localCode}</strong></div>}
        {err && <Alert type="error" msg={err} />}

        {loading && (
          <div className="mb-4 flex items-center justify-center gap-2 text-blue-600 dark:text-blue-400 text-sm font-medium">
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
            Verifying code...
          </div>
        )}

        {done && !loading && <Alert type="success" msg="Phone number verified successfully!" />}

        <p className="text-xs text-slate-400 mb-5">Code expires in 10 minutes</p>

        <div className="text-center">
          {countdown > 0
            ? <p className="text-sm text-slate-400">Resend code in {countdown}s</p>
            : <button onClick={resendPhoneCode} className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline">Resend code</button>
          }
        </div>

        <div className="mt-4">
          <button onClick={() => nav('verify-email')} className="text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
            ← Change phone number
          </button>
        </div>
        <TrustBadges />
      </div>
    </div>
  )
}

// ─── Google Auth ──────────────────────────────────────────────────────────────

function GoogleAuthPage({ nav, onBackToHome, lang, setLang }: {
  nav: (p: AuthPage) => void; onBackToHome: () => void; lang: 'en'|'np'; setLang: (v:'en'|'np')=>void
}) {
  const [phase, setPhase] = useState<'loading'|'select'|'done'>('loading')
  const accounts = [
    { name: 'Aarav Sharma', email: 'aarav.sharma@gmail.com', initials: 'AS' },
    { name: 'Priya Thapa', email: 'priya.thapa@gmail.com', initials: 'PT' },
  ]

  useEffect(() => {
    const t = setTimeout(() => setPhase('select'), 1600)
    return () => clearTimeout(t)
  }, [])

  const choose = (_acc: typeof accounts[0]) => {
    setPhase('done')
    setTimeout(() => nav('success'), 1200)
  }

  return (
    <div>
      <AuthHeader onBackToHome={onBackToHome} lang={lang} setLang={setLang} />
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 dark:border-slate-700 shadow-md flex items-center justify-center mx-auto mb-6">
          <svg className="w-9 h-9" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
        </div>

        {phase === 'loading' && (
          <>
            <h1 className="font-heading text-xl font-bold text-slate-900 dark:text-white mb-2">Connecting to Google</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-8">Please wait while we securely connect...</p>
            <div className="flex justify-center gap-1.5">
              {[0,1,2].map(i => (
                <div key={i} className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </>
        )}

        {phase === 'select' && (
          <>
            <h1 className="font-heading text-xl font-bold text-slate-900 dark:text-white mb-2">Choose an account</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">to continue to KaamVerse</p>
            <div className="space-y-3 text-left mb-5">
              {accounts.map(a => (
                <button key={a.email} onClick={() => choose(a)}
                  className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-blue-300 transition-all group">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold text-sm shrink-0">{a.initials}</div>
                  <div className="text-left">
                    <div className="font-semibold text-slate-900 dark:text-white text-sm">{a.name}</div>
                    <div className="text-xs text-slate-400">{a.email}</div>
                  </div>
                  <svg className="w-4 h-4 text-slate-400 group-hover:text-blue-600 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
                </button>
              ))}
              <button onClick={() => nav('login')}
                className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 hover:border-blue-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-slate-500 dark:text-slate-400 text-sm">
                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">+</div>
                Use another account
              </button>
            </div>
          </>
        )}

        {phase === 'done' && (
          <>
            <h1 className="font-heading text-xl font-bold text-slate-900 dark:text-white mb-2">Signing you in...</h1>
            <div className="flex justify-center mt-4">
              <div className="w-10 h-10 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin" />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Forgot Password ──────────────────────────────────────────────────────────

function ForgotPasswordPage({ nav, onBackToHome, lang, setLang, onEmail }: {
  nav: (p: AuthPage) => void; onBackToHome: () => void; lang: 'en'|'np'; setLang: (v:'en'|'np')=>void
  onEmail: (email: string) => void
}) {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setLoading(true); setErr('')
    try { await api.auth.requestPasswordReset(email); onEmail(email.trim().toLowerCase()); setSent(true) }
    catch (error) { setErr(error instanceof ApiError ? error.message : 'Unable to send reset code.') }
    finally { setLoading(false) }
  }

  return (
    <div>
      <AuthHeader onBackToHome={onBackToHome} lang={lang} setLang={setLang} />
      <div className="mb-7">
        <button onClick={() => nav('login')} className="flex items-center gap-2 text-slate-400 hover:text-blue-600 transition-colors text-sm font-medium mb-5">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Back to login
        </button>
        <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950 flex items-center justify-center text-3xl mb-5">🔑</div>
        <h1 className="font-heading text-2xl font-extrabold text-slate-900 dark:text-white mb-1.5">Forgot your password?</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">No worries! Enter your registered email and we'll send you a secure reset link.</p>
      </div>

      {sent
        ? (
          <div className="text-center">
            <Alert type="success" msg="Reset code sent! Check your email inbox." />
            <div className="mt-4 p-5 bg-blue-50 dark:bg-blue-950 rounded-2xl border border-blue-100 dark:border-blue-900">
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">We sent a password reset link to</p>
              <p className="font-bold text-slate-900 dark:text-white">{email}</p>
              <p className="text-xs text-slate-400 mt-2">Code expires in 15 minutes</p>
            </div>
            <button onClick={() => nav('reset-password')} className="mt-5 w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors text-sm">
              Enter Reset Code →
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            {err && <Alert type="error" msg={err} />}
            <FInput label="Registered Email Address" type="email" placeholder="you@example.com" value={email} onChange={setEmail} required />
            <PrimaryBtn type="submit" loading={loading}>{loading ? 'Sending link...' : 'Send Reset Link'}</PrimaryBtn>
          </form>
        )
      }

      <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-5">
        Remembered it?{' '}
        <button onClick={() => nav('login')} className="text-blue-600 dark:text-blue-400 font-semibold hover:underline">Sign in</button>
      </p>
      <TrustBadges />
    </div>
  )
}

// ─── Reset Password ───────────────────────────────────────────────────────────

function ResetPasswordPage({ nav, onBackToHome, lang, setLang, email }: {
  nav: (p: AuthPage) => void; onBackToHome: () => void; lang: 'en'|'np'; setLang: (v:'en'|'np')=>void
  email: string
}) {
  const [pw, setPw] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [code, setCode] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pw || !confirm) { setErr('Please fill both fields.'); return }
    if (code.length !== 6) { setErr('Enter the six-digit code from your email.'); return }
    if (pw !== confirm) { setErr("Passwords don't match."); return }
    if (pwStrength(pw) < 2) { setErr('Password is too weak.'); return }
    setErr(''); setLoading(true)
    try { await api.auth.confirmPasswordReset(email, code, pw); nav('login') }
    catch (error) { setErr(error instanceof ApiError ? error.message : 'Unable to reset password.') }
    finally { setLoading(false) }
  }

  return (
    <div>
      <AuthHeader onBackToHome={onBackToHome} lang={lang} setLang={setLang} />
      <div className="mb-7">
        <div className="w-14 h-14 rounded-2xl bg-green-50 dark:bg-green-950 flex items-center justify-center text-3xl mb-5">🔒</div>
        <h1 className="font-heading text-2xl font-extrabold text-slate-900 dark:text-white mb-1.5">Create New Password</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm">Your new password must be different from previous passwords.</p>
      </div>

      {err && <Alert type="error" msg={err} />}

      <form onSubmit={submit} className="space-y-4">
        <div><label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Email reset code</label><OTPBox onComplete={setCode} /></div>
        <PwInput label="New Password" value={pw} onChange={setPw} showStrength />

        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Confirm New Password<span className="text-red-500 ml-0.5">*</span>
          </label>
          <div className="relative">
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="••••••••"
              className={`w-full px-4 py-3 pr-10 rounded-xl border text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 outline-none transition-all ${confirm && pw !== confirm ? 'border-red-400 focus:ring-2 focus:ring-red-100' : confirm && pw === confirm ? 'border-green-400 focus:ring-2 focus:ring-green-100' : 'border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-100 focus:border-blue-500'}`}
            />
            {confirm && pw === confirm && (
              <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
            )}
          </div>
          {confirm && pw !== confirm && <p className="mt-1 text-xs text-red-500">⚠ Passwords don't match</p>}
        </div>

        <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 border border-slate-100 dark:border-slate-800">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Password requirements:</p>
          {[
            ['At least 8 characters', pw.length >= 8],
            ['One uppercase letter', /[A-Z]/.test(pw)],
            ['One number', /[0-9]/.test(pw)],
            ['One special character', /[^A-Za-z0-9]/.test(pw)],
          ].map(([label, met]) => (
            <div key={String(label)} className="flex items-center gap-2 mb-1 last:mb-0">
              <svg className={`w-3.5 h-3.5 ${met ? 'text-green-500' : 'text-slate-300 dark:text-slate-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
              <span className={`text-xs ${met ? 'text-green-600 dark:text-green-400' : 'text-slate-400'}`}>{String(label)}</span>
            </div>
          ))}
        </div>

        <PrimaryBtn type="submit" loading={loading}>{loading ? 'Updating password...' : 'Reset Password'}</PrimaryBtn>
      </form>
      <TrustBadges />
    </div>
  )
}

// ─── Two-Factor Auth ──────────────────────────────────────────────────────────

function TwoFactorPage({ nav, onBackToHome, lang, setLang }: {
  nav: (p: AuthPage) => void; onBackToHome: () => void; lang: 'en'|'np'; setLang: (v:'en'|'np')=>void
}) {
  const [method, setMethod] = useState<'app'|'sms'|null>(null)
  const [phase, setPhase] = useState<'choose'|'verify'>('choose')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const handleOTP = (_code: string) => {
    setDone(true); setLoading(true)
    setTimeout(() => { setLoading(false); nav('success') }, 1500)
  }

  return (
    <div>
      <AuthHeader onBackToHome={onBackToHome} lang={lang} setLang={setLang} />
      <div className="mb-5">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-900 text-amber-700 dark:text-amber-400 text-xs font-semibold mb-4">
          ✨ Optional — Recommended
        </div>
        <h1 className="font-heading text-2xl font-extrabold text-slate-900 dark:text-white mb-1.5">Two-Factor Authentication</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">Add an extra layer of security to protect your account from unauthorized access.</p>
      </div>

      {phase === 'choose' && (
        <div>
          <div className="space-y-3 mb-6">
            {[
              { id: 'app' as const, icon: '📱', title: 'Authenticator App', desc: 'Google Authenticator, Authy, or any TOTP app', rec: true },
              { id: 'sms' as const, icon: '💬', title: 'SMS Verification', desc: 'Receive codes via text message to your phone', rec: false },
            ].map(m => (
              <button key={m.id} onClick={() => setMethod(m.id)}
                className={`w-full flex items-start gap-4 p-4 rounded-2xl border-2 text-left transition-all ${method === m.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300'}`}>
                <span className="text-2xl">{m.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-semibold text-slate-900 dark:text-white text-sm">{m.title}</span>
                    {m.rec && <span className="text-xs px-1.5 py-0.5 rounded-full bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400 font-semibold">Recommended</span>}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{m.desc}</p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 shrink-0 mt-0.5 flex items-center justify-center ${method === m.id ? 'border-blue-600 bg-blue-600' : 'border-slate-300 dark:border-slate-600'}`}>
                  {method === m.id && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
              </button>
            ))}
          </div>

          {method === 'app' && (
            <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 mb-5">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-3">Scan this QR code with your authenticator app</p>
              {/* QR code visual placeholder */}
              <div className="w-32 h-32 mx-auto bg-white border border-slate-200 rounded-xl p-2 mb-3">
                <div className="w-full h-full grid grid-cols-8 gap-px">
                  {Array.from({length:64}).map((_,i)=>(
                    <div key={i} className="rounded-sm" style={{ backgroundColor: [0,1,2,7,8,9,14,15,16,56,57,58,63,62,61].includes(i) || Math.random()>0.55 ? '#1e293b' : 'transparent' }} />
                  ))}
                </div>
              </div>
              <p className="text-xs text-slate-400 text-center">Or enter manually: <span className="font-mono font-bold text-slate-700 dark:text-slate-300">JBSW Y3DP EHPK 3PXP</span></p>
            </div>
          )}

          <PrimaryBtn disabled={!method} onClick={() => setPhase('verify')}>
            {method ? `Set Up ${method === 'app' ? 'Authenticator App' : 'SMS Verification'} →` : 'Choose a Method'}
          </PrimaryBtn>
          <button onClick={() => nav('success')} className="w-full mt-3 py-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-sm font-medium transition-colors">
            Skip for now (not recommended)
          </button>
        </div>
      )}

      {phase === 'verify' && (
        <div className="text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            {method === 'app' ? 'Enter the 6-digit code from your authenticator app' : 'Enter the 6-digit code sent to your phone'}
          </p>
          <div className="mb-6"><OTPBox onComplete={handleOTP} /></div>
          {loading && (
            <div className="flex items-center justify-center gap-2 text-blue-600 dark:text-blue-400 text-sm font-medium mb-4">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
              Verifying...
            </div>
          )}
          {done && !loading && <Alert type="success" msg="2FA enabled successfully!" />}
          <button onClick={() => setPhase('choose')} className="text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors mt-2">
            ← Change method
          </button>
        </div>
      )}
      <TrustBadges />
    </div>
  )
}

// ─── Success ──────────────────────────────────────────────────────────────────

function SuccessPage({ onBackToHome, onLoginSuccess, role }: { onBackToHome: () => void; onLoginSuccess?: (r: 'seeker' | 'employer' | 'employer-individual' | 'admin') => void; role: 'seeker' | 'employer' | 'employer-individual' | 'admin' }) {
  return (
    <div className="text-center">
      <div className="relative w-24 h-24 mx-auto mb-6">
        <div className="absolute inset-0 rounded-full bg-green-100 dark:bg-green-950 animate-ping opacity-30" />
        <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-green-200 dark:shadow-none">
          <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      </div>

      <h1 className="font-heading text-3xl font-extrabold text-slate-900 dark:text-white mb-2">Account Created! 🎉</h1>
      <p className="text-slate-500 dark:text-slate-400 text-sm mb-8 leading-relaxed">
        Welcome to KaamVerse — Nepal's most trusted employment ecosystem.
      </p>

      {/* Trust Score */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-2xl border border-blue-100 dark:border-blue-900 p-5 mb-6 text-left">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Your Trust Score</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-semibold">Level 1 — Basic</span>
        </div>
        <div className="flex items-end gap-3 mb-3">
          <span className="font-heading font-extrabold text-4xl text-blue-600 dark:text-blue-400">45</span>
          <span className="text-slate-400 text-sm pb-1">/ 100</span>
        </div>
        <div className="w-full h-2 bg-blue-100 dark:bg-blue-900 rounded-full mb-2">
          <div className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-1000" style={{ width: '45%' }} />
        </div>
        <p className="text-xs text-slate-400">Complete verification steps to boost your Trust Score</p>
      </div>

      {/* Next Steps */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 mb-6 text-left">
        <h3 className="font-heading font-bold text-slate-900 dark:text-white text-sm mb-4">Boost your profile — Next Steps</h3>
        <div className="space-y-3">
          {[
            { step: 'Verify NID / Passport', points: '+25 pts', icon: '🪪', done: false },
            { step: 'Add professional photo', points: '+10 pts', icon: '📸', done: false },
            { step: 'Add work experience', points: '+10 pts', icon: '💼', done: false },
            { step: 'Email verified', points: '+5 pts', icon: '📧', done: true },
            { step: 'Phone verified', points: '+5 pts', icon: '📱', done: true },
          ].map(s => (
            <div key={s.step} className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${s.done ? 'bg-green-100 dark:bg-green-950' : 'bg-slate-100 dark:bg-slate-800'}`}>
                {s.done ? '✅' : s.icon}
              </div>
              <span className={`flex-1 text-sm ${s.done ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-300'}`}>{s.step}</span>
              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">{s.points}</span>
            </div>
          ))}
        </div>
      </div>

      <button onClick={() => onLoginSuccess ? onLoginSuccess(role) : onBackToHome()}
        className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors text-sm mb-3 shadow-sm">
        Go to Dashboard →
      </button>
      <button onClick={onBackToHome}
        className="w-full py-3 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 text-sm font-medium transition-colors">
        Back to Home
      </button>
    </div>
  )
}

// ─── Auth Flow (main export) ──────────────────────────────────────────────────

export function AuthFlow({ onBackToHome, onLoginSuccess, lang, setLang, initialPage = 'role-select' }: AuthFlowProps) {
  const [page, setPage] = useState<AuthPage>(initialPage)
  const [userEmail, setUserEmail] = useState('you@example.com')
  const [userPhone, setUserPhone] = useState('+977-98XXXXXXXX')
  const [selectedRole, setSelectedRole] = useState<'seeker' | 'employer' | 'employer-individual' | 'admin'>('seeker')
  const [phoneVerificationCode, setPhoneVerificationCode] = useState('')
  const [resetEmail, setResetEmail] = useState('')

  const nav = (p: AuthPage) => {
    setPage(p)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleRegisterDone = async (email: string, phone: string, role?: 'seeker' | 'employer' | 'employer-individual' | 'admin') => {
    if (email) setUserEmail(email)
    if (phone) setUserPhone(phone)
    if (role) setSelectedRole(role)
    try {
      await api.auth.sendEmailVerification()
    } catch { /* The verification page offers an explicit resend with an error message. */ }
    nav('verify-email')
  }

  const common = { nav, onBackToHome, lang, setLang }

  return (
    <div className="flex w-full min-h-screen">
      <LeftPanel page={page} />

      <div className="flex-1 lg:w-7/12 xl:w-3/5 flex items-start justify-center bg-white dark:bg-slate-950 min-h-screen overflow-y-auto">
        <div className="w-full max-w-md p-6 sm:p-10 py-8">
          {page === 'role-select' && <RoleSelectPage {...common} onAdminSelected={() => setSelectedRole('admin')} />}
          {page === 'login' && <LoginPage {...common} onAuthenticated={role => {
            setSelectedRole(role)
            onLoginSuccess?.(role)
          }} />}
          {page === 'register-seeker' && <RegisterSeekerPage {...common} onDone={(e,p) => handleRegisterDone(e, p, 'seeker')} />}
          {page === 'register-employer-individual' && <RegisterEmployerIndividualPage {...common} onDone={(e,p) => handleRegisterDone(e, p, 'employer-individual')} />}
          {page === 'register-employer-company' && <RegisterEmployerCompanyPage {...common} onDone={(e,p) => handleRegisterDone(e, p, 'employer')} />}
          {page === 'verify-email' && <VerifyEmailPage {...common} email={userEmail} />}
          {page === 'verify-otp' && <VerifyOTPPage {...common} phone={userPhone} developmentCode={phoneVerificationCode} />}
          {page === 'google-auth' && <GoogleAuthPage {...common} />}
          {page === 'forgot-password' && <ForgotPasswordPage {...common} onEmail={setResetEmail} />}
          {page === 'reset-password' && <ResetPasswordPage {...common} email={resetEmail} />}
          {page === 'two-factor' && <TwoFactorPage {...common} />}
          {page === 'success' && <SuccessPage onBackToHome={onBackToHome} onLoginSuccess={onLoginSuccess} role={selectedRole} />}
        </div>
      </div>
    </div>
  )
}
