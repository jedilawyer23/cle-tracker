/// <reference types="vitest" />
// ABOUTME: Vitest config for the Cloud Functions workspace.
// ABOUTME: Mirrors the @domain/* path alias so server tests import M1's pure domain.
import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  test: { environment: 'node', globals: true },
  resolve: {
    alias: { '@domain': fileURLToPath(new URL('../src/domain', import.meta.url)) },
  },
})
