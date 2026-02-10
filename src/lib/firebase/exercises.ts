import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore'
import { db } from './config'
import type { Exercise, ExerciseFilters, CreateExerciseDto } from '@/domains/exercises/types'

const COLLECTION = 'exercises'

// Get all exercises with optional filtering
export const getExercises = async (filters?: ExerciseFilters): Promise<Exercise[]> => {
  let q = query(collection(db, COLLECTION), orderBy('name'))

  // Note: Firestore has limitations on compound queries
  // For complex filtering, we filter client-side after fetching
  const snapshot = await getDocs(q)
  let exercises = snapshot.docs.map((doc) => {
    const data = doc.data()
    // Use doc.id (Firebase document ID), not any stored id field
    return {
      ...data,
      id: doc.id,
    } as Exercise
  })

  // Client-side filtering for additional filters
  if (filters) {
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      exercises = exercises.filter(
        (ex) =>
          ex.name.toLowerCase().includes(searchLower) ||
          ex.nameHe.includes(filters.search!)
      )
    }

    // Category filter - matches category OR primaryMuscle
    // This allows filtering by muscle ID from the dynamic Firebase filter
    if (filters.category) {
      exercises = exercises.filter(
        (ex) =>
          ex.category === filters.category ||
          ex.primaryMuscle === filters.category
      )
    }

    if (filters.difficulty) {
      exercises = exercises.filter((ex) => ex.difficulty === filters.difficulty)
    }

    if (filters.equipment) {
      exercises = exercises.filter((ex) => ex.equipment === filters.equipment)
    }

    if (filters.muscle) {
      exercises = exercises.filter(
        (ex) =>
          ex.primaryMuscle === filters.muscle ||
          (ex.secondaryMuscles as string[]).includes(filters.muscle!)
      )
    }
  }

  return exercises
}

// Get single exercise by ID
export const getExerciseById = async (id: string): Promise<Exercise | null> => {
  const docRef = doc(db, COLLECTION, id)
  const docSnap = await getDoc(docRef)

  if (!docSnap.exists()) return null

  const data = docSnap.data()
  // Use docSnap.id (Firebase document ID), not any stored id field
  return {
    ...data,
    id: docSnap.id,
  } as Exercise
}

