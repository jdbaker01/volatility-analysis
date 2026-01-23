import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts'

export const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#1a1a1a] border border-[#262626] px-3 py-2">
        <p className="text-[11px] text-[#525252] mb-1">{label}</p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2 text-[12px]">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-[#737373]">{entry.name}</span>
            <span className="text-white tabular-nums ml-auto">{entry.value.toFixed(2)}%</span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

export const formatDate = (dateStr) => {
  const date = new Date(dateStr)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[date.getMonth()]} ${date.getDate()}`
}

export const formatPercent = (value) => `${value.toFixed(0)}%`

export default function VolatilityChart({ data }) {
  const chartData = data.history.map((item) => ({
    ...item,
    vol_30d: item.vol_30d * 100,
    vol_90d: item.vol_90d * 100,
  }))

  const thresholds30d = {
    p50: data.percentile_thresholds['30d'].p50 * 100,
    p90: data.percentile_thresholds['30d'].p90 * 100,
    p99: data.percentile_thresholds['30d'].p99 * 100,
  }

  return (
    <div className="bg-[#111] border border-[#1f1f1f]">
      <div className="px-6 py-4 border-b border-[#1f1f1f] flex items-center justify-between">
        <div className="text-[11px] text-[#525252] tracking-wider">VOLATILITY HISTORY</div>
        <div className="flex items-center gap-6 text-[11px]">
          <div className="flex items-center gap-2">
            <div className="w-3 h-[2px] bg-white" />
            <span className="text-[#737373]">30D</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-[2px] bg-[#525252]" />
            <span className="text-[#737373]">90D</span>
          </div>
          <div className="w-px h-3 bg-[#262626]" />
          <div className="flex items-center gap-2">
            <div className="w-3 h-[1px] bg-[#525252] border-t border-dashed border-[#525252]" />
            <span className="text-[#525252]">p50 / p90 / p99</span>
          </div>
        </div>
      </div>

      <div className="p-4">
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={chartData} margin={{ top: 16, right: 48, left: 8, bottom: 8 }}>
            <CartesianGrid stroke="#1f1f1f" strokeDasharray="none" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              tick={{ fontSize: 10, fill: '#525252' }}
              axisLine={{ stroke: '#1f1f1f' }}
              tickLine={false}
              interval="preserveStartEnd"
              dy={8}
            />
            <YAxis
              tickFormatter={formatPercent}
              tick={{ fontSize: 10, fill: '#525252' }}
              axisLine={false}
              tickLine={false}
              width={36}
            />
            <Tooltip content={<CustomTooltip />} />

            <ReferenceLine
              y={thresholds30d.p50}
              stroke="#2a2a2a"
              strokeDasharray="4 4"
              label={{ value: 'p50', position: 'right', fill: '#404040', fontSize: 9 }}
            />
            <ReferenceLine
              y={thresholds30d.p90}
              stroke="#2a2a2a"
              strokeDasharray="4 4"
              label={{ value: 'p90', position: 'right', fill: '#404040', fontSize: 9 }}
            />
            <ReferenceLine
              y={thresholds30d.p99}
              stroke="#2a2a2a"
              strokeDasharray="4 4"
              label={{ value: 'p99', position: 'right', fill: '#404040', fontSize: 9 }}
            />

            <Line
              type="monotone"
              dataKey="vol_30d"
              stroke="#ffffff"
              strokeWidth={1.5}
              dot={false}
              name="30D Vol"
            />
            <Line
              type="monotone"
              dataKey="vol_90d"
              stroke="#525252"
              strokeWidth={1.5}
              dot={false}
              name="90D Vol"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
