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

  // Initialize workout from selected exercises or restore from storage
  useEffect(() => {
    const initWorkout = async () => {
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

          setWorkout(parsed)
          setIsLoading(false)
          return
        } catch (e) {
          console.error('Failed to restore workout:', e)
          localStorage.removeItem(ACTIVE_WORKOUT_STORAGE_KEY)
        }
      }

      // Create new workout from selected exercises
      if (selectedExercises.length > 0) {
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
      }

      setIsLoading(false)
    }

    initWorkout()
  }, [])

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

  // Save to localStorage
  const saveToStorage = useCallback((workoutToSave: ActiveWorkout) => {
    localStorage.setItem(ACTIVE_WORKOUT_STORAGE_KEY, JSON.stringify(workoutToSave))
  }, [])

  // Clear from localStorage
  const clearStorage = useCallback(() => {
    localStorage.removeItem(ACTIVE_WORKOUT_STORAGE_KEY)
  }, [])

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

  // Show finish confirmation
  const confirmFinish = useCallback(() => {
    if (!workout) return

    // If all exercises completed, finish directly
    if (workout.stats.completedExercises === workout.stats.totalExercises) {
      finishWorkout()
    } else {
      setConfirmModal({ type: 'finish_workout' })
    }
  }, [workout])

  // Close modal
  const closeModal = useCallback(() => {
    setConfirmModal({ type: null })
  }, [])

  // Exit workout (save state for later)
  const exitWorkout = useCallback(() => {
    // State is already saved in localStorage
    setConfirmModal({ type: null })
    navigate('/dashboard')
  }, [navigate])

  // Finish workout (save to Firebase and clear)
  const finishWorkout = useCallback(async () => {
    if (!workout) return

    const endTime = new Date()
    const duration = Math.floor((endTime.getTime() - workout.startedAt.getTime()) / 60000)

    try {
      await saveWorkoutHistory({
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

      toast.success('האימון נשמר!')
    } catch (error) {
      console.error('Failed to save workout:', error)
      toast.error('שגיאה בשמירת האימון')
    }

    // Clear everything
    clearStorage()
    clearWorkout()
    setWorkout(null)
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
