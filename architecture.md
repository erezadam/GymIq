# Architecture – GymIQ

## 1. Tech Stack

| טכנולוגיה | גרסה | שימוש |
|-----------|------|-------|
| React | 18 | UI Framework |
| TypeScript | 5.x | Type Safety |
| Vite | 5.x | Build Tool |
| Zustand | 4.x | State Management |
| Firebase | 10.x | Auth, Firestore, Hosting |
| Tailwind CSS | 3.x | Styling |

---

## 2. מבנה תיקיות

```
GymIQ/
├── CLAUDE.md                    # מסמך שליטה עליון
├── tailwind.config.js           # מקור אמת לעיצוב
├── src/
│   ├── index.css                # CSS custom properties
│   ├── App.tsx                  # Routes
│   ├── main.tsx                 # Entry point
│   ├── domains/
│   │   ├── admin/
│   │   │   └── components/      # ExerciseForm, UsersList, MuscleManager
│   │   ├── authentication/
│   │   │   ├── components/      # LoginPage, RegisterPage
│   │   │   ├── hooks/           # useAuth
│   │   │   └── types/
│   │   ├── dashboard/
│   │   │   └── components/      # UserDashboard
│   │   ├── exercises/
│   │   │   ├── components/      # ExerciseLibrary, ExerciseCard
│   │   │   ├── services/        # exerciseService
│   │   │   └── types/           # exercise.types
│   │   └── workouts/
│   │       ├── components/
│   │       │   ├── WorkoutBuilder.tsx
│   │       │   ├── WorkoutSession.tsx
│   │       │   ├── WorkoutHistory.tsx
│   │       │   └── active-workout/
│   │       ├── hooks/           # useActiveWorkout
│   │       ├── store/           # workoutBuilderStore (Zustand)
│   │       └── types/           # workout.types
│   └── lib/
│       └── firebase/            # Config & services
└── docs/                        # מסמכי תיעוד
```

---

## 3. Firebase Collections

| Collection | תיאור | שדות עיקריים |
|------------|-------|--------------|
| `users` | פרופילי משתמשים | uid, name, phone, role |
| `exercises` | ספריית תרגילים | name, muscleGroup, imageUrl |
| `muscles` | קטגוריות שרירים | name, hebrewName |
| `workoutSessions` | אימונים פעילים | odri, odri, exercises[], status |
| `workoutHistory` | היסטוריית אימונים | userId, completedAt, exercises[] |

---

## 4. סטטוסי אימון

| סטטוס | צבע | תיאור |
|-------|-----|-------|
| `planned` | אדום | אימון מתוכנן לעתיד |
| `in_progress` | צהוב | אימון בתהליך |
| `completed` | כחול/ירוק | אימון שהושלם |

---

## 5. זרימות עיקריות

### זרימת יצירת אימון:
```
דשבורד → בחירת תרגילים → [תאריך היום] → אימון פעיל
                        → [תאריך עתידי] → תוכנית אימונים
```

### זרימת ביצוע אימון:
```
אימון פעיל → דיווח סטים → סיום תרגיל → סיום אימון → היסטוריה
```

---

## 6. State Management

### Zustand Stores:
- `workoutBuilderStore` - ניהול בניית אימון
- `authStore` - ניהול משתמש מחובר

### מבנה Store:
```typescript
interface WorkoutBuilderStore {
  selectedExercises: Exercise[]
  scheduledDate: Date | null
  addExercise: (exercise: Exercise) => void
  removeExercise: (exerciseId: string) => void
  setScheduledDate: (date: Date | null) => void
  reset: () => void
}
```

---

## 7. קונבנציות קוד

### שמות קבצים:
- קומפוננטות: `PascalCase.tsx`
- hooks: `useCamelCase.ts`
- types: `camelCase.types.ts`
- services: `camelCaseService.ts`

### Types:
```typescript
// workout.types.ts - לשימוש כללי
export interface WorkoutExercise { ... }

// active-workout.types.ts - לאימון פעיל בלבד
export interface ActiveWorkoutExercise { ... }
```

---

## 8. נתיבים (Routes)

| נתיב | קומפוננטה | תיאור |
|------|-----------|-------|
| `/` | Dashboard | דשבורד ראשי |
| `/exercises` | ExerciseLibrary | ספריית תרגילים |
| `/workout/builder` | WorkoutBuilder | בניית אימון |
| `/workout/:id` | WorkoutSession | אימון פעיל |
| `/history` | WorkoutHistory | היסטוריה/תוכנית |
| `/admin` | AdminPanel | ניהול מערכת |
