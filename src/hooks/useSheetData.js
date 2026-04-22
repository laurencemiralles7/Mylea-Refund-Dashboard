import { useState, useEffect, useCallback } from 'react'
import { parseCSV } from '../utils/csv'
import { SPREADSHEET_ID, REFRESH_INTERVAL_MS } from '../config'

function buildUrl(sheetName) {
  return `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`
}

export function useSheetData(sheetName) {
  const [rows, setRows] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(buildUrl(sheetName))
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const text = await res.text()
      // gviz returns HTML on error instead of CSV
      if (text.trim().startsWith('<')) throw new Error('Sheet not found or not public')
      const parsed = parseCSV(text)
      setRows(parsed)
      setLastUpdated(new Date())
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [sheetName])

  useEffect(() => {
    setLoading(true)
    setRows(null)
    setError(null)
    fetchData()
    const timer = setInterval(fetchData, REFRESH_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [fetchData])

  return { rows, loading, error, lastUpdated, refresh: fetchData }
}
