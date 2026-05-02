/**
 * Inputs needed to determine the final status saved to a workout document.
 * Kept narrow so the function is easy to unit-test in isolation.
 */
export interface WorkoutStatusInputs {
  completedExercises: number
  totalExercises: number
}

/**
 * Determine the final workout status when a user finishes a workout.
 *
 * Returns a narrowed subset of `WorkoutCompletionStatus`. This function
 * only handles workout *finalization* — the moment a user closes a
 * workout. The other states (`'in_progress'`, `'planned'`) belong to
 * lifecycle phases that this function intentionally does not produce.
 *
 * The four branches:
 *
 * 1. Zero exercises performed → `'cancelled'`, regardless of explicit
 *    confirmation. Confirming a totally-unperformed workout as
 *    `'completed'` would be misleading — the user reported nothing,
 *    so the workout is empty by definition. The explicit-confirm flag
 *    is intentionally ignored in this branch.
 *
 * 2. All exercises performed (`completedExercises === totalExercises`)
 *    → `'completed'`. The happy path. The explicit-confirm flag is
 *    irrelevant here because the workout finished naturally.
 *
 * 3. Partial completion (some exercises done, some not) AND user
 *    explicitly confirmed via the incomplete-exercises warning modal
 *    → `'completed'`. The user consciously decided their workout is
 *    done despite skipped exercises. This is the new behavior the
 *    "finish-with-incomplete" feature introduces.
 *
 * 4. Partial completion WITHOUT explicit confirmation → `'partial'`.
 *    Legacy behavior. Applies to autosave / exit / any code path that
 *    doesn't run through the warning modal. Preserved for backward
 *    compatibility with existing documents.
 *
 * Note: `'partial'` is treated as `'in_progress'` by the rest of the
 * app (see workout.types.ts comments on `WorkoutCompletionStatus`).
 * We keep both values to avoid migrating existing documents.
 */
export function determineWorkoutStatus(
  stats: WorkoutStatusInputs,
  userExplicitlyConfirmedFinish: boolean
): 'completed' | 'partial' | 'cancelled' {
  if (stats.completedExercises === 0) return 'cancelled'
  if (stats.completedExercises === stats.totalExercises) return 'completed'
  if (userExplicitlyConfirmedFinish) return 'completed'
  return 'partial'
}
