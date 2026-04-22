import { NavLink } from 'react-router-dom'
import { STORES } from '../config'

export default function Layout({ children }) {
  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <rect width="28" height="28" rx="8" fill="var(--primary)" />
            <path d="M7 14h14M14 7l7 7-7 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>Refund Hub</span>
        </div>

        <nav className="sidebar-nav">
          <p className="sidebar-section-label">Stores</p>
          {STORES.map(store => (
            <NavLink
              key={store.id}
              to={`/store/${store.id}`}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              style={({ isActive }) => isActive ? { '--store-color': store.color } : {}}
            >
              <span
                className="store-dot"
                style={{ background: store.color }}
              />
              {store.name}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <a
            href={`https://docs.google.com/spreadsheets/d/1gi5a0YMylYnTJ1vAbM-_YI3j00hL8bAhzfKtZP4sg_Q`}
            target="_blank"
            rel="noopener noreferrer"
            className="sidebar-sheets-link"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            View Source Sheet
          </a>
        </div>
      </aside>

      <main className="main-content">
        {children}
      </main>
    </div>
  )
}
