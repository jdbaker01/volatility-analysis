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
  returns: {
    daily: 0.0125,
    week: 0.0350,
    month: -0.0215,
    ytd: 0.0845,
  },
  rsi_14d: 55.32,
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

export const mockNullReturnsData = {
  ...mockVolatilityData,
  returns: {
    daily: null,
    week: null,
    month: null,
    ytd: null,
  },
}

export const mockMixedReturnsData = {
  ...mockVolatilityData,
  returns: {
    daily: 0.0050,
    week: -0.0125,
    month: null,
    ytd: 0.0,
  },
}

export const mockOverboughtRsiData = {
  ...mockVolatilityData,
  rsi_14d: 82.50,
}

export const mockOversoldRsiData = {
  ...mockVolatilityData,
  rsi_14d: 22.10,
}

export const mockNullRsiData = {
  ...mockVolatilityData,
  rsi_14d: null,
}

// Portfolio mock data
export const mockPortfolios = [
  { id: 'p1', name: 'Tech Stocks', portfolio_type: 'leaf', parent_id: null, holdings: [{ ticker: 'AAPL', shares: 100 }, { ticker: 'MSFT', shares: 50 }] },
  { id: 'p2', name: 'My Groups', portfolio_type: 'group', parent_id: null },
  { id: 'p3', name: 'Sub Portfolio', portfolio_type: 'leaf', parent_id: 'p2', holdings: [{ ticker: 'GOOG', shares: 25 }] },
]

export const mockPortfolioAnalytics = {
  current_value: 125000.50,
  daily_pnl: 1250.75,
  weekly_pnl: -3200.00,
  monthly_pnl: 5400.25,
  var: {
    historical: { var_95: 4500.00, var_95_pct: 3.60 },
    parametric: { var_95: 4200.50, var_95_pct: 3.36 },
  },
  holdings_detail: [
    { ticker: 'AAPL', shares: 100, current_price: 175.50, market_value: 17550.00 },
    { ticker: 'MSFT', shares: 50, current_price: 380.25, market_value: 19012.50 },
  ],
}

export const mockPortfolioAnalyticsNullPnl = {
  current_value: 0,
  daily_pnl: null,
  weekly_pnl: null,
  monthly_pnl: null,
  var: {
    historical: { var_95: null, var_95_pct: null },
    parametric: { var_95: null, var_95_pct: null },
  },
  holdings_detail: [],
}

export const mockPortfolioAnalyticsZeroPnl = {
  current_value: 10000,
  daily_pnl: 0,
  weekly_pnl: 0,
  monthly_pnl: 0,
  var: {},
  holdings_detail: null,
}

export const mockPortfolioAnalyticsNoVar = {
  current_value: 50000,
  daily_pnl: 100,
  weekly_pnl: -200,
  monthly_pnl: 500,
  var: null,
}
