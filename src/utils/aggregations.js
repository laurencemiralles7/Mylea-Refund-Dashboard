import { parseAmount, parseDate, toISODate, weekKey, weekLabel, formatShortDate } from './csv'

const COL = {
  ORDER: 'Order #',
  AGENT: 'Refunded By',
  PRODUCT: 'Refunded product/s',
  REASON: 'Refund Reason',
  REFUND_PCT: 'Refund Percentage',
  TOTAL_PAID: 'Total paid amount',
  AMOUNT_USD: 'Refund amount in USD',
  AMOUNT: 'Refund Amount (apply in shopify)',
  AMOUNT_LEGACY: 'Refund Amount',
  DATE_APPLIED: 'Date Applied',
  PAYMENT: 'Payment Method',
  NOTES: 'Notes/Remarks',
  TICKET: 'Link to ticket',
}

const normalize = s => s.replace(/\s+/g, ' ').trim().toLowerCase()

/** Gets refund amount from a row — prefers USD column, falls back to local amount columns. */
function getAmount(row) {
  const keys = Object.keys(row)
  const usdKey = keys.find(k => normalize(k) === 'refund amount in usd')
  const shopifyKey = keys.find(k => normalize(k) === 'refund amount (apply in shopify)')
  if (usdKey && row[usdKey] !== '' && row[usdKey] !== undefined) return parseAmount(row[usdKey])
  if (shopifyKey && row[shopifyKey] !== '' && row[shopifyKey] !== undefined) return parseAmount(row[shopifyKey])
  return parseAmount(row[COL.AMOUNT_LEGACY])
}

export { COL }

function isCurrentMonth(date) {
  if (!date) return false
  const now = new Date()
  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
}

/** Rows that have a valid Date Applied in the current month. */
export function getMTDRows(rows) {
  return rows.filter(r => isCurrentMonth(parseDate(r[COL.DATE_APPLIED])))
}

/** Rows where Success Date is empty (refund not yet processed in Shopify). */
export function getPendingRows(rows) {
  return rows.filter(r => !r[COL.SUCCESS_DATE])
}

/** Sum of Refund Amount across rows. */
export function sumAmount(rows) {
  return Math.round(rows.reduce((acc, r) => acc + getAmount(r), 0) * 100) / 100
}

/**
 * Groups rows by a key function, returning sorted array of:
 * { key, label, count, amount }
 */
function groupBy(rows, keyFn, labelFn = k => k) {
  const map = new Map()
  for (const row of rows) {
    const k = keyFn(row)
    if (!k) continue
    const existing = map.get(k)
    if (existing) {
      existing.count++
      existing.amount += getAmount(row)
    } else {
      map.set(k, { key: k, label: labelFn(k), count: 1, amount: getAmount(row) })
    }
  }
  return Array.from(map.values()).sort((a, b) => b.amount - a.amount)
}

/** Daily refunds grouped by Date Applied. Returns [{date, label, amount}] sorted asc. */
export function getDailyRefunds(rows) {
  const map = new Map()
  for (const row of rows) {
    const d = parseDate(row[COL.DATE_APPLIED])
    if (!d) continue
    const key = toISODate(d)
    const existing = map.get(key)
    if (existing) {
      existing.amount += getAmount(row)
      existing.count++
    } else {
      map.set(key, { date: key, label: formatShortDate(d), amount: getAmount(row), count: 1 })
    }
  }
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date))
}

/** Weekly refunds grouped by Monday of the week. Returns [{week, label, amount, count}] sorted asc. */
export function getWeeklyRefunds(rows) {
  const map = new Map()
  for (const row of rows) {
    const d = parseDate(row[COL.DATE_APPLIED])
    if (!d) continue
    const key = weekKey(d)
    const label = weekLabel(d)
    const existing = map.get(key)
    if (existing) {
      existing.amount += getAmount(row)
      existing.count++
    } else {
      map.set(key, { week: key, label, amount: getAmount(row), count: 1 })
    }
  }
  return Array.from(map.values()).sort((a, b) => a.week.localeCompare(b.week))
}

export function getByReason(rows) {
  return groupBy(rows, r => r[COL.REASON])
}

export function getByProduct(rows) {
  const all = groupBy(rows, r => r[COL.PRODUCT])
  const totalAmount = all.reduce((s, r) => s + r.amount, 0)
  const filtered = all.filter(r => totalAmount > 0 && (r.amount / totalAmount) >= 0.05)
  return filtered.length > 0 ? filtered.slice(0, 10) : all.slice(0, 10)
}

export function getByPayment(rows) {
  return groupBy(rows, r => r[COL.PAYMENT])
}

export function getByAgent(rows) {
  return groupBy(rows, r => r[COL.AGENT] || '(Unassigned)')
}

export function getByAgentWithAvgPct(rows) {
  const map = new Map()
  for (const row of rows) {
    const k = row[COL.AGENT] || '(Unassigned)'
    const raw = row[COL.REFUND_PCT]
    const pct = typeof raw === 'number' ? Math.round(raw * 100) : parseFloat(String(raw || '').replace('%', ''))
    const existing = map.get(k)
    if (existing) {
      existing.count++
      existing.amount += getAmount(row)
      if (!isNaN(pct)) { existing.pctSum += pct; existing.pctCount++ }
    } else {
      map.set(k, { key: k, label: k, count: 1, amount: getAmount(row), pctSum: isNaN(pct) ? 0 : pct, pctCount: isNaN(pct) ? 0 : 1 })
    }
  }
  return Array.from(map.values())
    .map(r => ({ ...r, avgPct: r.pctCount > 0 ? Math.round(r.pctSum / r.pctCount) : null }))
    .sort((a, b) => b.amount - a.amount)
}

export function getByProductWithTopReason(rows) {
  const map = new Map()
  for (const row of rows) {
    const p = row[COL.PRODUCT]
    if (!p) continue
    const reason = row[COL.REASON] || ''
    const existing = map.get(p)
    if (existing) {
      existing.count++
      existing.amount += getAmount(row)
      existing.reasons[reason] = (existing.reasons[reason] || 0) + 1
    } else {
      map.set(p, { key: p, label: p, count: 1, amount: getAmount(row), reasons: { [reason]: 1 } })
    }
  }
  const all = Array.from(map.values())
    .map(r => ({
      ...r,
      topReason: Object.entries(r.reasons).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '',
    }))
    .sort((a, b) => b.amount - a.amount)
  const totalAmount = all.reduce((s, r) => s + r.amount, 0)
  return all.filter(r => totalAmount === 0 || (r.amount / totalAmount) >= 0.02).slice(0, 10)
}

/** Returns the full enriched row list sorted by Date Applied desc. */
export function getSortedRows(rows) {
  return [...rows]
    .filter(r => parseDate(r[COL.DATE_APPLIED]))
    .sort((a, b) => {
      const da = parseDate(a[COL.DATE_APPLIED])
      const db = parseDate(b[COL.DATE_APPLIED])
      return db - da
    })
}
