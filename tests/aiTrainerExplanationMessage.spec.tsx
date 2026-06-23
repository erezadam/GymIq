/**
 * aiTrainerExplanationMessage.spec.tsx — guards the PR3 "built from your
 * performed exercises" note inside the AI Trainer explanation popup.
 *
 * After a successful generation the popup explains, in plain language, that the
 * plan was built from exercises the trainee already performed. When the
 * distinct-count from open (PR1 state) is available, the copy includes it
 * ("מתוך N תרגילים שביצעת עד כה"). This test drives the modal: open → gate
 * resolves (≥ threshold) → click generate → popup → assert the note renders.
 *
 * Fails at runtime if the note is removed or the count plumbing regresses.
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
  // Gate passes: 12 distinct performed exercises (≥ threshold of 10).
  distinctMock.mockResolvedValue(
    new Set(Array.from({ length: 12 }, (_, i) => `ex-${i}`))
  )
  // Generation returns a workout WITH an aiExplanation so the popup opens.
  generateMock.mockResolvedValue({
    success: true,
    usedFallback: false,
    workouts: [
      {
        name: 'מאמן #1',
        exercises: [],
        estimatedDuration: 60,
        muscleGroups: ['חזה'],
        source: 'ai_trainer',
        aiWorkoutNumber: 1,
        aiExplanation: 'אימון מאוזן לפלג גוף עליון.',
      },
    ],
  })
})

describe('AI Trainer explanation popup — performed-exercises note (PR3)', () => {
  it('renders the note (with the distinct count) after a successful generation', async () => {
    render(<AITrainerModal isOpen onClose={() => {}} />)

    // Gate resolves → the config form (with the generate button) appears.
    const generateBtn = await screen.findByRole('button', { name: /צור/ })

    fireEvent.click(generateBtn)

    // Popup opens with the performed-exercises note.
    await waitFor(() =>
      expect(
        screen.getByText(/בנינו לך את האימון מהתרגילים שכבר ביצעת/)
      ).toBeTruthy()
    )

    // The count from open (12) is woven into the copy.
    expect(screen.getByText(/מתוך 12 תרגילים שביצעת עד כה/)).toBeTruthy()
  })
})
