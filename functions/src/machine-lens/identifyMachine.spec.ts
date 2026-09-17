/**
 * Behavioral tests for the Machine Lens Cloud Function (identifyMachine).
 *
 * Run with the functions alias config (firebase-functions / v2/https aliased to
 * the local fixtures, same as tests/functions/*). OpenAI is NEVER called: the
 * vision step is injected via deps.callVision. firebase-admin is replaced with
 * an in-memory Firestore so the REAL rate-limiter logic runs against it.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

// In-memory Firestore backing the mocked firebase-admin
const store = new Map<string, any>()

vi.mock('firebase-admin', () => {
  const firestore: any = () => ({
    collection: (col: string) => ({
      doc: (id: string) => {
        const key = `${col}/${id}`
        return {
          id,
          async get() {
            return { exists: store.has(key), data: () => store.get(key) }
          },
          async set(data: any, _opts?: any) {
            const prev = store.get(key) || {}
            const next: any = { ...prev }
            for (const [k, v] of Object.entries(data)) {
              next[k] = v && typeof v === 'object' && '__inc' in (v as any)
                ? (prev[k] || 0) + (v as any).__inc
                : v
            }
            store.set(key, next)
          },
        }
      },
      async get() {
        const prefix = `${col}/`
        const docs = [...store.entries()]
          .filter(([k]) => k.startsWith(prefix))
          .map(([k, v]) => ({ id: k.slice(prefix.length), data: () => v }))
        return { empty: docs.length === 0, docs }
      },
    }),
  })
  firestore.FieldValue = {
    increment: (n: number) => ({ __inc: n }),
    serverTimestamp: () => 'ts',
  }
  return { firestore, default: { firestore } }
})

import { handleIdentifyMachine, parseVisionResponse, matchCandidates } from './identifyMachine'

const validImage = { imageBase64: 'aGVsbG8=', mimeType: 'image/jpeg' as const }
const authed = { auth: { uid: 'user1' }, data: validImage }

const visionJson = JSON.stringify({
  labelText: 'Hammer Strength Chest Press',
  machineType: 'chest press machine',
  equipmentId: 'machine',
  candidateExerciseNames: ['Chest Press', 'Incline Chest Press', 'Machine Fly'],
  confidence: 0.92,
})

const catalog = [
  { id: 'ex1', name: 'Chest Press', nameHe: 'לחיצת חזה במכונה', category: 'chest', equipment: 'machine', imageUrl: 'u1' },
  { id: 'ex2', name: 'Incline Chest Press', nameHe: 'לחיצת חזה עליון', category: 'chest', equipment: 'machine', imageUrl: 'u2' },
  { id: 'ex3', name: 'Leg Press', nameHe: 'לחיצת רגליים', category: 'legs', equipment: 'machine', imageUrl: 'u3' },
]

const deps = () => ({
  callVision: vi.fn(async () => visionJson),
  loadCatalog: vi.fn(async () => catalog),
})

beforeEach(() => {
  store.clear()
})

describe('identifyMachine', () => {
  it('rejects unauthenticated calls', async () => {
    await expect(handleIdentifyMachine({ auth: null, data: validImage }, deps()))
      .rejects.toMatchObject({ code: 'unauthenticated' })
  })

  it('parses a valid model response and returns matches with imageUrl', async () => {
    const d = deps()
    const res = await handleIdentifyMachine(authed, d)
    expect(d.callVision).toHaveBeenCalledTimes(1)
    expect(res.labelText).toBe('Hammer Strength Chest Press')
    expect(res.machineType).toBe('chest press machine')
    expect(res.equipmentId).toBe('machine')
    expect(res.confidence).toBe(0.92)
    expect(res.matches.length).toBeGreaterThan(0)
    expect(res.matches.length).toBeLessThanOrEqual(3)
    expect(res.matches[0]).toMatchObject({ id: 'ex1', name: 'Chest Press', nameHe: 'לחיצת חזה במכונה', imageUrl: 'u1' })
    expect(res.matches[0].score).toBeGreaterThan(0)
    expect(res.matches[0].reasons.length).toBeGreaterThan(0)
  })

  it('rejects unparsable model JSON with a clear internal error', async () => {
    const d = { ...deps(), callVision: vi.fn(async () => 'not json at all') }
    await expect(handleIdentifyMachine(authed, d)).rejects.toMatchObject({ code: 'internal' })
  })

  it('rejects imageBase64 longer than 2,097,152 chars (invalid-argument)', async () => {
    const big = { imageBase64: 'a'.repeat(2_097_153), mimeType: 'image/jpeg' as const }
    const d = deps()
    await expect(handleIdentifyMachine({ auth: { uid: 'user1' }, data: big }, d))
      .rejects.toMatchObject({ code: 'invalid-argument' })
    expect(d.callVision).not.toHaveBeenCalled()
  })

  it('rejects an invalid mimeType (invalid-argument)', async () => {
    await expect(
      handleIdentifyMachine({ auth: { uid: 'user1' }, data: { imageBase64: 'aGVsbG8=', mimeType: 'image/png' } }, deps())
    ).rejects.toMatchObject({ code: 'invalid-argument' })
  })

  it('rate-limits: the 21st call in a day is rejected (resource-exhausted)', async () => {
    const d = deps()
    for (let i = 0; i < 20; i++) {
      await handleIdentifyMachine(authed, d)
    }
    await expect(handleIdentifyMachine(authed, d)).rejects.toMatchObject({ code: 'resource-exhausted' })
    expect(d.callVision).toHaveBeenCalledTimes(20)
    // Usage document lives in machineLensUsage/{uid}_{YYYY-MM-DD}
    const today = new Date().toISOString().split('T')[0]
    expect(store.get(`machineLensUsage/user1_${today}`)?.generationsCount).toBe(20)
  })

  it('rate limit is per user: another user is not blocked', async () => {
    const d = deps()
    for (let i = 0; i < 20; i++) await handleIdentifyMachine(authed, d)
    const res = await handleIdentifyMachine({ auth: { uid: 'user2' }, data: validImage }, d)
    expect(res.machineType).toBe('chest press machine')
  })
})

describe('matchCandidates — merge & dedupe', () => {
  it('two candidates matching the same exercise appear once, with the max score', () => {
    const vision = parseVisionResponse(JSON.stringify({
      labelText: '',
      machineType: 'chest press machine',
      equipmentId: 'machine',
      // Both overlap with 'Chest Press' (ex1); the exact name yields the higher score
      candidateExerciseNames: ['Chest Press', 'Seated Chest Press'],
      confidence: 0.8,
    }))
    const exactOnly = matchCandidates(
      { ...vision, candidateExerciseNames: ['Chest Press'] },
      catalog as any
    )
    const merged = matchCandidates(vision, catalog as any)
    const ex1 = merged.filter(m => m.id === 'ex1')
    expect(ex1).toHaveLength(1)
    expect(ex1[0].score).toBe(Math.max(exactOnly.find(m => m.id === 'ex1')!.score, ex1[0].score))
    // limited to 3
    expect(merged.length).toBeLessThanOrEqual(3)
  })

  it('parseVisionResponse normalizes an unknown equipmentId to empty (loudly)', () => {
    const vision = parseVisionResponse(JSON.stringify({
      labelText: '', machineType: 'x', equipmentId: 'spaceship',
      candidateExerciseNames: ['Chest Press'], confidence: 2,
    }))
    expect(vision.equipmentId).toBe('')
    expect(vision.confidence).toBe(1) // clamped
  })
})
