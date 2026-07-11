// ABOUTME: Tests the touch-device heuristic used to pick the Google sign-in flow (redirect vs
// ABOUTME: popup) — coarse pointer (touch) devices prefer redirect since popups get blocked.
import { describe, it, expect, afterEach } from 'vitest'
import { prefersRedirectSignIn } from '../prefersRedirectSignIn'

describe('prefersRedirectSignIn', () => {
  const originalMatchMedia = window.matchMedia

  afterEach(() => {
    window.matchMedia = originalMatchMedia
  })

  it('returns true on a coarse-pointer (touch) device', () => {
    window.matchMedia = ((query: string) => ({ matches: query === '(pointer: coarse)' })) as unknown as typeof window.matchMedia
    expect(prefersRedirectSignIn()).toBe(true)
  })

  it('returns false on a fine-pointer (mouse) device', () => {
    window.matchMedia = (() => ({ matches: false })) as unknown as typeof window.matchMedia
    expect(prefersRedirectSignIn()).toBe(false)
  })
})
