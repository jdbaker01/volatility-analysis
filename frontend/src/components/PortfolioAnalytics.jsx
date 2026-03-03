export function formatDollar(val) {
  if (val === null || val === undefined) return '---'
  const abs = Math.abs(val)
  const formatted = abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  if (val > 0) return `+$${formatted}`
  if (val < 0) return `-$${formatted}`
  return `$${formatted}`
}

export function pnlColor(val) {
  if (val === null || val === undefined) return 'text-[#525252]'
  if (val > 0) return 'text-[#22c55e]'
  if (val < 0) return 'text-[#ef4444]'
  return 'text-[#a3a3a3]'
}

export default function PortfolioAnalytics({ analytics }) {
  if (!analytics) return null

  return (
    <div className="space-y-4">
      {/* Portfolio Value */}
      <div className="bg-[#111] border border-[#1f1f1f]">
        <div className="px-6 py-3 border-b border-[#1f1f1f]">
          <div className="text-[10px] text-[#525252] tracking-wider">PORTFOLIO VALUE</div>
        </div>
        <div className="px-6 py-4">
          <div className="text-2xl font-light text-white tabular-nums">
            ${analytics.current_value?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '0.00'}
          </div>
        </div>
      </div>

      {/* PnL */}
      <div className="bg-[#111] border border-[#1f1f1f]">
        <div className="px-6 py-3 border-b border-[#1f1f1f]">
          <div className="text-[10px] text-[#525252] tracking-wider">PROFIT & LOSS</div>
        </div>
        <div className="grid grid-cols-3 divide-x divide-[#1f1f1f]">
          {[
            { label: 'DAILY', value: analytics.daily_pnl },
            { label: 'WEEKLY', value: analytics.weekly_pnl },
            { label: 'MONTHLY', value: analytics.monthly_pnl },
          ].map(({ label, value }) => (
            <div key={label} className="px-6 py-4">
              <div className="text-[10px] text-[#525252] tracking-wider mb-1">{label}</div>
              <div className={`text-lg font-light tabular-nums ${pnlColor(value)}`}>
                {formatDollar(value)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* VaR */}
      <div className="bg-[#111] border border-[#1f1f1f]">
        <div className="px-6 py-3 border-b border-[#1f1f1f]">
          <div className="text-[10px] text-[#525252] tracking-wider">VALUE AT RISK (95% 1-DAY)</div>
        </div>
        <div className="grid grid-cols-2 divide-x divide-[#1f1f1f]">
          <div className="px-6 py-4">
            <div className="text-[10px] text-[#525252] tracking-wider mb-1">HISTORICAL</div>
            <div className="text-lg font-light text-[#ef4444] tabular-nums">
              {analytics.var?.historical?.var_95 != null
                ? `$${analytics.var.historical.var_95.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : '---'}
            </div>
            {analytics.var?.historical?.var_95_pct != null && (
              <div className="text-[10px] text-[#525252] mt-1">
                {analytics.var.historical.var_95_pct.toFixed(2)}% of portfolio
              </div>
            )}
          </div>
          <div className="px-6 py-4">
            <div className="text-[10px] text-[#525252] tracking-wider mb-1">PARAMETRIC</div>
            <div className="text-lg font-light text-[#ef4444] tabular-nums">
              {analytics.var?.parametric?.var_95 != null
                ? `$${analytics.var.parametric.var_95.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : '---'}
            </div>
            {analytics.var?.parametric?.var_95_pct != null && (
              <div className="text-[10px] text-[#525252] mt-1">
                {analytics.var.parametric.var_95_pct.toFixed(2)}% of portfolio
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Holdings Detail */}
      {analytics.holdings_detail && analytics.holdings_detail.length > 0 && (
        <div className="bg-[#111] border border-[#1f1f1f]">
          <div className="px-6 py-3 border-b border-[#1f1f1f]">
            <div className="text-[10px] text-[#525252] tracking-wider">POSITIONS</div>
          </div>
          <div className="grid grid-cols-4 px-6 py-2 text-[10px] text-[#525252] tracking-wider border-b border-[#1f1f1f]">
            <span>TICKER</span>
            <span>SHARES</span>
            <span>PRICE</span>
            <span>VALUE</span>
          </div>
          {analytics.holdings_detail.map((h) => (
            <div key={h.ticker} className="grid grid-cols-4 px-6 py-2.5 border-b border-[#1f1f1f] text-[13px]">
              <span className="text-white font-medium tracking-wide">{h.ticker}</span>
              <span className="text-[#a3a3a3] tabular-nums">{h.shares}</span>
              <span className="text-[#a3a3a3] tabular-nums">${h.current_price?.toFixed(2)}</span>
              <span className="text-[#a3a3a3] tabular-nums">${h.market_value?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
