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
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import type { TrainingProgram } from '../types'

// Convert Firestore timestamps to Dates
function toProgram(id: string, data: Record<string, any>): TrainingProgram {
  return {
    ...data,
    id,
    startDate: data.startDate?.toDate?.() || data.startDate || new Date(),
    endDate: data.endDate?.toDate?.() || data.endDate,
    createdAt: data.createdAt?.toDate?.() || data.createdAt || new Date(),
    updatedAt: data.updatedAt?.toDate?.() || data.updatedAt || new Date(),
  } as TrainingProgram
}

export const programService = {
  // Create a new program
  async createProgram(
    data: Omit<TrainingProgram, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    const docRef = doc(collection(db, 'trainingPrograms'))
    const saveData: Record<string, unknown> = {
      ...data,
      startDate:
        data.startDate instanceof Date
          ? Timestamp.fromDate(data.startDate)
          : data.startDate,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }
    if (data.endDate && data.endDate instanceof Date) {
      saveData.endDate = Timestamp.fromDate(data.endDate)
    }
    await setDoc(docRef, saveData)
    return docRef.id
  },

  // Get a specific program
  async getProgram(programId: string): Promise<TrainingProgram | null> {
    const docRef = doc(db, 'trainingPrograms', programId)
    const snapshot = await getDoc(docRef)
    if (!snapshot.exists()) return null
    return toProgram(snapshot.id, snapshot.data())
  },

  // Get active program for a trainee
  async getTraineeActiveProgram(
    traineeId: string
  ): Promise<TrainingProgram | null> {
    const q = query(
      collection(db, 'trainingPrograms'),
      where('traineeId', '==', traineeId),
      where('status', '==', 'active')
    )
    const snapshot = await getDocs(q)
    if (snapshot.empty) return null
    const first = snapshot.docs[0]
    return toProgram(first.id, first.data())
  },

  // Get all programs for a trainer
  async getTrainerPrograms(trainerId: string): Promise<TrainingProgram[]> {
    const q = query(
      collection(db, 'trainingPrograms'),
      where('trainerId', '==', trainerId),
      orderBy('createdAt', 'desc')
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map((d) => toProgram(d.id, d.data()))
  },

  // Get all programs for a trainee
  async getTraineePrograms(traineeId: string): Promise<TrainingProgram[]> {
    const q = query(
      collection(db, 'trainingPrograms'),
      where('traineeId', '==', traineeId),
      orderBy('createdAt', 'desc')
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map((d) => toProgram(d.id, d.data()))
  },

  // Activate a program (deactivates any existing active program for the trainee)
  async activateProgram(
    programId: string,
    traineeId: string
  ): Promise<void> {
    // Deactivate existing active program
    const activeProgram = await this.getTraineeActiveProgram(traineeId)
    if (activeProgram && activeProgram.id !== programId) {
      await updateDoc(doc(db, 'trainingPrograms', activeProgram.id), {
        status: 'completed',
        updatedAt: serverTimestamp(),
      })
    }
    // Activate the new program
    await updateDoc(doc(db, 'trainingPrograms', programId), {
      status: 'active',
      updatedAt: serverTimestamp(),
    })
  },

  // Update program
  async updateProgram(
    programId: string,
    data: Partial<TrainingProgram>
  ): Promise<void> {
    const docRef = doc(db, 'trainingPrograms', programId)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: Record<string, any> = { ...data }
    delete updateData.id
    delete updateData.createdAt
    updateData.updatedAt = serverTimestamp()
    if (updateData.startDate instanceof Date) {
      updateData.startDate = Timestamp.fromDate(updateData.startDate as Date)
    }
    if (updateData.endDate instanceof Date) {
      updateData.endDate = Timestamp.fromDate(updateData.endDate as Date)
    }
    await updateDoc(docRef, updateData)
  },

  // Delete program
  async deleteProgram(programId: string): Promise<void> {
    await deleteDoc(doc(db, 'trainingPrograms', programId))
  },
}
