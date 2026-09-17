---
name: exercise-add
description: |
  מקים תרגיל חדש ב-GymIQ מקצה-לקצה: רשומה (record-builder) → תמונת התחלה/סיום (openai-image-gen) → העלאה לריפו התמונות → כתיבה מאומתת ל-Firestore. מופעל על "/exercise-add", "הוסף תרגיל", "תקים תרגיל", "תוסיף את התרגיל...", או כשניתן שם תרגיל בעברית או באנגלית להוספה למערכת. תומך באצווה (כמה שמות מופרדים בפסיק). שני גייטים של אישור ארז — אחרי הרשומות ואחרי התמונות — לפני כל כתיבה.
---

# /exercise-add — הקמת תרגיל מקצה-לקצה

## קלט
שם תרגיל אחד, או כמה שמות מופרדים בפסיק (עברית או אנגלית).
לכל שם: **slug** = השם האנגלי ב-kebab-case; **workspace** = `~/imggen-out/gymiq/<slug>/`.

## שלב 0 — ניפוי כפילויות
הרשומה נבנית קודם (שלב 1) — הניפוי משתמש בשמות שלה.
לכל תרגיל: `npm run exercise:write -- --input <record.json> --dedupe-only`.
יציאה 0 ⇒ אין כפילות, ממשיכים. יציאה 3 ⇒ "קיים תרגיל בשם … (id)" ⇒ התרגיל יוצא מהאצווה; השאר ממשיכים.

## שלב 1 — רשומה
הפעל את הסקיל `gymiq-exercise-record-builder` לכל תרגיל.
שמור ב-workspace:
- `record.json` — בחוזה של `scripts/exercise-add/writeExercise.ts`: ארבעת שדות הטקסט הם **מערכי מחרוזות**, **בלי `videoWebpUrl`**.
- `posespec.md` — עם **שני הפרומפטים** (סיום + התחלה) מה-poseSpec.

## 🛑 גייט 1 — אישור רשומות
טבלה אחת לכל האצווה: שם · category · primaryMuscle · equipment · reportType (כ-**id · תווית**) · poseSpec מלא.
**עצור.** ממשיכים רק על **"מאושר" מפורש מארז** (אפשר "מאושר חוץ מ-X" — X יוצא, השאר ממשיכים).

## שלב 2 — תמונות
לכל תרגיל, בסדר הזה (הסקיל `openai-image-gen`, המודל gpt-image-2.5-sunburst):
1. `generate` — תנוחת **הסיום**, עם `--style-file assets/image-style/gymiq-style-v3-prompt.md`, `--format png` (ללא `--max-kb`), פלט `end.png`.
2. `edit` — תנוחת **ההתחלה** מתוך `end.png`, `--quality high`, `--format png` (ללא `--max-kb`), פלט `start.png`.
3. `compose` — מקבל את שני ה-PNG: `--layout horizontal --rtl --gap 32 --arrow --format webp --compression 80 --max-kb 250` (התחלה מימין, סיום משמאל).
4. הפלט הסופי: `<English Name>.webp` ב-workspace — **דחיסה אחת בלבד — בתוצר הסופי** (הביניים PNG ללא איבוד).

כשל בתרגיל ⇒ מסומן ומדווח; השאר ממשיכים.
כל הקבצים מועתקים ל-`~/Downloads/gymiq-imggen-test/<slug>/` ו-Finder נפתח (`open`).

## 🛑 גייט 2 — אישור תמונות
**עצור.** "מאושר" ⇒ ממשיכים; "תייצר מחדש את X" ⇒ מריצים מחדש **רק את X** וחוזרים לגייט.

## שלב 3 — העלאה
לכל תרגיל מאושר: `bash scripts/exercise-add/upload-image.sh --file "<workspace>/<English Name>.webp" --name "<English Name>"`.
ה-URL שנלכד מ-stdout נכנס ל-`record.json` כ-`imageUrl`.
**חייב להיות זהה לחיזוי מהסקיל** (record-builder) — אם לא, עצור.

## שלב 4 — כתיבה
לכל תרגיל: `exercise:write` dry-run ⇒ הדפסת ה-payload ⇒ `exercise:write --write` ⇒ הדפסת הקריאה-חזרה (id, name, nameHe, imageUrl).
קודי יציאה 2/3/4/5 ⇒ התרגיל נכשל, מדווח בקול עם הקוד; השאר ממשיכים.

## שלב 5 — אימות
הרץ `npx tsx --env-file=.env.local scripts/checkPrimaryMuscles.ts` ו-`scripts/checkMissingImages.ts`; הדבק את הסיכומים.

## דוח סיום
טבלה: תרגיל · id · imageUrl · עלות תמונות (סכום `cost_usd_estimate` מהמניפסטים) · סטטוס.
ובסוף — **"סיכום לארכיטקט"** בפורמט הקבוע (בוצע / נכשל-נעצר / דורש הכרעה / מה להעתיק לקלוד).

## כללי ברזל
- **אין `--write` לפני שני הגייטים.**
- **אין כתיבה בלי HEAD 200** על ה-imageUrl (writeExercise אוכף; לא עוקפים עם --skip-image-check).
- **לא משנים קובצי סגנון** (`assets/image-style/*`).
- **לא ממציאים ערכים מבוקרים** — רק מהקטלוגים החיים דרך record-builder.
- **לא מייצרים מחדש מה שכבר אושר.**
- **כל כשל מדווח בקול** עם קוד היציאה — אין בליעה שקטה.
