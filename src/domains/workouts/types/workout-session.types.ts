/**
 * Workout Session Types
 * Based on workout-session-screen-spec.md
 */

// Session states
export type WorkoutSessionState =
  | 'performing_set'    // User is performing a set
  | 'resting'           // Rest between sets
  | 'between_exercises' // Transitioning between exercises
  | 'completed'         // Workout finished

// Set types
export type SetType = 'warmup' | 'working' | 'dropset' | 'superset' | 'amrap'

// Set status
export type SetStatus = 'completed' | 'active' | 'upcoming'

// Planned set (what trainer defined)
export interface PlannedSet {
  setNumber: number
  setType: SetType
  targetReps: { min: number; max: number } | number
  targetWeight?: number
  targetRIR?: number
  restSeconds: number
  notes?: string
}

// Completed set (what user actually did)
export interface CompletedSet {
  setNumber: number
  setType: SetType
  actualReps: number
  actualWeight: number
  actualRIR?: number
  completedAt: Date
  notes?: string
}

// Exercise in workout session
export interface SessionExercise {
  id: string
  exerciseId: string
  exerciseName: string
  exerciseNameHe: string
  imageUrl?: string
  videoUrl?: string
  instructions?: string

  // Planned sets
  plannedSets: PlannedSet[]

  // Completed sets
  completedSets: CompletedSet[]

  // Current set index (0-based)
  currentSetIndex: number

  // Is exercise completed
  isCompleted: boolean
}

// Active workout session
export interface ActiveWorkoutSession {
  id: string

  // Workout info
  workoutTemplateId?: string
  workoutName: string
  startedAt: Date

  // Current position
  currentExerciseIndex: number

  // Session state
  state: WorkoutSessionState

  // Exercises
  exercises: SessionExercise[]

  // Rest timer
  restTimer: {
    isActive: boolean
    targetSeconds: number
    startedAt?: Date
  }

  // Stats
  stats: {
    totalTimeSeconds: number
    totalVolume: number
    completedSets: number
    totalSets: number
    completedExercises: number
  }
}

// Rest timer config
export interface RestTimerConfig {
  defaultRestSeconds: number
  warningSeconds: number // When to show warning (e.g., 10 seconds left)
  soundEnabled: boolean
  hapticEnabled: boolean
}

// Set input values (for active set card)
export interface SetInputValues {
  reps: number
  weight: number
  rir?: number
}

// Exercise navigation
export interface ExerciseNavigation {
  currentIndex: number
  totalExercises: number
  canGoBack: boolean
  canGoForward: boolean
}

// Workout session actions
export interface WorkoutSessionActions {
  // Set actions
  completeSet: (values: SetInputValues) => void
  skipSet: () => void
  updateSetValues: (values: Partial<SetInputValues>) => void

  // Exercise actions
  completeExercise: () => void
  skipExercise: () => void
  navigateToExercise: (index: number) => void
  goToNextExercise: () => void
  goToPreviousExercise: () => void

  // Timer actions
  skipRest: () => void
  extendRest: (seconds: number) => void
  setRestTime: (seconds: number) => void

  // Session actions
  pauseSession: () => void
  resumeSession: () => void
  finishWorkout: () => void
  cancelWorkout: () => void
}

// Storage key for session persistence
export const SESSION_STORAGE_KEY = 'gymiq_active_workout_session'
