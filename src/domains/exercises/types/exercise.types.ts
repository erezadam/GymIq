// Exercise difficulty levels
export type ExerciseDifficulty = 'beginner' | 'intermediate' | 'advanced'

// Exercise categories
export type ExerciseCategory =
  | 'chest'
  | 'back'
  | 'legs'
  | 'shoulders'
  | 'arms'
  | 'core'
  | 'cardio'
  | 'functional'
  | 'stretching'

// Muscle groups
export type MuscleGroup =
  | 'chest'
  | 'lats'
  | 'quadriceps'
  | 'hamstrings'
  | 'glutes'
  | 'triceps'
  | 'biceps'
  | 'shoulders'
  | 'core'
  | 'calves'
  | 'traps'
  | 'lower_back'
  | 'forearms'
  | 'rhomboids'
  | 'middle_traps'

// Equipment types
export type EquipmentType =
  | 'barbell'
  | 'dumbbell'
  | 'bodyweight'
  | 'pull_up_bar'
  | 'cable_machine'
  | 'kettlebell'
  | 'machine'
  | 'bench'
  | 'resistance_band'

// Exercise report types - how sets are reported
// NOTE: This is now loaded dynamically from Firebase.
// These are the legacy/default types for backward compatibility.
export type ExerciseReportType =
  | 'weight_reps'   // משקל + חזרות (ברירת מחדל)
  | 'reps_only'     // חזרות בלבד (מתח, שכיבות סמיכה)
  | 'time_only'     // זמן בלבד (פלאנק, ריצה)
  | 'reps_time'     // חזרות + זמן (AMRAP)
  | string          // Dynamic types from Firebase

// Main Exercise interface
export interface Exercise {
  id: string
  name: string
  nameHe: string
  category: ExerciseCategory
  primaryMuscle: MuscleGroup
  secondaryMuscles: MuscleGroup[]
  equipment: EquipmentType
  difficulty: ExerciseDifficulty
  reportType?: string  // סוג דיווח דינמי - ברירת מחדל: weight_reps
  instructions: string[]
  instructionsHe: string[]
  targetMuscles: string[]
  imageUrl: string
  tips: string[]
  tipsHe: string[]
  createdAt?: Date
  updatedAt?: Date
}

// Category metadata
export interface CategoryInfo {
  id: ExerciseCategory
  name: string
  nameHe: string
  description: string
  descriptionHe: string
}

// Equipment metadata
export interface EquipmentInfo {
  id: EquipmentType
  name: string
  nameHe: string
}

// Muscle metadata
export interface MuscleInfo {
  id: MuscleGroup
  name: string
  nameHe: string
  scientificName: string
}

// Form DTOs
export interface CreateExerciseDto {
  name: string
  nameHe: string
  category: ExerciseCategory
  primaryMuscle: MuscleGroup
  secondaryMuscles: MuscleGroup[]
  equipment: EquipmentType
  difficulty: ExerciseDifficulty
  reportType?: string  // סוג דיווח דינמי - ברירת מחדל: weight_reps
  instructions: string[]
  instructionsHe: string[]
  targetMuscles: string[]
  imageUrl: string
  tips: string[]
  tipsHe: string[]
}

export type UpdateExerciseDto = Partial<CreateExerciseDto>

// Filter options for exercise list
// Using string types to support dynamic values from Firebase
export interface ExerciseFilters {
  search?: string
  category?: string
  difficulty?: ExerciseDifficulty
  equipment?: string
  muscle?: string
}
