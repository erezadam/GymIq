/**
 * Fix muscles collection + exercises primaryMuscle mapping
 *
 * Muscles: Uses forceUpdate from defaultMuscleMapping (clean source of truth)
 * Exercises: Fixes shoulder + arm primaryMuscle values
 *
 * Authenticates as admin user via signInWithEmailAndPassword
 *
 * Run with: npx tsx scripts/fix-muscles-and-exercises.ts
 */

import { collection, getDocs, doc, setDoc, updateDoc, serverTimestamp, writeBatch } from 'firebase/firestore'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { db, auth } from './firebase-config'
import { config } from 'dotenv'

// Load .env.local for admin credentials
config({ path: '.env.local' })

// ============================================================
// PART 1: Clean muscle mapping (from muscles.ts)
// ============================================================

const CLEAN_MUSCLES = [
  {
    id: 'arms',
    nameHe: 'זרועות',
    nameEn: 'Arms',
    icon: '💪',
    subMuscles: [
      { id: 'biceps', nameHe: 'בייספס', nameEn: 'Biceps' },
      { id: 'triceps', nameHe: 'טרייספס', nameEn: 'Triceps' },
      { id: 'forearms', nameHe: 'אמות', nameEn: 'Forearms' },
    ],
  },
  {
    id: 'chest',
    nameHe: 'חזה',
    nameEn: 'Chest',
    icon: '🫁',
    subMuscles: [
      { id: 'upper_chest', nameHe: 'חזה עליון', nameEn: 'Upper Chest' },
      { id: 'mid_chest', nameHe: 'חזה אמצעי', nameEn: 'Mid Chest' },
      { id: 'lower_chest', nameHe: 'חזה תחתון', nameEn: 'Lower Chest' },
    ],
  },
  {
    id: 'back',
    nameHe: 'גב',
    nameEn: 'Back',
    icon: '🔙',
    subMuscles: [
      { id: 'lats', nameHe: 'לאטס (רוחב)', nameEn: 'Lats' },
      { id: 'upper_back', nameHe: 'גב עליון', nameEn: 'Upper Back' },
      { id: 'lower_back', nameHe: 'גב תחתון', nameEn: 'Lower Back' },
      { id: 'traps', nameHe: 'טרפז', nameEn: 'Traps' },
    ],
  },
  {
    id: 'shoulders',
    nameHe: 'כתפיים',
    nameEn: 'Shoulders',
    icon: '🏋️',
    subMuscles: [
      { id: 'front_delt', nameHe: 'כתף קדמית', nameEn: 'Front Delt' },
      { id: 'side_delt', nameHe: 'כתף צידית', nameEn: 'Side Delt' },
      { id: 'rear_delt', nameHe: 'כתף אחורית', nameEn: 'Rear Delt' },
    ],
  },
  {
    id: 'legs',
    nameHe: 'רגליים',
    nameEn: 'Legs',
    icon: '🦵',
    subMuscles: [
      { id: 'quads', nameHe: 'ארבע ראשי (קדמי)', nameEn: 'Quadriceps' },
      { id: 'hamstrings', nameHe: 'אחורי ירך', nameEn: 'Hamstrings' },
      { id: 'glutes', nameHe: 'ישבן', nameEn: 'Glutes' },
      { id: 'calves', nameHe: 'תאומים (שוק)', nameEn: 'Calves' },
    ],
  },
  {
    id: 'core',
    nameHe: 'ליבה',
    nameEn: 'Core',
    icon: '🎯',
    subMuscles: [
      { id: 'abs', nameHe: 'שריר בטן ישר', nameEn: 'Abs' },
      { id: 'obliques', nameHe: 'אלכסוניים', nameEn: 'Obliques' },
      { id: 'lower_abs', nameHe: 'בטן תחתונה', nameEn: 'Lower Abs' },
    ],
  },
]

// ============================================================
// PART 2: Exercise primaryMuscle fix rules
// ============================================================

const SHOULDER_PRESS_KEYWORDS = [
  'לחיצת כתפיים', 'דחיקת כתפיים', 'לחיצה צבאית',
  'shoulder press', 'overhead press', 'military press',
  'arnold press', 'ארנולד',
  'דחיקה מעל', 'לחיצה מעל',
]

const LATERAL_RAISE_KEYWORDS = [
  'הרמה צדדית', 'הרמות צד', 'הרמה לצד',
  'lateral raise', 'side raise',
  'צדדית בכבל', 'צדדית במשקולת',
]

