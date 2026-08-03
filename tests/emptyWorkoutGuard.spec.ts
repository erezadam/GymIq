/**
 * emptyWorkoutGuard.spec.ts — Behavior tests for the empty-workout guards.
 *
 * Incident (02/08/2026, user report): a trainee opened an AI-generated
 * workout, deleted its exercise(s), and the workout "disappeared" with a
 * blank screen. Root cause chain:
 *   1. deleteExercise had no last-exercise guard → exercises hit length 0.
 *   2. autoSaveWorkout overwrote the existing Firestore doc as an EMPTY
 *      in_progress workout — the original planned workout became unrecoverable.
 *   3. getInProgressWorkout happily recovered the 0-exercise doc on reload,
 *      reproducing the blank screen forever.
 *
 * These tests cover the two service-layer guards (2 and 3). The UI guard (1)
 * lives in useActiveWorkout.deleteExercise/confirmDeleteExercise and is
 * verified on device. Tests are behavioral: mock the Firestore SDK, assert on
 * the calls — not source-grep.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

const getDocsMock = vi.fn()
const updateDocMock = vi.fn(async () => undefined)
const addDocMock = vi.fn(async () => ({ id: 'new-doc-id' }))

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => ({})),
  query: vi.fn(() => ({})),
  where: vi.fn(() => ({})),
  orderBy: vi.fn(() => ({})),
  limit: vi.fn(() => ({})),
  getDocs: getDocsMock,
  doc: vi.fn(() => ({})),
  getDoc: vi.fn(),
  updateDoc: updateDocMock,
  setDoc: vi.fn(),
  addDoc: addDocMock,
  deleteDoc: vi.fn(),
  serverTimestamp: vi.fn(() => 'serverTimestamp'),
  Timestamp: {
    fromDate: (d: Date) => ({ toDate: () => d }),
    now: () => ({ toDate: () => new Date(0) }),
  },
  startAfter: vi.fn(() => ({})),
  writeBatch: vi.fn(() => ({ set: vi.fn(), update: vi.fn(), commit: vi.fn() })),
  arrayUnion: vi.fn((v: unknown) => v),
  arrayRemove: vi.fn((v: unknown) => v),
  deleteField: vi.fn(() => '__deleted__'),
}))

vi.mock('../src/lib/firebase/config', () => ({ db: {} }))
vi.mock('../src/lib/firebase/diagnosticLogs', () => ({ logDiagnostic: vi.fn() }))

function baseWorkout(exercises: Array<Record<string, unknown>>) {
  const d = new Date('2026-08-02T08:53:00')
  return {
    userId: 'zehava-uid',
    name: 'אימון AI',
    date: d,
    startTime: d,
    endTime: d,
    duration: 0,
    status: 'in_progress' as const,
    exercises: exercises as any,
    completedExercises: 0,
    totalExercises: exercises.length,
    completedSets: 0,
    totalSets: 0,
    totalVolume: 0,
    personalRecords: 0,
  }
}

const oneExercise = [
  {
    exerciseId: 'ex-1',
    exerciseName: 'Squat',
    exerciseNameHe: 'סקוואט',
    isCompleted: false,
    sets: [{ type: 'working', targetReps: 10, targetWeight: 20 }],
  },
]

beforeEach(() => {
  getDocsMock.mockReset()
  updateDocMock.mockClear()
  addDocMock.mockClear()
})

describe('autoSaveWorkout — empty-overwrite guard', () => {
  it('refuses to update an EXISTING doc down to zero exercises (no updateDoc call)', async () => {
    const { autoSaveWorkout } = await import('../src/lib/firebase/workoutHistory')
    const returnedId = await autoSaveWorkout('existing-id', baseWorkout([]) as any)
    expect(updateDocMock).not.toHaveBeenCalled()
    expect(addDocMock).not.toHaveBeenCalled()
    expect(returnedId).toBe('existing-id')
  })

  it('still updates an existing doc normally when exercises are present', async () => {
    const { autoSaveWorkout } = await import('../src/lib/firebase/workoutHistory')
    const returnedId = await autoSaveWorkout('existing-id', baseWorkout(oneExercise) as any)
    expect(updateDocMock).toHaveBeenCalledTimes(1)
    const payload = updateDocMock.mock.calls[0][1] as any
    expect(payload.exercises).toHaveLength(1)
    expect(payload.status).toBe('in_progress')
    expect(returnedId).toBe('existing-id')
  })

  it('still creates a new doc when no workoutId (create path unaffected)', async () => {
    const { autoSaveWorkout } = await import('../src/lib/firebase/workoutHistory')
    const returnedId = await autoSaveWorkout(null, baseWorkout(oneExercise) as any)
    expect(addDocMock).toHaveBeenCalledTimes(1)
    expect(returnedId).toBe('new-doc-id')
  })
})

describe('getInProgressWorkout — empty-doc recovery guard', () => {
  function inProgressSnapshot(exercises: unknown) {
    return {
      empty: false,
      size: 1,
      docs: [
        {
          id: 'broken-doc',
          data: () => ({
            userId: 'zehava-uid',
            name: 'אימון AI',
            status: 'in_progress',
            exercises,
            date: { toDate: () => new Date('2026-08-02T08:53:00') },
            startTime: { toDate: () => new Date('2026-08-02T08:53:00') },
            endTime: { toDate: () => new Date('2026-08-02T08:53:00') },
          }),
        },
      ],
    }
  }

  it('returns null for a 0-exercise in_progress doc and soft-deletes it (not cancelled — a cancelled card would be continuable and reproduce the blank screen)', async () => {
    getDocsMock.mockResolvedValueOnce(inProgressSnapshot([]))
    const { getInProgressWorkout } = await import('../src/lib/firebase/workoutHistory')
    const result = await getInProgressWorkout('zehava-uid')
    expect(result).toBeNull()
    // fire-and-forget soft-delete — allow the promise chain to run
    await vi.waitFor(() => expect(updateDocMock).toHaveBeenCalled())
    const payload = updateDocMock.mock.calls[0][1] as any
    expect(payload.deletedByTrainee).toBeTruthy()
    expect(payload.status).toBeUndefined()
  })

  it('returns null and soft-deletes when exercises field is missing entirely', async () => {
    getDocsMock.mockResolvedValueOnce(inProgressSnapshot(undefined))
    const { getInProgressWorkout } = await import('../src/lib/firebase/workoutHistory')
    const result = await getInProgressWorkout('zehava-uid')
    expect(result).toBeNull()
    await vi.waitFor(() => expect(updateDocMock).toHaveBeenCalled())
    expect((updateDocMock.mock.calls[0][1] as any).deletedByTrainee).toBeTruthy()
  })

  it('autoSaveWorkout guard also blocks when exercises is missing/non-array (no TypeError)', async () => {
    const { autoSaveWorkout } = await import('../src/lib/firebase/workoutHistory')
    const broken = { ...baseWorkout([]), exercises: undefined } as any
    const returnedId = await autoSaveWorkout('existing-id', broken)
    expect(updateDocMock).not.toHaveBeenCalled()
    expect(returnedId).toBe('existing-id')
  })

  it('recovers a normal in_progress doc with exercises (behavior preserved)', async () => {
    getDocsMock.mockResolvedValueOnce(inProgressSnapshot(oneExercise))
    const { getInProgressWorkout } = await import('../src/lib/firebase/workoutHistory')
    const result = await getInProgressWorkout('zehava-uid')
    expect(result).not.toBeNull()
    expect(result!.id).toBe('broken-doc')
    expect(result!.exercises).toHaveLength(1)
    expect(updateDocMock).not.toHaveBeenCalled()
  })
})
