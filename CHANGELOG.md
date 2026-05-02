# Changelog

## [Unreleased] - 2026-05-02

### Added
- **Trainer Approval Flow (Phase 1, 2026-05-02)**: זרימת בקשה-ואישור לשיוך מתאמן→מאמן. במקום שיוך מיידי (`selfAssignTrainer` שהוסר), המתאמן שולח **בקשה** שהמאמן מאשר/דוחה. סטטוס המעבר: `pending → active` (אישור) או `pending → rejected` (דחייה) או `pending → cancelled` (המתאמן מבטל בעצמו). `users.trainerId` נכתב **רק** כשהבקשה אושרה — לא בעת הבקשה.
- **Cloud Function `approveTrainerRequest`** (`functions/src/trainer-approval/approveRequest.ts`): `onCall` שמבצע את האישור בתוך `db.runTransaction` של Admin SDK — שני ה-writes (relationship.status='active' + users.trainerId=trainerId) קורים אטומית, ו-optimistic concurrency של Firestore דוחה approvals מקבילים. נוצר ב-CF (לא ב-client) כי Firestore client rules לא יכולות לתת למאמן הרשאה לכתוב `users.trainerId` של מתאמן שעדיין לא משויך אליו. race detection: אם המתאמן נקשר למאמן אחר במקביל, הבקשה הנוכחית מסומנת `rejected` עם `rejectionReason='TRAINEE_ALREADY_HAS_TRAINER'` באותה transaction.
- **3 התראות מייל** (`functions/src/email/trainerApproval.ts`): templates inline בעברית (RTL, צבע מותג `#00D4AA`) באותו דפוס כמו `sendWelcomeEmail.ts` הקיים — `sendTrainerRequestEmail` (למאמן כשמתאמן ביקש), `sendTrainerRejectedEmail` (למתאמן כשנדחה), ו-helper פנימי `sendTrainerApprovedEmailDirect` שה-CF של ה-approve קוראת לו אחרי commit. כל הקריאות best-effort עטופות ב-`try/catch` — כשל מייל לא מגלגל את הפעולה הראשית.
- **`SelectTrainerPrompt` עם 4 מצבים** (`src/domains/trainee-onboarding/components/SelectTrainerPrompt.tsx`): default ("בחר מאמן" — כקודם), `pending` ("בקשתך נשלחה ל-X" + כפתור ביטול), `rejected` ("המאמן X דחה" + reason + "בחר מאמן אחר"), ו-`ended` (חלון fade של 30 יום אחרי disconnect). `cancelled` ממופה ל-null ב-UI לפי החלטת UX (המתאמן יזם את הביטול בעצמו). הזרימה מבוססת על `getMyLatestRelationshipState(traineeId)` חדש ב-`trainerService`.
- **`PendingRequestsSection`** (`src/domains/trainer/components/PendingRequestsSection.tsx`): סקציה חדשה בדשבורד המאמן (`TrainerDashboard.tsx`), מוסתרת כשאין בקשות. כל בקשה מציגה שם המתאמן + email + תאריך הבקשה, עם כפתורי "אישור" (קורא ל-CF) ו"דחייה" (פותח modal עם textarea אופציונלי לסיבה).
- **6 פונקציות חדשות ב-`trainerService.ts`**: `requestTrainer` (יוצר pending + שולח מייל למאמן), `approveTrainerRequest` (httpsCallable wrapper ל-CF), `rejectTrainerRequest` (silent no-op אם status≠'pending' למניעת spam, שולח מייל), `cancelTrainerRequest` (mark cancelled, לא delete — לאנליטיקס), `getPendingRequestsForTrainer` (query ממוין `requestedAt desc`), `hasActiveOrPendingTrainer` (חוסם בקשות חדשות אם יש active/paused/pending), ו-`getMyLatestRelationshipState` עם 30-day auto-fade ל-`ended`/`cancelled` (`rejected` תמיד מוצג).
- **`TrainerRelationshipError` class** עם code `'TRAINER_RELATIONSHIP_EXISTS'` — נזרק מ-`requestTrainer` כשלמתאמן יש כבר relationship `active`/`paused`/`pending`.
- **3 indexes חדשים ב-`firestore.indexes.json`** (אינדקסים קיימים לא נגעו): `trainerRelationships(trainerId, status, requestedAt desc)` ל-`getPendingRequestsForTrainer`; `trainerRelationships(traineeId, status)` ל-`hasActiveOrPendingTrainer` (where-in); `trainerRelationships(traineeId, updatedAt desc)` ל-`getMyLatestRelationshipState`.

