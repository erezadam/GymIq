/**
 * AI Prompt Library — Firestore access (aiPrompts collection).
 *
 * Each doc overrides the system prompt / model / maxTokens of one AI feature.
 * Consumers of the overrides:
 *   - functions/src/ai-trainer/openaiClient.ts      (aiPrompts/workout_generation)
 *   - functions/src/ai-analysis/generateAnalysis.ts (aiPrompts/training_analysis)
 *   - functions/src/ai-program/generateProgram.ts   (aiPrompts/program_builder)
 *   - scripts/draftReleaseNoteFromPR.ts             (aiPrompts/release_note_drafter)
 * A missing doc means "use the built-in default that lives in that file".
 */

import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore'
import { db } from './config'
import { removeUndefined } from './firestoreUtils'

export const AI_PROMPTS_COLLECTION = 'aiPrompts'

export type AIPromptId =
  | 'workout_generation'
  | 'training_analysis'
  | 'program_builder'
  | 'release_note_drafter'

export interface AIPromptConfig {
  systemPrompt?: string
  model?: string
  maxTokens?: number
  updatedAt?: Date
  updatedByEmail?: string
}

/**
 * Read one prompt override. Returns null when no override exists (built-in
 * default is in effect). Throws on read failure so the admin screen can show
 * a real error instead of silently displaying defaults.
 */
export const getAIPromptConfig = async (id: AIPromptId): Promise<AIPromptConfig | null> => {
  const snap = await getDoc(doc(db, AI_PROMPTS_COLLECTION, id))
  if (!snap.exists()) return null
  return snap.data() as AIPromptConfig
}

/**
 * Save (create or update) a prompt override.
 * Payload is sanitized with removeUndefined() per the Firestore iron rule.
 */
export const saveAIPromptConfig = async (
  id: AIPromptId,
  config: Pick<AIPromptConfig, 'systemPrompt' | 'model' | 'maxTokens'>,
  updatedByEmail?: string
): Promise<void> => {
  await setDoc(
    doc(db, AI_PROMPTS_COLLECTION, id),
    {
      ...removeUndefined({ ...config, updatedByEmail }),
      updatedAt: new Date(),
    },
    { merge: true }
  )
}

/**
 * Delete a prompt override — the feature returns to its built-in default.
 */
export const resetAIPromptConfig = async (id: AIPromptId): Promise<void> => {
  await deleteDoc(doc(db, AI_PROMPTS_COLLECTION, id))
}
