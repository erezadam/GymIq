/**
 * Formats the "אחרון" badge text shown on exercise cards in ExerciseLibrary.
 *
 * Same-day / yesterday detection compares three local integers
 * (getFullYear, getMonth, getDate) directly — not toLocaleDateString, not
 * getTime()/86400000, not ISO strings. Otherwise a workout at 23:30 inspected
 * at 00:30 would still register as "היום" because <24h elapsed in absolute
 * time, even though the calendar day rolled over.
 *
 * Returns "אחרון" alone for any unusable input (null/undefined/NaN/future)
 * so the badge never crashes the exercise row.
 */
export function formatLastWorkoutBadge(date: Date | null | undefined): string {
  const fallback = 'אחרון'
  if (date == null) return fallback
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return fallback

  const now = new Date()

  const dY = date.getFullYear()
  const dM = date.getMonth()
  const dD = date.getDate()
  const nY = now.getFullYear()
  const nM = now.getMonth()
  const nD = now.getDate()

  // היום — three-integer equality on local calendar components.
  if (dY === nY && dM === nM && dD === nD) {
    return `${fallback} · היום`
  }

  // אתמול — three-integer equality against (today - 1 day).
  // `new Date(y, m, d - 1)` normalizes month/year underflow correctly.
  const y = new Date(nY, nM, nD - 1)
  if (dY === y.getFullYear() && dM === y.getMonth() && dD === y.getDate()) {
    return `${fallback} · אתמול`
  }

  // Future date — three-integer lexicographic compare against today.
  // Handles clock skew or bad data without crashing or printing "לפני -3 ימים".
  if (
    dY > nY ||
    (dY === nY && dM > nM) ||
    (dY === nY && dM === nM && dD > nD)
  ) {
    return fallback
  }

  // ≥2 days ago: count whole days between midnight-anchored local Dates.
  // Inputs to the Date constructor are integer Y/M/D only — no time-of-day
  // component leaks in, so DST and boundary transitions cannot skew the count.
  const startOfDate = new Date(dY, dM, dD).getTime()
  const startOfNow = new Date(nY, nM, nD).getTime()
  const days = Math.round((startOfNow - startOfDate) / 86_400_000)

  return `${fallback} · לפני ${days} ימים`
}
