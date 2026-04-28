# GymIQ - מסמך שחזור מערכת (System Reconstruction Spec)

> **תאריך יצירה:** 16/02/2026
> **גרסה:** 1.10.112
> **מטרה:** מסמך זה מתאר את מערכת GymIQ כפי שהיא קיימת בפועל, ברמת פירוט שמאפשרת בניית מערכת זהה מאפס.

---

## 1. סקירה כללית

- **שם המערכת:** GymIQ - כושר חכם
- **מטרה:** פלטפורמת כושר חכמה למתאמנים ומאמנים - מאפשרת מעקב אימונים, ניהול תוכניות אימון, שיאים אישיים, וניתוח AI
- **קהל יעד:**
  - מתאמנים (users) - מעקב אימונים עצמאי
  - מאמנים (trainers) - ניהול מתאמנים, בניית תוכניות, מעקב התקדמות
  - מנהלי מערכת (admins) - ניהול תרגילים, שרירים, ציוד, משתמשים
- **שפה:** עברית (RTL) - שמות טכניים באנגלית
- **פלטפורמה:** PWA (Progressive Web App), mobile-first, standalone display
- **כיוון טקסט:** RTL (ימין לשמאל)
- **Firebase Project ID:** `gymiq-e8b4e`

---

## 2. Tech Stack מלא

### Dependencies (Production)

| חבילה | גרסה | שימוש |
|-------|-------|-------|
| `react` | ^18.3.1 | ספריית UI ראשית |
| `react-dom` | ^18.3.1 | רינדור DOM |
| `react-router-dom` | ^6.28.0 | ניתוב (routing) |
| `firebase` | ^12.8.0 | Backend - Auth, Firestore, Storage, Functions |
| `zustand` | ^5.0.0 | State management (stores) |
| `react-hook-form` | ^7.53.0 | ניהול טפסים |
| `@hookform/resolvers` | ^3.9.0 | Zod resolver לטפסים |
| `zod` | ^3.23.8 | Validation schemas |
| `@tanstack/react-query` | ^5.60.0 | Server state management + caching |
| `date-fns` | ^4.1.0 | עיבוד תאריכים |
| `framer-motion` | ^11.11.0 | אנימציות |
| `lucide-react` | ^0.460.0 | אייקונים |
| `react-hot-toast` | ^2.4.1 | הודעות toast |
| `tailwind-merge` | ^2.5.0 | מיזוג classes של Tailwind |
| `clsx` | ^2.1.1 | Class name builder |
| `@dnd-kit/core` | ^6.3.1 | Drag & Drop |
| `@dnd-kit/sortable` | ^10.0.0 | Sortable lists |
| `@dnd-kit/utilities` | ^3.2.2 | DnD utilities |

### DevDependencies

| חבילה | גרסה | שימוש |
|-------|-------|-------|
| `vite` | ^7.3.1 | Build tool |
| `typescript` | ~5.6.2 | Type checking |
| `tailwindcss` | ^3.4.15 | CSS framework |
| `vitest` | ^4.0.17 | Unit testing |
| `@testing-library/react` | ^16.3.1 | React testing |
| `@testing-library/jest-dom` | ^6.9.1 | DOM matchers |
| `@vitejs/plugin-react` | ^4.3.3 | React plugin for Vite |
| `eslint` | ^9.15.0 | Linting |
| `autoprefixer` | ^10.4.20 | CSS autoprefixing |
| `postcss` | ^8.4.49 | CSS processing |
| `firebase-admin` | ^13.6.0 | Admin SDK (scripts only) |
| `dotenv` | ^17.2.3 | Environment variables (scripts) |
| `jsdom` | ^24.1.3 | DOM environment for tests |

### Build & Config

- **Build Tool:** Vite 7.3.1
- **Port:** 3000 (dev)
- **Path Alias:** `@/` → `src/`
- **Target:** ES2020
- **Module:** ESNext with bundler resolution
- **Output:** Hashed filenames (`assets/[name].[hash].js`)
- **Hosting:** Firebase Hosting (`dist/` folder)
- **Runtime (Functions):** Node.js 20

---

## 3. מבנה תיקיות

```
GymIQ/
├── public/
│   ├── manifest.json              # PWA manifest
│   ├── icons/                     # App icons (SVG)
│   ├── sw.js                      # Service Worker
│   └── version.json               # Version tracking
├── src/
│   ├── App.tsx                    # Root component + routing
│   ├── main.tsx                   # Entry point (React.StrictMode + AuthProvider + Router)
│   ├── vite-env.d.ts              # Vite type declarations
│   │
│   ├── app/
│   │   ├── providers/
│   │   │   ├── AuthProvider.tsx    # Firebase auth initialization + cleanup
│   │   │   └── index.ts
│   │   └── router/
│   │       └── guards/
│   │           ├── AuthGuard.tsx   # Auth + role-based guards (AuthGuard, GuestGuard)
│   │           └── index.ts
│   │
│   ├── design-system/
│   │   └── layouts/
│   │       ├── MainLayout.tsx     # User layout (sidebar + bottom nav + outlet)
│   │       └── index.ts
│   │
│   ├── domains/
│   │   ├── authentication/
│   │   │   ├── components/
│   │   │   │   ├── LoginPage.tsx  # Login + Registration form
│   │   │   │   └── index.ts
│   │   │   ├── store/
│   │   │   │   ├── authStore.ts   # Zustand auth store (persisted)
│   │   │   │   └── index.ts
│   │   │   └── types/
│   │   │       ├── auth.types.ts  # UserProfile, AuthState types
│   │   │       └── index.ts
│   │   │
│   │   ├── dashboard/
│   │   │   └── components/
│   │   │       ├── UserDashboard.tsx  # Main user dashboard
│   │   │       └── index.ts
│   │   │
│   │   ├── exercises/
│   │   │   ├── components/
│   │   │   │   ├── ExerciseLibrary.tsx    # Exercise selection/filtering
│   │   │   │   ├── ExerciseCard.tsx       # Single exercise card
│   │   │   │   ├── ExerciseSetCard.tsx    # Pre-built set card
│   │   │   │   ├── RecommendedSets.tsx    # Recommended sets display
│   │   │   │   └── index.ts
│   │   │   ├── data/
│   │   │   │   └── mockExercises.ts       # Static data (categories, equipment)
│   │   │   ├── services/
│   │   │   │   ├── exerciseService.ts     # Exercise CRUD operations
│   │   │   │   └── index.ts
│   │   │   ├── types/
│   │   │   │   ├── exercise.types.ts      # Exercise, MuscleGroup, Equipment types
│   │   │   │   ├── exerciseSet.types.ts   # ExerciseSet types
│   │   │   │   ├── bands.ts              # Band type definitions
│   │   │   │   ├── muscles.ts            # Muscle definitions
│   │   │   │   ├── reportTypes.ts        # Report type definitions
│   │   │   │   └── index.ts
│   │   │   └── utils/
│   │   │       ├── getExerciseImageUrl.ts # Image URL generation with fallback
│   │   │       └── index.ts
│   │   │
│   │   ├── workouts/
│   │   │   ├── components/
│   │   │   │   ├── active-workout/
│   │   │   │   │   ├── ActiveWorkoutScreen.tsx   # Main workout execution screen
│   │   │   │   │   ├── ExerciseCard.tsx           # Exercise card in active workout
│   │   │   │   │   ├── ExerciseCounter.tsx        # Completed exercise counter
│   │   │   │   │   ├── MuscleGroupSection.tsx     # Group exercises by muscle
│   │   │   │   │   ├── SetReportRow.tsx           # Single set input row
│   │   │   │   │   ├── RestTimer.tsx              # Rest timer between sets
│   │   │   │   │   ├── WorkoutHeader.tsx          # Timer + exit/finish buttons
│   │   │   │   │   ├── WorkoutSummaryModal.tsx    # Post-workout summary + calories
│   │   │   │   │   ├── ConfirmationModal.tsx      # Confirm exit/finish/delete
│   │   │   │   │   ├── NotesModal.tsx             # Per-exercise notes editor
│   │   │   │   │   ├── WeightIncreasePopup.tsx    # Celebration popup for PRs
│   │   │   │   │   └── index.ts
│   │   │   │   ├── workout-session/
│   │   │   │   │   ├── WorkoutSessionScreen.tsx   # Alternative session screen
│   │   │   │   │   ├── ExerciseMedia.tsx          # Exercise image/video display
│   │   │   │   │   ├── ExerciseNavigationHeader.tsx
│   │   │   │   │   ├── SetRow.tsx
│   │   │   │   │   ├── RestTimer.tsx
│   │   │   │   │   └── index.ts
│   │   │   │   ├── ai-trainer/
│   │   │   │   │   ├── AITrainerModal.tsx         # AI workout generation UI
│   │   │   │   │   └── AIBundleCard.tsx           # AI workout bundle display
│   │   │   │   ├── WorkoutBuilder.tsx             # Pre-workout exercise editor
│   │   │   │   ├── WorkoutHistory.tsx             # History list + continue flow
│   │   │   │   ├── PersonalRecords.tsx            # PR display + history
│   │   │   │   ├── TrainingAnalysis.tsx           # AI training analysis results
│   │   │   │   └── index.ts
│   │   │   ├── hooks/
│   │   │   │   ├── useActiveWorkout.ts            # Core workout state management (1700+ lines)
│   │   │   │   ├── useRestTimerAudio.ts           # Web Audio API sound generation
│   │   │   │   └── useWorkoutSession.ts           # Alternative session hook
│   │   │   ├── services/
│   │   │   │   ├── aiTrainerService.ts            # AI workout generation (Cloud Function)
│   │   │   │   ├── aiTrainer.types.ts             # AI trainer types
│   │   │   │   └── analysisService.ts             # Training analysis (Cloud Function)
│   │   │   ├── store/
│   │   │   │   ├── workoutBuilderStore.ts         # Zustand store for workout building
│   │   │   │   └── index.ts
│   │   │   ├── types/
│   │   │   │   ├── workout.types.ts               # WorkoutHistoryEntry, WorkoutSet, etc.
│   │   │   │   ├── active-workout.types.ts        # ActiveWorkout, ReportedSet
│   │   │   │   ├── workout-session.types.ts       # Session types (alternative)
│   │   │   │   └── index.ts
│   │   │   └── data/
│   │   │       └── mockWorkouts.ts                # Mock data for testing
│   │   │
│   │   ├── trainer/
│   │   │   ├── components/
│   │   │   │   ├── TrainerLayout.tsx               # Trainer sidebar layout
│   │   │   │   ├── TrainerDashboard.tsx            # Trainer main screen
│   │   │   │   ├── TrainerDashboardTile.tsx        # Stats tile component
│   │   │   │   ├── TraineeCard.tsx                 # Trainee list card
│   │   │   │   ├── TraineeDetail.tsx               # Single trainee management
│   │   │   │   ├── TraineeEditModal.tsx            # Edit trainee info
│   │   │   │   ├── TraineeRegistrationModal.tsx    # Register new trainee
│   │   │   │   ├── TraineePerformance.tsx          # Performance metrics
│   │   │   │   ├── TraineePersonalRecords.tsx      # Trainee PR view
│   │   │   │   ├── TraineeProfileSection.tsx       # Trainee profile display
│   │   │   │   ├── TraineeRecentWorkouts.tsx       # Recent workout list
│   │   │   │   ├── StandaloneWorkoutEditor.tsx     # Create/edit standalone workouts
│   │   │   │   ├── ProgramBuilder/
│   │   │   │   │   ├── ProgramBuilder.tsx          # Multi-step program creation
│   │   │   │   │   ├── ProgramBuilderHeader.tsx
│   │   │   │   │   ├── ProgramDayCard.tsx
│   │   │   │   │   ├── ProgramDayEditor.tsx
│   │   │   │   │   ├── ProgramExerciseEditor.tsx
│   │   │   │   │   ├── ProgramReview.tsx
│   │   │   │   │   ├── TraineeHistoryPanel.tsx
│   │   │   │   │   ├── TraineeSidePanel.tsx
│   │   │   │   │   ├── MobileDaySelector.tsx
│   │   │   │   │   └── MobileExerciseCard.tsx
│   │   │   │   ├── ProgramView/
│   │   │   │   │   ├── TraineeProgramView.tsx
│   │   │   │   │   ├── ProgramDayDetail.tsx
│   │   │   │   │   ├── ProgramExerciseCard.tsx
│   │   │   │   │   └── TrainerProgramCard.tsx
│   │   │   │   ├── Messages/
│   │   │   │   │   ├── MessageCenter.tsx           # Trainer message hub
│   │   │   │   │   ├── MessageComposer.tsx
│   │   │   │   │   ├── MessageList.tsx
│   │   │   │   │   └── MessageCard.tsx
│   │   │   │   ├── TraineeInbox/
│   │   │   │   │   ├── TraineeInbox.tsx            # Trainee inbox
│   │   │   │   │   ├── InboxMessageCard.tsx
│   │   │   │   │   └── InboxBadge.tsx
│   │   │   │   └── TraineeAnalytics/
│   │   │   │       ├── TraineeAnalytics.tsx        # Analytics tabs container
│   │   │   │       ├── TotalWorkoutsTab.tsx
│   │   │   │       ├── StreakTab.tsx
│   │   │   │       ├── WeeklyComplianceTab.tsx
│   │   │   │       ├── PRTab.tsx
│   │   │   │       └── components/
│   │   │   │           ├── AIInsights.tsx
│   │   │   │           ├── HeatmapCalendar.tsx
│   │   │   │           ├── PatternChart.tsx
│   │   │   │           ├── PRCard.tsx
│   │   │   │           ├── SkipAnalysis.tsx
│   │   │   │           ├── StatCard.tsx
│   │   │   │           └── WeeklyProgressBars.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useTraineeAnalytics.ts         # Complex analytics calculations
│   │   │   │   ├── useTraineeProgram.ts           # Active program + today's day
│   │   │   │   ├── useTrainerData.ts              # Trainer's trainees list
│   │   │   │   ├── useTrainerMessages.ts          # Trainer messaging
│   │   │   │   └── useUnreadMessages.ts           # Polling unread count
│   │   │   ├── services/
│   │   │   │   ├── trainerService.ts              # Trainer-trainee operations
│   │   │   │   ├── programService.ts              # Training program CRUD
│   │   │   │   ├── messageService.ts              # Messaging operations
│   │   │   │   └── traineeAccountService.ts       # Create/link trainee accounts
│   │   │   ├── store/
│   │   │   │   ├── trainerStore.ts                # Zustand trainer store
│   │   │   │   └── messageStore.ts                # Zustand message store
│   │   │   └── types/
│   │   │       ├── trainer.types.ts               # Trainer, Program, Message types
│   │   │       └── index.ts
│   │   │
│   │   └── admin/
│   │       └── components/
│   │           ├── AdminLayout.tsx                 # Admin sidebar layout
│   │           ├── AdminSettings.tsx               # App settings management
│   │           ├── ExerciseList.tsx                # Exercise CRUD list
│   │           ├── ExerciseForm.tsx                # Exercise create/edit form
│   │           ├── ExerciseSetManager.tsx          # Recommended sets management
│   │           ├── ExerciseSetForm.tsx
│   │           ├── ExerciseSetExercisePicker.tsx
│   │           ├── MuscleManager.tsx               # Muscle groups management
│   │           ├── EquipmentManager.tsx            # Equipment types management
│   │           ├── BandTypeManager.tsx             # Resistance bands management
│   │           ├── ReportTypeManager.tsx           # Report types management
│   │           ├── UsersList.tsx                   # User management
│   │           └── index.ts
│   │
│   ├── lib/
│   │   └── firebase/
│   │       ├── config.ts           # Firebase initialization (env vars)
│   │       ├── auth.ts             # Auth operations (register, login, logout)
│   │       ├── exercises.ts        # Exercise CRUD + validation
│   │       ├── muscles.ts          # Muscle groups CRUD + seeding
│   │       ├── equipment.ts        # Equipment CRUD + seeding
│   │       ├── bandTypes.ts        # Band types CRUD
│   │       ├── reportTypes.ts      # Report types CRUD
│   │       ├── exerciseSets.ts     # Exercise sets CRUD
│   │       ├── exerciseSetStorage.ts
│   │       ├── workoutHistory.ts   # Workout history (1557 lines - core)
│   │       ├── workouts.ts         # Workout sessions + templates
│   │       ├── users.ts            # User management (admin)
│   │       ├── appSettings.ts      # App settings
│   │       └── index.ts
│   │
│   ├── shared/
│   │   ├── components/
│   │   │   ├── LoadingSpinner.tsx   # Loading indicator
│   │   │   ├── MuscleIcon.tsx       # Muscle group icon
│   │   │   ├── UpdateBanner.tsx     # App update notification
│   │   │   ├── WorkoutCard/
│   │   │   │   ├── WorkoutCard.tsx  # Shared workout card
│   │   │   │   └── index.ts
│   │   │   └── index.ts
│   │   └── hooks/
│   │       ├── useVersionCheck.ts   # Version polling + update
│   │       └── index.ts
│   │
│   ├── styles/
│   │   ├── design-tokens.ts        # TypeScript design tokens
│   │   └── theme.ts                # Theme object (colors, spacing, typography)
│   │
│   ├── theme/
│   │   ├── tokens.ts               # Source of truth tokens (TS)
│   │   ├── tailwind-tokens.js      # Tokens for Tailwind (CJS)
│   │   └── index.ts
│   │
│   └── utils/
│       ├── muscleTranslations.ts   # Muscle name Hebrew translations
│       └── workoutValidation.ts    # Workout storage cleanup utility
│
├── functions/                      # Firebase Cloud Functions (Node.js 20)
├── scripts/                        # Admin/migration scripts
│   ├── firebase-config.ts          # Shared Firebase config for scripts
│   └── firebase-config.cjs         # CJS version
├── tests/                          # Test files
├── firestore.rules                 # Firestore security rules
├── firestore.indexes.json          # Firestore composite indexes
├── firebase.json                   # Firebase project configuration
├── .firebaserc                     # Firebase project reference
├── tailwind.config.js              # Tailwind CSS configuration
├── vite.config.ts                  # Vite build configuration
├── tsconfig.json                   # TypeScript configuration
├── postcss.config.js               # PostCSS configuration
└── package.json                    # Project dependencies
```

