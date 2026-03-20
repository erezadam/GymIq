# Changelog

## 2026-03-20

### Added
- **View As User (Admin Impersonation)**: Admin can view the app as any non-admin user for debugging:
  - Eye icon button in Users list to start impersonation
  - Amber banner at top shows who you're viewing as + exit button
  - Read-only mode: writes are blocked with toast message
  - Session-only: page refresh returns to admin
  - Works for both trainees and trainers
  - Firestore rules updated: admin can read all workout sessions and history
- **Editable email in trainee edit modal**: Trainer/admin can update trainee email (fixes wrong email at account creation)
  - New Cloud Function `updateUserEmail` updates both Firebase Auth and Firestore
  - Email field added to TraineeEditModal form
- **Welcome email for new trainees**: When a trainer creates a new trainee account, a branded HTML welcome email is sent via Resend with:
  - Welcome message with trainee and trainer names
  - Link to set up password (Firebase Auth password reset)
  - Link to the GymIQ app
  - RTL Hebrew layout with GymIQ branding
- New Cloud Function: `sendWelcomeEmail` (`functions/src/email/sendWelcomeEmail.ts`)
- Added `resend` dependency to Cloud Functions
- **Resend welcome email button**: Trainee card in trainer dashboard now has a "שלח מייל כניסה" button to resend the welcome email if the trainee lost it
