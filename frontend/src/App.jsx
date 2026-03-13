import { useState, useEffect } from 'react'
import { useAuth } from './auth/AuthContext'
import TickerInput from './components/TickerInput'
import VolatilityTable from './components/VolatilityTable'
import VolatilityChart from './components/VolatilityChart'
import SignInPage from './components/SignInPage'

const API_BASE = import.meta.env.VITE_API_BASE || ''
const HISTORY_KEY = 'volatility_history'
const MAX_HISTORY = 10

export default function App() {
  const { user, loading: authLoading, signOut } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [history, setHistory] = useState([])
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Load history from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(HISTORY_KEY)
    if (saved) {
      setHistory(JSON.parse(saved))
    }
  }, [])

  // Save history to localStorage
  const addToHistory = (ticker) => {
    setHistory((prev) => {
      const filtered = prev.filter((t) => t !== ticker)
      const updated = [ticker, ...filtered].slice(0, MAX_HISTORY)
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updated))
      return updated
    })
  }

  const fetchVolatility = async (ticker) => {
    setLoading(true)
    setError(null)
    setSidebarOpen(false)

    try {
      const response = await fetch(`${API_BASE}/api/volatility/${ticker}`, {
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
      })

      if (response.status === 401) {
        signOut()
        return
      }

      if (response.status === 403) {
        setError('Access denied — your account is not authorized')
        signOut()
        return
      }

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to fetch volatility data')
      }

      const result = await response.json()
      setData(result)
      addToHistory(ticker.toUpperCase())
    } catch (err) {
      setError(err.message)
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  const clearHistory = () => {
    setHistory([])
    localStorage.removeItem(HISTORY_KEY)
  }

  if (authLoading) return null
  if (!user) return <SignInPage googleClientId={import.meta.env.VITE_GOOGLE_CLIENT_ID} />

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      {/* Header */}
      <header className="bg-[#1e3a5f] border-b border-[#2d4a6f]">
        <div className="px-4 md:px-6 py-3 md:py-4 flex flex-wrap items-center gap-x-3 gap-y-2">
          {/* Mobile sidebar toggle */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:hidden text-white p-1"
            aria-label="Toggle sidebar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="text-[13px] md:text-[15px] font-semibold tracking-tight text-white whitespace-nowrap">
            INVESTMENT ANALYSIS
          </h1>
          <div className="hidden md:block h-4 w-px bg-[#3d5a7f]" />
          {/* On mobile: full-width row below; on desktop: inline after title */}
          <div className="order-last w-full md:order-none md:w-auto">
            <TickerInput onSubmit={fetchVolatility} loading={loading} />
          </div>
          <div className="flex items-center gap-2 md:gap-3 ml-auto">
            {user.picture && (
              <img
                src={user.picture}
                alt={user.name}
                className="w-6 h-6 rounded-full"
                referrerPolicy="no-referrer"
              />
            )}
            <span className="hidden md:inline text-xs text-[#7da3c9]">{user.email}</span>
            <button
              onClick={signOut}
              className="text-xs text-[#4a7ab0] hover:text-white tracking-wider"
            >
              SIGN OUT
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 relative">
        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div
            className="md:hidden fixed inset-0 bg-black/50 z-20"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* History Sidebar */}
        <aside className={`
          fixed md:relative z-30 md:z-auto
          top-0 md:top-auto left-0 h-full md:h-auto
          w-48 bg-[#0d0d0d] border-r border-[#1f1f1f] flex flex-col
          transform transition-transform duration-200 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0
        `}>
          <div className="px-4 py-3 border-b border-[#1f1f1f] flex items-center justify-between">
            <span className="text-[10px] text-[#525252] tracking-wider">RECENT</span>
            {history.length > 0 && (
              <button
                onClick={clearHistory}
                className="text-[10px] text-[#404040] hover:text-[#737373] tracking-wider"
              >
                CLEAR
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto">
            {history.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-[11px] text-[#404040]">No history yet</p>
              </div>
            ) : (
              <div className="py-1">
                {history.map((ticker, index) => (
                  <button
                    key={ticker}
                    onClick={() => fetchVolatility(ticker)}
                    className={`w-full px-4 py-2.5 text-left text-[13px] font-medium tracking-wide transition-colors ${
                      data?.ticker === ticker
                        ? 'bg-[#1a1a1a] text-white border-l-2 border-[#3b82f6]'
                        : 'text-[#737373] hover:bg-[#111] hover:text-[#a3a3a3]'
                    }`}
                  >
                    <span className="text-[10px] text-[#404040] mr-2">{index + 1}</span>
                    {ticker}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="px-4 py-3 border-t border-[#1f1f1f]">
            <p className="text-[9px] text-[#333] tracking-wider">MAX {MAX_HISTORY} ITEMS</p>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-4 md:px-8 py-4 md:py-6">
            {/* Error State */}
            {error && (
              <div className="mb-4 md:mb-6 px-4 py-3 bg-[#1c1917] border-l-2 border-[#dc2626] text-[13px] text-[#fca5a5]">
                {error}
              </div>
            )}

            {/* Data Display */}
            {data && (
              <div className="space-y-4 md:space-y-6">
                <VolatilityTable data={data} />
                <VolatilityChart data={data} />
              </div>
            )}

            {/* Empty State */}
            {!data && !error && !loading && (
              <div className="flex flex-col items-center justify-center py-16 md:py-24">
                <p className="text-[13px] text-[#525252] mb-6 tracking-wide">
                  ENTER SYMBOL TO ANALYZE
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {['SPY', 'QQQ', 'IWM', 'DIA', 'VIX'].map((symbol) => (
                    <button
                      key={symbol}
                      onClick={() => fetchVolatility(symbol)}
                      className="px-4 py-2 text-xs font-medium text-[#a3a3a3] bg-[#111] border border-[#262626] hover:border-[#404040] hover:text-white transition-all tracking-wider"
                    >
                      {symbol}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-[#1f1f1f]">
        <div className="px-4 md:px-6 py-3 flex flex-col md:flex-row md:justify-between gap-1">
          <p className="text-[11px] text-[#404040] tracking-wide">
            DATA: YAHOO FINANCE
          </p>
          <p className="text-[11px] text-[#404040] tracking-wide">
            VOL = ANNUALIZED STDEV OF DAILY RETURNS
          </p>
        </div>
      </footer>
    </div>
  )
}
