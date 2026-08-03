import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react'
import type { Page } from '@/features/marketing/MarketingExperience'
import { api } from '@/lib/api/client'
import type { UserRole } from '@/lib/api/types'
import { ActionDialogBoundary, ActionDialogProvider, useActionDialog } from '@/components/ui/ActionDialogs'
import { LocalizedContent, type AppLanguage } from '@/lib/i18n/LocalizedContent'
import { NotificationCenter, ToastViewport } from '@/components/ui/SystemFeedback'

const LANGUAGE_KEY = 'kaamverse.language'
const AuthFlow = lazy(() => import('@/features/auth/AuthFlow').then(module => ({ default: module.AuthFlow })))
const AdminDashboard = lazy(() => import('@/features/dashboards/admin/AdminDashboard').then(module => ({ default: module.AdminDashboard })))
const EmployerDashboard = lazy(() => import('@/features/dashboards/company-employer/EmployerDashboard').then(module => ({ default: module.EmployerDashboard })))
const IndividualEmployerDashboard = lazy(() => import('@/features/dashboards/individual-employer/IndividualEmployerDashboard').then(module => ({ default: module.IndividualEmployerDashboard })))
const JobSeekerDashboard = lazy(() => import('@/features/dashboards/job-seeker/JobSeekerDashboard').then(module => ({ default: module.JobSeekerDashboard })))
const MarketingExperience = lazy(() => import('@/features/marketing/MarketingExperience').then(module => ({ default: module.MarketingExperience })))

function LoadingScreen() {
  return <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-sm font-semibold text-slate-500">Loading KaamVerse…</div>
}

function AppContent() {
  const dialog = useActionDialog()
  const [page, setPage] = useState<Page>(() => {
    const requested = new URLSearchParams(window.location.search).get('page')
    const publicPages: Page[] = ['home', 'about', 'features', 'ai-features', 'trust-safety', 'employment-types', 'services-marketplace', 'companies', 'company-details', 'jobs', 'job-details', 'listing-details', 'freelance', 'gigs', 'services', 'testimonials', 'faq', 'contact', 'privacy', 'terms', 'help']
    return requested && publicPages.includes(requested as Page) ? requested as Page : 'home'
  })
  const [dark, setDark] = useState(false)
  const [lang, setLangState] = useState<AppLanguage>(() => {
    const requested = new URLSearchParams(window.location.search).get('lang')
    if (requested === 'np' || requested === 'en') return requested
    return localStorage.getItem(LANGUAGE_KEY) === 'np' ? 'np' : 'en'
  })
  const [authInitial, setAuthInitial] = useState<'login' | 'role-select'>('role-select')
  const [isAuth, setIsAuth] = useState(false)
  const [userRole, setUserRole] = useState<UserRole | null>(null)

  const applyLanguage = (language: AppLanguage) => {
    setLangState(language)
    localStorage.setItem(LANGUAGE_KEY, language)
    document.documentElement.lang = language === 'np' ? 'ne' : 'en'
  }

  const changeLanguage = (language: AppLanguage) => {
    applyLanguage(language)
    if (isAuth) void api.auth.updateMe({ preferred_language: language }).catch(() => undefined)
  }

  useEffect(() => {
    document.documentElement.lang = lang === 'np' ? 'ne' : 'en'
  }, [lang])

  useEffect(() => {
    if (!api.auth.hasSession()) return
    api.auth.me()
      .then(user => {
        setIsAuth(true)
        setUserRole(user.role)
        applyLanguage(user.preferred_language)
        setPage(current => current === 'home' ? 'dashboard' : current)
      })
      .catch(() => api.auth.logout())
  }, [])

  const navigate = (nextPage: Page) => {
    if (nextPage !== 'job-details' && nextPage !== 'listing-details') {
      const url = new URL(window.location.href)
      url.searchParams.delete('page')
      url.searchParams.delete('job')
      window.history.replaceState({}, '', `${url.pathname}${url.search}`)
    }
    setPage(nextPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const openLogin = () => { setAuthInitial('login'); navigate('auth') }
  const openRegister = () => { setAuthInitial('role-select'); navigate('auth') }

  const handleLoginSuccess = (role: UserRole) => {
    setIsAuth(true)
    setUserRole(role)
    navigate('dashboard')
    void api.auth.updateMe({ preferred_language: lang }).catch(() => undefined)
  }

  const handleLogout = async () => {
    const accepted = await dialog.confirm({
      title: 'Log out of KaamVerse?',
      message: 'Your current session will end. You can sign in again at any time.',
      confirmLabel: 'Log out',
      variant: 'warning',
    })
    if (!accepted) return
    api.auth.logout()
    setIsAuth(false)
    setUserRole(null)
    navigate('home')
  }

  let authenticatedWorkspace: ReactNode | null = null
  if (isAuth && userRole === 'seeker') authenticatedWorkspace = <JobSeekerDashboard onLogout={handleLogout} />
  if (isAuth && userRole === 'employer-individual') authenticatedWorkspace = <IndividualEmployerDashboard onLogout={handleLogout} lang={lang} setLang={changeLanguage} />
  if (isAuth && userRole === 'employer') authenticatedWorkspace = <EmployerDashboard onLogout={handleLogout} />
  if (isAuth && userRole === 'admin') authenticatedWorkspace = <AdminDashboard onLogout={handleLogout} />

  return (
    <div className={dark ? 'dark' : ''}>
      <LocalizedContent language={lang}>
        <Suspense fallback={<LoadingScreen />}>
        {page === 'auth' ? (
          <AuthFlow
            onBackToHome={() => navigate('home')}
            onLoginSuccess={handleLoginSuccess}
            dark={dark}
            lang={lang}
            setLang={changeLanguage}
            initialPage={authInitial}
          />
        ) : (
          <MarketingExperience
            page={page}
            navigate={navigate}
            dark={dark}
            setDark={setDark}
            lang={lang}
            setLang={changeLanguage}
            onLogin={openLogin}
            onRegister={openRegister}
            isAuth={isAuth}
            userRole={userRole}
            onLogout={handleLogout}
            authenticatedWorkspace={authenticatedWorkspace}
          />
        )}
        </Suspense>
      </LocalizedContent>
      <NotificationCenter enabled={isAuth} />
      <ToastViewport />
    </div>
  )
}

export default function App() {
  return (
    <ActionDialogProvider>
      <ActionDialogBoundary>
        <AppContent />
      </ActionDialogBoundary>
    </ActionDialogProvider>
  )
}
