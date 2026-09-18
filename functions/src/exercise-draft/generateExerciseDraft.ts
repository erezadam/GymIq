/**
 * generateExerciseDraft - Cloud Function (admin add-exercise flow)
 *
 * Admin-only. Builds a full exercise draft (record fields + poseSpec) from a
 * name and/or a photographed-machine result, via gpt-4.1, validated against
 * the shared zod schema AND the live Firestore catalogs. Writes progress to
 * exerciseDrafts/{draftId}; model/validation failures mark the doc 'failed'
 * and still return { draftId } (the client reads the error from the doc).
 */

import * as admin from 'firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'
import * as functions from 'firebase-functions'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { checkRateLimit, incrementUsage } from '../ai-trainer/rateLimiter'
import { exerciseSchema } from '../shared/exerciseSchema'
import { findSimilarExercises, type CatalogExercise } from '../shared/similarExercises'
import { buildSystemPrompt, buildUserPrompt } from './prompts'
import type {
  DraftExercise,
  DraftPhotoInput,
  GenerateExerciseDraftRequest,
  LiveCatalogs,
  PoseSpec,
  SimilarDraftMatch,
} from './types'

// Daily limit per admin, tracked in aiDraftUsage/{uid}_{YYYY-MM-DD}
const DRAFT_RATE_LIMIT = {
  collection: 'aiDraftUsage',
  dailyLimit: 30,
  // Fail closed: a broken quota check must not let requests through to OpenAI.
  failMode: 'closed' as const,
}

const POSE_SPEC_FIELDS: (keyof PoseSpec)[] = [
  'bodyPosition',
  'cameraAngle',
  'equipmentPlacement',
  'endPose',
  'startPose',
  'muscleOverlay',
  'panelLayout',
]

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export function validateRequest(data: unknown): GenerateExerciseDraftRequest {
  const d = data as Partial<GenerateExerciseDraftRequest> | null | undefined
  if (!d || typeof d !== 'object') {
    throw new HttpsError('invalid-argument', 'Missing request data')
  }
  const hasName = typeof d.name === 'string' && d.name.trim().length > 0
  let photo: DraftPhotoInput | undefined
  if (d.photo !== undefined && d.photo !== null) {
    const p = d.photo as Partial<DraftPhotoInput>
    if (
      typeof p !== 'object' ||
      typeof p.storagePath !== 'string' ||
      typeof p.labelText !== 'string' ||
      typeof p.machineType !== 'string' ||
      typeof p.equipmentId !== 'string' ||
      typeof p.confidence !== 'number' ||
      !Number.isFinite(p.confidence)
    ) {
      throw new HttpsError(
        'invalid-argument',
        'photo must include storagePath, labelText, machineType, equipmentId, confidence'
      )
    }
    photo = {
      storagePath: p.storagePath,
      labelText: p.labelText,
      machineType: p.machineType,
      equipmentId: p.equipmentId,
      confidence: p.confidence,
    }
  }
  if (!hasName && !photo) {
    throw new HttpsError('invalid-argument', 'At least one of name / photo is required')
  }
  return { ...(hasName ? { name: d.name!.trim() } : {}), ...(photo ? { photo } : {}) }
}

/** Admin gate — same pattern as admin/updateUserEmail.ts: users/{uid}.role. */
async function assertAdmin(uid: string): Promise<void> {
  const callerDoc = await admin.firestore().collection('users').doc(uid).get()
  if (!callerDoc.exists || callerDoc.data()?.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Only an admin can generate exercise drafts')
  }
}

// ---------------------------------------------------------------------------
// Live catalogs (Firestore Admin — single source of truth for controlled values)
// ---------------------------------------------------------------------------

