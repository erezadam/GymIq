/**
 * OpenAI API Client
 * Single-call approach: workout generation with bodyRegion splits and 10 sets/muscle/week
 */

import * as functions from 'firebase-functions'
import type {
  GenerateWorkoutRequest,
  ClaudeFullResponse,
  ExerciseSummary,
  ExercisePerformanceData,
  MuscleSummary,
  WorkoutMuscleAssignment,
} from './types'

// Initialize OpenAI client (lazy - only when needed)
let openaiClient: any = null

async function getClient(): Promise<any> {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY not configured')
    }
    const { default: OpenAI } = await import('openai')
    openaiClient = new OpenAI({ apiKey })
  }
  return openaiClient
}

/**
 * Generate workouts with muscle assignments and 10 sets/muscle/week logic
 * Returns null if GPT fails
 */
export async function callGPTForWorkouts(
  data: GenerateWorkoutRequest,
  muscles: MuscleSummary[],
  assignments: WorkoutMuscleAssignment[],
  filteredExercises: ExerciseSummary[],
  lastAnalysisSection: string | null | undefined,
  warmupExercise: ExerciseSummary | null,
  coreExercise: ExerciseSummary | null
): Promise<ClaudeFullResponse | null> {
  try {
    const client = await getClient()

    // Build index-to-ID mapping so GPT works with simple numbers instead of long Firestore IDs
    const indexToId = new Map<number, string>()
    const idToIndex = new Map<string, number>()
    filteredExercises.forEach((ex, i) => {
      const idx = i + 1
      indexToId.set(idx, ex.id)
      idToIndex.set(ex.id, idx)
    })

    const systemPrompt = buildSystemPrompt()
    const userPrompt = buildUserPrompt(data, muscles, assignments, filteredExercises, lastAnalysisSection, idToIndex, warmupExercise, coreExercise)

    functions.logger.info('Calling GPT for workout generation', {
      numWorkouts: data.request.numWorkouts,
      duration: data.request.duration,
      structure: data.request.workoutStructure,
      exercises: filteredExercises.length,
    })

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 8192,
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
      functions.logger.error('GPT response missing workouts array')
      return null
    }

    // Remap numeric indices back to real Firestore IDs
    let remappedCount = 0
    let failedCount = 0
    for (const workout of parsed.workouts) {
      for (const ex of workout.exercises) {
        const idx = Number(ex.exerciseId)
        if (!isNaN(idx) && indexToId.has(idx)) {
          ex.exerciseId = indexToId.get(idx)!
          remappedCount++
        } else {
          // GPT returned something unexpected — leave as-is for downstream validation
          failedCount++
        }
      }
    }

    functions.logger.info('GPT workouts generated', {
      workoutCount: parsed.workouts.length,
      remappedIds: remappedCount,
      failedRemaps: failedCount,
    })

    return parsed
  } catch (error: any) {
    functions.logger.error('GPT workout generation failed', { error: error.message })
    return null
  }
}

/**
 * Build the system prompt for workout generation
 */
