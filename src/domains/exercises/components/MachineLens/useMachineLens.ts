import { useCallback, useState } from 'react'
import { compressImage } from '@/lib/firebase/traineePhotoStorage'
import {
  identifyMachine,
  type MachineLensResponse,
} from '@/domains/exercises/services/machineLensService'
import { MACHINE_LENS_STRINGS } from './constants'

const COMPRESS_MAX_DIM = 1024

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

export interface UseMachineLensResult {
  loading: boolean
  error: string | null
  result: MachineLensResponse | null
  identify: (file: File) => Promise<void>
  reset: () => void
}

export function useMachineLens(): UseMachineLensResult {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<MachineLensResponse | null>(null)

  const identify = useCallback(async (file: File) => {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const compressed = await compressImage(file, COMPRESS_MAX_DIM)
      const imageBase64 = await blobToBase64(compressed)
      const response = await identifyMachine({
        imageBase64,
        mimeType: 'image/jpeg',
      })
      setResult(response)
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code
      setError(
        code === 'functions/resource-exhausted'
          ? MACHINE_LENS_STRINGS.errorQuota
          : MACHINE_LENS_STRINGS.errorGeneric
      )
    } finally {
      setLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    setLoading(false)
    setError(null)
    setResult(null)
  }, [])

  return { loading, error, result, identify, reset }
}
