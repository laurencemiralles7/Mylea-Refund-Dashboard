import { Link } from 'react-router-dom'
import { STORES } from '../config'

export default function Home() {
  return (
    <div className="home-page">
      <div className="home-header">
        <h1>Refund Dashboard</h1>
        <p className="home-subtitle">Select a store to view its refund analytics</p>
      </div>

      <div className="store-grid">
        {STORES.map(store => (
          <Link key={store.id} to={`/store/${store.id}`} className="store-card">
            <div className="store-card-icon" style={{ background: `${store.color}18`, color: store.color }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
            <div className="store-card-info">
              <h2 style={{ color: store.color }}>{store.name}</h2>
              <p>View refund analytics →</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
