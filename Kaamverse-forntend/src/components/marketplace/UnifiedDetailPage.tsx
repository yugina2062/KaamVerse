import { useState, type ReactNode } from 'react'
import { showToast } from '@/components/ui/SystemFeedback'
import { CoolIcon, type CoolIconName } from '@/components/ui/CoolIcon'

export interface DetailFact {
  label: string
  value: string
  icon?: string
}

export interface DetailSection {
  title: string
  items: string[]
  check?: boolean
  columns?: boolean
}

function factIcon(label: string): CoolIconName {
  const value = label.toLowerCase()
  if (value.includes('location')) return 'location'
  if (value.includes('schedule') || value.includes('shift') || value.includes('delivery')) return 'clock'
  if (value.includes('applicant') || value.includes('review') || value.includes('position')) return 'users'
  if (value.includes('company') || value.includes('employer')) return 'building'
  if (value.includes('rating')) return 'star'
  if (value.includes('trust') || value.includes('verified')) return 'shield'
  if (value.includes('salary') || value.includes('price') || value.includes('payment')) return 'analytics'
  return 'info'
}

interface UnifiedDetailPageProps {
  backLabel: string
  onBack: () => void
  icon: ReactNode
  title: string
  subtitle: string
  verifiedLabel?: string
  score: number
  scoreTitle?: string
  scoreMessage: string
  facts: DetailFact[]
  tags: string[]
  descriptionTitle: string
  description: string
  sections: DetailSection[]
  primaryValue: string
  primaryMeta: string
  primaryLabel: string
  onPrimary: () => void
  onMessage?: () => void
  onReport?: () => void
  profileTitle?: string
  profileBody?: string
  reviewsSummary?: string
  initialSaved?: boolean
  onSave?: () => void | Promise<void>
  saveIcon?: 'star' | 'heart'
  detailsTabLabel?: string
}

