/**
 * Test Users Configuration for E2E Tests
 *
 * These users must exist in Firebase with the correct roles.
 * Credentials are loaded from environment variables for security.
 *
 * Required environment variables:
 * - E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD
 * - E2E_TRAINER_EMAIL, E2E_TRAINER_PASSWORD
 * - E2E_USER_EMAIL, E2E_USER_PASSWORD
 */

export type UserRole = 'admin' | 'trainer' | 'user'

export interface TestUser {
  email: string
  password: string
  role: UserRole
  displayName: string
}

/**
 * Admin user - full access to all features
 * Routes: /admin/*, /trainer/*, /dashboard, /workout/*
 */
export const adminUser: TestUser = {
  email: process.env.E2E_ADMIN_EMAIL || 'admin@test.gymiq.com',
  password: process.env.E2E_ADMIN_PASSWORD || '',
  role: 'admin',
  displayName: 'Test Admin',
}

/**
 * Trainer user - access to trainer and user features
 * Routes: /trainer/*, /dashboard, /workout/*
 */
export const trainerUser: TestUser = {
  email: process.env.E2E_TRAINER_EMAIL || 'trainer@test.gymiq.com',
  password: process.env.E2E_TRAINER_PASSWORD || '',
  role: 'trainer',
  displayName: 'Test Trainer',
}

/**
 * Regular user (trainee) - basic user access only
 * Routes: /dashboard, /workout/*, /exercises, /inbox
 */
export const regularUser: TestUser = {
  email: process.env.E2E_USER_EMAIL || 'user@test.gymiq.com',
  password: process.env.E2E_USER_PASSWORD || '',
  role: 'user',
  displayName: 'Test User',
}

/**
 * Get test user by role
 */
export function getTestUser(role: UserRole): TestUser {
  switch (role) {
    case 'admin':
      return adminUser
    case 'trainer':
      return trainerUser
    case 'user':
      return regularUser
    default:
      throw new Error(`Unknown role: ${role}`)
  }
}

/**
 * All test users for iteration
 */
export const allTestUsers: TestUser[] = [adminUser, trainerUser, regularUser]

/**
 * Validate that required environment variables are set
 * Call this at the start of test runs to fail fast if config is missing
 */
export function validateTestUsersConfig(): void {
  const missingVars: string[] = []

  if (!process.env.E2E_ADMIN_EMAIL) missingVars.push('E2E_ADMIN_EMAIL')
  if (!process.env.E2E_ADMIN_PASSWORD) missingVars.push('E2E_ADMIN_PASSWORD')
  if (!process.env.E2E_TRAINER_EMAIL) missingVars.push('E2E_TRAINER_EMAIL')
  if (!process.env.E2E_TRAINER_PASSWORD) missingVars.push('E2E_TRAINER_PASSWORD')
  if (!process.env.E2E_USER_EMAIL) missingVars.push('E2E_USER_EMAIL')
  if (!process.env.E2E_USER_PASSWORD) missingVars.push('E2E_USER_PASSWORD')

  if (missingVars.length > 0) {
    console.warn(
      `⚠️  Missing E2E test user environment variables:\n${missingVars.map((v) => `   - ${v}`).join('\n')}\n` +
        `   Tests requiring authentication will be skipped or fail.\n` +
        `   Add these to your .env.local or CI environment.`
    )
  }
}
