import { useState } from 'react'

export default function TickerInput({ onSubmit, loading }) {
  const [ticker, setTicker] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (ticker.trim()) {
      onSubmit(ticker.trim().toUpperCase())
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <input
        type="text"
        value={ticker}
        onChange={(e) => setTicker(e.target.value.toUpperCase())}
        placeholder="SYMBOL"
        className="w-28 px-3 py-1.5 bg-[#163352] border border-[#2d5a8a] text-white text-sm font-medium tracking-wider placeholder-[#4a7ab0] focus:outline-none focus:border-[#4a8ed0] focus:bg-[#1a4060] transition-colors"
        disabled={loading}
        maxLength={5}
      />
      <button
        type="submit"
        disabled={loading || !ticker.trim()}
        className="px-3 py-1.5 text-xs font-medium tracking-wider bg-[#2563eb] border border-[#3b82f6] text-white hover:bg-[#3b82f6] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
      >
        {loading ? '...' : 'GO'}
      </button>
    </form>
  )
}
