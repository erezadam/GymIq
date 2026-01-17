import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Calendar, Dumbbell, CheckCircle, AlertCircle, XCircle, Play, X, ArrowRight, Trash2 } from 'lucide-react'
// Note: Trophy, ChevronDown, ChevronUp, Clock, Zap moved to WorkoutCard
import { getUserWorkoutHistory, getWorkoutById, updateWorkoutHistory, deleteWorkoutHistory } from '@/lib/firebase/workoutHistory'
import { getMuscleIdToNameHeMap } from '@/lib/firebase/muscles'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/domains/authentication/store'
import { useWorkoutBuilderStore } from '../store'
import { exerciseService } from '@/domains/exercises/services'
import { WorkoutCard } from '@/shared/components/WorkoutCard'
import type { WorkoutHistorySummary, WorkoutHistoryEntry, WorkoutCompletionStatus } from '../types'

// Confirmation dialog for continuing workout
interface ContinueDialogState {
  isOpen: boolean
  workout: WorkoutHistorySummary | null
}

// Confirmation dialog for deleting workout
interface DeleteDialogState {
  isOpen: boolean
  workout: WorkoutHistorySummary | null
}

export default function WorkoutHistory() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { addExercise, clearWorkout } = useWorkoutBuilderStore()
  const [workouts, setWorkouts] = useState<WorkoutHistorySummary[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedWorkoutId, setExpandedWorkoutId] = useState<string | null>(null)
  const [expandedWorkoutDetails, setExpandedWorkoutDetails] = useState<WorkoutHistoryEntry | null>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [continueDialog, setContinueDialog] = useState<ContinueDialogState>({
    isOpen: false,
    workout: null,
  })
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState>({
    isOpen: false,
    workout: null,
  })
  const [dynamicMuscleNames, setDynamicMuscleNames] = useState<Record<string, string>>({})

  useEffect(() => {
    loadWorkouts()
  }, [user])

  // Load dynamic muscle names from Firebase
  useEffect(() => {
    const loadMuscleNames = async () => {
      try {
        const mapping = await getMuscleIdToNameHeMap()
        setDynamicMuscleNames(mapping)
      } catch (error) {
        console.error('Failed to load muscle names:', error)
      }
    }
    loadMuscleNames()
  }, [])

  const loadWorkouts = async () => {
    if (!user?.uid) {
      setLoading(false)
      return
    }

    try {
      const history = await getUserWorkoutHistory(user.uid)
      setWorkouts(history)
    } catch (error) {
      console.error('Failed to load workout history:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (date: Date) => {
    const now = new Date()
    // Reset time to midnight for accurate day comparison
    const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const dateMidnight = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    const diffMs = nowMidnight.getTime() - dateMidnight.getTime()
    const diff = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    // Today
    if (diff === 0) return 'היום'

    // Past dates
    if (diff === 1) return 'אתמול'
    if (diff > 1 && diff < 7) return `לפני ${diff} ימים`

    // Future dates
    if (diff === -1) return 'מחר'
    if (diff < -1 && diff > -7) return `בעוד ${Math.abs(diff)} ימים`

    return date.toLocaleDateString('he-IL', {
      day: 'numeric',
      month: 'short',
    })
  }

  // Handle delete button click
  const handleDeleteClick = (e: React.MouseEvent, workout: WorkoutHistorySummary) => {
    e.stopPropagation() // Prevent card expansion
    setDeleteDialog({ isOpen: true, workout })
  }

  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    if (!deleteDialog.workout) return

    try {
      await deleteWorkoutHistory(deleteDialog.workout.id)
      setWorkouts((prev) => prev.filter((w) => w.id !== deleteDialog.workout!.id))
      toast.success('האימון נמחק בהצלחה')
    } catch (error) {
      console.error('Failed to delete workout:', error)
      toast.error('שגיאה במחיקת האימון')
    } finally {
      setDeleteDialog({ isOpen: false, workout: null })
    }
  }

  // Get status config for styling (using design tokens)
  const getStatusConfig = (status: WorkoutCompletionStatus) => {
    switch (status) {
      case 'completed':
        return {
          label: 'הושלם',
          icon: CheckCircle,
          bgClass: 'bg-workout-status-completed-bg',
          borderClass: 'border-workout-status-completed',
          textClass: 'text-workout-status-completed-text',
          iconBgClass: 'bg-workout-status-completed-bg',
          iconTextClass: 'text-workout-status-completed-text',
        }
      case 'in_progress':
      case 'partial':
        return {
          label: 'בתהליך',
          icon: AlertCircle,
          bgClass: 'bg-workout-status-in-progress-bg',
          borderClass: 'border-workout-status-in-progress',
          textClass: 'text-workout-status-in-progress-text',
          iconBgClass: 'bg-workout-status-in-progress-bg',
          iconTextClass: 'text-workout-status-in-progress-text',
        }
      case 'planned':
        return {
          label: 'מתוכנן',
          icon: Calendar,
          bgClass: 'bg-workout-status-planned-bg',
          borderClass: 'border-workout-status-planned',
          textClass: 'text-workout-status-planned-text',
          iconBgClass: 'bg-workout-status-planned-bg',
          iconTextClass: 'text-workout-status-planned-text',
        }
      case 'cancelled':
      default:
        return {
          label: 'ללא דיווח',
          icon: XCircle,
          bgClass: 'bg-neon-gray-700/50',
          borderClass: 'border-neon-gray-600',
          textClass: 'text-neon-gray-400',
          iconBgClass: 'bg-neon-gray-700/50',
          iconTextClass: 'text-neon-gray-400',
        }
    }
  }

  const getStatusBadge = (status: WorkoutCompletionStatus) => {
    const config = getStatusConfig(status)
    const Icon = config.icon
    return (
      <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${config.bgClass} ${config.textClass}`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    )
  }

  // Toggle workout card expansion and load details
  const toggleWorkoutExpanded = async (workoutId: string) => {
    if (expandedWorkoutId === workoutId) {
      // Closing the expanded card
      setExpandedWorkoutId(null)
      setExpandedWorkoutDetails(null)
      return
    }

    // Opening a new card - load full details
    setExpandedWorkoutId(workoutId)
    setLoadingDetails(true)
    setExpandedWorkoutDetails(null)

    try {
      const details = await getWorkoutById(workoutId)
      setExpandedWorkoutDetails(details)
    } catch (error) {
      console.error('Failed to load workout details:', error)
    } finally {
      setLoadingDetails(false)
    }
  }

  // Format duration in minutes
  const formatDuration = (minutes: number) => {
    if (!minutes || minutes === 0) return '0 דק\''
    return `${minutes} דק'`
  }

  // Estimate calories (rough estimate: 5 cal per minute)
  const estimateCalories = (duration: number, volume: number) => {
    if (!duration) return 0
    return Math.round(duration * 5 + (volume / 100))
  }

  // Handle continue to workout button click
  const handleContinueClick = (workout: WorkoutHistorySummary) => {
    setContinueDialog({ isOpen: true, workout })
  }

  // Confirm and navigate to workout - 3 cases per spec 11.2
  const handleConfirmContinue = async () => {
    if (!continueDialog.workout || !user?.uid) return

    const workoutSummary = continueDialog.workout

    try {
      // Load full workout details
      const fullWorkout = await getWorkoutById(workoutSummary.id)

      if (!fullWorkout || !fullWorkout.exercises) {
        console.error('Could not load workout details')
        setContinueDialog({ isOpen: false, workout: null })
        return
      }

      // Fetch exercise details to get imageUrl and English name for each exercise
      const exerciseDetailsMap = new Map<string, { imageUrl: string; primaryMuscle: string; category: string; name: string; nameHe: string }>()
      await Promise.all(
        fullWorkout.exercises.map(async (ex) => {
          try {
            const exerciseDetails = await exerciseService.getExerciseById(ex.exerciseId)
            if (exerciseDetails) {
              exerciseDetailsMap.set(ex.exerciseId, {
                imageUrl: exerciseDetails.imageUrl || '',
                primaryMuscle: exerciseDetails.primaryMuscle || '',
                category: exerciseDetails.category || '',
                name: exerciseDetails.name || '',
                nameHe: exerciseDetails.nameHe || '',
              })
            }
          } catch (err) {
            console.warn(`Could not fetch details for exercise ${ex.exerciseId}:`, err)
          }
        })
      )

      // Clear any existing workout in the store
      clearWorkout()

      // Handle the different cases based on status
      switch (workoutSummary.status) {
        case 'completed':
        case 'cancelled': {
          // Completed or cancelled workout - create NEW workout with exercises but EMPTY sets
          console.log('📋 Creating new workout from completed/cancelled - exercises only, no set data')

          fullWorkout.exercises.forEach(exercise => {
            const details = exerciseDetailsMap.get(exercise.exerciseId)
            addExercise({
              exerciseId: exercise.exerciseId,
              exerciseName: details?.name || exercise.exerciseName,
              exerciseNameHe: details?.nameHe || exercise.exerciseNameHe || '',
              imageUrl: details?.imageUrl || exercise.imageUrl || '',
              primaryMuscle: details?.primaryMuscle || '',
              category: details?.category || '',
            })
          })

          // Navigate to active workout - store will create new workout
          navigate('/workout/session')
          break
        }

        case 'in_progress':
        case 'partial': {
          // Case 2: In-progress workout - create NEW workout copying ALL set data
          console.log('📋 Creating new workout from in-progress - copying all set data')

          // Store the exercise data with sets for the active workout to use
          const exercisesWithSets = fullWorkout.exercises.map(exercise => {
            const details = exerciseDetailsMap.get(exercise.exerciseId)
            return {
              exerciseId: exercise.exerciseId,
              exerciseName: details?.name || exercise.exerciseName,
              exerciseNameHe: details?.nameHe || exercise.exerciseNameHe || '',
              imageUrl: details?.imageUrl || exercise.imageUrl || '',
              primaryMuscle: details?.primaryMuscle || '',
              sets: exercise.sets || [],
              isCompleted: exercise.isCompleted || false,  // שמירת סטטוס התרגיל
            }
          })

          // Store in localStorage for ActiveWorkoutScreen to pick up
          localStorage.setItem('continueWorkoutData', JSON.stringify(exercisesWithSets))
          localStorage.setItem('continueWorkoutMode', 'in_progress')
          localStorage.setItem('continueWorkoutId', workoutSummary.id)  // שמירת ID למניעת כפילויות

          // Add exercises to store (basic info)
          fullWorkout.exercises.forEach(exercise => {
            const details = exerciseDetailsMap.get(exercise.exerciseId)
            addExercise({
              exerciseId: exercise.exerciseId,
              exerciseName: details?.name || exercise.exerciseName,
              exerciseNameHe: details?.nameHe || exercise.exerciseNameHe || '',
              imageUrl: details?.imageUrl || exercise.imageUrl || '',
              primaryMuscle: details?.primaryMuscle || '',
              category: details?.category || '',
            })
          })

          navigate('/workout/session')
          break
        }

        case 'planned': {
          // Case 3: Planned workout - UPDATE existing workout, change status to in_progress
          console.log('📋 Starting planned workout - updating existing record')

          // Update the existing workout status to in_progress
          await updateWorkoutHistory(workoutSummary.id, {
            status: 'in_progress',
            startTime: new Date(),
            date: new Date(),
          })

          // Store the workout ID so we can update the same record when finishing
          localStorage.setItem('continueWorkoutId', workoutSummary.id)
          localStorage.setItem('continueWorkoutMode', 'planned')

          // Store exercise data with target sets
          const exercisesWithSets = fullWorkout.exercises.map(exercise => {
            const details = exerciseDetailsMap.get(exercise.exerciseId)
            return {
              exerciseId: exercise.exerciseId,
              exerciseName: details?.name || exercise.exerciseName,
              exerciseNameHe: details?.nameHe || exercise.exerciseNameHe || '',
              imageUrl: details?.imageUrl || exercise.imageUrl || '',
              primaryMuscle: details?.primaryMuscle || '',
              sets: exercise.sets || [],
            }
          })
          localStorage.setItem('continueWorkoutData', JSON.stringify(exercisesWithSets))

          // Add exercises to store
          fullWorkout.exercises.forEach(exercise => {
            const details = exerciseDetailsMap.get(exercise.exerciseId)
            addExercise({
              exerciseId: exercise.exerciseId,
              exerciseName: details?.name || exercise.exerciseName,
              exerciseNameHe: details?.nameHe || exercise.exerciseNameHe || '',
              imageUrl: details?.imageUrl || exercise.imageUrl || '',
              primaryMuscle: details?.primaryMuscle || '',
              category: details?.category || '',
            })
          })

          navigate('/workout/session')
          break
        }

        default:
          navigate('/workout/session')
      }
    } catch (error) {
      console.error('Failed to continue workout:', error)
    }

    setContinueDialog({ isOpen: false, workout: null })
  }

  // Close dialog
  const handleCloseDialog = () => {
    setContinueDialog({ isOpen: false, workout: null })
  }

  // Get dialog message based on workout status (per spec 11.5)
  const getDialogMessage = (status: WorkoutCompletionStatus) => {
    switch (status) {
      case 'completed':
      case 'cancelled':
        return 'שים לב: אתה מתחיל אימון חדש מאפס עם אותם תרגילים'
      case 'in_progress':
      case 'partial':
        return 'שים לב: אתה ממשיך את האימון הקיים עם כל הנתונים שדיווחת'
      case 'planned':
        return 'שים לב: אתה מתחיל את האימון המתוכנן'
      default:
        return ''
    }
  }

  // Get dialog title based on workout status
  const getDialogTitle = (status: WorkoutCompletionStatus) => {
    switch (status) {
      case 'completed':
      case 'cancelled':
        return 'התחל אימון חדש'
      case 'in_progress':
      case 'partial':
        return 'המשך אימון'
      case 'planned':
        return 'התחל אימון מתוכנן'
      default:
        return 'התחל אימון'
    }
  }

  // Filter and sort workouts
  const { plannedWorkouts, otherWorkouts } = useMemo(() => {
    const now = new Date()
    const twoWeeksAgo = new Date()
    twoWeeksAgo.setDate(now.getDate() - 14)
    twoWeeksAgo.setHours(0, 0, 0, 0)

    // Filter: planned always shown, others only from last 2 weeks
    const filtered = workouts.filter(workout => {
      if (workout.status === 'planned') return true
      const workoutDate = new Date(workout.date)
      return workoutDate >= twoWeeksAgo
    })

    // Separate planned from others
    const planned = filtered
      .filter(w => w.status === 'planned')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()) // ascending by date

    const others = filtered
      .filter(w => w.status !== 'planned')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) // descending by date (newest first)

    return { plannedWorkouts: planned, otherWorkouts: others }
  }, [workouts])

  /* STATS CALCULATION - COMMENTED OUT FOR FUTURE USE
   * To restore stats cubes, uncomment this block and add Flame to lucide-react imports
   *
  const stats = useMemo(() => {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    monthStart.setHours(0, 0, 0, 0)
    const weekStart = new Date(now)
    const dayOfWeek = weekStart.getDay()
    weekStart.setDate(weekStart.getDate() - dayOfWeek)
    weekStart.setHours(0, 0, 0, 0)
    const monthlyWorkouts = workouts.filter(w => new Date(w.date) >= monthStart).length
    const weeklyWorkouts = workouts.filter(w => new Date(w.date) >= weekStart).length
    let streakDays = 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(today)
      checkDate.setDate(today.getDate() - i)
      const hasWorkout = workouts.some(w => {
        const workoutDate = new Date(w.date)
        workoutDate.setHours(0, 0, 0, 0)
        return workoutDate.getTime() === checkDate.getTime()
      })
      if (hasWorkout) streakDays++
      else if (i > 0) break
    }
    const totalVolume = workouts.reduce((sum, w) => sum + w.totalVolume, 0)
    return { monthlyWorkouts, weeklyWorkouts, streakDays, totalVolume }
  }, [workouts])
  */

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="spinner"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-6 animate-fade-in">
      {/* Header with back button */}
      <div className="flex items-start gap-3">
        <button
          onClick={() => navigate('/dashboard')}
          className="p-2 -m-2 text-text-secondary hover:text-text-primary transition-colors"
          aria-label="חזרה לדשבורד"
        >
          <ArrowRight size={24} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">תוכנית אימונים</h1>
          <p className="text-text-muted mt-1">האימונים שלך - עבר, הווה ועתיד</p>
        </div>
      </div>

      {/* Stats summary - REMOVED per request, stats useMemo kept for future use */}

      {/* Planned workouts section - pinned to top */}
      {plannedWorkouts.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-workout-status-planned-text mb-3 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            אימונים מתוכננים
          </h2>
          <div className="space-y-3">
            {plannedWorkouts.map((workout) => (
              <WorkoutCard
                key={workout.id}
                workout={workout}
                type="planned"
                isExpanded={expandedWorkoutId === workout.id}
                statusConfig={getStatusConfig(workout.status)}
                expandedWorkoutDetails={expandedWorkoutDetails}
                loadingDetails={loadingDetails}
                dynamicMuscleNames={dynamicMuscleNames}
                onToggleExpand={() => toggleWorkoutExpanded(workout.id)}
                onDeleteClick={(e) => handleDeleteClick(e, workout)}
                onContinueClick={() => handleContinueClick(workout)}
                getStatusBadge={getStatusBadge}
                formatDate={formatDate}
                formatDuration={formatDuration}
                estimateCalories={estimateCalories}
              />
            ))}
          </div>
        </div>
      )}

      {/* Separator if both sections exist */}
      {plannedWorkouts.length > 0 && otherWorkouts.length > 0 && (
        <div className="border-t border-dark-border" />
      )}

      {/* Recent workouts section */}
      {otherWorkouts.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-text-primary mb-3">שבועיים אחרונים</h2>
          <div className="space-y-3">
            {otherWorkouts.map((workout) => (
              <WorkoutCard
                key={workout.id}
                workout={workout}
                type="regular"
                isExpanded={expandedWorkoutId === workout.id}
                statusConfig={getStatusConfig(workout.status)}
                expandedWorkoutDetails={expandedWorkoutDetails}
                loadingDetails={loadingDetails}
                dynamicMuscleNames={dynamicMuscleNames}
                onToggleExpand={() => toggleWorkoutExpanded(workout.id)}
                onDeleteClick={(e) => handleDeleteClick(e, workout)}
                onContinueClick={() => handleContinueClick(workout)}
                getStatusBadge={getStatusBadge}
                formatDate={formatDate}
                formatDuration={formatDuration}
                estimateCalories={estimateCalories}
              />
            ))}
          </div>
        </div>
      )}

      {plannedWorkouts.length === 0 && otherWorkouts.length === 0 && (
        <div className="text-center py-12">
          <Dumbbell className="w-16 h-16 text-text-muted mx-auto mb-4" />
          <h3 className="text-lg font-medium text-text-primary mb-2">עדיין אין אימונים</h3>
          <p className="text-text-muted mb-6">התחל את האימון הראשון שלך!</p>
          <Link to="/exercises" className="btn-neon inline-flex items-center gap-2">
            התחל אימון
          </Link>
        </div>
      )}

      {/* Confirmation Dialog */}
      {continueDialog.isOpen && continueDialog.workout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-dark-surface border border-dark-border rounded-2xl p-6 max-w-sm w-full animate-scale-in">
            {/* Close button */}
            <button
              onClick={handleCloseDialog}
              className="absolute top-4 left-4 p-2 text-text-muted hover:text-text-primary transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Dialog content */}
            <div className="text-center">
              <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${
                continueDialog.workout.status === 'completed'
                  ? 'bg-workout-status-completed-bg'
                  : continueDialog.workout.status === 'planned'
                    ? 'bg-workout-status-planned-bg'
                    : 'bg-workout-status-in-progress-bg'
              }`}>
                <Play className={`w-8 h-8 ${
                  continueDialog.workout.status === 'completed'
                    ? 'text-workout-status-completed-text'
                    : continueDialog.workout.status === 'planned'
                      ? 'text-workout-status-planned-text'
                      : 'text-workout-status-in-progress-text'
                }`} />
              </div>

              <h3 className="text-xl font-bold text-text-primary mb-2">
                {getDialogTitle(continueDialog.workout.status)}
              </h3>

              <p className="text-text-muted mb-6">
                {getDialogMessage(continueDialog.workout.status)}
              </p>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleCloseDialog}
                  className="flex-1 py-3 px-4 bg-dark-card hover:bg-dark-border text-text-primary font-medium rounded-xl transition-colors"
                >
                  ביטול
                </button>
                <button
                  onClick={handleConfirmContinue}
                  className="flex-1 py-3 px-4 bg-primary-400 hover:bg-primary-500 text-white font-medium rounded-xl transition-colors"
                >
                  אישור
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteDialog.isOpen && deleteDialog.workout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in">
          <div className="bg-dark-surface rounded-2xl max-w-sm w-full shadow-xl animate-scale-in">
            <div className="p-6 text-center">
              {/* Close button */}
              <button
                onClick={() => setDeleteDialog({ isOpen: false, workout: null })}
                className="absolute top-4 right-4 p-2 text-text-muted hover:text-text-primary"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Icon */}
              <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center bg-red-400/20">
                <Trash2 className="w-8 h-8 text-red-400" />
              </div>

              <h3 className="text-xl font-bold text-text-primary mb-2">
                מחיקת אימון
              </h3>

              <p className="text-text-muted mb-6">
                האם אתה בטוח שברצונך למחוק את האימון "{deleteDialog.workout.name}"?
                <br />
                <span className="text-red-400 text-sm">פעולה זו לא ניתנת לביטול</span>
              </p>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteDialog({ isOpen: false, workout: null })}
                  className="flex-1 py-3 px-4 bg-dark-card hover:bg-dark-border text-text-primary font-medium rounded-xl transition-colors"
                >
                  ביטול
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="flex-1 py-3 px-4 bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl transition-colors"
                >
                  מחק
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
