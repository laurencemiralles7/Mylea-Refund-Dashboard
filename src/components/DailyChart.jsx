import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import { formatCurrency } from '../utils/csv'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-label">{label}</p>
      <p className="chart-tooltip-value">{formatCurrency(payload[0].value)}</p>
      <p className="chart-tooltip-sub">{payload[0].payload.count} refund{payload[0].payload.count !== 1 ? 's' : ''}</p>
    </div>
  )
}

export default function DailyChart({ data }) {
  if (!data.length) return <div className="empty-state">No daily data available</div>

  return (
    <div className="card">
      <h3 className="card-title">Refunds Made Daily</h3>
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.2} />
              <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="amount"
            stroke="var(--primary)"
            strokeWidth={2.5}
            fill="url(#areaGrad)"
            dot={{ r: 4, fill: 'var(--primary)', strokeWidth: 0 }}
            activeDot={{ r: 6 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