export async function loadLiveCatalogs(): Promise<LiveCatalogs> {
  const db = admin.firestore()
  const [musclesSnap, equipmentSnap, reportTypesSnap, notesDoc] = await Promise.all([
    db.collection('muscles').get(),
    db.collection('equipment').get(),
    db.collection('reportTypes').get(),
    db.collection('settings').doc('gymEquipmentNotes').get(),
  ])

  const muscleIds = new Set<string>()
  const subMuscleIds = new Set<string>()
  for (const d of musclesSnap.docs) {
    muscleIds.add(d.id)
    for (const s of d.data()?.subMuscles || []) {
      if (s?.id) subMuscleIds.add(s.id)
    }
  }
  const equipmentActiveIds = new Set<string>(
    equipmentSnap.docs.filter((d: any) => d.data()?.isActive !== false).map((d: any) => d.id)
  )
  const reportTypeActiveIds = new Set<string>(
    reportTypesSnap.docs.filter((d: any) => d.data()?.isActive !== false).map((d: any) => d.id)
  )
  const gymEquipmentNotes =
    notesDoc.exists && typeof notesDoc.data()?.content === 'string' ? notesDoc.data()!.content : ''

  return { muscleIds, subMuscleIds, equipmentActiveIds, reportTypeActiveIds, gymEquipmentNotes }
}

async function loadExerciseCatalog(): Promise<CatalogExercise[]> {
  const snapshot = await admin.firestore().collection('exercises').get()
  return snapshot.docs.map((doc: any) => {
    const data = doc.data() || {}
    return {
      id: doc.id,
      name: data.name || '',
      nameHe: data.nameHe || '',
      category: data.category || '',
      equipment: data.equipment || '',
    }
  })
}

// ---------------------------------------------------------------------------
// LLM call (lazy client, same pattern as machine-lens / ai-trainer)
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

export async function callDraftModel(systemPrompt: string, userPrompt: string): Promise<string | null> {
  const client = await getClient()
  const completion = await client.chat.completions.create({
    model: 'gpt-4.1',
    max_tokens: 4096,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  })
  return completion.choices[0]?.message?.content ?? null
}

// ---------------------------------------------------------------------------
// Parsing & validation of the model output
// ---------------------------------------------------------------------------

const strArr = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []

/** Normalizes raw model JSON into DraftExercise (string arrays). */
export function normalizeDraft(raw: any): DraftExercise {
  if ('imageUrl' in raw || 'videoWebpUrl' in raw) {
    functions.logger.warn('Exercise Draft: model emitted forbidden url fields — stripping', {
      keys: Object.keys(raw),
    })
  }
  return {
    name: typeof raw.name === 'string' ? raw.name : '',
    nameHe: typeof raw.nameHe === 'string' ? raw.nameHe : '',
    category: typeof raw.category === 'string' ? raw.category : '',
    primaryMuscle: typeof raw.primaryMuscle === 'string' ? raw.primaryMuscle : '',
    secondaryMuscles: strArr(raw.secondaryMuscles),
    secondaryMuscleCredits: strArr(raw.secondaryMuscleCredits),
    equipment: typeof raw.equipment === 'string' ? raw.equipment : '',
    difficulty: ['beginner', 'intermediate', 'advanced'].includes(raw.difficulty)
      ? raw.difficulty
      : 'beginner',
    complexity: ['compound', 'simple'].includes(raw.complexity) ? raw.complexity : 'compound',
    reportType: typeof raw.reportType === 'string' && raw.reportType ? raw.reportType : 'weight_reps',
    assistanceTypes: strArr(raw.assistanceTypes).filter(
      (t): t is 'graviton' | 'bands' => t === 'graviton' || t === 'bands'
    ),
    availableBands: strArr(raw.availableBands),
    instructions: strArr(raw.instructions),
    instructionsHe: strArr(raw.instructionsHe),
    tips: strArr(raw.tips),
    tipsHe: strArr(raw.tipsHe),
    targetMuscles: strArr(raw.targetMuscles),
  }
}

/**
 * Validates the draft against the shared zod schema — string arrays are
 * converted to {value} objects (like scripts/exercise-add/lib.ts toFormData)
 * with a temporary imageUrl:'' for schema shape only.
 */
