import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock ResizeObserver for Recharts
class ResizeObserverMock {
  constructor(callback) {
    this.callback = callback
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = ResizeObserverMock

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
global.localStorage = localStorageMock

// Mock Google Identity Services
global.google = {
  accounts: {
    id: {
      initialize: vi.fn(),
      renderButton: vi.fn(),
      disableAutoSelect: vi.fn(),
      prompt: vi.fn(),
    },
  },
}
