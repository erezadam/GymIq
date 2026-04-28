/**
 * One-time migration: stamp `lastSeenReleaseNotesAt = serverTimestamp()` on
 * every user document that does not already have the field.
 *
 * Rationale: PR #91 added the field to all 3 user-creation paths, but users
 * created before the deploy don't have it. Without this migration, every
 * existing user would see the full published release-notes history as "new"
 * on their next login.
 *
 * ## Usage
 *
 * Dry run (no writes — just prints who would be updated):
 *   npm run migrate:release-notes -- --dry-run
 *
 * Real run (prompts for y/n confirmation before writing):
 *   npm run migrate:release-notes
 *
 * Requires ADMIN_EMAIL / ADMIN_PASSWORD in .env.local (admin creds,
 * because Firestore rules require admin role to list all users).
 */

import { db, auth } from './firebase-config'
import { signInWithEmailAndPassword } from 'firebase/auth'
import {
  collection,
  getDocs,
  writeBatch,
  doc,
  serverTimestamp,
} from 'firebase/firestore'
import { config } from 'dotenv'
import * as readline from 'node:readline'

config({ path: '.env.local' })

const BATCH_SIZE = 500
const DRY_RUN = process.argv.includes('--dry-run')

async function promptYesNo(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer.trim().toLowerCase() === 'y')
    })
  })
}

async function main() {
  console.log(DRY_RUN ? '🔍 DRY RUN — no writes will be made' : '🚀 Running migration')
  console.log('')

  const email = process.env.ADMIN_EMAIL
  const password = process.env.ADMIN_PASSWORD
  if (!email || !password) {
    console.error('❌ Missing ADMIN_EMAIL / ADMIN_PASSWORD in .env.local')
    process.exit(1)
  }

  console.log(`🔐 Signing in as ${email}…`)
  await signInWithEmailAndPassword(auth, email, password)
  console.log('✅ Authenticated')
  console.log('')

  console.log('📥 Reading users collection…')
  const snapshot = await getDocs(collection(db, 'users'))
  console.log(`   Total users: ${snapshot.size}`)

  const toUpdate: string[] = []
  let alreadyHaveField = 0

  snapshot.docs.forEach((d) => {
    const data = d.data()
    if (data.lastSeenReleaseNotesAt === undefined) {
      toUpdate.push(d.id)
    } else {
      alreadyHaveField += 1
    }
  })

  console.log('')
  console.log(`   Already have the field: ${alreadyHaveField}`)
  console.log(`   Need update:            ${toUpdate.length}`)
  console.log('')

  if (toUpdate.length === 0) {
    console.log('✅ Nothing to do — all users are up to date.')
    process.exit(0)
  }

  if (DRY_RUN) {
    console.log('📋 Users that would be updated:')
    toUpdate.forEach((uid) => console.log(`   - ${uid}`))
    console.log('')
    console.log(`🔍 DRY RUN complete — would update ${toUpdate.length} users. No writes made.`)
    process.exit(0)
  }

  const confirmed = await promptYesNo(
    `⚠️  About to update ${toUpdate.length} user documents. Proceed? (y/n): `
  )
  if (!confirmed) {
    console.log('❌ Aborted by user. No writes made.')
    process.exit(0)
  }

  console.log('')
  console.log('✏️  Writing in batches of ' + BATCH_SIZE + '…')

  let written = 0
  for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
    const slice = toUpdate.slice(i, i + BATCH_SIZE)
    const batch = writeBatch(db)
    slice.forEach((uid) => {
      batch.update(doc(db, 'users', uid), {
        lastSeenReleaseNotesAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    })
    await batch.commit()
    written += slice.length
    console.log(`   ✅ ${written}/${toUpdate.length}`)
  }

  console.log('')
  console.log(`🎉 Migration complete. Updated ${written} users. Skipped ${alreadyHaveField}.`)
  process.exit(0)
}

main().catch((err) => {
  console.error('❌ Migration failed:', err)
  process.exit(1)
})
