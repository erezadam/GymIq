# VIBEVIEW.md - GymIQ at a Glance

> Every file in the project, explained like you're reading a map.
> Each file gets a **conceptual name** - what it *is*, not what it's called.

---

## What is GymIQ?

A Hebrew gym tracking app (PWA) for trainees and their trainers.
You log workouts, track progress, get AI-generated workout plans, and your trainer can build programs for you and send messages.

**Stack:** React + TypeScript + Tailwind | Firebase (Auth, Firestore, Storage, Functions) | OpenAI GPT-4o | Vite | Vitest

---

## Root - The Foundation

| File | Conceptual Name | What it does |
|------|----------------|-------------|
| `package.json` | **The Blueprint** | All dependencies, scripts, and project metadata. v1.10.112. |
| `vite.config.ts` | **The Build Engine** | Configures Vite - dev server on port 3000, path aliases, build output. |
| `tailwind.config.js` | **The Style Dictionary** | Imports design tokens, defines custom colors/screens/shadows for Tailwind. |
| `postcss.config.js` | **The CSS Pipeline** | Connects Tailwind and Autoprefixer to the build. |
| `tsconfig.json` | **The Type Rulebook** | TypeScript compiler settings for the frontend. |
| `tsconfig.node.json` | **The Config Type Rulebook** | TypeScript settings for config files only. |
| `firebase.json` | **The Cloud Wiring** | Connects the app to Firebase: hosting, functions, Firestore, emulators. |
| `.firebaserc` | **The Project ID** | Maps this directory to a Firebase project. |
| `firestore.rules` | **The Bouncer** | Security rules - who can read/write which Firestore collections. Includes the trainerRelationships state machine (2 CREATE + 4 UPDATE rules) for the Trainer Approval Flow. |
| `firestore.indexes.json` | **The Query Optimizer** | Composite indexes for fast Firestore queries. |
| `index.html` | **The Shell** | The single HTML page where the entire React app mounts. |
| `vitest.config.ts` | **The Unit Test Director** | Configures unit/integration tests. |
| `.env` | **The Secret Vault** | Firebase API keys and config (never committed). |
| `.env.example` | **The Secret Template** | Shows which env vars you need, without actual values. |
| `.env.local` | **The Local Overrides** | Local-only env tweaks (e.g., emulator mode). |
| `.gitignore` | **The Exclusion List** | Files git should never track. |
| `CLAUDE.md` | **The Agent Constitution** | Iron-clad rules for the AI coding agent. The law of the land. |
| `CHANGELOG.md` | **The History Book** | What changed, when, and why. |
| `GymIQ_PRD.md` | **The Product Vision** | Product requirements - what GymIQ should be. |
| `GymIQ-System-Spec.md` | **The Technical Bible** | Detailed system specification. |
| `code-map-playground.html` | **The Code Explorer Toy** | Interactive HTML tool for visually browsing the codebase. |
| `design-playground.html` | **The Design Sandbox** | Interactive tool for testing UI elements. |
| `diff-review-playground.html` | **The Change Reviewer** | Interactive tool for reviewing git diffs. |

---

## `.claude/` - The Agent's Playbook

| File | Conceptual Name | What it does |
|------|----------------|-------------|
| `project-control-SKILL.md` | **The Mission Briefing** | How to define goals, scope, and "done" before any task. |
| `development-flow-SKILL.md` | **The Safety Checklist** | Mandatory steps before touching any code. |
| `qa-testing-SKILL.md` | **The Quality Gate** | Rules for testing: reproduce first, prove it works. |
| `mobile-rtl-SKILL.md` | **The Hebrew Mobile Guide** | RTL layout, mobile sizing, iOS quirks, Tailwind-only styling. |
| `firebase-data-SKILL.md` | **The Data Handbook** | Rules for Firestore changes: rules, migrations, validation. |
| `deployment-SKILL.md` | **The Launch Checklist** | Steps before any deploy: test, report, get approval. |
| `daily-workflow-SKILL.md` | **The Daily Routine** | Start-of-day branch check, end-of-day PR flow. |
| `documentation-SKILL.md` | **The Writing Guide** | When and how to update docs. |
| `EXERCISE_SETS_IMPLEMENTATION_GUIDE.md` | **The Set Builder Manual** | Deep dive on implementing curated exercise sets. |
| `lessons-learned/firestore-rules-investigation.md` | **The Post-Mortem** | What went wrong with a missing Firestore rule. |

---

## `.github/` - The Automation Hub

| File | Conceptual Name | What it does |
|------|----------------|-------------|
| `workflows/ci.yml` | **The Build Guard** | Runs `npm ci` + `npm run build` on every PR. Blocks merge if broken. |
| `PULL_REQUEST_TEMPLATE.md` | **The PR Form** | Template: what changed, how tested, what could break, rollback plan. |

---

## `public/` - Static Assets

| File | Conceptual Name | What it does |
|------|----------------|-------------|
| `sw.js` | **The Offline Brain** | Service Worker - caches the app shell, enables offline use, manages updates. |
| `manifest.json` | **The App Identity Card** | PWA config: name, icons, theme. Enables "Add to Home Screen". |
| `version.json` | **The Version Tag** | Current version + build timestamp. Polled to detect new deploys. |
| `icons/icon.svg` | **The App Face** | The GymIQ icon. |
| `images/exercise-placeholder.svg` | **The Missing Photo** | Placeholder when an exercise has no image. |

