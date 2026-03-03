import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import SignInPage from '../components/SignInPage'

describe('SignInPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the app title', () => {
    render(<SignInPage googleClientId="test-id" />)
    expect(screen.getByText('INVESTMENT ANALYSIS')).toBeInTheDocument()
  })

  it('renders the sign-in prompt', () => {
    render(<SignInPage googleClientId="test-id" />)
    expect(screen.getByText('SIGN IN TO CONTINUE')).toBeInTheDocument()
  })

  it('renders the google sign-in button container', () => {
    render(<SignInPage googleClientId="test-id" />)
    expect(screen.getByTestId('google-signin-button')).toBeInTheDocument()
  })

  it('calls google renderButton on mount', () => {
    render(<SignInPage googleClientId="test-id" />)
    expect(google.accounts.id.renderButton).toHaveBeenCalledWith(
      expect.any(HTMLDivElement),
      expect.objectContaining({
        theme: 'filled_black',
        size: 'large',
      })
    )
  })
})
