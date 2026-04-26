/**
 * READ-ONLY: Investigate why zehava@assa-adam.com appears to have no trainer
 * in the analytics dashboard.
 *
 * Checks:
 * 1. Does the user document exist?
 * 2. What's in `trainerId`?
 * 3. If trainerId is set — does the trainer doc exist? What role?
 * 4. Is there a `trainerRelationships` doc linking them?
 *
 * Usage: npx tsx scripts/inspect-zehava-trainer.ts
 */
import { config } from 'dotenv'
config({ path: '.env.local' })

import { collection, getDocs, query, where } from 'firebase/firestore'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { db, auth } from './firebase-config'

const TARGET_EMAIL = 'zehava@assa-adam.com'

async function main() {
  const adminEmail = process.env.E2E_ADMIN_EMAIL
  const adminPassword = process.env.E2E_ADMIN_PASSWORD
  if (!adminEmail || !adminPassword) {
    console.error('Missing E2E_ADMIN_EMAIL/E2E_ADMIN_PASSWORD in .env.local')
    process.exit(1)
  }
  const cred = await signInWithEmailAndPassword(auth, adminEmail, adminPassword)
  console.log(`Authenticated as ${cred.user.email}\n`)

  // 1. Find the user doc
  const usersSnap = await getDocs(
    query(collection(db, 'users'), where('email', '==', TARGET_EMAIL)),
  )
  if (usersSnap.empty) {
    console.log(`USER NOT FOUND: ${TARGET_EMAIL}`)
    process.exit(0)
  }
  const userDoc = usersSnap.docs[0]
  const userData = userDoc.data() as Record<string, unknown>
  console.log(`Found user: ${userDoc.id}`)
  console.log(`  email: ${userData.email}`)
  console.log(`  displayName: ${userData.displayName}`)
  console.log(`  role: ${userData.role}`)
  console.log(`  trainerId: ${JSON.stringify(userData.trainerId)}`)
  console.log(`  createdAt: ${(userData.createdAt as any)?.toDate?.() ?? userData.createdAt}`)
  console.log()

  // 2. If trainerId set — look up the trainer
  const trainerId = userData.trainerId as string | null | undefined
  if (trainerId) {
    const trainerSnap = await getDocs(
      query(collection(db, 'users'), where('__name__', '==', trainerId)),
    )
    if (trainerSnap.empty) {
      console.log(`TRAINER DOC MISSING for trainerId=${trainerId}`)
    } else {
      const t = trainerSnap.docs[0].data() as Record<string, unknown>
      console.log(`Trainer doc:`)
      console.log(`  uid: ${trainerSnap.docs[0].id}`)
      console.log(`  email: ${t.email}`)
      console.log(`  displayName: ${t.displayName}`)
      console.log(`  role: ${t.role} ${t.role !== 'trainer' ? '<<< NOT A TRAINER ROLE!' : ''}`)
    }
  } else {
    console.log(`User has NO trainerId set (null/undefined)`)
  }
  console.log()

  // 3. Look in trainerRelationships (include ended ones — show full history)
  const relSnap = await getDocs(
    query(collection(db, 'trainerRelationships'), where('traineeId', '==', userDoc.id)),
  )
  if (relSnap.empty) {
    console.log('No trainerRelationships docs for this trainee')
  } else {
    console.log(`Found ${relSnap.size} trainerRelationships:`)
    for (const r of relSnap.docs) {
      const d = r.data() as Record<string, unknown>
      console.log(`  ${r.id}: trainerId=${d.trainerId}, status=${d.status}`)
      // Look up trainer name
      const trainerLookup = await getDocs(
        query(collection(db, 'users'), where('__name__', '==', d.trainerId as string)),
      )
      if (!trainerLookup.empty) {
        const t = trainerLookup.docs[0].data() as Record<string, unknown>
        console.log(`    └─ trainer: ${t.displayName} (${t.email}), role=${t.role}`)
      }
    }
  }

  // 4. Show how analytics dashboard sees her
  console.log()
  console.log('=== Analytics dashboard view ===')
  console.log(`role='${userData.role}' → in computeTraineeSummaries() filter (role==='user'): ${userData.role === 'user' ? 'INCLUDED' : 'EXCLUDED'}`)
  console.log(`role='${userData.role}' → in computeTrainerSummaries() (role==='trainer'): ${userData.role === 'trainer' ? 'INCLUDED' : 'EXCLUDED'}`)
  console.log(`Conclusion: with role='${userData.role}', she ${userData.role === 'user' || userData.role === 'trainer' ? 'appears' : 'does NOT appear'} in analytics tabs.`)

  process.exit(0)
}

main().catch((e) => {
  console.error('ERROR:', e)
  process.exit(1)
})
