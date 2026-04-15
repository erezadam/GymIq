/**
 * Firebase service for workout history
 */
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from './config'
import type { WorkoutHistoryEntry, WorkoutHistorySummary } from '@/domains/workouts/types'

const COLLECTION_NAME = 'workoutHistory'

// Convert Firestore data to WorkoutHistoryEntry
function toWorkoutHistory(id: string, data: any): WorkoutHistoryEntry {
  return {
    id,
    userId: data.userId,
    name: data.name,
    date: data.date?.toDate() || new Date(),
    startTime: data.startTime?.toDate() || new Date(),
    endTime: data.endTime?.toDate() || new Date(),
    duration: data.duration,
    status: data.status,
    exercises: data.exercises || [],
    completedExercises: data.completedExercises,
    totalExercises: data.totalExercises,
    completedSets: data.completedSets,
    totalSets: data.totalSets,
    totalVolume: data.totalVolume,
    personalRecords: data.personalRecords || 0,
    calories: data.calories,
    notes: data.notes,
    // AI Trainer fields
    source: data.source,
    aiWorkoutNumber: data.aiWorkoutNumber,
    bundleId: data.bundleId,
    aiRecommendations: data.aiRecommendations,
    aiExplanation: data.aiExplanation,
    // Trainer program fields
    programId: data.programId,
    programDayLabel: data.programDayLabel,
    // Trainer report fields
    reportedBy: data.reportedBy,
    reportedByName: data.reportedByName,
    // Soft delete
    deletedByTrainee: data.deletedByTrainee
      ? { deletedAt: data.deletedByTrainee.deletedAt?.toDate?.() || new Date(), reason: data.deletedByTrainee.reason }
      : undefined,
    // Trainer edit tracking
    lastEditedByTrainer: data.lastEditedByTrainer
      ? {
          trainerId: data.lastEditedByTrainer.trainerId,
          trainerName: data.lastEditedByTrainer.trainerName,
          editedAt: data.lastEditedByTrainer.editedAt?.toDate?.() || new Date(),
          editSummary: data.lastEditedByTrainer.editSummary || '',
        }
      : undefined,
  }
}

// Convert to summary for list display
function toSummary(entry: WorkoutHistoryEntry): WorkoutHistorySummary {
  // Extract unique muscle groups from exercises (preserve order of first appearance)
  const muscleGroups = entry.exercises
    .map(ex => ex.category)
    .filter((category): category is string => Boolean(category))
    .filter((category, index, self) => self.indexOf(category) === index)

  return {
    id: entry.id,
    name: entry.name,
    date: entry.date,
    duration: entry.duration,
    status: entry.status,
    completedExercises: entry.completedExercises,
    totalExercises: entry.totalExercises,
    totalVolume: entry.totalVolume,
    personalRecords: entry.personalRecords,
    calories: entry.calories,
    muscleGroups: muscleGroups.length > 0 ? muscleGroups : undefined,
    // AI Trainer fields
    source: entry.source,
    aiWorkoutNumber: entry.aiWorkoutNumber,
    bundleId: entry.bundleId,
    // Trainer program fields
    programId: entry.programId,
    programDayLabel: entry.programDayLabel,
    // Trainer report fields
    reportedBy: entry.reportedBy,
    // Soft delete
    deletedByTrainee: entry.deletedByTrainee,
  }
}

// Check if a workout document is NOT soft-deleted
function isNotSoftDeleted(data: any): boolean {
  return !data.deletedByTrainee
}

// Helper to remove undefined values from object
function removeUndefined<T extends Record<string, any>>(obj: T): T {
  const result: Record<string, any> = {}
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (Array.isArray(value)) {
        result[key] = value.map(item =>
          typeof item === 'object' && item !== null && !isTimestamp(item) ? removeUndefined(item) : item
        )
      } else if (typeof value === 'object' && value !== null && !(value instanceof Date) && !isTimestamp(value)) {
        result[key] = removeUndefined(value)
      } else {
        result[key] = value
      }
    }
  }
  return result as T
}

// Check if value is a Firestore Timestamp
function isTimestamp(value: any): boolean {
  return value && typeof value.toDate === 'function'
}

// Save a workout to history
export async function saveWorkoutHistory(workout: Omit<WorkoutHistoryEntry, 'id'>): Promise<string> {
  const historyRef = collection(db, COLLECTION_NAME)

  // Clean the workout data - remove undefined values
  const cleanWorkout = removeUndefined({
    userId: workout.userId,
    name: workout.name || 'אימון',
    date: Timestamp.fromDate(workout.date),
    startTime: Timestamp.fromDate(workout.startTime),
    endTime: Timestamp.fromDate(workout.endTime),
    duration: workout.duration || 0,
    status: workout.status,
    exercises: workout.exercises.map(ex => ({
      exerciseId: ex.exerciseId,
      exerciseName: ex.exerciseName,
      exerciseNameHe: ex.exerciseNameHe,
      imageUrl: ex.imageUrl || '',
      category: ex.category || '',
      isCompleted: ex.isCompleted,
      notes: ex.notes || '',
      ...(ex.exerciseVolume !== undefined && ex.exerciseVolume > 0 && { exerciseVolume: ex.exerciseVolume }),
      sets: ex.sets.map(set => ({
        type: set.type,
        targetReps: set.targetReps || 0,
        targetWeight: set.targetWeight || 0,
        actualReps: set.actualReps || 0,
        actualWeight: set.actualWeight || 0,
        completed: set.completed || false,
        // Extended fields (only include if defined - Firebase doesn't accept undefined)
        ...(set.time !== undefined && set.time > 0 && { time: set.time }),
        ...(set.intensity !== undefined && set.intensity > 0 && { intensity: set.intensity }),
        ...(set.speed !== undefined && set.speed > 0 && { speed: set.speed }),
        ...(set.distance !== undefined && set.distance > 0 && { distance: set.distance }),
        ...(set.incline !== undefined && set.incline > 0 && { incline: set.incline }),
        ...(set.zone !== undefined && set.zone > 0 && { zone: set.zone }),
        // Assistance fields
        ...(set.assistanceWeight !== undefined && { assistanceWeight: set.assistanceWeight }),
        ...(set.assistanceBand && { assistanceBand: set.assistanceBand }),
      })),
    })),
    completedExercises: workout.completedExercises || 0,
    totalExercises: workout.totalExercises || 0,
    completedSets: workout.completedSets || 0,
    totalSets: workout.totalSets || 0,
    totalVolume: workout.totalVolume || 0,
    personalRecords: workout.personalRecords || 0,
    createdAt: Timestamp.now(),
    // AI Trainer fields
    source: workout.source,
    aiWorkoutNumber: workout.aiWorkoutNumber,
    bundleId: workout.bundleId,
    aiRecommendations: workout.aiRecommendations,
    aiExplanation: workout.aiExplanation,
    // Trainer program fields
    programId: workout.programId,
    programDayLabel: workout.programDayLabel,
    // Trainer report fields
    reportedBy: workout.reportedBy,
    reportedByName: workout.reportedByName,
  })

  // Add notes only if exists
  if (workout.notes) {
    (cleanWorkout as any).notes = workout.notes
  }

  // Add calories only if exists
  if (workout.calories !== undefined) {
    (cleanWorkout as any).calories = workout.calories
  }

  console.log('💾 Saving workout to Firebase...')
  console.log('📋 Collection:', COLLECTION_NAME)
  console.log('📋 Data:', JSON.stringify(cleanWorkout, null, 2))

  try {
    const docRef = await addDoc(historyRef, cleanWorkout)
    console.log('✅ SUCCESS - Workout saved with ID:', docRef.id)
    console.log('✅ Full path:', `${COLLECTION_NAME}/${docRef.id}`)
    return docRef.id
  } catch (error: any) {
    console.error('❌ FAILED TO SAVE WORKOUT!')
    console.error('❌ Error code:', error.code)
    console.error('❌ Error message:', error.message)
    console.error('❌ Full error:', error)
    throw error
  }
}

