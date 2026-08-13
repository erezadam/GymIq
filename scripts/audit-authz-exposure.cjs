/**
 * READ-ONLY audit for Phase 0.1 — has any authz gap already been exploited?
 * Uses Firebase Admin SDK with Application Default Credentials.
 *
 * First run:  gcloud auth application-default login
 * Then:       node scripts/audit-authz-exposure.cjs
 *
 * This script NEVER writes or deletes anything. It only reads and prints counts.
 */

const admin = require('firebase-admin')
admin.initializeApp({ projectId: 'gymiq-e8b4e' })
const db = admin.firestore()

async function main() {
  console.log('=== Phase 0.1 — authz exposure audit (READ ONLY) ===\n')

  // 1) Non-default roles on users
  const users = await db.collection('users').get()
  const byRole = {}
  const privileged = []
  users.forEach((d) => {
    const r = d.data().role || 'user'
    byRole[r] = (byRole[r] || 0) + 1
    if (r !== 'user') privileged.push({ uid: d.id, role: r, email: d.data().email })
  })
  console.log('1) users role distribution:', byRole)
  console.log('   privileged (non-user) accounts:')
  privileged.forEach((p) => console.log(`     - ${p.role.padEnd(8)} ${p.email || '(no email)'} [${p.uid}]`))
  console.log(`   → expected: exactly 1 legit admin. Found ${byRole.admin || 0} admin, ${byRole.trainer || 0} trainer.\n`)

  // Build a trainer set + active relationship map for later checks
  const rels = await db.collection('trainerRelationships').get()
  const activePair = new Set() // `${trainerId}:${traineeId}` with status active/paused
  const traineeApprovedTrainer = new Map() // traineeId -> Set(trainerId) approved
  rels.forEach((d) => {
    const x = d.data()
    if (['active', 'paused'].includes(x.status)) {
      activePair.add(`${x.trainerId}:${x.traineeId}`)
      if (!traineeApprovedTrainer.has(x.traineeId)) traineeApprovedTrainer.set(x.traineeId, new Set())
      traineeApprovedTrainer.get(x.traineeId).add(x.trainerId)
    }
  })

  // 2) workoutHistory / workoutSessions whose userId != creator (reportedBy present but mismatched)
  for (const col of ['workoutHistory', 'workoutSessions']) {
    const snap = await db.collection(col).get()
    let mismatched = 0
    const examples = []
    snap.forEach((d) => {
      const x = d.data()
      // A trainer-reported doc is legit if reportedBy is that trainee's approved trainer.
      if (x.reportedBy && x.userId && x.reportedBy !== x.userId) {
        const ok = traineeApprovedTrainer.get(x.userId)?.has(x.reportedBy)
        if (!ok) {
          mismatched++
          if (examples.length < 5) examples.push({ id: d.id, userId: x.userId, reportedBy: x.reportedBy })
        }
      }
    })
    console.log(`2) ${col}: docs=${snap.size}, reportedBy→userId with NO approved relationship: ${mismatched}`)
    examples.forEach((e) => console.log(`     - ${e.id} userId=${e.userId} reportedBy=${e.reportedBy}`))
    console.log('')
  }

  // 3) trainingPrograms / trainerMessages pointing at a traineeId with no approved relationship
  for (const col of ['trainingPrograms', 'trainerMessages']) {
    const snap = await db.collection(col).get()
    let orphan = 0
    const examples = []
    snap.forEach((d) => {
      const x = d.data()
      if (!x.trainerId || !x.traineeId) return
      // Self-built standalone trainee workouts are legit (trainer==trainee or createdByTrainee)
      if (x.createdByTrainee === true || x.trainerId === x.traineeId) return
      if (!activePair.has(`${x.trainerId}:${x.traineeId}`)) {
        orphan++
        if (examples.length < 5) examples.push({ id: d.id, trainerId: x.trainerId, traineeId: x.traineeId })
      }
    })
    console.log(`3) ${col}: docs=${snap.size}, trainer→trainee with NO active relationship: ${orphan}`)
    examples.forEach((e) => console.log(`     - ${e.id} trainer=${e.trainerId} trainee=${e.traineeId}`))
    console.log('')
  }

  // 4) users with trainerId that has no matching approved relationship
  let ghostLink = 0
  const ghostExamples = []
  users.forEach((d) => {
    const x = d.data()
    if (x.trainerId) {
      const ok = traineeApprovedTrainer.get(d.id)?.has(x.trainerId)
      if (!ok) {
        ghostLink++
        if (ghostExamples.length < 10) ghostExamples.push({ uid: d.id, email: x.email, trainerId: x.trainerId })
      }
    }
  })
  console.log(`4) users.trainerId with NO approved trainerRelationships: ${ghostLink}`)
  ghostExamples.forEach((e) => console.log(`     - ${e.email || e.uid} trainerId=${e.trainerId}`))

  console.log('\n=== done (nothing was written) ===')
  process.exit(0)
}

main().catch((e) => {
  console.error('audit failed:', e.message || e)
  process.exit(1)
})
