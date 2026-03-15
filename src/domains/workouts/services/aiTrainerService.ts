/**
 * AI Trainer Service
 * Generates personalized workout plans using AI (Cloud Function) or fallback logic
 * New logic: bodyRegion-based splits, 10 sets/muscle/week
 */

import { getExercises } from '@/lib/firebase/exercises'
import { getMuscles } from '@/lib/firebase/muscles'
import { getUserWorkoutHistory, getUserWorkoutHistoryFull, saveWorkoutHistory, getRecentlyDoneExerciseIds } from '@/lib/firebase/workoutHistory'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { app } from '@/lib/firebase/config'
import type { Exercise } from '@/domains/exercises/types'
import type { WorkoutHistoryEntry } from '@/domains/workouts/types'
import type { PrimaryMuscle } from '@/domains/exercises/types/muscles'
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
 * Call Cloud Function to generate workouts via GPT API
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
        equipment: ex.equipment,
      })),
      // Muscles are now read from Firestore by the Cloud Function
      // but we still send them for fallback reference
      muscles: context.muscles.map(m => ({
        id: m.id,
        nameHe: m.nameHe,
        bodyRegion: m.bodyRegion || 'neutral',
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
    const aiWorkouts = history.filter(w => w.name.startsWith('מאמן #'))
    if (aiWorkouts.length === 0) return 1

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
  const exerciseMap = new Map<string, { weight: number; reps: number; date: string; volume: number }[]>()

  const relevantWorkouts = recentHistory.filter(w =>
    w.status === 'completed' || w.status === 'in_progress' || w.status === 'partial'
  )

  for (const workout of relevantWorkouts) {
    const dateStr = workout.date.toISOString().split('T')[0]

    for (const exercise of workout.exercises) {
      if (!exercise.exerciseId) continue

      const completedSets = exercise.sets.filter(s =>
        s.completed && (s.actualWeight || 0) > 0 && (s.actualReps || 0) > 0
      )

      if (completedSets.length === 0) continue

      const bestSet = completedSets.reduce((best, s) =>
        (s.actualWeight || 0) > (best.actualWeight || 0) ? s : best
      )

      const volume = exercise.exerciseVolume ?? completedSets.reduce(
        (sum, s) => sum + (s.actualWeight || 0) * (s.actualReps || 0), 0
      )

      const entry = {
        weight: bestSet.actualWeight || 0,
        reps: bestSet.actualReps || 0,
        date: dateStr,
        volume,
      }

      if (!exerciseMap.has(exercise.exerciseId)) {
        exerciseMap.set(exercise.exerciseId, [])
      }
      exerciseMap.get(exercise.exerciseId)!.push(entry)
    }
  }

  const result: ExercisePerformanceData[] = []

  for (const [exerciseId, sessions] of exerciseMap.entries()) {
    sessions.sort((a, b) => b.date.localeCompare(a.date))

    result.push({
      exerciseId,
      lastWeight: sessions[0].weight,
      lastReps: sessions[0].reps,
      lastDate: sessions[0].date,
      lastVolume: sessions[0].volume > 0 ? sessions[0].volume : undefined,
      recentSessions: sessions.slice(0, 5),
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
    getUserWorkoutHistoryFull(request.userId, 10),
    getRecentlyDoneExerciseIds(request.userId),
  ])

  const yesterdayExerciseIds = Array.from(yesterdayExerciseIdsSet)

  console.log(`📊 Loaded ${exercises.length} exercises, ${muscles.length} muscles`)
  console.log(`📊 Recent summaries: ${recentSummaries.length}, Full history: ${recentFullHistory.length}, Yesterday exercises: ${yesterdayExerciseIds.length}`)

  const recentWorkouts: RecentWorkoutSummary[] = recentSummaries.map(w => ({
    date: w.date.toISOString().split('T')[0],
    muscleGroups: w.muscleGroups || [],
    exerciseIds: [],
  }))

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

/**
 * Build a split schedule: which workout targets upper/lower
 * Returns array like ['upper', 'lower', 'upper'] for 3 workouts starting upper
 */
function buildSplitSchedule(
  numWorkouts: number,
  startWith: 'upper' | 'lower'
): ('upper' | 'lower')[] {
  const schedule: ('upper' | 'lower')[] = []
  for (let i = 0; i < numWorkouts; i++) {
    const isFirst = (i % 2 === 0)
    if (startWith === 'upper') {
      schedule.push(isFirst ? 'upper' : 'lower')
    } else {
      schedule.push(isFirst ? 'lower' : 'upper')
    }
  }
  return schedule
}

/**
 * Get muscles for a specific workout based on structure and bodyRegion
 */
function getMusclesForWorkout(
  muscles: PrimaryMuscle[],
  workoutStructure: 'full_body' | 'split',
  workoutRegion?: 'upper' | 'lower'
): PrimaryMuscle[] {
  if (workoutStructure === 'full_body') {
    // Full body: all non-cardio muscles
    return muscles.filter(m => m.id !== 'cardio')
  }

  // Split: filter by bodyRegion
  return muscles.filter(m => {
    if (m.id === 'cardio') return false
    const region = m.bodyRegion || 'neutral'
    return region === workoutRegion || region === 'neutral'
  })
}

/**
 * Fallback workout generation (when Cloud Function is unavailable)
 * Uses bodyRegion-based splits and 10 sets/muscle/week logic
 */
function generateFallbackWorkout(
  context: AITrainerContext,
  workoutNumber: number,
  workoutIndex: number,
  splitSchedule: ('upper' | 'lower')[] | null,
  excludeExerciseIds: Set<string>
): AIGeneratedWorkout {
  const { request, availableExercises, muscles, yesterdayExerciseIds } = context
  const exerciseCount = getExerciseCount(request.duration)

  console.log(`🔄 Generating fallback workout #${workoutNumber} (index ${workoutIndex})`)

  // Filter out yesterday's exercises and already-used exercises from other workouts
  const availableForToday = availableExercises.filter(
    ex => !yesterdayExerciseIds.includes(ex.id) && !excludeExerciseIds.has(ex.id)
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

  // Determine which muscles this workout targets
  const workoutRegion = splitSchedule ? splitSchedule[workoutIndex] : undefined
  const targetMuscles = getMusclesForWorkout(muscles, request.workoutStructure, workoutRegion)
  const targetMuscleIds = targetMuscles.map(m => m.id)

  console.log(`🎯 Target muscles (${request.workoutStructure}${workoutRegion ? ` - ${workoutRegion}` : ''}): ${targetMuscleIds.join(', ')}`)

  // Build muscle name map
  const muscleIdToName = muscles.reduce((map, m) => {
    map[m.id] = m.nameHe
    return map
  }, {} as Record<string, string>)

  // Calculate exercises per muscle (10 sets/week, 3 sets/exercise ≈ 3-4 exercises per muscle)
  // Count how many workouts each muscle appears in
  const muscleWorkoutCount: Record<string, number> = {}
  if (splitSchedule) {
    for (const region of splitSchedule) {
      const regionMuscles = getMusclesForWorkout(muscles, 'split', region)
      for (const m of regionMuscles) {
        muscleWorkoutCount[m.id] = (muscleWorkoutCount[m.id] || 0) + 1
      }
    }
  } else {
    for (const m of targetMuscles) {
      muscleWorkoutCount[m.id] = request.numWorkouts
    }
  }

  // Select exercises for each muscle
  const selectedExercises: Exercise[] = []
  const usedExerciseIds = new Set<string>()

  // Distribute exercises evenly across target muscles
  const exercisesPerMuscle = Math.max(1, Math.ceil(exerciseCount / targetMuscleIds.length))

  for (const muscleId of targetMuscleIds) {
    const muscleExercises = strengthExercises.filter(ex =>
      ex.primaryMuscle === muscleId && !usedExerciseIds.has(ex.id)
    )

    const shuffled = [...muscleExercises].sort(() => Math.random() - 0.5)
    const toAdd = shuffled.slice(0, exercisesPerMuscle)
    toAdd.forEach(ex => {
      selectedExercises.push(ex)
      usedExerciseIds.add(ex.id)
    })
  }

  // Fill remaining slots if needed
  if (selectedExercises.length < exerciseCount) {
    const remaining = exerciseCount - selectedExercises.length
    const additionalExercises = strengthExercises.filter(ex =>
      !usedExerciseIds.has(ex.id) && targetMuscleIds.includes(ex.primaryMuscle)
    )
    const shuffledAdditional = [...additionalExercises].sort(() => Math.random() - 0.5)
    selectedExercises.push(...shuffledAdditional.slice(0, remaining))
  }

  // If still not enough, expand to all strength exercises
  if (selectedExercises.length < exerciseCount) {
    const remaining = exerciseCount - selectedExercises.length
    const anyExercises = strengthExercises.filter(ex => !usedExerciseIds.has(ex.id))
    const shuffled = [...anyExercises].sort(() => Math.random() - 0.5)
    selectedExercises.push(...shuffled.slice(0, remaining))
  }

  // Trim to exact count
  const mainExercises = selectedExercises.slice(0, exerciseCount)

  // Build the workout
  const workoutExercises: AIGeneratedExercise[] = []

  // Add warmup if applicable
  if (request.warmupDuration > 0 && cardioExercises.length > 0) {
    const warmupExercise = cardioExercises[Math.floor(Math.random() * cardioExercises.length)]
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

  // Add selected exercises to exclude set for next workouts
  for (const ex of mainExercises) {
    excludeExerciseIds.add(ex.id)
  }

  return {
    name: getAIWorkoutName(workoutNumber),
    exercises: workoutExercises,
    estimatedDuration: request.duration,
    muscleGroups,
    source: 'ai_trainer',
    aiWorkoutNumber: workoutNumber,
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
    sets: [],
  }
}

// Convert AI workout to WorkoutHistoryEntry for saving
function convertToWorkoutEntry(
  workout: AIGeneratedWorkout,
  userId: string,
  bundleId: string | null
): Omit<WorkoutHistoryEntry, 'id'> {
  const now = new Date()

  return {
    userId,
    name: `אימון AI #${workout.aiWorkoutNumber}`,
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
    source: 'ai_trainer',
    aiWorkoutNumber: workout.aiWorkoutNumber,
    bundleId: bundleId || undefined,
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

    // Try Cloud Function first (GPT API)
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

      const bundleId = request.numWorkouts > 1
        ? `bundle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        : null

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

    const startNumber = await getNextAIWorkoutNumber(request.userId)

    // Build split schedule if needed
    const splitSchedule = request.workoutStructure === 'split'
      ? buildSplitSchedule(request.numWorkouts, request.splitStartWith || 'upper')
      : null

    // Generate workouts locally
    const workouts: AIGeneratedWorkout[] = []

    const usedFallbackExerciseIds = new Set<string>()
    for (let i = 0; i < request.numWorkouts; i++) {
      const workout = generateFallbackWorkout(context, startNumber + i, i, splitSchedule, usedFallbackExerciseIds)
      workouts.push(workout)
    }

    console.log(`✅ Generated ${workouts.length} workouts (local fallback)`)
    workouts.forEach((w, i) => {
      console.log(`   📝 Workout ${i + 1}: "${w.name}" - ${w.exercises.length} exercises (${w.muscleGroups.join(', ')})`)
    })

    const bundleId = request.numWorkouts > 1
      ? `bundle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      : null

    const savedIds: string[] = []
    for (const workout of workouts) {
      const entry = convertToWorkoutEntry(workout, request.userId, bundleId)
      const id = await saveWorkoutHistory(entry)
      savedIds.push(id)
      console.log(`💾 Saved "${workout.name}" (${workout.exercises.length} exercises) → ID: ${id}`)
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
