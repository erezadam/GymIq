---
name: gymiq-firebase-data
description: "Firebase data management for GymIQ fitness app. Handles Firestore operations, auto-save functionality, and workout data integrity. Use when working with database operations, workout persistence, or data-related features."
---

# GymIQ Firebase & Data Management

**מתי להפעיל:** כשעובדים עם מסד נתונים, שמירת אימונים, אוטו-סייב, או כל פיצ'ר הקשור לנתונים

## 🔐 אזהרת אבטחה - חוק ברזל!

> **לעולם לא לכתוב מפתחות Firebase בקוד!**

```typescript
// ❌ אסור!
const firebaseConfig = { apiKey: "AIzaSy..." };

// ✅ נכון - בסקריפטים:
import { db, app } from './firebase-config';

// ✅ נכון - באפליקציה:
import.meta.env.VITE_FIREBASE_API_KEY
```

**לפרטים מלאים ראה סעיף אבטחה ב-CLAUDE.md**

## Firebase Collections

### Core Collections
| Collection | Purpose | Key Fields |
|------------|---------|------------|
| `users` | User profiles | uid, name, phone, role |
| `exercises` | Exercise library | name, nameHe, primaryMuscle, equipment, category, reportType |
| `workoutHistory` | Completed/In-progress workouts | userId, exercises[], calories, duration, status |
| `muscles` | Muscle groups | id, nameHe, iconUrl, subMuscles[] |
| `equipment` | Gym equipment | id, nameHe |
| `reportTypes` | Exercise report types | id, nameHe, fields[] |
| `appSettings` | App configuration | externalComparisonUrl |

### Collection Relationships
```
users
  └── workoutHistory (userId)
        └── exercises[] (exerciseId → exercises collection)

exercises
  └── primaryMuscle → muscles.id
  └── equipment → equipment.id
  └── reportType → reportTypes.id
```

## ⚠️ Exercise → Workout Data Flow (Critical!)

### הבעיה שנמצאה (24/01/2026):
שדה `reportType` נשמר בהגדרת התרגיל (Firebase) אבל לא הועבר לאימון פעיל.

### שורש הבעיה:
פונקציית `addExercise` נקראת ממספר מקומות - וכשמוסיפים שדה חדש, צריך לעדכן את **כולם**.

### זרימת הנתונים:
```
Firebase: exercises/{id}
  │
  ├── ExerciseCard.tsx ─────┐
  ├── ExerciseLibrary.tsx ──┼── addExercise() ──▶ Zustand Store ──▶ Active Workout
  ├── WorkoutSession.tsx ───┤
  └── WorkoutHistory.tsx ───┘ (4 מקומות!)
```

### חובה בעת הוספת שדה חדש לתרגיל:

1. **עדכון הטייפ:** `src/domains/workouts/types/active-workout.types.ts`
2. **עדכון Firebase:** `src/lib/firebase/exercises.ts` (אם רלוונטי)
3. **עדכון כל הקריאות ל-addExercise:**
   ```bash
   grep -r "addExercise(" src/ | grep -v "removeExercise"
   ```
4. **בדיקה שהשדה מגיע לרכיב הסופי** (למשל SetReportRow)

### רשימת שדות נוכחית ב-addExercise:
```typescript
addExercise({
  exerciseId: string,
  exerciseName: string,
  exerciseNameHe: string,
  imageUrl: string,
  primaryMuscle: string,
  category: string,
  equipment: string,
  reportType: string,  // ⚠️ נוסף 24/01/2026
})
```

### Data Patterns

#### Auto-Save Implementation
```typescript
// Critical: Save during workout, not just at completion
export const autoSaveWorkout = async (workoutId: string, data: WorkoutData) => {
  try {
    await updateDoc(doc(db, 'workoutSessions', workoutId), {
      ...data,
      lastSaved: new Date().toISOString()
    });
  } catch (error) {
    console.error('Auto-save failed:', error);
    // Retry logic here
  }
};
```

#### Data Integrity Rules
1. **Calories**: Use `workout.calories` (saved data), NOT `estimateCalories()` (calculated)
2. **Sets**: Save immediately when user reports, not on workout end
3. **Status**: `planned` → `in_progress` → `completed`

## Common Operations

### Exercise Management
```typescript
// Get exercises with muscle filtering
const getExercisesByMuscle = async (muscleId: string) => {
  const q = query(
    collection(db, 'exercises'),
    where('primaryMuscle', '==', muscleId),
    orderBy('nameHe')
  );
  return getDocs(q);
};
```

### Workout Recovery
```typescript
// Resume in-progress workout
const getInProgressWorkout = async (userId: string) => {
  const q = query(
    collection(db, 'workoutSessions'),
    where('userId', '==', userId),
    where('status', '==', 'in_progress')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs[0]?.data();
};
```

## Local Storage (Session/Local)

> **בנוסף ל-Firebase, הפרויקט משתמש ב-sessionStorage לשמירת state זמני**

### שימושים נוכחיים:
| מפתח | סוג | תפקיד |
|------|-----|-------|
| `gymiq-exercise-list-filters` | sessionStorage | שמירת מצב סינון בניהול תרגילים |

### דוגמת שימוש:
```typescript
// שמירה
const state = { filters, showFilters };
sessionStorage.setItem('key', JSON.stringify(state));

// טעינה
const stored = sessionStorage.getItem('key');
const state = stored ? JSON.parse(stored) : defaultState;
```

### מתי להשתמש:
- **sessionStorage**: מצב זמני שמתאפס בסגירת הדפדפן (פילטרים, העדפות זמניות)
- **localStorage**: מצב קבוע (לא בשימוש כרגע - הכל ב-Firebase)
- **Firebase**: מקור אמת יחיד לנתונים (אימונים, תרגילים, משתמשים)

## Error Handling

### Network Issues
```typescript
// Offline-first approach
const saveWorkoutWithRetry = async (data: WorkoutData, retries = 3) => {
  try {
    await saveWorkout(data);
  } catch (error) {
    if (retries > 0 && isNetworkError(error)) {
      await delay(1000);
      return saveWorkoutWithRetry(data, retries - 1);
    }
    throw error;
  }
};
```

### Data Validation
```typescript
// Validate before save
const validateWorkoutData = (data: WorkoutData): boolean => {
  return !!(
    data.userId &&
    data.exercises?.length > 0 &&
    data.createdAt
  );
};
```

## Performance Tips

### Batch Operations
```typescript
// Efficient bulk updates
const batch = writeBatch(db);
exercises.forEach(exercise => {
  const ref = doc(db, 'exercises', exercise.id);
  batch.update(ref, exercise);
});
await batch.commit();
```

### Query Optimization
- Use indexes for compound queries
- Limit results with `.limit(20)`
- Use pagination for large datasets

## Security Rules Reference

```javascript
// Firestore rules pattern
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /workoutHistory/{workoutId} {
      allow read, write: if resource.data.userId == request.auth.uid;
    }
    
    // Exercises are public read, admin write
    match /exercises/{exerciseId} {
      allow read: if true;
      allow write: if request.auth.token.role == 'admin';
    }
  }
}
```

This skill ensures reliable data persistence and prevents the workout data loss issues that historically affected GymIQ users.
