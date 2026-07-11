// ABOUTME: Tests resolving the parseCertificate daily quota from PARSE_DAILY_LIMIT, falling
// ABOUTME: back to the default for anything unset or not a positive number.
import { describe, it, expect } from 'vitest'
import { DEFAULT_PARSE_DAILY_LIMIT, resolveParseDailyLimit } from '../parseQuota/config'

describe('resolveParseDailyLimit', () => {
  it('defaults to 25 when PARSE_DAILY_LIMIT is unset', () => {
    expect(DEFAULT_PARSE_DAILY_LIMIT).toBe(25)
    expect(resolveParseDailyLimit({})).toBe(25)
  })

  it('uses PARSE_DAILY_LIMIT when it is a positive number', () => {
    expect(resolveParseDailyLimit({ PARSE_DAILY_LIMIT: '10' })).toBe(10)
  })

  it('falls back to the default for a non-numeric or non-positive value', () => {
    expect(resolveParseDailyLimit({ PARSE_DAILY_LIMIT: 'abc' })).toBe(25)
    expect(resolveParseDailyLimit({ PARSE_DAILY_LIMIT: '0' })).toBe(25)
    expect(resolveParseDailyLimit({ PARSE_DAILY_LIMIT: '-5' })).toBe(25)
  })
})
