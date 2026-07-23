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

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
} from 'firebase/firestore'
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

export interface AIPromptVersion {
  id: string
  action: 'save' | 'reset'
  systemPrompt?: string
  model?: string
  maxTokens?: number
  savedAt: Date | null
  savedByEmail?: string
}

const VERSIONS_SUBCOLLECTION = 'versions'
const VERSIONS_HISTORY_LIMIT = 30

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
 * Save (create or update) a prompt override, and append the saved state to
 * the versions subcollection (audit + restore).
 * Payloads are sanitized with removeUndefined() per the Firestore iron rule.
 */
export const saveAIPromptConfig = async (
  id: AIPromptId,
  config: Pick<AIPromptConfig, 'systemPrompt' | 'model' | 'maxTokens'>,
  updatedByEmail?: string
): Promise<void> => {
  const savedAt = new Date()

  await setDoc(
    doc(db, AI_PROMPTS_COLLECTION, id),
    {
      ...removeUndefined({ ...config, updatedByEmail }),
      updatedAt: savedAt,
    },
    { merge: true }
  )

  // History write is best-effort: a failure must not fail the save itself
  // (the override is already live), but it must not be silent either.
  try {
    await addDoc(collection(db, AI_PROMPTS_COLLECTION, id, VERSIONS_SUBCOLLECTION), {
      ...removeUndefined({ ...config, savedByEmail: updatedByEmail }),
      action: 'save',
      savedAt,
    })
  } catch (error) {
    console.error('Failed to record prompt version history:', error)
  }
}

/**
 * Delete a prompt override — the feature returns to its built-in default.
 * The reset itself is recorded in the version history (audit); the history
 * subcollection survives the parent doc deletion.
 */
export const resetAIPromptConfig = async (id: AIPromptId, updatedByEmail?: string): Promise<void> => {
  await deleteDoc(doc(db, AI_PROMPTS_COLLECTION, id))

  try {
    await addDoc(collection(db, AI_PROMPTS_COLLECTION, id, VERSIONS_SUBCOLLECTION), {
      ...removeUndefined({ savedByEmail: updatedByEmail }),
      action: 'reset',
      savedAt: new Date(),
    })
  } catch (error) {
    console.error('Failed to record prompt reset in history:', error)
  }
}

/**
 * Read the version history of a prompt, newest first.
 */
export const getAIPromptVersions = async (id: AIPromptId): Promise<AIPromptVersion[]> => {
  const snap = await getDocs(
    query(
      collection(db, AI_PROMPTS_COLLECTION, id, VERSIONS_SUBCOLLECTION),
      orderBy('savedAt', 'desc'),
      limit(VERSIONS_HISTORY_LIMIT)
    )
  )

  return snap.docs.map((d) => {
    const data = d.data()
    const savedAtRaw = data.savedAt as unknown
    const savedAt =
      savedAtRaw instanceof Date
        ? savedAtRaw
        : savedAtRaw && typeof (savedAtRaw as { toDate?: () => Date }).toDate === 'function'
          ? (savedAtRaw as { toDate: () => Date }).toDate()
          : null

    return {
      id: d.id,
      action: data.action === 'reset' ? 'reset' : 'save',
      systemPrompt: data.systemPrompt,
      model: data.model,
      maxTokens: data.maxTokens,
      savedAt,
      savedByEmail: data.savedByEmail,
    }
  })
}
