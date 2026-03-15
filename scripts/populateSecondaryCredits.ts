/**
 * One-time script: Populate secondaryMuscleCredits field on exercises
 * Migrates data from the hardcoded SECONDARY_MUSCLE_MULTIPLIERS map
 * to a new `secondaryMuscleCredits` field on each exercise document in Firebase.
 *
 * First run: gcloud auth application-default login
 * Then: node scripts/populateSecondaryCredits.cjs
 */

// This file is kept as reference. The actual runnable script is populateSecondaryCredits.cjs
