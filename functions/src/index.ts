/**
 * GymIQ Cloud Functions
 * Main entry point for all Firebase Cloud Functions
 */

import * as admin from 'firebase-admin'

// Initialize Firebase Admin SDK
admin.initializeApp()

// Export AI Trainer function
export { generateAIWorkout } from './ai-trainer/generateWorkout'

// Export AI Training Analysis function
export { generateTrainingAnalysis } from './ai-analysis/generateAnalysis'

// Export AI Program Generation function
export { generateAIProgram } from './ai-program/generateProgram'

// Export Welcome Email function
export { sendWelcomeEmail } from './email/sendWelcomeEmail'

// Export Trainer Approval Flow emails (Phase 1)
export {
  sendTrainerRequestEmail,
  sendTrainerRejectedEmail,
} from './email/trainerApproval'

// Export Trainer Approval Flow Cloud Function (atomic approval)
export { approveTrainerRequest } from './trainer-approval/approveRequest'

// Export Admin functions
export { updateUserEmail } from './admin/updateUserEmail'
