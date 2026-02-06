import { test, expect } from '@playwright/test'
import { trainerUser, regularUser } from './helpers/test-users'

// Run tests serially and chromium only (Firebase rate limiting)
test.describe.configure({ mode: 'serial' })
test.skip(({ browserName }) => browserName !== 'chromium', 'Trainer tests run on chromium only')

/**
 * Trainer Dashboard E2E Tests
 *
 * Tests trainer-specific functionality:
 * - Access to trainer dashboard
 * - Viewing trainees (if any)
 * - Trainer navigation
 */

// Helper to login
async function login(page: any, user: any) {
  await page.goto('/login')
  await page.locator('input[type="email"]').fill(user.email)
  await page.locator('input[type="password"]').fill(user.password)
  await page.getByRole('button', { name: 'התחבר' }).click()
  await page.waitForURL((url: URL) => !url.pathname.includes('/login'), { timeout: 15000 })
}

test.describe('Trainer Dashboard', () => {

  test.describe('Trainer Access', () => {

    test('trainer can access trainer dashboard', async ({ page }) => {
      await login(page, trainerUser)
      await page.goto('/trainer')

      // Should be on trainer page
      expect(page.url()).toContain('/trainer')

      // Page should have trainer-related content
      await page.waitForTimeout(1000)
      const content = await page.content()
      expect(content).toMatch(/מאמן|trainer|מתאמנים|trainees/i)
    })

    test('trainer dashboard shows trainee list or empty state', async ({ page }) => {
      await login(page, trainerUser)
      await page.goto('/trainer')

      await page.waitForTimeout(2000)

      // Either shows trainee cards or empty state
      const traineeCards = page.locator('[class*="card"], [class*="trainee"]')
      const emptyState = page.locator('text=/אין מתאמנים|no trainees|עדיין/i')

      const hasTrainees = await traineeCards.count() > 0
      const hasEmptyState = await emptyState.count() > 0

      // Should have either trainees or empty state message
      expect(hasTrainees || hasEmptyState).toBe(true)
    })
  })

  test.describe('Trainer Navigation', () => {

    test('trainer can access messages page', async ({ page }) => {
      await login(page, trainerUser)
      await page.goto('/trainer/messages')

      await page.waitForTimeout(1000)
      expect(page.url()).toContain('/trainer/messages')
    })

    test('trainer can navigate between trainer and user dashboard', async ({ page }) => {
      await login(page, trainerUser)

      // Start at trainer dashboard
      await page.goto('/trainer')
      expect(page.url()).toContain('/trainer')

      // Navigate to user dashboard
      await page.goto('/dashboard')
      expect(page.url()).toContain('/dashboard')

      // Can go back to trainer
      await page.goto('/trainer')
      expect(page.url()).toContain('/trainer')
    })
  })

  test.describe('Regular User Restriction', () => {

    test('regular user cannot access trainer dashboard', async ({ page }) => {
      await login(page, regularUser)

      // Try to access trainer page
      await page.goto('/trainer')

      // Should be redirected to dashboard
      await page.waitForURL('**/dashboard**', { timeout: 5000 })
      expect(page.url()).toContain('/dashboard')
      expect(page.url()).not.toContain('/trainer')
    })
  })
})
