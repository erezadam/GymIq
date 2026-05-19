/**
 * READ-ONLY: Inspect a single workoutHistory document by ID.
 *
 * Prints the document data as pretty JSON, or exits 1 if missing.
 *
 * Requires ADMIN_EMAIL / ADMIN_PASSWORD in .env.local — workoutHistory
 * rules require an authenticated admin to read other users' docs.
 *
 * Usage: npx tsx scripts/inspectWorkout.ts <docId>
 */
import { config } from 'dotenv'
config({ path: '.env.local' })

import { doc, getDoc } from 'firebase/firestore'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { db, auth } from './firebase-config'

async function main() {
  const docId = process.argv[2]
  if (!docId) {
    console.error('Usage: npx tsx scripts/inspectWorkout.ts <docId>')
    process.exit(1)
  }

  const adminEmail = process.env.ADMIN_EMAIL
  const adminPassword = process.env.ADMIN_PASSWORD
  if (!adminEmail || !adminPassword) {
    console.error('Missing ADMIN_EMAIL/ADMIN_PASSWORD in .env.local')
    process.exit(1)
  }
  await signInWithEmailAndPassword(auth, adminEmail, adminPassword)

  const snap = await getDoc(doc(db, 'workoutHistory', docId))
  if (!snap.exists()) {
    console.error(`Doc workoutHistory/${docId} not found`)
    process.exit(1)
  }

  console.log(JSON.stringify(snap.data(), null, 2))
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
