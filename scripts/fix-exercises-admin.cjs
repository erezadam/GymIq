/**
 * Fix exercises with category/primaryMuscle mismatch
 * Uses Firebase Admin SDK with Application Default Credentials
 *
 * First run: gcloud auth application-default login
 * Then: node scripts/fix-exercises-admin.cjs
 */

const admin = require('firebase-admin');

// Initialize with Application Default Credentials
admin.initializeApp({
  projectId: 'gymiq-e8b4e',
});

const db = admin.firestore();

const fixes = [
  {
    id: 'ZnmjmlIkyyIAskc1Qczo',
    name: 'היפטראסט על רגל אחת',
    field: 'primaryMuscle',
    oldValue: 'back',
    newValue: 'glutes',
  },
  {
    id: 'eQBfnsTE7HUUZedRZZeq',
    name: 'פשיטת הגב בכיסא רומי',
    field: 'category',
    oldValue: 'gluteus_maximus',
    newValue: 'back',
  },
  {
    id: 'hwlNIagAXwe5TSvo1C5c',
    name: 'Superman',
    field: 'primaryMuscle',
    oldValue: 'back',
    newValue: 'lower_back',
  },
];

async function fixExercises() {
  console.log('מתקן תרגילים...\n');

  for (const fix of fixes) {
    try {
      const docRef = db.collection('exercises').doc(fix.id);
      const doc = await docRef.get();

      if (!doc.exists) {
        console.log(`❌ לא נמצא: ${fix.name} (${fix.id})`);
        continue;
      }

      const data = doc.data();
      const currentValue = data[fix.field];

      if (currentValue === fix.newValue) {
        console.log(`✓ כבר תוקן: ${fix.name}`);
        continue;
      }

      if (currentValue !== fix.oldValue) {
        console.log(`⚠️ ערך שונה מהצפוי: ${fix.name}`);
        console.log(`   ${fix.field}: "${currentValue}" (צפוי: "${fix.oldValue}")`);
        continue;
      }

      await docRef.update({ [fix.field]: fix.newValue });
      console.log(`✅ תוקן: ${fix.name}`);
      console.log(`   ${fix.field}: "${fix.oldValue}" → "${fix.newValue}"`);
    } catch (error) {
      console.error(`❌ שגיאה ב-${fix.name}:`, error.message);
    }
  }

  console.log('\nסיום!');
  process.exit(0);
}

fixExercises().catch((err) => {
  console.error('שגיאה:', err.message);
  process.exit(1);
});
