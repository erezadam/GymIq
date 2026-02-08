import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Calendar, Dumbbell, CheckCircle, AlertCircle, XCircle, Play, X, ArrowRight, Trash2, ClipboardEdit } from 'lucide-react'
// Note: Trophy, ChevronDown, ChevronUp, Clock, Zap moved to WorkoutCard
import { getUserWorkoutHistory, getWorkoutById, updateWorkoutHistory, softDeleteWorkout } from '@/lib/firebase/workoutHistory'
import { getMuscleIdToNameHeMap } from '@/lib/firebase/muscles'
import { getActiveBandTypes } from '@/lib/firebase/bandTypes'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/domains/authentication/store'
import { useWorkoutBuilderStore } from '../store'
import { exerciseService } from '@/domains/exercises/services'
import { WorkoutCard } from '@/shared/components/WorkoutCard'
import { AIBundleCard } from './ai-trainer/AIBundleCard'
import { TrainerProgramCard } from '@/domains/trainer/components/ProgramView/TrainerProgramCard'
import { useTraineeProgram } from '@/domains/trainer/hooks/useTraineeProgram'
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

// Dialog for empty workout (in_progress with no reported sets)
interface EmptyWorkoutDialogState {
  isOpen: boolean
  workout: WorkoutHistorySummary | null
}

