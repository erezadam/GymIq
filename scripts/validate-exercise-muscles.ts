/**
 * Validation: every exercise's primaryMuscle must resolve (directly or via
 * SUB_MUSCLE_TO_PARENT) to an existing Firestore muscle document.
 *
 * Run manually or in CI:  npx tsx --env-file=.env.local scripts/validate-exercise-muscles.ts
 * Exit code 1 on any unresolved primaryMuscle (broken data must be fixed, not
 * silently covered by the runtime category-fallback in generateWorkout.ts).
 * primaryMuscle/category parent mismatches are reported as warnings (exit 0) —
 * primaryMuscle stays anatomically correct even when category is off.
 */
import { db } from './firebase-config'
import { collection, getDocs } from 'firebase/firestore'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
// functions/ is a CommonJS package — load the shared mapping via require to avoid ESM interop issues
const { SUB_MUSCLE_TO_PARENT } = require('../functions/src/ai-trainer/muscleMapping') as { SUB_MUSCLE_TO_PARENT: Record<string, string> }

async function main() {
  const musclesSnap = await getDocs(collection(db, 'muscles'))
  const muscleIds = new Set(musclesSnap.docs.map(d => d.id))

  const exSnap = await getDocs(collection(db, 'exercises'))
  const unresolved: string[] = []
  const mismatched: string[] = []
  exSnap.forEach(d => {
    const e = d.data() as Record<string, unknown>
    const pm = String(e.primaryMuscle ?? '')
    const category = String(e.category ?? '')
    const parent = SUB_MUSCLE_TO_PARENT[pm] ?? pm
    if (!muscleIds.has(parent)) {
      unresolved.push(`${d.id} | ${e.nameHe ?? e.name} | primaryMuscle="${pm}" | category=${category}`)
      return
    }
    const categoryParent = SUB_MUSCLE_TO_PARENT[category] ?? category
    if (muscleIds.has(categoryParent) && categoryParent !== parent && parent !== 'cardio' && categoryParent !== 'cardio') {
      mismatched.push(`${d.id} | ${e.nameHe ?? e.name} | primaryMuscle="${pm}"→${parent} vs category=${category}→${categoryParent}`)
    }
  })

  if (mismatched.length) {
    console.warn(`⚠️  ${mismatched.length} primaryMuscle/category mismatches (informational):`)
    mismatched.forEach(r => console.warn('  ' + r))
  }
  if (unresolved.length) {
    console.error(`❌ ${unresolved.length} exercises with unresolved primaryMuscle:`)
    unresolved.forEach(r => console.error('  ' + r))
    process.exit(1)
  }
  console.log(`✅ all ${exSnap.size} exercises resolve to a known muscle (${mismatched.length} category mismatches noted)`)
}
main().then(() => { if (!process.exitCode) process.exit(0) }).catch(e => { console.error(e); process.exit(1) })
