# Changelog – GymIQ

כל השינויים המשמעותיים בפרויקט מתועדים כאן.

פורמט מבוסס על [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

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
