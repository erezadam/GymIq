/**
 * Check ID field in Firebase exercises
 *
 * Usage: npx tsx scripts/checkIdField.ts
 */

import { collection, getDocs, limit, query } from 'firebase/firestore'
import { db } from './firebase-config'

async function checkIdField() {

  const exercisesRef = collection(db, 'exercises')
  const q = query(exercisesRef, limit(10))
  const snapshot = await getDocs(q)

  console.log('Checking for id field inside documents:\n')

  snapshot.docs.forEach((doc, index) => {
    const data = doc.data()
    console.log(`=== Exercise ${index + 1} ===`)
    console.log(`doc.id (Firebase document ID): ${doc.id}`)
    console.log(`data.id (stored inside document): ${data.id}`)
    console.log(`name: ${data.name}`)
    console.log(`Match: ${doc.id === data.id ? '✅' : '❌ MISMATCH!'}`)
    console.log('')
  })

  process.exit(0)
}

checkIdField().catch(console.error)
