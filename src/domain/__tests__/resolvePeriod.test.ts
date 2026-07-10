// ABOUTME: Tests selection of the correct compliance period for a given date.
import { describe, it, expect } from 'vitest'
import { resolvePeriod } from '../resolvePeriod'
import { GROUP_CALENDAR } from '../requirements'
import type { Period } from '../types'

const cal: Period[] = [
  { start: '2024-02-01', end: '2027-03-29', reportBy: '2027-03-30' },
  { start: '2027-02-01', end: '2030-03-29', reportBy: '2030-03-30' },
]

// Guards the real seeded calendar data, per the spec's testing strategy.
describe('real GROUP_CALENDAR', () => {
  it('resolves Group 3 in early 2026 to the 2026-03-30 deadline', () => {
    expect(resolvePeriod(GROUP_CALENDAR[3], '2026-01-15').reportBy).toBe('2026-03-30')
  })
  it('resolves Group 2 as of 2026-07-10 to the 2027-03-30 deadline', () => {
    expect(resolvePeriod(GROUP_CALENDAR[2], '2026-07-10').reportBy).toBe('2027-03-30')
  })
})

describe('resolvePeriod', () => {
  it('returns the period containing the date', () => {
    expect(resolvePeriod(cal, '2026-07-10').reportBy).toBe('2027-03-30')
  })
  it('includes the start and reportBy boundaries', () => {
    expect(resolvePeriod(cal, '2024-02-01').reportBy).toBe('2027-03-30')
    expect(resolvePeriod(cal, '2027-03-30').reportBy).toBe('2027-03-30')
  })
  it('returns the next period once past the prior reportBy', () => {
    expect(resolvePeriod(cal, '2027-03-31').reportBy).toBe('2030-03-30')
  })
  it('returns the earliest period for a date before all periods', () => {
    expect(resolvePeriod(cal, '2020-01-01').reportBy).toBe('2027-03-30')
  })
  it('throws on an empty calendar', () => {
    expect(() => resolvePeriod([], '2026-07-10')).toThrow()
  })
})
