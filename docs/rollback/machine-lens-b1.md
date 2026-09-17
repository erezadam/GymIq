# Rollback — Machine Lens B.1 (זיהוי מכשיר מצילום)

נפרס 17/09/2026: Cloud Function `identifyMachine` (v2, us-central1) + כפתור מצלמה ב-ExerciseLibrary.

## גלגול אחורה מלא
1. מחיקת הפונקציה:
   ```
   firebase functions:delete identifyMachine --force
   ```
2. החזרת הלקוח — revert של ה-squash של PR #180 ב-main:
   ```
   git revert <squash-sha-of-#180>   # ואז PR רגיל + merge (auto-deploy hosting)
   ```
   (אם נדרש גם revert של fix ה-fail-closed — הוא באותו squash.)
3. הרשאת ה-invoker (allUsers) נמחקת יחד עם הפונקציה — אין ניקוי נפרד.

## מה לבדוק אחרי
- ExerciseLibrary נטען ללא כפתור מצלמה וללא שגיאות קונסול.
- זרימת בחירת תרגיל רגילה עובדת (הוספה לאימון).
- ai-trainer עדיין עובד (rateLimiter משותף — ה-default fail-open לא השתנה).
- `firebase functions:list` — identifyMachine לא מופיעה.
- אין מסמכים חדשים נכתבים ל-`machineLensUsage` (הקולקשן עצמו יכול להישאר — נתוני שימוש בלבד).
