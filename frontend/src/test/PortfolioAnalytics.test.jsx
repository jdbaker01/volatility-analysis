import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import PortfolioAnalytics, { formatDollar, pnlColor } from '../components/PortfolioAnalytics'
import {
  mockPortfolioAnalytics,
  mockPortfolioAnalyticsNullPnl,
  mockPortfolioAnalyticsZeroPnl,
  mockPortfolioAnalyticsNoVar,
} from './mockData'

describe('formatDollar', () => {
  it('returns --- for null', () => {
    expect(formatDollar(null)).toBe('---')
  })

  it('returns --- for undefined', () => {
    expect(formatDollar(undefined)).toBe('---')
  })

  it('formats positive values with + prefix', () => {
    expect(formatDollar(1250.75)).toBe('+$1,250.75')
  })

  it('formats negative values with - prefix', () => {
    expect(formatDollar(-3200)).toBe('-$3,200.00')
  })

  it('formats zero without sign', () => {
    expect(formatDollar(0)).toBe('$0.00')
  })

  it('formats small positive values', () => {
    expect(formatDollar(0.50)).toBe('+$0.50')
  })

  it('formats small negative values', () => {
    expect(formatDollar(-0.10)).toBe('-$0.10')
  })
})

describe('pnlColor', () => {
  it('returns muted color for null', () => {
    expect(pnlColor(null)).toBe('text-[#525252]')
  })

  it('returns muted color for undefined', () => {
    expect(pnlColor(undefined)).toBe('text-[#525252]')
  })

  it('returns green for positive', () => {
    expect(pnlColor(100)).toBe('text-[#22c55e]')
  })

  it('returns red for negative', () => {
    expect(pnlColor(-50)).toBe('text-[#ef4444]')
  })

  it('returns neutral for zero', () => {
    expect(pnlColor(0)).toBe('text-[#a3a3a3]')
  })
})

