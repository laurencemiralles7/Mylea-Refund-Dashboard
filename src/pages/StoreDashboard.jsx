import { useState } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import { STORES } from '../config'
import { useSheetData } from '../hooks/useSheetData'
import {
  getMTDRows, getPendingRows, sumAmount,
  getDailyRefunds, getWeeklyRefunds,
  getByReason, getByProduct, getByPayment, getByAgent,
} from '../utils/aggregations'
import { formatCurrency } from '../utils/csv'
import { filterRowsByRange, getPresetRange, getMonthRange } from '../utils/dateFilters'
import KpiCard from '../components/KpiCard'
import DailyChart from '../components/DailyChart'
import WeeklyChart from '../components/WeeklyChart'
import DataTable from '../components/DataTable'
import DateFilter from '../components/DateFilter'
import Spinner from '../components/Spinner'

function RefreshButton({ onClick, lastUpdated }) {
  return (
    <div className="refresh-bar">
      {lastUpdated && (
        <span className="last-updated">
          Updated {lastUpdated.toLocaleTimeString()}
        </span>
      )}
      <button className="btn-refresh" onClick={onClick} title="Refresh data">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="1 4 1 10 7 10" />
          <path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
        </svg>
        Refresh
      </button>
    </div>
  )
}

function resolveRange(filter) {
  if (!filter) return null
  if (filter.type === 'preset') return getPresetRange(filter.id)
  if (filter.type === 'month') return getMonthRange(filter.year, filter.month)
  if (filter.type === 'custom') {
    const start = new Date(filter.start)
    const end = new Date(filter.end)
    end.setHours(23, 59, 59, 999)
    return { start, end }
  }
  return null
}

export default function StoreDashboard() {
  const { storeId } = useParams()
  const store = STORES.find(s => s.id === storeId)
  if (!store) return <Navigate to="/" replace />

  const { rows, loading, error, lastUpdated, refresh } = useSheetData(store.sheetName)
  const [filter, setFilter] = useState({ type: 'preset', id: 'this_month' })

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

  const range = resolveRange(filter)
  const filtered = filterRowsByRange(rows, range)

  // KPIs always use filtered rows
  const pendingRows = getPendingRows(filtered)
  const pendingAmount = sumAmount(pendingRows)
  const totalAmount = sumAmount(filtered)

  const daily = getDailyRefunds(filtered)
  const weekly = getWeeklyRefunds(filtered)
  const byReason = getByReason(filtered)
  const byProduct = getByProduct(filtered)
  const byPayment = getByPayment(filtered)
  const byAgent = getByAgent(filtered)

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

      {/* Date Filter */}
      <DateFilter rows={rows} value={filter} onChange={setFilter} />

      {/* KPI Cards */}
      <div className="kpi-grid">
        <KpiCard
          label="Total Refunds"
          value={formatCurrency(totalAmount)}
          sub={`${filtered.length} refund${filtered.length !== 1 ? 's' : ''}`}
          accent={store.color}
          icon="💸"
        />
        <KpiCard
          label="Refund Count"
          value={filtered.length}
          sub="In selected period"
          accent="#10B981"
          icon="📋"
        />
        <KpiCard
          label="Pending Amount"
          value={formatCurrency(pendingAmount)}
          sub="Awaiting Shopify confirmation"
          accent="#F59E0B"
          icon="⏳"
        />
        <KpiCard
          label="Pending Count"
          value={pendingRows.length}
          sub={`${filtered.length - pendingRows.length} processed`}
          accent="#EF4444"
          icon="🔴"
        />
      </div>

      {/* Charts */}
      <div className="charts-row">
        <div className="chart-primary">
          <DailyChart data={daily} />
        </div>
        <div className="chart-secondary">
          <WeeklyChart data={weekly} />
        </div>
      </div>

      {/* Tables */}
      <div className="tables-grid">
        <DataTable
          title="Refund Reasons"
          rows={byReason}
          showBadge
          emptyMessage="No data for this period"
        />
        <DataTable
          title="Agent Performance"
          rows={byAgent}
          emptyMessage="No data for this period"
        />
        <DataTable
          title="Refunded Products"
          rows={byProduct}
          truncate
          emptyMessage="No data for this period"
        />
        <DataTable
          title="Payment Methods"
          rows={byPayment}
          emptyMessage="No data for this period"
        />
      </div>
    </div>
  )
}
