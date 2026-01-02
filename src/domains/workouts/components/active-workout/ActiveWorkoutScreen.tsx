/**
 * ActiveWorkoutScreen
 * Main workout screen showing all exercises grouped by muscle
 */

import { useNavigate } from 'react-router-dom'
import { Trophy } from 'lucide-react'

import { useActiveWorkout } from '../../hooks/useActiveWorkout'
import { WorkoutHeader } from './WorkoutHeader'
import { ExerciseCounter } from './ExerciseCounter'
import { MuscleGroupSection } from './MuscleGroupSection'
import { ConfirmationModal } from './ConfirmationModal'
import { workoutLabels } from '@/styles/design-tokens'

export default function ActiveWorkoutScreen() {
  const navigate = useNavigate()

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

      {/* Title & Counter */}
      <ExerciseCounter
        completed={workout.stats.completedExercises}
        total={workout.stats.totalExercises}
      />

      {/* Exercises by muscle group */}
      <div className="active-workout-content">
        {exercisesByMuscle.map((group) => (
          <MuscleGroupSection
            key={group.muscleGroupHe}
            group={group}
            onToggleExercise={toggleExercise}
            onAddSet={addSet}
            onUpdateSet={updateSet}
            onDeleteSet={deleteSet}
            onFinishExercise={finishExercise}
            onDeleteExercise={confirmDeleteExercise}
          />
        ))}
      </div>

      {/* Finish Workout Button (fixed at bottom) */}
      <div className="finish-workout-container">
        <button className="finish-workout-btn" onClick={confirmFinish}>
          <Trophy className="w-5 h-5" />
          <span>{workoutLabels.finishWorkout}</span>
        </button>
      </div>

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
    </div>
  )
}
