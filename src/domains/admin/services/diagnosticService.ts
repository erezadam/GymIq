/**
 * Read-only Firestore service for the admin Diagnostic Console.
 *
 * Reads from `diagnosticLogs` (written by the writer added in PR #1) and from
 * the existing `workoutHistory` collection. Never writes diagnostic data — the
 * Diagnostic Console is observation-only.
 *
 * The active subject is hardcoded: `DEBUG_USER_UID` from PR #1. There is no UI
 * to change it. To add another user, edit the constant in PR #1.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit as firestoreLimit,
  orderBy,
  query,
  startAfter,
  Timestamp,
  where,
  type DocumentData,
  type QueryConstraint,
  type QueryDocumentSnapshot,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { DEBUG_USER_UID } from '@/lib/firebase/diagnosticLogs'
import { getWorkoutById as getWorkoutEntryById } from '@/lib/firebase/workoutHistory'
import type {
  DiagnosticLog,
  DiagnosticLogFilters,
  DiagnosticEventType,
  SessionSummary,
  WorkoutFilters,
} from '../types/diagnostic.types'
import type { WorkoutHistoryEntry, WorkoutHistorySummary } from '@/domains/workouts/types'

export { DEBUG_USER_UID }

const LOGS_COLLECTION = 'diagnosticLogs'
const WORKOUTS_COLLECTION = 'workoutHistory'
const DEFAULT_PAGE_SIZE = 50
const SESSIONS_SCAN_LIMIT = 500

function toDate(value: unknown): Date {
  if (value instanceof Date) return value
  // Duck-type Timestamp-like objects (production: firebase Timestamp instance;
  // tests: mocked literal with toDate). Avoids `instanceof Timestamp` which
  // breaks under mocks where Timestamp is not a class.
  if (
    value &&
    typeof value === 'object' &&
    'toDate' in value &&
    typeof (value as { toDate: () => Date }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate()
  }
  return new Date(0)
}

function snapshotToLog(snap: QueryDocumentSnapshot<DocumentData>): DiagnosticLog {
  const data = snap.data()
  return {
    id: snap.id,
    userId: String(data.userId ?? ''),
    workoutOwnerId:
      typeof data.workoutOwnerId === 'string' ? data.workoutOwnerId : undefined,
    sessionId: String(data.sessionId ?? ''),
    timestamp: toDate(data.timestamp),
    eventType: data.eventType as DiagnosticEventType,
    workoutId: typeof data.workoutId === 'string' ? data.workoutId : null,
    payload:
      data.payload && typeof data.payload === 'object'
        ? (data.payload as Record<string, unknown>)
        : {},
    stackTrace: typeof data.stackTrace === 'string' ? data.stackTrace : '',
    userAgent: typeof data.userAgent === 'string' ? data.userAgent : '',
    url: typeof data.url === 'string' ? data.url : '',
  }
}

/**
 * Page diagnostic logs for DEBUG_USER_UID, newest first.
 *
 * Composite index required (defined in PR #1's firestore.indexes.json):
 *   diagnosticLogs: userId ASC, timestamp DESC
 *
 * `eventTypes` filter applied client-side when 1 < count < 6, since Firestore's
 * `in` operator caps at 10 values and per-call composite indexing for every
 * combination would be wasteful. Single-value filter goes through the query.
 */
