/**
 * Script to fix exercises with invalid primaryMuscle values
 * Maps specific muscles to their parent muscle group
 * Run with: node scripts/fix-primary-muscles.cjs
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, updateDoc } = require('firebase/firestore');

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBnT7jmxMGK8R63hCZG7kLXSFRzBiJajmY",
  authDomain: "gymiq-e8b4e.firebaseapp.com",
  projectId: "gymiq-e8b4e",
  storageBucket: "gymiq-e8b4e.firebasestorage.app",
  messagingSenderId: "92421097270",
  appId: "1:92421097270:web:2dfca17764402c31f1ea63"
};

// Mapping from specific muscles to parent muscle groups
// These are the valid IDs from MuscleManager
const MUSCLE_MAPPING = {
  // Legs
  'quadriceps': 'legs',
  'hamstrings': 'legs',
  'quads': 'legs',
  'calves': 'legs',
  'gastrocnemius': 'legs',
  'gastrocnemius_soleus': 'legs',
  'adductors': 'legs',
  'abductors': 'legs',
  'hip_flexors': 'legs',

  // Back
  'lats': 'back',
  'latissimus_dorsi': 'back',
  'trapezius': 'back',
  'traps': 'back',
  'rhomboids': 'back',
  'erector_spinae': 'back',
  'longissimus': 'back',
  'lower_back': 'back',
  'upper_back': 'back',
  'mid_back': 'back',

  // Arms
  'biceps': 'arms',
  'biceps_brachii': 'arms',
  'triceps': 'arms',
  'triceps_brachii': 'arms',
  'forearms': 'arms',
  'brachialis': 'arms',

  // Shoulders
  'deltoids': 'shoulders',
  'front_delt': 'shoulders',
  'side_delt': 'shoulders',
  'rear_delt': 'shoulders',
  'anterior_deltoid': 'shoulders',
  'lateral_deltoid': 'shoulders',
  'posterior_deltoid': 'shoulders',
  'rotator_cuff': 'shoulders',

  // Core
  'abs': 'core',
  'lower_abs': 'core',
  'upper_abs': 'core',
  'obliques': 'core',
  'transverse_abdominis': 'core',
  'rectus_abdominis': 'core',

  // Chest
  'pectoralis': 'chest',
  'pectoralis_major': 'chest',
  'upper_chest': 'chest',
  'lower_chest': 'chest',
  'middle_chest': 'chest',
  'mid_chest': 'chest',

  // Glutes
  'gluteus_maximus': 'glutes',
  'gluteus_medius': 'glutes',
  'gluteus_minimus': 'glutes',

  // Cardio - Hebrew variations
  'חימום': 'cardio',
  'אירובי': 'cardio',
  'aerobic': 'cardio',
  'warmup': 'cardio',
};

// Valid muscle IDs (from MuscleManager)
const VALID_MUSCLE_IDS = new Set([
  'cardio', 'arms', 'back', 'chest', 'core', 'glutes', 'legs', 'shoulders'
]);

async function fixPrimaryMuscles() {
  console.log('Initializing Firebase...');
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  console.log('Fetching exercises...\n');
  const exercisesRef = collection(db, 'exercises');
  const snapshot = await getDocs(exercisesRef);

  const toFix = [];

  snapshot.docs.forEach(docSnapshot => {
    const data = docSnapshot.data();
    const currentPrimaryMuscle = data.primaryMuscle;

    // Skip if already valid
    if (VALID_MUSCLE_IDS.has(currentPrimaryMuscle)) {
      return;
    }

    // Check if we have a mapping
    const newPrimaryMuscle = MUSCLE_MAPPING[currentPrimaryMuscle];

    if (newPrimaryMuscle) {
      toFix.push({
        id: docSnapshot.id,
        nameHe: data.nameHe,
        current: currentPrimaryMuscle,
        new: newPrimaryMuscle,
        category: data.category
      });
    } else if (currentPrimaryMuscle) {
      // If no mapping found, try to use category as fallback
      if (VALID_MUSCLE_IDS.has(data.category)) {
        toFix.push({
          id: docSnapshot.id,
          nameHe: data.nameHe,
          current: currentPrimaryMuscle,
          new: data.category,
          category: data.category,
          usedCategory: true
        });
      } else {
        console.log(`⚠️ No mapping for: ${currentPrimaryMuscle} (${data.nameHe})`);
      }
    }
  });

  console.log('='.repeat(60));
  console.log(`Found ${toFix.length} exercises to fix`);
  console.log('='.repeat(60));

  if (toFix.length === 0) {
    console.log('Nothing to fix!');
    process.exit(0);
  }

  // Show what will be fixed
  console.log('\nChanges to be made:\n');
  const byChange = {};
  toFix.forEach(item => {
    const key = `${item.current} → ${item.new}`;
    if (!byChange[key]) byChange[key] = [];
    byChange[key].push(item.nameHe);
  });

  Object.entries(byChange).forEach(([change, exercises]) => {
    console.log(`${change}: ${exercises.length} exercises`);
    exercises.slice(0, 3).forEach(name => console.log(`   - ${name}`));
    if (exercises.length > 3) {
      console.log(`   ... and ${exercises.length - 3} more`);
    }
  });

  // Ask for confirmation
  console.log('\n' + '='.repeat(60));
  console.log('Applying fixes...');
  console.log('='.repeat(60) + '\n');

  let successCount = 0;
  let errorCount = 0;

  for (const item of toFix) {
    try {
      const exerciseRef = doc(db, 'exercises', item.id);
      await updateDoc(exerciseRef, {
        primaryMuscle: item.new
      });
      console.log(`✅ ${item.nameHe}: ${item.current} → ${item.new}`);
      successCount++;
    } catch (error) {
      console.log(`❌ ${item.nameHe}: ${error.message}`);
      errorCount++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`Done! Success: ${successCount}, Errors: ${errorCount}`);
  console.log('='.repeat(60));

  process.exit(0);
}

fixPrimaryMuscles().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
