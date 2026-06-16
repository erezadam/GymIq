import { initializeApp, deleteApp } from 'firebase/app'
import { getAuth, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { firebaseConfig } from './config'

// Monotonic counter so two calls within the same millisecond cannot collide on
// the secondary app name (Date.now() alone would throw "app already exists").
let secondaryAppCounter = 0

/**
 * Creates a Firebase Auth user on an ISOLATED secondary app instance, so the
 * operator (admin/trainer) performing the creation is NOT signed out.
 *
 * Background: `createUserWithEmailAndPassword` auto-signs-in the newly created
 * user on whichever auth instance it runs on. Calling it on the primary app's
 * auth therefore replaces the current session — e.g. it kicks an admin out of
 * the admin area into the freshly created (lower-privileged) account. Creating
 * the user on a throwaway secondary app keeps the primary session intact.
 *
 * Scope: Auth isolation ONLY. This helper does not touch Firestore, roles,
 * relationships, emails, or UI — the caller owns all of that. The secondary
 * app is always torn down in `finally`, on success and on failure alike.
 *
 * @param email       new user's email
 * @param password    new user's password
 * @param displayName optional Auth profile display name (skipped if omitted)
 * @returns the new user's uid
 */
export async function createIsolatedAuthUser(
  email: string,
  password: string,
  displayName?: string,
): Promise<{ uid: string }> {
  const secondaryApp = initializeApp(firebaseConfig, `secondary-${Date.now()}-${secondaryAppCounter++}`)
  const secondaryAuth = getAuth(secondaryApp)

  try {
    const credential = await createUserWithEmailAndPassword(secondaryAuth, email, password)
    if (displayName) {
      await updateProfile(credential.user, { displayName })
    }
    return { uid: credential.user.uid }
  } finally {
    // The secondary app is disposable; cleanup failures must not mask the
    // creation result (or the original error on the throwing path).
    try {
      await deleteApp(secondaryApp)
    } catch {
      // Ignore cleanup errors.
    }
  }
}