### Changed
- **`RelationshipStatus` הורחב מ-3 ל-6 ערכים**: נוספו `'pending'`, `'rejected'`, `'cancelled'` ל-`'active' | 'paused' | 'ended'` הקיימים. `TrainerRelationship` interface קיבל 4 שדות אופציונליים חדשים — `requestedAt`, `requestedBy: 'trainer'|'trainee'`, `respondedAt`, `rejectionReason`. תוויות עברית נוספו ל-`RELATIONSHIP_STATUS_LABELS` (`'ממתין לאישור'`, `'נדחה'`, `'בוטל'`).
- **`firestore.rules` של `trainerRelationships` הומר ל-state machine מפורש**: 2 כללי CREATE — (1) trainer יוצר active (משמר את הזרימה הקיימת של `createTraineeAccount`), (2) trainee יוצר pending עם `requestedBy=='trainee'`. 4 כללי UPDATE — (1) trainer ידחה pending→rejected, (2) trainee יבטל pending→cancelled, (3) שני הצדדים מנהלים active/paused (pause/resume/end/notes — שומר את כל ההתנהגות הקיימת), (4) notes-only על ended (משמר `updateRelationshipNotes` אחרי disconnect). מעבר pending→active מתבצע **רק** דרך CF (Admin SDK עוקף את ה-rules); אין כלל client לזה. אסור active→pending (one-way). DELETE נשאר רחב כקודם.
- **כל הכתיבות החדשות ב-`trainerService.ts` עוטפות payloads ב-`removeUndefined()`** מ-`src/lib/firebase/firestoreUtils.ts` (iron rule 02/05/2026). ה-inline filter שהיה ב-`createRelationship` הוסר.

### Removed
- **`selfAssignTrainer` הוסר מ-`trainerService.ts`**: הוחלף ב-`requestTrainer` עם flow אישור. הצרכן היחיד (`TrainerSelectionScreen.tsx`) הוסב באותו commit. ה-rules החדשים ממילא חוסמים את הזרימה הישנה (trainee create with status:'active' נדחה).

### Notes
- **`createTraineeAccount` (מאמן יוצר חשבון מתאמן) לא השתנה**: נוצר עדיין ישר עם `status:'active'`, שולח welcome email כקודם. סימטריה דו-כיוונית (trainer-initiated גם דורש אישור מתאמן) מתוכננת ל-PR נפרד.
- **אף רשומת `trainerRelationships` קיימת לא שונתה ב-DB**: אין migration. כל מי שיש לו היום `status:'active'` נשאר `'active'`.
- **27 בדיקות התנהגותיות חדשות** ב-`tests/trainer-approval.spec.ts` (mock SDK + assert על call args, לפי iron rule 02/05 — לא source-grep): מכסות את 6 הפונקציות החדשות, idempotency של reject (silent no-op כשלא pending), וכלילת `paused` ב-`hasActiveOrPendingTrainer`. סך הכל 64 tests (היו 56).
- **התראת deploy**: ה-PR מוסיף Cloud Functions חדשים — auto-deploy ב-`push: main` פורס hosting בלבד. נדרש `workflow_dispatch` ידני עם target `hosting,functions,firestore` כדי לפרוס גם CF + rules + indexes. אינדקסים חדשים נבנים אסינכרונית — חלון של דקות עד שעה שבו השאילתות החדשות יחזירו `failed-precondition` עד ש-Firestore מסיים את הבנייה.

### Known limitations
- **Race condition של 2 בקשות pending במקביל**: Firestore rules לא יכולות לבצע query על מסמכים אחרים בעת `create`, ולכן חסימת בקשות כפולות מאותו מתאמן ל-2 מאמנים במקביל קיימת רק ברובד ה-application (`hasActiveOrPendingTrainer` ב-`requestTrainer`) — לא ב-rules. מתאמן זדוני שעוקף את ה-client יכול ליצור 2 רשומות `pending` סימולטנית. אכיפה מבוזרת מתוכננת ל-Phase 3 (deterministic doc IDs או Cloud Function לכל בקשה).

## [Unreleased] - 2026-04-30

### Added
- **תמיכה ב-WebP אנימציה לתרגילים — Phase 1 (תשתית, 2026-04-30)**: שדה אופציונלי חדש `videoWebpUrl?: string` על `Exercise` שמחליף את התמונה הסטטית במסכים גדולים כשהוא מוגדר. כל 24 נקודות הצגת תמונת תרגיל באפליקציה (משתמש + מאמן + אדמין) עברו ל-`<ExerciseMedia>` משותף חדש ב-`src/shared/components/ExerciseMedia/`. הרכיב מקבל `variant` שמכריע על מדיניות הטעינה: `hero` טוען WebP אנימטיבי כשקיים, `thumbnail` תמיד תמונה סטטית (חיסכון ברוחב פס במיניאטורות קטנות שבהן אנימציה לא נראית בכלל), `preview` ל-context של אדמין. `onError` בנוי בשתי שכבות — נכשל ה-WebP → סטטי, נכשל הסטטי → SVG placeholder מקומי. השדה אופציונלי לחלוטין: תרגילים קיימים בלי `videoWebpUrl` ממשיכים להציג תמונות סטטיות בדיוק כמו קודם. propagation מלא בכל ה-iron-rule save/restore points (29/01): 9 ב-`useActiveWorkout.ts`, 3 ב-`workoutHistory.ts` service, 6 ב-`ExerciseLibrary.tsx`, 6 ב-`WorkoutHistory.tsx` continue handlers, 5 ב-trainer ProgramExercise builders. בטופס האדמין נוסף שדה URL חדש עם validation ב-Zod (חייב סיומת `.webp` או ריק) + תצוגה מקדימה אנימטיבית בפועל. **כיסוי מלא — משתמש + מאמן**: כל 8 הנקודות בדומיין `trainer/` (ProgramView, ProgramBuilder, TraineeDetail, TraineeRecentWorkouts, PRCard analytics, WorkoutHistoryEditor) הוסבו לרכיב המשותף. test רגרסיה חדש ב-`tests/critical.spec.ts` ("videoWebpUrl propagates through workout lifecycle - Phase 1") — 9 בדיקות נוספות שמוודאות את ה-iron rule.

