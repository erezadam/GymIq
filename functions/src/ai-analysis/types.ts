/**
 * AI Training Analysis Types
 */

// Request from client
export interface AnalysisRequest {
  userId: string
}

// User profile data for analysis context
export interface UserProfile {
  age?: number
  trainingGoals?: string[]
  injuriesOrLimitations?: string
  height?: number
  weight?: number
}

// Exercise from exercises collection (for muscle mapping)
export interface ExerciseMapping {
  id: string
  name: string
  nameHe: string
  primaryMuscle: string
  secondaryMuscles: string[]
}

// Muscle with sub-muscles from muscles collection
export interface MuscleData {
  id: string
  nameHe: string
  nameEn: string
  subMuscles: {
    id: string
    nameHe: string
    nameEn: string
  }[]
}

// Workout set for analysis
export interface AnalysisSet {
  type: string
  targetWeight: number
  targetReps: number
  actualWeight: number
  actualReps: number
  completed: boolean
  time?: number
  assistanceWeight?: number
}

// Exercise in workout history (enriched with muscle data)
export interface AnalysisExercise {
  exerciseId: string
  exerciseName: string
  exerciseNameHe: string
  primaryMuscle: string
  secondaryMuscles: string[]
  category: string
  isCompleted: boolean
  sets: AnalysisSet[]
}

// Single workout for analysis
export interface AnalysisWorkout {
  date: string
  duration: number
  status: string
  source: string
  exercises: AnalysisExercise[]
}

// Response from Cloud Function
export interface AnalysisResponse {
  success: boolean
  analysis?: string
  error?: string
  workoutCount?: number
  weeksAnalyzed?: number
  rateLimitInfo?: {
    remaining: number
    resetAt: string
  }
}

// Rate limit result (reused pattern)
export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: Date
}
