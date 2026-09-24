import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import type { UserRole } from '@/types'
import { UnauthorizedState } from '@/components/ui/StateViews'
import { BACKEND_READY } from '@/services/apiClient'

export function RequireAuth({ children, roles }: { children: React.ReactNode; roles?: UserRole[] }) {
  const { isAuthenticated, isInitializing, user } = useAuth()
  const location = useLocation()

  // During local frontend development (no backend yet) we don't hard-block
  // navigation, so every route stays reviewable — but we say so clearly.
  if (!BACKEND_READY) {
    return (
      <div>
        <div className="border-b border-gold-500/30 bg-gold-100 px-4 py-2 text-center text-xs text-gold-600">
          Preview mode — the real Lambert AI backend isn't connected, so authentication isn't enforced here.
        </div>
        {children}
      </div>
    )
  }

  if (isInitializing) return null

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (roles && user && !roles.includes(user.role)) {
    return <UnauthorizedState />
  }

  return <>{children}</>
}
