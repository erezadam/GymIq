/**
 * Muscle Gap Analysis Script
 * Compares muscles collection with exercises collection to find discrepancies
 *
 * Run with: npx tsx scripts/muscleGapAnalysis.ts
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

async function analyzeGaps() {
  console.log('\n' + '='.repeat(70))
  console.log('🔍 תחקיר פער נתונים - שרירים ותתי-שרירים')
  console.log('='.repeat(70) + '\n')

  try {
    // ==========================================
    // PART 1: Fetch muscles collection
    // ==========================================
    console.log('📌 MUSCLES COLLECTION:')
    console.log('-'.repeat(50))

    const musclesRef = collection(db, 'muscles')
    const musclesSnapshot = await getDocs(musclesRef)

    const musclesData: PrimaryMuscle[] = musclesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as PrimaryMuscle[]

    // Create lookup maps
    const muscleIdToName = new Map<string, string>()
    const muscleNameToId = new Map<string, string>()
    const subMuscleIdToName = new Map<string, string>()
    const subMuscleNameToId = new Map<string, string>()
    const allSubMuscleIds = new Set<string>()
    const allSubMuscleNames = new Set<string>()

    for (const muscle of musclesData) {
      muscleIdToName.set(muscle.id, muscle.nameHe)
      muscleNameToId.set(muscle.nameHe, muscle.id)
      muscleNameToId.set(muscle.nameEn.toLowerCase(), muscle.id)

      console.log(`\n${muscle.icon} ${muscle.nameHe} (${muscle.nameEn}) [id: ${muscle.id}]`)

      if (muscle.subMuscles && muscle.subMuscles.length > 0) {
        for (const sub of muscle.subMuscles) {
          subMuscleIdToName.set(sub.id, sub.nameHe)
          subMuscleNameToId.set(sub.nameHe, sub.id)
          subMuscleNameToId.set(sub.nameEn.toLowerCase(), sub.id)
          allSubMuscleIds.add(sub.id)
          allSubMuscleNames.add(sub.nameHe)
          console.log(`   ├── ${sub.nameHe} (${sub.nameEn}) [id: ${sub.id}]`)
        }
      }
    }

    // ==========================================
    // PART 2: Fetch exercises collection
    // ==========================================
    console.log('\n\n📌 EXERCISES COLLECTION - שדות שרירים:')
    console.log('-'.repeat(50))

    const exercisesRef = collection(db, 'exercises')
    const exercisesSnapshot = await getDocs(exercisesRef)

    // Collect unique values from exercises
    const exerciseMuscleGroups = new Set<string>()
    const exerciseCategories = new Set<string>()
    const exercisePrimaryMuscles = new Set<string>()
    const exerciseSecondaryMuscles = new Set<string>()
    const exerciseSubMuscles = new Set<string>()
    const fieldUsage: Record<string, number> = {}

    // Sample exercises for each unique value
    const samplesByMuscle: Record<string, string[]> = {}

    for (const doc of exercisesSnapshot.docs) {
      const data = doc.data()
      const exerciseName = data.nameHe || data.name || doc.id

      // Check all possible muscle-related fields
      const fieldsToCheck = ['muscleGroup', 'category', 'primaryMuscle', 'secondaryMuscle', 'subMuscle', 'targetMuscle', 'muscle']

      for (const field of fieldsToCheck) {
        if (data[field]) {
          fieldUsage[field] = (fieldUsage[field] || 0) + 1

          if (field === 'muscleGroup') exerciseMuscleGroups.add(data[field])
          if (field === 'category') exerciseCategories.add(data[field])
          if (field === 'primaryMuscle') exercisePrimaryMuscles.add(data[field])
          if (field === 'secondaryMuscle') {
            if (Array.isArray(data[field])) {
              data[field].forEach((m: string) => exerciseSecondaryMuscles.add(m))
            } else {
              exerciseSecondaryMuscles.add(data[field])
            }
          }
          if (field === 'subMuscle') exerciseSubMuscles.add(data[field])
        }
      }

      // Track samples
      const muscleKey = data.muscleGroup || data.category || data.primaryMuscle || 'unknown'
      if (!samplesByMuscle[muscleKey]) samplesByMuscle[muscleKey] = []
      if (samplesByMuscle[muscleKey].length < 3) {
        samplesByMuscle[muscleKey].push(exerciseName)
      }
    }

    console.log(`\nסה"כ תרגילים: ${exercisesSnapshot.docs.length}`)
    console.log('\nשימוש בשדות:')
    for (const [field, count] of Object.entries(fieldUsage)) {
      console.log(`   ${field}: ${count} תרגילים`)
    }

    console.log('\n📊 ערכים ייחודיים בכל שדה:')

    if (exerciseMuscleGroups.size > 0) {
      console.log(`\nmuscleGroup (${exerciseMuscleGroups.size}):`)
      Array.from(exerciseMuscleGroups).sort().forEach(v => console.log(`   • ${v}`))
    }

    if (exerciseCategories.size > 0) {
      console.log(`\ncategory (${exerciseCategories.size}):`)
      Array.from(exerciseCategories).sort().forEach(v => console.log(`   • ${v}`))
    }

    if (exercisePrimaryMuscles.size > 0) {
      console.log(`\nprimaryMuscle (${exercisePrimaryMuscles.size}):`)
      Array.from(exercisePrimaryMuscles).sort().forEach(v => console.log(`   • ${v}`))
    }

    if (exerciseSubMuscles.size > 0) {
      console.log(`\nsubMuscle (${exerciseSubMuscles.size}):`)
      Array.from(exerciseSubMuscles).sort().forEach(v => console.log(`   • ${v}`))
    }

    if (exerciseSecondaryMuscles.size > 0) {
      console.log(`\nsecondaryMuscle (${exerciseSecondaryMuscles.size}):`)
      Array.from(exerciseSecondaryMuscles).sort().forEach(v => console.log(`   • ${v}`))
    }

    // ==========================================
    // PART 3: Gap Analysis
    // ==========================================
    console.log('\n\n' + '='.repeat(70))
    console.log('🔍 ניתוח פערים:')
    console.log('='.repeat(70))

    // Combine all muscle references from exercises
    const allExerciseMuscleRefs = new Set([
      ...exerciseMuscleGroups,
      ...exerciseCategories,
      ...exercisePrimaryMuscles,
    ])

    const allExerciseSubMuscleRefs = new Set([
      ...exerciseSubMuscles,
      ...exerciseSecondaryMuscles,
    ])

    // Check primary muscles
    console.log('\n📌 שרירים ראשיים:')
    console.log('-'.repeat(40))

    const muscleIds = new Set(musclesData.map(m => m.id))
    const muscleNames = new Set(musclesData.map(m => m.nameHe))

    const unmatchedExerciseMuscles: string[] = []
    for (const ref of allExerciseMuscleRefs) {
      if (!muscleIds.has(ref) && !muscleNames.has(ref)) {
        unmatchedExerciseMuscles.push(ref)
      }
    }

    if (unmatchedExerciseMuscles.length > 0) {
      console.log('\n⚠️  בתרגילים אבל לא ב-muscles:')
      unmatchedExerciseMuscles.forEach(m => {
        const samples = samplesByMuscle[m] || []
        console.log(`   • "${m}" (דוגמאות: ${samples.join(', ') || 'N/A'})`)
      })
    } else {
      console.log('\n✅ כל השרירים הראשיים בתרגילים קיימים ב-muscles')
    }

    const unusedMuscles = musclesData.filter(m =>
      !allExerciseMuscleRefs.has(m.id) && !allExerciseMuscleRefs.has(m.nameHe)
    )
    if (unusedMuscles.length > 0) {
      console.log('\n⚠️  ב-muscles אבל לא בתרגילים:')
      unusedMuscles.forEach(m => console.log(`   • "${m.nameHe}" (${m.id})`))
    }

    // Check sub-muscles
    console.log('\n📌 תתי-שרירים:')
    console.log('-'.repeat(40))

    const unmatchedExerciseSubMuscles: string[] = []
    for (const ref of allExerciseSubMuscleRefs) {
      if (!allSubMuscleIds.has(ref) && !allSubMuscleNames.has(ref)) {
        unmatchedExerciseSubMuscles.push(ref)
      }
    }

    if (unmatchedExerciseSubMuscles.length > 0) {
      console.log('\n⚠️  בתרגילים אבל לא ב-muscles.subMuscles:')
      unmatchedExerciseSubMuscles.forEach(m => console.log(`   • "${m}"`))
    } else {
      console.log('\n✅ כל תתי-השרירים בתרגילים קיימים ב-muscles')
    }

    const unusedSubMuscles = Array.from(allSubMuscleNames).filter(name =>
      !allExerciseSubMuscleRefs.has(name) &&
      !allExerciseSubMuscleRefs.has(subMuscleNameToId.get(name) || '')
    )
    if (unusedSubMuscles.length > 0) {
      console.log('\n⚠️  ב-muscles.subMuscles אבל לא בתרגילים:')
      unusedSubMuscles.forEach(m => console.log(`   • "${m}"`))
    }

    // ==========================================
    // PART 4: Possible Naming Mismatches
    // ==========================================
    console.log('\n\n📌 אי-התאמות אפשריות בשמות:')
    console.log('-'.repeat(40))

    const nameMismatches: Array<{ muscles: string, exercises: string, similarity: string }> = []

    // Known similar names to check
    const similarPairs = [
      ['רחב גבי', 'לאטס'],
      ['latissimus_dorsi', 'lats'],
      ['זרוע קדמית', 'ביספס'],
      ['biceps_brachii', 'biceps'],
      ['יד אחורית', 'טריספס'],
      ['triceps_brachii', 'triceps'],
      ['ארבע ראשי', 'קוואדריספס'],
      ['quadriceps', 'quads'],
    ]

    for (const [name1, name2] of similarPairs) {
      const inMuscles = allSubMuscleNames.has(name1) || allSubMuscleIds.has(name1)
      const inExercises = allExerciseSubMuscleRefs.has(name2)

      if (inMuscles && inExercises) {
        nameMismatches.push({ muscles: name1, exercises: name2, similarity: 'אותו שריר?' })
      }
    }

    if (nameMismatches.length > 0) {
      console.log('\n⚠️  שמות שונים לאותו שריר:')
      nameMismatches.forEach(m =>
        console.log(`   • "${m.muscles}" (muscles) ↔ "${m.exercises}" (exercises) - ${m.similarity}`)
      )
    } else {
      console.log('\n✅ לא נמצאו אי-התאמות ברורות בשמות')
    }

    // ==========================================
    // Summary
    // ==========================================
    console.log('\n\n' + '='.repeat(70))
    console.log('📊 סיכום:')
    console.log('='.repeat(70))
    console.log(`   שרירים ב-muscles: ${musclesData.length}`)
    console.log(`   תתי-שרירים ב-muscles: ${allSubMuscleIds.size}`)
    console.log(`   תרגילים: ${exercisesSnapshot.docs.length}`)
    console.log(`   ערכי muscleGroup/category ייחודיים: ${allExerciseMuscleRefs.size}`)
    console.log(`   ערכי subMuscle ייחודיים: ${allExerciseSubMuscleRefs.size}`)
    console.log(`   פערים בשרירים ראשיים: ${unmatchedExerciseMuscles.length}`)
    console.log(`   פערים בתתי-שרירים: ${unmatchedExerciseSubMuscles.length}`)

    console.log('\n✅ ניתוח הושלם!')

  } catch (error) {
    console.error('❌ שגיאה:', error)
    process.exit(1)
  }

  process.exit(0)
}

analyzeGaps()
