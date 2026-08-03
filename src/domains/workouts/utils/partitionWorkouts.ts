/**
 * Pure partition/sort logic for the trainee workouts screen (WorkoutHistory).
 *
 * Section order in the UI:
 *   1. Planned workouts (always shown, oldest first) — unchanged behavior
 *   2. Pinned workouts (always shown, bypass the 14-day window, most recently
 *      performed first)
 *   3. "שבועיים אחרונים" — the rest, last 14 days only, newest first
 *
 * AI bundles/singles are split out exactly as before; completed AI workouts
 * behave like regular workouts (and can therefore be pinned).
 */
import type { WorkoutHistorySummary } from '../types'

export interface PartitionedWorkouts {
  plannedWorkouts: WorkoutHistorySummary[]
  pinnedWorkouts: WorkoutHistorySummary[]
  otherWorkouts: WorkoutHistorySummary[]
  aiBundles: { bundleId: string; workouts: WorkoutHistorySummary[] }[]
  singleAIWorkouts: WorkoutHistorySummary[]
}

export function partitionWorkouts(
  workouts: WorkoutHistorySummary[],
  now: Date = new Date()
): PartitionedWorkouts {
  const twoWeeksAgo = new Date(now)
  twoWeeksAgo.setDate(now.getDate() - 14)
  twoWeeksAgo.setHours(0, 0, 0, 0)

  // Filter: planned and pinned always shown, others only from last 2 weeks
  const filtered = workouts.filter(workout => {
    if (workout.status === 'planned' || workout.pinned) return true
    const workoutDate = new Date(workout.date)
    return workoutDate >= twoWeeksAgo
  })

  // Group AI workouts by bundleId
  const bundleMap = new Map<string, WorkoutHistorySummary[]>()
  const nonBundledWorkouts: WorkoutHistorySummary[] = []
  const singleAI: WorkoutHistorySummary[] = []

  filtered.forEach(workout => {
    // Completed AI workouts show in "שבועיים אחרונים" like regular workouts
    const isCompletedAI = workout.source === 'ai_trainer' && workout.status === 'completed'

    if (isCompletedAI) {
      nonBundledWorkouts.push(workout)
    } else if (workout.bundleId) {
      // Part of a bundle (non-completed)
      const existing = bundleMap.get(workout.bundleId) || []
      existing.push(workout)
      bundleMap.set(workout.bundleId, existing)
    } else if (workout.source === 'ai_trainer') {
      // Single AI workout (non-completed, no bundle)
      singleAI.push(workout)
    } else {
      // Regular workout
      nonBundledWorkouts.push(workout)
    }
  })

  // Convert bundle map to array, filter out empty bundles (all completed)
  const bundles = Array.from(bundleMap.entries())
    .map(([bundleId, bundleWorkouts]) => ({
      bundleId,
      workouts: bundleWorkouts.sort((a, b) => (a.aiWorkoutNumber || 0) - (b.aiWorkoutNumber || 0)),
    }))
    .filter(bundle => bundle.workouts.some(w => w.status !== 'completed'))

  // Separate planned from others (non-AI workouts)
  const planned = nonBundledWorkouts
    .filter(w => w.status === 'planned')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  // Pinned workouts sit directly below the planned section, most recently
  // performed first; they are excluded from "others" to avoid duplication
  const pinned = nonBundledWorkouts
    .filter(w => w.status !== 'planned' && w.pinned)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const others = nonBundledWorkouts
    .filter(w => w.status !== 'planned' && !w.pinned)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return {
    plannedWorkouts: planned,
    pinnedWorkouts: pinned,
    otherWorkouts: others,
    aiBundles: bundles,
    singleAIWorkouts: singleAI.filter(w => w.status !== 'completed'),
  }
}
