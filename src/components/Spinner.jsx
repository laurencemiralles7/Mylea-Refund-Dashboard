export default function Spinner({ message = 'Loading data…' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', gap: 16 }}>
      <div className="spinner" />
      <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>{message}</p>
    </div>
  )
}
