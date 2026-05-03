/**
 * ConfirmationModal
 * Generic confirmation modal for workout actions
 */

import { AlertTriangle, X } from 'lucide-react'
import type { ConfirmModalState } from '../../types/active-workout.types'
import { workoutLabels } from '@/styles/design-tokens'

interface ConfirmationModalProps {
  modal: ConfirmModalState
  onClose: () => void
  onConfirm: () => void
  /**
   * Optional third action — currently used only by the
   * 'incomplete_exercises_warning' modal to offer "save as in_progress
   * and exit" as a middle ground between cancel and finish. The button
   * is rendered only when this callback is provided AND the modal type
   * is 'incomplete_exercises_warning'.
   */
  onSaveAsInProgress?: () => void
  stats?: {
    completedExercises: number
    totalExercises: number
    completedSets: number
    totalSets: number
    formattedTime: string
  }
}

export function ConfirmationModal({
  modal,
  onClose,
  onConfirm,
  onSaveAsInProgress,
  stats,
}: ConfirmationModalProps) {
  if (!modal.type) return null

  // Get modal content based on type
  const getModalContent = () => {
    switch (modal.type) {
      case 'finish_workout':
        return {
          title: workoutLabels.confirmFinishTitle,
          text: workoutLabels.confirmFinishText,
          confirmText: workoutLabels.finishNow,
          cancelText: workoutLabels.continueWorkout,
          showStats: true,
          isDanger: false,
        }
      case 'exit_workout':
        return {
          title: workoutLabels.confirmExitTitle,
          text: workoutLabels.confirmExitText,
          confirmText: workoutLabels.exitWorkout,
          cancelText: workoutLabels.continueWorkout,
          showStats: false,
          isDanger: false,
        }
      case 'delete_exercise':
        return {
          title: workoutLabels.confirmDeleteTitle,
          text: workoutLabels.confirmDeleteText,
          confirmText: workoutLabels.delete,
          cancelText: workoutLabels.cancel,
          showStats: false,
          isDanger: true,
        }
      case 'finish_exercise_reminder':
        return {
          title: `💪 לסיים את "${modal.exerciseName}"?`,
          text: `דיווחת על ${modal.setsCount} סטים. רוצה לסמן את התרגיל כמושלם?`,
          confirmText: 'כן, סיים תרגיל',
          cancelText: 'לא',
          showStats: false,
          isDanger: false,
        }
      case 'incomplete_exercises_warning': {
        const incomplete = modal.incompleteCount ?? 0
        const total = stats?.totalExercises
        const ratio = total !== undefined ? `${incomplete} מתוך ${total}` : `${incomplete}`
        return {
          title: '⚠️ יש תרגילים שלא הושלמו',
          text: `לא סיימת ${ratio} תרגילים. בחר מה לעשות:`,
          confirmText: 'כן, סיים בכל זאת',
          cancelText: 'ביטול',
          showStats: false,
          isDanger: false,
        }
      }
      default:
        return null
    }
  }

  const content = getModalContent()
  if (!content) return null

  return (
    <div className="confirmation-modal-backdrop" onClick={onClose}>
      <div
        className="confirmation-modal"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        {/* Close button */}
        <button className="confirmation-modal-close" onClick={onClose}>
          <X className="w-5 h-5" />
        </button>

        {/* Icon */}
        <div className="confirmation-modal-icon">
          <AlertTriangle className="w-8 h-8 text-amber-500" />
        </div>

        {/* Title */}
        <h3 className="confirmation-modal-title">{content.title}</h3>

        {/* Text */}
        <p className="confirmation-modal-text">{content.text}</p>

        {/* Stats (for finish workout) */}
        {content.showStats && stats && (
          <div className="confirmation-modal-stats">
            <div className="confirmation-modal-stat">
              <span className="confirmation-modal-stat-value">
                {stats.completedExercises}/{stats.totalExercises}
              </span>
              <span className="confirmation-modal-stat-label">תרגילים</span>
            </div>
            <div className="confirmation-modal-stat">
              <span className="confirmation-modal-stat-value">
                {stats.completedSets}/{stats.totalSets}
              </span>
              <span className="confirmation-modal-stat-label">סטים</span>
            </div>
            <div className="confirmation-modal-stat">
              <span className="confirmation-modal-stat-value">
                {stats.formattedTime}
              </span>
              <span className="confirmation-modal-stat-label">זמן</span>
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="confirmation-modal-buttons">
          <button className="confirmation-modal-btn-cancel" onClick={onClose}>
            {content.cancelText}
          </button>
          {modal.type === 'incomplete_exercises_warning' && onSaveAsInProgress && (
            <button
              className="confirmation-modal-btn-secondary"
              onClick={onSaveAsInProgress}
            >
              השאר בתהליך
            </button>
          )}
          <button
            className={
              content.isDanger
                ? 'confirmation-modal-btn-danger'
                : 'confirmation-modal-btn-confirm'
            }
            onClick={onConfirm}
          >
            {content.confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
