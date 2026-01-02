# CLAUDE.md - ספר החוקים העליון של GymIQ

```
===========================================================
קובץ זה הוא מקור האמת היחיד להתנהלות סוכני AI בפרויקט.
כל סוכן חייב לקרוא קובץ זה במלואו לפני כל פעולה.
עדכון אחרון: ינואר 2026
===========================================================
```

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
- [ ] אישרתי שהמשימה תואמת את המצב המוצהר

**פורמט פתיחה מחייב:**
```
---
מצב: [Builder/Reviewer/Documentation]
משימה: [תיאור קצר]
קבצים: [רשימת קבצים שישתנו]
סיכום: [מה בדיוק יקרה]
---
```

---

## 3. Mobile First - כלל עליון

**90% מהשימוש באפליקציה מתבצע במובייל.**
Approvals and Restricted Actions

פעולות מסווגות ל 3 רמות.

Level 1 Safe

מותר לבצע ללא אישור.
דוגמאות
קריאת קבצים
npm run build
npm run lint
הרצת בדיקות מקומיות

Level 2 Guarded

מותר לבצע, אך הסוכן חייב לדווח לפני ואחרי ולציין מה השתנה.
דוגמאות
שינוי Store מרכזי
שינוי Types
Refactor בינוני
מחיקת קוד מעל 20 שורות שאינה רק ניקוי קוד מת

Level 3 Restricted

אסור לבצע ללא אישור מפורש לפני הרצה או שינוי.

לפני כל פעולה ברמה זו הסוכן חייב לעצור ולהציג
מה הוא עומד לעשות
למה זה נדרש
מה הסיכון
מה האלטרנטיבה
ואז להמתין לאישור

דוגמאות Restricted
שינוי כל קובץ config
vite.config
tsconfig
tailwind.config
postcss.config
firestore.rules

הוספת או הסרת dependencies
npm install
npm uninstall
שינוי package.json או package-lock.json

פעולות שמדברות עם Firebase או Production
deploy
שינוי auth rules
שינוי firestore rules
מחיקה או שינוי נתונים חיצוניים

פורמט בקשת אישור חובה
Action
Reason
Risk
Rollback Plan

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

## 4. מידע בסיסי על הפרויקט

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

## 5. מבנה תיקיות בפועל

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

## 6. כללים קריטיים

### 6.1 ריכוז עיצוב - מקור אמת אחד

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

### 6.2 סכמת צבעים פעילה

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

### 6.3 קונבנציות שמות Types

```typescript
// workout.types.ts - לשימוש כללי
export type SetType = 'warmup' | 'working' | 'dropset' | 'superset' | 'amrap'
export interface WorkoutExercise { ... }
export interface WorkoutHistorySummary { ... }

// active-workout.types.ts - לאימון פעיל בלבד (לא להחליף בשמות!)
export interface ActiveWorkoutExercise { ... }
export interface ReportedSet { ... }
```

### 6.4 Firebase Collections

| Collection | שימוש | מסמך |
|------------|-------|------|
| `users` | פרופילי משתמשים | UserProfile |
| `exercises` | ספריית תרגילים | Exercise |
| `muscles` | קטגוריות שרירים | PrimaryMuscle |
| `workoutSessions` | אימונים פעילים | WorkoutSession |
| `workoutHistory` | היסטוריית אימונים | WorkoutHistoryEntry |

---

## 7. פיצ'רים מומשים

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

## 8. פקודות

```bash
npm run dev      # הרצה מקומית (localhost:5173)
npm run build    # בנייה לייצור (כולל type check)
npm run lint     # בדיקת ESLint
npm run preview  # תצוגה מקדימה של build
```

---

## 9. אזהרות ואיסורים

### אסור בהחלט:
1. **לא ליצור קבצי CSS חדשים** - Tailwind classes בלבד
2. **לא לשנות tailwind.config.js** בלי אישור מפורש
3. **לא להשתמש ב-any** - TypeScript strict mode פעיל
4. **לא להוסיף dependencies** בלי אישור
5. **לא לכתוב קוד שלא עובד במובייל**

