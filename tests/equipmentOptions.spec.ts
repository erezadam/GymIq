/**
 * Locks the extracted equipment-filter logic (buildEquipmentOptions +
 * isEquipmentOptionEmpty) — zero-behavior-change extraction from ExerciseLibrary.
 */
import { describe, it, expect } from 'vitest'
import { buildEquipmentOptions, isEquipmentOptionEmpty } from '../src/domains/exercises/utils/equipmentOptions'
import type { Equipment } from '../src/lib/firebase/equipment'

// Mirrors production equipment, including trailing-space Hebrew names and two
// inactive docs. buildEquipmentOptions receives active-or-not; it must exclude
// inactive and add "הכל" + graviton, sorted by trimmed Hebrew label.
const EQUIPMENT: Equipment[] = [
  { id: 'machine', nameHe: 'מכשירים ', nameEn: 'Machine', order: 7, isActive: true },
  { id: 'smit_machine', nameHe: 'סמיט ', nameEn: 'smit_machine', order: 1, isActive: true },
  { id: 'dumbbell', nameHe: 'משקולת יד', nameEn: 'Dumbbell', order: 2, isActive: true },
  { id: 'bodyweight', nameHe: 'משקל גוף', nameEn: 'Bodyweight', order: 3, isActive: true },
  { id: 'cable_machine', nameHe: 'מכונת כבלים', nameEn: 'Cable Machine', order: 5, isActive: true },
  { id: 'kettlebell', nameHe: 'קטלבל', nameEn: 'Kettlebell', order: 6, isActive: true },
  { id: 'puli', nameHe: 'פולי', nameEn: 'Puli', order: 1, isActive: true },
  { id: 'resistance_band', nameHe: 'גומייה', nameEn: 'Resistance Band', order: 9, isActive: true },
  { id: 'barbell', nameHe: 'מוט ברזל', nameEn: 'Barbell', order: 1, isActive: false },
  { id: 'pull_up_bar', nameHe: 'מוט מתח', nameEn: 'Pull-up Bar', order: 4, isActive: false },
]

describe('buildEquipmentOptions', () => {
  const options = buildEquipmentOptions(EQUIPMENT)

  it('always includes "הכל" first and the synthetic graviton item', () => {
    expect(options[0]).toEqual({ id: 'all', label: 'הכל' })
    expect(options.some((o) => o.id === 'graviton' && o.label === 'גרביטון')).toBe(true)
  })

  it('excludes inactive equipment', () => {
    expect(options.some((o) => o.id === 'barbell')).toBe(false)
    expect(options.some((o) => o.id === 'pull_up_bar')).toBe(false)
  })

  it('sorts exactly as today — trimmed Hebrew label, trailing spaces preserved in the label', () => {
    // "הכל" first, then active equipment + graviton sorted by trimmed Hebrew name.
    // Labels keep their raw value ('מכשירים ', 'סמיט ' with trailing space) but
    // are ordered by the trimmed comparison.
    expect(options.map((o) => o.label)).toEqual([
      'הכל',
      'גומייה',
      'גרביטון',
      'מכונת כבלים',
      'מכשירים ',
      'משקולת יד',
      'משקל גוף',
      'סמיט ',
      'פולי',
      'קטלבל',
    ])
  })

  it('adjacent options (after "הכל") are monotonic by trimmed Hebrew label', () => {
    const rest = options.slice(1)
    for (let i = 1; i < rest.length; i++) {
      expect(rest[i - 1].label.trim().localeCompare(rest[i].label.trim(), 'he')).toBeLessThanOrEqual(0)
    }
  })
})

describe('isEquipmentOptionEmpty', () => {
  it('"הכל" is never marked empty (even with zero count)', () => {
    expect(isEquipmentOptionEmpty('all', false, 0)).toBe(false)
    expect(isEquipmentOptionEmpty('all', false, undefined)).toBe(false)
  })

  it('an option is empty iff (and only iff) its availability count is zero', () => {
    expect(isEquipmentOptionEmpty('dumbbell', false, 0)).toBe(true)
    expect(isEquipmentOptionEmpty('dumbbell', false, undefined)).toBe(true)
    expect(isEquipmentOptionEmpty('dumbbell', false, 5)).toBe(false)
  })

  it('the selected option is never marked empty', () => {
    expect(isEquipmentOptionEmpty('dumbbell', true, 0)).toBe(false)
  })
})
