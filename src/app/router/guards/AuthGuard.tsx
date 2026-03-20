import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/domains/authentication/store'

interface AuthGuardProps {
  children: React.ReactNode
  requiredRole?: 'user' | 'trainer' | 'admin'
}

export function AuthGuard({ children, requiredRole }: AuthGuardProps) {
  const { isAuthenticated, user, impersonatedUser } = useAuthStore()
  const location = useLocation()

  // Not authenticated - redirect to login (always check real user)
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Check role if required
  if (requiredRole) {
    const roleHierarchy: Record<string, number> = { user: 0, trainer: 1, admin: 2 }

    // Admin routes always check real user (don't lock admin out while impersonating)
    const isAdminRoute = requiredRole === 'admin'
    const checkUser = isAdminRoute ? user : (impersonatedUser ?? user)

    const userLevel = roleHierarchy[checkUser?.role || 'user'] || 0
    const requiredLevel = roleHierarchy[requiredRole] || 0

    // If impersonating and accessing a route the impersonated user can't access,
    // but real user is admin — allow it (admin can see everything)
    if (userLevel < requiredLevel) {
      if (impersonatedUser && user?.role === 'admin') {
        // Admin is impersonating — allow access
      } else {
        return <Navigate to="/dashboard" replace />
      }
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
