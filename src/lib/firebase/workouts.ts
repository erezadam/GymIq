import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { db } from './config'
import type { WorkoutSession, WorkoutTemplate, WorkoutHistorySummary, WorkoutCompletionStatus, WorkoutExercise } from '@/domains/workouts/types'

// ============ WORKOUT SESSIONS ============

const SESSIONS_COLLECTION = 'workoutSessions'

export interface FirestoreWorkoutSession extends Omit<WorkoutSession, 'startTime' | 'endTime'> {
  startTime: Timestamp
  endTime?: Timestamp
}

// Start a new workout session
export const startWorkoutSession = async (
  userId: string,
  name: string,
  exercises: WorkoutExercise[],
  templateId?: string
): Promise<WorkoutSession> => {
  const session: Omit<WorkoutSession, 'id'> = {
    userId,
    name,
    templateId,
    exercises,
    status: 'active',
    startTime: new Date(),
    currentExerciseIndex: 0,
    currentSetIndex: 0,
    totalVolume: 0,
  }

  const docRef = await addDoc(collection(db, SESSIONS_COLLECTION), {
    ...session,
    startTime: serverTimestamp(),
  })

  return {
    id: docRef.id,
    ...session,
  }
}

// Update workout session (during workout)
export const updateWorkoutSession = async (
  sessionId: string,
  data: Partial<WorkoutSession>
): Promise<void> => {
  const docRef = doc(db, SESSIONS_COLLECTION, sessionId)
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

// Complete workout session
export const completeWorkoutSession = async (
  sessionId: string,
  exercises: WorkoutExercise[],
  totalVolume: number,
  notes?: string
): Promise<void> => {
  const docRef = doc(db, SESSIONS_COLLECTION, sessionId)
  await updateDoc(docRef, {
    status: 'completed',
    endTime: serverTimestamp(),
    exercises,
    totalVolume,
    notes,
  })
}

// Cancel workout session
export const cancelWorkoutSession = async (sessionId: string): Promise<void> => {
  const docRef = doc(db, SESSIONS_COLLECTION, sessionId)
  await updateDoc(docRef, {
    status: 'cancelled',
    endTime: serverTimestamp(),
  })
}

// Get user's active workout session
export const getActiveSession = async (userId: string): Promise<WorkoutSession | null> => {
  const q = query(
    collection(db, SESSIONS_COLLECTION),
    where('userId', '==', userId),
    where('status', '==', 'active'),
    limit(1)
  )

  const snapshot = await getDocs(q)
  if (snapshot.empty) return null

  const docSnapshot = snapshot.docs[0]
  const { id: _id, ...data } = docSnapshot.data() as FirestoreWorkoutSession

  return {
    id: docSnapshot.id,
    ...data,
    startTime: data.startTime.toDate(),
    endTime: data.endTime?.toDate(),
  }
}

// Get workout session by ID
export const getWorkoutSession = async (sessionId: string): Promise<WorkoutSession | null> => {
  const docRef = doc(db, SESSIONS_COLLECTION, sessionId)
  const docSnap = await getDoc(docRef)

  if (!docSnap.exists()) return null

  const { id: _id, ...data } = docSnap.data() as FirestoreWorkoutSession
  return {
    id: docSnap.id,
    ...data,
    startTime: data.startTime.toDate(),
    endTime: data.endTime?.toDate(),
  }
}

// ============ WORKOUT HISTORY ============

// Get user's workout history
export const getWorkoutHistory = async (
  userId: string,
  limitCount: number = 20
): Promise<WorkoutHistorySummary[]> => {
  const q = query(
    collection(db, SESSIONS_COLLECTION),
    where('userId', '==', userId),
    where('status', '==', 'completed'),
    orderBy('endTime', 'desc'),
    limit(limitCount)
  )

  const snapshot = await getDocs(q)

  return snapshot.docs.map((doc) => {
    const data = doc.data() as FirestoreWorkoutSession
    const startTime = data.startTime.toDate()
    const endTime = data.endTime?.toDate() || new Date()
    const durationMs = endTime.getTime() - startTime.getTime()

    // Map session status to completion status
    const completionStatus: WorkoutCompletionStatus =
      data.status === 'completed' ? 'completed' :
      data.status === 'cancelled' ? 'cancelled' : 'partial'

    return {
      id: doc.id,
      name: data.name,
      date: endTime,
      duration: Math.round(durationMs / 60000), // minutes
      status: completionStatus,
      completedExercises: data.exercises.length, // All exercises in completed workout
      totalExercises: data.exercises.length,
      totalVolume: data.totalVolume,
      personalRecords: 0, // TODO: Calculate PRs
    }
  })
}

// Get single workout history entry with full details
export const getWorkoutHistoryDetail = async (
  sessionId: string
): Promise<WorkoutSession | null> => {
  return getWorkoutSession(sessionId)
}

// ============ WORKOUT TEMPLATES ============

const TEMPLATES_COLLECTION = 'workoutTemplates'

// Get all templates (public + user's own)
export const getWorkoutTemplates = async (userId: string): Promise<WorkoutTemplate[]> => {
  const q = query(
    collection(db, TEMPLATES_COLLECTION),
    where('isPublic', '==', true)
  )

  const publicSnapshot = await getDocs(q)

  const userQ = query(
    collection(db, TEMPLATES_COLLECTION),
    where('createdBy', '==', userId),
    where('isPublic', '==', false)
  )

  const userSnapshot = await getDocs(userQ)

  const templates = [...publicSnapshot.docs, ...userSnapshot.docs].map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: (doc.data().createdAt as Timestamp)?.toDate() || new Date(),
    updatedAt: (doc.data().updatedAt as Timestamp)?.toDate() || new Date(),
  })) as WorkoutTemplate[]

  return templates
}

// Create workout template
export const createWorkoutTemplate = async (
  template: Omit<WorkoutTemplate, 'id' | 'createdAt' | 'updatedAt'>
): Promise<WorkoutTemplate> => {
  const docRef = await addDoc(collection(db, TEMPLATES_COLLECTION), {
    ...template,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  return {
    id: docRef.id,
    ...template,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

// Delete workout template
export const deleteWorkoutTemplate = async (templateId: string): Promise<void> => {
  const docRef = doc(db, TEMPLATES_COLLECTION, templateId)
  await deleteDoc(docRef)
}

// ============ STATISTICS ============

// Get user's workout stats
export const getUserWorkoutStats = async (userId: string) => {
  const q = query(
    collection(db, SESSIONS_COLLECTION),
    where('userId', '==', userId),
    where('status', '==', 'completed')
  )

  const snapshot = await getDocs(q)

  let totalWorkouts = 0
  let totalVolume = 0
  let totalDuration = 0
  const workoutsThisWeek: string[] = []
  const oneWeekAgo = new Date()
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

  snapshot.docs.forEach((doc) => {
    const data = doc.data() as FirestoreWorkoutSession
    totalWorkouts++
    totalVolume += data.totalVolume || 0

    const startTime = data.startTime.toDate()
    const endTime = data.endTime?.toDate() || new Date()
    totalDuration += (endTime.getTime() - startTime.getTime()) / 60000

    if (endTime > oneWeekAgo) {
      workoutsThisWeek.push(doc.id)
    }
  })

  return {
    totalWorkouts,
    totalVolume,
    totalDuration: Math.round(totalDuration),
    workoutsThisWeek: workoutsThisWeek.length,
  }
}
