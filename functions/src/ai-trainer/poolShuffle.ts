/**
 * Pool ordering for the AI-trainer GPT prompt.
 *
 * Why this exists (incident 2026-08-16): the exercise pool reaches the prompt in
 * the order `getExercises()` returns it — `orderBy('name')`, i.e. alphabetical by
 * English name (src/lib/firebase/exercises.ts). An isolated gpt-4.1 experiment
 * (docs/investigations/2026-08-16-ai-trainer-repeat-dumbbell.md) proved that a
 * FIXED input order makes the model anchor on the same early items every call:
 * ~67% identical picks across 3 generations and ~100% single-equipment output.
 * Shuffling the same pool dropped overlap to 0% and diversified the equipment —
 * with no change to the prompt text. Position bias, not prompt wording.
 *
 * The fix lives ONLY here, at the point where the pool is packed into the prompt.
 * It must NOT move into getExercises (that ordering serves every exercise list the
 * user sees on screen) and it must run server-side (the client pool arrives from a
 * PWA that may be running stale bundled code).
 *
 * This module is intentionally dependency-free (no firebase-functions/admin) so
 * the index-mapping integrity can be unit-tested from the repo root.
 */

import type { ExerciseSummary } from './types'

/**
 * Fisher-Yates shuffle. Returns a NEW array — never mutates the input, so the
 * caller's pool (used elsewhere for id remapping) stays intact. Uses Math.random
 * so two consecutive calls yield independent orders; this is deliberately
 * model-agnostic (no temperature/seed on the OpenAI call), so it survives a future
 * model swap that rejects non-default sampling params.
 */
export function shufflePool<T>(items: readonly T[]): T[] {
  const out = items.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/**
 * Shuffle the pool AND build the index↔id maps from the SAME shuffled array, so
 * the prompt the model sees and the map used to resolve its answer can never
 * diverge. Returns the shuffled list to stream into the prompt plus both
 * directions of the index map. Keeping this in one function is the integrity
 * guarantee — there is no way to build the prompt from one order and resolve
 * indices against another.
 */
export function buildPromptExerciseIndex(filteredExercises: ExerciseSummary[]): {
  promptExercises: ExerciseSummary[]
  indexToId: Map<number, string>
  idToIndex: Map<string, number>
} {
  const promptExercises = shufflePool(filteredExercises)
  const indexToId = new Map<number, string>()
  const idToIndex = new Map<string, number>()
  promptExercises.forEach((ex, i) => {
    const idx = i + 1
    indexToId.set(idx, ex.id)
    idToIndex.set(ex.id, idx)
  })
  return { promptExercises, indexToId, idToIndex }
}

/**
 * Remap GPT's numeric indices back to real Firestore ids IN PLACE, using the map
 * built from the shuffled prompt order. An index GPT invents (out of range) is
 * left untouched and counted as failed → downstream validation drops it. This is
 * the ONLY place indices become ids; it must always receive the indexToId from
 * buildPromptExerciseIndex for the same call.
 */
export function remapWorkoutIndicesToIds(
  workouts: { exercises: { exerciseId: string | number }[] }[],
  indexToId: Map<number, string>
): { remapped: number; failed: number } {
  let remapped = 0
  let failed = 0
  for (const workout of workouts) {
    for (const ex of workout.exercises) {
      const idx = Number(ex.exerciseId)
      if (!isNaN(idx) && indexToId.has(idx)) {
        ex.exerciseId = indexToId.get(idx)!
        remapped++
      } else {
        // GPT returned something unexpected — leave as-is for downstream validation
        failed++
      }
    }
  }
  return { remapped, failed }
}
