/**
 * Identify Machine - Cloud Function (Machine Lens)
 * Takes a photo of gym equipment, asks a vision model what it is,
 * then matches the model's exercise candidates against the live
 * `exercises` catalog with the shared pure similarity matcher.
 */

import * as admin from 'firebase-admin'
import * as functions from 'firebase-functions'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { checkRateLimit, incrementUsage } from '../ai-trainer/rateLimiter'
import {
  findSimilarExercises,
  type CatalogExercise,
  type SimilarMatch,
} from '../shared/similarExercises'
import { MACHINE_LENS_PROMPT } from './prompt'

// Daily limit per user, tracked in machineLensUsage/{uid}_{YYYY-MM-DD}
const MACHINE_LENS_RATE_LIMIT = { collection: 'machineLensUsage', dailyLimit: 20 }

// Max accepted base64 payload length (~1.5MB binary)
const MAX_BASE64_LENGTH = 2_097_152

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/webp'] as const
type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number]

const VALID_EQUIPMENT_IDS = [
  'bodyweight',
  'cable_machine',
  'dumbbell',
  'kettlebell',
  'machine',
  'puli',
  'resistance_band',
  'smit_machine',
] as const

export interface IdentifyMachineRequest {
  imageBase64: string
  mimeType: AllowedMimeType
}

export interface VisionResult {
  labelText: string
  machineType: string
  equipmentId: string
  candidateExerciseNames: string[]
  confidence: number
}

export interface MachineMatch {
  id: string
  name: string
  nameHe: string
  imageUrl: string
  score: number
  reasons: string[]
}

export interface IdentifyMachineResponse {
  labelText: string
  machineType: string
  equipmentId: string
  confidence: number
  matches: MachineMatch[]
}

interface CatalogEntry extends CatalogExercise {
  imageUrl: string
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export function validateRequest(data: unknown): IdentifyMachineRequest {
  const d = data as Partial<IdentifyMachineRequest> | null | undefined
  if (!d || typeof d !== 'object') {
    throw new HttpsError('invalid-argument', 'Missing request data')
  }
  if (typeof d.imageBase64 !== 'string' || d.imageBase64.length === 0) {
    throw new HttpsError('invalid-argument', 'imageBase64 must be a non-empty string')
  }
  if (d.imageBase64.length > MAX_BASE64_LENGTH) {
    throw new HttpsError(
      'invalid-argument',
      `Image too large: base64 length ${d.imageBase64.length} exceeds ${MAX_BASE64_LENGTH}`
    )
  }
  if (typeof d.mimeType !== 'string' || !ALLOWED_MIME_TYPES.includes(d.mimeType as AllowedMimeType)) {
    throw new HttpsError('invalid-argument', 'mimeType must be image/jpeg or image/webp')
  }
  return { imageBase64: d.imageBase64, mimeType: d.mimeType as AllowedMimeType }
}

// ---------------------------------------------------------------------------
// Vision call (OpenAI) — lazy client, same pattern as ai-trainer/openaiClient.ts
// ---------------------------------------------------------------------------

let openaiClient: any = null

async function getClient(): Promise<any> {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY not configured')
    }
    const { default: OpenAI } = await import('openai')
    openaiClient = new OpenAI({ apiKey })
  }
  return openaiClient
}

/** Calls the vision model, returns the raw text content (or null). */
export async function callVisionModel(request: IdentifyMachineRequest): Promise<string | null> {
  const client = await getClient()
  const completion = await client.chat.completions.create({
    model: 'gpt-4.1',
    max_tokens: 1024,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: MACHINE_LENS_PROMPT },
          {
            type: 'image_url',
            image_url: { url: `data:${request.mimeType};base64,${request.imageBase64}` },
          },
        ],
      },
    ],
  })
  return completion.choices[0]?.message?.content ?? null
}

/** Parses + normalizes the model's JSON. Loud on every deviation (No silent AI filtering). */
export function parseVisionResponse(textContent: string | null): VisionResult {
  if (!textContent) {
    functions.logger.warn('Machine Lens: empty model response')
    throw new HttpsError('internal', 'Vision model returned an empty response')
  }

  let raw: any
  try {
    raw = JSON.parse(textContent.trim())
  } catch (error: any) {
    functions.logger.warn('Machine Lens: failed to parse model JSON', { error: error.message })
    throw new HttpsError('internal', 'Vision model returned invalid JSON — could not parse identification result')
  }

  const labelText = typeof raw.labelText === 'string' ? raw.labelText : ''
  const machineType = typeof raw.machineType === 'string' && raw.machineType ? raw.machineType : 'unknown'
  if (machineType === 'unknown') {
    functions.logger.warn('Machine Lens: model did not recognize gym equipment', { raw })
  }

  let equipmentId = typeof raw.equipmentId === 'string' ? raw.equipmentId : ''
  if (!VALID_EQUIPMENT_IDS.includes(equipmentId as any)) {
    functions.logger.warn('Machine Lens: model returned unknown equipmentId', { equipmentId })
    equipmentId = ''
  }

  let candidateExerciseNames: string[] = Array.isArray(raw.candidateExerciseNames)
    ? raw.candidateExerciseNames.filter((n: unknown): n is string => typeof n === 'string' && n.trim() !== '')
    : []
  if (candidateExerciseNames.length === 0) {
    functions.logger.warn('Machine Lens: model returned no exercise candidates', { raw })
  }
  candidateExerciseNames = candidateExerciseNames.slice(0, 3)

  let confidence = typeof raw.confidence === 'number' && Number.isFinite(raw.confidence) ? raw.confidence : 0
  if (confidence < 0 || confidence > 1) {
    functions.logger.warn('Machine Lens: confidence out of range, clamping', { confidence })
    confidence = Math.min(1, Math.max(0, confidence))
  }

  return { labelText, machineType, equipmentId, candidateExerciseNames, confidence }
}

