import { parseDate, toISODate } from './csv'

export const PRESETS = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'this_week', label: 'This Week' },
  { id: 'last_week', label: 'Last Week' },
  { id: 'this_month', label: 'This Month' },
  { id: 'last_month', label: 'Last Month' },
  { id: 'last_3_months', label: 'Last 3 Months' },
  { id: 'last_6_months', label: 'Last 6 Months' },
  { id: 'this_year', label: 'This Year' },
  { id: 'all_time', label: 'All Time' },
]

function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function endOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)
}

/** Returns { start: Date, end: Date } for a preset id. */
export function getPresetRange(presetId) {
  const now = new Date()
  const today = startOfDay(now)

  switch (presetId) {
    case 'today':
      return { start: today, end: endOfDay(now) }

    case 'yesterday': {
      const y = new Date(today)
      y.setDate(y.getDate() - 1)
      return { start: y, end: endOfDay(y) }
    }

    case 'this_week': {
      const mon = new Date(today)
      mon.setDate(today.getDate() - ((today.getDay() + 6) % 7))
      return { start: mon, end: endOfDay(now) }
    }

    case 'last_week': {
      const mon = new Date(today)
      mon.setDate(today.getDate() - ((today.getDay() + 6) % 7) - 7)
      const sun = new Date(mon)
      sun.setDate(mon.getDate() + 6)
      return { start: mon, end: endOfDay(sun) }
    }

    case 'this_month':
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: endOfDay(now),
      }

    case 'last_month': {
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const last = new Date(now.getFullYear(), now.getMonth(), 0)
      return { start: first, end: endOfDay(last) }
    }

    case 'last_3_months': {
      const s = new Date(now.getFullYear(), now.getMonth() - 2, 1)
      return { start: s, end: endOfDay(now) }
    }

    case 'last_6_months': {
      const s = new Date(now.getFullYear(), now.getMonth() - 5, 1)
      return { start: s, end: endOfDay(now) }
    }

    case 'this_year':
      return {
        start: new Date(now.getFullYear(), 0, 1),
        end: endOfDay(now),
      }

    case 'all_time':
    default:
      return null // null means no filtering
  }
}

/** Returns { start, end } for a specific month/year. */
export function getMonthRange(year, month) {
  const start = new Date(year, month, 1)
  const end = new Date(year, month + 1, 0, 23, 59, 59, 999)
  return { start, end }
}

/** Filters rows by a { start, end } date range based on Date Applied. */
export function filterRowsByRange(rows, range) {
  if (!range) return rows
  const { start, end } = range
  return rows.filter(r => {
    const d = parseDate(r['Date Applied'])
    if (!d) return false
    return d >= start && d <= end
  })
}

// ── Period selector utilities ──────────────────────────────────────────────

/** Returns { start, end } for a Monday-based week. weeksAgo=0 = current week, 1 = last completed Mon–Sun. */
export function getWeekRangeAgo(weeksAgo) {
  const now = new Date()
  const daysFromMonday = now.getDay() === 0 ? 6 : now.getDay() - 1
  const thisMonday = new Date(now)
  thisMonday.setDate(now.getDate() - daysFromMonday)
  thisMonday.setHours(0, 0, 0, 0)
  const start = new Date(thisMonday)
  start.setDate(thisMonday.getDate() - weeksAgo * 7)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

export function fmtWeekLabel(range) {
  const o = { month: 'short', day: 'numeric' }
  return `${range.start.toLocaleDateString('en-US', o)} – ${range.end.toLocaleDateString('en-US', o)}`
}

/** Last 5 completed weeks as period options. */
export function getWeekOptions() {
  return [1, 2, 3, 4, 5].map(i => ({
    id: i === 1 ? 'last_week' : `week_ago_${i}`,
    label: fmtWeekLabel(getWeekRangeAgo(i)),
  }))
}

/** Last 6 months as period options. */
export function getMonthOptions() {
  const now = new Date()
  const opts = []
  for (let i = 0; i <= 5; i++) {
    let m = now.getMonth() - i
    let y = now.getFullYear()
    if (m < 0) { m += 12; y-- }
    const id = i === 0 ? 'this_month' : i === 1 ? 'last_month' : `month_${y}_${m}`
    opts.push({ id, label: new Date(y, m, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' }) })
  }
  return opts
}

/** Resolves a period option id (from getWeekOptions / getMonthOptions) to { start, end }. */
export function resolvePeriodRange(id) {
  const now = new Date()
  if (id.startsWith('week_ago_')) return getWeekRangeAgo(parseInt(id.slice(9)))
  if (id === 'this_week')  return getWeekRangeAgo(0)
  if (id === 'last_week')  return getWeekRangeAgo(1)
  if (id === 'this_month') return getMonthRange(now.getFullYear(), now.getMonth())
  if (id === 'last_month') {
    const m = now.getMonth() === 0 ? 11 : now.getMonth() - 1
    const y = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()
    return getMonthRange(y, m)
  }
  if (id.startsWith('month_')) {
    const [, y, m] = id.split('_').map(Number)
    return getMonthRange(y, m)
  }
  return null
}

/** Resolves the DateFilter component's filter object to { start, end }. */
export function resolveFilterRange(filter) {
  if (!filter) return null
  if (filter.type === 'preset') return getPresetRange(filter.id)
  if (filter.type === 'month') return getMonthRange(filter.year, filter.month)
  if (filter.type === 'week') return resolvePeriodRange(filter.weekId)
  if (filter.type === 'custom') {
    const [sy, sm, sd] = filter.start.split('-').map(Number)
    const [ey, em, ed] = filter.end.split('-').map(Number)
    return {
      start: new Date(sy, sm - 1, sd),
      end: new Date(ey, em - 1, ed, 23, 59, 59, 999),
    }
  }
  return null
}

/** Builds a list of { year, month, label } options from actual row data. */
export function getAvailableMonths(rows) {
  const seen = new Set()
  const months = []
  for (const r of rows) {
    const d = parseDate(r['Date Applied'])
    if (!d) continue
    const key = `${d.getFullYear()}-${d.getMonth()}`
    if (!seen.has(key)) {
      seen.add(key)
      months.push({
        year: d.getFullYear(),
        month: d.getMonth(),
        label: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      })
    }
  }
  return months.sort((a, b) => b.year - a.year || b.month - a.month)
}
