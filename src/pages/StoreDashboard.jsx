import { useState } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { STORES } from '../config'
import { useSheetData } from '../hooks/useSheetData'
import { sumAmount, getDailyRefunds, getWeeklyRefunds } from '../utils/aggregations'
import { formatCurrency } from '../utils/csv'
import { filterRowsByRange, resolveFilterRange } from '../utils/dateFilters'
import KpiCard from '../components/KpiCard'
import DailyChart from '../components/DailyChart'
import DateFilter from '../components/DateFilter'
import Spinner from '../components/Spinner'
import AgentAnalysis from '../components/AgentAnalysis'
import AnalysisTab from '../components/AnalysisTab'

function RefreshButton({ onClick, lastUpdated }) {
  return (
    <div className="refresh-bar">
      {lastUpdated && <span className="last-updated">Updated {lastUpdated.toLocaleTimeString()}</span>}
      <button className="btn-refresh" onClick={onClick}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="1 4 1 10 7 10" />
          <path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
        </svg>
        Refresh
      </button>
    </div>
  )
}

const UNCONTROLLABLE_REASONS = ['out of stock', 'oos', 'order cancellation', 'cancellation']

function SpikeTooltip({ active, payload, label, currency }) {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-label">{label}</p>
      <p className="chart-tooltip-value">{formatCurrency(payload[0].value, currency)}</p>
      <p className="chart-tooltip-sub">{payload[0].payload.count} refund{payload[0].payload.count !== 1 ? 's' : ''}</p>
    </div>
  )
}

const TABS = [
  { id: 'overview',  label: 'Overview' },
  { id: 'agents',    label: 'Agents' },
  { id: 'analysis',  label: 'Analysis' },
]

export default function StoreDashboard() {
  const { storeId } = useParams()
  const store = STORES.find(s => s.id === storeId)
  if (!store) return <Navigate to="/" replace />

  const { rows, loading, error, lastUpdated, refresh } = useSheetData(store.sheetName)
  const [filter,    setFilter]    = useState({ type: 'preset', id: 'this_month' })
  const [activeTab, setActiveTab] = useState('overview')

  if (loading) return <Spinner message={`Loading ${store.name} data…`} />
  if (error) {
    return (
      <div className="error-state">
        <h3>Could not load data</h3>
        <p>{error}</p>
        <button className="btn-refresh" onClick={refresh}>Try again</button>
      </div>
    )
  }

  const range    = resolveFilterRange(filter)
  const filtered = filterRowsByRange(rows, range)

  const parsePct = r => {
    const raw = r['Refund Percentage']
    if (typeof raw === 'number') return Math.round(raw * 100)
    return parseFloat(String(raw || '').replace('%', ''))
  }
  const isUncontrollable = r => UNCONTROLLABLE_REASONS.includes((r['Refund Reason'] || '').trim().toLowerCase())

  const issueRows          = filtered.filter(r => !isUncontrollable(r))
  const uncontrollableRows = filtered.filter(r => isUncontrollable(r))
  const fullRefundRows     = issueRows.filter(r => parsePct(r) === 100)

  const totalAmount     = sumAmount(filtered)
  const issueAmount     = sumAmount(issueRows)
  const issueRefundPcts = issueRows.map(parsePct).filter(v => !isNaN(v) && v > 0)
  const avgIssuePct     = issueRefundPcts.length > 0
    ? Math.round(issueRefundPcts.reduce((a, b) => a + b, 0) / issueRefundPcts.length)
    : null

  const daily  = getDailyRefunds(filtered)
  const weekly = getWeeklyRefunds(filtered)

  const fmt = v => formatCurrency(v, store.currency)

  return (
    <div className="store-dashboard">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <span className="store-dot large" style={{ background: store.color }} />
            {store.name}
          </h1>
          <p className="page-subtitle">Refund Analytics</p>
        </div>
        <RefreshButton onClick={refresh} lastUpdated={lastUpdated} />
      </div>

      <div className="page-tabs">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`page-tab${activeTab === t.id ? ' active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {activeTab === 'overview' && (
        <div>
          <DateFilter rows={rows} value={filter} onChange={setFilter} />
          <div className="kpi-master-grid">
            <div className="kpi-section-label">Volume</div>
            <KpiCard label="Total Refunds" value={fmt(totalAmount)}
              sub={`${filtered.length} refund${filtered.length !== 1 ? 's' : ''} in selected period`}
              accent={store.color} icon="💸" />
            <KpiCard label="Refund Count" value={filtered.length}
              sub="Total transactions in selected period"
              accent="#10B981" icon="📋" />

            <div className="kpi-section-label">Refund Type</div>
            <KpiCard label="OOS & Cancellations" value={fmt(sumAmount(uncontrollableRows))}
              sub={`${uncontrollableRows.length} refund${uncontrollableRows.length !== 1 ? 's' : ''} · Not attributable to service`}
              accent="#6B7280" icon="📦" />
            <KpiCard label="Issue-Based Refunds" value={fmt(issueAmount)}
              sub={`${issueRows.length} refund${issueRows.length !== 1 ? 's' : ''}${avgIssuePct !== null ? ` · Avg ${avgIssuePct}% refunded` : ''}`}
              accent="#EF4444" icon="⚠️" />
            <KpiCard label="Full Refunds (Issue)" value={fmt(sumAmount(fullRefundRows))}
              sub={`${fullRefundRows.length} issue-based at 100% refund`}
              accent="#DC2626" icon="🔴" />
          </div>

          <div className="charts-row">
            <div><DailyChart data={daily} /></div>
            <div>
              <div className="card">
                <h3 className="card-title">Weekly Refunds</h3>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={weekly} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => `${store.currency}${v}`} />
                    <Tooltip content={<SpikeTooltip currency={store.currency} />} cursor={{ fill: 'rgba(99,102,241,0.08)' }} />
                    <Bar dataKey="amount" radius={[6, 6, 0, 0]} maxBarSize={64}>
                      {weekly.map((_, i) => (
                        <Cell key={i} fill={store.color} fillOpacity={0.85} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Agents ── */}
      {activeTab === 'agents' && (
        <AgentAnalysis rows={rows} store={store} filter={filter} setFilter={setFilter} />
      )}

      {/* ── Analysis ── */}
      {activeTab === 'analysis' && (
        <AnalysisTab rows={rows} store={store} />
      )}
    </div>
  )
}