export function validateDraftSchema(draft: DraftExercise): string[] {
  const toValues = (arr: string[]) => arr.map((value) => ({ value }))
  const parsed = exerciseSchema.safeParse({
    ...draft,
    instructions: toValues(draft.instructions),
    instructionsHe: toValues(draft.instructionsHe),
    tips: toValues(draft.tips),
    tipsHe: toValues(draft.tipsHe),
    imageUrl: '', // temporary — schema requires the field; drafts never carry it
  })
  if (parsed.success) return []
  return parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`)
}

/** Controlled-vocabulary check against the LIVE catalogs (same logic as scripts/exercise-add/lib.ts). */
export function validateControlledValues(draft: DraftExercise, live: LiveCatalogs): string[] {
  const errors: string[] = []
  if (!live.muscleIds.has(draft.category)) {
    errors.push(`category '${draft.category}' אינו קטגוריה ראשית קיימת ב-muscles`)
  }
  if (!live.equipmentActiveIds.has(draft.equipment)) {
    errors.push(`equipment '${draft.equipment}' אינו ציוד פעיל ב-equipment`)
  }
  if (!live.reportTypeActiveIds.has(draft.reportType)) {
    errors.push(`reportType '${draft.reportType}' אינו סוג דיווח פעיל ב-reportTypes`)
  }
  if (
    draft.primaryMuscle !== '' &&
    !live.subMuscleIds.has(draft.primaryMuscle) &&
    !live.muscleIds.has(draft.primaryMuscle)
  ) {
    errors.push(`primaryMuscle '${draft.primaryMuscle}' אינו תת-שריר או שריר ראשי קיים`)
  }
  for (const m of [...draft.secondaryMuscles, ...draft.secondaryMuscleCredits]) {
    if (!live.subMuscleIds.has(m) && !live.muscleIds.has(m)) {
      errors.push(`'${m}' אינו שריר קיים`)
    }
  }
  return errors
}

export function normalizePoseSpec(raw: any): { poseSpec: PoseSpec | null; errors: string[] } {
  if (!raw || typeof raw !== 'object') return { poseSpec: null, errors: ['poseSpec חסר בתשובת המודל'] }
  const errors: string[] = []
  const spec: any = {}
  for (const field of POSE_SPEC_FIELDS) {
    const v = raw[field]
    if (typeof v !== 'string' || v.trim() === '') {
      errors.push(`poseSpec.${field} חסר או ריק`)
    } else {
      spec[field] = v
    }
  }
  return errors.length ? { poseSpec: null, errors } : { poseSpec: spec as PoseSpec, errors: [] }
}

// ---------------------------------------------------------------------------
// Handler (exported for behavioral testing — deps injectable, no real OpenAI)
// ---------------------------------------------------------------------------

export interface GenerateExerciseDraftDeps {
  callLLM?: (systemPrompt: string, userPrompt: string) => Promise<string | null>
  loadCatalogs?: () => Promise<LiveCatalogs>
  loadExercises?: () => Promise<CatalogExercise[]>
}

export async function handleGenerateExerciseDraft(
  request: { auth?: { uid: string } | null; data: unknown },
  deps: GenerateExerciseDraftDeps = {}
): Promise<{ draftId: string }> {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'יש להתחבר')
  }
  const userId = request.auth.uid

  await assertAdmin(userId)

  const input = validateRequest(request.data)

  let rateLimitResult
  try {
    rateLimitResult = await checkRateLimit(userId, DRAFT_RATE_LIMIT)
  } catch (error: any) {
    functions.logger.error('Exercise Draft: quota check failed — refusing request', {
      userId,
      error: error.message,
    })
    throw new HttpsError('unavailable', 'בדיקת המכסה נכשלה, נסה שוב')
  }
  if (!rateLimitResult.allowed) {
    functions.logger.warn('Exercise Draft: rate limit exceeded', { userId })
    throw new HttpsError('resource-exhausted', 'הגעת למגבלה היומית של יצירת טיוטות. נסה שוב מחר.')
  }

  const db = admin.firestore()
    const draftRef = db.collection('exerciseDrafts').doc()
  await draftRef.set({
    createdBy: userId,
    status: 'pending',
    input,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  })
  await incrementUsage(userId, DRAFT_RATE_LIMIT)

  const failDraft = async (error: string): Promise<{ draftId: string }> => {
    functions.logger.warn('Exercise Draft: generation failed', { userId, draftId: draftRef.id, error })
    await draftRef.set(
      { status: 'failed', error, updatedAt: FieldValue.serverTimestamp() },
      { merge: true }
    )
    return { draftId: draftRef.id }
  }

  // Everything below runs synchronously inside the handler — onCall does not
  // support work after return (timeoutSeconds: 120 covers the full flow).
  let catalogs: LiveCatalogs
  try {
    catalogs = await (deps.loadCatalogs ?? loadLiveCatalogs)()
  } catch (error: any) {
    return failDraft(`טעינת הקטלוגים החיים נכשלה: ${error.message}`)
  }

  const systemPrompt = buildSystemPrompt(catalogs, input.photo)
  const userPrompt = buildUserPrompt(input)

  let textContent: string | null
  try {
    textContent = await (deps.callLLM ?? callDraftModel)(systemPrompt, userPrompt)
  } catch (error: any) {
    return failDraft(`קריאת המודל נכשלה: ${error.message}`)
  }

  if (!textContent) {
    return failDraft('המודל החזיר תשובה ריקה')
  }

  let raw: any
  try {
    raw = JSON.parse(textContent.trim())
  } catch {
    return failDraft('המודל החזיר JSON לא תקין')
  }

  if (!raw || typeof raw !== 'object' || !raw.draft || typeof raw.draft !== 'object') {
    return failDraft('תשובת המודל חסרה אובייקט draft')
  }

  const draft = normalizeDraft(raw.draft)

  const schemaErrors = validateDraftSchema(draft)
  if (schemaErrors.length > 0) {
    return failDraft(`הטיוטה נכשלה בולידציית הסכמה: ${schemaErrors.join(' | ')}`)
  }

  const controlledErrors = validateControlledValues(draft, catalogs)
  if (controlledErrors.length > 0) {
    return failDraft(`ערכים מבוקרים לא תקינים: ${controlledErrors.join(' | ')}`)
  }

  const { poseSpec, errors: poseErrors } = normalizePoseSpec(raw.poseSpec)
  if (!poseSpec) {
    return failDraft(`poseSpec לא תקין: ${poseErrors.join(' | ')}`)
  }

  let similar: SimilarDraftMatch[] = []
  try {
    const catalog = await (deps.loadExercises ?? loadExerciseCatalog)()
    similar = findSimilarExercises(
      { name: draft.name, nameHe: draft.nameHe, category: draft.category, equipment: draft.equipment },
      catalog,
      3
    ).map((m) => ({ id: m.id, name: m.name, nameHe: m.nameHe, score: m.score, reasons: m.reasons }))
  } catch (error: any) {
    // Similar-matching is advisory — never fail the draft for it, but never silent.
    functions.logger.warn('Exercise Draft: similar-exercise matching failed', {
      draftId: draftRef.id,
      error: error.message,
    })
  }

  await draftRef.set(
    {
      draft,
      poseSpec,
      similar,
      status: 'draft_ready',
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  )

  functions.logger.info('Exercise Draft: draft ready', {
    userId,
    draftId: draftRef.id,
    name: draft.name,
    similarCount: similar.length,
  })

  return { draftId: draftRef.id }
}

export const generateExerciseDraft = onCall(
  {
    secrets: ['OPENAI_API_KEY'],
    timeoutSeconds: 120,
    memory: '512MiB',
  },
  (request): Promise<{ draftId: string }> =>
    handleGenerateExerciseDraft(request as { auth?: { uid: string } | null; data: unknown })
)
