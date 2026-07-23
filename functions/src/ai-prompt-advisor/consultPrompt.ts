/**
 * Consult AI Prompt - Cloud Function (admin-only)
 *
 * Backend for the "התייעצות עם AI" panel in /admin/prompts: receives the
 * current (possibly edited) prompt and the admin's change request, and
 * returns an analysis + recommendations + a full revised prompt.
 *
 * The OpenAI key never reaches the client; authorization is the caller's
 * users/{uid}.role === 'admin' (same pattern as admin/updateUserEmail).
 */

import * as admin from 'firebase-admin'
import * as functions from 'firebase-functions'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import {
  buildAdvisorSystemPrompt,
  buildAdvisorUserPrompt,
  parseAdvisorResponse,
  findMissingPlaceholders,
  type AdvisorResult,
} from './promptAdvisor'

interface ConsultPromptRequest {
  promptTitle: string
  currentPrompt: string
  userRequest: string
}

interface ConsultPromptResponse {
  success: boolean
  error?: string
  result?: AdvisorResult
  /** Placeholders the revision dropped — client warns before applying. */
  missingPlaceholders?: string[]
}

const MAX_PROMPT_CHARS = 40_000
const MAX_REQUEST_CHARS = 4_000

let openaiClient: any = null

async function getOpenAIClient(): Promise<any> {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY not configured')
    }
    const { default: OpenAI } = await import('openai')
    openaiClient = new OpenAI({ apiKey })
  }
  return openaiClient
}

export const consultAIPrompt = onCall(
  {
    secrets: ['OPENAI_API_KEY'],
    timeoutSeconds: 120,
    memory: '256MiB',
  },
  async (callRequest): Promise<ConsultPromptResponse> => {
    if (!callRequest.auth) {
      throw new HttpsError('unauthenticated', 'יש להתחבר')
    }

    // Admin-only
    const callerDoc = await admin.firestore().doc(`users/${callRequest.auth.uid}`).get()
    if (callerDoc.data()?.role !== 'admin') {
      throw new HttpsError('permission-denied', 'פעולה זמינה לאדמין בלבד')
    }

    const { promptTitle, currentPrompt, userRequest } = (callRequest.data ?? {}) as ConsultPromptRequest
    if (
      typeof promptTitle !== 'string' || !promptTitle.trim() ||
      typeof currentPrompt !== 'string' || !currentPrompt.trim() ||
      typeof userRequest !== 'string' || !userRequest.trim()
    ) {
      throw new HttpsError('invalid-argument', 'promptTitle, currentPrompt ו-userRequest נדרשים')
    }
    if (currentPrompt.length > MAX_PROMPT_CHARS || userRequest.length > MAX_REQUEST_CHARS) {
      throw new HttpsError('invalid-argument', 'הקלט ארוך מדי')
    }

    functions.logger.info('AI prompt consultation started', {
      userId: callRequest.auth.uid,
      promptTitle,
      promptLength: currentPrompt.length,
      requestLength: userRequest.length,
    })

    try {
      const client = await getOpenAIClient()
      const completion = await client.chat.completions.create({
        model: 'gpt-4o',
        max_tokens: 8192,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: buildAdvisorSystemPrompt() },
          { role: 'user', content: buildAdvisorUserPrompt(promptTitle, currentPrompt, userRequest) },
        ],
      })

      const textContent = completion.choices[0]?.message?.content
      if (!textContent) {
        throw new Error('OpenAI returned empty response')
      }

      const result = parseAdvisorResponse(textContent)
      const missingPlaceholders = findMissingPlaceholders(currentPrompt, result.revisedPrompt)
      if (missingPlaceholders.length > 0) {
        functions.logger.warn('Advisor revision dropped placeholders', {
          promptTitle,
          missingPlaceholders,
        })
      }

      functions.logger.info('AI prompt consultation completed', {
        promptTitle,
        recommendations: result.recommendations.length,
      })

      return { success: true, result, missingPlaceholders }
    } catch (error: any) {
      functions.logger.error('AI prompt consultation failed', {
        promptTitle,
        error: error?.message,
      })
      return {
        success: false,
        error: 'הייעוץ נכשל. נסה שוב או נסח את הבקשה מחדש.',
      }
    }
  }
)
