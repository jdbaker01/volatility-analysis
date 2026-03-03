import { useState, useEffect } from 'react'
import { useAuth } from '../auth/AuthContext'
import PortfolioTree from './PortfolioTree'
import PortfolioForm from './PortfolioForm'
import HoldingsTable from './HoldingsTable'
import PortfolioAnalytics from './PortfolioAnalytics'

const API_BASE = import.meta.env.VITE_API_BASE || ''

export default function PortfolioPage() {
  const { user, signOut } = useAuth()
  const [portfolios, setPortfolios] = useState([])
  const [selectedPortfolio, setSelectedPortfolio] = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    fetchPortfolios()
  }, [])

  useEffect(() => {
    if (selectedPortfolio) {
      fetchAnalytics(selectedPortfolio.id)
    } else {
      setAnalytics(null)
    }
  }, [selectedPortfolio])

  const authHeaders = () => ({
    'Authorization': `Bearer ${user.token}`,
    'Content-Type': 'application/json',
  })

  const handleAuthError = (status) => {
    if (status === 401) { signOut(); return true }
    if (status === 403) { setError('Access denied'); signOut(); return true }
    return false
  }

  const fetchPortfolios = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/portfolios`, { headers: authHeaders() })
      if (handleAuthError(res.status)) return
      if (!res.ok) throw new Error('Failed to fetch portfolios')
      const data = await res.json()
      setPortfolios(data.portfolios)
    } catch (err) {
      setError(err.message)
    }
  }

  const fetchAnalytics = async (portfolioId) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/api/portfolios/${portfolioId}/analytics`, {
        headers: authHeaders(),
      })
      if (handleAuthError(res.status)) return
      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.detail || 'Failed to fetch analytics')
      }
      const data = await res.json()
      setAnalytics(data)
    } catch (err) {
      setError(err.message)
      setAnalytics(null)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (data) => {
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/api/portfolios`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(data),
      })
      if (handleAuthError(res.status)) return
      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.detail || 'Failed to create portfolio')
      }
      setShowForm(false)
      await fetchPortfolios()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDelete = async (portfolioId) => {
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/api/portfolios/${portfolioId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      })
      if (handleAuthError(res.status)) return
      if (!res.ok) throw new Error('Failed to delete portfolio')
      if (selectedPortfolio?.id === portfolioId) {
        setSelectedPortfolio(null)
        setAnalytics(null)
      }
      await fetchPortfolios()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleSaveHoldings = async (portfolioId, holdings) => {
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/api/portfolios/${portfolioId}/holdings`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ holdings }),
      })
      if (handleAuthError(res.status)) return
      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.detail || 'Failed to save holdings')
      }
      const updated = await res.json()
      setSelectedPortfolio(updated)
      await fetchPortfolios()
      fetchAnalytics(portfolioId)
    } catch (err) {
      setError(err.message)
    }
  }

  const handleSelect = (portfolio) => {
    setSelectedPortfolio(portfolio)
    setShowForm(false)
    setError(null)
  }

  return (
    <div className="flex flex-1">
      {/* Sidebar */}
      <aside className="w-56 bg-[#0d0d0d] border-r border-[#1f1f1f] flex flex-col">
        <div className="px-4 py-3 border-b border-[#1f1f1f] flex items-center justify-between">
          <span className="text-[10px] text-[#525252] tracking-wider">PORTFOLIOS</span>
          <button
            onClick={() => { setShowForm(true); setSelectedPortfolio(null) }}
            className="text-[10px] text-[#3b82f6] hover:text-white tracking-wider"
          >
            + NEW
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <PortfolioTree
            portfolios={portfolios}
            selectedId={selectedPortfolio?.id}
            onSelect={handleSelect}
            onDelete={handleDelete}
          />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-8 py-6">
          {error && (
            <div className="mb-6 px-4 py-3 bg-[#1c1917] border-l-2 border-[#dc2626] text-[13px] text-[#fca5a5]">
              {error}
            </div>
          )}

          {showForm && (
            <div className="mb-6">
              <PortfolioForm
                portfolios={portfolios}
                onSubmit={handleCreate}
                onCancel={() => setShowForm(false)}
              />
            </div>
          )}

          {selectedPortfolio && (
            <div className="space-y-6">
              <div className="flex items-baseline gap-3">
                <h2 className="text-[15px] font-semibold text-white tracking-tight">
                  {selectedPortfolio.name}
                </h2>
                <span className="text-[10px] text-[#525252] tracking-wider uppercase">
                  {selectedPortfolio.portfolio_type}
                </span>
              </div>

              {selectedPortfolio.portfolio_type === 'leaf' && (
                <HoldingsTable
                  holdings={selectedPortfolio.holdings || []}
                  onSave={handleSaveHoldings}
                  portfolioId={selectedPortfolio.id}
                />
              )}

              {loading && (
                <div className="text-[11px] text-[#525252] tracking-wider py-4">
                  LOADING ANALYTICS...
                </div>
              )}

              {analytics && !loading && <PortfolioAnalytics analytics={analytics} />}
            </div>
          )}

          {!selectedPortfolio && !showForm && (
            <div className="flex flex-col items-center justify-center py-24">
              <p className="text-[13px] text-[#525252] mb-4 tracking-wide">
                SELECT OR CREATE A PORTFOLIO
              </p>
              <button
                onClick={() => setShowForm(true)}
                className="px-4 py-2 text-xs font-medium text-[#a3a3a3] bg-[#111] border border-[#262626] hover:border-[#404040] hover:text-white transition-all tracking-wider"
              >
                + NEW PORTFOLIO
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
