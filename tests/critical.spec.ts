/**
 * critical.spec.ts - בדיקות קיום פונקציות קריטיות
 */

import { describe, it, expect } from 'vitest';

describe('Critical Functions Exist', () => {

  it('WorkoutSummaryModal exists', async () => {
    const module = await import('../src/domains/workouts/components/active-workout/WorkoutSummaryModal');
    expect(module).toBeDefined();
  });

  it('RestTimer exists', async () => {
    const module = await import('../src/domains/workouts/components/active-workout/RestTimer');
    expect(module).toBeDefined();
  });

  it('useActiveWorkout exists', async () => {
    const module = await import('../src/domains/workouts/hooks/useActiveWorkout');
    expect(module.useActiveWorkout).toBeDefined();
  });
});

describe('workoutHistory Service', () => {

  it('exports autoSaveWorkout', async () => {
    const module = await import('../src/lib/firebase/workoutHistory');
    expect(module.autoSaveWorkout).toBeDefined();
  });

  it('exports getInProgressWorkout', async () => {
    const module = await import('../src/lib/firebase/workoutHistory');
    expect(module.getInProgressWorkout).toBeDefined();
  });

  it('exports completeWorkout', async () => {
    const module = await import('../src/lib/firebase/workoutHistory');
    expect(module.completeWorkout).toBeDefined();
  });
});

describe('Smoke Tests', () => {

  it('App exists', async () => {
    const module = await import('../src/App');
    expect(module).toBeDefined();
  });

  it('authStore exists', async () => {
    const module = await import('../src/domains/authentication/store/authStore');
    expect(module.useAuthStore).toBeDefined();
  });
});

describe('Workout Status Handling - Regression 25/01', () => {
  /**
   * רגרסיה: המשך אימון "ללא דיווח" (cancelled) צריך לעדכן אימון קיים,
   * לא ליצור אימון חדש. cancelled חייב להיות מטופל יחד עם in_progress.
   */

  it('cancelled is grouped with in_progress in handleConfirmContinue', async () => {
    const fs = await import('fs/promises');
    const path = await import('path');

    // קרא את הקובץ WorkoutHistory.tsx
    const filePath = path.join(process.cwd(), 'src/domains/workouts/components/WorkoutHistory.tsx');
    const content = await fs.readFile(filePath, 'utf-8');

    // בדוק שיש pattern של: case 'cancelled': (עם הערה) ואז case 'in_progress':
    // זה מוודא ש-cancelled מטופל עם in_progress ולא עם completed
    const correctPattern = /case 'cancelled':\s*\/\/.*\n\s*case 'in_progress':/;

    expect(correctPattern.test(content)).toBe(true);
  });

  it('continueWorkoutId is set for cancelled/in_progress/partial block', async () => {
    const fs = await import('fs/promises');
    const path = await import('path');

    const filePath = path.join(process.cwd(), 'src/domains/workouts/components/WorkoutHistory.tsx');
    const content = await fs.readFile(filePath, 'utf-8');

    // מצא את ה-case של cancelled/in_progress/partial עם continueWorkoutId
    const cancelledMatch = content.match(/case 'cancelled'[\s\S]*?case 'in_progress'[\s\S]*?case 'partial'[\s\S]*?continueWorkoutId/);

    // ודא שאחרי cancelled יש שמירת continueWorkoutId
    expect(cancelledMatch).not.toBeNull();
  });
});

