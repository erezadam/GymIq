/**
 * Rate Limiter for AI Trainer
 * Limits daily AI workout generations per user
 */

import * as admin from 'firebase-admin'
import * as functions from 'firebase-functions'
import type { RateLimitResult } from './types'

// Daily limit for AI generations per user (disabled for testing)
const DAILY_LIMIT = 9999

// Collection name for tracking usage
const USAGE_COLLECTION = 'aiTrainerUsage'

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
export async function checkRateLimit(userId: string): Promise<RateLimitResult> {
  const db = getDb()
  const today = getTodayString()
  const docId = `${userId}_${today}`

  try {
    const usageRef = db.collection(USAGE_COLLECTION).doc(docId)
    const doc = await usageRef.get()

    if (!doc.exists) {
      // First generation of the day
      return {
        allowed: true,
        remaining: DAILY_LIMIT,
        resetAt: getNextMidnight(),
      }
    }

    const data = doc.data()
    const count = data?.generationsCount || 0

    if (count >= DAILY_LIMIT) {
      functions.logger.info('Rate limit reached', { userId, count, limit: DAILY_LIMIT })
      return {
        allowed: false,
        remaining: 0,
        resetAt: getNextMidnight(),
      }
    }

    return {
      allowed: true,
      remaining: DAILY_LIMIT - count,
      resetAt: getNextMidnight(),
    }
  } catch (error: any) {
    functions.logger.error('Rate limit check failed', { userId, error: error.message })
    // On error, allow the request (fail open)
    return {
      allowed: true,
      remaining: DAILY_LIMIT,
      resetAt: getNextMidnight(),
    }
  }
}

/**
 * Increment usage count after successful generation
 */
export async function incrementUsage(userId: string): Promise<void> {
  const db = getDb()
  const today = getTodayString()
  const docId = `${userId}_${today}`

  try {
    const usageRef = db.collection(USAGE_COLLECTION).doc(docId)

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