// Get user's workout history
export async function getUserWorkoutHistory(
  userId: string,
  limitCount: number = 50,
  includeDeleted: boolean = false
): Promise<WorkoutHistorySummary[]> {
  console.log('📖 getUserWorkoutHistory called for userId:', userId)
  const historyRef = collection(db, COLLECTION_NAME)
  const q = query(
    historyRef,
    where('userId', '==', userId),
    orderBy('date', 'desc'),
    limit(limitCount)
  )

  try {
    const snapshot = await getDocs(q)
    console.log('📖 Found', snapshot.docs.length, 'workouts')
    const docs = includeDeleted ? snapshot.docs : snapshot.docs.filter(d => isNotSoftDeleted(d.data()))
    const results = docs.map(doc => {
      const entry = toWorkoutHistory(doc.id, doc.data())
      return toSummary(entry)
    })
    return results
  } catch (error) {
    console.error('❌ Error fetching workout history:', error)
    throw error
  }
}

// Get user's workout history with pagination support
export async function getUserWorkoutHistoryPaginated(
  userId: string,
  pageSize: number = 20,
  afterDate?: Date,
  includeDeleted: boolean = false
): Promise<{ summaries: WorkoutHistorySummary[]; hasMore: boolean }> {
  const historyRef = collection(db, COLLECTION_NAME)

  const constraints: any[] = [
    where('userId', '==', userId),
    orderBy('date', 'desc'),
  ]

  if (afterDate) {
    constraints.push(startAfter(Timestamp.fromDate(afterDate)))
  }

  constraints.push(limit(pageSize + 1))

  const q = query(historyRef, ...constraints)

  try {
    const snapshot = await getDocs(q)
    const hasMore = snapshot.docs.length > pageSize
    const docs = hasMore ? snapshot.docs.slice(0, pageSize) : snapshot.docs

    let summaries = docs.map(doc => {
      const entry = toWorkoutHistory(doc.id, doc.data())
      return toSummary(entry)
    })

    if (!includeDeleted) {
      summaries = summaries.filter(s => !s.deletedByTrainee)
    }

    return { summaries, hasMore }
  } catch (error) {
    console.error('❌ Error fetching paginated workout history:', error)
    throw error
  }
}

// Get full workout history entries (with exercise data) for AI context
export async function getUserWorkoutHistoryFull(
  userId: string,
  limitCount: number = 10,
  includeDeleted: boolean = false
): Promise<WorkoutHistoryEntry[]> {
  const historyRef = collection(db, COLLECTION_NAME)
  const q = query(
    historyRef,
    where('userId', '==', userId),
    orderBy('date', 'desc'),
    limit(limitCount)
  )

  try {
    const snapshot = await getDocs(q)
    const docs = includeDeleted ? snapshot.docs : snapshot.docs.filter(d => isNotSoftDeleted(d.data()))
    return docs.map(doc => toWorkoutHistory(doc.id, doc.data()))
  } catch (error) {
    console.error('❌ Error fetching full workout history:', error)
    throw error
  }
}

// Get workout details by ID
export async function getWorkoutById(workoutId: string): Promise<WorkoutHistoryEntry | null> {
  const docRef = doc(db, COLLECTION_NAME, workoutId)
  const snapshot = await getDoc(docRef)

  if (!snapshot.exists()) {
    return null
  }

  return toWorkoutHistory(snapshot.id, snapshot.data())
}

// Get last workout data for a specific exercise
export async function getLastWorkoutForExercise(
  userId: string,
  exerciseId: string
): Promise<{ weight: number; reps: number; date: Date } | null> {
  const historyRef = collection(db, COLLECTION_NAME)

  // Get user's recent workouts (last 30)
  const q = query(
    historyRef,
    where('userId', '==', userId),
    orderBy('date', 'desc'),
    limit(30)
  )

  const snapshot = await getDocs(q)

  // Search through workouts to find the exercise (skip soft-deleted)
  for (const doc of snapshot.docs) {
    const data = doc.data()
    if (!isNotSoftDeleted(data)) continue

    const exercises = data.exercises || []

    const exercise = exercises.find((ex: any) => ex.exerciseId === exerciseId)

    if (exercise && exercise.sets && exercise.sets.length > 0) {
      // Find the best set (highest weight with reps > 0)
      const validSets = exercise.sets.filter((set: any) =>
        set.actualReps > 0 || set.completed
      )

      if (validSets.length > 0) {
        // Get the set with highest weight
        const bestSet = validSets.reduce((best: any, current: any) => {
          const currentWeight = current.actualWeight || current.targetWeight || 0
          const bestWeight = best.actualWeight || best.targetWeight || 0
          return currentWeight > bestWeight ? current : best
        }, validSets[0])

        return {
          weight: bestSet.actualWeight || bestSet.targetWeight || 0,
          reps: bestSet.actualReps || bestSet.targetReps || 0,
          date: data.date?.toDate() || new Date(),
        }
      }
    }
  }

  return null
}

// Get all historical notes for an exercise
export async function getExerciseNotes(
  userId: string,
  exerciseId: string
): Promise<{ note: string; date: Date }[]> {
  const historyRef = collection(db, COLLECTION_NAME)

  // Get user's workout history
  const q = query(
    historyRef,
    where('userId', '==', userId),
    orderBy('date', 'desc'),
    limit(50)
  )

  const snapshot = await getDocs(q)
  const notes: { note: string; date: Date }[] = []

  for (const doc of snapshot.docs) {
    const data = doc.data()
    if (!isNotSoftDeleted(data)) continue

    const exercises = data.exercises || []

    const exercise = exercises.find((ex: any) => ex.exerciseId === exerciseId)
    if (exercise?.notes && exercise.notes.trim()) {
      notes.push({
        note: exercise.notes,
        date: data.date?.toDate() || new Date(),
      })
    }
  }

  return notes
}

// Get historical notes for multiple exercises at once
export async function getExerciseNotesForExercises(
  userId: string,
  exerciseIds: string[]
): Promise<Record<string, { note: string; date: Date }[]>> {
  const historyRef = collection(db, COLLECTION_NAME)

  const q = query(
    historyRef,
    where('userId', '==', userId),
    orderBy('date', 'desc'),
    limit(50)
  )

  const snapshot = await getDocs(q)
  const result: Record<string, { note: string; date: Date }[]> = {}

  // Initialize result for all exercise IDs
  exerciseIds.forEach(id => {
    result[id] = []
  })

  for (const doc of snapshot.docs) {
    const data = doc.data()
    if (!isNotSoftDeleted(data)) continue

    const exercises = data.exercises || []
    const workoutDate = data.date?.toDate() || new Date()

    for (const exerciseId of exerciseIds) {
      const exercise = exercises.find((ex: any) => ex.exerciseId === exerciseId)
      if (exercise?.notes && exercise.notes.trim()) {
        result[exerciseId].push({
          note: exercise.notes,
          date: workoutDate,
        })
      }
    }
  }

  return result
}

// Get last workout data for multiple exercises at once
export async function getLastWorkoutForExercises(
  userId: string,
  exerciseIds: string[]
): Promise<Record<string, { weight: number; reps: number; date: Date }>> {
  const historyRef = collection(db, COLLECTION_NAME)

  // Get user's recent workouts
  const q = query(
    historyRef,
    where('userId', '==', userId),
    orderBy('date', 'desc'),
    limit(50)
  )

  const snapshot = await getDocs(q)
  const result: Record<string, { weight: number; reps: number; date: Date }> = {}
  const foundExercises = new Set<string>()

  // Search through workouts to find each exercise (skip soft-deleted)
  for (const doc of snapshot.docs) {
    // Stop if we found all exercises
    if (foundExercises.size === exerciseIds.length) break

    const data = doc.data()
    if (!isNotSoftDeleted(data)) continue

    const exercises = data.exercises || []

    for (const exerciseId of exerciseIds) {
      // Skip if already found
      if (foundExercises.has(exerciseId)) continue

      const exercise = exercises.find((ex: any) => ex.exerciseId === exerciseId)

      if (exercise && exercise.sets && exercise.sets.length > 0) {
        const validSets = exercise.sets.filter((set: any) =>
          set.actualReps > 0 || set.completed
        )

        if (validSets.length > 0) {
          const bestSet = validSets.reduce((best: any, current: any) => {
            const currentWeight = current.actualWeight || current.targetWeight || 0
            const bestWeight = best.actualWeight || best.targetWeight || 0
            return currentWeight > bestWeight ? current : best
          }, validSets[0])

          result[exerciseId] = {
            weight: bestSet.actualWeight || bestSet.targetWeight || 0,
            reps: bestSet.actualReps || bestSet.targetReps || 0,
            date: data.date?.toDate() || new Date(),
          }

          foundExercises.add(exerciseId)
        }
      }
    }
  }

  return result
}

