/**
 * Parses a CSV string into an array of row objects keyed by header names.
 * Handles quoted fields, embedded commas, and escaped double-quotes.
 */
export function parseCSV(text) {
  const lines = []
  let line = []
  let cell = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    const next = text[i + 1]

    if (ch === '"') {
      if (inQuotes && next === '"') {
        cell += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === ',' && !inQuotes) {
      line.push(cell)
      cell = ''
    } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && next === '\n') i++
      line.push(cell)
      if (line.some(c => c !== '')) lines.push(line)
      line = []
      cell = ''
    } else {
      cell += ch
    }
  }

  if (cell !== '' || line.length > 0) {
    line.push(cell)
    if (line.some(c => c !== '')) lines.push(line)
  }

  if (lines.length < 2) return []

  const headers = lines[0].map(h => h.trim())
  return lines.slice(1).map(row => {
    const obj = {}
    headers.forEach((h, i) => {
      obj[h] = (row[i] ?? '').trim()
    })
    return obj
  })
}

/** Strips currency symbols and commas, returns a float (0 on failure). Accepts numbers directly. */
export function parseAmount(val) {
  if (typeof val === 'number') return val
  if (!val) return 0
  const n = parseFloat(String(val).replace(/[$€£¥,\s]/g, ''))
  return isNaN(n) ? 0 : n
}

/**
 * Parses gviz JSON response into row objects keyed by column label.
 * Numeric values are kept as-is (full precision). Dates are converted to M/D/YYYY.
 */
export function parseGvizJSON(text) {
  const jsonStr = text.replace(/^[^(]*\(/, '').replace(/\);?\s*$/, '')
  const data = JSON.parse(jsonStr)
  const cols = data.table.cols.map(c => c.label || c.id)
  return data.table.rows
    .filter(row => row.c && row.c.some(c => c && c.v !== null && c.v !== undefined && c.v !== ''))
    .map(row => {
      const obj = {}
      row.c.forEach((cell, i) => {
        if (!cell || cell.v === null || cell.v === undefined) {
          obj[cols[i]] = ''
        } else if (typeof cell.v === 'string' && cell.v.startsWith('Date(')) {
          const [y, m, d] = cell.v.slice(5, -1).split(',').map(Number)
          obj[cols[i]] = `${m + 1}/${d}/${y}`
        } else {
          obj[cols[i]] = cell.v
        }
      })
      return obj
    })
}

/** Parses "M/D/YYYY" strings into a Date object (null on failure). */
export function parseDate(str) {
  if (!str) return null
  const parts = str.split('/')
  if (parts.length !== 3) return null
  const [m, d, y] = parts.map(Number)
  if (!m || !d || !y) return null
  return new Date(y, m - 1, d)
}

/** Formats a number as currency string, e.g. 230.33 → "$230.33". */
export function formatCurrency(amount, symbol = '$') {
  return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/** Returns "Apr 17" style short date label. */
export function formatShortDate(date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/** Returns ISO date string "YYYY-MM-DD" for grouping (local time, not UTC). */
export function toISODate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Returns "Week of Apr 14" label for a date. */
export function weekLabel(date) {
  const d = new Date(date)
  const day = d.getDay()
  const monday = new Date(d)
  monday.setDate(d.getDate() - ((day + 6) % 7))
  return `Wk ${formatShortDate(monday)}`
}

/** Returns a sortable week key "YYYY-WNN". */
export function weekKey(date) {
  const d = new Date(date)
  const day = d.getDay()
  const monday = new Date(d)
  monday.setDate(d.getDate() - ((day + 6) % 7))
  return toISODate(monday)
}
