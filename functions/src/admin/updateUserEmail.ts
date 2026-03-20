/**
 * Update User Email - Cloud Function
 * Updates both Firebase Auth email and Firestore user document.
 * Only callable by: the trainee's trainer or an admin.
 */

import * as admin from 'firebase-admin'
import { onCall, HttpsError } from 'firebase-functions/v2/https'

interface UpdateEmailRequest {
  userId: string
  newEmail: string
}

export const updateUserEmail = onCall(async (request) => {
  // Must be authenticated
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication required')
  }

  const { userId, newEmail } = request.data as UpdateEmailRequest

  if (!userId || !newEmail) {
    throw new HttpsError('invalid-argument', 'userId and newEmail are required')
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(newEmail)) {
    throw new HttpsError('invalid-argument', 'Invalid email format')
  }

  const db = admin.firestore()
  const callerUid = request.auth.uid

  // Get caller's role
  const callerDoc = await db.doc(`users/${callerUid}`).get()
  if (!callerDoc.exists) {
    throw new HttpsError('not-found', 'Caller user not found')
  }
  const callerRole = callerDoc.data()?.role

  // Get target user
  const targetDoc = await db.doc(`users/${userId}`).get()
  if (!targetDoc.exists) {
    throw new HttpsError('not-found', 'Target user not found')
  }
  const targetData = targetDoc.data()

  // Authorization: caller must be admin OR the trainer of this trainee
  const isAdmin = callerRole === 'admin'
  const isTrainerOfUser = (callerRole === 'trainer' || callerRole === 'admin') &&
    targetData?.trainerId === callerUid

  if (!isAdmin && !isTrainerOfUser) {
    throw new HttpsError('permission-denied', 'Only the trainer of this user or an admin can update email')
  }

  try {
    // Update Firebase Auth email
    await admin.auth().updateUser(userId, { email: newEmail })

    // Update Firestore user document
    await db.doc(`users/${userId}`).update({
      email: newEmail,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    return { success: true }
  } catch (error: any) {
    if (error.code === 'auth/email-already-exists') {
      throw new HttpsError('already-exists', 'כתובת האימייל כבר בשימוש')
    }
    if (error.code === 'auth/invalid-email') {
      throw new HttpsError('invalid-argument', 'כתובת אימייל לא תקינה')
    }
    console.error('Error updating user email:', error)
    throw new HttpsError('internal', 'Failed to update email')
  }
})
