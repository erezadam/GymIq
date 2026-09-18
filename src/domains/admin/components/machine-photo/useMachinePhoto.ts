/**
 * useMachinePhoto — admin machine-photo identification flow.
 *
 * Recycled from the former ExerciseLibrary MachineLens hook:
 * compress (≤1024px) → upload to machine-photos/<tempId>.jpg (uploadBytes)
 * → identifyMachine with base64 (existing callable, zero server change).
 * Exposes the identification result + the storage path of the uploaded photo.
 */

import { useCallback, useState } from 'react'
import { ref, uploadBytes } from 'firebase/storage'
import { storage } from '@/lib/firebase/config'
import { compressImage } from '@/lib/firebase/traineePhotoStorage'
import {
  identifyMachine,
  type MachineLensResponse,
} from '@/domains/exercises/services/machineLensService'
import {
  DRAFT_PANEL_STRINGS,
  MACHINE_PHOTO_MAX_DIM,
  MACHINE_PHOTO_STORAGE_PATH,
} from '../ExerciseForm/constants'

/** Convert a Blob to a raw base64 string (without the `data:*;base64,` prefix). */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      const commaIndex = dataUrl.indexOf(',')
      resolve(commaIndex >= 0 ? dataUrl.slice(commaIndex + 1) : dataUrl)
    }
    reader.onerror = () => reject(new Error('Failed to read image'))
    reader.readAsDataURL(blob)
  })
}

let uploadCounter = 0

export interface MachinePhotoState {
  loading: boolean
  error: string | null
  result: MachineLensResponse | null
  storagePath: string | null
}

export interface UseMachinePhotoResult extends MachinePhotoState {
  identify: (file: File) => Promise<void>
  reset: () => void
}

export function useMachinePhoto(): UseMachinePhotoResult {
  const [state, setState] = useState<MachinePhotoState>({
    loading: false,
    error: null,
    result: null,
    storagePath: null,
  })

  const identify = useCallback(async (file: File) => {
    setState({ loading: true, error: null, result: null, storagePath: null })
    try {
      const compressed = await compressImage(file, MACHINE_PHOTO_MAX_DIM)

      // Upload the compressed photo so the draft function can reference it.
      const tempId = `${Date.now()}_${uploadCounter++}`
      const storagePath = `${MACHINE_PHOTO_STORAGE_PATH}/${tempId}.jpg`
      await uploadBytes(ref(storage, storagePath), compressed, {
        contentType: 'image/jpeg',
      })

      const imageBase64 = await blobToBase64(compressed)
      const result = await identifyMachine({ imageBase64, mimeType: 'image/jpeg' })
      setState({ loading: false, error: null, result, storagePath })
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code
      setState({
        loading: false,
        error:
          code === 'functions/resource-exhausted'
            ? DRAFT_PANEL_STRINGS.errorQuota
            : DRAFT_PANEL_STRINGS.photoError,
        result: null,
        storagePath: null,
      })
    }
  }, [])

  const reset = useCallback(() => {
    setState({ loading: false, error: null, result: null, storagePath: null })
  }, [])

  return { ...state, identify, reset }
}
