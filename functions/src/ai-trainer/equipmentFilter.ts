/**
 * Server-side helpers for the equipment filter (client-authoritative pool).
 *
 * The client already sends a pool narrowed to the selected equipment (graviton
 * matched by assistance type on the full exercise, which the payload does not
 * carry). The server uses these pure helpers to, when a partial filter is
 * active: (a) narrow the muscle list to muscles that still have exercises in the
 * filtered pool, so the model can't target an empty muscle, and (b) decide
 * whether a requested warmup was skipped because no cardio survived the filter.
 * Pure — no Firestore, no side effects.
 */

const ALL_OPTION_ID = 'all'

/** Absent / empty / contains "all" → not a partial filter (no narrowing). */
export function isPartialEquipmentFilter(filter?: string[]): boolean {
  return Array.isArray(filter) && filter.length > 0 && !filter.includes(ALL_OPTION_ID)
}

/**
 * The set of parent muscle ids that still have at least one exercise in the
 * (already-filtered) pool. Each exercise's primaryMuscle is resolved to its
 * parent through the same sub→parent map the exercise filter uses.
 */
export function presentParentMuscleIds(
  exercises: { primaryMuscle?: string }[],
  subToParent: Record<string, string>
): Set<string> {
  const present = new Set<string>()
  for (const ex of exercises) {
    const pm = ex.primaryMuscle
    if (!pm) continue
    present.add(subToParent[pm] ?? pm)
  }
  return present
}

/**
 * A requested warmup is reported as skipped only when a partial equipment filter
 * is active and no cardio survived it. Without a partial filter this is always
 * false — today's behavior is unchanged.
 */
export function shouldReportWarmupSkipped(
  warmupRequested: boolean,
  partialEquipmentFilter: boolean,
  cardioPoolCount: number
): boolean {
  return warmupRequested && partialEquipmentFilter && cardioPoolCount === 0
}
