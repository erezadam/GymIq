/**
 * OpenAI API Client
 * Two-call approach: (1) muscle selection, (2) workout generation with recommendations
 */

import * as functions from 'firebase-functions'
import type {
  GenerateWorkoutRequest,
  ClaudeFullResponse,
  MuscleSelectionResponse,
  ExerciseSummary,
  ExercisePerformanceData,
} from './types'

// Initialize OpenAI client (lazy - only when needed)
let openaiClient: any = null

async function getClient(): Promise<any> {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY not configured')
    }
    // Dynamic import to avoid loading at deploy time
    const { default: OpenAI } = await import('openai')
    openaiClient = new OpenAI({ apiKey })
  }
  return openaiClient
}

/**
 * Call 1 - Select muscles for workouts based on training history
 * Only called when user didn't select muscles manually
 * Returns null if GPT fails (triggers fallback)
 */
export async function callGPTForMuscleSelection(
  data: GenerateWorkoutRequest
): Promise<MuscleSelectionResponse | null> {
  try {
    const client = await getClient()

    const systemPrompt = `אתה מאמן כושר AI שבוחר קבוצות שרירים לאימון.
בהתבסס על היסטוריית האימונים של המתאמן, בחר 2-3 קבוצות שרירים לכל אימון.
הקפד לסובב בין קבוצות שרירים שונות כדי לאפשר התאוששות.
החזר JSON בלבד.`

    const userPrompt = `בהתבסס על היסטוריית האימונים, איזה שרירים לאמן?

**מספר אימונים לתכנן:** ${data.request.numWorkouts}

**שרירים זמינים:**
${JSON.stringify(data.muscles.map(m => ({ id: m.id, nameHe: m.nameHe })), null, 0)}

**היסטוריית אימונים (5 אחרונים):**
${JSON.stringify(data.recentWorkouts.slice(0, 5))}

**פורמט תגובה (JSON בלבד):**
{
  "workoutMuscles": [
    ["muscleId1", "muscleId2"],
    ["muscleId3", "muscleId4"]
  ]
}

בחר 2-3 שרירים לכל אימון. הימנע מלתת אותם שרירים לאימונים עוקבים.
החזר JSON בלבד.`

    functions.logger.info('Call 1: Muscle selection', {
      numWorkouts: data.request.numWorkouts,
    })

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 512,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    })

    const textContent = completion.choices[0]?.message?.content
    if (!textContent) return null

    const parsed = JSON.parse(textContent.trim()) as MuscleSelectionResponse

    if (!parsed.workoutMuscles || !Array.isArray(parsed.workoutMuscles)) {
      functions.logger.error('Muscle selection response missing workoutMuscles')
      return null
    }

    functions.logger.info('Call 1 result: muscles selected', {
      workoutMuscles: parsed.workoutMuscles,
    })

    return parsed
  } catch (error: any) {
    functions.logger.error('Call 1 (muscle selection) failed', { error: error.message })
    return null
  }
}

/**
 * Filter exercises to only include those matching selected muscles + warmup/cardio
 */
export function filterExercisesByMuscles(
  exercises: ExerciseSummary[],
  selectedMuscleIds: string[]
): ExerciseSummary[] {
  const muscleSet = new Set(selectedMuscleIds)

  return exercises.filter(ex =>
    muscleSet.has(ex.primaryMuscle) ||
    ex.primaryMuscle === 'cardio' ||
    ex.category === 'cardio' ||
    ex.category === 'warmup'
  )
}

/**
 * Call 2 - Generate workouts with filtered exercise list and weight recommendations
 * Returns null if GPT fails
 */
export async function callGPTForBundle(
  data: GenerateWorkoutRequest,
  filteredExercises?: ExerciseSummary[],
  workoutMuscleAssignments?: string[][]
): Promise<ClaudeFullResponse | null> {
  try {
    const client = await getClient()

    const systemPrompt = buildSystemPrompt()
    const exercisesToUse = filteredExercises || data.availableExercises
    const userPrompt = buildBundlePrompt(data, exercisesToUse, workoutMuscleAssignments)

    functions.logger.info('Call 2: Workout generation', {
      numWorkouts: data.request.numWorkouts,
      duration: data.request.duration,
      filteredExercises: exercisesToUse.length,
      totalExercises: data.availableExercises.length,
    })

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 4096,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    })

    const textContent = completion.choices[0]?.message?.content
    if (!textContent) return null

    const parsed = JSON.parse(textContent.trim()) as ClaudeFullResponse

    if (!parsed.workouts || !Array.isArray(parsed.workouts)) {
      functions.logger.error('OpenAI bundle response missing workouts array')
      return null
    }

    functions.logger.info('Call 2 result: workouts generated', {
      workoutCount: parsed.workouts.length,
    })

    return parsed
  } catch (error: any) {
    functions.logger.error('Call 2 (workout generation) failed', { error: error.message })
    return null
  }
}

