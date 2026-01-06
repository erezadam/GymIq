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

async function listAllIds() {
  const app = initializeApp(firebaseConfig)
  const db = getFirestore(app)

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
