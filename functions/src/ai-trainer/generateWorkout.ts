/**
 * Generate AI Workout - Cloud Function
 * Main entry point for AI-powered workout generation
 * New logic: bodyRegion-based splits, 10 sets/muscle/week
 */

import * as admin from 'firebase-admin'
import * as functions from 'firebase-functions'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { callGPTForWorkouts } from './openaiClient'
import { checkRateLimit, incrementUsage } from './rateLimiter'
import type {
  GenerateWorkoutRequest,
  GenerateWorkoutResponse,
  GeneratedWorkout,
  GeneratedExercise,
  ClaudeWorkoutResponse,
  ExerciseSummary,
  AIRecommendation,
  MuscleSummary,
  WorkoutMuscleAssignment,
} from './types'

/**
 * Fetch the latest AI analysis for a user (if exists and not older than 30 days)
 */
async function fetchLastAnalysis(userId: string): Promise<string | null> {
  try {
    const doc = await admin
      .firestore()
      .collection('users')
      .doc(userId)
      .collection('aiData')
      .doc('lastAnalysis')
      .get()

    if (!doc.exists) return null

    const data = doc.data()
    if (!data?.analysis || !data?.createdAt) return null

    const createdAt = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt)
    const daysSinceAnalysis = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
    if (daysSinceAnalysis > 30) {
      functions.logger.info('Last analysis is older than 30 days, skipping', { userId, daysSinceAnalysis })
      return null
    }

    const analysis = data.analysis
    const dateStr = createdAt.toISOString().split('T')[0]

    const parts: string[] = []
    parts.push(`\n**ניתוח אחרון של המתאמן (מתאריך ${dateStr}):**`)
    if (analysis.weaknesses?.length) {
      parts.push(`חולשות: ${analysis.weaknesses.join(' | ')}`)
    }
    if (analysis.recommendations?.length) {
      parts.push(`המלצות: ${analysis.recommendations.join(' | ')}`)
    }
    if (analysis.summary) {
      parts.push(`סיכום: ${analysis.summary}`)
    }
    parts.push('קח את הניתוח בחשבון בתכנון האימון. נסה לכלול תרגילים שמטפלים בחולשות שזוהו.\n')

    return parts.join('\n')
  } catch (error: any) {
    functions.logger.warn('Failed to fetch last analysis', { userId, error: error.message })
    return null
  }
}

/**
 * Read muscles from Firestore with bodyRegion data
 */
async function readMusclesFromFirestore(): Promise<MuscleSummary[]> {
  try {
    const snapshot = await admin.firestore().collection('muscles').get()

    if (snapshot.empty) {
      functions.logger.warn('No muscles found in Firestore')
      return []
    }

    return snapshot.docs.map(doc => ({
      id: doc.id,
      nameHe: doc.data().nameHe || doc.id,
      bodyRegion: doc.data().bodyRegion || 'neutral',
    }))
  } catch (error: any) {
    functions.logger.error('Failed to read muscles from Firestore', { error: error.message })
    return []
  }
}

/**
 * Calculate exercise count based on duration
 */