---

## `src/` - The React Frontend

### Entry Point & App Shell

| File | Conceptual Name | What it does |
|------|----------------|-------------|
| `main.tsx` | **The Ignition** | Mounts React, wraps everything in providers (queries, routing, auth, toasts). |
| `App.tsx` | **The Router** | All routes: public (login), user (dashboard/workouts/history), trainer, admin. Lazy-loads everything. |
| `index.css` | **The Base Styles** | CSS variables, global styles, animations, RTL utilities. |

### Providers (`src/app/providers/`)

| File | Conceptual Name | What it does |
|------|----------------|-------------|
| `AuthProvider.tsx` | **The Session Keeper** | Listens for Firebase auth changes, shows loading until resolved, cleans up stale workout data. |

### Route Guards (`src/app/router/guards/`)

| File | Conceptual Name | What it does |
|------|----------------|-------------|
| `AuthGuard.tsx` | **The Doorman** | Blocks unauthenticated users. Enforces role hierarchy (user < trainer < admin). |

### Layout (`src/design-system/layouts/`)

| File | Conceptual Name | What it does |
|------|----------------|-------------|
| `MainLayout.tsx` | **The App Frame** | Bottom nav bar (5 tabs), top header with user info, role badges. The shell everything lives in. |

### Design Tokens (`src/theme/` & `src/styles/`)

| File | Conceptual Name | What it does |
|------|----------------|-------------|
| `theme/tailwind-tokens.js` | **The Color Palette** | Single source of truth for all colors, shadows, and design values. |
| `theme/tokens.ts` | **The TypeScript Palette** | Same tokens but importable in TypeScript. |
| `styles/design-tokens.ts` | **The Spacing & Typography System** | Constants for spacing, border-radius, typography, z-index. |
| `styles/theme.ts` | **The Structured Theme** | Theme objects grouped by component type. |

### Utilities (`src/utils/`)

| File | Conceptual Name | What it does |
|------|----------------|-------------|
| `workoutValidation.ts` | **The Stale ID Cleaner** | Validates localStorage workout IDs against Firestore. Prevents ghost sessions. |
| `muscleTranslations.ts` | **The Muscle Translator** | Maps muscle IDs (`lats`, `quads`) to Hebrew names. |

### Shared Components (`src/shared/components/`)

| File | Conceptual Name | What it does |
|------|----------------|-------------|
| `LoadingSpinner.tsx` | **The Wait Signal** | Spinning loader, optionally full-screen. |
| `MuscleIcon.tsx` | **The Muscle Badge** | Visual icon for a muscle group. |
| `UpdateBanner.tsx` | **The New Version Alert** | Banner saying "new version available" with update button. |
| `WorkoutCard/WorkoutCard.tsx` | **The Workout Summary Card** | Shared card showing one workout: name, date, status, volume, exercises. |

### Hooks (`src/shared/hooks/`)

| File | Conceptual Name | What it does |
|------|----------------|-------------|
| `useVersionCheck.ts` | **The Update Watcher** | Polls for new app versions every 5 minutes. Triggers update flow. |

---

## `src/lib/firebase/` - The Data Layer

All Firestore/Auth operations. No component ever talks to Firebase directly.

| File | Conceptual Name | What it does |
|------|----------------|-------------|
| `config.ts` | **The Firebase Connection** | Initializes Firebase app, exports `db`, `auth`, `storage`. Hebrew language. |
| `auth.ts` | **The Auth Service** | Register, login, logout, password reset. First user becomes admin. |
| `exercises.ts` | **The Exercise Library Service** | CRUD for exercises. Category validation, auto-fix helpers. |
| `workoutHistory.ts` | **The Workout Memory** | Save/load/update workout history. Personal records. Volume tracking. Weight recommendations. Stats (streak, weekly, monthly). |
| `workouts.ts` | **The Live Session Service** | Manages active workout sessions in Firestore. |
| `users.ts` | **The User Admin Service** | List all users, change roles, delete users. |
| `muscles.ts` | **The Muscle Catalog Service** | CRUD for muscle groups. Hebrew name mapping. |
| `equipment.ts` | **The Equipment Catalog Service** | CRUD for equipment types. |
| `reportTypes.ts` | **The Measurement Types Service** | CRUD for how sets are measured (weight+reps, time, etc). |
| `bandTypes.ts` | **The Resistance Band Service** | CRUD for band types (colors, resistance levels). |
| `exerciseSets.ts` | **The Curated Sets Service** | CRUD for pre-built exercise packages. |
| `exerciseSetStorage.ts` | **The Set Storage Helper** | Local/remote storage for exercise set data. |
| `appSettings.ts` | **The App Settings Reader** | Reads global app settings from Firestore. |
| `releaseNotes.ts` | **The Release Notes Service** | CRUD for the "What's New" feed. Publish/archive transitions, hash-based dedup, admin-only writes. Published notes ordered by `publishedAt desc, createdAt desc`. |

---

## `src/domains/authentication/` - Login & Identity

