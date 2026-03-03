import { useState } from 'react'

export default function PortfolioForm({ portfolios, onSubmit, onCancel }) {
  const [name, setName] = useState('')
  const [type, setType] = useState('leaf')
  const [parentId, setParentId] = useState('')

  const groupPortfolios = portfolios.filter((p) => p.portfolio_type === 'group')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!name.trim()) return
    onSubmit({
      name: name.trim(),
      portfolio_type: type,
      parent_id: parentId || null,
    })
    setName('')
    setType('leaf')
    setParentId('')
  }

  return (
    <form onSubmit={handleSubmit} className="bg-[#111] border border-[#1f1f1f] p-6 space-y-4">
      <div className="text-[11px] text-[#525252] tracking-wider mb-4">NEW PORTFOLIO</div>

      <div>
        <label className="block text-[10px] text-[#525252] tracking-wider mb-1">NAME</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Portfolio name"
          className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#262626] text-[13px] text-white placeholder-[#404040] focus:border-[#3b82f6] focus:outline-none"
          maxLength={100}
        />
      </div>

      <div>
        <label className="block text-[10px] text-[#525252] tracking-wider mb-1">TYPE</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#262626] text-[13px] text-white focus:border-[#3b82f6] focus:outline-none"
        >
          <option value="leaf">Leaf (holds securities)</option>
          <option value="group">Group (holds portfolios)</option>
        </select>
      </div>

      {groupPortfolios.length > 0 && (
        <div>
          <label className="block text-[10px] text-[#525252] tracking-wider mb-1">PARENT</label>
          <select
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
            className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#262626] text-[13px] text-white focus:border-[#3b82f6] focus:outline-none"
          >
            <option value="">None (top-level)</option>
            {groupPortfolios.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          className="px-4 py-2 text-[11px] font-medium tracking-wider bg-[#2563eb] text-white hover:bg-[#1d4ed8] transition-colors"
        >
          CREATE
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-[11px] font-medium tracking-wider text-[#737373] hover:text-white transition-colors"
        >
          CANCEL
        </button>
      </div>
    </form>
  )
}
