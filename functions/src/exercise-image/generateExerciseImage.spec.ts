/**
 * Behavioral tests for the generateExerciseImage Cloud Function.
 *
 * Same harness as machine-lens/identifyMachine.spec.ts: firebase-admin is
 * replaced with an in-memory Firestore (the REAL rate-limiter and handler
 * logic run against it), OpenAI and Storage are injected via deps — zero
 * real network calls. The compose test runs REAL sharp on synthetic PNGs.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import sharp from 'sharp'

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
            if (store.get('__failReadsFor') === col) throw new Error('simulated firestore outage')
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
          async update(data: any) {
            const prev = store.get(key)
            if (prev === undefined) throw new Error(`update on missing doc ${key}`)
            store.set(key, { ...prev, ...data })
          },
        }
      },
    }),
  })
  firestore.FieldValue = {
    increment: (n: number) => ({ __inc: n }),
    serverTimestamp: () => 'ts',
  }
  return { firestore, default: { firestore } }
})

import {
  handleGenerateExerciseImage,
  buildEndPrompt,
  slugify,
} from './generateExerciseImage'
import { composePanels, CANVAS_WIDTH, PANEL_SIZE } from './composePanels'

const DRAFT_ID = 'draft1'
const draftDoc = () => ({
  status: 'draft_ready',
  draft: { name: 'Dumbbell Bench Press' },
  poseSpec: {
    bodyPosition: 'lying supine on a flat bench',
    cameraAngle: 'three-quarter view from the feet side, slightly elevated',
    equipmentPlacement: 'two dumbbells, neutral-to-pronated grip',
    endPose: 'arms fully extended above the chest',
    startPose: 'elbows bent to about 90 degrees',
    muscleOverlay: 'chest (mid pectorals), triceps',
    panelLayout: 'horizontal, RTL',
  },
})

const tinyPng = () =>
  sharp({ create: { width: 4, height: 4, channels: 3, background: { r: 0, g: 128, b: 0 } } })
    .png()
    .toBuffer()

const deps = async () => {
  const png = await tinyPng()
  return {
    generateEnd: vi.fn(async () => ({ png, usage: { input_tokens: 100, output_tokens: 1000 } })),
    editStart: vi.fn(async () => ({ png, usage: { input_tokens: 200, output_tokens: 2000 } })),
    compose: vi.fn(async () => ({ ok: true as const, buffer: Buffer.from('webp'), bytes: 4, quality: 80 })),
    upload: vi.fn(async (path: string) => `https://dl.example/${path}`),
  }
}

const authedAdmin = { auth: { uid: 'admin1' }, data: { draftId: DRAFT_ID } }

beforeEach(() => {
  store.clear()
  store.set('users/admin1', { role: 'admin' })
  store.set('users/user1', { role: 'user' })
  store.set(`exerciseDrafts/${DRAFT_ID}`, draftDoc())
})

describe('generateExerciseImage', () => {
  it('(א) happy path: draft ends image_ready with url, endUrl, startUrl, bytes, costUsd', async () => {
    const d = await deps()
    const res = await handleGenerateExerciseImage(authedAdmin, d)
    expect(res).toEqual({ ok: true })

    const draft = store.get(`exerciseDrafts/${DRAFT_ID}`)
    expect(draft.status).toBe('image_ready')
    expect(draft.image.url).toBe('https://dl.example/exercise-images/dumbbell-bench-press.webp')
    expect(draft.image.endUrl).toBe('https://dl.example/exercise-images/work/dumbbell-bench-press/end.png')
    expect(draft.image.startUrl).toBe('https://dl.example/exercise-images/work/dumbbell-bench-press/start.png')
    expect(draft.image.bytes).toBe(4)
    // usage present on both calls -> exact token cost, no estimate note
    // (300 in * $10/M) + (3000 out * $40/M) = 0.003 + 0.12 = 0.123
    expect(draft.image.costUsd).toBeCloseTo(0.123, 4)
    expect(draft.image.costNote).toBeUndefined()

    // end prompt starts with the style prompt and contains the pose fields
    const endPrompt = d.generateEnd.mock.calls[0][0]
    expect(endPrompt).toBe(buildEndPrompt('Dumbbell Bench Press', draftDoc().poseSpec))
    expect(endPrompt).toContain('Muscle overlay on: chest (mid pectorals), triceps. No text.')
    // start edit receives the end png
    expect(d.editStart.mock.calls[0][1]).toContain('START position of Dumbbell Bench Press')
    // usage was recorded in aiImageUsage
    const today = new Date().toISOString().split('T')[0]
    expect(store.get(`aiImageUsage/admin1_${today}`)?.generationsCount).toBe(1)
  })

  it('(ב) draft in pending status -> failed-precondition, OpenAI never called', async () => {
    store.set(`exerciseDrafts/${DRAFT_ID}`, { ...draftDoc(), status: 'pending' })
    const d = await deps()
    await expect(handleGenerateExerciseImage(authedAdmin, d))
      .rejects.toMatchObject({ code: 'failed-precondition' })
    expect(d.generateEnd).not.toHaveBeenCalled()
    expect(store.get(`exerciseDrafts/${DRAFT_ID}`).status).toBe('pending')
  })

  it('regeneration: image_ready draft is accepted', async () => {
    store.set(`exerciseDrafts/${DRAFT_ID}`, { ...draftDoc(), status: 'image_ready' })
    const res = await handleGenerateExerciseImage(authedAdmin, await deps())
    expect(res).toEqual({ ok: true })
  })

  it('(ג) non-admin caller -> permission-denied, OpenAI never called', async () => {
    const d = await deps()
    await expect(
      handleGenerateExerciseImage({ auth: { uid: 'user1' }, data: { draftId: DRAFT_ID } }, d)
    ).rejects.toMatchObject({ code: 'permission-denied' })
    expect(d.generateEnd).not.toHaveBeenCalled()
  })

  it('unauthenticated -> unauthenticated', async () => {
    await expect(handleGenerateExerciseImage({ auth: null, data: { draftId: DRAFT_ID } }, await deps()))
      .rejects.toMatchObject({ code: 'unauthenticated' })
  })

  it('(ד) the 21st call in a day -> resource-exhausted', async () => {
    const d = await deps()
    for (let i = 0; i < 20; i++) {
      store.set(`exerciseDrafts/${DRAFT_ID}`, draftDoc()) // reset status each round
      await handleGenerateExerciseImage(authedAdmin, d)
    }
    store.set(`exerciseDrafts/${DRAFT_ID}`, draftDoc())
    await expect(handleGenerateExerciseImage(authedAdmin, d))
      .rejects.toMatchObject({ code: 'resource-exhausted' })
    expect(d.generateEnd).toHaveBeenCalledTimes(20)
  })

  it('fails closed when the quota check cannot read Firestore — OpenAI is never called', async () => {
    const d = await deps()
    store.set('__failReadsFor', 'aiImageUsage')
    await expect(handleGenerateExerciseImage(authedAdmin, d))
      .rejects.toMatchObject({ code: 'unavailable' })
    expect(d.generateEnd).not.toHaveBeenCalled()
  })

  it('(ו) oversize composed webp -> draft failed with error, returns ok:false without throwing', async () => {
    const d = await deps()
    d.compose = vi.fn(async () => ({ ok: false as const, error: 'too big' }))
    const res = await handleGenerateExerciseImage(authedAdmin, d)
    expect(res).toEqual({ ok: false, error: 'too big' })
    const draft = store.get(`exerciseDrafts/${DRAFT_ID}`)
    expect(draft.status).toBe('failed')
    expect(draft.error).toBe('too big')
    expect(d.upload).not.toHaveBeenCalled()
  })

  it('OpenAI failure -> draft failed + internal error', async () => {
    const d = await deps()
    d.generateEnd = vi.fn(async () => { throw new Error('openai down') })
    await expect(handleGenerateExerciseImage(authedAdmin, d))
      .rejects.toMatchObject({ code: 'internal' })
    const draft = store.get(`exerciseDrafts/${DRAFT_ID}`)
    expect(draft.status).toBe('failed')
    expect(draft.error).toBe('openai down')
  })

  it('slugify produces kebab-case', () => {
    expect(slugify('Dumbbell Bench Press')).toBe('dumbbell-bench-press')
    expect(slugify("Farmer's Walk (Heavy)")).toBe('farmer-s-walk-heavy')
  })
})

describe('(ה) composePanels — real sharp on synthetic panels', () => {
  it('composes 2080x1024 webp with START (blue) on the right and END (red) on the left', async () => {
    const square = (color: { r: number; g: number; b: number }) =>
      sharp({ create: { width: 1024, height: 1024, channels: 3, background: color } })
        .png()
        .toBuffer()
    const endPng = await square({ r: 255, g: 0, b: 0 }) // red = END
    const startPng = await square({ r: 0, g: 0, b: 255 }) // blue = START

    const result = await composePanels(endPng, startPng)
    expect(result.ok).toBe(true)
    if (!result.ok) return

    const meta = await sharp(result.buffer).metadata()
    expect(meta.format).toBe('webp')
    expect(meta.width).toBe(CANVAS_WIDTH) // 2080
    expect(meta.height).toBe(PANEL_SIZE) // 1024
    expect(result.bytes).toBe(result.buffer.length)
    expect(result.bytes).toBeLessThanOrEqual(250 * 1024)

    const pixelAt = async (left: number, top: number) => {
      const raw = await sharp(result.buffer)
        .extract({ left, top, width: 1, height: 1 })
        .raw()
        .toBuffer()
      return { r: raw[0], g: raw[1], b: raw[2] }
    }

    // Right panel (x > 1056) must match the FIRST image passed as start -> blue
    const right = await pixelAt(1600, 512)
    expect(right.b).toBeGreaterThan(200)
    expect(right.r).toBeLessThan(60)

    // Left panel must be the END image -> red
    const left = await pixelAt(400, 512)
    expect(left.r).toBeGreaterThan(200)
    expect(left.b).toBeLessThan(60)

    // Gap is white except the arrow
    const gapTop = await pixelAt(1024 + 16, 100)
    expect(gapTop.r).toBeGreaterThan(240)
    expect(gapTop.g).toBeGreaterThan(240)
    expect(gapTop.b).toBeGreaterThan(240)
    // Arrow center (near tip) is dark
    const arrow = await pixelAt(1024 + 12, 512)
    expect(arrow.r).toBeLessThan(80)
    expect(arrow.g).toBeLessThan(80)
    expect(arrow.b).toBeLessThan(80)
  })

  it('returns ok:false when maxBytes is tiny (injected size limit)', async () => {
    const square = sharp({ create: { width: 1024, height: 1024, channels: 3, background: { r: 10, g: 200, b: 10 } } })
    // Noise-free solid colors compress extremely well, so force failure with maxBytes=10
    const png = await square.png().toBuffer()
    const result = await composePanels(png, png, { maxBytes: 10 })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toContain('exceeds limit')
  })
})
