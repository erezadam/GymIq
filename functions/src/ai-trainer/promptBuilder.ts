/**
 * Prompt Builder for Claude AI
 * Constructs system and user prompts for workout generation
 */

import type { GenerateWorkoutRequest } from './types'

/**
 * Build the system prompt for Claude
 * This defines Claude's role and response format
 */
export function buildSystemPrompt(): string {
  return `אתה מאמן כושר AI מקצועי שיוצר תוכניות אימון מותאמות אישית.

## כללים חשובים:
1. בחר רק מרשימת התרגילים שסופקה - אל תמציא תרגילים חדשים
2. אל תחזור על תרגילים שנעשו אתמול (רשימת IDs מסופקת)
3. התאם את מספר התרגילים למשך האימון המבוקש
4. אם נבחרו שרירים ספציפיים - התמקד בהם
5. אם לא נבחרו שרירים - בחר 2-3 קבוצות שרירים מגוונות
6. אזן בין תרגילי compound (מרובי-מפרקים) ו-isolation (בידוד)
7. התחל באימון חימום אם נדרש (תרגיל קרדיו)
8. הוסף הסבר קצר (2-3 משפטים) שמסביר למה בחרת את התרגילים האלו ומה הגיון האימון
9. החזר JSON בלבד

## פורמט תגובה (JSON בלבד):
{
  "exercises": [
    {
      "exerciseId": "string (ID מרשימת התרגילים)",
      "isWarmup": boolean,
      "targetSets": number (1 לחימום, 3-4 לתרגיל רגיל),
      "targetReps": "string (טווח חזרות, למשל: '8-12')",
      "aiNotes": "string (טיפ קצר אופציונלי בעברית)"
    }
  ],
  "muscleGroups": ["string (שמות השרירים בעברית)"],
  "explanation": "string (הסבר קצר בעברית למה בחרת את האימון הזה - 2-3 משפטים)"
}

## דוגמאות לתרגילים לפי משך:
- 30 דקות: 6 תרגילי כוח + 1 חימום = 7 סה"כ
- 45 דקות: 8 תרגילי כוח + 1 חימום = 9 סה"כ
- 60 דקות: 9 תרגילי כוח + 1 חימום = 10 סה"כ
- 90 דקות: 11 תרגילי כוח + 1 חימום = 12 סה"כ`
}

/**
 * Build the user prompt for a single workout
 */
export function buildUserPrompt(
  data: GenerateWorkoutRequest,
  workoutIndex: number,
  totalWorkouts: number,
  usedMuscleGroups: string[][]
): string {
  const { request, availableExercises, muscles, recentWorkouts, yesterdayExerciseIds } = data

  // Determine exercise count based on duration
  const exerciseCounts: Record<number, number> = { 30: 6, 45: 8, 60: 9, 90: 11 }
  const targetExercises = exerciseCounts[request.duration] || 9

  // Determine muscle targets for this workout
  let muscleTargetDesc = ''
  if (request.muscleSelectionMode === 'manual' && request.perWorkoutMuscles?.[workoutIndex]) {
    // Manual mode - specific muscles for this workout
    const targetMuscleIds = request.perWorkoutMuscles[workoutIndex]
    const targetNames = targetMuscleIds
      .map((id) => muscles.find((m) => m.id === id)?.nameHe || id)
      .join(', ')
    muscleTargetDesc = `שרירים נבחרים: ${targetNames}`
  } else if (request.muscleSelectionMode === 'same' && request.muscleTargets.length > 0) {
    // Same mode - same muscles for all workouts
    const targetNames = request.muscleTargets
      .map((id) => muscles.find((m) => m.id === id)?.nameHe || id)
      .join(', ')
    muscleTargetDesc = `שרירים נבחרים: ${targetNames}`
  } else if (request.muscleSelectionMode === 'ai_rotate') {
    // AI rotate mode - avoid muscles from previous workouts in bundle
    const usedMuscles = usedMuscleGroups.flat()
    if (usedMuscles.length > 0) {
      muscleTargetDesc = `AI יבחר שרירים (הימנע מ: ${usedMuscles.join(', ')})`
    } else {
      muscleTargetDesc = 'AI יבחר 2-3 קבוצות שרירים מגוונות'
    }
  } else {
    muscleTargetDesc = 'AI יבחר 2-3 קבוצות שרירים מגוונות'
  }

  // Filter exercises - only send essential data to reduce tokens
  const exerciseList = availableExercises.map((e) => ({
    id: e.id,
    nameHe: e.nameHe,
    muscle: e.primaryMuscle,
  }))

  // Muscle list
  const muscleList = muscles.map((m) => ({
    id: m.id,
    nameHe: m.nameHe,
  }))

  return `צור אימון עם הפרטים הבאים:

**בקשת משתמש:**
- משך אימון: ${request.duration} דקות
- חימום: ${request.warmupDuration > 0 ? `${request.warmupDuration} דקות (בחר תרגיל קרדיו אחד)` : 'ללא חימום'}
- ${muscleTargetDesc}
- מספר אימון: ${workoutIndex + 1} מתוך ${totalWorkouts}
- תרגילים נדרשים: ${targetExercises} תרגילי כוח${request.warmupDuration > 0 ? ' + 1 תרגיל חימום' : ''} = ${targetExercises + (request.warmupDuration > 0 ? 1 : 0)} סה"כ

**תרגילים זמינים (JSON):**
${JSON.stringify(exerciseList, null, 0)}

**שרירים זמינים:**
${JSON.stringify(muscleList, null, 0)}

**תרגילים לא לכלול (נעשו אתמול):**
${JSON.stringify(yesterdayExerciseIds)}

**היסטוריית אימונים אחרונה (7 ימים):**
${JSON.stringify(recentWorkouts.slice(0, 5))}

החזר JSON בלבד.`
}
