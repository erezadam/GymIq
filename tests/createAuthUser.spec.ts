/**
 * createAuthUser.spec.ts — Behavior tests for `createIsolatedAuthUser`.
 *
 * Critical context: `createUserWithEmailAndPassword` auto-signs-in the new user
 * on whichever auth instance it runs on. The admin "create user" screen used to
 * call it on the PRIMARY app's auth, which swapped the admin's session for the
 * new (lower-privileged) account and kicked the admin out of the admin area.
 *
 * The fix isolates Auth creation on a throwaway secondary app. These tests
 * verify BEHAVIOR (mock the Firebase SDK, assert on call arguments), not string
 * presence — per the "behavior over grep" iron rule. They fail if the helper
 * ever creates the user on the primary auth or forgets to tear the app down.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Tagged fakes so we can assert the helper threads the SECONDARY app/auth
// (not the primary) through every call. Declared via vi.hoisted so they exist
// when the (hoisted) vi.mock factories below run at module-import time.
const {
  secondaryApp,
  secondaryAuth,
  initializeAppMock,
  deleteAppMock,
  getAuthMock,
  createUserMock,
  updateProfileMock,
} = vi.hoisted(() => {
  const secondaryApp = { __tag: 'secondary-app' }
  const secondaryAuth = { __tag: 'secondary-auth', app: secondaryApp }
  return {
    secondaryApp,
    secondaryAuth,
    initializeAppMock: vi.fn(() => secondaryApp),
    deleteAppMock: vi.fn(async () => undefined),
    getAuthMock: vi.fn(() => secondaryAuth),
    createUserMock: vi.fn(async () => ({ user: { uid: 'new-uid' } })),
    updateProfileMock: vi.fn(async () => undefined),
  }
})

vi.mock('firebase/app', () => ({
  initializeApp: initializeAppMock,
  deleteApp: deleteAppMock,
}))

vi.mock('firebase/auth', () => ({
  getAuth: getAuthMock,
  createUserWithEmailAndPassword: createUserMock,
  updateProfile: updateProfileMock,
}))

vi.mock('@/lib/firebase/config', () => ({
  firebaseConfig: { apiKey: 'test', projectId: 'test' },
}))

import { createIsolatedAuthUser } from '@/lib/firebase/createAuthUser'

beforeEach(() => {
  initializeAppMock.mockClear()
  deleteAppMock.mockClear()
  getAuthMock.mockClear()
  createUserMock.mockClear()
  updateProfileMock.mockClear()
  createUserMock.mockResolvedValue({ user: { uid: 'new-uid' } })
})

describe('createIsolatedAuthUser', () => {
  it('creates the user on a SECONDARY app/auth, never the primary', async () => {
    await createIsolatedAuthUser('a@b.com', 'secret123')

    // A secondary app is spun up with a unique, secondary-prefixed name.
    expect(initializeAppMock).toHaveBeenCalledTimes(1)
    const [config, name] = initializeAppMock.mock.calls[0]
    expect(config).toEqual({ apiKey: 'test', projectId: 'test' })
    expect(String(name)).toMatch(/^secondary-/)

    // getAuth is bound to that secondary app — not the default (no-arg) auth.
    expect(getAuthMock).toHaveBeenCalledWith(secondaryApp)

    // The user is created on the secondary auth instance.
    expect(createUserMock).toHaveBeenCalledWith(secondaryAuth, 'a@b.com', 'secret123')
  })

  it('returns the new uid', async () => {
    const result = await createIsolatedAuthUser('a@b.com', 'secret123')
    expect(result).toEqual({ uid: 'new-uid' })
  })

  it('tears down the secondary app on success', async () => {
    await createIsolatedAuthUser('a@b.com', 'secret123')
    expect(deleteAppMock).toHaveBeenCalledTimes(1)
    expect(deleteAppMock).toHaveBeenCalledWith(secondaryApp)
  })

  it('tears down the secondary app even when creation throws (finally)', async () => {
    createUserMock.mockRejectedValueOnce(
      Object.assign(new Error('email in use'), { code: 'auth/email-already-in-use' }),
    )

    await expect(createIsolatedAuthUser('a@b.com', 'secret123')).rejects.toThrow('email in use')

    // Cleanup still ran despite the failure.
    expect(deleteAppMock).toHaveBeenCalledTimes(1)
    expect(deleteAppMock).toHaveBeenCalledWith(secondaryApp)
  })

  it('does not surface cleanup failures (deleteApp error is swallowed)', async () => {
    deleteAppMock.mockRejectedValueOnce(new Error('cleanup boom'))
    const result = await createIsolatedAuthUser('a@b.com', 'secret123')
    // Creation result is preserved; the cleanup error does not propagate.
    expect(result).toEqual({ uid: 'new-uid' })
  })

  it('sets the Auth display name only when one is provided', async () => {
    await createIsolatedAuthUser('a@b.com', 'secret123')
    expect(updateProfileMock).not.toHaveBeenCalled()

    await createIsolatedAuthUser('a@b.com', 'secret123', 'Israel Israeli')
    expect(updateProfileMock).toHaveBeenCalledWith(
      { uid: 'new-uid' },
      { displayName: 'Israel Israeli' },
    )
  })
})
