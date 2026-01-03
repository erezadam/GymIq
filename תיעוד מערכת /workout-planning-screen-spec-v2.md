# מפרט מסך תוכנית אימונים - GymIQ
## Workout Planning Screen Specification
**גרסה:** 1.0  
**תאריך:** ינואר 2026

---

## ⚠️ הנחיות חשובות לסוכן

1. **שמור על הקו העיצובי הקיים** - לא לשנות צבעים כלליים, פונטים, או סגנון
2. **כל העיצוב מקובץ design tokens** - לא ערכים קשיחים בקומפוננטות
3. **שם המסך: "תוכנית אימונים"** (לא "היסטוריה" או "אימונים מתוכננים")

---

## 1. תיאור כללי

מסך שמציג את כל האימונים של המשתמש מהשבועיים האחרונים, כולל:
- אימונים שהושלמו (כחול)
- אימונים בתהליך/חלקיים (צהוב)  
- אימונים מתוכננים לעתיד (אדום - מוצמדים לראש הרשימה)

---

## 2. מבנה המסך

```
┌─────────────────────────────────────────────┐
│            תוכנית אימונים                   │
├─────────────────────────────────────────────┤
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐           │
│  │אימו-│ │אימו-│ │ימים │ │נפח  │           │
│  │נים  │ │נים  │ │ברצף │ │כולל │           │
│  │החודש│ │השבוע│ │     │ │     │           │
│  └─────┘ └─────┘ └─────┘ └─────┘           │
├─────────────────────────────────────────────┤
│                                             │
│  [אימון מתוכנן - אדום - מוצמד למעלה]       │
│  [אימון מתוכנן - אדום - מוצמד למעלה]       │
│  ─────────────────────────────────          │
│  [אימון בתהליך - צהוב]                      │
│  [אימון שהושלם - כחול]                      │
│  [אימון שהושלם - כחול]                      │
│  ...                                        │
│                                             │
│  (scrollable - שבועיים אחרונים)             │
│                                             │
└─────────────────────────────────────────────┘
```

---

## 3. קוביות סטטיסטיקה (למעלה)

```typescript
interface StatsCards {
  // קוביה 1 - ימין
  monthlyWorkouts: {
    label: 'אימונים החודש';
    value: number;
    calculation: 'מ-1 לחודש עד סוף החודש';
    icon: 'calendar';
  };
  
  // קוביה 2
  weeklyWorkouts: {
    label: 'אימונים השבוע';
    value: number;
    calculation: 'מיום ראשון עד שבת (כולל)';
    icon: 'chart';
  };
  
  // קוביה 3
  streakDays: {
    label: 'ימים ברצף';
    value: number;
    calculation: 'ימים רצופים עם אימון';
    icon: 'checkmark';
  };
  
  // קוביה 4 - שמאל
  totalVolume: {
    label: 'נפח כולל';
    value: string; // "0kg"
    calculation: 'סכום כל המשקלים';
    icon: 'trending-up';
  };
}
```

---

## 4. סטטוסי אימון וצבעים

```typescript
type WorkoutStatus = 'completed' | 'in_progress' | 'planned';

const statusConfig = {
  completed: {
    label: 'הושלם',
    color: 'blue',      // כחול
    bgClass: 'bg-blue-500/20',
    borderClass: 'border-blue-500',
    textClass: 'text-blue-400',
    position: 'normal', // לפי תאריך
  },
  
  in_progress: {
    label: 'בתהליך',
    color: 'yellow',    // צהוב
    bgClass: 'bg-yellow-500/20',
    borderClass: 'border-yellow-500',
    textClass: 'text-yellow-400',
    position: 'normal', // לפי תאריך
  },
  
  planned: {
    label: 'מתוכנן',
    color: 'red',       // אדום
    bgClass: 'bg-red-500/20',
    borderClass: 'border-red-500',
    textClass: 'text-red-400',
    position: 'top',    // מוצמד לראש הרשימה!
  },
};
```

**הגדרת סטטוס:**
| סטטוס | תנאי |
|-------|------|
| `completed` | כל התרגילים באימון סומנו כ"הושלם" |
| `in_progress` | האימון התחיל אך לא כל התרגילים הושלמו |
| `planned` | תאריך האימון הוא בעתיד (לא התחיל עדיין) |

---

## 5. כרטיס אימון - מצב סגור (Collapsed)

```
┌─────────────────────────────────────────────────────────┐
│  [🗑]  ▼ X תרגילים    שם האימון        [סטטוס]         │
│                       01.01.2026                        │
│                       Arms, Chest, Back                 │
└─────────────────────────────────────────────────────────┘
```

```typescript
interface WorkoutCardCollapsed {
  workoutId: string;
  workoutName: string;
  date: Date;
  muscleGroups: string[];
  exerciseCount: number;
  completedExerciseCount: number;
  status: WorkoutStatus;
  
  // תצוגה
  display: {
    name: string;           // "Untitled Workout" או שם מותאם
    date: string;           // "01.01.2026"
    muscles: string;        // "Arms, Chest, Back"
    exercises: string;      // "3 תרגילים"
    statusBadge: StatusBadge;
  };
}
```

