# Diagnostic Logs — Setup & Operation

A lightweight diagnostic-logging pipeline for production-bug investigation.
Writes structured events to Firestore (`diagnosticLogs` collection) for **any**
authenticated user, gated by a global kill switch. Companion admin UI lives at
`/admin/diagnose` with an email-based subject lookup.

---

## How it works

- The actor's `auth.currentUser.uid` is read on every instrumented call. If
  there is no authenticated user, `logDiagnostic()` returns immediately.
- A global kill switch — `settings/app.diagnosticLogsEnabled` — controls
  whether writes happen at all. Behavior:
  - **Cold start (first call after page load)**: treated as **enabled**
    (fail-open). The first call writes; the cache loads in the background.
  - **Field absent in `settings/app`**: treated as **enabled** (same fail-open
    rationale). A fresh deploy keeps observability before the field is added.
  - **Field === `false`**: subsequent writes are dropped (with bounded
    staleness — see below).
  - **`getDoc` rejection**: the previously cached value is preserved (does
    not silently flip to "enabled" on a Firestore outage).
- The kill-switch value is cached in-memory for **60 seconds**. After an
  admin flips the switch, in-flight tabs may continue writing for up to 60s
  before refreshing — by design, to avoid a per-call `getDoc`.
- Writes are **fire-and-forget**: the call site never awaits, and any
  rejection is swallowed with `console.warn`.
- `sessionId` is stored in `sessionStorage` (not localStorage) so it resets on
  every tab close / refresh. This keeps Session Replay bounded to a single
  browsing session.
- Each document carries `expiresAt = now + 30 days` for Firestore TTL deletion.

---

## Activating / deactivating logging

There is no longer a hardcoded debug uid. To enable or disable logging
globally, edit the document at `settings/app` in the Firebase Console:

| Field | Value | Effect |
|---|---|---|
| `diagnosticLogsEnabled` | `true` | All authenticated users produce logs (also the default if the field is absent). |
| `diagnosticLogsEnabled` | `false` | Writes are dropped at the call site. Existing logs remain until TTL expires them. |
| field absent | — | Treated as `true` (fail-open). |

After flipping the field, expect up to 60 seconds of staleness per active tab
before the change takes effect.

---

## Investigating a specific user

1. Sign in to `/admin/diagnose` as an admin.
2. Type the user's email into the lookup field at the top, press **חפש**.
3. The console resolves the email to a UID and loads the three tabs (Logs
   Timeline, Workout Inspector, Session Replay) for that user.
4. To switch to another user, press **נקה בחירה** and search again.

If the lookup returns multiple records for one email (a known data-quality
case), the console surfaces a "נמצאו N רשומות" error with the conflicting
UIDs and refuses to auto-select. Resolve the duplication via a separate
maintenance flow before continuing.

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
`sessionId`, `timestamp`, `expiresAt` (timestamp + 30d), `workoutId`,
`stackTrace` (8 lines, with the service frames filtered out), `userAgent`,
and `url`.

---

## Known limitations

**Events from `useActiveWorkout.ts` are not captured.** That file is off-limits
per the iron rule, so the following events are not currently logged: workout
init from the hook, exit/abandon flows, recovery-loaded (after
`getInProgressWorkout` returns), and the `gymiq_firebase_workout_id`
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

### 2. Add the kill-switch field to `settings/app`

In the Firebase Console:

1. Open **Firestore Database → Data → settings → app**.
2. Add a field: `diagnosticLogsEnabled` (boolean) = `true`.
3. Save.

The field is optional — code defaults to enabled when absent — but creating
it explicitly is recommended so that flipping to `false` in an incident is
trivial. Do this **after** the first deploy that ships this code.

### 3. Configure TTL on the `diagnosticLogs.expiresAt` field

To prevent unbounded growth, configure Firestore TTL to expire documents
based on their `expiresAt` field. The writer sets `expiresAt = now + 30 days`
on every document.

1. Open the Firebase Console for this project.
2. Navigate to **Firestore Database → Time-to-live**.
3. Click **Create policy** (or **Edit** if a previous policy exists on the
   `timestamp` field — replace it with the configuration below).
4. Collection group: `diagnosticLogs`.
5. Timestamp field: `expiresAt`.
6. Save. Firestore will start deleting expired documents within 24 hours.

> **Migration note**: pre-existing documents written by the original
> single-user implementation do not have an `expiresAt` field and will not
> be deleted by this policy. They can be purged manually if needed; otherwise
> they will remain forever (volume is small — a single debug user, at most a
> few thousand docs).

> **Idempotency warning**: if the policy is deleted or the field name is
> changed, logs will accumulate without bound. Re-create the policy any time
> the schema is altered.

---

## Verifying it works

After deploying:

1. Sign in as any authenticated user.
2. Perform any workout flow (start a workout, autosave, complete, etc).
3. In the Firebase Console, open `diagnosticLogs` and confirm new documents
   appear with the expected `eventType` and a `userId` that matches the actor.
4. Set `settings/app.diagnosticLogsEnabled = false`. Wait at least 60 seconds
   (cache TTL) and confirm new actions stop producing documents.
5. Set the field back to `true` to resume.

---

## Performance notes

- An unauthenticated session pays only the cost of a `null` check and an early
  `return`.
- For an authenticated user with the kill switch enabled, each
  `logDiagnostic()` call queues one `addDoc`. The call returns synchronously;
  the network round-trip happens in the background. A failed write logs a
  warning to the console and does nothing else — no impact on the host flow.
- The kill-switch read uses a single `getDoc` per 60-second window per tab,
  triggered lazily on the first call after the cache becomes stale. The
  refresh runs in the background and never blocks a `logDiagnostic` call.
- `stackTrace` is capped at 8 lines (~640 bytes). Total per-document size
  stays well under the 1 MB Firestore limit even for sessions with hundreds
  of events.
