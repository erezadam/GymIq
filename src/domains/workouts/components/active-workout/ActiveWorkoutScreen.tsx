/**
 * ActiveWorkoutScreen
 * Main workout screen showing all exercises grouped by muscle
 */

import { useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Timer } from 'lucide-react'

import { useActiveWorkout } from '../../hooks/useActiveWorkout'
import { WorkoutHeader } from './WorkoutHeader'
import { ExerciseCounter } from './ExerciseCounter'
import { MuscleGroupSection } from './MuscleGroupSection'
import { ConfirmationModal } from './ConfirmationModal'
import { WorkoutSummaryModal } from './WorkoutSummaryModal'
import { RestTimer } from './RestTimer'
import { WeightIncreasePopup } from './WeightIncreasePopup'
import { calculateExerciseVolume } from '@/lib/firebase/workoutHistory'

export default function ActiveWorkoutScreen() {
  const navigate = useNavigate()

  // Rest Timer state
  const [showRestTimer, setShowRestTimer] = useState(false)
  const [restTimerResetKey, setRestTimerResetKey] = useState(0)
  const [restTimerEnabled, setRestTimerEnabled] = useState(false)

  // Sort mode state
  const [sortBy, setSortBy] = useState<'muscle' | 'equipment'>('muscle')

  // Celebration popup state (weight increase + volume record)
  const [weightPopup, setWeightPopup] = useState<{
    visible: boolean
    oldWeight: number
    newWeight: number
    volumeRecord?: boolean
    oldVolume?: number
    newVolume?: number
  }>({
    visible: false,
    oldWeight: 0,
    newWeight: 0,
  })
  const shownWeightPopupFor = useRef<Set<string>>(new Set())
  const shownVolumePopupFor = useRef<Set<string>>(new Set())

  const {
    workout,
    isLoading,
    confirmModal,
    formattedTime,
    exercisesByMuscle,
    exercisesByEquipment,
    weeklyMuscleSets,
    showSummaryModal,
    isSaving,

    // Exercise actions
    toggleExercise,
    addSet,
    updateSet,
    deleteSet,
    finishExercise,
    updateExerciseNotes,
    setAssistanceType,

    // Workout actions
    confirmDeleteExercise,
    deleteExercise,
    confirmExit,
    exitWorkout,
    confirmFinish,
    handleConfirmFinish,
    handleFinishExerciseReminder,
    finishWorkoutWithCalories,
    closeModal,
    closeSummaryModal,
  } = useActiveWorkout()

  // Check if exercise weight increased or volume record broken, show celebration popup
  const checkCelebrations = useCallback((exerciseId: string) => {
    if (!workout) return
    const exercise = workout.exercises.find((ex) => ex.id === exerciseId)
    if (!exercise) return

    // Check weight increase
    let weightIncreased = false
    let popupOldWeight = 0
    let popupNewWeight = 0
    if (!shownWeightPopupFor.current.has(exerciseId) && exercise.lastWorkoutData) {
      const lastWeight = exercise.lastWorkoutData.weight
      if (lastWeight > 0) {
        const maxSetWeight = Math.max(
          ...exercise.reportedSets
            .filter((s) => s.reps > 0)
            .map((s) => s.weight || 0)
        )
        if (maxSetWeight > lastWeight) {
          weightIncreased = true
          popupOldWeight = lastWeight
          popupNewWeight = maxSetWeight
          shownWeightPopupFor.current.add(exerciseId)
        }
      }
    }

    // Check volume record
    let volumeBroken = false
    let popupOldVolume = 0
    let popupNewVolume = 0
    if (
      !shownVolumePopupFor.current.has(exerciseId) &&
      exercise.previousExerciseVolume !== null &&
      exercise.previousExerciseVolume !== undefined &&
      exercise.previousExerciseVolume > 0
    ) {
      const currentVolume = calculateExerciseVolume(exercise.reportedSets, exercise.reportType)
      if (currentVolume > exercise.previousExerciseVolume) {
        volumeBroken = true
        popupOldVolume = exercise.previousExerciseVolume
        popupNewVolume = currentVolume
        shownVolumePopupFor.current.add(exerciseId)
      }
    }

    // Show popup if either triggered
    if (weightIncreased || volumeBroken) {
      setWeightPopup({
        visible: true,
        oldWeight: popupOldWeight,
        newWeight: popupNewWeight,
        volumeRecord: volumeBroken,
        oldVolume: popupOldVolume,
        newVolume: popupNewVolume,
      })
    }
  }, [workout])

  // Wrap addSet to show rest timer + check weight increase
  const handleAddSet = useCallback((exerciseId: string) => {
    checkCelebrations(exerciseId)
    addSet(exerciseId)
    // Show rest timer only if enabled
    if (restTimerEnabled) {
      setRestTimerResetKey((prev) => prev + 1)
      setShowRestTimer(true)
    }
  }, [addSet, restTimerEnabled, checkCelebrations])

  // Close rest timer
  const handleCloseRestTimer = useCallback(() => {
    setShowRestTimer(false)
  }, [])

  // Wrap finishExercise to close timer + check for weight increase
  const handleFinishExercise = useCallback((exerciseId: string) => {
    setShowRestTimer(false)
    checkCelebrations(exerciseId)
    finishExercise(exerciseId)
  }, [finishExercise, checkCelebrations])

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
        // Show summary modal instead of finishing directly
        handleConfirmFinish()
        break
      case 'exit_workout':
        exitWorkout()
        break
      case 'delete_exercise':
        if (confirmModal.exerciseId) {
          deleteExercise(confirmModal.exerciseId)
        }
        break
      case 'finish_exercise_reminder':
        handleFinishExerciseReminder()
        break
      case 'incomplete_exercises_warning':
        // User confirmed to finish despite incomplete exercises
        handleConfirmFinish()
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
          className={`flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-lg text-sm font-medium cursor-pointer transition-all border ${
            restTimerEnabled
              ? 'bg-primary-main/15 border-primary-main text-primary-main'
              : 'bg-transparent border-border-default text-text-secondary'
          }`}
        >
          <Timer size={18} />
          <span>שעון עצר</span>
        </button>
      </div>

      {/* Sort Toggle Buttons */}
      <div className="flex gap-2 px-4 mb-3">
        <button
          onClick={() => setSortBy('muscle')}
          className={`px-3.5 py-1.5 rounded-lg text-[13px] font-medium cursor-pointer transition-all border ${
            sortBy === 'muscle'
              ? 'bg-primary-main border-primary-main text-background-main'
              : 'bg-transparent border-border-default text-text-secondary'
          }`}
        >
          לפי שריר
        </button>
        <button
          onClick={() => setSortBy('equipment')}
          className={`px-3.5 py-1.5 rounded-lg text-[13px] font-medium cursor-pointer transition-all border ${
            sortBy === 'equipment'
              ? 'bg-primary-main border-primary-main text-background-main'
              : 'bg-transparent border-border-default text-text-secondary'
          }`}
        >
          לפי ציוד
        </button>
      </div>

      {/* Exercises grouped by muscle or equipment */}
      <div className="active-workout-content" style={{ paddingBottom: '80px' }}>
        {(sortBy === 'muscle'
          ? exercisesByMuscle
          : exercisesByEquipment.map((g) => ({
              muscleGroup: g.equipment,
              muscleGroupHe: g.equipmentHe,
              exercises: g.exercises,
            }))
        ).map((group) => (
          <MuscleGroupSection
            key={group.muscleGroupHe}
            group={group}
            weeklyMuscleSets={sortBy === 'muscle' ? weeklyMuscleSets : undefined}
            onToggleExercise={handleToggleExercise}
            onAddSet={handleAddSet}
            onUpdateSet={updateSet}
            onDeleteSet={deleteSet}
            onFinishExercise={handleFinishExercise}
            onDeleteExercise={confirmDeleteExercise}
            onUpdateNotes={updateExerciseNotes}
            onSetAssistanceType={setAssistanceType}
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

      {/* Workout Summary Modal */}
      <WorkoutSummaryModal
        isOpen={showSummaryModal}
        onClose={closeSummaryModal}
        onSave={finishWorkoutWithCalories}
        isSaving={isSaving}
        stats={{
          completedExercises: workout.stats.completedExercises,
          totalExercises: workout.stats.totalExercises,
          completedSets: workout.stats.completedSets,
          totalSets: workout.stats.totalSets,
          formattedTime,
        }}
      />

      {/* Weight Increase / Volume Record Celebration Popup */}
      <WeightIncreasePopup
        isVisible={weightPopup.visible}
        oldWeight={weightPopup.oldWeight}
        newWeight={weightPopup.newWeight}
        volumeRecord={weightPopup.volumeRecord}
        oldVolume={weightPopup.oldVolume}
        newVolume={weightPopup.newVolume}
        onDone={() => setWeightPopup({ visible: false, oldWeight: 0, newWeight: 0 })}
      />
    </div>
  )
}
