/**
 * ActiveWorkoutScreen
 * Main workout screen showing all exercises grouped by muscle
 */

import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Timer } from 'lucide-react'

import { useActiveWorkout } from '../../hooks/useActiveWorkout'
import { WorkoutHeader } from './WorkoutHeader'
import { ExerciseCounter } from './ExerciseCounter'
import { MuscleGroupSection } from './MuscleGroupSection'
import { ConfirmationModal } from './ConfirmationModal'
import { RestTimer } from './RestTimer'

export default function ActiveWorkoutScreen() {
  const navigate = useNavigate()

  // Rest Timer state
  const [showRestTimer, setShowRestTimer] = useState(false)
  const [restTimerResetKey, setRestTimerResetKey] = useState(0)
  const [restTimerEnabled, setRestTimerEnabled] = useState(false)

  const {
    workout,
    isLoading,
    confirmModal,
    formattedTime,
    exercisesByMuscle,

    // Exercise actions
    toggleExercise,
    addSet,
    updateSet,
    deleteSet,
    finishExercise,

    // Workout actions
    confirmDeleteExercise,
    deleteExercise,
    confirmExit,
    exitWorkout,
    confirmFinish,
    finishWorkout,
    closeModal,
  } = useActiveWorkout()

  // Wrap addSet to show rest timer - MUST be before early returns!
  const handleAddSet = useCallback((exerciseId: string) => {
    addSet(exerciseId)
    // Show rest timer only if enabled
    if (restTimerEnabled) {
      setRestTimerResetKey((prev) => prev + 1)
      setShowRestTimer(true)
    }
  }, [addSet, restTimerEnabled])

  // Close rest timer
  const handleCloseRestTimer = useCallback(() => {
    setShowRestTimer(false)
  }, [])

  // Wrap finishExercise to close timer
  const handleFinishExercise = useCallback((exerciseId: string) => {
    setShowRestTimer(false)
    finishExercise(exerciseId)
  }, [finishExercise])

  // Wrap toggleExercise to close timer when collapsing
  const handleToggleExercise = useCallback((exerciseId: string) => {
    setShowRestTimer(false)
    toggleExercise(exerciseId)
  }, [toggleExercise])

  // Loading state
  if (isLoading) {
    return (
      <div className="active-workout-screen active-workout-screen--loading">
        <div className="spinner" />
      </div>
    )
  }

  // No workout
  if (!workout || workout.exercises.length === 0) {
    return (
      <div className="active-workout-screen active-workout-screen--empty" dir="rtl">
        <div className="active-workout-empty">
          <span className="active-workout-empty-icon">💪</span>
          <h2 className="active-workout-empty-title">אין אימון פעיל</h2>
          <p className="active-workout-empty-text">
            התחל בבחירת תרגילים מהספרייה
          </p>
          <button
            className="active-workout-empty-btn"
            onClick={() => navigate('/exercises')}
          >
            לספריית התרגילים
          </button>
        </div>
      </div>
    )
  }

  // Handle modal confirm action
  const handleModalConfirm = () => {
    switch (confirmModal.type) {
      case 'finish_workout':
        finishWorkout()
        break
      case 'exit_workout':
        exitWorkout()
        break
      case 'delete_exercise':
        if (confirmModal.exerciseId) {
          deleteExercise(confirmModal.exerciseId)
        }
        break
    }
  }

  return (
    <div className="active-workout-screen" dir="rtl">
      {/* Header */}
      <WorkoutHeader formattedTime={formattedTime} onExit={confirmExit} />

      {/* Title & Counter with Rest Timer Toggle */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '0 16px', marginBottom: '8px' }}>
        <ExerciseCounter
          completed={workout.stats.completedExercises}
          total={workout.stats.totalExercises}
        />

        {/* Rest Timer Toggle */}
        <button
          onClick={() => setRestTimerEnabled(!restTimerEnabled)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 12px',
            minHeight: '44px',
            background: restTimerEnabled ? 'rgba(45, 212, 191, 0.15)' : 'transparent',
            border: `1px solid ${restTimerEnabled ? '#2DD4BF' : '#4B5563'}`,
            borderRadius: '8px',
            color: restTimerEnabled ? '#2DD4BF' : '#9CA3AF',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          <Timer size={18} />
          <span>שעון עצר</span>
        </button>
      </div>

      {/* Exercises by muscle group */}
      <div className="active-workout-content" style={{ paddingBottom: '80px' }}>
        {exercisesByMuscle.map((group) => (
          <MuscleGroupSection
            key={group.muscleGroupHe}
            group={group}
            onToggleExercise={handleToggleExercise}
            onAddSet={handleAddSet}
            onUpdateSet={updateSet}
            onDeleteSet={deleteSet}
            onFinishExercise={handleFinishExercise}
            onDeleteExercise={confirmDeleteExercise}
          />
        ))}
      </div>

      {/* Footer - Fixed at bottom with 2 buttons */}
      <footer
        className="fixed bottom-0 left-0 right-0 z-50"
        style={{
          padding: '12px 16px',
          background: '#0B0D12',
          borderTop: '1px solid #1E2430',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        {/* Finish Workout Button - Left side with orange glow */}
        <button
          onClick={confirmFinish}
          style={{
            flex: 1,
            padding: '14px 20px',
            background: 'linear-gradient(180deg, #252B3A 0%, #1E2330 100%)',
            border: '2px solid #FF6B35',
            borderRadius: '16px',
            color: '#FFFFFF',
            fontWeight: 700,
            fontSize: '16px',
            cursor: 'pointer',
            boxShadow: '0 4px 0 #0A0C10, 0 0 12px rgba(255, 107, 53, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          <span>🏁</span>
          <span>סיים אימון</span>
        </button>

        {/* Add Exercise Button - Right side */}
        <button
          onClick={() => navigate('/exercises?addToWorkout=true')}
          style={{
            padding: '14px 20px',
            background: 'linear-gradient(180deg, #252B3A 0%, #1E2330 100%)',
            border: '1px solid #2A3142',
            borderRadius: '16px',
            color: '#FFFFFF',
            fontWeight: 600,
            fontSize: '15px',
            cursor: 'pointer',
            boxShadow: '0 4px 0 #0A0C10',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span>+</span>
          <span>הוספת תרגיל</span>
        </button>
      </footer>

      {/* Confirmation Modal */}
      <ConfirmationModal
        modal={confirmModal}
        onClose={closeModal}
        onConfirm={handleModalConfirm}
        stats={{
          completedExercises: workout.stats.completedExercises,
          totalExercises: workout.stats.totalExercises,
          completedSets: workout.stats.completedSets,
          totalSets: workout.stats.totalSets,
          formattedTime,
        }}
      />

      {/* Rest Timer */}
      <RestTimer
        isVisible={showRestTimer}
        onClose={handleCloseRestTimer}
        resetKey={restTimerResetKey}
      />
    </div>
  )
}
