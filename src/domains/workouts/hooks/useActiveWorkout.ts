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
  EquipmentGroupExercises,
} from '../types/active-workout.types'
import type { SetType } from '../types/workout.types'
import { ACTIVE_WORKOUT_STORAGE_KEY } from '../types/active-workout.types'
import { useWorkoutBuilderStore } from '../store'
import { useAuthStore } from '@/domains/authentication/store'
import {
  saveWorkoutHistory,
  getLastWorkoutForExercises,
  autoSaveWorkout,
  getInProgressWorkout,
  completeWorkout,
} from '@/lib/firebase/workoutHistory'
import { getMuscleIdToNameHeMap } from '@/lib/firebase/muscles'
import { muscleGroupNames } from '@/styles/design-tokens'

// Equipment names in Hebrew
const equipmentNames: Record<string, string> = {
  barbell: 'מוט ברזל',
  dumbbell: 'משקולות',
  bodyweight: 'משקל גוף',
  pull_up_bar: 'מתח',
  cable_machine: 'כבלים',
  kettlebell: 'קטלבל',
  machine: 'מכונה',
  bench: 'ספסל',
  resistance_band: 'גומייה',
  other: 'אחר',
}

export function useActiveWorkout() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { selectedExercises, clearWorkout, removeExercise: removeFromStore } = useWorkoutBuilderStore()

  // State
  const [workout, setWorkout] = useState<ActiveWorkout | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState>({ type: null })
  const [showSummaryModal, setShowSummaryModal] = useState(false)

  // Dynamic muscle name mapping from Firebase
  const [dynamicMuscleNames, setDynamicMuscleNames] = useState<Record<string, string>>({})

  // Firebase workout ID for auto-save
  const [firebaseWorkoutId, setFirebaseWorkoutId] = useState<string | null>(null)

  // Timer ref for elapsed time
  const timerRef = useRef<number | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  // Auto-save debounce ref
  const autoSaveTimeoutRef = useRef<number | null>(null)

  // Track if we've already initialized to prevent duplicate creation
  const hasInitialized = useRef(false)

  // Track if initWorkout is currently running to prevent concurrent calls
  const isInitializing = useRef(false)

  // Load dynamic muscle names from Firebase on mount
  useEffect(() => {
    const loadMuscleNames = async () => {
      try {
        const mapping = await getMuscleIdToNameHeMap()
        setDynamicMuscleNames(mapping)
        console.log('✅ Loaded dynamic muscle names from Firebase:', Object.keys(mapping).length, 'entries')
      } catch (error) {
        console.error('❌ Failed to load muscle names from Firebase:', error)
        // Will fall back to muscleGroupNames
      }
    }
    loadMuscleNames()
  }, [])

  // Save to localStorage - defined early so it can be used in initWorkout
  const saveToStorage = useCallback((workoutToSave: ActiveWorkout) => {
    localStorage.setItem(ACTIVE_WORKOUT_STORAGE_KEY, JSON.stringify(workoutToSave))
  }, [])

  // Clear from localStorage
  const clearStorage = useCallback(() => {
    localStorage.removeItem(ACTIVE_WORKOUT_STORAGE_KEY)
  }, [])

  // Auto-save to Firebase (debounced)
  const triggerAutoSave = useCallback((workoutToSave: ActiveWorkout, currentFirebaseId: string | null) => {
    // Clear any pending auto-save
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current)
    }

    // Debounce: wait 2 seconds after last change before saving
    autoSaveTimeoutRef.current = window.setTimeout(async () => {
      try {
        const endTime = new Date()
        const duration = Math.floor((endTime.getTime() - workoutToSave.startedAt.getTime()) / 60000)

        const savedId = await autoSaveWorkout(currentFirebaseId, {
          userId: workoutToSave.userId,
          name: `אימון ${workoutToSave.startedAt.toLocaleDateString('he-IL')}`,
          date: workoutToSave.startedAt,
          startTime: workoutToSave.startedAt,
          endTime,
          duration,
          status: 'in_progress',
          exercises: workoutToSave.exercises.map((ex) => ({
            exerciseId: ex.exerciseId,
            exerciseName: ex.exerciseName,
            exerciseNameHe: ex.exerciseNameHe,
            imageUrl: ex.imageUrl || '',
            category: ex.category || '',
            isCompleted: ex.isCompleted,
            notes: ex.notes,
            sets: ex.reportedSets.map((set) => ({
              type: 'working',
              targetReps: 0,
              targetWeight: 0,
              actualReps: set.reps,
              actualWeight: set.weight,
              completed: set.reps > 0,
            })),
          })),
          completedExercises: workoutToSave.stats.completedExercises,
          totalExercises: workoutToSave.stats.totalExercises,
          completedSets: workoutToSave.stats.completedSets,
          totalSets: workoutToSave.stats.totalSets,
          totalVolume: workoutToSave.stats.totalVolume,
          personalRecords: 0,
        })

        // Store the Firebase ID if this was a new workout
        if (!currentFirebaseId && savedId) {
          setFirebaseWorkoutId(savedId)
          // Also store in localStorage for recovery
          localStorage.setItem('gymiq_firebase_workout_id', savedId)
        }
      } catch (error) {
        console.error('❌ Auto-save failed:', error)
      }
    }, 2000) // 2 second debounce
  }, [])

  // Initialize workout from selected exercises or restore from storage
  useEffect(() => {
    const initWorkout = async () => {
      console.log('🔄 initWorkout called, selectedExercises:', selectedExercises.length)

      // Prevent concurrent calls - if already initializing, skip
      if (isInitializing.current) {
        console.log('⏳ Already initializing, skipping')
        return
      }

      // Check if we're continuing from history FIRST (before early return check)
      const continueWorkoutData = localStorage.getItem('continueWorkoutData')
      const continueWorkoutMode = localStorage.getItem('continueWorkoutMode')
      const isContinuingFromHistory = continueWorkoutData && continueWorkoutMode === 'in_progress'

      if (isContinuingFromHistory) {
        console.log('📋 Detected continue from history - will override existing workout')
      }

      // Don't re-initialize if we already have a workout (UNLESS continuing from history)
      if (workout && hasInitialized.current && !isContinuingFromHistory) {
        console.log('⏭️ Already have workout, skipping init')
        setIsLoading(false)
        return
      }

      // Set initializing lock
      isInitializing.current = true
      setIsLoading(true)

      // First, check Firebase for in_progress workout (recovery after app close)
      // Skip this if continuing from history
      if (user?.uid && selectedExercises.length === 0 && !isContinuingFromHistory) {
        try {
          const firebaseWorkout = await getInProgressWorkout(user.uid)
          if (firebaseWorkout) {
            console.log('🔥 Found in_progress workout in Firebase:', firebaseWorkout.id)

            // Convert Firebase workout to ActiveWorkout format
            const restoredWorkout: ActiveWorkout = {
              id: firebaseWorkout.id,
              startedAt: firebaseWorkout.startTime,
              userId: firebaseWorkout.userId,
              exercises: firebaseWorkout.exercises.map((ex, index) => ({
                id: `workout_ex_${index}_${Date.now()}`,
                exerciseId: ex.exerciseId,
                exerciseName: ex.exerciseName,
                exerciseNameHe: ex.exerciseNameHe,
                imageUrl: ex.imageUrl,
                primaryMuscle: 'other', // Will be populated from exercise data
                category: undefined, // Will be populated from exercise data
                isExpanded: false,
                isCompleted: ex.isCompleted,
                reportedSets: ex.sets.map((set, setIndex) => ({
                  id: `set_${Date.now()}_${setIndex}`,
                  setNumber: setIndex + 1,
                  weight: set.actualWeight || 0,
                  reps: set.actualReps || 0,
                  completedAt: set.completed ? new Date() : undefined,
                })),
              })),
              stats: {
                totalExercises: firebaseWorkout.totalExercises,
                completedExercises: firebaseWorkout.completedExercises,
                totalSets: firebaseWorkout.totalSets,
                completedSets: firebaseWorkout.completedSets,
                elapsedSeconds: 0,
                totalVolume: firebaseWorkout.totalVolume,
              },
            }

            setWorkout(restoredWorkout)
            setFirebaseWorkoutId(firebaseWorkout.id)
            localStorage.setItem('gymiq_firebase_workout_id', firebaseWorkout.id)
            saveToStorage(restoredWorkout)
            hasInitialized.current = true
            setIsLoading(false)
            toast.success('האימון שוחזר!')
            return
          }
        } catch (error) {
          console.error('❌ Failed to check Firebase for in_progress workout:', error)
        }
      }

      // Process continueWorkoutData from history (already detected above)
      let continueData: any[] | null = null

      if (isContinuingFromHistory) {
        try {
          continueData = JSON.parse(continueWorkoutData!)
          console.log('📋 Parsing continueWorkoutData with', continueData?.length, 'exercises')
          // Clear old localStorage workout - we're starting fresh from history data
          localStorage.removeItem(ACTIVE_WORKOUT_STORAGE_KEY)
          localStorage.removeItem('gymiq_firebase_workout_id')
          // DON'T set hasInitialized.current = false - it causes race conditions!
          // The isContinuingFromHistory flag is enough to allow initialization to proceed
        } catch (e) {
          console.error('Failed to parse continueWorkoutData:', e)
        }
        // Clear the localStorage flags after reading
        localStorage.removeItem('continueWorkoutData')
        localStorage.removeItem('continueWorkoutMode')
      }

      // Try to restore from localStorage (only if not continuing from history)
      const savedWorkout = localStorage.getItem(ACTIVE_WORKOUT_STORAGE_KEY)
      const savedFirebaseId = localStorage.getItem('gymiq_firebase_workout_id')
      if (savedFirebaseId) {
        setFirebaseWorkoutId(savedFirebaseId)
      }

      if (savedWorkout && !continueData) {
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
              category: ex.category,
              equipment: ex.equipment,
              reportType: ex.reportType,
              isExpanded: false, // New exercises start collapsed
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
        console.log('🆕 Creating new workout from', selectedExercises.length, 'exercises', continueData ? '(with continueData)' : '')
        const exercises: ActiveWorkoutExercise[] = selectedExercises.map((ex, index) => {
          // Check if we have continue data for this exercise
          const continueExercise = continueData?.find(ce => ce.exerciseId === ex.exerciseId)

          // If we have continue data with sets, use them
          let reportedSets: ReportedSet[]
          if (continueExercise?.sets && continueExercise.sets.length > 0) {
            console.log(`📋 Restoring ${continueExercise.sets.length} sets for ${ex.exerciseNameHe}`)
            reportedSets = continueExercise.sets.map((set: any, setIndex: number) => ({
              id: `set_${Date.now()}_${index}_${setIndex}`,
              setNumber: setIndex + 1,
              weight: set.actualWeight || 0,
              reps: set.actualReps || 0,
              completedAt: set.completed ? new Date() : undefined,
            }))
          } else {
            // Default: one empty set
            reportedSets = [
              {
                id: `set_${Date.now()}_${index}_1`,
                setNumber: 1,
                weight: 0,
                reps: 0,
              },
            ]
          }

          return {
            id: `workout_ex_${index}_${Date.now()}`,
            exerciseId: ex.exerciseId,
            exerciseName: ex.exerciseName,
            exerciseNameHe: ex.exerciseNameHe,
            imageUrl: ex.imageUrl,
            primaryMuscle: ex.primaryMuscle || 'other',
            category: ex.category,
            equipment: ex.equipment,
            reportType: ex.reportType,
            isExpanded: false, // All exercises start collapsed
            isCompleted: continueExercise?.isCompleted || false,
            reportedSets,
          }
        })

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

        // Calculate stats based on restored data
        const completedExercises = exercises.filter(ex => ex.isCompleted).length
        const completedSets = exercises.reduce((sum, ex) =>
          sum + ex.reportedSets.filter(set => set.reps > 0).length, 0)
        const totalVolume = exercises.reduce((sum, ex) =>
          sum + ex.reportedSets.reduce((setSum, set) => setSum + (set.weight * set.reps), 0), 0)

        const newWorkout: ActiveWorkout = {
          id: `workout_${Date.now()}`,
          startedAt: new Date(),
          userId: user?.uid || 'anonymous',
          exercises,
          stats: {
            totalExercises: exercises.length,
            completedExercises,
            totalSets: exercises.reduce((sum, ex) => sum + ex.reportedSets.length, 0),
            completedSets,
            elapsedSeconds: 0,
            totalVolume,
          },
        }

        // Set hasInitialized BEFORE setWorkout to prevent re-render from triggering another init
        hasInitialized.current = true
        setWorkout(newWorkout)
        saveToStorage(newWorkout)

        // Immediately save to Firebase (no debounce for initial save)
        try {
          const endTime = new Date()
          const savedId = await autoSaveWorkout(null, {
            userId: newWorkout.userId,
            name: `אימון ${newWorkout.startedAt.toLocaleDateString('he-IL')}`,
            date: newWorkout.startedAt,
            startTime: newWorkout.startedAt,
            endTime,
            duration: 0,
            status: 'in_progress',
            exercises: newWorkout.exercises.map((ex) => ({
              exerciseId: ex.exerciseId,
              exerciseName: ex.exerciseName,
              exerciseNameHe: ex.exerciseNameHe,
              imageUrl: ex.imageUrl || '',
              category: ex.category || '',
              isCompleted: ex.isCompleted,
              notes: ex.notes,
              sets: ex.reportedSets.map((set) => ({
                type: 'working',
                targetReps: 0,
                targetWeight: 0,
                actualReps: set.reps,
                actualWeight: set.weight,
                completed: set.reps > 0,
              })),
            })),
            completedExercises: 0,
            totalExercises: newWorkout.exercises.length,
            completedSets: 0,
            totalSets: newWorkout.stats.totalSets,
            totalVolume: 0,
            personalRecords: 0,
          })

          setFirebaseWorkoutId(savedId)
          localStorage.setItem('gymiq_firebase_workout_id', savedId)
          console.log('✅ New workout created and saved to Firebase:', savedId)
        } catch (error) {
          console.error('❌ Failed to save new workout to Firebase:', error)
        }
      } else {
        console.log('⚠️ No selectedExercises and no saved workout')
      }

      setIsLoading(false)
      isInitializing.current = false
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
        // Trigger auto-save to Firebase (debounced)
        triggerAutoSave(updated, firebaseWorkoutId)
        return updated
      })
    },
    [saveToStorage, triggerAutoSave, firebaseWorkoutId]
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

  // Update exercise notes
  const updateExerciseNotes = useCallback(
    (exerciseId: string, notes: string) => {
      updateWorkout((prev) => ({
        ...prev,
        exercises: prev.exercises.map((ex) =>
          ex.id === exerciseId ? { ...ex, notes } : ex
        ),
      }))
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
      // Find the exercise to get its Firebase exerciseId
      const exerciseToDelete = workout?.exercises.find((ex) => ex.id === exerciseId)

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

      // Also remove from the builder store so exercise library stays in sync
      if (exerciseToDelete) {
        removeFromStore(exerciseToDelete.exerciseId)
      }

      setConfirmModal({ type: null })
      toast.success('התרגיל נמחק')
    },
    [updateWorkout, workout, removeFromStore]
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
  const [pendingCalories, setPendingCalories] = useState<number | undefined>(undefined)

  const confirmFinish = useCallback(() => {
    console.log('=== CONFIRM FINISH CLICKED ===')

    if (!workout) {
      console.log('❌ No workout - returning')
      return
    }

    console.log('✅ Showing summary modal')
    // Always show summary modal directly
    setShowSummaryModal(true)
  }, [workout])

  // Called when user confirms finish from confirmation modal (partial workout)
  const handleConfirmFinish = useCallback(() => {
    console.log('=== CONFIRM FINISH FROM MODAL ===')
    setConfirmModal({ type: null })
    setShowSummaryModal(true)
  }, [])

  // Close summary modal
  const closeSummaryModal = useCallback(() => {
    setShowSummaryModal(false)
  }, [])

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
        console.log('calories:', pendingCalories)

        try {
          const exercises = workout.exercises.map((ex) => ({
            exerciseId: ex.exerciseId,
            exerciseName: ex.exerciseName,
            exerciseNameHe: ex.exerciseNameHe,
            imageUrl: ex.imageUrl || '',
            category: ex.category || '',
            isCompleted: ex.isCompleted,
            notes: ex.notes,
            sets: ex.reportedSets.map((set) => ({
              type: 'working' as SetType,
              targetReps: 0,
              targetWeight: 0,
              actualReps: set.reps,
              actualWeight: set.weight,
              completed: set.reps > 0,
            })),
          }))

          // If we have a Firebase ID, use completeWorkout; otherwise save new
          if (firebaseWorkoutId) {
            await completeWorkout(firebaseWorkoutId, {
              status,
              endTime,
              duration,
              exercises,
              completedExercises: workout.stats.completedExercises,
              totalExercises: workout.stats.totalExercises,
              completedSets: workout.stats.completedSets,
              totalSets: workout.stats.totalSets,
              totalVolume: workout.stats.totalVolume,
              calories: pendingCalories,
            })
            console.log('=== COMPLETE WORKOUT SUCCESS (from effect) ===')
          } else {
            await saveWorkoutHistory({
              userId: workout.userId,
              name: `אימון ${new Date().toLocaleDateString('he-IL')}`,
              date: workout.startedAt,
              startTime: workout.startedAt,
              endTime,
              duration,
              status,
              exercises,
              completedExercises: workout.stats.completedExercises,
              totalExercises: workout.stats.totalExercises,
              completedSets: workout.stats.completedSets,
              totalSets: workout.stats.totalSets,
              totalVolume: workout.stats.totalVolume,
              personalRecords: 0,
              calories: pendingCalories,
            })
            console.log('=== SAVE WORKOUT SUCCESS (from effect) ===')
          }
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
        setFirebaseWorkoutId(null)
        setShowSummaryModal(false)
        setPendingCalories(undefined)
        localStorage.removeItem('gymiq_firebase_workout_id')
        hasInitialized.current = false
        setConfirmModal({ type: null })
        navigate('/workout/history')
      }

      doFinish()
    }
  }, [shouldFinish, workout, firebaseWorkoutId, pendingCalories, clearStorage, clearWorkout, navigate])

  // Exit workout (final save to Firebase as in_progress and clear)
  const exitWorkout = useCallback(async () => {
    console.log('🚪 exitWorkout called')

    // Cancel any pending auto-save
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current)
    }

    if (workout) {
      const endTime = new Date()
      const duration = Math.floor((endTime.getTime() - workout.startedAt.getTime()) / 60000)

      console.log('💾 Final save as in_progress before exit')

      try {
        const exercises = workout.exercises.map((ex) => ({
          exerciseId: ex.exerciseId,
          exerciseName: ex.exerciseName,
          exerciseNameHe: ex.exerciseNameHe,
          imageUrl: ex.imageUrl || '',
          category: ex.category || '',
          isCompleted: ex.isCompleted,
          notes: ex.notes,
          sets: ex.reportedSets.map((set) => ({
            type: 'working' as SetType,
            targetReps: 0,
            targetWeight: 0,
            actualReps: set.reps,
            actualWeight: set.weight,
            completed: set.reps > 0,
          })),
        }))

        // Use existing Firebase document if available
        await autoSaveWorkout(firebaseWorkoutId, {
          userId: workout.userId,
          name: `אימון ${new Date().toLocaleDateString('he-IL')}`,
          date: workout.startedAt,
          startTime: workout.startedAt,
          endTime,
          duration,
          status: 'in_progress',
          exercises,
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

    // Clear everything - but DON'T clear the Firebase workout ID from storage
    // so we can find it later if the user comes back
    clearStorage()
    clearWorkout()
    setWorkout(null)
    setFirebaseWorkoutId(null)
    // Keep the firebase ID in localStorage for recovery!
    hasInitialized.current = false
    setConfirmModal({ type: null })

    navigate('/dashboard')
  }, [workout, firebaseWorkoutId, clearStorage, clearWorkout, navigate])

  // Finish workout with calories (called from summary modal)
  const finishWorkoutWithCalories = useCallback((calories?: number) => {
    console.log('=== FINISH WORKOUT WITH CALORIES ===')
    console.log('calories:', calories)
    setPendingCalories(calories)
    setShowSummaryModal(false)
    setShouldFinish(true)
  }, [])

  // Finish workout (save to Firebase and clear) - legacy, triggers summary modal flow
  const finishWorkout = useCallback(async () => {
    console.log('=== FINISH WORKOUT START ===')
    // Show summary modal instead of finishing directly
    setShowSummaryModal(true)
  }, [])

  // Group exercises by muscle
  const exercisesByMuscle = useMemo((): MuscleGroupExercises[] => {
    if (!workout) return []

    const groups: Record<string, ActiveWorkoutExercise[]> = {}

    workout.exercises.forEach((ex) => {
      // Use category first, fall back to primaryMuscle (for older data)
      const muscle = ex.category || ex.primaryMuscle || 'other'
      // Try dynamic mapping from Firebase first, then static muscleGroupNames, then raw muscle ID
      const muscleHe = dynamicMuscleNames[muscle] || muscleGroupNames[muscle] || muscle

      if (!groups[muscleHe]) {
        groups[muscleHe] = []
      }
      groups[muscleHe].push(ex)
    })

    return Object.entries(groups).map(([muscleGroupHe, exercises]) => ({
      muscleGroup: exercises[0]?.category || exercises[0]?.primaryMuscle || 'other',
      muscleGroupHe,
      exercises,
    }))
  }, [workout, dynamicMuscleNames])

  // Group exercises by equipment
  const exercisesByEquipment = useMemo((): EquipmentGroupExercises[] => {
    if (!workout) return []

    const groups: Record<string, ActiveWorkoutExercise[]> = {}

    workout.exercises.forEach((ex) => {
      const equipment = ex.equipment || 'other'
      const equipmentHe = equipmentNames[equipment] || equipment

      if (!groups[equipmentHe]) {
        groups[equipmentHe] = []
      }
      groups[equipmentHe].push(ex)
    })

    return Object.entries(groups).map(([equipmentHe, exercises]) => ({
      equipment: exercises[0]?.equipment || 'other',
      equipmentHe,
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
    exercisesByEquipment,
    showSummaryModal,

    // Exercise actions
    toggleExercise,
    addSet,
    updateSet,
    deleteSet,
    finishExercise,
    updateExerciseNotes,

    // Workout actions
    confirmDeleteExercise,
    deleteExercise,
    confirmExit,
    exitWorkout,
    confirmFinish,
    handleConfirmFinish,
    finishWorkout,
    finishWorkoutWithCalories,
    closeModal,
    closeSummaryModal,
  }
}
