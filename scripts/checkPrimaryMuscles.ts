import { db, auth } from './firebase-config'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { collection, getDocs } from 'firebase/firestore'
import { config } from 'dotenv'
config({ path: '.env.local' })

async function check() {
  const e = process.env.ADMIN_EMAIL, p = process.env.ADMIN_PASSWORD
  if (!e || !p) { process.exit(1) }
  await signInWithEmailAndPassword(auth, e, p)

  const musclesSnap = await getDocs(collection(db, 'muscles'))
  const validSub = new Set<string>()
  const validCat = new Set<string>()
  for (const d of musclesSnap.docs) {
    validCat.add(d.id)
    for (const s of (d.data().subMuscles || [])) validSub.add(s.id)
  }
  console.log('Valid sub-muscles:', [...validSub].join(', '))

  const exSnap = await getDocs(collection(db, 'exercises'))
  const counts = new Map<string, number>()
  const orphaned: string[] = []
  for (const d of exSnap.docs) {
    const pm = d.data().primaryMuscle || '(empty)'
    counts.set(pm, (counts.get(pm) || 0) + 1)
    if (pm !== '(empty)' && !validSub.has(pm) && !validCat.has(pm))
      orphaned.push(d.data().name + ': ' + pm)
  }
  console.log('\nprimaryMuscle counts:')
  for (const [k, v] of [...counts.entries()].sort((a,b) => b[1]-a[1])) {
    const ok = validSub.has(k) || validCat.has(k) ? '✅' : '❌'
    console.log('  ' + ok + ' ' + k + ': ' + v)
  }
  if (orphaned.length) {
    console.log('\n⚠️ ' + orphaned.length + ' orphaned:')
    orphaned.forEach(o => console.log('  - ' + o))
  } else console.log('\n✅ All valid')
}
check().catch(console.error)
