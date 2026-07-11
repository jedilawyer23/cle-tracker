// ABOUTME: Tests rounding an hours value for display so floating-point sums (e.g. 1.2 + 2.2)
// ABOUTME: never render as "3.4000000000000004".
import { describe, it, expect } from 'vitest'
import { formatHours } from '../formatHours'

describe('formatHours', () => {
  it('rounds a floating-point artifact to at most 1 decimal', () => {
    expect(formatHours(3.4000000000000004)).toBe(3.4)
  })

  it('leaves a clean integer unchanged', () => {
    expect(formatHours(4)).toBe(4)
  })

  it('leaves a clean 1-decimal value unchanged', () => {
    expect(formatHours(1.5)).toBe(1.5)
  })

  it('rounds 0 to 0', () => {
    expect(formatHours(0)).toBe(0)
  })
})
