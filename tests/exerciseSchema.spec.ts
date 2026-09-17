import { describe, it, expect, vi } from 'vitest'

// Identifiable sentinels so we can assert exactly what toExercisePayload emits.
const SERVER_TIMESTAMP = { __sentinel: 'serverTimestamp' }
const DELETE_FIELD = { __sentinel: 'deleteField' }

vi.mock('firebase/firestore', () => ({
  serverTimestamp: vi.fn(() => SERVER_TIMESTAMP),
  deleteField: vi.fn(() => DELETE_FIELD),
}))

import {
  exerciseSchema,
  toExercisePayload,
  type ExerciseFormData,
} from '@/domains/exercises/validation/exerciseSchema'

const validRecord = {
  name: 'Leg Curl',
  nameHe: 'כפיפת ברכיים במכונה',
  category: 'legs',
  primaryMuscle: 'hamstrings',
  secondaryMuscles: [],
  secondaryMuscleCredits: [],
  equipment: 'machine',
  difficulty: 'beginner' as const,
  complexity: 'simple' as const,
  reportType: 'weight_reps',
  assistanceTypes: [],
  availableBands: [],
  instructions: [{ value: 'Curl the pad toward your glutes' }],
  instructionsHe: [{ value: 'כופף את הרגליים כלפי הישבן' }],
  targetMuscles: [],
  imageUrl: '',
  videoWebpUrl: '',
  tips: [],
  tipsHe: [],
}

describe('exerciseSchema', () => {
  it('parses a full valid record', () => {
    const parsed = exerciseSchema.parse(validRecord)
    expect(parsed.name).toBe('Leg Curl')
    expect(parsed.category).toBe('legs')
    expect(parsed.primaryMuscle).toBe('hamstrings')
  })

  it('fails without category with the exact Hebrew message', () => {
    // Empty string is how "no category" reaches the schema from the form.
    const result = exerciseSchema.safeParse({ ...validRecord, category: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message)
      expect(messages).toContain('קטגוריה נדרשת')
    }
    // Key entirely absent also fails (Zod's generic required error).
    const { category: _category, ...noCategory } = validRecord
    expect(exerciseSchema.safeParse(noCategory).success).toBe(false)
  })

  it('fails when bands is selected but availableBands is empty, on the availableBands path', () => {
    const result = exerciseSchema.safeParse({
      ...validRecord,
      assistanceTypes: ['bands'],
      availableBands: [],
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const bandIssue = result.error.issues.find((i) => i.path.join('.') === 'availableBands')
      expect(bandIssue).toBeDefined()
      expect(bandIssue?.message).toBe('יש לבחור לפחות גומיה אחת')
    }
  })
})

describe('toExercisePayload', () => {
  const asFormData = (overrides: Partial<ExerciseFormData> = {}): ExerciseFormData =>
    ({ ...exerciseSchema.parse(validRecord), ...overrides }) as ExerciseFormData

  it('editing with empty videoWebpUrl → deleteField sentinel', () => {
    const payload = toExercisePayload(asFormData({ videoWebpUrl: '' }), { isEditing: true })
    expect(payload.videoWebpUrl).toBe(DELETE_FIELD)
  })

  it('creating with empty videoWebpUrl → key absent', () => {
    const payload = toExercisePayload(asFormData({ videoWebpUrl: '' }), { isEditing: false })
    expect('videoWebpUrl' in payload).toBe(false)
  })

  it('filled videoWebpUrl → trimmed value (both modes)', () => {
    const url = '  https://example.com/a.webp  '
    expect(
      toExercisePayload(asFormData({ videoWebpUrl: url }), { isEditing: true }).videoWebpUrl
    ).toBe('https://example.com/a.webp')
    expect(
      toExercisePayload(asFormData({ videoWebpUrl: url }), { isEditing: false }).videoWebpUrl
    ).toBe('https://example.com/a.webp')
  })

  it('always stamps lastEditedAt with serverTimestamp', () => {
    const payload = toExercisePayload(asFormData(), { isEditing: false })
    expect(payload.lastEditedAt).toBe(SERVER_TIMESTAMP)
  })

  it('flattens instructions and drops empty values', () => {
    const payload = toExercisePayload(
      asFormData({ instructions: [{ value: 'a' }, { value: '' }] }),
      { isEditing: false }
    )
    expect(payload.instructions).toEqual(['a'])
  })
})
