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
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore'
import { db } from './config'
import type { Exercise, ExerciseFilters, CreateExerciseDto } from '@/domains/exercises/types'

const COLLECTION = 'exercises'

// Get all exercises with optional filtering
export const getExercises = async (filters?: ExerciseFilters): Promise<Exercise[]> => {
  let q = query(collection(db, COLLECTION), orderBy('name'))

  // Note: Firestore has limitations on compound queries
  // For complex filtering, we filter client-side after fetching
  if (filters?.category) {
    q = query(collection(db, COLLECTION), where('category', '==', filters.category))
  }

  const snapshot = await getDocs(q)
  let exercises = snapshot.docs.map((doc) => {
    const data = doc.data()
    // Use doc.id (Firebase document ID), not any stored id field
    return {
      ...data,
      id: doc.id,
    } as Exercise
  })

  // Client-side filtering for additional filters
  if (filters) {
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      exercises = exercises.filter(
        (ex) =>
          ex.name.toLowerCase().includes(searchLower) ||
          ex.nameHe.includes(filters.search!)
      )
    }

    if (filters.difficulty) {
      exercises = exercises.filter((ex) => ex.difficulty === filters.difficulty)
    }

    if (filters.equipment) {
      exercises = exercises.filter((ex) => ex.equipment === filters.equipment)
    }

    if (filters.muscle) {
      exercises = exercises.filter(
        (ex) =>
          ex.primaryMuscle === filters.muscle ||
          ex.secondaryMuscles.includes(filters.muscle!)
      )
    }
  }

  return exercises
}

// Get single exercise by ID
export const getExerciseById = async (id: string): Promise<Exercise | null> => {
  const docRef = doc(db, COLLECTION, id)
  const docSnap = await getDoc(docRef)

  if (!docSnap.exists()) return null

  const data = docSnap.data()
  // Use docSnap.id (Firebase document ID), not any stored id field
  return {
    ...data,
    id: docSnap.id,
  } as Exercise
}

// Create new exercise
export const createExercise = async (data: CreateExerciseDto): Promise<Exercise> => {
  const docRef = await addDoc(collection(db, COLLECTION), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  return {
    id: docRef.id,
    ...data,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

// Update exercise
export const updateExercise = async (
  id: string,
  data: Partial<CreateExerciseDto>
): Promise<void> => {
  const docRef = doc(db, COLLECTION, id)
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

// Delete exercise
export const deleteExercise = async (id: string): Promise<void> => {
  const docRef = doc(db, COLLECTION, id)
  await deleteDoc(docRef)
}

// Bulk import exercises (for initial data setup)
export const bulkImportExercises = async (
  exercises: CreateExerciseDto[]
): Promise<{ success: number; failed: number }> => {
  const batch = writeBatch(db)
  let success = 0
  let failed = 0

  for (const exercise of exercises) {
    try {
      const docRef = doc(collection(db, COLLECTION))
      batch.set(docRef, {
        ...exercise,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      success++
    } catch {
      failed++
    }
  }

  await batch.commit()
  return { success, failed }
}

// Get exercises count
export const getExercisesCount = async (): Promise<number> => {
  const snapshot = await getDocs(collection(db, COLLECTION))
  return snapshot.size
}

// Delete all exercises
export const deleteAllExercises = async (): Promise<number> => {
  const snapshot = await getDocs(collection(db, COLLECTION))
  const batch = writeBatch(db)

  snapshot.docs.forEach((docSnapshot) => {
    batch.delete(docSnapshot.ref)
  })

  await batch.commit()
  return snapshot.size
}
