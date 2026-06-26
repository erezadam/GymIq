/**
 * aiTrainerModalSelector.spec.tsx — guards PR-3: the exercise-source selector UI
 * and the re-interpreted gate.
 *
 * The gate no longer blocks the whole form. It only:
 *  (a) disables the "מתוך שביצעת" option below threshold, and
 *  (b) sets the selector default (below → 'all', at/above → 'performed').
 * The #144 "built from performed" note shows only in 'performed' mode.
 *
 * Tests render the modal, resolve the gate, interact, and assert on the request
 * passed to generateAIWorkouts and on the popup contents (mock + assert, not
 * source-grep).
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

const MESSAGE = /בנינו לך את האימון מהתרגילים שכבר ביצעת/
const PERFORMED_BTN = /מתוך שביצעת/
const ALL_BTN = /מכל התרגילים/

function distinctSet(n: number) {
  return new Set(Array.from({ length: n }, (_, i) => `ex-${i}`))
}

beforeEach(() => {
  vi.clearAllMocks()
  // Generation returns a workout WITH an aiExplanation so the popup opens.
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
        aiExplanation: 'אימון מאוזן.',
      },
    ],
  })
})

describe('AI Trainer source selector + re-interpreted gate (PR-3)', () => {
  it('below threshold: form available, default "all", "performed" disabled, #144 hidden', async () => {
    distinctMock.mockResolvedValue(distinctSet(4)) // < 10

    render(<AITrainerModal isOpen onClose={() => {}} />)

    // Form is available below threshold (the slider renders, not a block screen).
    await screen.findByRole('slider')

    // "מתוך שביצעת" is disabled.
    const performedBtn = screen.getByRole('button', { name: PERFORMED_BTN })
    expect((performedBtn as HTMLButtonElement).disabled).toBe(true)

    // Default is 'all' → generating sends exerciseSource 'all'.
    fireEvent.click(screen.getByRole('button', { name: /צור/ }))
    await waitFor(() => expect(generateMock).toHaveBeenCalled())
    expect(generateMock.mock.calls[0][0].exerciseSource).toBe('all')

    // #144 note is hidden in 'all' mode (popup is open with the explanation).
    await waitFor(() => expect(screen.getByText('אימון מאוזן.')).toBeTruthy())
    expect(screen.queryByText(MESSAGE)).toBeNull()
  })

  it('at/above threshold: default "performed", both enabled, #144 shown', async () => {
    distinctMock.mockResolvedValue(distinctSet(12)) // >= 10

    render(<AITrainerModal isOpen onClose={() => {}} />)
    await screen.findByRole('slider')

    // Both options enabled.
    expect(
      (screen.getByRole('button', { name: PERFORMED_BTN }) as HTMLButtonElement).disabled
    ).toBe(false)

    // Default is 'performed' → generating sends 'performed', popup shows the note.
    fireEvent.click(screen.getByRole('button', { name: /צור/ }))
    await waitFor(() => expect(generateMock).toHaveBeenCalled())
    expect(generateMock.mock.calls[0][0].exerciseSource).toBe('performed')

    await waitFor(() => expect(screen.getByText(MESSAGE)).toBeTruthy())
  })

  it('above threshold: manual switch to "all" is preserved and hides the #144 note', async () => {
    distinctMock.mockResolvedValue(distinctSet(12))

    render(<AITrainerModal isOpen onClose={() => {}} />)
    await screen.findByRole('slider')

    // Manually switch to 'all' (default was 'performed').
    fireEvent.click(screen.getByRole('button', { name: ALL_BTN }))

    // Generate — the manual choice must NOT be overridden back to 'performed'.
    fireEvent.click(screen.getByRole('button', { name: /צור/ }))
    await waitFor(() => expect(generateMock).toHaveBeenCalled())
    expect(generateMock.mock.calls[0][0].exerciseSource).toBe('all')

    // Popup open, but the performed-only note is hidden in 'all' mode.
    await waitFor(() => expect(screen.getByText('אימון מאוזן.')).toBeTruthy())
    expect(screen.queryByText(MESSAGE)).toBeNull()
  })
})
