/**
 * Script to update exercise images in Firestore with valid URLs
 * Run: npx tsx scripts/updateExerciseImages.ts
 */

import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyALBuSomQPQhp1JZABeBRKwsLzmkOdg6yc',
  authDomain: 'gymiq-e8b4e.firebaseapp.com',
  projectId: 'gymiq-e8b4e',
  storageBucket: 'gymiq-e8b4e.firebasestorage.app',
  messagingSenderId: '406884457868',
  appId: '1:406884457868:web:d8de2397d14a1929b8caa9',
}

// Exercise images mapping - using free images from unsplash/pexels
const exerciseImages: Record<string, string> = {
  // Chest exercises
  'Bench Press': 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&h=300&fit=crop',
  'Push-up': 'https://images.unsplash.com/photo-1598971639058-fab3c3109a00?w=400&h=300&fit=crop',
  'Incline Dumbbell Press': 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=400&h=300&fit=crop',
  'Cable Fly': 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&h=300&fit=crop',

  // Back exercises
  'Deadlift': 'https://images.unsplash.com/photo-1603287681836-b174ce5074c2?w=400&h=300&fit=crop',
  'Pull-up': 'https://images.unsplash.com/photo-1598266663439-2056e6900339?w=400&h=300&fit=crop',
  'Lat Pulldown': 'https://images.unsplash.com/photo-1590487988256-9ed24133863e?w=400&h=300&fit=crop',
  'Dumbbell Row': 'https://images.unsplash.com/photo-1603287681836-b174ce5074c2?w=400&h=300&fit=crop',

  // Legs exercises
  'Squat': 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=400&h=300&fit=crop',
  'Leg Press': 'https://images.unsplash.com/photo-1434608519344-49d77a699e1d?w=400&h=300&fit=crop',
  'Romanian Deadlift': 'https://images.unsplash.com/photo-1517963879433-6ad2b056d712?w=400&h=300&fit=crop',

  // Shoulders exercises
  'Overhead Press': 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=400&h=300&fit=crop',

  // Arms exercises
  'Bicep Curl': 'https://images.unsplash.com/photo-1581009146145-b5ef050c149a?w=400&h=300&fit=crop',
  'Tricep Pushdown': 'https://images.unsplash.com/photo-1530822847156-5df684ec5ee1?w=400&h=300&fit=crop',

  // Core exercises
  'Plank': 'https://images.unsplash.com/photo-1566241142559-40e1dab266c6?w=400&h=300&fit=crop',
}

// Generic fallback images by category
const categoryFallbacks: Record<string, string> = {
  chest: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&h=300&fit=crop',
  back: 'https://images.unsplash.com/photo-1603287681836-b174ce5074c2?w=400&h=300&fit=crop',
  legs: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=400&h=300&fit=crop',
  shoulders: 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=400&h=300&fit=crop',
  arms: 'https://images.unsplash.com/photo-1581009146145-b5ef050c149a?w=400&h=300&fit=crop',
  core: 'https://images.unsplash.com/photo-1566241142559-40e1dab266c6?w=400&h=300&fit=crop',
}

async function updateExerciseImages() {
  console.log('Starting exercise image update...\n')

  const app = initializeApp(firebaseConfig)
  const db = getFirestore(app)

  try {
    const exercisesRef = collection(db, 'exercises')
    const snapshot = await getDocs(exercisesRef)

    if (snapshot.empty) {
      console.log('No exercises found!')
      process.exit(0)
    }

    console.log(`Found ${snapshot.size} exercises\n`)

    let updated = 0
    for (const docSnapshot of snapshot.docs) {
      const data = docSnapshot.data()
      const exerciseName = data.name

      // Try to get specific image, fallback to category image
      let imageUrl = exerciseImages[exerciseName]
      if (!imageUrl) {
        imageUrl = categoryFallbacks[data.category] || categoryFallbacks.chest
      }

      // Update the document
      const exerciseRef = doc(db, 'exercises', docSnapshot.id)
      await updateDoc(exerciseRef, { imageUrl })

      console.log(`Updated: ${exerciseName} (${data.nameHe})`)
      updated++
    }

    console.log(`\n========================================`)
    console.log(`Updated ${updated} exercises with images`)
    console.log(`========================================\n`)

    process.exit(0)
  } catch (error: any) {
    console.error('Error:', error.message)
    process.exit(1)
  }
}

updateExerciseImages()
