// Fix script (incident 02/08/2026): mark empty in_progress workoutHistory docs
// as cancelled so they stop being recovered as the active workout (blank screen).
// Backs up full docs to scripts/backups/ before writing. Verifies each doc is
// still in_progress AND empty before touching it — aborts the doc otherwise.
//
// Dry run (default): npx tsx --env-file=.env.local scripts/fixEmptyInProgressWorkouts.ts <docId...>
// Apply:             npx tsx --env-file=.env.local scripts/fixEmptyInProgressWorkouts.ts --apply <docId...>
import { db, auth } from './firebase-config'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { writeFileSync, mkdirSync } from 'fs'

async function main() {
  const args = process.argv.slice(2)
  const apply = args.includes('--apply')
  const ids = args.filter(a => a !== '--apply')
  if (ids.length === 0) throw new Error('Usage: fixEmptyInProgressWorkouts.ts [--apply] <docId...>')

  const email = process.env.ADMIN_EMAIL, pw = process.env.ADMIN_PASSWORD
  if (!email || !pw) throw new Error('Missing ADMIN_EMAIL/ADMIN_PASSWORD in .env.local')
  await signInWithEmailAndPassword(auth, email, pw)
  console.log(`authenticated as admin | mode=${apply ? 'APPLY' : 'DRY RUN'}\n`)

  const backup: Record<string, unknown> = {}
  for (const id of ids) {
    const snap = await getDoc(doc(db, 'workoutHistory', id))
    if (!snap.exists()) {
      console.log(`SKIP ${id}: doc missing`)
      continue
    }
    const data = snap.data()
    const ex = data.exercises
    const isEmpty = !Array.isArray(ex) || ex.length === 0
    if (data.status !== 'in_progress' || !isEmpty) {
      console.log(`SKIP ${id}: status=${data.status}, exercises=${Array.isArray(ex) ? ex.length : 'missing'} (not an empty in_progress doc)`)
      continue
    }
    backup[id] = data
    if (apply) {
      await updateDoc(doc(db, 'workoutHistory', id), { status: 'cancelled' })
      console.log(`FIXED ${id}: in_progress → cancelled (user=${data.userId})`)
    } else {
      console.log(`WOULD FIX ${id}: in_progress → cancelled (user=${data.userId})`)
    }
  }

  if (Object.keys(backup).length > 0) {
    mkdirSync('scripts/backups', { recursive: true })
    const file = `scripts/backups/emptyInProgress-${apply ? 'applied' : 'dryrun'}-${Date.now()}.json`
    writeFileSync(file, JSON.stringify(backup, null, 2))
    console.log(`\nbackup written: ${file}`)
  }
  process.exit(0)
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
