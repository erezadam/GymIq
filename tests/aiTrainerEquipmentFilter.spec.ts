/**
 * aiTrainerEquipmentFilter.spec.ts — Stage B: equipment filter (infrastructure).
 *
 * Client-authoritative pool filtering + server helpers for muscle narrowing and
 * the skipped-warmup report. Proves:
 *  1. No equipmentFilter → pool identical to today (no filtering).
 *  2. A partial filter shrinks the pool (client harness) AND the derived muscle
 *     list (server presentParentMuscleIds).
 *  3. Cardio/core/model pools are filtered too — because the SERVER derives them
 *     from the client-filtered pool, a cardio whose equipment isn't selected is
 *     absent from the payload the server consumes.
 *  4. Graviton is matched by assistance type, never by equipment.
 *  5. When no cardio survives and a warmup was requested, the skip is reported
 *     (server shouldReportWarmupSkipped) — no unfiltered fallback.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------- Pure helpers (client + server) ----------
import {
  filterExercisesByEquipment,
  isPartialEquipmentFilter as isPartialClient,
} from '../src/domains/workouts/utils/equipmentPoolFilter'
import {
  isPartialEquipmentFilter as isPartialServer,
  presentParentMuscleIds,
  shouldReportWarmupSkipped,
} from '../functions/src/ai-trainer/equipmentFilter'
import { SUB_MUSCLE_TO_PARENT } from '../functions/src/ai-trainer/muscleMapping'

describe('equipment filter — pure helpers', () => {
  it('isPartialEquipmentFilter: absent / empty / "all" → false; a real subset → true (client == server)', () => {
    for (const fn of [isPartialClient, isPartialServer]) {
      expect(fn(undefined)).toBe(false)
      expect(fn([])).toBe(false)
      expect(fn(['all'])).toBe(false)
      expect(fn(['all', 'dumbbell'])).toBe(false)
      expect(fn(['dumbbell'])).toBe(true)
      expect(fn(['dumbbell', 'graviton'])).toBe(true)
    }
  })

  it('filterExercisesByEquipment: absent/all → unchanged reference', () => {
    const list = [{ id: 'a', equipment: 'dumbbell' }]
    expect(filterExercisesByEquipment(list, undefined)).toBe(list)
    expect(filterExercisesByEquipment(list, ['all'])).toBe(list)
    expect(filterExercisesByEquipment(list, [])).toBe(list)
  })

  it('filterExercisesByEquipment: matches by equipment, and graviton by assistance type only', () => {
    const ex = [
      { id: 'db', equipment: 'dumbbell' },
      { id: 'mc', equipment: 'machine' },
      { id: 'grav', equipment: 'cable_machine', assistanceTypes: ['graviton'] },
    ]
    // dumbbell only → just db.
    expect(filterExercisesByEquipment(ex, ['dumbbell']).map((e) => e.id)).toEqual(['db'])
    // graviton selected → the graviton-assisted exercise is included by assistance
    // type even though its equipment (cable_machine) is not selected.
    expect(filterExercisesByEquipment(ex, ['dumbbell', 'graviton']).map((e) => e.id).sort()).toEqual(['db', 'grav'])
    // graviton NOT selected → grav excluded (its equipment isn't selected either).
    expect(filterExercisesByEquipment(ex, ['machine']).map((e) => e.id)).toEqual(['mc'])
    // graviton is never treated as an equipment id: a graviton-only selection
    // keeps only assistance-matched exercises, none by an 'equipment===graviton'.
    expect(filterExercisesByEquipment(ex, ['graviton']).map((e) => e.id)).toEqual(['grav'])
  })

  it('presentParentMuscleIds: narrows to parents present in the (filtered) pool', () => {
    const pool = [
      { primaryMuscle: 'quads' }, // → legs
      { primaryMuscle: 'lats' }, // → back
      { primaryMuscle: 'chest' }, // → chest (no sub-mapping)
    ]
    const present = presentParentMuscleIds(pool, SUB_MUSCLE_TO_PARENT)
    expect(present.has('legs')).toBe(true)
    expect(present.has('back')).toBe(true)
    expect(present.has('chest')).toBe(true)
    expect(present.has('shoulders')).toBe(false) // no exercise resolves to it
  })

  it('shouldReportWarmupSkipped: only when warmup requested + partial filter + zero cardio', () => {
    expect(shouldReportWarmupSkipped(true, true, 0)).toBe(true)
    expect(shouldReportWarmupSkipped(true, true, 2)).toBe(false) // cardio survived
    expect(shouldReportWarmupSkipped(false, true, 0)).toBe(false) // no warmup requested
    expect(shouldReportWarmupSkipped(true, false, 0)).toBe(false) // no partial filter → unchanged
  })
})

// ---------- Client harness: capture the payload sent to the Cloud Function ----------
const callableMock = vi.fn(async (_payload: any) => ({
  data: {
    success: true,
    usedFallback: false,
    workouts: [{ name: 'מאמן #1', exercises: [], estimatedDuration: 60, muscleGroups: [], source: 'ai_trainer', aiWorkoutNumber: 1 }],
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
    { id: 'back', nameHe: 'גב', bodyRegion: 'upper' },
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

const ex = (id: string, category: string, primaryMuscle: string, equipment: string, assistanceTypes?: string[]) => ({
  id, name: id, nameHe: id, category, primaryMuscle, imageUrl: '', equipment,
  ...(assistanceTypes ? { assistanceTypes } : {}),
})
const FIXTURE = [
  ex('ex-db', 'chest', 'chest', 'dumbbell'),
  ex('ex-mc', 'back', 'back', 'machine'),
  ex('ex-cardio', 'cardio', 'cardio', 'machine'), // cardio on 'machine'
  ex('ex-grav', 'back', 'lats', 'cable_machine', ['graviton']),
]
const REQUEST = { userId: 'u1', numWorkouts: 1, duration: 60, warmupDuration: 5, workoutStructure: 'full_body' as const }

function poolIds(): string[] {
  expect(callableMock).toHaveBeenCalled()
  return callableMock.mock.calls[0][0].availableExercises.map((e: any) => e.id).sort()
}
async function run(extra: Record<string, unknown>) {
  const { generateAIWorkouts } = await import('../src/domains/workouts/services/aiTrainerService')
  await generateAIWorkouts({ ...REQUEST, exerciseSource: 'all', ...extra } as any)
}

describe('equipment filter — client pool (end-to-end payload capture)', () => {
  beforeEach(() => {
    callableMock.mockClear()
    getExercisesMock.mockReset().mockResolvedValue(FIXTURE)
    getDistinctPerformedExerciseIdsMock.mockReset().mockResolvedValue(new Set<string>())
  })

  it('no equipmentFilter → pool identical to today (all source-included exercises)', async () => {
    await run({})
    expect(poolIds()).toEqual(['ex-cardio', 'ex-db', 'ex-grav', 'ex-mc'])
  })

  it('partial filter shrinks the pool, and removes cardio whose equipment is not selected', async () => {
    await run({ equipmentFilter: ['dumbbell'] })
    // Only the dumbbell exercise remains — machine strength AND machine cardio are
    // gone (so the server-derived cardio/core/model pools are filtered too).
    expect(poolIds()).toEqual(['ex-db'])
  })

  it('graviton is matched by assistance type, not by equipment', async () => {
    await run({ equipmentFilter: ['dumbbell', 'graviton'] })
    expect(poolIds()).toEqual(['ex-db', 'ex-grav'])
  })
})
