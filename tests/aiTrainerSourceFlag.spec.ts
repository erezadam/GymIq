/**
 * aiTrainerSourceFlag.spec.ts — Behavior tests for PR-1 of the "exercise source
 * selector" feature: the exerciseSource flag is plumbed end-to-end with a
 * default of 'performed' that preserves current behavior EXACTLY.
 *
 * PR-1 only forwards the flag in the payload — it is NOT yet consumed by any
 * logic (the pool filter stays unconditional, owned by PR-2). So these tests
 * assert two things, both from the captured Cloud Function payload:
 *   (a) the flag reaches the payload as request.exerciseSource === 'performed';
 *   (b) the exercise pool is identical to today's performed-only behavior — the
 *       default changes nothing, and omitting the flag is behavior-preserving.
 *
 * Driven through the real generateAIWorkouts with mocked Firestore deps; assert
 * on the payload handed to the httpsCallable (mock + assert, not source-grep).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---- Capture the payload sent to the Cloud Function callable. ----
const callableMock = vi.fn(async (_payload: any) => ({
  data: {
    success: true,
    usedFallback: false,
    workouts: [
      {
        name: 'מאמן #1',
        exercises: [],
        estimatedDuration: 60,
        muscleGroups: [],
        source: 'ai_trainer',
        aiWorkoutNumber: 1,
      },
    ],
  },
}))

vi.mock('firebase/functions', () => ({
  getFunctions: vi.fn(() => ({})),
  httpsCallable: vi.fn(() => callableMock),
}))

vi.mock('@/lib/firebase/config', () => ({ app: {}, db: {} }))

// ---- Firestore-backed service deps used by buildContext. ----
const getExercisesMock = vi.fn()
const getDistinctPerformedExerciseIdsMock = vi.fn()
const getRecentlyDoneExerciseIdsMock = vi.fn(async () => new Set<string>())
const getUserWorkoutHistoryMock = vi.fn(async () => [])
const getUserWorkoutHistoryFullMock = vi.fn(async () => [])
const saveWorkoutHistoryMock = vi.fn(async () => 'saved-id')

vi.mock('@/lib/firebase/exercises', () => ({
  getExercises: getExercisesMock,
}))

vi.mock('@/lib/firebase/muscles', () => ({
  getMuscles: vi.fn(async () => [
    { id: 'chest', nameHe: 'חזה', bodyRegion: 'upper' },
    { id: 'back', nameHe: 'גב', bodyRegion: 'upper' },
    { id: 'cardio', nameHe: 'אירובי', bodyRegion: 'neutral' },
  ]),
}))

vi.mock('@/lib/firebase/workoutHistory', () => ({
  getExercises: getExercisesMock,
  getUserWorkoutHistory: getUserWorkoutHistoryMock,
  getUserWorkoutHistoryFull: getUserWorkoutHistoryFullMock,
  getRecentlyDoneExerciseIds: getRecentlyDoneExerciseIdsMock,
  getDistinctPerformedExerciseIds: getDistinctPerformedExerciseIdsMock,
  saveWorkoutHistory: saveWorkoutHistoryMock,
}))

function exercise(
  id: string,
  category: string,
  primaryMuscle: string
): Record<string, unknown> {
  return {
    id,
    name: id,
    nameHe: id,
    category,
    primaryMuscle,
    imageUrl: '',
    equipment: 'barbell',
    secondaryMuscles: [],
  }
}

const FIXTURE = [
  exercise('ex-bench', 'chest', 'chest'), // strength, performed → keep
  exercise('ex-fly', 'chest', 'chest'), // strength, NOT performed → drop (today)
  exercise('ex-row', 'back', 'lats'), // strength, performed → keep
  exercise('ex-run', 'cardio', 'cardio'), // cardio, NOT performed → keep (exempt)
]

// The pool today (PR2 filter): performed strength + all cardio.
const PERFORMED = new Set(['ex-bench', 'ex-row'])
const EXPECTED_POOL_TODAY = ['ex-bench', 'ex-row', 'ex-run'].sort()

const BASE_REQUEST = {
  userId: 'user-1',
  numWorkouts: 1,
  duration: 60,
  warmupDuration: 5,
  workoutStructure: 'full_body' as const,
}

function payloadRequest(): any {
  expect(callableMock).toHaveBeenCalled()
  return callableMock.mock.calls[0][0].request
}

function payloadExerciseIds(): string[] {
  return callableMock.mock.calls[0][0].availableExercises.map((e: any) => e.id)
}

describe('aiTrainer exerciseSource flag (PR-1 — plumbing only)', () => {
  beforeEach(() => {
    callableMock.mockClear()
    getExercisesMock.mockReset()
    getDistinctPerformedExerciseIdsMock.mockReset()
    saveWorkoutHistoryMock.mockClear()
    getExercisesMock.mockResolvedValue(FIXTURE)
    getDistinctPerformedExerciseIdsMock.mockResolvedValue(PERFORMED)
  })

  it("(a) forwards exerciseSource into the Cloud Function payload as 'performed'", async () => {
    const { generateAIWorkouts } = await import(
      '../src/domains/workouts/services/aiTrainerService'
    )
    await generateAIWorkouts({ ...BASE_REQUEST, exerciseSource: 'performed' })

    expect(payloadRequest().exerciseSource).toBe('performed')
  })

  it("(b) default 'performed' leaves the pool identical to current behavior", async () => {
    const { generateAIWorkouts } = await import(
      '../src/domains/workouts/services/aiTrainerService'
    )
    await generateAIWorkouts({ ...BASE_REQUEST, exerciseSource: 'performed' })

    expect(payloadExerciseIds().sort()).toEqual(EXPECTED_POOL_TODAY)
  })

  it('(b) omitting exerciseSource is behavior-preserving — same pool, no crash', async () => {
    // An absent flag must behave exactly like today: performed strength +
    // cardio, success. (Identical default handling in PR-1 and PR-2.)
    const { generateAIWorkouts } = await import(
      '../src/domains/workouts/services/aiTrainerService'
    )
    const result = await generateAIWorkouts({ ...BASE_REQUEST })

    expect(result.success).toBe(true)
    expect(payloadExerciseIds().sort()).toEqual(EXPECTED_POOL_TODAY)
  })
})

// PR-2: the flag now CONTROLS the pool. Both the forwarded value and the pool it
// produces are asserted, per mode, at the service edge.
describe('aiTrainer exerciseSource flag (PR-2 — flag controls the pool)', () => {
  // Full library = every fixture exercise (incl. never-performed ex-fly).
  const FULL_LIBRARY = ['ex-bench', 'ex-fly', 'ex-row', 'ex-run'].sort()

  beforeEach(() => {
    callableMock.mockClear()
    getExercisesMock.mockReset()
    getDistinctPerformedExerciseIdsMock.mockReset()
    saveWorkoutHistoryMock.mockClear()
    getExercisesMock.mockResolvedValue(FIXTURE)
    getDistinctPerformedExerciseIdsMock.mockResolvedValue(PERFORMED)
  })

  it("'all' → flag forwarded AND pool is the full library", async () => {
    const { generateAIWorkouts } = await import(
      '../src/domains/workouts/services/aiTrainerService'
    )
    await generateAIWorkouts({ ...BASE_REQUEST, exerciseSource: 'all' })

    expect(payloadRequest().exerciseSource).toBe('all')
    expect(payloadExerciseIds().sort()).toEqual(FULL_LIBRARY)
  })

  it("'performed' → flag forwarded AND pool is narrowed (performed + cardio)", async () => {
    const { generateAIWorkouts } = await import(
      '../src/domains/workouts/services/aiTrainerService'
    )
    await generateAIWorkouts({ ...BASE_REQUEST, exerciseSource: 'performed' })

    expect(payloadRequest().exerciseSource).toBe('performed')
    expect(payloadExerciseIds().sort()).toEqual(EXPECTED_POOL_TODAY)
  })
})
