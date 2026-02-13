# GymIQ Changelog

כל השינויים המשמעותיים בפרויקט מתועדים כאן.

---

## [1.10.290] - 2026-02-13

### תיקון: טיפול מלא בשגיאות רשת

- **isNetworkError** — helper חדש לזיהוי שגיאות רשת/timeout (`unavailable`, `deadline-exceeded`, `resource-exhausted`, `failed-precondition`)
- **validateWorkoutId** — הוספת `deadline-exceeded` ו-`resource-exhausted` לשגיאות רשת (optimistic)
- **finishWorkout** — network error מציג toast "אין חיבור לאינטרנט" ומחזיר שליטה למשתמש (לא fallback)
- **exitWorkout** — אותו טיפול: network error → toast + return
- **auto-save** — network error → silent retry בסייקל הבא (לא fallback ל-addDoc)

---

## [1.10.289] - 2026-02-13

### תיקון: Offline validation

- **validateWorkoutId** — הבחנה בין סוגי שגיאות ב-catch:
  - `permission-denied` → ID פגום, נמחק (כמו קודם)
  - `unavailable` / `failed-precondition` → שגיאת רשת, **שומר את ה-ID** (optimistic)
  - שגיאה לא מוכרת → מוחק (defensive)
- **תרחיש שתוקן:** משתמש אופליין לא מאבד אימון פעיל כי IDs לגיטימיים לא נמחקים בגלל network errors

---

## [1.10.287] - 2026-02-13

### תשתית: localStorage/Firestore validation

- **workoutValidation.ts** — מודול חדש עם `validateWorkoutId` ו-`cleanupWorkoutStorage`
- **useActiveWorkout.ts** — כל 4 נקודות קריאה מ-localStorage מאומתות מול Firestore לפני שימוש
- **AuthProvider.tsx** — ניקוי IDs פגומים ברקע בעליית האפליקציה
- **Auto-save defense** — `permission-denied` ב-auto-save גורם ל-fallback למסמך חדש

---

## [1.10.283] - 2026-02-13

### תיקון: שמירת אימון בנייד

- **completeWorkout** — fallback ליצירת מסמך חדש כש-`updateDoc` מקבל `permission-denied`
- **שורש הבעיה:** Service Worker הגיש קוד ישן → auto-save יצר מסמך עם userId שגוי → localStorage שמר ID פגום → `updateDoc` נדחה

---

## [1.12.1] - 2026-02-07

### בדיקות E2E (Playwright)

#### תשתית חדשה
- **Playwright Setup** - הגדרת סביבת בדיקות E2E עם תמיכה ב-Chromium בלבד (rate limiting של Firebase)
- **Test Users** - קובץ `e2e/helpers/test-users.ts` עם משתמשים ייעודיים לבדיקות
- **Serial Mode** - הרצה סדרתית למניעת התנגשויות בנתונים

#### קבצי בדיקה
- `auth.spec.ts` - בדיקות התחברות והתנתקות
- `dashboard.spec.ts` - בדיקות דשבורד וניווט
- `workout-flow.spec.ts` - זרימת אימון מלאה (בחירה → ביצוע → סיום)
- `workout-history.spec.ts` - היסטוריית אימונים
- `trainer-dashboard.spec.ts` - דשבורד מאמן והרשאות
- `trainer-trainee-flows.spec.ts` - זרימות מאמן-מתאמן (הקובץ הראשי)

#### תיקונים קריטיים
- **Selectors למודל סיום אימון** - תוקנו selectors שגויים:
  - `button:has-text("אישור")` → `button:has-text("סיים")`
  - `button:has-text("כן")` → `button:has-text("כן, סיים")`
  - `button:has-text("שמור")` → `button:has-text("שמור וסיים")`
  - `text=סיכום אימון` → `text=כל הכבוד!`
- **IndexedDB Clearing** - ניקוי מלא של Firebase Auth state בהחלפת משתמשים

#### תיעוד
- **e2e/README.md** - תיעוד מלא בעברית של כל הבדיקות, פקודות הרצה, באגים שתוקנו

---

## [1.12.0] - 2026-02-04

### מודול מאמן - Trainer Module (חדש!)

מודול מלא לניהול מאמנים-מתאמנים ב-7 שלבים:

#### שלב 1: תשתית (Foundation)
- **Types חדשים** - `TrainerRelationship`, `TrainingProgram`, `ProgramDay`, `ProgramExercise`, `TrainerMessage` ב-`trainer.types.ts`
- **Firestore Rules** - כללי אבטחה ל-`trainingPrograms`, `trainerMessages`, `trainerRelationships`
- **הרחבת AppUser** - שדות `trainerProfile`, `trainerId`, `trainingGoals`, `injuriesOrLimitations`
- **הרחבת WorkoutHistoryEntry** - שדות `source: 'trainer_program'`, `programId`, `programDayLabel`