| File | Conceptual Name | What it does |
|------|----------------|-------------|
| `components/LoginPage.tsx` | **The Front Door** | Login form, registration form, forgot password. All in Hebrew. |
| `store/authStore.ts` | **The Identity Vault** | Zustand store: who's logged in, their role, error messages in Hebrew. |
| `types/auth.types.ts` | **The Identity Types** | TypeScript types for users and auth state. |

---

## `src/domains/dashboard/` - The Home Screen

| File | Conceptual Name | What it does |
|------|----------------|-------------|
| `components/UserDashboard.tsx` | **The Command Center** | Home screen: streak, weekly stats, action cards (Start Workout, AI Trainer, History, Analysis). |

---

## `src/domains/exercises/` - The Exercise Library

### Types

| File | Conceptual Name | What it does |
|------|----------------|-------------|
| `types/exercise.types.ts` | **The Exercise Blueprint** | Core Exercise interface: name, category, muscle, equipment, difficulty, reportType, assistance. |
| `types/muscles.ts` | **The Muscle Map** | Muscle type unions, sub-muscle-to-category mapping, icons. |
| `types/reportTypes.ts` | **The Measurement Blueprint** | ReportType interface for dynamic set measurement types. |
| `types/bands.ts` | **The Band Blueprint** | BandType interface for resistance bands. |
| `types/exerciseSet.types.ts` | **The Package Blueprint** | Types for curated exercise set packages. |

### Services & Data

| File | Conceptual Name | What it does |
|------|----------------|-------------|
| `services/exerciseService.ts` | **The Exercise Librarian** | Wraps Firebase exercise operations for component use. |
| `data/mockExercises.ts` | **The Fake Exercises** | Legacy mock data. Only `difficultyOptions` is still used. |

### Components

| File | Conceptual Name | What it does |
|------|----------------|-------------|
| `components/ExerciseLibrary.tsx` | **The Exercise Picker** | Browse/search/filter exercises. Select to add to workout. Shows "recently done" badges. |
| `components/ExerciseCard.tsx` | **The Exercise Tile** | Single exercise display: image, name, muscle, equipment, difficulty. |
| `components/ExerciseSetCard.tsx` | **The Package Display** | Shows a curated exercise set. |
| `components/RecommendedSets.tsx` | **The Smart Suggestion** | AI/history-based weight/rep recommendations for an exercise. |

### Utils

| File | Conceptual Name | What it does |
|------|----------------|-------------|
| `utils/getExerciseImageUrl.ts` | **The Image Resolver** | Returns exercise image URL or placeholder. |

---

## `src/domains/workouts/` - The Heart of the App

### Types

| File | Conceptual Name | What it does |
|------|----------------|-------------|
| `types/workout.types.ts` | **The Workout DNA** | Core types: WorkoutSet (with extended fields), WorkoutExercise, WorkoutHistoryEntry, completion statuses. |
| `types/active-workout.types.ts` | **The Live Session DNA** | Types for the active workout screen: exercises, sets, groups, storage keys. |
| `types/workout-session.types.ts` | **The Step-by-Step DNA** | Types for the exercise-by-exercise flow. |

### Store

| File | Conceptual Name | What it does |
|------|----------------|-------------|
| `store/workoutBuilderStore.ts` | **The Workout Draft** | Zustand store: selected exercises, sets, name, schedule. Building a workout before starting it. |

### Hooks

| File | Conceptual Name | What it does |
|------|----------------|-------------|
| `hooks/useActiveWorkout.ts` | **The Workout Engine** | The most complex hook. Manages everything during a live workout: set tracking, auto-save, recovery, PR detection, celebrations, stats, finish/cancel. |
| `hooks/useWorkoutSession.ts` | **The Step Navigator** | Simpler hook for exercise-by-exercise navigation. |
| `hooks/useRestTimerAudio.ts` | **The Beep** | Plays a sound when rest timer finishes. |

### Services

| File | Conceptual Name | What it does |
|------|----------------|-------------|
| `services/aiTrainerService.ts` | **The AI Coach Caller** | Calls the Cloud Function to generate AI workouts. Sends exercises, muscles, history. |
| `services/aiTrainer.types.ts` | **The AI Coach Contract** | Types for AI trainer requests/responses. |
| `services/analysisService.ts` | **The AI Analyst Caller** | Calls the Cloud Function for AI training analysis. Caches results. |

### Components - Active Workout (`active-workout/`)

| File | Conceptual Name | What it does |
|------|----------------|-------------|
| `ActiveWorkoutScreen.tsx` | **The Gym Floor** | Main workout screen: all exercises grouped by muscle/equipment, rest timer, PR celebrations. |
| `MuscleGroupSection.tsx` | **The Muscle Block** | Collapsible section of exercises for one muscle group. |
| `ExerciseCard.tsx` | **The Exercise Station** | One exercise during workout: image, name, all set rows. |
| `SetReportRow.tsx` | **The Rep Logger** | Single set: enter weight/reps (or time/intensity), mark complete. |
| `WorkoutHeader.tsx` | **The Timer Bar** | Top bar: workout name, elapsed time, stop/pause buttons. |
| `ExerciseCounter.tsx` | **The Progress Meter** | "X/Y exercises done, Z sets completed". |
| `RestTimer.tsx` | **The Rest Clock** | Countdown timer with progress ring and audio alert. |
| `ConfirmationModal.tsx` | **The Are-You-Sure Dialog** | Confirms finish/exit/cancel actions. |
| `NotesModal.tsx` | **The Sticky Note** | Add notes to an exercise during workout. |
| `WorkoutSummaryModal.tsx` | **The Post-Game Report** | After finishing: volume, duration, exercises, sets, PRs, calorie input. |
| `WeightIncreasePopup.tsx` | **The Celebration** | Popup when you beat your previous weight or volume record. |

