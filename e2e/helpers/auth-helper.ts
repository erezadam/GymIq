import { Page, expect } from '@playwright/test'
import { TestUser, getTestUser, UserRole } from './test-users'

/**
 * Authentication Helper for E2E Tests
 *
 * Provides UI-based login functionality for Playwright tests.
 * Uses the actual login form at /login to authenticate users.
 */

/**
 * Login via the UI login form
 *
 * @param page - Playwright page object
 * @param user - Test user credentials (from test-users.ts)
 * @returns Promise that resolves when login is complete
 *
 * @example
 * ```ts
 * import { login } from './helpers/auth-helper'
 * import { adminUser } from './helpers/test-users'
 *
 * test('admin can access admin panel', async ({ page }) => {
 *   await login(page, adminUser)
 *   await page.goto('/admin')
 *   // ...
 * })
 * ```
 */
export async function login(page: Page, user: TestUser): Promise<void> {
  // Navigate to login page
  await page.goto('/login')

  // Wait for the login form to be visible
  await page.waitForSelector('form')

  // Fill in email - using placeholder as selector since inputs don't have data-testid
  const emailInput = page.locator('input[type="email"]')
  await emailInput.fill(user.email)

  // Fill in password
  const passwordInput = page.locator('input[type="password"]')
  await passwordInput.fill(user.password)

  // Click login button (Hebrew text: "התחבר")
  const loginButton = page.getByRole('button', { name: 'התחבר' })
  await loginButton.click()

  // Wait for navigation away from login page
  // User role determines the redirect destination
  await page.waitForURL((url) => !url.pathname.includes('/login'), {
    timeout: 10000,
  })
}

/**
 * Login by role - convenience wrapper
 *
 * @param page - Playwright page object
 * @param role - User role ('admin', 'trainer', 'user')
 *
 * @example
 * ```ts
 * await loginAs(page, 'admin')
 * await loginAs(page, 'trainer')
 * await loginAs(page, 'user')
 * ```
 */
export async function loginAs(page: Page, role: UserRole): Promise<void> {
  const user = getTestUser(role)
  await login(page, user)
}

/**
 * Logout the current user
 *
 * @param page - Playwright page object
 */
export async function logout(page: Page): Promise<void> {
  // Navigate to dashboard first (in case we're on a page without logout)
  await page.goto('/dashboard')

  // Look for logout button/link - this may need adjustment based on actual UI
  // Common patterns: profile menu -> logout, direct logout button
  const logoutButton = page.getByRole('button', { name: /יציאה|התנתק/i })

  if (await logoutButton.isVisible()) {
    await logoutButton.click()
  } else {
    // Try profile menu first
    const profileButton = page.locator('[data-testid="profile-menu"]')
    if (await profileButton.isVisible()) {
      await profileButton.click()
      await page.getByRole('menuitem', { name: /יציאה|התנתק/i }).click()
    }
  }

  // Wait for redirect to login
  await page.waitForURL('**/login', { timeout: 5000 })
}

/**
 * Check if user is currently logged in
 *
 * @param page - Playwright page object
 * @returns true if user appears to be logged in
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
  // Check if we're on a protected page (not login)
  const currentUrl = page.url()
  if (currentUrl.includes('/login')) {
    return false
  }

  // Additional check: look for user-specific elements
  // This could be a profile avatar, user name display, etc.
  try {
    await page.waitForURL((url) => !url.pathname.includes('/login'), {
      timeout: 2000,
    })
    return true
  } catch {
    return false
  }
}

/**
 * Assert user is redirected to appropriate dashboard based on role
 *
 * @param page - Playwright page object
 * @param role - Expected user role
 */
export async function assertCorrectDashboard(
  page: Page,
  role: UserRole
): Promise<void> {
  const currentUrl = page.url()

  switch (role) {
    case 'admin':
      // Admin should be on /admin or /dashboard
      expect(
        currentUrl.includes('/admin') || currentUrl.includes('/dashboard')
      ).toBe(true)
      break
    case 'trainer':
      // Trainer should be on /trainer or /dashboard
      expect(
        currentUrl.includes('/trainer') || currentUrl.includes('/dashboard')
      ).toBe(true)
      break
    case 'user':
      // Regular user should be on /dashboard
      expect(currentUrl.includes('/dashboard')).toBe(true)
      break
  }
}

/**
 * Wait for authentication state to stabilize
 * Useful after login when Firebase auth state is updating
 *
 * @param page - Playwright page object
 * @param timeout - Maximum time to wait in ms (default: 5000)
 */
export async function waitForAuthReady(
  page: Page,
  timeout: number = 5000
): Promise<void> {
  // Wait for any loading spinners to disappear
  const spinner = page.locator('[data-testid="loading-spinner"]')
  if (await spinner.isVisible()) {
    await spinner.waitFor({ state: 'hidden', timeout })
  }

  // Give Firebase auth state a moment to propagate
  await page.waitForTimeout(500)
}
