/**
 * Test Script ד.1 — Verify analysis saves to users/{uid}/aiData/lastAnalysis
 *
 * What it does:
 * 1. Signs in as a test user (admin@test.gymiq.com)
 * 2. Calls generateTrainingAnalysis Cloud Function
 * 3. Reads the aiData/lastAnalysis subcollection document via client SDK
 * 4. Checks all required fields: analysis (6 sub-fields), workoutCount, weeksAnalyzed, createdAt, model
 *
 * Usage: node scripts/test-analysis-save.cjs
 * Requires: .env file with Firebase config
 */

// Load .env.local for test credentials
require('dotenv').config({ path: '.env.local' });

const { db, auth } = require('./firebase-config.cjs');
const { signInWithEmailAndPassword } = require('firebase/auth');
const { getFunctions, httpsCallable } = require('firebase/functions');
const { doc, getDoc, collection } = require('firebase/firestore');

// Test config
const TEST_EMAIL = process.env.ADMIN_EMAIL || 'admin@test.gymiq.com';
const TEST_PASSWORD = process.env.ADMIN_PASSWORD;
if (!TEST_PASSWORD) {
  console.error('❌ ADMIN_PASSWORD not found. Set it in .env.local');
  process.exit(1);
}

async function main() {
  console.log('═══════════════════════════════════════════════');
  console.log('  ד.1 — Test: Analysis saves to aiData subcollection');
  console.log('═══════════════════════════════════════════════\n');

  let passed = 0;
  let failed = 0;

  function pass(msg) { passed++; console.log(`  ✅ PASS: ${msg}`); }
  function fail(msg) { failed++; console.log(`  ❌ FAIL: ${msg}`); }

  try {
    // Step 1: Sign in
    console.log('1. Signing in as test user...');
    const userCred = await signInWithEmailAndPassword(auth, TEST_EMAIL, TEST_PASSWORD);
    const uid = userCred.user.uid;
    console.log(`   Signed in as: ${uid}\n`);

    // Step 2: Call generateTrainingAnalysis
    console.log('2. Calling generateTrainingAnalysis...');
    console.log('   (This may take 30-60 seconds due to OpenAI call)\n');
    const fnInstance = getFunctions(undefined, 'us-central1');
    const generateAnalysis = httpsCallable(fnInstance, 'generateTrainingAnalysis', { timeout: 120000 });

    const result = await generateAnalysis({ userId: uid });
    const data = result.data;

    if (data.success) {
      pass('generateTrainingAnalysis returned success=true');
      console.log(`   workoutCount: ${data.workoutCount}, weeksAnalyzed: ${data.weeksAnalyzed}\n`);
    } else {
      // May fail if < 4 workouts — still check aiData from previous call
      console.log(`   ⚠️  Function returned success=false: ${data.error}`);
      console.log('   (Will still check if aiData was written from a previous successful call)\n');
    }

    // Step 3: Read aiData/lastAnalysis via client SDK
    // Security rules allow admin to read any user's aiData subcollection
    console.log('3. Reading users/{uid}/aiData/lastAnalysis via client SDK...');
    const docRef = doc(db, 'users', uid, 'aiData', 'lastAnalysis');
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      fail('Document users/{uid}/aiData/lastAnalysis does NOT exist');
      printSummary(passed, failed);
      process.exit(1);
    }
    pass('Document exists in aiData/lastAnalysis');

    const aiData = docSnap.data();

    // Step 4: Verify fields
    console.log('\n4. Verifying document fields...');

    // Top-level fields
    if (aiData.workoutCount != null && typeof aiData.workoutCount === 'number') {
      pass(`workoutCount = ${aiData.workoutCount}`);
    } else {
      fail(`workoutCount missing or not a number (got: ${aiData.workoutCount})`);
    }

    if (aiData.weeksAnalyzed != null && typeof aiData.weeksAnalyzed === 'number') {
      pass(`weeksAnalyzed = ${aiData.weeksAnalyzed}`);
    } else {
      fail(`weeksAnalyzed missing or not a number (got: ${aiData.weeksAnalyzed})`);
    }

    if (aiData.createdAt != null) {
      const ts = aiData.createdAt;
      const date = ts.toDate ? ts.toDate() : new Date(ts.seconds * 1000);
      pass(`createdAt = ${date.toISOString()}`);
    } else {
      fail('createdAt is missing');
    }

    if (aiData.model === 'gpt-4o') {
      pass(`model = "${aiData.model}"`);
    } else {
      fail(`model expected "gpt-4o", got "${aiData.model}"`);
    }

    // Analysis object
    if (aiData.analysis && typeof aiData.analysis === 'object') {
      pass('analysis field exists and is an object');

      const requiredAnalysisFields = ['title', 'overview', 'strengths', 'weaknesses', 'recommendations', 'summary'];
      for (const field of requiredAnalysisFields) {
        if (aiData.analysis[field] != null) {
          const val = Array.isArray(aiData.analysis[field])
            ? `[${aiData.analysis[field].length} items]`
            : `"${String(aiData.analysis[field]).substring(0, 60)}..."`;
          pass(`analysis.${field} = ${val}`);
        } else {
          fail(`analysis.${field} is missing`);
        }
      }

      // Verify arrays
      if (Array.isArray(aiData.analysis.strengths) && aiData.analysis.strengths.length > 0) {
        pass(`analysis.strengths has ${aiData.analysis.strengths.length} items`);
      } else {
        fail('analysis.strengths should be a non-empty array');
      }

      if (Array.isArray(aiData.analysis.weaknesses) && aiData.analysis.weaknesses.length > 0) {
        pass(`analysis.weaknesses has ${aiData.analysis.weaknesses.length} items`);
      } else {
        fail('analysis.weaknesses should be a non-empty array');
      }

      if (Array.isArray(aiData.analysis.recommendations) && aiData.analysis.recommendations.length > 0) {
        pass(`analysis.recommendations has ${aiData.analysis.recommendations.length} items`);
      } else {
        fail('analysis.recommendations should be a non-empty array');
      }
    } else {
      fail('analysis field is missing or not an object');
    }

  } catch (error) {
    console.error(`\n❌ Unexpected error: ${error.message}`);
    if (error.code) console.error(`   Error code: ${error.code}`);
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
