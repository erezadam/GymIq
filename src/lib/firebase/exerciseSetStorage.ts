/**
 * Firebase Storage service for Exercise Set images
 * Handles upload, delete, and validation of set images
 */

import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage'
import { storage } from './config'

const STORAGE_PATH = 'exercise-sets'
const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

/**
 * Validate an image file before upload
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'פורמט לא נתמך. יש להעלות JPG, PNG או WebP',
    }
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: 'הקובץ גדול מדי. גודל מקסימלי: 2MB',
    }
  }

  return { valid: true }
}

/**
 * Upload an exercise set image to Firebase Storage
 * Returns the download URL
 */
export async function uploadExerciseSetImage(
  file: File,
  setId: string
): Promise<string> {
  const validation = validateImageFile(file)
  if (!validation.valid) {
    throw new Error(validation.error)
  }

  const ext = file.name.split('.').pop() || 'jpg'
  const fileName = `${setId}_${Date.now()}.${ext}`
  const storageRef = ref(storage, `${STORAGE_PATH}/${fileName}`)

  const snapshot = await uploadBytes(storageRef, file, {
    contentType: file.type,
  })

  const downloadUrl = await getDownloadURL(snapshot.ref)
  return downloadUrl
}

/**
 * Delete an exercise set image from Firebase Storage
 * Extracts the path from the download URL
 */
export async function deleteExerciseSetImage(imageUrl: string): Promise<void> {
  if (!imageUrl) return

  try {
    // Extract path from Firebase Storage URL
    const url = new URL(imageUrl)
    const pathMatch = url.pathname.match(/\/o\/(.+?)(\?|$)/)
    if (pathMatch) {
      const decodedPath = decodeURIComponent(pathMatch[1])
      const storageRef = ref(storage, decodedPath)
      await deleteObject(storageRef)
    }
  } catch (error) {
    // Image might already be deleted - don't throw
    console.error('Error deleting exercise set image:', error)
  }
}
