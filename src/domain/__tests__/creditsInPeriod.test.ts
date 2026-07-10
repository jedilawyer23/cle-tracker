// ABOUTME: Tests filtering credits down to only those completed within a compliance period.
// ABOUTME: Boundary dates (period start/end) must be inclusive; ISO date strings compare lexically.
import { describe, it, expect } from 'vitest'
import { creditsInPeriod } from '../creditsInPeriod'
import type { Credit, Period } from '../types'

const period: Period = { start: '2024-02-01', end: '2027-03-29', reportBy: '2027-03-30' }

const credit = (id: string, completionDate: string): Credit => ({
  id, provider: 'p', activityTitle: 't', completionDate,
  totalHours: 1, participatory: true, categoryHours: {},
})

describe('creditsInPeriod', () => {
  it('includes a credit completed inside the period', () => {
    const credits = [credit('a', '2026-06-15')]
    expect(creditsInPeriod(credits, period)).toEqual(credits)
  })

  it('excludes a credit completed before the period start', () => {
    const credits = [credit('a', '2024-01-31')]
    expect(creditsInPeriod(credits, period)).toEqual([])
  })

  it('excludes a credit completed after the period end', () => {
    const credits = [credit('a', '2027-03-30')]
    expect(creditsInPeriod(credits, period)).toEqual([])
  })

  it('includes a credit completed exactly on the period start (inclusive boundary)', () => {
    const credits = [credit('a', '2024-02-01')]
    expect(creditsInPeriod(credits, period)).toEqual(credits)
  })

  it('includes a credit completed exactly on the period end (inclusive boundary)', () => {
    const credits = [credit('a', '2027-03-29')]
    expect(creditsInPeriod(credits, period)).toEqual(credits)
  })

  it('returns an empty array for an empty credit list', () => {
    expect(creditsInPeriod([], period)).toEqual([])
  })
})
