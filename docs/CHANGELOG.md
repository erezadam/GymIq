# Changelog – GymIQ

כל השינויים המשמעותיים בפרויקט מתועדים כאן.

פורמט מבוסס על [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [v1.10.38] - 2026-01-16

### 🚀 פיצ'רים חדשים

| פיצ'ר | תיאור |
|-------|-------|
| **הערות היסטוריות באימון** | כפתור אדום מציג הערות קודמות מאימונים קודמים לכל תרגיל |
| **תזכורת סיום תרגיל** | פופאפ שמזכיר לסיים תרגיל לפני מעבר לתרגיל אחר |

### 🐛 תיקוני באגים

| תיקון | תיאור |
|-------|-------|
| **B14** | הערות תרגיל לא מוצגות בהיסטוריה - תוקן |
| **B15** | המשך אימון - סטטוס תרגילים (isCompleted) לא נשמר |
| **B16** | המשך אימון - כפל אימונים בהיסטוריה (יצירת רשומה חדשה במקום עדכון) |

### ✏️ קבצים ששונו

| קובץ | שינוי |
|------|-------|
| `WorkoutHistory.tsx` | הוספת isCompleted + continueWorkoutId, הצגת הערות |
| `useActiveWorkout.ts` | שימוש ב-ID קיים, תזכורת סיום תרגיל, הערות היסטוריות |
| `workoutHistory.ts` | פונקציה getExerciseNotesForExercises |
| `ExerciseCard.tsx` | כפתור הערות אדום/ירוק, טעינת הערות היסטוריות |
| `ConfirmationModal.tsx` | מודל תזכורת סיום תרגיל |
| `active-workout.types.ts` | הוספת historicalNotes, finish_exercise_reminder |

### 🔗 Git

- **Commit:** `0cf26af`

---

## [v1.9.0] - 2026-01-12

### 🚀 פיצ'רים חדשים

| פיצ'ר | תיאור |
|-------|-------|
| **רשימת שרירים בכרטיסי אימון** | הצגת קבוצות השרירים (בעברית) שעובדו באימון בכרטיסי היסטוריה |

### 🐛 תיקוני באגים

| תיקון | תיאור |
|-------|-------|
| **סטטוס "ללא דיווח"** | שינוי טקסט מ-"מבוטל" ל-"ללא דיווח" + תיקון התנהגות "המשך לאימון" לטעינת התרגילים |
| **תרגום שרירים לעברית** | מיפוי שמות שרירים מאנגלית לעברית בהיסטוריה |

### ✏️ קבצים ששונו

| קובץ | שינוי |
|------|-------|
| `workout.types.ts` | הוספת category ל-exercises, muscleGroups ל-Summary |
| `workoutHistory.ts` | שמירת category, חילוץ muscleGroups ב-toSummary |
| `WorkoutHistory.tsx` | הצגת שרירים בעברית, תיקון cancelled status |
| `useActiveWorkout.ts` | העברת category לשמירה ב-Firebase |

---

## [v1.10.2] - 2026-01-11

### 🐛 תיקוני באגים

| תיקון | תיאור |
|-------|-------|
| **טעינת נתונים מהיסטוריה** | תיקון באג קריטי - כשחוזרים מהיסטוריה לאימון in_progress הנתונים לא נטענו. הבעיה: race condition ב-useActiveWorkout שגרמה לקריאות מקבילות לדרוס את הנתונים |
| **isInitializing lock** | הוספת ref שמונע קריאות מקבילות ל-initWorkout |

### ✨ שיפורים

| שיפור | תיאור |
|-------|-------|
| **נתוני אימון אחרון** | הצגת נתוני אימון אחרון באדום מתחת לתמונה בתרגיל פתוח |
| **כפתור הערות** | הזזת כפתור "הערות" ליד "סיום תרגיל" |
| **חיבור NotesModal** | חיבור מלא של NotesModal ל-ExerciseCard |

### ✏️ קבצים ששונו

| קובץ | שינוי |
|------|-------|
| `useActiveWorkout.ts` | תיקון race condition, הוספת isInitializing ref |
| `ExerciseCard.tsx` | הוספת נתוני אימון אחרון באדום, כפתור הערות |
| `MuscleGroupSection.tsx` | העברת onUpdateNotes prop |
| `ActiveWorkoutScreen.tsx` | חיבור updateExerciseNotes |

---

## [v1.10.1] - 2026-01-11

### 🚀 פיצ'רים חדשים

| פיצ'ר | תיאור |
|-------|-------|
| **הערות לתרגילים** | אפשרות להוסיף הערות טקסט לכל תרגיל באימון פעיל (כפתור "הערות" + מודל) |
| **מנגנון עדכון PWA** | באנר עדכון גרסה למשתמש + useVersionCheck hook לזיהוי גרסאות חדשות |
| **סקריפט עדכון גרסה** | סקריפט אוטומטי שמעדכן version.json בכל build |

### 🐛 תיקוני באגים

| תיקון | תיאור |
|-------|-------|
| **קלוריות לא נשמרות** | תיקון ב-saveWorkoutHistory - קלוריות לא נוספו ל-cleanWorkout |
| **נתונים לא נטענים מהיסטוריה** | תיקון טעינת סטים בהמשך אימון מהיסטוריה - continueWorkoutData לא נקרא ב-useActiveWorkout |
| **עדכון PWA גורם למסך שחור** | תיקון מחיקת cache של Firebase באופן לא מכוון בעת עדכון |

### 📁 קבצים חדשים

```
src/domains/workouts/components/active-workout/NotesModal.tsx - מודל הערות לתרגיל
src/shared/components/UpdateBanner.tsx - באנר עדכון גרסה
src/shared/hooks/useVersionCheck.ts - hook לבדיקת גרסאות
src/shared/hooks/index.ts - export של hooks
public/version.json - קובץ גרסה לזיהוי עדכונים
scripts/update-version.cjs - סקריפט עדכון גרסה
```

### ✏️ קבצים ששונו

| קובץ | שינוי |
|------|-------|
| `workoutHistory.ts` | הוספת שמירת calories ב-saveWorkoutHistory |
| `useActiveWorkout.ts` | קריאת continueWorkoutData + notes support + חישוב stats נכון |
| `active-workout.types.ts` | הוספת notes ל-ActiveWorkoutExercise |
| `App.tsx` | הוספת UpdateBanner |
| `firebase.json` | הסרת service-worker.js כפול |
| `index.html` | הסרת auto-reload של SW |
| `ExerciseList.tsx` | תיקוני UI |
| `package.json` | הוספת prebuild script |

---

## [v1.10.0] - 2026-01-10

### 🚀 פיצ'רים חדשים

| פיצ'ר | תיאור |
|-------|-------|
| **סוגי דיווח תרגילים (ReportType)** | תמיכה בסוגי דיווח שונים: weight_reps, reps_only, time_only, reps_time |
| **קוביית השוואה בין-לאומית** | קוביה בדשבורד שפותחת קישור חיצוני (מוגדר ע"י אדמין) |
| **מסך הגדרות אדמין** | מסך AdminSettings לניהול URL חיצוני |
| **מיון לפי ציוד במסך אימון** | לחצני toggle: "לפי שריר" / "לפי ציוד" |

### ✏️ קבצים ששונו

| קובץ | שינוי |
|------|-------|
| `exercise.types.ts` | הוספת ExerciseReportType |
| `active-workout.types.ts` | הוספת equipment, reportType, EquipmentGroupExercises |
| `workoutBuilderStore.ts` | הוספת equipment, reportType ל-SelectedExercise |
| `ExerciseLibrary.tsx` | העברת equipment, reportType בבחירת תרגיל |
| `ExerciseForm.tsx` | שדה בחירת reportType |
| `useActiveWorkout.ts` | exercisesByEquipment, העברת equipment/reportType |
| `SetReportRow.tsx` | תצוגה דינמית לפי reportType |
| `ActiveWorkoutScreen.tsx` | לחצני מיון muscle/equipment |
| `UserDashboard.tsx` | קוביית השוואה בין-לאומית |
| `App.tsx` | route ל-AdminSettings |

### 📁 קבצים חדשים

```
src/lib/firebase/appSettings.ts - Firebase functions להגדרות אפליקציה
src/domains/admin/components/AdminSettings.tsx - מסך הגדרות אדמין
```

### 🐛 תיקוני באגים

| תיקון | תיאור |
|-------|-------|
| **סנכרון פילטר ציוד** | פילטר הציוד במסך תרגילים נשלף עכשיו מ-Firebase במקום מערך hardcoded |

---

## [v1.9.1] - 2026-01-09

### 🐛 תיקוני באגים

| תיקון | תיאור |
|-------|-------|
| **תרגיל חדש נפתח סגור** | תרגיל שמתווסף לאימון פעיל מתווסף עכשיו במצב סגור (כמו שאר התרגילים) |

### ✏️ קבצים ששונו

| קובץ | שינוי |
|------|-------|
| `useActiveWorkout.ts` | שינוי `isExpanded: false` לתרגילים חדשים |

---

## [v1.9.0] - 2026-01-09

### 🚀 פיצ'רים חדשים

| פיצ'ר | תיאור |
|-------|-------|
| **MuscleIcon Component** | קומפוננטה חדשה להצגת אייקוני שרירים מ-URL במקום אימוג'י |
| **URL-based Muscle Icons** | שדה URL לתמונה בניהול שרירים במקום אימוג'י |

### ✏️ קבצים ששונו

| קובץ | שינוי |
|------|-------|
| `MuscleManager.tsx` | שדה URL לתמונה + preview + MuscleIcon |
| `ExerciseLibrary.tsx` | שימוש ב-MuscleIcon בכפתורי סינון |

### 📁 קבצים חדשים

```
src/shared/components/MuscleIcon.tsx - קומפוננטת תצוגת אייקון שריר
```

### 📝 עדכוני תיעוד

| מסמך | שינוי |
|------|-------|
| `architecture.md` | עדכון מלא - routes, components, features |
| `qa_scenarios.md` | תרחישי MuscleIcon (8.7-8.9) |
| `style_and_ui.md` | תיעוד קומפוננטת MuscleIcon |

---

## [v1.8.0] - 2026-01-09

### 🚀 פיצ'רים חדשים

| פיצ'ר | תיאור |
|-------|-------|
| **Equipment Collection** | הוספת collection חדש ל-Firebase לניהול ציוד כושר |
| **Equipment CRUD** | ניהול ציוד (הוספה, עריכה, מחיקה) בממשק אדמין |
| **Workout Summary Modal** | פופאפ סיכום אימון עם סטטיסטיקות + קלט קלוריות |

### 🔧 שינויי UI

| שינוי | תיאור |
|-------|-------|
| **הסרת נפח מסטטיסטיקות** | הקוביות בדשבורד כבר לא מציגות נפח (Volume) |
| **הסרת נפח מכרטיסי אימון** | כרטיסי אימון בהיסטוריה מציגים רק זמן, תרגילים וסטים |
| **כפתור תוכניות → היסטוריה** | שינוי התנהגות כפתור "תוכניות אימונים" לפתיחת היסטוריה |

### 🐛 תיקוני באגים

| תיקון | תיאור |
|-------|-------|
| **Calories Display** | תיקון באג - קלוריות שהוזנו בסיום אימון כעת מוצגות בהיסטוריה |
| **Firebase Permissions** | תיקון הרשאות ל-muscles ו-equipment collections |
| **Dynamic Category Names** | נורמליזציה של IDs (hyphen/underscore) למיפוי נכון |

### 📁 קבצים חדשים

```
src/lib/firebase/equipment.ts         - CRUD operations for equipment
src/domains/admin/components/EquipmentManager.tsx - Admin UI for equipment
scripts/checkPrimaryMuscles.ts        - Debug utility
scripts/compareExerciseStructure.ts   - Debug utility
```

### ✏️ קבצים ששונו

| קובץ | שינוי |
|------|-------|
| `muscles.ts` | console.log debugging למיפוי דינמי |
| `workoutHistory.ts` | שמירה ושליפה של שדה calories |
| `WorkoutHistory.tsx` | הצגת workout.calories עם fallback ל-estimateCalories |
| `ExerciseList.tsx` | נורמליזציה של IDs במיפוי קטגוריות |
| `ActiveWorkoutScreen.tsx` | WorkoutSummaryModal integration |

### 🔗 Git

- **Commit:** `67a004a`
- **לחזרה לגירסה זו:** `git checkout 67a004a`

---

## [v1.2.1] - 2026-01-09

### 🐛 תיקוני באגים

| תיקון | תיאור |
|-------|-------|
| **Dynamic Category Names** | קטגוריות תרגילים מוצגות כעת בעברית מ-Firebase במקום מיפוי סטטי - תומך בכל קטגוריה חדשה שמתווספת ב-Firebase |

### ✏️ קבצים ששונו

| קובץ | שינוי |
|------|-------|
| `muscles.ts` | הוספת פונקציה `getMuscleIdToNameHeMap()` לבניית מיפוי דינמי |
| `useActiveWorkout.ts` | שימוש במיפוי דינמי לקיבוץ תרגילים לפי שריר |
| `ExerciseList.tsx` | שימוש במיפוי דינמי בטבלת ניהול תרגילים |
| `ExerciseCard.tsx` | שימוש במיפוי דינמי בכרטיס תרגיל |
| `ExerciseLibrary.tsx` | שימוש במיפוי דינמי בספריית תרגילים |

---

## [v1.2.0] - 2026-01-08

### 🚀 פיצ'רים חדשים

| פיצ'ר | תיאור |
|-------|-------|
| **Auto-Save Workout** | שמירה אוטומטית של אימון ל-Firebase כל 2 שניות - מונע אובדן נתונים כשסוגרים אפליקציה |
| **Workout Recovery** | שחזור אוטומטי של אימון in_progress מ-Firebase בעת חזרה לאפליקציה |
| **Rest Timer Toggle** | פקד "שעון עצר" למסך אימון פעיל - שולט האם הטיימר קופץ אחרי הוספת סט |
| **Workout Summary Modal** | פופאפ סיכום אימון עם סטטיסטיקות (תרגילים, סטים, זמן) + שדה קלט לקלוריות שנשרפו |

### 🐛 תיקוני באגים

| תיקון | תיאור |
|-------|-------|
| **Workout Lost** | תיקון באג קריטי - אימון לא נעלם יותר כשסוגרים את האפליקציה |
| **Safe Area** | הוספת padding עליון ל-header עבור iPhone notch |
| **Back Button** | הוספת כפתור חזרה במסך היסטוריית אימונים |
| **Exercise Grouping** | תיקון קיבוץ תרגילים - תרגילים עם primaryMuscle מדעי (כמו erector_spinae) מוצגים עכשיו בעברית לפי category |
| **Delete Workout Button** | שחזור כפתור מחיקת אימון במסך תוכנית אימונים (נמחק בטעות ב-06/01) |

### 📁 קבצים חדשים

```
src/.../WorkoutSummaryModal.tsx  - פופאפ סיכום אימון עם קלוריות
```

### ✏️ קבצים ששונו

| קובץ | שינוי |
|------|-------|
| `workoutHistory.ts` | הוספת autoSaveWorkout, getInProgressWorkout, completeWorkout + תמיכה בשדה calories |
| `useActiveWorkout.ts` | אינטגרציה של Auto-Save עם debounce 2 שניות + קיבוץ לפי category + summary modal state |
| `ActiveWorkoutScreen.tsx` | Rest Timer Toggle UI + WorkoutSummaryModal integration |
| `MainLayout.tsx` | Safe area support |
| `WorkoutHistory.tsx` | Back button + העברת category |
| `active-workout.types.ts` | הוספת שדה category |
| `workout.types.ts` | הוספת שדה calories ל-WorkoutHistoryEntry ו-WorkoutHistorySummary |
| `workoutBuilderStore.ts` | הוספת שדה category ל-SelectedExercise |
| `ExerciseCard.tsx` | העברת category בבחירת תרגיל |
| `ExerciseLibrary.tsx` | העברת category בבחירת תרגיל |
| `WorkoutSession.tsx` | העברת category בהוספת תרגיל |

---

## [v1.1.0] - 2026-01-06

### 🚀 פיצ'רים חדשים

| פיצ'ר | תיאור |
|-------|-------|
| **Rest Timer** | טיימר מנוחה צף אחרי הוספת סט באימון פעיל |
| **PWA Service Worker** | Cache busting ועדכון אוטומטי לאפליקציה מותקנת |
| **SubMuscles** | תתי שרירים לכל שריר ראשי ב-Firebase |

### 🐛 תיקוני באגים

| תיקון | תיאור |
|-------|-------|
| **B12** | נתוני דשבורד מ-Firebase במקום hardcoded |
| **React Hooks** | העברת useCallback לפני early returns |
| **PWA Cache** | מניעת טעינת גרסה ישנה |

### 📁 קבצים חדשים

```
public/sw.js                 - Service Worker
public/manifest.json         - PWA manifest  
public/icons/icon.svg        - App icon
src/.../RestTimer.tsx        - Rest timer component
src/.../PersonalRecords.tsx  - PR screen
architecture.md              - מבנה טכני
style_and_ui.md              - עיצוב וסגנון
skills.md                    - פקודות זמינות
scripts/*.ts                 - Debug utilities
```

### ✏️ קבצים ששונו

| קובץ | שינוי |
|------|-------|
| `ActiveWorkoutScreen.tsx` | Rest Timer integration |
| `ExerciseForm.tsx` | SubMuscles from Firebase |
| `MuscleManager.tsx` | Force update button |
| `muscles.ts` | defaultMuscleMapping with subMuscles |
| `UserDashboard.tsx` | Stats from Firebase |
| `WorkoutHistory.tsx` | Removed stats cubes |
| `index.html` | SW registration + PWA meta |

### 🔗 Git

- **Commit:** `4332212`
- **לחזרה לגירסה זו:** `git checkout 4332212`

---

## [v1.0.0] - 2025-XX-XX

### 🎉 השקה ראשונית

- **Core + Authentication** - מערכת הרשמה והתחברות בטלפון
- **Workout System** - בניית אימונים, ביצוע וסיום
- **Exercise Library** - ספריית תרגילים עם תמונות
- **Workout History** - היסטוריית אימונים ותוכניות עתידיות
- **Dashboard** - דשבורד משתמש עם סטטיסטיקות

---

## תבנית לגירסה חדשה

```markdown
## [vX.X.X] - YYYY-MM-DD

### 🚀 פיצ'רים חדשים
| פיצ'ר | תיאור |
|-------|-------|

### 🐛 תיקוני באגים
| תיקון | תיאור |
|-------|-------|

### 📁 קבצים חדשים
### ✏️ קבצים ששונו
### 🗑️ קבצים שנמחקו

### 🔗 Git
- **Commit:** `XXXXXXX`
- **לחזרה לגירסה זו:** `git checkout XXXXXXX`
```

---

## קונבנציות גירסאות

```
vMAJOR.MINOR.PATCH

MAJOR - שינויים שוברי תאימות
MINOR - פיצ'רים חדשים (תואם אחורה)
PATCH - תיקוני באגים
```

---

```
══════════════════════════════════════════════════════════════════════════════
סוף המסמך
══════════════════════════════════════════════════════════════════════════════
```
