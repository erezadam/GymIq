/**
 * AI Trainer Types
 * Types for AI-generated workout plans
 */

import type { Exercise } from '@/domains/exercises/types'
import type { PrimaryMuscle } from '@/domains/exercises/types/muscles'

// Muscle selection mode for multiple workouts
export type MuscleSelectionMode = 'ai_rotate' | 'same' | 'manual'

// Request from user to generate workout
export interface AITrainerRequest {
  numWorkouts: number        // 1-6
  duration: number           // 30/45/60/90 minutes
  muscleTargets: string[]    // muscle IDs from Firebase (optional)
  warmupDuration: number     // 5/10/15 minutes warmup
  userId: string
  muscleSelectionMode?: MuscleSelectionMode  // How to select muscles for multiple workouts
  perWorkoutMuscles?: string[][]             // Manual muscle selection per workout
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
}

// Context passed to Claude API
export interface AITrainerContext {
  request: AITrainerRequest
  availableExercises: Exercise[]
  muscles: PrimaryMuscle[]
  recentWorkouts: RecentWorkoutSummary[]
  yesterdayExerciseIds: string[]
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
  if (duration <= 30) return 6   // 30 min = 6 + warmup = 7
  if (duration <= 45) return 8   // 45 min = 8 + warmup = 9
  if (duration <= 60) return 9   // 60 min = 9 + warmup = 10
  return 11                      // 90 min = 11 + warmup = 12
}

// Get workout name for AI workouts (with timestamp for identification)
export function getAIWorkoutName(workoutNumber: number): string {
  const now = new Date()
  const time = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`
  return `מאמן #${workoutNumber} (${time})`
}