/**
 * Build the system prompt for workout generation (Call 2)
 */
function buildSystemPrompt(): string {
  return `אתה מאמן כושר AI מקצועי שיוצר תוכניות אימון מותאמות אישית.

## כללים חשובים:
1. בחר רק מרשימת התרגילים שסופקה - אל תמציא תרגילים חדשים
2. אל תחזור על תרגילים שנעשו אתמול (רשימת IDs מסופקת)
3. התאם את מספר התרגילים למשך האימון המבוקש
4. אם נבחרו שרירים ספציפיים - התמקד בהם
5. אזן בין תרגילי compound (מרובי-מפרקים) ו-isolation (בידוד)
6. התחל באימון חימום אם נדרש (תרגיל קרדיו)
7. הוסף הסבר קצר (2-3 משפטים) לכל אימון
8. החזר JSON בלבד

## כללי המלצות משקל (קריטי!):
- בסס את ההמלצה על הביצוע האחרון של המשתמש (מסופק כ-exerciseHistory)
- אם למשתמש יש היסטוריית ביצוע לתרגיל: המלץ על משקל קרוב למה שעשה (±5%)
  - אם עשה 64kg × 8 בהצלחה → המלץ 64-67kg
  - אם עשה 22.5kg × 10 בהצלחה → המלץ 22.5-25kg
- לעולם אל תמליץ על ירידה של יותר מ-10% ממה שהמשתמש עשה
- לעולם אל תמליץ על עלייה של יותר מ-5% ממה שהמשתמש עשה
- אם אין היסטוריה לתרגיל ספציפי: המלץ על משקל שמרני למתאמן ממוצע
- לתרגילי משקל גוף או חימום: weight = 0
- הוסף reasoning קצר בעברית שמסביר למה בחרת את המשקל הזה

## פורמט תגובה (JSON בלבד):
{
  "workouts": [
    {
      "exercises": [
        {
          "exerciseId": "string (ID מרשימת התרגילים)",
          "isWarmup": boolean,
          "targetSets": number (1 לחימום, 3-4 לתרגיל רגיל),
          "targetReps": "string (טווח חזרות, למשל: '8-12')",
          "aiNotes": "string (טיפ קצר אופציונלי בעברית)",
          "recommendation": {
            "weight": number (המלצת משקל בק"ג - מבוסס על היסטוריית המשתמש!),
            "repRange": "string (טווח חזרות, למשל: '8-10')",
            "sets": number (מספר סטים מומלץ),
            "reasoning": "string (הסבר קצר בעברית - למה משקל זה)"
          }
        }
      ],
      "muscleGroups": ["string (שמות השרירים בעברית)"],
      "explanation": "string (הסבר קצר בעברית - 2-3 משפטים)"
    }
  ]
}

## דוגמאות לתרגילים לפי משך:
- 30 דקות: 6 תרגילי כוח + 1 חימום = 7 סה"כ
- 45 דקות: 8 תרגילי כוח + 1 חימום = 9 סה"כ
- 60 דקות: 9 תרגילי כוח + 1 חימום = 10 סה"כ
- 90 דקות: 11 תרגילי כוח + 1 חימום = 12 סה"כ`
}

/**
 * Build exercise history section for prompt
 * Maps exerciseId → last performance for GPT context
 */
function buildExerciseHistorySection(exerciseHistory?: ExercisePerformanceData[]): string {
  if (!exerciseHistory || exerciseHistory.length === 0) {
    return `\n**היסטוריית ביצוע לתרגילים:** אין נתונים - זה משתמש חדש, המלץ משקלות שמרניים\n`
  }

  // Format as compact JSON: exerciseId → { weight, reps }
  const historyMap = exerciseHistory.map(eh => ({
    id: eh.exerciseId,
    lastWeight: eh.lastWeight,
    lastReps: eh.lastReps,
    date: eh.lastDate,
  }))

  return `
**היסטוריית ביצוע לתרגילים (קריטי - בסס המלצות על זה!):**
${JSON.stringify(historyMap, null, 0)}

⚠️ חובה: לכל תרגיל שיש לו היסטוריה למעלה, ההמלצה חייבת להיות מבוססת על המשקל האחרון שלו.
- אם עשה Xkg - המלץ בין X*0.9 ל-X*1.05
- לעולם לא להמליץ על משקל שונה ביותר מ-10% ממה שעשה
`
}

