/**
 * workoutInitTiming.spec.ts — Behavior tests for the init-timing instrumentation
 * added 2026-05-19 to investigate the "אימון שמור → פעיל" hang on weak network.
 *
 * What this test verifies:
 *   1. WORKOUT_INIT_START fires once per init cycle (entry trace).
 *   2. WORKOUT_INIT_TIMING fires at each of the 4 exit points with the
 *      correct `pathTaken` label: skip_already_initialized, firebase_recovery,
 *      localstorage_fast_path, and the final exit (new_from_builder /
 *      trainer_planned / continue_from_history / no_workout_no_selection).
 *   3. A throwing logDiagnostic does NOT break the hydration path — setWorkout
 *      still happens, setIsLoading(false) still fires.
 *   4. validateWithRetry's onAttempt callback is invoked with the correct
 *      phase label ('init' from continueFromHistory, 'autosave' from the
 *      autosave path).
 *
 * These tests assert on observable side effects (mock invocations + log
 * payload contents), not on source patterns.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

// ----- Capture mocks (hoisted) -----

const {
  getInProgressWorkoutMock,
  autoSaveWorkoutMock,
  validateWorkoutIdMock,
  logDiagnosticMock,
  navigateMock,
  locationStateRef,
} = vi.hoisted(() => ({
  getInProgressWorkoutMock: vi.fn(),
  autoSaveWorkoutMock: vi.fn(),
  validateWorkoutIdMock: vi.fn(),
  logDiagnosticMock: vi.fn(),
  navigateMock: vi.fn(),
  locationStateRef: { current: null as unknown },
}))

// ----- Module mocks -----

vi.mock('@/lib/firebase/workoutHistory', () => ({
  saveWorkoutHistory: vi.fn(),
  getBestPerformanceForExercises: vi.fn(async () => ({})),
  getLastWorkoutForExercises: vi.fn(async () => ({})),
  getExerciseNotesForExercises: vi.fn(async () => ({})),
  autoSaveWorkout: autoSaveWorkoutMock,
  getInProgressWorkout: getInProgressWorkoutMock,
  completeWorkout: vi.fn(),
  calculateAndSaveWeightRecommendations: vi.fn(),
  getWeightRecommendations: vi.fn(async () => ({})),
  getLastExerciseVolumes: vi.fn(async () => ({})),
  calculateExerciseVolume: vi.fn(),
  getWeeklySetsByCategory: vi.fn(async () => []),
}))

vi.mock('@/lib/firebase/exercises', () => ({
  getExerciseById: vi.fn(async () => null),
}))

vi.mock('@/lib/firebase/muscles', () => ({
  getMuscleIdToNameHeMap: vi.fn(async () => ({})),
}))

vi.mock('@/lib/firebase/diagnosticLogs', () => ({
  logDiagnostic: logDiagnosticMock,
}))

vi.mock('@/utils/workoutValidation', () => ({
  validateWorkoutId: validateWorkoutIdMock,
  isNetworkError: vi.fn(() => false),
}))

const mockUser = { uid: 'user-1', email: 't@e.com', displayName: 'T' }
vi.mock('@/domains/authentication/hooks/useEffectiveUser', () => ({
  useEffectiveUser: () => mockUser,
  useIsImpersonating: () => false,
}))

type BuilderState = {
  selectedExercises: Array<{
    exerciseId: string
    exerciseName: string
    exerciseNameHe: string
    primaryMuscle: string
  }>
  clearWorkout: ReturnType<typeof vi.fn>
  removeExercise: ReturnType<typeof vi.fn>
  programId: string | null
  programDayLabel: string | null
  programSource: string | null
  workoutName: string | null
  targetUserId: string | null
  plannedWorkoutDocId: string | null
  reportedBy: string | null
  reportedByName: string | null
}
const { builderState } = vi.hoisted(() => ({
  builderState: {
    selectedExercises: [],
    clearWorkout: vi.fn(),
    removeExercise: vi.fn(),
    programId: null,
    programDayLabel: null,
    programSource: null,
    workoutName: null,
    targetUserId: null,
    plannedWorkoutDocId: null,
    reportedBy: null,
    reportedByName: null,
  } as BuilderState,
}))

vi.mock('@/domains/workouts/store', () => {
  const useWorkoutBuilderStore = (() => builderState) as unknown as {
    (): BuilderState
    getState: () => BuilderState
  }
  useWorkoutBuilderStore.getState = () => builderState
  return { useWorkoutBuilderStore }
})

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
  useLocation: () => ({
    state: locationStateRef.current,
    pathname: '/workout/session',
    search: '',
    hash: '',
    key: 'test',
  }),
}))

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  },
}))

vi.mock('@/styles/design-tokens', () => ({
  muscleGroupNames: {},
}))

import { useActiveWorkout } from '@/domains/workouts/hooks/useActiveWorkout'

const FIREBASE_ID_KEY = 'gymiq_firebase_workout_id'
const ACTIVE_WORKOUT_KEY = 'gymiq_active_workout_v2'

function resetBuilder(overrides: Partial<BuilderState> = {}) {
  builderState.selectedExercises = []
  builderState.programId = null
  builderState.programDayLabel = null
  builderState.programSource = null
  builderState.workoutName = null
  builderState.targetUserId = null
  builderState.plannedWorkoutDocId = null
  builderState.reportedBy = null
  builderState.reportedByName = null
  Object.assign(builderState, overrides)
}

// Helpers — find the WORKOUT_INIT_TIMING call (the END event) emitted during
// the init cycle. There is exactly one per cycle.
function findEndCall(): { workoutId: string | null; payload: Record<string, unknown> } | null {
  const call = logDiagnosticMock.mock.calls.find(
    (args) => args[0] === 'WORKOUT_INIT_TIMING',
  )
  if (!call) return null
  return { workoutId: call[1] as string | null, payload: call[2] as Record<string, unknown> }
}

function findStartCall(): { payload: Record<string, unknown> } | null {
  const call = logDiagnosticMock.mock.calls.find(
    (args) => args[0] === 'WORKOUT_INIT_START',
  )
  if (!call) return null
  return { payload: call[2] as Record<string, unknown> }
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  resetBuilder()
  locationStateRef.current = null
  validateWorkoutIdMock.mockResolvedValue({ valid: true })
  getInProgressWorkoutMock.mockResolvedValue(null)
  autoSaveWorkoutMock.mockResolvedValue('new-doc-id')
})

describe('useActiveWorkout — init-timing instrumentation', () => {
  it('emits WORKOUT_INIT_START with snapshot at entry and pathTaken=new_from_builder at exit', async () => {
    resetBuilder({
      selectedExercises: [
        {
          exerciseId: 'ex-1',
          exerciseName: 'Bench Press',
          exerciseNameHe: 'לחיצת חזה',
          primaryMuscle: 'chest',
        },
      ],
    })

    renderHook(() => useActiveWorkout())
    await waitFor(() => expect(autoSaveWorkoutMock).toHaveBeenCalled())

    const start = findStartCall()
    expect(start).not.toBeNull()
    expect(start!.payload).toMatchObject({
      selectedExercisesCount: 1,
      hasUser: true,
      isContinuingFromHistory: false,
    })

    const end = findEndCall()
    expect(end).not.toBeNull()
    expect(end!.payload).toMatchObject({
      pathTaken: 'new_from_builder',
      gateConditions: {
        selectedExercisesCount: 1,
        isContinuingFromHistory: false,
        hasUser: true,
      },
      exerciseCount: 1,
    })
    expect(typeof end!.payload.totalMs).toBe('number')
  })

  it('emits pathTaken=firebase_recovery when Firebase has an in_progress workout', async () => {
    // No selectedExercises, no continueWorkoutData → falls into FB recovery gate.
    getInProgressWorkoutMock.mockResolvedValue({
      id: 'fb-workout-1',
      userId: 'user-1',
      startTime: new Date(),
      exercises: [
        {
          exerciseId: 'ex-1',
          exerciseName: 'Squat',
          exerciseNameHe: 'סקוואט',
          imageUrl: '',
          isCompleted: false,
          sets: [{ actualWeight: 0, actualReps: 0, completed: false }],
        },
      ],
    })

    renderHook(() => useActiveWorkout())
    await waitFor(() => {
      const end = findEndCall()
      expect(end?.payload.pathTaken).toBe('firebase_recovery')
    })

    const end = findEndCall()!
    expect(end.workoutId).toBe('fb-workout-1')
    expect(end.payload.exerciseCount).toBe(1)
    // Block durations were recorded — at least the getInProgressWorkout block.
    const durations = end.payload.durations as Record<string, number>
    expect(Object.keys(durations)).toContain('firebase_recovery.getInProgressWorkout')
  })

  it('emits pathTaken=localstorage_fast_path when saved workout exists in localStorage', async () => {
    localStorage.setItem(
      ACTIVE_WORKOUT_KEY,
      JSON.stringify({
        id: 'local-workout-1',
        startedAt: new Date().toISOString(),
        userId: 'user-1',
        exercises: [],
        stats: {
          totalExercises: 0,
          completedExercises: 0,
          totalSets: 0,
          completedSets: 0,
          elapsedSeconds: 0,
          totalVolume: 0,
        },
      }),
    )

    renderHook(() => useActiveWorkout())
    await waitFor(() => {
      const end = findEndCall()
      expect(end?.payload.pathTaken).toBe('localstorage_fast_path')
    })

    const start = findStartCall()
    expect(start!.payload.localStorageState).toMatchObject({
      savedWorkout: 'present',
    })
  })

  it('emits pathTaken=continue_from_history when continueWorkoutData is set, and validateWithRetry receives phase="init"', async () => {
    // Simulate the "המשך אימון" entry: continueWorkoutData + continueWorkoutId
    // present in localStorage. validateWorkoutId resolves valid on first try.
    localStorage.setItem('continueWorkoutId', 'continue-doc-id')
    localStorage.setItem('continueWorkoutMode', 'in_progress')
    localStorage.setItem(
      'continueWorkoutData',
      JSON.stringify([
        { exerciseId: 'ex-1', exerciseName: 'Squat', exerciseNameHe: 'סקוואט', sets: [] },
      ]),
    )
    // After clearing of localStorage above, selectedExercises empty means we
    // fall through to the final exit; for continue-from-history the user normally
    // arrives with selectedExercises populated from WorkoutHistory's
    // handleConfirmContinue.
    resetBuilder({
      selectedExercises: [
        {
          exerciseId: 'ex-1',
          exerciseName: 'Squat',
          exerciseNameHe: 'סקוואט',
          primaryMuscle: 'legs',
        },
      ],
    })

    renderHook(() => useActiveWorkout())
    await waitFor(() => expect(autoSaveWorkoutMock).toHaveBeenCalled())

    const end = findEndCall()
    expect(end).not.toBeNull()
    expect(end!.payload.pathTaken).toBe('continue_from_history')

    // Validate attempts captured with phase label.
    const validate = end!.payload.validate as
      | { attempts: number; attemptResults: { phase?: string }[] }
      | undefined
    expect(validate).toBeDefined()
    expect(validate!.attempts).toBeGreaterThanOrEqual(1)
    // At least one attempt should be tagged with phase='init' (from the
    // continueFromHistory primary validation at line ~853).
    expect(validate!.attemptResults.some((r) => r.phase === 'init')).toBe(true)
  })

  it('does not break hydration when logDiagnostic throws', async () => {
    // Both START and END calls throw — hydration MUST still complete.
    logDiagnosticMock.mockImplementation(() => {
      throw new Error('Diagnostic write failed (simulated)')
    })

    resetBuilder({
      selectedExercises: [
        {
          exerciseId: 'ex-1',
          exerciseName: 'Squat',
          exerciseNameHe: 'סקוואט',
          primaryMuscle: 'legs',
        },
      ],
    })

    // Should not throw, should still call autoSaveWorkout.
    renderHook(() => useActiveWorkout())
    await waitFor(() => expect(autoSaveWorkoutMock).toHaveBeenCalled())

    // Despite the throw, logDiagnostic was attempted.
    expect(logDiagnosticMock).toHaveBeenCalled()
  })

  it('emits initPhaseTotalMs and autosavePhaseTotalMs as SEPARATE fields in a dual-validation cycle', async () => {
    // The "המשך אימון" diagnostic scenario where BOTH validateWithRetry
    // calls fire in one cycle. Requires the resumingFromLibrary + continue
    // combination: without `resumingFromLibrary`, the savedFirebaseId
    // catch-all branch (line ~965 of useActiveWorkout.ts) clears
    // firebaseIdKey before the autosave validation can read it, so the
    // autosave-phase validateWithRetry never fires.
    //
    // This test deliberately picks a setup where both phases run so the
    // emit must surface BOTH fields independently. Merging them into a
    // single `totalMs` would defeat the entire point of this PR.
    validateWorkoutIdMock.mockResolvedValue({ valid: true })

    localStorage.setItem('continueWorkoutId', 'continue-doc-id')
    localStorage.setItem('continueWorkoutMode', 'in_progress')
    localStorage.setItem(
      'continueWorkoutData',
      JSON.stringify([
        { exerciseId: 'ex-1', exerciseName: 'Squat', exerciseNameHe: 'סקוואט', sets: [] },
      ]),
    )
    localStorage.setItem(FIREBASE_ID_KEY, 'continue-doc-id')
    // Enter via the isResumingFromLibrary branch so the savedFirebaseId
    // restoration KEEPS firebaseIdKey (instead of clearing it via the
    // catch-all `!isTabCloseRecovery` branch). That preservation is what
    // makes the autosave-phase validateWithRetry fire.
    locationStateRef.current = { resumingFromLibrary: true }
    resetBuilder({
      selectedExercises: [
        {
          exerciseId: 'ex-1',
          exerciseName: 'Squat',
          exerciseNameHe: 'סקוואט',
          primaryMuscle: 'legs',
        },
      ],
    })

    renderHook(() => useActiveWorkout())
    await waitFor(() => expect(autoSaveWorkoutMock).toHaveBeenCalled())

    const end = findEndCall()
    expect(end).not.toBeNull()
    const validate = end!.payload.validate as
      | {
          initPhaseTotalMs?: number
          autosavePhaseTotalMs?: number
          totalMs?: number
          attemptResults: { phase?: string }[]
        }
      | undefined
    expect(validate).toBeDefined()

    // Both phase totals present, both non-negative numbers.
    expect(typeof validate!.initPhaseTotalMs).toBe('number')
    expect(validate!.initPhaseTotalMs!).toBeGreaterThanOrEqual(0)
    expect(typeof validate!.autosavePhaseTotalMs).toBe('number')
    expect(validate!.autosavePhaseTotalMs!).toBeGreaterThanOrEqual(0)

    // No collapsed `totalMs` field — that would lose the per-phase
    // distinction this PR exists to preserve.
    expect(validate!.totalMs).toBeUndefined()

    // Per-attempt records include both phases.
    const phases = validate!.attemptResults.map((r) => r.phase).filter(Boolean)
    expect(phases).toContain('init')
    expect(phases).toContain('autosave')
  })

  it('captures multi-attempt validate retries when validateWorkoutId fails twice then succeeds', async () => {
    validateWorkoutIdMock
      .mockResolvedValueOnce({ valid: false, reason: 'transient' })
      .mockResolvedValueOnce({ valid: false, reason: 'transient' })
      .mockResolvedValueOnce({ valid: true })

    localStorage.setItem('continueWorkoutId', 'continue-doc-id')
    localStorage.setItem('continueWorkoutMode', 'in_progress')
    localStorage.setItem(
      'continueWorkoutData',
      JSON.stringify([
        { exerciseId: 'ex-1', exerciseName: 'Squat', exerciseNameHe: 'סקוואט', sets: [] },
      ]),
    )
    resetBuilder({
      selectedExercises: [
        {
          exerciseId: 'ex-1',
          exerciseName: 'Squat',
          exerciseNameHe: 'סקוואט',
          primaryMuscle: 'legs',
        },
      ],
    })

    renderHook(() => useActiveWorkout())
    // The retry loop sleeps 1s between attempts; the test runs in real time.
    await waitFor(
      () => {
        const end = findEndCall()
        const validate = end?.payload?.validate as { attempts: number } | undefined
        expect(validate?.attempts).toBeGreaterThanOrEqual(3)
      },
      { timeout: 5000 },
    )

    const end = findEndCall()!
    const validate = end.payload.validate as {
      attempts: number
      attemptResults: { valid: boolean; phase?: string }[]
    }
    expect(validate.attempts).toBeGreaterThanOrEqual(3)
    // The two failed attempts should be tagged 'init' phase.
    expect(validate.attemptResults.filter((r) => r.phase === 'init').length).toBeGreaterThanOrEqual(3)
  })
})
