/**
 * Find exercises where category and primaryMuscle don't match
 */

require('dotenv').config();
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Mapping: which primaryMuscle values belong to which category
const muscleToCategory = {
  // Legs
  glutes: 'legs', gluteus_maximus: 'legs', gluteus_medius: 'legs',
  quads: 'legs', quadriceps: 'legs', hamstrings: 'legs',
  calves: 'legs', gastrocnemius: 'legs', adductors: 'legs', abductors: 'legs',
  hip_flexors: 'legs', legs: 'legs',

  // Back
  back: 'back', lats: 'back', latissimus_dorsi: 'back',
  traps: 'back', trapezius: 'back', rhomboids: 'back',
  lower_back: 'back', erector_spinae: 'back', longissimus: 'back',
  upper_back: 'back', mid_back: 'back',

  // Chest
  chest: 'chest', pectoralis: 'chest', pectoralis_major: 'chest',
  upper_chest: 'chest', lower_chest: 'chest', mid_chest: 'chest',

  // Arms
  arms: 'arms', biceps: 'arms', biceps_brachii: 'arms',
  triceps: 'arms', triceps_brachii: 'arms',
  forearms: 'arms', brachialis: 'arms',

  // Shoulders
  shoulders: 'shoulders', deltoids: 'shoulders',
  front_delt: 'shoulders', side_delt: 'shoulders', rear_delt: 'shoulders',
  anterior_deltoid: 'shoulders', lateral_deltoid: 'shoulders', posterior_deltoid: 'shoulders',
  rotator_cuff: 'shoulders',

  // Core
  core: 'core', abs: 'core', obliques: 'core',
  lower_abs: 'core', upper_abs: 'core',
  transverse_abdominis: 'core', rectus_abdominis: 'core',

  // Special categories (these match themselves)
  cardio: 'cardio', warmup: 'warmup', functional: 'functional', stretching: 'stretching',
};

async function findMismatches() {
  console.log('Fetching exercises from Firebase...\n');

  const exercisesRef = collection(db, 'exercises');
  const snapshot = await getDocs(exercisesRef);

  const mismatches = [];
  const unknownMuscles = new Set();

  snapshot.docs.forEach(doc => {
    const data = doc.data();
    const category = data.category;
    const primaryMuscle = data.primaryMuscle;

    if (!category || !primaryMuscle) return;

    // Get expected category for this primaryMuscle
    const expectedCategory = muscleToCategory[primaryMuscle];

    if (!expectedCategory) {
      unknownMuscles.add(primaryMuscle);
      return;
    }

    // Check if they match
    if (expectedCategory !== category) {
      mismatches.push({
        id: doc.id,
        nameHe: data.nameHe || data.name,
        name: data.name,
        category,
        primaryMuscle,
        expectedCategory,
      });
    }
  });

  console.log('='.repeat(60));
  console.log('תרגילים עם חוסר התאמה בין category ל-primaryMuscle');
  console.log('='.repeat(60));
  console.log('\nסה"כ נמצאו:', mismatches.length, 'תרגילים\n');

  if (mismatches.length > 0) {
    mismatches.forEach((ex, i) => {
      console.log(`${i+1}. ${ex.nameHe} (${ex.name})`);
      console.log(`   ID: ${ex.id}`);
      console.log(`   category: ${ex.category} | primaryMuscle: ${ex.primaryMuscle}`);
      console.log(`   ⚠️  primaryMuscle "${ex.primaryMuscle}" שייך ל-"${ex.expectedCategory}", לא ל-"${ex.category}"`);
      console.log('');
    });
  }

  if (unknownMuscles.size > 0) {
    console.log('\n' + '='.repeat(60));
    console.log('ערכי primaryMuscle לא מוכרים:');
    console.log('='.repeat(60));
    Array.from(unknownMuscles).sort().forEach(m => console.log('  - ' + m));
  }

  process.exit(0);
}

findMismatches().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
