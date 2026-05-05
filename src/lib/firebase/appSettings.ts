/**
 * App Settings Firebase Functions
 * Manages application-wide settings stored in Firebase
 */

import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from './config'

export const SETTINGS_COLLECTION = 'settings'
export const APP_SETTINGS_DOC = 'app'

export interface AppSettings {
  externalComparisonUrl?: string
  // Global kill switch for diagnosticLogs writes. Default when absent = true
  // (fail-open) so a fresh deploy keeps observability until an admin actively
  // disables. Read by src/lib/firebase/diagnosticLogs.ts via direct getDoc
  // (not getAppSettings) so a transient Firestore read failure can preserve
  // the prior cached value instead of being misread as "field absent → true".
  diagnosticLogsEnabled?: boolean
  updatedAt?: Date
}

/**
 * Get app settings from Firebase
 */
export const getAppSettings = async (): Promise<AppSettings> => {
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, APP_SETTINGS_DOC)
    const docSnap = await getDoc(docRef)

    if (!docSnap.exists()) {
      return {}
    }

    return docSnap.data() as AppSettings
  } catch (error) {
    console.error('Failed to get app settings:', error)
    return {}
  }
}

/**
 * Update app settings in Firebase
 */
export const updateAppSettings = async (settings: Partial<AppSettings>): Promise<void> => {
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, APP_SETTINGS_DOC)
    await setDoc(docRef, {
      ...settings,
      updatedAt: new Date(),
    }, { merge: true })
  } catch (error) {
    console.error('Failed to update app settings:', error)
    throw error
  }
}

/**
 * Get external comparison URL
 */
export const getExternalComparisonUrl = async (): Promise<string | null> => {
  const settings = await getAppSettings()
  return settings.externalComparisonUrl || null
}

/**
 * Set external comparison URL
 */
export const setExternalComparisonUrl = async (url: string): Promise<void> => {
  await updateAppSettings({ externalComparisonUrl: url })
}
