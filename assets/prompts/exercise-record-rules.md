# GymIQ — כללי רשומת תרגיל (מקור אמת יחיד)

> קובץ זה הוא מקור האמת לכללי בניית רשומת תרגיל ול-poseSpec, לשני המסלולים:
> הסקיל `/exercise-add` (טרמינל) ופונקציות הענן של מסלול האדמין (`generateExerciseDraft`).
> שינוי כלל = שינוי כאן בלבד. ה-functions טוענות את הקובץ בזמן build (rules.generated.ts).

> **עיקרון על:** לעולם אל תמציא ערך לשדה מבוקר. בחר תמיד מתוך הטבלאות שלמטה בלבד. הערכים נשמרים תמיד כ-`document-id` (לא שם תצוגה).

## קונבנציית שמות עברית (nameHe)
- היצמד למונחי הקטלוג הקיים (דדליפט, סקוואט, פולי — לא "מתים"); לועזית בסוגריים רק אם הקטלוג נוהג כך לאותו תרגיל. דוגמה: Romanian Deadlift ⇒ "דדליפט רומני".
- הבחנת ציוד בשם: מכשיר ייעודי ⇒ "במכונה"/"במכשיר"; כבל ⇒ "בפולי"/"בכבל" — שני תרגילים על אותה תנועה מובחנים כבר בשם.

## הערות ציוד המכון
לפני ניסוח `equipmentPlacement` יש להתחשב בהערות הציוד של המכון (מסמך Firestore `settings/gymEquipmentNotes`; במסלול הטרמינל — `assets/image-style/gym-equipment-notes.md` עד המיגרציה). אם הציוד מופיע שם — `equipmentPlacement` חייב להתאים לתיאור.

## טבלאות הערכים החוקיים (מקור אמת — בלבד)

### category (9 — נשמר כ-document-id של muscles)
| id | עברית |
|----|-------|
| `back` | גב |
| `biceps_brachii` | זרוע קדמית |
| `cardio` | אירובי |
| `chest` | חזה |
| `core` | ליבה |
| `gluteus_maximus` | ישבן |
| `legs` | רגליים |
| `shoulders` | כתפיים |
| `triceps` | זרוע אחורית |

### primaryMuscle (תת-שריר — בחר אחד ששייך ל-category שבחרת)
| category | תת-שרירים חוקיים (id) |
|----------|----------------------|
| `back` | `lats`, `traps` |
| `cardio` | `warmup` |
| `chest` | `upper_chest`, `mid_chest`, `lower_chest` |
| `core` | `abs`, `obliques`, `lower_abs` |
| `gluteus_maximus` | `longissimus` |
| `legs` | `quads`, `hamstrings`, `calves`, `adductor` |
| `shoulders` | `front_delt`, `side_delt`, `rear_delt` |
| `biceps_brachii` | **אין תת-שריר** → השאר `primaryMuscle` ריק (`''`) |
| `triceps` | **אין תת-שריר** → השאר `primaryMuscle` ריק (`''`) |

> שדה `primaryMuscle` אופציונלי במערכת — ריק הוא ערך תקין. לתרגילי יד (זרוע קדמית/אחורית) זו ההתנהגות הנכונה כל עוד לא נוספו תת-שרירים.

### equipment (נשמר כ-document-id)
**פעילים (נבחרים בטופס):** `bodyweight`, `cable_machine`, `dumbbell`, `kettlebell`, `machine`, `puli`, `resistance_band`, `smit_machine`
**לא-פעילים כרגע** (קיימים אך לא נבחרים בטופס עד שיופעלו): `barbell`, `bench`, `pull_up_bar`

