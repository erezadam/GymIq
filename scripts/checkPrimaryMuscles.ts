/**
 * Script to check primaryMuscle values in Firebase exercises
 * and find which ones are not mapped to Hebrew names
 *
 * Usage: npx tsx scripts/checkPrimaryMuscles.ts
 */

import { collection, getDocs } from 'firebase/firestore'
import { db } from './firebase-config'

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

async function checkPrimaryMuscles() {
  console.log('🔍 בודק ערכי primaryMuscle בתרגילים...\n')

  const app = initializeApp(firebaseConfig)
  const db = getFirestore(app)

  const exercisesRef = collection(db, 'exercises')
  const snapshot = await getDocs(exercisesRef)

  const muscleStats: Record<string, { count: number; exercises: { name: string; nameHe: string }[] }> = {}
  const unmappedMuscles: Record<string, { count: number; exercises: { name: string; nameHe: string }[] }> = {}

  for (const doc of snapshot.docs) {
    const data = doc.data()
    const primaryMuscle = data.primaryMuscle || 'unknown'

    // Track all muscles
    if (!muscleStats[primaryMuscle]) {
      muscleStats[primaryMuscle] = { count: 0, exercises: [] }
    }
    muscleStats[primaryMuscle].count++
    muscleStats[primaryMuscle].exercises.push({
      name: data.name,
      nameHe: data.nameHe
    })

    // Track unmapped muscles
    if (!muscleGroupNames[primaryMuscle]) {
      if (!unmappedMuscles[primaryMuscle]) {
        unmappedMuscles[primaryMuscle] = { count: 0, exercises: [] }
      }
      unmappedMuscles[primaryMuscle].count++
      unmappedMuscles[primaryMuscle].exercises.push({
        name: data.name,
        nameHe: data.nameHe
      })
    }
  }

  console.log('📊 כל ערכי primaryMuscle:')
  console.log('='.repeat(60))

  const sortedMuscles = Object.entries(muscleStats).sort((a, b) => b[1].count - a[1].count)
  for (const [muscle, data] of sortedMuscles) {
    const mapped = muscleGroupNames[muscle] ? `✅ → ${muscleGroupNames[muscle]}` : '❌ לא ממופה!'
    console.log(`  ${muscle}: ${data.count} תרגילים ${mapped}`)
  }

  console.log('\n')
  console.log('🚨 ערכים שלא ממופים לעברית:')
  console.log('='.repeat(60))

  if (Object.keys(unmappedMuscles).length === 0) {
    console.log('  ✅ כל הערכים ממופים!')
  } else {
    for (const [muscle, data] of Object.entries(unmappedMuscles)) {
      console.log(`\n  ❌ "${muscle}" (${data.count} תרגילים):`)
      for (const ex of data.exercises) {
        console.log(`     - ${ex.nameHe} (${ex.name})`)
      }
    }
  }

  console.log('\n')
  console.log('💡 המלצה: להוסיף את המיפויים החסרים ל-muscleGroupNames בקובץ design-tokens.ts')
}

checkPrimaryMuscles()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })
