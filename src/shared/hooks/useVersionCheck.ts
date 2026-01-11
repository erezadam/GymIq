/**
 * useVersionCheck - Hook for checking app version updates
 * Fetches version.json from server and compares with stored version
 */

import { useState, useEffect, useCallback } from 'react'

const VERSION_KEY = 'gymiq_app_version'
const CHECK_INTERVAL = 5 * 60 * 1000 // Check every 5 minutes

interface VersionInfo {
  version: string
  buildTime: string
}

interface UseVersionCheckReturn {
  updateAvailable: boolean
  currentVersion: string | null
  newVersion: string | null
  performUpdate: () => Promise<void>
  dismissUpdate: () => void
}

export function useVersionCheck(): UseVersionCheckReturn {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [currentVersion, setCurrentVersion] = useState<string | null>(null)
  const [newVersion, setNewVersion] = useState<string | null>(null)

  const checkVersion = useCallback(async () => {
    try {
      // Fetch version.json with cache busting
      const timestamp = Date.now()
      const response = await fetch(`/version.json?t=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      })

      if (!response.ok) {
        console.log('[Version] Failed to fetch version.json')
        return
      }

      const serverVersion: VersionInfo = await response.json()
      const storedVersion = localStorage.getItem(VERSION_KEY)

      console.log('[Version] Server:', serverVersion.version, 'Stored:', storedVersion)

      setCurrentVersion(storedVersion)
      setNewVersion(serverVersion.version)

      // First time - just store the version
      if (!storedVersion) {
        localStorage.setItem(VERSION_KEY, serverVersion.version)
        setCurrentVersion(serverVersion.version)
        return
      }

      // Compare versions
      if (serverVersion.version !== storedVersion) {
        console.log('[Version] Update available!')
        setUpdateAvailable(true)
      }
    } catch (error) {
      console.error('[Version] Error checking version:', error)
    }
  }, [])

  // Clear PWA caches (NOT Firebase data) and reload
  const performUpdate = useCallback(async () => {
    console.log('[Version] Performing update...')

    try {
      // 1. Clear only PWA/workbox caches (NOT firebase caches)
      if ('caches' in window) {
        const cacheNames = await caches.keys()
        await Promise.all(
          cacheNames
            .filter(name => {
              // Only delete PWA-related caches, skip firebase
              const isFirebase = name.toLowerCase().includes('firebase')
              if (isFirebase) {
                console.log('[Version] Keeping Firebase cache:', name)
                return false
              }
              return true
            })
            .map(name => {
              console.log('[Version] Deleting cache:', name)
              return caches.delete(name)
            })
        )
      }

      // 2. Unregister service worker (this is safe - doesn't affect Firebase)
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations()
        for (const registration of registrations) {
          console.log('[Version] Unregistering SW')
          await registration.unregister()
        }
      }

      // 3. Update stored version
      if (newVersion) {
        localStorage.setItem(VERSION_KEY, newVersion)
      }

      // 4. Wait 500ms for cleanup to complete
      await new Promise(resolve => setTimeout(resolve, 500))

      // 5. Force reload from server
      window.location.reload()
    } catch (error) {
      console.error('[Version] Error during update:', error)
      // Show error to user instead of breaking the app
      alert('שגיאה בעדכון. נסה לרענן את הדף ידנית.')
    }
  }, [newVersion])

  const dismissUpdate = useCallback(() => {
    setUpdateAvailable(false)
  }, [])

  // Check on mount and periodically
  useEffect(() => {
    // Initial check after a short delay
    const initialTimeout = setTimeout(checkVersion, 2000)

    // Periodic checks
    const interval = setInterval(checkVersion, CHECK_INTERVAL)

    // Also check when app becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkVersion()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearTimeout(initialTimeout)
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [checkVersion])

  return {
    updateAvailable,
    currentVersion,
    newVersion,
    performUpdate,
    dismissUpdate
  }
}
