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

---

# נספח א׳ — פרומפט הפרודקשן תחת שליטה (diff + ארכיטקטורה)

**ייצוא מלא:** `docs/investigations/prod-prompt-2026-08-16.json` (model, maxTokens, updatedByEmail, updatedAt, systemPrompt מלא).

**Diff — `systemPrompt` (Firestore) מול `buildSystemPrompt()` (`openaiClient.ts:125-211`):**
```
$ diff code_systemPrompt.txt prod_systemPrompt.txt
>>> NO DIFFERENCES  (שניהם 3495 תווים, זהים בית-בבית)
```

**ההבדל הפעיל היחיד של ה-override הוא המודל:**
| שדה | קוד (default) | Firestore override | פעיל? |
|---|---|---|---|
| model | `gpt-4o-mini` | **`gpt-4.1`** | ✅ ההבדל היחיד |
| maxTokens | 8192 | 8192 | זהה |
| systemPrompt | 3495 תווים | 3495 תווים **זהים** | זהה |

**משמעות:** "הכל dumbbell" **אינו** נובע מפרומפט שונה ב-Firestore — הטקסט זהה. הכללים הרלוונטיים (זהים בשני המקורות):
- **עקביות ציוד לפי שריר (חובה):** "כל התרגילים חייבים להיות מאותו סוג ציוד (eq)... בחר ציוד אחד per muscle per workout" (system) + `openaiClient.ts:326` (user). ← המגביר המרכזי.
- **חלוקת שרירים:** מוזרקת דטרמיניסטית (`buildMuscleAssignments`), לא ע"י GPT.
- **סדר תרגילים:** מוכתב בפרומפט (עוגן→compound→...→פיניש).
- **גיוון:** אין שום כלל אנטי-חזרתיות בין יצירות נפרדות, ואין רנדומיזציה של סדר הבריכה.

**⚠️ סיכון ארכיטקטוני (עומד בעינו גם כשהטקסט זהה):** ההתנהגות חיה ב-`aiPrompts/workout_generation` — מחוץ ל-git, בלי גרסאות/מחבר-מאומת/אישור/rollback. עדכון קוד הפרומפט **לא יתפוס בפרודקשן** כל עוד קיים override (ה-override מחזיק עותק משלו). כרגע העותקים זהים במקרה, אבל אין מנגנון שמבטיח זאת.

**שתי חלופות למקור-אמת יחיד (לא ממומשות — המשתמש מכריע):**

| | חלופה 1 — **קוד = מקור אמת** | חלופה 2 — **Firestore = מקור אמת, עם ממשל** |
|---|---|---|
| מודל | הפרומפט/מודל חיים ב-git; `aiPrompts` הופך ל-override **ניסויי בלבד עם TTL/תפוגה** (למשל `expiresAt`), שאחרי הפקיעה חוזרים לקוד | Firestore נשאר המקור, אבל כל שמירה יוצרת **גרסה** (`aiPrompts/{id}/versions/{ts}`) עם `author`, `approvedBy`, ו-`rollback` |
| דורש מאיתנו | שדה `expiresAt` + בדיקת תפוגה ב-`getPromptOverride`; מנגנון sync שמזהיר כשה-override סוטה מהקוד | תת-קולקשן versions + UI לאישור/גלגול + שינוי `getPromptOverride` לקרוא את הגרסה המאושרת |
| שובר | overrides "קבועים" קיימים (כמו הנוכחי) יפקעו — צריך migration שמטמיע אותם בקוד | הסיכון של "עריכה חיה בלי ביקורת" נשאר, רק מתועד; יותר קוד ותשתית |
| יתרון | git=אמת, ביקורת מלאה, אין drift שקט | גמישות עריכה חמה ללא deploy, עם עקבות |

# נספח ב׳ — ניסוי מבודד: ניסוח מול הטיית מיקום

