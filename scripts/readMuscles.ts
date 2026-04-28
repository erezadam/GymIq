/**
 * Read current muscles collection from Firebase to see what sub-muscles exist
 * Usage: npx tsx scripts/readMuscles.ts
 */
import { db, auth } from './firebase-config'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { collection, getDocs } from 'firebase/firestore'
import { config } from 'dotenv'

config({ path: '.env.local' })

async function readMuscles() {
  const adminEmail = process.env.ADMIN_EMAIL
  const adminPassword = process.env.ADMIN_PASSWORD
  if (!adminEmail || !adminPassword) {
    console.error('Missing ADMIN_EMAIL or ADMIN_PASSWORD in .env.local')
    process.exit(1)
  }

  await signInWithEmailAndPassword(auth, adminEmail, adminPassword)

  const snapshot = await getDocs(collection(db, 'muscles'))
  console.log(`Found ${snapshot.size} muscle groups:\n`)

  for (const doc of snapshot.docs) {
    const data = doc.data()
    console.log(`${data.nameHe} (${doc.id}):`)
    if (data.subMuscles && data.subMuscles.length > 0) {
      for (const sub of data.subMuscles) {
        console.log(`  - ${sub.nameHe} (${sub.id})`)
      }
    } else {
      console.log('  (no sub-muscles)')
    }
    console.log()
  }
}

readMuscles().catch(console.error)
