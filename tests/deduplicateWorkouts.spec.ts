/**
 * deduplicateWorkouts.spec.ts — Behavior tests for the workout history
 * dedup helper.
 *
 * Background: the previous criterion (name + totalExercises within 5 min)
 * silently dropped a fresh in_progress workout from the history list when
 * an older completed workout shared the same name. The new criterion is
 * strict: same programId, same programDayLabel, same calendar day.
 *
 * These tests lock in the corrected behavior so the regression cannot
 * return unnoticed.
 */

import { describe, it, expect } from 'vitest'
import { deduplicateWorkouts } from '@/domains/workouts/utils/deduplicateWorkouts'
import type { WorkoutHistorySummary } from '@/domains/workouts/types'

const baseSummary: Omit<WorkoutHistorySummary, 'id' | 'date' | 'status'> = {
  name: 'אימון א',
  duration: 30,
  completedExercises: 0,
  totalExercises: 5,
  totalVolume: 0,
  personalRecords: 0,
}

const make = (overrides: Partial<WorkoutHistorySummary>): WorkoutHistorySummary => ({
  ...baseSummary,
  id: overrides.id ?? 'unset',
  date: overrides.date ?? new Date('2026-05-03T10:00:00'),
  status: overrides.status ?? 'in_progress',
  ...overrides,
})

