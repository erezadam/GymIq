/**
 * Trainer Approval Flow — Email notifications.
 *
 * Three callables + one server-only helper, sharing the same Resend HTTP
 * pattern as sendWelcomeEmail.ts. Templates are inline (RTL Hebrew, brand
 * color #00D4AA). Email failures are converted to HttpsError so callers
 * can choose to fire-and-forget without blocking the user-facing action.
 */

import * as admin from 'firebase-admin'
import { onCall, HttpsError } from 'firebase-functions/v2/https'

const APP_BASE_URL = 'https://gymiq.co.il'
const FROM_ADDRESS = 'GymIQ <onboarding@gymiq.co.il>'

// ============ Shared Resend HTTP helper ============

interface SendEmailOptions {
  to: string
  subject: string
  html: string
  text: string
}

async function sendResendEmail({ to, subject, html, text }: SendEmailOptions): Promise<void> {
  const resendApiKey = process.env.RESEND_API_KEY
  if (!resendApiKey) {
    throw new HttpsError('internal', 'RESEND_API_KEY is not configured')
  }
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM_ADDRESS, to, subject, html, text }),
  })
  if (!response.ok) {
    const errorBody = await response.text()
    console.error('Resend API error:', response.status, errorBody)
    throw new HttpsError('internal', 'Failed to send email')
  }
}

// ============ Brand layout helper ============

function brandedShell(bodyInnerHtml: string): string {
  return `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,Helvetica,sans-serif;direction:rtl">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f4f4;padding:40px 20px">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;max-width:600px;width:100%">
          <tr>
            <td style="background-color:#00D4AA;padding:30px;text-align:center">
              <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:bold">GymIQ</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 30px">${bodyInnerHtml}</td>
          </tr>
          <tr>
            <td style="background-color:#f9f9f9;padding:20px 30px;text-align:center;border-top:1px solid #eeeeee">
              <p style="color:#999999;font-size:13px;margin:0">© ${new Date().getFullYear()} GymIQ | gymiq.co.il</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function ctaButton(label: string, href: string): string {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:8px 0 24px"><tr><td align="center">
    <a href="${href}" style="display:inline-block;background-color:#00D4AA;color:#ffffff;text-decoration:none;padding:16px 40px;border-radius:8px;font-size:16px;font-weight:bold">${label}</a>
  </td></tr></table>`
}

// ============ Template builders ============

// Email 1 — request notification to the trainer
function buildRequestEmail(trainerName: string, traineeName: string): { html: string; text: string; subject: string } {
  const subject = `בקשת אימון חדשה מ-${traineeName}`
  const html = brandedShell(`
    <p style="color:#333;font-size:18px;line-height:1.8;margin:0 0 16px">${trainerName} שלום,</p>
    <p style="color:#333;font-size:16px;line-height:1.8;margin:0 0 24px">
      <strong>${traineeName}</strong> ביקש שתאמן אותו ב-GymIQ. כנס לאפליקציה כדי לאשר או לדחות את הבקשה.
    </p>
    ${ctaButton('צפייה בבקשה', `${APP_BASE_URL}/trainer`)}
    <p style="color:#999;font-size:13px;line-height:1.6;margin:0">אם אינך מעוניין במתאמנים נוספים — תוכל להמשיך להתעלם או לדחות את הבקשה ישירות.</p>
  `)
  const text = `${trainerName} שלום,

${traineeName} ביקש שתאמן אותו ב-GymIQ. כנס לאפליקציה כדי לאשר או לדחות את הבקשה:
${APP_BASE_URL}/trainer

© ${new Date().getFullYear()} GymIQ | gymiq.co.il`
  return { html, text, subject }
}

// Email 2 — approval notification to the trainee
function buildApprovedEmail(traineeName: string, trainerName: string): { html: string; text: string; subject: string } {
  const subject = `המאמן ${trainerName} אישר את בקשתך`
  const html = brandedShell(`
    <p style="color:#333;font-size:18px;line-height:1.8;margin:0 0 16px">${traineeName} שלום,</p>
    <p style="color:#333;font-size:16px;line-height:1.8;margin:0 0 24px">
      המאמן <strong>${trainerName}</strong> אישר אותך כמתאמן שלו. עכשיו תוכל לקבל תוכניות אימון מותאמות אישית.
    </p>
    ${ctaButton('כניסה לאפליקציה', `${APP_BASE_URL}/dashboard`)}
  `)
  const text = `${traineeName} שלום,

המאמן ${trainerName} אישר אותך כמתאמן שלו. עכשיו תוכל לקבל תוכניות אימון מותאמות אישית.

כניסה לאפליקציה: ${APP_BASE_URL}/dashboard

© ${new Date().getFullYear()} GymIQ | gymiq.co.il`
  return { html, text, subject }
}

