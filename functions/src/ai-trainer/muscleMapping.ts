/**
 * Maps sub-muscle IDs to their parent Firestore muscle document ID.
 * Pure data module — imported by generateWorkout.ts (runtime filter) and by
 * scripts/validate-exercise-muscles.ts (data validation). Keep it dependency-free.
 */
export const SUB_MUSCLE_TO_PARENT: Record<string, string> = {
  // Glutes → gluteus_maximus (Firestore muscle ID)
  'glutes': 'gluteus_maximus',
  'gluteus_medius': 'gluteus_maximus',
  'gluteus_minimus': 'gluteus_maximus',
  // Legs
  'quads': 'legs', 'quadriceps': 'legs', 'hamstrings': 'legs', 'calves': 'legs',
  'adductors': 'legs', 'abductors': 'legs', 'hip_flexors': 'legs',
  'adductor': 'legs', 'abductor': 'legs',
  'gastrocnemius': 'legs', 'gastrocnemius_soleus': 'legs',
  // Back
  'lats': 'back', 'latissimus_dorsi': 'back', 'upper_back': 'back',
  'lower_back': 'back', 'mid_back': 'back',
  'traps': 'back', 'trapezius': 'back', 'rhomboids': 'back',
  'erector_spinae': 'back', 'longissimus': 'back',
  // Chest
  'upper_chest': 'chest', 'mid_chest': 'chest', 'lower_chest': 'chest',
  'pectoralis': 'chest', 'pectoralis_major': 'chest', 'middle_chest': 'chest',
  // Arms
  'biceps': 'biceps_brachii', 'forearms': 'biceps_brachii', 'brachialis': 'biceps_brachii',
  'triceps_brachii': 'triceps',
  // Shoulders
  'front_delt': 'shoulders', 'side_delt': 'shoulders', 'rear_delt': 'shoulders',
  'deltoids': 'shoulders', 'anterior_deltoid': 'shoulders',
  'lateral_deltoid': 'shoulders', 'posterior_deltoid': 'shoulders',
  'rotator_cuff': 'shoulders',
  // Core
  'abs': 'core', 'obliques': 'core', 'lower_abs': 'core',
  'upper_abs': 'core', 'transverse_abdominis': 'core', 'rectus_abdominis': 'core',
}
