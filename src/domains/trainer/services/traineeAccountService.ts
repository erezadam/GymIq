import { initializeApp, deleteApp } from 'firebase/app'
import {
  getAuth,
  createUserWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth'
import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { db, app } from '@/lib/firebase/config'
import { firebaseConfig } from '@/lib/firebase/config'
import type { CreateTraineeData, TrainingGoal } from '../types'
import { trainerService } from './trainerService'
import type { AppUser } from '@/lib/firebase/auth'

const functions = getFunctions(app)

export const traineeAccountService = {
  /**
   * Creates a new trainee account using a secondary Firebase app instance.
   * This prevents the currently logged-in trainer from being signed out.
   *
   * Flow:
   * 1. Create Firebase Auth user via secondary app
   * 2. Update display name
   * 3. Create user document in Firestore (with trainerId)
   * 4. Create trainer-trainee relationship
   * 5. Send welcome email with password setup link (via Cloud Function)
   * 6. Clean up secondary app
   */
  async createTraineeAccount(
    data: CreateTraineeData,
    trainerId: string,
    trainerName: string
  ): Promise<{ uid: string; email: string }> {
    // Create secondary Firebase app to avoid signing out the trainer
    const secondaryApp = initializeApp(firebaseConfig, `secondary-${Date.now()}`)
    const secondaryAuth = getAuth(secondaryApp)

    try {
      // Step 1: Create Firebase Auth user
      const credential = await createUserWithEmailAndPassword(
        secondaryAuth,
        data.email,
        data.password
      )

      // Step 2: Update display name
      await updateProfile(credential.user, {
        displayName: `${data.firstName} ${data.lastName}`,
      })

      // Step 3: Create user document in Firestore
      // Using the main db instance (not secondary) since Firestore is shared
      const userRef = doc(db, 'users', credential.user.uid)
      const userData: Record<string, unknown> = {
        uid: credential.user.uid,
        email: data.email,
        displayName: `${data.firstName} ${data.lastName}`,
        firstName: data.firstName,
        lastName: data.lastName,
        role: 'user',
        trainerId,
        trainingGoals: data.trainingGoals || [],
        injuriesOrLimitations: data.injuries || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }

      // Only add optional fields if defined (Firestore doesn't accept undefined)
      if (data.phone) {
        userData.phoneNumber = data.phone
      }
      if (data.age != null) {
        userData.age = data.age
      }
      if (data.height != null) {
        userData.height = data.height
      }
      if (data.weight != null) {
        userData.weight = data.weight
      }
      if (data.bodyFatPercentage != null) {
        userData.bodyFatPercentage = data.bodyFatPercentage
      }

      await setDoc(userRef, userData)

      // Step 4: Create trainer-trainee relationship
      await trainerService.createRelationship({
        trainerId,
        traineeId: credential.user.uid,
        trainerName,
        traineeName: `${data.firstName} ${data.lastName}`,
        traineeEmail: data.email,
        status: 'active',
        notes: data.notes?.trim() || undefined,
      })

      // Step 5: Send welcome email with password setup link
      // Cloud Function generates the password reset link via Admin SDK and sends branded email
      try {
        const sendWelcomeEmail = httpsCallable(functions, 'sendWelcomeEmail')
        await sendWelcomeEmail({
          traineeEmail: data.email,
          traineeName: `${data.firstName} ${data.lastName}`,
          trainerName,
        })
      } catch (emailError) {
        // Email failure should not block trainee creation
        console.error('Failed to send welcome email:', emailError)
      }

      return { uid: credential.user.uid, email: data.email }
    } finally {
      // Always clean up secondary app
      try {
        await deleteApp(secondaryApp)
      } catch {
        // Ignore cleanup errors
      }
    }
  },

  /**
   * Links an existing user to a trainer.
   * This is used when the email already exists in the system and the user
   * doesn't have a trainer assigned yet.
   *
   * Flow:
   * 1. Update user document with trainerId and any new fields
   * 2. Create trainer-trainee relationship
   */
  async linkExistingUser(
    existingUser: AppUser,
    trainerId: string,
    trainerName: string,
    updates: {
      trainingGoals?: TrainingGoal[]
      injuries?: string
      notes?: string
      age?: number
      height?: number
      weight?: number
      bodyFatPercentage?: number
    }
  ): Promise<{ uid: string; email: string }> {
    // Step 1: Update user document with trainerId and new fields
    const userRef = doc(db, 'users', existingUser.uid)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {
      trainerId,
      updatedAt: serverTimestamp(),
    }

    if (updates.trainingGoals && updates.trainingGoals.length > 0) {
      updateData.trainingGoals = updates.trainingGoals
    }
    if (updates.injuries) {
      updateData.injuriesOrLimitations = updates.injuries
    }
    // Body metrics - only update if provided
    if (updates.age != null) {
      updateData.age = updates.age
    }
    if (updates.height != null) {
      updateData.height = updates.height
    }
    if (updates.weight != null) {
      updateData.weight = updates.weight
    }
    if (updates.bodyFatPercentage != null) {
      updateData.bodyFatPercentage = updates.bodyFatPercentage
    }

    await updateDoc(userRef, updateData)

    // Step 2: Create trainer-trainee relationship
    await trainerService.createRelationship({
      trainerId,
      traineeId: existingUser.uid,
      trainerName,
      traineeName: existingUser.displayName || `${existingUser.firstName} ${existingUser.lastName}`,
      traineeEmail: existingUser.email,
      status: 'active',
      notes: updates.notes?.trim() || undefined,
    })

    return { uid: existingUser.uid, email: existingUser.email }
  },
}
