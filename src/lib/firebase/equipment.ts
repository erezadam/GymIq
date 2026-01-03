import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  serverTimestamp,
  query,
  where,
} from 'firebase/firestore'
import { db } from './config'
import { equipment as defaultEquipment } from '@/domains/exercises/data/mockExercises'

const COLLECTION_NAME = 'equipment'

// Equipment interface for Firestore
export interface Equipment {
  id: string
  nameHe: string
  nameEn: string
  order: number
  isActive: boolean
}

// Get all equipment from Firebase (or return defaults if empty)
export async function getEquipment(): Promise<Equipment[]> {
  try {
    const equipmentRef = collection(db, COLLECTION_NAME)
    const snapshot = await getDocs(equipmentRef)

    if (snapshot.empty) {
      // Return default mapping if no data in Firebase
      return defaultEquipment.map((eq, index) => ({
        id: eq.id,
        nameHe: eq.nameHe,
        nameEn: eq.name,
        order: index + 1,
        isActive: true,
      }))
    }

    const data = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Equipment[]

    // Filter only active and sort by order
    return data
      .filter(eq => eq.isActive !== false)
      .sort((a, b) => (a.order || 0) - (b.order || 0))
  } catch (error) {
    console.error('Error fetching equipment:', error)
    return defaultEquipment.map((eq, index) => ({
      id: eq.id,
      nameHe: eq.nameHe,
      nameEn: eq.name,
      order: index + 1,
      isActive: true,
    }))
  }
}

// Save/Update equipment
export async function saveEquipment(equipment: Equipment): Promise<void> {
  try {
    const equipmentRef = doc(db, COLLECTION_NAME, equipment.id)
    await setDoc(equipmentRef, {
      nameHe: equipment.nameHe,
      nameEn: equipment.nameEn,
      order: equipment.order,
      isActive: equipment.isActive,
      updatedAt: serverTimestamp(),
    })
  } catch (error) {
    console.error('Error saving equipment:', error)
    throw error
  }
}

// Add new equipment
export async function addEquipment(equipment: Omit<Equipment, 'isActive'> & { isActive?: boolean }): Promise<void> {
  try {
    const equipmentRef = doc(db, COLLECTION_NAME, equipment.id)
    await setDoc(equipmentRef, {
      nameHe: equipment.nameHe,
      nameEn: equipment.nameEn,
      order: equipment.order,
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  } catch (error) {
    console.error('Error adding equipment:', error)
    throw error
  }
}

// Soft delete equipment (set isActive to false)
export async function deleteEquipment(equipmentId: string): Promise<void> {
  try {
    const equipmentRef = doc(db, COLLECTION_NAME, equipmentId)
    await updateDoc(equipmentRef, {
      isActive: false,
      updatedAt: serverTimestamp(),
    })
  } catch (error) {
    console.error('Error deleting equipment:', error)
    throw error
  }
}

// Check if equipment is used by any exercise
export async function isEquipmentInUse(equipmentId: string): Promise<{ inUse: boolean; count: number }> {
  try {
    const exercisesRef = collection(db, 'exercises')
    const q = query(exercisesRef, where('equipment', '==', equipmentId))
    const snapshot = await getDocs(q)

    return {
      inUse: !snapshot.empty,
      count: snapshot.size,
    }
  } catch (error) {
    console.error('Error checking equipment usage:', error)
    return { inUse: false, count: 0 }
  }
}

// Initialize equipment collection with default data
export async function initializeEquipment(): Promise<void> {
  try {
    const equipmentRef = collection(db, COLLECTION_NAME)
    const snapshot = await getDocs(equipmentRef)

    if (snapshot.empty) {
      // Add default equipment
      for (let i = 0; i < defaultEquipment.length; i++) {
        const eq = defaultEquipment[i]
        await addEquipment({
          id: eq.id,
          nameHe: eq.nameHe,
          nameEn: eq.name,
          order: i + 1,
        })
      }
      console.log('Equipment initialized with default data')
    }
  } catch (error) {
    console.error('Error initializing equipment:', error)
    throw error
  }
}

// Sync missing equipment - adds any equipment from defaults that don't exist in Firebase
export async function syncMissingEquipment(): Promise<number> {
  try {
    const equipmentRef = collection(db, COLLECTION_NAME)
    const snapshot = await getDocs(equipmentRef)

    // Get existing equipment IDs
    const existingIds = new Set(snapshot.docs.map(doc => doc.id))

    // Find and add missing equipment
    let addedCount = 0
    for (let i = 0; i < defaultEquipment.length; i++) {
      const eq = defaultEquipment[i]
      if (!existingIds.has(eq.id)) {
        await addEquipment({
          id: eq.id,
          nameHe: eq.nameHe,
          nameEn: eq.name,
          order: i + 1,
        })
        console.log(`Added missing equipment: ${eq.nameHe} (${eq.id})`)
        addedCount++
      }
    }

    console.log(`Sync complete. Added ${addedCount} equipment items.`)
    return addedCount
  } catch (error) {
    console.error('Error syncing equipment:', error)
    throw error
  }
}
