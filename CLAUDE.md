# CLAUDE.md - ספר החוקים העליון של GymIQ

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║   🚨 הנחיה ראשונה לכל סשן - חובה לקרוא קודם! 🚨                              ║
║                                                                              ║
║   לפני כל פעולה, הסוכן חייב:                                                 ║
║   1. לקרוא את CLAUDE.md במלואו                                               ║
║   2. להצהיר שקרא את המסמך                                                    ║
║   3. להצהיר על מצב עבודה (Builder/Reviewer/Documentation)                    ║
║                                                                              ║
║   אם הסוכן לא הצהיר שקרא את המסמך - לא להתחיל עבודה!                         ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

```
===========================================================
קובץ זה הוא מקור האמת היחיד להתנהלות סוכני AI בפרויקט.
כל סוכן חייב לקרוא קובץ זה במלואו לפני כל פעולה.
עדכון אחרון: ינואר 2026
===========================================================
```

---

## 0. 🚨 פקודת פתיחה לכל סשן

**העתק את הפקודה הזו בתחילת כל שיחה עם הסוכן:**

```
לפני שתעשה משהו:
1. קרא את קובץ CLAUDE.md בתיקיית הפרויקט
2. הצהר שקראת אותו
3. הצהר על מצב עבודה (Builder/Reviewer/Documentation)
4. תאר את המשימה ואילו קבצים ישתנו

רק אחרי שתעשה את 4 השלבים האלה - תתחיל לעבוד.
```

**דוגמה לתשובה תקינה מהסוכן:**
```
✅ קראתי את CLAUDE.md במלואו
---
מצב: Builder Mode
משימה: הוספת כפתור שיתוף
קבצים שישתנו: WorkoutSession.tsx
קבצים תלויים: workoutBuilderStore.ts
זרימת משתמש: דשבורד → היסטוריה → אימון → [כפתור שיתוף]
---
מתחיל לעבוד...
```

**אם הסוכן לא עונה בפורמט הזה - להזכיר לו לקרוא את CLAUDE.md!**

---

## 1. מצבי עבודה (Modes of Operation)

הסוכן חייב להכריז על מצב העבודה בתחילת כל סשן.

| מצב | תיאור | מותר | אסור |
|-----|-------|------|------|
| **Builder Mode** | כתיבת קוד לפי החוקים | כתיבה, עריכה, יצירת קבצים | שינוי מסמכי תיעוד |
| **Reviewer Mode** | סקירה וניתוח בלבד | קריאה, הערות, דיווח | שינוי קוד או מסמכים |
| **Documentation Mode** | עדכון תיעוד בלבד | עריכת MD files | שינוי קוד מקור |

**דוגמה לפתיחת סשן:**
```
מצב עבודה: Builder Mode
משימה: הוספת כפתור שיתוף לאימון
קבצים שישתנו: WorkoutSession.tsx, workoutBuilderStore.ts
```

---

## 2. צ'ק ליסט פתיחת סשן (Session Start Checklist)

**חובה לפני כל פעולה:**

- [ ] קראתי את CLAUDE.md במלואו
- [ ] קראתי את תיעוד מערכת/GymIQ_Agent_Guidelines.md
- [ ] הצהרתי על מצב העבודה (Builder/Reviewer/Documentation)
- [ ] סיכמתי בקצרה מה עומד להתבצע
- [ ] ציינתי אילו קבצים עומדים להשתנות
- [ ] **מיפיתי תלויות** - אילו קבצים אחרים תלויים בקבצים שאשנה
- [ ] **מיפיתי זרימה** - מה הזרימה המלאה של הפיצ'ר מהדשבורד
- [ ] אישרתי שהמשימה תואמת את המצב המוצהר

**פורמט פתיחה מחייב:**
```
---
מצב: [Builder/Reviewer/Documentation]
משימה: [תיאור קצר]
קבצים שישתנו: [רשימת קבצים]
קבצים תלויים: [קבצים שמשתמשים בקבצים שישתנו]
זרימת משתמש: דשבורד → [מסך 1] → [מסך 2] → [יעד]
סיכום: [מה בדיוק יקרה]
---
```

---

## 3. 🛡️ מניעת רגרסיה - חוקים קריטיים

### 3.1 לקחים מתחקיר - מה קרה בעבר

