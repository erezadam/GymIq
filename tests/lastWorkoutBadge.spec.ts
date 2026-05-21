/**
 * lastWorkoutBadge.spec.ts — Behavior tests for the "אחרון" badge feature.
 *
 * Covers two units:
 *
 *   1. `formatLastWorkoutBadge(date)` — the pure helper that turns a Date
 *      (or null/undefined/NaN/future) into the badge text. Same-day /
 *      yesterday detection compares three local integers (year/month/day),
 *      not millisecond math, so a workout finished at 23:30 viewed at 00:30
 *      still reads "אתמול".
 *
 *   2. `getRecentlyDoneExerciseDates(userId)` — the Firestore reader that
 *      produces the `Map<exerciseId, Date>` consumed by the helper. The
 *      regression of interest: a doc whose `date` field is missing or
 *      unparseable must NOT enter the Map (otherwise the badge would render
 *      "אחרון · היום" for a corrupt-date workout — worse than "אחרון" alone).
 *
 * Tests for (2) mock `firebase/firestore` so no network/auth is needed.
 * They drive `getDocs` with synthesized snapshots and assert on the returned
 * Map directly — they fail at runtime if the date-parsing gate regresses.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { formatLastWorkoutBadge } from '../src/utils/formatLastWorkoutBadge'

// ────────────────────────────────────────────────────────────────────────────
// formatLastWorkoutBadge — pure-function tests (no Firestore needed).
// ────────────────────────────────────────────────────────────────────────────

// Pin "now" to a fixed local moment so the day-arithmetic is deterministic
// and reads naturally below: NOW is 2026-05-21 at 14:00 local time.
const NOW = new Date(2026, 4, 21, 14, 0, 0) // May = month index 4

describe('formatLastWorkoutBadge', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns "אחרון · היום" when the workout date is the same calendar day', () => {
    const sameDay = new Date(2026, 4, 21, 8, 30, 0)
    expect(formatLastWorkoutBadge(sameDay)).toBe('אחרון · היום')
  })

  it('returns "אחרון · אתמול" when the workout date is one calendar day before', () => {
    const yesterday = new Date(2026, 4, 20, 10, 0, 0)
    expect(formatLastWorkoutBadge(yesterday)).toBe('אחרון · אתמול')
  })

  it('returns "אחרון · לפני 5 ימים" for a workout 5 days earlier', () => {
    const fiveDaysAgo = new Date(2026, 4, 16, 12, 0, 0)
    expect(formatLastWorkoutBadge(fiveDaysAgo)).toBe('אחרון · לפני 5 ימים')
  })

  it('returns "אחרון · לפני 365 ימים" for a workout exactly one year earlier', () => {
    // 2026 is not a leap year — 365 calendar days back from 2026-05-21
    // is 2025-05-21.
    const oneYearAgo = new Date(2025, 4, 21, 14, 0, 0)
    expect(formatLastWorkoutBadge(oneYearAgo)).toBe('אחרון · לפני 365 ימים')
  })

  it('returns "אחרון" for null input', () => {
    expect(formatLastWorkoutBadge(null)).toBe('אחרון')
  })

  it('returns "אחרון" for undefined input', () => {
    expect(formatLastWorkoutBadge(undefined)).toBe('אחרון')
  })

  it('returns "אחרון" for an Invalid Date (NaN)', () => {
    expect(formatLastWorkoutBadge(new Date(NaN))).toBe('אחרון')
  })

  it('returns "אחרון" for a future date (clock skew / bad data)', () => {
    const tomorrow = new Date(2026, 4, 22, 10, 0, 0)
    expect(formatLastWorkoutBadge(tomorrow)).toBe('אחרון')
  })

  it('classifies a workout finished at 23:30 yesterday viewed at 00:30 today as "אתמול"', () => {
    // This is the central regression: a naive (now.getTime() - workout.getTime())
    // / 86400000 returns 1 hour ≈ 0 days, which would print "היום" — wrong.
    // Three-integer calendar compare must say "אתמול".
    vi.setSystemTime(new Date(2026, 4, 21, 0, 30, 0)) // 2026-05-21 00:30 local
    const lateYesterday = new Date(2026, 4, 20, 23, 30, 0) // 2026-05-20 23:30
    expect(formatLastWorkoutBadge(lateYesterday)).toBe('אחרון · אתמול')
  })
})

// ────────────────────────────────────────────────────────────────────────────
// getRecentlyDoneExerciseDates — Firestore-mocked behavior test.
//
// Mock pattern mirrors tests/recentlyDoneExercises.spec.ts so the two test
// files stay readable side-by-side.
// ────────────────────────────────────────────────────────────────────────────

const getDocsMock = vi.fn()

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => ({})),
  query: vi.fn(() => ({})),
  where: vi.fn(() => ({})),
  orderBy: vi.fn(() => ({})),
  limit: vi.fn(() => ({})),
  getDocs: getDocsMock,
  doc: vi.fn(() => ({})),
  getDoc: vi.fn(),
  updateDoc: vi.fn(),
  setDoc: vi.fn(),
  addDoc: vi.fn(),
  deleteDoc: vi.fn(),
  serverTimestamp: vi.fn(() => 'serverTimestamp'),
  Timestamp: { fromDate: (d: Date) => ({ toDate: () => d }) },
  startAfter: vi.fn(() => ({})),
  writeBatch: vi.fn(() => ({ set: vi.fn(), update: vi.fn(), commit: vi.fn() })),
  arrayUnion: vi.fn((v: unknown) => v),
  arrayRemove: vi.fn((v: unknown) => v),
  deleteField: vi.fn(() => '__deleted__'),
}))

function snapshot(docsData: Array<Record<string, unknown>>) {
  return {
    docs: docsData.map((data, i) => ({
      id: `doc-${i}`,
      data: () => data,
    })),
  }
}

// Firestore Timestamp stand-in: any object with a callable `toDate()`.
function asTimestamp(date: Date): { toDate: () => Date } {
  return { toDate: () => date }
}

describe('getRecentlyDoneExerciseDates — invalid-date docs are skipped', () => {
  beforeEach(() => {
    getDocsMock.mockReset()
  })

  it('drops a completed doc whose `date` field is missing entirely and falls through to the next valid completed doc', async () => {
    // Regression: previously the function read `data.date?.toDate() || new Date()`,
    // which silently substituted "now" for a missing date — making the badge
    // show "אחרון · היום" for a corrupt doc. The fix: skip such docs.
    const validDate = new Date(2026, 4, 15, 9, 0, 0)
    getDocsMock.mockResolvedValueOnce(
      snapshot([
        // Newest doc has no `date` field at all — must be skipped.
        {
          status: 'completed',
          exercises: [{ exerciseId: 'ex-skipped', isCompleted: true }],
        },
        // Next-newest doc is valid — its exercises must populate the Map
        // (foundCompleted gate did NOT trip on the skipped doc).
        {
          status: 'completed',
          date: asTimestamp(validDate),
          exercises: [{ exerciseId: 'ex-real', isCompleted: true }],
        },
      ])
    )

    const { getRecentlyDoneExerciseDates } = await import(
      '../src/lib/firebase/workoutHistory'
    )
    const result = await getRecentlyDoneExerciseDates('user-1')

    expect(result.has('ex-skipped')).toBe(false)
    expect(result.get('ex-real')).toEqual(validDate)
    expect(result.size).toBe(1)
  })

  it('drops a doc whose `date.toDate()` returns an Invalid Date', async () => {
    // Defense-in-depth: a Timestamp-shaped object that yields NaN must also
    // be skipped, not silently mapped to `new Date()`.
    const validDate = new Date(2026, 4, 10, 14, 0, 0)
    getDocsMock.mockResolvedValueOnce(
      snapshot([
        {
          status: 'completed',
          date: { toDate: () => new Date(NaN) },
          exercises: [{ exerciseId: 'ex-corrupt', isCompleted: true }],
        },
        {
          status: 'in_progress',
          date: asTimestamp(validDate),
          exercises: [{ exerciseId: 'ex-recovered', isCompleted: true }],
        },
      ])
    )

    const { getRecentlyDoneExerciseDates } = await import(
      '../src/lib/firebase/workoutHistory'
    )
    const result = await getRecentlyDoneExerciseDates('user-1')

    expect(result.has('ex-corrupt')).toBe(false)
    expect(result.get('ex-recovered')).toEqual(validDate)
    expect(result.size).toBe(1)
  })
})
