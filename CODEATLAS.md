# CODEATLAS.md - GymIQ Navigation Map

> How to find anything. How everything connects.
> Follow the arrows. Follow the data.

---

## How to Read This Atlas

```
Component ──calls──▶ Hook ──calls──▶ Service ──calls──▶ Firebase Lib ──queries──▶ Firestore
    ▲                                                                                │
    └────────────────────────── data flows back ─────────────────────────────────────┘
```

---

## 1. Boot Sequence - What Happens When the App Starts

```
index.html
  └─▶ src/main.tsx                          ← The Ignition
        ├── Creates QueryClient (staleTime: 5min)
        ├── <QueryClientProvider>
        │     └── <BrowserRouter>
        │           ├── <AuthProvider>       ← src/app/providers/AuthProvider.tsx
        │           │     ├── Calls authStore.initialize()
        │           │     │     └── onAuthChange() ← Firebase auth listener
        │           │     │           └── Sets { user, isAuthenticated, isInitialized }
        │           │     ├── Runs cleanupWorkoutStorage(uid) once on login
        │           │     ├── Shows <LoadingSpinner> until isInitialized
        │           │     └── <App />        ← src/App.tsx
        │           │           ├── useVersionCheck() → polls /version.json every 5min
        │           │           └── <Suspense> + <Routes> (all lazy-loaded)
        │           └── <Toaster />          ← toast notifications
```

**Firebase initializes on module load** in `src/lib/firebase/config.ts`:
```
initializeApp(env vars) → getAuth() → getFirestore() → getStorage()
```

---

## 2. Route Map - Every Screen in the App

### User Routes (AuthGuard)

```
/                       → MainLayout (shell with bottom nav)
├── /dashboard          → UserDashboard        ← The Command Center
├── /exercises          → ExerciseLibrary       ← Browse & pick exercises
├── /workout/new        → ExerciseLibrary       ← Pick exercises for new workout
├── /workout/builder    → WorkoutBuilder        ← Configure before starting
├── /workout/session    → ActiveWorkoutScreen   ← THE gym screen
├── /workout/history    → WorkoutHistory        ← Training diary
├── /workout/history/:id → WorkoutHistory       ← Deep link to specific workout
├── /personal-records   → PersonalRecords       ← Hall of fame
├── /analysis           → TrainingAnalysis      ← AI report card
├── /inbox              → TraineeInbox          ← Messages from trainer
├── /progress           → UserDashboard         ← (placeholder)
└── /profile            → UserDashboard         ← (placeholder)
```

### Trainer Routes (AuthGuard role="trainer")

```
/trainer                       → TrainerLayout + TrainerDashboard
├── /trainer/trainee/:id       → TraineeDetail          ← Full trainee view
├── /trainer/trainee/:id/messages → TraineeDetail       ← Messages tab
├── /trainer/trainee/:id/personal-records → TraineePersonalRecords
├── /trainer/trainee/:id/analytics → TraineeAnalytics   ← Charts & stats
├── /trainer/program/new       → ProgramBuilder          ← Build weekly program
├── /trainer/program/:id/edit  → ProgramBuilder          ← Edit existing
└── /trainer/messages          → MessageCenter           ← All conversations
```

### Admin Routes (AuthGuard role="admin")

```
/admin                  → AdminLayout → redirect to /admin/exercises
├── /admin/exercises    → ExerciseList        ← All exercises table
├── /admin/exercises/new → ExerciseForm       ← Create exercise
├── /admin/exercises/:id/edit → ExerciseForm  ← Edit exercise
├── /admin/muscles      → MuscleManager       ← Muscle group CRUD
├── /admin/equipment    → EquipmentManager    ← Equipment CRUD
├── /admin/band-types   → BandTypeManager     ← Resistance bands CRUD
├── /admin/exercise-sets → ExerciseSetManager ← Curated packages CRUD
├── /admin/report-types → ReportTypeManager   ← Measurement types CRUD
├── /admin/users        → UsersList           ← Role management
└── /admin/settings     → AdminSettings       ← App config
```

### Public

```
/login                  → LoginPage (GuestGuard - redirects if already logged in)
/*                      → redirect to /login
```

### Role Hierarchy

```
admin (2) ──passes──▶ trainer guards + user guards
trainer (1) ──passes──▶ user guards only
user (0) ──passes──▶ user guards only
```

