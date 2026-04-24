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
  markReleaseNotesAsSeen,
} from './users'

// Release Notes ("What's New")
export {
  getPublishedReleaseNotes,
  getAllReleaseNotes,
  getDraftsCount,
  checkExistsByHash,
  createReleaseNote,
  updateReleaseNote,
  publishReleaseNote,
  archiveReleaseNote,
  deleteReleaseNote,
  getReleaseNoteById,
} from './releaseNotes'

// Equipment
export {
  getEquipment,
  saveEquipment,
  addEquipment,
  deleteEquipment,
  isEquipmentInUse,
  initializeEquipment,
  syncMissingEquipment,
  type Equipment,
} from './equipment'

// Muscles
export {
  getMuscles,
  saveMuscle,
  addPrimaryMuscle,
  deletePrimaryMuscle,
  initializeMuscles,
  syncMissingMuscles,
} from './muscles'
