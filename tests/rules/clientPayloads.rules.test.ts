/**
 * COMPATIBILITY gate — real client payloads vs the new rules.
 *
 * Unlike authz.rules.test.ts (hand-written attack/allow payloads), every write
 * here is reconstructed 1:1 from an actual client call-site, so a rule that is
 * stricter than the shipped client shows up as a red test BEFORE it breaks
 * production. Each case cites the source file:line it mirrors.
 *
 * Run via:  npm run test:rules
 */
import { readFileSync } from 'fs'
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { doc, setDoc, updateDoc, addDoc, getDoc, collection, serverTimestamp, Timestamp } from 'firebase/firestore'
import { beforeAll, afterAll, beforeEach, describe, it } from 'vitest'

const PROJECT_ID = 'gymiq-rules-test'
const FIRESTORE_RULES = process.env.RULES_FILE || 'firestore.rules'
const STORAGE_RULES = process.env.STORAGE_RULES_FILE || 'storage.rules'

function hp(v: string | undefined, d: number) {
  if (!v) return { host: '127.0.0.1', port: d }
  const [host, port] = v.replace(/^https?:\/\//, '').split(':')
  return { host, port: Number(port) }
}

let testEnv: RulesTestEnvironment

beforeAll(async () => {
  const fs = hp(process.env.FIRESTORE_EMULATOR_HOST, 8080)
  const st = hp(process.env.FIREBASE_STORAGE_EMULATOR_HOST, 9199)
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: readFileSync(FIRESTORE_RULES, 'utf8'), host: fs.host, port: fs.port },
    storage: { rules: readFileSync(STORAGE_RULES, 'utf8'), host: st.host, port: st.port },
  })
})
afterAll(async () => { await testEnv?.cleanup() })

beforeEach(async () => {
  await testEnv.clearFirestore()
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore()
    await setDoc(doc(db, 'users/trainerA'), { uid: 'trainerA', role: 'trainer', email: 'ta@x.com', displayName: 'Trainer A' })
    await setDoc(doc(db, 'users/trainerB'), { uid: 'trainerB', role: 'trainer', email: 'tb@x.com' })
    await setDoc(doc(db, 'users/traineeA'), { uid: 'traineeA', role: 'user', email: 'pa@x.com', displayName: 'P A', trainerId: 'trainerA' })
    await setDoc(doc(db, 'users/traineeB'), { uid: 'traineeB', role: 'user', email: 'pb@x.com', trainerId: null })
    await setDoc(doc(db, 'users/traineeC'), { uid: 'traineeC', role: 'user', email: 'pc@x.com', trainerId: null })

    await setDoc(doc(db, 'workoutHistory/wOwn'), { userId: 'traineeA', status: 'in_progress', exercises: [] })
    await setDoc(doc(db, 'workoutHistory/wRep'), { userId: 'traineeA', reportedBy: 'trainerA', reportedByName: 'Trainer A', exercises: [], status: 'completed' })
    await setDoc(doc(db, 'workoutHistory/wC'), { userId: 'traineeC', status: 'completed', exercises: [] })
    await setDoc(doc(db, 'trainerMessages/msgA'), { trainerId: 'trainerA', traineeId: 'traineeA', text: 'hi', isRead: false, replies: [] })
    await setDoc(doc(db, 'trainerRelationships/relA'), { trainerId: 'trainerA', traineeId: 'traineeA', status: 'active' })
    await setDoc(doc(db, 'trainerRelationships/relPend'), { trainerId: 'trainerA', traineeId: 'traineeB', status: 'pending', requestedBy: 'trainee' })
    await setDoc(doc(db, 'workoutTemplates/tplA'), { createdBy: 'trainerA', isPublic: false, name: 'T' })
  })
})

const as = (uid: string) => testEnv.authenticatedContext(uid).firestore()