export async function getDiagnosticLogs(
  filters: DiagnosticLogFilters = {},
): Promise<{ logs: DiagnosticLog[]; hasMore: boolean; nextCursor: Date | null }> {
  const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE
  const constraints: QueryConstraint[] = [
    where('userId', '==', DEBUG_USER_UID),
    orderBy('timestamp', 'desc'),
  ]

  if (filters.dateTo) {
    constraints.push(where('timestamp', '<=', Timestamp.fromDate(filters.dateTo)))
  }
  if (filters.dateFrom) {
    constraints.push(where('timestamp', '>=', Timestamp.fromDate(filters.dateFrom)))
  }
  if (filters.sessionId) {
    constraints.push(where('sessionId', '==', filters.sessionId))
  }
  if (filters.eventTypes && filters.eventTypes.length === 1) {
    constraints.push(where('eventType', '==', filters.eventTypes[0]))
  }
  if (filters.cursor) {
    constraints.push(startAfter(Timestamp.fromDate(filters.cursor)))
  }

  // Fetch one extra to know if more exist.
  constraints.push(firestoreLimit(pageSize + 1))

  const snapshot = await getDocs(query(collection(db, LOGS_COLLECTION), ...constraints))

  // hasMore reflects RAW Firestore results (pre-filter) so pagination doesn't
  // silently stop early when client-side filters reduce the visible count
  // below pageSize. The displayed page may show fewer than pageSize entries
  // when filters are narrow — that's intentional.
  const rawHasMore = snapshot.docs.length > pageSize
  const docsToProcess = rawHasMore ? snapshot.docs.slice(0, pageSize) : snapshot.docs
  const rawLogs = docsToProcess.map(snapshotToLog)
  // nextCursor derived from the LAST RAW doc on the page (pre-filter) so
  // pagination advances even when client-side filtering empties the visible
  // page — otherwise the "Next" button would be enabled but a click would
  // refetch the same page in a loop.
  const nextCursor =
    rawHasMore && rawLogs.length > 0 ? rawLogs[rawLogs.length - 1].timestamp : null

  let logs = rawLogs
  if (filters.eventTypes && filters.eventTypes.length > 1 && filters.eventTypes.length < 6) {
    const set = new Set(filters.eventTypes)
    logs = logs.filter((l) => set.has(l.eventType))
  }

  return { logs, hasMore: rawHasMore, nextCursor }
}

/**
 * List unique sessions for DEBUG_USER_UID. Aggregates client-side from up to
 * SESSIONS_SCAN_LIMIT recent logs. Throws if the cap is hit so the admin knows
 * pagination is needed.
 */
export async function getUserSessions(): Promise<SessionSummary[]> {
  const snapshot = await getDocs(
    query(
      collection(db, LOGS_COLLECTION),
      where('userId', '==', DEBUG_USER_UID),
      orderBy('timestamp', 'desc'),
      firestoreLimit(SESSIONS_SCAN_LIMIT),
    ),
  )

  if (snapshot.docs.length >= SESSIONS_SCAN_LIMIT) {
    throw new Error(
      `יותר מ-${SESSIONS_SCAN_LIMIT} לוגים — אגרגציה client-side לא בטוחה. נדרשת מיגרציה ל-sessions collection.`,
    )
  }

  const bySession = new Map<string, { start: Date; end: Date; count: number }>()
  for (const docSnap of snapshot.docs) {
    const log = snapshotToLog(docSnap)
    if (!log.sessionId) continue
    const existing = bySession.get(log.sessionId)
    if (existing) {
      existing.count += 1
      if (log.timestamp < existing.start) existing.start = log.timestamp
      if (log.timestamp > existing.end) existing.end = log.timestamp
    } else {
      bySession.set(log.sessionId, {
        start: log.timestamp,
        end: log.timestamp,
        count: 1,
      })
    }
  }

  const result: SessionSummary[] = []
  for (const [sessionId, agg] of bySession.entries()) {
    result.push({
      sessionId,
      startTime: agg.start,
      endTime: agg.end,
      eventCount: agg.count,
    })
  }
  result.sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
  return result
}

/** All logs for a single session, ordered ASC by timestamp (replay order). */
export async function getSessionLogs(sessionId: string): Promise<DiagnosticLog[]> {
  if (!sessionId) return []
  const snapshot = await getDocs(
    query(
      collection(db, LOGS_COLLECTION),
      where('sessionId', '==', sessionId),
      orderBy('timestamp', 'asc'),
    ),
  )
  return snapshot.docs.map(snapshotToLog)
}

