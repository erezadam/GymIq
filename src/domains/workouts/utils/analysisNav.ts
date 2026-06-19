/**
 * Builds the ExerciseLibrary href used by the "+" button next to each sub-muscle
 * row in the weekly analysis screen (TrainingAnalysis).
 *
 * `fromAnalysis=true` pre-filters the library to the chosen muscle/sub-muscle.
 *
 * When an active workout is in progress, we also append `addToWorkout=true` so
 * the library routes into the EXISTING merge flow (ExerciseLibrary.handleStartWorkout
 * → navigate('/workout/session', { state: { resumingFromLibrary: true } })). That
 * flow preserves the active workout's localStorage + firebaseWorkoutId, so the new
 * exercises merge into the running `in_progress` doc instead of wiping it and
 * creating a fresh workout. Without `addToWorkout=true` the library would call
 * `localStorage.removeItem(ACTIVE_WORKOUT_STORAGE_KEY)` and start a new workout —
 * destroying the active one (and risking the firebaseWorkoutId duplicate-doc bug).
 */
export function buildAddExerciseHref(
  category: string,
  subMuscle: string,
  hasActiveWorkout: boolean
): string {
  const base = `/exercises?fromAnalysis=true&muscle=${category}&subMuscle=${subMuscle}`
  return hasActiveWorkout ? `${base}&addToWorkout=true` : base
}
