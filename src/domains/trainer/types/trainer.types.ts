import type { Timestamp } from 'firebase/firestore'

// ============ ENUMS & CONSTANTS ============

export type TrainingGoal =
  | 'muscle_gain'
  | 'weight_loss'
  | 'strength'
  | 'endurance'
  | 'flexibility'
  | 'general_fitness'
  | 'rehabilitation'
  | 'sport_specific'

export type TrainerSpecialization =
  | 'strength'
  | 'cardio'
  | 'rehabilitation'
  | 'bodybuilding'
  | 'crossfit'
  | 'yoga'
  | 'martial_arts'
  | 'swimming'

export type RelationshipStatus = 'active' | 'paused' | 'ended'

export type ProgramStatus = 'active' | 'paused' | 'completed' | 'draft'

export type MessageType =
  | 'general'
  | 'workout_feedback'
  | 'program_update'
  | 'motivation'
  | 'instruction'

export type MessagePriority = 'normal' | 'high'

export type MessageReferenceType = 'workout' | 'exercise' | 'program'

// ============ TRAINER PROFILE ============

export interface TrainerProfile {
  specializations?: TrainerSpecialization[]
  bio?: string
  maxTrainees?: number // default 50
}

// ============ TRAINER-TRAINEE RELATIONSHIP ============

export interface TrainerRelationship {
  id: string
  trainerId: string
  traineeId: string
  trainerName: string
  traineeName: string
  traineeEmail: string
  status: RelationshipStatus
  createdAt: Timestamp | Date
  updatedAt: Timestamp | Date
  endedAt?: Timestamp | Date
  endedBy?: 'trainer' | 'trainee' | 'admin'
  endReason?: string
  notes?: string
}

// ============ TRAINING PROGRAMS ============

export interface TrainingProgram {
  id: string
  trainerId: string
  traineeId: string
  originalTrainerId: string // keeps original trainer even if relationship ends
  name: string
  description?: string
  status: ProgramStatus
  isModifiedByTrainee: boolean // true if trainee made changes
  weeklyStructure: ProgramDay[]
  durationWeeks?: number // null = indefinite
  startDate: Timestamp | Date
  endDate?: Timestamp | Date
  currentWeek: number // 1-based
  createdAt: Timestamp | Date
  updatedAt: Timestamp | Date
  notes?: string
}

export interface ProgramDay {
  dayLabel: string // "יום A", "יום B"
  dayOfWeek?: number // 0=Sunday...6=Saturday (optional)
  name: string // "חזה + טרייספס"
  exercises: ProgramExercise[]
  restDay: boolean
  notes?: string
  estimatedDuration?: number // minutes
}

export interface ProgramExercise {
  exerciseId: string
  exerciseName: string
  exerciseNameHe: string
  imageUrl?: string
  category?: string
  primaryMuscle?: string
  equipment?: string
  order: number
  targetSets: number
  targetReps: string // "8-12" range format
  targetWeight?: number // suggested starting weight (kg)
  restTime: number // seconds, default 90
  notes?: string // trainer notes for trainee
  supersetGroup?: string // group ID for supersets
  reportType?: string
  assistanceTypes?: string[]
}

// ============ MESSAGES ============

export interface MessageReply {
  id: string
  senderId: string
  senderName: string
  senderRole: 'trainer' | 'user'
  body: string
  createdAt: Timestamp | Date
}

export interface TrainerMessage {
  id: string
  trainerId: string
  traineeId: string
  trainerName: string
  type: MessageType
  subject?: string
  body: string
  referenceType?: MessageReferenceType
  referenceId?: string
  referenceName?: string
  isRead: boolean
  readAt?: Timestamp | Date
  createdAt: Timestamp | Date
  priority: MessagePriority
  replies?: MessageReply[]
}

// ============ PROGRAM MODIFICATIONS (tracked per workout) ============

export type ProgramModificationType = 'exercise_removed' | 'exercise_added' | 'sets_changed'

export interface ProgramModification {
  type: ProgramModificationType
  exerciseId: string
  exerciseName: string
  reason?: string // trainee's explanation
  timestamp: Timestamp | Date
}

// ============ COMPOSITE / VIEW TYPES ============

export interface TraineeWithStats {
  relationship: TrainerRelationship
  traineeProfile?: {
    uid: string
    firstName: string
    lastName: string
    displayName: string
    email: string
    phoneNumber?: string
    fitnessLevel?: string
    trainingGoals?: TrainingGoal[]
    injuriesOrLimitations?: string
  }
  lastWorkoutDate?: Date
  thisWeekWorkouts: number
  thisMonthWorkouts: number
  currentStreak: number
  programCompletionRate: number
  activeProgram?: TrainingProgram
  unreadMessagesCount?: number
}

export interface TraineeStats {
  totalWorkouts: number
  thisWeekWorkouts: number
  thisMonthWorkouts: number
  currentStreak: number
  totalVolume: number
  programCompletionRate: number
}

export interface CreateTraineeData {
  firstName: string
  lastName: string
  email: string
  password: string
  phone?: string
  fitnessLevel?: 'beginner' | 'intermediate' | 'advanced' | 'expert'
  trainingGoals?: TrainingGoal[]
  notes?: string
  injuries?: string
}

// ============ HEBREW LABELS ============

export const TRAINING_GOAL_LABELS: Record<TrainingGoal, string> = {
  muscle_gain: 'בניית שריר',
  weight_loss: 'ירידה במשקל',
  strength: 'חיזוק',
  endurance: 'סיבולת',
  flexibility: 'גמישות',
  general_fitness: 'כושר כללי',
  rehabilitation: 'שיקום',
  sport_specific: 'ספורט ספציפי',
}

export const MESSAGE_TYPE_LABELS: Record<MessageType, string> = {
  general: 'כללי',
  workout_feedback: 'משוב על אימון',
  program_update: 'עדכון תוכנית',
  motivation: 'מוטיבציה',
  instruction: 'הנחיה',
}

export const RELATIONSHIP_STATUS_LABELS: Record<RelationshipStatus, string> = {
  active: 'פעיל',
  paused: 'מושהה',
  ended: 'הסתיים',
}

export const PROGRAM_STATUS_LABELS: Record<ProgramStatus, string> = {
  active: 'פעילה',
  paused: 'מושהית',
  completed: 'הושלמה',
  draft: 'טיוטה',
}
