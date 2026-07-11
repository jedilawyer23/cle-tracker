// ABOUTME: Tests the pure decision of which reminder keys are due for a user today.
// ABOUTME: No email, Firestore, or clock access — dates and state are passed in directly.
import { describe, it, expect } from 'vitest'
import { dueReminders, daysUntil, type ReminderState } from '../reminders/dueReminders'
import { DEFAULT_REMINDER_CONFIG } from '../reminders/config'

const base: ReminderState = {
  hasEmail: true,
  requiredToReport: true,
  compliant: false,
  reportBy: '2027-03-30',
  alreadySent: [],
}
const cfg = DEFAULT_REMINDER_CONFIG

describe('daysUntil', () => {
  it('counts calendar days without timezone drift', () => {
    expect(daysUntil('2027-03-01', '2027-03-30')).toBe(29)
    expect(daysUntil('2027-03-30', '2027-03-30')).toBe(0)
  })
})

describe('dueReminders', () => {
  it('sends nothing when not required to report this cycle', () => {
    expect(dueReminders({ ...base, requiredToReport: false }, '2027-01-01', cfg)).toEqual([])
  })

  it('sends nothing when the user has no email', () => {
    expect(dueReminders({ ...base, hasEmail: false }, '2027-03-01', cfg)).toEqual([])
  })

  it('sends nothing when the deadline has passed', () => {
    expect(dueReminders(base, '2027-04-01', cfg)).toEqual([])
  })

  it('sends nothing outside the widest window', () => {
    expect(dueReminders(base, '2026-01-01', cfg)).toEqual([])
  })

  it('sends the 90-day deadline reminder in the 90 bucket while compliant', () => {
    // 60 days out -> smallest threshold >= 60 is 90; compliant so no non-compliant key
    expect(dueReminders({ ...base, compliant: true }, '2027-01-29', cfg)).toEqual(['deadline-90'])
  })

  it('adds a non-compliant reminder inside the near window', () => {
    // 20 days out -> bucket 30 (near); not compliant
    expect(dueReminders(base, '2027-03-10', cfg)).toEqual(['deadline-30', 'noncompliant-30'])
  })

  it('is idempotent — filters keys already sent', () => {
    expect(
      dueReminders({ ...base, alreadySent: ['deadline-30'] }, '2027-03-10', cfg),
    ).toEqual(['noncompliant-30'])
  })

  it('does not re-fire a larger bucket after a smaller one is reached', () => {
    // 5 days out -> only bucket 7 is active; 90/30 never reappear
    expect(dueReminders(base, '2027-03-25', cfg)).toEqual(['deadline-7', 'noncompliant-7'])
  })
})
