/**
 * AI Trainer Service
 * Generates personalized workout plans using AI (Cloud Function) or fallback logic
 */

import { getExercises } from '@/lib/firebase/exercises'
import { getMuscles } from '@/lib/firebase/muscles'
import { getUserWorkoutHistory, getUserWorkoutHistoryFull, saveWorkoutHistory, getRecentlyDoneExerciseIds } from '@/lib/firebase/workoutHistory'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { app } from '@/lib/firebase/config'
import type { Exercise } from '@/domains/exercises/types'
import type { WorkoutHistoryEntry } from '@/domains/workouts/types'
import {
  AITrainerRequest,
  AITrainerResponse,
  AIGeneratedWorkout,
  AIGeneratedExercise,
  AITrainerContext,
  RecentWorkoutSummary,
  ExercisePerformanceData,
  getExerciseCount,
  getAIWorkoutName,
} from './aiTrainer.types'

// Cloud Function response type
interface CloudFunctionResponse {
  success: boolean
  workouts: AIGeneratedWorkout[]
  usedFallback: boolean
  error?: string
  rateLimitInfo?: {
    remaining: number
    resetAt: string
  }
}

// Initialize Firebase Functions
const functions = getFunctions(app)

/**
 * Call Cloud Function to generate workouts via Claude API
 * Returns null if Cloud Function fails (triggers local fallback)
 */
async function callCloudFunction(
  context: AITrainerContext
): Promise<CloudFunctionResponse | null> {
  try {
    console.log('☁️ Calling Cloud Function for AI workout generation...')

    const generateWorkout = httpsCallable<unknown, CloudFunctionResponse>(
      functions,
      'generateAIWorkout'
    )

    // Prepare data for Cloud Function (minimize payload size)
    const payload = {
      request: context.request,
      availableExercises: context.availableExercises.map(ex => ({
        id: ex.id,
        nameHe: ex.nameHe,
        primaryMuscle: ex.primaryMuscle,
        category: ex.category,
        imageUrl: ex.imageUrl,
      })),
      muscles: context.muscles.map(m => ({
        id: m.id,
        nameHe: m.nameHe,
      })),
      recentWorkouts: context.recentWorkouts,
      yesterdayExerciseIds: context.yesterdayExerciseIds,
      exerciseHistory: context.exerciseHistory,
    }

    const result = await generateWorkout(payload)

    console.log('☁️ Cloud Function response:', {
      success: result.data.success,
      workoutCount: result.data.workouts?.length || 0,
      usedFallback: result.data.usedFallback,
      rateLimitRemaining: result.data.rateLimitInfo?.remaining,
    })

    return result.data
  } catch (error: any) {
    console.error('☁️ Cloud Function call failed:', error.message)

    // Check for specific error types
    if (error.code === 'functions/resource-exhausted') {
      // Rate limit error from Cloud Function
      return {
        success: false,
        workouts: [],
        usedFallback: false,
        error: 'הגעת למגבלה היומית. נסה שוב מחר.',
      }
    }

    // Return null to trigger local fallback
    return null
  }
}

