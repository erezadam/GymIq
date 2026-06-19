/**
 * trainingAnalysisReturnButton.spec.tsx — guards the "חזרה לאימון" button.
 *
 * When a trainee jumps from the active workout to the weekly analysis and then
 * taps "חזרה לאימון", the navigation MUST carry `state.resumingFromLibrary=true`.
 * Without it, useActiveWorkout's init gate hits the !isTabCloseRecovery branch,
 * deletes firebaseIdKey, and the next autosave addDoc's a DUPLICATE in_progress
 * document (the 10/05/2026 firebaseWorkoutId iron-rule incident). The hook side
 * of that contract is covered in firebaseIdRecovery.spec.ts; this test guards the
 * other half — that the button actually passes the flag. It fails at runtime if
 * someone reverts the button to a plain navigate('/workout/session').
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'

const { navigateMock } = vi.hoisted(() => ({ navigateMock: vi.fn() }))

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
  useSearchParams: () => [new URLSearchParams(''), vi.fn()],
}))

vi.mock('@/domains/authentication/hooks/useEffectiveUser', () => ({
  useEffectiveUser: () => ({ uid: 'user-1', email: 't@e.com', displayName: 'T' }),
}))

vi.mock('@/domains/workouts/store', () => ({
  useWorkoutBuilderStore: () => ({ selectedExercises: [], clearWorkout: vi.fn() }),
}))

vi.mock('@/domains/workouts/hooks/useMuscleAnalysis', () => ({
  useMuscleAnalysis: () => ({
    loading: false,
    rows: [],
    summaryRows: [],
    weekRange: { startStr: '14/06/2026', endStr: '18/06/2026' },
    error: null,
  }),
  MIN_SETS: 10,
  MIN_AVG_REPS: 5,
}))

vi.mock('@/domains/workouts/services/analysisService', () => ({
  getCachedAnalysis: vi.fn(async () => null),
  getTrainingAnalysis: vi.fn(async () => ({ result: null, workoutCount: 0, weeksAnalyzed: 0 })),
}))

vi.mock('@/shared/components/LoadingSpinner', () => ({
  LoadingSpinner: () => null,
}))

import TrainingAnalysis from '@/domains/workouts/components/TrainingAnalysis'

const ACTIVE_WORKOUT_KEY = 'gymiq_active_workout_v2'

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
})

describe('TrainingAnalysis — "חזרה לאימון" button', () => {
  it('navigates back to the workout WITH resumingFromLibrary so the firebaseId is preserved', async () => {
    // An active workout is in progress → the return affordance must render.
    localStorage.setItem(ACTIVE_WORKOUT_KEY, JSON.stringify({ id: 'w1', exercises: [] }))

    render(<TrainingAnalysis />)

    const returnBtn = await waitFor(() => screen.getByText('חזרה לאימון'))
    fireEvent.click(returnBtn)

    expect(navigateMock).toHaveBeenCalledWith('/workout/session', {
      state: { resumingFromLibrary: true },
    })
  })

  it('does NOT render the return affordance when there is no active workout', async () => {
    render(<TrainingAnalysis />)
    // Let the muscle view settle.
    await waitFor(() => expect(screen.queryByText('ניתוח ביצוע שבועי')).toBeTruthy())
    expect(screen.queryByText('חזרה לאימון')).toBeNull()
  })
})
