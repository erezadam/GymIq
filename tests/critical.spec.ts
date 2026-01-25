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