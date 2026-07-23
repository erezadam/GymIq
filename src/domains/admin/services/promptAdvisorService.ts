/**
 * Client wrapper for the consultAIPrompt Cloud Function (admin-only).
 * Used by the "התייעצות עם AI" panel in the prompt library editor.
 */

import { getFunctions, httpsCallable } from 'firebase/functions'
import { app } from '@/lib/firebase/config'

const functions = getFunctions(app)

export interface PromptAdvisorResult {
  analysis: string
  recommendations: string[]
  revisedPrompt: string
}

export interface ConsultPromptResponse {
  success: boolean
  error?: string
  result?: PromptAdvisorResult
  missingPlaceholders?: string[]
}

export async function consultAIPrompt(params: {
  promptTitle: string
  currentPrompt: string
  userRequest: string
}): Promise<ConsultPromptResponse> {
  try {
    const callable = httpsCallable<typeof params, ConsultPromptResponse>(functions, 'consultAIPrompt')
    const { data } = await callable(params)
    return data
  } catch (error) {
    console.error('consultAIPrompt failed:', error)
    return { success: false, error: 'הייעוץ נכשל. בדוק חיבור ונסה שוב.' }
  }
}