// Normalize exercise name (trim, collapse whitespace, lowercase)
function normalizeExerciseName(name: string | undefined | null): string {
  if (!name) return ''
  return name.trim().replace(/\s+/g, ' ').toLowerCase()
}

// Tokenize a Hebrew/English exercise name for fuzzy matching.
// Splits on whitespace + punctuation, drops 1-char tokens, and adds a
// prefix-stripped variant so "במכונה" matches "מכונה".
const HEB_PREFIXES = new Set(['ב', 'ל', 'ה', 'ו', 'מ', 'ש', 'כ'])
function tokenizeExerciseName(name: string | undefined | null): Set<string> {
  const norm = normalizeExerciseName(name).replace(/[(),.\-_/]/g, ' ')
  const out = new Set<string>()
  for (const w of norm.split(' ')) {
    if (w.length < 2) continue
    out.add(w)
    if (w.length >= 4 && HEB_PREFIXES.has(w[0])) out.add(w.substring(1))
  }
  return out
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0
  let inter = 0
  for (const x of a) if (b.has(x)) inter++
  const union = a.size + b.size - inter
  return union === 0 ? 0 : inter / union
}

// First significant word in the name (the action: "חתירה", "סקוואט", "לחיצת").
// Used as a guard in fuzzy matching so squat≠lunge despite high token overlap.
function firstActionToken(name: string | undefined | null): string {
  const norm = normalizeExerciseName(name).replace(/[(),.\-_/]/g, ' ')
  for (const w of norm.split(' ')) {
    if (w.length >= 3) return w
  }
  return ''
}

const FUZZY_THRESHOLD = 0.5

type PRBestEntry = { weight: number; reps: number; time?: number; date: Date }
type ExerciseDetails = { nameHe?: string; primaryMuscle?: string; equipment?: string; category?: string }

function pickBetterEntry(existing: PRBestEntry | undefined, candidate: PRBestEntry, candidateAllWeightsZero: boolean): PRBestEntry {
  if (!existing) return candidate
  if (candidateAllWeightsZero) {
    return candidate.reps > existing.reps ? candidate : existing
  }
  if (candidate.weight > existing.weight) return candidate
  if (candidate.weight === existing.weight && candidate.reps > existing.reps) return candidate
  return existing
}

// Get personal best (PR) for multiple exercises — highest weight across ALL workouts.
// Three-tier matching:
//   1. exerciseId exact match
//   2. normalized-name exact match (handles same-name-different-ID duplicates)
//   3. fuzzy match: same `category` + same first action-word + Jaccard token overlap
//      >= threshold. Handles word-order / phrasing duplicates like
//      "חתירה בישיבה במכונה" vs "חתירה עם מכונה, בישיבה".
//      `category` is used (not primaryMuscle/equipment) because that is what the
//      embedded history record stores. The first-action-word gate prevents
//      false matches like squat↔lunge that share most other tokens.
// Pass `exerciseDetailsById` (with at least nameHe + category) to enable tiers 2 & 3.
export async function getBestPerformanceForExercises(
  userId: string,
  exerciseIds: string[],
  exerciseDetailsById?: Record<string, ExerciseDetails>
): Promise<Record<string, PRBestEntry>> {
  const historyRef = collection(db, COLLECTION_NAME)

  const q = query(
    historyRef,
    where('userId', '==', userId),
    orderBy('date', 'desc')
  )

  const snapshot = await getDocs(q)
  const result: Record<string, PRBestEntry> = {}
  const exerciseIdSet = new Set(exerciseIds)

  // Tier-2/3 setup: precompute target lookups
  const targetNames = new Set<string>()
  type FuzzyTarget = { id: string; category: string; firstToken: string; tokens: Set<string> }
  const fuzzyTargets: FuzzyTarget[] = []
  if (exerciseDetailsById) {
    for (const id of exerciseIds) {
      const det = exerciseDetailsById[id]
      if (!det) continue
      const norm = normalizeExerciseName(det.nameHe)
      if (norm) targetNames.add(norm)
      const tokens = tokenizeExerciseName(det.nameHe)
      const ft = firstActionToken(det.nameHe)
      if (tokens.size > 0 && det.category && ft) {
        fuzzyTargets.push({ id, category: det.category, firstToken: ft, tokens })
      }
    }
  }
  const resultByName: Record<string, PRBestEntry> = {}
  // For tier 3: per-input-id we track the best PR found via fuzzy match.
  const fuzzyBestById: Record<string, PRBestEntry> = {}

  for (const doc of snapshot.docs) {
    const data = doc.data()
    if (!isNotSoftDeleted(data)) continue
    if (data.status !== 'completed') continue

    const exercises = data.exercises || []
    const workoutDate = data.date?.toDate() || new Date()

    for (const exercise of exercises) {
      const normName = normalizeExerciseName(exercise.exerciseNameHe || exercise.exerciseName)
      const matchById = exerciseIdSet.has(exercise.exerciseId)
      const matchByName = targetNames.size > 0 && normName !== '' && targetNames.has(normName)

      // Pre-compute fuzzy candidates (input ids that match this history exercise)
      const fuzzyMatchIds: string[] = []
      if (fuzzyTargets.length > 0 && !matchById && exercise.category) {
        const histName = exercise.exerciseNameHe || exercise.exerciseName
        const histTokens = tokenizeExerciseName(histName)
        const histFirst = firstActionToken(histName)
        if (histTokens.size > 0 && histFirst) {
          for (const t of fuzzyTargets) {
            if (t.category !== exercise.category) continue
            if (t.firstToken !== histFirst) continue
            if (jaccardSimilarity(t.tokens, histTokens) >= FUZZY_THRESHOLD) {
              fuzzyMatchIds.push(t.id)
            }
          }
        }
      }

      if (!matchById && !matchByName && fuzzyMatchIds.length === 0) continue
      if (!exercise.sets || exercise.sets.length === 0) continue

      const validSets = exercise.sets.filter((set: any) =>
        set.type !== 'warmup' &&
        ((set.actualReps && set.actualReps > 0) || (set.time && set.time > 0) || set.completed)
      )
      if (validSets.length === 0) continue

      const allWeightsZero = validSets.every((set: any) => !set.actualWeight || set.actualWeight === 0)

      const bestSet = validSets.reduce((best: any, current: any) => {
        if (allWeightsZero) {
          const currentReps = current.actualReps || 0
          const bestReps = best.actualReps || 0
          return currentReps > bestReps ? current : best
        } else {
          const currentWeight = current.actualWeight || 0
          const bestWeight = best.actualWeight || 0
          if (currentWeight > bestWeight) return current
          if (currentWeight === bestWeight) {
            return (current.actualReps || 0) > (best.actualReps || 0) ? current : best
          }
          return best
        }
      }, validSets[0])

      const bestWeight = bestSet.actualWeight || bestSet.targetWeight || 0
      const bestReps = bestSet.actualReps || bestSet.targetReps || 0
      const bestTime = bestSet.time || 0

      const entry: PRBestEntry = { weight: bestWeight, reps: bestReps, date: workoutDate }
      if (bestTime > 0) entry.time = bestTime

      if (matchById) {
        result[exercise.exerciseId] = pickBetterEntry(result[exercise.exerciseId], entry, allWeightsZero)
      }
      if (matchByName) {
        resultByName[normName] = pickBetterEntry(resultByName[normName], entry, allWeightsZero)
      }
      for (const fid of fuzzyMatchIds) {
        fuzzyBestById[fid] = pickBetterEntry(fuzzyBestById[fid], entry, allWeightsZero)
      }
    }
  }

  // Tier 2 fallback (exact normalized name)
  if (exerciseDetailsById) {
    for (const id of exerciseIds) {
      if (result[id]) continue
      const norm = normalizeExerciseName(exerciseDetailsById[id]?.nameHe)
      if (norm && resultByName[norm]) {
        result[id] = resultByName[norm]
      }
    }
    // Tier 3 fallback (fuzzy by primaryMuscle+equipment+tokens)
    for (const id of exerciseIds) {
      if (result[id]) continue
      if (fuzzyBestById[id]) {
        result[id] = fuzzyBestById[id]
      }
    }
  }

  return result
}

