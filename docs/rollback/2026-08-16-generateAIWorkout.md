# כרטיס גלגול-אחורה — generateAIWorkout (ערבוב בריכה, 16/08/2026)

**מה נפרס:** PR #172 — ערבוב בריכת התרגילים בשרת (`functions/src/ai-trainer/`). משנה **רק** את `functions:generateAIWorkout`. אין שינוי hosting/rules/DB.

## מצב פרודקשן לפני הפריסה (baseline)
- main HEAD: `6940129`
- Cloud Run revision שמשרת כרגע: **`generateaiworkout-00040-ziw`** (מ-2026-08-15)
- Region: `us-central1` · Project: `gymiq-e8b4e`

## הסימן הנצפה שהפריסה תפסה
בקריאה הראשונה אחרי הפריסה, בלוגים של `generateAIWorkout` חייבת להופיע השורה:
```
Exercise pool shuffled for GPT prompt   { size: <N> }
```
אם היא **לא** מופיעה בקריאה ראשונה אחרי הפריסה → הפריסה לא תפסה. **לעצור, לא לנחש, לגלגל.**

## גלגול-אחורה (הכי מהיר — Cloud Run traffic)
מחזיר 100% מהתעבורה לגרסה שרצה כרגע, ללא build מחדש:
```bash
gcloud run services update-traffic generateaiworkout \
  --region=us-central1 --project=gymiq-e8b4e \
  --to-revisions=generateaiworkout-00040-ziw=100
```
**סימן שהגלגול תפס:**
```bash
gcloud run services describe generateaiworkout --region=us-central1 \
  --project=gymiq-e8b4e --format='value(status.traffic)'
# → generateaiworkout-00040-ziw = 100
```
ובלוגים: שורת `Exercise pool shuffled for GPT prompt` **מפסיקה** להופיע בקריאות חדשות.

## גלגול-אחורה (קוד — אם צריך לבטל לגמרי)
```bash
git revert -m 1 <merge-commit-of-PR-172>   # על main, דרך PR
# ואז redeploy הפונקציה:
gh workflow run deploy.yml -f target=hosting,functions
```

## אימות אחרי הפריסה (משימה 4)
1. הקריאה הראשונה מראה את שורת הערבוב בלוגים (אחרת — עצור וגלגל).
2. 3 יצירות רצופות **בחשבון בדיקה** (לא zehava — מיצתה 3/יום) → דיווח התפלגות ציוד + % חפיפה, בפורמט הניסוי.
