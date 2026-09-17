/**
 * Pure helpers for the exercise-add write script.
 * No firebase imports here — everything is testable without Firestore.
 */
import type { ExerciseFormData } from '../../src/domains/exercises/validation/exerciseSchema'

// JSON input contract: like ExerciseFormData, but the four text-list fields
// are plain string arrays (converted to {value} before schema validation).
export interface ExerciseInput {
  name: string
  nameHe: string
  category: string
  primaryMuscle?: string
  secondaryMuscles?: string[]
  secondaryMuscleCredits?: string[]
  equipment: string
  difficulty?: 'beginner' | 'intermediate' | 'advanced'
  complexity?: 'compound' | 'simple'
  reportType?: string
  assistanceTypes?: ('graviton' | 'bands')[]
  availableBands?: string[]
  instructions: string[]
  instructionsHe: string[]
  targetMuscles?: string[]
  imageUrl: string
  tips?: string[]
  tipsHe?: string[]
}

// normalizeName moved to the shared matching module (single source of truth);
// re-exported here so existing imports keep working.
import { normalizeName } from '../../src/domains/exercises/matching/similarExercises'
export { normalizeName }

export interface ExistingExercise {
  id: string
  name: string
  nameHe: string
}

// Returns the existing record whose normalized name or nameHe matches the
// candidate's, or null.
export function findDuplicate(
  existing: ExistingExercise[],
  candidate: { name: string; nameHe: string }
): ExistingExercise | null {
  const candName = normalizeName(candidate.name)
  const candNameHe = normalizeName(candidate.nameHe)
  for (const ex of existing) {
    const exName = normalizeName(ex.name || '')
    const exNameHe = normalizeName(ex.nameHe || '')
    if (
      (candName && (exName === candName || exNameHe === candName)) ||
      (candNameHe && (exName === candNameHe || exNameHe === candNameHe))
    ) {
      return ex
    }
  }
  return null
}

// Input → form-shaped data with the admin form's defaults.
// videoWebpUrl is intentionally unsupported — reject it loudly.
export function toFormData(input: Record<string, unknown>): ExerciseFormData {
  if ('videoWebpUrl' in input) {
    throw new Error('videoWebpUrl אינו נתמך בקלט — הכיוון נזנח. הסר את השדה.')
  }
  const i = input as unknown as ExerciseInput
  const toValues = (arr: string[] | undefined) => (arr ?? []).map((value) => ({ value }))
  return {
    name: i.name,
    nameHe: i.nameHe,
    category: i.category,
    primaryMuscle: i.primaryMuscle ?? '',
    secondaryMuscles: i.secondaryMuscles ?? [],
    secondaryMuscleCredits: i.secondaryMuscleCredits ?? [],
    equipment: i.equipment,
    difficulty: i.difficulty ?? 'beginner',
    complexity: i.complexity ?? 'compound',
    reportType: i.reportType ?? 'weight_reps',
    assistanceTypes: i.assistanceTypes ?? [],
    availableBands: i.availableBands ?? [],
    instructions: toValues(i.instructions),
    instructionsHe: toValues(i.instructionsHe),
    targetMuscles: i.targetMuscles ?? [],
    imageUrl: i.imageUrl,
    tips: toValues(i.tips),
    tipsHe: toValues(i.tipsHe),
  } as ExerciseFormData
}

export interface LiveControlledValues {
  muscleIds: Set<string>
  equipmentActiveIds: Set<string>
  reportTypeActiveIds: Set<string>
  subMuscleIds: Set<string>
}

// Validates controlled-vocabulary fields against the live Firestore catalogs.
// Returns a list of human-readable errors (empty = valid).
export function validateControlledValues(
  formData: ExerciseFormData,
  live: LiveControlledValues
): string[] {
  const errors: string[] = []
  if (!live.muscleIds.has(formData.category)) {
    errors.push(`category '${formData.category}' אינו קטגוריה ראשית קיימת ב-muscles`)
  }
  if (!live.equipmentActiveIds.has(formData.equipment)) {
    errors.push(`equipment '${formData.equipment}' אינו ציוד פעיל ב-equipment`)
  }
  if (!live.reportTypeActiveIds.has(formData.reportType)) {
    errors.push(`reportType '${formData.reportType}' אינו סוג דיווח פעיל ב-reportTypes`)
  }
  if (
    formData.primaryMuscle !== '' &&
    !live.subMuscleIds.has(formData.primaryMuscle) &&
    !live.muscleIds.has(formData.primaryMuscle)
  ) {
    errors.push(`primaryMuscle '${formData.primaryMuscle}' אינו תת-שריר או שריר ראשי קיים`)
  }
  for (const m of formData.secondaryMuscles) {
    if (!live.subMuscleIds.has(m) && !live.muscleIds.has(m)) {
      errors.push(`secondaryMuscles: '${m}' אינו שריר קיים`)
    }
  }
  for (const m of formData.secondaryMuscleCredits) {
    if (!live.subMuscleIds.has(m) && !live.muscleIds.has(m)) {
      errors.push(`secondaryMuscleCredits: '${m}' אינו שריר קיים`)
    }
  }
  return errors
}
