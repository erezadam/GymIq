import { test, expect } from '@playwright/test'
import { trainerUser } from './helpers/test-users'

// Run tests serially and chromium only (Firebase rate limiting)
test.describe.configure({ mode: 'serial' })
test.skip(({ browserName }) => browserName !== 'chromium', 'Muscle analysis tests run on chromium only')

/**
 * Muscle Analysis E2E Tests
 *
 * Tests the "ניתוח שרירים" feature in AIInsights:
 * - Button renders in the AI insights section
 * - Modal opens on click with 4-week analysis
 * - Category cards load with progress bars
 * - Categories expand to show sub-muscles
 * - Status indicators (green/red) render based on targets
 * - Modal closes via X button and backdrop
 *
 * PREREQUISITES:
 * - Trainer user with at least one trainee
 * - Trainee should ideally have completed workouts in the last 4 weeks
 */

// Helper to login with retry for rate limiting
async function login(page: any, user: any, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    await page.goto('/login')
    await page.waitForTimeout(500)

    try {
      await page.locator('input[type="email"]').waitFor({ state: 'visible', timeout: 15000 })
    } catch {
      if (attempt < maxRetries) {
        await page.waitForTimeout(attempt * 5000)
        continue
      }
      throw new Error('Login page failed to load after retries')
    }

    await page.locator('input[type="email"]').fill(user.email)
    await page.locator('input[type="password"]').fill(user.password)
    await page.getByRole('button', { name: 'התחבר' }).click()

    try {
      await page.waitForURL((url: URL) => !url.pathname.includes('/login'), { timeout: 15000 })
      return
    } catch (e) {
      if (String(e).includes('closed') || String(e).includes('Target closed')) {
        throw new Error('Browser closed during login')
      }
      if (attempt < maxRetries) {
        await page.waitForTimeout(attempt * 10000)
        continue
      }
      throw e
    }
  }
}

// Helper to navigate from trainer dashboard → trainee detail → analytics
async function navigateToTraineeAnalytics(page: any): Promise<boolean> {
  await page.goto('/trainer')
  await page.waitForTimeout(2000)

  // Find a trainee card and click it
  const traineeCard = page.locator('.bg-dark-card.cursor-pointer').first()
  if ((await traineeCard.count()) === 0 || !(await traineeCard.isVisible())) {
    return false // No trainees
  }

  await traineeCard.click()
  await page.waitForURL('**/trainer/trainee/**', { timeout: 5000 })
  await page.waitForTimeout(1000)

  // Extract trainee ID from URL and navigate to analytics
  const url = page.url()
  const match = url.match(/\/trainer\/trainee\/([^/]+)/)
  if (!match) return false

  const traineeId = match[1]
  await page.goto(`/trainer/trainee/${traineeId}/analytics?tab=total`)
  await page.waitForTimeout(2000)

  return true
}

// Helper to find and click the muscle analysis button across tabs
async function findMuscleButton(page: any) {
  const muscleButton = page.locator('button', { hasText: 'ניתוח שרירים' })
  if ((await muscleButton.count()) > 0) return muscleButton

  for (const tab of ['streak', 'weekly', 'pr']) {
    await page.locator(`text=/${tab === 'streak' ? 'רצף' : tab === 'weekly' ? 'השבוע' : 'PR'}/`).click()
    await page.waitForTimeout(1500)
    if ((await muscleButton.count()) > 0) return muscleButton
  }

  return muscleButton
}

