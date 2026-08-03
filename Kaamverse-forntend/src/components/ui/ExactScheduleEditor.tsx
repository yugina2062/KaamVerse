export const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const

export type ExactSchedule = Record<string, string>

const PRESET_RANGES: Record<string, string> = {
  morning: '06:00-12:00',
  afternoon: '12:00-18:00',
  day: '09:00-17:00',
  evening: '18:00-22:00',
  night: '22:00-23:59',
  all: '00:00-23:59',
  flexible: '00:00-23:59',
}

export function normaliseTimeRange(value: unknown): string {
  if (typeof value !== 'string') return ''
  const cleaned = value.trim().toLowerCase()
  if (PRESET_RANGES[cleaned]) return PRESET_RANGES[cleaned]
  const match = cleaned.match(/^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/)
  if (!match) return ''
  const startHour = Math.min(23, Number(match[1])).toString().padStart(2, '0')
  const endHour = Math.min(23, Number(match[3])).toString().padStart(2, '0')
  return `${startHour}:${match[2]}-${endHour}:${match[4]}`
}

export function rangeParts(value: unknown): [number, number] | null {
  const range = normaliseTimeRange(value)
  if (!range) return null
  const [start, end] = range.split('-').map(time => {
    const [hours, minutes] = time.split(':').map(Number)
    return hours * 60 + minutes
  })
  return start < end ? [start, end] : null
}

export function scheduleHasTimes(schedule: ExactSchedule | undefined): boolean {
  return WEEK_DAYS.some(day => Boolean(rangeParts(schedule?.[day])))
}

/** Returns true when at least one required day fits completely inside the available hours. */
export function scheduleCovers(available: ExactSchedule | undefined, required: ExactSchedule | undefined): boolean {
  if (!scheduleHasTimes(required)) return true
  if (!scheduleHasTimes(available)) return false
  return WEEK_DAYS.some(day => {
    const availableRange = rangeParts(available?.[day])
    const requiredRange = rangeParts(required?.[day])
    return Boolean(availableRange && requiredRange && availableRange[0] <= requiredRange[0] && availableRange[1] >= requiredRange[1])
  })
}

export function scheduleOverlaps(first: ExactSchedule | undefined, second: ExactSchedule | undefined): boolean {
  if (!scheduleHasTimes(first) || !scheduleHasTimes(second)) return true
  return WEEK_DAYS.some(day => {
    const a = rangeParts(first?.[day])
    const b = rangeParts(second?.[day])
    return Boolean(a && b && a[0] < b[1] && b[0] < a[1])
  })
}

export function formatClock(value: string): string {
  const [hourText, minute] = value.split(':')
  const hour = Number(hourText)
  if (Number.isNaN(hour)) return value
  return `${hour % 12 || 12}:${minute} ${hour >= 12 ? 'PM' : 'AM'}`
}

export function formatTimeRange(value: unknown): string {
  const range = normaliseTimeRange(value)
  if (!range) return 'Unavailable'
  const [start, end] = range.split('-')
  return `${formatClock(start)} – ${formatClock(end)}`
}

export function scheduleSummary(schedule: ExactSchedule | undefined): string {
  const entries = WEEK_DAYS.flatMap(day => {
    const range = normaliseTimeRange(schedule?.[day])
    return range ? [`${day.slice(0, 3)} ${formatTimeRange(range)}`] : []
  })
  if (!entries.length) return 'Flexible schedule'
  return entries.length > 2 ? `${entries.slice(0, 2).join(', ')} +${entries.length - 2} days` : entries.join(', ')
}

export function singleRangeSchedule(start: string, end: string): ExactSchedule {
  if (!start || !end || start >= end) return {}
  return Object.fromEntries(WEEK_DAYS.map(day => [day, `${start}-${end}`]))
}

export function ExactScheduleEditor({ value, onChange, compact = false, title = 'Exact weekly time' }: {
  value: ExactSchedule
  onChange: (schedule: ExactSchedule) => void
  compact?: boolean
  title?: string
}) {
  const updateDay = (day: string, next: string) => {
    const schedule = { ...value }
    if (next) schedule[day] = next
    else delete schedule[day]
    onChange(schedule)
  }

  return (
    <div>
      {title && <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wide">{title}</p>}
      <div className={compact ? 'space-y-2' : 'space-y-3'}>
        {WEEK_DAYS.map(day => {
          const normalised = normaliseTimeRange(value[day])
          const [start = '09:00', end = '17:00'] = normalised ? normalised.split('-') : []
          return (
            <div key={day} className={`grid items-center gap-2 ${compact ? 'grid-cols-[2.5rem_1fr]' : 'grid-cols-[6rem_1fr]'}`}>
              <label className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(normalised)}
                  onChange={event => updateDay(day, event.target.checked ? '09:00-17:00' : '')}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>{compact ? day.slice(0, 3) : day}</span>
              </label>
              {normalised ? (
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1">
                  <input aria-label={`${day} from`} type="time" value={start} onChange={event => updateDay(day, `${event.target.value}-${end}`)} className="min-w-0 w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 outline-none focus:border-blue-400" />
                  <span className="text-[10px] text-slate-400">to</span>
                  <input aria-label={`${day} to`} type="time" value={end} onChange={event => updateDay(day, `${start}-${event.target.value}`)} className="min-w-0 w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 outline-none focus:border-blue-400" />
                </div>
              ) : <span className="text-xs text-slate-400 px-2">Unavailable</span>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
