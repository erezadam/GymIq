/**
 * confirmationModal.spec.tsx — Behavior tests for the third button on
 * the incomplete-exercises warning modal.
 *
 * The third button ("השאר בתהליך") must be visible only when both:
 *   1. modal.type === 'incomplete_exercises_warning', and
 *   2. an onSaveAsInProgress callback is provided.
 *
 * Other modal types (finish_workout, exit_workout, delete_exercise,
 * finish_exercise_reminder) must not render the third button even if
 * the callback is passed — the callback presence alone is not enough.
 *
 * These are runtime-behavior tests: each one renders the actual
 * component and asserts on the DOM / handler invocations. If a future
 * change drops the conditional or wires the wrong handler, every
 * affected test will fail at runtime.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ConfirmationModal } from '@/domains/workouts/components/active-workout/ConfirmationModal'
import type { ConfirmModalState } from '@/domains/workouts/types/active-workout.types'

const incompleteWarning: ConfirmModalState = {
  type: 'incomplete_exercises_warning',
  incompleteCount: 2,
}

const finishWorkout: ConfirmModalState = { type: 'finish_workout' }

const stats = {
  completedExercises: 5,
  totalExercises: 7,
  completedSets: 12,
  totalSets: 18,
  formattedTime: '32:15',
}

describe('ConfirmationModal — "השאר בתהליך" third button', () => {
  it('renders the third button when modal type is incomplete_exercises_warning AND onSaveAsInProgress is provided', () => {
    render(
      <ConfirmationModal
        modal={incompleteWarning}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        onSaveAsInProgress={vi.fn()}
        stats={stats}
      />
    )

    expect(screen.getByRole('button', { name: 'השאר בתהליך' })).toBeInTheDocument()
  })

  it('does NOT render the third button when modal type is incomplete_exercises_warning but onSaveAsInProgress is omitted', () => {
    render(
      <ConfirmationModal
        modal={incompleteWarning}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        stats={stats}
      />
    )

    expect(screen.queryByRole('button', { name: 'השאר בתהליך' })).not.toBeInTheDocument()
  })

  it('does NOT render the third button on a different modal type even if onSaveAsInProgress is provided', () => {
    // finish_workout has no incomplete exercises — the third button
    // makes no sense there even though the callback is passed.
    render(
      <ConfirmationModal
        modal={finishWorkout}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        onSaveAsInProgress={vi.fn()}
        stats={stats}
      />
    )

    expect(screen.queryByRole('button', { name: 'השאר בתהליך' })).not.toBeInTheDocument()
  })

  it('invokes onSaveAsInProgress (and only that handler) when the third button is clicked', () => {
    const onClose = vi.fn()
    const onConfirm = vi.fn()
    const onSaveAsInProgress = vi.fn()

    render(
      <ConfirmationModal
        modal={incompleteWarning}
        onClose={onClose}
        onConfirm={onConfirm}
        onSaveAsInProgress={onSaveAsInProgress}
        stats={stats}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'השאר בתהליך' }))

    expect(onSaveAsInProgress).toHaveBeenCalledTimes(1)
    expect(onClose).not.toHaveBeenCalled()
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('invokes onClose (and only that handler) when "ביטול" is clicked, even with the third button present', () => {
    const onClose = vi.fn()
    const onConfirm = vi.fn()
    const onSaveAsInProgress = vi.fn()

    render(
      <ConfirmationModal
        modal={incompleteWarning}
        onClose={onClose}
        onConfirm={onConfirm}
        onSaveAsInProgress={onSaveAsInProgress}
        stats={stats}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'ביטול' }))

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onSaveAsInProgress).not.toHaveBeenCalled()
    expect(onConfirm).not.toHaveBeenCalled()
  })
})
