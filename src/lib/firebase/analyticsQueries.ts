/**
 * Firestore queries for Usage Analytics admin dashboard.
 *
 * This is the single IO boundary for the analytics feature. If we later
 * pre-aggregate into an `analytics_daily` collection, we replace the
 * implementation here without touching hooks, aggregations, or UI.
 *
 * Admin-only callers — security enforced by firestore.rules.
 */
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore'
import { db } from './config'
import type { WorkoutHistoryEntry } from '@/domains/workouts/types'
import type { AppUser } from './auth'
import { getAllUsers } from './users'

const WORKOUT_HISTORY = 'workoutHistory'

function toDate(value: unknown): Date {
  if (value instanceof Date) return value
  if (value && typeof (value as { toDate?: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate()
  }
  return new Date()
}

function rowToWorkoutHistory(id: string, data: Record<string, unknown>): WorkoutHistoryEntry {
  const deletedByTrainee = data.deletedByTrainee as
    | { deletedAt?: unknown; reason?: string }
    | undefined
  return {
    id,
    userId: data.userId as string,
    name: (data.name as string) ?? 'אימון',
    date: toDate(data.date),
    startTime: toDate(data.startTime),
    endTime: toDate(data.endTime),
    duration: (data.duration as number) ?? 0,
    status: data.status as WorkoutHistoryEntry['status'],
    exercises: (data.exercises as WorkoutHistoryEntry['exercises']) ?? [],
    completedExercises: (data.completedExercises as number) ?? 0,
    totalExercises: (data.totalExercises as number) ?? 0,
    completedSets: (data.completedSets as number) ?? 0,
    totalSets: (data.totalSets as number) ?? 0,
    totalVolume: (data.totalVolume as number) ?? 0,
    personalRecords: (data.personalRecords as number) ?? 0,
    calories: data.calories as number | undefined,
    notes: data.notes as string | undefined,
    source: data.source as WorkoutHistoryEntry['source'],
    aiWorkoutNumber: data.aiWorkoutNumber as number | undefined,
    bundleId: data.bundleId as string | undefined,
    programId: data.programId as string | undefined,
    programDayLabel: data.programDayLabel as string | undefined,
    reportedBy: data.reportedBy as string | undefined,
    reportedByName: data.reportedByName as string | undefined,
    deletedByTrainee: deletedByTrainee
      ? {
          deletedAt: toDate(deletedByTrainee.deletedAt),
          reason: deletedByTrainee.reason,
        }
      : undefined,
  }
}

function isNotSoftDeleted(data: Record<string, unknown>): boolean {
  return !data.deletedByTrainee
}

/**
 * Fetch every workout in [from, to] across all users (admin-scope).
 * Returns soft-deleted workouts filtered out.
 *
 * NOTE: relies on firestore.rules allowing admins to read all workoutHistory.
 * No composite index is required: this scans by `date` only.
 * Firestore creates a single-field index automatically.
 */
export async function getCompletedWorkoutsInRange(
  from: Date,
  to: Date,
): Promise<WorkoutHistoryEntry[]> {
  const ref = collection(db, WORKOUT_HISTORY)
  const q = query(
    ref,
    where('date', '>=', Timestamp.fromDate(from)),
    where('date', '<=', Timestamp.fromDate(to)),
    orderBy('date', 'desc'),
  )
  const snapshot = await getDocs(q)
  const docs = snapshot.docs.filter((d) => isNotSoftDeleted(d.data()))
  return docs.map((d) => rowToWorkoutHistory(d.id, d.data()))
}

/**
 * Fetch all users for analytics (reuses existing helper).
 */
export async function getAllUsersForAnalytics(): Promise<AppUser[]> {
  return getAllUsers()
}

/**
 * Fetch a single user's workouts in [from, to]. Uses the (userId, date)
 * composite index already defined in firestore.indexes.json.
 */
export async function getWorkoutsForUserInRange(
  userId: string,
  from: Date,
  to: Date,
): Promise<WorkoutHistoryEntry[]> {
  const ref = collection(db, WORKOUT_HISTORY)
  const q = query(
    ref,
    where('userId', '==', userId),
    where('date', '>=', Timestamp.fromDate(from)),
    where('date', '<=', Timestamp.fromDate(to)),
    orderBy('date', 'desc'),
  )
  const snapshot = await getDocs(q)
  const docs = snapshot.docs.filter((d) => isNotSoftDeleted(d.data()))
  return docs.map((d) => rowToWorkoutHistory(d.id, d.data()))
}
