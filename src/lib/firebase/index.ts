// Firebase configuration
export { app, auth, db, storage } from './config'

// Authentication
export {
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUser,
  onAuthChange,
  resetPassword,
  updateUserProfile,
  type AppUser,
} from './auth'

// Exercises
export {
  getExercises,
  getExerciseById,
  createExercise,
  updateExercise,
  deleteExercise,
  bulkImportExercises,
  getExercisesCount,
} from './exercises'

// Workouts
export {
  startWorkoutSession,
  updateWorkoutSession,
  completeWorkoutSession,
  cancelWorkoutSession,
  getActiveSession,
  getWorkoutSession,
  getWorkoutHistory,
  getWorkoutHistoryDetail,
  getWorkoutTemplates,
  createWorkoutTemplate,
  deleteWorkoutTemplate,
  getUserWorkoutStats,
} from './workouts'

// Users (admin)
export {
  getAllUsers,
  updateUserRole,
  deleteUserFromFirestore,
  getUserStats,
} from './users'
