import axios, { AxiosError, type AxiosInstance } from 'axios'
import type { ApiError } from '@/types'

// Base URL comes from environment configuration. NEVER hardcode secrets here —
// the API accepts only a bearer token issued by the real backend after login.
const BASE_URL = import.meta.env.VITE_API_URL ?? '/api'

export const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30_000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Attach the auth token (if present) to every request.
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('lambert_access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Normalize errors and handle expired sessions in one place.
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string; code?: string }>) => {
    const status = error.response?.status ?? 0

    if (status === 401) {
      localStorage.removeItem('lambert_access_token')
      window.dispatchEvent(new CustomEvent('lambert:session-expired'))
    }

    const normalized: ApiError = {
      status,
      code: error.response?.data?.code ?? 'unknown_error',
      message:
        error.response?.data?.message ??
        "Lambert AI couldn't reach the server right now. Please try again.",
    }
    return Promise.reject(normalized)
  }
)

/**
 * Thrown/returned by service methods while a given endpoint has not yet been
 * implemented by the backend. Pages should catch this (or check `isBackendPending`)
 * and render a clear "not connected yet" development state — never fabricated data.
 */
export class BackendNotReadyError extends Error {
  endpoint: string
  constructor(endpoint: string) {
    super(`Backend endpoint not yet available: ${endpoint}`)
    this.name = 'BackendNotReadyError'
    this.endpoint = endpoint
  }
}

export function isBackendPending(error: unknown): error is BackendNotReadyError {
  return error instanceof BackendNotReadyError
}

/** Flag services can check to short-circuit calls during local frontend development. */
export const BACKEND_READY = import.meta.env.VITE_BACKEND_READY === 'true'