describe('users — real self-update payloads', () => {
  it('registerUser create (auth.ts:116) — role:user', async () => {
    await assertSucceeds(setDoc(doc(as('newT'), 'users/newT'), {
      uid: 'newT', email: 'n@x.com', displayName: 'N N', firstName: 'N', lastName: 'N',
      role: 'user', createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      lastSeenReleaseNotesAt: serverTimestamp(), trainerId: null,
    }))
  })

  it('ProfilePage updateProfile (ProfilePage.tsx:82, setDoc merge)', async () => {
    await assertSucceeds(setDoc(doc(as('traineeA'), 'users/traineeA'), {
      firstName: 'Dan', lastName: 'Levi', displayName: 'Dan Levi', city: 'TLV',
      age: 30, height: 180, weight: 80, bodyFatPercentage: 18,
      trainingGoals: ['strength'], injuriesOrLimitations: 'none', updatedAt: serverTimestamp(),
    }, { merge: true }))
  })

  it('markReleaseNotesAsSeen (users.ts:60)', async () => {
    await assertSucceeds(updateDoc(doc(as('traineeA'), 'users/traineeA'), {
      lastSeenReleaseNotesAt: serverTimestamp(), updatedAt: serverTimestamp(),
    }))
  })

  it('disconnectTrainee self-clear trainerId (trainerService.ts:314, merge)', async () => {
    await assertSucceeds(setDoc(doc(as('traineeA'), 'users/traineeA'), {
      trainerId: null, updatedAt: serverTimestamp(),
    }, { merge: true }))
  })

  it('trainer edits trainee profile (trainerService.ts:432)', async () => {
    await assertSucceeds(setDoc(doc(as('trainerA'), 'users/traineeA'), {
      firstName: 'New', displayName: 'New Name', age: 33, photoURL: 'https://x/y.jpg', updatedAt: serverTimestamp(),
    }, { merge: true }))
  })
})

describe('trainingPrograms — real payloads', () => {
  it('createSelfStandaloneProgram, linked trainee (programService.ts:120)', async () => {
    await assertSucceeds(setDoc(doc(collection(as('traineeA'), 'trainingPrograms')), {
      trainerId: 'trainerA', traineeId: 'traineeA', originalTrainerId: 'trainerA', name: 'W',
      type: 'standalone', status: 'active', isModifiedByTrainee: false, createdByTrainee: true,
      weeklyStructure: [{ dayLabel: 'W', name: 'W', restDay: false, exercises: [] }],
      startDate: Timestamp.fromDate(new Date(2020, 0, 1)), currentWeek: 1,
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    }))
  })

  it('createSelfStandaloneProgram, independent user with empty trainerId', async () => {
    await assertSucceeds(setDoc(doc(collection(as('traineeB'), 'trainingPrograms')), {
      trainerId: '', traineeId: 'traineeB', originalTrainerId: '', name: 'W',
      type: 'standalone', status: 'active', isModifiedByTrainee: false, createdByTrainee: true,
      weeklyStructure: [{ dayLabel: 'W', name: 'W', restDay: false, exercises: [] }],
      startDate: Timestamp.fromDate(new Date(2020, 0, 1)), currentWeek: 1,
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    }))
  })

  it('trainer createProgram for own trainee (programService.ts:56)', async () => {
    await assertSucceeds(setDoc(doc(collection(as('trainerA'), 'trainingPrograms')), {
      trainerId: 'trainerA', traineeId: 'traineeA', name: 'P', type: 'weekly', status: 'active',
      weeklyStructure: [], startDate: Timestamp.fromDate(new Date(2020, 0, 1)), currentWeek: 1,
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    }))
  })
})

describe('workoutHistory — real payloads', () => {
  it('autoSaveWorkout create, self (workoutHistory.ts:1537)', async () => {
    await assertSucceeds(setDoc(doc(collection(as('traineeA'), 'workoutHistory')), {
      userId: 'traineeA', status: 'in_progress', exercises: [], totalVolume: 0,
      lastUpdated: Timestamp.now(), createdAt: Timestamp.now(),
    }))
  })

  it('autoSaveWorkout update, self — userId re-sent unchanged (workoutHistory.ts:1524)', async () => {
    await assertSucceeds(updateDoc(doc(as('traineeA'), 'workoutHistory/wOwn'), {
      userId: 'traineeA', status: 'in_progress', totalVolume: 5, lastUpdated: Timestamp.now(),
    }))
  })

  it('updateWorkoutHistory rename+pin, self (workoutHistory.ts:1280)', async () => {
    await assertSucceeds(updateDoc(doc(as('traineeA'), 'workoutHistory/wOwn'), {
      name: 'Leg day', pinned: true,
    }))
  })

  it('trainer report create for own trainee (workoutHistory.ts:217)', async () => {
    await assertSucceeds(setDoc(doc(collection(as('trainerA'), 'workoutHistory')), {
      userId: 'traineeA', reportedBy: 'trainerA', reportedByName: 'Trainer A',
      status: 'completed', exercises: [], createdAt: Timestamp.now(),
    }))
  })

  it('trainer edits trainee workout — lastEditedByTrainer, userId/reportedBy untouched (workoutHistory.ts:2322)', async () => {
    await assertSucceeds(updateDoc(doc(as('trainerA'), 'workoutHistory/wRep'), {
      exercises: [{ exerciseId: 'e1' }], totalVolume: 10,
      lastEditedByTrainer: { trainerId: 'trainerA', trainerName: 'Trainer A', editedAt: serverTimestamp(), editSummary: 's' },
    }))
  })
})

