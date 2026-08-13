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
    // All rules test files share ONE emulator; each file's beforeEach calls
    // clearFirestore(). Running files in parallel lets one file wipe another's
    // seed mid-test. Force sequential execution so seeds stay isolated.
    fileParallelism: false,
    poolOptions: { forks: { singleFork: true } },
  },
})
