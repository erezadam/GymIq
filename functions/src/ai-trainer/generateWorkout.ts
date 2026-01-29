/**
 * Generate AI Workout - Cloud Function
 * Main entry point for AI-powered workout generation
 */

import * as functions from 'firebase-functions'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { callGPTForMuscleSelection, callGPTForBundle, filterExercisesByMuscles } from './openaiClient'
import { checkRateLimit, incrementUsage } from './rateLimiter'
import type {
  GenerateWorkoutRequest,
  GenerateWorkoutResponse,
  GeneratedWorkout,
  GeneratedExercise,
  ClaudeWorkoutResponse,
  ExerciseSummary,
  AIRecommendation,
} from './types'

/**
 * Calculate exercise count based on duration
 */
function getExerciseCount(duration: number): number {
  if (duration <= 30) return 6
  if (duration <= 45) return 8
  if (duration <= 60) return 9
  return 11
}

/**
 * Get AI workout name with timestamp
 */
function getAIWorkoutName(workoutNumber: number): string {
  const now = new Date()
  const time = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`
  return `מאמן #${workoutNumber} (${time})`
}


/**
 * Convert Claude response to GeneratedWorkout format
 * Extracts AI recommendations from each exercise
 */
function convertClaudeResponse(
  claudeWorkout: ClaudeWorkoutResponse,
  exerciseMap: Map<string, ExerciseSummary>,
  workoutNumber: number,
  duration: number
): GeneratedWorkout {
  const aiRecommendations: Record<string, AIRecommendation> = {}

  const exercises: GeneratedExercise[] = claudeWorkout.exercises
    .filter((ce) => {
      const found = exerciseMap.has(ce.exerciseId)
      if (!found) {
        functions.logger.warn('GPT returned unrecognized exerciseId - skipping', {
          exerciseId: ce.exerciseId,
          availableIds: Array.from(exerciseMap.keys()).slice(0, 5),
        })
      }
      return found
    })
    .map((ce) => {
      const exercise = exerciseMap.get(ce.exerciseId)!

      // Extract recommendation if present
      if (ce.recommendation) {
        aiRecommendations[ce.exerciseId] = {
          weight: ce.recommendation.weight || 0,
          repRange: ce.recommendation.repRange || ce.targetReps,
          sets: ce.recommendation.sets || ce.targetSets,
          ...(ce.recommendation.reasoning && { reasoning: ce.recommendation.reasoning }),
        }
      }

      return {
        exerciseId: ce.exerciseId,
        exerciseName: exercise.nameHe,
        exerciseNameHe: exercise.nameHe,
        imageUrl: exercise.imageUrl,
        category: exercise.category,
        primaryMuscle: exercise.primaryMuscle,
        isWarmup: ce.isWarmup,
        targetSets: ce.recommendation?.sets || ce.targetSets,
        targetReps: ce.recommendation?.repRange || ce.targetReps,
        aiNotes: ce.aiNotes,
        sets: [], // AI workouts don't pre-create sets - trainee opens sets themselves
      }
    })

  return {
    name: getAIWorkoutName(workoutNumber),
    exercises,
    estimatedDuration: duration,
    muscleGroups: claudeWorkout.muscleGroups,
    source: 'ai_trainer',
    aiWorkoutNumber: workoutNumber,
    aiExplanation: claudeWorkout.explanation,
    aiRecommendations: Object.keys(aiRecommendations).length > 0 ? aiRecommendations : undefined,
  }
}

/**
 * Fallback workout generation (when Claude fails)
 * Uses simple random selection algorithm
 */
