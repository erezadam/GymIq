/**
 * diagnosticLogs.spec.ts — Behavior tests for the diagnostic logs service.
 *
 * The service is gated by a single hardcoded uid (DEBUG_USER_UID). For any
 * other actor, no Firestore writes should occur. For the debug user, every
 * call must produce one addDoc with the full schema, and a write failure
 * must never throw.
 *
 * Tests follow the iron rule (02/05/2026): mock the Firestore SDK and
 * assert on the call args — not source-grep.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

const addDocMock = vi.fn(async () => ({ id: 'log-id' }))

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => ({})),
  addDoc: addDocMock,
  serverTimestamp: vi.fn(() => '__SERVER_TIMESTAMP__'),
}))

const currentUserRef: { value: { uid: string } | null } = { value: null }
vi.mock('../src/lib/firebase/config', () => ({
  db: {},
  get auth() {
    return { get currentUser() { return currentUserRef.value } }
  },
}))

beforeEach(() => {
  addDocMock.mockClear()
  addDocMock.mockResolvedValue({ id: 'log-id' })
  currentUserRef.value = null
  if (typeof sessionStorage !== 'undefined') sessionStorage.clear()
})

describe('shouldLogForUser', () => {
  it('returns true for DEBUG_USER_UID', async () => {
    const { shouldLogForUser, DEBUG_USER_UID } = await import('../src/lib/firebase/diagnosticLogs')
    expect(shouldLogForUser(DEBUG_USER_UID)).toBe(true)
  })

  it('returns false for any other uid', async () => {
    const { shouldLogForUser } = await import('../src/lib/firebase/diagnosticLogs')
    expect(shouldLogForUser('some-other-uid')).toBe(false)
    expect(shouldLogForUser(null)).toBe(false)
    expect(shouldLogForUser(undefined)).toBe(false)
    expect(shouldLogForUser('')).toBe(false)
  })
})

describe('logDiagnostic', () => {
  it('calls addDoc with full schema when actor is the debug user', async () => {
    const { logDiagnostic, DEBUG_USER_UID } = await import('../src/lib/firebase/diagnosticLogs')
    currentUserRef.value = { uid: DEBUG_USER_UID }

    logDiagnostic('WORKOUT_AUTOSAVE', 'workout-123', { isUpdate: true, status: 'in_progress' })

    // Allow microtask for the awaited collection() / addDoc() chain.
    await new Promise((r) => setTimeout(r, 0))

    expect(addDocMock).toHaveBeenCalledTimes(1)
    const [, payload] = addDocMock.mock.calls[0]
    expect(payload).toMatchObject({
      userId: DEBUG_USER_UID,
      workoutOwnerId: null,
      eventType: 'WORKOUT_AUTOSAVE',
      workoutId: 'workout-123',
      timestamp: '__SERVER_TIMESTAMP__',
      payload: { isUpdate: true, status: 'in_progress' },
    })
    // Required fields all present (no undefined).
    expect(payload.sessionId).toBeTypeOf('string')
    expect(payload.sessionId.length).toBeGreaterThan(0)
    expect(payload.stackTrace).toBeTypeOf('string')
    expect(payload.userAgent).toBeTypeOf('string')
    expect(payload.url).toBeTypeOf('string')
    // workoutId is explicit — never undefined, never missing.
    expect('workoutId' in payload).toBe(true)
  })

  it('does NOT call addDoc when actor is not the debug user', async () => {
    const { logDiagnostic } = await import('../src/lib/firebase/diagnosticLogs')
    currentUserRef.value = { uid: 'some-random-user' }

    logDiagnostic('WORKOUT_AUTOSAVE', 'workout-123', { foo: 'bar' })
    await new Promise((r) => setTimeout(r, 0))

    expect(addDocMock).not.toHaveBeenCalled()
  })

  it('does NOT call addDoc when there is no authenticated user', async () => {
    const { logDiagnostic } = await import('../src/lib/firebase/diagnosticLogs')
    currentUserRef.value = null

    logDiagnostic('WORKOUT_COMPLETE', 'workout-123', {})
    await new Promise((r) => setTimeout(r, 0))

    expect(addDocMock).not.toHaveBeenCalled()
  })

  it('does NOT throw when addDoc rejects (fire-and-forget)', async () => {
    const { logDiagnostic, DEBUG_USER_UID } = await import('../src/lib/firebase/diagnosticLogs')
    currentUserRef.value = { uid: DEBUG_USER_UID }
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    addDocMock.mockRejectedValueOnce(new Error('firestore unreachable'))

    // The call itself must be synchronous and never throw.
    expect(() => logDiagnostic('SOFT_DELETE', 'workout-x', {})).not.toThrow()

    // Wait for the rejected promise to be observed by the .catch handler.
    await new Promise((r) => setTimeout(r, 0))

    expect(warnSpy).toHaveBeenCalledWith('Diagnostic log failed:', expect.any(Error))
    warnSpy.mockRestore()
  })

  it('writes workoutOwnerId only when it differs from the actor uid (else null)', async () => {
    const { logDiagnostic, DEBUG_USER_UID } = await import('../src/lib/firebase/diagnosticLogs')
    currentUserRef.value = { uid: DEBUG_USER_UID }

    // Same uid → workoutOwnerId is null.
    logDiagnostic('WORKOUT_CREATED', 'wid-1', { source: 'test' }, DEBUG_USER_UID)
    await new Promise((r) => setTimeout(r, 0))
    expect(addDocMock.mock.calls[0][1].workoutOwnerId).toBeNull()

    addDocMock.mockClear()

    // Different uid (trainer→trainee flow) → workoutOwnerId is the trainee.
    logDiagnostic('WORKOUT_CREATED', 'wid-2', { source: 'test' }, 'trainee-uid')
    await new Promise((r) => setTimeout(r, 0))
    expect(addDocMock.mock.calls[0][1].workoutOwnerId).toBe('trainee-uid')
  })

  it('writes workoutId as explicit null (never undefined) when none is provided', async () => {
    const { logDiagnostic, DEBUG_USER_UID } = await import('../src/lib/firebase/diagnosticLogs')
    currentUserRef.value = { uid: DEBUG_USER_UID }

    logDiagnostic('WORKOUT_RECOVERY_FOUND', null, { foundCount: 0 })
    await new Promise((r) => setTimeout(r, 0))

    const written = addDocMock.mock.calls[0][1]
    expect(written.workoutId).toBeNull()
    expect('workoutId' in written).toBe(true)
  })

  it('reuses sessionId across calls within the same tab', async () => {
    const { logDiagnostic, DEBUG_USER_UID } = await import('../src/lib/firebase/diagnosticLogs')
    currentUserRef.value = { uid: DEBUG_USER_UID }

    logDiagnostic('WORKOUT_AUTOSAVE', 'a', {})
    logDiagnostic('WORKOUT_AUTOSAVE', 'b', {})
    await new Promise((r) => setTimeout(r, 0))

    const sid1 = addDocMock.mock.calls[0][1].sessionId
    const sid2 = addDocMock.mock.calls[1][1].sessionId
    expect(sid1).toBe(sid2)
    expect(sid1.length).toBeGreaterThan(0)
  })
})
