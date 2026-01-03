import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Calendar, Dumbbell, TrendingUp, Trophy, ChevronDown, ChevronUp, CheckCircle, AlertCircle, XCircle, Flame, Play, X, Clock, Zap } from 'lucide-react'
import { getUserWorkoutHistory, getWorkoutById } from '@/lib/firebase/workoutHistory'
import { useAuthStore } from '@/domains/authentication/store'
import { useWorkoutBuilderStore } from '../store'
import type { WorkoutHistorySummary, WorkoutHistoryEntry, WorkoutCompletionStatus } from '../types'

// Confirmation dialog for continuing workout
interface ContinueDialogState {
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

  useEffect(() => {
    loadWorkouts()
  }, [user])

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
    const diff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

    if (diff === 0) return 'היום'
    if (diff === 1) return 'אתמול'
    if (diff < 7) return `לפני ${diff} ימים`

    return date.toLocaleDateString('he-IL', {
      day: 'numeric',
      month: 'short',
    })
  }

  const formatVolume = (kg: number) => {
    if (kg >= 1000) {
      return `${(kg / 1000).toFixed(1)}T`
    }
    return `${kg}kg`
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
          label: 'בוטל',
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

  // Confirm and navigate to workout
  const handleConfirmContinue = async () => {
    if (!continueDialog.workout) return

    const workoutSummary = continueDialog.workout

    try {
      // Load full workout details
      const fullWorkout = await getWorkoutById(workoutSummary.id)

      if (!fullWorkout || !fullWorkout.exercises) {
        console.error('Could not load workout details')
        setContinueDialog({ isOpen: false, workout: null })
        return
      }

      // Clear any existing workout in the store
      clearWorkout()

      // Add exercises to the store
      fullWorkout.exercises.forEach(exercise => {
        addExercise({
          exerciseId: exercise.exerciseId,
          exerciseName: exercise.exerciseName,
          exerciseNameHe: exercise.exerciseNameHe || '',
          imageUrl: '',
          primaryMuscle: '',
        })
      })

      if (workoutSummary.status === 'completed') {
        // Completed workout: start fresh with same exercises
        // The workout in store already has the exercises, navigate to active workout
        navigate('/workout/active')
      } else {
        // In progress or planned: continue the existing workout
        // Store the workout ID so we can update the same record
        localStorage.setItem('continueWorkoutId', workoutSummary.id)
        navigate('/workout/active')
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

  // Get dialog message based on workout status
  const getDialogMessage = (status: WorkoutCompletionStatus) => {
    if (status === 'completed') {
      return 'שים לב: אתה מתחיל אימון מהתחלה'
    }
    return 'שים לב: אתה ממשיך את האימון הקיים'
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

  // Calculate stats
  const stats = useMemo(() => {
    const now = new Date()

    // Start of current month (1st day at 00:00)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    monthStart.setHours(0, 0, 0, 0)

    // Start of current week (Sunday at 00:00)
    const weekStart = new Date(now)
    const dayOfWeek = weekStart.getDay() // 0 = Sunday
    weekStart.setDate(weekStart.getDate() - dayOfWeek)
    weekStart.setHours(0, 0, 0, 0)

    // Monthly workouts (from 1st of month)
    const monthlyWorkouts = workouts.filter(w => {
      const workoutDate = new Date(w.date)
      return workoutDate >= monthStart
    }).length

    // Weekly workouts (from Sunday)
    const weeklyWorkouts = workouts.filter(w => {
      const workoutDate = new Date(w.date)
      return workoutDate >= weekStart
    }).length

    // Calculate streak (consecutive days with workouts)
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

      if (hasWorkout) {
        streakDays++
      } else if (i > 0) {
        // Allow today to not have a workout yet
        break
      }
    }

    // Total volume
    const totalVolume = workouts.reduce((sum, w) => sum + w.totalVolume, 0)

    return {
      monthlyWorkouts,
      weeklyWorkouts,
      streakDays,
      totalVolume,
    }
  }, [workouts])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="spinner"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">תוכנית אימונים</h1>
        <p className="text-text-muted mt-1">האימונים שלך - עבר, הווה ועתיד</p>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Cube 1: Monthly workouts */}
        <div className="card-neon !p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-400/20 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <p className="text-xl font-bold text-text-primary">{stats.monthlyWorkouts}</p>
              <p className="text-text-muted text-xs">אימונים החודש</p>
            </div>
          </div>
        </div>

        {/* Cube 2: Weekly workouts */}
        <div className="card-neon !p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-400/20 flex items-center justify-center">
              <Dumbbell className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-xl font-bold text-text-primary">{stats.weeklyWorkouts}</p>
              <p className="text-text-muted text-xs">אימונים השבוע</p>
            </div>
          </div>
        </div>

        {/* Cube 3: Streak days */}
        <div className="card-neon !p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-400/20 flex items-center justify-center">
              <Flame className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <p className="text-xl font-bold text-text-primary">{stats.streakDays}</p>
              <p className="text-text-muted text-xs">ימים ברצף</p>
            </div>
          </div>
        </div>

        {/* Cube 4: Total volume */}
        <div className="card-neon !p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent-400/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-accent-400" />
            </div>
            <div>
              <p className="text-xl font-bold text-text-primary">{formatVolume(stats.totalVolume)}</p>
              <p className="text-text-muted text-xs">נפח כולל</p>
            </div>
          </div>
        </div>
      </div>

      {/* Planned workouts section - pinned to top */}
      {plannedWorkouts.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-workout-status-planned-text mb-3 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            אימונים מתוכננים
          </h2>
          <div className="space-y-3">
            {plannedWorkouts.map((workout) => {
              const statusConfig = getStatusConfig(workout.status)
              const isExpanded = expandedWorkoutId === workout.id
              return (
                <div
                  key={workout.id}
                  className={`rounded-xl transition-colors border-2 ${statusConfig.bgClass} ${statusConfig.borderClass}`}
                >
                  {/* Card Header - clickable to expand */}
                  <div
                    className="p-4 cursor-pointer"
                    onClick={() => toggleWorkoutExpanded(workout.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <button className="p-1">
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-text-muted" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-text-muted" />
                          )}
                        </button>
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${statusConfig.iconBgClass}`}>
                          <Dumbbell className={`w-6 h-6 ${statusConfig.iconTextClass}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-text-primary">
                              {workout.name}
                            </p>
                            {getStatusBadge(workout.status)}
                          </div>
                          <p className="text-text-muted text-sm mt-1">
                            {formatDate(workout.date)} • {workout.totalExercises} תרגילים
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-dark-border/50 pt-4 space-y-4">
                      {/* Stats: Time and Calories */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 bg-dark-card/50 rounded-xl">
                          <div className="flex items-center justify-center gap-2 text-text-muted mb-1">
                            <Clock className="w-4 h-4" />
                            <span className="text-sm">זמן</span>
                          </div>
                          <p className="text-lg font-semibold text-text-primary">
                            {formatDuration(workout.duration)}
                          </p>
                        </div>
                        <div className="text-center p-3 bg-dark-card/50 rounded-xl">
                          <div className="flex items-center justify-center gap-2 text-text-muted mb-1">
                            <Zap className="w-4 h-4" />
                            <span className="text-sm">קלוריות</span>
                          </div>
                          <p className="text-lg font-semibold text-text-primary">
                            {estimateCalories(workout.duration, workout.totalVolume)}
                          </p>
                        </div>
                      </div>

                      {/* Continue button */}
                      <button
                        onClick={() => handleContinueClick(workout)}
                        className="w-full py-3 px-4 bg-primary-400 hover:bg-primary-500 text-white font-medium rounded-xl flex items-center justify-center gap-2 transition-colors"
                      >
                        <Play className="w-5 h-5" />
                        המשך לאימון
                      </button>

                      {/* Exercise List */}
                      {loadingDetails ? (
                        <div className="flex items-center justify-center py-4">
                          <div className="spinner"></div>
                        </div>
                      ) : expandedWorkoutDetails?.exercises && expandedWorkoutDetails.exercises.length > 0 ? (
                        <div className="space-y-3">
                          {expandedWorkoutDetails.exercises.map((exercise, idx) => (
                            <div key={idx} className="bg-dark-card/30 rounded-xl p-3">
                              <p className="font-medium text-text-primary mb-2">
                                {exercise.exerciseNameHe || exercise.exerciseName}
                              </p>
                              <div className="flex flex-wrap gap-2 text-sm text-text-muted">
                                <span className="px-2 py-0.5 bg-dark-border/50 rounded">
                                  סטים: {exercise.sets?.length || 0}
                                </span>
                                <span className="px-2 py-0.5 bg-dark-border/50 rounded">
                                  חזרות: {exercise.sets?.[0]?.targetReps || exercise.sets?.[0]?.actualReps || '--'}
                                </span>
                                <span className="px-2 py-0.5 bg-dark-border/50 rounded">
                                  משקל: {exercise.sets?.[0]?.targetWeight || exercise.sets?.[0]?.actualWeight || '--'} ק"ג
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}

                      {/* Link to details */}
                      <Link
                        to={`/workout/history/${workout.id}`}
                        className="block text-center text-text-muted hover:text-primary-400 text-sm"
                      >
                        צפה בפרטים
                      </Link>
                    </div>
                  )}
                </div>
              )
            })}
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
            {otherWorkouts.map((workout) => {
              const statusConfig = getStatusConfig(workout.status)
              const isExpanded = expandedWorkoutId === workout.id
              return (
                <div
                  key={workout.id}
                  className={`rounded-xl transition-colors border-2 ${statusConfig.bgClass} ${statusConfig.borderClass}`}
                >
                  {/* Card Header - clickable to expand */}
                  <div
                    className="p-4 cursor-pointer"
                    onClick={() => toggleWorkoutExpanded(workout.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <button className="p-1">
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-text-muted" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-text-muted" />
                          )}
                        </button>
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${statusConfig.iconBgClass}`}>
                          <Dumbbell className={`w-6 h-6 ${statusConfig.iconTextClass}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-text-primary">
                              {workout.name}
                            </p>
                            {getStatusBadge(workout.status)}
                            {workout.personalRecords > 0 && (
                              <span className="flex items-center gap-1 px-2 py-0.5 bg-yellow-400/20 rounded-full">
                                <Trophy className="w-3 h-3 text-yellow-400" />
                                <span className="text-yellow-400 text-xs">{workout.personalRecords} PR</span>
                              </span>
                            )}
                          </div>
                          <p className="text-text-muted text-sm mt-1">
                            {formatDate(workout.date)} • {workout.duration} דקות • {workout.completedExercises}/{workout.totalExercises} תרגילים
                          </p>
                        </div>
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-text-primary">{formatVolume(workout.totalVolume)}</p>
                        <p className="text-text-muted text-sm">נפח</p>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-dark-border/50 pt-4 space-y-4">
                      {/* Stats: Time and Calories */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 bg-dark-card/50 rounded-xl">
                          <div className="flex items-center justify-center gap-2 text-text-muted mb-1">
                            <Clock className="w-4 h-4" />
                            <span className="text-sm">זמן</span>
                          </div>
                          <p className="text-lg font-semibold text-text-primary">
                            {formatDuration(workout.duration)}
                          </p>
                        </div>
                        <div className="text-center p-3 bg-dark-card/50 rounded-xl">
                          <div className="flex items-center justify-center gap-2 text-text-muted mb-1">
                            <Zap className="w-4 h-4" />
                            <span className="text-sm">קלוריות</span>
                          </div>
                          <p className="text-lg font-semibold text-text-primary">
                            {estimateCalories(workout.duration, workout.totalVolume)}
                          </p>
                        </div>
                      </div>

                      {/* Continue button */}
                      <button
                        onClick={() => handleContinueClick(workout)}
                        className="w-full py-3 px-4 bg-primary-400 hover:bg-primary-500 text-white font-medium rounded-xl flex items-center justify-center gap-2 transition-colors"
                      >
                        <Play className="w-5 h-5" />
                        המשך לאימון
                      </button>

                      {/* Exercise List */}
                      {loadingDetails ? (
                        <div className="flex items-center justify-center py-4">
                          <div className="spinner"></div>
                        </div>
                      ) : expandedWorkoutDetails?.exercises && expandedWorkoutDetails.exercises.length > 0 ? (
                        <div className="space-y-3">
                          {expandedWorkoutDetails.exercises.map((exercise, idx) => (
                            <div key={idx} className="bg-dark-card/30 rounded-xl p-3">
                              <p className="font-medium text-text-primary mb-2">
                                {exercise.exerciseNameHe || exercise.exerciseName}
                              </p>
                              <div className="flex flex-wrap gap-2 text-sm text-text-muted">
                                <span className="px-2 py-0.5 bg-dark-border/50 rounded">
                                  סטים: {exercise.sets?.length || 0}
                                </span>
                                <span className="px-2 py-0.5 bg-dark-border/50 rounded">
                                  חזרות: {exercise.sets?.[0]?.targetReps || exercise.sets?.[0]?.actualReps || '--'}
                                </span>
                                <span className="px-2 py-0.5 bg-dark-border/50 rounded">
                                  משקל: {exercise.sets?.[0]?.targetWeight || exercise.sets?.[0]?.actualWeight || '--'} ק"ג
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}

                      {/* Link to details */}
                      <Link
                        to={`/workout/history/${workout.id}`}
                        className="block text-center text-text-muted hover:text-primary-400 text-sm"
                      >
                        צפה בפרטים
                      </Link>
                    </div>
                  )}
                </div>
              )
            })}
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
                  : 'bg-workout-status-in-progress-bg'
              }`}>
                <Play className={`w-8 h-8 ${
                  continueDialog.workout.status === 'completed'
                    ? 'text-workout-status-completed-text'
                    : 'text-workout-status-in-progress-text'
                }`} />
              </div>

              <h3 className="text-xl font-bold text-text-primary mb-2">
                {continueDialog.workout.status === 'completed' ? 'התחל אימון חדש' : 'המשך אימון'}
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
    </div>
  )
}
