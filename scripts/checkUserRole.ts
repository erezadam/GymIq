/**
 * Script to check user roles in Firestore
 * Run: npx tsx scripts/checkUserRole.ts
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

async function checkUsers() {
  console.log('Checking users in Firestore...\n')

  const app = initializeApp(firebaseConfig)
  const db = getFirestore(app)

  try {
    const usersRef = collection(db, 'users')
    const snapshot = await getDocs(usersRef)

    if (snapshot.empty) {
      console.log('No users found in Firestore!')
      process.exit(0)
    }

    console.log('Users found:\n')
    snapshot.forEach((doc) => {
      const data = doc.data()
      console.log(`Email: ${data.email}`)
      console.log(`Role: ${data.role}`)
      console.log(`UID: ${doc.id}`)
      console.log('---')
    })

    process.exit(0)
  } catch (error: any) {
    console.error('Error:', error.message)
    process.exit(1)
  }
}

checkUsers()
