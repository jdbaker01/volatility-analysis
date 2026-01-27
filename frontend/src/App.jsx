import { useState, useEffect } from 'react'
import TickerInput from './components/TickerInput'
import VolatilityTable from './components/VolatilityTable'
import VolatilityChart from './components/VolatilityChart'
import ReturnsTable from './components/ReturnsTable'

const API_BASE = 'http://localhost:8000'
const HISTORY_KEY = 'volatility_history'
const MAX_HISTORY = 10

export default function App() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [history, setHistory] = useState([])

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

    try {
      const response = await fetch(`${API_BASE}/api/volatility/${ticker}`)

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

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      {/* Header */}
      <header className="bg-[#1e3a5f] border-b border-[#2d4a6f]">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="text-[15px] font-semibold tracking-tight text-white">
              VOLATILITY TERMINAL
            </h1>
            <div className="h-4 w-px bg-[#3d5a7f]" />
            <TickerInput onSubmit={fetchVolatility} loading={loading} />
          </div>
          <div className="text-xs text-[#7da3c9] tracking-wide">
            HISTORICAL ANALYSIS
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* History Sidebar */}
        <aside className="w-48 bg-[#0d0d0d] border-r border-[#1f1f1f] flex flex-col">
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
          <div className="max-w-5xl mx-auto px-8 py-6">
            {/* Error State */}
            {error && (
              <div className="mb-6 px-4 py-3 bg-[#1c1917] border-l-2 border-[#dc2626] text-[13px] text-[#fca5a5]">
                {error}
              </div>
            )}

            {/* Data Display */}
            {data && (
              <div className="space-y-6">
                <VolatilityTable data={data} />
                <VolatilityChart data={data} />
                <ReturnsTable data={data} />
              </div>
            )}

            {/* Empty State */}
            {!data && !error && !loading && (
              <div className="flex flex-col items-center justify-center py-24">
                <p className="text-[13px] text-[#525252] mb-6 tracking-wide">
                  ENTER SYMBOL TO ANALYZE
                </p>
                <div className="flex gap-2">
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
        <div className="px-6 py-3 flex justify-between">
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
