/**
 * distinctPerformedExercises.spec.ts — Behavior tests for
 * getDistinctPerformedExerciseIds.
 *
 * This function backs the AI Trainer entry gate: it returns the set of
 * DISTINCT exerciseIds a trainee has actually performed (ex.isCompleted)
 * across their ENTIRE history (no limit), skipping soft-deleted workouts.
 *
 * Unlike its sibling getRecentlyDoneExerciseIds, it has no limit(10) cap and
 * no status filtering — the "performed" predicate is purely ex.isCompleted.
 *
 * These tests verify behavior — they fail at runtime if the derivation
 * regresses. They also document the gate's edge cases (failure → throws so the
 * caller can treat it as below-threshold).
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

describe('getDistinctPerformedExerciseIds', () => {
  beforeEach(() => {
    getDocsMock.mockReset()
  })

  it('counts DISTINCT performed exerciseIds across the ENTIRE history (dedups repeats)', async () => {
    // ex-bench appears in two workouts → counted once. 5 distinct total.
    getDocsMock.mockResolvedValueOnce(
      snapshot([
        workoutDoc({
          status: 'completed',
          exercises: [
            { exerciseId: 'ex-bench', isCompleted: true },
            { exerciseId: 'ex-row', isCompleted: true },
          ],
        }),
        workoutDoc({
          status: 'completed',
          exercises: [
            { exerciseId: 'ex-bench', isCompleted: true }, // repeat
            { exerciseId: 'ex-squat', isCompleted: true },
            { exerciseId: 'ex-curl', isCompleted: true },
          ],
        }),
        workoutDoc({
          status: 'in_progress',
          exercises: [{ exerciseId: 'ex-press', isCompleted: true }],
        }),
      ])
    )

    const { getDistinctPerformedExerciseIds } = await import(
      '../src/lib/firebase/workoutHistory'
    )
    const result = await getDistinctPerformedExerciseIds('user-1')

    expect(result.size).toBe(5)
    expect([...result].sort()).toEqual(
      ['ex-bench', 'ex-curl', 'ex-press', 'ex-row', 'ex-squat']
    )
  })

  it('only exercises with isCompleted=true are counted (planned items excluded)', async () => {
    getDocsMock.mockResolvedValueOnce(
      snapshot([
        workoutDoc({
          status: 'completed',
          exercises: [
            { exerciseId: 'ex-done', isCompleted: true },
            { exerciseId: 'ex-skipped', isCompleted: false },
          ],
        }),
      ])
    )

    const { getDistinctPerformedExerciseIds } = await import(
      '../src/lib/firebase/workoutHistory'
    )
    const result = await getDistinctPerformedExerciseIds('user-1')

    expect(result.has('ex-done')).toBe(true)
    expect(result.has('ex-skipped')).toBe(false)
    expect(result.size).toBe(1)
  })

  it('soft-deleted workouts are skipped entirely', async () => {
    getDocsMock.mockResolvedValueOnce(
      snapshot([
        workoutDoc({
          status: 'completed',
          exercises: [{ exerciseId: 'ex-ghost', isCompleted: true }],
          deletedByTrainee: { deletedAt: new Date(), reason: 'test' },
        }),
        workoutDoc({
          status: 'completed',
          exercises: [{ exerciseId: 'ex-real', isCompleted: true }],
        }),
      ])
    )

    const { getDistinctPerformedExerciseIds } = await import(
      '../src/lib/firebase/workoutHistory'
    )
    const result = await getDistinctPerformedExerciseIds('user-1')

    expect(result.has('ex-ghost')).toBe(false)
    expect(result.has('ex-real')).toBe(true)
    expect(result.size).toBe(1)
  })

  it('GATE: a trainee below the threshold yields a count < 10', async () => {
    // 4 distinct performed exercises → gate should block (4 < 10).
    getDocsMock.mockResolvedValueOnce(
      snapshot([
        workoutDoc({
          status: 'completed',
          exercises: [
            { exerciseId: 'ex-1', isCompleted: true },
            { exerciseId: 'ex-2', isCompleted: true },
            { exerciseId: 'ex-3', isCompleted: true },
            { exerciseId: 'ex-4', isCompleted: true },
          ],
        }),
      ])
    )

    const { getDistinctPerformedExerciseIds } = await import(
      '../src/lib/firebase/workoutHistory'
    )
    const result = await getDistinctPerformedExerciseIds('user-1')

    expect(result.size).toBe(4)
    expect(result.size).toBeLessThan(10)
  })

  it('GATE: a trainee at/above the threshold yields a count >= 10', async () => {
    const manyExercises = Array.from({ length: 12 }, (_, i) => ({
      exerciseId: `ex-${i}`,
      isCompleted: true,
    }))
    getDocsMock.mockResolvedValueOnce(
      snapshot([workoutDoc({ status: 'completed', exercises: manyExercises })])
    )

    const { getDistinctPerformedExerciseIds } = await import(
      '../src/lib/firebase/workoutHistory'
    )
    const result = await getDistinctPerformedExerciseIds('user-1')

    expect(result.size).toBe(12)
    expect(result.size).toBeGreaterThanOrEqual(10)
  })

  it('no history → empty set (treated as below threshold by the caller)', async () => {
    getDocsMock.mockResolvedValueOnce(snapshot([]))

    const { getDistinctPerformedExerciseIds } = await import(
      '../src/lib/firebase/workoutHistory'
    )
    const result = await getDistinctPerformedExerciseIds('user-1')

    expect(result.size).toBe(0)
  })

  it('Firestore read failure propagates (the modal catches it and gates)', async () => {
    getDocsMock.mockRejectedValueOnce(new Error('permission-denied'))

    const { getDistinctPerformedExerciseIds } = await import(
      '../src/lib/firebase/workoutHistory'
    )

    await expect(getDistinctPerformedExerciseIds('user-1')).rejects.toThrow(
      'permission-denied'
    )
  })
})
