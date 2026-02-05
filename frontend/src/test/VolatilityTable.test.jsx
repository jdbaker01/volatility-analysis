import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import VolatilityTable from '../components/VolatilityTable'
import { mockVolatilityData, mockHighVolData, mockMediumVolData, mockLowVolData, mockNullPriceData, mockNullReturnsData, mockMixedReturnsData, mockOverboughtRsiData, mockOversoldRsiData, mockNullRsiData } from './mockData'

describe('VolatilityTable', () => {
  it('renders ticker symbol', () => {
    render(<VolatilityTable data={mockVolatilityData} />)
    expect(screen.getByText('SPY')).toBeInTheDocument()
  })

  it('renders current price', () => {
    render(<VolatilityTable data={mockVolatilityData} />)
    expect(screen.getByText('450.25')).toBeInTheDocument()
  })

  it('renders daily range header', () => {
    render(<VolatilityTable data={mockVolatilityData} />)
    expect(screen.getByText('DAILY RANGE')).toBeInTheDocument()
  })

  it('renders open, high, low prices', () => {
    render(<VolatilityTable data={mockVolatilityData} />)
    expect(screen.getByText('448.50')).toBeInTheDocument()
    // High and low appear multiple times (OHLC row and range bar)
    expect(screen.getAllByText('452.00').length).toBeGreaterThan(0)
    expect(screen.getAllByText('447.00').length).toBeGreaterThan(0)
  })

  it('renders 30-day volatility section', () => {
    render(<VolatilityTable data={mockVolatilityData} />)
    expect(screen.getByText('30-DAY VOLATILITY')).toBeInTheDocument()
    expect(screen.getByText('15.20%')).toBeInTheDocument()
  })

  it('renders 90-day volatility section', () => {
    render(<VolatilityTable data={mockVolatilityData} />)
    expect(screen.getByText('90-DAY VOLATILITY')).toBeInTheDocument()
    expect(screen.getByText('13.80%')).toBeInTheDocument()
  })

  it('renders percentile with ordinal suffix', () => {
    render(<VolatilityTable data={mockVolatilityData} />)
    // Use regex to find ordinal text that may have whitespace between parts
    const percentileElements = screen.getAllByText(/percentile/i)
    expect(percentileElements.length).toBe(2)
    // Check that the ordinals are rendered correctly
    expect(screen.getByText(/25th/)).toBeInTheDocument()
    expect(screen.getByText(/32nd/)).toBeInTheDocument()
  })

  it('renders historical thresholds section', () => {
    render(<VolatilityTable data={mockVolatilityData} />)
    expect(screen.getByText('HISTORICAL THRESHOLDS')).toBeInTheDocument()
  })

  it('renders 30d threshold values', () => {
    render(<VolatilityTable data={mockVolatilityData} />)
    expect(screen.getByText('30D p50')).toBeInTheDocument()
    expect(screen.getByText('30D p90')).toBeInTheDocument()
    expect(screen.getByText('30D p99')).toBeInTheDocument()
    expect(screen.getByText('18.00%')).toBeInTheDocument()
    expect(screen.getByText('28.00%')).toBeInTheDocument()
    expect(screen.getByText('45.00%')).toBeInTheDocument()
  })

  it('renders 90d threshold values', () => {
    render(<VolatilityTable data={mockVolatilityData} />)
    expect(screen.getByText('90D p50')).toBeInTheDocument()
    expect(screen.getByText('90D p90')).toBeInTheDocument()
    expect(screen.getByText('90D p99')).toBeInTheDocument()
    expect(screen.getByText('16.50%')).toBeInTheDocument()
    expect(screen.getByText('25.00%')).toBeInTheDocument()
    expect(screen.getByText('38.00%')).toBeInTheDocument()
  })

  it('applies green color for low percentile (<25)', () => {
    render(<VolatilityTable data={mockLowVolData} />)
    const percentileElements = screen.getAllByText(/percentile/)
    expect(percentileElements[0]).toHaveClass('text-[#22c55e]')
  })

  it('applies light green color for medium-low percentile (25-50)', () => {
    const data = { ...mockVolatilityData, vol_30d_percentile: 35 }
    render(<VolatilityTable data={data} />)
    const percentileElements = screen.getAllByText(/percentile/)
    expect(percentileElements[0]).toHaveClass('text-[#4ade80]')
  })

  it('applies yellow color for medium percentile (50-75)', () => {
    render(<VolatilityTable data={mockMediumVolData} />)
    const percentileElements = screen.getAllByText(/percentile/)
    expect(percentileElements[0]).toHaveClass('text-[#fbbf24]')
  })

  it('applies orange color for elevated percentile (75-90)', () => {
    const data = { ...mockVolatilityData, vol_30d_percentile: 85 }
    render(<VolatilityTable data={data} />)
    const percentileElements = screen.getAllByText(/percentile/)
    expect(percentileElements[0]).toHaveClass('text-[#f97316]')
  })

  it('applies red color for high percentile (>90)', () => {
    render(<VolatilityTable data={mockHighVolData} />)
    const percentileElements = screen.getAllByText(/percentile/)
    expect(percentileElements[0]).toHaveClass('text-[#ef4444]')
  })

  it('handles null price values with em dash', () => {
    render(<VolatilityTable data={mockNullPriceData} />)
    const emDashes = screen.getAllByText('—')
    expect(emDashes.length).toBeGreaterThan(0)
  })

  it('renders ordinal 1st correctly', () => {
    const data = { ...mockVolatilityData, vol_30d_percentile: 1 }
    render(<VolatilityTable data={data} />)
    expect(screen.getByText(/1st/)).toBeInTheDocument()
  })

  it('renders ordinal 2nd correctly', () => {
    const data = { ...mockVolatilityData, vol_30d_percentile: 2, vol_90d_percentile: 5 }
    render(<VolatilityTable data={data} />)
    expect(screen.getByText(/2nd/)).toBeInTheDocument()
  })

  it('renders ordinal 3rd correctly', () => {
    const data = { ...mockVolatilityData, vol_30d_percentile: 3 }
    render(<VolatilityTable data={data} />)
    expect(screen.getByText(/3rd/)).toBeInTheDocument()
  })

  it('renders ordinal 11th correctly (special case)', () => {
    const data = { ...mockVolatilityData, vol_30d_percentile: 11 }
    render(<VolatilityTable data={data} />)
    expect(screen.getByText(/11th/)).toBeInTheDocument()
  })

  it('renders ordinal 12th correctly (special case)', () => {
    const data = { ...mockVolatilityData, vol_30d_percentile: 12 }
    render(<VolatilityTable data={data} />)
    expect(screen.getByText(/12th/)).toBeInTheDocument()
  })

  it('renders ordinal 13th correctly (special case)', () => {
    const data = { ...mockVolatilityData, vol_30d_percentile: 13 }
    render(<VolatilityTable data={data} />)
    expect(screen.getByText(/13th/)).toBeInTheDocument()
  })

  it('renders ordinal 21st correctly', () => {
    const data = { ...mockVolatilityData, vol_30d_percentile: 21 }
    render(<VolatilityTable data={data} />)
    expect(screen.getByText(/21st/)).toBeInTheDocument()
  })

  it('renders ordinal 22nd correctly', () => {
    const data = { ...mockVolatilityData, vol_30d_percentile: 22 }
    render(<VolatilityTable data={data} />)
    expect(screen.getByText(/22nd/)).toBeInTheDocument()
  })

  it('renders ordinal 23rd correctly', () => {
    const data = { ...mockVolatilityData, vol_30d_percentile: 23 }
    render(<VolatilityTable data={data} />)
    expect(screen.getByText(/23rd/)).toBeInTheDocument()
  })

  it('renders OHLC labels', () => {
    render(<VolatilityTable data={mockVolatilityData} />)
    expect(screen.getByText('O')).toBeInTheDocument()
    expect(screen.getAllByText('H').length).toBeGreaterThan(0)
    expect(screen.getAllByText('L').length).toBeGreaterThan(0)
  })

  it('handles price position when high equals low (division by zero)', () => {
    const dataWithSameHighLow = {
      ...mockVolatilityData,
      daily_high: 450.00,
      daily_low: 450.00,
      current_price: 450.00,
    }
    const { container } = render(<VolatilityTable data={dataWithSameHighLow} />)
    // Should render without error, defaulting to 50% position
    const priceIndicator = container.querySelector('.w-2.h-2.bg-white.rounded-full')
    expect(priceIndicator).toHaveStyle({ left: '50%' })
  })

  // Returns section tests
  it('renders returns section with all period labels', () => {
    render(<VolatilityTable data={mockVolatilityData} />)
    expect(screen.getByText('DAILY')).toBeInTheDocument()
    expect(screen.getByText('1 WEEK')).toBeInTheDocument()
    expect(screen.getByText('1 MONTH')).toBeInTheDocument()
    expect(screen.getByText('YTD')).toBeInTheDocument()
  })

  it('renders positive returns with plus sign and green color', () => {
    render(<VolatilityTable data={mockVolatilityData} />)
    // daily: 0.0125 = +1.25%
    expect(screen.getByText('+1.25%')).toBeInTheDocument()
    expect(screen.getByText('+1.25%')).toHaveClass('text-[#22c55e]')
  })

  it('renders negative returns with red color', () => {
    render(<VolatilityTable data={mockVolatilityData} />)
    // month: -0.0215 = -2.15%
    expect(screen.getByText('-2.15%')).toBeInTheDocument()
    expect(screen.getByText('-2.15%')).toHaveClass('text-[#ef4444]')
  })

  it('renders null returns with em dash and gray color', () => {
    render(<VolatilityTable data={mockNullReturnsData} />)
    // All returns are null, plus price nulls = multiple em dashes
    const emDashes = screen.getAllByText('—')
    expect(emDashes.length).toBeGreaterThanOrEqual(4)
  })

  it('renders zero return with neutral color', () => {
    render(<VolatilityTable data={mockMixedReturnsData} />)
    // ytd: 0.0 = +0.00%
    expect(screen.getByText('+0.00%')).toBeInTheDocument()
    expect(screen.getByText('+0.00%')).toHaveClass('text-[#a3a3a3]')
  })

  it('handles missing returns object gracefully', () => {
    const dataWithoutReturns = { ...mockVolatilityData }
    delete dataWithoutReturns.returns
    render(<VolatilityTable data={dataWithoutReturns} />)
    // Should render em dashes for all returns
    const emDashes = screen.getAllByText('—')
    expect(emDashes.length).toBeGreaterThanOrEqual(4)
  })

  // RSI section tests
  it('renders RSI label', () => {
    render(<VolatilityTable data={mockVolatilityData} />)
    expect(screen.getByText('14-DAY RSI')).toBeInTheDocument()
  })

  it('renders RSI value for neutral RSI', () => {
    render(<VolatilityTable data={mockVolatilityData} />)
    expect(screen.getByText('55.32')).toBeInTheDocument()
    expect(screen.getByText('NEUTRAL')).toBeInTheDocument()
  })

  it('renders RSI value with white color for neutral range', () => {
    render(<VolatilityTable data={mockVolatilityData} />)
    expect(screen.getByText('55.32')).toHaveClass('text-white')
  })

  it('renders overbought RSI with red color and label', () => {
    render(<VolatilityTable data={mockOverboughtRsiData} />)
    expect(screen.getByText('82.50')).toBeInTheDocument()
    expect(screen.getByText('82.50')).toHaveClass('text-[#ef4444]')
    expect(screen.getByText('OVERBOUGHT')).toBeInTheDocument()
    expect(screen.getByText('OVERBOUGHT')).toHaveClass('text-[#ef4444]')
  })

  it('renders oversold RSI with green color and label', () => {
    render(<VolatilityTable data={mockOversoldRsiData} />)
    expect(screen.getByText('22.10')).toBeInTheDocument()
    expect(screen.getByText('22.10')).toHaveClass('text-[#22c55e]')
    expect(screen.getByText('OVERSOLD')).toBeInTheDocument()
    expect(screen.getByText('OVERSOLD')).toHaveClass('text-[#22c55e]')
  })

  it('renders null RSI with em dash', () => {
    render(<VolatilityTable data={mockNullRsiData} />)
    expect(screen.getByText('14-DAY RSI')).toBeInTheDocument()
    // Should not show NEUTRAL/OVERBOUGHT/OVERSOLD label
    expect(screen.queryByText('NEUTRAL')).not.toBeInTheDocument()
    expect(screen.queryByText('OVERBOUGHT')).not.toBeInTheDocument()
    expect(screen.queryByText('OVERSOLD')).not.toBeInTheDocument()
  })
})