### Components - Session Mode (`workout-session/`)

| File | Conceptual Name | What it does |
|------|----------------|-------------|
| `WorkoutSessionScreen.tsx` | **The Guided Walk** | One exercise at a time with forward/back navigation. |
| `ExerciseNavigationHeader.tsx` | **The Step Counter** | Navigation arrows + exercise name + progress. |
| `ExerciseMedia.tsx` | **The Exercise Preview** | Shows exercise image/video. |
| `SetRow.tsx` | **The Set States** | Three variants: completed, active, upcoming set display. |
| `RestTimer.tsx` | **The Session Rest Clock** | Rest timer for this flow. |

### Components - AI Trainer (`ai-trainer/`)

| File | Conceptual Name | What it does |
|------|----------------|-------------|
| `AITrainerModal.tsx` | **The AI Workout Wizard** | Configure: duration, warmup, number of workouts, muscle selection mode. Generates AI workouts. |
| `AIBundleCard.tsx` | **The AI Package Card** | Displays a bundle of AI-generated workouts in history. |

### Other Workout Components

| File | Conceptual Name | What it does |
|------|----------------|-------------|
| `WorkoutBuilder.tsx` | **The Workout Assembler** | Drag-reorder exercises, configure sets/reps, name the workout, then start. |
| `WorkoutHistory.tsx` | **The Training Diary** | All past workouts, AI bundles, trainer programs. Continue/delete workouts. |
| `PersonalRecords.tsx` | **The Hall of Fame** | Personal bests per exercise with weight history charts. |
| `TrainingAnalysis.tsx` | **The AI Report Card** | AI-generated analysis: strengths, weaknesses, recommendations. |

---

## `src/domains/trainer/` - The Trainer System

### Types & Store

| File | Conceptual Name | What it does |
|------|----------------|-------------|
| `types/trainer.types.ts` | **The Trainer DNA** | Programs, days, exercises, messages, modifications, goals, specializations. |
| `store/trainerStore.ts` | **The Trainee List State** | Zustand store: trainees array with stats. |
| `store/messageStore.ts` | **The Message Counter** | Unread message count and cache. |

### Services

| File | Conceptual Name | What it does |
|------|----------------|-------------|
| `services/trainerService.ts` | **The Trainee Stats Loader** | Fetches all trainees with their workout stats. Also owns the Trainer Approval Flow: `requestTrainer`, `approveTrainerRequest` (httpsCallable wrapper), `rejectTrainerRequest`, `cancelTrainerRequest`, `getPendingRequestsForTrainer`, `hasActiveOrPendingTrainer`, `getMyLatestRelationshipState`. |
| `services/programService.ts` | **The Program Manager** | CRUD for weekly training programs. |
| `services/messageService.ts` | **The Messenger** | Send, read, reply, delete messages between trainer and trainee. |
| `services/traineeAccountService.ts` | **The Account Creator** | Creates new trainee accounts (auth + profile + relationship). |

### Hooks

| File | Conceptual Name | What it does |
|------|----------------|-------------|
| `hooks/useTrainerData.ts` | **The Dashboard Loader** | Loads trainees into store on mount. |
| `hooks/useTraineeProgram.ts` | **The My Program Loader** | Loads the active program for the current trainee. |
| `hooks/useTraineeAnalytics.ts` | **The Analytics Calculator** | Computes compliance, streak, PRs for a trainee. |
| `hooks/useTrainerMessages.ts` | **The Inbox Loader** | Loads messages for the trainer. |
| `hooks/useUnreadMessages.ts` | **The Badge Counter** | Returns unread count for navigation badge. |

### Components - Dashboard

| File | Conceptual Name | What it does |
|------|----------------|-------------|
| `TrainerLayout.tsx` | **The Trainer Shell** | Layout with trainer-specific navigation. |
| `TrainerDashboard.tsx` | **The Trainer HQ** | Stats overview + trainee list + "Add Trainee" button. |
| `TrainerDashboardTile.tsx` | **The Stat Chip** | Reusable metric tile (active trainees, weekly workouts, etc). |
| `TraineeCard.tsx` | **The Trainee Snapshot** | Card: name, last workout, streak, program progress, unread badge. |
| `PendingRequestsSection.tsx` | **The Approval Inbox** | Dashboard section listing pending trainer requests with approve/reject buttons (reject opens an optional-reason modal). Hidden when empty. |

### Components - Trainee Detail