export default function WorkoutHistory() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { addExercise, clearWorkout } = useWorkoutBuilderStore()
  const { program: trainerProgram, standaloneWorkouts, isLoading: trainerProgramLoading, refreshProgram } = useTraineeProgram()
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
  const [emptyWorkoutDialog, setEmptyWorkoutDialog] = useState<EmptyWorkoutDialogState>({
    isOpen: false,
    workout: null,
  })
  const [deleteReasonDialog, setDeleteReasonDialog] = useState<{
    isOpen: boolean; workout: WorkoutHistorySummary | null; selectedReason: string
  }>({ isOpen: false, workout: null, selectedReason: '' })
  const [dynamicMuscleNames, setDynamicMuscleNames] = useState<Record<string, string>>({})
  const [bandNameMap, setBandNameMap] = useState<Record<string, string>>({})

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

  // Load band names from Firebase
  useEffect(() => {
    const loadBandNames = async () => {
      try {
        const bands = await getActiveBandTypes()
        const map: Record<string, string> = {}
        bands.forEach(band => {
          map[band.id] = band.name
        })
        setBandNameMap(map)
      } catch (error) {
        console.error('Failed to load band names:', error)
      }
    }
    loadBandNames()
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
    if (workout.reportedBy) {
      // Trainer-reported workout - must choose reason
      setDeleteReasonDialog({ isOpen: true, workout, selectedReason: '' })
    } else {
      setDeleteDialog({ isOpen: true, workout })
    }
  }

  // Handle delete confirmation (regular workout - no reason needed)
  const handleDeleteConfirm = async () => {
    if (!deleteDialog.workout) return

    try {
      await softDeleteWorkout(deleteDialog.workout.id)
      setWorkouts((prev) => prev.filter((w) => w.id !== deleteDialog.workout!.id))
      toast.success('האימון נמחק בהצלחה')
    } catch (error) {
      console.error('Failed to soft-delete workout:', error)
      toast.error('שגיאה במחיקת האימון')
    } finally {
      setDeleteDialog({ isOpen: false, workout: null })
    }
  }

  // Handle delete with reason (trainer-reported workout)
  const handleDeleteWithReason = async () => {
    if (!deleteReasonDialog.workout || !deleteReasonDialog.selectedReason) return

    try {
      await softDeleteWorkout(deleteReasonDialog.workout.id, deleteReasonDialog.selectedReason)
      setWorkouts((prev) => prev.filter((w) => w.id !== deleteReasonDialog.workout!.id))
      toast.success('האימון נמחק בהצלחה')
    } catch (error) {
      console.error('Failed to soft-delete workout:', error)
      toast.error('שגיאה במחיקת האימון')
    } finally {
      setDeleteReasonDialog({ isOpen: false, workout: null, selectedReason: '' })
    }
  }

  // Handle delete bundle (delete all workouts in bundle)
  const handleDeleteBundle = async (_bundleId: string, workoutIds: string[]) => {
    if (!window.confirm(`האם למחוק את כל ${workoutIds.length} האימונים במקבץ?`)) {
      return
    }

    try {
      await Promise.all(workoutIds.map(id => softDeleteWorkout(id)))
      setWorkouts((prev) => prev.filter((w) => !workoutIds.includes(w.id)))
      toast.success('המקבץ נמחק בהצלחה')
    } catch (error) {
      console.error('Failed to delete bundle:', error)
      toast.error('שגיאה במחיקת המקבץ')
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

  // Helper: Check if workout has any reported sets (weight/reps/time/intensity/speed/distance)
  const hasReportedSets = (workout: WorkoutHistoryEntry): boolean => {
    return workout.exercises?.some(ex =>
      ex.sets?.some(set => {
        // Check actual values - these indicate user has reported data
        const weight = set.actualWeight ?? 0
        const reps = set.actualReps ?? 0
        // Also check extended fields for non-standard report types (cardio, time-based, etc.)
        const time = (set as any).time ?? 0
        const intensity = (set as any).intensity ?? 0
        const speed = (set as any).speed ?? 0
        const distance = (set as any).distance ?? 0
        return weight > 0 || reps > 0 || time > 0 || intensity > 0 || speed > 0 || distance > 0
      })
    ) ?? false
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

      // Fetch exercise details to get imageUrl, reportType, and English name for each exercise
      const exerciseDetailsMap = new Map<string, { imageUrl: string; primaryMuscle: string; category: string; name: string; nameHe: string; equipment: string; reportType?: string }>()
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
                equipment: exerciseDetails.equipment || '',
                reportType: exerciseDetails.reportType,
              })
            }
          } catch (err) {
            console.warn(`Could not fetch details for exercise ${ex.exerciseId}:`, err)
          }
        })
      )

      // Clear any existing workout in the store
      clearWorkout()

      // Check if this is an in_progress/cancelled/partial workout with no reported sets
      if ((workoutSummary.status === 'in_progress' || workoutSummary.status === 'partial' || workoutSummary.status === 'cancelled') && !hasReportedSets(fullWorkout)) {
        console.log('📋 Detected workout with no reported sets, status:', workoutSummary.status)
        setContinueDialog({ isOpen: false, workout: null })
        setEmptyWorkoutDialog({ isOpen: true, workout: workoutSummary })
        return
      }

      // Handle the different cases based on status
      switch (workoutSummary.status) {
        case 'completed': {
          // Completed workout - create NEW workout with exercises but EMPTY sets
          console.log('📋 Creating new workout from completed - exercises only, no set data')

          fullWorkout.exercises.forEach(exercise => {
            const details = exerciseDetailsMap.get(exercise.exerciseId)
            addExercise({
              exerciseId: exercise.exerciseId,
              exerciseName: details?.name || exercise.exerciseName,
              exerciseNameHe: details?.nameHe || exercise.exerciseNameHe || '',
              imageUrl: details?.imageUrl || exercise.imageUrl || '',
              primaryMuscle: details?.primaryMuscle || '',
              category: details?.category || '',
              equipment: details?.equipment || '',
              reportType: details?.reportType,
            })
          })

          // Navigate to active workout - store will create new workout
          navigate('/workout/session')
          break
        }

        case 'cancelled':  // "ללא דיווח" - מעדכן אימון קיים, לא יוצר חדש
        case 'in_progress':
        case 'partial': {
          // cancelled/in_progress/partial - UPDATE existing workout, copy all set data
          console.log('📋 Continuing existing workout - updating workout ID:', workoutSummary.id)

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
          // Store AI recommendations if available
          if (fullWorkout.aiRecommendations) {
            localStorage.setItem('continueAIRecommendations', JSON.stringify(fullWorkout.aiRecommendations))
          }

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
              equipment: details?.equipment || '',
              reportType: details?.reportType,
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
          // Store AI recommendations if available
          if (fullWorkout.aiRecommendations) {
            localStorage.setItem('continueAIRecommendations', JSON.stringify(fullWorkout.aiRecommendations))
          }

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
              equipment: details?.equipment || '',
              reportType: details?.reportType,
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

  // Handle empty workout dialog options
  const handleEmptyWorkoutContinue = async () => {
    // Continue with the empty workout - open it with the same exercises
    if (!emptyWorkoutDialog.workout) return

    const workoutSummary = emptyWorkoutDialog.workout
    try {
      const fullWorkout = await getWorkoutById(workoutSummary.id)
      if (!fullWorkout || !fullWorkout.exercises) return

      // Fetch full exercise details (category, primaryMuscle, equipment, etc.)
      const exerciseDetailsMap = new Map<string, { imageUrl: string; primaryMuscle: string; category: string; name: string; nameHe: string; equipment: string; reportType?: string }>()
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
                equipment: exerciseDetails.equipment || '',
                reportType: exerciseDetails.reportType,
              })
            }
          } catch (err) {
            console.warn(`Could not fetch details for exercise ${ex.exerciseId}:`, err)
          }
        })
      )

      clearWorkout()

      // IMPORTANT: Set localStorage BEFORE addExercise() calls!
      // addExercise triggers useEffect in useActiveWorkout, which reads these values
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
      localStorage.setItem('continueWorkoutId', workoutSummary.id)
      localStorage.setItem('continueWorkoutMode', 'in_progress')
      // Store AI recommendations if available
      if (fullWorkout.aiRecommendations) {
        localStorage.setItem('continueAIRecommendations', JSON.stringify(fullWorkout.aiRecommendations))
      }

      // Now add exercises to store (this triggers useActiveWorkout initialization)
      fullWorkout.exercises.forEach(exercise => {
        const details = exerciseDetailsMap.get(exercise.exerciseId)
        addExercise({
          exerciseId: exercise.exerciseId,
          exerciseName: details?.name || exercise.exerciseName,
          exerciseNameHe: details?.nameHe || exercise.exerciseNameHe || '',
          imageUrl: details?.imageUrl || exercise.imageUrl || '',
          primaryMuscle: details?.primaryMuscle || '',
          category: details?.category || '',
          equipment: details?.equipment || '',
          reportType: details?.reportType,
        })
      })

      navigate('/workout/session')
    } catch (error) {
      console.error('Failed to continue empty workout:', error)
    }
    setEmptyWorkoutDialog({ isOpen: false, workout: null })
  }

  const handleEmptyWorkoutRestart = () => {
    // Start fresh - go to exercise selection
    setEmptyWorkoutDialog({ isOpen: false, workout: null })
    clearWorkout()
    navigate('/exercises')
  }

  const handleEmptyWorkoutDelete = async () => {
    if (!emptyWorkoutDialog.workout) return

    try {
      await softDeleteWorkout(emptyWorkoutDialog.workout.id)
      setWorkouts((prev) => prev.filter((w) => w.id !== emptyWorkoutDialog.workout!.id))
      toast.success('האימון נמחק בהצלחה')
    } catch (error) {
      console.error('Failed to delete workout:', error)
      toast.error('שגיאה במחיקת האימון')
    }
    setEmptyWorkoutDialog({ isOpen: false, workout: null })
  }

  // Get dialog message based on workout status (per spec 11.5)
  const getDialogMessage = (status: WorkoutCompletionStatus) => {
    switch (status) {
      case 'completed':
        return 'שים לב: אתה מתחיל אימון חדש מאפס עם אותם תרגילים'
      case 'cancelled':  // "ללא דיווח" - מתנהג כמו in_progress
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
        return 'התחל אימון חדש'
      case 'cancelled':  // "ללא דיווח" - מתנהג כמו in_progress
      case 'in_progress':
      case 'partial':
        return 'המשך אימון'
      case 'planned':
        return 'התחל אימון מתוכנן'
      default:
        return 'התחל אימון'
    }
  }

  // Filter and sort workouts, group AI bundles
  const { plannedWorkouts, otherWorkouts, aiBundles, singleAIWorkouts } = useMemo(() => {
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

    // Group AI workouts by bundleId
    const bundleMap = new Map<string, WorkoutHistorySummary[]>()
    const nonBundledWorkouts: WorkoutHistorySummary[] = []
    const singleAI: WorkoutHistorySummary[] = []

    filtered.forEach(workout => {
      // Completed AI workouts show in "שבועיים אחרונים" like regular workouts
      const isCompletedAI = workout.source === 'ai_trainer' && workout.status === 'completed'

      if (isCompletedAI) {
        nonBundledWorkouts.push(workout)
      } else if (workout.bundleId) {
        // Part of a bundle (non-completed)
        const existing = bundleMap.get(workout.bundleId) || []
        existing.push(workout)
        bundleMap.set(workout.bundleId, existing)
      } else if (workout.source === 'ai_trainer') {
        // Single AI workout (non-completed, no bundle)
        singleAI.push(workout)
      } else {
        // Regular workout
        nonBundledWorkouts.push(workout)
      }
    })

    // Convert bundle map to array, filter out empty bundles (all completed)
    const bundles = Array.from(bundleMap.entries())
      .map(([bundleId, bundleWorkouts]) => ({
        bundleId,
        workouts: bundleWorkouts.sort((a, b) => (a.aiWorkoutNumber || 0) - (b.aiWorkoutNumber || 0)),
      }))
      .filter(bundle => bundle.workouts.some(w => w.status !== 'completed'))

    // Separate planned from others (non-AI workouts)
    const planned = nonBundledWorkouts
      .filter(w => w.status === 'planned')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    const others = nonBundledWorkouts
      .filter(w => w.status !== 'planned')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    return {
      plannedWorkouts: planned,
      otherWorkouts: others,
      aiBundles: bundles,
      singleAIWorkouts: singleAI.filter(w => w.status !== 'completed'),
    }
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

      {/* Trainer Program section */}
      {!trainerProgramLoading && trainerProgram && (
        <div>
          <h2 className="text-lg font-semibold text-accent-orange mb-3 flex items-center gap-2">
            <Dumbbell className="w-5 h-5" />
            תוכנית מאמן
          </h2>
          <div className="space-y-3">
            <TrainerProgramCard program={trainerProgram} onDisconnected={refreshProgram} />
          </div>
        </div>
      )}

      {/* Standalone Workouts from trainer */}
      {!trainerProgramLoading && standaloneWorkouts.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-text-muted mb-2 flex items-center gap-2">
            <ClipboardEdit className="w-4 h-4 text-accent-orange" />
            אימונים בודדים מהמאמן ({standaloneWorkouts.length})
          </h2>
          <div className="space-y-2">
            {standaloneWorkouts.map((sw) => (
              <TrainerProgramCard key={sw.id} program={sw} onDisconnected={refreshProgram} />
            ))}
          </div>
        </div>
      )}

      {/* Separator if trainer program and AI sections exist */}
      {(trainerProgram || standaloneWorkouts.length > 0) && (aiBundles.length > 0 || singleAIWorkouts.length > 0) && (
        <div className="border-t border-dark-border" />
      )}

      {/* AI Bundles section */}
      {(aiBundles.length > 0 || singleAIWorkouts.length > 0) && (
        <div>
          <h2 className="text-lg font-semibold text-purple-400 mb-3 flex items-center gap-2">
            <span className="text-xl">🤖</span>
            אימוני AI
          </h2>
          <div className="space-y-3">
            {/* AI Bundles */}
            {aiBundles.map((bundle) => (
              <AIBundleCard
                key={bundle.bundleId}
                bundleId={bundle.bundleId}
                workouts={bundle.workouts}
                dynamicMuscleNames={dynamicMuscleNames}
                onWorkoutClick={handleContinueClick}
                onDeleteBundle={handleDeleteBundle}
                formatDate={formatDate}
                getStatusBadge={getStatusBadge}
              />
            ))}
            {/* Single AI Workouts (no bundle) */}
            {singleAIWorkouts.map((workout) => (
              <WorkoutCard
                key={workout.id}
                workout={workout}
                type="planned"
                isExpanded={expandedWorkoutId === workout.id}
                statusConfig={{
                  ...getStatusConfig(workout.status),
                  borderClass: 'border-purple-500',
                  iconBgClass: 'bg-purple-500/20',
                  iconTextClass: 'text-purple-400',
                }}
                expandedWorkoutDetails={expandedWorkoutDetails}
                loadingDetails={loadingDetails}
                dynamicMuscleNames={dynamicMuscleNames}
                bandNameMap={bandNameMap}
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

      {/* Separator if AI and planned sections exist */}
      {(aiBundles.length > 0 || singleAIWorkouts.length > 0) && plannedWorkouts.length > 0 && (
        <div className="border-t border-dark-border" />
      )}

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
                bandNameMap={bandNameMap}
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
                bandNameMap={bandNameMap}
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

      {plannedWorkouts.length === 0 && otherWorkouts.length === 0 && aiBundles.length === 0 && singleAIWorkouts.length === 0 && !trainerProgram && (
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

      {/* Delete Reason Dialog - for trainer-reported workouts */}
      {deleteReasonDialog.isOpen && deleteReasonDialog.workout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in">
          <div className="bg-dark-surface rounded-2xl max-w-sm w-full shadow-xl animate-scale-in relative">
            <div className="p-6">
              <button
                onClick={() => setDeleteReasonDialog({ isOpen: false, workout: null, selectedReason: '' })}
                className="absolute top-4 right-4 p-2 text-text-muted hover:text-text-primary"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center mb-4">
                <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center bg-red-400/20">
                  <Trash2 className="w-8 h-8 text-red-400" />
                </div>
                <h3 className="text-xl font-bold text-text-primary mb-2">מחיקת אימון</h3>
                <p className="text-text-muted text-sm">אימון זה דווח על ידי המאמן. בחר סיבה למחיקה:</p>
              </div>

              <div className="space-y-2 mb-6">
                {[
                  'האימון לא בוצע בפועל',
                  'דווח בטעות',
                  'נתונים שגויים',
                  'אחר',
                ].map((reason) => (
                  <button
                    key={reason}
                    onClick={() => setDeleteReasonDialog(prev => ({ ...prev, selectedReason: reason }))}
                    className={`w-full text-right py-3 px-4 rounded-xl transition-colors ${
                      deleteReasonDialog.selectedReason === reason
                        ? 'bg-red-500/20 border border-red-500/50 text-red-400'
                        : 'bg-dark-card hover:bg-dark-border text-text-primary border border-transparent'
                    }`}
                  >
                    {reason}
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteReasonDialog({ isOpen: false, workout: null, selectedReason: '' })}
                  className="flex-1 py-3 px-4 bg-dark-card hover:bg-dark-border text-text-primary font-medium rounded-xl transition-colors"
                >
                  ביטול
                </button>
                <button
                  onClick={handleDeleteWithReason}
                  disabled={!deleteReasonDialog.selectedReason}
                  className="flex-1 py-3 px-4 bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors"
                >
                  מחק
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty Workout Dialog - for in_progress with no reported sets */}
      {emptyWorkoutDialog.isOpen && emptyWorkoutDialog.workout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-dark-surface border border-dark-border rounded-2xl p-6 max-w-sm w-full animate-scale-in">
            {/* Close button */}
            <button
              onClick={() => setEmptyWorkoutDialog({ isOpen: false, workout: null })}
              className="absolute top-4 left-4 p-2 text-text-muted hover:text-text-primary transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Dialog content */}
            <div className="text-center">
              <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center bg-workout-status-in-progress-bg">
                <AlertCircle className="w-8 h-8 text-workout-status-in-progress-text" />
              </div>

              <h3 className="text-xl font-bold text-text-primary mb-2">
                אימון ללא התקדמות
              </h3>

              <p className="text-text-muted mb-6">
                האימון הזה התחיל אבל לא דווחו סטים.
                <br />
                מה תרצה לעשות?
              </p>

              {/* Options */}
              <div className="space-y-3">
                <button
                  onClick={handleEmptyWorkoutContinue}
                  className="w-full py-3 px-4 bg-primary-400 hover:bg-primary-500 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <Play className="w-5 h-5" />
                  המשך אימון
                </button>
                <button
                  onClick={handleEmptyWorkoutRestart}
                  className="w-full py-3 px-4 bg-dark-card hover:bg-dark-border text-text-primary font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <Dumbbell className="w-5 h-5" />
                  התחל מחדש (בחר תרגילים)
                </button>
                <button
                  onClick={handleEmptyWorkoutDelete}
                  className="w-full py-3 px-4 bg-transparent hover:bg-red-500/10 text-red-400 font-medium rounded-xl transition-colors flex items-center justify-center gap-2 border border-red-400/30"
                >
                  <Trash2 className="w-5 h-5" />
                  מחק אימון
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
