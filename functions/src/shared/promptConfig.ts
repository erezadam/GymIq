/**
 * Firestore-backed prompt overrides for the admin prompt library.
 *
 * Admins edit prompts/models at /admin/prompts (client writes to the
 * aiPrompts collection). Each AI function asks for its override before
 * calling the model; a missing doc or a read failure falls back to the
 * built-in defaults — generation must never break because of the library.
 */

import * as admin from 'firebase-admin'
import * as functions from 'firebase-functions'
import { parsePromptOverride, sanitizeOverrideModel, type PromptOverride } from './promptOverrides'

export const AI_PROMPTS_COLLECTION = 'aiPrompts'

export type { PromptOverride }

/**
 * Read the admin override for a prompt id.
 * Fail-soft: returns null (→ built-in defaults) on missing doc or read error,
 * and logs whenever an override is actually applied — no silent behavior
 * changes (CLAUDE.md: No silent AI filtering).
 */
export async function getPromptOverride(promptId: string): Promise<PromptOverride | null> {
  try {
    const snap = await admin.firestore().collection(AI_PROMPTS_COLLECTION).doc(promptId).get()
    if (!snap.exists) return null

    const parsed = parsePromptOverride(snap.data())
    if (!parsed) return null

    // Unknown model (e.g. legacy free-text value) → drop it, keep the rest,
    // and log — the call site falls back to the built-in default model.
    const override = sanitizeOverrideModel(promptId, parsed, functions.logger)
    if (Object.keys(override).length === 0) return null

    functions.logger.info('AI prompt override applied from aiPrompts collection', {
      promptId,
      hasSystemPrompt: !!override.systemPrompt,
      model: override.model ?? '(default)',
      maxTokens: override.maxTokens ?? '(default)',
    })
    return override
  } catch (error: any) {
    functions.logger.warn('Failed to read aiPrompts override — using built-in defaults', {
      promptId,
      error: error?.message,
    })
    return null
  }
}