describe('addExercise - category & primaryMuscle - Regression 29/01', () => {
  /**
   * רגרסיה: כל נתיב שקורא ל-addExercise חייב להעביר category ו-primaryMuscle
   * מנתוני התרגיל (exerciseDetailsMap / exercise object), לא ערכים ריקים או hardcoded.
   *
   * באג: handleEmptyWorkoutContinue העביר category: '', primaryMuscle: ''
   * וגרם לכל התרגילים להופיע תחת "אחר" באימון פעיל.
   */

  it('handleEmptyWorkoutContinue passes category from details', async () => {
    const fs = await import('fs/promises');
    const path = await import('path');

    const filePath = path.join(process.cwd(), 'src/domains/workouts/components/WorkoutHistory.tsx');
    const content = await fs.readFile(filePath, 'utf-8');

    // מצא את הפונקציה handleEmptyWorkoutContinue
    const funcMatch = content.match(/handleEmptyWorkoutContinue[\s\S]*?setEmptyWorkoutDialog/);
    expect(funcMatch).not.toBeNull();
    const funcBody = funcMatch![0];

    // ודא שה-exerciseDetailsMap כולל category ו-primaryMuscle (לא רק reportType)
    expect(funcBody).toContain('category: exerciseDetails.category');
    expect(funcBody).toContain('primaryMuscle: exerciseDetails.primaryMuscle');

    // ודא שה-addExercise משתמש ב-details?.category ולא בערך ריק
    expect(funcBody).toContain("category: details?.category");
    expect(funcBody).toContain("primaryMuscle: details?.primaryMuscle");

    // ודא שאין category: '' או primaryMuscle: '' ב-addExercise
    // (מחפש את הדפוס הבעייתי: primaryMuscle: '' בתוך addExercise)
    const addExerciseCalls = funcBody.match(/addExercise\(\{[\s\S]*?\}\)/g) || [];
    for (const call of addExerciseCalls) {
      expect(call).not.toMatch(/primaryMuscle:\s*''/);
      expect(call).not.toMatch(/category:\s*''/);
    }
  });

  it('handleConfirmContinue passes category from details in all cases', async () => {
    const fs = await import('fs/promises');
    const path = await import('path');

    const filePath = path.join(process.cwd(), 'src/domains/workouts/components/WorkoutHistory.tsx');
    const content = await fs.readFile(filePath, 'utf-8');

    // מצא את הפונקציה handleConfirmContinue - עד סוף הפונקציה (handleCloseDialog)
    const funcMatch = content.match(/const handleConfirmContinue[\s\S]*?const handleCloseDialog/);
    expect(funcMatch).not.toBeNull();
    const funcBody = funcMatch![0];

    // ודא שה-exerciseDetailsMap כולל category ו-primaryMuscle
    expect(funcBody).toContain('category: exerciseDetails.category');
    expect(funcBody).toContain('primaryMuscle: exerciseDetails.primaryMuscle');

    // ספור כמה פעמים addExercise נקרא ובדוק שכולם מעבירים category
    const addExerciseCalls = funcBody.match(/addExercise\(\{[\s\S]*?\}\)/g) || [];
    expect(addExerciseCalls.length).toBeGreaterThanOrEqual(3); // completed, in_progress, planned

    for (const call of addExerciseCalls) {
      expect(call).toContain('category:');
      expect(call).toContain('primaryMuscle:');
      // ודא שלא hardcoded ריק
      expect(call).not.toMatch(/primaryMuscle:\s*''/);
      expect(call).not.toMatch(/category:\s*''/);
    }
  });

  it('Firebase recovery fetches exercise details for category', async () => {
    const fs = await import('fs/promises');
    const path = await import('path');

    const filePath = path.join(process.cwd(), 'src/domains/workouts/hooks/useActiveWorkout.ts');
    const content = await fs.readFile(filePath, 'utf-8');

    // מצא את אזור ה-Firebase recovery (getInProgressWorkout)
    const recoveryMatch = content.match(/getInProgressWorkout[\s\S]*?toast\.success\('האימון שוחזר!'\)/);
    expect(recoveryMatch).not.toBeNull();
    const recoveryBody = recoveryMatch![0];

    // ודא שיש טעינת פרטי תרגילים מ-exercise service (getExerciseById)
    expect(recoveryBody).toContain('getExerciseById');

    // ודא שה-category ו-primaryMuscle נלקחים מ-details (לא hardcoded)
    expect(recoveryBody).toContain('details?.category');
    expect(recoveryBody).toContain('details?.primaryMuscle');

    // ודא שאין hardcoded 'other' ללא fallback מ-details
    // הדפוס התקין: details?.primaryMuscle || 'other' (עם fallback)
    // הדפוס הבעייתי: primaryMuscle: 'other' (ללא details)
    expect(recoveryBody).not.toMatch(/primaryMuscle:\s*'other'\s*,\s*\/\/\s*Will be populated/);
  });

  it('ExerciseLibrary passes category from exercise object', async () => {
    const fs = await import('fs/promises');
    const path = await import('path');

    const filePath = path.join(process.cwd(), 'src/domains/exercises/components/ExerciseLibrary.tsx');
    const content = await fs.readFile(filePath, 'utf-8');

    // מצא את הקריאה ל-addExercise
    const addExerciseMatch = content.match(/addExercise\(\{[\s\S]*?\}\)/);
    expect(addExerciseMatch).not.toBeNull();
    const call = addExerciseMatch![0];

    // ודא שמעבירים category ו-primaryMuscle
    expect(call).toContain('category:');
    expect(call).toContain('primaryMuscle:');
  });

  it('WorkoutSession passes category from exercise object', async () => {
    const fs = await import('fs/promises');
    const path = await import('path');

    const filePath = path.join(process.cwd(), 'src/domains/workouts/components/WorkoutSession.tsx');
    const content = await fs.readFile(filePath, 'utf-8');

    // מצא את הקריאה ל-addExercise
    const addExerciseMatch = content.match(/addExercise\(\{[\s\S]*?\}\)/);
    expect(addExerciseMatch).not.toBeNull();
    const call = addExerciseMatch![0];

    // ודא שמעבירים category ו-primaryMuscle
    expect(call).toContain('category:');
    expect(call).toContain('primaryMuscle:');
  });
});

