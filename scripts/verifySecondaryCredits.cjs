/**
 * Verify secondaryMuscleCredits migration
 * Compares old hardcoded SECONDARY_MUSCLE_MULTIPLIERS with Firebase data
 *
 * Run: node scripts/verifySecondaryCredits.cjs
 */

const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({ projectId: 'gymiq-e8b4e' });
}
const db = admin.firestore();

// Old hardcoded mapping (from TrainingAnalysis.tsx before migration)
const OLD_HARDCODED = {
  // triceps — 46
  "C3pf1VvSCuGxIA4oWzXI": { triceps: 0.5 },
  "eY2MblJj94vJtV6A0Zlz": { triceps: 0.5 },
  "dvZ4iMKZYKUDaheoJVCh": { triceps: 0.5 },
  "AspsDoRT9GPQOw0fYANa": { triceps: 0.5 },
  "hdJjAx3KMp5XbuQ7UNfW": { triceps: 0.5 },
  "Q8mHNGehBzxjDpc1dW8B": { triceps: 0.5 },
  "Xriss1E6kkY8nSnmyWKi": { triceps: 0.5 },
  "JnGWwa2vNbmaVxSr3li1": { triceps: 0.5 },
  "79pWk66pXALdv4ku2pTI": { triceps: 0.5 },
  "HL6Eq8eEfk1f6sl5R6Wq": { triceps: 0.5 },
  "aNKatCW6yKjWCLsWgoXp": { triceps: 0.5 },
  "0dqf0j0YQJAGf6NEMTv4": { triceps: 0.5 },
  "oE3M2FaQeaMU5hTeOkOj": { triceps: 0.5 },
  "zrnZmmlaOswF17Vi6ED2": { triceps: 0.5 },
  "n9quUbtf4CsIsnuP6ypJ": { triceps: 0.5 },
  "p4B9Utw3H50XD1khsVHP": { triceps: 0.5 },
  "TxiHxnar1u50kdNpJIPq": { triceps: 0.5 },
  "S2LAJAVDoYDpSP2J5LvJ": { triceps: 0.5 },
  "mKdO3inl3UVXkCfxyjSy": { triceps: 0.5 },
  "Fbw48H0eQfwvkmuye8o8": { triceps: 0.5 },
  "vTnBmyUqMoN5ikXdKONL": { triceps: 0.5 },
  "y9KWVXtSxcED7JQMpSRP": { triceps: 0.5 },
  "fdOOiWXvidgtp4JJ89uM": { triceps: 0.5 },
  "mgcEsYQyu7WTyeajQEkp": { triceps: 0.5 },
  "Pq8DXb7jtiDUoavcK7fO": { triceps: 0.5 },
  "f8yIQDvYF2M4LrPldgg8": { triceps: 0.5 },
  "4o86htIR7D1BC41ilIn9": { triceps: 0.5 },
  "uEttMMdBAEBLszuPTXCJ": { triceps: 0.5 },
  "Xpd2fI0MmOw8mHTYQjEx": { triceps: 0.5 },
  "2UGewyMR1snvp8qMRUz9": { triceps: 0.5 },
  "ZCwrx8BbUvf3mpJ2Jd3E": { triceps: 0.5 },
  "ABOinRwCsKTqDRk52HYM": { triceps: 0.5 },
  "nJtiUP2tORtm7uKqmKOu": { triceps: 0.5 },
  "BOwkhUUPpfWUPug9BsOf": { triceps: 0.5 },
  "Vk3sCZwlvdFOJC5tT3cd": { triceps: 0.5 },
  "llmh4oU99aNtS1vKynO9": { triceps: 0.5 },
  "jEUEyDG9ATkKIBN60k5j": { triceps: 0.5 },
  "TaVCi6SMnlGPU44STvqB": { triceps: 0.5 },
  "4gl74RJQfLbj7VfeivTQ": { triceps: 0.5 },
  "AKur5L4ib30oZSHgC9Px": { triceps: 0.5 },
  "oAoj1ai8K9dc6B9EaFED": { triceps: 0.5 },
  "HKltSTpqJQlY9UXrSUCh": { triceps: 0.5 },
  "Pxffw0KFPTW4a2xyK7fo": { triceps: 0.5 },
  "eC3bgOTVRk6G3NL6Jc54": { triceps: 0.5 },
  "ixeY4g8dtzz8RpoCJtSS": { triceps: 0.5 },
  "ls2RllIGdrXboD5nrmf2": { triceps: 0.5 },
  // biceps_brachii — 19
  "rCKv4MPkwWRgDpvQXV5X": { biceps_brachii: 0.5 },
  "CGPoXMft40TvBJl63j3P": { biceps_brachii: 0.5 },
  "iN6CNbUITqLbPXYrVcA5": { biceps_brachii: 0.5 },
  "mcoW0pzyAWBcd5C1dXad": { biceps_brachii: 0.5 },
  "RLkPUj6WGQhlyHcr023o": { biceps_brachii: 0.5 },
  "cAWWTBOa7vMM5XBTRstp": { biceps_brachii: 0.5 },
  "15EoZ3DZm4pMas9pEb8c": { biceps_brachii: 0.5 },
  "otCaAzOw0KvT8ONW1v1D": { biceps_brachii: 0.5 },
  "4mAbkf0hesykvFmFSD8k": { biceps_brachii: 0.5 },
  "Xoh0Dwe168xMDsDpkNgb": { biceps_brachii: 0.5 },
  "qjZ1cDTKn4WnRrORZCvR": { biceps_brachii: 0.5 },
  "KItcETHzIHJXCGt4duOM": { biceps_brachii: 0.5 },
  "dclvw5ufIebkrbA9du5B": { biceps_brachii: 0.5 },
  "uZCw91GV42PurHafWFe7": { biceps_brachii: 0.5 },
  "ha6rSmUuqmK6v2rjiTB1": { biceps_brachii: 0.5 },
  "U9liue4N8IB3vetWz2wI": { biceps_brachii: 0.5 },
  "e8gWq4e1zsqZ3kiKepWk": { biceps_brachii: 0.5 },
  "D2KUzrI3guPkMr356uGH": { biceps_brachii: 0.5 },
  "BwVQyCeg3DqNPFqdJser": { biceps_brachii: 0.5 },
  // gluteus_maximus — 17
  "QxbXQO77g3ewGnY7PISJ": { gluteus_maximus: 0.5 },
  "M3Wl6PplSjEyPFAqTQhr": { gluteus_maximus: 0.5 },
  "dkiOoNRC6InMJx6HvNCs": { gluteus_maximus: 0.5 },
  "1ISbykeW2hJz7l6Ag1eh": { gluteus_maximus: 0.5 },
  "ldyvkdv5EtQBg6nqMzDp": { gluteus_maximus: 0.5 },
  "6zA32kE09TDiaH4LJJv6": { gluteus_maximus: 0.5 },
  "UlFsp2JWjSaJXqxH50Np": { gluteus_maximus: 0.5 },
  "LUAX1e9H0zoUFEP7l3A6": { gluteus_maximus: 0.5 },
  "1ZwvAMeZeqXyx3oIJvPO": { gluteus_maximus: 0.5 },
  "FN6bKdNWcEgHjqrTPvbu": { gluteus_maximus: 0.5 },
  "R968BsNAAeIweal039f2": { gluteus_maximus: 0.5 },
  "9lqCm9PgTffJfwAcSVCe": { gluteus_maximus: 0.5 },
  "TvxDt0y03gmzOZzspHyU": { gluteus_maximus: 0.5 },
  "JClCPcKWAxKiuy7KIgRB": { gluteus_maximus: 0.5 },
  "eqLYs7TORwMcF6DmezaU": { gluteus_maximus: 0.5 },
  "R29ea1XKRxWmlqaryCAM": { gluteus_maximus: 0.5 },
  "eRubABEIIHyzJ7YCzhSe": { gluteus_maximus: 0.5 },
};

