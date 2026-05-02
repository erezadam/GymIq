/**
 * workoutStatus.spec.ts — Behavior tests for determineWorkoutStatus.
 *
 * The function decides the final `status` saved to a workout document when
 * the user finishes a workout. Three values are possible: 'completed',
 * 'partial', or 'cancelled'. The function is the single source of truth
 * for the rule, so these unit tests are the authoritative regression
 * coverage. They must fail at runtime if any branch regresses.
 */

import { describe, it, expect } from 'vitest'
import { determineWorkoutStatus } from '@/domains/workouts/utils/workoutStatus'

describe('determineWorkoutStatus', () => {
  describe('all exercises completed (happy path)', () => {
    it('returns "completed" without explicit confirmation', () => {
      expect(
        determineWorkoutStatus({ completedExercises: 7, totalExercises: 7 }, false)
      ).toBe('completed')
    })

    it('returns "completed" with explicit confirmation (flag is irrelevant when all done)', () => {
      expect(
        determineWorkoutStatus({ completedExercises: 7, totalExercises: 7 }, true)
      ).toBe('completed')
    })

    it('returns "completed" for a single-exercise workout', () => {
      expect(
        determineWorkoutStatus({ completedExercises: 1, totalExercises: 1 }, false)
      ).toBe('completed')
    })
  })

  describe('zero exercises completed (edge case — flag must be ignored)', () => {
    it('returns "cancelled" without explicit confirmation', () => {
      expect(
        determineWorkoutStatus({ completedExercises: 0, totalExercises: 7 }, false)
      ).toBe('cancelled')
    })

    it('returns "cancelled" EVEN WITH explicit confirmation', () => {
      // It would be misleading to mark a totally-unperformed workout as
      // 'completed' even if the user pressed "כן, סיים בכל זאת". The user
      // reported nothing — there is nothing to mark as completed.
      expect(
        determineWorkoutStatus({ completedExercises: 0, totalExercises: 7 }, true)
      ).toBe('cancelled')
    })
  })

  describe('partial completion (the new behavior)', () => {
    it('returns "partial" without explicit confirmation (legacy autosave/exit path)', () => {
      expect(
        determineWorkoutStatus({ completedExercises: 5, totalExercises: 7 }, false)
      ).toBe('partial')
    })

    it('returns "completed" with explicit confirmation (the user-pressed-warning path)', () => {
      expect(
        determineWorkoutStatus({ completedExercises: 5, totalExercises: 7 }, true)
      ).toBe('completed')
    })

    it('returns "completed" for a 1/7 partial when explicitly confirmed', () => {
      // Even one performed exercise + explicit confirm should count as 'completed'.
      expect(
        determineWorkoutStatus({ completedExercises: 1, totalExercises: 7 }, true)
      ).toBe('completed')
    })

    it('returns "partial" for the same 1/7 without confirmation', () => {
      expect(
        determineWorkoutStatus({ completedExercises: 1, totalExercises: 7 }, false)
      ).toBe('partial')
    })
  })

  describe('zero-exercise workout (totalExercises === 0)', () => {
    it('returns "cancelled" — falls through the zero-completed branch', () => {
      // A workout with no exercises planned is empty; it is cancelled, not
      // completed. The flag has no effect because the zero-completed branch
      // fires first.
      expect(
        determineWorkoutStatus({ completedExercises: 0, totalExercises: 0 }, false)
      ).toBe('cancelled')
      expect(
        determineWorkoutStatus({ completedExercises: 0, totalExercises: 0 }, true)
      ).toBe('cancelled')
    })
  })
})