**מקרה 1: Date Picker שהפך לא נגיש**
```
מה היה: דשבורד → /workout/builder (עם Date Picker) → תרגילים → אימון
מה קרה: דשבורד → /exercises (בלי Date Picker) → אימון
תוצאה: פיצ'ר שלם נעלם כי הזרימה דילגה על מסך
```

**מקרה 2: צבעי סטטוס שלא עובדים**
```
ב-tokens הוגדר: workout-completed
בקוד נכתב: workout-status-completed-bg
תוצאה: שמות לא תואמים = צבעים לא עובדים (Tailwind לא זורק שגיאה!)
```

### 3.2 חוקי ברזל למניעת רגרסיה

| כלל | הסבר |
|-----|------|
| **מפה לפני שמשנה** | לפני שינוי קובץ - מצא את כל הקבצים שתלויים בו |
| **שרטט זרימה** | לפני שינוי ניווט - שרטט את הזרימה לפני ואחרי |
| **ודא class קיים** | לפני שימוש ב-Tailwind class - ודא שהוא קיים ב-tokens |
| **בדוק E2E** | אחרי כל שינוי - עבור את כל הזרימה מהדשבורד |
| **בדוק ויזואלית** | קוד שמתקמפל ≠ קוד שעובד |

### 3.3 פקודות חיפוש חובה לפני שינוי

```bash
# מצא תלויות בקומפוננטה
grep -r "ComponentName" src/

# מצא תלויות בפונקציה
grep -r "functionName" src/

# מצא כל המפנים לנתיב
grep -r "/workout/builder" src/

# ודא ש-class קיים ב-tokens
grep -r "class-name" tailwind.config.js
```

### 3.4 לפני שינוי ניווט - חובה!

```
□ שרטט את הזרימה הנוכחית:
  דשבורד → [מסך 1] → [מסך 2] → [יעד]

□ בדוק מה יש בכל מסך בזרימה:
  - מסך 1: [אילו פיצ'רים?]
  - מסך 2: [אילו פיצ'רים?]

□ שרטט את הזרימה החדשה:
  דשבורד → [מסך 1] → [מסך 2] → [יעד]

□ ודא שלא מדלגים על מסך עם פיצ'רים חשובים!
```

### 3.5 לפני שימוש ב-Tailwind Class - חובה!

```
□ פתח את tailwind.config.js
□ חפש את ה-class שאתה רוצה להשתמש בו
□ אם לא קיים - הוסף ל-tokens, לא לקומפוננטה!
□ ודא שהשם תואם בדיוק (כולל case)
```

---

## 4. Mobile First - כלל עליון

**90% מהשימוש באפליקציה מתבצע במובייל.**

### חוקים מחייבים:

| כלל | פירוט |
|-----|-------|
| **בדיקה ראשונית במובייל** | כל פיתוח נבדק קודם במסך 375px |
| **אין hover** | לא להסתמך על hover - אין עכבר במובייל |
| **Touch targets** | גודל מינימלי 44x44px לכל אלמנט לחיץ |
| **מסך צר** | כל קומפוננטה חייבת לעבוד ב-320px-414px |
| **גלילה אנכית** | להימנע מגלילה אופקית |
| **Viewport** | לא להסתמך על מסך רחב או גובה קבוע |

### קריטריון הצלחה:
```
פיצ'ר שלא עובד טוב במובייל = פיצ'ר לא מוכן
```

### Tailwind Breakpoints:
```javascript
'xs': '375px',   // iPhone SE
'sm': '640px',   // Tablet portrait
'md': '768px',   // Tablet landscape
'lg': '1024px',  // Desktop
```

### דוגמאות:
```typescript
// נכון - Mobile First
className="text-sm sm:text-base lg:text-lg"
className="p-3 sm:p-4 lg:p-6"
className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"

// לא נכון - Desktop First
className="text-lg sm:text-base xs:text-sm"
```

---

## 5. Approvals and Restricted Actions

פעולות מסווגות ל-3 רמות.

### Level 1: Safe
מותר לבצע ללא אישור.

**דוגמאות:**
- קריאת קבצים
- npm run build
- npm run lint
- הרצת בדיקות מקומיות

### Level 2: Guarded
מותר לבצע, אך הסוכן חייב לדווח לפני ואחרי ולציין מה השתנה.

**דוגמאות:**
- שינוי Store מרכזי
- שינוי Types
- Refactor בינוני
- מחיקת קוד מעל 20 שורות שאינה רק ניקוי קוד מת
- **שינוי ניווט או נתיבים**

