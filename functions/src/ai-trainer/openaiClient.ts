/**
 * OpenAI API Client
 * Wrapper for OpenAI GPT-4o-mini API calls
 */

import * as functions from 'firebase-functions'
import type {
  GenerateWorkoutRequest,
  ClaudeFullResponse,
  ClaudeWorkoutResponse,
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
 * Call OpenAI API to generate workouts
 * Returns null if GPT fails (triggers fallback)
 */
export async function callGPT(
  data: GenerateWorkoutRequest,
  workoutIndex: number,
  totalWorkouts: number,
  usedMuscleGroups: string[][]
): Promise<ClaudeWorkoutResponse | null> {
  try {
    const client = await getClient()

    const systemPrompt = buildSystemPrompt()
    const userPrompt = buildUserPrompt(data, workoutIndex, totalWorkouts, usedMuscleGroups)

    functions.logger.info('Calling OpenAI API', {
      workoutIndex,
      totalWorkouts,
      muscleTargets: data.request.muscleTargets,
      duration: data.request.duration,
    })

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 2048,
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    })

    // Extract text content from response
    const textContent = completion.choices[0]?.message?.content
    if (!textContent) {
      functions.logger.error('OpenAI response has no text content')
      return null
    }

    // Parse JSON response
    const responseText = textContent.trim()

    // Try to extract JSON from response (GPT sometimes adds explanations)
    let jsonStr = responseText
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      jsonStr = jsonMatch[0]
    }

    const parsed = JSON.parse(jsonStr) as ClaudeWorkoutResponse

    // Validate response structure
    if (!parsed.exercises || !Array.isArray(parsed.exercises)) {
      functions.logger.error('OpenAI response missing exercises array')
      return null
    }

    functions.logger.info('OpenAI response parsed successfully', {
      exerciseCount: parsed.exercises.length,
      muscleGroups: parsed.muscleGroups,
    })

    return parsed
  } catch (error: any) {
    functions.logger.error('OpenAI API call failed', {
      error: error.message,
      code: error.code,
    })
    return null
  }
}

/**
 * Call OpenAI to generate all workouts at once (more efficient for bundles)
 * Returns null if GPT fails
 */
export async function callGPTForBundle(
  data: GenerateWorkoutRequest
): Promise<ClaudeFullResponse | null> {
  try {
    const client = await getClient()

    const systemPrompt = buildSystemPrompt()
    const userPrompt = buildBundlePrompt(data)

    functions.logger.info('Calling OpenAI API for bundle', {
      numWorkouts: data.request.numWorkouts,
      duration: data.request.duration,
    })

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 4096, // More tokens for multiple workouts
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    })

    const textContent = completion.choices[0]?.message?.content
    if (!textContent) {
      return null
    }

    const responseText = textContent.trim()
    let jsonStr = responseText
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      jsonStr = jsonMatch[0]
    }

    const parsed = JSON.parse(jsonStr) as ClaudeFullResponse

    if (!parsed.workouts || !Array.isArray(parsed.workouts)) {
      functions.logger.error('OpenAI bundle response missing workouts array')
      return null
    }

    // Log explanations for debugging
    functions.logger.info('OpenAI bundle response parsed', {
      workoutCount: parsed.workouts.length,
      explanations: parsed.workouts.map((w, i) => ({
        workout: i + 1,
        hasExplanation: !!w.explanation,
        explanation: w.explanation?.substring(0, 100),
      })),
    })

    return parsed
  } catch (error: any) {
    functions.logger.error('OpenAI bundle API call failed', { error: error.message })
    return null
  }
}

/**
 * Build prompt for generating multiple workouts at once
 */
