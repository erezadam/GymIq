# מפרט פיצ'ר: הוספת תרגיל מהאדמין (Admin Add Exercise) — שלב ב.2

**תאריך:** 18/09/2026
**ענף:** `feat/admin-add-exercise`
**סטטוס:** מפרט

---

## 1. מטרה

לאפשר לאדמין להוסיף תרגיל חדש למערכת ישירות מממשק האדמין — משם תרגיל (עברית/אנגלית) או מצילום מכשיר — עם טיוטה שנוצרת ב-AI, תמונת התחלה/סיום שנוצרת ב-AI, ושמירה סופית **דרך טופס התרגיל הקיים בלבד**.

## 2. שני מסלולי הוספה — במקביל

| מסלול | כלי | סטטוס |
|-------|-----|-------|
| טרמינל | הסקיל `/exercise-add` (record-builder ⇒ openai-image-gen ⇒ העלאה ⇒ כתיבה) | **נשאר במלואו, ללא שינוי** |
| אדמין | מסך הוספת תרגיל באדמין (מפרט זה) | חדש |

שני המסלולים מייצרים **רשומה זהה** מאותם קבצי מקור אמת (סעיף 5). הבדלי ניסוח בהוראות מותרים; category / primaryMuscle / equipment / reportType חייבים לצאת זהים לאותו שם תרגיל.

## 3. זרימת האדמין

1. **קלט:** שם תרגיל **או** צילום מכשיר (העלאה ל-`machine-photos/<id>.jpg`; הצילום מנותח ע"י הפונקציה הקיימת `identifyMachine` — labelText, machineType, equipmentId, confidence).
2. **טיוטה:** קריאה ל-`generateExerciseDraft({name?, photo?})` ⇒ נוצר מסמך `exerciseDrafts/{draftId}` עם `status='pending'`; הפונקציה ממלאה `draft` (כל שדות הטופס), `poseSpec`, ו-`similar` (תרגילים דומים קיימים) ⇒ `status='draft_ready'`. כשל ⇒ `status='failed'` + `error`.
3. **מילוי טופס:** הטיוטה נשפכת לטופס התרגיל הקיים (ExerciseForm); האדמין עורך חופשי. תרגילים דומים (`similar`) מוצגים כדי למנוע כפילות.
4. **תמונה:** קריאה ל-`generateExerciseImage({draftId})` ⇒ `status='image_pending'` ⇒ הפונקציה מייצרת (sunburst) תמונת התחלה/סיום, מרכיבה WebP ≤250KB בפריסת RTL, מעלה ל-`exercise-images/<slug>.webp` (ביניים: `exercise-images/work/<slug>/*.png`) ⇒ `status='image_ready'` + `image {url,endUrl,startUrl,bytes,costUsd}`. כשל (כולל WebP >250KB) ⇒ `status='failed'`. "ייצר מחדש" = קריאה נוספת (נספרת במכסה).
5. **אישור ושמירה:** האדמין מאשר ⇒ השמירה מתבצעת **דרך הטופס הקיים בלבד** (אותו מסלול client של יצירת תרגיל היום, כולל validation ו-`removeUndefined`) ⇒ קריאה ל-`markDraftSaved` ⇒ `status='saved'`.

## 4. מודל נתונים — `exerciseDrafts/{draftId}`

| שדה | תיאור |
|-----|-------|
| `createdBy` | uid של האדמין היוצר (נעול; read/create רק לבעלים-אדמין) |
| `status` | `'pending' \| 'draft_ready' \| 'image_pending' \| 'image_ready' \| 'failed' \| 'saved'` |
| `input` | `{name?, photo?: {storagePath, labelText, machineType, equipmentId, confidence}}` |
| `draft?` | שדות הרשומה שהופקו |
| `poseSpec?` | מפרט תנועה לתמונה |
| `similar?` | תרגילים דומים קיימים |
| `image?` | `{url, endUrl, startUrl, bytes, costUsd}` |
| `error?` | הודעת כשל |
| `createdAt`, `updatedAt` | חותמות זמן |

עדכוני סטטוס — Cloud Functions בלבד (Admin SDK). ללקוח: create/read בלבד, update/delete = false.

## 5. מקורות אמת יחידים

- **כללי רשומה:** `assets/prompts/exercise-record-rules.md` — הקנון לשני המסלולים. שינוי כלל = עריכת הקובץ הזה בלבד.
- **סגנון תמונה:** `assets/image-style/gymiq-style-v3-prompt.md` — קנון, אסור לערוך במסגרת הפיצ'ר.
- **הערות ציוד המכון:** מסמך `settings/gymEquipmentNotes` ב-Firestore.
- ערכים מבוקרים (category, primaryMuscle, equipment, reportType) — אך ורק מתוך הערכים החוקיים הקיימים ב-Firestore (muscles/equipment/reportTypes), לא רשימות סטטיות.

## 6. Cloud Functions

| פונקציה | קלט ⇒ פלט | הרשאה | מכסה |
|---------|-----------|-------|------|
| `generateExerciseDraft` | `{name?, photo?}` ⇒ `{draftId}` | אדמין בלבד | 30/יום — `aiDraftUsage`, **fail-closed** |
| `generateExerciseImage` | `{draftId}` ⇒ `{ok}` | אדמין בלבד | 20/יום — `aiImageUsage`, **fail-closed**, מודל sunburst, WebP ≤250KB RTL |
| `markDraftSaved` | `{draftId}` ⇒ `{ok}` | אדמין בלבד (בעלים) | — |
| `identifyMachine` | קיימת; משמשת את מסלול האדמין (הזיהוי החי במכון בוטל 18/09/2026) | מחובר | 20/יום (קיים) |

**fail-closed:** כשל בקריאת מסמך המכסה ⇒ הבקשה נדחית (לא fail-open).
**אין כתיבה ישירה ל-`exercises` מהפונקציות** — יצירת התרגיל נעשית רק דרך הטופס בלקוח (מסלול יצירה יחיד, validation אחד).

## 7. Storage

| נתיב | קריאה | כתיבה |
|------|-------|-------|
| `exercise-images/<slug>.webp` + `exercise-images/work/<slug>/*.png` | כל מחובר | Admin SDK בלבד (client ⇒ false) |
| `machine-photos/<id>.jpg` | אדמין | אדמין + `isValidImage(3MB)` |

## 8. אבטחה וכשלים

- כל ה-callables בודקות role=admin בשרת (לא רק בקליינט).
- מכסות fail-closed; חריגה ⇒ הודעה ברורה לאדמין, לא קריאה למודל.
- כשל LLM / פלט לא-תקין / תמונה חורגת ⇒ `status='failed'` + `error` מוצג — **אין סינון שקט** (חוק ברזל).
- רשימות המוזרמות לפרומפט (ציוד, ערכים חוקיים) — קלט מוטה-סדר; לערבב או להוכיח שהסדר לא מטה.

## 9. Rollback

ראה `docs/rollback/admin-add-exercise.md`.
