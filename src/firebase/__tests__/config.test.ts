// ABOUTME: Tests that Firebase config is read from env and rejects missing required keys.
// ABOUTME: Pure — no network, no emulator; part of the default `npm test` run.
import { describe, it, expect } from 'vitest'
import { readFirebaseConfig } from '../config'

const full = {
  VITE_FIREBASE_API_KEY: 'k', VITE_FIREBASE_AUTH_DOMAIN: 'd',
  VITE_FIREBASE_PROJECT_ID: 'p', VITE_FIREBASE_APP_ID: 'a',
  VITE_FIREBASE_STORAGE_BUCKET: 'b', VITE_FIREBASE_MESSAGING_SENDER_ID: 's',
}

describe('readFirebaseConfig', () => {
  it('maps env vars to a config object', () => {
    const cfg = readFirebaseConfig(full)
    expect(cfg.apiKey).toBe('k')
    expect(cfg.projectId).toBe('p')
    expect(cfg.appId).toBe('a')
  })
  it('throws listing every missing required key', () => {
    expect(() => readFirebaseConfig({})).toThrow(/apiKey/)
    expect(() => readFirebaseConfig({ ...full, VITE_FIREBASE_PROJECT_ID: undefined }))
      .toThrow(/projectId/)
  })
})
