/**
 * Cloud Function: approveTrainerRequest
 *
 * Atomically transitions a pending trainerRelationships document to 'active'
 * AND sets the trainee's user.trainerId — inside a Firestore runTransaction
 * so concurrent approvals or double-clicks are rejected via optimistic
 * concurrency. (The client-side rules cannot grant a trainer permission to
 * set users.trainerId for a not-yet-linked trainee, hence the CF.)
 *
 * Race protection: the transaction re-reads both documents from Firestore
 * inside the tx; if the trainee is bound to a different trainer between the
 * caller's read and the commit, the transaction marks THIS request as
 * 'rejected' with rejectionReason='TRAINEE_ALREADY_HAS_TRAINER' and the CF
 * reports failed-precondition to the caller. Two parallel approvals against
 * the same trainee can no longer both win — Firestore's tx engine retries
 * one of them on commit-conflict, after which the rerun observes the
 * already-set trainerId and the race-rejection branch fires.
 *
 * Email: best-effort after a successful commit. A failure to send the
 * approval email is logged but does not roll back the approval.
 */

import * as admin from 'firebase-admin'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { sendTrainerApprovedEmailDirect } from '../email/trainerApproval'

interface ApproveRequestPayload {
  relationshipId: string
}

type TxOutcome =
  | { kind: 'approved'; traineeId: string; traineeEmail?: string; traineeName: string; trainerName: string }
  | { kind: 'race_already_has_trainer' }

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
    const callerUid = request.auth.uid
    const FieldValue = admin.firestore.FieldValue

    const outcome: TxOutcome = await db.runTransaction(async (tx) => {
      const relSnap = await tx.get(relRef)
      if (!relSnap.exists) {
        throw new HttpsError('not-found', 'Relationship not found')
      }
      const rel = relSnap.data()!

      if (rel.trainerId !== callerUid) {
        throw new HttpsError('permission-denied', 'Caller is not the trainer on this relationship')
      }
      if (rel.status !== 'pending') {
        // Idempotent: a second approve on an already-approved/rejected request
        // throws failed-precondition rather than re-emailing.
        throw new HttpsError('failed-precondition', `Relationship status is "${rel.status}", expected "pending"`)
      }

      const traineeId = rel.traineeId as string
      const traineeRef = db.collection('users').doc(traineeId)
      const traineeSnap = await tx.get(traineeRef)
      if (!traineeSnap.exists) {
        throw new HttpsError('not-found', 'Trainee user document not found')
      }
      const traineeData = traineeSnap.data()!

      if (traineeData.trainerId && traineeData.trainerId !== callerUid) {
        // Race: another trainer already linked. Mark this request rejected
        // INSIDE the same transaction so the rejection commits atomically
        // alongside the read that observed the conflict. Returning here
        // (no throw) lets the tx commit the rejection write; the CF
        // converts the outcome into a client-facing failed-precondition
        // outside the transaction.
        tx.update(relRef, {
          status: 'rejected',
          rejectionReason: 'TRAINEE_ALREADY_HAS_TRAINER',
          respondedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        })
        return { kind: 'race_already_has_trainer' }
      }

      // Atomic happy path: relationship → 'active' AND user.trainerId set.
      tx.update(relRef, {
        status: 'active',
        respondedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      })
      tx.update(traineeRef, {
        trainerId: callerUid,
        updatedAt: FieldValue.serverTimestamp(),
      })

      return {
        kind: 'approved',
        traineeId,
        traineeEmail: (rel.traineeEmail as string | undefined) || (traineeData.email as string | undefined),
        traineeName: (rel.traineeName as string | undefined) || (traineeData.displayName as string | undefined) || 'מתאמן',
        trainerName: (rel.trainerName as string | undefined) || 'מאמן',
      }
    })

    if (outcome.kind === 'race_already_has_trainer') {
      throw new HttpsError(
        'failed-precondition',
        'Trainee is already assigned to another trainer'
      )
    }

    // Email is best-effort. A failure here must not roll back the approval.
    try {
      if (outcome.traineeEmail) {
        await sendTrainerApprovedEmailDirect({
          traineeEmail: outcome.traineeEmail,
          traineeName: outcome.traineeName,
          trainerName: outcome.trainerName,
        })
      } else {
        console.warn(`approveTrainerRequest: no trainee email for ${outcome.traineeId}; skipping notification`)
      }
    } catch (emailErr) {
      console.error('approveTrainerRequest: approval email failed (commit succeeded):', emailErr)
    }

    return { success: true }
  }
)
