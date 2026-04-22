import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import StoreDashboard from './pages/StoreDashboard'
import { STORES } from './config'

export default function App() {
  const defaultStore = STORES[0]?.id

  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={defaultStore ? <Navigate to={`/store/${defaultStore}`} replace /> : <Home />} />
          <Route path="/stores" element={<Home />} />
          <Route path="/store/:storeId" element={<StoreDashboard />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