### Level 3: Restricted
אסור לבצע ללא אישור מפורש לפני הרצה או שינוי.

**לפני כל פעולה ברמה זו הסוכן חייב לעצור ולהציג:**
- מה הוא עומד לעשות
- למה זה נדרש
- מה הסיכון
- מה האלטרנטיבה
- ואז להמתין לאישור

**דוגמאות Restricted:**
- שינוי כל קובץ config (vite.config, tsconfig, tailwind.config, postcss.config, firestore.rules)
- הוספת או הסרת dependencies (npm install, npm uninstall, שינוי package.json)
- פעולות שמדברות עם Firebase או Production (deploy, שינוי auth rules, שינוי firestore rules)
- מחיקה או שינוי נתונים חיצוניים

**פורמט בקשת אישור חובה:**
```
Action: [מה]
Reason: [למה]
Risk: [סיכון]
Rollback Plan: [איך לחזור אחורה]
```

---

## 6. מידע בסיסי על הפרויקט

**GymIQ** - אפליקציית כושר בעברית (RTL)

| פרמטר | ערך |
|-------|-----|
| **Framework** | React 18 + TypeScript |
| **Build** | Vite |
| **Backend** | Firebase (Auth, Firestore) |
| **Styling** | Tailwind CSS |
| **State** | Zustand |
| **Language** | עברית (RTL), אנגלית לקוד |

---

## 7. מבנה תיקיות בפועל

```
GymIQ/
├── CLAUDE.md                    # ספר החוקים - הקובץ הזה
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
│   │   │   └── types/           # exercise.types, muscles
│   │   └── workouts/
│   │       ├── components/
│   │       │   ├── WorkoutBuilder.tsx
│   │       │   ├── WorkoutSession.tsx
│   │       │   ├── WorkoutHistory.tsx
│   │       │   ├── active-workout/   # ActiveWorkoutScreen, etc.
│   │       │   └── workout-session/  # WorkoutSessionScreen, etc.
│   │       ├── hooks/           # useActiveWorkout, useWorkoutSession
│   │       ├── store/           # workoutBuilderStore (Zustand)
│   │       └── types/           # workout.types, active-workout.types
│   ├── lib/
│   │   └── firebase/            # Config & services
│   └── pages/                   # Legacy route pages
└── תיעוד מערכת/                 # מסמכי תיעוד נוספים
```

---

## 8. כללים קריטיים

### 8.1 ריכוז עיצוב - מקור אמת אחד

**אסור לפתח סגנונות מקומיים בקומפוננטים!**

| קובץ | תפקיד | סטטוס |
|------|-------|-------|
| `tailwind.config.js` | הגדרות צבעים, גדלים, אנימציות | מקור האמת |
| `src/index.css` | CSS custom properties בלבד | משני |

```typescript
// נכון
className="bg-neon-dark text-neon-cyan border-neon-gray-700"

// אסור - צבעים inline
style={{ backgroundColor: '#00f5ff' }}

// אסור - ערכים שרירותיים
className="bg-[#00f5ff]"
className="p-[17px]"

// אסור - יצירת קבצי CSS חדשים
```

### 8.2 סכמת צבעים פעילה

```javascript
// מ-tailwind.config.js
colors: {
  neon: {
    dark: '#0a0a0a',
    blue: '#00BFFF',
    cyan: '#00FFFF',
    green: '#00FF7F',
  },
  'neon-gray': {
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },
  status: {
    success: '#22C55E',
    error: '#EF4444',
    warning: '#F59E0B',
  }
}
```

### 8.3 קונבנציות שמות Types

```typescript
// workout.types.ts - לשימוש כללי
export type SetType = 'warmup' | 'working' | 'dropset' | 'superset' | 'amrap'
export interface WorkoutExercise { ... }
export interface WorkoutHistorySummary { ... }

// active-workout.types.ts - לאימון פעיל בלבד (לא להחליף בשמות!)
export interface ActiveWorkoutExercise { ... }
export interface ReportedSet { ... }
```

### 8.4 Firebase Collections

| Collection | שימוש | מסמך |
|------------|-------|------|
| `users` | פרופילי משתמשים | UserProfile |
| `exercises` | ספריית תרגילים | Exercise |
| `muscles` | קטגוריות שרירים | PrimaryMuscle |
| `workoutSessions` | אימונים פעילים | WorkoutSession |
| `workoutHistory` | היסטוריית אימונים | WorkoutHistoryEntry |

---

## 9. פיצ'רים מומשים

