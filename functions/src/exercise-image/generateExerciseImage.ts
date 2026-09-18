/**
 * Generate Exercise Image - Cloud Function (admin add-exercise flow, part 2)
 *
 * Takes an exerciseDrafts/{draftId} document in status 'draft_ready' (or
 * 'image_ready' for regeneration), generates the END pose image with the
 * OpenAI Images API, derives the START pose via images.edit on the END png,
 * composes both panels into a single RTL webp (start on the right, end on the
 * left, arrow pointing left), uploads everything to Storage with the Admin
 * SDK, and updates the draft to 'image_ready' with the image URLs and cost.
 *
 * Download URL mechanism: Firebase download-token URLs — we set a
 * firebaseStorageDownloadTokens UUID in the file metadata at upload time and
 * build the canonical firebasestorage.googleapis.com URL from it. Chosen over
 * signed URLs because it needs no IAM signBlob permission, never expires, and
 * is exactly what the client SDK's getDownloadURL would return.
 */

import * as crypto from 'crypto'
import * as admin from 'firebase-admin'
import * as functions from 'firebase-functions'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { Timestamp } from 'firebase-admin/firestore'
import { checkRateLimit, incrementUsage } from '../ai-trainer/rateLimiter'
import { STYLE_PROMPT_MD } from '../generated/promptSources.generated'
import { composePanels, type ComposeResult } from './composePanels'

// Daily limit per admin user, tracked in aiImageUsage/{uid}_{YYYY-MM-DD}
const EXERCISE_IMAGE_RATE_LIMIT = {
  collection: 'aiImageUsage',
  dailyLimit: 20,
  // Fail closed: a broken quota check must not let requests through to OpenAI.
  failMode: 'closed' as const,
}

const IMAGE_MODEL = 'gpt-image-2.5-sunburst'
const IMAGE_SIZE = '1024x1024'

// Per-image cost estimates (USD) used when the API returns no usage object.
// Based on published gpt-image pricing for 1024x1024: medium ~$0.04, high ~$0.17.
const ESTIMATE_MEDIUM_USD = 0.04
const ESTIMATE_HIGH_USD = 0.17
// Token pricing (USD per 1M tokens) when usage IS returned: text/image input, image output.
const INPUT_TOKEN_USD_PER_M = 10
const OUTPUT_TOKEN_USD_PER_M = 40

export interface GenerateExerciseImageRequest {
  draftId: string
  // Explicit opt-in to regenerate when the draft already has an image.
  regenerate?: boolean
}

interface PoseSpec {
  bodyPosition?: string
  cameraAngle?: string
  equipmentPlacement?: string
  endPose?: string
  startPose?: string
  muscleOverlay?: string
  panelLayout?: string
}

interface ImageCallResult {
  png: Buffer
  usage?: { input_tokens?: number; output_tokens?: number } | null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** English exercise name -> kebab-case slug for Storage paths. */
export function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function buildEndPrompt(draftName: string, pose: PoseSpec): string {
  return (
    STYLE_PROMPT_MD +
    '\n\n' +
    `${draftName}. ${pose.bodyPosition}. ${pose.equipmentPlacement}. ` +
    `Camera: ${pose.cameraAngle}. Pose: ${pose.endPose}. ` +
    `Muscle overlay on: ${pose.muscleOverlay}. No text.`
  )
}

export function buildStartPrompt(draftName: string, pose: PoseSpec): string {
  return (
    `Change ONLY the limb and equipment position to the START position of ${draftName}: ${pose.startPose}. ` +
    `Keep everything else exactly as in the input image: the same figure, face, body proportions, ` +
    `muscle overlay on ${pose.muscleOverlay}, camera angle, equipment, lighting, colors and plain white background. ` +
    `Do not add or remove any object. No text.`
  )
}

/** Cost from usage tokens when available, otherwise a per-image estimate. */
export function computeCostUsd(
  endUsage: ImageCallResult['usage'],
  startUsage: ImageCallResult['usage']
): { costUsd: number; estimated: boolean } {
  const usageCost = (u: ImageCallResult['usage']): number | null => {
    if (!u || (typeof u.input_tokens !== 'number' && typeof u.output_tokens !== 'number')) return null
    return ((u.input_tokens ?? 0) * INPUT_TOKEN_USD_PER_M + (u.output_tokens ?? 0) * OUTPUT_TOKEN_USD_PER_M) / 1_000_000
  }
  const endCost = usageCost(endUsage)
  const startCost = usageCost(startUsage)
  const estimated = endCost === null || startCost === null
  const total = (endCost ?? ESTIMATE_MEDIUM_USD) + (startCost ?? ESTIMATE_HIGH_USD)
  return { costUsd: Math.round(total * 10000) / 10000, estimated }
}

// ---------------------------------------------------------------------------
// OpenAI calls — lazy client, same pattern as machine-lens/identifyMachine.ts
// ---------------------------------------------------------------------------

let openaiClient: any = null

async function getClient(): Promise<any> {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) throw new Error('OPENAI_API_KEY not configured')
    const { default: OpenAI } = await import('openai')
    openaiClient = new OpenAI({ apiKey })
  }
  return openaiClient
}