---

## 4. Design System

### 4.1 צבעים (Color Tokens)

**מקור:** `src/theme/tailwind-tokens.js`

#### רקע (Background)
| שם Token | ערך Hex | שימוש |
|----------|---------|-------|
| `background.main` | `#0B0D12` | רקע ראשי של האפליקציה |
| `background.card` | `#141820` | רקע כרטיסים |
| `background.elevated` | `#1A1F2A` | רקע אלמנטים מורמים |
| `background.input` | `#0D0F14` | רקע שדות קלט |

#### ראשי (Primary - Cyan/Teal)
| שם Token | ערך Hex | שימוש |
|----------|---------|-------|
| `primary.main` | `#00D4AA` | צבע ראשי, כפתורים, לינקים פעילים |
| `primary.light` | `#00E5B8` | הדגשה בהירה |
| `primary.dark` | `#00B894` | גרדיאנט כהה |

#### משני (Secondary)
| שם Token | ערך Hex | שימוש |
|----------|---------|-------|
| `secondary.main` | `#1E2330` | רקע כפתורים משניים |
| `secondary.light` | `#252B3A` | רקע hover |
| `secondary.dark` | `#14181F` | רקע כהה |

#### הדגשה (Accent)
| שם Token | ערך Hex | שימוש |
|----------|---------|-------|
| `accent.orange` | `#FF6B35` | הדגשה כתומה, תרגיל אחרון |
| `accent.gold` | `#C4A052` | תפקיד admin, glow |
| `accent.cyan` | `#00D4AA` | ראשי (alias) |
| `accent.purple` | `#8B5CF6` | הדגשה סגולה, קבוצת שרירים "גב" |
| `accent.pink` | `#EC4899` | הדגשה ורודה, הודעות, קבוצת שרירים "בטן" |

#### טקסט (Text)
| שם Token | ערך Hex | שימוש |
|----------|---------|-------|
| `text.primary` | `#FFFFFF` | טקסט ראשי |
| `text.secondary` | `#8B95A5` | טקסט משני, תיאורים |
| `text.muted` | `#5A6478` | טקסט מושתק, placeholders |
| `text.disabled` | `#3D4555` | טקסט מושבת |

#### גבולות (Border)
| שם Token | ערך Hex | שימוש |
|----------|---------|-------|
| `border.DEFAULT` | `#1E2430` | גבולות רגילים |
| `border.light` | `#2A3142` | גבולות בהירים |
| `border.focus` | `#00D4AA` | גבולות focus |

#### סטטוס (Status)
| שם Token | ערך Hex | שימוש |
|----------|---------|-------|
| `status.success` | `#10B981` | הצלחה, ירוק |
| `status.warning` | `#FFB020` | אזהרה, צהוב |
| `status.error` | `#EF4444` | שגיאה, אדום |
| `status.info` | `#3B82F6` | מידע, כחול |
| `status.active` | `#00D4AA` | פעיל |

#### סטטוס אימון (Workout Status)
| שם Token | ערך Hex | שימוש |
|----------|---------|-------|
| `workout-status.completed` | `#3B82F6` | אימון הושלם (כחול) |
| `workout-status.in-progress` | `#FFB020` | אימון בתהליך (צהוב) |
| `workout-status.planned` | `#EF4444` | אימון מתוכנן (אדום) |

#### קבוצות שרירים (Muscle Groups)
| שם Token | ערך Hex | שימוש |
|----------|---------|-------|
| `muscles.chest` | `#FF6B35` | חזה |
| `muscles.back` | `#8B5CF6` | גב |
| `muscles.legs` | `#00D4AA` | רגליים |
| `muscles.shoulders` | `#FFB020` | כתפיים |
| `muscles.arms` | `#3B82F6` | זרועות |
| `muscles.core` | `#EC4899` | בטן |

#### תפקידים (Role)
| שם Token | ערך Hex | שימוש |
|----------|---------|-------|
| `role.admin` | `#C4A052` (gold) | מנהל |
| `role.trainer` | `#3B82F6` (blue) | מאמן |
| `role.user` | `#10B981` (green) | מתאמן |

### 4.2 טיפוגרפיה

**פונטים:**
- **Primary:** `'Heebo', 'Inter', sans-serif` - פונט ראשי (תומך עברית)
- **Display:** `'Heebo', 'Assistant', sans-serif` - כותרות
- **Mono:** `'JetBrains Mono', monospace` - קוד

**נטענים מ-Google Fonts:**
```
Assistant:wght@400;500;600;700
Inter:wght@400;500;600;700
Rubik:wght@400;500;600;700
```

**גדלים:**
| שם | ערך |
|----|-----|
| xs | 11px |
| sm | 13px |
| base | 15px |
| lg | 17px |
| xl | 20px |
| 2xl | 24px |
| 3xl | 32px |
| 4xl | 40px |

### 4.3 ריווחים ו-Breakpoints

**Breakpoints:**
| שם | ערך | שימוש |
|----|-----|-------|
| xs | 375px | iPhone SE/mini |
| sm | 640px | טלפון גדול |
| md | 768px | טאבלט |
| lg | 1024px | דסקטופ (מציג sidebar) |
| xl | 1280px | מסך רחב |
| 2xl | 1536px | מסך גדול |

**Spacing Tokens:**
| שם | ערך |
|----|-----|
| xs | 4px |
| sm | 8px |
| md | 12px |
| lg | 16px |
| xl | 20px |
| 2xl | 24px |
| 3xl | 32px |
| 4xl | 40px |

**Border Radius:**
| שם | ערך |
|----|-----|
| xs | 4px |
| sm | 8px |
| md | 12px |
| lg | 16px |
| xl | 20px |
| 2xl | 24px |
| full | 9999px |

### 4.4 אנימציות

**Tailwind Animations:**
- `pulse-glow` - פעימת זוהר (2s infinite) - לוגו בדף כניסה
- `fade-in` - הופעה הדרגתית (0.6s)
- `slide-up` - עלייה מלמטה (0.6s)
- `scale-in` - הגדלה (0.4s)
- `expand` - התרחבות (0.3s)

**Weight Increase Popup Animations:**
- `wip-pop-in` - הופעה בקפיצה (0.5s)
- `wip-slide-up` - עלייה (0.5s)
- `wip-badge-in` - תג הופעה (0.4s)
- `wip-confetti-fall` - קונפטי נופל (2s)
- `wip-sparkle` - ניצוצות (0.8s)
- `wip-clap` - מחיאות כפיים (1.2s)

### 4.5 RTL - כללים

- `<html lang="he" dir="rtl">` - כיוון גלובלי
- CSS: `[dir="rtl"] { text-align: right; }`
- Select dropdown arrow: `background-position: left 1rem center` (הפוך)
- Table headers: `text-right`
- Sidebar: `fixed right-0` (בדסקטופ)
- Main content: `lg:mr-64` (margin-right לסיידבר)
- Icons: כפתור סגירה `left-4`, לא `right-4`

### 4.6 קונבנציות Tailwind

**מותר:**
- שימוש ב-design tokens מ-tailwind-tokens.js
- classes של Tailwind בלבד
- Component classes מ-index.css (`.btn-primary`, `.card`, `.input-neon`)

**אסור:**
- `style={{}}` inline styles (למעט MainLayout שהוא legacy)
- ערכי צבע hardcoded
- arbitrary values ללא הצדקה

---

## 5. Firebase Architecture

### 5.1 Configuration

- **Project ID:** `gymiq-e8b4e`
- **Auth Language:** `he` (עברית)
- **Environment Variables:**
  - `VITE_FIREBASE_API_KEY`
  - `VITE_FIREBASE_AUTH_DOMAIN`
  - `VITE_FIREBASE_PROJECT_ID`
  - `VITE_FIREBASE_STORAGE_BUCKET`
  - `VITE_FIREBASE_MESSAGING_SENDER_ID`
  - `VITE_FIREBASE_APP_ID`

### 5.2 Authentication

**שיטת הזדהות:** Email + Password

**זרימת הרשמה:**
1. משתמש מזין: אימייל, סיסמה (מינימום 6 תווים), שם פרטי, שם משפחה
2. Validation: Zod schema (email valid, password min 6, names min 2)
3. `registerUser()` → Firebase Auth create → Firestore user document create
4. Role default: `user` (first user auto = `admin` if empty collection)
5. הפניה ל-dashboard

**זרימת כניסה:**
1. משתמש מזין: אימייל, סיסמה
2. `loginUser()` → Firebase Auth sign in
3. `onAuthChange()` listener → loads user from Firestore
4. הפניה לפי role: admin → `/admin`, others → `/dashboard`

**ניהול Roles:**
| Role | רמה | גישה |
|------|------|-------|
| `user` | 0 | דשבורד, אימונים, היסטוריה, PR, ניתוח |
| `trainer` | 1 | כל user + ממשק מאמן, ניהול מתאמנים |
| `admin` | 2 | כל trainer + ממשק ניהול, ניהול תרגילים/משתמשים |

**Role Hierarchy:** admin > trainer > user (admin מקבל גישה לכל)

### 5.3 Firestore Collections

