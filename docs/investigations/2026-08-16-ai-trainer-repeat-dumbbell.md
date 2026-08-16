# תחקיר: מאמן ה-AI — אימונים חוזרים + "הכל משקולות" (zehava, 16/08/2026)

> **סטטוס:** תחקיר ראיות בלבד. אפס תיקונים. תיקונים מוקפאים עד הכרעת המשתמש.
> **תאריך:** 16/08/2026 · **חוקר:** סוכן פיתוח · **ענף:** `investigate/ai-trainer-repeat-dumbbell`

## Context
המשתמשת zehava@assa-adam.com יצרה 3 אימוני AI ב-16/08 בבוקר. קיבלה 3 פעמים אימון כמעט זהה, כולו משקולות (dumbbell). במקביל קיים באג ידוע בבורר הציוד. ההשערה של המשתמש: הבורר צמצם את הבריכה לציוד יחיד → תוצאה חוזרת. השערה קודמת של הסוכן: "התכנסות GPT על בריכה צרה". **שתי ההשערות הופרכו ע"י ראיות מהריצה החיה.**

מקורות הראיות: Cloud Logging של `generateAIWorkout` (gen2/Cloud Run), מסמכי Firestore (`workoutHistory`, `aiPrompts/workout_generation`, `aiTrainerUsage`), וקטלוג `exercises` — כולם נשלפו דרך Firestore REST API עם access token של gcloud (קריאה בלבד, גישת owner שעוקפת rules).

זהות המשתמשת: uid `lNUzUket0uRTo8giIp0y9YnmhaK2`.

---

## משימה 1 — לוגים של הריצה האמיתית
שלוש קריאות ל-`generateAIWorkout`, כולן הצליחו והגיעו ל-OpenAI (אין fallback):

| # | תחילת קריאה (UTC) | source | pool שהתקבל | סונן ל-GPT | **מודל שרץ בפועל** | max_tokens | GPT | fallback | משך |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 04:16:47.681 | performed | 104 | 61 | **gpt-4.1** | 8192 | הצליח | לא | ~11ש' |
| 2 | 04:18:46.471 | performed | 104 | 61 | **gpt-4.1** | 8192 | הצליח | לא | ~9ש' |
| 3 | 04:22:54.165 | performed | 90 | 55 | **gpt-4.1** | 8192 | הצליח | לא | ~9ש' |

- **המודל האפקטיבי מדווח בלוג:** `AI prompt override applied from aiPrompts collection {model: gpt-4.1, maxTokens: 8192, hasSystemPrompt: true}`. הברירת-מחדל הקשיחה `gpt-4o-mini` **לא** רצה.
- **פרמטרים לקריאת OpenAI** (`functions/src/ai-trainer/openaiClient.ts:72-80`): `model`, `max_tokens`, `response_format: {type:'json_object'}`. **אין `temperature`/`seed`/`top_p`** → ברירת מחדל של OpenAI (temperature=1).
- אין שגיאות OpenAI, אין rate-limit block בשלוש הקריאות. `Usage incremented` רץ 3 פעמים.

## משימה 2 — זהים או דומים? (דיף מדויק)
שלושת מסמכי ה-`workoutHistory` (source=`ai_trainer`, status=`in_progress`), חותמות זמן תואמות בדיוק לסיום קריאות ה-GPT:
`EMYOdmZhHrWhUY7qse2K` (04:16:59), `7VsuYfTMjy4AfHo0MbME` (04:18:55), `AtxcgKe23srPRE5X1Mxk` (04:23:03).

- **חימום (נבחר server-side ב-`Math.random`)**: קריאה1=אופניים/מסילה · קריאה2=סייט · קריאה3=סטפר → **שונה בכל קריאה**.
- **core (נבחר server-side ב-`Math.random`)**: קריאה1=עליות בטן מלאות · קריאה2=עליות בטן מלאות · קריאה3=כפיפת גוף צידית → קריאה3 שונה.
- **תרגילי כוח (בחירת GPT)**: **6 תרגילים זהים בכל 3 הקריאות** מתוך ~9 תרגילי כוח; השאר החלפות באותם שרירים. הסדר משתנה.
  - זהים בכל 3: לחיצת חזה בשכיבה, חתירה עם משקולת יד, Incline Curl, כפיפת כתף קדימה, הרחקת כתף, קיק בק.