---

## 3. Navigation Structure - The Shell

### MainLayout - Bottom Nav (all users)

```
┌─────────────────────────────────────────────┐
│  Header: user name + role badges            │
│  [Trainer shortcut]  [Admin shortcut]       │
├─────────────────────────────────────────────┤
│                                             │
│              <Outlet />                     │
│         (page content here)                 │
│                                             │
├─────────────────────────────────────────────┤
│  🏠        📚        📋       📈       👤   │
│ דשבורד    ספריה   היסטוריה  התקדמות  פרופיל  │
│ /dashboard /exercises /workout  /progress   │
│                      /history   /profile    │
└─────────────────────────────────────────────┘
```

Hidden when on `/workout/session` (full-screen workout mode).

### TrainerLayout - Sidebar

```
┌──────────┬──────────────────────────────────┐
│ מתאמנים  │                                  │
│ /trainer │                                  │
│          │         <Outlet />               │
│ תוכניות  │     (trainer content here)       │
│ /program │                                  │
│          │                                  │
│ הודעות   │                                  │
│ /messages│                                  │
│          │                                  │
│ ← חזרה  │                                  │
│/dashboard│                                  │
└──────────┴──────────────────────────────────┘
```

---

## 4. The Workout Lifecycle - The Core Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 1: Pick Exercises                                              │
│                                                                     │
│ UserDashboard ──"אימון חדש"──▶ /workout/new ──▶ ExerciseLibrary    │
│                                                                     │
│ ExerciseLibrary                                                     │
│   ├── exerciseService.getExercises() ──▶ Firestore 'exercises'     │
│   ├── User taps exercise ──▶ exerciseService.getExerciseById(id)   │
│   └── workoutBuilderStore.addExercise({                            │
│         exerciseId, name, nameHe, image,                           │
│         primaryMuscle, category, equipment, reportType             │
│       })                                                            │
│         ⚠️ ALL fields required (iron rule from 29/01 regression)   │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 2: Build Workout                                               │
│                                                                     │
│ WorkoutBuilder (/workout/builder)                                   │
│   ├── Reads from workoutBuilderStore                               │
│   ├── User can: reorder (drag), add/remove sets, name workout      │
│   ├── Default: 3 sets per exercise, 90s rest                       │
│   └── "התחל אימון" ──▶ navigate('/workout/session')               │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 3: Active Workout                                              │
│                                                                     │
│ ActiveWorkoutScreen ──uses──▶ useActiveWorkout() hook              │
│                                                                     │
│ On mount (initWorkout):                                            │
│   ├── Check localStorage 'continueWorkoutData' (resume flow)      │
│   ├── Load exercises from workoutBuilderStore                      │
│   ├── Fetch: lastWorkoutData, notes, weightRecommendations        │
│   ├── Create ActiveWorkout in React state + localStorage           │
│   ├── autoSaveWorkout(null, data) ──▶ creates Firestore doc       │
│   │     └── Stores ID in state + localStorage                     │
│   └── Start elapsed timer (1s interval)                            │
│                                                                     │
│ During workout:                                                     │
│   ├── updateSet() ──▶ triggerAutoSave() (debounced 2s)            │
│   │     └── autoSaveWorkout(id, data) ──▶ updates Firestore doc   │
│   ├── PR detection: compares weight/volume to historical bests     │
│   │     └── Shows WeightIncreasePopup (celebration!)               │
│   └── RestTimer: countdown between sets with audio alert           │
│                                                                     │
│ Finish:                                                             │
│   ├── confirmFinish() ──▶ check incomplete exercises               │
│   ├── WorkoutSummaryModal ──▶ user enters calories                 │
│   └── finishWorkoutWithCalories() ──▶ doFinish()                  │
│         ├── completeWorkout(id, data) ──▶ updates Firestore        │
│         ├── calculateAndSaveWeightRecommendations()                │
│         ├── Clear store + localStorage                             │
│         └── navigate('/workout/history')                           │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 4: History                                                     │
│                                                                     │
│ WorkoutHistory (/workout/history)                                   │
│   ├── getUserWorkoutHistory(userId)                                │
│   │     └── Firestore query: workoutHistory, userId, ordered desc  │
│   ├── Renders WorkoutCard components                               │
│   ├── "המשך אימון" flow:                                          │
│   │     completed → creates NEW workout (blank sets)               │
│   │     in_progress/cancelled/planned → UPDATES existing doc       │
│   └── Soft delete (trainee can hide trainer-reported workouts)     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 5. AI Trainer Flow

