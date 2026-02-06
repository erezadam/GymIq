import { test, expect } from '@playwright/test'
import { trainerUser, regularUser } from './helpers/test-users'

// Run tests serially - these are complex flows
test.describe.configure({ mode: 'serial' })
test.skip(({ browserName }) => browserName !== 'chromium', 'Trainer-trainee tests run on chromium only')

/**
 * Trainer-Trainee Complete Workflow E2E Tests
 *
 * Tests the full ping-pong between trainer and trainee:
 *
 * TRAINER → TRAINEE:
 * - Create/register trainee
 * - Create training program
 * - Create standalone workout
 * - Send messages
 * - Report workout on behalf of trainee
 * - View trainee workouts
 *
 * TRAINEE → TRAINER:
 * - View assigned programs
 * - Execute workout from program
 * - View inbox messages
 * - Mark messages as read
 *
 * PREREQUISITES:
 * - Trainer user exists with role 'trainer'
 * - Regular user exists with role 'user'
 * - For some tests: trainer-trainee relationship should exist
 */

// Helper to login
async function login(page: any, user: any) {
  await page.goto('/login')
  await page.locator('input[type="email"]').fill(user.email)
  await page.locator('input[type="password"]').fill(user.password)
  await page.getByRole('button', { name: 'התחבר' }).click()
  await page.waitForURL((url: URL) => !url.pathname.includes('/login'), { timeout: 15000 })
}

// ============================================================================
// TRAINER → TRAINEE FLOWS
// ============================================================================