#### שלב 2: קשרי מאמן-מתאמן + רישום
- **TrainerDashboard** - דשבורד מאמן עם רשימת מתאמנים וסטטיסטיקות
- **TraineeRegistrationModal** - יצירת חשבון מתאמן חדש (secondary Firebase app instance)
- **TrainerLayout** - Layout wrapper עם sidebar למאמנים
- **trainerService** - CRUD לקשרי מאמן-מתאמן
- **traineeAccountService** - יצירת חשבונות מתאמנים
- **AuthGuard role hierarchy** - `user < trainer < admin` (לא רק exact match)
- **MainLayout** - לינק "מאמן" בניווט למאמנים/אדמינים

#### שלב 3: בונה תוכניות אימון (Program Builder)
- **ProgramBuilder** - אשף 4 שלבים: פרטים → ימים → תרגילים → סקירה
- **Split-screen desktop** - רשימת ימים בצד + עורך תרגילים
- **Tabbed mobile** - ניווט טאבים למסכים צרים
- **ExerciseLibrary selectionMode** - שימוש חוזר בספרייה לבחירת תרגילים לתוכנית
- **programService** - CRUD לתוכניות + הפעלה/השהיה
- **TraineeSidePanel** - פאנל צד עם היסטוריית מתאמן
- **שמירה כטיוטה** - אפשרות לשמור תוכנית בסטטוס draft

#### שלב 4: חוויית מתאמן (Trainee Experience)
- **TraineeProgramView** - כרטיס תוכנית מאמן עם עיצוב כתום
- **ProgramExerciseCard** - כרטיס תרגיל בתוכנית
- **loadFromProgram** - פעולה חדשה ב-workoutBuilderStore לטעינת אימון מתוכנית
- **useTraineeProgram** - hook לטעינת תוכנית פעילה + חישוב "האימון של היום"
- **אינטגרציה עם workoutHistory** - שמירת `source`, `programId`, `programDayLabel`

#### שלב 5: דשבורד ניטור מאמן
- **TraineeDetail** - דף פרטי מתאמן מלא
- **TraineePerformance** - סטטיסטיקות ביצועים (אימונים, סטריק, נפח)
- **TraineeRecentWorkouts** - 10 אימונים אחרונים עם הרחבה
- **TraineeProfileSection** - פרופיל מתאמן (מטרות, פציעות, הערות)
- **TrainerDashboardTile** - קוביית גישה מהירה בדשבורד

#### שלב 6: מערכת הודעות
- **MessageCenter** - מרכז הודעות למאמן
- **MessageComposer** - יצירת הודעה (סוג, נושא, עדיפות)
- **TraineeInbox** - תיבת דואר נכנס למתאמן
- **InboxBadge** - תג הודעות שלא נקראו (polling כל 60 שניות)
- **messageService** - CRUD להודעות + סימון כנקראו
- **תשובות** - מתאמנים יכולים להשיב להודעות

#### שלב 7: אינטגרציה ופוליש
- **תוכנית מאמן בדף תוכניות** - `TrainerProgramCard` חדש בדף `/workout/history` עם סימון כתום "מאמן"
- **הסרה מדשבורד** - תוכנית מאמן נגישה דרך קוביית "תוכניות" בלבד (ללא כפילות)
- **תוכנית מתרחבת** - לחיצה → ימי אימון → תרגילים → "התחל אימון"

### תיקוני באגים
- **autoSaveWorkout לא שומר שדות תוכנית** - `source`, `programId`, `programDayLabel` לא נכללו ב-`cleanWorkout`. תוקן
- **startDate parsing** - תמיכה בערכי string/number מ-Firestore ב-`useTraineeProgram`

### ארכיטקטורה

**דומיין חדש:** `src/domains/trainer/` (~40 קבצים)

```
src/domains/trainer/
├── types/          trainer.types.ts, index.ts
├── services/       trainerService, traineeAccountService, programService, messageService
├── store/          trainerStore, messageStore (Zustand)
├── hooks/          useTrainerData, useTraineeProgram, useTrainerMessages, useUnreadMessages
└── components/
    ├── TrainerDashboard, TraineeCard, TraineeDetail, TrainerLayout
    ├── TraineeRegistrationModal, TraineeProfileSection, TraineePerformance, TraineeRecentWorkouts
    ├── TrainerDashboardTile
    ├── ProgramBuilder/    ProgramBuilder, ProgramDayEditor, ProgramExerciseEditor, ProgramReview, ...
    ├── ProgramView/       TraineeProgramView, TrainerProgramCard, ProgramExerciseCard, ProgramDayDetail
    ├── Messages/          MessageCenter, MessageComposer, MessageList, MessageCard
    └── TraineeInbox/      TraineeInbox, InboxMessageCard, InboxBadge
```

**נתיבים חדשים:** `/trainer`, `/trainer/trainee/:id`, `/trainer/program/new`, `/trainer/program/:id/edit`, `/trainer/messages`, `/inbox`

**Firebase Collections חדשים:** `trainingPrograms`, `trainerMessages`

