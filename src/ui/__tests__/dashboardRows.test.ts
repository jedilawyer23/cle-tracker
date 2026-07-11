// ABOUTME: Tests grouping requirement progress into the dashboard's unified top-level rows.
// ABOUTME: Includes the M1 carry-forward case: a met parent with an unmet sub-minimum stays unmet.
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
  it('returns one row per top-level requirement, in REQUIREMENT_RULES order, folding sub-minimum rows', () => {
    const result = calculateCompliance(REQUIREMENT_RULES, [])
    const rows = buildDashboardRows(result, [])
    expect(rows.map(r => r.key)).toEqual([
      'total', 'ethics', 'competence', 'bias', 'technology', 'civility', 'participatory',
    ])
    expect(rows.every(r => !r.met)).toBe(true)
  })

  it('marks a parent incomplete when its sub-minimum is unmet', () => {
    const credits = [credit({ id: 'a', totalHours: 2, categoryHours: { competence: 2 } })]
    const result = calculateCompliance(REQUIREMENT_RULES, credits)
    const comp = buildDashboardRows(result, credits).find(r => r.key === 'competence')!
    expect(comp.met).toBe(false)
    expect(comp.remaining).toBe(1) // still needs the 1 hr Prevention & Detection sub-minimum
  })

  // "Of which" model: a course entirely made of Prevention & Detection hours shows in the
  // Competence row's accordion, and the folded child reports the same hours as met.
  it('shows a fully-prevention credit under the Competence row', () => {
    const credits = [credit({ id: 'a', totalHours: 1, categoryHours: { competence: 1, competencePrevention: 1 } })]
    const result = calculateCompliance(REQUIREMENT_RULES, credits)
    const comp = buildDashboardRows(result, credits).find(r => r.key === 'competence')!
    expect(comp.credits.map(c => c.id)).toEqual(['a'])
    expect(comp.earned).toBe(1)
    const prevention = comp.children.find(c => c.key === 'competencePrevention')!
    expect(prevention.earned).toBe(1)
    expect(prevention.met).toBe(true)
  })

  it('lists contributing credits on a met row', () => {
    const credits = [credit({ id: 'a', totalHours: 4, participatory: true, categoryHours: { ethics: 4 } })]
    const result = calculateCompliance(REQUIREMENT_RULES, credits)
    const ethics = buildDashboardRows(result, credits).find(r => r.key === 'ethics')!
    expect(ethics.credits.map(c => c.id)).toEqual(['a'])
    expect(ethics.met).toBe(true)
  })

  // Carry-forward (M1 review, item 1): a met parent with an unmet sub-minimum (Competence 2/2
  // but Prevention & Detection 0/1) must surface as unmet. Mirrors the mockup scenario.
  it('mirrors the mockup scenario: 4 unmet rows, 3 met, sub-gap surfaced', () => {
    const credits = [
      credit({ id: 'ethics', totalHours: 4, participatory: true, categoryHours: { ethics: 4 } }),
      // Competence hours met (2/2) but the Prevention & Detection sub-minimum is untouched.
      credit({ id: 'competence', totalHours: 2, participatory: true, categoryHours: { competence: 2 } }),
      credit({ id: 'bias', totalHours: 2, participatory: true, categoryHours: { bias: 2, biasImplicit: 1 } }),
      credit({ id: 'tech', totalHours: 1, participatory: true, categoryHours: { technology: 1 } }),
    ]
    const result = calculateCompliance(REQUIREMENT_RULES, credits)
    const rows = buildDashboardRows(result, credits)

    const unmet = rows.filter(r => !r.met).map(r => r.key).sort()
    const met = rows.filter(r => r.met).map(r => r.key).sort()
    // total=9/25, competence gated by unmet prevention, civility never touched, participatory=9/12.5
    expect(unmet).toEqual(['civility', 'competence', 'participatory', 'total'].sort())
    expect(met).toEqual(['bias', 'ethics', 'technology'].sort())
    expect(unmet).toHaveLength(4)

    const competenceRow = rows.find(r => r.key === 'competence')!
    expect(competenceRow.met).toBe(false)
  })
})