async function main() {
  const oldIds = Object.keys(OLD_HARDCODED);
  console.log(`\n📊 Comparing ${oldIds.length} hardcoded exercises with Firebase...\n`);

  // Fetch all exercises from Firebase
  const snapshot = await db.collection('exercises').get();
  const firebaseMap = new Map();
  snapshot.forEach(doc => {
    firebaseMap.set(doc.id, { ...doc.data(), id: doc.id });
  });

  const rows = [];
  let matchCount = 0;
  let mismatchCount = 0;
  let missingCount = 0;

  // Check each hardcoded exercise
  for (const [id, oldCredits] of Object.entries(OLD_HARDCODED)) {
    const oldMuscles = Object.keys(oldCredits);
    const fbExercise = firebaseMap.get(id);

    if (!fbExercise) {
      rows.push({ id, name: '??? (NOT FOUND)', oldCredits: oldMuscles, newCredits: [], status: '❌ MISSING' });
      missingCount++;
      continue;
    }

    const newCredits = fbExercise.secondaryMuscleCredits || [];
    const oldSorted = oldMuscles.sort().join(',');
    const newSorted = [...newCredits].sort().join(',');

    if (oldSorted === newSorted) {
      rows.push({ id, name: fbExercise.nameHe || fbExercise.name, oldCredits: oldMuscles, newCredits, status: '✅' });
      matchCount++;
    } else {
      rows.push({ id, name: fbExercise.nameHe || fbExercise.name, oldCredits: oldMuscles, newCredits, status: '⚠️ MISMATCH' });
      mismatchCount++;
    }
  }

  // Check for exercises in Firebase that have secondaryMuscleCredits but weren't in old hardcoded
  const extraInFirebase = [];
  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.secondaryMuscleCredits && data.secondaryMuscleCredits.length > 0 && !OLD_HARDCODED[doc.id]) {
      extraInFirebase.push({ id: doc.id, name: data.nameHe || data.name, credits: data.secondaryMuscleCredits });
    }
  });

  // Print table
  console.log('| # | שם תרגיל | קוד ישן | Firebase | סטטוס |');
  console.log('|---|----------|---------|----------|-------|');
  rows.forEach((row, i) => {
    console.log(`| ${i + 1} | ${row.name.substring(0, 25).padEnd(25)} | ${row.oldCredits.join(',')} | ${row.newCredits.join(',')} | ${row.status} |`);
  });

  console.log(`\n═══════════════════════════════════════`);
  console.log(`✅ Match:    ${matchCount}`);
  console.log(`⚠️  Mismatch: ${mismatchCount}`);
  console.log(`❌ Missing:  ${missingCount}`);
  console.log(`Total:       ${oldIds.length}`);

  if (extraInFirebase.length > 0) {
    console.log(`\n🆕 Exercises in Firebase with secondaryMuscleCredits NOT in old hardcoded:`);
    extraInFirebase.forEach(e => {
      console.log(`   ${e.name} (${e.id}) → ${e.credits.join(', ')}`);
    });
  } else {
    console.log(`\n📌 No extra exercises in Firebase beyond the old hardcoded list.`);
  }

  // Count exercises in Firebase without credits that might need them
  // (chest/shoulder exercises that use triceps, back exercises that use biceps, leg exercises that use glutes)
  const potentialMissing = [];
  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.secondaryMuscleCredits && data.secondaryMuscleCredits.length > 0) return;
    if (OLD_HARDCODED[doc.id]) return; // already handled
    const cat = data.category;
    const pm = data.primaryMuscle;
    // Chest/shoulders exercises might need triceps credit
    if ((cat === 'chest' || cat === 'shoulders') && !data.secondaryMuscleCredits?.includes('triceps')) {
      potentialMissing.push({ id: doc.id, name: data.nameHe || data.name, category: cat, primaryMuscle: pm, suggestion: 'triceps?' });
    }
    // Back exercises might need biceps credit
    if (cat === 'back' && !data.secondaryMuscleCredits?.includes('biceps_brachii')) {
      potentialMissing.push({ id: doc.id, name: data.nameHe || data.name, category: cat, primaryMuscle: pm, suggestion: 'biceps_brachii?' });
    }
    // Legs exercises might need gluteus_maximus credit
    if (cat === 'legs' && pm !== 'gluteus_maximus' && !data.secondaryMuscleCredits?.includes('gluteus_maximus')) {
      potentialMissing.push({ id: doc.id, name: data.nameHe || data.name, category: cat, primaryMuscle: pm, suggestion: 'gluteus_maximus?' });
    }
  });

  if (potentialMissing.length > 0) {
    console.log(`\n🔍 Exercises WITHOUT credits that MIGHT need them (${potentialMissing.length}):`);
    console.log('| שם תרגיל | קטגוריה | שריר ראשי | הצעה |');
    console.log('|----------|---------|----------|------|');
    potentialMissing.forEach(e => {
      console.log(`| ${e.name.substring(0, 25).padEnd(25)} | ${(e.category || '').padEnd(10)} | ${(e.primaryMuscle || '').padEnd(15)} | ${e.suggestion} |`);
    });
  }

  console.log(`\nTotal exercises in Firebase: ${snapshot.size}`);
  console.log(`Exercises with secondaryMuscleCredits: ${snapshot.docs.filter(d => d.data().secondaryMuscleCredits?.length > 0).length}`);

  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
