/**
 * Behavioral tests for the display-layer warmup section (withWarmupSection).
 * Proves: (1) muscle-mode warmup first, (2) equipment-mode warmup first,
 * (3) warmup exercise appears exactly once, (4) no-warmup → identical order.
 */
import { describe, it, expect } from 'vitest'
import { withWarmupSection, WARMUP_SECTION_KEY, WARMUP_SECTION_TITLE } from '../src/domains/workouts/utils/warmupSection'
import type { MuscleGroupExercises } from '../src/domains/workouts/types/active-workout.types'

// Minimal ActiveWorkoutExercise — the helper only reads `category`.
const ex = (id: string, category: string) =>
  ({ id, exerciseId: id, exerciseName: id, exerciseNameHe: id, primaryMuscle: category, category }) as any

const ids = (groups: MuscleGroupExercises[]) => groups.flatMap((g) => g.exercises.map((e) => e.exerciseId))

describe('withWarmupSection', () => {
  it('(1) muscle mode: warmup group is first, and an emptied group is dropped', () => {
    const byMuscle: MuscleGroupExercises[] = [
      { muscleGroup: 'cardio', muscleGroupHe: 'אירובי', exercises: [ex('treadmill', 'cardio')] },
      { muscleGroup: 'chest', muscleGroupHe: 'חזה', exercises: [ex('bench', 'chest')] },
      { muscleGroup: 'back', muscleGroupHe: 'גב', exercises: [ex('row', 'back')] },
    ]
    const out = withWarmupSection(byMuscle)

    expect(out[0].muscleGroup).toBe(WARMUP_SECTION_KEY)
    expect(out[0].muscleGroupHe).toBe(WARMUP_SECTION_TITLE)
    expect(out[0].exercises.map((e) => e.exerciseId)).toEqual(['treadmill'])
    // The original cardio group had only the warmup → dropped. Remaining order preserved.
    expect(out.slice(1).map((g) => g.muscleGroup)).toEqual(['chest', 'back'])
  })

  it('(2) equipment mode: warmup first, non-warmup stays in its (non-empty) group', () => {
    const byEquipment: MuscleGroupExercises[] = [
      { muscleGroup: 'machine', muscleGroupHe: 'מכשירים', exercises: [ex('treadmill', 'cardio'), ex('legpress', 'legs')] },
      { muscleGroup: 'dumbbell', muscleGroupHe: 'משקולת יד', exercises: [ex('curl', 'arms')] },
    ]
    const out = withWarmupSection(byEquipment)

    expect(out[0].muscleGroup).toBe(WARMUP_SECTION_KEY)
    expect(out[0].exercises.map((e) => e.exerciseId)).toEqual(['treadmill'])
    // machine group survives with only the strength exercise; order preserved.
    expect(out.slice(1).map((g) => g.muscleGroup)).toEqual(['machine', 'dumbbell'])
    expect(out[1].exercises.map((e) => e.exerciseId)).toEqual(['legpress'])
  })

  it('(3) the warmup exercise appears exactly once across all rendered groups', () => {
    const byEquipment: MuscleGroupExercises[] = [
      { muscleGroup: 'machine', muscleGroupHe: 'מכשירים', exercises: [ex('treadmill', 'cardio'), ex('legpress', 'legs')] },
      { muscleGroup: 'dumbbell', muscleGroupHe: 'משקולת יד', exercises: [ex('curl', 'arms')] },
    ]
    const out = withWarmupSection(byEquipment)
    const occurrences = ids(out).filter((id) => id === 'treadmill').length
    expect(occurrences).toBe(1)
  })

  it('(4) no warmup present: identical group order (and same array reference)', () => {
    const byMuscle: MuscleGroupExercises[] = [
      { muscleGroup: 'chest', muscleGroupHe: 'חזה', exercises: [ex('bench', 'chest')] },
      { muscleGroup: 'back', muscleGroupHe: 'גב', exercises: [ex('row', 'back')] },
      { muscleGroup: 'legs', muscleGroupHe: 'רגליים', exercises: [ex('squat', 'legs')] },
    ]
    const before = byMuscle.map((g) => g.muscleGroup)
    const out = withWarmupSection(byMuscle)

    expect(out).toBe(byMuscle) // untouched — same reference
    expect(out.map((g) => g.muscleGroup)).toEqual(before)
  })
})