| File | Conceptual Name | What it does |
|------|----------------|-------------|
| `TraineeDetail.tsx` | **The Trainee Deep Dive** | Full trainee view: profile, performance, workouts, program, messages. |
| `TraineeProfileSection.tsx` | **The Trainee Bio** | Personal info: age, weight, height, goals, limitations. |
| `TraineePerformance.tsx` | **The Performance Dashboard** | Workout frequency and volume trend charts. |
| `TraineeRecentWorkouts.tsx` | **The Recent Sessions** | Last N workouts for a trainee. |
| `TraineePersonalRecords.tsx` | **The Trainee's Bests** | PRs viewed by the trainer. |
| `TraineeEditModal.tsx` | **The Profile Editor** | Edit trainee's physical stats and goals. |
| `TraineeRegistrationModal.tsx` | **The New Trainee Form** | Create a new trainee account from scratch. |
| `StandaloneWorkoutEditor.tsx` | **The One-Off Builder** | Create a single standalone workout for a trainee. |

### Components - Program Builder

| File | Conceptual Name | What it does |
|------|----------------|-------------|
| `ProgramBuilder/ProgramBuilder.tsx` | **The Program Architect** | Build weekly programs: multiple days, drag exercises, AI generate option. |
| `ProgramBuilder/ProgramBuilderHeader.tsx` | **The Program Toolbar** | Name input, save, AI generate, back button. |
| `ProgramBuilder/ProgramDayCard.tsx` | **The Day Overview Card** | One training day's summary. |
| `ProgramBuilder/ProgramDayEditor.tsx` | **The Day Planner** | Edit exercises for a single training day. |
| `ProgramBuilder/ProgramExerciseEditor.tsx` | **The Exercise Configurator** | Set sets, rep range, rest time, notes for one exercise. |
| `ProgramBuilder/MobileDaySelector.tsx` | **The Day Tabs** | Mobile-friendly A/B/C/D day switcher. |
| `ProgramBuilder/MobileExerciseCard.tsx` | **The Mobile Exercise Tile** | Touch-friendly exercise card for program builder. |
| `ProgramBuilder/ProgramReview.tsx` | **The Final Check** | Review the complete program before saving. |
| `ProgramBuilder/TraineeSidePanel.tsx` | **The Context Panel** | Trainee info and last analysis visible while building. |
| `ProgramBuilder/TraineeHistoryPanel.tsx` | **The History Sidebar** | Trainee's recent workouts in the side panel. |

### Components - Program View (Trainee)

| File | Conceptual Name | What it does |
|------|----------------|-------------|
| `ProgramView/TraineeProgramView.tsx` | **My Weekly Plan** | The trainee sees their assigned program with "Start Day" buttons. |
| `ProgramView/ProgramDayDetail.tsx` | **The Day's Exercises** | Detail view of one training day. |
| `ProgramView/ProgramExerciseCard.tsx` | **The Exercise Preview Card** | One exercise in the program view. |
| `ProgramView/TrainerProgramCard.tsx` | **The Program Highlight** | Card in history showing the active trainer program. |

### Components - Messages

| File | Conceptual Name | What it does |
|------|----------------|-------------|
| `Messages/MessageCenter.tsx` | **The Trainer Inbox** | All trainee conversations. |
| `Messages/MessageList.tsx` | **The Chat Thread** | Messages between trainer and one trainee. |
| `Messages/MessageCard.tsx` | **The Message Bubble** | Single message with reply thread. |
| `Messages/MessageComposer.tsx` | **The Compose Box** | Write and send a new message. |

### Components - Trainee Inbox

| File | Conceptual Name | What it does |
|------|----------------|-------------|
| `TraineeInbox/TraineeInbox.tsx` | **My Messages** | Trainee's inbox from their trainer. |
| `TraineeInbox/InboxMessageCard.tsx` | **The Trainer's Note** | Single message from trainer. |
| `TraineeInbox/InboxBadge.tsx` | **The Unread Dot** | Small badge showing unread message count. |

### Components - Analytics

| File | Conceptual Name | What it does |
|------|----------------|-------------|
| `TraineeAnalytics/TraineeAnalytics.tsx` | **The Analytics Hub** | Tabbed analytics: streak, compliance, totals, PRs. |
| `TraineeAnalytics/StreakTab.tsx` | **The Streak Tracker** | Current/max streak with history chart. |
| `TraineeAnalytics/WeeklyComplianceTab.tsx` | **The Attendance Sheet** | Did the trainee hit their weekly target? |
| `TraineeAnalytics/TotalWorkoutsTab.tsx` | **The Counter** | Total workouts with monthly breakdown. |
| `TraineeAnalytics/PRTab.tsx` | **The Records Board** | All personal records by exercise. |
| `TraineeAnalytics/components/AIInsights.tsx` | **The AI Summary** | AI analysis embedded in analytics. |
| `TraineeAnalytics/components/HeatmapCalendar.tsx` | **The Activity Map** | Calendar heatmap of workout frequency. |
| `TraineeAnalytics/components/PatternChart.tsx` | **The Habit Graph** | When does the trainee typically work out? |
| `TraineeAnalytics/components/PRCard.tsx` | **The Record Card** | One personal record display. |
| `TraineeAnalytics/components/SkipAnalysis.tsx` | **The Skip Report** | Which exercises get skipped most? |
| `TraineeAnalytics/components/StatCard.tsx` | **The Number Card** | Generic stat display (number + label + trend). |
| `TraineeAnalytics/components/WeeklyProgressBars.tsx` | **The Weekly Bars** | Visual weekly completion vs. target. |

