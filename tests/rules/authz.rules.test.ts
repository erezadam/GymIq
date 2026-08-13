/**
 * Security-rules tests for the authz-hardening PR (findings 2-9).
 *
 * Run via the emulator:  npm run test:rules
 *
 * Red-before-green: each `exploit` case asserts the SECURE outcome (the attack
 * fails). Pointing RULES_FILE at the pre-fix rules makes every exploit case go
 * red (the attack succeeds) — proving the test actually exercises the hole. See
 * README of the PR / npm run test:rules:redcheck.
 */
import { readFileSync } from 'fs'
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import {
  doc,
  setDoc,
  updateDoc,
  getDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { ref, uploadString } from 'firebase/storage'
import { beforeAll, afterAll, beforeEach, describe, it } from 'vitest'

const PROJECT_ID = 'gymiq-rules-test'
const FIRESTORE_RULES = process.env.RULES_FILE || 'firestore.rules'
const STORAGE_RULES = process.env.STORAGE_RULES_FILE || 'storage.rules'

function parseHostPort(v: string | undefined, dfltPort: number): { host: string; port: number } {
  if (!v) return { host: '127.0.0.1', port: dfltPort }
  const [host, port] = v.replace(/^https?:\/\//, '').split(':')
  return { host, port: Number(port) }
}

let testEnv: RulesTestEnvironment

beforeAll(async () => {
  const fs = parseHostPort(process.env.FIRESTORE_EMULATOR_HOST, 8080)
  const st = parseHostPort(process.env.FIREBASE_STORAGE_EMULATOR_HOST, 9199)
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: readFileSync(FIRESTORE_RULES, 'utf8'), host: fs.host, port: fs.port },
    storage: { rules: readFileSync(STORAGE_RULES, 'utf8'), host: st.host, port: st.port },
  })
})

afterAll(async () => {
  await testEnv?.cleanup()
})

// Seed baseline docs with rules disabled before each test.
beforeEach(async () => {
  await testEnv.clearFirestore()
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore()
    await setDoc(doc(db, 'users/admin1'), { uid: 'admin1', role: 'admin', email: 'a@x.com' })
    await setDoc(doc(db, 'users/trainerA'), { uid: 'trainerA', role: 'trainer', email: 'ta@x.com', displayName: 'Trainer A' })
    await setDoc(doc(db, 'users/trainerB'), { uid: 'trainerB', role: 'trainer', email: 'tb@x.com' })
    await setDoc(doc(db, 'users/traineeA'), { uid: 'traineeA', role: 'user', email: 'pa@x.com', trainerId: 'trainerA' })
    await setDoc(doc(db, 'users/traineeB'), { uid: 'traineeB', role: 'user', email: 'pb@x.com', trainerId: null })

    await setDoc(doc(db, 'workoutHistory/whA'), { userId: 'traineeA', exercises: [], status: 'completed' })
    await setDoc(doc(db, 'workoutSessions/wsA'), { userId: 'traineeA', status: 'in_progress' })
    await setDoc(doc(db, 'trainingPrograms/progA'), { trainerId: 'trainerA', traineeId: 'traineeA', name: 'P', type: 'weekly' })
    await setDoc(doc(db, 'trainerMessages/msgA'), { trainerId: 'trainerA', traineeId: 'traineeA', text: 'hi' })
    await setDoc(doc(db, 'trainerRelationships/relA'), { trainerId: 'trainerA', traineeId: 'traineeA', status: 'active' })
    await setDoc(doc(db, 'workoutTemplates/tplA'), { createdBy: 'traineeA', isPublic: false, name: 'T' })
  })
})

const as = (uid: string) => testEnv.authenticatedContext(uid).firestore()

