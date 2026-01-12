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
| React Router | 6.x | Navigation |

---

## 2. מבנה תיקיות

```
GymIQ/
├── CLAUDE.md                    # מסמך שליטה עליון
├── architecture.md              # מסמך זה
├── style_and_ui.md              # עיצוב וסגנון
├── qa_scenarios.md              # תרחישי בדיקה
├── CHANGELOG.md                 # היסטוריית שינויים
├── tailwind.config.js           # מקור אמת לעיצוב
├── firestore.rules              # Firebase security rules
├── src/
│   ├── index.css                # CSS custom properties
│   ├── App.tsx                  # Routes
│   ├── main.tsx                 # Entry point
│   ├── app/
│   │   ├── router/              # AuthGuard, GuestGuard
│   │   └── store/               # Global stores
│   ├── shared/
│   │   └── components/          # LoadingSpinner, MuscleIcon
│   ├── design-system/
│   │   └── layouts/             # MainLayout
│   ├── domains/
│   │   ├── admin/
│   │   │   └── components/      # ExerciseForm, ExerciseList, UsersList, MuscleManager, EquipmentManager, AdminLayout
│   │   ├── authentication/
│   │   │   ├── components/      # LoginPage
│   │   │   ├── store/           # authStore
│   │   │   └── types/
│   │   ├── dashboard/
│   │   │   └── components/      # UserDashboard
│   │   ├── exercises/
│   │   │   ├── components/      # ExerciseLibrary, ExerciseCard
│   │   │   ├── services/        # exerciseService
│   │   │   ├── types/           # exercise.types, muscles.ts
│   │   │   └── utils/           # getExerciseImageUrl
│   │   └── workouts/
│   │       ├── components/
│   │       │   ├── WorkoutBuilder.tsx
│   │       │   ├── WorkoutHistory.tsx
│   │       │   ├── PersonalRecords.tsx
│   │       │   └── active-workout/
│   │       │       ├── ActiveWorkoutScreen.tsx
│   │       │       ├── ExerciseCard.tsx
│   │       │       ├── NotesModal.tsx
│   │       │       ├── RestTimer.tsx
│   │       │       └── WorkoutSummaryModal.tsx
│   │       ├── hooks/           # useActiveWorkout
│   │       ├── store/           # workoutBuilderStore (Zustand)
│   │       └── types/           # workout.types, active-workout.types
│   └── lib/
│       └── firebase/
│           ├── config.ts        # Firebase initialization
│           ├── auth.ts          # Authentication
│           ├── users.ts         # User profiles
│           ├── exercises.ts     # Exercise CRUD
│           ├── muscles.ts       # Muscle groups CRUD
│           ├── equipment.ts     # Equipment CRUD
│           ├── workouts.ts      # Workout sessions
│           └── workoutHistory.ts # Workout history + Auto-save
└── scripts/                     # Debug utilities
```

---

## 3. Firebase Collections

| Collection | תיאור | שדות עיקריים |
|------------|-------|--------------|
| `users` | פרופילי משתמשים | uid, name, phone, role |
| `exercises` | ספריית תרגילים | name, nameHe, category, primaryMuscle, equipment, imageUrl |
| `muscles` | קטגוריות שרירים | id, nameHe, nameEn, icon (URL), subMuscles[] |
| `equipment` | ציוד כושר | id, nameHe, nameEn |
| `workoutSessions` | אימונים פעילים | userId, exercises[], status, createdAt |
| `workoutHistory` | היסטוריית אימונים | odri, odri, exercises[], calories, duration, totalVolume |

---

## 4. סטטוסי אימון

| סטטוס | צבע | תיאור | טקסט תצוגה |
|-------|-----|-------|------------|
| `planned` | כחול | אימון מתוכנן לעתיד | מתוכנן |
| `in_progress` | צהוב | אימון בתהליך | בתהליך |
| `completed` | ירוק | אימון שהושלם | הושלם |
| `cancelled` | אפור | אימון ללא דיווח | ללא דיווח |

---

## 5. נתיבים (Routes)

### נתיבי משתמש (Protected):

| נתיב | קומפוננטה | תיאור |
|------|-----------|-------|
| `/dashboard` | UserDashboard | דשבורד ראשי |
| `/exercises` | ExerciseLibrary | ספריית תרגילים |
| `/workout/new` | ExerciseLibrary | בחירת תרגילים לאימון חדש |
| `/workout/builder` | WorkoutBuilder | בניית אימון |
| `/workout/session` | ActiveWorkoutScreen | אימון פעיל |
| `/workout/history` | WorkoutHistory | היסטוריית אימונים |
| `/personal-records` | PersonalRecords | שיאים אישיים |

