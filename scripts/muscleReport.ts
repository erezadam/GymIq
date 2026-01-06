/**
 * Muscle Report Script
 * Generates a hierarchical report of all muscles and sub-muscles from Firebase
 *
 * Run with: npx tsx scripts/muscleReport.ts
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

interface SubMuscle {
  id: string
  nameHe: string
  nameEn: string
}

interface PrimaryMuscle {
  id: string
  nameHe: string
  nameEn: string
  icon: string
  subMuscles: SubMuscle[]
}

async function generateMuscleReport() {
  console.log('\n' + '='.repeat(60))
  console.log('📊 דוח שרירים ותתי-שרירים - GymIQ')
  console.log('='.repeat(60) + '\n')

  try {
    // Fetch muscles from Firebase
    const musclesRef = collection(db, 'muscles')
    const snapshot = await getDocs(musclesRef)

    if (snapshot.empty) {
      console.log('⚠️  אין נתונים ב-Firebase! הרץ "עדכן הכל" בממשק הניהול.')
      process.exit(1)
    }

    const muscles: PrimaryMuscle[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as PrimaryMuscle[]

    // Sort by Hebrew name for consistent output
    muscles.sort((a, b) => a.nameHe.localeCompare(b.nameHe, 'he'))

    // Statistics
    let totalSubMuscles = 0
    const musclesWithoutSubs: string[] = []

    // Print hierarchical report
    console.log('📌 מבנה שרירים היררכי:')
    console.log('-'.repeat(40))

    for (const muscle of muscles) {
      const subCount = muscle.subMuscles?.length || 0
      totalSubMuscles += subCount

      console.log(`\n${muscle.icon} ${muscle.nameHe} (${muscle.nameEn})`)
      console.log(`   ID: ${muscle.id}`)
      console.log(`   תתי-שרירים: ${subCount}`)

      if (subCount === 0) {
        musclesWithoutSubs.push(muscle.nameHe)
        console.log('   └── (אין תתי-שרירים)')
      } else {
        muscle.subMuscles.forEach((sub, index) => {
          const isLast = index === muscle.subMuscles.length - 1
          const prefix = isLast ? '└──' : '├──'
          console.log(`   ${prefix} ${sub.nameHe} (${sub.nameEn}) [${sub.id}]`)
        })
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60))
    console.log('📊 סיכום:')
    console.log('='.repeat(60))
    console.log(`   שרירים ראשיים: ${muscles.length}`)
    console.log(`   סה"כ תתי-שרירים: ${totalSubMuscles}`)
    console.log(`   ממוצע תתי-שרירים לשריר: ${(totalSubMuscles / muscles.length).toFixed(1)}`)

    if (musclesWithoutSubs.length > 0) {
      console.log(`\n⚠️  שרירים ללא תתי-שרירים: ${musclesWithoutSubs.join(', ')}`)
    }

    // JSON output option
    console.log('\n' + '-'.repeat(40))
    console.log('📄 JSON Output:')
    console.log('-'.repeat(40))

    const jsonReport = muscles.map(m => ({
      id: m.id,
      nameHe: m.nameHe,
      nameEn: m.nameEn,
      icon: m.icon,
      subMusclesCount: m.subMuscles?.length || 0,
      subMuscles: m.subMuscles?.map(s => ({
        id: s.id,
        nameHe: s.nameHe,
        nameEn: s.nameEn
      })) || []
    }))

    console.log(JSON.stringify(jsonReport, null, 2))

    console.log('\n✅ דוח הופק בהצלחה!')

  } catch (error) {
    console.error('❌ שגיאה:', error)
    process.exit(1)
  }

  process.exit(0)
}

generateMuscleReport()
