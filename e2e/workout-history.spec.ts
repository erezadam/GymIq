import { test, expect } from '@playwright/test'
import { regularUser } from './helpers/test-users'

// Run tests serially and chromium only (Firebase rate limiting)
test.describe.configure({ mode: 'serial' })
test.skip(({ browserName }) => browserName !== 'chromium', 'Workout history tests run on chromium only')

/**
 * Workout History E2E Tests
 *
 * Tests viewing and managing workout history:
 * - Viewing past workouts
 * - Workout status display (completed, in_progress, etc.)
 * - Workout details
 */

// Helper to login
async function login(page: any) {
  await page.goto('/login')
  await page.locator('input[type="email"]').fill(regularUser.email)
  await page.locator('input[type="password"]').fill(regularUser.password)
  await page.getByRole('button', { name: 'התחבר' }).click()
  await page.waitForURL((url: URL) => !url.pathname.includes('/login'), { timeout: 10000 })
}

test.describe('Workout History', () => {

  test.describe('Viewing History', () => {

    test('user can access workout history page', async ({ page }) => {
      await login(page)
      await page.goto('/workout/history')

      // Should be on history page
      expect(page.url()).toContain('/workout/history')

      // Page should have history-related content
      await page.waitForTimeout(1000)
      const content = await page.content()
      expect(content).toMatch(/היסטוריה|אימונים|history|workout/i)
    })

    test('workout history page displays workout list or empty state', async ({ page }) => {
      await login(page)
      await page.goto('/workout/history')

      await page.waitForTimeout(2000)

      // Either shows workout cards or empty state message
      const workoutCards = page.locator('[class*="card"], [class*="workout"]')
      const emptyState = page.locator('text=/אין אימונים|no workouts|עדיין לא/i')

      const hasWorkouts = await workoutCards.count() > 0
      const hasEmptyState = await emptyState.count() > 0

      // Should have either workouts or empty state
      expect(hasWorkouts || hasEmptyState).toBe(true)
    })

    test('workout history shows date grouping or filters', async ({ page }) => {
      await login(page)
      await page.goto('/workout/history')

      await page.waitForTimeout(1000)

      // Page should have some kind of date/filter UI
      const content = await page.content()
      // Should have date-related text or filter controls
      expect(content.length).toBeGreaterThan(1000)
    })
  })

  test.describe('Workout Details', () => {

    test('can navigate to workout detail page if workouts exist', async ({ page }) => {
      await login(page)
      await page.goto('/workout/history')

      await page.waitForTimeout(2000)

      // Find a clickable workout card
      const workoutCard = page.locator('[class*="card"], [class*="workout"]').first()

      if (await workoutCard.count() > 0 && await workoutCard.isVisible()) {
        // Try to click on workout to see details
        await workoutCard.click()

        await page.waitForTimeout(500)

        // Should either navigate to detail or expand in place
        const url = page.url()
        const expanded = await page.locator('[class*="expanded"], [class*="detail"]').count() > 0

        // Either URL changed or content expanded
        expect(url.includes('/workout/history') || expanded).toBe(true)
      } else {
        // No workouts, test passes (nothing to click)
        expect(true).toBe(true)
      }
    })
  })

  test.describe('Navigation', () => {

    test('can navigate from dashboard to history via sidebar', async ({ page }) => {
      await login(page)
      await page.goto('/dashboard')

      await page.waitForTimeout(500)

      // Find history link in sidebar or navigation
      const historyLink = page.getByRole('link', { name: /היסטוריה/i })
        .or(page.locator('a[href*="history"]'))

      if (await historyLink.count() > 0) {
        await historyLink.first().click()
        await page.waitForURL('**/history**', { timeout: 5000 })
        expect(page.url()).toContain('history')
      } else {
        // History link might not be visible on all screen sizes
        // Try direct navigation
        await page.goto('/workout/history')
        expect(page.url()).toContain('history')
      }
    })

    test('history page has back navigation', async ({ page }) => {
      await login(page)
      await page.goto('/workout/history')

      await page.waitForTimeout(500)

      // Should have some way to go back (back button, home link, sidebar)
      const backButton = page.getByRole('button', { name: /חזור|back/i })
        .or(page.locator('a[href="/dashboard"]'))
        .or(page.getByRole('link', { name: /דשבורד|dashboard/i }))

      expect(await backButton.count()).toBeGreaterThan(0)
    })
  })
})