### נתיבי אדמין (Admin only):

| נתיב | קומפוננטה | תיאור |
|------|-----------|-------|
| `/admin/exercises` | ExerciseList | רשימת תרגילים |
| `/admin/exercises/new` | ExerciseForm | הוספת תרגיל |
| `/admin/exercises/:id/edit` | ExerciseForm | עריכת תרגיל |
| `/admin/muscles` | MuscleManager | ניהול שרירים |
| `/admin/equipment` | EquipmentManager | ניהול ציוד |
| `/admin/users` | UsersList | ניהול משתמשים |

---

## 6. זרימות עיקריות

### זרימת יצירת אימון:
```
דשבורד → "התחל אימון" → בחירת תרגילים → [תאריך היום] → אימון פעיל
                                        → [תאריך עתידי] → היסטוריה (planned)
```

### זרימת ביצוע אימון:
```
אימון פעיל → דיווח סטים → [Auto-Save כל 2 שניות] → סיום → פופאפ סיכום → שמירה → היסטוריה
```

### זרימת המשך אימון:
```
היסטוריה → כרטיס אימון (in_progress) → "המשך אימון" → אימון פעיל (עם נתונים קיימים)
```

---

## 7. State Management

### Zustand Stores:

| Store | קובץ | שימוש |
|-------|------|-------|
| `authStore` | authentication/store/authStore.ts | ניהול משתמש מחובר |
| `workoutBuilderStore` | workouts/store/workoutBuilderStore.ts | בניית אימון |

### מבנה workoutBuilderStore:
```typescript
interface WorkoutBuilderStore {
  selectedExercises: SelectedExercise[]
  scheduledDate: Date | null
  addExercise: (exercise: SelectedExercise) => void
  removeExercise: (exerciseId: string) => void
  setScheduledDate: (date: Date | null) => void
  reset: () => void
}
```

---

## 8. פיצ'רים עיקריים

| פיצ'ר | תיאור | קבצים |
|-------|-------|-------|
| **Auto-Save** | שמירת אימון אוטומטית כל 2 שניות | workoutHistory.ts, useActiveWorkout.ts |
| **Workout Recovery** | שחזור אימון in_progress בעת חזרה לאפליקציה | ActiveWorkoutScreen.tsx |
| **Rest Timer** | טיימר מנוחה צף אחרי הוספת סט | RestTimer.tsx |
| **Workout Summary** | פופאפ סיכום עם קלוריות | WorkoutSummaryModal.tsx |
| **MuscleIcon** | תמונות URL לאייקוני שרירים | MuscleIcon.tsx |
| **Dynamic Mapping** | מיפוי דינמי ID→שם עברית מ-Firebase | getMuscleIdToNameHeMap() |
| **Exercise Notes** | הערות לתרגילים באימון | NotesModal.tsx, ExerciseCard.tsx |
| **Last Workout Data** | הצגת נתוני אימון קודם | ExerciseCard.tsx |
| **Muscle Groups Display** | הצגת קבוצות שרירים בעברית בכרטיסי היסטוריה | WorkoutHistory.tsx, workout.types.ts |

---

## 9. קונבנציות קוד

### שמות קבצים:
- קומפוננטות: `PascalCase.tsx`
- hooks: `useCamelCase.ts`
- types: `camelCase.types.ts`
- services: `camelCaseService.ts`
- stores: `camelCaseStore.ts`

### Types:
```typescript
// workout.types.ts - לשימוש כללי
export interface WorkoutExercise { ... }

// active-workout.types.ts - לאימון פעיל בלבד
export interface ActiveWorkoutExercise { ... }
```

---

## 10. שירותי Firebase

| קובץ | פונקציות עיקריות |
|------|------------------|
| `auth.ts` | login, logout, getCurrentUser |
| `users.ts` | getUser, updateUser |
| `exercises.ts` | getExercises, createExercise, updateExercise, deleteExercise |
| `muscles.ts` | getMuscles, saveMuscle, getMuscleIdToNameHeMap |
| `equipment.ts` | getEquipment, createEquipment, updateEquipment, deleteEquipment |
| `workouts.ts` | createWorkout, getWorkouts, updateWorkout |
| `workoutHistory.ts` | getWorkoutHistory, autoSaveWorkout, getInProgressWorkout, completeWorkout |

---

```
═══════════════════════════════════════════════════════════════════════════════
עדכון אחרון: 12/01/2026
גרסה: 1.9.0
═══════════════════════════════════════════════════════════════════════════════
```
