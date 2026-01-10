/**
 * App Settings Firebase Functions
 * Manages application-wide settings stored in Firebase
 */

import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from './config'

const SETTINGS_COLLECTION = 'settings'
const APP_SETTINGS_DOC = 'app'

export interface AppSettings {
  externalComparisonUrl?: string
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
