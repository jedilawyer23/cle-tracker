// ABOUTME: Tests resolving the parseCertificate daily quota by sign-in provider, with the
// ABOUTME: PARSE_DAILY_LIMIT env override winning for both anonymous and authenticated callers.
import { describe, it, expect } from 'vitest'
import {
  ANONYMOUS_PARSE_DAILY_LIMIT,
  AUTHENTICATED_PARSE_DAILY_LIMIT,
  DEFAULT_PARSE_DAILY_LIMIT,
  resolveParseDailyLimit,
} from '../parseQuota/config'

describe('resolveParseDailyLimit', () => {
  it('gives anonymous callers the anonymous limit when PARSE_DAILY_LIMIT is unset', () => {
    expect(ANONYMOUS_PARSE_DAILY_LIMIT).toBe(10)
    expect(resolveParseDailyLimit({}, true)).toBe(10)
  })

  it('gives authenticated callers the authenticated limit when PARSE_DAILY_LIMIT is unset', () => {
    expect(AUTHENTICATED_PARSE_DAILY_LIMIT).toBe(25)
    expect(DEFAULT_PARSE_DAILY_LIMIT).toBe(25)
    expect(resolveParseDailyLimit({}, false)).toBe(25)
  })

  it('uses PARSE_DAILY_LIMIT for both anonymous and authenticated when it is a positive number', () => {
    expect(resolveParseDailyLimit({ PARSE_DAILY_LIMIT: '50' }, true)).toBe(50)
    expect(resolveParseDailyLimit({ PARSE_DAILY_LIMIT: '50' }, false)).toBe(50)
  })

  it('falls back to the provider default for a non-numeric or non-positive value', () => {
    expect(resolveParseDailyLimit({ PARSE_DAILY_LIMIT: 'abc' }, true)).toBe(10)
    expect(resolveParseDailyLimit({ PARSE_DAILY_LIMIT: '0' }, false)).toBe(25)
    expect(resolveParseDailyLimit({ PARSE_DAILY_LIMIT: '-5' }, true)).toBe(10)
  })
})
