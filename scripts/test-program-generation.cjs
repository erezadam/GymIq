/**
 * Test Script ד.2 — Test generateAIProgram Cloud Function
 *
 * What it does:
 * 1. Signs in as a trainer (admin@test.gymiq.com — has admin role which passes trainer check)
 * 2. Finds an active trainee via trainerRelationships query
 * 3. Calls generateAIProgram with daysPerWeek: 4
 * 4. Verifies JSON response structure (programName, days, exercises with valid IDs)
 * 5. Validates exerciseIds against exercises collection
 * 6. Prints readable output of the generated program
 *
 * Usage: node scripts/test-program-generation.cjs
 * Requires: .env file with Firebase config, generateAIProgram deployed
 */

// Load .env.local for test credentials
require('dotenv').config({ path: '.env.local' });

const { db, auth } = require('./firebase-config.cjs');
const { signInWithEmailAndPassword } = require('firebase/auth');
const { getFunctions, httpsCallable } = require('firebase/functions');
const { collection, query, where, limit, getDocs, doc, getDoc } = require('firebase/firestore');

// Test config
const TEST_EMAIL = process.env.ADMIN_EMAIL || 'admin@test.gymiq.com';
const TEST_PASSWORD = process.env.ADMIN_PASSWORD;
if (!TEST_PASSWORD) {
  console.error('❌ ADMIN_PASSWORD not found. Set it in .env.local');
  process.exit(1);
}
const DAYS_PER_WEEK = 4;