function getExerciseCount(duration: number): number {
  if (duration <= 60) return 9
  if (duration <= 75) return 10
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
 * Build split schedule: which workout targets upper/lower
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
 * Build workout muscle assignments based on structure and bodyRegion
 * This is the core of the new 10 sets/muscle/week logic
 */
function buildMuscleAssignments(
  muscles: MuscleSummary[],
  numWorkouts: number,
  workoutStructure: 'full_body' | 'split',
  splitStartWith: 'upper' | 'lower',
  exercisesPerWorkout: number
): WorkoutMuscleAssignment[] {
  const assignments: WorkoutMuscleAssignment[] = []

  // Separate muscles by region
  const upperMuscles = muscles.filter(m => m.bodyRegion === 'upper' && m.id !== 'cardio')
  const lowerMuscles = muscles.filter(m => m.bodyRegion === 'lower' && m.id !== 'cardio')
  const neutralMuscles = muscles.filter(m => (m.bodyRegion === 'neutral' || !m.bodyRegion) && m.id !== 'cardio')

  if (workoutStructure === 'full_body') {
    // Full body: every workout targets all muscles
    const allMuscles = [...upperMuscles, ...lowerMuscles, ...neutralMuscles]
    for (let i = 0; i < numWorkouts; i++) {
      assignments.push({
        workoutIndex: i,
        region: 'full_body',
        muscleIds: allMuscles.map(m => m.id),
        muscleNames: allMuscles.map(m => m.nameHe),
        targetExercises: exercisesPerWorkout,
      })
    }
  } else {
    // Split: alternate upper/lower, neutral goes in every workout
    const schedule = buildSplitSchedule(numWorkouts, splitStartWith)

    for (let i = 0; i < numWorkouts; i++) {
      const region = schedule[i]
      const regionMuscles = region === 'upper'
        ? [...upperMuscles, ...neutralMuscles]
        : [...lowerMuscles, ...neutralMuscles]

      assignments.push({
        workoutIndex: i,
        region,
        muscleIds: regionMuscles.map(m => m.id),
        muscleNames: regionMuscles.map(m => m.nameHe),
        targetExercises: exercisesPerWorkout,
      })
    }
  }

  functions.logger.info('Muscle assignments built', {
    structure: workoutStructure,
    numWorkouts,
    assignments: assignments.map(a => ({
      workout: a.workoutIndex + 1,
      region: a.region,
      muscles: a.muscleIds.join(', '),
      exercises: a.targetExercises,
    })),
  })

  return assignments
}

/**
 * Convert Claude response to GeneratedWorkout format
 */
function convertClaudeResponse(
  claudeWorkout: ClaudeWorkoutResponse,
  exerciseMap: Map<string, ExerciseSummary>,
  workoutNumber: number,
  duration: number
): GeneratedWorkout {
  const aiRecommendations: Record<string, AIRecommendation> = {}

  let skippedCount = 0

  const exercises: GeneratedExercise[] = claudeWorkout.exercises
    .filter((ce) => {
      const found = exerciseMap.has(ce.exerciseId)
      if (!found) {
        skippedCount++
        functions.logger.warn('GPT returned unrecognized exerciseId - skipping', {
          exerciseId: ce.exerciseId,
          isWarmup: ce.isWarmup,
        })
      }
      return found
    })
    .map((ce) => {
      const exercise = exerciseMap.get(ce.exerciseId)!

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
        sets: [],
      }
    })

  // Fallback: fill missing exercises if GPT returned invalid IDs
  const expectedCount = getExerciseCount(duration)
  const mainExercises = exercises.filter((e) => !e.isWarmup)

  if (skippedCount > 0 && mainExercises.length < expectedCount) {
    const missing = expectedCount - mainExercises.length
    functions.logger.warn('Filling missing exercises with fallback', {
      expected: expectedCount,
      got: mainExercises.length,
      filling: missing,
      skippedCount,
    })

    const workoutMuscles = new Set(
      mainExercises.map((e) => e.primaryMuscle).filter(Boolean)
    )
    const usedIds = new Set(exercises.map((e) => e.exerciseId))

    const candidates = Array.from(exerciseMap.values()).filter(
      (ex) =>
        !usedIds.has(ex.id) &&
        ex.primaryMuscle !== 'cardio' &&
        ex.category !== 'cardio' &&
        (workoutMuscles.size === 0 || workoutMuscles.has(ex.primaryMuscle))
    )

    const pool =
      candidates.length >= missing
        ? candidates
        : Array.from(exerciseMap.values()).filter(
            (ex) =>
              !usedIds.has(ex.id) &&
              ex.primaryMuscle !== 'cardio' &&
              ex.category !== 'cardio'
          )

    const shuffled = [...pool].sort(() => Math.random() - 0.5)
    const fallbackExercises = shuffled.slice(0, missing)

    for (const ex of fallbackExercises) {
      exercises.push({
        exerciseId: ex.id,
        exerciseName: ex.nameHe,
        exerciseNameHe: ex.nameHe,
        imageUrl: ex.imageUrl,
        category: ex.category,
        primaryMuscle: ex.primaryMuscle,
        isWarmup: false,
        targetSets: 3,
        targetReps: '8-12',
        sets: [],
      })
    }
  }

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
 * Fallback workout generation (when GPT fails)
 */
function generateFallbackWorkout(
  data: GenerateWorkoutRequest,
  muscles: MuscleSummary[],
  assignment: WorkoutMuscleAssignment,
  workoutNumber: number
): GeneratedWorkout {
  const { request, availableExercises, yesterdayExerciseIds } = data
  const exerciseCount = getExerciseCount(request.duration)

  functions.logger.info('Using fallback workout generation', {
    workoutNumber,
    exerciseCount,
    region: assignment.region,
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

  // Build muscle name map
  const muscleIdToName = muscles.reduce(
    (map, m) => {
      map[m.id] = m.nameHe
      return map
    },
    {} as Record<string, string>
  )

  // Select exercises based on assignment muscles
  const targetMuscleIds = assignment.muscleIds
  const selectedExercises: ExerciseSummary[] = []
  const usedExerciseIds = new Set<string>()
  const exercisesPerMuscle = Math.max(1, Math.ceil(exerciseCount / targetMuscleIds.length))

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

  // Fill remaining slots
  if (selectedExercises.length < exerciseCount) {
    const remaining = exerciseCount - selectedExercises.length
    const additionalExercises = strengthExercises.filter((ex) => !usedExerciseIds.has(ex.id))
    const shuffled = [...additionalExercises].sort(() => Math.random() - 0.5)
    selectedExercises.push(...shuffled.slice(0, remaining))
  }

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
      sets: [],
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
      sets: [],
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

  if (!request.duration || ![60, 75, 90].includes(request.duration)) {
    throw new HttpsError('invalid-argument', 'Invalid duration')
  }

  if (!request.numWorkouts || request.numWorkouts < 1 || request.numWorkouts > 6) {
    throw new HttpsError('invalid-argument', 'Invalid numWorkouts')
  }

  if (!Array.isArray(data.availableExercises) || data.availableExercises.length === 0) {
    throw new HttpsError('invalid-argument', 'Missing exercises')
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

      // Read muscles from Firestore (authoritative source with bodyRegion)
      let muscles = await readMusclesFromFirestore()

      // If Firestore read failed, fall back to client-sent muscles
      if (muscles.length === 0 && data.muscles?.length > 0) {
        functions.logger.warn('Using client-sent muscles as fallback')
        muscles = data.muscles
      }

      if (muscles.length === 0) {
        throw new HttpsError('internal', 'No muscles data available')
      }

      // Create exercise map for quick lookup
      const exerciseMap = new Map<string, ExerciseSummary>()
      data.availableExercises.forEach((ex) => exerciseMap.set(ex.id, ex))

      // Get starting workout number
      const startNumber = Math.floor(Date.now() / 1000) % 1000

      // Build muscle assignments based on structure
      const exerciseCount = getExerciseCount(data.request.duration)
      const assignments = buildMuscleAssignments(
        muscles,
        data.request.numWorkouts,
        data.request.workoutStructure,
        data.request.splitStartWith || 'upper',
        exerciseCount
      )

      // Filter exercises by assignment muscles (for the GPT prompt)
      const allTargetMuscleIds = [...new Set(assignments.flatMap(a => a.muscleIds))]
      const filteredExercises = data.availableExercises.filter(ex =>
        allTargetMuscleIds.includes(ex.primaryMuscle) ||
        ex.primaryMuscle === 'cardio' ||
        ex.category === 'cardio'
      )

      functions.logger.info('Filtered exercises for GPT', {
        original: data.availableExercises.length,
        filtered: filteredExercises.length,
        targetMuscles: allTargetMuscleIds,
      })

      // Fetch last analysis
      const lastAnalysisSection = await fetchLastAnalysis(userId)

      // Call GPT to generate workouts with muscle assignments
      const gptResult = await callGPTForWorkouts(
        data,
        muscles,
        assignments,
        filteredExercises,
        lastAnalysisSection
      )

      let workouts: GeneratedWorkout[] = []
      let usedFallback = false

      if (gptResult && gptResult.workouts.length === data.request.numWorkouts) {
        // GPT succeeded - convert response
        functions.logger.info('GPT API succeeded')
        workouts = gptResult.workouts.map((cw, index) =>
          convertClaudeResponse(cw, exerciseMap, startNumber + index, data.request.duration)
        )
      } else {
        // GPT failed or returned wrong count - use fallback
        functions.logger.info('Using fallback generation')
        usedFallback = true

        for (let i = 0; i < data.request.numWorkouts; i++) {
          const workout = generateFallbackWorkout(data, muscles, assignments[i], startNumber + i)
          workouts.push(workout)
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
