# GymIQ - מודול מאמן - Phases מעודכן

> מסמך זה מעדכן את האפיון המקורי (`אפיון-מודול-מאמן.md`) עם ההחלטות שהתקבלו במסמך ההנחיות.
> **תאריך עדכון:** 02/02/2026

---

## סיכום שינויים מהאפיון המקורי

| נושא | אפיון מקורי | החלטה מעודכנת |
|------|-------------|--------------|
| אימות | email/password | נשאר email/password (ללא שינוי) |
| הודעות | חד-כיווני (מאמן->מתאמן) | דו-כיווני פשוט - מתאמן יכול להגיב |
| בעלות על תוכנית | תוכנית שייכת למאמן | תוכנית הופכת לנכס של המתאמן |
| מחיקת תרגיל | ללא הסבר | פופאפ עם שדה הסבר למאמן |
| עזיבת מאמן | לא הוגדר | היסטוריה נשארת, מאמן מאבד גישה |
| אבטחת Firestore | rules ספציפיים per-trainee | isTrainer() גורפי + סינון אפליקטיבי |

---

## Data Model - עדכונים

### עדכון 1: TrainerRelationship - הוספת שדות סיום

```typescript
interface TrainerRelationship {
  // ... שדות קיימים מהאפיון המקורי ...

  // חדש: כשמתאמן עוזב מאמן
  endedBy?: 'trainer' | 'trainee' | 'admin'  // מי סיים את הקשר
  endReason?: string                          // סיבת הסיום (אופציונלי)
}
```

### עדכון 2: TrainingProgram - בעלות מתאמן

```typescript
interface TrainingProgram {
  // ... שדות קיימים מהאפיון המקורי ...

  // חדש: מעקב שינויים של המתאמן
  originalTrainerId: string      // המאמן שיצר במקור
  isModifiedByTrainee: boolean   // האם המתאמן שינה מהתוכנית המקורית
}
```

### עדכון 3: TrainerMessage - תמיכה בתגובות

```typescript
interface TrainerMessage {
  // ... שדות קיימים מהאפיון המקורי ...

  // חדש: תגובות מתאמן
  replies?: MessageReply[]
}

interface MessageReply {
  id: string
  senderId: string            // uid של השולח (מתאמן או מאמן)
  senderName: string
  senderRole: 'trainer' | 'user'
  body: string
  createdAt: Timestamp | Date
}
```

**הערה:** תגובות נשמרות כ-array בתוך ההודעה המקורית (לא subcollection) - מתאים לכמות קטנה של תגובות.

### עדכון 4: WorkoutHistoryEntry - הסבר מחיקת תרגיל

```typescript
// הוספה ל-WorkoutHistoryEntry:
interface WorkoutHistoryEntry {
  // ... שדות קיימים ...

  // חדש: מעקב שינויים מתוכנית מאמן
  programModifications?: ProgramModification[]
}

interface ProgramModification {
  type: 'exercise_removed' | 'exercise_added' | 'sets_changed'
  exerciseId: string
  exerciseName: string
  reason?: string              // הסבר המתאמן למה שינה
  timestamp: Timestamp | Date
}
```

### עדכון 5: Firestore Rules - תגובות מתאמן

```
// עדכון לחוקי trainerMessages:
match /trainerMessages/{messageId} {
  // ... חוקים קיימים מהאפיון ...

  // חדש: מתאמן יכול לעדכן גם replies (בנוסף ל-isRead/readAt)
  allow update: if isAuthenticated() &&
    resource.data.traineeId == request.auth.uid &&
    request.resource.data.diff(resource.data).affectedKeys()
      .hasOnly(['isRead', 'readAt', 'replies']);
}
```

---

## עיקרון עבודה: ענף נפרד לכל Phase

### חובה לפני תחילת כל Phase:

1. **צור ענף חדש מ-main:**
   ```bash
   git checkout main
   git pull origin main
   git checkout -b trainer-module/phase-X
   ```
   כאשר X הוא מספר ה-Phase (למשל: `trainer-module/phase-1`)

2. **בסיום Phase - לא למזג ישירות!**
   - פתח Pull Request
   - המתן לאישור
   - רק אחרי אישור - מזג ל-main

3. **אם משהו נשבר:**
   ```bash
   git checkout main
   ```
   חזרה מיידית למצב יציב.

### מבנה הענפים:
```
main (יציב, production)
├── trainer-module/phase-1
├── trainer-module/phase-2
├── trainer-module/phase-3
├── trainer-module/phase-4
├── trainer-module/phase-5
├── trainer-module/phase-6
└── trainer-module/phase-7
```

### כללים:
- **אסור** לעבוד ישירות על main
- **אסור** למזג ללא אישור
- **חובה** לבדוק שהאפליקציה עובדת לפני פתיחת PR
- **חובה** לוודא שאין regression בפיצ'רים קיימים

