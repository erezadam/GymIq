/**
 * Script to find bench press exercises
 *
 * Usage: npx tsx scripts/findBenchPress.ts
 */

import { collection, getDocs } from 'firebase/firestore'
import { db } from './firebase-config'

async function findBenchPress() {

  const exercisesRef = collection(db, 'exercises')
  const snapshot = await getDocs(exercisesRef)

  // Find exercises with "Bench" in name
  const benchExercises = snapshot.docs.filter(doc => {
    const data = doc.data()
    return data.name?.toLowerCase().includes('bench') || data.nameHe?.includes('לחיצת חזה')
  })

  console.log(`נמצאו ${benchExercises.length} תרגילים עם "Bench" או "לחיצת חזה":\n`)

  benchExercises.forEach((doc, i) => {
    const data = doc.data()
    console.log(`=== תרגיל ${i + 1} ===`)
    console.log(`ID: ${doc.id}`)
    console.log(`name: "${data.name}"`)
    console.log(`nameHe: "${data.nameHe}"`)
    console.log(`category: "${data.category}"`)
    console.log(`primaryMuscle: "${data.primaryMuscle}"`)
    console.log(`equipment: "${data.equipment}"`)
    console.log('')
  })

  process.exit(0)
}

findBenchPress().catch(console.error)