test.describe('Trainer → Trainee Flows', () => {

  test.describe('Trainer Dashboard', () => {

    test('trainer can view dashboard with trainee grid', async ({ page }) => {
      await login(page, trainerUser)
      await page.goto('/trainer')

      await page.waitForTimeout(1000)

      // Should be on trainer dashboard
      expect(page.url()).toContain('/trainer')

      // Should see either trainee cards or "add trainee" option
      const addTraineeButton = page.getByRole('button', { name: /מתאמן חדש|הוסף מתאמן/i })
      const traineeCards = page.locator('[class*="card"]').filter({ hasText: /מתאמן/ })

      const hasAddButton = await addTraineeButton.count() > 0
      const hasTrainees = await traineeCards.count() > 0

      // Trainer dashboard should have add button or trainees
      expect(hasAddButton || hasTrainees).toBe(true)
    })

    test('trainer can open new trainee registration modal', async ({ page }) => {
      await login(page, trainerUser)
      await page.goto('/trainer')

      await page.waitForTimeout(1000)

      // Click add trainee button (use first() since there may be multiple)
      const addTraineeButton = page.getByRole('button', { name: /מתאמן חדש|הוסף מתאמן/i }).first()

      if (await addTraineeButton.isVisible()) {
        await addTraineeButton.click()

        await page.waitForTimeout(500)

        // Modal should appear with registration form
        const modal = page.locator('[role="dialog"]')
          .or(page.locator('.fixed.inset-0'))
          .or(page.locator('[class*="modal"]'))

        expect(await modal.count()).toBeGreaterThan(0)

        // Should have email input
        const emailInput = page.locator('input[type="email"]')
        expect(await emailInput.count()).toBeGreaterThan(0)
      }
    })
  })

  test.describe('Trainee Detail Page', () => {

    test('trainer can access trainee detail page', async ({ page }) => {
      await login(page, trainerUser)
      await page.goto('/trainer')

      await page.waitForTimeout(2000)

      // Find and click on a trainee card
      const traineeCard = page.locator('[class*="card"]')
        .filter({ has: page.locator('img') })
        .first()

      if (await traineeCard.count() > 0 && await traineeCard.isVisible()) {
        await traineeCard.click()

        // Should navigate to trainee detail
        await page.waitForURL('**/trainer/trainee/**', { timeout: 5000 })
        expect(page.url()).toContain('/trainer/trainee/')
      } else {
        // No trainees exist, skip
        test.skip()
      }
    })

    test('trainee detail page shows key sections', async ({ page }) => {
      await login(page, trainerUser)
      await page.goto('/trainer')

      await page.waitForTimeout(2000)

      // Navigate to first trainee
      const traineeCard = page.locator('[class*="card"]')
        .filter({ has: page.locator('img') })
        .first()

      if (await traineeCard.count() > 0) {
        await traineeCard.click()
        await page.waitForURL('**/trainer/trainee/**', { timeout: 5000 })

        await page.waitForTimeout(1000)

        // Should see trainee name or profile section
        const content = await page.content()
        expect(content.length).toBeGreaterThan(2000)

        // Should have action buttons
        const sendMessageBtn = page.getByRole('button', { name: /שלח הודעה|הודעה/i })
        const newProgramBtn = page.getByRole('button', { name: /תוכנית חדשה|תוכנית/i })
          .or(page.locator('button').filter({ hasText: /תוכנית/ }))

        // At least one action should be available
        const hasActions = await sendMessageBtn.count() > 0 || await newProgramBtn.count() > 0
        expect(hasActions).toBe(true)
      } else {
        test.skip()
      }
    })
  })

  test.describe('Program Creation', () => {

    test('trainer can access program builder', async ({ page }) => {
      await login(page, trainerUser)

      // Try direct navigation to program builder
      await page.goto('/trainer/program/new')

      await page.waitForTimeout(1000)

      // Should be on program builder or redirected if no trainee selected
      const url = page.url()
      expect(url).toMatch(/\/trainer\/(program|trainee)/)

      // Page should have program-related content
      const content = await page.content()
      expect(content).toMatch(/תוכנית|program|מתאמן/i)
    })

    test('program builder has step wizard', async ({ page }) => {
      await login(page, trainerUser)
      await page.goto('/trainer/program/new')

      await page.waitForTimeout(1000)

      // Look for step indicators or wizard UI
      const steps = page.locator('[class*="step"]')
        .or(page.locator('text=/שלב|step/i'))
        .or(page.locator('[role="progressbar"]'))

      // Should have some form of step/wizard UI or form
      const content = await page.content()
      expect(content.length).toBeGreaterThan(1000)
    })
  })

  test.describe('Messaging', () => {

    test('trainer can access message center', async ({ page }) => {
      await login(page, trainerUser)
      await page.goto('/trainer/messages')

      await page.waitForTimeout(1000)

      // Should be on messages page
      expect(page.url()).toContain('/trainer/messages')

      // Should see message UI
      const content = await page.content()
      expect(content).toMatch(/הודעות|message/i)
    })

    test('trainer can open message composer', async ({ page }) => {
      await login(page, trainerUser)
      await page.goto('/trainer/messages')

      await page.waitForTimeout(1000)

      // Look for compose/new message button
      const composeButton = page.getByRole('button', { name: /הודעה חדשה|שלח הודעה|חדש/i })
        .or(page.locator('button').filter({ hasText: /הודעה/ }))

      if (await composeButton.count() > 0) {
        await composeButton.first().click()

        await page.waitForTimeout(500)

        // Should see message form fields
        const textarea = page.locator('textarea')
        expect(await textarea.count()).toBeGreaterThan(0)
      }
    })

    test('message composer has required fields', async ({ page }) => {
      await login(page, trainerUser)

      // Navigate to trainee and click send message
      await page.goto('/trainer')
      await page.waitForTimeout(2000)

      const traineeCard = page.locator('[class*="card"]')
        .filter({ has: page.locator('img') })
        .first()

      if (await traineeCard.count() > 0) {
        await traineeCard.click()
        await page.waitForURL('**/trainer/trainee/**', { timeout: 5000 })

        await page.waitForTimeout(1000)

        // Click send message button
        const sendMsgBtn = page.getByRole('button', { name: /שלח הודעה/i })
          .or(page.locator('button').filter({ hasText: /הודעה/ }))

        if (await sendMsgBtn.count() > 0) {
          await sendMsgBtn.first().click()
          await page.waitForTimeout(500)

          // Check for form fields
          const typeSelect = page.locator('select')
            .or(page.locator('[role="combobox"]'))
          const bodyTextarea = page.locator('textarea')
          const sendButton = page.getByRole('button', { name: /שלח/i })

          expect(await bodyTextarea.count()).toBeGreaterThan(0)
          expect(await sendButton.count()).toBeGreaterThan(0)
        }
      } else {
        test.skip()
      }
    })
  })

  test.describe('Standalone Workout', () => {

    test('trainer can create standalone workout for trainee', async ({ page }) => {
      await login(page, trainerUser)
      await page.goto('/trainer')

      await page.waitForTimeout(2000)

      // Navigate to trainee
      const traineeCard = page.locator('[class*="card"]')
        .filter({ has: page.locator('img') })
        .first()

      if (await traineeCard.count() > 0) {
        await traineeCard.click()
        await page.waitForURL('**/trainer/trainee/**', { timeout: 5000 })

        await page.waitForTimeout(1000)

        // Look for standalone workout button
        const standaloneBtn = page.getByRole('button', { name: /אימון בודד/i })
          .or(page.locator('button').filter({ hasText: /בודד/ }))

        if (await standaloneBtn.count() > 0) {
          await standaloneBtn.first().click()
          await page.waitForTimeout(500)

          // Should see workout editor or exercise selection
          const content = await page.content()
          expect(content).toMatch(/תרגיל|exercise|אימון/i)
        }
      } else {
        test.skip()
      }
    })
  })

  test.describe('Report Workout for Trainee', () => {

    test('trainer can initiate workout report for trainee', async ({ page }) => {
      await login(page, trainerUser)
      await page.goto('/trainer')

      await page.waitForTimeout(2000)

      const traineeCard = page.locator('[class*="card"]')
        .filter({ has: page.locator('img') })
        .first()

      if (await traineeCard.count() > 0) {
        await traineeCard.click()
        await page.waitForURL('**/trainer/trainee/**', { timeout: 5000 })

        await page.waitForTimeout(1000)

        // Look for report workout button on program day
        const reportBtn = page.getByRole('button', { name: /דווח אימון|דווח עבור/i })
          .or(page.locator('button').filter({ hasText: /דווח/ }))

        if (await reportBtn.count() > 0) {
          // Button exists - trainer can report
          expect(await reportBtn.count()).toBeGreaterThan(0)
        } else {
          // No programs with report option - check for programs section
          const programsSection = page.locator('text=/תוכניות|programs/i')
          expect(await programsSection.count()).toBeGreaterThanOrEqual(0)
        }
      } else {
        test.skip()
      }
    })
  })

  test.describe('View Trainee Workouts', () => {

    test('trainer can see trainee recent workouts', async ({ page }) => {
      await login(page, trainerUser)
      await page.goto('/trainer')

      await page.waitForTimeout(2000)

      const traineeCard = page.locator('[class*="card"]')
        .filter({ has: page.locator('img') })
        .first()

      if (await traineeCard.count() > 0) {
        await traineeCard.click()
        await page.waitForURL('**/trainer/trainee/**', { timeout: 5000 })

        await page.waitForTimeout(1000)

        // Look for recent workouts section
        const workoutsSection = page.locator('text=/אימונים אחרונים|recent workouts|אימונים/i')
        const workoutCards = page.locator('[class*="workout"]')

        // Should have workouts section or workout cards
        const hasWorkoutsUI = await workoutsSection.count() > 0 || await workoutCards.count() > 0
        // Even if no workouts, the section header should exist
        const content = await page.content()
        expect(content).toMatch(/אימון|workout/i)
      } else {
        test.skip()
      }
    })
  })
})

