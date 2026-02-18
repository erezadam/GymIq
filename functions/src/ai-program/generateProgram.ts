/**
 * Generate AI Training Program - Cloud Function
 * Creates a weekly training program for a trainee, using analysis data and exercise library
 */

import * as admin from 'firebase-admin'
import * as functions from 'firebase-functions'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import type {
  GenerateProgramRequest,
  GenerateProgramResponse,
  TraineeProfile,
  ProgramExerciseData,
  LastAnalysisData,
  ExistingProgramSummary,
  GPTProgramResponse,
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

// ============ Rate Limiter (3 per day per trainer) ============

const PROGRAM_DAILY_LIMIT = 3
const PROGRAM_USAGE_COLLECTION = 'aiProgramUsage'

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

async function checkProgramRateLimit(trainerId: string): Promise<RateLimitResult> {
  const db = getDb()
  const today = getTodayString()
  const docId = `${trainerId}_${today}`

  try {
    const usageRef = db.collection(PROGRAM_USAGE_COLLECTION).doc(docId)
    const doc = await usageRef.get()

    if (!doc.exists) {
      return { allowed: true, remaining: PROGRAM_DAILY_LIMIT, resetAt: getNextMidnight() }
    }

    const count = doc.data()?.generationsCount || 0

    if (count >= PROGRAM_DAILY_LIMIT) {
      functions.logger.info('Program rate limit reached', { trainerId, count, limit: PROGRAM_DAILY_LIMIT })
      return { allowed: false, remaining: 0, resetAt: getNextMidnight() }
    }

    return { allowed: true, remaining: PROGRAM_DAILY_LIMIT - count, resetAt: getNextMidnight() }
  } catch (error: any) {
    functions.logger.error('Program rate limit check failed', { trainerId, error: error.message })
    return { allowed: true, remaining: PROGRAM_DAILY_LIMIT, resetAt: getNextMidnight() }
  }
}

async function incrementProgramUsage(trainerId: string): Promise<void> {
  const db = getDb()
  const today = getTodayString()
  const docId = `${trainerId}_${today}`

  try {
    await db.collection(PROGRAM_USAGE_COLLECTION).doc(docId).set(
      {
        trainerId,
        date: today,
        generationsCount: admin.firestore.FieldValue.increment(1),
        lastGeneratedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    )
  } catch (error: any) {
    functions.logger.error('Failed to increment program usage', { trainerId, error: error.message })
  }
}

// ============ Authorization ============

async function verifyTrainerAccess(
  callerId: string,
  traineeId: string
): Promise<void> {
  const db = getDb()

  // Check caller role
  const callerDoc = await db.collection('users').doc(callerId).get()
  if (!callerDoc.exists) {
    throw new HttpsError('permission-denied', 'משתמש לא נמצא')
  }

  const callerRole = callerDoc.data()?.role
  if (callerRole !== 'trainer' && callerRole !== 'admin') {
    throw new HttpsError('permission-denied', 'רק מאמנים יכולים ליצור תוכניות אימון')
  }

  // Admins can access any trainee
  if (callerRole === 'admin') return

  // Trainers must have an active relationship with the trainee
  const relationshipSnapshot = await db
    .collection('trainerRelationships')
    .where('trainerId', '==', callerId)
    .where('traineeId', '==', traineeId)
    .where('status', '==', 'active')
    .limit(1)
    .get()

  if (relationshipSnapshot.empty) {
    throw new HttpsError('permission-denied', 'אין לך הרשאה ליצור תוכנית למתאמן זה')
  }
}

// ============ Data Fetching ============

async function fetchTraineeProfile(traineeId: string): Promise<TraineeProfile> {
  const db = getDb()
  const doc = await db.collection('users').doc(traineeId).get()
  if (!doc.exists) return {}

  const data = doc.data()!
  return {
    age: data.age,
    height: data.height,
    weight: data.weight,
    fitnessLevel: data.fitnessLevel,
    trainingGoals: data.trainingGoals,
    injuriesOrLimitations: data.injuriesOrLimitations,
  }
}

async function fetchLastAnalysis(traineeId: string): Promise<LastAnalysisData | null> {
  const db = getDb()

  try {
    const doc = await db
      .collection('users')
      .doc(traineeId)
      .collection('aiData')
      .doc('lastAnalysis')
      .get()

    if (!doc.exists) return null

    const data = doc.data()
    if (!data?.analysis) return null

    return data as LastAnalysisData
  } catch (error: any) {
    functions.logger.warn('Failed to fetch last analysis for program', { traineeId, error: error.message })
    return null
  }
}

async function fetchExistingProgram(traineeId: string): Promise<ExistingProgramSummary | null> {
  const db = getDb()

  try {
    const snapshot = await db
      .collection('trainingPrograms')
      .where('traineeId', '==', traineeId)
      .where('status', '==', 'active')
      .limit(1)
      .get()

    if (snapshot.empty) return null

    const data = snapshot.docs[0].data()
    const weeklyStructure = data.weeklyStructure || []

    return {
      name: data.name || '',
      days: weeklyStructure.map((day: any) => ({
        dayLabel: day.dayLabel || '',
        name: day.name || '',
        exerciseNames: (day.exercises || []).map((ex: any) => ex.exerciseNameHe || ex.exerciseName || ''),
      })),
    }
  } catch (error: any) {
    functions.logger.warn('Failed to fetch existing program', { traineeId, error: error.message })
    return null
  }
}

async function fetchExercises(): Promise<Map<string, ProgramExerciseData>> {
  const db = getDb()
  const snapshot = await db.collection('exercises').get()
  const map = new Map<string, ProgramExerciseData>()

  snapshot.docs.forEach((doc) => {
    const data = doc.data()
    map.set(doc.id, {
      id: doc.id,
      nameHe: data.nameHe || '',
      name: data.name || '',
      category: data.category || '',
      primaryMuscle: data.primaryMuscle || '',
      secondaryMuscles: data.secondaryMuscles || [],
      equipment: data.equipment || '',
      difficulty: data.difficulty || '',
      imageUrl: data.imageUrl || '',
    })
  })

  return map
}

// ============ Prompt Building ============

function buildSystemPrompt(daysPerWeek: number): string {
  return `אתה מאמן כושר מומחה שבונה תוכניות אימון שבועיות מותאמות אישית.
אתה מקבל: נתוני מתאמן, ניתוח חולשות וחוזקות (אם קיים), תוכנית קודמת (אם קיימת), ורשימת תרגילים זמינים.

כללים:
1. בנה בדיוק ${daysPerWeek} ימי אימון.
2. לכל יום תן שם בעברית שמתאר את קבוצות השרירים (למשל: "חזה וכתפיים", "גב ודו ראשי").
3. בחר תרגילים אך ורק מרשימת התרגילים הזמינים. לכל תרגיל השתמש ב-exerciseId המדויק מהרשימה. אל תמציא id.
4. לכל יום בחר תרגילים לפי מבנה ProgramExercise.
5. לכל תרגיל הגדר: targetSets, targetReps (כמחרוזת, למשל "8-12"), restTime בשניות.
6. סדר תרגילים מתרכובות לבודדים בכל יום.
7. אם יש ניתוח חולשות — ודא שהתוכנית מתייחסת לחולשות שזוהו. אם הניתוח אומר "כתף צדדית מוזנחת" — שלב תרגילים לכתף צדדית.
8. אם יש מגבלות או רגישויות — הימנע מתרגילים שעלולים להחמיר.
9. שמור על איזון: שרשרת קדמית מול אחורית, גוף עליון מול תחתון.
10. אם יש הערות או דגשים מהמאמן — התחשב בהם.
11. אם יש תוכנית קודמת — התבסס עליה אבל שפר לפי הניתוח.

פורמט JSON בלבד:
{
  "programName": "שם התוכנית בעברית",
  "description": "תיאור קצר",
  "days": [
    {
      "dayLabel": "יום A",
      "name": "שם היום בעברית",
      "exercises": [
        {
          "exerciseId": "ה-id המדויק מרשימת התרגילים",
          "exerciseNameHe": "שם התרגיל בעברית מהרשימה",
          "exerciseName": "שם התרגיל באנגלית מהרשימה",
          "category": "הקטגוריה מהרשימה",
          "primaryMuscle": "primaryMuscle מהרשימה",
          "equipment": "equipment מהרשימה",
          "order": 1,
          "targetSets": 3,
          "targetReps": "8-12",
          "restTime": 90,
          "notes": "הערה קצרה אם רלוונטי"
        }
      ]
    }
  ],
  "explanation": "הסבר בעברית למאמן: למה בחרת את המבנה, איך זה מתייחס לניתוח, ומה הלוגיקה"
}

חשוב: exerciseId חייב להיות id שקיים ברשימת התרגילים. אם אין תרגיל מתאים ברשימה — אל תמציא, בחר את הקרוב ביותר.`
}

function buildUserPrompt(
  profile: TraineeProfile,
  lastAnalysis: LastAnalysisData | null,
  existingProgram: ExistingProgramSummary | null,
  exercises: ProgramExerciseData[],
  daysPerWeek: number,
  focusAreas?: string[],
  notes?: string
): string {
  // Profile section
  const profileParts: string[] = []
  if (profile.age) profileParts.push(`גיל: ${profile.age}`)
  if (profile.height) profileParts.push(`גובה: ${profile.height} ס"מ`)
  if (profile.weight) profileParts.push(`משקל: ${profile.weight} ק"ג`)
  if (profile.fitnessLevel) profileParts.push(`רמת כושר: ${profile.fitnessLevel}`)
  if (profile.trainingGoals?.length) profileParts.push(`מטרות: ${profile.trainingGoals.join(', ')}`)
  if (profile.injuriesOrLimitations) profileParts.push(`מגבלות: ${profile.injuriesOrLimitations}`)

  const profileStr = profileParts.length > 0
    ? profileParts.join('\n')
    : 'לא סופק מידע על המתאמן'

  // Analysis section
  let analysisStr = ''
  if (lastAnalysis?.analysis) {
    const a = lastAnalysis.analysis
    const createdAt = lastAnalysis.createdAt?.toDate
      ? lastAnalysis.createdAt.toDate()
      : new Date()
    const dateStr = createdAt.toISOString().split('T')[0]

    const parts: string[] = []
    parts.push(`\nניתוח אחרון (מתאריך ${dateStr}):`)
    if (a.weaknesses?.length) parts.push(`חולשות: ${a.weaknesses.join(' | ')}`)
    if (a.recommendations?.length) parts.push(`המלצות: ${a.recommendations.join(' | ')}`)
    if (a.summary) parts.push(`סיכום: ${a.summary}`)
    analysisStr = parts.join('\n')
  }

  // Existing program section
  let existingProgramStr = ''
  if (existingProgram) {
    const daysSummary = existingProgram.days
      .map((d) => `${d.dayLabel} (${d.name}): ${d.exerciseNames.join(', ')}`)
      .join('\n')
    existingProgramStr = `\nתוכנית קודמת (${existingProgram.name}):\n${daysSummary}`
  }

  // Focus areas and notes
  let trainerNotes = ''
  const noteParts: string[] = []
  if (focusAreas?.length) noteParts.push(`דגשים: ${focusAreas.join(', ')}`)
  if (notes) noteParts.push(`הערות מהמאמן: ${notes}`)
  if (noteParts.length > 0) trainerNotes = `\n${noteParts.join('\n')}`

  // Exercises list (compact)
  const exerciseList = JSON.stringify(
    exercises.map((e) => ({
      id: e.id,
      nameHe: e.nameHe,
      category: e.category,
      primaryMuscle: e.primaryMuscle,
      secondaryMuscles: e.secondaryMuscles,
      equipment: e.equipment,
      difficulty: e.difficulty,
    })),
    null,
    0
  )

  return `פרטי מתאמן:
${profileStr}
${analysisStr}
${existingProgramStr}
${trainerNotes}

רשימת תרגילים זמינים (${exercises.length} תרגילים):
${exerciseList}

בנה תוכנית שבועית של ${daysPerWeek} ימים.
החזר JSON בלבד.`
}

// ============ Validation ============

function validateAndCleanResponse(
  response: GPTProgramResponse,
  exerciseMap: Map<string, ProgramExerciseData>,
  daysPerWeek: number
): GPTProgramResponse {
  // Validate days count
  if (!response.days || !Array.isArray(response.days)) {
    throw new Error('GPT response missing days array')
  }

  if (response.days.length !== daysPerWeek) {
    functions.logger.warn('GPT returned wrong number of days', {
      expected: daysPerWeek,
      got: response.days.length,
    })
    // Trim or pad as needed
    if (response.days.length > daysPerWeek) {
      response.days = response.days.slice(0, daysPerWeek)
    }
  }

  let totalRemoved = 0

  for (const day of response.days) {
    if (!day.exercises || !Array.isArray(day.exercises)) {
      day.exercises = []
      continue
    }

    const validExercises = day.exercises.filter((ex) => {
      // Check exerciseId exists
      if (!exerciseMap.has(ex.exerciseId)) {
        functions.logger.warn('GPT returned invalid exerciseId — removing', {
          exerciseId: ex.exerciseId,
          dayLabel: day.dayLabel,
        })
        totalRemoved++
        return false
      }

      // Clamp targetSets to 1-6
      if (typeof ex.targetSets !== 'number' || ex.targetSets < 1 || ex.targetSets > 6) {
        ex.targetSets = Math.max(1, Math.min(6, ex.targetSets || 3))
      }

      // Clamp restTime to 30-300
      if (typeof ex.restTime !== 'number' || ex.restTime < 30 || ex.restTime > 300) {
        ex.restTime = Math.max(30, Math.min(300, ex.restTime || 90))
      }

      // Ensure targetReps is a string
      if (typeof ex.targetReps !== 'string') {
        ex.targetReps = String(ex.targetReps || '8-12')
      }

      // Enrich with data from exercise map (ensure correct names/categories)
      const exerciseData = exerciseMap.get(ex.exerciseId)!
      ex.exerciseNameHe = exerciseData.nameHe
      ex.exerciseName = exerciseData.name
      ex.category = exerciseData.category
      ex.primaryMuscle = exerciseData.primaryMuscle
      ex.equipment = exerciseData.equipment

      return true
    })

    day.exercises = validExercises
  }

  if (totalRemoved > 0) {
    functions.logger.warn('Validation removed invalid exercises from GPT response', {
      totalRemoved,
    })
  }

  return response
}

// ============ Main Cloud Function ============

export const generateAIProgram = onCall(
  {
    secrets: ['OPENAI_API_KEY'],
    timeoutSeconds: 180,
    memory: '1GiB',
  },
  async (callRequest): Promise<GenerateProgramResponse> => {
    // Check authentication
    if (!callRequest.auth) {
      throw new HttpsError('unauthenticated', 'יש להתחבר כדי ליצור תוכנית אימון')
    }

    const callerId = callRequest.auth.uid

    // Validate request
    const data = callRequest.data as GenerateProgramRequest
    if (!data?.traineeId) {
      throw new HttpsError('invalid-argument', 'חסר מזהה מתאמן')
    }
    if (!data.daysPerWeek || data.daysPerWeek < 3 || data.daysPerWeek > 6) {
      throw new HttpsError('invalid-argument', 'מספר ימים חייב להיות בין 3 ל-6')
    }

    functions.logger.info('AI Program generation started', {
      callerId,
      traineeId: data.traineeId,
      daysPerWeek: data.daysPerWeek,
      timestamp: new Date().toISOString(),
    })

    try {
      // Verify caller is trainer/admin with access to this trainee
      await verifyTrainerAccess(callerId, data.traineeId)

      // Check rate limit
      const rateLimitResult = await checkProgramRateLimit(callerId)
      if (!rateLimitResult.allowed) {
        return {
          success: false,
          error: 'הגעת למגבלה היומית (3 תוכניות ליום). נסה שוב מחר.',
          rateLimitInfo: {
            remaining: 0,
            resetAt: rateLimitResult.resetAt.toISOString(),
          },
        }
      }

      // Fetch all data in parallel
      const [profile, lastAnalysis, existingProgram, exerciseMap] = await Promise.all([
        fetchTraineeProfile(data.traineeId),
        fetchLastAnalysis(data.traineeId),
        fetchExistingProgram(data.traineeId),
        fetchExercises(),
      ])

      const exercises = Array.from(exerciseMap.values())

      functions.logger.info('Data fetched for program generation', {
        traineeId: data.traineeId,
        hasAnalysis: !!lastAnalysis,
        hasExistingProgram: !!existingProgram,
        exerciseCount: exercises.length,
      })

      // Build prompts
      const systemPrompt = buildSystemPrompt(data.daysPerWeek)
      const userPrompt = buildUserPrompt(
        profile,
        lastAnalysis,
        existingProgram,
        exercises,
        data.daysPerWeek,
        data.focusAreas,
        data.notes
      )

      // TODO: REMOVE — Log prompt size
      functions.logger.info(`Program prompt size: system=${systemPrompt.length}, user=${userPrompt.length}, total=${systemPrompt.length + userPrompt.length}`)

      // Call OpenAI
      const client = await getOpenAIClient()
      const completion = await client.chat.completions.create({
        model: 'gpt-4o',
        max_tokens: 8192,
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

      const parsed = JSON.parse(textContent.trim()) as GPTProgramResponse

      // Validate required fields
      if (!parsed.programName || !parsed.days || !Array.isArray(parsed.days)) {
        throw new Error('OpenAI response missing required fields (programName, days)')
      }

      // Validate and clean response
      const validatedProgram = validateAndCleanResponse(parsed, exerciseMap, data.daysPerWeek)

      // Increment usage
      await incrementProgramUsage(callerId)

      functions.logger.info('AI Program generation completed', {
        callerId,
        traineeId: data.traineeId,
        daysPerWeek: data.daysPerWeek,
        programName: validatedProgram.programName,
        dayCount: validatedProgram.days.length,
        totalExercises: validatedProgram.days.reduce((sum, d) => sum + d.exercises.length, 0),
      })

      return {
        success: true,
        program: validatedProgram,
        rateLimitInfo: {
          remaining: rateLimitResult.remaining - 1,
          resetAt: rateLimitResult.resetAt.toISOString(),
        },
      }
    } catch (error: any) {
      functions.logger.error('AI Program generation failed', {
        callerId,
        traineeId: data.traineeId,
        error: error.message,
      })

      if (error instanceof HttpsError) {
        throw error
      }

      throw new HttpsError('internal', 'שגיאה ביצירת תוכנית האימון. נסה שוב.')
    }
  }
)
