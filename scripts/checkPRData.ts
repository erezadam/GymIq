/**
 * Check PR data in Firebase
 *
 * Usage: npx tsx scripts/checkPRData.ts
 */

import { collection, getDocs } from 'firebase/firestore'
import { db } from './firebase-config'

async function checkData() {
  console.log('🔍 בודק נתוני אימונים ב-Firebase...\n')

  const historyRef = collection(db, 'workoutHistory')
  const snapshot = await getDocs(historyRef)

  console.log(`📊 סה"כ אימונים: ${snapshot.docs.length}\n`)

  let completedWithSets = 0
  const exercisesWithData = new Set<string>()

  for (const doc of snapshot.docs) {
    const data = doc.data()
    const exercises = data.exercises || []

    console.log(`📋 אימון: ${doc.id}`)
    console.log(`   סטטוס: ${data.status}`)
    console.log(`   תרגילים: ${exercises.length}`)

    if (data.status === 'completed' && exercises.length > 0) {
      for (const ex of exercises) {
        const sets = ex.sets || []
        const validSets = sets.filter((s: any) =>
          (s.actualReps && s.actualReps > 0) || s.completed
        )

        if (validSets.length > 0) {
          completedWithSets++
          exercisesWithData.add(ex.exerciseId)

          const bestSet = validSets.reduce((best: any, curr: any) => {
            const currWeight = curr.actualWeight || 0
            const bestWeight = best.actualWeight || 0
            return currWeight > bestWeight ? curr : best
          }, validSets[0])

          console.log(`   ✅ ${ex.exerciseNameHe}: משקל=${bestSet.actualWeight || 0}, חזרות=${bestSet.actualReps || 0}`)
        }
      }
    }
    console.log('')
  }

  console.log('📊 סיכום:')
  console.log(`   אימונים שהושלמו עם סטים תקינים: ${completedWithSets}`)
  console.log(`   תרגילים שונים עם נתונים: ${exercisesWithData.size}`)

  if (exercisesWithData.size === 0) {
    console.log('\n⚠️ אין נתונים! צריך אימון עם status=completed וסטים עם actualReps > 0')
  }

  process.exit(0)
}

checkData().catch(console.error)
