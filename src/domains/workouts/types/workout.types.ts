// Workout set types
export type SetType = 'warmup' | 'working' | 'dropset' | 'superset' | 'amrap'

// Exercise set
export interface WorkoutSet {
  id: string
  type: SetType
  targetReps?: number
  targetWeight?: number
  actualReps?: number
  actualWeight?: number
  completed: boolean
  rpe?: number // Rate of Perceived Exertion 1-10
}

// Exercise in workout
export interface WorkoutExercise {
  id: string
  exerciseId: string
  exerciseName: string
  exerciseNameHe: string
  order: number
  sets: WorkoutSet[]
  restTime: number // seconds
  notes?: string
}

// Workout template
export interface WorkoutTemplate {
  id: string
  name: string
  nameHe: string
  description?: string
  category: string
  exercises: WorkoutExercise[]
  estimatedDuration: number // minutes
  createdBy: string
  isPublic: boolean
  createdAt: Date
  updatedAt: Date
}

// Active workout session
export interface WorkoutSession {
  id: string
  templateId?: string
  userId: string
  name: string
  startTime: Date
  endTime?: Date
  status: 'active' | 'paused' | 'completed' | 'cancelled'
  exercises: WorkoutExercise[]
  currentExerciseIndex: number
  currentSetIndex: number
  totalVolume: number
  notes?: string
}

// Workout completion status
// - completed: all exercises finished (blue)
// - in_progress: workout started but not finished (yellow)
// - planned: future workout not started yet (red)
// - partial: legacy - same as in_progress
// - cancelled: workout was cancelled
export type WorkoutCompletionStatus = 'completed' | 'in_progress' | 'planned' | 'partial' | 'cancelled'

// Exercise completion state in session
export interface ExerciseSessionState {
  exerciseId: string
  exerciseName: string
  exerciseNameHe: string
  imageUrl?: string
  sets: WorkoutSet[]
  restTime: number
  isCompleted: boolean
  completedAt?: Date
}

// Workout history entry (full details)
export interface WorkoutHistoryEntry {
  id: string
  userId: string
  name: string
  date: Date
  startTime: Date
  endTime: Date
  duration: number // minutes
  status: WorkoutCompletionStatus
  exercises: {
    exerciseId: string
    exerciseName: string
    exerciseNameHe: string
    isCompleted: boolean
    sets: {
      type: SetType
      targetReps: number
      targetWeight: number
      actualReps?: number
      actualWeight?: number
      completed: boolean
    }[]
  }[]
  completedExercises: number
  totalExercises: number
  completedSets: number
  totalSets: number
  totalVolume: number // kg
  personalRecords: number
  notes?: string
}

// Summary for display in lists
export interface WorkoutHistorySummary {
  id: string
  name: string
  date: Date
  duration: number // minutes
  status: WorkoutCompletionStatus
  completedExercises: number
  totalExercises: number
  totalVolume: number // kg
  personalRecords: number
}
