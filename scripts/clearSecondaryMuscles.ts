/**
 * Clear secondaryMuscles field for ALL exercises in Firestore
 * Sets secondaryMuscles to an empty array [] for every exercise document
 *
 * Usage: npx tsx scripts/clearSecondaryMuscles.ts
 */

import { db, auth } from './firebase-config'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore'
import { config } from 'dotenv'

// Load .env.local for admin credentials
config({ path: '.env.local' })

const COLLECTION = 'exercises'

async function clearSecondaryMuscles() {
  // Authenticate as admin
  const adminEmail = process.env.ADMIN_EMAIL
  const adminPassword = process.env.ADMIN_PASSWORD

  if (!adminEmail || !adminPassword) {
    console.error('Missing ADMIN_EMAIL or ADMIN_PASSWORD in .env.local')
    process.exit(1)
  }

  console.log(`Authenticating as admin: ${adminEmail}`)
  await signInWithEmailAndPassword(auth, adminEmail, adminPassword)
  console.log('Authenticated!\n')

  console.log('Fetching all exercises...')
  const snapshot = await getDocs(collection(db, COLLECTION))
  console.log(`Found ${snapshot.size} exercises`)

  let updated = 0
  let skipped = 0
  const batch = writeBatch(db)

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data()
    const current = data.secondaryMuscles

    if (Array.isArray(current) && current.length > 0) {
      batch.update(doc(db, COLLECTION, docSnap.id), { secondaryMuscles: [] })
      console.log(`  ✏️  ${data.name || docSnap.id}: [${current.join(', ')}] → []`)
      updated++
    } else {
      skipped++
    }
  }

  if (updated === 0) {
    console.log('\n✅ No exercises had secondaryMuscles — nothing to update.')
    return
  }

  console.log(`\nCommitting batch: ${updated} to clear, ${skipped} already empty...`)
  await batch.commit()
  console.log(`✅ Done! Cleared secondaryMuscles for ${updated} exercises.`)
}

clearSecondaryMuscles().catch((err) => {
  console.error('❌ Error:', err)
  process.exit(1)
})
