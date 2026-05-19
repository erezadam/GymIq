/**
 * Diagnostic logs service — fire-and-forget Firestore writes for any
 * authenticated user, gated by a global kill switch.
 *
 * Write path (`logDiagnostic`):
 *   1. No authenticated actor → return.
 *   2. Kill switch is `false` → return (with bounded staleness, see below).
 *   3. Otherwise, append to `diagnosticLogs` with full event context.
 *
 * Kill switch source: `settings/app.diagnosticLogsEnabled`. Cached in-memory
 * with a 60s TTL. Behavior:
 *   - Cold start (no value cached yet): treat as `true` (fail-open) so a
 *     fresh deploy doesn't silently lose observability before the field is
 *     written manually.
 *   - Field absent in Firestore: treat as `true` (same fail-open rationale).
 *   - Field === `false`: writes are dropped.
 *   - getDoc rejection (transient Firestore read failure): keep the previously
 *     cached value. Don't misread an outage as "field absent → true".
 *   - Cache refresh runs in the background (does not block the caller). The
 *     current call uses whatever value is already cached.
 *
 * The companion admin UI (Diagnostic Console) reads from this collection via
 * `src/domains/admin/services/diagnosticService.ts`, which now accepts an
 * arbitrary `userId` instead of a hardcoded debug uid.
 *
 * `expiresAt` carries a 30-day TTL marker. Actual deletion happens via
 * Firestore TTL policy (configured manually in Firebase Console on this
 * field) — `firestore.rules` cannot delete data.
 */

import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { auth, db } from './config'
import { removeUndefined } from './firestoreUtils'
import { APP_SETTINGS_DOC, SETTINGS_COLLECTION } from './appSettings'

const COLLECTION_NAME = 'diagnosticLogs'
const SESSION_STORAGE_KEY = 'gymiq_session_id'
const KILL_SWITCH_TTL_MS = 60_000
const LOG_RETENTION_MS = 30 * 24 * 60 * 60 * 1000

export type DiagnosticEventType =
  | 'WORKOUT_CREATED'
  | 'WORKOUT_AUTOSAVE'
  | 'WORKOUT_COMPLETE'
  | 'SOFT_DELETE'
  | 'WORKOUT_RECOVERY_FOUND'
  | 'WORKOUT_VALIDATION'
  | 'WORKOUT_INIT_START'
  | 'WORKOUT_INIT_TIMING'

let killSwitchCachedValue = true
let killSwitchLoadedAt = 0
let killSwitchInFlight: Promise<void> | null = null

function refreshKillSwitchInBackground(): void {
  if (killSwitchInFlight) return
  killSwitchInFlight = (async () => {
    try {
      const snap = await getDoc(doc(db, SETTINGS_COLLECTION, APP_SETTINGS_DOC))
      if (snap.exists()) {
        const data = snap.data() as { diagnosticLogsEnabled?: unknown }
        // Only an explicit `false` disables. Missing field, true, or any
        // other value leaves logging enabled.
        killSwitchCachedValue = data.diagnosticLogsEnabled !== false
      } else {
        // Doc missing → fail-open.
        killSwitchCachedValue = true
      }
      killSwitchLoadedAt = Date.now()
    } catch {
      // Read failure: keep the previous cached value, but advance the load
      // timestamp so we don't hammer Firestore on every call during an
      // outage. Next refresh in TTL_MS.
      killSwitchLoadedAt = Date.now()
    } finally {
      killSwitchInFlight = null
    }
  })()
}

function isLoggingEnabled(): boolean {
  if (Date.now() - killSwitchLoadedAt >= KILL_SWITCH_TTL_MS) {
    refreshKillSwitchInBackground()
  }
  return killSwitchCachedValue
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
  if (!actorUid) return
  if (!isLoggingEnabled()) return

  const stackTrace = captureStackTrace()
  const ownerForDoc =
    workoutOwnerId && workoutOwnerId !== actorUid ? workoutOwnerId : null
  const expiresAt = Timestamp.fromDate(new Date(Date.now() + LOG_RETENTION_MS))

  const docData = {
    userId: actorUid,
    workoutOwnerId: ownerForDoc,
    sessionId: getOrCreateSessionId(),
    timestamp: serverTimestamp(),
    expiresAt,
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

// Test-only: reset kill-switch in-memory cache between specs so the cold-start
// behavior is reproducible. NOT for production use.
export function __resetKillSwitchCacheForTests(): void {
  killSwitchCachedValue = true
  killSwitchLoadedAt = 0
  killSwitchInFlight = null
}
