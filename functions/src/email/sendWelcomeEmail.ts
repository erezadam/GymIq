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

    // Build email HTML and plain text
    const html = buildWelcomeEmailHtml(traineeName, trainerName, passwordResetLink)
    const text = buildWelcomeEmailText(traineeName, trainerName, passwordResetLink)

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
          subject: `הגדרת סיסמה - GymIQ`,
          html,
          text,
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
