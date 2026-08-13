/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import path from 'path'

// Dedicated config for Cloud Functions handler tests. The functions package
// resolves firebase-admin/firebase-functions from functions/node_modules, so a
// root vi.mock by bare name never matches. Instead we alias those specifiers to
// local fixtures (more-specific '/v2/https' first) so the handler runs against
// controllable mocks with no real Firebase app.
export default defineConfig({
  resolve: {
    alias: [
      { find: 'firebase-functions/v2/https', replacement: path.resolve(__dirname, 'tests/_mocks/firebase-functions-https.ts') },
      { find: 'firebase-functions', replacement: path.resolve(__dirname, 'tests/_mocks/firebase-functions.ts') },
      { find: 'firebase-admin', replacement: path.resolve(__dirname, 'tests/_mocks/firebase-admin.ts') },
    ],
  },
  test: {
    include: ['tests/functions/**/*.test.ts'],
    environment: 'node',
    globals: true,
  },
})
