/**
 * exercisesNormalize.spec.ts — Behavior tests for secondaryMuscles normalization.
 *
 * Context: getExercises/getExerciseById cast raw Firestore data() straight to
 * Exercise. The Exercise type declares `secondaryMuscles: MuscleGroup[]` (a
 * required array) and callers do `ex.secondaryMuscles.includes(...)`. A doc that
 * omits the field would yield `undefined` → `undefined.includes is not a
 * function` crashes the ExerciseLibrary sub-muscle filter at render.
 *
 * The fix defaults a missing field to []. These tests mock the Firestore SDK
 * and assert the returned object's shape (behavior), not string presence.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

const { getDocsMock, getDocMock } = vi.hoisted(() => ({
  getDocsMock: vi.fn(),
  getDocMock: vi.fn(),
}))

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => ({})),
  doc: vi.fn(() => ({})),
  getDocs: getDocsMock,
  getDoc: getDocMock,
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  query: vi.fn(() => ({})),
  where: vi.fn(),
  orderBy: vi.fn(),
  serverTimestamp: vi.fn(() => '__TS__'),
  writeBatch: vi.fn(),
}))

vi.mock('@/lib/firebase/config', () => ({ db: {} }))
// exercises.ts imports `./config`; alias + relative resolve to the same module.
vi.mock('./config', () => ({ db: {} }))

import { getExercises, getExerciseById } from '@/lib/firebase/exercises'

beforeEach(() => {
  getDocsMock.mockReset()
  getDocMock.mockReset()
})

describe('secondaryMuscles normalization', () => {
  it('getExercises defaults a missing secondaryMuscles to []', async () => {
    getDocsMock.mockResolvedValue({
      docs: [
        // Doc WITHOUT secondaryMuscles — the crash case.
        { id: 'no-sec', data: () => ({ name: 'Squat', nameHe: 'סקוואט', primaryMuscle: 'quads' }) },
        // Doc WITH secondaryMuscles — must be preserved untouched.
        { id: 'with-sec', data: () => ({ name: 'Bench', nameHe: 'לחיצה', primaryMuscle: 'chest', secondaryMuscles: ['triceps'] }) },
      ],
    })

    const result = await getExercises()

    const noSec = result.find((e) => e.id === 'no-sec')!
    expect(Array.isArray(noSec.secondaryMuscles)).toBe(true)
    expect(noSec.secondaryMuscles).toEqual([])
    // The defaulted array must support .includes without throwing.
    expect(() => noSec.secondaryMuscles.includes('biceps' as never)).not.toThrow()

    const withSec = result.find((e) => e.id === 'with-sec')!
    expect(withSec.secondaryMuscles).toEqual(['triceps'])
  })

  it('getExerciseById defaults a missing secondaryMuscles to []', async () => {
    getDocMock.mockResolvedValue({
      exists: () => true,
      id: 'x1',
      data: () => ({ name: 'Plank', nameHe: 'פלאנק', primaryMuscle: 'core' }),
    })

    const result = await getExerciseById('x1')
    expect(result).not.toBeNull()
    expect(result!.secondaryMuscles).toEqual([])
  })
})
