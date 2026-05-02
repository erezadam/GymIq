# CLAUDE.md – GymIQ Control Center

## 🚨 פעולה ראשונה בכל שיחה — בדיקת ענף (חובה!)

> **לפני כל דבר אחר**, עוד לפני שאתה קורא skills או עונה למשתמש, הרץ:
> ```
> git branch --show-current
> ```
> **אם התוצאה היא `main`:**
> 1. הרץ `git pull origin main && git checkout -b work/$(date +%Y-%m-%d)`
> 2. דווח למשתמש: `✅ נוצר ענף עבודה: work/YYYY-MM-DD`
>
> **אם התוצאה היא ענף עבודה (לא main):**
> 1. דווח: `✅ ענף נוכחי: [שם הענף]`
>
> **אסור להתחיל לעבוד על main. אסור לדלג על הבדיקה הזו.**

---

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║   🚨 התחלה קבועה לכל משימה                                                    ║
║                                                                              ║
║   0. בדיקת ענף — ראה סעיף למעלה (חובה מיידית!)                               ║
║   1. קרא CLAUDE.md הזה (נעשה אוטומטית)                                        ║
║   2. קרא project-control: `.claude/project-control-SKILL.md`                 ║
║   3. לפני כל שינוי קוד: `.claude/development-flow-SKILL.md` ⚠️               ║
║   4. פרטים נוספים על תהליך יומי: `.claude/daily-workflow-SKILL.md` 🔄         ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

## חוקי ברזל קצרים

❌ **Firebase = single source of truth** - לא hardcoded arrays  
❌ **Mobile-first always** - כל UI נבדק ב-375px תחילה  
❌ **No manual testing claims** - רק בדיקות עם outputs אמיתיים  
❌ **No code deletion** שלא קשור ישירות למשימה  
❌ **No hardcoded secrets** - מפתחות רק דרך environment variables  
❌ **No inline styles** - כל עיצוב דרך Tailwind classes בלבד, אסור `style={{}}`
❌ **No direct push to main** - תמיד עבודה בענף + PR + CI ירוק
❌ **No deploy without tests** - לפני כל `firebase deploy` להריץ build + Vitest, לדווח תוצאות, לא לפרוס עם טסט שנכשל, ולא לפרוס בלי אישור מפורש מהמשתמש
❌ **No modal without explicit close** - כל modal חייב כפתור X ייעודי (44x44px מינימום) + סגירה בלחיצה על backdrop
❌ **No silent AI filtering** - כל קריאה ל-AI חיצוני חייבת validation + fallback. אסור לסנן תוצאות בשקט בלי השלמה
📖 **Database schema reference** - מבנה הנתונים מוגדר ב-`firestore.rules` (collections + הרשאות) וב-`src/domains/*/types/*.types.ts` (מבנה הנתונים). חובה לעיין בהם לפני כל שינוי במבנה הנתונים ב-Firestore
❌ **כיסוי מלא — משתמש ומאמן** - בכל פיתוח פיצ'ר חדש או שינוי בתהליך בחירת תרגילים / בניית אימון / סדר תרגילים: **לפני תחילת הקידוד**, שאל את המשתמש במפורש: *"האם הפיתוח הזה חל גם על מודול המאמן (ProgramBuilder) ועל זרימת המתאמן (TraineeProgramView → workoutBuilderStore)?"* — אל תניח שהתשובה שלילית. **המחדל הוא כן** עד שנאמר אחרת.

---

## 🎨 עיצוב - Design System (חוק ברזל!)

> **רקע:** ב-29/01/2026 נמצאו 217 שימושים ב-inline styles ב-12 קבצים.
> זה יוצר חוסר עקביות, קושי בתחזוקה, וסטייה מה-Design System.

### ❌ אסור בתכלית האיסור:
- להשתמש ב-`style={{}}` בקומפוננטות React
- לכתוב צבעים hardcoded בקוד (כמו `#A855F7`, `rgba(...)`)
- להשתמש בצבעים שלא מוגדרים ב-`tailwind-tokens.js`
- לכתוב spacing/padding/margin כמספרים ישירים

### ✅ חובה - איך לעצב נכון:

| במקום זה | להשתמש בזה |
|----------|------------|
| `style={{ color: '#A855F7' }}` | `className="text-purple-500"` |
| `style={{ background: 'rgba(168, 85, 247, 0.1)' }}` | `className="bg-purple-500/10"` |
| `style={{ display: 'flex', gap: '8px' }}` | `className="flex gap-2"` |
| `style={{ padding: '12px' }}` | `className="p-3"` |
| `style={{ borderRadius: '8px' }}` | `className="rounded-lg"` |

### 📋 צבעים מאושרים (מתוך tailwind-tokens.js):
```
primary: #00D4AA (primary.main)
accent-purple: #8B5CF6 (accent.purple)
error: #EF4444 (status.error)
warning: #F59E0B (status.warning)
success: #10B981 (status.success)
surface-container: #1d2026 (surface.container)
on-surface: #e1e2eb (on-surface.DEFAULT)
on-surface-variant: #bbcac6 (on-surface.variant)
```

**⚠️ מיגרציית צבעים (23/03/2026):** `text-text-muted` ו-`text-text-secondary` הוחלפו ב-`text-on-surface-variant` בכל קומפוננטות ה-trainer. יש להשתמש ב-`text-on-surface-variant` לטקסט משני/מושתק.

**אם צריך צבע שלא קיים - להוסיף ל-tailwind-tokens.js, לא לכתוב hardcoded!**

### 🔍 בדיקה חובה לפני כל commit:

