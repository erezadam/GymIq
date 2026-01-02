/**
 * ExerciseNavigationHeader Component
 * Header with exercise navigation arrows and menu
 */

import { useState } from 'react'
import { ChevronLeft, ChevronRight, MoreVertical, X, SkipForward, MessageSquare, RefreshCw } from 'lucide-react'

interface ExerciseNavigationHeaderProps {
  currentIndex: number
  totalExercises: number
  onPrevious: () => void
  onNext: () => void
  onSkipExercise?: () => void
  onAddNote?: () => void
  onReplaceExercise?: () => void
  onClose: () => void
}

export function ExerciseNavigationHeader({
  currentIndex,
  totalExercises,
  onPrevious,
  onNext,
  onSkipExercise,
  onAddNote,
  onReplaceExercise,
  onClose,
}: ExerciseNavigationHeaderProps) {
  const [showMenu, setShowMenu] = useState(false)

  const canGoBack = currentIndex > 0
  const canGoForward = currentIndex < totalExercises - 1

  return (
    <header className="exercise-nav-header">
      {/* Close Button */}
      <button
        onClick={onClose}
        className="exercise-nav-btn"
        aria-label="סגור אימון"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Navigation */}
      <div className="exercise-nav-center">
        {/* Next (RTL - left arrow goes next) */}
        <button
          onClick={onNext}
          disabled={!canGoForward}
          className="exercise-nav-arrow"
          aria-label="תרגיל הבא"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        {/* Counter */}
        <span className="exercise-nav-counter">
          תרגיל {currentIndex + 1}/{totalExercises}
        </span>

        {/* Previous (RTL - right arrow goes back) */}
        <button
          onClick={onPrevious}
          disabled={!canGoBack}
          className="exercise-nav-arrow"
          aria-label="תרגיל קודם"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      {/* Menu Button */}
      <div className="relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="exercise-nav-btn"
          aria-label="אפשרויות נוספות"
        >
          <MoreVertical className="w-6 h-6" />
        </button>

        {/* Dropdown Menu */}
        {showMenu && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowMenu(false)}
            />
            <div className="exercise-nav-menu">
              {onReplaceExercise && (
                <button
                  onClick={() => {
                    setShowMenu(false)
                    onReplaceExercise()
                  }}
                  className="exercise-nav-menu-item"
                >
                  <RefreshCw className="w-4 h-4" />
                  החלף תרגיל
                </button>
              )}
              {onSkipExercise && (
                <button
                  onClick={() => {
                    setShowMenu(false)
                    onSkipExercise()
                  }}
                  className="exercise-nav-menu-item"
                >
                  <SkipForward className="w-4 h-4" />
                  דלג על תרגיל
                </button>
              )}
              {onAddNote && (
                <button
                  onClick={() => {
                    setShowMenu(false)
                    onAddNote()
                  }}
                  className="exercise-nav-menu-item"
                >
                  <MessageSquare className="w-4 h-4" />
                  הוסף הערה
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </header>
  )
}

export default ExerciseNavigationHeader
