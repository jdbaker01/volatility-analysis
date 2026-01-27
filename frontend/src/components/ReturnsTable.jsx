export default function ReturnsTable({ data }) {
  const formatReturn = (value) => {
    if (value === null || value === undefined) return '—'
    const percent = (value * 100).toFixed(2)
    return `${value >= 0 ? '+' : ''}${percent}%`
  }

  const getReturnColor = (value) => {
    if (value === null || value === undefined) return 'text-[#525252]'
    if (value > 0) return 'text-[#22c55e]'
    if (value < 0) return 'text-[#ef4444]'
    return 'text-[#a3a3a3]'
  }

  const returns = data.returns || {}

  const periods = [
    { key: 'daily', label: 'DAILY' },
    { key: 'week', label: '1 WEEK' },
    { key: 'month', label: '1 MONTH' },
    { key: 'ytd', label: 'YTD' },
  ]

  return (
    <div className="bg-[#111] border border-[#1f1f1f]">
      <div className="px-6 py-4 border-b border-[#1f1f1f]">
        <div className="text-[11px] text-[#525252] tracking-wider">RETURNS</div>
      </div>
      <div className="grid grid-cols-4 divide-x divide-[#1f1f1f]">
        {periods.map(({ key, label }) => (
          <div key={key} className="px-6 py-4 text-center">
            <div className="text-[10px] text-[#525252] tracking-wider mb-2">{label}</div>
            <div className={`text-lg font-light tabular-nums ${getReturnColor(returns[key])}`}>
              {formatReturn(returns[key])}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