#### users
```typescript
{
  uid: string           // Firebase Auth UID (= document ID)
  email: string
  displayName: string   // "firstName lastName"
  firstName: string
  lastName: string
  role: 'user' | 'trainer' | 'admin'
  phoneNumber?: string

  // Trainer fields (if role=trainer)
  trainerProfile?: {
    specializations: TrainerSpecialization[]
    bio: string
    maxTrainees: number
  }

  // Trainee fields (if assigned to trainer)
  trainerId?: string            // UID of trainer
  trainingGoals?: TrainingGoal[]
  injuriesOrLimitations?: string

  // Body metrics
  age?: number
  height?: number               // cm
  weight?: number               // kg
  bodyFatPercentage?: number

  // Timestamps
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

#### exercises
```typescript
{
  id: string
  name: string                   // English name
  nameHe: string                 // Hebrew name
  category: ExerciseCategory     // legs, chest, back, shoulders, arms, core, cardio, functional, stretching
  primaryMuscle: MuscleGroup     // chest, lats, quadriceps, hamstrings, glutes, etc.
  secondaryMuscles: MuscleGroup[]
  equipment: EquipmentType       // barbell, dumbbell, bodyweight, machine, etc.
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  reportType?: string            // weight_reps (default), reps_only, time_only, reps_time, or custom
  assistanceTypes?: ('graviton' | 'bands')[]
  availableBands?: string[]      // band type IDs
  instructions: string[]         // English
  instructionsHe: string[]       // Hebrew
  targetMuscles: string[]
  imageUrl: string
  tips: string[]
  tipsHe: string[]
  createdAt?: Timestamp
  updatedAt?: Timestamp
  lastEditedAt?: Timestamp
}
```

#### workoutHistory
```typescript
{
  id: string                     // auto-generated
  userId: string
  name: string                   // workout name
  date: Timestamp
  startTime: Timestamp
  endTime: Timestamp
  duration: number               // minutes
  status: 'completed' | 'in_progress' | 'planned' | 'partial' | 'cancelled'

  exercises: [{
    exerciseId: string
    exerciseName: string
    exerciseNameHe: string
    imageUrl?: string
    category?: string
    isCompleted: boolean
    notes?: string
    exerciseVolume?: number
    sets: [{
      type: 'warmup' | 'working' | 'dropset' | 'superset'
      targetReps: number
      targetWeight: number
      actualReps?: number
      actualWeight?: number
      completed: boolean
      // Extended fields
      time?: number              // seconds
      intensity?: number
      speed?: number
      distance?: number
      incline?: number
      assistanceWeight?: number
      assistanceBand?: string    // band ID
    }]
  }]

  completedExercises: number
  totalExercises: number
  completedSets: number
  totalSets: number
  totalVolume: number            // kg (weight × reps sum)
  personalRecords: number
  calories?: number
  notes?: string

  // AI Trainer fields
  source?: 'manual' | 'ai_trainer' | 'trainer_program'
  aiWorkoutNumber?: number
  bundleId?: string
  aiRecommendations?: Record<string, { weight: number; repRange: string; sets: number; reasoning?: string }>
  aiExplanation?: string

  // Trainer program fields
  programId?: string
  programDayLabel?: string
  reportedBy?: string            // trainer UID
  reportedByName?: string

  // Soft delete
  deletedByTrainee?: { deletedAt: Timestamp; reason?: string }
}
```

#### muscles
```typescript
{
  id: string                     // e.g. "chest"
  name: string                   // Hebrew name: "חזה"
  nameEn: string                 // English name: "Chest"
  icon?: string
  subMuscles: [{
    id: string                   // e.g. "upper_chest"
    name: string                 // "חזה עליון"
    nameEn: string               // "Upper Chest"
  }]
  order?: number
}
```

#### equipment
```typescript
{
  id: string
  name: string                   // Hebrew: "מוט ישר"
  nameEn: string                 // English: "Barbell"
  icon?: string
  isActive: boolean
  order?: number
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

#### reportTypes
```typescript
{
  id: string                     // e.g. "weight_reps"
  name: string                   // Hebrew display name
  nameEn: string
  fields: string[]               // ["weight", "reps"] or ["time"] etc.
  isActive: boolean
  isDefault?: boolean
  sortOrder: number
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

#### bandTypes
```typescript
{
  id: string
  name: string                   // e.g. "אדומה - קשה"
  color?: string
  resistance?: string            // e.g. "15-25kg"
  isActive: boolean
  sortOrder: number
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

#### exerciseSets
```typescript
{
  id: string
  name: string                   // e.g. "אימון חזה בסיסי"
  nameEn?: string
  description?: string
  exercises: [{
    exerciseId: string
    exerciseName: string
    exerciseNameHe: string
    imageUrl?: string
    order: number
    targetSets: number
    targetReps: string
    restTime: number
  }]
  isActive: boolean
  sortOrder: number
  category?: string
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

#### workoutSessions
```typescript
{
  id: string
  userId: string
  status: 'active' | 'completed' | 'cancelled'
  workoutName?: string
  exercises: WorkoutExercise[]
  startedAt: Timestamp
  endedAt?: Timestamp
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

#### workoutTemplates
```typescript
{
  id: string
  name: string
  description?: string
  isPublic: boolean
  createdBy: string              // user UID
  exercises: WorkoutExercise[]
  estimatedDuration?: number
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

#### trainerRelationships
```typescript
{
  id: string
  trainerId: string
  traineeId: string
  trainerName: string
  traineeName: string
  traineeEmail: string
  status: 'active' | 'paused' | 'ended'
  notes?: string
  createdAt: Timestamp
  updatedAt: Timestamp
  endedAt?: Timestamp
  endedBy?: 'trainer' | 'trainee' | 'admin'
  endReason?: string
}
```

#### trainingPrograms
```typescript
{
  id: string
  trainerId: string
  traineeId: string
  originalTrainerId: string
  name: string
  description?: string
  type?: 'program' | 'standalone'
  status: 'active' | 'paused' | 'completed' | 'draft'
  isModifiedByTrainee: boolean
  weeklyStructure: [{
    dayLabel: string             // "יום A"
    dayOfWeek?: number           // 0=Sunday
    name: string                 // "חזה + טרייספס"
    exercises: [{
      exerciseId: string
      exerciseName: string
      exerciseNameHe: string
      imageUrl?: string
      category?: string
      primaryMuscle?: string
      equipment?: string
      order: number
      targetSets: number
      targetReps: string         // "8-12"
      targetWeight?: number
      restTime: number           // seconds
      notes?: string
      supersetGroup?: string
      reportType?: string
      assistanceTypes?: string[]
    }]
    restDay: boolean
    notes?: string
    estimatedDuration?: number
  }]
  durationWeeks?: number
  startDate: Timestamp
  endDate?: Timestamp
  currentWeek: number
  createdAt: Timestamp
  updatedAt: Timestamp
  notes?: string
  disconnectedByTrainee?: { disconnectedAt: Timestamp; reason?: string }
}
```

#### trainerMessages
```typescript
{
  id: string
  trainerId: string
  traineeId: string
  trainerName: string
  type: 'general' | 'workout_feedback' | 'program_update' | 'motivation' | 'instruction'
  priority: 'normal' | 'high'
  title: string
  body: string
  isRead: boolean
  readAt?: Timestamp
  replies: [{
    id: string                   // "reply_{timestamp}"
    senderId: string
    senderName: string
    senderRole: 'trainer' | 'user'
    body: string
    createdAt: Timestamp
  }]
  createdAt: Timestamp
}
```

#### exerciseRecommendations
```typescript
// Document ID = userId
{
  userId: string
  recommendations: Record<string, {
    recommend: boolean           // true = should increase weight
    lastChecked: Timestamp
  }>
  updatedAt: Timestamp
}
```

#### aiTrainerUsage
```typescript
// Document ID = userId
{
  userId: string
  dailyCount: number
  lastUsed: Timestamp
  resetAt: Timestamp
}
```

#### aiAnalysisUsage
```typescript
// Document ID = userId
{
  userId: string
  cachedResult?: string          // JSON string of TrainingAnalysisResult
  workoutCount?: number
  weeksAnalyzed?: number
  generatedAt?: Timestamp
  dailyCount: number
  lastUsed: Timestamp
  resetAt: Timestamp
}
```

#### settings
```typescript
// Document ID = "app"
{
  externalComparisonUrl?: string
  // Other app-wide settings
}
```

### 5.4 Firestore Security Rules

**כללים מרכזיים:**
- `isAuthenticated()` - בדיקת auth
- `isOwner(userId)` - בעלות על מסמך
- `isAdmin()` - role == 'admin' (בודק document)
- `isTrainer()` - role in ['trainer', 'admin']

**הרשאות עיקריות:**
- `exercises`, `muscles`, `equipment`, `reportTypes`, `bandTypes`, `exerciseSets` - **public read**, admin write
- `users` - read own + admin/trainer read all, create own + trainer create for trainees
- `workoutHistory` - read/write own + trainer read
- `trainingPrograms` - trainer/trainee read, trainer create/update, trainee soft-delete
- `trainerMessages` - trainer/trainee read, trainer create, limited update
- `aiTrainerUsage`, `aiAnalysisUsage` - read own, **no client writes** (Cloud Functions only)

### 5.5 Firestore Indexes

```json
[
  { "workoutHistory": ["userId ASC", "date DESC"] },
  { "trainerRelationships": ["trainerId ASC", "status ASC"] },
  { "trainerRelationships": ["trainerId ASC", "traineeId ASC", "status ASC"] }
]
```

### 5.6 Hosting Configuration

- **Public directory:** `dist`
- **SPA rewrite:** `** → /index.html`
- **Cache headers:** `no-cache` for HTML, JS, CSS, sw.js, version.json
- **Emulators:** Auth (9099), Functions (5001), Firestore (8080)

---

## 6. State Management

### 6.1 Zustand Stores

#### authStore (persisted)
**קובץ:** `src/domains/authentication/store/authStore.ts`
**localStorage Key:** `gymiq-auth`
**Persisted Fields:** `user`, `isAuthenticated`

**State:**
```typescript
{
  user: AppUser | null
  isAuthenticated: boolean
  isLoading: boolean
  isInitialized: boolean
  error: string | null
}
```

**Actions:**
- `initialize()` → Firebase auth listener, returns unsubscribe
- `login(email, password)` → Firebase sign in
- `register({ email, password, firstName, lastName })` → Firebase create + Firestore doc
- `logout()` → Firebase sign out, clear state
- `sendPasswordReset(email)` → Firebase password reset
- `clearError()` → null error

#### workoutBuilderStore (ephemeral)
**קובץ:** `src/domains/workouts/store/workoutBuilderStore.ts`
**Persist:** No

**State:**
```typescript
{
  workoutName: string
  selectedExercises: SelectedExercise[]
  scheduledDate: Date | null
  programId?: string
  programDayLabel?: string
  targetUserId?: string
  reportedBy?: string
  reportedByName?: string
}
```

**Actions:**
- `addExercise(exercise)` → adds with 3 default sets (10 reps, 0 weight)
- `addExercisesFromSet(exercises)` → batch add from recommended set
- `removeExercise(id)`, `reorderExercise(from, to)`
- `addSet(exerciseId)`, `removeSet(exerciseId, setIndex)`, `updateSet(exerciseId, setIndex, updates)`
- `updateRestTime(exerciseId, restTime)` - default 90 seconds
- `loadFromProgram(day, programId, programName)` → load from trainer program
- `setTrainerReport(targetUserId, reportedBy, reportedByName)` → mark as trainer report
- `clearWorkout()` → reset all

#### trainerStore (ephemeral)
**קובץ:** `src/domains/trainer/store/trainerStore.ts`

**State:**
```typescript
{
  trainees: TraineeWithStats[]
  selectedTraineeId: string | null
  isLoading: boolean
  error: string | null
}
```

**Actions:** `setTrainees`, `setSelectedTrainee`, `addTrainee`, `removeTrainee`, `setLoading`, `setError`

#### messageStore (ephemeral)
**קובץ:** `src/domains/trainer/store/messageStore.ts`

**State:**
```typescript
{
  unreadCount: number
  messages: TrainerMessage[]
  isLoading: boolean
}
```

**Actions:** `setUnreadCount`, `setMessages`, `markAsRead` (decrements count), `setIsLoading`

### 6.2 localStorage Usage

| Key | נתונים | שימוש |
|-----|--------|-------|
| `gymiq_active_workout_v2` | ActiveWorkout JSON | מצב אימון פעיל (self) |
| `gymiq_active_workout_v2_{userId}` | ActiveWorkout JSON | מצב אימון פעיל (trainer report) |
| `gymiq_firebase_workout_id` | Firebase doc ID | מזהה Firestore לאימון פעיל |
| `gymiq_firebase_workout_id_{userId}` | Firebase doc ID | מזהה Firestore (trainer) |
| `continueWorkoutData` | Exercise array JSON | נתוני תרגילים להמשך אימון |
| `continueWorkoutMode` | 'in_progress' \| 'planned' | מצב המשך |
| `continueWorkoutId` | Firebase doc ID | מזהה אימון להמשך |
| `continueAIRecommendations` | AI suggestions JSON | המלצות AI |
| `gymiq_timer_audio_settings_v2` | Audio settings JSON | הגדרות צלילי טיימר |
| `gymiq_app_version` | Version string | גרסה נוכחית |
| `gymiq-auth` | {user, isAuthenticated} | Zustand persist |

---

## 7. Routing

| Path | Component | Auth | Role | Params |
|------|-----------|------|------|--------|
| `/login` | LoginPage | GuestGuard | - | - |
| `/` | → redirect `/dashboard` | AuthGuard | user | - |
| `/dashboard` | UserDashboard | AuthGuard | user | - |
| `/exercises` | ExerciseLibrary | AuthGuard | user | - |
| `/workout/new` | ExerciseLibrary | AuthGuard | user | - |
| `/workout/builder` | WorkoutBuilder | AuthGuard | user | - |
| `/workout/session` | ActiveWorkoutScreen | AuthGuard | user | - |
| `/workout/history` | WorkoutHistory | AuthGuard | user | - |
| `/workout/history/:id` | WorkoutHistory | AuthGuard | user | `id` |
| `/personal-records` | PersonalRecords | AuthGuard | user | - |
| `/analysis` | TrainingAnalysis | AuthGuard | user | - |
| `/inbox` | TraineeInbox | AuthGuard | user | - |
| `/progress` | UserDashboard (TODO) | AuthGuard | user | - |
| `/profile` | UserDashboard (TODO) | AuthGuard | user | - |
| `/trainer` | TrainerDashboard | AuthGuard | trainer | - |
| `/trainer/trainee/:id` | TraineeDetail | AuthGuard | trainer | `id` |
| `/trainer/trainee/:id/messages` | TraineeDetail | AuthGuard | trainer | `id` |
| `/trainer/trainee/:id/personal-records` | TraineePersonalRecords | AuthGuard | trainer | `id` |
| `/trainer/trainee/:id/analytics` | TraineeAnalytics | AuthGuard | trainer | `id` |
| `/trainer/program/new` | ProgramBuilder | AuthGuard | trainer | - |
| `/trainer/program/:id/edit` | ProgramBuilder | AuthGuard | trainer | `id` |
| `/trainer/messages` | MessageCenter | AuthGuard | trainer | - |
| `/admin` | → redirect `exercises` | AuthGuard | admin | - |
| `/admin/exercises` | ExerciseList | AuthGuard | admin | - |
| `/admin/exercises/new` | ExerciseForm | AuthGuard | admin | - |
| `/admin/exercises/:id/edit` | ExerciseForm | AuthGuard | admin | `id` |
| `/admin/muscles` | MuscleManager | AuthGuard | admin | - |
| `/admin/equipment` | EquipmentManager | AuthGuard | admin | - |
| `/admin/band-types` | BandTypeManager | AuthGuard | admin | - |
| `/admin/exercise-sets` | ExerciseSetManager | AuthGuard | admin | - |
| `/admin/report-types` | ReportTypeManager | AuthGuard | admin | - |
| `/admin/users` | UsersList | AuthGuard | admin | - |
| `/admin/settings` | AdminSettings | AuthGuard | admin | - |
| `*` | → redirect `/login` | - | - | - |

**Lazy Loading:** כל הדפים נטענים ב-lazy loading עם `React.lazy()` + `Suspense`

---

## 8. מסכים

### 8.1 מסך כניסה (LoginPage)

#### תיאור
מסך הרשמה וכניסה למערכת. מוצג רק למשתמשים לא מחוברים (GuestGuard).

#### Layout
```
┌─────────────────────────────────┐
│     [לוגו GymIQ + Dumbbell]    │
│    "פלטפורמת הכושר החכמה שלך"  │
├─────────────────────────────────┤
│  ┌───────────────────────────┐  │
│  │   כניסה ל-GymIQ           │  │
│  │   "הזינו את פרטי ההתחברות" │  │
│  │                           │  │
│  │   [📧 אימייל        ]     │  │
│  │   [🔒 סיסמה    👁   ]     │  │
│  │                           │  │
│  │   [   התחבר   ]           │  │
│  │                           │  │
│  │  אין לך חשבון? הירשם עכשיו│  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

#### אלמנטים
- **לוגו:** Dumbbell icon בתוך ריבוע gradient + אנימציית pulse-glow
- **שדה אימייל:** input-neon, dir="ltr", placeholder "your@email.com", אייקון Mail בצד שמאל
- **שדה סיסמה:** input-neon, dir="ltr", אייקון Lock + toggle Eye/EyeOff
- **כפתור התחבר:** btn-neon, מציג LoadingSpinner בטעינה
- **לינק הירשם:** מעביר למצב register
- **מצב הרשמה:** מוסיף שדות שם פרטי, שם משפחה, אימות סיסמה

#### Validation
- **כניסה:** email valid, password min 6
- **הרשמה:** + firstName min 2, lastName min 2, passwords match

#### State
- `mode`: 'login' | 'register'
- `showPassword`: boolean
- React Hook Form + Zod validation

#### Data Flow
- `useAuthStore().login()` → Firebase Auth
- `useAuthStore().register()` → Firebase Auth + Firestore user doc
- After auth: redirect to `/dashboard` or `/admin` (based on role)

---

### 8.2 דשבורד משתמש (UserDashboard)

#### תיאור
מסך הבית למתאמנים. מציג סטטיסטיקות, קיצורי דרך, ותוכנית מאמן (אם קיימת).

#### Layout
```
┌─────────────────────────────────┐
│  שלום [שם]    גרסה X.X.X       │
├─────────────────────────────────┤
│  ┌──────┐ ┌──────┐ ┌──────┐    │
│  │אימונים│ │ סטים │ │נפח   │    │
│  │ XX   │ │ XX   │ │XX kg │    │
│  └──────┘ └──────┘ └──────┘    │
│                                 │
│  ┌──────┐ ┌──────┐ ┌──────┐    │
│  │ רצף  │ │שיאים │ │זמן   │    │
│  │ X ימ │ │  X   │ │X דק  │    │
│  └──────┘ └──────┘ └──────┘    │
│                                 │
│  [תוכנית מאמן - אם קיימת]      │
│                                 │
│  ┌─────────────────────────┐    │
│  │  🏋️ התחל אימון חדש       │    │
│  └─────────────────────────┘    │
│                                 │
│  ┌──────┐ ┌──────┐ ┌──────┐    │
│  │היסטו.│ │שיאים │ │ניתוח │    │
│  │ ריה  │ │אישיים│ │  AI  │    │
│  └──────┘ └──────┘ └──────┘    │
│                                 │
│  [ממשק מאמן] [ממשק ניהול]      │
│    (תנאי)      (תנאי)          │
│                                 │
│  [🤖 מאמן AI]                   │
└─────────────────────────────────┘
```

#### אלמנטים
- **כרטיסי סטטיסטיקה:** 6 כרטיסים (אימונים השבוע, סטים, נפח, רצף, שיאים, זמן ממוצע)
- **תוכנית מאמן:** אם `user.trainerId` קיים - מציג תוכנית פעילה עם "היום של היום"
- **כפתור התחל אימון:** btn-primary, navigates to `/exercises`
- **קיצורי דרך:** היסטוריה (`/workout/history`), שיאים (`/personal-records`), ניתוח AI (`/analysis`)
- **כפתור מאמן:** מוצג רק ל-trainer/admin, לינק ל-`/trainer`
- **כפתור ניהול:** מוצג רק ל-admin, לינק ל-`/admin`
- **מאמן AI:** פותח AITrainerModal

#### Data Flow
- `getUserWorkoutStats(userId)` → סטטיסטיקות
- `useTraineeProgram()` → תוכנית מאמן (אם קיימת)
- `useVersionCheck()` → בדיקת גרסה

---

### 8.3 ספריית תרגילים (ExerciseLibrary)

#### תיאור
מסך בחירת תרגילים לאימון חדש. תומך במספר מצבים: בחירה לאימון חדש, הוספה לאימון קיים, בחירה לתוכנית מאמן.

#### Layout
```
┌─────────────────────────────────┐
│  [←]  בחירת תרגילים     [X/Y]  │
├─────────────────────────────────┤
│  [עכשיו] [היום] [תאריך אחר]    │
├─────────────────────────────────┤
│  [כל השרירים ▼] [כל הציוד ▼]   │
│  [תת-שריר: הכל | חזה עליון...] │
├─────────────────────────────────┤
│  סטים מומלצים                   │
│  ┌─────┐ ┌─────┐ ┌─────┐       │
│  │סט 1 │ │סט 2 │ │סט 3 │       │
│  └─────┘ └─────┘ └─────┘       │
├─────────────────────────────────┤
│  ┌─────────────────────────┐    │
│  │ [✓] [🖼️] שם תרגיל        │    │
│  │     ציוד | שריר          │    │
│  │     [אימון אחרון] [חודש] │    │
│  └─────────────────────────┘    │
│  ┌─────────────────────────┐    │
│  │ [○] [🖼️] שם תרגיל        │    │
│  │     ציוד | שריר          │    │
│  └─────────────────────────┘    │
│  ...                            │
├─────────────────────────────────┤
│  [     התחל אימון (X)     ]    │
└─────────────────────────────────┘
```

#### אלמנטים
- **כותרת:** שם דינמי לפי מצב (בחירת תרגילים / הוספה לאימון)
- **מונה:** X תרגילים נבחרו
- **תזמון:** כפתורי "עכשיו", "היום", "תאריך אחר" (DatePicker)
- **פילטרים:** dropdown לשריר ראשי, תת-שריר, ציוד
- **סטים מומלצים:** כרטיסים אופקיים מ-`exerciseSets` (בחירת סט מוסיף את כל התרגילים שלו)
- **רשימת תרגילים:** כרטיסים עם checkbox, תמונה, שם (עברית), ציוד, שרירים
- **תגיות:** "אימון אחרון" (כתום) אם בוצע באימון האחרון, "חודש" (סגול) אם בוצע ב-30 יום אחרונים
- **כפתור תחתון:** "התחל אימון (X)" - navigates to `/workout/session`

#### Mobile Behavior
- פילטרים scrollable אופקית
- כרטיסי סטים מומלצים scrollable אופקית
- כפתור תחתון fixed

---

### 8.4 אימון פעיל (ActiveWorkoutScreen)

#### תיאור
מסך ביצוע אימון - דיווח סטים בזמן אמת, טיימר מנוחה, חגיגות שיאים.

#### Layout
```
┌─────────────────────────────────┐
│  [✕ יציאה]  [⏱ 00:45:30]  [✓] │
│  4/6 תרגילים הושלמו            │
│  [לפי שריר ▼] [לפי ציוד]       │
├─────────────────────────────────┤
│  ━━ חזה ━━━━━━━━━━━━━━━━       │
│  ┌─────────────────────────┐    │
│  │ [○] לחיצת חזה שטוחה  [▼]│    │
│  │     אימון קודם: 80×10   │    │
│  │  ┌──────────────────┐   │    │
│  │  │ 1  [80kg] [10]  [✓]│   │    │
│  │  │ 2  [85kg] [_8]  [ ]│   │    │
│  │  │ 3  [__kg] [__]  [ ]│   │    │
│  │  └──────────────────┘   │    │
│  │  [+ הוסף סט]            │    │
│  └─────────────────────────┘    │
│                                 │
│  ━━ גב ━━━━━━━━━━━━━━━━━       │
│  ┌─────────────────────────┐    │
│  │ [●] מתח  (הושלם)     [▼]│    │
│  └─────────────────────────┘    │
│  ...                            │
├─────────────────────────────────┤
│  [      סיים אימון      ]      │
└─────────────────────────────────┘
```

#### אלמנטים
- **Header:** כפתור יציאה, טיימר חי (mm:ss:ss), כפתור סיום
- **מונה תרגילים:** "X/Y תרגילים הושלמו"
- **מיון:** toggle בין "לפי שריר" ו"לפי ציוד"
- **קבוצות שרירים:** sections מקובצים לפי שריר/ציוד, header עם קו תחתון
- **כרטיס תרגיל:**
  - Checkbox סיום, שם בעברית, תמונה, כפתור expand
  - כפתור מחיקה (Trash)
  - "אימון קודם: XXkg × XX" (באדום)
  - שורות סטים: מספר סט, שדה משקל (kg), שדה חזרות, checkbox סיום
  - שדות מותאמים לפי reportType: זמן (mm:ss), עצימות, מהירות, מרחק, שיפוע
  - שדות assistance: משקל נגד (graviton), גומייה (bands)
  - כפתור "+ הוסף סט"
  - כפתור notes (הערות)
- **Bottom bar:** כפתור "סיים אימון" (ירוק)

#### Modals
- **ConfirmationModal:** אישור יציאה/סיום/מחיקה
- **WorkoutSummaryModal:** סיכום אימון + שדה קלוריות
- **RestTimer:** טיימר מנוחה עיגולי עם countdown
- **WeightIncreasePopup:** חגיגת שיא (קונפטי + אנימציות)
- **NotesModal:** עריכת הערות לתרגיל

#### Data Flow
- `useActiveWorkout()` → מנהל כל מצב האימון
- Auto-save: localStorage (מיידי) + Firebase (debounced 10 שניות)
- Recovery: בפתיחת אפליקציה בודק localStorage → Firebase

---

### 8.5 היסטוריית אימונים (WorkoutHistory)

#### תיאור
רשימת אימונים קודמים עם אפשרות המשך, מחיקה, וצפייה בפרטים.

#### אלמנטים
- **תוכנית מאמן:** אם קיימת - כרטיסי ימים עם תרגילים (אפשר להתחיל מכאן)
- **רשימת אימונים:** כרטיסים מורחבים עם:
  - שם, תאריך, משך, סטטוס badge
  - רשימת תרגילים בהרחבה (שם, סטים, משקלים)
  - כפתורי: המשך, מחיקה
- **סטטוס badges:**
  - הושלם (כחול)
  - בתהליך (צהוב)
  - מתוכנן (אדום)
  - ללא דיווח (אפור)

#### Data Flow
- `getUserWorkoutHistory()` → paginated list
- `getWorkoutById()` → full details on expand
- `softDeleteWorkout()` → marks deleted (preserves data)

---

### 8.6 שיאים אישיים (PersonalRecords)

#### תיאור
תצוגת שיאים אישיים לכל תרגיל עם חצי שיפור.

#### אלמנטים
- **מיון:** לפי תאריך / לפי שיפור
- **כרטיסי PR:**
  - תמונת תרגיל, שם בעברית
  - משקל שיא, חזרות שיא, תאריך
  - חצי שיפור ירוקים (משקל) / כתומים (חזרות) עם glow
  - הרחבה: היסטוריית תרגיל (timeline)

---

### 8.7 ניתוח אימונים AI (TrainingAnalysis)

#### תיאור
ניתוח AI מבוסס על היסטוריית האימונים. מפעיל Cloud Function.

#### אלמנטים
- **Loading state:** אנימציית טעינה עם spinner
- **Error states:** rate limit, not enough data (min 4 workouts), network error
- **Results:**
  - כותרת, סקירה כללית
  - חוזקות (ירוק)
  - חולשות (כתום)
  - המלצות (כחול)
  - סיכום
  - תגית "cached" / "fresh"
  - כפתור רענון

#### Data Flow
- `getCachedAnalysis()` → בודק cache ב-Firestore
- `getTrainingAnalysis()` → Cloud Function `generateTrainingAnalysis`

---

### 8.8 דשבורד מאמן (TrainerDashboard)

#### תיאור
מסך ראשי של ממשק המאמן. מציג סטטיסטיקות כלליות ורשימת מתאמנים עם כרטיסיות.

#### Layout
```
┌─────────────────────────────────┐
│  [Stats Row - 4 כרטיסיות]       │
│  מתאמנים פעילים | אימונים השבוע  │
│  ממוצע ציות | הודעות              │
├─────────────────────────────────┤
│  כותרת: "המתאמנים שלי"          │
│  [כפתור רענון] [כפתור הוסף מתאמן]│
├─────────────────────────────────┤
│  [Grid 2 עמודות - TraineeCard]  │
│  ┌──────────┐ ┌──────────┐      │
│  │ שם+אווטר │ │ שם+אווטר │      │
│  │ תוכנית    │ │ תוכנית    │      │
│  │ סטטיסטיקה │ │ סטטיסטיקה │      │
│  └──────────┘ └──────────┘      │
└─────────────────────────────────┘
```

#### אלמנטים
- **שורת סטטיסטיקות (4 כרטיסים):**
  - מתאמנים פעילים (trainees.length)
  - אימונים השבוע (סכום thisWeekWorkouts)
  - ממוצע ציות % (ממוצע programCompletionRate)
  - סה"כ הודעות (totalMessages)
- **כפתור רענון:** `refreshTrainees()`, אייקון מסתובב בטעינה
- **כפתור "הוסף מתאמן חדש":** פותח TraineeRegistrationModal, gradient ירוק-כחול
- **TraineeCard לכל מתאמן:**
  - אווטר עם ראשי תיבות (gradient לפי hash של השם)
  - נקודת סטטוס (ירוק ≥3 אימונים/שבוע, צהוב ≥1, אדום 0)
  - סטטוס תוכנית (פעילה/אין תוכנית)
  - Grid 2 כרטיסי מידע: "השבוע" + "רצף נוכחי"
  - Badge "דורש תשומת לב" (אם 0 אימונים השבוע ו->5 ימים מאז אחרון)
  - לחיצה → `/trainer/trainee/{id}`

#### State
- `showRegistrationModal: boolean` - פתיחת modal רישום
- `totalMessages: number` - סה"כ הודעות

#### Data Flow
- `useTrainerData()` → trainees, isLoading, error, refreshTrainees
- `useAuthStore()` → user
- `messageService.getTrainerMessages(user.uid, 100)` → ספירת הודעות

---

### 8.9 פרטי מתאמן (TraineeDetail)

#### תיאור
מסך מפורט של מתאמן בודד - פרופיל, תוכניות אימון, אימונים אחרונים, כפתורי פעולה.

#### Layout
```
┌─────────────────────────────────┐
│ [←חזור]         [✉ שלח הודעה]   │
├─────────────────────────────────┤
│ [TraineeProfileSection]          │
│  אווטר גדול + שם + אימייל       │
│  מטריקות: גיל, גובה, משקל, שומן│
│  יעדי אימון (badges)            │
│  פציעות (alert box)             │
│  הערות מאמן (info box)          │
│  SVG progress circle            │
├─────────────────────────────────┤
│ [TraineePerformance]             │
│  4 כרטיסי סטטיסטיקה             │
│  סה"כ | רצף | השבוע | PR        │
├─────────────────────────────────┤
│ תוכניות אימונים                 │
│ [תוכנית חדשה][רשימת תוכניות]   │
│ [אימון עצמאי]                    │
│                                  │
│ [רשימת תוכניות - collapsible]    │
│   └── ימי אימון (expand)        │
│       └── תרגילים + ביצועים     │
│                                  │
│ [אימונים עצמאיים]               │
├─────────────────────────────────┤
│ אימונים אחרונים (collapsible)    │
│  WorkoutCard × 10               │
└─────────────────────────────────┘
```

#### אלמנטים
- **כפתור חזרה:** → `/trainer`
- **כפתור שלח הודעה:** פותח MessageComposer modal
- **TraineeProfileSection:**
  - אווטר גדול עם ראשי תיבות ו-gradient
  - שם מלא, אימייל, טלפון
  - badges: יעדי אימון
  - alert box צהוב: פציעות/מגבלות
  - info box כחול: הערות מאמן
  - SVG עיגול progress (שיעור ציות)
  - כפתור עריכה → פותח TraineeEditModal
- **TraineePerformance (4 כרטיסים):**
  - סה"כ אימונים (click → analytics?tab=total)
  - רצף נוכחי (click → analytics?tab=streak)
  - השבוע (click → analytics?tab=weekly)
  - שיאים (click → analytics?tab=pr)
- **סקציית תוכניות:**
  - כפתור "תוכנית חדשה" → `/trainer/program/new?traineeId={id}`
  - כפתור "רשימת תוכניות" → toggle expandable list
  - כפתור "אימון עצמאי" → פותח StandaloneWorkoutEditor
  - רשימת תוכניות (collapsible): שם, סטטוס, ימים
  - כל יום ניתן להרחבה → תרגילים + נתוני ביצוע
  - כפתור "דווח אימון" לכל יום שלא בוצע
  - כפתור "ערוך תוכנית" → `/trainer/program/{id}/edit`
  - תוכנית מנותקת: opacity-60, כפתור "שלח שוב"
- **אימונים עצמאיים:** רשימה עם כפתורי דיווח/מחיקה
- **אימונים אחרונים:** TraineeRecentWorkouts component (collapsible, 10 אימונים)

#### State
- `trainee: TraineeWithStats | null` - פרופיל מתאמן
- `stats: TraineeStats | null` - סטטיסטיקות
- `workouts: WorkoutHistorySummary[]` - אימונים אחרונים
- `allPrograms: TrainingProgram[]` - כל התוכניות
- `showProgramsList, expandedProgramId, expandedDayIndex` - ניהול הרחבות
- `showEditModal, showStandaloneEditor, showMessageComposer` - modals
- `deleteStandaloneId` - אישור מחיקת אימון עצמאי

#### Data Flow
- `trainerService.getTrainerTrainees()` → מציאת מתאמן
- `trainerService.getTraineeStats()` → סטטיסטיקות
- `getUserWorkoutHistory(traineeId, 10, true)` → אימונים אחרונים
- `programService.getTraineePrograms(traineeId, true)` → תוכניות (כולל מנותקות)
- `getWorkoutById()` → פרטי אימון מלאים בהרחבה

#### Modals
1. **TraineeEditModal** - עריכת פרופיל מתאמן
2. **StandaloneWorkoutEditor** - יצירת אימון עצמאי
3. **MessageComposer** - שליחת הודעה
4. **Delete Confirmation** - אישור מחיקת אימון עצמאי

---

### 8.10 בונה תוכניות (ProgramBuilder)

#### תיאור
Wizard של 4 שלבים ליצירת/עריכת תוכנית אימונים למתאמן.

#### Layout - Desktop
```
┌─────────────────────────────────┐
│ [←חזרה] כותרת [שמור טיוטה]     │
├──────────────────────┬──────────┤
│  70% - Builder Area  │ 30%      │
│                      │TraineeSide│
│  Step Indicator:     │Panel     │
│  [1]→[2]→[3]→[4]    │          │
│                      │ סטטיסטיקות│
│  תוכן משתנה לפי step │ יעדים    │
│                      │ פציעות   │
│                      │ תוכנית   │
├──────────────────────┴──────────┤
│ [כפתורי ניווט]                   │
└─────────────────────────────────┘
```

#### Layout - Mobile
```
┌─────────────────────────────────┐
│ Header + Tabs                    │
│ [תוכנית | מתאמן | היסטוריה]     │
├─────────────────────────────────┤
│ תוכן לפי tab:                   │
│ - תוכנית: wizard steps          │
│ - מתאמן: TraineeSidePanel       │
│ - היסטוריה: TraineeHistoryPanel  │
├─────────────────────────────────┤
│ [Fixed Bottom Bar]               │
└─────────────────────────────────┘
```

#### 4 שלבים
**Step 1 - פרטים:**
- בחירת מתאמן (dropdown מרשימת trainees)
- שם תוכנית (חובה)
- תיאור (אופציונלי)
- תאריך התחלה (date picker)
- מספר שבועות (אופציונלי)

**Step 2 - מבנה שבועי:**
- ProgramDayCard × N (מקסימום 7 ימים)
- כל כרטיס: שם יום (A, B, C...) + שם (חזה+טרייספס) + ספירת תרגילים
- כפתורים: הוסף יום, העתק יום, מחק יום, עריכת שם
- תבניות מוכנות: PPL, Upper-Lower, Full Body

**Step 3 - תרגילים:**
- ProgramDayEditor לכל יום: ExerciseLibrary picker + inline editing
- לכל תרגיל: סטים, חזרות (טקסט "8-12"), זמן מנוחה, הערות
- Mobile: MobileDaySelector (scroll אופקי) + MobileExerciseCard

**Step 4 - סקירה:**
- ProgramReview: סיכום מלא עם סטטיסטיקות
- ימי אימון/מנוחה, סה"כ תרגילים, סה"כ סטים
- כרטיסי ימים מתקפלים עם רשימות תרגילים

#### Validation
- Step 1: שם + מתאמן (חובה)
- Step 2: לפחות יום 1 עם תרגילים
- Step 3: זהה ל-2
- Step 4: תמיד תקין

#### State
- `step: 1|2|3|4` - שלב נוכחי
- `name, traineeId, description, durationWeeks, startDate` - פרטי תוכנית
- `days: ProgramDay[]` - מבנה ימים
- `editingDayIndex` - יום בעריכה
- `draftId` - שמירת טיוטה אוטומטית
- Mobile: `mobileTab, selectedMobileDayIndex, showExercisePicker`

#### Data Flow
- `trainerService.getTrainerTrainees()` → רשימת מתאמנים
- `programService.getProgram()` → טעינה לעריכה
- `programService.createProgram()` / `updateProgram()` → שמירה
- `programService.activateProgram()` → הפעלה

#### Sub-components
- **TraineeSidePanel:** פרופיל, סטטיסטיקות, יעדים, תוכנית נוכחית
- **TraineeHistoryPanel:** היסטוריית אימונים לפי ימי תוכנית, פילטר (הכל/שבוע/חודש)
- **ProgramDayCard:** כרטיס יום עם handle, שם, ספירות, כפתורי פעולה
- **ProgramDayEditor:** עריכת יום מלא עם ExerciseLibrary picker
- **ProgramExerciseEditor:** עריכת תרגיל (סטים, חזרות, מנוחה, הערות)
- **ProgramReview:** סקירה סופית עם ימים מתקפלים
- **MobileDaySelector:** בורר ימים אופקי (scroll)
- **MobileExerciseCard:** כרטיס תרגיל קומפקטי למובייל

---

### 8.11 מרכז הודעות (MessageCenter)

#### תיאור
מסך שליחה וצפייה בהודעות מאמן למתאמנים.

#### Layout
```
┌─────────────────────────────────┐
│ כותרת: "הודעות"                 │
│              [הודעה חדשה]        │
├─────────────────────────────────┤
│ [MessageComposer - conditional]  │
│  בחירת מתאמן | סוג | עדיפות     │
│  נושא | תוכן | [שלח]            │
├─────────────────────────────────┤
│ [MessageList]                    │
│  ┌───────────────────────┐      │
│  │ MessageCard            │      │
│  │ סוג + עדיפות + timestamp│     │
│  │ נושא + תוכן (3 שורות)  │     │
│  │ סטטוס: נקרא/לא נקרא   │      │
│  └───────────────────────┘      │
│  ...                             │
└─────────────────────────────────┘
```

#### אלמנטים
- **כפתור "הודעה חדשה":** toggle של MessageComposer
- **MessageComposer:**
  - בחירת מתאמן (dropdown)
  - סוג הודעה (general, workout_feedback, nutrition, etc.)
  - עדיפות (normal, high)
  - נושא (text)
  - תוכן (textarea)
  - כפתור שלח
- **MessageList:** רשימת MessageCard
- **MessageCard:**
  - badge סוג + badge עדיפות + timestamp
  - נושא (אם קיים)
  - תוכן (clamp 3 שורות)
  - אינדיקטור: Clock (לא נקרא) / CheckCircle (נקרא)
  - גבול ימני ירוק אם לא נקרא
  - גבול שמאלי אדום אם עדיפות גבוהה

#### State
- `showComposer: boolean`
- `trainees: TrainerRelationship[]`

#### Data Flow
- `trainerService.getTrainerTrainees()` → מתאמנים
- `useTrainerMessages()` → messages, isLoading, refreshMessages
- `messageService.sendMessage()` → שליחה

---

### 8.12 ניתוח מתאמן (TraineeAnalytics)

#### תיאור
מסך אנליטיקס מפורט עם 4 טאבים - סטטיסטיקות, רצף, ציות שבועי, שיאים אישיים.

#### Layout
```
┌─────────────────────────────────┐
│ [←חזרה] "ניתוח ביצועים"         │
├─────────────────────────────────┤
│ [📊 סה"כ][🔥 רצף][📅 השבוע][🏆 PR]│
├─────────────────────────────────┤
│ [תוכן לפי טאב פעיל]            │
└─────────────────────────────────┘
```

#### Tab 1: סה"כ אימונים (TotalWorkoutsTab)
- **4 StatCards:**
  - אימונים החודש (variant=highlight)
  - סה"כ מתחילת השנה
  - ממוצע לשבוע
  - זמן ממוצע לאימון
- **גרף עמודות שבועי:** 8 שבועות, גובה 140px, צבע לפי ציות (ירוק/כתום/אדום)
- **התפלגות סוגי אימון:** progress bars אופקיים עם אחוזים
- **AIInsights:** תובנות AI (קופסה סגולה עם 🤖)

#### Tab 2: רצף ימים (StreakTab)
- **2 StatCards:** רצף נוכחי (variant=warning) + שיא אישי (variant=highlight)
- **HeatmapCalendar:** לוח חודשי 7×N, 5 רמות צבע (primary 25%-100%), ניווט חודשים, אינדיקטור היום (ring כתום), ימים מחוץ לחודש opacity-30
- **PatternChart:** גרף 7 עמודות (ימים בשבוע), גובה 60px, אחוז צבעוני
- **AIInsights**

#### Tab 3: ציות שבועי (WeeklyComplianceTab)
- **4 StatCards:** השבוע + ממוצע ציות + שבועות מושלמים + יום מדולג
- **WeeklyProgressBars:** 8 שבועות, bars אופקיים, צבע (ירוק 100%, כתום 60-99%, אדום <60%), טקסט "done/planned"
- **SkipAnalysis:** רשימת ימים עם badges צבעוניות (5 צבעים מתחלפים), שם יום + "בוצע X מתוך Y" + אחוז
- **AIInsights**

#### Tab 4: שיאים אישיים (PRTab)
- **4 StatCards:** שיאים החודש + סה"כ + תרגילים מתקדמים + תרגילים תקועים
- **שיאים אחרונים:** PRCard × 5, גבול ירוק, תמונת תרגיל, שם, משקל/חזרות, שיפור
- **תרגילים תקועים:** PRCard, גבול אדום, "ללא שיפור X שבועות"
- **AIInsights**

#### Sub-components
- **StatCard:** כרטיס מטריקה עם ערך, תווית, מגמה. variants: default/highlight/warning/success
- **HeatmapCalendar:** Grid 7 עמודות, כותרות ימים בעברית, 5 רמות אופסיטי, ניווט חודשים
- **WeeklyProgressBars:** 8 bars אופקיים עם gradients
- **PatternChart:** 7 עמודות אנכיות עם gradient, צבע אחוז לפי ערך
- **PRCard:** כרטיס שיא (תמונה/🏋️, שם, ערך, delta, תאריך)
- **AIInsights:** כרטיס סגול עם 🤖 + רשימת תובנות (icon + כותרת + תיאור)
- **SkipAnalysis:** רשימת ימים מדולגים עם badges צבעוניות ואחוזים

#### State
- Tab פעיל מנוהל דרך URL searchParams (`?tab=total|streak|weekly|pr`)
- `useTraineeAnalytics(traineeId)` → כל הנתונים

#### Data Flow
- `useTraineeAnalytics()` hook טוען 200 אימונים + שיאים + תוכניות
- מחשב: weeklyChart, heatmapData, dayPatterns, weeklyCompliance, skipAnalysis, recentPRs, stuckExercises
- AIInsights נוצרות מחישובים (לא API)

---

### 8.13 תיבת דואר מתאמן (TraineeInbox)

#### תיאור
תיבת דואר נכנס של מתאמן - הודעות מהמאמן.

#### Layout
```
┌─────────────────────────────────┐
│ כותרת: "הודעות"                 │
│ תת-כותרת: X הודעות שלא נקראו    │
├─────────────────────────────────┤
│ [InboxMessageCard]               │
│  שם מאמן | סוג | עדיפות         │
│  timestamp + סטטוס קריאה         │
│  נושא (bold אם לא נקרא)         │
│  תוכן (2 שורות preview)          │
│  ──── expanded content ────     │
│  תוכן מלא (אם מורחב)            │
├─────────────────────────────────┤
│ [InboxMessageCard]...            │
└─────────────────────────────────┘
```

#### אלמנטים
- **InboxMessageCard:**
  - גבול ימני כחול אם לא נקרא, + רקע primary/5
  - אייקון alert circle אדום אם עדיפות גבוהה
  - Clock (לא נקרא) / CheckCircle (נקרא)
  - נושא bold/medium לפי סטטוס
  - preview תוכן (2 שורות clamp)
  - לחיצה: מסמן כנקרא + toggle expansion
- **InboxBadge:** עיגול אדום עם מספר (99+ אם מעל 99), מוצג רק אם unreadCount > 0
- **Empty state:** אייקון Mail + "אין הודעות"

#### State
- `messages: TrainerMessage[]`
- `isLoading: boolean`
- `expandedId: string | null`

#### Data Flow
- `messageService.getTraineeMessages(user.uid)` → טעינת הודעות
- `messageService.markAsRead(messageId)` → סימון כנקרא
- `useMessageStore().setUnreadCount()` → עדכון badge

---

### 8.14 שיאי מתאמן (TraineePersonalRecords)

#### תיאור
Wrapper component שמציג את PersonalRecords (סעיף 8.6) עם userId של מתאמן.

#### אלמנטים
- רינדור `<PersonalRecords userId={traineeId} />`
- traineeId מתוך `useParams()`

---

### 8.15 רישום מתאמן (TraineeRegistrationModal)

#### תיאור
Modal לרישום מתאמן חדש או קישור מתאמן קיים למאמן, ללא logout של המאמן.

#### Layout
```
┌─────────────────────────────────┐
│ [X סגור]                        │
│ כותרת: "רישום מתאמן חדש"        │
│         / "הוספת מתאמן קיים"     │
├─────────────────────────────────┤
│ [שגיאה - conditional]            │
│ Email: [_______________] ←check │
│ [סטטוס בדיקת email]             │
│ [banner מידע על משתמש קיים]      │
│                                  │
│ שם פרטי: [_______]               │
│ שם משפחה: [_______]              │
│ סיסמה: [_______] (רק חדש)       │
│ טלפון: [_______]                 │
│                                  │
│ גיל: [__] גובה: [__]            │
│ משקל: [__] אחוז שומן: [__]      │
│                                  │
│ יעדי אימון: [pill buttons]       │
│ פציעות: [textarea]               │
│ הערות: [textarea]                │
│                                  │
│ [כפתור שמירה]                    │
└─────────────────────────────────┘
```

#### אלמנטים ולוגיקה
- **Email field:**
  - debounce 500ms → בדיקה אסינכרונית
  - סטטוסים: idle → checking → new_user / available / has_trainer / already_yours
  - `new_user`: שדות שם + סיסמה פעילים
  - `available`: שדות שם disabled (נטענים מהמשתמש), בלי סיסמה
  - `has_trainer`: שגיאה "למתאמן כבר יש מאמן אחר"
  - `already_yours`: שגיאה "המתאמן כבר שלך"
- **שדות גוף:** גיל, גובה (ס"מ), משקל (ק"ג), אחוז שומן - אופציונליים
- **יעדי אימון:** pill buttons toggleable:
  - muscle_gain, weight_loss, strength, endurance, flexibility, general_fitness, rehabilitation, sport_specific
- **פציעות/מגבלות:** textarea
- **הערות מאמן:** textarea

#### State
- `formData: CreateTraineeData` - כל שדות הטופס
- `emailCheckStatus: EmailCheckStatus` - סטטוס בדיקת email
- `existingUser: AppUser | null` - משתמש קיים שנמצא
- `isSubmitting: boolean`

#### Data Flow
- `trainerService.findUserByEmail(email)` → בדיקת email
- `trainerService.checkTrainerRelationship()` → בדיקה אם כבר מקושר
- משתמש חדש: `traineeAccountService.createTraineeAccount()` → Firebase Auth secondary app + Firestore doc + relationship
- משתמש קיים: `traineeAccountService.linkExistingUser()` → עדכון user doc + relationship

### 8.16 Layout ניהול (AdminLayout)

#### תיאור
Layout wrapper למסכי ניהול עם sidebar ניווט.

#### Layout
```
┌───────────────┬─────────────────────┐
│ Sidebar (256px)│  Main Content       │
│               │                     │
│ Logo + GymIQ  │  Top bar + title    │
│ [חזרה לאפליקציה]│                   │
│               │  <Outlet />         │
│ ☰ תרגילים     │                     │
│ ☰ שרירים      │                     │
│ ☰ ציוד        │                     │
│ ☰ סטים מומלצים│                     │
│ ☰ סוגי גומיות │                     │
│ ☰ סוגי דיווח  │                     │
│ ☰ משתמשים     │                     │
│ ☰ הגדרות      │                     │
│               │                     │
│ [User + Logout]│                    │
└───────────────┴─────────────────────┘
```

#### Mobile
- Hamburger menu → sidebar overlay עם backdrop
- top bar עם כותרת

---

### 8.17 רשימת תרגילים (ExerciseList)

#### תיאור
מסך ניהול תרגילים עם חיפוש, פילטרים מתקדמים, export/import, ובדיקת בעיות נתונים.

#### Layout
```
┌─────────────────────────────────┐
│ כותרת + 9 כפתורי פעולה          │
│ [ייצוא JSON][ייצוא CSV][ייבוא]  │
│ [מחק הכל][תקן קטגוריות]        │
├─────────────────────────────────┤
│ [🔍 חיפוש] [Toggle Filters]     │
│ [פילטרים - collapsible]         │
│  קטגוריה | דרגה | ציוד | עדכון  │
│  בעיות נתונים                    │
├─────────────────────────────────┤
│ טבלת תרגילים (N תוצאות)         │
│ ┌────┬──────┬────┬────┬────┐    │
│ │Img │ שם   │עדכון│קטגו│ דרגה│    │
│ │    │      │    │ריה │     │    │
│ │    │      │    │    │ [✏️🗑]│    │
│ └────┴──────┴────┴────┴────┘    │
└─────────────────────────────────┘
```

#### אלמנטים
- **כפתורי פעולה (header):**
  - ייצוא JSON → `exerciseService.exportExercises()` → download
  - ייצוא CSV → CSV עם BOM ל-Excel + עברית, arrays מופרדי pipe
  - ייבוא JSON → file upload + `exerciseService.bulkImport()`
  - מחק הכל (עם אישור) → `exerciseService.deleteAllExercises()`
  - תקן קטגוריות → `fixInvalidCategories()`
- **פילטרים:**
  - חיפוש (שם EN/HE)
  - קטגוריה (dropdown מ-Firebase muscles)
  - דרגה (beginner/intermediate/advanced)
  - ציוד (dropdown מ-Firebase equipment)
  - סטטוס עדכון (הכל/עודכנו/לא עודכנו)
  - בעיות נתונים (ללא primary/primary לא תקין/category לא תקין/תקינים)
  - תמונות חסרות (toggle), ללא ציוד (toggle)
- **מיון:** לפי שם / לפי תאריך עדכון (toggle)
- **פילטרים persistent:** sessionStorage
- **שורת תרגיל:**
  - תמונה (thumbnail), שם (עם ⚠ אם בעיות), תאריך עדכון, badge קטגוריה, badge דרגה, שם ציוד
  - כפתורי עריכה (→ `/admin/exercises/{id}/edit`) ומחיקה (hover)

#### State
- `filters` (persistent via sessionStorage)
- `showOnlyMissingImages, showOnlyNoEquipment` - toggles
- `dataIssueFilter` - סוג בעיית נתונים
- `sortMode` - name / updatedAt
- React Query: `useQuery` + `useMutation`

---

### 8.18 טופס תרגיל (ExerciseForm)

#### תיאור
טופס יצירה/עריכה של תרגיל עם validation מורכב.

#### Layout
```
┌─────────────────────────────────┐
│ [←חזרה] יצירת/עריכת תרגיל       │
├─────────────────────────────────┤
│ Basic Info:                      │
│  שם (EN): [________]            │
│  שם (HE): [________]            │
│  קטגוריה: [dropdown - שרירים]    │
│  שריר ראשי: [dropdown - תת-שריר] │
│  שרירים משניים: [multi-select]   │
│  ציוד: [dropdown]               │
│  דרגה: [dropdown]               │
│  סוג דיווח: [dropdown]          │
├─────────────────────────────────┤
│ Assistance:                      │
│  ☐ Graviton  ☐ Bands            │
│  [בחירת גומיות - conditional]    │
├─────────────────────────────────┤
│ Image:                           │
│  URL: [________] [preview]       │
├─────────────────────────────────┤
│ Instructions (EN): [+ הוסף]     │
│  1. [________] [🗑]              │
│ Instructions (HE): [+ הוסף]     │
│  1. [________] [🗑]              │
├─────────────────────────────────┤
│ Tips (EN/HE): [+ הוסף]          │
│  Grid 2 columns                  │
├─────────────────────────────────┤
│ [ביטול] [שמור]                   │
└─────────────────────────────────┘
```

#### שדות טופס
| שדה | סוג | חובה | Validation |
|-----|------|------|-----------|
| name | text | כן | min 2 תווים |
| nameHe | text | כן | min 2 תווים |
| category | select | כן | חייב להיות ב-VALID_EXERCISE_CATEGORIES_SET |
| primaryMuscle | select | כן | תת-שריר תחת ה-category שנבחר |
| secondaryMuscles | multi-select | לא | muscle IDs |
| equipment | select | כן | מרשימת ציוד Firebase |
| difficulty | select | כן | beginner/intermediate/advanced |
| reportType | select | כן | מרשימת סוגי דיווח פעילים |
| assistanceTypes | checkboxes | לא | graviton, bands |
| availableBands | checkboxes | אם bands=true | לפחות 1 גומייה |
| imageUrl | URL | לא | URL תקין או ריק |
| instructions/instructionsHe | array | כן | לפחות 1 בכל שפה |
| tips/tipsHe | array | לא | רשימת טיפים |

#### Validation מיוחד
- **Category-SubMuscle mapping:** שינוי category מאפס primaryMuscle
- **Assistance validation:** Zod refine - אם bands נבחר, חייב לפחות 1 גומייה
- **Category validation:** VALID_EXERCISE_CATEGORIES_SET (legs, chest, back, shoulders, arms, core, cardio, functional, stretching)

#### Data Flow
- קריאה: `exerciseService.getExerciseById()`, `getMuscles()`, `getEquipment()`, `getActiveReportTypes()`, `getActiveBandTypes()`
- כתיבה: `exerciseService.createExercise()` / `updateExercise()`
- React Hook Form + Zod resolver

---

### 8.19 ניהול שרירים (MuscleManager)

#### תיאור
ניהול קבוצות שרירים (primary) ותת-שרירים (sub-muscles) עם hierarchy.

#### Layout
```
┌─────────────────────────────────┐
│ כותרת + [אתחול][סנכרון][אלץ עדכון]│
│          [הוסף שריר]             │
├─────────────────────────────────┤
│ [טופס הוספה - collapsible]       │
│  ID | שם HE | שם EN | Icon URL  │
├─────────────────────────────────┤
│ רשימת שרירים (expandable):       │
│ ┌───────────────────────┐       │
│ │ 🏋 חזה (chest) [✏🗑]  │       │
│ │  └ תת-שרירים:         │       │
│ │    [+ הוסף תת-שריר]   │       │
│ │    upper_chest - HE [✏🗑]│     │
│ │    mid_chest - HE [✏🗑]  │     │
│ └───────────────────────┘       │
└─────────────────────────────────┘
```

#### אלמנטים
- **כפתורי header:**
  - אתחול (`initializeMuscles()`) - seed defaults
  - סנכרון (`syncMissingMuscles()`) - הוסף חסרים
  - כפייה (`forceUpdateAllMuscles()`) - דרוס הכל
  - הוסף שריר - toggle טופס
- **טופס שריר ראשי:** id (auto-format), nameHe, nameEn, icon URL (עם preview)
- **רשימת שרירים:** כרטיסים expandable
  - Header: icon, שמות, ספירת תת-שרירים, כפתורי עריכה/מחיקה
  - Expanded: רשימת תת-שרירים + טופס הוספה inline
  - עריכת תת-שריר: inline edit mode עם שמירה/ביטול
- **ID auto-format:** lowercase, spaces → underscores

---

### 8.20 ניהול ציוד (EquipmentManager)

#### תיאור
ניהול סוגי ציוד אימון.

#### אלמנטים
- **כפתורי header:** אתחול, סנכרון, הוסף ציוד
- **טופס הוספה:** id, nameHe, nameEn, order (2×2 grid)
- **רשימת ציוד:** כרטיסים עם: מספר סדר, שמות, כפתורי עריכה/מחיקה
- **Inline edit:** כל השדות editable
- **מניעת מחיקה:** `isEquipmentInUse(id)` - בודק שימוש בתרגילים
- **Soft delete:** `deleteEquipment(id)` → isActive=false

---

### 8.21 ניהול גומיות (BandTypeManager)

#### תיאור
ניהול סוגי גומיות עזר (resistance bands).

#### אלמנטים
- **טופס הוספה:** name (חובה), description (אופציונלי)
- **רשימת גומיות:** כרטיסים עם: מספר סדר, שם, תיאור
- **כפתורים:** toggle active/inactive, עריכה, מחיקה
- **Inline edit:** שם, תיאור, sortOrder

---

### 8.22 ניהול סטים מומלצים (ExerciseSetManager)

#### תיאור
ניהול קבוצות תרגילים מוכנות עם drag & drop לסדר.

#### Layout
```
┌─────────────────────────────────┐
│ כותרת + [הוסף סט]               │
│ [פילטר לפי קבוצת שרירים]         │
├─────────────────────────────────┤
│ [Draggable list - DndContext]    │
│ ┌───────────────────────┐       │
│ │ ≡ [4 תמונות] שם סט   │       │
│ │   דרגה | סדר          │       │
│ │   תגיות תרגילים       │       │
│ │   [toggle][✏][🗑]      │       │
│ └───────────────────────┘       │
│ ┌───────────────────────┐       │
│ │ ≡ ...                  │       │
│ └───────────────────────┘       │
└─────────────────────────────────┘
```

#### אלמנטים
- **Drag & Drop:** @dnd-kit/core + @dnd-kit/sortable
  - Sensors: PointerSensor (8px activation), KeyboardSensor
  - On drag end: `updateExerciseSetsOrder(reorderedIds)`
  - Visual: z-50 + ring on drag, cursor-grab/grabbing
- **כפתור פילטר:** לפי קבוצת שרירים
- **ExerciseSetForm:** modal חיצוני ליצירה/עריכה
- **כרטיס סט:**
  - Drag handle
  - תצוגת תמונות: 4 תמונות (grid 2×2) / תמונה יחידה / placeholder
  - שם, badge דרגה, מספר סדר
  - תגיות תרגילים (שמות בעברית)
  - כפתורים: toggle active/inactive, עריכה, מחיקה
  - סט לא פעיל: opacity-60
- **Image preview modal:** full-screen בלחיצה על תמונות
- **קיבוץ:** אם מציגים "הכל" עם 2+ קבוצות → מקוצב לפי שריר

---

### 8.23 ניהול סוגי דיווח (ReportTypeManager)

#### תיאור
ניהול סוגי דיווח לתרגילים (שדות דינמיים).

#### Layout
```
┌─────────────────────────────────┐
│ כותרת + [אתחול][סנכרון][הוסף]   │
├─────────────────────────────────┤
│ [טופס הוספה - collapsible]       │
│  ID | שם HE | שם EN | סדר       │
│  שדות:                           │
│  [סוג: weight ▼][תווית: ____]   │
│  [+ הוסף שדה]                    │
├─────────────────────────────────┤
│ רשימת סוגי דיווח:                │
│ ┌───────────────────────┐       │
│ │ #1 weight_reps         │       │
│ │ שדות: weight, reps     │       │
│ │ [toggle][✏][🗑]         │       │
│ └───────────────────────┘       │
└─────────────────────────────────┘
```

#### סוגי שדות זמינים
| סוג | תווית ברירת מחדל | שימוש |
|-----|-----------------|-------|
| weight | משקל | משקל בק"ג |
| reps | חזרות | מספר חזרות |
| time | זמן | זמן בשניות |
| intensity | עצימות | רמה 1-100 |
| speed | מהירות | מהירות |
| distance | מרחק | מרחק במטרים |
| incline | שיפוע | שיפוע 1-20 |

#### אלמנטים
- **טופס הוספה/עריכה:**
  - id, nameHe, nameEn (חובה)
  - sortOrder (אופציונלי)
  - Field editor: בחירת סוג + תווית + הוספה/הסרה (מינימום 1 שדה)
- **כפתורי header:** אתחול, סנכרון, toggle active
- **מניעת מחיקה:** `isReportTypeInUse(id)` - בודק שימוש בתרגילים

---

### 8.24 ניהול משתמשים (UsersList)

#### תיאור
ניהול משתמשים, שינוי roles, יצירת משתמשים, הפקת דוחות.

#### Layout
```
┌─────────────────────────────────┐
│ כותרת + [רענון][משתמש חדש]       │
├─────────────────────────────────┤
│ Stats Grid (4 כרטיסים):          │
│ סה"כ | אדמינים | מאמנים | רגילים │
├─────────────────────────────────┤
│ טבלת משתמשים (sortable):         │
│ ┌────┬──────┬─────┬──────┬────┐ │
│ │Avtr│ שם   │Email│Role ▼│Date│  │
│ │    │ +UID │     │[select]│   │  │
│ │    │      │     │      │[📊🗑]│  │
│ └────┴──────┴─────┴──────┴────┘ │
└─────────────────────────────────┘
```

#### אלמנטים
- **Stats grid:** סה"כ, אדמינים, מאמנים, משתמשים רגילים (`getUserStats()`)
- **מיון:** לפי שם/email/role/createdAt, toggle asc/desc
- **שורת משתמש:**
  - אווטר + שם + UID (חלקי)
  - email
  - Role dropdown (user/trainer/admin) → `updateUserRole()`
  - תאריך הצטרפות
  - כפתור דוח (→ Report Modal)
  - כפתור מחיקה (→ `deleteUserFromFirestore()`)
- **Create User Modal:**
  - שם פרטי (חובה), שם משפחה, email (חובה), סיסמה (חובה, min 6), role (select)
  - `createUserWithEmailAndPassword()` + Firestore doc
- **Report Modal:**
  - טווח תאריכים (from/to, default 30 יום)
  - כפתור ייצוא → JSON עם אימונים, סטים, PR, קלוריות
  - `getUserWorkoutHistoryByDateRange()` → download

---

### 8.25 הגדרות מערכת (AdminSettings)

#### תיאור
הגדרות אפליקציה כלליות.

#### אלמנטים
- **External Comparison URL:**
  - שדה URL (dir="ltr")
  - preview link (אם URL תקין)
  - validation: `new URL()` + catch
  - כפתור שמירה → `updateAppSettings()`
  - הודעת הצלחה (3 שניות auto-dismiss)
- **Data Flow:** `getAppSettings()` → טעינה, `updateAppSettings()` → שמירה

---

## 9. זרימות משתמש (User Flows)

### 9.1 הרשמה ראשונה
1. `/login` → מסך כניסה
2. לחיצה "הירשם עכשיו" → מעבר למצב register
3. מילוי שם פרטי, שם משפחה, אימייל, סיסמה, אימות סיסמה
4. לחיצה "צור חשבון" → Firebase Auth create + Firestore doc
5. הפניה אוטומטית ל-`/dashboard`

### 9.2 כניסה חוזרת
1. `/login` → מסך כניסה
2. הזנת אימייל + סיסמה
3. לחיצה "התחבר" → Firebase Auth sign in
4. `onAuthChange()` → טעינת user doc מ-Firestore
5. הפניה: admin → `/admin`, others → `/dashboard`

### 9.3 יצירת אימון והתחלה מיידית
1. `/dashboard` → לחיצה "התחל אימון חדש"
2. `/exercises` → בחירת תרגילים (checkbox), אופציונלי: פילטרים
3. לחיצה "עכשיו" (ברירת מחדל)
4. לחיצה "התחל אימון (X)" → שמירת exercises ב-workoutBuilderStore
5. `/workout/session` → `useActiveWorkout()` מאתחל אימון חדש
6. Auto-save: localStorage מיידי + Firebase כל 10 שניות

### 9.4 תכנון אימון לתאריך עתידי
1. `/exercises` → בחירת תרגילים
2. לחיצה "תאריך אחר" → DatePicker
3. לחיצה "תכנן אימון" → `saveWorkoutHistory()` עם status='planned'
4. הפניה ל-`/workout/history` → האימון מופיע כ"מתוכנן" (אדום)

### 9.5 ביצוע אימון (מלא)
1. `/workout/session` → מסך אימון פעיל
2. לכל תרגיל: לחיצה להרחבה → הזנת משקל + חזרות לכל סט
3. אפשרות: הוספת סט, מחיקת סט, הערות
4. אחרי סט: טיימר מנוחה (אופציונלי) עם צלילים
5. אם שיא חדש: popup חגיגה עם קונפטי
6. לחיצה "סיים אימון" → WorkoutSummaryModal
7. הזנת קלוריות (אופציונלי) → לחיצה "שמור"
8. שמירה ל-Firestore + ניקוי localStorage
9. הפניה ל-`/workout/history`

### 9.6 צפייה בהיסטוריה
1. `/workout/history` → רשימת אימונים (מהחדש לישן)
2. לחיצה על אימון → הרחבה עם פרטים (תרגילים, סטים, משקלים)
3. אופציות: המשך (ראה 9.5.1), מחיקה (soft delete)

### 9.7 המשך אימון
- **completed:** יוצר אימון חדש עם אותם תרגילים, סטים ריקים
- **in_progress/partial/cancelled:** מעדכן אימון קיים, מעתיק כל נתוני הסטים
- **planned:** מעדכן אימון קיים, משנה status ל-in_progress, תאריך = עכשיו

### 9.8 ניהול תרגילים (אדמין)
1. `/admin/exercises` → רשימת תרגילים + חיפוש
2. לחיצה "תרגיל חדש" → `/admin/exercises/new`
3. מילוי: שם (EN/HE), קטגוריה, שריר ראשי, משניים, ציוד, דרגה, reportType, הוראות, תמונה
4. שמירה → חזרה לרשימה

### 9.9 ניהול שרירים (אדמין)
שלב 1: דשבורד אדמין → "ניהול שרירים" → MuscleManager
שלב 2: צפייה ברשימת שרירים ראשיים (קטגוריות)
שלב 3א (הוספה): לחיצה "הוסף שריר" → הזנת שם (עברית + אנגלית) + בחירת אייקון + בחירת צבע → שמירה ל-muscles collection
שלב 3ב (תת-שריר): לחיצה על שריר ראשי → "הוסף תת-שריר" → הזנת שם → שמירה כ-subMuscle
שלב 4: עריכה/מחיקה דרך כפתורי פעולה בכל שורה
שלב 5 (seeding): כפתור "טעינת ברירות מחדל" → מילוי שרירים סטנדרטיים

### 9.10 ניהול ציוד (אדמין)
שלב 1: דשבורד אדמין → "ניהול ציוד" → EquipmentManager
שלב 2: צפייה ברשימת פריטי ציוד
שלב 3 (הוספה): "הוסף ציוד" → שם (עברית + אנגלית) → שמירה ל-equipment collection
שלב 4: עריכה/מחיקה (soft delete אם בשימוש בתרגילים)
שלב 5 (seeding): כפתור "טעינת ברירות מחדל"

### 9.11 ניהול משתמשים (אדמין)
שלב 1: דשבורד אדמין → "ניהול משתמשים" → UsersList
שלב 2: צפייה ברשימת כל המשתמשים (שם, אימייל, תפקיד, תאריך הצטרפות)
שלב 3: שינוי role → dropdown בכל שורה → בחירת user/trainer/admin → אישור → עדכון users collection
שלב 4: מחיקת משתמש → אישור דו-שלבי → מחיקה מ-users collection

### 9.12 שימוש במאמן AI
שלב 1: דשבורד משתמש → TrainingAnalysis → כפתור "ניתוח AI"
שלב 2: בחירת מספר אימונים לניתוח (5/10/20/כל)
שלב 3: בחירת משך תקופה + קבוצות שרירים
שלב 4: שליחה ל-Cloud Function (`analyzeTraining`)
שלב 5: המתנה (loading) → קבלת תוצאות → הצגה בכרטיסי AI

### 9.13 סטים מומלצים
שלב 1: ספריית תרגילים → כפתור "סטים מוכנים"
שלב 2: צפייה ברשימת סטים (ExerciseSetManager באדמין)
שלב 3 (אדמין): יצירת סט → שם + בחירת תרגילים מהספרייה + drag & drop לסדר → שמירה ל-exerciseSets collection
שלב 4 (משתמש): בחירת סט → טעינת כל התרגילים ל-WorkoutBuilder בלחיצה אחת

### 9.14 מאמן מוסיף מתאמן חדש

**נקודת כניסה:** דשבורד מאמן (TrainerDashboard) → כפתור "הוסף מתאמן" (UserPlus icon)

**שלב 1: פתיחת מודאל**
- לחיצה על "הוסף מתאמן" → פתיחת TraineeRegistrationModal
- כותרת דינמית: "רישום מתאמן חדש" / "הוספת מתאמן קיים" (לפי תוצאת בדיקת אימייל)

**שלב 2: הזנת אימייל ובדיקה אוטומטית**
- המאמן מזין אימייל בשדה הראשון
- Debounce של 500ms → בדיקה אוטומטית ברקע (`trainerService.findUserByEmail`)
- EmailCheckStatus state machine:
  - `idle` → לא הוזן אימייל תקין
  - `checking` → מוצג spinner + "בודק..."
  - `new_user` → אימייל לא קיים במערכת → מסלול יצירת חשבון חדש
  - `available` → משתמש קיים ללא מאמן → מסלול קישור
  - `has_trainer` → שגיאה: "משתמש זה כבר משויך למאמן אחר"
  - `already_yours` → שגיאה: "משתמש זה כבר ברשימת המתאמנים שלך"

**שלב 3א: מסלול חשבון חדש (emailCheckStatus === 'new_user')**
- שדות חובה: שם פרטי*, שם משפחה*, סיסמה זמנית* (מינימום 6 תווים)
- שדות אופציונליים: טלפון, מדדים גופניים (גיל, גובה, משקל, אחוז שומן), מטרות אימון (multi-select chips), פציעות/מגבלות (textarea), הערות מאמן
- Submit → `traineeAccountService.createTraineeAccount()`:
  1. יצירת Firebase Auth user דרך secondary app instance (מונע logout של המאמן)
  2. `createUserWithEmailAndPassword` דרך secondaryAuth
  3. `updateProfile` עם displayName
  4. יצירת user document ב-Firestore (role: 'user', trainerId)
  5. יצירת trainerRelationship document
  6. שליחת password reset email (המתאמן יגדיר סיסמה משלו)
  7. ניקוי secondary app instance

**שלב 3ב: מסלול קישור משתמש קיים (emailCheckStatus === 'available')**
- מוצג באנר ירוק: "משתמש קיים במערכת" עם שם ואימייל
- שדות שם ואימייל disabled (readonly, מלאים מהנתונים הקיימים)
- שדות שניתן לערוך: מדדים גופניים, מטרות אימון, פציעות, הערות מאמן
- Submit → `traineeAccountService.linkExistingUser()`:
  1. עדכון user document עם trainerId + שדות חדשים
  2. יצירת trainerRelationship document

**שלב 4: סיום**
- `onSuccess()` → סגירת מודאל + רענון רשימת מתאמנים בדשבורד
- הודעת הצלחה (toast)
- המתאמן מופיע ברשימה

### 9.15 מאמן בונה תוכנית אימונים

**נקודת כניסה:** TraineeDetail → כפתור "תוכנית חדשה" → ProgramBuilder
**Route:** `/trainer/program/new?traineeId={id}` (חדשה) או `/trainer/program/{id}/edit` (עריכה)

**שלב 1: פרטי תוכנית (Step 1 - Details)**
- שם תוכנית* (text input)
- תיאור (textarea, אופציונלי)
- משך בשבועות (number input, אופציונלי)
- בחירת מתאמן (dropdown, מוגדר מראש אם הגיעו מ-TraineeDetail)
- Validation: שם חובה

**שלב 2: מבנה שבועי (Step 2 - Structure)**
- הוספת ימים עם labels אוטומטיים: A, B, C, D, E, F, G
- לכל יום: שם (text), האם יום מנוחה (toggle)
- אפשרות למחוק/לסדר מחדש ימים
- תצוגה: ProgramDayCard לכל יום - כרטיסים עם אייקון (Dumbbell/Moon), label, שם
- Validation: לפחות יום אחד שאינו מנוחה

**שלב 3: תרגילים לכל יום (Step 3 - Exercises)**
- MobileDaySelector בראש - tabs לבחירת יום
- ProgramDayEditor לכל יום:
  - כפתור "הוסף תרגיל" → פתיחת ExerciseLibrary ב-programMode
  - לכל תרגיל (ProgramExerciseEditor):
    - תמונה + שם + שריר ראשי
    - סטים (number, ברירת מחדל 3)
    - חזרות (text, ברירת מחדל "8-12")
    - משקל יעד (number, אופציונלי)
    - זמן מנוחה (seconds, ברירת מחדל 90)
    - הערות (textarea, אופציונלי)
    - שדות דינמיים לפי reportType (זמן, עצימות, מהירות וכו')
  - כפתור מחיקת תרגיל
  - סיכום: מספר תרגילים, סטים כוללים, זמן משוער
- Panel צדדי (TraineeSidePanel): מציג היסטוריית אימונים וביצועים של המתאמן לעזרה בבחירה
- Validation: לפחות תרגיל אחד ביום אימון

**שלב 4: סקירה ואישור (Step 4 - Review)**
- ProgramReview מציג סיכום מלא:
  - שם ותיאור התוכנית
  - מספר ימי אימון ומנוחה
  - לכל יום: רשימת תרגילים עם סטים/חזרות
  - סיכום כולל: סה"כ תרגילים, סטים, זמן משוער
- כפתור "שמור כטיוטא" → status: 'draft'
- כפתור "הפעל תוכנית" → status: 'active'

**שלב 5: שמירה**
- `programService.createProgram()` / `updateProgram()`
- שמירה ל-trainingPrograms collection
- שדות: trainerId, traineeId, name, description, weeklyStructure, status, type ('program'), startDate
- ניווט חזרה ל-TraineeDetail

### 9.16 מאמן שולח הודעה למתאמן

**מסלול א: MessageCenter (דף מרכזי)**

שלב 1: TrainerLayout → "הודעות" (בניווט) → MessageCenter (`/trainer/messages`)
שלב 2: לחיצה "הודעה חדשה" (Plus icon) → פתיחת MessageComposer
שלב 3: בחירת מתאמן (dropdown מרשימת trainees מ-trainerService)
שלב 4: מילוי שדות:
- סוג הודעה (dropdown): כללי, תוכנית אימון, תזונה, עידוד, תזכורת, חשוב
- עדיפות (dropdown): רגיל / דחוף
- נושא (text, אופציונלי)
- תוכן ההודעה* (textarea, חובה)
שלב 5: לחיצה "שלח הודעה" → `messageService.sendMessage()`
שלב 6: שמירה ל-trainerMessages collection עם שדות: trainerId, traineeId, trainerName, type, priority, subject, body, isRead: false, createdAt
שלב 7: רענון רשימת הודעות + סגירת composer

**מסלול ב: מתוך TraineeDetail**

שלב 1: TraineeDetail → כפתור "שלח הודעה" (MessageSquare icon)
שלב 2: פתיחת MessageComposer עם preselectedTraineeId (dropdown מוסתר)
שלב 3-7: זהה למסלול א

**קריאה ע"י המתאמן:**

שלב 1: מתאמן רואה InboxBadge (עיגול אדום עם מספר) בניווט התחתון
שלב 2: לחיצה → TraineeInbox (`/inbox`)
שלב 3: רשימת הודעות (InboxMessageCard) - לא נקראות מודגשות בכחול
שלב 4: לחיצה על הודעה → הרחבה → קריאת תוכן
שלב 5: סימון אוטומטי כנקרא → `messageService.markAsRead()` → עדכון isRead: true + readAt

### 9.17 מתאמן מתחיל אימון מתוכנית מאמן

**נקודת כניסה:** דשבורד משתמש (UserDashboard) או WorkoutHistory

**שלב 1: צפייה בתוכנית**
- TraineeProgramView מוצג בדשבורד המשתמש (אם יש תוכנית פעילה)
- הרכיב טוען תוכנית פעילה דרך `useTraineeProgram` hook → `programService.getTraineePrograms()`
- מסנן תוכניות עם disconnectedByTrainee
- מציג: שם תוכנית, תג "מאמן" (כתום), מספר ימי אימון, משך בשבועות

**שלב 2: זיהוי אימון היום**
- `getTodayDay()` → מזהה את היום הנוכחי לפי day-of-week mapping
- אם יום אימון: מוצג "האימון של היום" עם כפתור "התחל" (כתום)
- אם יום מנוחה: מוצג "היום יום מנוחה"

**שלב 3: בחירת יום אימון**
- רשימת כל ימי השבוע (weeklyStructure) - לחיצה מרחיבה
- כל יום מציג: label (A/B/C...), שם, מספר תרגילים, מספר סטים
- הרחבה מציגה: ProgramExerciseCard לכל תרגיל + הערות + זמן משוער + כפתור "התחל אימון"

**שלב 4: טעינה ל-WorkoutBuilder**
- לחיצה "התחל" → `loadFromProgram(day, programId, programName)`
- `workoutBuilderStore.loadFromProgram()`:
  1. המרת כל ProgramExercise ל-SelectedExercise
  2. יצירת סטים (WorkoutSet) לפי targetSets
  3. Parse של targetReps (מטווח "8-12" לוקח ערך ראשון)
  4. הגדרת workoutName: `"${programName} - ${dayLabel} (${dayName})"`
  5. שמירת programId + programDayLabel לייחוס
- ניווט ל-`/workout/builder`

**שלב 5: אימון רגיל**
- WorkoutBuilder מוצג עם תרגילים מוכנים
- המשתמש יכול: לערוך משקל/חזרות, להוסיף/להסיר סטים, להוסיף תרגילים
- "התחל אימון" → ActiveWorkoutScreen (זרימה רגילה כמו 9.5)

### 9.18 מאמן מדווח אימון עבור מתאמן

**נקודת כניסה:** TraineeDetail → כפתור "אימון בודד" (Dumbbell icon)

**שלב 1: פתיחת StandaloneWorkoutEditor**
- מסך full-screen overlay
- כותרת: "אימון בודד חדש" + "עבור {traineeName}"
- כפתור ביטול (ArrowRight) עם אישור אם יש תרגילים

**שלב 2: הגדרת שם אימון**
- שדה חובה: שם האימון (text input, placeholder: "למשל: אימון רגליים, חזה + טרייספס...")
- Auto-focus

**שלב 3: הוספת תרגילים**
- StandaloneExerciseList מציג רשימת תרגילים
- כפתור "הוסף תרגיל" (Plus, dashed border) → פתיחת ExerciseLibrary ב-programMode (full-screen overlay)
- ExerciseLibrary עם targetUserId (לסינון המלצות)
- בחירת תרגיל → יצירת ProgramExercise עם: targetSets: 3, targetReps: "8-12", restTime: 90
- לכל תרגיל: ProgramExerciseEditor → עריכת סטים/חזרות/משקל/מנוחה/הערות
- כפתור מחיקת תרגיל
- סיכום: מספר תרגילים + זמן משוער

**שלב 4: הערות אימון**
- textarea לכתיבת הערות למתאמן (אופציונלי)

**שלב 5: שמירה**
- Validation: שם חובה, לפחות תרגיל אחד
- כפתורי פעולה (fixed bottom bar):
  - "שמור וצור עוד" → שמירה + reset לאימון חדש
  - "שמור וסיים" → שמירה + חזרה ל-TraineeDetail
- `programService.createProgram()` עם type: 'standalone'
- נשמר ב-trainingPrograms collection עם: trainerId, traineeId, name, type: 'standalone', status: 'active', weeklyStructure: [cleanDay]

**תוצאה:**
- האימון מופיע ברשימת "אימונים בודדים" של המתאמן ב-WorkoutHistory
- המתאמן יכול להתחיל אימון ממנו (זרימה 9.17)

### 9.19 מתאמן מנתק תוכנית מאמן

**נקודת כניסה:** WorkoutHistory → TrainerProgramCard → כפתור ניתוק

**שלב 1: צפייה בתוכנית**
- TrainerProgramCard מציג תוכנית מאמן ב-WorkoutHistory
- כפתור X (ניתוק) בפינת הכרטיס

**שלב 2: אישור ניתוק**
- פתיחת דיאלוג אישור:
  - כותרת: "ניתוק תוכנית"
  - טקסט: 'האם לנתק את התוכנית "{programName}"? התוכנית תיעלם מהתצוגה שלך.'
  - כפתורים: "ביטול" (neutral) / "נתק" (אדום)

**שלב 3: ביצוע ניתוק**
- לחיצה "נתק" → `programService.disconnectProgram(programId)`
- Soft delete: עדכון document עם `disconnectedByTrainee: { disconnectedAt, reason? }`
- לא מוחק את התוכנית - המאמן עדיין רואה אותה (עם סימון מחוק)

**שלב 4: תוצאה**
- Toast: "התוכנית נותקה בהצלחה"
- רענון רשימת תוכניות (`refreshProgram`)
- התוכנית נעלמת מתצוגת המתאמן
- אצל המאמן (TraineeDetail): התוכנית מוצגת עם שם מחוק (line-through) + צבע מעומעם + תאריך ניתוק
- המאמן יכול: `reconnectProgram()` (שליחה מחדש) / מחיקה מלאה

---

## 10. Services Layer

### 10.1 exerciseService
**קובץ:** `src/domains/exercises/services/exerciseService.ts`

| פונקציה | פרמטרים | Return | תיאור |
|---------|---------|--------|-------|
| `getExercises` | `filters?: ExerciseFilters` | `Exercise[]` | כל התרגילים (עם פילטרים) |
| `getExerciseById` | `id: string` | `Exercise \| null` | תרגיל בודד |
| `createExercise` | `data: CreateExerciseDto` | `Exercise` | יצירת תרגיל |
| `updateExercise` | `id, data: UpdateExerciseDto` | `Exercise` | עדכון תרגיל |
| `deleteExercise` | `id: string` | `void` | מחיקת תרגיל |
| `bulkImport` | `data: CreateExerciseDto[]` | `{success, failed}` | ייבוא בכמות |
| `exportExercises` | - | `Exercise[]` | ייצוא כל התרגילים |

### 10.2 trainerService
**קובץ:** `src/domains/trainer/services/trainerService.ts`

| פונקציה | תיאור | Collections |
|---------|-------|------------|
| `getTrainerTrainees(trainerId)` | מתאמנים פעילים | trainerRelationships |
| `createRelationship(data)` | יצירת קשר מאמן-מתאמן | trainerRelationships |
| `endRelationship(id, endedBy, reason?)` | סיום קשר | trainerRelationships |
| `pauseRelationship(id)` | השהיית קשר | trainerRelationships |
| `resumeRelationship(id)` | חידוש קשר | trainerRelationships |
| `getTraineeProfile(id)` | פרופיל מתאמן | users |
| `getTraineeStats(id)` | סטטיסטיקות | workoutHistory |
| `getTraineesWithStats(trainerId)` | כל המתאמנים + stats | all |
| `updateTraineeProfile(id, data)` | עדכון פרופיל | users |
| `findUserByEmail(email)` | חיפוש לפי email | users |
| `checkTrainerRelationship(trainerId, traineeId)` | בדיקת קשר | trainerRelationships |

### 10.3 programService
**קובץ:** `src/domains/trainer/services/programService.ts`

| פונקציה | תיאור |
|---------|-------|
| `createProgram(data)` | יצירת תוכנית |
| `getProgram(id)` | תוכנית בודדת |
| `getTraineeActiveProgram(traineeId)` | תוכנית פעילה של מתאמן |
| `getTraineeStandaloneWorkouts(traineeId)` | אימונים בודדים |
| `getTrainerPrograms(trainerId)` | כל תוכניות המאמן |
| `getTraineePrograms(traineeId)` | כל תוכניות המתאמן |
| `activateProgram(id, traineeId)` | הפעלת תוכנית (מכבה קודמת) |
| `updateProgram(id, data)` | עדכון תוכנית |
| `deleteProgram(id)` | מחיקה (admin) |
| `disconnectProgram(id, reason?)` | ניתוק ע"י מתאמן (soft) |
| `reconnectProgram(id)` | חיבור מחדש ע"י מאמן |

### 10.4 messageService
**קובץ:** `src/domains/trainer/services/messageService.ts`

| פונקציה | תיאור |
|---------|-------|
| `sendMessage(data)` | שליחת הודעה |
| `getTraineeMessages(traineeId)` | הודעות למתאמן |
| `getTrainerMessagesToTrainee(trainerId, traineeId)` | הודעות למתאמן ספציפי |
| `getTrainerMessages(trainerId)` | כל הודעות המאמן |
| `markAsRead(messageId)` | סימון כנקרא |
| `getUnreadCount(traineeId)` | ספירת לא נקראו |
| `addReply(messageId, reply)` | הוספת תגובה |

### 10.5 analysisService
**קובץ:** `src/domains/workouts/services/analysisService.ts`

| פונקציה | תיאור |
|---------|-------|
| `getTrainingAnalysis(userId)` | Cloud Function → TrainingAnalysisResult |
| `getCachedAnalysis(userId)` | קריאת cache מ-Firestore |

### 10.6 aiTrainerService
**קובץ:** `src/domains/workouts/services/aiTrainerService.ts`

| פונקציה | תיאור |
|---------|-------|
| `generateAIWorkouts(request)` | Cloud Function → AIGeneratedWorkout[] |

### 10.7 traineeAccountService
**קובץ:** `src/domains/trainer/services/traineeAccountService.ts`

| פונקציה | תיאור |
|---------|-------|
| `createTraineeAccount(data, trainerId, trainerName)` | יצירת חשבון מתאמן (בלי logout מאמן) |
| `linkExistingUser(user, trainerId, trainerName, updates)` | קישור משתמש קיים למאמן |

---

## 11. Custom Hooks

### 11.1 useActiveWorkout (1700+ lines)
**קובץ:** `src/domains/workouts/hooks/useActiveWorkout.ts`

**מה עושה:** מנהל את כל מצב האימון הפעיל - אתחול, עדכון, שמירה, סיום
**מה מחזיר:** workout state, exercise/set actions, modal controls, timer
**Side effects:** localStorage sync, Firebase auto-save (debounced 10s), timer interval

### 11.2 useRestTimerAudio
**קובץ:** `src/domains/workouts/hooks/useRestTimerAudio.ts`

**מה עושה:** מנהל צלילי טיימר מנוחה (Web Audio API)
**מה מחזיר:** settings, sound functions, init/check/play
**Side effects:** AudioContext creation, sound playback

### 11.3 useWorkoutSession
**קובץ:** `src/domains/workouts/hooks/useWorkoutSession.ts`

**מה עושה:** מסלול חלופי לניהול session (פחות בשימוש)
**מה מחזיר:** session state, exercise navigation, set completion

### 11.4 useTraineeAnalytics
**קובץ:** `src/domains/trainer/hooks/useTraineeAnalytics.ts`

**מה עושה:** חישובי ניתוח מתאמן (רצף, ציות, שיאים, insights)
**מה מחזיר:** totalTab, streakTab, complianceTab, prTab
**Side effects:** טעינת 200 אימונים + שיאים + תוכניות

### 11.5 useTraineeProgram
**קובץ:** `src/domains/trainer/hooks/useTraineeProgram.ts`

**מה עושה:** טוען תוכנית מאמן פעילה + חישוב "היום של היום"
**מה מחזיר:** program, standaloneWorkouts, getTodayDay(), getTrainingDays()

### 11.6 useTrainerData
**קובץ:** `src/domains/trainer/hooks/useTrainerData.ts`

**מה עושה:** טוען רשימת מתאמנים עם סטטיסטיקות
**מה מחזיר:** trainees, isLoading, error, refreshTrainees

### 11.7 useTrainerMessages
**קובץ:** `src/domains/trainer/hooks/useTrainerMessages.ts`

**מה עושה:** ניהול הודעות מאמן (טעינה + שליחה)
**מה מחזיר:** messages, sendMessage, refreshMessages

### 11.8 useUnreadMessages
**קובץ:** `src/domains/trainer/hooks/useUnreadMessages.ts`

**מה עושה:** Polling ספירת הודעות לא נקראות כל 60 שניות
**מה מחזיר:** unreadCount

### 11.9 useVersionCheck
**קובץ:** `src/shared/hooks/useVersionCheck.ts`

**מה עושה:** בדיקת גרסה חדשה כל 5 דקות + on visibility change
**מה מחזיר:** updateAvailable, newVersion, performUpdate, dismissUpdate

---

## 12. מערכת צלילים

**Implementation:** Web Audio API (OscillatorNode)

**מצבי התראה:**

1. **minute_end (ברירת מחדל)**
   - צליל יחיד ארוך (3 שניות) בסוף כל דקה (0, 60, 120 שניות)
   - תדר: 700 Hz
   - Fade-out exponential

2. **countdown_10s**
   - טיקים ב-10 שניות אחרונות של כל דקה (50-59 שניות)
   - תדר: 800 Hz, 80ms
   - צליל סיום דקה: שני טונים (600Hz + 800Hz)

**הגדרות:**
- `enabled`: boolean (מופעל/כבוי)
- `volume`: 0-100
- `alertMode`: 'minute_end' | 'countdown_10s'
- נשמר ב-localStorage: `gymiq_timer_audio_settings_v2`

**תאימות iOS:** AudioContext.resume() בהפעלה ראשונה (דורש user gesture)

---

## 13. PWA Configuration

### manifest.json
```json
{
  "name": "GymIQ - כושר חכם",
  "short_name": "GymIQ",
  "display": "standalone",
  "orientation": "portrait",
  "theme_color": "#0a0f14",
  "background_color": "#0a0f14",
  "dir": "rtl",
  "lang": "he",
  "categories": ["fitness", "health", "sports"]
}
```

### Service Worker
- רישום ב-index.html (לא דרך Vite plugin)
- בדיקת עדכונים כל 5 דקות
- `skipWaiting` on update found
- UpdateBanner מנהל את ה-UI (לא auto-reload)

### Update Flow
1. useVersionCheck polls `/version.json` כל 5 דקות
2. אם יש גרסה חדשה → UpdateBanner מוצג
3. משתמש לוחץ "עדכן" → clears caches, updates SW, reloads

### Safe Areas
```css
body {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}
```

---

## 14. Types (Interfaces מלאים)

ראה סעיפים 5.3 (Firestore Collections) לכל ה-interfaces המלאים. להלן טיפוסים נוספים:

### SetType
```typescript
type SetType = 'warmup' | 'working' | 'dropset' | 'superset'
```

### ExerciseCategory
```typescript
type ExerciseCategory = 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'core' | 'cardio' | 'functional' | 'stretching'
```

### MuscleGroup
```typescript
type MuscleGroup = 'chest' | 'lats' | 'quadriceps' | 'hamstrings' | 'glutes' | 'triceps' | 'biceps' | 'shoulders' | 'core' | 'calves' | 'traps' | 'lower_back' | 'forearms' | 'rhomboids' | 'middle_traps'
```

### WorkoutCompletionStatus
```typescript
type WorkoutCompletionStatus = 'completed' | 'in_progress' | 'planned' | 'partial' | 'cancelled'
```

### ConfirmModalType
```typescript
type ConfirmModalType = 'finish_workout' | 'exit_workout' | 'delete_exercise' | 'finish_exercise_reminder' | 'incomplete_exercises_warning' | null
```

---

## 15. Business Logic

### 15.1 חישוב קלוריות
**נוסחה:** `duration × 5 + (volume / 100)`
- `duration` = דקות אימון
- `volume` = סכום (weight × reps) לכל סט

**שימוש:** הערכה בלבד - המשתמש יכול להזין ערך ידני

### 15.2 חישוב נפח אימון (Volume)
**נוסחה:** `Σ(weight × reps)` לכל סט שהושלם
- רק לתרגילי משקל (reportType כולל "weight")
- רק סטים עם weight > 0 ו-reps > 0

### 15.3 חישוב שיאים אישיים (PR)
1. טעינת כל האימונים שהושלמו (לא soft-deleted)
2. לכל תרגיל: מציאת סט הכי טוב (לא warmup)
3. **Bodyweight:** השוואה לפי reps (כל המשקלים = 0)
4. **Regular:** השוואה לפי weight, ואם שווה - לפי reps
5. **שיפור:** אם האימון האחרון = שיא כל הזמנים וגם טוב מהשני הכי טוב

### 15.4 לוגיקת טיימר מנוחה
- מופעל אחרי סיום סט
- Countdown עיגולי (SVG circle)
- בררת מחדל: 90 שניות
- ניתן לשנות: 30, 60, 90, 120, 180 שניות
- צלילים: ראה סעיף 12

### 15.5 לוגיקת Auto-Save
- **localStorage:** מיידי בכל שינוי
- **Firestore:** debounced 10 שניות אחרי שינוי
- **סטטוס:** תמיד in_progress
- **חסימה:** לא שומר בזמן finish workflow
- **שחזור:** בפתיחת אפליקציה → localStorage → Firestore fallback

### 15.6 סינכרון localStorage ↔ Firestore
1. כל שינוי → שמירה ל-localStorage (מיידי)
2. Debounced 10s → שמירה ל-Firestore (in_progress)
3. App load → check localStorage → if empty check Firestore
4. Permission-denied fallback → create new document

### 15.7 לוגיקת סטטוסי אימון
| סטטוס | "המשך" | יוצר/מעדכן |
|-------|--------|-----------|
| `completed` | אימון חדש, סטים ריקים | יוצר חדש |
| `in_progress` | אותו אימון, מעתיק סטים | מעדכן |
| `partial` | אותו אימון, מעתיק סטים | מעדכן |
| `cancelled` | אותו אימון, מעתיק סטים | מעדכן |
| `planned` | אותו אימון, status→in_progress | מעדכן |

### 15.8 AI Trainer Logic
1. בחירת הגדרות: מספר אימונים (1-6), משך (30/45/60/90), שרירים, חימום (5/10/15)
2. הכנת context: כל התרגילים + 10 אימונים אחרונים + ביצועים
3. Cloud Function → Claude API
4. מספר תרגילים: 30 דק = 6, 45 = 8, 60 = 9, 90 = 11 (+ חימום)
5. שמות אימונים: "מאמן #X (HH:MM)"

### 15.9 Weight Increase Recommendations (Plateau Detection)
1. טעינת 50 אימונים אחרונים (self, completed/partial)
2. לכל תרגיל: fingerprint = [weight, reps] per set
3. בדיקת 3 ביצועים אחרונים
4. אם כל 3 זהים → `recommend: true` (יש לעלות במשקל)

---

## 16. תמונות תרגילים

**Three-Tier Fallback:**

1. **Primary:** `exercise.imageUrl` מ-Firestore (if set)
2. **Secondary:** GitHub repo URL:
   ```
   https://raw.githubusercontent.com/erezadam/exercise-images-en/main/images/{name}.png
   ```
   - Name: English name → lowercase → spaces to dashes → remove special chars
   - דוגמה: "Bench Press" → `bench-press.png`
3. **Fallback:** `/images/exercise-placeholder.svg`

---

## 17. Error Handling

### Toast Notifications
- **Library:** `react-hot-toast`
- **Success:** `toast.success("ברוך הבא!")` (ירוק)
- **Error:** `toast.error("שגיאה בהתחברות")` (אדום)

### Firebase Error Translations
```
auth/weak-password → "🔒 הסיסמה חלשה מדי"
auth/email-already-in-use → "📧 האימייל כבר קיים במערכת"
auth/invalid-email → "📧 כתובת אימייל לא תקינה"
auth/user-not-found → "❌ לא נמצא חשבון עם אימייל זה"
auth/wrong-password → "🔒 סיסמה שגויה"
```

### Network Errors
- זיהוי: `isNetworkError()` utility
- הודעה: "שגיאה בחיבור. בדוק את האינטרנט"
- Auto-retry with backoff

### AI/Analysis Errors
- Rate limit: "הגעת למגבלה היומית. נסה שוב מחר"
- Not enough data: "צריך לפחות 3/4 אימונים"
- API failure: fallback to local (AI trainer)

---

## 18. Performance

### Lazy Loading
- כל הדפים עם `React.lazy()` + `Suspense`
- `<LoadingSpinner fullScreen />` כ-fallback

### Code Splitting
- Vite automatic code splitting per route
- Hashed filenames for cache busting

### Caching
- `@tanstack/react-query` for exercises list (admin)
- Firebase cache-first reads (Firestore default)
- localStorage for active workout state

### Image Optimization
- Exercise images: external (GitHub raw)
- Fallback placeholder: local SVG
- Images: `object-cover` with fixed dimensions

---

## בדיקת שלמות

### Routes ב-App.tsx
**סה"כ routes:** 30 (כולל fallback + redirects)
- Public: 1 (login)
- User: 12 (dashboard, exercises, workout/new, workout/builder, workout/session, workout/history, workout/history/:id, personal-records, analysis, inbox, progress, profile)
- Trainer: 8 (index, trainee/:id, trainee/:id/messages, trainee/:id/personal-records, trainee/:id/analytics, program/new, program/:id/edit, messages)
- Admin: 10 (exercises, exercises/new, exercises/:id/edit, muscles, equipment, band-types, exercise-sets, report-types, users, settings)
- **כל ה-routes מתועדים בסעיף 8** ✅

### Collections ב-firestore.rules
**סה"כ collections:** 17
- users, exerciseRecommendations, muscles, equipment, reportTypes, bandTypes
- exerciseSets, exercises, workoutSessions, workoutHistory, workoutTemplates
- trainerRelationships, trainingPrograms, trainerMessages
- aiTrainerUsage, aiAnalysisUsage, settings
- **כל ה-collections מתועדים בסעיף 5** ✅

### מסכים מתועדים
**סה"כ מסכים מפורטים:** 25
- מסכי משתמש (8.1-8.7): LoginPage, UserDashboard, ExerciseLibrary, WorkoutBuilder, ActiveWorkoutScreen, WorkoutHistory, PersonalRecords
- מסכי מאמן (8.8-8.15): TrainerDashboard, TraineeDetail, ProgramBuilder, TraineeRegistrationModal, TraineeAnalytics, MessageCenter, TraineeInbox, TraineePersonalRecords
- מסכי אדמין (8.16-8.25): ExerciseList, ExerciseForm, MuscleManager, EquipmentManager, BandTypeManager, ExerciseSetManager, ReportTypeManager, UsersList, AdminSettings, TrainingAnalysis
- **כל המסכים כוללים: wireframe, אלמנטים, state, data flow** ✅

### זרימות משתמש
**סה"כ זרימות מתועדות:** 19
- זרימות בסיסיות (9.1-9.8): הרשמה, כניסה, יצירת אימון, תכנון אימון, ביצוע אימון, היסטוריה, המשך אימון, ניהול תרגילים
- זרימות אדמין (9.9-9.13): שרירים, ציוד, משתמשים, מאמן AI, סטים מומלצים
- זרימות מאמן-מתאמן (9.14-9.19): הוספת מתאמן, בניית תוכנית, שליחת הודעה, אימון מתוכנית, דיווח אימון, ניתוק תוכנית
- **כל הזרימות כוללות שלבים מפורטים + services + collections** ✅

### Stores
**סה"כ Zustand stores:** 4
- authStore (persisted), workoutBuilderStore, trainerStore, messageStore
- **כולם מתועדים בסעיף 6** ✅

### Custom Hooks
**סה"כ custom hooks:** 9
- useActiveWorkout, useRestTimerAudio, useWorkoutSession
- useTraineeAnalytics, useTraineeProgram, useTrainerData, useTrainerMessages, useUnreadMessages
- useVersionCheck
- **כולם מתועדים בסעיף 11** ✅

### Services
**סה"כ services:** 7
- exerciseService, trainerService, programService, messageService
- traineeAccountService, aiTrainerService, analysisService
- **כולם מתועדים בסעיף 10** ✅

### Firebase Library Files
**סה"כ firebase library files:** 12
- config, auth, exercises, muscles, equipment, bandTypes, reportTypes
- exerciseSets, exerciseSetStorage, workoutHistory, workouts, users, appSettings

### קוד לא פעיל / TODO
- `/progress` route → redirect ל-UserDashboard (TODO: Progress page)
- `/profile` route → redirect ל-UserDashboard (TODO: Profile page)
- `WorkoutSessionScreen` + `useWorkoutSession` → מסלול חלופי, פחות בשימוש (ActiveWorkoutScreen הוא הראשי)
- `isBandTypeInUse()` → stub (always returns false)

---

> **סיום מסמך שחזור מערכת GymIQ**
> **סה"כ שורות:** ~3,020
> **סה"כ מסכים מפורטים:** 25
> **סה"כ זרימות מתועדות:** 19
> **סה"כ collections:** 17
> **סה"כ services:** 7
> **סה"כ stores:** 4
> **סה"כ hooks:** 9