**קבצים ששונו (מחוץ לדומיין):**
- `firestore.rules` - כללי אבטחה חדשים
- `src/App.tsx` - נתיבי מאמן + inbox
- `src/app/router/guards/AuthGuard.tsx` - היררכיית תפקידים
- `src/design-system/layouts/MainLayout.tsx` - לינקי ניווט למאמן ותיבת דואר
- `src/domains/dashboard/components/UserDashboard.tsx` - TrainerDashboardTile
- `src/domains/workouts/store/workoutBuilderStore.ts` - loadFromProgram action
- `src/domains/workouts/components/WorkoutHistory.tsx` - סקשן תוכנית מאמן
- `src/lib/firebase/auth.ts` - הרחבת AppUser
- `src/lib/firebase/workoutHistory.ts` - שדות source/programId/programDayLabel
- `src/domains/workouts/types/workout.types.ts` - trainer_program source
- `src/domains/exercises/components/ExerciseLibrary.tsx` - selectionMode prop

---

## [1.10.179] - 2026-02-02

### שינויים
- **קוביית אימונים בדשבורד** - מציגה כעת מספר אימונים חודשי (מתאפס בכל חודש) במקום סה"כ כללי. הכיתוב שונה ל"אימונים חודש"
- **קוביית השבוע בדשבורד** - מציגה טווח שבועי מלא ראשון עד שבת (למשל 1/2-7/2) במקום תאריך יום ראשון בלבד

---

## [1.10.170] - 2026-01-30

### תיקונים
- **אימון AI שהושלם לא מוצג בתוכנית אימונים** - אימוני AI completed מופיעים כעת ב"שבועיים אחרונים"
- **הסרת toasts אבחוניים** - ניקוי diagnostic toasts מזרימת סיום אימון
- **שיפור זרימת סיום אימון** - הודעות שגיאה ברורות בעברית, ניקוי console.logs

### עדכוני תיעוד
- **development-flow-SKILL** - הוספת כלל "בדוק תצוגה קודם לשמירה" בחקירת באגים
- **qa-testing-SKILL** - הוספת רגרסיה 30/01 ובדיקת תצוגת אימון AI

---

## [1.10.115] - 2026-01-25

### תיקוני נתונים
- **תוקנו 3 תרגילים ב-Firebase** עם חוסר התאמה בין category ל-primaryMuscle:
  - היפטראסט על רגל אחת: `primaryMuscle` שונה מ-`back` ל-`glutes`
  - פשיטת הגב בכיסא רומי: `category` שונה מ-`gluteus_maximus` ל-`back`
  - Superman: `primaryMuscle` שונה מ-`back` ל-`lower_back`

### כלים חדשים
- `scripts/fix-exercises-admin.cjs` - סקריפט לתיקון תרגילים באמצעות Firebase Admin SDK

---

## [1.10.114] - 2026-01-25

### אבטחה
- **הסרת מפתחות API מסקריפטים** - תוקנו 17 סקריפטים שהכילו מפתחות Firebase hardcoded
- יצירת קבצי קונפיגורציה משותפים:
  - `scripts/firebase-config.ts` - לסקריפטים TypeScript
  - `scripts/firebase-config.cjs` - לסקריפטים CommonJS

### כלים חדשים
- `scripts/find-category-mismatch.cjs` - סקריפט לזיהוי תרגילים עם חוסר התאמה בין category ל-primaryMuscle

### תיקונים
- תוקן `scripts/fix-exercise-category.cjs` - הסרת קוד שאריתי שגרם לשגיאות

### בעיות שזוהו
- זוהו 3 תרגילים עם חוסר התאמה בין category ל-primaryMuscle (תוקן בגרסה 1.10.115)

---

## [1.10.113] - 2026-01-25

### אבטחה
- הסרת מפתחות API חשופים מסקריפטים

### תיקונים
- מניעת קטגוריות לא תקינות בתרגילים

---

## [1.10.112] - 2026-01-25

### תיקונים
- תיקון באג: המשך אימון "ללא דיווח" לא יוצר אימון חדש אלא מעדכן קיים

---

## [1.10.111] - 2026-01-25

### תיקונים
- תיקון המשך אימון "ללא דיווח" - מעדכן אימון קיים במקום ליצור חדש

---

## [1.10.107] - 2026-01-25

### תיקונים
- תיקון המשך אימון לא מדווח יוצר אימון חדש

---

## [1.10.103] - 2026-01-24

### תיקונים
- תיקון העברת reportType לאימון פעיל

---

## [1.10.100] - 2026-01-24

### תכונות חדשות
- הוספת שדות מהירות ומרחק לסוגי דיווח

---

## [1.10.99] - 2026-01-24

### תכונות חדשות
- אינטגרציית Claude API למאמן AI
- Popup הסבר למשתמשים

---

## [1.10.95] - 2026-01-24

### שיפורים
- שיפור מקבצי אימונים AI

---

## [1.10.93] - 2026-01-24

### תיקונים
- תיקון שמירת שדות AI ל-Firebase

---

## [1.10.92] - 2026-01-24

### תכונות חדשות
- מקבצי אימונים AI

---

## [1.10.90] - 2026-01-24

### תכונות חדשות
- מאמן AI עם Fallback Logic
