/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'

// Dedicated config for Firestore/Storage security-rules tests. These run against
// the Firebase emulator (via `firebase emulators:exec`) and must NOT load the
// jsdom + firebase-mock setup used by the unit suite.
export default defineConfig({
  test: {
    include: ['tests/rules/**/*.test.ts'],
    environment: 'node',
    globals: true,
    testTimeout: 20000,
    hookTimeout: 60000,
  },
})
