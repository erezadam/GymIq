/**
 * Central muscle name translation utility
 *
 * This file provides a single source of truth for translating muscle names to Hebrew.
 * All components should use these functions instead of local translation maps.
 */

import { muscleGroupNames } from '@/styles/design-tokens'

// Local fallback map for common muscle names not in design-tokens
const localMuscleMap: Record<string, string> = {
  // Primary muscles
  chest: 'חזה',
  back: 'גב',
  legs: 'רגליים',
  shoulders: 'כתפיים',
  arms: 'זרועות',
  core: 'ליבה',

  // Specific muscles
  lats: 'גב רחב',
  quadriceps: 'ארבע ראשי',
  hamstrings: 'ירך אחורי',
  glutes: 'ישבן',
  triceps: 'טרייספס',
  biceps: 'ביספס',
  calves: 'שוקיים',
  traps: 'טרפז',
  lower_back: 'גב תחתון',
  forearms: 'אמות',
  rhomboids: 'רומבואידים',
  middle_traps: 'טרפז אמצעי',
}

// Local fallback map for categories
const localCategoryMap: Record<string, string> = {
  chest: 'חזה',
  back: 'גב',
  legs: 'רגליים',
  shoulders: 'כתפיים',
  arms: 'זרועות',
  core: 'ליבה',
  cardio: 'קרדיו',
  functional: 'פונקציונלי',
  stretching: 'מתיחות',
}

/**
 * Get Hebrew name for a muscle
 * Priority: dynamicNames (Firebase) > muscleGroupNames (design-tokens) > localMap > original
 */
export function getMuscleNameHe(
  muscle: string,
  dynamicNames?: Record<string, string>
): string {
  // 1. First try dynamic names from Firebase
  if (dynamicNames?.[muscle]) {
    return dynamicNames[muscle]
  }

  // 2. Then try static design tokens (includes gluteus_maximus, warmup, etc.)
  if (muscleGroupNames[muscle]) {
    return muscleGroupNames[muscle]
  }

  // 3. Then try local fallback map
  if (localMuscleMap[muscle]) {
    return localMuscleMap[muscle]
  }

  // 4. Return original if nothing found
  return muscle
}

/**
 * Get Hebrew name for a category
 * Priority: dynamicNames (Firebase) > muscleGroupNames (design-tokens) > localMap > original
 */
export function getCategoryNameHe(
  category: string,
  dynamicNames?: Record<string, string>
): string {
  // 1. First try dynamic names from Firebase
  if (dynamicNames?.[category]) {
    return dynamicNames[category]
  }

  // 2. Then try static design tokens
  if (muscleGroupNames[category]) {
    return muscleGroupNames[category]
  }

  // 3. Then try local fallback map
  if (localCategoryMap[category]) {
    return localCategoryMap[category]
  }

  // 4. Return original if nothing found
  return category
}
