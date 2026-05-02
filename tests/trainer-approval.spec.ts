/**
 * trainer-approval.spec.ts — Behavior tests for the Trainer Approval Flow
 * (Phase 1 foundation).
 *
 * Per CLAUDE.md "🧪 בדיקות": these are behavior tests (mock the Firestore
 * SDK and assert on the call arguments), not source-grep checks. The tests
 * fail if the behavior breaks at runtime, regardless of how the source is
 * worded.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ----- Mock firebase/firestore (capture write args) -----

const updateDocMock = vi.fn(async () => undefined)
const setDocMock = vi.fn(async () => undefined)
const getDocsMock = vi.fn()
const getDocMock = vi.fn()

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => ({})),
  doc: vi.fn((_db: unknown, _path?: string, id?: string) => ({ id: id || 'new-rel-id' })),
  getDoc: getDocMock,
  getDocs: getDocsMock,
  addDoc: vi.fn(async () => ({ id: 'new-rel-id' })),
  updateDoc: updateDocMock,
  setDoc: setDocMock,
  deleteDoc: vi.fn(),
  deleteField: vi.fn(),
  query: vi.fn((...args: unknown[]) => ({ __query: args })),
  where: vi.fn((field: string, op: string, value: unknown) => ({ __where: { field, op, value } })),
  orderBy: vi.fn((field: string, direction?: string) => ({ __orderBy: { field, direction } })),
  limit: vi.fn((n: number) => ({ __limit: n })),
  serverTimestamp: vi.fn(() => '__SERVER_TIMESTAMP__'),
  Timestamp: { now: vi.fn(() => ({ toDate: () => new Date() })) },
}))

// ----- Mock firebase/functions (capture httpsCallable invocations) -----

const callableInvocations: Array<{ name: string; payload: unknown }> = []
const httpsCallableFactory = vi.fn((_functions: unknown, name: string) => {
  return async (payload: unknown) => {
    callableInvocations.push({ name, payload })
    return { data: { success: true } }
  }
})

vi.mock('firebase/functions', () => ({
  getFunctions: vi.fn(() => ({})),
  httpsCallable: httpsCallableFactory,
}))

// ----- Mock the Firebase config + auth helper imports -----

vi.mock('@/lib/firebase/config', () => ({
  db: {},
  app: {},
}))

const updateUserProfileMock = vi.fn(async () => undefined)
vi.mock('@/lib/firebase/auth', () => ({
  updateUserProfile: updateUserProfileMock,
}))

// Stub out workoutHistory + programService imports — they are not exercised
// by the approval-flow functions but the service module imports them.
vi.mock('@/lib/firebase/workoutHistory', () => ({
  getUserWorkoutStats: vi.fn(),
  getUserWorkoutHistory: vi.fn(),
}))
vi.mock('./programService', () => ({
  programService: { getTraineeActiveProgram: vi.fn() },
}))

beforeEach(() => {
  updateDocMock.mockClear()
  setDocMock.mockClear()
  getDocsMock.mockClear()
  getDocMock.mockClear()
  updateUserProfileMock.mockClear()
  httpsCallableFactory.mockClear()
  callableInvocations.length = 0
})

const FAKE_TRAINEE = {
  uid: 'trainee-123',
  email: 'trainee@example.com',
  firstName: 'דנה',
  lastName: 'כהן',
  displayName: 'דנה כהן',
}

describe('requestTrainer', () => {
  it('creates a pending relationship marked requestedBy=trainee', async () => {
    getDocsMock.mockResolvedValueOnce({ empty: true, docs: [] })
    const { trainerService } = await import('../src/domains/trainer/services/trainerService')

    const id = await trainerService.requestTrainer(FAKE_TRAINEE, 'trainer-456', 'יוסי הירוק')

    expect(id).toBe('new-rel-id')
    expect(setDocMock).toHaveBeenCalledTimes(1)
    const [, payload] = setDocMock.mock.calls[0] as [unknown, Record<string, unknown>]
    expect(payload.status).toBe('pending')
    expect(payload.requestedBy).toBe('trainee')
    expect(payload.requestedAt).toBe('__SERVER_TIMESTAMP__')
    expect(payload.trainerId).toBe('trainer-456')
    expect(payload.traineeId).toBe('trainee-123')
  })

  it('triggers sendTrainerRequestEmail Cloud Function after the relationship is created', async () => {
    getDocsMock.mockResolvedValueOnce({ empty: true, docs: [] })
    const { trainerService } = await import('../src/domains/trainer/services/trainerService')

    await trainerService.requestTrainer(FAKE_TRAINEE, 'trainer-456', 'יוסי הירוק')

    const emailCalls = callableInvocations.filter(c => c.name === 'sendTrainerRequestEmail')
    expect(emailCalls).toHaveLength(1)
    expect(emailCalls[0].payload).toEqual({ relationshipId: 'new-rel-id' })
  })

  it('does NOT touch user.trainerId on the trainee', async () => {
    getDocsMock.mockResolvedValueOnce({ empty: true, docs: [] })
    const { trainerService } = await import('../src/domains/trainer/services/trainerService')

    await trainerService.requestTrainer(FAKE_TRAINEE, 'trainer-456', 'יוסי הירוק')

    expect(updateUserProfileMock).not.toHaveBeenCalled()
  })

  it('blocks the request when an active relationship already exists', async () => {
    getDocsMock.mockResolvedValueOnce({
      empty: false,
      docs: [{ data: () => ({ status: 'active', trainerName: 'מאמן קיים' }) }],
    })
    const { trainerService, TrainerRelationshipError } = await import(
      '../src/domains/trainer/services/trainerService'
    )

    await expect(
      trainerService.requestTrainer(FAKE_TRAINEE, 'trainer-456', 'יוסי הירוק')
    ).rejects.toBeInstanceOf(TrainerRelationshipError)

    // No write attempted.
    expect(setDocMock).not.toHaveBeenCalled()
  })

  it('blocks the request when a pending relationship already exists', async () => {
    getDocsMock.mockResolvedValueOnce({
      empty: false,
      docs: [{ data: () => ({ status: 'pending', trainerName: 'מאמן ממתין' }) }],
    })
    const { trainerService, TrainerRelationshipError } = await import(
      '../src/domains/trainer/services/trainerService'
    )

    await expect(
      trainerService.requestTrainer(FAKE_TRAINEE, 'trainer-789', 'מאמן אחר')
    ).rejects.toMatchObject({ code: 'TRAINER_RELATIONSHIP_EXISTS' })

    expect(setDocMock).not.toHaveBeenCalled()
  })
})

describe('approveTrainerRequest', () => {
  it('invokes the approveTrainerRequest Cloud Function with the relationshipId', async () => {
    const { trainerService } = await import('../src/domains/trainer/services/trainerService')

    await trainerService.approveTrainerRequest('rel-abc')

    expect(callableInvocations).toHaveLength(1)
    expect(callableInvocations[0].name).toBe('approveTrainerRequest')
    expect(callableInvocations[0].payload).toEqual({ relationshipId: 'rel-abc' })
  })

  it('does not perform any direct Firestore write from the client', async () => {
    const { trainerService } = await import('../src/domains/trainer/services/trainerService')

    await trainerService.approveTrainerRequest('rel-abc')

    // Atomicity is enforced server-side (Admin SDK batch). Client must NOT
    // attempt the writes itself — that would either fail (permission-denied
    // on users.trainerId) or duplicate the work.
    expect(setDocMock).not.toHaveBeenCalled()
    expect(updateDocMock).not.toHaveBeenCalled()
    expect(updateUserProfileMock).not.toHaveBeenCalled()
  })
})

describe('rejectTrainerRequest', () => {
  // Helper to mock getDoc returning a relationship with the given status.
  function mockExistingStatus(status: string) {
    getDocMock.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ status }),
    })
  }

  it('updates status to rejected with respondedAt and does not touch users', async () => {
    mockExistingStatus('pending')
    const { trainerService } = await import('../src/domains/trainer/services/trainerService')

    await trainerService.rejectTrainerRequest('rel-abc')

    expect(updateDocMock).toHaveBeenCalledTimes(1)
    const [, payload] = updateDocMock.mock.calls[0] as [unknown, Record<string, unknown>]
    expect(payload.status).toBe('rejected')
    expect(payload.respondedAt).toBe('__SERVER_TIMESTAMP__')
    expect(payload.updatedAt).toBe('__SERVER_TIMESTAMP__')
    expect(updateUserProfileMock).not.toHaveBeenCalled()
  })

  it('records rejectionReason when provided', async () => {
    mockExistingStatus('pending')
    const { trainerService } = await import('../src/domains/trainer/services/trainerService')

    await trainerService.rejectTrainerRequest('rel-abc', '  שעות לא מתאימות  ')

    const [, payload] = updateDocMock.mock.calls[0] as [unknown, Record<string, unknown>]
    expect(payload.rejectionReason).toBe('שעות לא מתאימות')
  })

  it('omits rejectionReason when reason is empty/whitespace', async () => {
    mockExistingStatus('pending')
    const { trainerService } = await import('../src/domains/trainer/services/trainerService')

    await trainerService.rejectTrainerRequest('rel-abc', '   ')

    const [, payload] = updateDocMock.mock.calls[0] as [unknown, Record<string, unknown>]
    expect('rejectionReason' in payload).toBe(false)
  })

  it('triggers sendTrainerRejectedEmail Cloud Function after the rejection is persisted', async () => {
    mockExistingStatus('pending')
    const { trainerService } = await import('../src/domains/trainer/services/trainerService')

    await trainerService.rejectTrainerRequest('rel-abc', 'reason X')

    const emailCalls = callableInvocations.filter(c => c.name === 'sendTrainerRejectedEmail')
    expect(emailCalls).toHaveLength(1)
    expect(emailCalls[0].payload).toEqual({ relationshipId: 'rel-abc' })
  })

  it('is a silent no-op when the relationship is already rejected (idempotent, no second email)', async () => {
    mockExistingStatus('rejected')
    const { trainerService } = await import('../src/domains/trainer/services/trainerService')

    await trainerService.rejectTrainerRequest('rel-abc')

    expect(updateDocMock).not.toHaveBeenCalled()
    const emailCalls = callableInvocations.filter(c => c.name === 'sendTrainerRejectedEmail')
    expect(emailCalls).toHaveLength(0)
  })

  it('is a silent no-op when the relationship is already active', async () => {
    mockExistingStatus('active')
    const { trainerService } = await import('../src/domains/trainer/services/trainerService')

    await trainerService.rejectTrainerRequest('rel-abc')

    expect(updateDocMock).not.toHaveBeenCalled()
  })

  it('throws when the relationship does not exist', async () => {
    getDocMock.mockResolvedValueOnce({ exists: () => false, data: () => undefined })
    const { trainerService } = await import('../src/domains/trainer/services/trainerService')

    await expect(trainerService.rejectTrainerRequest('rel-abc')).rejects.toThrow(/not found/i)
    expect(updateDocMock).not.toHaveBeenCalled()
  })
})

describe('cancelTrainerRequest', () => {
  it('updates status to cancelled (does NOT delete the document)', async () => {
    const { trainerService } = await import('../src/domains/trainer/services/trainerService')

    await trainerService.cancelTrainerRequest('rel-abc')

    expect(updateDocMock).toHaveBeenCalledTimes(1)
    const [, payload] = updateDocMock.mock.calls[0] as [unknown, Record<string, unknown>]
    expect(payload.status).toBe('cancelled')
    expect(payload.respondedAt).toBe('__SERVER_TIMESTAMP__')
  })
})

describe('getPendingRequestsForTrainer', () => {
  it('queries by trainerId + status=pending ordered by requestedAt desc', async () => {
    const fbf = await import('firebase/firestore')
    const whereMock = fbf.where as unknown as ReturnType<typeof vi.fn>
    const orderByMock = fbf.orderBy as unknown as ReturnType<typeof vi.fn>
    whereMock.mockClear()
    orderByMock.mockClear()

    getDocsMock.mockResolvedValueOnce({ docs: [] })
    const { trainerService } = await import('../src/domains/trainer/services/trainerService')

    await trainerService.getPendingRequestsForTrainer('trainer-456')

    const whereCalls = whereMock.mock.calls.map((c: unknown[]) => c.join(':'))
    expect(whereCalls).toContain('trainerId:==:trainer-456')
    expect(whereCalls).toContain('status:==:pending')

    const orderByCalls = orderByMock.mock.calls.map((c: unknown[]) => c.join(':'))
    expect(orderByCalls).toContain('requestedAt:desc')
  })
})

describe('hasActiveOrPendingTrainer', () => {
  it('returns has=false when no relationship exists', async () => {
    getDocsMock.mockResolvedValueOnce({ empty: true, docs: [] })
    const { trainerService } = await import('../src/domains/trainer/services/trainerService')

    const result = await trainerService.hasActiveOrPendingTrainer('trainee-123')

    expect(result).toEqual({ has: false })
  })

  it('returns the existing status and trainer name when one exists', async () => {
    getDocsMock.mockResolvedValueOnce({
      empty: false,
      docs: [{ data: () => ({ status: 'pending', trainerName: 'יוסי הירוק' }) }],
    })
    const { trainerService } = await import('../src/domains/trainer/services/trainerService')

    const result = await trainerService.hasActiveOrPendingTrainer('trainee-123')

    expect(result).toEqual({ has: true, status: 'pending', trainerName: 'יוסי הירוק' })
  })

  it('returns has=true when a paused relationship exists (paused must block new requests)', async () => {
    getDocsMock.mockResolvedValueOnce({
      empty: false,
      docs: [{ data: () => ({ status: 'paused', trainerName: 'מאמן מושהה' }) }],
    })
    const { trainerService } = await import('../src/domains/trainer/services/trainerService')

    const result = await trainerService.hasActiveOrPendingTrainer('trainee-123')

    expect(result).toEqual({ has: true, status: 'paused', trainerName: 'מאמן מושהה' })
  })

  it("queries with 'paused' included in the status `in` filter", async () => {
    const fbf = await import('firebase/firestore')
    const whereMock = fbf.where as unknown as ReturnType<typeof vi.fn>
    whereMock.mockClear()

    getDocsMock.mockResolvedValueOnce({ empty: true, docs: [] })
    const { trainerService } = await import('../src/domains/trainer/services/trainerService')

    await trainerService.hasActiveOrPendingTrainer('trainee-123')

    // Find the call that uses the `in` operator on `status` and assert the
    // value array contains 'paused' in addition to 'active' and 'pending'.
    const inStatusCall = whereMock.mock.calls.find(
      (c: unknown[]) => c[0] === 'status' && c[1] === 'in'
    )
    expect(inStatusCall).toBeDefined()
    expect(inStatusCall?.[2]).toEqual(expect.arrayContaining(['active', 'paused', 'pending']))
  })

  it('blocks requestTrainer when an existing paused relationship is found', async () => {
    getDocsMock.mockResolvedValueOnce({
      empty: false,
      docs: [{ data: () => ({ status: 'paused', trainerName: 'מאמן מושהה' }) }],
    })
    const { trainerService, TrainerRelationshipError } = await import(
      '../src/domains/trainer/services/trainerService'
    )

    await expect(
      trainerService.requestTrainer(FAKE_TRAINEE, 'new-trainer', 'מאמן חדש')
    ).rejects.toBeInstanceOf(TrainerRelationshipError)
    expect(setDocMock).not.toHaveBeenCalled()
  })
})

describe('getMyLatestRelationshipState', () => {
  it('returns null when no relationship exists', async () => {
    getDocsMock.mockResolvedValueOnce({ empty: true, docs: [] })
    const { trainerService } = await import('../src/domains/trainer/services/trainerService')

    expect(await trainerService.getMyLatestRelationshipState('trainee-123')).toBeNull()
  })

  it('returns the latest pending state', async () => {
    getDocsMock.mockResolvedValueOnce({
      empty: false,
      docs: [
        {
          id: 'rel-abc',
          data: () => ({
            status: 'pending',
            trainerName: 'יוסי הירוק',
            updatedAt: { toDate: () => new Date() },
          }),
        },
      ],
    })
    const { trainerService } = await import('../src/domains/trainer/services/trainerService')

    expect(await trainerService.getMyLatestRelationshipState('trainee-123')).toEqual({
      relationshipId: 'rel-abc',
      status: 'pending',
      trainerName: 'יוסי הירוק',
      rejectionReason: undefined,
    })
  })

  it('returns rejected state with the rejection reason', async () => {
    getDocsMock.mockResolvedValueOnce({
      empty: false,
      docs: [
        {
          id: 'rel-abc',
          data: () => ({
            status: 'rejected',
            trainerName: 'יוסי הירוק',
            rejectionReason: 'שעות לא מתאימות',
            updatedAt: { toDate: () => new Date() },
          }),
        },
      ],
    })
    const { trainerService } = await import('../src/domains/trainer/services/trainerService')

    expect(await trainerService.getMyLatestRelationshipState('trainee-123')).toMatchObject({
      status: 'rejected',
      rejectionReason: 'שעות לא מתאימות',
    })
  })

  it('hides ended/cancelled states older than 30 days (auto-fade)', async () => {
    const oldDate = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000)
    getDocsMock.mockResolvedValueOnce({
      empty: false,
      docs: [
        {
          id: 'rel-abc',
          data: () => ({
            status: 'ended',
            trainerName: 'יוסי הירוק',
            updatedAt: { toDate: () => oldDate },
          }),
        },
      ],
    })
    const { trainerService } = await import('../src/domains/trainer/services/trainerService')

    expect(await trainerService.getMyLatestRelationshipState('trainee-123')).toBeNull()
  })

  it('keeps recent ended/cancelled states (within 30 days)', async () => {
    const recentDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
    getDocsMock.mockResolvedValueOnce({
      empty: false,
      docs: [
        {
          id: 'rel-abc',
          data: () => ({
            status: 'cancelled',
            trainerName: 'יוסי הירוק',
            updatedAt: { toDate: () => recentDate },
          }),
        },
      ],
    })
    const { trainerService } = await import('../src/domains/trainer/services/trainerService')

    const result = await trainerService.getMyLatestRelationshipState('trainee-123')
    expect(result?.status).toBe('cancelled')
  })

  it('does NOT fade rejected (always shown)', async () => {
    const oldDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
    getDocsMock.mockResolvedValueOnce({
      empty: false,
      docs: [
        {
          id: 'rel-abc',
          data: () => ({
            status: 'rejected',
            trainerName: 'יוסי הירוק',
            rejectionReason: 'לא זמין',
            updatedAt: { toDate: () => oldDate },
          }),
        },
      ],
    })
    const { trainerService } = await import('../src/domains/trainer/services/trainerService')

    const result = await trainerService.getMyLatestRelationshipState('trainee-123')
    expect(result?.status).toBe('rejected')
  })
})
