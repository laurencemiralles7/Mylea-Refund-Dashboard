import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LabelList,
} from 'recharts'
import { sumAmount, getByProductWithTopReason, getByReason, getByPayment, COL } from '../utils/aggregations'
import {
  filterRowsByRange,
  getWeekRangeAgo, fmtWeekLabel,
  getWeekOptions, getMonthOptions,
  resolvePeriodRange,
} from '../utils/dateFilters'
import { formatCurrency } from '../utils/csv'

const UNCONTROLLABLE = ['out of stock', 'oos', 'order cancellation', 'cancellation']
const isIssue  = r => !UNCONTROLLABLE.includes((r['Refund Reason'] || '').trim().toLowerCase())
const parsePct = r => {
  const raw = r['Refund Percentage']
  if (typeof raw === 'number') return Math.round(raw * 100)
  return parseFloat(String(raw || '').replace('%', ''))
}

function computeMetrics(rows) {
  const issueRows = rows.filter(isIssue)
  const fullRows  = issueRows.filter(r => parsePct(r) === 100)
  const pcts      = issueRows.map(parsePct).filter(v => !isNaN(v) && v > 0)
  return {
    total: sumAmount(rows),
    issue: sumAmount(issueRows),
    full:  sumAmount(fullRows),
    count: rows.length,
    avgPct: pcts.length > 0 ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : null,
  }
}

function getPeriodLabel(id, options) {
  return options.find(o => o.id === id)?.label ?? id
}

