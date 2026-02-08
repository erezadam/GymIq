import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  deleteField,
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
    disconnectedByTrainee: data.disconnectedByTrainee
      ? {
          disconnectedAt: data.disconnectedByTrainee.disconnectedAt?.toDate?.()
            || data.disconnectedByTrainee.disconnectedAt,
          reason: data.disconnectedByTrainee.reason,
        }
      : undefined,
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

  // Get active program for a trainee (excludes disconnected and standalone)
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
    // Filter out disconnected programs and standalone workouts
    const activeDocs = snapshot.docs.filter(d => {
      const data = d.data()
      return !data.disconnectedByTrainee && data.type !== 'standalone'
    })
    if (activeDocs.length === 0) return null
    const first = activeDocs[0]
    return toProgram(first.id, first.data())
  },

  // Get active standalone workouts for a trainee
  async getTraineeStandaloneWorkouts(
    traineeId: string
  ): Promise<TrainingProgram[]> {
    const q = query(
      collection(db, 'trainingPrograms'),
      where('traineeId', '==', traineeId),
      where('status', '==', 'active')
    )
    const snapshot = await getDocs(q)
    return snapshot.docs
      .filter(d => {
        const data = d.data()
        return data.type === 'standalone' && !data.disconnectedByTrainee
      })
      .map(d => toProgram(d.id, d.data()))
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

  // Get all programs for a trainee (no orderBy to avoid composite index requirement)
  async getTraineePrograms(traineeId: string, includeDisconnected = false): Promise<TrainingProgram[]> {
    const q = query(
      collection(db, 'trainingPrograms'),
      where('traineeId', '==', traineeId)
    )
    const snapshot = await getDocs(q)
    let programs = snapshot.docs.map((d) => toProgram(d.id, d.data()))
    // Filter out disconnected unless explicitly requested (trainer view)
    if (!includeDisconnected) {
      programs = programs.filter(p => !p.disconnectedByTrainee)
    }
    // Sort client-side: newest first
    return programs.sort((a, b) => {
      const ta = a.createdAt instanceof Date ? a.createdAt.getTime() : (a.createdAt as any)?.toMillis?.() || 0
      const tb = b.createdAt instanceof Date ? b.createdAt.getTime() : (b.createdAt as any)?.toMillis?.() || 0
      return tb - ta
    })
  },

  // Activate a program (deactivates any existing active program for the trainee)
  async activateProgram(
    programId: string,
    traineeId: string
  ): Promise<void> {
    // Deactivate existing active program first
    const activeProgram = await this.getTraineeActiveProgram(traineeId)
    if (activeProgram && activeProgram.id !== programId) {
      try {
        await updateDoc(doc(db, 'trainingPrograms', activeProgram.id), {
          status: 'completed',
          updatedAt: serverTimestamp(),
        })
      } catch (err) {
        console.error('Failed to deactivate previous program:', err)
        throw new Error('שגיאה בביטול תוכנית קודמת. נסה שוב.')
      }
    }
    // Only activate the new program after successful deactivation
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

  // Delete program (hard delete - kept for admin tools)
  async deleteProgram(programId: string): Promise<void> {
    await deleteDoc(doc(db, 'trainingPrograms', programId))
  },

  // Disconnect a program (trainee soft-delete)
  async disconnectProgram(programId: string, reason?: string): Promise<void> {
    const docRef = doc(db, 'trainingPrograms', programId)
    await updateDoc(docRef, {
      disconnectedByTrainee: {
        disconnectedAt: serverTimestamp(),
        ...(reason && { reason }),
      },
      updatedAt: serverTimestamp(),
    })
  },

  // Reconnect a program (trainer "send again" after trainee disconnected)
  async reconnectProgram(programId: string): Promise<void> {
    const docRef = doc(db, 'trainingPrograms', programId)
    await updateDoc(docRef, {
      disconnectedByTrainee: deleteField(),
      updatedAt: serverTimestamp(),
    })
  },
}