// Calculate exercise volume for active workout sets (reps × weight for completed sets)
// Only weight-based exercises (reportType includes 'weight' or is default weight_reps)
export function calculateExerciseVolume(
  sets: { reps: number; weight: number; completedAt?: Date }[],
  reportType?: string
): number {
  // Only calculate volume for weight-based exercises
  const rt = (reportType || 'weight_reps').toLowerCase()
  if (!rt.includes('weight')) return 0

  return sets.reduce((total, set) => {
    // Count any set with weight and reps filled in (real-time during workout)
    if (set.weight > 0 && set.reps > 0) {
      return total + set.weight * set.reps
    }
    return total
  }, 0)
}

// Calculate exercise volume from Firestore history sets (backward compat)
export function calculateExerciseVolumeFromHistory(
  sets: { actualWeight?: number; actualReps?: number; completed?: boolean }[]
): number {
  return sets.reduce((total, set) => {
    const weight = set.actualWeight || 0
    const reps = set.actualReps || 0
    if (set.completed && weight > 0 && reps > 0) {
      return total + weight * reps
    }
    return total
  }, 0)
}

// Get last exercise volumes for multiple exercises at once
// Returns { exerciseId: totalVolume } from the most recent workout containing each exercise
export async function getLastExerciseVolumes(
  userId: string,
  exerciseIds: string[]
): Promise<Record<string, number>> {
  const historyRef = collection(db, COLLECTION_NAME)

  const q = query(
    historyRef,
    where('userId', '==', userId),
    orderBy('date', 'desc'),
    limit(50)
  )

  const snapshot = await getDocs(q)
  const result: Record<string, number> = {}
  const foundExercises = new Set<string>()

  for (const docSnap of snapshot.docs) {
    if (foundExercises.size === exerciseIds.length) break

    const data = docSnap.data()
    if (!isNotSoftDeleted(data)) continue

    const exercises = data.exercises || []

    for (const exerciseId of exerciseIds) {
      if (foundExercises.has(exerciseId)) continue

      const exercise = exercises.find((ex: any) => ex.exerciseId === exerciseId)

      if (exercise && exercise.sets && exercise.sets.length > 0) {
        const volume = calculateExerciseVolumeFromHistory(exercise.sets)
        if (volume > 0) {
          result[exerciseId] = volume
          foundExercises.add(exerciseId)
        }
      }
    }
  }

  return result
}

// Get user stats
export async function getUserWorkoutStats(userId: string): Promise<{
  totalWorkouts: number
  thisWeekWorkouts: number
  thisMonthWorkouts: number
  totalVolume: number
  currentStreak: number
}> {
  const historyRef = collection(db, COLLECTION_NAME)

  // Get all workouts for the user
  const q = query(
    historyRef,
    where('userId', '==', userId),
    orderBy('date', 'desc')
  )

  const snapshot = await getDocs(q)
  const workouts = snapshot.docs
    .filter(d => isNotSoftDeleted(d.data()))
    .map(doc => toWorkoutHistory(doc.id, doc.data()))

  // Filter only completed workouts for stats calculation
  // (in_progress, cancelled, planned, partial should not count as "done" workouts)
  const completedWorkouts = workouts.filter(w => w.status === 'completed')

  // Calculate this week's workouts (completed only)
  const now = new Date()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - now.getDay())
  weekStart.setHours(0, 0, 0, 0)

  const thisWeekWorkouts = completedWorkouts.filter(w => w.date >= weekStart).length

  // Calculate this month's workouts (1st of current month to end of month, completed only)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  monthStart.setHours(0, 0, 0, 0)
  const thisMonthWorkouts = completedWorkouts.filter(w => w.date >= monthStart).length

  // Calculate total volume (from completed workouts only)
  const totalVolume = completedWorkouts.reduce((sum, w) => sum + w.totalVolume, 0)

  // Calculate streak (consecutive days with completed workouts)
  let currentStreak = 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (let i = 0; i < 365; i++) {
    const checkDate = new Date(today)
    checkDate.setDate(today.getDate() - i)

    const hasWorkout = completedWorkouts.some(w => {
      const workoutDate = new Date(w.date)
      workoutDate.setHours(0, 0, 0, 0)
      return workoutDate.getTime() === checkDate.getTime()
    })

    if (hasWorkout) {
      currentStreak++
    } else if (i > 0) {
      break
    }
  }

  return {
    totalWorkouts: completedWorkouts.length,
    thisWeekWorkouts,
    thisMonthWorkouts,
    totalVolume,
    currentStreak,
  }
}

// Personal Record type
export interface PersonalRecord {
  exerciseId: string
  exerciseName: string
  exerciseNameHe: string
  imageUrl?: string
  bestWeight: number
  bestReps: number
  bestDate: Date
  previousWeight?: number
  previousReps?: number
  previousDate?: Date
  workoutCount: number // How many times this exercise was performed
  hasImproved: boolean // True if best > previous
  isBodyweight: boolean // True if this is a bodyweight exercise (weight always 0)
  maxVolume?: number   // Max exercise volume (sum of weight × reps in a single workout)
  maxVolumeDate?: Date // Date when max volume was achieved
}

