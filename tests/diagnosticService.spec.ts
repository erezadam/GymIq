/**
 * diagnosticService.spec.ts — Behavior tests for the admin diagnostic
 * Firestore service.
 *
 * Verifies that:
 *   - every read passes the hardcoded DEBUG_USER_UID via `where('userId','==',...)`
 *   - filters (date, eventType, sessionId, status, deletedFilter) translate
 *     to the right Firestore query constraints, OR are applied client-side
 *     when documented
 *   - pagination works via cursor + N+1 fetch trick (`hasMore` correct)
 *
 * The Firestore SDK is fully mocked — these are pure logic tests on the
 * service contract, not integration tests.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the writer module (PR #121).
vi.mock('@/lib/firebase/diagnosticLogs', () => ({
  DEBUG_USER_UID: 'OHxRVH3RdUP8k7xQBuAa5ZXvfrI2',
}))

// Mock the existing workoutHistory single-doc reader (re-exported from the service).
vi.mock('@/lib/firebase/workoutHistory', () => ({
  getWorkoutById: vi.fn(),
}))

// Mock Firestore SDK. Each query() call captures its constraints into a recorder.
const queryConstraintsRecorder: unknown[][] = []

vi.mock('firebase/firestore', async () => {
  const actual = await vi.importActual<typeof import('firebase/firestore')>('firebase/firestore')
  return {
    ...actual,
    collection: vi.fn(() => ({ __collection: true })),
    doc: vi.fn(() => ({ __doc: true })),
    query: vi.fn((_coll: unknown, ...constraints: unknown[]) => {
      queryConstraintsRecorder.push(constraints)
      return { __query: true, constraints }
    }),
    where: vi.fn((field: string, op: string, value: unknown) => ({
      __type: 'where',
      field,
      op,
      value,
    })),
    orderBy: vi.fn((field: string, dir?: string) => ({ __type: 'orderBy', field, dir })),
    limit: vi.fn((n: number) => ({ __type: 'limit', n })),
    startAfter: vi.fn((value: unknown) => ({ __type: 'startAfter', value })),
    Timestamp: {
      fromDate: (d: Date) => ({ __ts: true, toDate: () => d }),
      now: () => ({ __ts: true, toDate: () => new Date() }),
    },
    getDocs: vi.fn(),
    getDoc: vi.fn(),
  }
})

import * as firestore from 'firebase/firestore'
import {
  getDiagnosticLogs,
  getUserSessions,
  getSessionLogs,
  getWorkoutsForUser,
  getWorkoutRaw,
  DEBUG_USER_UID,
} from '@/domains/admin/services/diagnosticService'

const getDocsMock = firestore.getDocs as unknown as ReturnType<typeof vi.fn>
const getDocMock = firestore.getDoc as unknown as ReturnType<typeof vi.fn>

function makeLogDoc(overrides: Record<string, unknown> = {}) {
  return {
    id: overrides.id ?? `log-${Math.random().toString(36).slice(2, 8)}`,
    data: () => ({
      userId: DEBUG_USER_UID,
      sessionId: 'sess-abc',
      timestamp: { toDate: () => new Date('2026-05-04T12:00:00Z') },
      eventType: 'WORKOUT_AUTOSAVE',
      workoutId: 'workout-1',
      payload: { foo: 'bar' },
      stackTrace: '',
      userAgent: 'jest',
      url: 'http://test',
      ...overrides,
    }),
  }
}

function makeWorkoutDoc(overrides: Record<string, unknown> = {}) {
  return {
    id: overrides.id ?? `wid-${Math.random().toString(36).slice(2, 8)}`,
    data: () => ({
      userId: DEBUG_USER_UID,
      name: 'Test workout',
      date: { toDate: () => new Date('2026-05-04T12:00:00Z') },
      duration: 30,
      status: 'completed',
      completedExercises: 3,
      totalExercises: 5,
      totalVolume: 100,
      personalRecords: 0,
      ...overrides,
    }),
  }
}

beforeEach(() => {
  queryConstraintsRecorder.length = 0
  vi.clearAllMocks()
})

describe('diagnosticService — DEBUG_USER_UID enforcement', () => {
  it('getDiagnosticLogs always passes userId == DEBUG_USER_UID', async () => {
    getDocsMock.mockResolvedValueOnce({ docs: [] })
    await getDiagnosticLogs({})
    const constraints = queryConstraintsRecorder[0] as Array<{
      field?: string
      op?: string
      value?: string
    }>
    const userIdWhere = constraints.find((c) => c.field === 'userId' && c.op === '==')
    expect(userIdWhere).toBeDefined()
    expect(userIdWhere?.value).toBe(DEBUG_USER_UID)
  })

  it('getWorkoutsForUser always passes userId == DEBUG_USER_UID', async () => {
    getDocsMock.mockResolvedValueOnce({ docs: [] })
    await getWorkoutsForUser({})
    const constraints = queryConstraintsRecorder[0] as Array<{
      field?: string
      op?: string
      value?: string
    }>
    const userIdWhere = constraints.find((c) => c.field === 'userId' && c.op === '==')
    expect(userIdWhere?.value).toBe(DEBUG_USER_UID)
  })

  it('getUserSessions always passes userId == DEBUG_USER_UID', async () => {
    getDocsMock.mockResolvedValueOnce({ docs: [] })
    await getUserSessions()
    const constraints = queryConstraintsRecorder[0] as Array<{
      field?: string
      value?: string
    }>
    expect(constraints.find((c) => c.field === 'userId')?.value).toBe(DEBUG_USER_UID)
  })
})

describe('diagnosticService — filter translation', () => {
  it('getDiagnosticLogs with single eventType adds where clause', async () => {
    getDocsMock.mockResolvedValueOnce({ docs: [] })
    await getDiagnosticLogs({ eventTypes: ['SOFT_DELETE'] })
    const constraints = queryConstraintsRecorder[0] as Array<{
      field?: string
      op?: string
      value?: string
    }>
    const eventTypeWhere = constraints.find((c) => c.field === 'eventType' && c.op === '==')
    expect(eventTypeWhere?.value).toBe('SOFT_DELETE')
  })

  it('getDiagnosticLogs with multiple eventTypes filters client-side, no eventType where', async () => {
    getDocsMock.mockResolvedValueOnce({
      docs: [
        makeLogDoc({ eventType: 'SOFT_DELETE' }),
        makeLogDoc({ eventType: 'WORKOUT_AUTOSAVE' }),
        makeLogDoc({ eventType: 'WORKOUT_COMPLETE' }),
      ],
    })
    const result = await getDiagnosticLogs({
      eventTypes: ['SOFT_DELETE', 'WORKOUT_COMPLETE'],
    })

    const constraints = queryConstraintsRecorder[0] as Array<{ field?: string }>
    const eventTypeWhere = constraints.find((c) => c.field === 'eventType')
    expect(eventTypeWhere).toBeUndefined()

    expect(result.logs.map((l) => l.eventType).sort()).toEqual([
      'SOFT_DELETE',
      'WORKOUT_COMPLETE',
    ])
  })

  it('getDiagnosticLogs with sessionId adds where clause', async () => {
    getDocsMock.mockResolvedValueOnce({ docs: [] })
    await getDiagnosticLogs({ sessionId: 'sess-xyz' })
    const constraints = queryConstraintsRecorder[0] as Array<{
      field?: string
      op?: string
      value?: string
    }>
    expect(
      constraints.find((c) => c.field === 'sessionId' && c.op === '==')?.value,
    ).toBe('sess-xyz')
  })

  it('getWorkoutsForUser deletedFilter=yes keeps only soft-deleted workouts', async () => {
    getDocsMock.mockResolvedValueOnce({
      docs: [
        makeWorkoutDoc({
          id: 'a',
          deletedByTrainee: { deletedAt: { toDate: () => new Date() } },
        }),
        makeWorkoutDoc({ id: 'b' }),
        makeWorkoutDoc({
          id: 'c',
          deletedByTrainee: { deletedAt: { toDate: () => new Date() } },
        }),
      ],
    })
    const result = await getWorkoutsForUser({ deletedFilter: 'yes' })
    expect(result.workouts.map((w) => w.id).sort()).toEqual(['a', 'c'])
  })

  it('getWorkoutsForUser deletedFilter=no excludes soft-deleted workouts', async () => {
    getDocsMock.mockResolvedValueOnce({
      docs: [
        makeWorkoutDoc({
          id: 'a',
          deletedByTrainee: { deletedAt: { toDate: () => new Date() } },
        }),
        makeWorkoutDoc({ id: 'b' }),
      ],
    })
    const result = await getWorkoutsForUser({ deletedFilter: 'no' })
    expect(result.workouts.map((w) => w.id)).toEqual(['b'])
  })

  it('getWorkoutsForUser statuses filter applied client-side', async () => {
    getDocsMock.mockResolvedValueOnce({
      docs: [
        makeWorkoutDoc({ id: 'a', status: 'completed' }),
        makeWorkoutDoc({ id: 'b', status: 'in_progress' }),
        makeWorkoutDoc({ id: 'c', status: 'cancelled' }),
      ],
    })
    const result = await getWorkoutsForUser({ statuses: ['completed', 'cancelled'] })
    expect(result.workouts.map((w) => w.id).sort()).toEqual(['a', 'c'])
  })
})

describe('diagnosticService — pagination via N+1 fetch', () => {
  it('hasMore=true when result exceeds pageSize', async () => {
    const docs = Array.from({ length: 51 }, (_, i) => makeLogDoc({ id: `l${i}` }))
    getDocsMock.mockResolvedValueOnce({ docs })
    const result = await getDiagnosticLogs({ pageSize: 50 })
    expect(result.hasMore).toBe(true)
    expect(result.logs).toHaveLength(50)
  })

  it('hasMore=false when result fits pageSize', async () => {
    const docs = Array.from({ length: 30 }, (_, i) => makeLogDoc({ id: `l${i}` }))
    getDocsMock.mockResolvedValueOnce({ docs })
    const result = await getDiagnosticLogs({ pageSize: 50 })
    expect(result.hasMore).toBe(false)
    expect(result.logs).toHaveLength(30)
  })

  it('getDiagnosticLogs: hasMore stays true even when client-side filter reduces visible logs below pageSize', async () => {
    // 51 raw docs (more than pageSize) but only 5 match the multi-eventType filter.
    // Pre-fix behavior: hasMore would be false (filtered count < pageSize).
    // Fixed behavior: hasMore reflects raw query, so user can still page forward.
    const docs = [
      ...Array.from({ length: 5 }, (_, i) =>
        makeLogDoc({ id: `match-${i}`, eventType: 'SOFT_DELETE' }),
      ),
      ...Array.from({ length: 46 }, (_, i) =>
        makeLogDoc({ id: `noise-${i}`, eventType: 'WORKOUT_AUTOSAVE' }),
      ),
    ]
    getDocsMock.mockResolvedValueOnce({ docs })
    const result = await getDiagnosticLogs({
      pageSize: 50,
      eventTypes: ['SOFT_DELETE', 'WORKOUT_VALIDATION'],
    })
    expect(result.hasMore).toBe(true)
    // Visible logs are only the 5 SOFT_DELETE ones, well below pageSize.
    expect(result.logs.length).toBeLessThan(50)
    expect(result.logs.every((l) => l.eventType === 'SOFT_DELETE')).toBe(true)
  })

  it('getWorkoutsForUser: hasMore stays true even when statuses filter reduces visible workouts below pageSize', async () => {
    const docs = [
      ...Array.from({ length: 3 }, (_, i) =>
        makeWorkoutDoc({ id: `w-${i}`, status: 'cancelled' }),
      ),
      ...Array.from({ length: 48 }, (_, i) =>
        makeWorkoutDoc({ id: `c-${i}`, status: 'completed' }),
      ),
    ]
    getDocsMock.mockResolvedValueOnce({ docs })
    const result = await getWorkoutsForUser({
      pageSize: 50,
      statuses: ['cancelled'],
    })
    expect(result.hasMore).toBe(true)
    expect(result.workouts).toHaveLength(3)
  })

  it('getDiagnosticLogs: nextCursor advances from the LAST RAW doc even when client-side filter empties visible page', async () => {
    // Page is full of WORKOUT_AUTOSAVE noise; user filters for SOFT_DELETE+WORKOUT_VALIDATION.
    // Visible logs = []. Without raw-cursor fix, the UI cannot advance because
    // last(filtered) is undefined → infinite loop on Next click.
    const lastTimestamp = new Date('2026-05-04T11:30:00Z')
    const docs = [
      ...Array.from({ length: 50 }, (_, i) =>
        makeLogDoc({
          id: `noise-${i}`,
          eventType: 'WORKOUT_AUTOSAVE',
          timestamp: { toDate: () => new Date(`2026-05-04T12:${String(i).padStart(2, '0')}:00Z`) },
        }),
      ),
      // 51st doc — triggers hasMore=true.
      makeLogDoc({
        id: 'extra',
        eventType: 'WORKOUT_AUTOSAVE',
        timestamp: { toDate: () => lastTimestamp },
      }),
    ]
    getDocsMock.mockResolvedValueOnce({ docs })
    const result = await getDiagnosticLogs({
      pageSize: 50,
      eventTypes: ['SOFT_DELETE', 'WORKOUT_VALIDATION'],
    })
    expect(result.hasMore).toBe(true)
    expect(result.logs).toHaveLength(0) // visible page is empty after filtering
    expect(result.nextCursor).toBeInstanceOf(Date) // but we can still advance
    expect(result.nextCursor).not.toBeNull()
  })

  it('getWorkoutsForUser: nextCursor advances even when statuses filter empties visible page', async () => {
    const lastDate = new Date('2026-04-01T08:00:00Z')
    const docs = [
      ...Array.from({ length: 50 }, (_, i) =>
        makeWorkoutDoc({
          id: `c-${i}`,
          status: 'completed',
          date: { toDate: () => new Date(`2026-05-04T12:${String(i).padStart(2, '0')}:00Z`) },
        }),
      ),
      makeWorkoutDoc({
        id: 'extra',
        status: 'completed',
        date: { toDate: () => lastDate },
      }),
    ]
    getDocsMock.mockResolvedValueOnce({ docs })
    const result = await getWorkoutsForUser({
      pageSize: 50,
      statuses: ['cancelled'], // matches none on this page
    })
    expect(result.hasMore).toBe(true)
    expect(result.workouts).toHaveLength(0)
    expect(result.nextCursor).toBeInstanceOf(Date)
  })

  it('nextCursor is null when there are no more pages', async () => {
    getDocsMock.mockResolvedValueOnce({
      docs: Array.from({ length: 10 }, (_, i) => makeLogDoc({ id: `l${i}` })),
    })
    const result = await getDiagnosticLogs({ pageSize: 50 })
    expect(result.hasMore).toBe(false)
    expect(result.nextCursor).toBeNull()
  })

  it('getDiagnosticLogs: cursor triggers startAfter constraint with the right timestamp', async () => {
    getDocsMock.mockResolvedValueOnce({ docs: [] })
    const cursor = new Date('2026-05-04T10:00:00Z')
    await getDiagnosticLogs({ cursor })
    const constraints = queryConstraintsRecorder[0] as Array<{
      __type?: string
      value?: unknown
    }>
    const startAfterConstraint = constraints.find((c) => c.__type === 'startAfter')
    expect(startAfterConstraint).toBeDefined()
    // Mock Timestamp.fromDate returns { __ts, toDate: () => cursor }
    const tsValue = startAfterConstraint?.value as { toDate: () => Date }
    expect(tsValue.toDate()).toEqual(cursor)
  })
})

describe('diagnosticService — workoutOwnerId mapping', () => {
  it('snapshotToLog preserves workoutOwnerId when present (trainer-on-trainee flow)', async () => {
    getDocsMock.mockResolvedValueOnce({
      docs: [
        makeLogDoc({
          id: 'log-impersonation',
          workoutOwnerId: 'trainee-uid-xyz',
        }),
      ],
    })
    const result = await getDiagnosticLogs({})
    expect(result.logs).toHaveLength(1)
    expect(result.logs[0].workoutOwnerId).toBe('trainee-uid-xyz')
  })

  it('snapshotToLog leaves workoutOwnerId undefined when the field is absent', async () => {
    getDocsMock.mockResolvedValueOnce({
      docs: [makeLogDoc({ id: 'log-self' })], // makeLogDoc never sets workoutOwnerId
    })
    const result = await getDiagnosticLogs({})
    expect(result.logs[0].workoutOwnerId).toBeUndefined()
  })
})

describe('diagnosticService — getWorkoutRaw', () => {
  it('returns raw doc data merged with id when document exists', async () => {
    getDocMock.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ name: 'אימון', userId: DEBUG_USER_UID, foo: 'bar' }),
    })
    const result = await getWorkoutRaw('workout-id-123')
    expect(result).toEqual({ name: 'אימון', userId: DEBUG_USER_UID, foo: 'bar' })
  })

  it('returns null when document does not exist', async () => {
    getDocMock.mockResolvedValueOnce({ exists: () => false, data: () => undefined })
    const result = await getWorkoutRaw('missing-id')
    expect(result).toBeNull()
  })
})

describe('diagnosticService — getUserSessions aggregation', () => {
  it('aggregates by sessionId with min/max timestamps + count', async () => {
    const t1 = new Date('2026-05-04T12:00:00Z')
    const t2 = new Date('2026-05-04T12:01:00Z')
    const t3 = new Date('2026-05-04T12:02:00Z')
    const t4 = new Date('2026-05-04T11:00:00Z')
    getDocsMock.mockResolvedValueOnce({
      docs: [
        makeLogDoc({ sessionId: 'sess-a', timestamp: { toDate: () => t3 } }),
        makeLogDoc({ sessionId: 'sess-a', timestamp: { toDate: () => t2 } }),
        makeLogDoc({ sessionId: 'sess-a', timestamp: { toDate: () => t1 } }),
        makeLogDoc({ sessionId: 'sess-b', timestamp: { toDate: () => t4 } }),
      ],
    })
    const sessions = await getUserSessions()
    const a = sessions.find((s) => s.sessionId === 'sess-a')
    const b = sessions.find((s) => s.sessionId === 'sess-b')
    expect(a?.eventCount).toBe(3)
    expect(a?.startTime).toEqual(t1)
    expect(a?.endTime).toEqual(t3)
    expect(b?.eventCount).toBe(1)

    // Sorted by startTime DESC: sess-a starts at t1 (12:00) > sess-b (11:00)
    expect(sessions.map((s) => s.sessionId)).toEqual(['sess-a', 'sess-b'])
  })

  it('throws if log count hits the SESSIONS_SCAN_LIMIT cap', async () => {
    const docs = Array.from({ length: 500 }, () => makeLogDoc())
    getDocsMock.mockResolvedValueOnce({ docs })
    await expect(getUserSessions()).rejects.toThrow(/sessions collection|מיגרציה/)
  })
})

describe('diagnosticService — getSessionLogs', () => {
  it('returns empty array for empty sessionId without firing a query', async () => {
    const result = await getSessionLogs('')
    expect(result).toEqual([])
    expect(getDocsMock).not.toHaveBeenCalled()
  })

  it('queries by sessionId ASC for replay order', async () => {
    getDocsMock.mockResolvedValueOnce({ docs: [makeLogDoc({ id: '1' })] })
    await getSessionLogs('sess-xyz')
    const constraints = queryConstraintsRecorder[0] as Array<{
      field?: string
      op?: string
      value?: string
      dir?: string
    }>
    expect(constraints.find((c) => c.field === 'sessionId')?.value).toBe('sess-xyz')
    const orderBy = constraints.find((c) => c.field === 'timestamp')
    expect(orderBy?.dir).toBe('asc')
  })
})
