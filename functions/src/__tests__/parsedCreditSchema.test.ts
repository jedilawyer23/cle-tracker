// ABOUTME: Tests runtime validation of the model's JSON into a typed ParsedCredit.
import { describe, it, expect } from 'vitest'
import { validateParsedCredit } from '../parsedCreditSchema'

const valid = {
  provider: 'Practising Law Institute',
  activityTitle: 'AI and the Practice of Law',
  completionDate: '2026-06-18',
  totalHours: 1.5,
  participatory: true,
  categoryHours: { technology: 1, general: 0.5 },
  confidence: {
    provider: 'high', activityTitle: 'high', completionDate: 'high',
    totalHours: 'high', participatory: 'low', categoryHours: 'medium',
  },
}

describe('validateParsedCredit', () => {
  it('returns a typed ParsedCredit for well-formed input', () => {
    const result = validateParsedCredit(valid)
    expect(result.provider).toBe('Practising Law Institute')
    expect(result.categoryHours.technology).toBe(1)
    expect(result.confidence.participatory).toBe('low')
  })
  it('throws when a required field is missing', () => {
    const { totalHours, ...missing } = valid
    expect(() => validateParsedCredit(missing)).toThrow()
  })
  it('throws on a bad confidence value', () => {
    expect(() => validateParsedCredit({ ...valid, confidence: { ...valid.confidence, provider: 'certain' } })).toThrow()
  })
  it('throws on an unknown category key', () => {
    expect(() => validateParsedCredit({ ...valid, categoryHours: { golf: 2 } })).toThrow()
  })
  it('throws on a non-string / non-parsed input', () => {
    expect(() => validateParsedCredit(null)).toThrow()
    expect(() => validateParsedCredit('{"x":1}')).toThrow()
  })
})
