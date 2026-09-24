import { apiClient, BACKEND_READY, BackendNotReadyError } from './apiClient'
import type { AuthSession, StudentProfile, User } from '@/types'

export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload {
  name: string
  email: string
  password: string
  preferredLanguage: 'en' | 'sw'
}

/**
 * Expected backend contract:
 *  POST /auth/login          -> AuthSession
 *  POST /auth/register       -> AuthSession
 *  POST /auth/forgot-password -> { message: string }
 *  POST /auth/reset-password  -> { message: string }
 *  GET  /auth/me              -> User
 *  POST /auth/logout          -> void
 *  PATCH /users/me/profile    -> StudentProfile
 */
export const authService = {
  async login(payload: LoginPayload): Promise<AuthSession> {
    if (!BACKEND_READY) throw new BackendNotReadyError('POST /auth/login')
    const { data } = await apiClient.post<AuthSession>('/auth/login', payload)
    return data
  },

  async register(payload: RegisterPayload): Promise<AuthSession> {
    if (!BACKEND_READY) throw new BackendNotReadyError('POST /auth/register')
    const { data } = await apiClient.post<AuthSession>('/auth/register', payload)
    return data
  },

  async forgotPassword(email: string): Promise<{ message: string }> {
    if (!BACKEND_READY) throw new BackendNotReadyError('POST /auth/forgot-password')
    const { data } = await apiClient.post('/auth/forgot-password', { email })
    return data
  },

  async resetPassword(token: string, password: string): Promise<{ message: string }> {
    if (!BACKEND_READY) throw new BackendNotReadyError('POST /auth/reset-password')
    const { data } = await apiClient.post('/auth/reset-password', { token, password })
    return data
  },

  async getCurrentUser(): Promise<User> {
    if (!BACKEND_READY) throw new BackendNotReadyError('GET /auth/me')
    const { data } = await apiClient.get<User>('/auth/me')
    return data
  },

  async logout(): Promise<void> {
    localStorage.removeItem('lambert_access_token')
    if (!BACKEND_READY) return
    await apiClient.post('/auth/logout')
  },

  async updateProfile(payload: Partial<StudentProfile>): Promise<StudentProfile> {
    if (!BACKEND_READY) throw new BackendNotReadyError('PATCH /users/me/profile')
    const { data } = await apiClient.patch<StudentProfile>('/users/me/profile', payload)
    return data
  },
}