כללי הכרעה:
- מוט ברזל → `barbell` (אם עדיין לא-פעיל — צריך להפעיל באדמין; ראה הערה בפלט).
- משקולת יד → `dumbbell` · קטלבל → `kettlebell` · גומייה → `resistance_band` · משקל גוף → `bodyweight`.
- כבלים → `cable_machine` (לא `puli`; `puli` הוא כפילות מיותרת).
- מכונת משקל גנרית (Leg Press, Leg Curl, Lat Pulldown וכו') → `machine`.
- מכונת סמית' ספציפית בלבד → `smit_machine`.
- לעולם אל תפלוט את `equipment` הלא-פעיל (זה id מת).

### reportType (נשמר כ-document-id)
| id | מתי | הערה |
|----|-----|------|
| `weight_reps` | רוב תרגילי הכוח (משקל + חזרות) | ברירת מחדל |
| `reps_only` | משקל גוף בחזרות (מתח, שכיבות שמיכה) | |
| `time_only` | החזקה סטטית (פלאנק) | |
| `reps_time` | חזרות + זמן | |
| `intensity_time` | אירובי לפי עצימות | |
| `time_zone` | אירובי לפי אזור דופק | |
| `run_time_speed` | ריצה (זמן + מהירות) | |
| `spead-time-slot` | הליכון עם שיפוע | **פלוט בדיוק כך — id עם שגיאת כתיב בפרודקשן** |

### difficulty (enum — ברירת מחדל `beginner`)
`beginner` · `intermediate` · `advanced`
- ברירת מחדל `beginner`. `advanced` לתרגילים טכניים (חטיפה, נקישה, muscle-up). `intermediate` לבינוניים.

### complexity (enum — ברירת מחדל `compound`)
`compound` (רב-מפרקי: סקוואט, לחיצה, חתירה, דדליפט) · `simple` (חד-מפרקי/בידוד: כפיפת מרפק, פשיטת ברך, הרחקה, כפיפת ברכיים, פרפר).

### assistanceTypes (מערך)
- `[]` — תרגיל רגיל (ברוב המקרים).
- `['graviton']` — מכונת סיוע (משקל נמוך = טוב יותר): מתח/מקבילים בסיוע.
- `['bands']` — תרגיל גומיות.

---

## ניסוח הוראות וטיפים

- `instructionsHe` ו-`instructions`: 3–5 שלבים, ציווי, ברור. עברית מלאה ומקבילה אנגלית.
- `tipsHe` / `tips`: 1–3 טיפים (אופציונלי). אם אין — מערך ריק.
- הימנע ממידע רפואי/בטיחותי חד-משמעי; תאר ביצוע נכון.

---

## חיזוי לינק התמונה

מתוך השם האנגלי: רווחים → `%20`, סיומת **`.webp`** (הכרעה 17/09/2026 — WebP בלבד לתמונות חדשות, למובייל; קבצי `.png`/`.jpeg` ישנים בריפו נשארים כמו שהם), על שורש הריפו:
`https://raw.githubusercontent.com/erezadam/exercise-images-en/main/<English Name>.webp`
זהו ערך `imageUrl` המוצע. התמונה נוצרת דרך openai-image-gen (ראה poseSpec) ומועלית תחת שם זה כדי שהלינק יהיה אמיתי.

> **videoWebpUrl (אנימציות):** כיוון האנימציות נזנח — לתרגילים חדשים **לא** מייצרים אנימציה ולא פולטים `videoWebpUrl`. הכלל הבא נשאר רק לעשרת התרגילים שכבר יש להם אנימציה בפרודקשן: אם התרגיל אחד מאלה — `back_squat`, `barbell_bench_press`, `barbell_overhead_press`, `cable_triceps_extension`, `dumbbell_bulgarian_split_squat`, `dumbbell_lateral_raise`, `forearm_plank`, `machine_biceps_curl`, `machine_leg_press`, `wide_grip_lat_pulldown` — הוסף `videoWebpUrl`: `https://raw.githubusercontent.com/erezadam/exercisegymiq_webp/main/<exercise_id>.webp`. אחרת השמט את השדה לגמרי (כלל הברזל: imageUrl ו-videoWebpUrl תמיד יחד).

---

## מפרט תנועה לתמונה — poseSpec

מי מייצר את ההנחיות הקינסיולוגיות: **הסקיל הזה**, מתוך אותה ידיעה שכתבה את ההוראות, ובאותו רגע — כדי שההוראות והתמונה לא יסתרו זו את זו. **מי מאמת:** אדם (ארז) בטבלת האישור לפני יצירת התמונה; והתמונה עצמה בעין אחרי. הסקיל מנסח, לא מכריע.

הכלל: תיאור **פיזי וניתן לציור** — מיקומי גפיים ביחס לנקודות ציון בגוף, זוויות מפרק, מיקום הציוד, כיוון מבט. לא "בצע בשליטה", לא "כווץ" — אלה הוראות ביצוע, לא מראה.

| שדה | מה כותבים | דוגמה (Dumbbell Bench Press) |
|-----|-----------|------------------------------|
| `bodyPosition` | lying supine / prone / seated / standing / kneeling / hanging | lying supine on a flat bench |
| `cameraAngle` | הזווית שמראה הכי טוב את השריר הראשי ואת מסלול התנועה. ברירת מחדל: three-quarter front view, slightly elevated. לתרגילי שכיבה: three-quarter from the feet side, slightly elevated. לתרגילי גב: three-quarter rear view. | three-quarter view from the feet side, slightly elevated |
| `equipmentPlacement` | איפה הציוד ואיך אוחזים | two dumbbells, neutral-to-pronated grip, feet flat on the floor |
| `endPose` | **התמונה הקנונית** = שיא הכיווץ (סוף השלב הקונצנטרי). זה מה שמייצרים ראשון. | arms fully extended above the chest, dumbbells apart at shoulder width, wrists stacked over shoulders, back flat on the bench |
| `startPose` | תחילת השלב הקונצנטרי. מנוסח כ"מה שונה מ-endPose" — כי הוא נוצר ב-edit מהתמונה המאושרת. | elbows bent to about 90 degrees, upper arms just below shoulder level, forearms vertical, dumbbells at chest height just outside the shoulders |
| `muscleOverlay` | שרירים להדגשה באנגלית, נגזר מ-category + primaryMuscle + secondaryMuscles | chest (mid pectorals), triceps |
| `panelLayout` | תמיד `horizontal, RTL` (התחלה מימין, סיום משמאל) — הכרעה מוצרית למסך טלפון | horizontal, RTL |

### שני הפרומפטים שנגזרים מ-poseSpec (העתק לבלוק הסוכן כמו שהם)

**פרומפט יצירה (תמונת הסיום)** — נשלח אחרי `--style-file gymiq-style-v3-prompt.md`:
```
<English Name>. <bodyPosition>. <equipmentPlacement>. Camera: <cameraAngle>.
Pose: <endPose>. Muscle overlay on: <muscleOverlay>. No text.
```

**פרומפט עריכה (תמונת ההתחלה)** — `edit` על תמונת הסיום המאושרת, בלי style-file:
```
Change ONLY the limb and equipment position to the START position of <English Name>: <startPose>.
Keep everything else exactly as in the input image: the same figure, face, body proportions,
muscle overlay on <muscleOverlay>, camera angle, equipment, lighting, colors and plain white background.
Do not add or remove any object. No text.
```

**הרכבה:** `compose --layout horizontal --rtl --gap 32 --arrow --format webp --compression 80 --max-kb 250`. הפלט מועלה כ-`<English Name>.webp`.

### כללי קינסיולוגיה לניסוח
- **endPose = שיא הכיווץ**, לא "סוף התנועה" סתם: בלחיצה — זרועות פשוטות; בחתירה — ידית צמודה לגוף; בסקוואט — עמידה זקופה? **לא** — בסקוואט השיא הוא העומק (התחתית), כי זה מה שמלמד את התרגיל. הכלל: התמונה הקנונית היא המצב שבו השריר הראשי בעבודה מרבית **וניתן לזהות את התרגיל בלי הקשר**.
- ציין תמיד: מיקום כפות רגליים, מצב הגב (flat / neutral / arched), מיקום המרפקים ביחס לכתפיים, כיוון המבט.
- אם לתרגיל יש שני צדדים (single-arm, lunge) — ציין איזה צד עובד ובחר זווית שמראה אותו.
- אל תתאר מה **לא** לעשות בתוך הפוזה; אילוצים שליליים נכנסים כ-"Do not add or remove any object. No text." בלבד.

---

## מיפוי השדות לטופס (1:1 עם ה-payload)

הפלט חייב לכלול בדיוק את השדות הבאים. **אל תפלוט** שדות שאינם קיימים: `description`, `isActive`, `nameEn`, `id`, `tags`, `videoUrl`, `bodyRegion`, `order`, חותמות זמן (נוצרות אוטומטית).

| שדה | סוג | ברירת מחדל אם לא רלוונטי |
|-----|-----|--------------------------|
| `name` | string (אנגלית) | — |
| `nameHe` | string (עברית) | — |
| `category` | id מהטבלה | — |
| `primaryMuscle` | id תת-שריר / `''` | `''` |
| `secondaryMuscles` | id[] | `[]` |
| `secondaryMuscleCredits` | id[] | `[]` |
| `equipment` | id מהטבלה | — |
| `difficulty` | enum | `beginner` |
| `complexity` | enum | `compound` |
| `reportType` | id מהטבלה | `weight_reps` |
| `assistanceTypes` | string[] | `[]` |
| `availableBands` | string[] | `[]` |
| `instructions` | string[] | — |
| `instructionsHe` | string[] | — |
| `tips` | string[] | `[]` |
| `tipsHe` | string[] | `[]` |
| `targetMuscles` | id[] | `[]` |
| `imageUrl` | string (RAW) | — |
| `videoWebpUrl` | string | השמט אם אין |
