export default function KpiCard({ label, value, sub, icon, accent = 'var(--primary)' }) {
  return (
    <div className="card kpi-card">
      <div className="kpi-top">
        <span className="kpi-label">{label}</span>
        {icon && <span className="kpi-icon" style={{ color: accent }}>{icon}</span>}
      </div>
      <div className="kpi-value" style={{ color: accent }}>{value}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  )
}
