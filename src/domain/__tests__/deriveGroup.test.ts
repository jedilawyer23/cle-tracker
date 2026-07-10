// ABOUTME: Tests that a last name maps to the correct permanent MCLE compliance group.
import { describe, it, expect } from 'vitest'
import { deriveGroup } from '../deriveGroup'

describe('deriveGroup', () => {
  it('maps A–G to group 1', () => {
    expect(deriveGroup('Adams')).toBe(1)
    expect(deriveGroup('Garcia')).toBe(1)
  })
  it('maps H–M to group 2', () => {
    expect(deriveGroup('Hoffman')).toBe(2)
    expect(deriveGroup('Martinez')).toBe(2)
  })
  it('maps N–Z to group 3', () => {
    expect(deriveGroup('Nguyen')).toBe(3)
    expect(deriveGroup('Zhang')).toBe(3)
  })
  it('is case-insensitive and ignores leading non-letters', () => {
    expect(deriveGroup('  o’brien')).toBe(3)
    expect(deriveGroup("d'Angelo")).toBe(1)
  })
  it('throws on a name with no letters', () => {
    expect(() => deriveGroup('123')).toThrow()
  })
})
