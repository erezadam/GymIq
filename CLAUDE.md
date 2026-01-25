# CLAUDE.md – GymIQ Control Center

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║   🚨 התחלה קבועה לכל משימה                                                    ║
║                                                                              ║
║   1. קרא CLAUDE.md הזה (נעשה אוטומטית)                                        ║
║   2. קרא project-control: `.claude/project-control-SKILL.md`         ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

## חוקי ברזל קצרים

❌ **Firebase = single source of truth** - לא hardcoded arrays  
❌ **Mobile-first always** - כל UI נבדק ב-375px תחילה  
❌ **No manual testing claims** - רק בדיקות עם outputs אמיתיים  
❌ **No code deletion** שלא קשור ישירות למשימה  
❌ **No hardcoded secrets** - מפתחות רק דרך environment variables  

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
| **ביצועים** | לא מוסיפים טעינות כבדות בלי הצדקה | יש Performance notes | `.claude/project-control-SKILL.md` |
| **🔐 אבטחה סודות** | לא מכניסים מפתחות לקוד - בסקריפטים להשתמש ב-`scripts/firebase-config.ts` | יש Security check + בדיקת grep | ראה סעיף אבטחה למעלה |
| **Firebase** | כל שינוי נתונים כולל בדיקת rules ו-migrations במידת הצורך | יש Data change notes | `.claude/firebase-data-SKILL.md` |
| **פריסה** | לפני פריסה מוודאים env נכון build נקי ו-rollback plan | יש Deploy checklist | `.claude/deployment-SKILL.md` |
| **סיום** | מסיימים בסיכום מה שונה איך נבדק ומה נשאר פתוח | יש Summary + Next | `.claude/project-control-SKILL.md` |

---

## טבלת טריגרים - איזה Skills לפתוח

| קטגוריית משימה | מילות מפתח | Skills לפתוח |
|----------------|-------------|-------------|
| **באגים ובדיקות** | bug, fix, regression, test, failing, error, crash, broken, debug | `.claude/qa-testing-SKILL.md` |
| **עברית ומובייל** | hebrew, rtl, ios, mobile, layout, responsive, iphone, android, touch | `.claude/mobile-rtl-SKILL.md` |
| **פריסה ותשתיות** | deploy, release, ci, env, firebase, hosting, production, build | `.claude/deployment-SKILL.md` |
| **רפקטור וארכיטקטורה** | refactor, architecture, structure, cleanup, organize, rename, move | `.claude/project-control-SKILL.md` |
| **UI ועיצוב** | design, style, color, theme, css, tailwind, component, visual | `.claude/mobile-rtl-SKILL.md` |
| **נתונים ו-Firebase** | data, database, firestore, collection, document, query, auth | `.claude/firebase-data-SKILL.md` |
| **ביצועים ואופטימיזציה** | performance, optimize, slow, fast, cache, memory, bundle | `.claude/project-control-SKILL.md` |
| **תכנון ותיעוד** | plan, design, document, spec, requirements, architecture | `.claude/documentation-SKILL.md` |
| **סקריפטים ו-Firebase** | script, migration, import, export, firebase-admin | ראה סעיף אבטחה + `.claude/firebase-data-SKILL.md` |

---

## כלל ביצוע

1. **קרא project_control** תמיד ראשון
2. **זהה טריגרים** במשימה ופתח Skills רלוונטיים
3. **בצע לפי הצ'קליסט** שבתוך ה-Skills
4. **בדוק אבטחה** - אם יצרת/שינית קבצים, הרץ בדיקת סודות
5. **סיים עם סיכום** קצר + מה נבדק

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

📋 Summary:
- Changed: [מה שונה]
- Tested: [איך נבדק]
- Next: [מה נשאר לעשות]
```

---

## 📜 היסטוריית אירועי אבטחה

| תאריך | אירוע | לקח |
|-------|-------|-----|
| 16/01/2026 | GitHub זיהה 19 קבצים עם מפתחות חשופים | נוסף סעיף אבטחה + firebase-config.ts משותף |

---

```
══════════════════════════════════════════════════════════════════════════════
עדכון אחרון: 25/01/2026 | נוסף תיעוד קטגוריות תרגילים (category vs primaryMuscle)
══════════════════════════════════════════════════════════════════════════════
```
