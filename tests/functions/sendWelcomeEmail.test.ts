/**
 * Behavioral tests for finding 1 — sendWelcomeEmail authz (Cloud Function).
 *
 * Run via:  npm run test:functions
 *
 * Asserts BEHAVIOR (mock admin + assert side effects), not string presence:
 * unauthenticated / unauthorized calls are rejected BEFORE any side effect
 * (reset-link generation, email send), and the recipient is derived from the
 * trainee record — never from a caller-supplied string. firebase-admin /
 * firebase-functions are aliased to fixtures via vitest.functions.config.ts.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockState } from '../_mocks/state'
import { handleSendWelcomeEmail } from '../../functions/src/email/sendWelcomeEmail'

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  mockState.reset()
  fetchMock = vi.fn(async () => ({ ok: true, status: 200, text: async () => '' }))
  vi.stubGlobal('fetch', fetchMock)
  process.env.RESEND_API_KEY = 'test-key'
  mockState.users.set('trainerA', { uid: 'trainerA', role: 'trainer', displayName: 'Trainer A' })
  mockState.users.set('trainerB', { uid: 'trainerB', role: 'trainer', displayName: 'Trainer B' })
  mockState.users.set('traineeA', { uid: 'traineeA', role: 'user', email: 'doc-a@x.com', trainerId: 'trainerA' })
  mockState.authUsers.set('traineeA', { email: 'auth-a@x.com' })
})

const reject = (p: Promise<any>, code: string) => expect(p).rejects.toMatchObject({ code })

describe('sendWelcomeEmail — finding 1 authz', () => {
  it('rejects unauthenticated before any side effect', async () => {
    await reject(handleSendWelcomeEmail({ auth: null, data: { traineeId: 'traineeA' } }), 'unauthenticated')
    expect(mockState.resetLinkCalls).toHaveLength(0)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects missing traineeId', async () => {
    await reject(handleSendWelcomeEmail({ auth: { uid: 'trainerA' }, data: {} }), 'invalid-argument')
    expect(mockState.resetLinkCalls).toHaveLength(0)
  })

  it('rejects a caller who is not self / the trainee\'s trainer / admin', async () => {
    await reject(
      handleSendWelcomeEmail({ auth: { uid: 'trainerB' }, data: { traineeId: 'traineeA' } }),
      'permission-denied'
    )
    expect(mockState.resetLinkCalls).toHaveLength(0)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects when the target record does not exist', async () => {
    await reject(
      handleSendWelcomeEmail({ auth: { uid: 'trainerA' }, data: { traineeId: 'ghost' } }),
      'permission-denied'
    )
    expect(mockState.resetLinkCalls).toHaveLength(0)
  })

  it('the trainee\'s trainer succeeds; reset link uses the RECORD email, not caller input', async () => {
    const res = await handleSendWelcomeEmail({
      auth: { uid: 'trainerA' },
      data: { traineeId: 'traineeA', traineeEmail: 'attacker@evil.com' } as any,
    })
    expect(res).toEqual({ success: true })
    expect(mockState.resetLinkCalls).toEqual(['auth-a@x.com'])
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const body = JSON.parse((fetchMock.mock.calls[0] as any)[1].body)
    expect(body.to).toBe('auth-a@x.com')
  })

  it('the trainee themselves can trigger their own welcome email', async () => {
    await handleSendWelcomeEmail({ auth: { uid: 'traineeA' }, data: { traineeId: 'traineeA' } })
    expect(mockState.resetLinkCalls).toEqual(['auth-a@x.com'])
  })
})