---

## 6. כרטיס אימון - מצב פתוח (Expanded)

```
┌─────────────────────────────────────────────────────────┐
│  [🗑]  ▲ 3 תרגילים    Untitled Workout    [בתהליך]     │
│                       01.01.2026                        │
│                       Arms                              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│        זמן              │         קלוריות               │
│       0 דק'             │            0                  │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│              [▶ המשך לאימון]                            │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  בעמידה כפיפת מרפקים עם מוט                             │
│  ─────────────────────────────────────────              │
│  Arms  │  סטים: 1  │  חזרות: 10  │  משקל: 20 ק"ג       │
│                                                         │
│  לחיצת חזה צרה במשקולות יד                              │
│  ─────────────────────────────────────────              │
│  Arms  │  סטים: 1  │  חזרות: __  │  משקל: __ ק"ג       │
│                                                         │
│  בישיבה, כפיפת מרפקים על ספסל...                        │
│  ─────────────────────────────────────────              │
│  Arms  │  סטים: 1  │  חזרות: __  │  משקל: __ ק"ג       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 7. כפתור "המשך לאימון" - לוגיקה

```typescript
const handleContinueToWorkout = (workout: Workout) => {
  if (workout.status === 'in_progress' || workout.status === 'planned') {
    // אימון חלקי או מתוכנן
    showConfirmDialog({
      title: 'המשך אימון',
      message: 'שים לב: אתה ממשיך את האימון הקיים',
      onConfirm: () => {
        // לא יוצרים אימון חדש - ממשיכים את הקיים
        // מעדכנים את הנתונים באותו אימון
        navigateToActiveWorkout(workout.id);
      }
    });
    
  } else if (workout.status === 'completed') {
    // אימון שהושלם
    showConfirmDialog({
      title: 'אימון חדש',
      message: 'שים לב: אתה מתחיל אימון מהתחלה',
      onConfirm: () => {
        // האימון המקורי נשאר בהיסטוריה
        // יוצרים אימון חדש עם אותם תרגילים (בלי נתונים)
        const newWorkoutId = createNewWorkoutFromTemplate(workout);
        navigateToActiveWorkout(newWorkoutId);
      }
    });
  }
};
```

**סיכום הלוגיקה:**

| סטטוס אימון | הודעה | מה קורה |
|-------------|-------|---------|
| `in_progress` / `planned` | "שים לב: אתה ממשיך את האימון הקיים" | ממשיכים את אותו אימון, מעדכנים נתונים |
| `completed` | "שים לב: אתה מתחיל אימון מהתחלה" | המקורי נשאר, נוצר אימון חדש נקי |

---

## 8. מצב ריק - אין אימונים

כאשר אין אימונים בשבועיים האחרונים, מוצג:

```
┌─────────────────────────────────────────────┐
│            תוכנית אימונים                   │
├─────────────────────────────────────────────┤
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐           │
│  │  0  │ │  0  │ │  0  │ │ 0kg │           │
│  └─────┘ └─────┘ └─────┘ └─────┘           │
├─────────────────────────────────────────────┤
│                                             │
│              [אייקון אימונים]               │
│                                             │
│           עדיין אין אימונים                 │
│        התחל את האימון הראשון שלך!          │
│                                             │
│           [התחל אימון] (כפתור)              │
│                                             │
└─────────────────────────────────────────────┘
```

---

## 9. יצירת אימון מתוכנן (עתידי)

### 9.1 שינוי נדרש במסך בניית אימון

צריך להוסיף **שדה תאריך אופציונלי** למסך בחירת התרגילים:

```
┌─────────────────────────────────────────────┐
│         בניית אימון חופשי                   │
├─────────────────────────────────────────────┤
│                                             │
│  תאריך אימון (אופציונלי):                   │
│  ┌─────────────────────────────────────┐   │
│  │  📅  בחר תאריך...                    │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  [רשימת תרגילים לבחירה...]                 │
│                                             │
└─────────────────────────────────────────────┘
```

### 9.2 לוגיקת שמירה

```typescript
const saveWorkout = (exercises: Exercise[], selectedDate?: Date) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const isPlanned = selectedDate && selectedDate > today;
  
  const workout: Workout = {
    id: generateId(),
    exercises,
    date: selectedDate || today,
    status: isPlanned ? 'planned' : 'in_progress',
    createdAt: serverTimestamp(),
  };
  
  // שומרים ל-Firebase
  await addDoc(collection(db, 'workouts'), workout);
  
  if (isPlanned) {
    // אימון עתידי - חוזרים למסך תוכנית אימונים
    showToast('האימון נשמר לתאריך ' + formatDate(selectedDate));
    navigateTo('/workout-planning');
  } else {
    // אימון להיום - עוברים למסך אימון פעיל
    navigateToActiveWorkout(workout.id);
  }
};
```

---

## 10. מבנה נתונים - Firebase

```typescript
interface WorkoutDocument {
  id: string;
  
