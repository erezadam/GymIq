/**
 * Active Workout Types
 * Types for the active workout screen
 */

import type { MuscleGroup } from '@/domains/exercises/types'

// Last workout data for an exercise
export interface LastWorkoutData {
  weight: number
  reps: number
  date: Date
}

// A reported set during workout
export interface ReportedSet {
  id: string
  setNumber: number
  weight: number
  reps: number
  time?: number           // Time in seconds (for time_only and reps_time)
  intensity?: number      // Intensity 1-10 (for intensity_time)
  speed?: number          // Speed (km/h or pace)
  distance?: number       // Distance (meters or km)
  completedAt?: Date
}

// An exercise in the active workout
export interface ActiveWorkoutExercise {
  // Exercise identity
  id: string                          // Unique ID for this workout instance
  exerciseId: string                  // Reference to exercise in DB
  exerciseName: string                // English name
  exerciseNameHe: string              // Hebrew name
  imageUrl?: string                   // Exercise image
  primaryMuscle: MuscleGroup | string // Primary muscle group
  category?: string                   // Exercise category (for grouping)
  equipment?: string                  // Equipment type (for grouping by equipment)
  reportType?: string                 // How sets are reported - dynamic (default: weight_reps)

  // State
  isExpanded: boolean                 // Is card expanded for reporting
  isCompleted: boolean                // Is exercise marked as complete

  // Sets
  reportedSets: ReportedSet[]         // Sets that have been reported

  // Last workout data (from Firebase)
  lastWorkoutData?: LastWorkoutData

  // Historical notes from previous workouts
  historicalNotes?: { note: string; date: Date }[]

  // User notes for this exercise
  notes?: string
}

// Exercises grouped by muscle
export interface MuscleGroupExercises {
  muscleGroup: string                 // Muscle group key
  muscleGroupHe: string               // Hebrew name
  exercises: ActiveWorkoutExercise[]
}

// Exercises grouped by equipment
export interface EquipmentGroupExercises {
  equipment: string                   // Equipment key
  equipmentHe: string                 // Hebrew name
  exercises: ActiveWorkoutExercise[]
}

// Active workout session
export interface ActiveWorkout {
  id: string

  // Timestamps
  startedAt: Date

  // User
  userId: string

  // Exercises
  exercises: ActiveWorkoutExercise[]

  // Stats
  stats: {
    totalExercises: number
    completedExercises: number
    totalSets: number
    completedSets: number
    elapsedSeconds: number
    totalVolume: number               // weight * reps
  }
}

// Modal types
export type ConfirmModalType =
  | 'finish_workout'
  | 'exit_workout'
  | 'delete_exercise'
  | 'finish_exercise_reminder'
  | 'incomplete_exercises_warning'
  | null

// State for confirmation modal
export interface ConfirmModalState {
  type: ConfirmModalType
  exerciseId?: string                 // For delete confirmation
  exerciseName?: string               // For finish reminder (current exercise name)
  pendingExerciseId?: string          // For finish reminder (exercise user wants to open)
  setsCount?: number                  // For finish reminder (number of sets reported)
  incompleteCount?: number            // For incomplete exercises warning
}

// Storage key for persisting workout
export const ACTIVE_WORKOUT_STORAGE_KEY = 'gymiq_active_workout_v2'

// Default values
export const DEFAULT_SET_VALUES = {
  weight: 0,
  reps: 0,
}
