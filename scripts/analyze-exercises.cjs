/**
 * Script to analyze exercises and their primaryMuscle values
 * Run with: node scripts/analyze-exercises.cjs
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBnT7jmxMGK8R63hCZG7kLXSFRzBiJajmY",
  authDomain: "gymiq-e8b4e.firebaseapp.com",
  projectId: "gymiq-e8b4e",
  storageBucket: "gymiq-e8b4e.firebasestorage.app",
  messagingSenderId: "92421097270",
  appId: "1:92421097270:web:2dfca17764402c31f1ea63"
};

// Valid muscle IDs (from MuscleManager)
const VALID_MUSCLE_IDS = new Set([
  'cardio', 'arms', 'back', 'chest', 'core', 'glutes', 'legs', 'shoulders'
]);

async function analyzeExercises() {
  console.log('Initializing Firebase...');
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  console.log('Fetching exercises...\n');
  const exercisesRef = collection(db, 'exercises');
  const snapshot = await getDocs(exercisesRef);

  const byPrimaryMuscle = {};
  const byCategory = {};
  const issues = [];

  snapshot.docs.forEach(doc => {
    const data = doc.data();
    const primaryMuscle = data.primaryMuscle || '(empty)';
    const category = data.category || '(empty)';

    // Group by primaryMuscle
    if (!byPrimaryMuscle[primaryMuscle]) {
      byPrimaryMuscle[primaryMuscle] = [];
    }
    byPrimaryMuscle[primaryMuscle].push({
      id: doc.id,
      nameHe: data.nameHe,
      category: category
    });

    // Group by category
    if (!byCategory[category]) {
      byCategory[category] = [];
    }
    byCategory[category].push({
      id: doc.id,
      nameHe: data.nameHe,
      primaryMuscle: primaryMuscle
    });

    // Check for issues
    if (!data.primaryMuscle || data.primaryMuscle.trim() === '') {
      issues.push({
        id: doc.id,
        nameHe: data.nameHe,
        issue: 'Missing primaryMuscle',
        category: category
      });
    } else if (!VALID_MUSCLE_IDS.has(data.primaryMuscle)) {
      issues.push({
        id: doc.id,
        nameHe: data.nameHe,
        issue: `Invalid primaryMuscle: ${data.primaryMuscle}`,
        category: category,
        currentPrimaryMuscle: data.primaryMuscle
      });
    }
  });

  // Print summary
  console.log('='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total exercises: ${snapshot.size}`);
  console.log(`Exercises with issues: ${issues.length}`);

  console.log('\n' + '='.repeat(60));
  console.log('EXERCISES BY primaryMuscle');
  console.log('='.repeat(60));
  Object.entries(byPrimaryMuscle)
    .sort((a, b) => b[1].length - a[1].length)
    .forEach(([muscle, exercises]) => {
      const isValid = VALID_MUSCLE_IDS.has(muscle) ? '✅' : '❌';
      console.log(`\n${isValid} ${muscle}: ${exercises.length} exercises`);
      if (!VALID_MUSCLE_IDS.has(muscle) || muscle === '(empty)') {
        exercises.slice(0, 5).forEach(ex => {
          console.log(`   - ${ex.nameHe} (category: ${ex.category})`);
        });
        if (exercises.length > 5) {
          console.log(`   ... and ${exercises.length - 5} more`);
        }
      }
    });

  console.log('\n' + '='.repeat(60));
  console.log('EXERCISES BY category');
  console.log('='.repeat(60));
  Object.entries(byCategory)
    .sort((a, b) => b[1].length - a[1].length)
    .forEach(([cat, exercises]) => {
      console.log(`\n${cat}: ${exercises.length} exercises`);
    });

  if (issues.length > 0) {
    console.log('\n' + '='.repeat(60));
    console.log('ISSUES TO FIX');
    console.log('='.repeat(60));
    issues.forEach((issue, i) => {
      console.log(`\n${i + 1}. ${issue.nameHe}`);
      console.log(`   ID: ${issue.id}`);
      console.log(`   Issue: ${issue.issue}`);
      console.log(`   Category: ${issue.category}`);
      if (issue.currentPrimaryMuscle) {
        console.log(`   Current primaryMuscle: ${issue.currentPrimaryMuscle}`);
      }
    });
  }

  process.exit(0);
}

analyzeExercises().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
