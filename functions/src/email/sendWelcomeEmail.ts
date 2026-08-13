/**
 * Send Welcome Email - Cloud Function
 * Sends a branded welcome email to a trainee with an app link and a password
 * setup (reset) link.
 *
 * SECURITY MODEL (hardened 2026-08-13):
 * - Authentication is required. Unauthenticated calls are rejected before any
 *   side effect (Auth lookup, reset-link generation, email send).
 * - Authorization: the caller may only trigger the email for the trainee's own
 *   account, for a trainee they are the (server-recorded) trainer of, or as an
 *   admin. The caller does NOT choose the recipient by free text.
 * - The recipient address, recipient name, and trainer name are all derived
 *   server-side from the `users/{traineeId}` record + the caller record. No
 *   caller-supplied string reaches Firebase Auth or the email body.
 * - Per-target and per-caller daily rate limits protect against inbox bombing
 *   and Resend quota exhaustion.
 * - Every rejected call is written to the audit log (functions.logger.warn).
 */

import * as admin from 'firebase-admin'
import * as functions from 'firebase-functions'
import { onCall, HttpsError } from 'firebase-functions/v2/https'

interface WelcomeEmailRequest {
  // Only the trainee's record id is accepted. The recipient/email/names are all
  // resolved server-side from Firestore + Auth — never from the caller.
  traineeId: string
}

// Daily caps. Per-target guards a single inbox; per-caller guards Resend quota.
const PER_TARGET_DAILY_LIMIT = 3
const PER_CALLER_DAILY_LIMIT = 50
const USAGE_COLLECTION = 'welcomeEmailUsage'

function todayString(): string {
  return new Date().toISOString().split('T')[0]
}

/**
 * Atomically increments a daily counter and returns whether it is still within
 * `limit`. Written via Admin SDK only (collection is deny-all in rules).
 */
async function underLimit(scope: string, id: string, limit: number): Promise<boolean> {
  const db = admin.firestore()
  const ref = db.collection(USAGE_COLLECTION).doc(`${scope}_${id}_${todayString()}`)
  try {
    const count = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref)
      const current = (snap.exists && snap.data()?.count) || 0
      tx.set(
        ref,
        {
          scope,
          count: admin.firestore.FieldValue.increment(1),
          lastAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      )
      return current + 1
    })
    return count <= limit
  } catch (error: any) {
    // Fail closed on the limiter: a counter we cannot read must not become an
    // unlimited relay. (Contrast with the AI limiter which fails open by design.)
    functions.logger.error('welcomeEmail rate-limit check failed', {
      scope,
      id,
      error: error?.message,
    })
    return false
  }
}

