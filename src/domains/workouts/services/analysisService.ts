/**
 * Training Analysis Service
 * Calls generateTrainingAnalysis Cloud Function and parses the response
 */

import { getFunctions, httpsCallable } from 'firebase/functions'
import { app } from '@/lib/firebase/config'

// Structured analysis response from GPT
export interface TrainingAnalysisResult {
  title: string
  overview: string
  strengths: string[]
  weaknesses: string[]
  recommendations: string[]
  summary: string
}

// Full response from Cloud Function
export interface AnalysisResponse {
  success: boolean
  analysis?: string
  error?: string
  workoutCount?: number
  weeksAnalyzed?: number
  rateLimitInfo?: {
    remaining: number
    resetAt: string
  }
}

// Error types for UI handling
export type AnalysisErrorType = 'rate_limit' | 'not_enough_data' | 'network' | 'general'

export interface AnalysisError {
  type: AnalysisErrorType
  message: string
  resetAt?: string
  workoutCount?: number
}

// Initialize Firebase Functions
const functions = getFunctions(app)

/**
 * Call generateTrainingAnalysis Cloud Function
 * Returns parsed structured analysis or throws AnalysisError
 */
export async function getTrainingAnalysis(userId: string): Promise<{
  result: TrainingAnalysisResult
  workoutCount: number
  weeksAnalyzed: number
  rateLimitInfo?: { remaining: number; resetAt: string }
}> {
  try {
    const generateAnalysis = httpsCallable<{ userId: string }, AnalysisResponse>(
      functions,
      'generateTrainingAnalysis'
    )

    const response = await generateAnalysis({ userId })
    const data = response.data

    if (!data.success) {
      // Determine error type
      const error: AnalysisError = {
        type: 'general',
        message: data.error || 'אירעה שגיאה, נסה שוב מאוחר יותר',
      }

      if (data.rateLimitInfo && data.rateLimitInfo.remaining === 0) {
        error.type = 'rate_limit'
        error.resetAt = data.rateLimitInfo.resetAt
      } else if (data.workoutCount !== undefined && data.workoutCount < 4) {
        error.type = 'not_enough_data'
        error.workoutCount = data.workoutCount
      }

      throw error
    }

    if (!data.analysis) {
      throw {
        type: 'general' as AnalysisErrorType,
        message: 'לא התקבלה תשובה מהשרת',
      }
    }

    // Parse the JSON string into structured result
    const result: TrainingAnalysisResult = JSON.parse(data.analysis)

    return {
      result,
      workoutCount: data.workoutCount || 0,
      weeksAnalyzed: data.weeksAnalyzed || 0,
      rateLimitInfo: data.rateLimitInfo,
    }
  } catch (error: any) {
    // If it's already our AnalysisError, rethrow
    if (error.type && error.message) {
      throw error
    }

    // Firebase function errors
    if (error.code === 'functions/resource-exhausted') {
      throw {
        type: 'rate_limit' as AnalysisErrorType,
        message: 'ניתן לבצע ניתוח אחד ביום. נסה שוב מחר.',
      }
    }

    if (error.code === 'functions/unavailable' || error.message?.includes('network')) {
      throw {
        type: 'network' as AnalysisErrorType,
        message: 'בעיית תקשורת. בדוק את החיבור לאינטרנט ונסה שוב.',
      }
    }

    throw {
      type: 'general' as AnalysisErrorType,
      message: 'אירעה שגיאה, נסה שוב מאוחר יותר',
    }
  }
}
