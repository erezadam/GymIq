/**
 * Debug script to check exercise data in Firebase
 */

import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, limit, query } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyALBuSomQPQhp1JZABeBRKwsLzmkOdg6yc',
  authDomain: 'gymiq-e8b4e.firebaseapp.com',
  projectId: 'gymiq-e8b4e',
  storageBucket: 'gymiq-e8b4e.firebasestorage.app',
  messagingSenderId: '406884457868',
  appId: '1:406884457868:web:d8de2397d14a1929b8caa9',
}

async function debugExercises() {
  const app = initializeApp(firebaseConfig)
  const db = getFirestore(app)

  console.log('מתחבר ל-Firebase...\n')

  const exercisesRef = collection(db, 'exercises')
  const q = query(exercisesRef, limit(5))
  const snapshot = await getDocs(q)

  console.log(`בודק ${snapshot.size} תרגילים ראשונים:\n`)

  snapshot.docs.forEach((doc, index) => {
    const data = doc.data()
    console.log(`=== תרגיל ${index + 1} ===`)
    console.log(`ID: ${doc.id}`)
    console.log(`name: "${data.name}" (type: ${typeof data.name})`)
    console.log(`nameHe: "${data.nameHe}" (type: ${typeof data.nameHe})`)
    console.log(`category: "${data.category}" (type: ${typeof data.category})`)
    console.log(`primaryMuscle: "${data.primaryMuscle}" (type: ${typeof data.primaryMuscle})`)
    console.log(`equipment: "${data.equipment}" (type: ${typeof data.equipment})`)
    console.log(`difficulty: "${data.difficulty}" (type: ${typeof data.difficulty})`)
    console.log(`imageUrl: "${data.imageUrl?.substring(0, 50)}..."`)
    console.log(`instructions: ${Array.isArray(data.instructions) ? data.instructions.length + ' items' : data.instructions}`)
    console.log(`tips: ${Array.isArray(data.tips) ? data.tips.length + ' items' : data.tips}`)
    console.log('')
  })

  process.exit(0)
}

debugExercises().catch(error => {
  console.error('שגיאה:', error)
  process.exit(1)
})