**מתודולוגיה:** מחוץ לזרימה החיה (`docs/investigations/experiment/experiment.mjs`). אותו `systemPrompt` מ-Firestore, אותו מודל `gpt-4.1`, אותם פרמטרים (JSON mode, `max_tokens:8192`, **ללא temperature**), user-prompt משוקף מ-`buildUserPrompt` (1 אימון, פלג עליון, 9 כוח). בריכה: תרגילי הכוח שביצעה zehava (`pool.json`), ממוינת אלפביתית לפי שם אנגלי — **בדיוק סדר הזרמת הבריכה של הפרודקשן** (`getExercises` → `orderBy('name')`, `src/lib/firebase/exercises.ts:23`). 3 הרצות בסדר האמיתי + 3 בסדר מעורבב.
> הערה על נאמנות: הבריכה המשוחזרת = 95 תרגילי כוח (השרת סינן ל-61 בריצה החיה, פער שנובע מסינון נוסף שלא שוחזר במדויק). ההרכב, הפרופורציות והסדר מייצגים — והתוצאה שחזרה את **אותם מזהי תרגילים** שזהבה קיבלה מאמתת את הרקונסטרוקציה.

**תוצאות:**
| קבוצה | ריצה 1 | ריצה 2 | ריצה 3 | חפיפה (זהים ב-3) |
|---|---|---|---|---|
| **סדר אמיתי (אלפביתי)** | 8×dumbbell, 1×cable | 9×dumbbell | 9×dumbbell | **6/9 ≈ 67%** |
| **סדר מעורבב** | 3×puli, 6×cable | 9×dumbbell | 2×puli, 7×cable | **0/9 = 0%** |

**מסקנה חד-משמעית — הטיית מיקום (position bias):**
- **סדר קבוע ⇒ שחזר את התקרית:** ~67% חפיפה + ~100% dumbbell, ואף אותם מזהי תרגילים (לחיצת חזה `uEttMM...`, חתירה `Xoh0Dw...`, Incline Curl `XnmEnD...`, הרחקת כתף `Hodjqp...`).
- **סדר מעורבב ⇒ הבעיה נעלמת:** 0% חפיפה, והציוד מתחלף ל-cable/puli.
- הכרעה: **סדר הזרמת הבריכה** הוא הנהג הדומיננטי; כלל "עקביות-ציוד-לשריר" בפרומפט הוא **מגביר** (נועל את הציוד שעוגן). **ניסוח הפרומפט לבדו אינו מסביר** — שינוי הסדר בלבד ריסק גם את החזרתיות וגם את חד-גוניות הציוד, בלי שינוי מילה בפרומפט.
- מסקנת-משנה חשובה: פתרון "רנדומיזציה של סדר הבריכה per-call" צפוי לטפל בשתי התופעות יחד, והוא **model-agnostic** (בניגוד ל-temperature, שאינו תואם gpt-5).

# נספח ג׳ — מסמכי in_progress ריקים (דיווח בלבד)
שאילתה מערכתית על `workoutHistory` עם `status=in_progress`:
- **285** מסמכי in_progress סה"כ; **259** עם `source` חסר — **תקין** (אימון עצמי רגיל לא נושא `source`). לא אנומליה.
- **ריקים (0 תרגילים): רק 2 במערכת כולה:**
  - `DvybM8iqKpakRh5yC8jf` — 04/02/2026, source חסר, user `OHxRVH3R` (המסמך הישן מתקרית 02-03/08).
  - `iCmuUyTCX3mVoPVpQNzO` — 25/06/2026, `source=ai_trainer`, user `lNUzUket` (zehava).
- **מסקנה:** תיקון 02-03/08 עבד ברובו; נותרו 2 שרידים ריקים בלבד (אחד מהם AI של זהבה מ-25/06). דפוס מוגבל, לא מתפרץ.
- **תיקון לממצא נלווה קודם:** שני מסמכי ה-04:25 מ-16/08 שסימנתי בעבר **אינם ריקים** (יש בהם תרגילים) — אימונים עצמיים רגילים, לא כפילויות ריקות. הטעות מתוקנת. אין תקרית אימון-ריק חדשה ב-16/08.