function buildBundlePrompt(data: GenerateWorkoutRequest): string {
  const { request, availableExercises, muscles, recentWorkouts, yesterdayExerciseIds } = data

  // Muscle targets description
  let muscleDesc = ''
  if (request.muscleSelectionMode === 'ai_rotate') {
    muscleDesc = 'בחר שרירים שונים לכל אימון (סיבוב אוטומטי)'
  } else if (request.muscleSelectionMode === 'same' && request.muscleTargets.length > 0) {
    const targetNames = request.muscleTargets
      .map((id) => muscles.find((m) => m.id === id)?.nameHe || id)
      .join(', ')
    muscleDesc = `אותם שרירים לכל האימונים: ${targetNames}`
  } else if (request.muscleSelectionMode === 'manual' && request.perWorkoutMuscles) {
    muscleDesc = 'שרירים ידניים לכל אימון (ראה למטה)'
  } else {
    muscleDesc = 'AI יבחר שרירים מתאימים'
  }

  // Exercise count based on duration
  const exerciseCounts: Record<number, number> = { 30: 6, 45: 8, 60: 9, 90: 11 }
  const targetExercises = exerciseCounts[request.duration] || 9

  return `צור ${request.numWorkouts} אימונים עם הפרטים הבאים:

**בקשת משתמש:**
- כמות אימונים: ${request.numWorkouts}
- משך כל אימון: ${request.duration} דקות
- חימום: ${request.warmupDuration > 0 ? `${request.warmupDuration} דקות (תרגיל קרדיו אחד)` : 'ללא'}
- קבוצות שרירים: ${muscleDesc}
- תרגילים נדרשים: ${targetExercises} תרגילי כוח + ${request.warmupDuration > 0 ? '1 חימום' : '0 חימום'} = ${targetExercises + (request.warmupDuration > 0 ? 1 : 0)} סה"כ

${request.muscleSelectionMode === 'manual' && request.perWorkoutMuscles ? `
**שרירים לכל אימון:**
${request.perWorkoutMuscles.map((m, i) => `אימון ${i + 1}: ${m.map((id) => muscles.find((mu) => mu.id === id)?.nameHe || id).join(', ')}`).join('\n')}
` : ''}

**תרגילים זמינים:**
${JSON.stringify(availableExercises.map((e) => ({ id: e.id, nameHe: e.nameHe, muscle: e.primaryMuscle })), null, 0)}

**שרירים זמינים:**
${JSON.stringify(muscles.map((m) => ({ id: m.id, nameHe: m.nameHe })), null, 0)}

**תרגילים לא לכלול (נעשו אתמול):**
${JSON.stringify(yesterdayExerciseIds)}

**היסטוריית אימונים (7 ימים אחרונים):**
${JSON.stringify(recentWorkouts)}

**פורמט תגובה נדרש (JSON בלבד):**
{
  "workouts": [
    {
      "exercises": [
        { "exerciseId": "string", "isWarmup": boolean, "targetSets": number, "targetReps": "string", "aiNotes": "string" }
      ],
      "muscleGroups": ["string"],
      "explanation": "string (הסבר קצר בעברית למה בחרת את האימון הזה - 2-3 משפטים)"
    }
  ]
}

חשוב: הוסף לכל אימון הסבר קצר (2-3 משפטים) שמסביר למה בחרת את התרגילים ומה ההיגיון.
החזר JSON בלבד.`
}

/**
 * Build the system prompt for OpenAI
 * Defines the AI trainer's role and response format
 */
function buildSystemPrompt(): string {
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
function buildUserPrompt(
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
    const targetMuscleIds = request.perWorkoutMuscles[workoutIndex]
    const targetNames = targetMuscleIds
      .map((id) => muscles.find((m) => m.id === id)?.nameHe || id)
      .join(', ')
    muscleTargetDesc = `שרירים נבחרים: ${targetNames}`
  } else if (request.muscleSelectionMode === 'same' && request.muscleTargets.length > 0) {
    const targetNames = request.muscleTargets
      .map((id) => muscles.find((m) => m.id === id)?.nameHe || id)
      .join(', ')
    muscleTargetDesc = `שרירים נבחרים: ${targetNames}`
  } else if (request.muscleSelectionMode === 'ai_rotate') {
    const usedMuscles = usedMuscleGroups.flat()
    if (usedMuscles.length > 0) {
      muscleTargetDesc = `AI יבחר שרירים (הימנע מ: ${usedMuscles.join(', ')})`
    } else {
      muscleTargetDesc = 'AI יבחר 2-3 קבוצות שרירים מגוונות'
    }
  } else {
    muscleTargetDesc = 'AI יבחר 2-3 קבוצות שרירים מגוונות'
  }

  const exerciseList = availableExercises.map((e) => ({
    id: e.id,
    nameHe: e.nameHe,
    muscle: e.primaryMuscle,
  }))

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
