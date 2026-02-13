import { useEffect, useRef } from 'react'
import { useAuthStore } from '@/domains/authentication/store'
import { LoadingSpinner } from '@/shared/components/LoadingSpinner'
import { cleanupWorkoutStorage } from '@/utils/workoutValidation'

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { initialize, isInitialized } = useAuthStore()
  const hasRunCleanup = useRef(false)
  const user = useAuthStore((s) => s.user)

  useEffect(() => {
    // Initialize Firebase auth listener
    const unsubscribe = initialize()

    // Cleanup on unmount
    return () => {
      unsubscribe()
    }
  }, [initialize])

  // Run workout storage cleanup once when user is authenticated
  useEffect(() => {
    if (user?.uid && !hasRunCleanup.current) {
      hasRunCleanup.current = true
      cleanupWorkoutStorage(user.uid).then((result) => {
        if (result.cleaned > 0) {
          console.warn('[AuthProvider] Cleaned stale workout IDs:', result.details)
        }
      }).catch((err) => {
        console.error('[AuthProvider] Cleanup failed:', err)
      })
    }
  }, [user?.uid])

  // Show loading while initializing auth
  if (!isInitialized) {
    return <LoadingSpinner fullScreen />
  }

  return <>{children}</>
}
