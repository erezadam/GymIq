/**
 * Script to list all exercise IDs
 *
 * Usage: npx tsx scripts/listAllExerciseIds.ts
 */

import { collection, getDocs } from 'firebase/firestore'
import { db } from './firebase-config'

async function listAllIds() {

  const exercisesRef = collection(db, 'exercises')
  const snapshot = await getDocs(exercisesRef)

  console.log(`Total exercises in Firebase: ${snapshot.size}\n`)

  // Check for numeric IDs vs proper IDs
  let numericIds = 0
  let properIds = 0

  snapshot.docs.forEach((doc, index) => {
    const id = doc.id
    const isNumeric = /^\d+$/.test(id)

    if (isNumeric) {
      numericIds++
      console.log(`❌ NUMERIC ID: ${id} - ${doc.data().name}`)
    } else {
      properIds++
    }
  })

  console.log(`\n=== סיכום ===`)
  console.log(`IDs תקינים: ${properIds}`)
  console.log(`IDs מספריים (בעייתיים): ${numericIds}`)

  process.exit(0)
}

listAllIds().catch(console.error)