describe('Finding 2/8 — users role & trainerId escalation', () => {
  it('exploit: self-create with role=admin is denied', async () => {
    await assertFails(
      setDoc(doc(as('evil'), 'users/evil'), { uid: 'evil', role: 'admin', email: 'e@x.com' })
    )
  })

  it('exploit: self-update role→admin is denied', async () => {
    await assertFails(updateDoc(doc(as('traineeA'), 'users/traineeA'), { role: 'admin' }))
  })

  it('exploit: trainer creates a new admin user is denied', async () => {
    await assertFails(
      setDoc(doc(as('trainerA'), 'users/newguy'), { uid: 'newguy', role: 'admin', trainerId: 'trainerA' })
    )
  })

  it('exploit: self-assign trainerId to a trainer is denied (finding 8)', async () => {
    await assertFails(updateDoc(doc(as('traineeB'), 'users/traineeB'), { trainerId: 'trainerA' }))
  })

  it('positive: self-create with role=user succeeds', async () => {
    await assertSucceeds(
      setDoc(doc(as('newuser'), 'users/newuser'), { uid: 'newuser', role: 'user', email: 'n@x.com' })
    )
  })

  it('positive: edit own profile fields succeeds', async () => {
    await assertSucceeds(
      updateDoc(doc(as('traineeA'), 'users/traineeA'), { firstName: 'Dan', city: 'TLV' })
    )
  })

  it('positive: clear own trainerId (self-disconnect) succeeds', async () => {
    await assertSucceeds(updateDoc(doc(as('traineeA'), 'users/traineeA'), { trainerId: null }))
  })
})

describe('Finding 3 — ownership pinning on workout docs', () => {
  it('exploit: owner reassigns workoutHistory.userId to a victim is denied', async () => {
    await assertFails(updateDoc(doc(as('traineeA'), 'workoutHistory/whA'), { userId: 'traineeB' }))
  })

  it('exploit: owner reassigns workoutSessions.userId is denied', async () => {
    await assertFails(updateDoc(doc(as('traineeA'), 'workoutSessions/wsA'), { userId: 'traineeB' }))
  })

  it('positive: owner updates own workout keeping userId succeeds', async () => {
    await assertSucceeds(updateDoc(doc(as('traineeA'), 'workoutHistory/whA'), { status: 'in_progress' }))
  })

  it('positive: user creates own workoutHistory succeeds', async () => {
    await assertSucceeds(
      setDoc(doc(as('traineeA'), 'workoutHistory/whNew'), { userId: 'traineeA', exercises: [] })
    )
  })
})

describe('Finding 4 — trainer create/read of workout history scoped to own trainees', () => {
  it('exploit: unrelated trainer creates history for a stranger is denied', async () => {
    await assertFails(
      setDoc(doc(as('trainerB'), 'workoutHistory/whX'), { userId: 'traineeA', reportedBy: 'trainerB', exercises: [] })
    )
  })

  it('positive: trainer creates history for own trainee succeeds', async () => {
    await assertSucceeds(
      setDoc(doc(as('trainerA'), 'workoutHistory/whY'), { userId: 'traineeA', reportedBy: 'trainerA', exercises: [] })
    )
  })

  it('positive/negative: only the linked trainer reads the trainee history', async () => {
    await assertSucceeds(getDoc(doc(as('trainerA'), 'workoutHistory/whA')))
    await assertFails(getDoc(doc(as('trainerB'), 'workoutHistory/whA')))
  })
})

describe('Finding 5/7 — trainingPrograms scope + assignment pin', () => {
  it('exploit: trainer creates program for a stranger is denied', async () => {
    await assertFails(
      setDoc(doc(as('trainerB'), 'trainingPrograms/pX'), { trainerId: 'trainerB', traineeId: 'traineeA', name: 'x' })
    )
  })

  it('positive: trainer creates program for own trainee succeeds', async () => {
    await assertSucceeds(
      setDoc(doc(as('trainerA'), 'trainingPrograms/pY'), { trainerId: 'trainerA', traineeId: 'traineeA', name: 'y' })
    )
  })

  it('exploit: reassign program.traineeId is denied', async () => {
    await assertFails(updateDoc(doc(as('trainerA'), 'trainingPrograms/progA'), { traineeId: 'traineeB' }))
  })

  it('positive: trainer edits own program content succeeds', async () => {
    await assertSucceeds(updateDoc(doc(as('trainerA'), 'trainingPrograms/progA'), { name: 'renamed' }))
  })
})

