import { getExercises, bulkImportExercises } from '../src/lib/firebase/exercises'
import { mockExercises } from '../src/domains/exercises/data/mockExercises'

async function main() {
  const existing = await getExercises()
  if (existing.length > 0) {
    console.log(`Emulator already has ${existing.length} exercises, skipping`)
    return
  }

  console.log('Seeding emulator with exercises...')
  const result = await bulkImportExercises(mockExercises as any)
  console.log('Seed result:', result)
}

main().catch((e) => {
  console.error('Seed failed:', e)
  process.exit(1)
})

