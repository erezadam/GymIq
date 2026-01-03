import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  X,
  Check,
  Plus,
  Minus,
  Play,
  Pause,
  SkipForward,
  Timer,
  Trophy,
  Search,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useWorkoutBuilderStore } from '../store'
import { exerciseService } from '@/domains/exercises/services'
import { saveWorkoutHistory } from '@/lib/firebase/workoutHistory'
import { useAuthStore } from '@/domains/authentication/store'
import type { Exercise } from '@/domains/exercises/types'
import type { WorkoutExercise, WorkoutCompletionStatus } from '../types'

// Extended type with completion state
interface SessionExercise extends WorkoutExercise {
  isCompleted: boolean
  completedAt?: Date
}

export default function WorkoutSession() {
  const navigate = useNavigate()
  const { selectedExercises, getWorkoutExercises, clearWorkout, addExercise, workoutName } = useWorkoutBuilderStore()
  const { user } = useAuthStore()

  // Session state
  const [exercises, setExercises] = useState<SessionExercise[]>([])
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0)
  const [currentSetIndex, setCurrentSetIndex] = useState(0)
  const [isResting, setIsResting] = useState(false)
  const [restTimeRemaining, setRestTimeRemaining] = useState(0)
  const [sessionStartTime] = useState(new Date())
  const [elapsedTime, setElapsedTime] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

  // Add exercise modal
  const [showAddExercise, setShowAddExercise] = useState(false)
  const [availableExercises, setAvailableExercises] = useState<Exercise[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  // Finish workout confirmation modal
  const [showFinishConfirm, setShowFinishConfirm] = useState(false)

  // Load exercises from store
  useEffect(() => {
    const workoutExercises = getWorkoutExercises()
    setExercises(workoutExercises.map(ex => ({ ...ex, isCompleted: false })))
  }, [getWorkoutExercises, selectedExercises])

  // Load available exercises for adding during workout
  useEffect(() => {
    const loadExercises = async () => {
      const data = await exerciseService.getExercises()
      setAvailableExercises(data)
    }
    loadExercises()
  }, [])

  // Timer for elapsed time
  useEffect(() => {
    if (isPaused) return

    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - sessionStartTime.getTime()) / 1000))
    }, 1000)

    return () => clearInterval(interval)
  }, [sessionStartTime, isPaused])

  // Rest timer
  useEffect(() => {
    if (!isResting || restTimeRemaining <= 0) return

    const interval = setInterval(() => {
      setRestTimeRemaining((prev) => {
        if (prev <= 1) {
          setIsResting(false)
          toast('מנוחה הסתיימה! המשך לסט הבא', { icon: '💪' })
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [isResting, restTimeRemaining])

  // Current exercise and set
  const currentExercise = exercises[currentExerciseIndex]
  const currentSet = currentExercise?.sets[currentSetIndex]

  // Calculate completed exercises count
  const completedExercisesCount = useMemo(() => {
    return exercises.filter(ex => ex.isCompleted).length
  }, [exercises])

  // Calculate total volume
  const totalVolume = useMemo(() => {
    return exercises.reduce((total, ex) => {
      return (
        total +
        ex.sets.reduce((setTotal, set) => {
          if (set.completed && set.actualWeight && set.actualReps) {
            return setTotal + set.actualWeight * set.actualReps
          }
          return setTotal
        }, 0)
      )
    }, 0)
  }, [exercises])

  // Completed sets count
  const completedSets = useMemo(() => {
    return exercises.reduce((total, ex) => {
      return total + ex.sets.filter((s) => s.completed).length
    }, 0)
  }, [exercises])

  const totalSets = useMemo(() => {
    return exercises.reduce((total, ex) => total + ex.sets.length, 0)
  }, [exercises])

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Update set values
  const updateSet = (field: 'actualReps' | 'actualWeight', delta: number) => {
    if (!currentExercise || !currentSet) return

    setExercises((prev) => {
      const updated = [...prev]
      const set = updated[currentExerciseIndex].sets[currentSetIndex]
      const currentValue = set[field] ?? (field === 'actualReps' ? set.targetReps : set.targetWeight) ?? 0
      set[field] = Math.max(0, currentValue + delta)
      return updated
    })
  }

  // Complete set
  const completeSet = () => {
    if (!currentExercise || !currentSet) return

    setExercises((prev) => {
      const updated = [...prev]
      const set = updated[currentExerciseIndex].sets[currentSetIndex]
      set.completed = true
      if (!set.actualReps) set.actualReps = set.targetReps
      if (!set.actualWeight) set.actualWeight = set.targetWeight
      return updated
    })

    toast.success('סט הושלם!')

    // Move to next set or stay on current exercise
    if (currentSetIndex < currentExercise.sets.length - 1) {
      // Start rest timer
      setIsResting(true)
      setRestTimeRemaining(currentExercise.restTime)
      setCurrentSetIndex(currentSetIndex + 1)
    } else {
      // All sets done - show complete exercise option
      toast('כל הסטים הושלמו! סמן את התרגיל כהושלם', { icon: '🎯' })
    }
  }

  // Complete exercise
  const completeExercise = (exerciseIndex: number) => {
    setExercises((prev) => {
      const updated = [...prev]
      updated[exerciseIndex].isCompleted = true
      updated[exerciseIndex].completedAt = new Date()
      return updated
    })

    toast.success('תרגיל הושלם!')

    // Find next uncompleted exercise
    const nextUncompleted = exercises.findIndex((ex, idx) => idx > exerciseIndex && !ex.isCompleted)
    if (nextUncompleted !== -1) {
      setCurrentExerciseIndex(nextUncompleted)
      setCurrentSetIndex(0)
    } else {
      // Check if there are any uncompleted exercises before this one
      const prevUncompleted = exercises.findIndex((ex, idx) => idx < exerciseIndex && !ex.isCompleted)
      if (prevUncompleted !== -1) {
        setCurrentExerciseIndex(prevUncompleted)
        setCurrentSetIndex(0)
      }
    }
  }

  // Skip rest
  const skipRest = () => {
    setIsResting(false)
    setRestTimeRemaining(0)
  }

  // Add exercise during workout
  const handleAddExercise = (exercise: Exercise) => {
    addExercise({
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      exerciseNameHe: exercise.nameHe,
      imageUrl: exercise.imageUrl,
      primaryMuscle: exercise.primaryMuscle,
    })
    setShowAddExercise(false)
    setSearchQuery('')
    toast.success(`${exercise.nameHe} נוסף לאימון!`)
  }

  // Handle finish button click
  const handleFinishClick = () => {
    if (completedExercisesCount === exercises.length) {
      // All exercises completed - finish directly
      finishWorkout('completed')
    } else if (completedExercisesCount === 0) {
      // No exercises completed - ask for confirmation
      setShowFinishConfirm(true)
    } else {
      // Partial completion - show modal
      setShowFinishConfirm(true)
    }
  }

  // Finish workout
  const finishWorkout = async (status: WorkoutCompletionStatus) => {
    console.log('🏋️ finishWorkout called with status:', status)
    const endTime = new Date()
    const duration = Math.floor((endTime.getTime() - sessionStartTime.getTime()) / 60000)

    console.log('📊 Workout data:', {
      userId: user?.uid,
      workoutName,
      exercisesCount: exercises.length,
      duration,
      status
    })

    // Save to history
    try {
      await saveWorkoutHistory({
        userId: user?.uid || 'anonymous',
        name: workoutName || `אימון ${new Date().toLocaleDateString('he-IL')}`,
        date: sessionStartTime,
        startTime: sessionStartTime,
        endTime,
        duration,
        status,
        exercises: exercises.map(ex => ({
          exerciseId: ex.exerciseId,
          exerciseName: ex.exerciseName,
          exerciseNameHe: ex.exerciseNameHe,
          isCompleted: ex.isCompleted,
          sets: ex.sets.map(set => ({
            type: set.type,
            targetReps: set.targetReps || 0,
            targetWeight: set.targetWeight || 0,
            actualReps: set.actualReps,
            actualWeight: set.actualWeight,
            completed: set.completed,
          })),
        })),
        completedExercises: completedExercisesCount,
        totalExercises: exercises.length,
        completedSets,
        totalSets,
        totalVolume,
        personalRecords: 0,
      })

      toast.success('האימון נשמר!')
    } catch (error) {
      console.error('Failed to save workout:', error)
      toast.error('שגיאה בשמירת האימון')
    }

    clearWorkout()
    navigate('/workout/history')
  }

  // Cancel workout
  const cancelWorkout = () => {
    if (window.confirm('האם אתה בטוח שברצונך לבטל את האימון?')) {
      clearWorkout()
      navigate('/dashboard')
    }
  }

  // Filter exercises for add modal
  const filteredExercises = useMemo(() => {
    const currentIds = exercises.map((e) => e.exerciseId)
    return availableExercises
      .filter((e) => !currentIds.includes(e.id))
      .filter(
        (e) =>
          !searchQuery ||
          e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.nameHe.includes(searchQuery)
      )
  }, [availableExercises, exercises, searchQuery])

  // Get display values for current set
  const displayReps = currentSet?.actualReps ?? currentSet?.targetReps ?? 0
  const displayWeight = currentSet?.actualWeight ?? currentSet?.targetWeight ?? 0

  // Check if current exercise has all sets completed
  const allSetsCompleted = currentExercise?.sets.every(s => s.completed) || false

  // Get exercise card class
  const getExerciseCardClass = (exIndex: number, isExerciseCompleted: boolean) => {
    if (isExerciseCompleted) {
      return 'exercise-session-card completed collapsed'
    }
    if (exIndex === currentExerciseIndex) {
      return 'exercise-session-card active'
    }
    return 'exercise-session-card pending'
  }

  // Empty state - no exercises
  if (exercises.length === 0) {
    return (
      <div className="min-h-screen bg-neon-dark flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <span className="text-6xl mb-6 block">🏋️</span>
          <h2 className="text-2xl font-bold text-white mb-4">אימון חופשי</h2>
          <p className="text-neon-gray-400 mb-6">התחל להוסיף תרגילים כדי להתחיל את האימון שלך</p>
          <button
            onClick={() => setShowAddExercise(true)}
            className="bg-neon-gradient text-neon-dark px-6 py-3 rounded-xl font-semibold hover:shadow-neon-cyan/30 hover:shadow-lg transition-all flex items-center gap-2 mx-auto"
          >
            <Plus className="w-5 h-5" />
            הוסף תרגיל
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neon-dark pb-32">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-neon-gray-900 border-b border-neon-gray-800">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={cancelWorkout}
            className="p-2 text-neon-gray-400 hover:text-red-400 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="text-center">
            <p className="text-white font-medium">{currentExercise?.exerciseNameHe || 'אימון'}</p>
            <p className="text-neon-gray-400 text-sm">
              {completedExercisesCount}/{exercises.length} תרגילים הושלמו
            </p>
          </div>

          <button
            onClick={() => setIsPaused(!isPaused)}
            className="p-2 text-neon-gray-400 hover:text-white transition-colors"
          >
            {isPaused ? <Play className="w-6 h-6" /> : <Pause className="w-6 h-6" />}
          </button>
        </div>

        {/* Stats bar */}
        <div className="flex justify-around py-2 bg-neon-gray-800/50 text-sm">
          <div className="text-center">
            <p className="text-white font-medium">{formatTime(elapsedTime)}</p>
            <p className="text-neon-gray-500 text-xs">זמן</p>
          </div>
          <div className="text-center">
            <p className="text-white font-medium">
              {completedSets}/{totalSets}
            </p>
            <p className="text-neon-gray-500 text-xs">סטים</p>
          </div>
          <div className="text-center">
            <p className="text-white font-medium">{(totalVolume / 1000).toFixed(1)}T</p>
            <p className="text-neon-gray-500 text-xs">נפח</p>
          </div>
        </div>
      </div>

      {/* Rest timer overlay */}
      {isResting && (
        <div className="fixed inset-0 z-20 bg-neon-dark/95 flex items-center justify-center">
          <div className="text-center">
            <Timer className="w-16 h-16 text-neon-cyan mx-auto mb-4 animate-pulse" />
            <p className="text-6xl font-bold text-white mb-2">{formatTime(restTimeRemaining)}</p>
            <p className="text-neon-gray-400 mb-8">מנוחה</p>
            <button
              onClick={skipRest}
              className="flex items-center gap-2 mx-auto text-neon-cyan hover:text-neon-cyan/80"
            >
              <SkipForward className="w-5 h-5" />
              דלג על מנוחה
            </button>
          </div>
        </div>
      )}

      {/* Finish Confirmation Modal */}
      {showFinishConfirm && (
        <div className="modal-confirmation">
          <div className="modal-confirmation-content">
            <div className="modal-confirmation-icon">
              <AlertCircle className="w-8 h-8 text-yellow-400" />
            </div>
            <h3 className="modal-confirmation-title">
              {completedExercisesCount === 0 ? 'סיום ללא ביצוע?' : 'סיום חלקי'}
            </h3>
            <p className="modal-confirmation-text">
              {completedExercisesCount === 0
                ? 'לא בוצעו תרגילים באימון זה. האם לסיים?'
                : `סיימת ${completedExercisesCount} תרגילים מתוך ${exercises.length}. האם לסיים את האימון?`
              }
            </p>

            <div className="modal-confirmation-stats">
              <div className="modal-confirmation-stat">
                <span className="modal-confirmation-stat-label">תרגילים</span>
                <span className="modal-confirmation-stat-value">{completedExercisesCount}/{exercises.length}</span>
              </div>
              <div className="modal-confirmation-stat">
                <span className="modal-confirmation-stat-label">סטים</span>
                <span className="modal-confirmation-stat-value">{completedSets}/{totalSets}</span>
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
                onClick={() => finishWorkout(completedExercisesCount === 0 ? 'cancelled' : 'partial')}
                className="btn-modal-confirm"
              >
                סיים
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Exercise Modal */}
      {showAddExercise && (
        <div className="fixed inset-0 z-30 bg-black/80 flex items-end sm:items-center justify-center">
          <div className="bg-neon-gray-900 w-full sm:w-96 max-h-[80vh] rounded-t-2xl sm:rounded-2xl overflow-hidden">
            <div className="sticky top-0 bg-neon-gray-900 p-4 border-b border-neon-gray-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">הוסף תרגיל</h3>
                <button
                  onClick={() => setShowAddExercise(false)}
                  className="p-2 text-neon-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="חפש תרגיל..."
                  className="w-full px-4 py-2 pr-10 bg-neon-gray-800 border border-neon-gray-700 rounded-lg text-white placeholder-neon-gray-500 focus:outline-none focus:border-neon-cyan"
                />
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neon-gray-500" />
              </div>
            </div>
            <div className="overflow-y-auto max-h-96 p-4 space-y-2">
              {filteredExercises.map((exercise) => (
                <button
                  key={exercise.id}
                  onClick={() => handleAddExercise(exercise)}
                  className="w-full p-3 bg-neon-gray-800 hover:bg-neon-gray-700 rounded-lg text-right transition-colors flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-lg bg-neon-gray-700 overflow-hidden flex-shrink-0">
                    {exercise.imageUrl ? (
                      <img
                        src={exercise.imageUrl}
                        alt={exercise.nameHe}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-lg">💪</div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium">{exercise.nameHe}</p>
                    <p className="text-neon-gray-400 text-sm">{exercise.name}</p>
                  </div>
                  <Plus className="w-5 h-5 text-neon-cyan" />
                </button>
              ))}
              {filteredExercises.length === 0 && (
                <p className="text-center text-neon-gray-500 py-4">לא נמצאו תרגילים</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="p-4 space-y-6">
        {/* Current set card - only show if exercise is not completed */}
        {currentSet && !currentExercise?.isCompleted && (
          <div className="bg-neon-gray-800 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <span
                className={`px-3 py-1 rounded-lg text-sm ${
                  currentSet.type === 'warmup'
                    ? 'bg-yellow-500/20 text-yellow-400'
                    : 'bg-neon-cyan/20 text-neon-cyan'
                }`}
              >
                {currentSet.type === 'warmup' ? 'חימום' : 'סט עבודה'}
              </span>
              <span className="text-neon-gray-400 text-sm">
                יעד: {currentSet.targetReps} × {currentSet.targetWeight}kg
              </span>
            </div>

            {/* Reps control */}
            <div className="mb-6">
              <p className="text-neon-gray-400 text-sm text-center mb-2">חזרות</p>
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => updateSet('actualReps', -1)}
                  className="w-14 h-14 rounded-xl bg-neon-gray-700 hover:bg-neon-gray-600 flex items-center justify-center transition-colors"
                >
                  <Minus className="w-6 h-6 text-white" />
                </button>
                <span className="text-5xl font-bold text-white w-24 text-center">{displayReps}</span>
                <button
                  onClick={() => updateSet('actualReps', 1)}
                  className="w-14 h-14 rounded-xl bg-neon-gray-700 hover:bg-neon-gray-600 flex items-center justify-center transition-colors"
                >
                  <Plus className="w-6 h-6 text-white" />
                </button>
              </div>
            </div>

            {/* Weight control */}
            <div className="mb-6">
              <p className="text-neon-gray-400 text-sm text-center mb-2">משקל (kg)</p>
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => updateSet('actualWeight', -2.5)}
                  className="w-14 h-14 rounded-xl bg-neon-gray-700 hover:bg-neon-gray-600 flex items-center justify-center transition-colors"
                >
                  <Minus className="w-6 h-6 text-white" />
                </button>
                <span className="text-5xl font-bold text-white w-24 text-center">{displayWeight}</span>
                <button
                  onClick={() => updateSet('actualWeight', 2.5)}
                  className="w-14 h-14 rounded-xl bg-neon-gray-700 hover:bg-neon-gray-600 flex items-center justify-center transition-colors"
                >
                  <Plus className="w-6 h-6 text-white" />
                </button>
              </div>
            </div>

            {/* Complete set button or Complete exercise button */}
            {!allSetsCompleted ? (
              <button
                onClick={completeSet}
                className="w-full bg-neon-gradient text-neon-dark py-4 rounded-xl font-semibold flex items-center justify-center gap-2 hover:shadow-neon-cyan/30 hover:shadow-lg transition-all"
              >
                <Check className="w-5 h-5" />
                סיים סט
              </button>
            ) : (
              <button
                onClick={() => completeExercise(currentExerciseIndex)}
                className="btn-complete-exercise"
              >
                <Check className="w-5 h-5" />
                סיים תרגיל
              </button>
            )}
          </div>
        )}

        {/* Add exercise button */}
        <button
          onClick={() => setShowAddExercise(true)}
          className="w-full p-4 bg-neon-gray-800/50 hover:bg-neon-gray-800 border-2 border-dashed border-neon-gray-700 hover:border-neon-cyan rounded-xl transition-all flex items-center justify-center gap-2 text-neon-gray-400 hover:text-neon-cyan"
        >
          <Plus className="w-5 h-5" />
          הוסף תרגיל לאימון
        </button>

        {/* Exercise list */}
        <div className="space-y-3">
          <p className="text-neon-gray-400 text-sm">תרגילים באימון</p>
          {exercises.map((exercise, exIndex) => (
            <div
              key={exercise.id}
              className={getExerciseCardClass(exIndex, exercise.isCompleted)}
            >
              <div
                onClick={() => {
                  if (!exercise.isCompleted) {
                    setCurrentExerciseIndex(exIndex)
                    setCurrentSetIndex(0)
                  }
                }}
                className="flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      exercise.isCompleted
                        ? 'bg-green-500 text-white'
                        : exIndex === currentExerciseIndex
                          ? 'bg-neon-cyan text-neon-dark'
                          : 'bg-neon-gray-700 text-neon-gray-400'
                    }`}
                  >
                    {exercise.isCompleted ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <span className="text-sm">{exIndex + 1}</span>
                    )}
                  </div>
                  <span className={exercise.isCompleted ? 'exercise-name-completed' : 'text-white'}>
                    {exercise.exerciseNameHe}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-neon-gray-500 text-sm">
                    {exercise.sets.filter((s) => s.completed).length}/{exercise.sets.length}
                  </span>
                  {!exercise.isCompleted && (
                    exIndex === currentExerciseIndex ? (
                      <ChevronUp className="w-4 h-4 text-neon-gray-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-neon-gray-400" />
                    )
                  )}
                </div>
              </div>

              {/* Complete Exercise Button - show for non-completed exercises */}
              {!exercise.isCompleted && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    completeExercise(exIndex)
                  }}
                  className="btn-complete-exercise-sm mt-3"
                >
                  <Check className="w-4 h-4" />
                  סיים תרגיל
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Finish button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-neon-gray-900 border-t border-neon-gray-800">
        <button
          onClick={handleFinishClick}
          className="btn-finish-workout"
        >
          <Trophy className="w-5 h-5" />
          סיים אימון
        </button>
      </div>
    </div>
  )
}
