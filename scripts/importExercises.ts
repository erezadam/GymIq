/**
 * Script to import exercises to Firestore
 *
 * Usage:
 * 1. Make sure you have a .env file with Firebase credentials
 * 2. Run: npx tsx scripts/importExercises.ts
 *
 * Or from the browser console (when logged in as admin):
 * - The import button in admin panel will use this data
 */

import { initializeApp } from 'firebase/app'
import { getFirestore, collection, writeBatch, doc, getDocs } from 'firebase/firestore'

// Exercise data to import
const exercisesData = [
  {
    name: 'Bench Press',
    nameHe: 'לחיצת חזה במישור',
    category: 'chest',
    primaryMuscle: 'chest',
    secondaryMuscles: ['triceps', 'shoulders'],
    equipment: 'barbell',
    difficulty: 'beginner',
    instructions: [
      'Lie on the bench with your eyes under the bar',
      'Grip the bar with hands wider than shoulder-width',
      'Lower the bar to your chest with control',
      'Press the bar back up to starting position',
    ],
    instructionsHe: [
      'שכב על הספסל כאשר העיניים מתחת למוט',
      'אחז במוט עם הידיים רחבות מרוחב הכתפיים',
      'הורד את המוט לחזה בשליטה',
      'דחף את המוט חזרה למצב התחלתי',
    ],
    targetMuscles: ['pectoralis_major', 'triceps_brachii', 'anterior_deltoid'],
    imageUrl: 'https://raw.githubusercontent.com/erezadam/exercise-images-en/main/bench_press.jpg',
    tips: ['Keep your feet flat on the floor', 'Maintain natural arch in your back', 'Control the weight throughout the movement'],
    tipsHe: ['שמור על הרגליים שטוחות על הרצפה', 'שמור על עקמומיות טבעית בגב', 'שלוט במשקל לאורך כל התנועה'],
  },
  {
    name: 'Squat',
    nameHe: 'כפיפת ברכיים',
    category: 'legs',
    primaryMuscle: 'quadriceps',
    secondaryMuscles: ['glutes', 'hamstrings', 'calves'],
    equipment: 'barbell',
    difficulty: 'beginner',
    instructions: [
      'Place the bar on your upper back',
      'Stand with feet shoulder-width apart',
      'Lower by pushing hips back and bending knees',
      'Drive through heels to return to standing',
    ],
    instructionsHe: [
      'הנח את המוט על החלק העליון של הגב',
      'עמוד עם הרגליים ברוחב הכתפיים',
      'רד על ידי דחיפת הישבן אחורה וכיפוף הברכיים',
      'דחף דרך העקבים כדי לחזור לעמידה',
    ],
    targetMuscles: ['quadriceps', 'gluteus_maximus', 'hamstrings'],
    imageUrl: 'https://raw.githubusercontent.com/erezadam/exercise-images-en/main/squat.jpg',
    tips: ['Keep your chest up throughout the movement', "Don't let knees cave inward", 'Go down until thighs are parallel to floor'],
    tipsHe: ['שמור על החזה למעלה לאורך התנועה', 'אל תיתן לברכיים ליפול פנימה', 'רד עד שהירכיים מקבילות לרצפה'],
  },
  {
    name: 'Deadlift',
    nameHe: 'הרמת משקל מת',
    category: 'back',
    primaryMuscle: 'hamstrings',
    secondaryMuscles: ['glutes', 'lower_back', 'traps'],
    equipment: 'barbell',
    difficulty: 'intermediate',
    instructions: [
      'Stand with feet hip-width apart, bar over mid-foot',
      'Bend at hips and knees to grab the bar',
      'Keep chest up and back straight',
      'Drive through heels and extend hips to lift',
    ],
    instructionsHe: [
      'עמוד עם הרגליים ברוחב הירכיים, המוט מעל אמצע הרגל',
      'התכופף בירכיים ובברכיים כדי לאחוז במוט',
      'שמור על החזה למעלה והגב ישר',
      'דחף דרך העקבים והרחב את הירכיים כדי להרים',
    ],
    targetMuscles: ['hamstrings', 'gluteus_maximus', 'erector_spinae', 'trapezius'],
    imageUrl: 'https://raw.githubusercontent.com/erezadam/exercise-images-en/main/deadlift.jpg',
    tips: ['Keep the bar close to your body', "Don't round your back", 'Engage your core throughout'],
    tipsHe: ['שמור את המוט קרוב לגוף', 'אל תעגל את הגב', 'הפעל את השרירים המרכזיים לאורך התנועה'],
  },
  {
    name: 'Push-up',
    nameHe: 'שכיבות שמיכה',
    category: 'chest',
    primaryMuscle: 'chest',
    secondaryMuscles: ['triceps', 'shoulders', 'core'],
    equipment: 'bodyweight',
    difficulty: 'beginner',
    instructions: [
      'Start in plank position with hands under shoulders',
      'Lower your body until chest nearly touches floor',
      'Push back up to starting position',
      'Keep body in straight line throughout',
    ],
    instructionsHe: [
      'התחל במצב פלאנק עם הידיים מתחת לכתפיים',
      'הורד את הגוף עד שהחזה כמעט נוגע ברצפה',
      'דחף חזרה למצב התחלתי',
      'שמור על הגוף בקו ישר לאורך התנועה',
    ],
    targetMuscles: ['pectoralis_major', 'triceps_brachii', 'anterior_deltoid'],
    imageUrl: 'https://raw.githubusercontent.com/erezadam/exercise-images-en/main/push_up.jpg',
    tips: ["Don't let hips sag or pike up", 'Keep core engaged', 'Full range of motion for best results'],
    tipsHe: ['אל תיתן לירכיים לצנוח או להתרומם', 'שמור על השרירים המרכזיים פעילים', 'טווח תנועה מלא לתוצאות הטובות ביותר'],
  },
  {
    name: 'Pull-up',
    nameHe: 'מתח',
    category: 'back',
    primaryMuscle: 'lats',
    secondaryMuscles: ['biceps', 'rhomboids', 'middle_traps'],
    equipment: 'pull_up_bar',
    difficulty: 'intermediate',
    instructions: [
      'Hang from bar with arms fully extended',
      'Pull yourself up until chin clears the bar',
      'Lower yourself with control to starting position',
      'Avoid swinging or using momentum',
    ],
    instructionsHe: [
      'תלה מהמוט כאשר הידיים מפושטות לחלוטין',
      'משוך את עצמך למעלה עד שהסנטר עובר את המוט',
      'הורד את עצמך בשליטה למצב התחלתי',
      'הימנע מתנדנוד או שימוש במומנטום',
    ],
    targetMuscles: ['latissimus_dorsi', 'biceps_brachii', 'rhomboids'],
    imageUrl: 'https://raw.githubusercontent.com/erezadam/exercise-images-en/main/pull_up.jpg',
    tips: ['Use full range of motion', 'Focus on pulling with your back muscles', 'Start with assisted variations if needed'],
    tipsHe: ['השתמש בטווח תנועה מלא', 'התמקד במשיכה עם שרירי הגב', 'התחל עם וריאציות בסיוע במידת הצורך'],
  },
  {
    name: 'Overhead Press',
    nameHe: 'לחיצת כתפיים',
    category: 'shoulders',
    primaryMuscle: 'shoulders',
    secondaryMuscles: ['triceps', 'core'],
    equipment: 'barbell',
    difficulty: 'intermediate',
    instructions: [
      'Stand with feet shoulder-width apart',
      'Hold the bar at shoulder level',
      'Press the bar overhead until arms are locked',
      'Lower the bar back to shoulders with control',
    ],
    instructionsHe: [
      'עמוד עם רגליים ברוחב הכתפיים',
      'החזק את המוט בגובה הכתפיים',
      'דחף את המוט למעלה עד שהזרועות נעולות',
      'הורד את המוט בחזרה לכתפיים בשליטה',
    ],
    targetMuscles: ['deltoids', 'triceps', 'core'],
    imageUrl: 'https://raw.githubusercontent.com/erezadam/exercise-images-en/main/overhead_press.jpg',
    tips: ['Keep your core tight', 'Dont lean back excessively', 'Full lockout at the top'],
    tipsHe: ['שמור על הליבה מכווצת', 'אל תיטה אחורה יותר מדי', 'נעילה מלאה למעלה'],
  },
  {
    name: 'Bicep Curl',
    nameHe: 'כפיפת ביספס',
    category: 'arms',
    primaryMuscle: 'biceps',
    secondaryMuscles: ['forearms'],
    equipment: 'dumbbell',
    difficulty: 'beginner',
    instructions: [
      'Stand holding dumbbells at your sides',
      'Curl the weights up to shoulder level',
      'Squeeze at the top',
      'Lower with control',
    ],
    instructionsHe: [
      'עמוד עם משקולות בצדדים',
      'כופף את המשקולות לגובה הכתפיים',
      'לחץ בנקודה העליונה',
      'הורד בשליטה',
    ],
    targetMuscles: ['biceps_brachii', 'brachialis'],
    imageUrl: 'https://raw.githubusercontent.com/erezadam/exercise-images-en/main/bicep_curl.jpg',
    tips: ['Keep elbows stationary', 'Dont swing the weight', 'Control the negative'],
    tipsHe: ['שמור על המרפקים קבועים', 'אל תנדנד את המשקל', 'שלוט בירידה'],
  },
  {
    name: 'Tricep Pushdown',
    nameHe: 'מתיחת טרייספס בכבל',
    category: 'arms',
    primaryMuscle: 'triceps',
    secondaryMuscles: [],
    equipment: 'cable_machine',
    difficulty: 'beginner',
    instructions: [
      'Stand facing the cable machine',
      'Grip the bar with hands shoulder-width',
      'Push the bar down until arms are straight',
      'Return to starting position with control',
    ],
    instructionsHe: [
      'עמוד מול מכונת הכבלים',
      'אחוז במוט ברוחב כתפיים',
      'דחף את המוט למטה עד שהזרועות ישרות',
      'חזור למצב התחלתי בשליטה',
    ],
    targetMuscles: ['triceps_brachii'],
    imageUrl: 'https://raw.githubusercontent.com/erezadam/exercise-images-en/main/tricep_pushdown.jpg',
    tips: ['Keep elbows close to body', 'Full extension at bottom', 'Dont use momentum'],
    tipsHe: ['שמור על המרפקים צמודים לגוף', 'מתיחה מלאה למטה', 'אל תשתמש במומנטום'],
  },
  {
    name: 'Lat Pulldown',
    nameHe: 'משיכת גב עליון',
    category: 'back',
    primaryMuscle: 'lats',
    secondaryMuscles: ['biceps', 'rhomboids'],
    equipment: 'cable_machine',
    difficulty: 'beginner',
    instructions: [
      'Sit at the lat pulldown machine',
      'Grip the bar wider than shoulder-width',
      'Pull the bar down to upper chest',
      'Return to start with control',
    ],
    instructionsHe: [
      'שב במכונת המשיכה',
      'אחוז במוט רחב מרוחב הכתפיים',
      'משוך את המוט לחזה העליון',
      'חזור להתחלה בשליטה',
    ],
    targetMuscles: ['latissimus_dorsi', 'biceps', 'rhomboids'],
    imageUrl: 'https://raw.githubusercontent.com/erezadam/exercise-images-en/main/lat_pulldown.jpg',
    tips: ['Lean back slightly', 'Squeeze shoulder blades together', 'Control the weight up'],
    tipsHe: ['הישען מעט אחורה', 'לחץ את עצמות הכתף יחד', 'שלוט במשקל בעלייה'],
  },
  {
    name: 'Leg Press',
    nameHe: 'לחיצת רגליים',
    category: 'legs',
    primaryMuscle: 'quadriceps',
    secondaryMuscles: ['glutes', 'hamstrings'],
    equipment: 'machine',
    difficulty: 'beginner',
    instructions: [
      'Sit in the leg press machine',
      'Place feet shoulder-width on the platform',
      'Lower the weight by bending knees',
      'Press back up to starting position',
    ],
    instructionsHe: [
      'שב במכונת לחיצת רגליים',
      'הנח רגליים ברוחב כתפיים על הפלטפורמה',
      'הורד את המשקל על ידי כיפוף ברכיים',
      'דחף חזרה למצב התחלתי',
    ],
    targetMuscles: ['quadriceps', 'gluteus_maximus', 'hamstrings'],
    imageUrl: 'https://raw.githubusercontent.com/erezadam/exercise-images-en/main/leg_press.jpg',
    tips: ['Dont lock knees at top', 'Keep feet flat', 'Control the descent'],
    tipsHe: ['אל תנעל ברכיים למעלה', 'שמור על רגליים שטוחות', 'שלוט בירידה'],
  },
  {
    name: 'Plank',
    nameHe: 'פלאנק',
    category: 'core',
    primaryMuscle: 'core',
    secondaryMuscles: ['shoulders', 'glutes'],
    equipment: 'bodyweight',
    difficulty: 'beginner',
    instructions: [
      'Start in push-up position on forearms',
      'Keep body in straight line from head to heels',
      'Engage core and hold position',
      'Breathe steadily throughout',
    ],
    instructionsHe: [
      'התחל במצב שכיבה על האמות',
      'שמור על הגוף בקו ישר מהראש לעקבים',
      'הפעל את הליבה והחזק מצב',
      'נשום בצורה קבועה',
    ],
    targetMuscles: ['rectus_abdominis', 'transverse_abdominis', 'obliques'],
    imageUrl: 'https://raw.githubusercontent.com/erezadam/exercise-images-en/main/plank.jpg',
    tips: ['Dont let hips sag', 'Keep neck neutral', 'Squeeze glutes'],
    tipsHe: ['אל תיתן לירכיים לצנוח', 'שמור על צוואר ניטרלי', 'לחץ על הישבן'],
  },
  {
    name: 'Romanian Deadlift',
    nameHe: 'מתים רומני',
    category: 'legs',
    primaryMuscle: 'hamstrings',
    secondaryMuscles: ['glutes', 'lower_back'],
    equipment: 'barbell',
    difficulty: 'intermediate',
    instructions: [
      'Stand with bar at hip level',
      'Push hips back while lowering bar',
      'Keep bar close to legs throughout',
      'Return to standing by extending hips',
    ],
    instructionsHe: [
      'עמוד עם המוט בגובה הירכיים',
      'דחף ירכיים אחורה בזמן הורדת המוט',
      'שמור את המוט קרוב לרגליים',
      'חזור לעמידה על ידי הרחבת הירכיים',
    ],
    targetMuscles: ['hamstrings', 'gluteus_maximus', 'erector_spinae'],
    imageUrl: 'https://raw.githubusercontent.com/erezadam/exercise-images-en/main/romanian_deadlift.jpg',
    tips: ['Keep slight knee bend', 'Feel the stretch in hamstrings', 'Dont round lower back'],
    tipsHe: ['שמור על כיפוף קל בברכיים', 'הרגש מתיחה בירך האחורי', 'אל תעגל את הגב התחתון'],
  },
  {
    name: 'Incline Dumbbell Press',
    nameHe: 'לחיצה במשופע עם משקולות',
    category: 'chest',
    primaryMuscle: 'chest',
    secondaryMuscles: ['shoulders', 'triceps'],
    equipment: 'dumbbell',
    difficulty: 'intermediate',
    instructions: [
      'Set bench to 30-45 degree incline',
      'Hold dumbbells at shoulder level',
      'Press weights up and together',
      'Lower with control to starting position',
    ],
    instructionsHe: [
      'הגדר ספסל לשיפוע של 30-45 מעלות',
      'החזק משקולות בגובה הכתפיים',
      'דחף את המשקולות למעלה ויחד',
      'הורד בשליטה למצב התחלתי',
    ],
    targetMuscles: ['pectoralis_major_upper', 'anterior_deltoid', 'triceps'],
    imageUrl: 'https://raw.githubusercontent.com/erezadam/exercise-images-en/main/incline_dumbbell_press.jpg',
    tips: ['Keep wrists straight', 'Dont flare elbows too wide', 'Touch dumbbells at top'],
    tipsHe: ['שמור על פרקי יד ישרים', 'אל תפתח מרפקים יותר מדי', 'גע במשקולות למעלה'],
  },
  {
    name: 'Cable Fly',
    nameHe: 'צלבים בכבלים',
    category: 'chest',
    primaryMuscle: 'chest',
    secondaryMuscles: ['shoulders'],
    equipment: 'cable_machine',
    difficulty: 'intermediate',
    instructions: [
      'Stand between cable stations',
      'Grab handles with arms extended to sides',
      'Bring hands together in front of chest',
      'Return to starting position with control',
    ],
    instructionsHe: [
      'עמוד בין עמדות הכבלים',
      'אחוז בידיות עם זרועות מושטות לצדדים',
      'הבא את הידיים יחד מול החזה',
      'חזור למצב התחלתי בשליטה',
    ],
    targetMuscles: ['pectoralis_major', 'anterior_deltoid'],
    imageUrl: 'https://raw.githubusercontent.com/erezadam/exercise-images-en/main/cable_fly.jpg',
    tips: ['Slight bend in elbows', 'Focus on squeezing chest', 'Control the stretch'],
    tipsHe: ['כיפוף קל במרפקים', 'התמקד בלחיצת החזה', 'שלוט במתיחה'],
  },
  {
    name: 'Dumbbell Row',
    nameHe: 'חתירה חד צדדית',
    category: 'back',
    primaryMuscle: 'lats',
    secondaryMuscles: ['biceps', 'rhomboids', 'traps'],
    equipment: 'dumbbell',
    difficulty: 'beginner',
    instructions: [
      'Place one knee and hand on bench',
      'Hold dumbbell in free hand',
      'Row the weight up to hip',
      'Lower with control and repeat',
    ],
    instructionsHe: [
      'הנח ברך ויד אחת על ספסל',
      'החזק משקולת ביד החופשית',
      'משוך את המשקל לכיוון הירך',
      'הורד בשליטה וחזור על התרגיל',
    ],
    targetMuscles: ['latissimus_dorsi', 'biceps', 'rhomboids'],
    imageUrl: 'https://raw.githubusercontent.com/erezadam/exercise-images-en/main/dumbbell_row.jpg',
    tips: ['Keep back flat', 'Pull elbow past torso', 'Squeeze at top'],
    tipsHe: ['שמור על גב ישר', 'משוך מרפק מעבר לגוף', 'לחץ בנקודה העליונה'],
  },
]

