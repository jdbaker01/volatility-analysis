import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const AuthContext = createContext(null)

const AUTH_KEY = 'auth_user'

export function AuthProvider({ children, googleClientId }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const handleCredentialResponse = useCallback((response) => {
    const payload = JSON.parse(atob(response.credential.split('.')[1]))
    const userData = {
      name: payload.name,
      email: payload.email,
      picture: payload.picture,
      token: response.credential,
      exp: payload.exp,
    }
    setUser(userData)
    localStorage.setItem(AUTH_KEY, JSON.stringify(userData))
  }, [])

  useEffect(() => {
    const saved = localStorage.getItem(AUTH_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      if (parsed.exp * 1000 > Date.now()) {
        setUser(parsed)
      } else {
        localStorage.removeItem(AUTH_KEY)
      }
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (window.google?.accounts?.id) {
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleCredentialResponse,
        auto_select: true,
      })
    }
  }, [googleClientId, handleCredentialResponse])

  const signOut = useCallback(() => {
    setUser(null)
    localStorage.removeItem(AUTH_KEY)
    window.google?.accounts?.id?.disableAutoSelect()
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
