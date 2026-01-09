/**
 * Script to compare exercise structure between problematic and working exercises
 * Investigates why some exercises show English muscle names instead of Hebrew
 */

import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyALBuSomQPQhp1JZABeBRKwsLzmkOdg6yc',
  authDomain: 'gymiq-e8b4e.firebaseapp.com',
  projectId: 'gymiq-e8b4e',
  storageBucket: 'gymiq-e8b4e.firebasestorage.app',
  messagingSenderId: '406884457868',
  appId: '1:406884457868:web:d8de2397d14a1929b8caa9',
}

// The muscleGroupNames from design-tokens.ts
const muscleGroupNames: Record<string, string> = {
  chest: 'חזה',
  back: 'גב',
  lats: 'גב',
  shoulders: 'כתפיים',
  biceps: 'זרועות',
  triceps: 'זרועות',
  arms: 'זרועות',
  legs: 'רגליים',
  quadriceps: 'רגליים',
  hamstrings: 'רגליים',
  glutes: 'ישבן',
  calves: 'שוקיים',
  core: 'בטן',
  abs: 'בטן',
  traps: 'טרפז',
  forearms: 'אמות',
  lower_back: 'גב תחתון',
  rhomboids: 'גב עליון',
  middle_traps: 'טרפז אמצעי',
  other: 'אחר',
}

// Problematic muscles (unmapped)
const problematicMuscles = [
  'erector_spinae',
  'rotator_cuff',
  'trapezius',
  'triceps_brachii',
  'side_delt',
  'gastrocnemius_soleus',
  'latissimus_dorsi',
  'adductors',
  'biceps_brachii',
  'lower_abs',
]

async function compareExercises() {
  console.log('🔍 משווה מבנה תרגילים בעייתיים לתקינים...\n')

  const app = initializeApp(firebaseConfig)
  const db = getFirestore(app)

  const exercisesRef = collection(db, 'exercises')
  const snapshot = await getDocs(exercisesRef)

  const problematicExercises: any[] = []
  const workingExercises: any[] = []

  for (const doc of snapshot.docs) {
    const data = doc.data()
    const primaryMuscle = data.primaryMuscle || 'unknown'

    if (problematicMuscles.includes(primaryMuscle)) {
      problematicExercises.push({ id: doc.id, ...data })
    } else if (muscleGroupNames[primaryMuscle]) {
      // Only take first 3 working examples per muscle group
      const existing = workingExercises.filter((e) => e.primaryMuscle === primaryMuscle)
      if (existing.length < 2) {
        workingExercises.push({ id: doc.id, ...data })
      }
    }
  }

  // Show problematic exercises with full structure
  console.log('=' .repeat(80))
  console.log('❌ תרגילים בעייתיים (primaryMuscle לא ממופה):')
  console.log('=' .repeat(80))

  for (const ex of problematicExercises) {
    console.log(`\n📛 ${ex.nameHe} (${ex.name})`)
    console.log('-'.repeat(60))
    console.log(`  id:            ${ex.id}`)
    console.log(`  category:      ${ex.category ?? '❌ חסר!'}`)
    console.log(`  subCategory:   ${ex.subCategory ?? '❌ חסר!'}`)
    console.log(`  primaryMuscle: ${ex.primaryMuscle ?? '❌ חסר!'}`)
    console.log(`  muscleGroup:   ${ex.muscleGroup ?? '❌ חסר!'}`)
    console.log(`  subMuscles:    ${JSON.stringify(ex.subMuscles) ?? '❌ חסר!'}`)
  }

  // Show working exercises for comparison
  console.log('\n\n')
  console.log('=' .repeat(80))
  console.log('✅ תרגילים תקינים (primaryMuscle ממופה):')
  console.log('=' .repeat(80))

  // Group by primaryMuscle for cleaner output
  const byMuscle: Record<string, any[]> = {}
  for (const ex of workingExercises) {
    if (!byMuscle[ex.primaryMuscle]) {
      byMuscle[ex.primaryMuscle] = []
    }
    byMuscle[ex.primaryMuscle].push(ex)
  }

  for (const [muscle, exercises] of Object.entries(byMuscle).slice(0, 5)) {
    console.log(`\n🏷️  ${muscle} → ${muscleGroupNames[muscle]}`)
    for (const ex of exercises.slice(0, 2)) {
      console.log(`\n  📗 ${ex.nameHe} (${ex.name})`)
      console.log('  ' + '-'.repeat(56))
      console.log(`    id:            ${ex.id}`)
      console.log(`    category:      ${ex.category ?? '❌ חסר!'}`)
      console.log(`    subCategory:   ${ex.subCategory ?? '❌ חסר!'}`)
      console.log(`    primaryMuscle: ${ex.primaryMuscle ?? '❌ חסר!'}`)
      console.log(`    muscleGroup:   ${ex.muscleGroup ?? '❌ חסר!'}`)
      console.log(`    subMuscles:    ${JSON.stringify(ex.subMuscles) ?? '❌ חסר!'}`)
    }
  }

  // Analysis
  console.log('\n\n')
  console.log('=' .repeat(80))
  console.log('📊 ניתוח:')
  console.log('=' .repeat(80))

  // Check if problematic exercises have category field
  const problematicWithCategory = problematicExercises.filter((e) => e.category)
  const problematicWithoutCategory = problematicExercises.filter((e) => !e.category)

  console.log(`\nתרגילים בעייתיים עם category: ${problematicWithCategory.length}`)
  console.log(`תרגילים בעייתיים בלי category: ${problematicWithoutCategory.length}`)

  if (problematicWithCategory.length > 0) {
    console.log('\nערכי category בתרגילים בעייתיים:')
    for (const ex of problematicWithCategory) {
      console.log(`  - ${ex.nameHe}: category="${ex.category}"`)
    }
  }

  // Check what fields differ
  console.log('\n\n📋 סיכום ההבדלים:')
  console.log('-'.repeat(60))

  const allProblematicCategories = [...new Set(problematicExercises.map((e) => e.category).filter(Boolean))]
  const allWorkingCategories = [...new Set(workingExercises.map((e) => e.category).filter(Boolean))]

  console.log(`\nערכי category בתרגילים בעייתיים: ${JSON.stringify(allProblematicCategories)}`)
  console.log(`ערכי category בתרגילים תקינים: ${JSON.stringify(allWorkingCategories)}`)

  const allProblematicPrimaryMuscles = [...new Set(problematicExercises.map((e) => e.primaryMuscle))]
  const allWorkingPrimaryMuscles = [...new Set(workingExercises.map((e) => e.primaryMuscle))]

  console.log(`\nערכי primaryMuscle בתרגילים בעייתיים: ${JSON.stringify(allProblematicPrimaryMuscles)}`)
  console.log(`ערכי primaryMuscle בתרגילים תקינים (דוגמאות): ${JSON.stringify(allWorkingPrimaryMuscles.slice(0, 10))}`)
}

compareExercises()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })
