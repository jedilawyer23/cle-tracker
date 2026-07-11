// ABOUTME: Tests the pure per-uid daily quota decision — no Firestore, no deps, just numbers.
// ABOUTME: Interim spend guard for parseCertificate ahead of App Check (tracked follow-up).
import { describe, it, expect } from 'vitest'
import { decideQuota } from '../parseQuota/decideQuota'

describe('decideQuota', () => {
  it('allows the call and reserves the next slot when under the limit', () => {
    expect(decideQuota(0, 25)).toEqual({ allowed: true, nextCount: 1 })
    expect(decideQuota(24, 25)).toEqual({ allowed: true, nextCount: 25 })
  })

  it('denies the call and leaves the count unchanged once at the limit', () => {
    expect(decideQuota(25, 25)).toEqual({ allowed: false, nextCount: 25 })
  })

  it('denies the call when already over the limit', () => {
    expect(decideQuota(26, 25)).toEqual({ allowed: false, nextCount: 26 })
  })
})
