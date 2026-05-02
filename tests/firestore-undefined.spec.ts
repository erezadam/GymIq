/**
 * firestore-undefined.spec.ts — Behavior tests for the Firestore-undefined iron rule.
 *
 * Iron rule: Firestore rejects updateDoc()/setDoc()/addDoc() calls that
 * carry any field with value `undefined`. Every Firestore-write helper
 * must run its payload through `removeUndefined()` from
 * `src/lib/firebase/firestoreUtils.ts`.
 *
 * These tests verify behavior (mock Firestore SDK, assert on the call
 * arguments), not string presence — per the "behavior over grep" rule.
 *
 * Regression context: PR #108 (30/04/2026, commit 30b2cad) added a
 * `videoWebpUrl?: string` field to Exercise. ExerciseForm sent the field
 * as `undefined` when the input was empty, and `updateExercise()` did
 * not sanitize before calling `updateDoc()`. The result: every exercise
 * update without a WebP URL crashed in production.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the Firestore SDK before importing the service that uses it.
// We capture the args passed to each write so the assertions can inspect them.
const updateDocMock = vi.fn(async () => undefined)
const addDocMock = vi.fn(async () => ({ id: 'new-id' }))
const setDocMock = vi.fn(async () => undefined)
const batchSetMock = vi.fn()
const batchCommitMock = vi.fn(async () => undefined)
const writeBatchMock = vi.fn(() => ({ set: batchSetMock, commit: batchCommitMock }))

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => ({})),
  doc: vi.fn(() => ({})),
  getDoc: vi.fn(),
  getDocs: vi.fn(async () => ({ docs: [], size: 0 })),
  addDoc: addDocMock,
  updateDoc: updateDocMock,
  setDoc: setDocMock,
  deleteDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  serverTimestamp: vi.fn(() => '__SERVER_TIMESTAMP__'),
  writeBatch: writeBatchMock,
  Timestamp: { now: vi.fn(() => ({ toDate: () => new Date() })) },
}))

beforeEach(() => {
  updateDocMock.mockClear()
  addDocMock.mockClear()
  setDocMock.mockClear()
  batchSetMock.mockClear()
  batchCommitMock.mockClear()
  writeBatchMock.mockClear()
})

describe('removeUndefined()', () => {
  it('strips top-level undefined values', async () => {
    const { removeUndefined } = await import('../src/lib/firebase/firestoreUtils')
    const result = removeUndefined({ a: 1, b: undefined, c: 'hello' })
    expect(result).toEqual({ a: 1, c: 'hello' })
    expect('b' in result).toBe(false)
  })

  it('recursively strips undefined inside nested objects', async () => {
    const { removeUndefined } = await import('../src/lib/firebase/firestoreUtils')
    const result = removeUndefined({
      outer: { kept: 'yes', dropped: undefined },
      sibling: 7,
    })
    expect(result).toEqual({ outer: { kept: 'yes' }, sibling: 7 })
    expect('dropped' in (result.outer as Record<string, unknown>)).toBe(false)
  })

  it('cleans object items inside arrays', async () => {
    const { removeUndefined } = await import('../src/lib/firebase/firestoreUtils')
    const result = removeUndefined({
      items: [{ a: 1, b: undefined }, { a: 2, c: 'ok' }],
    })
    expect(result.items).toEqual([{ a: 1 }, { a: 2, c: 'ok' }])
  })

  it('preserves Date values as-is', async () => {
    const { removeUndefined } = await import('../src/lib/firebase/firestoreUtils')
    const now = new Date('2026-05-02T12:00:00Z')
    const result = removeUndefined({ when: now, missing: undefined })
    expect(result.when).toBe(now)
  })

  it('preserves Firestore Timestamp-like values (toDate method)', async () => {
    const { removeUndefined } = await import('../src/lib/firebase/firestoreUtils')
    const fakeTimestamp = { toDate: () => new Date(), seconds: 100, nanoseconds: 0 }
    const result = removeUndefined({ ts: fakeTimestamp, dropped: undefined })
    expect(result.ts).toBe(fakeTimestamp)
  })

  it('keeps null, false, 0, and empty string (only undefined is stripped)', async () => {
    const { removeUndefined } = await import('../src/lib/firebase/firestoreUtils')
    const result = removeUndefined({ a: null, b: false, c: 0, d: '', e: undefined })
    expect(result).toEqual({ a: null, b: false, c: 0, d: '' })
    expect('e' in result).toBe(false)
  })
})

describe('updateExercise() — videoWebpUrl=undefined regression', () => {
  it('does NOT pass the videoWebpUrl key to updateDoc when value is undefined', async () => {
    const { updateExercise } = await import('../src/lib/firebase/exercises')

    await updateExercise('exercise-id-1', {
      primaryMuscle: 'biceps' as never,
      videoWebpUrl: undefined,
    })

    expect(updateDocMock).toHaveBeenCalledTimes(1)
    const [, payload] = updateDocMock.mock.calls[0]
    expect(payload).not.toHaveProperty('videoWebpUrl')
    expect(payload).toMatchObject({ primaryMuscle: 'biceps' })
  })

  it('passes a real videoWebpUrl through unchanged', async () => {
    const { updateExercise } = await import('../src/lib/firebase/exercises')

    await updateExercise('exercise-id-2', {
      videoWebpUrl: 'https://example.com/anim.webp',
    })

    const [, payload] = updateDocMock.mock.calls[0]
    expect(payload).toMatchObject({ videoWebpUrl: 'https://example.com/anim.webp' })
  })

  it('strips every undefined optional field, not just videoWebpUrl', async () => {
    const { updateExercise } = await import('../src/lib/firebase/exercises')

    await updateExercise('exercise-id-3', {
      reportType: undefined,
      complexity: undefined,
      videoWebpUrl: undefined,
      primaryMuscle: 'chest' as never,
    })

    const [, payload] = updateDocMock.mock.calls[0]
    expect(payload).not.toHaveProperty('reportType')
    expect(payload).not.toHaveProperty('complexity')
    expect(payload).not.toHaveProperty('videoWebpUrl')
    expect(payload).toMatchObject({ primaryMuscle: 'chest' })
  })
})

describe('createExercise() — undefined fields are stripped', () => {
  it('does NOT pass undefined fields to addDoc', async () => {
    const { createExercise } = await import('../src/lib/firebase/exercises')

    await createExercise({
      name: 'Bench Press',
      nameHe: 'לחיצת חזה',
      category: 'chest' as never,
      primaryMuscle: 'pectoralis_major' as never,
      secondaryMuscles: [],
      equipment: 'barbell' as never,
      difficulty: 'intermediate',
      instructions: ['lift'],
      instructionsHe: ['הרם'],
      targetMuscles: [],
      imageUrl: '',
      tips: [],
      tipsHe: [],
      videoWebpUrl: undefined,
    } as never)

    expect(addDocMock).toHaveBeenCalledTimes(1)
    const [, payload] = addDocMock.mock.calls[0]
    expect(payload).not.toHaveProperty('videoWebpUrl')
    expect(payload).toMatchObject({ name: 'Bench Press', nameHe: 'לחיצת חזה' })
  })
})
