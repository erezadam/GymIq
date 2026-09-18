# Rollback — ai-trainer quota hardening (PR #184)

**תאריך:** 18/09/2026
**ענף:** `fix/ai-trainer-quota-fail-closed`
**היקף:** שינוי יחיד ב-`functions/src/ai-trainer/rateLimiter.ts` — ייבוא ישיר של
`FieldValue` מ-`firebase-admin/firestore` במקום `admin.firestore.FieldValue`.
אין שינוי התנהגות: אבחון A1 קבע שהמכסה (`aiTrainerUsage`) **נאכפת** בפרודקשן
(4/4 completed↔incremented, 7 ימים), ולכן ברירת המחדל fail-open של המאמן לא שונתה.

## Revision לפני הפריסה
```
generateaiworkout-00041-faf
```
(נלקח ב-18/09/2026 עם:
`gcloud run services describe generateaiworkout --region=us-central1 --project=gymiq-e8b4e --format='value(status.latestReadyRevisionName)'`)

## איך מגלגלים אחורה
1. **קוד:** `git revert 1e12b30` בענף חדש → PR → merge (auto-deploy).
2. **מיידי (Cloud Run traffic):**
   ```
   gcloud run services update-traffic generateaiworkout \
     --region=us-central1 --project=gymiq-e8b4e \
     --to-revisions=generateaiworkout-00041-faf=100
   ```
3. **אימות אחרי גלגול:** קריאה אחת ל-`generateAIWorkout`
   (`npx tsx --env-file=.env.local scripts/adhoc/verifyGenerateAIWorkout.ts`)
   ולוודא "Usage incremented" בלוג.

## סיכונים ידועים
- אין: הייבוא הישיר זהה פונקציונלית ב-GCF; ההבדל רק באמולטור מקומי.
