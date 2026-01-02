/**
 * WorkoutSessionScreen
 * Main workout session screen with professional UI
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trophy, AlertCircle, Timer } from 'lucide-react'
import { useWorkoutSession } from '../../hooks/useWorkoutSession'
import { saveWorkoutHistory } from '@/lib/firebase/workoutHistory'
import { useAuthStore } from '@/domains/authentication/store'
import toast from 'react-hot-toast'

import { ExerciseNavigationHeader } from './ExerciseNavigationHeader'
import { ExerciseMedia } from './ExerciseMedia'
import { RestTimer } from './RestTimer'
import { CompletedSetRow, ActiveSetCard, UpcomingSetRow } from './SetRow'

export default function WorkoutSessionScreen() {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const {
    session,
    isLoading,
    currentExercise,
    currentSet,
    completeSet,
    skipRest,
    onRestEnd,
    setRestTime,
    completeExercise,
    goToNextExercise,
    goToPreviousExercise,
    finishWorkout,
    clearSession,
  } = useWorkoutSession()

  // Finish confirmation modal
  const [showFinishConfirm, setShowFinishConfirm] = useState(false)

  // Elapsed time display
  const [elapsedTime, setElapsedTime] = useState(0)

  // Update elapsed time
  useEffect(() => {
    if (!session) return

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - session.startedAt.getTime()) / 1000)
      setElapsedTime(elapsed)
    }, 1000)

    return () => clearInterval(interval)
  }, [session])

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Handle finish workout
  const handleFinishClick = () => {
    if (!session) return

    const completedCount = session.stats.completedExercises
    const totalCount = session.exercises.length

    if (completedCount === totalCount) {
      // All completed - finish directly
      handleFinishWorkout('completed')
    } else {
      // Partial - show confirmation
      setShowFinishConfirm(true)
    }
  }

  // Finish and save workout
  const handleFinishWorkout = async (status: 'completed' | 'partial' | 'cancelled') => {
    if (!session) return

    const endTime = new Date()
    const duration = Math.floor((endTime.getTime() - session.startedAt.getTime()) / 60000)

    try {
      await saveWorkoutHistory({
        userId: user?.uid || 'anonymous',
        name: session.workoutName,
        date: session.startedAt,
        startTime: session.startedAt,
        endTime,
        duration,
        status,
        exercises: session.exercises.map(ex => ({
          exerciseId: ex.exerciseId,
          exerciseName: ex.exerciseName,
          exerciseNameHe: ex.exerciseNameHe,
          isCompleted: ex.isCompleted,
          sets: ex.completedSets.map(set => ({
            type: set.setType,
            targetReps: 0,
            targetWeight: 0,
            actualReps: set.actualReps,
            actualWeight: set.actualWeight,
            completed: true,
          })),
        })),
        completedExercises: session.stats.completedExercises,
        totalExercises: session.exercises.length,
        completedSets: session.stats.completedSets,
        totalSets: session.stats.totalSets,
        totalVolume: session.stats.totalVolume,
        personalRecords: 0,
      })

      toast.success('האימון נשמר!')
    } catch (error) {
      console.error('Failed to save workout:', error)
      toast.error('שגיאה בשמירת האימון')
    }

    finishWorkout()
    navigate('/workout/history')
  }

  // Handle cancel workout
  const handleCancelWorkout = () => {
    if (window.confirm('האם אתה בטוח שברצונך לבטל את האימון?')) {
      clearSession()
      navigate('/dashboard')
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-neon-dark flex items-center justify-center">
        <div className="spinner" />
      </div>
    )
  }

  // No session
  if (!session || !currentExercise) {
    return (
      <div className="min-h-screen bg-neon-dark flex items-center justify-center p-4">
        <div className="text-center">
          <span className="text-6xl mb-6 block">💪</span>
          <h2 className="text-2xl font-bold text-white mb-4">אין אימון פעיל</h2>
          <p className="text-neon-gray-400 mb-6">התחל בבחירת תרגילים מהספרייה</p>
          <button
            onClick={() => navigate('/exercises')}
            className="bg-neon-gradient text-neon-dark px-6 py-3 rounded-xl font-semibold"
          >
            לספריית התרגילים
          </button>
        </div>
      </div>
    )
  }

  const isResting = session.state === 'resting'

  return (
    <div className="workout-session-screen" dir="rtl">
      {/* Header */}
      <ExerciseNavigationHeader
        currentIndex={session.currentExerciseIndex}
        totalExercises={session.exercises.length}
        onPrevious={goToPreviousExercise}
        onNext={goToNextExercise}
        onSkipExercise={() => {
          completeExercise()
          goToNextExercise()
        }}
        onClose={handleCancelWorkout}
      />

      {/* Stats Bar */}
      <div className="workout-session-stats">
        <div className="workout-session-stat">
          <Timer className="w-4 h-4 text-neon-cyan" />
          <span className="text-white font-medium">{formatTime(elapsedTime)}</span>
        </div>
        <div className="workout-session-stat">
          <span className="text-neon-gray-400">סטים:</span>
          <span className="text-white font-medium">
            {session.stats.completedSets}/{session.stats.totalSets}
          </span>
        </div>
        <div className="workout-session-stat">
          <span className="text-neon-gray-400">נפח:</span>
          <span className="text-white font-medium">
            {(session.stats.totalVolume / 1000).toFixed(1)}T
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="workout-session-content">
        {/* Exercise Details */}
        <div className="workout-session-exercise-details">
          <h2 className="text-neon-cyan text-xl font-bold text-center">
            {currentExercise.exerciseNameHe}
          </h2>
          {currentExercise.instructions && (
            <p className="text-neon-gray-300 text-sm text-center mt-1">
              {currentExercise.instructions}
            </p>
          )}
        </div>

        {/* Exercise Media */}
        <ExerciseMedia
          imageUrl={currentExercise.imageUrl}
          videoUrl={currentExercise.videoUrl}
          exerciseName={currentExercise.exerciseNameHe}
        />

        {/* Rest Timer (when resting) */}
        {isResting && (
          <RestTimer
            targetSeconds={session.restTimer.targetSeconds}
            startedAt={session.restTimer.startedAt}
            isActive={session.restTimer.isActive}
            onComplete={onRestEnd}
            onSkip={skipRest}
            onChangeTime={setRestTime}
          />
        )}

        {/* Sets List */}
        <div className="workout-session-sets">
          {/* Completed Sets */}
          {currentExercise.completedSets.map((set) => (
            <CompletedSetRow key={`completed-${set.setNumber}`} set={set} />
          ))}

          {/* Active Set (only when not resting and exercise not completed) */}
          {!isResting && !currentExercise.isCompleted && currentSet && (
            <ActiveSetCard
              set={currentSet}
              onComplete={completeSet}
            />
          )}

          {/* Upcoming Sets */}
          {currentExercise.plannedSets
            .filter((_, i) => i > currentExercise.currentSetIndex)
            .map((set) => (
              <UpcomingSetRow key={`upcoming-${set.setNumber}`} set={set} />
            ))}
        </div>

        {/* Complete Exercise Button (when all sets done) */}
        {!isResting && currentExercise.currentSetIndex >= currentExercise.plannedSets.length - 1 &&
          currentExercise.completedSets.length === currentExercise.plannedSets.length && (
          <button
            onClick={() => {
              completeExercise()
              if (session.currentExerciseIndex < session.exercises.length - 1) {
                goToNextExercise()
              }
            }}
            className="btn-complete-exercise mt-4"
          >
            <Trophy className="w-5 h-5" />
            סיים תרגיל
          </button>
        )}
      </div>

      {/* Bottom Bar - Finish Workout */}
      <div className="workout-session-bottom">
        <button onClick={handleFinishClick} className="btn-finish-workout">
          <Trophy className="w-5 h-5" />
          סיים אימון
        </button>
      </div>

      {/* Finish Confirmation Modal */}
      {showFinishConfirm && (
        <div className="modal-confirmation">
          <div className="modal-confirmation-content">
            <div className="modal-confirmation-icon">
              <AlertCircle className="w-8 h-8 text-yellow-400" />
            </div>
            <h3 className="modal-confirmation-title">
              {session.stats.completedExercises === 0 ? 'סיום ללא ביצוע?' : 'סיום חלקי'}
            </h3>
            <p className="modal-confirmation-text">
              {session.stats.completedExercises === 0
                ? 'לא בוצעו תרגילים באימון זה. האם לסיים?'
                : `סיימת ${session.stats.completedExercises} תרגילים מתוך ${session.exercises.length}. האם לסיים את האימון?`
              }
            </p>

            <div className="modal-confirmation-stats">
              <div className="modal-confirmation-stat">
                <span className="modal-confirmation-stat-label">תרגילים</span>
                <span className="modal-confirmation-stat-value">
                  {session.stats.completedExercises}/{session.exercises.length}
                </span>
              </div>
              <div className="modal-confirmation-stat">
                <span className="modal-confirmation-stat-label">סטים</span>
                <span className="modal-confirmation-stat-value">
                  {session.stats.completedSets}/{session.stats.totalSets}
                </span>
              </div>
              <div className="modal-confirmation-stat">
                <span className="modal-confirmation-stat-label">זמן</span>
                <span className="modal-confirmation-stat-value">{formatTime(elapsedTime)}</span>
              </div>
            </div>

            <div className="modal-confirmation-buttons">
              <button
                onClick={() => setShowFinishConfirm(false)}
                className="btn-modal-cancel"
              >
                המשך אימון
              </button>
              <button
                onClick={() => handleFinishWorkout(
                  session.stats.completedExercises === 0 ? 'cancelled' : 'partial'
                )}
                className="btn-modal-confirm"
              >
                סיים
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
