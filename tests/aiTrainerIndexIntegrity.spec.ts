/**
 * Index-mapping integrity for the shuffled AI-trainer pool.
 *
 * The pool is shuffled at the prompt-packing point, so GPT's exerciseId indices
 * refer to the SHUFFLED order. This guards the one place that could silently
 * corrupt a workout: if a response index were resolved against a DIFFERENT array
 * than the one packed into the prompt, the user would get a real-looking workout
 * built from the WRONG exercises — no error, no log, no fallback, with another
 * exercise's weight recommendations.
 *
 * Both helpers live in the same call: buildPromptExerciseIndex returns the
 * shuffled list streamed into the prompt AND the index map, and
 * remapWorkoutIndicesToIds resolves GPT's indices with that map. The invariant we
 * assert — deterministic regardless of the random permutation — is that index i
 * always resolves to the exercise shown at position i of the streamed prompt. If
 * the map were built from the original (unshuffled) order instead, these break.
 * poolShuffle.spec.ts covers the randomness / non-sorted property separately.
 */
import { describe, it, expect } from 'vitest'
import {
  buildPromptExerciseIndex,
  remapWorkoutIndicesToIds,
} from '../functions/src/ai-trainer/poolShuffle'

const input = Array.from({ length: 20 }, (_, i) => ({ id: `id-${i}`, nameHe: `n-${i}` }) as any)

describe('AI-trainer index-mapping integrity (shuffled pool)', () => {
  it('builds the index map from the shuffled prompt order (map ⇔ prompt, both directions)', () => {
    const { promptExercises, indexToId, idToIndex } = buildPromptExerciseIndex(input)
    // Same multiset — nothing lost or duplicated by the shuffle.
    expect(promptExercises.map((e) => e.id).sort()).toEqual(input.map((e) => e.id).sort())
    // The core invariant: idx (1-based) ⇔ the exercise at that position in the
    // streamed prompt. If the map were built from the original order instead of
    // `promptExercises`, this fails for any non-identity shuffle (≈always at n=20).
    promptExercises.forEach((ex, i) => {
      expect(indexToId.get(i + 1)).toBe(ex.id)
      expect(idToIndex.get(ex.id)).toBe(i + 1)
    })
  })

  it('resolves each GPT index to the exercise shown at that position in the prompt', () => {
    const { promptExercises, indexToId } = buildPromptExerciseIndex(input)
    const picks = [1, 7, 14, 20]
    const workouts = [{ exercises: picks.map((i) => ({ exerciseId: i })) }]
    const { remapped, failed } = remapWorkoutIndicesToIds(workouts, indexToId)
    expect(remapped).toBe(picks.length)
    expect(failed).toBe(0)
    // Each saved exercise is EXACTLY the one GPT saw at that index — the integrity
    // guarantee. A resolution against any other array would surface here.
    workouts[0].exercises.forEach((e, k) => {
      expect(e.exerciseId).toBe(promptExercises[picks[k] - 1].id)
    })
  })

  it('leaves an out-of-range (hallucinated) index untouched and counts it failed', () => {
    const { indexToId } = buildPromptExerciseIndex(input)
    const workouts = [{ exercises: [{ exerciseId: 1 }, { exerciseId: 999 }] }]
    const { remapped, failed } = remapWorkoutIndicesToIds(workouts, indexToId)
    expect(remapped).toBe(1)
    expect(failed).toBe(1)
    expect(workouts[0].exercises[1].exerciseId).toBe(999) // untouched → dropped downstream
  })
})
