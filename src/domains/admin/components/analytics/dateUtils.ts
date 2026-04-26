import type { AnalyticsRange, AnalyticsRangeKey } from './analytics.types'

const HEB_MONTHS = [
  'ינואר',
  'פברואר',
  'מרץ',
  'אפריל',
  'מאי',
  'יוני',
  'יולי',
  'אוגוסט',
  'ספטמבר',
  'אוקטובר',
  'נובמבר',
  'דצמבר',
] as const

export const RANGE_LABELS: Record<AnalyticsRangeKey, string> = {
  '7d': '7 ימים',
  '30d': '30 ימים',
  '90d': '90 ימים',
  ytd: 'השנה',
}

export const DAY_MS = 24 * 60 * 60 * 1000

export function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export function endOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(23, 59, 59, 999)
  return x
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

export function diffDays(a: Date, b: Date): number {
  return Math.round((startOfDay(a).getTime() - startOfDay(b).getTime()) / DAY_MS)
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0)
}

export function startOfYear(d: Date): Date {
  return new Date(d.getFullYear(), 0, 1, 0, 0, 0, 0)
}

export function buildRange(key: AnalyticsRangeKey, now: Date = new Date()): AnalyticsRange {
  const to = endOfDay(now)
  let from: Date
  let days: number
  switch (key) {
    case '7d':
      from = startOfDay(addDays(now, -6))
      days = 7
      break
    case '30d':
      from = startOfDay(addDays(now, -29))
      days = 30
      break
    case '90d':
      from = startOfDay(addDays(now, -89))
      days = 90
      break
    case 'ytd':
      from = startOfYear(now)
      days = Math.max(1, diffDays(now, from) + 1)
      break
  }
  return { key, from, to, days, label: RANGE_LABELS[key] }
}

/** Build the previous comparison window of equal length, ending the day before `range.from`. */
export function buildPreviousRange(range: AnalyticsRange): AnalyticsRange {
  const to = endOfDay(addDays(range.from, -1))
  const from = startOfDay(addDays(to, -(range.days - 1)))
  return {
    key: range.key,
    from,
    to,
    days: range.days,
    label: range.label,
  }
}

/** ISO date key YYYY-MM-DD — local time, used for charting. */
export function toDateKey(d: Date): string {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

/** ISO month key YYYY-MM. */
export function toMonthKey(d: Date): string {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${yyyy}-${mm}`
}

export function hebMonth(d: Date): string {
  return HEB_MONTHS[d.getMonth()] ?? ''
}

export function hebMonthYear(d: Date): string {
  return `${HEB_MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

/** Hebrew short date "DD.MM.YYYY" — RTL-safe (no LTR-only chars). */
export function hebShortDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}.${mm}.${d.getFullYear()}`
}

/** Build a list of every day-key from `from` to `to` inclusive. */
export function eachDayKey(from: Date, to: Date): string[] {
  const start = startOfDay(from)
  const end = startOfDay(to)
  const out: string[] = []
  let cur = start
  while (cur.getTime() <= end.getTime()) {
    out.push(toDateKey(cur))
    cur = addDays(cur, 1)
  }
  return out
}

/** Compute % change A vs. B. Returns null when B is 0 (avoid divide-by-zero). */
export function deltaPct(current: number, previous: number): number | null {
  if (!Number.isFinite(previous) || previous === 0) return null
  return ((current - previous) / previous) * 100
}