describe('deduplicateWorkouts', () => {
  describe('original bug scenario — same programId+day, different status', () => {
    it('keeps the completed workout and removes the in_progress duplicate (regardless of input order)', () => {
      // Repro of the production bug: a completed workout from earlier in
      // the day and a fresh in_progress workout (the user just pressed
      // "save in progress") collide on programId + programDayLabel + day.
      // The completed one wins by status priority.
      const completed = make({
        id: 'completed-id',
        date: new Date('2026-05-03T08:00:00'),
        status: 'completed',
        programId: 'prog-1',
        programDayLabel: 'יום A',
      })
      const inProgress = make({
        id: 'in-progress-id',
        date: new Date('2026-05-03T14:00:00'),
        status: 'in_progress',
        programId: 'prog-1',
        programDayLabel: 'יום A',
      })

      // Newer-first order (matches Firestore desc query)
      const result1 = deduplicateWorkouts([inProgress, completed])
      expect(result1.filtered.map(w => w.id)).toEqual(['completed-id'])
      expect(result1.duplicates).toEqual([
        { keptId: 'completed-id', duplicateId: 'in-progress-id', keptStatus: 'completed' },
      ])

      // Older-first order — must produce the same survivor
      const result2 = deduplicateWorkouts([completed, inProgress])
      expect(result2.filtered.map(w => w.id)).toEqual(['completed-id'])
    })
  })

  describe('ad-hoc workouts — no programId', () => {
    it('never deduplicates two ad-hoc workouts even when name and day match', () => {
      // The user intentionally created two separate ad-hoc sessions on
      // the same day. Without a programId we cannot prove they are the
      // same conceptual workout, so both must survive.
      const adhocA = make({
        id: 'adhoc-a',
        date: new Date('2026-05-03T08:00:00'),
        status: 'completed',
        name: 'אימון רגליים',
      })
      const adhocB = make({
        id: 'adhoc-b',
        date: new Date('2026-05-03T18:00:00'),
        status: 'in_progress',
        name: 'אימון רגליים',
      })

      const result = deduplicateWorkouts([adhocB, adhocA])
      expect(result.filtered.map(w => w.id).sort()).toEqual(['adhoc-a', 'adhoc-b'])
      expect(result.duplicates).toEqual([])
    })
  })

  describe('different programId — no collision', () => {
    it('keeps both workouts when programId differs, even on the same calendar day', () => {
      const programA = make({
        id: 'a',
        date: new Date('2026-05-03T10:00:00'),
        status: 'completed',
        programId: 'prog-A',
        programDayLabel: 'יום A',
      })
      const programB = make({
        id: 'b',
        date: new Date('2026-05-03T11:00:00'),
        status: 'in_progress',
        programId: 'prog-B',
        programDayLabel: 'יום A',
      })

      const result = deduplicateWorkouts([programA, programB])
      expect(result.filtered.map(w => w.id).sort()).toEqual(['a', 'b'])
      expect(result.duplicates).toEqual([])
    })
  })

  describe('status tie — newer wins by date.getTime()', () => {
    it('keeps the workout with the later date when statuses are equal, regardless of input order', () => {
      const older = make({
        id: 'older-in-progress',
        date: new Date('2026-05-03T08:00:00'),
        status: 'in_progress',
        programId: 'prog-1',
        programDayLabel: 'יום A',
      })
      const newer = make({
        id: 'newer-in-progress',
        date: new Date('2026-05-03T14:00:00'),
        status: 'in_progress',
        programId: 'prog-1',
        programDayLabel: 'יום A',
      })

      // Newer-first order
      const result1 = deduplicateWorkouts([newer, older])
      expect(result1.filtered.map(w => w.id)).toEqual(['newer-in-progress'])

      // Older-first order — must produce the same survivor (the fix)
      const result2 = deduplicateWorkouts([older, newer])
      expect(result2.filtered.map(w => w.id)).toEqual(['newer-in-progress'])
    })

    it('treats partial as equal to in_progress for tie-break purposes', () => {
      // partial and in_progress share priority 3. Tie-break falls to date.
      const partial = make({
        id: 'partial-id',
        date: new Date('2026-05-03T14:00:00'),
        status: 'partial',
        programId: 'prog-1',
        programDayLabel: 'יום A',
      })
      const inProgress = make({
        id: 'in-progress-id',
        date: new Date('2026-05-03T08:00:00'),
        status: 'in_progress',
        programId: 'prog-1',
        programDayLabel: 'יום A',
      })

      const result = deduplicateWorkouts([inProgress, partial])
      expect(result.filtered.map(w => w.id)).toEqual(['partial-id'])
    })
  })

  describe('different calendar days — no collision', () => {
    it('keeps both workouts when they fall on different days', () => {
      const day1 = make({
        id: 'day-1',
        date: new Date('2026-05-02T23:30:00'),
        status: 'completed',
        programId: 'prog-1',
        programDayLabel: 'יום A',
      })
      const day2 = make({
        id: 'day-2',
        date: new Date('2026-05-03T00:30:00'),
        status: 'in_progress',
        programId: 'prog-1',
        programDayLabel: 'יום A',
      })

      const result = deduplicateWorkouts([day2, day1])
      expect(result.filtered).toHaveLength(2)
      expect(result.duplicates).toEqual([])
    })
  })

  describe('different programDayLabel — no collision', () => {
    it('keeps both workouts when programDayLabel differs (e.g., יום A vs יום B)', () => {
      const dayA = make({
        id: 'workout-day-a',
        date: new Date('2026-05-03T10:00:00'),
        status: 'completed',
        programId: 'prog-1',
        programDayLabel: 'יום A',
      })
      const dayB = make({
        id: 'workout-day-b',
        date: new Date('2026-05-03T18:00:00'),
        status: 'in_progress',
        programId: 'prog-1',
        programDayLabel: 'יום B',
      })

      const result = deduplicateWorkouts([dayA, dayB])
      expect(result.filtered).toHaveLength(2)
      expect(result.duplicates).toEqual([])
    })
  })

  describe('empty / single-item input', () => {
    it('returns an empty result for an empty array', () => {
      const result = deduplicateWorkouts([])
      expect(result.filtered).toEqual([])
      expect(result.duplicates).toEqual([])
    })

    it('returns the single workout unchanged', () => {
      const only = make({
        id: 'only',
        date: new Date('2026-05-03T10:00:00'),
        status: 'completed',
        programId: 'prog-1',
        programDayLabel: 'יום A',
      })
      const result = deduplicateWorkouts([only])
      expect(result.filtered.map(w => w.id)).toEqual(['only'])
      expect(result.duplicates).toEqual([])
    })
  })
})
