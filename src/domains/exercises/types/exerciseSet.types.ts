import type { ExerciseCategory, ExerciseDifficulty } from './exercise.types'

/**
 * Exercise Set - A curated collection of exercises grouped by muscle/goal
 * Stored in Firestore collection: exerciseSets
 */
export interface ExerciseSet {
  id: string
  name: string // שם בעברית (ראשי)
  nameEn?: string // שם באנגלית (אופציונלי)
  muscleGroup: ExerciseCategory
  exerciseIds: string[] // מזהי תרגילים מ-exercises collection
  setImage: string // URL מ-Firebase Storage
  description?: string
  difficulty: ExerciseDifficulty
  order: number // סדר הצגה בתוך קבוצת השריר
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  createdBy: string // UID של האדמין שיצר
}

/**
 * DTO for creating a new exercise set
 */
export interface CreateExerciseSetDto {
  name: string
  nameEn?: string
  muscleGroup: ExerciseCategory
  exerciseIds: string[]
  setImage: string
  description?: string
  difficulty: ExerciseDifficulty
  order: number
  isActive: boolean
}

/**
 * DTO for updating an existing exercise set
 */
export type UpdateExerciseSetDto = Partial<CreateExerciseSetDto>
