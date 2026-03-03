import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { AuthProvider, useAuth } from '../auth/AuthContext'

// Helper to create a mock JWT
function createMockJwt(payload) {
  const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const body = btoa(JSON.stringify(payload))
  return `${header}.${body}.mock-signature`
}

// Test component that exposes auth state
function AuthConsumer() {
  const { user, loading, signOut } = useAuth()
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="user">{user ? user.email : 'null'}</span>
      {user && <button onClick={signOut}>Sign Out</button>}
    </div>
  )
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.getItem.mockReturnValue(null)
  })

  it('renders children', () => {
    render(
      <AuthProvider googleClientId="test-id">
        <span>child content</span>
      </AuthProvider>
    )
    expect(screen.getByText('child content')).toBeInTheDocument()
  })

  it('starts with null user after loading', () => {
    render(
      <AuthProvider googleClientId="test-id">
        <AuthConsumer />
      </AuthProvider>
    )
    expect(screen.getByTestId('loading').textContent).toBe('false')
    expect(screen.getByTestId('user').textContent).toBe('null')
  })

  it('initializes Google Identity Services', () => {
    render(
      <AuthProvider googleClientId="test-client-id">
        <AuthConsumer />
      </AuthProvider>
    )
    expect(google.accounts.id.initialize).toHaveBeenCalledWith(
      expect.objectContaining({
        client_id: 'test-client-id',
        auto_select: true,
      })
    )
  })

  it('sets user on credential response', () => {
    render(
      <AuthProvider googleClientId="test-id">
        <AuthConsumer />
      </AuthProvider>
    )

    // Get the callback passed to google.accounts.id.initialize
    const initCall = google.accounts.id.initialize.mock.calls[0][0]
    const mockToken = createMockJwt({
      name: 'Test User',
      email: 'test@example.com',
      picture: 'https://example.com/photo.jpg',
      exp: Math.floor(Date.now() / 1000) + 3600,
    })

    act(() => {
      initCall.callback({ credential: mockToken })
    })

    expect(screen.getByTestId('user').textContent).toBe('test@example.com')
    expect(localStorage.setItem).toHaveBeenCalledWith(
      'auth_user',
      expect.stringContaining('test@example.com')
    )
  })

  it('restores valid token from localStorage', () => {
    const savedUser = {
      name: 'Saved User',
      email: 'saved@example.com',
      picture: null,
      token: 'saved-token',
      exp: Math.floor(Date.now() / 1000) + 3600,
    }
    localStorage.getItem.mockReturnValue(JSON.stringify(savedUser))

    render(
      <AuthProvider googleClientId="test-id">
        <AuthConsumer />
      </AuthProvider>
    )

    expect(screen.getByTestId('user').textContent).toBe('saved@example.com')
  })

  it('clears expired token from localStorage', () => {
    const expiredUser = {
      name: 'Expired User',
      email: 'expired@example.com',
      picture: null,
      token: 'expired-token',
      exp: Math.floor(Date.now() / 1000) - 3600,
    }
    localStorage.getItem.mockReturnValue(JSON.stringify(expiredUser))

    render(
      <AuthProvider googleClientId="test-id">
        <AuthConsumer />
      </AuthProvider>
    )

    expect(screen.getByTestId('user').textContent).toBe('null')
    expect(localStorage.removeItem).toHaveBeenCalledWith('auth_user')
  })

  it('signOut clears user state and localStorage', () => {
    const savedUser = {
      name: 'Test User',
      email: 'test@example.com',
      picture: null,
      token: 'valid-token',
      exp: Math.floor(Date.now() / 1000) + 3600,
    }
    localStorage.getItem.mockReturnValue(JSON.stringify(savedUser))

    render(
      <AuthProvider googleClientId="test-id">
        <AuthConsumer />
      </AuthProvider>
    )

    expect(screen.getByTestId('user').textContent).toBe('test@example.com')

    act(() => {
      screen.getByText('Sign Out').click()
    })

    expect(screen.getByTestId('user').textContent).toBe('null')
    expect(localStorage.removeItem).toHaveBeenCalledWith('auth_user')
    expect(google.accounts.id.disableAutoSelect).toHaveBeenCalled()
  })
})