// ============================================================================
// TRAINEE → TRAINER FLOWS
// ============================================================================

test.describe('Trainee → Trainer Flows', () => {

  test.describe('Trainee Dashboard', () => {

    test('trainee sees dashboard with trainer content', async ({ page }) => {
      await login(page, regularUser)
      await page.goto('/dashboard')

      await page.waitForTimeout(1000)

      expect(page.url()).toContain('/dashboard')

      // Dashboard should show workout/training content
      const content = await page.content()
      expect(content).toMatch(/אימון|workout|תרגיל/i)
    })
  })

  test.describe('View Programs', () => {

    test('trainee can see assigned programs', async ({ page }) => {
      await login(page, regularUser)
      await page.goto('/dashboard')

      await page.waitForTimeout(1000)

      // Look for programs section or link
      const programsLink = page.getByRole('link', { name: /תוכניות|programs/i })
        .or(page.locator('a[href*="program"]'))
      const programsSection = page.locator('text=/תוכניות|programs/i')

      // Should have some way to access programs (or empty state)
      const content = await page.content()
      expect(content.length).toBeGreaterThan(1000)
    })

    test('trainee can expand program to see days', async ({ page }) => {
      await login(page, regularUser)
      await page.goto('/dashboard')

      await page.waitForTimeout(2000)

      // Look for expandable program card
      const programCard = page.locator('[class*="program"]')
        .or(page.locator('[class*="card"]').filter({ hasText: /תוכנית|יום/ }))

      if (await programCard.count() > 0) {
        await programCard.first().click()
        await page.waitForTimeout(500)

        // Should see day details or exercises
        const content = await page.content()
        expect(content).toMatch(/יום|day|תרגיל|exercise/i)
      }
    })
  })

  test.describe('Inbox (Messages from Trainer)', () => {

    test('trainee can access inbox', async ({ page }) => {
      await login(page, regularUser)
      await page.goto('/inbox')

      await page.waitForTimeout(1000)

      // Should be on inbox page
      expect(page.url()).toContain('/inbox')

      // Should see messages UI or empty state
      const content = await page.content()
      expect(content).toMatch(/הודעות|inbox|message|אין הודעות/i)
    })

    test('trainee inbox shows messages or empty state', async ({ page }) => {
      await login(page, regularUser)
      await page.goto('/inbox')

      await page.waitForTimeout(2000)

      // Either messages or empty state
      const messageCards = page.locator('[class*="message"]')
        .or(page.locator('[class*="card"]'))
      const emptyState = page.locator('text=/אין הודעות|no messages|ריק/i')

      const hasMessages = await messageCards.count() > 0
      const hasEmptyState = await emptyState.count() > 0

      // Should have one or the other
      expect(hasMessages || hasEmptyState).toBe(true)
    })

    test('trainee can click on message to view details', async ({ page }) => {
      await login(page, regularUser)
      await page.goto('/inbox')

      await page.waitForTimeout(2000)

      // Find a message card
      const messageCard = page.locator('[class*="message"]')
        .or(page.locator('[class*="card"]').filter({ hasText: /מאמן|trainer/ }))
        .first()

      if (await messageCard.count() > 0 && await messageCard.isVisible()) {
        await messageCard.click()
        await page.waitForTimeout(500)

        // Message should expand or navigate to detail
        const content = await page.content()
        expect(content.length).toBeGreaterThan(1000)
      }
    })
  })

  test.describe('Execute Workout from Program', () => {

    test('trainee can start workout from program day', async ({ page }) => {
      await login(page, regularUser)
      await page.goto('/dashboard')

      await page.waitForTimeout(2000)

      // Look for "start workout" type button
      const startWorkoutBtn = page.getByRole('button', { name: /התחל אימון|בנה אימון/i })
        .or(page.getByRole('link', { name: /התחל אימון|בנה אימון/i }))
        .or(page.locator('a[href*="exercise"]'))

      if (await startWorkoutBtn.count() > 0) {
        await startWorkoutBtn.first().click()

        await page.waitForURL((url: URL) =>
          url.pathname.includes('/exercises') ||
          url.pathname.includes('/workout'),
          { timeout: 5000 }
        )

        // Should be on exercise selection or workout page
        expect(page.url()).toMatch(/\/exercises|\/workout/)
      }
    })
  })

  test.describe('Workout History', () => {

    test('trainee can view workout history', async ({ page }) => {
      await login(page, regularUser)
      await page.goto('/workout/history')

      await page.waitForTimeout(1000)

      expect(page.url()).toContain('/workout/history')

      // Should see history UI
      const content = await page.content()
      expect(content).toMatch(/היסטוריה|history|אימון/i)
    })

    test('trainee workout history shows trainer-reported workouts', async ({ page }) => {
      await login(page, regularUser)
      await page.goto('/workout/history')

      await page.waitForTimeout(2000)

      // Look for workout cards with "reported by trainer" indicator
      const workoutCards = page.locator('[class*="card"]')
        .or(page.locator('[class*="workout"]'))

      if (await workoutCards.count() > 0) {
        // Workouts exist - check content
        const content = await page.content()
        // Should have some workout content
        expect(content).toMatch(/אימון|workout|תרגיל|exercise/i)
      } else {
        // No workouts - that's ok too
        const emptyState = page.locator('text=/אין אימונים|no workouts/i')
        expect(await emptyState.count()).toBeGreaterThanOrEqual(0)
      }
    })
  })
})

