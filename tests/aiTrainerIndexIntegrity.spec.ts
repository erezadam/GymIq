/**
 * Index-mapping integrity for the shuffled AI-trainer pool.
 *
 * The pool is shuffled at the prompt-packing point, so GPT's exerciseId indices
 * refer to the SHUFFLED order. This guards the one place that could silently
 * corrupt a workout: if the response's numeric index were ever resolved against a
 * DIFFERENT array than the one packed into the prompt, the user would get a
 * real-looking workout built from the WRONG exercises — no error, no log, no
 * fallback, with another exercise's weight recommendations.
 *
 * `shufflePool` is mocked to a REVERSED (known, non-identity) permutation so the
 * mapping is deterministic AND differs from input order: if index resolution used
 * the original order instead of the shuffled one, the asserted ids flip and these
 * tests fail. `poolShuffle.spec.ts` covers the randomness/non-sorted property;
 * this file covers correctness of the index→id resolution and that the prompt
 * order and the remap map come from the same shuffled array.
 */
import { describe, it, expect, vi } from 'vitest'

// Deterministic, non-identity permutation so a mis-resolved index is caught.
vi.mock('../functions/src/ai-trainer/poolShuffle', () => ({
  shufflePool: (items: readonly unknown[]) => [...items].reverse(),
}))

import {
  buildPromptExerciseIndex,
  remapWorkoutIndicesToIds,
} from '../functions/src/ai-trainer/openaiClient'

const ex = (id: string) =>
  ({ id, nameHe: `name-${id}`, primaryMuscle: 'chest', category: 'chest', equipment: 'dumbbell', imageUrl: '' }) as any

// Sorted input A,B,C → reversed shuffle → prompt order C,B,A → idx 1=C, 2=B, 3=A.
const filteredExercises = [ex('A'), ex('B'), ex('C')]

describe('AI-trainer index-mapping integrity (shuffled pool)', () => {
  it('builds the index map from the shuffled prompt order, not the input order', () => {
    const { promptExercises, indexToId } = buildPromptExerciseIndex(filteredExercises)
    // The prompt is streamed in shuffled order…
    expect(promptExercises.map((e) => e.id)).toEqual(['C', 'B', 'A'])
    // …and idx→id follows that same order.
    expect(indexToId.get(1)).toBe('C')
    expect(indexToId.get(2)).toBe('B')
    expect(indexToId.get(3)).toBe('A')
  })

  it('resolves GPT indices against the SAME shuffled array the prompt was built from', () => {
    const { indexToId } = buildPromptExerciseIndex(filteredExercises)
    // GPT "chose" idx 1 and 3. Against the reversed order that is C then A.
    const workouts = [
      { exercises: [{ exerciseId: 1 }, { exerciseId: 3 }] },
    ]
    const { remapped, failed } = remapWorkoutIndicesToIds(workouts, indexToId)
    expect(remapped).toBe(2)
    expect(failed).toBe(0)
    // If indices were resolved against the original [A,B,C] this would be ['A','C'].
    expect(workouts[0].exercises.map((e) => e.exerciseId)).toEqual(['C', 'A'])
  })

  it('leaves an out-of-range (hallucinated) index untouched and counts it as failed', () => {
    const { indexToId } = buildPromptExerciseIndex(filteredExercises)
    const workouts = [{ exercises: [{ exerciseId: 1 }, { exerciseId: 99 }] }]
    const { remapped, failed } = remapWorkoutIndicesToIds(workouts, indexToId)
    expect(remapped).toBe(1)
    expect(failed).toBe(1)
    expect(workouts[0].exercises[0].exerciseId).toBe('C') // idx 1 → C
    expect(workouts[0].exercises[1].exerciseId).toBe(99) // untouched → dropped downstream
  })
})
