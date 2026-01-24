/**
 * GymIQ Cloud Functions
 * Main entry point for all Firebase Cloud Functions
 */

import * as admin from 'firebase-admin'

// Initialize Firebase Admin SDK
admin.initializeApp()

// Export AI Trainer function
export { generateAIWorkout } from './ai-trainer/generateWorkout'
