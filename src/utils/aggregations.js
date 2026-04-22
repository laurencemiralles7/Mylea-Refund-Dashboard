import { parseAmount, parseDate, toISODate, weekKey, weekLabel, formatShortDate } from './csv'

const COL = {
  ORDER: 'Order #',
  AGENT: 'Refunded By',
  APPROVER: 'Approved by',
  PRODUCT: 'Refunded product/s',
  REASON: 'Refund Reason',
  REFUND_PCT: 'Refund Percentage',
  TOTAL_PAID: 'Total paid amount',
  AMOUNT: 'Refund Amount',
  DATE_APPLIED: 'Date Applied',
  SUCCESS_DATE: 'Success Date(Shopify)',
  PAYMENT: 'Payment Method',
  NOTES: 'Notes/Remarks',
  TICKET: 'Link to ticket',
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
  return rows.reduce((acc, r) => acc + parseAmount(r[COL.AMOUNT]), 0)
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
      existing.amount += parseAmount(row[COL.AMOUNT])
    } else {
      map.set(k, { key: k, label: labelFn(k), count: 1, amount: parseAmount(row[COL.AMOUNT]) })
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
      existing.amount += parseAmount(row[COL.AMOUNT])
      existing.count++
    } else {
      map.set(key, { date: key, label: formatShortDate(d), amount: parseAmount(row[COL.AMOUNT]), count: 1 })
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
      existing.amount += parseAmount(row[COL.AMOUNT])
      existing.count++
    } else {
      map.set(key, { week: key, label, amount: parseAmount(row[COL.AMOUNT]), count: 1 })
    }
  }
  return Array.from(map.values()).sort((a, b) => a.week.localeCompare(b.week))
}

export function getByReason(rows) {
  return groupBy(rows, r => r[COL.REASON])
}

export function getByProduct(rows) {
  return groupBy(rows, r => r[COL.PRODUCT])
}

export function getByPayment(rows) {
  return groupBy(rows, r => r[COL.PAYMENT])
}

export function getByAgent(rows) {
  return groupBy(rows, r => r[COL.AGENT])
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