```bash
# הרץ את הפקודה הזו לפני כל commit:
grep -r "style={{" src/ --include="*.tsx" | grep -v node_modules | wc -l

# אם יש תוצאות חדשות - לא לעשות commit! לתקן קודם.
```

### 📁 קבצים לעיון:
- **צבעים ו-tokens:** `tailwind-tokens.js`
- **CSS גלובלי:** `src/index.css`
- **הנחיות מלאות:** `.claude/mobile-rtl-SKILL.md`

---

## 🔐 אבטחה - מפתחות וסודות (חוק ברזל!)

> **רקע:** ב-16/01/2026 GitHub זיהה מפתחות API חשופים ב-19 קבצי סקריפטים.
> סעיף זה נוסף למניעת הישנות הבעיה.

### ❌ אסור בתכלית האיסור:
- לכתוב מפתחות API ישירות בקוד (כולל סקריפטים!)
- להעתיק ערכים מ-.env לתוך קבצי קוד
- לעשות commit לקבצים עם מפתחות/סיסמאות/tokens
- להדפיס סודות ל-console.log או ללוגים

### ✅ חובה - איך לגשת לסודות נכון:

| מיקום | איך לגשת |
|-------|----------|
| **באפליקציה (src/)** | `import.meta.env.VITE_FIREBASE_API_KEY` |
| **בסקריפטים (scripts/)** | לייבא מ-`scripts/firebase-config.ts` |
| **בטסטים** | להשתמש ב-Firebase Emulator |

### 📋 כשצריך לכתוב סקריפט עם Firebase:

```typescript
// ✅ נכון - לייבא מהקובץ המשותף
import { db, app } from './firebase-config';

// ❌ לא נכון - לעולם לא ככה!
const firebaseConfig = {
  apiKey: "AIzaSy...",  // אסור!!!
};
```

1. לייבא מ-`scripts/firebase-config.ts`
2. אם חסר משתנה סביבה - **לשאול את המשתמש**
3. **לעולם לא להעתיק מפתחות לקוד!**

### 🔍 בדיקה חובה לפני כל commit:

```bash
# הרץ את הפקודה הזו לפני כל commit:
grep -r "AIza" --include="*.ts" --include="*.js" --include="*.cjs" --include="*.tsx" . | grep -v node_modules

# אם יש תוצאות - לא לעשות commit!
```

### 🛡️ Pre-commit Hook (אוטומטי):

הפרויקט כולל pre-commit hook שבודק סודות אוטומטית.
אם ה-hook חוסם commit - **לא לעקוף אותו!** לתקן את הבעיה.

---

## 🔥 Firestore Collection/Subcollection חדש — צ'קליסט חובה (חוק ברזל!)

> **רקע:** ב-11/02/2026 נוצר subcollection חדש בלי בדיקת כתיבה/קריאה בפועל.
> ה-build עבר, אבל Firestore דחה את הכתיבה בגלל הרשאות חסרות. המשתמש גילה את זה, לא הסוכן.

### כשנוצר collection או subcollection חדש:

1. ✅ לעדכן `firestore.rules` עם הרשאות read + write
2. ✅ לבצע `firebase deploy --only firestore:rules`
3. ✅ לבדוק **כתיבה בפועל** (לא רק build)
4. ✅ לבדוק **קריאה בפועל** (לא רק שהקוד מתקמפל)
5. ✅ לוודא שהמסמך נוצר ב-Firebase Console

### ✅ הגדרת "בדיקה עוברת" (חוק ברזל!)

- **Build עובר** = קוד מתקמפל. **זה לא אומר שהפיצ'ר עובד.**
- **בדיקה עוברת** = הנתון נכתב ל-Firestore + נקרא בהצלחה + מוצג למשתמש.
- **Security תקין** = הרשאות Firestore נבדקו בפועל (כתיבה + קריאה), לא רק שהקובץ קיים.
- **Regression תקין** = זרימת אימון שלמה (התחל → דווח → סיים → נשמר) עובדת, לא רק grep.

---

## 🔤 שמות שרירים — מקור אמת יחיד (חוק ברזל!)

> **רקע:** ב-14/03/2026 תת-שרירים חדשים שנוספו ב-Firebase לא הופיעו בניתוח שבועי.
> הסיבה: מקורות תרגום מרובים ומתחרים בקוד.

### ❌ אסור בתכלית האיסור:
- לכתוב מיפוי שמות שרירים hardcoded בקומפוננטות (כמו `if (id === 'biceps') return 'זרועות'`)
- להסתמך על `muscleGroupNames` מ-design-tokens כמקור ראשי — זה רק fallback!
- ליצור רשימות/sets סטטיות של שרירים תקינים (כמו `VALID_EXERCISE_CATEGORIES_SET`) — תמיד דינמי מ-Firebase
- להוסיף שריר/תת-שריר חדש ב-Firebase בלי לוודא שהוא מופיע בכל המסכים

### ✅ מקור אמת יחיד — Firebase `muscles` collection:
1. **שרירים ראשיים ותת-שרירים** → `getMuscles()` מ-`src/lib/firebase/muscles.ts`
2. **תרגום ID לעברית** → `getMuscleIdToNameHeMap()` מ-`src/lib/firebase/muscles.ts`
3. **שמות ב-UI** → `getMuscleNameHe(id, dynamicNames)` מ-`src/utils/muscleTranslations.ts`

### 📋 סדר עדיפות לתרגום שם שריר:
```
1. Firebase dynamicNames (getMuscleIdToNameHeMap) ← מקור אמת!
2. design-tokens muscleGroupNames ← fallback בלבד
3. ערך מקורי (ID) ← last resort
```

