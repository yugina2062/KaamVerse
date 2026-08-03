import { useEffect, useState } from 'react'
import { api, ApiError } from '@/lib/api/client'
import type { ApiNotification } from '@/lib/api/types'
import { PreferenceToggle } from '@/components/ui/ActionDialogs'
import { CoolIcon, type CoolIconName } from '@/components/ui/CoolIcon'

export type ToastKind = 'success' | 'error' | 'warning' | 'info'

export function showToast(kind: ToastKind, title: string, message = '') {
  window.dispatchEvent(new CustomEvent('kaamverse:toast', { detail: { kind, title, message } }))
}

type Toast = { id: number; kind: ToastKind; title: string; message: string }

export function ToastViewport() {
  const [toasts, setToasts] = useState<Toast[]>([])
  useEffect(() => {
    const receive = (event: Event) => {
      const detail = (event as CustomEvent<Omit<Toast, 'id'>>).detail
      const id = Date.now() + Math.random()
      setToasts(current => [...current.slice(-3), { id, kind: detail.kind || 'info', title: detail.title, message: detail.message || '' }])
      window.setTimeout(() => setToasts(current => current.filter(toast => toast.id !== id)), 5000)
    }
    window.addEventListener('kaamverse:toast', receive)
    return () => window.removeEventListener('kaamverse:toast', receive)
  }, [])
  const colors: Record<ToastKind, string> = {
    success: 'border-green-200 bg-green-50 text-green-900 dark:border-green-900 dark:bg-green-950 dark:text-green-100',
    error: 'border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-100',
    warning: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100',
    info: 'border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-100',
  }
  const icons: Record<ToastKind, CoolIconName> = { success: 'check', error: 'error', warning: 'warning', info: 'info' }
  return (
    <div aria-live="polite" className="fixed bottom-5 right-5 z-[100] w-[min(24rem,calc(100vw-2rem))] space-y-3">
      {toasts.map(toast => <div key={toast.id} className={`rounded-2xl border p-4 shadow-xl backdrop-blur ${colors[toast.kind]}`}><div className="flex items-start gap-3"><span className="w-7 h-7 rounded-full bg-current/10 flex items-center justify-center shrink-0"><CoolIcon name={icons[toast.kind]} className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="font-bold text-sm">{toast.title}</p>{toast.message && <p className="text-xs opacity-80 mt-1 leading-relaxed">{toast.message}</p>}</div><button onClick={() => setToasts(current => current.filter(item => item.id !== toast.id))} aria-label="Dismiss message" className="opacity-60 hover:opacity-100"><CoolIcon name="close" className="h-4 w-4" /></button></div></div>)}
    </div>
  )
}

export function NotificationCenter({ enabled }: { enabled: boolean }) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<ApiNotification[]>([])
  const [loading, setLoading] = useState(false)
  const load = async () => {
    if (!enabled) return
    setLoading(true)
    try { setItems((await api.notifications.list()).results) }
    catch (error) { if (open) showToast('error', 'Notifications unavailable', error instanceof ApiError ? error.message : 'Please try again.') }
    finally { setLoading(false) }
  }
  useEffect(() => {
    if (!enabled) { setItems([]); setOpen(false); return }
    void load()
    const timer = window.setInterval(() => void load(), 30000)
    const toggle = () => { setOpen(value => !value); void load() }
    const refresh = () => void load()
    window.addEventListener('kaamverse:notifications-open', toggle)
    window.addEventListener('kaamverse:notifications-refresh', refresh)
    return () => { window.clearInterval(timer); window.removeEventListener('kaamverse:notifications-open', toggle); window.removeEventListener('kaamverse:notifications-refresh', refresh) }
  }, [enabled])
  if (!enabled || !open) return null
  const unread = items.filter(item => !item.is_read).length
  return (
    <><button aria-label="Close notifications" onClick={() => setOpen(false)} className="fixed inset-0 z-[70] bg-black/10" /><section className="fixed right-4 top-20 z-[80] w-[min(25rem,calc(100vw-2rem))] max-h-[70vh] overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl"><div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800"><div><h2 className="font-bold text-slate-900 dark:text-white">Notifications</h2><p className="text-xs text-slate-400">{unread} unread</p></div><button disabled={!unread} onClick={async () => { await api.notifications.markAllRead(); setItems(current => current.map(item => ({ ...item, is_read: true }))) }} className="text-xs font-semibold text-blue-600 disabled:opacity-40">Mark all read</button></div><div className="max-h-[58vh] overflow-y-auto">{loading && !items.length && <p className="p-6 text-sm text-slate-400 text-center">Loading...</p>}{items.map(item => <button key={item.id} onClick={async () => { if (!item.is_read) { await api.notifications.markRead(item.id); setItems(current => current.map(value => value.id === item.id ? { ...value, is_read: true } : value)) } if(item.link) window.location.href = item.link }} className={`w-full text-left p-4 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 ${item.is_read ? '' : 'bg-blue-50/70 dark:bg-blue-950/40'}`}><div className="flex gap-3"><span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${item.is_read ? 'bg-slate-300' : 'bg-blue-600'}`} /><div><p className="text-sm font-semibold text-slate-900 dark:text-white">{item.title}</p><p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{item.message}</p><p className="text-[11px] text-slate-400 mt-2">{new Date(item.created_at).toLocaleString()}</p></div></div></button>)}{!loading && !items.length && <p className="p-8 text-sm text-slate-400 text-center">No notifications yet.</p>}</div></section></>
  )
}

export function EmailPreferences({ compact = false }: { compact?: boolean }) {
  const [values, setValues] = useState({ email_notifications: true, email_job_alerts: true, email_marketing: false })
  useEffect(() => { api.auth.me().then(user => setValues({ email_notifications: user.email_notifications, email_job_alerts: user.email_job_alerts, email_marketing: user.email_marketing })).catch(() => undefined) }, [])
  const rows = [
    { key: 'email_notifications' as const, label: 'Important account and activity emails', description: 'Applications, messages, verification and security updates.' },
    { key: 'email_job_alerts' as const, label: 'Similar job and recommendation emails', description: 'Relevant opportunities based on skills and availability.' },
    { key: 'email_marketing' as const, label: 'Advertisements and marketing emails', description: 'Optional KaamVerse offers, campaigns and product news.' },
  ]
  return <div className="space-y-2">{rows.map(row => <div key={row.key} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 px-4 py-3 flex items-center gap-4"><div className="flex-1"><p className="text-sm font-medium text-slate-700 dark:text-slate-200">{row.label}</p><p className="text-xs text-slate-400 mt-0.5">{row.description}</p></div><PreferenceToggle compact={compact} initial={values[row.key]} label={row.label} onChange={async enabled => { await api.auth.updateMe({ [row.key]: enabled }); setValues(current => ({ ...current, [row.key]: enabled })) }} /></div>)}</div>
}