  // מידע בסיסי
  userId: string;
  workoutName: string;
  
  // תאריכים
  scheduledDate: Timestamp;     // תאריך מתוכנן (יכול להיות עתידי)
  createdAt: Timestamp;         // מתי נוצר
  startedAt?: Timestamp;        // מתי התחילו לבצע
  completedAt?: Timestamp;      // מתי הושלם
  
  // סטטוס
  status: 'completed' | 'in_progress' | 'planned';
  
  // סטטיסטיקות
  duration?: number;            // זמן בדקות
  totalVolume?: number;         // נפח כולל
  calories?: number;
  
  // תרגילים
  exercises: WorkoutExercise[];
  
  // מטא-דאטה
  muscleGroups: string[];       // לתצוגה מהירה
  exerciseCount: number;
  completedExerciseCount: number;
}
```

---

## 11. סידור הרשימה

```typescript
const sortWorkouts = (workouts: Workout[]): Workout[] => {
  // 1. קודם אימונים מתוכננים (planned) - לפי תאריך עולה
  const planned = workouts
    .filter(w => w.status === 'planned')
    .sort((a, b) => a.scheduledDate - b.scheduledDate);
  
  // 2. אחר כך שאר האימונים - לפי תאריך יורד (החדש קודם)
  const others = workouts
    .filter(w => w.status !== 'planned')
    .sort((a, b) => b.scheduledDate - a.scheduledDate);
  
  // 3. מחברים: מתוכננים למעלה, שאר למטה
  return [...planned, ...others];
};
```

---

## 12. פילטר שבועיים

```typescript
const filterLastTwoWeeks = (workouts: Workout[]): Workout[] => {
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  twoWeeksAgo.setHours(0, 0, 0, 0);
  
  return workouts.filter(workout => {
    // אימונים מתוכננים לעתיד - תמיד מוצגים
    if (workout.status === 'planned') return true;
    
    // אחרים - רק מהשבועיים האחרונים
    return workout.scheduledDate >= twoWeeksAgo;
  });
};
```

---

## 13. קבצים ליצירה/עדכון

```
src/
├── pages/
│   └── WorkoutPlanningPage.tsx          // שינוי שם + עדכון לוגיקה
├── components/
│   └── workout-planning/
│       ├── StatsCards.tsx               // קוביות סטטיסטיקה (עדכון שמות)
│       ├── WorkoutCard.tsx              // כרטיס עם צבעי סטטוס
│       ├── WorkoutExerciseList.tsx      // רשימת תרגילים בפירוט
│       ├── ContinueWorkoutDialog.tsx    // דיאלוג אישור
│       ├── EmptyState.tsx               // מצב ריק
│       └── DatePicker.tsx               // בורר תאריך (לאימון מתוכנן)
├── hooks/
│   └── useWorkoutPlanning.ts            // לוגיקה + Firebase
└── lib/
    └── firebase/
        └── workoutPlanningService.ts    // פונקציות Firebase
```

---

## 14. סיכום השינויים הנדרשים

| מה | שינוי |
|----|-------|
| שם המסך | "תוכנית אימונים" במקום "אימונים מתוכננים" / "היסטוריה" |
| קוביה 1 | "אימונים החודש" - מ-1 לחודש עד סופו |
| קוביה 2 | "אימונים השבוע" - ראשון עד שבת |
| צבע הושלם | כחול |
| צבע בתהליך | צהוב |
| צבע מתוכנן | אדום + מוצמד למעלה |
| כפתור | "המשך לאימון" |
| הודעה - חלקי | "שים לב: אתה ממשיך את האימון הקיים" |
| הודעה - מלא | "שים לב: אתה מתחיל אימון מהתחלה" |
| שדה תאריך | להוסיף למסך בניית אימון (אופציונלי) |
| פילטר | שבועיים אחרונים (קבוע) |

---

## 15. דוגמאות ויזואליות

### כרטיס אימון שהושלם (כחול):
```
┌─ border-blue-500 ─────────────────────────────┐
│  🗑  ▼ 3 תרגילים    אימון בוקר    [הושלם]    │  ← bg-blue-500/20
│                      01.01.2026               │
│                      Arms, Chest              │
└───────────────────────────────────────────────┘
```

### כרטיס אימון בתהליך (צהוב):
```
┌─ border-yellow-500 ───────────────────────────┐
│  🗑  ▼ 5 תרגילים    אימון ערב    [בתהליך]    │  ← bg-yellow-500/20
│                      02.01.2026               │
│                      Legs, Core               │
└───────────────────────────────────────────────┘
```

### כרטיס אימון מתוכנן (אדום - למעלה):
```
┌─ border-red-500 ──────────────────────────────┐
│  🗑  ▼ 4 תרגילים    אימון שישי   [מתוכנן]    │  ← bg-red-500/20
│                      05.01.2026               │
│                      Back, Shoulders          │
└───────────────────────────────────────────────┘
```
