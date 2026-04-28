/**
 * One-time migration: backfill trainerId=null for existing user-role docs
 * that don't have the field at all.
 *
 * Rationale: Firestore's `where('trainerId', '==', null)` only matches docs
 * where the field is explicitly null. Docs missing the field are invisible
 * to the "unassigned trainees" query used by the trainer directory flow.
 *
 * Usage: npx tsx scripts/backfillTrainerIdNull.ts
 * Requires ADMIN_EMAIL / ADMIN_PASSWORD in .env.local
 */

import { db, auth } from './firebase-config'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { collection, getDocs, query, where, writeBatch, doc } from 'firebase/firestore'
import { config } from 'dotenv'

config({ path: '.env.local' })

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL
  const adminPassword = process.env.ADMIN_PASSWORD
  if (!adminEmail || !adminPassword) {
    console.error('❌ Missing ADMIN_EMAIL or ADMIN_PASSWORD in .env.local')
    process.exit(1)
  }

  console.log(`🔐 Authenticating as ${adminEmail}...`)
  await signInWithEmailAndPassword(auth, adminEmail, adminPassword)
  console.log('   Authenticated.')

  console.log('🔍 Scanning users with role="user"...')
  const snapshot = await getDocs(query(collection(db, 'users'), where('role', '==', 'user')))
  console.log(`   Found ${snapshot.size} user-role docs`)

  const needsBackfill = snapshot.docs.filter(d => !('trainerId' in d.data()))
  console.log(`   ${needsBackfill.length} missing the trainerId field`)

  if (needsBackfill.length === 0) {
    console.log('✅ Nothing to backfill.')
    return
  }

  // Firestore batch limit is 500 ops per batch
  const CHUNK = 400
  let updated = 0
  for (let i = 0; i < needsBackfill.length; i += CHUNK) {
    const batch = writeBatch(db)
    const chunk = needsBackfill.slice(i, i + CHUNK)
    for (const userDoc of chunk) {
      batch.update(doc(db, 'users', userDoc.id), { trainerId: null })
    }
    await batch.commit()
    updated += chunk.length
    console.log(`   ✔ committed ${updated}/${needsBackfill.length}`)
  }

  console.log(`✅ Backfill complete: ${updated} docs updated.`)
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Backfill failed:', err)
    process.exit(1)
  })
