import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import App from '../App'
import { mockVolatilityData } from './mockData'

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.getItem.mockReturnValue(null)
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders header with title', () => {
    render(<App />)
    expect(screen.getByText('INVESTMENT ANALYSIS')).toBeInTheDocument()
  })

  it('renders HISTORICAL ANALYSIS text', () => {
    render(<App />)
    expect(screen.getByText('HISTORICAL ANALYSIS')).toBeInTheDocument()
  })

  it('renders ticker input', () => {
    render(<App />)
    expect(screen.getByPlaceholderText('SYMBOL')).toBeInTheDocument()
  })

  it('renders history sidebar', () => {
    render(<App />)
    expect(screen.getByText('RECENT')).toBeInTheDocument()
  })

  it('shows empty history message when no history', () => {
    render(<App />)
    expect(screen.getByText('No history yet')).toBeInTheDocument()
  })

  it('renders empty state with quick symbols', () => {
    render(<App />)
    expect(screen.getByText('ENTER SYMBOL TO ANALYZE')).toBeInTheDocument()
    expect(screen.getByText('SPY')).toBeInTheDocument()
    expect(screen.getByText('QQQ')).toBeInTheDocument()
    expect(screen.getByText('IWM')).toBeInTheDocument()
    expect(screen.getByText('DIA')).toBeInTheDocument()
    expect(screen.getByText('VIX')).toBeInTheDocument()
  })

  it('renders footer with data source', () => {
    render(<App />)
    expect(screen.getByText('DATA: YAHOO FINANCE')).toBeInTheDocument()
  })

  it('renders footer with vol formula', () => {
    render(<App />)
    expect(screen.getByText('VOL = ANNUALIZED STDEV OF DAILY RETURNS')).toBeInTheDocument()
  })

  it('fetches data when quick symbol is clicked', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockVolatilityData),
    })

    render(<App />)

    const spyButton = screen.getAllByText('SPY')[0]
    fireEvent.click(spyButton)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('http://localhost:8000/api/volatility/SPY')
    })
  })

  it('displays data after successful fetch', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockVolatilityData),
    })

    render(<App />)

    const spyButton = screen.getAllByText('SPY')[0]
    fireEvent.click(spyButton)

    await waitFor(() => {
      expect(screen.getByText('450.25')).toBeInTheDocument()
    })
  })

  it('displays error message on fetch failure', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ detail: 'Ticker not found' }),
    })

    render(<App />)

    const input = screen.getByPlaceholderText('SYMBOL')
    fireEvent.change(input, { target: { value: 'INVALID' } })
    fireEvent.submit(input.closest('form'))

    await waitFor(() => {
      expect(screen.getByText('Ticker not found')).toBeInTheDocument()
    })
  })

  it('displays generic error message when detail is missing', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({}),
    })

    render(<App />)

    const input = screen.getByPlaceholderText('SYMBOL')
    fireEvent.change(input, { target: { value: 'BAD' } })
    fireEvent.submit(input.closest('form'))

    await waitFor(() => {
      expect(screen.getByText('Failed to fetch volatility data')).toBeInTheDocument()
    })
  })

  it('handles network error', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Network error'))

    render(<App />)

    const input = screen.getByPlaceholderText('SYMBOL')
    fireEvent.change(input, { target: { value: 'SPY' } })
    fireEvent.submit(input.closest('form'))

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument()
    })
  })

  it('adds ticker to history after successful fetch', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockVolatilityData),
    })

    render(<App />)

    const input = screen.getByPlaceholderText('SYMBOL')
    fireEvent.change(input, { target: { value: 'spy' } })
    fireEvent.submit(input.closest('form'))

    await waitFor(() => {
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'volatility_history',
        JSON.stringify(['SPY'])
      )
    })
  })

  it('loads history from localStorage on mount', () => {
    localStorage.getItem.mockReturnValue(JSON.stringify(['AAPL', 'MSFT']))

    render(<App />)

    expect(screen.getByText('AAPL')).toBeInTheDocument()
    expect(screen.getByText('MSFT')).toBeInTheDocument()
  })

  it('shows CLEAR button when history exists', () => {
    localStorage.getItem.mockReturnValue(JSON.stringify(['AAPL']))

    render(<App />)

    expect(screen.getByText('CLEAR')).toBeInTheDocument()
  })

  it('clears history when CLEAR is clicked', () => {
    localStorage.getItem.mockReturnValue(JSON.stringify(['AAPL']))

    render(<App />)

    fireEvent.click(screen.getByText('CLEAR'))

    expect(localStorage.removeItem).toHaveBeenCalledWith('volatility_history')
    expect(screen.getByText('No history yet')).toBeInTheDocument()
  })

  it('fetches data when history item is clicked', async () => {
    localStorage.getItem.mockReturnValue(JSON.stringify(['AAPL']))
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ ...mockVolatilityData, ticker: 'AAPL' }),
    })

    render(<App />)

    fireEvent.click(screen.getByText('AAPL'))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('http://localhost:8000/api/volatility/AAPL')
    })
  })

  it('moves repeated ticker to top of history', async () => {
    localStorage.getItem.mockReturnValue(JSON.stringify(['AAPL', 'MSFT']))
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ ...mockVolatilityData, ticker: 'MSFT' }),
    })

    render(<App />)

    fireEvent.click(screen.getByText('MSFT'))

    await waitFor(() => {
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'volatility_history',
        JSON.stringify(['MSFT', 'AAPL'])
      )
    })
  })

  it('limits history to 10 items', async () => {
    const longHistory = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']
    localStorage.getItem.mockReturnValue(JSON.stringify(longHistory))
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ ...mockVolatilityData, ticker: 'NEW' }),
    })

    render(<App />)

    const input = screen.getByPlaceholderText('SYMBOL')
    fireEvent.change(input, { target: { value: 'NEW' } })
    fireEvent.submit(input.closest('form'))

    await waitFor(() => {
      const savedHistory = JSON.parse(localStorage.setItem.mock.calls[0][1])
      expect(savedHistory).toHaveLength(10)
      expect(savedHistory[0]).toBe('NEW')
      expect(savedHistory).not.toContain('J')
    })
  })

  it('highlights currently selected ticker in history', async () => {
    localStorage.getItem.mockReturnValue(JSON.stringify(['AAPL', 'MSFT']))
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ ...mockVolatilityData, ticker: 'AAPL' }),
    })

    render(<App />)

    // Find AAPL in the sidebar (the button element)
    const sidebar = document.querySelector('aside')
    const aaplButtonBefore = within(sidebar).getByText('AAPL').closest('button')
    fireEvent.click(aaplButtonBefore)

    await waitFor(() => {
      const aaplButton = within(sidebar).getByText('AAPL').closest('button')
      expect(aaplButton).toHaveClass('border-l-2')
      expect(aaplButton).toHaveClass('border-[#3b82f6]')
    })
  })

  it('renders MAX 10 ITEMS text in sidebar', () => {
    render(<App />)
    expect(screen.getByText('MAX 10 ITEMS')).toBeInTheDocument()
  })

  it('shows numbered indices in history', () => {
    localStorage.getItem.mockReturnValue(JSON.stringify(['AAPL', 'MSFT']))

    render(<App />)

    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('clears data on error', async () => {
    // First, load data successfully
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockVolatilityData),
    })

    render(<App />)

    const input = screen.getByPlaceholderText('SYMBOL')
    fireEvent.change(input, { target: { value: 'SPY' } })
    fireEvent.submit(input.closest('form'))

    await waitFor(() => {
      expect(screen.getByText('450.25')).toBeInTheDocument()
    })

    // Then trigger an error
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ detail: 'Error' }),
    })

    fireEvent.change(input, { target: { value: 'BAD' } })
    fireEvent.submit(input.closest('form'))

    await waitFor(() => {
      expect(screen.queryByText('450.25')).not.toBeInTheDocument()
    })
  })
})
