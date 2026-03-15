/**
 * One-time script: Populate secondaryMuscleCredits field on exercises
 * Uses Firebase Admin SDK with Application Default Credentials
 *
 * First run: gcloud auth application-default login
 * Then: node scripts/populateSecondaryCredits.cjs
 */

const admin = require('firebase-admin');

admin.initializeApp({
  projectId: 'gymiq-e8b4e',
});

const db = admin.firestore();

// Mapping from the hardcoded SECONDARY_MUSCLE_MULTIPLIERS in TrainingAnalysis.tsx
const EXERCISE_SECONDARY_CREDITS = {
  // triceps — 46 exercises
  "C3pf1VvSCuGxIA4oWzXI": ["triceps"],
  "eY2MblJj94vJtV6A0Zlz": ["triceps"],
  "dvZ4iMKZYKUDaheoJVCh": ["triceps"],
  "AspsDoRT9GPQOw0fYANa": ["triceps"],
  "hdJjAx3KMp5XbuQ7UNfW": ["triceps"],
  "Q8mHNGehBzxjDpc1dW8B": ["triceps"],
  "Xriss1E6kkY8nSnmyWKi": ["triceps"],
  "JnGWwa2vNbmaVxSr3li1": ["triceps"],
  "79pWk66pXALdv4ku2pTI": ["triceps"],
  "HL6Eq8eEfk1f6sl5R6Wq": ["triceps"],
  "aNKatCW6yKjWCLsWgoXp": ["triceps"],
  "0dqf0j0YQJAGf6NEMTv4": ["triceps"],
  "oE3M2FaQeaMU5hTeOkOj": ["triceps"],
  "zrnZmmlaOswF17Vi6ED2": ["triceps"],
  "n9quUbtf4CsIsnuP6ypJ": ["triceps"],
  "p4B9Utw3H50XD1khsVHP": ["triceps"],
  "TxiHxnar1u50kdNpJIPq": ["triceps"],
  "S2LAJAVDoYDpSP2J5LvJ": ["triceps"],
  "mKdO3inl3UVXkCfxyjSy": ["triceps"],
  "Fbw48H0eQfwvkmuye8o8": ["triceps"],
  "vTnBmyUqMoN5ikXdKONL": ["triceps"],
  "y9KWVXtSxcED7JQMpSRP": ["triceps"],
  "fdOOiWXvidgtp4JJ89uM": ["triceps"],
  "mgcEsYQyu7WTyeajQEkp": ["triceps"],
  "Pq8DXb7jtiDUoavcK7fO": ["triceps"],
  "f8yIQDvYF2M4LrPldgg8": ["triceps"],
  "4o86htIR7D1BC41ilIn9": ["triceps"],
  "uEttMMdBAEBLszuPTXCJ": ["triceps"],
  "Xpd2fI0MmOw8mHTYQjEx": ["triceps"],
  "2UGewyMR1snvp8qMRUz9": ["triceps"],
  "ZCwrx8BbUvf3mpJ2Jd3E": ["triceps"],
  "ABOinRwCsKTqDRk52HYM": ["triceps"],
  "nJtiUP2tORtm7uKqmKOu": ["triceps"],
  "BOwkhUUPpfWUPug9BsOf": ["triceps"],
  "Vk3sCZwlvdFOJC5tT3cd": ["triceps"],
  "llmh4oU99aNtS1vKynO9": ["triceps"],
  "jEUEyDG9ATkKIBN60k5j": ["triceps"],
  "TaVCi6SMnlGPU44STvqB": ["triceps"],
  "4gl74RJQfLbj7VfeivTQ": ["triceps"],
  "AKur5L4ib30oZSHgC9Px": ["triceps"],
  "oAoj1ai8K9dc6B9EaFED": ["triceps"],
  "HKltSTpqJQlY9UXrSUCh": ["triceps"],
  "Pxffw0KFPTW4a2xyK7fo": ["triceps"],
  "eC3bgOTVRk6G3NL6Jc54": ["triceps"],
  "ixeY4g8dtzz8RpoCJtSS": ["triceps"],
  "ls2RllIGdrXboD5nrmf2": ["triceps"],
  // biceps_brachii — 19 exercises
  "rCKv4MPkwWRgDpvQXV5X": ["biceps_brachii"],
  "CGPoXMft40TvBJl63j3P": ["biceps_brachii"],
  "iN6CNbUITqLbPXYrVcA5": ["biceps_brachii"],
  "mcoW0pzyAWBcd5C1dXad": ["biceps_brachii"],
  "RLkPUj6WGQhlyHcr023o": ["biceps_brachii"],
  "cAWWTBOa7vMM5XBTRstp": ["biceps_brachii"],
  "15EoZ3DZm4pMas9pEb8c": ["biceps_brachii"],
  "otCaAzOw0KvT8ONW1v1D": ["biceps_brachii"],
  "4mAbkf0hesykvFmFSD8k": ["biceps_brachii"],
  "Xoh0Dwe168xMDsDpkNgb": ["biceps_brachii"],
  "qjZ1cDTKn4WnRrORZCvR": ["biceps_brachii"],
  "KItcETHzIHJXCGt4duOM": ["biceps_brachii"],
  "dclvw5ufIebkrbA9du5B": ["biceps_brachii"],
  "uZCw91GV42PurHafWFe7": ["biceps_brachii"],
  "ha6rSmUuqmK6v2rjiTB1": ["biceps_brachii"],
  "U9liue4N8IB3vetWz2wI": ["biceps_brachii"],
  "e8gWq4e1zsqZ3kiKepWk": ["biceps_brachii"],
  "D2KUzrI3guPkMr356uGH": ["biceps_brachii"],
  "BwVQyCeg3DqNPFqdJser": ["biceps_brachii"],
  // gluteus_maximus — 17 exercises
  "QxbXQO77g3ewGnY7PISJ": ["gluteus_maximus"],
  "M3Wl6PplSjEyPFAqTQhr": ["gluteus_maximus"],
  "dkiOoNRC6InMJx6HvNCs": ["gluteus_maximus"],
  "1ISbykeW2hJz7l6Ag1eh": ["gluteus_maximus"],
  "ldyvkdv5EtQBg6nqMzDp": ["gluteus_maximus"],
  "6zA32kE09TDiaH4LJJv6": ["gluteus_maximus"],
  "UlFsp2JWjSaJXqxH50Np": ["gluteus_maximus"],
  "LUAX1e9H0zoUFEP7l3A6": ["gluteus_maximus"],
  "1ZwvAMeZeqXyx3oIJvPO": ["gluteus_maximus"],
  "FN6bKdNWcEgHjqrTPvbu": ["gluteus_maximus"],
  "R968BsNAAeIweal039f2": ["gluteus_maximus"],
  "9lqCm9PgTffJfwAcSVCe": ["gluteus_maximus"],
  "TvxDt0y03gmzOZzspHyU": ["gluteus_maximus"],
  "JClCPcKWAxKiuy7KIgRB": ["gluteus_maximus"],
  "eqLYs7TORwMcF6DmezaU": ["gluteus_maximus"],
  "R29ea1XKRxWmlqaryCAM": ["gluteus_maximus"],
  "eRubABEIIHyzJ7YCzhSe": ["gluteus_maximus"],
};

async function main() {
  console.log('🚀 Starting secondaryMuscleCredits population...\n');

  const entries = Object.entries(EXERCISE_SECONDARY_CREDITS);

  // Use batched writes (max 500 per batch, we have 82)
  const batch = db.batch();
  for (const [exerciseId, credits] of entries) {
    const ref = db.collection('exercises').doc(exerciseId);
    batch.update(ref, { secondaryMuscleCredits: credits });
  }

  console.log(`Committing batch of ${entries.length} updates...`);
  await batch.commit();
  console.log(`\n✅ Done! Updated ${entries.length} exercises.`);

  // Summary by muscle
  const byMuscle = {};
  for (const credits of Object.values(EXERCISE_SECONDARY_CREDITS)) {
    for (const m of credits) {
      byMuscle[m] = (byMuscle[m] || 0) + 1;
    }
  }
  console.log('\n📊 Breakdown:');
  for (const [muscle, count] of Object.entries(byMuscle)) {
    console.log(`   ${muscle}: ${count} exercises`);
  }

  process.exit(0);
}

main();