// ---------------------------------------------------------------------------
// Catalog matching
// ---------------------------------------------------------------------------

async function loadExerciseCatalog(): Promise<CatalogEntry[]> {
  const snapshot = await admin.firestore().collection('exercises').get()
  return snapshot.docs.map((doc: any) => {
    const data = doc.data() || {}
    return {
      id: doc.id,
      name: data.name || '',
      nameHe: data.nameHe || '',
      category: data.category || '',
      equipment: data.equipment || '',
      imageUrl: data.imageUrl || '',
    }
  })
}

/**
 * Runs findSimilarExercises for every candidate name, merges results:
 * dedupe by exercise id keeping the max score, sort desc, limit 3.
 */
export function matchCandidates(vision: VisionResult, catalog: CatalogEntry[]): MachineMatch[] {
  const imageUrlById = new Map(catalog.map(e => [e.id, e.imageUrl]))
  const best = new Map<string, SimilarMatch>()

  for (const candidateName of vision.candidateExerciseNames) {
    const matches = findSimilarExercises(
      { name: candidateName, nameHe: '', category: '', equipment: vision.equipmentId },
      catalog,
      3
    )
    for (const m of matches) {
      const existing = best.get(m.id)
      if (!existing || m.score > existing.score) best.set(m.id, m)
    }
  }

  return [...best.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(m => ({
      id: m.id,
      name: m.name,
      nameHe: m.nameHe,
      imageUrl: imageUrlById.get(m.id) || '',
      score: m.score,
      reasons: m.reasons,
    }))
}

// ---------------------------------------------------------------------------
// Handler (exported for behavioral testing — deps injectable, no real OpenAI)
// ---------------------------------------------------------------------------

export interface IdentifyMachineDeps {
  callVision?: (request: IdentifyMachineRequest) => Promise<string | null>
  loadCatalog?: () => Promise<CatalogEntry[]>
}

export async function handleIdentifyMachine(
  request: { auth?: { uid: string } | null; data: unknown },
  deps: IdentifyMachineDeps = {}
): Promise<IdentifyMachineResponse> {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'יש להתחבר כדי לזהות מכשיר')
  }
  const userId = request.auth.uid

  const data = validateRequest(request.data)

  const rateLimitResult = await checkRateLimit(userId, MACHINE_LENS_RATE_LIMIT)
  if (!rateLimitResult.allowed) {
    functions.logger.warn('Machine Lens: rate limit exceeded', { userId })
    throw new HttpsError('resource-exhausted', 'הגעת למגבלה היומית של זיהוי מכשירים. נסה שוב מחר.')
  }

  functions.logger.info('Machine Lens: identification started', { userId, mimeType: data.mimeType })

  let textContent: string | null
  try {
    textContent = await (deps.callVision ?? callVisionModel)(data)
  } catch (error: any) {
    functions.logger.error('Machine Lens: vision call failed', { userId, error: error.message })
    throw new HttpsError('internal', 'Vision model call failed')
  }

  const vision = parseVisionResponse(textContent)

  const catalog = await (deps.loadCatalog ?? loadExerciseCatalog)()
  const matches = matchCandidates(vision, catalog)

  await incrementUsage(userId, MACHINE_LENS_RATE_LIMIT)

  functions.logger.info('Machine Lens: identification done', {
    userId,
    machineType: vision.machineType,
    equipmentId: vision.equipmentId,
    confidence: vision.confidence,
    matchCount: matches.length,
  })

  return {
    labelText: vision.labelText,
    machineType: vision.machineType,
    equipmentId: vision.equipmentId,
    confidence: vision.confidence,
    matches,
  }
}

export const identifyMachine = onCall(
  {
    secrets: ['OPENAI_API_KEY'],
    timeoutSeconds: 60,
    memory: '512MiB',
  },
  (request): Promise<IdentifyMachineResponse> =>
    handleIdentifyMachine(request as { auth?: { uid: string } | null; data: unknown })
)
