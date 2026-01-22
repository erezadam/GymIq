/**
 * AI Trainer Service
 * Generates personalized workout plans using AI or fallback logic
 */

import { getExercises } from '@/lib/firebase/exercises'
import { getMuscles } from '@/lib/firebase/muscles'
import { getUserWorkoutHistory, saveWorkoutHistory, getRecentlyDoneExerciseIds } from '@/lib/firebase/workoutHistory'
import type { Exercise } from '@/domains/exercises/types'
import type { WorkoutHistoryEntry } from '@/domains/workouts/types'
import {
  AITrainerRequest,
  AITrainerResponse,
  AIGeneratedWorkout,
  AIGeneratedExercise,
  AITrainerContext,
  RecentWorkoutSummary,
  getExerciseCount,
  getAIWorkoutName,
} from './aiTrainer.types'

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

// Build context for AI generation
async function buildContext(request: AITrainerRequest): Promise<AITrainerContext> {
  console.log('🤖 Building AI context...')

  // Load all data in parallel
  const [exercises, muscles, recentHistory, yesterdayExerciseIdsSet] = await Promise.all([
    getExercises(),
    getMuscles(),
    getUserWorkoutHistory(request.userId, 7),
    getRecentlyDoneExerciseIds(request.userId),
  ])

  // Convert Set to array
  const yesterdayExerciseIds = Array.from(yesterdayExerciseIdsSet)

  console.log(`📊 Loaded ${exercises.length} exercises, ${muscles.length} muscles`)
  console.log(`📊 Recent workouts: ${recentHistory.length}, Yesterday exercises: ${yesterdayExerciseIds.length}`)

  // Convert recent history to summaries
  const recentWorkouts: RecentWorkoutSummary[] = recentHistory.map(w => ({
    date: w.date.toISOString().split('T')[0],
    muscleGroups: w.muscleGroups || [],
    exerciseIds: [], // We don't have exercise IDs in summary
  }))

  return {
    request,
    availableExercises: exercises,
    muscles,
    recentWorkouts,
    yesterdayExerciseIds,
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
  const exercisesPerMuscle = Math.ceil(exerciseCount / targetMuscleIds.length)

  for (const muscleId of targetMuscleIds) {
    const muscleExercises = strengthExercises.filter(ex =>
      ex.primaryMuscle === muscleId
    )

    console.log(`💪 Muscle "${muscleId}": ${muscleExercises.length} exercises available, need ${exercisesPerMuscle}`)

    // Shuffle and take exercises
    const shuffled = [...muscleExercises].sort(() => Math.random() - 0.5)
    const toAdd = shuffled.slice(0, exercisesPerMuscle)
    selectedExercises.push(...toAdd)
  }

  console.log(`📊 Total selected: ${selectedExercises.length}, need: ${exerciseCount}`)

  // Trim to exact count if needed
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
  const repsNum = isWarmup ? 5 : 10

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
    sets: Array(targetSets).fill(null).map(() => ({
      type: isWarmup ? 'warmup' as const : 'working' as const,
      targetReps: repsNum,
      targetWeight: 0,
      actualReps: 0,
      actualWeight: 0,
      completed: false,
    })),
  }
}

// Convert AI workout to WorkoutHistoryEntry for saving
function convertToWorkoutEntry(
  workout: AIGeneratedWorkout,
  userId: string
): Omit<WorkoutHistoryEntry, 'id'> {
  const now = new Date()

  return {
    userId,
    name: workout.name,
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

    // Get starting workout number
    const startNumber = await getNextAIWorkoutNumber(request.userId)

    // Generate workouts (using fallback for now)
    const workouts: AIGeneratedWorkout[] = []
    const usedMuscleIds: string[][] = []  // Track muscle IDs used in each workout

    for (let i = 0; i < request.numWorkouts; i++) {
      const { workout, targetMuscleIds } = generateFallbackWorkout(context, startNumber + i, i, usedMuscleIds)
      workouts.push(workout)
      // Track which muscle IDs were used for this workout (for ai_rotate mode)
      usedMuscleIds.push(targetMuscleIds)
    }

    console.log(`✅ Generated ${workouts.length} workouts`)
    workouts.forEach((w, i) => {
      console.log(`   📝 Workout ${i + 1}: "${w.name}" - ${w.exercises.length} exercises (${w.muscleGroups.join(', ')})`)
    })

    // Save workouts to Firebase
    const savedIds: string[] = []
    for (const workout of workouts) {
      const entry = convertToWorkoutEntry(workout, request.userId)
      const id = await saveWorkoutHistory(entry)
      savedIds.push(id)
      const saveTime = new Date().toLocaleString('he-IL')
      console.log(`💾 [${saveTime}] Saved "${workout.name}" (${workout.exercises.length} exercises) → ID: ${id}`)
    }

    return {
      success: true,
      workouts,
      usedFallback: true, // TODO: Change when Claude API is integrated
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
