// ABOUTME: Tests assembly of the compliance report content from user + result + credits.
// ABOUTME: Pure — no pdfmake, no I/O; asserts the plain data the renderer will draw.
import { describe, it, expect } from 'vitest'
import { buildReportContent } from '../buildReportContent'
import { calculateCompliance } from '../../domain/complianceCalculator'
import { REQUIREMENT_RULES } from '../../domain/requirements'
import { DISCLAIMER_TEXT } from '../../domain/disclaimer'
import type { Credit } from '../../domain/types'

const ethics: Credit = {
  id: 'c1', provider: 'PLI', activityTitle: 'Ethics in the Age of AI', completionDate: '2026-03-04',
  totalHours: 4, participatory: true, categoryHours: { ethics: 4 },
}
const period = { start: '2024-02-01', end: '2027-03-29', reportBy: '2027-03-30' }

describe('buildReportContent', () => {
  it('lists every requirement with earned/required/met', () => {
    const result = calculateCompliance(REQUIREMENT_RULES, [ethics])
    const c = buildReportContent({ name: 'Maya Hoffman', group: 2, period, result, credits: [ethics], today: '2026-07-10' })
    const eth = c.requirements.find(r => r.label === 'Legal Ethics')!
    expect(eth).toMatchObject({ earned: 4, required: 4, met: true })
    expect(c.period.reportBy).toBe('2027-03-30')
  })

  it('groups credits under the categories they count toward', () => {
    const result = calculateCompliance(REQUIREMENT_RULES, [ethics])
    const c = buildReportContent({ name: 'Maya Hoffman', group: 2, period, result, credits: [ethics], today: '2026-07-10' })
    const ethicsGroup = c.categories.find(g => g.key === 'ethics')!
    expect(ethicsGroup.credits.map(x => x.title)).toEqual(['Ethics in the Age of AI'])
  })

  it('states a non-compliant verdict naming the count remaining', () => {
    const result = calculateCompliance(REQUIREMENT_RULES, [ethics])
    const c = buildReportContent({ name: 'Maya Hoffman', group: 2, period, result, credits: [ethics], today: '2026-07-10' })
    expect(c.verdict).toMatch(/not yet compliant/i)
    expect(c.verdict).toContain(String(result.totalCount - result.metCount))
    expect(c.disclaimer).toBe(DISCLAIMER_TEXT)
  })

  it('states a compliant verdict when everything is met', () => {
    const full: Credit = { ...ethics, totalHours: 25,
      categoryHours: { ethics: 4, competence: 2, competencePrevention: 1, bias: 2, biasImplicit: 1, technology: 1, civility: 1 } }
    const result = calculateCompliance(REQUIREMENT_RULES, [full])
    const c = buildReportContent({ name: 'Maya Hoffman', group: 2, period, result, credits: [full], today: '2026-07-10' })
    expect(c.verdict).toMatch(/^compliant/i)
  })

  it('exposes compliant/metCount/totalCount mirroring the compliance result', () => {
    const result = calculateCompliance(REQUIREMENT_RULES, [ethics])
    const c = buildReportContent({ name: 'Maya Hoffman', group: 2, period, result, credits: [ethics], today: '2026-07-10' })
    expect(c.compliant).toBe(result.compliant)
    expect(c.metCount).toBe(result.metCount)
    expect(c.totalCount).toBe(result.totalCount)
    expect(c.compliant).toBe(false)
  })

  it('marks sub-minimum requirements (Prevention & Detection, Implicit Bias) as sub', () => {
    const result = calculateCompliance(REQUIREMENT_RULES, [ethics])
    const c = buildReportContent({ name: 'Maya Hoffman', group: 2, period, result, credits: [ethics], today: '2026-07-10' })
    const prevention = c.requirements.find(r => r.label === 'Prevention & Detection')!
    const implicitBias = c.requirements.find(r => r.label === 'Implicit Bias')!
    const totalHours = c.requirements.find(r => r.label === 'Total hours')!
    const legalEthics = c.requirements.find(r => r.label === 'Legal Ethics')!
    expect(prevention.sub).toBe(true)
    expect(implicitBias.sub).toBe(true)
    expect(totalHours.sub).toBeFalsy()
    expect(legalEthics.sub).toBeFalsy()
  })

  it('flattens all credits into a date-descending sorted table with participatory flag', () => {
    const earlier: Credit = {
      id: 'c2', provider: 'CEB', activityTitle: 'Legal Ethics Annual Update', completionDate: '2026-01-15',
      totalHours: 3, participatory: false, categoryHours: { ethics: 3 },
    }
    const result = calculateCompliance(REQUIREMENT_RULES, [ethics, earlier])
    const c = buildReportContent({ name: 'Maya Hoffman', group: 2, period, result, credits: [earlier, ethics], today: '2026-07-10' })
    expect(c.credits).toEqual([
      { title: 'Ethics in the Age of AI', provider: 'PLI', date: '2026-03-04', hours: 4, participatory: true },
      { title: 'Legal Ethics Annual Update', provider: 'CEB', date: '2026-01-15', hours: 3, participatory: false },
    ])
  })
})
