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
})
