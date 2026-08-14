/**
 * Client-authoritative equipment filter for the AI-trainer exercise pool.
 *
 * Mirrors the exerciseSource pattern: the client narrows the available-exercise
 * pool before sending it to the Cloud Function. Graviton is NOT equipment — when
 * selected, an exercise matches by its assistance type, never by its equipment
 * field. Pure — data in, data out.
 */

export const GRAVITON_OPTION_ID = 'graviton'
const ALL_OPTION_ID = 'all'

/**
 * A selection filters only when it is present, non-empty, and does not include
 * the "all" sentinel. Absent / empty / "all" → no filtering (today's behavior).
 */
export function isPartialEquipmentFilter(filter?: string[]): boolean {
  return Array.isArray(filter) && filter.length > 0 && !filter.includes(ALL_OPTION_ID)
}

/** Minimal shape needed to decide equipment membership. */
export interface EquipmentFilterable {
  equipment?: string
  assistanceTypes?: string[]
}

/**
 * Keep an exercise when its equipment is in the selection, OR when graviton is
 * selected and the exercise supports graviton assistance. When the selection is
 * not a partial filter, the input array is returned unchanged.
 */
export function filterExercisesByEquipment<T extends EquipmentFilterable>(
  exercises: T[],
  filter?: string[]
): T[] {
  if (!isPartialEquipmentFilter(filter)) return exercises
  const selected = new Set(filter)
  const gravitonSelected = selected.has(GRAVITON_OPTION_ID)
  return exercises.filter((ex) => {
    const equipmentMatch = !!ex.equipment && selected.has(ex.equipment)
    const gravitonMatch = gravitonSelected && !!ex.assistanceTypes?.includes(GRAVITON_OPTION_ID)
    return equipmentMatch || gravitonMatch
  })
}
