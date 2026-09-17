import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'

vi.mock('firebase/firestore', () => ({
  serverTimestamp: vi.fn(() => ({ __sentinel: 'serverTimestamp' })),
  deleteField: vi.fn(() => ({ __sentinel: 'deleteField' })),
}))

import {
  normalizeName,
  findDuplicate,
  toFormData,
  validateControlledValues,
} from '../scripts/exercise-add/lib'
import { exerciseSchema } from '@/domains/exercises/validation/exerciseSchema'

describe('normalizeName', () => {
  it('lowercases a clean name', () => {
    expect(normalizeName('Bent Over Row')).toBe('bent over row')
  })
  it('collapses whitespace and trims', () => {
    expect(normalizeName('bent  over row ')).toBe('bent over row')
  })
  it('strips parenthesized content from Hebrew names', () => {
    expect(normalizeName('חתירה בהטיית גו (Bent Over Row)')).toBe('חתירה בהטיית גו')
  })
})

describe('findDuplicate', () => {
  const existing = [
    { id: 'abc', name: 'Bent Over Row', nameHe: 'חתירה בהטיית גו (Bent Over Row)' },
    { id: 'def', name: 'Squat', nameHe: 'כפיפת ברכיים' },
  ]
  it('matches by nameHe even when the stored one carries parentheses', () => {
    const dup = findDuplicate(existing, { name: 'Something Else', nameHe: 'חתירה בהטיית גו' })
    expect(dup?.id).toBe('abc')
  })
  it('matches by English name case-insensitively', () => {
    const dup = findDuplicate(existing, { name: 'bent over  row', nameHe: 'שם אחר' })
    expect(dup?.id).toBe('abc')
  })
  it('returns null when nothing matches', () => {
    expect(findDuplicate(existing, { name: 'Deadlift', nameHe: 'מתים' })).toBeNull()
  })
})

describe('toFormData', () => {
  const minimal = {
    name: 'Test',
    nameHe: 'בדיקה',
    category: 'legs',
    equipment: 'machine',
    instructions: ['a'],
    instructionsHe: ['ב'],
    imageUrl: 'https://example.com/x.png',
  }
  it('fills form defaults and converts string arrays to {value}', () => {
    const fd = toFormData(minimal)
    expect(fd.difficulty).toBe('beginner')
    expect(fd.complexity).toBe('compound')
    expect(fd.reportType).toBe('weight_reps')
    expect(fd.secondaryMuscles).toEqual([])
    expect(fd.instructions).toEqual([{ value: 'a' }])
    expect(fd.instructionsHe).toEqual([{ value: 'ב' }])
    expect(fd.tips).toEqual([])
  })
  it('rejects videoWebpUrl in the input', () => {
    expect(() => toFormData({ ...minimal, videoWebpUrl: 'https://x.webp' })).toThrow(/videoWebpUrl/)
  })
})

describe('validateControlledValues', () => {
  const live = {
    muscleIds: new Set(['legs', 'chest']),
    equipmentActiveIds: new Set(['machine', 'dumbbell']),
    reportTypeActiveIds: new Set(['weight_reps']),
    subMuscleIds: new Set(['hamstrings', 'quads']),
  }
  const base = toFormData({
    name: 'Test', nameHe: 'בדיקה', category: 'legs', primaryMuscle: 'hamstrings',
    equipment: 'machine', instructions: ['a'], instructionsHe: ['ב'],
    imageUrl: 'https://example.com/x.png',
  })
  it('passes on fully valid values', () => {
    expect(validateControlledValues(base, live)).toEqual([])
  })
  it('flags inactive/unknown equipment', () => {
    const errors = validateControlledValues({ ...base, equipment: 'barbell' }, live)
    expect(errors.some((e) => e.includes("equipment 'barbell'"))).toBe(true)
  })
  it('flags a nonexistent category', () => {
    const errors = validateControlledValues({ ...base, category: 'glutes' }, live)
    expect(errors.some((e) => e.includes("category 'glutes'"))).toBe(true)
  })
})

describe('example.json', () => {
  it('passes exerciseSchema after toFormData', () => {
    const raw = JSON.parse(readFileSync('scripts/exercise-add/example.json', 'utf-8'))
    const result = exerciseSchema.safeParse(toFormData(raw))
    expect(result.success).toBe(true)
  })
})