// Get next AI workout number for user
async function getNextAIWorkoutNumber(userId: string): Promise<number> {
  try {
    const history = await getUserWorkoutHistory(userId, 100)
    // Count existing AI workouts
    const aiWorkouts = history.filter(w => w.name.startsWith('מאמן #'))
    if (aiWorkouts.length === 0) return 1

    // Find highest number
    const numbers = aiWorkouts.map(w => {
      const match = w.name.match(/מאמן #(\d+)/)
      return match ? parseInt(match[1]) : 0
    })
    return Math.max(...numbers) + 1
  } catch (error) {
    console.warn('Failed to get AI workout number, using 1:', error)
    return 1
  }
}

// Extract per-exercise performance data from recent workout history
function extractExerciseHistory(recentHistory: WorkoutHistoryEntry[]): ExercisePerformanceData[] {
  // Map: exerciseId → list of { weight, reps, date } sorted by date (newest first)
  const exerciseMap = new Map<string, { weight: number; reps: number; date: string }[]>()

  // Only look at completed or in_progress workouts (not planned)
  const relevantWorkouts = recentHistory.filter(w =>
    w.status === 'completed' || w.status === 'in_progress' || w.status === 'partial'
  )

  for (const workout of relevantWorkouts) {
    const dateStr = workout.date.toISOString().split('T')[0]

    for (const exercise of workout.exercises) {
      if (!exercise.exerciseId) continue

      // Find best completed set (highest weight with reps > 0)
      const completedSets = exercise.sets.filter(s =>
        s.completed && (s.actualWeight || 0) > 0 && (s.actualReps || 0) > 0
      )

      if (completedSets.length === 0) continue

      // Get the heaviest set
      const bestSet = completedSets.reduce((best, s) =>
        (s.actualWeight || 0) > (best.actualWeight || 0) ? s : best
      )

      const entry = {
        weight: bestSet.actualWeight || 0,
        reps: bestSet.actualReps || 0,
        date: dateStr,
      }

      if (!exerciseMap.has(exercise.exerciseId)) {
        exerciseMap.set(exercise.exerciseId, [])
      }
      exerciseMap.get(exercise.exerciseId)!.push(entry)
    }
  }

  // Convert map to array of ExercisePerformanceData
  const result: ExercisePerformanceData[] = []

  for (const [exerciseId, sessions] of exerciseMap.entries()) {
    // Sort by date (newest first)
    sessions.sort((a, b) => b.date.localeCompare(a.date))

    result.push({
      exerciseId,
      lastWeight: sessions[0].weight,
      lastReps: sessions[0].reps,
      lastDate: sessions[0].date,
      recentSessions: sessions.slice(0, 5), // Last 5 sessions
    })
  }

  return result
}

// Build context for AI generation
async function buildContext(request: AITrainerRequest): Promise<AITrainerContext> {
  console.log('🤖 Building AI context...')

  // Load all data in parallel
  const [exercises, muscles, recentSummaries, recentFullHistory, yesterdayExerciseIdsSet] = await Promise.all([
    getExercises(),
    getMuscles(),
    getUserWorkoutHistory(request.userId, 7),
    getUserWorkoutHistoryFull(request.userId, 10), // Full entries for exercise performance data
    getRecentlyDoneExerciseIds(request.userId),
  ])

  // Convert Set to array
  const yesterdayExerciseIds = Array.from(yesterdayExerciseIdsSet)

  console.log(`📊 Loaded ${exercises.length} exercises, ${muscles.length} muscles`)
  console.log(`📊 Recent summaries: ${recentSummaries.length}, Full history: ${recentFullHistory.length}, Yesterday exercises: ${yesterdayExerciseIds.length}`)

  // Convert recent history to summaries
  const recentWorkouts: RecentWorkoutSummary[] = recentSummaries.map(w => ({
    date: w.date.toISOString().split('T')[0],
    muscleGroups: w.muscleGroups || [],
    exerciseIds: [], // We don't have exercise IDs in summary
  }))

  // Extract per-exercise performance data from full history
  const exerciseHistory = extractExerciseHistory(recentFullHistory)
  console.log(`📊 Exercise history: ${exerciseHistory.length} exercises with past performance data`)

  return {
    request,
    availableExercises: exercises,
    muscles,
    recentWorkouts,
    yesterdayExerciseIds,
    exerciseHistory,
  }
}

// Get muscles for a specific workout based on mode
function getMusclesForWorkout(
  request: AITrainerRequest,
  workoutIndex: number,
  allMuscleIds: string[],
  usedMuscleGroups: string[][]
): string[] {
  const mode = request.muscleSelectionMode || 'same'

  // Manual mode - use perWorkoutMuscles
  if (mode === 'manual' && request.perWorkoutMuscles?.[workoutIndex]?.length) {
    return request.perWorkoutMuscles[workoutIndex]
  }

  // Same mode - use muscleTargets for all workouts
  if (mode === 'same' && request.muscleTargets.length > 0) {
    return request.muscleTargets
  }

  // AI rotate mode - select different muscles for each workout
  if (mode === 'ai_rotate' || (mode === 'same' && request.muscleTargets.length === 0)) {
    // Get all muscles used in previous workouts
    const previouslyUsed = usedMuscleGroups.flat()

    // Filter out cardio and previously used muscles
    const availableMuscles = allMuscleIds.filter(
      id => id !== 'cardio' && !previouslyUsed.includes(id)
    )

    // If all muscles were used, reset
    const musclePool = availableMuscles.length >= 2
      ? availableMuscles
      : allMuscleIds.filter(id => id !== 'cardio')

    // Shuffle and pick 2-3 muscles
    const shuffled = [...musclePool].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, Math.min(3, shuffled.length))
  }

  // Fallback - random muscles
  const shuffled = [...allMuscleIds.filter(id => id !== 'cardio')].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, Math.min(3, shuffled.length))
}

