/**
 * Send Welcome Email - Cloud Function
 * Sends a branded welcome email to new trainees with app link and password setup link.
 * Uses direct HTTP call to Resend API (no external package needed).
 */

import * as admin from 'firebase-admin'
import { onCall, HttpsError } from 'firebase-functions/v2/https'

interface WelcomeEmailRequest {
  traineeEmail: string
  traineeName: string
  trainerName: string
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
  <title>ברוכים הבאים ל-GymIQ</title>
</head>
<body style="margin:0;padding:0;background-color:#0f0f1a;font-family:Arial,Helvetica,sans-serif;direction:rtl">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0f0f1a;padding:40px 20px">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color:#1a1a2e;border-radius:16px;overflow:hidden;max-width:600px;width:100%">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#00D4AA 0%,#00B894 100%);padding:40px 30px;text-align:center">
              <h1 style="margin:0;color:#0f0f1a;font-size:28px;font-weight:bold">
                GymIQ
              </h1>
              <p style="margin:10px 0 0;color:#0f0f1a;font-size:16px;opacity:0.8">
                האימון החכם שלך מתחיל כאן
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 30px">
              <h2 style="margin:0 0 20px;color:#ffffff;font-size:24px;text-align:center">
                שלום ${traineeName}, ברוכים הבאים!
              </h2>

              <p style="color:#b0b0c0;font-size:16px;line-height:1.8;margin:0 0 20px;text-align:center">
                המאמן <strong style="color:#00D4AA">${trainerName}</strong> יצר עבורך חשבון באפליקציית GymIQ.
              </p>

              <p style="color:#b0b0c0;font-size:16px;line-height:1.8;margin:0 0 30px;text-align:center">
                כדי להתחיל, הגדר סיסמה והיכנס לאפליקציה:
              </p>

              <!-- Password Setup Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:16px">
                <tr>
                  <td align="center">
                    <a href="${passwordResetLink}"
                       style="display:inline-block;background:linear-gradient(135deg,#00D4AA 0%,#00B894 100%);color:#0f0f1a;text-decoration:none;padding:16px 40px;border-radius:12px;font-size:18px;font-weight:bold;min-width:200px;text-align:center">
                      הגדרת סיסמה
                    </a>
                  </td>
                </tr>
              </table>

              <!-- App Link Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:30px">
                <tr>
                  <td align="center">
                    <a href="https://gymiq.web.app"
                       style="display:inline-block;border:2px solid #00D4AA;color:#00D4AA;text-decoration:none;padding:14px 40px;border-radius:12px;font-size:16px;font-weight:bold;min-width:200px;text-align:center">
                      כניסה לאפליקציה
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Steps -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#252540;border-radius:12px;padding:24px;margin-bottom:20px">
                <tr>
                  <td>
                    <p style="color:#ffffff;font-size:16px;font-weight:bold;margin:0 0 16px;text-align:center">
                      שלושה צעדים להתחלה:
                    </p>
                    <p style="color:#b0b0c0;font-size:15px;line-height:2;margin:0">
                      1. לחץ על "הגדרת סיסמה" ובחר סיסמה<br>
                      2. היכנס לאפליקציה עם המייל והסיסמה שבחרת<br>
                      3. התחל לתעד אימונים ולהתקדם!
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#151528;padding:24px 30px;text-align:center;border-top:1px solid #252540">
              <p style="color:#b0b0c0;font-size:14px;margin:0 0 8px">
                נשלח על ידי המאמן <strong style="color:#00D4AA">${trainerName}</strong> דרך GymIQ
              </p>
              <p style="color:#666680;font-size:12px;margin:0">
                © ${new Date().getFullYear()} GymIQ
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

export const sendWelcomeEmail = onCall(
  {
    secrets: ['RESEND_API_KEY'],
    timeoutSeconds: 30,
    memory: '256MiB',
  },
  async (request) => {
    const { traineeEmail, traineeName, trainerName } = request.data as WelcomeEmailRequest

    // Validate required fields
    if (!traineeEmail || !traineeName || !trainerName) {
      throw new HttpsError(
        'invalid-argument',
        'Missing required fields: traineeEmail, traineeName, trainerName'
      )
    }

    // Generate password reset link via Admin SDK
    let passwordResetLink: string
    try {
      passwordResetLink = await admin.auth().generatePasswordResetLink(traineeEmail)
    } catch (error) {
      console.error('Failed to generate password reset link:', error)
      throw new HttpsError('internal', 'Failed to generate password reset link')
    }

    // Build email HTML
    const html = buildWelcomeEmailHtml(traineeName, trainerName, passwordResetLink)

    // Send email via Resend API (direct HTTP call)
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
          to: traineeEmail,
          subject: `${traineeName}, ברוכים הבאים ל-GymIQ!`,
          html,
        }),
      })

      if (!response.ok) {
        const errorBody = await response.text()
        console.error('Resend API error:', response.status, errorBody)
        throw new HttpsError('internal', 'Failed to send welcome email')
      }

      return { success: true }
    } catch (error) {
      if (error instanceof HttpsError) throw error
      console.error('Failed to send welcome email:', error)
      throw new HttpsError('internal', 'Failed to send welcome email')
    }
  }
)