async function generateEndImage(prompt: string): Promise<ImageCallResult> {
  const client = await getClient()
  const res = await client.images.generate({
    model: IMAGE_MODEL,
    prompt,
    quality: 'medium',
    size: IMAGE_SIZE,
    output_format: 'png',
  })
  const b64 = res.data?.[0]?.b64_json
  if (!b64) throw new Error('OpenAI images.generate returned no b64_json')
  return { png: Buffer.from(b64, 'base64'), usage: res.usage ?? null }
}

async function editStartImage(endPng: Buffer, prompt: string): Promise<ImageCallResult> {
  const client = await getClient()
  const { toFile } = await import('openai')
  const file = await toFile(endPng, 'end.png', { type: 'image/png' })
  const res = await client.images.edit({
    model: IMAGE_MODEL,
    image: file,
    prompt,
    quality: 'high',
    size: IMAGE_SIZE,
    output_format: 'png',
  })
  const b64 = res.data?.[0]?.b64_json
  if (!b64) throw new Error('OpenAI images.edit returned no b64_json')
  return { png: Buffer.from(b64, 'base64'), usage: res.usage ?? null }
}

// ---------------------------------------------------------------------------
// Storage upload (Admin SDK only) — returns a download-token URL
// ---------------------------------------------------------------------------

