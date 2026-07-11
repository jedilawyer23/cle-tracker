// ABOUTME: Tests the pure mappings between credits and the requirements they count toward.
import { describe, it, expect } from 'vitest'
import { hoursToward, creditsForRequirement, requirementsForCredit } from '../creditContribution'
import { REQUIREMENT_RULES } from '../requirements'
import type { Credit } from '../types'

const credit = (over: Partial<Credit>): Credit => ({
  id: 'x', provider: 'p', activityTitle: 't', completionDate: '2026-01-01',
  totalHours: 0, participatory: false, categoryHours: {}, ...over,
})

const ethics = credit({ id: 'a', totalHours: 4, participatory: true, categoryHours: { ethics: 4 } })
const tech = credit({ id: 'b', totalHours: 1, participatory: false, categoryHours: { technology: 1 } })
const credits = [ethics, tech]

describe('hoursToward', () => {
  it('returns hours the credit contributes to a key', () => {
    expect(hoursToward('total', ethics)).toBe(4)
    expect(hoursToward('participatory', tech)).toBe(0)
    expect(hoursToward('ethics', ethics)).toBe(4)
  })
})

describe('creditsForRequirement', () => {
  it('total includes every credit with hours', () => {
    expect(creditsForRequirement('total', credits).map(c => c.id)).toEqual(['a', 'b'])
  })
  it('participatory includes only participatory credits', () => {
    expect(creditsForRequirement('participatory', credits).map(c => c.id)).toEqual(['a'])
  })
  it('a category includes only credits with hours in that category', () => {
    expect(creditsForRequirement('ethics', credits).map(c => c.id)).toEqual(['a'])
    expect(creditsForRequirement('technology', credits).map(c => c.id)).toEqual(['b'])
  })

  // "Of which" model: a credit whose Prevention & Detection hours are a subset of its
  // Competence hours shows up under Competence's accordion, and reports its sub-minimum hours too.
  it('a fully-prevention credit shows up under Competence, and reports its own prevention hours', () => {
    const prevention = credit({ id: 'c', totalHours: 1, categoryHours: { competence: 1, competencePrevention: 1 } })
    expect(creditsForRequirement('competence', [prevention]).map(c => c.id)).toEqual(['c'])
    expect(hoursToward('competence', prevention)).toBe(1)
    expect(hoursToward('competencePrevention', prevention)).toBe(1)
  })
})

describe('requirementsForCredit', () => {
  it('lists every rule a credit contributes hours to', () => {
    const keys = requirementsForCredit(REQUIREMENT_RULES, ethics).map(r => r.key)
    expect(keys).toContain('total')
    expect(keys).toContain('participatory')
    expect(keys).toContain('ethics')
    expect(keys).not.toContain('civility')
  })
})