describe('PortfolioAnalytics', () => {
  it('returns null when analytics is null', () => {
    const { container } = render(<PortfolioAnalytics analytics={null} />)
    expect(container.innerHTML).toBe('')
  })

  it('renders portfolio value section', () => {
    render(<PortfolioAnalytics analytics={mockPortfolioAnalytics} />)
    expect(screen.getByText('PORTFOLIO VALUE')).toBeInTheDocument()
    expect(screen.getByText('$125,000.50')).toBeInTheDocument()
  })

  it('renders profit and loss section', () => {
    render(<PortfolioAnalytics analytics={mockPortfolioAnalytics} />)
    expect(screen.getByText('PROFIT & LOSS')).toBeInTheDocument()
    expect(screen.getByText('DAILY')).toBeInTheDocument()
    expect(screen.getByText('WEEKLY')).toBeInTheDocument()
    expect(screen.getByText('MONTHLY')).toBeInTheDocument()
  })

  it('renders formatted PnL values', () => {
    render(<PortfolioAnalytics analytics={mockPortfolioAnalytics} />)
    expect(screen.getByText('+$1,250.75')).toBeInTheDocument()
    expect(screen.getByText('-$3,200.00')).toBeInTheDocument()
    expect(screen.getByText('+$5,400.25')).toBeInTheDocument()
  })

  it('renders null PnL values as ---', () => {
    render(<PortfolioAnalytics analytics={mockPortfolioAnalyticsNullPnl} />)
    const dashes = screen.getAllByText('---')
    expect(dashes.length).toBeGreaterThanOrEqual(3)
  })

  it('renders zero PnL values correctly', () => {
    render(<PortfolioAnalytics analytics={mockPortfolioAnalyticsZeroPnl} />)
    const zeros = screen.getAllByText('$0.00')
    expect(zeros.length).toBe(3)
  })

  it('renders VaR section', () => {
    render(<PortfolioAnalytics analytics={mockPortfolioAnalytics} />)
    expect(screen.getByText('VALUE AT RISK (95% 1-DAY)')).toBeInTheDocument()
    expect(screen.getByText('HISTORICAL')).toBeInTheDocument()
    expect(screen.getByText('PARAMETRIC')).toBeInTheDocument()
  })

  it('renders historical VaR value', () => {
    render(<PortfolioAnalytics analytics={mockPortfolioAnalytics} />)
    expect(screen.getByText('$4,500.00')).toBeInTheDocument()
  })

  it('renders parametric VaR value', () => {
    render(<PortfolioAnalytics analytics={mockPortfolioAnalytics} />)
    expect(screen.getByText('$4,200.50')).toBeInTheDocument()
  })

  it('renders VaR percentage', () => {
    render(<PortfolioAnalytics analytics={mockPortfolioAnalytics} />)
    expect(screen.getByText('3.60% of portfolio')).toBeInTheDocument()
    expect(screen.getByText('3.36% of portfolio')).toBeInTheDocument()
  })

  it('renders --- for null VaR values', () => {
    render(<PortfolioAnalytics analytics={mockPortfolioAnalyticsNullPnl} />)
    // The null var values should show ---
    const dashes = screen.getAllByText('---')
    expect(dashes.length).toBeGreaterThanOrEqual(2)
  })

  it('does not render VaR percentage when null', () => {
    render(<PortfolioAnalytics analytics={mockPortfolioAnalyticsNullPnl} />)
    expect(screen.queryByText(/% of portfolio/)).not.toBeInTheDocument()
  })

  it('renders --- when var object is empty (no historical/parametric)', () => {
    render(<PortfolioAnalytics analytics={mockPortfolioAnalyticsZeroPnl} />)
    // var is {} so var?.historical?.var_95 is undefined -> ---
    const dashes = screen.getAllByText('---')
    expect(dashes.length).toBeGreaterThanOrEqual(2)
  })

  it('renders --- when var is null', () => {
    render(<PortfolioAnalytics analytics={mockPortfolioAnalyticsNoVar} />)
    const dashes = screen.getAllByText('---')
    expect(dashes.length).toBeGreaterThanOrEqual(2)
  })

  it('renders positions section when holdings_detail has items', () => {
    render(<PortfolioAnalytics analytics={mockPortfolioAnalytics} />)
    expect(screen.getByText('POSITIONS')).toBeInTheDocument()
    expect(screen.getByText('AAPL')).toBeInTheDocument()
    expect(screen.getByText('100')).toBeInTheDocument()
    expect(screen.getByText('$175.50')).toBeInTheDocument()
    expect(screen.getByText('$17,550.00')).toBeInTheDocument()
    expect(screen.getByText('MSFT')).toBeInTheDocument()
    expect(screen.getByText('50')).toBeInTheDocument()
    expect(screen.getByText('$380.25')).toBeInTheDocument()
    expect(screen.getByText('$19,012.50')).toBeInTheDocument()
  })

  it('does not render positions section when holdings_detail is empty', () => {
    render(<PortfolioAnalytics analytics={mockPortfolioAnalyticsNullPnl} />)
    expect(screen.queryByText('POSITIONS')).not.toBeInTheDocument()
  })

  it('does not render positions section when holdings_detail is null', () => {
    render(<PortfolioAnalytics analytics={mockPortfolioAnalyticsZeroPnl} />)
    expect(screen.queryByText('POSITIONS')).not.toBeInTheDocument()
  })

  it('does not render positions section when holdings_detail is undefined', () => {
    render(<PortfolioAnalytics analytics={mockPortfolioAnalyticsNoVar} />)
    expect(screen.queryByText('POSITIONS')).not.toBeInTheDocument()
  })

  it('renders position column headers', () => {
    render(<PortfolioAnalytics analytics={mockPortfolioAnalytics} />)
    // Column headers: TICKER, SHARES, PRICE, VALUE
    const tickers = screen.getAllByText('TICKER')
    expect(tickers.length).toBeGreaterThanOrEqual(1)
    const shares = screen.getAllByText('SHARES')
    expect(shares.length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('PRICE')).toBeInTheDocument()
    expect(screen.getByText('VALUE')).toBeInTheDocument()
  })

  it('renders 0.00 when current_value is null/undefined', () => {
    const analytics = { ...mockPortfolioAnalytics, current_value: null }
    render(<PortfolioAnalytics analytics={analytics} />)
    expect(screen.getByText('$0.00')).toBeInTheDocument()
  })
})
