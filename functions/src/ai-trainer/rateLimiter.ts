/**
 * Rate Limiter for AI Trainer
 * Limits daily AI workout generations per user
 */

import * as admin from 'firebase-admin'
import * as functions from 'firebase-functions'
import type { RateLimitResult } from './types'

// Daily limit for AI generations per user
const DAILY_LIMIT = 3

// Collection name for tracking usage
const USAGE_COLLECTION = 'aiTrainerUsage'

// Optional overrides so other features (e.g. machine-lens) can reuse the same
// mechanism with their own collection/limit. Defaults preserve ai-trainer
// behavior exactly.
export interface RateLimitOptions {
  collection?: string
  dailyLimit?: number
}

/**
 * Get Firestore instance
 */
function getDb(): admin.firestore.Firestore {
  return admin.firestore()
}

/**
 * Get today's date string in YYYY-MM-DD format
 */
function getTodayString(): string {
  return new Date().toISOString().split('T')[0]
}

/**
 * Get next midnight time for rate limit reset
 */
function getNextMidnight(): Date {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(0, 0, 0, 0)
  return tomorrow
}

/**
 * Check if user has reached daily rate limit
 */
export async function checkRateLimit(userId: string, options?: RateLimitOptions): Promise<RateLimitResult> {
  const db = getDb()
  const today = getTodayString()
  const docId = `${userId}_${today}`
  const collection = options?.collection ?? USAGE_COLLECTION
  const limit = options?.dailyLimit ?? DAILY_LIMIT

  try {
    const usageRef = db.collection(collection).doc(docId)
    const doc = await usageRef.get()

    if (!doc.exists) {
      // First generation of the day
      return {
        allowed: true,
        remaining: limit,
        resetAt: getNextMidnight(),
      }
    }

    const data = doc.data()
    const count = data?.generationsCount || 0

    if (count >= limit) {
      functions.logger.info('Rate limit reached', { userId, count, limit })
      return {
        allowed: false,
        remaining: 0,
        resetAt: getNextMidnight(),
      }
    }

    return {
      allowed: true,
      remaining: limit - count,
      resetAt: getNextMidnight(),
    }
  } catch (error: any) {
    functions.logger.error('Rate limit check failed', { userId, error: error.message })
    // On error, allow the request (fail open)
    return {
      allowed: true,
      remaining: limit,
      resetAt: getNextMidnight(),
    }
  }
}

/**
 * Increment usage count after successful generation
 */
export async function incrementUsage(userId: string, options?: RateLimitOptions): Promise<void> {
  const db = getDb()
  const today = getTodayString()
  const docId = `${userId}_${today}`

  try {
    const usageRef = db.collection(options?.collection ?? USAGE_COLLECTION).doc(docId)

    await usageRef.set(
      {
        userId,
        date: today,
        generationsCount: admin.firestore.FieldValue.increment(1),
        lastGeneratedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    )

    functions.logger.info('Usage incremented', { userId, date: today })
  } catch (error: any) {
    functions.logger.error('Failed to increment usage', { userId, error: error.message })
    // Don't throw - generation was successful, just tracking failed
  }
}

/**
 * Get remaining generations for user
 * (For UI display purposes)
 */
export async function getRemainingGenerations(userId: string): Promise<number> {
  const result = await checkRateLimit(userId)
  return result.remaining
}
