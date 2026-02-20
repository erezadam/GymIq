/**
 * Firebase Storage service for Trainee profile photos
 * Handles upload, delete, compression, and validation
 */

import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage'
import { storage } from './config'

const STORAGE_PATH = 'trainee-photos'
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB before compression
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const TARGET_SIZE = 400 // px - target dimension for compressed photo
const JPEG_QUALITY = 0.8

/**
 * Validate an image file before upload
 */
function validateImageFile(file: File): { valid: boolean; error?: string } {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'פורמט לא נתמך. יש להעלות JPG, PNG או WebP',
    }
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: 'הקובץ גדול מדי. גודל מקסימלי: 5MB',
    }
  }

  return { valid: true }
}

/**
 * Compress and resize an image file using HTML5 Canvas
 * Mobile photos can be 5-10MB, this shrinks them to ~200KB
 */
function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)

      // Calculate new dimensions (fit within TARGET_SIZE square)
      let width = img.width
      let height = img.height
      const maxDim = Math.max(width, height)

      if (maxDim > TARGET_SIZE) {
        const scale = TARGET_SIZE / maxDim
        width = Math.round(width * scale)
        height = Math.round(height * scale)
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Failed to get canvas context'))
        return
      }

      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('Failed to compress image'))
          }
        },
        'image/jpeg',
        JPEG_QUALITY
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }

    img.src = url
  })
}

/**
 * Upload a trainee profile photo to Firebase Storage
 * Compresses the image before upload
 * Returns the download URL
 */
export async function uploadTraineePhoto(
  file: File,
  traineeId: string
): Promise<string> {
  const validation = validateImageFile(file)
  if (!validation.valid) {
    throw new Error(validation.error)
  }

  // Compress the image
  const compressedBlob = await compressImage(file)

  const fileName = `${traineeId}_${Date.now()}.jpg`
  const storageRef = ref(storage, `${STORAGE_PATH}/${fileName}`)

  const snapshot = await uploadBytes(storageRef, compressedBlob, {
    contentType: 'image/jpeg',
  })

  return await getDownloadURL(snapshot.ref)
}

/**
 * Delete a trainee profile photo from Firebase Storage
 */
export async function deleteTraineePhoto(photoURL: string): Promise<void> {
  if (!photoURL) return

  try {
    const url = new URL(photoURL)
    const pathMatch = url.pathname.match(/\/o\/(.+?)(\?|$)/)
    if (pathMatch) {
      const decodedPath = decodeURIComponent(pathMatch[1])
      const storageRef = ref(storage, decodedPath)
      await deleteObject(storageRef)
    }
  } catch (error) {
    console.error('Error deleting trainee photo:', error)
  }
}
