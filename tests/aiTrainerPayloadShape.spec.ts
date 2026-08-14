/**
 * aiTrainerPayloadShape.spec.ts — PR-0 characterization lock (zero product change).
 *
 * Locks the EXACT per-exercise shape of the payload sent from the client to the
 * Cloud Function (aiTrainerService.callCloudFunction), and that the surviving
 * field VALUES pass through unchanged. This is today's behavior — captured as-is:
 *
 *  - Each availableExercises entry carries EXACTLY: id, nameHe, primaryMuscle,
 *    category, imageUrl, equipment — nothing more, nothing less.
 *  - reportType is NOT sent (today's behavior — deliberately locked, not fixed
 *    here), and neither are any other exercise fields (name, complexity,
 *    secondaryMuscles, videoWebpUrl, …).
 *  - Holds in both exerciseSource modes ('performed' and 'all'), and for cardio
 *    (whose real reportType is time-based) exactly as for strength.
 *
 * The pool CONTENT (performed/all + cardio exemption + no-history edge) is
 * already locked by tests/aiTrainerPoolFilter.spec.ts; this file locks the
 * per-exercise field shape those tests don't assert.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---- Capture the payload handed to the Cloud Function callable. ----
const callableMock = vi.fn(async (_payload: any) => ({
  data: {
    success: true,
    usedFallback: false,
    workouts: [
      { name: 'מאמן #1', exercises: [], estimatedDuration: 60, muscleGroups: [], source: 'ai_trainer', aiWorkoutNumber: 1 },
    ],
  },
}))

vi.mock('firebase/functions', () => ({
  getFunctions: vi.fn(() => ({})),
  httpsCallable: vi.fn(() => callableMock),
}))
vi.mock('@/lib/firebase/config', () => ({ app: {}, db: {} }))

const getExercisesMock = vi.fn()
const getDistinctPerformedExerciseIdsMock = vi.fn()

vi.mock('@/lib/firebase/exercises', () => ({ getExercises: getExercisesMock }))
vi.mock('@/lib/firebase/muscles', () => ({
  getMuscles: vi.fn(async () => [
    { id: 'chest', nameHe: 'חזה', bodyRegion: 'upper' },
    { id: 'cardio', nameHe: 'אירובי', bodyRegion: 'neutral' },
  ]),
}))
vi.mock('@/lib/firebase/workoutHistory', () => ({
  getUserWorkoutHistory: vi.fn(async () => []),
  getUserWorkoutHistoryFull: vi.fn(async () => []),
  getRecentlyDoneExerciseIds: vi.fn(async () => new Set<string>()),
  getDistinctPerformedExerciseIds: getDistinctPerformedExerciseIdsMock,
  saveWorkoutHistory: vi.fn(async () => 'saved-id'),
}))

// Full library-shaped exercise with EXTRA fields that must NOT reach the payload.
const STRENGTH = {
  id: 'ex-bench',
  name: 'Bench Press',
  nameHe: 'לחיצת חזה',
  category: 'chest',
  primaryMuscle: 'chest',
  imageUrl: 'https://img/bench.png',
  equipment: 'dumbbell',
  reportType: 'weight_reps',
  complexity: 'compound',
  secondaryMuscles: ['triceps'],
  videoWebpUrl: 'https://img/bench.webp',
}
const CARDIO = {
  id: 'ex-treadmill',
  name: 'Treadmill',
  nameHe: 'מסילה',
  category: 'cardio',
  primaryMuscle: 'cardio',
  imageUrl: 'https://img/treadmill.png',
  equipment: 'machine',
  reportType: 'spead-time-slot',
  complexity: 'simple',
  secondaryMuscles: [],
  videoWebpUrl: 'https://img/treadmill.webp',
}

const EXPECTED_KEYS = ['category', 'equipment', 'id', 'imageUrl', 'nameHe', 'primaryMuscle']
const REQUEST_BASE = { userId: 'u1', numWorkouts: 1, duration: 60, warmupDuration: 5, workoutStructure: 'full_body' as const }

function capturedExercises(): any[] {
  expect(callableMock).toHaveBeenCalled()
  return callableMock.mock.calls[0][0].availableExercises
}
function byId(id: string) {
  return capturedExercises().find((e: any) => e.id === id)
}

beforeEach(() => {
  callableMock.mockClear()
  getExercisesMock.mockReset()
  getDistinctPerformedExerciseIdsMock.mockReset()
  getExercisesMock.mockResolvedValue([STRENGTH, CARDIO])
  getDistinctPerformedExerciseIdsMock.mockResolvedValue(new Set(['ex-bench']))
})

async function run(source?: 'performed' | 'all') {
  const { generateAIWorkouts } = await import('../src/domains/workouts/services/aiTrainerService')
  await generateAIWorkouts(source ? { ...REQUEST_BASE, exerciseSource: source } : REQUEST_BASE)
}

describe('AI trainer payload — exact per-exercise field shape (PR-0 lock)', () => {
  it("strength entry has EXACTLY {id,nameHe,primaryMuscle,category,imageUrl,equipment}", async () => {
    await run('performed')
    const entry = byId('ex-bench')
    expect(Object.keys(entry).sort()).toEqual(EXPECTED_KEYS)
  })

  it('reportType (and other library fields) are NOT sent — today\'s behavior, locked', async () => {
    await run('performed')
    const entry = byId('ex-bench')
    expect(entry).not.toHaveProperty('reportType')
    expect(entry).not.toHaveProperty('name')
    expect(entry).not.toHaveProperty('complexity')
    expect(entry).not.toHaveProperty('secondaryMuscles')
    expect(entry).not.toHaveProperty('videoWebpUrl')
  })

  it('surviving field VALUES pass through unchanged', async () => {
    await run('performed')
    expect(byId('ex-bench')).toEqual({
      id: 'ex-bench',
      nameHe: 'לחיצת חזה',
      primaryMuscle: 'chest',
      category: 'chest',
      imageUrl: 'https://img/bench.png',
      equipment: 'dumbbell',
    })
  })

  it('cardio entry has the same shape and also omits its (time-based) reportType', async () => {
    await run('performed') // cardio is exempt → present in the pool
    const entry = byId('ex-treadmill')
    expect(Object.keys(entry).sort()).toEqual(EXPECTED_KEYS)
    expect(entry).not.toHaveProperty('reportType')
    expect(entry.equipment).toBe('machine')
  })

  it("holds in exerciseSource='all' mode too (full library, same shape)", async () => {
    await run('all')
    const entry = byId('ex-bench')
    expect(Object.keys(entry).sort()).toEqual(EXPECTED_KEYS)
    expect(entry).not.toHaveProperty('reportType')
    // 'all' mode includes every exercise; both are present with the locked shape.
    expect(byId('ex-treadmill')).toBeTruthy()
    expect(Object.keys(byId('ex-treadmill')).sort()).toEqual(EXPECTED_KEYS)
  })
})