---

## `src/domains/admin/` - The Control Panel

| File | Conceptual Name | What it does |
|------|----------------|-------------|
| `components/AdminLayout.tsx` | **The Admin Shell** | Sidebar navigation to all admin sections. |
| `components/ExerciseList.tsx` | **The Exercise Table** | Paginated list of all exercises with edit/delete. |
| `components/ExerciseForm.tsx` | **The Exercise Editor** | Create/edit exercise: name, category, muscle, equipment, difficulty, images, instructions. Zod-validated. |
| `components/MuscleManager.tsx` | **The Muscle Editor** | CRUD for muscle groups. |
| `components/EquipmentManager.tsx` | **The Equipment Editor** | CRUD for equipment types. |
| `components/BandTypeManager.tsx` | **The Band Editor** | CRUD for resistance band types. |
| `components/ReportTypeManager.tsx` | **The Measurement Editor** | CRUD for how sets are measured. |
| `components/ExerciseSetManager.tsx` | **The Package Manager** | CRUD for curated exercise packages. |
| `components/ExerciseSetForm.tsx` | **The Package Editor** | Form for building an exercise set. |
| `components/ExerciseSetExercisePicker.tsx` | **The Package Picker** | Choose exercises for a set package. |
| `components/UsersList.tsx` | **The User Directory** | All users with role management. |
| `components/AdminSettings.tsx` | **The App Settings** | Global app configuration. |
| `components/ReleaseNotesManager.tsx` | **The Release Notes Editor** | Admin CMS for "What's New": list + filter + CRUD + publish/archive transitions. Embedded Markdown preview via `MarkdownContent`. Mounted at `/admin/release-notes`. |

---

## `src/domains/whatsnew/` - The Release Notes Domain

"מה חדש" feed — data layer (phase 1), Admin CMS, user-facing badge/modal/screen, migration script, and CHANGELOG sync are all wired. Published notes auto-popup once per session for each user, then remain accessible at `/whats-new`.

| File | Conceptual Name | What it does |
|------|----------------|-------------|
| `types/releaseNote.types.ts` | **The Release Note DNA** | Core types: `ReleaseNote` (version, changelogHash, titleHe, bodyHe, iconEmoji, status, publishedAt, order, audience), `ReleaseNoteStatus` ('draft'\|'published'\|'archived'), `CreateReleaseNoteInput`, `UpdateReleaseNoteInput` (status intentionally excluded — use dedicated transition functions). |
| `hooks/useReleaseNotes.ts` | **The Notes Loader** | `useQuery` wrapper for `getPublishedReleaseNotes` with 5-minute staleTime. Cache key: `['releaseNotes','published']`. |
| `hooks/useUnseenNotes.ts` | **The Badge Counter** | Computes `{ hasUnseen, unseenCount, unseenNotes }` by comparing `user.lastSeenReleaseNotesAt` against each published note's `publishedAt`. Robust to Firestore Timestamp / JS Date / null. |
| `hooks/useMarkReleaseNotesSeen.ts` | **The Seen Mutation** | `useMutation` calling `markReleaseNotesAsSeen(uid)`. Optimistic store update uses `max(unseenNotes.publishedAt) + 1ms` (server time) to avoid client-clock-skew race; `onError` rolls back. |
| `components/WhatsNewBadge.tsx` | **The Gift Icon** | 🎁 with `animate-pulse` + count badge. Returns `null` when `hasUnseen === false` (no dim/grey fallback). Clicking navigates to `/whats-new`. |
| `components/WhatsNewModal.tsx` | **The Auto-Popup** | Opens at most once per session via `useRef`. Guards: authenticated + hasUnseen + path not in `/workout/session`/`/login` + ≥1s since mount. Dismissing fires the mark-seen mutation. |
| `components/WhatsNewScreen.tsx` | **The Full History** | Route `/whats-new`. Always available; no dismiss logic — the canonical archive. |
| `components/MarkdownContent.tsx` | **The Safe Renderer** | Wraps `react-markdown@9` with a strict `allowedElements` whitelist (no `rehype-raw`, no HTML passthrough). External links open in new tab with `rel="noopener noreferrer"`. Used by Modal, Screen, and the admin preview. |

---

## `functions/` - The Cloud Backend

### Entry

| File | Conceptual Name | What it does |
|------|----------------|-------------|
| `src/index.ts` | **The Backend Gateway** | Initializes Firebase Admin and exports the deployed Cloud Functions: AI (`generateAIWorkout`, `generateTrainingAnalysis`, `generateAIProgram`), email (`sendWelcomeEmail`, `sendTrainerRequestEmail`, `sendTrainerRejectedEmail`), Trainer Approval (`approveTrainerRequest`), and admin (`updateUserEmail`). |

### AI Trainer (`functions/src/ai-trainer/`)

