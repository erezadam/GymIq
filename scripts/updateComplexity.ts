/**
 * Update complexity field for exercises in Firebase
 * Reads from exercises_export_with_complexity.json and updates ONLY the complexity field
 * Uses Firebase Admin SDK with application default credentials
 *
 * Usage: GOOGLE_APPLICATION_CREDENTIALS=~/.config/firebase/erez1964_gmail_com_application_default_credentials.json npx tsx scripts/updateComplexity.ts
 */

import { readFileSync } from 'fs'
import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

initializeApp({
  credential: applicationDefault(),
  projectId: 'gymiq-e8b4e',
})

const db = getFirestore()

const COMPLEXITY_MAP: Record<string, 'compound' | 'simple'> = {
  'מורכב': 'compound',
  'פשוט': 'simple',
}

async function updateComplexity() {
  const filePath = '/Users/erezadam/Downloads/exercises_export_with_complexity.json'
  const raw = readFileSync(filePath, 'utf-8')
  const data = JSON.parse(raw)
  const exercises: Array<{ id: string; מורכבות: string }> = data.exercises

  console.log(`📋 Total exercises in file: ${exercises.length}`)

  let updated = 0
  let skipped = 0
  const errors: string[] = []

  for (const exercise of exercises) {
    const heValue = exercise['מורכבות']
    const complexity = COMPLEXITY_MAP[heValue]

    if (!complexity) {
      console.warn(`⚠️ Unknown מורכבות value "${heValue}" for id=${exercise.id}, skipping`)
      skipped++
      continue
    }

    try {
      const exerciseRef = db.collection('exercises').doc(exercise.id)
      await exerciseRef.update({ complexity })
      updated++
      if (updated % 20 === 0) {
        console.log(`  ✅ Updated ${updated}/${exercises.length}...`)
      }
    } catch (err) {
      const msg = `❌ Failed to update ${exercise.id}: ${err}`
      console.error(msg)
      errors.push(msg)
    }
  }

  console.log(`\n📊 Results:`)
  console.log(`  ✅ Updated: ${updated}`)
  console.log(`  ⏭️  Skipped: ${skipped}`)
  console.log(`  ❌ Errors: ${errors.length}`)

  if (errors.length > 0) {
    console.log('\nErrors:')
    errors.forEach(e => console.log(`  ${e}`))
  }

  process.exit(0)
}

updateComplexity().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
