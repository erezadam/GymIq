/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.spec.ts', 'tests/**/*.spec.tsx', 'tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    // Firestore/Storage rules tests require the emulator and run via a dedicated
    // config (npm run test:rules) — keep them out of the default unit run.
    exclude: ['node_modules/**', 'tests/rules/**', 'tests/functions/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: ['src/**/*.types.ts', 'src/**/*.d.ts']
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})