// Get personal records for all exercises
export async function getPersonalRecords(userId: string): Promise<PersonalRecord[]> {
  const historyRef = collection(db, COLLECTION_NAME)

  // Get all workouts for the user (filter status client-side to avoid composite index)
  const q = query(
    historyRef,
    where('userId', '==', userId),
    orderBy('date', 'desc')
  )

  const snapshot = await getDocs(q)

  console.log('🏆 PR Query: Found', snapshot.docs.length, 'workouts for user')

  // Track exercise data
  const exerciseMap: Map<string, {
    exerciseId: string
    exerciseName: string
    exerciseNameHe: string
    imageUrl?: string
    records: { weight: number; reps: number; date: Date }[]
    workoutCount: number
    isBodyweight: boolean // All recorded weights are 0
    maxVolume: number
    maxVolumeDate?: Date
  }> = new Map()

  // Process all workouts (filter completed + non-deleted client-side)
  for (const docSnap of snapshot.docs) {
    const data = docSnap.data()

    // Skip soft-deleted workouts
    if (!isNotSoftDeleted(data)) continue

    // Skip non-completed workouts
    if (data.status !== 'completed') {
      console.log('🏆 Skipping workout with status:', data.status)
      continue
    }
    console.log('🏆 Processing completed workout:', docSnap.id)

    const workoutDate = data.date?.toDate() || new Date()
    const exercises = data.exercises || []

    for (const exercise of exercises) {
      if (!exercise.sets || exercise.sets.length === 0) continue

      // Find best set in this workout (highest weight with actual reps)
      // Exclude warmup sets from personal records calculation
      const validSets = exercise.sets.filter((set: any) =>
        set.type !== 'warmup' &&
        ((set.actualReps && set.actualReps > 0) || set.completed)
      )

      if (validSets.length === 0) continue

      // Check if this is a bodyweight exercise (all weights are 0 or undefined)
      const allWeightsZero = validSets.every((set: any) => !set.actualWeight || set.actualWeight === 0)

      // Find best set: for bodyweight exercises compare by reps, otherwise by weight
      const bestSet = validSets.reduce((best: any, current: any) => {
        if (allWeightsZero) {
          // Bodyweight: compare by reps
          const currentReps = current.actualReps || 0
          const bestReps = best.actualReps || 0
          return currentReps > bestReps ? current : best
        } else {
          // Regular: compare by weight, then by reps if equal
          const currentWeight = current.actualWeight || 0
          const bestWeight = best.actualWeight || 0
          if (currentWeight > bestWeight) return current
          if (currentWeight === bestWeight) {
            const currentReps = current.actualReps || 0
            const bestReps = best.actualReps || 0
            return currentReps > bestReps ? current : best
          }
          return best
        }
      }, validSets[0])

      const weight = bestSet.actualWeight || 0
      const reps = bestSet.actualReps || bestSet.targetReps || 0

      if (weight === 0 && reps === 0) continue

      // Calculate exercise volume for this workout (use saved value or calculate from sets)
      const exerciseVolume = exercise.exerciseVolume ?? calculateExerciseVolumeFromHistory(validSets)

      const existing = exerciseMap.get(exercise.exerciseId)

      if (existing) {
        existing.records.push({ weight, reps, date: workoutDate })
        existing.workoutCount++
        // Update isBodyweight - stays true only if ALL records have weight 0
        if (weight > 0) existing.isBodyweight = false
        // Track max volume
        if (exerciseVolume > existing.maxVolume) {
          existing.maxVolume = exerciseVolume
          existing.maxVolumeDate = workoutDate
        }
      } else {
        exerciseMap.set(exercise.exerciseId, {
          exerciseId: exercise.exerciseId,
          exerciseName: exercise.exerciseName || '',
          exerciseNameHe: exercise.exerciseNameHe || '',
          imageUrl: exercise.imageUrl,
          records: [{ weight, reps, date: workoutDate }],
          workoutCount: 1,
          isBodyweight: allWeightsZero, // Start with whether this workout had all 0 weights
          maxVolume: exerciseVolume,
          maxVolumeDate: exerciseVolume > 0 ? workoutDate : undefined,
        })
      }
    }
  }

  // Convert to PersonalRecord array
  const results: PersonalRecord[] = []

  for (const [, data] of exerciseMap) {
    let bestRecord: { weight: number; reps: number; date: Date }
    let secondBestRecord: { weight: number; reps: number; date: Date } | undefined
    let hasImproved = false

    if (data.isBodyweight) {
      // Bodyweight exercises: sort by REPS descending
      const sortedByReps = [...data.records].sort((a, b) => b.reps - a.reps)
      bestRecord = sortedByReps[0]
      secondBestRecord = sortedByReps.length > 1 ? sortedByReps[1] : undefined

      // Sort by DATE to find most recent workout
      const sortedByDate = [...data.records].sort((a, b) => b.date.getTime() - a.date.getTime())
      const mostRecentRecord = sortedByDate[0]

      // hasImproved for bodyweight = most recent achieved best reps AND better than previous
      hasImproved = secondBestRecord
        ? (mostRecentRecord.reps === bestRecord.reps &&
           mostRecentRecord.date.getTime() === bestRecord.date.getTime() &&
           bestRecord.reps > secondBestRecord.reps)
        : false
    } else {
      // Regular exercises: sort by WEIGHT descending, then by reps
      const sortedByWeight = [...data.records].sort((a, b) => {
        if (b.weight !== a.weight) return b.weight - a.weight
        return b.reps - a.reps // Secondary sort by reps
      })
      bestRecord = sortedByWeight[0]
      secondBestRecord = sortedByWeight.length > 1 ? sortedByWeight[1] : undefined

      // Sort by DATE to find most recent workout
      const sortedByDate = [...data.records].sort((a, b) => b.date.getTime() - a.date.getTime())
      const mostRecentRecord = sortedByDate[0]

      // hasImproved for regular = most recent achieved best weight AND better than previous
      hasImproved = secondBestRecord
        ? (mostRecentRecord.weight === bestRecord.weight &&
           mostRecentRecord.date.getTime() === bestRecord.date.getTime() &&
           (bestRecord.weight > secondBestRecord.weight ||
            (bestRecord.weight === secondBestRecord.weight && bestRecord.reps > secondBestRecord.reps)))
        : false
    }

    const logType = data.isBodyweight ? 'BW' : 'WT'
    console.log(`🏆 [${logType}] ${data.exerciseNameHe}: best=${bestRecord.weight}kg/${bestRecord.reps}reps, secondBest=${secondBestRecord?.weight}kg/${secondBestRecord?.reps}reps, improved=${hasImproved}`)

    results.push({
      exerciseId: data.exerciseId,
      exerciseName: data.exerciseName,
      exerciseNameHe: data.exerciseNameHe,
      imageUrl: data.imageUrl,
      bestWeight: bestRecord.weight,
      bestReps: bestRecord.reps,
      bestDate: bestRecord.date,
      previousWeight: secondBestRecord?.weight,
      previousReps: secondBestRecord?.reps,
      previousDate: secondBestRecord?.date,
      workoutCount: data.workoutCount,
      hasImproved,
      isBodyweight: data.isBodyweight,
      maxVolume: data.maxVolume > 0 ? data.maxVolume : undefined,
      maxVolumeDate: data.maxVolumeDate,
    })
  }

  // Sort by workout count (most frequent first)
  results.sort((a, b) => b.workoutCount - a.workoutCount)

  console.log('🏆 PR Results:', results.length, 'exercises with records')
  console.log('🏆 Improvements:', results.filter(r => r.hasImproved).length)

  return results
}

// Update an existing workout (used for starting a planned workout)
export async function updateWorkoutHistory(
  workoutId: string,
  updates: Partial<{
    status: string
    startTime: Date
    date: Date
  }>
): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, workoutId)

  const updateData: Record<string, any> = {}

  if (updates.status) {
    updateData.status = updates.status
  }

  if (updates.startTime) {
    updateData.startTime = Timestamp.fromDate(updates.startTime)
  }

  if (updates.date) {
    updateData.date = Timestamp.fromDate(updates.date)
  }

  console.log('📝 Updating workout:', workoutId, updateData)

  try {
    await updateDoc(docRef, updateData)
    console.log('✅ Workout updated successfully')
  } catch (error: any) {
    console.error('❌ Failed to update workout:', error)
    throw error
  }
}

// Soft-delete a workout (marks as deleted, data stays in Firestore)
export async function softDeleteWorkout(workoutId: string, reason?: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, workoutId)
  await updateDoc(docRef, {
    deletedByTrainee: {
      deletedAt: Timestamp.now(),
      ...(reason && { reason }),
    },
  })
}

// Delete a workout from history (hard delete - kept for admin tools)
export async function deleteWorkoutHistory(workoutId: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, workoutId)

  console.log('🗑️ Deleting workout:', workoutId)

  try {
    await deleteDoc(docRef)
    console.log('✅ Workout deleted successfully')
  } catch (error: any) {
    console.error('❌ Failed to delete workout:', error)
    throw error
  }
}

// Get user's in-progress workout (for recovery after app close)
export async function getInProgressWorkout(userId: string): Promise<WorkoutHistoryEntry | null> {
  const historyRef = collection(db, COLLECTION_NAME)

  // Query for in_progress workouts, get most recent
  const q = query(
    historyRef,
    where('userId', '==', userId),
    where('status', '==', 'in_progress'),
    orderBy('date', 'desc'),
    limit(1)
  )

  console.log('🔍 Looking for in_progress workout for user:', userId)

  try {
    const snapshot = await getDocs(q)

    if (snapshot.empty) {
      console.log('📭 No in_progress workout found')
      return null
    }

    // Skip soft-deleted workouts
    const validDocs = snapshot.docs.filter(d => isNotSoftDeleted(d.data()))
    if (validDocs.length === 0) {
      console.log('📭 No non-deleted in_progress workout found')
      return null
    }

    const activeDoc = validDocs[0]
    console.log('✅ Found in_progress workout:', activeDoc.id)
    return toWorkoutHistory(activeDoc.id, activeDoc.data())
  } catch (error: any) {
    console.error('❌ Failed to get in_progress workout:', error)
    return null
  }
}

