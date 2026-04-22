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
