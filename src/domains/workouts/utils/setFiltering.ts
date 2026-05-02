import type { WorkoutHistoryEntry } from '../types/workout.types'

/**
 * The shape of one stored set inside a history exercise. Exported as an alias
 * because three call sites (WorkoutCard, TraineeRecentWorkouts list, header)
 * partition sets by the same rule and we want them to share the type.
 */
export type HistorySet = WorkoutHistoryEntry['exercises'][number]['sets'][number]

export interface PartitionedSets {
  /** Sets the user actually performed (`completed: true` OR `actualReps > 0`). */
  performed: HistorySet[]
  /** Number of sets that were planned but not performed. */
  skippedCount: number
  /** Always equals `performed.length + skippedCount`. */
  total: number
}

/**
 * Split an exercise's stored sets into the ones the user actually performed
 * and a count of how many were skipped.
 *
 * Performance rule (matches every downstream consumer in the codebase — PR
 * detection, volume calc, weight recommendations, muscle analysis):
 *   `s.completed === true  ||  s.actualReps != null && s.actualReps > 0`
 *
 * `s.completed` covers cardio/time-based sets where reps may legitimately be
 * 0 (treadmill, stationary bike, hanging on bar). The `actualReps > 0` arm
 * covers the strength-style case. Sets that meet neither condition are
 * "planned but not performed" and surface to the UI as a skip count.
 */
export function partitionPerformedSets(
  sets: HistorySet[] | undefined | null
): PartitionedSets {
  if (!sets || sets.length === 0) {
    return { performed: [], skippedCount: 0, total: 0 }
  }
  const performed = sets.filter(
    (s) => s.completed || (s.actualReps != null && s.actualReps > 0)
  )
  return {
    performed,
    skippedCount: sets.length - performed.length,
    total: sets.length,
  }
}