/**
 * Build prompt for generating multiple workouts (Call 2)
 * Uses filtered exercise list for reduced token count
 */
function buildBundlePrompt(
  data: GenerateWorkoutRequest,
  exercises: ExerciseSummary[],
  workoutMuscleAssignments?: string[][]
): string {
  const { request, muscles, recentWorkouts, yesterdayExerciseIds, exerciseHistory } = data

  // Muscle targets description
  let muscleDesc = ''
  if (workoutMuscleAssignments && workoutMuscleAssignments.length > 0) {
    // Muscles selected by Call 1
    muscleDesc = 'שרירים שנבחרו לכל אימון (ראה למטה)'
  } else if (request.muscleSelectionMode === 'same' && request.muscleTargets.length > 0) {
    const targetNames = request.muscleTargets
      .map((id) => muscles.find((m) => m.id === id)?.nameHe || id)
      .join(', ')
    muscleDesc = `אותם שרירים לכל האימונים: ${targetNames}`
  } else if (request.muscleSelectionMode === 'manual' && request.perWorkoutMuscles) {
    muscleDesc = 'שרירים ידניים לכל אימון (ראה למטה)'
  } else {
    muscleDesc = 'בחר 2-3 קבוצות שרירים מגוונות'
  }

  // Exercise count based on duration
  const exerciseCounts: Record<number, number> = { 30: 6, 45: 8, 60: 9, 90: 11 }
  const targetExercises = exerciseCounts[request.duration] || 9

  // Build per-workout muscle section
  let perWorkoutMuscleSection = ''
  if (workoutMuscleAssignments && workoutMuscleAssignments.length > 0) {
    perWorkoutMuscleSection = `
**שרירים לכל אימון:**
${workoutMuscleAssignments.map((m, i) => `אימון ${i + 1}: ${m.map((id) => muscles.find((mu) => mu.id === id)?.nameHe || id).join(', ')}`).join('\n')}
`
  } else if (request.muscleSelectionMode === 'manual' && request.perWorkoutMuscles) {
    perWorkoutMuscleSection = `
**שרירים לכל אימון:**
${request.perWorkoutMuscles.map((m, i) => `אימון ${i + 1}: ${m.map((id) => muscles.find((mu) => mu.id === id)?.nameHe || id).join(', ')}`).join('\n')}
`
  }

  return `צור ${request.numWorkouts} אימונים עם הפרטים הבאים:

**בקשת משתמש:**
- כמות אימונים: ${request.numWorkouts}
- משך כל אימון: ${request.duration} דקות
- חימום: ${request.warmupDuration > 0 ? `${request.warmupDuration} דקות (תרגיל קרדיו אחד)` : 'ללא'}
- קבוצות שרירים: ${muscleDesc}
- תרגילים נדרשים: ${targetExercises} תרגילי כוח + ${request.warmupDuration > 0 ? '1 חימום' : '0 חימום'} = ${targetExercises + (request.warmupDuration > 0 ? 1 : 0)} סה"כ
${perWorkoutMuscleSection}
**תרגילים זמינים:**
${JSON.stringify(exercises.map((e) => ({ id: e.id, nameHe: e.nameHe, muscle: e.primaryMuscle })), null, 0)}

**שרירים זמינים:**
${JSON.stringify(muscles.map((m) => ({ id: m.id, nameHe: m.nameHe })), null, 0)}

**תרגילים לא לכלול (נעשו אתמול):**
${JSON.stringify(yesterdayExerciseIds)}

**היסטוריית אימונים (5 אחרונים):**
${JSON.stringify(recentWorkouts.slice(0, 5))}
${buildExerciseHistorySection(exerciseHistory)}
חשוב:
- לכל תרגיל הוסף recommendation עם המלצת משקל, טווח חזרות, סטים ו-reasoning
- המלצת המשקל חייבת להתבסס על היסטוריית הביצוע של המשתמש (אם קיימת)
- אם אין היסטוריה לתרגיל: המלץ משקל שמרני (0 לתרגילי משקל גוף)
- הוסף reasoning קצר בעברית לכל המלצה (למשל: "עשה 64kg×8, ממליץ להישאר")
- הוסף הסבר קצר (2-3 משפטים) לכל אימון
- החזר JSON בלבד`
}
