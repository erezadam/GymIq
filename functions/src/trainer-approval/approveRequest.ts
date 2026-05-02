/**
 * Cloud Function: approveTrainerRequest
 *
 * Atomically transitions a pending trainerRelationships document to 'active'
 * AND sets the trainee's user.trainerId — in a single batched write that the
 * Admin SDK can perform without being constrained by Firestore client rules.
 * (The client-side rules cannot grant a trainer permission to set
 * users.trainerId for a not-yet-linked trainee, hence the CF.)
 *
 * Race protection: if the trainee has been bound to a different trainer
 * between the request and the approval, this function marks the current
 * request as 'rejected' with rejectionReason='TRAINEE_ALREADY_HAS_TRAINER'
 * and reports failed-precondition to the caller.
 *
 * Email: after a successful commit the trainee receives an approval email.
 * Email failure is logged but does not roll back the approval.
 */

import * as admin from 'firebase-admin'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { sendTrainerApprovedEmailDirect } from '../email/trainerApproval'

interface ApproveRequestPayload {
  relationshipId: string
}

export const approveTrainerRequest = onCall(
  { secrets: ['RESEND_API_KEY'], timeoutSeconds: 30, memory: '256MiB' },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required')
    }
    const { relationshipId } = (request.data || {}) as Partial<ApproveRequestPayload>
    if (!relationshipId) {
      throw new HttpsError('invalid-argument', 'relationshipId is required')
    }

    const db = admin.firestore()
    const relRef = db.collection('trainerRelationships').doc(relationshipId)
    const relSnap = await relRef.get()
    if (!relSnap.exists) {
      throw new HttpsError('not-found', 'Relationship not found')
    }
    const rel = relSnap.data()!

    // Authorization: only the trainer named on this relationship can approve.
    if (rel.trainerId !== request.auth.uid) {
      throw new HttpsError('permission-denied', 'Caller is not the trainer on this relationship')
    }

    // Status: must currently be pending.
    if (rel.status !== 'pending') {
      throw new HttpsError('failed-precondition', `Relationship status is "${rel.status}", expected "pending"`)
    }

    const traineeId = rel.traineeId as string
    const traineeRef = db.collection('users').doc(traineeId)

    // Race detection: trainee may have an active trainer already (from a
    // parallel approval, or from a trainer-initiated createTraineeAccount that
    // ran after this pending request). If so, reject this request and abort.
    const traineeSnap = await traineeRef.get()
    if (!traineeSnap.exists) {
      throw new HttpsError('not-found', 'Trainee user document not found')
    }
    const traineeData = traineeSnap.data()!
    if (traineeData.trainerId && traineeData.trainerId !== request.auth.uid) {
      // Mark the current request as rejected so it doesn't linger as pending.
      await relRef.update({
        status: 'rejected',
        rejectionReason: 'TRAINEE_ALREADY_HAS_TRAINER',
        respondedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      })
      throw new HttpsError(
        'failed-precondition',
        'Trainee is already assigned to another trainer'
      )
    }

    // Atomic commit: relationship.status='active' + user.trainerId=trainerId.
    const batch = db.batch()
    batch.update(relRef, {
      status: 'active',
      respondedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    })
    batch.update(traineeRef, {
      trainerId: request.auth.uid,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    })
    await batch.commit()

    // Email is best-effort. A failure here must not roll back the approval.
    try {
      const traineeEmail = (rel.traineeEmail as string | undefined) || (traineeData.email as string | undefined)
      const traineeName = (rel.traineeName as string | undefined) || (traineeData.displayName as string | undefined) || 'מתאמן'
      const trainerName = (rel.trainerName as string | undefined) || 'מאמן'
      if (traineeEmail) {
        await sendTrainerApprovedEmailDirect({ traineeEmail, traineeName, trainerName })
      } else {
        console.warn(`approveTrainerRequest: no trainee email for ${traineeId}; skipping notification`)
      }
    } catch (emailErr) {
      console.error('approveTrainerRequest: approval email failed (commit succeeded):', emailErr)
    }

    return { success: true }
  }
)
