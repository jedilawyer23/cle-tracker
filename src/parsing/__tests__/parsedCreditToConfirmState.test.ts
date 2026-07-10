// ABOUTME: Tests mapping ParsedCredit into M2 Confirm-screen initial state.
// ABOUTME: Verifies the id-less draft copy and that only low-confidence fields are flagged.
import { describe, it, expect } from 'vitest'
import { parsedCreditToConfirmState } from '../parsedCreditToConfirmState'
import type { ParsedCredit } from '../../domain/types'

const parsed: ParsedCredit = {
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

describe('parsedCreditToConfirmState', () => {
  it('copies the credit fields (no id) into the initial draft', () => {
    const state = parsedCreditToConfirmState(parsed)
    expect(state.draft).toMatchObject({
      provider: 'Practising Law Institute',
      activityTitle: 'AI and the Practice of Law',
      completionDate: '2026-06-18',
      totalHours: 1.5,
      participatory: true,
      categoryHours: { technology: 1, general: 0.5 },
    })
    expect('id' in state.draft).toBe(false)
  })
  it('flags only the low-confidence fields', () => {
    const state = parsedCreditToConfirmState(parsed)
    expect(state.lowConfidenceFields).toEqual(['participatory'])
  })
  it('flags nothing for an all-high-confidence parse', () => {
    const allHigh = { ...parsed, confidence: { ...parsed.confidence, participatory: 'high' as const } }
    expect(parsedCreditToConfirmState(allHigh).lowConfidenceFields).toEqual([])
  })
})
