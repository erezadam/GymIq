/**
 * Inspect recent workouts that contain the "תלייה חופשית על מתח" exercise.
 * Prints the saved sets so we can confirm whether `time` is actually persisted.
 *
 * READ ONLY.
 *
 * Usage: npx tsx scripts/inspect-hang-workouts.ts
 */

import { collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { config } from 'dotenv';
import { db, auth } from './firebase-config';

config({ path: '.env.local' });

const HANG_EXERCISE_ID = 'DMtZNU6siPT9UgcTW4pM';
const HANG_NAME = 'תלייה חופשית על מתח';

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) {
    console.error('❌ Missing ADMIN_EMAIL/ADMIN_PASSWORD in .env.local');
    process.exit(1);
  }
  const cred = await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
  console.log(`✅ Authenticated as ${cred.user.uid} (${cred.user.email})\n`);

  // Admin lists all users, then queries each user's workout history
  const usersSnap = await getDocs(collection(db, 'users'));
  console.log(`👥 Users found: ${usersSnap.size}`);
  usersSnap.forEach(u => {
    const ud = u.data() as any;
    console.log(`   - ${u.id} role=${ud.role || '(none)'} email=${ud.email || ''}`);
  });
  console.log();

  const allDocs: any[] = [];
  for (const userDoc of usersSnap.docs) {
    try {
      const subQ = query(
        collection(db, 'workoutHistory'),
        where('userId', '==', userDoc.id),
        orderBy('date', 'desc'),
        limit(50)
      );
      const subSnap = await getDocs(subQ);
      subSnap.forEach(d => allDocs.push({ _id: d.id, _data: d.data() }));
    } catch (e: any) {
      console.warn(`   ⚠️ ${userDoc.id}: ${e.code || e.message}`);
    }
  }
  console.log(`📊 Total workout docs scanned: ${allDocs.length}\n`);

  let matchCount = 0;
  for (const d of allDocs) {
    const data = d._data as any;
    const exercises = data.exercises || [];
    const hangEx = exercises.find(
      (ex: any) =>
        ex.exerciseId === HANG_EXERCISE_ID || ex.exerciseNameHe === HANG_NAME
    );
    if (!hangEx) continue;
    matchCount++;
    if (matchCount > 10) break;

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`workout: ${d._id}  user: ${data.userId}`);
    console.log(`date:    ${data.date?.toDate?.().toISOString?.() ?? data.date}`);
    console.log(`status:  ${data.status}`);
    console.log(`name:    ${data.name}`);
    console.log(`exercise reportType: ${hangEx.reportType ?? '(none)'}`);
    console.log(`sets (${hangEx.sets?.length ?? 0}):`);
    (hangEx.sets || []).forEach((s: any, i: number) => {
      console.log(`  set ${i + 1}: ${JSON.stringify(s)}`);
    });
    console.log();
  }

  if (matchCount === 0) {
    console.log('   ❓ No recent workouts contained this exercise.');
  } else {
    console.log(`\nTotal matches printed: ${Math.min(matchCount, 10)}`);
  }
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Failed:', err);
  process.exit(1);
});