### Fixed (Side fixes called out as part of WebP Phase 1)
- **`PersonalRecords.tsx` placeholder fallback (2026-04-30)**: היה fallback ל-`/images/exercise-placeholder.png` (לא קיים בפרויקט — `.svg` הוא הרשמי). תוקן אוטומטית במעבר ל-`<ExerciseMedia>` שמשתמש ב-`EXERCISE_PLACEHOLDER_IMAGE` הסטנדרטי (SVG). שתי נקודות ב-PersonalRecords (recent + all records).
- **`admin/ExerciseList.tsx` תלות חיצונית מבוטלת (2026-04-30)**: היתה תלות חיצונית ב-`https://via.placeholder.com/48?text=🏋️` כ-fallback ל-onError. תוקן אוטומטית במעבר ל-`<ExerciseMedia>` — fallback מקומי ב-100%.

### TODO (Phase 2 — Future Cleanup)
- **Bulk migration script `scripts/migrate-webp-urls.ts`**: סקריפט שיעבור על תרגילים קיימים, יבדוק קיום קובץ WebP בריפו `erezadam/exercisegymiq_webp` לפי basename match (e.g. `bench_press.png` → `bench_press.webp`), ויאכלס `videoWebpUrl` אוטומטית. אחרי הרצה: עשרות תרגילים יקבלו אנימציה בלי הזנה ידנית.
- **`ExerciseSet` collage (4 תמונות 2×2)**: ב-`ExerciseSetCard`, `ExerciseSetManager`, `ExerciseSetForm` — כיום מציגים collage של 4 תמונות סטטיות. לא חלק מ-Phase 1. בעתיד: לשקול לעבור גם הם לאותו פאטרן (מצריך שינוי `exerciseImages: string[]` ל-array של אובייקטים, לא טריוויאלי).
- **`active-workout/ExerciseCard.tsx` — 11 inline styles קיימים**: לא קשור ל-WebP. נמצאים בקוד של assistance type selector (graviton/bands buttons) שורות 154–243. חורגים מחוק הברזל מ-29/01. לא ניגעו במשימה הזו (בכוונה — מחוץ לסקופ).

## [Unreleased] - 2026-04-24

### Documented
- **Lessons learned from date picker fix incident (2026-04-28)** — added bug verification policy to global `~/.claude/CLAUDE.md` and project-specific notes in `CLAUDE.md`. The policy codifies six iron rules: build green ≠ bug fixed; mobile bugs require mobile verification; symptom shift is not a fix; diagnosis before code; honest reporting; the mobile/desktop divide is a frequent source of bugs. Project `CLAUDE.md` testing section was rewritten to mandate device verification **before** merge (replacing the prior "verify on production after deploy" mandate, which was the policy that caused the incident). New "Mobile Date Picker — Lesson Learned" section added before the events history table.
### Changed
- **Auto-deploy on push to `main` (2026-04-28)** — `.github/workflows/deploy.yml` now triggers automatically on every push to `main`. Manual `gh workflow run` remains available as a fallback for emergencies. Concurrency group `deploy-firebase` (with `cancel-in-progress: false`) ensures no overlapping deploys but never aborts an in-flight one. Merge to main = production deploy.

### Fixed
- **Version bumper (`scripts/update-version.cjs`) (2026-04-28)** — three bugs fixed: (1) `buildDate` was never updated (frozen at `2026-04-15`); (2) version numbers were ephemeral in CI — every deploy from the same git commit produced the same `v2026.04.151`, never advancing, because the bump was only persisted if someone manually committed `version.json` back; (3) `sw.js` `CACHE_VERSION` got `vv` double-prefix from string concatenation. Fix: derive version deterministically from current date + git short SHA (no file-state read, no persistence needed). New format: `v{YYYY}.{MM}.{DD}-{shortSha}` (e.g., `v2026.04.28-abc1234`). `buildDate` now updates per build. `sw.js` regex rewritten to replace the entire value, eliminating the double-v. Backward-compatible with `version.json` consumers — same 4 fields, only contents change.

