// ABOUTME: Tests the core compliance calculation across all MCLE requirement rules.
import { describe, it, expect } from 'vitest'
import { calculateCompliance } from '../complianceCalculator'
import { REQUIREMENT_RULES } from '../requirements'
import type { Credit } from '../types'

const credit = (over: Partial<Credit>): Credit => ({
  id: 'x', provider: 'p', activityTitle: 't', completionDate: '2026-01-01',
  totalHours: 0, participatory: false, categoryHours: {}, ...over,
})

const byKey = (r: ReturnType<typeof calculateCompliance>, key: string) =>
  r.progress.find(p => p.key === key)!

describe('calculateCompliance', () => {
  it('reports everything unmet for no credits', () => {
    const r = calculateCompliance(REQUIREMENT_RULES, [])
    expect(byKey(r, 'total').earned).toBe(0)
    expect(byKey(r, 'total').remaining).toBe(25)
    expect(r.metCount).toBe(0)
    expect(r.compliant).toBe(false)
  })

  it('sums total and participatory hours', () => {
    const credits = [
      credit({ totalHours: 3, participatory: true }),
      credit({ totalHours: 2, participatory: false }),
    ]
    const r = calculateCompliance(REQUIREMENT_RULES, credits)
    expect(byKey(r, 'total').earned).toBe(5)
    expect(byKey(r, 'participatory').earned).toBe(3)
  })

  it('sums category hours and marks a category met', () => {
    const credits = [credit({ totalHours: 4, categoryHours: { ethics: 4 } })]
    const r = calculateCompliance(REQUIREMENT_RULES, credits)
    expect(byKey(r, 'ethics').earned).toBe(4)
    expect(byKey(r, 'ethics').met).toBe(true)
    expect(byKey(r, 'ethics').remaining).toBe(0)
  })

  it('tracks sub-minimums independently of their parent', () => {
    const credits = [credit({ totalHours: 2, categoryHours: { competence: 2 } })]
    const r = calculateCompliance(REQUIREMENT_RULES, credits)
    expect(byKey(r, 'competence').met).toBe(true)
    expect(byKey(r, 'competencePrevention').met).toBe(false)
    expect(byKey(r, 'competencePrevention').remaining).toBe(1)
  })

  // "Of which" model: a sub-minimum's hours are a subset of its parent's, so a course that is
  // entirely Prevention & Detection satisfies both Competence and Prevention & Detection.
  it('a fully-prevention 1-hr credit counts toward both Competence and Prevention & Detection', () => {
    const credits = [credit({ totalHours: 1, categoryHours: { competence: 1, competencePrevention: 1 } })]
    const r = calculateCompliance(REQUIREMENT_RULES, credits)
    expect(byKey(r, 'competence').earned).toBe(1)
    expect(byKey(r, 'competencePrevention').earned).toBe(1)
    expect(byKey(r, 'competencePrevention').met).toBe(true)
  })

  it('a 2-hr competence course with 1 prevention hour satisfies both requirements', () => {
    const credits = [credit({ totalHours: 2, categoryHours: { competence: 2, competencePrevention: 1 } })]
    const r = calculateCompliance(REQUIREMENT_RULES, credits)
    expect(byKey(r, 'competence').met).toBe(true)
    expect(byKey(r, 'competencePrevention').met).toBe(true)
  })

  it('is compliant only when every rule is met', () => {
    const credits = [credit({
      totalHours: 25, participatory: true,
      categoryHours: { ethics: 4, competence: 2, competencePrevention: 1, bias: 2, biasImplicit: 1, technology: 1, civility: 1 },
    })]
    const r = calculateCompliance(REQUIREMENT_RULES, credits)
    expect(r.compliant).toBe(true)
    expect(r.metCount).toBe(r.totalCount)
  })
})
