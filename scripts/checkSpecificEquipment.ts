/**
 * Check exercises with specific equipment types
 * READ ONLY
 */

import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore'

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

async function checkEquipment() {
  console.log('\n' + '='.repeat(70))
  console.log('🔍 בדיקת תרגילים: kettlebell, pull_up_bar, bench')
  console.log('='.repeat(70) + '\n')

  const equipmentTypes = ['kettlebell', 'pull_up_bar', 'bench']

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