### 🔍 בדיקה חובה כשמוסיפים/משנים שרירים:
```
□ שריר מופיע בדרופדאון ExerciseForm (בחר שריר ראשי)
□ שריר מופיע ב-ExerciseLibrary (כפתורי פילטור)
□ שריר מופיע בניתוח שבועי (WeeklyMuscleModal)
□ שם בעברית נכון בכל המסכים
```

---

## 🎯 פיצ'רים קריטיים - כללי ברזל

### סטטוסי אימון - התנהגות "המשך אימון"

| סטטוס | תצוגה | מה קורה בהמשך |
|-------|-------|---------------|
| `completed` | "הושלם" | ✅ יוצר אימון **חדש** עם תרגילים ריקים |
| `cancelled` | "ללא דיווח" | ⚠️ **מעדכן אימון קיים** (לא יוצר חדש!) |
| `in_progress` | "בתהליך" | ✅ מעדכן אימון קיים |
| `partial` | "בתהליך" | ✅ מעדכן אימון קיים |
| `planned` | "מתוכנן" | ✅ מעדכן אימון קיים |

**⚠️ שים לב:** `cancelled` (ללא דיווח) חייב להתנהג כמו `in_progress` - לא כמו `completed`!

**קובץ קריטי:** `src/domains/workouts/components/WorkoutHistory.tsx` - פונקציה `handleConfirmContinue`

### העברת נתוני תרגיל - חוק ברזל (29/01/2026)

> **כל נתיב שמוסיף תרגיל לאימון פעיל חייב להעביר `category`, `primaryMuscle`, `equipment` מנתוני התרגיל ב-Firebase.**
> **אסור להעביר ערכים ריקים (`''`) או hardcoded (`'other'`) - חובה לטעון מ-exercise service!**

**נתיבים קריטיים (כולם חייבים לטעון פרטי תרגיל מלאים):**
1. `ExerciseLibrary.tsx` - בחירת תרגילים חדשים
2. `WorkoutSession.tsx` - הוספת תרגיל באמצע אימון
3. `WorkoutHistory.tsx` → `handleConfirmContinue` - המשך אימון (completed/in_progress/planned)
4. `WorkoutHistory.tsx` → `handleEmptyWorkoutContinue` - המשך אימון ריק
5. `useActiveWorkout.ts` → Firebase recovery - שחזור אימון אחרי סגירת אפליקציה

**בדיקה אוטומטית:** `npm run test` - רגרסיה 29/01 בודקת את כל הנתיבים

### שמירת נתוני סטים מורחבים - חוק ברזל (29/01/2026)

> **כל save/restore point של נתוני סטים חייב לכלול את כל השדות: weight, reps + time, intensity, speed, distance, incline + assistanceWeight, assistanceBand**

