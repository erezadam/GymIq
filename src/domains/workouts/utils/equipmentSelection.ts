/**
 * Pure logic for the AI-trainer equipment multi-select.
 *
 * Builds on the already-extracted pieces (buildEquipmentOptions /
 * isEquipmentOptionEmpty from the exercises domain, and filterExercisesByEquipment
 * from the pool filter) — this module only adds the multi-select behaviors:
 * availability counts from the trainer's pool, the "all vs single item" toggle
 * rule, what to send to the server, and the strength-availability count used by
 * the scarcity alert. No JSX, no state.
 */
import type { EquipmentOption } from '@/domains/exercises/utils'
import { filterExercisesByEquipment } from '@/domains/workouts/utils/equipmentPoolFilter'

export const ALL_OPTION_ID = 'all'
export const GRAVITON_OPTION_ID = 'graviton'

/** Exercise shape needed for availability + strength counting. */
export interface PoolExercise {
  id?: string
  equipment?: string
  assistanceTypes?: string[]
  primaryMuscle?: string
  category?: string
}

export function isCardioExercise(ex: PoolExercise): boolean {
  return ex.primaryMuscle === 'cardio' || ex.category === 'cardio'
}

/** The selectable option ids (everything except the "all" toggle). */
export function equipmentSelectableIds(options: EquipmentOption[]): string[] {
  return options.filter((o) => o.id !== ALL_OPTION_ID).map((o) => o.id)
}

/**
 * How many exercises in the pool match each option — by equipment id, or, for
 * graviton, by assistance type (graviton is never an equipment id).
 */
export function equipmentAvailabilityCounts(
  pool: PoolExercise[],
  options: EquipmentOption[]
): Map<string, number> {
  const counts = new Map<string, number>()
  for (const o of options) {
    if (o.id === ALL_OPTION_ID) continue
    const n =
      o.id === GRAVITON_OPTION_ID
        ? pool.filter((ex) => !!ex.assistanceTypes?.includes(GRAVITON_OPTION_ID)).length
        : pool.filter((ex) => ex.equipment === o.id).length
    counts.set(o.id, n)
  }
  return counts
}

/** Everything selected → equivalent to "all". */
export function isAllSelected(selected: Set<string>, selectableIds: string[]): boolean {
  return selectableIds.length > 0 && selectableIds.every((id) => selected.has(id))
}

/**
 * Selection rules (match the app-wide "select-all / clear-all, then refine"
 * model the user expects):
 * - Clicking "all" is a real toggle: when everything is selected it CLEARS all;
 *   otherwise it selects every item.
 * - Clicking a single item always toggles just that item in/out — so from the
 *   default "all selected" state, clicking "סמית'" REMOVES Smith (leaving the
 *   rest), it does not narrow the selection down to only Smith.
 * - Re-selecting every item is again equivalent to "all". Disabled/empty items
 *   don't toggle (enforced at the UI layer).
 */
export function toggleEquipment(
  selected: Set<string>,
  optionId: string,
  selectableIds: string[]
): Set<string> {
  if (optionId === ALL_OPTION_ID) {
    // Real toggle: all selected → clear; otherwise → select all.
    return isAllSelected(selected, selectableIds) ? new Set() : new Set(selectableIds)
  }
  const next = new Set(selected)
  if (next.has(optionId)) next.delete(optionId)
  else next.add(optionId)
  return next
}

/**
 * What to send in the request: undefined when everything is selected (send no
 * field → identical to today), otherwise the actual selection. Never "all".
 */
export function equipmentFilterForRequest(
  selected: Set<string>,
  selectableIds: string[]
): string[] | undefined {
  // No options loaded, or everything selected → send no field (identical to today).
  if (selectableIds.length === 0 || isAllSelected(selected, selectableIds)) return undefined
  return selectableIds.filter((id) => selected.has(id))
}

/**
 * Number of STRENGTH (non-cardio) exercises available under the current
 * selection — the number compared against the workout's required exercise count
 * for the scarcity alert.
 */
export function availableStrengthCount(
  pool: PoolExercise[],
  selected: Set<string>,
  selectableIds: string[]
): number {
  const filter = equipmentFilterForRequest(selected, selectableIds)
  const effective = filter ? filterExercisesByEquipment(pool, filter) : pool
  return effective.filter((ex) => !isCardioExercise(ex)).length
}
