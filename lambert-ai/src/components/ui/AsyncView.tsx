import type { AsyncStatus } from '@/hooks/useAsync'
import { SkeletonList } from './Skeleton'
import { EmptyState, ErrorState, BackendPendingState } from './StateViews'

interface AsyncViewProps<T> {
  status: AsyncStatus
  data: T | null
  errorMessage?: string | null
  pendingEndpoint?: string | null
  emptyTitle?: string
  emptyDescription?: string
  onRetry?: () => void
  children: (data: T) => React.ReactNode
}

export function AsyncView<T>({
  status,
  data,
  errorMessage,
  pendingEndpoint,
  emptyTitle = 'Nothing here yet',
  emptyDescription,
  onRetry,
  children,
}: AsyncViewProps<T>) {
  if (status === 'loading') return <SkeletonList />
  if (status === 'pending-backend') return <BackendPendingState endpoint={pendingEndpoint ?? 'this endpoint'} />
  if (status === 'error') return <ErrorState description={errorMessage ?? undefined} onRetry={onRetry} />
  if (status === 'empty') return <EmptyState title={emptyTitle} description={emptyDescription} />
  if (status === 'success' && data !== null) return <>{children(data)}</>
  return null
}
