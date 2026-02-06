import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  serverTimestamp,
  limit,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import type { TrainerRelationship, TraineeWithStats, TraineeStats } from '../types'
import { getUserWorkoutStats } from '@/lib/firebase/workoutHistory'
import { getUserWorkoutHistory } from '@/lib/firebase/workoutHistory'
import { programService } from './programService'
import type { AppUser } from '@/lib/firebase/auth'
import { updateUserProfile } from '@/lib/firebase/auth'

export const trainerService = {
  // Get all active trainees for a trainer
  async getTrainerTrainees(trainerId: string): Promise<TrainerRelationship[]> {
    const q = query(
      collection(db, 'trainerRelationships'),
      where('trainerId', '==', trainerId),
      where('status', '==', 'active')
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt || new Date(),
      updatedAt: doc.data().updatedAt?.toDate?.() || doc.data().updatedAt || new Date(),
    } as TrainerRelationship))
  },

  // Create a new trainer-trainee relationship
  async createRelationship(
    data: Omit<TrainerRelationship, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    const docRef = doc(collection(db, 'trainerRelationships'))
    await setDoc(docRef, {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    return docRef.id
  },

  // End a relationship
  async endRelationship(
    relationshipId: string,
    endedBy: 'trainer' | 'trainee' | 'admin',
    reason?: string
  ): Promise<void> {
    const docRef = doc(db, 'trainerRelationships', relationshipId)
    await updateDoc(docRef, {
      status: 'ended',
      endedAt: serverTimestamp(),
      endedBy,
      endReason: reason || '',
      updatedAt: serverTimestamp(),
    })
  },

  // Pause a relationship
  async pauseRelationship(relationshipId: string): Promise<void> {
    const docRef = doc(db, 'trainerRelationships', relationshipId)
    await updateDoc(docRef, {
      status: 'paused',
      updatedAt: serverTimestamp(),
    })
  },

  // Resume a paused relationship
  async resumeRelationship(relationshipId: string): Promise<void> {
    const docRef = doc(db, 'trainerRelationships', relationshipId)
    await updateDoc(docRef, {
      status: 'active',
      updatedAt: serverTimestamp(),
    })
  },

  // Get a trainee's user profile
  async getTraineeProfile(traineeId: string): Promise<AppUser | null> {
    const docRef = doc(db, 'users', traineeId)
    const snapshot = await getDoc(docRef)
    if (!snapshot.exists()) return null
    const data = snapshot.data()
    return {
      ...data,
      createdAt: data.createdAt?.toDate?.() || data.createdAt || new Date(),
      updatedAt: data.updatedAt?.toDate?.() || data.updatedAt || new Date(),
    } as AppUser
  },

  // Get workout stats for a trainee
  async getTraineeStats(traineeId: string): Promise<TraineeStats> {
    const stats = await getUserWorkoutStats(traineeId)
    return {
      totalWorkouts: stats.totalWorkouts || 0,
      thisWeekWorkouts: stats.thisWeekWorkouts || 0,
      thisMonthWorkouts: stats.thisMonthWorkouts || 0,
      currentStreak: stats.currentStreak || 0,
      totalVolume: stats.totalVolume || 0,
      programCompletionRate: 0, // Will be implemented with programs in Phase 3
    }
  },

  // Get all trainees with their profiles and stats
  async getTraineesWithStats(trainerId: string): Promise<TraineeWithStats[]> {
    const relationships = await this.getTrainerTrainees(trainerId)

    const traineesWithStats = await Promise.all(
      relationships.map(async (rel) => {
        try {
          const [profile, stats, recentWorkouts, activeProgram] = await Promise.all([
            this.getTraineeProfile(rel.traineeId),
            this.getTraineeStats(rel.traineeId),
            getUserWorkoutHistory(rel.traineeId, 1),
            programService.getTraineeActiveProgram(rel.traineeId),
          ])

          // Calculate program completion from active program
          const completionRate = activeProgram?.durationWeeks
            ? Math.round(((activeProgram.currentWeek || 0) / activeProgram.durationWeeks) * 100)
            : 0

          return {
            relationship: rel,
            traineeProfile: profile
              ? {
                  uid: profile.uid,
                  firstName: profile.firstName,
                  lastName: profile.lastName,
                  displayName: profile.displayName,
                  email: profile.email,
                  phoneNumber: profile.phoneNumber,
                  trainingGoals: profile.trainingGoals as any,
                  injuriesOrLimitations: profile.injuriesOrLimitations,
                }
              : undefined,
            lastWorkoutDate:
              recentWorkouts.length > 0 ? recentWorkouts[0].date : undefined,
            thisWeekWorkouts: stats.thisWeekWorkouts,
            thisMonthWorkouts: stats.thisMonthWorkouts,
            currentStreak: stats.currentStreak,
            programCompletionRate: completionRate,
            activeProgram: activeProgram || undefined,
          } as TraineeWithStats
        } catch (error) {
          console.error(`Error loading data for trainee ${rel.traineeId}:`, error)
          return {
            relationship: rel,
            thisWeekWorkouts: 0,
            thisMonthWorkouts: 0,
            currentStreak: 0,
            programCompletionRate: 0,
          } as TraineeWithStats
        }
      })
    )

    return traineesWithStats
  },

  // Update a trainee's profile (body metrics, personal info)
  async updateTraineeProfile(
    traineeId: string,
    data: Partial<Pick<AppUser, 'firstName' | 'lastName' | 'phoneNumber' | 'trainingGoals' | 'injuriesOrLimitations' | 'age' | 'height' | 'weight' | 'bodyFatPercentage'>>
  ): Promise<void> {
    // Update displayName if name changed
    const updateData: Record<string, any> = { ...data }
    if (data.firstName !== undefined || data.lastName !== undefined) {
      const profile = await this.getTraineeProfile(traineeId)
      const firstName = data.firstName ?? profile?.firstName ?? ''
      const lastName = data.lastName ?? profile?.lastName ?? ''
      updateData.displayName = `${firstName} ${lastName}`
    }
    await updateUserProfile(traineeId, updateData)
  },

  // Update trainer notes on the relationship
  async updateRelationshipNotes(
    relationshipId: string,
    notes: string
  ): Promise<void> {
    const docRef = doc(db, 'trainerRelationships', relationshipId)
    await updateDoc(docRef, {
      notes,
      updatedAt: serverTimestamp(),
    })
  },

  // Find user by email (for checking if email exists in system)
  async findUserByEmail(email: string): Promise<AppUser | null> {
    const q = query(
      collection(db, 'users'),
      where('email', '==', email.toLowerCase().trim()),
      limit(1)
    )
    const snapshot = await getDocs(q)
    if (snapshot.empty) return null

    const data = snapshot.docs[0].data()
    return {
      ...data,
      createdAt: data.createdAt?.toDate?.() || data.createdAt || new Date(),
      updatedAt: data.updatedAt?.toDate?.() || data.updatedAt || new Date(),
    } as AppUser
  },

  // Check if trainer-trainee relationship already exists
  async checkTrainerRelationship(
    trainerId: string,
    traineeId: string
  ): Promise<boolean> {
    const q = query(
      collection(db, 'trainerRelationships'),
      where('trainerId', '==', trainerId),
      where('traineeId', '==', traineeId),
      where('status', '==', 'active')
    )
    const snapshot = await getDocs(q)
    return !snapshot.empty
  },
}
