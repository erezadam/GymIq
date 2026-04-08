/**
 * Audit exercise reportTypes
 *
 * Reads all exercises and reportTypes from Firebase, then reports:
 *   1. Exercises whose reportType ID is missing from the reportTypes collection
 *      (and isn't a known default).
 *   2. Exercises whose reportType ID does NOT contain any of the SetReportRow
 *      parser keywords (weight/reps/time/intensity/speed/distance/incline/zone),
 *      which means SetReportRow falls back to weight_reps and silently hides
 *      the actual fields configured in Firebase.
 *   3. The reportType of "תלייה חופשית" (free hang), highlighted.
 *
 * READ ONLY — does not modify Firestore.
 *
 * Usage: npx tsx scripts/audit-exercise-report-types.ts
 */

import { collection, getDocs } from 'firebase/firestore';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { config } from 'dotenv';
import { db, auth } from './firebase-config';

config({ path: '.env.local' });

const PARSER_KEYWORDS = [
  'weight', 'משקל',
  'reps', 'חזרות',
  'time', 'זמן',
  'intensity', 'עצימות',
  'speed', 'spead', 'מהירות',
  'distance', 'מרחק',
  'incline', 'slope', 'slop', 'slot', 'שיפוע',
  'zone', 'אזור',
];

const KNOWN_DEFAULT_IDS = new Set([
  'weight_reps', 'reps_only', 'time_only', 'reps_time', 'intensity_time', 'time_zone',
]);

function parserWouldFindFields(id: string): string[] {
  const n = id.toLowerCase();
  const found: string[] = [];
  if (n.includes('weight') || n.includes('משקל')) found.push('weight');
  if (n.includes('reps') || n.includes('חזרות')) found.push('reps');
  if (n.includes('time') || n.includes('זמן')) found.push('time');
  if (n.includes('intensity') || n.includes('עצימות')) found.push('intensity');
  if (n.includes('speed') || n.includes('spead') || n.includes('מהירות')) found.push('speed');
  if (n.includes('distance') || n.includes('מרחק')) found.push('distance');
  if (n.includes('incline') || n.includes('slope') || n.includes('slop') || n.includes('slot') || n.includes('שיפוע')) found.push('incline');
  if (n.includes('zone') || n.includes('אזור')) found.push('zone');
  return found;
}

async function main() {
  console.log('🔎 Auditing exercises and reportTypes...\n');

  const adminEmail = process.env.E2E_ADMIN_EMAIL;
  const adminPassword = process.env.E2E_ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) {
    console.error('❌ Missing E2E_ADMIN_EMAIL or E2E_ADMIN_PASSWORD in .env.local');
    process.exit(1);
  }
  await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
  console.log('✅ Authenticated as admin\n');

  // Load all reportTypes
  const rtSnap = await getDocs(collection(db, 'reportTypes'));
  const reportTypes = new Map<string, { id: string; nameHe?: string; fields?: { type: string }[] }>();
  rtSnap.forEach(d => reportTypes.set(d.id, { id: d.id, ...(d.data() as any) }));
  console.log(`📋 reportTypes in Firebase: ${reportTypes.size}`);
  reportTypes.forEach(rt => {
    const fieldTypes = (rt.fields || []).map(f => f.type).join(', ');
    console.log(`   - ${rt.id} (${rt.nameHe || ''}) → fields: [${fieldTypes}]`);
  });
  console.log();

  // Load all exercises
  const exSnap = await getDocs(collection(db, 'exercises'));
  console.log(`💪 exercises in Firebase: ${exSnap.size}\n`);

  const missingReportType: { id: string; nameHe: string }[] = [];
  const unknownReportType: { id: string; nameHe: string; reportType: string }[] = [];
  const parserMismatch: {
    id: string;
    nameHe: string;
    reportType: string;
    realFields: string[];
    parsedFields: string[];
  }[] = [];
  let hangFound: any = null;

  exSnap.forEach(d => {
    const data = d.data() as any;
    const nameHe = data.nameHe || data.name || d.id;
    const reportType = data.reportType as string | undefined;

    if (
      nameHe.includes('תלייה') ||
      nameHe.includes('תלי') ||
      nameHe.includes('חופשי') ||
      nameHe.toLowerCase().includes('hang') ||
      nameHe.toLowerCase().includes('free')
    ) {
      // Collect ALL matches, not just one
      if (!Array.isArray(hangFound)) hangFound = [];
      hangFound.push({ id: d.id, nameHe, reportType });
    }

    if (!reportType) {
      missingReportType.push({ id: d.id, nameHe });
      return;
    }

    const rt = reportTypes.get(reportType);
    if (!rt && !KNOWN_DEFAULT_IDS.has(reportType)) {
      unknownReportType.push({ id: d.id, nameHe, reportType });
    }

    if (rt && rt.fields) {
      const realFields = rt.fields.map(f => f.type).sort();
      const parsedFields = parserWouldFindFields(reportType).sort();
      const matches =
        realFields.length === parsedFields.length &&
        realFields.every((f, i) => f === parsedFields[i]);
      if (!matches) {
        parserMismatch.push({ id: d.id, nameHe, reportType, realFields, parsedFields });
      }
    }
  });

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`🚨 Exercises with NO reportType field: ${missingReportType.length}`);
  missingReportType.slice(0, 20).forEach(e => console.log(`   - ${e.nameHe} (${e.id})`));
  if (missingReportType.length > 20) console.log(`   ... +${missingReportType.length - 20} more`);

  console.log(`\n🚨 Exercises with reportType not in collection: ${unknownReportType.length}`);
  unknownReportType.slice(0, 20).forEach(e => console.log(`   - ${e.nameHe} → "${e.reportType}" (${e.id})`));
  if (unknownReportType.length > 20) console.log(`   ... +${unknownReportType.length - 20} more`);

  console.log(`\n🚨 Exercises whose reportType ID parser MISMATCHES the real fields: ${parserMismatch.length}`);
  console.log('   (these are the silent-hide bugs — SetReportRow shows wrong inputs)');
  parserMismatch.slice(0, 20).forEach(e => {
    console.log(`   - ${e.nameHe} → id="${e.reportType}"`);
    console.log(`       real fields:   [${e.realFields.join(', ')}]`);
    console.log(`       parsed fields: [${e.parsedFields.join(', ') || '(none → defaults to weight_reps)'}]`);
  });
  if (parserMismatch.length > 20) console.log(`   ... +${parserMismatch.length - 20} more`);

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎯 Hang/free-related exercises:');
  const matches = (hangFound as any[]) || [];
  if (matches.length === 0) {
    console.log('   ❓ No matching exercise found.');
  } else {
    matches.forEach((m: any) => {
      const rt = reportTypes.get(m.reportType);
      const realFields = rt?.fields?.map((f: any) => f.type) || [];
      console.log(`   - ${m.nameHe} (${m.id}) → reportType="${m.reportType}" fields=[${realFields.join(', ')}]`);
    });
  }

  console.log('\n✅ Audit complete (read-only, no changes made).');
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Audit failed:', err);
  process.exit(1);
});
