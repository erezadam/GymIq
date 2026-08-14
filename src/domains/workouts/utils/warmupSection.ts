/**
 * Display-layer helper: lift warmup exercises into a single "חימום" section at
 * the top of the active-workout list, ahead of every other group, in BOTH sort
 * modes (by muscle / by equipment).
 *
 * Pure and display-only — it operates on the already-built, already-sorted
 * groups coming out of useActiveWorkout (which is NOT modified). It never
 * re-sorts the remaining groups: they are returned in exactly the order they
 * arrived. A warmup exercise appears once — in the top section — and is removed
 * from whatever group it was in; a group left empty is dropped.
 *
 * Warmup identification uses ONLY the exercise category, matching the set
 * already used inside useActiveWorkout (`warmupCategories`). No name/heuristic
 * guessing.
 */
import type { MuscleGroupExercises } from '../types/active-workout.types'

// Same set as useActiveWorkout.ts (exercisesByComplexity) — single source of intent.
export const WARMUP_CATEGORIES = new Set(['cardio', 'warmup', 'stretching'])

export const WARMUP_SECTION_KEY = 'warmup'
export const WARMUP_SECTION_TITLE = 'חימום'

function isWarmup(category?: string): boolean {
  return WARMUP_CATEGORIES.has(category || '')
}

/**
 * Returns the groups to render. If the workout has no warmup exercise, the input
 * array is returned unchanged (same reference/order) so behavior is identical to
 * today. Otherwise a warmup group is prepended and warmup exercises are removed
 * from the other groups (empty groups dropped).
 */
export function withWarmupSection(groups: MuscleGroupExercises[]): MuscleGroupExercises[] {
  const warmupExercises: MuscleGroupExercises['exercises'] = []
  const remaining: MuscleGroupExercises[] = []

  for (const group of groups) {
    const nonWarmup = group.exercises.filter((ex) => {
      if (isWarmup(ex.category)) {
        warmupExercises.push(ex)
        return false
      }
      return true
    })
    // Drop a group that is left with no exercises after lifting the warmup out.
    if (nonWarmup.length > 0) {
      remaining.push({ ...group, exercises: nonWarmup })
    }
  }

  if (warmupExercises.length === 0) {
    // No warmup — return the original array untouched (identical order).
    return groups
  }

  return [
    {
      muscleGroup: WARMUP_SECTION_KEY,
      muscleGroupHe: WARMUP_SECTION_TITLE,
      exercises: warmupExercises,
    },
    ...remaining,
  ]
}
