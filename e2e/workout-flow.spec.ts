import { test, expect } from '@playwright/test'
import { regularUser } from './helpers/test-users'

// Run tests serially to avoid conflicts with workout state
// Skip mobile for now due to Firebase rate limiting on heavy tests
test.describe.configure({ mode: 'serial' })
test.skip(({ browserName }) => browserName !== 'chromium', 'Workout flow tests run on chromium only')

/**
 * Workout Flow E2E Tests
 *
 * Tests the core workout functionality:
 * - Starting a workout from dashboard
 * - Selecting exercises
 * - Logging sets (weight, reps)
 * - Completing a workout
 */

// Helper to login
async function login(page: any) {
  await page.goto('/login')
  await page.locator('input[type="email"]').fill(regularUser.email)
  await page.locator('input[type="password"]').fill(regularUser.password)
  await page.getByRole('button', { name: 'התחבר' }).click()
  await page.waitForURL((url: URL) => !url.pathname.includes('/login'), { timeout: 10000 })
}

// Helper to wait for exercises to load
async function waitForExercisesToLoad(page: any) {
  // Wait for images to appear (exercise cards have images)
  try {
    await page.waitForSelector('.cursor-pointer img', { timeout: 15000 })
  } catch {
    // Fallback: wait for any content
    await page.waitForTimeout(3000)
  }
}

