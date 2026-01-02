/**
 * useWorkoutSession Hook
 * Manages workout session state with persistence
 */

import { useState, useEffect, useCallback } from 'react'
import type {
  ActiveWorkoutSession,
  SessionExercise,
  SetInputValues,
  WorkoutSessionState,
  CompletedSet,
} from '../types/workout-session.types'
import { SESSION_STORAGE_KEY } from '../types/workout-session.types'
import { useWorkoutBuilderStore } from '../store'

// Haptic feedback helper
const triggerHaptic = (type: 'light' | 'medium' | 'heavy' = 'medium') => {
  if ('vibrate' in navigator) {
    const patterns = { light: 10, medium: 20, heavy: 50 }
    navigator.vibrate(patterns[type])
  }
}

// Sound helper
const playSound = (type: 'complete' | 'rest_end') => {
  // Simple beep using Web Audio API
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    oscillator.frequency.value = type === 'complete' ? 800 : 600
    oscillator.type = 'sine'
    gainNode.gain.value = 0.3

    oscillator.start()
    oscillator.stop(audioContext.currentTime + 0.15)
  } catch (e) {
    // Audio not available
  }
}

export function useWorkoutSession() {
  const { selectedExercises, workoutName, clearWorkout } = useWorkoutBuilderStore()

  // Session state
  const [session, setSession] = useState<ActiveWorkoutSession | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Settings
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [hapticEnabled, setHapticEnabled] = useState(true)

  // Initialize or restore session
  useEffect(() => {
    const savedSession = localStorage.getItem(SESSION_STORAGE_KEY)

    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession)
        // Convert date strings back to Date objects
        parsed.startedAt = new Date(parsed.startedAt)
        parsed.exercises = parsed.exercises.map((ex: any) => ({
          ...ex,
          completedSets: ex.completedSets.map((set: any) => ({
            ...set,
            completedAt: new Date(set.completedAt),
          })),
        }))
        if (parsed.restTimer.startedAt) {
          parsed.restTimer.startedAt = new Date(parsed.restTimer.startedAt)
        }
        setSession(parsed)
      } catch (e) {
        console.error('Failed to restore session:', e)
        initNewSession()
      }
    } else if (selectedExercises.length > 0) {
      initNewSession()
    }

    setIsLoading(false)
  }, [])

  // Initialize new session from selected exercises
  const initNewSession = useCallback(() => {
    if (selectedExercises.length === 0) return

    const exercises: SessionExercise[] = selectedExercises.map((ex, index) => ({
      id: `session_ex_${index}_${Date.now()}`,
      exerciseId: ex.exerciseId,
      exerciseName: ex.exerciseName,
      exerciseNameHe: ex.exerciseNameHe,
      imageUrl: ex.imageUrl,
      instructions: undefined,
      plannedSets: ex.sets.map((set, setIndex) => ({
        setNumber: setIndex + 1,
        setType: set.type,
        targetReps: set.targetReps || 10,
        targetWeight: set.targetWeight || 0,
        targetRIR: undefined,
        restSeconds: ex.restTime || 90,
      })),
      completedSets: [],
      currentSetIndex: 0,
      isCompleted: false,
    }))

    const totalSets = exercises.reduce((sum, ex) => sum + ex.plannedSets.length, 0)

    const newSession: ActiveWorkoutSession = {
      id: `session_${Date.now()}`,
      workoutName: workoutName || `אימון ${new Date().toLocaleDateString('he-IL')}`,
      startedAt: new Date(),
      currentExerciseIndex: 0,
      state: 'performing_set',
      exercises,
      restTimer: {
        isActive: false,
        targetSeconds: 90,
      },
      stats: {
        totalTimeSeconds: 0,
        totalVolume: 0,
        completedSets: 0,
        totalSets,
        completedExercises: 0,
      },
    }

    setSession(newSession)
    saveSession(newSession)
  }, [selectedExercises, workoutName])

  // Save session to localStorage
  const saveSession = useCallback((sessionToSave: ActiveWorkoutSession) => {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionToSave))
  }, [])

  // Clear session from localStorage
  const clearSession = useCallback(() => {
    localStorage.removeItem(SESSION_STORAGE_KEY)
    setSession(null)
  }, [])

  // Update session and save
  const updateSession = useCallback((updates: Partial<ActiveWorkoutSession> | ((prev: ActiveWorkoutSession) => ActiveWorkoutSession)) => {
    setSession(prev => {
      if (!prev) return prev
      const newSession = typeof updates === 'function' ? updates(prev) : { ...prev, ...updates }
      saveSession(newSession)
      return newSession
    })
  }, [saveSession])

  // Get current exercise
  const currentExercise = session?.exercises[session.currentExerciseIndex]

  // Get current set
  const currentSet = currentExercise?.plannedSets[currentExercise.currentSetIndex]

  // Complete set
  const completeSet = useCallback((values: SetInputValues) => {
    if (!session || !currentExercise || !currentSet) return

    if (hapticEnabled) triggerHaptic('medium')
    if (soundEnabled) playSound('complete')

    const completedSet: CompletedSet = {
      setNumber: currentSet.setNumber,
      setType: currentSet.setType,
      actualReps: values.reps,
      actualWeight: values.weight,
      actualRIR: values.rir,
      completedAt: new Date(),
    }

    updateSession(prev => {
      const exercises = [...prev.exercises]
      const exercise = { ...exercises[prev.currentExerciseIndex] }

      exercise.completedSets = [...exercise.completedSets, completedSet]

      const isLastSet = exercise.currentSetIndex >= exercise.plannedSets.length - 1

      if (isLastSet) {
        // Last set - mark exercise as completed
        exercise.isCompleted = true
        exercise.currentSetIndex = exercise.plannedSets.length - 1
      } else {
        // Move to next set
        exercise.currentSetIndex += 1
      }

      exercises[prev.currentExerciseIndex] = exercise

      // Calculate new stats
      const volume = values.reps * values.weight
      const completedSetsCount = exercises.reduce((sum, ex) => sum + ex.completedSets.length, 0)
      const completedExercisesCount = exercises.filter(ex => ex.isCompleted).length

      return {
        ...prev,
        exercises,
        state: 'resting' as WorkoutSessionState,
        restTimer: {
          isActive: true,
          targetSeconds: currentSet.restSeconds || 90,
          startedAt: new Date(),
        },
        stats: {
          ...prev.stats,
          totalVolume: prev.stats.totalVolume + volume,
          completedSets: completedSetsCount,
          completedExercises: completedExercisesCount,
        },
      }
    })
  }, [session, currentExercise, currentSet, hapticEnabled, soundEnabled, updateSession])

  // Skip rest
  const skipRest = useCallback(() => {
    if (!session) return

    updateSession(prev => {
      const currentEx = prev.exercises[prev.currentExerciseIndex]

      // If exercise completed, move to next exercise
      if (currentEx.isCompleted) {
        const nextExIndex = prev.exercises.findIndex((ex, i) => i > prev.currentExerciseIndex && !ex.isCompleted)
        if (nextExIndex !== -1) {
          return {
            ...prev,
            currentExerciseIndex: nextExIndex,
            state: 'performing_set',
            restTimer: { isActive: false, targetSeconds: 90 },
          }
        }
      }

      return {
        ...prev,
        state: 'performing_set',
        restTimer: { isActive: false, targetSeconds: 90 },
      }
    })
  }, [session, updateSession])

  // Rest timer end
  const onRestEnd = useCallback(() => {
    if (hapticEnabled) triggerHaptic('heavy')
    if (soundEnabled) playSound('rest_end')
    skipRest()
  }, [hapticEnabled, soundEnabled, skipRest])

  // Set rest time
  const setRestTime = useCallback((seconds: number) => {
    updateSession(prev => ({
      ...prev,
      restTimer: { ...prev.restTimer, targetSeconds: seconds },
    }))
  }, [updateSession])

  // Complete exercise
  const completeExercise = useCallback(() => {
    if (!session) return

    if (hapticEnabled) triggerHaptic('heavy')

    updateSession(prev => {
      const exercises = [...prev.exercises]
      exercises[prev.currentExerciseIndex] = {
        ...exercises[prev.currentExerciseIndex],
        isCompleted: true,
      }

      const completedExercisesCount = exercises.filter(ex => ex.isCompleted).length

      // Find next uncompleted exercise
      const nextExIndex = exercises.findIndex((ex, i) => i > prev.currentExerciseIndex && !ex.isCompleted)

      return {
        ...prev,
        exercises,
        currentExerciseIndex: nextExIndex !== -1 ? nextExIndex : prev.currentExerciseIndex,
        stats: {
          ...prev.stats,
          completedExercises: completedExercisesCount,
        },
      }
    })
  }, [session, hapticEnabled, updateSession])

  // Navigate to exercise
  const navigateToExercise = useCallback((index: number) => {
    if (!session || index < 0 || index >= session.exercises.length) return

    updateSession({ currentExerciseIndex: index })
  }, [session, updateSession])

  // Go to next exercise
  const goToNextExercise = useCallback(() => {
    if (!session) return
    const nextIndex = Math.min(session.currentExerciseIndex + 1, session.exercises.length - 1)
    navigateToExercise(nextIndex)
  }, [session, navigateToExercise])

  // Go to previous exercise
  const goToPreviousExercise = useCallback(() => {
    if (!session) return
    const prevIndex = Math.max(session.currentExerciseIndex - 1, 0)
    navigateToExercise(prevIndex)
  }, [session, navigateToExercise])

  // Finish workout
  const finishWorkout = useCallback(() => {
    clearSession()
    clearWorkout()
  }, [clearSession, clearWorkout])

  return {
    session,
    isLoading,
    currentExercise,
    currentSet,

    // Actions
    completeSet,
    skipRest,
    onRestEnd,
    setRestTime,
    completeExercise,
    navigateToExercise,
    goToNextExercise,
    goToPreviousExercise,
    finishWorkout,
    clearSession,
    initNewSession,

    // Settings
    soundEnabled,
    setSoundEnabled,
    hapticEnabled,
    setHapticEnabled,
  }
}
