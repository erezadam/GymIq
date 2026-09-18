/**
 * Security-rules tests for the Admin Add Exercise feature (B.2).
 *
 * Run via the emulator:  npm run test:rules
 *
 * Covers:
 * - exerciseDrafts: admin creates a draft with createdBy == own uid; a regular
 *   user cannot; an admin cannot forge createdBy; direct client update/delete
 *   are denied even for the owning admin (state transitions are CF-only).
 * - machine-photos storage: admin-only write (image/*, <3MB); regular users
 *   and trainers denied.
 * - exercise-images storage: client writes always denied (Admin SDK only);
 *   authenticated read allowed.
 */
import { readFileSync } from 'fs'
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { doc, setDoc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore'
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

beforeEach(async () => {
  await testEnv.clearFirestore()
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore()
    await setDoc(doc(db, 'users/admin1'), { uid: 'admin1', role: 'admin', email: 'a@x.com' })
    await setDoc(doc(db, 'users/admin2'), { uid: 'admin2', role: 'admin', email: 'a2@x.com' })
    await setDoc(doc(db, 'users/trainerA'), { uid: 'trainerA', role: 'trainer', email: 'ta@x.com' })
    await setDoc(doc(db, 'users/traineeA'), { uid: 'traineeA', role: 'user', email: 'pa@x.com' })

    // Existing draft owned by admin1 (status transitions are CF-only)
    await setDoc(doc(db, 'exerciseDrafts/draft1'), {
      createdBy: 'admin1',
      status: 'pending',
      input: { name: 'לחיצת חזה' },
    })
  })
})

const as = (uid: string) => testEnv.authenticatedContext(uid).firestore()

describe('exerciseDrafts — create', () => {
  it('positive: admin creates a draft with createdBy == own uid', async () => {
    await assertSucceeds(
      setDoc(doc(as('admin1'), 'exerciseDrafts/draftNew'), {
        createdBy: 'admin1',
        status: 'pending',
        input: { name: 'סקוואט' },
      })
    )
  })

  it('exploit: regular user cannot create a draft', async () => {
    await assertFails(
      setDoc(doc(as('traineeA'), 'exerciseDrafts/draftU'), {
        createdBy: 'traineeA',
        status: 'pending',
        input: { name: 'x' },
      })
    )
  })

  it('exploit: trainer cannot create a draft', async () => {
    await assertFails(
      setDoc(doc(as('trainerA'), 'exerciseDrafts/draftT'), {
        createdBy: 'trainerA',
        status: 'pending',
        input: { name: 'x' },
      })
    )
  })

  it('exploit: admin cannot forge createdBy to another uid', async () => {
    await assertFails(
      setDoc(doc(as('admin1'), 'exerciseDrafts/draftF'), {
        createdBy: 'admin2',
        status: 'pending',
        input: { name: 'x' },
      })
    )
  })
})

describe('exerciseDrafts — read', () => {
  it('positive: owning admin reads own draft', async () => {
    await assertSucceeds(getDoc(doc(as('admin1'), 'exerciseDrafts/draft1')))
  })

  it('exploit: a different admin cannot read a draft they did not create', async () => {
    await assertFails(getDoc(doc(as('admin2'), 'exerciseDrafts/draft1')))
  })

  it('exploit: regular user cannot read a draft', async () => {
    await assertFails(getDoc(doc(as('traineeA'), 'exerciseDrafts/draft1')))
  })
})

describe('exerciseDrafts — update/delete are CF-only', () => {
  it('exploit: owning admin cannot update a draft directly', async () => {
    await assertFails(updateDoc(doc(as('admin1'), 'exerciseDrafts/draft1'), { status: 'saved' }))
  })

  it('exploit: owning admin cannot delete a draft directly', async () => {
    await assertFails(deleteDoc(doc(as('admin1'), 'exerciseDrafts/draft1')))
  })
})

describe('quota collections — no client access', () => {
  it('exploit: admin cannot write aiDraftUsage directly', async () => {
    await assertFails(setDoc(doc(as('admin1'), 'aiDraftUsage/admin1_2026-09-18'), { count: 0 }))
  })

  it('exploit: admin cannot write aiImageUsage directly', async () => {
    await assertFails(setDoc(doc(as('admin1'), 'aiImageUsage/admin1_2026-09-18'), { count: 0 }))
  })
})

describe('storage — machine-photos & exercise-images', () => {
  const bytes = 'data:image/jpeg;base64,/9j/4AAQSkZJRg=='
  const storageAs = (uid: string) => testEnv.authenticatedContext(uid).storage()

  it('positive: admin writes a machine photo', async () => {
    await assertSucceeds(
      uploadString(ref(storageAs('admin1'), 'machine-photos/m1.jpg'), bytes, 'data_url')
    )
  })

  it('exploit: trainer cannot write a machine photo', async () => {
    await assertFails(
      uploadString(ref(storageAs('trainerA'), 'machine-photos/m2.jpg'), bytes, 'data_url')
    )
  })

  it('exploit: regular user cannot write a machine photo', async () => {
    await assertFails(
      uploadString(ref(storageAs('traineeA'), 'machine-photos/m3.jpg'), bytes, 'data_url')
    )
  })

  it('exploit: even admin cannot client-write exercise-images (Admin SDK only)', async () => {
    await assertFails(
      uploadString(ref(storageAs('admin1'), 'exercise-images/bench-press.webp'), bytes, 'data_url')
    )
    await assertFails(
      uploadString(
        ref(storageAs('admin1'), 'exercise-images/work/bench-press/start.png'),
        bytes,
        'data_url'
      )
    )
  })
})
