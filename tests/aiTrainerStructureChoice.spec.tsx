/**
 * aiTrainerStructureChoice.spec.tsx — guards the fix that lets the trainee pick
 * the workout structure (full body vs by-regions/split) for EVERY workout count.
 *
 * Before the fix, numWorkouts <= 2 forced 'full_body': the structure chooser was
 * replaced by a fixed "Full Body" info box, and effectiveStructure overrode any
 * choice. These tests drive the modal at low counts and assert the chooser is
 * present and the picked structure actually flows into the generation request.
 *
 * They fail at runtime if the low-count forcing regresses.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'

const { navigateMock, generateMock, distinctMock } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  generateMock: vi.fn(),
  distinctMock: vi.fn(),
}))

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
}))

vi.mock('@/domains/authentication/hooks/useEffectiveUser', () => ({
  useEffectiveUser: () => ({ uid: 'user-1', email: 't@e.com', displayName: 'T' }),
}))

vi.mock('@/domains/workouts/services/aiTrainerService', () => ({
  generateAIWorkouts: generateMock,
}))

vi.mock('@/lib/firebase/workoutHistory', () => ({
  getDistinctPerformedExerciseIds: distinctMock,
}))

import AITrainerModal from '@/domains/workouts/components/ai-trainer/AITrainerModal'

beforeEach(() => {
  vi.clearAllMocks()
  // Gate passes (≥ threshold) so the config form renders.
  distinctMock.mockResolvedValue(
    new Set(Array.from({ length: 12 }, (_, i) => `ex-${i}`))
  )
  generateMock.mockResolvedValue({
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
  })
})

describe('AI Trainer — structure choice available at every workout count', () => {
  it('numWorkouts=2: the structure chooser is shown and "split" flows into the request', async () => {
    render(<AITrainerModal isOpen onClose={() => {}} />)

    // Wait for the gate to resolve and the form to appear.
    const slider = await screen.findByRole('slider')

    // Drop to 2 workouts — previously this hid the chooser behind a fixed box.
    fireEvent.change(slider, { target: { value: '2' } })

    // The chooser (both options) must be present at 2 workouts.
    const splitBtn = screen.getByRole('button', { name: /לפי אזורים/ })
    expect(screen.getByRole('button', { name: /כל הגוף/ })).toBeTruthy()

    // Pick "by regions" and generate.
    fireEvent.click(splitBtn)
    fireEvent.click(screen.getByRole('button', { name: /צור/ }))

    await waitFor(() => expect(generateMock).toHaveBeenCalled())
    const request = generateMock.mock.calls[0][0]
    expect(request.numWorkouts).toBe(2)
    expect(request.workoutStructure).toBe('split')
  })

  it('numWorkouts=1 + split: the upper/lower start picker becomes available', async () => {
    render(<AITrainerModal isOpen onClose={() => {}} />)

    const slider = await screen.findByRole('slider')
    fireEvent.change(slider, { target: { value: '1' } })

    // Structure chooser present at a single workout too.
    fireEvent.click(screen.getByRole('button', { name: /לפי אזורים/ }))

    // With an odd split count, the start-side choice is meaningful and shown,
    // so "by regions" is actually selectable (not silently locked to 'upper').
    expect(screen.getByRole('button', { name: /פלג גוף עליון/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /פלג גוף תחתון/ })).toBeTruthy()
  })
})
