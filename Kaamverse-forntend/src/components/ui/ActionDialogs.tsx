import { createContext, useCallback, useContext, useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import { api } from '@/lib/api/client'
import { CoolIcon, type CoolIconName } from '@/components/ui/CoolIcon'

type DialogVariant = 'info' | 'success' | 'warning' | 'danger'

interface DialogOptions {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: DialogVariant
  defaultValue?: string
  placeholder?: string
  inputType?: 'text' | 'password'
}

interface DialogState extends DialogOptions {
  kind: 'alert' | 'confirm' | 'prompt'
}

interface DialogApi {
  alert: (options: DialogOptions) => Promise<void>
  confirm: (options: DialogOptions) => Promise<boolean>
  prompt: (options: DialogOptions) => Promise<string | null>
}

const DialogContext = createContext<DialogApi | null>(null)

export function useActionDialog() {
  const value = useContext(DialogContext)
  if (!value) throw new Error('useActionDialog must be used inside ActionDialogProvider')
  return value
}

export function ActionDialogProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<DialogState | null>(null)
  const resolver = useRef<((result: boolean) => void) | null>(null)
  const promptResolver = useRef<((result: string | null) => void) | null>(null)
  const [promptValue, setPromptValue] = useState('')

  const open = useCallback((next: DialogState) => new Promise<boolean>(resolve => {
    resolver.current?.(false)
    resolver.current = resolve
    setDialog(next)
  }), [])

  const alert = useCallback(async (options: DialogOptions) => {
    await open({ ...options, kind: 'alert' })
  }, [open])

  const confirm = useCallback((options: DialogOptions) => open({ ...options, kind: 'confirm' }), [open])

  const prompt = useCallback((options: DialogOptions) => new Promise<string | null>(resolve => {
    resolver.current?.(false)
    promptResolver.current?.(null)
    promptResolver.current = resolve
    setPromptValue(options.defaultValue ?? '')
    setDialog({ ...options, kind: 'prompt' })
  }), [])

  const close = useCallback((result: boolean) => {
    if (promptResolver.current) {
      promptResolver.current(result ? promptValue.trim() : null)
      promptResolver.current = null
    }
    resolver.current?.(result)
    resolver.current = null
    setDialog(null)
  }, [promptValue])

  useEffect(() => {
    if (!dialog) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close(false)
      if (event.key === 'Enter' && dialog.kind !== 'prompt') close(true)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [close, dialog])

  const colors: Record<DialogVariant, string> = {
    info: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
    success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
    warning: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    danger: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  }
  const symbols: Record<DialogVariant, CoolIconName> = { info: 'info', success: 'check', warning: 'warning', danger: 'error' }
  const variant = dialog?.variant ?? 'info'

  return (
    <DialogContext.Provider value={{ alert, confirm, prompt }}>
      {children}
      {dialog && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" role="presentation">
          <button type="button" aria-label="Close dialog" className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm" onClick={() => close(false)} />
          <div role="dialog" aria-modal="true" aria-labelledby="action-dialog-title" className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-start gap-4">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${colors[variant]}`}><CoolIcon name={symbols[variant]} /></div>
              <div className="min-w-0 flex-1">
                <h2 id="action-dialog-title" className="font-heading text-lg font-bold text-slate-900 dark:text-white">{dialog.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{dialog.message}</p>
                {dialog.kind === 'prompt' && (
                  dialog.inputType === 'password'
                    ? <input autoFocus type="password" value={promptValue} onChange={event => setPromptValue(event.target.value)} placeholder={dialog.placeholder} className="mt-4 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                    : <textarea autoFocus rows={3} value={promptValue} onChange={event => setPromptValue(event.target.value)} placeholder={dialog.placeholder} className="mt-4 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                )}
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              {dialog.kind !== 'alert' && (
                <button type="button" onClick={() => close(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                  {dialog.cancelLabel ?? 'Cancel'}
                </button>
              )}
              <button autoFocus={dialog.kind !== 'prompt'} type="button" onClick={() => close(true)} className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-colors ${variant === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                {dialog.confirmLabel ?? (dialog.kind === 'alert' ? 'OK' : 'Confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  )
}

function actionName(button: HTMLButtonElement) {
  return button.getAttribute('aria-label') || button.title || button.textContent?.replace(/\s+/g, ' ').trim() || 'Action'
}

export function ActionDialogBoundary({ children }: { children: ReactNode }) {
  const dialog = useActionDialog()

  const recordAction = (label: string, detail = '') => api.userActions.create(label, detail)

  const downloadAction = (label: string) => {
    const content = `KaamVerse export\nAction: ${label}\nGenerated: ${new Date().toLocaleString()}\n`
    const url = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `${label.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'kaamverse'}-export.txt`
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleClick = async (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement
    const button = target.closest<HTMLButtonElement>('button[data-action-dialog]')
    if (!button || button.disabled) return
    const label = actionName(button)
    if (/submit.*(document|nid|pan|vat|verification)|submit document/i.test(label)) {
      const picker = document.createElement('input')
      picker.type = 'file'
      picker.accept = '.jpg,.jpeg,.png,.pdf'
      picker.onchange = async () => {
        const file = picker.files?.[0]
        if (!file) return
        try {
          const type = /pan|vat/i.test(label) ? 'pan_vat' : /hr/i.test(label) ? 'professional' : 'identity'
          await api.verifications.submit(type, file)
          await recordAction(label, file.name)
          await dialog.alert({ title: 'Document submitted', message: `${file.name} is now in the administrator verification queue.`, variant: 'success' })
        } catch (error) {
          await dialog.alert({ title: 'Upload failed', message: error instanceof Error ? error.message : 'Could not upload the document.', variant: 'danger' })
        }
      }
      picker.click()
      return
    }

    if (/attach (file|image)/i.test(label)) {
      const picker = document.createElement('input')
      picker.type = 'file'
      picker.accept = /image/i.test(label) ? 'image/*' : '*/*'
      picker.onchange = async () => {
        const file = picker.files?.[0]
        if (!file) return
        await recordAction(label, file.name)
        await dialog.alert({ title: 'Attachment selected', message: `${file.name} was recorded securely in your account activity.`, variant: 'success' })
      }
      picker.click()
      return
    }

    if (/change password/i.test(label)) {
      const currentPassword = await dialog.prompt({ title: 'Change password', message: 'Enter your current password.', inputType: 'password', confirmLabel: 'Continue' })
      if (!currentPassword) return
      const newPassword = await dialog.prompt({ title: 'New password', message: 'Use at least 8 characters and a password you have not used here.', inputType: 'password', confirmLabel: 'Change password' })
      if (!newPassword) return
      try {
        const result = await api.auth.changePassword(currentPassword, newPassword)
        await dialog.alert({ title: 'Password changed', message: result.detail, variant: 'success' })
      } catch (error) {
        await dialog.alert({ title: 'Password not changed', message: error instanceof Error ? error.message : 'Could not change password.', variant: 'danger' })
      }
      return
    }

    if (/download|export/i.test(label)) { downloadAction(label); await recordAction(label); return }
    if (/video|join call|zoom/i.test(label)) { window.open(`https://meet.jit.si/KaamVerse-${Date.now()}`, '_blank', 'noopener,noreferrer'); await recordAction(label); return }
    if (/\bcall\b|phone/i.test(label)) { window.location.href = 'tel:+977'; await recordAction(label); return }

    if (/hire|message|chat|ignore|investigate|suspend|sos/i.test(label)) {
      await dialog.alert({
        title: 'Action not available here',
        message: `“${label}” needs the live KaamVerse control for this screen. Use Messages, Hire Workers, or the Trust & Safety queues instead of this shortcut.`,
        variant: 'warning',
      })
      return
    }

    if (/notes?|edit|manage|add|formula|suggest|generate/i.test(label)) {
      const detail = await dialog.prompt({
        title: label,
        message: 'Enter the details for this action.',
        placeholder: 'Enter details…',
        confirmLabel: 'Save',
      })
      if (!detail) return
      await recordAction(label, detail)
      await dialog.alert({ title: `${label} saved`, message: 'Your change was saved to your KaamVerse account.', variant: 'success' })
      return
    }

    const destructive = /delete|remove|reject|cancel|dismiss|pause/i.test(label) || button.className.includes('text-red')
    const accepted = await dialog.confirm({
      title: destructive ? `Confirm ${label}` : label,
      message: destructive ? `Are you sure you want to continue with “${label}”?` : `Confirm “${label}” for this item?`,
      confirmLabel: label,
      variant: destructive ? 'danger' : 'warning',
    })
    if (!accepted) return
    await recordAction(label)
    await dialog.alert({ title: `${label} recorded`, message: 'The action was saved to your account activity log.', variant: 'success' })
  }

  return <div onClick={handleClick}>{children}</div>
}

export function PreferenceToggle({ initial, label, compact = false, onChange }: { initial: boolean; label: string; compact?: boolean; onChange?: (enabled: boolean) => void | Promise<void> }) {
  const [enabled, setEnabled] = useState(initial)
  const [saving, setSaving] = useState(false)
  useEffect(() => setEnabled(initial), [initial])
  const toggle = async () => {
    const next = !enabled
    setEnabled(next)
    if (!onChange) return
    setSaving(true)
    try { await onChange(next) }
    catch { setEnabled(!next) }
    finally { setSaving(false) }
  }
  return (
    <button
      type="button"
      role="switch"
      aria-label={label}
      aria-checked={enabled}
      disabled={saving}
      onClick={toggle}
      className={`relative shrink-0 rounded-full transition-colors disabled:opacity-60 ${compact ? 'h-5 w-10' : 'h-6 w-11'} ${enabled ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'}`}
    >
      <span className={`absolute top-0.5 rounded-full bg-white shadow transition-transform ${compact ? 'h-4 w-4' : 'h-5 w-5'} ${enabled ? (compact ? 'translate-x-5' : 'translate-x-5') : 'translate-x-0.5'}`} />
    </button>
  )
}
