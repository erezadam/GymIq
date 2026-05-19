/**
 * firebaseIdRecovery.spec.ts — Behavior tests for the firebaseId reuse fix.
 *
 * Bug: when a user exited a workout via "השאר בתהליך" (save as in_progress)
 * and then started a NEW workout from the WorkoutBuilder, the stale
 * firebaseId in localStorage was restored. The new workout's autosave then
 * wrote to the OLD doc — overwriting the previously-exited workout's content.
 *
 * Fix:
 *   1. exitWorkout removes firebaseIdKey from localStorage on success.
 *   2. The init flow's localStorage firebaseId restore is gated on
 *      `isTabCloseRecovery` (selectedExercises empty AND not continuing from
 *      history). Builder-started workouts always start fresh.
 *   3. Tab-close recovery still works via the Firestore query path
 *      (getInProgressWorkout) — that path is the authoritative source.
 *
 * These tests assert on the observable side effects (localStorage state +
 * mock call args), not on source patterns. They fail at runtime if the bug
 * is reintroduced.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'

// ----- Capture mocks (hoisted so they're defined before vi.mock factories) -----

const {
  getInProgressWorkoutMock,
  autoSaveWorkoutMock,
  validateWorkoutIdMock,
  navigateMock,
  locationStateRef,
} = vi.hoisted(() => ({
  getInProgressWorkoutMock: vi.fn(),
  autoSaveWorkoutMock: vi.fn(),
  validateWorkoutIdMock: vi.fn(),
  navigateMock: vi.fn(),
  // Mutable per-test state for the useLocation mock — set in a test before
  // renderHook() to simulate navigation with router state (e.g. the
  // resumingFromLibrary flag carried from ExerciseLibrary).
  locationStateRef: { current: null as unknown },
}))

// ----- Module mocks (must run before importing the hook) -----

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

vi.mock('@/utils/workoutValidation', () => ({
  validateWorkoutId: validateWorkoutIdMock,
  isNetworkError: vi.fn(() => false),
}))

const mockUser = { uid: 'user-1', email: 't@e.com', displayName: 'T' }
vi.mock('@/domains/authentication/hooks/useEffectiveUser', () => ({
  useEffectiveUser: () => mockUser,
  useIsImpersonating: () => false,
}))

// Builder store state — mutable per test (hoisted for use in vi.mock factory).
type BuilderState = {
  selectedExercises: Array<{ exerciseId: string; exerciseName: string; exerciseNameHe: string; primaryMuscle: string }>
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
  // Mimic Zustand's hook API: both callable as a hook AND has .getState().
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

// Stub design-tokens (imported for muscle group names map).
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

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  resetBuilder()
  locationStateRef.current = null
  validateWorkoutIdMock.mockResolvedValue({ valid: true })
  getInProgressWorkoutMock.mockResolvedValue(null)
  autoSaveWorkoutMock.mockResolvedValue('new-doc-id')
})

describe('useActiveWorkout — firebaseId recovery (regression: localStorage reuse bug)', () => {
  it('starting workout from builder DISCARDS stale localStorage firebaseId', async () => {
    // The bug: a previously-exited workout left its firebaseId in localStorage.
    // Without the fix, init restores it and autosave overwrites the old doc.
    localStorage.setItem(FIREBASE_ID_KEY, 'stale-id-from-previous-workout')
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

    await waitFor(() => {
      // After init, the stale firebaseId must be removed because the user
      // started a fresh workout from the builder (not a tab-close recovery).
      expect(localStorage.getItem(FIREBASE_ID_KEY)).toBeNull()
    })

    // The Firestore-query recovery path must NOT fire when the user is
    // starting from the builder (selectedExercises is non-empty).
    expect(getInProgressWorkoutMock).not.toHaveBeenCalled()
  })

  it('tab-close recovery (empty selectedExercises) STILL uses Firestore query path', async () => {
    // The legitimate case: user closes tab/app mid-workout, returns to
    // /workout/session directly. We must still recover via getInProgressWorkout.
    resetBuilder({ selectedExercises: [] })
    getInProgressWorkoutMock.mockResolvedValue({
      id: 'recovered-workout-id',
      userId: 'user-1',
      name: 'Recovered',
      date: new Date(),
      startTime: new Date(),
      endTime: new Date(),
      duration: 0,
      status: 'in_progress',
      completedExercises: 0,
      totalExercises: 1,
      completedSets: 0,
      totalSets: 0,
      totalVolume: 0,
      personalRecords: 0,
      exercises: [
        {
          exerciseId: 'ex-1',
          exerciseName: 'Bench Press',
          exerciseNameHe: 'לחיצת חזה',
          imageUrl: '',
          isCompleted: false,
          notes: '',
          sets: [],
        },
      ],
    })

    renderHook(() => useActiveWorkout())

    await waitFor(() => {
      expect(getInProgressWorkoutMock).toHaveBeenCalledWith('user-1')
    })
  })

  it('exitWorkout REMOVES firebaseIdKey from localStorage on success', async () => {
    // Render the hook with no builder context so init does not auto-clear
    // the localStorage; we then simulate an active autosave by writing the
    // firebaseId manually before calling exitWorkout.
    resetBuilder({ selectedExercises: [] })

    const { result } = renderHook(() => useActiveWorkout())

    // Wait for init to settle (Firestore recovery returns null in our mock).
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Simulate the autosaved firebaseId persisting through an active workout.
    localStorage.setItem(FIREBASE_ID_KEY, 'active-workout-id-789')
    localStorage.setItem(ACTIVE_WORKOUT_KEY, JSON.stringify({ placeholder: true }))

    await act(async () => {
      await result.current.exitWorkout()
    })

    // The fix: exitWorkout must remove the firebaseId from localStorage so
    // the next builder-started workout does not inherit it.
    expect(localStorage.getItem(FIREBASE_ID_KEY)).toBeNull()
  })

  it('returning from ExerciseLibrary mid-session PRESERVES firebaseIdKey (resumingFromLibrary)', async () => {
    // The bug this guards against: navigating ActiveWorkoutScreen → ExerciseLibrary
    // → back unmounts the hook, then on remount initWorkout sees selectedExercises
    // non-empty and (per the PR #123 gate) would discard the localStorage firebaseId
    // — causing the next autosave to addDoc and create a duplicate in_progress.
    // The fix: ExerciseLibrary navigates with state.resumingFromLibrary=true, and
    // the gate now skips the removal in that case so updateDoc continues on the
    // existing doc.
    locationStateRef.current = { resumingFromLibrary: true }
    localStorage.setItem(FIREBASE_ID_KEY, 'active-session-id-456')
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

    // Wait for init's immediate-save path to invoke autoSaveWorkout.
    await waitFor(() => {
      expect(autoSaveWorkoutMock).toHaveBeenCalled()
    })

    // The PROOF that no duplicate was created: autoSaveWorkout must be called
    // with the existing workoutId as its first arg (which routes to updateDoc
    // in workoutHistory.ts:1440), not with null (which routes to addDoc and
    // creates a duplicate). The mock's return value overwrites localStorage
    // unconditionally at line 1134, so checking localStorage is unreliable —
    // checking the call args is what proves the duplicate-doc bug is closed.
    expect(autoSaveWorkoutMock).toHaveBeenCalledWith(
      'active-session-id-456',
      expect.any(Object),
    )

    // The history-state cleanup useEffect must replace the entry without the
    // flag, so a subsequent back-button hit doesn't replay it.
    expect(navigateMock).toHaveBeenCalledWith(
      '/workout/session',
      expect.objectContaining({ replace: true, state: {} }),
    )
  })
})