export function UnifiedDetailPage({
  backLabel,
  onBack,
  icon,
  title,
  subtitle,
  verifiedLabel = 'Verified',
  score,
  scoreTitle = 'AI Match Score',
  scoreMessage,
  facts,
  tags,
  descriptionTitle,
  description,
  sections,
  primaryValue,
  primaryMeta,
  primaryLabel,
  onPrimary,
  onMessage,
  onReport,
  profileTitle = 'Profile',
  profileBody = 'This verified profile is active on KaamVerse.',
  reviewsSummary = 'No verified reviews have been published yet.',
  initialSaved = false,
  onSave,
  saveIcon = 'star',
  detailsTabLabel = 'Details',
}: UnifiedDetailPageProps) {
  const [tab, setTab] = useState<'details' | 'profile' | 'reviews'>('details')
  const [saved, setSaved] = useState(initialSaved)

  const toggleSaved = async () => {
    try {
      await onSave?.()
      setSaved(value => !value)
      showToast('success', saved ? 'Removed from saved items' : 'Saved successfully')
    } catch (error) {
      showToast('error', 'Unable to update saved item', error instanceof Error ? error.message : 'Please try again.')
    }
  }

  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title, text: subtitle, url: window.location.href })
      else await navigator.clipboard.writeText(window.location.href)
      showToast('success', 'Link ready', 'The detail-page link was shared or copied.')
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      showToast('error', 'Unable to share', 'Copy the address from your browser instead.')
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 dark:bg-slate-950">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <button onClick={onBack} className="mb-6 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600 transition-colors"><CoolIcon name="arrow-left" className="h-4 w-4" />{backLabel}</button>
        <div className="grid lg:grid-cols-[1fr_300px] gap-5 items-start">
          <div className="space-y-4 min-w-0">
            <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
              <div className="flex flex-wrap items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white flex items-center justify-center font-heading font-extrabold text-lg shrink-0">{icon}</div>
                <div className="min-w-0 flex-1">
                  <h1 className="font-heading text-2xl font-extrabold text-slate-950 dark:text-white leading-tight">{title}</h1>
                  <p className="flex flex-wrap items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 mt-1"><span>{subtitle}</span><span className="inline-flex items-center gap-1 text-emerald-600 font-semibold"><CoolIcon name="shield" className="h-4 w-4" />{verifiedLabel}</span></p>
                </div>
                <div className="flex gap-2"><button onClick={() => void toggleSaved()} aria-label={saved ? 'Remove saved item' : 'Save item'} className={`w-10 h-10 rounded-xl border flex items-center justify-center ${saved ? 'border-rose-300 bg-rose-50 text-rose-600' : 'border-slate-200 dark:border-slate-700 text-slate-400'}`}><CoolIcon name={saveIcon === 'heart' ? 'heart' : 'star'} /></button><button onClick={() => void share()} aria-label="Share details" className="w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-400 flex items-center justify-center"><CoolIcon name="share" /></button></div>
              </div>
              <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3 mt-6">
                {facts.slice(0, 4).map(fact => <div key={fact.label} className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3"><p className="flex items-center gap-1.5 text-xs text-slate-400"><CoolIcon name={factIcon(fact.label)} className="h-4 w-4" />{fact.label}</p><p className="text-sm font-bold text-slate-900 dark:text-white mt-1 break-words">{fact.value}</p></div>)}
              </div>
              <div className="flex flex-wrap gap-2 mt-4">{tags.map(tag => <span key={tag} className="px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs font-semibold">{tag}</span>)}</div>
            </section>

            <section className="rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 p-5 text-white flex items-center gap-5">
              <div className="w-16 h-16 rounded-full border-4 border-white/30 flex items-center justify-center text-xl font-extrabold shrink-0">{Math.round(score)}%</div>
              <div><h2 className="flex items-center gap-2 font-heading font-bold text-lg"><CoolIcon name="lightbulb" />{scoreTitle}</h2><p className="text-sm text-blue-50 mt-1 leading-relaxed">{scoreMessage}</p></div>
            </section>

            <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="grid grid-cols-3 border-b border-slate-200 dark:border-slate-800">
                {([['details', detailsTabLabel], ['profile', profileTitle], ['reviews', 'Reviews']] as const).map(([id, label]) => <button key={id} onClick={() => setTab(id)} className={`py-4 text-sm font-bold border-b-2 transition-colors ${tab === id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'}`}>{label}</button>)}
              </div>
              <div className="p-6 text-sm text-slate-600 dark:text-slate-300 leading-7 space-y-6">
                {tab === 'details' && <><div><h2 className="font-heading font-bold text-slate-950 dark:text-white mb-2">{descriptionTitle}</h2><p>{description}</p></div>{sections.map(section => <div key={section.title}><h2 className="font-heading font-bold text-slate-950 dark:text-white mb-2">{section.title}</h2><ul className={section.columns ? 'grid sm:grid-cols-2 gap-x-6' : ''}>{section.items.map(item => <li key={item} className="flex gap-2"><CoolIcon name={section.check ? 'check' : 'arrow-right'} className={`mt-1.5 h-4 w-4 shrink-0 ${section.check ? 'text-emerald-500' : 'text-blue-500'}`} /><span>{item}</span></li>)}</ul></div>)}</>}
                {tab === 'profile' && <div><h2 className="font-heading font-bold text-slate-950 dark:text-white mb-2">{profileTitle}</h2><p>{profileBody}</p><div className="grid sm:grid-cols-2 gap-3 mt-5">{facts.map(fact => <div key={fact.label} className="rounded-xl bg-slate-50 dark:bg-slate-800 p-4"><p className="text-xs text-slate-400">{fact.label}</p><p className="font-bold text-slate-900 dark:text-white mt-1">{fact.value}</p></div>)}</div></div>}
                {tab === 'reviews' && <div><h2 className="font-heading font-bold text-slate-950 dark:text-white mb-2">Verified reviews</h2><p>{reviewsSummary}</p></div>}
              </div>
            </section>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-24">
            <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 text-center">
              <p className="font-heading text-2xl font-extrabold text-emerald-600">{primaryValue}</p><p className="text-xs text-slate-400 mt-1">{primaryMeta}</p>
              <button onClick={onPrimary} className="w-full mt-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-lg shadow-blue-200 dark:shadow-none">{primaryLabel}</button>
              <div className="grid grid-cols-2 gap-2 mt-3"><button onClick={() => void toggleSaved()} className="inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold"><CoolIcon name={saveIcon === 'heart' ? 'heart' : 'star'} className="h-4 w-4" />{saved ? 'Saved' : 'Save'}</button><button onClick={() => void share()} className="inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold"><CoolIcon name="share" className="h-4 w-4" />Share</button></div>
            </section>
            <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5"><h3 className="font-heading font-bold text-sm">Have questions?</h3><button onClick={onMessage ?? onPrimary} className="w-full mt-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-blue-600 text-xs font-bold inline-flex items-center justify-center gap-2"><CoolIcon name="chat" className="h-4 w-4" />Send Message</button><p className="text-center text-xs text-slate-400 mt-2">Sign in to start a verified conversation</p></section>
            <button onClick={onReport ?? onPrimary} className="w-full text-xs text-slate-400 hover:text-red-500 inline-flex items-center justify-center gap-1.5"><CoolIcon name="flag" className="h-4 w-4" />Report this listing</button>
          </aside>
        </div>
      </main>
    </div>
  )
}
