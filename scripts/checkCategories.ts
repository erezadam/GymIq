/**
 * Check what categories exist in Firebase vs dropdown options
 *
 * Usage: npx tsx scripts/checkCategories.ts
 */

import { collection, getDocs } from 'firebase/firestore'
import { db } from './firebase-config'

// Categories from mockExercises.ts
const dropdownCategories = ['chest', 'back', 'legs', 'shoulders', 'arms', 'core', 'cardio', 'functional', 'stretching']

// Primary muscles from mockExercises.ts
const dropdownMuscles = [
  'chest', 'lats', 'quadriceps', 'hamstrings', 'glutes', 'triceps', 'biceps',
  'shoulders', 'core', 'calves', 'traps', 'lower_back', 'forearms', 'rhomboids', 'middle_traps'
]

async function checkCategories() {
  const app = initializeApp(firebaseConfig)
  const db = getFirestore(app)

  const exercisesRef = collection(db, 'exercises')
  const snapshot = await getDocs(exercisesRef)

  const firebaseCategories = new Set<string>()
  const firebaseMuscles = new Set<string>()

  snapshot.docs.forEach(doc => {
    const data = doc.data()
    if (data.category) firebaseCategories.add(data.category)
    if (data.primaryMuscle) firebaseMuscles.add(data.primaryMuscle)
  })

  console.log('=== קטגוריות ===')
  console.log('ב-Firebase:', Array.from(firebaseCategories).sort())
  console.log('ב-Dropdown:', dropdownCategories.sort())

  const missingCategories = Array.from(firebaseCategories).filter(c => !dropdownCategories.includes(c))
  if (missingCategories.length > 0) {
    console.log('❌ קטגוריות ב-Firebase שלא ב-Dropdown:', missingCategories)
  } else {
    console.log('✅ כל הקטגוריות קיימות ב-Dropdown')
  }

  console.log('\n=== שרירים ===')
  console.log('ב-Firebase:', Array.from(firebaseMuscles).sort())
  console.log('ב-Dropdown:', dropdownMuscles.sort())

  const missingMuscles = Array.from(firebaseMuscles).filter(m => !dropdownMuscles.includes(m))
  if (missingMuscles.length > 0) {
    console.log('❌ שרירים ב-Firebase שלא ב-Dropdown:', missingMuscles)
  } else {
    console.log('✅ כל השרירים קיימים ב-Dropdown')
  }

  process.exit(0)
}

checkCategories().catch(error => {
  console.error('שגיאה:', error)
  process.exit(1)
})
