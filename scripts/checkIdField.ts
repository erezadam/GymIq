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

async function checkIdField() {
  const app = initializeApp(firebaseConfig)
  const db = getFirestore(app)

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