describe('Finding 6/7 — trainerMessages scope + assignment pin', () => {
  it('exploit: trainer messages a stranger is denied', async () => {
    await assertFails(
      setDoc(doc(as('trainerB'), 'trainerMessages/mX'), { trainerId: 'trainerB', traineeId: 'traineeA', text: 'x' })
    )
  })

  it('positive: trainer messages own trainee succeeds', async () => {
    await assertSucceeds(
      setDoc(doc(as('trainerA'), 'trainerMessages/mY'), { trainerId: 'trainerA', traineeId: 'traineeA', text: 'y' })
    )
  })

  it('exploit: reassign message.traineeId is denied', async () => {
    await assertFails(updateDoc(doc(as('trainerA'), 'trainerMessages/msgA'), { traineeId: 'traineeB' }))
  })
})

describe('Beyond-list findings — workoutTemplates & trainerRelationships', () => {
  it('exploit: reassign workoutTemplate.createdBy is denied', async () => {
    await assertFails(updateDoc(doc(as('traineeA'), 'workoutTemplates/tplA'), { createdBy: 'traineeB' }))
  })

  it('positive: owner edits own template succeeds', async () => {
    await assertSucceeds(updateDoc(doc(as('traineeA'), 'workoutTemplates/tplA'), { name: 'renamed' }))
  })

  it('exploit: reassign relationship.traineeId is denied', async () => {
    await assertFails(updateDoc(doc(as('trainerA'), 'trainerRelationships/relA'), { traineeId: 'traineeB', status: 'paused' }))
  })

  it('positive: party pauses an active relationship succeeds', async () => {
    await assertSucceeds(updateDoc(doc(as('trainerA'), 'trainerRelationships/relA'), { status: 'paused' }))
  })
})

describe('Admin regression — privileged paths still work', () => {
  it('admin updates any user role', async () => {
    await assertSucceeds(updateDoc(doc(as('admin1'), 'users/traineeB'), { role: 'trainer' }))
  })

  it('admin reads any workout history', async () => {
    await assertSucceeds(getDoc(doc(as('admin1'), 'workoutHistory/whA')))
  })
})

describe('Finding 9 — storage rules', () => {
  const bytes = 'data:image/jpeg;base64,/9j/4AAQSkZJRg=='
  const storageAs = (uid: string) => testEnv.authenticatedContext(uid).storage()

  it('exploit: non-trainer, non-owner writing a trainee photo is denied', async () => {
    // traineeB (role user) writing traineeA's photo prefix
    await assertFails(
      uploadString(ref(storageAs('traineeB'), 'trainee-photos/traineeA_1.jpg'), bytes, 'data_url')
    )
  })

  it('positive: trainer writes a trainee photo succeeds', async () => {
    await assertSucceeds(
      uploadString(ref(storageAs('trainerA'), 'trainee-photos/traineeA_2.jpg'), bytes, 'data_url')
    )
  })

  it('positive: trainee writes own photo (prefix match) succeeds', async () => {
    await assertSucceeds(
      uploadString(ref(storageAs('traineeA'), 'trainee-photos/traineeA_3.jpg'), bytes, 'data_url')
    )
  })

  it('exploit: non-admin writing an exercise-set image is denied', async () => {
    await assertFails(
      uploadString(ref(storageAs('trainerA'), 'exercise-sets/set1_1.jpg'), bytes, 'data_url')
    )
  })

  it('positive: admin writes an exercise-set image succeeds', async () => {
    await assertSucceeds(
      uploadString(ref(storageAs('admin1'), 'exercise-sets/set1_2.jpg'), bytes, 'data_url')
    )
  })
})
