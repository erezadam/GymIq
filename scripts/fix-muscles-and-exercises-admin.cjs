/**
 * Fix muscles collection + exercises primaryMuscle mapping
 * Uses Firebase Admin SDK (bypasses Firestore security rules)
 *
 * Step 1: Set the admin user role first
 * Step 2: Fix muscles collection
 * Step 3: Fix exercises primaryMuscle values
 *
 * Run with: node scripts/fix-muscles-and-exercises-admin.cjs
 */

const admin = require('firebase-admin');

admin.initializeApp({
  projectId: 'gymiq-e8b4e',
});

const db = admin.firestore();

// ============================================================
// PART 0: Set admin role for test user (needed for future web SDK writes)
// ============================================================

const ADMIN_UID = 'SWF8R0qhg5XJ6aNg0ShfuJ51rr02';

// ============================================================
// PART 1: Clean muscle mapping (from muscles.ts defaultMuscleMapping)
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
];

// ============================================================
// PART 2: Exercise fix rules
// ============================================================

const SHOULDER_PRESS_KEYWORDS = [
  'לחיצת כתפיים', 'דחיקת כתפיים', 'לחיצה צבאית',
  'shoulder press', 'overhead press', 'military press',
  'arnold press', 'ארנולד',
  'דחיקה מעל', 'לחיצה מעל',
];

const LATERAL_RAISE_KEYWORDS = [
  'הרמה צדדית', 'הרמות צד', 'הרמה לצד',
  'lateral raise', 'side raise',
  'צדדית בכבל', 'צדדית במשקולת',
];

const CURL_KEYWORDS = [
  'כפיפת ביספס', 'כפיפת בייספס', 'כפיפות ביספס', 'כפיפות בייספס',
  'bicep curl', 'biceps curl', 'hammer curl',
  'כפיפת פטיש', 'כפיפה בכבל', 'כפיפות',
  'curl', 'קרל',
  'כפיפת יד', 'כפיפת זרוע',
  'preacher', 'פריצ\'ר',
  'concentration', 'ריכוז',
];

const TRICEP_EXTENSION_KEYWORDS = [
  'פשיטת טרייספס', 'פשיטת טריספס', 'פשיטות טרייספס',
  'tricep pushdown', 'triceps pushdown', 'tricep extension',
  'skull crusher', 'שכיבה צרפתית',
  'דיפס לטרייספס', 'דיפס טרייספס',
  'kickback', 'קיקבק',
  'פשיטה מעל הראש', 'פשיטה בכבל',
  'tricep dip', 'close grip',
  'אחיזה צרה',
];

