const getPercentileColor = (percentile) => {
  if (percentile < 25) return 'text-[#22c55e]'
  if (percentile < 50) return 'text-[#4ade80]'
  if (percentile < 75) return 'text-[#fbbf24]'
  if (percentile < 90) return 'text-[#f97316]'
  return 'text-[#ef4444]'
}

const formatOrdinal = (n) => {
  const rounded = Math.round(n)
  const s = ['th', 'st', 'nd', 'rd']
  const v = rounded % 100
  return rounded + (s[(v - 20) % 10] || s[v] || s[0])
}

export default function VolatilityTable({ data }) {
  const formatPercent = (value) => `${(value * 100).toFixed(2)}%`
  const formatPrice = (value) => value?.toFixed(2) || '—'

  const pricePosition = ((data.current_price - data.daily_low) / (data.daily_high - data.daily_low)) * 100

  return (
    <div className="bg-[#111] border border-[#1f1f1f]">
      {/* Quote Header */}
      <div className="px-6 py-4 border-b border-[#1f1f1f]">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-baseline gap-3">
              <span className="text-2xl font-semibold text-white tracking-tight">{data.ticker}</span>
              <span className="text-[28px] font-light text-white tabular-nums">{formatPrice(data.current_price)}</span>
            </div>
          </div>

          {/* Range Data */}
          <div className="text-right space-y-2">
            <div>
              <div className="text-[10px] text-[#525252] tracking-wider mb-1">DAILY RANGE</div>
              <div className="flex items-center justify-end gap-4 text-[12px] tabular-nums">
                <div>
                  <span className="text-[#525252]">O </span>
                  <span className="text-[#a3a3a3]">{formatPrice(data.daily_open)}</span>
                </div>
                <div>
                  <span className="text-[#525252]">H </span>
                  <span className="text-[#22c55e]">{formatPrice(data.daily_high)}</span>
                </div>
                <div>
                  <span className="text-[#525252]">L </span>
                  <span className="text-[#ef4444]">{formatPrice(data.daily_low)}</span>
                </div>
              </div>
            </div>
            <div>
              <div className="text-[10px] text-[#525252] tracking-wider mb-1">MONTHLY RANGE</div>
              <div className="flex items-center justify-end gap-4 text-[12px] tabular-nums">
                <div>
                  <span className="text-[#525252]">H </span>
                  <span className="text-[#22c55e]">{formatPrice(data.monthly_high)}</span>
                </div>
                <div>
                  <span className="text-[#525252]">L </span>
                  <span className="text-[#ef4444]">{formatPrice(data.monthly_low)}</span>
                </div>
              </div>
            </div>
            <div>
              <div className="text-[10px] text-[#525252] tracking-wider mb-1">YEARLY RANGE</div>
              <div className="flex items-center justify-end gap-4 text-[12px] tabular-nums">
                <div>
                  <span className="text-[#525252]">H </span>
                  <span className="text-[#22c55e]">{formatPrice(data.yearly_high)}</span>
                </div>
                <div>
                  <span className="text-[#525252]">L </span>
                  <span className="text-[#ef4444]">{formatPrice(data.yearly_low)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Price Range Bar */}
        <div className="mt-4">
          <div className="relative h-1 bg-[#1f1f1f]">
            <div
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#ef4444] via-[#a3a3a3] to-[#22c55e]"
              style={{ width: '100%' }}
            />
            <div
              className="absolute top-1/2 w-2 h-2 bg-white rounded-full -translate-y-1/2 -translate-x-1/2 shadow-sm"
              style={{ left: `${Math.max(2, Math.min(98, pricePosition || 50))}%` }}
            />
          </div>
          <div className="flex justify-between mt-1 text-[10px] text-[#525252]">
            <span>{formatPrice(data.daily_low)}</span>
            <span>{formatPrice(data.daily_high)}</span>
          </div>
        </div>

      </div>

      {/* Returns */}
      <div className="grid grid-cols-4 divide-x divide-[#1f1f1f] border-b border-[#1f1f1f]">
        {[
          { key: 'daily', label: 'DAILY' },
          { key: 'week', label: '1 WEEK' },
          { key: 'month', label: '1 MONTH' },
          { key: 'ytd', label: 'YTD' },
        ].map(({ key, label }) => {
          const value = data.returns?.[key]
          const formatted = value === null || value === undefined
            ? '—'
            : `${value >= 0 ? '+' : ''}${(value * 100).toFixed(2)}%`
          const color = value === null || value === undefined
            ? 'text-[#525252]'
            : value > 0
              ? 'text-[#22c55e]'
              : value < 0
                ? 'text-[#ef4444]'
                : 'text-[#a3a3a3]'
          return (
            <div key={key} className="px-6 py-4 text-center">
              <div className="text-[10px] text-[#525252] tracking-wider mb-2">{label}</div>
              <div className={`text-lg font-light tabular-nums ${color}`}>
                {formatted}
              </div>
            </div>
          )
        })}
      </div>

      {/* RSI */}
      <div className="px-6 py-4 border-b border-[#1f1f1f]">
        <div className="flex items-center justify-between">
          <div className="text-[11px] text-[#525252] tracking-wider">14-DAY RSI</div>
          <div className="flex items-center gap-3">
            <span className={`text-lg font-light tabular-nums ${
              data.rsi_14d == null
                ? 'text-[#525252]'
                : data.rsi_14d > 70
                  ? 'text-[#ef4444]'
                  : data.rsi_14d < 30
                    ? 'text-[#22c55e]'
                    : 'text-white'
            }`}>
              {data.rsi_14d != null ? data.rsi_14d.toFixed(2) : '—'}
            </span>
            {data.rsi_14d != null && (
              <span className={`text-[11px] tracking-wider ${
                data.rsi_14d > 70
                  ? 'text-[#ef4444]'
                  : data.rsi_14d < 30
                    ? 'text-[#22c55e]'
                    : 'text-[#525252]'
              }`}>
                {data.rsi_14d > 70 ? 'OVERBOUGHT' : data.rsi_14d < 30 ? 'OVERSOLD' : 'NEUTRAL'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Volatility Grid */}
      <div className="grid grid-cols-2 divide-x divide-[#1f1f1f]">
        {/* 30-Day */}
        <div className="p-6">
          <div className="text-[11px] text-[#525252] tracking-wider mb-4">30-DAY VOLATILITY</div>
          <div className="text-3xl font-light text-white tabular-nums mb-2">
            {formatPercent(data.vol_30d)}
          </div>
          <div className={`text-sm ${getPercentileColor(data.vol_30d_percentile)}`}>
            {formatOrdinal(data.vol_30d_percentile)} percentile
          </div>
        </div>

        {/* 90-Day */}
        <div className="p-6">
          <div className="text-[11px] text-[#525252] tracking-wider mb-4">90-DAY VOLATILITY</div>
          <div className="text-3xl font-light text-white tabular-nums mb-2">
            {formatPercent(data.vol_90d)}
          </div>
          <div className={`text-sm ${getPercentileColor(data.vol_90d_percentile)}`}>
            {formatOrdinal(data.vol_90d_percentile)} percentile
          </div>
        </div>
      </div>

      {/* Historical Thresholds */}
      <div className="px-6 py-4 bg-[#0a0a0a] border-t border-[#1f1f1f]">
        <div className="text-[11px] text-[#525252] tracking-wider mb-3">HISTORICAL THRESHOLDS</div>
        <div className="grid grid-cols-2 gap-8">
          <div className="space-y-2">
            <div className="flex justify-between text-[12px]">
              <span className="text-[#525252]">30D p50</span>
              <span className="text-[#737373] tabular-nums">{formatPercent(data.percentile_thresholds['30d'].p50)}</span>
            </div>
            <div className="flex justify-between text-[12px]">
              <span className="text-[#525252]">30D p90</span>
              <span className="text-[#737373] tabular-nums">{formatPercent(data.percentile_thresholds['30d'].p90)}</span>
            </div>
            <div className="flex justify-between text-[12px]">
              <span className="text-[#525252]">30D p99</span>
              <span className="text-[#737373] tabular-nums">{formatPercent(data.percentile_thresholds['30d'].p99)}</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-[12px]">
              <span className="text-[#525252]">90D p50</span>
              <span className="text-[#737373] tabular-nums">{formatPercent(data.percentile_thresholds['90d'].p50)}</span>
            </div>
            <div className="flex justify-between text-[12px]">
              <span className="text-[#525252]">90D p90</span>
              <span className="text-[#737373] tabular-nums">{formatPercent(data.percentile_thresholds['90d'].p90)}</span>
            </div>
            <div className="flex justify-between text-[12px]">
              <span className="text-[#525252]">90D p99</span>
              <span className="text-[#737373] tabular-nums">{formatPercent(data.percentile_thresholds['90d'].p99)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