---

---

# הכרעות שהתקבלו (16/08/2026)

1. **מתקנים בערבוב סדר, לא ב-temperature.** temperature ירד מהשולחן — הניסוי הראה שהערבוב לבדו מטפל בחזרתיות ובחד-גוניות, והוא model-agnostic (שורד מעבר ל-gpt-5.6).
2. **מקור האמת לפרומפט הוא הקוד.** לא בונים גרסאות ב-Firestore. העקיפה נשארת למודל+תקציב-טוקנים בלבד; עקיפת `systemPrompt` הופכת לשדה ניסוי מוצהר עם תפוגה + לוג רועש, והעותק הזהה הקיים היום נמחק (PR-3).
3. **בורר הציוד מתוקן במקביל, ב-PR נפרד** (PR-2).

**חלוקה ל-PRs:**
- **PR-1 (`fix/ai-trainer-shuffle-pool`):** ערבוב הבריכה בנקודת אריזת הפרומפט בשרת. `functions/src/ai-trainer/poolShuffle.ts` + `callGPTForWorkouts` + לוג `Exercise pool shuffled for GPT prompt` + `tests/poolShuffle.spec.ts`. לא נגע ב-`getExercises`, לא בלקוח, לא בכלל עקביות-הציוד, ללא אילוץ אנטי-חזרתיות.
- **PR-2 (`fix/equipment-selector-toggle`):** היפוך `toggleEquipment` (באג נפרד) + טקסט מודאל + היפוך הטסטים.
- **PR-3 (אחרי אימות PR-1 במכשיר):** ממשל פרומפט לפי הכרעה 2.
- **ספייק gpt-5.6:** מוקפא עד PR-1 — המדידות הישנות בוצעו מול קלט מוטה, ולכן השוו עמידות להטיית-מיקום, לא את מה שרוצים לדעת.

# נספח ד׳ — מיפוי הטיית-מיקום בנתיבי AI אחרים (דיווח בלבד, לא תוקן)

| | `ai-analysis` (`generateAnalysis.ts`) | `ai-program` (`generateProgram.ts`) |
|---|---|---|
| מזרים רשימת מועמדים לבחירה? | **לא** — מסכם אימוני עבר בלבד | **כן** — מלוא הקטלוג, `:341-362` |
| מקור הרשימה | `workoutHistory` (date-desc) + muscles | `fetchExercises()` `:212-233` |
| ממוין לפי שם? | לא רלוונטי | **אין `orderBy`** — סדר doc-id (קבוע, עדיין מטה) |
| כמות | ביצועים בלבד, קטן | קטלוג מלא ~165 |
| סיכון הטיית-מיקום | נמוך (אין בחירה) | **גבוה (בחירה אקטיבית, מאמן→מתאמן)** |
| מודל | gpt-4o (`:655`) | gpt-4o (`:537`) |

**מסקנה:** `ai-program` חשוף לאותה הטיה (סדר קבוע → עיגון על תרגילים מוקדמים), וההשלכה חמורה יותר כי הוא בונה תוכניות שמאמן מקצה למתאמנים. הסדר שם הוא doc-id (לא אלפביתי) אך עדיין קבוע ולא-מעורבב בנקודת האריזה. `ai-analysis` **אינו** חשוף (אין בחירה מרשימה). **לא תוקן — מיפוי בלבד.**

# משימה 1 — שלמות מיפוי האינדקסים (גייט חוסם, PR-1)
**שאלה:** אחרי הערבוב האינדקסים השתנו — האם תשובת GPT נפתרת מול **אותו** מערך מעורבב שממנו נבנה הפרומפט?