function buildWelcomeEmailHtml(
  traineeName: string,
  trainerName: string,
  passwordResetLink: string
): string {
  return `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>הגדרת סיסמה - GymIQ</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,Helvetica,sans-serif;direction:rtl">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f4f4;padding:40px 20px">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;max-width:600px;width:100%">

          <!-- Header -->
          <tr>
            <td style="background-color:#00D4AA;padding:30px;text-align:center">
              <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:bold">
                GymIQ
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 30px">
              <p style="color:#333333;font-size:18px;line-height:1.8;margin:0 0 24px;text-align:right">
                ${traineeName} יקר/ה,
              </p>

              <p style="color:#333333;font-size:16px;line-height:1.8;margin:0 0 8px;text-align:right">
                המאמן <strong>${trainerName}</strong> יצר עבורך חשבון באפליקציית GymIQ.
              </p>

              <p style="color:#333333;font-size:16px;line-height:1.8;margin:0 0 32px;text-align:right">
                יש ללחוץ על הכפתור הבא על מנת ליצור לעצמך סיסמה חדשה:
              </p>

              <!-- Password Setup Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:32px">
                <tr>
                  <td align="center">
                    <a href="${passwordResetLink}"
                       style="display:inline-block;background-color:#00D4AA;color:#ffffff;text-decoration:none;padding:16px 48px;border-radius:8px;font-size:18px;font-weight:bold;text-align:center">
                      יצירת סיסמה
                    </a>
                  </td>
                </tr>
              </table>

              <p style="color:#666666;font-size:14px;line-height:1.8;margin:0 0 24px;text-align:right">
                לאחר יצירת הסיסמה, היכנס לאפליקציה בכתובת:
                <a href="https://gymiq.web.app" style="color:#00D4AA;text-decoration:underline">gymiq.web.app</a>
              </p>

              <p style="color:#999999;font-size:13px;line-height:1.6;margin:0;text-align:right">
                אם לא ביקשת ליצור חשבון, ניתן להתעלם מהודעה זו.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f9f9f9;padding:20px 30px;text-align:center;border-top:1px solid #eeeeee">
              <p style="color:#999999;font-size:13px;margin:0">
                © ${new Date().getFullYear()} GymIQ | gymiq.co.il
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function buildWelcomeEmailText(
  traineeName: string,
  trainerName: string,
  passwordResetLink: string
): string {
  return `${traineeName} יקר/ה,

המאמן ${trainerName} יצר עבורך חשבון באפליקציית GymIQ.

יש ללחוץ על הקישור הבא על מנת ליצור לעצמך סיסמה חדשה:
${passwordResetLink}

לאחר יצירת הסיסמה, היכנס לאפליקציה בכתובת:
https://gymiq.web.app

אם לא ביקשת ליצור חשבון, ניתן להתעלם מהודעה זו.

© ${new Date().getFullYear()} GymIQ | gymiq.co.il`
}

/** Resolve a human display name from a user document. */
function displayNameFromDoc(data: FirebaseFirestore.DocumentData | undefined, fallback: string): string {
  if (!data) return fallback
  const name =
    data.displayName ||
    [data.firstName, data.lastName].filter(Boolean).join(' ').trim()
  return name || fallback
}

export const sendWelcomeEmail = onCall(
  {
    secrets: ['RESEND_API_KEY'],
    timeoutSeconds: 30,
    memory: '256MiB',
  },
  async (request) => {
    // 1) Authentication — no side effect happens before this.
    if (!request.auth) {
      functions.logger.warn('sendWelcomeEmail rejected: unauthenticated')
      throw new HttpsError('unauthenticated', 'Authentication required')
    }
    const callerUid = request.auth.uid

    const traineeId = (request.data as WelcomeEmailRequest)?.traineeId
    if (!traineeId || typeof traineeId !== 'string') {
      functions.logger.warn('sendWelcomeEmail rejected: missing traineeId', { callerUid })
      throw new HttpsError('invalid-argument', 'Missing required field: traineeId')
    }

    const db = admin.firestore()

    // 2) Load the trainee record — the single source of truth for the recipient.
    const traineeSnap = await db.collection('users').doc(traineeId).get()
    if (!traineeSnap.exists) {
      functions.logger.warn('sendWelcomeEmail rejected: trainee not found', { callerUid, traineeId })
      throw new HttpsError('permission-denied', 'Not authorized')
    }
    const traineeData = traineeSnap.data() as FirebaseFirestore.DocumentData

    // 3) Authorization: self, the trainee's recorded trainer, or an admin.
    let authorized = callerUid === traineeId
    if (!authorized) {
      const callerSnap = await db.collection('users').doc(callerUid).get()
      const callerRole = callerSnap.data()?.role
      const isAdmin = callerRole === 'admin'
      const isRecordedTrainer =
        (callerRole === 'trainer' || callerRole === 'admin') &&
        traineeData.trainerId === callerUid
      authorized = isAdmin || isRecordedTrainer
    }
    if (!authorized) {
      functions.logger.warn('sendWelcomeEmail rejected: caller not authorized for target', {
        callerUid,
        traineeId,
      })
      throw new HttpsError('permission-denied', 'Not authorized')
    }

    // 4) Rate limit (per target + per caller). Increments happen here, after
    //    authorization, so an unauthorized caller can't burn a victim's quota.
    const targetOk = await underLimit('target', traineeId, PER_TARGET_DAILY_LIMIT)
    const callerOk = await underLimit('caller', callerUid, PER_CALLER_DAILY_LIMIT)
    if (!targetOk || !callerOk) {
      functions.logger.warn('sendWelcomeEmail rejected: rate limited', {
        callerUid,
        traineeId,
        targetOk,
        callerOk,
      })
      throw new HttpsError('resource-exhausted', 'Too many requests, try again later')
    }

    // 5) Derive recipient email server-side. Prefer the Auth record (the address
    //    the reset link is actually bound to); fall back to the user doc.
    let recipientEmail: string | undefined = traineeData.email
    try {
      const authUser = await admin.auth().getUser(traineeId)
      recipientEmail = authUser.email || recipientEmail
    } catch (error) {
      functions.logger.warn('sendWelcomeEmail: auth user lookup failed, using doc email', {
        traineeId,
      })
    }
    if (!recipientEmail) {
      functions.logger.warn('sendWelcomeEmail rejected: no email on record', { callerUid, traineeId })
      throw new HttpsError('failed-precondition', 'Trainee has no email on record')
    }

    // Names derived server-side — no caller free text enters the email body.
    const traineeName = displayNameFromDoc(traineeData, 'מתאמן/ת')
    let trainerName = 'המאמן שלך'
    if (callerUid !== traineeId) {
      const callerSnap = await db.collection('users').doc(callerUid).get()
      trainerName = displayNameFromDoc(callerSnap.data(), 'המאמן שלך')
    }

    // 6) Generate password reset link (Admin SDK) for the derived address.
    let passwordResetLink: string
    try {
      passwordResetLink = await admin.auth().generatePasswordResetLink(recipientEmail)
    } catch (error) {
      functions.logger.error('Failed to generate password reset link', { traineeId })
      throw new HttpsError('internal', 'Failed to generate password reset link')
    }

    const html = buildWelcomeEmailHtml(traineeName, trainerName, passwordResetLink)
    const text = buildWelcomeEmailText(traineeName, trainerName, passwordResetLink)

    const resendApiKey = process.env.RESEND_API_KEY
    if (!resendApiKey) {
      throw new HttpsError('internal', 'RESEND_API_KEY is not configured')
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'GymIQ <onboarding@gymiq.co.il>',
          to: recipientEmail,
          subject: `הגדרת סיסמה - GymIQ`,
          html,
          text,
        }),
      })

      if (!response.ok) {
        const errorBody = await response.text()
        functions.logger.error('Resend API error', { status: response.status, errorBody })
        throw new HttpsError('internal', 'Failed to send welcome email')
      }

      return { success: true }
    } catch (error) {
      if (error instanceof HttpsError) throw error
      functions.logger.error('Failed to send welcome email', { traineeId })
      throw new HttpsError('internal', 'Failed to send welcome email')
    }
  }
)
