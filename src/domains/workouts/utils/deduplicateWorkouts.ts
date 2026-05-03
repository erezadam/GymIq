import type { WorkoutHistorySummary } from '../types'

/**
 * Status priority for deduplication. Higher = preferred when two workouts
 * collide on the same program day. `partial` is treated as `in_progress`
 * (see workout.types.ts comments on `WorkoutCompletionStatus`).
 */
const STATUS_PRIORITY: Record<string, number> = {
  completed: 4,
  in_progress: 3,
  partial: 3,
  planned: 2,
  cancelled: 1,
}

const getStatusRank = (status: string | undefined): number =>
  STATUS_PRIORITY[status ?? ''] ?? 0

const isSameCalendarDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate()

export interface DuplicatePair {
  keptId: string
  duplicateId: string
  keptStatus: string | undefined
}

export interface DeduplicateResult {
  filtered: WorkoutHistorySummary[]
  duplicates: DuplicatePair[]
}

/**
 * Detect and remove duplicate workouts that represent the same program day.
 *
 * Two workouts collide only when ALL hold:
 *   1. Both have a `programId` (ad-hoc workouts are never deduplicated —
 *      the user intentionally created them as separate sessions).
 *   2. Same `programId`.
 *   3. Same `programDayLabel` (or both undefined).
 *   4. Same calendar day (local time).
 *
 * When two collide, the survivor is chosen by status priority:
 *   completed > in_progress / partial > planned > cancelled
 *
 * On a status tie, the newer workout (later `date.getTime()`) wins.
 * Tie-break is explicit on the date — it does not depend on input order,
 * which lets callers pass the array in any order safely.
 *
 * Stable: the returned `filtered` array preserves the original order of
 * the surviving entries.
 */
export function deduplicateWorkouts(
  history: readonly WorkoutHistorySummary[]
): DeduplicateResult {
  const duplicateIds = new Set<string>()
  const duplicates: DuplicatePair[] = []

  for (let i = 0; i < history.length; i++) {
    if (duplicateIds.has(history[i].id)) continue
    for (let j = i + 1; j < history.length; j++) {
      if (duplicateIds.has(history[j].id)) continue
      const a = history[i]
      const b = history[j]

      if (!a.programId || !b.programId) continue
      if (a.programId !== b.programId) continue
      if (a.programDayLabel !== b.programDayLabel) continue
      if (!isSameCalendarDay(a.date, b.date)) continue

      const rankA = getStatusRank(a.status)
      const rankB = getStatusRank(b.status)
      const keepA =
        rankA !== rankB
          ? rankA > rankB
          : a.date.getTime() >= b.date.getTime()

      const keptId = keepA ? a.id : b.id
      const duplicateId = keepA ? b.id : a.id
      const keptStatus = keepA ? a.status : b.status

      duplicateIds.add(duplicateId)
      duplicates.push({ keptId, duplicateId, keptStatus })
    }
  }

  const filtered =
    duplicateIds.size > 0
      ? history.filter((w) => !duplicateIds.has(w.id))
      : [...history]

  return { filtered, duplicates }
}
