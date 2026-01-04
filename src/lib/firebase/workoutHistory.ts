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
    notes: data.notes,
  }
}

// Convert to summary for list display
function toSummary(entry: WorkoutHistoryEntry): WorkoutHistorySummary {
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
      isCompleted: ex.isCompleted,
      sets: ex.sets.map(set => ({
        type: set.type,
        targetReps: set.targetReps || 0,
        targetWeight: set.targetWeight || 0,
        actualReps: set.actualReps || 0,
        actualWeight: set.actualWeight || 0,
        completed: set.completed || false,
      })),
    })),
    completedExercises: workout.completedExercises || 0,
    totalExercises: workout.totalExercises || 0,
    completedSets: workout.completedSets || 0,
    totalSets: workout.totalSets || 0,
    totalVolume: workout.totalVolume || 0,
    personalRecords: workout.personalRecords || 0,
    createdAt: Timestamp.now(),
  })

  // Add notes only if exists
  if (workout.notes) {
    (cleanWorkout as any).notes = workout.notes
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
    totalVolume,
    currentStreak,
  }
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
