/**
 * Firebase service for workout history
 */
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
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
  }
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
  limitCount: number = 50
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
    const results = snapshot.docs.map(doc => {
      console.log('📖 Workout doc:', doc.id, doc.data())
      const entry = toWorkoutHistory(doc.id, doc.data())
      return toSummary(entry)
    })
    return results
  } catch (error) {
    console.error('❌ Error fetching workout history:', error)
    throw error
  }
}

// Get full workout history entries (with exercise data) for AI context
export async function getUserWorkoutHistoryFull(
  userId: string,
  limitCount: number = 10
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
    return snapshot.docs.map(doc => toWorkoutHistory(doc.id, doc.data()))
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

  // Search through workouts to find the exercise
  for (const doc of snapshot.docs) {
    const data = doc.data()
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

  // Search through workouts to find each exercise
  for (const doc of snapshot.docs) {
    // Stop if we found all exercises
    if (foundExercises.size === exerciseIds.length) break

    const data = doc.data()
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
  const workouts = snapshot.docs.map(doc => toWorkoutHistory(doc.id, doc.data()))

  // Calculate this week's workouts
  const now = new Date()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - now.getDay())
  weekStart.setHours(0, 0, 0, 0)

  const thisWeekWorkouts = workouts.filter(w => w.date >= weekStart).length

  // Calculate this month's workouts (1st of current month to end of month)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  monthStart.setHours(0, 0, 0, 0)
  const thisMonthWorkouts = workouts.filter(w => w.date >= monthStart).length

  // Calculate total volume
  const totalVolume = workouts.reduce((sum, w) => sum + w.totalVolume, 0)

  // Calculate streak (consecutive days with workouts)
  let currentStreak = 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (let i = 0; i < 365; i++) {
    const checkDate = new Date(today)
    checkDate.setDate(today.getDate() - i)

    const hasWorkout = workouts.some(w => {
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
    totalWorkouts: workouts.length,
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
  }> = new Map()

  // Process all workouts (filter completed client-side)
  for (const docSnap of snapshot.docs) {
    const data = docSnap.data()

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

      const existing = exerciseMap.get(exercise.exerciseId)

      if (existing) {
        existing.records.push({ weight, reps, date: workoutDate })
        existing.workoutCount++
        // Update isBodyweight - stays true only if ALL records have weight 0
        if (weight > 0) existing.isBodyweight = false
      } else {
        exerciseMap.set(exercise.exerciseId, {
          exerciseId: exercise.exerciseId,
          exerciseName: exercise.exerciseName || '',
          exerciseNameHe: exercise.exerciseNameHe || '',
          imageUrl: exercise.imageUrl,
          records: [{ weight, reps, date: workoutDate }],
          workoutCount: 1,
          isBodyweight: allWeightsZero, // Start with whether this workout had all 0 weights
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

// Delete a workout from history
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

    const doc = snapshot.docs[0]
    console.log('✅ Found in_progress workout:', doc.id)
    return toWorkoutHistory(doc.id, doc.data())
  } catch (error: any) {
    console.error('❌ Failed to get in_progress workout:', error)
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

  // Mark overall best
  return entries.map(entry => ({
    date: entry.date,
    bestWeight: entry.weight,
    bestReps: entry.reps,
    setCount: entry.setCount,
    bestTime: entry.time,
    isOverallBest: isBodyweightExercise
      ? entry.reps === overallBestReps && overallBestReps > 0
      : entry.weight === overallBestWeight && overallBestWeight > 0,
  }))
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

    // 1. Find last completed workout
    let foundCompleted = false
    for (const doc of snapshot.docs) {
      const data = doc.data()

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

// Get exercise IDs that were done in the last 30 days
export async function getLastMonthExerciseIds(userId: string): Promise<Set<string>> {
  const result = new Set<string>()
  const historyRef = collection(db, COLLECTION_NAME)

  try {
    // Calculate date 30 days ago
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    thirtyDaysAgo.setHours(0, 0, 0, 0)

    // Query workouts from last 30 days (uses existing index: userId + date)
    const monthQuery = query(
      historyRef,
      where('userId', '==', userId),
      where('date', '>=', thirtyDaysAgo),
      orderBy('date', 'desc')
    )

    const snapshot = await getDocs(monthQuery)
    console.log('📅 Found', snapshot.docs.length, 'workouts in last 30 days')

    // Collect all exercises from completed workouts
    for (const doc of snapshot.docs) {
      const data = doc.data()

      // Only include completed workouts
      if (data.status === 'completed') {
        const exercises = data.exercises || []
        for (const ex of exercises) {
          if (ex.exerciseId) {
            result.add(ex.exerciseId)
          }
        }
      }
    }

    console.log('📅 Last month exercises:', result.size)
    return result
  } catch (error) {
    console.error('❌ Error getting last month exercises:', error)
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
    exercises: updates.exercises.map(ex => ({
      exerciseId: ex.exerciseId,
      exerciseName: ex.exerciseName,
      exerciseNameHe: ex.exerciseNameHe,
      imageUrl: ex.imageUrl || '',
      category: ex.category || '',
      isCompleted: ex.isCompleted,
      notes: ex.notes || '',
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
