/**
 * Script to fix exercise categories
 * Run with: node scripts/fix-exercise-category.cjs
 */

const { collection, getDocs, doc, updateDoc } = require('firebase/firestore');
const { db } = require('./firebase-config.cjs');

// Valid categories
const VALID_CATEGORIES = new Set([
  'chest', 'back', 'legs', 'shoulders', 'arms', 'core',
  'cardio', 'functional', 'stretching', 'warmup'
]);

// Suggested category mapping
const suggestedCategory = {
  gluteus_maximus: 'legs',
  glutes: 'legs',
  quadriceps: 'legs',
  hamstrings: 'legs',
  calves: 'legs',
  biceps: 'arms',
  triceps: 'arms',
  forearms: 'arms',
  lats: 'back',
  traps: 'back',
  rhomboids: 'back',
  lower_back: 'back',
  longissimus: 'back',
  abs: 'core',
  obliques: 'core',
};

async function fixExercises() {
  console.log('Fetching exercises...\n');
  const exercisesRef = collection(db, 'exercises');
  const snapshot = await getDocs(exercisesRef);

  const toFix = [];

  snapshot.docs.forEach(docSnap => {
    const data = docSnap.data();
    const category = data.category;
    const nameHe = data.nameHe || data.name;

    // Check for invalid categories
    if (!category || !VALID_CATEGORIES.has(category)) {
      const newCategory = suggestedCategory[category] || suggestedCategory[data.primaryMuscle] || 'legs';
      toFix.push({
        id: docSnap.id,
        nameHe,
        currentCategory: category,
        newCategory,
        primaryMuscle: data.primaryMuscle,
      });
    }

    // Also look for "היפטראסט" to verify it's correct
    if (nameHe && nameHe.includes('היפטראסט')) {
      console.log(`Found היפטראסט: ${nameHe}`);
      console.log(`  ID: ${docSnap.id}`);
      console.log(`  category: ${category}`);
      console.log(`  primaryMuscle: ${data.primaryMuscle}`);
      console.log('');
    }
  });

  if (toFix.length === 0) {
    console.log('No exercises to fix!');
    process.exit(0);
  }

  console.log(`Found ${toFix.length} exercises to fix:\n`);
  toFix.forEach((ex, i) => {
    console.log(`${i + 1}. ${ex.nameHe}`);
    console.log(`   ${ex.currentCategory} → ${ex.newCategory}`);
  });

  console.log('\nFixing exercises...\n');

  for (const ex of toFix) {
    const docRef = doc(db, 'exercises', ex.id);
    await updateDoc(docRef, { category: ex.newCategory });
    console.log(`✓ Fixed: ${ex.nameHe} (${ex.currentCategory} → ${ex.newCategory})`);
  }

  console.log('\nDone!');
  process.exit(0);
}

fixExercises().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
