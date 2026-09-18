---
name: gymiq-exercise-record-builder
description: |
  בונה רשומת תרגיל מלאה ומוכנה-להזנה למערכת GymIQ מתוך שם תרגיל בעברית או באנגלית. מפיק את כל השדות שטופס האדמין דורש — שם אנגלי, קטגוריה, שריר ראשי, ציוד, קושי, מורכבות, סוג דיווח, הוראות באנגלית ובעברית, וטיפים — כשכל ערך מבוקר נבחר אך ורק מתוך הערכים החוקיים הקיימים ב-Firestore של GymIQ.
  השתמש בסקיל הזה בכל פעם שהמשתמש מבקש להקים תרגיל ל-GymIQ, ליצור רשומת תרגיל, להכין שדות לתרגיל חדש, "תקים לי תרגיל", "תכין לי את השדות של...", או מזכיר הזנת תרגיל למערכת.
  בנוסף מפיק מפרט תנועה לתמונה (poseSpec): תנוחת גוף, זווית מצלמה, מצב סיום, מצב התחלה ושרירים להדגשה — שני פרומפטים מוכנים שמוזנים לסקיל openai-image-gen (יצירה + עריכה + הרכבה של תמונת התחלה/סיום). שרשרת מוצהרת: record-builder ⇒ openai-image-gen ⇒ העלאה ל-GitHub (github-exercise-image-link) ⇒ כתיבה ל-Firestore.
  מופעל גם כשמוזכרים: GymIQ exercise, רשומת תרגיל, ExerciseForm, הקמת תרגיל, שדות תרגיל, primaryMuscle, reportType, category של תרגיל.
---

# GymIQ Exercise Record Builder

סקיל שמייצר רשומת תרגיל מלאה ל-GymIQ. הקלט: שם תרגיל בעברית או באנגלית (השני נגזר מהראשון). הפלט: בלוק שדות מוכן להעתקה לטופס האדמין, כשכל ערך מבוקר חוקי לפי המאגר האמיתי.

> **עיקרון על:** לעולם אל תמציא ערך לשדה מבוקר. בחר תמיד מתוך הטבלאות שלמטה בלבד. הערכים נשמרים תמיד כ-`document-id` (לא שם תצוגה).

---

## הזרימה

1. קבל שם תרגיל מהמשתמש — בעברית או באנגלית.
2. גזור את השם השני: מעברית — מונח אנגלי מקצועי (כפי שמאמן אמריקאי ישתמש בו); מאנגלית — שם עברי מקובל בחדרי כושר בישראל, בלי הסוגריים באנגלית.
3. בחר את כל השדות המבוקרים מתוך הטבלאות (כללי ההכרעה למטה).
4. נסח הוראות + טיפים באנגלית ובעברית.
5. גזור מההוראות **מפרט תנועה לתמונה (poseSpec)** — ראה הפרק למטה.
6. חזה את לינק התמונה (RAW) מתוך השם האנגלי.
7. הפק את בלוק הפלט המסודר.

---
## הכללים — מקור אמת יחיד

> **קרא את `assets/prompts/exercise-record-rules.md` לפני הכול.** כל טבלאות הערכים, כללי ההכרעה, קונבנציית השמות, ניסוח ההוראות, חיזוי הלינק ופרק ה-poseSpec נמצאים שם — הם משותפים למסלול האדמין (generateExerciseDraft) ואסור לשכפל אותם לכאן. שינוי כלל = שינוי בקובץ המקור בלבד.

## פורמט הפלט

בשדות המבוקרים מציגים תמיד **id · תווית עברית** — ה-id הוא מה שנשמר, התווית היא מה שארז רואה בטופס ומאמת בעין.

הפק בלוק כזה (דוגמה אמיתית — כפיפת ברכיים בישיבה במכונה):

```
=== רשומת תרגיל ל-GymIQ ===

— שדות בחירה (id · כפי שמוצג בטופס) —
category:       legs · רגליים
primaryMuscle:  hamstrings · ירך אחורית
equipment:      machine · מכשירים
difficulty:     beginner
complexity:     simple
reportType:     weight_reps
assistanceTypes: (ללא)

— שדות טקסט (העתק) —
name:    Seated Leg Curl
nameHe:  כפיפת ברכיים בישיבה
imageUrl: https://raw.githubusercontent.com/erezadam/exercise-images-en/main/Seated%20Leg%20Curl.webp

instructionsHe:
1. התיישב במכונה והנח את הקרסוליים מאחורי הכרית.
2. אחוז בידיות וכופף את הברכיים תוך הורדת הכרית כלפי מטה.
3. עצור רגע בנקודה התחתונה וכווץ את הירך האחורית.
4. החזר בשליטה למצב ההתחלה.

instructions:
1. Sit on the machine with ankles behind the pad.
2. Grip the handles and curl your knees, driving the pad down.
3. Pause briefly at the bottom and squeeze the hamstrings.
4. Return under control to the start.

tipsHe: שמור על גב צמוד למשענת; אל תזרוק את המשקל.
tips: Keep your back against the pad; avoid swinging the weight.

— ברירות מחדל (אין צורך לשנות) —
secondaryMuscles: []   secondaryMuscleCredits: []   targetMuscles: []
availableBands: []     tips/tipsHe: כנ"ל

— poseSpec (לאישור לפני יצירת התמונה) —
bodyPosition:       seated on the leg-curl machine, back against the pad
cameraAngle:        three-quarter front-side view, slightly elevated, working leg nearest the camera
equipmentPlacement: ankles behind the lower pad, thighs under the top pad, hands on the side handles
endPose:            knees bent to about 90 degrees, ankle pad pulled down under the seat, hamstrings contracted, back flat against the pad
startPose:          legs extended straight forward, ankle pad raised to knee height, thighs still under the top pad
muscleOverlay:      hamstrings
panelLayout:        horizontal, RTL

⚠ תזכורת: התמונה נוצרת ב-openai-image-gen ומועלית תחת השם "Seated Leg Curl.webp" כדי שה-imageUrl יעבוד.
```

אם נבחר ערך שדורש פעולה (למשל `barbell` שעדיין לא-פעיל), הוסף שורת אזהרה: "⚠ הפעל את `barbell` באדמין (Equipment → isActive) לפני הבחירה".
