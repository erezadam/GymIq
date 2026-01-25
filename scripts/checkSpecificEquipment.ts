/**
 * Check exercises with specific equipment types
 * READ ONLY
 *
 * Usage: npx tsx scripts/checkSpecificEquipment.ts
 */

import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from './firebase-config'

async function checkEquipment() {
  console.log('\n' + '='.repeat(70))
  console.log('🔍 בדיקת תרגילים: kettlebell, pull_up_bar, bench')
  console.log('='.repeat(70) + '\n')

  const equipmentTypes = ['kettlebell', 'pull_up_bar', 'bench', 'resistance_band']

  const exercisesRef = collection(db, 'exercises')
  const snapshot = await getDocs(exercisesRef)

  for (const eqType of equipmentTypes) {
    console.log(`\n📌 ${eqType}:`)
    console.log('-'.repeat(50))

    const matches = snapshot.docs.filter(doc => doc.data().equipment === eqType)

    if (matches.length === 0) {
      console.log('   ⚠️  אין תרגילים עם ציוד זה!')
    } else {
      console.log(`| # | שם באנגלית | שם בעברית | primaryMuscle |`)
      console.log(`|---|------------|-----------|---------------|`)

      matches.forEach((doc, i) => {
        const data = doc.data()
        const nameEn = (data.name || '-').substring(0, 25).padEnd(25)
        const nameHe = (data.nameHe || '-').substring(0, 20).padEnd(20)
        const muscle = (data.primaryMuscle || '-').padEnd(15)
        console.log(`| ${i + 1} | ${nameEn} | ${nameHe} | ${muscle} |`)
      })
    }

    console.log(`\n   סה"כ: ${matches.length} תרגילים`)
  }

  // Summary
  console.log('\n\n' + '='.repeat(70))
  console.log('📊 סיכום:')
  console.log('='.repeat(70))

  for (const eqType of equipmentTypes) {
    const count = snapshot.docs.filter(doc => doc.data().equipment === eqType).length
    console.log(`   ${eqType}: ${count} תרגילים`)
  }

  process.exit(0)
}

checkEquipment().catch(console.error)