// This function can be called from the app to import exercises
export async function importExercisesToFirestore(firebaseConfig: {
  apiKey: string
  authDomain: string
  projectId: string
  storageBucket: string
  messagingSenderId: string
  appId: string
}) {
  const app = initializeApp(firebaseConfig, 'import-script')
  const db = getFirestore(app)

  // Check if exercises already exist
  const existingSnapshot = await getDocs(collection(db, 'exercises'))
  if (existingSnapshot.size > 0) {
    console.log(`Found ${existingSnapshot.size} existing exercises. Skipping import.`)
    return { success: 0, skipped: existingSnapshot.size }
  }

  // Import exercises in batches
  const batch = writeBatch(db)
  let count = 0

  for (const exercise of exercisesData) {
    const docRef = doc(collection(db, 'exercises'))
    batch.set(docRef, {
      ...exercise,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    count++
  }

  await batch.commit()
  console.log(`Successfully imported ${count} exercises`)

  return { success: count, skipped: 0 }
}

// Export the data for use in the app
export { exercisesData }

// Run import if called directly
const firebaseConfig = {
  apiKey: 'AIzaSyALBuSomQPQhp1JZABeBRKwsLzmkOdg6yc',
  authDomain: 'gymiq-e8b4e.firebaseapp.com',
  projectId: 'gymiq-e8b4e',
  storageBucket: 'gymiq-e8b4e.firebasestorage.app',
  messagingSenderId: '406884457868',
  appId: '1:406884457868:web:d8de2397d14a1929b8caa9',
}

importExercisesToFirestore(firebaseConfig)
  .then((result) => {
    console.log('Import completed:', result)
    process.exit(0)
  })
  .catch((error) => {
    console.error('Import failed:', error)
    process.exit(1)
  })
