/**
 * Generate AI Training Analysis - Cloud Function
 * Analyzes workout history and provides personalized feedback
 */

import * as admin from 'firebase-admin'
import * as functions from 'firebase-functions'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import type {
  AnalysisRequest,
  AnalysisResponse,
  AnalysisWorkout,
  AnalysisExercise,
  UserProfile,
  ExerciseMapping,
  MuscleData,
  RateLimitResult,
} from './types'

// ============ OpenAI Client (lazy singleton) ============

let openaiClient: any = null

async function getOpenAIClient(): Promise<any> {
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

// ============ Rate Limiter (1 per 24h) ============

const ANALYSIS_DAILY_LIMIT = 9999
const ANALYSIS_USAGE_COLLECTION = 'aiAnalysisUsage'

function getDb(): admin.firestore.Firestore {
  return admin.firestore()
}

function getTodayString(): string {
  return new Date().toISOString().split('T')[0]
}

function getNextMidnight(): Date {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(0, 0, 0, 0)
  return tomorrow
}

async function checkAnalysisRateLimit(userId: string): Promise<RateLimitResult> {
  const db = getDb()
  const today = getTodayString()
  const docId = `${userId}_${today}`

  try {
    const usageRef = db.collection(ANALYSIS_USAGE_COLLECTION).doc(docId)
    const doc = await usageRef.get()

    if (!doc.exists) {
      return {
        allowed: true,
        remaining: ANALYSIS_DAILY_LIMIT,
        resetAt: getNextMidnight(),
      }
    }

    const data = doc.data()
    const count = data?.generationsCount || 0

    if (count >= ANALYSIS_DAILY_LIMIT) {
      functions.logger.info('Analysis rate limit reached', { userId, count, limit: ANALYSIS_DAILY_LIMIT })
      return {
        allowed: false,
        remaining: 0,
        resetAt: getNextMidnight(),
      }
    }

    return {
      allowed: true,
      remaining: ANALYSIS_DAILY_LIMIT - count,
      resetAt: getNextMidnight(),
    }
  } catch (error: any) {
    functions.logger.error('Analysis rate limit check failed', { userId, error: error.message })
    return {
      allowed: true,
      remaining: ANALYSIS_DAILY_LIMIT,
      resetAt: getNextMidnight(),
    }
  }
}

async function incrementAnalysisUsage(userId: string): Promise<void> {
  const db = getDb()
  const today = getTodayString()
  const docId = `${userId}_${today}`

  try {
    const usageRef = db.collection(ANALYSIS_USAGE_COLLECTION).doc(docId)
    await usageRef.set(
      {
        userId,
        date: today,
        generationsCount: admin.firestore.FieldValue.increment(1),
        lastGeneratedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    )
    functions.logger.info('Analysis usage incremented', { userId, date: today })
  } catch (error: any) {
    functions.logger.error('Failed to increment analysis usage', { userId, error: error.message })
  }
}

async function saveAnalysisResult(
  userId: string,
  analysis: string,
  workoutCount: number,
  weeksAnalyzed: number
): Promise<void> {
  const db = getDb()
  const docId = `${userId}_latest`

  try {
    await db.collection(ANALYSIS_USAGE_COLLECTION).doc(docId).set({
      userId,
      analysis,
      workoutCount,
      weeksAnalyzed,
      generatedAt: admin.firestore.FieldValue.serverTimestamp(),
    })
    functions.logger.info('Analysis result saved for caching', { userId })
  } catch (error: any) {
    functions.logger.error('Failed to save analysis result', { userId, error: error.message })
  }
}

async function getCachedAnalysisResult(
  userId: string
): Promise<{ analysis: string; workoutCount: number; weeksAnalyzed: number } | null> {
  const db = getDb()
  const docId = `${userId}_latest`

  try {
    const doc = await db.collection(ANALYSIS_USAGE_COLLECTION).doc(docId).get()
    if (!doc.exists) return null

    const data = doc.data()
    if (!data?.analysis) return null

    return {
      analysis: data.analysis,
      workoutCount: data.workoutCount || 0,
      weeksAnalyzed: data.weeksAnalyzed || 0,
    }
  } catch (error: any) {
    functions.logger.error('Failed to get cached analysis', { userId, error: error.message })
    return null
  }
}

// ============ Data Fetching ============

async function fetchUserProfile(userId: string): Promise<UserProfile> {
  const db = getDb()
  const userDoc = await db.collection('users').doc(userId).get()
  if (!userDoc.exists) {
    return {}
  }
  const data = userDoc.data()!
  return {
    age: data.age,
    trainingGoals: data.trainingGoals,
    injuriesOrLimitations: data.injuriesOrLimitations,
    height: data.height,
    weight: data.weight,
  }
}

async function fetchWorkoutHistory(
  userId: string,
  weeksBack: number
): Promise<{ workouts: AnalysisWorkout[]; weeksAnalyzed: number }> {
  const db = getDb()
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - weeksBack * 7)

  const snapshot = await db
    .collection('workoutHistory')
    .where('userId', '==', userId)
    .where('date', '>=', admin.firestore.Timestamp.fromDate(cutoffDate))
    .orderBy('date', 'desc')
    .get()

  // Only include completed workouts (exclude cancelled, planned, in_progress)
  const VALID_STATUSES = ['completed', 'partial']
  const workouts: AnalysisWorkout[] = snapshot.docs
    .filter((doc) => {
      const data = doc.data()
      if (data.softDeleted) return false
      const status = data.status || 'completed'
      return VALID_STATUSES.includes(status)
    })
    .map((doc) => {
      const data = doc.data()
      const exercises: AnalysisExercise[] = (data.exercises || []).map((ex: any) => ({
        exerciseId: ex.exerciseId || '',
        exerciseName: ex.exerciseName || '',
        exerciseNameHe: ex.exerciseNameHe || '',
        primaryMuscle: ex.primaryMuscle || '',
        secondaryMuscles: ex.secondaryMuscles || [],
        category: ex.category || '',
        isCompleted: ex.isCompleted ?? true,
        exerciseVolume: ex.exerciseVolume,
        sets: (ex.sets || []).map((s: any) => ({
          type: s.type || 'working',
          targetWeight: s.targetWeight || 0,
          targetReps: s.targetReps || 0,
          actualWeight: s.actualWeight || 0,
          actualReps: s.actualReps || 0,
          completed: s.completed ?? false,
          time: s.time,
          assistanceWeight: s.assistanceWeight,
        })),
      }))

      const dateValue = data.date?.toDate?.() || new Date(data.date)

      return {
        date: dateValue.toISOString().split('T')[0],
        duration: data.duration || 0,
        status: data.status || 'completed',
        source: data.source || 'manual',
        exercises,
      }
    })

  return { workouts, weeksAnalyzed: weeksBack }
}

async function fetchExerciseMappings(): Promise<Map<string, ExerciseMapping>> {
  const db = getDb()
  const snapshot = await db.collection('exercises').get()
  const map = new Map<string, ExerciseMapping>()

  snapshot.docs.forEach((doc) => {
    const data = doc.data()
    map.set(doc.id, {
      id: doc.id,
      name: data.name || '',
      nameHe: data.nameHe || '',
      primaryMuscle: data.primaryMuscle || '',
      secondaryMuscles: data.secondaryMuscles || [],
    })
  })

  return map
}

async function fetchMuscleData(): Promise<MuscleData[]> {
  const db = getDb()
  const snapshot = await db.collection('muscles').get()

  return snapshot.docs.map((doc) => {
    const data = doc.data()
    return {
      id: doc.id,
      nameHe: data.nameHe || '',
      nameEn: data.nameEn || '',
      subMuscles: (data.subMuscles || []).map((sm: any) => ({
        id: sm.id || '',
        nameHe: sm.nameHe || '',
        nameEn: sm.nameEn || '',
      })),
    }
  })
}

// ============ Enrichment ============

function enrichWorkoutsWithMuscleData(
  workouts: AnalysisWorkout[],
  exerciseMap: Map<string, ExerciseMapping>,
  muscles: MuscleData[]
): AnalysisWorkout[] {
  const muscleNameMap = new Map<string, string>()
  muscles.forEach((m) => {
    muscleNameMap.set(m.id, m.nameHe)
    m.subMuscles.forEach((sm) => muscleNameMap.set(sm.id, sm.nameHe))
  })

  return workouts.map((workout) => ({
    ...workout,
    exercises: workout.exercises.map((ex) => {
      const mapping = exerciseMap.get(ex.exerciseId)
      if (mapping) {
        return {
          ...ex,
          exerciseName: mapping.name || ex.exerciseName,
          exerciseNameHe: mapping.nameHe || ex.exerciseNameHe,
          primaryMuscle: mapping.primaryMuscle || ex.primaryMuscle,
          secondaryMuscles:
            mapping.secondaryMuscles.length > 0
              ? mapping.secondaryMuscles
              : ex.secondaryMuscles,
        }
      }
      return ex
    }),
  }))
}

// ============ Prompt Building ============

function buildSystemPrompt(): string {
  return `אתה מנתח אימונים מקצועי ומנוסה. תפקידך לנתח את היסטוריית האימונים של המתאמן ולספק תובנות מעמיקות מבוססות נתונים.

## חובה — ניתוחים שחייבים להופיע בתוצאה:
בצע את כל הניתוחים הבאים והציג ממצאים ספציפיים עם מספרים בתוך strengths, weaknesses, ו-recommendations:

א. **ניתוח נפח**: כמה סטים כוללים קיבלה כל קבוצת שרירים ותת-שריר. ציין מספרים מדויקים.
ב. **איזון כתף**: כמה סטים לדלתא קדמית לעומת צדדית לעומת אחורית.
ג. **איזון שרשרת קדמית מול אחורית**: סה"כ סטים לחזה + דלתא קדמית לעומת גב + דלתא אחורית.
ד. **איזון גוף עליון מול תחתון**: סה"כ סטים לפלג גוף עליון לעומת פלג גוף תחתון.
ה. **פרוגרסיית משקלים**: לכל תרגיל שחוזר על פני מספר אימונים — האם המשקל עלה, ירד, או נשאר זהה? ציין שמות תרגילים ומספרים.
ו. **תדירות**: כמה אימונים בשבוע בממוצע. האם יש ירידה או עלייה בתדירות לאורך התקופה.

## כללים קריטיים:
1. ענה **תמיד** בעברית
2. השתמש בנתונים אמיתיים מההיסטוריה — אל תמציא מספרים
3. **כל נקודה חייבת לכלול מספרים ספציפיים מהנתונים**
   - נכון: "דלתא אחורית קיבלה 4 סטים ב-4 שבועות לעומת 28 סטים לדלתא קדמית"
   - לא נכון: "חוסר איזון בכתף"
4. **אל תכתוב עצות כלליות** כמו "לשמור על עקביות" או "לתכנן לוח זמנים"
5. כל המלצה חייבת לכלול קבוצת שריר/תבנית תנועה + מספר סטים מומלץ. **אל תמליץ על תרגילים ספציפיים** — רק כיוון, קבוצת שריר, ומספרי סטים.
   - נכון: "להגדיל נפח עבודה לדלתא אחורית מ-4 סטים ל-8-10 סטים בשבוע"
   - נכון: "להפחית נפח דחיפה אופקית מ-24 ל-16 סטים בשבוע ולהעביר את ההפרש למשיכה אנכית"
   - לא נכון: "להוסיף face pulls 3 סטים של 15 חזרות"
   - לא נכון: "לעשות plank 3 פעמים בשבוע"
6. אם יש מידע על פציעות/מגבלות — התייחס אליהן
7. **primaryMuscle** מייצג את תת-השריר הספציפי (למשל: front_delt, lats, quads). השתמש בשדה הזה לספירת סטים לפי תת-שריר.

## פורמט תגובה:
הפלט חייב להיות JSON בלבד, בדיוק בפורמט הבא (ללא שדות נוספים):

{
  "title": "סיכום מצב מתאמן",
  "overview": "פסקת פתיחה של 3-4 שורות: תדירות שבועית, סה\"כ סטים, איזון עליון/תחתון, איזון קדמי/אחורי — הכל עם מספרים",
  "strengths": ["נקודת חוזק 1 עם מספרים", "נקודת חוזק 2 עם מספרים", "נקודת חוזק 3 עם מספרים"],
  "weaknesses": ["חולשה 1 עם מספרים", "חולשה 2 עם מספרים", "חולשה 3 עם מספרים"],
  "recommendations": ["כיוון + קבוצת שריר + מספר סטים מומלץ (בלי שמות תרגילים)", "המלצה 2", "המלצה 3"],
  "summary": "משפט סיכום אחד שמסכם את כל הניתוח"
}

## כללים לכל שדה:
- title: כותרת קצרה וקולעת (עד 6 מילים)
- overview: 3-4 שורות עם סטטיסטיקות: תדירות, נפח כולל, יחס עליון/תחתון, יחס קדמי/אחורי
- strengths: 3-5 נקודות, כל אחת עם שם תרגיל/שריר + מספרים (סטים, משקלים, פרוגרסיה)
- weaknesses: 3-5 נקודות, כל אחת עם מספרים שמראים את הבעיה (למשל: "רק X סטים ל-Y לעומת Z סטים ל-W")
- recommendations: 3-5 המלצות, כל אחת עם כיוון + קבוצת שריר/תבנית תנועה + מספר סטים מומלץ. ללא שמות תרגילים ספציפיים.
- summary: משפט סיכום אחד בלבד`
}

function buildUserPrompt(
  profile: UserProfile,
  workouts: AnalysisWorkout[],
  muscles: MuscleData[],
  weeksAnalyzed: number
): string {
  const profileSection = buildProfileSection(profile)
  const muscleSection = buildMuscleSection(muscles)
  const workoutSection = buildWorkoutSection(workouts)

  return `נתח את היסטוריית האימונים הבאה:

## פרטי המתאמן:
${profileSection}

## תקופת ניתוח: ${weeksAnalyzed} שבועות אחרונות (${workouts.length} אימונים)

## מילון שרירים:
${muscleSection}

## היסטוריית אימונים:
${workoutSection}

נתח את הנתונים והחזר JSON בלבד עם השדות: title, overview, strengths, weaknesses, recommendations, summary.`
}

function buildProfileSection(profile: UserProfile): string {
  const parts: string[] = []
  if (profile.age) parts.push(`גיל: ${profile.age}`)
  if (profile.height) parts.push(`גובה: ${profile.height} ס"מ`)
  if (profile.weight) parts.push(`משקל: ${profile.weight} ק"ג`)
  if (profile.trainingGoals?.length) parts.push(`מטרות: ${profile.trainingGoals.join(', ')}`)
  if (profile.injuriesOrLimitations) parts.push(`מגבלות: ${profile.injuriesOrLimitations}`)

  return parts.length > 0 ? parts.join('\n') : 'לא סופק מידע על המתאמן'
}

function buildMuscleSection(muscles: MuscleData[]): string {
  return muscles
    .map((m) => {
      const subs = m.subMuscles.map((s) => s.nameHe).join(', ')
      return `- ${m.nameHe}: ${subs || 'ללא תתי-שרירים'}`
    })
    .join('\n')
}

function buildWorkoutSection(workouts: AnalysisWorkout[]): string {
  return workouts
    .map((w, i) => {
      const exerciseLines = w.exercises
        .map((ex) => {
          const completedSets = ex.sets.filter((s) => s.completed)
          const setsSummary = completedSets
            .map((s) => {
              let desc = `${s.actualWeight}kg×${s.actualReps}`
              if (s.time) desc += ` (${s.time}s)`
              return desc
            })
            .join(', ')

          // Calculate volume (use stored or compute from sets)
          const volume = ex.exerciseVolume ?? completedSets.reduce(
            (sum, s) => sum + s.actualWeight * s.actualReps, 0
          )
          const volumeSuffix = volume > 0 ? ` | נפח: ${volume}kg` : ''

          return `  - ${ex.exerciseNameHe} [${ex.primaryMuscle}]: ${setsSummary || 'לא דווח'}${volumeSuffix}`
        })
        .join('\n')

      return `### אימון ${i + 1} (${w.date}, ${w.duration} דק', ${w.status})
${exerciseLines}`
    })
    .join('\n\n')
}

// ============ Main Cloud Function ============

export const generateTrainingAnalysis = onCall(
  {
    secrets: ['OPENAI_API_KEY'],
    timeoutSeconds: 120,
    memory: '512MiB',
  },
  async (callRequest): Promise<AnalysisResponse> => {
    // Check authentication
    if (!callRequest.auth) {
      throw new HttpsError('unauthenticated', 'יש להתחבר כדי לקבל ניתוח אימונים')
    }

    const userId = callRequest.auth.uid

    // Validate request - user can only analyze their own data
    const data = callRequest.data as AnalysisRequest
    if (data.userId && data.userId !== userId) {
      throw new HttpsError('permission-denied', 'אין הרשאה לצפות בנתוני משתמש אחר')
    }

    functions.logger.info('Training analysis started', {
      userId,
      timestamp: new Date().toISOString(),
    })

    try {
      // Check rate limit
      const rateLimitResult = await checkAnalysisRateLimit(userId)
      if (!rateLimitResult.allowed) {
        // Rate limited — try to return cached analysis instead of error
        const cached = await getCachedAnalysisResult(userId)
        if (cached) {
          functions.logger.info('Returning cached analysis (rate limited)', { userId })
          return {
            success: true,
            analysis: cached.analysis,
            workoutCount: cached.workoutCount,
            weeksAnalyzed: cached.weeksAnalyzed,
            rateLimitInfo: {
              remaining: 0,
              resetAt: rateLimitResult.resetAt.toISOString(),
            },
          }
        }

        functions.logger.warn('Analysis rate limit exceeded, no cache available', { userId })
        return {
          success: false,
          error: 'ניתן לבצע ניתוח אחד ביום. נסה שוב מחר.',
          rateLimitInfo: {
            remaining: 0,
            resetAt: rateLimitResult.resetAt.toISOString(),
          },
        }
      }

      // Fetch all data in parallel
      const [profile, exerciseMap, muscles] = await Promise.all([
        fetchUserProfile(userId),
        fetchExerciseMappings(),
        fetchMuscleData(),
      ])

      // Fetch workout history - try 4 weeks first
      let { workouts, weeksAnalyzed } = await fetchWorkoutHistory(userId, 4)

      // If less than 6 workouts in 4 weeks, expand to 8 weeks
      if (workouts.length < 6) {
        functions.logger.info('Less than 6 workouts in 4 weeks, expanding to 8', {
          userId,
          workoutCount: workouts.length,
        })
        const expanded = await fetchWorkoutHistory(userId, 8)
        workouts = expanded.workouts
        weeksAnalyzed = expanded.weeksAnalyzed
      }

      // If still less than 4 workouts, return message
      if (workouts.length < 4) {
        functions.logger.info('Not enough workouts for analysis', {
          userId,
          workoutCount: workouts.length,
        })
        return {
          success: false,
          error: `צריך לפחות 4 אימונים כדי לבצע ניתוח. כרגע יש ${workouts.length} אימונים ב-8 השבועות האחרונים.`,
          workoutCount: workouts.length,
          weeksAnalyzed,
        }
      }

      // Enrich workouts with muscle mapping
      const enrichedWorkouts = enrichWorkoutsWithMuscleData(workouts, exerciseMap, muscles)

      // TODO: REMOVE — Debug logging for prompt data inspection
      functions.logger.info('=== ANALYSIS DEBUG START ===')
      functions.logger.info(`Workouts sent to prompt: ${enrichedWorkouts.length}`)
      enrichedWorkouts.forEach((w, i) => {
        functions.logger.info(`Workout ${i + 1}: date=${w.date}, status=${w.status}, exercises=${w.exercises.length}`)
        w.exercises.forEach((ex) => {
          functions.logger.info(`  - ${ex.exerciseNameHe} | primaryMuscle=${ex.primaryMuscle} | secondaryMuscles=${JSON.stringify(ex.secondaryMuscles)} | sets=${ex.sets.length}`)
        })
      })
      // TODO: REMOVE — End debug logging

      // Build prompts
      const systemPrompt = buildSystemPrompt()
      const userPrompt = buildUserPrompt(profile, enrichedWorkouts, muscles, weeksAnalyzed)

      // TODO: REMOVE — Log prompt size
      functions.logger.info(`Prompt size: system=${systemPrompt.length} chars, user=${userPrompt.length} chars, total=${systemPrompt.length + userPrompt.length} chars`)
      functions.logger.info('=== ANALYSIS DEBUG END ===')

      functions.logger.info('Calling OpenAI for analysis', {
        userId,
        workoutCount: workouts.length,
        weeksAnalyzed,
        promptLength: userPrompt.length,
      })

      // Call OpenAI
      const client = await getOpenAIClient()
      const completion = await client.chat.completions.create({
        model: 'gpt-4o',
        max_tokens: 4096,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      })

      const textContent = completion.choices[0]?.message?.content
      if (!textContent) {
        throw new Error('OpenAI returned empty response')
      }

      const parsed = JSON.parse(textContent.trim())

      // Validate required fields
      if (!parsed.title || !parsed.overview || !Array.isArray(parsed.strengths) ||
          !Array.isArray(parsed.weaknesses) || !Array.isArray(parsed.recommendations) || !parsed.summary) {
        throw new Error('OpenAI response missing required fields')
      }

      const analysis = JSON.stringify({
        title: parsed.title,
        overview: parsed.overview,
        strengths: parsed.strengths,
        weaknesses: parsed.weaknesses,
        recommendations: parsed.recommendations,
        summary: parsed.summary,
      })

      // Increment usage and save result for caching
      await Promise.all([
        incrementAnalysisUsage(userId),
        saveAnalysisResult(userId, analysis, workouts.length, weeksAnalyzed),
      ])

      functions.logger.info('Training analysis completed', {
        userId,
        workoutCount: workouts.length,
        weeksAnalyzed,
        analysisLength: analysis.length,
      })

      return {
        success: true,
        analysis,
        workoutCount: workouts.length,
        weeksAnalyzed,
        rateLimitInfo: {
          remaining: rateLimitResult.remaining - 1,
          resetAt: rateLimitResult.resetAt.toISOString(),
        },
      }
    } catch (error: any) {
      functions.logger.error('Training analysis failed', {
        userId,
        error: error.message,
      })

      if (error instanceof HttpsError) {
        throw error
      }

      throw new HttpsError('internal', 'שגיאה בניתוח האימונים. נסה שוב.')
    }
  }
)