async function uploadToStorage(path: string, buffer: Buffer, contentType: string): Promise<string> {
  const bucket = admin.storage().bucket()
  const token = crypto.randomUUID()
  const file = bucket.file(path)
  await file.save(buffer, {
    contentType,
    metadata: { metadata: { firebaseStorageDownloadTokens: token } },
  })
  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(path)}?alt=media&token=${token}`
}

// ---------------------------------------------------------------------------
// Handler (exported for behavioral testing — deps injectable, no real OpenAI/Storage)
// ---------------------------------------------------------------------------

export interface GenerateExerciseImageDeps {
  generateEnd?: (prompt: string) => Promise<ImageCallResult>
  editStart?: (endPng: Buffer, prompt: string) => Promise<ImageCallResult>
  compose?: (endPng: Buffer, startPng: Buffer) => Promise<ComposeResult>
  upload?: (path: string, buffer: Buffer, contentType: string) => Promise<string>
}

export interface GenerateExerciseImageResponse {
  ok: boolean
  error?: string
  // Present when an image_ready draft is returned idempotently (no regenerate).
  image?: unknown
}

export async function handleGenerateExerciseImage(
  request: { auth?: { uid: string } | null; data: unknown },
  deps: GenerateExerciseImageDeps = {}
): Promise<GenerateExerciseImageResponse> {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'יש להתחבר כדי לייצר תמונת תרגיל')
  }
  const userId = request.auth.uid
  const db = admin.firestore()

  // Admin only — same role check as updateUserEmail/approveTrainerRequest.
  const callerDoc = await db.collection('users').doc(userId).get()
  if (!callerDoc.exists || callerDoc.data()?.role !== 'admin') {
    throw new HttpsError('permission-denied', 'רק אדמין יכול לייצר תמונות תרגיל')
  }

  const data = request.data as Partial<GenerateExerciseImageRequest> | null | undefined
  if (!data || typeof data.draftId !== 'string' || data.draftId.trim() === '') {
    throw new HttpsError('invalid-argument', 'draftId must be a non-empty string')
  }
  const draftId = data.draftId

  // Quota — fail closed: no OpenAI call when the quota check itself fails.
  let rateLimitResult
  try {
    rateLimitResult = await checkRateLimit(userId, EXERCISE_IMAGE_RATE_LIMIT)
  } catch (error: any) {
    functions.logger.error('Exercise Image: quota check failed — refusing request', {
      userId,
      error: error.message,
    })
    throw new HttpsError('unavailable', 'בדיקת המכסה נכשלה, נסה שוב')
  }
  if (!rateLimitResult.allowed) {
    functions.logger.warn('Exercise Image: rate limit exceeded', { userId })
    throw new HttpsError('resource-exhausted', 'הגעת למגבלה היומית של יצירת תמונות. נסה שוב מחר.')
  }

  // Load + claim the draft in a transaction so concurrent calls can't both
  // start a generation (the client double-fired 4 identical calls on 18/09).
  const draftRef = db.collection('exerciseDrafts').doc(draftId)
  const regenerate = data.regenerate === true
  const imageJobId = crypto.randomUUID()
  const STALE_PENDING_MS = 10 * 60 * 1000

  let draft: any
  let existingImage: any = null
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(draftRef)
    if (!snap.exists) {
      throw new HttpsError('not-found', `Draft ${draftId} not found`)
    }
    draft = snap.data() as any

    if (draft.status === 'image_pending') {
      const pendingMs = draft.imagePendingAt?.toMillis?.() ?? 0
      const stale = Date.now() - pendingMs > STALE_PENDING_MS
      if (!stale) {
        throw new HttpsError('already-exists', 'יצירת תמונה כבר רצה')
      }
      functions.logger.warn('Exercise Image: stale image_pending — restarting', {
        draftId,
        pendingMs,
      })
    } else if (draft.status === 'image_ready' && !regenerate) {
      // Idempotent success: return the existing image without touching OpenAI.
      existingImage = draft.image ?? null
      return
    } else if (draft.status !== 'draft_ready' && draft.status !== 'image_ready') {
      throw new HttpsError(
        'failed-precondition',
        `Draft status must be draft_ready or image_ready, got '${draft.status}'`
      )
    }

    tx.update(draftRef, {
      status: 'image_pending',
      imageJobId,
      imagePendingAt: Timestamp.now(),
    })
  })
  if (existingImage !== null || (draft.status === 'image_ready' && !regenerate)) {
    functions.logger.info('Exercise Image: returning existing image (idempotent)', { draftId })
    return { ok: true, image: existingImage }
  }

  const name: string = draft.draft?.name
  const pose: PoseSpec = draft.poseSpec || {}
  if (!name) {
    throw new HttpsError('failed-precondition', 'Draft has no draft.name')
  }
  const slug = slugify(name)

  // Only the call that holds imageJobId may finalize the draft.
  const finalizeIfOwner = async (payload: Record<string, unknown>): Promise<boolean> => {
    let owned = false
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(draftRef)
      if (snap.data()?.imageJobId !== imageJobId) {
        functions.logger.warn('Exercise Image: job superseded — skipping finalize', { draftId })
        return
      }
      owned = true
      tx.update(draftRef, payload)
    })
    return owned
  }

  const markFailed = async (error: string) => {
    try {
      await finalizeIfOwner({ status: 'failed', error })
    } catch (e: any) {
      functions.logger.error('Exercise Image: failed to mark draft as failed', {
        draftId,
        error: e.message,
      })
    }
  }

  try {
    // 1. END pose (canonical image)
    const end = await (deps.generateEnd ?? generateEndImage)(buildEndPrompt(name, pose))

    // 2. START pose — edit of the END png
    const start = await (deps.editStart ?? editStartImage)(end.png, buildStartPrompt(name, pose))

    await incrementUsage(userId, EXERCISE_IMAGE_RATE_LIMIT)

    // 3. Compose the RTL panel (start right, end left)
    const composed = await (deps.compose ?? composePanels)(end.png, start.png)
    if (!composed.ok) {
      // Oversize is a soft failure per contract: mark failed, return without throwing.
      functions.logger.error('Exercise Image: compose exceeded size limit', {
        draftId,
        error: composed.error,
      })
      await markFailed(composed.error)
      return { ok: false, error: composed.error }
    }

    // 4. Upload — work PNGs + final webp
    const upload = deps.upload ?? uploadToStorage
    const endUrl = await upload(`exercise-images/work/${slug}/end.png`, end.png, 'image/png')
    const startUrl = await upload(`exercise-images/work/${slug}/start.png`, start.png, 'image/png')
    const url = await upload(`exercise-images/${slug}.webp`, composed.buffer, 'image/webp')

    // 5. Finalize draft — only if this call still owns the job.
    const { costUsd, estimated } = computeCostUsd(end.usage, start.usage)
    await finalizeIfOwner({
      status: 'image_ready',
      image: {
        url,
        endUrl,
        startUrl,
        bytes: composed.bytes,
        costUsd,
        ...(estimated ? { costNote: 'estimated — no usage returned by the API' } : {}),
      },
    })

    functions.logger.info('Exercise Image: done', { draftId, slug, bytes: composed.bytes, costUsd })
    return { ok: true }
  } catch (error: any) {
    functions.logger.error('Exercise Image: generation failed', {
      draftId,
      userId,
      error: error.message,
    })
    await markFailed(error.message || 'unknown error')
    throw new HttpsError('internal', 'יצירת התמונה נכשלה')
  }
}

export const generateExerciseImage = onCall(
  {
    secrets: ['OPENAI_API_KEY'],
    timeoutSeconds: 300,
    memory: '1GiB',
  },
  (request): Promise<GenerateExerciseImageResponse> =>
    handleGenerateExerciseImage(request as { auth?: { uid: string } | null; data: unknown })
)
