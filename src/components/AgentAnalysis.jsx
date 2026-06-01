import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LabelList,
} from 'recharts'
import { getByAgent, getByAgentWithAvgPct } from '../utils/aggregations'
import {
  filterRowsByRange, getWeekOptions, getMonthOptions,
  resolvePeriodRange, resolveFilterRange,
} from '../utils/dateFilters'
import { formatCurrency } from '../utils/csv'
import DataTable from './DataTable'
import DateFilter from './DateFilter'

const UNCONTROLLABLE = ['out of stock', 'oos', 'order cancellation', 'cancellation']
const isIssue  = r => !UNCONTROLLABLE.includes((r['Refund Reason'] || '').trim().toLowerCase())
const parsePct = r => {
  const raw = r['Refund Percentage']
  if (typeof raw === 'number') return Math.round(raw * 100)
  return parseFloat(String(raw || '').replace('%', ''))
}

const AGENT_FILTERS = [
  { id: 'all',     label: 'All Refunds' },
  { id: 'partial', label: 'Partial Only (<100%)' },
  { id: 'oos',     label: 'OOS & Cancellations' },
  { id: 'issue',   label: 'Issue-Based (100%)' },
]

const VIEWS = [
  { id: 'overview', label: 'Overview' },
  { id: 'wow',      label: 'WoW' },
  { id: 'mom',      label: 'MoM' },
]

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

function TrendPill({ curr, prev }) {
  if (!prev) return <span className="trend-pill trend-pill-neutral">—</span>
  const pct = Math.round((curr - prev) / Math.abs(prev) * 100)
  if (pct > 0) return <span className="trend-pill trend-pill-red">↑ {pct}%</span>
  if (pct < 0) return <span className="trend-pill trend-pill-green">↓ {Math.abs(pct)}%</span>
  return <span className="trend-pill trend-pill-neutral">= same</span>
}

