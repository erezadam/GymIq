/**
 * finishAction.spec.ts — Behavior tests for determineFinishAction.
 *
 * The function decides what should happen when the user presses
 * "Finish" on a workout. Three branches:
 *   - 0/N      → 'exit-as-in-progress' (silent save, no modal)
 *   - 1+/<N    → 'show-warning' with incompleteCount
 *   - N/N      → 'show-summary'
 *
 * These tests are the authoritative regression coverage for the
 * decision. Any change to the logic must keep them green at runtime.
 */

import { describe, it, expect } from 'vitest'
import { determineFinishAction } from '@/domains/workouts/utils/workoutStatus'

describe('determineFinishAction', () => {
  describe('0/N — no exercises performed', () => {
    it('returns "exit-as-in-progress" for an unstarted workout (0/7)', () => {
      expect(
        determineFinishAction({ completedExercises: 0, totalExercises: 7 })
      ).toEqual({ type: 'exit-as-in-progress' })
    })

    it('returns "exit-as-in-progress" for a 0/0 zero-exercise workout (edge)', () => {
      // The completedExercises === 0 branch fires first, so 0/0 lands
      // here rather than show-summary. This is intentional: an empty
      // workout the user closes without doing anything is a save-and-leave,
      // not a "completed" workout.
      expect(
        determineFinishAction({ completedExercises: 0, totalExercises: 0 })
      ).toEqual({ type: 'exit-as-in-progress' })
    })
  })

  describe('1+/N — partial completion', () => {
    it('returns "show-warning" with incompleteCount=6 for 1/7', () => {
      expect(
        determineFinishAction({ completedExercises: 1, totalExercises: 7 })
      ).toEqual({ type: 'show-warning', incompleteCount: 6 })
    })

    it('returns "show-warning" with incompleteCount=2 for 5/7', () => {
      expect(
        determineFinishAction({ completedExercises: 5, totalExercises: 7 })
      ).toEqual({ type: 'show-warning', incompleteCount: 2 })
    })

    it('returns "show-warning" with incompleteCount=1 for 6/7', () => {
      expect(
        determineFinishAction({ completedExercises: 6, totalExercises: 7 })
      ).toEqual({ type: 'show-warning', incompleteCount: 1 })
    })
  })

  describe('N/N — all performed', () => {
    it('returns "show-summary" for 7/7', () => {
      expect(
        determineFinishAction({ completedExercises: 7, totalExercises: 7 })
      ).toEqual({ type: 'show-summary' })
    })

    it('returns "show-summary" for a single-exercise workout (1/1)', () => {
      expect(
        determineFinishAction({ completedExercises: 1, totalExercises: 1 })
      ).toEqual({ type: 'show-summary' })
    })
  })
})
