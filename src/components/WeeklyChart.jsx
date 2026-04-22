import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts'
import { formatCurrency } from '../utils/csv'

const COLORS = ['#6366F1', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6']

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

export default function WeeklyChart({ data }) {
  if (!data.length) return <div className="empty-state">No weekly data available</div>

  return (
    <div className="card">
      <h3 className="card-title">Weekly Refunds</h3>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99,102,241,0.08)' }} />
          <Bar dataKey="amount" radius={[6, 6, 0, 0]} maxBarSize={64}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
