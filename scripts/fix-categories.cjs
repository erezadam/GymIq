/**
 * Script to fix exercises with invalid categories
 * Run with: node scripts/fix-categories.cjs
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, doc, updateDoc } = require('firebase/firestore');

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBnT7jmxMGK8R63hCZG7kLXSFRzBiJajmY",
  authDomain: "gymiq-e8b4e.firebaseapp.com",
  projectId: "gymiq-e8b4e",
  storageBucket: "gymiq-e8b4e.firebasestorage.app",
  messagingSenderId: "92421097270",
  appId: "1:92421097270:web:2dfca17764402c31f1ea63"
};

// Exercises to fix
const exercisesToFix = [
  { id: "Hfa5YoHu9j88evuBE5XW", nameHe: "אופניים נייחים בדיווש אופקי", newCategory: "cardio" },
  { id: "KaC7dbGCPEEtlppiWK2K", nameHe: "הליכון", newCategory: "cardio" },
  { id: "R29ea1XKRxWmlqaryCAM", nameHe: "מדרגות", newCategory: "cardio" },
  { id: "arf3iUkOzGWGNvnUVWH4", nameHe: "מכשיר-אליפטי", newCategory: "cardio" },
  { id: "b1EqSp0s3yqv8bpI2Pnn", nameHe: "סטפר", newCategory: "cardio" },
  { id: "fuTYUAneJPnZ6ULTLucn", nameHe: "חתירה", newCategory: "cardio" },
  { id: "zYBjjjzKoo4C57seLZ8f", nameHe: "חימום", newCategory: "warmup" },
  { id: "UlFsp2JWjSaJXqxH50Np", nameHe: "פשיטת גו מלאה בכיסא רומי", newCategory: "back" },
  { id: "ZnmjmlIkyyIAskc1Qczo", nameHe: "היפטראסט על רגל אחת", newCategory: "legs" },
];

const categoryHe = {
  cardio: 'אירובי',
  warmup: 'חימום',
  back: 'גב',
  legs: 'רגליים',
};

async function fixCategories() {
  console.log('Initializing Firebase...');
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  console.log(`\nUpdating ${exercisesToFix.length} exercises...\n`);

  let successCount = 0;
  let errorCount = 0;

  for (const exercise of exercisesToFix) {
    try {
      const exerciseRef = doc(db, 'exercises', exercise.id);
      await updateDoc(exerciseRef, {
        category: exercise.newCategory
      });
      console.log(`✅ ${exercise.nameHe} → ${categoryHe[exercise.newCategory]} (${exercise.newCategory})`);
      successCount++;
    } catch (error) {
      console.log(`❌ ${exercise.nameHe} - Error: ${error.message}`);
      errorCount++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`Done! Success: ${successCount}, Errors: ${errorCount}`);
  console.log('='.repeat(50));

  process.exit(0);
}

fixCategories().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
