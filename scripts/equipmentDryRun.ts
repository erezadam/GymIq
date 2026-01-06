/**
 * Equipment Migration DRY RUN
 * READ ONLY - No changes will be made!
 *
 * Run with: npx tsx scripts/equipmentDryRun.ts
 */

import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyBnBe5o2d6tGLSCOqLNpiLLb2EPpsyo_i4",
  authDomain: "gymiq-e8b4e.firebaseapp.com",
  projectId: "gymiq-e8b4e",
  storageBucket: "gymiq-e8b4e.firebasestorage.app",
  messagingSenderId: "871867923083",
  appId: "1:871867923083:web:13e21f2e04a19c1eb21ca2"
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

// Migration mapping
const EQUIPMENT_MAPPING: Record<string, string> = {
  barbell: 'free_weight',
  pull_up_bar: 'bodyweight',
  cable_machine: 'cable',
  kettlebell: 'free_weight',
  bench: 'free_weight',
}

async function dryRun() {
  console.log('\n' + '='.repeat(70))
  console.log('🔍 Equipment Migration DRY RUN - קריאה בלבד!')
  console.log('='.repeat(70))
  console.log('⚠️  סקריפט זה לא משנה שום דבר - רק מציג מצב נוכחי\n')

  try {
    // ==========================================
    // PART 1: Current exercises equipment values
    // ==========================================
    console.log('📊 חלק 1: מצב נוכחי - exercises collection')
    console.log('-'.repeat(50))

    const exercisesRef = collection(db, 'exercises')
    const exercisesSnapshot = await getDocs(exercisesRef)

    // Group exercises by equipment
    const equipmentGroups: Record<string, { count: number; examples: string[] }> = {}
    const noEquipment: string[] = []
    const nullEquipment: string[] = []

    for (const doc of exercisesSnapshot.docs) {
      const data = doc.data()
      const name = data.nameHe || data.name || doc.id
      const equipment = data.equipment

      if (equipment === undefined) {
        noEquipment.push(name)
      } else if (equipment === null || equipment === '') {
        nullEquipment.push(name)
      } else {
        if (!equipmentGroups[equipment]) {
          equipmentGroups[equipment] = { count: 0, examples: [] }
        }
        equipmentGroups[equipment].count++
        if (equipmentGroups[equipment].examples.length < 3) {
          equipmentGroups[equipment].examples.push(name)
        }
      }
    }

    console.log(`\nסה"כ תרגילים: ${exercisesSnapshot.docs.length}`)
    console.log(`\n| equipment | כמות | דוגמאות |`)
    console.log(`|-----------|------|---------|`)

    const sortedEquipment = Object.entries(equipmentGroups).sort((a, b) => b[1].count - a[1].count)
    for (const [eq, data] of sortedEquipment) {
      console.log(`| ${eq.padEnd(20)} | ${String(data.count).padEnd(4)} | ${data.examples.join(', ').substring(0, 40)} |`)
    }

    if (noEquipment.length > 0) {
      console.log(`\n⚠️  תרגילים ללא שדה equipment (undefined): ${noEquipment.length}`)
      console.log(`   דוגמאות: ${noEquipment.slice(0, 5).join(', ')}`)
    }

    if (nullEquipment.length > 0) {
      console.log(`\n⚠️  תרגילים עם equipment ריק (null/''): ${nullEquipment.length}`)
      console.log(`   דוגמאות: ${nullEquipment.slice(0, 5).join(', ')}`)
    }

    // ==========================================
    // PART 2: Current equipment collection
    // ==========================================
    console.log('\n\n📊 חלק 2: מצב נוכחי - equipment collection')
    console.log('-'.repeat(50))

    const equipmentRef = collection(db, 'equipment')
    const equipmentSnapshot = await getDocs(equipmentRef)

    if (equipmentSnapshot.empty) {
      console.log('\n⚠️  equipment collection ריק!')
    } else {
      console.log(`\nסה"כ פריטי ציוד: ${equipmentSnapshot.docs.length}`)
      console.log(`\n| מזהה | שם בעברית | שם באנגלית |`)
      console.log(`|------|-----------|------------|`)

      for (const doc of equipmentSnapshot.docs) {
        const data = doc.data()
        console.log(`| ${doc.id.padEnd(20)} | ${(data.nameHe || '-').padEnd(15)} | ${(data.nameEn || '-').padEnd(15)} |`)
      }
    }

    // ==========================================
    // PART 3: Migration Simulation
    // ==========================================
    console.log('\n\n📊 חלק 3: סימולציית מיגרציה')
    console.log('-'.repeat(50))
    console.log('\nמיפוי מתוכנן:')
    for (const [from, to] of Object.entries(EQUIPMENT_MAPPING)) {
      console.log(`   ${from} → ${to}`)
    }

    console.log(`\n| equipment נוכחי | equipment חדש | כמות תרגילים |`)
    console.log(`|-----------------|---------------|--------------|`)

    let totalToMigrate = 0
    const migrationSummary: Array<{ from: string; to: string; count: number }> = []

    for (const [from, to] of Object.entries(EQUIPMENT_MAPPING)) {
      const count = equipmentGroups[from]?.count || 0
      if (count > 0) {
        migrationSummary.push({ from, to, count })
        totalToMigrate += count
        console.log(`| ${from.padEnd(15)} | ${to.padEnd(13)} | ${String(count).padEnd(12)} |`)
      }
    }

    console.log(`\n📈 סה"כ תרגילים שישתנו: ${totalToMigrate}`)

    // ==========================================
    // PART 4: Potential Issues
    // ==========================================
    console.log('\n\n📊 חלק 4: בעיות פוטנציאליות')
    console.log('-'.repeat(50))

    // Equipment not in mapping
    const unmappedEquipment = Object.keys(equipmentGroups).filter(eq => !EQUIPMENT_MAPPING[eq])

    console.log('\n□ תרגילים עם equipment שלא במיפוי:')
    if (unmappedEquipment.length > 0) {
      console.log('   ⚠️  כן! הערכים הבאים לא ימוגרו:')
      for (const eq of unmappedEquipment) {
        console.log(`      • ${eq} (${equipmentGroups[eq].count} תרגילים)`)
      }
    } else {
      console.log('   ✅ אין - כל הערכים במיפוי')
    }

    console.log('\n□ תרגילים בלי equipment בכלל:')
    if (noEquipment.length > 0 || nullEquipment.length > 0) {
      console.log(`   ⚠️  כן! ${noEquipment.length + nullEquipment.length} תרגילים`)
    } else {
      console.log('   ✅ אין - לכל התרגילים יש equipment')
    }

    console.log('\n□ ערכי equipment לא צפויים:')
    const expectedEquipment = new Set([
      ...Object.keys(EQUIPMENT_MAPPING),
      'dumbbell', 'machine', 'bodyweight', 'cable', 'free_weight', 'resistance_band', 'smith_machine'
    ])
    const unexpectedEquipment = Object.keys(equipmentGroups).filter(eq => !expectedEquipment.has(eq))
    if (unexpectedEquipment.length > 0) {
      console.log('   ⚠️  כן! ערכים לא צפויים:')
      unexpectedEquipment.forEach(eq => console.log(`      • ${eq}`))
    } else {
      console.log('   ✅ אין - כל הערכים צפויים')
    }

    // ==========================================
    // Summary
    // ==========================================
    console.log('\n\n' + '='.repeat(70))
    console.log('📊 סיכום:')
    console.log('='.repeat(70))

    const hasIssues = unmappedEquipment.length > 0 || noEquipment.length > 0 || nullEquipment.length > 0

    if (hasIssues) {
      console.log('\n❌ יש בעיות לטפל בהן קודם:')
      if (unmappedEquipment.length > 0) {
        console.log(`   • ${unmappedEquipment.length} ערכי equipment לא במיפוי`)
      }
      if (noEquipment.length > 0) {
        console.log(`   • ${noEquipment.length} תרגילים ללא equipment`)
      }
      if (nullEquipment.length > 0) {
        console.log(`   • ${nullEquipment.length} תרגילים עם equipment ריק`)
      }
    } else {
      console.log('\n✅ מוכן למיגרציה!')
      console.log(`   • ${totalToMigrate} תרגילים ישתנו`)
      console.log(`   • ${exercisesSnapshot.docs.length - totalToMigrate} תרגילים יישארו ללא שינוי`)
    }

    console.log('\n' + '='.repeat(70))
    console.log('⚠️  זכור: זה היה DRY RUN - שום דבר לא השתנה!')
    console.log('='.repeat(70))

  } catch (error) {
    console.error('❌ שגיאה:', error)
    process.exit(1)
  }

  process.exit(0)
}

dryRun()
