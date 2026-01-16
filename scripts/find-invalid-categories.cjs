/**
 * Script to find exercises with invalid categories
 * Run with: node scripts/find-invalid-categories.cjs
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

// Firebase config (same as in the app)
const firebaseConfig = {
  apiKey: "AIzaSyBnT7jmxMGK8R63hCZG7kLXSFRzBiJajmY",
  authDomain: "gymiq-e8b4e.firebaseapp.com",
  projectId: "gymiq-e8b4e",
  storageBucket: "gymiq-e8b4e.firebasestorage.app",
  messagingSenderId: "92421097270",
  appId: "1:92421097270:web:2dfca17764402c31f1ea63"
};

// Valid categories
const VALID_CATEGORIES = new Set([
  'chest', 'back', 'legs', 'shoulders', 'arms', 'core',
  'cardio', 'functional', 'stretching', 'warmup'
]);

// Category translations for display
const categoryHe = {
  chest: 'חזה',
  back: 'גב',
  legs: 'רגליים',
  shoulders: 'כתפיים',
  arms: 'זרועות',
  core: 'ליבה',
  cardio: 'אירובי',
  functional: 'פונקציונלי',
  stretching: 'מתיחות',
  warmup: 'חימום',
};

// Suggested category mapping based on muscle/category
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
  abs: 'core',
  obliques: 'core',
  chest: 'chest',
  shoulders: 'shoulders',
  deltoids: 'shoulders',
};

async function findInvalidCategories() {
  console.log('Initializing Firebase...');
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  console.log('Fetching exercises...\n');
  const exercisesRef = collection(db, 'exercises');
  const snapshot = await getDocs(exercisesRef);

  const invalidExercises = [];
  const validCount = { total: 0, byCategory: {} };

  snapshot.docs.forEach(doc => {
    const data = doc.data();
    const category = data.category;

    validCount.total++;

    if (!category || !VALID_CATEGORIES.has(category)) {
      invalidExercises.push({
        id: doc.id,
        nameHe: data.nameHe || data.name,
        name: data.name,
        currentCategory: category || '(empty)',
        primaryMuscle: data.primaryMuscle,
        suggestedCategory: suggestedCategory[category] || suggestedCategory[data.primaryMuscle] || 'legs',
      });
    } else {
      validCount.byCategory[category] = (validCount.byCategory[category] || 0) + 1;
    }
  });

  console.log('='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total exercises: ${validCount.total}`);
  console.log(`Valid categories: ${validCount.total - invalidExercises.length}`);
  console.log(`Invalid categories: ${invalidExercises.length}`);
  console.log('\nValid category distribution:');
  Object.entries(validCount.byCategory).sort((a, b) => b[1] - a[1]).forEach(([cat, count]) => {
    console.log(`  ${categoryHe[cat] || cat} (${cat}): ${count}`);
  });

  if (invalidExercises.length > 0) {
    console.log('\n' + '='.repeat(60));
    console.log('EXERCISES WITH INVALID CATEGORIES');
    console.log('='.repeat(60));

    invalidExercises.forEach((ex, i) => {
      console.log(`\n${i + 1}. ${ex.nameHe} (${ex.name})`);
      console.log(`   ID: ${ex.id}`);
      console.log(`   Current category: ${ex.currentCategory}`);
      console.log(`   Primary muscle: ${ex.primaryMuscle}`);
      console.log(`   Suggested: ${ex.suggestedCategory} (${categoryHe[ex.suggestedCategory]})`);
    });

    // Output JSON for easy processing
    console.log('\n' + '='.repeat(60));
    console.log('JSON FOR UPDATE:');
    console.log('='.repeat(60));
    console.log(JSON.stringify(invalidExercises.map(ex => ({
      id: ex.id,
      nameHe: ex.nameHe,
      currentCategory: ex.currentCategory,
      newCategory: ex.suggestedCategory,
    })), null, 2));
  }

  process.exit(0);
}

findInvalidCategories().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
