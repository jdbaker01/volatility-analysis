import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import PortfolioPage from '../components/PortfolioPage'
import { mockPortfolios, mockPortfolioAnalytics } from './mockData'

// Mock all child components
vi.mock('../components/PortfolioTree', () => ({
  default: (props) => (
    <div data-testid="portfolio-tree">
      {props.portfolios.length === 0 && <span>No portfolios yet</span>}
      {props.portfolios.map((p) => (
        <div key={p.id}>
          <button data-testid={`select-${p.id}`} onClick={() => props.onSelect(p)}>
            {p.name}
          </button>
          <button data-testid={`delete-${p.id}`} onClick={() => props.onDelete(p.id)}>
            Delete {p.name}
          </button>
        </div>
      ))}
      <span data-testid="selected-id">{props.selectedId || 'none'}</span>
    </div>
  ),
}))

vi.mock('../components/PortfolioForm', () => ({
  default: (props) => (
    <div data-testid="portfolio-form">
      <button data-testid="form-submit" onClick={() => props.onSubmit({ name: 'New Portfolio', portfolio_type: 'leaf', parent_id: null })}>
        Submit
      </button>
      <button data-testid="form-cancel" onClick={props.onCancel}>
        Cancel
      </button>
    </div>
  ),
}))

vi.mock('../components/HoldingsTable', () => ({
  default: (props) => (
    <div data-testid="holdings-table">
      <span data-testid="holdings-portfolio-id">{props.portfolioId}</span>
      <button data-testid="save-holdings" onClick={() => props.onSave(props.portfolioId, [{ ticker: 'AAPL', shares: 100 }])}>
        Save Holdings
      </button>
    </div>
  ),
}))

vi.mock('../components/PortfolioAnalytics', () => ({
  default: (props) => (
    props.analytics ? <div data-testid="portfolio-analytics">Analytics: {props.analytics.current_value}</div> : null
  ),
}))

// Mock useAuth
const mockSignOut = vi.fn()
vi.mock('../auth/AuthContext', () => ({
  useAuth: vi.fn(),
}))

import { useAuth } from '../auth/AuthContext'

vi.stubEnv('VITE_API_BASE', '')

