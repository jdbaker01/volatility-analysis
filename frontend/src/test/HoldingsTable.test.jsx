import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import HoldingsTable from '../components/HoldingsTable'

describe('HoldingsTable', () => {
  const defaultProps = {
    holdings: [
      { ticker: 'AAPL', shares: 100 },
      { ticker: 'MSFT', shares: 50 },
    ],
    onSave: vi.fn(),
    portfolioId: 'p1',
  }

  it('renders HOLDINGS header', () => {
    render(<HoldingsTable {...defaultProps} />)
    expect(screen.getByText('HOLDINGS')).toBeInTheDocument()
  })

  it('renders TICKER and SHARES column headers', () => {
    render(<HoldingsTable {...defaultProps} />)
    expect(screen.getByText('TICKER')).toBeInTheDocument()
    expect(screen.getByText('SHARES')).toBeInTheDocument()
  })

  it('renders holdings data', () => {
    render(<HoldingsTable {...defaultProps} />)
    expect(screen.getByText('AAPL')).toBeInTheDocument()
    expect(screen.getByText('100')).toBeInTheDocument()
    expect(screen.getByText('MSFT')).toBeInTheDocument()
    expect(screen.getByText('50')).toBeInTheDocument()
  })

  it('renders EDIT button when not editing', () => {
    render(<HoldingsTable {...defaultProps} />)
    expect(screen.getByText('EDIT')).toBeInTheDocument()
  })

  it('shows empty state when no holdings and not editing', () => {
    render(<HoldingsTable holdings={[]} onSave={vi.fn()} portfolioId="p1" />)
    expect(screen.getByText('No holdings')).toBeInTheDocument()
  })

  it('does not show empty state when holdings exist', () => {
    render(<HoldingsTable {...defaultProps} />)
    expect(screen.queryByText('No holdings')).not.toBeInTheDocument()
  })

  it('enters edit mode when EDIT is clicked', () => {
    render(<HoldingsTable {...defaultProps} />)
    fireEvent.click(screen.getByText('EDIT'))
    expect(screen.getByText('SAVE')).toBeInTheDocument()
    expect(screen.getByText('CANCEL')).toBeInTheDocument()
    expect(screen.queryByText('EDIT')).not.toBeInTheDocument()
  })

  it('shows REMOVE buttons in edit mode', () => {
    render(<HoldingsTable {...defaultProps} />)
    fireEvent.click(screen.getByText('EDIT'))
    expect(screen.getByLabelText('remove AAPL')).toBeInTheDocument()
    expect(screen.getByLabelText('remove MSFT')).toBeInTheDocument()
  })

  it('shows add row inputs in edit mode', () => {
    render(<HoldingsTable {...defaultProps} />)
    fireEvent.click(screen.getByText('EDIT'))
    expect(screen.getByPlaceholderText('TICKER')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Shares')).toBeInTheDocument()
    expect(screen.getByText('+ ADD')).toBeInTheDocument()
  })

  it('does not show REMOVE buttons when not editing', () => {
    render(<HoldingsTable {...defaultProps} />)
    expect(screen.queryByLabelText('remove AAPL')).not.toBeInTheDocument()
  })

  it('does not show add row when not editing', () => {
    render(<HoldingsTable {...defaultProps} />)
    expect(screen.queryByPlaceholderText('TICKER')).not.toBeInTheDocument()
  })

  it('removes a holding when REMOVE is clicked', () => {
    render(<HoldingsTable {...defaultProps} />)
    fireEvent.click(screen.getByText('EDIT'))
    fireEvent.click(screen.getByLabelText('remove AAPL'))
    expect(screen.queryByText('AAPL')).not.toBeInTheDocument()
    expect(screen.getByText('MSFT')).toBeInTheDocument()
  })

  it('adds a new holding when + ADD is clicked with valid data', () => {
    render(<HoldingsTable {...defaultProps} />)
    fireEvent.click(screen.getByText('EDIT'))
    fireEvent.change(screen.getByPlaceholderText('TICKER'), { target: { value: 'goog' } })
    fireEvent.change(screen.getByPlaceholderText('Shares'), { target: { value: '25' } })
    fireEvent.click(screen.getByText('+ ADD'))
    expect(screen.getByText('GOOG')).toBeInTheDocument()
    expect(screen.getByText('25')).toBeInTheDocument()
  })

  it('clears input fields after adding a holding', () => {
    render(<HoldingsTable {...defaultProps} />)
    fireEvent.click(screen.getByText('EDIT'))
    fireEvent.change(screen.getByPlaceholderText('TICKER'), { target: { value: 'GOOG' } })
    fireEvent.change(screen.getByPlaceholderText('Shares'), { target: { value: '25' } })
    fireEvent.click(screen.getByText('+ ADD'))
    expect(screen.getByPlaceholderText('TICKER').value).toBe('')
    expect(screen.getByPlaceholderText('Shares').value).toBe('')
  })

  it('does not add when ticker is empty', () => {
    render(<HoldingsTable {...defaultProps} />)
    fireEvent.click(screen.getByText('EDIT'))
    fireEvent.change(screen.getByPlaceholderText('Shares'), { target: { value: '25' } })
    fireEvent.click(screen.getByText('+ ADD'))
    // Should still have only 2 holdings
    expect(screen.getAllByLabelText(/remove/).length).toBe(2)
  })

  it('does not add when ticker is only whitespace', () => {
    render(<HoldingsTable {...defaultProps} />)
    fireEvent.click(screen.getByText('EDIT'))
    fireEvent.change(screen.getByPlaceholderText('TICKER'), { target: { value: '   ' } })
    fireEvent.change(screen.getByPlaceholderText('Shares'), { target: { value: '25' } })
    fireEvent.click(screen.getByText('+ ADD'))
    expect(screen.getAllByLabelText(/remove/).length).toBe(2)
  })

  it('does not add when shares is empty', () => {
    render(<HoldingsTable {...defaultProps} />)
    fireEvent.click(screen.getByText('EDIT'))
    fireEvent.change(screen.getByPlaceholderText('TICKER'), { target: { value: 'GOOG' } })
    fireEvent.click(screen.getByText('+ ADD'))
    expect(screen.getAllByLabelText(/remove/).length).toBe(2)
  })

  it('does not add when shares is zero', () => {
    render(<HoldingsTable {...defaultProps} />)
    fireEvent.click(screen.getByText('EDIT'))
    fireEvent.change(screen.getByPlaceholderText('TICKER'), { target: { value: 'GOOG' } })
    fireEvent.change(screen.getByPlaceholderText('Shares'), { target: { value: '0' } })
    fireEvent.click(screen.getByText('+ ADD'))
    expect(screen.getAllByLabelText(/remove/).length).toBe(2)
  })

  it('does not add when shares is negative', () => {
    render(<HoldingsTable {...defaultProps} />)
    fireEvent.click(screen.getByText('EDIT'))
    fireEvent.change(screen.getByPlaceholderText('TICKER'), { target: { value: 'GOOG' } })
    fireEvent.change(screen.getByPlaceholderText('Shares'), { target: { value: '-5' } })
    fireEvent.click(screen.getByText('+ ADD'))
    expect(screen.getAllByLabelText(/remove/).length).toBe(2)
  })

  it('calls onSave with portfolioId and current rows when SAVE is clicked', () => {
    const onSave = vi.fn()
    render(<HoldingsTable {...defaultProps} onSave={onSave} />)
    fireEvent.click(screen.getByText('EDIT'))
    fireEvent.click(screen.getByText('SAVE'))
    expect(onSave).toHaveBeenCalledWith('p1', [
      { ticker: 'AAPL', shares: 100 },
      { ticker: 'MSFT', shares: 50 },
    ])
  })

  it('exits edit mode after save', () => {
    render(<HoldingsTable {...defaultProps} />)
    fireEvent.click(screen.getByText('EDIT'))
    fireEvent.click(screen.getByText('SAVE'))
    expect(screen.getByText('EDIT')).toBeInTheDocument()
    expect(screen.queryByText('SAVE')).not.toBeInTheDocument()
  })

  it('reverts changes when CANCEL is clicked', () => {
    render(<HoldingsTable {...defaultProps} />)
    fireEvent.click(screen.getByText('EDIT'))
    fireEvent.click(screen.getByLabelText('remove AAPL'))
    expect(screen.queryByText('AAPL')).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('CANCEL'))
    expect(screen.getByText('AAPL')).toBeInTheDocument()
    expect(screen.getByText('MSFT')).toBeInTheDocument()
  })

  it('exits edit mode after cancel', () => {
    render(<HoldingsTable {...defaultProps} />)
    fireEvent.click(screen.getByText('EDIT'))
    fireEvent.click(screen.getByText('CANCEL'))
    expect(screen.getByText('EDIT')).toBeInTheDocument()
  })

  it('clears new ticker and shares inputs on cancel', () => {
    render(<HoldingsTable {...defaultProps} />)
    fireEvent.click(screen.getByText('EDIT'))
    fireEvent.change(screen.getByPlaceholderText('TICKER'), { target: { value: 'GOOG' } })
    fireEvent.change(screen.getByPlaceholderText('Shares'), { target: { value: '25' } })
    fireEvent.click(screen.getByText('CANCEL'))
    // Re-enter edit mode to verify inputs were cleared
    fireEvent.click(screen.getByText('EDIT'))
    expect(screen.getByPlaceholderText('TICKER').value).toBe('')
    expect(screen.getByPlaceholderText('Shares').value).toBe('')
  })

  it('converts ticker input to uppercase', () => {
    render(<HoldingsTable {...defaultProps} />)
    fireEvent.click(screen.getByText('EDIT'))
    fireEvent.change(screen.getByPlaceholderText('TICKER'), { target: { value: 'goog' } })
    expect(screen.getByPlaceholderText('TICKER').value).toBe('GOOG')
  })

  it('saves with modified rows after add and remove', () => {
    const onSave = vi.fn()
    render(<HoldingsTable {...defaultProps} onSave={onSave} />)
    fireEvent.click(screen.getByText('EDIT'))
    // Remove AAPL
    fireEvent.click(screen.getByLabelText('remove AAPL'))
    // Add GOOG
    fireEvent.change(screen.getByPlaceholderText('TICKER'), { target: { value: 'GOOG' } })
    fireEvent.change(screen.getByPlaceholderText('Shares'), { target: { value: '30' } })
    fireEvent.click(screen.getByText('+ ADD'))
    fireEvent.click(screen.getByText('SAVE'))
    expect(onSave).toHaveBeenCalledWith('p1', [
      { ticker: 'MSFT', shares: 50 },
      { ticker: 'GOOG', shares: 30 },
    ])
  })

  it('does not show empty state in edit mode even when rows are empty', () => {
    render(<HoldingsTable holdings={[]} onSave={vi.fn()} portfolioId="p1" />)
    fireEvent.click(screen.getByText('EDIT'))
    expect(screen.queryByText('No holdings')).not.toBeInTheDocument()
  })
})
