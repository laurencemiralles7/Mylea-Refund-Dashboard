import { useParams, Navigate } from 'react-router-dom'
import { STORES } from '../config'
import { useSheetData } from '../hooks/useSheetData'
import {
  getMTDRows, getPendingRows, sumAmount,
  getDailyRefunds, getWeeklyRefunds,
  getByReason, getByProduct, getByPayment, getByAgent,
} from '../utils/aggregations'
import { formatCurrency } from '../utils/csv'
import KpiCard from '../components/KpiCard'
import DailyChart from '../components/DailyChart'
import WeeklyChart from '../components/WeeklyChart'
import DataTable from '../components/DataTable'
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

export default function StoreDashboard() {
  const { storeId } = useParams()
  const store = STORES.find(s => s.id === storeId)
  if (!store) return <Navigate to="/" replace />

  const { rows, loading, error, lastUpdated, refresh } = useSheetData(store.sheetName)

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

  const mtdRows = getMTDRows(rows)
  const pendingRows = getPendingRows(rows)
  const pendingAmount = sumAmount(pendingRows)
  const mtdAmount = sumAmount(mtdRows)

  const daily = getDailyRefunds(rows)
  const weekly = getWeeklyRefunds(rows)
  const byReason = getByReason(rows)
  const byProduct = getByProduct(rows)
  const byPayment = getByPayment(rows)
  const byAgent = getByAgent(rows)

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

      {/* KPI Cards */}
      <div className="kpi-grid">
        <KpiCard
          label="MTD Refunds"
          value={formatCurrency(mtdAmount)}
          sub={`${mtdRows.length} refund${mtdRows.length !== 1 ? 's' : ''} this month`}
          accent={store.color}
          icon="💸"
        />
        <KpiCard
          label="Refund Count"
          value={mtdRows.length}
          sub="Month to date"
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
          sub={`${rows.length - pendingRows.length} processed`}
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
          emptyMessage="No reason data"
        />
        <DataTable
          title="Agent Performance"
          rows={byAgent}
          emptyMessage="No agent data"
        />
        <DataTable
          title="Refunded Products"
          rows={byProduct}
          truncate
          emptyMessage="No product data"
        />
        <DataTable
          title="Payment Methods"
          rows={byPayment}
          emptyMessage="No payment data"
        />
      </div>
    </div>
  )
}