**מסקנה מפורשת:** האימונים **אינם byte-identical**. גרעין הכוח ~67% זהה. הראיה החותכת: **החימום וה-core (Math.random) שונים בין הקריאות** — לכן **אין cache ואין נתיב חוזר לפני GPT**. ההסבר "תוצאה שמורה הוצגה מחדש" **נשלל**. הדמיון נובע מבחירת ה-GPT עצמה (ראה משימה 4).

## משימה 3 — האם הקריאה השלישית יצאה?
כן. `aiTrainerUsage/lNUzUket..._2026-08-16` = `generationsCount: 3`, `lastGeneratedAt: 04:23:03`. שלוש קריאות GPT נפרדות בלוג, שלושה מסמכי אימון נפרדים. הלקוח **לא** הציג מחדש תוצאה קודמת; אף קריאה לא נחסמה או נבלעה.

## משימה 4 — מה היה בבריכה? (ההוכחה המרכזית)
`exerciseSource=performed`, `equipmentFilter=undefined` (אין סינון ציוד חלקי — נתמך גם ע"י `receivedPoolSize=104` וגם ע"י `equipmentFilter:undefined` במסמכי האימון).

שחזור בריכת ה-performed מכל ההיסטוריה (mirror ל-`getDistinctPerformedExerciseIds`: `isCompleted && exerciseId`), הצלבה מול קטלוג `exercises` (165 תרגילים) — **פילוח הציוד של 109 התרגילים ה-distinct:**

```
  34  dumbbell        (~31%)
  18  cable_machine
  18  machine
  14  bodyweight
   9  smit_machine
   3  puli
   7  (לא בקטלוג)
   6  cardio
```

**הבריכה מעורבת — 45 תרגילי מכונה/כבל/סמית' היו זמינים.** ובכל זאת gpt-4.1 בחר **100% dumbbell** (אומת ישירות: כל 12 התרגילים שנבחרו בשלוש הקריאות הם `equipment: dumbbell` בקטלוג).

**מסקנה מפורשת:** באג הבורר **אינו** השורש כאן — הבריכה לא צומצמה לציוד יחיד (`equipmentFilter` נעדר, pool=104). "ההיסטוריה שלה כולה משקולות" **שגוי**. השורש של "הכל משקולות" ושל הדמיון בין הריצות הוא **המודל+הפרומפט**, לא הבריכה ולא הבורר. (אימות ניסויי — משימה ב׳, נספח בהמשך.)

## משימה 5 — שרשרת הכרעת המודל מקצה לקצה
1. **ברירת מחדל קשיחה** — `override?.model ?? 'gpt-4o-mini'` (`openaiClient.ts:73`). פעילה רק בהיעדר override.
2. **עקיפת Firestore** — `aiPrompts/workout_generation`, נקראת ע"י `getPromptOverride` (`functions/src/shared/promptConfig.ts`), עוברת `sanitizeOverrideModel` מול allow-list. **המסמך בפועל:** `model=gpt-4.1`, `maxTokens=8192`, `systemPrompt` מלא (3495 תווים), `updatedByEmail=a@gmail.com`, `updatedAt=2026-07-23`. valid → מוחל, **ומדווח בלוג** (לא שקט).
3. **בורר האדמין** — `src/domains/admin/components/PromptLibrary.tsx` כותב `model`+`systemPrompt`; מוודא מול `modelOptions` לפני שמירה (`:105`). רשימת המודלים: `aiPromptRegistry.ts:306` = `['gpt-4o-mini','gpt-4o','gpt-4.1-nano','gpt-4.1-mini','gpt-4.1']`.

**היכן השרשרת נשברת:**
- ⚠️ **הפרומפט שרץ אינו זה שבקוד.** מסמך העקיפה מחזיק `systemPrompt` מלא, ולכן `buildSystemPrompt()` בקוד (`openaiClient.ts:124`) **מושבת בפועל**. כל תיקון פרומפט בקוד לא ישפיע בפרודקשן כל עוד קיים ה-override. זו נקודת השבירה החשובה ביותר.
- אם אדמין ישמור מודל מחוץ ל-allow-list → השרת מפיל אותו בשקט-אך-מדווח לברירת המחדל `gpt-4o-mini`.