// Find the planned workoutHistory doc for a given program day (if any).
// Used when a trainee starts an assigned workout from TraineeProgramView — we need
// to resume the existing planned doc instead of creating a duplicate completed one.
export async function findPlannedWorkoutForProgramDay(
  userId: string,
  programId: string,
  programDayLabel: string
): Promise<WorkoutHistoryEntry | null> {
  try {
    const historyRef = collection(db, COLLECTION_NAME)
    const q = query(
      historyRef,
      where('userId', '==', userId),
      where('programId', '==', programId),
      where('programDayLabel', '==', programDayLabel),
      where('status', '==', 'planned'),
      orderBy('date', 'asc'),
      limit(1)
    )
    const snapshot = await getDocs(q)
    if (snapshot.empty) return null
    const validDocs = snapshot.docs.filter(d => isNotSoftDeleted(d.data()))
    if (validDocs.length === 0) return null
    const d = validDocs[0]
    return toWorkoutHistory(d.id, d.data())
  } catch (error) {
    console.error('❌ Failed to find planned workout for program day:', error)
    return null
  }
}

// Auto-save workout in progress (create or update)
export async function autoSaveWorkout(
  workoutId: string | null,
  workout: Omit<WorkoutHistoryEntry, 'id'>
): Promise<string> {
  const cleanWorkout = removeUndefined({
    userId: workout.userId,
    name: workout.name || 'אימון',
    date: Timestamp.fromDate(workout.date),
    startTime: Timestamp.fromDate(workout.startTime),
    endTime: Timestamp.fromDate(workout.endTime),
    duration: workout.duration || 0,
    status: 'in_progress', // Always in_progress for auto-save
    exercises: workout.exercises.map(ex => ({
      exerciseId: ex.exerciseId,
      exerciseName: ex.exerciseName,
      exerciseNameHe: ex.exerciseNameHe,
      imageUrl: ex.imageUrl || '',
      category: ex.category || '',
      isCompleted: ex.isCompleted,
      notes: ex.notes || '',
      sets: ex.sets.map(set => ({
        type: set.type,
        targetReps: set.targetReps || 0,
        targetWeight: set.targetWeight || 0,
        actualReps: set.actualReps || 0,
        actualWeight: set.actualWeight || 0,
        completed: set.completed || false,
        // Extended fields (only include if defined - Firebase doesn't accept undefined)
        ...(set.time !== undefined && set.time > 0 && { time: set.time }),
        ...(set.intensity !== undefined && set.intensity > 0 && { intensity: set.intensity }),
        ...(set.speed !== undefined && set.speed > 0 && { speed: set.speed }),
        ...(set.distance !== undefined && set.distance > 0 && { distance: set.distance }),
        ...(set.incline !== undefined && set.incline > 0 && { incline: set.incline }),
        ...(set.zone !== undefined && set.zone > 0 && { zone: set.zone }),
        // Assistance fields
        ...(set.assistanceWeight !== undefined && { assistanceWeight: set.assistanceWeight }),
        ...(set.assistanceBand && { assistanceBand: set.assistanceBand }),
      })),
    })),
    completedExercises: workout.completedExercises || 0,
    totalExercises: workout.totalExercises || 0,
    completedSets: workout.completedSets || 0,
    totalSets: workout.totalSets || 0,
    totalVolume: workout.totalVolume || 0,
    personalRecords: workout.personalRecords || 0,
    lastUpdated: Timestamp.now(),
    // Source & program fields (same as saveWorkoutHistory)
    source: workout.source,
    programId: workout.programId,
    programDayLabel: workout.programDayLabel,
    // Trainer report fields
    reportedBy: workout.reportedBy,
    reportedByName: workout.reportedByName,
  })

  try {
    if (workoutId) {
      // Update existing workout
      const docRef = doc(db, COLLECTION_NAME, workoutId)
      await updateDoc(docRef, cleanWorkout)
      console.log('💾 Auto-save: Updated workout', workoutId)
      return workoutId
    } else {
      // Create new workout
      const historyRef = collection(db, COLLECTION_NAME)
      ;(cleanWorkout as any).createdAt = Timestamp.now()
      const docRef = await addDoc(historyRef, cleanWorkout)
      console.log('💾 Auto-save: Created workout', docRef.id)
      return docRef.id
    }
  } catch (error: any) {
    console.error('❌ Auto-save failed:', error)
    throw error
  }
}

// Exercise history entry for PR screen
export interface ExerciseHistoryEntry {
  date: Date
  bestWeight: number
  bestReps: number
  setCount: number // Number of sets performed
  bestTime?: number // For time-based exercises (in seconds)
  isOverallBest: boolean // Is this the all-time best?
}

// Get exercise history grouped by date with best values per date
export async function getExerciseHistory(
  userId: string,
  exerciseId: string
): Promise<ExerciseHistoryEntry[]> {
  const historyRef = collection(db, COLLECTION_NAME)

  // Get all completed workouts for the user
  const q = query(
    historyRef,
    where('userId', '==', userId),
    orderBy('date', 'desc')
  )

  const snapshot = await getDocs(q)

  // Map: date string -> best values for that date
  const dateMap: Map<string, { date: Date; weight: number; reps: number; setCount: number; time?: number }> = new Map()
  let isBodyweightExercise = true // Assume bodyweight until we see a weight > 0

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data()

    // Skip soft-deleted workouts
    if (!isNotSoftDeleted(data)) continue

    // Skip non-completed workouts
    if (data.status !== 'completed') continue

    const workoutDate = data.date?.toDate() || new Date()
    const dateKey = workoutDate.toISOString().split('T')[0] // YYYY-MM-DD

    const exercises = data.exercises || []
    const exercise = exercises.find((ex: any) => ex.exerciseId === exerciseId)

    if (!exercise || !exercise.sets || exercise.sets.length === 0) continue

    // Find best set for this exercise in this workout (exclude warmup)
    const validSets = exercise.sets.filter((set: any) =>
      set.type !== 'warmup' &&
      ((set.actualReps && set.actualReps > 0) || set.completed)
    )

    if (validSets.length === 0) continue

    // Check if any set has weight > 0
    if (validSets.some((set: any) => (set.actualWeight || 0) > 0)) {
      isBodyweightExercise = false
    }

    // Find best values
    let bestWeight = 0
    let bestReps = 0

    for (const set of validSets) {
      const weight = set.actualWeight || 0
      const reps = set.actualReps || 0

      if (isBodyweightExercise) {
        // Bodyweight: best = highest reps
        if (reps > bestReps) {
          bestReps = reps
          bestWeight = weight
        }
      } else {
        // Regular: best = highest weight, then reps
        if (weight > bestWeight) {
          bestWeight = weight
          bestReps = reps
        } else if (weight === bestWeight && reps > bestReps) {
          bestReps = reps
        }
      }
    }

    // Update date map - keep best values for each date, sum up sets
    const existing = dateMap.get(dateKey)
    const currentSetCount = validSets.length

    if (!existing) {
      // First entry for this date
      dateMap.set(dateKey, {
        date: workoutDate,
        weight: bestWeight,
        reps: bestReps,
        setCount: currentSetCount,
      })
    } else {
      // Update existing entry: sum sets, keep best weight/reps
      const shouldUpdateBest = isBodyweightExercise
        ? bestReps > existing.reps
        : (bestWeight > existing.weight || (bestWeight === existing.weight && bestReps > existing.reps))

      dateMap.set(dateKey, {
        date: workoutDate,
        weight: shouldUpdateBest ? bestWeight : existing.weight,
        reps: shouldUpdateBest ? bestReps : existing.reps,
        setCount: existing.setCount + currentSetCount, // Sum up sets from multiple workouts
      })
    }
  }

  // Convert to array and find overall best
  const entries = Array.from(dateMap.values())

  // Find overall best (by reps for bodyweight, by weight for regular)
  let overallBestWeight = 0
  let overallBestReps = 0
  for (const entry of entries) {
    if (isBodyweightExercise) {
      if (entry.reps > overallBestReps) {
        overallBestReps = entry.reps
      }
    } else {
      if (entry.weight > overallBestWeight) {
        overallBestWeight = entry.weight
      }
    }
  }

  // Sort by date descending (most recent first)
  entries.sort((a, b) => b.date.getTime() - a.date.getTime())

  // Mark overall best - only on the most recent entry that achieved it
  let bestAlreadyMarked = false
  return entries.map(entry => {
    const isBest = !bestAlreadyMarked && (isBodyweightExercise
      ? entry.reps === overallBestReps && overallBestReps > 0
      : entry.weight === overallBestWeight && overallBestWeight > 0)
    if (isBest) bestAlreadyMarked = true
    return {
      date: entry.date,
      bestWeight: entry.weight,
      bestReps: entry.reps,
      setCount: entry.setCount,
      bestTime: entry.time,
      isOverallBest: isBest,
    }
  })
}

