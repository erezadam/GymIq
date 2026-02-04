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
  getExerciseNotesForExercises,
  autoSaveWorkout,
  getInProgressWorkout,
  completeWorkout,
} from '@/lib/firebase/workoutHistory'
import { getExerciseById } from '@/lib/firebase/exercises'
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
  const { selectedExercises, clearWorkout, removeExercise: removeFromStore, programId, programDayLabel, workoutName: builderWorkoutName, targetUserId, reportedBy, reportedByName } = useWorkoutBuilderStore()

  // Effective userId: trainee (if trainer reporting) or current user
  const effectiveUserId = targetUserId || user?.uid || 'anonymous'

  // Separate localStorage keys per target user (prevents trainer's own workout being overwritten)
  const storageKey = targetUserId
    ? `gymiq_active_workout_v2_${targetUserId}`
    : ACTIVE_WORKOUT_STORAGE_KEY
  const firebaseIdKey = targetUserId
    ? `gymiq_firebase_workout_id_${targetUserId}`
    : 'gymiq_firebase_workout_id'

  // State
  const [workout, setWorkout] = useState<ActiveWorkout | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState>({ type: null })
  const [showSummaryModal, setShowSummaryModal] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Dynamic muscle name mapping from Firebase
  const [dynamicMuscleNames, setDynamicMuscleNames] = useState<Record<string, string>>({})

  // Firebase workout ID for auto-save
  const [firebaseWorkoutId, setFirebaseWorkoutId] = useState<string | null>(null)

  // Timer ref for elapsed time
  const timerRef = useRef<number | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  // Auto-save debounce ref
  const autoSaveTimeoutRef = useRef<number | null>(null)

  // Flag to prevent auto-save from running during finish workflow
  const isFinishingRef = useRef(false)

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
    localStorage.setItem(storageKey, JSON.stringify(workoutToSave))
  }, [storageKey])

  // Clear from localStorage
  const clearStorage = useCallback(() => {
    localStorage.removeItem(storageKey)
  }, [storageKey])

  // Auto-save to Firebase (debounced)
  const triggerAutoSave = useCallback((workoutToSave: ActiveWorkout, currentFirebaseId: string | null) => {
    // Clear any pending auto-save
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current)
    }

    // Debounce: wait 2 seconds after last change before saving
    autoSaveTimeoutRef.current = window.setTimeout(async () => {
      // Skip auto-save if we're in the process of finishing the workout
      if (isFinishingRef.current) {
        console.log('⏸️ Skipping auto-save - workout is being finished')
        return
      }

      try {
        const endTime = new Date()
        const duration = Math.floor((endTime.getTime() - workoutToSave.startedAt.getTime()) / 60000)

        const savedId = await autoSaveWorkout(currentFirebaseId, {
          userId: workoutToSave.userId,
          ...(workoutToSave.reportedBy && { reportedBy: workoutToSave.reportedBy }),
          ...(workoutToSave.reportedByName && { reportedByName: workoutToSave.reportedByName }),
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
            // Assistance configuration
            ...(ex.assistanceType && { assistanceType: ex.assistanceType }),
            sets: ex.reportedSets.map((set) => ({
              type: 'working',
              targetReps: 0,
              targetWeight: 0,
              actualReps: set.reps,
              actualWeight: set.weight,
              completed: set.reps > 0,
              // Extended fields (only include if defined - Firebase doesn't accept undefined)
              ...(set.time !== undefined && set.time > 0 && { time: set.time }),
              ...(set.intensity !== undefined && set.intensity > 0 && { intensity: set.intensity }),
              ...(set.speed !== undefined && set.speed > 0 && { speed: set.speed }),
              ...(set.distance !== undefined && set.distance > 0 && { distance: set.distance }),
              ...(set.incline !== undefined && set.incline > 0 && { incline: set.incline }),
              // Assistance fields
              ...(set.assistanceWeight !== undefined && { assistanceWeight: set.assistanceWeight }),
              ...(set.assistanceBand && { assistanceBand: set.assistanceBand }),
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
          localStorage.setItem(firebaseIdKey, savedId)
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
      const isContinuingFromHistory = continueWorkoutData &&
        (continueWorkoutMode === 'in_progress' || continueWorkoutMode === 'planned')

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
      // Skip this if continuing from history or if trainer is reporting for a trainee
      if (user?.uid && selectedExercises.length === 0 && !isContinuingFromHistory && !targetUserId) {
        try {
          const firebaseWorkout = await getInProgressWorkout(user.uid)
          if (firebaseWorkout) {
            console.log('🔥 Found in_progress workout in Firebase:', firebaseWorkout.id)

            // Fetch exercise details (category, primaryMuscle, equipment) from exercise service
            const exerciseDetailsMap = new Map<string, { primaryMuscle: string; category: string; equipment: string; imageUrl: string; name: string; nameHe: string }>()
            await Promise.all(
              firebaseWorkout.exercises.map(async (ex: any) => {
                try {
                  const details = await getExerciseById(ex.exerciseId)
                  if (details) {
                    exerciseDetailsMap.set(ex.exerciseId, {
                      primaryMuscle: details.primaryMuscle || '',
                      category: details.category || '',
                      equipment: details.equipment || '',
                      imageUrl: details.imageUrl || '',
                      name: details.name || '',
                      nameHe: details.nameHe || '',
                    })
                  }
                } catch {
                  // Silently continue - exercise data from Firebase is used as fallback
                }
              })
            )

            // Convert Firebase workout to ActiveWorkout format
            const restoredWorkout: ActiveWorkout = {
              id: firebaseWorkout.id,
              startedAt: firebaseWorkout.startTime,
              userId: firebaseWorkout.userId,
              exercises: firebaseWorkout.exercises.map((ex: any, index: number) => {
                const details = exerciseDetailsMap.get(ex.exerciseId)
                return {
                  id: `workout_ex_${index}_${Date.now()}`,
                  exerciseId: ex.exerciseId,
                  exerciseName: details?.name || ex.exerciseName,
                  exerciseNameHe: details?.nameHe || ex.exerciseNameHe,
                  imageUrl: details?.imageUrl || ex.imageUrl,
                  primaryMuscle: details?.primaryMuscle || 'other',
                  category: details?.category || undefined,
                  equipment: details?.equipment || undefined,
                  isExpanded: false,
                  isCompleted: ex.isCompleted,
                  // Restore assistance type
                  ...(ex.assistanceType && { assistanceType: ex.assistanceType }),
                  reportedSets: ex.sets.map((set: any, setIndex: number) => ({
                    id: `set_${Date.now()}_${setIndex}`,
                    setNumber: setIndex + 1,
                    weight: set.actualWeight || 0,
                    reps: set.actualReps || 0,
                    completedAt: set.completed ? new Date() : undefined,
                    // Extended fields
                    ...(set.time && { time: set.time }),
                    ...(set.intensity && { intensity: set.intensity }),
                    ...(set.speed && { speed: set.speed }),
                    ...(set.distance && { distance: set.distance }),
                    ...(set.incline && { incline: set.incline }),
                    // Assistance fields
                    assistanceWeight: set.assistanceWeight,
                    assistanceBand: set.assistanceBand,
                  })),
                }
              }),
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
            localStorage.setItem(firebaseIdKey, firebaseWorkout.id)
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
      let aiRecommendations: Record<string, { weight: number; repRange: string; sets: number }> | null = null

      if (isContinuingFromHistory) {
        try {
          continueData = JSON.parse(continueWorkoutData!)
          console.log('📋 Parsing continueWorkoutData with', continueData?.length, 'exercises')

          // Load AI recommendations if available
          const storedRecommendations = localStorage.getItem('continueAIRecommendations')
          if (storedRecommendations) {
            aiRecommendations = JSON.parse(storedRecommendations)
            console.log('💡 Loaded AI recommendations for', Object.keys(aiRecommendations!).length, 'exercises')
          }

          // Check for existing workout ID to prevent duplication
          const existingWorkoutId = localStorage.getItem('continueWorkoutId')
          if (existingWorkoutId) {
            console.log('📋 Found existing workout ID:', existingWorkoutId)
            setFirebaseWorkoutId(existingWorkoutId)
            localStorage.setItem(firebaseIdKey, existingWorkoutId)
          } else {
            // Check if we already have a Firebase workout ID (from previous initialization)
            // Don't clear it - it might be needed for continuing the workout
            const existingFirebaseId = localStorage.getItem(firebaseIdKey)
            if (existingFirebaseId) {
              console.log('📋 Keeping existing Firebase workout ID:', existingFirebaseId)
              setFirebaseWorkoutId(existingFirebaseId)
            }
          }

          // Clear old localStorage workout - we're starting fresh from history data
          localStorage.removeItem(ACTIVE_WORKOUT_STORAGE_KEY)
          // DON'T set hasInitialized.current = false - it causes race conditions!
          // The isContinuingFromHistory flag is enough to allow initialization to proceed
        } catch (e) {
          console.error('Failed to parse continueWorkoutData:', e)
        }
        // Clear the localStorage flags after reading
        localStorage.removeItem('continueWorkoutData')
        localStorage.removeItem('continueWorkoutMode')
        localStorage.removeItem('continueWorkoutId')
        localStorage.removeItem('continueAIRecommendations')
      }

      // Try to restore from localStorage (only if not continuing from history)
      const savedWorkout = localStorage.getItem(storageKey)
      const savedFirebaseId = localStorage.getItem(firebaseIdKey)
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

          // Fetch missing reportType from Firebase for exercises that don't have it
          const exercisesMissingReportType = parsed.exercises.filter(
            (ex: ActiveWorkoutExercise) => !ex.reportType
          )
          if (exercisesMissingReportType.length > 0) {
            console.log(`📋 Fetching reportType for ${exercisesMissingReportType.length} exercises from Firebase`)
            try {
              const reportTypeUpdates = await Promise.all(
                exercisesMissingReportType.map(async (ex: ActiveWorkoutExercise) => {
                  const exerciseData = await getExerciseById(ex.exerciseId)
                  return {
                    exerciseId: ex.exerciseId,
                    reportType: exerciseData?.reportType || 'weight_reps',
                  }
                })
              )
              // Update exercises with fetched reportType
              parsed.exercises = parsed.exercises.map((ex: ActiveWorkoutExercise) => {
                const update = reportTypeUpdates.find((u) => u.exerciseId === ex.exerciseId)
                if (update && !ex.reportType) {
                  console.log(`✅ Updated reportType for ${ex.exerciseNameHe}: ${update.reportType}`)
                  return { ...ex, reportType: update.reportType }
                }
                return ex
              })
            } catch (e) {
              console.error('Failed to fetch reportType from Firebase:', e)
            }
          }

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
            const newExercises: ActiveWorkoutExercise[] = newExercisesToAdd.map((ex, index) => {
              // Auto-select assistance type if only one option
              let autoSelectedAssistanceType: 'graviton' | 'bands' | undefined
              if (ex.assistanceTypes && ex.assistanceTypes.length === 1) {
                autoSelectedAssistanceType = ex.assistanceTypes[0]
              }

              return {
                id: `workout_ex_${parsed.exercises.length + index}_${Date.now()}`,
                exerciseId: ex.exerciseId,
                exerciseName: ex.exerciseName,
                exerciseNameHe: ex.exerciseNameHe,
                imageUrl: ex.imageUrl,
                primaryMuscle: ex.primaryMuscle || 'other',
                category: ex.category,
                equipment: ex.equipment,
                reportType: ex.reportType,
                assistanceTypes: ex.assistanceTypes,    // Pass assistance options
                availableBands: ex.availableBands,      // Pass available bands
                assistanceType: autoSelectedAssistanceType, // Auto-select if only one option
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
              }
            })

            // Fetch last workout data and historical notes for new exercises
            if (user?.uid) {
              try {
                const exerciseIds = newExercises.map((ex) => ex.exerciseId)
                const [lastWorkoutData, historicalNotes] = await Promise.all([
                  getLastWorkoutForExercises(user.uid, exerciseIds),
                  getExerciseNotesForExercises(user.uid, exerciseIds),
                ])
                newExercises.forEach((ex) => {
                  if (lastWorkoutData[ex.exerciseId]) {
                    ex.lastWorkoutData = lastWorkoutData[ex.exerciseId]
                  }
                  if (historicalNotes[ex.exerciseId]?.length > 0) {
                    ex.historicalNotes = historicalNotes[ex.exerciseId]
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
          localStorage.removeItem(storageKey)
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
              // Extended fields
              ...(set.time && { time: set.time }),
              ...(set.intensity && { intensity: set.intensity }),
              ...(set.speed && { speed: set.speed }),
              ...(set.distance && { distance: set.distance }),
              ...(set.incline && { incline: set.incline }),
              // Assistance fields
              assistanceWeight: set.assistanceWeight,
              assistanceBand: set.assistanceBand,
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

          // Auto-select assistance type if only one option
          let autoSelectedAssistanceType: 'graviton' | 'bands' | undefined
          if (ex.assistanceTypes && ex.assistanceTypes.length === 1) {
            autoSelectedAssistanceType = ex.assistanceTypes[0]
            console.log(`🔧 Auto-selecting assistance type for ${ex.exerciseNameHe}: ${autoSelectedAssistanceType}`)
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
            assistanceTypes: ex.assistanceTypes,    // Pass assistance options
            availableBands: ex.availableBands,      // Pass available bands
            assistanceType: autoSelectedAssistanceType, // Auto-select if only one option
            isExpanded: false, // All exercises start collapsed
            isCompleted: continueExercise?.isCompleted || false,
            reportedSets,
            // Attach AI recommendation if available
            ...(aiRecommendations?.[ex.exerciseId] && {
              aiRecommendation: aiRecommendations[ex.exerciseId],
            }),
          }
        })

        // Fetch last workout data and historical notes for all exercises
        if (user?.uid) {
          try {
            const exerciseIds = exercises.map((ex) => ex.exerciseId)
            const [lastWorkoutData, historicalNotes] = await Promise.all([
              getLastWorkoutForExercises(user.uid, exerciseIds),
              getExerciseNotesForExercises(user.uid, exerciseIds),
            ])

            // Update exercises with last workout data and historical notes
            exercises.forEach((ex) => {
              if (lastWorkoutData[ex.exerciseId]) {
                ex.lastWorkoutData = lastWorkoutData[ex.exerciseId]
              }
              if (historicalNotes[ex.exerciseId]?.length > 0) {
                ex.historicalNotes = historicalNotes[ex.exerciseId]
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
          userId: effectiveUserId,
          ...(reportedBy && { reportedBy }),
          ...(reportedByName && { reportedByName }),
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
        // Use existing ID if continuing workout, or create new
        const existingId = localStorage.getItem(firebaseIdKey)
        try {
          const endTime = new Date()
          const savedId = await autoSaveWorkout(existingId, {
            userId: newWorkout.userId,
            ...(reportedBy && { reportedBy }),
            ...(reportedByName && { reportedByName }),
            name: builderWorkoutName || `אימון ${newWorkout.startedAt.toLocaleDateString('he-IL')}`,
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
              // Assistance configuration
              ...(ex.assistanceType && { assistanceType: ex.assistanceType }),
              sets: ex.reportedSets.map((set) => ({
                type: 'working',
                targetReps: 0,
                targetWeight: 0,
                actualReps: set.reps,
                actualWeight: set.weight,
                completed: set.reps > 0,
                // Extended fields
                ...(set.time !== undefined && set.time > 0 && { time: set.time }),
                ...(set.intensity !== undefined && set.intensity > 0 && { intensity: set.intensity }),
                ...(set.speed !== undefined && set.speed > 0 && { speed: set.speed }),
                ...(set.distance !== undefined && set.distance > 0 && { distance: set.distance }),
                ...(set.incline !== undefined && set.incline > 0 && { incline: set.incline }),
                // Assistance fields
                ...(set.assistanceWeight !== undefined && { assistanceWeight: set.assistanceWeight }),
                ...(set.assistanceBand && { assistanceBand: set.assistanceBand }),
              })),
            })),
            completedExercises: newWorkout.stats.completedExercises,
            totalExercises: newWorkout.exercises.length,
            completedSets: newWorkout.stats.completedSets,
            totalSets: newWorkout.stats.totalSets,
            totalVolume: newWorkout.stats.totalVolume,
            personalRecords: 0,
            // Trainer program fields
            ...(programId && { source: 'trainer_program' as const, programId, programDayLabel }),
          })

          setFirebaseWorkoutId(savedId)
          localStorage.setItem(firebaseIdKey, savedId)
          console.log(existingId ? '✅ Existing workout updated in Firebase:' : '✅ New workout created in Firebase:', savedId)
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
  // Shows reminder if user has unclosed exercise with reported sets
  const toggleExercise = useCallback(
    (exerciseId: string) => {
      if (!workout) return

      // Find the currently expanded exercise
      const currentlyExpanded = workout.exercises.find(ex => ex.isExpanded)

      // Check if user is trying to open a DIFFERENT exercise
      const isOpeningDifferent = currentlyExpanded && currentlyExpanded.id !== exerciseId

      // Check if currently expanded exercise has unreported completion
      // (has sets with reps > 0, but not marked as completed)
      const hasUnfinishedSets = currentlyExpanded &&
        !currentlyExpanded.isCompleted &&
        currentlyExpanded.reportedSets.some(set => set.reps > 0)

      // If trying to open different exercise and current has unfinished sets, show reminder
      if (isOpeningDifferent && hasUnfinishedSets) {
        const setsWithReps = currentlyExpanded.reportedSets.filter(set => set.reps > 0).length
        setConfirmModal({
          type: 'finish_exercise_reminder',
          exerciseId: currentlyExpanded.id,
          exerciseName: currentlyExpanded.exerciseNameHe,
          pendingExerciseId: exerciseId,
          setsCount: setsWithReps,
        })
        return
      }

      // Normal toggle behavior
      updateWorkout((prev) => ({
        ...prev,
        exercises: prev.exercises.map((ex) => ({
          ...ex,
          isExpanded: ex.id === exerciseId ? !ex.isExpanded : false,
        })),
      }))
    },
    [updateWorkout, workout]
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
          // Copy assistance fields from previous set
          assistanceWeight: lastSet?.assistanceWeight,
          assistanceBand: lastSet?.assistanceBand,
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

  // Set assistance type for an exercise (undefined = use default reportType)
  const setAssistanceType = useCallback(
    (exerciseId: string, assistanceType: 'graviton' | 'bands' | undefined) => {
      updateWorkout((prev) => ({
        ...prev,
        exercises: prev.exercises.map((ex) =>
          ex.id === exerciseId ? { ...ex, assistanceType } : ex
        ),
      }))
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

  // Handle finish exercise reminder confirmation (finish current + open new)
  const handleFinishExerciseReminder = useCallback(() => {
    if (!confirmModal.exerciseId || !confirmModal.pendingExerciseId) return

    const currentExerciseId = confirmModal.exerciseId
    const pendingExerciseId = confirmModal.pendingExerciseId

    // Close modal first
    setConfirmModal({ type: null })

    // Finish current exercise
    finishExercise(currentExerciseId)

    // Then open the pending exercise
    updateWorkout((prev) => ({
      ...prev,
      exercises: prev.exercises.map((ex) => ({
        ...ex,
        isExpanded: ex.id === pendingExerciseId,
      })),
    }))
  }, [confirmModal, finishExercise, updateWorkout])

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
    if (!workout) {
      toast.error('שגיאה - אין אימון פעיל')
      return
    }

    // Check if there are incomplete exercises
    const incompleteCount = workout.stats.totalExercises - workout.stats.completedExercises

    if (incompleteCount > 0) {
      // Show warning modal
      setConfirmModal({
        type: 'incomplete_exercises_warning',
        incompleteCount,
      })
      return
    }

    // All exercises complete - show summary modal directly
    setShowSummaryModal(true)
  }, [workout])

  // Called when user confirms finish from confirmation modal (partial workout)
  const handleConfirmFinish = useCallback(() => {
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
      setShouldFinish(false)
      // We need to call finishWorkout here, but it's not defined yet
      // So we'll handle the finish logic inline
      const doFinish = async () => {
        // isFinishingRef and auto-save cancellation already done in finishWorkoutWithCalories
        // Re-confirm here as safety net
        isFinishingRef.current = true
        if (autoSaveTimeoutRef.current) {
          clearTimeout(autoSaveTimeoutRef.current)
          autoSaveTimeoutRef.current = null
        }

        if (!workout) {
          toast.error('שגיאה - אין אימון פעיל')
          isFinishingRef.current = false
          setIsSaving(false)
          setShowSummaryModal(false)
          return
        }

        const endTime = new Date()
        const duration = Math.floor((endTime.getTime() - workout.startedAt.getTime()) / 60000)
        const status = workout.stats.completedExercises === workout.stats.totalExercises
          ? 'completed'
          : workout.stats.completedExercises === 0
          ? 'cancelled'
          : 'partial'

        try {
          const exercises = workout.exercises.map((ex) => ({
            exerciseId: ex.exerciseId,
            exerciseName: ex.exerciseName,
            exerciseNameHe: ex.exerciseNameHe,
            imageUrl: ex.imageUrl || '',
            category: ex.category || '',
            isCompleted: ex.isCompleted,
            notes: ex.notes,
            // Assistance configuration
            ...(ex.assistanceType && { assistanceType: ex.assistanceType }),
            sets: ex.reportedSets.map((set) => ({
              type: 'working' as SetType,
              targetReps: 0,
              targetWeight: 0,
              actualReps: set.reps,
              actualWeight: set.weight,
              completed: set.reps > 0,
              // Extended fields (only include if defined - Firebase doesn't accept undefined)
              ...(set.time !== undefined && set.time > 0 && { time: set.time }),
              ...(set.intensity !== undefined && set.intensity > 0 && { intensity: set.intensity }),
              ...(set.speed !== undefined && set.speed > 0 && { speed: set.speed }),
              ...(set.distance !== undefined && set.distance > 0 && { distance: set.distance }),
              ...(set.incline !== undefined && set.incline > 0 && { incline: set.incline }),
              // Assistance fields
              ...(set.assistanceWeight !== undefined && { assistanceWeight: set.assistanceWeight }),
              ...(set.assistanceBand && { assistanceBand: set.assistanceBand }),
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
          } else {
            await saveWorkoutHistory({
              userId: workout.userId,
              ...(workout.reportedBy && { reportedBy: workout.reportedBy }),
              ...(workout.reportedByName && { reportedByName: workout.reportedByName }),
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
          }
          toast.success('האימון נשמר בהצלחה!')

          // Remember if this was a trainer report before clearing
          const wasTrainerReport = workout.reportedBy
          const reportTargetUserId = targetUserId

          // Clear everything ONLY after successful save
          clearStorage()
          clearWorkout()
          setWorkout(null)
          setFirebaseWorkoutId(null)
          setIsSaving(false)
          setShowSummaryModal(false)
          setPendingCalories(undefined)
          localStorage.removeItem(firebaseIdKey)
          hasInitialized.current = false
          setConfirmModal({ type: null })

          // Navigate back: trainer report → trainee detail, own workout → history
          if (wasTrainerReport && reportTargetUserId) {
            navigate(`/trainer/trainee/${reportTargetUserId}`)
          } else {
            navigate('/workout/history')
          }
        } catch (error: any) {
          console.error('Error saving workout:', error)
          toast.error('שגיאה בשמירת האימון', { duration: 5000 })
          // DON'T clear workout on error - let user try again
          // Keep modal open so user can retry
          isFinishingRef.current = false
          setIsSaving(false)
          setShouldFinish(false)
        }
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

    // Remember trainer report state before clearing
    const wasTrainerReport = workout?.reportedBy
    const reportTargetUserId = targetUserId

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
          ...(ex.assistanceType && { assistanceType: ex.assistanceType }),
          sets: ex.reportedSets.map((set) => ({
            type: 'working' as SetType,
            targetReps: 0,
            targetWeight: 0,
            actualReps: set.reps,
            actualWeight: set.weight,
            completed: set.reps > 0,
            // Extended fields (only include if defined - Firebase doesn't accept undefined)
            ...(set.time !== undefined && set.time > 0 && { time: set.time }),
            ...(set.intensity !== undefined && set.intensity > 0 && { intensity: set.intensity }),
            ...(set.speed !== undefined && set.speed > 0 && { speed: set.speed }),
            ...(set.distance !== undefined && set.distance > 0 && { distance: set.distance }),
            ...(set.incline !== undefined && set.incline > 0 && { incline: set.incline }),
            // Assistance fields
            ...(set.assistanceWeight !== undefined && { assistanceWeight: set.assistanceWeight }),
            ...(set.assistanceBand && { assistanceBand: set.assistanceBand }),
          })),
        }))

        // Use existing Firebase document if available
        await autoSaveWorkout(firebaseWorkoutId, {
          userId: workout.userId,
          ...(workout.reportedBy && { reportedBy: workout.reportedBy }),
          ...(workout.reportedByName && { reportedByName: workout.reportedByName }),
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

    // Navigate back: trainer report → trainee detail, own workout → dashboard
    if (wasTrainerReport && reportTargetUserId) {
      navigate(`/trainer/trainee/${reportTargetUserId}`)
    } else {
      navigate('/dashboard')
    }
  }, [workout, firebaseWorkoutId, targetUserId, clearStorage, clearWorkout, navigate])

  // Finish workout with calories (called from summary modal)
  const finishWorkoutWithCalories = useCallback((calories?: number) => {
    // CRITICAL: Block auto-save IMMEDIATELY to prevent race condition
    // Must happen before the effect fires, not inside it
    isFinishingRef.current = true
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current)
      autoSaveTimeoutRef.current = null
    }

    setPendingCalories(calories)
    setIsSaving(true)
    setShouldFinish(true)
  }, [])

  // Finish workout (save to Firebase and clear) - legacy, triggers summary modal flow
  const finishWorkout = useCallback(async () => {
    setShowSummaryModal(true)
  }, [])

  // Group exercises by muscle, sort exercises within groups by Hebrew name (A-Z)
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

    return Object.entries(groups)
      // Sort groups by Hebrew name
      .sort(([a], [b]) => a.localeCompare(b, 'he'))
      .map(([muscleGroupHe, exercises]) => ({
        muscleGroup: exercises[0]?.category || exercises[0]?.primaryMuscle || 'other',
        muscleGroupHe,
        // Sort exercises within group by Hebrew name (A-Z) - trim whitespace
        exercises: [...exercises].sort((a, b) =>
          (a.exerciseNameHe || '').trim().localeCompare((b.exerciseNameHe || '').trim(), 'he')
        ),
      }))
  }, [workout, dynamicMuscleNames])

  // Group exercises by equipment, sort exercises within groups by Hebrew name (A-Z)
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

    return Object.entries(groups)
      // Sort groups by Hebrew name
      .sort(([a], [b]) => a.localeCompare(b, 'he'))
      .map(([equipmentHe, exercises]) => ({
        equipment: exercises[0]?.equipment || 'other',
        equipmentHe,
        // Sort exercises within group by Hebrew name (A-Z) - trim whitespace
        exercises: [...exercises].sort((a, b) =>
          (a.exerciseNameHe || '').trim().localeCompare((b.exerciseNameHe || '').trim(), 'he')
        ),
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
    finishWorkout,
    finishWorkoutWithCalories,
    closeModal,
    closeSummaryModal,
  }
}
