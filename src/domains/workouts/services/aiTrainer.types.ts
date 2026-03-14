/**
 * AI Trainer Types
 * Types for AI-generated workout plans
 */

import type { Exercise } from '@/domains/exercises/types'
import type { PrimaryMuscle } from '@/domains/exercises/types/muscles'

// AI recommendation for an exercise
export interface AIRecommendation {
  weight: number      // Recommended weight in kg
  repRange: string    // e.g., "8-10"
  sets: number        // Number of sets
  reasoning?: string  // Why this recommendation (for debugging)
}

// Per-exercise performance history from user's past workouts
export interface ExercisePerformanceData {
  exerciseId: string
  lastWeight: number       // Last weight used (kg)
  lastReps: number         // Last reps completed
  lastDate: string         // ISO date of last performance
  lastVolume?: number      // Total exercise volume (sum of weight × reps) from last workout
  recentSessions?: {       // Last 3-5 sessions (optional)
    weight: number
    reps: number
    date: string
  }[]
}

// Workout structure types
export type WorkoutStructure = 'full_body' | 'split'
export type SplitStartWith = 'upper' | 'lower'

// Request from user to generate workout
export interface AITrainerRequest {
  numWorkouts: number        // 1-6
  duration: number           // 60/75/90 minutes
  warmupDuration: number     // 0/5/10/15 minutes warmup
  userId: string
  workoutStructure: WorkoutStructure
  splitStartWith?: SplitStartWith  // For split with 3 or 5 workouts
}

// Exercise in AI-generated workout
export interface AIGeneratedExercise {
  exerciseId: string
  exerciseName: string
  exerciseNameHe: string
  imageUrl?: string
  category?: string          // Primary muscle Hebrew name
  primaryMuscle?: string     // Primary muscle ID
  isWarmup?: boolean         // Warmup exercise flag
  targetSets: number         // Recommended sets (3-4)
  targetReps: string         // Recommended reps range ("8-12")
  aiNotes?: string           // AI tips for this exercise
  sets: {
    type: 'warmup' | 'working'
    targetReps: number
    targetWeight: number
    actualReps: number
    actualWeight: number
    completed: boolean
  }[]
}

// AI-generated workout plan
export interface AIGeneratedWorkout {
  name: string               // "מאמן #1" or "מאמן AI - אימון 1"
  exercises: AIGeneratedExercise[]
  estimatedDuration: number  // minutes
  muscleGroups: string[]     // Muscle groups worked (Hebrew names)
  source: 'ai_trainer'
  aiWorkoutNumber: number    // Sequential number (1, 2, 3...)
  aiExplanation?: string     // AI explanation for workout selection
  aiRecommendations?: Record<string, AIRecommendation>  // exerciseId → recommendation
}

// Context passed to Cloud Function
export interface AITrainerContext {
  request: AITrainerRequest
  availableExercises: Exercise[]
  muscles: PrimaryMuscle[]
  recentWorkouts: RecentWorkoutSummary[]
  yesterdayExerciseIds: string[]
  exerciseHistory: ExercisePerformanceData[]
}

// Summary of recent workout for context
export interface RecentWorkoutSummary {
  date: string
  muscleGroups: string[]
  exerciseIds: string[]
}

// Response from AI generation (Claude or Fallback)
export interface AITrainerResponse {
  success: boolean
  workouts: AIGeneratedWorkout[]
  error?: string
  usedFallback?: boolean
}

// Calculate exercise count based on duration (NOT including warmup)
export function getExerciseCount(duration: number): number {
  if (duration <= 60) return 9   // 60 min = 9 exercises
  if (duration <= 75) return 10  // 75 min = 10 exercises
  return 11                      // 90 min = 11 exercises
}

// Get workout name for AI workouts (with timestamp for identification)
export function getAIWorkoutName(workoutNumber: number): string {
  const now = new Date()
  const time = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`
  return `מאמן #${workoutNumber} (${time})`
}
