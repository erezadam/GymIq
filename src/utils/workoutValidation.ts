/**
 * Workout Validation & Cleanup
 *
 * Validates Firebase workout IDs stored in localStorage to prevent
 * permission-denied errors from stale/orphaned documents.
 *
 * Root cause: When the Service Worker serves stale code, auto-save can create
 * Firestore documents with incorrect userId. After recovery, localStorage still
 * holds the stale ID, causing permission-denied on updateDoc.
 *
 * This module provides:
 * - validateWorkoutId: checks if a stored workout ID is valid before use
 * - cleanupWorkoutStorage: scans and cleans all stale workout IDs on app init
 */

import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { ACTIVE_WORKOUT_STORAGE_KEY } from '@/domains/workouts/types/active-workout.types'

const COLLECTION_NAME = 'workoutHistory'
const FIREBASE_ID_KEY = 'gymiq_firebase_workout_id'

export interface ValidationResult {
  valid: boolean
  reason?: 'not_found' | 'wrong_user' | 'wrong_status' | 'fetch_error' | 'network_error'
  documentUserId?: string
  documentStatus?: string
}

/**
 * Validates a workout ID stored in localStorage.
 * Checks: document exists, userId matches, status is in_progress.
 * Returns { valid: true } or { valid: false, reason } with details.
 */
export async function validateWorkoutId(
  workoutId: string,
  currentUserId: string
): Promise<ValidationResult> {
  try {
    const docRef = doc(db, COLLECTION_NAME, workoutId)
    const snapshot = await getDoc(docRef)

    if (!snapshot.exists()) {
      console.warn(`[WorkoutValidation] Document ${workoutId} not found in Firestore`)
      return { valid: false, reason: 'not_found' }
    }

    const data = snapshot.data()
    const documentUserId = data?.userId as string | undefined
    const documentStatus = data?.status as string | undefined

    if (documentUserId !== currentUserId) {
      console.warn(
        `[WorkoutValidation] userId mismatch for ${workoutId}: ` +
        `document=${documentUserId}, current=${currentUserId}`
      )
      return { valid: false, reason: 'wrong_user', documentUserId, documentStatus }
    }

    if (documentStatus !== 'in_progress') {
      console.warn(
        `[WorkoutValidation] Status not in_progress for ${workoutId}: status=${documentStatus}`
      )
      return { valid: false, reason: 'wrong_status', documentUserId, documentStatus }
    }

    return { valid: true }
  } catch (error: any) {
    const code = error?.code || ''

    // permission-denied → definitely stale/wrong user, safe to delete
    if (code === 'permission-denied') {
      console.warn(`[WorkoutValidation] Permission denied for ${workoutId} — marking invalid`)
      return { valid: false, reason: 'fetch_error' }
    }

    // Network/offline errors → we can't tell if the ID is valid or not.
    // Optimistic: keep the ID so offline users don't lose their workout.
    if (code === 'unavailable' || code === 'failed-precondition') {
      console.warn(`[WorkoutValidation] Network error for ${workoutId}, keeping ID (optimistic)`)
      return { valid: true, reason: 'network_error' }
    }

    // Unknown error → defensive, mark invalid
    console.warn(`[WorkoutValidation] Unknown error for ${workoutId}:`, code || error?.message)
    return { valid: false, reason: 'fetch_error' }
  }
}

/**
 * Scans localStorage for all workout-related keys and validates each one.
 * Removes stale/invalid IDs and their associated data.
 * Should be called once on app init when user is authenticated.
 */
export async function cleanupWorkoutStorage(currentUserId: string): Promise<{
  scanned: number
  cleaned: number
  details: { key: string; reason: string }[]
}> {
  const details: { key: string; reason: string }[] = []
  let scanned = 0
  let cleaned = 0

  // Collect all firebase workout ID keys from localStorage
  const keysToCheck: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith(FIREBASE_ID_KEY)) {
      keysToCheck.push(key)
    }
  }

  for (const key of keysToCheck) {
    const workoutId = localStorage.getItem(key)
    if (!workoutId) continue

    scanned++
    const result = await validateWorkoutId(workoutId, currentUserId)

    if (!result.valid) {
      console.warn(
        `[WorkoutCleanup] Removing stale workout ID: key=${key}, id=${workoutId}, reason=${result.reason}`
      )
      localStorage.removeItem(key)

      // Also remove associated localStorage data
      // The workout storage key follows a pattern based on the firebase ID key
      const associatedStorageKey = key === FIREBASE_ID_KEY
        ? ACTIVE_WORKOUT_STORAGE_KEY
        : key.replace(FIREBASE_ID_KEY, 'gymiq_active_workout_v2')
      if (localStorage.getItem(associatedStorageKey)) {
        localStorage.removeItem(associatedStorageKey)
        console.warn(`[WorkoutCleanup] Also removed associated storage: ${associatedStorageKey}`)
      }

      cleaned++
      details.push({ key, reason: result.reason || 'unknown' })
    }
  }

  if (cleaned > 0) {
    console.warn(`[WorkoutCleanup] Cleaned ${cleaned}/${scanned} stale workout IDs`)
  } else if (scanned > 0) {
    console.log(`[WorkoutCleanup] All ${scanned} workout IDs valid`)
  }

  return { scanned, cleaned, details }
}
