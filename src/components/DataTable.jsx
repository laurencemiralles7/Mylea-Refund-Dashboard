import { formatCurrency } from '../utils/csv'

const REASON_COLORS = {
  'Order Cancellation': '#6366F1',
  'Not Satisfied': '#F59E0B',
  'Chargeback': '#EF4444',
  'Damaged': '#EC4899',
  'Wrong Item': '#8B5CF6',
  'Defective': '#EF4444',
}

function Badge({ text }) {
  const color = REASON_COLORS[text]
  if (!color) return <span>{text}</span>
  return (
    <span className="badge" style={{ background: `${color}18`, color }}>
      {text}
    </span>
  )
}

/**
 * Reusable sortable table for grouped data.
 * rows: [{ key, label, count, amount }]
 * showBadge: if true, renders label as a colored badge
 * truncate: if true, truncates long labels
 */
export default function DataTable({ title, rows, showBadge = false, truncate = false, emptyMessage = 'No data' }) {
  if (!rows.length) return (
    <div className="card">
      <h3 className="card-title">{title}</h3>
      <div className="empty-state">{emptyMessage}</div>
    </div>
  )

  const total = rows.reduce((s, r) => s + r.amount, 0)
  const maxAmount = Math.max(...rows.map(r => r.amount))

  return (
    <div className="card">
      <h3 className="card-title">{title}</h3>
      <table className="data-table">
        <thead>
          <tr>
            <th style={{ textAlign: 'left' }}>{title.split(' ')[0]}</th>
            <th style={{ textAlign: 'right' }}>Count</th>
            <th style={{ textAlign: 'right' }}>Amount</th>
            <th style={{ textAlign: 'right' }}>Share</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => {
            const share = total > 0 ? (row.amount / total) * 100 : 0
            return (
              <tr key={row.key}>
                <td>
                  <div className="table-label-cell">
                    {showBadge
                      ? <Badge text={row.label} />
                      : <span className={truncate ? 'truncate-label' : ''} title={row.label}>{row.label}</span>
                    }
                    <div className="share-bar-track">
                      <div
                        className="share-bar-fill"
                        style={{ width: `${(row.amount / maxAmount) * 100}%` }}
                      />
                    </div>
                  </div>
                </td>
                <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{row.count}</td>
                <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                  {formatCurrency(row.amount)}
                </td>
                <td style={{ textAlign: 'right', color: 'var(--text-muted)', fontSize: 13 }}>
                  {share.toFixed(0)}%
                </td>
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr>
            <td style={{ fontWeight: 600 }}>Total</td>
            <td style={{ textAlign: 'right', fontWeight: 600 }}>{rows.reduce((s, r) => s + r.count, 0)}</td>
            <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(total)}</td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