const CURL_KEYWORDS = [
  'כפיפת ביספס', 'כפיפת בייספס', 'כפיפות ביספס', 'כפיפות בייספס',
  'bicep curl', 'biceps curl', 'hammer curl',
  'כפיפת פטיש', 'כפיפה בכבל', 'כפיפות',
  'curl', 'קרל',
  'כפיפת יד', 'כפיפת זרוע',
  'preacher', 'פריצ\'ר',
  'concentration', 'ריכוז',
]

const TRICEP_EXTENSION_KEYWORDS = [
  'פשיטת טרייספס', 'פשיטת טריספס', 'פשיטות טרייספס',
  'tricep pushdown', 'triceps pushdown', 'tricep extension',
  'skull crusher', 'שכיבה צרפתית',
  'דיפס לטרייספס', 'דיפס טרייספס',
  'kickback', 'קיקבק',
  'פשיטה מעל הראש', 'פשיטה בכבל',
  'tricep dip', 'close grip',
  'אחיזה צרה',
]

function matchesAnyKeyword(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase()
  return keywords.some(kw => lower.includes(kw.toLowerCase()))
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log('\n' + '='.repeat(70))
  console.log('  FIX MUSCLES + EXERCISES MAPPING')
  console.log('='.repeat(70))

  // ---- Authenticate as admin ----
  const adminEmail = process.env.ADMIN_EMAIL
  const adminPassword = process.env.ADMIN_PASSWORD

  if (!adminEmail || !adminPassword) {
    console.error('Missing ADMIN_EMAIL or ADMIN_PASSWORD in .env.local')
    process.exit(1)
  }

  console.log(`\nAuthenticating as admin: ${adminEmail}`)
  await signInWithEmailAndPassword(auth, adminEmail, adminPassword)
  console.log('Authenticated successfully!\n')

  // ---- PART 1: Fix muscles ----
  console.log('--- PART 1: MUSCLES COLLECTION ---\n')

  const musclesRef = collection(db, 'muscles')
  const musclesBefore = await getDocs(musclesRef)

  console.log(`Current muscles in Firestore: ${musclesBefore.size} documents`)
  for (const d of musclesBefore.docs) {
    const data = d.data()
    const subs = (data.subMuscles || []) as Array<{ id: string; nameHe: string }>
    console.log(`  ${d.id}: ${subs.length} subMuscles [${subs.map(s => s.id).join(', ')}]`)
  }

  // Write clean muscles (setDoc = full replace)
  let musclesUpdated = 0
  for (const muscle of CLEAN_MUSCLES) {
    const muscleRef = doc(db, 'muscles', muscle.id)
    await setDoc(muscleRef, {
      nameHe: muscle.nameHe,
      nameEn: muscle.nameEn,
      icon: muscle.icon,
      subMuscles: muscle.subMuscles,
      updatedAt: serverTimestamp(),
    })
    console.log(`  Updated: ${muscle.id} (${muscle.nameHe}) with ${muscle.subMuscles.length} subMuscles`)
    musclesUpdated++
  }

  console.log(`\nMuscles: ${musclesUpdated} documents updated`)

  // Note: cardio and gluteus_maximus docs exist in Firestore but are NOT in defaultMuscleMapping.
  // They were not part of the approved changes, so we leave them as-is.

  // ---- PART 2: Fix exercises ----
  console.log('\n--- PART 2: EXERCISES COLLECTION ---\n')

  const exercisesRef = collection(db, 'exercises')
  const exercisesSnapshot = await getDocs(exercisesRef)
  console.log(`Total exercises in Firestore: ${exercisesSnapshot.size}`)

  const fixes: Array<{
    id: string
    nameHe: string
    oldPrimaryMuscle: string
    newPrimaryMuscle: string
    reason: string
  }> = []

  for (const docSnap of exercisesSnapshot.docs) {
    const data = docSnap.data()
    const nameHe = data.nameHe || ''
    const name = data.name || ''
    const primaryMuscle = data.primaryMuscle || ''
    const category = data.category || ''
    const fullName = `${nameHe} ${name}`.toLowerCase()

    // --- Shoulder fixes ---
    if (category === 'shoulders' || primaryMuscle === 'posterior_deltoid' || primaryMuscle === 'anterior_deltoid') {
      // Shoulder press -> front_delt
      if (primaryMuscle !== 'front_delt' && matchesAnyKeyword(fullName, SHOULDER_PRESS_KEYWORDS)) {
        fixes.push({
          id: docSnap.id,
          nameHe,
          oldPrimaryMuscle: primaryMuscle,
          newPrimaryMuscle: 'front_delt',
          reason: 'לחיצת/דחיקת כתפיים = כתף קדמית (front_delt)',
        })
        continue
      }

      // Lateral raise -> side_delt
      if (primaryMuscle !== 'side_delt' && matchesAnyKeyword(fullName, LATERAL_RAISE_KEYWORDS)) {
        fixes.push({
          id: docSnap.id,
          nameHe,
          oldPrimaryMuscle: primaryMuscle,
          newPrimaryMuscle: 'side_delt',
          reason: 'הרמה צדדית = כתף צדדית (side_delt)',
        })
        continue
      }

      // Remaining posterior_deltoid that aren't truly rear delt exercises
      if (primaryMuscle === 'posterior_deltoid') {
        const isRearDelt = fullName.includes('reverse') || fullName.includes('הפוך') ||
          fullName.includes('face pull') || fullName.includes('rear') ||
          fullName.includes('אחורית') || fullName.includes('אחורי')

        if (isRearDelt) {
          // Fix to proper rear_delt ID
          fixes.push({
            id: docSnap.id,
            nameHe,
            oldPrimaryMuscle: primaryMuscle,
            newPrimaryMuscle: 'rear_delt',
            reason: 'posterior_deltoid -> rear_delt (תקינה של ID)',
          })
        } else {
          fixes.push({
            id: docSnap.id,
            nameHe,
            oldPrimaryMuscle: primaryMuscle,
            newPrimaryMuscle: 'front_delt',
            reason: 'posterior_deltoid שגוי בתרגיל כתפיים שאינו אחורי',
          })
        }
        continue
      }
    }

    // --- Arm fixes: biceps <-> triceps swap ---
    if (category === 'arms') {
      // Curls currently mapped to triceps -> should be biceps
      if (primaryMuscle === 'triceps' && matchesAnyKeyword(fullName, CURL_KEYWORDS)) {
        fixes.push({
          id: docSnap.id,
          nameHe,
          oldPrimaryMuscle: primaryMuscle,
          newPrimaryMuscle: 'biceps',
          reason: 'כפיפה (curl) = biceps, לא triceps',
        })
        continue
      }

      // Extensions currently mapped to biceps -> should be triceps
      if (primaryMuscle === 'biceps' && matchesAnyKeyword(fullName, TRICEP_EXTENSION_KEYWORDS)) {
        fixes.push({
          id: docSnap.id,
          nameHe,
          oldPrimaryMuscle: primaryMuscle,
          newPrimaryMuscle: 'triceps',
          reason: 'פשיטה (extension) = triceps, לא biceps',
        })
        continue
      }
    }
  }

  // Apply exercise fixes
  if (fixes.length > 0) {
    console.log(`\nExercises to fix: ${fixes.length}\n`)

    const batchSize = 450
    for (let i = 0; i < fixes.length; i += batchSize) {
      const batch = writeBatch(db)
      const chunk = fixes.slice(i, i + batchSize)

      for (const fix of chunk) {
        const exerciseRef = doc(db, 'exercises', fix.id)
        batch.update(exerciseRef, { primaryMuscle: fix.newPrimaryMuscle })
      }

      await batch.commit()
    }

    // Print details
    console.log('--- Shoulder fixes ---')
    const shoulderFixes = fixes.filter(f =>
      f.newPrimaryMuscle === 'front_delt' || f.newPrimaryMuscle === 'side_delt' || f.newPrimaryMuscle === 'rear_delt'
    )
    for (const f of shoulderFixes) {
      console.log(`  ${f.nameHe}: ${f.oldPrimaryMuscle} -> ${f.newPrimaryMuscle} (${f.reason})`)
    }

    console.log('\n--- Arm fixes ---')
    const armFixes = fixes.filter(f => f.newPrimaryMuscle === 'biceps' || f.newPrimaryMuscle === 'triceps')
    for (const f of armFixes) {
      console.log(`  ${f.nameHe}: ${f.oldPrimaryMuscle} -> ${f.newPrimaryMuscle} (${f.reason})`)
    }

    console.log(`\nExercises: ${fixes.length} documents updated`)
    console.log(`  - Shoulder fixes: ${shoulderFixes.length}`)
    console.log(`  - Arm fixes: ${armFixes.length}`)
  } else {
    console.log('\nNo exercise fixes needed!')
  }

  // ---- SUMMARY ----
  console.log('\n' + '='.repeat(70))
  console.log('  SUMMARY')
  console.log('='.repeat(70))
  console.log(`  Muscles updated: ${musclesUpdated}`)
  console.log(`  Exercises updated: ${fixes.length}`)
  console.log(`  Total changes: ${musclesUpdated + fixes.length}`)
  console.log('='.repeat(70) + '\n')

  process.exit(0)
}

main().catch((err) => {
  console.error('Error:', err)
  process.exit(1)
})
