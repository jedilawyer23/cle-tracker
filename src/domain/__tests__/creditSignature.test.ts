// ABOUTME: Verifies creditSignature normalizes provider/title casing & whitespace, and that
// ABOUTME: isDuplicateCredit only flags certificates that are the same activity in every respect.
import { describe, it, expect } from 'vitest'
import { creditSignature, isDuplicateCredit } from '../creditSignature'
import type { Credit } from '../types'

const base: Omit<Credit, 'id'> = {
  provider: 'CEB',
  activityTitle: 'Conflicts of Interest',
  completionDate: '2026-01-22',
  totalHours: 4,
  participatory: true,
  categoryHours: { ethics: 4 },
}

describe('creditSignature', () => {
  it('produces identical signatures for identical fields', () => {
    expect(creditSignature(base)).toBe(creditSignature({ ...base }))
  })

  it('is insensitive to provider/title casing', () => {
    const variant = { ...base, provider: 'ceb', activityTitle: 'CONFLICTS OF INTEREST' }
    expect(creditSignature(variant)).toBe(creditSignature(base))
  })

  it('is insensitive to extra, leading, and trailing whitespace in provider/title', () => {
    const variant = { ...base, provider: '  CEB  ', activityTitle: 'Conflicts   of\tInterest ' }
    expect(creditSignature(variant)).toBe(creditSignature(base))
  })

  it('differs when completionDate differs', () => {
    const variant = { ...base, completionDate: '2026-01-23' }
    expect(creditSignature(variant)).not.toBe(creditSignature(base))
  })

  it('differs when totalHours differs', () => {
    const variant = { ...base, totalHours: 4.5 }
    expect(creditSignature(variant)).not.toBe(creditSignature(base))
  })

  it('differs when participatory differs', () => {
    const variant = { ...base, participatory: false }
    expect(creditSignature(variant)).not.toBe(creditSignature(base))
  })

  it('differs when the categoryHours breakdown differs', () => {
    const variant = { ...base, categoryHours: { ethics: 2, technology: 2 } }
    expect(creditSignature(variant)).not.toBe(creditSignature(base))
  })

  it('is insensitive to zero-hour categoryHours entries', () => {
    const variant = { ...base, categoryHours: { ethics: 4, technology: 0 } }
    expect(creditSignature(variant)).toBe(creditSignature(base))
  })

  it('is insensitive to categoryHours key order', () => {
    const a = { ...base, categoryHours: { ethics: 2, technology: 1 } }
    const b = { ...base, categoryHours: { technology: 1, ethics: 2 } }
    expect(creditSignature(a)).toBe(creditSignature(b))
  })
})

describe('isDuplicateCredit', () => {
  it('returns false against an empty existing list', () => {
    expect(isDuplicateCredit(base, [])).toBe(false)
  })

  it('flags an identical candidate as a duplicate', () => {
    const existing: Credit[] = [{ ...base, id: 'a' }]
    expect(isDuplicateCredit(base, existing)).toBe(true)
  })

  it('flags a candidate differing only by case/whitespace as a duplicate', () => {
    const existing: Credit[] = [{ ...base, id: 'a' }]
    const candidate = { ...base, provider: ' ceb ', activityTitle: 'conflicts of interest' }
    expect(isDuplicateCredit(candidate, existing)).toBe(true)
  })

  it('does not flag a candidate with a different completionDate', () => {
    const existing: Credit[] = [{ ...base, id: 'a' }]
    const candidate = { ...base, completionDate: '2026-02-01' }
    expect(isDuplicateCredit(candidate, existing)).toBe(false)
  })

  it('does not flag a candidate with different totalHours', () => {
    const existing: Credit[] = [{ ...base, id: 'a' }]
    const candidate = { ...base, totalHours: 2 }
    expect(isDuplicateCredit(candidate, existing)).toBe(false)
  })

  it('does not flag a candidate with different participatory', () => {
    const existing: Credit[] = [{ ...base, id: 'a' }]
    const candidate = { ...base, participatory: false }
    expect(isDuplicateCredit(candidate, existing)).toBe(false)
  })

  it('does not flag a candidate with a different categoryHours breakdown', () => {
    const existing: Credit[] = [{ ...base, id: 'a' }]
    const candidate = { ...base, categoryHours: { ethics: 1, technology: 3 } }
    expect(isDuplicateCredit(candidate, existing)).toBe(false)
  })

  it('does not flag two genuinely different credits', () => {
    const existing: Credit[] = [{ ...base, id: 'a' }]
    const candidate: Omit<Credit, 'id'> = {
      provider: 'PLI', activityTitle: 'AI and the Practice of Law', completionDate: '2026-06-18',
      totalHours: 1.5, participatory: true, categoryHours: { technology: 1.5 },
    }
    expect(isDuplicateCredit(candidate, existing)).toBe(false)
  })

  it('flags a duplicate against one entry among several existing credits', () => {
    const existing: Credit[] = [
      { provider: 'PLI', activityTitle: 'AI and the Practice of Law', completionDate: '2026-06-18', totalHours: 1.5, participatory: true, categoryHours: { technology: 1.5 }, id: 'a' },
      { ...base, id: 'b' },
      { provider: 'CEB', activityTitle: 'Implicit Bias', completionDate: '2026-03-01', totalHours: 1, participatory: true, categoryHours: { bias: 1, biasImplicit: 1 }, id: 'c' },
    ]
    expect(isDuplicateCredit(base, existing)).toBe(true)
  })
})
