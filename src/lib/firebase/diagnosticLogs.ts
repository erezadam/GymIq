/**
 * Diagnostic logs service — fire-and-forget Firestore writes for one debug user.
 *
 * Activated only when the actor's auth uid matches DEBUG_USER_UID. For any other
 * user, every call returns immediately with zero side effects (no Firestore reads
 * or writes, no allocations beyond a function call).
 *
 * Writes go to the `diagnosticLogs` collection. Each log carries the full event
 * context (actor uid, optional workout owner uid, sessionId scoped to the tab,
 * server timestamp, eventType, workoutId, custom payload, stack trace, user agent,
 * URL). Failures are swallowed with `console.warn` — diagnostic logging must
 * never break the host flow.
 *
 * The companion admin UI (separate PR) imports `DEBUG_USER_UID` from this module —
 * do not duplicate the constant.
 */

import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { auth, db } from './config'
import { removeUndefined } from './firestoreUtils'

export const DEBUG_USER_UID = 'OHxRVH3RdUP8k7xQBuAa5ZXvfrI2'

const COLLECTION_NAME = 'diagnosticLogs'
const SESSION_STORAGE_KEY = 'gymiq_session_id'

export type DiagnosticEventType =
  | 'WORKOUT_CREATED'
  | 'WORKOUT_AUTOSAVE'
  | 'WORKOUT_COMPLETE'
  | 'SOFT_DELETE'
  | 'WORKOUT_RECOVERY_FOUND'
  | 'WORKOUT_VALIDATION'

export function shouldLogForUser(userId: string | null | undefined): boolean {
  return userId === DEBUG_USER_UID
}

function getOrCreateSessionId(): string {
  if (typeof sessionStorage === 'undefined') return 'no-session-storage'
  let id = sessionStorage.getItem(SESSION_STORAGE_KEY)
  if (!id) {
    id = crypto.randomUUID()
    sessionStorage.setItem(SESSION_STORAGE_KEY, id)
  }
  return id
}

function captureStackTrace(): string {
  const err = new Error()
  if (!err.stack) return ''
  const lines = err.stack.split('\n')

  // Structural skip — survives bundler name-mangling that breaks string-based filters.
  // V8 (Chrome/Edge/Node) prefixes the stack with "Error" or "Error: <message>".
  // JavaScriptCore (iOS Safari) and SpiderMonkey (Firefox) do not.
  // After the optional prefix, the next 2 frames are always captureStackTrace itself
  // and logDiagnostic — regardless of whether their names survive minification.
  const startsWithErrorPrefix = /^Error(:.*)?$/.test(lines[0]?.trim() ?? '')
  const skipCount = startsWithErrorPrefix ? 3 : 2

  return lines
    .slice(skipCount, skipCount + 8)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .join('\n')
}

export function logDiagnostic(
  eventType: DiagnosticEventType,
  workoutId: string | null,
  payload: Record<string, unknown>,
  workoutOwnerId?: string | null,
): void {
  const actorUid = auth.currentUser?.uid ?? null
  if (!shouldLogForUser(actorUid)) return

  const stackTrace = captureStackTrace()
  const ownerForDoc =
    workoutOwnerId && workoutOwnerId !== actorUid ? workoutOwnerId : null

  const docData = {
    userId: actorUid,
    workoutOwnerId: ownerForDoc,
    sessionId: getOrCreateSessionId(),
    timestamp: serverTimestamp(),
    eventType,
    workoutId: workoutId ?? null,
    payload: removeUndefined(payload),
    stackTrace,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    url: typeof window !== 'undefined' ? window.location.pathname : '',
  }

  void addDoc(collection(db, COLLECTION_NAME), docData).catch((err) => {
    console.warn('Diagnostic log failed:', err)
  })
}