| פיצ'ר | סטטוס | קבצים מרכזיים |
|-------|-------|---------------|
| Authentication | מומש | `LoginPage.tsx`, `RegisterPage.tsx`, `useAuth.ts` |
| Exercise Library | מומש | `ExerciseLibrary.tsx`, `ExerciseCard.tsx`, `exerciseService.ts` |
| Workout Builder | מומש | `WorkoutBuilder.tsx`, `workoutBuilderStore.ts` |
| Workout Session | מומש | `WorkoutSession.tsx`, `ActiveWorkoutScreen.tsx` |
| Workout History | מומש | `WorkoutHistory.tsx` |
| Admin Panel | מומש | `ExerciseForm.tsx`, `UsersList.tsx`, `MuscleManager.tsx` |
| Dashboard | מומש | `UserDashboard.tsx` |
| Progress Analytics | בתכנון | טרם מומש |
| Trainer Features | בתכנון | טרם מומש |

---

## 10. פקודות

```bash
npm run dev      # הרצה מקומית (localhost:5173)
npm run build    # בנייה לייצור (כולל type check)
npm run lint     # בדיקת ESLint
npm run preview  # תצוגה מקדימה של build
```

---

## 11. אזהרות ואיסורים

### אסור בהחלט:
1. **לא ליצור קבצי CSS חדשים** - Tailwind classes בלבד
2. **לא לשנות tailwind.config.js** בלי אישור מפורש
3. **לא להשתמש ב-any** - TypeScript strict mode פעיל
4. **לא להוסיף dependencies** בלי אישור
5. **לא לכתוב קוד שלא עובד במובייל**
6. **לא לשנות ניווט בלי למפות את הזרימה קודם**
7. **לא להשתמש ב-class שלא קיים ב-tokens**

### חובה:
1. **RTL** - כל הטקסטים בעברית, כיוון מימין לשמאל
2. **Type Safety** - types מפורשים לכל פונקציה
3. **Mobile First** - בדיקה במסך צר לפני כל commit
4. **מיפוי תלויות** - לפני כל שינוי
5. **בדיקת E2E** - אחרי כל שינוי

---

## 12. מנגנון למידה מצטברת

**כלל מחייב:** כל טעות חוזרת או החלטה ארכיטקטונית חדשה מחייבת הצעה לעדכון מסמכים.

### מתי להציע עדכון:
| מצב | פעולה נדרשת |
|-----|------------|
| טעות זהה קרתה פעמיים | הצע הוספת כלל ל-CLAUDE.md |
| קונבנציה חדשה נקבעה | הצע הוספה לסעיף הרלוונטי |
| Type חדש נוצר | הצע תיעוד בסעיף Types |
| באג ארכיטקטוני נמצא | הצע הוספת אזהרה |
| פיצ'ר נעלם בגלל שינוי | הצע הוספת כלל למניעה |

### פורמט הצעת עדכון:
```
הצעת עדכון ל-CLAUDE.md

סעיף: [שם הסעיף]
סיבה: [מה קרה שמחייב את העדכון]
תוספת מוצעת:
---
[הטקסט להוספה]
---

לאשר? (כן/לא)
```

**אין להמשיך פיתוח לפני שההצעה מאושרת או נדחית.**

---

## 13. אחריות הסוכן

### מתי אסור לכתוב קוד:
- לא קראתי את CLAUDE.md
- המצב המוצהר הוא Reviewer או Documentation
- המשימה לא ברורה
- נדרש אישור שטרם התקבל
- הקוד לא יעבוד במובייל
- לא מיפיתי תלויות וזרימה

### מתי חובה לעצור ולדווח:
- נתקלתי בהחלטה ארכיטקטונית לא מתועדת
- יש סתירה בין מסמכים שונים
- המשימה דורשת שינוי ב-tailwind.config.js
- המשימה דורשת dependency חדש
- זו הפעם השנייה שאותה טעות קורית
- **שינוי ניווט עלול לדלג על מסך עם פיצ'רים**

### מתי חובה לבקש אישור:
- שינוי בקובץ config (tailwind, tsconfig, package.json)
- יצירת קובץ types חדש
- שינוי בלוגיקת authentication
- מחיקת קוד קיים (מעל 20 שורות)
- שינוי במבנה תיקיות
- **שינוי בניווט או בזרימת המשתמש**

---

## 14. צ'קליסט סיום משימה

