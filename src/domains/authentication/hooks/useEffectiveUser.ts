import { useAuthStore } from '@/domains/authentication/store'
import type { AppUser } from '@/lib/firebase/auth'

/**
 * Returns the impersonated user if active, otherwise the real user.
 * Use this in components that display user-specific data.
 */
export function useEffectiveUser(): AppUser | null {
  const { user, impersonatedUser } = useAuthStore()
  return impersonatedUser ?? user
}

/**
 * Returns true when admin is viewing as another user.
 */
export function useIsImpersonating(): boolean {
  return useAuthStore((s) => s.impersonatedUser !== null)
}

/**
 * Always returns the real authenticated user (never impersonated).
 * Use this for auth checks, logout, and admin-only operations.
 */
export function useRealUser(): AppUser | null {
  return useAuthStore((s) => s.user)
}