// Fallback workout generation (when Claude API is unavailable)
// Returns the workout and the muscle IDs that were targeted
function generateFallbackWorkout(
  context: AITrainerContext,
  workoutNumber: number,
  workoutIndex: number,
  usedMuscleIds: string[][]
): { workout: AIGeneratedWorkout; targetMuscleIds: string[] } {
  const { request, availableExercises, muscles, yesterdayExerciseIds } = context
  const exerciseCount = getExerciseCount(request.duration)

  console.log(`🔄 Generating fallback workout #${workoutNumber} (index ${workoutIndex})`)
  console.log(`🎯 Target: ${exerciseCount} exercises, ${request.duration} min`)

  // Filter out yesterday's exercises
  const availableForToday = availableExercises.filter(
    ex => !yesterdayExerciseIds.includes(ex.id)
  )

  // Separate cardio exercises for warmup
  const cardioExercises = availableForToday.filter(ex =>
    ex.category === 'cardio' ||
    ex.name.toLowerCase().includes('cardio') ||
    ex.nameHe.includes('אירובי')
  )

  // Non-cardio exercises for main workout
  const strengthExercises = availableForToday.filter(ex =>
    ex.category !== 'cardio'
  )

  console.log(`📊 Available: ${cardioExercises.length} cardio, ${strengthExercises.length} strength`)

  // Select warmup exercise
  let warmupExercise: Exercise | null = null
  console.log(`🔥 Warmup: duration=${request.warmupDuration}, cardio exercises available=${cardioExercises.length}`)
  if (request.warmupDuration > 0 && cardioExercises.length > 0) {
    warmupExercise = cardioExercises[Math.floor(Math.random() * cardioExercises.length)]
    console.log(`🔥 Selected warmup: ${warmupExercise.nameHe}`)
  } else {
    console.log(`⚠️ No warmup: warmupDuration=${request.warmupDuration}, cardioExercises=${cardioExercises.length}`)
  }

  // Group exercises by muscle
  const muscleIdToName = muscles.reduce((map, m) => {
    map[m.id] = m.nameHe
    return map
  }, {} as Record<string, string>)

  // Get all muscle IDs
  const allMuscleIds = muscles.map(m => m.id)

  // Determine which muscles to target based on mode
  const targetMuscleIds = getMusclesForWorkout(request, workoutIndex, allMuscleIds, usedMuscleIds)

  console.log(`🎯 Target muscles: ${targetMuscleIds.join(', ')}`)

  // Select exercises for each muscle
  // exerciseCount is the number of MAIN exercises (not including warmup)
  const selectedExercises: Exercise[] = []
  const usedExerciseIds = new Set<string>()
  const exercisesPerMuscle = Math.ceil(exerciseCount / targetMuscleIds.length)

  for (const muscleId of targetMuscleIds) {
    const muscleExercises = strengthExercises.filter(ex =>
      ex.primaryMuscle === muscleId && !usedExerciseIds.has(ex.id)
    )

    console.log(`💪 Muscle "${muscleId}": ${muscleExercises.length} exercises available, need ${exercisesPerMuscle}`)

    // Shuffle and take exercises
    const shuffled = [...muscleExercises].sort(() => Math.random() - 0.5)
    const toAdd = shuffled.slice(0, exercisesPerMuscle)
    toAdd.forEach(ex => {
      selectedExercises.push(ex)
      usedExerciseIds.add(ex.id)
    })
  }

  console.log(`📊 Total selected: ${selectedExercises.length}, need: ${exerciseCount}`)

  // If we don't have enough exercises, fill from other available exercises
  if (selectedExercises.length < exerciseCount) {
    const remaining = exerciseCount - selectedExercises.length
    console.log(`⚠️ Missing ${remaining} exercises, filling from other muscles`)

    // Get exercises from any muscle that weren't already selected
    const additionalExercises = strengthExercises.filter(ex =>
      !usedExerciseIds.has(ex.id)
    )

    // Shuffle and add what we need
    const shuffledAdditional = [...additionalExercises].sort(() => Math.random() - 0.5)
    const toAdd = shuffledAdditional.slice(0, remaining)
    selectedExercises.push(...toAdd)

    console.log(`📊 After fill: ${selectedExercises.length} exercises`)
  }

  // Trim to exact count if needed (in case we somehow got more)
  const mainExercises = selectedExercises.slice(0, exerciseCount)
  console.log(`📊 Main exercises after trim: ${mainExercises.length}, warmup: ${warmupExercise ? 'YES' : 'NO'}, TOTAL: ${mainExercises.length + (warmupExercise ? 1 : 0)}`)

  // Build the workout
  const workoutExercises: AIGeneratedExercise[] = []

  // Add warmup if applicable
  if (warmupExercise) {
    workoutExercises.push(createExerciseEntry(warmupExercise, true, muscleIdToName, 1))
  }

  // Add main exercises
  mainExercises.forEach((ex) => {
    workoutExercises.push(createExerciseEntry(ex, false, muscleIdToName, 3))
  })

  // Get unique muscle groups (Hebrew names)
  const muscleGroups = [...new Set(workoutExercises
    .filter(e => !e.isWarmup)
    .map(e => e.category)
    .filter(Boolean)
  )] as string[]

  return {
    workout: {
      name: getAIWorkoutName(workoutNumber),
      exercises: workoutExercises,
      estimatedDuration: request.duration,
      muscleGroups,
      source: 'ai_trainer',
      aiWorkoutNumber: workoutNumber,
    },
    targetMuscleIds,  // Return muscle IDs for rotation tracking
  }
}

