import { useEffect, useState } from 'react'
import { useActionDialog } from '@/components/ui/ActionDialogs'
import { api } from '@/lib/api/client'
import type { ApiSecurityOverview } from '@/lib/api/types'
import { CoolIcon, type CoolIconName } from '@/components/ui/CoolIcon'

function SecurityIcon({ kind }: { kind: 'key' | 'shield' | 'device' | 'history' }) {
  const icons: Record<typeof kind, CoolIconName> = { key: 'lock', shield: 'shield', device: 'devices', history: 'history' }
  return <CoolIcon name={icons[kind]} />
}

export function SecurityCenter() {
  const dialog = useActionDialog()
  const [overview, setOverview] = useState<ApiSecurityOverview | null>(null)
  const [panel, setPanel] = useState<'sessions' | 'history' | null>(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try { setOverview(await api.auth.security()) }
    catch (error) { await dialog.alert({ title: 'Security information unavailable', message: error instanceof Error ? error.message : 'Please try again.', variant: 'danger' }) }
    finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [])

  const changePassword = async () => {
    const current = await dialog.prompt({ title: 'Current password', message: 'Enter your current password.', inputType: 'password', confirmLabel: 'Continue' })
    if (!current) return
    const next = await dialog.prompt({ title: 'New password', message: 'Use at least eight characters and do not reuse your current password.', inputType: 'password', confirmLabel: 'Change password' })
    if (!next) return
    try {
      await api.auth.changePassword(current, next)
      await load()
      await dialog.alert({ title: 'Password changed', message: 'Your password was updated and your other sessions were revoked.', variant: 'success' })
    } catch (error) { await dialog.alert({ title: 'Password not changed', message: error instanceof Error ? error.message : 'Please try again.', variant: 'danger' }) }
  }

  const toggleTwoFactor = async () => {
    if (overview?.two_factor_enabled) {
      const password = await dialog.prompt({ title: 'Disable two-factor authentication?', message: 'Enter your password to confirm.', inputType: 'password', confirmLabel: 'Disable 2FA' })
      if (!password) return
      try {
        await api.auth.disableTwoFactor(password)
        await load()
        await dialog.alert({ title: 'Two-factor authentication disabled', message: 'Email verification codes will no longer be required at login.', variant: 'warning' })
      } catch (error) { await dialog.alert({ title: 'Unable to disable 2FA', message: error instanceof Error ? error.message : 'Please try again.', variant: 'danger' }) }
      return
    }
    try {
      await api.auth.sendTwoFactorCode()
      const code = await dialog.prompt({ title: 'Enable two-factor authentication', message: 'Enter the six-digit code sent to your verified email.', placeholder: '123456', confirmLabel: 'Enable 2FA' })
      if (!code) return
      await api.auth.confirmTwoFactor(code.replace(/\D/g, '').slice(0, 6))
      await load()
      await dialog.alert({ title: 'Two-factor authentication enabled', message: 'Future logins require a security code sent to your email.', variant: 'success' })
    } catch (error) { await dialog.alert({ title: 'Unable to enable 2FA', message: error instanceof Error ? error.message : 'Please try again.', variant: 'danger' }) }
  }

  const revoke = async (id: string) => {
    if (!await dialog.confirm({ title: 'Revoke this session?', message: 'This device will be signed out immediately.', confirmLabel: 'Revoke session', variant: 'danger' })) return
    try { await api.auth.revokeSession(id); await load() }
    catch (error) { await dialog.alert({ title: 'Session not revoked', message: error instanceof Error ? error.message : 'Please try again.', variant: 'danger' }) }
  }

  const clearHistory = async () => {
    if (!await dialog.confirm({ title: 'Delete login history?', message: 'This permanently removes your stored login records.', confirmLabel: 'Delete history', variant: 'danger' })) return
    try { await api.auth.clearLoginHistory(); await load() }
    catch (error) { await dialog.alert({ title: 'History not deleted', message: error instanceof Error ? error.message : 'Please try again.', variant: 'danger' }) }
  }

  const items = [
    { title: 'Change Password', description: 'Update your account password securely', icon: 'key' as const, label: 'Manage', action: changePassword },
    { title: 'Two-Factor Authentication', description: overview?.two_factor_enabled ? 'Email security code is required at login' : 'Add an extra verification step to every login', icon: 'shield' as const, label: overview?.two_factor_enabled ? 'Disable' : 'Enable', action: toggleTwoFactor },
    { title: 'Active Sessions', description: `${overview?.sessions.length ?? 0} active browser or device session${overview?.sessions.length === 1 ? '' : 's'}`, icon: 'device' as const, label: 'Manage', action: async () => setPanel('sessions') },
    { title: 'Login History', description: `${overview?.login_history.length ?? 0} recent login record${overview?.login_history.length === 1 ? '' : 's'}`, icon: 'history' as const, label: 'View', action: async () => setPanel('history') },
  ]

  return <div className="space-y-4">
    {items.map(item => <div key={item.title} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex min-w-0 items-center gap-4"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-300"><SecurityIcon kind={item.icon}/></span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-slate-900 dark:text-white">{item.title}</h3>{item.icon === 'shield' && <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${overview?.two_factor_enabled ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>{overview?.two_factor_enabled ? 'Enabled' : 'Disabled'}</span>}</div><p className="truncate text-sm text-slate-400">{loading ? 'Loading security information…' : item.description}</p></div></div>
      <button disabled={loading} onClick={() => void item.action()} className={`rounded-xl border px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50 ${item.label === 'Disable' ? 'border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950' : 'border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600 dark:border-slate-700 dark:text-slate-300'}`}>{item.label}</button>
    </div>)}

    {panel === 'sessions' && <div className="rounded-2xl border border-blue-200 bg-white p-5 dark:border-blue-900 dark:bg-slate-900"><div className="mb-4 flex items-center justify-between"><div><h3 className="font-bold text-slate-900 dark:text-white">Active Sessions</h3><p className="text-xs text-slate-400">Revoke devices you do not recognize.</p></div><button onClick={() => setPanel(null)} className="h-8 w-8 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Close">×</button></div><div className="space-y-3">{overview?.sessions.map(session => <div key={session.id} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800"><SecurityIcon kind="device"/><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{session.user_agent || 'Unknown browser'}</p><p className="text-xs text-slate-400">{session.ip_address || 'Local network'} · Last active {new Date(session.last_seen_at).toLocaleString()}</p></div>{session.current ? <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">Current</span> : <button onClick={() => void revoke(session.id)} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50">Revoke</button>}</div>)}{!overview?.sessions.length && <p className="py-4 text-center text-sm text-slate-400">No active sessions.</p>}</div></div>}

    {panel === 'history' && <div className="rounded-2xl border border-blue-200 bg-white p-5 dark:border-blue-900 dark:bg-slate-900"><div className="mb-4 flex items-center justify-between gap-3"><div><h3 className="font-bold text-slate-900 dark:text-white">Login History</h3><p className="text-xs text-slate-400">Recent access to this account.</p></div><div className="flex gap-2"><button disabled={!overview?.login_history.length} onClick={() => void clearHistory()} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-600 disabled:opacity-40">Delete history</button><button onClick={() => setPanel(null)} className="h-8 w-8 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Close">×</button></div></div><div className="space-y-3">{overview?.login_history.map(activity => <div key={activity.id} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800"><span className={`h-2.5 w-2.5 shrink-0 rounded-full ${activity.successful ? 'bg-emerald-500' : 'bg-red-500'}`}/><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{activity.user_agent || 'Unknown browser'}</p><p className="text-xs text-slate-400">{activity.ip_address || 'Local network'} · {new Date(activity.created_at).toLocaleString()}</p></div><span className={`text-xs font-bold ${activity.successful ? 'text-emerald-600' : 'text-red-600'}`}>{activity.successful ? 'Successful' : 'Failed'}</span></div>)}{!overview?.login_history.length && <p className="py-4 text-center text-sm text-slate-400">No login history stored.</p>}</div></div>}
  </div>
}
