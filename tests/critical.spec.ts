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