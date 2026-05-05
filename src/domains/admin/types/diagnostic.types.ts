// MIRROR of src/lib/firebase/diagnosticLogs.ts. Keep in sync.
// If the writer-side schema changes (eventType enum, payload shape, field names),
// update this file verbatim and bump any related UI assumptions.

import type { WorkoutCompletionStatus } from '@/domains/workouts/types'

export type DiagnosticEventType =
  | 'WORKOUT_AUTOSAVE'
  | 'WORKOUT_COMPLETE'
  | 'WORKOUT_RECOVERY_FOUND'
  | 'SOFT_DELETE'
  | 'WORKOUT_VALIDATION'
  | 'WORKOUT_CREATED'

export const DIAGNOSTIC_EVENT_TYPES: DiagnosticEventType[] = [
  'WORKOUT_AUTOSAVE',
  'WORKOUT_COMPLETE',
  'WORKOUT_RECOVERY_FOUND',
  'SOFT_DELETE',
  'WORKOUT_VALIDATION',
  'WORKOUT_CREATED',
]

export interface DiagnosticLog {
  id: string
  userId: string
  workoutOwnerId?: string
  sessionId: string
  timestamp: Date
  // 30-day TTL marker written by logDiagnostic. Not displayed in the UI;
  // mirrored here only so the type matches Firestore's actual shape.
  expiresAt?: Date
  eventType: DiagnosticEventType
  workoutId: string | null
  payload: Record<string, unknown>
  stackTrace: string
  userAgent: string
  url: string
}

// === Local-only types (UI concerns, not mirrored) ===

export interface DiagnosticLogFilters {
  dateFrom?: Date
  dateTo?: Date
  eventTypes?: DiagnosticEventType[]
  sessionId?: string
  pageSize?: number
  cursor?: Date
}

export interface SessionSummary {
  sessionId: string
  startTime: Date
  endTime: Date
  eventCount: number
}

export interface WorkoutFilters {
  dateFrom?: Date
  dateTo?: Date
  statuses?: WorkoutCompletionStatus[]
  deletedFilter?: 'either' | 'yes' | 'no'
  pageSize?: number
  cursor?: Date
}
