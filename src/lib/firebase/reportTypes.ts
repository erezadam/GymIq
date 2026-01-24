/**
 * Firebase service for report types
 * Manages CRUD operations for dynamic report type configuration
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  orderBy,
} from 'firebase/firestore'
import { db } from './config'
import type { ReportType } from '@/domains/exercises/types/reportTypes'
import { defaultReportTypes } from '@/domains/exercises/types/reportTypes'

const COLLECTION_NAME = 'reportTypes'

// Get all report types from Firebase (or return defaults if empty)
export async function getReportTypes(): Promise<ReportType[]> {
  try {
    const reportTypesRef = collection(db, COLLECTION_NAME)
    const q = query(reportTypesRef, orderBy('sortOrder', 'asc'))
    const snapshot = await getDocs(q)

    if (snapshot.empty) {
      // Return default mapping if no data in Firebase
      console.log('📋 No report types in Firebase, returning defaults')
      return defaultReportTypes
    }

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as ReportType[]
  } catch (error) {
    console.error('Error fetching report types:', error)
    return defaultReportTypes
  }
}

// Get only active report types (for dropdowns)
export async function getActiveReportTypes(): Promise<ReportType[]> {
  try {
    const reportTypesRef = collection(db, COLLECTION_NAME)
    // Simple query without orderBy to avoid needing composite index
    const q = query(
      reportTypesRef,
      where('isActive', '==', true)
    )
    const snapshot = await getDocs(q)

    if (snapshot.empty) {
      // Return active defaults if no data in Firebase
      return defaultReportTypes.filter(rt => rt.isActive)
    }

    const reportTypes = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as ReportType[]

    // Sort by sortOrder in JavaScript instead of Firebase
    return reportTypes.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
  } catch (error) {
    console.error('Error fetching active report types:', error)
    return defaultReportTypes.filter(rt => rt.isActive)
  }
}

// Get a single report type by ID
export async function getReportTypeById(id: string): Promise<ReportType | null> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id)
    const snapshot = await getDoc(docRef)

    if (!snapshot.exists()) {
      // Check if it's a default type
      const defaultType = defaultReportTypes.find(rt => rt.id === id)
      return defaultType || null
    }

    return {
      id: snapshot.id,
      ...snapshot.data(),
      createdAt: snapshot.data().createdAt?.toDate(),
      updatedAt: snapshot.data().updatedAt?.toDate(),
    } as ReportType
  } catch (error) {
    console.error('Error fetching report type:', error)
    // Fallback to defaults
    return defaultReportTypes.find(rt => rt.id === id) || null
  }
}

// Save/Update a report type
export async function saveReportType(reportType: ReportType): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, reportType.id)
    await setDoc(docRef, {
      nameHe: reportType.nameHe,
      nameEn: reportType.nameEn,
      fields: reportType.fields,
      isActive: reportType.isActive,
      sortOrder: reportType.sortOrder,
      updatedAt: serverTimestamp(),
    }, { merge: true })
    console.log('✅ Report type saved:', reportType.id)
  } catch (error) {
    console.error('Error saving report type:', error)
    throw error
  }
}

// Add a new report type
export async function addReportType(reportType: Omit<ReportType, 'createdAt' | 'updatedAt'>): Promise<void> {
  try {
    // Check for duplicate ID
    const existing = await getReportTypeById(reportType.id)
    if (existing) {
      throw new Error(`Report type with ID "${reportType.id}" already exists`)
    }

    const docRef = doc(db, COLLECTION_NAME, reportType.id)
    await setDoc(docRef, {
      nameHe: reportType.nameHe,
      nameEn: reportType.nameEn,
      fields: reportType.fields,
      isActive: reportType.isActive,
      sortOrder: reportType.sortOrder,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    console.log('✅ Report type added:', reportType.id)
  } catch (error) {
    console.error('Error adding report type:', error)
    throw error
  }
}

// Delete a report type
export async function deleteReportType(reportTypeId: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, reportTypeId)
    await deleteDoc(docRef)
    console.log('✅ Report type deleted:', reportTypeId)
  } catch (error) {
    console.error('Error deleting report type:', error)
    throw error
  }
}

// Toggle active status
export async function toggleReportTypeActive(reportTypeId: string, isActive: boolean): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, reportTypeId)
    await updateDoc(docRef, {
      isActive,
      updatedAt: serverTimestamp(),
    })
    console.log('✅ Report type active status updated:', reportTypeId, isActive)
  } catch (error) {
    console.error('Error toggling report type:', error)
    throw error
  }
}

// Check if a report type is in use by any exercise
export async function isReportTypeInUse(reportTypeId: string): Promise<{ inUse: boolean; count: number }> {
  try {
    const exercisesRef = collection(db, 'exercises')
    const q = query(exercisesRef, where('reportType', '==', reportTypeId))
    const snapshot = await getDocs(q)

    return {
      inUse: !snapshot.empty,
      count: snapshot.size,
    }
  } catch (error) {
    console.error('Error checking report type usage:', error)
    return { inUse: false, count: 0 }
  }
}

// Initialize report types collection with default data
export async function initializeReportTypes(): Promise<void> {
  try {
    const reportTypesRef = collection(db, COLLECTION_NAME)
    const snapshot = await getDocs(reportTypesRef)

    if (snapshot.empty) {
      console.log('📋 Initializing report types with defaults...')
      for (const reportType of defaultReportTypes) {
        await saveReportType(reportType)
      }
      console.log('✅ Report types initialized with default data')
    } else {
      console.log('📋 Report types already exist, skipping initialization')
    }
  } catch (error) {
    console.error('Error initializing report types:', error)
    throw error
  }
}

// Sync missing report types - adds any from defaults that don't exist in Firebase
export async function syncMissingReportTypes(): Promise<number> {
  try {
    const reportTypesRef = collection(db, COLLECTION_NAME)
    const snapshot = await getDocs(reportTypesRef)

    // Get existing IDs
    const existingIds = new Set(snapshot.docs.map(doc => doc.id))

    // Find and add missing
    let addedCount = 0
    for (const reportType of defaultReportTypes) {
      if (!existingIds.has(reportType.id)) {
        await saveReportType(reportType)
        console.log(`📋 Added missing report type: ${reportType.nameHe} (${reportType.id})`)
        addedCount++
      }
    }

    console.log(`✅ Sync complete. Added ${addedCount} report types.`)
    return addedCount
  } catch (error) {
    console.error('Error syncing report types:', error)
    throw error
  }
}

// Update sort order for multiple report types
export async function updateReportTypesOrder(orderedIds: string[]): Promise<void> {
  try {
    for (let i = 0; i < orderedIds.length; i++) {
      const docRef = doc(db, COLLECTION_NAME, orderedIds[i])
      await updateDoc(docRef, {
        sortOrder: i + 1,
        updatedAt: serverTimestamp(),
      })
    }
    console.log('✅ Report types order updated')
  } catch (error) {
    console.error('Error updating report types order:', error)
    throw error
  }
}
