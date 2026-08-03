// Read-only diagnostic (incident 02/08/2026): find in_progress workoutHistory
// docs with ZERO exercises — artifacts of the empty-overwrite bug where deleting
// the last exercise autosaved an empty workout over the original doc.
// Reports per user (resolves email via users collection). NO WRITES.
//
// Run: npx tsx --env-file=.env.local scripts/findEmptyInProgressWorkouts.ts
import { db, auth } from './firebase-config'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore'

async function main() {
  const email = process.env.ADMIN_EMAIL, pw = process.env.ADMIN_PASSWORD
  if (!email || !pw) throw new Error('Missing ADMIN_EMAIL/ADMIN_PASSWORD in .env.local')
  await signInWithEmailAndPassword(auth, email, pw)
  console.log('authenticated as admin\n')

  const q = query(collection(db, 'workoutHistory'), where('status', '==', 'in_progress'))
  const snap = await getDocs(q)
  console.log(`in_progress docs total: ${snap.size}`)

  const empties = snap.docs.filter(d => {
    const ex = d.data().exercises
    return !Array.isArray(ex) || ex.length === 0
  })
  console.log(`EMPTY in_progress docs: ${empties.length}\n`)

  const emailCache = new Map<string, string>()
  for (const d of empties) {
    const data = d.data()
    const uid: string = data.userId ?? '(missing)'
    if (!emailCache.has(uid)) {
      try {
        const u = await getDoc(doc(db, 'users', uid))
        emailCache.set(uid, u.exists() ? (u.data().email ?? '(no email)') : '(user doc missing)')
      } catch {
        emailCache.set(uid, '(lookup failed)')
      }
    }
    console.log(
      [
        `docId=${d.id}`,
        `user=${emailCache.get(uid)} (${uid})`,
        `name="${data.name ?? ''}"`,
        `date=${data.date?.toDate?.()?.toISOString?.() ?? data.date}`,
        `source=${data.source ?? '-'}`,
        `deletedByTrainee=${data.deletedByTrainee ?? false}`,
      ].join(' | ')
    )
  }

  if (empties.length > 0) {
    console.log(
      '\nTo fix (after approval): npx tsx --env-file=.env.local scripts/fixEmptyInProgressWorkouts.ts --apply ' +
        empties.map(d => d.id).join(' ')
    )
  }
  process.exit(0)
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
