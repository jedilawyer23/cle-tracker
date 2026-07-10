// ABOUTME: Tests grouping requirement progress into Still-needed / Complete display rows.
// ABOUTME: Includes the M1 carry-forward case: a met parent with an unmet sub-minimum stays Still needed.
import { describe, it, expect } from 'vitest'
import { buildDashboardRows } from '../dashboardRows'
import { calculateCompliance } from '../../domain/complianceCalculator'
import { REQUIREMENT_RULES } from '../../domain/requirements'
import type { Credit } from '../../domain/types'

const credit = (over: Partial<Credit>): Credit => ({
  id: 'x', provider: 'p', activityTitle: 't', completionDate: '2026-01-01',
  totalHours: 0, participatory: false, categoryHours: {}, ...over,
})

describe('buildDashboardRows', () => {
  it('puts unmet requirements in stillNeeded and hides sub-minimum rows', () => {
    const result = calculateCompliance(REQUIREMENT_RULES, [])
    const { stillNeeded, complete } = buildDashboardRows(result, [])
    expect(complete).toEqual([])
    const keys = stillNeeded.map(r => r.key)
    expect(keys).toContain('total')
    expect(keys).not.toContain('competencePrevention') // folded into Competence
  })

  it('marks a parent incomplete when its sub-minimum is unmet', () => {
    const credits = [credit({ id: 'a', totalHours: 2, categoryHours: { competence: 2 } })]
    const result = calculateCompliance(REQUIREMENT_RULES, credits)
    const comp = buildDashboardRows(result, credits).stillNeeded.find(r => r.key === 'competence')!
    expect(comp.met).toBe(false)
    expect(comp.remaining).toBe(1) // still needs the 1 hr Prevention & Detection sub-minimum
  })

  it('lists contributing credits on a completed row', () => {
    const credits = [credit({ id: 'a', totalHours: 4, participatory: true, categoryHours: { ethics: 4 } })]
    const result = calculateCompliance(REQUIREMENT_RULES, credits)
    const ethics = buildDashboardRows(result, credits).complete.find(r => r.key === 'ethics')!
    expect(ethics.credits.map(c => c.id)).toEqual(['a'])
  })

  // Carry-forward (M1 review, item 1): the headline "N requirements left" count must equal
  // the visible top-level Still-needed rows, and a met parent with an unmet sub-minimum
  // (Competence 2/2 but Prevention & Detection 0/1) must surface under Still needed, not
  // Complete. This mirrors the mockup's "4 requirements left" scenario.
  it('mirrors the mockup scenario: 4 still-needed rows, 3 complete, sub-gap surfaced', () => {
    const credits = [
      credit({ id: 'ethics', totalHours: 4, participatory: true, categoryHours: { ethics: 4 } }),
      // Competence hours met (2/2) but the Prevention & Detection sub-minimum is untouched.
      credit({ id: 'competence', totalHours: 2, participatory: true, categoryHours: { competence: 2 } }),
      credit({ id: 'bias', totalHours: 2, participatory: true, categoryHours: { bias: 2, biasImplicit: 1 } }),
      credit({ id: 'tech', totalHours: 1, participatory: true, categoryHours: { technology: 1 } }),
    ]
    const result = calculateCompliance(REQUIREMENT_RULES, credits)
    const { stillNeeded, complete } = buildDashboardRows(result, credits)

    // total=9/25, competence gated by unmet prevention, civility never touched, participatory=9/12.5
    expect(stillNeeded.map(r => r.key).sort()).toEqual(
      ['civility', 'competence', 'participatory', 'total'].sort(),
    )
    expect(complete.map(r => r.key).sort()).toEqual(['bias', 'ethics', 'technology'].sort())
    expect(stillNeeded).toHaveLength(4)

    const competenceRow = stillNeeded.find(r => r.key === 'competence')!
    expect(competenceRow.met).toBe(false)
  })
})
