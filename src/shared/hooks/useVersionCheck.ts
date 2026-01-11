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

  // Safe update mechanism - doesn't crash on iOS PWA
  const performUpdate = useCallback(async () => {
    console.log('[Version] Performing update...')

    try {
      // 1. Check if there's an active workout - warn user
      const activeWorkout = localStorage.getItem('gymiq_active_workout')
      if (activeWorkout) {
        const confirmed = window.confirm(
          'יש לך אימון פעיל. העדכון עלול לאבד שינויים שלא נשמרו.\n\nלהמתין 3 שניות לשמירה ולהמשיך?'
        )
        if (!confirmed) {
          console.log('[Version] Update cancelled by user (active workout)')
          return
        }
        // Wait for auto-save to complete (debounce is 2 seconds, add buffer)
        console.log('[Version] Waiting for auto-save...')
        await new Promise(resolve => setTimeout(resolve, 3000))
      }

      // 2. Update stored version FIRST
      if (newVersion) {
        localStorage.setItem(VERSION_KEY, newVersion)
      }

      // 3. Clear only PWA caches (NOT firebase caches)
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

      // 4. Ask SW to update (DON'T unregister - causes crash on iOS PWA!)
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration()
        if (registration) {
          // If there's a waiting worker, activate it
          if (registration.waiting) {
            console.log('[Version] Activating waiting SW')
            registration.waiting.postMessage('skipWaiting')
          }
          // Request update check
          try {
            await registration.update()
            console.log('[Version] SW update requested')
          } catch (e) {
            console.log('[Version] SW update request failed (normal on iOS)')
          }
        }
      }

      // 5. Short wait then reload
      await new Promise(resolve => setTimeout(resolve, 300))

      // 6. Force reload from server
      console.log('[Version] Reloading...')
      window.location.reload()
    } catch (error) {
      console.error('[Version] Error during update:', error)
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