**מעקב הנתיב (מהערבוב עד השמירה):**
1. `callGPTForWorkouts` → `buildPromptExerciseIndex(filteredExercises)` מערבב **ובונה את מפת idx↔id מאותו מערך מעורבב** (`promptExercises`). גם `buildUserPrompt` וגם המפה נגזרים מ-`promptExercises` — צימוד מובנה.
2. GPT מחזיר `exerciseId`=idx לתוך הרשימה המעורבבת.
3. `remapWorkoutIndicesToIds(parsed.workouts, indexToId)` — **הנקודה היחידה** שפותרת idx→id, מול אותה `indexToId`.
4. מכאן הכל לפי **מזהה אמיתי**: `convertClaudeResponse`/`exerciseMap` (ממופתח לפי real id), `aiRecommendations`, `applyStagnationFloor`, fill-missing.

**מסקנה: אין שום מקום שפותר idx מול `filteredExercises` המקורי או מול עותק אחר.** `filteredExercises` משמש רק כקלט לערבוב ול-`.length` בלוג. **שלמות המיפוי תקינה.**

**רפקטור שומר-התנהגות + טסט:** חולצו `buildPromptExerciseIndex` ו-`remapWorkoutIndicesToIds` (ל-openaiClient) כדי שהפרומפט והמפה יהיו מוכחות מאותו מערך. `tests/aiTrainerIndexIntegrity.spec.ts` (3 בדיקות) עם פרמוטציה הפוכה ידועה: idx1→C, idx3→A. **הוכח RED** — הזרקת הבאג (מפה מהמערך המקורי) מכשילה את כל 3 הבדיקות. הטסט הקיים `poolShuffle.spec` בודק אי-מיון/שינוי-סדר; זה בודק את **שלמות המיפוי** — החור שהמשתמש זיהה.

# אימות (PR-1)
- ✅ `tests/poolShuffle.spec.ts` — 4 בדיקות עוברות (נכשל אם ממוין / אם שתי קריאות זהות).
- ✅ `npm test` — 347 טסטים עוברים (41 קבצים).
- ✅ `npm run build` — ירוק.
- ✅ `npx tsc -p functions/tsconfig.json --noEmit` — ירוק.
- ✅ **נפרס לפרודקשן (16/08/2026, אחרי אישור מפורש):** PR #172 מוזג ל-main (`0b5f118`); פריסת `hosting,functions` הצליחה; revision חדש **`generateaiworkout-00041-faf`** משרת 100% (קודם: `00040-ziw`). כרטיס גלגול: `docs/rollback/2026-08-16-generateAIWorkout.md`.
- ⏳ **אימות runtime — טרם הושלם (16/08 10:34 UTC).** ניסיון אימות ראשון: נבדקו הלוגים של revision `00041-faf` מרגע הפריסה (09:41) ל-55 דקות — **אפס אירועי יצירה** (לא `started`, לא `shuffled`, לא `completed`, ואפס request logs). כלומר היצירה שהורצה **לא הגיעה ל-handler** (סביר: חסימת לקוח לפני הקריאה — שער/מכסה — או סביבה אחרת). **זה אינו תנאי גלגול** (קריטריון 1 מגלגל רק כש"יצירה הצליחה אך השורה חסרה"). לא גוללנו, לא תיקנו. **PR-1 פרוס אך לא אומת ב-runtime** — ממתין ליצירה אמיתית שמגיעה לפונקציה בחשבון בדיקה עם מכסה פנויה.
- ✅ **בדיקת hosting:** מיזוג PR #172 לא הביא שום שינוי לקוח (`git diff 6940129→main` על `src/`/`public/`/`index.html` = ריק). פריסת ה-hosting שידרה רק bump version/sw — אפס שינוי התנהגות ללקוח.
- ⏳ **אימות במכשיר (PR-2) — ממתין.** התיקון בשרת; אימות end-to-end דורש deploy של `functions:generateAIWorkout` ואז 3 יצירות רצופות בחשבון בדיקה (zehava מיצתה מכסת 3/יום) שמראות התפלגות ציוד שונה. עד אז: **fix candidate**.
  - הראיה שהמנגנון עובד קיימת כבר מהניסוי המבודד (נספח ב׳): ערבוב → 0% חפיפה + גיוון ציוד.
