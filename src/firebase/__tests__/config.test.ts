// ABOUTME: Tests that Firebase config is read from env and rejects missing required keys.
// ABOUTME: Pure — no network, no emulator; part of the default `npm test` run.
import { describe, it, expect } from 'vitest'
import { readFirebaseConfig, resolveAuthDomain } from '../config'

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

describe('resolveAuthDomain', () => {
  const configured = 'cle-tracker-46272.firebaseapp.com'
  it('uses the current host on Hosting-served domains, to keep OAuth same-origin', () => {
    expect(resolveAuthDomain('clekeeper.com', configured)).toBe('clekeeper.com')
    expect(resolveAuthDomain('www.clekeeper.com', configured)).toBe('www.clekeeper.com')
    expect(resolveAuthDomain('cle-tracker-46272.web.app', configured)).toBe('cle-tracker-46272.web.app')
    expect(resolveAuthDomain('cle-tracker-46272.firebaseapp.com', configured)).toBe('cle-tracker-46272.firebaseapp.com')
  })
  it('falls back to the configured authDomain off Hosting (localhost dev)', () => {
    expect(resolveAuthDomain('localhost', configured)).toBe(configured)
    expect(resolveAuthDomain('127.0.0.1', configured)).toBe(configured)
  })
})
