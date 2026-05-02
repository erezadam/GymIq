/**
 * setFiltering.spec.ts — Behavior tests for partitionPerformedSets.
 *
 * The function powers three display surfaces (WorkoutCard expanded view,
 * TraineeRecentWorkouts set list, TraineeRecentWorkouts header counter).
 * If the filter rule changes, every consumer breaks together. These tests
 * verify the rule itself — they fail at runtime if the rule regresses.
 */

import { describe, it, expect } from 'vitest'
import {
  partitionPerformedSets,
  type HistorySet,
} from '@/domains/workouts/utils/setFiltering'

// Build a stored history set with sane defaults so each test only spells
// out the fields it cares about.
function makeSet(overrides: Partial<HistorySet> = {}): HistorySet {
  return {
    type: 'working',
    targetReps: 0,
    targetWeight: 0,
    actualReps: 0,
    actualWeight: 0,
    completed: false,
    ...overrides,
  } as HistorySet
}

describe('partitionPerformedSets', () => {
  describe('empty / nullish input', () => {
    it('returns zero-everything for an empty array', () => {
      expect(partitionPerformedSets([])).toEqual({
        performed: [],
        skippedCount: 0,
        total: 0,
      })
    })

    it('returns zero-everything for undefined', () => {
      expect(partitionPerformedSets(undefined)).toEqual({
        performed: [],
        skippedCount: 0,
        total: 0,
      })
    })

    it('returns zero-everything for null', () => {
      expect(partitionPerformedSets(null)).toEqual({
        performed: [],
        skippedCount: 0,
        total: 0,
      })
    })
  })

  describe('strength-style sets (weight + reps)', () => {
    it('keeps a set with actualReps > 0 even if completed is false', () => {
      const sets = [makeSet({ actualReps: 10, actualWeight: 50, completed: false })]
      const result = partitionPerformedSets(sets)
      expect(result.performed).toHaveLength(1)
      expect(result.skippedCount).toBe(0)
      expect(result.total).toBe(1)
    })

    it('drops a set with actualReps = 0 and completed = false', () => {
      const sets = [makeSet({ actualReps: 0, completed: false })]
      const result = partitionPerformedSets(sets)
      expect(result.performed).toHaveLength(0)
      expect(result.skippedCount).toBe(1)
      expect(result.total).toBe(1)
    })

    it('partitions a mix of performed and skipped strength sets', () => {
      const sets = [
        makeSet({ actualReps: 10, actualWeight: 50, completed: true }),
        makeSet({ actualReps: 8, actualWeight: 55, completed: true }),
        makeSet({ actualReps: 0, actualWeight: 0, completed: false }),
        makeSet({ actualReps: 0, actualWeight: 0, completed: false }),
      ]
      const result = partitionPerformedSets(sets)
      expect(result.performed).toHaveLength(2)
      expect(result.skippedCount).toBe(2)
      expect(result.total).toBe(4)
      // performed array preserves order
      expect(result.performed[0].actualReps).toBe(10)
      expect(result.performed[1].actualReps).toBe(8)
    })
  })

  describe('cardio / time-based sets (the 125-set production case)', () => {
    // Verified via production audit (689 docs, 5,360 sets): 125 sets exist
    // with `completed: true, actualReps: 0` plus measurable values like
    // time/zone/speed. They MUST stay in `performed` so cardio history shows.

    it('keeps a treadmill-style set: completed=true, time>0, reps=0', () => {
      const cardioSet = makeSet({
        completed: true,
        actualReps: 0,
        time: 1080,
        speed: 8,
        incline: 2,
      })
      const result = partitionPerformedSets([cardioSet])
      expect(result.performed).toEqual([cardioSet])
      expect(result.skippedCount).toBe(0)
    })

    it('keeps a hanging-style set: completed=true, time>0 only', () => {
      const hangSet = makeSet({ completed: true, actualReps: 0, time: 2400 })
      const result = partitionPerformedSets([hangSet])
      expect(result.performed).toEqual([hangSet])
      expect(result.skippedCount).toBe(0)
    })

    it('keeps a zone-based cardio set', () => {
      const zoneSet = makeSet({ completed: true, actualReps: 0, zone: 3 })
      expect(partitionPerformedSets([zoneSet]).performed).toEqual([zoneSet])
    })
  })

  describe('edge cases', () => {
    it('treats actualReps === null as not performed (when completed is false)', () => {
      // Defensive: legacy data could in principle carry null even though the
      // current writer normalizes to 0. The filter must not throw on null.
      const sets = [makeSet({ actualReps: null as unknown as number, completed: false })]
      const result = partitionPerformedSets(sets)
      expect(result.performed).toHaveLength(0)
      expect(result.skippedCount).toBe(1)
    })

    it('treats actualReps === undefined as not performed (when completed is false)', () => {
      const sets = [makeSet({ actualReps: undefined as unknown as number, completed: false })]
      const result = partitionPerformedSets(sets)
      expect(result.performed).toHaveLength(0)
      expect(result.skippedCount).toBe(1)
    })

    it('keeps a set with completed=true even if actualReps is null/undefined', () => {
      const setNull = makeSet({ actualReps: null as unknown as number, completed: true })
      const setUndef = makeSet({ actualReps: undefined as unknown as number, completed: true })
      const result = partitionPerformedSets([setNull, setUndef])
      expect(result.performed).toHaveLength(2)
      expect(result.skippedCount).toBe(0)
    })

    it('all skipped → performed is empty and skippedCount equals total', () => {
      const sets = [makeSet(), makeSet(), makeSet()]
      const result = partitionPerformedSets(sets)
      expect(result.performed).toHaveLength(0)
      expect(result.skippedCount).toBe(3)
      expect(result.total).toBe(3)
    })

    it('all performed → skippedCount is 0 and performed equals total', () => {
      const sets = [
        makeSet({ completed: true, actualReps: 5 }),
        makeSet({ completed: true, actualReps: 5 }),
      ]
      const result = partitionPerformedSets(sets)
      expect(result.performed).toHaveLength(2)
      expect(result.skippedCount).toBe(0)
      expect(result.total).toBe(2)
    })

    it('invariant: total === performed.length + skippedCount', () => {
      const sets = [
        makeSet({ completed: true, actualReps: 5 }),
        makeSet({ completed: false, actualReps: 0 }),
        makeSet({ completed: true, actualReps: 0, time: 60 }),
        makeSet({ completed: false, actualReps: 8 }),
      ]
      const result = partitionPerformedSets(sets)
      expect(result.total).toBe(result.performed.length + result.skippedCount)
      expect(result.total).toBe(4)
    })
  })
})
