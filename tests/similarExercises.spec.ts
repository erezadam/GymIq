import { describe, it, expect } from 'vitest'
import {
  findSimilarExercises,
  normalizeName,
} from '@/domains/exercises/matching/similarExercises'
import { normalizeName as libNormalizeName } from '../scripts/exercise-add/lib'

const catalog = [
  { id: 'w1', name: 'Wide grip lat pulldown', nameHe: 'משיכת פולי רחבה', category: 'back', equipment: 'cable_machine' },
  { id: 'p1', name: 'Pec Dec', nameHe: 'פרפר במכונה (Pec Dec)', category: 'chest', equipment: 'machine' },
  { id: 'r1', name: 'Romanian Deadlift', nameHe: 'דדליפט רומני (RDL)', category: 'legs', equipment: 'barbell' },
  { id: 'f1', name: 'Rear Delt Fly Lying', nameHe: 'הרחקה פרפר בכתף בשכיבה', category: 'shoulders', equipment: 'dumbbell' },
  { id: 'q1', name: 'Squat', nameHe: 'כפיפת ברכיים', category: 'legs', equipment: 'barbell' },
]

describe('normalizeName is a single source of truth', () => {
  it('lib.ts re-exports the same function', () => {
    expect(libNormalizeName).toBe(normalizeName)
  })
})

describe('findSimilarExercises', () => {
  it('finds Wide grip lat pulldown for Lat Pulldown and flags the different equipment', () => {
    const matches = findSimilarExercises(
      { name: 'Lat Pulldown', nameHe: 'משיכת פולי עליון', category: 'back', equipment: 'machine' },
      catalog
    )
    const w = matches.find((m) => m.id === 'w1')
    expect(w).toBeDefined()
    expect(w!.reasons.some((r) => r.includes('אותה קטגוריה'))).toBe(true)
    expect(w!.reasons.some((r) => r.includes('ציוד שונה'))).toBe(true)
  })

  it('finds the existing פרפר for Machine Reverse Fly candidates by Hebrew name', () => {
    const matches = findSimilarExercises(
      { name: 'Machine Fly', nameHe: 'פרפר במכונה', category: 'chest', equipment: 'machine' },
      catalog
    )
    const p = matches.find((m) => m.id === 'p1')
    expect(p).toBeDefined()
    expect(p!.reasons.some((r) => r.includes('שם עברי דומה'))).toBe(true)
    expect(p!.reasons.some((r) => r.includes('אותו ציוד'))).toBe(true)
  })

  it('matches RDL against דדליפט רומני (RDL) via the English name', () => {
    const matches = findSimilarExercises(
      { name: 'Romanian Deadlift', nameHe: 'מתים רומני', category: 'legs', equipment: 'barbell' },
      catalog
    )
    expect(matches[0]?.id).toBe('r1')
    expect(matches[0]!.reasons).toContain('אותה קטגוריה')
    expect(matches[0]!.reasons).toContain('אותו ציוד')
  })

  it('does not match on category/equipment alone without name similarity', () => {
    const matches = findSimilarExercises(
      { name: 'Leg Extension', nameHe: 'פשיטת ברך', category: 'legs', equipment: 'barbell' },
      catalog
    )
    expect(matches.find((m) => m.id === 'q1')).toBeUndefined()
  })

  it('respects the limit and sorts by score', () => {
    const matches = findSimilarExercises(
      { name: 'Lat Pulldown', nameHe: 'משיכת פולי', category: 'back', equipment: 'cable_machine' },
      catalog,
      1
    )
    expect(matches.length).toBeLessThanOrEqual(1)
  })
})
