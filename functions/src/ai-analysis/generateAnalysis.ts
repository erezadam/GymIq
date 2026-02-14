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

const ANALYSIS_DAILY_LIMIT = 1
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

  const workouts: AnalysisWorkout[] = snapshot.docs
    .filter((doc) => {
      const data = doc.data()
      return !data.softDeleted
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
  return `אתה מנתח אימונים מקצועי ומנוסה. תפקידך לנתח את היסטוריית האימונים של המתאמן ולספק תובנות מעמיקות.

## הנחיות:
1. ענה **תמיד** בעברית
2. השתמש בנתונים אמיתיים מההיסטוריה - אל תמציא מספרים
3. היה ספציפי: ציין שמות תרגילים, משקלים, חזרות
4. היה חיובי אך כנה - ציין גם נקודות לשיפור
5. התייחס למגמות לאורך זמן (התקדמות, ירידה, עקביות)
6. אם יש מידע על פציעות/מגבלות - התייחס אליהן

## פורמט תגובה:
הפלט חייב להיות JSON בלבד, בדיוק בפורמט הבא (ללא שדות נוספים):

{
  "title": "סיכום מצב מתאמן",
  "overview": "פסקת פתיחה של 2 עד 3 שורות שמסכמת את המצב הכללי של המתאמן",
  "strengths": ["נקודת חוזק 1", "נקודת חוזק 2", "נקודת חוזק 3"],
  "weaknesses": ["נקודת חולשה 1", "נקודת חולשה 2", "נקודת חולשה 3"],
  "recommendations": ["המלצה מעשית 1", "המלצה מעשית 2", "המלצה מעשית 3"],
  "summary": "משפט סיכום אחד שמסכם את כל הניתוח"
}

## כללים לכל שדה:
- title: כותרת קצרה וקולעת (עד 6 מילים)
- overview: 2-3 שורות שמתארות את המצב הכללי, נפח אימון, עקביות, ומגמות
- strengths: 3-5 נקודות חוזק, כל אחת משפט אחד ספציפי עם נתונים (שמות תרגילים, משקלים)
- weaknesses: 3-5 נקודות חולשה, כל אחת משפט אחד ספציפי עם נתונים
- recommendations: 3-5 המלצות מעשיות, כל אחת משפט אחד ברור שאפשר ליישם
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

          return `  - ${ex.exerciseNameHe} [${ex.primaryMuscle}]: ${setsSummary || 'לא דווח'}`
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
        functions.logger.warn('Analysis rate limit exceeded', { userId })
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

      // Build prompts
      const systemPrompt = buildSystemPrompt()
      const userPrompt = buildUserPrompt(profile, enrichedWorkouts, muscles, weeksAnalyzed)

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

      // Increment usage
      await incrementAnalysisUsage(userId)

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