| File | Conceptual Name | What it does |
|------|----------------|-------------|
| `generateWorkout.ts` | **The Workout Generator** | Cloud Function: validates, rate-limits, calls GPT twice (muscle selection + workout creation), has fallback algorithm. |
| `openaiClient.ts` | **The GPT Whisperer** | Calls OpenAI API: muscle selection prompt, workout bundle prompt, exercise filtering. |
| `rateLimiter.ts` | **The Usage Meter** | Tracks daily AI usage per user. |
| `types.ts` | **The AI Trainer Contract** | Types for requests, responses, GPT schemas. |

### AI Analysis (`functions/src/ai-analysis/`)

| File | Conceptual Name | What it does |
|------|----------------|-------------|
| `generateAnalysis.ts` | **The Training Analyst** | Cloud Function: fetches 4-8 weeks of workouts, builds a detailed Hebrew prompt (volume, balance, progression), calls GPT, caches result. |
| `types.ts` | **The Analyst Contract** | Types for analysis requests and responses. |

### AI Program (`functions/src/ai-program/`)

| File | Conceptual Name | What it does |
|------|----------------|-------------|
| `generateProgram.ts` | **The Program Generator** | Cloud Function: verifies trainer role, fetches trainee context + analysis, calls GPT to create a weekly program, validates exercise IDs. |
| `types.ts` | **The Program Contract** | Types for program generation. |

### Email (`functions/src/email/`)

| File | Conceptual Name | What it does |
|------|----------------|-------------|
| `sendWelcomeEmail.ts` | **The Welcome Mailer** | Cloud Function: generates a password-reset link via Admin SDK and sends a branded RTL Hebrew welcome email through Resend. Called by `traineeAccountService.createTraineeAccount`. |
| `trainerApproval.ts` | **The Approval Mailer** | Three Trainer Approval Flow templates + Resend HTTP helper, all in one file. Exports `sendTrainerRequestEmail` (callable, trainee→trainer notification), `sendTrainerRejectedEmail` (callable, trainer→trainee notification), and `sendTrainerApprovedEmailDirect` (server-only helper called from inside the approve CF). |

### Trainer Approval (`functions/src/trainer-approval/`)

| File | Conceptual Name | What it does |
|------|----------------|-------------|
| `approveRequest.ts` | **The Atomic Approver** | Cloud Function `approveTrainerRequest` — runs `db.runTransaction` to set `relationship.status='active'` and `users.trainerId` together. Race-detection branch marks the request `rejected` with `TRAINEE_ALREADY_HAS_TRAINER` if the trainee was bound to another trainer concurrently. Sends approval email best-effort after commit. |

---

## `tests/` - Unit Tests

| File | Conceptual Name | What it does |
|------|----------------|-------------|
| `critical.spec.ts` | **The Regression Guard** | Critical tests including the 29/01 exercise data fields regression. |
| `firestore-undefined.spec.ts` | **The Undefined Sentinel** | Behavior tests for the Firestore-undefined iron rule (no `undefined` reaches `updateDoc`/`setDoc`/`addDoc`). Covers `removeUndefined()` recursion, FieldValue sentinels, and exercise/workout write paths. |
| `trainer-approval.spec.ts` | **The Approval Flow Guard** | 27 behavior tests for the Trainer Approval Flow service layer: `requestTrainer` (creates pending, no `user.trainerId` write, blocks on existing active/paused/pending), `approveTrainerRequest` (only invokes the CF, no client writes), `rejectTrainerRequest` (idempotent — silent no-op when not pending — plus reason handling and email trigger), `cancelTrainerRequest` (writes `cancelled`, never deletes), `getMyLatestRelationshipState` (30-day fade for ended/cancelled, never fades rejected), `hasActiveOrPendingTrainer` (paused must block). |
| `setup.ts` | **The Test Setup** | Configures jsdom and jest-dom matchers. |

---

## `scripts/` - Maintenance Tools

