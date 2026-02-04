# CLAUDE.md – GymIQ Control Center

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║   🚨 התחלה קבועה לכל משימה                                                    ║
║                                                                              ║
║   1. קרא CLAUDE.md הזה (נעשה אוטומטית)                                        ║
║   2. קרא project-control: `.claude/project-control-SKILL.md`                 ║
║   3. לפני כל שינוי קוד: `.claude/development-flow-SKILL.md` ⚠️               ║
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
```

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
| **פריסה** | לפני פריסה מוודאים env נכון build נקי ו-rollback plan | יש Deploy checklist | `.claude/deployment-SKILL.md` |
| **🔀 Git** | לא דוחפים ישירות ל-main, עובדים בענף נפרד, PR חובה | עובדים בענף feature/fix/work | ראה סעיף Git למעלה |
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
| **🔀 Git ו-GitHub** | git, branch, push, merge, pr, deploy to main | ראה סעיף Git למעלה |

---

## כלל ביצוע

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

## 🔀 Git ותהליך עבודה עם GitHub (חוק ברזל!)

> **רקע:** ב-03/02/2026 הוגדרו branch protection, CI אוטומטי, ו-PR חובה על main.
> אי אפשר לדחוף ישירות ל-main. כל שינוי חייב לעבור PR עם build ירוק.

### ❌ אסור בתכלית האיסור:
- לדחוף (push) ישירות ל-`main`
- לעבוד על branch `main` מקומית (רק pull ממנו)
- לעשות commit ל-`main` ישירות
- למזג PR עם build שנכשל

### ✅ חובה - תהליך עבודה נכון:

**1. לפני תחילת עבודה (טרמינל כללי):**
```bash
git checkout main
git pull
git checkout -b feature/שם-תיאורי   # או work/YYYY-MM-DD או fix/תיאור-באג
```

**2. עבודה עם Claude Code (כרגיל):**
הסוכן עובד על הקבצים המקומיים כרגיל. שום דבר לא משתנה בשלב הזה.

**3. אחרי סיום עבודה (טרמינל כללי):**
```bash
git add .
git commit -m "תיאור: מה השתנה"
git push origin feature/שם-הענף
gh pr create --title "תיאור" --body "פירוט מה השתנה"
```

**4. בדיקת CI:**
GitHub מריץ `npm run build` אוטומטית. אם נכשל ❌ — לתקן ולדחוף שוב. אם עבר ✅ — ניתן למזג.

**5. מיזוג (אחרי build ירוק):**
```bash
gh pr merge --merge
git checkout main
git pull
```

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
| `gh pr merge --merge` | ממזג PR |
| `gh pr view --web` | פותח PR בדפדפן |
| `git branch -a` | רואה כל הענפים |
| `git remote prune origin` | מנקה ענפים מרוחקים שנמחקו |

---

## 📜 היסטוריית אירועים

| תאריך | אירוע | לקח |
|-------|-------|-----|
| 16/01/2026 | GitHub זיהה 19 קבצים עם מפתחות חשופים | נוסף סעיף אבטחה + firebase-config.ts משותף |
| 29/01/2026 | נמצאו 217 inline styles ב-12 קבצים | נוסף סעיף עיצוב + חוק ברזל No inline styles |
| 03/02/2026 | הוגדרו branch protection + CI + PR חובה על main | נוסף סעיף Git + תהליך עבודה עם GitHub |

---

```
══════════════════════════════════════════════════════════════════════════════
עדכון אחרון: 03/02/2026 | נוסף סעיף Git + תהליך עבודה עם GitHub + CI
══════════════════════════════════════════════════════════════════════════════
```
