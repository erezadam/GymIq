/**
 * aiTrainerPoolFilter.spec.ts — Behavior tests for PR2: the single-point
 * exercise-pool filter in aiTrainerService.buildContext.
 *
 * The pool sent to the AI (and to both fallbacks) must be restricted to
 * exercises the trainee has actually performed, with ONE exception: cardio is
 * exempt so warmup keeps working. Every strength exercise — core included —
 * must have been performed.
 *
 * These tests drive generateAIWorkouts end-to-end with mocked Firestore deps
 * and capture the payload handed to the Cloud Function callable, then assert on
 * payload.availableExercises. They fail at runtime if the filter regresses.
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
    { id: 'core', nameHe: 'ליבה', bodyRegion: 'neutral' },
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

// Exercise fixture covering every branch of the filter.
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
  exercise('ex-fly', 'chest', 'chest'), // strength, NOT performed → drop
  exercise('ex-row', 'back', 'lats'), // strength, performed → keep
  exercise('ex-crunch', 'core', 'core'), // core, performed → keep
  exercise('ex-plank', 'core', 'core'), // core, NOT performed → drop
  exercise('ex-run', 'cardio', 'cardio'), // cardio, NOT performed → keep (exempt)
]

const REQUEST = {
  userId: 'user-1',
  numWorkouts: 1,
  duration: 60,
  warmupDuration: 5,
  workoutStructure: 'full_body' as const,
}

// Pull the availableExercises ids out of the captured callable payload.
function payloadExerciseIds(): string[] {
  expect(callableMock).toHaveBeenCalled()
  const payload = callableMock.mock.calls[0][0]
  return payload.availableExercises.map((e: any) => e.id)
}

describe('aiTrainerService pool filter (PR2)', () => {
  beforeEach(() => {
    callableMock.mockClear()
    getExercisesMock.mockReset()
    getDistinctPerformedExerciseIdsMock.mockReset()
    getRecentlyDoneExerciseIdsMock.mockClear()
    saveWorkoutHistoryMock.mockClear()
    getExercisesMock.mockResolvedValue(FIXTURE)
  })

  it('keeps performed strength exercises in the payload', async () => {
    getDistinctPerformedExerciseIdsMock.mockResolvedValue(
      new Set(['ex-bench', 'ex-row', 'ex-crunch'])
    )

    const { generateAIWorkouts } = await import(
      '../src/domains/workouts/services/aiTrainerService'
    )
    await generateAIWorkouts(REQUEST)

    const ids = payloadExerciseIds()
    expect(ids).toContain('ex-bench')
    expect(ids).toContain('ex-row')
  })

  it('removes strength exercises that were NOT performed', async () => {
    getDistinctPerformedExerciseIdsMock.mockResolvedValue(
      new Set(['ex-bench', 'ex-row', 'ex-crunch'])
    )

    const { generateAIWorkouts } = await import(
      '../src/domains/workouts/services/aiTrainerService'
    )
    await generateAIWorkouts(REQUEST)

    expect(payloadExerciseIds()).not.toContain('ex-fly')
  })

  it('keeps cardio even when not performed (warmup is preserved)', async () => {
    // ex-run is NOT in the performed set, yet must survive the filter.
    getDistinctPerformedExerciseIdsMock.mockResolvedValue(
      new Set(['ex-bench', 'ex-row', 'ex-crunch'])
    )

    const { generateAIWorkouts } = await import(
      '../src/domains/workouts/services/aiTrainerService'
    )
    await generateAIWorkouts(REQUEST)

    expect(payloadExerciseIds()).toContain('ex-run')
  })

  it('removes core exercises that were NOT performed (core is subject to the filter)', async () => {
    // ex-crunch performed → kept; ex-plank not performed → dropped.
    getDistinctPerformedExerciseIdsMock.mockResolvedValue(
      new Set(['ex-bench', 'ex-row', 'ex-crunch'])
    )

    const { generateAIWorkouts } = await import(
      '../src/domains/workouts/services/aiTrainerService'
    )
    await generateAIWorkouts(REQUEST)

    const ids = payloadExerciseIds()
    expect(ids).toContain('ex-crunch')
    expect(ids).not.toContain('ex-plank')
  })

  it('a muscle with zero performed strength exercises does not crash (only cardio survives)', async () => {
    // Nothing performed at all → every strength/core dropped, only cardio kept.
    getDistinctPerformedExerciseIdsMock.mockResolvedValue(new Set<string>())

    const { generateAIWorkouts } = await import(
      '../src/domains/workouts/services/aiTrainerService'
    )
    const result = await generateAIWorkouts(REQUEST)

    // No throw, no error result.
    expect(result.success).toBe(true)
    expect(payloadExerciseIds()).toEqual(['ex-run'])
  })

  it('getDistinctPerformedExerciseIds failure degrades gracefully (no crash, no throw)', async () => {
    // The gate (PR1) already ran this read moments earlier; a transient failure
    // here must surface as a graceful error result, never an unhandled throw.
    getDistinctPerformedExerciseIdsMock.mockRejectedValue(
      new Error('permission-denied')
    )

    const { generateAIWorkouts } = await import(
      '../src/domains/workouts/services/aiTrainerService'
    )

    // Resolves (does not reject) with a non-success result.
    const result = await generateAIWorkouts(REQUEST)
    expect(result.success).toBe(false)
    // The pool filter never ran → no payload was ever sent to the AI.
    expect(callableMock).not.toHaveBeenCalled()
  })

  it('exact pool: performed strength + performed core + all cardio, nothing else', async () => {
    getDistinctPerformedExerciseIdsMock.mockResolvedValue(
      new Set(['ex-bench', 'ex-row', 'ex-crunch'])
    )

    const { generateAIWorkouts } = await import(
      '../src/domains/workouts/services/aiTrainerService'
    )
    await generateAIWorkouts(REQUEST)

    expect(payloadExerciseIds().sort()).toEqual(
      ['ex-bench', 'ex-crunch', 'ex-row', 'ex-run'].sort()
    )
  })
})

describe('aiTrainerService pool filter — exerciseSource flag (PR-2)', () => {
  beforeEach(() => {
    callableMock.mockClear()
    getExercisesMock.mockReset()
    getDistinctPerformedExerciseIdsMock.mockReset()
    getRecentlyDoneExerciseIdsMock.mockClear()
    saveWorkoutHistoryMock.mockClear()
    getExercisesMock.mockResolvedValue(FIXTURE)
    // Only 2 of the 6 fixture exercises were performed — the difference between
    // 'all' and 'performed' is observable.
    getDistinctPerformedExerciseIdsMock.mockResolvedValue(
      new Set(['ex-bench', 'ex-row'])
    )
  })

  it("'all' → the pool is the FULL library (no performed filter)", async () => {
    const { generateAIWorkouts } = await import(
      '../src/domains/workouts/services/aiTrainerService'
    )
    await generateAIWorkouts({ ...REQUEST, exerciseSource: 'all' })

    // Every fixture exercise is present, including never-performed ones.
    expect(payloadExerciseIds().sort()).toEqual(
      ['ex-bench', 'ex-crunch', 'ex-fly', 'ex-plank', 'ex-row', 'ex-run'].sort()
    )
  })

  it("'performed' → the pool is narrowed (performed strength/core + cardio)", async () => {
    const { generateAIWorkouts } = await import(
      '../src/domains/workouts/services/aiTrainerService'
    )
    await generateAIWorkouts({ ...REQUEST, exerciseSource: 'performed' })

    // ex-fly (strength, not performed) and ex-plank (core, not performed) dropped;
    // ex-run (cardio) kept by exemption.
    expect(payloadExerciseIds().sort()).toEqual(
      ['ex-bench', 'ex-row', 'ex-run'].sort()
    )
  })

  it('default (flag omitted) → identical to performed (behavior preserved)', async () => {
    const { generateAIWorkouts } = await import(
      '../src/domains/workouts/services/aiTrainerService'
    )
    await generateAIWorkouts({ ...REQUEST })

    expect(payloadExerciseIds().sort()).toEqual(
      ['ex-bench', 'ex-row', 'ex-run'].sort()
    )
  })
})

describe('exerciseSource and the performed-read failure (PR-3)', () => {
  beforeEach(() => {
    callableMock.mockClear()
    getExercisesMock.mockReset()
    getDistinctPerformedExerciseIdsMock.mockReset()
    getRecentlyDoneExerciseIdsMock.mockClear()
    saveWorkoutHistoryMock.mockClear()
    getExercisesMock.mockResolvedValue(FIXTURE)
    // The performed read would reject — but in 'all' mode it must never be called.
    getDistinctPerformedExerciseIdsMock.mockRejectedValue(
      new Error('permission-denied')
    )
  })

  it("'all' generates even when the performed read would fail (it is never called)", async () => {
    const { generateAIWorkouts } = await import(
      '../src/domains/workouts/services/aiTrainerService'
    )
    const result = await generateAIWorkouts({ ...REQUEST, exerciseSource: 'all' })

    expect(result.success).toBe(true)
    // The fix: 'all' mode skips the read entirely, so its rejection can't bubble.
    expect(getDistinctPerformedExerciseIdsMock).not.toHaveBeenCalled()
    // Full library — never-performed exercises included.
    expect(payloadExerciseIds().sort()).toEqual(
      ['ex-bench', 'ex-crunch', 'ex-fly', 'ex-plank', 'ex-row', 'ex-run'].sort()
    )
  })

  it("'performed' still degrades gracefully when the read rejects (unchanged)", async () => {
    const { generateAIWorkouts } = await import(
      '../src/domains/workouts/services/aiTrainerService'
    )
    const result = await generateAIWorkouts({ ...REQUEST, exerciseSource: 'performed' })

    expect(result.success).toBe(false)
    expect(callableMock).not.toHaveBeenCalled()
  })
})