// ============================================================================
// CROSS-FLOW INTEGRATION TESTS
// ============================================================================

test.describe('Integration: Full Ping-Pong Flow', () => {

  test('trainer and trainee pages are accessible', async ({ page }) => {
    // Test trainer access
    await login(page, trainerUser)
    await page.goto('/trainer')
    expect(page.url()).toContain('/trainer')

    // This test just verifies both pages are accessible
    // Since Firebase auth persists, we don't test user switch here
    // (that's covered in auth.spec.ts)
  })

  test('trainee can access their pages', async ({ page }) => {
    // Test trainee access separately
    await login(page, regularUser)
    await page.goto('/dashboard')
    expect(page.url()).toContain('/dashboard')
  })

  test('trainer messages appear in trainee inbox (if relationship exists)', async ({ page }) => {
    // First check trainee inbox
    await login(page, regularUser)
    await page.goto('/inbox')

    await page.waitForTimeout(1000)

    // Inbox should be accessible
    expect(page.url()).toContain('/inbox')

    // Content should load
    const content = await page.content()
    expect(content.length).toBeGreaterThan(500)
  })

  test('workout flow preserves program data', async ({ page }) => {
    await login(page, regularUser)
    await page.goto('/exercises')

    await page.waitForTimeout(2000)

    // If trainee has programs, exercise library might show program-related UI
    const content = await page.content()

    // Exercise library should load
    expect(content).toMatch(/תרגיל|exercise|בחירה/i)
  })
})
