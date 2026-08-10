/**
 * continueWorkoutFlow.spec.tsx — PR-0: behavioral coverage for the
 * "continue workout" flow (WorkoutHistory → useActiveWorkout → Firestore layer).
 *
 * These tests run the REAL production code end-to-end inside jsdom:
 *   Stage 1: render the real <WorkoutHistory/>, click continue on a workout
 *            card, confirm the dialog — the real handleConfirmContinue runs
 *            and seeds localStorage + the builder store.
 *   Stage 2: mount the real useActiveWorkout hook (the active-workout engine)
 *            and observe which Firestore operation it requests via the mocked
 *            data layer: autoSaveWorkout(null, …) → addDoc (NEW document),
 *            autoSaveWorkout('<id>', …) → updateDoc (EXISTING document).
 *
 * Only the data layer (lib/firebase/*) and app-shell hooks are mocked — no
 * network, no real Firestore. No source-grep: every assertion is on runtime
 * call args / localStorage side effects.
 *
 * Test 6 (survivor-id scenario) intentionally records the OBSERVED behavior
 * without asserting a desired outcome — see its comment block.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, renderHook, screen, fireEvent, waitFor } from '@testing-library/react'

// ----- Capture mocks (hoisted so they exist before vi.mock factories) -----

const {
  getUserWorkoutHistoryMock,
  getWorkoutByIdMock,
  updateWorkoutHistoryMock,
  autoSaveWorkoutMock,
  getInProgressWorkoutMock,
  validateWorkoutIdMock,
  navigateMock,
  locationStateRef,
  builderState,
} = vi.hoisted(() => {
  type BuilderExercise = {
    exerciseId: string
    exerciseName: string
    exerciseNameHe: string
    primaryMuscle: string
    category?: string
    equipment?: string
  }
  const builderState = {
    selectedExercises: [] as BuilderExercise[],
    // Real-ish store behavior: addExercise appends, clearWorkout empties.
    // This is what makes stage 1 → stage 2 a genuine end-to-end handoff.
    addExercise: undefined as unknown as ReturnType<typeof vi.fn>,
    clearWorkout: undefined as unknown as ReturnType<typeof vi.fn>,
    removeExercise: undefined as unknown as ReturnType<typeof vi.fn>,
    setPlannedWorkoutDocId: undefined as unknown as ReturnType<typeof vi.fn>,
    programId: null as string | null,
    programDayLabel: null as string | null,
    programSource: null as string | null,
    workoutName: null as string | null,
    targetUserId: null as string | null,
    plannedWorkoutDocId: null as string | null,
    reportedBy: null as string | null,
    reportedByName: null as string | null,
  }
  return {
    getUserWorkoutHistoryMock: vi.fn(),
    getWorkoutByIdMock: vi.fn(),
    updateWorkoutHistoryMock: vi.fn(),
    autoSaveWorkoutMock: vi.fn(),
    getInProgressWorkoutMock: vi.fn(),
    validateWorkoutIdMock: vi.fn(),
    navigateMock: vi.fn(),
    locationStateRef: { current: null as unknown },
    builderState,
  }
})

// ----- Module mocks (data layer + app shell; production logic stays real) -----

vi.mock('@/lib/firebase/workoutHistory', () => ({
  // Used by WorkoutHistory (stage 1)
  getUserWorkoutHistory: getUserWorkoutHistoryMock,
  getWorkoutById: getWorkoutByIdMock,
  updateWorkoutHistory: updateWorkoutHistoryMock,
  softDeleteWorkout: vi.fn(),
  // Used by useActiveWorkout (stage 2)
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

vi.mock('@/lib/firebase/bandTypes', () => ({
  getActiveBandTypes: vi.fn(async () => []),
}))

vi.mock('@/domains/exercises/services', () => ({
  exerciseService: { getExerciseById: vi.fn(async () => null) },
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

vi.mock('@/domains/workouts/store', () => {
  const useWorkoutBuilderStore = (() => builderState) as unknown as {
    (): typeof builderState
    getState: () => typeof builderState
  }
  useWorkoutBuilderStore.getState = () => builderState
  return { useWorkoutBuilderStore }
})

vi.mock('@/domains/trainer/hooks/useTraineeProgram', () => ({
  useTraineeProgram: () => ({
    program: null,
    standaloneWorkouts: [],
    isLoading: false,
    refreshProgram: vi.fn(),
  }),
}))

// Card components are presentation-only here; replace with minimal triggers so
// the test drives the REAL WorkoutHistory handlers (the code under test).
vi.mock('@/shared/components/WorkoutCard', () => ({
  WorkoutCard: ({ workout, onContinueClick }: {
    workout: { id: string }
    onContinueClick: () => void
  }) => (
    <button data-testid={`continue-${workout.id}`} onClick={onContinueClick}>
      continue
    </button>
  ),
}))

vi.mock('@/domains/workouts/components/ai-trainer/AIBundleCard', () => ({
  AIBundleCard: () => null,
}))

vi.mock('@/domains/trainer/components/ProgramView/TrainerProgramCard', () => ({
  TrainerProgramCard: () => null,
}))

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
  useLocation: () => ({
    state: locationStateRef.current,
    pathname: '/workout/session',
    search: '',
    hash: '',
    key: 'test',
  }),
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
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

import WorkoutHistory from '@/domains/workouts/components/WorkoutHistory'
import { useActiveWorkout } from '@/domains/workouts/hooks/useActiveWorkout'
import type { WorkoutCompletionStatus } from '@/domains/workouts/types'

const ORIGINAL_DOC_ID = 'original-doc-123'
const FIREBASE_ID_KEY = 'gymiq_firebase_workout_id'

// ----- Fixtures -----

function makeSummary(status: WorkoutCompletionStatus) {
  return {
    id: ORIGINAL_DOC_ID,
    name: 'אימון מקור',
    date: new Date(),
    duration: 30,
    status,
    completedExercises: 1,
    totalExercises: 1,
    totalVolume: 200,
    personalRecords: 0,
  }
}

// Full entry WITH a reported set (actualReps/actualWeight > 0) so the
// in_progress/cancelled/partial branch is taken (not the empty-workout dialog).
function makeEntry(status: WorkoutCompletionStatus) {
  return {
    id: ORIGINAL_DOC_ID,
    userId: 'user-1',
    name: 'אימון מקור',
    date: new Date(),
    startTime: new Date(),
    endTime: new Date(),
    duration: 30,
    status,
    exercises: [
      {
        exerciseId: 'ex-1',
        exerciseName: 'Bench Press',
        exerciseNameHe: 'לחיצת חזה',
        imageUrl: '',
        isCompleted: false,
        sets: [
          {
            type: 'normal',
            targetReps: 10,
            targetWeight: 20,
            actualReps: 10,
            actualWeight: 20,
            completed: true,
          },
        ],
      },
    ],
    completedExercises: 1,
    totalExercises: 1,
    completedSets: 1,
    totalSets: 1,
    totalVolume: 200,
    personalRecords: 0,
  }
}

// ----- Stage-1 driver: run the real continue flow through the UI -----

async function driveContinueThroughUI(status: WorkoutCompletionStatus) {
  getUserWorkoutHistoryMock.mockResolvedValue([makeSummary(status)])
  getWorkoutByIdMock.mockResolvedValue(makeEntry(status))

  const view = render(<WorkoutHistory />)

  // Card renders once history loads; click opens the real continue dialog.
  const continueBtn = await screen.findByTestId(`continue-${ORIGINAL_DOC_ID}`)
  fireEvent.click(continueBtn)

  // Confirm — this runs the real handleConfirmContinue with all its branches.
  const confirmBtn = await screen.findByText('אישור')
  fireEvent.click(confirmBtn)

  // The flow ends with navigation to the active workout screen.
  await waitFor(() => {
    expect(navigateMock).toHaveBeenCalledWith('/workout/session')
  })

  // Unmount before stage 2 mounts the engine hook (mirrors real navigation).
  view.unmount()
}

// ----- Stage-2 driver: mount the real engine and wait for its initial save -----

async function mountEngineAndWaitForSave() {
  renderHook(() => useActiveWorkout())
  await waitFor(() => {
    expect(autoSaveWorkoutMock).toHaveBeenCalled()
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  builderState.selectedExercises = []
  builderState.addExercise = vi.fn((ex: { exerciseId: string; exerciseName: string; exerciseNameHe: string; primaryMuscle: string }) => {
    builderState.selectedExercises.push(ex)
  })
  builderState.clearWorkout = vi.fn(() => {
    builderState.selectedExercises = []
  })
  builderState.removeExercise = vi.fn()
  builderState.setPlannedWorkoutDocId = vi.fn((id: string) => {
    builderState.plannedWorkoutDocId = id
  })
  builderState.programId = null
  builderState.programDayLabel = null
  builderState.programSource = null
  builderState.workoutName = null
  builderState.targetUserId = null
  builderState.plannedWorkoutDocId = null
  builderState.reportedBy = null
  builderState.reportedByName = null
  locationStateRef.current = null
  validateWorkoutIdMock.mockResolvedValue({ valid: true })
  getInProgressWorkoutMock.mockResolvedValue(null)
  autoSaveWorkoutMock.mockResolvedValue('newly-created-doc-id')
  updateWorkoutHistoryMock.mockResolvedValue(undefined)
})

describe('continue-workout flow — which Firestore doc does the save target (behavioral)', () => {
  it('1. continuing a COMPLETED workout with clean localStorage creates a NEW doc and never writes to the original', async () => {
    await driveContinueThroughUI('completed')

    // The completed branch must not seed any continuation keys.
    expect(localStorage.getItem('continueWorkoutId')).toBeNull()
    expect(localStorage.getItem('continueWorkoutData')).toBeNull()
    expect(localStorage.getItem('continueWorkoutMode')).toBeNull()
    // …and must not touch the original document from the history screen.
    expect(updateWorkoutHistoryMock).not.toHaveBeenCalled()

    await mountEngineAndWaitForSave()

    // Save target: null → addDoc → NEW document.
    expect(autoSaveWorkoutMock).toHaveBeenCalledWith(null, expect.any(Object))
    // The original doc is never a write target in any call.
    const targets = autoSaveWorkoutMock.mock.calls.map((c) => c[0])
    expect(targets).not.toContain(ORIGINAL_DOC_ID)
  })

  it('2. continuing an IN_PROGRESS workout updates the ORIGINAL doc id and does not create a new doc', async () => {
    await driveContinueThroughUI('in_progress')

    // The continuation branch seeds the original id for the engine.
    expect(localStorage.getItem('continueWorkoutId')).toBe(ORIGINAL_DOC_ID)
    expect(localStorage.getItem('continueWorkoutMode')).toBe('in_progress')

    await mountEngineAndWaitForSave()

    // Save target: the original doc id → updateDoc → EXISTING document.
    expect(autoSaveWorkoutMock).toHaveBeenCalledWith(ORIGINAL_DOC_ID, expect.any(Object))
    // No call may target null (that would addDoc a duplicate).
    const targets = autoSaveWorkoutMock.mock.calls.map((c) => c[0])
    expect(targets).not.toContain(null)
  })

  it('3. continuing a CANCELLED ("ללא דיווח") workout updates the ORIGINAL doc id and does not create a new doc', async () => {
    await driveContinueThroughUI('cancelled')

    expect(localStorage.getItem('continueWorkoutId')).toBe(ORIGINAL_DOC_ID)
    expect(localStorage.getItem('continueWorkoutMode')).toBe('in_progress')

    await mountEngineAndWaitForSave()

    expect(autoSaveWorkoutMock).toHaveBeenCalledWith(ORIGINAL_DOC_ID, expect.any(Object))
    const targets = autoSaveWorkoutMock.mock.calls.map((c) => c[0])
    expect(targets).not.toContain(null)
  })

  it('4. continuing a PARTIAL workout updates the ORIGINAL doc id and does not create a new doc', async () => {
    await driveContinueThroughUI('partial')

    expect(localStorage.getItem('continueWorkoutId')).toBe(ORIGINAL_DOC_ID)
    expect(localStorage.getItem('continueWorkoutMode')).toBe('in_progress')

    await mountEngineAndWaitForSave()

    expect(autoSaveWorkoutMock).toHaveBeenCalledWith(ORIGINAL_DOC_ID, expect.any(Object))
    const targets = autoSaveWorkoutMock.mock.calls.map((c) => c[0])
    expect(targets).not.toContain(null)
  })

  it('5. starting a PLANNED workout flips the ORIGINAL doc to in_progress BEFORE navigation (documents existing behavior)', async () => {
    // NOTE: this documents current behavior — the planned doc is mutated to
    // in_progress before a single set is reported. Do not "fix" here.
    await driveContinueThroughUI('planned')

    expect(updateWorkoutHistoryMock).toHaveBeenCalledWith(
      ORIGINAL_DOC_ID,
      expect.objectContaining({ status: 'in_progress' }),
    )

    // Order proof: the status write happened before the navigation call.
    const updateOrder = updateWorkoutHistoryMock.mock.invocationCallOrder[0]
    const navOrder = navigateMock.mock.invocationCallOrder[0]
    expect(updateOrder).toBeLessThan(navOrder)

    // And the continuation id is seeded so the engine keeps updating that doc.
    expect(localStorage.getItem('continueWorkoutId')).toBe(ORIGINAL_DOC_ID)
    expect(localStorage.getItem('continueWorkoutMode')).toBe('planned')

    await mountEngineAndWaitForSave()
    expect(autoSaveWorkoutMock).toHaveBeenCalledWith(ORIGINAL_DOC_ID, expect.any(Object))
  })

  it('6. continuing a COMPLETED workout DISCARDS a stale firebaseId from a previous session: the save creates a NEW doc, never targets the survivor id, and the local key ends up holding the new id', async () => {
    // Locked-in guarantee (architect decision, PR-0): the prototype-workout
    // feature's core assumption is that continuing a completed workout ALWAYS
    // writes to a fresh document. The guard lives in the init gate at
    // useActiveWorkout.ts:973-976 (discard stale firebaseIdKey when not a
    // tab-close recovery). If anyone changes that branch, this test is the
    // only alarm — it must fail loudly, not observe silently.
    localStorage.setItem(FIREBASE_ID_KEY, 'stale-id-from-previous-session')

    await driveContinueThroughUI('completed')
    await mountEngineAndWaitForSave()

    const observedTargets = autoSaveWorkoutMock.mock.calls.map((c) => c[0])

    // (a) The survivor id is never a write target — in ANY save call.
    expect(observedTargets).not.toContain('stale-id-from-previous-session')

    // (b) The first autosave runs with a null id → addDoc → NEW document.
    expect(observedTargets[0]).toBeNull()

    // (c) The local firebaseId key now holds the NEW doc id, not the survivor.
    //     (The autoSaveWorkout mock resolves 'newly-created-doc-id'.)
    expect(localStorage.getItem(FIREBASE_ID_KEY)).toBe('newly-created-doc-id')
  })
})