---

## Phase 1: Foundation (Types + Rules + Data Model)

### לפני תחילת עבודה:
```bash
git checkout main
git pull origin main
git checkout -b trainer-module/phase-1
npm run build  # ודא שהכל תקין לפני שינויים
```

### מטרה
הקמת התשתית: types, interfaces, Firestore rules

### קבצים ליצירה
| קובץ | תיאור |
|------|--------|
| `src/domains/trainer/types/trainer.types.ts` | כל ה-interfaces כולל עדכונים (replies, modifications) |
| `src/domains/trainer/types/index.ts` | barrel export |

### קבצים לעדכון
| קובץ | שינוי | סיכון |
|------|-------|-------|
| `firestore.rules` | הוספת trainingPrograms, trainerMessages, עדכון users/workoutHistory | בינוני - שינוי rules משפיע על כל המשתמשים |
| `src/lib/firebase/auth.ts` (שורות 15-25) | הרחבת AppUser עם שדות trainer/trainee | נמוך - הוספת שדות אופציונליים |
| `src/domains/workouts/types/workout.types.ts` | הוספת `trainer_program` source, programId, programModifications | נמוך - הוספת שדות אופציונליים |

### בדיקות
- [ ] Types compile ללא שגיאות
- [ ] Firestore rules deploy בהצלחה
- [ ] אפליקציה קיימת עובדת ללא שינוי

### הנחיות עיצוב
אין עיצוב ב-Phase הזה - רק types ו-rules.

---

## Phase 2: Trainer-Trainee Relationships + Registration

### לפני תחילת עבודה:
```bash
git checkout main
git pull origin main
git checkout -b trainer-module/phase-2
npm run build  # ודא שהכל תקין לפני שינויים
```

### מטרה
מאמן יכול לראות דשבורד מאמנים, ליצור מתאמנים חדשים, ולנהל קשרים.

### תלויות
Phase 1

### קבצים ליצירה
| קובץ | תיאור |
|------|--------|
| `src/domains/trainer/services/trainerService.ts` | CRUD ל-relationships + סטטיסטיקות מתאמנים |
| `src/domains/trainer/services/traineeAccountService.ts` | יצירת חשבון מתאמן דרך secondary Firebase app instance |
| `src/domains/trainer/store/trainerStore.ts` | Zustand store: רשימת מתאמנים, מתאמן נבחר |
| `src/domains/trainer/hooks/useTrainerData.ts` | hook לטעינת מתאמנים + סטטיסטיקות |
| `src/domains/trainer/components/TrainerLayout.tsx` | layout wrapper עם sidebar (כמו AdminLayout) |
| `src/domains/trainer/components/TrainerDashboard.tsx` | דשבורד מאמן - רשימת מתאמנים |
| `src/domains/trainer/components/TraineeCard.tsx` | כרטיס מתאמן ברשימה |
| `src/domains/trainer/components/TraineeRegistrationModal.tsx` | מודאל יצירת מתאמן |

