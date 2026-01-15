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