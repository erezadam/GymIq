/**
 * aiTrainerMuscleMapping.spec.ts — PR-0 characterization lock.
 *
 * SUB_MUSCLE_TO_PARENT is the only isolated, exported PURE server-side artifact
 * that the exercise-filter and the core-pool steps in generateWorkout.ts depend
 * on (functions/src/ai-trainer/generateWorkout.ts:640, :651, :657). The filter
 * resolves each exercise's primaryMuscle to a parent muscle through this map;
 * the core pool keys off `parent === 'core'`. Locking the map catches a future
 * change that would silently reroute exercises.
 *
 * The filter / warmup / core-pool logic ITSELF is inline inside the onCall
 * handler and is not exported — it cannot be tested in isolation without a
 * refactor, which PR-0 forbids. See the report for that limitation.
 */
import { describe, it, expect } from 'vitest'
import { SUB_MUSCLE_TO_PARENT } from '../functions/src/ai-trainer/muscleMapping'

describe('SUB_MUSCLE_TO_PARENT (server filter/core dependency) — PR-0 lock', () => {
  it('maps sub-muscles to the exact parent used today', () => {
    // Representative of every family the filter routes through.
    expect(SUB_MUSCLE_TO_PARENT['glutes']).toBe('gluteus_maximus')
    expect(SUB_MUSCLE_TO_PARENT['gluteus_medius']).toBe('gluteus_maximus')
    expect(SUB_MUSCLE_TO_PARENT['quads']).toBe('legs')
    expect(SUB_MUSCLE_TO_PARENT['adductor']).toBe('legs')
    expect(SUB_MUSCLE_TO_PARENT['abductor']).toBe('legs')
    expect(SUB_MUSCLE_TO_PARENT['lats']).toBe('back')
    expect(SUB_MUSCLE_TO_PARENT['traps']).toBe('back')
    expect(SUB_MUSCLE_TO_PARENT['longissimus']).toBe('back')
    expect(SUB_MUSCLE_TO_PARENT['upper_chest']).toBe('chest')
    expect(SUB_MUSCLE_TO_PARENT['biceps']).toBe('biceps_brachii')
    expect(SUB_MUSCLE_TO_PARENT['triceps_brachii']).toBe('triceps')
    expect(SUB_MUSCLE_TO_PARENT['front_delt']).toBe('shoulders')
  })

  it('routes core sub-muscles to core (drives the core pool)', () => {
    expect(SUB_MUSCLE_TO_PARENT['abs']).toBe('core')
    expect(SUB_MUSCLE_TO_PARENT['obliques']).toBe('core')
    expect(SUB_MUSCLE_TO_PARENT['rectus_abdominis']).toBe('core')
  })
})
