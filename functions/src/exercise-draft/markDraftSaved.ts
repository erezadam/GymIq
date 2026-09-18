/**
 * markDraftSaved - Cloud Function (admin add-exercise flow)
 * Marks an exerciseDrafts document as 'saved' with the created exerciseId.
 * Admin-only, same gate as generateExerciseDraft.
 */

import * as admin from 'firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'
import { HttpsError, onCall } from 'firebase-functions/v2/https'

export interface MarkDraftSavedRequest {
  draftId: string
  exerciseId: string
}

export async function handleMarkDraftSaved(request: {
  auth?: { uid: string } | null
  data: unknown
}): Promise<{ ok: true }> {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'יש להתחבר')
  }

  const db = admin.firestore()
  const callerDoc = await db.collection('users').doc(request.auth.uid).get()
  if (!callerDoc.exists || callerDoc.data()?.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Only an admin can mark drafts as saved')
  }

  const d = request.data as Partial<MarkDraftSavedRequest> | null | undefined
  if (!d || typeof d.draftId !== 'string' || !d.draftId || typeof d.exerciseId !== 'string' || !d.exerciseId) {
    throw new HttpsError('invalid-argument', 'draftId and exerciseId are required')
  }

  const draftRef = db.collection('exerciseDrafts').doc(d.draftId)
  const snap = await draftRef.get()
  if (!snap.exists) {
    throw new HttpsError('not-found', 'Draft not found')
  }

  await draftRef.set(
    {
      status: 'saved',
      exerciseId: d.exerciseId,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  )

  return { ok: true }
}

export const markDraftSaved = onCall(
  { timeoutSeconds: 30, memory: '256MiB' },
  (request): Promise<{ ok: true }> =>
    handleMarkDraftSaved(request as { auth?: { uid: string } | null; data: unknown })
)
