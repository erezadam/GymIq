/**
 * useActiveWorkout Hook
 * Manages active workout state with persistence and Firebase integration
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

import type {
  ActiveWorkout,
  ActiveWorkoutExercise,
  ReportedSet,
  ConfirmModalState,
  MuscleGroupExercises,
} from '../types/active-workout.types'
import { ACTIVE_WORKOUT_STORAGE_KEY } from '../types/active-workout.types'
import { useWorkoutBuilderStore } from '../store'
import { useAuthStore } from '@/domains/authentication/store'
import {
  saveWorkoutHistory,
  getLastWorkoutForExercises,
} from '@/lib/firebase/workoutHistory'
import { muscleGroupNames } from '@/styles/design-tokens'

export function useActiveWorkout() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { selectedExercises, clearWorkout } = useWorkoutBuilderStore()

  // State
  const [workout, setWorkout] = useState<ActiveWorkout | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState>({ type: null })

  // Timer ref for elapsed time
  const timerRef = useRef<number | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  // Track if we've already initialized to prevent duplicate creation
  const hasInitialized = useRef(false)

  // Save to localStorage - defined early so it can be used in initWorkout
  const saveToStorage = useCallback((workoutToSave: ActiveWorkout) => {
    localStorage.setItem(ACTIVE_WORKOUT_STORAGE_KEY, JSON.stringify(workoutToSave))
  }, [])

  // Clear from localStorage
  const clearStorage = useCallback(() => {
    localStorage.removeItem(ACTIVE_WORKOUT_STORAGE_KEY)
  }, [])

  // Initialize workout from selected exercises or restore from storage
  useEffect(() => {
    const initWorkout = async () => {
      console.log('🔄 initWorkout called, selectedExercises:', selectedExercises.length)

      // Don't re-initialize if we already have a workout
      if (workout && hasInitialized.current) {
        console.log('⏭️ Already have workout, skipping init')
        setIsLoading(false)
        return
      }

      setIsLoading(true)

      // Try to restore from localStorage
      const savedWorkout = localStorage.getItem(ACTIVE_WORKOUT_STORAGE_KEY)

      if (savedWorkout) {
        try {
          const parsed = JSON.parse(savedWorkout)
          parsed.startedAt = new Date(parsed.startedAt)

          // Restore sets completedAt dates
          parsed.exercises = parsed.exercises.map((ex: ActiveWorkoutExercise) => ({
            ...ex,
            reportedSets: ex.reportedSets.map((set: ReportedSet) => ({
              ...set,
              completedAt: set.completedAt ? new Date(set.completedAt) : undefined,
            })),
            lastWorkoutData: ex.lastWorkoutData
              ? { ...ex.lastWorkoutData, date: new Date(ex.lastWorkoutData.date) }
              : undefined,
          }))

          console.log('✅ Restored workout from localStorage')

          // Check if there are new exercises to add (from addToWorkout flow)
          const existingExerciseIds = new Set(parsed.exercises.map((ex: ActiveWorkoutExercise) => ex.exerciseId))
          const newExercisesToAdd = selectedExercises.filter(ex => !existingExerciseIds.has(ex.exerciseId))

          if (newExercisesToAdd.length > 0) {
            console.log('🆕 Adding', newExercisesToAdd.length, 'new exercises to existing workout')

            // Collapse all existing exercises
            parsed.exercises = parsed.exercises.map((ex: ActiveWorkoutExercise) => ({
              ...ex,
              isExpanded: false,
            }))

            // Create new exercise entries
            const newExercises: ActiveWorkoutExercise[] = newExercisesToAdd.map((ex, index) => ({
              id: `workout_ex_${parsed.exercises.length + index}_${Date.now()}`,
              exerciseId: ex.exerciseId,
              exerciseName: ex.exerciseName,
              exerciseNameHe: ex.exerciseNameHe,
              imageUrl: ex.imageUrl,
              primaryMuscle: ex.primaryMuscle || 'other',
              isExpanded: index === newExercisesToAdd.length - 1, // Last new exercise is expanded
              isCompleted: false,
              reportedSets: [
                {
                  id: `set_${Date.now()}_${index}_1`,
                  setNumber: 1,
                  weight: 0,
                  reps: 0,
                },
              ],
            }))

            // Fetch last workout data for new exercises
            if (user?.uid) {
              try {
                const exerciseIds = newExercises.map((ex) => ex.exerciseId)
                const lastWorkoutData = await getLastWorkoutForExercises(user.uid, exerciseIds)
                newExercises.forEach((ex) => {
                  if (lastWorkoutData[ex.exerciseId]) {
                    ex.lastWorkoutData = lastWorkoutData[ex.exerciseId]
                  }
                })
              } catch (e) {
                console.error('Failed to fetch last workout data for new exercises:', e)
              }
            }

            // Merge new exercises into parsed workout
            parsed.exercises = [...parsed.exercises, ...newExercises]
            parsed.stats = {
              ...parsed.stats,
              totalExercises: parsed.exercises.length,
              totalSets: parsed.exercises.reduce((sum: number, ex: ActiveWorkoutExercise) => sum + ex.reportedSets.length, 0),
            }

            // Clear the selectedExercises store since we've added them
            clearWorkout()

            console.log('✅ Merged new exercises, total:', parsed.exercises.length)
          }

          setWorkout(parsed)
          saveToStorage(parsed)
          hasInitialized.current = true
          setIsLoading(false)
          return
        } catch (e) {
          console.error('Failed to restore workout:', e)
          localStorage.removeItem(ACTIVE_WORKOUT_STORAGE_KEY)
        }
      }

      // Create new workout from selected exercises
      if (selectedExercises.length > 0) {
        console.log('🆕 Creating new workout from', selectedExercises.length, 'exercises')
        const exercises: ActiveWorkoutExercise[] = selectedExercises.map((ex, index) => ({
          id: `workout_ex_${index}_${Date.now()}`,
          exerciseId: ex.exerciseId,
          exerciseName: ex.exerciseName,
          exerciseNameHe: ex.exerciseNameHe,
          imageUrl: ex.imageUrl,
          primaryMuscle: ex.primaryMuscle || 'other',
          isExpanded: false, // All exercises start collapsed
          isCompleted: false,
          reportedSets: [
            {
              id: `set_${Date.now()}_1`,
              setNumber: 1,
              weight: 0,
              reps: 0,
            },
          ],
        }))

        // Fetch last workout data for all exercises
        if (user?.uid) {
          try {
            const exerciseIds = exercises.map((ex) => ex.exerciseId)
            const lastWorkoutData = await getLastWorkoutForExercises(user.uid, exerciseIds)

            // Update exercises with last workout data
            exercises.forEach((ex) => {
              if (lastWorkoutData[ex.exerciseId]) {
                ex.lastWorkoutData = lastWorkoutData[ex.exerciseId]
              }
            })
          } catch (e) {
            console.error('Failed to fetch last workout data:', e)
          }
        }

        const newWorkout: ActiveWorkout = {
          id: `workout_${Date.now()}`,
          startedAt: new Date(),
          userId: user?.uid || 'anonymous',
          exercises,
          stats: {
            totalExercises: exercises.length,
            completedExercises: 0,
            totalSets: exercises.reduce((sum, ex) => sum + ex.reportedSets.length, 0),
            completedSets: 0,
            elapsedSeconds: 0,
            totalVolume: 0,
          },
        }

        setWorkout(newWorkout)
        saveToStorage(newWorkout)
        hasInitialized.current = true
        console.log('✅ New workout created and saved')
      } else {
        console.log('⚠️ No selectedExercises and no saved workout')
      }

      setIsLoading(false)
    }

    initWorkout()
  }, [selectedExercises, user?.uid, workout, saveToStorage, clearWorkout])

  // Update elapsed time every second
  useEffect(() => {
    if (!workout) return

    timerRef.current = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - workout.startedAt.getTime()) / 1000))
    }, 1000)

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [workout?.startedAt])

  // Update workout state and persist
  const updateWorkout = useCallback(
    (updater: (prev: ActiveWorkout) => ActiveWorkout) => {
      setWorkout((prev) => {
        if (!prev) return prev
        const updated = updater(prev)
        saveToStorage(updated)
        return updated
      })
    },
    [saveToStorage]
  )

  // Toggle exercise expansion (only one can be expanded at a time)
  const toggleExercise = useCallback(
    (exerciseId: string) => {
      updateWorkout((prev) => ({
        ...prev,
        exercises: prev.exercises.map((ex) => ({
          ...ex,
          isExpanded: ex.id === exerciseId ? !ex.isExpanded : false,
        })),
      }))
    },
    [updateWorkout]
  )

  // Add a new set to an exercise
  const addSet = useCallback(
    (exerciseId: string) => {
      updateWorkout((prev) => {
        const exercise = prev.exercises.find((ex) => ex.id === exerciseId)
        if (!exercise) return prev

        const lastSet = exercise.reportedSets[exercise.reportedSets.length - 1]
        const newSet: ReportedSet = {
          id: `set_${Date.now()}`,
          setNumber: exercise.reportedSets.length + 1,
          weight: lastSet?.weight || 0,
          reps: lastSet?.reps || 0,
        }

        return {
          ...prev,
          exercises: prev.exercises.map((ex) =>
            ex.id === exerciseId
              ? { ...ex, reportedSets: [...ex.reportedSets, newSet] }
              : ex
          ),
          stats: {
            ...prev.stats,
            totalSets: prev.stats.totalSets + 1,
          },
        }
      })
    },
    [updateWorkout]
  )

  // Update a set's values
  const updateSet = useCallback(
    (exerciseId: string, setId: string, updates: Partial<ReportedSet>) => {
      updateWorkout((prev) => ({
        ...prev,
        exercises: prev.exercises.map((ex) =>
          ex.id === exerciseId
            ? {
                ...ex,
                reportedSets: ex.reportedSets.map((set) =>
                  set.id === setId ? { ...set, ...updates } : set
                ),
              }
            : ex
        ),
      }))
    },
    [updateWorkout]
  )

  // Delete a set from an exercise
  const deleteSet = useCallback(
    (exerciseId: string, setId: string) => {
      updateWorkout((prev) => {
        const exercise = prev.exercises.find((ex) => ex.id === exerciseId)
        if (!exercise || exercise.reportedSets.length <= 1) return prev // Keep at least one set

        return {
          ...prev,
          exercises: prev.exercises.map((ex) =>
            ex.id === exerciseId
              ? {
                  ...ex,
                  reportedSets: ex.reportedSets
                    .filter((set) => set.id !== setId)
                    .map((set, index) => ({ ...set, setNumber: index + 1 })),
                }
              : ex
          ),
          stats: {
            ...prev.stats,
            totalSets: prev.stats.totalSets - 1,
          },
        }
      })
    },
    [updateWorkout]
  )

  // Finish an exercise (close card and mark as completed)
  const finishExercise = useCallback(
    (exerciseId: string) => {
      updateWorkout((prev) => {
        const exercise = prev.exercises.find((ex) => ex.id === exerciseId)
        if (!exercise) return prev

        // Calculate volume for this exercise
        const exerciseVolume = exercise.reportedSets.reduce(
          (sum, set) => sum + set.weight * set.reps,
          0
        )

        // Count completed sets (sets with reps > 0)
        const completedSetsInExercise = exercise.reportedSets.filter(
          (set) => set.reps > 0
        ).length

        // Mark sets as completed
        const updatedSets = exercise.reportedSets.map((set) => ({
          ...set,
          completedAt: set.reps > 0 ? new Date() : undefined,
        }))

        const newCompletedCount = prev.stats.completedExercises + 1

        return {
          ...prev,
          exercises: prev.exercises.map((ex) => {
            if (ex.id === exerciseId) {
              return {
                ...ex,
                isExpanded: false,
                isCompleted: true,
                reportedSets: updatedSets,
              }
            }
            return ex
          }),
          stats: {
            ...prev.stats,
            completedExercises: newCompletedCount,
            completedSets: prev.stats.completedSets + completedSetsInExercise,
            totalVolume: prev.stats.totalVolume + exerciseVolume,
          },
        }
      })

      toast.success('התרגיל הושלם!')
    },
    [updateWorkout]
  )

  // Delete an exercise from the workout
  const deleteExercise = useCallback(
    (exerciseId: string) => {
      updateWorkout((prev) => {
        const exercise = prev.exercises.find((ex) => ex.id === exerciseId)
        if (!exercise) return prev

        const wasCompleted = exercise.isCompleted
        const setsCount = exercise.reportedSets.length
        const completedSetsCount = exercise.reportedSets.filter((s) => s.reps > 0).length

        return {
          ...prev,
          exercises: prev.exercises.filter((ex) => ex.id !== exerciseId),
          stats: {
            ...prev.stats,
            totalExercises: prev.stats.totalExercises - 1,
            completedExercises: wasCompleted
              ? prev.stats.completedExercises - 1
              : prev.stats.completedExercises,
            totalSets: prev.stats.totalSets - setsCount,
            completedSets: wasCompleted
              ? prev.stats.completedSets - completedSetsCount
              : prev.stats.completedSets,
          },
        }
      })

      setConfirmModal({ type: null })
      toast.success('התרגיל נמחק')
    },
    [updateWorkout]
  )

  // Show delete confirmation
  const confirmDeleteExercise = useCallback((exerciseId: string) => {
    setConfirmModal({ type: 'delete_exercise', exerciseId })
  }, [])

  // Show exit confirmation
  const confirmExit = useCallback(() => {
    setConfirmModal({ type: 'exit_workout' })
  }, [])

  // Show finish confirmation - sets shouldFinish flag
  const [shouldFinish, setShouldFinish] = useState(false)

  const confirmFinish = useCallback(() => {
    console.log('=== CONFIRM FINISH CLICKED ===')
    console.log('workout:', workout)

    if (!workout) {
      console.log('❌ No workout - returning')
      return
    }

    console.log('Stats:', workout.stats)
    console.log('completedExercises:', workout.stats.completedExercises)
    console.log('totalExercises:', workout.stats.totalExercises)

    // If all exercises completed, trigger finish
    if (workout.stats.completedExercises === workout.stats.totalExercises) {
      console.log('✅ All exercises completed - triggering finish')
      setShouldFinish(true)
    } else {
      console.log('⚠️ Not all completed - showing modal')
      setConfirmModal({ type: 'finish_workout' })
    }
  }, [workout])

  // Close modal
  const closeModal = useCallback(() => {
    setConfirmModal({ type: null })
  }, [])

  // Effect to handle finishing workout when shouldFinish is true
  // This is needed because finishWorkout is defined after confirmFinish
  useEffect(() => {
    if (shouldFinish) {
      console.log('=== shouldFinish triggered, calling finishWorkout ===')
      setShouldFinish(false)
      // We need to call finishWorkout here, but it's not defined yet
      // So we'll handle the finish logic inline
      const doFinish = async () => {
        console.log('=== FINISH WORKOUT START (from effect) ===')
        if (!workout) {
          console.error('=== FINISH WORKOUT FAILED - NO WORKOUT ===')
          return
        }

        const endTime = new Date()
        const duration = Math.floor((endTime.getTime() - workout.startedAt.getTime()) / 60000)
        const status = workout.stats.completedExercises === workout.stats.totalExercises
          ? 'completed'
          : workout.stats.completedExercises === 0
          ? 'cancelled'
          : 'partial'

        console.log('=== SAVING TO FIREBASE (from effect) ===')
        console.log('userId:', workout.userId)
        console.log('exercises:', workout.exercises.length)
        console.log('status:', status)

        try {
          const workoutId = await saveWorkoutHistory({
            userId: workout.userId,
            name: `אימון ${new Date().toLocaleDateString('he-IL')}`,
            date: workout.startedAt,
            startTime: workout.startedAt,
            endTime,
            duration,
            status,
            exercises: workout.exercises.map((ex) => ({
              exerciseId: ex.exerciseId,
              exerciseName: ex.exerciseName,
              exerciseNameHe: ex.exerciseNameHe,
              isCompleted: ex.isCompleted,
              sets: ex.reportedSets.map((set) => ({
                type: 'working',
                targetReps: 0,
                targetWeight: 0,
                actualReps: set.reps,
                actualWeight: set.weight,
                completed: set.reps > 0,
              })),
            })),
            completedExercises: workout.stats.completedExercises,
            totalExercises: workout.stats.totalExercises,
            completedSets: workout.stats.completedSets,
            totalSets: workout.stats.totalSets,
            totalVolume: workout.stats.totalVolume,
            personalRecords: 0,
          })

          console.log('=== SAVE WORKOUT SUCCESS (from effect) ===')
          console.log('Saved workout ID:', workoutId)
          toast.success('האימון נשמר!')
        } catch (error: any) {
          console.error('=== SAVE WORKOUT FAILED (from effect) ===')
          console.error('Error:', error)
          toast.error('שגיאה בשמירת האימון')
        }

        // Clear everything
        clearStorage()
        clearWorkout()
        setWorkout(null)
        hasInitialized.current = false
        setConfirmModal({ type: null })
        navigate('/workout/history')
      }

      doFinish()
    }
  }, [shouldFinish, workout, clearStorage, clearWorkout, navigate])

  // Exit workout (save to Firebase as in_progress and clear)
  const exitWorkout = useCallback(async () => {
    console.log('🚪 exitWorkout called')

    if (workout) {
      const endTime = new Date()
      const duration = Math.floor((endTime.getTime() - workout.startedAt.getTime()) / 60000)

      console.log('💾 Saving workout as in_progress before exit')

      try {
        await saveWorkoutHistory({
          userId: workout.userId,
          name: `אימון ${new Date().toLocaleDateString('he-IL')}`,
          date: workout.startedAt,
          startTime: workout.startedAt,
          endTime,
          duration,
          status: 'in_progress', // Always save as in_progress when exiting
          exercises: workout.exercises.map((ex) => ({
            exerciseId: ex.exerciseId,
            exerciseName: ex.exerciseName,
            exerciseNameHe: ex.exerciseNameHe,
            isCompleted: ex.isCompleted,
            sets: ex.reportedSets.map((set) => ({
              type: 'working',
              targetReps: 0,
              targetWeight: 0,
              actualReps: set.reps,
              actualWeight: set.weight,
              completed: set.reps > 0,
            })),
          })),
          completedExercises: workout.stats.completedExercises,
          totalExercises: workout.stats.totalExercises,
          completedSets: workout.stats.completedSets,
          totalSets: workout.stats.totalSets,
          totalVolume: workout.stats.totalVolume,
          personalRecords: 0,
        })

        console.log('✅ Workout saved as in_progress')
        toast.success('האימון נשמר - תוכל להמשיך מאוחר יותר')
      } catch (error) {
        console.error('Failed to save workout on exit:', error)
        toast.error('שגיאה בשמירת האימון')
      }
    }

    // Clear everything
    clearStorage()
    clearWorkout()
    setWorkout(null)
    hasInitialized.current = false
    setConfirmModal({ type: null })

    navigate('/dashboard')
  }, [workout, clearStorage, clearWorkout, navigate])

  // Finish workout (save to Firebase and clear)
  const finishWorkout = useCallback(async () => {
    console.log('=== FINISH WORKOUT START ===')
    console.log('workout:', workout)

    if (!workout) {
      console.error('=== FINISH WORKOUT FAILED - NO WORKOUT ===')
      return
    }

    const endTime = new Date()
    const duration = Math.floor((endTime.getTime() - workout.startedAt.getTime()) / 60000)

    const status = workout.stats.completedExercises === workout.stats.totalExercises
      ? 'completed'
      : workout.stats.completedExercises === 0
      ? 'cancelled'
      : 'partial'

    console.log('=== SAVING TO FIREBASE ===')
    console.log('userId:', workout.userId)
    console.log('exercises:', workout.exercises.length)
    console.log('duration:', duration)
    console.log('status:', status)

    try {
      const workoutId = await saveWorkoutHistory({
        userId: workout.userId,
        name: `אימון ${new Date().toLocaleDateString('he-IL')}`,
        date: workout.startedAt,
        startTime: workout.startedAt,
        endTime,
        duration,
        status:
          workout.stats.completedExercises === workout.stats.totalExercises
            ? 'completed'
            : workout.stats.completedExercises === 0
            ? 'cancelled'
            : 'partial',
        exercises: workout.exercises.map((ex) => ({
          exerciseId: ex.exerciseId,
          exerciseName: ex.exerciseName,
          exerciseNameHe: ex.exerciseNameHe,
          isCompleted: ex.isCompleted,
          sets: ex.reportedSets.map((set) => ({
            type: 'working',
            targetReps: 0,
            targetWeight: 0,
            actualReps: set.reps,
            actualWeight: set.weight,
            completed: set.reps > 0,
          })),
        })),
        completedExercises: workout.stats.completedExercises,
        totalExercises: workout.stats.totalExercises,
        completedSets: workout.stats.completedSets,
        totalSets: workout.stats.totalSets,
        totalVolume: workout.stats.totalVolume,
        personalRecords: 0,
      })

      console.log('=== SAVE WORKOUT SUCCESS ===')
      console.log('Saved workout ID:', workoutId)
      toast.success('האימון נשמר!')
    } catch (error: any) {
      console.error('=== SAVE WORKOUT FAILED ===')
      console.error('Error:', error)
      console.error('Error code:', error?.code)
      console.error('Error message:', error?.message)
      toast.error('שגיאה בשמירת האימון')
    }

    // Clear everything
    clearStorage()
    clearWorkout()
    setWorkout(null)
    hasInitialized.current = false
    setConfirmModal({ type: null })

    navigate('/workout/history')
  }, [workout, clearStorage, clearWorkout, navigate])

  // Group exercises by muscle
  const exercisesByMuscle = useMemo((): MuscleGroupExercises[] => {
    if (!workout) return []

    const groups: Record<string, ActiveWorkoutExercise[]> = {}

    workout.exercises.forEach((ex) => {
      const muscle = ex.primaryMuscle || 'other'
      const muscleHe = muscleGroupNames[muscle] || muscle

      if (!groups[muscleHe]) {
        groups[muscleHe] = []
      }
      groups[muscleHe].push(ex)
    })

    return Object.entries(groups).map(([muscleGroupHe, exercises]) => ({
      muscleGroup: exercises[0]?.primaryMuscle || 'other',
      muscleGroupHe,
      exercises,
    }))
  }, [workout])

  // Format elapsed time
  const formattedTime = useMemo(() => {
    const mins = Math.floor(elapsedSeconds / 60)
    const secs = elapsedSeconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }, [elapsedSeconds])

  return {
    // State
    workout,
    isLoading,
    confirmModal,
    elapsedSeconds,
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
  }
}
