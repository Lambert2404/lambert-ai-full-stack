import axios, { AxiosError, type AxiosInstance } from 'axios'
import type { ApiError } from '@/types'

// Base URL comes from environment configuration. NEVER hardcode secrets here —
// the API accepts only a bearer token issued by the real backend after login.
const BASE_URL = import.meta.env.VITE_API_URL ?? '/api'

export const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 120_000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Render's free tier spins the backend down after ~15 minutes of inactivity,
// and waking it can take well over 30 seconds. Treat the first request as a
// warm-up: give it one retry before surfacing the error to the user.
interface RetriedConfig {
  lambertRetried?: boolean
}

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('lambert_access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ message?: string; code?: string }>) => {
    const status = error.response?.status ?? 0
    const config = error.config as (typeof error.config & RetriedConfig) | undefined

    if (status === 401) {
      localStorage.removeItem('lambert_access_token')
      window.dispatchEvent(new CustomEvent('lambert:session-expired'))
    }

    // Retry once on network-level failures (no HTTP status): the backend is
    // likely still waking up from a Render free-tier idle spin-down.
    if (status === 0 && config && !config.lambertRetried) {
      config.lambertRetried = true
      await new Promise((resolve) => setTimeout(resolve, 3_000))
      return apiClient.request(config)
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