function AgentComparisonView({ rowsA, rowsB, labelA, labelB, currency }) {
  const fmt      = v => formatCurrency(v, currency)
  const shortFmt = v => v >= 1000 ? `${currency}${(v / 1000).toFixed(1)}k` : `${currency}${Math.round(v)}`

  const agentsA = getByAgent(rowsA)
  const agentsB = getByAgent(rowsB)
  const mapA    = new Map(agentsA.map(a => [a.key, a]))
  const mapB    = new Map(agentsB.map(a => [a.key, a]))
  const allKeys = [...new Set([...agentsA.map(a => a.key), ...agentsB.map(a => a.key)])]

  const merged = allKeys
    .map(key => ({
      key,
      label:   mapA.get(key)?.label  ?? mapB.get(key)?.label ?? key,
      countA:  mapA.get(key)?.count  ?? 0,
      amountA: mapA.get(key)?.amount ?? 0,
      countB:  mapB.get(key)?.count  ?? 0,
      amountB: mapB.get(key)?.amount ?? 0,
    }))
    .sort((a, b) => b.amountA - a.amountA)

  const chartData = merged.map(r => ({ agent: r.label, a: r.amountA, b: r.amountB }))

  return (
    <>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="comparison-legend">
          <span className="comp-dot" style={{ background: '#6366F1' }} /><span>{labelA}</span>
          <span className="comp-dot" style={{ background: '#CBD5E1', marginLeft: 16 }} /><span>{labelB}</span>
        </div>
        <ResponsiveContainer width="100%" height={Math.max(200, merged.length * 56)}>
          <BarChart data={chartData} layout="vertical" margin={{ top: 8, right: 90, left: 80, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
            <XAxis type="number" hide />
            <YAxis
              type="category" dataKey="agent"
              tick={{ fontSize: 12, fill: 'var(--text)' }}
              axisLine={false} tickLine={false} width={80}
            />
            <Tooltip
              formatter={(v, name) => [fmt(v), name]}
              contentStyle={{ background: '#0F172A', border: 'none', borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: '#94A3B8' }}
              itemStyle={{ color: '#F8FAFC' }}
            />
            <Bar dataKey="a" name={labelA} fill="#6366F1" radius={[0, 4, 4, 0]} maxBarSize={18}>
              <LabelList dataKey="a" position="right" style={{ fontSize: 11, fontWeight: 700, fill: '#0F172A' }} formatter={shortFmt} />
            </Bar>
            <Bar dataKey="b" name={labelB} fill="#CBD5E1" radius={[0, 4, 4, 0]} maxBarSize={18} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card">
        <h3 className="card-title">Agent Comparison</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th rowSpan={2} style={{ textAlign: 'left' }}>Agent</th>
              <th colSpan={2} style={{ textAlign: 'center', color: '#6366F1' }}>{labelA}</th>
              <th colSpan={2} style={{ textAlign: 'center' }}>{labelB}</th>
              <th rowSpan={2} style={{ textAlign: 'right' }}>Change</th>
            </tr>
            <tr>
              <th style={{ textAlign: 'right' }}>Count</th>
              <th style={{ textAlign: 'right' }}>Amount</th>
              <th style={{ textAlign: 'right' }}>Count</th>
              <th style={{ textAlign: 'right' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {merged.map(row => (
              <tr key={row.key}>
                <td style={{ fontWeight: 500 }}>{row.label}</td>
                <td style={{ textAlign: 'right', fontWeight: 700, color: '#6366F1' }}>{row.countA}</td>
                <td style={{ textAlign: 'right', fontWeight: 700, color: '#6366F1' }}>{fmt(row.amountA)}</td>
                <td style={{ textAlign: 'right' }}>{row.countB}</td>
                <td style={{ textAlign: 'right' }}>{fmt(row.amountB)}</td>
                <td style={{ textAlign: 'right' }}>
                  <TrendPill curr={row.amountA} prev={row.amountB} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

export default function AgentAnalysis({ rows, store, filter, setFilter }) {
  const [view,        setView]        = useState('overview')
  const [agentFilter, setAgentFilter] = useState('all')
  const [agentName,   setAgentName]   = useState('')
  const [wowA, setWowA] = useState('last_week')
  const [wowB, setWowB] = useState('week_ago_2')
  const [momA, setMomA] = useState('this_month')
  const [momB, setMomB] = useState('last_month')
  const [wowFilter, setWowFilter] = useState('all')
  const [momFilter, setMomFilter] = useState('all')

  const { currency } = store
  const weekOptions  = getWeekOptions()
  const monthOptions = getMonthOptions()

  const agentNames = [...new Set(rows.map(r => r['Refunded By']).filter(Boolean))].sort()

  function applyRefundFilter(scopedRows, filterId) {
    if (filterId === 'partial') return scopedRows.filter(r => parsePct(r) < 100)
    if (filterId === 'oos')     return scopedRows.filter(r => !isIssue(r))
    if (filterId === 'issue')   return scopedRows.filter(r => isIssue(r) && parsePct(r) === 100)
    return scopedRows
  }

  const agentScopedRows = agentName ? rows.filter(r => r['Refunded By'] === agentName) : rows

  const range    = resolveFilterRange(filter)
  const filtered = filterRowsByRange(agentScopedRows, range)

  const issueRows   = filtered.filter(isIssue)
  const uncontrol   = filtered.filter(r => !isIssue(r))
  const partialRows = filtered.filter(r => parsePct(r) < 100)

  const agentBaseRows = {
    all:     filtered,
    partial: partialRows,
    oos:     uncontrol,
    issue:   issueRows.filter(r => parsePct(r) === 100),
  }[agentFilter] || filtered

  const byAgentFiltered = getByAgent(agentBaseRows)
  const byAgentIssue    = getByAgentWithAvgPct(issueRows.filter(r => parsePct(r) < 100))

  return (
    <div>
      {/* View toggle + Agent name filter */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div className="agent-filter-bar" style={{ marginBottom: 0 }}>
          {VIEWS.map(v => (
            <button
              key={v.id}
              className={`agent-filter-btn${view === v.id ? ' active' : ''}`}
              onClick={() => setView(v.id)}
            >
              {v.label}
            </button>
          ))}
        </div>
        <div className="period-select-wrap" style={{ marginLeft: 'auto' }}>
          <span className="period-select-label">Agent</span>
          <select
            className="period-select"
            value={agentName}
            onChange={e => setAgentName(e.target.value)}
          >
            <option value="">All Agents</option>
            {agentNames.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>

      {/* ── Overview ── */}
      {view === 'overview' && (
        <div>
          <DateFilter rows={rows} value={filter} onChange={setFilter} />
          <div className="agent-filter-bar">
            {AGENT_FILTERS.map(f => (
              <button
                key={f.id}
                className={`agent-filter-btn${agentFilter === f.id ? ' active' : ''}`}
                onClick={() => setAgentFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="tables-grid">
            <DataTable title="Agent Performance" rows={byAgentFiltered} emptyMessage="No data for this period" />
            {agentFilter === 'issue' && (
              <DataTable
                title="Agent Performance (Partial Issue)"
                rows={byAgentIssue}
                showAvgPct
                emptyMessage="No partial issue-based refunds for this period"
              />
            )}
          </div>
        </div>
      )}

      {/* ── WoW ── */}
      {view === 'wow' && (
        <div>
          <div className="analysis-period-row">
            <PeriodSelect label="Period A" value={wowA} onChange={setWowA} options={weekOptions} />
            <span className="vs-divider">vs</span>
            <PeriodSelect label="Period B" value={wowB} onChange={setWowB} options={weekOptions} />
          </div>
          <div className="agent-filter-bar">
            {AGENT_FILTERS.map(f => (
              <button
                key={f.id}
                className={`agent-filter-btn${wowFilter === f.id ? ' active' : ''}`}
                onClick={() => setWowFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
          <AgentComparisonView
            rowsA={applyRefundFilter(filterRowsByRange(agentScopedRows, resolvePeriodRange(wowA)), wowFilter)}
            rowsB={applyRefundFilter(filterRowsByRange(agentScopedRows, resolvePeriodRange(wowB)), wowFilter)}
            labelA={weekOptions.find(o => o.id === wowA)?.label ?? wowA}
            labelB={weekOptions.find(o => o.id === wowB)?.label ?? wowB}
            currency={currency}
          />
        </div>
      )}

      {/* ── MoM ── */}
      {view === 'mom' && (
        <div>
          <div className="analysis-period-row">
            <PeriodSelect label="Period A" value={momA} onChange={setMomA} options={monthOptions} />
            <span className="vs-divider">vs</span>
            <PeriodSelect label="Period B" value={momB} onChange={setMomB} options={monthOptions} />
          </div>
          <div className="agent-filter-bar">
            {AGENT_FILTERS.map(f => (
              <button
                key={f.id}
                className={`agent-filter-btn${momFilter === f.id ? ' active' : ''}`}
                onClick={() => setMomFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
          <AgentComparisonView
            rowsA={applyRefundFilter(filterRowsByRange(agentScopedRows, resolvePeriodRange(momA)), momFilter)}
            rowsB={applyRefundFilter(filterRowsByRange(agentScopedRows, resolvePeriodRange(momB)), momFilter)}
            labelA={monthOptions.find(o => o.id === momA)?.label ?? momA}
            labelB={monthOptions.find(o => o.id === momB)?.label ?? momB}
            currency={currency}
          />
        </div>
      )}
    </div>
  )
}
