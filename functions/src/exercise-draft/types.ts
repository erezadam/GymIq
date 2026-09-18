/**
 * Shared types for the exercise-draft Cloud Functions (admin add-exercise flow).
 * Contract: exerciseDrafts/{draftId} — see the multi-agent shared contract.
 */

export interface DraftPhotoInput {
  storagePath: string
  labelText: string
  machineType: string
  equipmentId: string
  confidence: number
}

export interface GenerateExerciseDraftRequest {
  name?: string
  photo?: DraftPhotoInput
}

/**
 * The draft field set — matches scripts/exercise-add/lib.ts ExerciseInput:
 * plain string arrays, NO imageUrl, NO videoWebpUrl.
 */
export interface DraftExercise {
  name: string
  nameHe: string
  category: string
  primaryMuscle: string
  secondaryMuscles: string[]
  secondaryMuscleCredits: string[]
  equipment: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  complexity: 'compound' | 'simple'
  reportType: string
  assistanceTypes: ('graviton' | 'bands')[]
  availableBands: string[]
  instructions: string[]
  instructionsHe: string[]
  tips: string[]
  tipsHe: string[]
  targetMuscles: string[]
}

export interface PoseSpec {
  bodyPosition: string
  cameraAngle: string
  equipmentPlacement: string
  endPose: string
  startPose: string
  muscleOverlay: string
  panelLayout: string
}

export interface SimilarDraftMatch {
  id: string
  name: string
  nameHe: string
  score: number
  reasons: string[]
}

export type DraftStatus =
  | 'pending'
  | 'draft_ready'
  | 'image_pending'
  | 'image_ready'
  | 'failed'
  | 'saved'

/** Live controlled-value catalogs loaded from Firestore at runtime. */
export interface LiveCatalogs {
  muscleIds: Set<string>
  subMuscleIds: Set<string>
  equipmentActiveIds: Set<string>
  reportTypeActiveIds: Set<string>
  gymEquipmentNotes: string
}
