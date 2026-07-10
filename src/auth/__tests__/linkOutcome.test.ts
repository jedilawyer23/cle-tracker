// ABOUTME: Tests the pure decision for how to resolve a Google account-link attempt.
import { describe, it, expect } from 'vitest'
import { resolveLinkOutcome } from '../linkOutcome'

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
    expect(resolveLinkOutcome('auth/popup-closed-by-user'))
      .toEqual({ kind: 'error', code: 'auth/popup-closed-by-user' })
  })
  it('surfaces a cancelled popup request as an error', () => {
    expect(resolveLinkOutcome('auth/cancelled-popup-request'))
      .toEqual({ kind: 'error', code: 'auth/cancelled-popup-request' })
  })
  it('surfaces a network failure as an error', () => {
    expect(resolveLinkOutcome('auth/network-request-failed'))
      .toEqual({ kind: 'error', code: 'auth/network-request-failed' })
  })
})
