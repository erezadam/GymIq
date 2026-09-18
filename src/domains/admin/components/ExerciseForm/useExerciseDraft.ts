/**
 * useExerciseDraft — drives the AI draft lifecycle:
 * generateExerciseDraft → onSnapshot(exerciseDrafts/{draftId}) until
 * draft_ready / failed, exposing draft/similar/image/status/error.
 * Image generation reuses the same live subscription (image_pending → image_ready).
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  generateExerciseDraft,
  generateExerciseImage,
  markDraftSaved,
  subscribeToDraft,
  type DraftExercise,
  type DraftImage,
  type DraftPhotoInput,
  type DraftStatus,
  type ExerciseDraftDoc,
  type SimilarDraftMatch,
} from '@/domains/admin/services/exerciseDraftService'
import { DRAFT_PANEL_STRINGS as S } from './constants'

function mapErrorToHebrew(err: unknown): string {
  const code = (err as { code?: string })?.code || ''
  if (code.includes('permission-denied')) return S.errorPermission
  if (code.includes('resource-exhausted')) return S.errorQuota
  if (code.includes('unavailable')) return S.errorUnavailable
  return S.errorGeneric
}

export interface UseExerciseDraftResult {
  draftId: string | null
  status: DraftStatus | null
  draft: DraftExercise | null
  similar: SimilarDraftMatch[]
  image: DraftImage | null
  error: string | null
  generating: boolean
  generateDraft: (input: { name?: string; photo?: DraftPhotoInput }) => Promise<void>
  generateImage: (regenerate?: boolean) => Promise<void>
  imageGenerating: boolean
  markSaved: (exerciseId: string) => Promise<void>
}

// Survives a form unmount/remount mid-generation (~60s) — without this the
// gate vanished and a finished image was never shown (incident 18/09).
const ACTIVE_DRAFT_KEY = 'gymiq-active-exercise-draft'

export function useExerciseDraft(): UseExerciseDraftResult {
  const [draftId, setDraftIdState] = useState<string | null>(
    () => sessionStorage.getItem(ACTIVE_DRAFT_KEY) || null
  )
  const [docState, setDocState] = useState<ExerciseDraftDoc | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [imageGenerating, setImageGenerating] = useState(false)
  const unsubRef = useRef<(() => void) | null>(null)
  const imageInFlightRef = useRef(false)

  const setDraftId = (id: string | null) => {
    if (id) sessionStorage.setItem(ACTIVE_DRAFT_KEY, id)
    else sessionStorage.removeItem(ACTIVE_DRAFT_KEY)
    setDraftIdState(id)
  }

  // Subscribe to the draft doc whenever a draftId exists.
  useEffect(() => {
    if (!draftId) return
    const unsub = subscribeToDraft(
      draftId,
      (doc) => {
        setDocState(doc)
        if (doc?.status === 'failed') {
          setError(doc.error || S.errorGeneric)
        }
      },
      () => setError(S.errorGeneric)
    )
    unsubRef.current = unsub
    return () => {
      unsub()
      unsubRef.current = null
    }
  }, [draftId])

  const generateDraft = useCallback(
    async (input: { name?: string; photo?: DraftPhotoInput }) => {
      setError(null)
      setDocState(null)
      setGenerating(true)
      try {
        const { draftId: newId } = await generateExerciseDraft(input)
        setDraftId(newId)
      } catch (err) {
        setError(mapErrorToHebrew(err))
      } finally {
        setGenerating(false)
      }
    },
    []
  )

  const generateImage = useCallback(async (regenerate = false) => {
    if (!draftId) return
    // Ref (not state) so a double-click in the same tick can't fire twice.
    if (imageInFlightRef.current) return
    imageInFlightRef.current = true
    setImageGenerating(true)
    setError(null)
    try {
      await generateExerciseImage({ draftId, ...(regenerate ? { regenerate: true } : {}) })
    } catch (err) {
      setError(mapErrorToHebrew(err))
    } finally {
      imageInFlightRef.current = false
      setImageGenerating(false)
    }
  }, [draftId])

  const markSaved = useCallback(
    async (exerciseId: string) => {
      if (!draftId) return
      try {
        await markDraftSaved({ draftId, exerciseId })
      } catch {
        // Non-blocking bookkeeping — the exercise itself was already saved.
      } finally {
        // The draft is done — stop resurrecting it after remounts.
        sessionStorage.removeItem(ACTIVE_DRAFT_KEY)
      }
    },
    [draftId]
  )

  return {
    draftId,
    status: docState?.status ?? (generating ? 'pending' : null),
    draft: docState?.draft ?? null,
    similar: docState?.similar ?? [],
    image: docState?.image ?? null,
    error,
    generating,
    generateDraft,
    generateImage,
    imageGenerating,
    markSaved,
  }
}