### חובה:
1. **RTL** - כל הטקסטים בעברית, כיוון מימין לשמאל
2. **Type Safety** - types מפורשים לכל פונקציה
3. **Mobile First** - בדיקה במסך צר לפני כל commit

---

## 10. מנגנון למידה מצטברת

**כלל מחייב:** כל טעות חוזרת או החלטה ארכיטקטונית חדשה מחייבת הצעה לעדכון מסמכים.

### מתי להציע עדכון:
| מצב | פעולה נדרשת |
|-----|------------|
| טעות זהה קרתה פעמיים | הצע הוספת כלל ל-CLAUDE.md |
| קונבנציה חדשה נקבעה | הצע הוספה לסעיף הרלוונטי |
| Type חדש נוצר | הצע תיעוד בסעיף Types |
| באג ארכיטקטוני נמצא | הצע הוספת אזהרה |

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

## 11. אחריות הסוכן

### מתי אסור לכתוב קוד:
- לא קראתי את CLAUDE.md
- המצב המוצהר הוא Reviewer או Documentation
- המשימה לא ברורה
- נדרש אישור שטרם התקבל
- הקוד לא יעבוד במובייל

### מתי חובה לעצור ולדווח:
- נתקלתי בהחלטה ארכיטקטונית לא מתועדת
- יש סתירה בין מסמכים שונים
- המשימה דורשת שינוי ב-tailwind.config.js
- המשימה דורשת dependency חדש
- זו הפעם השנייה שאותה טעות קורית

### מתי חובה לבקש אישור:
- שינוי בקובץ config (tailwind, tsconfig, package.json)
- יצירת קובץ types חדש
- שינוי בלוגיקת authentication
- מחיקת קוד קיים (מעל 20 שורות)
- שינוי במבנה תיקיות

סיום משימה מותר רק לאחר בדיקת קבללה עצמית כתובה, לפי מפרט בדיקות שתקבל בהנחיה לפיתוח ---

Skills Library
Skill 1 Mobile Feature Review

מתי
בסוף כל משימת UI או קומפוננטה
הסוכן חייב
לוודא שימושיות במסך 320–414
לוודא שאין גלילה אופקית
לוודא targets 44x44
לוודא RTL
להחזיר רשימת בעיות ותיקונים
פלט חובה
קטע קצר בשם Mobile Review Results עם Passed או Issues

Skill 2 Change Plan Before Code

מתי
לפני פיצר חדש או שינוי בינוני ומעלה
הסוכן חייב
להציע תוכנית קצרה בשלבים
לציין קבצים שישתנו
סיכונים
Done criteria
להמתין לאישור לפני כתיבת קוד
פלט חובה
קטע בשם Plan וקטע בשם Done Criteria

Skill 3 Safe Refactor

מתי
refactor cleanup rename move
הסוכן חייב
להצהיר מה לא משתנה בהתנהגות
לבצע בשלבים קטנים
להימנע משינוי API בלי אישור
להריץ lint
ולציין מה השתנה
פלט חובה
קטע בשם Refactor Safety עם Invariants

Skill 4 Types Guard

מתי
כשנוגעים ב types store models firestore mapping
הסוכן חייב
לאתר types רלוונטיים
לוודא שאין ערבוב בין workout types ל active workout types
לעדכן שימושים ושגיאות קומפילציה
ולהציג רשימת קבצים שנפגעו
פלט חובה
קטע בשם Types Check עם מה נבדק ומה תוקן

Skill 5 Docs Sync

מתי
בסוף סשן או אחרי החלטה מערכתית
הסוכן חייב
לזהות החלטות או כללים שלא כתובים
להציע עדכון למסמך בפורמט הצעה
לסווג חומרה
לא לגעת בקוד
פלט חובה
קטע בשם Docs Update Proposal```
===========================================================
סוף המסמך
כל שינוי בקובץ זה דורש אישור מפורש מהמשתמש
===========================================================
```
