/**
 * AI Program Generation Types
 */

// Request from client (trainer UI)
export interface GenerateProgramRequest {
  traineeId: string
  daysPerWeek: number       // 3-6
  focusAreas?: string[]     // e.g., ['shoulders', 'legs']
  notes?: string            // trainer notes/instructions
}

// User profile for prompt context
export interface TraineeProfile {
  age?: number
  height?: number
  weight?: number
  fitnessLevel?: string
  trainingGoals?: string[]
  injuriesOrLimitations?: string
}

// Exercise from exercises collection (for prompt)
export interface ProgramExerciseData {
  id: string
  nameHe: string
  name: string
  category: string
  primaryMuscle: string
  secondaryMuscles: string[]
  equipment: string
  difficulty: string
  imageUrl: string
}

// Last analysis data from aiData subcollection
export interface LastAnalysisData {
  analysis: {
    title: string
    overview: string
    strengths: string[]
    weaknesses: string[]
    recommendations: string[]
    summary: string
  }
  workoutCount: number
  weeksAnalyzed: number
  createdAt: FirebaseFirestore.Timestamp
  model: string
}

// Existing program summary (for prompt context)
export interface ExistingProgramSummary {
  name: string
  days: {
    dayLabel: string
    name: string
    exerciseNames: string[]
  }[]
}

// GPT response — single exercise in a day
export interface GPTProgramExercise {
  exerciseId: string
  exerciseNameHe: string
  exerciseName: string
  category: string
  primaryMuscle: string
  equipment: string
  order: number
  targetSets: number
  targetReps: string
  restTime: number
  notes?: string
}

// GPT response — single day
export interface GPTProgramDay {
  dayLabel: string
  name: string
  exercises: GPTProgramExercise[]
}

// GPT full response
export interface GPTProgramResponse {
  programName: string
  description: string
  days: GPTProgramDay[]
  explanation: string
}

// Response from Cloud Function to client
export interface GenerateProgramResponse {
  success: boolean
  program?: GPTProgramResponse
  error?: string
  rateLimitInfo?: {
    remaining: number
    resetAt: string
  }
}

// Rate limit result
export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: Date
}