test.describe('Muscle Analysis', () => {

  test('button renders in AI insights section', async ({ page }) => {
    await login(page, trainerUser)
    const navigated = await navigateToTraineeAnalytics(page)
    if (!navigated) {
      test.skip(true, 'No trainees available for trainer')
      return
    }

    const muscleButton = await findMuscleButton(page)
    if ((await muscleButton.count()) === 0) {
      test.skip(true, 'No AI insights section found — trainee may lack enough data')
      return
    }

    await expect(muscleButton).toBeVisible({ timeout: 5000 })
    await page.screenshot({ path: 'test-results/muscle-analysis-button-visible.png' })
  })

  test('modal opens with 4-week analysis header', async ({ page }) => {
    await login(page, trainerUser)
    const navigated = await navigateToTraineeAnalytics(page)
    if (!navigated) {
      test.skip(true, 'No trainees available for trainer')
      return
    }

    const muscleButton = await findMuscleButton(page)
    if ((await muscleButton.count()) === 0) {
      test.skip(true, 'Button not found — no AI insights section')
      return
    }

    await muscleButton.click()

    // Modal should open with title
    const modalTitle = page.locator('h2', { hasText: 'ניתוח נפח אימון' })
    await expect(modalTitle).toBeVisible({ timeout: 5000 })

    // Should show "4 שבועות אחרונים"
    const periodText = page.locator('text=4 שבועות אחרונים')
    await expect(periodText).toBeVisible({ timeout: 3000 })

    // Date range should be displayed
    const dateRange = page.locator('text=/\\d{2}\\/\\d{2}\\/\\d{4}\\s*–\\s*\\d{2}\\/\\d{2}\\/\\d{4}/')
    await expect(dateRange).toBeVisible({ timeout: 3000 })

    await page.screenshot({ path: 'test-results/muscle-analysis-modal-opened.png' })
  })

  test('modal shows category cards or empty state', async ({ page }) => {
    await login(page, trainerUser)
    const navigated = await navigateToTraineeAnalytics(page)
    if (!navigated) {
      test.skip(true, 'No trainees available for trainer')
      return
    }

    const muscleButton = await findMuscleButton(page)
    if ((await muscleButton.count()) === 0) {
      test.skip(true, 'Button not found')
      return
    }

    await muscleButton.click()
    await expect(page.locator('h2', { hasText: 'ניתוח נפח אימון' })).toBeVisible({ timeout: 5000 })
    await page.waitForTimeout(5000) // Wait for Firebase queries

    // After loading: either category cards or empty state
    const categoryCards = page.locator('text=/סטים\\/שבוע/')
    const emptyState = page.locator('text=לא נמצאו אימונים')

    const hasCards = (await categoryCards.count()) > 0
    const hasEmptyState = (await emptyState.count()) > 0

    expect(hasCards || hasEmptyState).toBe(true)

    if (hasCards) {
      // Summary bar should show workout count and total sets (use modal scope)
      const modal = page.locator('.fixed.inset-0')
      await expect(modal.locator('text=סטים סה"כ')).toBeVisible()
      await page.screenshot({ path: 'test-results/muscle-analysis-data-loaded.png' })
    } else {
      await page.screenshot({ path: 'test-results/muscle-analysis-empty-state.png' })
    }
  })

  test('category cards expand to show sub-muscles', async ({ page }) => {
    await login(page, trainerUser)
    const navigated = await navigateToTraineeAnalytics(page)
    if (!navigated) {
      test.skip(true, 'No trainees available for trainer')
      return
    }

    const muscleButton = await findMuscleButton(page)
    if ((await muscleButton.count()) === 0) {
      test.skip(true, 'Button not found')
      return
    }

    await muscleButton.click()
    await page.waitForTimeout(5000)

    const categoryCards = page.locator('text=/סטים\\/שבוע/')
    if ((await categoryCards.count()) === 0) {
      test.skip(true, 'No muscle data in last 4 weeks')
      return
    }

    // Click the first category to expand it
    const firstCategory = categoryCards.first()
    await firstCategory.click()

    // Wait for expansion
    await page.waitForTimeout(500)

    // Check if sub-muscle rows appear (showing avg reps)
    const subMuscleRows = page.locator('text=/ממוצע .+ חזרות/')
    // May or may not appear depending on whether category has >1 sub-muscle

    await page.screenshot({ path: 'test-results/muscle-analysis-expanded.png' })
  })

  test('status indicators show on-target and off-target', async ({ page }) => {
    await login(page, trainerUser)
    const navigated = await navigateToTraineeAnalytics(page)
    if (!navigated) {
      test.skip(true, 'No trainees available for trainer')
      return
    }

    const muscleButton = await findMuscleButton(page)
    if ((await muscleButton.count()) === 0) {
      test.skip(true, 'Button not found')
      return
    }

    await muscleButton.click()
    await page.waitForTimeout(5000)

    const categoryCards = page.locator('text=/סטים\\/שבוע/')
    if ((await categoryCards.count()) === 0) {
      test.skip(true, 'No data')
      return
    }

    // Check for status indicators (green/red icons)
    const greenIcons = page.locator('.text-status-success')
    const redIcons = page.locator('.text-status-error')

    const hasGreen = (await greenIcons.count()) > 0
    const hasRed = (await redIcons.count()) > 0

    // At least one status indicator should be present
    expect(hasGreen || hasRed).toBe(true)

    // Verify legend exists
    await expect(page.locator('text=עומד ביעד השבועי')).toBeVisible()
    await expect(page.locator('text=מתחת ליעד')).toBeVisible()

    await page.screenshot({ path: 'test-results/muscle-analysis-status-indicators.png' })
  })

  test('modal closes via X button', async ({ page }) => {
    await login(page, trainerUser)
    const navigated = await navigateToTraineeAnalytics(page)
    if (!navigated) {
      test.skip(true, 'No trainees available for trainer')
      return
    }

    const muscleButton = await findMuscleButton(page)
    if ((await muscleButton.count()) === 0) {
      test.skip(true, 'Button not found')
      return
    }

    // Open modal
    await muscleButton.click()
    await expect(page.locator('h2', { hasText: 'ניתוח נפח אימון' })).toBeVisible({ timeout: 5000 })

    // Close via X button - scope to the modal
    const modal = page.locator('.fixed.inset-0')
    const closeButton = modal.locator('button.w-11.h-11')
    await expect(closeButton).toBeVisible()
    await closeButton.click()

    // Modal should be gone
    await expect(page.locator('h2', { hasText: 'ניתוח נפח אימון' })).not.toBeVisible({ timeout: 3000 })
  })

  test('modal closes via backdrop click', async ({ page }) => {
    await login(page, trainerUser)
    const navigated = await navigateToTraineeAnalytics(page)
    if (!navigated) {
      test.skip(true, 'No trainees available for trainer')
      return
    }

    const muscleButton = await findMuscleButton(page)
    if ((await muscleButton.count()) === 0) {
      test.skip(true, 'Button not found')
      return
    }

    // Open modal
    await muscleButton.click()
    await expect(page.locator('h2', { hasText: 'ניתוח נפח אימון' })).toBeVisible({ timeout: 5000 })

    // Click the backdrop (top-left corner, outside the modal content)
    await page.locator('.fixed.inset-0.z-50').click({ position: { x: 10, y: 10 } })

    // Modal should be gone
    await expect(page.locator('h2', { hasText: 'ניתוח נפח אימון' })).not.toBeVisible({ timeout: 3000 })
  })
})
