// ABOUTME: Tests reminder email copy generated from a key and context.
// ABOUTME: Pure — no provider or I/O; asserts subject/body wording and the shared disclaimer.
import { describe, it, expect } from 'vitest'
import { buildMessage, type MessageContext } from '../reminders/reminderMessages'
import { DISCLAIMER_TEXT } from '@domain/disclaimer'

const ctx: MessageContext = {
  name: 'Maya Hoffman',
  reportBy: '2027-03-30',
  daysLeft: 20,
  remainingCount: 3,
}

describe('buildMessage', () => {
  it('builds a deadline reminder with the days left and deadline', () => {
    const m = buildMessage('deadline-30', ctx)
    expect(m.subject).toMatch(/deadline/i)
    expect(m.text).toContain('20 days')
    expect(m.text).toContain('Mar 30, 2027')
    expect(m.text).toContain(DISCLAIMER_TEXT)
  })

  it('builds a non-compliant reminder naming the outstanding count', () => {
    const m = buildMessage('noncompliant-7', ctx)
    expect(m.subject).toMatch(/outstanding|incomplete/i)
    expect(m.text).toContain('3 requirement')
    expect(m.text).toContain(DISCLAIMER_TEXT)
  })
})