function buildSystemPrompt(): string {
  return `אתה מאמן כושר AI מקצועי שיוצר תוכניות אימון מותאמות אישית.

## עיקרון מפתח: 10 סטים לשריר בשבוע
- כל שריר צריך לקבל ~10 סטים שבועיים (נפח אימון אופטימלי לצמיחה)
- חלק את 10 הסטים בין האימונים שבהם השריר מופיע
- כל תרגיל = 3-4 סטים → בממוצע 3 תרגילים לשריר בשבוע

## כללים חשובים:
1. השתמש אך ורק במספר האינדקס (idx) מרשימת התרגילים שסופקה. שים את המספר בשדה exerciseId. אסור להמציא מספר שלא ברשימה!
2. אל תחזור על תרגילים שנעשו אתמול (רשימת אינדקסים מסופקת)
3. התאם את מספר התרגילים למשך האימון המבוקש — בחר **רק תרגילי כוח** (חימום וליבה נקבעים בנפרד)
4. אל תכלול תרגילי cardio או core — הם מנוהלים מחוץ לבחירתך
5. הוסף הסבר קצר (2-3 משפטים) לכל אימון
6. החזר JSON בלבד

## לוגיקת פיצול (bodyRegion):
- full_body: כל אימון כולל תרגילים מכל קבוצות השרירים
- split: אימונים מתחלפים בין פלג גוף עליון (upper) לתחתון (lower)
  - שרירים ניטרליים (core) נכללים בכל אימון
  - **חשוב:** עקוב אחרי הרשימה המדויקת של שרירים לכל אימון (מסופקת)

## חלוקת תרגילים בפיצול (10 סטים/שריר/שבוע):
### Full Body:
- 3 אימונים בשבוע: ~1 תרגיל (3-4 סטים) לשריר בכל אימון
- 4 אימונים: ~1 תרגיל לשריר, חלק מהשרירים 2 תרגילים בחלק מהאימונים
- 5-6 אימונים: ~1 תרגיל לשריר בכל אימון, סה"כ 10 סטים בשבוע

### Upper/Lower Split:
- 4 אימונים (2 upper, 2 lower): ~2 תרגילים לשריר בכל אימון
- 3 אימונים (2 upper, 1 lower or reverse):
  - שריר שמופיע 2 פעמים: ~1.5 תרגילים per workout
  - שריר שמופיע 1 פעם: ~3 תרגילים in that workout
- 6 אימונים (3 upper, 3 lower): ~1 תרגיל לשריר בכל אימון

## סדר תרגילים בתוך אימון (חובה):
1. תרגיל עוגן - compound מורכב (סקוואט, דדליפט, לחיצת חזה וכו')
2. compound נוסף בזווית או תבנית תנועה שונה
3. תרגיל נתמך - מכשיר או וריאציה יציבה להעמסה
4-8. תרגילי השלמה: בידוד, כבלים, משקולות
אחרון. פיניש - קל יחסית, לפאמפ או סיבולת שרירית
- אל תשים יותר משני תרגילים עם אותה תבנית תנועה באותו אימון

## עקביות ציוד לפי שריר (חובה):
- לכל קבוצת שרירים באימון, כל התרגילים חייבים להיות מאותו סוג ציוד (eq)
- בחר מראש לכל שריר: מכונה (machine/cable_machine), משקולות חופשיות (barbell/dumbbell), או משקל גוף (bodyweight)
- אל תערבב סוגי ציוד שונים לאותו שריר באותו אימון
- לדוגמה: אם בחרת dumbbell לחזה — כל תרגילי החזה באימון זה יהיו עם dumbbell

## כיסוי תתי שריר ותבניות תנועה:
- חזה: עליון, אמצעי, תחתון לאורך השבוע
- גב: משיכה אנכית + אופקית לאורך השבוע
- רגליים: סקוואט + הינג' לאורך השבוע
- כתפיים: קדמי, צד, אחורי לאורך השבוע

## כללי המלצות משקל (קריטי!):
- בסס על הביצוע האחרון של המשתמש (exerciseHistory)
- אם יש היסטוריה: המלץ ±5% מהמשקל האחרון
- אם אין היסטוריה: משקל שמרני
- לתרגילי משקל גוף/חימום: weight = 0
- הוסף reasoning קצר בעברית

## פורמט תגובה (JSON בלבד):
{
  "workouts": [
    {
      "exercises": [
        {
          "exerciseId": number (מספר האינדקס idx מרשימת התרגילים),
          "isWarmup": boolean,
          "targetSets": number (1 לחימום, 3-4 לתרגיל רגיל),
          "targetReps": "string (טווח חזרות)",
          "aiNotes": "string (טיפ קצר בעברית)",
          "recommendation": {
            "weight": number (ק"ג),
            "repRange": "string",
            "sets": number,
            "reasoning": "string (הסבר קצר בעברית)"
          }
        }
      ],
      "muscleGroups": ["string (שמות שרירים בעברית)"],
      "explanation": "string (הסבר 2-3 משפטים)"
    }
  ]
}`
}

/**
 * Build exercise history section for prompt
 */
function buildExerciseHistorySection(
  exerciseHistory: ExercisePerformanceData[] | undefined,
  idToIndex: Map<string, number>
): string {
  if (!exerciseHistory || exerciseHistory.length === 0) {
    return `\n**היסטוריית ביצוע:** אין נתונים - משתמש חדש, המלץ משקלות שמרניים\n`
  }

  const historyMap = exerciseHistory
    .filter(eh => idToIndex.has(eh.exerciseId))
    .map(eh => ({
      idx: idToIndex.get(eh.exerciseId)!,
      lastWeight: eh.lastWeight,
      lastReps: eh.lastReps,
      date: eh.lastDate,
      ...(eh.lastVolume && eh.lastVolume > 0 && { lastVolume: eh.lastVolume }),
    }))

  return `
**היסטוריית ביצוע (קריטי - בסס המלצות על זה!):**
${JSON.stringify(historyMap, null, 0)}

⚠️ חובה: המלצת משקל חייבת להתבסס על ההיסטוריה. טווח: X*0.9 עד X*1.05
`
}

/**
 * Build the user prompt with muscle assignments
 */
