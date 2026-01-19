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
| `exercises` | Exercise library | name, nameHe, primaryMuscle, equipment |
| `workoutHistory` | Completed workouts | userId, exercises[], calories, duration |
| `workoutSessions` | Active workouts | userId, exercises[], status, createdAt |

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
