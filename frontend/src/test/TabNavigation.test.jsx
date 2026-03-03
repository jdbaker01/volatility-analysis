import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import TabNavigation from '../components/TabNavigation'

describe('TabNavigation', () => {
  it('renders both tab buttons', () => {
    render(<TabNavigation activeTab="analysis" onTabChange={() => {}} />)
    expect(screen.getByRole('tab', { name: 'ANALYSIS' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'PORTFOLIOS' })).toBeInTheDocument()
  })

  it('renders tablist role container', () => {
    render(<TabNavigation activeTab="analysis" onTabChange={() => {}} />)
    expect(screen.getByRole('tablist')).toBeInTheDocument()
  })

  it('marks analysis tab as selected when activeTab is analysis', () => {
    render(<TabNavigation activeTab="analysis" onTabChange={() => {}} />)
    expect(screen.getByRole('tab', { name: 'ANALYSIS' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'PORTFOLIOS' })).toHaveAttribute('aria-selected', 'false')
  })

  it('marks portfolios tab as selected when activeTab is portfolios', () => {
    render(<TabNavigation activeTab="portfolios" onTabChange={() => {}} />)
    expect(screen.getByRole('tab', { name: 'ANALYSIS' })).toHaveAttribute('aria-selected', 'false')
    expect(screen.getByRole('tab', { name: 'PORTFOLIOS' })).toHaveAttribute('aria-selected', 'true')
  })

  it('applies active styles to selected tab', () => {
    render(<TabNavigation activeTab="analysis" onTabChange={() => {}} />)
    expect(screen.getByRole('tab', { name: 'ANALYSIS' })).toHaveClass('bg-[#2d4a6f]', 'text-white')
    expect(screen.getByRole('tab', { name: 'PORTFOLIOS' })).toHaveClass('text-[#4a7ab0]')
  })

  it('applies active styles to portfolios tab when selected', () => {
    render(<TabNavigation activeTab="portfolios" onTabChange={() => {}} />)
    expect(screen.getByRole('tab', { name: 'PORTFOLIOS' })).toHaveClass('bg-[#2d4a6f]', 'text-white')
    expect(screen.getByRole('tab', { name: 'ANALYSIS' })).toHaveClass('text-[#4a7ab0]')
  })

  it('calls onTabChange with analysis when ANALYSIS tab is clicked', () => {
    const onTabChange = vi.fn()
    render(<TabNavigation activeTab="portfolios" onTabChange={onTabChange} />)
    fireEvent.click(screen.getByRole('tab', { name: 'ANALYSIS' }))
    expect(onTabChange).toHaveBeenCalledWith('analysis')
  })

  it('calls onTabChange with portfolios when PORTFOLIOS tab is clicked', () => {
    const onTabChange = vi.fn()
    render(<TabNavigation activeTab="analysis" onTabChange={onTabChange} />)
    fireEvent.click(screen.getByRole('tab', { name: 'PORTFOLIOS' }))
    expect(onTabChange).toHaveBeenCalledWith('portfolios')
  })
})
