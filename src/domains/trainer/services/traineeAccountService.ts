import { initializeApp, deleteApp } from 'firebase/app'
import {
  getAuth,
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
} from 'firebase/auth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db, auth } from '@/lib/firebase/config'
import { firebaseConfig } from '@/lib/firebase/config'
import type { CreateTraineeData } from '../types'
import { trainerService } from './trainerService'

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
   * 5. Send password reset email (trainee sets own password)
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

      await setDoc(userRef, userData)

      // Step 4: Create trainer-trainee relationship
      await trainerService.createRelationship({
        trainerId,
        traineeId: credential.user.uid,
        trainerName,
        traineeName: `${data.firstName} ${data.lastName}`,
        traineeEmail: data.email,
        status: 'active',
      })

      // Step 5: Send password reset email so trainee can set their own password
      // Using primary auth since it doesn't require being signed in
      await sendPasswordResetEmail(auth, data.email)

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
}
