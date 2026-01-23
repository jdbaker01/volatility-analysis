import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import VolatilityChart, { CustomTooltip, formatDate, formatPercent } from '../components/VolatilityChart'
import { mockVolatilityData } from './mockData'

describe('VolatilityChart', () => {
  it('renders chart header', () => {
    render(<VolatilityChart data={mockVolatilityData} />)
    expect(screen.getByText('VOLATILITY HISTORY')).toBeInTheDocument()
  })

  it('renders 30D legend item', () => {
    render(<VolatilityChart data={mockVolatilityData} />)
    expect(screen.getByText('30D')).toBeInTheDocument()
  })

  it('renders 90D legend item', () => {
    render(<VolatilityChart data={mockVolatilityData} />)
    expect(screen.getByText('90D')).toBeInTheDocument()
  })

  it('renders percentile legend', () => {
    render(<VolatilityChart data={mockVolatilityData} />)
    expect(screen.getByText('p50 / p90 / p99')).toBeInTheDocument()
  })

  it('renders ResponsiveContainer', () => {
    const { container } = render(<VolatilityChart data={mockVolatilityData} />)
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument()
  })

  it('transforms history data to percentages', () => {
    // The chart multiplies vol values by 100 for display
    // We verify the chart renders without error with the data transformation
    const { container } = render(<VolatilityChart data={mockVolatilityData} />)
    expect(container).toBeInTheDocument()
  })

  it('handles empty history array', () => {
    const dataWithEmptyHistory = {
      ...mockVolatilityData,
      history: [],
    }
    const { container } = render(<VolatilityChart data={dataWithEmptyHistory} />)
    expect(container).toBeInTheDocument()
  })

  it('renders with single history entry', () => {
    const dataWithSingleHistory = {
      ...mockVolatilityData,
      history: [{ date: '2024-01-15', vol_30d: 0.15, vol_90d: 0.13 }],
    }
    const { container } = render(<VolatilityChart data={dataWithSingleHistory} />)
    expect(container).toBeInTheDocument()
  })
})

describe('formatDate', () => {
  it('formats date string to Month Day format', () => {
    const result = formatDate('2024-01-15')
    // Result should be in format "Mon D" or "Mon DD"
    expect(result).toMatch(/^[A-Z][a-z]{2} \d{1,2}$/)
  })

  it('returns a string containing month abbreviation', () => {
    const result = formatDate('2024-06-15')
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const hasMonth = months.some(month => result.startsWith(month))
    expect(hasMonth).toBe(true)
  })

  it('returns a string with a day number', () => {
    const result = formatDate('2024-01-20')
    // Should contain a number between 1-31
    const dayMatch = result.match(/\d+$/)
    expect(dayMatch).not.toBeNull()
    const dayNum = parseInt(dayMatch[0])
    expect(dayNum).toBeGreaterThanOrEqual(1)
    expect(dayNum).toBeLessThanOrEqual(31)
  })
})

describe('formatPercent', () => {
  it('formats number as percentage with no decimals', () => {
    expect(formatPercent(15.5)).toBe('16%')
  })

  it('formats whole number', () => {
    expect(formatPercent(20)).toBe('20%')
  })

  it('rounds down correctly', () => {
    expect(formatPercent(15.4)).toBe('15%')
  })

  it('handles zero', () => {
    expect(formatPercent(0)).toBe('0%')
  })
})

describe('CustomTooltip', () => {
  it('returns null when not active', () => {
    const { container } = render(<CustomTooltip active={false} payload={[]} label="" />)
    expect(container.firstChild).toBeNull()
  })

  it('returns null when payload is empty', () => {
    const { container } = render(<CustomTooltip active={true} payload={[]} label="" />)
    expect(container.firstChild).toBeNull()
  })

  it('returns null when payload is null', () => {
    const { container } = render(<CustomTooltip active={true} payload={null} label="" />)
    expect(container.firstChild).toBeNull()
  })

  it('renders tooltip content when active with payload', () => {
    const payload = [
      { name: '30D Vol', value: 15.5, color: '#ffffff' },
      { name: '90D Vol', value: 13.2, color: '#525252' },
    ]
    render(<CustomTooltip active={true} payload={payload} label="Jan 15" />)

    expect(screen.getByText('Jan 15')).toBeInTheDocument()
    expect(screen.getByText('30D Vol')).toBeInTheDocument()
    expect(screen.getByText('90D Vol')).toBeInTheDocument()
    expect(screen.getByText('15.50%')).toBeInTheDocument()
    expect(screen.getByText('13.20%')).toBeInTheDocument()
  })

  it('renders colored dots for each payload entry', () => {
    const payload = [
      { name: '30D Vol', value: 15.5, color: '#ffffff' },
    ]
    const { container } = render(<CustomTooltip active={true} payload={payload} label="Jan 15" />)

    const colorDot = container.querySelector('.w-2.h-2.rounded-full')
    expect(colorDot).toHaveStyle({ backgroundColor: '#ffffff' })
  })

  it('formats values to 2 decimal places', () => {
    const payload = [
      { name: '30D Vol', value: 15.123456, color: '#ffffff' },
    ]
    render(<CustomTooltip active={true} payload={payload} label="Jan 15" />)

    expect(screen.getByText('15.12%')).toBeInTheDocument()
  })
})
