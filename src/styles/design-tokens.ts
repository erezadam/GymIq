/**
 * Design Tokens - Hebrew Labels & Translations
 *
 * NOTE: All colors, spacing, shadows, and other design values are defined in:
 * - tailwind.config.js (Tailwind classes)
 * - src/index.css :root (CSS custom properties for JS access)
 *
 * This file contains only Hebrew text labels and translations.
 */

// Hebrew labels for workout UI
export const workoutLabels = {
  screenTitle: 'אימון פעיל',
  counterSuffix: 'בוצעו',
  exit: 'יציאה',

  // Set inputs
  weight: 'ק"ג',
  reps: 'חזרות',

  // Buttons
  addSet: '+ הוסף סט',
  finishExercise: 'סיום תרגיל',
  finishWorkout: 'סיים אימון',

  // Last workout
  lastWorkout: 'אימון אחרון:',

  // Modals
  confirmFinishTitle: 'סיום אימון',
  confirmFinishText: 'האם אתה בטוח שברצונך לסיים את האימון?',
  confirmExitTitle: 'יציאה מהאימון',
  confirmExitText: 'האם לצאת? ההתקדמות תישמר',
  confirmDeleteTitle: 'מחיקת תרגיל',
  confirmDeleteText: 'האם למחוק את התרגיל מהאימון?',

  // Modal buttons
  yes: 'כן',
  no: 'לא',
  cancel: 'ביטול',
  confirm: 'אישור',
  delete: 'מחק',
  continueWorkout: 'המשך אימון',
  exitWorkout: 'צא',
  finishNow: 'סיים',
}

// Muscle group Hebrew names (for grouping exercises)
export const muscleGroupNames: Record<string, string> = {
  chest: 'חזה',
  back: 'גב',
  lats: 'גב',
  shoulders: 'כתפיים',
  biceps: 'זרועות',
  triceps: 'זרועות',
  arms: 'זרועות',
  legs: 'רגליים',
  quadriceps: 'רגליים',
  hamstrings: 'רגליים',
  glutes: 'ישבן',
  calves: 'שוקיים',
  core: 'בטן',
  abs: 'בטן',
  traps: 'טרפז',
  forearms: 'אמות',
  lower_back: 'גב תחתון',
  rhomboids: 'גב עליון',
  middle_traps: 'טרפז אמצעי',
  other: 'אחר',
}

// Common Hebrew labels used across the app
export const commonLabels = {
  // Status labels
  completed: 'הושלם',
  partial: 'חלקי',
  cancelled: 'בוטל',
  inProgress: 'בתהליך',

  // Actions
  save: 'שמור',
  cancel: 'ביטול',
  delete: 'מחק',
  edit: 'ערוך',
  add: 'הוסף',
  back: 'חזור',
  next: 'הבא',

  // Stats
  exercises: 'תרגילים',
  sets: 'סטים',
  reps: 'חזרות',
  weight: 'משקל',
  duration: 'משך',
  volume: 'נפח',

  // Time
  minutes: 'דקות',
  seconds: 'שניות',
  hours: 'שעות',
}