```
UserDashboard ──"מאמן AI"──▶ AITrainerModal opens
                              │
                              │ User configures:
                              │   duration (30/45/60/90 min)
                              │   warmup (0/5/10/15 min)
                              │   workouts (1-7)
                              │   muscles: ai_rotate | same | manual
                              │
                              ▼
                  aiTrainerService.generateAIWorkouts(request)
                              │
                    ┌─────────┴──────────┐
                    │ Build context       │
                    │ (parallel fetches)  │
                    ├─ getExercises()     │
                    ├─ getMuscles()       │
                    ├─ getWorkoutHistory()│
                    ├─ getRecentlyDone()  │
                    └────────┬───────────┘
                             │
                             ▼
              httpsCallable('generateAIWorkout')
                             │
         ┌───────────────────┴───────────────────┐
         │     Cloud Function (Node.js)           │
         │     functions/src/ai-trainer/          │
         │                                        │
         │  1. checkRateLimit(userId)             │
         │  2. fetchLastAnalysis(userId)          │
         │       └─ users/{uid}/aiData            │
         │  3. GPT Call 1: muscle selection       │
         │       └─ callGPTForMuscleSelection()   │
         │  4. Filter exercises by muscles        │
         │  5. GPT Call 2: workout generation     │
         │       └─ callGPTForBundle()            │
         │  6. Validate exercise IDs              │
         │  7. incrementUsage()                   │
         │                                        │
         │  Fallback: generateFallbackWorkout()   │
         │  (random selection if GPT fails)       │
         └───────────────────┬───────────────────┘
                             │
                             ▼
              For each generated workout:
                saveWorkoutHistory({
                  status: 'planned',
                  source: 'ai_trainer',
                  bundleId: '...'
                }) ──▶ Firestore 'workoutHistory'
                             │
                             ▼
              AITrainerModal shows success
              User closes ──▶ WorkoutHistory shows planned workouts
              User taps "המשך" ──▶ loads into builder ──▶ starts session
```

---

## 6. AI Analysis Flow

```
/analysis ──▶ TrainingAnalysis.tsx
                  │
                  ├── On mount: getCachedAnalysis(userId)
                  │     └── Firestore 'aiAnalysisUsage/{userId}_latest'
                  │     └── If found → show cached result + "רענן" button
                  │
                  └── "צור ניתוח" or auto-fetch:
                        analysisService.getTrainingAnalysis(userId)
                              │
                              ▼
                httpsCallable('generateTrainingAnalysis')
                              │
              ┌───────────────┴───────────────────┐
              │     Cloud Function (Node.js)       │
              │     functions/src/ai-analysis/     │
              │                                    │
              │  1. checkRateLimit                 │
              │  2. Fetch in parallel:             │
              │     ├─ user profile (users/)       │
              │     ├─ exercises (exercises/)       │
              │     ├─ muscles (muscles/)           │
              │     └─ workout history (4-8 weeks)  │
              │  3. Min 4 workouts required        │
              │  4. Build Hebrew analysis prompt   │
              │     (volume, balance, progression) │
              │  5. GPT-4o → JSON response         │
              │  6. Save cache:                    │
              │     ├─ aiAnalysisUsage/{id}_latest │
              │     └─ users/{uid}/aiData/         │
              │         lastAnalysis (for AI       │
              │         Trainer to use as context) │
              └───────────────┬───────────────────┘
                              │
                              ▼
              TrainingAnalysis.tsx renders:
                title, overview, strengths[],
                weaknesses[], recommendations[]
```

---

## 7. AI Program Generation Flow

