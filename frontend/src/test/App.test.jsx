import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import App from '../App'
import { mockVolatilityData } from './mockData'

// Mock useAuth
const mockSignOut = vi.fn()
vi.mock('../auth/AuthContext', () => ({
  useAuth: vi.fn(),
}))

import { useAuth } from '../auth/AuthContext'

// Mock import.meta.env
vi.stubEnv('VITE_API_BASE', '')
vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'test-client-id')

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.getItem.mockReturnValue(null)
    global.fetch = vi.fn()
    useAuth.mockReturnValue({
      user: { name: 'Test User', email: 'test@example.com', token: 'mock-token', picture: null },
      loading: false,
      signOut: mockSignOut,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders sign-in page when user is null', () => {
    useAuth.mockReturnValue({ user: null, loading: false, signOut: mockSignOut })
    render(<App />)
    expect(screen.getByText('SIGN IN TO CONTINUE')).toBeInTheDocument()
  })

  it('renders nothing while auth is loading', () => {
    useAuth.mockReturnValue({ user: null, loading: true, signOut: mockSignOut })
    const { container } = render(<App />)
    expect(container.innerHTML).toBe('')
  })

  it('renders header with title', () => {
    render(<App />)
    expect(screen.getByText('INVESTMENT ANALYSIS')).toBeInTheDocument()
  })

  it('renders user email in header', () => {
    render(<App />)
    expect(screen.getByText('test@example.com')).toBeInTheDocument()
  })

  it('renders sign out button', () => {
    render(<App />)
    expect(screen.getByText('SIGN OUT')).toBeInTheDocument()
  })

  it('calls signOut when SIGN OUT is clicked', () => {
    render(<App />)
    fireEvent.click(screen.getByText('SIGN OUT'))
    expect(mockSignOut).toHaveBeenCalled()
  })

  it('renders user picture when available', () => {
    useAuth.mockReturnValue({
      user: { name: 'Test', email: 'test@example.com', token: 'tok', picture: 'https://example.com/pic.jpg' },
      loading: false,
      signOut: mockSignOut,
    })
    render(<App />)
    const img = screen.getByAltText('Test')
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', 'https://example.com/pic.jpg')
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

  it('fetches data with auth header when quick symbol is clicked', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockVolatilityData),
    })

    render(<App />)

    const spyButton = screen.getAllByText('SPY')[0]
    fireEvent.click(spyButton)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/volatility/SPY',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-token',
          }),
        })
      )
    })
  })

  it('displays data after successful fetch', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
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
      status: 500,
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
      status: 500,
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

  it('signs out on 401 response', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
    })

    render(<App />)

    const input = screen.getByPlaceholderText('SYMBOL')
    fireEvent.change(input, { target: { value: 'SPY' } })
    fireEvent.submit(input.closest('form'))

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled()
    })
  })

  it('shows access denied and signs out on 403 response', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
    })

    render(<App />)

    const input = screen.getByPlaceholderText('SYMBOL')
    fireEvent.change(input, { target: { value: 'SPY' } })
    fireEvent.submit(input.closest('form'))

    await waitFor(() => {
      expect(screen.getByText('Access denied — your account is not authorized')).toBeInTheDocument()
      expect(mockSignOut).toHaveBeenCalled()
    })
  })

  it('adds ticker to history after successful fetch', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
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

  it('fetches data with auth header when history item is clicked', async () => {
    localStorage.getItem.mockReturnValue(JSON.stringify(['AAPL']))
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ ...mockVolatilityData, ticker: 'AAPL' }),
    })

    render(<App />)

    fireEvent.click(screen.getByText('AAPL'))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/volatility/AAPL',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-token',
          }),
        })
      )
    })
  })

  it('moves repeated ticker to top of history', async () => {
    localStorage.getItem.mockReturnValue(JSON.stringify(['AAPL', 'MSFT']))
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
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
      status: 200,
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
      status: 200,
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
      status: 200,
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
      status: 500,
      json: () => Promise.resolve({ detail: 'Error' }),
    })

    fireEvent.change(input, { target: { value: 'BAD' } })
    fireEvent.submit(input.closest('form'))

    await waitFor(() => {
      expect(screen.queryByText('450.25')).not.toBeInTheDocument()
    })
  })
})
