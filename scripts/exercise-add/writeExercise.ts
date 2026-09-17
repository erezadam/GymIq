/**
 * writeExercise.ts — the ONLY sanctioned path for an agent to write an
 * exercise document to Firestore.
 *
 * Run: npm run exercise:write -- --input <file.json> [--write] [--skip-image-check]
 * Without --write this is a dry run: everything validates, nothing is written.
 *
 * Exit codes: 0 ok/dry-run · 1 env/auth missing · 2 schema/controlled-values
 * invalid · 3 duplicate exists · 4 imageUrl not reachable · 5 unexpected error.
 */
import { readFileSync } from 'node:fs'
import { config } from 'dotenv'
config({ path: '.env.local' })

import { signInWithEmailAndPassword } from 'firebase/auth'
import {
  collection,
  getDocs,
  addDoc,
  getDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { db, auth } from '../firebase-config'
import {
  exerciseSchema,
  toExercisePayload,
} from '../../src/domains/exercises/validation/exerciseSchema'
import { removeUndefined } from '../../src/lib/firebase/firestoreUtils'
import {
  toFormData,
  findDuplicate,
  validateControlledValues,
  type ExistingExercise,
} from './lib'

function getFlag(name: string): boolean {
  return process.argv.includes(name)
}
function getOption(name: string): string | undefined {
  const i = process.argv.indexOf(name)
  return i >= 0 ? process.argv[i + 1] : undefined
}

// serverTimestamp()/deleteField() sentinels are not JSON-serializable — show
// them as readable tags in the printed payload.
function printablePayload(payload: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(payload)) {
    if (v !== null && typeof v === 'object' && !Array.isArray(v) && '_methodName' in (v as object)) {
      out[k] = `<${(v as { _methodName: string })._methodName}>`
    } else if (v !== null && typeof v === 'object' && !Array.isArray(v) && Object.getPrototypeOf(v) !== Object.prototype) {
      out[k] = '<serverTimestamp>'
    } else {
      out[k] = v
    }
  }
  return out
}

async function main() {
  const inputPath = getOption('--input')
  const doWrite = getFlag('--write')
  const skipImageCheck = getFlag('--skip-image-check')

  if (!inputPath) {
    console.error('שימוש: npm run exercise:write -- --input <file.json> [--write] [--skip-image-check]')
    process.exit(1)
  }
  const email = process.env.ADMIN_EMAIL
  const password = process.env.ADMIN_PASSWORD
  if (!email || !password) {
    console.error('חסרים ADMIN_EMAIL / ADMIN_PASSWORD ב-.env.local — לא ניתן להזדהות.')
    process.exit(1)
  }

  // 1. Read + shape input
  const raw = JSON.parse(readFileSync(inputPath, 'utf-8'))
  const formData = toFormData(raw)

  // 2. Schema validation (same schema as the admin form)
  const parsed = exerciseSchema.safeParse(formData)
  if (!parsed.success) {
    console.error('❌ הקלט נכשל ב-exerciseSchema:')
    for (const issue of parsed.error.issues) {
      console.error(`  - [${issue.path.join('.')}] ${issue.message}`)
    }
    process.exit(2)
  }

  // 3. Live controlled vocabularies
  await signInWithEmailAndPassword(auth, email, password)
  const musclesSnap = await getDocs(collection(db, 'muscles'))
  const muscleIds = new Set<string>()
  const subMuscleIds = new Set<string>()
  for (const d of musclesSnap.docs) {
    muscleIds.add(d.id)
    for (const s of d.data().subMuscles || []) subMuscleIds.add(s.id)
  }
  const equipmentSnap = await getDocs(collection(db, 'equipment'))
  const equipmentActiveIds = new Set(
    equipmentSnap.docs.filter((d) => d.data().isActive !== false).map((d) => d.id)
  )
  const reportTypesSnap = await getDocs(collection(db, 'reportTypes'))
  const reportTypeActiveIds = new Set(
    reportTypesSnap.docs.filter((d) => d.data().isActive !== false).map((d) => d.id)
  )

  const controlledErrors = validateControlledValues(parsed.data, {
    muscleIds,
    equipmentActiveIds,
    reportTypeActiveIds,
    subMuscleIds,
  })
  if (controlledErrors.length > 0) {
    console.error('❌ ערכים מחוץ לקטלוגים החיים:')
    controlledErrors.forEach((e) => console.error(`  - ${e}`))
    process.exit(2)
  }

  // 4. Duplicate check against live exercises
  const exercisesSnap = await getDocs(collection(db, 'exercises'))
  const existing: ExistingExercise[] = exercisesSnap.docs.map((d) => ({
    id: d.id,
    name: d.data().name || '',
    nameHe: d.data().nameHe || '',
  }))
  const dup = findDuplicate(existing, parsed.data)
  if (dup) {
    console.error(`❌ קיים תרגיל בשם ${dup.nameHe} / ${dup.name} (id: ${dup.id})`)
    process.exit(3)
  }

  // 5. imageUrl must be live
  if (skipImageCheck) {
    console.warn('⚠️ --skip-image-check: מדלג על בדיקת התמונה (לבדיקות בלבד!)')
  } else {
    const res = await fetch(parsed.data.imageUrl, { method: 'HEAD' })
    if (!res.ok) {
      console.error(`❌ imageUrl החזיר ${res.status} — התמונה אינה נגישה: ${parsed.data.imageUrl}`)
      process.exit(4)
    }
    console.log(`✅ imageUrl חי (HTTP ${res.status})`)
  }

  // 6. Payload — exactly what the admin form would submit on create
  const payload = toExercisePayload(parsed.data, { isEditing: false })
  console.log('Payload:')
  console.log(JSON.stringify(printablePayload(payload), null, 2))

  if (!doWrite) {
    console.log('DRY RUN — לא נכתב. הוסף --write לכתיבה בפועל.')
    process.exit(0)
  }

  // 7. Write — mirrors createExercise() in src/lib/firebase/exercises.ts
  const docRef = await addDoc(collection(db, 'exercises'), {
    ...removeUndefined(payload),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  // 8. Read back as proof
  const written = await getDoc(docRef)
  const w = written.data()!
  console.log('✅ נכתב ואומת בקריאה חוזרת:')
  console.log(JSON.stringify({ id: docRef.id, name: w.name, nameHe: w.nameHe, imageUrl: w.imageUrl }, null, 2))
  process.exit(0)
}

main().catch((err) => {
  console.error('❌ שגיאה לא צפויה:')
  console.error(err)
  process.exit(5)
})
