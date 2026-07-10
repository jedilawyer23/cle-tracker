// ABOUTME: Vitest config for emulator-backed tests only (`*.emulator.test.ts`).
// ABOUTME: Run via `npm run test:emulator`, which wraps this with `firebase emulators:exec`.
/// <reference types="vitest" />
import { defineConfig } from 'vite'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['**/*.emulator.test.ts'],
  },
})