## משימה 6 — תאימות מודל
- `functions/src/shared/promptOverrides.ts:34` — allow-list: `gpt-4o-mini, gpt-4o, gpt-4.1-nano, gpt-4.1-mini, gpt-4.1`.
- הערת קוד מפורשת (`:32-34`): *"gpt-5/o-series need max_completion_tokens — adding them requires a code change."*
- **gpt-4.1 (הנוכחי):** נתמך ב-`chat.completions`, תומך ב-JSON mode, **מקבל `temperature≠1`**.
- **gpt-5 / o-series:** **אינם בזרימה** — דורשים `max_completion_tokens`, ו**דוחים `temperature≠1` בשגיאת 400**. temperature קבוע קשיח = מלכודת עתידית.
  - **חלופות תאימות (לא ממומשות):** (א) `temperature` per-model capability flag; (ב) temperature=1 + וריאציה דרך `seed`/nonce תואמי-כל-מודל.

## משימה 7 — בורר הציוד (מיפוי, ללא תיקון)
קובץ: `src/domains/workouts/utils/equipmentSelection.ts`, `toggleEquipment` (68-80).

- **שבורה א' — "הכל" אינו toggle:** `:73` `if (optionId===ALL_OPTION_ID) return new Set(selectableIds)` — תמיד בוחר הכל; אין clear-all. מקור: commit **`496fd7b`** (15/08 07:40).
- **שבורה ב' — לחיצה ראשונה מצמצמת לפריט יחיד:** `:75` `if (isAllSelected(...)) return new Set([optionId])`. מקור: commit **`ab4de4d`** (15/08 08:18).

**כיסוי טסטים:** `tests/aiTrainerEquipmentSelector.spec.tsx` **נועל את ההתנהגות השבורה** (`:37`, `:53-54`, `:154`). **לא מכוסה:** התרחיש הרצוי (מ"הכל" לחיצה על פריט מסירה רק אותו; "הכל" שני מנקה). תיקון יחייב היפוך הטסטים.

---

## סיכום מנהלים — מה הראיות תומכות
1. **המודל שרץ: gpt-4.1** (override ב-Firestore), לא gpt-4o-mini. יש לוג מפורש.
2. **"אותו אימון 3×": לא cache, לא הבורר.** 3 קריאות GPT אמיתיות; חימום+core (random) שונים. הדמיון = בחירת gpt-4.1 החוזרת תחת פרומפט מגביל, ללא temperature וללא מנגנון גיוון בין יצירות.
3. **"הכל משקולות": המודל+הפרומפט, לא הבריכה.** בריכה מעורבת (45 מכונה/כבל זמינים); המודל בחר 100% dumbbell.
4. **באג הבורר אמיתי אך לא הופעל בתקרית זו** (`equipmentFilter` נעדר, pool=104).
5. **מלכודת עתידית:** temperature קבוע ישבור מעבר למודל gpt-5.
6. **שבירת שרשרת:** הפרומפט שרץ חי ב-Firestore, לא בקוד.

## ממצא נלווה (מדווח, לא מטופל)
נמצאו 2 מסמכי `workoutHistory` נוספים באותו בוקר (04:25:10, 04:25:23) עם `status=in_progress` ו-`source=undefined` — נבדק כתחקיר נפרד (משימה ג׳, נספח בהמשך).

## מה נדרש כדי לסגור (החלטות למשתמש, לפני תיקון)
- וריאציה בין יצירות: seed/nonce בפרומפט (תואם-מודל) מול temperature (רק gpt-4.1).
- "הכל משקולות": לרכך את כלל עקביות-הציוד **ב-systemPrompt שב-Firestore** (לא רק בקוד), או להוסיף חובת-גיוון-ציוד.
- בורר הציוד: היפוך `toggleEquipment` + היפוך הטסטים.
- לתעד/לאכוף: פרומפט הפרודקשן חי ב-`aiPrompts`, לא בקוד.
