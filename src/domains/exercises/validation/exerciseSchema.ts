import { z } from 'zod'
import { serverTimestamp, deleteField } from 'firebase/firestore'
import type {
  ExerciseCategory,
  MuscleGroup,
  EquipmentType,
  AssistanceType,
  ExerciseComplexity,
} from '@/domains/exercises/types'

// Assistance type options (empty = regular exercise using reportType)
export const assistanceTypeEnum = z.enum(['graviton', 'bands'])

// Validation schema
export const exerciseSchema = z.object({
  name: z.string().min(2, 'שם התרגיל באנגלית נדרש'),
  nameHe: z.string().min(2, 'שם התרגיל בעברית נדרש'),
  category: z.string().min(1, 'קטגוריה נדרשת'),
  primaryMuscle: z.string().default(''),
  secondaryMuscles: z.array(z.string()),
  secondaryMuscleCredits: z.array(z.string()),
  equipment: z.string().min(1, 'ציוד נדרש'),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  complexity: z.enum(['compound', 'simple']).default('compound'),
  reportType: z.string().min(1, 'סוג דיווח נדרש'), // Dynamic - loaded from Firebase
  assistanceTypes: z.array(assistanceTypeEnum), // Empty = regular exercise
  availableBands: z.array(z.string()),
  instructions: z.array(z.object({ value: z.string() })).min(1, 'נדרשת לפחות הוראה אחת'),
  instructionsHe: z.array(z.object({ value: z.string() })).min(1, 'נדרשת לפחות הוראה אחת בעברית'),
  targetMuscles: z.array(z.string()),
  imageUrl: z.string().url('כתובת תמונה לא תקינה').or(z.literal('')),
  videoWebpUrl: z
    .string()
    .url('כתובת WebP לא תקינה')
    .regex(/\.webp(\?.*)?$/i, 'הקובץ חייב להיות בסיומת .webp')
    .or(z.literal(''))
    .optional(),
  tips: z.array(z.object({ value: z.string() })),
  tipsHe: z.array(z.object({ value: z.string() })),
}).refine((data) => {
  // If 'bands' is in assistanceTypes, at least one band must be selected
  if (data.assistanceTypes.includes('bands')) {
    return data.availableBands.length > 0
  }
  return true
}, {
  message: 'יש לבחור לפחות גומיה אחת',
  path: ['availableBands'],
})

export type ExerciseFormData = z.infer<typeof exerciseSchema>

// Transforms validated form data into the exact Firestore payload the admin
// form submits. Extracted verbatim from ExerciseForm.onSubmit — the form's
// validMuscleIds gate, toasts and mutations stay in the component.
export function toExercisePayload(
  data: ExerciseFormData,
  opts: { isEditing: boolean }
): Record<string, unknown> {
  const trimmedVideoWebpUrl = data.videoWebpUrl?.trim()

  const formattedData: Record<string, unknown> = {
    ...data,
    category: data.category as ExerciseCategory,
    primaryMuscle: data.primaryMuscle as MuscleGroup,
    secondaryMuscles: data.secondaryMuscles as MuscleGroup[],
    secondaryMuscleCredits: data.secondaryMuscleCredits,
    equipment: data.equipment as EquipmentType,
    complexity: data.complexity as ExerciseComplexity,
    reportType: data.reportType, // Dynamic - stored as string
    assistanceTypes: data.assistanceTypes as AssistanceType[],
    // Only include availableBands if 'bands' is in assistanceTypes
    availableBands: data.assistanceTypes.includes('bands') ? data.availableBands : [],
    targetMuscles: data.targetMuscles as MuscleGroup[],
    instructions: data.instructions.map((i) => i.value).filter(Boolean),
    instructionsHe: data.instructionsHe.map((i) => i.value).filter(Boolean),
    tips: data.tips.map((t) => t.value).filter(Boolean),
    tipsHe: data.tipsHe.map((t) => t.value).filter(Boolean),
    lastEditedAt: serverTimestamp(),
  }

  // videoWebpUrl handling matrix:
  //   - filled  → store the trimmed URL.
  //   - empty + create → omit the key (no field on the new document).
  //   - empty + edit → send deleteField() so Firestore actively removes
  //     a previously-stored URL (merge semantics would otherwise leave it).
  //   Never send `undefined` — Firestore SDK rejects it.
  delete formattedData.videoWebpUrl
  if (trimmedVideoWebpUrl) {
    formattedData.videoWebpUrl = trimmedVideoWebpUrl
  } else if (opts.isEditing) {
    formattedData.videoWebpUrl = deleteField()
  }

  return formattedData
}