function matchesAnyKeyword(text, keywords) {
  const lower = text.toLowerCase();
  return keywords.some(kw => lower.includes(kw.toLowerCase()));
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log('\n' + '='.repeat(70));
  console.log('  FIX MUSCLES + EXERCISES MAPPING (Admin SDK)');
  console.log('='.repeat(70));

  // ---- STEP 0: Set admin role ----
  console.log('\n--- STEP 0: SET ADMIN ROLE ---\n');
  const userRef = db.collection('users').doc(ADMIN_UID);
  const userDoc = await userRef.get();
  if (userDoc.exists) {
    const currentRole = userDoc.data().role;
    if (currentRole !== 'admin') {
      await userRef.update({ role: 'admin' });
      console.log(`  Updated user role: ${currentRole} -> admin`);
    } else {
      console.log(`  User already has admin role`);
    }
  }

  // ---- PART 1: Fix muscles ----
  console.log('\n--- PART 1: MUSCLES COLLECTION ---\n');

  const musclesSnapshot = await db.collection('muscles').get();
  console.log(`Current muscles in Firestore: ${musclesSnapshot.size} documents`);
  musclesSnapshot.docs.forEach(d => {
    const data = d.data();
    const subs = (data.subMuscles || []);
    console.log(`  ${d.id}: ${subs.length} subMuscles [${subs.map(s => s.id).join(', ')}]`);
  });

  let musclesUpdated = 0;
  for (const muscle of CLEAN_MUSCLES) {
    const muscleRef = db.collection('muscles').doc(muscle.id);
    await muscleRef.set({
      nameHe: muscle.nameHe,
      nameEn: muscle.nameEn,
      icon: muscle.icon,
      subMuscles: muscle.subMuscles,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log(`  Updated: ${muscle.id} (${muscle.nameHe}) with ${muscle.subMuscles.length} subMuscles`);
    musclesUpdated++;
  }

  console.log(`\nMuscles: ${musclesUpdated} documents updated`);

  // ---- PART 2: Fix exercises ----
  console.log('\n--- PART 2: EXERCISES COLLECTION ---\n');

  const exercisesSnapshot = await db.collection('exercises').get();
  console.log(`Total exercises in Firestore: ${exercisesSnapshot.size}`);

  const fixes = [];

  exercisesSnapshot.docs.forEach(docSnap => {
    const data = docSnap.data();
    const nameHe = data.nameHe || '';
    const name = data.name || '';
    const primaryMuscle = data.primaryMuscle || '';
    const category = data.category || '';
    const fullName = `${nameHe} ${name}`.toLowerCase();

    // --- Shoulder fixes ---
    if (category === 'shoulders' || primaryMuscle === 'posterior_deltoid' || primaryMuscle === 'anterior_deltoid') {
      if (primaryMuscle !== 'front_delt' && matchesAnyKeyword(fullName, SHOULDER_PRESS_KEYWORDS)) {
        fixes.push({ id: docSnap.id, nameHe, oldPrimaryMuscle: primaryMuscle, newPrimaryMuscle: 'front_delt', reason: 'לחיצת/דחיקת כתפיים = front_delt' });
        return;
      }
      if (primaryMuscle !== 'side_delt' && matchesAnyKeyword(fullName, LATERAL_RAISE_KEYWORDS)) {
        fixes.push({ id: docSnap.id, nameHe, oldPrimaryMuscle: primaryMuscle, newPrimaryMuscle: 'side_delt', reason: 'הרמה צדדית = side_delt' });
        return;
      }
      if (primaryMuscle === 'posterior_deltoid') {
        const isRearDelt = fullName.includes('reverse') || fullName.includes('הפוך') ||
          fullName.includes('face pull') || fullName.includes('rear') ||
          fullName.includes('אחורית') || fullName.includes('אחורי');

        if (isRearDelt) {
          fixes.push({ id: docSnap.id, nameHe, oldPrimaryMuscle: primaryMuscle, newPrimaryMuscle: 'rear_delt', reason: 'posterior_deltoid -> rear_delt (ID נכון)' });
        } else {
          fixes.push({ id: docSnap.id, nameHe, oldPrimaryMuscle: primaryMuscle, newPrimaryMuscle: 'front_delt', reason: 'posterior_deltoid שגוי -> front_delt' });
        }
        return;
      }
    }

    // --- Arm fixes ---
    if (category === 'arms') {
      if (primaryMuscle === 'triceps' && matchesAnyKeyword(fullName, CURL_KEYWORDS)) {
        fixes.push({ id: docSnap.id, nameHe, oldPrimaryMuscle: primaryMuscle, newPrimaryMuscle: 'biceps', reason: 'curl = biceps, לא triceps' });
        return;
      }
      if (primaryMuscle === 'biceps' && matchesAnyKeyword(fullName, TRICEP_EXTENSION_KEYWORDS)) {
        fixes.push({ id: docSnap.id, nameHe, oldPrimaryMuscle: primaryMuscle, newPrimaryMuscle: 'triceps', reason: 'extension = triceps, לא biceps' });
        return;
      }
    }
  });

  if (fixes.length > 0) {
    console.log(`\nExercises to fix: ${fixes.length}\n`);

    // Use batched writes
    const batch = db.batch();
    for (const fix of fixes) {
      const exerciseRef = db.collection('exercises').doc(fix.id);
      batch.update(exerciseRef, { primaryMuscle: fix.newPrimaryMuscle });
    }
    await batch.commit();

    console.log('--- Shoulder fixes ---');
    const shoulderFixes = fixes.filter(f =>
      f.newPrimaryMuscle === 'front_delt' || f.newPrimaryMuscle === 'side_delt' || f.newPrimaryMuscle === 'rear_delt'
    );
    shoulderFixes.forEach(f => {
      console.log(`  ${f.nameHe}: ${f.oldPrimaryMuscle} -> ${f.newPrimaryMuscle} (${f.reason})`);
    });

    console.log('\n--- Arm fixes ---');
    const armFixes = fixes.filter(f => f.newPrimaryMuscle === 'biceps' || f.newPrimaryMuscle === 'triceps');
    armFixes.forEach(f => {
      console.log(`  ${f.nameHe}: ${f.oldPrimaryMuscle} -> ${f.newPrimaryMuscle} (${f.reason})`);
    });

    console.log(`\nExercises: ${fixes.length} documents updated`);
    console.log(`  - Shoulder fixes: ${shoulderFixes.length}`);
    console.log(`  - Arm fixes: ${armFixes.length}`);
  } else {
    console.log('\nNo exercise fixes needed!');
  }

  // ---- SUMMARY ----
  console.log('\n' + '='.repeat(70));
  console.log('  SUMMARY');
  console.log('='.repeat(70));
  console.log(`  Muscles updated: ${musclesUpdated}`);
  console.log(`  Exercises updated: ${fixes.length}`);
  console.log(`  Total changes: ${musclesUpdated + fixes.length}`);
  console.log('='.repeat(70) + '\n');

  process.exit(0);
}

main().catch(err => {
  console.error('Error:', err.message || err);
  process.exit(1);
});
