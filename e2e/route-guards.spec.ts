import { test, expect } from '@playwright/test'
import { adminUser, trainerUser, regularUser, TestUser } from './helpers/test-users'

// Limit parallelism to avoid Firebase rate limiting
test.describe.configure({ mode: 'serial' })

/**
 * Route Guards E2E Tests
 *
 * Tests that each role can only access routes they're authorized for.
 * Role hierarchy: user < trainer < admin
 *
 * Access matrix:
 * | Route      | User | Trainer | Admin |
 * |------------|------|---------|-------|
 * | /dashboard | ✅   | ✅      | ✅    |
 * | /trainer/* | ❌   | ✅      | ✅    |
 * | /admin/*   | ❌   | ❌      | ✅    |
 */

// Helper function to login
async function login(page: any, user: TestUser) {
  await page.goto('/login')
  await page.locator('input[type="email"]').fill(user.email)
  await page.locator('input[type="password"]').fill(user.password)
  await page.getByRole('button', { name: 'התחבר' }).click()
  // Wait for redirect away from login
  await page.waitForURL((url: URL) => !url.pathname.includes('/login'), { timeout: 10000 })
}

test.describe('Route Guards', () => {

  test.describe('Unauthenticated Access', () => {
    test('unauthenticated user is redirected to /login when accessing /dashboard', async ({ page }) => {
      await page.goto('/dashboard')
      await page.waitForURL('**/login**', { timeout: 5000 })
      expect(page.url()).toContain('/login')
    })

    test('unauthenticated user is redirected to /login when accessing /trainer', async ({ page }) => {
      await page.goto('/trainer')
      await page.waitForURL('**/login**', { timeout: 5000 })
      expect(page.url()).toContain('/login')
    })

    test('unauthenticated user is redirected to /login when accessing /admin', async ({ page }) => {
      await page.goto('/admin')
      await page.waitForURL('**/login**', { timeout: 5000 })
      expect(page.url()).toContain('/login')
    })
  })

  test.describe('Regular User (role: user)', () => {
    test.beforeEach(async ({ page }) => {
      await login(page, regularUser)
    })

    test('can access /dashboard', async ({ page }) => {
      await page.goto('/dashboard')
      // Should stay on dashboard (not redirected)
      await page.waitForTimeout(500)
      expect(page.url()).toContain('/dashboard')
    })

    test('can access /exercises', async ({ page }) => {
      await page.goto('/exercises')
      await page.waitForTimeout(500)
      expect(page.url()).toContain('/exercises')
    })

    test('can access /workout/history', async ({ page }) => {
      await page.goto('/workout/history')
      await page.waitForTimeout(500)
      expect(page.url()).toContain('/workout/history')
    })

    test('cannot access /trainer - redirected to /dashboard', async ({ page }) => {
      await page.goto('/trainer')
      // Should be redirected to dashboard (unauthorized)
      await page.waitForURL('**/dashboard**', { timeout: 5000 })
      expect(page.url()).toContain('/dashboard')
    })

    test('cannot access /trainer/trainee/123 - redirected to /dashboard', async ({ page }) => {
      await page.goto('/trainer/trainee/123')
      await page.waitForURL('**/dashboard**', { timeout: 5000 })
      expect(page.url()).toContain('/dashboard')
    })

    test('cannot access /admin - redirected to /dashboard', async ({ page }) => {
      await page.goto('/admin')
      await page.waitForURL('**/dashboard**', { timeout: 5000 })
      expect(page.url()).toContain('/dashboard')
    })

    test('cannot access /admin/exercises - redirected to /dashboard', async ({ page }) => {
      await page.goto('/admin/exercises')
      await page.waitForURL('**/dashboard**', { timeout: 5000 })
      expect(page.url()).toContain('/dashboard')
    })
  })

  test.describe('Trainer User (role: trainer)', () => {
    test.beforeEach(async ({ page }) => {
      await login(page, trainerUser)
    })

    test('can access /dashboard', async ({ page }) => {
      await page.goto('/dashboard')
      await page.waitForTimeout(500)
      expect(page.url()).toContain('/dashboard')
    })

    test('can access /trainer', async ({ page }) => {
      await page.goto('/trainer')
      await page.waitForTimeout(500)
      expect(page.url()).toContain('/trainer')
    })

    test('can access /trainer/messages', async ({ page }) => {
      await page.goto('/trainer/messages')
      await page.waitForTimeout(500)
      expect(page.url()).toContain('/trainer/messages')
    })

    test('cannot access /admin - redirected to /dashboard', async ({ page }) => {
      await page.goto('/admin')
      await page.waitForURL('**/dashboard**', { timeout: 5000 })
      expect(page.url()).toContain('/dashboard')
    })

    test('cannot access /admin/exercises - redirected to /dashboard', async ({ page }) => {
      await page.goto('/admin/exercises')
      await page.waitForURL('**/dashboard**', { timeout: 5000 })
      expect(page.url()).toContain('/dashboard')
    })

    test('cannot access /admin/users - redirected to /dashboard', async ({ page }) => {
      await page.goto('/admin/users')
      await page.waitForURL('**/dashboard**', { timeout: 5000 })
      expect(page.url()).toContain('/dashboard')
    })
  })

  test.describe('Admin User (role: admin)', () => {
    test.beforeEach(async ({ page }) => {
      await login(page, adminUser)
    })

    test('can access /dashboard', async ({ page }) => {
      await page.goto('/dashboard')
      await page.waitForTimeout(500)
      expect(page.url()).toContain('/dashboard')
    })

    test('can access /trainer', async ({ page }) => {
      await page.goto('/trainer')
      await page.waitForTimeout(500)
      expect(page.url()).toContain('/trainer')
    })

    test('can access /admin', async ({ page }) => {
      await page.goto('/admin')
      await page.waitForTimeout(500)
      // Admin root redirects to /admin/exercises
      expect(page.url()).toMatch(/\/admin/)
    })

    test('can access /admin/exercises', async ({ page }) => {
      await page.goto('/admin/exercises')
      await page.waitForTimeout(500)
      expect(page.url()).toContain('/admin/exercises')
    })

    test('can access /admin/users', async ({ page }) => {
      await page.goto('/admin/users')
      await page.waitForTimeout(500)
      expect(page.url()).toContain('/admin/users')
    })

    test('can access /admin/muscles', async ({ page }) => {
      await page.goto('/admin/muscles')
      await page.waitForTimeout(500)
      expect(page.url()).toContain('/admin/muscles')
    })
  })

  test.describe('Direct URL Access After Login', () => {
    test('regular user trying to bookmark /admin gets redirected', async ({ page }) => {
      // Login first
      await login(page, regularUser)

      // Now try to access admin via direct URL (simulating bookmark)
      await page.goto('/admin/exercises')

      // Should be redirected
      await page.waitForURL('**/dashboard**', { timeout: 5000 })
      expect(page.url()).toContain('/dashboard')
    })

    test('trainer user trying to bookmark /admin gets redirected', async ({ page }) => {
      await login(page, trainerUser)
      await page.goto('/admin/users')
      await page.waitForURL('**/dashboard**', { timeout: 5000 })
      expect(page.url()).toContain('/dashboard')
    })
  })
})