```
ProgramBuilder ──"AI Generate"──▶ Cloud Function call
                                    │
                  ┌─────────────────┴─────────────────┐
                  │     Cloud Function (Node.js)       │
                  │     functions/src/ai-program/      │
                  │                                    │
                  │  1. Verify: caller is trainer/admin│
                  │     with active relationship       │
                  │  2. checkRateLimit (3/day)         │
                  │  3. Fetch in parallel:             │
                  │     ├─ trainee profile             │
                  │     ├─ last AI analysis            │
                  │     ├─ existing program            │
                  │     └─ all exercises               │
                  │  4. Hebrew prompt → GPT-4o         │
                  │  5. Validate exercise IDs          │
                  │  6. Return program structure       │
                  └─────────────────┬─────────────────┘
                                    │
                                    ▼
                  ProgramBuilder receives program →
                  programService.createProgram() →
                  Firestore 'trainingPrograms'
```

---

## 8. Trainer-Trainee Relationship Flow

```
TRAINER CREATES TRAINEE:
  TrainerDashboard ──"הוסף מתאמן"──▶ TraineeRegistrationModal
    │
    ▼
  traineeAccountService.createTraineeAccount():
    1. Create SECONDARY Firebase app (prevents trainer logout)
    2. createUserWithEmailAndPassword() → new Auth user
    3. setDoc('users/{uid}', { role:'user', trainerId })
    4. createRelationship('trainerRelationships/{id}',
         { trainerId, traineeId, status:'active' })
    5. sendPasswordResetEmail() → trainee sets own password
    6. Delete secondary app

TRAINER BUILDS PROGRAM:
  TraineeDetail ──▶ ProgramBuilder (/trainer/program/new?traineeId=xxx)
    │
    ├── Pick exercises per day (A/B/C/D...)
    ├── Set reps/sets/rest per exercise
    │
    └── handleSave(activate=true):
          programService.createProgram() ──▶ Firestore 'trainingPrograms'
          programService.activateProgram() ──▶ status: 'active'

TRAINEE SEES PROGRAM:
  WorkoutHistory.tsx
    │
    ├── useTraineeProgram() ──▶ programService.getTraineeActiveProgram()
    │     └── Firestore query: trainingPrograms where traineeId + status='active'
    │
    └── TrainerProgramCard rendered at top of history
          │
          └── "התחל אימון" ──▶ loadFromProgram(day)
                ├── workoutBuilderStore populated from program day
                └── navigate('/workout/builder') ──▶ normal workout flow

MESSAGING:
  Trainer:  MessageCenter ──▶ messageService ──▶ Firestore 'trainerMessages'
  Trainee:  TraineeInbox  ──▶ messageService ──▶ Firestore 'trainerMessages'
```

---

## 9. Auth Flow

```
/login ──▶ LoginPage.tsx
             │
             ├── Login: authStore.login(email, password)
             │    └── loginUser() ──▶ signInWithEmailAndPassword()
             │         └── getDoc('users/{uid}') ──▶ returns AppUser
             │
             └── Register: authStore.register(email, pwd, name, phone)
                  └── registerUser()
                       ├── createUserWithEmailAndPassword()
                       ├── First user ever → role = 'admin'
                       └── setDoc('users/{uid}', userData)

authStore (Zustand, persisted to localStorage 'gymiq-auth'):
  initialize() ──▶ onAuthChange(callback)
    └── onAuthStateChanged(auth, user => ...)
         ├── user exists → fetch Firestore profile → set state
         └── no user → clear state

AuthProvider:
  Shows <LoadingSpinner> until authStore.isInitialized = true
  Then renders <App /> (routes)

Guards (src/app/router/guards/AuthGuard.tsx):
  AuthGuard:  !authenticated → redirect /login
              role < required → redirect /dashboard
  GuestGuard: authenticated → redirect /dashboard (admin → /admin)
```

---

## 10. State Management Map

### Zustand Stores