describe('PortfolioPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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

  const mockFetchPortfoliosSuccess = () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ portfolios: mockPortfolios }),
    })
  }

  const mockFetchPortfoliosEmpty = () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ portfolios: [] }),
    })
  }

  const mockFetchAnalyticsSuccess = () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockPortfolioAnalytics),
    })
  }

  it('fetches portfolios on mount', async () => {
    mockFetchPortfoliosSuccess()
    render(<PortfolioPage />)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/portfolios',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-token',
          }),
        })
      )
    })
  })

  it('renders portfolio tree with fetched portfolios', async () => {
    mockFetchPortfoliosSuccess()
    render(<PortfolioPage />)

    await waitFor(() => {
      expect(screen.getByText('Tech Stocks')).toBeInTheDocument()
    })
  })

  it('shows empty state when no portfolio is selected', async () => {
    mockFetchPortfoliosEmpty()
    render(<PortfolioPage />)

    await waitFor(() => {
      expect(screen.getByText('SELECT OR CREATE A PORTFOLIO')).toBeInTheDocument()
    })
  })

  it('shows + NEW PORTFOLIO button in empty state', async () => {
    mockFetchPortfoliosEmpty()
    render(<PortfolioPage />)

    await waitFor(() => {
      expect(screen.getByText('+ NEW PORTFOLIO')).toBeInTheDocument()
    })
  })

  it('shows + NEW button in sidebar', async () => {
    mockFetchPortfoliosEmpty()
    render(<PortfolioPage />)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled()
    })

    expect(screen.getByText('+ NEW')).toBeInTheDocument()
  })

  it('shows PORTFOLIOS label in sidebar', async () => {
    mockFetchPortfoliosEmpty()
    render(<PortfolioPage />)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled()
    })

    expect(screen.getByText('PORTFOLIOS')).toBeInTheDocument()
  })

  it('shows create form when + NEW is clicked', async () => {
    mockFetchPortfoliosEmpty()
    render(<PortfolioPage />)

    fireEvent.click(screen.getByText('+ NEW'))

    await waitFor(() => {
      expect(screen.getByTestId('portfolio-form')).toBeInTheDocument()
    })
  })

  it('shows create form when + NEW PORTFOLIO is clicked', async () => {
    mockFetchPortfoliosEmpty()
    render(<PortfolioPage />)

    await waitFor(() => {
      expect(screen.getByText('+ NEW PORTFOLIO')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('+ NEW PORTFOLIO'))

    expect(screen.getByTestId('portfolio-form')).toBeInTheDocument()
  })

  it('hides form when cancel is clicked', async () => {
    mockFetchPortfoliosEmpty()
    render(<PortfolioPage />)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled()
    })

    fireEvent.click(screen.getByText('+ NEW'))
    expect(screen.getByTestId('portfolio-form')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('form-cancel'))
    expect(screen.queryByTestId('portfolio-form')).not.toBeInTheDocument()
  })

  it('creates portfolio via POST and refreshes list', async () => {
    mockFetchPortfoliosEmpty()
    render(<PortfolioPage />)

    await waitFor(() => {
      expect(screen.getByText('+ NEW PORTFOLIO')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('+ NEW'))

    // Mock the POST response
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: () => Promise.resolve({ id: 'new1', name: 'New Portfolio', portfolio_type: 'leaf' }),
    })
    // Mock the subsequent GET to refresh portfolios
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ portfolios: [{ id: 'new1', name: 'New Portfolio', portfolio_type: 'leaf', parent_id: null }] }),
    })

    fireEvent.click(screen.getByTestId('form-submit'))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/portfolios',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'New Portfolio', portfolio_type: 'leaf', parent_id: null }),
        })
      )
    })

    // Form should be hidden after successful create
    await waitFor(() => {
      expect(screen.queryByTestId('portfolio-form')).not.toBeInTheDocument()
    })
  })

  it('deletes portfolio via DELETE and refreshes list', async () => {
    mockFetchPortfoliosSuccess()
    render(<PortfolioPage />)

    await waitFor(() => {
      expect(screen.getByText('Tech Stocks')).toBeInTheDocument()
    })

    // Mock DELETE response
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    })
    // Mock the subsequent GET refresh
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ portfolios: [] }),
    })

    fireEvent.click(screen.getByTestId('delete-p1'))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/portfolios/p1',
        expect.objectContaining({ method: 'DELETE' })
      )
    })
  })

  it('clears selected portfolio and analytics when selected portfolio is deleted', async () => {
    mockFetchPortfoliosSuccess()
    render(<PortfolioPage />)

    await waitFor(() => {
      expect(screen.getByText('Tech Stocks')).toBeInTheDocument()
    })

    // Select a portfolio
    mockFetchAnalyticsSuccess()
    fireEvent.click(screen.getByTestId('select-p1'))

    await waitFor(() => {
      expect(screen.getByTestId('portfolio-analytics')).toBeInTheDocument()
    })

    // Now delete the selected portfolio
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    })
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ portfolios: [] }),
    })

    fireEvent.click(screen.getByTestId('delete-p1'))

    await waitFor(() => {
      expect(screen.queryByTestId('portfolio-analytics')).not.toBeInTheDocument()
    })
  })

  it('selects portfolio and fetches analytics', async () => {
    mockFetchPortfoliosSuccess()
    render(<PortfolioPage />)

    await waitFor(() => {
      expect(screen.getByText('Tech Stocks')).toBeInTheDocument()
    })

    mockFetchAnalyticsSuccess()
    fireEvent.click(screen.getByTestId('select-p1'))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/portfolios/p1/analytics',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-token',
          }),
        })
      )
    })

    await waitFor(() => {
      expect(screen.getByTestId('portfolio-analytics')).toBeInTheDocument()
    })
  })

  it('displays portfolio name and type when selected', async () => {
    mockFetchPortfoliosSuccess()
    render(<PortfolioPage />)

    await waitFor(() => {
      expect(screen.getByText('Tech Stocks')).toBeInTheDocument()
    })

    mockFetchAnalyticsSuccess()
    fireEvent.click(screen.getByTestId('select-p1'))

    await waitFor(() => {
      expect(screen.getByText('leaf')).toBeInTheDocument()
    })
  })

  it('shows HoldingsTable for leaf portfolios', async () => {
    mockFetchPortfoliosSuccess()
    render(<PortfolioPage />)

    await waitFor(() => {
      expect(screen.getByText('Tech Stocks')).toBeInTheDocument()
    })

    mockFetchAnalyticsSuccess()
    fireEvent.click(screen.getByTestId('select-p1'))

    await waitFor(() => {
      expect(screen.getByTestId('holdings-table')).toBeInTheDocument()
    })
  })

  it('does not show HoldingsTable for group portfolios', async () => {
    mockFetchPortfoliosSuccess()
    render(<PortfolioPage />)

    await waitFor(() => {
      expect(screen.getByText('My Groups')).toBeInTheDocument()
    })

    mockFetchAnalyticsSuccess()
    fireEvent.click(screen.getByTestId('select-p2'))

    await waitFor(() => {
      expect(screen.queryByTestId('holdings-table')).not.toBeInTheDocument()
    })
  })

  it('saves holdings via PUT', async () => {
    mockFetchPortfoliosSuccess()
    render(<PortfolioPage />)

    await waitFor(() => {
      expect(screen.getByText('Tech Stocks')).toBeInTheDocument()
    })

    mockFetchAnalyticsSuccess()
    fireEvent.click(screen.getByTestId('select-p1'))

    await waitFor(() => {
      expect(screen.getByTestId('holdings-table')).toBeInTheDocument()
    })

    // Mock the PUT response
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ id: 'p1', name: 'Tech Stocks', portfolio_type: 'leaf', holdings: [{ ticker: 'AAPL', shares: 100 }] }),
    })
    // Mock the GET refresh
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ portfolios: mockPortfolios }),
    })
    // Mock the analytics refresh
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockPortfolioAnalytics),
    })

    fireEvent.click(screen.getByTestId('save-holdings'))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/portfolios/p1/holdings',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ holdings: [{ ticker: 'AAPL', shares: 100 }] }),
        })
      )
    })
  })

  it('shows loading state while fetching analytics', async () => {
    mockFetchPortfoliosSuccess()
    render(<PortfolioPage />)

    await waitFor(() => {
      expect(screen.getByText('Tech Stocks')).toBeInTheDocument()
    })

    // Create a promise we can control
    let resolveAnalytics
    global.fetch.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveAnalytics = resolve
      })
    )

    fireEvent.click(screen.getByTestId('select-p1'))

    await waitFor(() => {
      expect(screen.getByText('LOADING ANALYTICS...')).toBeInTheDocument()
    })

    // Resolve the analytics fetch
    resolveAnalytics({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockPortfolioAnalytics),
    })

    await waitFor(() => {
      expect(screen.queryByText('LOADING ANALYTICS...')).not.toBeInTheDocument()
    })
  })

  it('handles API error when fetching portfolios', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ detail: 'Server error' }),
    })
    render(<PortfolioPage />)

    await waitFor(() => {
      expect(screen.getByText('Failed to fetch portfolios')).toBeInTheDocument()
    })
  })

  it('handles network error when fetching portfolios', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Network failure'))
    render(<PortfolioPage />)

    await waitFor(() => {
      expect(screen.getByText('Network failure')).toBeInTheDocument()
    })
  })

  it('handles API error when fetching analytics', async () => {
    mockFetchPortfoliosSuccess()
    render(<PortfolioPage />)

    await waitFor(() => {
      expect(screen.getByText('Tech Stocks')).toBeInTheDocument()
    })

    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ detail: 'Analytics error' }),
    })

    fireEvent.click(screen.getByTestId('select-p1'))

    await waitFor(() => {
      expect(screen.getByText('Analytics error')).toBeInTheDocument()
    })
  })

  it('handles analytics error with no detail', async () => {
    mockFetchPortfoliosSuccess()
    render(<PortfolioPage />)

    await waitFor(() => {
      expect(screen.getByText('Tech Stocks')).toBeInTheDocument()
    })

    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({}),
    })

    fireEvent.click(screen.getByTestId('select-p1'))

    await waitFor(() => {
      expect(screen.getByText('Failed to fetch analytics')).toBeInTheDocument()
    })
  })

  it('handles network error when fetching analytics', async () => {
    mockFetchPortfoliosSuccess()
    render(<PortfolioPage />)

    await waitFor(() => {
      expect(screen.getByText('Tech Stocks')).toBeInTheDocument()
    })

    global.fetch.mockRejectedValueOnce(new Error('Analytics network error'))

    fireEvent.click(screen.getByTestId('select-p1'))

    await waitFor(() => {
      expect(screen.getByText('Analytics network error')).toBeInTheDocument()
    })
  })

  it('clears analytics on analytics fetch error', async () => {
    mockFetchPortfoliosSuccess()
    render(<PortfolioPage />)

    await waitFor(() => {
      expect(screen.getByText('Tech Stocks')).toBeInTheDocument()
    })

    // First select with success
    mockFetchAnalyticsSuccess()
    fireEvent.click(screen.getByTestId('select-p1'))

    await waitFor(() => {
      expect(screen.getByTestId('portfolio-analytics')).toBeInTheDocument()
    })

    // Now select another that fails
    global.fetch.mockRejectedValueOnce(new Error('Fail'))
    fireEvent.click(screen.getByTestId('select-p2'))

    await waitFor(() => {
      expect(screen.queryByTestId('portfolio-analytics')).not.toBeInTheDocument()
    })
  })

  it('handles 401 auth error on fetch portfolios', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
    })
    render(<PortfolioPage />)

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled()
    })
  })

  it('handles 403 auth error on fetch portfolios', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
    })
    render(<PortfolioPage />)

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled()
      expect(screen.getByText('Access denied')).toBeInTheDocument()
    })
  })

  it('handles 401 on analytics fetch', async () => {
    mockFetchPortfoliosSuccess()
    render(<PortfolioPage />)

    await waitFor(() => {
      expect(screen.getByText('Tech Stocks')).toBeInTheDocument()
    })

    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
    })

    fireEvent.click(screen.getByTestId('select-p1'))

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled()
    })
  })

  it('handles 403 on analytics fetch', async () => {
    mockFetchPortfoliosSuccess()
    render(<PortfolioPage />)

    await waitFor(() => {
      expect(screen.getByText('Tech Stocks')).toBeInTheDocument()
    })

    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
    })

    fireEvent.click(screen.getByTestId('select-p1'))

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled()
      expect(screen.getByText('Access denied')).toBeInTheDocument()
    })
  })

  it('handles 401 on create portfolio', async () => {
    mockFetchPortfoliosEmpty()
    render(<PortfolioPage />)

    await waitFor(() => {
      expect(screen.getByText('+ NEW PORTFOLIO')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('+ NEW'))

    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
    })

    fireEvent.click(screen.getByTestId('form-submit'))

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled()
    })
  })

  it('handles 403 on create portfolio', async () => {
    mockFetchPortfoliosEmpty()
    render(<PortfolioPage />)

    await waitFor(() => {
      expect(screen.getByText('+ NEW PORTFOLIO')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('+ NEW'))

    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
    })

    fireEvent.click(screen.getByTestId('form-submit'))

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled()
      expect(screen.getByText('Access denied')).toBeInTheDocument()
    })
  })

  it('handles create portfolio API error', async () => {
    mockFetchPortfoliosEmpty()
    render(<PortfolioPage />)

    await waitFor(() => {
      expect(screen.getByText('+ NEW PORTFOLIO')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('+ NEW'))

    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ detail: 'Create failed' }),
    })

    fireEvent.click(screen.getByTestId('form-submit'))

    await waitFor(() => {
      expect(screen.getByText('Create failed')).toBeInTheDocument()
    })
  })

  it('handles create portfolio API error with no detail', async () => {
    mockFetchPortfoliosEmpty()
    render(<PortfolioPage />)

    await waitFor(() => {
      expect(screen.getByText('+ NEW PORTFOLIO')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('+ NEW'))

    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({}),
    })

    fireEvent.click(screen.getByTestId('form-submit'))

    await waitFor(() => {
      expect(screen.getByText('Failed to create portfolio')).toBeInTheDocument()
    })
  })

  it('handles create portfolio network error', async () => {
    mockFetchPortfoliosEmpty()
    render(<PortfolioPage />)

    await waitFor(() => {
      expect(screen.getByText('+ NEW PORTFOLIO')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('+ NEW'))

    global.fetch.mockRejectedValueOnce(new Error('Network error'))

    fireEvent.click(screen.getByTestId('form-submit'))

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument()
    })
  })

  it('handles 401 on delete portfolio', async () => {
    mockFetchPortfoliosSuccess()
    render(<PortfolioPage />)

    await waitFor(() => {
      expect(screen.getByText('Tech Stocks')).toBeInTheDocument()
    })

    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
    })

    fireEvent.click(screen.getByTestId('delete-p1'))

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled()
    })
  })

  it('handles 403 on delete portfolio', async () => {
    mockFetchPortfoliosSuccess()
    render(<PortfolioPage />)

    await waitFor(() => {
      expect(screen.getByText('Tech Stocks')).toBeInTheDocument()
    })

    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
    })

    fireEvent.click(screen.getByTestId('delete-p1'))

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled()
    })
  })

  it('handles delete portfolio API error', async () => {
    mockFetchPortfoliosSuccess()
    render(<PortfolioPage />)

    await waitFor(() => {
      expect(screen.getByText('Tech Stocks')).toBeInTheDocument()
    })

    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({}),
    })

    fireEvent.click(screen.getByTestId('delete-p1'))

    await waitFor(() => {
      expect(screen.getByText('Failed to delete portfolio')).toBeInTheDocument()
    })
  })

  it('handles delete portfolio network error', async () => {
    mockFetchPortfoliosSuccess()
    render(<PortfolioPage />)

    await waitFor(() => {
      expect(screen.getByText('Tech Stocks')).toBeInTheDocument()
    })

    global.fetch.mockRejectedValueOnce(new Error('Delete network error'))

    fireEvent.click(screen.getByTestId('delete-p1'))

    await waitFor(() => {
      expect(screen.getByText('Delete network error')).toBeInTheDocument()
    })
  })

  it('handles 401 on save holdings', async () => {
    mockFetchPortfoliosSuccess()
    render(<PortfolioPage />)

    await waitFor(() => {
      expect(screen.getByText('Tech Stocks')).toBeInTheDocument()
    })

    mockFetchAnalyticsSuccess()
    fireEvent.click(screen.getByTestId('select-p1'))

    await waitFor(() => {
      expect(screen.getByTestId('holdings-table')).toBeInTheDocument()
    })

    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
    })

    fireEvent.click(screen.getByTestId('save-holdings'))

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled()
    })
  })

  it('handles 403 on save holdings', async () => {
    mockFetchPortfoliosSuccess()
    render(<PortfolioPage />)

    await waitFor(() => {
      expect(screen.getByText('Tech Stocks')).toBeInTheDocument()
    })

    mockFetchAnalyticsSuccess()
    fireEvent.click(screen.getByTestId('select-p1'))

    await waitFor(() => {
      expect(screen.getByTestId('holdings-table')).toBeInTheDocument()
    })

    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
    })

    fireEvent.click(screen.getByTestId('save-holdings'))

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled()
    })
  })

  it('handles save holdings API error', async () => {
    mockFetchPortfoliosSuccess()
    render(<PortfolioPage />)

    await waitFor(() => {
      expect(screen.getByText('Tech Stocks')).toBeInTheDocument()
    })

    mockFetchAnalyticsSuccess()
    fireEvent.click(screen.getByTestId('select-p1'))

    await waitFor(() => {
      expect(screen.getByTestId('holdings-table')).toBeInTheDocument()
    })

    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ detail: 'Save failed' }),
    })

    fireEvent.click(screen.getByTestId('save-holdings'))

    await waitFor(() => {
      expect(screen.getByText('Save failed')).toBeInTheDocument()
    })
  })

  it('handles save holdings API error with no detail', async () => {
    mockFetchPortfoliosSuccess()
    render(<PortfolioPage />)

    await waitFor(() => {
      expect(screen.getByText('Tech Stocks')).toBeInTheDocument()
    })

    mockFetchAnalyticsSuccess()
    fireEvent.click(screen.getByTestId('select-p1'))

    await waitFor(() => {
      expect(screen.getByTestId('holdings-table')).toBeInTheDocument()
    })

    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({}),
    })

    fireEvent.click(screen.getByTestId('save-holdings'))

    await waitFor(() => {
      expect(screen.getByText('Failed to save holdings')).toBeInTheDocument()
    })
  })

  it('handles save holdings network error', async () => {
    mockFetchPortfoliosSuccess()
    render(<PortfolioPage />)

    await waitFor(() => {
      expect(screen.getByText('Tech Stocks')).toBeInTheDocument()
    })

    mockFetchAnalyticsSuccess()
    fireEvent.click(screen.getByTestId('select-p1'))

    await waitFor(() => {
      expect(screen.getByTestId('holdings-table')).toBeInTheDocument()
    })

    global.fetch.mockRejectedValueOnce(new Error('Holdings network error'))

    fireEvent.click(screen.getByTestId('save-holdings'))

    await waitFor(() => {
      expect(screen.getByText('Holdings network error')).toBeInTheDocument()
    })
  })

  it('hides form and clears error when selecting a portfolio', async () => {
    mockFetchPortfoliosSuccess()
    render(<PortfolioPage />)

    await waitFor(() => {
      expect(screen.getByText('Tech Stocks')).toBeInTheDocument()
    })

    // Show the form
    fireEvent.click(screen.getByText('+ NEW'))
    expect(screen.getByTestId('portfolio-form')).toBeInTheDocument()

    // Select a portfolio
    mockFetchAnalyticsSuccess()
    fireEvent.click(screen.getByTestId('select-p1'))

    await waitFor(() => {
      expect(screen.queryByTestId('portfolio-form')).not.toBeInTheDocument()
    })
  })

  it('clears selected portfolio when + NEW is clicked', async () => {
    mockFetchPortfoliosSuccess()
    render(<PortfolioPage />)

    await waitFor(() => {
      expect(screen.getByText('Tech Stocks')).toBeInTheDocument()
    })

    // Select a portfolio
    mockFetchAnalyticsSuccess()
    fireEvent.click(screen.getByTestId('select-p1'))

    await waitFor(() => {
      expect(screen.getByTestId('portfolio-analytics')).toBeInTheDocument()
    })

    // Click + NEW - should clear selection and show form
    fireEvent.click(screen.getByText('+ NEW'))

    await waitFor(() => {
      expect(screen.getByTestId('portfolio-form')).toBeInTheDocument()
    })
  })

  it('does not show analytics while loading', async () => {
    mockFetchPortfoliosSuccess()
    render(<PortfolioPage />)

    await waitFor(() => {
      expect(screen.getByText('Tech Stocks')).toBeInTheDocument()
    })

    let resolveAnalytics
    global.fetch.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveAnalytics = resolve
      })
    )

    fireEvent.click(screen.getByTestId('select-p1'))

    await waitFor(() => {
      expect(screen.getByText('LOADING ANALYTICS...')).toBeInTheDocument()
    })

    // Analytics should not be shown while loading
    expect(screen.queryByTestId('portfolio-analytics')).not.toBeInTheDocument()

    resolveAnalytics({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockPortfolioAnalytics),
    })

    await waitFor(() => {
      expect(screen.getByTestId('portfolio-analytics')).toBeInTheDocument()
      expect(screen.queryByText('LOADING ANALYTICS...')).not.toBeInTheDocument()
    })
  })

  it('clears analytics when no portfolio is selected via useEffect', async () => {
    mockFetchPortfoliosSuccess()
    render(<PortfolioPage />)

    await waitFor(() => {
      expect(screen.getByText('Tech Stocks')).toBeInTheDocument()
    })

    // Select and load analytics
    mockFetchAnalyticsSuccess()
    fireEvent.click(screen.getByTestId('select-p1'))

    await waitFor(() => {
      expect(screen.getByTestId('portfolio-analytics')).toBeInTheDocument()
    })

    // Delete the selected portfolio to trigger null selectedPortfolio
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    })
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ portfolios: [] }),
    })

    fireEvent.click(screen.getByTestId('delete-p1'))

    await waitFor(() => {
      expect(screen.queryByTestId('portfolio-analytics')).not.toBeInTheDocument()
    })
  })

  it('passes holdings to HoldingsTable when portfolio has no holdings', async () => {
    const portfoliosNoHoldings = [
      { id: 'p1', name: 'Empty Leaf', portfolio_type: 'leaf', parent_id: null },
    ]
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ portfolios: portfoliosNoHoldings }),
    })

    render(<PortfolioPage />)

    await waitFor(() => {
      expect(screen.getByText('Empty Leaf')).toBeInTheDocument()
    })

    mockFetchAnalyticsSuccess()
    fireEvent.click(screen.getByTestId('select-p1'))

    await waitFor(() => {
      expect(screen.getByTestId('holdings-table')).toBeInTheDocument()
    })
  })
})
