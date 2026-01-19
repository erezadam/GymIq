import { useEffect } from 'react'
import { useAuthStore } from '@/domains/authentication/store'
import { LoadingSpinner } from '@/shared/components/LoadingSpinner'

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { initialize, isInitialized } = useAuthStore()

  useEffect(() => {
    console.log('[PERF] AuthProvider: Starting initialization...')
    const startTime = Date.now()

    // Initialize Firebase auth listener
    const unsubscribe = initialize()

    // Log when initialized
    const checkInit = setInterval(() => {
      const state = useAuthStore.getState()
      if (state.isInitialized) {
        console.log('[PERF] AuthProvider: Initialized in', Date.now() - startTime, 'ms')
        clearInterval(checkInit)
      }
    }, 100)

    // Cleanup on unmount
    return () => {
      unsubscribe()
      clearInterval(checkInit)
    }
  }, [initialize])

  // Show loading while initializing auth
  if (!isInitialized) {
    return <LoadingSpinner fullScreen />
  }

  return <>{children}</>
}