| File | Conceptual Name | What it does |
|------|----------------|-------------|
| `firebase-config.ts` | **The Script Connector (TS)** | Shared Firebase config for TypeScript scripts. Reads `.env`. |
| `firebase-config.cjs` | **The Script Connector (CJS)** | Same but CommonJS for `.cjs` scripts. |
| `update-version.cjs` | **The Version Bumper** | Auto-increments patch version before every build. |
| `migrateLastSeenReleaseNotes.ts` | **The Migration Script** | One-time: stamps `lastSeenReleaseNotesAt=serverTimestamp()` on users that lack the field (predate PR #91). Supports `--dry-run` and interactive `y/n` confirmation. Batched writes of 500. Run once post-deploy. |
| `syncChangelogToReleaseNotes.ts` | **The Changelog Syncer** | Parses `CHANGELOG.md`, converts each bullet to a `releaseNotes` draft with SHA-256 `changelogHash` for dedup. Drafts only — admin must publish from `/admin/release-notes`. |
| `importExercises.ts` | **The Exercise Importer** | One-time bulk import of exercises to Firestore. |
| `seedEmulatorExercises.ts` | **The Emulator Seeder** | Seeds local emulator with sample data. |
| `updateExerciseImages.ts` | **The Image Updater** | Bulk updates exercise image URLs. |
| `createTestUser.ts` | **The Test User Creator** | Creates a test account in Firebase. |
| `verify.sh` | **The Verification Script** | Pre/post-change checks. |
| `checkCategories.ts` | **The Category Checker** | Finds exercises with invalid categories. |
| `checkPrimaryMuscles.ts` | **The Muscle Checker** | Finds exercises with invalid primary muscles. |
| `checkIdField.ts` | **The ID Field Checker** | Checks for redundant stored ID fields. |
| `checkMissingImages.ts` | **The Image Checker** | Finds exercises missing images. |
| `checkPRData.ts` | **The PR Data Checker** | Validates personal record data structure. |
| `checkSpecificEquipment.ts` | **The Equipment Checker** | Finds equipment mismatches. |
| `checkUserRole.ts` | **The Role Checker** | Checks a user's role. |
| `compareExerciseStructure.ts` | **The Structure Comparer** | Finds inconsistencies in exercise documents. |
| `debugExercise.ts` | **The Exercise Inspector** | Debug a specific exercise document. |
| `findBenchPress.ts` | **The Bench Finder** | Finds bench press variations. |
| `listAllExerciseIds.ts` | **The ID Lister** | Lists all exercise IDs. |
| `muscleGapAnalysis.ts` | **The Gap Finder** | Which muscles need more exercises? |
| `muscleReport.ts` | **The Muscle Report** | Exercises per muscle group report. |
| `equipmentDryRun.ts` | **The Migration Preview** | Shows what equipment migration would change. |
| `fix-categories.cjs` | **The Category Fixer** | Fixes invalid categories in bulk. |
| `fix-exercise-category.cjs` | **The Single Category Fixer** | Fixes one exercise's category. |
| `fix-exercises-admin.cjs` | **The Bulk Exercise Fixer** | Admin-level bulk exercise fixes. |
| `fix-primary-muscles.cjs` | **The Muscle Fixer** | Fixes invalid primary muscle values. |
| `fix-muscles-and-exercises-admin.cjs` | **The Full Data Fixer** | Fixes both muscles and exercises. |
| `fix-muscles-and-exercises.ts` | **The Full Data Fixer (TS)** | TypeScript version of the above. |
| `find-category-mismatch.cjs` | **The Mismatch Finder** | Finds category/muscle misalignments. |
| `find-invalid-categories.cjs` | **The Invalid Category Finder** | Lists exercises with bad categories. |
| `analyze-exercises.cjs` | **The Exercise Analyzer** | Comprehensive data analysis report. |
| `test-analysis-save.cjs` | **The Analysis Save Test** | Tests AI analysis results save correctly. |
| `test-program-generation.cjs` | **The Program Gen Test** | Tests AI program generation end-to-end. |
| `test-program-security.cjs` | **The Security Test** | Tests Firestore rules for programs. |

---

## `docs/` - Documentation

| File | Conceptual Name | What it does |
|------|----------------|-------------|
| `architecture.md` | **The System Map** | Architecture overview with data flow diagrams. |
| `ai-trainer-spec.md` | **The AI Trainer Spec** | How the AI trainer works: requests, responses, fallbacks. |
| `ai-trainer-erd.md` | **The AI Data Model** | Entity-relationship diagram for AI trainer. |
| `CHANGELOG.md` | **The Change Log** | What changed and when. |
| `qa_scenarios.md` | **The Test Playbook** | Manual test scenarios. |
| `regressions.md` | **The Risk Register** | Known regression risks and how to test them. |
| `style_and_ui.md` | **The Style Guide** | UI/UX guidelines. |
| `workout-session-design.md` | **The Session Design** | How the workout session screen should work. |
| `features/soft-delete-spec.md` | **The Hide Feature Spec** | Trainee can hide trainer-reported workouts. |
| `features/weight-recommendations-spec.md` | **The Smart Weight Spec** | AI weight recommendations feature. |

---

## Firestore Collections - The Database

| Collection | Conceptual Name | What it holds |
|------------|----------------|---------------|
| `users` | **The User Registry** | Profiles, roles, fitness data. Has `aiData` subcollection. |
| `exercises` | **The Exercise Bible** | Every exercise in the library. |
| `muscles` | **The Muscle Dictionary** | Muscle groups and sub-muscles. |
| `equipment` | **The Gear List** | All equipment types. |
| `reportTypes` | **The Measurement Menu** | How sets can be tracked. |
| `bandTypes` | **The Band Catalog** | Resistance band types. |
| `exerciseSets` | **The Workout Packages** | Pre-built exercise combinations. |
| `workoutHistory` | **The Training Journal** | Every workout ever done. |
| `workoutSessions` | **The Live Sessions** | Currently active workouts. |
| `workoutTemplates` | **The Workout Recipes** | Reusable workout templates. |
| `trainerRelationships` | **The Connections** | Who trains whom. |
| `trainingPrograms` | **The Weekly Plans** | Programs assigned by trainers. |
| `trainerMessages` | **The Mailbox** | Trainer-trainee communication. |
| `exerciseRecommendations` | **The Smart Weights** | AI weight suggestions per exercise. |
| `aiTrainerUsage` | **The AI Workout Meter** | Rate limiting for AI workouts. |
| `aiAnalysisUsage` | **The AI Analysis Meter** | Rate limiting + cached analysis. |
| `aiProgramUsage` | **The AI Program Meter** | Rate limiting for AI programs. |
| `settings` | **The Control Switches** | App-wide settings. |