### Removed
- **Playwright E2E test infrastructure (2026-04-28)**: deleted `playwright.config.ts`, the entire `e2e/` directory (8 spec files, 2 helpers, README, 9 screenshots), `.github/workflows/playwright.yml`, `.mcp.json` (which only registered Playwright MCP), the `@playwright/test` devDependency, and 5 `test:e2e*` scripts from `package.json`. Documentation across 12 markdown files cleaned up (CLAUDE.md, CHANGELOG.md, GymIQ-System-Spec.md, CODEATLAS.md, VIBEVIEW.md, ULTIMATE-PROJECT-SETUP-GUIDE.md, docs/architecture.md, docs/qa_scenarios.md, .claude/qa-testing-SKILL.md, תיעוד מערכת/*, e2e/README.md). The 3-tier testing policy (Build / Spec / Suite) was simplified to **Build + Vitest** only. Project verification: `npm run build` and `npm test`. No replacement framework was added — if E2E browser checks are needed, run them outside the project.

### Changed
- **Renamed `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD` → `ADMIN_EMAIL` / `ADMIN_PASSWORD` (2026-04-28)**: across the entire codebase — `.github/workflows/auto-draft-release-note.yml`, `scripts/draftReleaseNoteFromPR.ts`, and 14 maintenance/migration scripts (`scripts/fix-muscles-and-exercises.ts`, `inspect-zehava-trainer.ts`, `checkPrimaryMuscles.ts`, `migrateLastSeenReleaseNotes.ts`, `inspect-hang-workouts.ts`, `audit-exercise-report-types.ts`, `readMuscles.ts`, `backfillTrainerIdNull.ts`, `test-program-security.cjs`, `test-analysis-save.cjs`, `clearSecondaryMuscles.ts`, `test-program-generation.cjs`, `syncChangelogToReleaseNotes.ts`). The `E2E_` prefix was misleading — none of these credentials were related to Playwright; they have always been plain admin login creds for Firebase. `.env.local` and `.env.example` updated accordingly. **Action required before merge:** add `ADMIN_EMAIL` and `ADMIN_PASSWORD` as new GitHub Secrets in the repository settings, otherwise the auto-draft-release-note workflow will fail on the next successful deploy. Old `E2E_ADMIN_*` secrets can be deleted manually after verifying the new flow runs successfully.

### Added
- **טיוטה אוטומטית של "מה חדש" אחרי כל deploy (2026-04-26)**: workflow חדש `.github/workflows/auto-draft-release-note.yml` שנדלק ב-`workflow_run` כש-`Deploy to Firebase` מסתיים בהצלחה. מאתר את ה-PR שתואם ל-SHA שנפרס, מריץ את הסקריפט החדש `scripts/draftReleaseNoteFromPR.ts` שקורא ל-Claude Haiku 4.5 (עם prompt caching על system prompt) ומקבל JSON של `{titleHe, bodyHe (3 משפטים), iconEmoji}`, מתחבר כ-admin, וכותב טיוטה ל-collection הקיים `releaseNotes`. **Idempotent** לפי `changelogHash = "pr:<number>"` — הרצה כפולה לאותו PR מעדכנת ולא משכפלת. **דילוג אוטומטי** ל-PR פנימי בלבד (CI/טסטים/refactor) — Claude מתודרך להחזיר `titleHe: ""` במקרה זה. אין שינויי UI / schema / rules — מסתמך לגמרי על התשתית מ-PRs #91/#92. תלות חדשה: `@anthropic-ai/sdk@^0.91.1` כ-dev dep. **Secrets חדשים נדרשים ב-GitHub:** `ANTHROPIC_API_KEY` (חדש), `ADMIN_EMAIL` ו-`ADMIN_PASSWORD` (היו רק ב-`.env.local` עד עכשיו; ראה גם הערת ה-rename ב-`### Changed`).
- **פיצ'ר "מה חדש" — שלבים 2+3+4 (השלמת המעגל; שלב 1 כבר merged ב-PR #91)**:
  - **Admin UI (`ReleaseNotesManager`, route `/admin/release-notes`):** טבלה של כל ה-notes עם סינון לפי status (All/Drafts/Published/Archived) + כפתור "צור חדש" + מודל CRUD עם Markdown preview + פעולות publish/archive/delete. AdminLayout קיבל פריט ניווט "📝 הודעות עדכון" עם badge אדום של drafts count (`useQuery` עם staleTime 60s, refetchOnWindowFocus, ללא polling פעיל).
  - **UI למשתמש (Badge + Modal + Screen):** אייקון 🎁 ב-MainLayout וב-TrainerLayout עם `animate-pulse` + badge count; Modal אוטומטי שקופץ פעם אחת בסשן (`useRef` ברמת הקומפוננטה) אחרי 1 שנייה מה-mount, רק אם המשתמש מחובר + יש unseen notes + הנתיב אינו `/workout/session` או `/login`; מסך מלא `/whats-new` לכל ההיסטוריה. סגירת Modal מפעילה `markReleaseNotesAsSeen` + optimistic update של authStore מחושב מ-`max(unseenNotes.publishedAt) + 1ms` (לא `Date.now()`) כדי להתחמק מ-clock-skew race.
  - **סנכרון trainer + trainee:** TrainerLayout הוא standalone (לא wrapper של MainLayout), לכן קיבל Badge + Modal עצמאיים. כיסוי מלא לכל המשתמשים.
  - **MarkdownContent (`src/domains/whatsnew/components/MarkdownContent.tsx`):** wrapper סביב `react-markdown@9` עם whitelist מחמיר: `p, strong, em, ul, ol, li, br, a, h1-h4, code, blockquote`. אין `rehype-raw`, אין plugins המאפשרים HTML גולמי; קישורים נפתחים ב-`target="_blank"` עם `rel="noopener noreferrer"`.
  - **כרטיס "מה חדש?" בתחתית UserDashboard:** Link קבוע למסך `/whats-new` — משמש אחרי שה-Modal נסגר והבאדג' נעלם.
  - **מיגרציה `scripts/migrateLastSeenReleaseNotes.ts`:** חד-פעמית למשתמשים שקיימים לפני PR #91 וחסר להם השדה. תומכת `--dry-run` (מדפיסה UIDs בלי לכתוב) ובמצב real דורשת אישור `y/n` אינטראקטיבי. Batched writes של 500 documents. **חובה להריץ אחרי ה-deploy** — אחרת כל משתמש קיים יראה את כל ההיסטוריה כ"חדשה".
  - **סקריפט סנכרון `scripts/syncChangelogToReleaseNotes.ts`:** מנתח `CHANGELOG.md` לפי `## [version]` headings וכל bullet הופך ל-draft עם SHA-256 hash. `checkExistsByHash` מונע כפילויות בין ריצות. נוצרים רק drafts — admin חייב לפרסם ידנית מה-UI.
  - **תלויות חדשות:** `react-markdown@^9` (ללא plugins נוספים).
  - **scripts חדשים ב-package.json:** `migrate:release-notes`, `sync:release-notes` — שניהם דרך `npx tsx`.
  - **authStore:** פעולה חדשה `updateLastSeenReleaseNotes(date: Date)` לעדכון אופטימי של `user.lastSeenReleaseNotesAt` ב-in-memory state (הכתיבה ל-Firestore נעשית בנפרד ע״י `markReleaseNotesAsSeen` עם serverTimestamp).

### Added
- **תשתית Release Notes ("מה חדש") — שלב 1 / 4 (שכבת נתונים בלבד, ללא UI)**:
  - Collection חדש `releaseNotes` ב-Firestore: `version`, `changelogHash`, `titleHe`, `bodyHe` (Markdown בסיסי), `iconEmoji` (ברירת מחדל 🎁), `status` ('draft' | 'published' | 'archived'), `publishedAt`, `createdAt`, `updatedAt`, `audience` ('all' — שמור לעתיד), `order`.
  - שדה חדש ב-`users`: `lastSeenReleaseNotesAt` — מוטבע אוטומטית כ-`serverTimestamp()` בכל **שלושת** נתיבי יצירת המשתמש (כיסוי מלא למניעת הצצה של היסטוריה כ"חדשה"):
    1. `registerUser` (הרשמה עצמית דרך LoginPage) ב-`src/lib/firebase/auth.ts`
    2. `handleCreateUser` (יצירת משתמש ידנית ע״י אדמין) ב-`src/domains/admin/components/UsersList.tsx`
    3. `traineeAccountService.createTraineeAccount` (מאמן יוצר מתאמן) ב-`src/domains/trainer/services/traineeAccountService.ts`
  - **Defense-in-depth ב-`createAppUser`:** השדה נוסף **אחרי** בלוק ה-`.filter(... !== undefined)` ולא בתוכו, כדי שרפקטור עתידי של ה-filter לא יוריד אותו בשקט.
  - שירות חדש `src/lib/firebase/releaseNotes.ts` עם 10 פונקציות: `getPublishedReleaseNotes` (ממוין `publishedAt desc, createdAt desc`), `getAllReleaseNotes(statusFilter?)`, `getDraftsCount`, `checkExistsByHash` (לסקריפט הסנכרון בשלב 4), `createReleaseNote`, `updateReleaseNote`, `publishReleaseNote`, `archiveReleaseNote`, `deleteReleaseNote`, `getReleaseNoteById`.
  - `markReleaseNotesAsSeen(uid)` ב-`src/lib/firebase/users.ts`.
  - טיפוסים ייעודיים תחת `src/domains/whatsnew/types/releaseNote.types.ts` (`ReleaseNote`, `ReleaseNoteStatus`, `CreateReleaseNoteInput`, `UpdateReleaseNoteInput`).
  - `firestore.rules` — בלוק חדש: קריאה ל-`published` לכל משתמש מאומת + קריאה מלאה לאדמין (drafts/archived); כתיבה רק לאדמין. עדכון עצמי של `lastSeenReleaseNotesAt` מכוסה ע״י ה-rule הקיים של `/users/{userId}` (self-update, חסימת `role` בלבד).
  - `firestore.indexes.json` — composite index חדש על `releaseNotes`: `status ASC, publishedAt DESC, createdAt DESC`.
  - **לא נכלל בשלב 1**: Admin UI, Modal/Badge למשתמש, מיגרציה למשתמשים קיימים, סקריפט סנכרון מ-CHANGELOG. אלה מתוכננים לשלבים 2-4.

### Known Issues / Technical Debt (לא קשור למשימה הנוכחית — לא טופל בכוונה)

- **`UsersList.tsx` (יצירת משתמש ידנית ע״י אדמין) לא כותב `trainerId: null` למשתמשי `role='user'`** — בניגוד ל-`registerUser` וה-migration script `backfillTrainerIdNull.ts` שכן עושים את זה. התוצאה: משתמשים שנוצרו דרך Admin UI לא יופיעו ב-query של "מתאמנים לא-משויכים" (`where('trainerId', '==', null)`) עד שירוץ ה-backfill. לא טופל בתיקון הנוכחי כדי לא לערבב scope עם שלב 1 של Release Notes. יש לפתוח issue ייעודי.

- **Personal record row in exercise card** (PR #89): Each exercise during active workout now displays best historical performance (purple row) below last workout (red row). Uses existing `getBestPerformanceForExercises` query. Tailwind tokens only.

### Fixed
- **Date-picker modal dismissed on first tap (mobile, 2026-04-27)**: ב-iOS Safari, ה-modal "בחר תאריך" ב-`ExerciseLibrary` נפתח עם input ריק וסגירה ראשונה הייתה נסגרת בלחיצה — נדרש לפתוח שוב כדי שיעבוד. הסיבה: `useEffect` שקרא ל-`showPicker()` מתוך `setTimeout` ללא user-gesture (זרק SecurityError ב-iOS) + `onClick` נוסף ב-input שקרא שוב ל-`showPicker()` והתנגש עם ה-native picker שכבר נפתח אוטומטית במגע. **התיקון:** שני המקומות מותנים עכשיו ב-`pointer: fine` (desktop בלבד), עטופים ב-`try/catch`, ו-cleanup ל-`setTimeout` נוסף ב-useEffect כדי למנוע leaks אם המודל נסגר תוך 100ms. במכשירי מגע iOS/Android — ה-native picker נפתח כרגיל במגע, בלי קריאות JS מיותרות. (`src/domains/exercises/components/ExerciseLibrary.tsx`)
- **PR & last-workout rows per exercise reportType (2026-04-26)**: שורות "שיא" ו"אימון אחרון" בכרטיס תרגיל באימון פעיל הציגו `10 חזרות @ 0kg` עבור תרגילי קרדיו (הליכון, אופניים) בגלל שלושה באגים שהצטברו. (1) שתי השורות קראו מאותו שדה (`lastWorkoutData`), כך שהשורה הסגולה הייתה למעשה ה-PR בתחפושת. (2) `getBestPerformanceForExercises` חילץ תמיד `actualWeight` ו-`actualReps` ונפל ל-0 לטיפוסים לא-משקליים, יצר את ה-"0kg" המומצא; שדות קרדיו (speed/incline/intensity) לא נקראו כלל. (3) תוויות `personalRecord` ו-`lastWorkout` ב-design-tokens היו מוחלפות. **התיקון מערכתי**, לא ספציפי להליכון: נוצר `src/utils/reportTypeFields.ts` כמקור אמת יחיד לשדות שכל reportType משתמש בהם, לציר שמגדיר PR (הכי מהיר לקרדיו, הכי כבד למשקל, הכי ארוך לסיבולת), ולפורמט תצוגה. `getBestPerformanceForExercises` מקבל `reportTypeById` ומדרג מועמדים לפי הציר הנכון; רק שדות שדווחו (`>0`) נשמרים — בלי אפסים מומצאים. נוצרה `getLastWorkoutForExercises` חדשה שמוצאת את האימון האחרון של כל תרגיל ובוחרת את הסט הטוב בו לפי אותו ציר, כך שהשורה הסגולה מציגה נתוני אימון אחרון אמיתיים ולא PR. `useActiveWorkout` (3 נתיבי init: recovery, mid-workout add, new from selection) קורא לשני המקורות במקביל וממלא את `personalRecordData` ו-`lastWorkoutData` הנפרדים. `ExerciseCard` מרנדר כל שורה דרך `formatReportedFields(data, reportType)` ומסתיר את השורה לחלוטין כשאין שדה רלוונטי. הליכון מציג כעת `15:19 · 8 קמ"ש · שיפוע 3` במקום אפסים. `LastWorkoutData` הורחב ל-`ExerciseBestSet` (כל שדות הביצוע אופציונליים + `reportType`); alias ישן נשמר לתאימות. תוויות `personalRecord`/`lastWorkout` ב-design-tokens תוקנו. הוסרה `getLastWorkoutForExercises` ישנה (משקל/חזרות בלבד) שלא נקראה ממקום בקוד.
- **Trainer-mode historical data queries** (PR #89): Fixed pre-existing bug where trainer reporting for trainee saw their own historical data instead of trainee's. Affects 9 queries in `useActiveWorkout.ts`: last performance, best performance, exercise notes, and volumes. Affected red "last workout" row since inception; fix also applies to new purple PR row.
- **Trainer-mode workout ID validation** (PR #89): Fixed bug where `validateWorkoutId` always failed with `wrong_user` in trainer-mode because it received the trainer's `user.uid` instead of the trainee's `targetUserId`. This caused fallback paths (line 578 comment) and potential localStorage wipe of trainee data (line 631 logic). Both band-aids preserved as last-resort guards.

### Notes
- חוב הנגזר מהאימוץ של `lastWorkoutData` כשם לשדה PR נסגר ב-2026-04-26 — ה-shape פוצל ל-`personalRecordData` ול-`lastWorkoutData` נפרדים, ה-TODO ב-`active-workout.types.ts` הוסר.

## 2026-04-11

### Added
- **בחירת מאמן ע״י המתאמן** — מתאמן שנכנס ל-dashboard ללא מאמן משויך רואה באנר "בחר מאמן" (עם דילוג session-only). בלחיצה נפתח מסך ייעודי חדש `/trainers` שמציג רשימת כל המאמנים במערכת. בחירה → אישור → `users.trainerId` + `trainerRelationships` נכתבים אוטומטית, והמאמן רואה את המתאמן מיידית ב-TrainerDashboard. (`src/domains/trainee-onboarding/components/TrainerSelectionScreen.tsx`, `SelectTrainerPrompt.tsx`, `trainerService.getAvailableTrainers`, `trainerService.selfAssignTrainer`)
- **שדה "עיר" בהרשמה עצמית** — טופס ההרשמה ב-LoginPage כולל שדה עיר חדש (אופציונלי). הערך נשמר ב-`users.city` (`AppUser.city`, `registerUser` מקבל `city`, `RegisterDto.city`).
- **מאמן — "בחירה מרשימת מתאמנים" לפי עיר** — מודל הוספת מתאמן (`TraineeRegistrationModal`) קיבל טאבים: "רישום חדש" (התנהגות קיימת) ו-"בחירה מרשימה". הטאב החדש מציג את כל המתאמנים הלא-משויכים (`role=='user' && trainerId==null`) מקובצים לפי עיר, כאשר קטגוריית **"ללא עיר"** מופיעה ראשונה. בחירה → שיוך אוטומטי עם כל שדות המתאמן הקיימים (`trainerService.getUnassignedTrainees`).
- **`scripts/backfillTrainerIdNull.ts`** — סקריפט migration חד-פעמי שמשלים `trainerId: null` לכל משתמש `role=='user'` שאין לו את השדה (נדרש כדי שה-Firestore query `where('trainerId', '==', null)` יתפוס אותם). מאומת אל מול admin login.

### Changed
- **`users` collection: trainerId נרשם אוטומטית כ-null** עבור משתמשי `role=='user'` חדשים (`createAppUser`) — תנאי הכרחי ל-query של המתאמנים הלא-משויכים.
- **firestore.rules** — הרשאות קריאה הורחבו:
  - כל משתמש מאומת יכול לקרוא פרופילי מאמנים (`role == 'trainer'`) לשימוש מסך `/trainers`.
  - מאמנים יכולים לקרוא פרופילי מתאמנים לא-משויכים (`role == 'user' && trainerId == null`) לשימוש המסך "בחירה מרשימה".
  - מתאמן יכול ליצור `trainerRelationships` על עצמו (בעבר — רק מאמנים יכלו).

## 2026-04-08

### Fixed
- **תצוגת זמן בסטים מבוססי זמן (תלייה חופשית, פלאנק, קרדיו וכו')** — קודם תוצג רק `Math.round(time/60) דק׳`, מה שהפך תלייה של 20-45 שניות לתצוגה של "0 דק׳" או "1 דק׳" שגויה והסתיר את הזמן בפועל. עכשיו כל המסכים מציגים זמן בפורמט `mm:ss`:
  - **`WorkoutCard`** (היסטוריית מתאמן) — תצוגת זמן `mm:ss דק׳`, ובנוסף הצגת חזרות לצד הזמן עבור reportType כמו `reps_time` (כדי לא לאבד מידע)
  - **`TraineeRecentWorkouts`** (מסך מאמן — אימונים אחרונים של מתאמן) — קודם הציג רק `weight × reps`, עכשיו מציג גם זמן `mm:ss דק׳` כשקיים, עם em-dash כ-fallback אם אין נתונים בכלל
  - **`WorkoutHistoryEditor`** (עורך אימונים של מאמן, סטים שבוצעו במצב read-only) — אותו טיפול: זמן `mm:ss דק׳` + reps + weight כשקיימים
- **`TraineeDetail` — איחוד מקור נתונים של אימונים בודדים**: סקציית "אימונים בודדים" בכרטיס מתאמן עכשיו נשענת על אותו מקור (`workoutHistory` + `pending standalone programs`) שממנו נטענת סקציית "אימונים אחרונים", כך שהספירות והפריטים עקביים בין שתי התצוגות. הגדלת מגבלת טעינת היסטוריה ל-100 (מ-10) — אימונים סטנדאלון ישנים שבוצעו זוהו קודם בטעות כ-"ממתין לדיווח".
- **`TraineeRecentWorkouts` — תאריכים מלאים**: תאריכים מוצגים תמיד כ-`DD.MM.YYYY` במקום ביטויים יחסיים ("היום", "אתמול", "לפני X ימים").

### Added
- **`scripts/audit-exercise-report-types.ts`** — סקריפט קריאה-בלבד שמדפיס סקירה של כל ה-`reportTypes` בקולקציה, מסמן תרגילים עם reportType חסר, תרגילים שה-ID שלהם לא קיים בקולקציה, ותרגילים שה-parser ב-`SetReportRow` (שמנתח את ה-ID לזיהוי שדות) מחזיר עבורם תוצאה שלא תואמת ל-`fields[]` ב-Firebase.
- **`scripts/inspect-hang-workouts.ts`** — סקריפט קריאה-בלבד שמדפיס את הסטים האחרונים של תרגיל "תלייה חופשית על מתח" מ-`workoutHistory` של כל המשתמשים (admin only), כדי לאמת בפועל אם שדה `time` נשמר.

### Removed
- ניקוי `.claude/worktrees/amazing-austin` ו-`.claude/worktrees/great-bohr` (worktree submodules ישנים שכבר לא בשימוש).

## 2026-04-07

### Added
- **חשיפת אימונים עצמאיים של המתאמן/ת למאמן/ת**: כשמתאמן/ת בונה אימון בעצמה (טאב "תכנון חופשי" או הספרייה הרגילה) — בין אם להתחלה מיידית ובין אם בתכנון לעתיד / להיום — נוצר במקביל מסמך `trainingPrograms` עם `type: 'standalone'` ו-`createdByTrainee: true`. כך:
  - האימון מופיע אצל המאמנת בסקציית **"אימונים בודדים"** (עם תווית "נבנה ע״י המתאמן" סגולה)
  - האימון מופיע גם בסקציית **"אימונים אחרונים"** דרך `workoutHistory` עם `source: 'self_standalone'` ו-`programId` מקושר
  - אינדיקטור "בוצע" אצל המאמנת מתעדכן אוטומטית כי הקישור בין `workoutHistory.programId` ל-`trainingPrograms.id` נשמר לכל אורך מחזור החיים (תכנון → המשך → סיום)
  - ניתוח ביצועים, ספירת סטים שבועיים, וכל מקום שמסתמך על `workoutHistory` ממשיכים לעבוד אוטומטית — לוגיקה אחידה: אימון שבוצע = אימון שבוצע, נספר בכל מקום
- **שדה `createdByTrainee`** ב-`TrainingProgram` — מבחין בין standalone שנבנה ע״י המאמנת לבין כזה שנבנה ע״י המתאמן/ת
- **`source: 'self_standalone'`** חדש ב-`WorkoutHistoryEntry`/`WorkoutHistorySummary`
- **`programService.createSelfStandaloneProgram`** — helper ייעודי שיוצר standalone trainingProgram עם payload נקי (ללא undefined) עבור הזרימה של המתאמן/ת
- **`workoutBuilderStore.setSelfStandaloneProgram`** + שדה `programSource` — מבדיל בין programId שמקורו ב-trainer assignment לבין self-built standalone, ומועבר ל-`useActiveWorkout` עבור שמירה ב-`workoutHistory`

### Changed
- **`firestore.rules` (trainingPrograms)**: נוסף create rule שמתיר לכל user מאומת ליצור standalone trainingProgram עבור עצמו (כשהוא ה-traineeId), כל עוד `createdByTrainee == true`. בנוסף נוסף delete rule שמתיר למתאמן/ת למחוק את ה-standalone שבנה לעצמו
- **`useActiveWorkout`**: כל נקודות autoSave/save כעת מעבירות `programId` + `source` (`'trainer_program'` או `'self_standalone'`) במקום ה-hardcoded `'trainer_program'` הקודם. נקרא דרך `useWorkoutBuilderStore.getState()` כדי להימנע מ-stale closure ב-useCallback עם `[]` deps
- **`ExerciseLibrary.handleStartWorkout`**: לפני navigation/save מפעיל `maybeCreateSelfStandaloneProgram()` שמדלג אם מדובר ב-trainer report (`reportedBy`) או ב-continuing trainer program (`programId` כבר קיים)

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