// Get exercise IDs that were done recently:
// 1. All exercises from last completed workout
// 2. Completed exercises from current in-progress workout
export async function getRecentlyDoneExerciseIds(userId: string): Promise<Set<string>> {
  const result = new Set<string>()
  const historyRef = collection(db, COLLECTION_NAME)

  try {
    // Get recent workouts (uses existing index: userId + date)
    const recentQuery = query(
      historyRef,
      where('userId', '==', userId),
      orderBy('date', 'desc'),
      limit(10)
    )

    const snapshot = await getDocs(recentQuery)
    console.log('📋 Found', snapshot.docs.length, 'recent workouts')

    // 1. Find last completed workout (skip soft-deleted)
    let foundCompleted = false
    for (const doc of snapshot.docs) {
      const data = doc.data()
      if (!isNotSoftDeleted(data)) continue

      if (!foundCompleted && data.status === 'completed') {
        // First completed workout - add all exercises
        const exercises = data.exercises || []
        console.log('📋 Last completed workout has', exercises.length, 'exercises')
        for (const ex of exercises) {
          if (ex.exerciseId) {
            result.add(ex.exerciseId)
          }
        }
        foundCompleted = true
      }

      // 2. Check for in-progress workout - only completed exercises
      if (data.status === 'in_progress') {
        const exercises = data.exercises || []
        for (const ex of exercises) {
          if (ex.isCompleted && ex.exerciseId) {
            result.add(ex.exerciseId)
          }
        }
      }
    }

    console.log('📋 Recently done exercises:', result.size, Array.from(result))
    return result
  } catch (error) {
    console.error('❌ Error getting recently done exercises:', error)
    return result
  }
}

// Get weekly completed sets per primaryMuscle for the current week (Sunday to now)
// exerciseLookup maps exerciseId -> { primaryMuscle } (caller provides to avoid extra Firebase read)
export async function getWeeklyMuscleSets(
  userId: string,
  exerciseLookup: Map<string, { primaryMuscle: string }>
): Promise<Map<string, number>> {
  const result = new Map<string, number>()

  try {
    // Calculate start of current week (Sunday)
    const now = new Date()
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay()) // Sunday
    startOfWeek.setHours(0, 0, 0, 0)

    const workouts = await getUserWorkoutHistoryByDateRange(userId, startOfWeek, now)

    for (const workout of workouts) {
      if (workout.status !== 'completed') continue

      for (const exercise of workout.exercises) {
        const exDef = exerciseLookup.get(exercise.exerciseId)
        const primaryMuscle = exDef?.primaryMuscle || 'other'

        for (const set of exercise.sets) {
          if (!set.completed) continue
          const current = result.get(primaryMuscle) || 0
          result.set(primaryMuscle, current + 1)
        }
      }
    }

    return result
  } catch (error) {
    console.error('❌ Error getting weekly muscle sets:', error)
    return result
  }
}

/**
 * Get weekly completed sets grouped by category (muscle group).
 * Used by active workout screen for real-time weekly progress display.
 */
export async function getWeeklySetsByCategory(
  userId: string
): Promise<Map<string, number>> {
  const result = new Map<string, number>()

  try {
    const now = new Date()
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay()) // Sunday
    startOfWeek.setHours(0, 0, 0, 0)

    const workouts = await getUserWorkoutHistoryByDateRange(userId, startOfWeek, now)

    for (const workout of workouts) {
      if (workout.status !== 'completed') continue

      for (const exercise of workout.exercises) {
        const category = exercise.category || 'other'

        for (const set of exercise.sets) {
          if (!set.completed) continue
          const current = result.get(category) || 0
          result.set(category, current + 1)
        }
      }
    }

    return result
  } catch (error) {
    console.error('❌ Error getting weekly sets by category:', error)
    return result
  }
}

// Complete a workout (change status from in_progress to completed)
export async function completeWorkout(
  workoutId: string,
  updates: {
    status: 'completed' | 'partial' | 'cancelled'
    endTime: Date
    duration: number
    exercises: any[]
    completedExercises: number
    totalExercises: number
    completedSets: number
    totalSets: number
    totalVolume: number
    calories?: number
  }
): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, workoutId)

  const updateData: Record<string, any> = {
    status: updates.status,
    endTime: Timestamp.fromDate(updates.endTime),
    duration: updates.duration,
    exercises: updates.exercises.map((ex: any) => ({
      exerciseId: ex.exerciseId,
      exerciseName: ex.exerciseName,
      exerciseNameHe: ex.exerciseNameHe,
      imageUrl: ex.imageUrl || '',
      category: ex.category || '',
      isCompleted: ex.isCompleted,
      notes: ex.notes || '',
      ...(ex.exerciseVolume !== undefined && ex.exerciseVolume > 0 && { exerciseVolume: ex.exerciseVolume }),
      sets: ex.sets.map((set: any) => ({
        type: set.type,
        targetReps: set.targetReps || 0,
        targetWeight: set.targetWeight || 0,
        actualReps: set.actualReps || 0,
        actualWeight: set.actualWeight || 0,
        completed: set.completed || false,
        // Extended fields (only include if defined - Firebase doesn't accept undefined)
        ...(set.time !== undefined && set.time > 0 && { time: set.time }),
        ...(set.intensity !== undefined && set.intensity > 0 && { intensity: set.intensity }),
        ...(set.speed !== undefined && set.speed > 0 && { speed: set.speed }),
        ...(set.distance !== undefined && set.distance > 0 && { distance: set.distance }),
        ...(set.incline !== undefined && set.incline > 0 && { incline: set.incline }),
        ...(set.zone !== undefined && set.zone > 0 && { zone: set.zone }),
        // Assistance fields
        ...(set.assistanceWeight !== undefined && { assistanceWeight: set.assistanceWeight }),
        ...(set.assistanceBand && { assistanceBand: set.assistanceBand }),
      })),
    })),
    completedExercises: updates.completedExercises,
    totalExercises: updates.totalExercises,
    completedSets: updates.completedSets,
    totalSets: updates.totalSets,
    totalVolume: updates.totalVolume,
    lastUpdated: Timestamp.now(),
  }

  // Add calories if provided
  if (updates.calories !== undefined) {
    updateData.calories = updates.calories
  }

  console.log('🏁 Completing workout:', workoutId)

  try {
    await updateDoc(docRef, updateData)
    console.log('✅ Workout completed successfully')
  } catch (error: any) {
    console.error('❌ Failed to complete workout:', error)
    throw error
  }
}

// ============ WEIGHT RECOMMENDATIONS ============

/**
 * Extract a fingerprint of completed sets for comparison.
 * Returns an array of { weight, reps } for each completed set, in order.
 */
function getCompletedSetsFingerprint(sets: any[]): { weight: number; reps: number }[] {
  return sets
    .filter((set: any) => set.completed || set.actualReps > 0)
    .map((set: any) => ({
      weight: set.actualWeight || set.targetWeight || 0,
      reps: set.actualReps || set.targetReps || 0,
    }))
}

/**
 * Check if two sets fingerprints are identical
 */
function areFingerprintsIdentical(
  a: { weight: number; reps: number }[],
  b: { weight: number; reps: number }[]
): boolean {
  if (a.length !== b.length || a.length === 0) return false
  return a.every((set, i) => set.weight === b[i].weight && set.reps === b[i].reps)
}

