/**
 * Exercise Draft service — admin AI-assisted exercise creation.
 *
 * Wraps the three exercise-draft Cloud Functions (same httpsCallable pattern
 * as aiTrainerService / machineLensService) and exposes a Firestore
 * onSnapshot subscription on exerciseDrafts/{draftId}.
 */

import { getFunctions, httpsCallable } from 'firebase/functions'
import { doc, onSnapshot, type Unsubscribe } from 'firebase/firestore'
import { app, db } from '@/lib/firebase/config'

// ---------- Contract types (exerciseDrafts/{draftId}) ----------

export type DraftStatus =
  | 'pending'
  | 'draft_ready'
  | 'image_pending'
  | 'image_ready'
  | 'failed'
  | 'saved'

export interface DraftPhotoInput {
  storagePath: string
  labelText: string
  machineType: string
  equipmentId: string
  confidence: number
}

/** Draft field set — scripts/exercise-add contract: plain string arrays, no imageUrl/videoWebpUrl. */
export interface DraftExercise {
  name: string
  nameHe: string
  category: string
  primaryMuscle: string
  secondaryMuscles: string[]
  secondaryMuscleCredits: string[]
  equipment: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  complexity: 'compound' | 'simple'
  reportType: string
  assistanceTypes: ('graviton' | 'bands')[]
  availableBands: string[]
  instructions: string[]
  instructionsHe: string[]
  tips: string[]
  tipsHe: string[]
  targetMuscles: string[]
}

export interface SimilarDraftMatch {
  id: string
  name: string
  nameHe: string
  score: number
  reasons: string[]
}

export interface DraftImage {
  url: string
  endUrl: string
  startUrl: string
  bytes: number
  costUsd: number
}

export interface ExerciseDraftDoc {
  status: DraftStatus
  input?: { name?: string; photo?: DraftPhotoInput }
  draft?: DraftExercise
  poseSpec?: Record<string, string>
  similar?: SimilarDraftMatch[]
  image?: DraftImage
  error?: string
}

// ---------- Callables ----------

const functions = getFunctions(app)

export async function generateExerciseDraft(request: {
  name?: string
  photo?: DraftPhotoInput
}): Promise<{ draftId: string }> {
  const callable = httpsCallable<typeof request, { draftId: string }>(
    functions,
    'generateExerciseDraft'
  )
  const result = await callable(request)
  return result.data
}

export async function generateExerciseImage(request: {
  draftId: string
}): Promise<{ ok: boolean }> {
  const callable = httpsCallable<typeof request, { ok: boolean }>(
    functions,
    'generateExerciseImage'
  )
  const result = await callable(request)
  return result.data
}

export async function markDraftSaved(request: {
  draftId: string
  exerciseId: string
}): Promise<{ ok: boolean }> {
  const callable = httpsCallable<typeof request, { ok: boolean }>(
    functions,
    'markDraftSaved'
  )
  const result = await callable(request)
  return result.data
}

// ---------- Live subscription ----------

export function subscribeToDraft(
  draftId: string,
  onUpdate: (draft: ExerciseDraftDoc | null) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const draftRef = doc(db, 'exerciseDrafts', draftId)
  return onSnapshot(
    draftRef,
    (snap) => onUpdate(snap.exists() ? (snap.data() as ExerciseDraftDoc) : null),
    (err) => onError?.(err)
  )
}
