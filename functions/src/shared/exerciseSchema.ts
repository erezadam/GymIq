/**
 * Copy of the exercise Zod schema for server-side draft validation.
 * Source of truth: src/domains/exercises/validation/exerciseSchema.ts (schema
 * part only — no firebase imports, no toExercisePayload). A behavioral test
 * compares the key sets so drift fails loudly.
 */
import { z } from 'zod'

export const assistanceTypeEnum = z.enum(['graviton', 'bands'])

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
  reportType: z.string().min(1, 'סוג דיווח נדרש'),
  assistanceTypes: z.array(assistanceTypeEnum),
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
  if (data.assistanceTypes.includes('bands')) {
    return data.availableBands.length > 0
  }
  return true
}, {
  message: 'יש לבחור לפחות גומיה אחת',
  path: ['availableBands'],
})

export type ExerciseFormData = z.infer<typeof exerciseSchema>