### קבצים לעדכון (דורש אישור!)
| קובץ | שינוי | סיכון | הסבר |
|------|-------|-------|------|
| `src/App.tsx` | הוספת routes ל-/trainer/* | נמוך | הוספה בלבד, לא משנה routes קיימים |
| `src/app/router/guards/AuthGuard.tsx` (שורות 19-26) | עדכון לתמיכה ב-role hierarchy | בינוני | משנה לוגיקת הרשאות קיימת - admin ו-user לא יושפעו |
| `src/design-system/layouts/MainLayout.tsx` (שורה 38, 148-167) | הוספת לינק "מאמן" בניווט | נמוך | הוספה מותנית בלבד |

### AuthGuard - השינוי הנדרש
```typescript
// נוכחי (שורות 19-26):
if (requiredRole && user?.role !== requiredRole) {
  if (user?.role === 'admin') return <>{children}</>
  return <Navigate to="/dashboard" replace />
}

// מעודכן - role hierarchy:
if (requiredRole) {
  const roleHierarchy: Record<string, number> = { user: 0, trainer: 1, admin: 2 }
  const userLevel = roleHierarchy[user?.role || 'user'] || 0
  const requiredLevel = roleHierarchy[requiredRole] || 0
  if (userLevel < requiredLevel) return <Navigate to="/dashboard" replace />
}
```

**ניתוח השפעה:** admin (level 2) יוכל לגשת ל-trainer routes (level 1) - התנהגות רצויה ונכונה. user (level 0) לא יוכל לגשת ל-trainer (1) או admin (2) - כמו היום. אין שינוי בהתנהגות קיימת.

### יצירת מתאמן - תהליך
```
1. מאמן לוחץ "+ מתאמן חדש"
2. מודאל עם: שם פרטי, שם משפחה, email, טלפון (אופציונלי), סיסמה זמנית, רמת כושר, מטרות, הערות, פציעות
3. בשליחה:
   a. יצירת חשבון Firebase Auth דרך SECONDARY app instance (לא מנתק את המאמן!)
   b. יצירת מסמך users/{newUid} עם trainerId
   c. יצירת מסמך trainerRelationships
   d. שליחת מייל password reset (המתאמן יגדיר סיסמה משלו)
   e. sign out מה-secondary auth
4. Toast: "המתאמן {name} נוצר בהצלחה"
```

### הנחיות עיצוב
- `TrainerLayout` - כמו AdminLayout: sidebar מימין, mobile hamburger
- `TrainerDashboard` - כמו UserDashboard: שורת סטטיסטיקות + רשימת כרטיסים
- `TraineeCard` - כמו ExerciseCard: אווטאר, שם, סטטיסטיקות, כפתורי פעולה
- `TraineeRegistrationModal` - כמו מודאל יצירת משתמש ב-UsersList.tsx
- **צבע מאמן:** `accent.blue` (#3B82F6) - שונה מ-admin (gold) ומ-primary (cyan)
- **אסור:** `style={{}}` - רק Tailwind classes + tokens

### מצבי מסך
| מצב | תיאור |
|-----|--------|
| Loading | Skeleton cards בזמן טעינת מתאמנים |
| Empty | "אין מתאמנים עדיין - הוסף את המתאמן הראשון שלך" + כפתור |
| Error | הודעת שגיאה עם אפשרות refresh |
| Populated | רשימת מתאמנים עם סטטיסטיקות |

### בדיקות
- [ ] מאמן רואה דשבורד מאמנים
- [ ] יצירת מתאמן חדש - חשבון נוצר ב-Firebase
- [ ] המתאמן מקבל מייל עם קישור להגדרת סיסמה
- [ ] המתאמן מתחבר בהצלחה
- [ ] המתאמן מופיע ברשימה של המאמן
- [ ] המאמן לא מתנתק בזמן יצירת מתאמן (secondary auth)
- [ ] user רגיל לא רואה לינק "מאמן" בניווט
- [ ] admin רואה לינק "מאמן" ויכול לגשת ל-/trainer
- [ ] RTL - כל הטקסטים מיושרים ימינה
- [ ] Mobile 375px - מודאל מלא מסך, כרטיסים בטור אחד

---

## Phase 3: Training Program Builder

### לפני תחילת עבודה:
```bash
git checkout main
git pull origin main
git checkout -b trainer-module/phase-3
npm run build  # ודא שהכל תקין לפני שינויים
```

### מטרה
מאמן בונה תוכנית אימונים שבועית מחזורית למתאמן, תוך שימוש חוזר בספריית התרגילים הקיימת.

### תלויות
Phase 2

### קבצים ליצירה
| קובץ | תיאור |
|------|--------|
| `src/domains/trainer/services/programService.ts` | CRUD לתוכניות + המרת יום-תוכנית לאימון |
| `src/domains/trainer/components/ProgramBuilder/ProgramBuilder.tsx` | ויזארד מרובה שלבים ליצירת תוכנית |
| `src/domains/trainer/components/ProgramBuilder/ProgramDayEditor.tsx` | עורך יום בודד |
| `src/domains/trainer/components/ProgramBuilder/ProgramExerciseEditor.tsx` | הגדרת יעדים לתרגיל (סטים, חזרות, משקל, הערות) |
| `src/domains/trainer/components/ProgramBuilder/ProgramReview.tsx` | סקירה לפני שמירה |
| `src/domains/trainer/components/ProgramBuilder/ProgramDayCard.tsx` | כרטיס סיכום יום |

### קבצים לעדכון (דורש אישור!)
| קובץ | שינוי | סיכון |
|------|-------|-------|
| `src/App.tsx` | הוספת routes לתוכניות | נמוך - הוספה בלבד |
| `src/domains/exercises/components/ExerciseLibrary.tsx` | הוספת `selectionMode` prop - מאפשר שימוש חוזר בלי להשפיע על workoutBuilderStore | בינוני - שינוי בקומפוננטה קיימת |

### ExerciseLibrary - השינוי הנדרש
```typescript
// הוספת prop:
interface ExerciseLibraryProps {
  selectionMode?: 'workout' | 'program'  // default: 'workout'
  onExerciseSelected?: (exercise: Exercise) => void  // callback ל-program mode
}

// כש-selectionMode === 'program':
// - לא מוסיף ל-workoutBuilderStore
// - קורא ל-onExerciseSelected במקום
// - כל שאר ה-UI (חיפוש, פילטרים, כרטיסי תרגילים) נשאר זהה
```

**ניתוח השפעה:** כש-`selectionMode` לא מסופק (ברירת מחדל 'workout'), ההתנהגות זהה לחלוטין להתנהגות הנוכחית. אין שינוי ב-flow הקיים.

### שלבי הוויזארד
```
שלב 1: פרטי תוכנית
├── בחירת מתאמן (dropdown)
├── שם תוכנית (input)
├── תיאור (textarea, אופציונלי)
├── משך בשבועות (number, 0 = ללא הגבלה)
└── תאריך התחלה (date picker)

שלב 2: מבנה שבועי
├── רשימת ימים (ברירת מחדל: 3 ימים)
├── לכל יום:
│   ├── תווית ("יום A", "יום B")
│   ├── שם ("חזה + טרייספס")
│   └── toggle יום מנוחה
├── הוספה/הסרה של ימים
└── גרירה לשינוי סדר

שלב 3: תרגילים לכל יום
├── לחיצה על "הוסף תרגילים" פותחת ExerciseLibrary ב-selectionMode='program'
├── לכל תרגיל שנבחר:
│   ├── סטים (number, ברירת מחדל 3)
│   ├── חזרות (text, "8-12")
│   ├── משקל מוצע (number, אופציונלי)
│   ├── מנוחה (seconds, ברירת מחדל 90)
│   └── הערות מאמן (textarea)
└── גרירה לשינוי סדר

שלב 4: סקירה
├── סיכום מלא של כל השבוע
├── לכל יום: רשימת תרגילים + יעדים
├── הערכת נפח שבועי
└── "שמור כטיוטה" / "הפעל תוכנית"
```

### הנחיות עיצוב
- `ProgramBuilder` - כמו WorkoutBuilder: ויזארד עם שלבים + אינדיקטור
- `ProgramDayEditor` - כרטיסים מתקפלים, כמו ExerciseCard ב-ActiveWorkout
- `ProgramExerciseEditor` - inputs עם labels, כמו SetReportRow
- **Step indicator:** טאבים/עיגולים עם מספרים (כמו onboarding patterns)
- **אסור:** `style={{}}` - רק Tailwind

### מצבי מסך
| מצב | תיאור |
|-----|--------|
| Loading | Skeleton בזמן טעינת תרגילים |
| Empty day | "הוסף תרגילים ליום הזה" + כפתור |
| Exercise selection | ExerciseLibrary מוטמע במודאל/sheet |
| Review | סיכום מלא בכרטיסים מקופלים |

### בדיקות
- [ ] יצירת תוכנית עם 3+ ימים ותרגילים
- [ ] שמירה ל-Firestore - מבנה נכון
- [ ] עריכת תוכנית קיימת
- [ ] הפעלת תוכנית חדשה מבטלת קודמת
- [ ] ExerciseLibrary עובד כרגיל ב-workout mode (רגרסיה!)
- [ ] RTL + Mobile 375px

---

## Phase 4: Trainee Program Experience

### לפני תחילת עבודה:
```bash
git checkout main
git pull origin main
git checkout -b trainer-module/phase-4
npm run build  # ודא שהכל תקין לפני שינויים
```

### מטרה
מתאמן רואה את תוכנית האימונים שלו בדשבורד, יכול להתחיל אימון מהתוכנית, ויכול לשנות/למחוק תרגילים (עם פופאפ הסבר).

### תלויות
Phase 3

### שינוי מהותי מהאפיון המקורי
**בעלות המתאמן:** ברגע שתוכנית נשלחת, היא הופכת לנכס של המתאמן:
- מתאמן יכול לשנות סטים/חזרות/משקל
- מתאמן יכול למחוק תרגיל (עם פופאפ הסבר)
- מתאמן יכול להוסיף תרגילים משלו
- המאמן רואה בהיסטוריה מה תוכנן vs מה בוצע

### קבצים ליצירה
| קובץ | תיאור |
|------|--------|
| `src/domains/trainer/hooks/useTraineeProgram.ts` | hook לטעינת תוכנית פעילה של מתאמן |
| `src/domains/trainer/components/ProgramView/TraineeProgramView.tsx` | סקציית תוכנית בדשבורד המתאמן |
| `src/domains/trainer/components/ProgramView/ProgramDayDetail.tsx` | תצוגת יום מפורטת |
| `src/domains/trainer/components/ProgramView/ProgramExerciseCard.tsx` | כרטיס תרגיל בתוכנית |
| `src/domains/trainer/components/ProgramView/ExerciseRemovalModal.tsx` | **חדש** - פופאפ הסבר מחיקת תרגיל |

### קבצים לעדכון (דורש אישור!)
| קובץ | שינוי | סיכון |
|------|-------|-------|
| `src/domains/dashboard/components/UserDashboard.tsx` | הוספת סקציית תוכנית למתאמנים עם trainerId | נמוך - תוספת מותנית |
| `src/domains/workouts/store/workoutBuilderStore.ts` | הוספת action `loadFromProgram` | נמוך - פונקציה חדשה |
| `src/lib/firebase/workoutHistory.ts` | טיפול ב-source `trainer_program` + שמירת programModifications | נמוך - תוספת בלבד |

### ExerciseRemovalModal - פופאפ הסבר
```
כשמתאמן מוחק תרגיל מאימון שמקורו בתוכנית מאמן:

┌──────────────────────────────┐
│     מחיקת תרגיל מהתוכנית      │
│                               │
│  אתה עומד למחוק את:            │
│  "סקוואט עם משקולת"            │
│                               │
│  ספר למאמן למה (אופציונלי):    │
│  ┌─────────────────────────┐  │
│  │ כאב בברך / ציוד תפוס... │  │
│  └─────────────────────────┘  │
│                               │
│  [ביטול]        [מחק תרגיל]   │
└──────────────────────────────┘
```

ההסבר נשמר ב-`programModifications[]` של ה-WorkoutHistoryEntry והמאמן רואה אותו בדף המתאמן.

### תהליך התחלת אימון מתוכנית
```
1. מתאמן בדשבורד רואה "תוכנית האימונים שלי"
2. רואה את האימון של היום (לפי מבנה שבועי + יום בשבוע)
3. לוחץ "התחל אימון"
4. המערכת:
   a. טוענת תרגילי היום מהתוכנית
   b. ממלאת workoutBuilderStore דרך loadFromProgram
   c. מנווטת ל-/workout/session (ActiveWorkout הקיים)
5. מתאמן מבצע אימון כרגיל
6. בסיום - WorkoutHistoryEntry נשמר עם:
   - source: 'trainer_program'
   - programId: ID של התוכנית
   - programDayLabel: "יום A"
   - programModifications: [שינויים שנעשו]
```

### הנחיות עיצוב
- `TraineeProgramView` - כרטיס מודגש בדשבורד, מעל כרטיסי הפעולה הקיימים
- `ProgramDayDetail` - דומה ל-WorkoutHistory expanded card
- `ProgramExerciseCard` - דומה ל-ExerciseCard עם targets
- `ExerciseRemovalModal` - מודאל פשוט עם textarea
- **צבע תוכנית מאמן:** `accent.blue` (#3B82F6)

### מצבי מסך
| מצב | תיאור |
|-----|--------|
| No program | לא מוצג כלום בדשבורד (כמו היום) |
| Has program, rest day | "יום מנוחה - מחר: חזה + טרייספס" |
| Has program, training day | כרטיס עם תרגילי היום + כפתור "התחל אימון" |
| During workout | ActiveWorkout רגיל |

### בדיקות
- [ ] מתאמן עם תוכנית רואה אותה בדשבורד
- [ ] יום נכון מוצג לפי יום בשבוע
- [ ] "התחל אימון" מעביר לתרגילים הנכונים
- [ ] מחיקת תרגיל מציגה פופאפ הסבר
- [ ] ההסבר נשמר ב-workoutHistory
- [ ] אימון נשמר עם source='trainer_program' ו-programId
- [ ] מתאמן בלי תוכנית - דשבורד כרגיל (רגרסיה!)
- [ ] RTL + Mobile 375px

---

## Phase 5: Trainer Monitoring Dashboard

### לפני תחילת עבודה:
```bash
git checkout main
git pull origin main
git checkout -b trainer-module/phase-5
npm run build  # ודא שהכל תקין לפני שינויים
```

### מטרה
מאמן רואה את כל התמונה של כל מתאמן: פרופיל, תוכנית, ביצועים, היסטוריית אימונים, ושינויים מהתוכנית.

### תלויות
Phase 2, Phase 4

### קבצים ליצירה
| קובץ | תיאור |
|------|--------|
| `src/domains/trainer/components/TraineeDetail.tsx` | דף מתאמן מפורט |
| `src/domains/trainer/components/TraineeProfileSection.tsx` | סקציית פרופיל (שם, מטרות, פציעות, הערות) |
| `src/domains/trainer/components/TraineePerformance.tsx` | סטטיסטיקות ביצוע |
| `src/domains/trainer/components/TraineeRecentWorkouts.tsx` | היסטוריית אימונים + שינויים מתוכנית |
| `src/domains/trainer/components/TrainerDashboardTile.tsx` | קוביית מאמן ב-UserDashboard |

### קבצים לעדכון (דורש אישור!)
| קובץ | שינוי | סיכון |
|------|-------|-------|
| `src/domains/dashboard/components/UserDashboard.tsx` | הוספת TrainerDashboardTile למאמן/admin | נמוך - תוספת מותנית |
| `src/App.tsx` | הוספת route לדף מתאמן | נמוך |

### דף מתאמן - מבנה
```
/trainer/trainee/:id

┌──────────────────────────────────┐
│ ← חזרה                    שם מתאמן │
├──────────────────────────────────┤
│ פרופיל                            │
│ ├── רמת כושר: מתקדם               │
│ ├── מטרות: בניית שריר, חיזוק      │
│ ├── פציעות: כאב גב תחתון         │
│ └── הערות מאמן: [עריכה]           │
├──────────────────────────────────┤
│ תוכנית נוכחית                     │
│ ├── "תוכנית חיזוק" - פעילה       │
│ ├── 3 ימים בשבוע                   │
│ └── [ערוך תוכנית] [צור חדשה]       │
├──────────────────────────────────┤
│ ביצועים                           │
│ ├── אימונים השבוע: 2/3            │
│ ├── סטריק: 5 ימים                 │
│ ├── נפח חודשי: 12,500kg          │
│ └── אחוז ביצוע תוכנית: 80%       │
├──────────────────────────────────┤
│ אימונים אחרונים                   │
│ ├── [אימון 1] - הושלם ✓          │
│ │   שינויים: הסיר סקוואט (כאב ברך)│
│ ├── [אימון 2] - בתהליך           │
│ └── [אימון 3] - מתוכנן           │
├──────────────────────────────────┤
│ [שלח הודעה]                       │
└──────────────────────────────────┘
```

### TrainerDashboardTile
```
קוביה ב-UserDashboard, נראית רק למאמן/admin:

┌─────────────────────┐
│  👥  מאמן             │
│  3 מתאמנים פעילים     │
│  2 התאמנו השבוע       │
└─────────────────────┘

לחיצה → מנווט ל-/trainer
צבע: accent.blue (#3B82F6) gradient
```

### הנחיות עיצוב
- `TraineeDetail` - דומה ל-admin UsersList detail view - סקציות מוקפלות
- `TraineePerformance` - מספרים גדולים בכרטיסי סטטיסטיקות (כמו dashboard stats)
- `TraineeRecentWorkouts` - כמו WorkoutHistory cards - עם הוספת שורת "שינויים מתוכנית"
- `TrainerDashboardTile` - כמו שאר הקוביות ב-UserDashboard
- **שינויים מתוכנית:** badge כתום כשמתאמן שינה מהתוכנית

### בדיקות
- [ ] דף מתאמן מציג את כל הסקציות
- [ ] סטטיסטיקות מחושבות נכון
- [ ] היסטוריה כוללת שינויים מתוכנית (programModifications)
- [ ] הערות מאמן ניתנות לעריכה
- [ ] TrainerDashboardTile נראה רק למאמן/admin
- [ ] user רגיל לא רואה את הקוביה (רגרסיה!)
- [ ] RTL + Mobile 375px

---

## Phase 6: Messaging System (דו-כיווני פשוט)

### לפני תחילת עבודה:
```bash
git checkout main
git pull origin main
git checkout -b trainer-module/phase-6
npm run build  # ודא שהכל תקין לפני שינויים
```

### מטרה
מאמן שולח הודעות למתאמנים, מתאמנים יכולים להגיב. Badge עם מספר הודעות שלא נקראו.

### שינוי מהותי מהאפיון המקורי
**הודעות דו-כיווניות:** במקום חד-כיווני, מתאמן יכול להגיב להודעת מאמן.

### תלויות
Phase 2

### קבצים ליצירה
| קובץ | תיאור |
|------|--------|
| `src/domains/trainer/services/messageService.ts` | CRUD להודעות + ספירת לא נקראו |
| `src/domains/trainer/store/messageStore.ts` | Zustand: הודעות, unread count |
| `src/domains/trainer/hooks/useTrainerMessages.ts` | פעולות הודעות |
| `src/domains/trainer/hooks/useUnreadMessages.ts` | polling כל 60 שניות + בדיקה מיידית בפתיחה |
| **מאמן:** | |
| `src/domains/trainer/components/Messages/MessageCenter.tsx` | מרכז הודעות - שיחות לפי מתאמן |
| `src/domains/trainer/components/Messages/MessageComposer.tsx` | כתיבת הודעה חדשה |
| `src/domains/trainer/components/Messages/MessageList.tsx` | רשימת הודעות בשיחה |
| `src/domains/trainer/components/Messages/MessageCard.tsx` | כרטיס הודעה בודדת + תגובות |
| **מתאמן:** | |
| `src/domains/trainer/components/TraineeInbox/TraineeInbox.tsx` | Inbox של מתאמן |
| `src/domains/trainer/components/TraineeInbox/InboxMessageCard.tsx` | הודעה עם אפשרות תגובה |
| `src/domains/trainer/components/TraineeInbox/InboxBadge.tsx` | Badge מספר לא נקראו |

### קבצים לעדכון (דורש אישור!)
| קובץ | שינוי | סיכון |
|------|-------|-------|
| `src/App.tsx` | הוספת routes להודעות + /inbox | נמוך |
| `src/design-system/layouts/MainLayout.tsx` | הוספת לינק "הודעות" + badge למתאמנים עם trainerId | נמוך - תוספת מותנית |

### מבנה הודעה עם תגובות
```
┌──────────────────────────────┐
│ 📩 מאמן דני           13:45  │
│ סוג: משוב על אימון            │
│                               │
│ כל הכבוד על האימון היום!       │
│ שמתי לב שהעלית משקל בסקוואט.  │
│ נמשיך ככה 💪                  │
│                               │
│ ─── תגובות ───                │
│                               │
│ 🏋️ ישראל (מתאמן)      14:20  │
│ תודה! אבל הרגשתי כאב         │
│ קל בברך שמאל, מה לעשות?       │
│                               │
│ 📩 מאמן דני           14:35   │
│ עדיף להקל במשקל באימון הבא    │
│ ולשים לב אם זה ממשיך.         │
│                               │
│ ┌─────────────────────────┐  │
│ │ כתוב תגובה...           │  │
│ └─────────────────────────┘  │
│                    [שלח]      │
└──────────────────────────────┘
```

### Polling מנגנון
```
1. אפליקציה נפתחת → בדיקה מיידית של unread count
2. כל 60 שניות → בדיקת unread count
3. Badge מתעדכן בניווט
4. כניסה ל-inbox → סימון הודעות כנקראו
5. אפליקציה נסגרת → polling נעצר
```

### הנחיות עיצוב
- `MessageCenter` (מאמן) - רשימת שיחות כמו WhatsApp: אווטאר, שם, תצוגה מקדימה, זמן
- `MessageComposer` - textarea + dropdown סוג הודעה + priority toggle
- `TraineeInbox` - רשימת הודעות עם badge נקרא/לא נקרא
- `InboxBadge` - עיגול אדום עם מספר (כמו notification badge סטנדרטי)
- **צבע badge:** `status.error` (#EF4444) לבלתי נקראו
- **תגובות:** בועות שיחה - הודעות מאמן מימין, מתאמן משמאל (RTL!)

### מצבי מסך
| מצב | תיאור |
|-----|--------|
| No messages | "אין הודעות עדיין" |
| Unread | Badge עם מספר, הודעות מודגשות |
| All read | Badge נעלם, הודעות רגילות |
| Composing | Textarea פתוח, dropdown סוג, כפתור שליחה |
| Reply | Input תגובה מתחת להודעה |

### בדיקות
- [ ] מאמן שולח הודעה למתאמן
- [ ] מתאמן רואה badge עם מספר
- [ ] מתאמן פותח inbox, רואה הודעה
- [ ] סימון כנקראו - badge מתעדכן
- [ ] מתאמן מגיב להודעה
- [ ] מאמן רואה תגובת המתאמן
- [ ] Polling כל 60 שניות עובד
- [ ] RTL - בועות שיחה בכיוון נכון
- [ ] Mobile 375px

---

## Phase 7: Integration, Polish, and Testing

### לפני תחילת עבודה:
```bash
git checkout main
git pull origin main
git checkout -b trainer-module/phase-7
npm run build  # ודא שהכל תקין לפני שינויים
```

### מטרה
חיבור כל ה-Phases, בדיקות E2E, polish ויזואלי, validation.

### תלויות
כל ה-Phases

### משימות

#### 7.1 בדיקת E2E מלאה
```
תרחיש מלא:
1. Admin מקדם user ל-trainer → דשבורד מאמן מופיע
2. Trainer יוצר מתאמן → חשבון נוצר, מייל נשלח
3. Trainer בונה תוכנית שבועית → נשמרת ב-Firestore
4. Trainee מתחבר → רואה תוכנית בדשבורד
5. Trainee מתחיל אימון מהתוכנית → ActiveWorkout רגיל
6. Trainee מוחק תרגיל → פופאפ הסבר → הסבר נשמר
7. Trainee מסיים אימון → history עם programId ו-modifications
8. Trainer רואה היסטוריה + שינויים בדף מתאמן
9. Trainer שולח הודעה → מתאמן מקבל badge
10. Trainee פותח inbox → קורא → מגיב
11. Trainer רואה תגובה
```

#### 7.2 עזיבת מאמן
```
תרחיש:
1. Trainer או Admin מסיים relationship
2. Trainee שומר את כל ההיסטוריה והתוכניות
3. Trainer מאבד גישה לנתוני Trainee
4. Trainee יכול להמשיך להשתמש באפליקציה כמשתמש רגיל
```

#### 7.3 בדיקות רגרסיה
```bash
# 1. פיצ'רים קיימים
grep -r "WorkoutSummaryModal\|handleDeleteWorkout\|handleAddSet" src/ | wc -l
# אמור להיות > 0

# 2. אבטחה
grep -r "AIza" --include="*.ts" --include="*.tsx" src/domains/trainer/ | wc -l
# אמור להיות 0

# 3. עיצוב - inline styles
grep -r "style={{" src/domains/trainer/ --include="*.tsx" | wc -l
# אמור להיות 0

# 4. Build
npm run build
# אמור לעבור ללא שגיאות
```

#### 7.4 בדיקות Mobile + RTL
```
לכל מסך חדש, בדוק ב-375px:
□ TrainerDashboard
□ TraineeCard list
□ TraineeRegistrationModal
□ ProgramBuilder (כל 4 שלבים)
□ TraineeProgramView
□ TraineeDetail
□ MessageCenter
□ TraineeInbox
□ ExerciseRemovalModal
□ InboxBadge
```

#### 7.5 הרשאות
```
בדוק שכל תפקיד רואה רק מה שמותר:

User:
□ לא רואה לינק "מאמן"
□ לא יכול לגשת ל-/trainer
□ רואה inbox רק אם יש trainerId

Trainer:
□ רואה לינק "מאמן"
□ רואה רק מתאמנים שלו
□ לא רואה מתאמנים של מאמנים אחרים
□ לא יכול לגשת ל-/admin

Admin:
□ רואה "מאמן" + "ניהול"
□ יכול לגשת לכל דשבורד
□ רואה את כל המתאמנים/מאמנים
```

---

## קבצים קריטיים - סיכום

### קבצים חדשים (35+)
```
src/domains/trainer/
  types/trainer.types.ts, index.ts
  services/trainerService.ts, traineeAccountService.ts, programService.ts, messageService.ts
  store/trainerStore.ts, messageStore.ts
  hooks/useTrainerData.ts, useTraineeProgram.ts, useTrainerMessages.ts, useUnreadMessages.ts
  components/TrainerLayout.tsx, TrainerDashboard.tsx, TraineeCard.tsx, TraineeDetail.tsx,
    TraineeRegistrationModal.tsx, TraineeProfileSection.tsx, TraineePerformance.tsx,
    TraineeRecentWorkouts.tsx, TrainerDashboardTile.tsx
  components/ProgramBuilder/ProgramBuilder.tsx, ProgramDayEditor.tsx, ProgramExerciseEditor.tsx,
    ProgramReview.tsx, ProgramDayCard.tsx
  components/ProgramView/TraineeProgramView.tsx, ProgramDayDetail.tsx, ProgramExerciseCard.tsx,
    ExerciseRemovalModal.tsx
  components/Messages/MessageCenter.tsx, MessageComposer.tsx, MessageList.tsx, MessageCard.tsx
  components/TraineeInbox/TraineeInbox.tsx, InboxMessageCard.tsx, InboxBadge.tsx
```

### קבצים קיימים לעדכון (דורש אישור לכל אחד!)
| קובץ | Phase | שינוי |
|------|-------|-------|
| `firestore.rules` | 1 | rules חדשים + עדכון קיימים |
| `src/lib/firebase/auth.ts` | 1 | הרחבת AppUser interface |
| `src/domains/workouts/types/workout.types.ts` | 1 | שדות חדשים |
| `src/App.tsx` | 2,3,5,6 | routes חדשים |
| `src/app/router/guards/AuthGuard.tsx` | 2 | role hierarchy |
| `src/design-system/layouts/MainLayout.tsx` | 2,6 | לינקים בניווט |
| `src/domains/dashboard/components/UserDashboard.tsx` | 4,5 | תוכנית + tile |
| `src/domains/exercises/components/ExerciseLibrary.tsx` | 3 | selectionMode prop |
| `src/domains/workouts/store/workoutBuilderStore.ts` | 4 | loadFromProgram action |
| `src/lib/firebase/workoutHistory.ts` | 4 | trainer_program source |

---

## החלטות ארכיטקטוריות

| החלטה | בחירה | סיבה |
|-------|-------|------|
| יצירת חשבון מתאמן | Secondary Firebase app instance | מונע התנתקות המאמן |
| גישת מאמן לנתונים | `isTrainer()` גורפי + סינון אפליקטיבי | פשטות. מתאים לסקייל |
| התראות | Polling כל 60s | פשוט. אין צורך ב-FCM |
| מבנה תוכנית | Array בתוך document | ~42KB max. atomic updates |
| נתוני תרגילים בתוכנית | Denormalized | פחות reads. offline-capable |
| שימוש חוזר ב-ExerciseLibrary | selectionMode prop | עקביות UI. מינימום שינוי |
| תגובות הודעות | Array בתוך ההודעה | כמות קטנה. פשוט |
| בעלות על תוכנית | המתאמן שולט | פשטות. המתאמן אחראי |
| עזיבת מאמן | היסטוריה נשארת אצל מתאמן | הנתונים שייכים למתאמן |
