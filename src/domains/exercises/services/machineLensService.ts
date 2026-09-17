/**
 * Machine Lens service — identify a gym machine from a photo.
 * Calls the `identifyMachine` Cloud Function (same httpsCallable pattern
 * as aiTrainerService.callCloudFunction).
 */

import { getFunctions, httpsCallable } from 'firebase/functions'
import { app } from '@/lib/firebase/config'

export interface MachineLensRequest {
  imageBase64: string
  mimeType: string
}

export interface MachineLensMatch {
  id: string
  name: string
  nameHe: string
  imageUrl: string
  score: number
  reasons: string[]
}

export interface MachineLensResponse {
  labelText: string
  machineType: string
  equipmentId: string
  confidence: number
  matches: MachineLensMatch[]
}

const functions = getFunctions(app)

export async function identifyMachine(
  request: MachineLensRequest
): Promise<MachineLensResponse> {
  const callable = httpsCallable<MachineLensRequest, MachineLensResponse>(
    functions,
    'identifyMachine'
  )
  const result = await callable(request)
  return result.data
}
