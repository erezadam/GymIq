// One-off fix (approved 16/07/2026): repair broken primaryMuscle values on 32 exercises.
// Backs up full docs to scripts/adhoc/backups/ before writing.
// Asserts current primaryMuscle matches the audited value — aborts on any drift.
import { db, auth } from '../firebase-config'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { doc, getDoc, writeBatch } from 'firebase/firestore'
import { writeFileSync } from 'fs'

// id: [expectedCurrentPM, newPM]
const FIXES: Record<string, [string, string]> = {
  // Group A — glutes (longissimus → glutes)
  '6EUI93YQAeP9AwNzz8BL': ['longissimus', 'glutes'],        // Hip Thrust
  'ZnmjmlIkyyIAskc1Qczo': ['longissimus', 'glutes'],        // Single Leg Hip Thrust
  '79pWk66pXALdv4ku2pTI': ['longissimus', 'glutes'],        // Cable Donkey Kickback
  'aNKatCW6yKjWCLsWgoXp': ['longissimus', 'glutes'],        // Cable Hip Extension
  // Group A — abduction exercises (longissimus → abductors)
  'TxiHxnar1u50kdNpJIPq': ['longissimus', 'abductors'],     // Cable_Hip_Abduction
  'rbClLMnp7by4dObWHlFp': ['longissimus', 'abductors'],     // Hip Abductor Machine
  // Group B — empty primaryMuscle
  '4xIO6RSxSBBwOBS4QXNL': ['', 'triceps'],
  '7DM48GgbgQpfOsehSBUB': ['', 'triceps'],
  'Fbw48H0eQfwvkmuye8o8': ['', 'triceps'],
  'NvtGnQEnGkpiaJtAum4h': ['', 'triceps'],
  'XFx4AtVbfQZs92RDE0Cf': ['', 'triceps'],
  'daOoSs8suoDDm9q9s6ih': ['', 'triceps'],
  'iN6CNbUITqLbPXYrVcA5': ['', 'triceps'],
  'ls2RllIGdrXboD5nrmf2': ['', 'triceps'],
  'pIBbU2E6TQ9uQc8jiQqR': ['', 'triceps'],
  'pPEBBNhgMbC5yvgupahV': ['', 'triceps'],
  'y9KWVXtSxcED7JQMpSRP': ['', 'triceps'],
  'MaFve2b6vmGU6Ht1s590': ['', 'biceps'],
  'XnmEnDFS42PVHmcRoUip': ['', 'biceps'],
  'gbA8iuaTKW8ejWePVPPA': ['', 'biceps'],
  'gxW8cKebZWGeMWkaF2OC': ['', 'biceps'],
  'p4B9Utw3H50XD1khsVHP': ['', 'biceps'],
  'pzjgjrHBfEq0QUEuDOSc': ['', 'biceps'],
  'w1n27HqyHvQynfAZ9Jtb': ['', 'biceps'],
  'R4VVUQ3M1xZg4XydOAqq': ['', 'front_delt'],               // Dumbbell Front Raise (approved)
  'clhm0C23fRp5JdBvVNTz': ['', 'cardio'],                   // Tabata
  'g2eOtPeOAAPdg8G8AKun': ['', 'cardio'],                   // sit
  'tV68IfOMs7II2jD7l124': ['', 'cardio'],                   // hiit
  'JClCPcKWAxKiuy7KIgRB': ['', 'glutes'],                   // Smith_Machine_Hip_Thrust
  // Group C — adductor (singular) — AdductorMagnus (qzSZ8lVWtzv2pad94HeT) EXCLUDED per user
  'e82wJzvrGBylmqCiSmR7': ['adductor', 'adductors'],        // Hip Adductor Machine
  'FF7lRd2RLiNrKbhSLC2l': ['adductor', 'abductors'],        // Single-Leg Hip Abduction Machine
  // Group D — typo
  'V2kRvjEM7Dbyi1KwPp0K': ['(iliopsoas', 'abs'],            // Hanging Leg Raise (approved)
}

async function main() {
  const email = process.env.ADMIN_EMAIL, pw = process.env.ADMIN_PASSWORD
  if (!email || !pw) throw new Error('Missing ADMIN_EMAIL/ADMIN_PASSWORD in .env.local')
  await signInWithEmailAndPassword(auth, email, pw)
  console.log('authenticated as admin')
  const ids = Object.keys(FIXES)
  console.log(`planned writes: ${ids.length}`)
  const backup: Record<string, unknown> = {}
  for (const id of ids) {
    const snap = await getDoc(doc(db, 'exercises', id))
    if (!snap.exists()) throw new Error(`ABORT: doc ${id} missing`)
    const data = snap.data()
    const current = String(data.primaryMuscle ?? '')
    const [expected] = FIXES[id]
    if (current !== expected) throw new Error(`ABORT: ${id} primaryMuscle="${current}" !== expected "${expected}" (data drifted since audit)`)
    backup[id] = data
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const path = `scripts/adhoc/backups/exercises-primaryMuscle-backup-${stamp}.json`
  writeFileSync(path, JSON.stringify(backup, null, 2))
  console.log(`backup written: ${path} (${ids.length} docs)`)

  const batch = writeBatch(db)
  for (const id of ids) batch.update(doc(db, 'exercises', id), { primaryMuscle: FIXES[id][1] })
  await batch.commit()
  console.log(`✅ committed ${ids.length} updates`)
}
main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })
