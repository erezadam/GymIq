import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from './config'
import type { PrimaryMuscle, SubMuscle } from '@/domains/exercises/types/muscles'
import { defaultMuscleMapping } from '@/domains/exercises/types/muscles'

const COLLECTION_NAME = 'muscles'

// Get all muscles from Firebase (or return defaults if empty)
export async function getMuscles(): Promise<PrimaryMuscle[]> {
  try {
    const musclesRef = collection(db, COLLECTION_NAME)
    const snapshot = await getDocs(musclesRef)

    if (snapshot.empty) {
      // Return default mapping if no data in Firebase
      return defaultMuscleMapping
    }

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as PrimaryMuscle[]
  } catch (error) {
    console.error('Error fetching muscles:', error)
    return defaultMuscleMapping
  }
}

// Save/Update a primary muscle with its sub-muscles
export async function saveMuscle(muscle: PrimaryMuscle): Promise<void> {
  try {
    const muscleRef = doc(db, COLLECTION_NAME, muscle.id)
    await setDoc(muscleRef, {
      nameHe: muscle.nameHe,
      nameEn: muscle.nameEn,
      icon: muscle.icon,
      subMuscles: muscle.subMuscles,
      updatedAt: serverTimestamp(),
    })
  } catch (error) {
    console.error('Error saving muscle:', error)
    throw error
  }
}

// Add a new primary muscle
export async function addPrimaryMuscle(muscle: Omit<PrimaryMuscle, 'subMuscles'> & { subMuscles?: SubMuscle[] }): Promise<void> {
  try {
    const muscleRef = doc(db, COLLECTION_NAME, muscle.id)
    await setDoc(muscleRef, {
      nameHe: muscle.nameHe,
      nameEn: muscle.nameEn,
      icon: muscle.icon,
      subMuscles: muscle.subMuscles || [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  } catch (error) {
    console.error('Error adding muscle:', error)
    throw error
  }
}

// Add a sub-muscle to a primary muscle
export async function addSubMuscle(primaryMuscleId: string, subMuscle: SubMuscle, currentSubMuscles: SubMuscle[]): Promise<void> {
  try {
    const muscleRef = doc(db, COLLECTION_NAME, primaryMuscleId)
    await updateDoc(muscleRef, {
      subMuscles: [...currentSubMuscles, subMuscle],
      updatedAt: serverTimestamp(),
    })
  } catch (error) {
    console.error('Error adding sub-muscle:', error)
    throw error
  }
}

// Remove a sub-muscle from a primary muscle
export async function removeSubMuscle(primaryMuscleId: string, subMuscleId: string, currentSubMuscles: SubMuscle[]): Promise<void> {
  try {
    const muscleRef = doc(db, COLLECTION_NAME, primaryMuscleId)
    await updateDoc(muscleRef, {
      subMuscles: currentSubMuscles.filter(sm => sm.id !== subMuscleId),
      updatedAt: serverTimestamp(),
    })
  } catch (error) {
    console.error('Error removing sub-muscle:', error)
    throw error
  }
}

// Delete a primary muscle
export async function deletePrimaryMuscle(muscleId: string): Promise<void> {
  try {
    const muscleRef = doc(db, COLLECTION_NAME, muscleId)
    await deleteDoc(muscleRef)
  } catch (error) {
    console.error('Error deleting muscle:', error)
    throw error
  }
}

// Initialize muscles collection with default data
export async function initializeMuscles(): Promise<void> {
  try {
    const musclesRef = collection(db, COLLECTION_NAME)
    const snapshot = await getDocs(musclesRef)

    if (snapshot.empty) {
      // Add default muscles
      for (const muscle of defaultMuscleMapping) {
        await saveMuscle(muscle)
      }
      console.log('Muscles initialized with default data')
    }
  } catch (error) {
    console.error('Error initializing muscles:', error)
    throw error
  }
}

// Sync missing muscles - adds any muscles from defaults that don't exist in Firebase
export async function syncMissingMuscles(): Promise<number> {
  try {
    const musclesRef = collection(db, COLLECTION_NAME)
    const snapshot = await getDocs(musclesRef)

    // Get existing muscle IDs
    const existingIds = new Set(snapshot.docs.map(doc => doc.id))

    // Find and add missing muscles
    let addedCount = 0
    for (const muscle of defaultMuscleMapping) {
      if (!existingIds.has(muscle.id)) {
        await saveMuscle(muscle)
        console.log(`Added missing muscle: ${muscle.nameHe} (${muscle.id})`)
        addedCount++
      }
    }

    console.log(`Sync complete. Added ${addedCount} muscles.`)
    return addedCount
  } catch (error) {
    console.error('Error syncing muscles:', error)
    throw error
  }
}
