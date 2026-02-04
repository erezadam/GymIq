import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/domains/authentication/store'

interface AuthGuardProps {
  children: React.ReactNode
  requiredRole?: 'user' | 'trainer' | 'admin'
}

export function AuthGuard({ children, requiredRole }: AuthGuardProps) {
  const { isAuthenticated, user } = useAuthStore()
  const location = useLocation()

  // Not authenticated - redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Check role if required (role hierarchy: user < trainer < admin)
  if (requiredRole) {
    const roleHierarchy: Record<string, number> = { user: 0, trainer: 1, admin: 2 }
    const userLevel = roleHierarchy[user?.role || 'user'] || 0
    const requiredLevel = roleHierarchy[requiredRole] || 0
    if (userLevel < requiredLevel) {
      return <Navigate to="/dashboard" replace />
    }
  }

  return <>{children}</>
}

export function GuestGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore()
  const location = useLocation()

  // If authenticated, redirect to appropriate dashboard
  if (isAuthenticated) {
    const from = (location.state as { from?: Location })?.from?.pathname

    if (from) {
      return <Navigate to={from} replace />
    }

    if (user?.role === 'admin') {
      return <Navigate to="/admin" replace />
    }

    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}
