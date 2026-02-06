import { test, expect } from '@playwright/test'
import { adminUser, trainerUser, regularUser } from './helpers/test-users'

/**
 * Authentication E2E Tests
 *
 * Tests login functionality for all user roles,
 * logout functionality, and error handling.
 */

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    // Start each test from the login page
    await page.goto('/login')
  })

  test.describe('Login', () => {
    test('admin user can login and is redirected to admin dashboard', async ({ page }) => {
      // Fill login form
      await page.locator('input[type="email"]').fill(adminUser.email)
      await page.locator('input[type="password"]').fill(adminUser.password)

      // Click login button
      await page.getByRole('button', { name: 'התחבר' }).click()

      // Wait for redirect - admin should go to /admin
      await page.waitForURL('**/admin**', { timeout: 10000 })

      // Verify we're on the admin page
      expect(page.url()).toContain('/admin')
    })

    test('trainer user can login and is redirected to dashboard', async ({ page }) => {
      // Fill login form
      await page.locator('input[type="email"]').fill(trainerUser.email)
      await page.locator('input[type="password"]').fill(trainerUser.password)

      // Click login button
      await page.getByRole('button', { name: 'התחבר' }).click()

      // Wait for redirect - trainer goes to /dashboard
      await page.waitForURL('**/dashboard**', { timeout: 10000 })

      // Verify we're on the dashboard
      expect(page.url()).toContain('/dashboard')
    })

    test('regular user can login and is redirected to dashboard', async ({ page }) => {
      // Fill login form
      await page.locator('input[type="email"]').fill(regularUser.email)
      await page.locator('input[type="password"]').fill(regularUser.password)

      // Click login button
      await page.getByRole('button', { name: 'התחבר' }).click()

      // Wait for redirect - regular user goes to /dashboard
      await page.waitForURL('**/dashboard**', { timeout: 10000 })

      // Verify we're on the dashboard
      expect(page.url()).toContain('/dashboard')
    })

    test('shows error message with incorrect password', async ({ page }) => {
      // Fill login form with wrong password
      await page.locator('input[type="email"]').fill(adminUser.email)
      await page.locator('input[type="password"]').fill('WrongPassword123!')

      // Click login button
      await page.getByRole('button', { name: 'התחבר' }).click()

      // Wait for error to appear (either in form or toast)
      // Firebase returns various error messages, check for any error indication
      await expect(
        page.locator('.text-red-400, [role="alert"], .Toastify__toast--error, [data-testid="error-message"]').first()
      ).toBeVisible({ timeout: 10000 })

      // Should still be on login page
      expect(page.url()).toContain('/login')
    })

    test('shows error message with non-existent email', async ({ page }) => {
      // Fill login form with non-existent email
      await page.locator('input[type="email"]').fill('nonexistent@test.gymiq.com')
      await page.locator('input[type="password"]').fill('SomePassword123!')

      // Click login button
      await page.getByRole('button', { name: 'התחבר' }).click()

      // Wait for error to appear
      await expect(
        page.locator('.text-red-400, [role="alert"], .Toastify__toast--error, [data-testid="error-message"]').first()
      ).toBeVisible({ timeout: 10000 })

      // Should still be on login page
      expect(page.url()).toContain('/login')
    })
  })

  test.describe('Logout', () => {
    test('user can logout and is redirected to login page', async ({ page }) => {
      // First, login as regular user
      await page.locator('input[type="email"]').fill(regularUser.email)
      await page.locator('input[type="password"]').fill(regularUser.password)
      await page.getByRole('button', { name: 'התחבר' }).click()

      // Wait for dashboard
      await page.waitForURL('**/dashboard**', { timeout: 10000 })

      // Wait for page to stabilize
      await page.waitForTimeout(500)

      // Check if we're on mobile (sidebar hidden) or desktop (sidebar visible)
      // The sidebar has class "hidden lg:flex" - visible only on lg screens
      const sidebar = page.locator('aside.lg\\:flex')
      const isSidebarVisible = await sidebar.isVisible()

      if (isSidebarVisible) {
        // Desktop: Click logout button in sidebar (icon-only button at bottom)
        const logoutButton = sidebar.locator('button').last()
        await logoutButton.click({ timeout: 5000 })
      } else {
        // Mobile: Open hamburger menu first, then click logout
        // The hamburger menu button is in the header
        const hamburgerButton = page.locator('header button, nav button').first()
        await hamburgerButton.click()

        // Wait for mobile menu to appear
        await page.waitForTimeout(500)

        // Find and click the logout button with text "התנתקות"
        const logoutButton = page.getByRole('button', { name: /התנתקות/i })
        await logoutButton.click({ timeout: 5000 })
      }

      // Wait for redirect to login page
      await page.waitForURL('**/login**', { timeout: 10000 })

      // Verify we're on the login page
      expect(page.url()).toContain('/login')
    })
  })

  test.describe('Session Persistence', () => {
    test('authenticated user accessing /login is redirected to dashboard', async ({ page }) => {
      // First, login
      await page.locator('input[type="email"]').fill(regularUser.email)
      await page.locator('input[type="password"]').fill(regularUser.password)
      await page.getByRole('button', { name: 'התחבר' }).click()

      // Wait for dashboard
      await page.waitForURL('**/dashboard**', { timeout: 10000 })

      // Try to navigate back to login
      await page.goto('/login')

      // Should be redirected away from login (GuestGuard behavior)
      await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 5000 })

      // Should not be on login page
      expect(page.url()).not.toContain('/login')
    })
  })
})
