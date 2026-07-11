// ABOUTME: Tests conversion and validation between the credit form fields and a Credit.
import { describe, it, expect } from 'vitest'
import { emptyCreditForm, creditToForm, formToCredit, validateCreditForm } from '../creditFormValues'
import type { Credit } from '../../domain/types'

describe('creditFormValues', () => {
  it('emptyCreditForm has blank fields and participatory true by default', () => {
    const f = emptyCreditForm()
    expect(f.provider).toBe('')
    expect(f.totalHours).toBe('')
    expect(f.participatory).toBe(true)
  })

  it('round-trips a Credit through creditToForm/formToCredit', () => {
    const c: Credit = {
      id: '1', provider: 'CEB', activityTitle: 'Ethics', completionDate: '2026-01-22',
      totalHours: 1.5, participatory: true, categoryHours: { ethics: 1.5 },
    }
    expect(formToCredit(creditToForm(c))).toEqual({
      provider: 'CEB', activityTitle: 'Ethics', completionDate: '2026-01-22',
      totalHours: 1.5, participatory: true, categoryHours: { ethics: 1.5 },
    })
  })

  it('flags missing required fields and non-positive hours', () => {
    const errors = validateCreditForm(emptyCreditForm())
    expect(errors.provider).toBeTruthy()
    expect(errors.activityTitle).toBeTruthy()
    expect(errors.completionDate).toBeTruthy()
    expect(errors.totalHours).toBeTruthy()
  })

  it('flags category hours that exceed the total', () => {
    const base = emptyCreditForm()
    const f = { ...base, provider: 'p', activityTitle: 't', completionDate: '2026-01-01',
      totalHours: '1', categoryHours: { ...base.categoryHours, ethics: '2' } }
    expect(validateCreditForm(f).categoryHours).toBeTruthy()
  })

  it('accepts a valid form with no errors', () => {
    const base = emptyCreditForm()
    const f = { ...base, provider: 'p', activityTitle: 't', completionDate: '2026-01-01',
      totalHours: '2', categoryHours: { ...base.categoryHours, ethics: '2' } }
    expect(validateCreditForm(f)).toEqual({})
  })

  // "Of which" model: a sub-minimum's hours are a subset of its parent's hours, not extra —
  // so a course that is entirely Prevention & Detection must not be rejected as exceeding the total.
  it('accepts a course that is entirely a sub-minimum (prevention hours do not add to the total)', () => {
    const base = emptyCreditForm()
    const f = { ...base, provider: 'p', activityTitle: 't', completionDate: '2026-01-01',
      totalHours: '1', categoryHours: { ...base.categoryHours, competence: '1', competencePrevention: '1' } }
    expect(validateCreditForm(f)).toEqual({})
  })

  it('accepts a competence course where the sub-minimum is fewer hours than the parent', () => {
    const base = emptyCreditForm()
    const f = { ...base, provider: 'p', activityTitle: 't', completionDate: '2026-01-01',
      totalHours: '2', categoryHours: { ...base.categoryHours, competence: '2', competencePrevention: '1' } }
    expect(validateCreditForm(f)).toEqual({})
  })

  it('rejects a sub-minimum that exceeds its parent category hours', () => {
    const base = emptyCreditForm()
    const f = { ...base, provider: 'p', activityTitle: 't', completionDate: '2026-01-01',
      totalHours: '2', categoryHours: { ...base.categoryHours, competence: '1', competencePrevention: '2' } }
    expect(validateCreditForm(f).categoryHours).toBeTruthy()
  })

  it('rejects an implicit-bias sub-minimum that exceeds its parent bias hours', () => {
    const base = emptyCreditForm()
    const f = { ...base, provider: 'p', activityTitle: 't', completionDate: '2026-01-01',
      totalHours: '2', categoryHours: { ...base.categoryHours, bias: '1', biasImplicit: '1.5' } }
    expect(validateCreditForm(f).categoryHours).toBeTruthy()
  })
})