```
┌─────────────────────────────────────────────────────────────┐
│ useAuthStore (PERSISTED to localStorage 'gymiq-auth')       │
│ src/domains/authentication/store/authStore.ts               │
│                                                             │
│ State: user, isAuthenticated, isLoading, isInitialized,     │
│        error                                                │
│ Actions: initialize, login, register, logout,               │
│          sendPasswordReset, clearError                      │
│                                                             │
│ Used by: AuthProvider, AuthGuard, every screen that needs   │
│          current user info                                  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ useWorkoutBuilderStore (NOT persisted)                      │
│ src/domains/workouts/store/workoutBuilderStore.ts           │
│                                                             │
│ State: workoutName, selectedExercises[], scheduledDate,     │
│        programId, programDayLabel, targetUserId             │
│ Actions: addExercise, removeExercise, reorderExercise,      │
│          addSet, removeSet, updateSet, clearWorkout,        │
│          loadFromProgram, addExercisesFromSet               │
│                                                             │
│ Used by: ExerciseLibrary, WorkoutBuilder,                   │
│          useActiveWorkout, WorkoutHistory (continue flow)   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ useTrainerStore (NOT persisted)                             │
│ src/domains/trainer/store/trainerStore.ts                   │
│                                                             │
│ State: trainees[], isLoading, error                         │
│ Actions: setTrainees, setLoading, setError, updateTrainee   │
│                                                             │
│ Used by: TrainerDashboard, useTrainerData hook              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ useMessageStore (NOT persisted)                             │
│ src/domains/trainer/store/messageStore.ts                   │
│                                                             │
│ State: unreadCount, messages cache                          │
│ Used by: TrainerDashboard, InboxBadge                       │
└─────────────────────────────────────────────────────────────┘
```

### TanStack Query (limited usage)

```
Used mainly in Admin domain:
  ExerciseList    → useQuery(['exercises'])
  ExerciseForm    → useQuery + useMutation
  MuscleManager   → useQuery(['muscles'])
  EquipmentManager → useQuery(['equipment'])

Most data fetching uses direct async/await in useEffect.
```

### localStorage Keys

```
gymiq-auth                    → persisted auth state (Zustand)
gymiq_active_workout          → current workout data (crash recovery)
gymiq_firebase_workout_id     → Firestore doc ID of active workout
gymiq_workout_start_time      → when workout started
continueWorkoutData           → data for "continue workout" flow
gymiq_cleanup_done_{uid}      → flag: stale workout IDs cleaned up
```

---

## 11. Data Flow Patterns

### Pattern A: Component → Firebase Lib (direct)

```
WorkoutHistory.tsx
  → import { getUserWorkoutHistory } from '@/lib/firebase/workoutHistory'
  → getUserWorkoutHistory(userId)
  → Firestore query → returns data
```

### Pattern B: Component → Service → Firebase Lib

```
ExerciseLibrary.tsx
  → import { exerciseService } from '@/domains/exercises/services'
  → exerciseService.getExercises(filters)
  → lib/firebase/exercises.ts → getExercises()
  → Firestore query → returns data
```

### Pattern C: Component → Hook → Service → Firebase Lib

```
TrainerDashboard.tsx
  → useTrainerData() hook
  → trainerService.getTrainerTrainees(trainerId)
  → Firestore queries (relationships + users + stats)
  → Returns TraineeWithStats[]
```

### Pattern D: Component → Hook → Cloud Function → GPT → Firestore

```
AITrainerModal.tsx
  → aiTrainerService.generateAIWorkouts(request)
  → httpsCallable('generateAIWorkout')
  → Cloud Function: validate → GPT calls → validate response
  → Save results to Firestore
  → Return to client
```

---

## 12. Firestore Collections - The Database Map

```
Firestore
├── users/{uid}                          ← User profiles & roles
│   └── aiData/lastAnalysis              ← Cached AI analysis (for AI Trainer context)
│
├── exercises/{id}                       ← Exercise library (admin-managed)
├── muscles/{id}                         ← Muscle groups (admin-managed)
├── equipment/{id}                       ← Equipment types (admin-managed)
├── reportTypes/{id}                     ← Measurement types (admin-managed)
├── bandTypes/{id}                       ← Resistance band types (admin-managed)
├── exerciseSets/{id}                    ← Curated exercise packages (admin-managed)
│
├── workoutHistory/{id}                  ← ALL workouts (every status)
│     Fields: userId, date, status, exercises[], duration,
│             totalVolume, calories, source, programId,
│             bundleId (AI), aiWorkoutNumber, deletedByTrainee
│
├── workoutSessions/{id}                 ← Live active sessions
├── workoutTemplates/{id}                ← Reusable templates
├── exerciseRecommendations/{id}         ← AI weight suggestions
│
├── trainingPrograms/{id}                ← Weekly programs (trainer→trainee)
│     Fields: trainerId, traineeId, name, status,
│             weeklyStructure: [{ dayLabel, exercises[] }]
│
├── trainerRelationships/{id}            ← Who trains whom
│     Fields: trainerId, traineeId, status, createdAt
│
├── trainerMessages/{id}                 ← Trainer↔trainee messages
│     Fields: senderId, receiverId, type, content,
│             replies[], readAt, priority
│
├── aiTrainerUsage/{userId}_{date}       ← Rate limit: AI workouts
├── aiAnalysisUsage/{userId}_{date}      ← Rate limit: AI analysis
├── aiAnalysisUsage/{userId}_latest      ← Cached analysis result
├── aiProgramUsage/{trainerId}_{date}    ← Rate limit: AI programs (3/day)
│
├── releaseNotes/{id}                   ← "What's New" feed (admin-managed)
│     Fields: version, changelogHash, titleHe, bodyHe (Markdown),
│             iconEmoji, status (draft|published|archived),
│             publishedAt, order, audience ('all')
│     Read: published → any authenticated user; drafts/archived → admin only
│     Write: admin only
│
└── settings/{id}                        ← App-wide settings
```