// Create exercise entry for workout
function createExerciseEntry(
  exercise: Exercise,
  isWarmup: boolean,
  muscleIdToName: Record<string, string>,
  targetSets: number
): AIGeneratedExercise {
  const targetReps = isWarmup ? '5-10' : '8-12'

  return {
    exerciseId: exercise.id,
    exerciseName: exercise.name,
    exerciseNameHe: exercise.nameHe,
    imageUrl: exercise.imageUrl,
    category: muscleIdToName[exercise.primaryMuscle] || exercise.primaryMuscle,
    primaryMuscle: exercise.primaryMuscle,
    isWarmup,
    targetSets,
    targetReps,
    sets: [], // AI workouts don't pre-create sets - trainee opens sets themselves
  }
}

// Convert AI workout to WorkoutHistoryEntry for saving
function convertToWorkoutEntry(
  workout: AIGeneratedWorkout,
  userId: string,
  bundleId: string | null // null for single workout, string for bundle
): Omit<WorkoutHistoryEntry, 'id'> {
  const now = new Date()

  return {
    userId,
    name: `אימון AI #${workout.aiWorkoutNumber}`, // שם אחיד לכל אימוני AI
    date: now,
    startTime: now,
    endTime: now,
    duration: workout.estimatedDuration,
    status: 'planned',
    exercises: workout.exercises.map((ex) => ({
      exerciseId: ex.exerciseId,
      exerciseName: ex.exerciseName,
      exerciseNameHe: ex.exerciseNameHe,
      imageUrl: ex.imageUrl,
      category: ex.category,
      isCompleted: false,
      notes: ex.aiNotes || '',
      sets: ex.sets,
    })),
    completedExercises: 0,
    totalExercises: workout.exercises.length,
    completedSets: 0,
    totalSets: workout.exercises.reduce((sum, ex) => sum + ex.sets.length, 0),
    totalVolume: 0,
    personalRecords: 0,
    notes: `אימון שנוצר ע"י מאמן AI`,
    // AI Trainer fields
    source: 'ai_trainer',
    aiWorkoutNumber: workout.aiWorkoutNumber,
    bundleId: bundleId || undefined, // undefined if single workout
    aiRecommendations: workout.aiRecommendations || undefined,
    aiExplanation: workout.aiExplanation || undefined,
  }
}

