// ABOUTME: Tests the pure decision for how to resolve a Google account-link attempt, and the
// ABOUTME: user-facing message each outcome maps to.
import { describe, it, expect } from 'vitest'
import { resolveLinkOutcome, messageForOutcome } from '../linkOutcome'

describe('resolveLinkOutcome', () => {
  it('treats a null error code as a successful link', () => {
    expect(resolveLinkOutcome(null)).toEqual({ kind: 'linked' })
  })
  it('routes credential-already-in-use to sign into the existing account', () => {
    expect(resolveLinkOutcome('auth/credential-already-in-use'))
      .toEqual({ kind: 'use-existing-account' })
    expect(resolveLinkOutcome('auth/email-already-in-use'))
      .toEqual({ kind: 'use-existing-account' })
  })
  it('treats an already-linked provider as a no-op', () => {
    expect(resolveLinkOutcome('auth/provider-already-linked'))
      .toEqual({ kind: 'already-linked' })
  })
  it('surfaces any other code as an error', () => {
    expect(resolveLinkOutcome('auth/internal-error'))
      .toEqual({ kind: 'error', code: 'auth/internal-error' })
  })
  it('surfaces a network failure as an error', () => {
    expect(resolveLinkOutcome('auth/network-request-failed'))
      .toEqual({ kind: 'error', code: 'auth/network-request-failed' })
  })
  it('treats a user-closed popup as a silent cancellation, not an error', () => {
    expect(resolveLinkOutcome('auth/popup-closed-by-user'))
      .toEqual({ kind: 'cancelled' })
  })
  it('treats a cancelled popup request as a silent cancellation, not an error', () => {
    expect(resolveLinkOutcome('auth/cancelled-popup-request'))
      .toEqual({ kind: 'cancelled' })
  })
  it('treats a blocked popup as a silent cancellation, not an error', () => {
    expect(resolveLinkOutcome('auth/popup-blocked'))
      .toEqual({ kind: 'cancelled' })
  })
})

describe('messageForOutcome', () => {
  it('confirms a successful link', () => {
    expect(messageForOutcome({ kind: 'linked' })).toBe('Saved to your Google account.')
    expect(messageForOutcome({ kind: 'already-linked' })).toBe('Saved to your Google account.')
  })
  it('confirms the merge into an existing account', () => {
    expect(messageForOutcome({ kind: 'use-existing-account' }))
      .toBe('Signed in — your credits were saved to your account.')
  })
  it('surfaces an error as a retry prompt', () => {
    expect(messageForOutcome({ kind: 'error', code: 'auth/network-request-failed' }))
      .toBe("Couldn't sign in — please try again.")
  })
  it('stays silent when the user cancelled', () => {
    expect(messageForOutcome({ kind: 'cancelled' })).toBeNull()
  })
})