> **Note:** `users/{uid}` also carries `lastSeenReleaseNotesAt` — stamped at
> registration so a new user never sees the entire Release Notes history as new.

---

## 13. Cloud Functions - The Backend

```
functions/src/index.ts exports 3 functions:
│
├── generateAIWorkout        ← functions/src/ai-trainer/
│   ├── generateWorkout.ts      Main logic: validate → rate limit → GPT×2 → fallback
│   ├── openaiClient.ts         GPT calls: muscle selection + workout bundle
│   ├── rateLimiter.ts          Daily usage tracking
│   └── types.ts                Request/response types
│
├── generateTrainingAnalysis ← functions/src/ai-analysis/
│   ├── generateAnalysis.ts     Main logic: fetch history → build prompt → GPT → cache
│   └── types.ts                Request/response types
│
└── generateAIProgram        ← functions/src/ai-program/
    ├── generateProgram.ts      Main logic: verify trainer → fetch context → GPT → validate IDs
    └── types.ts                Request/response types

All use: OpenAI GPT-4o | Firebase Admin SDK | JSON response mode
```

---

## 14. File Dependency Map - Who Imports Whom

### The Foundation Layer (everything depends on these)

```
src/lib/firebase/config.ts ──▶ exports: app, auth, db, storage
  ↑ imported by ALL firebase service files

src/domains/authentication/store/authStore.ts ──▶ exports: useAuthStore
  ↑ imported by most components and guards
```

### The Critical Hook

```
src/domains/workouts/hooks/useActiveWorkout.ts
  imports from:
    ├── workoutBuilderStore (workout configuration)
    ├── authStore (current user)
    ├── lib/firebase/workoutHistory (save, load, auto-save, complete, PRs, volumes)
    ├── lib/firebase/exercises (getExerciseById)
    ├── lib/firebase/muscles (getMuscleIdToNameHeMap)
    └── utils/workoutValidation (validateWorkoutId, isNetworkError)
```

### WorkoutHistory - The Hub

```
src/domains/workouts/components/WorkoutHistory.tsx
  imports from:
    ├── lib/firebase/workoutHistory (history, workout details, updates, delete)
    ├── lib/firebase/muscles (Hebrew names)
    ├── lib/firebase/bandTypes (band data)
    ├── authStore (current user)
    ├── workoutBuilderStore (populate for "continue")
    ├── exerciseService (load exercise details for continue)
    ├── shared/components/WorkoutCard
    ├── ai-trainer/AIBundleCard
    ├── trainer/ProgramView/TrainerProgramCard
    └── trainer/hooks/useTraineeProgram
```

---

## 15. Domain Boundaries

