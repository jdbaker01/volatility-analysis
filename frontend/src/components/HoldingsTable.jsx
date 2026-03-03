import { useState } from 'react'

export default function HoldingsTable({ holdings, onSave, portfolioId }) {
  const [editing, setEditing] = useState(false)
  const [rows, setRows] = useState(holdings)
  const [newTicker, setNewTicker] = useState('')
  const [newShares, setNewShares] = useState('')

  const handleAdd = () => {
    if (!newTicker.trim() || !newShares || parseFloat(newShares) <= 0) return
    const updated = [...rows, { ticker: newTicker.toUpperCase().trim(), shares: parseFloat(newShares) }]
    setRows(updated)
    setNewTicker('')
    setNewShares('')
  }

  const handleRemove = (index) => {
    setRows(rows.filter((_, i) => i !== index))
  }

  const handleSave = () => {
    onSave(portfolioId, rows)
    setEditing(false)
  }

  const handleCancel = () => {
    setRows(holdings)
    setEditing(false)
    setNewTicker('')
    setNewShares('')
  }

  return (
    <div className="bg-[#111] border border-[#1f1f1f]">
      <div className="px-6 py-4 border-b border-[#1f1f1f] flex items-center justify-between">
        <div className="text-[11px] text-[#525252] tracking-wider">HOLDINGS</div>
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="text-[10px] text-[#3b82f6] hover:text-white tracking-wider"
          >
            EDIT
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="text-[10px] text-[#22c55e] hover:text-white tracking-wider"
            >
              SAVE
            </button>
            <button
              onClick={handleCancel}
              className="text-[10px] text-[#737373] hover:text-white tracking-wider"
            >
              CANCEL
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 px-6 py-2 text-[10px] text-[#525252] tracking-wider border-b border-[#1f1f1f]">
        <span>TICKER</span>
        <span>SHARES</span>
        {editing && <span></span>}
      </div>

      {rows.length === 0 && !editing && (
        <div className="px-6 py-6 text-center text-[11px] text-[#404040]">
          No holdings
        </div>
      )}

      {rows.map((h, i) => (
        <div key={`${h.ticker}-${i}`} className="grid grid-cols-3 px-6 py-2.5 border-b border-[#1f1f1f] text-[13px]">
          <span className="text-white font-medium tracking-wide">{h.ticker}</span>
          <span className="text-[#a3a3a3] tabular-nums">{h.shares}</span>
          {editing && (
            <button
              onClick={() => handleRemove(i)}
              className="text-[10px] text-[#404040] hover:text-[#ef4444] text-right"
              aria-label={`remove ${h.ticker}`}
            >
              REMOVE
            </button>
          )}
        </div>
      ))}

      {editing && (
        <div className="grid grid-cols-3 gap-2 px-6 py-3 border-t border-[#262626]">
          <input
            type="text"
            value={newTicker}
            onChange={(e) => setNewTicker(e.target.value.toUpperCase())}
            placeholder="TICKER"
            maxLength={10}
            className="px-2 py-1.5 bg-[#0a0a0a] border border-[#262626] text-[12px] text-white placeholder-[#404040] focus:border-[#3b82f6] focus:outline-none"
          />
          <input
            type="number"
            value={newShares}
            onChange={(e) => setNewShares(e.target.value)}
            placeholder="Shares"
            min="0"
            step="any"
            className="px-2 py-1.5 bg-[#0a0a0a] border border-[#262626] text-[12px] text-white placeholder-[#404040] focus:border-[#3b82f6] focus:outline-none"
          />
          <button
            onClick={handleAdd}
            className="text-[10px] text-[#3b82f6] hover:text-white tracking-wider"
          >
            + ADD
          </button>
        </div>
      )}
    </div>
  )
}
