import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyALBuSomQPQhp1JZABeBRKwsLzmkOdg6yc',
  authDomain: 'gymiq-e8b4e.firebaseapp.com',
  projectId: 'gymiq-e8b4e',
  storageBucket: 'gymiq-e8b4e.firebasestorage.app',
  messagingSenderId: '406884457868',
  appId: '1:406884457868:web:d8de2397d14a1929b8caa9',
}

async function findBenchPress() {
  const app = initializeApp(firebaseConfig)
  const db = getFirestore(app)

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