describe('videoWebpUrl propagates through workout lifecycle - Phase 1 (30/04/2026)', () => {
  /**
   * רגרסיה: השדה האופציונלי videoWebpUrl על Exercise חייב לזרום בכל
   * נקודת save/restore של אימון פעיל. אחרת — אנימציה תיעלם בהמשך אימון
   * (אותו פאטרן כמו רגרסיית ה-extended fields מ-29/01).
   *
   * הבדיקה רצה על מקור הקוד עצמו (לא על runtime) כי כל הנקודות הן בקוד
   * של propagation בין מבני נתונים. אם כל המופעים נמצאים — ה-iron rule מקוים.
   */

  async function readFile(relPath: string): Promise<string> {
    const fs = await import('fs/promises');
    const path = await import('path');
    return fs.readFile(path.join(process.cwd(), relPath), 'utf-8');
  }

  it('Exercise type declares videoWebpUrl', async () => {
    const content = await readFile('src/domains/exercises/types/exercise.types.ts');
    // בממשק Exercise ובממשק CreateExerciseDto
    expect(content).toMatch(/videoWebpUrl\?:\s*string/);
    const occurrences = content.match(/videoWebpUrl/g) || [];
    expect(occurrences.length).toBeGreaterThanOrEqual(2);
  });

  it('useActiveWorkout propagates videoWebpUrl in all 9 save/restore points', async () => {
    const content = await readFile('src/domains/workouts/hooks/useActiveWorkout.ts');
    const occurrences = content.match(/videoWebpUrl/g) || [];
    // 9 propagation points + Map type signature mention(s)
    expect(occurrences.length).toBeGreaterThanOrEqual(9);

    // Firebase recovery merges live exercise wins over snapshot via ?? fallback
    expect(content).toMatch(/videoWebpUrl:\s*details\?\.videoWebpUrl\s*\?\?\s*ex\.videoWebpUrl/);
  });

  it('workoutHistory service includes videoWebpUrl in all 3 save points', async () => {
    const content = await readFile('src/lib/firebase/workoutHistory.ts');
    // saveWorkoutHistory + autoSaveWorkout + completeWorkout (trainerEditWorkout)
    const conditionalSpread = content.match(/\.\.\.\(ex\.videoWebpUrl\s*&&\s*\{\s*videoWebpUrl:\s*ex\.videoWebpUrl\s*\}\)/g) || [];
    expect(conditionalSpread.length).toBeGreaterThanOrEqual(3);
  });

  it('SelectedExercise + WorkoutHistoryEntry + ProgramExercise types include videoWebpUrl', async () => {
    const store = await readFile('src/domains/workouts/store/workoutBuilderStore.ts');
    const workoutTypes = await readFile('src/domains/workouts/types/workout.types.ts');
    const activeTypes = await readFile('src/domains/workouts/types/active-workout.types.ts');
    const sessionTypes = await readFile('src/domains/workouts/types/workout-session.types.ts');
    const trainerTypes = await readFile('src/domains/trainer/types/trainer.types.ts');

    expect(store).toMatch(/videoWebpUrl\?:\s*string/);
    expect(workoutTypes).toMatch(/videoWebpUrl\?:\s*string/);
    expect(activeTypes).toMatch(/videoWebpUrl\?:\s*string/);
    expect(sessionTypes).toMatch(/videoWebpUrl\?:\s*string/);
    expect(trainerTypes).toMatch(/videoWebpUrl\?:\s*string/);
  });

  it('WorkoutHistory continue handlers propagate videoWebpUrl', async () => {
    const content = await readFile('src/domains/workouts/components/WorkoutHistory.tsx');
    // exerciseDetailsMap declarations include videoWebpUrl
    expect(content).toMatch(/videoWebpUrl\?:\s*string/);
    // The ?? merge pattern (live wins, snapshot fallback) appears in continue handlers
    expect(content).toMatch(/videoWebpUrl:\s*details\?\.videoWebpUrl\s*\?\?\s*exercise\.videoWebpUrl/);
    // At least 4 occurrences (handleConfirmContinue completed/cancelled/planned + handleEmptyWorkoutContinue)
    const occurrences = content.match(/videoWebpUrl/g) || [];
    expect(occurrences.length).toBeGreaterThanOrEqual(8);
  });

  it('ExerciseLibrary propagates videoWebpUrl in all 6 payload builders', async () => {
    const content = await readFile('src/domains/exercises/components/ExerciseLibrary.tsx');
    const occurrences = content.match(/videoWebpUrl/g) || [];
    // 6 payload sites + the imageModal state shape (declaration + handler write + JSX read)
    expect(occurrences.length).toBeGreaterThanOrEqual(8);
  });

  it('PersonalRecord aggregator carries videoWebpUrl through to UI', async () => {
    const content = await readFile('src/lib/firebase/workoutHistory.ts');
    // PersonalRecord interface
    expect(content).toMatch(/interface PersonalRecord[\s\S]*?videoWebpUrl\?:\s*string/);
    // exerciseMap + getPersonalRecords result
    const occurrences = content.match(/videoWebpUrl/g) || [];
    expect(occurrences.length).toBeGreaterThanOrEqual(6);
  });

  it('Shared ExerciseMedia component exists and exports the variant union', async () => {
    const component = await readFile('src/shared/components/ExerciseMedia/ExerciseMedia.tsx');
    expect(component).toMatch(/export type ExerciseMediaVariant\s*=\s*'hero'\s*\|\s*'thumbnail'\s*\|\s*'preview'/);
    expect(component).toMatch(/export function ExerciseMedia/);

    const index = await readFile('src/shared/components/ExerciseMedia/index.ts');
    expect(index).toMatch(/export\s*\{\s*ExerciseMedia\s*\}/);
  });

  it('ExerciseForm zod schema validates videoWebpUrl as optional WebP URL', async () => {
    const content = await readFile('src/domains/admin/components/ExerciseForm.tsx');
    // Zod field with .webp regex + .or(z.literal('')).optional()
    expect(content).toMatch(/videoWebpUrl:\s*z[\s\S]*?\.url\(/);
    expect(content).toMatch(/\\\.webp/);
    expect(content).toMatch(/\.optional\(\)/);
  });
});