**סיבה:** באג קריטי - בהמשך אימון, נתוני תרגילים עם report types מורחבים (זמן, עצימות, מהירות וכו') אבדו כי רק weight/reps נשמרו.

**Save points (חייבים extended fields):**
- `useActiveWorkout.ts`: triggerAutoSave, initWorkout save, finishWorkout, exitWorkout
- `workoutHistory.ts`: saveWorkoutHistory, autoSaveWorkout, completeWorkout

**Restore points (חייבים extended fields):**
- `useActiveWorkout.ts`: Firebase recovery, Continue from history

**Types שחייבים extended fields:**
- `WorkoutSet` ב-`workout.types.ts`
- `WorkoutHistoryEntry.exercises[].sets[]` ב-`workout.types.ts`

### קטגוריות תרגילים - category vs primaryMuscle

| שדה | תפקיד | ערכים תקינים |
|-----|-------|-------------|
| `category` | קבוצת שרירים ראשית | `legs`, `chest`, `back`, `shoulders`, `arms`, `core`, `cardio`, `warmup`, `functional`, `stretching` |
| `primaryMuscle` | שריר ספציפי | תת-שרירים כמו `glutes`, `quads`, `biceps`, `lats` וכו' |

**⚠️ חוקי ברזל:**
- `category` חייב להיות **רק** מהרשימה התקינה למעלה
- **אסור** להשתמש בתת-שרירים כ-category (למשל: `glutes` לא תקין, יש להשתמש ב-`legs`)
- Validation אוטומטי ב-`ExerciseForm.tsx` חוסם שמירת category לא תקין
- פונקציות תיקון זמינות ב-`src/lib/firebase/exercises.ts`:
  - `findExercisesWithInvalidCategory()` - מוצא תרגילים עם category שגוי
  - `fixExercisesWithInvalidCategory()` - מתקן אוטומטית

**מיפוי תת-שרירים לקטגוריות:**
```
glutes, quads, hamstrings, calves → legs
biceps, triceps, forearms → arms
lats, traps, rhomboids → back
front_delt, side_delt, rear_delt → shoulders
abs, obliques → core
upper_chest, mid_chest, lower_chest → chest
```

---

## 🚦 חובה לפני כל שינוי קוד

> **זה הסעיף שמונע תקלות!** קרא `.claude/development-flow-SKILL.md` לפרטים מלאים.

### צעדים מינימליים (חובה!):

**1. מיפוי תלויות:**
```bash
# מצא מה תלוי בקוד שאתה משנה:
grep -r "FunctionOrComponentName" src/ --include="*.tsx" --include="*.ts"
```

**2. בדיקת אזורים רגישים:**
```
האם נוגע באחד מאלה? (אם כן - זהירות כפולה!)
□ addExercise / workout status / calories
□ WorkoutHistory / WorkoutSession
□ category / primaryMuscle
□ AI trainer exercise filtering / prompt / response parsing
□ autoSave / validateWorkoutId / continueWorkoutId / continuation flow
```

**3. הגדרת גבולות:**
```
מה אני משנה: _______________
מה אני לא נוגע בו: _______________
```

**4. Self-Review לפני commit:**
```bash
# רגרסיות:
grep -r "WorkoutSummaryModal\|handleDeleteWorkout\|workout\.calories" src/ | wc -l
# אמור להיות > 0

# אבטחה:
grep -r "AIza" --include="*.ts" --include="*.tsx" . | grep -v node_modules
# אמור להיות ריק!

# עיצוב - inline styles:
grep -r "style={{" src/ --include="*.tsx" | wc -l
# לא להוסיף חדשים!
```

---

## טבלת חוקים

| נושא | חוק | איך בודקים שבוצע | Skill לפתוח |
|------|-----|-------------------|-------------|
| **התחלה קבועה** | בתחילת כל משימה קוראים CLAUDE.md ואז קוראים project_control | בתחילת התשובה רשום "נקרא project_control" | `.claude/project-control-SKILL.md` |
| **הגדרת משימה** | לפני שינוי קוד מנסחים במשפט אחד מה המטרה ומה ההגדרה של Done | יש סעיף Goal ו-Done | `.claude/project-control-SKILL.md` |
| **היקף שינוי** | לא משנים קבצים שלא קשורים ישירות למשימה | ברשימת הקבצים מופיעים רק קשורים | `.claude/project-control-SKILL.md` |
| **מניעת רגרסיה** | כל שינוי כולל בדיקת השפעה על יכולות קיימות | יש סעיף Regression checks | `.claude/qa-testing-SKILL.md` |
| **תיקון באגים** | בבאגים מתחילים בשחזור הבעיה לפני תיקון | יש Steps to reproduce | `.claude/qa-testing-SKILL.md` |
| **בדיקות** | אחרי תיקון מריצים בדיקות רלוונטיות ומדווחים תוצאה | יש Tests run ו-Results | `.claude/qa-testing-SKILL.md` |
| **תיעוד שינוי** | כל שינוי משמעותי כולל עדכון תיעוד רלוונטי | יש Docs updated | `.claude/documentation-SKILL.md` |
| **UI RTL עברית** | בכל מסך בעברית בודקים כיווניות טקסט קלטים אייקונים וניווט | יש RTL checklist summary | `.claude/mobile-rtl-SKILL.md` |
| **iOS מובייל** | בודקים גדלי מסך מקלדת safe area גלילה ופוקוס | יש Mobile checks | `.claude/mobile-rtl-SKILL.md` |
| **🎨 עיצוב** | לא משתמשים ב-style={{}} - רק Tailwind classes | בדיקת grep על inline styles | `.claude/mobile-rtl-SKILL.md` |
| **ביצועים** | לא מוסיפים טעינות כבדות בלי הצדקה | יש Performance notes | `.claude/project-control-SKILL.md` |
| **🔐 אבטחה סודות** | לא מכניסים מפתחות לקוד - בסקריפטים להשתמש ב-`scripts/firebase-config.ts` | יש Security check + בדיקת grep | ראה סעיף אבטחה למעלה |
| **Firebase** | כל שינוי נתונים כולל בדיקת rules ו-migrations במידת הצורך | יש Data change notes | `.claude/firebase-data-SKILL.md` |
| **🚀 פריסה** | לפני כל deploy: `npm run build` + `npm test` (Vitest) ירוקים + אישור משתמש | Build + Vitest עברו ואושר | ראה סעיף פריסה למעלה |
| **🔀 Git** | לא דוחפים ישירות ל-main, עובדים בענף נפרד, PR חובה | עובדים בענף feature/fix/work | `.claude/daily-workflow-SKILL.md` |
| **🔄 תהליך יומי** | תחילת שיחה = בדיקת ענף, סגירת יום = עדכון+build+PR+merge+cleanup | הסוכן מדווח על כל שלב | `.claude/daily-workflow-SKILL.md` |
| **סיום** | מסיימים בסיכום מה שונה איך נבדק ומה נשאר פתוח | יש Summary + Next | `.claude/project-control-SKILL.md` |

---

## טבלת טריגרים - איזה Skills לפתוח

| קטגוריית משימה | מילות מפתח | Skills לפתוח |
|----------------|-------------|-------------|
| **⚠️ כל שינוי קוד** | code, implement, add, change, update, modify, create | `.claude/development-flow-SKILL.md` (חובה!) |
| **חקירת באגים** | bug, investigate, debug, why, broken, not working, לא עובד | `.claude/development-flow-SKILL.md` + `.claude/qa-testing-SKILL.md` |
| **באגים ובדיקות** | bug, fix, regression, test, failing, error, crash, broken, debug | `.claude/qa-testing-SKILL.md` |
| **עברית ומובייל** | hebrew, rtl, ios, mobile, layout, responsive, iphone, android, touch | `.claude/mobile-rtl-SKILL.md` |
| **פריסה ותשתיות** | deploy, release, ci, env, firebase, hosting, production, build | `.claude/deployment-SKILL.md` |
| **רפקטור וארכיטקטורה** | refactor, architecture, structure, cleanup, organize, rename, move | `.claude/project-control-SKILL.md` |
| **UI ועיצוב** | design, style, color, theme, css, tailwind, component, visual | `.claude/mobile-rtl-SKILL.md` |
| **נתונים ו-Firebase** | data, database, firestore, collection, document, query, auth | `.claude/firebase-data-SKILL.md` |
| **ביצועים ואופטימיזציה** | performance, optimize, slow, fast, cache, memory, bundle | `.claude/project-control-SKILL.md` |
| **תכנון ותיעוד** | plan, design, document, spec, requirements, architecture | `.claude/documentation-SKILL.md` |
| **סקריפטים ו-Firebase** | script, migration, import, export, firebase-admin | ראה סעיף אבטחה + `.claude/firebase-data-SKILL.md` |
| **🔀 Git ו-GitHub** | git, branch, push, merge, pr, deploy to main | `.claude/daily-workflow-SKILL.md` |
| **🔄 תהליך יומי** | בוקר טוב, התחלת עבודה, סגור יום, סיום יום, start day, end of day | `.claude/daily-workflow-SKILL.md` |

---

## כלל ביצוע

0. **בדיקת ענף (מיידית!)** — הרץ `git branch --show-current`. אם `main` → צור ענף עבודה. **אסור לדלג!**
1. **קרא project_control** תמיד ראשון
2. **לפני כל קוד - קרא development-flow** ⚠️ (זה מונע תקלות!)
3. **זהה טריגרים** במשימה ופתח Skills רלוונטיים
4. **בצע לפי הצ'קליסט** שבתוך ה-Skills
5. **בדוק אבטחה** - אם יצרת/שינית קבצים, הרץ בדיקת סודות
6. **בדוק עיצוב** - אם יצרת/שינית קומפוננטות, וודא אין inline styles
7. **סיים עם סיכום** קצר + מה נבדק

---

## פורמט דיווח נדרש

```
✅ נקרא project_control
✅ נקרא [שם_skill]

🎯 Goal: [משפט אחד - מה המטרה]
🏁 Done: [משפט אחד - איך יודעים שסיימנו]

📁 Files: [רשימת קבצים שישתנו]

[ביצוע המשימה לפי הצ'קליסט]

🔐 Security: [בוצעה בדיקת סודות - תקין/נמצאו בעיות]
🎨 Styling: [בוצעה בדיקת inline styles - תקין/נמצאו בעיות]

📋 Summary:
- Changed: [מה שונה]
- Tested: [איך נבדק]
- Next: [מה נשאר לעשות]
```

---

## 🚀 פריסה — חובה לפני כל deploy (חוק ברזל!)

> **רקע:** ב-17/02/2026 בוצעו פריסות בלי הרצת טסטים, מה שגרם לרגרסיות שהגיעו לפרודקשן.

### ❌ אסור בתכלית האיסור:
- לפרוס (`firebase deploy` / `firebase deploy --only functions` וכו') בלי להריץ build + Vitest קודם
- לפרוס כשיש טסט שנכשל
- לפרוס בלי אישור מפורש מהמשתמש

> **Auto-deploy (28/04/2026):** every push to `main` triggers automatic deploy
> to production via `.github/workflows/deploy.yml`. Manual `gh workflow run deploy.yml`
> is a fallback for emergencies only. Merge to main = production deploy — see also
> the "Deployment Workflow (Iron Rule)" section.

### 🚀 שתי דרכים לפריסה:

**אופציה 1 — פריסה מקומית (המסלול הרגיל):**
```bash
firebase deploy --only hosting
# או: firebase deploy --only hosting,functions,firestore
```

**אופציה 2 — GitHub Actions (כשיש בעיית build מקומי):**
- GitHub → Actions → "Deploy to Firebase" → Run workflow → בחירת target
- הrun מתבצע ב-Ubuntu נקי, ללא בעיות filesystem/מק
- דורש secrets מוגדרים: FIREBASE_TOKEN + 6 VITE_FIREBASE_*
- קובץ: `.github/workflows/deploy.yml`
- **שימושי במיוחד** כשיש I/O hangs מקומיים ב-tsc/vite

**שתי הדרכים דורשות:** בדיקות לפי רמה + אישור משתמש לפני הפריסה.

---

## 🧪 בדיקות — Build + Vitest + אימות במכשיר

> **כלל אצבע:** Build בודק שהקוד מתקמפל. Vitest בודק רגרסיות בפונקציות הקריטיות. שניהם חייבים לעבור לפני merge — אבל הם **לא** מספיקים לבאגים שנוגעים לפלטפורמה ספציפית (במיוחד מובייל).

### לפני כל merge ל-main:
```bash
npm run build 2>&1 | tail -5   # TypeScript + Vite build
npm test                        # Vitest unit/regression tests
```

**שני הצעדים חייבים לעבור ירוקים. אם משהו נכשל — עצור, דווח למשתמש, תקן את הסיבה השורשית.**

### ❌ חוק ברזל: בדיקות חייבות לבדוק התנהגות, לא קיום מחרוזות

> **רקע:** ב-30/04/2026 נוספו 9 בדיקות source-grep ב-Stage 6 של PR #108 (תמיכת WebP). הן עברו את ה-CI אבל בדקו רק שמחרוזות מופיעות בקבצים — לא התנהגות. הבאג של `videoWebpUrl=undefined` ב-`updateDoc()` עבר דרכן ללא בעיה והגיע לפרודקשן.

בדיקות מסוג **source-grep** (קריאת קבצים ובדיקה שמחרוזת/שדה מופיעים) מותרות **רק כתוספת לבדיקה התנהגותית אמיתית**, לעולם לא כתחליף.

**אם הסוכן מצהיר שכתב בדיקה — הבדיקה חייבת להיכשל אם הפיצ'ר נשבר ב-runtime.**

❌ **לא מקובל** (source-grep בלבד):
```typescript
expect(readFileSync('src/x.tsx').includes('videoWebpUrl')).toBe(true)
```

✅ **מקובל** (התנהגותי, mock + assert על קריאה ל-API):
```typescript
vi.mock('firebase/firestore', () => ({ updateDoc: vi.fn(), ... }))
await updateExercise('id', { videoWebpUrl: undefined })
expect(updateDoc).toHaveBeenCalledWith(
  expect.anything(),
  expect.not.objectContaining({ videoWebpUrl: expect.anything() })
)
```

source-grep יכול להיות **שכבה שנייה** של הגנה (לדאוג שהשדה לא נמחק בטעות), אבל ללא בדיקה התנהגותית — הוא חסר ערך.

### 📱 אימות במכשיר — לפני merge, לא אחרי deploy

- **production אינה סביבת בדיקה.** אסור להסתמך על "נבדוק בפרודקשן אחרי deploy" כעל מנגנון אימות. הזרימה הזו כשלה ב-27-28/04/2026 (ראה סעיף "Mobile Date Picker — Lesson Learned" למטה).
- **כל תיקון באג שדווח על מכשיר ספציפי** (iOS, Android, iPad וכו') חייב להיבדק על אותו סוג מכשיר על ידי המשתמש **לפני** merge ל-main. DevTools mobile emulation אינו מספיק להתנהגויות חריגות של iOS Safari (event propagation, showPicker, native input rendering).
- **אם אין preview channel זמין**, ההרצה הלוקאלית עם גישה ממכשיר על אותה רשת:
  ```bash
  npm run dev -- --host
  # פתח את ה-URL המודפס (למשל http://192.168.1.42:3000) מהדפדפן של המכשיר באותה רשת WiFi
  ```
- **merge ל-main = פריסה לפרודקשן** (היום דרך deploy ידני; כש-auto-deploy יוטמע — באופן ישיר). לכן אימות מכשיר חייב לקרות לפני merge.
- **כשאי אפשר לבקש בדיקה במכשיר** — הסוכן מסמן את המשימה כ-**"fix candidate, awaiting device verification"** ולא כ-"מתוקן". ממתין לאישור משתמש לפני סגירת המשימה.

---

## 🔒 Deployment Workflow (Iron Rule)

**Forbidden:** Direct deploy from local branch before merge to main.
**Forbidden:** Manual deploy without an approved PR in main.

**Required sequence - NO exceptions:**
1. `git checkout -b <feature-branch>`
2. Commit changes
3. `git push origin <feature-branch>`
4. Open PR via `gh pr create`
5. Wait for GitHub Actions CI to pass (all green checks)
6. Wait for user approval (explicit "merge approved")
7. Merge PR to main
8. Wait for user to trigger manual deploy workflow
9. Only then - run manual verification on production

**The agent does NOT:**
- Run `firebase deploy` locally
- Suggest deploy before PR merge
- Merge PRs without explicit user approval

**Rationale:** main↔production invariant. Production must always reflect merged main.

**⚠️ כשלונות pre-existing:** אם טסטים נכשלים שאינם קשורים לשינוי שלך, **אל תתעלם!** דווח למשתמש:
```
⚠️ נמצאו X כשלונות pre-existing שאינם קשורים לשינוי הנוכחי:
- [רשימת הכשלונות]
האם להמשיך לפרוס? (המשתמש מחליט)
```

---

## 🔀 Git ותהליך עבודה עם GitHub (חוק ברזל!)

> **רקע:** ב-03/02/2026 הוגדרו branch protection, CI אוטומטי, ו-PR חובה על main.
> אי אפשר לדחוף ישירות ל-main. כל שינוי חייב לעבור PR עם build ירוק.

### ❌ אסור בתכלית האיסור:
- לדחוף (push) ישירות ל-`main`
- לעבוד על branch `main` מקומית (רק pull ממנו)
- לעשות commit ל-`main` ישירות
- למזג PR עם build שנכשל

### ✅ חובה - תהליך עבודה נכון:

**ראה `.claude/daily-workflow-SKILL.md` לתהליך המלא!**

**תחילת יום:** הסוכן בודק אוטומטית את הענף ויוצר ענף עבודה אם צריך.

**סגירת יום:** אמור "סגור יום" והסוכן יבצע: עדכון מסמכים → build → commit → push → PR → CI → merge → cleanup.

**לפני כל PR:** הרץ `/code-review` על הענף לפני יצירת PR — תקן בעיות לפני שפותחים PR.

### 📋 מוסכמות שמות ענפים:

| סוג עבודה | תבנית שם | דוגמה |
|-----------|----------|-------|
| פיצ'ר חדש | `feature/שם` | `feature/trainer-module` |
| תיקון באג | `fix/שם` | `fix/rest-timer-sound` |
| עבודה כללית | `work/תאריך` | `work/2026-02-03` |
| תשתית/הגדרות | `setup/שם` | `setup/ci-workflow` |

### 🛡️ מה מגן על main:

- **Branch Protection:** חובת PR, אי אפשר push ישיר
- **GitHub Actions CI:** כל PR מריץ `npm ci` + `npm run build`
- **Status Check חובה:** בלי build ירוק = אי אפשר למזג
- **PR Template:** תבנית אוטומטית עם: מה השתנה, איך בדקתי, מה עלול להישבר, איך עושים rollback

### 🔧 כלי עזר:

| פקודה | מה עושה |
|-------|---------|
| `gh pr create` | פותח PR מהטרמינל |
| `gh pr list` | רואה PRs פתוחים |
| `gh pr checks [N]` | בודק סטטוס CI של PR |
| `gh pr merge --merge` | ממזג PR |
| `gh pr view --web` | פותח PR בדפדפן |
| `git branch -a` | רואה כל הענפים |
| `git branch --show-current` | מציג ענף נוכחי |
| `git remote prune origin` | מנקה ענפים מרוחקים שנמחקו |

---

## Mobile Date Picker — Lesson Learned (2026-04-27/28)

Bug: iOS Safari closed the date-selection modal on first tap.
PR #102 attempted to fix it by removing showPicker() calls on mobile.
The fix appeared to work (build green) but moved the symptom:
clicking the empty input field still closed the modal due to event propagation
between the native input and the modal backdrop.

Real fix (PR #104) — removed the modal entirely (both mobile and desktop),
replacing the trigger button with a <label> wrapping a visually hidden
<input type="date">. This way, clicking the trigger area is, from the DOM's
perspective, clicking the input — which opens the OS native picker on a
single tap on every device, with no intermediate modal layer.

Rule for this codebase: any modal that wraps a native form control
(date, time, color, file) must be reconsidered. The OS-provided picker
overlay already handles the UX a custom modal tries to recreate, and the
wrapping modal introduces event-propagation bugs that are hard to debug remotely.
The label + hidden input pattern is the standard, accessible solution.

---

## 📜 היסטוריית אירועים

| תאריך | אירוע | לקח |
|-------|-------|-----|
| 16/01/2026 | GitHub זיהה 19 קבצים עם מפתחות חשופים | נוסף סעיף אבטחה + firebase-config.ts משותף |
| 29/01/2026 | נמצאו 217 inline styles ב-12 קבצים | נוסף סעיף עיצוב + חוק ברזל No inline styles |
| 03/02/2026 | הוגדרו branch protection + CI + PR חובה על main | נוסף סעיף Git + תהליך עבודה עם GitHub |
| 07/02/2026 | נוצר skill לתהליך עבודה יומי | הסוכן מנהל תחילת יום וסגירת יום אוטומטית |
| 08/02/2026 | בדיקת ענף לא רצה אוטומטית | הועברה להוראה ישירה בראש CLAUDE.md (לא הפניה ל-skill) |
| 17/02/2026 | modal תמונת תרגיל לא ניתן לסגירה - stopPropagation חסם backdrop click | נוסף חוק ברזל: כל modal חייב כפתור X ייעודי + backdrop close |
| 17/02/2026 | AI Trainer סינן תרגילים בשקט (10→7) בגלל exerciseId לא תקינים מ-GPT | נוסף fallback + חוק ברזל: No silent AI filtering |
| 17/02/2026 | המשך אימון in_progress יוצר מסמך כפול - validateWorkoutId מנל ID | נוסף continueWorkoutIdRef + retry (3 נסיונות) + הגנה בכל נקודות autoSave + זיהוי כפילויות בהיסטוריה |
| 17/02/2026 | פריסות בוצעו בלי הרצת טסטים, רגרסיות הגיעו לפרודקשן | נוסף חוק ברזל: build + טסטים חובה לפני כל deploy + אישור מפורש מהמשתמש |
| 10/03/2026 | נוסף code-review plugin | חובה להריץ /code-review לפני פתיחת PR |
| 14/03/2026 | תת-שרירים חדשים מ-Firebase לא הופיעו בניתוח שבועי + דרופדאון ExerciseForm פולטר לפי Set קשיח | נוסף חוק ברזל: מקור אמת יחיד לשמות שרירים = Firebase. אסור רשימות סטטיות. auto-sync ב-getMuscles() |
| 14/03/2026 | קרדיט חלקי לישבן הלך ל-longissimus במקום gluteus_maximus + חסר biceps_brachii | תוקן SECONDARY_MUSCLE_MULTIPLIERS: 3 שרירי עזר (triceps/biceps_brachii/gluteus_maximus), רשימות תרגילים עודכנו, UI שונה — סטים צבעוניים (ירוק≥10/אדום<10), ממוצע חזרות צבעוני (ירוק≥5/אדום<5), הוסר עמודת סטטוס |
| 23/03/2026 | מיגרציית צבעים + עיצוב Trainer מחדש | TrainerLayout עבר ל-bottom nav + Material 3 surface tokens + מיגרציית text-text-muted/secondary ל-on-surface-variant ב-~40 קבצים + cancelled workouts נספרים בניתוח |
| 31/03/2026 | מאמן לא יכל לערוך אימונים מופצים למתאמנים | נוסף WorkoutHistoryEditor — מאמן יכול לערוך/למחוק תרגילים באימון שלא פעיל, עם optimistic locking, audit trail, והגנה על סטים שבוצעו |
| 02/04/2026 | פיצ'רים פותחו רק למתאמן בלי לכסות מודול מאמן | נוסף חוק ברזל: כיסוי מלא — משתמש ומאמן. חובה לשאול לפני קידוד אם השינוי חל גם על ProgramBuilder ו-TraineeProgramView |
| 14/04/2026 | מאמן לא יכל לשייך אימון למתאמן מהדשבורד הרגיל | נוסף TraineeAssignmentModal ב-ExerciseLibrary: בלחיצה על "התחל/שמור" עולה modal אופציונלי לבחירת מתאמן. אם נבחר — נוצר standalone trainingProgram דרך programService.createProgram() הקיים (אמת אחת, בלי הכפלת קוד) |
| 14/04/2026 | אימוני מאמן → מתאמן נשמרו כפול (גם אצל המאמן וגם אצל המתאמן) | תוקן race condition ב-handleReportWorkout: setTrainerReport() חייב לרוץ לפני loadFromProgram() כי loadFromProgram משנה selectedExercises ומפעיל את ה-effect ב-useActiveWorkout לפני שה-targetUserId מעודכן. בנוסף: defense-in-depth ב-initWorkout — קריאת targetUserId/reportedBy העדכני מה-store במקום closure |
| 14/04/2026 | בעיית filesystem I/O במק חסמה build מקומי (tsc/vite תקועים ללא CPU) | נוסף GitHub Actions workflow `.github/workflows/deploy.yml` — פריסה ידנית (`workflow_dispatch`) מסביבת Ubuntu נקייה. Secrets נדרשים: FIREBASE_TOKEN + 6 VITE_FIREBASE_*. שימוש: Actions → "Deploy to Firebase" → Run workflow → בחירת target (hosting / hosting,functions / hosting,functions,firestore) |
| 26/04/2026 | כתיבת טיוטות "מה חדש" ידנית בכל deploy בזבזה זמן | נוסף workflow `auto-draft-release-note.yml` שנדלק על `workflow_run` של Deploy + הצלחה. סקריפט `scripts/draftReleaseNoteFromPR.ts` קורא ל-Claude Haiku 4.5 (prompt caching), כותב טיוטה ל-`releaseNotes`. Idempotent לפי `changelogHash="pr:<n>"`. Secrets חדשים: `ANTHROPIC_API_KEY`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`. Drafts נשמרים בלבד — admin עורך ומפרסם ב-`/admin/release-notes`. |
| 26/04/2026 | חסר דאשבורד אדמין לשימוש במערכת | נוסף `/admin/analytics` — 4 טאבים (סקירה כללית/מאמנים/מתאמנים/תרגילים) + 2 מסכי פירוט (trainee/trainer). Stack: recharts + TanStack Query. Aggregation client-side מ-`workoutHistory`/`users`, מבודד ב-hook יחיד `useAnalyticsData` — החלפה ל-`analytics_daily` בעתיד = שינוי קובץ יחיד `src/lib/firebase/analyticsQueries.ts`. Retention 30d מבחין בין "0%" אמיתי ל-"—" (קוהורט ריק). Delta של "סה"כ אימונים" מוסתר אם previous<5 (`MIN_PREV_FOR_DELTA`) למניעת רעש "1→2=+100%". טיפוגרפיה הוגדלה ב-30% מקומית בלבד לדאשבורד (xs→sm, sm→base, base→lg). |
| 28/04/2026 | הוסרה תשתית Playwright מהפרויקט | נמחקו `playwright.config.ts`, `e2e/`, `.github/workflows/playwright.yml`, `.mcp.json` (Playwright MCP), והתלות `@playwright/test` מ-package.json. בנוסף שונה שם `E2E_ADMIN_*` → `ADMIN_*` בכל הפרויקט (workflow, release-note script, ו-14 סקריפטי תחזוקה/מיגרציה) כי השם היה מטעה — הקרדיטים מעולם לא היו של framework טסטים. בדיקות הפרויקט: `npm run build` + `npm test` (Vitest) בלבד. |
| 30/04/2026 | תמיכה ב-WebP אנימציה לתרגילים — Phase 1 (תשתית) | נוסף שדה אופציונלי `videoWebpUrl?: string` ל-`Exercise`. כל 24 נקודות הצגת תמונת תרגיל באפליקציה (משתמש + מאמן + אדמין) עברו לרכיב משותף חדש `<ExerciseMedia>` ב-`src/shared/components/ExerciseMedia/`. ה-variant מכריע על מדיניות הטעינה: `hero` טוען WebP אנימטיבי, `thumbnail` תמיד תמונה סטטית (חיסכון ברוחב פס במיניאטורות קטנות), `preview` ל-context של אדמין. propagation מלא בכל iron-rule save/restore points (29/01): 9 ב-`useActiveWorkout`, 3 ב-`workoutHistory.ts`, 6 ב-`ExerciseLibrary`, 8 ב-`WorkoutHistory` continue handlers, 5 ב-trainer builders. test רגרסיה חדש: 9 בדיקות תחת `describe('videoWebpUrl propagates through workout lifecycle')`. side fixes: `PersonalRecords.tsx` placeholder.png → SVG, `admin/ExerciseList.tsx` הסיר תלות חיצונית `via.placeholder.com`. **Phase 2 TODO**: bulk migration script. |
| 27-28/04/2026 | באג date picker מובייל דווח כ"מתוקן" אחרי PR #102 — התברר שהתיקון העביר סימפטום, לא טיפל בשורש (event propagation במודל). PR #104 הסיר את ה-modal לחלוטין | נוסף סעיף "Mobile Date Picker — Lesson Learned" + עודכן סעיף "🧪 בדיקות" עם מנדט אימות-במכשיר-לפני-merge + Bug Verification Policy גלובלי ב-`~/.claude/CLAUDE.md` |
| 02/05/2026 | 9 בדיקות source-grep מ-Stage 6 של PR #108 (תמיכת WebP) עברו את ה-CI אבל לא תפסו שהקוד שולח `videoWebpUrl=undefined` ל-`updateDoc()`. Firestore דחה ועדכון תרגיל נשבר ב-production | נוסף חוק ברזל בסעיף "🧪 בדיקות": בדיקות חייבות לבדוק התנהגות (mock + assert על API), לא קיום מחרוזות. source-grep מותר רק כתוספת. |

---

```
══════════════════════════════════════════════════════════════════════════════
עדכון אחרון: 28/04/2026 | Bug Verification Policy + Lesson Learned (date picker)
══════════════════════════════════════════════════════════════════════════════
```
