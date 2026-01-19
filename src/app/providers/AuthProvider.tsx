import { useEffect } from 'react'
import { useAuthStore } from '@/domains/authentication/store'
import { LoadingSpinner } from '@/shared/components/LoadingSpinner'

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { initialize, isInitialized } = useAuthStore()

  useEffect(() => {
    // Initialize Firebase auth listener
    const unsubscribe = initialize()

    // Cleanup on unmount
    return () => {
      unsubscribe()
    }
  }, [initialize])

  // Show loading while initializing auth
  if (!isInitialized) {
    return <LoadingSpinner fullScreen />
  }

  return <>{children}</>
}
