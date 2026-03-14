/**
 * Migration script: Replace category "arms" with "biceps_brachii" / "triceps"
 * in the exercises collection.
 *
 * Usage:
 *   node scripts/migrate-arms-to-specific-muscles.cjs          # dry-run
 *   node scripts/migrate-arms-to-specific-muscles.cjs --apply  # apply changes
 *
 * Does NOT touch workoutHistory — legacy data handled by resolveLegacyMuscleCategory()
 */

const { db } = require('./firebase-config.cjs');
const { collection, getDocs, doc, updateDoc, terminate } = require('firebase/firestore');

async function migrate() {
  const dryRun = !process.argv.includes('--apply');

  console.log(dryRun ? '🔍 DRY RUN — no changes will be made\n' : '🚀 APPLYING CHANGES\n');

  const exercisesRef = collection(db, 'exercises');
  const snapshot = await getDocs(exercisesRef);

  const toUpdate = [];
  const skipped = [];

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    if (data.category !== 'arms') continue;

    const pm = data.primaryMuscle || '';
    let newCategory;

    if (pm === 'triceps' || pm === 'triceps_brachii') {
      newCategory = 'triceps';
    } else if (pm === 'biceps' || pm === 'biceps_brachii' || pm === 'forearms' || pm === 'brachialis') {
      newCategory = 'biceps_brachii';
    } else {
      skipped.push({ id: docSnap.id, name: data.name, primaryMuscle: pm });
      continue;
    }

    toUpdate.push({
      id: docSnap.id,
      name: data.name || data.nameHe,
      oldCategory: 'arms',
      newCategory,
      primaryMuscle: pm,
    });
  }

  // Report
  console.log(`Found ${toUpdate.length} exercises to update:`);
  for (const ex of toUpdate) {
    console.log(`  ${ex.name} (${ex.id}): arms → ${ex.newCategory} (primaryMuscle: ${ex.primaryMuscle})`);
  }

  if (skipped.length > 0) {
    console.log(`\n⚠️  Skipped ${skipped.length} exercises (unknown primaryMuscle):`);
    for (const ex of skipped) {
      console.log(`  ${ex.name} (${ex.id}): primaryMuscle="${ex.primaryMuscle}"`);
    }
  }

  if (dryRun) {
    console.log('\n✅ Dry run complete. Run with --apply to execute.');
    await terminate(db);
    process.exit(0);
  }

  // Apply
  let updated = 0;
  for (const ex of toUpdate) {
    const docRef = doc(db, 'exercises', ex.id);
    await updateDoc(docRef, { category: ex.newCategory });
    updated++;
    console.log(`  ✅ Updated: ${ex.name}`);
  }

  console.log(`\n✅ Migration complete. Updated ${updated} exercises.`);
  await terminate(db);
  process.exit(0);
}

migrate().catch(async (err) => {
  console.error('Migration failed:', err);
  await terminate(db);
  process.exit(1);
});
