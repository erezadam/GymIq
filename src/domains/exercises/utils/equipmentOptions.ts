/**
 * Pure logic for the exercise-library equipment filter row.
 *
 * Extracted verbatim from ExerciseLibrary (no behavior change): builds the
 * equipment filter options and decides when an option is marked "empty".
 * Pure — no JSX, no state, no component/Firestore dependency. Input in, result
 * out — so the behavior can be locked by unit tests.
 */
import type { Equipment } from '@/lib/firebase/equipment'

export interface EquipmentOption {
  id: string
  label: string
}

const ALL_OPTION: EquipmentOption = { id: 'all', label: 'הכל' }
const GRAVITON_OPTION: EquipmentOption = { id: 'graviton', label: 'גרביטון' }

/**
 * Build the equipment filter options exactly as the screen does today:
 * the "הכל" item first, then the ACTIVE equipment (as it comes from the
 * service) plus the synthetic graviton item, sorted together by Hebrew label
 * with trailing whitespace trimmed for comparison.
 */
export function buildEquipmentOptions(equipment: Equipment[]): EquipmentOption[] {
  const active = equipment.filter((eq) => eq.isActive !== false)
  const sorted = [
    ...active.map((eq) => ({ id: eq.id, label: eq.nameHe })),
    GRAVITON_OPTION,
  ].sort((a, b) => a.label.trim().localeCompare(b.label.trim(), 'he'))
  return [ALL_OPTION, ...sorted]
}

/**
 * An option is marked "empty" when it is not the selected one, is not the "הכל"
 * item, and has zero available exercises in the current context. Mirrors the
 * exact predicate used in the render today.
 */
export function isEquipmentOptionEmpty(
  optionId: string,
  isSelected: boolean,
  availableCount: number | undefined
): boolean {
  return !isSelected && optionId !== 'all' && (availableCount || 0) === 0
}
