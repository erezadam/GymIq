# המדריך האולטימטיבי ליצירת פרויקט עם Claude Code

> **מבוסס על 2+ חודשים של פיתוח GymIQ — 26+ אירועים, 9 Skill files, 17+ רגרסיות מתועדות, ומערכת שלמה שנבנתה מלקחים כואבים.**

---

## תוכן עניינים

1. [פילוסופיה — למה כל זה נחוץ](#1-פילוסופיה)
2. [שלב 0 — הכנה לפני שורת קוד ראשונה](#2-שלב-0--הכנה)
3. [שלב 1 — CLAUDE.md: מסמך השליטה](#3-שלב-1--claudemd)
4. [שלב 2 — מערכת ה-Skills](#4-שלב-2--מערכת-ה-skills)
5. [שלב 3 — Design System](#5-שלב-3--design-system)
6. [שלב 4 — Git, CI/CD, ו-Branch Protection](#6-שלב-4--git-cicd)
7. [שלב 5 — אבטחה](#7-שלב-5--אבטחה)
8. [שלב 6 — מערכת בדיקות](#8-שלב-6--מערכת-בדיקות)
9. [שלב 7 — תהליך עבודה יומי](#9-שלב-7--תהליך-עבודה-יומי)
10. [שלב 8 — מערכת לקחים חיים](#10-שלב-8--מערכת-לקחים-חיים)
11. [שלב 9 — תבניות מוכנות להעתקה](#11-שלב-9--תבניות)
12. [צ'קליסט מסכם](#12-צקליסט-מסכם)

---

## 1. פילוסופיה

### למה כל זה נחוץ?

Claude הוא סוכן חזק, אבל בלי מסגרת ברורה הוא:
- **שוכח לקחים** — כל שיחה מתחילה מאפס
- **מדווח "הכל עובד"** — כי build עבר, אבל לא בדק בפועל
- **מוחק קוד קריטי** — כי "ניקה" דברים שלא קשורים למשימה
- **מוסיף פיצ'רים שלא ביקשו** — over-engineering
- **מכניס סודות לקוד** — כי זה "יותר קל"
- **דוחף ישירות ל-main** — כי לא אמרו לו שאסור

### העיקרון המנחה

> **Claude לא צריך להיות חכם — הוא צריך לפעול בתוך מערכת חכמה.**

המערכת הזו בנויה מ-3 שכבות:

```
┌─────────────────────────────────────────┐
│  CLAUDE.md — חוקי ברזל (תמיד נקרא)      │  ← שכבה 1: מה אסור לעולם
├─────────────────────────────────────────┤
│  Skills — תהליכי עבודה (נקראים לפי הצורך)│  ← שכבה 2: איך לעבוד
├─────────────────────────────────────────┤
│  Lessons Learned — לקחים (נצברים לאורך   │  ← שכבה 3: מה למדנו
│  הזמן ומתעדכנים ב-CLAUDE.md ו-Skills)   │
└─────────────────────────────────────────┘
```

### מתי להוסיף חוק ברזל?

> **כלל: אם Claude עשה טעות שהמשתמש גילה — זה חוק ברזל חדש.**

לא מוסיפים חוקים "ליתר ביטחון". מוסיפים רק אחרי שכשל אמיתי קרה. ככה המערכת גדלה אורגנית ולא הופכת לבירוקרטיה.

---

## 2. שלב 0 — הכנה

### 2.1 מבנה תיקיות בסיסי

```
project-root/
├── .claude/                          ← מוח הפרויקט
│   ├── settings.json                 ← הגדרות Claude Code
│   ├── project-control-SKILL.md      ← Skill 1: שליטה
│   ├── development-flow-SKILL.md     ← Skill 2: תהליך פיתוח
│   ├── qa-testing-SKILL.md           ← Skill 3: בדיקות
│   ├── mobile-rtl-SKILL.md           ← Skill 4: מובייל/RTL (אם רלוונטי)
│   ├── firebase-data-SKILL.md        ← Skill 5: בסיס נתונים (אם רלוונטי)
│   ├── deployment-SKILL.md           ← Skill 6: פריסה
│   ├── documentation-SKILL.md        ← Skill 7: תיעוד
│   ├── daily-workflow-SKILL.md       ← Skill 8: תהליך יומי
│   └── lessons-learned/              ← תיקיית לקחים
│       └── [incident-name].md
├── .github/
│   ├── workflows/
│   │   └── ci.yml                    ← CI אוטומטי
│   └── PULL_REQUEST_TEMPLATE.md      ← תבנית PR
├── CLAUDE.md                         ← מסמך השליטה הראשי
├── CHANGELOG.md                      ← לוג שינויים
└── src/                              ← קוד המקור
```

### 2.2 סדר ההקמה

```
1. אתחול פרויקט (npm init / create-vite / etc.)
2. יצירת CLAUDE.md (מסמך שליטה)
3. יצירת .claude/ עם Skills בסיסיים
4. הגדרת Git + Branch Protection + CI
5. הגדרת Design System (אם יש UI)
6. הגדרת מערכת בדיקות
7. כתיבת PR Template
8. כתיבת daily-workflow
```

**חוק: לא כותבים שורת קוד לפני שהתשתית מוכנה.**

---

## 3. שלב 1 — CLAUDE.md: מסמך השליטה

### 3.1 מה זה CLAUDE.md?

זה הקובץ שClaude Code **תמיד קורא** בתחילת כל שיחה. זה המקום ל:
- חוקי ברזל (מה אסור לעולם)
- הוראות התחלה (מה לעשות ראשון)
- טבלת טריגרים (מתי לפתוח איזה Skill)
- היסטוריית אירועים (למה חוקים קיימים)

### 3.2 מבנה מומלץ — תבנית מלאה

```markdown
# CLAUDE.md — [שם הפרויקט] Control Center

## פעולה ראשונה בכל שיחה — בדיקת ענף (חובה!)

> **לפני כל דבר אחר**, הרץ:
> ```
> git branch --show-current
> ```
> **אם `main`:** צור ענף עבודה
> **אם ענף אחר:** המשך לעבוד

---

## חוקי ברזל

❌ **[מקור האמת] = single source of truth** - לא hardcoded
❌ **[פלטפורמת יעד]-first** - כל UI נבדק ב-[גודל מסך] תחילה
❌ **No manual testing claims** - רק בדיקות עם outputs אמיתיים
❌ **No code deletion** שלא קשור ישירות למשימה
❌ **No hardcoded secrets** - מפתחות רק דרך environment variables
❌ **No inline styles** - כל עיצוב דרך [מערכת עיצוב] בלבד
❌ **No direct push to main** - תמיד ענף + PR + CI ירוק
❌ **No deploy without tests** - בדיקות + אישור מפורש מהמשתמש

---

## טבלת טריגרים — איזה Skills לפתוח

| קטגוריית משימה | מילות מפתח | Skills |
|----------------|-------------|--------|
| **כל שינוי קוד** | code, implement, add | development-flow-SKILL.md |
| **באגים ובדיקות** | bug, fix, test, error | qa-testing-SKILL.md |
| **UI ועיצוב** | design, style, color | mobile-rtl-SKILL.md |
| **פריסה** | deploy, release | deployment-SKILL.md |
| **נתונים** | data, database | firebase-data-SKILL.md |
| **Git** | git, branch, push, pr | daily-workflow-SKILL.md |

---

## כלל ביצוע

1. **בדיקת ענף** (מיידית!)
2. **קרא project-control** תמיד ראשון
3. **לפני כל קוד - קרא development-flow**
4. **זהה טריגרים** ופתח Skills רלוונטיים
5. **בצע לפי הצ'קליסט** שבתוך ה-Skills
6. **בדוק אבטחה** לפני commit
7. **סיים עם סיכום** קצר

---

## פורמט דיווח נדרש

```
✅ נקרא project_control
✅ נקרא [שם_skill]

🎯 Goal: [מה המטרה]
🏁 Done: [איך יודעים שסיימנו]
📁 Files: [רשימת קבצים]

[ביצוע המשימה]

🔐 Security: [תקין/נמצאו בעיות]
🎨 Styling: [תקין/נמצאו בעיות]

📋 Summary:
- Changed: [מה שונה]
- Tested: [איך נבדק]
- Next: [מה נשאר]
```

---

## רמות בדיקה — בחר לפי גודל השינוי

| שינוי | Build | Spec בודד | Suite מלא |
|-------|-------|-----------|-----------|
| עיצוב/טקסט קטן | ✅ | ❌ | ❌ |
| לוגיקה/hooks/services | ✅ | ✅ | ❌ |
| לפני deploy | ✅ | ✅ | ✅ |

---

## היסטוריית אירועים

| תאריך | אירוע | לקח |
|-------|-------|-----|
| [תאריך] | [מה קרה] | [מה נוסף] |

```

### 3.3 עקרונות מפתח ב-CLAUDE.md

| עיקרון | הסבר | דוגמה מ-GymIQ |
|--------|------|---------------|
| **חוקים נולדים מכשלים** | לא מוסיפים חוק "ליתר ביטחון" | חוק "No inline styles" נוסף אחרי שנמצאו 217 הפרות |
| **הפעולה הראשונה ברורה** | Claude יודע בדיוק מה לעשות קודם | בדיקת ענף → יצירת ענף עבודה |
| **טריגרים אוטומטיים** | מילות מפתח מפעילות Skills | "bug" → qa-testing-SKILL.md |
| **פורמט דיווח קבוע** | כל תשובה באותו מבנה | Goal → Done → Files → Summary |
| **היסטוריה חיה** | כל כשל מתועד עם תאריך | 26+ אירועים מתועדים |

---

## 4. שלב 2 — מערכת ה-Skills

### 4.1 מה זה Skill?

Skill הוא מסמך `.md` בתיקיית `.claude/` שמכיל:
- **מתי להפעיל** — באילו מצבים
- **צ'קליסט** — מה לעשות צעד אחרי צעד
- **פקודות בדיקה** — grep/build/test
- **דברים אסורים** — מה לא לעשות
- **קישורים ל-Skills אחרים** — מתי לעבור

### 4.2 מבנה Skill מומלץ

```markdown
---
name: [project]-[area]
description: "תיאור קצר. Use when [מתי להפעיל]."
---

# [שם ה-Skill]

**מתי להפעיל:** [תיאור]

## תהליך

### שלב 1: [שם]
```
□ צעד 1
□ צעד 2
```

### שלב 2: [שם]
...

## פקודות בדיקה
```bash
# בדיקה 1
command here
```

## דברים אסורים
❌ ...

## קישורים
| אחרי שלב | עבור ל-Skill |
|----------|--------------|
| ... | ... |
```

### 4.3 ה-Skills שכל פרויקט צריך (8 Skills בסיסיים)

#### Skill 1: `project-control-SKILL.md` — שליטה בפרויקט

**תפקיד:** נקודת כניסה ראשונה. מוודא שClaude קורא CLAUDE.md, מכיר את הארכיטקטורה, ויודע מה הקבצים הקריטיים.

**מה לשים בו:**
```markdown
# Project Control

## Critical First Step
ALWAYS start by reading CLAUDE.md and declaring:
✅ קראתי את CLAUDE.md
משימה: [description]
קבצים שישתנו: [list]
קבצים תלויים: [list]

## Key Project Rules
### [Platform]-First
- [רשימת כללים]

### Regression Prevention
- [פקודות grep לבדיקת רגרסיות]

## Architecture Notes
- [מנהל state]
- [בסיס נתונים]
- [מערכת עיצוב]
- [מבנה תיקיות]

## קבצים עיקריים
| קובץ | מיקום | תפקיד |
|------|-------|-------|
| ... | ... | ... |

## זרימות נתונים קריטיות
[תרשים זרימה של נתונים שחשוב לשמור עליהם]
```

**למה חשוב:** ב-GymIQ, בלי מיפוי של זרימת נתונים (exercise → workout → history), Claude שבר דברים כי לא ידע שיש 6 מקומות שקוראים ל-addExercise.

---

#### Skill 2: `development-flow-SKILL.md` — תהליך לפני כל שינוי

**תפקיד:** מונע את הטעות הכי נפוצה — לקפוץ ישר לקוד בלי להבין מה ישבר.

**מה לשים בו:**
```markdown
# Development Flow

## תהליך חובה לפני כל שינוי

### שלב 1: הבנת המצב הקיים
- מיפוי תלויות (grep -r "FunctionName" src/)
- הבנת הזרימה (מאיפה → לאן)
- בדיקת אזורים רגישים

### שלב 2: ניתוח השפעות
- מה יכול להישבר?
- רשימת בדיקות שאעשה אחרי

### שלב 3: תכנון השינוי
- מה בדיוק אני משנה
- מה אני לא משנה (גבולות!)

### שלב 4: קוד + בדיקה מיידית
- שינוי קטן אחד בכל פעם
- build אחרי כל שינוי

### שלב 5: Self-Review לפני Commit
- בדיקת רגרסיות (grep)
- בדיקת אבטחה
- checklist סופי

## חקירת באגים — תהליך מובנה
[הכלל הכי חשוב: "נתונים לא נשמרים" = בדוק תצוגה קודם!]
```

**הלקח שהוליד את ה-Skill הזה:** Claude השקיע 2 sessions בחקירת "אימון לא נשמר". הבעיה הייתה שהקומפוננטה פשוט **סיננה** את הנתונים מהתצוגה. הנתונים נשמרו מושלם.

---

#### Skill 3: `qa-testing-SKILL.md` — בדיקות ורגרסיות

**תפקיד:** זיכרון ארוך טווח. כאן נשמרות כל הרגרסיות ההיסטוריות עם פקודות בדיקה.

**מה לשים בו:**
```markdown
# QA Testing

## Critical Testing Flow
1. [Platform] נטען ללא שגיאות
2. Flow ראשי עובד מתחילה לסוף
3. נתונים נשמרים ומוצגים נכון
4. [Platform] responsive

## Historical Regressions Monitor
| תאריך | בעיה | בדיקה |
|-------|------|-------|
| [DD/MM] | [תיאור] | [פקודת grep] |

## רכיבים שאסור למחוק
[רשימת קומפוננטות/פונקציות שנמחקו בטעות בעבר]

## Anti-Destruction Protocol
[בדיקות survival לפני deploy]

## Full User Journey Test
1. [צעד 1]
2. [צעד 2]
...
```

**למה הכי חשוב:** זה ה-Skill שמונע רגרסיות חוזרות. ב-GymIQ יש 17+ רגרסיות מתועדות, כל אחת עם פקודת grep שבודקת שהתיקון עדיין קיים.

---

#### Skill 4: `development-standards-SKILL.md` — סטנדרטים (מובייל/RTL/עיצוב)

**תפקיד:** כללי UI ספציפיים לפרויקט.

**מה לשים בו:**
```markdown
# Development Standards

## [כלל עיצוב ראשי]
❌ מה אסור (עם דוגמאות קוד)
✅ מה חובה (עם דוגמאות קוד)

## טבלת המרה מהירה
| אסור | מותר |
|------|------|
| ... | ... |

## בדיקה לפני commit
```bash
grep -r "BAD_PATTERN" src/ | wc -l
```

## צבעים/tokens מאושרים
[רשימת ערכים תקינים]
```

**דוגמה מ-GymIQ:** האיסור על inline styles (`style={{}}`) נולד אחרי שנמצאו 217 הפרות. הטבלת ההמרה (inline → Tailwind) חוסכת זמן כל פעם מחדש.

---

#### Skill 5: `data-SKILL.md` — ניהול נתונים

**תפקיד:** כללים לעבודה עם בסיס הנתונים.

**מה לשים בו:**
```markdown
# Data Management

## אזהרת אבטחה
[איך לגשת לנתונים בצורה מאובטחת]

## Collection/Table חדש — צ'קליסט חובה!
1. ✅ עדכון הרשאות/rules
2. ✅ deploy של ההרשאות
3. ✅ בדיקת כתיבה בפועל
4. ✅ בדיקת קריאה בפועל
5. ✅ אישור שהנתון קיים

## סכמת נתונים
| Collection/Table | תפקיד | שדות מפתח |
|-----------------|-------|-----------|
| ... | ... | ... |

## זרימת נתונים קריטית
[תרשים: מאיפה הנתונים מגיעים ולאן הולכים]

## save/restore points
[רשימת כל המקומות שנתונים נשמרים ונקראים]

## Local Storage / Cache
| מפתח | סוג | תפקיד |
|------|-----|-------|
| ... | ... | ... |
```

**הלקח שהוליד את הצ'קליסט:** Claude יצר subcollection חדש, דיווח "הכל עובד", אבל לא בדק שהנתונים באמת נכתבים. Build עבר, אבל Firestore דחה את הכתיבה בגלל הרשאות חסרות.

---

#### Skill 6: `deployment-SKILL.md` — פריסה

**מה לשים בו:**
```markdown
# Deployment

## Pre-Deployment Checklist
□ build passes
□ lint passes
□ tests pass
□ [platform]-specific checks

## רמות בדיקה לפי גודל שינוי
| שינוי | Build | Test בודד | Suite מלא |
|-------|-------|-----------|-----------|
| UI קטן | ✅ | ❌ | ❌ |
| לוגיקה | ✅ | ✅ | ❌ |
| לפני deploy | ✅ | ✅ | ✅ |

## Version Management
[semantic versioning rules]

## Deployment Procedure
[צעד אחרי צעד]

## Rollback Procedure
[מה לעשות אם נשבר]

## Post-Deployment Verification
[בדיקות אחרי deploy]
```

**הלקח:** ב-GymIQ בוצעו פריסות בלי טסטים, רגרסיות הגיעו לפרודקשן. נוספה מערכת 3 רמות בדיקה כדי לא לבזבז 30 דקות על Suite מלא כשמשנים שורה אחת.

---

#### Skill 7: `documentation-SKILL.md` — תיעוד

**מה לשים בו:**
```markdown
# Documentation

## אחרי כל פיצ'ר
□ CHANGELOG.md
□ qa-testing-SKILL.md (אם יש בדיקות חדשות)
□ architecture notes (אם השתנה מבנה)

## CHANGELOG Format
## [X.X.X] - YYYY-MM-DD
### Added / Fixed / Changed

## מתי לעדכן כל מסמך
[טבלת טריגרים]
```

---

#### Skill 8: `daily-workflow-SKILL.md` — תהליך יומי

**מה לשים בו:**
```markdown
# Daily Workflow

## תחילת יום
1. בדיקת ענף
2. יצירת ענף עבודה אם צריך
3. דיווח למשתמש

## סגירת יום
1. עדכון מסמכים
2. build
3. commit & push
4. PR
5. CI
6. merge (אם ירוק)
7. cleanup
8. deploy (אם רלוונטי)
9. דיווח סיום

## חוקי ברזל
❌ לא לדחוף ישירות ל-main
❌ לא למזג אם CI נכשל
✅ תמיד ענף עבודה
✅ תמיד PR
```

### 4.4 איך Skills מתחברים ביניהם

```
תחילת עבודה
    │
    ▼
project-control ──────────── "קראתי CLAUDE.md, מכיר את הפרויקט"
    │
    ▼
development-flow ─────────── "מיפיתי תלויות, הבנתי מה ישבר"
    │
    ├── data-SKILL ────────── "עובד עם DB, צ'קליסט collection"
    ├── standards-SKILL ───── "כללי UI, RTL, mobile"
    │
    ▼
[כתיבת קוד]
    │
    ▼
qa-testing ───────────────── "בדיקות, רגרסיות, survival check"
    │
    ▼
documentation ────────────── "CHANGELOG, עדכון מסמכים"
    │
    ▼
deployment ───────────────── "build → test → deploy → verify"
    │
    ▼
daily-workflow ───────────── "commit → PR → CI → merge → cleanup"
```

### 4.5 מתי ליצור Skill חדש?

| מצב | פעולה |
|-----|-------|
| אזור חדש שחוזר על עצמו (AI integration, payments, etc.) | צור Skill ייעודי |
| חוק בודד שחוזר | הוסף ל-Skill קיים |
| כשל ששייך לתחום קיים | עדכן Skill קיים |
| כשל שלא שייך לשום Skill | או צור חדש, או הוסף ל-CLAUDE.md |

---

## 5. שלב 3 — Design System

### 5.1 למה חשוב?

בלי Design System:
- Claude ממציא צבעים כל פעם
- inline styles מתרבים (ב-GymIQ היו 217!)
- אי עקביות ויזואלית
- קושי בתחזוקה

### 5.2 מה להגדיר

```javascript
// design-tokens.js (או tailwind-tokens.js)
module.exports = {
  colors: {
    // Background
    background: {
      main: '#0B0D12',
      card: '#141820',
      elevated: '#1A1F2A',
      input: '#0D0F14',
    },

    // Primary
    primary: {
      main: '#00D4AA',
      light: '#00E5B8',
      dark: '#00B894',
    },

    // Text
    text: {
      primary: '#FFFFFF',
      secondary: '#8B95A5',
      muted: '#5A6478',
      disabled: '#3D4555',
    },

    // Status
    status: {
      success: '#10B981',
      warning: '#FFB020',
      error: '#EF4444',
      info: '#3B82F6',
    },
  },

  spacing: {
    xs: '4px', sm: '8px', md: '12px',
    lg: '16px', xl: '20px', '2xl': '24px',
  },

  borderRadius: {
    sm: '8px', md: '12px', lg: '16px', full: '9999px',
  },

  typography: {
    fontFamily: {
      primary: "'Heebo', 'Inter', sans-serif",
    },
    fontSize: {
      xs: '11px', sm: '13px', base: '15px',
      lg: '17px', xl: '20px', '2xl': '24px',
    },
  },
};
```

### 5.3 חוק הברזל של עיצוב

```
❌ אסור: style={{ color: '#A855F7', padding: '12px' }}
✅ חובה: className="text-purple-500 p-3"

❌ אסור: צבע שלא מוגדר ב-tokens
✅ חובה: אם צריך צבע חדש — להוסיף ל-tokens

❌ אסור: spacing כמספרים ישירים
✅ חובה: spacing דרך מערכת ה-tokens
```

### 5.4 בדיקה אוטומטית

```bash
# הוסף לפקודות pre-commit:
grep -r "style={{" src/ --include="*.tsx" | wc -l
# אם > 0 ולא חריג מאושר — לא לעשות commit!
```

---

## 6. שלב 4 — Git, CI/CD, ו-Branch Protection

### 6.1 Branch Protection

הגדר ב-GitHub Settings → Branches → Branch protection rules:

```
Branch: main
✅ Require pull request before merging
✅ Require status checks to pass before merging
  ✅ check (from CI workflow)
❌ Allow force pushes
❌ Allow deletions
```

### 6.2 CI Workflow

```yaml
# .github/workflows/ci.yml
name: Project CI

on:
  pull_request:
    branches: [main]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      # הוסף בדיקות נוספות לפי הצורך:
      # - run: npm run lint
      # - run: npm run test
```

### 6.3 PR Template

```markdown
<!-- .github/PULL_REQUEST_TEMPLATE.md -->

## מה השתנה


## איך בדקתי


## מה עלול להישבר (סיכון לרגרסיה)


## איך עושים rollback

```

### 6.4 מוסכמות שמות ענפים

| סוג | תבנית | דוגמה |
|-----|--------|-------|
| פיצ'ר | `feature/[שם]` | `feature/user-auth` |
| תיקון | `fix/[שם]` | `fix/login-crash` |
| עבודה יומית | `work/[תאריך]` | `work/2026-02-24` |
| תשתית | `setup/[שם]` | `setup/ci-pipeline` |

### 6.5 החוקים

```
❌ לא לדחוף ישירות ל-main
❌ לא לעבוד על main מקומית
❌ לא למזג PR עם CI אדום
❌ לא force push

✅ כל שינוי = ענף נפרד
✅ כל ענף = PR
✅ כל PR = CI ירוק
✅ כל merge = cleanup ענף
```

---

## 7. שלב 5 — אבטחה

### 7.1 מפתחות וסודות

```
❌ אסור: לכתוב מפתחות API בקוד
❌ אסור: להעתיק ערכים מ-.env לקבצים
❌ אסור: commit לקבצים עם סודות
❌ אסור: console.log של סודות

✅ חובה: environment variables
✅ חובה: .env ב-.gitignore
✅ חובה: config file משותף לסקריפטים
```

### 7.2 בדיקת אבטחה לפני commit

```bash
# חפש מפתחות חשופים (התאם לפרויקט שלך):
grep -r "AIza\|sk-\|AKIA\|ghp_\|password\s*=" \
  --include="*.ts" --include="*.js" --include="*.tsx" . \
  | grep -v node_modules | grep -v .env.example

# אם יש תוצאות — לא לעשות commit!
```

### 7.3 .gitignore מומלץ

```gitignore
# Environment
.env
.env.local
.env.production

# Dependencies
node_modules/

# Build
dist/
build/

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db

# Firebase
.firebase/
*-debug.log

# Test results
test-results/
playwright-report/
```

### 7.4 Pre-commit Hook (אופציונלי)

```bash
#!/bin/sh
# .git/hooks/pre-commit

# בדוק סודות
if grep -r "AIza\|sk-\|AKIA" --include="*.ts" --include="*.js" . | grep -v node_modules; then
  echo "❌ נמצאו מפתחות בקוד! לא ניתן לעשות commit."
  exit 1
fi

echo "✅ בדיקת אבטחה עברה"
```

---

## 8. שלב 6 — מערכת בדיקות

### 8.1 פילוסופיית הבדיקות

> **"build עובר" לא אומר שהפיצ'ר עובד.**

זה הלקח הכי כואב מ-GymIQ. Build בודק רק שהקוד מתקמפל. הוא לא בודק:
- שהנתונים באמת נשמרים
- שההרשאות מאפשרות גישה
- שהתצוגה מציגה את הנתונים
- שהזרימה עובדת מתחילה לסוף

### 8.2 מערכת 3 רמות

```
🟢 רמה 1 — שינוי קטן (UI בלבד, עד 3 קבצים)
   → npm run build
   → grep ידני על הקובץ שנגע

🟡 רמה 2 — שינוי משמעותי (לוגיקה, hooks, services)
   → npm run build
   → npx playwright test [spec רלוונטי]
   → דיווח תוצאות

🔴 רמה 3 — לפני deploy
   → npm run build
   → npx playwright test (suite מלא)
   → אישור מפורש מהמשתמש
```

### 8.3 מיפוי קבצים → specs

צור טבלה כזו לפרויקט שלך:

```markdown
| קובץ שנגע | Spec להריץ |
|-----------|-----------|
| auth.ts, LoginPage | auth.spec.ts |
| WorkoutSession | workout-flow.spec.ts |
| WorkoutHistory | workout-history.spec.ts |
| TrainerDashboard | trainer-dashboard.spec.ts |
```

### 8.4 Playwright Config מומלץ

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60000,
  retries: process.env.CI ? 2 : 1,
  workers: 1,  // אם יש rate limiting

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile',
      use: { ...devices['iPhone 13'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    timeout: 120000,
    reuseExistingServer: !process.env.CI,
  },
});
```

### 8.5 בדיקות רגרסיה מהירות (grep)

```bash
# צור script שבודק שרכיבים קריטיים קיימים:
echo "=== Regression Check ===" && \
grep -r "CriticalComponent1" src/ | wc -l && \
grep -r "criticalFunction1" src/ | wc -l && \
grep -r "importantDataField" src/ | wc -l && \
echo "All counts should be > 0"
```

### 8.6 ההגדרה הנכונה של "בדיקה עוברת"

| מה | זה אומר | זה לא אומר |
|----|---------|------------|
| Build עובר | קוד מתקמפל | שהפיצ'ר עובד |
| Test עובר | תרחיש ספציפי עובד | שאין באגים אחרים |
| Lint עובר | אין שגיאות סגנון | שהקוד הגיוני |
| **בדיקה אמיתית** | **נתון נכתב + נקרא + מוצג** | — |

---

## 9. שלב 7 — תהליך עבודה יומי

### 9.1 תחילת יום

```
Claude מקבל "בוקר טוב" / שיחה חדשה מתחילה
    │
    ▼
git branch --show-current
    │
    ├── main → git pull && git checkout -b work/YYYY-MM-DD
    │         → דיווח: "✅ נוצר ענף עבודה: work/YYYY-MM-DD"
    │
    └── work/... → git status
                  → אם שינויים: "⚠️ יש שינויים לא שמורים"
                  → אם נקי: "✅ ממשיכים על ענף [שם]"
```

### 9.2 במהלך היום

```
1. קבלת משימה
2. קריאת CLAUDE.md (אוטומטי)
3. קריאת project-control-SKILL.md
4. קריאת development-flow-SKILL.md
5. זיהוי טריגרים → פתיחת Skills רלוונטיים
6. מיפוי תלויות
7. תכנון השינוי
8. כתיבת קוד (שינוי קטן → בדיקה → שינוי הבא)
9. self-review
10. commit
11. דיווח סיכום
```

### 9.3 סגירת יום

```
המשתמש אומר "סגור יום"
    │
    ▼
שלב 1: עדכון מסמכים (CHANGELOG, architecture)
    │
    ▼
שלב 2: npm run build (אם נכשל → עצור!)
    │
    ▼
שלב 3: git add + commit + push
    │
    ▼
שלב 4: gh pr create
    │
    ▼
שלב 5: gh pr checks (חכה ל-CI)
    │
    ├── CI אדום → דווח למשתמש, שאל אם לתקן
    │
    └── CI ירוק →
        │
        ▼
שלב 6: gh pr merge --merge
    │
    ▼
שלב 7: git checkout main && git pull && git branch -d [ענף]
    │
    ▼
שלב 8: deploy (אם רלוונטי, עם אישור משתמש)
    │
    ▼
שלב 9: דיווח סיום
```

---

## 10. שלב 8 — מערכת לקחים חיים

### 10.1 תיקיית lessons-learned

```
.claude/lessons-learned/
├── [תאריך]-[שם-האירוע].md
├── [תאריך]-[שם-האירוע].md
└── ...
```

### 10.2 תבנית לקח

```markdown
# [שם הכשל]

## תאריך
DD/MM/YYYY

## מה קרה
[תיאור עובדתי]

## מה דיווח Claude
[מה Claude אמר שהוא בדק]

## מה קרה בפועל
[מה באמת קרה]

## שורש הבעיה
[למה זה קרה]

## מה תוקן
[שינויים שבוצעו]

## איזה חוקים/Skills עודכנו
[רשימת עדכונים למערכת]
```

### 10.3 זרימת לקח

```
כשל מתגלה
    │
    ▼
תחקיר (מה קרה ולמה)
    │
    ▼
תיקון מיידי
    │
    ▼
                ┌── CLAUDE.md (חוק ברזל חדש)
עדכון מערכת ──├── Skill רלוונטי (צעד חדש בצ'קליסט)
                ├── qa-testing-SKILL.md (רגרסיה חדשה בטבלה)
                └── lessons-learned/ (מסמך מלא)
    │
    ▼
הוספה לטבלת היסטוריה ב-CLAUDE.md
```

### 10.4 דוגמאות מ-GymIQ

| אירוע | לקח | מה עודכן |
|-------|-----|---------|
| 19 קבצים עם מפתחות חשופים | נוצר firebase-config.ts משותף | CLAUDE.md + firebase-data-SKILL.md |
| 217 inline styles | נוסף חוק "No inline styles" | CLAUDE.md + mobile-rtl-SKILL.md |
| PR ישירות ל-main | נוסף Branch Protection + CI | CLAUDE.md + daily-workflow-SKILL.md |
| Deploy בלי טסטים | נוספה מערכת 3 רמות בדיקה | CLAUDE.md + deployment-SKILL.md |
| Subcollection בלי הרשאות | נוסף צ'קליסט collection חדש | CLAUDE.md + firebase-data-SKILL.md |
| "נתון לא נשמר" = בעיית תצוגה | נוסף כלל "בדוק תצוגה קודם" | development-flow-SKILL.md |
| Modal בלי כפתור סגירה | נוסף חוק modal | CLAUDE.md |
| AI מסנן תוצאות בשקט | נוסף חוק "No silent filtering" | CLAUDE.md |

---

## 11. שלב 9 — תבניות מוכנות להעתקה

### 11.1 CLAUDE.md מינימלי (להתחלה)

<details>
<summary>לחץ להרחבה</summary>

```markdown
# CLAUDE.md — [PROJECT_NAME] Control Center

## פעולה ראשונה בכל שיחה — בדיקת ענף (חובה!)

> **לפני כל דבר אחר**, הרץ:
> ```
> git branch --show-current
> ```
> **אם `main`:** `git pull origin main && git checkout -b work/$(date +%Y-%m-%d)`
> **אם ענף עבודה:** המשך

---

## חוקי ברזל

❌ **No hardcoded secrets** - מפתחות רק דרך environment variables
❌ **No code deletion** שלא קשור ישירות למשימה
❌ **No direct push to main** - תמיד ענף + PR + CI ירוק
❌ **No deploy without tests** - בדיקות + אישור מהמשתמש
❌ **No manual testing claims** - רק בדיקות עם outputs אמיתיים

---

## חובה לפני כל שינוי קוד

1. קרא `.claude/project-control-SKILL.md`
2. קרא `.claude/development-flow-SKILL.md`
3. מפה תלויות (grep)
4. הגדר גבולות (מה משנים / מה לא)

---

## פורמט דיווח

```
🎯 Goal: [מה המטרה]
🏁 Done: [איך יודעים שסיימנו]
📁 Files: [רשימת קבצים]

📋 Summary:
- Changed: [מה שונה]
- Tested: [איך נבדק]
- Next: [מה נשאר]
```

---

## היסטוריית אירועים

| תאריך | אירוע | לקח |
|-------|-------|-----|
| | | |
```

</details>

### 11.2 project-control-SKILL.md מינימלי

<details>
<summary>לחץ להרחבה</summary>

```markdown
---
name: [project]-project-control
description: "Project control and governance. Use at the start of every session."
---

# Project Control

## Critical First Step
ALWAYS start by reading CLAUDE.md.

## Architecture
- Framework: [React/Vue/etc.]
- State: [Zustand/Redux/etc.]
- DB: [Firebase/Postgres/etc.]
- Styling: [Tailwind/CSS Modules/etc.]

## Key Files
| File | Role |
|------|------|
| [path] | [description] |

## Before ANY changes:
1. Map dependencies: grep -r "Name" src/
2. Define boundaries: what I change vs what I don't
3. Run: npm run build
```

</details>

### 11.3 development-flow-SKILL.md מינימלי

<details>
<summary>לחץ להרחבה</summary>

```markdown
---
name: [project]-development-flow
description: "Mandatory workflow before coding. Use BEFORE writing any code."
---

# Development Flow

## Before every change:

### 1. Map dependencies
```bash
grep -r "FunctionName" src/
```

### 2. What can break?
List:
- ...

### 3. Plan the change
- What I change: ___
- What I don't touch: ___

### 4. Code + test immediately
- Small changes, one at a time
- Build after each change

### 5. Self-review before commit
```bash
npm run build
grep -r "CRITICAL_PATTERN" src/ | wc -l  # should be > 0
```
```

</details>

### 11.4 qa-testing-SKILL.md מינימלי

<details>
<summary>לחץ להרחבה</summary>

```markdown
---
name: [project]-qa-testing
description: "Testing protocols and regression tracking. Use after code changes."
---

# QA Testing

## Critical Testing Flow
1. □ App loads without errors
2. □ Main flow works end-to-end
3. □ Data saves and displays correctly
4. □ [Platform] responsive

## Historical Regressions
| Date | Issue | Check |
|------|-------|-------|
| | | |

## Components that must NOT be deleted
- [list critical components]

## Quick regression check
```bash
echo "=== Regression Check ===" && \
grep -r "CriticalComponent" src/ | wc -l && \
echo "All counts should be > 0"
```
```

</details>

### 11.5 daily-workflow-SKILL.md מינימלי

<details>
<summary>לחץ להרחבה</summary>

```markdown
# Daily Workflow

## Start of day
```bash
git branch --show-current
# If main: git pull && git checkout -b work/$(date +%Y-%m-%d)
```

## End of day ("סגור יום")
1. npm run build
2. git add . && git commit -m "[description]"
3. git push origin [branch]
4. gh pr create
5. gh pr checks [PR#]
6. gh pr merge [PR#] --merge (if green)
7. git checkout main && git pull && git branch -d [branch]

## Rules
❌ No push to main
❌ No merge if CI fails
✅ Always work on feature branch
```

</details>

### 11.6 CI Workflow

<details>
<summary>לחץ להרחבה</summary>

```yaml
# .github/workflows/ci.yml
name: CI

on:
  pull_request:
    branches: [main]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
```

</details>

### 11.7 PR Template

<details>
<summary>לחץ להרחבה</summary>

```markdown
<!-- .github/PULL_REQUEST_TEMPLATE.md -->
## מה השתנה


## איך בדקתי


## מה עלול להישבר


## איך עושים rollback

```

</details>

---

## 12. צ'קליסט מסכם

### הקמת פרויקט חדש — צעד אחרי צעד

```
שלב 0: יסודות
□ אתחול פרויקט (npm init / create-vite / etc.)
□ git init + .gitignore
□ הגדרת .env + .env.example
□ התקנת dependencies

שלב 1: CLAUDE.md
□ יצירת CLAUDE.md בשורש הפרויקט
□ הגדרת בדיקת ענף כפעולה ראשונה
□ הגדרת חוקי ברזל ראשוניים
□ הגדרת טבלת טריגרים
□ הגדרת פורמט דיווח

שלב 2: Skills
□ יצירת תיקיית .claude/
□ project-control-SKILL.md
□ development-flow-SKILL.md
□ qa-testing-SKILL.md
□ deployment-SKILL.md
□ daily-workflow-SKILL.md
□ documentation-SKILL.md
□ [standards-SKILL.md — אם יש UI]
□ [data-SKILL.md — אם יש DB]

שלב 3: Design System (אם יש UI)
□ יצירת design-tokens.js
□ הגדרת צבעים, spacing, typography
□ הוספת חוק "No inline styles" ל-CLAUDE.md
□ הוספת בדיקת grep ל-pre-commit

שלב 4: Git + CI
□ יצירת repo ב-GitHub
□ Branch Protection על main
□ יצירת .github/workflows/ci.yml
□ יצירת .github/PULL_REQUEST_TEMPLATE.md
□ הוספת חוק "No direct push to main" ל-CLAUDE.md

שלב 5: אבטחה
□ .env ב-.gitignore
□ בדיקת מפתחות כחלק מ-pre-commit
□ הוספת חוק אבטחה ל-CLAUDE.md

שלב 6: בדיקות
□ התקנת Playwright / Jest / Vitest
□ הגדרת מערכת 3 רמות
□ יצירת טבלת "קובץ → spec"
□ הוספת חוק "No deploy without tests" ל-CLAUDE.md

שלב 7: lessons-learned
□ יצירת תיקיית .claude/lessons-learned/
□ הגדרת תבנית לקח

שלב 8: בדיקה שהכל עובד
□ יצירת ענף עבודה → שינוי קטן → commit → push → PR → CI → merge
□ Claude קורא CLAUDE.md ומדווח נכון
□ Claude מזהה טריגרים ופותח Skills
□ Claude מדווח בפורמט הנדרש
```

---

## נספח: טיפים מתקדמים

### א. איך לאמן את Claude על הפרויקט שלך

1. **שבוע ראשון:** CLAUDE.md מינימלי + 3 Skills בסיסיים
2. **כל כשל:** מוסיפים חוק/צעד ל-CLAUDE.md או Skill
3. **אחרי שבועיים:** בודקים מה חוזר, מוסיפים Skills ייעודיים
4. **אחרי חודש:** המערכת מכסה את רוב המקרים

### ב. מתי להוסיף vs. מתי לקצר

- **להוסיף:** כל כשל חדש שהמשתמש גילה (לא Claude)
- **לקצר:** כשחוק כבר לא רלוונטי (טכנולוגיה השתנתה)
- **לאחד:** כשיש כפילויות בין Skills

### ג. CLAUDE.md לא צריך להיות ארוך מ-200 שורות בהתחלה

התחל קטן, הוסף בהדרגה. CLAUDE.md של GymIQ הוא ~300 שורות אחרי 2+ חודשים — כל שורה נולדה מכשל אמיתי.

### ד. ה-Skills הם ה-"זיכרון ארוך טווח" של Claude

Claude שוכח הכל בין שיחות. ה-Skills הם הדרך היחידה להעביר ידע בין sessions. כל פעם ש-Claude לומד משהו חשוב — זה צריך להיכנס ל-Skill.

### ה. המפתח: פורמט דיווח קבוע

כשClaude מדווח באותו פורמט כל פעם, קל לזהות חוסרים:
- אין "Tested"? → לא נבדק
- אין "Security"? → לא נבדקה אבטחה
- אין "Files"? → לא ברור מה השתנה

---

## סיכום

> **פרויקט טוב עם Claude = מערכת חכמה, לא סוכן חכם.**

המערכת הזו בנויה מ:
1. **CLAUDE.md** — חוקי ברזל שנולדו מכשלים
2. **8 Skills** — תהליכי עבודה שמכסים כל תחום
3. **Lessons Learned** — זיכרון שגדל עם הזמן
4. **Git + CI** — רשת ביטחון אוטומטית
5. **Design System** — עקביות ויזואלית
6. **3 רמות בדיקה** — לא לבזבז, לא לפספס
7. **תהליך יומי** — התחלה וסיום ברורים

**הכל מתחיל מ-CLAUDE.md. הכל גדל מלקחים. הכל מתועד.**

---

```
══════════════════════════════════════════════════════════════════════════════
מדריך זה נוצר על סמך 2+ חודשי פיתוח GymIQ
26+ אירועים מתועדים | 9 Skill files | 17+ רגרסיות מתועדות
נוצר: 24/02/2026
══════════════════════════════════════════════════════════════════════════════
```