describe('trainerMessages & relationships — real payloads', () => {
  it('sendMessage to own trainee (messageService.ts:46)', async () => {
    await assertSucceeds(addDoc(collection(as('trainerA'), 'trainerMessages'), {
      trainerId: 'trainerA', traineeId: 'traineeA', text: 'hey', isRead: false,
      createdAt: serverTimestamp(), replies: [],
    }))
  })

  it('markAsRead by trainee (messageService.ts:105)', async () => {
    await assertSucceeds(updateDoc(doc(as('traineeA'), 'trainerMessages/msgA'), {
      isRead: true, readAt: serverTimestamp(),
    }))
  })

  it('addReply by trainee (messageService.ts:134)', async () => {
    await assertSucceeds(updateDoc(doc(as('traineeA'), 'trainerMessages/msgA'), {
      replies: [{ senderId: 'traineeA', senderName: 'P A', senderRole: 'user', body: 'ok' }],
    }))
  })

  it('endRelationship (trainerService.ts:294)', async () => {
    await assertSucceeds(updateDoc(doc(as('trainerA'), 'trainerRelationships/relA'), {
      status: 'ended', endedAt: serverTimestamp(), endedBy: 'trainer', endReason: '', updatedAt: serverTimestamp(),
    }))
  })

  it('pauseRelationship (trainerService.ts:320)', async () => {
    await assertSucceeds(updateDoc(doc(as('trainerA'), 'trainerRelationships/relA'), {
      status: 'paused', updatedAt: serverTimestamp(),
    }))
  })

  it('rejectTrainerRequest (trainerService.ts:130)', async () => {
    await assertSucceeds(updateDoc(doc(as('trainerA'), 'trainerRelationships/relPend'), {
      status: 'rejected', respondedAt: serverTimestamp(), updatedAt: serverTimestamp(), rejectionReason: 'no',
    }))
  })

  it('cancelTrainerRequest by trainee (trainerService.ts:154)', async () => {
    await assertSucceeds(updateDoc(doc(as('traineeB'), 'trainerRelationships/relPend'), {
      status: 'cancelled', respondedAt: serverTimestamp(), updatedAt: serverTimestamp(),
    }))
  })
})

describe('workoutTemplates — real payloads', () => {
  it('create template by trainer (workouts.ts:219)', async () => {
    await assertSucceeds(addDoc(collection(as('trainerA'), 'workoutTemplates'), {
      createdBy: 'trainerA', isPublic: false, name: 'Tpl', createdAt: serverTimestamp(),
    }))
  })
})

describe('End-to-end trainer↔trainee connection flow', () => {
  it('request → (CF approve) → trainer access → disconnect revokes access', async () => {
    // 1) Trainee requests a trainer (createRelationship trainee-initiated).
    await assertSucceeds(setDoc(doc(as('traineeC'), 'trainerRelationships/relReqC'), {
      trainerId: 'trainerA', traineeId: 'traineeC', status: 'pending', requestedBy: 'trainee',
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    }))

    // 2) The client CANNOT self-link to the trainer (must go through the CF).
    await assertFails(setDoc(doc(as('traineeC'), 'users/traineeC'), { trainerId: 'trainerA' }, { merge: true }))

    // 3) Approval is the CF (Admin SDK) — simulate it with rules disabled.
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore()
      await setDoc(doc(db, 'users/traineeC'), { trainerId: 'trainerA' }, { merge: true })
      await updateDoc(doc(db, 'trainerRelationships/relReqC'), { status: 'active' })
    })

    // 4) Now the linked trainer can read the trainee's history; an unrelated one cannot.
    await assertSucceeds(getDoc(doc(as('trainerA'), 'workoutHistory/wC')))
    await assertFails(getDoc(doc(as('trainerB'), 'workoutHistory/wC')))

    // 5) The trainer can now create a program + message for the trainee (isMyTrainee true).
    await assertSucceeds(setDoc(doc(collection(as('trainerA'), 'trainingPrograms')), {
      trainerId: 'trainerA', traineeId: 'traineeC', name: 'P', type: 'weekly', status: 'active',
      weeklyStructure: [], startDate: Timestamp.fromDate(new Date(2020, 0, 1)), currentWeek: 1,
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    }))

    // 6) Disconnect clears trainerId; the trainer then loses create access.
    await assertSucceeds(setDoc(doc(as('trainerA'), 'users/traineeC'), { trainerId: null, updatedAt: serverTimestamp() }, { merge: true }))
    await assertFails(setDoc(doc(collection(as('trainerA'), 'trainingPrograms')), {
      trainerId: 'trainerA', traineeId: 'traineeC', name: 'P2', type: 'weekly', status: 'active',
      weeklyStructure: [], startDate: Timestamp.fromDate(new Date(2020, 0, 1)), currentWeek: 1,
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    }))
  })
})
