import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  limit,
  Timestamp,
} from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { db, app } from '@/lib/firebase/config'
import type { TrainerRelationship, TraineeWithStats, TraineeStats, RelationshipStatus } from '../types'
import { getUserWorkoutStats } from '@/lib/firebase/workoutHistory'
import { getUserWorkoutHistory } from '@/lib/firebase/workoutHistory'
import { programService } from './programService'
import type { AppUser } from '@/lib/firebase/auth'
import { updateUserProfile } from '@/lib/firebase/auth'

const functions = getFunctions(app)

// Cancellation/rejection auto-hide window for getMyLatestRelationshipState.
// Older terminal-state records do not surface in the trainee UI banner.
const STALE_TERMINAL_STATE_DAYS = 30

export class TrainerRelationshipError extends Error {
  constructor(public code: 'TRAINER_RELATIONSHIP_EXISTS', message: string) {
    super(message)
    this.name = 'TrainerRelationshipError'
  }
}

export const trainerService = {
  // Get all users with trainer role (for trainee self-select flow)
  async getAvailableTrainers(): Promise<Array<{ uid: string; displayName: string }>> {
    const q = query(collection(db, 'users'), where('role', '==', 'trainer'))
    const snapshot = await getDocs(q)
    return snapshot.docs
      .map(d => {
        const data = d.data() as Partial<AppUser>
        const fullName = [data.firstName, data.lastName].filter(Boolean).join(' ').trim()
        const displayName = fullName || data.displayName || data.email || 'מאמן'
        return { uid: d.id, displayName }
      })
      .sort((a, b) => a.displayName.localeCompare(b.displayName, 'he'))
  },

  // Trainee requests a trainer (Approval Flow). Creates a 'pending' relationship.
  // Does NOT touch user.trainerId — that happens only on approval.
  // Throws TrainerRelationshipError('TRAINER_RELATIONSHIP_EXISTS') if the
  // trainee already has an active or pending relationship.
  async requestTrainer(
    trainee: Pick<AppUser, 'uid' | 'email' | 'firstName' | 'lastName' | 'displayName'>,
    trainerId: string,
    trainerName: string
  ): Promise<string> {
    const existing = await trainerService.hasActiveOrPendingTrainer(trainee.uid)
    if (existing.has) {
      throw new TrainerRelationshipError(
        'TRAINER_RELATIONSHIP_EXISTS',
        existing.status === 'pending'
          ? `כבר יש לך בקשה ממתינה למאמן ${existing.trainerName ?? ''}`.trim()
          : `כבר יש לך מאמן פעיל (${existing.trainerName ?? ''})`.trim()
      )
    }

    const traineeFullName = [trainee.firstName, trainee.lastName].filter(Boolean).join(' ').trim()
    const traineeName = traineeFullName || trainee.displayName || trainee.email || 'מתאמן'

    const relationshipId = await trainerService.createRelationship({
      trainerId,
      traineeId: trainee.uid,
      trainerName,
      traineeName,
      traineeEmail: trainee.email,
      status: 'pending',
      requestedBy: 'trainee',
      requestedAt: serverTimestamp() as unknown as Timestamp,
    })

    // Fire-and-forget email notification to the trainer. Email failure must
    // not block the user-facing action — the request is already persisted.
    try {
      const callable = httpsCallable(functions, 'sendTrainerRequestEmail')
      await callable({ relationshipId })
    } catch (emailErr) {
      console.warn('Trainer request email failed (request was saved):', emailErr)
    }

    return relationshipId
  },

  // Approve a pending trainer request. Atomicity (relationship.status +
  // user.trainerId) is enforced server-side via a Cloud Function using the
  // Admin SDK, because Firestore client rules cannot grant a trainer
  // permission to set users.trainerId for a not-yet-linked trainee.
  // The Cloud Function `approveTrainerRequest` is implemented in Sub-phase B.5.
  async approveTrainerRequest(relationshipId: string): Promise<void> {
    const callable = httpsCallable<{ relationshipId: string }, { success: boolean }>(
      functions,
      'approveTrainerRequest'
    )
    await callable({ relationshipId })
  },

  // Reject a pending trainer request. Trainer-side, client-only (rules
  // permit pending → rejected by trainer). Does NOT touch user.trainerId.
  async rejectTrainerRequest(relationshipId: string, reason?: string): Promise<void> {
    const docRef = doc(db, 'trainerRelationships', relationshipId)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates: Record<string, any> = {
      status: 'rejected',
      respondedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }
    if (reason && reason.trim()) {
      updates.rejectionReason = reason.trim()
    }
    await updateDoc(docRef, updates)

    // Fire-and-forget email notification to the trainee. Email failure must
    // not block the user-facing action — the rejection is already persisted.
    try {
      const callable = httpsCallable(functions, 'sendTrainerRejectedEmail')
      await callable({ relationshipId })
    } catch (emailErr) {
      console.warn('Trainer rejection email failed (rejection was saved):', emailErr)
    }
  },

  // Trainee cancels their own pending request. Stored as status='cancelled'
  // (not deleted) so analytics can detect spam-request patterns later.
  async cancelTrainerRequest(relationshipId: string): Promise<void> {
    const docRef = doc(db, 'trainerRelationships', relationshipId)
    await updateDoc(docRef, {
      status: 'cancelled',
      respondedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  },

  // List pending requests waiting for a trainer's decision, newest first.
  async getPendingRequestsForTrainer(trainerId: string): Promise<TrainerRelationship[]> {
    const q = query(
      collection(db, 'trainerRelationships'),
      where('trainerId', '==', trainerId),
      where('status', '==', 'pending'),
      orderBy('requestedAt', 'desc')
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map(d => ({
      id: d.id,
      ...d.data(),
      createdAt: d.data().createdAt?.toDate?.() || d.data().createdAt || new Date(),
      updatedAt: d.data().updatedAt?.toDate?.() || d.data().updatedAt || new Date(),
      requestedAt: d.data().requestedAt?.toDate?.() || d.data().requestedAt,
      respondedAt: d.data().respondedAt?.toDate?.() || d.data().respondedAt,
    } as TrainerRelationship))
  },

  // Used by requestTrainer to block multiple concurrent requests, and by UI
  // to display the trainee's current state.
  async hasActiveOrPendingTrainer(
    traineeId: string
  ): Promise<{ has: boolean; status?: RelationshipStatus; trainerName?: string }> {
    const q = query(
      collection(db, 'trainerRelationships'),
      where('traineeId', '==', traineeId),
      where('status', 'in', ['active', 'pending'])
    )
    const snapshot = await getDocs(q)
    if (snapshot.empty) return { has: false }
    const data = snapshot.docs[0].data()
    return {
      has: true,
      status: data.status as RelationshipStatus,
      trainerName: data.trainerName as string | undefined,
    }
  },

  // Most recent relationship state for a trainee, used by trainee UI to show
  // pending/rejected/cancelled banners. Terminal states (ended/cancelled)
  // older than STALE_TERMINAL_STATE_DAYS are hidden so the banner does not
  // surface forever after disconnect. `rejected` is always shown so the
  // trainee learns of the rejection.
  async getMyLatestRelationshipState(
    traineeId: string
  ): Promise<{
    relationshipId: string
    status: RelationshipStatus
    trainerName: string
    rejectionReason?: string
  } | null> {
    const q = query(
      collection(db, 'trainerRelationships'),
      where('traineeId', '==', traineeId),
      orderBy('updatedAt', 'desc'),
      limit(1)
    )
    const snapshot = await getDocs(q)
    if (snapshot.empty) return null

    const docSnap = snapshot.docs[0]
    const data = docSnap.data()
    const status = data.status as RelationshipStatus

    if (status === 'ended' || status === 'cancelled') {
      const updatedAt: Date | undefined =
        data.updatedAt?.toDate?.() || (data.updatedAt instanceof Date ? data.updatedAt : undefined)
      if (updatedAt) {
        const ageMs = Date.now() - updatedAt.getTime()
        const ageDays = ageMs / (1000 * 60 * 60 * 24)
        if (ageDays > STALE_TERMINAL_STATE_DAYS) return null
      }
    }

    return {
      relationshipId: docSnap.id,
      status,
      trainerName: (data.trainerName as string) || 'מאמן',
      rejectionReason: data.rejectionReason as string | undefined,
    }
  },

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
    // Filter out undefined values - Firestore doesn't accept them
    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([, value]) => value !== undefined)
    )
    await setDoc(docRef, {
      ...cleanData,
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

  // Fully disconnect a trainee from their trainer:
  // ends the relationship AND clears trainerId on the user doc so the
  // trainee can pick a new trainer via the self-select flow.
  async disconnectTrainee(
    relationshipId: string,
    traineeId: string,
    endedBy: 'trainer' | 'trainee' | 'admin',
    reason?: string
  ): Promise<void> {
    await this.endRelationship(relationshipId, endedBy, reason)
    // Clear trainerId on the user's profile (set to null so `where('trainerId', '==', null)` finds them)
    await updateUserProfile(traineeId, { trainerId: null as unknown as string })
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
                  photoURL: profile.photoURL,
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
    data: Partial<Pick<AppUser, 'firstName' | 'lastName' | 'phoneNumber' | 'trainingGoals' | 'injuriesOrLimitations' | 'age' | 'height' | 'weight' | 'bodyFatPercentage' | 'photoURL'>>
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

  // Get recently completed workouts for all trainer's trainees since a given date
  async getRecentTraineeCompletions(
    trainerId: string,
    since: Date
  ): Promise<TraineeWorkoutCompletion[]> {
    const relationships = await this.getTrainerTrainees(trainerId)
    if (relationships.length === 0) return []

    const completions: TraineeWorkoutCompletion[] = []

    await Promise.all(
      relationships.map(async (rel) => {
        try {
          const q = query(
            collection(db, 'workoutHistory'),
            where('userId', '==', rel.traineeId),
            where('status', '==', 'completed'),
            where('date', '>', Timestamp.fromDate(since)),
            orderBy('date', 'desc'),
            limit(10)
          )
          const snapshot = await getDocs(q)

          // Also fetch trainee profile for phone number
          const profile = await this.getTraineeProfile(rel.traineeId)

          for (const d of snapshot.docs) {
            const data = d.data()
            completions.push({
              traineeId: rel.traineeId,
              traineeName: rel.traineeName,
              traineePhone: profile?.phoneNumber,
              workoutId: d.id,
              workoutName: data.name || 'אימון',
              date: data.date?.toDate() || new Date(),
              duration: data.duration || 0,
              completedExercises: data.completedExercises || 0,
              totalExercises: data.totalExercises || 0,
              totalVolume: data.totalVolume || 0,
            })
          }
        } catch (error) {
          console.error(`Error fetching completions for trainee ${rel.traineeId}:`, error)
        }
      })
    )

    // Sort by date descending
    completions.sort((a, b) => b.date.getTime() - a.date.getTime())
    return completions
  },
}

export interface TraineeWorkoutCompletion {
  traineeId: string
  traineeName: string
  traineePhone?: string
  workoutId: string
  workoutName: string
  date: Date
  duration: number
  completedExercises: number
  totalExercises: number
  totalVolume: number
}