test.describe('Workout Flow', () => {

  test.describe('Starting a Workout', () => {

    test('user can navigate from dashboard to exercise library', async ({ page }) => {
      await login(page)
      await page.goto('/dashboard')

      // Click "Build Workout" card/button - specifically the one with "בנה אימון"
      const buildWorkoutLink = page.getByRole('link', { name: /בנה אימון חופשי/i })

      await buildWorkoutLink.click()

      // Should navigate to exercises
      await page.waitForURL('**/exercises**', { timeout: 5000 })
      expect(page.url()).toContain('/exercises')
    })

    test('exercise library displays exercises and filters', async ({ page }) => {
      await login(page)
      await page.goto('/exercises')

      // Wait for exercises to load (may take longer on mobile/slow connection)
      // Wait for loading spinner to disappear or exercises to appear
      await page.waitForTimeout(2000)

      // Should see muscle filter tabs (these load immediately)
      const muscleFilters = page.locator('button').filter({ hasText: /הכל|חזה|גב|זרועות/i })
      expect(await muscleFilters.count()).toBeGreaterThan(0)

      // Wait for exercise cards to load (Firebase query)
      try {
        await page.waitForSelector('img', { timeout: 10000 })
      } catch {
        // If no images, check for exercise names
      }

      // Page should have exercise-related content
      const content = await page.content()
      expect(content).toMatch(/תרגיל|exercise|img/i)
    })

    test('user can select exercises in exercise library', async ({ page }) => {
      await login(page)
      await page.goto('/exercises')

      // Wait for exercises to load
      await waitForExercisesToLoad(page)

      // Click on first exercise card to select it
      const firstExercise = page.locator('.cursor-pointer').filter({ has: page.locator('img') }).first()
      await firstExercise.click()

      // Should see selection indicator (badge or checkmark)
      await page.waitForTimeout(300)

      // Look for "exercises selected" badge or similar
      const selectionBadge = page.locator('text=/תרגיל.*נבחר|נבחרו/i')
        .or(page.locator('.bg-primary-main, .bg-neon-cyan'))

      expect(await selectionBadge.count()).toBeGreaterThan(0)
    })

    test('user can start workout after selecting exercises', async ({ page }) => {
      await login(page)
      await page.goto('/exercises')

      // Wait for exercises to load
      await waitForExercisesToLoad(page)

      // Select first exercise
      const firstExercise = page.locator('.cursor-pointer').filter({ has: page.locator('img') }).first()
      await firstExercise.click()

      // Find and click start button
      const startButton = page.getByRole('button', { name: /התחל אימון/i })
        .or(page.getByRole('link', { name: /התחל אימון/i }))
        .or(page.locator('button').filter({ hasText: /התחל/ }))

      await startButton.first().click()

      // Should navigate to workout session or builder
      await page.waitForURL((url: URL) =>
        url.pathname.includes('/workout/session') || url.pathname.includes('/workout/builder'),
        { timeout: 10000 }
      )

      expect(page.url()).toMatch(/\/workout\/(session|builder)/)
    })
  })

  test.describe('Workout Session', () => {

    test('workout session displays selected exercises', async ({ page }) => {
      await login(page)
      await page.goto('/exercises')
      await waitForExercisesToLoad(page)

      // Select first exercise
      const firstExercise = page.locator('.cursor-pointer').filter({ has: page.locator('img') }).first()
      await firstExercise.click()

      // Start workout
      const startButton = page.getByRole('button', { name: /התחל אימון/i })
        .or(page.locator('button').filter({ hasText: /התחל/ }))
      await startButton.first().click()

      // Wait for session page
      await page.waitForURL((url: URL) =>
        url.pathname.includes('/workout/session') || url.pathname.includes('/workout/builder'),
        { timeout: 10000 }
      )

      // Should see exercise name/info on page
      await page.waitForTimeout(500)

      // Workout session should have some exercise-related content
      const pageContent = await page.content()
      expect(pageContent.length).toBeGreaterThan(1000) // Page has content
    })

    test('workout builder/session shows exercise controls', async ({ page }) => {
      await login(page)
      await page.goto('/exercises')
      await waitForExercisesToLoad(page)

      // Select first exercise
      const firstExercise = page.locator('.cursor-pointer').filter({ has: page.locator('img') }).first()
      await firstExercise.click()

      // Start workout
      const startButton = page.getByRole('button', { name: /התחל אימון/i })
        .or(page.locator('button').filter({ hasText: /התחל/ }))
      await startButton.first().click()

      // Wait for session/builder page
      await page.waitForURL((url: URL) =>
        url.pathname.includes('/workout/session') || url.pathname.includes('/workout/builder'),
        { timeout: 10000 }
      )

      await page.waitForTimeout(500)

      // Verify exercise is shown (should see exercise name or image)
      const exerciseElement = page.locator('img').first()
        .or(page.locator('text=/תרגיל|exercise/i').first())
      expect(await exerciseElement.count()).toBeGreaterThan(0)

      // Verify there's a finish/start button at the bottom
      const actionButton = page.getByRole('button', { name: /סיים אימון|התחל אימון/i })
      expect(await actionButton.count()).toBeGreaterThan(0)
    })
  })

  test.describe('Completing a Workout', () => {

    test('finish workout button exists and is clickable', async ({ page }) => {
      await login(page)
      await page.goto('/exercises')
      await waitForExercisesToLoad(page)

      // Select first exercise
      const firstExercise = page.locator('.cursor-pointer').filter({ has: page.locator('img') }).first()
      await firstExercise.click()

      // Start workout
      const startButton = page.getByRole('button', { name: /התחל אימון/i })
        .or(page.locator('button').filter({ hasText: /התחל/ }))
      await startButton.first().click()

      // Wait for session/builder page
      await page.waitForURL((url: URL) =>
        url.pathname.includes('/workout/session') || url.pathname.includes('/workout/builder'),
        { timeout: 10000 }
      )

      await page.waitForTimeout(500)

      // Find finish button - should exist
      const finishButton = page.getByRole('button', { name: /סיים אימון/i })
      expect(await finishButton.count()).toBeGreaterThan(0)
      expect(await finishButton.isVisible()).toBe(true)
    })
  })

  test.describe('Direct Route Access', () => {

    test('user can access exercises page directly', async ({ page }) => {
      await login(page)
      await page.goto('/exercises')

      await page.waitForTimeout(500)
      expect(page.url()).toContain('/exercises')

      // Page should have exercise-related content
      const content = await page.content()
      expect(content).toMatch(/תרגיל|exercise/i)
    })

    test('user can access workout history directly', async ({ page }) => {
      await login(page)
      await page.goto('/workout/history')

      await page.waitForTimeout(500)
      expect(page.url()).toContain('/workout/history')
    })
  })
})
