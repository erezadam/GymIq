/**
 * Script to check user roles in Firestore
 * Run: npx tsx scripts/checkUserRole.ts
 */

import { collection, getDocs } from 'firebase/firestore'
import { db } from './firebase-config'

async function checkUsers() {
  console.log('Checking users in Firestore...\n')

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
