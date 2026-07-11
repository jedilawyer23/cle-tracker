// ABOUTME: Tests surname extraction from a full name: plain "First Last", "Last, First", and
// ABOUTME: generational suffixes (Jr, Sr, II, III, IV, V, Esq) that must not be mistaken for the surname.
import { describe, it, expect } from 'vitest'
import { lastToken } from '../lastToken'

describe('lastToken', () => {
  it('returns the last whitespace token for a plain "First Last" name', () => {
    expect(lastToken('Maya Hoffman')).toBe('Hoffman')
  })

  it('strips a trailing generational suffix so it is not mistaken for the surname', () => {
    expect(lastToken('John Smith Jr')).toBe('Smith')
    expect(lastToken('John Smith Jr.')).toBe('Smith')
    expect(lastToken('John Smith Sr')).toBe('Smith')
    expect(lastToken('John Smith II')).toBe('Smith')
    expect(lastToken('John Smith III')).toBe('Smith')
    expect(lastToken('John Smith IV')).toBe('Smith')
    expect(lastToken('John Smith Esq')).toBe('Smith')
    expect(lastToken('John Smith Esq.')).toBe('Smith')
  })

  it('is case-insensitive when matching a generational suffix', () => {
    expect(lastToken('John Smith jr')).toBe('Smith')
  })

  it('treats "Last, First" as the surname before the comma', () => {
    expect(lastToken('Smith, John')).toBe('Smith')
  })

  it('keeps a multi-word surname before the comma intact', () => {
    expect(lastToken('Van Der Berg, John')).toBe('Van Der Berg')
  })

  it('does not let a suffix become the surname when the name is only a suffix-like single token', () => {
    expect(lastToken('Smith')).toBe('Smith')
  })

  it('strips a trailing suffix from the "Last, First" segment too', () => {
    expect(lastToken('Smith Jr, John')).toBe('Smith')
  })

  it('falls through to plain-name logic for a leading-comma name rather than returning empty', () => {
    // Malformed input (no surname before the comma) — degrade to the token logic, not "".
    expect(lastToken(', John')).toBe('John')
  })

  it('returns an empty string for a blank name', () => {
    expect(lastToken('  ')).toBe('')
  })
})
