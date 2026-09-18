/**
 * Behavioral tests for the exercise-draft Cloud Functions.
 *
 * Same pattern as machine-lens/identifyMachine.spec.ts: firebase-admin is
 * replaced with an in-memory Firestore (the REAL rate-limiter logic runs
 * against it) and the LLM step is injected via deps.callLLM — OpenAI is
 * NEVER called.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

// In-memory Firestore backing the mocked firebase-admin
const store = new Map<string, any>()
let autoId = 0

vi.mock('firebase-admin', () => {
  const makeDoc = (col: string, id: string) => {
    const key = `${col}/${id}`
    return {
      id,
      async get() {
        if (store.has('__failReads') || store.has(`__failReads:${col}`)) {
          throw new Error('simulated firestore outage')
        }
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
  }
  const firestore: any = () => ({
    collection: (col: string) => ({
      doc: (id?: string) => makeDoc(col, id ?? `auto_${++autoId}`),
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

import { handleGenerateExerciseDraft } from './generateExerciseDraft'
import { handleMarkDraftSaved } from './markDraftSaved'
import type { LiveCatalogs } from './types'

const catalogs: LiveCatalogs = {
  muscleIds: new Set(['chest', 'legs', 'back', 'triceps']),
  subMuscleIds: new Set(['mid_chest', 'upper_chest', 'quads', 'lats']),
  equipmentActiveIds: new Set(['dumbbell', 'machine', 'bodyweight']),
  reportTypeActiveIds: new Set(['weight_reps', 'reps_only']),
  gymEquipmentNotes: 'הפולי במכון הוא דגם כפול',
}

const exercisesCatalog = [
  { id: 'ex1', name: 'Dumbbell Bench Press', nameHe: 'לחיצת חזה עם משקולות', category: 'chest', equipment: 'dumbbell' },
  { id: 'ex2', name: 'Incline Dumbbell Bench Press', nameHe: 'לחיצת חזה עליון', category: 'chest', equipment: 'dumbbell' },
  { id: 'ex3', name: 'Leg Press', nameHe: 'לחיצת רגליים', category: 'legs', equipment: 'machine' },
]

const validDraft = {
  name: 'Dumbbell Bench Press',
  nameHe: 'לחיצת חזה עם משקולות',
  category: 'chest',
  primaryMuscle: 'mid_chest',
  secondaryMuscles: ['triceps'],
  secondaryMuscleCredits: ['triceps'],
  equipment: 'dumbbell',
  difficulty: 'beginner',
  complexity: 'compound',
  reportType: 'weight_reps',
  assistanceTypes: [],
  availableBands: [],
  instructions: ['Lie on a flat bench', 'Press the dumbbells up', 'Lower under control'],
  instructionsHe: ['שכב על ספסל ישר', 'לחץ את המשקולות מעלה', 'הורד בשליטה'],
  tips: ['Keep wrists stacked'],
  tipsHe: ['שמור על שורש כף יד יציב'],
  targetMuscles: ['chest'],
}

const validPoseSpec = {
  bodyPosition: 'lying supine on a flat bench',
  cameraAngle: 'three-quarter view from the feet side, slightly elevated',
  equipmentPlacement: 'two dumbbells, neutral-to-pronated grip',
  endPose: 'arms fully extended above the chest',
  startPose: 'elbows bent to about 90 degrees',
  muscleOverlay: 'chest (mid pectorals), triceps',
  panelLayout: 'horizontal, RTL',
}

const modelJson = JSON.stringify({ draft: validDraft, poseSpec: validPoseSpec })

const deps = () => ({
  callLLM: vi.fn(async () => modelJson),
  loadCatalogs: vi.fn(async () => catalogs),
  loadExercises: vi.fn(async () => exercisesCatalog),
})

const adminAuth = { auth: { uid: 'admin1' }, data: { name: 'Dumbbell Bench Press' } }

const photoInput = {
  storagePath: 'machine-photos/abc.jpg',
  labelText: 'Hammer Strength Chest Press',
  machineType: 'chest press machine',
  equipmentId: 'machine',
  confidence: 0.92,
}

beforeEach(() => {
  store.clear()
  autoId = 0
  store.set('users/admin1', { role: 'admin' })
  store.set('users/user1', { role: 'user' })
})

describe('generateExerciseDraft', () => {
  it('happy path: writes a draft_ready document with draft + poseSpec + similar and returns its id', async () => {
    const d = deps()
    const { draftId } = await handleGenerateExerciseDraft(adminAuth, d)
    expect(draftId).toBeTruthy()
    const doc = store.get(`exerciseDrafts/${draftId}`)
    expect(doc.status).toBe('draft_ready')
    expect(doc.createdBy).toBe('admin1')
    expect(doc.input).toEqual({ name: 'Dumbbell Bench Press' })
    expect(doc.draft).toMatchObject({ name: 'Dumbbell Bench Press', category: 'chest' })
    // draft carries plain string arrays, never url fields
    expect(Array.isArray(doc.draft.instructions)).toBe(true)
    expect(typeof doc.draft.instructions[0]).toBe('string')
    expect(doc.draft).not.toHaveProperty('imageUrl')
    expect(doc.draft).not.toHaveProperty('videoWebpUrl')
    expect(doc.poseSpec).toEqual(validPoseSpec)
    expect(doc.similar.length).toBeGreaterThan(0)
    expect(doc.similar.length).toBeLessThanOrEqual(3)
    expect(doc.similar[0]).toMatchObject({ id: 'ex1', name: 'Dumbbell Bench Press' })
    expect(doc.similar[0].score).toBeGreaterThan(0)
  })

  it('invalid model JSON: marks the document failed with an error and still returns draftId (no throw)', async () => {
    const d = { ...deps(), callLLM: vi.fn(async () => 'not json at all') }
    const { draftId } = await handleGenerateExerciseDraft(adminAuth, d)
    const doc = store.get(`exerciseDrafts/${draftId}`)
    expect(doc.status).toBe('failed')
    expect(doc.error).toContain('JSON')
  })

  it('controlled-value violation (unknown equipment): failed, not draft_ready', async () => {
    const bad = JSON.stringify({
      draft: { ...validDraft, equipment: 'barbell' }, // not in active equipment
      poseSpec: validPoseSpec,
    })
    const d = { ...deps(), callLLM: vi.fn(async () => bad) }
    const { draftId } = await handleGenerateExerciseDraft(adminAuth, d)
    const doc = store.get(`exerciseDrafts/${draftId}`)
    expect(doc.status).toBe('failed')
    expect(doc.error).toContain('barbell')
  })

  it('non-admin caller is rejected with permission-denied before any work', async () => {
    const d = deps()
    await expect(
      handleGenerateExerciseDraft({ auth: { uid: 'user1' }, data: { name: 'X' } }, d)
    ).rejects.toMatchObject({ code: 'permission-denied' })
    expect(d.callLLM).not.toHaveBeenCalled()
  })

  it('rejects when neither name nor photo is provided', async () => {
    await expect(
      handleGenerateExerciseDraft({ auth: { uid: 'admin1' }, data: {} }, deps())
    ).rejects.toMatchObject({ code: 'invalid-argument' })
  })

  it('rate-limits: the 31st call in a day is rejected (resource-exhausted)', async () => {
    const d = deps()
    for (let i = 0; i < 30; i++) {
      await handleGenerateExerciseDraft(adminAuth, d)
    }
    await expect(handleGenerateExerciseDraft(adminAuth, d)).rejects.toMatchObject({
      code: 'resource-exhausted',
    })
    expect(d.callLLM).toHaveBeenCalledTimes(30)
    const today = new Date().toISOString().split('T')[0]
    expect(store.get(`aiDraftUsage/admin1_${today}`)?.generationsCount).toBe(30)
  })

  it('fails closed when the quota check cannot read Firestore (admin read OK) — unavailable, LLM never called', async () => {
    // Targeted outage: only the aiDraftUsage collection fails to read, so the
    // admin gate passes and the failure is attributable to the quota check.
    store.set('__failReads:aiDraftUsage', true)
    const d = deps()
    await expect(handleGenerateExerciseDraft(adminAuth, d)).rejects.toMatchObject({
      code: 'unavailable',
    })
    expect(d.callLLM).not.toHaveBeenCalled()
  })

  it('with photo: the system prompt sent to the model contains labelText, machineType and equipmentId', async () => {
    const d = deps()
    const { draftId } = await handleGenerateExerciseDraft(
      { auth: { uid: 'admin1' }, data: { photo: photoInput } },
      d
    )
    expect(d.callLLM).toHaveBeenCalledTimes(1)
    const [systemPrompt] = d.callLLM.mock.calls[0]
    expect(systemPrompt).toContain('Hammer Strength Chest Press')
    expect(systemPrompt).toContain('chest press machine')
    expect(systemPrompt).toContain('equipment id machine')
    expect(systemPrompt).toContain('equipmentPlacement must match')
    // gym equipment notes are injected too
    expect(systemPrompt).toContain('הפולי במכון הוא דגם כפול')
    const doc = store.get(`exerciseDrafts/${draftId}`)
    expect(doc.input.photo).toEqual(photoInput)
    expect(doc.status).toBe('draft_ready')
  })

  it('rejects a photo missing required fields', async () => {
    await expect(
      handleGenerateExerciseDraft(
        { auth: { uid: 'admin1' }, data: { photo: { labelText: 'x' } } },
        deps()
      )
    ).rejects.toMatchObject({ code: 'invalid-argument' })
  })

  it('missing poseSpec in the model output marks the draft failed', async () => {
    const d = { ...deps(), callLLM: vi.fn(async () => JSON.stringify({ draft: validDraft })) }
    const { draftId } = await handleGenerateExerciseDraft(adminAuth, d)
    expect(store.get(`exerciseDrafts/${draftId}`).status).toBe('failed')
  })
})

describe('markDraftSaved', () => {
  it('marks an existing draft as saved with the exerciseId', async () => {
    store.set('exerciseDrafts/d1', { status: 'draft_ready', createdBy: 'admin1' })
    const res = await handleMarkDraftSaved({
      auth: { uid: 'admin1' },
      data: { draftId: 'd1', exerciseId: 'new_ex' },
    })
    expect(res).toEqual({ ok: true })
    const doc = store.get('exerciseDrafts/d1')
    expect(doc.status).toBe('saved')
    expect(doc.exerciseId).toBe('new_ex')
  })

  it('missing draft yields not-found', async () => {
    await expect(
      handleMarkDraftSaved({ auth: { uid: 'admin1' }, data: { draftId: 'nope', exerciseId: 'e' } })
    ).rejects.toMatchObject({ code: 'not-found' })
  })

  it('non-admin is rejected', async () => {
    store.set('exerciseDrafts/d1', { status: 'draft_ready' })
    await expect(
      handleMarkDraftSaved({ auth: { uid: 'user1' }, data: { draftId: 'd1', exerciseId: 'e' } })
    ).rejects.toMatchObject({ code: 'permission-denied' })
  })
})