function generateFallbackWorkout(
  data: GenerateWorkoutRequest,
  workoutNumber: number,
  workoutIndex: number,
  usedMuscleGroups: string[][]
): GeneratedWorkout {
  const { request, availableExercises, muscles, yesterdayExerciseIds } = data
  const exerciseCount = getExerciseCount(request.duration)

  functions.logger.info('Using fallback workout generation', {
    workoutNumber,
    exerciseCount,
  })

  // Filter out yesterday's exercises
  const availableForToday = availableExercises.filter(
    (ex) => !yesterdayExerciseIds.includes(ex.id)
  )

  // Separate cardio for warmup
  const cardioExercises = availableForToday.filter(
    (ex) => ex.primaryMuscle === 'cardio' || ex.category === 'cardio'
  )
  const strengthExercises = availableForToday.filter(
    (ex) => ex.primaryMuscle !== 'cardio' && ex.category !== 'cardio'
  )

  // Determine target muscles
  let targetMuscleIds: string[] = []
  if (request.muscleSelectionMode === 'manual' && request.perWorkoutMuscles?.[workoutIndex]) {
    targetMuscleIds = request.perWorkoutMuscles[workoutIndex]
  } else if (request.muscleSelectionMode === 'same' && request.muscleTargets.length > 0) {
    targetMuscleIds = request.muscleTargets
  } else {
    // AI rotate or default - pick random muscles avoiding used ones
    const usedMuscles = usedMuscleGroups.flat()
    const availableMuscleIds = muscles
      .map((m) => m.id)
      .filter((id) => id !== 'cardio' && !usedMuscles.includes(id))

    const musclePool =
      availableMuscleIds.length >= 2
        ? availableMuscleIds
        : muscles.map((m) => m.id).filter((id) => id !== 'cardio')

    // Shuffle and pick 2-3 muscles
    const shuffled = [...musclePool].sort(() => Math.random() - 0.5)
    targetMuscleIds = shuffled.slice(0, Math.min(3, shuffled.length))
  }

  // Build muscle name map
  const muscleIdToName = muscles.reduce(
    (map, m) => {
      map[m.id] = m.nameHe
      return map
    },
    {} as Record<string, string>
  )

  // Select exercises
  const selectedExercises: ExerciseSummary[] = []
  const usedExerciseIds = new Set<string>()
  const exercisesPerMuscle = Math.ceil(exerciseCount / targetMuscleIds.length)

  for (const muscleId of targetMuscleIds) {
    const muscleExercises = strengthExercises.filter(
      (ex) => ex.primaryMuscle === muscleId && !usedExerciseIds.has(ex.id)
    )

    const shuffled = [...muscleExercises].sort(() => Math.random() - 0.5)
    const toAdd = shuffled.slice(0, exercisesPerMuscle)
    toAdd.forEach((ex) => {
      selectedExercises.push(ex)
      usedExerciseIds.add(ex.id)
    })
  }

  // Fill remaining slots if needed
  if (selectedExercises.length < exerciseCount) {
    const remaining = exerciseCount - selectedExercises.length
    const additionalExercises = strengthExercises.filter((ex) => !usedExerciseIds.has(ex.id))
    const shuffled = [...additionalExercises].sort(() => Math.random() - 0.5)
    selectedExercises.push(...shuffled.slice(0, remaining))
  }

  // Trim to exact count
  const mainExercises = selectedExercises.slice(0, exerciseCount)

  // Build workout exercises
  const workoutExercises: GeneratedExercise[] = []

  // Add warmup if needed
  if (request.warmupDuration > 0 && cardioExercises.length > 0) {
    const warmupExercise = cardioExercises[Math.floor(Math.random() * cardioExercises.length)]
    workoutExercises.push({
      exerciseId: warmupExercise.id,
      exerciseName: warmupExercise.nameHe,
      exerciseNameHe: warmupExercise.nameHe,
      imageUrl: warmupExercise.imageUrl,
      category: warmupExercise.category,
      primaryMuscle: warmupExercise.primaryMuscle,
      isWarmup: true,
      targetSets: 1,
      targetReps: '5-10',
      sets: [], // AI workouts don't pre-create sets - trainee opens sets themselves
    })
  }

  // Add main exercises
  mainExercises.forEach((ex) => {
    workoutExercises.push({
      exerciseId: ex.id,
      exerciseName: ex.nameHe,
      exerciseNameHe: ex.nameHe,
      imageUrl: ex.imageUrl,
      category: muscleIdToName[ex.primaryMuscle] || ex.primaryMuscle,
      primaryMuscle: ex.primaryMuscle,
      isWarmup: false,
      targetSets: 3,
      targetReps: '8-12',
      sets: [], // AI workouts don't pre-create sets - trainee opens sets themselves
    })
  })

  // Get unique muscle groups
  const muscleGroups = [
    ...new Set(
      workoutExercises
        .filter((e) => !e.isWarmup)
        .map((e) => e.category)
        .filter(Boolean)
    ),
  ] as string[]

  return {
    name: getAIWorkoutName(workoutNumber),
    exercises: workoutExercises,
    estimatedDuration: request.duration,
    muscleGroups,
    source: 'ai_trainer',
    aiWorkoutNumber: workoutNumber,
  }
}

/**
 * Validate request data
 */
function validateRequest(data: any, authUid: string): GenerateWorkoutRequest {
  if (!data?.request) {
    throw new HttpsError('invalid-argument', 'Missing request data')
  }

  const { request } = data

  if (!request.userId) {
    throw new HttpsError('invalid-argument', 'Missing userId')
  }

  if (request.userId !== authUid) {
    throw new HttpsError('permission-denied', 'User ID mismatch')
  }

  if (!request.duration || ![30, 45, 60, 90].includes(request.duration)) {
    throw new HttpsError('invalid-argument', 'Invalid duration')
  }

  if (!request.numWorkouts || request.numWorkouts < 1 || request.numWorkouts > 6) {
    throw new HttpsError('invalid-argument', 'Invalid numWorkouts')
  }

  if (!Array.isArray(data.availableExercises) || data.availableExercises.length === 0) {
    throw new HttpsError('invalid-argument', 'Missing exercises')
  }

  if (!Array.isArray(data.muscles) || data.muscles.length === 0) {
    throw new HttpsError('invalid-argument', 'Missing muscles')
  }

  return data as GenerateWorkoutRequest
}

/**
 * Main Cloud Function: Generate AI Workout
 */
