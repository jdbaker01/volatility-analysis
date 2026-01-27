import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ReturnsTable from '../components/ReturnsTable'
import { mockVolatilityData, mockNullReturnsData, mockMixedReturnsData } from './mockData'

describe('ReturnsTable', () => {
  it('renders the RETURNS header', () => {
    render(<ReturnsTable data={mockVolatilityData} />)
    expect(screen.getByText('RETURNS')).toBeInTheDocument()
  })

  it('renders all period labels', () => {
    render(<ReturnsTable data={mockVolatilityData} />)
    expect(screen.getByText('DAILY')).toBeInTheDocument()
    expect(screen.getByText('1 WEEK')).toBeInTheDocument()
    expect(screen.getByText('1 MONTH')).toBeInTheDocument()
    expect(screen.getByText('YTD')).toBeInTheDocument()
  })

  it('renders positive returns with plus sign and green color', () => {
    render(<ReturnsTable data={mockVolatilityData} />)
    // daily: 0.0125 = +1.25%
    expect(screen.getByText('+1.25%')).toBeInTheDocument()
    expect(screen.getByText('+1.25%')).toHaveClass('text-[#22c55e]')
  })

  it('renders negative returns with minus sign and red color', () => {
    render(<ReturnsTable data={mockVolatilityData} />)
    // month: -0.0215 = -2.15%
    expect(screen.getByText('-2.15%')).toBeInTheDocument()
    expect(screen.getByText('-2.15%')).toHaveClass('text-[#ef4444]')
  })

  it('renders weekly return correctly', () => {
    render(<ReturnsTable data={mockVolatilityData} />)
    // week: 0.0350 = +3.50%
    expect(screen.getByText('+3.50%')).toBeInTheDocument()
  })

  it('renders YTD return correctly', () => {
    render(<ReturnsTable data={mockVolatilityData} />)
    // ytd: 0.0845 = +8.45%
    expect(screen.getByText('+8.45%')).toBeInTheDocument()
  })

  it('renders null returns with em dash', () => {
    render(<ReturnsTable data={mockNullReturnsData} />)
    const emDashes = screen.getAllByText('—')
    expect(emDashes.length).toBe(4)
  })

  it('applies gray color for null returns', () => {
    render(<ReturnsTable data={mockNullReturnsData} />)
    const emDashes = screen.getAllByText('—')
    emDashes.forEach((dash) => {
      expect(dash).toHaveClass('text-[#525252]')
    })
  })

  it('renders zero return with plus sign and neutral color', () => {
    render(<ReturnsTable data={mockMixedReturnsData} />)
    // ytd: 0.0 = +0.00%
    expect(screen.getByText('+0.00%')).toBeInTheDocument()
    expect(screen.getByText('+0.00%')).toHaveClass('text-[#a3a3a3]')
  })

  it('handles mixed null and non-null returns', () => {
    render(<ReturnsTable data={mockMixedReturnsData} />)
    // daily: 0.0050 = +0.50%
    expect(screen.getByText('+0.50%')).toBeInTheDocument()
    // week: -0.0125 = -1.25%
    expect(screen.getByText('-1.25%')).toBeInTheDocument()
    // month: null = —
    expect(screen.getByText('—')).toBeInTheDocument()
    // ytd: 0.0 = +0.00%
    expect(screen.getByText('+0.00%')).toBeInTheDocument()
  })

  it('handles missing returns object gracefully', () => {
    const dataWithoutReturns = { ...mockVolatilityData }
    delete dataWithoutReturns.returns
    render(<ReturnsTable data={dataWithoutReturns} />)
    const emDashes = screen.getAllByText('—')
    expect(emDashes.length).toBe(4)
  })

  it('renders with correct grid layout (4 columns)', () => {
    const { container } = render(<ReturnsTable data={mockVolatilityData} />)
    const grid = container.querySelector('.grid-cols-4')
    expect(grid).toBeInTheDocument()
  })
})
