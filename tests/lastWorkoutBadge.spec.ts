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
    // be skipped, not silently mapped to `new Date()`. The second doc is a
    // valid `completed` workout to assert the loop continues past the skipped
    // doc — its status is irrelevant to the assertion, but must be a status
    // the function actually scans.
    const validDate = new Date(2026, 4, 10, 14, 0, 0)
    getDocsMock.mockResolvedValueOnce(
      snapshot([
        {
          status: 'completed',
          date: { toDate: () => new Date(NaN) },
          exercises: [{ exerciseId: 'ex-corrupt', isCompleted: true }],
        },
        {
          status: 'completed',
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

// ────────────────────────────────────────────────────────────────────────────
// getRecentlyDoneExerciseDates — 21-day window, completed-only behavior.
//
// Reference time NOW = 2026-05-21 14:00 local. Day arithmetic uses
// `vi.useFakeTimers` so "5 days ago" etc. are deterministic.
// ────────────────────────────────────────────────────────────────────────────

describe('getRecentlyDoneExerciseDates — 21 day window', () => {
  beforeEach(() => {
    getDocsMock.mockReset()
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('workout 5 days ago: exercise enters Map with correct date', async () => {
    const fiveDaysAgo = new Date(2026, 4, 16, 12, 0, 0)
    getDocsMock.mockResolvedValueOnce(
      snapshot([
        {
          status: 'completed',
          date: asTimestamp(fiveDaysAgo),
          exercises: [{ exerciseId: 'ex-5', isCompleted: true }],
        },
      ])
    )

    const { getRecentlyDoneExerciseDates } = await import(
      '../src/lib/firebase/workoutHistory'
    )
    const result = await getRecentlyDoneExerciseDates('user-1')

    expect(result.get('ex-5')).toEqual(fiveDaysAgo)
    expect(result.size).toBe(1)
  })

  it('workout 20 days ago: exercise enters Map (window edge inside)', async () => {
    const twentyDaysAgo = new Date(2026, 4, 1, 14, 0, 0)
    getDocsMock.mockResolvedValueOnce(
      snapshot([
        {
          status: 'completed',
          date: asTimestamp(twentyDaysAgo),
          exercises: [{ exerciseId: 'ex-20', isCompleted: true }],
        },
      ])
    )

    const { getRecentlyDoneExerciseDates } = await import(
      '../src/lib/firebase/workoutHistory'
    )
    const result = await getRecentlyDoneExerciseDates('user-1')

    expect(result.get('ex-20')).toEqual(twentyDaysAgo)
    expect(result.size).toBe(1)
  })

  it('query filters to a 21-day cutoff on `date` (window contract enforced at Firestore layer)', async () => {
    // The 22-day exclusion is enforced by Firestore's `where('date', '>', X)`,
    // not by client-side code. The mock returns whatever we feed it, so the
    // only honest behavioral assertion at this layer is: the query was
    // constructed with the right cutoff. If someone removes the date filter
    // or shifts the window (e.g. 21 → 14), this test fails.
    getDocsMock.mockResolvedValueOnce(snapshot([]))

    const firestoreModule = await import('firebase/firestore')
    vi.mocked(firestoreModule.where).mockClear()

    const { getRecentlyDoneExerciseDates } = await import(
      '../src/lib/firebase/workoutHistory'
    )
    await getRecentlyDoneExerciseDates('user-1')

    const calls = vi.mocked(firestoreModule.where).mock.calls
    const dateRangeCall = calls.find(
      ([field, op]) => field === 'date' && op === '>'
    )
    expect(dateRangeCall).toBeDefined()

    const cutoffTimestamp = dateRangeCall![2] as { toDate: () => Date }
    expect(typeof cutoffTimestamp.toDate).toBe('function')

    const expectedMs = NOW.getTime() - 21 * 24 * 60 * 60 * 1000
    expect(
      Math.abs(cutoffTimestamp.toDate().getTime() - expectedMs)
    ).toBeLessThan(1000)
  })

  it('same exercise in workout 3 days ago AND 10 days ago: Map holds the 3-day date (first-write-wins under date desc)', async () => {
    const threeDaysAgo = new Date(2026, 4, 18, 12, 0, 0)
    const tenDaysAgo = new Date(2026, 4, 11, 12, 0, 0)
    getDocsMock.mockResolvedValueOnce(
      snapshot([
        {
          status: 'completed',
          date: asTimestamp(threeDaysAgo),
          exercises: [{ exerciseId: 'ex-shared', isCompleted: true }],
        },
        {
          status: 'completed',
          date: asTimestamp(tenDaysAgo),
          exercises: [{ exerciseId: 'ex-shared', isCompleted: true }],
        },
      ])
    )

    const { getRecentlyDoneExerciseDates } = await import(
      '../src/lib/firebase/workoutHistory'
    )
    const result = await getRecentlyDoneExerciseDates('user-1')

    expect(result.get('ex-shared')).toEqual(threeDaysAgo)
    expect(result.size).toBe(1)
  })

  it('in_progress workout in window: exercises NOT in Map (in_progress branch removed)', async () => {
    const fourDaysAgo = new Date(2026, 4, 17, 12, 0, 0)
    getDocsMock.mockResolvedValueOnce(
      snapshot([
        {
          status: 'in_progress',
          date: asTimestamp(fourDaysAgo),
          exercises: [{ exerciseId: 'ex-active', isCompleted: true }],
        },
      ])
    )

    const { getRecentlyDoneExerciseDates } = await import(
      '../src/lib/firebase/workoutHistory'
    )
    const result = await getRecentlyDoneExerciseDates('user-1')

    expect(result.has('ex-active')).toBe(false)
    expect(result.size).toBe(0)
  })

  it('cancelled workout in window: exercises NOT in Map', async () => {
    const sevenDaysAgo = new Date(2026, 4, 14, 12, 0, 0)
    getDocsMock.mockResolvedValueOnce(
      snapshot([
        {
          status: 'cancelled',
          date: asTimestamp(sevenDaysAgo),
          exercises: [{ exerciseId: 'ex-quit', isCompleted: true }],
        },
      ])
    )

    const { getRecentlyDoneExerciseDates } = await import(
      '../src/lib/firebase/workoutHistory'
    )
    const result = await getRecentlyDoneExerciseDates('user-1')

    expect(result.has('ex-quit')).toBe(false)
    expect(result.size).toBe(0)
  })

  it('15 completed workouts in window, all scanned (no foundCompleted gate)', async () => {
    const docs: Array<Record<string, unknown>> = []
    for (let i = 0; i < 15; i++) {
      const daysAgo = i + 1
      const dt = new Date(NOW.getTime() - daysAgo * 24 * 60 * 60 * 1000)
      docs.push({
        status: 'completed',
        date: asTimestamp(dt),
        exercises: [{ exerciseId: `ex-${i}`, isCompleted: true }],
      })
    }
    getDocsMock.mockResolvedValueOnce(snapshot(docs))

    const { getRecentlyDoneExerciseDates } = await import(
      '../src/lib/firebase/workoutHistory'
    )
    const result = await getRecentlyDoneExerciseDates('user-1')

    expect(result.size).toBe(15)
    for (let i = 0; i < 15; i++) {
      expect(result.has(`ex-${i}`)).toBe(true)
    }
  })
})
