/**
 * analysisNav.spec.ts — Behavior tests for buildAddExerciseHref.
 *
 * The weekly-analysis "+" button uses this to decide whether clicking it merges
 * into the running workout or starts a fresh one. The distinction is the whole
 * point of the active-workout → analysis → add-exercise feature: when a workout
 * is in progress the href MUST carry `addToWorkout=true`, otherwise the library
 * wipes the active workout. These tests fail at runtime if that rule regresses.
 */

import { describe, it, expect } from 'vitest'
import { buildAddExerciseHref } from '@/domains/workouts/utils/analysisNav'

describe('buildAddExerciseHref', () => {
  it('appends addToWorkout=true when an active workout is in progress', () => {
    const href = buildAddExerciseHref('legs', 'glutes', true)
    expect(href).toContain('fromAnalysis=true')
    expect(href).toContain('muscle=legs')
    expect(href).toContain('subMuscle=glutes')
    expect(href).toContain('addToWorkout=true')
  })

  it('omits addToWorkout when there is no active workout (preserves fresh-start behavior)', () => {
    const href = buildAddExerciseHref('back', 'lats', false)
    expect(href).toBe('/exercises?fromAnalysis=true&muscle=back&subMuscle=lats')
    expect(href).not.toContain('addToWorkout')
  })
})
