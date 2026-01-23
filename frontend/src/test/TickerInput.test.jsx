import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import TickerInput from '../components/TickerInput'

describe('TickerInput', () => {
  it('renders input and button', () => {
    render(<TickerInput onSubmit={() => {}} loading={false} />)

    expect(screen.getByPlaceholderText('SYMBOL')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'GO' })).toBeInTheDocument()
  })

  it('converts input to uppercase', () => {
    render(<TickerInput onSubmit={() => {}} loading={false} />)

    const input = screen.getByPlaceholderText('SYMBOL')
    fireEvent.change(input, { target: { value: 'aapl' } })

    expect(input.value).toBe('AAPL')
  })

  it('calls onSubmit with uppercase ticker on form submit', () => {
    const onSubmit = vi.fn()
    render(<TickerInput onSubmit={onSubmit} loading={false} />)

    const input = screen.getByPlaceholderText('SYMBOL')
    fireEvent.change(input, { target: { value: 'spy' } })
    fireEvent.submit(input.closest('form'))

    expect(onSubmit).toHaveBeenCalledWith('SPY')
  })

  it('does not submit when input is empty', () => {
    const onSubmit = vi.fn()
    render(<TickerInput onSubmit={onSubmit} loading={false} />)

    const input = screen.getByPlaceholderText('SYMBOL')
    fireEvent.submit(input.closest('form'))

    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('does not submit when input is only whitespace', () => {
    const onSubmit = vi.fn()
    render(<TickerInput onSubmit={onSubmit} loading={false} />)

    const input = screen.getByPlaceholderText('SYMBOL')
    fireEvent.change(input, { target: { value: '   ' } })
    fireEvent.submit(input.closest('form'))

    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('trims whitespace from ticker', () => {
    const onSubmit = vi.fn()
    render(<TickerInput onSubmit={onSubmit} loading={false} />)

    const input = screen.getByPlaceholderText('SYMBOL')
    fireEvent.change(input, { target: { value: ' SPY ' } })
    fireEvent.submit(input.closest('form'))

    expect(onSubmit).toHaveBeenCalledWith('SPY')
  })

  it('disables input and button when loading', () => {
    render(<TickerInput onSubmit={() => {}} loading={true} />)

    expect(screen.getByPlaceholderText('SYMBOL')).toBeDisabled()
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('shows loading indicator when loading', () => {
    render(<TickerInput onSubmit={() => {}} loading={true} />)

    expect(screen.getByRole('button', { name: '...' })).toBeInTheDocument()
  })

  it('disables button when input is empty', () => {
    render(<TickerInput onSubmit={() => {}} loading={false} />)

    expect(screen.getByRole('button', { name: 'GO' })).toBeDisabled()
  })

  it('enables button when input has value', () => {
    render(<TickerInput onSubmit={() => {}} loading={false} />)

    const input = screen.getByPlaceholderText('SYMBOL')
    fireEvent.change(input, { target: { value: 'SPY' } })

    expect(screen.getByRole('button', { name: 'GO' })).not.toBeDisabled()
  })
})