function workoutSummaryFromDoc(
  snap: QueryDocumentSnapshot<DocumentData>,
): WorkoutHistorySummary {
  const data = snap.data()
  return {
    id: snap.id,
    name: typeof data.name === 'string' ? data.name : 'אימון',
    date: toDate(data.date),
    duration: typeof data.duration === 'number' ? data.duration : 0,
    status: (data.status ?? 'in_progress') as WorkoutHistorySummary['status'],
    completedExercises:
      typeof data.completedExercises === 'number' ? data.completedExercises : 0,
    totalExercises: typeof data.totalExercises === 'number' ? data.totalExercises : 0,
    totalVolume: typeof data.totalVolume === 'number' ? data.totalVolume : 0,
    personalRecords:
      typeof data.personalRecords === 'number' ? data.personalRecords : 0,
    programId: typeof data.programId === 'string' ? data.programId : undefined,
    programDayLabel:
      typeof data.programDayLabel === 'string' ? data.programDayLabel : undefined,
    deletedByTrainee: data.deletedByTrainee
      ? {
          deletedAt: toDate(
            (data.deletedByTrainee as { deletedAt?: unknown }).deletedAt,
          ),
          reason: (data.deletedByTrainee as { reason?: string }).reason,
        }
      : undefined,
  }
}

/**
 * Page workoutHistory docs for DEBUG_USER_UID. Includes soft-deleted by
 * default; `deletedFilter` narrows. Sorted by `date DESC` (matches existing
 * single-field index — no extra index required).
 */
export async function getWorkoutsForUser(
  filters: WorkoutFilters = {},
): Promise<{ workouts: WorkoutHistorySummary[]; hasMore: boolean; nextCursor: Date | null }> {
  const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE
  const constraints: QueryConstraint[] = [
    where('userId', '==', DEBUG_USER_UID),
    orderBy('date', 'desc'),
  ]

  if (filters.dateTo) {
    constraints.push(where('date', '<=', Timestamp.fromDate(filters.dateTo)))
  }
  if (filters.dateFrom) {
    constraints.push(where('date', '>=', Timestamp.fromDate(filters.dateFrom)))
  }
  if (filters.cursor) {
    constraints.push(startAfter(Timestamp.fromDate(filters.cursor)))
  }
  constraints.push(firestoreLimit(pageSize + 1))

  const snapshot = await getDocs(query(collection(db, WORKOUTS_COLLECTION), ...constraints))

  // Same pattern as getDiagnosticLogs: hasMore is computed from the RAW
  // Firestore result before client-side filtering, so pagination doesn't
  // silently stop early when statuses/deletedFilter narrow the visible rows.
  const rawHasMore = snapshot.docs.length > pageSize
  const docsToProcess = rawHasMore ? snapshot.docs.slice(0, pageSize) : snapshot.docs
  const rawWorkouts = docsToProcess.map(workoutSummaryFromDoc)
  // Same pattern as getDiagnosticLogs — nextCursor from the last RAW doc, so
  // status/deletedFilter never strands the user on a page that filters away to zero.
  const nextCursor =
    rawHasMore && rawWorkouts.length > 0
      ? rawWorkouts[rawWorkouts.length - 1].date
      : null

  let workouts = rawWorkouts
  if (filters.statuses && filters.statuses.length > 0) {
    const set = new Set(filters.statuses)
    workouts = workouts.filter((w) => set.has(w.status))
  }

  if (filters.deletedFilter === 'yes') {
    workouts = workouts.filter((w) => !!w.deletedByTrainee)
  } else if (filters.deletedFilter === 'no') {
    workouts = workouts.filter((w) => !w.deletedByTrainee)
  }

  return { workouts, hasMore: rawHasMore, nextCursor }
}

/**
 * Full workout entry for the JSON modal. Bypasses `getUserWorkoutHistory`'s
 * `isNotSoftDeleted` filter by reading the doc directly.
 */
export async function getWorkoutFullEntry(
  workoutId: string,
): Promise<WorkoutHistoryEntry | null> {
  // Reuse the existing single-doc reader — it does not filter soft-deleted.
  return await getWorkoutEntryById(workoutId)
}

/**
 * Fetch the raw Firestore document data (untouched by the type mapper) for the
 * JSON viewer. Useful for inspecting fields the typed model omits.
 */
export async function getWorkoutRaw(
  workoutId: string,
): Promise<Record<string, unknown> | null> {
  const snap = await getDoc(doc(db, WORKOUTS_COLLECTION, workoutId))
  if (!snap.exists()) return null
  return snap.data() as Record<string, unknown>
}
