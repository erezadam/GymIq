/**
 * recentlyDoneExercises.spec.ts — Behavior tests for getRecentlyDoneExerciseIds.
 *
 * The function powers the "recently done" badge / recommendation suppression
 * in ExerciseLibrary. The bug: the `completed` branch added every exercise
 * from the last completed workout to the result Set — including ones the
 * user planned but never performed. That caused the next workout's library
 * to incorrectly mark those skipped exercises as "recently done" and hide
 * them from the recommendation list.
 *
 * The fix: the `completed` branch must require `ex.isCompleted` (matching
 * the `in_progress` branch's existing guard).
 *
 * These tests verify behavior — they fail at runtime if the gate regresses.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---- Mock Firestore SDK before importing the service that uses it. ----
const getDocsMock = vi.fn()

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => ({})),
  query: vi.fn(() => ({})),
  where: vi.fn(() => ({})),
  orderBy: vi.fn(() => ({})),
  limit: vi.fn(() => ({})),
  // Anything else getRecentlyDoneExerciseIds doesn't call directly is unused.
  getDocs: getDocsMock,
  doc: vi.fn(() => ({})),
  getDoc: vi.fn(),
  updateDoc: vi.fn(),
  setDoc: vi.fn(),
  addDoc: vi.fn(),
  deleteDoc: vi.fn(),
  serverTimestamp: vi.fn(() => 'serverTimestamp'),
  Timestamp: { fromDate: (d: Date) => ({ toDate: () => d }) },
  startAfter: vi.fn(() => ({})),
  writeBatch: vi.fn(() => ({ set: vi.fn(), update: vi.fn(), commit: vi.fn() })),
  arrayUnion: vi.fn((v: unknown) => v),
  arrayRemove: vi.fn((v: unknown) => v),
  deleteField: vi.fn(() => '__deleted__'),
}))

// Build a fake Firestore snapshot from an array of plain doc data objects.
function snapshot(docsData: Array<Record<string, unknown>>) {
  return {
    docs: docsData.map((data, i) => ({
      id: `doc-${i}`,
      data: () => data,
    })),
  }
}

// Convenience: build a workout doc with the fields getRecentlyDoneExerciseIds
// actually reads.
function workoutDoc(args: {
  status: 'completed' | 'in_progress' | 'partial' | 'cancelled' | 'planned'
  exercises: Array<{ exerciseId: string; isCompleted: boolean }>
  deletedByTrainee?: unknown
}): Record<string, unknown> {
  return {
    status: args.status,
    exercises: args.exercises,
    ...(args.deletedByTrainee !== undefined && {
      deletedByTrainee: args.deletedByTrainee,
    }),
  }
}

describe('getRecentlyDoneExerciseIds', () => {
  beforeEach(() => {
    getDocsMock.mockReset()
  })

  it('completed workout: only exercises with isCompleted=true are included', async () => {
    // The fix under test. Pre-fix, ALL three exerciseIds would be added.
    getDocsMock.mockResolvedValueOnce(
      snapshot([
        workoutDoc({
          status: 'completed',
          exercises: [
            { exerciseId: 'ex-bench', isCompleted: true },
            { exerciseId: 'ex-squat', isCompleted: false }, // planned, not performed
            { exerciseId: 'ex-row', isCompleted: true },
          ],
        }),
      ])
    )

    const { getRecentlyDoneExerciseIds } = await import(
      '../src/lib/firebase/workoutHistory'
    )
    const result = await getRecentlyDoneExerciseIds('user-1')

    expect(result.has('ex-bench')).toBe(true)
    expect(result.has('ex-row')).toBe(true)
    // Critical assertion: a planned-but-not-performed exercise must NOT
    // suppress recommendations in the next workout.
    expect(result.has('ex-squat')).toBe(false)
    expect(result.size).toBe(2)
  })

  it('completed workout with all exercises performed: every id is included', async () => {
    getDocsMock.mockResolvedValueOnce(
      snapshot([
        workoutDoc({
          status: 'completed',
          exercises: [
            { exerciseId: 'ex-a', isCompleted: true },
            { exerciseId: 'ex-b', isCompleted: true },
          ],
        }),
      ])
    )

    const { getRecentlyDoneExerciseIds } = await import(
      '../src/lib/firebase/workoutHistory'
    )
    const result = await getRecentlyDoneExerciseIds('user-1')

    expect(result.size).toBe(2)
    expect(result.has('ex-a')).toBe(true)
    expect(result.has('ex-b')).toBe(true)
  })

  it('in_progress workout: only isCompleted exercises are included (existing behavior preserved)', async () => {
    getDocsMock.mockResolvedValueOnce(
      snapshot([
        workoutDoc({
          status: 'in_progress',
          exercises: [
            { exerciseId: 'ex-bench', isCompleted: true },
            { exerciseId: 'ex-deadlift', isCompleted: false },
          ],
        }),
      ])
    )

    const { getRecentlyDoneExerciseIds } = await import(
      '../src/lib/firebase/workoutHistory'
    )
    const result = await getRecentlyDoneExerciseIds('user-1')

    expect(result.has('ex-bench')).toBe(true)
    expect(result.has('ex-deadlift')).toBe(false)
    expect(result.size).toBe(1)
  })

  it('soft-deleted workout is skipped entirely', async () => {
    getDocsMock.mockResolvedValueOnce(
      snapshot([
        workoutDoc({
          status: 'completed',
          exercises: [{ exerciseId: 'ex-ghost', isCompleted: true }],
          deletedByTrainee: { deletedAt: new Date(), reason: 'test' },
        }),
      ])
    )

    const { getRecentlyDoneExerciseIds } = await import(
      '../src/lib/firebase/workoutHistory'
    )
    const result = await getRecentlyDoneExerciseIds('user-1')

    expect(result.size).toBe(0)
  })

  it('only the FIRST completed workout (date desc) contributes; older ones are ignored', async () => {
    // The function stops after the first completed workout (foundCompleted=true).
    // Older completed workouts must not seed the result Set.
    getDocsMock.mockResolvedValueOnce(
      snapshot([
        workoutDoc({
          status: 'completed',
          exercises: [{ exerciseId: 'ex-newest', isCompleted: true }],
        }),
        workoutDoc({
          status: 'completed',
          exercises: [{ exerciseId: 'ex-older', isCompleted: true }],
        }),
      ])
    )

    const { getRecentlyDoneExerciseIds } = await import(
      '../src/lib/firebase/workoutHistory'
    )
    const result = await getRecentlyDoneExerciseIds('user-1')

    expect(result.has('ex-newest')).toBe(true)
    expect(result.has('ex-older')).toBe(false)
    expect(result.size).toBe(1)
  })
})
