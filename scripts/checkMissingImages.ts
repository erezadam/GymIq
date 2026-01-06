/**
 * Script to check which exercises are missing image URLs
 *
 * Usage: npx tsx scripts/checkMissingImages.ts
 */

import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyALBuSomQPQhp1JZABeBRKwsLzmkOdg6yc',
  authDomain: 'gymiq-e8b4e.firebaseapp.com',
  projectId: 'gymiq-e8b4e',
  storageBucket: 'gymiq-e8b4e.firebasestorage.app',
  messagingSenderId: '406884457868',
  appId: '1:406884457868:web:d8de2397d14a1929b8caa9',
}

async function checkMissingImages() {
  const app = initializeApp(firebaseConfig)
  const db = getFirestore(app)

  console.log('מתחבר ל-Firebase...\n')

  const exercisesRef = collection(db, 'exercises')
  const snapshot = await getDocs(exercisesRef)

  console.log(`נמצאו ${snapshot.size} תרגילים בסה"כ\n`)

  const withImage: { name: string; nameHe: string; imageUrl: string }[] = []
  const withoutImage: { id: string; name: string; nameHe: string }[] = []
  const withBrokenUrl: { id: string; name: string; nameHe: string; imageUrl: string }[] = []

  snapshot.docs.forEach(doc => {
    const data = doc.data()
    const imageUrl = data.imageUrl || ''

    if (!imageUrl || imageUrl.trim() === '') {
      withoutImage.push({
        id: doc.id,
        name: data.name || 'Unknown',
        nameHe: data.nameHe || 'לא ידוע',
      })
    } else if (imageUrl.includes('github.com/erezadam/exercise-images')) {
      // GitHub repo that doesn't exist
      withBrokenUrl.push({
        id: doc.id,
        name: data.name || 'Unknown',
        nameHe: data.nameHe || 'לא ידוע',
        imageUrl,
      })
    } else {
      withImage.push({
        name: data.name || 'Unknown',
        nameHe: data.nameHe || 'לא ידוע',
        imageUrl,
      })
    }
  })

  console.log('='.repeat(60))
  console.log('📊 סיכום:')
  console.log('='.repeat(60))
  console.log(`✅ תרגילים עם תמונה תקינה: ${withImage.length}`)
  console.log(`⚠️  תרגילים עם URL שבור (GitHub): ${withBrokenUrl.length}`)
  console.log(`❌ תרגילים ללא תמונה: ${withoutImage.length}`)
  console.log('')

  if (withoutImage.length > 0) {
    console.log('='.repeat(60))
    console.log('❌ תרגילים ללא תמונה:')
    console.log('='.repeat(60))
    withoutImage.forEach((ex, i) => {
      console.log(`${i + 1}. ${ex.nameHe} (${ex.name})`)
      console.log(`   ID: ${ex.id}`)
    })
    console.log('')
  }

  if (withBrokenUrl.length > 0) {
    console.log('='.repeat(60))
    console.log('⚠️  תרגילים עם URL שבור (GitHub repo לא קיים):')
    console.log('='.repeat(60))
    withBrokenUrl.forEach((ex, i) => {
      console.log(`${i + 1}. ${ex.nameHe} (${ex.name})`)
      console.log(`   ID: ${ex.id}`)
      console.log(`   URL: ${ex.imageUrl}`)
    })
    console.log('')
  }

  if (withImage.length > 0) {
    console.log('='.repeat(60))
    console.log('✅ תרגילים עם תמונה תקינה:')
    console.log('='.repeat(60))
    withImage.forEach((ex, i) => {
      console.log(`${i + 1}. ${ex.nameHe} (${ex.name})`)
      console.log(`   URL: ${ex.imageUrl}`)
    })
  }

  process.exit(0)
}

checkMissingImages().catch(error => {
  console.error('שגיאה:', error)
  process.exit(1)
})