export const generateAIWorkout = onCall(
  {
    secrets: ['OPENAI_API_KEY'],
    timeoutSeconds: 60,
    memory: '256MiB',
  },
  async (callRequest): Promise<GenerateWorkoutResponse> => {
    // Check authentication
    if (!callRequest.auth) {
      throw new HttpsError('unauthenticated', 'יש להתחבר כדי ליצור אימון')
    }

    const userId = callRequest.auth.uid

    functions.logger.info('AI Workout generation started', {
      userId,
      timestamp: new Date().toISOString(),
    })

    try {
      // Validate request
      const data = validateRequest(callRequest.data, userId)

      // Check rate limit
      const rateLimitResult = await checkRateLimit(userId)
      if (!rateLimitResult.allowed) {
        functions.logger.warn('Rate limit exceeded', { userId })
        return {
          success: false,
          workouts: [],
          usedFallback: false,
          error: `הגעת למגבלה היומית. נסה שוב מחר.`,
          rateLimitInfo: {
            remaining: 0,
            resetAt: rateLimitResult.resetAt.toISOString(),
          },
        }
      }

      // Create exercise map for quick lookup
      const exerciseMap = new Map<string, ExerciseSummary>()
      data.availableExercises.forEach((ex) => exerciseMap.set(ex.id, ex))

      // Get starting workout number (simple increment based on current time)
      const startNumber = Math.floor(Date.now() / 1000) % 1000

      // Determine if we need muscle selection (Call 1)
      const needsMuscleSelection =
        data.request.muscleSelectionMode === 'ai_rotate' ||
        (!data.request.muscleSelectionMode && data.request.muscleTargets.length === 0) ||
        (data.request.muscleSelectionMode === 'same' && data.request.muscleTargets.length === 0)

      let filteredExercises: ExerciseSummary[] | undefined
      let workoutMuscleAssignments: string[][] | undefined

      if (needsMuscleSelection) {
        // Call 1: Ask GPT to select muscles
        functions.logger.info('Muscles not pre-selected - running Call 1 (muscle selection)')
        const muscleResult = await callGPTForMuscleSelection(data)

        if (muscleResult && muscleResult.workoutMuscles.length > 0) {
          workoutMuscleAssignments = muscleResult.workoutMuscles
          const allSelectedMuscles = [...new Set(muscleResult.workoutMuscles.flat())]
          filteredExercises = filterExercisesByMuscles(data.availableExercises, allSelectedMuscles)
          functions.logger.info('Filtered exercises by selected muscles', {
            originalCount: data.availableExercises.length,
            filteredCount: filteredExercises.length,
            muscles: allSelectedMuscles,
          })
        }
        // If Call 1 fails, proceed without filtering (Call 2 will use all exercises)
      } else {
        // User selected muscles - filter exercises
        let selectedMuscleIds: string[] = []
        if (data.request.muscleSelectionMode === 'manual' && data.request.perWorkoutMuscles) {
          selectedMuscleIds = [...new Set(data.request.perWorkoutMuscles.flat())]
        } else if (data.request.muscleTargets.length > 0) {
          selectedMuscleIds = data.request.muscleTargets
        }

        if (selectedMuscleIds.length > 0) {
          filteredExercises = filterExercisesByMuscles(data.availableExercises, selectedMuscleIds)
          functions.logger.info('Filtered exercises by user-selected muscles', {
            originalCount: data.availableExercises.length,
            filteredCount: filteredExercises.length,
            muscles: selectedMuscleIds,
          })
        }
      }

      // Call 2: Generate workouts with filtered exercise list
      const gptResult = await callGPTForBundle(data, filteredExercises, workoutMuscleAssignments)

      let workouts: GeneratedWorkout[] = []
      let usedFallback = false

      if (gptResult && gptResult.workouts.length === data.request.numWorkouts) {
        // OpenAI succeeded - convert response
        functions.logger.info('OpenAI API succeeded')
        workouts = gptResult.workouts.map((cw, index) =>
          convertClaudeResponse(cw, exerciseMap, startNumber + index, data.request.duration)
        )
      } else {
        // OpenAI failed or returned wrong count - use fallback
        functions.logger.info('Using fallback generation')
        usedFallback = true

        const usedMuscleGroups: string[][] = []
        for (let i = 0; i < data.request.numWorkouts; i++) {
          const workout = generateFallbackWorkout(data, startNumber + i, i, usedMuscleGroups)
          workouts.push(workout)
          usedMuscleGroups.push(workout.muscleGroups)
        }
      }

      // Increment usage count
      await incrementUsage(userId)

      functions.logger.info('AI Workout generation completed', {
        userId,
        workoutCount: workouts.length,
        usedFallback,
      })

      return {
        success: true,
        workouts,
        usedFallback,
        rateLimitInfo: {
          remaining: rateLimitResult.remaining - 1,
          resetAt: rateLimitResult.resetAt.toISOString(),
        },
      }
    } catch (error: any) {
      functions.logger.error('AI Workout generation failed', {
        userId,
        error: error.message,
      })

      if (error instanceof HttpsError) {
        throw error
      }

      throw new HttpsError('internal', 'שגיאה ביצירת האימון. נסה שוב.')
    }
  }
)
