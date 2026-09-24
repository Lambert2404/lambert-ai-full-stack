import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { User } from '@/types'
import { authService } from '@/services/authService'
import { BACKEND_READY } from '@/services/apiClient'

interface AuthContextValue {
  user: User | null
  isAuthenticated: boolean
  isInitializing: boolean
  sessionExpired: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  dismissSessionExpired: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)
  const [sessionExpired, setSessionExpired] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('lambert_access_token')
    if (!token || !BACKEND_READY) {
      setIsInitializing(false)
      return
    }
    authService
      .getCurrentUser()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setIsInitializing(false))
  }, [])

  useEffect(() => {
    const onExpired = () => {
      setUser(null)
      setSessionExpired(true)
    }
    window.addEventListener('lambert:session-expired', onExpired)
    return () => window.removeEventListener('lambert:session-expired', onExpired)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const session = await authService.login({ email, password })
    localStorage.setItem('lambert_access_token', session.accessToken)
    setUser(session.user)
    setSessionExpired(false)
  }, [])

  const register = useCallback(async (name: string, email: string, password: string) => {
    const session = await authService.register({ name, email, password, preferredLanguage: 'en' })
    localStorage.setItem('lambert_access_token', session.accessToken)
    setUser(session.user)
  }, [])

  const logout = useCallback(async () => {
    await authService.logout()
    setUser(null)
  }, [])

  const dismissSessionExpired = useCallback(() => setSessionExpired(false), [])

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isInitializing,
        sessionExpired,
        login,
        register,
        logout,
        dismissSessionExpired,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
