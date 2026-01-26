/**
 * Firebase service for band types
 * Manages CRUD operations for global band type configuration
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
  serverTimestamp,
  orderBy,
} from 'firebase/firestore'
import { db } from './config'
import type { BandType, CreateBandTypeDto, UpdateBandTypeDto } from '@/domains/exercises/types/bands'

const COLLECTION_NAME = 'bandTypes'

// Get all band types from Firebase
export async function getBandTypes(): Promise<BandType[]> {
  try {
    const bandTypesRef = collection(db, COLLECTION_NAME)
    const q = query(bandTypesRef, orderBy('sortOrder', 'asc'))
    const snapshot = await getDocs(q)

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as BandType[]
  } catch (error) {
    console.error('Error fetching band types:', error)
    return []
  }
}

// Get only active band types (for dropdowns)
export async function getActiveBandTypes(): Promise<BandType[]> {
  try {
    const bandTypesRef = collection(db, COLLECTION_NAME)
    const q = query(bandTypesRef, where('isActive', '==', true))
    const snapshot = await getDocs(q)

    const bandTypes = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as BandType[]

    // Sort by sortOrder in JavaScript
    return bandTypes.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
  } catch (error) {
    console.error('Error fetching active band types:', error)
    return []
  }
}

// Get a single band type by ID
export async function getBandTypeById(id: string): Promise<BandType | null> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id)
    const snapshot = await getDoc(docRef)

    if (!snapshot.exists()) {
      return null
    }

    return {
      id: snapshot.id,
      ...snapshot.data(),
      createdAt: snapshot.data().createdAt?.toDate(),
      updatedAt: snapshot.data().updatedAt?.toDate(),
    } as BandType
  } catch (error) {
    console.error('Error fetching band type:', error)
    return null
  }
}

// Add a new band type
export async function addBandType(data: CreateBandTypeDto): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      name: data.name,
      description: data.description || '',
      isActive: data.isActive,
      sortOrder: data.sortOrder,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    console.log('✅ Band type added:', docRef.id)
    return docRef.id
  } catch (error) {
    console.error('Error adding band type:', error)
    throw error
  }
}

// Update a band type
export async function updateBandType(id: string, data: UpdateBandTypeDto): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id)
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp(),
    })
    console.log('✅ Band type updated:', id)
  } catch (error) {
    console.error('Error updating band type:', error)
    throw error
  }
}

// Delete a band type
export async function deleteBandType(id: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id)
    await deleteDoc(docRef)
    console.log('✅ Band type deleted:', id)
  } catch (error) {
    console.error('Error deleting band type:', error)
    throw error
  }
}

// Toggle active status
export async function toggleBandTypeActive(id: string, isActive: boolean): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id)
    await updateDoc(docRef, {
      isActive,
      updatedAt: serverTimestamp(),
    })
    console.log('✅ Band type active status updated:', id, isActive)
  } catch (error) {
    console.error('Error toggling band type:', error)
    throw error
  }
}

// Check if a band type is in use by any workout set
export async function isBandTypeInUse(_bandTypeId: string): Promise<{ inUse: boolean; count: number }> {
  // For now, return false - we can implement this later if needed
  // This would require scanning workoutHistory for assistanceBands containing this ID
  return { inUse: false, count: 0 }
}

// Update sort order for multiple band types
export async function updateBandTypesOrder(orderedIds: string[]): Promise<void> {
  try {
    for (let i = 0; i < orderedIds.length; i++) {
      const docRef = doc(db, COLLECTION_NAME, orderedIds[i])
      await updateDoc(docRef, {
        sortOrder: i + 1,
        updatedAt: serverTimestamp(),
      })
    }
    console.log('✅ Band types order updated')
  } catch (error) {
    console.error('Error updating band types order:', error)
    throw error
  }
}
