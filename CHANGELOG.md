# Changelog

## 2026-04-02

### Added
- **מספור ידני של תרגילים**: תיבת מספר על כל תרגיל נבחר ב-ExerciseLibrary — מאפשרת קביעת סדר תרגילים באימון
  - תרגילים ממוספרים מוצגים ראשונים (סדר עולה), השאר לפי שריר + א-ב
  - עובד במודול משתמש (workoutBuilderStore) ובמודול מאמן (ProgramBuilder — desktop + mobile)
  - ניקוי אוטומטי בביטול בחירה ובלחיצת "נקה"
  - `sortExercises` חדש ב-workoutBuilderStore לסידור מחדש לפי רשימת IDs
  - `onProgramReorder` prop חדש ב-ExerciseLibrary להעברת סדר למאמן
- **מספור ידני בתוכנית מאמן (ProgramBuilder)**: תיבת מספר order על כל תרגיל ב-ProgramDayEditor (desktop) וב-MobileExerciseCard (mobile)
  - שינוי מספר מעדכן את `order` על התרגיל ומשנה את סדר ההצגה בזמן אמת
  - `order` נשמר ב-Firestore כחלק מ-`weeklyStructure[].exercises[]`
  - TraineeProgramView, ProgramDayDetail, TrainerProgramCard — ממיינים לפי `order` (backward compatible)
  - ProgramExerciseCard מציג `exercise.order` במקום אינדקס מערך
  - `loadFromProgram` — ממיין לפי `order` ומעביר ל-workoutBuilderStore
- **בדיקת E2E — הוכחת סדר תרגילים**: `e2e/trainer-exercise-order-proof.spec.ts`
  - מאמן יוצר תוכנית, מספר תרגילים ידנית (3→1→2), מפעיל
  - מתאמן רואה את התוכנית בדשבורד
  - 10 screenshots ויזואליים לתיעוד הזרימה
  - 3 tests passed (33.4s)

- **תכנון חופשי (Free Plan)**: מסלול חדש בתוך ExerciseLibrary לבניית אימון מבוסס סקציות
  - Tab חדש "תכנון חופשי" לצד "אימון" — toggle בין שני המצבים
  - מבנה סקציות: כותרת חופשית → תרגילים מתחת → כותרת נוספת → תרגילים
  - כותרות חופשיות (EMOM, סופר-סט, מעגלי וכו׳ נכתבים בכותרת)
  - בחירת כמות סטים (1-20) לכל תרגיל עם stepper (+/-)
  - הסרת תרגילים ועריכת כותרות
  - כפתור "התחל אימון" → ActiveWorkoutScreen עם מספר סטים ריקים כפי שהוגדר
  - אימון פעיל מציג כותרות סקציות כהפרדה (במקום קיבוץ לפי שריר)
  - קומפוננטה חדשה: `QuickPlanExerciseList.tsx` (סקציות + תרגילים)
  - Store: `QuickPlanSection`, `addQuickPlanSection`, `setExerciseSetCount`, `activeQuickPlanSectionId`
  - `useActiveWorkout` מכבד `customSetCount` + `sectionTitle`
- **איחוד מסך בחירת תרגילים — מאמן ומתאמן**: מסך זהה לשניהם
  - StandaloneWorkoutEditor משתמש ב-ExerciseLibrary בלי programMode
  - מאמן רואה טאבים "אימון" / "תכנון חופשי" — בדיוק כמו המתאמן
  - `sectionTitle` נשמר ב-ProgramExercise ועובר דרך `loadFromProgram` → store → ActiveWorkoutScreen
  - מתאמן שמתחיל אימון מתוכנית מאמן רואה את אותו מבנה סקציות

### Changed
- **CLAUDE.md**: נוסף חוק ברזל: **כיסוי מלא — משתמש ומאמן** — בכל פיתוח פיצ'ר חדש או שינוי בתהליך בחירת תרגילים / בניית אימון / סדר תרגילים, חובה לשאול לפני תחילת הקידוד אם השינוי חל גם על מודול המאמן (ProgramBuilder) ועל זרימת המתאמן (TraineeProgramView → workoutBuilderStore). המחדל הוא כן.

## 2026-03-23

### Changed
- **Trainer Layout redesign**: Replaced sidebar navigation with bottom navigation bar (mobile-first)
  - Sticky top app bar with trainer branding, avatar, and logout
  - Bottom nav with 4 tabs: דאשבורד, מתאמנים, הודעות, הגדרות (placeholder)
  - Rounded top corners, backdrop blur, active tab glow effect
  - Safe padding for iPhone notch area
- **Trainer Dashboard visual refresh**: Cleaner stat cards with uppercase labels, more spacing (`space-y-8`), gradient underline on section title, rounded-full "add trainee" button
- **Trainee Card visual refresh**: Increased padding, colored right border (primary for active, orange for attention), softer attention badge with background fill, ghost-style email button, surface-based color scheme
- **Design tokens**: Added Material 3 surface colors (surface-container, on-surface, on-surface-variant) to tailwind-tokens.js
- **Color token migration**: Replaced `text-text-muted`/`text-text-secondary` with `text-on-surface-variant` across all trainer domain components (~40 files) for consistent Material 3 theming
- **Muscle analysis & AI insights**: Include `cancelled` workouts (with reported data) in muscle analysis and AI-generated insights — previously only `completed`/`partial` were counted

## 2026-03-20

### Added
- **View As User (Admin Impersonation)**: Admin can view the app as any non-admin user for debugging:
  - Eye icon button in Users list to start impersonation
  - Amber banner at top shows who you're viewing as + exit button
  - Read-only mode: writes are blocked with toast message
  - Session-only: page refresh returns to admin
  - Works for both trainees and trainers
  - Firestore rules updated: admin can read all workout sessions and history
- **Editable email in trainee edit modal**: Trainer/admin can update trainee email (fixes wrong email at account creation)
  - New Cloud Function `updateUserEmail` updates both Firebase Auth and Firestore
  - Email field added to TraineeEditModal form
- **Welcome email for new trainees**: When a trainer creates a new trainee account, a branded HTML welcome email is sent via Resend with:
  - Welcome message with trainee and trainer names
  - Link to set up password (Firebase Auth password reset)
  - Link to the GymIQ app
  - RTL Hebrew layout with GymIQ branding
- New Cloud Function: `sendWelcomeEmail` (`functions/src/email/sendWelcomeEmail.ts`)
- Added `resend` dependency to Cloud Functions
- **Resend welcome email button**: Trainee card in trainer dashboard now has a "שלח מייל כניסה" button to resend the welcome email if the trainee lost it
