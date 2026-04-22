import { useState } from 'react'
import { PRESETS, getAvailableMonths } from '../utils/dateFilters'

export default function DateFilter({ rows, value, onChange }) {
  const [showMonthPicker, setShowMonthPicker] = useState(false)
  const [showCustom, setShowCustom] = useState(false)
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  const availableMonths = rows ? getAvailableMonths(rows) : []

  function handlePreset(id) {
    setShowMonthPicker(false)
    setShowCustom(false)
    onChange({ type: 'preset', id })
  }

  function handleMonth(year, month, label) {
    setShowMonthPicker(false)
    onChange({ type: 'month', year, month, label })
  }

  function handleCustomApply() {
    if (!customStart || !customEnd) return
    onChange({ type: 'custom', start: customStart, end: customEnd })
    setShowCustom(false)
  }

  function getLabel() {
    if (!value) return 'All Time'
    if (value.type === 'preset') return PRESETS.find(p => p.id === value.id)?.label ?? 'All Time'
    if (value.type === 'month') return value.label
    if (value.type === 'custom') return `${value.start} → ${value.end}`
    return 'All Time'
  }

  const activePresetId = value?.type === 'preset' ? value.id : value == null ? 'all_time' : null

  return (
    <div className="date-filter-wrap">
      {/* Quick preset pills */}
      <div className="filter-pills">
        {PRESETS.slice(0, 6).map(p => (
          <button
            key={p.id}
            className={`filter-pill ${activePresetId === p.id ? 'active' : ''}`}
            onClick={() => handlePreset(p.id)}
          >
            {p.label}
          </button>
        ))}

        {/* More presets dropdown */}
        <div className="filter-dropdown-wrap">
          <button
            className={`filter-pill ${['last_3_months','last_6_months','this_year','all_time'].includes(activePresetId) ? 'active' : ''}`}
            onClick={() => { setShowMonthPicker(false); setShowCustom(false); }}
          >
            More ▾
          </button>
          <div className="filter-dropdown">
            {PRESETS.slice(6).map(p => (
              <button
                key={p.id}
                className={`dropdown-item ${activePresetId === p.id ? 'active' : ''}`}
                onClick={() => handlePreset(p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Month picker */}
        <div className="filter-dropdown-wrap">
          <button
            className={`filter-pill ${value?.type === 'month' ? 'active' : ''}`}
            onClick={() => { setShowMonthPicker(v => !v); setShowCustom(false) }}
          >
            By Month ▾
          </button>
          {showMonthPicker && (
            <div className="filter-dropdown month-dropdown">
              {availableMonths.length === 0
                ? <p className="dropdown-empty">No data yet</p>
                : availableMonths.map(m => (
                  <button
                    key={`${m.year}-${m.month}`}
                    className={`dropdown-item ${value?.type === 'month' && value.year === m.year && value.month === m.month ? 'active' : ''}`}
                    onClick={() => handleMonth(m.year, m.month, m.label)}
                  >
                    {m.label}
                  </button>
                ))
              }
            </div>
          )}
        </div>

        {/* Custom range */}
        <div className="filter-dropdown-wrap">
          <button
            className={`filter-pill ${value?.type === 'custom' ? 'active' : ''}`}
            onClick={() => { setShowCustom(v => !v); setShowMonthPicker(false) }}
          >
            Custom ▾
          </button>
          {showCustom && (
            <div className="filter-dropdown custom-dropdown">
              <label className="custom-label">From</label>
              <input
                type="date"
                className="custom-date-input"
                value={customStart}
                onChange={e => setCustomStart(e.target.value)}
              />
              <label className="custom-label">To</label>
              <input
                type="date"
                className="custom-date-input"
                value={customEnd}
                onChange={e => setCustomEnd(e.target.value)}
              />
              <button className="custom-apply-btn" onClick={handleCustomApply}>
                Apply
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Active filter badge */}
      {value && (
        <div className="active-filter-badge">
          <span>Showing: <strong>{getLabel()}</strong></span>
          <button className="clear-filter" onClick={() => onChange(null)} title="Clear filter">✕</button>
        </div>
      )}
    </div>
  )
}