// Email 3 — rejection notification to the trainee
function buildRejectedEmail(
  traineeName: string,
  trainerName: string,
  reason?: string
): { html: string; text: string; subject: string } {
  const subject = `המאמן ${trainerName} דחה את בקשתך`
  const reasonHtml = reason
    ? `<p style="color:#666;font-size:14px;line-height:1.6;margin:0 0 16px;padding:12px;background-color:#f9f9f9;border-right:3px solid #00D4AA;border-radius:4px"><strong>סיבה שצוינה:</strong> ${reason}</p>`
    : ''
  const reasonText = reason ? `\n\nסיבה שצוינה: ${reason}` : ''
  const html = brandedShell(`
    <p style="color:#333;font-size:18px;line-height:1.8;margin:0 0 16px">${traineeName} שלום,</p>
    <p style="color:#333;font-size:16px;line-height:1.8;margin:0 0 16px">
      לצערנו, המאמן <strong>${trainerName}</strong> לא יכול לאמן אותך כעת.
    </p>
    ${reasonHtml}
    <p style="color:#333;font-size:16px;line-height:1.8;margin:0 0 24px">תוכל לבחור מאמן אחר מהאפליקציה.</p>
    ${ctaButton('בחר מאמן אחר', `${APP_BASE_URL}/trainers`)}
  `)
  const text = `${traineeName} שלום,

לצערנו, המאמן ${trainerName} לא יכול לאמן אותך כעת.${reasonText}

תוכל לבחור מאמן אחר מהאפליקציה: ${APP_BASE_URL}/trainers

© ${new Date().getFullYear()} GymIQ | gymiq.co.il`
  return { html, text, subject }
}

// ============ Server-only helper (called from approveTrainerRequest CF) ============

// Sends the approval email. Throws on error so the caller can decide whether
// to swallow it. The approve CF wraps this in try/catch to keep email failure
// from rolling back a successful approval.
export async function sendTrainerApprovedEmailDirect(params: {
  traineeEmail: string
  traineeName: string
  trainerName: string
}): Promise<void> {
  const { html, text, subject } = buildApprovedEmail(params.traineeName, params.trainerName)
  await sendResendEmail({ to: params.traineeEmail, subject, html, text })
}

// ============ Callables (client-triggered) ============

// Called from the client right after requestTrainer succeeds. Server reads
// the relationship to validate the caller is the trainee, then looks up the
// trainer's email server-side (so client cannot forge the destination).
export const sendTrainerRequestEmail = onCall(
  { secrets: ['RESEND_API_KEY'], timeoutSeconds: 30, memory: '256MiB' },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required')
    }
    const { relationshipId } = (request.data || {}) as { relationshipId?: string }
    if (!relationshipId) {
      throw new HttpsError('invalid-argument', 'relationshipId is required')
    }

    const db = admin.firestore()
    const relSnap = await db.collection('trainerRelationships').doc(relationshipId).get()
    if (!relSnap.exists) {
      throw new HttpsError('not-found', 'Relationship not found')
    }
    const rel = relSnap.data()!
    if (rel.traineeId !== request.auth.uid) {
      throw new HttpsError('permission-denied', 'Caller is not the trainee on this relationship')
    }
    if (rel.status !== 'pending') {
      throw new HttpsError('failed-precondition', 'Relationship is not in pending state')
    }

    const trainerSnap = await db.collection('users').doc(rel.trainerId).get()
    const trainerEmail = trainerSnap.exists ? (trainerSnap.data()!.email as string | undefined) : undefined
    if (!trainerEmail) {
      throw new HttpsError('not-found', 'Trainer email not found')
    }

    const trainerName = (rel.trainerName as string | undefined) || (trainerSnap.data()!.displayName as string | undefined) || 'מאמן'
    const traineeName = (rel.traineeName as string | undefined) || 'מתאמן'

    const { html, text, subject } = buildRequestEmail(trainerName, traineeName)
    await sendResendEmail({ to: trainerEmail, subject, html, text })
    return { success: true }
  }
)

// Called from the client right after rejectTrainerRequest succeeds. Server
// validates the caller is the trainer on the relationship before sending.
export const sendTrainerRejectedEmail = onCall(
  { secrets: ['RESEND_API_KEY'], timeoutSeconds: 30, memory: '256MiB' },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required')
    }
    const { relationshipId } = (request.data || {}) as { relationshipId?: string }
    if (!relationshipId) {
      throw new HttpsError('invalid-argument', 'relationshipId is required')
    }

    const db = admin.firestore()
    const relSnap = await db.collection('trainerRelationships').doc(relationshipId).get()
    if (!relSnap.exists) {
      throw new HttpsError('not-found', 'Relationship not found')
    }
    const rel = relSnap.data()!
    if (rel.trainerId !== request.auth.uid) {
      throw new HttpsError('permission-denied', 'Caller is not the trainer on this relationship')
    }
    if (rel.status !== 'rejected') {
      throw new HttpsError('failed-precondition', 'Relationship is not in rejected state')
    }

    const traineeEmail = rel.traineeEmail as string | undefined
    if (!traineeEmail) {
      throw new HttpsError('not-found', 'Trainee email not found on relationship')
    }
    const traineeName = (rel.traineeName as string | undefined) || 'מתאמן'
    const trainerName = (rel.trainerName as string | undefined) || 'מאמן'
    const reason = rel.rejectionReason as string | undefined

    const { html, text, subject } = buildRejectedEmail(traineeName, trainerName, reason)
    await sendResendEmail({ to: traineeEmail, subject, html, text })
    return { success: true }
  }
)
