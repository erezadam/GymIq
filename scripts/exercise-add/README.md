# exercise-add — כתיבת תרגיל ל-Firestore מסקריפט

הדרך היחידה שסוכן כותב תרגיל. עובר את אותה ולידציה של טופס האדמין
(`exerciseSchema` + `toExercisePayload` מ-`src/domains/exercises/validation/`).

## שימוש

```bash
npm run exercise:write -- --input scripts/exercise-add/example.json          # dry-run
npm run exercise:write -- --input my-exercise.json --write                   # כתיבה בפועל
```

## דגלים

| דגל | משמעות |
|-----|--------|
| `--input <path>` | חובה. קובץ JSON של התרגיל |
| `--write` | בלעדיו — dry-run: הכל מאומת, כלום לא נכתב |
| `--dedupe-only` | סכמה + בדיקת כפילות בלבד (0 = אין, 3 = קיים); בלי קטלוגים/תמונה/payload |
| `--skip-image-check` | מדלג על HEAD ל-imageUrl. לבדיקות בלבד (מודפסת אזהרה) |

## חוזה הקלט

כמו שדות הטופס, אבל `instructions` / `instructionsHe` / `tips` / `tipsHe`
הם מערכי מחרוזות. שדות אופציונליים מקבלים את ברירות המחדל של הטופס
(`difficulty: beginner`, `complexity: compound`, `reportType: weight_reps`, מערכים ריקים).
`videoWebpUrl` אינו נתמך — נוכחותו = שגיאה.

## סדר הבדיקות

קלט → סכמת Zod → קטלוגים חיים (muscles/equipment/reportTypes) →
כפילות מול exercises (לפי שם מנורמל, אנגלית או עברית) → HEAD על התמונה →
הדפסת payload → (עם `--write`) addDoc + קריאה חוזרת להוכחה.

## קודי יציאה

| קוד | משמעות |
|-----|--------|
| 0 | הצלחה / dry-run תקין |
| 1 | חסר `--input` או ADMIN_EMAIL/ADMIN_PASSWORD |
| 2 | נכשל בסכמה או בקטלוגים החיים |
| 3 | תרגיל כפול קיים |
| 4 | imageUrl לא נגיש |
| 5 | שגיאה לא צפויה |
