export const mockVolatilityData = {
  ticker: 'SPY',
  current_price: 450.25,
  daily_open: 448.50,
  daily_high: 452.00,
  daily_low: 447.00,
  vol_30d: 0.1520,
  vol_90d: 0.1380,
  vol_30d_percentile: 25,
  vol_90d_percentile: 32,
  vol_30d_bucket: '<p50',
  vol_90d_bucket: '<p50',
  percentile_thresholds: {
    '30d': {
      p50: 0.1800,
      p90: 0.2800,
      p99: 0.4500,
    },
    '90d': {
      p50: 0.1650,
      p90: 0.2500,
      p99: 0.3800,
    },
  },
  history: [
    { date: '2024-01-15', vol_30d: 0.1450, vol_90d: 0.1320 },
    { date: '2024-01-16', vol_30d: 0.1480, vol_90d: 0.1340 },
    { date: '2024-01-17', vol_30d: 0.1520, vol_90d: 0.1380 },
  ],
}

export const mockHighVolData = {
  ...mockVolatilityData,
  vol_30d_percentile: 95.5,
  vol_90d_percentile: 92.3,
}

export const mockMediumVolData = {
  ...mockVolatilityData,
  vol_30d_percentile: 65.0,
  vol_90d_percentile: 55.0,
}

export const mockLowVolData = {
  ...mockVolatilityData,
  vol_30d_percentile: 15.0,
  vol_90d_percentile: 20.0,
}

export const mockNullPriceData = {
  ...mockVolatilityData,
  daily_open: null,
  daily_high: null,
  daily_low: null,
}