// Main function to generate workouts
export async function generateAIWorkouts(
  request: AITrainerRequest
): Promise<AITrainerResponse> {
  const timestamp = new Date().toLocaleString('he-IL')
  console.log('═══════════════════════════════════════════════')
  console.log(`🤖 Starting AI workout generation at ${timestamp}`)
  console.log('📋 Request:', JSON.stringify(request, null, 2))

  try {
    // Build context
    const context = await buildContext(request)

    // Try Cloud Function first (Claude API)
    const cloudResult = await callCloudFunction(context)

    // If Cloud Function returned a rate limit error, pass it through
    if (cloudResult && !cloudResult.success && cloudResult.error) {
      console.log('❌ Cloud Function returned error:', cloudResult.error)
      return {
        success: false,
        workouts: [],
        error: cloudResult.error,
      }
    }

    // If Cloud Function succeeded with workouts, save them and return
    if (cloudResult && cloudResult.success && cloudResult.workouts.length > 0) {
      console.log(`☁️ Cloud Function succeeded with ${cloudResult.workouts.length} workouts`)

      // Generate bundleId only for multiple workouts
      const bundleId = request.numWorkouts > 1
        ? `bundle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        : null

      // Save workouts to Firebase
      for (const workout of cloudResult.workouts) {
        const entry = convertToWorkoutEntry(workout, request.userId, bundleId)
        const id = await saveWorkoutHistory(entry)
        console.log(`💾 Saved "${workout.name}" → ID: ${id}`)
      }

      return {
        success: true,
        workouts: cloudResult.workouts,
        usedFallback: cloudResult.usedFallback,
      }
    }

    // Cloud Function failed or unavailable - use local fallback
    console.log('🔄 Using local fallback generation...')

    // Get starting workout number
    const startNumber = await getNextAIWorkoutNumber(request.userId)

    // Generate workouts locally
    const workouts: AIGeneratedWorkout[] = []
    const usedMuscleIds: string[][] = []

    for (let i = 0; i < request.numWorkouts; i++) {
      const { workout, targetMuscleIds } = generateFallbackWorkout(context, startNumber + i, i, usedMuscleIds)
      workouts.push(workout)
      usedMuscleIds.push(targetMuscleIds)
    }

    console.log(`✅ Generated ${workouts.length} workouts (local fallback)`)
    workouts.forEach((w, i) => {
      console.log(`   📝 Workout ${i + 1}: "${w.name}" - ${w.exercises.length} exercises (${w.muscleGroups.join(', ')})`)
    })

    // Generate bundleId only for multiple workouts
    const bundleId = request.numWorkouts > 1
      ? `bundle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      : null

    console.log(`📦 Bundle: ${bundleId ? bundleId : 'none (single workout)'}`)

    // Save workouts to Firebase
    const savedIds: string[] = []
    for (const workout of workouts) {
      const entry = convertToWorkoutEntry(workout, request.userId, bundleId)
      const id = await saveWorkoutHistory(entry)
      savedIds.push(id)
      const saveTime = new Date().toLocaleString('he-IL')
      console.log(`💾 [${saveTime}] Saved "${workout.name}" (${workout.exercises.length} exercises) → ID: ${id}`)
    }

    return {
      success: true,
      workouts,
      usedFallback: true,
    }

  } catch (error: any) {
    console.error('❌ Failed to generate AI workouts:', error)
    return {
      success: false,
      workouts: [],
      error: error.message || 'שגיאה ביצירת האימונים',
    }
  }
}

// Export types
export type { AITrainerRequest, AITrainerResponse, AIGeneratedWorkout }
