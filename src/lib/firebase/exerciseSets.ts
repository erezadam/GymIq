/**
 * Firebase service for Exercise Sets
 * Manages CRUD operations for exercise set collections
 */

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
} from 'firebase/firestore'
import { db } from './config'
import type {
  ExerciseSet,
  CreateExerciseSetDto,
  UpdateExerciseSetDto,
} from '@/domains/exercises/types/exerciseSet.types'

const COLLECTION_NAME = 'exerciseSets'

/**
 * Get all exercise sets (admin view - includes inactive)
 */
export async function getExerciseSets(): Promise<ExerciseSet[]> {
  try {
    const ref = collection(db, COLLECTION_NAME)
    const q = query(ref, orderBy('order', 'asc'))
    const snapshot = await getDocs(q)

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    })) as ExerciseSet[]
  } catch (error) {
    console.error('Error fetching exercise sets:', error)
    return []
  }
}

/**
 * Get only active exercise sets (user view)
 */
export async function getActiveExerciseSets(muscleGroup?: string): Promise<ExerciseSet[]> {
  try {
    const ref = collection(db, COLLECTION_NAME)
    let q = query(ref, where('isActive', '==', true))
    const snapshot = await getDocs(q)

    let sets = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    })) as ExerciseSet[]

    // Filter by muscle group client-side (Firestore compound query limitation)
    if (muscleGroup && muscleGroup !== 'all') {
      sets = sets.filter((s) => s.muscleGroup === muscleGroup)
    }

    // Sort by order
    return sets.sort((a, b) => (a.order || 0) - (b.order || 0))
  } catch (error) {
    console.error('Error fetching active exercise sets:', error)
    return []
  }
}

/**
 * Get a single exercise set by ID
 */
export async function getExerciseSetById(id: string): Promise<ExerciseSet | null> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id)
    const snapshot = await getDoc(docRef)

    if (!snapshot.exists()) {
      return null
    }

    return {
      id: snapshot.id,
      ...snapshot.data(),
      createdAt: snapshot.data().createdAt?.toDate() || new Date(),
      updatedAt: snapshot.data().updatedAt?.toDate() || new Date(),
    } as ExerciseSet
  } catch (error) {
    console.error('Error fetching exercise set:', error)
    return null
  }
}

/**
 * Create a new exercise set
 */
export async function createExerciseSet(
  data: CreateExerciseSetDto,
  createdBy: string
): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      name: data.name,
      nameEn: data.nameEn || '',
      muscleGroup: data.muscleGroup,
      exerciseIds: data.exerciseIds,
      exerciseImages: data.exerciseImages || [],
      description: data.description || '',
      difficulty: data.difficulty,
      order: data.order,
      isActive: data.isActive,
      createdBy,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    return docRef.id
  } catch (error) {
    console.error('Error creating exercise set:', error)
    throw error
  }
}

/**
 * Update an existing exercise set
 */
export async function updateExerciseSet(
  id: string,
  data: UpdateExerciseSetDto
): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id)
    // Remove undefined values
    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([_, value]) => value !== undefined)
    )
    await updateDoc(docRef, {
      ...cleanData,
      updatedAt: serverTimestamp(),
    })
  } catch (error) {
    console.error('Error updating exercise set:', error)
    throw error
  }
}

/**
 * Delete an exercise set
 */
export async function deleteExerciseSet(id: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id)
    await deleteDoc(docRef)
  } catch (error) {
    console.error('Error deleting exercise set:', error)
    throw error
  }
}

/**
 * Toggle active status
 */
export async function toggleExerciseSetActive(
  id: string,
  isActive: boolean
): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id)
    await updateDoc(docRef, {
      isActive,
      updatedAt: serverTimestamp(),
    })
  } catch (error) {
    console.error('Error toggling exercise set:', error)
    throw error
  }
}

/**
 * Update order for multiple exercise sets (after drag & drop)
 */
export async function updateExerciseSetsOrder(orderedIds: string[]): Promise<void> {
  try {
    for (let i = 0; i < orderedIds.length; i++) {
      const docRef = doc(db, COLLECTION_NAME, orderedIds[i])
      await updateDoc(docRef, {
        order: i + 1,
        updatedAt: serverTimestamp(),
      })
    }
  } catch (error) {
    console.error('Error updating exercise sets order:', error)
    throw error
  }
}
