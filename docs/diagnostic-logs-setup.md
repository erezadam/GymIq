# Diagnostic Logs — Setup & Operation

A lightweight diagnostic-logging pipeline for production-bug investigation.
Writes structured events to Firestore (`diagnosticLogs` collection) only for
one hardcoded debug user. Companion admin UI lives in a separate PR.

---

## How it works

- The actor's `auth.currentUser.uid` is compared to a single hardcoded constant
  (`DEBUG_USER_UID` in `src/lib/firebase/diagnosticLogs.ts`). For any other
  user, `logDiagnostic()` returns immediately — no Firestore reads, no writes,
  no allocations.
- For the debug user, every instrumented call site writes one document via
  `addDoc()` with a `serverTimestamp()`. Writes are **fire-and-forget**: the
  call site never awaits, and any rejection is swallowed with `console.warn`.
- `sessionId` is stored in `sessionStorage` (not localStorage) so it resets on
  every tab close / refresh. This keeps Session Replay (admin UI, separate PR)
  bounded to a single browsing session.

---

## Activating the debug user

Edit `src/lib/firebase/diagnosticLogs.ts`:

```ts
export const DEBUG_USER_UID = 'OHxRVH3RdUP8k7xQBuAa5ZXvfrI2'
```

Replace the value with the Firebase Auth uid you want to instrument, then
deploy. To disable logging entirely, change the value to an unreachable string
(e.g. `''`) and deploy. The constant is exported so the admin UI imports it —
do not duplicate the value elsewhere.

---

## Event types currently emitted

| eventType | source | payload |
|---|---|---|
| `WORKOUT_CREATED` | `workoutHistory.ts → saveWorkoutHistory` | `{ status, source, exerciseCount, hasProgramId, programId, isReportedByTrainer }` |
| `WORKOUT_AUTOSAVE` | `workoutHistory.ts → autoSaveWorkout` | `{ isUpdate, fieldsBeingWritten, status, exerciseCount, completedExerciseCount }` |
| `WORKOUT_COMPLETE` | `workoutHistory.ts → completeWorkout` | `{ exerciseCount, completedExerciseCount, status, duration }` |
| `SOFT_DELETE` | `workoutHistory.ts → softDeleteWorkout` | `{ reason }` |
| `WORKOUT_RECOVERY_FOUND` | `workoutHistory.ts → getInProgressWorkout` | `{ foundWorkoutId, foundCount, hasDeletedByTrainee, status }` |
| `WORKOUT_VALIDATION` | `workoutValidation.ts → validateWorkoutId` | `{ validationResult, reason, hasDeletedByTrainee, documentUserId, documentStatus }` |

Each document also carries: `userId` (actor uid), `workoutOwnerId`
(non-null only when actor ≠ workout owner, e.g. trainer→trainee flows),
`sessionId`, `timestamp`, `workoutId`, `stackTrace` (8 lines, with the service
frames filtered out), `userAgent`, and `url`.

---

## Known limitations

**Events from `useActiveWorkout.ts` are not captured in this PR.** That file
is off-limits per the iron rule, so the following events are not currently
logged: workout init from the hook, exit/abandon flows, recovery-loaded
(after `getInProgressWorkout` returns), and the `gymiq_firebase_workout_id`
localStorage save/clear lifecycle. Indirect evidence is available — for
example, a `WORKOUT_RECOVERY_FOUND` followed by a `WORKOUT_AUTOSAVE` with the
same `workoutId` implies the recovery was successfully loaded by the hook.

If the bug under investigation requires direct visibility into those events,
explicit approval will be requested before editing `useActiveWorkout.ts`.

---

## Firestore — manual setup steps

These steps must be run once in the Firebase Console. They are not
automated by the deploy pipeline.

### 1. Deploy rules and indexes

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

When the CLI prompts about deleting unrecognized indexes, **always answer
`N`**. Indexes for other collections must not be touched.

### 2. Configure TTL on the `diagnosticLogs` collection

To prevent unbounded growth, configure Firestore TTL to expire documents
based on their `timestamp` field after 7 days.

1. Open the Firebase Console for this project.
2. Navigate to **Firestore Database → Time-to-live**.
3. Click **Create policy**.
4. Collection group: `diagnosticLogs`.
5. Timestamp field: `timestamp`.
6. Save. Firestore will start deleting expired documents within 24 hours.

> **Idempotency warning**: if the policy is deleted or the field name is
> changed, logs will accumulate without bound. Re-create the policy any time
> the schema is altered.

---

## Verifying it works

After deploying:

1. Sign in as the user whose uid matches `DEBUG_USER_UID`.
2. Perform any workout flow (start a workout, autosave, complete, etc).
3. In the Firebase Console, open `diagnosticLogs` and confirm new documents
   appear with the expected `eventType`.
4. Sign in as a different user and repeat — no new documents should appear.

---

## Performance notes

- A user not matching `DEBUG_USER_UID` pays only the cost of one uid
  comparison and an early `return` — no `getDoc`, no `addDoc`, no allocations
  beyond the function call.
- For the debug user, each `logDiagnostic()` call queues one `addDoc`. The
  call returns synchronously; the network round-trip happens in the
  background. A failed write logs a warning to the console and does nothing
  else — no impact on the host flow.
- `stackTrace` is capped at 8 lines (~640 bytes). Total per-document size
  stays well under the 1 MB Firestore limit even for sessions with hundreds
  of events.