**סיום משימה מותר רק לאחר בדיקת קבלה עצמית כתובה:**

```
□ בדיקות פונקציונליות:
  □ הפיצ'ר החדש עובד
  □ הפיצ'רים הקיימים לא נשברו
  □ הניווט עובד לכל המסכים
  □ עברתי את הזרימה המלאה מהדשבורד

□ בדיקות טכניות:
  □ אין שגיאות בקונסול (F12)
  □ אין שגיאות TypeScript
  □ כל ה-classes קיימים ב-tailwind.config.js

□ בדיקות ויזואליות:
  □ הצבעים נכונים
  □ העיצוב תקין
  □ RTL עובד
  □ נבדק במובייל (375px)

□ בדיקת רגרסיה:
  □ מיפיתי את כל הקבצים התלויים
  □ בדקתי שלא שברתי פיצ'רים קיימים
  □ הזרימה המלאה עדיין עובדת
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨 בדיקה אמיתית - לא רק "תיקנתי"!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

אסור לדווח "תיקנתי" בלי:
1. להריץ את האפליקציה
2. לעבור את הזרימה כמשתמש
3. לצלם מסך או לתאר מה רואים
4. לוודא שהתוצאה הגיונית (תאריך עתידי = "בעוד X ימים", לא "לפני X ימים")

אם אתה רואה אימוג'י במקום תמונה - זה באג!
אם אתה רואה "לפני -25 ימים" לתאריך עתידי - זה באג!
---

## 15. Skills Library

### Skill 1: Mobile Feature Review

**מתי:** בסוף כל משימת UI או קומפוננטה

**הסוכן חייב:**
- לוודא שימושיות במסך 320–414
- לוודא שאין גלילה אופקית
- לוודא targets 44x44
- לוודא RTL
- להחזיר רשימת בעיות ותיקונים

**פלט חובה:** קטע קצר בשם `Mobile Review Results` עם Passed או Issues

---

### Skill 2: Change Plan Before Code

**מתי:** לפני פיצ'ר חדש או שינוי בינוני ומעלה

**הסוכן חייב:**
- להציע תוכנית קצרה בשלבים
- לציין קבצים שישתנו
- **לציין קבצים תלויים**
- **למפות זרימת משתמש**
- סיכונים
- Done criteria
- להמתין לאישור לפני כתיבת קוד

**פלט חובה:** קטע בשם `Plan` וקטע בשם `Done Criteria`

---

### Skill 3: Safe Refactor

**מתי:** refactor, cleanup, rename, move

**הסוכן חייב:**
- להצהיר מה לא משתנה בהתנהגות
- לבצע בשלבים קטנים
- להימנע משינוי API בלי אישור
- להריץ lint
- **לוודא שכל הזרימות עדיין עובדות**
- לציין מה השתנה

**פלט חובה:** קטע בשם `Refactor Safety` עם Invariants

---

### Skill 4: Types Guard

**מתי:** כשנוגעים ב-types, store, models, firestore mapping

**הסוכן חייב:**
- לאתר types רלוונטיים
- לוודא שאין ערבוב בין workout types ל-active workout types
- לעדכן שימושים ושגיאות קומפילציה
- להציג רשימת קבצים שנפגעו

**פלט חובה:** קטע בשם `Types Check` עם מה נבדק ומה תוקן

---

### Skill 5: Docs Sync

**מתי:** בסוף סשן או אחרי החלטה מערכתית

**הסוכן חייב:**
- לזהות החלטות או כללים שלא כתובים
- להציע עדכון למסמך בפורמט הצעה
- לסווג חומרה
- לא לגעת בקוד

**פלט חובה:** קטע בשם `Docs Update Proposal`

---

### Skill 6: Regression Prevention (חדש!)

**מתי:** לפני כל שינוי בקוד

**הסוכן חייב:**
- למפות תלויות: `grep -r "ComponentName" src/`
- לשרטט זרימה לפני ואחרי
- לוודא classes קיימים ב-tokens
- לבדוק E2E אחרי השינוי

**פלט חובה:** קטע בשם `Regression Check` עם:
```
תלויות שנבדקו: [רשימה]
זרימה לפני: דשבורד → X → Y → Z
זרימה אחרי: דשבורד → X → Y → Z
Classes שנבדקו: [רשימה]
בדיקת E2E: Passed / Issues
```

---

```
===========================================================
סוף המסמך
כל שינוי בקובץ זה דורש אישור מפורש מהמשתמש
===========================================================
```
