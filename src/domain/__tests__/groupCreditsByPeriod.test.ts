// ABOUTME: Tests grouping credits by their resolved compliance period — the basis for the
// ABOUTME: Past Cycles view. Covers multi-period grouping, ordering, and empty input.
import { describe, it, expect } from 'vitest'
import { groupCreditsByPeriod } from '../groupCreditsByPeriod'
import type { Credit, Period } from '../types'

const calendar: Period[] = [
  { start: '2022-02-01', end: '2025-03-29', reportBy: '2025-03-30' },
  { start: '2025-02-01', end: '2028-03-29', reportBy: '2028-03-30' },
]

const credit = (id: string, completionDate: string): Credit => ({
  id, provider: 'p', activityTitle: `title-${id}`, completionDate,
  totalHours: 1, participatory: true, categoryHours: {},
})

describe('groupCreditsByPeriod', () => {
  it('returns an empty array for no credits', () => {
    expect(groupCreditsByPeriod([], calendar)).toEqual([])
  })

  it('groups a single credit into its resolved period', () => {
    const credits = [credit('a', '2026-06-15')]
    const groups = groupCreditsByPeriod(credits, calendar)
    expect(groups).toHaveLength(1)
    expect(groups[0].period).toEqual(calendar[1])
    expect(groups[0].credits).toEqual(credits)
  })

  it('groups multiple credits across two periods, sorted newest-period-first', () => {
    const credits = [
      credit('old1', '2023-05-01'),
      credit('new1', '2026-01-10'),
      credit('old2', '2024-11-20'),
      credit('new2', '2027-02-02'),
    ]
    const groups = groupCreditsByPeriod(credits, calendar)
    expect(groups).toHaveLength(2)
    // Newest period first (period.start descending).
    expect(groups[0].period).toEqual(calendar[1])
    expect(groups[1].period).toEqual(calendar[0])
  })

  it('sorts each group\'s credits by completionDate descending', () => {
    const credits = [
      credit('early', '2026-01-10'),
      credit('late', '2027-02-02'),
      credit('mid', '2026-06-15'),
    ]
    const groups = groupCreditsByPeriod(credits, calendar)
    expect(groups).toHaveLength(1)
    expect(groups[0].credits.map(c => c.id)).toEqual(['late', 'mid', 'early'])
  })

  it('only includes periods that have at least one credit', () => {
    // Only credits that resolve into the second calendar period.
    const credits = [credit('a', '2026-06-15'), credit('b', '2027-01-01')]
    const groups = groupCreditsByPeriod(credits, calendar)
    expect(groups).toHaveLength(1)
    expect(groups[0].period).toEqual(calendar[1])
  })

  it('groups credits by reportBy so two periods sharing dates still separate correctly', () => {
    const credits = [
      credit('a', '2024-01-01'), // resolves to first period (before its start, falls back to first)
      credit('b', '2025-06-01'), // inside second period
    ]
    const groups = groupCreditsByPeriod(credits, calendar)
    expect(groups).toHaveLength(2)
    expect(groups.map(g => g.period.reportBy)).toEqual(['2028-03-30', '2025-03-30'])
  })
})
