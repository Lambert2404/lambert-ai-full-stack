import { useCallback, useEffect, useRef, useState } from 'react'
import { isBackendPending } from '@/services/apiClient'

export type AsyncStatus = 'loading' | 'success' | 'empty' | 'error' | 'pending-backend'

interface UseAsyncResult<T> {
  status: AsyncStatus
  data: T | null
  errorMessage: string | null
  pendingEndpoint: string | null
  reload: () => void
}

/**
 * Wraps a service call and derives a consistent status:
 *  - 'pending-backend' when the endpoint isn't implemented yet (BackendNotReadyError)
 *  - 'error'   on any other failure
 *  - 'empty'   when the resolved data is an empty array/falsy
 *  - 'success' otherwise
 * Pages should switch on `status` and never render fabricated data.
 */
export function useAsync<T>(
  fn: () => Promise<T>,
  deps: React.DependencyList,
  isEmpty: (data: T) => boolean = (d) => Array.isArray(d) && d.length === 0
): UseAsyncResult<T> {
  const [status, setStatus] = useState<AsyncStatus>('loading')
  const [data, setData] = useState<T | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [pendingEndpoint, setPendingEndpoint] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const mounted = useRef(true)

  const reload = useCallback(() => setReloadKey((k) => k + 1), [])

  useEffect(() => {
    mounted.current = true
    setStatus('loading')
    fn()
      .then((result) => {
        if (!mounted.current) return
        setData(result)
        setStatus(isEmpty(result) ? 'empty' : 'success')
      })
      .catch((err) => {
        if (!mounted.current) return
        if (isBackendPending(err)) {
          setPendingEndpoint(err.endpoint)
          setStatus('pending-backend')
        } else {
          setErrorMessage(err?.message ?? "Lambert AI couldn't process your request right now. Please try again.")
          setStatus('error')
        }
      })
    return () => {
      mounted.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, reloadKey])

  return { status, data, errorMessage, pendingEndpoint, reload }
}