// Create new exercise
export const createExercise = async (data: CreateExerciseDto): Promise<Exercise> => {
  const docRef = await addDoc(collection(db, COLLECTION), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  return {
    id: docRef.id,
    ...data,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

// Update exercise
export const updateExercise = async (
  id: string,
  data: Partial<CreateExerciseDto>
): Promise<void> => {
  const docRef = doc(db, COLLECTION, id)
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

// Delete exercise
export const deleteExercise = async (id: string): Promise<void> => {
  const docRef = doc(db, COLLECTION, id)
  await deleteDoc(docRef)
}

// Bulk import exercises (for initial data setup)
export const bulkImportExercises = async (
  exercises: CreateExerciseDto[]
): Promise<{ success: number; failed: number }> => {
  const batch = writeBatch(db)
  let success = 0
  let failed = 0

  for (const exercise of exercises) {
    try {
      const docRef = doc(collection(db, COLLECTION))
      batch.set(docRef, {
        ...exercise,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      success++
    } catch {
      failed++
    }
  }

  await batch.commit()
  return { success, failed }
}

// Get exercises count
export const getExercisesCount = async (): Promise<number> => {
  const snapshot = await getDocs(collection(db, COLLECTION))
  return snapshot.size
}

// Delete all exercises
export const deleteAllExercises = async (): Promise<number> => {
  const snapshot = await getDocs(collection(db, COLLECTION))
  const batch = writeBatch(db)

  snapshot.docs.forEach((docSnapshot) => {
    batch.delete(docSnapshot.ref)
  })

  await batch.commit()
  return snapshot.size
}

// Valid categories for exercises
export const VALID_EXERCISE_CATEGORIES = [
  'chest', 'back', 'legs', 'shoulders', 'arms', 'core',
  'cardio', 'functional', 'stretching', 'warmup', 'glutes', 'gluteus_maximus'
] as const

// Valid primary categories for exercises (main muscle groups only)
// IMPORTANT: These are the ONLY valid values for the 'category' field
export const VALID_EXERCISE_CATEGORIES_SET = new Set([
  'legs', 'chest', 'back', 'shoulders', 'arms', 'core', 'cardio', 'warmup', 'functional', 'stretching',
  'glutes', 'gluteus_maximus' // Support both IDs for glutes
])

// Alias for backward compatibility
export const VALID_PRIMARY_MUSCLES = VALID_EXERCISE_CATEGORIES_SET

// Mapping from specific muscles to parent muscle groups
const MUSCLE_TO_PARENT_MAPPING: Record<string, string> = {
  // Legs
  'quadriceps': 'legs',
  'hamstrings': 'legs',
  'quads': 'legs',
  'calves': 'legs',
  'gastrocnemius': 'legs',
  'gastrocnemius_soleus': 'legs',
  'adductors': 'legs',
  'abductors': 'legs',
  'hip_flexors': 'legs',
  // Back
  'lats': 'back',
  'latissimus_dorsi': 'back',
  'trapezius': 'back',
  'traps': 'back',
  'rhomboids': 'back',
  'erector_spinae': 'back',
  'longissimus': 'back',
  'lower_back': 'back',
  'upper_back': 'back',
  'mid_back': 'back',
  // Arms
  'biceps': 'arms',
  'biceps_brachii': 'arms',
  'triceps': 'arms',
  'triceps_brachii': 'arms',
  'forearms': 'arms',
  'brachialis': 'arms',
  // Shoulders
  'deltoids': 'shoulders',
  'front_delt': 'shoulders',
  'side_delt': 'shoulders',
  'rear_delt': 'shoulders',
  'anterior_deltoid': 'shoulders',
  'lateral_deltoid': 'shoulders',
  'posterior_deltoid': 'shoulders',
  'rotator_cuff': 'shoulders',
  // Core
  'abs': 'core',
  'lower_abs': 'core',
  'upper_abs': 'core',
  'obliques': 'core',
  'transverse_abdominis': 'core',
  'rectus_abdominis': 'core',
  // Chest
  'pectoralis': 'chest',
  'pectoralis_major': 'chest',
  'upper_chest': 'chest',
  'lower_chest': 'chest',
  'middle_chest': 'chest',
  'mid_chest': 'chest',
  // Cardio - Hebrew variations
  'חימום': 'cardio',
  'אירובי': 'cardio',
  'aerobic': 'cardio',
  'warmup': 'cardio',
}

// Fix exercises with invalid categories
// Returns list of fixed exercises
export const fixInvalidCategories = async (): Promise<{ id: string; nameHe: string; oldCategory: string; newCategory: string }[]> => {
  const categoryFixes: Record<string, { id: string; newCategory: string }[]> = {
    // abcsde exercises - cardio machines
    cardio: [
      { id: "Hfa5YoHu9j88evuBE5XW", newCategory: "cardio" }, // אופניים נייחים
      { id: "KaC7gbGCPEEtlppiWK2K", newCategory: "cardio" }, // הליכון
      { id: "R29ea1XKRxWmlqaryCAM", newCategory: "cardio" }, // מדרגות
      { id: "arf3iUkOzGWGNvnUVWH4", newCategory: "cardio" }, // מכשיר-אליפטי
      { id: "b1EqSp0s3yqv8bpI2Pnn", newCategory: "cardio" }, // סטפר
      { id: "fuTYUAneJPnZ6ULTLucn", newCategory: "cardio" }, // חתירה
    ],
    warmup: [
      { id: "zYBjjjzKoo4C57seLZ8f", newCategory: "warmup" }, // חימום
    ],
    back: [
      { id: "UlFsp2JWjSaJXqxH50Np", newCategory: "back" }, // פשיטת גו מלאה
    ],
    legs: [
      { id: "ZnmjmlIkyyIAskc1Qczo", newCategory: "legs" }, // היפטראסט
    ],
  }

  const allFixes = Object.values(categoryFixes).flat()
  const results: { id: string; nameHe: string; oldCategory: string; newCategory: string }[] = []
  const batch = writeBatch(db)

  for (const fix of allFixes) {
    const docRef = doc(db, COLLECTION, fix.id)
    const docSnap = await getDoc(docRef)

    if (docSnap.exists()) {
      const data = docSnap.data()
      batch.update(docRef, { category: fix.newCategory })
      results.push({
        id: fix.id,
        nameHe: data.nameHe || data.name,
        oldCategory: data.category || '(empty)',
        newCategory: fix.newCategory,
      })
    }
  }

  await batch.commit()
  return results
}

// Count exercises with invalid primaryMuscle
export const countInvalidPrimaryMuscles = async (): Promise<number> => {
  const snapshot = await getDocs(collection(db, COLLECTION))
  let count = 0
  snapshot.docs.forEach((docSnapshot) => {
    const data = docSnapshot.data()
    const primaryMuscle = data.primaryMuscle
    if (!primaryMuscle || !VALID_PRIMARY_MUSCLES.has(primaryMuscle)) {
      // Check if we have a mapping for this muscle
      if (primaryMuscle && MUSCLE_TO_PARENT_MAPPING[primaryMuscle]) {
        count++
      }
    }
  })
  return count
}

// Fix exercises with invalid primaryMuscle values
// Maps specific muscles to their parent muscle groups
export const fixInvalidPrimaryMuscles = async (): Promise<{ id: string; nameHe: string; oldMuscle: string; newMuscle: string }[]> => {
  const snapshot = await getDocs(collection(db, COLLECTION))
  const results: { id: string; nameHe: string; oldMuscle: string; newMuscle: string }[] = []
  const batch = writeBatch(db)

  snapshot.docs.forEach((docSnapshot) => {
    const data = docSnapshot.data()
    const primaryMuscle = data.primaryMuscle

    // Skip if already valid
    if (VALID_PRIMARY_MUSCLES.has(primaryMuscle)) {
      return
    }

    // Check if we have a mapping for this muscle
    const newMuscle = MUSCLE_TO_PARENT_MAPPING[primaryMuscle]
    if (newMuscle) {
      const docRef = doc(db, COLLECTION, docSnapshot.id)
      batch.update(docRef, { primaryMuscle: newMuscle })
      results.push({
        id: docSnapshot.id,
        nameHe: data.nameHe || data.name,
        oldMuscle: primaryMuscle,
        newMuscle: newMuscle,
      })
    }
  })

  if (results.length > 0) {
    await batch.commit()
  }
  return results
}

// Mapping from sub-muscles to their parent category
// Exported for use in ExerciseForm when loading exercises with invalid categories
export const SUB_MUSCLE_TO_CATEGORY: Record<string, string> = {
  // Glutes sub-muscles (glutes is now a primary category)
  'gluteus_maximus': 'glutes',
  'gluteus_medius': 'glutes',
  'gluteus_minimus': 'glutes',
  // Legs sub-muscles
  'quads': 'legs',
  'quadriceps': 'legs',
  'hamstrings': 'legs',
  'calves': 'legs',
  'adductors': 'legs',
  'abductors': 'legs',
  'hip_flexors': 'legs',
  // Back sub-muscles
  'lats': 'back',
  'latissimus_dorsi': 'back',
  'upper_back': 'back',
  'lower_back': 'back',
  'traps': 'back',
  'trapezius': 'back',
  'rhomboids': 'back',
  'erector_spinae': 'back',
  'longissimus': 'back',
  // Chest sub-muscles
  'upper_chest': 'chest',
  'mid_chest': 'chest',
  'lower_chest': 'chest',
  // Arms sub-muscles
  'biceps': 'arms',
  'triceps': 'arms',
  'forearms': 'arms',
  // Shoulders sub-muscles
  'front_delt': 'shoulders',
  'side_delt': 'shoulders',
  'rear_delt': 'shoulders',
  // Core sub-muscles
  'abs': 'core',
  'obliques': 'core',
  'lower_abs': 'core',
}

// Find exercises with invalid category (sub-muscle used as category)
export const findExercisesWithInvalidCategory = async (): Promise<{
  id: string
  name: string
  nameHe: string
  currentCategory: string
  suggestedCategory: string
}[]> => {
  const snapshot = await getDocs(collection(db, COLLECTION))
  const results: {
    id: string
    name: string
    nameHe: string
    currentCategory: string
    suggestedCategory: string
  }[] = []

  snapshot.docs.forEach((docSnapshot) => {
    const data = docSnapshot.data()
    const category = data.category

    // Skip if category is valid
    if (VALID_EXERCISE_CATEGORIES_SET.has(category)) {
      return
    }

    // Check if category is actually a sub-muscle
    const suggestedCategory = SUB_MUSCLE_TO_CATEGORY[category]
    if (suggestedCategory) {
      results.push({
        id: docSnapshot.id,
        name: data.name || '',
        nameHe: data.nameHe || '',
        currentCategory: category,
        suggestedCategory,
      })
    } else if (category) {
      // Unknown category - suggest based on primaryMuscle if available
      const primaryMuscle = data.primaryMuscle
      const parentFromPrimary = SUB_MUSCLE_TO_CATEGORY[primaryMuscle] || primaryMuscle
      if (VALID_EXERCISE_CATEGORIES_SET.has(parentFromPrimary)) {
        results.push({
          id: docSnapshot.id,
          name: data.name || '',
          nameHe: data.nameHe || '',
          currentCategory: category,
          suggestedCategory: parentFromPrimary,
        })
      }
    }
  })

  return results
}

// Fix all exercises with invalid categories
export const fixExercisesWithInvalidCategory = async (): Promise<{
  fixed: { id: string; nameHe: string; oldCategory: string; newCategory: string }[]
  failed: { id: string; nameHe: string; category: string; reason: string }[]
}> => {
  const invalidExercises = await findExercisesWithInvalidCategory()
  const fixed: { id: string; nameHe: string; oldCategory: string; newCategory: string }[] = []
  const failed: { id: string; nameHe: string; category: string; reason: string }[] = []

  if (invalidExercises.length === 0) {
    return { fixed, failed }
  }

  const batch = writeBatch(db)

  for (const exercise of invalidExercises) {
    if (exercise.suggestedCategory) {
      const docRef = doc(db, COLLECTION, exercise.id)
      batch.update(docRef, { category: exercise.suggestedCategory })
      fixed.push({
        id: exercise.id,
        nameHe: exercise.nameHe,
        oldCategory: exercise.currentCategory,
        newCategory: exercise.suggestedCategory,
      })
    } else {
      failed.push({
        id: exercise.id,
        nameHe: exercise.nameHe,
        category: exercise.currentCategory,
        reason: 'לא נמצאה קטגוריה מתאימה',
      })
    }
  }

  if (fixed.length > 0) {
    await batch.commit()
  }

  return { fixed, failed }
}

// Fix a single exercise's category by ID
export const fixExerciseCategory = async (
  exerciseId: string,
  newCategory: string
): Promise<void> => {
  if (!VALID_EXERCISE_CATEGORIES_SET.has(newCategory)) {
    throw new Error(`קטגוריה לא תקינה: ${newCategory}. קטגוריות תקינות: ${Array.from(VALID_EXERCISE_CATEGORIES_SET).join(', ')}`)
  }

  const docRef = doc(db, COLLECTION, exerciseId)
  await updateDoc(docRef, { category: newCategory })
}

// Auto-fix exercises whose name contains a known equipment keyword but have wrong equipment ID
// Returns IDs of fixed exercises (empty array if nothing to fix)
export const autoFixEquipmentMismatch = async (
  exercises: Exercise[]
): Promise<string[]> => {
  // Map: keyword in nameHe → correct equipment ID
  const EQUIPMENT_NAME_RULES: { keyword: string; equipmentId: string }[] = [
    { keyword: 'סמיט', equipmentId: 'smit_machine' },
    { keyword: 'סמית', equipmentId: 'smit_machine' },
  ]

  const toFix: { id: string; newEquipment: string }[] = []

  for (const ex of exercises) {
    const nameHe = ex.nameHe || ''
    for (const rule of EQUIPMENT_NAME_RULES) {
      if (nameHe.includes(rule.keyword) && ex.equipment !== rule.equipmentId) {
        toFix.push({ id: ex.id, newEquipment: rule.equipmentId })
        break
      }
    }
  }

  if (toFix.length === 0) return []

  const batch = writeBatch(db)
  for (const fix of toFix) {
    batch.update(doc(db, COLLECTION, fix.id), { equipment: fix.newEquipment })
  }
  await batch.commit()
  return toFix.map((f) => f.id)
}

// Batch update equipment for exercises matching a name pattern
export const batchUpdateEquipment = async (
  namePattern: string,
  oldEquipment: string,
  newEquipment: string
): Promise<{ updated: string[]; skipped: string[] }> => {
  const snapshot = await getDocs(
    query(collection(db, COLLECTION), where('equipment', '==', oldEquipment))
  )

  const patternLower = namePattern.toLowerCase()
  const updated: string[] = []
  const skipped: string[] = []
  const batch = writeBatch(db)

  snapshot.docs.forEach((docSnapshot) => {
    const data = docSnapshot.data()
    const name = (data.name || '').toLowerCase()
    const nameHe = data.nameHe || ''
    if (name.includes(patternLower) || nameHe.includes(namePattern)) {
      batch.update(doc(db, COLLECTION, docSnapshot.id), { equipment: newEquipment })
      updated.push(nameHe || data.name)
    } else {
      skipped.push(nameHe || data.name)
    }
  })

  if (updated.length > 0) {
    await batch.commit()
  }
  return { updated, skipped }
}
