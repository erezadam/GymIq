/**
 * Script to create a test admin user in Firestore
 * Run: npx tsx scripts/createTestUser.ts
 */

import { initializeApp } from 'firebase/app'
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth'

const firebaseConfig = {
  apiKey: 'AIzaSyALBuSomQPQhp1JZABeBRKwsLzmkOdg6yc',
  authDomain: 'gymiq-e8b4e.firebaseapp.com',
  projectId: 'gymiq-e8b4e',
  storageBucket: 'gymiq-e8b4e.firebasestorage.app',
  messagingSenderId: '406884457868',
  appId: '1:406884457868:web:d8de2397d14a1929b8caa9',
}

const TEST_USER = {
  email: 'admin@gymiq.app',
  password: 'Admin123!',
  firstName: 'מנהל',
  lastName: 'ראשי',
}

async function createTestUser() {
  console.log('🚀 Starting test user creation...')

  const app = initializeApp(firebaseConfig)
  const auth = getAuth(app)
  const db = getFirestore(app)

  try {
    // Create user in Firebase Auth
    console.log('📧 Creating Firebase Auth user...')
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      TEST_USER.email,
      TEST_USER.password
    )
    console.log('✅ Auth user created:', userCredential.user.uid)

    // Create user document in Firestore
    console.log('📝 Creating Firestore user document...')
    const userRef = doc(db, 'users', userCredential.user.uid)
    await setDoc(userRef, {
      uid: userCredential.user.uid,
      email: TEST_USER.email,
      firstName: TEST_USER.firstName,
      lastName: TEST_USER.lastName,
      displayName: `${TEST_USER.firstName} ${TEST_USER.lastName}`,
      role: 'admin', // First user is admin!
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    console.log('✅ Firestore document created!')

    console.log('\n========================================')
    console.log('✅ Test admin user created successfully!')
    console.log('========================================')
    console.log('📧 Email:', TEST_USER.email)
    console.log('🔒 Password:', TEST_USER.password)
    console.log('👤 Role: admin')
    console.log('========================================\n')

    process.exit(0)
  } catch (error: any) {
    console.error('❌ Error:', error.code, error.message)
    process.exit(1)
  }
}

createTestUser()
