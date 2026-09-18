import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

vi.mock('firebase/firestore', () => ({
  serverTimestamp: vi.fn(() => ({ __sentinel: 'serverTimestamp' })),
  deleteField: vi.fn(() => ({ __sentinel: 'deleteField' })),
}))

import { exerciseSchema as srcSchema } from '@/domains/exercises/validation/exerciseSchema'
import { exerciseSchema as fnSchema } from '../functions/src/shared/exerciseSchema'
import {
  EXERCISE_RECORD_RULES_SHA256,
  STYLE_PROMPT_SHA256,
} from '../functions/src/generated/promptSources.generated'

const sha = (p: string) => createHash('sha256').update(readFileSync(p, 'utf-8')).digest('hex')
const keysOf = (s: any) => Object.keys(s._def.schema?.shape ?? s.shape ?? s._def.shape()).sort()

describe('single-source contract between app, script and functions', () => {
  it('functions exerciseSchema has exactly the same keys as the app schema', () => {
    expect(keysOf(fnSchema)).toEqual(keysOf(srcSchema))
  })

  it('both schemas agree on a canonical record (valid + invalid)', () => {
    const valid = {
      name: 'Leg Curl', nameHe: 'כפיפת ברכיים', category: 'legs', primaryMuscle: 'hamstrings',
      secondaryMuscles: [], secondaryMuscleCredits: [], equipment: 'machine',
      difficulty: 'beginner', complexity: 'simple', reportType: 'weight_reps',
      assistanceTypes: [], availableBands: [], instructions: [{ value: 'a' }],
      instructionsHe: [{ value: 'ב' }], targetMuscles: [], imageUrl: '', tips: [], tipsHe: [],
    }
    expect(srcSchema.safeParse(valid).success).toBe(true)
    expect(fnSchema.safeParse(valid).success).toBe(true)
    const invalid = { ...valid, category: '' }
    expect(srcSchema.safeParse(invalid).success).toBe(false)
    expect(fnSchema.safeParse(invalid).success).toBe(false)
  })

  it('generated prompt constants match the assets files (hash) — fails on drift', () => {
    expect(EXERCISE_RECORD_RULES_SHA256).toBe(sha('assets/prompts/exercise-record-rules.md'))
    expect(STYLE_PROMPT_SHA256).toBe(sha('assets/image-style/gymiq-style-v3-prompt.md'))
  })

  it('functions similarExercises copy is byte-identical to src (minus generated header)', () => {
    const fnCopy = readFileSync('functions/src/shared/similarExercises.ts', 'utf-8')
    const src = readFileSync('src/domains/exercises/matching/similarExercises.ts', 'utf-8')
    expect(fnCopy.split('\n').slice(1).join('\n')).toBe(src)
  })
})
