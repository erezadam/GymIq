/**
 * diagnosticLogs.spec.ts — Behavior tests for the diagnostic logs writer.
 *
 * Verifies:
 *   - Any authenticated user produces an addDoc; unauthenticated does not.
 *   - The kill switch (settings/app.diagnosticLogsEnabled) controls writes:
 *     • Cold start (cache empty): treated as enabled (fail-open).
 *     • Field === false: writes are dropped on subsequent calls.
 *     • Field absent in doc / doc missing: treated as enabled.
 *     • getDoc rejection: previous cached value is preserved.
 *   - Each write carries the full schema, including the 30-day expiresAt TTL.
 *   - addDoc rejection never throws (fire-and-forget contract).
 *
 * Tests follow the iron rule (02/05/2026): mock the Firestore SDK and assert
 * on the call args, not source-grep.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

const addDocMock = vi.fn(async () => ({ id: 'log-id' }))
const getDocMock = vi.fn(async () => ({ exists: () => false, data: () => undefined }))

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => ({})),
  doc: vi.fn(() => ({})),
  addDoc: addDocMock,
  getDoc: getDocMock,
  serverTimestamp: vi.fn(() => '__SERVER_TIMESTAMP__'),
  Timestamp: {
    fromDate: (d: Date) => ({ __ts: true, _date: d, toDate: () => d }),
  },
}))

const currentUserRef: { value: { uid: string } | null } = { value: null }
vi.mock('../src/lib/firebase/config', () => ({
  db: {},
  get auth() {
    return { get currentUser() { return currentUserRef.value } }
  },
}))

async function flushMicrotasks() {
  await new Promise((r) => setTimeout(r, 0))
}

beforeEach(async () => {
  addDocMock.mockClear()
  addDocMock.mockResolvedValue({ id: 'log-id' })
  getDocMock.mockClear()
  getDocMock.mockResolvedValue({ exists: () => false, data: () => undefined })
  currentUserRef.value = null
  if (typeof sessionStorage !== 'undefined') sessionStorage.clear()
  // Reset the kill-switch in-memory cache so each test sees the cold-start state.
  const { __resetKillSwitchCacheForTests } = await import('../src/lib/firebase/diagnosticLogs')
  __resetKillSwitchCacheForTests()
})

describe('logDiagnostic — actor gating', () => {
  it('writes a log when there is an authenticated user (any uid)', async () => {
    const { logDiagnostic } = await import('../src/lib/firebase/diagnosticLogs')
    currentUserRef.value = { uid: 'any-authenticated-user' }

    logDiagnostic('WORKOUT_AUTOSAVE', 'workout-123', { isUpdate: true })
    await flushMicrotasks()

    expect(addDocMock).toHaveBeenCalledTimes(1)
    expect(addDocMock.mock.calls[0][1]).toMatchObject({
      userId: 'any-authenticated-user',
      eventType: 'WORKOUT_AUTOSAVE',
      workoutId: 'workout-123',
    })
  })

  it('does NOT write when there is no authenticated user', async () => {
    const { logDiagnostic } = await import('../src/lib/firebase/diagnosticLogs')
    currentUserRef.value = null

    logDiagnostic('WORKOUT_COMPLETE', 'workout-123', {})
    await flushMicrotasks()

    expect(addDocMock).not.toHaveBeenCalled()
  })

  it('writes for users that previously would have been gated out (no DEBUG_USER_UID anymore)', async () => {
    const { logDiagnostic } = await import('../src/lib/firebase/diagnosticLogs')
    currentUserRef.value = { uid: 'random-trainee-uid' }

    logDiagnostic('WORKOUT_CREATED', 'wid', { source: 'test' })
    await flushMicrotasks()

    expect(addDocMock).toHaveBeenCalledTimes(1)
    expect(addDocMock.mock.calls[0][1].userId).toBe('random-trainee-uid')
  })
})

describe('logDiagnostic — kill switch', () => {
  it('cold start writes the first log even before kill switch loads (fail-open)', async () => {
    // getDoc resolves slowly, but the first call should not wait for it.
    let resolveGet: (value: { exists: () => boolean; data: () => unknown }) => void = () => {}
    getDocMock.mockReturnValueOnce(
      new Promise((r) => {
        resolveGet = r
      }),
    )
    const { logDiagnostic } = await import('../src/lib/firebase/diagnosticLogs')
    currentUserRef.value = { uid: 'u1' }

    logDiagnostic('WORKOUT_CREATED', 'wid', {})
    await flushMicrotasks()

    expect(addDocMock).toHaveBeenCalledTimes(1)
    // Resolve so the test cleanly settles.
    resolveGet({ exists: () => false, data: () => undefined })
    await flushMicrotasks()
  })

  it('drops subsequent writes once the kill switch resolves to false', async () => {
    getDocMock.mockResolvedValue({
      exists: () => true,
      data: () => ({ diagnosticLogsEnabled: false }),
    })
    const { logDiagnostic } = await import('../src/lib/firebase/diagnosticLogs')
    currentUserRef.value = { uid: 'u1' }

    // First call: cache cold → fail-open, write goes through, refresh kicked off.
    logDiagnostic('WORKOUT_CREATED', 'wid-1', {})
    await flushMicrotasks()
    await flushMicrotasks() // let the background getDoc settle

    // Second call: cache now has false → write dropped.
    addDocMock.mockClear()
    logDiagnostic('WORKOUT_CREATED', 'wid-2', {})
    await flushMicrotasks()

    expect(addDocMock).not.toHaveBeenCalled()
  })

  it('keeps writing when the field is absent (fail-open default)', async () => {
    getDocMock.mockResolvedValue({
      exists: () => true,
      data: () => ({ externalComparisonUrl: 'https://example.com' }), // no diagnosticLogsEnabled
    })
    const { logDiagnostic } = await import('../src/lib/firebase/diagnosticLogs')
    currentUserRef.value = { uid: 'u1' }

    logDiagnostic('WORKOUT_CREATED', 'wid-1', {})
    await flushMicrotasks()
    await flushMicrotasks()

    addDocMock.mockClear()
    logDiagnostic('WORKOUT_CREATED', 'wid-2', {})
    await flushMicrotasks()

    expect(addDocMock).toHaveBeenCalledTimes(1)
  })

  it('keeps writing when the settings doc does not exist (fail-open default)', async () => {
    getDocMock.mockResolvedValue({ exists: () => false, data: () => undefined })
    const { logDiagnostic } = await import('../src/lib/firebase/diagnosticLogs')
    currentUserRef.value = { uid: 'u1' }

    logDiagnostic('WORKOUT_CREATED', 'wid-1', {})
    await flushMicrotasks()
    await flushMicrotasks()

    addDocMock.mockClear()
    logDiagnostic('WORKOUT_CREATED', 'wid-2', {})
    await flushMicrotasks()

    expect(addDocMock).toHaveBeenCalledTimes(1)
  })

  it('preserves the previous cached value when getDoc rejects after the TTL window', async () => {
    // Use fake timers so we can advance past the 60s cache TTL and force the
    // refresh path to actually run (without timer advance, the test would
    // pass without ever consuming the rejection mock).
    vi.useFakeTimers()
    try {
      // First read primes the cache to false.
      getDocMock.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ diagnosticLogsEnabled: false }),
      })
      const { logDiagnostic, __resetKillSwitchCacheForTests } = await import(
        '../src/lib/firebase/diagnosticLogs'
      )
      __resetKillSwitchCacheForTests()
      currentUserRef.value = { uid: 'u1' }

      // Cold-start call: fail-open writes, refresh kicks off, cache lands on false.
      logDiagnostic('WORKOUT_CREATED', 'wid-prime', {})
      await vi.runAllTimersAsync()

      // Confirm the cache is now false.
      addDocMock.mockClear()
      logDiagnostic('WORKOUT_CREATED', 'wid-confirm-false', {})
      await vi.runAllTimersAsync()
      expect(addDocMock).not.toHaveBeenCalled()

      // Advance past the 60s TTL. The next call must trigger a refresh; that
      // refresh REJECTS. Cache value (`false`) must be preserved.
      vi.advanceTimersByTime(60_001)
      getDocMock.mockRejectedValueOnce(new Error('firestore unreachable'))
      addDocMock.mockClear()

      logDiagnostic('WORKOUT_CREATED', 'wid-after-rejection', {})
      await vi.runAllTimersAsync()

      // The rejection must have been observed (not still pending in the mock).
      expect(getDocMock).toHaveBeenCalledTimes(2)
      // And the cached `false` must still suppress the write.
      expect(addDocMock).not.toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('logDiagnostic — schema', () => {
  it('writes the full schema including expiresAt with a 30-day horizon', async () => {
    const { logDiagnostic } = await import('../src/lib/firebase/diagnosticLogs')
    currentUserRef.value = { uid: 'u1' }
    const before = Date.now()

    logDiagnostic('WORKOUT_AUTOSAVE', 'workout-123', { isUpdate: true })
    await flushMicrotasks()

    expect(addDocMock).toHaveBeenCalledTimes(1)
    const [, payload] = addDocMock.mock.calls[0] as [unknown, Record<string, unknown>]
    expect(payload).toMatchObject({
      userId: 'u1',
      workoutOwnerId: null,
      eventType: 'WORKOUT_AUTOSAVE',
      workoutId: 'workout-123',
      timestamp: '__SERVER_TIMESTAMP__',
      payload: { isUpdate: true },
    })
    expect(payload.sessionId).toBeTypeOf('string')
    expect((payload.sessionId as string).length).toBeGreaterThan(0)
    expect(payload.stackTrace).toBeTypeOf('string')
    expect(payload.userAgent).toBeTypeOf('string')
    expect(payload.url).toBeTypeOf('string')
    expect('workoutId' in payload).toBe(true)

    // expiresAt is a mocked Timestamp wrapper around a Date 30d in the future.
    const expiresAt = payload.expiresAt as { _date: Date }
    expect(expiresAt._date).toBeInstanceOf(Date)
    const horizonMs = expiresAt._date.getTime() - before
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000
    expect(horizonMs).toBeGreaterThanOrEqual(thirtyDaysMs - 1000)
    expect(horizonMs).toBeLessThanOrEqual(thirtyDaysMs + 60_000)
  })

  it('writes workoutOwnerId only when it differs from the actor uid (else null)', async () => {
    const { logDiagnostic } = await import('../src/lib/firebase/diagnosticLogs')
    currentUserRef.value = { uid: 'actor-uid' }

    logDiagnostic('WORKOUT_CREATED', 'wid-1', {}, 'actor-uid')
    await flushMicrotasks()
    expect(addDocMock.mock.calls[0][1].workoutOwnerId).toBeNull()

    addDocMock.mockClear()
    logDiagnostic('WORKOUT_CREATED', 'wid-2', {}, 'trainee-uid')
    await flushMicrotasks()
    expect(addDocMock.mock.calls[0][1].workoutOwnerId).toBe('trainee-uid')
  })

  it('writes workoutId as explicit null (never undefined) when none is provided', async () => {
    const { logDiagnostic } = await import('../src/lib/firebase/diagnosticLogs')
    currentUserRef.value = { uid: 'u1' }

    logDiagnostic('WORKOUT_RECOVERY_FOUND', null, { foundCount: 0 })
    await flushMicrotasks()

    const written = addDocMock.mock.calls[0][1]
    expect(written.workoutId).toBeNull()
    expect('workoutId' in written).toBe(true)
  })

  it('reuses sessionId across calls within the same tab', async () => {
    const { logDiagnostic } = await import('../src/lib/firebase/diagnosticLogs')
    currentUserRef.value = { uid: 'u1' }

    logDiagnostic('WORKOUT_AUTOSAVE', 'a', {})
    logDiagnostic('WORKOUT_AUTOSAVE', 'b', {})
    await flushMicrotasks()

    const sid1 = addDocMock.mock.calls[0][1].sessionId
    const sid2 = addDocMock.mock.calls[1][1].sessionId
    expect(sid1).toBe(sid2)
    expect(sid1.length).toBeGreaterThan(0)
  })
})

describe('logDiagnostic — error contract', () => {
  it('does NOT throw when addDoc rejects (fire-and-forget)', async () => {
    const { logDiagnostic } = await import('../src/lib/firebase/diagnosticLogs')
    currentUserRef.value = { uid: 'u1' }
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    addDocMock.mockRejectedValueOnce(new Error('firestore unreachable'))

    expect(() => logDiagnostic('SOFT_DELETE', 'workout-x', {})).not.toThrow()
    await flushMicrotasks()

    expect(warnSpy).toHaveBeenCalledWith('Diagnostic log failed:', expect.any(Error))
    warnSpy.mockRestore()
  })
})