/**
 * Calculate and save weight increase recommendations.
 * Checks if each weight-based exercise was performed identically across the last 3 self workouts.
 * Called fire-and-forget after self workout completion.
 */
export async function calculateAndSaveWeightRecommendations(
  userId: string,
  currentExercises: {
    exerciseId: string
    reportType?: string
    sets: { weight: number; reps: number }[]
  }[]
): Promise<void> {
  // Filter to weight-based exercises only
  const weightExercises = currentExercises.filter(
    (ex) => !ex.reportType || ex.reportType === 'weight_reps'
  )

  if (weightExercises.length === 0) return

  // Query recent self workouts (no source = self, exclude ai_trainer and trainer_program)
  const historyRef = collection(db, COLLECTION_NAME)
  const q = query(
    historyRef,
    where('userId', '==', userId),
    orderBy('date', 'desc'),
    limit(50)
  )

  const snapshot = await getDocs(q)

  // Filter to self workouts only (no source or source === 'manual', no reportedBy)
  const selfWorkouts = snapshot.docs
    .map((d) => d.data())
    .filter((data) => {
      if (!isNotSoftDeleted(data)) return false
      if (data.reportedBy) return false
      if (data.source && data.source !== 'manual') return false
      const status = data.status
      return status === 'completed' || status === 'partial'
    })

  // Build recommendations
  const recommendations: Record<string, { recommend: boolean; updatedAt: any }> = {}

  for (const exercise of weightExercises) {
    const currentFingerprint = exercise.sets.filter(
      (s) => s.reps > 0
    ).map((s) => ({ weight: s.weight, reps: s.reps }))

    if (currentFingerprint.length === 0) {
      recommendations[exercise.exerciseId] = { recommend: false, updatedAt: serverTimestamp() }
      continue
    }

    // Find 2 previous self workouts containing this exercise
    const previousFingerprints: { weight: number; reps: number }[][] = []

    for (const workoutData of selfWorkouts) {
      if (previousFingerprints.length >= 2) break

      const exercises = workoutData.exercises || []
      const matchingExercise = exercises.find(
        (ex: any) => ex.exerciseId === exercise.exerciseId
      )

      if (matchingExercise?.sets?.length > 0) {
        const fingerprint = getCompletedSetsFingerprint(matchingExercise.sets)
        if (fingerprint.length > 0) {
          previousFingerprints.push(fingerprint)
        }
      }
    }

    // Need exactly 2 previous workouts (+ current = 3 total)
    if (previousFingerprints.length < 2) {
      recommendations[exercise.exerciseId] = { recommend: false, updatedAt: serverTimestamp() }
      continue
    }

    // Check if all 3 are identical
    const allIdentical =
      areFingerprintsIdentical(currentFingerprint, previousFingerprints[0]) &&
      areFingerprintsIdentical(currentFingerprint, previousFingerprints[1])

    recommendations[exercise.exerciseId] = { recommend: allIdentical, updatedAt: serverTimestamp() }
  }

  // Write to Firestore (merge to preserve other exercises' recommendations)
  if (Object.keys(recommendations).length > 0) {
    const recDocRef = doc(db, 'exerciseRecommendations', userId)
    await setDoc(recDocRef, { userId, ...recommendations }, { merge: true })
    console.log('💡 Weight recommendations saved for', Object.keys(recommendations).length, 'exercises')
  }
}

/**
 * Get weight increase recommendations for a user.
 * Returns a map of exerciseId → recommend boolean.
 */
export async function getWeightRecommendations(
  userId: string
): Promise<Record<string, boolean>> {
  const recDocRef = doc(db, 'exerciseRecommendations', userId)
  const snapshot = await getDoc(recDocRef)

  if (!snapshot.exists()) return {}

  const data = snapshot.data()
  const result: Record<string, boolean> = {}

  for (const [exerciseId, value] of Object.entries(data)) {
    if (exerciseId === 'userId') continue // skip the userId field
    if (value && typeof value === 'object' && 'recommend' in value) {
      result[exerciseId] = (value as any).recommend === true
    }
  }

  return result
}

// Get full workout history for a user within a date range (for admin reports)
export async function getUserWorkoutHistoryByDateRange(
  userId: string,
  fromDate: Date,
  toDate: Date
): Promise<WorkoutHistoryEntry[]> {
  const historyRef = collection(db, COLLECTION_NAME)
  const q = query(
    historyRef,
    where('userId', '==', userId),
    where('date', '>=', Timestamp.fromDate(fromDate)),
    where('date', '<=', Timestamp.fromDate(toDate)),
    orderBy('date', 'desc')
  )

  try {
    const snapshot = await getDocs(q)
    const docs = snapshot.docs.filter(d => isNotSoftDeleted(d.data()))
    return docs.map(doc => toWorkoutHistory(doc.id, doc.data()))
  } catch (error) {
    console.error('Error fetching workout history by date range:', error)
    throw error
  }
}

// ============ TRAINER WORKOUT EDITING ============

/**
 * Check if a workout can be edited by a trainer.
 * Returns { editable: true } or { editable: false, reason: string }
 */
export async function isWorkoutEditable(workoutId: string): Promise<{ editable: boolean; reason?: string }> {
  const docRef = doc(db, COLLECTION_NAME, workoutId)
  const snapshot = await getDoc(docRef)

  if (!snapshot.exists()) {
    return { editable: false, reason: 'האימון לא נמצא' }
  }

  const data = snapshot.data()
  if (data.status === 'in_progress') {
    return { editable: false, reason: 'המתאמן באמצע אימון פעיל — לא ניתן לערוך כרגע' }
  }

  return { editable: true }
}

/**
 * Trainer edits a workout's exercises in the trainee's workout history.
 * Performs optimistic locking: re-fetches the document before saving to prevent
 * conflicts if the trainee started the workout in the meantime.
 */
export async function trainerEditWorkout(
  workoutId: string,
  updates: {
    exercises: WorkoutHistoryEntry['exercises']
    lastEditedByTrainer: {
      trainerId: string
      trainerName: string
      editSummary: string
    }
  }
): Promise<void> {
  // Optimistic lock: re-fetch and check status
  const editableCheck = await isWorkoutEditable(workoutId)
  if (!editableCheck.editable) {
    throw new Error(editableCheck.reason || 'לא ניתן לערוך את האימון')
  }

  // Calculate aggregates from the updated exercises
  const totalExercises = updates.exercises.length
  const completedExercises = updates.exercises.filter(ex => ex.isCompleted).length
  const totalSets = updates.exercises.reduce((sum, ex) => sum + (ex.sets?.length || 0), 0)
  const completedSets = updates.exercises.reduce(
    (sum, ex) => sum + (ex.sets?.filter(s => s.completed || (s.actualReps && s.actualReps > 0)).length || 0),
    0
  )
  const totalVolume = updates.exercises.reduce((sum, ex) => {
    const exVolume = (ex.sets || []).reduce((setSum, s) => {
      if (s.completed || (s.actualReps && s.actualReps > 0)) {
        return setSum + (s.actualWeight || 0) * (s.actualReps || 0)
      }
      return setSum
    }, 0)
    return sum + exVolume
  }, 0)

  // Recalculate per-exercise volume
  const exercisesWithVolume = updates.exercises.map(ex => ({
    ...ex,
    exerciseVolume: (ex.sets || []).reduce((setSum, s) => {
      if (s.completed || (s.actualReps && s.actualReps > 0)) {
        return setSum + (s.actualWeight || 0) * (s.actualReps || 0)
      }
      return setSum
    }, 0),
  }))

  const docRef = doc(db, COLLECTION_NAME, workoutId)
  const updateData = removeUndefined({
    exercises: exercisesWithVolume,
    totalExercises,
    completedExercises,
    totalSets,
    completedSets,
    totalVolume,
    lastEditedByTrainer: {
      trainerId: updates.lastEditedByTrainer.trainerId,
      trainerName: updates.lastEditedByTrainer.trainerName,
      editedAt: serverTimestamp(),
      editSummary: updates.lastEditedByTrainer.editSummary,
    },
  })

  await updateDoc(docRef, updateData)
}