async function main() {
  console.log('═══════════════════════════════════════════════');
  console.log('  ד.2 — Test: generateAIProgram Cloud Function');
  console.log('═══════════════════════════════════════════════\n');

  let passed = 0;
  let failed = 0;

  function pass(msg) { passed++; console.log(`  ✅ PASS: ${msg}`); }
  function fail(msg) { failed++; console.log(`  ❌ FAIL: ${msg}`); }

  try {
    // Step 1: Sign in as trainer/admin
    console.log('1. Signing in as trainer/admin...');
    const userCred = await signInWithEmailAndPassword(auth, TEST_EMAIL, TEST_PASSWORD);
    const trainerId = userCred.user.uid;
    console.log(`   Signed in as: ${trainerId}\n`);

    // Step 2: Find a trainee via trainerRelationships
    console.log('2. Finding a trainee...');
    let traineeId = null;

    // Query trainerRelationships where this user is trainer
    const relQuery = query(
      collection(db, 'trainerRelationships'),
      where('trainerId', '==', trainerId),
      where('status', '==', 'active'),
      limit(1)
    );
    const relSnapshot = await getDocs(relQuery);

    if (!relSnapshot.empty) {
      traineeId = relSnapshot.docs[0].data().traineeId;
      console.log(`   Found trainee via relationship: ${traineeId}`);
    } else {
      // Admin can access any user — use self
      traineeId = trainerId;
      console.log(`   No active relationships found. Using self as trainee: ${traineeId}`);
    }
    console.log('');

    // Step 3: Call generateAIProgram
    console.log(`3. Calling generateAIProgram (daysPerWeek: ${DAYS_PER_WEEK})...`);
    console.log('   (This may take 30-90 seconds due to OpenAI call)\n');
    const fnInstance = getFunctions(undefined, 'us-central1');
    const generateProgram = httpsCallable(fnInstance, 'generateAIProgram', { timeout: 180000 });

    const startTime = Date.now();
    const result = await generateProgram({
      traineeId,
      daysPerWeek: DAYS_PER_WEEK,
      focusAreas: ['shoulders', 'legs'],
      notes: 'דגש על כתף צדדית ושריר ירך אחורי',
    });
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`   Response received in ${elapsed}s\n`);

    const data = result.data;

    // Step 4: Verify response structure
    console.log('4. Verifying response structure...');

    if (data.success === true) {
      pass('success = true');
    } else {
      fail(`success = ${data.success}, error: ${data.error}`);
      printSummary(passed, failed);
      process.exit(1);
    }

    if (data.rateLimitInfo) {
      pass(`rateLimitInfo present (remaining: ${data.rateLimitInfo.remaining})`);
    } else {
      fail('rateLimitInfo missing');
    }

    const program = data.program;
    if (!program) {
      fail('program is null/undefined');
      printSummary(passed, failed);
      process.exit(1);
    }
    pass('program object exists');

    // programName
    if (program.programName && typeof program.programName === 'string') {
      pass(`programName = "${program.programName}"`);
    } else {
      fail('programName missing or not a string');
    }

    // description
    if (program.description && typeof program.description === 'string') {
      pass(`description present (${program.description.length} chars)`);
    } else {
      fail('description missing');
    }

    // explanation
    if (program.explanation && typeof program.explanation === 'string') {
      pass(`explanation present (${program.explanation.length} chars)`);
    } else {
      fail('explanation missing');
    }

    // days array
    if (Array.isArray(program.days)) {
      pass(`days is an array with ${program.days.length} items`);

      if (program.days.length === DAYS_PER_WEEK) {
        pass(`days count matches requested (${DAYS_PER_WEEK})`);
      } else {
        fail(`days count mismatch: expected ${DAYS_PER_WEEK}, got ${program.days.length}`);
      }
    } else {
      fail('days is not an array');
      printSummary(passed, failed);
      process.exit(1);
    }

    // Step 5: Validate exercise IDs against exercises collection
    console.log('\n5. Validating exercise IDs against exercises collection...');
    const exercisesSnapshot = await getDocs(collection(db, 'exercises'));
    const validExerciseIds = new Set(exercisesSnapshot.docs.map((d) => d.id));
    console.log(`   Loaded ${validExerciseIds.size} exercises from Firestore\n`);

    let totalExercises = 0;
    let validIds = 0;
    let invalidIds = 0;

    for (const day of program.days) {
      // Verify day structure
      if (!day.dayLabel || !day.name) {
        fail(`Day missing dayLabel or name: ${JSON.stringify({ dayLabel: day.dayLabel, name: day.name })}`);
        continue;
      }

      if (!Array.isArray(day.exercises) || day.exercises.length === 0) {
        fail(`Day "${day.dayLabel}" has no exercises`);
        continue;
      }

      for (const ex of day.exercises) {
        totalExercises++;

        if (validExerciseIds.has(ex.exerciseId)) {
          validIds++;
        } else {
          invalidIds++;
          fail(`Invalid exerciseId "${ex.exerciseId}" in ${day.dayLabel}`);
        }

        // Verify exercise has required fields
        if (!ex.exerciseNameHe) {
          fail(`Exercise ${ex.exerciseId} missing exerciseNameHe`);
        }
        if (!ex.targetSets || ex.targetSets < 1 || ex.targetSets > 6) {
          fail(`Exercise ${ex.exerciseId} invalid targetSets: ${ex.targetSets}`);
        }
        if (!ex.targetReps || typeof ex.targetReps !== 'string') {
          fail(`Exercise ${ex.exerciseId} invalid targetReps: ${ex.targetReps}`);
        }
        if (!ex.restTime || ex.restTime < 30 || ex.restTime > 300) {
          fail(`Exercise ${ex.exerciseId} invalid restTime: ${ex.restTime}`);
        }
      }
    }

    if (totalExercises > 0) {
      pass(`Total exercises: ${totalExercises}`);
    } else {
      fail('No exercises in program');
    }

    if (invalidIds === 0) {
      pass(`All ${validIds} exercise IDs are valid`);
    } else {
      fail(`${invalidIds} invalid exercise IDs found (${validIds} valid)`);
    }

    // Step 6: Print readable output
    console.log('\n6. Generated Program:');
    console.log('─────────────────────────────────────────────');
    console.log(`   📋 ${program.programName}`);
    console.log(`   📝 ${program.description}\n`);

    for (const day of program.days) {
      console.log(`   ── ${day.dayLabel}: ${day.name} ──`);
      for (const ex of day.exercises) {
        console.log(`      ${ex.order}. ${ex.exerciseNameHe} (${ex.exerciseName})`);
        console.log(`         ${ex.targetSets}×${ex.targetReps} | מנוחה: ${ex.restTime}s | ${ex.equipment}`);
        if (ex.notes) console.log(`         💬 ${ex.notes}`);
      }
      console.log('');
    }

    console.log(`   💡 הסבר: ${program.explanation}\n`);

  } catch (error) {
    console.error(`\n❌ Unexpected error: ${error.message}`);
    if (error.code) console.error(`   Error code: ${error.code}`);
    if (error.details) console.error(`   Details: ${JSON.stringify(error.details)}`);
    failed++;
  }

  printSummary(passed, failed);
  process.exit(failed > 0 ? 1 : 0);
}

function printSummary(passed, failed) {
  console.log('\n═══════════════════════════════════════════════');
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log(`  Status: ${failed === 0 ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
  console.log('═══════════════════════════════════════════════\n');
}

main();