```
┌─────────────────────────────────────────────────────────────────┐
│                        src/domains/                              │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ authentication│  │   dashboard  │  │  exercises   │          │
│  │              │  │              │  │              │          │
│  │ LoginPage    │  │UserDashboard │  │ExerciseLib   │          │
│  │ authStore    │  │              │  │ExerciseCard  │          │
│  │              │  │              │  │exerciseService│         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                 │                  │                   │
│         ▼                 ▼                  ▼                   │
│  ┌──────────────────────────────────────────────────────┐       │
│  │                    workouts                           │       │
│  │                                                       │       │
│  │  WorkoutBuilder ──▶ ActiveWorkoutScreen              │       │
│  │  WorkoutHistory ──▶ PersonalRecords                  │       │
│  │  TrainingAnalysis                                     │       │
│  │  AITrainerModal                                       │       │
│  │  useActiveWorkout (the core engine)                   │       │
│  │  workoutBuilderStore                                  │       │
│  └──────────────────────────┬───────────────────────────┘       │
│                              │                                   │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────┐       │
│  │                     trainer                           │       │
│  │                                                       │       │
│  │  TrainerDashboard ──▶ TraineeDetail                  │       │
│  │  ProgramBuilder   ──▶ TraineeProgramView             │       │
│  │  MessageCenter    ──▶ TraineeInbox                   │       │
│  │  TraineeAnalytics                                     │       │
│  │  trainerService, programService, messageService       │       │
│  └──────────────────────────────────────────────────────┘       │
│                                                                  │
│  ┌──────────────────────────────────────────────────────┐       │
│  │                      admin                            │       │
│  │                                                       │       │
│  │  ExerciseList / ExerciseForm                          │       │
│  │  MuscleManager / EquipmentManager / BandTypeManager  │       │
│  │  ReportTypeManager / ExerciseSetManager              │       │
│  │  UsersList / AdminSettings                            │       │
│  └──────────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    src/lib/firebase/                             │
│                                                                  │
│  config ← auth ← exercises ← workoutHistory ← workouts         │
│  muscles ← equipment ← reportTypes ← bandTypes                  │
│  exerciseSets ← users ← appSettings                             │
│                                                                  │
│  All talk to Firestore. No component calls Firestore directly.  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 16. Quick Lookup - "Where Do I Find...?"

| I want to... | Go to |
|---------------|-------|
| Change login/register | `src/domains/authentication/components/LoginPage.tsx` |
| Change the home screen | `src/domains/dashboard/components/UserDashboard.tsx` |
| Change exercise filtering | `src/domains/exercises/components/ExerciseLibrary.tsx` |
| Change how sets are logged | `src/domains/workouts/components/active-workout/SetReportRow.tsx` |
| Change workout auto-save logic | `src/domains/workouts/hooks/useActiveWorkout.ts` |
| Change workout finish/summary | `src/domains/workouts/components/active-workout/WorkoutSummaryModal.tsx` |
| Change "continue workout" logic | `src/domains/workouts/components/WorkoutHistory.tsx` → `handleConfirmContinue` |
| Change the rest timer | `src/domains/workouts/components/active-workout/RestTimer.tsx` |
| Change PR detection | `src/domains/workouts/hooks/useActiveWorkout.ts` → PR-related useEffects |
| Change personal records display | `src/domains/workouts/components/PersonalRecords.tsx` |
| Change AI workout generation | `functions/src/ai-trainer/generateWorkout.ts` + `openaiClient.ts` |
| Change AI analysis | `functions/src/ai-analysis/generateAnalysis.ts` |
| Change AI program generation | `functions/src/ai-program/generateProgram.ts` |
| Change the AI trainer UI | `src/domains/workouts/components/ai-trainer/AITrainerModal.tsx` |
| Change trainer dashboard | `src/domains/trainer/components/TrainerDashboard.tsx` |
| Change program builder | `src/domains/trainer/components/ProgramBuilder/ProgramBuilder.tsx` |
| Change trainee program view | `src/domains/trainer/components/ProgramView/TraineeProgramView.tsx` |
| Change messaging | `src/domains/trainer/services/messageService.ts` |
| Add a new Firestore collection | `firestore.rules` + `src/lib/firebase/` new file |
| Change Firestore security rules | `firestore.rules` |
| Change design tokens/colors | `src/theme/tailwind-tokens.js` + `tailwind.config.js` |
| Change bottom navigation | `src/design-system/layouts/MainLayout.tsx` |
| Change routes | `src/App.tsx` |
| Add an admin section | `src/domains/admin/components/` + route in `App.tsx` |
| Change how exercises are stored | `src/lib/firebase/exercises.ts` + `firestore.rules` |
| Change workout status behavior | `src/domains/workouts/components/WorkoutHistory.tsx` |
| Debug Firestore data | `scripts/` directory has many check/debug scripts |
| Run E2E tests | `npx playwright test` (config: `playwright.config.ts`, tests: `e2e/`) |
| Run unit tests | `npm test` (config: `vitest.config.ts`, tests: `tests/`) |
