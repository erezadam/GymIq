/**
 * AI Trainer Types for Cloud Functions
 * Shared types between client and server
 */

// Exercise summary for prompt (minimal data to reduce tokens)
export interface ExerciseSummary {
  id: string
  nameHe: string
  primaryMuscle: string
  category?: string
  imageUrl?: string
}

// Muscle summary for prompt
export interface MuscleSummary {
  id: string
  nameHe: string
}

// Recent workout summary for context
export interface RecentWorkoutSummary {
  date: string
  muscleGroups: string[]
  exerciseIds: string[]
}

// Request from client to Cloud Function
export interface GenerateWorkoutRequest {
  request: {
    numWorkouts: number
    duration: number
    muscleTargets: string[]
    warmupDuration: number
    userId: string
    muscleSelectionMode?: 'ai_rotate' | 'same' | 'manual'
    perWorkoutMuscles?: string[][]
  }
  availableExercises: ExerciseSummary[]
  muscles: MuscleSummary[]
  recentWorkouts: RecentWorkoutSummary[]
  yesterdayExerciseIds: string[]
}

// Exercise in Claude's response
export interface ClaudeExerciseResponse {
  exerciseId: string
  isWarmup: boolean
  targetSets: number
  targetReps: string
  aiNotes?: string
}

// Single workout in Claude's response
export interface ClaudeWorkoutResponse {
  exercises: ClaudeExerciseResponse[]
  muscleGroups: string[]
  explanation?: string
}

// Full response from Claude (for multiple workouts)
export interface ClaudeFullResponse {
  workouts: ClaudeWorkoutResponse[]
}

// Set structure for saved workout
export interface WorkoutSet {
  type: 'warmup' | 'working'
  targetReps: number
  targetWeight: number
  actualReps: number
  actualWeight: number
  completed: boolean
}

// Exercise in generated workout
export interface GeneratedExercise {
  exerciseId: string
  exerciseName: string
  exerciseNameHe: string
  imageUrl?: string
  category?: string
  primaryMuscle?: string
  isWarmup?: boolean
  targetSets: number
  targetReps: string
  aiNotes?: string
  sets: WorkoutSet[]
}

// Generated workout structure
export interface GeneratedWorkout {
  name: string
  exercises: GeneratedExercise[]
  estimatedDuration: number
  muscleGroups: string[]
  source: 'ai_trainer'
  aiWorkoutNumber: number
  aiExplanation?: string
}

// Response from Cloud Function to client
export interface GenerateWorkoutResponse {
  success: boolean
  workouts: GeneratedWorkout[]
  usedFallback: boolean
  error?: string
  rateLimitInfo?: {
    remaining: number
    resetAt: string
  }
}

// Rate limit check result
export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: Date
}

// AI Trainer usage document in Firestore
export interface AITrainerUsageDoc {
  odאcId: string
  date: string
  generationsCount: number
  lastGeneratedAt: FirebaseFirestore.Timestamp
}