function buildUserPrompt(
  data: GenerateWorkoutRequest,
  muscles: MuscleSummary[],
  assignments: WorkoutMuscleAssignment[],
  exercises: ExerciseSummary[],
  lastAnalysisSection: string | null | undefined,
  idToIndex: Map<string, number>,
  warmupExercise: ExerciseSummary | null,
  coreExercise: ExerciseSummary | null
): string {
  const { request, recentWorkouts, yesterdayExerciseIds, exerciseHistory } = data

  // Strength exercise count (warmup + core added separately)
  const strengthCount = request.duration <= 60 ? 9 : request.duration <= 75 ? 11 : 14
  const totalPerWorkout = strengthCount + (warmupExercise ? 1 : 0) + (coreExercise ? 1 : 0)

  // Build per-workout muscle section
  const workoutAssignmentsSection = assignments.map((a, i) => {
    const regionLabel = a.region === 'full_body' ? 'כל הגוף' :
      a.region === 'upper' ? 'פלג עליון' : 'פלג תחתון'
    return `אימון ${i + 1} (${regionLabel}): ${a.muscleNames.join(', ')}`
  }).join('\n')

  // Calculate sets per muscle per workout for reference
  const muscleAppearanceCount: Record<string, number> = {}
  for (const a of assignments) {
    for (const muscleId of a.muscleIds) {
      muscleAppearanceCount[muscleId] = (muscleAppearanceCount[muscleId] || 0) + 1
    }
  }
  const setsPerMuscleSection = Object.entries(muscleAppearanceCount)
    .map(([id, count]) => {
      const muscle = muscles.find(m => m.id === id)
      const setsPerWorkout = Math.round(10 / count)
      const exercisesPerWorkout = Math.ceil(setsPerWorkout / 3)
      return `${muscle?.nameHe || id}: ${count} אימונים, ~${setsPerWorkout} סטים/אימון (~${exercisesPerWorkout} תרגילים)`
    }).join('\n')

  const warmupLine = warmupExercise
    ? `\n**תרגיל חימום נקבע מראש:** "${warmupExercise.nameHe}" — יתווסף ראשון אוטומטית. אל תבחר תרגילי cardio.`
    : ''
  const coreLine = coreExercise
    ? `\n**תרגיל ליבה נקבע מראש:** "${coreExercise.nameHe}" — יתווסף לפני התרגיל האחרון אוטומטית. אל תבחר תרגילי core.`
    : ''

  return `צור ${request.numWorkouts} אימונים:

**הגדרות:**
- מבנה: ${request.workoutStructure === 'full_body' ? 'כל הגוף' : 'Upper/Lower Split'}
- משך: ${request.duration} דקות
- תרגילי כוח: בדיוק ${strengthCount} לכל אימון (בלי חימום ובלי ליבה — הם מנוהלים בנפרד)
- סה"כ באימון: ${totalPerWorkout} (${strengthCount} כוח${warmupExercise ? ' + 1 חימום' : ''}${coreExercise ? ' + 1 ליבה' : ''})
${warmupLine}${coreLine}

**שרירים לכל אימון (חובה לעקוב!):**
${workoutAssignmentsSection}

**חלוקת סטים (10 סטים/שריר/שבוע):**
${setsPerMuscleSection}

**תרגילים זמינים (השתמש ב-idx כ-exerciseId!):**
${JSON.stringify(exercises.map((e, i) => ({ idx: i + 1, nameHe: e.nameHe, muscle: e.primaryMuscle, eq: e.equipment || 'other' })), null, 0)}

**שרירים:**
${JSON.stringify(muscles.map((m) => ({ id: m.id, nameHe: m.nameHe, region: m.bodyRegion })), null, 0)}

**אל תכלול (נעשו אתמול, לפי idx):**
${JSON.stringify(yesterdayExerciseIds.map(id => idToIndex.get(id)).filter(Boolean))}

**היסטוריית אימונים (5 אחרונים):**
${JSON.stringify(recentWorkouts.slice(0, 5))}
${buildExerciseHistorySection(exerciseHistory, idToIndex)}${lastAnalysisSection || ''}
**חובה:**
- לכל תרגיל: recommendation עם weight, repRange, sets, reasoning
- כל אימון: בדיוק **${strengthCount} תרגילי כוח** (בלי חימום, בלי core — הם מנוהלים בנפרד!)
- עקוב אחרי חלוקת השרירים לכל אימון!
- אל תחזור על תרגילים בין אימונים ככל האפשר
- לכל שריר — כל התרגילים מאותו סוג ציוד (eq). בחר ציוד אחד per muscle per workout
- החזר JSON בלבד`
}
