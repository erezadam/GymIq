# Rollback — Admin Add Exercise (B.2)

פיצ'ר: הוספת תרגיל מהאדמין — Cloud Functions `generateExerciseDraft`, `generateExerciseImage`, `markDraftSaved` + מסך אדמין + rules (`exerciseDrafts`, `machine-photos`, `exercise-images`).

## גלגול אחורה מלא
1. מחיקת שלוש הפונקציות:
   ```
   firebase functions:delete generateExerciseDraft --force
   firebase functions:delete generateExerciseImage --force
   firebase functions:delete markDraftSaved --force
   ```
   (`identifyMachine` **לא נמחקת** — יש לה rollback משלה: `docs/rollback/machine-lens-b1.md`.)
2. החזרת הלקוח וה-rules — revert של ה-squash של ה-PR ב-main:
   ```
   git revert <squash-sha>   # ואז PR רגיל + merge (auto-deploy)
   firebase deploy --only firestore:rules,storage
   ```
3. הרשאות invoker נמחקות יחד עם הפונקציות — אין ניקוי נפרד.
4. אופציונלי: מסמכי `exerciseDrafts` / `aiDraftUsage` / `aiImageUsage` יכולים להישאר (נתונים בלבד, אין להם צרכן אחרי ה-revert).

## מה לבדוק אחרי
- מסך האדמין נטען ללא כפתור/מסך הוספת תרגיל AI וללא שגיאות קונסול.
- **מסלול הטרמינל `/exercise-add` עובד במלואו** (הוא עצמאי ולא תלוי בפונקציות שנמחקו).
- הוספת/עריכת תרגיל רגילה דרך ExerciseForm עובדת.
- `firebase functions:list` — שלוש הפונקציות לא מופיעות; `identifyMachine` כן (אם לא גולגלה בנפרד).
- תמונות תרגילים קיימות ב-`exercise-images/` עדיין נקראות באפליקציה.