function PeriodSelect({ label, value, onChange, options }) {
  return (
    <div className="period-select-wrap">
      {label && <span className="period-select-label">{label}</span>}
      <select className="period-select" value={value} onChange={e => onChange(e.target.value)}>
        {options.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
    </div>
  )
}

function TrendPill({ curr, prev, vsLabel }) {
  if (prev === 0 || prev === null) return <span className="trend-pill trend-pill-neutral">—</span>
  const pct = Math.round((curr - prev) / Math.abs(prev) * 100)
  if (pct > 0) return <span className="trend-pill trend-pill-red">↑ {pct}% vs {vsLabel}</span>
  if (pct < 0) return <span className="trend-pill trend-pill-green">↓ {Math.abs(pct)}% vs {vsLabel}</span>
  return <span className="trend-pill trend-pill-neutral">= same</span>
}

function ComparisonView({ rowsA, rowsB, labelA, labelB, currency }) {
  const fmt      = v => formatCurrency(v, currency)
  const shortFmt = v => v >= 1000 ? `${currency}${(v / 1000).toFixed(1)}k` : `${currency}${Math.round(v)}`
  const mA = computeMetrics(rowsA)
  const mB = computeMetrics(rowsB)

  const chartData = [
    { metric: 'Total',       a: mA.total, b: mB.total },
    { metric: 'Issue-Based', a: mA.issue, b: mB.issue },
    { metric: 'Full Refunds', a: mA.full, b: mB.full },
  ]

  return (
    <>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="comparison-legend">
          <span className="comp-dot" style={{ background: '#6366F1' }} />
          <span>{labelA}</span>
          <span className="comp-dot" style={{ background: '#94A3B8', marginLeft: 16 }} />
          <span>{labelB}</span>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} margin={{ top: 28, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="metric" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip
              formatter={(v, name) => [fmt(v), name]}
              contentStyle={{ background: '#0F172A', border: 'none', borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: '#94A3B8' }}
              itemStyle={{ color: '#F8FAFC' }}
            />
            <Bar dataKey="a" name={labelA} fill="#6366F1" radius={[4, 4, 0, 0]} maxBarSize={72}>
              <LabelList dataKey="a" position="top" style={{ fontSize: 11, fontWeight: 700, fill: '#0F172A' }} formatter={shortFmt} />
            </Bar>
            <Bar dataKey="b" name={labelB} fill="#CBD5E1" radius={[4, 4, 0, 0]} maxBarSize={72}>
              <LabelList dataKey="b" position="top" style={{ fontSize: 11, fontWeight: 600, fill: '#64748B' }} formatter={shortFmt} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="comp-stats-row">
          <div className="comp-stat">
            <div className="comp-stat-label">Count</div>
            <div className="comp-stat-vals">
              <span style={{ color: '#6366F1', fontWeight: 700, fontSize: 18 }}>{mA.count}</span>
              <span style={{ color: '#94A3B8', fontSize: 12 }}>vs</span>
              <span style={{ fontWeight: 600, fontSize: 18 }}>{mB.count}</span>
            </div>
          </div>
          <div className="comp-stat">
            <div className="comp-stat-label">Avg Refund %</div>
            <div className="comp-stat-vals">
              <span style={{ color: '#6366F1', fontWeight: 700, fontSize: 18 }}>{mA.avgPct !== null ? `${mA.avgPct}%` : '—'}</span>
              <span style={{ color: '#94A3B8', fontSize: 12 }}>vs</span>
              <span style={{ fontWeight: 600, fontSize: 18 }}>{mB.avgPct !== null ? `${mB.avgPct}%` : '—'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="card-title">Breakdown</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>Metric</th>
              <th style={{ textAlign: 'right', color: '#6366F1' }}>{labelA}</th>
              <th style={{ textAlign: 'right' }}>{labelB}</th>
              <th style={{ textAlign: 'right' }}>Change</th>
            </tr>
          </thead>
          <tbody>
            {[
              { label: 'Total Refunds', a: fmt(mA.total), b: fmt(mB.total), aR: mA.total, bR: mB.total },
              { label: 'Issue-Based',   a: fmt(mA.issue), b: fmt(mB.issue), aR: mA.issue, bR: mB.issue },
              { label: 'Full Refunds',  a: fmt(mA.full),  b: fmt(mB.full),  aR: mA.full,  bR: mB.full },
              { label: 'Count',         a: mA.count,      b: mB.count,      aR: mA.count, bR: mB.count },
              {
                label: 'Avg Refund %',
                a: mA.avgPct !== null ? `${mA.avgPct}%` : '—',
                b: mB.avgPct !== null ? `${mB.avgPct}%` : '—',
                aR: mA.avgPct ?? 0, bR: mB.avgPct ?? 0,
              },
            ].map(row => (
              <tr key={row.label}>
                <td style={{ fontWeight: 500 }}>{row.label}</td>
                <td style={{ textAlign: 'right', fontWeight: 700, color: '#6366F1' }}>{row.a}</td>
                <td style={{ textAlign: 'right' }}>{row.b}</td>
                <td style={{ textAlign: 'right' }}>
                  <TrendPill curr={row.aR} prev={row.bR} vsLabel={labelB} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

// ── Main AnalysisTab ─────────────────────────────────────────

const SUB_TABS = [
  { id: 'wow',      label: 'WoW' },
  { id: 'mom',      label: 'MoM' },
  { id: 'products', label: 'Products' },
  { id: 'reasons',  label: 'Reasons' },
  { id: 'payment',  label: 'Payment Methods' },
]

export default function AnalysisTab({ rows, store }) {
  const [subTab,    setSubTab]    = useState('wow')
  const [wowA,      setWowA]      = useState('last_week')
  const [wowB,      setWowB]      = useState('week_ago_2')
  const [momA,      setMomA]      = useState('this_month')
  const [momB,      setMomB]      = useState('last_month')
  const [productsA, setProductsA] = useState('last_week')
  const [productsB, setProductsB] = useState('week_ago_2')
  const [rsnA,      setRsnA]      = useState('last_week')
  const [rsnB,      setRsnB]      = useState('week_ago_2')
  const [payA,      setPayA]      = useState('last_week')
  const [payB,      setPayB]      = useState('week_ago_2')

  const { currency } = store
  const fmt          = v => formatCurrency(v, currency)
  const shortFmt     = v => v >= 1000 ? `${currency}${(v / 1000).toFixed(1)}k` : `${currency}${Math.round(v)}`
  const weekOptions  = getWeekOptions()
  const monthOptions = getMonthOptions()
  const combinedOpts = [...weekOptions, ...monthOptions]

  return (
    <div>
      <div className="agent-filter-bar" style={{ marginBottom: 20 }}>
        {SUB_TABS.map(t => (
          <button
            key={t.id}
            className={`agent-filter-btn${subTab === t.id ? ' active' : ''}`}
            onClick={() => setSubTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── WoW ─────────────────────────────────────────────── */}
      {subTab === 'wow' && (
        <div>
          <div className="analysis-period-row">
            <PeriodSelect label="Period A" value={wowA} onChange={setWowA} options={weekOptions} />
            <span className="vs-divider">vs</span>
            <PeriodSelect label="Period B" value={wowB} onChange={setWowB} options={weekOptions} />
          </div>
          <ComparisonView
            rowsA={filterRowsByRange(rows, resolvePeriodRange(wowA))}
            rowsB={filterRowsByRange(rows, resolvePeriodRange(wowB))}
            labelA={getPeriodLabel(wowA, weekOptions)}
            labelB={getPeriodLabel(wowB, weekOptions)}
            currency={currency}
          />
        </div>
      )}

      {/* ── MoM ─────────────────────────────────────────────── */}
      {subTab === 'mom' && (
        <div>
          <div className="analysis-period-row">
            <PeriodSelect label="Period A" value={momA} onChange={setMomA} options={monthOptions} />
            <span className="vs-divider">vs</span>
            <PeriodSelect label="Period B" value={momB} onChange={setMomB} options={monthOptions} />
          </div>
          <ComparisonView
            rowsA={filterRowsByRange(rows, resolvePeriodRange(momA))}
            rowsB={filterRowsByRange(rows, resolvePeriodRange(momB))}
            labelA={getPeriodLabel(momA, monthOptions)}
            labelB={getPeriodLabel(momB, monthOptions)}
            currency={currency}
          />
        </div>
      )}

      {/* ── Products ────────────────────────────────────────── */}
      {subTab === 'products' && (() => {
        const pRowsA      = filterRowsByRange(rows, resolvePeriodRange(productsA)).filter(isIssue)
        const pRowsB      = filterRowsByRange(rows, resolvePeriodRange(productsB)).filter(isIssue)
        const topProducts = getByProductWithTopReason(pRowsA)
        const labelA      = combinedOpts.find(o => o.id === productsA)?.label ?? productsA
        const labelB      = combinedOpts.find(o => o.id === productsB)?.label ?? productsB

        const mapB = new Map()
        pRowsB.forEach(r => {
          const p = r[COL.PRODUCT]
          if (!p) return
          const ex = mapB.get(p)
          mapB.set(p, ex
            ? { count: ex.count + 1, amount: ex.amount + sumAmount([r]) }
            : { count: 1, amount: sumAmount([r]) }
          )
        })

        const matrixWeeks = [4, 3, 2, 1].map(i => {
          const range  = getWeekRangeAgo(i)
          const wkRows = filterRowsByRange(rows, range).filter(isIssue)
          const counts = {}
          wkRows.forEach(r => { const p = r[COL.PRODUCT]; if (p) counts[p] = (counts[p] || 0) + 1 })
          return { label: range.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), counts, wkRows }
        })

        const allMatrixRows = matrixWeeks.flatMap(w => w.wkRows)
        const allProducts   = [...new Set(matrixWeeks.flatMap(w => Object.keys(w.counts)))]
        const matrixRows    = allProducts
          .map(p => ({
            product: p,
            weeks:   matrixWeeks.map(w => w.counts[p] || 0),
            total:   matrixWeeks.reduce((s, w) => s + (w.counts[p] || 0), 0),
            amount:  sumAmount(allMatrixRows.filter(r => r[COL.PRODUCT] === p)),
          }))
          .sort((a, b) => b.total - a.total)
          .slice(0, 10)

        const getStreak = wks => {
          let s = 0
          for (let i = wks.length - 1; i >= 0; i--) { if (wks[i] > 0) s++; else break }
          return s
        }

        return (
          <div>
            <div className="analysis-period-row">
              <PeriodSelect label="Period A" value={productsA} onChange={setProductsA} options={combinedOpts} />
              <span className="vs-divider">vs</span>
              <PeriodSelect label="Period B" value={productsB} onChange={setProductsB} options={combinedOpts} />
            </div>

            <div className="card" style={{ marginBottom: 16 }}>
              <h3 className="card-title">Top Refunded Products — {labelA}</h3>
              {topProducts.length === 0
                ? <div className="empty-state">No issue-based refunds for this period</div>
                : (
                  <ResponsiveContainer width="100%" height={Math.max(200, topProducts.length * 40)}>
                    <BarChart data={topProducts} layout="vertical" margin={{ top: 8, right: 90, left: 130, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                      <XAxis type="number" hide />
                      <YAxis
                        type="category" dataKey="label"
                        tick={{ fontSize: 11, fill: 'var(--text)' }}
                        axisLine={false} tickLine={false} width={130}
                        tickFormatter={v => v.length > 20 ? v.slice(0, 18) + '…' : v}
                      />
                      <Tooltip formatter={v => [fmt(v), 'Amount']} contentStyle={{ background: '#0F172A', border: 'none', borderRadius: 8, fontSize: 12 }} labelStyle={{ color: '#94A3B8' }} itemStyle={{ color: '#F8FAFC' }} />
                      <Bar dataKey="amount" fill="#EF4444" radius={[0, 4, 4, 0]} maxBarSize={28}>
                        <LabelList dataKey="amount" position="right" style={{ fontSize: 11, fontWeight: 700, fill: '#0F172A' }} formatter={shortFmt} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )
              }
            </div>

            {topProducts.length > 0 && (
              <div className="card" style={{ marginBottom: 16 }}>
                <h3 className="card-title">Product Comparison — {labelA} vs {labelB}</h3>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th rowSpan={2} style={{ textAlign: 'left' }}>Product</th>
                      <th colSpan={2} style={{ textAlign: 'center', color: '#6366F1' }}>{labelA}</th>
                      <th colSpan={2} style={{ textAlign: 'center' }}>{labelB}</th>
                      <th rowSpan={2} style={{ textAlign: 'right' }}>Change</th>
                    </tr>
                    <tr>
                      <th style={{ textAlign: 'right', color: '#6366F1' }}>Count</th>
                      <th style={{ textAlign: 'right', color: '#6366F1' }}>Amount</th>
                      <th style={{ textAlign: 'right' }}>Count</th>
                      <th style={{ textAlign: 'right' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topProducts.map(p => {
                      const b     = mapB.get(p.label) ?? { count: 0, amount: 0 }
                      const delta = b.amount > 0 ? Math.round((p.amount - b.amount) / b.amount * 100) : null
                      const pill  = delta === null
                        ? <span style={{ color: 'var(--text-muted)' }}>new</span>
                        : delta > 0
                          ? <span className="trend-pill trend-pill-red">↑ {delta}%</span>
                          : delta < 0
                            ? <span className="trend-pill trend-pill-green">↓ {Math.abs(delta)}%</span>
                            : <span className="trend-pill trend-pill-neutral">=</span>
                      return (
                        <tr key={p.key}>
                          <td style={{ fontWeight: 500, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.label}>
                            {p.label}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: '#6366F1' }}>{p.count}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: '#6366F1' }}>{fmt(p.amount)}</td>
                          <td style={{ textAlign: 'right' }}>{b.count}</td>
                          <td style={{ textAlign: 'right' }}>{fmt(b.amount)}</td>
                          <td style={{ textAlign: 'right' }}>{pill}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="card">
              <h3 className="card-title">
                Week-on-Week Product Tracker
                <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 8 }}>
                  Last 4 completed weeks · Issue-based only
                </span>
              </h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
                <span style={{ display: 'inline-block', width: 10, height: 10, background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 2, marginRight: 4 }} />
                3+ consecutive weeks (recurring issue) &nbsp;
                <span style={{ display: 'inline-block', width: 10, height: 10, background: '#fff7ed', border: '1px solid #fdba74', borderRadius: 2, marginRight: 4 }} />
                Multiple in same week
              </p>
              {matrixRows.length === 0
                ? <div className="empty-state">No data available</div>
                : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left' }}>Product</th>
                        {matrixWeeks.map((w, i) => <th key={i} style={{ textAlign: 'center' }}>Wk {w.label}</th>)}
                        <th style={{ textAlign: 'right' }}>Count</th>
                        <th style={{ textAlign: 'right' }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {matrixRows.map(row => {
                        const streak    = getStreak(row.weeks)
                        const recurring = streak >= 3
                        return (
                          <tr key={row.product} style={{ background: recurring ? '#fef2f2' : 'transparent' }}>
                            <td
                              style={{ fontWeight: 500, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                              title={row.product}
                            >
                              {recurring && <span style={{ color: '#EF4444', marginRight: 4 }}>⚠</span>}
                              {row.product}
                            </td>
                            {row.weeks.map((cnt, i) => (
                              <td key={i} style={{
                                textAlign: 'center',
                                fontWeight: cnt > 0 ? 600 : 400,
                                color: cnt === 0 ? '#CBD5E1' : cnt >= 2 ? '#DC2626' : '#0F172A',
                                background: cnt >= 2 ? '#fef2f2' : cnt === 1 ? '#fff7ed' : 'transparent',
                              }}>
                                {cnt === 0 ? '—' : cnt}
                              </td>
                            ))}
                            <td style={{ textAlign: 'right', fontWeight: 700 }}>{row.total}</td>
                            <td style={{ textAlign: 'right', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>{fmt(row.amount)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )
              }
            </div>
          </div>
        )
      })()}

      {/* ── Reasons ─────────────────────────────────────────── */}
      {subTab === 'reasons' && (() => {
        const rRowsA   = filterRowsByRange(rows, resolvePeriodRange(rsnA))
        const rRowsB   = filterRowsByRange(rows, resolvePeriodRange(rsnB))
        const reasonsA = getByReason(rRowsA)
        const reasonsB = getByReason(rRowsB)
        const mapB     = new Map(reasonsB.map(r => [r.key, r]))
        const rLabelA  = combinedOpts.find(o => o.id === rsnA)?.label ?? rsnA
        const rLabelB  = combinedOpts.find(o => o.id === rsnB)?.label ?? rsnB

        const allReasonKeys = [...new Set([...reasonsA.map(r => r.key), ...reasonsB.map(r => r.key)])]
        const mapA = new Map(reasonsA.map(r => [r.key, r]))
        const merged = allReasonKeys
          .map(key => ({
            key,
            label:   mapA.get(key)?.label  ?? mapB.get(key)?.label ?? key,
            countA:  mapA.get(key)?.count  ?? 0,
            amountA: mapA.get(key)?.amount ?? 0,
            countB:  mapB.get(key)?.count  ?? 0,
            amountB: mapB.get(key)?.amount ?? 0,
          }))
          .sort((a, b) => b.amountA - a.amountA)

        const chartData = merged.map(r => ({ reason: r.label, a: r.amountA, b: r.amountB }))

        return (
          <div>
            <div className="analysis-period-row">
              <PeriodSelect label="Period A" value={rsnA} onChange={setRsnA} options={combinedOpts} />
              <span className="vs-divider">vs</span>
              <PeriodSelect label="Period B" value={rsnB} onChange={setRsnB} options={combinedOpts} />
            </div>

            <div className="card" style={{ marginBottom: 16 }}>
              <div className="comparison-legend">
                <span className="comp-dot" style={{ background: '#6366F1' }} /><span>{rLabelA}</span>
                <span className="comp-dot" style={{ background: '#CBD5E1', marginLeft: 16 }} /><span>{rLabelB}</span>
              </div>
              {merged.length === 0
                ? <div className="empty-state">No data for this period</div>
                : (
                  <ResponsiveContainer width="100%" height={Math.max(200, merged.length * 44)}>
                    <BarChart data={chartData} layout="vertical" margin={{ top: 8, right: 90, left: 140, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                      <XAxis type="number" hide />
                      <YAxis
                        type="category" dataKey="reason"
                        tick={{ fontSize: 11, fill: 'var(--text)' }}
                        axisLine={false} tickLine={false} width={140}
                        tickFormatter={v => v.length > 22 ? v.slice(0, 20) + '…' : v}
                      />
                      <Tooltip formatter={(v, name) => [fmt(v), name]} contentStyle={{ background: '#0F172A', border: 'none', borderRadius: 8, fontSize: 12 }} labelStyle={{ color: '#94A3B8' }} itemStyle={{ color: '#F8FAFC' }} />
                      <Bar dataKey="a" name={rLabelA} fill="#6366F1" radius={[0, 4, 4, 0]} maxBarSize={18}>
                        <LabelList dataKey="a" position="right" style={{ fontSize: 11, fontWeight: 700, fill: '#0F172A' }} formatter={shortFmt} />
                      </Bar>
                      <Bar dataKey="b" name={rLabelB} fill="#CBD5E1" radius={[0, 4, 4, 0]} maxBarSize={18} />
                    </BarChart>
                  </ResponsiveContainer>
                )
              }
            </div>

            <div className="card">
              <h3 className="card-title">Reason Comparison</h3>
              {merged.length === 0
                ? <div className="empty-state">No data for this period</div>
                : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th rowSpan={2} style={{ textAlign: 'left' }}>Reason</th>
                        <th colSpan={2} style={{ textAlign: 'center', color: '#6366F1' }}>{rLabelA}</th>
                        <th colSpan={2} style={{ textAlign: 'center' }}>{rLabelB}</th>
                        <th rowSpan={2} style={{ textAlign: 'right' }}>Change</th>
                      </tr>
                      <tr>
                        <th style={{ textAlign: 'right', color: '#6366F1' }}>Count</th>
                        <th style={{ textAlign: 'right', color: '#6366F1' }}>Amount</th>
                        <th style={{ textAlign: 'right' }}>Count</th>
                        <th style={{ textAlign: 'right' }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {merged.map(row => {
                        const delta = row.amountB > 0 ? Math.round((row.amountA - row.amountB) / row.amountB * 100) : null
                        const pill  = delta === null
                          ? <span style={{ color: 'var(--text-muted)' }}>new</span>
                          : delta > 0
                            ? <span className="trend-pill trend-pill-red">↑ {delta}%</span>
                            : delta < 0
                              ? <span className="trend-pill trend-pill-green">↓ {Math.abs(delta)}%</span>
                              : <span className="trend-pill trend-pill-neutral">=</span>
                        return (
                          <tr key={row.key}>
                            <td style={{ fontWeight: 500 }}>{row.label}</td>
                            <td style={{ textAlign: 'right', fontWeight: 700, color: '#6366F1' }}>{row.countA}</td>
                            <td style={{ textAlign: 'right', fontWeight: 700, color: '#6366F1' }}>{fmt(row.amountA)}</td>
                            <td style={{ textAlign: 'right' }}>{row.countB}</td>
                            <td style={{ textAlign: 'right' }}>{fmt(row.amountB)}</td>
                            <td style={{ textAlign: 'right' }}>{pill}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )
              }
            </div>
          </div>
        )
      })()}

      {/* ── Payment Methods ──────────────────────────────────── */}
      {subTab === 'payment' && (() => {
        const payRowsA  = filterRowsByRange(rows, resolvePeriodRange(payA))
        const payRowsB  = filterRowsByRange(rows, resolvePeriodRange(payB))
        const paymentA  = getByPayment(payRowsA)
        const paymentB  = getByPayment(payRowsB)
        const mapB      = new Map(paymentB.map(r => [r.key, r]))
        const pLabelA   = combinedOpts.find(o => o.id === payA)?.label ?? payA
        const pLabelB   = combinedOpts.find(o => o.id === payB)?.label ?? payB

        const allPayKeys = [...new Set([...paymentA.map(r => r.key), ...paymentB.map(r => r.key)])]
        const mapA = new Map(paymentA.map(r => [r.key, r]))
        const merged = allPayKeys
          .map(key => ({
            key,
            label:   mapA.get(key)?.label  ?? mapB.get(key)?.label ?? key,
            countA:  mapA.get(key)?.count  ?? 0,
            amountA: mapA.get(key)?.amount ?? 0,
            countB:  mapB.get(key)?.count  ?? 0,
            amountB: mapB.get(key)?.amount ?? 0,
          }))
          .sort((a, b) => b.amountA - a.amountA)

        const chartData = merged.map(r => ({ method: r.label, a: r.amountA, b: r.amountB }))

        return (
          <div>
            <div className="analysis-period-row">
              <PeriodSelect label="Period A" value={payA} onChange={setPayA} options={combinedOpts} />
              <span className="vs-divider">vs</span>
              <PeriodSelect label="Period B" value={payB} onChange={setPayB} options={combinedOpts} />
            </div>

            <div className="card" style={{ marginBottom: 16 }}>
              <div className="comparison-legend">
                <span className="comp-dot" style={{ background: '#6366F1' }} /><span>{pLabelA}</span>
                <span className="comp-dot" style={{ background: '#CBD5E1', marginLeft: 16 }} /><span>{pLabelB}</span>
              </div>
              {merged.length === 0
                ? <div className="empty-state">No data for this period</div>
                : (
                  <ResponsiveContainer width="100%" height={Math.max(200, merged.length * 56)}>
                    <BarChart data={chartData} layout="vertical" margin={{ top: 8, right: 90, left: 120, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                      <XAxis type="number" hide />
                      <YAxis
                        type="category" dataKey="method"
                        tick={{ fontSize: 12, fill: 'var(--text)' }}
                        axisLine={false} tickLine={false} width={120}
                        tickFormatter={v => v.length > 18 ? v.slice(0, 16) + '…' : v}
                      />
                      <Tooltip formatter={(v, name) => [fmt(v), name]} contentStyle={{ background: '#0F172A', border: 'none', borderRadius: 8, fontSize: 12 }} labelStyle={{ color: '#94A3B8' }} itemStyle={{ color: '#F8FAFC' }} />
                      <Bar dataKey="a" name={pLabelA} fill="#6366F1" radius={[0, 4, 4, 0]} maxBarSize={18}>
                        <LabelList dataKey="a" position="right" style={{ fontSize: 11, fontWeight: 700, fill: '#0F172A' }} formatter={shortFmt} />
                      </Bar>
                      <Bar dataKey="b" name={pLabelB} fill="#CBD5E1" radius={[0, 4, 4, 0]} maxBarSize={18} />
                    </BarChart>
                  </ResponsiveContainer>
                )
              }
            </div>

            <div className="card">
              <h3 className="card-title">Payment Method Comparison</h3>
              {merged.length === 0
                ? <div className="empty-state">No data for this period</div>
                : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th rowSpan={2} style={{ textAlign: 'left' }}>Method</th>
                        <th colSpan={2} style={{ textAlign: 'center', color: '#6366F1' }}>{pLabelA}</th>
                        <th colSpan={2} style={{ textAlign: 'center' }}>{pLabelB}</th>
                        <th rowSpan={2} style={{ textAlign: 'right' }}>Change</th>
                      </tr>
                      <tr>
                        <th style={{ textAlign: 'right', color: '#6366F1' }}>Count</th>
                        <th style={{ textAlign: 'right', color: '#6366F1' }}>Amount</th>
                        <th style={{ textAlign: 'right' }}>Count</th>
                        <th style={{ textAlign: 'right' }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {merged.map(row => {
                        const delta = row.amountB > 0 ? Math.round((row.amountA - row.amountB) / row.amountB * 100) : null
                        const pill  = delta === null
                          ? <span style={{ color: 'var(--text-muted)' }}>new</span>
                          : delta > 0
                            ? <span className="trend-pill trend-pill-red">↑ {delta}%</span>
                            : delta < 0
                              ? <span className="trend-pill trend-pill-green">↓ {Math.abs(delta)}%</span>
                              : <span className="trend-pill trend-pill-neutral">=</span>
                        return (
                          <tr key={row.key}>
                            <td style={{ fontWeight: 500 }}>{row.label}</td>
                            <td style={{ textAlign: 'right', fontWeight: 700, color: '#6366F1' }}>{row.countA}</td>
                            <td style={{ textAlign: 'right', fontWeight: 700, color: '#6366F1' }}>{fmt(row.amountA)}</td>
                            <td style={{ textAlign: 'right' }}>{row.countB}</td>
                            <td style={{ textAlign: 'right' }}>{fmt(row.amountB)}</td>
                            <td style={{ textAlign: 'right' }}>{pill}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )
              }
            </div>
          </div>
        )
      })()}
    </div>
  )
}
