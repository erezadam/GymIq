/**
 * Claude API Client
 * Wrapper for Anthropic Claude API calls
 */

import Anthropic from '@anthropic-ai/sdk'
import * as functions from 'firebase-functions'
import { buildSystemPrompt, buildUserPrompt } from './promptBuilder'
import type {
  GenerateWorkoutRequest,
  ClaudeFullResponse,
  ClaudeWorkoutResponse,
} from './types'

// Initialize Claude client (lazy - only when needed)
let anthropicClient: Anthropic | null = null

function getClient(): Anthropic {
  if (!anthropicClient) {
    const apiKey = process.env.CLAUDE_API_KEY
    if (!apiKey) {
      throw new Error('CLAUDE_API_KEY not configured')
    }
    anthropicClient = new Anthropic({ apiKey })
  }
  return anthropicClient
}

/**
 * Call Claude API to generate workouts
 * Returns null if Claude fails (triggers fallback)
 */
export async function callClaude(
  data: GenerateWorkoutRequest,
  workoutIndex: number,
  totalWorkouts: number,
  usedMuscleGroups: string[][]
): Promise<ClaudeWorkoutResponse | null> {
  try {
    const client = getClient()

    const systemPrompt = buildSystemPrompt()
    const userPrompt = buildUserPrompt(data, workoutIndex, totalWorkouts, usedMuscleGroups)

    functions.logger.info('Calling Claude API', {
      workoutIndex,
      totalWorkouts,
      muscleTargets: data.request.muscleTargets,
      duration: data.request.duration,
    })

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    })

    // Extract text content from response
    const textContent = message.content.find((c) => c.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      functions.logger.error('Claude response has no text content')
      return null
    }

    // Parse JSON response
    const responseText = textContent.text.trim()

    // Try to extract JSON from response (Claude sometimes adds explanations)
    let jsonStr = responseText
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      jsonStr = jsonMatch[0]
    }

    const parsed = JSON.parse(jsonStr) as ClaudeWorkoutResponse

    // Validate response structure
    if (!parsed.exercises || !Array.isArray(parsed.exercises)) {
      functions.logger.error('Claude response missing exercises array')
      return null
    }

    functions.logger.info('Claude response parsed successfully', {
      exerciseCount: parsed.exercises.length,
      muscleGroups: parsed.muscleGroups,
    })

    return parsed
  } catch (error: any) {
    functions.logger.error('Claude API call failed', {
      error: error.message,
      code: error.code,
    })
    return null
  }
}

/**
 * Call Claude to generate all workouts at once (more efficient for bundles)
 * Returns null if Claude fails
 */
export async function callClaudeForBundle(
  data: GenerateWorkoutRequest
): Promise<ClaudeFullResponse | null> {
  try {
    const client = getClient()

    const systemPrompt = buildSystemPrompt()
    const userPrompt = buildBundlePrompt(data)

    functions.logger.info('Calling Claude API for bundle', {
      numWorkouts: data.request.numWorkouts,
      duration: data.request.duration,
    })

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096, // More tokens for multiple workouts
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    })

    const textContent = message.content.find((c) => c.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      return null
    }

    const responseText = textContent.text.trim()
    let jsonStr = responseText
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      jsonStr = jsonMatch[0]
    }

    const parsed = JSON.parse(jsonStr) as ClaudeFullResponse

    if (!parsed.workouts || !Array.isArray(parsed.workouts)) {
      functions.logger.error('Claude bundle response missing workouts array')
      return null
    }

    // Log explanations for debugging
    functions.logger.info('Claude bundle response parsed', {
      workoutCount: parsed.workouts.length,
      explanations: parsed.workouts.map((w, i) => ({
        workout: i + 1,
        hasExplanation: !!w.explanation,
        explanation: w.explanation?.substring(0, 100),
      })),
    })

    return parsed
  } catch (error: any) {
    functions.logger.error('Claude bundle API call failed', { error: error.message })
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
