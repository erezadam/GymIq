# סטטוס פערים פתוחים — עדכון 18/09/2026

| # | פער | סטטוס | ראיה |
|---|-----|-------|------|
| 1 | אכיפת מכסת מאמן ה-AI (חשש fail-open) | ✅ נסגר — **נאכפת**; ברירת המחדל fail-open לא שונתה (בכוונה, מתועד) | לוגים 7 ימים: completed=4 · incremented=4 · כשלים=0 (PR #184) |
| 2 | דפוס `admin.firestore.FieldValue` שביר (importStar) | ✅ נסגר — ייבוא ישיר `firebase-admin/firestore` ב-rateLimiter; נפרס (`generateaiworkout-00042-qaq`) ואומת בקריאה חיה (remaining ירד) | PR #184 + rollback card `docs/rollback/ai-trainer-quota.md` |
| 3 | "התמונה לא נוצרה" באדמין | ⚠️ אובחן, לא נסגר — השרת ייצר בהצלחה (2 drafts ב-image_ready); הכשל: **4 קריאות מקבילות זהות מהלקוח** לאותו draft (4×$0.105) + אי-הצגה ב-DraftPanel. **PR-H ממתין לאישור ארז** — שרת אידמפוטנטי (טרנזקציה+jobId+timeout-guard 10ד׳), נעילת ImageGate, שחזור draftId אחרי remount (sessionStorage), timeout 180s ל-callable | לוג generateExerciseImage 13:46:52 (×4) |
| 4 | מסמכי בדיקה ב-exercises (ZZ Test Write / ZZ Draft Smoke) | ✅ נסגר — ZZ Test Write כבר לא היה קיים (נמחק ידנית); ZZ Draft Smoke לא נשמר כתרגיל | קריאת 404 + חיפוש בגיבוי |
| 5 | טיוטות exerciseDrafts ללא ניהול | ✅ נסגר — 4 טיוטות לא-saved נמחקו (Admin/REST), נותרו 0; גיבוי מלא ב-~/gymiq-backups/2026-09-18/ | פלט מחיקה + קריאה חזרה |
| 6 | 8 יתומי primaryMuscle (biceps/glutes/adductors) | ✅ נסגר — מופו לפי ההכרעה (biceps_brachii/gluteus_maximus/legs+adductor); checkPrimaryMuscles: **All valid** | dry-run + החלה + ולידציה (דוח B) |
| 7 | התנגשות case בריפו התמונות (Assisted Pull-Up Machine) | ✅ נסגר — נמחק ה-lowercase שאף תרגיל לא מפנה אליו (commit `9e3d5a2`); הנשאר HTTP 200 | gh api DELETE + HEAD |
| 8 | היגיינה: סקריפטי check שבורים, פקודות npm, טסטים ב-CI, ענפים ישנים | ✅ נסגר — checkCategories/updateExerciseImages תוקנו, exit מפורש, `check:*` ב-package.json; **התברר שה-CI כבר מריץ vitest** (385/385, 1m07s); 16 ענפים merged נמחקו (stash לא נגעו) | PR #185 |
| 9 | thumbnail של תמונות 2:1 חותך את מרכז התמונה (החץ) | 🕐 ממתין לארז — object-left לפאנל הסיום ב-thumbnail בלבד, 3 טסטים, CI ירוק; **PR #186 לא מוזג**, אישור בעין בערוץ | https://gymiq-e8b4e--thumb-2-1-5ysfgmf2.web.app |

הערות: ADC היה זמין (לא נדרש מצב מוגבל). 7 תרגילי biceps הם כעת `primaryMuscle=''` — תקין למערכת (כמו כל תרגילי היד), אך אם יתווספו תת-שרירי יד בעתיד יש לאכלס.

## פארקינג (18/09, PR-H)
- **מלכודת גיבוי:** בחלק ממסמכי exercises קיים שדה `id` מספרי פנימי (80-85, 64) שדורס את ה-doc id בגיבוי `{id: d.id, ...data}` — כל סקריפט גיבוי חייב לשמור doc id בשדה נפרד.
- **Cable Donkey Kickback:** לפני המיפוי: `category=gluteus_maximus, primaryMuscle=longissimus` (ערך **תקין** בקטלוג — longissimus הוא תת-השריר של הישבן); מיפוי B ריקן אותו ל-`primaryMuscle=''`. לא שגוי, אבל פחות ספציפי — הכרעת ארז אם להחזיר ל-longissimus.
